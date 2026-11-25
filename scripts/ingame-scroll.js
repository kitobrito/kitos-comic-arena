/*
 * The Scroll layout of the battle screen (Settings > User interface > In-game > Scroll), laid out like
 * the classic arena battle: names, avatars and the ready bar along the top, each character with its
 * skill scroll, the opponent's team down the right, three scroll buttons bottom-left (Surrender,
 * Open Chat, volume) and an info scroll along the bottom (the opponent, or the skill you inspect).
 *
 * scripts/script.js keeps owning the battle; this file only moves a few original elements into place
 * and adds the opponent card. Positions are on a 1000 x 728 stage (styles/ingame-scroll.css), scaled
 * to fit the window.
 */
(function () {
    'use strict';

    var root = document.documentElement;
    if (!root.classList.contains('battle-scroll')) return;
    var bg = document.querySelector('.backgroundingame');
    var stage = document.querySelector('.ingame-stage');
    if (!bg || !stage) return;

    var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
    var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
    var el = function (tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
    var params = new URLSearchParams(window.location.search);
    var arena = params.get('arena') === 'pokemon' ? 'pokemon' : 'comic';
    document.body.classList.add('bs-' + arena);

    // ---- Fit the 1000 x 728 stage to the window.
    var W = 1000, H = 728;
    var fit = function () {
        var k = Math.max(0.3, Math.min(window.innerWidth / W, window.innerHeight / H, 2));
        root.style.setProperty('--bs-k', k.toFixed(4));
        root.style.setProperty('--bs-x', Math.max(0, (window.innerWidth - W * k) / 2).toFixed(1) + 'px');
        root.style.setProperty('--bs-y', Math.max(0, (window.innerHeight - H * k) / 2).toFixed(1) + 'px');
    };
    fit();
    window.addEventListener('resize', fit);

    // ---- The info scroll along the bottom (rod + framed paper), holding the opponent card and the skill viewer.
    var panel = el('div', 'bs-panel', '<i class="bs-rod" aria-hidden="true"></i><div class="bs-paper"></div>'
        + '<div class="bs-tabs" role="group" aria-label="Info"><button type="button" class="bs-tab on" data-bs-tab="opp">Opponent</button><button type="button" class="bs-tab" data-bs-tab="skill">Skill</button></div>');
    stage.appendChild(panel);
    var opp = el('div', 'bs-opp');
    opp.innerHTML = '<img class="bs-opp-avatar" alt=""><div class="bs-opp-lines"></div><div class="bs-opp-team"></div>';
    panel.appendChild(opp);
    var info = $('.skillinformation');
    if (info) panel.appendChild(info);
    var show = function (which) {
        panel.dataset.show = which;
        $$('.bs-tab', panel).forEach(function (t) { t.classList.toggle('on', t.dataset.bsTab === which); });
    };
    show('opp');
    panel.addEventListener('click', function (e) { var t = e.target.closest('[data-bs-tab]'); if (t) show(t.dataset.bsTab); });
    // Looking at a skill (or a character) switches the scroll to the skill; the opponent's avatar switches back.
    document.addEventListener('click', function (e) {
        if (e.target.closest('.skillimage, .skillqueue, .character-face, .skill-browser-icon')) show('skill');
        else if (e.target.closest('.player-avatar-right')) show('opp');
    }, true);

    // ---- Bottom-left: three scroll buttons (Surrender, Open Chat, volume).
    var scrolls = el('div', 'bs-scrolls');
    scrolls.innerHTML = '<div class="bs-scroll bs-s1"><i class="bs-srod"></i><div class="bs-slot"></div></div>'
        + '<div class="bs-scroll bs-s2"><i class="bs-srod"></i><div class="bs-slot"></div></div>'
        + '<div class="bs-scroll bs-s3"><i class="bs-srod"></i><div class="bs-slot bs-vol"><span class="bs-minus" aria-hidden="true">&minus;</span></div></div>';
    stage.appendChild(scrolls);
    var surrender = $('.surrenderbutton');
    if (surrender) { $('.bs-s1 .bs-slot', scrolls).appendChild(surrender); surrender.setAttribute('data-bs-label', 'SURRENDER'); }
    var chat = $('.match-chat');
    if (chat) { $('.bs-s2 .bs-slot', scrolls).appendChild(chat); var ct = $('.match-chat-toggle > span', chat); if (ct) ct.textContent = 'OPEN CHAT'; }
    var vol = $('.bs-vol', scrolls);
    var range = $('#ingame-sound-volume');
    if (range) vol.appendChild(range);
    vol.insertAdjacentHTML('beforeend', '<span class="bs-plus" aria-hidden="true">+</span>');
    var fxMute = $('.ingame-effects-mute-button');
    if (fxMute) vol.appendChild(fxMute);
    // The gear (top-left) opens the rest of the sound and battle options, including User Interface.
    var gear = $('#ingame-sound-controller-toggle');
    if (gear) gear.innerHTML = '<i></i><i></i><i></i>';

    // ---- The opponent card: avatar, name, rank, clan, level, ladder rank, ratio, and their team.
    var ladderOf = function (profile) {
        if (!profile) return {};
        var a = profile.arenas && profile.arenas[arena];
        return (a && a.ladder) || profile.ladder || {};
    };
    var clanOf = function (profile) {
        var a = profile && profile.arenas && profile.arenas[arena];
        var c = (a && a.clan) || (profile && profile.clan);
        return c && (c.abbreviation || c.name) ? (c.abbreviation || c.name) : 'CLANLESS';
    };
    var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var data = null;
    var renderOpp = function () {
        var name = ($('.player-right .player-name') || {}).textContent || '';
        var status = ($('.player-right .player-status') || {}).textContent || '';
        var avatar = $('.player-avatar-right');
        var o = data && data.opponent;
        var lad = ladderOf(o && o.profile);
        var w = lad.wins != null ? lad.wins : null, l = lad.losses != null ? lad.losses : null, st = lad.streak;
        var lines = ['<b class="bs-opp-name">' + esc(name || (o && (o.displayName || o.username)) || 'Opponent') + '</b>', esc(status || lad.rank || '')];
        if (o) {
            lines.push('CLAN: ' + esc(clanOf(o.profile)));
            if (lad.level != null) lines.push('LEVEL: ' + esc(lad.level));
            if (lad.ladderRank != null) lines.push('LADDERRANK: ' + esc(lad.ladderRank));
            if (w != null && l != null) lines.push('RATIO: ' + w + ' - ' + l + (st != null ? ' (' + (st > 0 ? '+' : '') + st + ')' : ''));
        }
        $('.bs-opp-lines', opp).innerHTML = lines.map(function (t) { return '<div>' + t + '</div>'; }).join('');
        var img = $('.bs-opp-avatar', opp);
        if (avatar && avatar.src && img.src !== avatar.src) img.src = avatar.src;
        var faces = $$('.enemy-characters .character-face').map(function (f) { return f.src ? '<img src="' + esc(f.src) + '" alt="">' : ''; }).join('');
        var team = $('.bs-opp-team', opp);
        if (team.innerHTML !== faces) team.innerHTML = faces;
    };
    var hud = $('.game-hud');
    if (hud) new MutationObserver(renderOpp).observe(hud, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['src'] });
    var foes = $('.enemy-characters');
    if (foes) new MutationObserver(renderOpp).observe(foes, { subtree: true, attributes: true, attributeFilter: ['src'] });
    renderOpp();
    // The opponent's profile (clan, level, ladder rank, record) comes with the match data.
    var matchId = params.get('matchId');
    if (matchId) {
        fetch('/api/match/' + encodeURIComponent(matchId), { credentials: 'include', cache: 'no-store' })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (d) { if (d && d.opponent) { data = d; renderOpp(); } })
            .catch(function () { /* the card keeps the name and rank from the top bar */ });
    }
})();
