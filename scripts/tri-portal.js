/* Tri-Game Portal: Comic-Arena · Pokémon-Arena · Shattered Realms
 *
 * Loaded (not deferred) in the <head> of every portal page, so the active
 * game's theme is on <html data-theme> before the first paint. Then, once
 * the page is parsed, it adds the shared shell (Shattered Realms promo bar
 * and the universe header with the Comic / Split / Pokémon / Shattered
 * switcher), the account chip, and the first-visit welcome flow.
 *
 * Persistence:
 *   localStorage "tri-universe"   the visitor's chosen game (comic | pokemon | shattered)
 *   localStorage "tri-onboarded"  the welcome flow has been answered or skipped
 *   cookie       "tri_universe"   same choice, read by server.js for /characters,
 *                                 /missions, /manual, /ladder, /news, /login
 *   localStorage "comicArenaMode" kept in step (scripts/arena-navigation.js reads it)
 *
 * Never loaded on the battle / team-select screens (ingame.html, selection.html).
 */
(function () {
  "use strict";

  var doc = document;
  var root = doc.documentElement;
  var params = new URLSearchParams(location.search);
  var rawPath = location.pathname.replace(/\/+$/, "") || "/";
  var file = decodeURIComponent(rawPath.split("/").pop() || "").toLowerCase();
  if (rawPath === "/") file = "";

  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  var GAMES = ["comic", "pokemon", "shattered"];
  var isGame = function (g) { return GAMES.indexOf(g) !== -1; };

  // ---- Which page is this? --------------------------------------------------
  var bare = file.replace(/\.html$/, "");
  var SECTION_OF = {
    "": "home", "index": "home", "comic": "home", "pokemon": "home", "pokemon-home": "home", "shattered": "home",
    "split": "split",
    "missions": "missions", "pokemon-missions": "missions",
    "charactersandskills": "characters", "pokemon-charactersandskills": "characters", "shattered-factions": "characters",
    "community": "community", "pokemon-community": "community",
    "events": "events", "pokemon-events": "events",
    "manual": "manual", "pokemon-manual": "manual", "shattered-manual": "manual",
    "profile": "profile", "pokemon-profile": "profile", "shattered-account": "profile",
    "clan panel": "clan", "clan-panel": "clan", "pokemon-clanpanel": "clan", "clanprofile": "clan",
    "changebackgrounds": "backgrounds", "pokemon-changebackgrounds": "backgrounds",
    "resetaccount": "reset", "pokemon-resetaccount": "reset",
    "changeavatar": "profile",
    "winrates": "winrates", "pokemon-winrates": "winrates",
    "playeraccounts": "accounts", "pokemon-playeraccounts": "accounts",
    "newspost": "newsadmin", "pokemon-newspost": "newsadmin",
    "editmission": "missionadmin", "pokemon-editmission": "missionadmin",
    "charactereditor": "charadmin", "pokemon-charactereditor": "charadmin",
    "pokemon-demos": "demos", "demofeedback": "demos",
    "shattered-news": "news", "shattered-ladder": "ladder", "shattered-realms": "play", "shattered-play": "play",
    "register": "login", "selection-login": "login"
  };
  var section = SECTION_OF[bare] || "other";

  // Where each section lives in each game. Anything missing falls back to that game's home.
  var ROUTES = {
    comic: {
      home: "/comic", missions: "missions.html", characters: "charactersandskills.html", community: "community.html",
      events: "events.html", manual: "manual.html", profile: "profile.html", clan: "clan%20panel.html",
      backgrounds: "changebackgrounds.html", reset: "resetaccount.html", winrates: "winrates.html", accounts: "playeraccounts.html",
      newsadmin: "newspost.html", missionadmin: "editmission.html", charadmin: "charactereditor.html",
      news: "/comic#news-feed", ladder: "community.html", login: "/comic#auth-panel", play: "/comic"
    },
    pokemon: {
      home: "/pokemon", missions: "/pokemon-missions", characters: "pokemon-charactersandskills.html", community: "/pokemon-community",
      events: "/pokemon-events", manual: "/pokemon-manual", profile: "pokemon-profile.html", clan: "pokemon-clanpanel.html",
      backgrounds: "pokemon-changebackgrounds.html", reset: "pokemon-resetaccount.html", winrates: "pokemon-winrates.html",
      accounts: "pokemon-playeraccounts.html", newsadmin: "pokemon-newspost.html", missionadmin: "pokemon-editmission.html",
      charadmin: "pokemon-charactereditor.html", demos: "/pokemon-demos",
      news: "/pokemon#news-feed", ladder: "/pokemon-community", login: "/pokemon#auth-panel", play: "/pokemon"
    },
    shattered: {
      home: "/shattered", news: "/shattered-news", events: "/shattered-news", community: "/shattered-ladder", ladder: "/shattered-ladder",
      characters: "/shattered-factions", manual: "/shattered-manual", missions: "/shattered-manual#unlocks",
      profile: "/shattered-account", login: "/shattered-account", play: "/shattered-play"
    }
  };
  var routeFor = function (game, sec) { var r = ROUTES[game] || ROUTES.comic; return r[sec] || r.home; };

  // The game a page belongs to. Pages that serve both arenas follow ?arena= or the last arena used.
  function pageGame() {
    var q = (params.get("universe") || params.get("arena") || "").toLowerCase();
    if (/^shattered/.test(bare)) return "shattered";
    if (/^pokemon/.test(bare)) return "pokemon";
    if (bare === "split") return "split";
    if (bare === "" || bare === "index" || bare === "comic") return "comic";
    if (isGame(q)) return q;
    if (section === "login" || section === "demos") return isGame(store.get("tri-universe")) ? store.get("tri-universe") : "comic";
    return store.get("comicArenaMode") === "pokemon" ? "pokemon" : "comic";
  }

  function rememberGame(game, explicit) {
    if (!isGame(game)) return;
    if (explicit) {
      store.set("tri-universe", game);
      try { doc.cookie = "tri_universe=" + game + "; path=/; max-age=31536000; samesite=lax"; } catch (e) {}
    }
    if (game === "comic" || game === "pokemon") store.set("comicArenaMode", game);
  }

  // ---- Smart routing: a returning visitor on the bare root goes to their game. ----
  var preferred = store.get("tri-universe");
  if (rawPath === "/" && !params.has("stay") && store.get("tri-onboarded") && (preferred === "pokemon" || preferred === "shattered")) {
    location.replace(routeFor(preferred, "home") + location.hash);
    return;
  }

  var game = pageGame();
  root.setAttribute("data-theme", game);
  root.classList.add("tp-on");
  // Visiting a game's own front door counts as choosing it.
  if (section === "home" && isGame(game)) rememberGame(game, true);

  // ---- Small helpers shared with the tri-portal pages ------------------------
  function el(tag, attrs, html) {
    var n = doc.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { if (attrs[k] != null) n.setAttribute(k, attrs[k]); });
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }
  var toastTimer = null;
  function toast(msg) {
    var t = doc.querySelector(".tp-toast");
    if (!t) { t = el("div", { "class": "tp-toast", role: "status", "aria-live": "polite" }); doc.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("is-on"); }, 3200);
  }
  // Shattered Realms server (accounts, patch notes, ladder). localStorage "sr-api-base" overrides it for testing.
  var SR_BASE = (store.get("sr-api-base") || "https://shattered-realms.onrender.com").replace(/\/+$/, "");
  var SR_TOKEN_KEY = "sr-site-token";
  var srToken = function () { return store.get(SR_TOKEN_KEY); };
  function srApi(route, body) {
    var opts = body ? { method: "POST", headers: { "content-type": "text/plain" }, body: JSON.stringify(body) } : { cache: "no-store" };
    return fetch(SR_BASE + "/api/" + route, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (!r.ok) { var err = new Error(data.error || ("Request failed (" + r.status + ")")); err.status = r.status; err.data = data; throw err; }
        return data;
      });
    });
  }
  var SVG = {
    home: '<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>',
    play: '<path d="M8 5.5 18 12 8 18.5z"/>',
    users: '<circle cx="9" cy="8" r="2.5"/><circle cx="16.5" cy="9.5" r="2"/><path d="M4.5 18c.8-2.7 3-4 5.5-4s4.7 1.3 5.5 4"/><path d="M14 17c.5-1.7 1.8-2.8 3.8-2.8 1.5 0 2.9.8 3.7 2.3"/>',
    grid: '<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/>',
    shield: '<path d="M12 3 5 6v5c0 4.1 2.8 7.9 7 9 4.2-1.1 7-4.9 7-9V6z"/><path d="M9 12h6"/><path d="M12 9v6"/>',
    book: '<path d="M6 4.5A2.5 2.5 0 0 1 8.5 2H20v16H8.5A2.5 2.5 0 0 0 6 20.5z"/><path d="M6 4.5V22"/><path d="M9.5 7H16"/><path d="M9.5 11H17"/>',
    cards: '<rect x="3" y="6" width="11" height="15" rx="1.5"/><path d="M8 3h11.5A1.5 1.5 0 0 1 21 4.5V18"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4"/><path d="M16 6h3a3 3 0 0 1-3 4"/><path d="M12 13v4"/><path d="M8 21h8"/><path d="M9 17h6"/>',
    scroll: '<path d="M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8"/><path d="M6 3a2 2 0 0 0-2 2v2h4V5a2 2 0 0 0-2-2z"/><path d="M8 21a2 2 0 0 1-2-2V7"/><path d="M10 8h6"/><path d="M10 12h6"/><path d="M10 16h4"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.2-4 4.3-6 8-6s6.8 2 8 6"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14"/><path d="M12 17.5h.01"/>',
    calendar: '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 10h16"/><path d="M9 3v4"/><path d="M15 3v4"/>'
  };
  var icon = function (name) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (SVG[name] || "") + "</svg>"; };
  var MARK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 4 6v6c0 5 3.4 8.8 8 10 4.6-1.2 8-5 8-10V6zm0 4 4 2v3.6c0 2.9-1.7 5.3-4 6.3-2.3-1-4-3.4-4-6.3V8z"/></svg>';

  // ---- Shell ---------------------------------------------------------------
  var GAME_LABEL = { comic: "Comic-Arena", pokemon: "Pokémon-Arena", shattered: "Shattered Realms", split: "Split View" };

  function modeLink(mode) {
    var href = mode === "split" ? "/split" : routeFor(mode, section === "split" ? "home" : section);
    var label = "<span>" + { comic: "Comic<span class=\"tp-long\">-Arena</span>", pokemon: "Pokémon<span class=\"tp-long\">-Arena</span>",
      shattered: "Shattered<span class=\"tp-long\"> Realms</span>", split: "Split" }[mode] + "</span>";
    var current = game === mode ? ' aria-current="page"' : "";
    return '<a class="tp-mode" data-mode="' + mode + '" href="' + href + '"' + current + ' title="' + GAME_LABEL[mode] + '"><i></i>' + label + "</a>";
  }

  function buildShell() {
    if (doc.querySelector(".tp-header")) return;
    var promo = el("div", { "class": "tp-promo", role: "region", "aria-label": "Shattered Realms" },
      '<img src="/assets/images/shatteredrealmslogo.png" alt="Shattered Realms">' +
      '<span class="tp-promo-copy"><b>Shattered Realms</b> <span>· 22 realms, fused heroes, ranked ladder. Free in your browser and on Android.</span></span>' +
      '<a class="tp-promo-cta" href="/shattered-play" data-tp-game="shattered">PLAY FREE NOW &#9656;</a>');
    var header = el("header", { "class": "tp-header" },
      '<a class="tp-brand" href="/split" aria-label="Arena Portal home: all three games"><span class="tp-brand-mark">' + MARK + '</span>' +
        '<span class="tp-brand-name">Arena Portal<small>Comic · Pokémon · Shattered</small></span></a>' +
      '<nav class="tp-switch" aria-label="Choose your game">' + ["comic", "split", "pokemon", "shattered"].map(modeLink).join("") + "</nav>" +
      '<div class="tp-tools">' +
        '<button class="tp-icon-btn" type="button" data-tp-guide title="Help me pick a game" aria-label="Open the welcome guide">' + icon("help") + "</button>" +
        '<a class="tp-account" href="' + routeFor(game === "split" ? "comic" : game, "login") + '" data-tp-account>' + icon("user").replace("<svg", '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"') + "<span>Sign in</span></a>" +
      "</div>");
    doc.body.insertBefore(header, doc.body.firstChild);
    doc.body.insertBefore(promo, header);

    header.addEventListener("click", function (e) {
      var a = e.target.closest("a.tp-mode");
      if (a) rememberGame(a.getAttribute("data-mode"), true);
    });
    promo.querySelector(".tp-promo-cta").addEventListener("click", function () { rememberGame("shattered", true); });
    header.querySelector("[data-tp-guide]").addEventListener("click", function () { openOnboarding(true); });
    refreshAccountChip();
  }

  function setChip(label, name, href) {
    var chip = doc.querySelector("[data-tp-account]");
    if (!chip) return;
    chip.href = href;
    chip.querySelector("span").innerHTML = name ? label + " <b>" + esc(name) + "</b>" : esc(label);
  }
  function refreshAccountChip() {
    var g = game === "split" ? (isGame(preferred) ? preferred : "comic") : game;
    if (g === "shattered") {
      var name = store.get("sr-site-name");
      if (srToken() && name) setChip("", name, "/shattered-account");
      else setChip("Sign in", null, "/shattered-account");
      return;
    }
    // Comic and Pokémon share one account (the site's own session cookie).
    var cached = null;
    try { cached = JSON.parse(sessionStorage.getItem("tp-me") || "null"); } catch (e) {}
    var apply = function (user) {
      if (user && user.username) setChip("", user.username, routeFor(g, "profile"));
      else setChip("Sign in", null, routeFor(g, "login"));
    };
    if (cached && Date.now() - cached.t < 120000) { apply(cached.user); return; }
    fetch("/api/me", { credentials: "same-origin" }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        var user = data && data.user ? { username: data.user.username } : null;
        try { sessionStorage.setItem("tp-me", JSON.stringify({ t: Date.now(), user: user })); } catch (e) {}
        apply(user);
      }).catch(function () { apply(null); });
  }

  // A #auth-panel link (from /login or the chip) lands on the sign-in form, focused.
  function focusAuthPanel() {
    if (location.hash !== "#auth-panel") return;
    var panel = doc.getElementById("auth-panel");
    if (!panel) return;
    panel.scrollIntoView({ block: "center" });
    var input = panel.querySelector("input:not([hidden])");
    if (input) setTimeout(function () { input.focus({ preventScroll: true }); }, 250);
  }

  // ---- Welcome flow ----------------------------------------------------------
  // A short chat that asks what the visitor is into and drops them in the right place.
  var ob = null;
  var obState = { step: 0, pick: null };
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var lastFocus = null;

  function obEl(sel) { return ob && ob.querySelector(sel); }
  function obSteps(n) { ob.querySelectorAll(".tp-ob-steps i").forEach(function (s, i) { s.classList.toggle("on", i < n); }); }
  function obScroll() { var log = obEl(".tp-ob-log"); log.scrollTop = log.scrollHeight; }
  function obSay(html, cls) {
    return new Promise(function (done) {
      var log = obEl(".tp-ob-log");
      var typing = el("div", { "class": "tp-ob-typing", "aria-hidden": "true" }, "<i></i><i></i><i></i>");
      log.appendChild(typing); obScroll();
      setTimeout(function () {
        typing.remove();
        log.appendChild(el("div", { "class": "tp-ob-msg" + (cls ? " " + cls : "") }, html));
        obScroll(); done();
      }, reduceMotion ? 0 : Math.min(950, 380 + html.length * 4));
    });
  }
  function obMe(text) { obEl(".tp-ob-log").appendChild(el("div", { "class": "tp-ob-msg is-me" }, esc(text))); obScroll(); }
  function obChoices(list, skipLabel) {
    var box = obEl(".tp-ob-actions");
    box.innerHTML = "";
    list.forEach(function (c, i) {
      var b = el("button", { type: "button", "class": "tp-ob-choice " + (c.cls || "c-plain"), style: "animation-delay:" + (i * 70) + "ms" },
        (c.emoji ? '<span class="e" aria-hidden="true">' + c.emoji + "</span>" : "") + "<span>" + c.label + (c.sub ? "<small>" + c.sub + "</small>" : "") + "</span>");
      b.addEventListener("click", function () { box.innerHTML = ""; c.go(); });
      box.appendChild(b);
    });
    if (skipLabel !== false) {
      var skip = el("button", { type: "button", "class": "tp-ob-skip" }, skipLabel || "Skip, I'll look around myself");
      skip.addEventListener("click", function () { closeOnboarding(true); });
      box.appendChild(skip);
    }
    var first = box.querySelector("button");
    if (first) first.focus({ preventScroll: true });
  }
  function obAccent(g) { obEl(".tp-ob-box").setAttribute("data-accent", g || ""); }

  function finishTo(g) {
    store.set("tri-onboarded", "1");
    rememberGame(g, true);
    var target = routeFor(g, "home");
    var here = rawPath === "/" ? "/comic" : rawPath;
    closeOnboarding(false);
    if (here.replace(/\.html$/, "") !== target.replace(/#.*$/, "")) location.href = target;
    else { root.setAttribute("data-theme", g); toast("Welcome in. Your game is saved: switch any time from the bar up top."); }
  }

  function obStart() {
    obState = { step: 1, pick: null };
    obAccent(null); obSteps(1);
    obEl(".tp-ob-log").innerHTML = "";
    obSay("<strong>Welcome to the Arena Portal!</strong> Three games, one lobby, all free in your browser. Before we drop you into the lobby...")
      .then(function () { return obSay("Well, what are you more interested in? <strong>Comics</strong> or <strong>Pokémon</strong>?", "is-q"); })
      .then(function () {
        obChoices([
          { cls: "c-comic", emoji: "💥", label: "Comics / Hero Battlers", sub: "Heroes, villains, cooldown mind-games", go: function () { pick("comic", "Comics, obviously."); } },
          { cls: "c-pokemon", emoji: "⚡", label: "Pokémon / League Arena", sub: "Type match-ups, evolutions, ranked climbs", go: function () { pick("pokemon", "Pokémon all the way."); } }
        ]);
      });
  }
  function pick(g, said) {
    obState.pick = g; obState.step = 2;
    obMe(said); obAccent(g); obSteps(2);
    var line = g === "comic"
      ? "Good taste. <strong>Comic-Arena</strong> is a 3v3 turn battler: draft a team of heroes and villains, read your opponent's cooldowns, and win the turn before it wins you."
      : "Respect. <strong>Pokémon-Arena</strong> runs on type match-ups, mid-battle evolutions and a ladder that pays out: 25 ranked wins gets you 1,000 points for unlocks.";
    obSay(line)
      .then(function () { return obSay("Or rather, are you into <strong>deep card battlers</strong> and CCG type games?", "is-q"); })
      .then(function () {
        obChoices([
          { cls: "c-shattered", emoji: "🃏", label: "Yes, deal me in", sub: "Decks, synergies, big combo turns", go: function () { srTeaser("Yes! Check Shattered Realms out? What's Shattered Realms?"); } },
          { cls: "c-plain", emoji: "🤔", label: "Maybe, I'm curious", go: function () { srTeaser("Curious. What's Shattered Realms?"); } },
          { cls: g === "comic" ? "c-comic" : "c-pokemon", emoji: "▸", label: "Nah, take me to the " + (g === "comic" ? "Comic" : "Pokémon") + " lobby", go: function () { obMe("Just the arena for now."); goArena(); } }
        ], false);
      });
  }
  function srTeaser(said) {
    obState.step = 3;
    obMe(said); obAccent("shattered"); obSteps(3);
    obSay('<img src="/assets/images/shatteredrealmslogo.png" alt="Shattered Realms">Let me tell you: <strong>Shattered Realms</strong> is our massive 2D digital trading card game where 20+ wild thematic factions collide, from Eels, Bees and Fungi to Demons, Void and Dante\'s Inferno hell circles. You fuse legendary heroes, build custom decks, and battle right in your browser or on Android. Free to play!', "is-sr")
      .then(function () { return obSay("Where to? You can always switch games from the bar at the top of every page.", "is-q"); })
      .then(function () {
        var g = obState.pick || "comic";
        obChoices([
          { cls: "c-shattered", emoji: "↗", label: "Explore Shattered Realms", sub: "Factions, patch notes, the ladder", go: function () { finishTo("shattered"); } },
          { cls: g === "comic" ? "c-comic" : "c-pokemon", emoji: "▸", label: "Jump Into Arena Queues", sub: (g === "comic" ? "Comic-Arena" : "Pokémon-Arena") + " lobby", go: goArena }
        ], false);
      });
  }
  function goArena() {
    var g = obState.pick || "comic";
    obSteps(3);
    obSay("Locking in <strong>" + GAME_LABEL[g] + "</strong>. See you in the queue.").then(function () {
      setTimeout(function () { finishTo(g); }, reduceMotion ? 0 : 450);
    });
  }

  function trapFocus(e) {
    if (e.key === "Escape") { closeOnboarding(true); return; }
    if (e.key !== "Tab") return;
    var f = ob.querySelectorAll("button, a[href]");
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function openOnboarding() {
    if (!ob) {
      ob = el("div", { "class": "tp-ob", role: "dialog", "aria-modal": "true", "aria-labelledby": "tp-ob-title" },
        '<div class="tp-ob-box">' +
          '<div class="tp-ob-top"><span class="tp-ob-avatar">' + MARK + '</span><div><b id="tp-ob-title">Arena Portal</b><span>Online now</span></div>' +
            '<button class="tp-icon-btn tp-ob-close" type="button" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>' +
          '<div class="tp-ob-steps" aria-hidden="true"><i></i><i></i><i></i></div>' +
          '<div class="tp-ob-log" aria-live="polite"></div>' +
          '<div class="tp-ob-actions"></div>' +
        "</div>");
      ob.querySelector(".tp-ob-close").addEventListener("click", function () { closeOnboarding(true); });
      ob.addEventListener("click", function (e) { if (e.target === ob) closeOnboarding(true); });
      ob.addEventListener("keydown", trapFocus);
      doc.body.appendChild(ob);
    }
    lastFocus = doc.activeElement;
    ob.hidden = false;
    doc.body.style.overflow = "hidden";
    obStart();
  }
  function closeOnboarding(skipped) {
    if (!ob) return;
    ob.hidden = true;
    doc.body.style.overflow = "";
    if (skipped) store.set("tri-onboarded", "1");
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }


  // ---- Legacy adapter -----------------------------------------------------------
  // The older pages carry thousands of lines of light "parchment" styling. Rather than leave
  // light islands in a dark theme, any large light panel becomes the theme's card surface and any
  // text that would end up dark-on-dark (or light-on-light) is re-inked. Runs again (debounced)
  // when a page renders more content later (missions, rosters, news).
  function parseColors(str) {
    var out = [], re = /rgba?\(([^)]+)\)/g, m;
    while ((m = re.exec(str))) {
      var p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);
      out.push({ r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 });
    }
    return out;
  }
  function lum(c) {
    var f = function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }
  function hueSat(c) {
    var r = c.r / 255, g = c.g / 255, b = c.b / 255, max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min, h = 0;
    if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return { h: (h * 60 + 360) % 360, s: max ? d / max : 0, v: max };
  }
  // A saturated colour that belongs to another game's palette.
  function offTheme(c) {
    var t = root.getAttribute("data-theme"), hs = hueSat(c);
    if (hs.s < 0.45 || hs.v < 0.35) return false;
    if (t === "comic") return hs.h >= 190 && hs.h <= 260;
    if (t === "pokemon") return hs.h >= 345 || hs.h <= 40;
    if (t === "shattered") return (hs.h >= 190 && hs.h <= 230) || hs.h >= 350 || hs.h <= 15;
    return false;
  }
  var SKIP_TAGS = { IMG: 1, SVG: 1, VIDEO: 1, CANVAS: 1, PICTURE: 1, IFRAME: 1, INPUT: 1, SELECT: 1, TEXTAREA: 1, OPTION: 1, SCRIPT: 1, STYLE: 1, PATH: 1, BR: 1 };
  var bgCache = new WeakMap();
  function ownBg(node) {
    var cs = getComputedStyle(node);
    var cols = parseColors(cs.backgroundColor);
    var base = cols[0] && cols[0].a > 0.35 ? cols[0] : null;
    var grad = /gradient/.test(cs.backgroundImage) ? parseColors(cs.backgroundImage).filter(function (c) { return c.a > 0.35; }) : [];
    var hasUrl = /url\(/.test(cs.backgroundImage);
    if (!base && !grad.length) return hasUrl ? { l: 0.2, url: true } : null;
    var all = grad.length ? grad : [base];
    var l = all.reduce(function (s, c) { return s + lum(c); }, 0) / all.length;
    return { l: l, grad: grad.length > 0, url: hasUrl };
  }
  function effectiveBgLum(node) {
    for (var n = node; n && n.nodeType === 1; n = n.parentElement) {
      if (bgCache.has(n)) return bgCache.get(n);
      var b = ownBg(n);
      if (b) { bgCache.set(n, b.l); return b.l; }
      if (n === doc.body) break;
    }
    return 0.02;
  }
  function hasOwnText(node) {
    for (var c = node.firstChild; c; c = c.nextSibling) if (c.nodeType === 3 && c.nodeValue.trim()) return true;
    return false;
  }
  function adaptTree(scope) {
    if (!scope || scope.nodeType !== 1 || scope.closest(".tp-header, .tp-promo, .tp-ob, .tp-native, .tp-toast")) return;
    var nodes = [scope].concat(Array.prototype.slice.call(scope.querySelectorAll("*")));
    bgCache = new WeakMap();
    // Pass 1: light panels become the theme's card surface.
    nodes.forEach(function (n) {
      if (SKIP_TAGS[n.tagName.toUpperCase()] || n.closest("svg") || n.hasAttribute("data-tp-keep")) return;
      var b = ownBg(n);
      if (!b || b.url || b.l < 0.42) return;
      var r = n.getBoundingClientRect();
      var big = r.width * r.height > 9000 || (r.width > 220 && r.height > 28);
      if (!big || n.tagName === "BUTTON") return;
      n.style.setProperty("background", n.parentElement && n.parentElement.closest("[data-tp-dark]") ? "var(--tp-well)" : "var(--tp-card-2)", "important");
      n.setAttribute("data-tp-dark", "");
    });
    // Pass 1b: buttons and frames still wearing the other game's colours (blue on Comic, red on
    // Pokémon) take this game's accent instead.
    nodes.forEach(function (n) {
      if (SKIP_TAGS[n.tagName.toUpperCase()] || n.closest("svg") || n.hasAttribute("data-tp-keep") || n.closest(".tp-header, .tp-promo")) return;
      var cs = getComputedStyle(n);
      var clickable = n.tagName === "A" || n.tagName === "BUTTON" || n.getAttribute("role") === "button";
      if (clickable && !n.classList.contains("play-now")) {
        var cols = parseColors(cs.backgroundColor).concat(/gradient/.test(cs.backgroundImage) ? parseColors(cs.backgroundImage) : []).filter(function (c) { return c.a > 0.5; });
        if (cols.length && cols.every(offTheme)) {
          n.style.setProperty("background", "rgba(var(--tp-accent-rgb), 0.16)", "important");
          n.style.setProperty("border-color", "rgba(var(--tp-accent-rgb), 0.6)", "important");
          n.style.setProperty("color", "var(--tp-ink)", "important");
          n.style.setProperty("text-shadow", "none", "important");
          n.setAttribute("data-tp-recolor", "");
        }
      }
      if (parseFloat(cs.borderTopWidth) >= 2) {
        var bc = parseColors(cs.borderTopColor)[0];
        if (bc && bc.a > 0.5 && offTheme(bc)) n.style.setProperty("border-color", "rgba(var(--tp-accent-rgb), 0.55)", "important");
      }
    });
    bgCache = new WeakMap();
    // Pass 2: text contrast.
    nodes.forEach(function (n) {
      if (SKIP_TAGS[n.tagName.toUpperCase()] || n.closest("svg") || !hasOwnText(n)) return;
      var cs = getComputedStyle(n);
      var c = parseColors(cs.color)[0];
      if (!c) return;
      var tl = lum(c), bl = effectiveBgLum(n);
      if (bl < 0.3 && tl < 0.28) {
        var vivid = Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b) > 90;
        n.style.setProperty("color", vivid ? "var(--tp-accent)" : (tl < 0.06 ? "var(--tp-ink)" : "var(--tp-ink-dim)"), "important");
      } else if (bl > 0.5 && tl > 0.45) {
        n.style.setProperty("color", "#14110d", "important");
      }
    });
  }
  var adaptTimer = null, adaptQueue = [];
  function watchLegacy() {
    var scopes = doc.querySelectorAll("body > *:not(.tp-header):not(.tp-promo):not(.tp-ob):not(.tp-toast):not(script):not(style)");
    Array.prototype.forEach.call(scopes, adaptTree);
    if (!window.MutationObserver) return;
    new MutationObserver(function (list) {
      list.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) adaptQueue.push(n.parentElement || n); }); });
      if (!adaptQueue.length) return;
      clearTimeout(adaptTimer);
      adaptTimer = setTimeout(function () {
        var q = adaptQueue.filter(function (n, i, a) { return a.indexOf(n) === i && n.isConnected; });
        adaptQueue = [];
        q.forEach(adaptTree);
      }, 120);
    }).observe(doc.body, { childList: true, subtree: true });
  }

  // ---- Start ------------------------------------------------------------------
  function start() {
    // Pages that serve both arenas settle their arena in scripts/arena-navigation.js (deferred, runs first).
    var declared = String(doc.body.getAttribute("data-page-arena") || "").toLowerCase();
    if ((declared === "comic" || declared === "pokemon") && game !== "split" && game !== "shattered") game = declared;
    root.setAttribute("data-theme", game);
    GAMES.concat("split").forEach(function (g) { doc.body.classList.toggle("theme-" + g, g === game); });
    rememberGame(game, false);
    // Inside the small game-launch pop-up (the Play buttons open one) the site header would only crowd it.
    var popup = false;
    try { popup = !!window.opener && window.innerWidth < 900; } catch (e) {}
    if (!popup) buildShell();
    focusAuthPanel();
    if (!doc.body.classList.contains("tp-native")) { watchLegacy(); window.addEventListener("load", function () { watchLegacy.done || (watchLegacy.done = 1, Array.prototype.forEach.call(doc.querySelectorAll("body > *:not(.tp-header):not(.tp-promo)"), adaptTree)); }); }
    var hub = section === "home" || section === "split";
    if (params.has("guide") || (!popup && hub && !store.get("tri-onboarded") && !params.has("noguide") && !navigator.webdriver)) setTimeout(openOnboarding, 600);
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", start);
  else start();

  window.TriPortal = {
    game: function () { return game; },
    esc: esc, el: el, icon: icon, toast: toast, routeFor: routeFor, rememberGame: rememberGame,
    srApi: srApi, srBase: SR_BASE, srToken: srToken,
    srSignIn: function (token, name) { store.set(SR_TOKEN_KEY, token); store.set("sr-site-name", name || ""); refreshAccountChip(); },
    srSignOut: function () { store.del(SR_TOKEN_KEY); store.del("sr-site-name"); refreshAccountChip(); },
    openGuide: function () { openOnboarding(); }
  };
})();
