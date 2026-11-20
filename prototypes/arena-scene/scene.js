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
    // Runs in the admin preview (/arena-scene/) and in real battles for players who turned on the
    // experimental battlefield (Settings > Options). It only changes presentation.
    if (!window.ARENA_SCENE_VIEW && !window.ARENA_SCENE_PREVIEW) return;
    const live = !window.ARENA_SCENE_PREVIEW;

    // Height of each figure in "adult human" units (1 = about 1.8 m), measured over what the
    // render actually shows. A waist-up render of a normal person is about 0.6.
    const COMIC_SIZES = {
        'andrea': 1.18, 'angstrom-levy': 1, 'aquaman': 1.18, 'atom-eve': 0.86, 'atrocitus': 1.1, 'batman': 1.02,
        'billy-butcher': 0.96, 'boba-fett': 1, 'captain-america': 1.03, 'carnage': 1.12, 'darth-maul': 1.04,
        'darth-sidious': 0.94, 'darth-vader': 1.08, 'deadpool': 1.02, 'doctor-doom': 1.06, 'doctor-fate': 1.08,
        'doctor-octopus': 1.38, 'doctor-strange': 0.62, 'general-grievous': 1.1, 'ghost-rider': 1.04,
        'grand-master-yoda': 0.42, 'green-lantern-hal-jordan': 1, 'hershel-greene': 0.96, 'homelander': 1.02,
        'indigo-1': 0.82, 'invincible': 0.98, 'iron-man': 1.02, 'john-stewart': 1.0, 'mysterio': 1.1, 'negan': 0.98,
        'obi-wan-kenobi': 0.98, 'omni-man': 1.08, 'parasite': 1.1, 'poison-ivy': 0.96, 'predalien': 1.12,
        'predator-stalker': 1.16, 'rage-infected': 0.96, 'rex-splode': 0.98, 'rick-grimes': 1, 'saint-walker': 0.66,
        'sandman': 1.08, 'scorpion': 0.92, 'sinestro': 1.08, 'sorrow': 1.06, 'space-marine-infantry': 0.98, 'space-marine-medic': 0.96, 'space-marine-smartgunner': 1.06, 'spider-man': 0.62, 'storm': 1.04,
        'superman': 1.06, 'the-flash-barry-allen': 0.98, 'the-green-goblin': 1.06, 'the-hulk': 1.42, 'the-joker': 0.96,
        'venom': 1.24, 'walker': 0.92, 'wolverine': 0.84, 'wonder-woman': 1.02, 'xenomorph-drone': 1.12,
    };
    // Waist-up renders: the bottom edge is softened into the floor instead of a hard cut.
    // Every Comic Arena render is full-body now; add an id here if a cut-off render comes back.
    const COMIC_CUT = new Set([]);
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
        const arena = params.get('arena') === 'pokemon' || (!params.get('arena') && document.body.classList.contains('arena-mode-pokemon')) ? 'pokemon' : 'comic';
        const isBattle = location.pathname.endsWith('ingame.html');
        const motionOK = () => !matchMedia('(prefers-reduced-motion: reduce)').matches;
        document.body.classList.add(isBattle ? 'scene-battle' : 'scene-selection');
        document.documentElement.classList.add(`scene-arena-${arena}`);
        const header = document.createElement('header'); header.className = 'scene-header';
        header.innerHTML = live ? `<div><span class="scene-eyebrow">EXPERIMENTAL BATTLEFIELD · BETA</span><h1>${arena === 'pokemon' ? 'Pokémon' : 'Comic'} Arena <span>Living battlefield</span></h1></div><nav aria-label="Battlefield view"><button type="button" class="scene-classic-view">Classic view</button></nav>` : `<div><span class="scene-eyebrow">ADMIN LAB · BOT BATTLE</span><h1>${arena === 'pokemon' ? 'Pokémon' : 'Comic'} Arena <span>Living battlefield</span></h1></div><nav aria-label="Preview navigation"><a href="/arena-scene/?arena=comic" ${arena === 'comic' ? 'aria-current="page"' : ''}>Comic</a><a href="/arena-scene/?arena=pokemon" ${arena === 'pokemon' ? 'aria-current="page"' : ''}>Pokémon</a>${isBattle ? `<a href="/arena-scene/?arena=${arena}">Choose team</a>` : `<button type="button" class="scene-start">Fight the bot →</button>`}</nav>`;
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
        field.innerHTML = '<div class="scene-backdrop" aria-hidden="true"></div><div class="scene-floor" aria-hidden="true"></div>'
            + '<div class="scene-halves" aria-hidden="true"><span class="scene-half scene-half-player"></span><span class="scene-half scene-half-enemy"></span></div>'
            + '<div class="scene-divider" aria-hidden="true"><span class="scene-divider-glow"></span><span class="scene-divider-core"></span><span class="scene-divider-vs">VS</span></div>';
        const ribbon = document.createElement('div'); ribbon.className = 'scene-ribbon';
        const teamIcon = '<svg class="scene-team-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.4"/><path d="M2.5 19c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6z"/><circle cx="16.6" cy="7.4" r="2.7"/><path d="M15.2 12.6c3.4-.5 6.3 1.6 6.3 5.4h-4.6c0-2.2-.6-4-1.7-5.4z"/></svg>';
        ribbon.innerHTML = `<span class="scene-side-label scene-side-player">${teamIcon}<span>YOUR TEAM</span></span><div class="scene-hud"><p class="scene-turn" role="status">Preparing the battlefield…</p></div><span class="scene-side-label scene-side-enemy"><span>ENEMY TEAM</span>${teamIcon}</span>`;
        field.append(ribbon);
        for (const s of ['.player-characters', '.enemy-characters']) { const team = $(s); if (team) field.append(team); }
        // Each of your fighters gets a skill bar on the battlefield, under its feet.
        const fieldbars = document.createElement('div'); fieldbars.className = 'scene-fieldbars'; fieldbars.setAttribute('aria-label', 'Skills on the battlefield');
        field.append(fieldbars);
        const footer = document.createElement('section'); footer.className = 'scene-commandbar';
        footer.innerHTML = '<div class="scene-plan-line"><span class="scene-info-icon" aria-hidden="true">i</span><p class="scene-hint" aria-live="polite">Pick a skill for each fighter, then tap its target.</p><p class="scene-queue" aria-live="polite"></p></div><div class="scene-roster" aria-label="Your fighters and their skills"></div><div class="scene-details"></div>';
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
        // Exchange Energy gets its cycle icon; energy counts read "×2" like the rest of the battlefield.
        // The live battle page rebuilds parts of the energy bar, so this re-applies whenever it changes.
        const hudRoot = ribbon.querySelector('.scene-hud');
        const enhanceHud = () => {
            const exchange = $('.exchange-label', hudRoot);
            if (exchange && !$('.scene-exchange-icon', exchange)) exchange.insertAdjacentHTML('afterbegin', '<svg class="scene-exchange-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M19.5 9A8 8 0 0 0 5.2 7.2M4.5 15a8 8 0 0 0 14.3 1.8"/><path d="M19.8 3.6V9h-5.4M4.2 20.4V15h5.4"/></svg>');
            for (const count of $$('.chakra-count', hudRoot)) { const t = count.textContent.replace(/^\s*x\s*/i, '×'); if (t !== count.textContent) count.textContent = t; }
        };
        enhanceHud();
        new MutationObserver(() => { enhanceHud(); if (typeof fitBanners === 'function') fitBanners(); }).observe(hudRoot, { childList: true, characterData: true, subtree: true });
        // The skill card pages through the shown fighter's skills: arrows and one dot per skill.
        if (info && !$('.scene-chips', info)) {
            const chips = document.createElement('div'); chips.className = 'scene-chips';
            for (const sel of ['.energytext', '.ingameclasses', '.ingamecooldown']) { const el = $(sel, info); if (el) chips.append(el); }
            $('.ingameskilldescription', info)?.before(chips);
        }
        const skillBrowser = info ? $('.skill-browser-icons', info) : null;
        if (info && skillBrowser) {
            const pager = document.createElement('div'); pager.className = 'scene-pager';
            pager.innerHTML = '<button type="button" class="scene-pager-prev" aria-label="Previous skill">‹</button><span class="scene-pager-dots" aria-hidden="true"></span><button type="button" class="scene-pager-next" aria-label="Next skill">›</button>';
            info.append(pager);
            const icons = () => $$('.skill-browser-icon', skillBrowser);
            const syncPager = () => {
                const list = icons(), active = list.findIndex(b => b.classList.contains('active'));
                pager.hidden = list.length < 2;
                const dots = $('.scene-pager-dots', pager);
                if (dots.childElementCount !== list.length) dots.innerHTML = list.map(() => '<i></i>').join('');
                [...dots.children].forEach((dot, i) => dot.classList.toggle('on', i === Math.max(0, active)));
            };
            const step = dir => { const list = icons(); if (!list.length) return; const at = list.findIndex(b => b.classList.contains('active')); list[((at < 0 ? 0 : at) + dir + list.length) % list.length].click(); };
            $('.scene-pager-prev', pager).addEventListener('click', () => step(-1));
            $('.scene-pager-next', pager).addEventListener('click', () => step(1));
            new MutationObserver(syncPager).observe(skillBrowser, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
            syncPager();
        }
        stage.prepend(header); stage.append(field, footer);
        const returnNote = document.createElement('p'); returnNote.className = 'scene-footnote';
        returnNote.textContent = live ? 'EXPERIMENTAL BATTLEFIELD (BETA) · Same match and rules · Switch back any time with Classic view or Settings › Options' : 'PRIVATE PREVIEW · Original battle engine · No rewards, rankings or mission progress';
        stage.append(returnNote);
        // Real battles keep Surrender, Chat and Settings: they move up beside Classic view.
        if (live) {
            const nav = $('nav', header), controls = $('.bottomgame'), chat = $('.match-chat');
            if (controls) nav.prepend(controls);
            if (chat) (controls ? controls.insertBefore(chat, $('.battle-settings-button', controls)) : nav.prepend(chat));
        }
        $('.scene-classic-view', header)?.addEventListener('click', () => {
            try { localStorage.setItem('battleExperimentalView', '0'); } catch { /* storage blocked */ }
            location.reload();
        });
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
        // A short tap of vibration on phones when a skill or a target is picked (touch screens only).
        const touch = matchMedia('(pointer: coarse)');
        const buzz = ms => { try { if (touch.matches) navigator.vibrate?.(ms); } catch { /* not supported */ } };
        // One panel per fighter, all on screen. A panel folds into one button once its skill is queued.
        const panels = teams.player.map((card, slot) => {
            const panel = document.createElement('div'); panel.className = 'scene-fighter'; panel.dataset.slot = String(slot);
            panel.innerHTML = '<button type="button" class="scene-team-tab scene-fighter-head" aria-pressed="false"><img class="scene-fighter-face" alt=""><span class="scene-fighter-id"><span class="scene-fighter-name"></span><span class="scene-fighter-hp"><i></i></span></span><span class="scene-fighter-status"></span></button>'
                + '<div class="scene-fighter-skills"></div>'
                + '<button type="button" class="scene-fighter-queued"><img alt=""><span class="scene-queued-text"><b></b><span></span></span><span class="scene-queued-change">Change</span></button>';
            const head = $('.scene-fighter-head', panel);
            head.addEventListener('click', () => { selected = slot; card._showCharacterInfoFromPortrait?.(); syncControls(); });
            const pick = index => {
                selected = slot; buzz(10);
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
        // Phones: a taller field with the back pair high and the front fighter low, so each fighter's
        // 2×2 skill square has room under its feet without covering a teammate.
        const FORMATION_NARROW = [{ x: 15, y: 40 }, { x: 26, y: 76 }, { x: 37, y: 47 }];
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
            card.addEventListener('pointerdown', () => {
                if (card.classList.contains('targetable')) buzz([14, 40, 14]);
                if (side === 'player') { selected = slot; queueMicrotask(syncControls); }
            }, true);
            const face = $('.character-face', card);
            if (face) { face.setAttribute('tabindex', '0'); face.setAttribute('role', 'button'); face.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); face.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 })); }
            }); }
            art.addEventListener('load', () => { actor.bbox = measure(art); layoutAll(); });
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
        function layoutActor(actor, yOverride, fit = {}) {
            const { card, art, side, slot } = actor;
            const box = actor.bbox; if (!box) return null;
            const fw = field.clientWidth, fh = field.clientHeight; if (!fw || !fh) return null;
            const narrow = fw < 700;
            const formation = narrow ? FORMATION_NARROW : FORMATION;
            const spot = formation[slot] || formation[0];
            let x = fit.x ?? (side === 'player' ? spot.x : 100 - spot.x);
            const y = yOverride ?? spot.y;
            const depth = 0.42 + 0.62 * (y / 100);
            const unit = Math.min(fh * 0.47, fw * (narrow ? 0.27 : 0.19));
            let height = unit * sizeFor(actor) * depth;
            let width = height * box.w / box.h;
            const maxWidth = Math.min(fw * (narrow ? 0.3 : 0.185) * depth, fit.maxWidth ?? Infinity);
            if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
            // Keep the figure and its name plate inside the field.
            const half = Math.max(width, narrow ? 74 : 96) / 2 + 3;
            x = Math.min(100 - half / fw * 100, Math.max(half / fw * 100, x));
            const k = height / box.h; // screen px per source px
            const flipped = side === 'opponent';
            art.style.width = `${box.nw * k}px`; art.style.height = `${box.nh * k}px`;
            art.style.left = `${-(flipped ? box.nw - box.x - box.w : box.x) * k}px`;
            art.style.top = `${-box.y * k}px`;
            if (actor.pose) fitPose(actor);
            const lift = isFlyer(actor) ? Math.round(height * 0.07) : 0;
            card.style.setProperty('--x', x); card.style.setProperty('--y', y);
            card.style.setProperty('--w', Math.round(width)); card.style.setProperty('--h', Math.round(height));
            card.style.setProperty('--lift', lift);
            card.style.setProperty('--z', String(10 + Math.round(y)));
            card.classList.toggle('scene-flyer', lift > 0);
            card.classList.toggle('scene-cut', arena === 'comic' && COMIC_CUT.has(actor.id));
            card.classList.add('scene-laid-out');
            const panel = panels.find(p => p.card === card) || enemyBars.find(e => e.card === card);
            const plateH = $('.scene-plate', card)?.offsetHeight || 30;
            if (panel) {
                panel.bar.style.left = `${x}%`;
                panel.bar.style.top = `calc(${y}% + ${12 + plateH}px)`;
                panel.bar.classList.add('scene-laid-out');
            }
            // Where this fighter's pieces sit, in px from the top of the field.
            const foot = fh * y / 100;
            const barH = panel && !panel.bar.classList.contains('is-out') ? panel.bar.offsetHeight : 0;
            return { foot, height, lift, width, x: fw * x / 100, top: foot - height - lift, bottom: foot + 12 + plateH + barH, bar: panel && !panel.bar.classList.contains('is-out') ? panel.bar : null };
        }
        // Phones: the front fighter stands below the back pair's skill squares (never under them), and
        // the field grows tall enough for everything. Wider screens use the fixed formation.
        const STATUS_ROOM = 34; // status icons above a head
        let narrowHeight = 0, compactWidth = 0, compactRetry = false;
        // Team banners show only when they fit beside the energy bar (they never slide under it).
        function fitBanners() {
            const hudBox = $('.ready-section', ribbon); if (!hudBox) return;
            ribbon.classList.remove('scene-no-banners');
            const h = hudBox.getBoundingClientRect();
            const clash = $$('.scene-side-label', ribbon).some(label => { const r = label.getBoundingClientRect();
                return r.width > 0 && !(r.right <= h.left - 10 || h.right <= r.left - 10 || r.bottom <= h.top || h.bottom <= r.top); });
            ribbon.classList.toggle('scene-no-banners', clash);
        }
        const layoutAll = () => {
            const fw = field.clientWidth, fh = field.clientHeight;
            if (fw >= 700 || !fh) {
                if (narrowHeight) { narrowHeight = 0; field.style.removeProperty('--scene-narrow-h'); }
                // Wider screens keep the formation; the field only grows if the lowest skill bar would be cut off.
                let lowest = 0;
                const placed = new Map();
                for (const actor of actors.values()) { const r = layoutActor(actor); if (r) { placed.set(actor, r); lowest = Math.max(lowest, r.bottom); } }
                // The front fighter stands between the back pair; if their skill bars would cover it, centre it
                // in the gap between those bars and narrow it to fit.
                const fieldBox = field.getBoundingClientRect(), fieldTop = fieldBox.top, fieldLeft = fieldBox.left;
                for (const side of ['player', 'opponent']) {
                    const team = [...placed.keys()].filter(a => a.side === side);
                    const front = team.find(a => a.slot === 1); if (!front) continue;
                    const me = placed.get(front);
                    const bars = team.filter(a => a !== front).map(a => placed.get(a).bar).filter(Boolean).map(b => b.getBoundingClientRect())
                        .filter(r => r.bottom - fieldTop > me.top && r.top - fieldTop < me.foot);
                    // Bar edges in field coordinates (the field can sit inside a wider page).
                    const left = Math.max(0, ...bars.filter(r => r.left - fieldLeft + r.width / 2 < me.x).map(r => r.right - fieldLeft));
                    const right = Math.min(fw, ...bars.filter(r => r.left - fieldLeft + r.width / 2 >= me.x).map(r => r.left - fieldLeft));
                    if (me.x - me.width / 2 >= left + 4 && me.x + me.width / 2 <= right - 4) continue;
                    const r = layoutActor(front, undefined, { x: (left + right) / 2 / fw * 100, maxWidth: Math.max(60, right - left - 16) });
                    if (r) { placed.set(front, r); lowest = Math.max(lowest, r.bottom); }
                }
                // If any skill bar still runs into another bar or a fighter at this width, fold the bars into
                // compact squares (as on phones) and lay out again; unfold once the screen is wide enough.
                if (!compactRetry) {
                    const rect = el => el.getBoundingClientRect();
                    const apart = (a, b) => a.right <= b.left + 2 || b.right <= a.left + 2 || a.bottom <= b.top + 2 || b.bottom <= a.top + 2;
                    const barRects = [...placed.values()].map(r => r.bar).filter(Boolean).map(rect);
                    const figures = [...placed.keys()].filter(a => !a.card.classList.contains('scene-knocked-out')).map(a => rect(a.card));
                    const clash = barRects.some((b, i) => barRects.slice(i + 1).some(o => !apart(b, o)) || figures.some(f => !apart(b, f)));
                    const compact = field.classList.contains('scene-compact-bars');
                    if (clash && !compact) { compactWidth = fw; field.classList.add('scene-compact-bars'); compactRetry = true; layoutAll(); compactRetry = false; return; }
                    if (compact && fw > compactWidth + 120) { field.classList.remove('scene-compact-bars'); compactRetry = true; layoutAll(); compactRetry = false; return; }
                }
                const fit = lowest ? Math.ceil((lowest + 14) / 10) * 10 : 0;
                const current = parseFloat(field.style.getPropertyValue('--scene-fit-h')) || 0;
                if (fit > fh + 4 || (current && Math.abs(fit - current) > 20)) field.style.setProperty('--scene-fit-h', `${Math.max(fit, current && fit > fh ? fit : 0)}px`);
                fitBanners();
                updateEffectClip(); return;
            }
            field.classList.remove('scene-compact-bars'); compactWidth = 0;
            let needed = 0;
            for (const side of ['player', 'opponent']) {
                const team = [...actors.values()].filter(a => a.side === side);
                const front = team.find(a => a.slot === 1);
                let backBottom = 0;
                for (const actor of team) if (actor !== front) { const r = layoutActor(actor); if (r) backBottom = Math.max(backBottom, r.bottom); }
                if (!front) continue;
                const first = layoutActor(front); if (!first) continue;
                // The whole front fighter (and its status icons) starts below the lowest back square.
                const foot = Math.max(first.foot, backBottom + 10 + STATUS_ROOM + first.height + first.lift);
                const placed = layoutActor(front, foot / fh * 100);
                if (placed) needed = Math.max(needed, placed.bottom + 14);
            }
            // Grow (or shrink back) the field to fit, in whole steps so it settles in one more pass.
            const target = Math.max(640, Math.ceil(needed / 10) * 10);
            if (Math.abs(target - fh) > 4 && target !== narrowHeight) { narrowHeight = target; field.style.setProperty('--scene-narrow-h', `${target}px`); }
            updateEffectClip();
        };
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
            syncDamagePreview();
        }
        // While a skill is aimed, every glowing target shows what it would lose: "−30" over its
        // health bar and the matching slice of the bar blinking. Read from the game's own preview.
        function syncDamagePreview() {
            for (const card of allCards()) {
                const plate = $('.scene-plate', card), bar = $('.health-bar-container', plate || card);
                if (!plate || !bar) continue;
                let ghost = $('.scene-dmg-ghost', plate), chunk = $('.scene-dmg-chunk', bar);
                const total = card.classList.contains('targetable') ? $('.target-damage-preview-total', card) : null;
                const text = total?.textContent || '';
                const damage = Number(text.match(/(\d+)\s*damage/i)?.[1] || 0);
                const varies = !damage && /varies/i.test(text);
                if (!damage && !varies) { ghost?.remove(); chunk?.remove(); continue; }
                if (!ghost) { ghost = document.createElement('span'); ghost.className = 'scene-dmg-ghost'; ghost.setAttribute('aria-hidden', 'true'); plate.prepend(ghost); }
                if (varies) { if (ghost.textContent !== '−?') ghost.textContent = '−?'; ghost.className = 'scene-dmg-ghost is-varies'; chunk?.remove(); plate.classList.remove('scene-dmg-lethal'); continue; }
                if (!chunk) { chunk = document.createElement('span'); chunk.className = 'scene-dmg-chunk'; bar.append(chunk); }
                ghost.classList.remove('is-varies');
                const tip = total.parentElement;
                const effective = Boolean($('.is-effective', tip)), resisted = Boolean($('.is-resisted', tip));
                const label = `${/up to/i.test(text) ? 'up to ' : ''}−${damage}${effective ? '!' : ''}`;
                if (ghost.textContent !== label) ghost.textContent = label;
                ghost.classList.toggle('is-effective', effective); ghost.classList.toggle('is-resisted', resisted);
                const unit = state?.units?.[sideOf(card)]?.[actors.get(card)?.slot]?.unit;
                const hp = Number.isFinite(parseFloat(card.dataset.renderedHp)) ? parseFloat(card.dataset.renderedHp) : Number(unit?.hp ?? 100);
                const max = parseFloat(card.dataset.renderedDisplayMaxHp) || Number(unit?.maxHp) || 100;
                const now = Math.max(0, Math.min(100, hp / max * 100));
                const lost = Math.min(now, damage / max * 100);
                chunk.style.left = `${now - lost}%`; chunk.style.width = `${lost}%`;
                plate.classList.toggle('scene-dmg-lethal', damage >= hp);
            }
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
        // childList: the game pins its damage preview to a card right after marking it targetable.
        for (const card of allCards()) observer.observe(card, { attributes: true, attributeFilter: ['class'], childList: true });

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
            const actor = actors.get(card), art = actor?.art; if (!art?.animate) return;
            const tint = { hit: 'brightness(2.8) saturate(0)', heal: 'brightness(1.35) drop-shadow(0 0 16px #8dffb0)', buff: 'brightness(1.3) drop-shadow(0 0 14px #ffe08a)', debuff: 'brightness(.9) sepia(1) hue-rotate(220deg) saturate(2.6)' }[kind];
            const after = kind === 'hit' ? 'brightness(1.05) sepia(.45) saturate(2.4) hue-rotate(-32deg)' : tint;
            for (const el of [art, actor.pose].filter(Boolean)) el.animate([{ offset: 0.12, filter: tint }, { offset: 0.4, filter: after }], { duration: kind === 'hit' ? 420 : 700, easing: 'ease-out' });
        }
        function spark(card, heal) {
            const f = foot(card), r = field.getBoundingClientRect();
            const el = document.createElement('span'); el.className = `scene-spark${heal ? ' scene-spark-heal' : ''}`;
            el.style.left = `${f.x - r.left}px`; el.style.top = `${f.y - r.top - f.h * 0.55}px`; el.style.setProperty('--s', `${Math.max(60, f.h * 0.75)}px`);
            field.append(el);
            el.animate([{ transform: 'translate(-50%,-50%) scale(.2) rotate(0)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(1.15) rotate(25deg)', opacity: 0 }], { duration: 380, easing: 'cubic-bezier(.1,.8,.3,1)' })
                .finished.catch(() => {}).then(() => el.remove());
        }

        // Ranged skills fire a glowing shot in their element's colour from the caster to each target.
        // It lands on the same frame as the hit (impactAt), so the damage number and recoil meet it.
        const SHOT_COLORS = {
            fire: '#ff7a2a', hellfire: '#ff4618', solar: '#ffd23c', explosive: '#ff9a3a', water: '#3ca8ff', ice: '#a6ecff',
            electric: '#ffe53c', lightning: '#d2ecff', grass: '#62da5a', poison: '#b85ad8', toxin: '#94e23c', acid: '#bcf23c',
            psychic: '#ff5ac8', arcane: '#b47aff', illusion: '#d48aff', ghost: '#8c6ce0', dark: '#7a52a8', shadow: '#6a42a0',
            fear: '#ffd23c', willpower: '#3cff74', divine: '#fff2b0', blood: '#e0202e', drain: '#c03cff', dragon: '#6e5cff',
            fairy: '#ffaee4', flying: '#c8e4ff', steel: '#d8e2ec', rock: '#c8a46a', fighting: '#ff8a4a', bug: '#a6d83c',
            laser: '#ff3c5c', repulsor: '#a6ecff', portal: '#ffa040', gunfire: '#ffd88a', web: '#f4f4f4', gadget: '#7ad8ff',
            force: '#9ad0ff', 'force-choke': '#c03cff', 'dark-force': '#e0302e', 'fourth-wall': '#ff4a8a', normal: '#fff0cc',
        };
        const shotSeen = new Map();
        function shoot(actor, target, { element, area, launchIn, flight }) {
            const r = field.getBoundingClientRect(), a = foot(actor), b = foot(target);
            const from = { x: a.x - r.left, y: a.y - r.top - a.h * 0.55 }, to = { x: b.x - r.left, y: b.y - r.top - b.h * 0.5 };
            const dx = to.x - from.x, dy = to.y - from.y, angle = Math.atan2(dy, dx) * 180 / Math.PI;
            const color = SHOT_COLORS[element] || '#ffe7a0';
            const size = Math.max(24, Math.min(50, a.h * (area ? 0.3 : 0.2)));
            const volley = element === 'gunfire' ? 3 : 1;
            for (let n = 0; n < volley; n++) {
                const el = document.createElement('span');
                el.className = `scene-shot${area ? ' scene-shot-area' : ''}${volley > 1 ? ' scene-shot-bullet' : ''}`;
                el.style.setProperty('--shot', color); el.style.setProperty('--size', `${volley > 1 ? size * 0.5 : size}px`);
                el.style.left = `${from.x}px`; el.style.top = `${from.y}px`;
                const lift = area ? 0 : Math.min(40, Math.abs(dx) * 0.06); // a slight arc
                const delay = Math.max(0, launchIn - (volley - 1 - n) * 70);
                const at = (t, extra = '') => `translate(${dx * t}px,${dy * t - Math.sin(Math.PI * t) * lift}px) translate(-50%,-50%) rotate(${angle}deg)${extra}`;
                el.style.opacity = '0';
                field.append(el);
                const anim = el.animate([
                    { offset: 0, transform: at(0, ' scale(.4)'), opacity: 1 },
                    { offset: 0.15, transform: at(0.15, ' scale(1)'), opacity: 1 },
                    { offset: 0.5, transform: at(0.5) },
                    { offset: 1, transform: at(1, area ? ' scale(1.6,1.2)' : ' scale(1.1)'), opacity: 1 },
                ], { duration: flight, delay, easing: 'cubic-bezier(.45,.05,.85,.6)', fill: 'backwards' });
                anim.finished.catch(() => {}).then(() => {
                    el.remove();
                    if (n !== volley - 1) return;
                    const pop = document.createElement('span'); pop.className = 'scene-shot-pop';
                    pop.style.setProperty('--shot', color); pop.style.setProperty('--size', `${size * (area ? 3.2 : 2.4)}px`);
                    pop.style.left = `${to.x}px`; pop.style.top = `${to.y}px`;
                    field.append(pop);
                    pop.animate([{ transform: 'translate(-50%,-50%) scale(.2)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(1.25)', opacity: 0 }], { duration: 340, easing: 'cubic-bezier(.1,.8,.3,1)' })
                        .finished.catch(() => {}).then(() => pop.remove());
                });
            }
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
                // The shot: projectiles fly for the engine's travel time; area blasts sweep out during the wind-up.
                const ranged = profile && !melee && (delivery === 'projectile' || delivery === 'ranged' || delivery === 'area') && sideOf(t) !== sideOf(actor);
                const shotKey = `${castKey}>${sideOf(t)}${actors.get(t)?.slot}`;
                if (ranged && actors.has(t) && !(shotSeen.get(shotKey) > now - 900) && motionOK() && settingsAllowMotion()) {
                    shotSeen.set(shotKey, now);
                    if (shotSeen.size > 60) shotSeen.delete(shotSeen.keys().next().value);
                    const hit = impactAt.get(t);
                    const flight = profile.travel ? travel : Math.min(240, Math.max(140, hit - now - 40));
                    shoot(actor, t, { element: profile.element, area: delivery === 'area', launchIn: Math.max(0, hit - now - flight), flight });
                }
            });
            if (recentMotion.get(castKey) > now - 900) return; // one skill reported once per target
            recentMotion.set(castKey, now);
            if (recentMotion.size > 60) recentMotion.delete(recentMotion.keys().next().value);
            if (!motionOK() || !settingsAllowMotion()) return;
            // The attack pose from late in the wind-up until the strike has landed.
            const strikeEnds = melee ? windup + 140 + 170 : delivery === 'self' || !foe ? windup + 300 : windup + 280;
            setTimeout(() => showPose(actor, 'attack', strikeEnds - windup * 0.55), windup * 0.55);
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

        // ---- Poses ------------------------------------------------------------------------------------
        // Optional extra art per render (assets/images/poses, listed in assets/data/scene-poses.json):
        // an attack pose while striking, a hit pose when damaged, a ko pose while knocked out. The pose
        // sits exactly where the render is; fighters without pose art keep their normal movement.
        let poseBook = {};
        fetch('/assets/data/scene-poses.json?v=1', { cache: 'no-cache' }).then(r => (r.ok ? r.json() : null))
            .then(data => { poseBook = data?.poses || {}; for (const actor of actors.values()) preloadPoses(actor); }).catch(() => {});
        const renderKey = actor => { try { return decodeURIComponent(new URL(actor.art.currentSrc || actor.art.src, location.href).pathname).replace(/^\/+/, ''); } catch { return ''; } };
        const posesOf = actor => (actor?.art?.src ? poseBook[renderKey(actor)] : null) || null;
        const posePreloaded = new Set();
        function preloadPoses(actor) {
            for (const url of Object.values(posesOf(actor) || {})) if (!posePreloaded.has(url)) { posePreloaded.add(url); const img = new Image(); img.decoding = 'async'; img.src = url; }
        }
        function fitPose(actor) { for (const p of ['left', 'top', 'width', 'height']) actor.pose.style[p] = actor.art.style[p]; }
        function showPose(card, kind, ms) {
            const actor = actors.get(card), url = posesOf(actor)?.[kind];
            if (!url || (card.dataset.pose === 'ko' && kind !== 'ko')) return false;
            if (!actor.pose) { actor.pose = document.createElement('img'); actor.pose.className = 'scene-pose'; actor.pose.alt = ''; actor.pose.draggable = false; actor.body.append(actor.pose); }
            const img = actor.pose; fitPose(actor);
            clearTimeout(actor.poseTimer);
            card.dataset.pose = kind;
            const reveal = () => { if (card.dataset.pose === kind) card.classList.add('scene-posing'); };
            if (img.getAttribute('src') !== url) { img.onload = reveal; img.src = url; }
            if (img.complete && img.naturalWidth) reveal();
            if (Number.isFinite(ms)) actor.poseTimer = setTimeout(() => clearPose(card, kind), ms);
            return true;
        }
        function clearPose(card, kind) {
            const actor = actors.get(card); if (!actor || !card.dataset.pose || (kind && card.dataset.pose !== kind)) return;
            clearTimeout(actor.poseTimer); card.classList.remove('scene-posing'); delete card.dataset.pose;
        }
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
                flash(card, 'hit'); spark(card, false); showPose(card, 'hit', 480);
                if (Math.abs(amount) >= 25) shake(Math.abs(amount) / 25);
            }, delayFor(card));
        }
        function koMotion(card) {
            if (!actors.has(card)) return;
            const run = () => {
                card.classList.add('scene-falling');
                // A ko pose already lies down, so the figure only drops back instead of tipping over.
                const t = showPose(card, 'ko', Infinity) ? 0 : 1;
                const away = sideOf(card) === 'player' ? -1 : 1;
                if (motionOK()) {
                    play(card, [
                        { transform: 'none' },
                        { offset: 0.14, transform: `translate(${away * 34}px,-16px) rotate(${away * 10 * t}deg)` },
                        { offset: 0.5, transform: `translate(${away * 18}px,4px) rotate(${away * 16 * t}deg) scaleY(${t ? 0.9 : 0.97})` },
                        { transform: t ? `translateY(6px) rotate(${away * 12}deg) scaleY(.92)` : 'translateY(4px)' },
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

        // ---- Evolution scene -------------------------------------------------------------------------------
        // The field dims and a pillar of light in the Pokemon's type colours rises around it; it turns into a
        // glowing silhouette that flickers between its old and new forms, faster and faster, until a flash and
        // a shockwave reveal the evolved form. Banners call it like the games do.
        const TYPE_GLOW = { bug: '#a8d936', dark: '#8d7a6e', dragon: '#7867ff', electric: '#ffe45b', fairy: '#ff9de2', fighting: '#ff684e', fire: '#ff633f', flying: '#79bfff', ghost: '#9676dc', grass: '#68dd70', ground: '#d9a75f', ice: '#86f1ff', normal: '#e6e2d0', poison: '#cf70df', psychic: '#ff66aa', rock: '#cdb66c', steel: '#aabbd4', water: '#4e9dff' };
        const evolutionQueue = [];
        let evolutionBusy = false;
        function playEvolution(actor, before, newName, types) {
            evolutionQueue.push({ actor, before, newName, types });
            if (!evolutionBusy) nextEvolution();
        }
        function nextEvolution() {
            const job = evolutionQueue.shift();
            if (!job) { evolutionBusy = false; return; }
            evolutionBusy = true;
            const { actor, before, newName, types } = job;
            const card = actor.card;
            const colours = [].concat(types).map(t => TYPE_GLOW[String(t).toLowerCase()]).filter(Boolean);
            const a = colours[0] || '#7fe3ff', b = colours[1] || colours[0] || '#fff0a8';
            const fb = field.getBoundingClientRect();
            const r = before.rect;
            const cx = r.left + r.width / 2 - fb.left, foot = card.getBoundingClientRect().bottom - fb.top;
            const layer = document.createElement('div');
            layer.className = 'scene-evo';
            layer.style.setProperty('--evo-a', a); layer.style.setProperty('--evo-b', b);
            layer.style.setProperty('--evo-x', `${cx}px`); layer.style.setProperty('--evo-foot', `${foot}px`);
            layer.innerHTML = '<div class="scene-evo-dim"></div><div class="scene-evo-pillar"></div><div class="scene-evo-ground"><i></i><i></i><i></i></div>'
                + '<div class="scene-evo-sparks">' + Array.from({ length: 22 }, (_, i) => `<i style="--i:${i};--d:${(i * 137) % 1000}ms;--s:${0.6 + (i % 5) * 0.18}"></i>`).join('') + '</div>'
                + '<p class="scene-evo-banner"><span></span></p><div class="scene-evo-flash"></div><div class="scene-evo-wave"></div>';
            // The old form stays on screen as its own silhouette while the new render loads underneath.
            const ghost = document.createElement('img');
            ghost.className = 'scene-evo-old'; ghost.alt = ''; ghost.src = before.src;
            Object.assign(ghost.style, { left: `${r.left - fb.left}px`, top: `${r.top - fb.top}px`, width: `${r.width}px`, height: `${r.height}px`, transform: before.transform === 'none' ? '' : before.transform });
            layer.append(ghost);
            field.append(layer);
            card.classList.add('scene-evolving');
            const banner = $('.scene-evo-banner span', layer);
            banner.textContent = `What? ${before.name} is evolving!`;
            try { window.ArenaSceneSound?.('pokemon-evolution'); } catch { /* sound is optional */ }
            const finish = () => {
                card.classList.remove('scene-evolving', 'scene-evo-showing-new', 'scene-evo-revealed');
                layer.remove();
                layoutAll();
                nextEvolution();
            };
            if (!motionOK()) {
                card.classList.add('scene-evo-revealed');
                layer.classList.add('scene-evo-quick');
                banner.textContent = `${before.name} evolved into ${newName}!`;
                setTimeout(finish, 1600);
                return;
            }
            // Old and new silhouettes trade places, faster and faster.
            const beats = [520, 440, 360, 300, 240, 190, 150, 120, 95, 75, 60, 50, 42, 36];
            let t = 900, showNew = false;
            for (const gap of beats) {
                t += gap; showNew = !showNew; const now = showNew;
                setTimeout(() => { card.classList.toggle('scene-evo-showing-new', now); layer.classList.toggle('scene-evo-new', now); }, t);
            }
            setTimeout(() => { card.classList.add('scene-evo-showing-new'); layer.classList.add('scene-evo-new', 'scene-evo-charge'); }, t + 40);
            const reveal = t + 420;
            setTimeout(() => {
                layer.classList.add('scene-evo-boom');
                card.classList.add('scene-evo-revealed');
                banner.textContent = `${before.name} evolved into ${newName}!`;
                field.animate([{ translate: '0 0' }, { translate: '-6px 3px' }, { translate: '5px -4px' }, { translate: '-3px 2px' }, { translate: '0 0' }], { duration: 380, easing: 'ease-out' });
            }, reveal);
            setTimeout(finish, reveal + 2100);
        }

        // ---- State --------------------------------------------------------------------------------------
        function applyState(next) {
            if (!next?.match) return;
            state = next;
            const ownTurn = next.match.currentTurn === next.match.player?.username;
            const turnLabel = $('.scene-turn');
            const label = next.match.status === 'ended' ? 'BATTLE OVER' : ownTurn ? 'YOUR TURN' : 'ENEMY TURN';
            if (turnLabel.textContent !== label) {
                turnLabel.textContent = label;
                if (motionOK()) turnLabel.animate([{ transform: 'scale(.6)', opacity: 0, letterSpacing: '12px' }, { transform: 'scale(1.12)', opacity: 1, offset: 0.55 }, { transform: 'none', opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.2,.9,.3,1.2)' });
            }
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
                // Evolving during the match (not on a reload that is already evolved) plays the evolution scene.
                const evolutionKey = evolved || '';
                const evolvingNow = actor.evolutionKey !== undefined && evolutionKey && evolutionKey !== actor.evolutionKey && arena === 'pokemon';
                const before = evolvingNow ? { src: actor.art.currentSrc || actor.art.src, rect: actor.art.getBoundingClientRect(), transform: getComputedStyle(actor.art).transform, name: $('.scene-actor-name', card).textContent || name } : null;
                actor.evolutionKey = evolutionKey;
                if (source && actor.art.dataset.source !== source) {
                    actor.art.dataset.source = source; card.classList.remove('scene-portrait-fallback'); actor.bbox = null; actor.art.src = source;
                } else if (actor.bbox) layoutAll();
                if (before) playEvolution(actor, before, evolutionKey, entry.character?.pokemonTypes || entry.character?.types || []);
                $('.scene-actor-name', card).textContent = evolved || name;
                // Per-character gauges (Hulk's rage) belong on the plate with the health bar.
                const plate = $('.scene-plate', card), gauge = $('.rage-bar-container', card);
                if (gauge && gauge.parentNode !== plate) plate.append(gauge);
                face?.setAttribute('aria-label', `${evolved || name}, ${entry.unit.hp} health. Select fighter or skill target.`);
                card.classList.toggle('scene-knocked-out', entry.unit.alive === false || entry.unit.hp <= 0);
                if (card.dataset.pose === 'ko' && !card.classList.contains('scene-knocked-out')) clearPose(card, 'ko');
                preloadPoses(actor);
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
