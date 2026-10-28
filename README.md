# Bento — product demo video

Code-built motion-graphics demo of Bento (savings on bentoUSD / bentoUSD+), from the Bento Figma file.
HTML/CSS + GSAP (paused timeline), rendered frame by frame with Playwright, encoded with ffmpeg at 1920×1080, 60 fps.

| Version | Page | Notes |
|---|---|---|
| v1 | `index.html` / `scene.js` | First cut |
| v2 | `index2.html` / `scene2.js` | Single-piece logo, 1440×810 window on every screen, wide/medium framing, live micro-interactions, Wasabi Points replaces the referral flow (referral version kept as `*_referral.*`) |
| v3 | `index3.html` / `scene3.js` | Neutral product hovers, black dip instead of the green flash, motion-carrying transitions (slide, zoom-through, fly-in, vertical whip, rise, whip, glide), cinematic camera: 1.6 %/s drift, close-detail ↔ wide-reveal contrast, background parallax |

| v4 | `index4.html` / `scene4.js` | One transition language (locked horizontal strip slide for every text ↔ UI cut), wide-then-overlapping-cut punch-ins that replay the action, jitter-free text, match-cut montage (Buy · Portfolio · Leaderboard · Referees) and the landing page scroll into the outro |
| v5 | `index5.html` / `scene5.js` | v3's varied transitions back, each carried by the camera motion around it; momentum punch-in cuts (camera runs on video time while the action replays); forced zooms capped at 1.3×; framed montage shots with a continuous rightward glide, plus mobile and the landing page |
| v6 | `index6.html` / `scene6.js` | Axial punch-in cuts (both shots zoom about the same point at the same screen position and rate), centred content-column close-ups at ~1.2×, one framing + one continuous push across the montage, landing stops after two sections and zooms through its logo into black (loops), no mobile, no glass plates, ~36 s (`scene6_long.js` is the 43 s version with the end card) |
| v7 | `index7.html` / `scene7.js` | One camera move at a time (single-axis pans or pure push/pull about a fixed point), punch-ins as one push across the cut, no pops inside replay windows, no motion blur across cuts, montage dissolves, landing hero as the last shot fading to black (loops), 34 s |
| v8 | `index8.html` / `scene8.js` | No punch-in cuts — continuous camera; every move is one kind only: push/pull about the frame centre or a pure horizontal/vertical pan (no diagonals), 34 s loop |
| v9 | `index9.html` / `scene9.js` | At most two camera moves per screen, never back-and-forth: each screen lands wide and makes one slow push until the window fills the frame (Overview adds one pan left onto the Savings chip); the montage and landing carry the same push on; 34 s loop |
| v10 | `index10.html` / `scene10.js` | A signature move per screen instead of dollies everywhere: Overview lands close and glides right into a whip, Savings flies in close and glides right to the form, Transparency one building push-through, Wasabi lands close and pulls back; 33.6 s loop |
| v11 | `index11.html` / `scene11.js` | From v9 with a creative-director pass: one idea per screen — Overview nearly locked wide (pan onto chip, push through), Savings as the hero (lands close on the complete chart, follows the cursor to the complete deposit form, whips down), Transparency one slow push, Wasabi a continuous lateral drift; quicker montage; direction carried across every edit; 33.8 s loop |
| v12 | `index12.html` / `scene12.js` | Re-blocked camera (close-ups frame whole components, moves follow the cursor), live chart tooltip that tracks the cursor along the real curves, 15-screen montage (3 even, then accelerating) incl. pre-deposit pages, de-duplicated data and token icons (`tools/dedupe.py`); 36.7 s loop |
| v13 | `index13.html` / `scene13.js` | v9 camera centred + v12 tooltip, data, montage (locked at full) |
| v14 | `index14.html` / `scene14.js` | Reveal blocking (close → travel → pull back) — not rendered |
| v15 | `index15.html` / `scene15.js` | Every screen centred with the whole window + background visible: land at 0.72, one gentle centred push to 0.86, no pans; montage + landing locked at 0.86; 37.1 s loop |
| v16 | `index16.html` / `scene16.js` | After the Commas reference: screens locked off, centred at 0.8 with background, no dolly; the camera only follows action (snaps in on the deposit form while typing, snaps back out); 37.1 s loop |

Rendered videos are in `videos/`.

Re-render:

    npm install
    python3 -m http.server 8124 --bind 127.0.0.1 &
    PAGE=index16.html node render.js video Bento_Demo_v16.mp4 60 0 37.09

Stills: `PAGE=index3.html node render.js stills 5.6,12.4,21.6 out/`
Assets: `raw/` holds the 2.65× Figma renders; `tools/crops.py` cuts the layers into `assets/`.
