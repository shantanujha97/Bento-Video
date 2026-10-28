// Bento product demo — v1. Same pipeline and rules as the Supanova demo (v10/v11):
// three shot sizes (close capped at 2.0x), log-space zoom, locked straight-line targets, one weighted ease,
// no overlapping moves, text cards that hold ~0.9 s, scenes that land with momentum, elements born from the UI.
const K = 1920 / 1440;
const $ = id => document.getElementById(id);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, p) => a + (b - a) * p;
const fmt = (v, d = 2) => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const show = (el, on) => { el.style.display = on ? '' : 'none'; };
const cam = (cx, cy, z) => ({ cx, cy, z });

// ---- world anchor points (Figma frame coordinates) ----
const CHIP = [476, 425], DEP = [1200, 737], INVITE = [1357, 322], MODAL_C = [720, 405], CREATE = [720, 560], SHARE = [720, 344];
const NAME = 'alex', AMT = '100';
const BARS = [34.99, 30.02, 24.99, 9.99];

// ---- camera grammar ----
const WIDE = 0.64, MED = 1.35, CLOSE = 2.0;           // three shot sizes; close-ups capped at 2.0x
const SHIFT = 2200;                                    // px the tagline slides out / Overview slides in
gsap.registerPlugin(CustomEase); CustomEase.create('weighty', 'M0,0 C0.38,0 0.12,1 1,1');
const CAM_EASE = 'weighty', CUT_EASE = 'power3.in', LAND = 'expo.out', DRIFT = 0.006;
const INIT = {
  A: cam(545 - SHIFT / (K * CLOSE), 255, CLOSE),     // Overview starts off to the right; slides in with the tagline
  B: cam(533, 527, MED / 1.12),                      // each later screen arrives slightly wide and pushes in (lands with momentum)
  C: cam(448, 375, CLOSE / 1.12),
  D: cam(448, 370, CLOSE / 1.12),
};
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

// ---- state ----
const SH = ['shChip', 'shDep', 'shInv', 'shCreate'];
const S = {
  black: 1, flash: 0,
  logoOn: 1, outro: 0, q: 0, t0: 0, t1: 0, t2: 0, glow: 0, gloss: -0.3, logoScale: 1, tag: 0,
  A: 0, B: 0, C: 0, D: 0,
  bal: 0, chipHover: 0, chipPress: 0,
  tot: 0, lines: 0, tip: 0, amtN: 0, caretAmt: 0, depHover: 0, depPress: 0, upd: 0,
  m: 0, bars: { 0: 0, 1: 0, 2: 0, 3: 0 },
  pts: 0, invHover: 0, invPress: 0, refbg: 0, modalE: 0, modalOp: 0, nameN: 0, caretName: 0, createPress: 0, morph: 0, copied: 0,
  cur: { w: 'A', x: 0, y: 0, op: 0, press: 0, hand: 0 },
  sh: Object.fromEntries(SH.map(k => [k, 0])),
  cams: { A: INIT.A, B: INIT.B, C: INIT.C, D: INIT.D },
};
let tl, TILES = [], GLOSS = [], LET = [];

