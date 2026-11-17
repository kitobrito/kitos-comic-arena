/* Private presentation adapter. Production script.js owns all combat and targeting.
 *
 * Battle view
 *   Actors   every card becomes a figure standing on the battlefield floor. The render is trimmed
 *            to its visible pixels and sized from the character's real height (SIZES), scaled
 *            for depth, so Yoda stands knee-high to the Hulk and Pikachu is smaller than Charizard.
 *   Rig      card > .scene-rig (attacks, recoils, KOs) > .scene-body (idle breathing) > img.
 *            The invisible .character-face hitbox covers exactly the figure, so BattleFX sprites,
 *            damage numbers and target clicks all land on the character, not on an empty box.
 *   Motion   BattleFX.cast / recoil / death / status / enter / victory are wrapped: the original
 *            engine still plays its sprites, and the visible figure gets the matching motion
 *            (dash-in melee strikes with afterimages, ranged kick-back, hits that land on impact).
 */
(() => {
    'use strict';
    if (!window.ARENA_SCENE_PREVIEW) return;

    // Height of each figure in "adult human" units (1 = about 1.8 m), measured over what the
    // render actually shows. A waist-up render of a normal person is about 0.6.
    const COMIC_SIZES = {
        'andrea': 0.95, 'angstrom-levy': 1, 'aquaman': 1.18, 'atom-eve': 0.86, 'atrocitus': 0.78, 'batman': 0.82,
        'billy-butcher': 0.64, 'boba-fett': 1, 'captain-america': 1.03, 'carnage': 1.12, 'darth-maul': 0.92,
        'darth-sidious': 0.6, 'darth-vader': 0.74, 'deadpool': 1.02, 'doctor-doom': 1.06, 'doctor-fate': 1.08,
        'doctor-octopus': 1.38, 'doctor-strange': 0.62, 'general-grievous': 0.98, 'ghost-rider': 1.04,
        'grand-master-yoda': 0.42, 'green-lantern-hal-jordan': 1, 'hershel-greene': 0.44, 'homelander': 0.74,
        'indigo-1': 0.82, 'invincible': 0.98, 'iron-man': 1.02, 'john-stewart': 0.62, 'mysterio': 1.1, 'negan': 0.56,
        'obi-wan-kenobi': 0.56, 'omni-man': 1.08, 'parasite': 0.66, 'poison-ivy': 0.96, 'predalien': 1.12,
        'predator-stalker': 1.16, 'rage-infected': 0.5, 'rex-splode': 0.98, 'rick-grimes': 1, 'saint-walker': 0.66,
        'sandman': 1.18, 'scorpion': 0.92, 'sinestro': 1.08, 'sorrow': 1.06, 'spider-man': 0.62, 'storm': 1.04,
        'superman': 1.06, 'the-flash-barry-allen': 0.98, 'the-green-goblin': 1.06, 'the-hulk': 1.42, 'the-joker': 0.96,
        'venom': 1.24, 'walker': 0.62, 'wolverine': 0.84, 'wonder-woman': 1.02, 'xenomorph-drone': 1.32,
    };
    // Waist-up renders: the bottom edge is softened into the floor instead of a hard cut.
    const COMIC_CUT = new Set(['batman', 'billy-butcher', 'darth-sidious', 'darth-vader', 'hershel-greene', 'homelander',
        'john-stewart', 'negan', 'obi-wan-kenobi', 'parasite', 'rage-infected', 'walker', 'darth-maul']);
    const COMIC_FLYERS = new Set(['iron-man', 'superman', 'invincible', 'omni-man', 'green-lantern-hal-jordan', 'doctor-strange',
        'saint-walker', 'atom-eve', 'indigo-1', 'the-green-goblin', 'homelander', 'mysterio', 'doctor-fate', 'parasite']);
    // Real Pokédex heights in metres, keyed by the form's name without spaces or punctuation.
    const POKEMON_METRES = {
        bulbasaur: 0.7, ivysaur: 1, venusaur: 2, megavenusaur: 2.4, gigantamaxvenusaur: 4, charmander: 0.6, charmeleon: 1.1,
        charizard: 1.7, megacharizardx: 1.7, megacharizardy: 1.7, gigantamaxcharizard: 4, squirtle: 0.5, wartortle: 1,
        blastoise: 1.6, megablastoise: 1.6, gigantamaxblastoise: 4, pikachu: 0.4, raichu: 0.8, abra: 0.9, kadabra: 1.3,
        aerodactyl: 1.8, megaaerodactyl: 2.1, articuno: 1.7, beedrill: 1, megabeedrill: 1.4, butterfree: 1.1, chansey: 1.1,
        blissey: 1.5, chikorita: 0.9, bayleaf: 1.2, meganium: 1.8, clefairy: 0.6, clefable: 1.3, cyndaquil: 0.5, quilava: 0.9,
        typhlosion: 1.7, darkrai: 1.5, dragonite: 2.2, eevee: 0.3, flareon: 0.9, jolteon: 0.8, vaporeon: 1, ekans: 0.9,
        arbok: 1.9, gastly: 1.3, haunter: 1.6, hitmonchan: 1.4, hitmonlee: 1.5, jigglypuff: 0.5, wigglytuff: 1, koffing: 0.6,
        weezing: 1.2, krabby: 0.4, kingler: 1.3, machop: 0.8, machoke: 1.5, magikarp: 0.9, gyarados: 6.5, magnemite: 0.3,
        magneton: 1, marowak: 1, meowth: 0.4, persian: 1, mew: 0.4, mewtwo: 2, moltres: 2, mrmime: 1.3, onix: 8.8, pidgey: 0.3,
        pidgeotto: 1.1, pinsir: 1.5, megapinsir: 1.7, primeape: 1, annihilape: 1.2, scraggy: 0.6, scrafty: 1.1, scyther: 1.5,
        tauros: 1.4, totodile: 0.6, croconaw: 1.1, feraligatr: 2.3, zapdos: 1.6, zubat: 0.8, golbat: 1.6, crobat: 1.8,
        aegislash: 1.7, blaziken: 1.9, megablaziken: 1.9, ditto: 0.3, dragapult: 3, nincada: 0.5, ninjask: 0.8, shedinja: 0.8,
        drowzee: 1, hypno: 1.6, lance: 1.9, pokemontrainer: 1.7, trainer: 1.7,
    };
    const POKEMON_FLYERS = new Set(['gastly', 'haunter', 'koffing', 'weezing', 'magnemite', 'magneton', 'mew', 'mewtwo', 'zubat', 'golbat',
        'crobat', 'butterfree', 'beedrill', 'megabeedrill', 'pidgeotto', 'articuno', 'zapdos', 'moltres', 'aerodactyl', 'megaaerodactyl',
        'dragonite', 'charizard', 'megacharizardy', 'ninjask', 'shedinja', 'darkrai', 'dragapult', 'gyarados', 'abra', 'kadabra']);
    const norm = v => String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const lookup = (table, ...names) => {
        for (const raw of names) {
            const name = norm(raw); if (!name) continue;
            if (name in table) return table[name];
            // "Golden Onix", "Red Gyarados", "Shiny Ditto": the longest species name inside the form name.
            const key = Object.keys(table).filter(k => k.length > 3 && name.includes(k)).sort((a, b) => b.length - a.length)[0];
            if (key) return table[key];
        }
        return null;
    };

    const onReady = () => {
        const $ = (s, root = document) => root.querySelector(s);
        const $$ = (s, root = document) => [...root.querySelectorAll(s)];
        const params = new URLSearchParams(location.search);
        const arena = params.get('arena') === 'pokemon' ? 'pokemon' : 'comic';
        const isBattle = location.pathname.endsWith('ingame.html');
        const motionOK = () => !matchMedia('(prefers-reduced-motion: reduce)').matches;
        document.body.classList.add(isBattle ? 'scene-battle' : 'scene-selection');
        document.documentElement.classList.add(`scene-arena-${arena}`);
        const header = document.createElement('header'); header.className = 'scene-header';
        header.innerHTML = `<div><span class="scene-eyebrow">ADMIN LAB · BOT BATTLE</span><h1>${arena === 'pokemon' ? 'Pokémon' : 'Comic'} Arena <span>Living battlefield</span></h1></div><nav aria-label="Preview navigation"><a href="/arena-scene/?arena=comic" ${arena === 'comic' ? 'aria-current="page"' : ''}>Comic</a><a href="/arena-scene/?arena=pokemon" ${arena === 'pokemon' ? 'aria-current="page"' : ''}>Pokémon</a>${isBattle ? `<a href="/arena-scene/?arena=${arena}">Choose team</a>` : `<button type="button" class="scene-start">Fight the bot →</button>`}</nav>`;
        if (!isBattle) {
            document.body.prepend(header);
            const notice = document.createElement('p'); notice.className = 'scene-selection-notice';
            notice.textContent = 'Choose your usual team of three below. Same roster, skills and energy rules. This private test does not award rewards or affect your PvP team or record.';
            header.after(notice);
            const normalStart = $('.as-start');
            if (normalStart) normalStart.innerHTML = '<span>FIGHT<br>THE BOT</span>';
            const options = $('.as-options');
            if (options) options.innerHTML = '<h3 class="as-subheading">PRIVATE SPARRING</h3><p class="scene-private-copy">Full-body battlefield.<br>Your existing PvP rules.<br>No rewards or record changes.</p>';

            $('.scene-start').addEventListener('click', () => {
                const controller = window.ArenaSceneSelection;
                if (controller?.team().length !== 3) {
                    notice.textContent = 'Choose three different characters in the team slots below, then press Fight the bot.';
                    notice.classList.add('scene-notice-error'); return;
                }
                notice.classList.remove('scene-notice-error'); controller.start();
            });
            return;
        }

        // ---- Battlefield shell --------------------------------------------------------------------
        const stage = $('.ingame-stage'); if (!stage) return;
        const field = document.createElement('section'); field.className = 'scene-field'; field.setAttribute('aria-label', 'Battlefield');
        field.innerHTML = '<div class="scene-backdrop" aria-hidden="true"></div><div class="scene-floor" aria-hidden="true"></div>';
        const ribbon = document.createElement('div'); ribbon.className = 'scene-ribbon';
        ribbon.innerHTML = '<span class="scene-side-label">YOUR TEAM</span><div class="scene-hud"><p class="scene-turn" role="status">Preparing the battlefield…</p></div><span class="scene-side-label">SPARRING BOT</span>';
        field.append(ribbon);
        for (const s of ['.player-characters', '.enemy-characters']) { const team = $(s); if (team) field.append(team); }
        // Each of your fighters gets a skill bar on the battlefield, under its feet.
        const fieldbars = document.createElement('div'); fieldbars.className = 'scene-fieldbars'; fieldbars.setAttribute('aria-label', 'Skills on the battlefield');
        field.append(fieldbars);
        const footer = document.createElement('section'); footer.className = 'scene-commandbar';
        footer.innerHTML = '<div class="scene-plan-line"><p class="scene-hint" aria-live="polite">Pick a skill for each fighter, then tap its target.</p><p class="scene-queue" aria-live="polite"></p></div><div class="scene-roster" aria-label="Your fighters and their skills"></div><div class="scene-details"></div>';
        // Energy, timer and Ready live in the battlefield's top bar, always in view while planning.
        const hud = $('.game-hud');
        const ready = $('.ready-section');
        if (ready) {
            ready.tabIndex = 0; ready.setAttribute('role', 'button'); ready.setAttribute('aria-label', 'End your turn');
            ready.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ready.click(); } });
            // Only the Ready button (or the keyboard) ends the turn; tapping an energy count no longer does.
            ready.addEventListener('click', e => { if (e.target !== ready && !e.target.closest('.ready-text, .timer-track')) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
        }
        if (hud) ribbon.querySelector('.scene-hud').append(hud);
        const info = $('.skillinformation'); if (info) footer.querySelector('.scene-details').append(info);
        stage.prepend(header); stage.append(field, footer);
        const returnNote = document.createElement('p'); returnNote.className = 'scene-footnote'; returnNote.textContent = 'PRIVATE PREVIEW · Original battle engine · No rewards, rankings or mission progress'; stage.append(returnNote);
        const updateEffectClip = () => {
            const r = field.getBoundingClientRect();
            document.documentElement.style.setProperty('--scene-fx-clip', `inset(${Math.max(0, r.top)}px ${Math.max(0, innerWidth - r.right)}px ${Math.max(0, innerHeight - r.bottom)}px ${Math.max(0, r.left)}px)`);
        };
        window.addEventListener('scroll', updateEffectClip, { passive: true });
        window.addEventListener('resize', updateEffectClip, { passive: true });

        const teams = { player: $$('.player-characters .character-card'), opponent: $$('.enemy-characters .character-card') };
        const allCards = () => [...teams.player, ...teams.opponent];
        let selected = 0, state = null;
        const armed = { slot: -1, index: -1 }; // the skill waiting for a target
        const fire = el => el?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
        // One panel per fighter, all on screen. A panel folds into one button once its skill is queued.
        const panels = teams.player.map((card, slot) => {
            const panel = document.createElement('div'); panel.className = 'scene-fighter'; panel.dataset.slot = String(slot);
            panel.innerHTML = '<button type="button" class="scene-team-tab scene-fighter-head" aria-pressed="false"><img class="scene-fighter-face" alt=""><span class="scene-fighter-id"><span class="scene-fighter-name"></span><span class="scene-fighter-hp"><i></i></span></span><span class="scene-fighter-status"></span></button>'
                + '<div class="scene-fighter-skills"></div>'
                + '<button type="button" class="scene-fighter-queued"><img alt=""><span class="scene-queued-text"><b></b><span></span></span><span class="scene-queued-change">Change</span></button>';
            const head = $('.scene-fighter-head', panel);
            head.addEventListener('click', () => { selected = slot; card._showCharacterInfoFromPortrait?.(); syncControls(); });
            const pick = index => {
                selected = slot;
                const original = $$('.skillimage', card)[index];
                const wasArmed = armed.slot === slot && armed.index === index;
                armed.slot = wasArmed ? -1 : slot; armed.index = wasArmed ? -1 : index;
                fire(original);
                setTimeout(syncControls, 60);
            };
            // Tapping the folded skill takes it back and opens the bar again.
            const undo = () => {
                selected = slot;
                const queuedSkill = $$('.skillimage', card).find(img => img.classList.contains('selected-target'));
                fire(queuedSkill); setTimeout(syncControls, 60);
            };
            const skills = Array.from({ length: 4 }, (_, index) => {
                const button = document.createElement('button'); button.type = 'button'; button.className = 'scene-skill';
                button.innerHTML = '<img alt=""><span class="scene-skill-name"></span><span class="scene-skill-state"></span>';
                button.addEventListener('click', () => pick(index));
                $('.scene-fighter-skills', panel).append(button); return button;
            });
            $('.scene-fighter-queued', panel).addEventListener('click', undo);
            $('.scene-roster', footer).append(panel);
            const bar = document.createElement('div'); bar.className = 'scene-fieldbar'; bar.dataset.slot = String(slot);
            bar.innerHTML = '<div class="scene-fieldbar-skills"></div><button type="button" class="scene-fieldbar-queued"><img alt=""><span class="scene-fieldbar-target"></span><span class="scene-fieldbar-change" aria-hidden="true">↺</span></button>';
            // Bars sit over the field: keep their taps from reaching the cards underneath.
            bar.addEventListener('pointerdown', e => e.stopPropagation());
            const minis = Array.from({ length: 4 }, (_, index) => {
                const button = document.createElement('button'); button.type = 'button'; button.className = 'scene-skill scene-mini';
                button.innerHTML = '<img alt=""><span class="scene-mini-cd"></span>';
                button.addEventListener('click', () => pick(index));
                $('.scene-fieldbar-skills', bar).append(button); return button;
            });
            $('.scene-fieldbar-queued', bar).addEventListener('click', undo);
            fieldbars.append(bar);
            return { panel, head, skills, card, bar, minis };
        });
        const labels = panels.map(p => p.head);
        // Enemies get greyed, read-only bars: tap a skill to read it below, nothing is cast.
        const enemyBars = teams.opponent.map((card, slot) => {
            const bar = document.createElement('div'); bar.className = 'scene-fieldbar scene-enemybar'; bar.dataset.enemySlot = String(slot);
            bar.innerHTML = '<div class="scene-fieldbar-skills"></div>';
            bar.addEventListener('pointerdown', e => e.stopPropagation());
            fieldbars.append(bar);
            return { bar, card, signature: '' };
        });
        function readEnemySkill(entry, button, index) {
            entry.card._showCharacterInfoFromPortrait?.();
            for (const other of $$('.scene-enemybar .scene-reading', fieldbars)) other.classList.remove('scene-reading');
            button.classList.add('scene-reading');
            requestAnimationFrame(() => $(`.skillinformation .skill-browser-icon[data-skill-idx="${index}"]`)?.click());
            $('.scene-hint').textContent = `Reading ${$('.scene-actor-name', entry.card).textContent}'s ${button.dataset.name}`;
        }
        function syncEnemyBar(entry, unit) {
            const skills = (unit?.character?.skills || []).map((skill, index) => ({ skill, index }))
                .filter(({ skill }) => skill && !skill.hiddenFromSelectionViewer && skill.skillimage);
            const seen = new Set();
            const shown = skills.filter(({ skill }) => { const k = skill.skillimage; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 6);
            const signature = shown.map(({ skill, index }) => `${index}:${skill.id || skill.name}`).join('|');
            entry.bar.classList.toggle('is-out', entry.card.classList.contains('scene-knocked-out'));
            if (signature === entry.signature) return;
            entry.signature = signature;
            const holder = $('.scene-fieldbar-skills', entry.bar); holder.textContent = '';
            for (const { skill, index } of shown) {
                const button = document.createElement('button'); button.type = 'button'; button.className = 'scene-skill scene-mini';
                button.innerHTML = '<img alt="">';
                $('img', button).src = skill.skillimage;
                button.dataset.name = skill.name || 'Skill';
                button.setAttribute('aria-label', `Read enemy skill: ${skill.name || 'Skill'}`);
                button.addEventListener('click', () => readEnemySkill(entry, button, index));
                holder.append(button);
            }
        }

        // ---- Actors ---------------------------------------------------------------------------------
        // Foot positions (percent of the field). Slot 1 stands at the front, 0 and 2 behind it.
        const FORMATION = [{ x: 12, y: 60 }, { x: 27, y: 79 }, { x: 41, y: 64 }];
        const FORMATION_NARROW = [{ x: 14, y: 57 }, { x: 25, y: 86 }, { x: 37, y: 63 }];
        const actors = new Map(); // card -> { side, slot, art, rig, body, id, names, bbox }
        for (const [side, cards] of Object.entries(teams)) cards.forEach((card, slot) => {
            card.dataset.sceneSlot = String(slot); card.dataset.sceneSide = side;
            card.style.setProperty('--away', side === 'player' ? '-1' : '1');
            const rig = document.createElement('div'); rig.className = 'scene-rig'; rig.setAttribute('aria-hidden', 'true');
            rig.innerHTML = '<span class="scene-shadow"></span><div class="scene-body"><img class="scene-actor-art" alt="" draggable="false"></div>';
            const art = $('.scene-actor-art', rig);
            const ring = document.createElement('span'); ring.className = 'scene-target-ring'; ring.setAttribute('aria-hidden', 'true');
            const arrow = document.createElement('span'); arrow.className = 'scene-target-arrow'; arrow.setAttribute('aria-hidden', 'true');
            const plate = document.createElement('div'); plate.className = 'scene-plate';
            const label = document.createElement('span'); label.className = 'scene-actor-name';
            plate.append(label);
            const bar = $('.health-bar-container', card); if (bar) plate.append(bar);
            card.prepend(ring, rig); card.append(arrow, plate);
            const actor = { side, slot, card, art, rig, body: $('.scene-body', rig), id: '', names: [], bbox: null };
            actors.set(card, actor);
            card.addEventListener('pointerdown', () => { if (side === 'player') { selected = slot; queueMicrotask(syncControls); } }, true);
            const face = $('.character-face', card);
            if (face) { face.setAttribute('tabindex', '0'); face.setAttribute('role', 'button'); face.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); face.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 })); }
            }); }
            art.addEventListener('load', () => { actor.bbox = measure(art); layoutActor(actor); });
            art.addEventListener('error', () => {
                const portrait = face?.src;
                if (!portrait || art.src === portrait) return;
                card.classList.add('scene-portrait-fallback'); art.src = portrait;
            });
        });

        // Trim transparent padding so sizes compare the characters, not their canvases.
        const bboxCache = new Map();
        function measure(img) {
            const key = img.currentSrc || img.src;
            const w = img.naturalWidth, h = img.naturalHeight;
            if (!w || !h) return null;
            if (bboxCache.has(key)) return bboxCache.get(key);
            let box = { x: 0, y: 0, w, h, nw: w, nh: h };
            try {
                const scale = Math.min(1, 220 / Math.max(w, h));
                const cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
                const canvas = document.createElement('canvas'); canvas.width = cw; canvas.height = ch;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                ctx.drawImage(img, 0, 0, cw, ch);
                const data = ctx.getImageData(0, 0, cw, ch).data;
                let x0 = cw, y0 = ch, x1 = -1, y1 = -1, opaque = 0;
                for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
                    if (data[(y * cw + x) * 4 + 3] > 28) { opaque++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
                }
                // A fully opaque picture (a portrait or a cover) has no cut-out to trim.
                if (x1 >= 0 && opaque < cw * ch * 0.97) box = { x: x0 / scale, y: y0 / scale, w: (x1 - x0 + 1) / scale, h: (y1 - y0 + 1) / scale, nw: w, nh: h };
                box.solid = opaque >= cw * ch * 0.97;
            } catch { /* cross-origin art: use the full picture */ }
            bboxCache.set(key, box);
            return box;
        }
        function sizeFor(actor) {
            if (actor.card.classList.contains('scene-portrait-fallback') || actor.bbox?.solid) return 0.58;
            if (arena === 'comic') return COMIC_SIZES[actor.id] || 1;
            const metres = lookup(POKEMON_METRES, ...actor.names) || 1;
            // Compress the real scale so Onix fits on screen and Pikachu stays readable.
            return 1.18 * Math.max(0.36, Math.min(1.45, Math.pow(metres / 1.7, 0.55)));
        }
        function isFlyer(actor) {
            return arena === 'comic' ? COMIC_FLYERS.has(actor.id) : Boolean(lookup(Object.fromEntries([...POKEMON_FLYERS].map(k => [k, 1])), ...actor.names.slice(0, 1)));
        }
        function layoutActor(actor) {
            const { card, art, side, slot } = actor;
            const box = actor.bbox; if (!box) return;
            const fw = field.clientWidth, fh = field.clientHeight; if (!fw || !fh) return;
            const narrow = fw < 700;
            const formation = narrow ? FORMATION_NARROW : FORMATION;
            const spot = formation[slot] || formation[0];
            let x = side === 'player' ? spot.x : 100 - spot.x;
            const y = spot.y;
            const depth = 0.42 + 0.62 * (y / 100);
            const unit = Math.min(fh * 0.47, fw * (narrow ? 0.3 : 0.19));
            let height = unit * sizeFor(actor) * depth;
            let width = height * box.w / box.h;
            const maxWidth = fw * (narrow ? 0.3 : 0.185) * depth;
            if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
            // Keep the figure and its name plate inside the field.
            const half = Math.max(width, narrow ? 74 : 96) / 2 + 3;
            x = Math.min(100 - half / fw * 100, Math.max(half / fw * 100, x));
            const k = height / box.h; // screen px per source px
            const flipped = side === 'opponent';
            art.style.width = `${box.nw * k}px`; art.style.height = `${box.nh * k}px`;
            art.style.left = `${-(flipped ? box.nw - box.x - box.w : box.x) * k}px`;
            art.style.top = `${-box.y * k}px`;
            const lift = isFlyer(actor) ? Math.round(height * 0.07) : 0;
            card.style.setProperty('--x', x); card.style.setProperty('--y', y);
            card.style.setProperty('--w', Math.round(width)); card.style.setProperty('--h', Math.round(height));
            card.style.setProperty('--lift', lift);
            card.style.setProperty('--z', String(10 + Math.round(y)));
            card.classList.toggle('scene-flyer', lift > 0);
            card.classList.toggle('scene-cut', arena === 'comic' && COMIC_CUT.has(actor.id));
            card.classList.add('scene-laid-out');
            const panel = panels.find(p => p.card === card) || enemyBars.find(e => e.card === card);
            if (panel) {
                const plate = $('.scene-plate', card);
                panel.bar.style.left = `${x}%`;
                panel.bar.style.top = `calc(${y}% + ${12 + (plate?.offsetHeight || 30)}px)`;
                panel.bar.classList.add('scene-laid-out');
            }
        }
        const layoutAll = () => { for (const actor of actors.values()) layoutActor(actor); updateEffectClip(); };
        new ResizeObserver(layoutAll).observe(field);

        // ---- Fighter panels ------------------------------------------------------------------------------
        // The panels proxy the controller's own skill icons, which stay in their cards, so every queue,
        // cooldown and energy rule is still the production one.
        function renderSource(entry, owner) {
            const art = window.ArenaSceneArt; if (!art || !entry) return { source: '', form: '' };
            const id = String(entry.character?.characterId || entry.character?.id || '').toLowerCase();
            const baseId = String(entry.baseCharacter?.characterId || entry.baseCharacter?.id || id).toLowerCase();
            if (arena === 'comic') return { source: art.source(art.comic[id] || art.comic[baseId]), form: '' };
            const equipped = owner?.profile?.skins?.equippedSkinByCharacterId?.[baseId];
            const skinForms = art.skins[equipped];
            const baseFilename = art.pokemon[id] || art.pokemon[baseId];
            const forms = skinForms?.length ? skinForms : [
                { name: entry.character?.name, filename: baseFilename },
                art.evolutions[id] || art.evolutions[baseId], ...(art.forms[id] || art.forms[baseId] || []),
            ].filter(Boolean);
            const statuses = (entry.unit?.state?.statuses || []).filter(s => s.remainingTurns > 0);
            let formName = '';
            for (const status of statuses) {
                const match = String(status.metadata?.tooltipText || '').match(/evolved into\s+([^.!]+)/i);
                if (match) formName = match[1];
                if (/_evolution$/.test(status.id || '') && !formName) formName = String(status.id).replace(/_evolution$/, '').split('_').at(-1);
                if (/blade_stance|blade_form/.test(status.id || '')) formName = 'Blade';
                if (/shield_stance|shield_form/.test(status.id || '')) formName = 'Shield';
            }
            const chosen = formName && forms.find(f => norm(f.name).includes(norm(formName)) || norm(f.label).includes(norm(formName)));
            const form = chosen || forms[0];
            return { source: art.source(form?.filename), form: form?.name || '' };
        }
        function unitName(username, slot) {
            const side = username === state?.match?.player?.username ? 'player' : 'opponent';
            const card = teams[side]?.[slot];
            return (card && $('.scene-actor-name', card)?.textContent) || 'target';
        }
        function targetLabel(selection) {
            if (Array.isArray(selection)) {
                const mine = selection.every(t => t.username === state?.match?.player?.username);
                const theirs = selection.every(t => t.username !== state?.match?.player?.username);
                return selection.length === 1 ? unitName(selection[0].username, selection[0].slot) : mine ? 'your team' : theirs ? 'all enemies' : 'everyone';
            }
            return selection ? unitName(selection.username, selection.slot) : '';
        }
        function syncControls() {
            const queuedBySlot = state?.match?.pendingTurn?.queuedByActorSlot || {};
            const ownTurn = state?.match?.currentTurn === state?.match?.player?.username && state?.match?.status !== 'ended';
            const hasTargets = $$('.character-card.targetable').length > 0;
            if (!hasTargets) { armed.slot = -1; armed.index = -1; }
            panels.forEach(({ panel, head, skills, card, bar, minis }, slot) => {
                const isSelected = selected === slot;
                head.classList.toggle('selected', isSelected); head.setAttribute('aria-pressed', String(isSelected));
                if (card.classList.contains('scene-selected') !== isSelected) card.classList.toggle('scene-selected', isSelected);
                const name = $('.scene-actor-name', card).textContent || `Fighter ${slot + 1}`;
                $('.scene-fighter-name', panel).textContent = name;
                const face = $('.character-face', card)?.src; const headImg = $('.scene-fighter-face', panel);
                if (face && headImg.src !== face) headImg.src = face;
                $('.scene-fighter-hp i', panel).style.width = `${card.style.getPropertyValue('--scene-health-percent') || 100}%`;
                const out = card.classList.contains('scene-knocked-out');
                const images = $$('.skillimage', card);
                const entry = queuedBySlot[slot] || queuedBySlot[String(slot)];
                const queuedIndex = entry ? Number(entry.skillIndex) : images.findIndex(img => img.classList.contains('selected-target'));
                const queued = queuedIndex >= 0 && Boolean(images[queuedIndex]);
                panel.classList.toggle('is-queued', queued && !out);
                panel.classList.toggle('is-out', out);
                panel.classList.toggle('is-waiting', !ownTurn);
                panel.classList.toggle('is-armed', armed.slot === slot && hasTargets);
                $('.scene-fighter-status', panel).textContent = out ? 'Knocked out' : queued ? 'Ready' : ownTurn ? 'Choose a skill' : '';
                skills.forEach((button, index) => {
                    const source = images[index]; const image = $('img', button);
                    if (source?.src && image.src !== source.src) image.src = source.src;
                    const skillName = source?.alt && source.alt !== 'Skill' ? source.alt : state?.units?.player?.[slot]?.character?.skills?.[index]?.name || `Skill ${index + 1}`;
                    $('.scene-skill-name', button).textContent = skillName;
                    button.setAttribute('aria-label', `${name}: ${skillName}`);
                    button.disabled = !source || out;
                    const unavailable = source?.style.cursor === 'not-allowed';
                    button.classList.toggle('scene-unavailable', unavailable);
                    button.title = source?.title || (unavailable ? 'Unavailable this turn. Select to read its requirements.' : skillName);
                    const badge = $(`.skill-cooldown-badge[data-skill-idx="${index}"]`, card);
                    const cooldown = badge && getComputedStyle(badge).display !== 'none' ? badge.textContent.trim() : '';
                    button.classList.toggle('scene-armed', armed.slot === slot && armed.index === index && hasTargets);
                    $('.scene-skill-state', button).textContent = button.classList.contains('scene-armed') ? 'Pick a target' : cooldown ? `Cooldown ${cooldown}` : '';
                    button.classList.toggle('scene-on-cooldown', Boolean(cooldown));
                });
                bar.classList.toggle('is-queued', queued && !out);
                bar.classList.toggle('is-out', out);
                bar.classList.toggle('is-waiting', !ownTurn);
                minis.forEach((mini, index) => {
                    const full = skills[index], source = images[index], image = $('img', mini);
                    if (source?.src && image.src !== source.src) image.src = source.src;
                    const skillName = $('.scene-skill-name', full).textContent;
                    mini.dataset.name = skillName; mini.setAttribute('aria-label', full.getAttribute('aria-label') || skillName);
                    mini.title = full.title; mini.disabled = full.disabled;
                    for (const cls of ['scene-unavailable', 'scene-armed', 'scene-on-cooldown']) mini.classList.toggle(cls, full.classList.contains(cls));
                    const cd = $(`.skill-cooldown-badge[data-skill-idx="${index}"]`, card);
                    $('.scene-mini-cd', mini).textContent = full.classList.contains('scene-on-cooldown') && cd ? cd.textContent.trim() : '';
                });
                if (queued) {
                    const chip = $('.scene-fieldbar-queued', bar), source = images[queuedIndex];
                    if (source?.src && $('img', chip).src !== source.src) $('img', chip).src = source.src;
                    const skillName = $('.scene-skill-name', skills[queuedIndex]).textContent;
                    const target = targetLabel(entry?.targetSelection);
                    $('.scene-fieldbar-target', chip).textContent = target ? `→ ${target}` : skillName;
                    chip.title = `${skillName}${target ? ' → ' + target : ''} · tap to change`;
                    chip.setAttribute('aria-label', `${name} will use ${skillName}${target ? ' on ' + target : ''}. Tap to change.`);
                }
                if (queued) {
                    const chip = $('.scene-fighter-queued', panel);
                    const source = images[queuedIndex];
                    if (source?.src && $('img', chip).src !== source.src) $('img', chip).src = source.src;
                    const skillName = $('.scene-skill-name', skills[queuedIndex]).textContent;
                    const target = targetLabel(entry?.targetSelection);
                    $('.scene-queued-text b', chip).textContent = skillName;
                    $('.scene-queued-text span', chip).textContent = target ? `→ ${target}` : 'Queued';
                    chip.setAttribute('aria-label', `${name} will use ${skillName}${target ? ' on ' + target : ''}. Tap to change.`);
                }
            });
            field.classList.toggle('scene-targeting', hasTargets);
            const armedSkill = armed.slot >= 0 ? panels[armed.slot]?.skills[armed.index]?.querySelector('.scene-skill-name')?.textContent : '';
            $('.scene-hint').textContent = hasTargets ? `${armedSkill || 'Skill'} · tap a glowing target on the battlefield` : ownTurn ? 'Pick a skill for each fighter, then tap its target.' : 'Bot is taking its turn…';
            const queuedCount = Object.keys(queuedBySlot).length;
            const able = panels.filter(p => !p.card.classList.contains('scene-knocked-out')).length;
            $('.scene-queue').textContent = queuedCount ? `${queuedCount} of ${able} queued · press Ready when done` : 'One skill per fighter';
        }
        let controlsScheduled = false;
        const observer = new MutationObserver(() => {
            if (controlsScheduled) return; controlsScheduled = true;
            requestAnimationFrame(() => { controlsScheduled = false; syncControls(); });
        });
        // Observe only original controls; observing our own proxies creates feedback loops.
        for (const card of teams.player) {
            const holder = $('.skillholder', card); if (holder) observer.observe(holder, { subtree: true, attributes: true, childList: true, characterData: true });
        }
        for (const card of allCards()) observer.observe(card, { attributes: true, attributeFilter: ['class'] });

        // ---- Motion -------------------------------------------------------------------------------------
        // Every motion is written relative to the figure's resting spot and runs on its rig, so the
        // idle breathing (on .scene-body) keeps going underneath and nothing ever snaps.
        const wait = ms => new Promise(ok => setTimeout(ok, ms));
        const foot = card => { const r = card.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.bottom, w: r.width, h: r.height }; };
        const sideOf = card => actors.get(card)?.side;
        const impactAt = new WeakMap();  // target card -> time its incoming hit should land
        const recentMotion = new Map();
        const running = new WeakMap();   // card -> Animation on its rig
        function play(card, frames, options) {
            const { ko, ...timing } = options;
            const actor = actors.get(card); if (!actor?.rig?.animate || (card.classList.contains('scene-knocked-out') && !ko)) return null;
            running.get(card)?.cancel();
            const animation = actor.rig.animate(frames, { fill: 'none', ...timing });
            running.set(card, animation);
            animation.finished.catch(() => {}).then(() => { if (running.get(card) === animation) running.delete(card); });
            return animation;
        }
        function raise(card, ms) {
            card.classList.add('scene-acting');
            clearTimeout(card._sceneLower);
            card._sceneLower = setTimeout(() => card.classList.remove('scene-acting'), ms);
        }
        function afterimages(card, frames, options) {
            const actor = actors.get(card); if (!actor) return;
            [0.42, 0.22].forEach((alpha, i) => {
                const ghost = document.createElement('div'); ghost.className = 'scene-rig scene-ghost'; ghost.setAttribute('aria-hidden', 'true');
                ghost.append(actor.body.cloneNode(true));
                actor.rig.after(ghost);
                const ghostFrames = frames.map(f => ({ ...f, opacity: f.ghost ? alpha : 0 }));
                ghost.animate(ghostFrames, { ...options, delay: 34 * (i + 1) }).finished.catch(() => {}).then(() => ghost.remove());
            });
        }
        function shake(power = 1) {
            if (!motionOK()) return;
            const p = Math.min(1.6, power) * 5;
            // Shake what is inside the field, never the field itself, so the page cannot scroll sideways.
            const frames = [{ translate: '0 0' }, { translate: `${p}px ${-p * 0.6}px` }, { translate: `${-p * 0.8}px ${p * 0.4}px` }, { translate: `${p * 0.4}px 0` }, { translate: '0 0' }];
            $$(':scope > .scene-backdrop, :scope > .player-characters, :scope > .enemy-characters', field).forEach(el => el.animate(frames, { duration: 260, easing: 'ease-out' }));
        }
        function flash(card, kind) {
            const art = actors.get(card)?.art; if (!art?.animate) return;
            const tint = { hit: 'brightness(2.8) saturate(0)', heal: 'brightness(1.35) drop-shadow(0 0 16px #8dffb0)', buff: 'brightness(1.3) drop-shadow(0 0 14px #ffe08a)', debuff: 'brightness(.9) sepia(1) hue-rotate(220deg) saturate(2.6)' }[kind];
            const after = kind === 'hit' ? 'brightness(1.05) sepia(.45) saturate(2.4) hue-rotate(-32deg)' : tint;
            art.animate([{ offset: 0.12, filter: tint }, { offset: 0.4, filter: after }], { duration: kind === 'hit' ? 420 : 700, easing: 'ease-out' });
        }
        function spark(card, heal) {
            const f = foot(card), r = field.getBoundingClientRect();
            const el = document.createElement('span'); el.className = `scene-spark${heal ? ' scene-spark-heal' : ''}`;
            el.style.left = `${f.x - r.left}px`; el.style.top = `${f.y - r.top - f.h * 0.55}px`; el.style.setProperty('--s', `${Math.max(60, f.h * 0.75)}px`);
            field.append(el);
            el.animate([{ transform: 'translate(-50%,-50%) scale(.2) rotate(0)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(1.15) rotate(25deg)', opacity: 0 }], { duration: 380, easing: 'cubic-bezier(.1,.8,.3,1)' })
                .finished.catch(() => {}).then(() => el.remove());
        }

        /** The caster's visible move. Returns how long until its hit lands on the first target. */
        function castMotion({ actor, targets = [], characterId, skillId, key }) {
            if (!actor || !actors.has(actor)) return;
            const now = performance.now();
            const castKey = key || `${sideOf(actor)}${actors.get(actor).slot}:${skillId}`;
            const profile = window.BattleFX?.profileFor?.(characterId, skillId) || null;
            const windup = profile?.windup ? 260 : 170;
            const target = targets.find(Boolean) || actor;
            const foe = target !== actor && sideOf(target) !== sideOf(actor);
            const delivery = profile?.delivery || (foe ? 'ranged' : 'self');
            const melee = delivery === 'melee' && foe;
            // When the hit lands on each target (BattleFX's own timing, so recoil matches its sprites).
            const a = foot(actor);
            targets.filter(Boolean).forEach((t, i) => {
                if (t === actor) return;
                const b = foot(t);
                const travel = melee ? 140 : profile?.travel ? Math.min(620, Math.max(260, Math.hypot(b.x - a.x, b.y - a.y) * 0.9)) : 60;
                const at = now + (recentMotion.get(castKey) > now - 900 ? 90 : windup) + travel + Math.min(i, 3) * 90;
                if (!impactAt.get(t) || impactAt.get(t) < now) impactAt.set(t, at);
            });
            if (recentMotion.get(castKey) > now - 900) return; // one skill reported once per target
            recentMotion.set(castKey, now);
            if (recentMotion.size > 60) recentMotion.delete(recentMotion.keys().next().value);
            if (!motionOK() || !settingsAllowMotion()) return;
            const dir = foe ? Math.sign(foot(target).x - a.x) || (sideOf(actor) === 'player' ? 1 : -1) : (sideOf(actor) === 'player' ? 1 : -1);
            if (melee) {
                const b = foot(target);
                const dx = (b.x - dir * (b.w * 0.46 + a.w * 0.32)) - a.x, dy = b.y - a.y;
                const dash = 140, strike = 170, back = 360, total = windup + dash + strike + back;
                const o = ms => Math.min(0.999, ms / total);
                const frames = [
                    { offset: 0, transform: 'none', easing: 'cubic-bezier(.3,0,.5,1)' },
                    { offset: o(windup * 0.85), transform: `translate(${-dir * 18}px,4px) scale(1.05,.93)`, easing: 'cubic-bezier(.5,0,.9,.5)' },
                    { offset: o(windup + dash * 0.5), transform: `translate(${dx * 0.5}px,${dy * 0.5 - 30}px) scale(.98,1.04)`, easing: 'cubic-bezier(.1,.5,.5,1)', ghost: true },
                    { offset: o(windup + dash), transform: `translate(${dx}px,${dy}px) rotate(${dir * 8}deg) scale(1.08)`, easing: 'ease-out', ghost: true },
                    { offset: o(windup + dash + strike), transform: `translate(${dx - dir * 8}px,${dy}px) rotate(${dir * 3}deg)`, easing: 'cubic-bezier(.4,0,.6,1)' },
                    { offset: o(windup + dash + strike + back * 0.55), transform: `translate(${dx * 0.4}px,${dy * 0.4 - 26}px) scale(.98,1.03)`, easing: 'cubic-bezier(.4,0,.9,.6)' },
                    { offset: o(total - 70), transform: 'translate(0,0) scale(1.04,.95)', easing: 'ease-out' },
                    { offset: 1, transform: 'none' },
                ];
                raise(actor, total + 40);
                const clean = frames.map(({ ghost, ...f }) => f);
                play(actor, clean, { duration: total });
                afterimages(actor, frames, { duration: total });
                return;
            }
            if (delivery === 'self' || !foe) {
                play(actor, [
                    { transform: 'none' },
                    { offset: 0.25, transform: 'translateY(4px) scale(1.05,.93)' },
                    { offset: 0.55, transform: 'translateY(-26px) scale(.97,1.05)' },
                    { offset: 0.85, transform: 'translateY(0) scale(1.04,.96)' },
                    { transform: 'none' },
                ], { duration: windup + 420, easing: 'cubic-bezier(.3,.6,.4,1)' });
                setTimeout(() => flash(actor, 'buff'), windup);
                return;
            }
            // Ranged and area: draw back, thrust as the shot leaves, settle.
            const push = delivery === 'area' ? 34 : 24;
            const total = windup + 520;
            play(actor, [
                { offset: 0, transform: 'none' },
                { offset: (windup * 0.9) / total, transform: `translate(${-dir * 12}px,2px) scale(1.04,.96)`, easing: 'cubic-bezier(.6,0,.9,.4)' },
                { offset: (windup + 70) / total, transform: `translate(${dir * push}px,-6px) scale(1.06)`, easing: 'ease-out' },
                { offset: (windup + 260) / total, transform: `translate(${dir * push * 0.4}px,0)` },
                { offset: 1, transform: 'none' },
            ], { duration: total, easing: 'cubic-bezier(.3,.6,.4,1)' });
            raise(actor, total);
            setTimeout(() => { const art = actors.get(actor)?.art; art?.animate?.([{ offset: 0.2, filter: 'brightness(1.5)' }], { duration: 260 }); }, windup);
        }
        const settingsAllowMotion = () => !document.body.classList.contains('ui-disable-skill-cast-animations');
        const delayFor = card => Math.max(0, (impactAt.get(card) || 0) - performance.now());

        function recoilMotion(card, amount) {
            if (!actors.has(card) || !amount || !motionOK()) return;
            setTimeout(() => {
                if (amount > 0) {
                    play(card, [{ transform: 'none' }, { offset: 0.4, transform: 'translateY(-10px) scale(1.03)' }, { transform: 'none' }], { duration: 520, easing: 'ease-out' });
                    flash(card, 'heal'); spark(card, true); return;
                }
                const s = Math.min(1, 0.35 + Math.abs(amount) / 40);
                const away = sideOf(card) === 'player' ? -1 : 1;
                play(card, [
                    { transform: 'none' },
                    { offset: 0.06, transform: 'none' }, // a few frames of hit-stop
                    { offset: 0.16, transform: `translate(${away * 22 * s}px,${-6 * s}px) rotate(${away * 6 * s}deg) scale(.97,1.03)` },
                    { offset: 0.38, transform: `translate(${away * 12 * s}px,0) rotate(${-away * 2 * s}deg)` },
                    { offset: 0.62, transform: `translate(${away * 4 * s}px,0) rotate(${away * s}deg)` },
                    { transform: 'none' },
                ], { duration: 460 + 200 * s, easing: 'cubic-bezier(.25,.7,.35,1)' });
                flash(card, 'hit'); spark(card, false);
                if (Math.abs(amount) >= 25) shake(Math.abs(amount) / 25);
            }, delayFor(card));
        }
        function koMotion(card) {
            if (!actors.has(card)) return;
            const run = () => {
                card.classList.add('scene-falling');
                const away = sideOf(card) === 'player' ? -1 : 1;
                if (motionOK()) {
                    play(card, [
                        { transform: 'none' },
                        { offset: 0.14, transform: `translate(${away * 34}px,-16px) rotate(${away * 10}deg)` },
                        { offset: 0.5, transform: `translate(${away * 18}px,4px) rotate(${away * 16}deg) scaleY(.9)` },
                        { transform: `translateY(6px) rotate(${away * 12}deg) scaleY(.92)` },
                    ], { duration: 900, easing: 'cubic-bezier(.3,.6,.3,1)', ko: true });
                    flash(card, 'hit'); shake(1.1);
                }
                setTimeout(() => card.classList.remove('scene-falling'), 950);
            };
            setTimeout(run, delayFor(card) + 120);
        }
        function entryMotion(cards) {
            if (!motionOK()) return;
            cards.filter(c => actors.has(c)).forEach((card, i) => {
                const away = sideOf(card) === 'player' ? -1 : 1;
                const dist = field.clientWidth * 0.32;
                const rig = actors.get(card).rig;
                rig.animate([
                    { transform: `translateX(${away * dist}px)`, opacity: 0 },
                    { offset: 0.25, transform: `translate(${away * dist * 0.7}px,-14px)`, opacity: 1 },
                    { offset: 0.5, transform: `translate(${away * dist * 0.35}px,0)` },
                    { offset: 0.75, transform: `translate(${away * dist * 0.08}px,-10px)` },
                    { offset: 0.9, transform: 'translate(0,0) scale(1.05,.94)' },
                    { transform: 'none', opacity: 1 },
                ], { duration: 820, delay: 120 + (i % 3) * 150, easing: 'cubic-bezier(.25,.6,.3,1)', fill: 'backwards' });
            });
        }
        function victoryMotion(cards) {
            if (!motionOK()) return;
            cards.filter(c => actors.has(c) && !c.classList.contains('scene-knocked-out')).forEach((card, i) => setTimeout(() => play(card, [
                { transform: 'none' }, { offset: 0.2, transform: 'translateY(3px) scale(1.05,.94)' }, { offset: 0.4, transform: 'translateY(-34px) scale(.97,1.05)' },
                { offset: 0.6, transform: 'translateY(0) scale(1.05,.95)' }, { offset: 0.8, transform: 'translateY(-16px)' }, { transform: 'none' },
            ], { duration: 1100, easing: 'ease-out' }), i * 160));
        }

        // Wrap the engine: its sprites still play; the figures now move with them. Hits on a target
        // wait for the attacker to arrive (Adventure Quest style), so the engine's impact sprite,
        // the damage number and the health drop all land on the same frame as the strike.
        const fx = window.BattleFX;
        if (fx && !fx._sceneWrapped) {
            fx._sceneWrapped = true;
            const guard = (name, fn) => { try { fn(); } catch (e) { console.warn('[arena-scene]', name, e); } };
            const wrap = (name, wrapper) => { const original = fx[name]?.bind(fx); if (original) fx[name] = (...args) => wrapper(original, ...args); };
            const later = (card, fn) => { const ms = actors.has(card) ? delayFor(card) : 0; if (ms > 16) setTimeout(fn, ms); else fn(); };
            wrap('cast', (original, opts) => { guard('cast', () => castMotion(opts || {})); return original(opts); });
            wrap('recoil', (original, card, amount, extra) => { guard('recoil', () => recoilMotion(card, amount)); later(card, () => original(card, amount, extra)); });
            wrap('status', (original, card, harmful) => later(card, () => { guard('status', () => { if (actors.has(card) && motionOK()) flash(card, harmful ? 'debuff' : 'buff'); }); original(card, harmful); }));
            wrap('death', (original, card, opts) => { guard('death', () => koMotion(card)); return new Promise(done => later(card, () => Promise.resolve(original(card, opts)).then(done, done))); });
            wrap('enter', (original, cards) => { guard('enter', () => entryMotion(cards || [])); return original(cards); });
            wrap('victory', (original, cards) => { guard('victory', () => victoryMotion(cards || [])); return original(cards); });
        }
        // Damage numbers and impact flashes the controller pins to a card appear on impact too.
        const revealObserver = new MutationObserver(records => {
            for (const record of records) {
                const ms = delayFor(record.target); if (ms < 30) continue;
                for (const node of record.addedNodes) {
                    if (node.nodeType !== 1 || !(node.classList.contains('hp-delta-popup') || node.dataset.transientCardFx === 'true' || node.classList.contains('combat-impact-burst'))) continue;
                    node.style.visibility = 'hidden';
                    node.getAnimations?.().forEach(a => { a.pause(); });
                    setTimeout(() => { node.style.visibility = ''; node.getAnimations?.().forEach(a => { a.currentTime = 0; a.play(); }); }, ms);
                }
            }
        });
        for (const card of allCards()) revealObserver.observe(card, { childList: true });

        // ---- State --------------------------------------------------------------------------------------
        function applyState(next) {
            if (!next?.match) return;
            state = next;
            const ownTurn = next.match.currentTurn === next.match.player?.username;
            $('.scene-turn').textContent = next.match.status === 'ended' ? 'Battle complete' : ownTurn ? 'YOUR TURN · Plan your moves' : 'BOT TURN · Watch the battlefield';
            field.classList.toggle('scene-bot-turn', !ownTurn);
            for (const [side, cards] of Object.entries(teams)) cards.forEach((card, slot) => {
                const entry = next.units[side]?.[slot]; if (!entry) return;
                const actor = actors.get(card), face = $('.character-face', card);
                const { source: render, form } = renderSource(entry, next.match[side]);
                const source = render || entry.character?.facePicture || face?.src;
                const evolution = (entry.unit?.state?.statuses || []).find(s => s.remainingTurns > 0 && /_evolution$/.test(s.id || ''));
                const evolved = String(evolution?.metadata?.tooltipText || '').match(/evolved into\s+([^.!]+)/i)?.[1];
                const name = entry.character?.name || entry.baseCharacter?.name || `Fighter ${slot + 1}`;
                actor.id = String(entry.baseCharacter?.characterId || entry.character?.characterId || entry.character?.id || '').toLowerCase();
                actor.names = [form, evolved, entry.character?.name, actor.id].filter(Boolean);
                if (source && actor.art.dataset.source !== source) {
                    actor.art.dataset.source = source; card.classList.remove('scene-portrait-fallback'); actor.bbox = null; actor.art.src = source;
                } else if (actor.bbox) layoutActor(actor);
                $('.scene-actor-name', card).textContent = evolved || name;
                // Per-character gauges (Hulk's rage) belong on the plate with the health bar.
                const plate = $('.scene-plate', card), gauge = $('.rage-bar-container', card);
                if (gauge && gauge.parentNode !== plate) plate.append(gauge);
                face?.setAttribute('aria-label', `${evolved || name}, ${entry.unit.hp} health. Select fighter or skill target.`);
                card.classList.toggle('scene-knocked-out', entry.unit.alive === false || entry.unit.hp <= 0);
                if (side === 'opponent') syncEnemyBar(enemyBars[slot], entry);
            });
            requestAnimationFrame(() => {
                for (const card of allCards()) {
                    const hp = Number(card.dataset.renderedHp);
                    const max = Number(card.dataset.renderedDisplayMaxHp) || 100;
                    const pct = Math.max(0, Math.min(100, hp / max * 100));
                    const apply = () => { card.style.setProperty('--scene-health-percent', String(pct)); card.classList.toggle('scene-low-hp', pct > 0 && pct <= 30); };
                    const ms = delayFor(card); if (ms > 30) setTimeout(apply, ms); else apply();
                }
                syncControls();
            });
        }
        window.addEventListener('arena-scene-state', event => applyState(event.detail));
        if (window.ArenaSceneState) applyState(window.ArenaSceneState);
        // Original skill metadata is attached after the first state arrives.
        requestAnimationFrame(() => { syncControls(); updateEffectClip(); });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onReady); else onReady();
})();
