// Oyun Kutusu - ortak veri ve yardımcı fonksiyonlar

// ==========================================================================
// GÜVENLİ localStorage KORUMASI — EN KRİTİK DÜZELTME
// Her oyun dosyası en üstte doğrudan (try/catch olmadan) localStorage.getItem/
// setItem çağırıyor (örn. "let bestScore = parseInt(localStorage.getItem(...)...)").
// Tarayıcı localStorage'ı engellediğinde (gizli/private sekme + sıkı gizlilik
// ayarı, üçüncü taraf depolama engeli, bazı önizleme/iframe ortamları, dosya
// önizleyicileri vb.) bu satır bir SecurityError fırlatır. Bu hata, o oyunun
// <script> bloğunun EN BAŞINDA olduğu için, script'in geri kalanı (startGame(),
// buton bağlamaları, oyun döngüsü) HİÇ ÇALIŞMAZ — kullanıcıya "oyun tamamen
// donmuş/çalışmıyor" gibi görünür. Bu, common.js her oyun sayfasında oyunun
// kendi script'inden ÖNCE yüklendiği için, gerçek localStorage kullanılamıyorsa
// onu sessizce bellek-içi (in-memory) bir kopyayla değiştirir; böylece her
// oyunun kendi kodu hiç değişmeden, hiçbir yerde çökme olmadan çalışmaya devam
// eder (yalnızca ilerleme/rekor sekme kapanınca sıfırlanır).
(function ensureSafeLocalStorage(){
  try{
    const testKey = '__ok_ls_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
  } catch(e){
    let mem = {};
    const shim = {
      getItem: k => Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null,
      setItem: (k, v) => { mem[k] = String(v); },
      removeItem: k => { delete mem[k]; },
      clear: () => { mem = {}; },
      key: i => Object.keys(mem)[i] || null,
      get length(){ return Object.keys(mem).length; }
    };
    try{
      Object.defineProperty(window, 'localStorage', { value: shim, configurable: true });
    } catch(e2){
      try{ window.localStorage = shim; } catch(e3){ /* tamamen salt-okunur ortam, elden bir şey gelmez */ }
    }
    console.warn('WoogiGames: localStorage kullanılamıyor, geçici bellek-içi depolamaya geçildi (ilerleme sekme kapanınca kaybolur).');
  }
})();

