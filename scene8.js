// Bento product demo — v8.
// v7 notes addressed: no punch-in cuts — the camera simply moves; and only one kind of move at a time, never diagonal:
// a push/pull straight in or out about the frame centre, or a pan purely left/right or up/down.
const K = 1920 / 1440;
const $ = id => document.getElementById(id);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, p) => a + (b - a) * p;
const fmt = (v, d = 2) => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const show = (el, on) => { el.style.display = on ? '' : 'none'; };
const cam = (cx, cy, z) => ({ cx, cy, z });

const CHIP = [476, 425], DEP = [1200, 737], MARKER = [678, 560], FROM = [1100, 436];
const AMT = '100';
const BARS = [34.99, 30.02, 24.99, 9.99];
const SCROLL = 230;
const WSCROLL = 285;                                   // Wasabi scrolls down to Earning Activities
const WROW = i => 754 + 71 * i - WSCROLL, DEPROW = [1347, 754 - WSCROLL], BICON = [289, 754 - WSCROLL];                                    // Transparency scrolls the reserves table into the viewport

// ---- camera grammar (v2: shows the UI) ----
const WIDE = 0.8, MED = 1.05, TABLE = 1.12, CLOSE = 1.22;  // wide = whole window; close = the content column, centred
const COLX = 836;                                       // centre of the content column (sidebar excluded)
const SV = 1300;                                       // vertical strip distance (screen px)
const SHIFT = 2200;
gsap.registerPlugin(CustomEase); CustomEase.create('weighty', 'M0,0 C0.38,0 0.12,1 1,1');
const CAM_EASE = 'weighty', CUT_EASE = 'power3.in', LAND = 'expo.out', DRIFT = 0.016;                 // 1.6 %/s slow push while holding
const offR = c => cam(c.cx - SHIFT / (K * c.z), c.cy, c.z);           // a camera placed so its world sits one strip to the right
const INIT = { A: offR(cam(720, 405, WIDE)), B: cam(720, 405, 0.46), C: cam(720, 405 - SV / (K * WIDE), WIDE), D: offR(cam(720, 405, WIDE)), M: cam(720, 405, WIDE), L: cam(720, 405, 0.9) };
const KEYS = { A: [], B: [], C: [], D: [], M: [], L: [] };
const IDS = 'ABCDML';
// overlapping cuts: at scene time s the shot cuts and the scene rewinds d seconds, so the next shot replays the action
const CUTS = [];
// the scene (content) rewinds at a cut; the camera does not — it runs on video time, so its motion carries straight through
function remap(v) { let off = 0; for (const c of CUTS) { if (v + off >= c.s) off -= c.d; else break; } return v + off; }
const s2v = s => s + CUTS.reduce((a, c) => a + (s >= c.s ? c.d : 0), 0);
// camera keys are authored in scene time and stored in video time (vt = already video time)
const pan = (id, to, at, dur, ease = CAM_EASE, vt = false) => { const L = KEYS[id]; const last = L[L.length - 1], prev = last ? last.to : INIT[id], t = vt ? at : s2v(at); if (last && t < last.t + last.d - 1e-6) console.error(`camera keys overlap on ${id} at ${t.toFixed(2)} (prev ends ${(last.t + last.d).toFixed(2)})`); L.push({ t, d: dur, to: { ...prev, ...to }, ease }); };
function interpCam(a, b, p) {
  const z = Math.exp(lerp(Math.log(a.z), Math.log(b.z), p));
  if (b.z >= a.z) { const ox = (b.cx - a.cx) * K * a.z * (1 - p), oy = (b.cy - a.cy) * K * a.z * (1 - p); return { cx: b.cx - ox / (K * z), cy: b.cy - oy / (K * z), z }; }
  const ox = (a.cx - b.cx) * K * b.z * p, oy = (a.cy - b.cy) * K * b.z * p; return { cx: a.cx - ox / (K * z), cy: a.cy - oy / (K * z), z };
}
const drift = (s, dt) => ({ ...s, z: s.z * Math.exp(DRIFT * Math.max(0, dt)) });
function camAt(id, t) {
  let st = INIT[id], tEnd = null;
  for (const k of KEYS[id]) {
    const s0 = tEnd === null ? st : drift(st, k.t - tEnd);
    if (t < k.t) return tEnd === null ? st : drift(st, t - tEnd);
    if (t < k.t + k.d) {
      const p = (t - k.t) / k.d;
      if (k.an) { const a = k.an, z = Math.exp(lerp(Math.log(s0.z), Math.log(k.to.z), gsap.parseEase(k.ease)(p))), q = gsap.parseEase(a.e2)(p);
        const sx = lerp(a.s0[0], a.s1[0], q), sy = lerp(a.s0[1], a.s1[1], q); return { cx: a.wx - (sx - 960) / (K * z), cy: a.wy - (sy - 540) / (K * z), z }; }
      return interpCam(s0, k.to, gsap.parseEase(k.ease)(p));
    }
    st = k.to; tEnd = k.t + k.d;
  }
  return tEnd === null ? st : drift(st, t - tEnd);
}

