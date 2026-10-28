// Bento product demo — v4.
// v3 notes addressed: one transition language — every text ↔ UI cut is the locked horizontal strip slide (text and UI travel
// together, always leftward); each screen opens wide on its layout, then an overlapping cut (the next shot starts a few
// frames early and replays the action) punches in closer; text never scales (no jitter), lines are rigid and composited;
// more product: a match-cut montage (Buy · Portfolio · Leaderboard · Referees) and the landing page, scrolled, into the outro.
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
const WIDE = 0.8, MED = 1.25, TABLE = 1.15, CLOSE = 1.6;  // wide = whole window; medium = a panel; close = a detail (max 1.6x)
const SV = 1300;                                       // vertical strip distance (screen px)
const SHIFT = 2200;
gsap.registerPlugin(CustomEase); CustomEase.create('weighty', 'M0,0 C0.38,0 0.12,1 1,1');
const CAM_EASE = 'weighty', CUT_EASE = 'power3.in', LAND = 'expo.out', DRIFT = 0.016;                 // 1.6 %/s slow push while holding
const offR = c => cam(c.cx - SHIFT / (K * c.z), c.cy, c.z);           // a camera placed so its world sits one strip to the right
const INIT = { A: offR(cam(720, 405, WIDE)), B: offR(cam(720, 405, WIDE)), C: offR(cam(720, 405, WIDE)), D: offR(cam(720, 405, WIDE)), M: cam(720, 405, WIDE), L: cam(712, 400, 0.9) };
const KEYS = { A: [], B: [], C: [], D: [], M: [], L: [] };
const IDS = 'ABCDML';
// overlapping cuts: at scene time s the shot cuts and the scene rewinds d seconds, so the next shot replays the action
const CUTS = [];
function remap(v) { let off = 0, cutS = null; for (const c of CUTS) { if (v + off >= c.s) { off -= c.d; cutS = c.s; } else break; } const s = v + off; return { s, camT: cutS !== null && s < cutS + 0.002 ? cutS + 0.002 : s }; }
const s2v = s => s + CUTS.reduce((a, c) => a + (s >= c.s ? c.d : 0), 0);
const pan = (id, to, at, dur, ease = CAM_EASE) => { const L = KEYS[id]; const prev = L.length ? L[L.length - 1].to : INIT[id]; L.push({ t: at, d: dur, to: { ...prev, ...to }, ease }); };
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
    if (t < k.t + k.d) return interpCam(s0, k.to, gsap.parseEase(k.ease)((t - k.t) / k.d));
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
  M: 0, L: 0, mshot: 0, lscroll: 0,
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
function cardIn(el, at, n, st = 0.08) {
  const E = at + st * (n - 1) + 0.45 + 0.72 + 0.04 * n;              // ~0.9s fully readable
  tl.fromTo(el.children, { opacity: 0, y: 30, filter: 'blur(8px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.8, ease: 'power3.out', stagger: st }, at);
  return E;
}
// exits: 'push' = the camera flies through the line; 'fade' = words leave in place (used when the strip carries it off)
function cardOut(el, at, mode = 'push') {
  tl.set(el.children, { opacity: 0 }, at);
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
  const mb = (a, b) => MBW.push([a, b]);
  const dipIn = at => move(S, { black: 1 }, at, 0.18, 'power2.in');
  const dipOut = at => move(S, { black: 0 }, at, 0.45, 'expo.out');
  const last = id => { const L = KEYS[id]; return L.length ? L[L.length - 1] : { t: -1, d: 0, to: INIT[id] }; };
  // the strip: text and UI locked together on one leftward slide (0.9 s, weighty ease) — the cut you liked, used everywhere
  const STRIP = 0.9;
  const worldOut = (id, at) => { const k = last(id), c = { ...k.to, z: k.to.z * Math.exp(DRIFT * Math.max(0, at - k.t - k.d)) }; pan(id, cam(c.cx + SHIFT / (K * c.z), c.cy, c.z), at, STRIP); set(S, { [id]: 0 }, at + STRIP + 0.02); };
  const worldIn = (id, to, at) => { set(S, { [id]: 1 }, at); pan(id, offR(to), at - 0.02, 0.01, 'none'); pan(id, to, at, STRIP); };
  const textIn = (el, at) => { tl.set(el.children, { opacity: 1, y: 0, filter: 'blur(0px)' }, at); tl.fromTo(el, { x: SHIFT }, { x: 0, duration: STRIP, ease: CAM_EASE, immediateRender: false }, at); };
  const textHold = (el, a, b) => tl.fromTo(el, { x: 0 }, { x: -26, duration: b - a, ease: 'none', immediateRender: false }, a);   // the line keeps drifting while held
  const textOut = (el, at, x0 = -26) => { tl.fromTo(el, { x: x0 }, { x: x0 - SHIFT, duration: STRIP, ease: CAM_EASE, immediateRender: false }, at); cardOut(el, at + STRIP + 0.02); };
  const strip = at => mb(at, at + STRIP);
  const HOLD = 1.0;                                                        // text fully readable between the two slides
  // overlapping cut: hard cut to a closer framing that lands 4 % tight and settles, while the scene replays REP seconds
  const REP = 0.13;
  const ocut = (id, to, at) => { CUTS.push({ s: at, d: REP }); pan(id, { ...to, z: to.z * 1.045 }, at, 0.001, 'none'); pan(id, to, at + 0.001, 0.45, 'expo.out'); };

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

  // ===== 02 TAGLINE → strip → OVERVIEW =====
  const H = 2.96;
  dipOut(H + 0.02);
  cardIn($('h1'), H + 0.06, 4, 0.075);
  const SL = H + 1.5;
  worldIn('A', cam(720, 405, WIDE), SL); textOut($('h1'), SL, 0); strip(SL);

  // ===== 03 OVERVIEW: wide layout → overlap cut close → glide → pull back → press Savings =====
  const Dn = SL + STRIP;
  tl.fromTo(S, { bal: 0.82 }, { bal: 1, duration: 1.2, ease: 'power2.out' }, Dn - 0.25);
  curIn('A', 640, 360, Dn + 0.05); curGo(700, 300, Dn + 0.1, 0.5); hover('hovA1', Dn + 0.42);
  ocut('A', cam(545, 290, CLOSE), Dn + 0.6);
  unhover('hovA1', Dn + 1.15);
  pan('A', cam(1000, 290, CLOSE), Dn + 1.1, 1.4);                         // level glide at the same zoom → bentoUSD+
  curGo(1290, 300, Dn + 1.45, 0.6); hover('hovA2', Dn + 1.7); unhover('hovA2', Dn + 2.4);
  pan('A', cam(720, 405, WIDE), Dn + 2.45, 1.0);                          // pull back: the whole window
  curGo(CHIP[0], CHIP[1], Dn + 2.75, 0.6, 1);
  hover('chipHover', Dn + 3.25, 0.12);
  tap(S, 'chipPress', Dn + 3.45); click(Dn + 3.45);
  curOut(Dn + 3.6);

  // ===== 04 strip → "Save at 6% APY." → strip → SAVINGS =====
  const X0 = Dn + 3.7;
  worldOut('A', X0); textIn($('card0'), X0); strip(X0);
  const E0 = X0 + STRIP + HOLD; textHold($('card0'), X0 + STRIP, E0);
  worldIn('B', cam(720, 405, WIDE), E0); textOut($('card0'), E0); strip(E0);

  // ===== 05 SAVINGS: wide → chart hover → overlap cut close on the tooltip → glide to the form → deposit → settle =====
  const T = E0 + STRIP;
  tl.fromTo(S, { tot: 0.9 }, { tot: 1, duration: 1.1, ease: 'power2.out' }, E0 + 0.5);
  move(S, { lines: 1 }, E0 + 0.45, 1.3, 'power2.inOut');
  curIn('B', 420, 760, T + 0.05);
  curGo(MARKER[0], MARKER[1], T + 0.1, 0.8);
  move(S, { tip: 1 }, T + 0.95, 0.4, 'back.out(1.6)');
  ocut('B', cam(700, 520, CLOSE), T + 1.05);                              // the tooltip pop replays, closer
  pan('B', cam(1100, 515, CLOSE), T + 1.75, 1.0);                         // level glide to the deposit form
  curGo(FROM[0], FROM[1], T + 1.9, 0.7);
  click(T + 2.65); set(S, { caretAmt: 1 }, T + 2.65);
  move(S, { amtN: AMT.length }, T + 2.8, 0.3, 'none');
  curGo(DEP[0], DEP[1], T + 3.25, 0.5, 1);
  shine('shDep', T + 3.5, 0.5);
  hover('depHover', T + 3.65, 0.12);
  tap(S, 'depPress', T + 3.9); click(T + 3.9);
  set(S, { caretAmt: 0 }, T + 3.92);
  move(S, { depLoad: 1 }, T + 4.0, 0.15, 'none');
  move(S, { depDone: 1 }, T + 4.65, 0.25, 'power2.out');
  move(S, { upd: 1 }, T + 4.75, 0.7, 'power2.out');
  curGo(1250, 660, T + 4.75, 0.4); curOut(T + 5.2);
  pan('B', cam(860, 430, MED), T + 4.6, 0.95);                            // settle back: balances + total update

  // ===== 06 strip → "Every dollar, onchain." → strip → TRANSPARENCY =====
  const X1 = T + 5.8;
  worldOut('B', X1); textIn($('card1'), X1); strip(X1);
  const E1 = X1 + STRIP + HOLD; textHold($('card1'), X1 + STRIP, E1);
  worldIn('C', cam(720, 405, WIDE), E1); textOut($('card1'), E1); strip(E1);

  // ===== 07 TRANSPARENCY: wide → scroll + push onto the table → overlap cut close as the bars fill → follow them down =====
  const W = E1 + STRIP;
  tl.fromTo(S, { m: 0.6 }, { m: 1, duration: 1.0, ease: 'power2.out' }, E1 + 0.5);
  curIn('C', 980, 760, W + 0.05); curGo(900, 560, W + 0.1, 0.6);
  move(S, { scroll: 1 }, W + 0.2, 1.1, 'power2.inOut');
  pan('C', cam(836, 470, TABLE), W + 0.2, 1.1);
  tl.fromTo(['row0', 'row1', 'row2', 'row3'].map($), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out', stagger: 0.09 }, W + 0.6);
  [0, 1, 2, 3].forEach(i => move(S.bars, { [i]: 1 }, W + 1.45 + i * 0.17, 0.6, 'power2.out'));
  ocut('C', cam(1000, 480, CLOSE), W + 1.6);                              // the first bars replay, closer
  pan('C', cam(1000, 600, CLOSE), W + 2.25, 0.95);                        // follow the bars down at the same zoom
  curGo(1180, 545, W + 1.95, 0.6); hover('hovRow', W + 2.45); unhover('hovRow', W + 3.25);
  curOut(W + 3.3);

  // ===== 08 strip → "Earn points while you save." → strip → WASABI =====
  const X2 = W + 3.45;
  worldOut('C', X2); textIn($('card2'), X2); strip(X2);
  const E2 = X2 + STRIP + HOLD; textHold($('card2'), X2 + STRIP, E2);
  worldIn('D', cam(720, 405, WIDE), E2); textOut($('card2'), E2); strip(E2);

  // ===== 09 WASABI: wide → overlap cut close on the points → glide → pull back as the page scrolls → rows → wide =====
  const R = E2 + STRIP;
  tl.fromTo(S, { pts: 0.55 }, { pts: 1, duration: 1.4, ease: 'power2.out' }, E2 + 0.4);
  curIn('D', 560, 560, R + 0.05); curGo(440, 370, R + 0.1, 0.5); hover('hovD0', R + 0.4);
  ocut('D', cam(560, 380, CLOSE), R + 0.55);                              // the points count replays, closer
  unhover('hovD0', R + 1.15);
  pan('D', cam(900, 380, CLOSE), R + 1.1, 1.0);
  curGo(830, 370, R + 1.1, 0.5); hover('hovD1', R + 1.35); unhover('hovD1', R + 2.0);
  move(S, { wscroll: 1 }, R + 2.2, 1.2, 'power2.inOut');
  pan('D', cam(836, 470, TABLE), R + 2.2, 1.2);
  curGo(760, 600, R + 2.35, 0.6);
  curGo(760, WROW(1), R + 2.95, 0.4);
  set(S, { wr: 1 }, R + 3.2); hover('wrOn', R + 3.2);
  curGo(820, WROW(0), R + 3.65, 0.4); move(S, { wr: 0 }, R + 3.67, 0.35, 'power2.inOut');
  curGo(DEPROW[0], DEPROW[1], R + 4.1, 0.45, 1); hover('depRowOn', R + 4.45, 0.15);
  curOut(R + 4.85); unhover('wrOn', R + 4.85, 0.2); unhover('depRowOn', R + 4.85, 0.2);
  pan('D', cam(720, 405, WIDE), R + 4.75, 0.8);                           // back to the window — the montage matches this frame

  // ===== 10 MONTAGE: match cuts — same window, same camera push, the product changes underneath =====
  const M = R + 5.62, SHOT = 0.55;
  set(S, { D: 0, M: 1, mshot: 0 }, M);
  pan('M', cam(712, 400, 0.9), M, SHOT * 4 + 0.02, 'none');               // one continuous push across every cut
  [1, 2, 3].forEach(i => set(S, { mshot: i }, M + SHOT * i));

  // ===== 11 LANDING PAGE: cut in, then the page scrolls section by section into the footer logo =====
  const LP = M + SHOT * 4;
  set(S, { M: 0, L: 1, lscroll: 0 }, LP);
  pan('L', cam(706, 396, 0.94), LP, 0.95, 'none');                        // the push carries on through the hero
  const STOPS = [1050, 2330, 3720, 5842];
  let lt = LP + 0.95;
  STOPS.forEach((y, i) => { const d = i === 3 ? 0.9 : 0.72; move(S, { lscroll: y }, lt, d, 'power3.inOut'); mb(lt + 0.05, lt + d - 0.05); if (i === 3) pan('L', cam(420, 600, 1.5), lt, d); lt += d + (i === 3 ? 0.3 : 0.42); });
  const FLOGO = [107, 6316 - 5842];                                         // footer mark, in window coordinates once scrolled
  pan('L', cam(FLOGO[0], FLOGO[1], 9), lt, 0.55, CUT_EASE); mb(lt + 0.25, lt + 0.57);   // exit: zoom-through the footer mark
  dipIn(lt + 0.37);
  set(S, { L: 0 }, lt + 0.56);

  // ===== 12 OUTRO =====
  const O = lt + 0.56;
  set(S, { logoOn: 1, outro: 1, q: 1, mk: 0, glow: 1, gloss: -0.3, logoScale: 1, tag: 0 }, O);
  tl.set(LET, { opacity: 0, x: 5, filter: 'blur(1.6px)' }, O);
  dipOut(O + 0.02);
  move(S, { mk: 1 }, O + 0.04, 0.9, 'expo.out');
  tl.to(LET, { opacity: 1, x: 0, filter: 'blur(0px)', duration: 0.45, ease: 'power2.out', stagger: 0.05 }, O + 0.35);
  move(S, { tag: 1 }, O + 0.95, 0.6, 'expo.out');
  move(S, { logoScale: 1.05 }, O + 0.6, 2.35, 'sine.inOut');
  move(S, { gloss: 1.3 }, O + 1.6, 0.55, 'power1.inOut');
  move(S, { black: 1 }, O + 2.5, 0.45, 'sine.inOut');
  tl.set({}, {}, O + 2.95);

  CUTS.sort((a, b) => a.s - b.s);
  window.TIMES = { H, SL, Dn, X0, E0, T, X1, E1, W, X2, E2, R, M, LP, O };
  window.DURATION = +s2v(O + 2.95).toFixed(3);
  window.MB = MBW.map(([a, b]) => [s2v(a), s2v(b)]);
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
  const { s: t, camT } = remap(v);
  tl.time(t, false);
  for (const id of IDS) S.cams[id] = camAt(id, camT);
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
    [...document.querySelectorAll('.mshot')].forEach((im, i) => { im.style.opacity = i === S.mshot ? 1 : 0; });
    show($('mTvl'), S.mshot < 2);                                         // live TVL on Buy + Portfolio (the modals dim the bar)
    applyCam($('wM'), S.cams.M); $('wM').style.opacity = S.M;
  }
  show($('wL'), S.L > 0.001);
  if (S.L > 0.001) { $('land').style.transform = `translateY(${-S.lscroll}px)`; applyCam($('wL'), S.cams.L); $('wL').style.opacity = S.L; }
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
