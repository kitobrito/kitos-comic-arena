/*
 * User interface layouts (Settings > User interface).
 *
 * Loaded synchronously in the <head> of selection.html and ingame.html, before any stylesheet
 * that depends on the layout classes. Each page has a few layouts; the player's choice is saved
 * in localStorage and applied here as classes on <html>. A ?layout= in the address still wins
 * (old links and the e2e tests use it).
 *
 *   Character select (selection.html)
 *     arena         the arena select screen (default)          html.selection-experimental.selection-mockup
 *     scroll        the scroll layout (Naruto-Arena style)     html.selection-scroll
 *     experimental  the previous new interface                 html.selection-experimental
 *     classic       the oldest interface                       (no class)
 *   In-game (ingame.html)
 *     arena         the battle interface (default)             html.battle-experimental
 *     scroll        the scroll layout (Naruto-Arena style)     html.battle-scroll
 *     battlefield   the experimental battlefield (beta)        html.arena-scene-preview... (localStorage battleExperimentalView)
 *     classic       the oldest interface                       (no class)
 */
(function () {
    'use strict';

    var KEYS = { selection: 'uiLayout.selection', ingame: 'uiLayout.ingame' };
    var OPTIONS = {
        selection: [
            { id: 'arena', name: 'Arena', blurb: 'The arena select screen: a big character stage, the roster below, and a Start Match button.' },
            { id: 'scroll', name: 'Scroll', blurb: 'The classic arena look: a roster scroll with your team, Ladder, Quick and Private game buttons above it.', badge: 'New' },
            { id: 'experimental', name: 'Experimental', blurb: 'The previous new interface, with a larger roster and the toolbar on top.' },
            { id: 'classic', name: 'Classic', blurb: 'The original small interface.' },
        ],
        ingame: [
            { id: 'arena', name: 'Arena', blurb: 'The battle interface: a framed board with the skill panel along the bottom.' },
            { id: 'scroll', name: 'Scroll', blurb: 'The classic arena look: skill scrolls beside each character, the opponent’s team on the right, and scroll buttons at the bottom.', badge: 'New' },
            { id: 'battlefield', name: 'Experimental battlefield', blurb: 'Your characters stand on a 3D battlefield and act out their skills.', badge: 'Beta' },
            { id: 'classic', name: 'Classic', blurb: 'The original small interface.' },
        ],
    };

    var read = function (key) { try { return localStorage.getItem(key); } catch (e) { return null; } };
    var write = function (key, value) { try { localStorage.setItem(key, value); } catch (e) { /* storage blocked */ } };
    var valid = function (page, id) { return OPTIONS[page].some(function (o) { return o.id === id; }); };

    // The stored choice for a page. The old Experimental battlefield switch (battleExperimentalView)
    // counts as choosing the battlefield.
    var get = function (page) {
        var stored = read(KEYS[page]);
        if (valid(page, stored)) return stored;
        if (page === 'ingame' && read('battleExperimentalView') === '1') return 'battlefield';
        return 'arena';
    };
    var set = function (page, id) {
        if (!valid(page, id)) return;
        write(KEYS[page], id);
        // Keep the old battlefield switch in step, since ingame.html and the scene still read it.
        if (page === 'ingame') write('battleExperimentalView', id === 'battlefield' ? '1' : '0');
    };

    // The layout this page load uses: ?layout= first, then the saved choice.
    var urlLayout = function () {
        try { return new URLSearchParams(window.location.search).get('layout') || ''; } catch (e) { return ''; }
    };
    var current = function (page) {
        var forced = urlLayout();
        if (page === 'selection' && ['classic', 'experimental', 'scroll', 'arena', 'mockup'].indexOf(forced) >= 0) return forced === 'mockup' ? 'arena' : forced;
        if (page === 'ingame' && ['classic', 'experimental', 'scroll', 'arena'].indexOf(forced) >= 0) return forced === 'experimental' ? 'arena' : forced;
        return get(page);
    };

    var root = document.documentElement;
    var page = /ingame\.html$/i.test(window.location.pathname) || root.hasAttribute('data-ui-page-ingame') ? 'ingame' : 'selection';
    var layout = current(page);
    if (page === 'selection') {
        if (layout === 'arena') root.classList.add('selection-experimental', 'selection-mockup');
        else if (layout === 'experimental') root.classList.add('selection-experimental');
        else if (layout === 'scroll') root.classList.add('selection-scroll');
    } else {
        // The battlefield (beta) is switched on by ingame.html's own head script from battleExperimentalView.
        if (layout === 'arena' || layout === 'battlefield') root.classList.add('battle-experimental');
        else if (layout === 'scroll') root.classList.add('battle-scroll');
    }
    root.setAttribute('data-ui-layout', layout);

    window.ArenaUiLayout = { KEYS: KEYS, OPTIONS: OPTIONS, get: get, set: set, current: current, page: page, layout: layout };
})();
