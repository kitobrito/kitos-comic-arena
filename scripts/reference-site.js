/* Shared website shell. Existing page nodes, IDs, forms and controllers remain
 * intact. Battle, team selection, launch windows and playable prototypes never
 * load this bundle. The homepage has its own three-column arrangement. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  if (root.dataset.referenceLayout !== 'inner' || doc.querySelector('.reference-inner-app')) return;
  var path = decodeURIComponent(location.pathname.split('/').pop() || '').replace(/\.html$/i, '').toLowerCase();
  if (/^(ingame|selection|selection-login|pokemon-arena|shattered-play|shattered-realms)$/.test(path)) return;
  var arena = doc.body.dataset.pageArena || root.dataset.theme || 'comic';
  var pokemon = arena === 'pokemon', shattered = arena === 'shattered';
  doc.body.classList.add('tp-native', 'reference-inner-page');
  doc.body.classList.toggle('home-arena-pokemon', pokemon);
  doc.body.classList.toggle('home-arena-comic', !pokemon);
  var title = pokemon ? 'POKÉMON ARENA' : shattered ? 'SHATTERED TCG' : 'COMIC ARENA';
  var home = pokemon ? '/pokemon' : shattered ? '/shattered' : '/comic';
  var routes = pokemon ? {manual:'/pokemon-manual',ladder:'/pokemon-community',missions:'/pokemon-missions',characters:'/pokemon-charactersandskills.html',news:'/pokemon-events',profile:'/pokemon-profile',clan:'/pokemon-clanpanel',background:'/pokemon-changebackgrounds',reset:'/pokemon-resetaccount'} : shattered ? {manual:'/shattered-manual',ladder:'/shattered-ladder',missions:'/shattered-factions',characters:'/shattered-factions',news:'/shattered-news',profile:'/shattered-account',clan:'/shattered-players'} : {manual:'/manual',ladder:'/community',missions:'/missions.html',characters:'/charactersandskills.html',news:'/events',profile:'/profile',clan:'/clan-panel',background:'/changebackgrounds',reset:'/resetaccount'};
  function element(tag, className, text) { var e=doc.createElement(tag);if(className)e.className=className;if(text)e.textContent=text;return e; }
  function link(href,text,className) { var a=element('a',className,text);a.href=href;return a; }
  function art(src, alt, className) { var img=element('img',className);img.src=src;img.alt=alt||'';return img; }
  var originalRoots=Array.from(doc.body.children);
  var sidebar=doc.querySelector('.sidebar,.tp-rail-left');
  if(!sidebar){var main=doc.querySelector('main');sidebar=main&&Array.from(main.children).find(function(e){return e.tagName==='ASIDE'&&!e.id;});}
  var otherRail=doc.querySelector('.aside,.tp-rail-right');
  var oldTopbar=doc.querySelector('.topbar,.pp-topbar');
  var shell=element('div','reference-inner-app');
  var masthead=element('header','reference-masthead reference-inner-masthead');
  // Shattered TCG is a 1950s picture palace: the usher stands where the mascot would.
  var TH='/assets/images/shattered-theatre/';
  var mascot;
  if(shattered){
    mascot=element('figure','reference-mascot sr-lobby-poster');mascot.dataset.homeArena='shattered';
    mascot.append(art(TH+'usher.webp','The picture palace usher'),element('figcaption','','This way, please'));
  }else{mascot=art(pokemon?'/assets/images/PokemonArena/BIB/cutout/mewtwo.png':'/assets/images/BIB/comic/deadpool.webp',pokemon?'Mewtwo':'Deadpool','reference-mascot');mascot.dataset.homeArena=pokemon?'pokemon':'comic';}
  masthead.appendChild(mascot);
  var navGroup=element('div','group'),nav=element('nav','nav');nav.setAttribute('aria-label','Main game navigation');
  nav.appendChild(link(home,'Startpage','nav-link'));
  // Reuse an existing launch control where present, including its original listener.
  var play=doc.querySelector('[data-play-arena="'+arena+'"]');
  if(play){play.classList.add('nav-link','play-now');var label=play.querySelector('span');if(label)label.textContent='Start Playing';}
  else{play=link(shattered?'/shattered-play':'/selection-login.html?arena='+arena,'Start Playing','nav-link play-now');}
  nav.appendChild(play);
  nav.appendChild(link(routes.manual,'Game Manual','nav-link'+(/manual/.test(path)?' active':'')));
  nav.appendChild(link(routes.ladder,'Ladders','nav-link'+(/community|ladder|winrates/.test(path)?' active':'')));
  nav.appendChild(link(routes.missions,pokemon?'Trainer Missions':shattered?'Factions':'Hero Missions','nav-link'+(/missions/.test(path)?' active':'')));
  var discord=link('https://discord.gg/j3uV3Y4HAw','Discord','nav-link');discord.target='_blank';discord.rel='noopener noreferrer';nav.appendChild(discord);
  navGroup.appendChild(nav);masthead.appendChild(navGroup);
  var banner=element('div','reference-banner reference-inner-banner'),brand=element('div','brand');
  if(shattered){
    // The marquee: the game's own logo up in lights over the stage.
    banner.classList.add('sr-marquee');
    var stage=element('div','reference-banner-art reference-banner-theatre');
    var logo=link(home,'','sr-marquee-logo');logo.setAttribute('aria-label','Shattered TCG home');logo.appendChild(art(TH+'logo-small.webp','Shattered TCG'));
    stage.append(logo,element('div','sr-marquee-strip','Now showing \u00b7 a fantasy card battler'));
    banner.appendChild(stage);
  }else{
  var wordmark=element('div','brand-name'),first=element('span','',title.split(' ')[0]);wordmark.append(first,doc.createTextNode(' '+title.split(' ').slice(1).join(' ')));
  brand.append(wordmark,element('div','brand-tagline',pokemon?'Your Pokémon online multiplayer game':'Your comic online multiplayer game'));
  banner.appendChild(brand);
  var illustration=element('div','reference-banner-art'+(pokemon?' reference-banner-pokemon':''));
  illustration.appendChild(art(pokemon?'/assets/images/PokemonArena/BIB/charizard.png':'/assets/images/BIB/comic/superman.png','','reference-banner-fighter first'));
  illustration.appendChild(art(pokemon?'/assets/images/PokemonArena/BIB/cutout/pikachu.png':'/assets/images/BIB/comic/spider-man.png','','reference-banner-fighter second'));
  banner.appendChild(illustration);
  }
  masthead.appendChild(banner);
  if(!sidebar)sidebar=element('aside','sidebar');
  sidebar.classList.add('reference-inner-sidebar');
  var resources=element('section','group reference-site-links');resources.appendChild(element('h2','group-title','Arena Links'));
  [['Characters',routes.characters],['News & Updates',routes.news],['My Profile',routes.profile],['Clans',routes.clan],['Custom Background',routes.background],['Reset Account',routes.reset],['Sign In',shattered?'/shattered-account':home+'#auth-panel'],['Register',shattered?'/shattered-account':'/register.html?arena='+arena],['Shattered TCG','/shattered'],['Android App',shattered?'https://github.com/kitobrito/Shattered-Realms-TCG/releases/download/android-latest/shattered-realms.apk':null],['All Arenas','/split']].forEach(function(pair){if(pair[1])resources.appendChild(link(pair[1],pair[0]));});
  var switches=element('div','reference-game-switch');switches.append(link('/comic','Comics'),link('/pokemon','Pokémon'));resources.appendChild(switches);sidebar.prepend(resources);
  // Keep existing account/admin controls visible in the rail, while replacing
  // only the redundant decorative heading and primary menu.
  sidebar.querySelectorAll('nav').forEach(function(n){if(n.querySelector('a[href*="manual"]'))n.classList.add('reference-obsolete-nav');});
  if(oldTopbar)sidebar.appendChild(oldTopbar);
  if(otherRail&&otherRail!==sidebar&&!otherRail.contains(sidebar))sidebar.appendChild(otherRail);
  var content=element('div','reference-inner-content');content.setAttribute('aria-label','Page content');if(!doc.querySelector('main'))content.setAttribute('role','main');
  shell.append(masthead,sidebar,content);
  doc.body.prepend(shell);
  originalRoots.forEach(function(e){
    if(e===sidebar||e===oldTopbar||e===otherRail||e===shell||['SCRIPT','STYLE','LINK','NOSCRIPT'].includes(e.tagName)||e.classList.contains('tp-header'))return;
    if(e.matches('dialog,[role="dialog"],[aria-modal="true"],.modal-overlay,.gen2-starter-overlay,[id$="-overlay"]'))return;
    content.appendChild(e);
  });
  // If the old outer container now contains only the moved sidebar/main, it
  // stays as a harmless block so selectors and event-bound nodes keep working.
  var kind=/charactereditor|editmission|newspost|character-builder|playeraccounts|demofeedback/.test(path)?'editor':/charactersandskills|factions/.test(path)?'roster':/missions/.test(path)?'missions':/manual/.test(path)?'manual':/community|ladder|players|winrates/.test(path)?'ladder':/profile|clan|account|avatar|background|register/.test(path)?'account':/events|news/.test(path)?'news':'general';
  root.dataset.referenceKind=kind;
  var crumb=element('nav','reference-breadcrumb');crumb.setAttribute('aria-label','Breadcrumb');crumb.append(link(home,pokemon?'Pokémon Arena':shattered?'Shattered TCG':'Comic Arena'),doc.createTextNode(' / '+(doc.title||'Page').replace(/^(Comic[ -]?Arena|Pok[eé]mon[ -]?Arena|Shattered TCG)\s*[-:|]?\s*/i,'')));
  content.prepend(crumb);
}());
