/*
 * Arena select screen ("mockup" layout) for Comic Arena + Pokemon Arena.
 *
 * selection.html keeps all of its original markup and scripts/script.js keeps
 * owning every behaviour (roster, previews, team slots, matchmaking, store,
 * draft, news...). This file only builds the new shell around it and MOVES the
 * existing live elements into it, so every handler script.js attached keeps
 * working. New controls (match option picker, START MATCH, arrows, dots,
 * rankings, games switcher) drive the original elements.
 *
 * Opt out with ?layout=experimental (previous UI) or ?layout=classic.
 */
(function () {
    'use strict';

    var root = document.documentElement;
    if (!root.classList.contains('selection-mockup')) return;
    var background = document.querySelector('.background');
    var slotList = document.querySelector('.slot-list');
    if (!background || !slotList) return;

    var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
    var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
    var el = function (tag, cls, html) {
        var node = document.createElement(tag);
        if (cls) node.className = cls;
        if (html != null) node.innerHTML = html;
        return node;
    };
    var store = {
        get: function (key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
        set: function (key, value) { try { localStorage.setItem(key, value); } catch (e) {} },
    };
    var isPokemon = function () { return document.body.classList.contains('arena-mode-pokemon'); };

    var ICONS = {
        home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2 11.5h3V21h5.5v-6h3v6H19v-9.5h3z" fill="currentColor"/></svg>',
        trophy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v2h3v3a5 5 0 0 1-4.6 5A6 6 0 0 1 13 16.9V19h4v2H7v-2h4v-2.1A6 6 0 0 1 7.6 13 5 5 0 0 1 3 8V5h3zm0 4H5v1a3 3 0 0 0 1.4 2.5A8 8 0 0 1 6 8zm12 0v1c0 .9-.1 1.7-.4 2.5A3 3 0 0 0 19 8V7z" fill="currentColor"/></svg>',
        gear: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.4 13a7.6 7.6 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3h-4l-.4 2.9a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.4 7.4 0 0 0 1.7 1L11 21h4l.4-2.9a7.4 7.4 0 0 0 1.7-1l2.5 1 2-3.5zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" fill="currentColor"/></svg>',
        games: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z" fill="currentColor"/></svg>',
        bolt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2 5 14h6l-2 8 9-12h-6z" fill="currentColor"/></svg>',
        lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3h1.5v11h-13V10zm2 0h6V7a3 3 0 0 0-6 0zm3 3.5a1.6 1.6 0 0 0-.8 3V18h1.6v-1.5a1.6 1.6 0 0 0-.8-3z" fill="currentColor"/></svg>',
        burger: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v2.4H4zm0 4.8h16v2.4H4zm0 4.8h16V18H4z" fill="currentColor"/></svg>',
        chevL: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 4 7.5 12l8 8 1.9-1.9-6.1-6.1 6.1-6.1z" fill="currentColor"/></svg>',
        chevR: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 4 6.6 5.9l6.1 6.1-6.1 6.1L8.5 20l8-8z" fill="currentColor"/></svg>',
        store: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7V6a5 5 0 0 1 10 0v1h3.5l-1.3 14.5H4.8L3.5 7zm2 0h6V6a3 3 0 0 0-6 0zm-1 3.2a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4zm8 0a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z" fill="currentColor"/></svg>',
        missions: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 2h2v1.2c3.2-1.4 5.6.9 8.7-.2l1.3-.5v10.9l-.6.3c-3.7 1.6-6.3-.8-9.4.4V22H5zm2 3.4v6.4c3-.9 5.5 1 8 .3V5.4c-2.6.6-5-1.2-8 0z" fill="currentColor"/></svg>',
        info: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1.2 15h-2.4v-6.5h2.4zM12 8.9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" fill="currentColor"/></svg>',
    };

    /* ------------------------------------------------------------------ shell */
    var shell = el('div', 'as-shell');
    shell.innerHTML = [
        '<div class="as-frame">',
        '  <header class="as-header">',
        '    <a class="as-brand" href="/" aria-label="Home"><span class="as-ball as-ball-logo" aria-hidden="true"></span>',
        '      <span class="as-title"><span class="as-title-a">COMIC-</span><span class="as-title-b">ARENA</span></span></a>',
        '    <nav class="as-nav" aria-label="Main">',
        '      <a class="as-navbtn" data-as-nav="home" href="/">' + ICONS.home + '<span>HOME</span></a>',
        '      <button type="button" class="as-navbtn" data-as-nav="rankings">' + ICONS.trophy + '<span>RANKINGS</span></button>',
        '      <button type="button" class="as-navbtn" data-as-nav="settings" aria-expanded="false">' + ICONS.gear + '<span>SETTINGS</span></button>',
        '      <button type="button" class="as-navbtn" data-as-nav="games" aria-expanded="false">' + ICONS.games + '<span>GAMES</span></button>',
        '    </nav>',
        '    <button type="button" class="as-burger" aria-label="Menu" aria-expanded="false">' + ICONS.burger + '</button>',
        '  </header>',
        '  <section class="as-panel as-select">',
        '    <h2 class="as-heading"><span>SELECT YOUR CHARACTER</span></h2>',
        '    <div class="as-feature">',
        '      <div class="as-stage"><div class="as-stage-glow" aria-hidden="true"></div></div>',
        '      <div class="as-info">',
        '        <div class="as-player"><span class="as-avatar"></span><span class="as-player-name"></span></div>',
        '        <dl class="as-stats"></dl>',
        '      </div>',
        '      <button type="button" class="as-arrow as-prev" aria-label="Previous character">' + ICONS.chevL + '</button>',
        '      <button type="button" class="as-arrow as-next" aria-label="Next character">' + ICONS.chevR + '</button>',
        '      <button type="button" class="as-skills-btn" aria-label="View skills" title="View skills">' + ICONS.info + '</button>',
        '      <div class="as-dots" role="group" aria-label="Character form"></div>',
        '    </div>',
        '  </section>',
        '  <section class="as-panel as-roster">',
        '    <h2 class="as-heading"><span><span class="as-only-pokemon">YOUR POK&Eacute;MON</span><span class="as-only-comic">YOUR CHARACTERS</span></span></h2>',
        '    <div class="as-roster-scroll"></div>',
        '    <button type="button" class="as-arrow as-rpage as-rpage-prev" aria-label="Previous 5">' + ICONS.chevL + '</button>',
        '    <button type="button" class="as-arrow as-rpage as-rpage-next" aria-label="Next 5">' + ICONS.chevR + '</button>',
        '    <div class="as-rpage-bar"><span class="as-rpage-count" aria-live="polite"></span>',
        '      <button type="button" class="as-roster-toggle" aria-expanded="false"><span>SHOW ALL</span>' + ICONS.chevR + '</button></div>',
        '  </section>',
        '  <section class="as-panel as-team">',
        '    <h2 class="as-heading"><span>YOUR TEAM</span></h2>',
        '    <div class="as-team-slots"></div>',
        '    <p class="as-team-status" aria-live="polite"></p>',
        '  </section>',
        '  <section class="as-panel as-options">',
        '    <h3 class="as-subheading">MATCH OPTIONS</h3>',
        '    <div class="as-option-list" role="radiogroup" aria-label="Match type">',
        '      <button type="button" class="as-option" role="radio" data-as-mode="ladder">' + ICONS.trophy + '<span>RANKED MATCH</span></button>',
        '      <button type="button" class="as-option" role="radio" data-as-mode="quick">' + ICONS.bolt + '<span>QUICK MATCH</span></button>',
        '      <button type="button" class="as-option" role="radio" data-as-mode="private">' + ICONS.lock + '<span>PRIVATE MATCH</span></button>',
        '    </div>',
        '  </section>',
        '  <button type="button" class="as-start"><span>START MATCH</span></button>',
        '  <div class="as-pop as-settings" hidden><div class="as-pop-title">SETTINGS</div><div class="as-settings-body"></div></div>',
        '  <div class="as-pop as-games" hidden><div class="as-pop-title">CHOOSE GAME</div></div>',
        '  <div class="as-pop as-menu" hidden></div>',
        '</div>',
    ].join('');
    background.appendChild(shell);

    var frame = $('.as-frame', shell);
    var stage = $('.as-stage', shell);

    /* -------------------------------------------- move live elements into it */
    $('.as-roster-scroll', shell).appendChild(slotList);
    var teamList = $('.selected-character-slot-list');
    if (teamList) $('.as-team-slots', shell).appendChild(teamList);

    var portrait = document.getElementById('character-portrait');
    var shadow = document.getElementById('character-evolution-shadow');
    if (shadow) stage.appendChild(shadow);
    if (portrait) stage.appendChild(portrait);

    var nameSel = $('.player-nameselection');
    if (nameSel) $('.as-player-name', shell).appendChild(nameSel);
    var avatar = $('.player-card .player-avatar');
    if (avatar) $('.as-avatar', shell).appendChild(avatar);
    var stats = $('.as-stats', shell);
    ['rank', 'record', 'streak', 'clan', 'ladder'].forEach(function (key) {
        var stat = $('.player-infoselection [data-player-stat="' + key + '"]');
        if (stat) stats.appendChild(stat);
    });
    // script.js fills stats via '.player-infoselection .player-stat', so the
    // container we moved them into has to keep answering to that selector.
    stats.classList.add('player-infoselection');

    var teamStatusSrc = $('.selection-team-status');
    var teamStatus = $('.as-team-status', shell);
    if (teamStatusSrc) {
        var syncStatus = function () { teamStatus.textContent = teamStatusSrc.textContent; };
        new MutationObserver(syncStatus).observe(teamStatusSrc, { childList: true, characterData: true, subtree: true });
        syncStatus();
    }

    // Overlays (store, searching, private match, draft, unlock, news, filters)
    // are moved to <body> so they always position against the screen.
    ['.selection-missions', '.searching-backdrop', '.private-match-backdrop', '.draft-backdrop',
        '.selection-unlock-confirm-backdrop', '#ingame-news-backdrop', '.roster-filter-panel']
        .forEach(function (sel) {
            var node = $(sel);
            if (node) document.body.appendChild(node);
        });

    /* ---------------------------------------------------------------- brand */
    var homeHref = function () { return isPokemon() ? '/pokemon' : '/'; };
    var syncHome = function () {
        $$('.as-brand, [data-as-nav="home"]', shell).forEach(function (a) { a.href = homeHref(); });
    };

    /* ------------------------------------------------------------ settings */
    var settingsBody = $('.as-settings-body', shell);
    var addSettingsRow = function (node, cls) {
        if (!node) return null;
        var row = el('div', 'as-set-row' + (cls ? ' ' + cls : ''));
        row.appendChild(node);
        settingsBody.appendChild(row);
        return row;
    };
    var sound = $('.sound-controller');
    addSettingsRow(sound, 'as-set-sound');
    var draftWrap = $('.draft-mode-check-wrap');
    addSettingsRow(draftWrap, 'as-set-draft');
    var toolbarGrid = el('div', 'as-set-grid');
    $$('.experimental-toolbar > *').forEach(function (node) { toolbarGrid.appendChild(node); });
    var fullBtn = $('.selection-fullscreen-toggle');
    var fullProxy = el('button', 'as-set-btn', 'Fullscreen');
    fullProxy.type = 'button';
    fullProxy.addEventListener('click', function () { if (fullBtn) fullBtn.click(); });
    toolbarGrid.appendChild(fullProxy);
    var logoutBtn = $('.logout-button');
    var logoutProxy = el('button', 'as-set-btn as-set-logout', 'Log Out');
    logoutProxy.type = 'button';
    logoutProxy.addEventListener('click', function () { if (logoutBtn) logoutBtn.click(); });
    toolbarGrid.appendChild(logoutProxy);
    settingsBody.appendChild(toolbarGrid);
    var classicLink = $('.experimental-classic-link', toolbarGrid);
    if (classicLink) classicLink.textContent = 'Classic UI';
    var prevUi = el('a', 'as-set-btn', 'Previous UI');
    prevUi.addEventListener('click', function () {
        var url = new URL(window.location.href);
        url.searchParams.set('arena', isPokemon() ? 'pokemon' : 'comic');
        url.searchParams.set('layout', 'experimental');
        prevUi.href = url.toString();
    });
    prevUi.href = 'selection.html?layout=experimental';
    toolbarGrid.appendChild(prevUi);

    /* --------------------------------------------------------------- games */
    var gamesPop = $('.as-games', shell);
    var arenaSwitch = $('.arena-mode-switch');
    if (arenaSwitch) {
        $$('.arena-mode-button', arenaSwitch).forEach(function (btn) {
            if (btn.dataset.arenaMode === 'pokemon') btn.textContent = 'Pokémon Arena';
        });
        gamesPop.appendChild(arenaSwitch);
    }

    /* ----------------------------------------------------------- popovers */
    var pops = { settings: $('.as-settings', shell), games: gamesPop, menu: $('.as-menu', shell) };
    var popTriggers = {
        settings: $('[data-as-nav="settings"]', shell),
        games: $('[data-as-nav="games"]', shell),
        menu: $('.as-burger', shell),
    };
    var openPop = null;
    var setPop = function (name) {
        openPop = openPop === name ? null : name;
        Object.keys(pops).forEach(function (key) {
            var open = key === openPop || (openPop === 'menu' && key === 'menu');
            pops[key].hidden = key !== openPop;
            if (popTriggers[key]) popTriggers[key].setAttribute('aria-expanded', String(key === openPop));
            if (popTriggers[key]) popTriggers[key].classList.toggle('active', key === openPop && open);
        });
        // Filters panel lives in the settings drawer; close it with the drawer.
        if (openPop !== 'settings') document.body.classList.remove('experimental-controls-open');
    };
    Object.keys(popTriggers).forEach(function (key) {
        popTriggers[key].addEventListener('click', function (event) {
            event.stopPropagation();
            setPop(key);
        });
    });
    // Portrait hamburger menu: the same four header actions, stacked.
    var menu = pops.menu;
    $$('.as-nav .as-navbtn', shell).forEach(function (navBtn) {
        var item = navBtn.cloneNode(true);
        item.classList.add('as-menu-item');
        item.removeAttribute('aria-expanded');
        var key = navBtn.dataset.asNav;
        if (key !== 'home') {
            item.addEventListener('click', function (event) {
                event.stopPropagation();
                openPop = null;
                if (key === 'rankings') { setPop(null); openRankings(); return; }
                setPop(key);
            });
        }
        menu.appendChild(item);
        // Store and Missions sit right after Rankings in the phone menu.
        if (key === 'rankings') {
            [['store', 'STORE', ICONS.store, '.experimental-store-toggle'],
                ['missions', 'MISSIONS', ICONS.missions, '.experimental-missions-toggle']].forEach(function (entry) {
                var extra = el('button', 'as-navbtn as-menu-item', entry[2] + '<span>' + entry[1] + '</span>');
                extra.type = 'button';
                extra.dataset.asNav = entry[0];
                extra.addEventListener('click', function (event) {
                    event.stopPropagation();
                    setPop(null);
                    var target = $(entry[3]);
                    if (target) target.click();
                });
                menu.appendChild(extra);
            });
        }
    });
    document.addEventListener('click', function (event) {
        if (!openPop) return;
        var pop = pops[openPop];
        if (pop.contains(event.target)) return;
        // Store / filters / news open their own overlays from inside settings.
        if (event.target.closest && event.target.closest('.selection-missions, .roster-filter-panel, .ingame-news-backdrop')) return;
        setPop(null);
    });
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            if (openPop) setPop(null);
            closeSkills();
            closeRankings();
        }
    });
    // Picking an option inside settings that opens a big overlay closes the drawer.
    toolbarGrid.addEventListener('click', function (event) {
        var target = event.target.closest('button, a');
        if (!target) return;
        if (target.classList.contains('experimental-controls-toggle')) return;
        if (target === logoutProxy || target === fullProxy) return;
        window.setTimeout(function () { setPop(null); }, 0);
    });

    /* ------------------------------------------------------------ rankings */
    var rankModal = el('div', 'as-modal as-rankings', '<div class="as-modal-card" role="dialog" aria-label="Rankings">' +
        '<div class="as-modal-head"><h2 class="as-heading"><span>RANKINGS</span></h2>' +
        '<button type="button" class="as-modal-close" aria-label="Close">&times;</button></div>' +
        '<div class="as-rank-body"><p class="as-rank-msg">Loading&hellip;</p></div></div>');
    rankModal.hidden = true;
    document.body.appendChild(rankModal);
    var RANK_TITLES = {
        topPlayerLevels: 'Top Player Levels',
        topWins: 'Most Wins',
        topCurrentStreaks: 'Current Streaks',
        topHighestStreaks: 'Highest Streaks',
    };
    var escapeHtml = function (value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
        });
    };
    var renderRankings = function (boards) {
        var body = $('.as-rank-body', rankModal);
        var keys = Object.keys(boards || {}).filter(function (k) { return Array.isArray(boards[k]); });
        if (!keys.length) { body.innerHTML = '<p class="as-rank-msg">No rankings yet.</p>'; return; }
        keys.sort(function (a, b) {
            var order = Object.keys(RANK_TITLES);
            return (order.indexOf(a) + 99 * (order.indexOf(a) < 0)) - (order.indexOf(b) + 99 * (order.indexOf(b) < 0));
        });
        body.innerHTML = keys.map(function (key) {
            var title = RANK_TITLES[key] || key.replace(/^top/, '').replace(/([A-Z])/g, ' $1').trim();
            var rows = boards[key].map(function (entry, i) {
                var value = entry && typeof entry === 'object' ? entry.value : '';
                if (key === 'topPlayerLevels') value = 'Lv ' + value;
                return '<li><b>' + String(i + 1).padStart(2, '0') + '</b><span>' +
                    escapeHtml(entry && entry.username) + '</span><em>' + escapeHtml(value) + '</em></li>';
            }).join('');
            return '<section class="as-rank-board"><h3>' + escapeHtml(title) + '</h3><ol>' +
                (rows || '<li><span>No players yet</span></li>') + '</ol></section>';
        }).join('');
    };
    var openRankings = function () {
        rankModal.hidden = false;
        document.body.classList.add('as-modal-open');
        var arena = isPokemon() ? 'pokemon' : 'comic';
        var base = window.NARUTO_API_BASE_URL || '';
        fetch(base + '/api/leaderboards/sidebar?arena=' + arena, { credentials: 'include' })
            .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
            .then(function (data) { renderRankings(data && data.leaderboards); })
            .catch(function () {
                $('.as-rank-body', rankModal).innerHTML = '<p class="as-rank-msg">Rankings could not be loaded. Try again in a moment.</p>';
            });
    };
    var closeRankings = function () {
        rankModal.hidden = true;
        document.body.classList.remove('as-modal-open');
    };
    $('[data-as-nav="rankings"]', shell).addEventListener('click', function (event) {
        event.stopPropagation();
        setPop(null);
        openRankings();
    });
    rankModal.addEventListener('click', function (event) {
        if (event.target === rankModal || event.target.closest('.as-modal-close')) closeRankings();
    });

    /* --------------------------------------------------------------- skills */
    var skillViewer = $('.skillviewer');
    var skillClose = el('button', 'as-modal-close as-skill-close', '&times;');
    skillClose.type = 'button';
    skillClose.setAttribute('aria-label', 'Close skills');
    var skillBackdrop = el('div', 'as-skill-backdrop');
    document.body.appendChild(skillBackdrop);
    if (skillViewer) {
        skillBackdrop.appendChild(skillViewer);
        skillViewer.appendChild(skillClose);
    }
    var openSkills = function () { document.body.classList.add('as-skills-open'); };
    var closeSkills = function () { document.body.classList.remove('as-skills-open'); };
    skillClose.addEventListener('click', closeSkills);
    skillBackdrop.addEventListener('click', function (event) { if (event.target === skillBackdrop) closeSkills(); });
    $('.as-skills-btn', shell).addEventListener('click', openSkills);

    /* ------------------------------------------- portrait roster pager */
    // On phones the roster shows one row of 5 at a time; the arrows (or a
    // sideways swipe) flip to the next / previous 5. Landscape keeps the
    // scrolling grid.
    var rosterBox = $('.as-roster-scroll', shell);
    var pageCount = $('.as-rpage-count', shell);
    var PER_PAGE = 5;
    var rosterPanel = $('.as-roster', shell);
    var rosterToggle = $('.as-roster-toggle', shell);
    var rosterExpanded = store.get('arenaSelectRosterExpanded') === '1';
    var isPortrait = function () { return root.classList.contains('as-portrait'); };
    var isPaging = function () { return isPortrait() && !rosterExpanded && shell.classList.contains('as-roster-paged'); };
    var rowStep = function () {
        var tile = $('.slot-list .slot-item:not([data-index=""])', shell);
        if (!tile) return 0;
        return tile.offsetHeight + (parseFloat(getComputedStyle(slotList).rowGap) || 0);
    };
    var totalPages = function () { return Math.max(1, Math.ceil(liveTiles().length / PER_PAGE)); };
    var pagerTarget = null;
    var pagerTargetAt = 0;
    var currentPage = function () {
        // While a page flip is still sliding, the page we're heading to counts.
        if (pagerTarget != null && Date.now() - pagerTargetAt < 450) return pagerTarget;
        var step = rowStep();
        return step ? Math.round(rosterBox.scrollTop / step) : 0;
    };
    var syncPager = function () {
        if (!isPaging()) return;
        pageCount.textContent = (currentPage() + 1) + ' / ' + totalPages();
    };
    var goPage = function (page, smooth) {
        var total = totalPages();
        page = ((page % total) + total) % total;
        pagerTarget = page;
        pagerTargetAt = Date.now();
        rosterBox.scrollTo({ top: page * rowStep(), behavior: smooth === false ? 'auto' : 'smooth' });
        window.setTimeout(syncPager, 320);
        pageCount.textContent = (page + 1) + ' / ' + total;
    };
    $('.as-rpage-prev', shell).addEventListener('click', function () { goPage(currentPage() - 1); });
    $('.as-rpage-next', shell).addEventListener('click', function () { goPage(currentPage() + 1); });
    var swipeX = null;
    var swipeY = null;
    rosterBox.addEventListener('touchstart', function (event) {
        if (!isPaging()) return;
        swipeX = event.touches[0].clientX;
        swipeY = event.touches[0].clientY;
    }, { passive: true });
    rosterBox.addEventListener('touchend', function (event) {
        if (!isPaging() || swipeX == null) return;
        var dx = event.changedTouches[0].clientX - swipeX;
        var dy = event.changedTouches[0].clientY - swipeY;
        swipeX = null;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) goPage(currentPage() + (dx < 0 ? 1 : -1));
    }, { passive: true });
    rosterBox.addEventListener('scroll', function () { window.clearTimeout(rosterBox._t); rosterBox._t = window.setTimeout(syncPager, 80); });
    var syncRosterToggle = function () {
        rosterPanel.classList.toggle('is-expanded', rosterExpanded);
        rosterToggle.setAttribute('aria-expanded', String(rosterExpanded));
        rosterToggle.querySelector('span').textContent = rosterExpanded ? 'SHOW 5 AT A TIME' : 'SHOW ALL';
    };
    rosterToggle.addEventListener('click', function () {
        rosterExpanded = !rosterExpanded;
        store.set('arenaSelectRosterExpanded', rosterExpanded ? '1' : '0');
        syncRosterToggle();
        if (!rosterExpanded) {
            // Back to 5 at a time, on the page with the highlighted character.
            var hi = $('.slot-list .slot-item.keyboard-highlighted', shell);
            var pos = liveTiles().indexOf(hi);
            rosterBox.scrollTop = Math.max(0, Math.floor(pos / PER_PAGE)) * rowStep();
            rosterPanel.scrollIntoView({ block: 'nearest' });
        }
        lastRowStep = 0;
        window.requestAnimationFrame(fit);
    });
    syncRosterToggle();
    // Keep the page showing the highlighted character (big arrows, keyboard).
    var showTile = function (li) {
        if (!li || !isPaging()) return;
        var tiles = liveTiles();
        var pos = tiles.indexOf(li);
        if (pos >= 0 && Math.floor(pos / PER_PAGE) !== currentPage()) goPage(Math.floor(pos / PER_PAGE));
    };

    /* ------------------------------------------------- featured character */
    var currentIndex = function () {
        var hi = $('.slot-list .slot-item.keyboard-highlighted:not(.slot-empty)');
        return hi ? hi.dataset.index : null;
    };
    var liveTiles = function () {
        return $$('.slot-list .slot-item').filter(function (li) { return li.dataset.index !== ''; });
    };
    var liveItems = function () {
        return $$('.slot-list .slot-item').filter(function (li) {
            return li.dataset.index !== '' && !li.classList.contains('slot-empty');
        });
    };
    var step = function (dir) {
        var items = liveItems();
        if (!items.length) return;
        var cur = currentIndex();
        var pos = items.findIndex(function (li) { return li.dataset.index === cur; });
        var next = items[(pos + dir + items.length) % items.length];
        next.click();
        if (isPaging()) { showTile(next); return; }
        var box = rosterBox;
        if (box.scrollHeight > box.clientHeight + 1) {
            var top = next.offsetTop - box.offsetTop;
            if (top < box.scrollTop) box.scrollTop = top - 4;
            else if (top + next.offsetHeight > box.scrollTop + box.clientHeight) box.scrollTop = top + next.offsetHeight - box.clientHeight + 4;
        }
    };
    $('.as-prev', shell).addEventListener('click', function () { step(-1); });
    $('.as-next', shell).addEventListener('click', function () { step(1); });

    // Double-click / double-tap the big render to add that character to the team.
    var lastStageTap = 0;
    var addFeatured = function () {
        var cur = currentIndex();
        var li = cur != null ? $('.slot-list .slot-item[data-index="' + cur + '"]') : null;
        if (!li || li.classList.contains('slot-empty')) return;
        li.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
        // Touch phones ignore dblclick on the roster (they use tap-tap); a
        // second click there adds the character the same way.
        if (window.matchMedia('(max-width: 700px) and (pointer: coarse)').matches) {
            li.click();
            window.setTimeout(function () { li.click(); }, 60);
        }
    };
    stage.addEventListener('dblclick', addFeatured);
    stage.addEventListener('pointerup', function (event) {
        if (event.pointerType !== 'touch') return;
        var now = Date.now();
        if (now - lastStageTap < 350) { addFeatured(); lastStageTap = 0; } else { lastStageTap = now; }
    });

    // Dots = the featured character's forms (Base / Evolution / Mega...).
    var dots = $('.as-dots', shell);
    var formButtons = $$('[data-character-form]');
    var syncDots = function () {
        var visible = formButtons.filter(function (b) { return !b.hidden; });
        var toggle = document.getElementById('character-form-toggle');
        if (!toggle || toggle.hidden || visible.length < 2) visible = [];
        dots.innerHTML = '';
        var total = Math.max(visible.length, 1);
        for (var i = 0; i < total; i++) {
            var dot = el('button', 'as-dot');
            dot.type = 'button';
            var src = visible[i];
            var active = src ? src.classList.contains('is-active') : true;
            dot.classList.toggle('active', active);
            dot.setAttribute('aria-label', src ? src.textContent : 'Base form');
            dot.setAttribute('aria-pressed', String(active));
            if (src) dot.addEventListener('click', (function (b) { return function () { b.click(); }; })(src));
            dots.appendChild(dot);
        }
    };
    var formToggle = document.getElementById('character-form-toggle');
    if (formToggle) {
        new MutationObserver(syncDots).observe(formToggle, { attributes: true, subtree: true, attributeFilter: ['hidden', 'class'] });
    }
    syncDots();

    // Show something in the spotlight from the start, like the mockup does.
    var primed = false;
    var forcePrime = false;
    var primeFeatured = function () {
        if (primed) return;
        if (!forcePrime && portrait && portrait.getAttribute('src')) { primed = true; return; }
        var first = liveItems()[0];
        if (!first) return;
        primed = true;
        forcePrime = false;
        first.click();
    };
    new MutationObserver(function () { window.setTimeout(primeFeatured, 50); })
        .observe(slotList, { childList: true });
    window.setTimeout(primeFeatured, 400);

    /* -------------------------------------------------------- match + start */
    var buttons = {
        ladder: $('.ladder-button'),
        quick: $('.quick-button'),
        private: $('.private-button'),
    };
    var mode = store.get('arenaSelectMatchMode');
    if (!buttons[mode]) mode = 'ladder';
    var options = $$('.as-option', shell);
    var syncOptions = function () {
        options.forEach(function (opt) {
            var on = opt.dataset.asMode === mode;
            opt.classList.toggle('active', on);
            opt.setAttribute('aria-checked', String(on));
        });
    };
    options.forEach(function (opt) {
        opt.addEventListener('click', function () {
            mode = opt.dataset.asMode;
            store.set('arenaSelectMatchMode', mode);
            syncOptions();
        });
    });
    syncOptions();

    var start = $('.as-start', shell);
    var syncStart = function () {
        var target = buttons[mode] || buttons.ladder;
        var ready = Boolean(target && !target.disabled);
        start.classList.toggle('not-ready', !ready);
        start.setAttribute('aria-disabled', String(!ready));
    };
    Object.keys(buttons).forEach(function (key) {
        if (buttons[key]) new MutationObserver(syncStart).observe(buttons[key], { attributes: true, attributeFilter: ['disabled', 'style'] });
    });
    options.forEach(function (opt) { opt.addEventListener('click', syncStart); });
    syncStart();
    start.addEventListener('click', function () {
        var target = buttons[mode];
        if (!target) return;
        if (target.disabled) {
            start.classList.remove('nudge');
            void start.offsetWidth;
            start.classList.add('nudge');
            teamStatus.classList.remove('flash');
            void teamStatus.offsetWidth;
            teamStatus.classList.add('flash');
            return;
        }
        target.click();
    });

    /* ------------------------------------------------------- arena changes */
    var lastArena = null;
    var titleA = $('.as-title-a', shell);
    var syncArena = function () {
        syncHome();
        titleA.textContent = isPokemon() ? 'POK\u00c9MON-' : 'COMIC-';
        shell.classList.toggle('is-pokemon', isPokemon());
        var arena = isPokemon() ? 'pokemon' : 'comic';
        if (lastArena && lastArena !== arena) {
            // New roster: put its first character in the spotlight.
            primed = false;
            forcePrime = true;
        }
        lastArena = arena;
    };
    new MutationObserver(syncArena).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    syncArena();

    /* ---------------------------------------------------------- fit + scale */
    // The layout is drawn at a fixed design size (like the mockup) and scaled
    // to the screen, so it looks identical on every device.
    var LAND = { w: 1002, h: 930 };
    var PORT = { w: 412 };
    var lastRowStep = 0;
    var sizeRoster = function () {
        var step = rowStep();
        if (!step) return;
        var gap = parseFloat(getComputedStyle(slotList).rowGap) || 0;
        shell.style.setProperty('--as-roster-row-h', (step - gap) + 'px');
        shell.classList.toggle('as-roster-paged', totalPages() > 1);
        if (isPaging()) {
            if (Math.abs(step - lastRowStep) > 0.5) {
                var page = lastRowStep ? Math.round(rosterBox.scrollTop / lastRowStep) : 0;
                rosterBox.scrollTop = Math.min(page, totalPages() - 1) * step;
            }
            syncPager();
        }
        lastRowStep = step;
    };
    var fit = function () {
        var vw = window.innerWidth;
        var vh = window.innerHeight;
        var portraitMode = vw < 640 || vw / vh < 0.9;
        root.classList.toggle('as-portrait', portraitMode);
        root.classList.toggle('as-landscape', !portraitMode);
        var scale;
        if (portraitMode) {
            scale = Math.min((vw - 12) / PORT.w, 1.6);
        } else {
            scale = Math.min((vw - 24) / LAND.w, Math.max((vh - 24) / LAND.h, 0.62));
            scale = Math.min(scale, (vw - 24) / LAND.w, 1.5);
        }
        shell.style.setProperty('--as-scale', String(scale));
        sizeRoster();
        var natural = frame.offsetHeight;
        shell.style.height = Math.ceil(natural * scale + (portraitMode ? 12 : 24)) + 'px';
        var scaledW = (portraitMode ? PORT.w : LAND.w) * scale;
        shell.style.setProperty('--as-left', Math.max(0, (vw - scaledW) / 2) + 'px');
        shell.classList.toggle('as-overflowing', natural * scale + 24 > vh);
    };
    window.addEventListener('resize', fit);
    window.addEventListener('orientationchange', function () { window.setTimeout(fit, 120); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    new MutationObserver(function () { window.requestAnimationFrame(fit); }).observe(frame, { childList: true, subtree: true });
    fit();
    document.body.classList.add('as-ready');
})();
