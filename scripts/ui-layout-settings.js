/*
 * Settings > User interface: choose the layout for the character select and for battles.
 * The choices themselves live in scripts/ui-layout.js (window.ArenaUiLayout).
 *
 * Opens from every layout's settings: the arena select screen's SETTINGS menu, the Options panel
 * of the older selection layouts, the Scroll layout's STYLES button, and the in-game
 * Settings > User Interface button.
 */
(function () {
    'use strict';

    var L = window.ArenaUiLayout;
    if (!L) return;

    var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var TABS = [['selection', 'Character select'], ['ingame', 'In-game']];
    var backdrop = null;
    var tab = L.page;

    // A tiny drawing of each layout, so the choice is easy to picture.
    var PREVIEW = {
        'selection:arena': '<i class="uil-p-stage"></i><i class="uil-p-strip"></i><i class="uil-p-btn"></i>',
        'selection:scroll': '<i class="uil-p-btns"></i><i class="uil-p-scroll"></i><i class="uil-p-grid"></i><i class="uil-p-team"></i>',
        'selection:experimental': '<i class="uil-p-bar"></i><i class="uil-p-biggrid"></i><i class="uil-p-side"></i>',
        'selection:classic': '<i class="uil-p-small"></i>',
        'ingame:arena': '<i class="uil-p-hud"></i><i class="uil-p-rows"></i><i class="uil-p-panel"></i>',
        'ingame:scroll': '<i class="uil-p-hud"></i><i class="uil-p-scrolls"></i><i class="uil-p-foes"></i><i class="uil-p-infobar"></i>',
        'ingame:battlefield': '<i class="uil-p-ground"></i><i class="uil-p-figs"></i>',
        'ingame:classic': '<i class="uil-p-small"></i>',
    };

    var render = function () {
        if (!backdrop) return;
        var saved = L.get(tab);
        var live = tab === L.page ? L.layout : null;
        var opts = L.OPTIONS[tab].map(function (o) {
            var on = o.id === saved;
            return '<button type="button" class="uil-opt' + (on ? ' on' : '') + '" data-uil-choose="' + o.id + '" aria-pressed="' + on + '">'
                + '<span class="uil-prev uil-prev-' + tab + '-' + o.id + '" aria-hidden="true">' + (PREVIEW[tab + ':' + o.id] || '') + '</span>'
                + '<span class="uil-copy"><b>' + esc(o.name) + (o.badge ? ' <em>' + esc(o.badge) + '</em>' : '') + (o.id === 'arena' ? ' <small>Default</small>' : '') + '</b>'
                + '<span>' + esc(o.blurb) + '</span></span>'
                + '<span class="uil-radio" aria-hidden="true"></span></button>';
        }).join('');
        var note = '';
        if (live && saved !== live) {
            note = '<div class="uil-apply"><span>You are using <b>' + esc(nameOf(tab, live)) + '</b> right now.</span><button type="button" class="uil-apply-btn" data-uil-apply>Switch now</button></div>';
        } else if (!live) {
            note = '<p class="uil-note">Saved. Your next battle opens in <b>' + esc(nameOf(tab, saved)) + '</b>.</p>';
        } else {
            note = '<p class="uil-note">You are using <b>' + esc(nameOf(tab, saved)) + '</b>.</p>';
        }
        backdrop.querySelector('.uil-tabs').innerHTML = TABS.map(function (t) {
            return '<button type="button" class="uil-tab' + (t[0] === tab ? ' on' : '') + '" data-uil-tab="' + t[0] + '" aria-pressed="' + (t[0] === tab) + '">' + t[1] + '</button>';
        }).join('');
        backdrop.querySelector('.uil-list').innerHTML = opts;
        backdrop.querySelector('.uil-foot').innerHTML = note;
    };
    var nameOf = function (page, id) { var o = L.OPTIONS[page].filter(function (x) { return x.id === id; })[0]; return o ? o.name : id; };

    // Reload this page in the chosen layout (dropping any ?layout= that would override it).
    var apply = function () {
        var url = new URL(window.location.href);
        url.searchParams.delete('layout');
        window.location.replace(url.toString());
    };

    var open = function (startTab) {
        tab = startTab === 'ingame' || startTab === 'selection' ? startTab : L.page;
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.className = 'uil-backdrop';
            backdrop.innerHTML = '<section class="uil-card" role="dialog" aria-modal="true" aria-labelledby="uil-title">'
                + '<header><h2 id="uil-title">User interface</h2><button type="button" class="uil-close" aria-label="Close">&times;</button></header>'
                + '<p class="uil-sub">Choose how each screen looks. Your choice is saved on this device.</p>'
                + '<nav class="uil-tabs" aria-label="Screen"></nav><div class="uil-list"></div><footer class="uil-foot"></footer></section>';
            backdrop.addEventListener('click', function (e) {
                if (e.target === backdrop || e.target.closest('.uil-close')) return close();
                var t = e.target.closest('[data-uil-tab]');
                if (t) { tab = t.getAttribute('data-uil-tab'); return render(); }
                var c = e.target.closest('[data-uil-choose]');
                if (c) { L.set(tab, c.getAttribute('data-uil-choose')); return render(); }
                if (e.target.closest('[data-uil-apply]')) return apply();
            });
            document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && backdrop && !backdrop.hidden) close(); });
            document.body.appendChild(backdrop);
        }
        document.body.classList.toggle('uil-pokemon', document.body.classList.contains('arena-mode-pokemon') || /arena=pokemon/.test(window.location.search));
        backdrop.hidden = false;
        render();
        var first = backdrop.querySelector('.uil-opt.on') || backdrop.querySelector('.uil-opt');
        if (first) first.focus();
    };
    var close = function () { if (backdrop) backdrop.hidden = true; };

    window.ArenaUiLayoutSettings = { open: open, close: close };

    var button = function (cls, label) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = cls;
        b.textContent = label;
        b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); open(); });
        return b;
    };

    var wire = function () {
        if (L.page === 'selection') {
            // The Options panel (every older layout; the arena screen shows it inside SETTINGS too).
            var options = document.getElementById('selection-ui-options');
            if (options && !options.querySelector('.uil-entry')) options.insertBefore(button('uil-entry', 'User interface…'), options.firstChild);
            // The arena select screen's SETTINGS menu: "Classic UI" and "Previous UI" become one User Interface button.
            var grid = document.querySelector('.as-set-grid');
            if (grid && !grid.querySelector('.uil-entry')) {
                grid.querySelectorAll('a.as-set-btn, .experimental-classic-link').forEach(function (a) {
                    if (/classic ui|previous ui/i.test(a.textContent)) a.remove();
                });
                grid.appendChild(button('as-set-btn uil-entry', 'User Interface'));
            }
            // The older layouts' own interface switches open the chooser instead of jumping straight to one layout.
            document.querySelectorAll('.classic-new-ui-button, .experimental-classic-link').forEach(function (b) {
                if (b.dataset.uilWired) return;
                b.dataset.uilWired = '1';
                if (b.classList.contains('classic-new-ui-button')) { b.textContent = 'UI'; b.title = 'User interface'; }
                b.addEventListener('click', function (e) { e.preventDefault(); e.stopImmediatePropagation(); open(); }, true);
            });
        } else {
            // In battle: Settings > User Interface opens the chooser (its old panel only said options were coming).
            var panel = document.getElementById('ingame-interface-options');
            if (panel && !panel.querySelector('.uil-entry')) {
                panel.innerHTML = '<h3 style="margin:0 0 8px;font-size:14px">User Interface</h3>';
                panel.appendChild(button('uil-entry', 'Choose layouts…'));
            }
            document.querySelectorAll('[aria-controls="ingame-interface-options"]').forEach(function (b) {
                if (b.dataset.uilWired) return;
                b.dataset.uilWired = '1';
                b.addEventListener('click', function (e) { e.preventDefault(); e.stopImmediatePropagation(); open('ingame'); }, true);
            });
        }
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
    else wire();
    // The arena screen builds its SETTINGS menu after load; wire it once it exists.
    window.addEventListener('load', function () { wire(); setTimeout(wire, 600); setTimeout(wire, 2000); });
})();
