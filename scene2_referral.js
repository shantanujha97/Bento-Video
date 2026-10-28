// Bento product demo — v2.
// v1 notes addressed: logo arrives as one piece; camera shows the UI (wide 0.8 / medium 1.3 / close 1.7 max, mostly wide + medium);
// every screen is the same 1440x810 viewport (Transparency scrolls inside it); live-product micro-interactions:
// ticking TVL, a cursor that hovers between actions, card/row hover glows, chart hover tooltip, loading → done button states.
const K = 1920 / 1440;
const $ = id => document.getElementById(id);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, p) => a + (b - a) * p;
const fmt = (v, d = 2) => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const show = (el, on) => { el.style.display = on ? '' : 'none'; };
const cam = (cx, cy, z) => ({ cx, cy, z });

const CHIP = [476, 425], DEP = [1200, 737], INVITE = [1357, 322], MODAL_C = [720, 405], CREATE = [720, 560], COPY = [720, 538], SHARE = [720, 344], MARKER = [678, 560], FROM = [1100, 436];
const NAME = 'alex', AMT = '100';
const BARS = [34.99, 30.02, 24.99, 9.99];
const SCROLL = 230;                                    // Transparency scrolls the reserves table into the viewport

// ---- camera grammar (v2: shows the UI) ----
const WIDE = 0.8, MED = 1.3, CLOSE = 1.7;              // wide = whole app window; medium = a panel; close = rare, capped at 1.7x
const SHIFT = 2200;
gsap.registerPlugin(CustomEase); CustomEase.create('weighty', 'M0,0 C0.38,0 0.12,1 1,1');
const CAM_EASE = 'weighty', CUT_EASE = 'power3.in', LAND = 'expo.out', DRIFT = 0.006;
const INIT = { A: cam(560 - SHIFT / (K * MED), 330, MED), B: cam(720, 405, WIDE / 1.1), C: cam(720, 405, WIDE / 1.1), D: cam(720, 405, WIDE / 1.1) };
const KEYS = { A: [], B: [], C: [], D: [] };
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

