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