// ==========================================================================
// GERÇEK BACKEND LİDERLİK TABLOSU (Firestore) — güvenli, kademeli devreye giriş.
// Bu, parent-auth.js'nin zaten kullandığı Firebase kurulumunu (bkz.
// firebase-config.js) paylaşır. Firebase yapılandırılmamışsa (FIREBASE_READY
// false) ya da bu sayfa Firebase SDK'sını hiç yüklemiyorsa (çoğu oyun sayfası
// performans için yüklemez), bu fonksiyonlar sessizce devre dışı kalır —
// hiçbir sayfa bundan dolayı hata vermez.
//
// CANLIYA ALMAK İÇİN (firebase-config.js'deki 7 adıma ek olarak):
// Firestore "Rules" sekmesine şunu da ekleyin (herkes okuyabilir, sadece
// kendi girdisini oluşturabilir/güncelleyebilir — skor sahtekarlığını tamamen
// önlemez ama herkese açık, düşük riskli bir liderlik tablosu için yeterlidir):
//
//   match /leaderboard/{entryId} {
//     allow read: if true;
//     allow write: if request.resource.data.name is string
//                  && request.resource.data.name.size() <= 20
//                  && request.resource.data.streak is int
//                  && request.resource.data.totalPlays is int;
//   }
// ==========================================================================
function _leaderboardReady(){
  return typeof firebase !== 'undefined' && window.FIREBASE_READY && firebase.apps && firebase.apps.length > 0;
}
function submitToLeaderboard(name, stats, onDone){
  onDone = onDone || function(){};
  if(!_leaderboardReady()) return onDone(false, 'Liderlik tablosu için Firebase kurulmamış.');
  try{
    const db = firebase.firestore();
    const safeName = String(name||'Oyuncu').trim().slice(0,20) || 'Oyuncu';
    const id = safeName.toLowerCase().replace(/[^a-z0-9ığüşöç]/gi,'_').slice(0,40) || ('oyuncu_'+Date.now());
    db.collection('leaderboard').doc(id).set({
      name: safeName,
      streak: Math.max(0, parseInt(stats.streak||0,10)),
      totalPlays: Math.max(0, parseInt(stats.totalPlays||0,10)),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(()=> onDone(true)).catch(err=> onDone(false, err.message));
  } catch(e){ onDone(false, e.message); }
}
function fetchLeaderboard(limitN, onDone){
  if(!_leaderboardReady()) return onDone(null, 'Liderlik tablosu için Firebase kurulmamış.');
  try{
    const db = firebase.firestore();
    db.collection('leaderboard').orderBy('streak','desc').limit(limitN||10).get()
      .then(snap=>{
        const rows = [];
        snap.forEach(doc=> rows.push(doc.data()));
        onDone(rows);
      }).catch(err=> onDone(null, err.message));
  } catch(e){ onDone(null, e.message); }
}

const THEMES = {
  hayvanlar: { name: 'Hayvanlar', emojis: ['🐱','🐶','🐰','🦊','🐻','🐼','🦁','🐸','🐵','🐷'],
    words: ['kedi','köpek','tavşan','tilki','ayı','panda','aslan','kurbağa','maymun','domuz'],
    hue1:'#ffb85c', hue2:'#e8912e', bg1:'#fff3d6', bg2:'#ffe0a3', ambient:120 },
  meyveler: { name: 'Meyveler', emojis: ['🍎','🍌','🍇','🍉','🍓','🍒','🍍','🥝','🍑','🍋'],
    words: ['elma','muz','üzüm','karpuz','çilek','kiraz','ananas','kivi','şeftali','limon'],
    hue1:'#ff6b6b', hue2:'#c94b4b', bg1:'#ffe0e0', bg2:'#ffc2c2', ambient:140 },
  uzay: { name: 'Uzay', emojis: ['🚀','🌙','⭐','🪐','☄️','👽','🛸','🌎','🌟','🔭'],
    words: ['roket','ay','yıldız','gezegen','kuyruklu yıldız','uzaylı','uçan daire','dünya','takımyıldız','teleskop'],
    hue1:'#6C4EF5', hue2:'#4a34c9', bg1:'#e0d9ff', bg2:'#c2b3ff', ambient:70 },
  deniz: { name: 'Deniz', emojis: ['🐠','🐳','🐙','🦀','🐬','🐟','🦈','🐢','🐚','🌊'],
    words: ['balık','balina','ahtapot','yengeç','yunus','köpekbalığı','kaplumbağa','midye','mercan','dalga'],
    hue1:'#3dd6ff', hue2:'#1c9cae', bg1:'#d6f5ff', bg2:'#b0e8ff', ambient:160 },
  tatli: { name: 'Tatlılar', emojis: ['🍕','🍩','🍪','🍦','🍭','🍰','🧁','🍫','🍬','🍿'],
    words: ['pizza','donut','kurabiye','dondurma','lolipop','pasta','kek','çikolata','şeker','patlamış mısır'],
    hue1:'#FF6EC7', hue2:'#c94b8e', bg1:'#ffe0f0', bg2:'#ffb8de', ambient:190 }
};

const LEVEL_NAMES = { 1: 'Kolay', 2: 'Orta', 3: 'Zor', 4: 'Uzman' };

// ==========================================================================
// ADAPTİF ZORLUK — hafıza oyunları arasında paylaşılan, tek merkezden yönetilen
// zorluk ayarlama mantığı. Bir turu çok iyi oynarsan (performanceRatio yüksek)
// bir sonraki tur otomatik zorlaşır (daha fazla kart/öğe); zorlanırsan otomatik
// kolaylaşır. Seviye skalası mevcut LEVEL_NAMES (1=Kolay..4=Uzman) ile aynı,
// böylece oyunun "?level=" URL parametresiyle seçilen başlangıç zorluğu bozulmadan
// yalnızca tekrar oynarken kendini ayarlar.
// ==========================================================================
function computeAdaptiveLevel(currentLevel, performanceRatio){
  let next = currentLevel;
  if(performanceRatio >= 0.82) next = Math.min(4, currentLevel + 1);
  else if(performanceRatio <= 0.4) next = Math.max(1, currentLevel - 1);
  return next;
}
// Oyun bitiş ekranına (overlay), varsa "Tekrar Oyna" butonundan hemen önce,
// bir sonraki turun zorluğunun neden/nasıl değiştiğini açıklayan küçük bir not ekler.
function showAdaptiveNote(overlayEl, oldLevel, newLevel){
  if(!overlayEl) return;
  let note = overlayEl.querySelector('.adaptive-note');
  if(!note){
    note = document.createElement('div');
    note.className = 'adaptive-note';
    const btn = overlayEl.querySelector('.btn');
    if(btn) overlayEl.insertBefore(note, btn); else overlayEl.appendChild(note);
  }
  if(newLevel > oldLevel) note.textContent = `🔥 Harika gidiyorsun! Sonraki tur: ${LEVEL_NAMES[newLevel]}`;
  else if(newLevel < oldLevel) note.textContent = `💪 Sonraki turu biraz kolaylaştırdık: ${LEVEL_NAMES[newLevel]}`;
  else note.textContent = '';
  note.style.display = note.textContent ? 'inline-block' : 'none';
}

function getParams(){
  const p = new URLSearchParams(location.search);
  const themeKey = THEMES[p.get('theme')] ? p.get('theme') : 'hayvanlar';
  let level = parseInt(p.get('level') || '1', 10);
  if(isNaN(level) || level < 1) level = 1;
  if(level > 4) level = 4;
  return { themeKey, theme: THEMES[themeKey], level };
}

function shuffle(arr){
  const a = arr.slice();
  for(let i = a.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function setTitle(prefix){
  const { theme, level } = getParams();
  document.title = `${theme.name} ${prefix} (${LEVEL_NAMES[level]}) — Oyun Kutusu`;
}

// ---- Ses efektleri (Web Audio, dosya gerektirmez) ----
let _actx;
function _ctx(){
  if(!_actx) _actx = new (window.AudioContext || window.webkitAudioContext)();
  return _actx;
}
// ==========================================================================
// OYUNA ÖZEL SES KİMLİĞİ — "her oyunun kendi sesi olsun" isteği için.
// Önceki sürüm (v10) sadece KATEGORİYE göre bir palet uyguluyordu, yani aynı
// kategorideki oyunlar (ör. Eşleştirme/Simon/Kelime Hafızası — hepsi "hafiza")
// birbirleriyle AYNI sesi paylaşıyordu. Bu sürümde her oyunun kendi dosya adına
// göre AYRI bir "kök nota" (root, Hz), dalga tipi (type) ve tempo çarpanı var —
// toplamda 33 oyun (özel Audio_ motoru olan 4 oyun -araba-yarisi, labirent,
// ucak-oyunu, woogi-macera- hariç) artık gerçekten birbirinden farklı sesler
// çıkarıyor, sadece kategori arkadaşlarından değil.
// Müzikal tutarlılık için kök notalar mevcut kodda zaten örtük referans olan
// C5 (523.25 Hz — playSuccess/playLevelUp gibi fonksiyonların sabit frekansları
// hep bunun üstüne kuruluydu) etrafında, tanınabilir notalarla seçildi; her
// oyunun perdesi bu kök nota / C5 oranı kadar kayar (shift = root/523.25),
// böylece TÜM ses fonksiyonları (playSuccess, playError, playCombo, playLevelUp
// vb.) o oyunun kendi "ton merkezine" göre çalar, sadece tek bir efekt değil.
// yapboz.html, farklı (statik parça-canvas) mimarisi nedeniyle daha önce DPR
// düzeltmesinden hariç tutulmuştu; burada kasıtlı olarak belirgin şekilde daha
// PES ve YAVAŞ bir profil verildi (G3, üçgen dalga) — hem kendi mimari
// farklılığını sesle de yansıtsın hem de sakin/parça-birleştirme hissine uysun.
// Hata/başarı gibi ANLAM taşıyan tonların ayırt ediciliğini bozmamak için
// profil SADECE çağıranın 'sine' (varsayılan/nötr) tip kullandığı durumlarda
// dalga tipini değiştirir; perde/süre çarpanı ise her zaman uygulanır.
// Kategoriye göre eski SOUND_PALETTES, aşağıda henüz bireysel bir profili
// olmayan (gelecekte eklenebilecek yeni) oyunlar için YEDEK olarak duruyor.
// ==========================================================================
const GAME_SOUND_PROFILES = {
  // Hafıza — yumuşak, net (glockenspiel hissi)
  'eslestirme.html': { root:523.25, type:'sine',     tempo:1.0  }, // C5
  'simon.html':      { root:440.00, type:'triangle', tempo:0.92 }, // A4
  'kelime.html':     { root:659.25, type:'sine',     tempo:1.05 }, // E5
  'gorsel.html':     { root:392.00, type:'triangle', tempo:0.95 }, // G4
  'yol.html':        { root:587.33, type:'sine',     tempo:1.1  }, // D5
  // Bulmaca — düşünceli, biraz daha dokulu
  'kaydirma.html':   { root:349.23, type:'square',   tempo:1.0  }, // F4
  'parca.html':      { root:466.16, type:'triangle', tempo:0.95 }, // A#4
  'desen.html':      { root:554.37, type:'sine',     tempo:1.05 }, // C#5
  'yapboz.html':     { root:196.00, type:'triangle', tempo:1.3  }, // G3 — bilinçli olarak en pes/en yavaş, kendi mimarisi gibi kendi sesi de farklı
  'kelimeavi.html':  { root:493.88, type:'triangle', tempo:1.0  }, // B4
  // Zeka / Yaratıcılık
  'matematik.html':  { root:739.99, type:'square',   tempo:0.85 }, // F#5 — quiz enerjisi
  'boyama.html':     { root:293.66, type:'sine',     tempo:1.25 }, // D4 — sakin, renkli
  // Yarış — enerjik, keskin
  'motor-yarisi.html':    { root:659.25, type:'sawtooth', tempo:0.85 }, // E5
  'bisiklet-yarisi.html': { root:783.99, type:'triangle', tempo:0.9  }, // G5
  'tekne-yarisi.html':    { root:440.00, type:'sine',     tempo:1.0  }, // A4 — su, daha yumuşak
  'kaykay-yarisi.html':   { root:987.77, type:'square',   tempo:0.8  }, // B5
  'at-yarisi.html':       { root:698.46, type:'triangle', tempo:0.88 }, // F5
  // Spor — parlak, vurgulu
  'penalti.html':        { root:587.33, type:'square', tempo:0.9  }, // D5
  'basketbol.html':      { root:880.00, type:'triangle', tempo:0.85 }, // A5
  'futbol.html':         { root:392.00, type:'square', tempo:0.95 }, // G4
  'futbol-simsek.html':  { root:1046.50, type:'sawtooth', tempo:0.8 }, // C6 — "şimşek" için ekstra keskin
  'serbest-vurus.html':  { root:659.25, type:'square', tempo:0.9  }, // E5
  // Mutfak — sıcak, rahat
  'sandvic.html': { root:261.63, type:'sine', tempo:1.15 }, // C4
  'pizza.html':   { root:349.23, type:'sine', tempo:1.2  }, // F4
  // Aksiyon — keskin, çok hızlı
  'balon.html': { root:932.33,  type:'sawtooth', tempo:0.75 }, // A#5
  'hedef.html': { root:1174.66, type:'square',   tempo:0.7  }, // D6
  // Hareket — oyuncu, zıplak
  'yakalama.html': { root:783.99, type:'sine',     tempo:1.0  }, // G5
  'zipla.html':    { root:659.25, type:'triangle', tempo:0.85 }, // E5
  'ucurtma.html':  { root:880.00, type:'sine',     tempo:1.1  }, // A5 — havadar
  'paten.html':    { root:493.88, type:'sawtooth', tempo:0.9  }, // B4
  'merdiven.html': { root:523.25, type:'square',   tempo:0.95 }, // C5
  'ipatlama.html': { root:622.25, type:'triangle', tempo:0.85 }, // D#5
  'denge.html':    { root:369.99, type:'sine',     tempo:1.15 }  // F#4 — sakin, dengeli
};
const SOUND_PALETTES = {
  yaris:    { type:'sawtooth', shift:1.12, durMul:0.9  },
  hareket:  { type:'triangle', shift:1.05, durMul:0.95 },
  spor:     { type:'square',   shift:0.95, durMul:1.0  },
  aksiyon:  { type:'square',   shift:1.22, durMul:0.85 },
  hafiza:   { type:'sine',     shift:1.0,  durMul:1.1  },
  bulmaca:  { type:'triangle', shift:1.08, durMul:1.05 },
  kelime:   { type:'triangle', shift:0.92, durMul:1.1  },
  zeka:     { type:'sine',     shift:1.15, durMul:0.95 },
  mutfak:   { type:'sine',     shift:0.82, durMul:1.15 },
  macera:   { type:'triangle', shift:1.0,  durMul:1.0  },
  yaratici: { type:'sine',     shift:0.78, durMul:1.2  }
};
function _currentSoundPalette(){
  try{
    const current = location.pathname.split('/').pop();
    const profile = GAME_SOUND_PROFILES[current];
    if(profile) return { type:profile.type, shift:profile.root/523.25, durMul:profile.tempo };
    const me = GAME_CATALOG[current];
    if(!me || !me.cat || !me.cat.length) return null;
    return SOUND_PALETTES[me.cat[0]] || null;
  } catch(e){ return null; }
}
function playTone(freq, duration = 0.15, type = 'sine', vol = 0.18){
  try{
    const pal = _currentSoundPalette();
    if(pal){
      freq = freq * pal.shift;
      duration = duration * (pal.durMul || 1);
      if(type === 'sine') type = pal.type;
    }
    const ctx = _ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + duration);
  } catch(e){ /* audio not available, ignore */ }
}
function playSuccess(){ playTone(523,0.12); setTimeout(()=>playTone(659,0.12),110); setTimeout(()=>playTone(784,0.18),220); }
function playError(){ playTone(180,0.25,'sawtooth',0.15); }
function playClick(freq=440){ playTone(freq,0.09,'triangle',0.14); }
function playCombo(level){ playTone(500+Math.min(level,6)*90, 0.1, 'triangle', 0.13); }
function playLevelUp(){ [523,659,784,1046].forEach((f,i)=> setTimeout(()=>playTone(f,0.18,'triangle',0.15), i*90)); }
function playWordFound(){ playTone(700,0.09,'triangle',0.14); setTimeout(()=>playTone(1050,0.13,'triangle',0.13),60); }
function playCelebration(){ [523,659,784,1046,1318].forEach((f,i)=> setTimeout(()=>playTone(f,0.2,'triangle',0.15), i*90)); }

// ==========================================================================
// XP / SEVİYE SİSTEMİ — site geneli, tek localStorage anahtarı (ok_xp_total)
// üzerinden çalışır, hem oyun sayfalarında (bu dosya) hem ana sayfada
// (assets/index.js'te aynı şemayla eşleşen bir kopyası var) okunup yazılabilir.
// Tıbbi/IQ dili YOK — sadece "ne kadar pratik yaptın" temelli, eğlenceli
// Woogi temalı seviye adları.
// ==========================================================================
const XP_LEVELS = [
  { lvl:1, xp:0,    name:'Woogi Yavrusu',   icon:'🐣' },
  { lvl:2, xp:60,   name:'Woogi Çırağı',    icon:'🌱' },
  { lvl:3, xp:150,  name:'Woogi Kaşifi',    icon:'🧭' },
  { lvl:4, xp:300,  name:'Woogi Gezgini',   icon:'🚀' },
  { lvl:5, xp:550,  name:'Woogi Ustası',    icon:'⭐' },
  { lvl:6, xp:900,  name:'Woogi Şampiyonu', icon:'🏆' },
  { lvl:7, xp:1400, name:'Woogi Kahramanı', icon:'🦸' },
  { lvl:8, xp:2100, name:'Woogi Efsanesi',  icon:'👑' }
];
function getXPTotal(){ try{ return Math.max(0, parseInt(localStorage.getItem('ok_xp_total')||'0',10)); }catch(e){ return 0; } }
function getLevelInfo(xp){
  if(typeof xp !== 'number') xp = getXPTotal();
  let cur = XP_LEVELS[0], next = XP_LEVELS[1] || null;
  for(let i=0;i<XP_LEVELS.length;i++){
    if(xp >= XP_LEVELS[i].xp){ cur = XP_LEVELS[i]; next = XP_LEVELS[i+1] || null; }
  }
  const span = next ? (next.xp - cur.xp) : 1;
  const into = next ? Math.max(0, xp - cur.xp) : span;
  const pct = next ? Math.min(100, Math.round((into/span)*100)) : 100;
  return { xp, lvl:cur.lvl, name:cur.name, icon:cur.icon, next, xpIntoLevel:into, xpForNextLevel: next ? span : 0, pct, isMax: !next };
}
// Sayfada bir seviye rozeti/çubuğu varsa (id="xpLevelBadge" / "xpBarFill" vb.) günceller; yoksa sessizce atlar.
function _refreshXPWidgets(info){
  try{
    const badgeIcon = document.getElementById('xpLevelIcon');
    const badgeLvl = document.getElementById('xpLevelNum');
    if(badgeIcon) badgeIcon.textContent = info.icon;
    if(badgeLvl) badgeLvl.textContent = info.lvl;
    const barFill = document.getElementById('xpBarFill');
    if(barFill) barFill.style.width = info.pct + '%';
    const barLabel = document.getElementById('xpBarLabel');
    if(barLabel) barLabel.textContent = info.isMax ? `${info.icon} ${info.name} (en yüksek seviye!)` : `${info.icon} ${info.name} · ${info.xpIntoLevel}/${info.xpForNextLevel} XP`;
    const totalEl = document.getElementById('xpTotalVal');
    if(totalEl) totalEl.textContent = info.xp;
  } catch(e){}
}
// Seviye atladığında ekranın ortasında kısa bir kutlama rozeti gösterir.
function _showLevelUpToast(info){
  try{
    if(!document.body) return;
    const t = document.createElement('div');
    t.className = 'xp-levelup-toast';
    t.innerHTML = `<div class="lu-icon">${info.icon}</div><div class="lu-text"><b>Seviye ${info.lvl}!</b><br>${info.name}</div>`;
    t.style.cssText = 'position:fixed; top:18px; left:50%; transform:translateX(-50%) translateY(-20px); z-index:9999; display:flex; align-items:center; gap:10px; background:linear-gradient(135deg,var(--purple,#6C4EF5),var(--coral,#FF6B6B)); color:#fff; padding:12px 20px; border-radius:16px; box-shadow:0 10px 30px rgba(0,0,0,.25); font-family:"Fredoka","Baloo 2",sans-serif; font-weight:800; opacity:0; transition:opacity .35s, transform .35s;';
    document.body.appendChild(t);
    requestAnimationFrame(()=>{ t.style.opacity = '1'; t.style.transform = 'translateX(-50%) translateY(0)'; });
    setTimeout(()=>{ t.style.opacity = '0'; t.style.transform = 'translateX(-50%) translateY(-20px)'; setTimeout(()=>t.remove(), 400); }, 2800);
    playLevelUp();
  } catch(e){}
}
// XP kazanma — reason yalnız hata ayıklama/loglama amaçlı, davranışı etkilemez.
function earnXP(amount, reason){
  try{
    if(!amount || amount <= 0) return getLevelInfo();
    const before = getXPTotal();
    const beforeInfo = getLevelInfo(before);
    const after = before + Math.round(amount);
    localStorage.setItem('ok_xp_total', after);
    const afterInfo = getLevelInfo(after);
    _refreshXPWidgets(afterInfo);
    if(afterInfo.lvl > beforeInfo.lvl) _showLevelUpToast(afterInfo);
    return afterInfo;
  } catch(e){ return getLevelInfo(); }
}

// ---- Ortak sonuç ekranı (Game Over / Victory) ----
// rows: [[label, value], ...]  -> #result-grid tarzı bir konteynere basılır
function renderResultGrid(elId, rows){
  const el = typeof elId === 'string' ? document.getElementById(elId) : elId;
  if(!el) return;
  el.innerHTML = rows.map(([k,v],i)=>
    `<div style="animation-delay:${i*0.08}s"><div class="rk">${k}</div><div class="rv">${v}</div></div>`
  ).join('');
}

// ==========================================================================
// "Benzer Oyunlar" — oyun bittiğinde kullanıcıyı başka oyunlara yönlendirme.
// Tek bir katalogdan besleniyor, showOverlay() her oyunun bitiş ekranını
// (#overlay) gösterdiğinde otomatik ekleniyor — hiçbir oyun dosyasının kendi
// kodunu değiştirmeye gerek kalmadan tüm sitede çalışır.
// ==========================================================================
const GAME_CATALOG = {
  'woogi-macera.html':{name:"Woogi'nin Macerası", icon:'🐼', cat:['macera','hareket']},
  'labirent.html':{name:'Labirent Macerası', icon:'🌀', cat:['hafiza','macera']},
  'yakalama.html':{name:'Balık Yakalama', icon:'🎣', cat:['hareket']},
  'araba-yarisi.html':{name:'Araba Yarışı', icon:'🏎️', cat:['yaris','hareket']},
  'ucak-oyunu.html':{name:'Uçak Motor Yarışı', icon:'✈️', cat:['yaris','hareket']},
  'motor-yarisi.html':{name:'Motor Yarışı', icon:'🏍️', cat:['yaris','hareket']},
  'zipla.html':{name:'Zıpla Zıpla', icon:'🦘', cat:['hareket']},
  'penalti.html':{name:'Penaltı Vuruşu', icon:'⚽', cat:['spor']},
  'basketbol.html':{name:'Basketbol Atışı', icon:'🏀', cat:['spor']},
  'sandvic.html':{name:'Sandviç Ustası', icon:'🥪', cat:['mutfak']},
  'pizza.html':{name:'Pizza Fırını', icon:'🍕', cat:['mutfak']},
  'futbol.html':{name:'Futbol Maçı', icon:'⚽', cat:['spor']},
  'balon.html':{name:'Balon Patlatma', icon:'🎈', cat:['aksiyon']},
  'hedef.html':{name:'Hedef Vurma', icon:'🎯', cat:['aksiyon']},
  'futbol-simsek.html':{name:'Şimşek FC', icon:'⚡', cat:['spor']},
  'serbest-vurus.html':{name:'Serbest Vuruş', icon:'🥅', cat:['spor']},
  'bisiklet-yarisi.html':{name:'Bisiklet Yarışı', icon:'🚴', cat:['yaris','hareket']},
  'tekne-yarisi.html':{name:'Tekne Yarışı', icon:'🚤', cat:['yaris','hareket']},
  'kaykay-yarisi.html':{name:'Kaykay Yarışı', icon:'🛹', cat:['yaris','hareket']},
  'at-yarisi.html':{name:'At Yarışı', icon:'🐎', cat:['yaris','hareket']},
  'ucurtma.html':{name:'Uçurtma Uçurma', icon:'🪁', cat:['hareket']},
  'paten.html':{name:'Paten Kaçışı', icon:'⛸️', cat:['hareket']},
  'merdiven.html':{name:'Merdiven Tırmanışı', icon:'🪜', cat:['hareket']},
  'ipatlama.html':{name:'İp Atlama', icon:'🪢', cat:['hareket']},
  'denge.html':{name:'Denge Ustası', icon:'⚖️', cat:['hareket']},
  'eslestirme.html':{name:'Eşleştirme', icon:'🧠', cat:['hafiza']},
  'simon.html':{name:'Sıra Takibi', icon:'🔁', cat:['hafiza']},
  'kelime.html':{name:'Kelime Hafızası', icon:'📝', cat:['hafiza','kelime']},
  'gorsel.html':{name:'Görsel Hafıza', icon:'👁️', cat:['hafiza']},
  'yol.html':{name:'Yol Hafızası', icon:'🐾', cat:['hafiza']},
  'kaydirma.html':{name:'Kaydırmalı Bulmaca', icon:'🧩', cat:['bulmaca']},
  'parca.html':{name:'Parça Değiştirme', icon:'🔀', cat:['bulmaca']},
  'desen.html':{name:'Desen Tamamlama', icon:'🔮', cat:['bulmaca']},
  'yapboz.html':{name:'Yapboz', icon:'🖼️', cat:['bulmaca']},
  'kelimeavi.html':{name:'Kelime Avı', icon:'🔤', cat:['bulmaca','kelime']},
  'boyama.html':{name:'Boyama Kitabı', icon:'🎨', cat:['yaratici']},
  'matematik.html':{name:'Matematik Yarışı', icon:'🔢', cat:['zeka']}
};

function renderSimilarGames(container){
  try{
    const current = location.pathname.split('/').pop();
    const me = GAME_CATALOG[current];
    if(!container || !me) return;
    const others = Object.keys(GAME_CATALOG).filter(f=> f !== current);
    const sameCat = others.filter(f=> GAME_CATALOG[f].cat.some(c=> me.cat.includes(c)));
    const pool = sameCat.length >= 3 ? sameCat : others;
    // basit deterministik olmayan karışım (Math.random tarayıcıda güvenli)
    const picks = shuffle(pool).slice(0, 3);
    if(!picks.length) return;
    container.innerHTML = '<div class="similar-title">🎮 Benzer Oyunlar</div><div class="similar-rail">' +
      picks.map(f=>{
        const g = GAME_CATALOG[f];
        return `<a class="similar-card" href="${f}"><span class="similar-icon">${g.icon}</span><span class="similar-name">${g.name}</span></a>`;
      }).join('') + '</div>';
  } catch(e){ /* benzer oyun önerisi olmasa da oyun bitiş ekranı çalışmaya devam etsin */ }
}

// ---- Overlay'i animasyonlu göster/gizle (geriye dönük uyumlu: style.display de çalışır) ----
// v19: ikinci parametre opsiyonel — {celebrate:true} verilirse (ör. 3 yıldız/
// mükemmel skor gibi büyük bir başarıda) çevreleyen .panel üzerinde kısa bir
// altın parıltı taraması oynar. Parametre verilmezse davranış birebir eskisiyle aynı.
function showOverlay(elOrId, opts){
  opts = opts || {};
  const el = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
  if(!el) return;
  el.style.display = '';
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  if(opts.celebrate){
    const panel = el.closest ? el.closest('.panel') : null;
    if(panel){
      panel.classList.remove('shine-sweep'); void panel.offsetWidth; panel.classList.add('shine-sweep');
      setTimeout(()=> panel.classList.remove('shine-sweep'), 1400);
    }
  }
  if(el.id === 'overlay' && !el.querySelector('.similar-games')){
    const holder = document.createElement('div');
    holder.className = 'similar-games';
    renderSimilarGames(holder);
    if(holder.innerHTML) el.appendChild(holder);
  }
}
function hideOverlay(elOrId){
  const el = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
  if(!el) return;
  el.classList.remove('show'); el.style.display = 'none';
}

// ---- Doğru/Yanlış görsel geri bildirimi (herhangi bir elemente uygulanabilir) ----
// v19: doğru cevap artık küçük bir pırıltı patlamasıyla ve (destekleyen
// cihazlarda) hafif bir titreşimle de kutlanıyor — triggerCorrectFx() zaten
// HER oyunda çağrıldığı için bu iyileştirme hiçbir oyun dosyası değişmeden
// otomatik olarak tüm sitede etkili olur.
function maybeVibrate(pattern){ try{ if(navigator.vibrate) navigator.vibrate(pattern); }catch(e){} }
const _SPARKLE_EMOJIS = ['✨','⭐','💫','🌟'];
function spawnSparkleBurst(el, n){
  try{
    if(!el || !el.getBoundingClientRect) return;
    n = n || 4;
    const rect = el.getBoundingClientRect();
    const parent = el.offsetParent || document.body;
    const parentRect = parent.getBoundingClientRect();
    const cx = rect.left - parentRect.left + rect.width/2;
    const cy = rect.top - parentRect.top + rect.height/2;
    for(let i=0;i<n;i++){
      const s = document.createElement('span');
      s.className = 'sparkle-particle';
      s.textContent = _SPARKLE_EMOJIS[Math.floor(Math.random()*_SPARKLE_EMOJIS.length)];
      const angle = Math.random()*Math.PI*2;
      const dist = 22 + Math.random()*28;
      s.style.setProperty('--px', cx+'px');
      s.style.setProperty('--py', cy+'px');
      s.style.setProperty('--sx', (Math.cos(angle)*dist)+'px');
      s.style.setProperty('--sy', (Math.sin(angle)*dist - 12)+'px');
      s.style.setProperty('--sr', (Math.random()*80-40)+'deg');
      s.style.animationDelay = (Math.random()*0.08)+'s';
      parent.appendChild(s);
      setTimeout(()=> s.remove(), 900);
    }
  } catch(e){}
}
function triggerCorrectFx(el){
  if(!el) return;
  el.classList.remove('glow'); void el.offsetWidth; el.classList.add('glow');
  spawnSparkleBurst(el, 4);
  maybeVibrate(12);
}
function triggerWrongFx(el){ if(!el) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); setTimeout(()=>el.classList.remove('shake'), 380); }

// ---- Global "ripple" dokunma dalgası — her .btn/.choice/.levelpick a/.cell/
// .similar-card tıklamasında otomatik tetiklenir. Tek bir delegated dinleyici
// olduğu için hiçbir oyun dosyası değiştirilmeden TÜM sitede aktif olur. ----
(function initGlobalRipple(){
  function spawnRipple(target, clientX, clientY){
    try{
      const rect = target.getBoundingClientRect();
      if(getComputedStyle(target).position === 'static') target.style.position = 'relative';
      let layer = target.querySelector(':scope > .ripple-layer');
      if(!layer){
        layer = document.createElement('span');
        layer.className = 'ripple-layer';
        target.insertBefore(layer, target.firstChild);
      }
      const size = Math.max(rect.width, rect.height) * 1.6;
      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = ((clientX - rect.left) - size/2) + 'px';
      ripple.style.top = ((clientY - rect.top) - size/2) + 'px';
      layer.appendChild(ripple);
      setTimeout(()=> ripple.remove(), 650);
    } catch(e){}
  }
  document.addEventListener('pointerdown', function(e){
    const target = e.target.closest && e.target.closest('.btn, .choice, .levelpick a, .cell, .similar-card');
    if(!target || target.disabled) return;
    spawnRipple(target, e.clientX, e.clientY);
  }, { passive:true });
})();

// ---- Yüzen puan metni (ör. "+100 YAKIN GEÇİŞ") ----
function showFloatingPoints(container, x, y, text, color){
  const el = document.createElement('div');
  el.className = 'float-points';
  el.textContent = text;
  el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.color = color || 'var(--purple)';
  container.appendChild(el);
  setTimeout(()=> el.remove(), 950);
}

// ---- Combo rozeti oluştur/güncelle ----
function renderComboBadge(elId, level){
  const el = typeof elId === 'string' ? document.getElementById(elId) : elId;
  if(!el) return;
  if(level <= 1){ el.style.display = 'none'; return; }
  el.style.display = 'inline-flex';
  el.classList.remove('combo-badge'); void el.offsetWidth; el.classList.add('combo-badge');
  el.textContent = `🔥 COMBO x${level}`;
}

// ---- İlerleme çubuğu: milestone'larda (25/50/75/100%) küçük kutlama tetikler ----
const _progressMilestones = new WeakMap();
function updateProgressBar(fillEl, pct){
  if(!fillEl) return;
  pct = Math.max(0, Math.min(100, pct));
  const prevTier = _progressMilestones.get(fillEl) || 0;
  const tier = pct>=100 ? 4 : pct>=75 ? 3 : pct>=50 ? 2 : pct>=25 ? 1 : 0;
  fillEl.style.width = pct + '%';
  if(tier > prevTier){
    _progressMilestones.set(fillEl, tier);
    fillEl.classList.remove('milestone'); void fillEl.offsetWidth; fillEl.classList.add('milestone');
    if(tier >= 4){ fillEl.classList.add('complete'); playLevelUp(); }
    else { playTone(500+tier*120, 0.12, 'triangle', 0.12); }
  }
}

// ================= GAME FEEL: paylaşılan yardımcılar (canvas oyunları için) =================

// ---- Parçacık sistemi: spawnParticles ile üret, updateParticles ile her karede çiz/temizle ----
function spawnParticles(arr, x, y, n, colors, opts){
  opts = opts || {};
  const speed = opts.speed || 3.5, life = opts.life || 24, size = opts.size || 3;
  colors = Array.isArray(colors) ? colors : [colors || '#FFD23F'];
  for(let i=0;i<n;i++){
    const a = Math.random()*Math.PI*2, sp = (speed*0.4)+Math.random()*speed;
    arr.push({
      x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp - (opts.upBias||0),
      life, maxLife:life, size:size*0.6+Math.random()*size,
      color: colors[Math.floor(Math.random()*colors.length)],
      gravity: opts.gravity || 0
    });
  }
  if(arr.length > (opts.cap || 140)) arr.splice(0, arr.length - (opts.cap || 140));
}
function updateParticles(ctx, arr){
  for(let i=arr.length-1;i>=0;i--){
    const p = arr[i];
    p.x += p.vx; p.y += p.vy; p.vy += p.gravity||0; p.life--;
    const a = Math.max(0, p.life/p.maxLife);
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.5,p.size*a), 0, Math.PI*2); ctx.fill(); ctx.restore();
    if(p.life<=0) arr.splice(i,1);
  }
}

