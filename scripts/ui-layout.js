/*
 * User interface layouts (Settings > User interface).
 *
 * Loaded synchronously in the <head> of selection.html and ingame.html, before any stylesheet
 * that depends on the layout classes. Each page has a few layouts; the player's choice is saved
 * in localStorage and applied here as classes on <html>. A ?layout= in the address still wins
 * (old links and the e2e tests use it).
 *
 *   Character select (selection.html)
 *     arena         Classic select screen (default)          html.selection-experimental.selection-mockup
 *     scroll        Naruto-Arena layout     html.selection-scroll
 *     experimental  'Cheshy': large roster, toolbar top-right       html.selection-experimental
 *   In-game (ingame.html)
 *     arena         Classic battle interface (default)             html.battle-experimental
 *     scroll        Naruto-Arena layout     html.battle-scroll
 *     battlefield   the experimental battlefield (beta)        html.arena-scene-preview... (localStorage battleExperimentalView)
 */
(function () {
    'use strict';

    var KEYS = { selection: 'uiLayout.selection', ingame: 'uiLayout.ingame' };
    var OPTIONS = {
        selection: [
            { id: 'arena', name: 'Classic', blurb: 'A big character stage, the roster below, and a Start Match button.' },
            { id: 'scroll', name: 'Naruto-Arena', blurb: 'A roster scroll with your team, Ladder, Quick and Private game buttons above it.' },
            { id: 'experimental', name: 'Cheshy', blurb: 'A large roster along the bottom, the character stage up top and the toolbar in the corner.' },
        ],
        ingame: [
            { id: 'arena', name: 'Classic', blurb: 'The battle interface: a framed board with the skill panel along the bottom.' },
            { id: 'scroll', name: 'Naruto-Arena', blurb: 'Skill scrolls beside each character, the opponent’s team on the right, and scroll buttons at the bottom.' },
            { id: 'battlefield', name: 'Experimental battlefield', blurb: 'Your characters stand on a 3D battlefield and act out their skills.', badge: 'Beta' },
        ],
    };

    var read = function (key) { try { return localStorage.getItem(key); } catch (e) { return null; } };
    var write = function (key, value) { try { localStorage.setItem(key, value); } catch (e) { /* storage blocked */ } };
    var valid = function (page, id) { return OPTIONS[page].some(function (o) { return o.id === id; }); };

    // The stored choice for a page. The old Experimental battlefield switch (battleExperimentalView)
    // counts as choosing the battlefield.
    var get = function (page) {
        var stored = read(KEYS[page]);
        // The retired small layout used this key before Classic became the default.
        if (stored === 'classic') {
            set(page, 'arena');
            return 'arena';
        }
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
        var forced = urlLayout().toLowerCase();
        if (forced === 'classic' || (page === 'selection' && forced === 'mockup') ||
            (page === 'ingame' && forced === 'experimental')) return 'arena';
        if (forced === 'naruto-arena') return 'scroll';
        if (valid(page, forced)) return forced;
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
