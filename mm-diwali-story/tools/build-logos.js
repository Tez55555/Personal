// Builds SVG logo files from the brand kit's exact outline geometry (y-up coords -> y-down SVG).
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const geo = JSON.parse(fs.readFileSync(path.join(root, 'brand/logo-geometry.json'), 'utf8'));
const PAL = { ink: '#2B2728', red: '#D2232E', white: '#FFFFFF' };
const WAYS = {
  full:    { ink: PAL.ink, pillar: PAL.red, word: PAL.ink, since: PAL.red },
  reverse: { ink: PAL.white, pillar: PAL.red, word: PAL.white, since: PAL.white },
  onred:   { ink: PAL.white, pillar: PAL.ink, word: PAL.white, since: PAL.white },
};
const ARITY = { M: 2, L: 2, Q: 4, C: 6, Z: 0 };
function flip(d, x0, y1) { // y-up -> y-down, shift so box starts at 0,0
  const out = []; const re = /([MLQCZ])|(-?\d*\.?\d+(?:e[-+]?\d+)?)/gi; let m, cur = null, nums = [];
  const flush = () => { if (!cur) return; const n = ARITY[cur]; for (let i = 0; i + n <= nums.length; i += n) { const c = [i > 0 && cur === 'M' ? 'L' : cur]; for (let j = 0; j < n; j += 2) c.push(+(nums[i + j] - x0).toFixed(3), +(y1 - nums[i + j + 1]).toFixed(3)); out.push(c[0] + c.slice(1).join(',')); } nums = []; };
  while ((m = re.exec(d))) { if (m[1]) { flush(); const c = m[1].toUpperCase(); if (c === 'Z') { out.push('Z'); cur = null; } else cur = c; } else nums.push(parseFloat(m[2])); }
  flush(); return out.join('');
}
const exportGeo = {};
for (const name of ['mark', 'horizontal', 'horizontal_nosince', 'bilingual', 'stacked', 'wordmark', 'seal']) {
  const g = geo[name]; const [x0, y0, x1, y1] = g.box; const W = x1 - x0, H = y1 - y0;
  exportGeo[name] = { w: +W.toFixed(3), h: +H.toFixed(3), items: g.items.map(([role, d]) => ({ role, d: flip(d, x0, y1) })) };
  for (const [way, map] of Object.entries(WAYS)) {
    const paths = exportGeo[name].items.map(it => `<path fill="${map[it.role] || PAL.ink}" d="${it.d}"/>`).join('');
    fs.writeFileSync(path.join(root, `brand/logos/${name}-${way}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W.toFixed(3)} ${H.toFixed(3)}" width="${W.toFixed(3)}" height="${H.toFixed(3)}">${paths}</svg>`);
  }
}
// y-down path data for canvas Path2D use in the engine
exportGeo.MARK = geo.MARK;
fs.writeFileSync(path.join(root, 'brand/logo-paths.json'), JSON.stringify(exportGeo));
console.log('ok', Object.keys(exportGeo));
// Also expose as a script for the browser engine (file/http agnostic).
fs.writeFileSync(path.join(root, 'brand/logo-paths.js'), 'window.MM_LOGO = ' + JSON.stringify(exportGeo) + ';\n');