// ---- Ekran sarsıntısı: basit decay tabanlı ----
function createShaker(){
  return {
    mag: 0,
    trigger(m){ this.mag = Math.max(this.mag, m); },
    tick(){ this.mag *= 0.85; if(this.mag<0.05) this.mag=0; return { x:(Math.random()-0.5)*this.mag, y:(Math.random()-0.5)*this.mag }; }
  };
}

// ---- Combo/seri takipçisi: register() her başarılı olayda çağrılır, pencere dolunca sıfırlanır ----
function createCombo(windowFrames, maxLevel){
  windowFrames = windowFrames || 90; maxLevel = maxLevel || 4;
  return {
    count:0, level:1, timer:0,
    register(){ this.count++; this.timer = windowFrames; this.level = Math.min(maxLevel, 1+Math.floor(this.count/3)); return this.level; },
    tick(){ if(this.timer>0){ this.timer--; } else if(this.count>0){ this.count=0; this.level=1; } },
    reset(){ this.count=0; this.level=1; this.timer=0; }
  };
}

// ---- Canvas üstünde 3-2-1-GO! geri sayımı (DOM overlay elementi ister) ----
// overlayEl: içi boş bir <div> (position:absolute; inset:0; ile canvas'ın üstünde durmalı)
function runCountdown(overlayEl, onDone, opts){
  opts = opts || {};
  const seq = opts.seq || ['3','2','1','GO!'];
  overlayEl.style.cssText += 'display:flex; align-items:center; justify-content:center; position:absolute; inset:0; pointer-events:none; z-index:9;';
  let i = 0;
  function step(){
    if(i < seq.length){
      const label = seq[i];
      overlayEl.textContent = label;
      overlayEl.style.fontFamily = "'Fredoka','Baloo 2',sans-serif";
      overlayEl.style.fontWeight = '900';
      overlayEl.style.fontSize = label==='GO!' ? '3rem' : '4.5rem';
      overlayEl.style.color = label==='GO!' ? '#FFD23F' : '#fff';
      overlayEl.style.textShadow = label==='GO!' ? '0 0 30px #FFD23F, 0 0 70px rgba(255,210,63,.7)' : '0 0 20px rgba(108,78,245,.8)';
      overlayEl.style.animation = 'none'; void overlayEl.offsetWidth; overlayEl.style.animation = 'pop-in .45s cubic-bezier(.34,1.56,.64,1)';
      if(label==='GO!') playTone(880,0.3,'sawtooth',0.16); else playTone(440,0.12,'square',0.14);
      i++;
      setTimeout(step, label==='GO!' ? 350 : 550);
    } else {
      overlayEl.style.display = 'none';
      onDone && onDone();
    }
  }
  step();
}

