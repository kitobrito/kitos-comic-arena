(function () {
  var sidebarBackdrops = [
    "url('https://i.postimg.cc/8CjdyVrq/5376357.png')",
    "url('https://i.postimg.cc/Dz8QCKbH/75857858.png')",
    "url('https://i.postimg.cc/TPpjkXWB/8695795.png')",
    "url('https://i.postimg.cc/jjL68rJ9/nnnnnnnn.png')",
    "url('https://i.postimg.cc/bvs06jtc/ssssssss.png')"
  ];

  var chosen = sidebarBackdrops[Math.floor(Math.random() * sidebarBackdrops.length)];
  document.documentElement.style.setProperty("--sidebar-backdrop", chosen);

  var authForm = document.getElementById("auth-form");
  if (!authForm) {
    return;
  }

  var authTitle = document.getElementById("auth-title");
  var authDescription = document.getElementById("auth-description");
  var authSubmit = document.getElementById("auth-submit");
  var authToggle = document.getElementById("auth-toggle");
  var authStatus = document.getElementById("auth-status");
  var playNowButton = document.getElementById("play-now-button");
  var viewProfileButton = document.getElementById("view-profile-button");
  var changeAvatarButton = document.getElementById("change-avatar-button");
  var clanPanelButton = document.getElementById("clan-panel-button");
  var changeBackgroundsButton = document.getElementById("change-backgrounds-button");
  var resetAccountButton = document.getElementById("reset-account-button");
  var adminPanelSection = document.getElementById("admin-panel-section");
  var releaseFaces = [
    document.getElementById("release-face-1"),
    document.getElementById("release-face-2"),
    document.getElementById("release-face-3")
  ];
  var releaseLabels = [
    document.getElementById("release-label-1"),
    document.getElementById("release-label-2"),
    document.getElementById("release-label-3")
  ];
  var guestAuthView = document.getElementById("guest-auth-view");
  var accountPanel = document.getElementById("account-panel");
  var accountUsername = document.getElementById("account-username");
  var accountStatus = document.getElementById("account-status");
  var logoutButton = document.getElementById("logout-button");
  var usernameInput = authForm.elements.username;
  var passwordInput = authForm.elements.password;
  var confirmPasswordInput = authForm.elements.confirmPassword;
  var emailInput = authForm.elements.email;
  var isRegisterMode = false;
  var profileAvatarImage = document.getElementById("profile-avatar-image");
  var profileUsername = document.getElementById("profile-username");
  var profileSiteRank = document.getElementById("profile-site-rank");
  var profilePosts = document.getElementById("profile-posts");
  var profileRegisteredOn = document.getElementById("profile-registered-on");
  var profileClanName = document.getElementById("profile-clan-name");
  var profileClanAbbreviation = document.getElementById("profile-clan-abbreviation");
  var profileClanRank = document.getElementById("profile-clan-rank");
  var profileClanJoinedOn = document.getElementById("profile-clan-joined-on");
  var profileClanBadge = document.getElementById("profile-clan-badge");
  var profileLevel = document.getElementById("profile-level");
  var profileLevelMeter = document.querySelector(".level-meter");
  var profileRank = document.getElementById("profile-rank");
  var profileExperiencePoints = document.getElementById("profile-experience-points");
  var profileLadderRank = document.getElementById("profile-ladder-rank");
  var profileWins = document.getElementById("profile-wins");
  var profileLosses = document.getElementById("profile-losses");
  var profileWinPercentage = document.getElementById("profile-win-percentage");
  var profileStreak = document.getElementById("profile-streak");
  var profileHighestStreak = document.getElementById("profile-highest-streak");
  var profileHighestLevel = document.getElementById("profile-highest-level");
  var profileFamePoints = document.getElementById("profile-fame-points");
  var profileLadderGamesLast24 = document.getElementById("profile-ladder-games-last-24");
  var profileLadderGamesList = document.getElementById("profile-ladder-games-list");
  var profileStatus = document.getElementById("profile-status");
  var profileCurrentActivity = document.getElementById("profile-current-activity");
  var profileCurrentPage = document.getElementById("profile-current-page");
  var profileQuickGamesList = document.getElementById("profile-quick-games-list");
  var profileQuickGamesEmpty = document.getElementById("profile-quick-games-empty");
  var profilePrivateGamesList = document.getElementById("profile-private-games-list");
  var profilePrivateGamesEmpty = document.getElementById("profile-private-games-empty");
  var clanProfileAvatarImage = document.getElementById("clan-profile-avatar-image");
  var clanProfileName = document.getElementById("clan-profile-name");
  var clanProfileAbbreviation = document.getElementById("clan-profile-abbreviation");
  var clanProfileCreator = document.getElementById("clan-profile-creator");
  var clanProfileRegisteredOn = document.getElementById("clan-profile-registered-on");
  var clanProfileBiography = document.getElementById("clan-profile-biography");
  var clanProfileLevel = document.getElementById("clan-profile-level");
  var clanProfileLevelFill = document.getElementById("clan-profile-level-fill");
  var clanProfileExperiencePoints = document.getElementById("clan-profile-experience-points");
  var clanProfileClanExperiencePoints = document.getElementById("clan-profile-clan-experience-points");
  var clanProfileLadderRank = document.getElementById("clan-profile-ladder-rank");
  var clanProfileWins = document.getElementById("clan-profile-wins");
  var clanProfileLosses = document.getElementById("clan-profile-losses");
  var clanProfileWinPercentage = document.getElementById("clan-profile-win-percentage");
  var clanProfileMemberList = document.getElementById("clan-profile-member-list");
  var clanProfileStatus = document.getElementById("clan-profile-status");
  var changeAvatarForm = document.getElementById("change-avatar-form");
  var changeAvatarCurrentImage = document.getElementById("change-avatar-current-image");
  var changeAvatarUrlInput = document.getElementById("change-avatar-url");
  var changeAvatarSubmit = document.getElementById("change-avatar-submit");
  var changeAvatarStatus = document.getElementById("change-avatar-status");
  var resetAccountTrigger = document.getElementById("reset-account-trigger");
  var resetAccountConfirm = document.getElementById("reset-account-confirm");
  var resetAccountConfirmButton = document.getElementById("reset-account-confirm-button");
  var resetAccountCancelButton = document.getElementById("reset-account-cancel-button");
  var resetAccountStatus = document.getElementById("reset-account-status");
  var clanRegisterOpen = document.getElementById("clan-register-open");
  var clanRegisterOverlay = document.getElementById("clan-register-overlay");
  var clanRegisterCreator = document.getElementById("clan-register-creator");
  var clanRegisterDate = document.getElementById("clan-register-date");
  var clanRegisterNameInput = document.getElementById("clan-register-name");
  var clanRegisterAbbreviationInput = document.getElementById("clan-register-abbreviation");
  var clanRegisterBioInput = document.getElementById("clan-register-bio");
  var clanRegisterCancel = document.getElementById("clan-register-cancel");
  var clanRegisterConfirm = document.getElementById("clan-register-confirm");
  var clanRegisterStatus = document.getElementById("clan-register-status");
  var clanPanelAvatar = document.getElementById("clan-panel-avatar");
  var clanPanelName = document.getElementById("clan-panel-name");
  var clanPanelRank = document.getElementById("clan-panel-rank");
  var clanRecruitmentCard = document.getElementById("clan-recruitment-card");
  var clanRecruitmentOpen = document.getElementById("clan-recruitment-open");
  var clanInfoOpen = document.getElementById("clan-info-open");
  var clanStylesCard = document.getElementById("clan-styles-card");
  var clanManagementCard = document.getElementById("clan-management-card");
  var clanManagementOpen = document.getElementById("clan-management-open");
  var clanAvatarCard = document.getElementById("clan-avatar-card");
  var clanAvatarOpen = document.getElementById("clan-avatar-open");
  var clanInvitationsCard = document.getElementById("clan-invitations-card");
  var clanInvitationsOpen = document.getElementById("clan-invitations-open");
  var clanRegisterCard = document.getElementById("clan-register-card");
  var leaveClanCard = document.getElementById("leave-clan-card");
  var leaveClanOpen = document.getElementById("leave-clan-open");
  var leaveClanOverlay = document.getElementById("leave-clan-overlay");
  var leaveClanCancel = document.getElementById("leave-clan-cancel");
  var leaveClanConfirm = document.getElementById("leave-clan-confirm");
  var leaveClanStatus = document.getElementById("leave-clan-status");
  var clanRecruitmentOverlay = document.getElementById("clan-recruitment-overlay");
  var clanRecruitmentUsernameInput = document.getElementById("clan-recruitment-username");
  var clanRecruitmentInviteButton = document.getElementById("clan-recruitment-invite");
  var clanRecruitmentRetractButton = document.getElementById("clan-recruitment-retract");
  var clanRecruitmentCloseButton = document.getElementById("clan-recruitment-close");
  var clanRecruitmentStatus = document.getElementById("clan-recruitment-status");
  var clanRecruitmentList = document.getElementById("clan-recruitment-list");
  var clanInfoOverlay = document.getElementById("clan-info-overlay");
  var clanInfoNameInput = document.getElementById("clan-info-name");
  var clanInfoAbbreviationInput = document.getElementById("clan-info-abbreviation");
  var clanInfoBioInput = document.getElementById("clan-info-bio");
  var clanInfoCancel = document.getElementById("clan-info-cancel");
  var clanInfoSave = document.getElementById("clan-info-save");
  var clanInfoStatus = document.getElementById("clan-info-status");
  var clanAvatarOverlay = document.getElementById("clan-avatar-overlay");
  var clanAvatarCurrentImage = document.getElementById("clan-avatar-current-image");
  var clanAvatarUrlInput = document.getElementById("clan-avatar-url");
  var clanAvatarCancel = document.getElementById("clan-avatar-cancel");
  var clanAvatarSave = document.getElementById("clan-avatar-save");
  var clanAvatarStatus = document.getElementById("clan-avatar-status");
  var clanInvitationsOverlay = document.getElementById("clan-invitations-overlay");
  var clanInvitationsList = document.getElementById("clan-invitations-list");
  var clanInvitationsClose = document.getElementById("clan-invitations-close");
  var clanInvitationsStatus = document.getElementById("clan-invitations-status");
  var clanManagementOverlay = document.getElementById("clan-management-overlay");
  var clanRankTierSelect = document.getElementById("clan-rank-tier-select");
  var clanRankCustomNameInput = document.getElementById("clan-rank-custom-name");
  var clanRankExistingSelect = document.getElementById("clan-rank-existing-select");
  var clanRankCustomSave = document.getElementById("clan-rank-custom-save");
  var clanRankCustomDelete = document.getElementById("clan-rank-custom-delete");
  var clanManagementCancel = document.getElementById("clan-management-cancel");
  var clanManagementStatus = document.getElementById("clan-management-status");
  var clanMemberSelect = document.getElementById("clan-member-select");
  var clanMemberRankSelect = document.getElementById("clan-member-rank-select");
  var clanMemberRankAssign = document.getElementById("clan-member-rank-assign");
  var clanMemberList = document.getElementById("clan-member-list");
  var changeBackgroundsForm = document.getElementById("change-backgrounds-form");
  var selectionBackgroundUrlInput = document.getElementById("selection-background-url");
  var ingameBackgroundUrlInput = document.getElementById("ingame-background-url");
  var changeBackgroundsSubmit = document.getElementById("change-backgrounds-submit");
  var changeBackgroundsStatus = document.getElementById("change-backgrounds-status");
  var profileSearchForm = document.getElementById("profile-search-form");
  var profileSearchInput = document.getElementById("profile-search-input");
  var profileSearchStatus = document.getElementById("profile-search-status");
  var defaultProfileAvatar = "https://i.postimg.cc/3JqVcPXm/default.png";
  var sidebarTopPlayerLevels = document.getElementById("sidebar-top-player-levels");
  var sidebarTopClanLevels = document.getElementById("sidebar-top-clan-levels");
  var sidebarTopCurrentStreaks = document.getElementById("sidebar-top-current-streaks");
  var sidebarTopWins = document.getElementById("sidebar-top-wins");
  var sidebarTopHighestStreaks = document.getElementById("sidebar-top-highest-streaks");
  var winratesGrid = document.getElementById("winrates-grid");
  var winratesStatus = document.getElementById("winrates-status");
  var resetWinratesButton = document.getElementById("reset-winrates-button");
  var playerAccountsList = document.getElementById("player-accounts-list");
  var playerAccountsStatus = document.getElementById("player-accounts-status");
  var playerAccountsSearch = document.getElementById("player-accounts-search");
  var playerAccountOverlay = document.getElementById("player-account-overlay");
  var playerAccountUsername = document.getElementById("player-account-username");
  var playerAccountRole = document.getElementById("player-account-role");
  var playerAccountLadderRatio = document.getElementById("player-account-ladder-ratio");
  var playerAccountEditor = document.getElementById("player-account-editor");
  var playerAccountSave = document.getElementById("player-account-save");
  var playerAccountClose = document.getElementById("player-account-close");
  var playerAccountStatus = document.getElementById("player-account-status");
  var selectedAdminAccountUsername = "";
  var adminUserEntries = [];
  var characterEditorGrid = document.getElementById("character-editor-grid");
  var characterEditorStatus = document.getElementById("character-editor-status");
  var characterEditorSearch = document.getElementById("character-editor-search");
  var characterEditorOverlay = document.getElementById("character-editor-overlay");
  var characterEditorFace = document.getElementById("character-editor-face");
  var characterEditorName = document.getElementById("character-editor-name");
  var characterEditorId = document.getElementById("character-editor-id");
  var characterEditorJson = document.getElementById("character-editor-json");
  var characterEditorSave = document.getElementById("character-editor-save");
  var characterEditorExport = document.getElementById("character-editor-export");
  var characterEditorClose = document.getElementById("character-editor-close");
  var characterEditorModalStatus = document.getElementById("character-editor-modal-status");
  var selectedAdminCharacterId = "";
  var adminCharacterEntries = [];
  var newsFeed = document.getElementById("news-feed");
  var newsStatus = document.getElementById("news-status");
  var newsFeedContent = document.getElementById("news-feed-content");
  var newsPrevButton = document.getElementById("news-prev-button");
  var newsNextButton = document.getElementById("news-next-button");
  var newsFeedCounter = document.getElementById("news-feed-counter");
  var newsAdminForm = document.getElementById("news-admin-form");
  var newsPostIdInput = document.getElementById("news-post-id");
  var newsTitleInput = document.getElementById("news-title");
  var newsContentInput = document.getElementById("news-content");
  var newsChangesInput = document.getElementById("news-changes");
  var newsAdminStatus = document.getElementById("news-admin-status");
  var newsSaveButton = document.getElementById("news-save-button");
  var newsResetButton = document.getElementById("news-reset-button");
  var newsPostList = document.getElementById("news-post-list");
  var newsPostListStatus = document.getElementById("news-post-list-status");
  var latestReleasesForm = document.getElementById("latest-releases-form");
  var latestReleaseSelects = [
    document.getElementById("latest-release-1"),
    document.getElementById("latest-release-2"),
    document.getElementById("latest-release-3")
  ];
  var latestReleasesStatus = document.getElementById("latest-releases-status");
  var latestReleasesSaveButton = document.getElementById("latest-releases-save-button");
  var latestReleasesResetButton = document.getElementById("latest-releases-reset-button");
  var maintenanceModeStatus = document.getElementById("maintenance-mode-status");
  var maintenanceModeToggleButton = document.getElementById("maintenance-mode-toggle-button");
  var adminNewsPosts = [];
  var characterCatalog = [];
  var adminLatestReleases = [];
  var maintenanceModeEnabled = false;
  var publicNewsPosts = [];
  var currentNewsPostIndex = 0;
  var profileLookupStorageKey = "narutoProfileLookupUser";
  var requestedProfileUsername = (function () {
    try {
      var queryValue = new URLSearchParams(window.location.search).get("user") || "";
      if (queryValue) {
        return queryValue;
      }
      var storedValue = sessionStorage.getItem(profileLookupStorageKey) || "";
      if (storedValue) {
        sessionStorage.removeItem(profileLookupStorageKey);
      }
      return storedValue;
    } catch (error) {
      return "";
    }
  }());
  var requestedClanName = (function () {
    try {
      return new URLSearchParams(window.location.search).get("clan") || "";
    } catch (error) {
      return "";
    }
  }());
  var currentSessionUser = null;
  var clanInvitationSeenStorageKey = "narutoClanInvitationsSeen";
  var clanPanelNotification = null;
  var defaultClanRankLabels = {
    clanLeader: "Clan Leader",
    leader: "Leader",
    captain: "Captain",
    lieutenant: "Lieutenant",
    member: "Member",
    trial: "Trial"
  };

  function setText(node, value) {
    if (node) {
      node.textContent = value;
    }
  }

  function ensureClanPanelNotification() {
    if (!clanPanelButton) {
      return null;
    }
    if (clanPanelNotification) {
      return clanPanelNotification;
    }
    var badge = document.createElement("span");
    badge.setAttribute("aria-hidden", "true");
    badge.style.width = "8px";
    badge.style.height = "8px";
    badge.style.borderRadius = "999px";
    badge.style.background = "#ff8c1a";
    badge.style.boxShadow = "0 0 0 2px rgba(255, 140, 26, 0.18)";
    badge.style.marginLeft = "auto";
    badge.style.flex = "0 0 auto";
    badge.style.display = "none";
    clanPanelButton.appendChild(badge);
    clanPanelNotification = badge;
    return clanPanelNotification;
  }

  function getClanInvitationSignature(user) {
    var invitations = user && user.profile && Array.isArray(user.profile.clanInvitations)
      ? user.profile.clanInvitations
      : [];
    return invitations
      .map(function (entry) {
        var clanName = entry && entry.clanName ? String(entry.clanName) : "";
        var invitedBy = entry && entry.invitedBy ? String(entry.invitedBy) : "";
        var invitedAt = entry && entry.invitedAt ? String(entry.invitedAt) : "";
        return clanName + "|" + invitedBy + "|" + invitedAt;
      })
      .join("||");
  }

  function markClanInvitationsViewed(user) {
    try {
      localStorage.setItem(clanInvitationSeenStorageKey, getClanInvitationSignature(user));
    } catch (error) {}
    updateClanPanelNotification(user);
  }

  function updateClanPanelNotification(user) {
    var badge = ensureClanPanelNotification();
    if (!badge) {
      return;
    }
    var invitations = user && user.profile && Array.isArray(user.profile.clanInvitations)
      ? user.profile.clanInvitations
      : [];
    if (!invitations.length) {
      badge.style.display = "none";
      return;
    }
    var seenSignature = "";
    try {
      seenSignature = localStorage.getItem(clanInvitationSeenStorageKey) || "";
    } catch (error) {}
    badge.style.display = seenSignature === getClanInvitationSignature(user) ? "none" : "inline-block";
  }

  function applyProfileClanBadge(clan) {
    if (!profileClanBadge) {
      return;
    }
    if (clan && clan.avatarUrl) {
      profileClanBadge.textContent = "";
      profileClanBadge.style.backgroundImage = 'url("' + clan.avatarUrl + '")';
      profileClanBadge.style.backgroundRepeat = "no-repeat";
      return;
    }
    profileClanBadge.style.backgroundImage = "";
    profileClanBadge.style.backgroundRepeat = "";
    profileClanBadge.textContent = clan && (clan.abbreviation || clan.name)
      ? String(clan.abbreviation || clan.name).toUpperCase()
      : "NO CLAN";
  }

  function setProfileSearchStatus(message, state) {
    if (!profileSearchStatus) {
      return;
    }
    profileSearchStatus.textContent = message || "";
    if (state) {
      profileSearchStatus.dataset.state = state;
      return;
    }
    delete profileSearchStatus.dataset.state;
  }

  function setChangeAvatarStatus(message, state) {
    if (!changeAvatarStatus) {
      return;
    }
    changeAvatarStatus.textContent = message || "";
    if (state) {
      changeAvatarStatus.dataset.state = state;
      return;
    }
    delete changeAvatarStatus.dataset.state;
  }

  function setResetAccountStatus(message, state) {
    if (!resetAccountStatus) {
      return;
    }
    resetAccountStatus.textContent = message || "";
    if (state) {
      resetAccountStatus.dataset.state = state;
      return;
    }
    delete resetAccountStatus.dataset.state;
  }

  function setWinratesStatus(message, state) {
    if (!winratesStatus) {
      return;
    }
    winratesStatus.textContent = message || "";
    if (state) {
      winratesStatus.dataset.state = state;
      return;
    }
    delete winratesStatus.dataset.state;
  }

  function setPlayerAccountsStatus(message, state) {
    if (!playerAccountsStatus) {
      return;
    }
    playerAccountsStatus.textContent = message || "";
    if (state) {
      playerAccountsStatus.dataset.state = state;
      return;
    }
    delete playerAccountsStatus.dataset.state;
  }

  function setPlayerAccountStatus(message, state) {
    if (!playerAccountStatus) {
      return;
    }
    playerAccountStatus.textContent = message || "";
    if (state) {
      playerAccountStatus.dataset.state = state;
      return;
    }
    delete playerAccountStatus.dataset.state;
  }

  function setNewsStatus(message, state) {
    if (!newsStatus) {
      return;
    }
    newsStatus.textContent = message || "";
    if (state) {
      newsStatus.dataset.state = state;
      return;
    }
    delete newsStatus.dataset.state;
  }

  function setNewsAdminStatus(message, state) {
    if (!newsAdminStatus) {
      return;
    }
    newsAdminStatus.textContent = message || "";
    if (state) {
      newsAdminStatus.dataset.state = state;
      return;
    }
    delete newsAdminStatus.dataset.state;
  }

  function setNewsPostListStatus(message, state) {
    if (!newsPostListStatus) {
      return;
    }
    newsPostListStatus.textContent = message || "";
    if (state) {
      newsPostListStatus.dataset.state = state;
      return;
    }
    delete newsPostListStatus.dataset.state;
  }

  function setLatestReleasesStatus(message, state) {
    if (!latestReleasesStatus) {
      return;
    }
    latestReleasesStatus.textContent = message || "";
    if (state) {
      latestReleasesStatus.dataset.state = state;
      return;
    }
    delete latestReleasesStatus.dataset.state;
  }

  function setMaintenanceModeStatus(message, state) {
    if (!maintenanceModeStatus) {
      return;
    }
    maintenanceModeStatus.textContent = message || "";
    if (state) {
      maintenanceModeStatus.dataset.state = state;
      return;
    }
    delete maintenanceModeStatus.dataset.state;
  }

  function renderMaintenanceModeState() {
    if (maintenanceModeToggleButton) {
      maintenanceModeToggleButton.textContent = maintenanceModeEnabled
        ? "Disable Maintenance Mode"
        : "Enable Maintenance Mode";
    }
    setMaintenanceModeStatus(
      maintenanceModeEnabled ? "Maintenance mode is currently ON." : "Maintenance mode is currently OFF.",
      maintenanceModeEnabled ? "error" : "success"
    );
  }

  function splitNewsText(value) {
    return String(value || "")
      .split(/\r?\n/)
      .map(function (line) {
        return line.trim();
      });
  }

  function findCatalogCharacterByName(name) {
    var target = String(name || "").trim().toLowerCase();
    if (!target) {
      return null;
    }
    return characterCatalog.find(function (entry) {
      return entry && entry.name && String(entry.name).trim().toLowerCase() === target;
    }) || null;
  }

  function findCatalogSkillByName(character, skillName) {
    var target = String(skillName || "").trim().toLowerCase();
    if (!character || !Array.isArray(character.skills) || !target) {
      return null;
    }
    return character.skills.find(function (entry) {
      return entry && entry.name && String(entry.name).trim().toLowerCase() === target;
    }) || null;
  }

  function parseNewsChanges(value) {
    return splitNewsText(value)
      .filter(function (line) {
        return !!line && line !== "---";
      })
      .map(function (line) {
        var parts = line.split("|").map(function (part) {
          return String(part || "").trim();
        });
        if (parts.length >= 4) {
          var type = parts[0].toLowerCase();
          var character = findCatalogCharacterByName(parts[1]);
          var skill = findCatalogSkillByName(character, parts[2]);
          return {
            text: parts.slice(3).join(" | "),
            changeType: type === "buff" || type === "nerf" ? type : "",
            characterId: character && character.characterId ? String(character.characterId) : "",
            characterName: character && character.name ? String(character.name) : parts[1],
            skillId: skill && skill.id ? String(skill.id) : "",
            skillName: skill && skill.name ? String(skill.name) : parts[2],
            facePicture: character && character.facePicture ? String(character.facePicture) : "",
            skillimage: skill && skill.skillimage ? String(skill.skillimage) : ""
          };
        }
        return {
          text: line,
          changeType: "",
          characterId: "",
          characterName: "",
          skillId: "",
          skillName: "",
          facePicture: "",
          skillimage: ""
        };
      });
  }

  function buildNewsBlocksFromText(value) {
    var blocks = [];
    var currentParagraph = [];
    splitNewsText(value).forEach(function (line) {
      if (!line) {
        if (currentParagraph.length) {
          blocks.push({
            type: "paragraph",
            text: currentParagraph.join(" ")
          });
          currentParagraph = [];
        }
        return;
      }
      if (line === "---") {
        if (currentParagraph.length) {
          blocks.push({
            type: "paragraph",
            text: currentParagraph.join(" ")
          });
          currentParagraph = [];
        }
        blocks.push({ type: "divider", text: "" });
        return;
      }
      currentParagraph.push(line);
    });
    if (currentParagraph.length) {
      blocks.push({
        type: "paragraph",
        text: currentParagraph.join(" ")
      });
    }
    return blocks;
  }

  function buildNewsParagraphsFromBlocks(blocks) {
    return (Array.isArray(blocks) ? blocks : [])
      .filter(function (block) {
        return block && block.type === "paragraph" && block.text;
      })
      .map(function (block) {
        return String(block.text);
      });
  }

  function buildNewsEditorText(blocks) {
    return (Array.isArray(blocks) ? blocks : [])
      .map(function (block) {
        if (block && block.type === "divider") {
          return "---";
        }
        return block && block.text ? String(block.text) : "";
      })
      .join("\n\n");
  }

  function renderNewsPost(post) {
    var article = document.createElement("section");
    article.className = "news-post";

    var title = document.createElement("h1");
    title.className = "mainsection-kicker";
    title.textContent = post && post.title ? String(post.title) : "Untitled Post";
    article.appendChild(title);

    var meta = document.createElement("p");
    meta.className = "mainsection-meta";
    meta.innerHTML = "&raquo; " + formatDateTime(post && post.updatedAt ? post.updatedAt : post && post.createdAt) + " by <span class=\"byline\"></span>";
    var byline = meta.querySelector(".byline");
    if (byline) {
      byline.textContent = post && post.author ? String(post.author) : "Unknown";
    }
    article.appendChild(meta);

    var body = document.createElement("div");
    body.className = "mainsection-body";
    var blocks = post && Array.isArray(post.blocks) && post.blocks.length
      ? post.blocks
      : (post && Array.isArray(post.paragraphs) ? post.paragraphs.map(function (text) {
        return { type: "paragraph", text: text };
      }) : []);

    (Array.isArray(blocks) ? blocks : []).forEach(function (block) {
      if (block && block.type === "divider") {
        var divider = document.createElement("hr");
        divider.className = "news-divider";
        body.appendChild(divider);
        return;
      }
      if (block && block.text) {
        var paragraph = document.createElement("p");
        paragraph.textContent = String(block.text);
        body.appendChild(paragraph);
      }
    });

    var changes = post && Array.isArray(post.changes) ? post.changes : [];
    if (changes.length) {
      var autoDivider = document.createElement("hr");
      autoDivider.className = "news-divider";
      body.appendChild(autoDivider);

      var changesTitle = document.createElement("h3");
      changesTitle.className = "news-change-title";
      changesTitle.textContent = "Character and Skill Changes";
      body.appendChild(changesTitle);

      var changeList = document.createElement("div");
      changeList.className = "news-change-list";
      var groupedChanges = [];
      changes.forEach(function (entry) {
        var groupKey = entry && entry.characterId
          ? "character:" + entry.characterId
          : entry && entry.characterName
            ? "name:" + String(entry.characterName).toLowerCase()
            : "misc:" + groupedChanges.length;
        var existingGroup = groupedChanges.find(function (group) {
          return group.key === groupKey;
        });
        if (existingGroup) {
          existingGroup.entries.push(entry);
          return;
        }
        groupedChanges.push({
          key: groupKey,
          facePicture: entry && entry.facePicture ? String(entry.facePicture) : "",
          characterName: entry && entry.characterName ? String(entry.characterName) : "",
          entries: [entry]
        });
      });

      groupedChanges.forEach(function (group) {
        var groupNode = document.createElement("div");
        groupNode.className = "news-change-group";

        if (group.facePicture) {
          var face = document.createElement("img");
          face.className = "news-change-character";
          face.src = group.facePicture;
          face.alt = group.characterName || "Character";
          groupNode.appendChild(face);
        } else {
          var spacer = document.createElement("div");
          groupNode.appendChild(spacer);
        }

        var groupCopy = document.createElement("div");
        groupCopy.className = "news-change-group-list";

        if (group.characterName) {
          var groupName = document.createElement("div");
          groupName.className = "news-change-character-name";
          groupName.textContent = group.characterName;
          groupCopy.appendChild(groupName);
        }

        group.entries.forEach(function (entry) {
          var item = document.createElement("div");
          item.className = "news-change-item";

          var copy = document.createElement("div");
          copy.className = "news-change-copy";

          var header = document.createElement("div");
          header.className = "news-change-header";
          if (entry && entry.changeType) {
            var typeBadge = document.createElement("span");
            typeBadge.className = "news-change-type " + String(entry.changeType);
            typeBadge.textContent = String(entry.changeType).toUpperCase();
            header.appendChild(typeBadge);
          }
          if (entry && (entry.skillName || entry.skillimage)) {
            var skillBadge = document.createElement("span");
            skillBadge.className = "news-change-skill";
            if (entry.skillimage) {
              var skillImage = document.createElement("img");
              skillImage.className = "news-change-skill-image";
              skillImage.src = String(entry.skillimage);
              skillImage.alt = entry && entry.skillName ? String(entry.skillName) : "Skill";
              skillBadge.appendChild(skillImage);
            }
            if (entry.skillName) {
              var skillName = document.createElement("span");
              skillName.textContent = String(entry.skillName);
              skillBadge.appendChild(skillName);
            }
            header.appendChild(skillBadge);
          }
          if (header.childNodes.length) {
            copy.appendChild(header);
          }

          var text = document.createElement("p");
          text.className = "news-change-text";
          text.textContent = entry && entry.text
            ? String(entry.text).replace(/\\n/g, "\n")
            : String(entry || "");
          copy.appendChild(text);

          item.appendChild(copy);
          groupCopy.appendChild(item);
        });

        groupNode.appendChild(groupCopy);
        changeList.appendChild(groupNode);
      });
      body.appendChild(changeList);
    }

    article.appendChild(body);
    return article;
  }

  function renderNewsFeed(posts) {
    if (!newsFeedContent) {
      return;
    }
    clearChildren(newsFeedContent);

    var list = Array.isArray(posts) ? posts : [];
    if (!list.length) {
      setNewsStatus("No news posts available yet.", "error");
      if (newsFeedCounter) {
        newsFeedCounter.textContent = "0 / 0";
      }
      if (newsPrevButton) {
        newsPrevButton.disabled = true;
      }
      if (newsNextButton) {
        newsNextButton.disabled = true;
      }
      return;
    }

    currentNewsPostIndex = Math.max(0, Math.min(currentNewsPostIndex, list.length - 1));
    newsFeedContent.appendChild(renderNewsPost(list[currentNewsPostIndex]));
    if (newsFeedCounter) {
      newsFeedCounter.textContent = (currentNewsPostIndex + 1) + " / " + list.length;
    }
    if (newsPrevButton) {
      newsPrevButton.disabled = currentNewsPostIndex <= 0;
    }
    if (newsNextButton) {
      newsNextButton.disabled = currentNewsPostIndex >= list.length - 1;
    }
    setNewsStatus("");
  }

  async function loadPublicNews() {
    if (!newsFeed) {
      return;
    }
    setNewsStatus("Loading news...");
    try {
      var response = await fetch("/api/news", {
        credentials: "same-origin"
      });
      var data = await response.json().catch(function () {
        return {};
      });
      if (!response.ok) {
        setNewsStatus(data && data.error ? data.error : "Unable to load news posts.", "error");
        return;
      }
      publicNewsPosts = data && Array.isArray(data.posts) ? data.posts : [];
      renderNewsFeed(publicNewsPosts);
    } catch (error) {
      setNewsStatus("Unable to reach the server.", "error");
    }
  }

  function showPreviousNewsPost() {
    if (!publicNewsPosts.length || currentNewsPostIndex <= 0) {
      return;
    }
    currentNewsPostIndex -= 1;
    renderNewsFeed(publicNewsPosts);
  }

  function showNextNewsPost() {
    if (!publicNewsPosts.length || currentNewsPostIndex >= publicNewsPosts.length - 1) {
      return;
    }
    currentNewsPostIndex += 1;
    renderNewsFeed(publicNewsPosts);
  }

  function resetNewsEditor() {
    if (newsAdminForm) {
      newsAdminForm.reset();
    }
    if (newsPostIdInput) {
      newsPostIdInput.value = "";
    }
    setNewsAdminStatus("");
  }

  function populateNewsEditor(post) {
    if (!post) {
      resetNewsEditor();
      return;
    }
    if (newsPostIdInput) {
      newsPostIdInput.value = post.id || "";
    }
    if (newsTitleInput) {
      newsTitleInput.value = post.title || "";
    }
    if (newsContentInput) {
      newsContentInput.value = buildNewsEditorText(post.blocks || []);
    }
    if (newsChangesInput) {
      newsChangesInput.value = Array.isArray(post.changes) ? post.changes.map(function (entry) {
        if (!entry || typeof entry !== "object") {
          return String(entry || "");
        }
        var parts = [];
        if (entry.changeType) {
          parts.push(String(entry.changeType).charAt(0).toUpperCase() + String(entry.changeType).slice(1));
        }
        if (entry.characterName) {
          parts.push(String(entry.characterName));
        }
        if (entry.skillName) {
          parts.push(String(entry.skillName));
        }
        parts.push(entry.text ? String(entry.text) : "");
        return parts.join(" | ");
      }).join("\n") : "";
    }
    setNewsAdminStatus("");
  }

  function renderAdminNewsPosts(posts) {
    if (!newsPostList) {
      return;
    }
    clearChildren(newsPostList);
    var list = Array.isArray(posts) ? posts : [];
    if (!list.length) {
      setNewsPostListStatus("No news posts yet.", "error");
      return;
    }
    list.forEach(function (post) {
      var entry = document.createElement("div");
      entry.className = "news-post-entry";

      var row = document.createElement("div");
      row.className = "news-post-entry-row";

      var button = document.createElement("button");
      button.type = "button";
      button.className = "news-post-entry";
      button.style.padding = "0";
      button.style.border = "0";
      button.style.background = "transparent";
      button.addEventListener("click", function () {
        populateNewsEditor(post);
      });

      var title = document.createElement("span");
      title.className = "news-post-entry-title";
      title.textContent = post && post.title ? String(post.title) : "Untitled Post";
      button.appendChild(title);

      var deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "news-post-delete";
      deleteButton.textContent = "Delete";
      deleteButton.addEventListener("click", function () {
        deleteNewsPost(post && post.id ? String(post.id) : "");
      });

      row.appendChild(button);
      row.appendChild(deleteButton);
      entry.appendChild(row);

      var meta = document.createElement("span");
      meta.className = "news-post-entry-meta";
      meta.textContent = formatDateTime(post && post.updatedAt ? post.updatedAt : post && post.createdAt) +
        " | " + (post && post.author ? String(post.author) : "Unknown");
      entry.appendChild(meta);

      newsPostList.appendChild(entry);
    });
    setNewsPostListStatus("");
  }

  async function loadAdminNewsPosts() {
    if (!newsPostList) {
      return;
    }
    setNewsPostListStatus("Loading posts...");
    try {
      var response = await fetch("/api/admin/news", {
        credentials: "same-origin"
      });
      var data = await response.json().catch(function () {
        return {};
      });
      if (!response.ok) {
        setNewsPostListStatus(data && data.error ? data.error : "Unable to load news posts.", "error");
        return;
      }
      adminNewsPosts = data && Array.isArray(data.posts) ? data.posts : [];
      renderAdminNewsPosts(adminNewsPosts);
    } catch (error) {
      setNewsPostListStatus("Unable to reach the server.", "error");
    }
  }

  async function loadCharacterCatalog() {
    if (!newsChangesInput && !latestReleasesForm) {
      return;
    }
    try {
      var response = await fetch("/api/characters/catalog", {
        credentials: "same-origin"
      });
      var data = await response.json().catch(function () {
        return {};
      });
      if (!response.ok) {
        return;
      }
      characterCatalog = data && Array.isArray(data.characters) ? data.characters : [];
      populateLatestReleaseSelectOptions();
    } catch (error) {}
  }

  function populateLatestReleaseSelectOptions() {
    if (!latestReleaseSelects.length) {
      return;
    }
    var characters = Array.isArray(characterCatalog) ? characterCatalog.slice() : [];
    characters.sort(function (left, right) {
      return String(left && left.name ? left.name : "").localeCompare(String(right && right.name ? right.name : ""));
    });
    latestReleaseSelects.forEach(function (select) {
      if (!select) {
        return;
      }
      var selectedValue = select.value || "";
      clearChildren(select);
      var placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "None";
      select.appendChild(placeholder);
      characters.forEach(function (character) {
        var option = document.createElement("option");
        option.value = character && character.characterId ? String(character.characterId) : "";
        option.textContent = character && character.name ? String(character.name) : option.value;
        select.appendChild(option);
      });
      select.value = selectedValue;
      if (select.value !== selectedValue) {
        select.value = "";
      }
    });
  }

  function populateLatestReleasesEditor(releases) {
    adminLatestReleases = Array.isArray(releases) ? releases.slice(0, 3) : [];
    latestReleaseSelects.forEach(function (select, index) {
      if (!select) {
        return;
      }
      var entry = adminLatestReleases[index] || null;
      select.value = entry && entry.characterId ? String(entry.characterId) : "";
    });
    setLatestReleasesStatus("");
  }

  async function loadAdminLatestReleases() {
    if (!latestReleasesForm) {
      return;
    }
    setLatestReleasesStatus("Loading latest releases...");
    try {
      var response = await fetch("/api/admin/latest-releases", {
        credentials: "same-origin"
      });
      var data = await response.json().catch(function () {
        return {};
      });
      if (!response.ok) {
        setLatestReleasesStatus(data && data.error ? data.error : "Unable to load latest releases.", "error");
        return;
      }
      populateLatestReleasesEditor(data && Array.isArray(data.releases) ? data.releases : []);
    } catch (error) {
      setLatestReleasesStatus("Unable to reach the server.", "error");
    }
  }

  async function saveAdminLatestReleases() {
    if (!latestReleasesForm) {
      return;
    }
    var payload = {
      releases: latestReleaseSelects.map(function (select) {
        return {
          characterId: select && select.value ? String(select.value) : ""
        };
      })
    };
    if (latestReleasesSaveButton) {
      latestReleasesSaveButton.disabled = true;
    }
    setLatestReleasesStatus("Saving latest releases...");
    try {
      var response = await fetch("/api/admin/latest-releases", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "same-origin",
        body: JSON.stringify(payload)
      });
      var data = await response.json().catch(function () {
        return {};
      });
      if (!response.ok) {
        setLatestReleasesStatus(data && data.error ? data.error : "Unable to save latest releases.", "error");
        return;
      }
      populateLatestReleasesEditor(data && Array.isArray(data.releases) ? data.releases : []);
      setLatestReleasesStatus("Latest character releases updated.", "success");
      loadLatestReleases();
    } catch (error) {
      setLatestReleasesStatus("Unable to reach the server.", "error");
    } finally {
      if (latestReleasesSaveButton) {
        latestReleasesSaveButton.disabled = false;
      }
    }
  }

  async function loadMaintenanceMode() {
    if (!maintenanceModeToggleButton) {
      return;
    }
    setMaintenanceModeStatus("Loading maintenance mode...");
    try {
      var response = await fetch("/api/admin/maintenance", {
        credentials: "same-origin"
      });
      var data = await response.json().catch(function () {
        return {};
      });
      if (!response.ok) {
        setMaintenanceModeStatus(data && data.error ? data.error : "Unable to load maintenance mode.", "error");
        return;
      }
      maintenanceModeEnabled = !!(data && data.enabled);
      renderMaintenanceModeState();
    } catch (error) {
      setMaintenanceModeStatus("Unable to reach the server.", "error");
    }
  }

  async function toggleMaintenanceMode() {
    if (!maintenanceModeToggleButton) {
      return;
    }
    maintenanceModeToggleButton.disabled = true;
    setMaintenanceModeStatus(maintenanceModeEnabled ? "Disabling maintenance mode..." : "Enabling maintenance mode...");
    try {
      var response = await fetch("/api/admin/maintenance", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "same-origin",
        body: JSON.stringify({
          enabled: !maintenanceModeEnabled
        })
      });
      var data = await response.json().catch(function () {
        return {};
      });
      if (!response.ok) {
        setMaintenanceModeStatus(data && data.error ? data.error : "Unable to update maintenance mode.", "error");
        return;
      }
      maintenanceModeEnabled = !!(data && data.enabled);
      renderMaintenanceModeState();
    } catch (error) {
      setMaintenanceModeStatus("Unable to reach the server.", "error");
    } finally {
      maintenanceModeToggleButton.disabled = false;
    }
  }

  async function saveNewsPost() {
    if (!newsTitleInput) {
      return;
    }
    var title = String(newsTitleInput.value || "").trim();
    if (!title) {
      setNewsAdminStatus("Title is required.", "error");
      return;
    }
    var blocks = buildNewsBlocksFromText(newsContentInput && newsContentInput.value ? newsContentInput.value : "");
    var changes = parseNewsChanges(newsChangesInput && newsChangesInput.value ? newsChangesInput.value : "");
    var payload = {
      title: title,
      blocks: blocks,
      paragraphs: buildNewsParagraphsFromBlocks(blocks),
      changes: changes
    };
    var postId = newsPostIdInput && newsPostIdInput.value ? String(newsPostIdInput.value) : "";
    var endpoint = postId ? "/api/admin/news/" + encodeURIComponent(postId) : "/api/admin/news";
    var method = postId ? "PUT" : "POST";

    if (newsSaveButton) {
      newsSaveButton.disabled = true;
    }
    setNewsAdminStatus(postId ? "Updating post..." : "Creating post...");
    try {
      var response = await fetch(endpoint, {
        method: method,
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "same-origin",
        body: JSON.stringify(payload)
      });
      var data = await response.json().catch(function () {
        return {};
      });
      if (!response.ok) {
        setNewsAdminStatus(data && data.error ? data.error : "Unable to save news post.", "error");
        return;
      }
      setNewsAdminStatus("News post saved.", "success");
      populateNewsEditor(data && data.post ? data.post : null);
      loadAdminNewsPosts();
      loadPublicNews();
    } catch (error) {
      setNewsAdminStatus("Unable to reach the server.", "error");
    } finally {
      if (newsSaveButton) {
        newsSaveButton.disabled = false;
      }
    }
  }

  async function deleteNewsPost(postId) {
    if (!postId) {
      return;
    }
    setNewsAdminStatus("Deleting post...");
    try {
      var response = await fetch("/api/admin/news/" + encodeURIComponent(postId), {
        method: "DELETE",
        credentials: "same-origin"
      });
      var data = await response.json().catch(function () {
        return {};
      });
      if (!response.ok) {
        setNewsAdminStatus(data && data.error ? data.error : "Unable to delete news post.", "error");
        return;
      }
      if (newsPostIdInput && newsPostIdInput.value === postId) {
        resetNewsEditor();
      }
      setNewsAdminStatus("News post deleted.", "success");
      loadAdminNewsPosts();
      loadPublicNews();
    } catch (error) {
      setNewsAdminStatus("Unable to reach the server.", "error");
    }
  }

  function renderWinrates(entries) {
    if (!winratesGrid) {
      return;
    }
    clearChildren(winratesGrid);

    var list = Array.isArray(entries) ? entries : [];
    if (!list.length) {
      setWinratesStatus("No ladder character stats available yet.", "error");
      return;
    }

    list.forEach(function (entry) {
      var card = document.createElement("article");
      card.className = "winrate-card";

      var image = document.createElement("img");
      image.className = "winrate-face";
      image.src = entry && entry.facePicture ? String(entry.facePicture) : defaultProfileAvatar;
      image.alt = entry && entry.name ? String(entry.name) : "Character";
      card.appendChild(image);

      var content = document.createElement("div");
      content.className = "winrate-content";

      var name = document.createElement("h3");
      name.className = "winrate-name";
      name.textContent = entry && entry.name ? String(entry.name) : "Unknown Character";
      content.appendChild(name);

      var wins = document.createElement("p");
      wins.className = "winrate-stat";
      wins.textContent = "Total Games Won: " + formatInteger(entry && entry.totalGamesWon);
      content.appendChild(wins);

      var matches = document.createElement("p");
      matches.className = "winrate-stat";
      matches.textContent = "Total Matches Played: " + formatInteger(entry && entry.totalMatchesPlayed);
      content.appendChild(matches);

      card.appendChild(content);
      winratesGrid.appendChild(card);
    });
  }

  async function loadAdminWinrates() {
    if (!winratesGrid) {
      return;
    }

    setWinratesStatus("Loading character winrates...");
    try {
      var response = await fetch("/api/admin/winrates", {
        credentials: "same-origin"
      });
      var data = await response.json().catch(function () {
        return {};
      });

      if (!response.ok) {
        setWinratesStatus(data && data.error ? data.error : "Unable to load winrates.", "error");
        return;
      }

      renderWinrates(data && Array.isArray(data.characters) ? data.characters : []);
      setWinratesStatus("");
    } catch (error) {
      setWinratesStatus("Unable to reach the server.", "error");
    }
  }

  function openPlayerAccountModal() {
    if (!playerAccountOverlay) {
      return;
    }
    playerAccountOverlay.classList.add("visible");
  }

  function closePlayerAccountModal() {
    if (!playerAccountOverlay) {
      return;
    }
    playerAccountOverlay.classList.remove("visible");
    setPlayerAccountStatus("");
  }

  async function openAdminUser(username) {
    if (!username) {
      return;
    }

    setPlayerAccountStatus("Loading account...");
    try {
      var response = await fetch("/api/admin/users/" + encodeURIComponent(username), {
        credentials: "same-origin"
      });
      var data = await response.json().catch(function () {
        return {};
      });

      if (!response.ok) {
        setPlayerAccountStatus(data && data.error ? data.error : "Unable to load player account.", "error");
        openPlayerAccountModal();
        return;
      }

      selectedAdminAccountUsername = username;
      setText(playerAccountUsername, data && data.username ? data.username : username);
      setText(playerAccountRole, data && data.role ? formatRole(data.role) : "Player");
      setText(playerAccountLadderRatio, data && data.ladderRatio ? data.ladderRatio : "0.00%");
      if (playerAccountEditor) {
        playerAccountEditor.value = JSON.stringify(data && data.document ? data.document : {}, null, 2);
      }
      setPlayerAccountStatus("");
      openPlayerAccountModal();
    } catch (error) {
      setPlayerAccountStatus("Unable to reach the server.", "error");
      openPlayerAccountModal();
    }
  }

  function renderPlayerAccounts(entries) {
    if (!playerAccountsList) {
      return;
    }
    clearChildren(playerAccountsList);

    var list = Array.isArray(entries) ? entries : [];
    if (!list.length) {
      setPlayerAccountsStatus("No player accounts found.", "error");
      return;
    }

    list.forEach(function (entry) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "player-account-entry";
      button.addEventListener("click", function () {
        openAdminUser(entry && entry.username ? String(entry.username) : "");
      });

      var name = document.createElement("span");
      name.className = "player-account-entry-name";
      name.textContent = entry && entry.username ? String(entry.username) : "Unknown";
      button.appendChild(name);

      var meta = document.createElement("span");
      meta.className = "player-account-entry-meta";
      meta.textContent =
        (entry && entry.role ? formatRole(entry.role) : "Player") +
        " | " +
        (entry && entry.ladderRatio ? String(entry.ladderRatio) : "0.00%");
      button.appendChild(meta);

      playerAccountsList.appendChild(button);
    });
  }

  function filterAndRenderPlayerAccounts() {
    var query = String(playerAccountsSearch && playerAccountsSearch.value ? playerAccountsSearch.value : "")
      .trim()
      .toLowerCase();
    var filteredEntries = adminUserEntries.filter(function (entry) {
      var username = entry && entry.username ? String(entry.username).toLowerCase() : "";
      var role = entry && entry.role ? String(entry.role).toLowerCase() : "";
      return !query || username.indexOf(query) !== -1 || role.indexOf(query) !== -1;
    });
    renderPlayerAccounts(filteredEntries);
    if (query && !filteredEntries.length) {
      setPlayerAccountsStatus("No player accounts match that search.", "error");
      return;
    }
    setPlayerAccountsStatus("");
  }

  async function loadAdminUsers() {
    if (!playerAccountsList) {
      return;
    }

    setPlayerAccountsStatus("Loading player accounts...");
    try {
      var response = await fetch("/api/admin/users", {
        credentials: "same-origin"
      });
      var data = await response.json().catch(function () {
        return {};
      });

      if (!response.ok) {
        setPlayerAccountsStatus(data && data.error ? data.error : "Unable to load player accounts.", "error");
        return;
      }

      adminUserEntries = data && Array.isArray(data.users) ? data.users : [];
      filterAndRenderPlayerAccounts();
    } catch (error) {
      setPlayerAccountsStatus("Unable to reach the server.", "error");
    }
  }

  async function saveAdminUser() {
    if (!playerAccountEditor || !selectedAdminAccountUsername) {
      return;
    }

    var documentValue = null;
    try {
      documentValue = JSON.parse(playerAccountEditor.value || "{}");
    } catch (error) {
      setPlayerAccountStatus("Account document must be valid JSON.", "error");
      return;
    }

    if (playerAccountSave) {
      playerAccountSave.disabled = true;
    }
    setPlayerAccountStatus("Saving account...");
    try {
      var response = await fetch("/api/admin/users/" + encodeURIComponent(selectedAdminAccountUsername), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "same-origin",
        body: JSON.stringify(documentValue)
      });
      var data = await response.json().catch(function () {
        return {};
      });

      if (!response.ok) {
        setPlayerAccountStatus(data && data.error ? data.error : "Unable to update player account.", "error");
        return;
      }

      selectedAdminAccountUsername =
        data && data.user && data.user.username
          ? String(data.user.username)
          : selectedAdminAccountUsername;
      if (playerAccountEditor) {
        playerAccountEditor.value = JSON.stringify(data && data.user ? data.user : documentValue, null, 2);
      }
      setText(playerAccountUsername, selectedAdminAccountUsername);
      setText(playerAccountRole, formatRole(data && data.user && data.user.role ? data.user.role : "player"));
      var updatedProfile = data && data.user && data.user.profile ? data.user.profile : {};
      var wins = Number(updatedProfile && updatedProfile.ladder && updatedProfile.ladder.wins) || 0;
      var losses = Number(updatedProfile && updatedProfile.ladder && updatedProfile.ladder.losses) || 0;
      var total = wins + losses;
      setText(playerAccountLadderRatio, total > 0 ? ((wins / total) * 100).toFixed(2) + "%" : "0.00%");
      setPlayerAccountStatus("Player account updated.");
      loadAdminUsers();
    } catch (error) {
      setPlayerAccountStatus("Unable to reach the server.", "error");
    } finally {
      if (playerAccountSave) {
        playerAccountSave.disabled = false;
      }
    }
  }

  function setCharacterEditorStatus(message, state) {
    if (!characterEditorStatus) {
      return;
    }
    characterEditorStatus.textContent = message || "";
    if (state) {
      characterEditorStatus.dataset.state = state;
      return;
    }
    delete characterEditorStatus.dataset.state;
  }

  function setCharacterEditorModalStatus(message, state) {
    if (!characterEditorModalStatus) {
      return;
    }
    characterEditorModalStatus.textContent = message || "";
    if (state) {
      characterEditorModalStatus.dataset.state = state;
      return;
    }
    delete characterEditorModalStatus.dataset.state;
  }

  function openCharacterEditorModal() {
    if (!characterEditorOverlay) {
      return;
    }
    characterEditorOverlay.classList.add("visible");
    characterEditorOverlay.setAttribute("aria-hidden", "false");
  }

  function closeCharacterEditorModal() {
    if (!characterEditorOverlay) {
      return;
    }
    characterEditorOverlay.classList.remove("visible");
    characterEditorOverlay.setAttribute("aria-hidden", "true");
    selectedAdminCharacterId = "";
    setCharacterEditorModalStatus("");
  }

  function renderAdminCharacters(entries) {
    if (!characterEditorGrid) {
      return;
    }
    clearChildren(characterEditorGrid);

    var list = Array.isArray(entries) ? entries : [];
    if (!list.length) {
      setCharacterEditorStatus("No characters found.", "error");
      return;
    }

    list.forEach(function (entry) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "character-editor-card";
      button.addEventListener("click", function () {
        openAdminCharacter(entry && entry.characterId ? String(entry.characterId) : "");
      });

      var face = document.createElement("img");
      face.className = "character-editor-card-face";
      face.alt = (entry && entry.name ? String(entry.name) : "Character") + " face";
      face.src = entry && entry.facePicture ? String(entry.facePicture) : defaultProfileAvatar;
      button.appendChild(face);

      var copy = document.createElement("div");

      var name = document.createElement("span");
      name.className = "character-editor-card-name";
      name.textContent = entry && entry.name ? String(entry.name) : "Unknown";
      copy.appendChild(name);

      var meta = document.createElement("span");
      meta.className = "character-editor-card-id";
      meta.textContent = entry && entry.characterId ? String(entry.characterId) : "";
      copy.appendChild(meta);

      button.appendChild(copy);
      characterEditorGrid.appendChild(button);
    });
  }

  function filterAndRenderAdminCharacters() {
    var query = String(characterEditorSearch && characterEditorSearch.value ? characterEditorSearch.value : "")
      .trim()
      .toLowerCase();
    var filteredEntries = adminCharacterEntries.filter(function (entry) {
      var name = entry && entry.name ? String(entry.name).toLowerCase() : "";
      var characterId = entry && entry.characterId ? String(entry.characterId).toLowerCase() : "";
      return !query || name.indexOf(query) !== -1 || characterId.indexOf(query) !== -1;
    });
    renderAdminCharacters(filteredEntries);
    if (query && !filteredEntries.length) {
      setCharacterEditorStatus("No characters match that search.", "error");
      return;
    }
    setCharacterEditorStatus("");
  }

  async function loadAdminCharacters() {
    if (!characterEditorGrid) {
      return;
    }

    setCharacterEditorStatus("Loading characters...");
    try {
      var response = await fetch("/api/admin/characters", {
        credentials: "same-origin"
      });
      var data = await response.json().catch(function () {
        return {};
      });

      if (!response.ok) {
        setCharacterEditorStatus(data && data.error ? data.error : "Unable to load characters.", "error");
        return;
      }

      adminCharacterEntries = data && Array.isArray(data.characters) ? data.characters : [];
      filterAndRenderAdminCharacters();
    } catch (error) {
      setCharacterEditorStatus("Unable to reach the server.", "error");
    }
  }

  async function openAdminCharacter(characterId) {
    if (!characterId) {
      return;
    }

    selectedAdminCharacterId = characterId;
    setText(characterEditorName, "Loading...");
    setText(characterEditorId, characterId);
    if (characterEditorFace) {
      characterEditorFace.src = defaultProfileAvatar;
    }
    if (characterEditorJson) {
      characterEditorJson.value = "";
    }
    setCharacterEditorModalStatus("Loading character...");
    openCharacterEditorModal();

    try {
      var response = await fetch("/api/admin/characters/" + encodeURIComponent(characterId), {
        credentials: "same-origin"
      });
      var data = await response.json().catch(function () {
        return {};
      });

      if (!response.ok) {
        setCharacterEditorModalStatus(data && data.error ? data.error : "Unable to load character.", "error");
        return;
      }

      var character = data && data.character ? data.character : {};
      setText(characterEditorName, character && character.name ? character.name : characterId);
      setText(characterEditorId, character && character.characterId ? character.characterId : characterId);
      if (characterEditorFace) {
        characterEditorFace.src = character && character.facePicture ? character.facePicture : defaultProfileAvatar;
      }
      if (characterEditorJson) {
        characterEditorJson.value = JSON.stringify(character, null, 2);
      }
      setCharacterEditorModalStatus("");
    } catch (error) {
      setCharacterEditorModalStatus("Unable to reach the server.", "error");
    }
  }

  async function saveAdminCharacter() {
    if (!characterEditorJson || !selectedAdminCharacterId) {
      return;
    }

    var nextCharacter = null;
    try {
      nextCharacter = JSON.parse(characterEditorJson.value || "{}");
    } catch (error) {
      setCharacterEditorModalStatus("Character data must be valid JSON.", "error");
      return;
    }

    if (characterEditorSave) {
      characterEditorSave.disabled = true;
    }
    setCharacterEditorModalStatus("Saving character...");
    try {
      var response = await fetch("/api/admin/characters/" + encodeURIComponent(selectedAdminCharacterId), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "same-origin",
        body: JSON.stringify(nextCharacter)
      });
      var data = await response.json().catch(function () {
        return {};
      });

      if (!response.ok) {
        setCharacterEditorModalStatus(data && data.error ? data.error : "Unable to update character.", "error");
        return;
      }

      var savedCharacter = data && data.character ? data.character : nextCharacter;
      selectedAdminCharacterId =
        savedCharacter && savedCharacter.characterId ? String(savedCharacter.characterId) : selectedAdminCharacterId;
      if (characterEditorJson) {
        characterEditorJson.value = JSON.stringify(savedCharacter, null, 2);
      }
      setText(characterEditorName, savedCharacter && savedCharacter.name ? savedCharacter.name : selectedAdminCharacterId);
      setText(characterEditorId, selectedAdminCharacterId);
      if (characterEditorFace) {
        characterEditorFace.src = savedCharacter && savedCharacter.facePicture ? savedCharacter.facePicture : defaultProfileAvatar;
      }
      setCharacterEditorModalStatus("Character updated.");
      loadAdminCharacters();
      loadCharacterCatalog();
    } catch (error) {
      setCharacterEditorModalStatus("Unable to reach the server.", "error");
    } finally {
      if (characterEditorSave) {
        characterEditorSave.disabled = false;
      }
    }
  }

  async function exportAdminCharacters() {
    if (!characterEditorExport) {
      return;
    }

    characterEditorExport.disabled = true;
    setCharacterEditorStatus("Preparing characters.js export...");
    try {
      var response = await fetch("/api/admin/characters/export", {
        credentials: "same-origin"
      });

      if (!response.ok) {
        var errorData = await response.json().catch(function () {
          return {};
        });
        setCharacterEditorStatus(
          errorData && errorData.error ? errorData.error : "Unable to export characters.js.",
          "error"
        );
        return;
      }

      var fileBlob = await response.blob();
      var downloadUrl = window.URL.createObjectURL(fileBlob);
      var downloadLink = document.createElement("a");
      downloadLink.href = downloadUrl;
      downloadLink.download = "characters.js";
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      window.URL.revokeObjectURL(downloadUrl);
      setCharacterEditorStatus("Downloaded characters.js from the live server.", "success");
    } catch (error) {
      setCharacterEditorStatus("Unable to reach the server.", "error");
    } finally {
      characterEditorExport.disabled = false;
    }
  }

  async function resetAdminWinrates() {
    if (!resetWinratesButton) {
      return;
    }

    resetWinratesButton.disabled = true;
    setWinratesStatus("Resetting winrates...");
    try {
      var response = await fetch("/api/admin/winrates/reset", {
        method: "POST",
        credentials: "same-origin"
      });
      var data = await response.json().catch(function () {
        return {};
      });

      if (!response.ok) {
        setWinratesStatus(data && data.error ? data.error : "Unable to reset winrates.", "error");
        return;
      }

      setWinratesStatus("Winrates reset.");
      await loadAdminWinrates();
    } catch (error) {
      setWinratesStatus("Unable to reach the server.", "error");
    } finally {
      resetWinratesButton.disabled = false;
    }
  }

  function setClanRegisterStatus(message) {
    if (!clanRegisterStatus) {
      return;
    }
    clanRegisterStatus.textContent = message || "";
  }

  function setHiddenState(node, shouldHide) {
    if (!node) {
      return;
    }
    node.hidden = !!shouldHide;
    node.style.display = shouldHide ? "none" : "";
  }

  function clanRankHasPermission(rankKey, permission) {
    var map = {
      clanLeader: {
        invite: true,
        assignRanks: true,
        manageInfo: true,
        manageAvatar: true
      },
      leader: {
        invite: true,
        assignRanks: true,
        manageInfo: false,
        manageAvatar: true
      },
      captain: {
        invite: true,
        assignRanks: true,
        manageInfo: false,
        manageAvatar: false
      },
      lieutenant: {
        invite: true,
        assignRanks: false,
        manageInfo: false,
        manageAvatar: false
      },
      member: {
        invite: false,
        assignRanks: false,
        manageInfo: false,
        manageAvatar: false
      },
      trial: {
        invite: false,
        assignRanks: false,
        manageInfo: false,
        manageAvatar: false
      }
    };
    return !!(map[String(rankKey || "member")] && map[String(rankKey || "member")][permission]);
  }

  function updateClanPanelState(clan) {
    var hasClan = !!(clan && clan.name);
    var rankKey = clan && clan.rankKey ? String(clan.rankKey) : "member";
    setHiddenState(clanRecruitmentCard, !hasClan || !clanRankHasPermission(rankKey, "invite"));
    setHiddenState(clanStylesCard, !hasClan || !clanRankHasPermission(rankKey, "manageInfo"));
    setHiddenState(clanManagementCard, !hasClan || !clanRankHasPermission(rankKey, "assignRanks"));
    setHiddenState(clanAvatarCard, !hasClan || !clanRankHasPermission(rankKey, "manageAvatar"));
    setHiddenState(clanInvitationsCard, false);
    setHiddenState(leaveClanCard, !hasClan);
    setHiddenState(clanRegisterCard, hasClan);
    if (clanRegisterOpen) {
      clanRegisterOpen.disabled = hasClan;
    }
    if (!hasClan && clanRegisterNameInput) {
      clanRegisterNameInput.value = "";
    }
    if (!hasClan && clanRegisterAbbreviationInput) {
      clanRegisterAbbreviationInput.value = "";
    }
    if (!hasClan && clanRegisterBioInput) {
      clanRegisterBioInput.value = "";
    }
  }

  function setChangeBackgroundsStatus(message, state) {
    if (!changeBackgroundsStatus) {
      return;
    }
    changeBackgroundsStatus.textContent = message || "";
    if (state) {
      changeBackgroundsStatus.dataset.state = state;
      return;
    }
    delete changeBackgroundsStatus.dataset.state;
  }

  function setLeaveClanStatus(message) {
    if (!leaveClanStatus) {
      return;
    }
    leaveClanStatus.textContent = message || "";
  }

  function setClanRecruitmentStatus(message) {
    if (!clanRecruitmentStatus) {
      return;
    }
    clanRecruitmentStatus.textContent = message || "";
  }

  function setClanInfoStatus(message) {
    if (!clanInfoStatus) {
      return;
    }
    clanInfoStatus.textContent = message || "";
  }

  function setClanAvatarStatus(message, state) {
    if (!clanAvatarStatus) {
      return;
    }
    clanAvatarStatus.textContent = message || "";
    if (state) {
      clanAvatarStatus.dataset.state = state;
      return;
    }
    delete clanAvatarStatus.dataset.state;
  }

  function setClanInvitationsStatus(message) {
    if (!clanInvitationsStatus) {
      return;
    }
    clanInvitationsStatus.textContent = message || "";
  }

  function setClanManagementStatus(message) {
    if (!clanManagementStatus) {
      return;
    }
    clanManagementStatus.textContent = message || "";
  }

  function getClanCustomRankNames() {
    var clan = currentSessionUser && currentSessionUser.profile ? currentSessionUser.profile.clan : null;
    var customRankNames = clan && clan.customRankNames ? clan.customRankNames : {};
    return {
      clanLeader: Array.isArray(customRankNames.clanLeader) ? customRankNames.clanLeader.slice() : [],
      leader: Array.isArray(customRankNames.leader) ? customRankNames.leader.slice() : [],
      captain: Array.isArray(customRankNames.captain) ? customRankNames.captain.slice() : [],
      lieutenant: Array.isArray(customRankNames.lieutenant) ? customRankNames.lieutenant.slice() : [],
      member: Array.isArray(customRankNames.member) ? customRankNames.member.slice() : [],
      trial: Array.isArray(customRankNames.trial) ? customRankNames.trial.slice() : []
    };
  }

  function getClanRankDisplayLabel(clan) {
    if (!clan) {
      return "-";
    }
    if (clan.customRankName) {
      return String(clan.customRankName);
    }
    if (clan.rankKey && defaultClanRankLabels[clan.rankKey]) {
      return defaultClanRankLabels[clan.rankKey];
    }
    return clan.rank || "-";
  }

  function updateClanRankSelectLabels() {
    if (clanRankTierSelect && clanRankTierSelect.options) {
      Array.prototype.forEach.call(clanRankTierSelect.options, function (option) {
        var key = String(option.value || "");
        option.textContent = defaultClanRankLabels[key] || defaultClanRankLabels.member;
      });
    }
    if (clanMemberRankSelect) {
      var previousValue = String(clanMemberRankSelect.value || "");
      clearChildren(clanMemberRankSelect);
      var rankNames = getClanCustomRankNames();
      Object.keys(defaultClanRankLabels).forEach(function (key) {
        var baseOption = document.createElement("option");
        baseOption.value = key + "|";
        baseOption.textContent = defaultClanRankLabels[key];
        clanMemberRankSelect.appendChild(baseOption);

        rankNames[key].forEach(function (customLabel) {
          var customOption = document.createElement("option");
          customOption.value = key + "|" + encodeURIComponent(customLabel);
          customOption.textContent = customLabel + " (Based On " + defaultClanRankLabels[key] + ")";
          clanMemberRankSelect.appendChild(customOption);
        });
      });
      if (previousValue) {
        clanMemberRankSelect.value = previousValue;
      }
      if (!clanMemberRankSelect.value && clanMemberRankSelect.options.length) {
        clanMemberRankSelect.selectedIndex = 0;
      }
    }
  }

  function syncSelectedCustomRankName() {
    if (!clanRankTierSelect || !clanRankCustomNameInput) {
      return;
    }
    var selectedKey = String(clanRankTierSelect.value || "clanLeader");
    var existingValue = clanRankExistingSelect && clanRankExistingSelect.value ? String(clanRankExistingSelect.value) : "";
    if (existingValue) {
      clanRankCustomNameInput.value = existingValue;
      return;
    }
    clanRankCustomNameInput.value = "";
  }

  function updateExistingCustomRankSelect() {
    if (!clanRankExistingSelect || !clanRankTierSelect) {
      return;
    }
    var selectedKey = String(clanRankTierSelect.value || "clanLeader");
    var ranks = getClanCustomRankNames()[selectedKey] || [];
    clearChildren(clanRankExistingSelect);
    var newOption = document.createElement("option");
    newOption.value = "";
    newOption.textContent = "Create New Custom Rank";
    clanRankExistingSelect.appendChild(newOption);
    ranks.forEach(function (rankName) {
      var option = document.createElement("option");
      option.value = rankName;
      option.textContent = rankName + " (Based On " + (defaultClanRankLabels[selectedKey] || "Member") + ")";
      clanRankExistingSelect.appendChild(option);
    });
    clanRankExistingSelect.value = "";
    syncSelectedCustomRankName();
  }

  function renderClanMembers(entries) {
    if (!clanMemberList) {
      return;
    }
    clearChildren(clanMemberList);
    var list = Array.isArray(entries) ? entries : [];
    if (!list.length) {
      var empty = document.createElement("div");
      empty.className = "quick-game-empty";
      empty.textContent = "No clan members found.";
      clanMemberList.appendChild(empty);
      return;
    }
    list.forEach(function (entry) {
      var row = document.createElement("div");
      row.className = "quick-game-row";

      var memberCell = document.createElement("div");
      memberCell.className = "quick-game-matchup";
      memberCell.appendChild(createProfileLink(entry && entry.username ? String(entry.username) : "Unknown"));

      var rankCell = document.createElement("div");
      rankCell.className = "quick-game-result";
      rankCell.textContent = entry && entry.rank ? String(entry.rank) : "Member";

      row.appendChild(memberCell);
      row.appendChild(rankCell);
      clanMemberList.appendChild(row);
    });
  }

  async function loadClanMembers() {
    try {
      var response = await fetch("/api/clan/members", {
        credentials: "same-origin"
      });
      var data = await response.json().catch(function () {
        return {};
      });
      if (!response.ok) {
        renderClanMembers([]);
        if (clanMemberSelect) {
          clearChildren(clanMemberSelect);
        }
        setClanManagementStatus(data && data.error ? data.error : "Unable to load clan members.");
        return [];
      }

      var members = Array.isArray(data && data.members) ? data.members : [];
      if (clanMemberSelect) {
        clearChildren(clanMemberSelect);
        members.forEach(function (member) {
          var option = document.createElement("option");
          option.value = member && member.username ? String(member.username) : "";
          option.textContent = member && member.username ? String(member.username) : "Unknown";
          clanMemberSelect.appendChild(option);
        });
      }
      updateClanRankSelectLabels();
      renderClanMembers(members);
      return members;
    } catch (error) {
      renderClanMembers([]);
      if (clanMemberSelect) {
        clearChildren(clanMemberSelect);
      }
      setClanManagementStatus("Unable to reach the server.");
      return [];
    }
  }

  function renderClanInvitations(entries) {
    if (!clanInvitationsList) {
      return;
    }
    clearChildren(clanInvitationsList);
    var list = Array.isArray(entries) ? entries : [];
    if (!list.length) {
      var empty = document.createElement("div");
      empty.className = "quick-game-empty";
      empty.textContent = "No clan invitations.";
      clanInvitationsList.appendChild(empty);
      return;
    }

    list.forEach(function (entry) {
      var row = document.createElement("div");
      row.className = "quick-game-row";

      var info = document.createElement("div");
      info.className = "quick-game-matchup";
      var clanName = entry && entry.clanName ? String(entry.clanName) : "Unknown Clan";
      var clanAbbreviation = entry && entry.clanAbbreviation ? String(entry.clanAbbreviation) : "";
      var invitedBy = entry && entry.invitedBy ? String(entry.invitedBy) : "Unknown";
      info.textContent = clanAbbreviation ? clanName + " [" + clanAbbreviation + "] by " + invitedBy : clanName + " by " + invitedBy;

      var actions = document.createElement("div");
      actions.className = "quick-game-result";
      var acceptButton = document.createElement("button");
      acceptButton.type = "button";
      acceptButton.className = "clan-register-button primary";
      acceptButton.textContent = "Accept";
      acceptButton.addEventListener("click", async function () {
        acceptButton.disabled = true;
        setClanInvitationsStatus("Accepting invitation...");
        try {
          var response = await fetch("/api/clan/invitations/accept", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            credentials: "same-origin",
            body: JSON.stringify({
              username: clanName
            })
          });
          var data = await response.json().catch(function () {
            return {};
          });
          if (!response.ok) {
            setClanInvitationsStatus(data && data.error ? data.error : "Unable to accept invitation.");
            return;
          }
          var updatedUser = data && data.user && data.user.username ? data.user : null;
          if (updatedUser) {
            setCurrentSessionUser(updatedUser);
            cacheSessionUser(updatedUser);
            showAccountView(updatedUser.username);
            populateProfile(updatedUser);
          }
          setClanInvitationsStatus("Invitation accepted.");
          loadClanInvitations();
        } catch (error) {
          setClanInvitationsStatus("Unable to reach the server.");
        } finally {
          acceptButton.disabled = false;
        }
      });
      actions.appendChild(acceptButton);

      row.appendChild(info);
      row.appendChild(actions);
      clanInvitationsList.appendChild(row);
    });
  }

  async function loadClanInvitations() {
    if (!clanInvitationsList) {
      return;
    }
    try {
      var response = await fetch("/api/clan/invitations", {
        credentials: "same-origin"
      });
      var data = await response.json().catch(function () {
        return {};
      });
      if (!response.ok) {
        renderClanInvitations([]);
        setClanInvitationsStatus(data && data.error ? data.error : "Unable to load clan invitations.");
        return;
      }
      renderClanInvitations(data && data.invitations ? data.invitations : []);
    } catch (error) {
      renderClanInvitations([]);
      setClanInvitationsStatus("Unable to reach the server.");
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
      month: "long",
      day: "numeric"
    });
  }

  function formatDateTime(value) {
    if (!value) {
      return "Unknown";
    }
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Unknown";
    }
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function formatQuickGameDateTime(value) {
    if (!value) {
      return "Unknown";
    }
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Unknown";
    }
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  }

  function formatShortDateTime(value) {
    if (!value) {
      return "Unknown";
    }
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Unknown";
    }
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function formatCurrentLongDate() {
    return new Date().toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }

  function formatInteger(value) {
    var number = Number(value);
    if (!Number.isFinite(number)) {
      return "0";
    }
    return Math.round(number).toLocaleString();
  }

  function formatSigned(value) {
    var number = Number(value);
    if (!Number.isFinite(number) || number === 0) {
      return "0";
    }
    return (number > 0 ? "+" : "") + Math.round(number);
  }

  function formatRole(value) {
    var label = String(value || "player").trim();
    if (!label) {
      return "Player";
    }
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  function sanitizeClanRouteName(value) {
    return String(value || "")
      .trim()
      .slice(0, 35);
  }

  function sanitizeUsernameInput(value) {
    return String(value || "")
      .replace(/[^A-Za-z0-9_-]/g, "")
      .trim()
      .slice(0, 64);
  }

  function getCurrentActivityPageLabel() {
    var pathname = String(window.location.pathname || "").toLowerCase();
    var pageName = pathname.split("/").pop() || "index.html";
    var pageMap = {
      "index.html": "Comic Arena > Home",
      "profile.html": "Comic Arena > Profile",
      "clanprofile.html": "Comic Arena > Clan Profile",
      "selection.html": "Comic Arena > Selection",
      "ingame.html": "Comic Arena > In Game"
    };
    return pageMap[pageName] || "Comic Arena > " + pageName.replace(/\.html$/i, "").replace(/[-_]+/g, " ");
  }

  function isUserCurrentlyOnline(user) {
    var timestamp = user && user.profile && user.profile.activity
      ? user.profile.activity.lastOnlineAt
      : null;
    var lastOnlineAt = timestamp ? new Date(timestamp) : null;
    if (!lastOnlineAt || Number.isNaN(lastOnlineAt.getTime())) {
      return false;
    }
    return Date.now() - lastOnlineAt.getTime() <= 2 * 60 * 1000;
  }

  function getProfileCurrentPageLabel(user) {
    var isCurrentSessionProfile = Boolean(
      currentSessionUser &&
      currentSessionUser.username &&
      user &&
      user.username &&
      String(currentSessionUser.username).trim().toLowerCase() === String(user.username).trim().toLowerCase()
    );
    if (isCurrentSessionProfile) {
      return getCurrentActivityPageLabel();
    }
    return user && user.profile && user.profile.activity && user.profile.activity.currentPage
      ? user.profile.activity.currentPage
      : "Not available";
  }

  async function reportCurrentActivity() {
    if (!(currentSessionUser && currentSessionUser.username)) {
      return;
    }
    var currentPage = getCurrentActivityPageLabel();
    try {
      await fetch("/api/activity", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          currentPage: currentPage
        })
      });
      if (!currentSessionUser.profile) {
        currentSessionUser.profile = {};
      }
      if (!currentSessionUser.profile.activity) {
        currentSessionUser.profile.activity = {};
      }
      currentSessionUser.profile.activity.currentPage = currentPage;
      currentSessionUser.profile.activity.lastOnlineAt = new Date().toISOString();
    } catch (error) {}
  }

  function cacheSessionUser(user) {
    try {
      if (!user || !user.username) {
        localStorage.removeItem("narutoUser");
        return;
      }
      localStorage.setItem("narutoUser", JSON.stringify({
        username: user.username,
        avatarUrl: user.profile && user.profile.avatarUrl ? user.profile.avatarUrl : defaultProfileAvatar,
        clanAbbreviation: user.profile && user.profile.clan && user.profile.clan.abbreviation
          ? user.profile.clan.abbreviation
          : "",
        ladder: user.profile && user.profile.ladder ? user.profile.ladder : null,
        missions: user.profile && user.profile.missions
          ? user.profile.missions
          : {
              progress: {},
              unlockedCharacterIds: [],
            },
        backgrounds: user.profile && user.profile.backgrounds ? user.profile.backgrounds : {
          selectionUrl: "",
          ingameUrl: ""
        }
      }));
    } catch (error) {}
  }

  function formatRankNumber(index) {
    return String(index + 1).padStart(2, "0");
  }

  function formatListNumber(value) {
    var number = Number(value);
    if (!Number.isFinite(number)) {
      return "0";
    }
    return Math.round(number).toLocaleString();
  }

  function getProgressPercentFromLevelState(experienceIntoLevel, experienceForNextLevel, fallbackLevel) {
    var nextLevelCost = Math.max(0, Number(experienceForNextLevel) || 0);
    if (nextLevelCost > 0) {
      var progress = Math.max(0, Number(experienceIntoLevel) || 0);
      return Math.max(6, Math.min(100, Math.round((progress / nextLevelCost) * 100)));
    }
    var normalizedLevel = Math.max(1, Number(fallbackLevel) || 1);
    if (normalizedLevel >= 50) {
      return 100;
    }
    return Math.max(6, Math.min(100, Math.round((normalizedLevel / 50) * 100)));
  }

  function getPlayerLevelProgressPercent(level, experienceIntoLevel, experienceForNextLevel) {
    return getProgressPercentFromLevelState(experienceIntoLevel, experienceForNextLevel, level);
  }

  function getClanLevelProgressPercent(level, experienceIntoLevel, experienceForNextLevel) {
    return getProgressPercentFromLevelState(experienceIntoLevel, experienceForNextLevel, level);
  }

  function setProfileLevelMeterProgress(level, experienceIntoLevel, experienceForNextLevel) {
    if (!profileLevelMeter) {
      return;
    }
    profileLevelMeter.style.setProperty(
      "--level-progress",
      getPlayerLevelProgressPercent(level, experienceIntoLevel, experienceForNextLevel) + "%"
    );
  }

  function formatSignedListNumber(value) {
    var number = Number(value);
    if (!Number.isFinite(number) || number === 0) {
      return "0";
    }
    return (number > 0 ? "+" : "") + Math.round(number).toLocaleString();
  }

  function clearChildren(node) {
    if (!node) {
      return;
    }
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  function sanitizeProfileRouteUsername(value) {
    return String(value || "").trim().slice(0, 64);
  }

  function buildProfileHref(username) {
    var safeUsername = sanitizeProfileRouteUsername(username);
    return safeUsername ? "profile.html" : "profile.html";
  }

  function buildClanProfileHref(clanName) {
    var safeClanName = sanitizeClanRouteName(clanName);
    return safeClanName ? "clanprofile.html?clan=" + encodeURIComponent(safeClanName) : "clanprofile.html";
  }

  function createProfileLink(username, className) {
    if (String(username || "").trim() === "Game Bot") {
      var label = document.createElement("span");
      if (className) {
        label.className = className;
      }
      label.textContent = "Game Bot";
      return label;
    }
    var safeUsername = sanitizeProfileRouteUsername(username);
    var link = document.createElement("a");
    link.href = buildProfileHref(safeUsername);
    if (className) {
      link.className = className;
    }
    link.textContent = username || "Unknown";
    if (safeUsername) {
      link.addEventListener("click", function () {
        try {
          sessionStorage.setItem(profileLookupStorageKey, safeUsername);
        } catch (error) {}
      });
    }
    return link;
  }

  function createClanProfileLink(clanName, className) {
    var safeClanName = sanitizeClanRouteName(clanName);
    var link = document.createElement("a");
    link.href = buildClanProfileHref(safeClanName);
    if (className) {
      link.className = className;
    }
    link.textContent = clanName || "Unknown";
    return link;
  }

  function renderGameHistoryList(listNode, user, games, emptyText, emptyId) {
    if (!listNode) {
      return;
    }

    clearChildren(listNode);

    if (!games.length) {
      var empty = document.createElement("div");
      empty.className = "quick-game-empty";
      if (emptyId) {
        empty.id = emptyId;
      }
      empty.textContent = emptyText;
      listNode.appendChild(empty);
      return;
    }

    games.forEach(function (game) {
      var row = document.createElement("div");
      row.className = "quick-game-row";

      var time = document.createElement("div");
      time.className = "quick-game-time";
      time.textContent = formatQuickGameDateTime(game && game.playedAt);

      var matchup = document.createElement("div");
      matchup.className = "quick-game-matchup";
      var opponent = game && game.opponentUsername ? String(game.opponentUsername) : "Unknown";
      var username = user && user.username ? String(user.username) : "Unknown";
      matchup.appendChild(createProfileLink(username));
      matchup.appendChild(document.createTextNode(" vs "));
      matchup.appendChild(createProfileLink(opponent));

      var result = document.createElement("div");
      result.className = "quick-game-result";
      var winner = game && game.winnerUsername ? String(game.winnerUsername) : "";
      if (winner) {
        result.appendChild(document.createTextNode("Winner "));
        result.appendChild(createProfileLink(winner));
      } else {
        result.textContent = "No winner";
      }

      row.appendChild(time);
      row.appendChild(matchup);
      row.appendChild(result);
      listNode.appendChild(row);
    });
  }

  function renderQuickGames(user) {
    var games = user && user.profile && Array.isArray(user.profile.recentQuickGames)
      ? user.profile.recentQuickGames
      : [];
    renderGameHistoryList(
      profileQuickGamesList,
      user,
      games,
      "No quick games in the last 24 hours.",
      "profile-quick-games-empty"
    );
  }

  function renderPrivateGames(user) {
    var games = user && user.profile && Array.isArray(user.profile.recentPrivateGames)
      ? user.profile.recentPrivateGames
      : [];
    renderGameHistoryList(
      profilePrivateGamesList,
      user,
      games,
      "No private games in the last 24 hours.",
      "profile-private-games-empty"
    );
  }

  function renderLadderGames(user) {
    if (!profileLadderGamesList) {
      return;
    }

    clearChildren(profileLadderGamesList);
    var games = user && user.profile && Array.isArray(user.profile.recentLadderGames)
      ? user.profile.recentLadderGames
      : [];

    if (!games.length) {
      var empty = document.createElement("div");
      empty.className = "quick-game-empty";
      empty.id = "profile-ladder-games-empty";
      empty.textContent = "No ladder games in the last 24 hours.";
      profileLadderGamesList.appendChild(empty);
      return;
    }

    games.forEach(function (game) {
      var row = document.createElement("div");
      row.className = "quick-game-row";

      var time = document.createElement("div");
      time.className = "quick-game-time";
      time.textContent = formatQuickGameDateTime(game && game.playedAt);

      var matchup = document.createElement("div");
      matchup.className = "quick-game-matchup";
      var opponent = game && game.opponentUsername ? String(game.opponentUsername) : "Unknown";
      var username = user && user.username ? String(user.username) : "Unknown";
      matchup.appendChild(createProfileLink(username));
      matchup.appendChild(document.createTextNode(" vs "));
      matchup.appendChild(createProfileLink(opponent));

      var result = document.createElement("div");
      result.className = "quick-game-result";
      var expDelta = Number(game && game.expDelta) || 0;
      var clanExpDelta = Math.max(0, Number(game && game.clanExpDelta) || 0);
      var winner = game && game.winnerUsername ? String(game.winnerUsername) : "";
      var outcome = winner === username ? "Won" : winner ? "Lost" : "No winner";
      var expText = (expDelta >= 0 ? "+" : "") + formatInteger(expDelta) + " EXP";
      if (winner) {
        result.appendChild(document.createTextNode(outcome + " | Winner "));
        result.appendChild(createProfileLink(winner));
        result.appendChild(document.createTextNode(" (" + expText + ")"));
      } else {
        result.textContent = outcome + " (" + expText + ")";
      }
      if (clanExpDelta > 0) {
        result.textContent += " | Clan +" + formatInteger(clanExpDelta) + " EXP";
      }

      row.appendChild(time);
      row.appendChild(matchup);
      row.appendChild(result);
      profileLadderGamesList.appendChild(row);
    });
  }

  function setClanProfileStatus(message, state) {
    if (!clanProfileStatus) {
      return;
    }
    clanProfileStatus.textContent = message || "";
    if (state) {
      clanProfileStatus.dataset.state = state;
      return;
    }
    delete clanProfileStatus.dataset.state;
  }

  function renderClanProfileMembers(clan) {
    if (!clanProfileMemberList) {
      return;
    }
    clearChildren(clanProfileMemberList);
    var members = clan && Array.isArray(clan.members) ? clan.members : [];
    if (!members.length) {
      var empty = document.createElement("div");
      empty.className = "clan-profile-empty";
      empty.textContent = "No clan members found.";
      clanProfileMemberList.appendChild(empty);
      return;
    }

    var groups = {};
    members.forEach(function (member) {
      var rankLabel = member && member.rank ? String(member.rank) : "Member";
      if (!groups[rankLabel]) {
        groups[rankLabel] = [];
      }
      groups[rankLabel].push(member);
    });

    Object.keys(groups).forEach(function (rankLabel) {
      var group = document.createElement("section");
      group.className = "clan-profile-member-group";

      var heading = document.createElement("h3");
      heading.className = "clan-profile-member-rank";
      heading.textContent = rankLabel;

      var table = document.createElement("div");
      table.className = "clan-profile-member-table";

      var header = document.createElement("div");
      header.className = "clan-profile-member-row clan-profile-member-row-header";

      ["", "Username", "Joined date"].forEach(function (label) {
        var cell = document.createElement("div");
        cell.className = "clan-profile-member-cell";
        cell.textContent = label;
        header.appendChild(cell);
      });

      table.appendChild(header);

      groups[rankLabel].forEach(function (member) {
        var row = document.createElement("div");
        row.className = "clan-profile-member-row";

        var infoCell = document.createElement("div");
        infoCell.className = "clan-profile-member-card";

        var avatar = document.createElement("img");
        avatar.className = "clan-profile-member-avatar";
        avatar.src = member && member.avatarUrl ? member.avatarUrl : defaultProfileAvatar;
        avatar.alt = (member && member.username ? member.username : "Member") + " avatar";

        var meter = document.createElement("div");
        meter.className = "clan-profile-member-level";

        var fill = document.createElement("div");
        fill.className = "clan-profile-member-level-fill";
        var levelValue = Math.max(1, Number(member && member.level) || 1);
        fill.style.width = Math.max(10, Math.min(100, levelValue)) + "%";

        var score = document.createElement("div");
        score.className = "clan-profile-member-level-score";
        score.textContent = formatInteger(levelValue);

        meter.appendChild(fill);
        meter.appendChild(score);
        infoCell.appendChild(avatar);
        infoCell.appendChild(meter);

        var usernameCell = document.createElement("div");
        usernameCell.className = "clan-profile-member-cell";
        usernameCell.appendChild(createProfileLink(member && member.username ? member.username : "Unknown"));

        var joinedCell = document.createElement("div");
        joinedCell.className = "clan-profile-member-cell clan-profile-member-date";
        joinedCell.textContent = member && member.joinedAt ? formatDate(member.joinedAt) : "-";

        row.appendChild(infoCell);
        row.appendChild(usernameCell);
        row.appendChild(joinedCell);
        table.appendChild(row);
      });

      group.appendChild(heading);
      group.appendChild(table);
      clanProfileMemberList.appendChild(group);
    });
  }

  function populateClanProfile(clan) {
    if (
      !clanProfileName &&
      !clanProfileAbbreviation &&
      !clanProfileCreator &&
      !clanProfileMemberList
    ) {
      return;
    }

    if (!clan || !clan.name) {
      if (clanProfileAvatarImage) {
        clanProfileAvatarImage.src = defaultProfileAvatar;
      }
      if (clanProfileLevelFill) {
        clanProfileLevelFill.style.width = getClanLevelProgressPercent(1, 0, 1000) + "%";
      }
      setText(clanProfileName, "No clan selected");
      setText(clanProfileAbbreviation, "-");
      setText(clanProfileCreator, "-");
      setText(clanProfileRegisteredOn, "-");
      setText(clanProfileBiography, "No clan biography available.");
      setText(clanProfileLevel, "1");
      setText(clanProfileExperiencePoints, "0 xp");
      setText(clanProfileClanExperiencePoints, "0 xp");
      setText(clanProfileLadderRank, "Not Ranked");
      setText(clanProfileWins, "0");
      setText(clanProfileLosses, "0");
      setText(clanProfileWinPercentage, "0.00 %");
      renderClanProfileMembers(null);
      return;
    }

    var ladder = clan.ladder || {};
    if (clanProfileAvatarImage) {
      clanProfileAvatarImage.src = clan.avatarUrl || defaultProfileAvatar;
    }
    if (clanProfileLevelFill) {
      clanProfileLevelFill.style.width = getClanLevelProgressPercent(
        ladder.level || 1,
        ladder.experienceIntoLevel,
        ladder.experienceForNextLevel
      ) + "%";
    }
    setText(clanProfileName, clan.name);
    setText(clanProfileAbbreviation, clan.abbreviation || "-");
    setText(clanProfileCreator, clan.createdBy || "-");
    setText(clanProfileRegisteredOn, clan.createdAt ? formatDate(clan.createdAt) : "-");
    setText(clanProfileBiography, clan.bio || "No clan biography available.");
    setText(clanProfileLevel, formatInteger(ladder.level || 1));
    setText(clanProfileExperiencePoints, formatInteger(ladder.experiencePoints) + " xp");
    setText(clanProfileClanExperiencePoints, formatInteger(ladder.clanExperiencePoints || 0) + " xp");
    setText(clanProfileLadderRank, ladder.ladderRank ? "#" + formatInteger(ladder.ladderRank) : "Not Ranked");
    setText(clanProfileWins, formatInteger(ladder.wins));
    setText(clanProfileLosses, formatInteger(ladder.losses));
    setText(
      clanProfileWinPercentage,
      (Number.isFinite(Number(ladder.winPercentage)) ? Number(ladder.winPercentage).toFixed(2) : "0.00") + " %"
    );
    renderClanProfileMembers(clan);
  }

  async function fetchPublicClanProfile(clanName) {
    try {
      var response = await fetch("/api/clans/" + encodeURIComponent(clanName) + "/profile", {
        credentials: "same-origin",
        cache: "no-store"
      });
      var data = await response.json().catch(function () {
        return {};
      });
      if (!response.ok) {
        return {
          error: data && data.error ? data.error : "Unable to load clan."
        };
      }
      return {
        clan: data && data.clan ? data.clan : null
      };
    } catch (error) {
      return {
        error: "Unable to reach the server."
      };
    }
  }

  function renderClanRecruitmentList(entries) {
    if (!clanRecruitmentList) {
      return;
    }
    clearChildren(clanRecruitmentList);
    var list = Array.isArray(entries) ? entries : [];
    if (!list.length) {
      var empty = document.createElement("div");
      empty.className = "quick-game-empty";
      empty.textContent = "No active invitations.";
      clanRecruitmentList.appendChild(empty);
      return;
    }

    list.forEach(function (entry) {
      var row = document.createElement("div");
      row.className = "quick-game-row";

      var userCell = document.createElement("div");
      userCell.className = "quick-game-matchup";
      var username = entry && entry.username ? String(entry.username) : "Unknown";
      userCell.appendChild(createProfileLink(username));

      var timeCell = document.createElement("div");
      timeCell.className = "quick-game-result";
      timeCell.textContent = formatShortDateTime(entry && entry.invitedAt);

      row.appendChild(userCell);
      row.appendChild(timeCell);
      clanRecruitmentList.appendChild(row);
    });
  }

  async function loadClanRecruitmentList() {
    if (!clanRecruitmentList) {
      return;
    }
    try {
      var response = await fetch("/api/clan/recruitment", {
        credentials: "same-origin"
      });
      var data = await response.json().catch(function () {
        return {};
      });
      if (!response.ok) {
        renderClanRecruitmentList([]);
        setClanRecruitmentStatus(data && data.error ? data.error : "Unable to load invitations.");
        return;
      }
      renderClanRecruitmentList(data && data.invitations ? data.invitations : []);
    } catch (error) {
      renderClanRecruitmentList([]);
      setClanRecruitmentStatus("Unable to reach the server.");
    }
  }

  function renderSidebarBarList(container, entries, labelKey, maxValueOverride) {
    if (!container) {
      return;
    }
    clearChildren(container);
    var list = Array.isArray(entries) ? entries : [];
    list.forEach(function (entry, index) {
      var row = document.createElement("div");
      row.className = "ladder-row";

      var rank = document.createElement("div");
      rank.className = "ladder-rank";
      rank.textContent = formatRankNumber(index);

      var content = document.createElement("div");
      var name = document.createElement("div");
      name.className = "ladder-name";
      var label = entry && entry[labelKey] ? String(entry[labelKey]) : "Unknown";
      if (labelKey === "username") {
        name.appendChild(createProfileLink(label));
      } else if (labelKey === "clanName") {
        name.appendChild(createClanProfileLink(label));
      } else {
        name.textContent = label;
      }

      var bar = document.createElement("div");
      bar.className = "ladder-bar";

      var fill = document.createElement("div");
      fill.className = "ladder-fill";

      var topValue = Number(maxValueOverride);
      if (!Number.isFinite(topValue) || topValue <= 0) {
        topValue = list.length ? Math.max(Number(list[0].value) || 0, 1) : 1;
      }
      var currentValue = Math.max(Number(entry && entry.value) || 0, 0);
      var explicitProgressPercent = Number(entry && entry.progressPercent);
      if (Number.isFinite(explicitProgressPercent)) {
        fill.style.width = Math.max(6, Math.min(100, Math.round(explicitProgressPercent))) + "%";
      } else {
        fill.style.width = Math.max(6, Math.min(100, Math.round((currentValue / topValue) * 100))) + "%";
      }

      var score = document.createElement("div");
      score.className = "ladder-score";
      score.textContent = formatListNumber(currentValue);

      bar.appendChild(fill);
      bar.appendChild(score);
      content.appendChild(name);
      content.appendChild(bar);
      row.appendChild(rank);
      row.appendChild(content);
      container.appendChild(row);
    });
  }

  function renderSidebarStatList(container, entries, formatter, suffix) {
    if (!container) {
      return;
    }
    clearChildren(container);
    (Array.isArray(entries) ? entries : []).forEach(function (entry) {
      var item = document.createElement("li");
      var name = entry && entry.username ? String(entry.username) : "Unknown";
      var valueText = formatter(entry ? entry.value : 0);
      item.appendChild(createProfileLink(name));
      item.appendChild(document.createTextNode(" " + valueText + (suffix ? " " + suffix : "")));
      container.appendChild(item);
    });
  }

  async function loadSidebarLeaderboards() {
    if (
      !sidebarTopPlayerLevels &&
      !sidebarTopClanLevels &&
      !sidebarTopCurrentStreaks &&
      !sidebarTopWins &&
      !sidebarTopHighestStreaks
    ) {
      return;
    }

    try {
      var response = await fetch("/api/leaderboards/sidebar", {
        credentials: "same-origin"
      });
      if (!response.ok) {
        return;
      }
      var data = await response.json().catch(function () {
        return {};
      });
      var boards = data && data.leaderboards ? data.leaderboards : {};
      renderSidebarBarList(sidebarTopPlayerLevels, boards.topPlayerLevels, "username", 50);
      renderSidebarBarList(sidebarTopClanLevels, boards.topClanLevels, "clanName", 50);
      renderSidebarStatList(sidebarTopCurrentStreaks, boards.topCurrentStreaks, formatSignedListNumber, "streak");
      renderSidebarStatList(sidebarTopWins, boards.topWins, formatListNumber, "wins");
      renderSidebarStatList(sidebarTopHighestStreaks, boards.topHighestStreaks, formatSignedListNumber, "streak");
    } catch (error) {}
  }

  function populateProfile(user) {
    if (
      !profileUsername &&
      !profileClanName &&
      !profileLevel &&
      !profileStatus &&
      !changeAvatarCurrentImage &&
      !clanPanelName &&
      !clanPanelRank
    ) {
      return;
    }

    if (!user || !user.username) {
      if (profileAvatarImage) {
        profileAvatarImage.src = defaultProfileAvatar;
      }
      if (changeAvatarCurrentImage) {
        changeAvatarCurrentImage.src = defaultProfileAvatar;
      }
      setText(profileUsername, "Guest");
      setText(profileSiteRank, "Visitor");
      setText(profilePosts, "0");
      setText(profileRegisteredOn, "Not registered");
      setText(profileClanName, "No clan");
      setText(profileClanAbbreviation, "-");
      setText(profileClanRank, "-");
      setText(profileClanJoinedOn, "-");
      applyProfileClanBadge(null);
      setText(profileLevel, "1");
      setProfileLevelMeterProgress(1, 0, 1000);
      setText(profileRank, "Academy Student");
      setText(profileExperiencePoints, "0 xp");
      setText(profileLadderRank, "Unranked");
      setText(profileWins, "0");
      setText(profileLosses, "0");
      setText(profileWinPercentage, "0.00 %");
      setText(profileStreak, "0");
      setText(profileHighestStreak, "0");
      setText(profileHighestLevel, "Level 1");
      setText(profileFamePoints, "0");
      setText(profileLadderGamesLast24, "0");
      if (profileStatus) {
        profileStatus.textContent = "offline";
        profileStatus.className = "status-offline";
      }
      setText(profileCurrentActivity, "Not available");
      setText(profileCurrentPage, "Not available");
      renderLadderGames(null);
      renderQuickGames(null);
      if (clanPanelAvatar) {
        clanPanelAvatar.src = defaultProfileAvatar;
      }
      if (clanAvatarCurrentImage) {
        clanAvatarCurrentImage.src = defaultProfileAvatar;
      }
      setText(clanPanelName, "Clanless");
      setText(clanPanelRank, "None");
      updateClanPanelState(null);
      return;
    }

    var profile = user.profile || {};
    var ladder = profile.ladder || {};
    var clan = profile.clan || null;
    var wins = Number(ladder.wins) || 0;
    var losses = Number(ladder.losses) || 0;
    var totalGames = wins + losses;
    var winPercentage = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(2) : "0.00";

    if (profileAvatarImage) {
      profileAvatarImage.src = profile.avatarUrl || defaultProfileAvatar;
    }
    if (changeAvatarCurrentImage) {
      changeAvatarCurrentImage.src = profile.avatarUrl || defaultProfileAvatar;
    }
    setText(profileUsername, user.username);
    setText(profileSiteRank, formatRole(user.role));
    setText(profilePosts, formatInteger(profile.posts));
    setText(profileRegisteredOn, formatDate(user.createdAt));

    if (clan && clan.name) {
      if (profileClanName) {
        clearChildren(profileClanName);
        profileClanName.appendChild(createClanProfileLink(clan.name));
      }
      setText(profileClanAbbreviation, clan.abbreviation || "-");
      setText(profileClanRank, getClanRankDisplayLabel(clan));
      setText(profileClanJoinedOn, clan.joinedAt ? formatDate(clan.joinedAt) : "-");
      applyProfileClanBadge(clan);
    } else {
      setText(profileClanName, "No clan");
      setText(profileClanAbbreviation, "-");
      setText(profileClanRank, "-");
      setText(profileClanJoinedOn, "-");
      applyProfileClanBadge(null);
    }
    setText(clanPanelName, clan && clan.name ? clan.name : "Clanless");
    setText(clanPanelRank, clan ? getClanRankDisplayLabel(clan) : "None");
    if (clanPanelAvatar) {
      clanPanelAvatar.src = clan && clan.avatarUrl ? clan.avatarUrl : defaultProfileAvatar;
    }
    if (clanAvatarCurrentImage) {
      clanAvatarCurrentImage.src = clan && clan.avatarUrl ? clan.avatarUrl : defaultProfileAvatar;
    }
    updateClanPanelState(clan);

    setText(profileLevel, formatInteger(ladder.level || 1));
    setProfileLevelMeterProgress(
      ladder.level || 1,
      ladder.experienceIntoLevel,
      ladder.experienceForNextLevel
    );
    setText(profileRank, ladder.rank || "Academy Student");
    setText(profileExperiencePoints, formatInteger(ladder.experiencePoints) + " xp");
    setText(profileLadderRank, ladder.ladderRank ? "#" + formatInteger(ladder.ladderRank) : "Unranked");
    setText(profileWins, formatInteger(wins));
    setText(profileLosses, formatInteger(losses));
    setText(profileWinPercentage, winPercentage + " %");
    setText(profileStreak, formatSigned(ladder.streak));
    setText(profileHighestStreak, formatSigned(ladder.highestStreak));
    setText(profileHighestLevel, "Level " + formatInteger(ladder.highestLevel || ladder.level || 1));
    setText(profileFamePoints, formatInteger(ladder.famePoints));
    setText(
      profileLadderGamesLast24,
      formatInteger(
        Number.isFinite(Number(profile.recentLadderGamesCount24Hours))
          ? Number(profile.recentLadderGamesCount24Hours)
          : Array.isArray(profile.recentLadderGames)
            ? profile.recentLadderGames.length
            : 0
      )
    );
    var isOnline = isUserCurrentlyOnline(user);
    if (profileStatus) {
      profileStatus.textContent = isOnline ? "online" : "offline";
      profileStatus.className = isOnline ? "status-online" : "status-offline";
    }
    setText(
      profileCurrentActivity,
      formatDateTime(
        profile.activity && profile.activity.lastOnlineAt
          ? profile.activity.lastOnlineAt
          : user.createdAt
      )
    );
    setText(profileCurrentPage, getProfileCurrentPageLabel(user));
    renderLadderGames(user);
    renderQuickGames(user);
    renderPrivateGames(user);
  }

  async function fetchPublicProfile(username) {
    try {
      var response = await fetch("/api/users/" + encodeURIComponent(username) + "/profile", {
        credentials: "same-origin",
        cache: "no-store"
      });
      var data = await response.json().catch(function () {
        return {};
      });
      if (!response.ok) {
        return {
          error: data && data.error ? data.error : "Unable to load player."
        };
      }
      return {
        user: data && data.user ? data.user : null
      };
    } catch (error) {
      return {
        error: "Unable to reach the server."
      };
    }
  }

  function updateReleasePreview(index, releaseItem, facePicture) {
    var image = releaseFaces[index];
    var label = releaseLabels[index];
    var name = releaseItem && releaseItem.label ? String(releaseItem.label) : "";
    var url = facePicture ? String(facePicture) : "";
    if (label) {
      label.textContent = name || "Latest Character";
    }
    if (!image) {
      return;
    }
    image.alt = name || "Latest character";
    if (url) {
      image.src = url;
      image.style.visibility = "visible";
      return;
    }
    image.removeAttribute("src");
    image.style.visibility = "hidden";
  }

  async function initializeReleaseInputs() {
    var releases = [];
    try {
      var response = await fetch("/api/latest-releases", {
        credentials: "same-origin"
      });
      if (response.ok) {
        var data = await response.json().catch(function () {
          return {};
        });
        releases = Array.isArray(data && data.releases) ? data.releases : [];
      }
    } catch (error) {}

    releaseFaces.forEach(function (_, index) {
      var releaseItem = releases[index] || null;
      var facePicture = releaseItem && releaseItem.facePicture
        ? releaseItem.facePicture
        : "";
      updateReleasePreview(index, releaseItem, facePicture);
    });
  }

  async function fetchSessionUser() {
    try {
      var response = await fetch("/api/me", {
        credentials: "same-origin"
      });
      if (!response.ok) {
        return null;
      }
      var data = await response.json().catch(function () {
        return {};
      });
      return data && data.user && data.user.username ? data.user : null;
    } catch (error) {
      return null;
    }
  }

  function setStatus(message, state) {
    authStatus.textContent = message || "";
    if (state) {
      authStatus.dataset.state = state;
      return;
    }
    delete authStatus.dataset.state;
  }

  function setAccountStatus(message, state) {
    accountStatus.textContent = message || "";
    if (state) {
      accountStatus.dataset.state = state;
      return;
    }
    delete accountStatus.dataset.state;
  }

  function showGuestView() {
    authTitle.textContent = "Login";
    guestAuthView.hidden = false;
    accountPanel.hidden = true;
    accountUsername.textContent = "Player";
    currentSessionUser = null;
    updateClanPanelNotification(null);
    setHiddenState(adminPanelSection, true);
    cacheSessionUser(null);
    setAccountStatus("");
    authForm.reset();
    isRegisterMode = false;
    setText(clanRegisterCreator, "Player");
    updateMode();
  }

  function showAccountView(username) {
    authTitle.textContent = "Account";
    guestAuthView.hidden = true;
    accountPanel.hidden = false;
    accountUsername.textContent = username || "Player";
    setStatus("");
    setAccountStatus("");
    setText(clanRegisterCreator, username || "Player");
    setHiddenState(
      adminPanelSection,
      !(currentSessionUser && String(currentSessionUser.role || "").trim().toLowerCase() === "admin")
    );
  }

  function setCurrentSessionUser(user) {
    currentSessionUser = user && user.username ? user : null;
    updateClanPanelNotification(currentSessionUser);
    if (currentSessionUser) {
      reportCurrentActivity();
    }
  }

  function updateMode() {
    if (isRegisterMode) {
      authTitle.textContent = "Register";
      authDescription.textContent = "Create an account to start playing.";
      authSubmit.textContent = "Register";
      authToggle.textContent = "Already registered? Login";
      passwordInput.autocomplete = "new-password";
      confirmPasswordInput.hidden = false;
      confirmPasswordInput.required = true;
      emailInput.hidden = false;
      emailInput.required = true;
      return;
    }

    authTitle.textContent = "Login";
    authDescription.textContent = "Sign in with your Comic-Arena account.";
    authSubmit.textContent = "Login";
    authToggle.textContent = "Need an account? Register";
    passwordInput.autocomplete = "current-password";
    confirmPasswordInput.hidden = true;
    confirmPasswordInput.required = false;
    confirmPasswordInput.value = "";
    emailInput.hidden = true;
    emailInput.required = false;
    emailInput.value = "";
  }

  function openClanRegisterModal() {
    if (!clanRegisterOverlay) {
      return;
    }
    if (clanRegisterCard && clanRegisterCard.hidden) {
      return;
    }
    clanRegisterOverlay.classList.add("visible");
    setText(clanRegisterDate, formatCurrentLongDate());
    setClanRegisterStatus("");
  }

  function closeClanRegisterModal() {
    if (!clanRegisterOverlay) {
      return;
    }
    clanRegisterOverlay.classList.remove("visible");
    setClanRegisterStatus("");
  }

  function openLeaveClanModal() {
    if (!leaveClanOverlay) {
      return;
    }
    if (leaveClanCard && leaveClanCard.hidden) {
      return;
    }
    leaveClanOverlay.classList.add("visible");
    setLeaveClanStatus("");
  }

  function closeLeaveClanModal() {
    if (!leaveClanOverlay) {
      return;
    }
    leaveClanOverlay.classList.remove("visible");
    setLeaveClanStatus("");
  }

  function openClanRecruitmentModal() {
    if (!clanRecruitmentOverlay) {
      return;
    }
    if (clanRecruitmentCard && clanRecruitmentCard.hidden) {
      return;
    }
    clanRecruitmentOverlay.classList.add("visible");
    setClanRecruitmentStatus("");
    loadClanRecruitmentList();
  }

  function closeClanRecruitmentModal() {
    if (!clanRecruitmentOverlay) {
      return;
    }
    clanRecruitmentOverlay.classList.remove("visible");
    setClanRecruitmentStatus("");
  }

  function openClanInfoModal() {
    if (!clanInfoOverlay) {
      return;
    }
    if (clanStylesCard && clanStylesCard.hidden) {
      return;
    }
    var clan = currentSessionUser && currentSessionUser.profile ? currentSessionUser.profile.clan : null;
    if (clanInfoNameInput) {
      clanInfoNameInput.value = clan && clan.name ? clan.name : "";
    }
    if (clanInfoAbbreviationInput) {
      clanInfoAbbreviationInput.value = clan && clan.abbreviation ? clan.abbreviation : "";
    }
    if (clanInfoBioInput) {
      clanInfoBioInput.value = clan && clan.bio ? clan.bio : "";
    }
    clanInfoOverlay.classList.add("visible");
    setClanInfoStatus("");
  }

  function closeClanInfoModal() {
    if (!clanInfoOverlay) {
      return;
    }
    clanInfoOverlay.classList.remove("visible");
    setClanInfoStatus("");
  }

  function openClanAvatarModal() {
    if (!clanAvatarOverlay) {
      return;
    }
    if (clanAvatarCard && clanAvatarCard.hidden) {
      return;
    }
    var clan = currentSessionUser && currentSessionUser.profile ? currentSessionUser.profile.clan : null;
    var avatarUrl = clan && clan.avatarUrl ? clan.avatarUrl : "";
    if (clanAvatarCurrentImage) {
      clanAvatarCurrentImage.src = avatarUrl || defaultProfileAvatar;
    }
    if (clanAvatarUrlInput) {
      clanAvatarUrlInput.value = avatarUrl;
    }
    clanAvatarOverlay.classList.add("visible");
    setClanAvatarStatus("");
  }

  function closeClanAvatarModal() {
    if (!clanAvatarOverlay) {
      return;
    }
    clanAvatarOverlay.classList.remove("visible");
    setClanAvatarStatus("");
  }

  function openClanInvitationsModal() {
    if (!clanInvitationsOverlay) {
      return;
    }
    clanInvitationsOverlay.classList.add("visible");
    setClanInvitationsStatus("");
    markClanInvitationsViewed(currentSessionUser);
    loadClanInvitations();
  }

  function closeClanInvitationsModal() {
    if (!clanInvitationsOverlay) {
      return;
    }
    clanInvitationsOverlay.classList.remove("visible");
    setClanInvitationsStatus("");
  }

  function openClanManagementModal() {
    if (!clanManagementOverlay) {
      return;
    }
    if (clanManagementCard && clanManagementCard.hidden) {
      return;
    }
    if (clanRankTierSelect) {
      clanRankTierSelect.value = "clanLeader";
    }
    updateClanRankSelectLabels();
    updateExistingCustomRankSelect();
    clanManagementOverlay.classList.add("visible");
    setClanManagementStatus("");
    loadClanMembers();
  }

  function closeClanManagementModal() {
    if (!clanManagementOverlay) {
      return;
    }
    clanManagementOverlay.classList.remove("visible");
    setClanManagementStatus("");
  }

  authToggle.addEventListener("click", function () {
    isRegisterMode = !isRegisterMode;
    setStatus("");
    authForm.reset();
    updateMode();
  });

  authForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    setStatus("");

    var username = String(usernameInput.value || "").trim();
    var password = String(passwordInput.value || "");

    if (!username || !password) {
      setStatus("Username and password are required.", "error");
      return;
    }

    var endpoint = "/api/login";
    var payload = {
      username: username,
      password: password
    };

    if (isRegisterMode) {
      var confirmPassword = String(confirmPasswordInput.value || "");
      var email = String(emailInput.value || "").trim();

      if (!email) {
        setStatus("Email is required.", "error");
        return;
      }

      if (password !== confirmPassword) {
        setStatus("Passwords do not match.", "error");
        return;
      }

      endpoint = "/api/register";
      payload.confirmPassword = confirmPassword;
      payload.email = email;
    }

    authSubmit.disabled = true;
    authToggle.disabled = true;

    try {
      var response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "same-origin",
        body: JSON.stringify(payload)
      });
      var data = await response.json().catch(function () {
        return {};
      });

      if (!response.ok) {
        setStatus(data.error || "Authentication failed.", "error");
        return;
      }

      var responseUser = data && data.user && data.user.username ? data.user : null;
      var usernameLabel = responseUser ? responseUser.username : username;
      setCurrentSessionUser(responseUser);
      showAccountView(usernameLabel);
      populateProfile(responseUser);
    } catch (error) {
      setStatus("Unable to reach the server.", "error");
    } finally {
      authSubmit.disabled = false;
      authToggle.disabled = false;
    }
  });

  logoutButton.addEventListener("click", async function () {
    logoutButton.disabled = true;
    setAccountStatus("");

    try {
      var response = await fetch("/api/logout", {
        method: "POST",
        credentials: "same-origin"
      });

      if (!response.ok) {
        setAccountStatus("Logout failed.", "error");
        return;
      }

      showGuestView();
      setStatus("Logged out.", "success");
    } catch (error) {
      setAccountStatus("Unable to reach the server.", "error");
    } finally {
      logoutButton.disabled = false;
    }
  });

  if (viewProfileButton) {
    viewProfileButton.addEventListener("click", function () {
      window.location.href = "profile.html";
    });
  }

  if (changeAvatarButton) {
    changeAvatarButton.addEventListener("click", function () {
      window.location.href = "changeavatar.html";
    });
  }

  if (clanPanelButton) {
    clanPanelButton.addEventListener("click", function () {
      window.location.href = "clan%20panel.html";
    });
  }

  if (changeBackgroundsButton) {
    changeBackgroundsButton.addEventListener("click", function () {
      window.location.href = "changebackgrounds.html";
    });
  }

  if (resetAccountButton) {
    resetAccountButton.addEventListener("click", function () {
      window.location.href = "resetaccount.html";
    });
  }

  if (resetWinratesButton) {
    resetWinratesButton.addEventListener("click", function () {
      resetAdminWinrates();
    });
  }

  if (playerAccountSave) {
    playerAccountSave.addEventListener("click", function () {
      saveAdminUser();
    });
  }

  if (playerAccountClose) {
    playerAccountClose.addEventListener("click", function () {
      closePlayerAccountModal();
    });
  }

  if (playerAccountOverlay) {
    playerAccountOverlay.addEventListener("click", function (event) {
      if (event.target === playerAccountOverlay) {
        closePlayerAccountModal();
      }
    });
  }

  if (playerAccountsSearch) {
    playerAccountsSearch.addEventListener("input", function () {
      filterAndRenderPlayerAccounts();
    });
  }

  if (characterEditorSave) {
    characterEditorSave.addEventListener("click", function () {
      saveAdminCharacter();
    });
  }

  if (characterEditorExport) {
    characterEditorExport.addEventListener("click", function () {
      exportAdminCharacters();
    });
  }

  if (characterEditorClose) {
    characterEditorClose.addEventListener("click", function () {
      closeCharacterEditorModal();
    });
  }

  if (characterEditorOverlay) {
    characterEditorOverlay.addEventListener("click", function (event) {
      if (event.target === characterEditorOverlay) {
        closeCharacterEditorModal();
      }
    });
  }

  if (characterEditorSearch) {
    characterEditorSearch.addEventListener("input", function () {
      filterAndRenderAdminCharacters();
    });
  }

  if (newsAdminForm) {
    newsAdminForm.addEventListener("submit", function (event) {
      event.preventDefault();
      saveNewsPost();
    });
  }

  if (newsResetButton) {
    newsResetButton.addEventListener("click", function () {
      resetNewsEditor();
    });
  }

  if (latestReleasesForm) {
    latestReleasesForm.addEventListener("submit", function (event) {
      event.preventDefault();
      saveAdminLatestReleases();
    });
  }

  if (latestReleasesResetButton) {
    latestReleasesResetButton.addEventListener("click", function () {
      loadAdminLatestReleases();
    });
  }

  if (maintenanceModeToggleButton) {
    maintenanceModeToggleButton.addEventListener("click", function () {
      toggleMaintenanceMode();
    });
  }

  if (newsPrevButton) {
    newsPrevButton.addEventListener("click", function () {
      showPreviousNewsPost();
    });
  }

  if (newsNextButton) {
    newsNextButton.addEventListener("click", function () {
      showNextNewsPost();
    });
  }

  if (clanRegisterOpen) {
    clanRegisterOpen.addEventListener("click", function () {
      openClanRegisterModal();
    });
  }

  if (clanRegisterCancel) {
    clanRegisterCancel.addEventListener("click", function () {
      closeClanRegisterModal();
    });
  }

  if (clanRegisterConfirm) {
    clanRegisterConfirm.addEventListener("click", async function () {
      var clanName = String(clanRegisterNameInput && clanRegisterNameInput.value ? clanRegisterNameInput.value : "").trim();
      var clanAbbreviation = String(clanRegisterAbbreviationInput && clanRegisterAbbreviationInput.value ? clanRegisterAbbreviationInput.value : "").trim();
      var clanBio = String(clanRegisterBioInput && clanRegisterBioInput.value ? clanRegisterBioInput.value : "").trim();

      if (!clanName || !clanAbbreviation) {
        setClanRegisterStatus("Clan name and abbreviation are required.");
        return;
      }

      clanRegisterConfirm.disabled = true;
      setClanRegisterStatus("Creating clan...");

      try {
        var response = await fetch("/api/clan/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "same-origin",
          body: JSON.stringify({
            name: clanName,
            abbreviation: clanAbbreviation,
            bio: clanBio
          })
        });
        var data = await response.json().catch(function () {
          return {};
        });
        if (!response.ok) {
          setClanRegisterStatus(data && data.error ? data.error : "Unable to create clan.");
          return;
        }
        var updatedUser = data && data.user && data.user.username ? data.user : null;
        if (updatedUser) {
          setCurrentSessionUser(updatedUser);
          cacheSessionUser(updatedUser);
          showAccountView(updatedUser.username);
          populateProfile(updatedUser);
        }
        closeClanRegisterModal();
      } catch (error) {
        setClanRegisterStatus("Unable to reach the server.");
      } finally {
        clanRegisterConfirm.disabled = false;
      }
    });
  }

  if (clanRegisterOverlay) {
    clanRegisterOverlay.addEventListener("click", function (event) {
      if (event.target === clanRegisterOverlay) {
        closeClanRegisterModal();
      }
    });
  }

  if (leaveClanOpen) {
    leaveClanOpen.addEventListener("click", function () {
      openLeaveClanModal();
    });
  }

  if (leaveClanCancel) {
    leaveClanCancel.addEventListener("click", function () {
      closeLeaveClanModal();
    });
  }

  if (leaveClanConfirm) {
    leaveClanConfirm.addEventListener("click", async function () {
      leaveClanConfirm.disabled = true;
      if (leaveClanCancel) {
        leaveClanCancel.disabled = true;
      }
      setLeaveClanStatus("Leaving clan...");

      try {
        var response = await fetch("/api/clan/leave", {
          method: "POST",
          credentials: "same-origin"
        });
        var data = await response.json().catch(function () {
          return {};
        });
        if (!response.ok) {
          setLeaveClanStatus(data && data.error ? data.error : "Unable to leave clan.");
          return;
        }
        var updatedUser = data && data.user && data.user.username ? data.user : null;
        if (updatedUser) {
          setCurrentSessionUser(updatedUser);
          cacheSessionUser(updatedUser);
          showAccountView(updatedUser.username);
          populateProfile(updatedUser);
        }
        closeLeaveClanModal();
      } catch (error) {
        setLeaveClanStatus("Unable to reach the server.");
      } finally {
        leaveClanConfirm.disabled = false;
        if (leaveClanCancel) {
          leaveClanCancel.disabled = false;
        }
      }
    });
  }

  if (leaveClanOverlay) {
    leaveClanOverlay.addEventListener("click", function (event) {
      if (event.target === leaveClanOverlay) {
        closeLeaveClanModal();
      }
    });
  }

  if (clanRecruitmentOpen) {
    clanRecruitmentOpen.addEventListener("click", function () {
      openClanRecruitmentModal();
    });
  }

  if (clanInfoOpen) {
    clanInfoOpen.addEventListener("click", function () {
      openClanInfoModal();
    });
  }

  if (clanAvatarOpen) {
    clanAvatarOpen.addEventListener("click", function () {
      openClanAvatarModal();
    });
  }

  if (clanInvitationsOpen) {
    clanInvitationsOpen.addEventListener("click", function () {
      openClanInvitationsModal();
    });
  }

  if (clanInvitationsClose) {
    clanInvitationsClose.addEventListener("click", function () {
      closeClanInvitationsModal();
    });
  }

  if (clanInvitationsOverlay) {
    clanInvitationsOverlay.addEventListener("click", function (event) {
      if (event.target === clanInvitationsOverlay) {
        closeClanInvitationsModal();
      }
    });
  }

  if (clanAvatarCancel) {
    clanAvatarCancel.addEventListener("click", function () {
      closeClanAvatarModal();
    });
  }

  if (clanAvatarOverlay) {
    clanAvatarOverlay.addEventListener("click", function (event) {
      if (event.target === clanAvatarOverlay) {
        closeClanAvatarModal();
      }
    });
  }

  if (clanAvatarSave) {
    clanAvatarSave.addEventListener("click", async function () {
      var avatarUrl = String(clanAvatarUrlInput && clanAvatarUrlInput.value ? clanAvatarUrlInput.value : "").trim();
      if (!avatarUrl) {
        setClanAvatarStatus("A direct image URL is required.", "error");
        return;
      }

      clanAvatarSave.disabled = true;
      if (clanAvatarCancel) {
        clanAvatarCancel.disabled = true;
      }
      setClanAvatarStatus("Saving clan avatar...", "");

      try {
        var response = await fetch("/api/clan/avatar", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "same-origin",
          body: JSON.stringify({
            avatarUrl: avatarUrl
          })
        });
        var data = await response.json().catch(function () {
          return {};
        });
        if (!response.ok) {
          setClanAvatarStatus(data && data.error ? data.error : "Unable to update clan avatar.", "error");
          return;
        }
        var updatedUser = data && data.user && data.user.username ? data.user : null;
        if (updatedUser) {
          setCurrentSessionUser(updatedUser);
          cacheSessionUser(updatedUser);
          showAccountView(updatedUser.username);
          populateProfile(updatedUser);
          if (clanAvatarUrlInput) {
            clanAvatarUrlInput.value =
              updatedUser.profile && updatedUser.profile.clan && updatedUser.profile.clan.avatarUrl
                ? updatedUser.profile.clan.avatarUrl
                : avatarUrl;
          }
        }
        setClanAvatarStatus("Clan avatar updated.", "success");
      } catch (error) {
        setClanAvatarStatus("Unable to reach the server.", "error");
      } finally {
        clanAvatarSave.disabled = false;
        if (clanAvatarCancel) {
          clanAvatarCancel.disabled = false;
        }
      }
    });
  }

  if (clanManagementOpen) {
    clanManagementOpen.addEventListener("click", function () {
      openClanManagementModal();
    });
  }

  if (clanManagementCancel) {
    clanManagementCancel.addEventListener("click", function () {
      closeClanManagementModal();
    });
  }

  if (clanManagementOverlay) {
    clanManagementOverlay.addEventListener("click", function (event) {
      if (event.target === clanManagementOverlay) {
        closeClanManagementModal();
      }
    });
  }

  if (clanRankTierSelect) {
    clanRankTierSelect.addEventListener("change", function () {
      updateExistingCustomRankSelect();
    });
  }

  if (clanRankExistingSelect) {
    clanRankExistingSelect.addEventListener("change", function () {
      syncSelectedCustomRankName();
    });
  }

  if (clanRankCustomSave) {
    clanRankCustomSave.addEventListener("click", async function () {
      var selectedKey = String(clanRankTierSelect && clanRankTierSelect.value ? clanRankTierSelect.value : "").trim();
      var customName = String(clanRankCustomNameInput && clanRankCustomNameInput.value ? clanRankCustomNameInput.value : "").trim();
      var previousName = String(clanRankExistingSelect && clanRankExistingSelect.value ? clanRankExistingSelect.value : "").trim();
      if (!selectedKey || !customName) {
        setClanManagementStatus("Choose a rank tier and enter a custom name.");
        return;
      }

      clanRankCustomSave.disabled = true;
      if (clanManagementCancel) {
        clanManagementCancel.disabled = true;
      }
      setClanManagementStatus("Saving rank names...");

      try {
        var response = await fetch("/api/clan/ranks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "same-origin",
          body: JSON.stringify({
            rankKey: selectedKey,
            name: customName,
            previousName: previousName
          })
        });
        var data = await response.json().catch(function () {
          return {};
        });
        if (!response.ok) {
          setClanManagementStatus(data && data.error ? data.error : "Unable to update clan ranks.");
          return;
        }
        var updatedUser = data && data.user && data.user.username ? data.user : null;
        if (updatedUser) {
          setCurrentSessionUser(updatedUser);
          cacheSessionUser(updatedUser);
          showAccountView(updatedUser.username);
          populateProfile(updatedUser);
        }
        updateClanRankSelectLabels();
        updateExistingCustomRankSelect();
        setClanManagementStatus("Custom rank name saved.");
      } catch (error) {
        setClanManagementStatus("Unable to reach the server.");
      } finally {
        clanRankCustomSave.disabled = false;
        if (clanManagementCancel) {
          clanManagementCancel.disabled = false;
        }
      }
    });
  }

  if (clanRankCustomDelete) {
    clanRankCustomDelete.addEventListener("click", async function () {
      var selectedKey = String(clanRankTierSelect && clanRankTierSelect.value ? clanRankTierSelect.value : "").trim();
      var existingName = String(clanRankExistingSelect && clanRankExistingSelect.value ? clanRankExistingSelect.value : "").trim();
      if (!selectedKey || !existingName) {
        setClanManagementStatus("Choose an existing custom rank to delete.");
        return;
      }

      clanRankCustomDelete.disabled = true;
      if (clanRankCustomSave) {
        clanRankCustomSave.disabled = true;
      }
      if (clanManagementCancel) {
        clanManagementCancel.disabled = true;
      }
      setClanManagementStatus("Deleting custom rank...");

      try {
        var response = await fetch("/api/clan/ranks/delete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "same-origin",
          body: JSON.stringify({
            rankKey: selectedKey,
            name: existingName
          })
        });
        var data = await response.json().catch(function () {
          return {};
        });
        if (!response.ok) {
          setClanManagementStatus(data && data.error ? data.error : "Unable to delete custom rank.");
          return;
        }
        var updatedUser = data && data.user && data.user.username ? data.user : null;
        if (updatedUser) {
          setCurrentSessionUser(updatedUser);
          cacheSessionUser(updatedUser);
          showAccountView(updatedUser.username);
          populateProfile(updatedUser);
        }
        updateClanRankSelectLabels();
        updateExistingCustomRankSelect();
        await loadClanMembers();
        setClanManagementStatus("Custom rank deleted.");
      } catch (error) {
        setClanManagementStatus("Unable to reach the server.");
      } finally {
        clanRankCustomDelete.disabled = false;
        if (clanRankCustomSave) {
          clanRankCustomSave.disabled = false;
        }
        if (clanManagementCancel) {
          clanManagementCancel.disabled = false;
        }
      }
    });
  }

  if (clanMemberRankAssign) {
    clanMemberRankAssign.addEventListener("click", async function () {
      var username = String(clanMemberSelect && clanMemberSelect.value ? clanMemberSelect.value : "").trim();
      var selection = String(clanMemberRankSelect && clanMemberRankSelect.value ? clanMemberRankSelect.value : "").trim();
      var selectionParts = selection.split("|");
      var rankKey = selectionParts[0] || "";
      var customRankName = selectionParts[1] ? decodeURIComponent(selectionParts[1]) : "";

      if (!username || !rankKey) {
        setClanManagementStatus("Choose a member and a rank tier.");
        return;
      }

      clanMemberRankAssign.disabled = true;
      if (clanRankCustomSave) {
        clanRankCustomSave.disabled = true;
      }
      if (clanRankCustomDelete) {
        clanRankCustomDelete.disabled = true;
      }
      if (clanManagementCancel) {
        clanManagementCancel.disabled = true;
      }
      setClanManagementStatus("Assigning rank...");

      try {
        var response = await fetch("/api/clan/member-rank", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "same-origin",
          body: JSON.stringify({
            username: username,
            rankKey: rankKey,
            customRankName: customRankName
          })
        });
        var data = await response.json().catch(function () {
          return {};
        });
        if (!response.ok) {
          setClanManagementStatus(data && data.error ? data.error : "Unable to update member rank.");
          return;
        }
        var updatedUser = data && data.user && data.user.username ? data.user : null;
        if (updatedUser) {
          setCurrentSessionUser(updatedUser);
          cacheSessionUser(updatedUser);
          showAccountView(updatedUser.username);
          populateProfile(updatedUser);
        }
        updateClanRankSelectLabels();
        await loadClanMembers();
        setClanManagementStatus("Member rank updated.");
      } catch (error) {
        setClanManagementStatus("Unable to reach the server.");
      } finally {
        clanMemberRankAssign.disabled = false;
        if (clanRankCustomSave) {
          clanRankCustomSave.disabled = false;
        }
        if (clanRankCustomDelete) {
          clanRankCustomDelete.disabled = false;
        }
        if (clanManagementCancel) {
          clanManagementCancel.disabled = false;
        }
      }
    });
  }

  if (clanInfoCancel) {
    clanInfoCancel.addEventListener("click", function () {
      closeClanInfoModal();
    });
  }

  if (clanInfoOverlay) {
    clanInfoOverlay.addEventListener("click", function (event) {
      if (event.target === clanInfoOverlay) {
        closeClanInfoModal();
      }
    });
  }

  if (clanInfoSave) {
    clanInfoSave.addEventListener("click", async function () {
      var clanName = String(clanInfoNameInput && clanInfoNameInput.value ? clanInfoNameInput.value : "").trim();
      var clanAbbreviation = String(clanInfoAbbreviationInput && clanInfoAbbreviationInput.value ? clanInfoAbbreviationInput.value : "").trim();
      var clanBio = String(clanInfoBioInput && clanInfoBioInput.value ? clanInfoBioInput.value : "").trim();

      if (!clanName || !clanAbbreviation) {
        setClanInfoStatus("Clan name and abbreviation are required.");
        return;
      }

      clanInfoSave.disabled = true;
      if (clanInfoCancel) {
        clanInfoCancel.disabled = true;
      }
      setClanInfoStatus("Saving clan info...");

      try {
        var response = await fetch("/api/clan/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "same-origin",
          body: JSON.stringify({
            name: clanName,
            abbreviation: clanAbbreviation,
            bio: clanBio
          })
        });
        var data = await response.json().catch(function () {
          return {};
        });
        if (!response.ok) {
          setClanInfoStatus(data && data.error ? data.error : "Unable to update clan.");
          return;
        }
        var updatedUser = data && data.user && data.user.username ? data.user : null;
        if (updatedUser) {
          setCurrentSessionUser(updatedUser);
          cacheSessionUser(updatedUser);
          showAccountView(updatedUser.username);
          populateProfile(updatedUser);
        }
        closeClanInfoModal();
      } catch (error) {
        setClanInfoStatus("Unable to reach the server.");
      } finally {
        clanInfoSave.disabled = false;
        if (clanInfoCancel) {
          clanInfoCancel.disabled = false;
        }
      }
    });
  }

  if (clanRecruitmentCloseButton) {
    clanRecruitmentCloseButton.addEventListener("click", function () {
      closeClanRecruitmentModal();
    });
  }

  if (clanRecruitmentOverlay) {
    clanRecruitmentOverlay.addEventListener("click", function (event) {
      if (event.target === clanRecruitmentOverlay) {
        closeClanRecruitmentModal();
      }
    });
  }

  if (clanRecruitmentInviteButton) {
    clanRecruitmentInviteButton.addEventListener("click", async function () {
      var username = String(clanRecruitmentUsernameInput && clanRecruitmentUsernameInput.value ? clanRecruitmentUsernameInput.value : "").trim();
      if (!username) {
        setClanRecruitmentStatus("Enter a player username.");
        return;
      }

      clanRecruitmentInviteButton.disabled = true;
      if (clanRecruitmentRetractButton) {
        clanRecruitmentRetractButton.disabled = true;
      }
      setClanRecruitmentStatus("Sending invitation...");

      try {
        var response = await fetch("/api/clan/invite", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "same-origin",
          body: JSON.stringify({ username: username })
        });
        var data = await response.json().catch(function () {
          return {};
        });
        if (!response.ok) {
          setClanRecruitmentStatus(data && data.error ? data.error : "Unable to send invitation.");
          return;
        }
        setClanRecruitmentStatus("Invitation sent.");
        await loadClanRecruitmentList();
      } catch (error) {
        setClanRecruitmentStatus("Unable to reach the server.");
      } finally {
        clanRecruitmentInviteButton.disabled = false;
        if (clanRecruitmentRetractButton) {
          clanRecruitmentRetractButton.disabled = false;
        }
      }
    });
  }

  if (clanRecruitmentRetractButton) {
    clanRecruitmentRetractButton.addEventListener("click", async function () {
      var username = String(clanRecruitmentUsernameInput && clanRecruitmentUsernameInput.value ? clanRecruitmentUsernameInput.value : "").trim();
      if (!username) {
        setClanRecruitmentStatus("Enter a player username.");
        return;
      }

      clanRecruitmentRetractButton.disabled = true;
      if (clanRecruitmentInviteButton) {
        clanRecruitmentInviteButton.disabled = true;
      }
      setClanRecruitmentStatus("Retracting invitation...");

      try {
        var response = await fetch("/api/clan/invite/retract", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "same-origin",
          body: JSON.stringify({ username: username })
        });
        var data = await response.json().catch(function () {
          return {};
        });
        if (!response.ok) {
          setClanRecruitmentStatus(data && data.error ? data.error : "Unable to retract invitation.");
          return;
        }
        setClanRecruitmentStatus("Invitation retracted.");
        await loadClanRecruitmentList();
      } catch (error) {
        setClanRecruitmentStatus("Unable to reach the server.");
      } finally {
        clanRecruitmentRetractButton.disabled = false;
        if (clanRecruitmentInviteButton) {
          clanRecruitmentInviteButton.disabled = false;
        }
      }
    });
  }

  if (profileSearchInput) {
    profileSearchInput.addEventListener("input", function () {
      var sanitized = sanitizeUsernameInput(profileSearchInput.value);
      if (sanitized !== profileSearchInput.value) {
        profileSearchInput.value = sanitized;
      }
    });
  }

  if (profileSearchForm) {
    profileSearchForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      var username = sanitizeUsernameInput(profileSearchInput ? profileSearchInput.value : "");
      if (profileSearchInput) {
        profileSearchInput.value = username;
      }
      if (!username) {
        setProfileSearchStatus("Enter a valid username.", "error");
        return;
      }

      setProfileSearchStatus("Searching...", "");
      var result = await fetchPublicProfile(username);
      if (result.error) {
        setProfileSearchStatus(result.error, "error");
        return;
      }

      populateProfile(result.user);
      setProfileSearchStatus("Loaded " + username + ".", "success");
    });
  }

  if (changeAvatarForm) {
    changeAvatarForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      var avatarUrl = String(changeAvatarUrlInput && changeAvatarUrlInput.value ? changeAvatarUrlInput.value : "").trim();
      if (!avatarUrl) {
        setChangeAvatarStatus("A direct image URL is required.", "error");
        return;
      }

      setChangeAvatarStatus("Saving avatar...", "");
      if (changeAvatarSubmit) {
        changeAvatarSubmit.disabled = true;
      }

      try {
        var response = await fetch("/api/profile/avatar", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "same-origin",
          body: JSON.stringify({
            avatarUrl: avatarUrl
          })
        });
        var data = await response.json().catch(function () {
          return {};
        });
        if (!response.ok) {
          setChangeAvatarStatus(data && data.error ? data.error : "Unable to update avatar.", "error");
          return;
        }
        var updatedUser = data && data.user && data.user.username ? data.user : null;
        if (updatedUser) {
          setCurrentSessionUser(updatedUser);
          cacheSessionUser(updatedUser);
          populateProfile(updatedUser);
          if (changeAvatarUrlInput) {
            changeAvatarUrlInput.value = updatedUser.profile && updatedUser.profile.avatarUrl
              ? updatedUser.profile.avatarUrl
              : avatarUrl;
          }
        }
        setChangeAvatarStatus("Avatar updated.", "success");
      } catch (error) {
        setChangeAvatarStatus("Unable to reach the server.", "error");
      } finally {
        if (changeAvatarSubmit) {
          changeAvatarSubmit.disabled = false;
        }
      }
    });
  }

  if (changeBackgroundsForm) {
    changeBackgroundsForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      var selectionUrl = String(selectionBackgroundUrlInput && selectionBackgroundUrlInput.value ? selectionBackgroundUrlInput.value : "").trim();
      var ingameUrl = String(ingameBackgroundUrlInput && ingameBackgroundUrlInput.value ? ingameBackgroundUrlInput.value : "").trim();

      setChangeBackgroundsStatus("Saving backgrounds...", "");
      if (changeBackgroundsSubmit) {
        changeBackgroundsSubmit.disabled = true;
      }

      try {
        var response = await fetch("/api/profile/backgrounds", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "same-origin",
          body: JSON.stringify({
            selectionUrl: selectionUrl,
            ingameUrl: ingameUrl
          })
        });
        var data = await response.json().catch(function () {
          return {};
        });
        if (!response.ok) {
          setChangeBackgroundsStatus(data && data.error ? data.error : "Unable to update backgrounds.", "error");
          return;
        }
        var updatedUser = data && data.user && data.user.username ? data.user : null;
        if (updatedUser) {
          setCurrentSessionUser(updatedUser);
          cacheSessionUser(updatedUser);
          populateProfile(updatedUser);
          if (selectionBackgroundUrlInput) {
            selectionBackgroundUrlInput.value = updatedUser.profile && updatedUser.profile.backgrounds
              ? updatedUser.profile.backgrounds.selectionUrl || ""
              : "";
          }
          if (ingameBackgroundUrlInput) {
            ingameBackgroundUrlInput.value = updatedUser.profile && updatedUser.profile.backgrounds
              ? updatedUser.profile.backgrounds.ingameUrl || ""
              : "";
          }
        }
        setChangeBackgroundsStatus("Backgrounds updated.", "success");
      } catch (error) {
        setChangeBackgroundsStatus("Unable to reach the server.", "error");
      } finally {
        if (changeBackgroundsSubmit) {
          changeBackgroundsSubmit.disabled = false;
        }
      }
    });
  }

  if (resetAccountTrigger) {
    resetAccountTrigger.addEventListener("click", function () {
      if (resetAccountConfirm) {
        resetAccountConfirm.classList.add("visible");
      }
      setResetAccountStatus("");
    });
  }

  if (resetAccountCancelButton) {
    resetAccountCancelButton.addEventListener("click", function () {
      if (resetAccountConfirm) {
        resetAccountConfirm.classList.remove("visible");
      }
      setResetAccountStatus("");
    });
  }

  if (resetAccountConfirmButton) {
    resetAccountConfirmButton.addEventListener("click", async function () {
      setResetAccountStatus("Resetting account...", "");
      resetAccountConfirmButton.disabled = true;
      if (resetAccountCancelButton) {
        resetAccountCancelButton.disabled = true;
      }

      try {
        var response = await fetch("/api/profile/reset-account", {
          method: "POST",
          credentials: "same-origin"
        });
        var data = await response.json().catch(function () {
          return {};
        });
        if (!response.ok) {
          setResetAccountStatus(data && data.error ? data.error : "Unable to reset account.", "error");
          return;
        }
        var updatedUser = data && data.user && data.user.username ? data.user : null;
        if (updatedUser) {
          setCurrentSessionUser(updatedUser);
          cacheSessionUser(updatedUser);
          populateProfile(updatedUser);
        }
        if (resetAccountConfirm) {
          resetAccountConfirm.classList.remove("visible");
        }
        setResetAccountStatus("Account fields reset.", "success");
      } catch (error) {
        setResetAccountStatus("Unable to reach the server.", "error");
      } finally {
        resetAccountConfirmButton.disabled = false;
        if (resetAccountCancelButton) {
          resetAccountCancelButton.disabled = false;
        }
      }
    });
  }

  if (playNowButton) {
    playNowButton.addEventListener("click", function () {
      var destination = accountPanel.hidden ? "selection-login.html" : "selection.html";
      var targetInnerWidth = 760;
      var targetInnerHeight = 580;
      var chromeWidth = Math.max(0, window.outerWidth - window.innerWidth);
      var chromeHeight = Math.max(0, window.outerHeight - window.innerHeight);
      var popupWidth = targetInnerWidth + chromeWidth;
      var popupHeight = targetInnerHeight + chromeHeight;
      var left = Math.max(0, Math.round((window.screen.width - popupWidth) / 2));
      var top = Math.max(0, Math.round((window.screen.height - popupHeight) / 2));
      var features = [
        "width=" + popupWidth,
        "height=" + popupHeight,
        "left=" + left,
        "top=" + top,
        "resizable=yes",
        "scrollbars=yes"
      ].join(",");
      var popup = window.open(destination, "narutoArenaPlayNow", features);
      if (popup) {
        try {
          popup.resizeTo(popupWidth, popupHeight);
          popup.moveTo(left, top);
        } catch (error) {}
        popup.focus();
        return;
      }
      window.location.href = destination;
    });
  }

  updateMode();
  initializeReleaseInputs();
  loadSidebarLeaderboards();
  loadAdminWinrates();
  loadAdminUsers();
  loadAdminCharacters();
  loadPublicNews();
  loadAdminNewsPosts();
  loadCharacterCatalog();
  loadAdminLatestReleases();
  loadMaintenanceMode();

  fetchSessionUser().then(function (user) {
    var isAdminOnlyPage = /(winrates|playeraccounts|newspost|charactereditor|editmission)\.html$/i.test(window.location.pathname || "");
    if (isAdminOnlyPage && !(user && String(user.role || "").trim().toLowerCase() === "admin")) {
      window.location.replace("index.html");
      return;
    }

    var safeRequestedClanName = sanitizeClanRouteName(requestedClanName);
    if (clanProfileName || clanProfileMemberList) {
      if (user && user.username) {
        setCurrentSessionUser(user);
        showAccountView(user.username);
        cacheSessionUser(user);
      } else {
        showGuestView();
      }

      var clanNameToLoad = safeRequestedClanName;
      if (!clanNameToLoad && user && user.profile && user.profile.clan && user.profile.clan.name) {
        clanNameToLoad = sanitizeClanRouteName(user.profile.clan.name);
      }

      if (!clanNameToLoad) {
        populateClanProfile(null);
        setClanProfileStatus("No clan selected.", "error");
        return;
      }

      fetchPublicClanProfile(clanNameToLoad).then(function (result) {
        if (result && result.clan && result.clan.name) {
          populateClanProfile(result.clan);
          setClanProfileStatus("");
          return;
        }
        populateClanProfile(null);
        setClanProfileStatus(result && result.error ? result.error : "Clan not found.", "error");
      });
      return;
    }

    var safeRequestedUsername = sanitizeProfileRouteUsername(requestedProfileUsername);
    if (safeRequestedUsername && (profileUsername || profileQuickGamesList)) {
      fetchPublicProfile(safeRequestedUsername).then(function (result) {
        if (user && user.username) {
          setCurrentSessionUser(user);
          showAccountView(user.username);
          cacheSessionUser(user);
        } else {
          showGuestView();
        }
        if (result && result.user && result.user.username) {
          populateProfile(result.user);
          if (profileSearchInput) {
            profileSearchInput.value = result.user.username;
          }
        } else if (result && result.error) {
          if (user && user.username) {
            populateProfile(user);
          } else {
            populateProfile(null);
          }
          if (profileSearchInput) {
            profileSearchInput.value = safeRequestedUsername;
          }
          setProfileSearchStatus(result.error, "error");
        } else if (user && user.username) {
          populateProfile(user);
          if (profileSearchInput) {
            profileSearchInput.value = safeRequestedUsername;
          }
          setProfileSearchStatus("Player not found.", "error");
        } else {
          populateProfile(null);
          if (profileSearchInput) {
            profileSearchInput.value = safeRequestedUsername;
          }
          setProfileSearchStatus("Player not found.", "error");
        }
        if (changeAvatarUrlInput) {
          changeAvatarUrlInput.value = user && user.profile && user.profile.avatarUrl
            ? user.profile.avatarUrl
            : "";
        }
        if (selectionBackgroundUrlInput) {
          selectionBackgroundUrlInput.value = user && user.profile && user.profile.backgrounds
            ? user.profile.backgrounds.selectionUrl || ""
            : "";
        }
        if (ingameBackgroundUrlInput) {
          ingameBackgroundUrlInput.value = user && user.profile && user.profile.backgrounds
            ? user.profile.backgrounds.ingameUrl || ""
            : "";
        }
      });
      return;
    }

    if (user && user.username) {
      setCurrentSessionUser(user);
      showAccountView(user.username);
      cacheSessionUser(user);
      populateProfile(user);
      if (changeAvatarUrlInput) {
        changeAvatarUrlInput.value = user.profile && user.profile.avatarUrl
          ? user.profile.avatarUrl
          : "";
      }
      if (selectionBackgroundUrlInput) {
        selectionBackgroundUrlInput.value = user.profile && user.profile.backgrounds
          ? user.profile.backgrounds.selectionUrl || ""
          : "";
      }
      if (ingameBackgroundUrlInput) {
        ingameBackgroundUrlInput.value = user.profile && user.profile.backgrounds
          ? user.profile.backgrounds.ingameUrl || ""
          : "";
      }
      return;
    }
    showGuestView();
    populateProfile(null);
  });

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible" && currentSessionUser && currentSessionUser.username) {
      reportCurrentActivity();
    }
  });

  window.addEventListener("focus", function () {
    if (currentSessionUser && currentSessionUser.username) {
      reportCurrentActivity();
    }
  });
}());
