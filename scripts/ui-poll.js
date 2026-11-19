// Player poll on the character select screen (selection.html): "Do you like the Experimental Battlefield?"
// One vote per account, changeable. After voting the card shows the results. Players who close the card
// without voting are not asked again on this device; a vote can still be changed by reopening it from the pill.
(function () {
    'use strict';
    const POLL_ID = 'experimental-battlefield-2026-11';
    const DISMISS_KEY = `poll-dismissed:${POLL_ID}`;
    const base = window.NARUTO_API_BASE_URL || `${location.protocol}//${location.host}`;
    const arena = () => (document.body.classList.contains('arena-mode-pokemon') || /arena=pokemon/.test(location.search) ? 'pokemon' : 'comic');
    const store = {
        get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
        set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } },
    };
    const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

    async function call(path, options) {
        const response = await fetch(`${base}${path}`, { credentials: 'include', ...options });
        if (!response.ok) throw new Error(String(response.status));
        return response.json();
    }

    let card = null, pill = null, state = null, busy = false;

    function render() {
        if (!card || !state) return;
        const body = card.querySelector('.ui-poll-body');
        body.textContent = '';
        if (!state.myVote) {
            const list = el('div', 'ui-poll-options');
            for (const option of state.options) {
                const button = el('button', 'ui-poll-option', option.label);
                button.type = 'button';
                button.addEventListener('click', () => vote(option.id));
                list.append(button);
            }
            body.append(list);
            return;
        }
        const total = Object.values(state.totals || {}).reduce((a, b) => a + b, 0) || 1;
        const list = el('div', 'ui-poll-results');
        for (const option of state.options) {
            const count = state.totals?.[option.id] || 0;
            const pct = Math.round((count / total) * 100);
            const row = el('button', `ui-poll-result${option.id === state.myVote ? ' mine' : ''}`);
            row.type = 'button';
            row.title = option.id === state.myVote ? 'Your vote' : 'Change your vote to this';
            row.style.setProperty('--pct', `${pct}%`);
            row.append(el('span', 'ui-poll-result-label', option.label), el('span', 'ui-poll-result-pct', `${pct}%`));
            row.addEventListener('click', () => { if (option.id !== state.myVote) vote(option.id); });
            list.append(row);
        }
        body.append(list, el('p', 'ui-poll-thanks', `Thanks for voting! ${total} ${total === 1 ? 'vote' : 'votes'} so far. Tap another answer to change yours.`));
    }

    async function vote(choice) {
        if (busy) return;
        busy = true; card.classList.add('busy');
        try {
            state = await call(`/api/polls/${POLL_ID}/vote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ choice, arena: arena() }) });
            render();
        } catch {
            card.querySelector('.ui-poll-body').append(el('p', 'ui-poll-error', 'Could not save your vote. Please try again.'));
        } finally {
            busy = false; card.classList.remove('busy');
        }
    }

    function open() { card.hidden = false; pill.hidden = true; pill.classList.remove('glow'); }
    function close() {
        card.hidden = true; pill.hidden = false;
        if (!state?.myVote) store.set(DISMISS_KEY, '1');
    }

    function build() {
        card = el('section', 'ui-poll');
        card.setAttribute('aria-label', 'Player poll');
        const head = el('div', 'ui-poll-head');
        head.append(el('span', 'ui-poll-tag', 'Poll'));
        const x = el('button', 'ui-poll-close', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Close the poll');
        x.addEventListener('click', close);
        head.append(x);
        card.append(head, el('h3', 'ui-poll-question', state.question), el('p', 'ui-poll-hint', state.hint), el('div', 'ui-poll-body'));
        pill = el('button', 'ui-poll-pill', 'Quick poll'); pill.type = 'button'; pill.setAttribute('aria-label', 'Open the poll: do you like the Experimental Battlefield?');
        pill.addEventListener('click', open);
        document.body.append(card, pill);
        render();
        const dismissed = store.get(DISMISS_KEY) === '1' && !state.myVote;
        const room = fit();
        // Open on its own only where it doesn't cover the game (beside the panel, or as the phone card);
        // otherwise it waits as a glowing pill.
        card.hidden = dismissed || Boolean(state.myVote) || room === 'none';
        pill.hidden = !card.hidden;
        pill.classList.toggle('glow', !state.myVote && !dismissed);
        addEventListener('resize', fit, { passive: true });
    }
    // Fit the card into the empty space left of the main panel when there is room.
    function fit() {
        const frame = document.querySelector('.as-frame');
        const phone = innerWidth <= 700;
        const gap = frame ? frame.getBoundingClientRect().left : 0;
        const width = Math.min(300, gap - 28);
        const room = phone ? 'phone' : width >= 210 ? 'side' : 'none';
        card.classList.toggle('in-gap', room === 'side');
        card.style.setProperty('--poll-w', room === 'side' ? `${Math.floor(width)}px` : '');
        return room;
    }

    async function start() {
        try { state = await call(`/api/polls/${POLL_ID}`); } catch { return; } // signed out or offline: no poll
        build();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
}());