// ---- Tema-tintli ambiyans (paylaşılan AudioContext, labirent.html'den genellendi) ----
let _ambientOsc, _ambientOsc2, _ambientGain, _ambientFilter, _ambientMutedFn = ()=>false;
function startThemeAmbient(freq, isMutedFn){
  if(isMutedFn) _ambientMutedFn = isMutedFn;
  if(_ambientMutedFn() || _ambientOsc) return;
  try{
    const c = _ctx();
    _ambientOsc = c.createOscillator(); _ambientOsc.type = 'sine';
    _ambientOsc2 = c.createOscillator(); _ambientOsc2.type = 'sine';
    _ambientFilter = c.createBiquadFilter(); _ambientFilter.type='lowpass'; _ambientFilter.frequency.value = 500;
    _ambientGain = c.createGain(); _ambientGain.gain.value = 0.0001;
    _ambientOsc.frequency.value = freq;
    _ambientOsc2.frequency.value = freq * 1.503;
    _ambientOsc.connect(_ambientFilter); _ambientOsc2.connect(_ambientFilter);
    _ambientFilter.connect(_ambientGain); _ambientGain.connect(c.destination);
    _ambientOsc.start(); _ambientOsc2.start();
    _ambientGain.gain.linearRampToValueAtTime(0.018, c.currentTime+1.2);
  }catch(e){}
}
function stopThemeAmbient(){
  if(!_ambientOsc) return;
  try{
    const c = _ctx();
    _ambientGain.gain.setTargetAtTime(0.0001, c.currentTime, 0.3);
    const o1=_ambientOsc, o2=_ambientOsc2;
    setTimeout(()=>{ try{o1.stop(); o2.stop();}catch(e){} }, 800);
  }catch(e){}
  _ambientOsc = _ambientOsc2 = _ambientGain = _ambientFilter = null;
}

