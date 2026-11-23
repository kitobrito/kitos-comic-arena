/* The two live homepages keep their existing game/account controllers. Only
 * their original DOM nodes are rearranged into the classic 780px portal. */
(function () {
  'use strict';
  if (document.documentElement.dataset.homeDesign !== 'classic-reference') return;
  var app = document.querySelector('.app');
  var sidebar = app && app.querySelector('.sidebar');
  var main = app && app.querySelector('.main');
  var middle = app && app.querySelector('.aside');
  if (!sidebar || !main || !middle) return;
  document.body.classList.add('reference-home', 'tp-native');

  function node(tag, className, html) {
    var element = document.createElement(tag);
    if (className) element.className = className;
    if (html) element.innerHTML = html;
    return element;
  }
  function image(src, alt, arena, className) {
    var element = node('img', className);
    element.src = src; element.alt = alt;
    if (arena) element.dataset.homeArena = arena;
    return element;
  }
  function heading(section) {
    var title = section.querySelector('h2, h3');
    return title ? title.textContent.trim() : '';
  }
  var sections = Array.from(sidebar.children);
  var navigation = sidebar.querySelector('.nav');
  var menuSection = navigation.parentElement;
  var menuItems = Array.from(navigation.children);
  var masthead = node('section', 'reference-masthead');
  masthead.setAttribute('aria-label', 'Game navigation');
  masthead.appendChild(image('/assets/images/BIB/comic/deadpool.webp', 'Deadpool', 'comic', 'reference-mascot'));
  masthead.appendChild(image('/assets/images/PokemonArena/BIB/cutout/mewtwo.png', 'Mewtwo', 'pokemon', 'reference-mascot'));
  masthead.appendChild(menuSection);

  function isPath(element, text) { return (element.getAttribute('href') || '').includes(text); }
  var home = menuItems.find(function (item) { return item.classList.contains('active'); });
  var plays = menuItems.filter(function (item) { return item.hasAttribute('data-play-arena'); });
  var manual = menuItems.find(function (item) { return isPath(item, 'manual'); });
  var ladder = menuItems.find(function (item) { return isPath(item, 'community'); });
  var missions = menuItems.filter(function (item) { return isPath(item, 'missions'); });
  if (home) home.querySelector('span').textContent = 'Startpage';
  plays.forEach(function (item) { item.querySelector('span').textContent = 'Start Playing'; });
  if (ladder) ladder.querySelector('span').textContent = 'Ladders';
  missions.forEach(function (item) { item.querySelector('span').textContent = item.dataset.homeArena === 'pokemon' ? 'Trainer Missions' : 'Hero Missions'; });
  var selected = [home].concat(plays, [manual, ladder], missions).filter(Boolean);
  var resources = node('section', 'group reference-resources', '<h2 class="group-title">Arena Links</h2>');
  menuItems.filter(function (item) { return !selected.includes(item); }).forEach(function (item) { resources.appendChild(item); });
  selected.forEach(function (item) { navigation.appendChild(item); });
  var discord = node('a', 'nav-link reference-discord', '<span>Discord</span>');
  discord.href = 'https://discord.gg/j3uV3Y4HAw'; discord.target = '_blank'; discord.rel = 'noopener noreferrer';
  navigation.appendChild(discord);
  navigation.setAttribute('aria-label', 'Main game navigation');

  var banner = node('header', 'reference-banner');
  var brand = sidebar.querySelector('.brand');
  var pokemonBrand = sidebar.querySelector('.arena-badge');
  if (brand) banner.appendChild(brand);
  if (pokemonBrand) banner.appendChild(pokemonBrand);
  var comicArt = node('div', 'reference-banner-art reference-banner-comic');
  comicArt.dataset.homeArena = 'comic';
  comicArt.appendChild(image('/assets/images/BIB/comic/superman.png', '', '', 'reference-banner-fighter first'));
  comicArt.appendChild(image('/assets/images/BIB/comic/spider-man.png', '', '', 'reference-banner-fighter second'));
  var pokemonArt = node('div', 'reference-banner-art reference-banner-pokemon');
  pokemonArt.dataset.homeArena = 'pokemon';
  pokemonArt.appendChild(image('/assets/images/PokemonArena/BIB/charizard.png', '', '', 'reference-banner-fighter first'));
  pokemonArt.appendChild(image('/assets/images/PokemonArena/BIB/cutout/pikachu.png', '', '', 'reference-banner-fighter second'));
  banner.append(comicArt, pokemonArt);
  if (brand) {
    brand.querySelector('.brand-name').innerHTML = '<span>COMIC</span> ARENA';
    brand.querySelector('.brand-tagline').textContent = 'Your comic online multiplayer game';
  }
  if (pokemonBrand) {
    pokemonBrand.querySelector('.arena-badge-name').innerHTML = '<span>POKÉMON</span> ARENA';
    pokemonBrand.querySelector('.arena-badge-copy').textContent = 'Your Pokémon online multiplayer game';
  }
  app.prepend(masthead, banner);

  var community = node('section', 'group reference-community', '<h2 class="group-title">Our Community</h2><p>Meet other players, find a team, and follow the latest updates.</p><a href="https://discord.gg/j3uV3Y4HAw" target="_blank" rel="noopener noreferrer">Join Discord</a>');
  var switcher = sidebar.querySelector('.home-arena-switch');
  if (switcher) resources.appendChild(switcher);
  var portal = node('a', 'reference-portal-link', '');
  portal.href = '/split'; portal.textContent = 'All arenas';
  var shatteredLink = node('a', 'reference-portal-link');shatteredLink.href = '/shattered';shatteredLink.textContent = 'Shattered Realms';
  resources.append(shatteredLink, portal);
  sidebar.prepend(community, resources);
  var latest = sections.find(function (section) { return heading(section) === 'Latest News'; });
  var latestList;
  if (latest) {
    latestList = latest.querySelector('ul');
    latestList.replaceChildren(node('li', '', 'Loading the latest headlines…'));
  }
  var originalLinks = sections.find(function (section) { return heading(section) === 'Arena Links'; });
  if (originalLinks) originalLinks.remove();
  var firstTime = sections.find(function (section) { return heading(section) === 'First Time Playing?'; });
  var spotlight = node('section', 'group reference-spotlight', '<h2 class="group-title">Character Spotlight</h2>');
  var spotlightArt = node('div', 'reference-spotlight-art');
  spotlightArt.appendChild(image('/assets/images/BIB/comic/spider-man.png', 'Spider-Man', 'comic', ''));
  spotlightArt.appendChild(image('/assets/images/PokemonArena/BIB/cutout/pikachu.png', 'Pikachu', 'pokemon', ''));
  spotlight.appendChild(spotlightArt);
  middle.prepend(spotlight);
  if (firstTime) spotlight.after(firstTime);
  var releasePanels = Array.from(main.querySelectorAll('.release-panel'));
  var insertion = firstTime || spotlight;
  releasePanels.forEach(function (panel) {
    var title = panel.querySelector('.release-title');
    if (title) title.textContent = 'New Drops';
    panel.setAttribute('aria-label', panel.dataset.homeArena === 'pokemon' ? 'Latest Pokémon character releases' : 'Latest comic character releases');
    insertion.after(panel); insertion = panel;
  });
  var reward = main.querySelector('.pokemon-ladder-promo');
  if (reward) insertion.after(reward);

  var news = main.querySelector('.news-shell');
  var hero = main.querySelector('.hero');
  if (hero && news) hero.after(news);
  if (hero) hero.querySelector('.hero-copy').appendChild(node('p', 'reference-intro-note', '<strong>PLAY ONLINE</strong> Choose Start Playing to build your team, or browse the latest news below.'));
  var feed = document.getElementById('news-feed');
  var feedControls = feed && feed.querySelector('.news-feed-header');
  if (feedControls) feed.appendChild(feedControls);
  var heroActions = main.querySelector('.hero-actions');
  if (heroActions) resources.appendChild(heroActions);
  var extras = node('details', 'reference-extras', '<summary>More about the arenas</summary>');
  ['.hero-side', '.hero-points', '.arena-split', '.classic-stack'].forEach(function (selector) {
    var element = main.querySelector(selector); if (element) extras.appendChild(element);
  });
  main.appendChild(extras);
  main.setAttribute('aria-label', 'Arena news and updates');

  var currentArena;
  var requestSequence = 0;
  function syncTheme() {
    var arena = document.body.classList.contains('home-arena-pokemon') ? 'pokemon' : 'comic';
    if (arena === currentArena) return;
    currentArena = arena;
    // Keep the visible welcome copy short, as in the reference. Game IDs,
    // auth fields, news renderers and all original event-bound nodes survive.
    var title = document.getElementById('home-arena-title');
    if (title) title.textContent = arena === 'pokemon' ? 'Pokémon Arena' : 'Comic Arena';
    var description = document.getElementById('home-arena-description');
    if (description) description.textContent = arena === 'pokemon' ? 'Build your team. Battle trainers. Become the champion.' : 'Assemble your heroes. Outsmart your rivals. Climb the ladder.';
    if (!latestList) return;
    var expected = ++requestSequence;
    latestList.replaceChildren(node('li', '', 'Loading the latest headlines…'));
    fetch('/api/news?arena=' + arena, { credentials: 'same-origin' }).then(function (response) {
      if (!response.ok) throw Error('News unavailable'); return response.json();
    }).then(function (data) {
      if (expected !== requestSequence) return;
      latestList.replaceChildren();
      (Array.isArray(data.posts) ? data.posts : []).slice(0, 5).forEach(function (post) {
        var item = node('li'); var link = node('a');
        link.href = '#news-feed'; link.textContent = post.title || 'Arena update';
        // The existing feed controller owns post paging; link to the news board.
        item.appendChild(link); latestList.appendChild(item);
      });
      if (!latestList.children.length) latestList.appendChild(node('li', '', 'No updates published yet.'));
    }).catch(function () {
      if (expected === requestSequence) latestList.replaceChildren(node('li', '', 'Read updates on the news board.'));
    });
  }
  syncTheme();
  new MutationObserver(syncTheme).observe(document.body, { attributes: true, attributeFilter: ['class'] });
}());
