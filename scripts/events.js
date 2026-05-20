(function () {
  var status = document.getElementById("events-status");
  var releasesGrid = document.getElementById("events-releases");
  var newsGrid = document.getElementById("events-news");
  var missionsGrid = document.getElementById("events-missions");

  function setStatus(message, state) {
    if (!status) {
      return;
    }
    status.textContent = message || "";
    if (state) {
      status.dataset.state = state;
      return;
    }
    delete status.dataset.state;
  }

  function clearChildren(node) {
    while (node && node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  function formatDate(value) {
    if (!value) {
      return "Unknown";
    }
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Unknown";
    }
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }

  function toPreviewText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function renderReleases(releases, characterCatalog) {
    if (!releasesGrid) {
      return;
    }
    clearChildren(releasesGrid);
    releases.forEach(function (entry) {
      var character = characterCatalog.find(function (item) {
        return item && item.characterId === entry.characterId;
      }) || null;

      var card = document.createElement("article");
      card.className = "release-card";
      card.innerHTML =
        '<img class="release-face" src="' + (character && character.facePicture ? character.facePicture : "assets/images/deadcharacter.png") + '" alt="' + (character && character.name ? character.name : "Release") + '">' +
        "<h3>" + (entry && entry.label ? entry.label : character && character.name ? character.name : "Unknown") + "</h3>" +
        "<p>" + (character && character.name ? character.name : "New roster release") + "</p>" +
        '<a class="news-link" href="charactersandskills.html' + (character && character.characterId ? "?characterId=" + encodeURIComponent(character.characterId) : "") + '">View Character</a>';
      releasesGrid.appendChild(card);
    });
  }

  function renderNews(posts) {
    if (!newsGrid) {
      return;
    }
    clearChildren(newsGrid);
    posts.slice(0, 4).forEach(function (post) {
      var article = document.createElement("article");
      article.className = "news-card";
      var blocks = Array.isArray(post && post.blocks) ? post.blocks : [];
      var firstParagraph = blocks.find(function (block) {
        return block && block.type === "paragraph" && block.text;
      });
      article.innerHTML =
        '<p class="news-meta">' + formatDate(post && (post.updatedAt || post.createdAt)) + " | " + (post && post.author ? post.author : "Unknown") + "</p>" +
        "<h3>" + (post && post.title ? post.title : "Untitled Post") + "</h3>" +
        "<p>" + toPreviewText(firstParagraph && firstParagraph.text ? firstParagraph.text : "No summary available yet.").slice(0, 180) + "</p>" +
        '<a class="news-link" href="index.html">Open News Feed</a>';
      newsGrid.appendChild(article);
    });
  }

  function renderMissions(missions) {
    if (!missionsGrid) {
      return;
    }
    clearChildren(missionsGrid);
    missions.slice(0, 4).forEach(function (mission) {
      var goals = Array.isArray(mission && mission.goals) ? mission.goals : [];
      var firstGoal = goals[0];
      var goalText = typeof firstGoal === "string"
        ? firstGoal
        : firstGoal && firstGoal.character_name && firstGoal.wins
          ? "Win with " + firstGoal.character_name + " " + firstGoal.wins + " times."
          : "Clear the mission objectives to unlock rewards.";
      var article = document.createElement("article");
      article.className = "mission-card";
      article.innerHTML =
        '<p class="mission-meta">Level ' + (mission && mission.level_requirement ? mission.level_requirement : 1) + " Required</p>" +
        "<h3>" + (mission && mission.title ? mission.title : "Mission") + "</h3>" +
        "<p>" + toPreviewText(goalText) + "</p>" +
        '<a class="mission-link" href="missions.html">Open Missions</a>';
      missionsGrid.appendChild(article);
    });
  }

  async function loadEventsBoard() {
    setStatus("Loading board...");
    try {
      var responses = await Promise.all([
        fetch("/api/latest-releases", { credentials: "same-origin" }),
        fetch("/api/characters/catalog", { credentials: "same-origin" }),
        fetch("/api/news", { credentials: "same-origin" }),
        fetch("/api/missions", { credentials: "same-origin" })
      ]);
      var payloads = await Promise.all(responses.map(function (response) {
        return response.json().catch(function () {
          return {};
        });
      }));

      if (responses.some(function (response) { return !response.ok; })) {
        setStatus("Unable to load event data.", "error");
        return;
      }

      renderReleases(payloads[0] && Array.isArray(payloads[0].releases) ? payloads[0].releases : [], payloads[1] && Array.isArray(payloads[1].characters) ? payloads[1].characters : []);
      renderNews(payloads[2] && Array.isArray(payloads[2].posts) ? payloads[2].posts : []);
      renderMissions(payloads[3] && Array.isArray(payloads[3].missions) ? payloads[3].missions : []);
      setStatus("");
    } catch (error) {
      setStatus("Unable to reach the server.", "error");
    }
  }

  loadEventsBoard();
}());
