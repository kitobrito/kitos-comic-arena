/* EnergyFX: start-of-turn energy animation for Comic Arena and Pokémon Arena battles.
 *
 * When your turn starts, the energy you just gained appears over the battlefield as glowing
 * orbs and flies into its counter in your energy bar. Energy the enemy took from you since your
 * last turn plays first, in the same row:
 *   destroyed -> the orb cracks and shatters
 *   stolen    -> the orb is snatched across the field into the enemy who took it
 *
 * Data (from the match payload, see server.js buildMatchPayloadForUser):
 *   lastChakraGain[me]  the energy types granted for this turn
 *   energyLosses        [{ id, type, kind: 'destroyed' | 'stolen', toUsername, sourceSlot }]
 * script.js dispatches every match state as a 'battle-match-state' event. Presentation only:
 * nothing here changes the match.
 */
(function () {
    'use strict';
    const TYPES = ['taijutsu', 'bloodline', 'ninjutsu', 'genjutsu'];
    const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const state = { wasOwnTurn: null, seen: new Set(), primed: false, playing: false };

    const visible = (el) => { const r = el?.getBoundingClientRect?.(); return r && r.width > 0 && r.height > 0 ? r : null; };
    const counterFor = (type) => {
        for (const item of document.querySelectorAll(`.chakra-display .chakra-item[data-chakra="${type}"]`)) {
            const box = item.querySelector('.chakra-box') || item;
            if (visible(box)) return { item, box };
        }
        return null;
    };
    const centre = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    const arenaClass = () => (document.documentElement.classList.contains('arena-scene-preview') ? 'efx-preview'
        : document.body.classList.contains('arena-mode-pokemon') ? 'efx-pokemon' : 'efx-comic');

    /** Where the orbs appear: the middle of the battlefield. */
    function origin() {
        const field = visible(document.querySelector('.scene-field'));
        if (field) return { x: field.left + field.width / 2, y: field.top + field.height * 0.44 };
        const a = visible(document.querySelector('.player-characters')), b = visible(document.querySelector('.enemy-characters'));
        if (a && b) return { x: (a.right + b.left) / 2, y: (Math.min(a.top, b.top) + Math.max(a.bottom, b.bottom)) / 2 };
        const stage = visible(document.querySelector('.ingame-stage')) || { left: 0, top: 0, width: innerWidth, height: innerHeight };
        return { x: stage.left + stage.width / 2, y: stage.top + stage.height * 0.4 };
    }
    /** Where a stolen orb goes: the enemy who took it, else the enemy team. */
    function thief(loss) {
        const cards = document.querySelectorAll('.enemy-characters .character-card');
        const card = Number.isInteger(loss.sourceSlot) ? cards[loss.sourceSlot] : null;
        const r = visible(card?.querySelector('.character-face')) || visible(card) || visible(document.querySelector('.enemy-characters'));
        return { point: r ? centre(r) : { x: innerWidth * 0.8, y: innerHeight * 0.3 }, card };
    }
    function colourOf(type) {
        const box = counterFor(type)?.box || document.querySelector(`.chakra-item[data-chakra="${type}"] .chakra-box`);
        const c = box ? getComputedStyle(box).backgroundColor : '';
        return c && c !== 'rgba(0, 0, 0, 0)' ? c : ({ taijutsu: '#2fbf5b', bloodline: '#e0473b', ninjutsu: '#3b8be0', genjutsu: '#f2f2f2' }[type]);
    }
    const pulse = (el, bad = false) => el?.animate?.([
        { transform: 'scale(1)', filter: 'none' },
        { transform: 'scale(1.5)', filter: bad ? 'brightness(.6) sepia(1) hue-rotate(-40deg) saturate(4)' : 'brightness(1.9)', offset: 0.35 },
        { transform: 'scale(1)', filter: 'none' },
    ], { duration: 460, easing: 'ease-out' });

    // The match intro (VS screen) and the end-turn energy dialog cover the battlefield: wait them out.
    const covered = () => Boolean(document.querySelector('.battle-intro-overlay.visible') || document.body.classList.contains('end-turn-modal-open'));
    function play(batch, waited = 0) {
        if (covered() && waited < 9000) { setTimeout(() => play(batch, waited + 250), 250); return; }
        const { gains, losses } = batch;
        if (!gains.length && !losses.length) return;
        if (reducedMotion()) {
            gains.forEach((t) => pulse(counterFor(t)?.item));
            losses.forEach((l) => pulse(counterFor(l.type)?.item, true));
            return;
        }
        state.playing = true;
        const layer = document.createElement('div');
        layer.className = `efx-layer ${arenaClass()}`;
        layer.setAttribute('aria-hidden', 'true');
        document.body.append(layer);
        const o = origin();
        const destroyed = losses.filter((l) => l.kind !== 'stolen').length, stolen = losses.length - destroyed;
        const caption = document.createElement('div'); caption.className = 'efx-caption';
        caption.innerHTML = `<b>+${gains.length} ENERGY</b>${losses.length ? `<span>${[destroyed && `${destroyed} destroyed`, stolen && `${stolen} stolen`].filter(Boolean).join(' · ')}</span>` : ''}`;
        caption.style.left = `${o.x}px`; caption.style.top = `${o.y - 64}px`;
        layer.append(caption);

        // One row: the lost orbs first (they are dealt with first), then the new energy.
        const row = [...losses.map((loss) => ({ type: loss.type, loss })), ...gains.map((type) => ({ type }))];
        const gap = 52, start = o.x - (row.length - 1) * gap / 2;
        const orbs = row.map((entry, i) => {
            const el = document.createElement('span');
            el.className = `efx-orb${entry.loss ? ' efx-doomed' : ''}`;
            el.style.setProperty('--c', colourOf(entry.type));
            el.style.left = `${start + i * gap}px`; el.style.top = `${o.y}px`;
            layer.append(el);
            el.animate([{ transform: 'translate(-50%,-50%) scale(0)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.35)', opacity: 1, offset: 0.6 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }],
                { duration: 280, delay: i * 100, easing: 'cubic-bezier(.2,.9,.3,1.3)', fill: 'backwards' });
            return { ...entry, el, x: start + i * gap, y: o.y };
        });
        const appeared = 280 + row.length * 100 + 380;
        const lossTime = losses.length ? 760 + (losses.length - 1) * 160 : 0;
        const totalCaption = appeared + lossTime + 900;
        caption.animate([{ opacity: 0, transform: 'translate(-50%,10px) scale(.7)' }, { opacity: 1, transform: 'translate(-50%,0) scale(1.08)', offset: 0.12 },
            { opacity: 1, transform: 'translate(-50%,0) scale(1)', offset: 0.8 }, { opacity: 0, transform: 'translate(-50%,-14px)' }], { duration: totalCaption, easing: 'ease-out', fill: 'forwards' });

        const work = [];
        orbs.filter((orb) => orb.loss).forEach((orb, i) => {
            work.push(new Promise((done) => setTimeout(() => (orb.loss.kind === 'stolen' ? snatch(layer, orb) : shatter(layer, orb)).then(done), appeared + i * 160)));
        });
        orbs.filter((orb) => !orb.loss).forEach((orb, i) => {
            work.push(new Promise((done) => setTimeout(() => collect(orb).then(done), appeared + lossTime + i * 90)));
        });
        Promise.all(work).then(() => setTimeout(() => { layer.remove(); state.playing = false; }, 600));
    }

    function collect(orb) {
        const counter = counterFor(orb.type);
        const target = counter ? centre(counter.box.getBoundingClientRect()) : { x: orb.x, y: orb.y - 200 };
        const dx = target.x - orb.x, dy = target.y - orb.y;
        return orb.el.animate([
            { transform: 'translate(-50%,-50%) scale(1)', offset: 0 },
            { transform: 'translate(-50%,-50%) translateY(8px) scale(1.08)', offset: 0.12, easing: 'cubic-bezier(.5,0,.8,.4)' },
            { transform: `translate(-50%,-50%) translate(${dx * 0.42}px,${dy * 0.55 - 40}px) scale(.85)`, offset: 0.55 },
            { transform: `translate(-50%,-50%) translate(${dx}px,${dy}px) scale(.35)`, opacity: 0.9 },
        ], { duration: 640, fill: 'forwards' }).finished.catch(() => {}).then(() => { pulse(counter?.item); orb.el.remove(); });
    }

    function shatter(layer, orb) {
        const el = orb.el; el.classList.add('efx-cracking');
        return el.animate([
            { transform: 'translate(-50%,-50%) scale(1)' }, { transform: 'translate(calc(-50% - 3px),-50%) scale(1.05) rotate(-6deg)', offset: 0.2 },
            { transform: 'translate(calc(-50% + 3px),-50%) scale(1.1) rotate(6deg)', offset: 0.4 }, { transform: 'translate(-50%,-50%) scale(1.25)', filter: 'brightness(3)', offset: 0.75 },
            { transform: 'translate(-50%,-50%) scale(.2)', opacity: 0 },
        ], { duration: 520, easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {}).then(() => {
            const flash = document.createElement('span'); flash.className = 'efx-burst';
            flash.style.left = `${orb.x}px`; flash.style.top = `${orb.y}px`; layer.append(flash);
            flash.animate([{ transform: 'translate(-50%,-50%) scale(.3)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(1.6)', opacity: 0 }], { duration: 420, easing: 'ease-out', fill: 'forwards' });
            const shards = Array.from({ length: 8 }, (_, k) => {
                const s = document.createElement('span'); s.className = 'efx-shard'; s.style.setProperty('--c', getComputedStyle(el).getPropertyValue('--c'));
                s.style.left = `${orb.x}px`; s.style.top = `${orb.y}px`; layer.append(s);
                const a = (k / 8) * Math.PI * 2 + Math.random() * 0.5, d = 42 + Math.random() * 34;
                return s.animate([{ transform: 'translate(-50%,-50%) rotate(0) scale(1)', opacity: 1 },
                    { transform: `translate(-50%,-50%) translate(${Math.cos(a) * d}px,${Math.sin(a) * d + 26}px) rotate(${Math.random() * 300}deg) scale(.4)`, opacity: 0 }],
                { duration: 620, easing: 'cubic-bezier(.1,.7,.4,1)', fill: 'forwards' }).finished.catch(() => {}).then(() => s.remove());
            });
            const mark = document.createElement('span'); mark.className = 'efx-lost-label'; mark.textContent = 'DESTROYED';
            mark.style.left = `${orb.x}px`; mark.style.top = `${orb.y + 26}px`; layer.append(mark);
            mark.animate([{ opacity: 0, transform: 'translate(-50%,0)' }, { opacity: 1, transform: 'translate(-50%,6px)', offset: 0.2 }, { opacity: 1, offset: 0.7 }, { opacity: 0, transform: 'translate(-50%,10px)' }], { duration: 900, fill: 'forwards' });
            pulse(counterFor(orb.type)?.item, true);
            el.remove();
            return Promise.all(shards);
        });
    }

    function snatch(layer, orb) {
        const { point, card } = thief(orb.loss);
        const dx = point.x - orb.x, dy = point.y - orb.y;
        const el = orb.el; el.classList.add('efx-snatched');
        const label = document.createElement('span'); label.className = 'efx-lost-label efx-stolen-label'; label.textContent = 'STOLEN';
        label.style.left = `${orb.x}px`; label.style.top = `${orb.y + 26}px`; layer.append(label);
        label.animate([{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.6 }, { opacity: 0 }], { duration: 1000, fill: 'forwards' });
        // A streak traces the path the orb is yanked along.
        const streak = document.createElement('span'); streak.className = 'efx-streak';
        streak.style.left = `${orb.x}px`; streak.style.top = `${orb.y}px`;
        streak.style.width = `${Math.hypot(dx, dy)}px`; streak.style.transform = `rotate(${Math.atan2(dy, dx)}rad) scaleX(0)`;
        layer.append(streak);
        const rot = `rotate(${Math.atan2(dy, dx)}rad)`;
        streak.animate([{ transform: `${rot} scaleX(0)`, opacity: 0.9 }, { transform: `${rot} scaleX(1)`, opacity: 0.9 }], { duration: 490, delay: 210, easing: 'cubic-bezier(.7,0,.9,.3)', fill: 'forwards' });
        return el.animate([
            { transform: 'translate(-50%,-50%) scale(1)' },
            { transform: `translate(-50%,-50%) translate(${-dx * 0.06}px,${-dy * 0.06}px) scale(1.15)`, offset: 0.3, easing: 'cubic-bezier(.7,0,.9,.3)' },
            { transform: `translate(-50%,-50%) translate(${dx}px,${dy}px) scale(.45)`, opacity: 0.95 },
        ], { duration: 700, fill: 'forwards' }).finished.catch(() => {}).then(() => {
            streak.animate([{ transform: `${rot} scaleX(1)`, opacity: 0.9 }, { transform: `${rot} scaleX(1)`, opacity: 0 }], { duration: 380, fill: 'forwards' }).finished.catch(() => {}).then(() => streak.remove());
            const flash = document.createElement('span'); flash.className = 'efx-burst efx-burst-thief';
            flash.style.left = `${point.x}px`; flash.style.top = `${point.y}px`; flash.style.setProperty('--c', getComputedStyle(el).getPropertyValue('--c'));
            layer.append(flash);
            flash.animate([{ transform: 'translate(-50%,-50%) scale(.3)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(1.8)', opacity: 0 }], { duration: 480, easing: 'ease-out', fill: 'forwards' });
            const art = card?.querySelector('.scene-actor-art') || card?.querySelector('.character-face');
            art?.animate?.([{ filter: 'brightness(1)' }, { filter: 'brightness(1.8) saturate(1.4)', offset: 0.3 }, { filter: 'brightness(1)' }], { duration: 420 });
            pulse(counterFor(orb.type)?.item, true);
            el.remove();
        });
    }

    /** Called with every match state. Plays once when your turn starts. */
    function onState(match) {
        if (!match?.player?.username) return;
        const me = match.player.username;
        const ownTurn = match.status !== 'ended' && match.currentTurn === me;
        const losses = (Array.isArray(match.energyLosses) ? match.energyLosses : []).filter((l) => l && TYPES.includes(l.type));
        if (!state.primed) {
            // Joining mid-match (or reloading) must not replay old energy; the opening turn still plays.
            state.primed = true;
            losses.forEach((l) => state.seen.add(l.id));
            if (ownTurn && (Number(match.turnNumber) || 0) <= 1) {
                const gains = (match.lastChakraGain?.[me] || []).filter((t) => TYPES.includes(t));
                setTimeout(() => play({ gains, losses: [] }), 1500);
            }
            state.wasOwnTurn = ownTurn;
            return;
        }
        if (ownTurn && state.wasOwnTurn === false) {
            const fresh = losses.filter((l) => !state.seen.has(l.id));
            fresh.forEach((l) => state.seen.add(l.id));
            const gains = (match.lastChakraGain?.[me] || []).filter((t) => TYPES.includes(t));
            // Let the enemy's attacks land first.
            setTimeout(() => play({ gains, losses: fresh }), 1100);
        }
        state.wasOwnTurn = ownTurn;
    }

    window.addEventListener('battle-match-state', (event) => onState(event.detail));
    window.EnergyFX = { play, _state: state };
}());
