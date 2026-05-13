(function () {
  var grid = document.getElementById("community-grid");
  var status = document.getElementById("community-status");
  var searchInput = document.getElementById("community-search");
  var roleFilter = document.getElementById("community-role-filter");
  var sortSelect = document.getElementById("community-sort");
  var statTotalPlayers = document.getElementById("stat-total-players");
  var statRankedPlayers = document.getElementById("stat-ranked-players");
  var statClanPlayers = document.getElementById("stat-clan-players");
  var allUsers = [];

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

  function setStats(stats) {
    if (statTotalPlayers) {
      statTotalPlayers.textContent = String(stats && stats.totalRegisteredPlayers ? stats.totalRegisteredPlayers : 0);
    }
    if (statRankedPlayers) {
      statRankedPlayers.textContent = String(stats && stats.rankedPlayers ? stats.rankedPlayers : 0);
    }
    if (statClanPlayers) {
      statClanPlayers.textContent = String(stats && stats.clanPlayers ? stats.clanPlayers : 0);
    }
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

  function sortUsers(users) {
    var mode = sortSelect && sortSelect.value ? String(sortSelect.value) : "ladder";
    return users.slice().sort(function (left, right) {
      if (mode === "wins") {
        return (right && right.ladder ? right.ladder.wins : 0) - (left && left.ladder ? left.ladder.wins : 0);
      }
      if (mode === "newest") {
        return new Date(right && right.createdAt ? right.createdAt : 0).getTime() -
          new Date(left && left.createdAt ? left.createdAt : 0).getTime();
      }
      if (mode === "name") {
        return String(left && left.username ? left.username : "").localeCompare(String(right && right.username ? right.username : ""));
      }
      var rankDelta = (left && left.ladder && left.ladder.ladderRank ? left.ladder.ladderRank : Number.MAX_SAFE_INTEGER) -
        (right && right.ladder && right.ladder.ladderRank ? right.ladder.ladderRank : Number.MAX_SAFE_INTEGER);
      if (rankDelta !== 0) {
        return rankDelta;
      }
      return (right && right.ladder ? right.ladder.level : 0) - (left && left.ladder ? left.ladder.level : 0);
    });
  }

  function renderUsers(users) {
    if (!grid) {
      return;
    }
    clearChildren(grid);

    if (!users.length) {
      setStatus("No players match those filters.", "error");
      return;
    }

    users.forEach(function (user) {
      var card = document.createElement("article");
      card.className = "player-card";

      var avatar = document.createElement("img");
      avatar.className = "player-avatar";
      avatar.src = user && user.avatarUrl ? String(user.avatarUrl) : "https://i.postimg.cc/3JqVcPXm/default.png";
      avatar.alt = user && user.username ? String(user.username) + " avatar" : "Player avatar";
      card.appendChild(avatar);

      var content = document.createElement("div");

      var nameRow = document.createElement("div");
      nameRow.className = "player-name-row";

      var name = document.createElement("div");
      name.className = "player-name";
      name.textContent = user && user.username ? String(user.username) : "Unknown";
      nameRow.appendChild(name);

      var role = document.createElement("span");
      role.className = "role-badge";
      role.textContent = user && user.role ? String(user.role) : "player";
      nameRow.appendChild(role);

      if (user && user.ladder && user.ladder.ladderRank) {
        var ladderBadge = document.createElement("span");
        ladderBadge.className = "ladder-badge";
        ladderBadge.textContent = "#" + String(user.ladder.ladderRank);
        nameRow.appendChild(ladderBadge);
      }

      content.appendChild(nameRow);

      var meta = document.createElement("div");
      meta.className = "player-meta";
      var clanLabel = user && user.clan && (user.clan.abbreviation || user.clan.name)
        ? (user.clan.abbreviation || user.clan.name)
        : "No Clan";
      meta.innerHTML =
        "<span>Rank: " + String(user && user.ladder ? user.ladder.rank : "Academy Student") + "</span>" +
        "<span>Clan: " + String(clanLabel) + "</span>" +
        "<span>Joined: " + formatDate(user && user.createdAt ? user.createdAt : "") + "</span>";
      content.appendChild(meta);

      var stats = document.createElement("div");
      stats.className = "player-stats";
      [
        { label: "Level", value: user && user.ladder ? user.ladder.level : 1 },
        { label: "Wins", value: user && user.ladder ? user.ladder.wins : 0 },
        { label: "Win Rate", value: (user && user.ladder ? user.ladder.winRate : 0) + "%" },
        { label: "Streak", value: user && user.ladder ? user.ladder.streak : 0 },
        { label: "Best Streak", value: user && user.ladder ? user.ladder.highestStreak : 0 },
        { label: "Games", value: user && user.ladder ? user.ladder.totalGames : 0 }
      ].forEach(function (entry) {
        var stat = document.createElement("div");
        stat.className = "player-stat";
        stat.innerHTML = "<strong>" + entry.label + "</strong><span>" + entry.value + "</span>";
        stats.appendChild(stat);
      });
      content.appendChild(stats);

      var link = document.createElement("a");
      link.className = "player-link";
      link.href = "profile.html?user=" + encodeURIComponent(user && user.username ? user.username : "");
      link.textContent = "Open Profile";
      content.appendChild(link);

      card.appendChild(content);
      grid.appendChild(card);
    });

    setStatus("");
  }

  function filterAndRender() {
    var query = String(searchInput && searchInput.value ? searchInput.value : "").trim().toLowerCase();
    var role = String(roleFilter && roleFilter.value ? roleFilter.value : "all").toLowerCase();
    var filtered = allUsers.filter(function (user) {
      var username = String(user && user.username ? user.username : "").toLowerCase();
      var clanName = String(user && user.clan && user.clan.name ? user.clan.name : "").toLowerCase();
      var clanAbbreviation = String(user && user.clan && user.clan.abbreviation ? user.clan.abbreviation : "").toLowerCase();
      var rank = String(user && user.ladder && user.ladder.rank ? user.ladder.rank : "").toLowerCase();
      var matchesQuery = !query ||
        username.indexOf(query) !== -1 ||
        clanName.indexOf(query) !== -1 ||
        clanAbbreviation.indexOf(query) !== -1 ||
        rank.indexOf(query) !== -1;
      var matchesRole = role === "all" || String(user && user.role ? user.role : "").toLowerCase() === role;
      return matchesQuery && matchesRole;
    });
    renderUsers(sortUsers(filtered));
  }

  async function loadCommunity() {
    setStatus("Loading players...");
    try {
      var response = await fetch("/api/community/users", {
        credentials: "same-origin"
      });
      var data = await response.json().catch(function () {
        return {};
      });
      if (!response.ok) {
        setStatus(data && data.error ? data.error : "Unable to load community players.", "error");
        return;
      }
      allUsers = data && Array.isArray(data.users) ? data.users : [];
      setStats(data && data.stats ? data.stats : {});
      filterAndRender();
    } catch (error) {
      setStatus("Unable to reach the server.", "error");
    }
  }

  if (searchInput) {
    searchInput.addEventListener("input", filterAndRender);
  }
  if (roleFilter) {
    roleFilter.addEventListener("change", filterAndRender);
  }
  if (sortSelect) {
    sortSelect.addEventListener("change", filterAndRender);
  }

  loadCommunity();
}());
