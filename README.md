# Bento — product demo video

Code-built motion-graphics demo of Bento (savings on bentoUSD / bentoUSD+), from the Bento Figma file.
HTML/CSS + GSAP (paused timeline), rendered frame by frame with Playwright, encoded with ffmpeg at 1920×1080, 60 fps.

| Version | Page | Notes |
|---|---|---|
| v1 | `index.html` / `scene.js` | First cut |
| v2 | `index2.html` / `scene2.js` | Single-piece logo, 1440×810 window on every screen, wide/medium framing, live micro-interactions, Wasabi Points replaces the referral flow (referral version kept as `*_referral.*`) |
| v3 | `index3.html` / `scene3.js` | Neutral product hovers, black dip instead of the green flash, motion-carrying transitions (slide, zoom-through, fly-in, vertical whip, rise, whip, glide), cinematic camera: 1.6 %/s drift, close-detail ↔ wide-reveal contrast, background parallax |

| v4 | `index4.html` / `scene4.js` | One transition language (locked horizontal strip slide for every text ↔ UI cut), wide-then-overlapping-cut punch-ins that replay the action, jitter-free text, match-cut montage (Buy · Portfolio · Leaderboard · Referees) and the landing page scroll into the outro |

Rendered videos are in `videos/`.

Re-render:

    npm install
    python3 -m http.server 8124 --bind 127.0.0.1 &
    PAGE=index4.html node render.js video Bento_Demo_v4.mp4 60 0 44.13

Stills: `PAGE=index3.html node render.js stills 5.6,12.4,21.6 out/`
Assets: `raw/` holds the 2.65× Figma renders; `tools/crops.py` cuts the layers into `assets/`.
