# YouTube intro

`Kito_YouTube_Intro.mp4` is a 10.5 s, 1080p/30fps channel intro set to "Everybody Hates Kito"
(song section 6.75 s to 17.25 s, with the logo landing on the drop at ~12.8 s).

To re-render it, for example with a different name or tagline, edit `TITLE` / `SUB` in `intro.html`, then run:

    node render.js full path/to/Everybody_Hates_Kito.mp3 Kito_YouTube_Intro.mp4

To grab still frames for preview: `node render.js preview 2.6 6.2 9.3` (writes them to `prev/`).
Needs Playwright (Chromium) and ffmpeg.
