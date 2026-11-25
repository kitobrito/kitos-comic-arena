/*
 * The Scroll layout of the character select (Settings > User interface > Character select > Scroll),
 * laid out like the classic arena screen: background art, four game buttons, and a roster scroll
 * with the player card and team on the right.
 *
 * Like scripts/arena-select-ui.js, it keeps every original element (scripts/script.js owns the
 * behaviour) and only adds a few controls that drive them: the top bar (menu, News, the arena
 * switch, volume), the FILTER / MISSIONS / STYLES / STORE buttons, the player card's text lines,
 * and the "ready" line. Positions are on a 993 x 729 stage (styles/selection-scroll.css), scaled
 * to fit the window.
 */
(function () {
    'use strict';

    var root = document.documentElement;
    if (!root.classList.contains('selection-scroll')) return;
    var background = document.querySelector('.background');
    var page = document.querySelector('.selectionpage');
    if (!background || !page) return;

    var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
    var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
    var el = function (tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
    var isPokemon = function () { return document.body.classList.contains('arena-mode-pokemon'); };
    var click = function (sel) { var n = $(sel); if (n) n.click(); };

    // ---- Fit the 993 x 729 stage to the window (centred, never cropped).
    var W = 993, H = 729;
    var fit = function () {
        var k = Math.min(window.innerWidth / W, window.innerHeight / H);
        k = Math.max(0.3, Math.min(k, 2));
        root.style.setProperty('--ss-k', k.toFixed(4));
        root.style.setProperty('--ss-x', Math.max(0, (window.innerWidth - W * k) / 2).toFixed(1) + 'px');
        root.style.setProperty('--ss-y', Math.max(0, (window.innerHeight - H * k) / 2).toFixed(1) + 'px');
    };
    fit();
    window.addEventListener('resize', fit);

    // ---- The roster scroll (drawn behind the roster) and the game-button labels.
    page.insertBefore(el('div', 'ss-panel', '<i class="ss-panel-paper"></i>'), page.firstChild);
    var labels = { 'logout-button': 'LOGOUT', 'ladder-button': 'START LADDER GAME', 'quick-button': 'START QUICK GAME', 'private-button': 'START PRIVATE GAME' };
    Object.keys(labels).forEach(function (cls) {
        var b = $('.' + cls);
        if (b) b.insertAdjacentHTML('beforeend', '<span class="ss-plaque"><b>' + labels[cls] + '</b><i class="ss-emblem" aria-hidden="true"></i></span>');
    });

    // ---- Top bar: menu, News, the arena switch, volume.
    var bar = el('div', 'ss-topbar');
    bar.innerHTML = '<button type="button" class="ss-menu-btn" aria-label="Menu" aria-expanded="false"><i></i><i></i><i></i></button>'
        + '<button type="button" class="ss-pill ss-news">NEWS</button>'
        + '<div class="ss-pill ss-arena" role="group" aria-label="Arena"></div>'
        + '<nav class="ss-menu" hidden></nav>';
    page.appendChild(bar);
    $('.ss-news', bar).addEventListener('click', function () { click('#ingame-news-toggle'); });
    // The arena switch becomes the two-flag pill: Comic | Pokemon (Shattered TCG in the menu).
    var arenaPill = $('.ss-arena', bar);
    [['comic', 'COMIC'], ['pokemon', 'POKÉMON']].forEach(function (a) {
        var b = el('button', 'ss-arena-btn', '<i class="ss-flag ss-flag-' + a[0] + '"></i>' + a[1]);
        b.type = 'button';
        b.dataset.arena = a[0];
        b.addEventListener('click', function () { click('.arena-mode-button[data-arena-mode="' + a[0] + '"]'); setTimeout(syncArena, 50); });
        arenaPill.appendChild(b);
    });
    var syncArena = function () {
        $$('.ss-arena-btn', bar).forEach(function (b) { b.classList.toggle('on', (b.dataset.arena === 'pokemon') === isPokemon()); });
    };
    syncArena();
    new MutationObserver(syncArena).observe(document.body, { attributes: true, attributeFilter: ['class'] });

    // The menu: everything the four buttons and the roster don't cover.
    var menu = $('.ss-menu', bar);
    var menuBtn = $('.ss-menu-btn', bar);
    var item = function (label, fn) { var b = el('button', 'ss-menu-item', label); b.type = 'button'; b.addEventListener('click', function () { setMenu(false); fn(); }); menu.appendChild(b); return b; };
    var setMenu = function (on) { menu.hidden = !on; menuBtn.setAttribute('aria-expanded', String(on)); };
    menuBtn.addEventListener('click', function (e) { e.stopPropagation(); setMenu(menu.hidden); });
    document.addEventListener('click', function (e) { if (!menu.hidden && !menu.contains(e.target) && e.target !== menuBtn) setMenu(false); });
    item('Home', function () { window.location.href = isPokemon() ? 'pokemon-home.html' : '/'; });
    item('News', function () { click('#ingame-news-toggle'); });
    item('Store', function () { click('.experimental-store-toggle'); });
    item('Missions + Skins', function () { click('.selection-missions-toggle'); });
    item('Shattered TCG', function () { click('.arena-mode-button[data-arena-mode="shattered"]'); });
    var musicItem = item('Music: on', function () { click('.sound-controller .music-mute-button'); setTimeout(syncMusic, 50); });
    var syncMusic = function () { var m = $('.sound-controller .music-mute-button'); musicItem.textContent = 'Music: ' + (m && /unmute|off/i.test((m.getAttribute('aria-label') || '') + m.className + m.textContent) ? 'off' : 'on'); };
    syncMusic();
    item('Fullscreen', function () { click('.selection-fullscreen-toggle'); });
    item('User interface', function () { if (window.ArenaUiLayoutSettings) window.ArenaUiLayoutSettings.open('selection'); });
    item('Log out', function () { click('.logout-button'); });
    // Draft Pick/Ban keeps its own checkbox button, in the menu.
    var draft = $('.draft-mode-check-wrap');
    if (draft) menu.appendChild(draft);

    // ---- The buttons along the bottom of the scroll, and the team manager button.
    var foot = function (cls, label, fn) { var b = el('button', 'ss-foot ' + cls, '<i aria-hidden="true">◆</i>' + label); b.type = 'button'; b.addEventListener('click', fn); page.appendChild(b); return b; };
    var filterBtn = foot('ss-filter', 'FILTER', function (e) { e.stopPropagation(); document.body.classList.toggle('ss-filters-open'); });
    document.addEventListener('click', function (e) {
        if (!document.body.classList.contains('ss-filters-open')) return;
        if (e.target.closest('.roster-filter-panel') || e.target === filterBtn) return;
        document.body.classList.remove('ss-filters-open');
    });
    foot('ss-missions', 'MISSIONS', function () { click('.selection-missions-toggle'); });
    foot('ss-styles', 'STYLES', function () { if (window.ArenaUiLayoutSettings) window.ArenaUiLayoutSettings.open('selection'); });
    var store = el('button', 'ss-teambtn', 'STORE');
    store.type = 'button';
    store.addEventListener('click', function () { click('.experimental-store-toggle'); });
    page.appendChild(store);

    // ---- The player card's text, one line each: NAME / RANK / CLAN / LEVEL / LADDERRANK / RATIO.
    var card = $('.player-card');
    var info = el('div', 'ss-info');
    if (card) card.appendChild(info);
    var stat = function (key) { var n = $('.player-stat[data-player-stat="' + key + '"] strong'); return n ? n.textContent.trim() : ''; };
    var renderInfo = function () {
        var name = ($('.player-nameselection') || {}).textContent || '';
        var exp = stat('experience');            // "0 XP · Lv 1"
        var xp = (exp.match(/([\d,]+)\s*XP/i) || [])[1] || '0';
        var lv = (exp.match(/Lv\.?\s*(\d+)/i) || [])[1] || '1';
        var rec = stat('record');                // "0 W · 13 L"
        var w = (rec.match(/(\d+)\s*W/i) || [])[1] || '0';
        var l = (rec.match(/(\d+)\s*L/i) || [])[1] || '0';
        var streak = stat('streak') || '+0';
        var clan = stat('clan');
        var ladder = stat('ladder');
        var lines = [name.trim(), stat('rank'), 'CLAN: ' + (!clan || /^none$/i.test(clan) ? 'CLANLESS' : clan), 'LEVEL: ' + lv + ' (' + xp + ' XP)',
            'LADDERRANK: ' + (ladder || 'UNRANKED'), 'RATIO: ' + w + ' - ' + l + ' (' + streak + ')'];
        info.innerHTML = lines.map(function (t, i) { return '<div class="ss-line' + (i === 0 ? ' ss-name' : '') + (t.length > 19 ? ' tight' : '') + '">' + t.replace(/[<>&]/g, '') + '</div>'; }).join('');
    };
    renderInfo();
    var infoSrc = $('.player-infoselection');
    if (infoSrc) new MutationObserver(renderInfo).observe(infoSrc, { subtree: true, childList: true, characterData: true });

    // ---- "YOU ARE READY TO START A GAME" (or how many more to pick), unless the page has its own message.
    var ready = el('p', 'ss-ready');
    page.appendChild(ready);
    var status = $('.selection-team-status');
    var renderReady = function () {
        var own = status ? status.textContent.trim() : '';
        var picked = $$('.selected-character-slot').filter(function (s) { return s.querySelector('img.selected-slot-image'); }).length;
        ready.textContent = own || (picked >= 3 ? 'YOU ARE READY TO START A GAME' : 'SELECT ' + (3 - picked) + ' MORE CHARACTER' + (3 - picked === 1 ? '' : 'S'));
        ready.classList.toggle('long', ready.textContent.length > 32);
    };
    renderReady();
    var slots = $('.selected-character-slot-list');
    if (slots) new MutationObserver(renderReady).observe(slots, { subtree: true, childList: true, attributes: true, attributeFilter: ['src', 'class'] });
    if (status) new MutationObserver(renderReady).observe(status, { subtree: true, childList: true, characterData: true });
})();
