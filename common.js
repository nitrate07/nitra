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