// ---- static setup ----
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
  for (const t of LOGO.tiles) { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', t.d); p.setAttribute('fill', t.fill); gm.appendChild(p); TILES.push(p); }
  for (const t of LOGO.tiles) { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', t.d); p.setAttribute('fill', 'url(#gl)'); gm.appendChild(p); GLOSS.push(p); }
  for (const d of LOGO.letters) { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); p.setAttribute('fill', '#fff'); gl.appendChild(p); LET.push(p); }
}

// ---- timeline helpers ----
const move = (obj, to, at, dur, ease = 'power3.inOut') => tl.to(obj, { ...to, duration: dur, ease }, at);
const set = (obj, props, at) => tl.set(obj, props, at);
function cardIn(el, at, n, st = 0.08) { tl.fromTo(el.children, { opacity: 0, y: 34, filter: 'blur(8px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.85, ease: 'expo.out', stagger: st }, at); tl.fromTo(el, { scale: 1.05 }, { scale: 1, duration: 1.6, ease: 'expo.out' }, at); return at + st * (n - 1) + 0.45 + 0.72 + 0.04 * n; }
function cardOut(el, at) { tl.to(el.children, { opacity: 0, y: -14, filter: 'blur(8px)', duration: 0.42, ease: 'power2.in', stagger: 0.035 }, at); }
const shine = (k, at, dur = 0.5) => tl.fromTo(S.sh, { [k]: 0 }, { [k]: 1, duration: dur, ease: 'sine.inOut', immediateRender: false }, at);
const tap = (obj, k, at) => { move(obj, { [k]: 1 }, at, 0.07, 'power1.out'); move(obj, { [k]: 0 }, at + 0.07, 0.14, 'power1.in'); };
function cursorTo(w, from, to, at, dur) { set(S.cur, { w, x: from[0], y: from[1], op: 0, hand: 0 }, at); move(S.cur, { op: 1 }, at, 0.18, 'none'); move(S.cur, { x: to[0], y: to[1] }, at + 0.02, dur, 'power2.inOut'); move(S.cur, { hand: 1 }, at + dur * 0.78, 0.12, 'none'); }

function build() {
  tl = gsap.timeline({ paused: true });
  // ===== 01 LOGO 0–2.95: tiles fly in and snap into the mark, wordmark staggers in, zoom-through =====
  move(S, { black: 0 }, 0, 0.5, 'sine.inOut');
  move(S, { t0: 1 }, 0.18, 0.7, 'back.out(1.25)');
  move(S, { t1: 1 }, 0.32, 0.7, 'back.out(1.25)');
  move(S, { t2: 1 }, 0.46, 0.7, 'back.out(1.25)');
  move(S, { glow: 1 }, 0.6, 0.7, 'sine.inOut');
  move(S, { gloss: 1.3 }, 1.05, 0.5, 'power1.inOut');
  move(S, { q: 1 }, 1.45, 0.48, 'power3.inOut');
  tl.fromTo(LET, { opacity: 0, x: 5, filter: 'blur(1.6px)' }, { opacity: 1, x: 0, filter: 'blur(0px)', duration: 0.45, ease: 'power2.out', stagger: 0.05 }, 1.6);
  move(S, { logoScale: 1.04 }, 1.95, 0.7, 'sine.inOut');
  move(S, { logoScale: 7 }, 2.65, 0.3, 'power3.in');
  move(S, { flash: 1 }, 2.72, 0.2, 'power1.in');
  set(S, { logoOn: 0 }, 2.95);

  // ===== 02 TAGLINE out of the flash, then it slides out as the Overview slides in =====
  const H = 2.95;
  move(S, { flash: 0 }, H + 0.05, 0.55, 'expo.out');
  cardIn($('h1'), H + 0.11, 4, 0.075);
  const SL = H + 1.45;
  set(S, { A: 1 }, SL);
  tl.fromTo($('h1'), { x: 0 }, { x: -SHIFT, duration: 0.9, ease: CAM_EASE }, SL);
  pan('A', cam(545, 255, CLOSE), SL, 0.9);                              // ① close on bentoUSD (lands from the slide)
  tl.set($('h1').children, { opacity: 0 }, SL + 0.95);
  move(S, { bal: 1 }, SL + 0.5, 0.9, 'power2.out');

  // ===== 03 OVERVIEW =====
  const Dn = SL + 0.9;
  pan('A', cam(1127, 255, CLOSE), Dn + 0.15, 1.3);                      // ② level glide right to bentoUSD+
  pan('A', cam(720, 560, WIDE), Dn + 1.5, 0.95);                        // ③ pull back to the whole app
  cursorTo('A', [1150, 820], CHIP, Dn + 2.05, 0.6);
  shine('shChip', Dn + 2.45, 0.4);
  move(S, { chipHover: 1 }, Dn + 2.6, 0.12, 'none');
  tap(S, 'chipPress', Dn + 2.75); tap(S.cur, 'press', Dn + 2.75);
  pan('A', cam(CHIP[0], CHIP[1], 7.5), Dn + 2.85, 0.65, CUT_EASE);     // exit: zoom-through "Savings"
  move(S.cur, { op: 0 }, Dn + 2.85, 0.18, 'none');
  move(S, { flash: 1 }, Dn + 3.25, 0.25, 'power1.in');
  set(S, { A: 0 }, Dn + 3.5);

  // ===== 04 TEXT: Save at 6% APY. =====
  const X0 = Dn + 3.51;
  move(S, { flash: 0 }, X0 + 0.05, 0.55, 'expo.out');
  const E0 = cardIn($('card0'), X0 + 0.11, 4); cardOut($('card0'), E0);

  // ===== 05 SAVINGS =====
  const T = E0 + 0.3;
  move(S, { B: 1 }, T, 0.3, 'sine.inOut');
  pan('B', cam(533, 527, MED), T, 0.75, LAND);                          // ① medium on rate + chart (lands with momentum)
  move(S, { tot: 1 }, T + 0.1, 1.0, 'power2.out');
  move(S, { lines: 1 }, T + 0.45, 1.25, 'power2.inOut');
  move(S, { tip: 1 }, T + 1.65, 0.45, 'back.out(1.6)');
  pan('B', cam(907, 527, MED), T + 2.0, 1.1);                           // ② level pan right to the deposit panel
  set(S, { caretAmt: 1 }, T + 3.15);
  move(S, { amtN: AMT.length }, T + 3.22, 0.3, 'none');
  cursorTo('B', [1330, 900], DEP, T + 3.45, 0.55);
  shine('shDep', T + 3.7, 0.5);
  move(S, { depHover: 1 }, T + 3.98, 0.12, 'none');
  tap(S, 'depPress', T + 4.15); tap(S.cur, 'press', T + 4.15);
  set(S, { caretAmt: 0 }, T + 4.2);
  move(S, { upd: 1 }, T + 4.3, 0.6, 'power2.out');
  move(S.cur, { op: 0 }, T + 4.95, 0.18, 'none');
  pan('B', cam(DEP[0], DEP[1], 7.5), T + 5.0, 0.55, CUT_EASE);         // exit: zoom-through Deposit
  move(S, { flash: 1 }, T + 5.3, 0.25, 'power1.in');
  set(S, { B: 0 }, T + 5.56);

  // ===== 06 TEXT: Every dollar, onchain. =====
  const X1 = T + 5.57;
  move(S, { flash: 0 }, X1 + 0.05, 0.55, 'expo.out');
  const E1 = cardIn($('card1'), X1 + 0.11, 3); cardOut($('card1'), E1);

  // ===== 07 TRANSPARENCY =====
  const W = E1 + 0.3;
  move(S, { C: 1 }, W, 0.3, 'sine.inOut');
  pan('C', cam(448, 375, CLOSE), W, 0.75, LAND);                        // ① close on Bento Reserves
  move(S, { m: 1 }, W + 0.1, 1.0, 'power2.out');
  pan('C', cam(533, 760, MED), W + 1.15, 0.95);                         // ② pull back to the reserves table
  tl.fromTo(['row0', 'row1', 'row2', 'row3'].map($), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out', stagger: 0.09 }, W + 1.35);
  pan('C', cam(907, 760, MED), W + 2.25, 1.25);                         // ③ level pan right along the rows
  [0, 1, 2, 3].forEach(i => move(S.bars, { [i]: 1 }, W + 2.55 + i * 0.14, 0.75, 'power2.out'));
  pan('C', cam(1950, 760, MED), W + 3.65, 0.3, 'power2.in');            // exit: whip right
  set(S, { C: 0 }, W + 3.83);

  // ===== 08 TEXT: Earn points while you save. (slides in on the whip) =====
  const X2 = W + 3.76;
  tl.fromTo($('card2'), { x: 1500 }, { x: 0, duration: 0.4, ease: 'power3.out' }, X2);
  const E2 = cardIn($('card2'), X2 + 0.08, 5, 0.07); cardOut($('card2'), E2);

  // ===== 09–10 WASABI POINTS → REFERRAL LINK =====
  const R = E2 + 0.3;
  move(S, { D: 1 }, R, 0.3, 'sine.inOut');
  pan('D', cam(448, 370, CLOSE), R, 0.75, LAND);                        // ① close on Wasabi Points
  move(S, { pts: 1 }, R + 0.1, 1.0, 'power2.out');
  pan('D', cam(1080, 370, CLOSE), R + 1.0, 1.3);                        // ② level glide right to Refer to friends
  cursorTo('D', [1180, 560], INVITE, R + 1.85, 0.5);
  shine('shInv', R + 2.12, 0.35);
  move(S, { invHover: 1 }, R + 2.3, 0.12, 'none');
  tap(S, 'invPress', R + 2.45); tap(S.cur, 'press', R + 2.45);
  move(S.cur, { op: 0 }, R + 2.55, 0.18, 'none');
  move(S, { refbg: 1 }, R + 2.5, 0.32, 'sine.inOut');
  move(S, { modalOp: 1 }, R + 2.52, 0.14, 'none');
  move(S, { modalE: 1 }, R + 2.52, 0.62, 'expo.out');                  // modal grows out of Invite
  pan('D', cam(MODAL_C[0], 406, MED), R + 2.55, 0.8);                   // ③ pull back to the modal
  set(S, { caretName: 1 }, R + 3.3);
  move(S, { nameN: NAME.length }, R + 3.38, 0.4, 'none');
  cursorTo('D', [1000, 720], CREATE, R + 3.55, 0.5);
  shine('shCreate', R + 3.75, 0.45);
  tap(S, 'createPress', R + 4.08); tap(S.cur, 'press', R + 4.08);
  set(S, { caretName: 0 }, R + 4.1);
  move(S, { morph: 1 }, R + 4.2, 0.45, 'power2.inOut');                // modal morphs in place into Link Created
  move(S.cur, { op: 0 }, R + 4.25, 0.18, 'none');
  move(S, { copied: 1 }, R + 4.6, 0.4, 'expo.out');
  pan('D', cam(SHARE[0], SHARE[1], 9), R + 5.0, 0.45, CUT_EASE);       // exit: zoom-through the share icon
  move(S, { flash: 1 }, R + 5.22, 0.22, 'power1.in');
  set(S, { D: 0 }, R + 5.45);

  // ===== 11 OUTRO =====
  const O = R + 5.44;
  set(S, { logoOn: 1, outro: 1, q: 1, t0: 0, t1: 0, t2: 0, glow: 1, gloss: -0.3, logoScale: 1, tag: 0 }, O);
  tl.set(LET, { opacity: 0, x: 5, filter: 'blur(1.6px)' }, O);
  move(S, { flash: 0 }, O + 0.03, 0.5, 'expo.out');
  move(S, { t0: 1 }, O + 0.05, 0.6, 'back.out(1.25)');
  move(S, { t1: 1 }, O + 0.15, 0.6, 'back.out(1.25)');
  move(S, { t2: 1 }, O + 0.25, 0.6, 'back.out(1.25)');
  tl.to(LET, { opacity: 1, x: 0, filter: 'blur(0px)', duration: 0.45, ease: 'power2.out', stagger: 0.05 }, O + 0.45);
  move(S, { tag: 1 }, O + 1.0, 0.6, 'expo.out');
  move(S, { logoScale: 1.05 }, O + 0.6, 2.35, 'sine.inOut');
  move(S, { gloss: 1.3 }, O + 1.6, 0.55, 'power1.inOut');
  move(S, { black: 1 }, O + 2.5, 0.45, 'sine.inOut');
  tl.set({}, {}, O + 2.95);

  window.TIMES = { H, SL, Dn, X0, T, X1, W, X2, R, O };
  window.DURATION = +(O + 2.95).toFixed(2);
  window.MB = [[2.62, 3.05], [SL, SL + 0.9], [Dn + 3.1, Dn + 3.55], [T + 5.22, T + 5.6], [W + 3.6, W + 4.25], [R + 5.15, R + 5.5]];
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
const press = (el, hover, pr) => { el.style.filter = `brightness(${1 + 0.2 * hover})`; el.style.transform = `scale(${1 - 0.035 * pr})`; };

function applyLogo(t) {
  show($('logo'), S.logoOn > 0); show($('glow'), S.logoOn > 0); show($('tag'), S.logoOn > 0 && S.outro > 0);
  if (!S.logoOn) return;
  const L = 6.2, M = 9, LY = S.outro ? 505 : 540;
  const ox = 960 - 51.5 * L, oy = LY - 13 * L, lockC = [ox + 12.39 * L, oy + 12.66 * L];
  const q = S.q, s = lerp(M, L, q), cx = lerp(960, lockC[0], q), cy = lerp(LY, lockC[1], q);
  $('gMark').setAttribute('transform', `translate(${cx - 12.39 * s} ${cy - 12.66 * s}) scale(${s})`);
  $('gLetters').setAttribute('transform', `translate(${ox} ${oy}) scale(${L})`);
  const off = [[-46, 0], [0, -46], [0, 46]];
  [S.t0, S.t1, S.t2].forEach((p, i) => {
    const tr = `translate(${off[i][0] * (1 - p)} ${off[i][1] * (1 - p)})`, op = clamp(p * 3, 0, 1);
    TILES[i].setAttribute('transform', tr); TILES[i].style.opacity = op; GLOSS[i].setAttribute('transform', tr); GLOSS[i].style.opacity = op;
  });
  const g = S.gloss; $('g0').setAttribute('offset', clamp(g - 0.12, 0, 1)); $('g1').setAttribute('offset', clamp(g, 0, 1)); $('g2').setAttribute('offset', clamp(g + 0.12, 0, 1));
  Object.assign($('glow').style, { left: (cx - 500) + 'px', top: (cy - 500) + 'px', opacity: S.glow * (1 - 0.45 * q) });
  const sc = `scale(${S.logoScale})`, org = `${cx}px ${cy}px`;
  Object.assign($('logo').style, { transformOrigin: org, transform: sc }); Object.assign($('glow').style, { transform: sc });
  Object.assign($('tag').style, { top: '600px', opacity: S.tag, transform: `translateY(${(1 - S.tag) * 14}px)`, filter: `blur(${(1 - S.tag) * 6}px)` });
}

function render(t) {
  tl.time(t, false);
  for (const id of 'ABCD') S.cams[id] = camAt(id, t);
  $('bg').style.transform = `translate(${-20 + 1.2 * t}px,${-8 + 0.5 * t}px) scale(1.04)`;
  $('flash').style.opacity = S.flash; $('black').style.opacity = S.black;
  document.querySelectorAll('.gw').forEach(g => { g.style.backgroundPosition = `${100 - (t * 40) % 100}% 0`; });
  applyLogo(t); SH.forEach(shineApply);

  // A · Overview
  show($('wA'), S.A > 0.001);
  if (S.A > 0.001) {
    const b = S.bal;
    $('aBal1').textContent = fmt(1567.23 * b); $('aBal2').textContent = fmt(1567.23 * b);
    $('aCap1').textContent = '$' + fmt(6214880 * b, 0); $('aCap2').textContent = '$' + fmt(4267436 * b, 0);
    press($('chip'), S.chipHover, S.chipPress); $('shChip').style.transform = `scale(${1 - 0.035 * S.chipPress})`;
    applyCam($('wA'), S.cams.A); $('wA').style.opacity = S.A;
  }
  // B · Savings
  show($('wB'), S.B > 0.001);
  if (S.B > 0.001) {
    $('bTot').textContent = fmt(4183661 * S.tot + 100 * S.upd);
    $('lines').style.clipPath = `inset(0 ${(1 - S.lines) * 100}% 0 0)`;
    const tp = S.tip; Object.assign($('tip').style, { opacity: clamp(tp * 2, 0, 1), transform: `translateY(${(1 - tp) * 8}px) scale(${0.92 + 0.08 * tp})` }); show($('tip'), tp > 0.001);
    const n = Math.floor(S.amtN + 1e-6), a = AMT.slice(0, n), v = parseFloat(a) || 0;
    const on = S.caretAmt > 0.5 && (S.amtN < AMT.length || blinkOn(t));
    if (n === 0) { $('bAmt').innerHTML = caretHTML('<span style="opacity:.35">0</span>', S.caretAmt > 0.5 && blinkOn(t), 26); } else $('bAmt').innerHTML = caretHTML(a, on, 26);
    $('bUsd').textContent = '$' + fmt(v); $('bUsd2').textContent = '$' + fmt(v);
    $('bTo').innerHTML = v ? fmt(v / 1.02) : '<span style="opacity:.35">0</span>';
    $('bBal1').innerHTML = `Balance:&nbsp; ${fmt(134.34 - 100 * S.upd)}`; $('bBal2').innerHTML = `Balance:&nbsp; ${fmt(56.02 + 98.04 * S.upd)}`;
    press($('depBtn'), S.depHover, S.depPress); $('shDep').style.transform = `scale(${1 - 0.035 * S.depPress})`;
    applyCam($('wB'), S.cams.B); $('wB').style.opacity = S.B;
  }
  // C · Transparency
  show($('wC'), S.C > 0.001);
  if (S.C > 0.001) {
    $('cM').textContent = '$' + (10.48 * S.m).toFixed(2) + 'M';
    BARS.forEach((v, i) => { const p = S.bars[i]; $('bar' + i).style.clipPath = `inset(0 ${(1 - p) * 100}% 0 0)`; $('bar' + i).style.opacity = p > 0 ? 1 : 0; $('pct' + i).textContent = p > 0 ? (v * p).toFixed(2) + '%' : ''; $('pct' + i).style.opacity = Math.min(1, p * 4) * parseFloat($('row' + i).style.opacity || 0); });
    applyCam($('wC'), S.cams.C); $('wC').style.opacity = S.C;
  }
  // D · Wasabi Points + referral
  show($('wD'), S.D > 0.001);
  if (S.D > 0.001) {
    $('dPts').textContent = Math.round(10672 * S.pts).toLocaleString('en-US'); $('dPts24').textContent = Math.round(10 * S.pts);
    press($('invite'), S.invHover, S.invPress); $('shInv').style.transform = `scale(${1 - 0.035 * S.invPress})`;
    $('refbg').style.opacity = S.refbg;
    const md = $('modal'), mo = S.modalOp * (1 - S.morph); show(md, mo > 0.001);
    grow(md, INVITE, MODAL_C, S.modalE); md.style.opacity = mo;
    if (S.morph > 0) md.style.transform += ` scale(${1 - 0.05 * S.morph}) scaleY(${1 - 0.25 * S.morph})`;
    const nn = Math.floor(S.nameN + 1e-6), nm = NAME.slice(0, nn);
    $('dName').innerHTML = nn === 0 && S.caretName < 0.5 ? '' : caretHTML(nm, S.caretName > 0.5 && (S.nameN < NAME.length || blinkOn(t)), 16);
    $('createBtn').style.transform = `scale(${1 - 0.035 * S.createPress})`; $('shCreate').style.transform = `scale(${1 - 0.035 * S.createPress})`;
    const lc = $('lc'); show(lc, S.morph > 0.001); lc.style.opacity = S.morph; lc.style.transform = `scale(${1.05 - 0.05 * S.morph}) scaleY(${1.2 - 0.2 * S.morph})`;
    const cb = S.copied; $('copied').style.opacity = clamp(cb * 4, 0, 1);       // the button label changes in place: Copy link → ✓ Copied
    $('copiedTxt').style.transform = `translateY(${(1 - cb) * 14}px)`; $('copiedTxt').style.opacity = cb;
    applyCam($('wD'), S.cams.D); $('wD').style.opacity = S.D;
  }
  ['h1', 'card0', 'card1', 'card2'].forEach(id => { const el = $(id); show(el, [...el.children].some(s => parseFloat(s.style.opacity || 0) > 0.001)); });

  const cur = $('cursor'), cs = S.cur;
  if (cs.op > 0.001) {
    const [x, y] = w2s(S.cams[cs.w], cs.x, cs.y);
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
