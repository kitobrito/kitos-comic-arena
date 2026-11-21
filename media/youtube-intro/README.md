# YouTube intro

`Kito_YouTube_Intro.mp4` is a 51 s, 1080p/30fps channel intro set to "Everybody Hates Kito"
(song section 3.15 s to 54.2 s). Every scene is timed to the beat (99.4 BPM):

| Video time | Scene |
|---|---|
| 0-4.8 s | Ink brush strokes, flying shuriken, 忍 stamp |
| 4.8-7.2 s | "EVERYBODY / HATES / KITO" slams in, one word per beat |
| 7.2-9.7 s | Build-up: speed lines and a charging energy orb |
| 9.7 s | The drop: flash, shockwave, KITO logo, NARUTO-ARENA subtitle |
| 14.5-19.3 s | Word montage: STRATEGY, MIND GAMES, COMBOS, CLUTCH PLAYS |
| 19.3-24.1 s | "1 VS EVERYBODY" split screen |
| 24.1-33.8 s | Battle: health bars, damage numbers, comeback combo, K.O. |
| 33.8-38.6 s | Victory card: logo, subscribe button click and bell |
| 38.6-40.8 s | Card zooms away, second build-up |
| 40.8-46.5 s | "EVERYBODY / HATES / KITO" slammed in on the sung words (song 43.96 s, 44.68 s, 45.21 s) |
| 46.5-47.2 s | Red and orange ink wipe |
| 47.2-51 s | Second "EVERYBODY / HATES / KITO" on the repeat (song 50.36 s, 51.08 s, 51.61 s), with the crowd of haters rising, then fade out |

To re-render it, for example with a different name or tagline, edit `TITLE` / `SUB` in `intro.html`, then run:

    node render.js full path/to/Everybody_Hates_Kito.mp3 Kito_YouTube_Intro.mp4

To grab still frames for preview: `node render.js preview 2.6 6.2 9.3` (writes them to `prev/`).
Needs Playwright (Chromium) and ffmpeg.
