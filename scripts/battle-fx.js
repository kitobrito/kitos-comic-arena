/* BattleFX: the battle animation engine for Comic Arena and Pokemon Arena.
 *
 * Architecture
 * ------------
 *   Data      assets/data/battle-fx-manifest.json    every effect as ONE sprite sheet + frame rects
 *                                                     (scripts/build-battle-fx.py)
 *             assets/data/battle-fx-characters.json  every character's and skill's animation profile
 *                                                     (scripts/build-battle-fx-characters.js)
 *   Assets    AssetCache: sheets are preloaded and decoded once (Image.decode), kept in an LRU of
 *             MAX_SHEETS so a long session doesn't pile up decoded bitmaps.
 *   Loop      Ticker: ONE requestAnimationFrame loop drives every sprite. A sprite's frame comes from
 *             elapsed time (frame = elapsed * fps), so pacing never drifts the way setInterval does,
 *             and the loop stops itself when nothing is playing.
 *   Sprites   pooled <div>s on one fixed layer; only transform/opacity/background-position change,
 *             so the browser composites them without relayout. At most MAX_SPRITES play at once.
 *   Cards     CardAnimator: a small state machine per battle card
 *               idle -> entry | windup | recoil | victory | defeat
 *               windup -> impact -> idle          (the attacker's lunge)
 *               recoil -> idle                    (the target's flinch)
 *               defeat is terminal until reset(); victory only from a living card.
 *             Every transition starts from the card's CURRENT pose (read from the running animation),
 *             so an interrupted move blends instead of snapping.
 *   Deaths    DEATHS: recipes that cut the victim's own portrait into tiles, strips or halves and
 *             animate them (burn to ash, vines, electrocution, lightsaber cuts in the wielder's colours,
 *             Lucille...). The killing skill's profile picks the recipe; the default rises and shatters.
 *
 * Events (called by scripts/script.js)
 *   BattleFX.preload(characterIds)          warm the sheets a match will use
 *   BattleFX.enter(cards)                   cards arrive at match start
 *   BattleFX.cast({ actor, targets, characterId, skillId, skipTravel })
 *   BattleFX.recoil(card, amount)           confirmed damage (amount < 0) or heal (> 0)
 *   BattleFX.status(card, harmful)          a buff or debuff lands
 *   BattleFX.death(card, { killerId, skillId })
 *   BattleFX.victory(cards) / BattleFX.defeat(cards)
 */
