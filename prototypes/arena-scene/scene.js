/* Private presentation adapter. Production script.js owns all combat and targeting. */
(() => {
    'use strict';
    if (!window.ARENA_SCENE_PREVIEW) return;
    const onReady = () => {
        const $ = (s, root = document) => root.querySelector(s);
        const $$ = (s, root = document) => [...root.querySelectorAll(s)];
        const params = new URLSearchParams(location.search);
        const arena = params.get('arena') === 'comic' ? 'comic' : 'pokemon';
        const isBattle = location.pathname.endsWith('ingame.html');
        document.body.classList.add(isBattle ? 'scene-battle' : 'scene-selection');
        const header = document.createElement('header'); header.className = 'scene-header';
        header.innerHTML = `<div><span class="scene-eyebrow">ADMIN LAB · BOT BATTLE</span><h1>${arena === 'pokemon' ? 'Pokémon' : 'Comic'} Arena <span>Living battlefield</span></h1></div><nav aria-label="Preview navigation"><a href="/arena-scene/?arena=pokemon" ${arena === 'pokemon' ? 'aria-current="page"' : ''}>Pokémon</a><a href="/arena-scene/?arena=comic" ${arena === 'comic' ? 'aria-current="page"' : ''}>Comic</a>${isBattle ? `<a href="/arena-scene/?arena=${arena}">Choose team</a>` : `<button type="button" class="scene-start">Fight the bot →</button>`}</nav>`;
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
        const stage = $('.ingame-stage'); if (!stage) return;
        const field = document.createElement('section'); field.className = 'scene-field'; field.setAttribute('aria-label', 'Battlefield');
        const ribbon = document.createElement('div'); ribbon.className = 'scene-ribbon';
        ribbon.innerHTML = '<span class="scene-side-label">YOUR TEAM</span><p class="scene-turn" role="status">Preparing the battlefield…</p><span class="scene-side-label">SPARRING BOT</span>';
        field.append(ribbon);
        for (const s of ['.player-characters', '.enemy-characters']) { const team = $(s); if (team) field.append(team); }
        const footer = document.createElement('section'); footer.className = 'scene-commandbar';
        footer.innerHTML = '<div class="scene-actions"><div class="scene-team-tabs" aria-label="Choose your fighter"></div><p class="scene-hint" aria-live="polite">Select a fighter, choose a skill, then select a highlighted target.</p><div class="scene-skills" aria-label="Fighter skills"></div><div class="scene-queue" aria-live="polite"></div></div><div class="scene-details"></div>';
        const hud = $('.game-hud');
        const ready = $('.ready-section');
        if (ready) { ready.tabIndex = 0; ready.setAttribute('role', 'button'); ready.setAttribute('aria-label', 'End your turn'); ready.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ready.click(); } }); }
 if (hud) footer.querySelector('.scene-actions').append(hud);
        const info = $('.skillinformation'); if (info) footer.querySelector('.scene-details').append(info);
        stage.prepend(header); stage.append(field, footer);
        const returnNote = document.createElement('p'); returnNote.className = 'scene-footnote'; returnNote.textContent = 'PRIVATE PREVIEW · Original battle engine · No rewards, rankings or mission progress'; stage.append(returnNote);
        const updateEffectClip = () => {
            const r = field.getBoundingClientRect();
            document.documentElement.style.setProperty('--scene-fx-clip', `inset(${Math.max(0,r.top)}px ${Math.max(0,innerWidth-r.right)}px ${Math.max(0,innerHeight-r.bottom)}px ${Math.max(0,r.left)}px)`);
        };
        new ResizeObserver(updateEffectClip).observe(field);
        window.addEventListener('scroll', updateEffectClip, { passive:true });
        window.addEventListener('resize', updateEffectClip, { passive:true });
        updateEffectClip();
        const teams = { player: $$('.player-characters .character-card'), opponent: $$('.enemy-characters .character-card') };
        let selected = 0, state = null;
        const labels = [];
        teams.player.forEach((card, slot) => {
            const tab = document.createElement('button'); tab.type = 'button'; tab.className = 'scene-team-tab'; tab.textContent = `Fighter ${slot + 1}`;
            tab.addEventListener('click', () => {
                selected = slot; card._showCharacterInfoFromPortrait?.(); syncControls();
            }); $('.scene-team-tabs').append(tab); labels.push(tab);
        });
        for (const [side, cards] of Object.entries(teams)) cards.forEach((card, slot) => {
            card.dataset.sceneSlot = String(slot); card.dataset.sceneSide = side;
            const art = document.createElement('img'); art.className = 'scene-actor-art'; art.alt = ''; art.draggable = false; art.setAttribute('aria-hidden', 'true');
            const label = document.createElement('span'); label.className = 'scene-actor-name';
            card.prepend(art); card.append(label);
            card.addEventListener('pointerdown', () => { if (side === 'player') { selected = slot; queueMicrotask(syncControls); } }, true);
            const face = $('.character-face', card);
            if (face) { face.setAttribute('tabindex', '0'); face.setAttribute('role', 'button'); face.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); face.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 })); }
            }); }
            art.addEventListener('error', () => {
                const portrait = face?.src;
                if (!portrait || art.src === portrait) return;
                card.classList.add('scene-portrait-fallback'); art.src = portrait;
            });
        });
        // Proxy these icons into a comfortable command bar without moving the
        // controller's originals out of their cards (all queue/cooldown logic stays intact).
        const skillButtons = Array.from({ length: 4 }, (_, index) => {
            const button = document.createElement('button'); button.type = 'button'; button.className = 'scene-skill';
            button.innerHTML = '<img alt=""><span class="scene-skill-name"></span><span class="scene-skill-state"></span>';
            button.addEventListener('click', () => {
                const original = $$('.skillimage', teams.player[selected])[index];
                if (original) original.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
                requestAnimationFrame(syncControls);
            }); $('.scene-skills').append(button); return button;
        });
        function renderSource(entry, owner) {
            const art = window.ArenaSceneArt; if (!art || !entry) return '';
            const id = String(entry.character?.characterId || entry.character?.id || '').toLowerCase();
            const baseId = String(entry.baseCharacter?.characterId || entry.baseCharacter?.id || id).toLowerCase();
            if (arena === 'comic') return art.source(art.comic[id] || art.comic[baseId]);
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
            const normalized = v => String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const chosen = formName && forms.find(f => normalized(f.name).includes(normalized(formName)) || normalized(f.label).includes(normalized(formName)));
            return art.source((chosen || forms[0])?.filename);
        }
        function syncControls() {
            const cards = teams.player;
            labels.forEach((button, i) => {
                button.classList.toggle('selected', selected === i); button.setAttribute('aria-pressed', String(selected === i));
                if (cards[i].classList.contains('scene-selected') !== (selected === i)) cards[i].classList.toggle('scene-selected', selected === i);
                button.textContent = $('.scene-actor-name', cards[i]).textContent || `Fighter ${i + 1}`;
            });
            const card = cards[selected]; if (!card) return;
            const images = $$('.skillimage', card);
            skillButtons.forEach((button, index) => {
                const source = images[index]; const image = $('img', button);
                if (source?.src && image.src !== source.src) image.src = source.src;
                const name = source?.alt && source.alt !== 'Skill' ? source.alt : state?.units?.player?.[selected]?.character?.skills?.[index]?.name || `Skill ${index + 1}`;
                $('.scene-skill-name', button).textContent = name;
                button.setAttribute('aria-label', name);
                button.disabled = !source || card.classList.contains('scene-knocked-out');
                const unavailable = source?.style.cursor === 'not-allowed';
                button.classList.toggle('scene-unavailable', unavailable);
                button.title = source?.title || (unavailable ? 'Unavailable this turn. Select to read its requirements.' : name);
                const badge = $(`.skill-cooldown-badge[data-skill-idx="${index}"]`, card);
                const cooldown = badge && getComputedStyle(badge).display !== 'none' ? badge.textContent.trim() : '';
                const queued = source?.classList.contains('selected-target');
                button.classList.toggle('scene-queued', queued);
                $('.scene-skill-state', button).textContent = queued ? 'QUEUED · tap to undo' : cooldown ? `Cooldown ${cooldown}` : '';
                button.classList.toggle('scene-on-cooldown', Boolean(cooldown));
            });
            const hasTargets = $$('.character-card.targetable').length > 0;
            $('.scene-hint').textContent = hasTargets ? 'Select a highlighted target to queue this skill.' : 'Select a fighter, choose a skill, then select a highlighted target.';
            const queued = Object.values(state?.match?.pendingTurn?.queuedByActorSlot || {});
            $('.scene-queue').textContent = queued.length ? `${queued.length} skill${queued.length === 1 ? '' : 's'} queued · Press ready to resolve your turn.` : 'Plan your turn · One skill per fighter';
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
        for (const card of [...teams.player, ...teams.opponent]) observer.observe(card, { attributes: true, attributeFilter: ['class'] });
        function applyState(next) {
            if (!next?.match) return;
            const previous = state; state = next;
            if (previous && next.match.turnNumber > previous.match.turnNumber && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
                for (const [side, cards] of Object.entries(teams)) cards.forEach((card, slot) => {
                    const currentHp = next.units[side]?.[slot]?.unit?.hp;
                    const oldHp = previous.units[side]?.[slot]?.unit?.hp;
                    if (currentHp < oldHp) $('.scene-actor-art', card).animate([
                        { transform: 'translateX(0)', filter: 'brightness(1)' },
                        { transform: `translateX(${side === 'player' ? '-9' : '9'}px)`, filter: 'brightness(1.8)' },
                        { transform: 'translateX(0)', filter: 'brightness(1)' },
                    ], { duration: 330, easing: 'ease-out' });
                });
                if (previous.match.currentTurn === previous.match.player?.username) {
                    for (const entry of Object.values(previous.match.pendingTurn?.queuedByActorSlot || {})) {
                        const card = teams.player[entry.actorSlot];
                        card?.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(35px)', offset: .35 }, { transform: 'translateX(0)' }], { duration: 440, easing: 'ease-in-out' });
                    }
                }
            }

            const ownTurn = next.match.currentTurn === next.match.player?.username;
            $('.scene-turn').textContent = next.match.status === 'ended' ? 'Battle complete' : ownTurn ? 'YOUR TURN · Plan your moves' : 'BOT TURN · Watch the battlefield';
            field.classList.toggle('scene-bot-turn', !ownTurn);
            for (const [side, cards] of Object.entries(teams)) cards.forEach((card, slot) => {
                const entry = next.units[side]?.[slot]; if (!entry) return;
                const art = $('.scene-actor-art', card), face = $('.character-face', card);
                const source = renderSource(entry, next.match[side]) || entry.character?.facePicture || face?.src;
                if (source && art.dataset.source !== source) { art.dataset.source = source; card.classList.remove('scene-portrait-fallback'); art.src = source; }
                const name = entry.character?.name || entry.baseCharacter?.name || `Fighter ${slot + 1}`;
                const evolution = (entry.unit?.state?.statuses || []).find(s => s.remainingTurns > 0 && /_evolution$/.test(s.id || ''));
                const evolved = String(evolution?.metadata?.tooltipText || '').match(/evolved into\s+([^.!]+)/i)?.[1];
                $('.scene-actor-name', card).textContent = evolved || name;
                face?.setAttribute('aria-label', `${evolved || name}, ${entry.unit.hp} health. Select fighter or skill target.`);
                card.classList.toggle('scene-knocked-out', entry.unit.alive === false || entry.unit.hp <= 0);
            });
            requestAnimationFrame(() => {
                for (const cards of Object.values(teams)) for (const card of cards) {
                    const hp = Number(card.dataset.renderedHp);
                    const max = Number(card.dataset.renderedDisplayMaxHp) || 100;
                    card.style.setProperty('--scene-health-percent', String(Math.max(0, Math.min(100, hp / max * 100))));
                }
                syncControls();
            });
        }
        window.addEventListener('arena-scene-state', event => applyState(event.detail));
        if (window.ArenaSceneState) applyState(window.ArenaSceneState);
        // Original skill metadata is attached after the first state arrives.
        requestAnimationFrame(syncControls);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onReady); else onReady();
})();
