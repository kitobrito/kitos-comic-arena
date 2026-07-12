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
    document.querySelectorAll(".brand-name").forEach(function (node) {
      node.textContent = arenaName;
    });
    document.querySelectorAll(".brand-tagline").forEach(function (node) {
      node.textContent = arena === "pokemon"
        ? "Build your team and become the champion"
        : "Your #1 Comic Online Multiplayer Game";
    });
    document.querySelectorAll(".brand img, img.brand-mark").forEach(function (image) {
      image.src = arena === "pokemon"
        ? "assets/images/PokemonArena/found-pokeball.png"
        : "assets/images/sitelogo.png";
      image.alt = arenaName + " logo";
    });
  }

  function addSwitch() {
    if (document.querySelector("[data-global-arena-switch], [data-home-arena-switch]")) return;
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

  var style = document.createElement("style");
  style.textContent =
    ".global-arena-switch{display:block;margin:0 auto 16px;padding:9px 12px;max-width:220px;text-align:center;text-decoration:none;font:700 13px/1.2 Arial,sans-serif;border:2px solid #76101a;border-radius:6px;background:linear-gradient(#e64451,#9b1723);color:#fff!important;box-shadow:0 3px 0 rgba(50,0,5,.3);position:relative;z-index:20}" +
    "body.arena-mode-comic .global-arena-switch{border-color:#173f73;background:linear-gradient(#347fc5,#174a83)}" +
    ".global-arena-switch:hover{filter:brightness(1.12);transform:translateY(-1px)}" +
    ".global-arena-switch-floating{position:fixed;top:10px;left:10px;margin:0;z-index:10000}";
  document.head.appendChild(style);

  updateBranding();
  addSwitch();
  keepSharedLinksInArena();
}());
