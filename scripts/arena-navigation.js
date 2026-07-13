(function () {
  "use strict";

  var path = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
  var params = new URLSearchParams(window.location.search);
  var declaredArena = document.body && document.body.dataset
    ? String(document.body.dataset.pageArena || "").toLowerCase()
    : "";

  function storedArena() {
    try {
      return localStorage.getItem("comicArenaMode") === "pokemon" ? "pokemon" : "comic";
    } catch (error) {
      return "comic";
    }
  }

  function resolveArena() {
    if (declaredArena === "pokemon" || declaredArena === "comic") return declaredArena;
    if (params.get("arena") === "pokemon" || params.get("arena") === "comic") return params.get("arena");
    if (path === "pokemon-charactersandskills.html") return "pokemon";
    if (path === "charactersandskills.html") return "comic";
    return storedArena();
  }

  var arena = resolveArena();
  var otherArena = arena === "pokemon" ? "comic" : "pokemon";
  var arenaName = arena === "pokemon" ? "Pokemon Arena" : "Comic Arena";
  var otherArenaName = otherArena === "pokemon" ? "Pokemon Arena" : "Comic Arena";

  try {
    localStorage.setItem("comicArenaMode", arena);
  } catch (error) {}

  document.body.dataset.pageArena = arena;
  document.body.classList.toggle("arena-mode-pokemon", arena === "pokemon");
  document.body.classList.toggle("arena-mode-comic", arena === "comic");
  document.body.classList.toggle("home-arena-pokemon", arena === "pokemon");
  document.body.classList.toggle("home-arena-comic", arena === "comic");
  if (arena === "pokemon" && /comic[ -]?arena/i.test(document.title)) {
    document.title = document.title.replace(/comic[ -]?arena/ig, "Pokemon Arena");
  } else if (arena === "comic" && /pokemon[ -]?arena/i.test(document.title)) {
    document.title = document.title.replace(/pokemon[ -]?arena/ig, "Comic Arena");
  }

  function destinationFor(targetArena) {
    if (path === "pokemon-charactersandskills.html" || path === "charactersandskills.html") {
      return targetArena === "pokemon" ? "pokemon-charactersandskills.html" : "charactersandskills.html";
    }
    if (path === "ingame.html") {
      return "index.html?arena=" + encodeURIComponent(targetArena);
    }
    var url = new URL(window.location.href);
    url.searchParams.set("arena", targetArena);
    return (url.pathname.split("/").pop() || "index.html") + url.search + url.hash;
  }

  function updateBranding() {
    function getBrandArena(node) {
      var scoped = node && node.closest ? node.closest("[data-home-arena]") : null;
      var scopedArena = scoped ? scoped.getAttribute("data-home-arena") : "";
      return scopedArena === "pokemon" || scopedArena === "comic" ? scopedArena : arena;
    }
    document.querySelectorAll(".brand-name").forEach(function (node) {
      node.textContent = getBrandArena(node) === "pokemon" ? "Pokemon Arena" : "Comic Arena";
    });
    document.querySelectorAll(".brand-tagline").forEach(function (node) {
      node.textContent = getBrandArena(node) === "pokemon"
        ? "Build your team and become the champion"
        : "Your #1 Comic Online Multiplayer Game";
    });
    document.querySelectorAll(".brand img, img.brand-mark").forEach(function (image) {
      var imageArena = getBrandArena(image);
      image.src = imageArena === "pokemon"
        ? "assets/images/PokemonArena/found-pokeball.png"
        : "assets/images/sitelogo.png";
      image.alt = (imageArena === "pokemon" ? "Pokemon Arena" : "Comic Arena") + " logo";
    });
  }

  function addSwitch() {
    if (document.querySelector("[data-global-arena-switch], [data-home-arena-switch], .arena-mode-switch")) return;
    var switchLink = document.createElement("a");
    switchLink.className = "global-arena-switch";
    switchLink.dataset.globalArenaSwitch = otherArena;
    switchLink.href = destinationFor(otherArena);
    switchLink.textContent = "Switch to " + otherArenaName;
    switchLink.setAttribute("aria-label", "Switch this page to " + otherArenaName);

    var brand = document.querySelector(".brand");
    if (brand) {
      brand.insertAdjacentElement("afterend", switchLink);
    } else {
      switchLink.classList.add("global-arena-switch-floating");
      document.body.appendChild(switchLink);
    }
  }

  function keepSharedLinksInArena() {
    document.querySelectorAll('a[href="index.html"], a[href="events.html"], a[href="community.html"], a[href="profile.html"], a[href="manual.html"]').forEach(function (link) {
      var url = new URL(link.getAttribute("href"), window.location.href);
      url.searchParams.set("arena", arena);
      link.href = (url.pathname.split("/").pop() || "index.html") + url.search + url.hash;
    });
    if (path !== "index.html" && path !== "charactersandskills.html" && path !== "pokemon-charactersandskills.html") {
      document.querySelectorAll('a[href="charactersandskills.html"], a[href="pokemon-charactersandskills.html"]').forEach(function (link) {
        link.href = arena === "pokemon" ? "pokemon-charactersandskills.html" : "charactersandskills.html";
        if (/characters/i.test(link.textContent || "")) {
          link.textContent = arena === "pokemon" ? "Pokemon Characters and Skills" : "Comic Characters and Skills";
        }
      });
      document.querySelectorAll('a[href="missions.html"], a[href="missions.html?arena=pokemon"]').forEach(function (link) {
        link.href = arena === "pokemon" ? "missions.html?arena=pokemon" : "missions.html";
      });
    }
  }

  function replacePokemonAlliancePanel() {
    if (arena !== "pokemon") return;
    document.querySelectorAll(".ladder").forEach(function (panel) {
      var title = panel.querySelector(".ladder-title");
      if (!title || !/alliance levels/i.test(title.textContent || "")) return;
      panel.innerHTML = "";
      var heading = document.createElement("h3");
      heading.className = "ladder-title";
      heading.textContent = "Pokemon Points & Ladder Rewards";
      var reward = document.createElement("div");
      reward.className = "pokemon-sidebar-reward";
      reward.innerHTML =
        "<strong>25 Ladder Wins = 1,000 Points</strong>" +
        "<p>Player and battle-bot Ladder wins both count.</p>" +
        "<p>Spend points on Pokemon unlocks, alternate skins, and additional Eevee evolutions.</p>" +
        '<a href="missions.html?arena=pokemon">View the Reward Mission</a>';
      panel.appendChild(heading);
      panel.appendChild(reward);
    });
  }

  var style = document.createElement("style");
  style.textContent =
    ".global-arena-switch{display:block;margin:0 auto 16px;padding:9px 12px;max-width:220px;text-align:center;text-decoration:none;font:700 13px/1.2 Arial,sans-serif;border:2px solid #76101a;border-radius:6px;background:linear-gradient(#e64451,#9b1723);color:#fff!important;box-shadow:0 3px 0 rgba(50,0,5,.3);position:relative;z-index:20}" +
    "body.arena-mode-comic .global-arena-switch{border-color:#173f73;background:linear-gradient(#347fc5,#174a83)}" +
    ".global-arena-switch:hover{filter:brightness(1.12);transform:translateY(-1px)}" +
    ".global-arena-switch-inline{display:inline-flex;align-items:center;margin:0 0 0 10px;max-width:none;white-space:nowrap;vertical-align:middle}" +
    ".global-arena-switch-floating{position:fixed;top:10px;left:10px;margin:0;z-index:10000}" +
    ".pokemon-sidebar-reward{padding:10px;border:1px solid #c44650;background:#fff5f5;color:#351010;text-align:left}" +
    ".pokemon-sidebar-reward strong{display:block;color:#a31724;font-size:18px;line-height:1.15}" +
    ".pokemon-sidebar-reward p{margin:8px 0;font-size:13px;font-weight:700;line-height:1.35}" +
    ".pokemon-sidebar-reward a{display:block;padding:8px;background:#b51f2e;color:#fff!important;font-weight:900;text-align:center;text-decoration:none}";
  document.head.appendChild(style);

  updateBranding();
  addSwitch();
  keepSharedLinksInArena();
  replacePokemonAlliancePanel();
}());