const SH = ['shChip', 'shDep'];
const MBW = [];                                         // motion-blur windows, collected as moves are placed
const S = {
  black: 1, flash: 0,
  logoOn: 1, outro: 0, q: 0, mk: 0, glow: 0, gloss: -0.3, logoScale: 1, tag: 0,
  A: 0, B: 0, C: 0, D: 0,
  bal: 0, chipHover: 0, chipPress: 0, hovA1: 0, hovA2: 0,
  tot: 0, lines: 0, tip: 0, amtN: 0, caretAmt: 0, depHover: 0, depPress: 0, depLoad: 0, depDone: 0, upd: 0,
  m: 0, scroll: 0, bars: { 0: 0, 1: 0, 2: 0, 3: 0 }, hovRow: 0,
  pts: 0, hovD0: 0, hovD1: 0, wscroll: 0, wr: 0, wrOn: 0, depRowOn: 0,
  M: 0, L: 0, mx: 0, lscroll: 0,
  cur: { w: 'A', x: 0, y: 0, op: 0, press: 0, hand: 0 },
  sh: Object.fromEntries(SH.map(k => [k, 0])),
  cams: { ...INIT },
};
let tl, LET = [];

function drawBg() {
  const c = $('bg'), g = c.getContext('2d');
  g.fillStyle = '#040505'; g.fillRect(0, 0, 1920, 1080);
  const neb = (x, y, r, col, a) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gr; g.fillRect(0, 0, 1920, 1080); };
  neb(1500, 180, 900, '34,237,78', 0.07); neb(260, 960, 760, '59,105,255', 0.06); neb(1720, 1000, 600, '254,75,21', 0.035); neb(960, 540, 700, '20,30,26', 0.25);
  g.fillStyle = 'rgba(255,255,255,0.05)';
  for (let y = 12; y < 1080; y += 24) for (let x = 12; x < 1920; x += 24) { g.beginPath(); g.arc(x, y, 1, 0, Math.PI * 2); g.fill(); }
}
function heading(el, text, accent) {
  el.innerHTML = text.split(' ').map(w => accent.includes(w)
    ? `<span class="gw" style="background:linear-gradient(100deg,#22ed4e 0%,#22ed4e 30%,#d9ffe2 50%,#22ed4e 70%,#22ed4e 100%);background-size:300% 100%;-webkit-background-clip:text;background-clip:text;color:transparent">${w}</span>`
    : `<span>${w}</span>`).join(' ');
  [...el.children].forEach(s => { s.style.opacity = 0; });
}
function setupLogo() {
  const NS = 'http://www.w3.org/2000/svg', gm = $('gMark'), gl = $('gLetters');
  const inner = document.createElementNS(NS, 'g'); inner.id = 'gMarkInner'; gm.appendChild(inner);
  for (const t of LOGO.tiles) { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', t.d); p.setAttribute('fill', t.fill); inner.appendChild(p); }
  for (const t of LOGO.tiles) { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', t.d); p.setAttribute('fill', 'url(#gl)'); inner.appendChild(p); }
  for (const d of LOGO.letters) { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); p.setAttribute('fill', '#fff'); gl.appendChild(p); LET.push(p); }
}

// ---- timeline helpers ----
const move = (obj, to, at, dur, ease = 'power3.inOut') => tl.to(obj, { ...to, duration: dur, ease }, at);
const set = (obj, props, at) => tl.set(obj, props, at);
// headline: words rise in; the line grows from s0 (out of a dip it grows, like flying toward it) then keeps a slow push while held
function cardIn(el, at, n, st = 0.08, s0 = 1.05) {
  const E = at + st * (n - 1) + 0.45 + 0.32 + 0.04 * n;              // ~0.5s fully readable (tightened for a ~35s cut)
  tl.fromTo(el.children, { opacity: 0, y: 34, filter: 'blur(8px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.85, ease: 'expo.out', stagger: st }, at);
  tl.fromTo(el, { scale: s0 }, { scale: 1, duration: 0.8, ease: 'expo.out' }, at);
  tl.fromTo(el, { scale: 1 }, { scale: 1.03, duration: E - at - 0.8, ease: 'none', immediateRender: false }, at + 0.8);
  return E;
}
function cardOut(el, at, mode = 'push') {
  if (mode === 'push') { tl.fromTo(el, { scale: 1.03 }, { scale: 1.45, duration: 0.42, ease: 'power2.in', immediateRender: false }, at); tl.to(el.children, { opacity: 0, filter: 'blur(10px)', duration: 0.24, ease: 'power2.in', stagger: 0.015 }, at); }
  else tl.set(el.children, { opacity: 0 }, at);
}
const shine = (k, at, dur = 0.5) => tl.fromTo(S.sh, { [k]: 0 }, { [k]: 1, duration: dur, ease: 'sine.inOut', immediateRender: false }, at);
const tap = (obj, k, at) => { move(obj, { [k]: 1 }, at, 0.07, 'power1.out'); move(obj, { [k]: 0 }, at + 0.07, 0.14, 'power1.in'); };
// cursor: appears, travels between targets (arrow while travelling, hand over clickables), clicks, leaves
const curIn = (w, x, y, at) => { set(S.cur, { w, x, y, op: 0, hand: 0 }, at); move(S.cur, { op: 1 }, at, 0.2, 'none'); };
const curGo = (x, y, at, dur, hand = 0) => { move(S.cur, { x, y }, at, dur, 'power2.inOut'); move(S.cur, { hand }, at + dur * (hand ? 0.75 : 0.1), 0.12, 'none'); };
const click = at => tap(S.cur, 'press', at);
const curOut = at => move(S.cur, { op: 0 }, at, 0.18, 'none');
const hover = (k, at, dur = 0.18) => move(S, { [k]: 1 }, at, dur, 'power1.out');
const unhover = (k, at, dur = 0.25) => move(S, { [k]: 0 }, at, dur, 'power1.in');

function build() {
  tl = gsap.timeline({ paused: true });
  const mb = (a, b, vt = false) => MBW.push(vt ? [a, b] : [s2v(a), s2v(b)]);
  const dipIn = at => move(S, { black: 1 }, at, 0.18, 'power2.in');
  const dipOut = at => move(S, { black: 0 }, at, 0.45, 'expo.out');
  const scr = (c, x, y) => [960 + (x - c.cx) * K * c.z, 540 + (y - c.cy) * K * c.z];
  const anchored = (wx, wy, sx, sy, z) => cam(wx - (sx - 960) / (K * z), wy - (sy - 540) / (K * z), z);
  const akey = (id, t, d, ease, to, an) => { const L = KEYS[id], last = L[L.length - 1]; if (last && t < last.t + last.d - 1e-6) console.error(`camera keys overlap on ${id} at ${t.toFixed(2)}`); L.push({ t, d, to, ease, an }); };
  // the only moves: push/pull about the frame centre, or a pan on one axis — each starts from the camera's current state
  const zoomC = (id, z1, at, dur, ease) => { const t = s2v(at), k = camAt(id, t); akey(id, t, dur, ease, cam(k.cx, k.cy, z1)); };
  const panX = (id, x, at, dur, ease) => { const t = s2v(at), k = camAt(id, t); akey(id, t, dur, ease, cam(x, k.cy, k.z)); };
  const panY = (id, y, at, dur, ease) => { const t = s2v(at), k = camAt(id, t); akey(id, t, dur, ease, cam(k.cx, y, k.z)); };
  const STRIP = 0.9;

  // ===== 01 LOGO =====
  move(S, { black: 0 }, 0, 0.5, 'sine.inOut');
  move(S, { mk: 1 }, 0.2, 1.0, 'expo.out');
  move(S, { glow: 1 }, 0.4, 0.8, 'sine.inOut');
  move(S, { gloss: 1.3 }, 1.0, 0.5, 'power1.inOut');
  move(S, { q: 1 }, 1.45, 0.48, 'power3.inOut');
  tl.fromTo(LET, { opacity: 0, x: 5, filter: 'blur(1.6px)' }, { opacity: 1, x: 0, filter: 'blur(0px)', duration: 0.45, ease: 'power2.out', stagger: 0.05 }, 1.6);
  move(S, { logoScale: 1.04 }, 1.95, 0.7, 'sine.inOut');
  move(S, { logoScale: 7 }, 2.65, 0.3, 'power3.in'); mb(2.62, 2.96);
  dipIn(2.78);
  set(S, { logoOn: 0 }, 2.96);

  // ===== 02 TAGLINE → slides off as the Overview slides in (one horizontal move) =====
  const H = 2.96;
  dipOut(H + 0.02);
  cardIn($('h1'), H + 0.06, 4, 0.075, 0.86);
  const SL = H + 1.1;
  set(S, { A: 1 }, SL);
  tl.fromTo($('h1'), { x: 0 }, { x: -SHIFT, duration: STRIP, ease: CAM_EASE }, SL); mb(SL, SL + STRIP);
  pan('A', cam(720, 405, WIDE), SL, STRIP);
  cardOut($('h1'), SL + 0.95, 'fade');

  // ===== 03 OVERVIEW: wide → push in (cut on the hover) → pull back the same way → push through the Savings chip =====
  const Dn = SL + STRIP;
  tl.fromTo(S, { bal: 0.82 }, { bal: 1, duration: 1.2, ease: 'power2.out' }, Dn - 0.2);
  curIn('A', 640, 380, Dn + 0.05); curGo(700, 300, Dn + 0.1, 0.4); hover('hovA1', Dn + 0.5);
  zoomC('A', CLOSE, Dn + 0.25, 0.9, 'power2.inOut');                     // push in
  unhover('hovA1', Dn + 1.2);
  panX('A', COLX, Dn + 1.2, 0.8, 'power2.inOut');                          // then pan right
  curGo(1290, 300, Dn + 1.35, 0.55); hover('hovA2', Dn + 1.55); unhover('hovA2', Dn + 2.1);
  zoomC('A', WIDE, Dn + 2.05, 0.85, 'power2.inOut');                      // pull back out
  curGo(CHIP[0], CHIP[1], Dn + 2.35, 0.55, 1);
  panX('A', CHIP[0], Dn + 2.95, 0.55, 'power2.inOut');                    // pan left onto the Savings chip
  hover('chipHover', Dn + 2.95, 0.12);
  tap(S, 'chipPress', Dn + 3.45); click(Dn + 3.45);
  zoomC('A', 7.5, Dn + 3.5, 0.7, 'power3.in'); mb(Dn + 3.85, Dn + 4.2);   // straight push through it
  curOut(Dn + 3.55);
  dipIn(Dn + 4.02);
  set(S, { A: 0 }, Dn + 4.2);

  // ===== 04 "Save at 6% APY." grows out of the dip; the camera pushes through it into Savings =====
  const X0 = Dn + 4.2;
  dipOut(X0 + 0.02);
  const E0 = cardIn($('card0'), X0 + 0.06, 4, 0.08, 0.86);
  cardOut($('card0'), E0, 'push');

  // ===== 05 SAVINGS: push in from far → chart hover → punch-in (cut on the tooltip) → deposit → pull back → whip down =====
  const T = E0 + 0.22;
  move(S, { B: 1 }, T, 0.28, 'sine.inOut');
  pan('B', cam(720, 405, WIDE), T, 1.05, LAND); mb(T, T + 0.35);           // pure push (same centre)
  tl.fromTo(S, { tot: 0.9 }, { tot: 1, duration: 1.1, ease: 'power2.out' }, T + 0.2);
  move(S, { lines: 1 }, T + 0.4, 1.25, 'power2.inOut');
  curIn('B', 420, 760, T + 0.5);
  curGo(MARKER[0], MARKER[1], T + 0.55, 0.8);
  move(S, { tip: 1 }, T + 1.4, 0.4, 'back.out(1.6)');
  zoomC('B', CLOSE, T + 1.35, 0.9, 'power2.inOut');                      // push in on the chart
  panX('B', COLX, T + 2.3, 0.75, 'power2.inOut');                          // pan right to the deposit form
  curGo(FROM[0], FROM[1], T + 2.45, 0.7);
  panY('B', 470, T + 3.45, 0.6, 'power2.inOut');                          // pan down with the cursor to Deposit
  click(T + 3.2); set(S, { caretAmt: 1 }, T + 3.2);
  move(S, { amtN: AMT.length }, T + 3.35, 0.3, 'none');
  curGo(DEP[0], DEP[1], T + 3.8, 0.5, 1);
  shine('shDep', T + 4.05, 0.5);
  hover('depHover', T + 4.2, 0.12);
  tap(S, 'depPress', T + 4.45); click(T + 4.45);
  set(S, { caretAmt: 0 }, T + 4.47);
  move(S, { depLoad: 1 }, T + 4.55, 0.15, 'none');
  move(S, { depDone: 1 }, T + 5.2, 0.25, 'power2.out');
  move(S, { upd: 1 }, T + 5.3, 0.7, 'power2.out');
  curGo(1250, 660, T + 5.25, 0.35); curOut(T + 5.6);
  zoomC('B', MED, T + 4.95, 0.8, 'power2.inOut');                        // pull back out
  panY('B', 470 + 1250 / (K * MED), T + 5.8, 0.42, 'power3.in'); mb(T + 5.9, T + 6.5);   // whip down
  set(S, { B: 0 }, T + 6.2);

  // ===== 06 "Every dollar, onchain." rides up on the whip, carries on up as Transparency rises in =====
  const X1 = T + 6.08;
  tl.fromTo($('card1'), { y: 1000 }, { y: 0, duration: 0.45, ease: 'power3.out' }, X1);
  const E1 = cardIn($('card1'), X1 + 0.06, 3, 0.08, 1);
  tl.fromTo($('card1'), { y: 0 }, { y: -SV, duration: STRIP, ease: CAM_EASE, immediateRender: false }, E1); mb(E1, E1 + STRIP);
  cardOut($('card1'), E1 + 0.95, 'fade');

  // ===== 07 TRANSPARENCY: rise → page scrolls (wide) → punch-in as the bars fill → whip right (horizontal only) =====
  set(S, { C: 1 }, E1);
  pan('C', cam(720, 405, WIDE), E1, STRIP);
  const W = E1 + STRIP;
  tl.fromTo(S, { m: 0.6 }, { m: 1, duration: 1.0, ease: 'power2.out' }, E1 + 0.45);
  curIn('C', 980, 760, W + 0.1); curGo(900, 560, W + 0.15, 0.6);
  move(S, { scroll: 1 }, W + 0.2, 1.1, 'power2.inOut');
  tl.fromTo(['row0', 'row1', 'row2', 'row3'].map($), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out', stagger: 0.09 }, W + 0.6);
  zoomC('C', CLOSE, W + 1.2, 0.9, 'power2.inOut');                       // push in on the table
  [0, 1, 2, 3].forEach(i => move(S.bars, { [i]: 1 }, W + 1.5 + i * 0.17, 0.6, 'power2.out'));
  curGo(1180, 545, W + 1.9, 0.55); hover('hovRow', W + 2.4); unhover('hovRow', W + 3.0);
  curOut(W + 3.05);
  panX('C', 2150, W + 2.15, 1.47, 'power3.in'); mb(W + 3.15, W + 3.9);    // one move right: drifts onto the allocation bars, then whips
  set(S, { C: 0 }, W + 3.62);

  // ===== 08 "Earn points while you save." rides in on the whip, slides off as Wasabi glides in =====
  const X2 = W + 3.49;
  tl.fromTo($('card2'), { x: 1500 }, { x: 0, duration: 0.45, ease: 'power3.out' }, X2);
  const E2 = cardIn($('card2'), X2 + 0.05, 5, 0.07, 1);
  tl.fromTo($('card2'), { x: 0 }, { x: -SHIFT, duration: STRIP, ease: CAM_EASE, immediateRender: false }, E2); mb(E2, E2 + STRIP);
  cardOut($('card2'), E2 + 0.95, 'fade');

  // ===== 09 WASABI: glide in → punch-in on the points → pull back the same way as the page scrolls → rows =====
  set(S, { D: 1 }, E2);
  pan('D', cam(720, 405, WIDE), E2, STRIP);
  const R = E2 + STRIP;
  tl.fromTo(S, { pts: 0.55 }, { pts: 1, duration: 1.4, ease: 'power2.out' }, E2 + 0.5);
  curIn('D', 560, 560, R + 0.05); curGo(440, 370, R + 0.1, 0.4); hover('hovD0', R + 0.5);
  zoomC('D', CLOSE, R + 0.25, 0.9, 'power2.inOut');                      // push in on the points
  unhover('hovD0', R + 1.2);
  panX('D', COLX, R + 1.2, 0.75, 'power2.inOut');                          // pan right to Leaderboard
  curGo(830, 370, R + 1.3, 0.5); hover('hovD1', R + 1.55); unhover('hovD1', R + 2.15);
  move(S, { wscroll: 1 }, R + 2.15, 1.1, 'power2.inOut');
  zoomC('D', WIDE, R + 2.1, 0.9, 'power2.inOut');                        // pull back out while the page scrolls
  panX('D', 720, R + 3.0, 0.55, 'power2.inOut');                           // pan left to centre the window
  curGo(760, 600, R + 2.5, 0.6);
  curGo(760, WROW(1), R + 3.1, 0.4);
  set(S, { wr: 1 }, R + 3.35); hover('wrOn', R + 3.35);
  curGo(820, WROW(0), R + 3.8, 0.4); move(S, { wr: 0 }, R + 3.82, 0.35, 'power2.inOut');
  curOut(R + 4.25); unhover('wrOn', R + 4.25, 0.2);

  // ===== 10 MONTAGE: same framing, one slow push (zoom only), quick dissolves between the screens =====
  const M = R + 4.55, SHOT = 0.75, NM = 5, XF = 0.16;                      // buy · portfolio · wallet · leaderboard · referees
  set(S, { M: 1, mx: 0 }, M);
  set(S, { D: 0 }, M + XF);
  move(S, { M: 1 }, M, 0.001, 'none');
  tl.fromTo(S, { Mfade: 0 }, { Mfade: 1, duration: XF, ease: 'none', immediateRender: false }, M);
  const zM0 = camAt('D', s2v(M)).z;
  pan('M', cam(720, 405, zM0), M, 0.001, 'none');
  pan('M', cam(720, 405, 0.9), M + 0.001, SHOT * NM + 1.6, 'none');      // carries on through the landing page
  for (let i = 1; i < NM; i++) move(S, { mx: i }, M + i * SHOT - XF / 2, XF, 'none');

  // ===== 11 LANDING: dissolve to the hero — the last shot — the same push carries on, then fade to black for the loop =====
  const LP = M + SHOT * NM;
  set(S, { L: 1 }, LP - XF / 2);
  tl.fromTo(S, { Lfade: 0 }, { Lfade: 1, duration: XF, ease: 'none', immediateRender: false }, LP - XF / 2);
  set(S, { M: 0 }, LP + XF / 2);
  const ENDT = LP + 1.6;
  move(S, { black: 1 }, ENDT - 0.45, 0.45, 'sine.inOut');
  tl.set({}, {}, ENDT);

  window.TIMES = { H, SL, Dn, X0, E0, T, X1, E1, W, X2, E2, R, M, LP, ENDT };
  window.DURATION = +s2v(ENDT).toFixed(3);
  window.MB = MBW;
  window.CUTS = CUTS;
}

// ---------------- apply ----------------
const applyCam = (el, c) => { el.style.transform = `translate(960px,540px) scale(${K * c.z}) translate(${-c.cx}px,${-c.cy}px)`; };
const w2s = (c, x, y) => [960 + (x - c.cx) * K * c.z, 540 + (y - c.cy) * K * c.z];
function grow(el, from, to, e, s0 = 0.08) { el.style.transform = `translate(${(1 - e) * (from[0] - to[0])}px,${(1 - e) * (from[1] - to[1])}px) scale(${lerp(s0, 1, e)})`; }
function caretHTML(s, on, h) { return s + (on ? `<span class="caret" style="height:${h}px"></span>` : ''); }
const blinkOn = t => Math.floor(t * 3) % 2 === 0;
function shineApply(k) {
  const el = $(k), p = S.sh[k];
  if (p <= 0 || p >= 1) { el.style.display = 'none'; return; }
  const w = parseFloat(el.style.width), bw = Math.max(26, w * 0.32);
  el.style.display = 'block'; Object.assign(el.firstElementChild.style, { width: bw + 'px', left: (-bw * 1.4 + (w + bw * 2.8) * p) + 'px' });
}
const press = (el, hv, pr) => { el.style.filter = `brightness(${1 + 0.2 * hv})`; el.style.transform = `scale(${1 - 0.035 * pr})`; };
const hovApply = (id, v) => { $(id).style.opacity = v; };

function applyLogo() {
  show($('logo'), S.logoOn > 0); show($('glow'), S.logoOn > 0); show($('tag'), S.logoOn > 0 && S.outro > 0);
  if (!S.logoOn) return;
  const L = 6.2, M = 9, LY = S.outro ? 505 : 540;
  const ox = 960 - 51.5 * L, oy = LY - 13 * L, lockC = [ox + 12.39 * L, oy + 12.66 * L];
  const q = S.q, s = lerp(M, L, q), cx = lerp(960, lockC[0], q), cy = lerp(LY, lockC[1], q);
  $('gMark').setAttribute('transform', `translate(${cx - 12.39 * s} ${cy - 12.66 * s}) scale(${s})`);
  $('gLetters').setAttribute('transform', `translate(${ox} ${oy}) scale(${L})`);
  // the whole mark arrives as one piece: rises, scales up from 0.82 and sharpens
  const mk = S.mk, inner = $('gMarkInner');
  inner.setAttribute('transform', `translate(12.39 ${12.66 + 4 * (1 - mk)}) scale(${0.82 + 0.18 * mk}) translate(-12.39 -12.66)`);
  inner.style.opacity = clamp(mk * 2.2, 0, 1); inner.style.filter = `blur(${(1 - mk) * 0.9}px)`;
  const g = S.gloss; $('g0').setAttribute('offset', clamp(g - 0.12, 0, 1)); $('g1').setAttribute('offset', clamp(g, 0, 1)); $('g2').setAttribute('offset', clamp(g + 0.12, 0, 1));
  Object.assign($('glow').style, { left: (cx - 500) + 'px', top: (cy - 500) + 'px', opacity: S.glow * (1 - 0.45 * q) * clamp(mk * 1.5, 0, 1) });
  const sc = `scale(${S.logoScale})`;
  Object.assign($('logo').style, { transformOrigin: `${cx}px ${cy}px`, transform: sc }); $('glow').style.transform = sc;
  Object.assign($('tag').style, { top: '600px', opacity: S.tag, transform: `translateY(${(1 - S.tag) * 14}px)`, filter: `blur(${(1 - S.tag) * 6}px)` });
}

function render(v) {
  const t = remap(v);
  tl.time(t, false);
  for (const id of IDS) S.cams[id] = camAt(id, v);
  // background parallax: the dotted backdrop follows the visible camera at a fraction of its travel — depth
  let px = 0, py = 0, pz = 0, wsum = 0;
  for (const id of IDS) { const w = S[id]; if (w <= 0.001) continue; const c = S.cams[id]; px += w * (c.cx - 720); py += w * (c.cy - 405); pz += w * Math.log(clamp(c.z / WIDE, 0.5, 2.5)); wsum += w; }
  if (wsum > 1) { px /= wsum; py /= wsum; pz /= wsum; }
  $('bg').style.transform = `translate(${-20 + 1.2 * v - clamp(px * 0.09, -90, 90)}px,${-8 + 0.5 * v - clamp(py * 0.09, -60, 60)}px) scale(${1.06 * Math.exp(0.1 * pz)})`;
  $('flash').style.opacity = S.flash; $('black').style.opacity = S.black;
  document.querySelectorAll('.gw').forEach(g => { g.style.backgroundPosition = `${100 - (t * 40) % 100}% 0`; });
  const tvl = '$' + fmt(10482316.52 + 0.37 * v * 7);                   // TVL ticks up live in the top bar
  document.querySelectorAll('.tvl').forEach(e => { e.textContent = tvl; });
  applyLogo(); SH.forEach(shineApply);

  show($('wA'), S.A > 0.001);
  if (S.A > 0.001) {
    const b = S.bal;
    $('aBal1').textContent = fmt(1567.23 * b); $('aBal2').textContent = fmt(1567.23 * b);
    $('aCap1').textContent = '$' + fmt(6214880 * b, 0); $('aCap2').textContent = '$' + fmt(4267436 * b, 0);
    press($('chip'), S.chipHover, S.chipPress); $('shChip').style.transform = `scale(${1 - 0.035 * S.chipPress})`;
    hovApply('hovA1', S.hovA1); hovApply('hovA2', S.hovA2);
    applyCam($('wA'), S.cams.A); $('wA').style.opacity = S.A;
  }
  show($('wB'), S.B > 0.001);
  if (S.B > 0.001) {
    $('bTot').textContent = fmt(4183661 * S.tot + 100 * S.upd);
    $('lines').style.clipPath = `inset(0 ${(1 - S.lines) * 100}% 0 0)`;
    const tp = S.tip; show($('tip'), tp > 0.001); Object.assign($('tip').style, { opacity: clamp(tp * 2, 0, 1), transform: `translateY(${(1 - tp) * 8}px) scale(${0.92 + 0.08 * tp})` });
    const n = Math.floor(S.amtN + 1e-6), a = AMT.slice(0, n), v = parseFloat(a) || 0;
    const on = S.caretAmt > 0.5 && (S.amtN < AMT.length || blinkOn(t));
    $('bAmt').innerHTML = n === 0 ? caretHTML('<span style="opacity:.35">0</span>', S.caretAmt > 0.5 && blinkOn(t), 26) : caretHTML(a, on, 26);
    $('bUsd').textContent = '$' + fmt(v); $('bUsd2').textContent = '$' + fmt(v);
    $('bTo').innerHTML = v ? fmt(v / 1.02) : '<span style="opacity:.35">0</span>';
    $('bBal1').innerHTML = `Balance:&nbsp; ${fmt(134.34 - 100 * S.upd)}`; $('bBal2').innerHTML = `Balance:&nbsp; ${fmt(56.02 + 98.04 * S.upd)}`;
    press($('depBtn'), S.depHover, S.depPress); $('shDep').style.transform = `scale(${1 - 0.035 * S.depPress})`;
    $('depState').style.opacity = S.depLoad; $('depSpin').style.opacity = 1 - S.depDone; $('depSpin').style.transform = `rotate(${(t * 420) % 360}deg)`;
    $('depDone').style.opacity = S.depDone; $('depDone').style.transform = `translateY(${(1 - S.depDone) * 10}px)`;
    applyCam($('wB'), S.cams.B); $('wB').style.opacity = S.B;
  }
  show($('wC'), S.C > 0.001);
  if (S.C > 0.001) {
    $('trScroll').style.transform = `translateY(${-SCROLL * S.scroll}px)`;
    $('cM').textContent = '$' + (10.48 * S.m).toFixed(2) + 'M';
    BARS.forEach((v, i) => { const p = S.bars[i]; $('bar' + i).style.clipPath = `inset(0 ${(1 - p) * 100}% 0 0)`; $('bar' + i).style.opacity = p > 0 ? 1 : 0; $('pct' + i).textContent = p > 0 ? (v * p).toFixed(2) + '%' : ''; $('pct' + i).style.opacity = Math.min(1, p * 4) * parseFloat($('row' + i).style.opacity || 0); });
    hovApply('hovRow', S.hovRow);
    applyCam($('wC'), S.cams.C); $('wC').style.opacity = S.C;
  }
  show($('wD'), S.D > 0.001);
  if (S.D > 0.001) {
    $('dPts').textContent = Math.round(10672 * S.pts).toLocaleString('en-US'); $('dPts24').textContent = Math.round(10 * S.pts);
    $('waScroll').style.transform = `translateY(${-WSCROLL * S.wscroll}px)`;
    hovApply('hovD0', S.hovD0); hovApply('hovD1', S.hovD1);
    $('hovWR').style.top = (720 + 71 * S.wr) + 'px'; hovApply('hovWR', S.wrOn);
    $('depRow').style.opacity = S.depRowOn;
    applyCam($('wD'), S.cams.D); $('wD').style.opacity = S.D;
  }
  show($('wM'), S.M > 0.001);
  if (S.M > 0.001) {
    const f = Math.floor(S.mx + 1e-6), fr = S.mx - f;
    [...document.querySelectorAll('.mshot')].forEach((im, i) => { im.style.opacity = i <= f ? 1 : i === f + 1 ? fr : 0; im.style.display = i <= f + 1 ? '' : 'none'; });
    $('mTvl').style.opacity = clamp(2 - S.mx, 0, 1); show($('mTvl'), S.mx < 2);   // live TVL on Buy + Portfolio
    applyCam($('wM'), S.cams.M); $('wM').style.opacity = S.D > 0.001 ? (S.Mfade ?? 1) : 1;
  }
  show($('wL'), S.L > 0.001);
  if (S.L > 0.001) { $('land').style.transform = 'translateY(0px)'; applyCam($('wL'), S.cams.M); $('wL').style.opacity = S.Lfade ?? 1; }
  ['h1', 'card0', 'card1', 'card2'].forEach(id => { const el = $(id); show(el, [...el.children].some(s => parseFloat(s.style.opacity || 0) > 0.001)); });

  const cur = $('cursor'), cs = S.cur;
  if (cs.op > 0.001) {
    const [x, y] = w2s(S.cams[cs.w], cs.x, cs.y - (cs.w === 'C' ? 0 : 0));
    Object.assign(cur.style, { display: 'block', left: x + 'px', top: y + 'px', opacity: cs.op, transform: `scale(${1 - 0.16 * cs.press})`, transformOrigin: '0 0' });
    $('curArrow').style.opacity = 1 - cs.hand; $('curHand').style.opacity = cs.hand;
  } else cur.style.display = 'none';
}

window.render = render;
window.ready = (async () => {
  drawBg();
  heading($('h1'), 'Smarter savings, onchain.', ['onchain.']);
  heading($('card0'), 'Save at 6% APY.', ['6%', 'APY.']);
  heading($('card1'), 'Every dollar, onchain.', ['onchain.']);
  heading($('card2'), 'Earn points while you save.', ['while', 'you', 'save.']);
  setupLogo(); build();
  await document.fonts.load('600 32px Friends'); await document.fonts.load('600 16px PJS'); await document.fonts.load('400 14px PJS');
  await Promise.all([...document.images].map(i => i.decode().catch(() => null)));
  render(0); return true;
})();
