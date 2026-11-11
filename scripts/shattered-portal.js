/* Shattered Realms section of the tri-game portal.
 *
 * Every shattered-*.html page has <body data-sr-page="..."> and two empty rails
 * ([data-sr-rail="left"], [data-sr-rail="right"]). This file fills the rails
 * and runs the page's own view. All live data comes from the Shattered Realms
 * server (its website API, see server/server.js onApi in shattered-realms-tcg):
 *   GET  /api/news          patch notes, factions, keywords, rules, current poll
 *   GET  /api/leaderboard   top 50 ranked players
 *   POST /api/login | register | me | logout
 *   GET/POST /poll/<id>     the community faction vote
 * The site's sign-in token is kept in localStorage ("sr-site-token") and handed
 * to the embedded game on /shattered-play, so one sign-in covers both.
 */
(function () {
  "use strict";
  var TP = window.TriPortal;
  if (!TP) return;
  var esc = TP.esc, icon = TP.icon, toast = TP.toast;
  var doc = document;
  var page = doc.body.getAttribute("data-sr-page") || "home";
  var $ = function (sel, rootEl) { return (rootEl || doc).querySelector(sel); };
  var $$ = function (sel, rootEl) { return Array.prototype.slice.call((rootEl || doc).querySelectorAll(sel)); };
  var ITCH = "https://fadeawaytoday.itch.io/shattered-realms-tcg";

  // ---- Data ------------------------------------------------------------------------
  function cached(key, maxAgeMs, load) {
    try {
      var hit = JSON.parse(sessionStorage.getItem(key) || "null");
      if (hit && Date.now() - hit.t < maxAgeMs && hit.base === TP.srBase) return Promise.resolve(hit.data);
    } catch (e) {}
    return load().then(function (data) {
      try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), base: TP.srBase, data: data })); } catch (e) {}
      return data;
    });
  }
  var newsP = null;
  function news() { return newsP || (newsP = cached("sr-news", 300000, function () { return TP.srApi("news"); })); }
  function ladder() { return cached("sr-ladder", 60000, function () { return TP.srApi("leaderboard"); }); }
  function voterId() {
    try {
      var id = localStorage.getItem("sr-site-voter");
      if (!id) { id = (window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12)).toLowerCase(); localStorage.setItem("sr-site-voter", id); }
      return id;
    } catch (e) { return null; }
  }
  function pollGet(id) { return fetch(TP.srBase + "/poll/" + encodeURIComponent(id), { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error("poll"); return r.json(); }); }
  function pollVote(id, choice) {
    return fetch(TP.srBase + "/poll/" + encodeURIComponent(id), { method: "POST", headers: { "content-type": "text/plain" },
      body: JSON.stringify({ choice: choice, voter: voterId(), token: TP.srToken() || undefined }) })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || "Vote failed"); return d; }); });
  }
  var meP = null;
  function me() {
    if (!TP.srToken()) return Promise.resolve(null);
    return meP || (meP = TP.srApi("me", { token: TP.srToken() }).then(function (d) { return d.you; }).catch(function (e) {
      if (e.status === 401) TP.srSignOut();
      return null;
    }));
  }
  function wakeNote(el) {
    // The server sleeps on a free plan; the first request can take ~30-60 s.
    var t = setTimeout(function () { if (el && el.isConnected && /Loading/.test(el.textContent)) el.innerHTML = "Waking the realms server up. This can take up to a minute the first time&hellip;"; }, 4000);
    return function () { clearTimeout(t); };
  }

  // ---- Shared bits ---------------------------------------------------------------
  var TIER_COLOR = { Iron: "#9ca3af", Bronze: "#d97706", Silver: "#e5e7eb", Gold: "#eab308", Platinum: "#5eead4", Diamond: "#60a5fa", Master: "#c084fc", Legendary: "#f97316" };
  var keywordRe = null;
  function richText(text, keywords) {
    var html = esc(text || "");
    if (keywords) {
      if (!keywordRe) {
        var terms = Object.keys(keywords).sort(function (a, b) { return b.length - a.length; }).map(function (t) { return t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); });
        keywordRe = terms.length ? new RegExp("\\b(" + terms.join("|") + ")\\b", "g") : null;
      }
      if (keywordRe) html = html.replace(keywordRe, "<b>$1</b>");
    }
    return html;
  }
  function cardHTML(c, opts) {
    opts = opts || {};
    if (!c) return "";
    var kw = opts.keywords;
    var stats = "";
    if (c.type === "minion") stats = '<span class="atk" title="Attack">' + (c.attack != null ? c.attack : "") + '</span><span class="hp" title="Health">' + (c.health != null ? c.health : "") + "</span>";
    else if (c.type === "weapon") stats = '<span class="atk" title="Attack">' + (c.attack != null ? c.attack : "") + '</span><span class="dur" title="Durability">' + (c.durability != null ? c.durability : "") + "</span>";
    var type = (c.type === "weapon" ? "Weapon" : c.type === "spell" ? "Spell" : c.type === "trap" ? "Trap" : "Minion") + (c.faction ? " · " + c.faction : "");
    return '<div class="sr-card t-' + esc(c.type) + (c.legendary ? " is-legend" : "") + (opts.small ? " is-small" : "") + '">' +
      (c.cost != null ? '<span class="sr-cost" title="Mana cost">' + c.cost + "</span>" : "") +
      '<div class="sr-card-art">' + (c.art ? '<img src="' + esc(c.art) + '" alt="" loading="lazy" decoding="async">' : '<span class="sr-noart">?</span>') + "</div>" +
      '<div class="sr-card-name" title="' + esc(c.name) + '">' + esc(c.name) + "</div>" +
      '<div class="sr-card-type">' + esc(type) + (c.legendary ? " · Legendary" : "") + "</div>" +
      '<p class="sr-card-text">' + richText(c.text, kw) + "</p>" +
      '<div class="sr-card-stats">' + stats + "</div></div>";
  }
  var cardIndex = {};
  function cardButton(c, opts) {
    if (!c) return "";
    cardIndex[c.id + (opts && opts.variant ? "@" + opts.variant : "")] = c;
    return '<button type="button" class="sr-card-btn" data-card="' + esc(c.id + (opts && opts.variant ? "@" + opts.variant : "")) + '" aria-label="See ' + esc(c.name) + '">' + cardHTML(c, opts) + "</button>";
  }
  var sheet = null, sheetReturn = null;
  function openSheet(html) {
    if (!sheet) {
      sheet = TP.el("div", { "class": "sr-sheet", role: "dialog", "aria-modal": "true" },
        '<div class="sr-sheet-box"><button class="tp-icon-btn sr-sheet-close" type="button" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button><div class="sr-sheet-body"></div></div>');
      sheet.addEventListener("click", function (e) { if (e.target === sheet || e.target.closest(".sr-sheet-close")) closeSheet(); });
      doc.addEventListener("keydown", function (e) { if (e.key === "Escape" && sheet && !sheet.hidden) closeSheet(); });
      doc.body.appendChild(sheet);
    }
    sheetReturn = doc.activeElement;
    $(".sr-sheet-body", sheet).innerHTML = html;
    sheet.hidden = false;
    $(".sr-sheet-close", sheet).focus();
  }
  function closeSheet() { if (!sheet) return; sheet.hidden = true; if (sheetReturn && sheetReturn.focus) sheetReturn.focus(); }
  doc.addEventListener("click", function (e) {
    var b = e.target.closest("[data-card]");
    if (!b) return;
    var c = cardIndex[b.getAttribute("data-card")];
    if (!c) return;
    news().then(function (n) {
      openSheet('<div class="sr-sheet-grid"><div>' + cardHTML(c, { keywords: n.keywords }) + "</div><div>" +
        '<h2 class="tp-h2">' + esc(c.name) + "</h2>" +
        '<p class="tp-lede">' + richText(c.text, n.keywords) + "</p>" +
        '<div class="tp-row" style="margin-top:12px">' + (c.faction ? '<span class="tp-chip">' + esc(c.faction) + "</span>" : "") +
          (c.set ? '<span class="tp-chip">' + esc(c.set) + "</span>" : "") + (c.legendary ? '<span class="tp-chip">Legendary</span>' : "") +
          (c.cost != null ? '<span class="tp-chip">' + c.cost + " Mana</span>" : "") + "</div>" +
        keywordList(c.text, n.keywords) +
        (c.faction ? '<p style="margin-top:14px"><a class="tp-btn tp-btn-ghost" href="/shattered-factions#' + encodeURIComponent(c.faction) + '">More about ' + esc(c.faction) + "</a></p>" : "") +
        "</div></div>");
    });
  });
  function keywordList(text, keywords) {
    if (!text || !keywords) return "";
    var found = Object.keys(keywords).filter(function (k) { return new RegExp("\\b" + k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b").test(text); }).slice(0, 6);
    if (!found.length) return "";
    return '<div class="sr-kw" style="margin-top:14px">' + found.map(function (k) { return "<div><b>" + esc(k) + "</b>" + esc(keywords[k]) + "</div>"; }).join("") + "</div>";
  }

  // ---- Rails -----------------------------------------------------------------------
  var MENU = [
    { href: "/shattered", label: "Home", ico: "home", page: "home" },
    { href: "/shattered-play", label: "Play Shattered Realms", ico: "play", page: "play", cls: "tp-menu-play" },
    { href: "/shattered-news", label: "Patch Notes & News", ico: "scroll", page: "news" },
    { href: "/shattered-factions", label: "Factions (Roster)", ico: "cards", page: "factions" },
    { href: "/shattered-manual", label: "How to Play", ico: "book", page: "manual" },
    { href: "/shattered-manual#unlocks", label: "Unlocks & Rewards", ico: "shield", page: "unlocks" },
    { href: "/shattered-ladder", label: "Ranked Ladder", ico: "trophy", page: "ladder" },
    { href: ITCH, label: "Community (itch.io)", ico: "users", page: "itch", ext: true }
  ];
  function renderLeft() {
    var rail = $('[data-sr-rail="left"]');
    if (!rail) return;
    rail.innerHTML =
      '<div class="tp-card tp-badge"><img src="/assets/images/shatteredrealmslogo.png" alt="Shattered Realms">' +
        '<div class="tp-badge-name">Shattered Realms</div><div class="tp-badge-copy">A dark-fantasy card battler. Fuse two realms, build a 40-card deck, climb the ladder.</div></div>' +
      '<nav class="tp-card" aria-label="Shattered Realms menu"><h2 class="tp-title">Battle Menu</h2><div class="tp-menu">' +
        MENU.map(function (m) {
          return '<a href="' + m.href + '"' + (m.cls ? ' class="' + m.cls + '"' : "") + (m.page === page ? ' aria-current="page"' : "") +
            (m.ext ? ' target="_blank" rel="noopener noreferrer"' : "") + ">" + icon(m.ico) + "<span>" + m.label + "</span></a>";
        }).join("") +
      "</div></nav>" +
      '<div class="tp-card" data-sr-acct-card><h2 class="tp-title">Account</h2><p class="tp-small">Loading&hellip;</p></div>';
    renderAccountCard();
  }
  function renderAccountCard() {
    var box = $("[data-sr-acct-card]");
    if (!box) return;
    if (!TP.srToken()) {
      box.innerHTML = '<h2 class="tp-title">Account</h2>' +
        '<p class="tp-small" style="margin:0 0 12px">Your Shattered Realms account is separate from your Comic / Pokémon account. It works in the browser game, on Android and here.</p>' +
        '<a class="tp-btn tp-btn-block" href="/shattered-account">Sign in</a>' +
        '<a class="tp-btn tp-btn-ghost tp-btn-block" style="margin-top:8px" href="/shattered-account#register">Create account</a>';
      return;
    }
    me().then(function (you) {
      if (!you) { renderAccountCard(); return; }
      var c = TIER_COLOR[you.tier] || "#eab308";
      box.innerHTML = '<h2 class="tp-title">Account</h2>' +
        '<div class="sr-rank-badge" style="--c:' + c + '">' + esc(you.label) + "</div>" +
        '<p style="margin:0;text-align:center;font-weight:800;font-size:16px">' + esc(you.name) + "</p>" +
        '<p class="tp-small" style="text-align:center;margin:4px 0 12px">' + esc(you.rp) + " RP" + (you.place ? " · #" + you.place + " on the ladder" : "") + "</p>" +
        '<a class="tp-btn tp-btn-block" href="/shattered-play">Play signed in</a>' +
        '<a class="tp-btn tp-btn-ghost tp-btn-block" style="margin-top:8px" href="/shattered-account">Profile</a>';
    });
  }
  function ladderRows(rows, limit) {
    if (!rows || !rows.length) return '<p class="tp-empty">No ranked games yet. Be the first on the board.</p>';
    return '<ol class="tp-ladder">' + rows.slice(0, limit).map(function (r) {
      var pct = r.tier === "Legendary" ? 100 : Math.max(4, Math.min(100, r.rp || 0));
      return '<li><span class="tp-name">' + esc(r.name) + "</span><em>" + esc(r.label) + '</em><span class="tp-xp" title="' + esc(r.rp) + ' RP"><i style="--p:' + pct + '%"></i></span></li>';
    }).join("") + "</ol>";
  }
  function renderRight() {
    var rail = $('[data-sr-rail="right"]');
    if (!rail) return;
    rail.innerHTML =
      '<div class="tp-card"><h2 class="tp-title">Competitive Pulse</h2><div class="tp-pulse">' +
        '<div><b data-sr-pulse="ranked">&ndash;</b><span>On the ladder</span></div>' +
        '<div><b data-sr-pulse="top">&ndash;</b><span>Top rank</span></div>' +
        '<div><b data-sr-pulse="factions">22</b><span>Realms</span></div>' +
        '<div><b data-sr-pulse="cards">1,000+</b><span>Cards</span></div>' +
      "</div></div>" +
      '<div class="tp-card"><h2 class="tp-title">Top 10 Players<small>Ranked</small></h2><div data-sr-top>' + '<p class="tp-empty">Loading&hellip;</p>' + "</div>" +
        '<a class="tp-btn tp-btn-ghost tp-btn-block" style="margin-top:12px" href="/shattered-ladder">Full ladder</a></div>' +
      '<div class="tp-card"><h2 class="tp-title">Realm Vote<small>Next faction</small></h2><div data-sr-mini-vote><p class="tp-empty">Loading&hellip;</p></div></div>';
    var top = $("[data-sr-top]", rail);
    var stopWake = wakeNote($(".tp-empty", top));
    ladder().then(function (d) {
      stopWake();
      top.innerHTML = ladderRows(d.rows, 10);
      $("[data-sr-pulse=ranked]").textContent = d.rows.length >= 50 ? "50+" : String(d.rows.length);
      $("[data-sr-pulse=top]").textContent = d.rows[0] ? d.rows[0].tier : "–";
    }).catch(function () { stopWake(); top.innerHTML = '<p class="tp-empty">The ladder is resting right now. Try again in a minute.</p>'; });
    news().then(function (n) {
      $("[data-sr-pulse=factions]").textContent = String(n.factions.length);
      $("[data-sr-pulse=cards]").textContent = n.cardCount ? (Math.floor(n.cardCount / 100) * 100).toLocaleString("en-US") + "+" : "1,000+";
      if (n.poll) renderVote($("[data-sr-mini-vote]", rail), n.poll, true);
    }).catch(function () { $("[data-sr-mini-vote]", rail).innerHTML = '<p class="tp-empty">Vote unavailable right now.</p>'; });
  }

  // ---- Vote --------------------------------------------------------------------------
  function renderVote(box, poll, mini) {
    var mine = null;
    try { mine = localStorage.getItem("sr-site-vote-" + poll.id); } catch (e) {}
    function draw(t) {
      var total = (t && t.total) || 0;
      if (mini) {
        box.innerHTML = '<ol class="tp-ladder">' + poll.options.map(function (o) {
          var n = (t && t.counts && t.counts[o.id]) || 0, p = total ? Math.round(n * 100 / total) : 0;
          return '<li><span class="tp-name">' + esc(o.name) + (mine === o.id ? " ✓" : "") + "</span><em>" + p + '%</em><span class="tp-xp"><i style="--p:' + p + '%"></i></span></li>';
        }).join("") + '</ol><a class="tp-btn tp-btn-ghost tp-btn-block" style="margin-top:12px" href="/shattered#vote">Cast your vote</a>';
        return;
      }
      box.innerHTML = '<p class="tp-small" style="margin:0 0 10px">' + esc(poll.question || "Which faction should join the realms next?") + " " + total + " vote" + (total === 1 ? "" : "s") + " so far. You can change your vote any time.</p>" +
        '<div class="sr-vote">' + poll.options.map(function (o) {
          var n = (t && t.counts && t.counts[o.id]) || 0, p = total ? Math.round(n * 100 / total) : 0;
          return '<button type="button" class="sr-vote-opt' + (mine === o.id ? " is-mine" : "") + '" data-vote="' + esc(o.id) + '" aria-pressed="' + (mine === o.id) + '">' +
            (o.art ? '<img src="' + esc(o.art) + '" alt="" loading="lazy">' : "") + '<span class="pct">' + p + "%</span>" +
            "<span>" + esc(o.name) + "</span><small>" + esc(o.blurb || "") + '</small><div class="bar"><i style="--p:' + p + '%"></i></div></button>';
        }).join("") + "</div>";
    }
    draw(null);
    pollGet(poll.id).then(function (t) { if (t.mine) mine = t.mine; draw(t); }).catch(function () {});
    if (!mini) {
      box.addEventListener("click", function (e) {
        var b = e.target.closest("[data-vote]");
        if (!b) return;
        var choice = b.getAttribute("data-vote");
        b.disabled = true;
        pollVote(poll.id, choice).then(function (t) {
          mine = choice;
          try { localStorage.setItem("sr-site-vote-" + poll.id, choice); } catch (e2) {}
          draw(t);
          toast("Vote counted for " + (poll.options.filter(function (o) { return o.id === choice; })[0] || {}).name + ".");
        }).catch(function (err) { b.disabled = false; toast(err.message || "Couldn't vote right now."); });
      });
    }
  }

  // ---- Patch notes -----------------------------------------------------------------
  function blockHTML(b, n) {
    var kw = n.keywords;
    var body = "";
    if (b.groups) {
      body = b.groups.map(function (g) {
        return '<div class="sr-group"><div class="sr-group-head"><b>' + esc(g.title) + "</b><small>" + g.cards.length + " card" + (g.cards.length === 1 ? "" : "s") + "</small></div>" +
          (g.blurb ? '<p class="tp-small" style="margin:0 0 10px">' + esc(g.blurb) + "</p>" : "") +
          '<div class="sr-gallery">' + g.cards.map(function (c) { return cardButton(c, { small: true, keywords: kw }); }).join("") + "</div></div>";
      }).join("");
    } else if (b.compare) {
      body = b.compare.map(function (x) {
        return '<div class="sr-compare"><div class="sr-compare-name">' + (x.kind ? '<span class="tp-chip k-' + esc(x.kind) + '">' + esc(x.kindLabel) + "</span>" : "") +
          "<b>" + esc(x.now.name) + "</b>" + (x.note ? '<span class="note">' + esc(x.note) + "</span>" : "") + "</div>" +
          '<div class="sr-compare-row"><figure class="was"><figcaption>Before</figcaption>' + cardButton(x.before, { small: true, keywords: kw, variant: "before" }) + "</figure>" +
          '<span class="arrow" aria-label="becomes">&#10140;</span><figure><figcaption>Now</figcaption>' + cardButton(x.now, { small: true, keywords: kw }) + "</figure></div>" +
          (x.why ? '<p class="sr-why"><b>Why:</b> ' + esc(x.why) + "</p>" : "") + "</div>";
      }).join("");
    } else if (b.boards) {
      body = '<div class="sr-boards">' + b.boards.map(function (x) {
        return '<figure class="sr-board">' + (x.art ? '<img src="' + esc(x.art) + '" alt="' + esc(x.title) + ' board" loading="lazy">' : "") +
          "<figcaption><b>" + esc(x.title) + "</b>" + esc(x.realm || "") + (x.unlock ? " · " + esc(x.unlock) : "") + "</figcaption></figure>";
      }).join("") + "</div>";
    } else if (b.list) {
      body = '<ul class="sr-list">' + b.list.map(function (it) {
        return "<li>" + (it.cards && it.cards.length ? '<div class="sr-chip-row">' + it.cards.map(function (c) {
          cardIndex[c.id] = c;
          return '<button type="button" class="sr-chip" data-card="' + esc(c.id) + '">' + (c.art ? '<img src="' + esc(c.art) + '" alt="">' : "") + esc(c.name) + "</button>";
        }).join("") + "</div>" : "") + (it.kind ? '<span class="tp-chip k-' + esc(it.kind) + '">' + esc(it.kindLabel) + "</span>" : "") + richText(it.text, kw) +
          (it.why ? '<p class="sr-why"><b>Why:</b> ' + esc(it.why) + "</p>" : "") + "</li>";
      }).join("") + "</ul>";
    }
    return '<section class="sr-block" data-cat="' + esc(b.cat) + '"><div class="sr-block-head"><span class="tp-chip">' + esc(b.catLabel) + "</span><h3>" + esc(b.h) + "</h3></div>" +
      (b.why ? '<p class="sr-why"><b>Why:</b> ' + esc(b.why) + "</p>" : "") + body + "</section>";
  }
  function postHTML(p, n, filter) {
    var blocks = p.blocks.filter(function (b) {
      if (!filter || filter === "all") return true;
      if (filter.indexOf("kind:") === 0) {
        var k = filter.slice(5);
        return (b.compare && b.compare.some(function (x) { return x.kind === k; })) || (b.list && b.list.some(function (x) { return x.kind === k; }));
      }
      return filter.indexOf("tab:") === 0 ? (n.cats[b.cat] && n.cats[b.cat].tab === filter.slice(4)) : b.cat === filter;
    }).map(function (b) {
      if (!filter || filter.indexOf("kind:") !== 0) return b;
      var k = filter.slice(5), copy = {};
      Object.keys(b).forEach(function (key) { copy[key] = b[key]; });
      if (b.compare) copy.compare = b.compare.filter(function (x) { return x.kind === k; });
      if (b.list) copy.list = b.list.filter(function (x) { return x.kind === k; });
      return copy;
    });
    return '<article class="tp-card" id="post-' + esc(p.id) + '"><div class="sr-post-head"><h2 class="tp-h2">' + esc(p.title) + "</h2>" +
      (p.tag ? '<span class="tp-chip">' + esc(p.tag) + "</span>" : "") + "<time>" + esc(p.date) + "</time></div>" +
      (p.intro ? '<p class="tp-lede">' + esc(p.intro) + "</p>" : "") +
      (blocks.length ? blocks.map(function (b) { return blockHTML(b, n); }).join("") : '<p class="tp-empty" style="margin-top:14px">Nothing of that kind in this update.</p>') +
      (p.details && p.details.length && (!filter || filter === "all") ? '<details class="sr-details"><summary>Every change in this update (' + p.details.length + ")</summary><ul>" + p.details.map(function (d) { return "<li>" + richText(d, n.keywords) + "</li>"; }).join("") + "</ul></details>" : "") +
      "</article>";
  }

  // ---- Pages -----------------------------------------------------------------------
  var views = {};

  views.home = function () {
    var latest = $("[data-sr-latest]"), strip = $("[data-sr-strip]"), vote = $("[data-sr-vote]");
    var stop = wakeNote(latest);
    news().then(function (n) {
      stop();
      var p = n.posts[0];
      if (p) {
        var cats = {};
        p.blocks.forEach(function (b) { cats[b.catLabel] = 1; });
        latest.innerHTML = '<div class="sr-post-head"><h3 class="tp-h3">' + esc(p.title) + "</h3><time>" + esc(p.date) + "</time></div>" +
          '<p class="tp-lede">' + esc(p.intro || "") + "</p>" +
          '<div class="tp-row" style="margin-top:12px">' + Object.keys(cats).map(function (c) { return '<span class="tp-chip">' + esc(c) + "</span>"; }).join("") + "</div>" +
          '<div class="tp-row" style="margin-top:16px"><a class="tp-btn" href="/shattered-news#post-' + esc(p.id) + '">Read the full patch notes</a>' +
          '<a class="tp-btn tp-btn-ghost" href="/shattered-news">All updates (' + n.posts.length + ")</a></div>";
      }
      strip.innerHTML = n.factions.map(function (f) {
        return '<a href="/shattered-factions#' + encodeURIComponent(f.name) + '">' + (f.hero ? '<img src="' + esc(f.hero) + '" alt="" loading="lazy">' : "") + "<span>" + esc(f.name) + "</span></a>";
      }).join("");
      var count = $("[data-sr-count]");
      if (count) count.textContent = String(n.factions.length);
      if (n.poll && vote) renderVote(vote, n.poll, false);
    }).catch(function () {
      stop();
      latest.innerHTML = '<p class="tp-empty">Patch notes are unavailable right now. <a href="' + ITCH + '" target="_blank" rel="noopener noreferrer">Read them on itch.io</a>.</p>';
      strip.innerHTML = "";
      if (vote) vote.innerHTML = '<p class="tp-empty">The vote is unavailable right now.</p>';
    });
  };

  views.news = function () {
    var out = $("[data-sr-posts]"), postTabs = $("[data-sr-post-tabs]"), catTabs = $("[data-sr-cat-tabs]");
    var stop = wakeNote(out);
    news().then(function (n) {
      stop();
      var hash = decodeURIComponent(location.hash.replace(/^#post-/, ""));
      var state = { post: n.posts.some(function (p) { return p.id === hash; }) ? hash : "all", filter: "all" };
      var present = {};
      n.posts.forEach(function (p) { p.blocks.forEach(function (b) { present["tab:" + n.cats[b.cat].tab] = 1; (b.compare || []).concat(b.list || []).forEach(function (x) { if (x.kind) present["kind:" + x.kind] = 1; }); }); });
      postTabs.innerHTML = '<button class="tp-tab" role="tab" data-post="all">All updates</button>' + n.posts.map(function (p) {
        return '<button class="tp-tab" role="tab" data-post="' + esc(p.id) + '">' + esc(p.date) + "</button>";
      }).join("");
      var tabs = [];
      Object.keys(n.cats).forEach(function (c) { var t = "tab:" + n.cats[c].tab; if (tabs.indexOf(t) === -1) tabs.push(t); });
      Object.keys(n.kinds).forEach(function (k) { tabs.push("kind:" + k); });
      catTabs.innerHTML = '<button class="tp-tab" role="tab" data-filter="all">Everything</button>' + tabs.filter(function (k) { return present[k]; }).map(function (k) {
        return '<button class="tp-tab" role="tab" data-filter="' + esc(k) + '">' + esc(k.indexOf("kind:") === 0 ? n.kinds[k.slice(5)].tab : k.slice(4)) + "</button>";
      }).join("");
      function draw() {
        $$("[data-post]", postTabs).forEach(function (b) { b.setAttribute("aria-selected", String(b.getAttribute("data-post") === state.post)); });
        $$("[data-filter]", catTabs).forEach(function (b) { b.setAttribute("aria-selected", String(b.getAttribute("data-filter") === state.filter)); });
        var posts = state.post === "all" ? n.posts : n.posts.filter(function (p) { return p.id === state.post; });
        out.innerHTML = posts.map(function (p) { return postHTML(p, n, state.filter); }).join("");
      }
      postTabs.addEventListener("click", function (e) { var b = e.target.closest("[data-post]"); if (!b) return; state.post = b.getAttribute("data-post"); history.replaceState(null, "", state.post === "all" ? location.pathname : "#post-" + state.post); draw(); });
      catTabs.addEventListener("click", function (e) { var b = e.target.closest("[data-filter]"); if (!b) return; state.filter = b.getAttribute("data-filter"); draw(); });
      draw();
      if (state.post !== "all") { var a = doc.getElementById("post-" + state.post); if (a) a.scrollIntoView(); }
    }).catch(function () { stop(); out.innerHTML = '<div class="tp-card"><p class="tp-empty">Patch notes are unavailable right now. Try again in a minute, or <a href="' + ITCH + '" target="_blank" rel="noopener noreferrer">read them on itch.io</a>.</p></div>'; });
  };

  views.factions = function () {
    var grid = $("[data-sr-factions]"), search = $("[data-sr-faction-search]");
    var stop = wakeNote(grid);
    news().then(function (n) {
      stop();
      var list = n.factions.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
      function draw() {
        var q = (search.value || "").trim().toLowerCase();
        var shown = list.filter(function (f) { return !q || (f.name + " " + f.summary + " " + f.strengths.join(" ")).toLowerCase().indexOf(q) !== -1; });
        grid.innerHTML = shown.length ? shown.map(function (f) {
          return '<button type="button" class="sr-faction" data-faction="' + esc(f.name) + '" id="' + esc(f.name) + '"><div class="sr-faction-art">' + (f.hero ? '<img src="' + esc(f.hero) + '" alt="" loading="lazy">' : "") +
            '<span class="sr-faction-name">' + esc(f.name) + '</span></div><div class="sr-faction-body">' + esc(f.summary || "") + "</div></button>";
        }).join("") : '<p class="tp-empty">No realm matches that search.</p>';
        $("[data-sr-faction-count]").textContent = shown.length + " of " + list.length;
      }
      function open(name) {
        var f = list.filter(function (x) { return x.name === name; })[0];
        if (!f) return;
        openSheet('<div class="sr-sheet-grid"><div>' + (f.hero ? '<img src="' + esc(f.hero) + '" alt="' + esc(f.name) + ' hero" style="width:100%;border-radius:8px;border:1px solid rgba(234,179,8,.5)">' : "") + "</div><div>" +
          '<span class="tp-eyebrow">Realm</span><h2 class="tp-h2">' + esc(f.name) + '</h2><p class="tp-lede">' + esc(f.summary || "") + "</p>" +
          '<div class="sr-traits" style="margin-top:16px"><div class="good"><h4>Strengths</h4><ul>' + f.strengths.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ul></div>" +
          '<div class="bad"><h4>Weaknesses</h4><ul>' + f.weaknesses.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ul></div></div>" +
          '<div class="tp-row" style="margin-top:18px"><a class="tp-btn" href="/shattered-play">Play ' + esc(f.name) + '</a><a class="tp-btn tp-btn-ghost" href="/shattered-manual#decks">How decks work</a></div></div></div>');
        history.replaceState(null, "", "#" + encodeURIComponent(f.name));
      }
      grid.addEventListener("click", function (e) { var b = e.target.closest("[data-faction]"); if (b) open(b.getAttribute("data-faction")); });
      search.addEventListener("input", draw);
      draw();
      var h = decodeURIComponent(location.hash.slice(1));
      if (h) open(h);
    }).catch(function () { stop(); grid.innerHTML = '<p class="tp-empty">The realms are unavailable right now. Try again in a minute.</p>'; });
  };

  views.manual = function () {
    news().then(function (n) {
      var r = n.rules || {};
      $$("[data-rule]").forEach(function (el) { var v = r[el.getAttribute("data-rule")]; if (v != null) el.textContent = v; });
      var kw = $("[data-sr-keywords]");
      if (kw) {
        kw.innerHTML = Object.keys(n.keywords).sort().map(function (k) { return "<div><b>" + esc(k) + "</b>" + esc(n.keywords[k]) + "</div>"; }).join("");
        var count = $("[data-sr-kw-count]");
        if (count) count.textContent = Object.keys(n.keywords).length;
      }
      var tiers = $("[data-sr-tiers]");
      if (tiers && n.tiers) tiers.innerHTML = n.tiers.map(function (t) { return '<span style="color:' + (TIER_COLOR[t] || "#fff") + '">' + esc(t) + "</span>"; }).join("");
    }).catch(function () { var kw = $("[data-sr-keywords]"); if (kw) kw.innerHTML = '<p class="tp-empty">The keyword list is unavailable right now.</p>'; });
    // Highlight the section in view.
    var links = $$(".sr-anchors a");
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          links.forEach(function (a) { a.classList.toggle("is-on", a.getAttribute("href") === "#" + en.target.id); });
        });
      }, { rootMargin: "-30% 0px -60% 0px" });
      $$(".sr-manual section[id]").forEach(function (s) { io.observe(s); });
    }
  };

  views.ladder = function () {
    var body = $("[data-sr-ladder]"), search = $("[data-sr-ladder-search]"), pager = $("[data-sr-pager]");
    var stop = wakeNote(body);
    Promise.all([ladder(), me()]).then(function (res) {
      stop();
      var rows = res[0].rows || [], you = res[1];
      var state = { page: 0, per: 10 };
      if (you && you.place) { var mine = $("[data-sr-me]"); if (mine) mine.innerHTML = "You're <b>#" + you.place + "</b> (" + esc(you.label) + ", " + esc(you.rp) + " RP)."; }
      function draw() {
        var q = (search.value || "").trim().toLowerCase();
        var shown = rows.filter(function (r) { return !q || r.name.toLowerCase().indexOf(q) !== -1 || String(r.label).toLowerCase().indexOf(q) !== -1; });
        var pages = Math.max(1, Math.ceil(shown.length / state.per));
        state.page = Math.min(state.page, pages - 1);
        var slice = shown.slice(state.page * state.per, state.page * state.per + state.per);
        body.innerHTML = slice.length ? slice.map(function (r) {
          var games = (r.wins || 0) + (r.losses || 0);
          return "<tr" + (you && you.name === r.name ? ' class="is-me"' : "") + '><td class="place">' + r.place + "</td><td><b>" + esc(r.name) + "</b></td>" +
            '<td><span class="sr-tier" style="--c:' + (TIER_COLOR[r.tier] || "#9ca3af") + '"><i></i>' + esc(r.label) + "</span></td><td>" + esc(r.rp) + "</td>" +
            "<td>" + (r.wins || 0) + " – " + (r.losses || 0) + "</td><td>" + (games ? Math.round((r.wins || 0) * 100 / games) + "%" : "–") + "</td>" +
            "<td>" + (r.series ? r.series.wins + "-" + r.series.losses + " to " + esc(r.series.to) : "–") + "</td></tr>";
        }).join("") : '<tr><td colspan="7"><p class="tp-empty">' + (rows.length ? "No player matches that search." : "No ranked games yet. Play a ranked match to claim the top spot.") + "</p></td></tr>";
        pager.innerHTML = '<span class="tp-small">' + shown.length + " player" + (shown.length === 1 ? "" : "s") + " · page " + (state.page + 1) + " of " + pages + "</span>" +
          '<span class="tp-row"><button class="tp-btn tp-btn-ghost" type="button" data-pg="-1"' + (state.page === 0 ? " disabled" : "") + '>&lsaquo; Prev</button>' +
          '<button class="tp-btn tp-btn-ghost" type="button" data-pg="1"' + (state.page >= pages - 1 ? " disabled" : "") + ">Next &rsaquo;</button></span>";
      }
      pager.addEventListener("click", function (e) { var b = e.target.closest("[data-pg]"); if (!b || b.disabled) return; state.page += +b.getAttribute("data-pg"); draw(); });
      search.addEventListener("input", function () { state.page = 0; draw(); });
      draw();
    }).catch(function () { stop(); body.innerHTML = '<tr><td colspan="7"><p class="tp-empty">The ladder is unavailable right now. Try again in a minute.</p></td></tr>'; });
  };

  views.account = function () {
    var guest = $("[data-sr-guest]"), prof = $("[data-sr-profile]");
    var form = $("[data-sr-auth-form]"), status = $("[data-sr-auth-status]"), modeBtns = $$("[data-sr-mode]");
    var mode = location.hash === "#register" ? "register" : "login";
    function setMode(m) {
      mode = m;
      modeBtns.forEach(function (b) { b.setAttribute("aria-selected", String(b.getAttribute("data-sr-mode") === m)); });
      $("[data-sr-confirm]").hidden = m !== "register";
      $("[data-sr-confirm] input").required = m === "register";
      $("[data-sr-submit]").textContent = m === "register" ? "Create account" : "Sign in";
      $("[name=password]", form).autocomplete = m === "register" ? "new-password" : "current-password";
      status.textContent = ""; status.className = "tp-status";
    }
    modeBtns.forEach(function (b) { b.addEventListener("click", function () { setMode(b.getAttribute("data-sr-mode")); }); });
    setMode(mode);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = form.name.value.trim(), pw = form.password.value;
      if (mode === "register" && pw !== form.confirm.value) { status.textContent = "Those passwords don't match."; status.className = "tp-status is-error"; return; }
      var btn = $("[data-sr-submit]");
      btn.disabled = true; status.textContent = mode === "register" ? "Creating your account…" : "Signing in…"; status.className = "tp-status";
      var slow = setTimeout(function () { status.textContent = "Waking the realms server up. This can take up to a minute the first time…"; }, 5000);
      TP.srApi(mode, { name: name, password: pw }).then(function (d) {
        clearTimeout(slow);
        TP.srSignIn(d.token, d.you.name);
        meP = Promise.resolve(d.you);
        form.reset();
        status.textContent = mode === "register" ? "Welcome to the realms, " + d.you.name + "!" : "Signed in.";
        status.className = "tp-status is-ok";
        showProfile(d.you);
        renderAccountCard();
      }).catch(function (err) {
        clearTimeout(slow);
        status.textContent = err.message || "Couldn't reach the realms server. Try again in a minute.";
        status.className = "tp-status is-error";
      }).then(function () { btn.disabled = false; });
    });
    function showProfile(you) {
      guest.hidden = true; prof.hidden = false;
      var c = TIER_COLOR[you.tier] || "#eab308";
      var games = (you.rankedWins || 0) + (you.rankedLosses || 0), all = (you.wins || 0) + (you.losses || 0);
      var pct = you.tier === "Legendary" ? 100 : Math.max(0, Math.min(100, you.rp || 0));
      $("[data-sr-profile-body]").innerHTML =
        '<div class="sr-rank-badge" style="--c:' + c + '">' + esc(you.label) + "</div>" +
        '<h2 class="tp-h2" style="text-align:center">' + esc(you.name) + (you.admin ? ' <span class="tp-chip">Admin</span>' : "") + "</h2>" +
        '<p class="tp-small" style="text-align:center;margin:6px 0 0">' + esc(you.tier) + " tier · " + esc(you.rp) + " RP" + (you.place ? " · #" + you.place + " on the ladder" : " · not ranked yet") + "</p>" +
        '<div class="sr-rp" title="RP toward the next division"><i style="--p:' + pct + '%"></i></div>' +
        (you.series ? '<p class="tp-small" style="text-align:center;margin-top:8px">Promotion series to <b>' + esc(you.series.to) + "</b>: " + you.series.wins + " win" + (you.series.wins === 1 ? "" : "s") + ", " + you.series.losses + " loss" + (you.series.losses === 1 ? "" : "es") + " (best of " + you.series.best + ").</p>" : "") +
        '<div class="sr-statgrid"><div><b>' + (you.rankedWins || 0) + "</b><span>Ranked wins</span></div><div><b>" + (you.rankedLosses || 0) + "</b><span>Ranked losses</span></div>" +
          "<div><b>" + (games ? Math.round((you.rankedWins || 0) * 100 / games) + "%" : "–") + "</b><span>Ranked win rate</span></div>" +
          "<div><b>" + (you.wins || 0) + "</b><span>All wins</span></div><div><b>" + (you.losses || 0) + "</b><span>All losses</span></div>" +
          "<div><b>" + all + "</b><span>Games played</span></div></div>" +
        '<div class="tp-row" style="margin-top:16px;justify-content:center"><a class="tp-btn" href="/shattered-play">Play signed in</a><a class="tp-btn tp-btn-ghost" href="/shattered-ladder">See the ladder</a>' +
          '<button class="tp-btn tp-btn-ghost" type="button" data-sr-signout>Sign out</button></div>';
    }
    prof.addEventListener("click", function (e) {
      if (!e.target.closest("[data-sr-signout]")) return;
      var t = TP.srToken();
      if (t) TP.srApi("logout", { token: t }).catch(function () {});
      TP.srSignOut(); meP = null;
      prof.hidden = true; guest.hidden = false;
      renderAccountCard();
      toast("Signed out of Shattered Realms on this site.");
    });
    me().then(function (you) { if (you) showProfile(you); });
  };

  views.play = function () {
    var frame = $(".sr-stage iframe"), loading = $(".sr-loading");
    var t = TP.srToken();
    frame.src = TP.srBase + "/" + (t ? "#sr-token=" + t : "");
    frame.addEventListener("load", function () { loading.classList.add("done"); });
    // The Play buttons on the arena pages open a small pop-up (scripts/index.js); give the card game more room.
    if (window.opener) {
      try {
        var w = Math.min(1280, screen.availWidth), h = Math.min(820, screen.availHeight);
        window.resizeTo(w, h);
      } catch (e) {}
    }
  };

  renderLeft();
  renderRight();
  if (views[page]) views[page]();
})();
