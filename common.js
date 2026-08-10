// Oyun Kutusu - ortak veri ve yardımcı fonksiyonlar
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
