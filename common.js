// Oyun Kutusu - ortak veri ve yardımcı fonksiyonlar
const THEMES = {
  hayvanlar: { name: 'Hayvanlar', emojis: ['🐱','🐶','🐰','🦊','🐻','🐼','🦁','🐸','🐵','🐷'],
    words: ['kedi','köpek','tavşan','tilki','ayı','panda','aslan','kurbağa','maymun','domuz'] },
  meyveler: { name: 'Meyveler', emojis: ['🍎','🍌','🍇','🍉','🍓','🍒','🍍','🥝','🍑','🍋'],
    words: ['elma','muz','üzüm','karpuz','çilek','kiraz','ananas','kivi','şeftali','limon'] },
  uzay: { name: 'Uzay', emojis: ['🚀','🌙','⭐','🪐','☄️','👽','🛸','🌎','🌟','🔭'],
    words: ['roket','ay','yıldız','gezegen','kuyruklu yıldız','uzaylı','uçan daire','dünya','takımyıldız','teleskop'] },
  deniz: { name: 'Deniz', emojis: ['🐠','🐳','🐙','🦀','🐬','🐟','🦈','🐢','🐚','🌊'],
    words: ['balık','balina','ahtapot','yengeç','yunus','köpekbalığı','kaplumbağa','midye','mercan','dalga'] },
  tatli: { name: 'Tatlılar', emojis: ['🍕','🍩','🍪','🍦','🍭','🍰','🧁','🍫','🍬','🍿'],
    words: ['pizza','donut','kurabiye','dondurma','lolipop','pasta','kek','çikolata','şeker','patlamış mısır'] }
};

const LEVEL_NAMES = { 1: 'Kolay', 2: 'Orta', 3: 'Zor', 4: 'Uzman' };

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
function playTone(freq, duration = 0.15, type = 'sine', vol = 0.18){
  try{
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

// ---- Ortak sonuç ekranı (Game Over / Victory) ----
// rows: [[label, value], ...]  -> #result-grid tarzı bir konteynere basılır
function renderResultGrid(elId, rows){
  const el = typeof elId === 'string' ? document.getElementById(elId) : elId;
  if(!el) return;
  el.innerHTML = rows.map(([k,v],i)=>
    `<div style="animation-delay:${i*0.08}s"><div class="rk">${k}</div><div class="rv">${v}</div></div>`
  ).join('');
}

// ---- Overlay'i animasyonlu göster/gizle (geriye dönük uyumlu: style.display de çalışır) ----
function showOverlay(elOrId){
  const el = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
  if(!el) return;
  el.style.display = '';
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}
function hideOverlay(elOrId){
  const el = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
  if(!el) return;
  el.classList.remove('show'); el.style.display = 'none';
}

// ---- Doğru/Yanlış görsel geri bildirimi (herhangi bir elemente uygulanabilir) ----
function triggerCorrectFx(el){ if(!el) return; el.classList.remove('glow'); void el.offsetWidth; el.classList.add('glow'); }
function triggerWrongFx(el){ if(!el) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); setTimeout(()=>el.classList.remove('shake'), 380); }

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

// ---- Konfeti efekti ----
function fireConfetti(container){
  const colors = ['#FF6B6B','#FFD23F','#2EC4B6','#6C4EF5','#FF9F43'];
  const layer = document.createElement('div');
  layer.style.cssText = 'position:absolute; inset:0; overflow:hidden; pointer-events:none; border-radius:inherit;';
  container.appendChild(layer);
  for(let i=0;i<28;i++){
    const p = document.createElement('div');
    const size = 6 + Math.random()*6;
    p.style.cssText = `position:absolute; top:-10px; left:${Math.random()*100}%; width:${size}px; height:${size}px;
      background:${colors[Math.floor(Math.random()*colors.length)]}; border-radius:${Math.random()>0.5?'50%':'2px'};
      opacity:.95; transform:rotate(${Math.random()*360}deg);
      animation:confetti-fall ${1.1+Math.random()*0.9}s ease-in ${Math.random()*0.3}s forwards;`;
    layer.appendChild(p);
  }
  setTimeout(()=>layer.remove(), 2400);
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
    localStorage.setItem(dayKey, (parseInt(localStorage.getItem(dayKey)||'0',10)+1));

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
