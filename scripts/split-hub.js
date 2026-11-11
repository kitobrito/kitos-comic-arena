/* The 50/50 split hub (/split): live news and top players for both arenas, side by side. */
(function () {
  "use strict";
  var TP = window.TriPortal;
  if (!TP) return;
  var esc = TP.esc;
  function q(sel) { return document.querySelector(sel); }
  function text(blocks, paragraphs) {
    var p = (paragraphs || []).filter(Boolean)[0];
    if (p) return String(p);
    var b = (blocks || []).filter(function (x) { return x && (x.text || x.content); })[0];
    return b ? String(b.text || b.content) : "";
  }
  function when(d) {
    if (!d) return "";
    var t = new Date(d);
    return isNaN(t) ? "" : t.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }
  ["comic", "pokemon"].forEach(function (g) {
    var home = g === "comic" ? "/comic" : "/pokemon";
    fetch("/api/news?arena=" + g, { credentials: "same-origin" }).then(function (r) { return r.ok ? r.json() : Promise.reject(); }).then(function (d) {
      var posts = (d.posts || []).slice(0, 3);
      q('[data-news="' + g + '"]').innerHTML = posts.length ? posts.map(function (p) {
        return '<div class="tp-news-item"><b>' + esc(p.title) + "</b><span>" + esc(when(p.createdAt)) + (p.author ? " · " + esc(p.author) : "") + "</span><p>" + esc(text(p.blocks, p.paragraphs)) + "</p></div>";
      }).join("") + '<a class="tp-btn tp-btn-ghost tp-btn-block" style="margin-top:10px" href="' + home + '#news-feed">Read on the ' + (g === "comic" ? "Comic" : "Pokémon") + " front page</a>"
        : '<p class="tp-empty">No news posts yet.</p>';
    }).catch(function () { q('[data-news="' + g + '"]').innerHTML = '<p class="tp-empty">News is unavailable right now.</p>'; });
    fetch("/api/leaderboards/sidebar?arena=" + g, { credentials: "same-origin" }).then(function (r) { return r.ok ? r.json() : Promise.reject(); }).then(function (d) {
      var lb = d.leaderboards || {};
      var players = (lb.topPlayerLevels || []).slice(0, 5), clans = (lb.topClanLevels || []).slice(0, 3);
      q('[data-top="' + g + '"]').innerHTML = players.length ? '<ol class="tp-ladder">' + players.map(function (p) {
        return '<li><a href="' + (g === "pokemon" ? "pokemon-profile.html" : "profile.html") + '" data-profile="' + esc(p.username) + '">' + esc(p.username) + "</a><em>Lv " + esc(p.value) + '</em><span class="tp-xp"><i style="--p:' + (Number(p.progressPercent) || 0) + '%"></i></span></li>';
      }).join("") + "</ol>" : '<p class="tp-empty">No ranked players yet.</p>';
      q('[data-clans="' + g + '"]').innerHTML = clans.length ? '<ol class="tp-ladder">' + clans.map(function (c) {
        return '<li><a href="clanprofile.html?clan=' + encodeURIComponent(c.clanName) + '">' + esc(c.clanName) + (c.abbreviation ? " [" + esc(c.abbreviation) + "]" : "") + "</a><em>Lv " + esc(c.value) + '</em><span class="tp-xp"><i style="--p:' + (Number(c.progressPercent) || 0) + '%"></i></span></li>';
      }).join("") + "</ol>" : '<p class="tp-empty">No alliances yet.</p>';
    }).catch(function () {
      q('[data-top="' + g + '"]').innerHTML = '<p class="tp-empty">Ladder unavailable right now.</p>';
      q('[data-clans="' + g + '"]').innerHTML = '<p class="tp-empty">Alliances unavailable right now.</p>';
    });
  });
  document.addEventListener("click", function (e) {
    // Same hand-off the arena pages use: profile.html reads the name to look up from sessionStorage.
    var prof = e.target.closest("[data-profile]");
    if (prof) { try { sessionStorage.setItem("comicProfileLookupUser", prof.getAttribute("data-profile")); } catch (err) {} }
    var a = e.target.closest("[data-tp-pick]");
    if (a) TP.rememberGame(a.getAttribute("data-tp-pick"), true);
  });
})();
