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
    try {
      localStorage.removeItem("narutoUser");
    } catch (error) {}
    setAccountStatus("");
    authForm.reset();
    isRegisterMode = false;
    updateMode();
  }

  function showAccountView(username) {
    authTitle.textContent = "Account";
    guestAuthView.hidden = true;
    accountPanel.hidden = false;
    accountUsername.textContent = username || "Player";
    try {
      localStorage.setItem("narutoUser", JSON.stringify({ username: username || "Player" }));
    } catch (error) {}
    setStatus("");
    setAccountStatus("");
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
    authDescription.textContent = "Sign in with your Naruto-Arena account.";
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

      var usernameLabel = data && data.user && data.user.username ? data.user.username : username;
      showAccountView(usernameLabel);
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

  fetchSessionUser().then(function (user) {
    if (user && user.username) {
      showAccountView(user.username);
      return;
    }
    showGuestView();
  });
}());