(function () {
    'use strict';

    const MANIFEST_URL = 'assets/data/battle-fx-manifest.json';
    const CHARACTERS_URL = 'assets/data/battle-fx-characters.json';
    const MAX_SPRITES = 32;
    const MAX_SHEETS = 64;
    const VERSION = 'battle-fx-v3';

    const settings = {
        casts: () => true,     // replaced by configure(): the "Skill animations" setting
        deaths: () => true,    // the "Death animations" setting
    };
    const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    // ---- Data ---------------------------------------------------------------------------------
    let dataPromise = null;
    let manifest = { effects: {} };
    let profiles = { characters: {} };
    let skillIndex = new Map(); // skillId -> profile, for forms whose skills live on another entry
    const loadData = () => {
        if (!dataPromise) {
            const get = (url) => fetch(`${url}?v=${VERSION}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
            dataPromise = Promise.all([get(MANIFEST_URL), get(CHARACTERS_URL)]).then(([m, c]) => {
                if (m?.effects) manifest = m;
                if (c?.characters) profiles = c;
                skillIndex = new Map();
                Object.values(profiles.characters).forEach((ch) => Object.entries(ch.skills || {}).forEach(([id, sp]) => {
                    if (!skillIndex.has(id)) skillIndex.set(id, sp);
                }));
                return { manifest, profiles };
            });
        }
        return dataPromise;
    };
    const characterProfile = (id) => profiles.characters[String(id || '').toLowerCase()] || null;
    const skillProfile = (characterId, skillId) =>
        characterProfile(characterId)?.skills?.[skillId] || (skillId ? skillIndex.get(skillId) : null) || null;

    // ---- Asset cache (LRU of decoded sheets) ----------------------------------------------------
    const sheets = new Map(); // key -> { img, ready: Promise, used }
    const sheetFor = (key) => {
        const effect = manifest.effects[key];
        if (!effect) return null;
        let entry = sheets.get(key);
        if (!entry) {
            const img = new Image();
            img.decoding = 'async';
            img.src = encodeURI(effect.src);
            const ready = (img.decode ? img.decode() : new Promise((ok) => { img.onload = ok; })).catch(() => {});
            entry = { img, ready, used: 0 };
            sheets.set(key, entry);
            if (sheets.size > MAX_SHEETS) {
                const oldest = [...sheets.entries()].sort((a, b) => a[1].used - b[1].used)[0];
                if (oldest && oldest[0] !== key) sheets.delete(oldest[0]);
            }
        }
        entry.used = performance.now();
        return entry;
    };
    const preloadKeys = (keys) => Promise.all([...new Set(keys.filter(Boolean))].map((k) => sheetFor(k)?.ready));

    // ---- Ticker: one requestAnimationFrame loop for everything --------------------------------
    const active = new Set(); // objects with tick(now) -> false when finished
    let rafId = 0;
    const loop = (now) => {
        for (const item of active) {
            let alive = false;
            try { alive = item.tick(now); } catch (e) { alive = false; }
            if (!alive) { active.delete(item); item.done?.(); }
        }
        rafId = active.size ? requestAnimationFrame(loop) : 0;
    };
    const schedule = (item) => {
        active.add(item);
        if (!rafId) rafId = requestAnimationFrame(loop);
    };

    // ---- Sprite layer and pool ----------------------------------------------------------------
    let layer = null;
    const pool = [];
    const ensureLayer = () => {
        if (layer && layer.isConnected) return layer;
        layer = document.createElement('div');
        layer.className = 'bfx-layer';
        layer.setAttribute('aria-hidden', 'true');
        document.body.appendChild(layer);
        return layer;
    };
    const takeNode = () => {
        const node = pool.pop() || document.createElement('div');
        node.className = 'bfx-sprite';
        node.style.cssText = '';
        ensureLayer().appendChild(node);
        return node;
    };
    const releaseNode = (node) => {
        node.remove();
        if (pool.length < MAX_SPRITES) pool.push(node);
    };
    let liveSprites = 0;
    const ease = {
        linear: (t) => t,
        outCubic: (t) => 1 - (1 - t) ** 3,
        inQuad: (t) => t * t,
        inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    };

    /** Play an effect sprite.
     *  at:   { x, y } viewport centre, or from/to for a projectile
     *  size: rendered height in px (keeps the frame's aspect ratio)
     *  loop: repeat frames until duration ends (projectiles)
     *  angle: degrees to rotate (directional effects point along their travel)
     *  Resolves when the sprite finishes. */
    const playSprite = ({ key, x, y, from, to, size = 120, duration, loop = false, angle = 0, easing = 'outCubic', blend }) => {
        const effect = manifest.effects[key];
        if (!effect || liveSprites >= MAX_SPRITES) return Promise.resolve();
        const sheet = sheetFor(key);
        const [fw, fh] = effect.frames[0].slice(2);
        const scale = size / fh;
        const w = fw * scale;
        const h = fh * scale;
        const clipMs = (effect.frames.length * 1000) / effect.fps;
        const total = duration || clipMs;
        const node = takeNode();
        liveSprites += 1;
        node.style.width = `${w}px`;
        node.style.height = `${h}px`;
        node.style.backgroundImage = `url("${sheet.img.src}")`;
        node.style.backgroundSize = `${effect.sheet[0] * scale}px ${effect.sheet[1] * scale}px`;
        if (blend) node.style.mixBlendMode = blend;
        const start = from || { x, y };
        const end = to || start;
        let lastFrame = -1;
        let t0 = 0;
        return new Promise((resolve) => {
            schedule({
                tick(now) {
                    if (!t0) t0 = now;
                    const elapsed = now - t0;
                    const frameCount = effect.frames.length;
                    let frame = Math.floor((elapsed * effect.fps) / 1000);
                    if (loop) frame %= frameCount;
                    if (frame >= frameCount) return false;
                    if (frame !== lastFrame) {
                        const [fx, fy] = effect.frames[frame];
                        node.style.backgroundPosition = `${-fx * scale}px ${-fy * scale}px`;
                        lastFrame = frame;
                    }
                    const p = Math.min(1, elapsed / total);
                    const k = (ease[easing] || ease.linear)(p);
                    const cx = start.x + (end.x - start.x) * k;
                    const cy = start.y + (end.y - start.y) * k;
                    node.style.transform = `translate3d(${cx - w / 2}px, ${cy - h / 2}px, 0) rotate(${angle}deg)`;
                    return elapsed < total;
                },
                done() { liveSprites -= 1; releaseNode(node); resolve(); },
            });
        });
    };

    // ---- Geometry helpers ----------------------------------------------------------------------
    const faceOf = (card) => card?.querySelector?.('.character-face') || card;
    const centreOf = (el) => {
        const r = el?.getBoundingClientRect?.();
        return r && r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, r } : null;
    };
    const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
    const rand = (a, b) => a + Math.random() * (b - a);

    // ---- Eye lasers ----------------------------------------------------------------------------
    // Where the eyes are on each laser-eyed portrait, measured pixel by pixel from the art (fractions
    // of the square portrait, pupil centres). Keyed by image file, so a different skin simply falls
    // back to the ordinary beam instead of firing from the wrong spot.
    const EYES = {
        'homelandernewfp.png': [[0.45, 0.176], [0.815, 0.264]],
        '12748c5b9bfa8e1ffbfe.jpg': [[0.354, 0.251], [0.783, 0.283]], // Superman
        'billybutchernewfp.png': [[0.626, 0.133], [0.911, 0.176]],
    };
    const LASER_HEX = { red: '#ff2a1a', yellow: '#ffd21a' };
    const eyePoints = (card) => {
        const face = faceOf(card);
        const src = String(face?.currentSrc || face?.src || '').split('?')[0];
        const eyes = EYES[decodeURIComponent(src.slice(src.lastIndexOf('/') + 1))];
        const box = face?.getBoundingClientRect?.();
        if (!eyes || !box || !box.width) return null;
        // The picture itself, inside the portrait's border.
        const bw = face.clientLeft || 0, bh = face.clientTop || 0;
        const r = { left: box.left + bw, right: box.right - bw, top: box.top + bh, width: face.clientWidth || box.width, height: face.clientHeight || box.height };
        const mirrored = Boolean(card.closest?.('.enemy-characters')); // the enemy side is drawn flipped
        return eyes.map(([fx, fy]) => ({ x: mirrored ? r.right - fx * r.width : r.left + fx * r.width, y: r.top + fy * r.height, size: r.width }));
    };
    const glowEyes = (points, colour, ms) => points.map((p) => {
        const g = document.createElement('div');
        g.className = 'bfx-eye-glow';
        g.style.cssText = `left:${p.x}px;top:${p.y}px;--c:${colour};--s:${Math.max(10, p.size * 0.16)}px;`;
        ensureLayer().appendChild(g);
        g.animate([{ transform: 'translate(-50%,-50%) scale(.2)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: 0.55 },
            { transform: 'translate(-50%,-50%) scale(1.25)', opacity: 1 }], { duration: ms, easing: 'ease-out', fill: 'forwards' });
        return g;
    });
    const beam = (from, to, colour, width, ms) => {
        const el = document.createElement('div');
        el.className = 'bfx-eye-beam';
        const len = Math.hypot(to.x - from.x, to.y - from.y);
        el.style.cssText = `left:${from.x}px;top:${from.y}px;width:${len}px;--c:${colour};--w:${width}px;transform:rotate(${Math.atan2(to.y - from.y, to.x - from.x)}rad) scaleX(0);`;
        ensureLayer().appendChild(el);
        const rot = `rotate(${Math.atan2(to.y - from.y, to.x - from.x)}rad)`;
        return el.animate([{ transform: `${rot} scaleX(0)`, opacity: 1 }, { transform: `${rot} scaleX(1)`, opacity: 1, offset: 0.25 },
            { transform: `${rot} scaleX(1)`, opacity: 1, offset: 0.8 }, { transform: `${rot} scaleX(1) scaleY(.2)`, opacity: 0 }],
        { duration: ms, easing: 'ease-out' }).finished.catch(() => {}).then(() => el.remove());
    };
    /** The eyes glow in the laser's colour, then a beam fires from each eye to every target.
     *  Returns false when this portrait has no measured eyes (the caller keeps its old beam). */
    const eyeLasers = async ({ actor, targets = [], colour = 'red', empowered = false }) => {
        const eyes = eyePoints(actor);
        if (!eyes) return false;
        const hex = LASER_HEX[colour] || colour;
        const glows = glowEyes(eyes, hex, empowered ? 520 : 420);
        await wait(empowered ? 480 : 380);
        const width = Math.max(2, eyes[0].size * (empowered ? 0.07 : 0.045));
        await Promise.all(targets.filter(Boolean).flatMap((t) => {
            const c = centreOf(faceOf(t));
            if (!c) return [];
            playSprite({ key: 'impacts/directional_impact_002', x: c.x, y: c.y, size: c.h * 0.9 });
            // The two beams land a little apart, like two eyes would.
            return eyes.map((e, i) => beam(e, { x: c.x + (i ? 1 : -1) * c.w * 0.08, y: c.y }, hex, width, empowered ? 900 : 700));
        }));
        glows.forEach((g) => g.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' }).finished.catch(() => {}).then(() => g.remove()));
        return true;
    };

    // ---- Card state machine --------------------------------------------------------------------
    const STATES = {
        idle: { priority: 0 },
        entry: { priority: 1 },
        windup: { priority: 2 },
        impact: { priority: 2 },
        recoil: { priority: 3 },
        victory: { priority: 4 },
        defeat: { priority: 5 },
    };
    // Which states each state may move to.
    const TRANSITIONS = {
        idle: ['entry', 'windup', 'recoil', 'victory', 'defeat'],
        entry: ['idle', 'windup', 'recoil', 'defeat'],
        windup: ['impact', 'recoil', 'defeat', 'idle'],
        impact: ['idle', 'recoil', 'defeat', 'windup'],
        recoil: ['idle', 'recoil', 'windup', 'defeat'],
        victory: ['idle'],
        defeat: [],
    };
    // Keyframes per state, written relative to the resting pose. "dir" (+1/-1) points from the
    // card towards its opponent so a lunge goes the right way for either team.
    const MOTIONS = {
        entry: (o) => ({ frames: [
            { transform: `translateY(${o.dir * -28}px) scale(0.86)`, opacity: 0 },
            { transform: 'translateY(0) scale(1.04)', opacity: 1, offset: 0.7 },
            { transform: 'none', opacity: 1 },
        ], duration: 520, easing: 'cubic-bezier(.2,.9,.3,1.2)' }),
        windup: (o) => ({ frames: [
            { transform: 'none' },
            { transform: `translateY(${o.dir * 8}px) scale(0.95)`, filter: 'brightness(1.15)' },
        ], duration: o.duration || 180, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'forwards' }),
        impact: (o) => ({ frames: [
            { transform: `translateY(${o.dir * 8}px) scale(0.95)`, filter: 'brightness(1.15)' },
            { transform: `translateY(${o.dir * -(o.melee ? 26 : 10)}px) scale(1.06)`, filter: 'brightness(1.25)', offset: 0.35 },
            { transform: 'none', filter: 'none' },
        ], duration: o.melee ? 420 : 320, easing: 'cubic-bezier(.2,.8,.2,1)' }),
        recoil: (o) => {
            const s = Math.min(1, 0.35 + Math.abs(o.amount || 0) / 40); // bigger hits shake harder
            return o.heal ? { frames: [
                { transform: 'none', filter: 'none' },
                { transform: 'scale(1.05)', filter: 'brightness(1.3) saturate(1.2)', offset: 0.4 },
                { transform: 'none', filter: 'none' },
            ], duration: 420, easing: 'ease-out' } : { frames: [
                { transform: 'none', filter: 'none' },
                { transform: `translate(${-9 * s}px, ${o.dir * 6 * s}px) rotate(${-2.5 * s}deg)`, filter: 'brightness(1.8) saturate(.4)', offset: 0.12 },
                { transform: `translate(${7 * s}px, 0) rotate(${1.8 * s}deg)`, filter: 'brightness(1.1)', offset: 0.32 },
                { transform: `translate(${-4 * s}px, 0)`, offset: 0.55 },
                { transform: 'none', filter: 'none' },
            ], duration: 380 + 160 * s, easing: 'cubic-bezier(.3,.7,.4,1)' };
        },
        victory: () => ({ frames: [
            { transform: 'none' },
            { transform: 'translateY(-12px) scale(1.07)', offset: 0.35 },
            { transform: 'translateY(0) scale(1)', offset: 0.6 },
            { transform: 'translateY(-5px) scale(1.03)', offset: 0.8 },
            { transform: 'none' },
        ], duration: 900, easing: 'ease-out' }),
        defeat: () => ({ frames: [
            { transform: 'none', filter: 'none' },
            { transform: 'translateY(6px) scale(.97)', filter: 'grayscale(.8) brightness(.75)' },
        ], duration: 700, easing: 'ease-in', fill: 'forwards' }),
    };

    class CardAnimator {
        constructor(card) {
            this.card = card;
            this.state = 'idle';
            this.anim = null;
        }
        get face() { return faceOf(this.card); }
        dir() {
            // Enemy cards sit across from ours: lunges point at the other side of the board.
            return this.card.closest?.('.enemy-characters, .opponent-characters, [data-side="enemy"]') ? 1 : -1;
        }
        can(next) {
            if (next === this.state && next === 'recoil') return true;
            return (TRANSITIONS[this.state] || []).includes(next);
        }
        /** Move to a state. Returns the running Animation (or null if the move isn't allowed). */
        go(next, opts = {}) {
            if (!this.can(next) || !this.face?.animate) return null;
            const face = this.face;
            // Blend from the current pose: freeze the running animation's transform as the start.
            const current = getComputedStyle(face).transform;
            const currentFilter = getComputedStyle(face).filter;
            if (this.anim) { this.anim.cancel(); this.anim = null; }
            const motion = MOTIONS[next]?.({ dir: this.dir(), ...opts });
            this.state = next;
            if (!motion) return null;
            if (reducedMotion() && next !== 'defeat') {
                if (next !== 'windup') this.settle();
                return null;
            }
            const frames = motion.frames.map((f, i) => (i === 0 && current && current !== 'none'
                ? { ...f, transform: current, filter: currentFilter && currentFilter !== 'none' ? currentFilter : f.filter } : f));
            const anim = face.animate(frames, { duration: motion.duration, easing: motion.easing, fill: motion.fill || 'none' });
            this.anim = anim;
            anim.onfinish = () => {
                if (this.anim !== anim) return;
                if (next === 'windup' || next === 'defeat') return; // these hold until the next state
                this.anim = null;
                this.state = 'idle';
            };
            return anim;
        }
        settle() { if (this.state !== 'defeat') this.state = 'idle'; }
        reset() { if (this.anim) this.anim.cancel(); this.anim = null; this.state = 'idle'; }
    }
    const animators = new WeakMap();
    const recentCasts = new Map();
    const animatorFor = (card) => {
        if (!card) return null;
        let a = animators.get(card);
        if (!a) { a = new CardAnimator(card); animators.set(card, a); }
        return a;
    };

    // ---- Death recipes -------------------------------------------------------------------------
    // Each recipe gets { stage, src, rect, ctx } where stage is a fixed overlay exactly over the
    // victim's portrait and src its image. It returns a Promise that resolves when it is done.
    const portraitSrc = (face) => face?.dataset?.aliveSrc || face?.currentSrc || face?.src || '';
    const makeStage = (rect) => {
        const stage = document.createElement('div');
        stage.className = 'bfx-death-stage';
        stage.style.left = `${rect.left}px`;
        stage.style.top = `${rect.top}px`;
        stage.style.width = `${rect.width}px`;
        stage.style.height = `${rect.height}px`;
        ensureLayer().appendChild(stage);
        return stage;
    };
    const piece = (stage, src, clip, extraStyle = '') => {
        const el = document.createElement('div');
        el.className = 'bfx-piece';
        el.style.cssText = `background-image:url("${src.replace(/"/g, '%22')}");${clip ? `clip-path:${clip};` : ''}${extraStyle}`;
        stage.appendChild(el);
        return el;
    };
    const whole = (stage, src) => piece(stage, src, null);
    const tiles = (stage, src, cols, rows) => {
        const out = [];
        for (let r = 0; r < rows; r += 1) {
            for (let c = 0; c < cols; c += 1) {
                const x0 = (c / cols) * 100; const x1 = ((c + 1) / cols) * 100;
                const y0 = (r / rows) * 100; const y1 = ((r + 1) / rows) * 100;
                const el = piece(stage, src, `polygon(${x0}% ${y0}%, ${x1}% ${y0}%, ${x1}% ${y1}%, ${x0}% ${y1}%)`);
                el.dataset.cx = String((x0 + x1) / 2 - 50);
                el.dataset.cy = String((y0 + y1) / 2 - 50);
                out.push(el);
            }
        }
        return out;
    };
    const anim = (el, frames, opts) => el.animate(frames, { fill: 'forwards', ...opts }).finished.catch(() => {});
    const overlayDiv = (stage, cls, style = '') => {
        const el = document.createElement('div');
        el.className = cls;
        el.style.cssText = style;
        stage.appendChild(el);
        return el;
    };
    const fx = (key, rect, scale = 1.3, extra = {}) =>
        playSprite({ key, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, size: rect.height * scale, ...extra });

    // Pieces flying apart from the centre and fading (the default finish and the end of many recipes).
    const burst = (pieces, rect, { force = 1, rise = 0, spin = 1, duration = 950, delayStep = 0 } = {}) =>
        Promise.all(pieces.map((el, i) => {
            const cx = Number(el.dataset.cx || rand(-50, 50));
            const cy = Number(el.dataset.cy || rand(-50, 50));
            const d = rect.width * 0.9 * force;
            return anim(el, [
                { transform: 'none', opacity: 1 },
                { transform: `translate(${(cx / 50) * d + rand(-12, 12)}px, ${(cy / 50) * d - rise + rand(-12, 12)}px) rotate(${rand(-200, 200) * spin}deg) scale(${rand(0.3, 0.7)})`, opacity: 0 },
            ], { duration: duration + rand(-120, 120), delay: i * delayStep, easing: 'cubic-bezier(.15,.7,.3,1)' });
        }));

    const lineAcross = (stage, angle, colour, { width = 6, glow = 18, offset = 0 } = {}) => {
        const blade = overlayDiv(stage, 'bfx-blade', `--blade:${colour};--blade-w:${width}px;--blade-glow:${glow}px;transform:translate(-50%,-50%) translateY(${offset}px) rotate(${angle}deg) scaleX(0);`);
        return blade;
    };
    // ---- Hand-drawn art (assets/images/battle-fx/art) ----------------------------------------
    const ART = 'assets/images/battle-fx/art/';
    const ART_FILES = ['lucille', 'saber-red', 'saber-blue', 'saber-green', 'saber-violet', 'saber-yellow', 'saber-hilt',
        'dragon-claw', 'vine', 'wave', 'jaws-top', 'jaws-bottom', 'bullet-holes', 'ash-sheet'];
    const artUrl = (name) => `${ART}${name}.webp?v=${VERSION}`;
    const artImages = new Map();
    const preloadArt = () => ART_FILES.forEach((name) => {
        if (artImages.has(name)) return;
        const img = new Image();
        img.decoding = 'async';
        img.src = artUrl(name);
        img.decode?.().catch(() => {});
        artImages.set(name, img);
    });
    const artDiv = (stage, name, css = '') => overlayDiv(stage, 'bfx-art', `background-image:url("${artUrl(name)}");${css}`);
    // Cells of the bullet-hole sheet (960 x 606): three holes on top, three crack patterns below
    // (the first crack is a spider web).
    const DECAL_SHEET = [960, 606];
    const HOLES = [[35, 25, 205, 192], [335, 16, 250, 238], [667, 6, 260, 261]];
    const CRACKS = [[6, 326, 313, 265], [320, 325, 297, 270], [644, 303, 309, 295]];
    const decal = (stage, cell, size, x, y, rot = 0) => {
        const [cx, cy, cw, ch] = cell;
        const k = size / Math.max(cw, ch);
        return artDiv(stage, 'bullet-holes', `background-size:${DECAL_SHEET[0] * k}px ${DECAL_SHEET[1] * k}px;background-position:${-cx * k}px ${-cy * k}px;width:${cw * k}px;height:${ch * k}px;left:${x}%;top:${y}%;transform:translate(-50%,-50%) rotate(${rot}deg);`);
    };
    const SABER_ART = new Set(['red', 'blue', 'green', 'violet', 'yellow']);
    // A lightsaber: the hilt, and its blade igniting out of it across the portrait.
    const saberStrike = async (stage, rect, colourName, angle, ms) => {
        const h = rect.width * 0.3;
        const wrap = overlayDiv(stage, 'bfx-saber', `width:${rect.width * 1.5}px;height:${h}px;transform:translate(-50%,-50%) rotate(${angle}deg);`);
        const blade = document.createElement('i');
        blade.className = 'bfx-art bfx-saber-blade';
        blade.style.backgroundImage = `url("${artUrl(`saber-${colourName}`)}")`;
        blade.style.setProperty('--glow', SABER[colourName] || '#fff');
        const hilt = document.createElement('i');
        hilt.className = 'bfx-art bfx-saber-hilt';
        hilt.style.cssText = `background-image:url("${artUrl('saber-hilt')}");height:${h * 0.42}px;width:${h * 0.42 * 5.85}px;`;
        wrap.append(hilt, blade);
        await anim(blade, [{ transform: 'scaleX(0)', opacity: 1 }, { transform: 'scaleX(1)', opacity: 1, offset: 0.45 }, { transform: 'scaleX(1)', opacity: 1, offset: 0.8 }, { transform: 'scaleX(1)', opacity: 0 }], { duration: ms, easing: 'ease-out' });
        await anim(wrap, [{ opacity: 1 }, { opacity: 0 }], { duration: 120 });
        wrap.remove();
    };

    const LASER = { red: '#ff2a1a', yellow: '#ffd21a' };
    const SABER = { red: '#ff2a2a', blue: '#2f8bff', green: '#33ff57', violet: '#b45bff', yellow: '#ffe14a', white: '#ffffff' };

    const DEATHS = {
        // Default: the portrait lifts, then explodes into pieces that fade away.
        async shatter({ stage, src, rect }) {
            const w = whole(stage, src);
            await anim(w, [{ transform: 'none' }, { transform: 'translateY(-16%) scale(1.06)', filter: 'brightness(1.25)' }], { duration: 380, easing: 'cubic-bezier(.2,.8,.3,1)' });
            // Cracks spread across it for a moment before it bursts.
            const crack = decal(stage, CRACKS[2], rect.width * 1.05, 50, 34, rand(-20, 20));
            await anim(crack, [{ transform: `${crack.style.transform} scale(.2)`, opacity: 0 }, { transform: `${crack.style.transform} scale(1)`, opacity: 1 }], { duration: 160, easing: 'ease-out' });
            await wait(90);
            w.remove(); crack.remove();
            const p = tiles(stage, src, 9, 9);
            p.forEach((el) => { el.style.transform = 'translateY(-16%) scale(1.06)'; });
            await burst(p, rect, { force: 1.1, rise: rect.height * 0.25 });
        },
        // Lightsabers: one glowing cut per blade colour (Grievous: four), then the pieces slide apart.
        async saber({ stage, src, rect, ctx }) {
            const colours = (ctx.sabers && ctx.sabers.length ? ctx.sabers : ['blue']).map((c) => SABER[c] || c);
            const base = whole(stage, src);
            const angles = colours.length === 1 ? [-28] : colours.map((_, i) => -60 + (120 / (colours.length - 1 || 1)) * i);
            const names = ctx.sabers && ctx.sabers.length ? ctx.sabers : ['blue'];
            for (let i = 0; i < colours.length; i += 1) {
                fx('impacts/directional_impact_002', rect, 0.9, { angle: angles[i] });
                if (SABER_ART.has(names[i])) { await saberStrike(stage, rect, names[i], angles[i], colours.length > 1 ? 320 : 460); continue; }
                const blade = lineAcross(stage, angles[i], colours[i], { width: 5, glow: 22 });
                await anim(blade, [{ transform: `translate(-50%,-50%) rotate(${angles[i]}deg) scaleX(0)`, opacity: 1 }, { transform: `translate(-50%,-50%) rotate(${angles[i]}deg) scaleX(1.4)`, opacity: 1, offset: 0.6 }, { transform: `translate(-50%,-50%) rotate(${angles[i]}deg) scaleX(1.4)`, opacity: 0 }], { duration: colours.length > 1 ? 260 : 380, easing: 'ease-out' });
                blade.remove();
            }
            base.remove();
            // Cut along the last blade: two halves (several strips for multi-blade kills).
            const strips = colours.length + 1;
            const pieces = [];
            for (let i = 0; i < strips; i += 1) {
                const a = (i / strips) * 140 - 20; const b = ((i + 1) / strips) * 140 - 20;
                const el = piece(stage, src, `polygon(${a}% -10%, ${b}% -10%, ${b - 40}% 110%, ${a - 40}% 110%)`);
                el.style.setProperty('--edge', colours[i % colours.length]);
                el.classList.add('bfx-hot-edge');
                pieces.push(el);
            }
            await Promise.all(pieces.map((el, i) => anim(el, [
                { transform: 'none', opacity: 1 },
                { transform: `translate(${(i - (strips - 1) / 2) * 22}px, ${rand(8, 26)}px) rotate(${(i - (strips - 1) / 2) * 7}deg)`, opacity: 1, offset: 0.45 },
                { transform: `translate(${(i - (strips - 1) / 2) * 40}px, ${rect.height * 0.6}px) rotate(${(i - (strips - 1) / 2) * 16}deg)`, opacity: 0 },
            ], { duration: 1100, easing: 'cubic-bezier(.4,0,.8,.6)' })));
        },
        // Fire: burns down to black from the bottom up, then the ash scatters (half blown by a gust).
        async burn({ stage, src, rect }) {
            const w = whole(stage, src);
            const flame = overlayDiv(stage, 'bfx-burn-front');
            fx('type/fire', { ...rect.toJSON?.() || rect, top: rect.top + rect.height * 0.35, left: rect.left, width: rect.width, height: rect.height }, 1.1);
            fx('explosions/epic_explosion_001', rect, 1.2);
            await Promise.all([
                anim(flame, [{ transform: 'translateY(100%)' }, { transform: 'translateY(-110%)' }], { duration: 900, easing: 'ease-in-out' }),
                anim(w, [{ filter: 'none' }, { filter: 'sepia(1) saturate(3) brightness(.9) contrast(1.3)', offset: 0.45 }, { filter: 'grayscale(1) brightness(.12) contrast(1.6)' }], { duration: 900 }),
            ]);
            flame.remove(); w.remove();
            const ash = tiles(stage, src, 14, 14);
            ash.forEach((el) => { el.style.filter = 'grayscale(1) brightness(.18) contrast(1.4)'; });
            // Ash and embers break apart and drift off with the gust (an 8-frame sheet).
            const flakes = artDiv(stage, 'ash-sheet', `left:-10%;top:10%;width:${rect.width * 1.2}px;height:${rect.width * 1.2 * 123 / 128}px;background-size:800% 100%;z-index:4;`);
            flakes.animate([{ backgroundPosition: '0% 0' }, { backgroundPosition: '114.3% 0' }], { duration: 1000, easing: 'steps(8, jump-none)', fill: 'forwards' });
            flakes.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${rect.width * 0.9}px, ${-rect.height * 0.35}px)`, opacity: 0 }], { duration: 1150, easing: 'ease-in', fill: 'forwards' });
            fx('smoke-bursts/directional_smoke_burst_001', rect, 1.1, { angle: 0 });
            await Promise.all(ash.map((el, i) => {
                const blown = i % 2 === 0; // half the ash goes with the gust
                return anim(el, [
                    { transform: 'none', opacity: 1 },
                    blown
                        ? { transform: `translate(${rect.width * rand(0.8, 1.7)}px, ${-rect.height * rand(0.1, 0.5)}px) rotate(${rand(90, 360)}deg) scale(.3)`, opacity: 0 }
                        : { transform: `translate(${rand(-10, 10)}px, ${rect.height * rand(0.25, 0.55)}px) scale(.5)`, opacity: 0 },
                ], { duration: rand(900, 1400), delay: blown ? rand(150, 450) : rand(0, 250), easing: blown ? 'cubic-bezier(.3,.1,.6,1)' : 'ease-in' });
            }));
        },
        // Grass: vines wrap the portrait, squeeze it three times, and it pops.
        async vines({ stage, src, rect }, colour = '#3fbf4a') {
            const w = whole(stage, src);
            let svg;
            if (colour === '#3fbf4a') {
                // Thorny vines grow across the portrait from both sides and wrap it.
                const lay = [[-24, 20, false], [16, 44, true], [-9, 66, false], [28, 86, true]];
                svg = document.createElement('div');
                lay.forEach(([rot, y, rtl], i) => {
                    const v = artDiv(stage, 'vine', `left:50%;top:${y}%;width:${rect.width * 1.7}px;height:${rect.width * 1.7 / 5.45}px;transform:translate(-50%,-50%) rotate(${rot}deg)${rtl ? ' scaleX(-1)' : ''};z-index:4;`);
                    svg.appendChild(v);
                    v.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 520, delay: i * 90, easing: 'ease-out', fill: 'both' });
                });
                stage.appendChild(svg);
                await wait(520 + lay.length * 90);
            } else {
                svg = vineSvg(stage, colour);
                // Webbed up (Spider-Man): a web spreads over it, then the strands wrap.
                const web = decal(stage, CRACKS[0], rect.width * 1.15, 50, 50, rand(-15, 15));
                web.style.filter = 'invert(1) drop-shadow(0 0 2px #000)';
                anim(web, [{ opacity: 0, transform: `${web.style.transform} scale(.3)` }, { opacity: 1, transform: `${web.style.transform} scale(1)` }], { duration: 300, easing: 'ease-out' });
                const paths = [...svg.querySelectorAll('path')];
                await Promise.all(paths.map((p, i) => anim(p, [{ strokeDashoffset: 400 }, { strokeDashoffset: 0 }], { duration: 520, delay: i * 70, easing: 'ease-out' })));
                svg.appendChild(web);
            }
            for (let i = 0; i < 3; i += 1) {
                await anim(stage, [{ transform: 'none' }, { transform: `scale(${0.9 - i * 0.04}, ${1.02 + i * 0.02})` }, { transform: `scale(${0.95 - i * 0.04}, 1)` }], { duration: 230, easing: 'ease-in-out', fill: 'forwards' });
            }
            w.remove(); svg.remove();
            stage.style.transform = '';
            fx(colour === '#ffffff' ? 'impacts/symmetrical_impact_004' : 'type/grass', rect, 1.4);
            await burst(tiles(stage, src, 10, 10), rect, { force: 1.3, duration: 800 });
        },
        // Electric: zapped, flickering, fried black and crisp, then fades.
        async electrocute({ stage, src, rect }, colour = 'type/electric') {
            const w = whole(stage, src);
            const bolts = [0, 140, 300, 470].map((d) => wait(d).then(() => fx(colour, rect, 1.25)));
            await anim(w, [
                { filter: 'none' }, { filter: 'brightness(2.4) saturate(0)', offset: 0.1 }, { filter: 'invert(1) brightness(1.4)', offset: 0.2 },
                { filter: 'brightness(2)', offset: 0.32 }, { filter: 'invert(1)', offset: 0.45 }, { filter: 'brightness(.6) contrast(1.6)', offset: 0.6 },
                { filter: 'grayscale(1) brightness(.08) contrast(2)' },
            ], { duration: 950 });
            await Promise.all(bolts);
            await anim(w, [{ transform: 'none', opacity: 1 }, { transform: 'scale(.93) rotate(-2deg)', opacity: 1, offset: 0.3 }, { transform: 'scale(.86) rotate(1deg)', opacity: 0 }], { duration: 650, easing: 'ease-in' });
        },
        // Dark Side lightning: the same fry, in violet.
        async 'force-lightning'(args) { return DEATHS.electrocute(args, 'lightning/lightning_strike_001'); },
        // Water: a wave sweeps across and washes the portrait away.
        async wave({ stage, src, rect }) {
            stage.style.overflow = 'hidden'; // the wave sweeps in from outside the portrait
            const w = whole(stage, src);
            // The wave rolls in from the left, crashes over the portrait and carries it off.
            const wh = rect.height * 1.25;
            const wave = artDiv(stage, 'wave', `left:0;bottom:-12%;width:${wh * 2.05}px;height:${wh}px;z-index:4;`);
            fx('type/water', rect, 1.3);
            await Promise.all([
                anim(wave, [{ transform: `translateX(${-wh * 2.05}px)` }, { transform: `translateX(${-wh * 0.9}px)`, offset: 0.45 }, { transform: `translateX(${rect.width}px)` }], { duration: 1050, easing: 'cubic-bezier(.4,.1,.5,1)' }),
                anim(w, [
                    { transform: 'none', opacity: 1, filter: 'none' },
                    { transform: 'translateX(4%) skewX(-4deg)', opacity: 1, filter: 'hue-rotate(160deg) saturate(.6) blur(1px)', offset: 0.45 },
                    { transform: 'translateX(70%) skewX(-18deg) scaleY(.9)', opacity: 0, filter: 'blur(5px)' },
                ], { duration: 1000, easing: 'ease-in' }),
            ]);
        },
        // Dragon: three green claw slashes, then diagonal strips fall away.
        async 'dragon-claw'({ stage, src, rect }, colour = '#36ff8a', count = 3) {
            const base = whole(stage, src);
            // The claw rakes from the top right to the bottom left (silver for Wolverine).
            const claw = artDiv(stage, 'dragon-claw', `left:50%;top:50%;width:${rect.width * 1.25}px;height:${rect.width * 1.25 * 815 / 795}px;transform:translate(-50%,-50%);z-index:4;${colour === '#36ff8a' ? '' : 'filter:grayscale(1) brightness(1.7) contrast(1.2) drop-shadow(0 0 4px #cfe6ff);'}`);
            claw.classList.add('bfx-claw');
            await anim(claw, [{ clipPath: 'inset(0 0 100% 100%)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 90 * count, easing: 'ease-out' });
            claw.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, delay: 200, fill: 'forwards' });
            base.remove();
            const strips = 6;
            const parts = [];
            for (let i = 0; i < strips; i += 1) {
                const a = (i / strips) * 200 - 50; const b = ((i + 1) / strips) * 200 - 50;
                parts.push(piece(stage, src, `polygon(${a}% 0%, ${b}% 0%, ${b - 100}% 100%, ${a - 100}% 100%)`));
            }
            await Promise.all(parts.map((el, i) => anim(el, [
                { transform: 'none', opacity: 1 },
                { transform: `translate(${rand(-6, 6)}px, ${rect.height * rand(0.7, 1.1)}px) rotate(${rand(-25, 25)}deg)`, opacity: 0 },
            ], { duration: 900, delay: i * 70, easing: 'cubic-bezier(.5,0,.9,.5)' })));
        },
        // Wolverine: three silver claws, strips fall.
        async 'claw-triple'(args) { return DEATHS['dragon-claw'](args, '#e8f2ff', 3); },
        // Rock: crushed flat.
        async crush({ stage, src, rect }) {
            const w = whole(stage, src);
            fx('type/rock', rect, 1.2, { y: rect.top });
            await anim(w, [{ transform: 'none' }, { transform: 'translateY(-6%)', offset: 0.3 }, { transform: 'translateY(46%) scale(1.35, .08)', filter: 'brightness(.7)' }], { duration: 520, easing: 'cubic-bezier(.6,0,.9,.4)' });
            fx('smoke-bursts/symmetrical_smoke_burst_001', { left: rect.left, top: rect.top + rect.height * 0.4, width: rect.width, height: rect.height }, 1.2);
            await anim(w, [{ opacity: 1 }, { opacity: 0 }], { duration: 650, delay: 250 });
        },
        // Ground: shaking, a fissure opens down the middle and the halves fall apart.
        async fissure({ stage, src, rect }) {
            const w = whole(stage, src);
            await anim(w, Array.from({ length: 10 }, (_, i) => ({ transform: `translate(${i % 2 ? 3 : -3}px, ${i % 3 ? 1 : -1}px)` })).concat({ transform: 'none' }), { duration: 520 });
            w.remove();
            const left = piece(stage, src, 'polygon(0 0, 52% 0, 46% 18%, 54% 36%, 45% 55%, 53% 74%, 47% 100%, 0 100%)');
            const right = piece(stage, src, 'polygon(52% 0, 100% 0, 100% 100%, 47% 100%, 53% 74%, 45% 55%, 54% 36%, 46% 18%)');
            fx('type/ground', rect, 1.3, { y: rect.top + rect.height * 0.8 });
            await Promise.all([
                anim(left, [{ transform: 'none', opacity: 1 }, { transform: `translate(${-rect.width * 0.35}px, ${rect.height * 0.5}px) rotate(-18deg)`, opacity: 0 }], { duration: 1000, easing: 'cubic-bezier(.5,0,.9,.6)' }),
                anim(right, [{ transform: 'none', opacity: 1 }, { transform: `translate(${rect.width * 0.35}px, ${rect.height * 0.5}px) rotate(18deg)`, opacity: 0 }], { duration: 1000, easing: 'cubic-bezier(.5,0,.9,.6)' }),
            ]);
        },
        // Ice: frosts over, then shatters into shards.
        async freeze({ stage, src, rect }) {
            const w = whole(stage, src);
            const frost = overlayDiv(stage, 'bfx-frost');
            fx('type/ice', rect, 1.3);
            await Promise.all([
                anim(w, [{ filter: 'none' }, { filter: 'saturate(.2) brightness(1.3) hue-rotate(170deg)' }], { duration: 650 }),
                anim(frost, [{ opacity: 0 }, { opacity: 0.85 }], { duration: 650 }),
            ]);
            await wait(180);
            w.remove(); frost.remove();
            const shards = tiles(stage, src, 7, 7);
            shards.forEach((el) => { el.style.filter = 'saturate(.2) brightness(1.3) hue-rotate(170deg)'; });
            await burst(shards, rect, { force: 0.9, spin: 0.6, duration: 800 });
        },
        // Poison / acid: tinted green, then melts down in drips.
        async dissolve({ stage, src, rect }) {
            fx('fantasy-spells/spell_poison_001', rect, 1.3);
            const cols = 12;
            const drips = [];
            for (let c = 0; c < cols; c += 1) {
                const a = (c / cols) * 100; const b = ((c + 1) / cols) * 100;
                const el = piece(stage, src, `polygon(${a}% 0, ${b}% 0, ${b}% 100%, ${a}% 100%)`);
                el.style.filter = 'hue-rotate(70deg) saturate(1.6)';
                drips.push(el);
            }
            await Promise.all(drips.map((el) => anim(el, [
                { transform: 'none', opacity: 1, filter: 'hue-rotate(70deg) saturate(1.6)' },
                { transform: `translateY(${rect.height * rand(0.5, 0.95)}px) scaleY(${rand(1.2, 1.8)})`, opacity: 0, filter: 'hue-rotate(90deg) saturate(2) blur(3px)' },
            ], { duration: rand(900, 1300), delay: rand(100, 450), easing: 'cubic-bezier(.6,0,.9,.6)' })));
        },
        // Psychic / arcane: twisted into a vortex and gone.
        async warp({ stage, src, rect }) {
            const w = whole(stage, src);
            fx('sci-fi/scifi_warp_003', rect, 1.4);
            await anim(w, [{ transform: 'none', filter: 'none', opacity: 1 }, { transform: 'rotate(200deg) scale(.6)', filter: 'hue-rotate(180deg) saturate(2)', opacity: 1, offset: 0.55 }, { transform: 'rotate(560deg) scale(0)', filter: 'hue-rotate(300deg) blur(4px)', opacity: 0 }], { duration: 1050, easing: 'cubic-bezier(.5,0,.75,0)' });
        },
        // Ghost: drained of colour, floats up as a spirit and fades.
        async haunt({ stage, src, rect }) {
            const w = whole(stage, src);
            fx('fantasy-spells/spell_death_001', rect, 1.3);
            await anim(w, [{ transform: 'none', filter: 'none', opacity: 1 }, { transform: 'translateY(-8%) scale(1.03)', filter: 'grayscale(1) brightness(1.3) hue-rotate(250deg)', opacity: 0.75, offset: 0.4 }, { transform: 'translateY(-55%) scale(1.15)', filter: 'grayscale(1) brightness(1.6) blur(6px)', opacity: 0 }], { duration: 1300, easing: 'ease-in' });
        },
        // Fighting: pummelled by a flurry of hits, then breaks apart.
        async pummel({ stage, src, rect }) {
            const w = whole(stage, src);
            for (let i = 0; i < 4; i += 1) {
                if (i) decal(stage, CRACKS[1], rect.width * (0.45 + i * 0.12), rand(30, 70), rand(30, 70), rand(0, 360));
                fx('type/fighting', { left: rect.left + rand(-0.2, 0.2) * rect.width, top: rect.top + rand(-0.2, 0.2) * rect.height, width: rect.width, height: rect.height }, 0.8);
                await anim(w, [{ transform: 'none' }, { transform: `translate(${rand(-10, 10)}px, ${rand(-8, 8)}px) rotate(${rand(-6, 6)}deg) scale(.96)` }, { transform: 'none' }], { duration: 140 });
            }
            w.remove();
            await burst(tiles(stage, src, 8, 8), rect, { force: 1.2, duration: 800 });
        },
        // Flying / sand / Force: blown away in a gust, piece by piece.
        async gust({ stage, src, rect }) {
            fx('smoke-bursts/directional_smoke_burst_001', rect, 1.3);
            const p = tiles(stage, src, 12, 12);
            await Promise.all(p.map((el) => {
                const cx = Number(el.dataset.cx);
                return anim(el, [{ transform: 'none', opacity: 1 }, { transform: `translate(${rect.width * rand(1, 1.8)}px, ${-rect.height * rand(0, 0.4)}px) rotate(${rand(60, 300)}deg) scale(.3)`, opacity: 0 }], { duration: rand(700, 1000), delay: (cx + 50) * 6 + rand(0, 120), easing: 'cubic-bezier(.4,0,.7,1)' });
            }));
        },
        // Bug: a swarm eats the portrait away piece by piece.
        async swarm({ stage, src, rect }) {
            const swarm = overlayDiv(stage, 'bfx-swarm');
            fx('type/bug', rect, 1.2);
            const p = tiles(stage, src, 10, 10);
            p.sort(() => Math.random() - 0.5);
            await Promise.all(p.map((el, i) => anim(el, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `scale(.2) rotate(${rand(-90, 90)}deg)` }], { duration: 260, delay: i * 11, easing: 'ease-in' })));
            await anim(swarm, [{ opacity: 1 }, { opacity: 0 }], { duration: 300 });
        },
        // Dark / shadow / fear: darkness closes in from the edges and swallows it.
        async shadow({ stage, src, rect }) {
            const w = whole(stage, src);
            const dark = overlayDiv(stage, 'bfx-shadow');
            fx('smoke-bursts/stylized_skull_smoke_burst_001', rect, 1.3);
            await Promise.all([
                anim(dark, [{ '--hole': '75%' }, { '--hole': '0%' }], { duration: 1000, easing: 'ease-in' }),
                anim(w, [{ filter: 'none', opacity: 1 }, { filter: 'brightness(.4) saturate(.3)', opacity: 1, offset: 0.7 }, { filter: 'brightness(0)', opacity: 0 }], { duration: 1200 }),
            ]);
        },
        // Steel / blades: one clean diagonal slash and the halves slide apart.
        async slice({ stage, src, rect }) {
            const base = whole(stage, src);
            const blade = lineAcross(stage, -35, '#ffffff', { width: 4, glow: 12 });
            fx('impacts/directional_impact_002', rect, 1, { angle: -35 });
            await anim(blade, [{ transform: 'translate(-50%,-50%) rotate(-35deg) scaleX(0)', opacity: 1 }, { transform: 'translate(-50%,-50%) rotate(-35deg) scaleX(1.5)', opacity: 0 }], { duration: 300, easing: 'ease-out' });
            base.remove(); blade.remove();
            const top = piece(stage, src, 'polygon(0 0, 100% 0, 100% 20%, 0 85%)');
            const bottom = piece(stage, src, 'polygon(0 85%, 100% 20%, 100% 100%, 0 100%)');
            await Promise.all([
                anim(top, [{ transform: 'none', opacity: 1 }, { transform: `translate(${-rect.width * 0.3}px, ${-rect.height * 0.1}px) rotate(-10deg)`, opacity: 0 }], { duration: 950, delay: 120, easing: 'cubic-bezier(.3,0,.7,1)' }),
                anim(bottom, [{ transform: 'none', opacity: 1 }, { transform: `translate(${rect.width * 0.2}px, ${rect.height * 0.5}px) rotate(8deg)`, opacity: 0 }], { duration: 950, delay: 120, easing: 'cubic-bezier(.5,0,.9,.6)' }),
            ]);
        },
        // Fairy / divine / hope / willpower: dissolves upward into sparkles.
        async sparkle({ stage, src, rect }) {
            fx('magic-bursts/round_sparkle_burst_001', rect, 1.4);
            const p = tiles(stage, src, 12, 12);
            await Promise.all(p.map((el) => anim(el, [{ transform: 'none', opacity: 1, filter: 'none' }, { transform: `translate(${rand(-20, 20)}px, ${-rect.height * rand(0.4, 0.9)}px) scale(.1)`, opacity: 0, filter: 'brightness(3)' }], { duration: rand(800, 1200), delay: (Number(el.dataset.cy) + 50) * -4 + 200 + rand(0, 150), easing: 'ease-out' })));
        },
        // Lasers: a burning beam cuts it in two across the middle.
        // The beam and the burnt edge take the shooter's colour (Butcher yellow, Homelander and Superman red).
        async laser({ stage, src, rect, ctx }) {
            const colour = LASER[ctx.laser] || LASER.red;
            // The killer's eyes light up and the beams come from them, when we know where they are.
            const base = whole(stage, src);
            if (ctx.fromCard) await eyeLasers({ actor: ctx.fromCard, targets: [ctx.card], colour: ctx.laser || 'red' });
            const beam = lineAcross(stage, 0, colour, { width: 8, glow: 26 });
            fx('explosions/stylized_explosion_001', rect, 1);
            await anim(beam, [{ transform: 'translate(-50%,-50%) rotate(0deg) scaleX(0)', opacity: 1 }, { transform: 'translate(-50%,-50%) rotate(0deg) scaleX(1.5)', opacity: 1, offset: 0.7 }, { transform: 'translate(-50%,-50%) rotate(0deg) scaleX(1.5)', opacity: 0 }], { duration: 600 });
            base.remove(); beam.remove();
            const top = piece(stage, src, 'polygon(0 0, 100% 0, 100% 50%, 0 50%)');
            const bottom = piece(stage, src, 'polygon(0 50%, 100% 50%, 100% 100%, 0 100%)');
            [top, bottom].forEach((el) => { el.classList.add('bfx-hot-edge'); el.style.setProperty('--edge', colour); });
            await Promise.all([
                anim(top, [{ transform: 'none', opacity: 1 }, { transform: `translate(${rect.width * 0.12}px, ${-rect.height * 0.05}px) rotate(6deg)`, opacity: 1, offset: 0.4 }, { transform: `translate(${rect.width * 0.2}px, ${rect.height * 0.4}px) rotate(14deg)`, opacity: 0 }], { duration: 1000 }),
                anim(bottom, [{ transform: 'none', opacity: 1 }, { transform: `translateY(${rect.height * 0.4}px)`, opacity: 0 }], { duration: 1000, easing: 'ease-in' }),
            ]);
        },
        // Gunfire: riddled with bullet holes, then breaks apart.
        async riddled({ stage, src, rect }) {
            const w = whole(stage, src);
            for (let i = 0; i < 6; i += 1) {
                const x = rand(15, 85); const y = rand(15, 85);
                decal(stage, HOLES[i % 3], rect.width * rand(0.22, 0.32), x, y, rand(0, 360)).classList.add('bfx-bullet-hole-art');
                playSprite({ key: 'impacts/directional_impact_004', x: rect.left + (rect.width * x) / 100, y: rect.top + (rect.height * y) / 100, size: rect.height * 0.5 });
                await anim(w, [{ transform: 'none' }, { transform: `translate(${rand(-5, 5)}px, ${rand(-4, 4)}px)` }, { transform: 'none' }], { duration: 90 });
            }
            await wait(150);
            stage.querySelectorAll('.bfx-bullet-hole-art').forEach((h) => h.remove());
            w.remove();
            await burst(tiles(stage, src, 8, 8), rect, { force: 1, duration: 850 });
        },
        // Explosives: blown to pieces.
        async boom({ stage, src, rect }) {
            fx('explosions/epic_explosion_002', rect, 1.8);
            await burst(tiles(stage, src, 9, 9), rect, { force: 1.8, spin: 1.5, duration: 900 });
        },
        // Symbiotes, Carnage, bloodthirsty walkers: jaws close over it.
        async devour({ stage, src, rect }) {
            const w = whole(stage, src);
            // The jaws snap shut over it.
            const jw = rect.width * 1.35;
            const top = artDiv(stage, 'jaws-top', `left:50%;top:0;width:${jw}px;height:${jw * 377 / 963}px;z-index:4;`);
            const bottom = artDiv(stage, 'jaws-bottom', `left:50%;bottom:0;width:${jw * 786 / 963}px;height:${jw * 305 / 963}px;z-index:4;`);
            await Promise.all([
                anim(top, [{ transform: 'translate(-50%,-115%)' }, { transform: 'translate(-50%,-10%)', offset: 0.55 }, { transform: 'translate(-50%,8%)' }], { duration: 440, easing: 'cubic-bezier(.6,0,1,.4)' }),
                anim(bottom, [{ transform: 'translate(-50%,115%)' }, { transform: 'translate(-50%,10%)', offset: 0.55 }, { transform: 'translate(-50%,-6%)' }], { duration: 440, easing: 'cubic-bezier(.6,0,1,.4)' }),
            ]);
            anim(stage, [{ transform: 'none' }, { transform: 'translate(2px,-1px)' }, { transform: 'translate(-2px,1px)' }, { transform: 'none' }], { duration: 180, fill: 'none' });
            w.remove();
            fx('splatters/burst_splatter_001', rect, 1.4);
            await Promise.all([top, bottom].map((el) => anim(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 700, delay: 250 })));
        },
        // Spider-Man: webbed up, squeezed and it pops.
        async cocoon(args) { return DEATHS.vines(args, '#ffffff'); },
        // Parasite: drained grey and shrivels to nothing.
        async drain({ stage, src, rect }) {
            const w = whole(stage, src);
            fx('fantasy-spells/spell_absorb_001', rect, 1.3);
            await anim(w, [{ transform: 'none', filter: 'none', opacity: 1 }, { transform: 'scale(.82)', filter: 'grayscale(1) brightness(.7)', opacity: 1, offset: 0.6 }, { transform: 'scale(.2)', filter: 'grayscale(1) brightness(.4)', opacity: 0 }], { duration: 1200, easing: 'ease-in' });
        },
        // Batman: smoke, and they're gone.
        async vanish({ stage, src, rect }) {
            const w = whole(stage, src);
            fx('smoke-bursts/symmetrical_smoke_burst_001', rect, 1.6);
            await anim(w, [{ opacity: 1, filter: 'none' }, { opacity: 0, filter: 'blur(6px) brightness(.5)' }], { duration: 700, delay: 200 });
        },
        // Negan: Lucille, the barbed-wire bat, beats the portrait into crushed pulp.
        async lucille({ stage, src, rect }) {
            const w = whole(stage, src);
            const bat = overlayDiv(stage, 'bfx-lucille');
            bat.style.backgroundImage = `url("${artUrl('lucille')}")`;
            const crumple = [
                'rotate(-6deg) scale(.94, .9)', 'rotate(5deg) scale(.86, .74) translateY(6%)', 'rotate(-3deg) scale(1.1, .32) translateY(42%)',
            ];
            const tints = ['brightness(.9) saturate(1.1)', 'brightness(.75) sepia(.4) saturate(1.6) hue-rotate(-20deg)', 'brightness(.55) sepia(.8) saturate(3) hue-rotate(-30deg)'];
            for (let i = 0; i < 3; i += 1) {
                await anim(bat, [{ transform: 'translate(70%, -70%) rotate(-70deg)', opacity: 1 }, { transform: 'translate(0%, 0%) rotate(25deg)', opacity: 1 }], { duration: i === 2 ? 220 : 190, easing: 'cubic-bezier(.7,0,1,.6)' });
                fx(i === 2 ? 'splatters/burst_splatter_001' : 'impacts/symmetrical_impact_003', rect, i === 2 ? 1.4 : 1);
                if (i > 0) fx('splatters/directional_splatter_001', rect, 0.9, { angle: rand(-40, 40) });
                await anim(w, [{ transform: i ? crumple[i - 1] : 'none', filter: i ? tints[i - 1] : 'none' }, { transform: crumple[i], filter: tints[i] }], { duration: 120, easing: 'ease-out' });
                if (i < 2) await anim(bat, [{ transform: 'translate(0%, 0%) rotate(25deg)' }, { transform: 'translate(70%, -70%) rotate(-70deg)' }], { duration: 180, easing: 'ease-out' });
            }
            await Promise.all([
                anim(bat, [{ opacity: 1 }, { opacity: 0, transform: 'translate(30%, -20%) rotate(40deg)' }], { duration: 400 }),
                anim(w, [{ opacity: 1 }, { opacity: 0, transform: `${crumple[2]} scaleX(1.15)` }], { duration: 800, delay: 300 }),
            ]);
        },
    };

    // The stamp each death animation slaps on the portrait.
    const STAMPS = {
        shatter: 'SHATTERED', saber: 'SABERED', burn: 'TOASTY', vines: 'STRANGLED', electrocute: 'FRIED',
        'force-lightning': 'UNLIMITED POWER', wave: 'WASHED AWAY', 'dragon-claw': 'CLAWED', 'claw-triple': 'EVISCERATED',
        crush: 'CRUSHED', fissure: 'SWALLOWED', freeze: 'FROZEN', dissolve: 'DISSOLVED', warp: 'WARPED', haunt: 'HAUNTED',
        pummel: 'PUMMELED', gust: 'BLOWN AWAY', swarm: 'SWARMED', shadow: 'ENGULFED', slice: 'SLICED', sparkle: 'PURIFIED',
        laser: 'LASERED', riddled: 'RIDDLED', boom: 'BOOM!', devour: 'DEVOURED', cocoon: 'WEBBED', drain: 'DRAINED',
        vanish: 'VANISHED', lucille: "LUCILLE'D",
    };

    const vineSvg = (stage, colour) => {
        const ns = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.setAttribute('preserveAspectRatio', 'none');
        svg.classList.add('bfx-vines');
        const d = [
            'M-5 90 C 20 70, 30 95, 50 75 S 80 60, 105 80',
            'M-5 60 C 25 40, 40 70, 60 45 S 90 30, 105 50',
            'M-5 30 C 20 15, 45 40, 65 18 S 95 10, 105 25',
            'M10 105 C 25 70, 5 50, 30 25 S 40 -5, 45 -5',
            'M90 105 C 75 75, 98 50, 70 28 S 60 -5, 55 -5',
        ];
        d.forEach((path) => {
            const p = document.createElementNS(ns, 'path');
            p.setAttribute('d', path);
            p.setAttribute('stroke', colour);
            p.setAttribute('pathLength', '400');
            p.style.strokeDasharray = '400';
            p.style.strokeDashoffset = '400';
            svg.appendChild(p);
        });
        stage.appendChild(svg);
        return svg;
    };

    const playDeath = async (card, ctx) => {
        ctx = { ...ctx, card };
        const face = faceOf(card);
        const rect = face?.getBoundingClientRect?.();
        const src = portraitSrc(face);
        if (!rect || !rect.width || !src) return;
        await loadData();
        const recipe = (reducedMotion() ? null : DEATHS[ctx.kill]) || DEATHS.shatter;
        const stage = makeStage(rect);
        // The enemy side of the board is mirrored (scaleX(-1)); mirror the stage the same way so the
        // portrait doesn't flip the moment it starts to die. (`scale`, not `transform`: recipes animate
        // the stage's transform.)
        if (card.closest?.('.enemy-characters')) stage.style.scale = '-1 1';
        face.classList.add('bfx-dying');
        if (ctx.label) {
            const stamp = document.createElement('div');
            stamp.className = 'bfx-kill-label';
            stamp.textContent = ctx.label;
            stamp.style.left = `${rect.left + rect.width / 2}px`;
            stamp.style.top = `${rect.top + rect.height / 2}px`;
            ensureLayer().appendChild(stamp);
            stamp.animate([
                { transform: 'translate(-50%,-50%) scale(2.2) rotate(-8deg)', opacity: 0 },
                { transform: 'translate(-50%,-50%) scale(1) rotate(-8deg)', opacity: 1, offset: 0.12 },
                { transform: 'translate(-50%,-50%) scale(1) rotate(-8deg)', opacity: 1, offset: 0.8 },
                { transform: 'translate(-50%,-60%) scale(.95) rotate(-8deg)', opacity: 0 },
            ], { duration: 2000, delay: 250, fill: 'both' }).finished.catch(() => {}).then(() => stamp.remove());
        }
        try {
            if (reducedMotion()) {
                await anim(whole(stage, src), [{ opacity: 1 }, { opacity: 0 }], { duration: 500 });
            } else {
                await recipe({ stage, src, rect, ctx });
            }
        } finally {
            stage.remove();
            face.classList.remove('bfx-dying');
            // The card's own dead portrait fades back in underneath.
            face.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 400 });
        }
    };

    // ---- Public API --------------------------------------------------------------------------
    const BattleFX = {
        version: VERSION,
        ready: () => loadData(),
        configure({ casts, deaths } = {}) {
            if (typeof casts === 'function') settings.casts = casts;
            if (typeof deaths === 'function') settings.deaths = deaths;
        },
        stampFor: (kill) => STAMPS[kill] || 'KO',
        profileFor: (characterId, skillId) => (skillId ? skillProfile(characterId, skillId) : characterProfile(characterId)),
        effectExists: (key) => Boolean(manifest.effects[key]),

        /** Warm every sheet the given characters can use, so the first cast doesn't hitch. */
        async preload(characterIds = []) {
            await loadData();
            const keys = [];
            characterIds.forEach((id) => {
                const c = characterProfile(id);
                if (!c) return;
                keys.push(c.entry, c.victory, c.defeat);
                Object.values(c.skills).forEach((s) => keys.push(s.windup, s.travel, s.impact));
            });
            keys.push('type/buffApply', 'type/debuffApply', 'fantasy-spells/spell_heal_001', 'impacts/directional_impact_002');
            preloadArt();
            return preloadKeys(keys);
        },

        /** Cards arrive at the start of a match (staggered). */
        async enter(cards = []) {
            if (!settings.casts()) return;
            await loadData();
            cards.filter(Boolean).forEach((card, i) => {
                setTimeout(() => {
                    animatorFor(card)?.go('entry');
                    const id = card.dataset.characterId;
                    const key = characterProfile(id)?.entry;
                    const c = centreOf(faceOf(card));
                    if (key && c) playSprite({ key, x: c.x, y: c.y, size: c.h * 1.1 });
                }, i * 110);
            });
        },

        /** A skill is cast: wind-up on the caster, then travel, then impact on every target.
         *  skipTravel: the skill draws its own bespoke cast effect (only the impact is added).
         *  Resolves when the last impact lands. */
        async cast({ actor, targets = [], characterId, skillId, skipTravel = false, key = '' } = {}) {
            if (!settings.casts()) return;
            await loadData();
            const profile = skillProfile(characterId, skillId);
            if (!profile || profile.delivery === 'passive') return;
            const actorAnim = animatorFor(actor);
            const from = centreOf(faceOf(actor));
            const melee = profile.delivery === 'melee';
            const windupMs = profile.windup ? 260 : 170;
            // One skill reported once per target: the caster winds up once; later targets only
            // get their own travel and impact (staggered by arrival order).
            const now = performance.now();
            const recent = key ? recentCasts.get(key) : null;
            const repeat = recent && now - recent.at < 900;
            if (key) {
                recentCasts.set(key, repeat ? { at: recent.at, n: recent.n + 1 } : { at: now, n: 0 });
                if (recentCasts.size > 40) recentCasts.delete(recentCasts.keys().next().value);
            }
            const order = repeat ? recentCasts.get(key).n : 0;
            if (repeat) {
                await wait(Math.max(0, windupMs - (now - recent.at)) + Math.min(order, 3) * 90);
            } else {
                actorAnim?.go('windup', { duration: windupMs });
                if (profile.windup && from) playSprite({ key: profile.windup, x: from.x, y: from.y, size: from.h * 1.15 });
                await wait(windupMs);
                actorAnim?.go('impact', { melee });
            }
            const hits = (targets.length ? targets : profile.delivery === 'self' ? [actor] : []).filter(Boolean);
            await Promise.all(hits.map(async (target, i) => {
                const to = centreOf(faceOf(target));
                if (!to) return;
                await wait(Math.min(i, 3) * 90);
                if (profile.travel && from && !skipTravel && target !== actor) {
                    const dx = to.x - from.x; const dy = to.y - from.y;
                    const flight = Math.min(620, Math.max(260, Math.hypot(dx, dy) * 0.9));
                    await playSprite({ key: profile.travel, from, to, size: from.h * 0.7, duration: flight, loop: true, easing: 'inQuad', angle: (Math.atan2(dy, dx) * 180) / Math.PI });
                } else if (melee) {
                    await wait(140);
                }
                if (profile.impact) playSprite({ key: profile.impact, x: to.x, y: to.y, size: to.h * (profile.delivery === 'area' ? 1.25 : 1.1) });
            }));
        },

        /** Confirmed damage or healing on a card. */
        recoil(card, amount = -1, { affliction = false } = {}) {
            if (!card || !amount) return;
            animatorFor(card)?.go('recoil', { amount, heal: amount > 0 });
            if (!settings.casts()) return;
            const c = centreOf(faceOf(card));
            if (!c) return;
            const key = amount > 0 ? 'fantasy-spells/spell_heal_001' : affliction ? 'type/poison' : 'impacts/directional_impact_002';
            loadData().then(() => playSprite({ key, x: c.x, y: c.y, size: c.h * 0.9 }));
        },

        /** A buff or debuff lands on a card. */
        status(card, harmful) {
            if (!card || !settings.casts()) return;
            const c = centreOf(faceOf(card));
            if (!c) return;
            loadData().then(() => playSprite({ key: harmful ? 'type/debuffApply' : 'type/buffApply', x: c.x, y: c.y, size: c.h }));
        },

        /** A character is knocked out. The killing skill's profile picks the death recipe:
         *  killer's skill -> killer's signature -> default shatter. Resolves when it finishes. */
        async death(card, { killerId, skillId, kill: forced, label, killerCard } = {}) {
            if (!card) return;
            animatorFor(card)?.go('defeat');
            if (!settings.deaths()) return;
            await loadData();
            const ctx = BattleFX.killFor(killerId, skillId);
            await playDeath(card, { ...ctx, kill: forced || ctx.kill, label, fromCard: killerCard });
        },

        /** Laser-eyed heroes: glowing eyes, then twin beams from the eyes (false if no eye data). */
        eyeLasers,
        hasEyes: (card) => Boolean(eyePoints(card)),

        /** Which death recipe a kill gets: the killing skill's, else the killer's signature, else shatter. */
        killFor(killerId, skillId) {
            const id = String(killerId || '').toLowerCase();
            const skill = skillProfile(id, skillId);
            const killer = characterProfile(id);
            return { kill: skill?.kill || killer?.kill || 'shatter', sabers: skill?.sabers || killer?.sabers, laser: killer?.laser };
        },

        /** Match over: the winners celebrate, the losers slump. */
        victory(cards = []) {
            cards.filter(Boolean).forEach((card, i) => setTimeout(() => {
                const a = animatorFor(card);
                if (a?.state === 'defeat') return;
                a?.go('victory');
                const c = centreOf(faceOf(card));
                if (c && settings.casts()) loadData().then(() => playSprite({ key: characterProfile(card.dataset.characterId)?.victory || 'magic-bursts/round_sparkle_burst_001', x: c.x, y: c.y, size: c.h * 1.2 }));
            }, i * 140));
        },
        defeat(cards = []) { cards.filter(Boolean).forEach((card) => animatorFor(card)?.go('defeat')); },

        /** Forget a card's state (a new match reuses the same card elements). */
        reset(cards = []) { cards.filter(Boolean).forEach((card) => animatorFor(card)?.reset()); },

        // For tests and the verification harness.
        _debug: {
            state: (card) => animatorFor(card)?.state,
            liveSprites: () => liveSprites,
            cachedSheets: () => sheets.size,
            looping: () => Boolean(rafId),
            deaths: () => Object.keys(DEATHS),
            playDeath: (card, kill, sabers) => playDeath(card, { kill, sabers }),
            playSprite,
            TRANSITIONS,
            MAX_SPRITES,
            MAX_SHEETS,
        },
    };

    window.BattleFX = BattleFX;
    loadData();
}());