// ---- Tam ekran yardımcıları (paylaşılan, herhangi bir oyun sayfasında kullanılabilir) ----
function toggleFullscreen(el){
  el = el || document.documentElement;
  if(!document.fullscreenElement){
    (el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen)?.call(el);
  } else {
    (document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen)?.call(document);
  }
}
function initFullscreenButton(btnId, targetEl){
  const btn = document.getElementById(btnId);
  if(!btn) return;
  btn.type = btn.tagName === 'BUTTON' ? 'button' : btn.type;
  btn.setAttribute('aria-label', 'Tam ekran');
  btn.title = 'Tam ekran';
  btn.addEventListener('click', ()=> toggleFullscreen(targetEl));
  document.addEventListener('fullscreenchange', ()=>{
    const isFs = !!document.fullscreenElement;
    btn.textContent = isFs ? '⤢' : '⛶';
    btn.title = isFs ? 'Tam ekrandan çık' : 'Tam ekran';
    btn.setAttribute('aria-label', isFs ? 'Tam ekrandan çık' : 'Tam ekran');
  });
}

// ---- Kaydedilmiş tema tercihini uygula (ana sayfayla senkron) ----
// Not: FOUC'u önlemek için asıl uygulama her sayfanın <head>'inde, common.css
// yüklenmeden önce çalışan küçük bir satır içi script ile yapılır; bu fonksiyon
// sadece geriye dönük/programatik erişim için sağlanır.
function isDarkThemeActive(){ return document.documentElement.classList.contains('dark'); }