const SH = ['shChip', 'shDep', 'shInv', 'shCreate'];
const S = {
  black: 1, flash: 0,
  logoOn: 1, outro: 0, q: 0, mk: 0, glow: 0, gloss: -0.3, logoScale: 1, tag: 0,
  A: 0, B: 0, C: 0, D: 0,
  bal: 0, chipHover: 0, chipPress: 0, hovA1: 0, hovA2: 0,
  tot: 0, lines: 0, tip: 0, amtN: 0, caretAmt: 0, depHover: 0, depPress: 0, depLoad: 0, depDone: 0, upd: 0,
  m: 0, scroll: 0, bars: { 0: 0, 1: 0, 2: 0, 3: 0 }, hovRow: 0,
  pts: 0, hovD1: 0, hovD2: 0, invHover: 0, invPress: 0, refbg: 0, modalE: 0, modalOp: 0, nameN: 0, caretName: 0, createPress: 0, crLoad: 0, morph: 0, copyPress: 0, copied: 0,
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
function cardIn(el, at, n, st = 0.08) { tl.fromTo(el.children, { opacity: 0, y: 34, filter: 'blur(8px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.85, ease: 'expo.out', stagger: st }, at); tl.fromTo(el, { scale: 1.05 }, { scale: 1, duration: 1.6, ease: 'expo.out' }, at); return at + st * (n - 1) + 0.45 + 0.72 + 0.04 * n; }
function cardOut(el, at) { tl.to(el.children, { opacity: 0, y: -14, filter: 'blur(8px)', duration: 0.42, ease: 'power2.in', stagger: 0.035 }, at); }
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
  // ===== 01 LOGO: the mark arrives as one piece, then the wordmark, then zoom-through =====
  move(S, { black: 0 }, 0, 0.5, 'sine.inOut');
  move(S, { mk: 1 }, 0.2, 1.0, 'expo.out');
  move(S, { glow: 1 }, 0.4, 0.8, 'sine.inOut');
  move(S, { gloss: 1.3 }, 1.0, 0.5, 'power1.inOut');
  move(S, { q: 1 }, 1.45, 0.48, 'power3.inOut');
  tl.fromTo(LET, { opacity: 0, x: 5, filter: 'blur(1.6px)' }, { opacity: 1, x: 0, filter: 'blur(0px)', duration: 0.45, ease: 'power2.out', stagger: 0.05 }, 1.6);
  move(S, { logoScale: 1.04 }, 1.95, 0.7, 'sine.inOut');
  move(S, { logoScale: 7 }, 2.65, 0.3, 'power3.in');
  move(S, { flash: 1 }, 2.72, 0.2, 'power1.in');
  set(S, { logoOn: 0 }, 2.95);

  // ===== 02 TAGLINE → slide hand-off to the Overview =====
  const H = 2.95;
  move(S, { flash: 0 }, H + 0.05, 0.55, 'expo.out');
  cardIn($('h1'), H + 0.11, 4, 0.075);
  const SL = H + 1.45;
  set(S, { A: 1 }, SL);
  tl.fromTo($('h1'), { x: 0 }, { x: -SHIFT, duration: 0.9, ease: CAM_EASE }, SL);
  pan('A', cam(560, 330, MED), SL, 0.9);                                 // ① medium on bentoUSD + feature cards (lands from the slide)
  tl.set($('h1').children, { opacity: 0 }, SL + 0.95);
  move(S, { bal: 1 }, SL + 0.5, 0.9, 'power2.out');

  // ===== 03 OVERVIEW =====
  const Dn = SL + 0.9;
  curIn('A', 640, 520, Dn + 0.1);
  curGo(700, 300, Dn + 0.15, 0.7); hover('hovA1', Dn + 0.4); unhover('hovA1', Dn + 0.95);
  pan('A', cam(880, 330, MED), Dn + 0.15, 1.3);                          // ② level glide right to bentoUSD+
  curGo(1290, 300, Dn + 0.85, 0.65); hover('hovA2', Dn + 1.05); unhover('hovA2', Dn + 1.85);
  pan('A', cam(720, 405, WIDE), Dn + 1.5, 0.95);                         // ③ pull back to the whole window
  curGo(CHIP[0], CHIP[1], Dn + 1.9, 0.7, 1);
  hover('chipHover', Dn + 2.5, 0.12);
  tap(S, 'chipPress', Dn + 2.75); click(Dn + 2.75);
  pan('A', cam(CHIP[0], CHIP[1], 7.5), Dn + 2.85, 0.65, CUT_EASE);      // exit: zoom-through "Savings"
  curOut(Dn + 2.85);
  move(S, { flash: 1 }, Dn + 3.25, 0.25, 'power1.in');
  set(S, { A: 0 }, Dn + 3.5);

  // ===== 04 TEXT =====
  const X0 = Dn + 3.51;
  move(S, { flash: 0 }, X0 + 0.05, 0.55, 'expo.out');
  const E0 = cardIn($('card0'), X0 + 0.11, 4); cardOut($('card0'), E0);

  // ===== 05 SAVINGS =====
  const T = E0 + 0.3;
  move(S, { B: 1 }, T, 0.3, 'sine.inOut');
  pan('B', cam(720, 405, WIDE), T, 0.75, LAND);                          // ① the whole window (lands with momentum)
  move(S, { tot: 1 }, T + 0.1, 1.0, 'power2.out');
  move(S, { lines: 1 }, T + 0.35, 1.25, 'power2.inOut');
  curIn('B', 420, 760, T + 0.55);
  curGo(MARKER[0], MARKER[1], T + 0.6, 0.9);                            // hover the chart → tooltip
  move(S, { tip: 1 }, T + 1.55, 0.4, 'back.out(1.6)');
  pan('B', cam(886, 500, MED), T + 2.05, 1.0);                           // ② push in on the chart + deposit panel
  curGo(FROM[0], FROM[1], T + 2.4, 0.7);
  click(T + 3.15); set(S, { caretAmt: 1 }, T + 3.15);
  move(S, { amtN: AMT.length }, T + 3.3, 0.3, 'none');
  curGo(DEP[0], DEP[1], T + 3.75, 0.5, 1);
  shine('shDep', T + 4.0, 0.5);
  hover('depHover', T + 4.15, 0.12);
  tap(S, 'depPress', T + 4.4); click(T + 4.4);
  set(S, { caretAmt: 0 }, T + 4.42);
  move(S, { depLoad: 1 }, T + 4.5, 0.15, 'none');                       // Deposit → spinner → ✓ Deposited, in place
  move(S, { depDone: 1 }, T + 5.15, 0.25, 'power2.out');
  move(S, { upd: 1 }, T + 5.15, 0.6, 'power2.out');
  move(S, { depLoad: 0 }, T + 5.95, 0.2, 'none'); move(S, { depDone: 0 }, T + 5.95, 0.2, 'none');
  curGo(1250, 660, T + 5.3, 0.4);
  curOut(T + 5.85);
  pan('B', cam(DEP[0], DEP[1], 7.5), T + 5.9, 0.55, CUT_EASE);         // exit: zoom-through Deposit
  move(S, { flash: 1 }, T + 6.2, 0.25, 'power1.in');
  set(S, { B: 0 }, T + 6.46);

  // ===== 06 TEXT =====
  const X1 = T + 6.47;
  move(S, { flash: 0 }, X1 + 0.05, 0.55, 'expo.out');
  const E1 = cardIn($('card1'), X1 + 0.11, 3); cardOut($('card1'), E1);

  // ===== 07 TRANSPARENCY (the page scrolls inside the window) =====
  const W = E1 + 0.3;
  move(S, { C: 1 }, W, 0.3, 'sine.inOut');
  pan('C', cam(720, 405, WIDE), W, 0.75, LAND);                          // ① the whole window
  move(S, { m: 1 }, W + 0.1, 1.0, 'power2.out');
  curIn('C', 980, 760, W + 0.45); curGo(900, 560, W + 0.5, 0.6);
  move(S, { scroll: 1 }, W + 1.0, 1.0, 'power2.inOut');                  // scroll the reserves into view
  tl.fromTo(['row0', 'row1', 'row2', 'row3'].map($), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out', stagger: 0.09 }, W + 1.4);
  [0, 1, 2, 3].forEach(i => move(S.bars, { [i]: 1 }, W + 2.0 + i * 0.13, 0.75, 'power2.out'));
  pan('C', cam(836, 470, 1.15), W + 2.15, 1.0);                          // ② push in on the whole reserves table
  curGo(1180, 545, W + 2.3, 0.6); hover('hovRow', W + 2.55); unhover('hovRow', W + 3.55);
  curOut(W + 3.55);
  pan('C', cam(1950, 470, 1.15), W + 3.75, 0.3, 'power2.in');             // exit: whip right
  set(S, { C: 0 }, W + 3.93);

  // ===== 08 TEXT (slides in on the whip) =====
  const X2 = W + 3.86;
  tl.fromTo($('card2'), { x: 1500 }, { x: 0, duration: 0.4, ease: 'power3.out' }, X2);
  const E2 = cardIn($('card2'), X2 + 0.08, 5, 0.07); cardOut($('card2'), E2);

  // ===== 09–10 WASABI POINTS → REFERRAL LINK =====
  const R = E2 + 0.3;
  move(S, { D: 1 }, R, 0.3, 'sine.inOut');
  pan('D', cam(720, 405, WIDE), R, 0.75, LAND);                          // ① the whole window
  move(S, { pts: 1 }, R + 0.1, 1.0, 'power2.out');
  curIn('D', 560, 620, R + 0.5); curGo(840, 400, R + 0.55, 0.6); hover('hovD1', R + 0.85); unhover('hovD1', R + 1.5);
  pan('D', cam(886, 405, MED), R + 1.0, 1.0);                            // ② push in on Leaderboard + Refer
  curGo(INVITE[0], INVITE[1], R + 1.3, 0.6, 1); hover('hovD2', R + 1.55);
  shine('shInv', R + 1.9, 0.35);
  hover('invHover', R + 2.05, 0.12);
  tap(S, 'invPress', R + 2.2); click(R + 2.2);
  unhover('hovD2', R + 2.25);
  move(S, { refbg: 1 }, R + 2.25, 0.32, 'sine.inOut');
  move(S, { modalOp: 1 }, R + 2.27, 0.14, 'none');
  move(S, { modalE: 1 }, R + 2.27, 0.62, 'expo.out');                   // modal grows out of Invite
  pan('D', cam(MODAL_C[0], 405, MED), R + 2.3, 0.8);                    // ③ level pan left onto the modal
  curGo(840, 452, R + 2.5, 0.6);
  click(R + 3.05); set(S, { caretName: 1 }, R + 3.05);
  move(S, { nameN: NAME.length }, R + 3.15, 0.4, 'none');
  curGo(CREATE[0], CREATE[1], R + 3.6, 0.45, 1);
  shine('shCreate', R + 3.7, 0.45);
  tap(S, 'createPress', R + 4.1); click(R + 4.1);
  set(S, { caretName: 0 }, R + 4.12);
  move(S, { crLoad: 1 }, R + 4.18, 0.12, 'none');                        // Create → spinner → morphs into Link Created
  move(S, { morph: 1 }, R + 4.6, 0.45, 'power2.inOut');
  curGo(COPY[0] + 20, COPY[1], R + 4.75, 0.3, 1);
  click(R + 5.15); tap(S, 'copyPress', R + 5.15);
  move(S, { copied: 1 }, R + 5.2, 0.4, 'expo.out');
  curOut(R + 5.45);
  pan('D', cam(SHARE[0], SHARE[1], 9), R + 5.55, 0.45, CUT_EASE);      // exit: zoom-through the share icon
  move(S, { flash: 1 }, R + 5.77, 0.22, 'power1.in');
  set(S, { D: 0 }, R + 6.0);

  // ===== 11 OUTRO: the mark arrives as one piece again, wordmark, line =====
  const O = R + 5.99;
  set(S, { logoOn: 1, outro: 1, q: 1, mk: 0, glow: 1, gloss: -0.3, logoScale: 1, tag: 0 }, O);
  tl.set(LET, { opacity: 0, x: 5, filter: 'blur(1.6px)' }, O);
  move(S, { flash: 0 }, O + 0.03, 0.5, 'expo.out');
  move(S, { mk: 1 }, O + 0.05, 0.9, 'expo.out');
  tl.to(LET, { opacity: 1, x: 0, filter: 'blur(0px)', duration: 0.45, ease: 'power2.out', stagger: 0.05 }, O + 0.35);
  move(S, { tag: 1 }, O + 0.95, 0.6, 'expo.out');
  move(S, { logoScale: 1.05 }, O + 0.6, 2.35, 'sine.inOut');
  move(S, { gloss: 1.3 }, O + 1.6, 0.55, 'power1.inOut');
  move(S, { black: 1 }, O + 2.5, 0.45, 'sine.inOut');
  tl.set({}, {}, O + 2.95);

  window.TIMES = { H, SL, Dn, X0, T, X1, W, X2, R, O };
  window.DURATION = +(O + 2.95).toFixed(2);
  window.MB = [[2.62, 3.05], [SL, SL + 0.9], [Dn + 3.1, Dn + 3.55], [T + 6.12, T + 6.5], [W + 3.7, W + 4.35], [R + 5.7, R + 6.05]];
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

function render(t) {
  tl.time(t, false);
  for (const id of 'ABCD') S.cams[id] = camAt(id, t);
  $('bg').style.transform = `translate(${-20 + 1.2 * t}px,${-8 + 0.5 * t}px) scale(1.04)`;
  $('flash').style.opacity = S.flash; $('black').style.opacity = S.black;
  document.querySelectorAll('.gw').forEach(g => { g.style.backgroundPosition = `${100 - (t * 40) % 100}% 0`; });
  const tvl = '$' + fmt(10482316.52 + 0.37 * t * 7);                   // TVL ticks up live in the top bar
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
    hovApply('hovD1', S.hovD1); hovApply('hovD2', S.hovD2);
    press($('invite'), S.invHover, S.invPress); $('shInv').style.transform = `scale(${1 - 0.035 * S.invPress})`;
    $('refbg').style.opacity = S.refbg;
    const md = $('modal'), mo = S.modalOp * (1 - S.morph); show(md, mo > 0.001);
    grow(md, INVITE, MODAL_C, S.modalE); md.style.opacity = mo;
    if (S.morph > 0) md.style.transform += ` scale(${1 - 0.05 * S.morph}) scaleY(${1 - 0.25 * S.morph})`;
    const nn = Math.floor(S.nameN + 1e-6), nm = NAME.slice(0, nn);
    $('dName').innerHTML = nn === 0 && S.caretName < 0.5 ? '' : caretHTML(nm, S.caretName > 0.5 && (S.nameN < NAME.length || blinkOn(t)), 16);
    $('createBtn').style.transform = `scale(${1 - 0.035 * S.createPress})`; $('shCreate').style.transform = `scale(${1 - 0.035 * S.createPress})`;
    $('crState').style.opacity = S.crLoad; $('crSpin').style.transform = `rotate(${(t * 420) % 360}deg)`;
    const lc = $('lc'); show(lc, S.morph > 0.001); lc.style.opacity = S.morph; lc.style.transform = `scale(${1.05 - 0.05 * S.morph}) scaleY(${1.2 - 0.2 * S.morph})`;
    const cb = S.copied; $('copied').style.opacity = clamp(cb * 4, 0, 1);
    $('copiedTxt').style.transform = `translateY(${(1 - cb) * 14}px)`; $('copiedTxt').style.opacity = cb;
    $('copied').parentElement.style.filter = '';
    applyCam($('wD'), S.cams.D); $('wD').style.opacity = S.D;
  }
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