// ---- Mobilde yatay mod önerisi (canvas oyunları için) ----
function initLandscapeHint(){
  if(!/Mobi|Android/i.test(navigator.userAgent)) return;
  const hint = document.createElement('div');
  hint.id = 'landscapeHint';
  hint.innerHTML = '📱➡️🖥️<br>Daha iyi bir deneyim için telefonunu yatay çevirebilirsin!';
  hint.style.cssText = 'position:fixed; bottom:14px; left:50%; transform:translateX(-50%); z-index:40; background:rgba(20,14,50,.9); color:#fff; padding:10px 18px; border-radius:14px; font-size:.78rem; font-weight:700; text-align:center; box-shadow:0 6px 20px rgba(0,0,0,.3); max-width:280px; transition:opacity .4s; cursor:pointer;';
  function checkOrientation(){
    if(window.innerHeight > window.innerWidth && !localStorage.getItem('ok_landscape_hint_dismissed')){
      if(!document.getElementById('landscapeHint')) document.body.appendChild(hint);
    } else if(document.getElementById('landscapeHint')){
      hint.remove();
    }
  }
  hint.addEventListener('click', ()=>{ localStorage.setItem('ok_landscape_hint_dismissed','1'); hint.remove(); });
  window.addEventListener('resize', checkOrientation);
  setTimeout(checkOrientation, 1200);
}

// ---- Konfeti efekti ----
// Not: fireConfetti() neredeyse her oyunda TAM OLARAK "bölümü/turu tamamladın"
// anında çağrılıyor (bkz. yapboz.html/eslestirme.html/vb.), bu yüzden XP
// kazanımının tek, merkezi kancası burası — 30/37 oyun otomatik kapsanır,
// hiçbir oyun dosyasını değiştirmeye gerek kalmadan.
// v19: daha "üst düzey" bir kutlama hissi için parçacık sayısı artırıldı,
// daire/kare'nin yanına yıldız şekli eklendi. opts.big=true (büyük/mükemmel
// başarılarda, isteğe bağlı olarak oyunlar geçebilir) daha yoğun bir patlama
// + hafif titreşim tetikler; opts verilmezse eski davranışla birebir aynıdır.
function fireConfetti(container, opts){
  opts = opts || {};
  earnXP(10, 'oyun-tamamlandi');
  const colors = ['#FF6B6B','#FFD23F','#2EC4B6','#6C4EF5','#FF9F43'];
  const count = opts.big ? 46 : 30;
  const layer = document.createElement('div');
  layer.style.cssText = 'position:absolute; inset:0; overflow:hidden; pointer-events:none; border-radius:inherit; z-index:30;';
  container.appendChild(layer);
  for(let i=0;i<count;i++){
    const p = document.createElement('div');
    const size = 6 + Math.random()*7;
    const color = colors[Math.floor(Math.random()*colors.length)];
    const shapeRoll = Math.random();
    const isStar = shapeRoll > 0.78;
    if(isStar){
      p.textContent = '★';
      p.style.cssText = `position:absolute; top:-14px; left:${Math.random()*100}%; font-size:${size+5}px; color:${color};
        line-height:1; opacity:.95; transform:rotate(${Math.random()*360}deg);
        animation:confetti-fall ${1.1+Math.random()*1.0}s ease-in ${Math.random()*0.35}s forwards;`;
    } else {
      p.style.cssText = `position:absolute; top:-10px; left:${Math.random()*100}%; width:${size}px; height:${size}px;
        background:${color}; border-radius:${shapeRoll>0.5?'50%':'2px'};
        opacity:.95; transform:rotate(${Math.random()*360}deg);
        animation:confetti-fall ${1.1+Math.random()*1.0}s ease-in ${Math.random()*0.35}s forwards;`;
    }
    layer.appendChild(p);
  }
  if(opts.big) maybeVibrate([25,40,25]);
  setTimeout(()=>layer.remove(), 2600);
}

// ---- Yıldız puanlama ----
function starRating(score, max){
  const ratio = max > 0 ? score / max : 0;
  const stars = ratio >= 0.99 ? 3 : ratio >= 0.6 ? 2 : ratio > 0 ? 1 : 0;
  return '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
}

// ---- Ebeveyn paneli için hafif oynama takibi (oyun mantığını etkilemez) ----
(function trackPlaySession(){
  try{
    const path = location.pathname.split('/').pop() || 'oyun';
    const sessionStart = Date.now();

    // toplam başlatma sayısı
    const totalPlays = parseInt(localStorage.getItem('ok_stat_totalPlays')||'0',10) + 1;
    localStorage.setItem('ok_stat_totalPlays', totalPlays);

    // bu oyunun kaç kez açıldığı
    const perGameKey = 'ok_stat_plays_'+path;
    const gamePlays = parseInt(localStorage.getItem(perGameKey)||'0',10) + 1;
    localStorage.setItem(perGameKey, gamePlays);

    // son oynananlar listesi (en fazla 8, en yeni başta) - başlık tema ile güncellensin diye 'load' sonrası yazılır
    window.addEventListener('load', ()=>{
      try{
        const gameName = document.title.replace(' — Oyun Kutusu','').trim() || path;
        let recent = [];
        try{ recent = JSON.parse(localStorage.getItem('ok_stat_recent')||'[]'); }catch(e){ recent = []; }
        recent = recent.filter(r=>r.path !== path);
        recent.unshift({ path, name: gameName, t: sessionStart });
        recent = recent.slice(0,8);
        localStorage.setItem('ok_stat_recent', JSON.stringify(recent));
      } catch(e){}
    });

    // bugünün tarihine göre günlük oyun sayısı
    const today = new Date().toISOString().slice(0,10);
    const dayKey = 'ok_stat_day_'+today;
    const isFirstPlayToday = !localStorage.getItem(dayKey);
    localStorage.setItem(dayKey, (parseInt(localStorage.getItem(dayKey)||'0',10)+1));
    // Günün ilk oyunu: günlük seriyi (streak) sürdürme/başlatma bonusu.
    if(isFirstPlayToday) earnXP(20, 'gunluk-seri');

    // sekme kapanırken / gizlenirken geçen süreyi (saniye) topla
    function flush(){
      const elapsed = Math.round((Date.now()-sessionStart)/1000);
      if(elapsed < 1) return;
      const totalSec = parseInt(localStorage.getItem('ok_stat_totalSeconds')||'0',10) + elapsed;
      localStorage.setItem('ok_stat_totalSeconds', totalSec);
      const todaySecKey = 'ok_stat_seconds_'+today;
      localStorage.setItem(todaySecKey, (parseInt(localStorage.getItem(todaySecKey)||'0',10)+elapsed));
    }
    document.addEventListener('visibilitychange', ()=>{ if(document.hidden) flush(); });
    window.addEventListener('pagehide', flush);
  } catch(e){ /* takip başarısız olursa oyunu asla etkilemesin */ }
})();

// ==========================================================================
// "Woogi'ye Sor" — HER OYUN SAYFASINDA yardımcı yapay zeka widget'ı.
// Ana sayfa (index.html) hariç: orada zaten kendi zengin, profil/XP/liderlik
// tablosu bilgili sürümü (assets/index.js -> woogiAnswer) elle HTML'e
// gömülü olarak çalışıyor; burada #mascotWidget zaten DOM'da bulunacağından
// bu blok kendini otomatik devre dışı bırakır (aşağıdaki ilk satır).
// Diğer ~36 oyun sayfasında ise HİÇBİR HTML dosyası değiştirilmeden, widget
// tamamen JS ile enjekte edilir — bu yüzden tek bir dosyadaki güncelleme
// tüm sitede anında etkili olur. Kural tabanlı, oyunun kendi GAME_CATALOG
// bilgisini (kategori, isim, ikon) kullanan HAFİF bir yardımcıdır; harici
// bir yapay zeka servisine bağlı DEĞİLDİR (bkz. common.js üstündeki
// leaderboard bölümündeki güvenlik notu ile aynı sebep: statik sitede
// istemci tarafı API anahtarı güvenle saklanamaz).
// ==========================================================================
(function initGameHelperWidget(){
  try{
    if(document.getElementById('mascotWidget')) return; // ana sayfa kendi sürümünü kullanıyor
    if(!document.body) return;

    const current = location.pathname.split('/').pop();
    const me = GAME_CATALOG[current] || null;

    // ---- Kategoriye göre "nasıl oynanır" / ipucu metinleri ----
    const HOW_TO_PLAY = {
      yaris: 'Ok tuşlarıyla ya da ekrana dokunarak aracını yönlendir, engellerden kaç ve rakiplerini geç! 🏁',
      hareket: 'Doğru zamanda dokun ya da tuşlara bas, dengeni koru ve engellerden kaç! 🤸',
      spor: 'Doğru anı yakala, dokunarak ya da tıklayarak vur veya at! ⚽',
      aksiyon: 'Hedefleri doğru zamanda vur, hızlı ve dikkatli ol! 🎯',
      hafiza: 'Kartları/adımları çevir ya da hatırla, aynı olanları eşleştir! 🧠',
      bulmaca: 'Parçaları doğru yerlere sürükle ya da tıkla, bulmacayı tamamla! 🧩',
      kelime: 'Harfleri birleştirerek doğru kelimeleri bul! 🔤',
      zeka: 'Doğru cevabı hızlıca seç, becerini göster! 🔢',
      mutfak: 'Malzemeleri doğru sırayla ekle, lezzetli bir sonuç ortaya çıkar! 🍕',
      macera: 'Zıpla, koş ve engelleri aş, yıldızları ve kalpleri topla! 🐼',
      yaratici: 'Hayal gücünü kullan, istediğin gibi tasarla! 🎨'
    };
    const HINTS = {
      yaris: 'İpucu: Virajlara girmeden önce hızını biraz azalt, çarpışırsan zaman kaybedersin! 💡',
      hareket: 'İpucu: Acele etme, önce ritmi yakala sonra hızlan! 💡',
      spor: 'İpucu: Göstergeyi/açıyı izleyip tam doğru anda dokun! 💡',
      aksiyon: 'İpucu: Gözünü hedeften ayırma, panik yapma! 💡',
      hafiza: 'İpucu: Az sayıda kartı aynı anda hatırlamaya çalış, sırayla ilerle! 💡',
      bulmaca: 'İpucu: Köşelerden ve kenarlardan başlamak genelde daha kolaydır! 💡',
      kelime: 'İpucu: Kısa kelimelerden başla, sonra uzunlarına geç! 💡',
      zeka: 'İpucu: Zorlanırsan bir sonraki tur otomatik kolaylaşır, sakin ol! 💡',
      mutfak: 'İpucu: Sipariş sırasına dikkat et, acele etme! 💡',
      macera: 'İpucu: Zıplamadan önce yere iyi bas, kontrol tuşlarını dene! 💡',
      yaratici: 'İpucu: Doğru ya da yanlış yok, sadece eğlen! 💡'
    };
    const cat = me && me.cat && me.cat[0];
    const howToPlay = (cat && HOW_TO_PLAY[cat]) || 'Ekrandaki yönergeleri takip et, dokunarak ya da tuşlarla oyna. Merak etme, alıştıkça kolaylaşır! 🎮';
    const hintText = (cat && HINTS[cat]) || 'İpucu: Sakin ol, acele etmeden dene — en iyi rekor pratikle gelir! 💡';

    // ---- Kategori anahtar kelimeleri (aynı düşünce ana sayfadaki MASCOT_CATEGORY_WORDS ile paralel) ----
    const GH_CATEGORY_WORDS = {
      hafiza: ['hafıza','hafiza','ezber','hatırla'],
      bulmaca: ['bulmaca','puzzle'],
      kelime: ['kelime','harf'],
      zeka: ['matematik','sayı','hesap'],
      yaris: ['yarış','yaris','araba','motor','bisiklet'],
      spor: ['spor','futbol','basketbol','penaltı'],
      aksiyon: ['aksiyon','balon','hedef'],
      macera: ['macera','platform'],
      mutfak: ['mutfak','yemek','pizza','sandviç'],
      hareket: ['zıpla','paten','denge','uçurtma']
    };
    function ghFindSuggestion(text){
      for(const c in GH_CATEGORY_WORDS){
        if(GH_CATEGORY_WORDS[c].some(w=> text.includes(w))){
          const matches = Object.keys(GAME_CATALOG).filter(f=> f !== current && GAME_CATALOG[f].cat.includes(c));
          if(matches.length){
            const file = matches[Math.floor(Math.random()*matches.length)];
            const g = GAME_CATALOG[file];
            return `${g.icon} <a href="${file}">${g.name}</a> dener misin? 🎮`;
          }
        }
      }
      return null;
    }
    function ghRandomOtherGame(){
      const files = Object.keys(GAME_CATALOG).filter(f=> f !== current);
      const file = files[Math.floor(Math.random()*files.length)];
      const g = GAME_CATALOG[file];
      return `${g.icon} <a href="${file}">${g.name}</a> oynamayı dene, çok eğlenceli! 🎲`;
    }

    function gameWoogiAnswer(raw){
      const text = raw.toLocaleLowerCase('tr').replace(/[?!.,]/g,'').trim();
      const suggestion = ghFindSuggestion(text);
      if(suggestion) return suggestion;
      if(text.includes('nasıl') && (text.includes('oyna') || text.includes('oynan'))) return howToPlay;
      if(text.includes('ipucu') || text.includes('yardım') || text.includes('yardim')) return hintText;
      if(/oyun.*(öner|oynamal|ne oyna)/.test(text) || text.includes('sıkıldım') || text.includes('ne oynasam') || text.includes('başka') || text.includes('rastgele')) return ghRandomOtherGame();
      if(text.includes('ana sayfa') || text.includes('anasayfa') || text.includes('geri dön')) return 'Ana sayfaya dönmek için sol üstteki "← Geri" bağlantısına ya da <a href="index.html">buraya</a> tıklayabilirsin! 🏠';
      if(text.includes('zor') || text.includes('kolay') || text.includes('seviye')) return 'Zorlanırsan bir sonraki tur otomatik olarak biraz kolaylaşır, iyi gidersen zorlaşır — kendine uygun hızda ilerlersin! 📈';
      if(text.includes('ses') || text.includes('müzik') || text.includes('sessiz')) return 'Sesi açıp kapatmak için oyun ekranındaki 🔊 simgesine (varsa) dokunabilirsin.';
      if(text.includes('tema') || text.includes('karanlık') || text.includes('koyu') || text.includes('gece')) return 'Ana sayfadaki 🌙/☀️ simgesiyle açık/koyu tema arasında geçiş yapabilirsin, tüm sitede hatırlanır!';
      if(text.includes('rekor') || text.includes('skor') || text.includes('puan')) return 'Rekorların cihazında saklanır, her oynadığında kendini geçmeye çalış! 🏆';
      if(text.includes('merhaba') || text.includes('selam') || text.includes('naber')) return `Merhaba! 🐼 ${me ? 'Şu an '+me.name+' oyunundasın. ' : ''}Sana nasıl yardımcı olabilirim?`;
      if(text.includes('teşekkür') || text.includes('sağol') || text.includes('sagol')) return 'Rica ederim! İyi eğlenceler! 🎉';
      if(text.includes('isim') || text.includes('kimsin') || text.includes('sen kim')) return "Ben Woogi, WoogiGames'in oyun dostu pandasıyım! 🐼";
      return `Bunu tam bilemedim ama "bu oyun nasıl oynanır?", "bana ipucu ver" ya da "başka oyun öner" diye sorabilirsin! 🐾`;
    }

    // ---- DOM'u enjekte et ----
    const widget = document.createElement('div');
    widget.id = 'mascotWidget';
    widget.innerHTML = '<span id="mascotChar">🐼</span><div id="mascotBubble"></div>';
    const panel = document.createElement('div');
    panel.id = 'mascotChatPanel';
    panel.setAttribute('role','dialog');
    panel.setAttribute('aria-label',"Woogi'ye Sor");
    panel.innerHTML =
      '<div id="mascotChatHeader"><span>🐼 Woogi\'ye Sor</span><button id="mascotChatClose" aria-label="Kapat" type="button">✕</button></div>' +
      '<div id="mascotChatLog"></div>' +
      '<div id="mascotChatQuick"></div>' +
      '<form id="mascotChatForm"><input id="mascotChatInput" type="text" placeholder="Bir şey sor..." maxlength="120" autocomplete="off"><button id="mascotChatSend" aria-label="Gönder" type="submit">➤</button></form>';
    document.body.appendChild(widget);
    document.body.appendChild(panel);

    const mascotBubble = document.getElementById('mascotBubble');
    const GH_TIPS = [
      me ? `Merhaba! Ben Woogi 🐾 ${me.name} oynuyorsun, harika seçim!` : 'Merhaba! Ben Woogi 🐾 İyi eğlenceler!',
      'Yardıma mı ihtiyacın var? Bana dokun! 🐼',
      hintText,
      'Zorlanırsan oyun otomatik kolaylaşır, sakin ol! 💪',
      'Başka oyunlar da denemek ister misin? Sor bana!'
    ];
    let ghTipIndex = 0;
    function showGhTip(text){
      mascotBubble.textContent = text;
      mascotBubble.classList.add('show');
      clearTimeout(window._ghMascotHideT);
      window._ghMascotHideT = setTimeout(()=> mascotBubble.classList.remove('show'), 4200);
    }

    const chatPanel = document.getElementById('mascotChatPanel');
    const chatLog = document.getElementById('mascotChatLog');
    const chatQuick = document.getElementById('mascotChatQuick');
    const chatForm = document.getElementById('mascotChatForm');
    const chatInput = document.getElementById('mascotChatInput');
    let chatOpened = false;

    function escapeHtml(s){ return s.replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
    function addChatMsg(who, html){
      const el = document.createElement('div');
      el.className = 'mchat-msg ' + who;
      el.innerHTML = html;
      chatLog.appendChild(el);
      chatLog.scrollTop = chatLog.scrollHeight;
    }
    const QUICK_QUESTIONS = ['Bu oyun nasıl oynanır?', 'Bana ipucu ver', 'Başka oyun öner', 'Ana sayfaya dön'];
    function renderQuick(){
      chatQuick.innerHTML = '';
      QUICK_QUESTIONS.forEach(q=>{
        const chip = document.createElement('button');
        chip.type = 'button'; chip.className = 'mchat-chip'; chip.textContent = q;
        chip.addEventListener('click', ()=> askWoogi(q));
        chatQuick.appendChild(chip);
      });
    }
    function askWoogi(text){
      text = (text||'').trim();
      if(!text) return;
      addChatMsg('user', escapeHtml(text));
      chatInput.value = '';
      chatLog.scrollTop = chatLog.scrollHeight;
      setTimeout(()=>{ addChatMsg('woogi', gameWoogiAnswer(text)); playClick(480); }, 380);
    }
    function toggleChat(forceOpen){
      const willOpen = forceOpen !== undefined ? forceOpen : !chatPanel.classList.contains('show');
      chatPanel.classList.toggle('show', willOpen);
      mascotBubble.classList.remove('show');
      if(willOpen && !chatOpened){
        chatOpened = true;
        addChatMsg('woogi', `Merhaba! Ben Woogi 🐼 ${me ? me.name+' hakkında ya da ' : ''}başka her şeyi sorabilirsin!`);
        renderQuick();
      }
      if(willOpen) setTimeout(()=> chatInput && chatInput.focus(), 150);
    }
    widget.addEventListener('click', ()=>{ toggleChat(); playClick(520); });
    document.getElementById('mascotChatClose').addEventListener('click', (e)=>{ e.stopPropagation(); toggleChat(false); });
    chatPanel.addEventListener('click', e=> e.stopPropagation());
    document.addEventListener('click', (e)=>{
      if(chatPanel.classList.contains('show') && !chatPanel.contains(e.target) && !widget.contains(e.target)) toggleChat(false);
    });
    document.addEventListener('keydown', (e)=>{
      if(e.key === 'Escape' && chatPanel.classList.contains('show')) toggleChat(false);
    });
    chatForm.addEventListener('submit', (e)=>{ e.preventDefault(); askWoogi(chatInput.value); });

    setTimeout(()=> showGhTip(GH_TIPS[0]), 1400);
    setInterval(()=>{
      ghTipIndex = (ghTipIndex+1) % GH_TIPS.length;
      showGhTip(GH_TIPS[ghTipIndex]);
    }, 25000);
  } catch(e){ /* yardımcı widget'ta bir sorun olsa bile oyun asla etkilenmesin */ }
})();
