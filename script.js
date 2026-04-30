document.addEventListener('DOMContentLoaded', async () => {
    const pageName = window.location.pathname.split('/').pop().toLowerCase();
    const shouldUseCustomCursor = pageName === 'ingame.html' || pageName === 'selection.html';
    const shouldUseGameClickSound = shouldUseCustomCursor;
    if (shouldUseCustomCursor) {
        document.body.classList.add('custom-game-cursor');
        const setPressedCursor = () => document.body.classList.add('cursor-clicking');
        const clearPressedCursor = () => document.body.classList.remove('cursor-clicking');
        document.addEventListener('mousedown', setPressedCursor);
        document.addEventListener('mouseup', clearPressedCursor);
        document.addEventListener('mouseleave', clearPressedCursor);
        window.addEventListener('blur', clearPressedCursor);
    }
    const SOUND_SETTINGS_STORAGE_KEY = 'narutoSoundSettings';
    const soundVolumeInput =
        document.querySelector('.sound-volume') || document.querySelector('.ingame-sound-volume');
    const soundManager = (() => {
        const defaultSettings = {
            volume: 0.7,
        };
        const clampVolume = (value) => {
            const numeric = Number(value);
            if (!Number.isFinite(numeric)) return defaultSettings.volume;
            return Math.min(1, Math.max(0, numeric));
        };
        const readSettings = () => {
            try {
                const raw = localStorage.getItem(SOUND_SETTINGS_STORAGE_KEY);
                if (!raw) return { ...defaultSettings };
                const parsed = JSON.parse(raw);
                return {
                    volume: clampVolume(parsed?.volume),
                };
            } catch (error) {
                return { ...defaultSettings };
            }
        };
        let settings = readSettings();
        const syncUi = () => {
            if (soundVolumeInput) {
                soundVolumeInput.value = String(Math.round(settings.volume * 100));
            }
        };
        const persist = () => {
            try {
                localStorage.setItem(SOUND_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
            } catch (error) {
                // Ignore storage failures.
            }
        };
        syncUi();
        if (soundVolumeInput) {
            soundVolumeInput.addEventListener('input', (event) => {
                settings = {
                    ...settings,
                    volume: clampVolume((event.target?.value || 0) / 100),
                };
                persist();
                syncUi();
            });
        }
        return {
            play(audio) {
                if (!audio || settings.volume <= 0) return;
                try {
                    audio.volume = clampVolume(settings.volume);
                    audio.currentTime = 0;
                    const playback = audio.play();
                    if (playback && typeof playback.catch === 'function') {
                        playback.catch(() => {});
                    }
                } catch (error) {
                    // Ignore playback errors from the browser.
                }
            },
        };
    })();
    if (shouldUseGameClickSound) {
        const clickSound = new Audio('sounds/click.mp3');
        document.addEventListener('click', (event) => {
            if (
                event.target instanceof Element &&
                event.target.closest('.sound-controller, .ingame-sound-controller')
            ) {
                return;
            }
            soundManager.play(clickSound);
        });
    }

    const API_BASE_URL =
        window.NARUTO_API_BASE_URL ||
        `${window.location.protocol}//${window.location.hostname}${
            window.location.port ? `:${window.location.port}` : ''
        }`;
    const loginForm = document.querySelector('.login-form');
    const loginButton = document.querySelector('.ok-button');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginStatus = document.querySelector('.login-status');

    const setLoginStatus = (message, variant = 'info') => {
        if (!loginStatus) return;
        loginStatus.textContent = message;
        loginStatus.dataset.variant = variant;
    };

    const submitLogin = async (event) => {
        event.preventDefault();
        if (!usernameInput || !passwordInput || !loginButton) return;

        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        if (!username || !password) {
            setLoginStatus('Enter a username and password.', 'error');
            return;
        }

        loginButton.disabled = true;
        setLoginStatus('Signing in...', 'info');
        try {
            const response = await fetch(`${API_BASE_URL}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();
            if (!response.ok || !data.ok) {
                const message = data?.error || 'Invalid username or password.';
                throw new Error(message);
            }

            setLoginStatus('Login successful. Redirecting...', 'success');
            localStorage.setItem('narutoUser', JSON.stringify({
                username: data.user?.username,
                avatarUrl: data.user?.profile?.avatarUrl || defaultProfileAvatar,
                clanAbbreviation: data.user?.profile?.clan?.abbreviation || '',
                ladder: data.user?.profile?.ladder || null,
                backgrounds: data.user?.profile?.backgrounds || {
                    selectionUrl: '',
                    ingameUrl: '',
                },
                missions: data.user?.profile?.missions || {
                    progress: {},
                    unlockedCharacterIds: [],
                },
                matchmaking: data.user?.profile?.matchmaking || {
                    battleBotEnabled: true,
                },
            }));
            window.location.href = 'selection.html';
        } catch (error) {
            console.error('Login failed:', error);
            setLoginStatus(error.message || 'Login failed. Please try again.', 'error');
        } finally {
            loginButton.disabled = false;
        }
    };

    if (loginForm && loginButton) {
        loginButton.addEventListener('click', submitLogin);
        loginForm.addEventListener('submit', submitLogin);
    }

    const slotList = document.querySelector('.slot-list');
    const nameEl = document.getElementById('character-name');
    const portraitEl = document.getElementById('character-portrait');
    const skillNameEl = document.getElementById('skill-name');
    const skillDescEl = document.getElementById('skill-description');
    const energyBarEl = document.getElementById('energy-bar');
    const classesEl = document.getElementById('skill-classes');
    const cooldownEl = document.getElementById('skill-cooldown');
    const cooldownWrapper = cooldownEl ? cooldownEl.parentElement : null;
    const skillViewer = document.querySelector('.skillviewer');
    const skillScroll = document.querySelector('.skillscroll');
    const skillImagesContainer = document.querySelector('.skill-images');
    let skillImages = Array.from(document.querySelectorAll('.skill-image'));
    const selectedSlots = Array.from(document.querySelectorAll('.selected-character-slot'));
    const nextPageButton = document.querySelector('.nextpage');
    const lastPageButton = document.querySelector('.lastpage');
    const rosterSlotElements = [];
    const selectedAssignments = selectedSlots.map(() => null);
    const teamStorageKey = 'narutoSelectedTeam';
    const defaultProfileAvatar = 'https://i.postimg.cc/3JqVcPXm/default.png';
    const defaultLadderRankHat = 'hats/academy.png';
    let profileCache = null;
    let missionLockedCharacterIds = new Set();
    let selectionClickTimer = null;

    const normalizeLadderPresentation = (ladder = null) => {
        const source = ladder && typeof ladder === 'object' ? ladder : {};
        return {
            rank:
                typeof source.rank === 'string' && source.rank.trim()
                    ? source.rank.trim()
                    : 'Academy Student',
            level: Number.isFinite(Number(source.level)) ? Math.max(1, Number(source.level)) : 1,
            experiencePoints: Number.isFinite(Number(source.experiencePoints))
                ? Math.max(0, Number(source.experiencePoints))
                : 0,
            ladderRank: Number.isFinite(Number(source.ladderRank))
                ? Math.max(1, Number(source.ladderRank))
                : null,
            wins: Number.isFinite(Number(source.wins)) ? Math.max(0, Number(source.wins)) : 0,
            losses: Number.isFinite(Number(source.losses)) ? Math.max(0, Number(source.losses)) : 0,
            streak: Number.isFinite(Number(source.streak)) ? Number(source.streak) : 0,
            rankHatUrl:
                typeof source.rankHatUrl === 'string' && source.rankHatUrl.trim()
                    ? source.rankHatUrl.trim()
                    : defaultLadderRankHat,
        };
    };

    const normalizeMatchmakingPresentation = (matchmaking = null) => {
        const source = matchmaking && typeof matchmaking === 'object' ? matchmaking : {};
        return {
            battleBotEnabled:
                typeof source.battleBotEnabled === 'boolean' ? source.battleBotEnabled : true,
        };
    };

    const isGameBotUsername = (username) =>
        typeof username === 'string' && username.trim().toLowerCase().indexOf('__game_bot__:') === 0;

    const formatSignedNumber = (value) => {
        const amount = Number(value) || 0;
        return `${amount >= 0 ? '+' : ''}${amount}`;
    };

    const getVisibleSkillClasses = (classes = []) =>
        (Array.isArray(classes) ? classes : []).filter((entry) => {
            const normalized = typeof entry === 'string' ? entry.trim().toLowerCase() : '';
            return normalized && normalized !== 'invisible';
        });

    const shouldUseWideRankHatOffset = (rankHatUrl = '') => {
        const normalized = typeof rankHatUrl === 'string' ? rankHatUrl.trim().toLowerCase() : '';
        return (
            normalized.endsWith('/anbu.png') ||
            normalized.endsWith('hats/anbu.png') ||
            normalized.endsWith('/jinch.png') ||
            normalized.endsWith('hats/jinch.png') ||
            normalized.endsWith('/kage.png') ||
            normalized.endsWith('hats/kage.png') ||
            normalized.endsWith('/hokage.png') ||
            normalized.endsWith('hats/hokage.png')
        );
    };

    const applyRankHatPresentation = (elements, ladder) => {
        const hatUrl = ladder?.rankHatUrl || defaultLadderRankHat;
        const useWideOffset = shouldUseWideRankHatOffset(hatUrl);
        elements.forEach((element) => {
            if (!element) return;
            element.src = hatUrl;
            element.alt = `${ladder?.rank || 'Academy Student'} rank hat`;
            element.classList.toggle('rank-hat-offset-left', useWideOffset);
        });
    };

    const readCachedUser = () => {
        const cachedUser = localStorage.getItem('narutoUser');
        if (!cachedUser) return null;
        try {
            return JSON.parse(cachedUser);
        } catch (error) {
            console.warn('Unable to load stored user profile.', error);
            return null;
        }
    };

    const writeCachedUser = (user) => {
        if (!user?.username) return;
        localStorage.setItem(
            'narutoUser',
            JSON.stringify({
                username: user.username,
                role: typeof user.role === 'string' ? user.role : 'player',
                avatarUrl: user.profile?.avatarUrl || defaultProfileAvatar,
                clanAbbreviation: user.profile?.clan?.abbreviation || '',
                ladder: normalizeLadderPresentation(user.profile?.ladder),
                missions: user.profile?.missions || {
                    progress: {},
                    unlockedCharacterIds: [],
                },
                matchmaking: normalizeMatchmakingPresentation(user.profile?.matchmaking),
            })
        );
    };

    const isCurrentUserAdmin = () => {
        const profileRole =
            typeof profileCache?.role === 'string' ? profileCache.role.trim().toLowerCase() : '';
        if (profileRole === 'admin') {
            return true;
        }
        const cachedUser = readCachedUser();
        return typeof cachedUser?.role === 'string' && cachedUser.role.trim().toLowerCase() === 'admin';
    };

    const getUnlockedCharacterIdSet = () => {
        const unlockedIds = new Set();
        const cachedMissions = profileCache?.profile?.missions;
        const cachedStorageUser = readCachedUser();
        const sourceIds = Array.isArray(cachedMissions?.unlockedCharacterIds)
            ? cachedMissions.unlockedCharacterIds
            : Array.isArray(cachedStorageUser?.missions?.unlockedCharacterIds)
                ? cachedStorageUser.missions.unlockedCharacterIds
                : [];
        sourceIds.forEach((entry) => {
            const normalized = typeof entry === 'string' ? entry.trim().toLowerCase() : '';
            if (normalized) {
                unlockedIds.add(normalized);
            }
        });
        return unlockedIds;
    };

    const loadMissionLockedCharacterIds = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/missions`, {
                credentials: 'include',
            });
            if (!response.ok) {
                throw new Error('Unable to load missions.');
            }
            const data = await response.json();
            const lockedIds = new Set();
            (Array.isArray(data?.missions) ? data.missions : []).forEach((mission) => {
                const rewardCharacterId =
                    typeof mission?.reward_character === 'string'
                        ? mission.reward_character.trim().toLowerCase()
                        : '';
                if (rewardCharacterId) {
                    lockedIds.add(rewardCharacterId);
                }
            });
            missionLockedCharacterIds = lockedIds;
        } catch (error) {
            console.warn('Failed to load mission lock data.', error);
            missionLockedCharacterIds = new Set();
        }
    };

    const isCharacterLocked = (character) => {
        if (isCurrentUserAdmin()) {
            return false;
        }
        const characterId = typeof character?.characterId === 'string'
            ? character.characterId.trim().toLowerCase()
            : '';
        if (!characterId) {
            return false;
        }
        if (!missionLockedCharacterIds.has(characterId)) {
            return false;
        }
        return !getUnlockedCharacterIdSet().has(characterId);
    };

    const applyPlayerIdentity = (options = {}) => {
        const name = options.name || null;
        const avatarUrl = options.avatarUrl || defaultProfileAvatar;
        const clanAbbreviation = options.clanAbbreviation || 'None';
        const ladder = normalizeLadderPresentation(options.ladder);
        const nameElements = Array.from(
            document.querySelectorAll('.player-nameselection, .player-left .player-name')
        );
        const avatarElements = Array.from(
            document.querySelectorAll('.player-avatar, .player-avatar-left')
        );
        const statElements = Array.from(document.querySelectorAll('.player-infoselection .player-stat'));
        const playerStatusEl = document.querySelector('.player-left .player-status');
        const playerHatEls = Array.from(document.querySelectorAll('.player-characters .rank-hat'));
        nameElements.forEach((element) => {
            if (element && name) {
                element.textContent = name;
            }
        });
        avatarElements.forEach((element) => {
            if (element) {
                element.src = avatarUrl;
            }
        });
        statElements.forEach((element) => {
            if (!element) {
                return;
            }
            const currentText =
                typeof element.textContent === 'string' ? element.textContent.trim().toUpperCase() : '';
            if (currentText.startsWith('ALLIANCE:')) {
                element.textContent = `Alliance: ${clanAbbreviation}`;
                return;
            }
            if (currentText.startsWith('LEVEL:')) {
                element.textContent = `LEVEL: ${ladder.level} (${ladder.experiencePoints.toLocaleString()} XP)`;
                return;
            }
            if (currentText.startsWith('LADDERRANK:')) {
                element.textContent = `LADDERRANK: ${ladder.ladderRank ? `#${ladder.ladderRank}` : 'Unranked'}`;
                return;
            }
            if (currentText.startsWith('RATIO:')) {
                element.textContent = `RATIO: ${ladder.wins} - ${ladder.losses} ( ${formatSignedNumber(ladder.streak)} )`;
                return;
            }
            element.textContent = ladder.rank;
        });
        if (playerStatusEl) {
            playerStatusEl.textContent = ladder.rank;
        }
        applyRankHatPresentation(playerHatEls, ladder);
    };

    const applyOpponentIdentity = (options = {}) => {
        const avatarUrl = options.avatarUrl || defaultProfileAvatar;
        const name = options.name || null;
        const ladder = normalizeLadderPresentation(options.ladder);
        const opponentAvatar = document.querySelector('.player-avatar-right');
        const opponentNameEl = document.querySelector('.player-right .player-name');
        const opponentStatusEl = document.querySelector('.player-right .player-status');
        const opponentHatEls = Array.from(document.querySelectorAll('.enemy-characters .rank-hat'));
        if (opponentAvatar) {
            opponentAvatar.src = avatarUrl;
        }
        if (opponentNameEl && name) {
            opponentNameEl.textContent = name;
        }
        if (opponentStatusEl) {
            opponentStatusEl.textContent = ladder.rank;
        }
        applyRankHatPresentation(opponentHatEls, ladder);
    };

    const applyCustomBackgrounds = (user) => {
        const selectionBackground = document.querySelector('.background');
        const ingameBackground = document.querySelector('.backgroundingame');
        const selectionUrl = user?.profile?.backgrounds?.selectionUrl || '';
        const ingameUrl = user?.profile?.backgrounds?.ingameUrl || '';
        if (selectionBackground) {
            selectionBackground.style.backgroundImage = selectionUrl
                ? `url("${selectionUrl}")`
                : '';
        }
        if (ingameBackground) {
            ingameBackground.style.backgroundImage = ingameUrl
                ? `url("${ingameUrl}")`
                : '';
        }
    };

    const getCurrentActivityPageLabel = () => {
        const pageMap = {
            'index.html': 'Comic Arena > Home',
            'profile.html': 'Comic Arena > Profile',
            'clanprofile.html': 'Comic Arena > Clan Profile',
            'selection.html': 'Comic Arena > Selection',
            'ingame.html': 'Comic Arena > In Game',
        };
        return pageMap[pageName] || `Comic Arena > ${pageName.replace(/\.html$/i, '').replace(/[-_]+/g, ' ')}`;
    };

    const reportCurrentActivity = async () => {
        if (!profileCache?.username) return;
        const currentPage = getCurrentActivityPageLabel();
        try {
            await fetch(`${API_BASE_URL}/api/activity`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    currentPage,
                }),
            });
            if (!profileCache.profile) {
                profileCache.profile = {};
            }
            if (!profileCache.profile.activity) {
                profileCache.profile.activity = {};
            }
            profileCache.profile.activity.currentPage = currentPage;
            profileCache.profile.activity.lastOnlineAt = new Date().toISOString();
        } catch (error) {
            return;
        }
    };

    const fetchProfile = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/me`, {
                credentials: 'include',
            });
            if (!response.ok) {
                throw new Error('Unauthorized');
            }
            const data = await response.json();
            if (data?.user?.username) {
                profileCache = data.user;
                writeCachedUser(data.user);
                reportCurrentActivity();
                return data.user;
            }
        } catch (error) {
            return null;
        }
        return null;
    };

    const getBattleBotPreference = () => {
        const cachedUser = readCachedUser();
        return normalizeMatchmakingPresentation(
            profileCache?.profile?.matchmaking || cachedUser?.matchmaking
        ).battleBotEnabled;
    };

    const hydratePlayerIdentity = async () => {
        const cachedUser = readCachedUser();
        if (cachedUser?.username) {
            applyPlayerIdentity({
                name: cachedUser.username,
                avatarUrl: cachedUser.avatarUrl || defaultProfileAvatar,
                clanAbbreviation: cachedUser.clanAbbreviation || 'None',
                ladder: cachedUser.ladder,
            });
        } else {
            applyPlayerIdentity({
                avatarUrl: defaultProfileAvatar,
                clanAbbreviation: 'None',
                ladder: null,
            });
        }

        const apiUser = await fetchProfile();
        if (apiUser?.username) {
            applyPlayerIdentity({
                name: apiUser.username,
                avatarUrl: apiUser.profile?.avatarUrl || defaultProfileAvatar,
                clanAbbreviation: apiUser.profile?.clan?.abbreviation || 'None',
                ladder: apiUser.profile?.ladder || null,
            });
            applyCustomBackgrounds(apiUser);
        }
    };

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            reportCurrentActivity();
        }
    });

    window.addEventListener('focus', () => {
        reportCurrentActivity();
    });

    const fetchPublicProfile = async (username) => {
        if (!username) return null;
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/users/${encodeURIComponent(username)}/profile`,
                {
                    credentials: 'include',
                }
            );
            if (!response.ok) {
                return null;
            }
            const data = await response.json();
            return data?.user?.username ? data.user : null;
        } catch (error) {
            return null;
        }
    };

    const hydrateOpponentIdentity = async (username) => {
        if (!username) {
            applyOpponentIdentity({
                avatarUrl: defaultProfileAvatar,
                ladder: null,
            });
            return;
        }
        if (isGameBotUsername(username)) {
            applyOpponentIdentity({
                name: 'Game Bot',
                avatarUrl: defaultProfileAvatar,
                ladder: null,
            });
            return;
        }
        const user = await fetchPublicProfile(username);
        applyOpponentIdentity({
            name: user?.username || username,
            avatarUrl: user?.profile?.avatarUrl || defaultProfileAvatar,
            ladder: user?.profile?.ladder || null,
        });
    };

    const matchIdFromUrl = new URLSearchParams(window.location.search).get('matchId');

    if (!slotList) {
        const rosterData = typeof characters !== 'undefined' ? characters : window.characters;
        let matchSocket = null;
        let matchSocketReconnectTimer = null;
        let matchSocketReconnectDelay = 1000;
        let matchSocketManuallyClosed = false;
        let currentPlayerUsername = null;
        let currentTurnUsername = null;
        let currentOpponentUsername = null;
        let currentOpponentDisplayName = null;
        let currentMatchMode = 'quick';
        const startFirstSound = new Audio('sounds/start-first.mp3');
        const secondPlayerStartSound = new Audio('sounds/yahoe.mp3');
        const nextRoundSound = new Audio('sounds/next-round.mp3');
        const startRoundSound = new Audio('sounds/start-round.mp3');
        const lostSound = new Audio('sounds/lost.mp3');
        const winSound = new Audio('sounds/win.mp3');
        const applySkillSound = new Audio('sounds/apply-skill.mp3');
        const deathSound = new Audio('sounds/death-sound.mp3');
        let hasPlayedMatchEntrySound = false;
        let hasInitializedTurnState = false;
        const playerSkillImages = Array.from(
            document.querySelectorAll('.player-characters .skillscrollingame .skillimage')
        );
        const playerSkillScrolls = Array.from(
            document.querySelectorAll('.player-characters .skillscrollingame')
        );
        let playerCards = [];
        let enemyCards = [];
        let activeTargetOptions = null;
        const chakraDisplay = document.querySelector('.chakra-display');
        const exchangeLabel = document.querySelector('.exchange-label');
        const exchangeModalEl = document.querySelector('.exchange_chakra');
        const exchangeChoiceButtons = Array.from(
            exchangeModalEl?.querySelectorAll('.exchange_chakra_choice') || []
        );
        const exchangeOkButton = exchangeModalEl?.querySelector('.ok-buttonexchange');
        const exchangeCancelButton = exchangeModalEl?.querySelector('.cancel-buttonexchange');
        const exchangeChooseCountEl = exchangeModalEl?.querySelector('.chakrachoosered');
        const readyTextEl = document.querySelector('.ready-text');
        const readySectionEl = document.querySelector('.ready-section');
        const endTurnModalEl = document.querySelector('.ChakraChooseEndTurn');
        const skillOrderEl = endTurnModalEl?.querySelector('.skillorder');
        const endTurnOkButton = document.querySelector('.ok-buttonendturn');
        const endTurnCancelButton = document.querySelector('.cancel-buttonendturn');
        const surrenderConfirmEl = document.querySelector('.surrender-confirm');
        const surrenderConfirmOkButton = document.querySelector('.surrender-confirm-ok');
        const surrenderConfirmCancelButton = document.querySelector('.surrender-confirm-cancel');
        const battleEndOverlayEl = document.querySelector('.battle-end-overlay');
        const battleEndPortraitEl = battleEndOverlayEl?.querySelector('.battle-end-portrait');
        const battleEndTitleEl = battleEndOverlayEl?.querySelector('.battle-end-title');
        const battleEndMessageEl = battleEndOverlayEl?.querySelector('.battle-end-message');
        const battleEndContinueButton = battleEndOverlayEl?.querySelector('.battle-end-continue');
        const classChoicePopupEl = document.querySelector('.class-choice-popup');
        const classChoicePopupTitleEl = classChoicePopupEl?.querySelector('.class-choice-popup-title');
        const classChoicePopupOptionsEl = classChoicePopupEl?.querySelector('.class-choice-popup-options');
        const classChoicePopupCancelButton = classChoicePopupEl?.querySelector('.class-choice-popup-cancel');
        const endTurnChooseCountEl = endTurnModalEl?.querySelector('.chakrachoosered');
        const timerBar = document.querySelector('.timer-bar');
        const TURN_DURATION_MS = 60_000;
        const TIMER_MAX_WIDTH = 191;
        const EXCHANGE_CHAKRA_COST = 4;
        const READY_TEXT_PLAYER = 'PRESS WHEN READY';
        const READY_TEXT_OPPONENT = "OPPONENT'S TURN...";
        let lastTurnOwner = null;
        let turnExpiresAtMs = null;
        let currentTurnDurationMs = TURN_DURATION_MS;
        let turnTimerInterval = null;
        let autoEndRequested = false;
        let isEndingTurn = false;
        let pendingTurnState = null;
        let playerPoolState = {
            taijutsu: 0,
            ninjutsu: 0,
            bloodline: 0,
            genjutsu: 0,
        };
        let activeCastingSkill = null;
        const classChoiceBySkillKey = new Map();
        let pendingQueuePayload = null;
        let pendingTurnStartChoicePayload = null;
        const playerSkillMetaByKey = new Map();
        let activeTurnStartChoiceKey = '';
        let activeChoicePopupMode = '';
        let queuedSkillKeySet = new Set();
        let draggingQueueActorSlot = null;
        let latestBoardState = null;
        let globalStatusTooltipEl = null;
        let battleEndShown = false;
        let selectedExchangeType = 'taijutsu';
        const playIngameSound = (audio) => {
            soundManager.play(audio);
        };
        const chakraCountEls = chakraDisplay
            ? {
                  taijutsu: chakraDisplay.querySelector('[data-chakra="taijutsu"] .chakra-count'),
                  ninjutsu: chakraDisplay.querySelector('[data-chakra="ninjutsu"] .chakra-count'),
                  bloodline: chakraDisplay.querySelector('[data-chakra="bloodline"] .chakra-count'),
                  genjutsu: chakraDisplay.querySelector('[data-chakra="genjutsu"] .chakra-count'),
                  total: chakraDisplay.querySelector('[data-chakra-total] .chakra-count'),
              }
            : {};
        const chakraLabelToTypeMap = {
            taijutsu: 'taijutsu',
            green: 'taijutsu',
            bloodline: 'bloodline',
            red: 'bloodline',
            ninjutsu: 'ninjutsu',
            blue: 'ninjutsu',
            genjutsu: 'genjutsu',
            white: 'genjutsu',
        };
        const resolveChakraType = (value) => {
            const normalized =
                typeof value === 'string' ? value.trim().toLowerCase() : '';
            return chakraLabelToTypeMap[normalized] || null;
        };
        const getRowChakraType = (row) => {
            if (!(row instanceof Element)) return null;
            return (
                resolveChakraType(row.getAttribute('data-chakra-type')) ||
                resolveChakraType(row.querySelector('.chakra-name')?.textContent)
            );
        };
        const buildAmountElementMap = (columnSelector) => {
            if (!endTurnModalEl) return {};
            const rows = Array.from(endTurnModalEl.querySelectorAll(`${columnSelector} .chakra-row`));
            const result = {};
            rows.forEach((row) => {
                const name = getRowChakraType(row);
                const amountEl = row.querySelector('.chakra-amount');
                if (name && amountEl) {
                    result[name] = amountEl;
                }
            });
            return result;
        };
        const endTurnLeftAmountEls = buildAmountElementMap('.chakra-column');
        const endTurnRightAmountEls = buildAmountElementMap('.chakra-columnright');
        const endTurnLeftRowEls = (() => {
            if (!endTurnModalEl) return {};
            const rows = Array.from(endTurnModalEl.querySelectorAll('.chakra-column .chakra-row'));
            const result = {};
            rows.forEach((row) => {
                const name = getRowChakraType(row);
                if (name) {
                    result[name] = row;
                }
            });
            return result;
        })();
        const skillInfo = {
            imgEl: document.querySelector('.skillviewimage'),
            nameEl: document.querySelector('.ingameskillname'),
            energyEl: document.querySelector('.energytext'),
            classesEl: document.querySelector('.ingameclasses'),
            cooldownEl: document.querySelector('.ingamecooldown'),
            classPickerWrapEl: document.querySelector('.ingameclasspicker'),
            classPickerEl: document.querySelector('.ingame-class-picker-field'),
            descEl: document.querySelector('.ingameskilldescription'),
        };
        const chakraTypes = ['taijutsu', 'ninjutsu', 'bloodline', 'genjutsu'];
        const emptyPool = () => ({
            taijutsu: 0,
            ninjutsu: 0,
            bloodline: 0,
            genjutsu: 0,
        });
        let exchangeSpendAssignments = emptyPool();
        const normalizePool = (pool = {}) => ({
            taijutsu: Number(pool.taijutsu) || 0,
            ninjutsu: Number(pool.ninjutsu) || 0,
            bloodline: Number(pool.bloodline) || 0,
            genjutsu: Number(pool.genjutsu) || 0,
        });
        const totalPool = (pool = {}) =>
            chakraTypes.reduce((sum, type) => sum + (Number(pool[type]) || 0), 0);
        const normalizePendingTurn = (pending = null) => ({
            queuedByActorSlot:
                pending && typeof pending.queuedByActorSlot === 'object' ? pending.queuedByActorSlot : {},
            queueOrder: Array.isArray(pending?.queueOrder)
                ? pending.queueOrder
                      .map((slot) => Number.parseInt(slot, 10))
                      .filter((slot) => Number.isInteger(slot) && slot >= 0)
                : [],
            unresolvedRandom: Number.isInteger(pending?.unresolvedRandom) ? pending.unresolvedRandom : 0,
            randomAssignments: {
                ...emptyPool(),
                ...(pending && typeof pending.randomAssignments === 'object'
                    ? pending.randomAssignments
                    : {}),
            },
            turnStartChoice:
                pending && pending.turnStartChoice && typeof pending.turnStartChoice === 'object'
                    ? {
                          actorSlot: Number.isInteger(pending.turnStartChoice.actorSlot)
                              ? pending.turnStartChoice.actorSlot
                              : null,
                          sourceSkillId:
                              typeof pending.turnStartChoice.sourceSkillId === 'string'
                                  ? pending.turnStartChoice.sourceSkillId
                                  : null,
                          sourceUsername:
                              typeof pending.turnStartChoice.sourceUsername === 'string'
                                  ? pending.turnStartChoice.sourceUsername
                                  : null,
                          sourceSlot: Number.isInteger(pending.turnStartChoice.sourceSlot)
                              ? pending.turnStartChoice.sourceSlot
                              : null,
                          sourceStatusId:
                              typeof pending.turnStartChoice.sourceStatusId === 'string'
                                  ? pending.turnStartChoice.sourceStatusId
                                  : null,
                          promptText:
                              typeof pending.turnStartChoice.promptText === 'string'
                                  ? pending.turnStartChoice.promptText
                                  : '',
                          options: Array.isArray(pending.turnStartChoice.options)
                              ? pending.turnStartChoice.options
                                    .map((option) => {
                                        if (!option || typeof option !== 'object') return null;
                                        const key =
                                            typeof option.key === 'string'
                                                ? option.key.trim().toLowerCase()
                                                : '';
                                        const label =
                                            typeof option.label === 'string' ? option.label.trim() : '';
                                        if (!key || !label) return null;
                                        return {
                                            key,
                                            label,
                                            targetStrategy:
                                                typeof option.targetStrategy === 'string'
                                                    ? option.targetStrategy.trim().toLowerCase()
                                                    : '',
                                            effect:
                                                option.effect && typeof option.effect === 'object'
                                                    ? { ...option.effect }
                                                    : null,
                                        };
                                    })
                                    .filter(Boolean)
                              : [],
                          maxUses: Number.isInteger(pending.turnStartChoice.maxUses)
                              ? pending.turnStartChoice.maxUses
                              : 0,
                          usesUsed: Number.isInteger(pending.turnStartChoice.usesUsed)
                              ? pending.turnStartChoice.usesUsed
                              : 0,
                      }
                    : null,
        });
        const normalizeClassChoice = (value) =>
            typeof value === 'string' ? value.trim().toLowerCase() : '';
        const formatClassChoiceLabel = (value) => {
            const normalized = normalizeClassChoice(value);
            if (!normalized) return '';
            return normalized.charAt(0).toUpperCase() + normalized.slice(1);
        };
        const getClassChoiceOptions = (skill) =>
            Array.isArray(skill?.classChoiceOptions)
                ? skill.classChoiceOptions
                      .map((entry) => normalizeClassChoice(entry))
                      .filter(Boolean)
                : [];
        const getClassChoiceKey = (actorSlot, skillIdx) => {
            if (!Number.isInteger(actorSlot) || actorSlot < 0) return '';
            if (!Number.isInteger(skillIdx) || skillIdx < 0) return '';
            return `${actorSlot}:${skillIdx}`;
        };
        const getCurrentClassChoiceForCastingSkill = () => {
            if (!activeCastingSkill) return null;
            const options = Array.isArray(activeCastingSkill.classChoiceOptions)
                ? activeCastingSkill.classChoiceOptions
                : [];
            if (!options.length) return null;
            const pickerValue = normalizeClassChoice(skillInfo.classPickerEl?.value || '');
            if (pickerValue && options.includes(pickerValue)) {
                return pickerValue;
            }
            const key = getClassChoiceKey(activeCastingSkill.actorSlot, activeCastingSkill.skillIdx);
            const stored = normalizeClassChoice(classChoiceBySkillKey.get(key));
            if (stored && options.includes(stored)) {
                return stored;
            }
            return options[0];
        };

        const getActorUnitForSlot = (username, actorSlot) => {
            if (!username || !Number.isInteger(actorSlot) || actorSlot < 0) return null;
            const units = latestBoardState?.[username];
            if (!Array.isArray(units)) return null;
            return units[actorSlot] || null;
        };

        const isUnitBanished = (unit) => {
            const statuses = Array.isArray(unit?.state?.statuses) ? unit.state.statuses : [];
            return statuses.some((status) => {
                const remaining = Number(status?.remainingTurns) || 0;
                return remaining > 0 && Boolean(status?.metadata?.banished);
            });
        };

        const isUnitDeadLike = (unit) => {
            const hp = Number(unit?.hp);
            return unit?.alive === false || isUnitBanished(unit) || (Number.isFinite(hp) && hp <= 0);
        };

        await hydratePlayerIdentity();

        const getSkillReplacementMapFromUnit = (unit) => {
            const map = {};
            const statuses = Array.isArray(unit?.state?.statuses) ? unit.state.statuses : [];
            statuses.forEach((status) => {
                const remaining = Number(status?.remainingTurns) || 0;
                if (remaining <= 0) return;
                const byRemaining = status?.metadata?.skillReplacementsByRemainingTurns;
                const replacementsFromRemaining =
                    byRemaining && typeof byRemaining === 'object'
                        ? byRemaining[String(remaining)] || byRemaining[remaining]
                        : null;
                const replacements =
                    replacementsFromRemaining && typeof replacementsFromRemaining === 'object'
                        ? replacementsFromRemaining
                        : status?.metadata?.skillReplacements;
                if (!replacements || typeof replacements !== 'object') return;
                Object.entries(replacements).forEach(([fromId, toId]) => {
                    if (!fromId || !toId) return;
                    map[fromId] = toId;
                });
            });
            return map;
        };

        const getEffectiveSkillForActorSlot = (actorSlot, baseSkillIdx) => {
            const meta = playerSkillMetaByKey.get(`${actorSlot}:${baseSkillIdx}`);
            const baseSkill = meta?.baseSkill || meta?.skill || null;
            if (!baseSkill) return null;
            const unit = getActorUnitForSlot(currentPlayerUsername, actorSlot);
            const replacementMap = getSkillReplacementMapFromUnit(unit);
            const rosterIndex = Number.isInteger(unit?.rosterIndex) ? unit.rosterIndex : null;
            const character = Number.isInteger(rosterIndex) ? rosterData?.[rosterIndex] : null;
            let resolvedSkill = baseSkill;
            const visited = new Set();
            while (resolvedSkill?.id && replacementMap[resolvedSkill.id] && !visited.has(resolvedSkill.id)) {
                visited.add(resolvedSkill.id);
                const replacementId = replacementMap[resolvedSkill.id];
                const replacementSkill = (Array.isArray(character?.skills) ? character.skills : []).find(
                    (skill) => skill?.id === replacementId
                );
                if (!replacementSkill) break;
                resolvedSkill = replacementSkill;
            }
            return resolvedSkill || baseSkill;
        };
        const getEnergyCost = (energy = []) => {
            const specific = emptyPool();
            let random = 0;
            (Array.isArray(energy) ? energy : []).forEach((entry) => {
                const normalized = typeof entry === 'string' ? entry.trim().toLowerCase() : '';
                if (normalized === 'random') {
                    random += 1;
                    return;
                }
                if (Object.prototype.hasOwnProperty.call(specific, normalized)) {
                    specific[normalized] += 1;
                }
            });
            return { specific, random };
        };

        const getActorCostReductions = (actorSlot) => {
            if (!Number.isInteger(actorSlot) || actorSlot < 0) {
                return { taijutsu: 0, ninjutsu: 0, bloodline: 0, genjutsu: 0, random: 0 };
            }
            const actorUnit = latestBoardState?.[currentPlayerUsername]?.[actorSlot];
            const statuses = Array.isArray(actorUnit?.state?.statuses) ? actorUnit.state.statuses : [];
            return statuses.reduce(
                (totals, status) => {
                    const metadata = status?.metadata || {};
                    return {
                        taijutsu: totals.taijutsu + (Number(metadata.taijutsuCostReduction) || 0),
                        ninjutsu: totals.ninjutsu + (Number(metadata.ninjutsuCostReduction) || 0),
                        bloodline: totals.bloodline + (Number(metadata.bloodlineCostReduction) || 0),
                        genjutsu: totals.genjutsu + (Number(metadata.genjutsuCostReduction) || 0),
                        taijutsuIncrease:
                            totals.taijutsuIncrease + (Number(metadata.taijutsuCostIncrease) || 0),
                        ninjutsuIncrease:
                            totals.ninjutsuIncrease + (Number(metadata.ninjutsuCostIncrease) || 0),
                        bloodlineIncrease:
                            totals.bloodlineIncrease + (Number(metadata.bloodlineCostIncrease) || 0),
                        genjutsuIncrease:
                            totals.genjutsuIncrease + (Number(metadata.genjutsuCostIncrease) || 0),
                        random: totals.random + (Number(metadata.randomCostReduction) || 0),
                        randomIncrease: totals.randomIncrease + (Number(metadata.randomCostIncrease) || 0),
                        nonMentalRandomIncrease:
                            totals.nonMentalRandomIncrease +
                            (Number(metadata.nonMentalRandomCostIncrease) || 0),
                    };
                },
                {
                    taijutsu: 0,
                    ninjutsu: 0,
                    bloodline: 0,
                    genjutsu: 0,
                    taijutsuIncrease: 0,
                    ninjutsuIncrease: 0,
                    bloodlineIncrease: 0,
                    genjutsuIncrease: 0,
                    random: 0,
                    randomIncrease: 0,
                    nonMentalRandomIncrease: 0,
                }
            );
        };

        const normalizeSkillCostOverride = (override = {}) => {
            const result = [];
            const addEnergy = (type, amount) => {
                const count = Math.max(0, Number(amount) || 0);
                for (let i = 0; i < count; i += 1) {
                    result.push(type);
                }
            };
            if (Array.isArray(override?.energy)) {
                override.energy.forEach((entry) => {
                    const normalized = typeof entry === 'string' ? entry.trim().toLowerCase() : '';
                    if (normalized) result.push(normalized);
                });
            }
            addEnergy('random', override?.requiredRandom);
            addEnergy('random', override?.random);
            ['taijutsu', 'ninjutsu', 'bloodline', 'genjutsu'].forEach((type) => {
                addEnergy(type, override?.[type]);
                addEnergy(type, override?.reservedSpecific?.[type]);
            });
            return result;
        };

        const getSkillCostOverrideForSkill = (actorSlot, skill = null) => {
            const skillId = typeof skill?.id === 'string' ? skill.id : '';
            if (!skillId || !Number.isInteger(actorSlot) || actorSlot < 0) return null;
            const actorUnit = latestBoardState?.[currentPlayerUsername]?.[actorSlot];
            const statuses = Array.isArray(actorUnit?.state?.statuses) ? actorUnit.state.statuses : [];
            for (const status of statuses) {
                if ((Number(status?.remainingTurns) || 0) <= 0) continue;
                const overrides = status?.metadata?.skillCostOverridesBySkillId;
                if (!overrides || typeof overrides !== 'object') continue;
                const overrideByRemaining = status?.metadata?.skillCostOverridesByRemainingTurns;
                const remaining = Number(status?.remainingTurns) || 0;
                const override =
                    (overrideByRemaining && typeof overrideByRemaining === 'object'
                        ? overrideByRemaining[String(remaining)] || overrideByRemaining[remaining]
                        : null) || overrides[skillId];
                if (!override || typeof override !== 'object') continue;
                return normalizeSkillCostOverride(override);
            }
            return null;
        };

        const doesSkillOverrideToAllRandom = (actorSlot, skill = null) => {
            const skillId = typeof skill?.id === 'string' ? skill.id : '';
            if (!skillId || !Number.isInteger(actorSlot) || actorSlot < 0) return false;
            const actorUnit = latestBoardState?.[currentPlayerUsername]?.[actorSlot];
            const statuses = Array.isArray(actorUnit?.state?.statuses) ? actorUnit.state.statuses : [];
            for (const status of statuses) {
                if ((Number(status?.remainingTurns) || 0) <= 0) continue;
                const metadata = status?.metadata || {};
                if (!metadata.overrideAllSkillsToAllRandom) continue;
                const restrictedSkillIds = Array.isArray(metadata.overrideAllSkillsToAllRandomSkillIdsAny)
                    ? metadata.overrideAllSkillsToAllRandomSkillIdsAny
                          .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
                          .filter(Boolean)
                    : [];
                if (restrictedSkillIds.length > 0 && !restrictedSkillIds.includes(skillId)) {
                    continue;
                }
                return true;
            }
            return false;
        };

        const getEffectiveEnergyList = (energy = [], actorSlot = null, skill = null) => {
            const normalizedEnergy = (Array.isArray(energy) ? energy : []).filter((entry) => {
                const normalized = typeof entry === 'string' ? entry.trim().toLowerCase() : '';
                return normalized && normalized !== 'none' && normalized !== 'non';
            });
            if (!Number.isInteger(actorSlot) || actorSlot < 0) {
                return normalizedEnergy;
            }
            const overrideEnergy = getSkillCostOverrideForSkill(actorSlot, skill);
            if (overrideEnergy) {
                return overrideEnergy;
            }
            if (doesSkillOverrideToAllRandom(actorSlot, skill)) {
                return normalizedEnergy.map(() => 'random');
            }
            const reductions = getActorCostReductions(actorSlot);
            let remainingRandomReduction = Math.max(0, reductions.random);
            let remainingSpecificReductions = {
                taijutsu: Math.max(0, reductions.taijutsu),
                ninjutsu: Math.max(0, reductions.ninjutsu),
                bloodline: Math.max(0, reductions.bloodline),
                genjutsu: Math.max(0, reductions.genjutsu),
            };
            const specificIncreases = {
                taijutsu: Math.max(0, reductions.taijutsuIncrease),
                ninjutsu: Math.max(0, reductions.ninjutsuIncrease),
                bloodline: Math.max(0, reductions.bloodlineIncrease),
                genjutsu: Math.max(0, reductions.genjutsuIncrease),
            };
            const skillClasses = Array.isArray(skill?.classes)
                ? skill.classes
                    .map((entry) => (typeof entry === 'string' ? entry.trim().toLowerCase() : ''))
                    .filter(Boolean)
                : [];
            const skillIsMental = skillClasses.includes('mental');
            const randomIncrease =
                Math.max(0, reductions.randomIncrease) +
                (skillIsMental ? 0 : Math.max(0, reductions.nonMentalRandomIncrease));
            const reduced = [];
            normalizedEnergy.forEach((entry) => {
                const normalized = typeof entry === 'string' ? entry.trim().toLowerCase() : '';
                if (normalized === 'random' && remainingRandomReduction > 0) {
                    remainingRandomReduction -= 1;
                    return;
                }
                if (Object.prototype.hasOwnProperty.call(remainingSpecificReductions, normalized) &&
                    remainingSpecificReductions[normalized] > 0) {
                    remainingSpecificReductions[normalized] -= 1;
                    return;
                }
                reduced.push(entry);
            });
            Object.entries(specificIncreases).forEach(([type, amount]) => {
                for (let i = 0; i < amount; i += 1) {
                    reduced.push(type.charAt(0).toUpperCase() + type.slice(1));
                }
            });
            for (let i = 0; i < randomIncrease; i += 1) {
                reduced.push('Random');
            }
            return reduced;
        };

        const setSkillInteractivity = (isPlayersTurn) => {
            playerSkillScrolls.forEach((scrollEl) => {
                scrollEl.classList.toggle('not-turn', !isPlayersTurn);
            });
            if (chakraDisplay) {
                chakraDisplay.style.visibility = isPlayersTurn ? 'visible' : 'hidden';
            }
            if (exchangeLabel) {
                exchangeLabel.style.visibility = isPlayersTurn ? 'visible' : 'hidden';
            }
            if (!isPlayersTurn) {
                closeExchangeModal();
            }
            if (readyTextEl) {
                readyTextEl.textContent = isPlayersTurn ? READY_TEXT_PLAYER : READY_TEXT_OPPONENT;
            }
        };

        const canAffordSkill = (energy = [], pool = {}, actorSlot = null, skill = null) => {
            const normalizedPool = normalizePool(pool);
            const effectiveEnergy = getEffectiveEnergyList(energy, actorSlot, skill);
            const { specific, random } = getEnergyCost(effectiveEnergy);
            for (const type of chakraTypes) {
                if (normalizedPool[type] < specific[type]) {
                    return false;
                }
            }
            const leftover = {
                taijutsu: normalizedPool.taijutsu - specific.taijutsu,
                ninjutsu: normalizedPool.ninjutsu - specific.ninjutsu,
                bloodline: normalizedPool.bloodline - specific.bloodline,
                genjutsu: normalizedPool.genjutsu - specific.genjutsu,
            };
            return totalPool(leftover) >= random;
        };

        const getPendingReservationState = (excludedActorSlot = null) => {
            const pending = normalizePendingTurn(pendingTurnState);
            const remainingPool = normalizePool(playerPoolState);
            const randomAssignments = normalizePool(pending.randomAssignments);
            let totalQueuedRandom = 0;
            let excludedQueuedRandom = 0;

            Object.values(pending.queuedByActorSlot || {}).forEach((queued) => {
                const queuedActorSlot = Number.parseInt(queued?.actorSlot, 10);
                const queuedRequiredRandom = Math.max(0, Number(queued?.requiredRandom) || 0);
                totalQueuedRandom += queuedRequiredRandom;
                if (Number.isInteger(excludedActorSlot) && queuedActorSlot === excludedActorSlot) {
                    excludedQueuedRandom += queuedRequiredRandom;
                    return;
                }
                const reservedSpecific =
                    queued?.reservedSpecific && typeof queued.reservedSpecific === 'object'
                        ? queued.reservedSpecific
                        : {};
                chakraTypes.forEach((type) => {
                    remainingPool[type] = Math.max(
                        0,
                        (Number(remainingPool[type]) || 0) - (Number(reservedSpecific[type]) || 0)
                    );
                });
            });

            chakraTypes.forEach((type) => {
                remainingPool[type] = Math.max(
                    0,
                    (Number(remainingPool[type]) || 0) - (Number(randomAssignments[type]) || 0)
                );
            });

            const assignedRandomTotal = totalPool(randomAssignments);
            const queuedRandomExcludingActor = Math.max(0, totalQueuedRandom - excludedQueuedRandom);
            const reservedRandomTotal = Math.max(0, queuedRandomExcludingActor - assignedRandomTotal);

            return {
                remainingPool,
                reservedRandomTotal,
            };
        };

        const canAffordSkillWithPendingReservations = (energy = [], actorSlot = null, skill = null) => {
            const { remainingPool, reservedRandomTotal } = getPendingReservationState(actorSlot);
            const effectiveEnergy = getEffectiveEnergyList(energy, actorSlot, skill);
            const { specific, random } = getEnergyCost(effectiveEnergy);
            for (const type of chakraTypes) {
                if ((Number(remainingPool[type]) || 0) < specific[type]) {
                    return false;
                }
            }
            const leftover = {
                taijutsu: (Number(remainingPool.taijutsu) || 0) - specific.taijutsu,
                ninjutsu: (Number(remainingPool.ninjutsu) || 0) - specific.ninjutsu,
                bloodline: (Number(remainingPool.bloodline) || 0) - specific.bloodline,
                genjutsu: (Number(remainingPool.genjutsu) || 0) - specific.genjutsu,
            };
            return totalPool(leftover) >= reservedRandomTotal + random;
        };

        const getQueuedSkillForActorSlot = (actorSlot) => {
            const pending = normalizePendingTurn(pendingTurnState);
            return pending.queuedByActorSlot?.[String(actorSlot)] || null;
        };

        const updateEndTurnButtons = () => {
            const pending = normalizePendingTurn(pendingTurnState);
            const hasUnresolvedRandom = pending.unresolvedRandom > 0;
            if (endTurnCancelButton) {
                endTurnCancelButton.style.opacity = '1';
            }
            if (endTurnOkButton) {
                endTurnOkButton.disabled = hasUnresolvedRandom;
                endTurnOkButton.style.opacity = hasUnresolvedRandom ? '0.4' : '1';
            }
        };

        const skillIsEnemyTargeting = (skill) => {
            const target = String(skill?.target || '').trim().toLowerCase();
            return (
                target === 'single-enemy' ||
                target === 'other-enemies' ||
                target === 'all-enemy' ||
                target === 'single-character'
            );
        };

        const isActorEnemyTargetingStunned = (actorUnit) => {
            const statuses = Array.isArray(actorUnit?.state?.statuses) ? actorUnit.state.statuses : [];
            return statuses.some((status) => status?.metadata?.cannotUseHarmfulSkills);
        };

        const isSkillBlockedByClassLock = (actorUnit, skill) => {
            const skillClasses = Array.isArray(skill?.classes)
                ? skill.classes
                    .map((entry) => (typeof entry === 'string' ? entry.trim().toLowerCase() : ''))
                    .filter(Boolean)
                : [];
            const statuses = Array.isArray(actorUnit?.state?.statuses) ? actorUnit.state.statuses : [];
            const isMental = skillClasses.includes('mental');
            if (statuses.some((status) => status?.metadata?.cannotUseNonMentalSkills) && !isMental) {
                return true;
            }
            if (!skillClasses.length) return false;
            const blockedClasses = new Set(
                statuses.flatMap((status) => {
                    const blocked = status?.metadata?.cannotUseSkillClasses;
                    if (!Array.isArray(blocked)) return [];
                    return blocked
                        .map((entry) => (typeof entry === 'string' ? entry.trim().toLowerCase() : ''))
                        .filter(Boolean);
                })
            );
            if (!blockedClasses.size) return false;
            return skillClasses.some((entry) => blockedClasses.has(entry));
        };

        const isSkillBlockedByIndexLock = (actorUnit, skillIdx) => {
            const statuses = Array.isArray(actorUnit?.state?.statuses) ? actorUnit.state.statuses : [];
            return statuses.some((status) => {
                const blocked = status?.metadata?.cannotUseSkillIndices;
                if (!Array.isArray(blocked)) return false;
                return blocked.some((entry) => Number.parseInt(entry, 10) === Number.parseInt(skillIdx, 10));
            });
        };

        const getSkillUsageState = (actorUnit, skill) => {
            const maxUses = Math.max(0, Number(skill?.maxUses) || 0);
            const skillId = typeof skill?.id === 'string' ? skill.id : '';
            const skillUses =
                actorUnit?.state?.skillUses && typeof actorUnit.state.skillUses === 'object'
                    ? actorUnit.state.skillUses
                    : {};
            const uses = skillId ? Math.max(0, Number(skillUses[skillId]) || 0) : 0;
            const isLimited = maxUses > 0;
            const isMaxed = isLimited && uses >= maxUses;
            return {
                isLimited,
                uses,
                maxUses,
                isMaxed,
                tooltipText: isLimited ? `Rex has used this skill ${uses} time${uses === 1 ? '' : 's'}.` : '',
            };
        };

        const isSkillBlockedByActorCondition = (actorUnit, skill) => {
            const usageState = getSkillUsageState(actorUnit, skill);
            if (usageState.isMaxed) return true;
            const condition = skill?.actorCondition;
            if (!condition || typeof condition !== 'object') return false;
            const statuses = Array.isArray(actorUnit?.state?.statuses) ? actorUnit.state.statuses : [];
            const hasStatusId = (statusId) =>
                statuses.some(
                    (status) =>
                        status?.id === statusId && Math.max(0, Number(status?.remainingTurns) || 0) > 0
                );
            if (condition?.statusId && !hasStatusId(condition.statusId)) return true;
            if (
                Array.isArray(condition?.statusIdsAny) &&
                condition.statusIdsAny.length > 0 &&
                !condition.statusIdsAny.some((statusId) => hasStatusId(statusId))
            ) {
                return true;
            }
            if (condition?.missingStatusId && hasStatusId(condition.missingStatusId)) return true;
            const currentHp = Math.max(0, Number(actorUnit?.hp) || 0);
            const hpAtMost = Number(condition?.sourceCurrentHpAtMost);
            if (Number.isFinite(hpAtMost) && currentHp > hpAtMost) return true;
            const hpAtLeast = Number(condition?.sourceCurrentHpAtLeast);
            if (Number.isFinite(hpAtLeast) && currentHp < hpAtLeast) return true;
            return false;
        };

        const updateSkillAffordability = () => {
            const isPlayersTurn =
                currentPlayerUsername && currentTurnUsername && currentPlayerUsername === currentTurnUsername;
            const playerUnits = currentPlayerUsername && latestBoardState
                ? latestBoardState[currentPlayerUsername]
                : null;
            const getCooldownRemainingForMeta = (meta, actorUnit) => {
                const cooldowns = actorUnit?.state?.cooldowns || {};
                const effectiveSkill = getEffectiveSkillForActorSlot(meta.actorSlot, meta.skillIdx) || meta?.skill;
                const skillId = effectiveSkill?.id;
                if (!skillId) return 0;
                return Math.max(0, Number(cooldowns[skillId]) || 0);
            };
            const isActorStunned = (actorUnit) => {
                const statuses = Array.isArray(actorUnit?.state?.statuses) ? actorUnit.state.statuses : [];
                return statuses.some((status) => status?.metadata?.cannotUseSkills);
            };
            playerSkillMetaByKey.forEach((meta, key) => {
                const imgEl = meta?.imgEl;
                if (!imgEl) return;
                const actorUnit = Array.isArray(playerUnits) ? playerUnits[meta.actorSlot] : null;
                const effectiveSkill = getEffectiveSkillForActorSlot(meta.actorSlot, meta.skillIdx) || meta?.skill;
                const usageState = getSkillUsageState(actorUnit, effectiveSkill);
                imgEl.title = usageState.tooltipText || '';
                const actorDead = isUnitDeadLike(actorUnit);
                if (actorDead) {
                    imgEl.style.opacity = '0.4';
                    return;
                }
                const cooldownRemaining = getCooldownRemainingForMeta(meta, actorUnit);
                if (cooldownRemaining > 0 || isActorStunned(actorUnit)) {
                    imgEl.style.opacity = '0.4';
                    return;
                }
                if (usageState.isMaxed) {
                    imgEl.style.opacity = '0.4';
                    return;
                }
                if (isActorEnemyTargetingStunned(actorUnit) && skillIsEnemyTargeting(effectiveSkill)) {
                    imgEl.style.opacity = '0.4';
                    return;
                }
                if (isSkillBlockedByClassLock(actorUnit, effectiveSkill)) {
                    imgEl.style.opacity = '0.4';
                    return;
                }
                if (isSkillBlockedByIndexLock(actorUnit, meta.skillIdx)) {
                    imgEl.style.opacity = '0.4';
                    return;
                }
                if (isSkillBlockedByActorCondition(actorUnit, effectiveSkill)) {
                    imgEl.style.opacity = '0.4';
                    return;
                }
                if (!isPlayersTurn) {
                    imgEl.style.opacity = '0.4';
                    return;
                }
                const queued = getQueuedSkillForActorSlot(meta.actorSlot);
                if (queued && queued.skillIndex === meta.skillIdx) {
                    imgEl.style.opacity = '1';
                    return;
                }
                imgEl.style.opacity = canAffordSkillWithPendingReservations(
                    effectiveSkill?.energy,
                    meta.actorSlot,
                    effectiveSkill
                )
                    ? '1'
                    : '0.4';
            });
        };

        const getCooldownBadgeForImage = (imgEl) => {
            if (!imgEl) return null;
            const container = imgEl.closest('.skillscrollingame');
            if (!container) return null;
            const actorSlot = imgEl.dataset.actorSlot;
            const skillIdx = imgEl.dataset.skillIdx;
            const selector =
                `.skill-cooldown-badge[data-actor-slot="${actorSlot}"][data-skill-idx="${skillIdx}"]`;
            const existing = container.querySelector(selector);
            if (existing) return existing;
            const badge = document.createElement('div');
            badge.className = 'skill-cooldown-badge';
            badge.dataset.actorSlot = actorSlot || '';
            badge.dataset.skillIdx = skillIdx || '';
            container.appendChild(badge);
            return badge;
        };

        const renderSkillCooldownBadges = (data) => {
            const board = data?.board && typeof data.board === 'object' ? data.board : null;
            const playerUnits = currentPlayerUsername && board ? board[currentPlayerUsername] : null;
            playerSkillMetaByKey.forEach((meta) => {
                if (!meta?.imgEl) return;
                const badge = getCooldownBadgeForImage(meta.imgEl);
                if (!badge) return;
                const actorUnit = Array.isArray(playerUnits) ? playerUnits[meta.actorSlot] : null;
                const cooldowns = actorUnit?.state?.cooldowns || {};
                const effectiveSkill = getEffectiveSkillForActorSlot(meta.actorSlot, meta.skillIdx) || meta?.skill;
                const skillId = effectiveSkill?.id || '';
                const cooldownRemaining = skillId ? Math.max(0, Number(cooldowns[skillId]) || 0) : 0;
                if (cooldownRemaining > 0) {
                    badge.textContent = String(cooldownRemaining);
                    badge.style.display = 'flex';
                } else {
                    badge.textContent = '';
                    badge.style.display = 'none';
                }
                const rect = meta.imgEl.getBoundingClientRect();
                const parentRect = meta.imgEl.parentElement.getBoundingClientRect();
                badge.style.left = `${rect.left - parentRect.left}px`;
                badge.style.top = `${rect.top - parentRect.top}px`;
                badge.style.width = `${rect.width}px`;
                badge.style.height = `${rect.height}px`;
            });
        };

        const applyQueuedSkillVisuals = () => {
            const pending = normalizePendingTurn(pendingTurnState);
            const nextQueuedKeys = new Set();
            Object.values(pending.queuedByActorSlot || {}).forEach((queued) => {
                const key = `${queued.actorSlot}:${queued.skillIndex}`;
                nextQueuedKeys.add(key);
                const meta = playerSkillMetaByKey.get(key);
                if (!meta?.imgEl) return;
                meta.imgEl.classList.add('selected-target');
                if (!queuedSkillKeySet.has(key) || !meta.imgEl.style.transform) {
                    animateSkillToQueue(meta.imgEl);
                }
            });
            queuedSkillKeySet.forEach((key) => {
                if (nextQueuedKeys.has(key)) return;
                const meta = playerSkillMetaByKey.get(key);
                if (!meta?.imgEl) return;
                meta.imgEl.classList.remove('selected-target');
                meta.imgEl.style.transform = '';
            });
            queuedSkillKeySet = nextQueuedKeys;
            renderSkillOrderQueue();
            updateSkillAffordability();
            renderQueuedTargetTooltips();
            renderDynamicSkillIcons();
        };

        const getOrderedQueuedEntries = () => {
            const pending = normalizePendingTurn(pendingTurnState);
            const bySlot = pending.queuedByActorSlot || {};
            const ordered = [];
            const used = new Set();
            pending.queueOrder.forEach((slot) => {
                const key = String(slot);
                const queued = bySlot[key];
                if (!queued) return;
                ordered.push(queued);
                used.add(key);
            });
            Object.entries(bySlot).forEach(([slotKey, queued]) => {
                if (used.has(slotKey)) return;
                ordered.push(queued);
            });
            return ordered;
        };

        const reorderQueuedSkills = async (actorSlots = []) => {
            if (!matchIdFromUrl) return;
            try {
                const response = await fetch(
                    `${API_BASE_URL}/api/match/${encodeURIComponent(matchIdFromUrl)}/skill/reorder`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ actorSlots }),
                    }
                );
                const data = await response.json();
                if (!response.ok || !data?.ok) {
                    throw new Error(data?.error || 'Unable to reorder queued skills.');
                }
                pendingTurnState = normalizePendingTurn(data.pendingTurn);
                applyQueuedSkillVisuals();
                syncTurnState(data.currentTurn, data.turnExpiresAt, data.turnDurationMs);
            } catch (error) {
                console.warn('Failed to reorder queued skills.', error);
            }
        };

        const renderSkillOrderQueue = () => {
            if (!skillOrderEl) return;
            const queuedEntries = getOrderedQueuedEntries();
            skillOrderEl.innerHTML = '';
            queuedEntries.forEach((queued) => {
                const actorSlot = Number.parseInt(queued.actorSlot, 10);
                const skillIdx = Number.parseInt(queued.skillIndex, 10);
                const meta = playerSkillMetaByKey.get(`${actorSlot}:${skillIdx}`);
                const effectiveSkill = getEffectiveSkillForActorSlot(actorSlot, skillIdx) || meta?.skill;
                const preview = document.createElement('img');
                preview.className = 'skillpreview';
                preview.alt = effectiveSkill?.name || `Queued Skill ${skillIdx + 1}`;
                preview.src = effectiveSkill?.skillimage || '';
                preview.draggable = true;
                preview.dataset.actorSlot = String(actorSlot);
                preview.dataset.skillIndex = String(skillIdx);
                preview.addEventListener('dragstart', () => {
                    draggingQueueActorSlot = actorSlot;
                    preview.classList.add('dragging');
                });
                preview.addEventListener('dragend', () => {
                    draggingQueueActorSlot = null;
                    preview.classList.remove('dragging');
                });
                preview.addEventListener('dragover', (event) => {
                    event.preventDefault();
                });
                preview.addEventListener('drop', (event) => {
                    event.preventDefault();
                    if (!Number.isInteger(draggingQueueActorSlot)) return;
                    const targetSlot = Number.parseInt(preview.dataset.actorSlot, 10);
                    if (!Number.isInteger(targetSlot) || targetSlot === draggingQueueActorSlot) return;
                    const currentOrder = getOrderedQueuedEntries().map((entry) =>
                        Number.parseInt(entry.actorSlot, 10)
                    );
                    const fromIdx = currentOrder.indexOf(draggingQueueActorSlot);
                    const toIdx = currentOrder.indexOf(targetSlot);
                    if (fromIdx < 0 || toIdx < 0) return;
                    const nextOrder = currentOrder.slice();
                    const [moved] = nextOrder.splice(fromIdx, 1);
                    nextOrder.splice(toIdx, 0, moved);
                    reorderQueuedSkills(nextOrder).catch((error) =>
                        console.warn('Queued reorder failed.', error)
                    );
                });
                skillOrderEl.appendChild(preview);
            });
        };

        const clearTargetHighlights = () => {
            document.querySelectorAll('.target-overlay').forEach((el) => el.remove());
        };

        const getCardByUsernameSlot = (username, slot) => {
            if (!Number.isInteger(slot) || slot < 0) return null;
            if (username === currentPlayerUsername) return playerCards[slot] || null;
            if (username === currentOpponentUsername) return enemyCards[slot] || null;
            return null;
        };

        const renderTargetHighlights = (options) => {
            clearTargetHighlights();
            if (!options || !Array.isArray(options.targets)) return;
            options.targets.forEach((target) => {
                const card = getCardByUsernameSlot(target.username, target.slot);
                if (!card) return;
                const face = card.querySelector('.character-face');
                if (!face) return;
                const overlay = document.createElement('div');
                overlay.className = 'target-overlay';
                face.parentElement?.appendChild(overlay);
            });
        };

        const animateSkillToQueue = (skillEl) => {
            const skillScroll = skillEl?.closest('.skillscrollingame');
            if (!skillScroll) return;
            const queueEl = skillScroll.querySelector('.skillqueue');
            if (!queueEl) return;
            // Reset before measuring
            skillEl.style.transform = '';
            const skillRect = skillEl.getBoundingClientRect();
            const queueRect = queueEl.getBoundingClientRect();
            const dx = queueRect.left - skillRect.left;
            const dy = queueRect.top - skillRect.top;
            skillEl.style.transform = `translate(${dx}px, ${dy}px)`;
        };

        const updateTimerBar = () => {
            if (!timerBar) return;
            if (!turnExpiresAtMs) {
                timerBar.style.width = `${TIMER_MAX_WIDTH}px`;
                return;
            }
            const remaining = Math.max(0, turnExpiresAtMs - Date.now());
            const ratio = remaining / Math.max(1, currentTurnDurationMs || TURN_DURATION_MS);
            const widthPx = Math.max(0, Math.round(TIMER_MAX_WIDTH * ratio));
            timerBar.style.width = `${widthPx}px`;
            if (
                remaining <= 0 &&
                currentPlayerUsername &&
                currentTurnUsername === currentPlayerUsername &&
                normalizePendingTurn(pendingTurnState).unresolvedRandom === 0 &&
                !normalizePendingTurn(pendingTurnState).turnStartChoice &&
                !autoEndRequested
            ) {
                autoEndRequested = true;
                endTurnDueToTimeout();
            }
        };

        const startTimerLoop = () => {
            if (turnTimerInterval) return;
            turnTimerInterval = setInterval(updateTimerBar, 200);
        };

        const endTurnDueToTimeout = async () => {
            if (!matchIdFromUrl) return;
            try {
                await fetch(`${API_BASE_URL}/api/match/${encodeURIComponent(matchIdFromUrl)}/turn/end`, {
                    method: 'POST',
                    credentials: 'include',
                });
            } catch (error) {
                console.warn('Failed to auto-end turn on timeout.', error);
            }
        };

        const syncTurnState = (turnOwner, turnExpiresAt, turnDurationMs) => {
            const parsedExpiry = turnExpiresAt ? new Date(turnExpiresAt).getTime() : null;
            const turnChanged = turnOwner && turnOwner !== lastTurnOwner;
            const resolvedDurationMs = Math.max(1000, Number(turnDurationMs) || TURN_DURATION_MS);
            if (turnChanged) {
                lastTurnOwner = turnOwner;
                autoEndRequested = false;
            }
            currentTurnDurationMs = resolvedDurationMs;
            if (parsedExpiry) {
                turnExpiresAtMs = parsedExpiry;
            } else if (turnChanged) {
                turnExpiresAtMs = Date.now() + currentTurnDurationMs;
            }
            currentTurnUsername = turnOwner || null;
            const isPlayersTurn = currentPlayerUsername && currentTurnUsername
                ? currentPlayerUsername === currentTurnUsername
                : false;
            if (turnChanged && hasInitializedTurnState && isPlayersTurn) {
                playIngameSound(startRoundSound);
            }
            if (turnOwner && !hasInitializedTurnState) {
                hasInitializedTurnState = true;
            }
            if (!currentPlayerUsername || !currentTurnUsername) {
                setSkillInteractivity(true);
                startTimerLoop();
                updateTimerBar();
                clearTargetHighlights();
                updateSkillAffordability();
                return;
            }
            const turnStartChoice = normalizePendingTurn(pendingTurnState).turnStartChoice;
            const hasTurnStartChoice = Boolean(
                turnStartChoice &&
                    Array.isArray(turnStartChoice.options) &&
                    turnStartChoice.options.length > 0
            );
            setSkillInteractivity(isPlayersTurn);
            startTimerLoop();
            updateTimerBar();
            if (isPlayersTurn && hasTurnStartChoice) {
                setSkillInteractivity(false);
                const popupKey = `${turnStartChoice.sourceStatusId || ''}:${turnStartChoice.usesUsed || 0}`;
                if (activeTurnStartChoiceKey !== popupKey) {
                    activeTurnStartChoiceKey = popupKey;
                    openTurnStartChoicePopup({
                        promptText: turnStartChoice.promptText || "Choose Doctor's Bag effect.",
                        options: turnStartChoice.options || [],
                    });
                }
            } else {
                if (activeChoicePopupMode === 'turn-start') {
                    closeClassChoicePopup();
                }
            }
            if (!isPlayersTurn) {
                const skillImgs = Array.from(
                    document.querySelectorAll('.player-characters .skillscrollingame .skillimage')
                );
                skillImgs.forEach((img) => {
                    img.classList.remove('selected-target');
                    img.style.transform = '';
                });
                queuedSkillKeySet.clear();
                clearTargetHighlights();
                activeTargetOptions = null;
                activeCastingSkill = null;
                closeEndTurnModal();
                if (activeChoicePopupMode === 'turn-start') {
                    closeClassChoicePopup();
                }
            }
            updateSkillAffordability();
        };

        try {
            const cachedUser = JSON.parse(localStorage.getItem('narutoUser') || '{}');
            if (cachedUser?.username) {
                currentPlayerUsername = cachedUser.username;
            }
        } catch (error) {
            console.warn('Unable to parse cached user for ingame turn state.', error);
        }

        const renderChakra = (pool = {}) => {
            if (!chakraDisplay) return;
            const normalizedPool = normalizePool(pool);
            playerPoolState = normalizedPool;
            Object.entries(chakraCountEls || {}).forEach(([type, el]) => {
                if (!el) return;
                if (type === 'total') {
                    const totalAmount =
                        normalizedPool.taijutsu +
                        normalizedPool.ninjutsu +
                        normalizedPool.bloodline +
                        normalizedPool.genjutsu;
                    el.textContent = `x ${totalAmount}`;
                } else {
                    const amount = normalizedPool[type] || 0;
                    el.textContent = `x ${amount}`;
                }
            });
            updateSkillAffordability();
            if (exchangeModalEl && exchangeModalEl.style.visibility === 'visible') {
                renderExchangeModal(normalizedPool);
            }
        };

        const renderEndTurnModal = (pool = {}, pending = null) => {
            const normalizedPool = normalizePool(pool);
            const normalizedPending = normalizePendingTurn(pending);
            Object.entries(normalizedPool).forEach(([type, amount]) => {
                const leftEl = endTurnLeftAmountEls[type];
                if (leftEl) {
                    leftEl.textContent = String(amount);
                }
            });
            Object.entries(normalizedPending.randomAssignments).forEach(([type, amount]) => {
                const rightEl = endTurnRightAmountEls[type];
                if (rightEl) {
                    rightEl.textContent = String(amount);
                }
            });
            if (endTurnChooseCountEl) {
                endTurnChooseCountEl.textContent = String(normalizedPending.unresolvedRandom || 0);
            }
            updateEndTurnButtons();
        };

        const openEndTurnModal = () => {
            if (!endTurnModalEl || !matchIdFromUrl) return;
            // Show immediately from the last known client state; refresh in the background below.
            endTurnModalEl.style.visibility = 'visible';
            renderEndTurnModal(playerPoolState, pendingTurnState);
            fetch(`${API_BASE_URL}/api/match/${encodeURIComponent(matchIdFromUrl)}`, {
                credentials: 'include',
            })
                .then(async (res) => {
                    if (!res.ok) {
                        throw new Error('Unable to load match state.');
                    }
                    const data = await res.json();
                    if (!data?.ok) {
                        throw new Error('Unable to load match state.');
                    }
                    if (data.player?.username) {
                        currentPlayerUsername = data.player.username;
                    }
                    const playerPool = data.chakraPools?.[currentPlayerUsername] || {};
                    pendingTurnState = normalizePendingTurn(data.pendingTurn);
                    if (endTurnModalEl?.style.visibility === 'visible') {
                        renderEndTurnModal(playerPool, pendingTurnState);
                    }
                })
                .catch((error) => {
                    console.warn('Unable to load end turn chakra preview.', error);
                });
        };

        const closeEndTurnModal = () => {
            if (!endTurnModalEl) return;
            endTurnModalEl.style.visibility = 'hidden';
        };

        const getExchangeTypeFromButton = (button) => {
            return (
                resolveChakraType(button?.getAttribute('data-chakra-type')) ||
                resolveChakraType(button?.getAttribute('aria-label'))
            );
        };

        const updateExchangeChoiceUi = () => {
            exchangeChoiceButtons.forEach((button) => {
                const type = getExchangeTypeFromButton(button);
                button.classList.toggle('selected', type === selectedExchangeType);
            });
        };

        const getExchangeAssignedTotal = () =>
            chakraTypes.reduce(
                (sum, type) => sum + Math.max(0, Number(exchangeSpendAssignments?.[type]) || 0),
                0
            );

        const adjustExchangeSpend = (chakraType, delta) => {
            if (!chakraTypes.includes(chakraType)) return;
            const current = Math.max(0, Number(exchangeSpendAssignments[chakraType]) || 0);
            const assignedTotal = getExchangeAssignedTotal();
            if (delta > 0) {
                if (assignedTotal >= EXCHANGE_CHAKRA_COST) return;
                const availableFromPool = Math.max(0, Number(playerPoolState[chakraType]) || 0);
                if (current >= availableFromPool) return;
                exchangeSpendAssignments[chakraType] = current + 1;
                return;
            }
            if (delta < 0 && current > 0) {
                exchangeSpendAssignments[chakraType] = current - 1;
            }
        };

        const renderExchangeModal = (pool = {}) => {
            if (!exchangeModalEl) return;
            const normalizedPool = normalizePool(pool);
            const columns = Array.from(exchangeModalEl.querySelectorAll('.exchange_chakra_column'));
            const leftRows = Array.from(columns[0]?.querySelectorAll('.exchange_chakra_row') || []);
            const rightRows = Array.from(columns[1]?.querySelectorAll('.exchange_chakra_row') || []);
            leftRows.forEach((row) => {
                const name = getRowChakraType(row);
                const amountEl = row.querySelector('.chakra-amount');
                if (!name || !amountEl) return;
                const assigned = Math.max(0, Number(exchangeSpendAssignments[name]) || 0);
                amountEl.textContent = String(Math.max(0, (normalizedPool[name] || 0) - assigned));
            });
            rightRows.forEach((row) => {
                const name = getRowChakraType(row);
                const amountEl = row.querySelector('.chakra-amount');
                if (!name || !amountEl) return;
                amountEl.textContent = String(Math.max(0, Number(exchangeSpendAssignments[name]) || 0));
            });
            if (exchangeChooseCountEl) {
                const remaining = Math.max(0, EXCHANGE_CHAKRA_COST - getExchangeAssignedTotal());
                exchangeChooseCountEl.textContent = String(remaining);
            }
            if (exchangeOkButton) {
                const ready = getExchangeAssignedTotal() === EXCHANGE_CHAKRA_COST;
                exchangeOkButton.disabled = !ready;
                exchangeOkButton.style.opacity = ready ? '1' : '0.45';
            }
            updateExchangeChoiceUi();
        };

        const openExchangeModal = () => {
            if (!exchangeModalEl || battleEndShown) return;
            if (!currentPlayerUsername || !currentTurnUsername) return;
            if (currentPlayerUsername !== currentTurnUsername) return;
            closeEndTurnModal();
            exchangeSpendAssignments = emptyPool();
            renderExchangeModal(playerPoolState);
            exchangeModalEl.style.visibility = 'visible';
        };

        const closeExchangeModal = () => {
            if (!exchangeModalEl) return;
            exchangeSpendAssignments = emptyPool();
            renderExchangeModal(playerPoolState);
            exchangeModalEl.style.visibility = 'hidden';
        };

        const openSurrenderConfirm = () => {
            if (!surrenderConfirmEl) return;
            surrenderConfirmEl.style.visibility = 'visible';
        };

        const closeSurrenderConfirm = () => {
            if (!surrenderConfirmEl) return;
            surrenderConfirmEl.style.visibility = 'hidden';
        };

        const stopMatchRealtime = () => {
            clearMatchSocketReconnect();
            closeMatchSocket();
            if (turnTimerInterval) {
                clearInterval(turnTimerInterval);
                turnTimerInterval = null;
            }
        };

        const getAliveCountFromUnits = (units) => {
            if (!Array.isArray(units)) return 0;
            return units.reduce((sum, unit) => {
                const isDead = isUnitDeadLike(unit);
                return sum + (isDead ? 0 : 1);
            }, 0);
        };

        const showBattleEndOverlay = ({ didWin, opponentUsername, expDelta = null, clanExpDelta = null }) => {
            if (!battleEndOverlayEl || battleEndShown) return;
            const opponent = (opponentUsername || currentOpponentUsername || 'UNKNOWN').trim();
            const isLadderMatch = currentMatchMode === 'ladder';
            const normalizedExpDelta = Number.isFinite(Number(expDelta)) ? Number(expDelta) : 0;
            const expMagnitude = Math.abs(normalizedExpDelta).toLocaleString();
            const normalizedClanExpDelta = Math.max(0, Number(clanExpDelta) || 0);
            const clanExpLine =
                normalizedClanExpDelta > 0
                    ? `<br>YOUR CLAN GAINED ${normalizedClanExpDelta.toLocaleString()} EXP`
                    : '';
            if (battleEndPortraitEl) {
                battleEndPortraitEl.src = didWin ? 'win.png' : 'lose.png';
                battleEndPortraitEl.alt = didWin ? 'Victory portrait' : 'Defeated portrait';
            }
            if (battleEndTitleEl) {
                battleEndTitleEl.textContent = didWin ? 'WINNER' : 'LOSER';
            }
            if (battleEndMessageEl) {
                battleEndMessageEl.innerHTML = didWin
                    ? isLadderMatch
                        ? `YOU WON A LADDER BATTLE AGAINST ${opponent}.<br>YOU GAINED ${expMagnitude} EXP${clanExpLine}`
                        : currentMatchMode === 'private'
                            ? `YOU WIN!<br>YOU WON A PRIVATE GAME AGAINST ${opponent}`
                        : `CONGRATULATIONS!<br>YOU HAVE WON A QUICK BATTLE AGAINST ${opponent}.`
                    : isLadderMatch
                        ? `YOU LOST A LADDER BATTLE AGAINST ${opponent}.<br>YOU LOST ${expMagnitude} EXP`
                        : currentMatchMode === 'private'
                            ? `TOO BAD!<br>YOU LOST A PRIVATE GAME AGAINST ${opponent}`
                        : `TOO BAD!<br>YOU HAVE LOST A QUICK BATTLE AGAINST ${opponent}.`;
            }
            battleEndOverlayEl.classList.add('visible');
            battleEndShown = true;
            playIngameSound(didWin ? winSound : lostSound);
            stopMatchRealtime();
            closeEndTurnModal();
            closeExchangeModal();
            closeSurrenderConfirm();
            clearTargetHighlights();
            activeTargetOptions = null;
            activeCastingSkill = null;
        };

        const MAX_HP = 100;
        const HEALTH_BAR_MAX_WIDTH = 75;
        const renderUnitHealth = (card, unit) => {
            if (!card) return;
            const healthBar = card.querySelector('.health-bar');
            const healthText = card.querySelector('.health-text');
            if (!healthBar || !healthText) return;
            const rawHp = isUnitBanished(unit) ? 0 : Number(unit?.hp);
            const hp = Math.max(0, Math.min(MAX_HP, Number.isFinite(rawHp) ? rawHp : MAX_HP));
            const ratio = hp / MAX_HP;
            const width = Math.max(0, Math.round(HEALTH_BAR_MAX_WIDTH * ratio));
            healthBar.style.width = `${width}px`;
            healthBar.classList.remove('hp-mid', 'hp-low');
            if (hp <= 30) {
                healthBar.classList.add('hp-low');
            } else if (hp <= 60) {
                healthBar.classList.add('hp-mid');
            }
            healthText.textContent = `${hp}/${MAX_HP}`;
            const face = card.querySelector('.character-face');
            const dead = isUnitDeadLike(unit) || hp <= 0;
            if (face) {
                const aliveSrc = face.dataset.aliveSrc || face.src;
                if (!face.dataset.aliveSrc) {
                    face.dataset.aliveSrc = aliveSrc;
                }
                if (dead) {
                    face.src = 'deadcharacter.png';
                    return;
                }
                const statuses = Array.isArray(unit?.state?.statuses) ? unit.state.statuses : [];
                const faceOverride = statuses
                    .find(
                        (status) =>
                            (Number(status?.remainingTurns) || 0) > 0 &&
                            typeof status?.metadata?.facePictureOverride === 'string' &&
                            status.metadata.facePictureOverride.trim()
                    )
                    ?.metadata?.facePictureOverride;
                face.src = faceOverride || face.dataset.aliveSrc;
            }
        };

        const renderBoardHealth = (data) => {
            if (!data || typeof data !== 'object') return;
            const board = data.board && typeof data.board === 'object' ? data.board : null;
            if (!board) return;
            const previousBoard = latestBoardState;
            const unitDiedBetweenStates = (previousUnit, nextUnit) => {
                const prevHp = Number(previousUnit?.hp);
                const nextHp = Number(nextUnit?.hp);
                const wasAlive =
                    previousUnit &&
                    previousUnit.alive !== false &&
                    (!Number.isFinite(prevHp) || prevHp > 0);
                const isDead =
                    nextUnit &&
                    (nextUnit.alive === false || (Number.isFinite(nextHp) && nextHp <= 0));
                return Boolean(wasAlive && isDead);
            };
            const detectAnyDeath = () => {
                if (!previousBoard || typeof previousBoard !== 'object') return false;
                return Object.keys(board).some((username) => {
                    const nextUnits = Array.isArray(board[username]) ? board[username] : [];
                    const prevUnits = Array.isArray(previousBoard[username]) ? previousBoard[username] : [];
                    return nextUnits.some((nextUnit, slot) =>
                        unitDiedBetweenStates(prevUnits[slot], nextUnit)
                    );
                });
            };
            latestBoardState = board;
            if (detectAnyDeath()) {
                playIngameSound(deathSound);
            }
            const playerUnits = currentPlayerUsername ? board[currentPlayerUsername] : null;
            const opponentUsername = data.opponent?.username || currentOpponentUsername;
            const opponentUnits = opponentUsername ? board[opponentUsername] : null;

            if (Array.isArray(playerCards) && Array.isArray(playerUnits)) {
                playerCards.forEach((card, slot) => renderUnitHealth(card, playerUnits[slot]));
            }
            if (Array.isArray(enemyCards) && Array.isArray(opponentUnits)) {
                enemyCards.forEach((card, slot) => renderUnitHealth(card, opponentUnits[slot]));
            }
        };

        const findSkillById = (skillId) => {
            if (!skillId || !Array.isArray(rosterData)) return null;
            for (const character of rosterData) {
                const skills = Array.isArray(character?.skills) ? character.skills : [];
                const match = skills.find((skill) => skill?.id === skillId);
                if (match) return match;
            }
            return null;
        };

        const findTooltipTextByStatusId = (statusId) => {
            if (!statusId || !Array.isArray(rosterData)) return null;
            for (const character of rosterData) {
                const skills = Array.isArray(character?.skills) ? character.skills : [];
                for (const skill of skills) {
                    const effects = Array.isArray(skill?.effects) ? skill.effects : [];
                    const effect = effects.find(
                        (entry) => entry?.type === 'apply_status' && entry?.statusId === statusId
                    );
                    const text = effect?.metadata?.tooltipText;
                    if (typeof text === 'string' && text.trim()) {
                        return text.trim();
                    }
                }
            }
            return null;
        };

        const escapeHtml = (value) =>
            String(value ?? '')
                .replaceAll('&', '&amp;')
                .replaceAll('<', '&lt;')
                .replaceAll('>', '&gt;')
                .replaceAll('"', '&quot;')
                .replaceAll("'", '&#39;');

        const ensureGlobalStatusTooltip = () => {
            if (globalStatusTooltipEl) return globalStatusTooltipEl;
            const tooltip = document.createElement('div');
            tooltip.className = 'global-status-tooltip';
            tooltip.style.display = 'none';
            document.body.appendChild(tooltip);
            globalStatusTooltipEl = tooltip;
            return tooltip;
        };

        const getTemplateMetadataValue = (metadata = {}, key = '') => {
            if (!metadata || typeof metadata !== 'object' || !key) return undefined;
            if (metadata[key] !== undefined && metadata[key] !== null) {
                return metadata[key];
            }
            const normalizedKey = String(key).toLowerCase();
            const matchedEntry = Object.entries(metadata).find(([entryKey, entryValue]) => {
                if (entryValue === undefined || entryValue === null) return false;
                return String(entryKey).toLowerCase() === normalizedKey;
            });
            return matchedEntry ? matchedEntry[1] : undefined;
        };

        const renderTooltipTemplate = (template, metadata = {}, overrides = {}) => {
            if (typeof template !== 'string' || !template) return template;
            return template.replace(/\{([a-zA-Z0-9_]+)\}|\[([a-zA-Z0-9_]+)\]/g, (_, braceKey, bracketKey) => {
                const key = braceKey || bracketKey || '';
                if (Object.prototype.hasOwnProperty.call(overrides, key)) {
                    return String(overrides[key]);
                }
                const value = getTemplateMetadataValue(metadata, key);
                if (value === undefined || value === null) {
                    return braceKey ? `{${key}}` : `[${key}]`;
                }
                if (typeof value === 'number') {
                    return Number.isFinite(value) ? String(value) : '0';
                }
                return String(value);
            });
        };

        const positionGlobalStatusTooltip = (
            event,
            anchorEl = null,
            preferRightFromAnchor = false,
            preferLeftOfCursor = false
        ) => {
            const tooltip = ensureGlobalStatusTooltip();
            const offset = 12;
            const rect = tooltip.getBoundingClientRect();
            let left;
            let top;
            if (preferLeftOfCursor) {
                left = event.clientX - rect.width - offset;
                top = event.clientY + offset;
                if (left < 8) {
                    left = Math.min(window.innerWidth - rect.width - 8, event.clientX + offset);
                }
            } else if (anchorEl && preferRightFromAnchor) {
                const anchorRect = anchorEl.getBoundingClientRect();
                left = anchorRect.right + 8;
                top = anchorRect.top + 4;
                if (left + rect.width > window.innerWidth - 8) {
                    left = window.innerWidth - rect.width - 8;
                }
                if (left < 8) {
                    left = 8;
                }
            } else {
                left = event.clientX + offset;
                top = event.clientY + offset;
                if (left + rect.width > window.innerWidth - 8) {
                    left = Math.max(8, event.clientX - rect.width - offset);
                }
            }
            if (top + rect.height > window.innerHeight - 8) {
                const fallbackTop = anchorEl
                    ? anchorEl.getBoundingClientRect().bottom - rect.height - 4
                    : event.clientY - rect.height - offset;
                top = Math.max(8, fallbackTop);
            }
            tooltip.style.left = `${left}px`;
            tooltip.style.top = `${top}px`;
        };

        const renderStatusTooltipForCard = (card, unit, unitUsername = '') => {
            if (!card) return;
            const tooltipWrap = card.querySelector('.skilltooltips');
            const tooltipImgTemplate =
                tooltipWrap?.querySelector('.skilltooltipimage.status-icon-template') ||
                tooltipWrap?.querySelector('.skilltooltipimage');
            if (!tooltipWrap || !tooltipImgTemplate) return;
            const tentenWeaponStatusIconById = {
                tenten_weapon_last_shuriken: 'https://i.imgur.com/ZcuORyu.png',
                tenten_weapon_last_kunai: 'https://i.imgur.com/aibtrUO.png',
                tenten_weapon_last_sword: 'https://i.imgur.com/RchMcXa.png',
                tenten_weapon_last_hooked_sword: 'https://i.imgur.com/6j0UNBG.png',
                tenten_weapon_last_scythe: 'https://i.imgur.com/NXDITvE.png',
                tenten_weapon_last_mace: 'https://i.imgur.com/iRZ8SMk.png',
            };
            const rexAmmoStatusIconById = {
                rex_splode_explosive_baton_usage: 'https://i.imgur.com/rSLzlpG.png',
                rex_splode_explosive_baton_usage_tracker: 'https://i.imgur.com/rSLzlpG.png',
                rex_splode_explosive_pocket_change_usage: 'https://i.imgur.com/rSLzlpG.png',
                rex_splode_explosive_pocket_change_usage_tracker: 'https://i.imgur.com/rSLzlpG.png',
                rex_splode_ammo_swap_tracker: 'https://i.imgur.com/rSLzlpG.png',
                rex_splode_pocket_change_swap_tracker: 'https://i.imgur.com/rSLzlpG.png',
                rex_splode_explosive_baton_spent: 'https://i.imgur.com/rSLzlpG.png',
                rex_splode_explosive_pocket_change_spent: 'https://i.imgur.com/rSLzlpG.png',
            };
            const resolveStatusIconSrc = (group, statusSkill) => {
                const statusesInGroup = Array.isArray(group?.statuses) ? group.statuses : [];
                for (const status of statusesInGroup) {
                    const mapped = tentenWeaponStatusIconById[status?.id];
                    if (mapped) return mapped;
                    const rexMapped = rexAmmoStatusIconById[status?.id];
                    if (rexMapped) return rexMapped;
                }
                return statusSkill?.skillimage || '';
            };
            if (!tooltipImgTemplate.classList.contains('status-icon-template')) {
                tooltipImgTemplate.classList.add('status-icon-template');
            }
            const dead = isUnitDeadLike(unit);
            if (dead) {
                tooltipWrap
                    .querySelectorAll('.skilltooltipimage.dynamic-status-icon')
                    .forEach((node) => node.remove());
                tooltipWrap.style.visibility = 'hidden';
                tooltipWrap.classList.remove('has-status');
                tooltipImgTemplate.removeAttribute('title');
                tooltipImgTemplate.style.display = 'none';
                if (globalStatusTooltipEl) {
                    globalStatusTooltipEl.style.display = 'none';
                    globalStatusTooltipEl.innerHTML = '';
                }
                return;
            }
            const isEnemySide = Boolean(tooltipWrap.closest('.enemy-characters'));
            const statuses = Array.isArray(unit?.state?.statuses)
                ? unit.state.statuses.filter(
                    (status) =>
                        (Number(status?.remainingTurns) || 0) > 0 &&
                        !Boolean(status?.metadata?.hideTooltip) &&
                        !(isEnemySide && Boolean(status?.metadata?.hideTooltipFromEnemy)) &&
                        !(
                            currentPlayerUsername === unitUsername &&
                            (Boolean(status?.metadata?.hideTooltipFromOwner) ||
                                Boolean(status?.metadata?.hideTooltipFromUnitOwner))
                        )
                )
                : [];
            tooltipWrap
                .querySelectorAll('.skilltooltipimage.dynamic-status-icon')
                .forEach((node) => node.remove());
            if (!statuses.length) {
                tooltipWrap.style.visibility = 'hidden';
                tooltipImgTemplate.removeAttribute('title');
                tooltipWrap.classList.remove('has-status');
                tooltipImgTemplate.style.display = 'none';
                return;
            }
            tooltipWrap.style.visibility = 'visible';
            tooltipWrap.classList.add('has-status');
            const groupedStatuses = [];
            const groupByKey = new Map();
            statuses.forEach((status, index) => {
                const key = status?.sourceSkillId ? `skill:${status.sourceSkillId}` : `status:${status?.id}:${index}`;
                if (!groupByKey.has(key)) {
                    const group = {
                        key,
                        sourceSkillId: status?.sourceSkillId || null,
                        statuses: [],
                    };
                    groupByKey.set(key, group);
                    groupedStatuses.push(group);
                }
                groupByKey.get(key).statuses.push(status);
            });

            const buildStatusTooltipHtml = (group, statusSkill) => {
                const groupStatuses = Array.isArray(group?.statuses) ? group.statuses : [];
                const skillName =
                    statusSkill?.name ||
                    groupStatuses[0]?.metadata?.sourceSkillName ||
                    'Status';
                const groupedDamageDebuffTotal = groupStatuses.reduce((sum, status) => {
                    return sum + Math.max(0, Number(status?.metadata?.DamageDebuff) || 0);
                }, 0);
                const groupedNonAfflictionDebuffTotal = groupStatuses.reduce((sum, status) => {
                    return sum + Math.max(0, Number(status?.metadata?.NonAfflictionDamageDebuff) || 0);
                }, 0);
                const groupedTurnEndDamageTotal = groupStatuses.reduce((sum, status) => {
                    return sum + Math.max(0, Number(status?.metadata?.turnEndDamage) || 0);
                }, 0);
                const formatTurnsLabel = (remainingTurns) => {
                    const remaining = Math.max(0, Number(remainingTurns) || 0);
                    if (remaining >= 99) return 'Infinite';
                    return `${remaining} TURN${remaining === 1 ? '' : 'S'} LEFT`;
                };
                const textRows = [];
                groupStatuses.forEach((status) => {
                    const statusMetadata = status?.metadata || {};
                    let text =
                        statusMetadata?.tooltipText ||
                        findTooltipTextByStatusId(status?.id) ||
                        status?.id ||
                        'Status effect';
                    const tooltipTemplate =
                        typeof statusMetadata?.tooltipTextTemplate === 'string'
                            ? statusMetadata.tooltipTextTemplate
                            : '';
                    const pendingRestoreTooltipTemplate =
                        typeof statusMetadata?.destructibleDefenseRestore?.pendingTooltipTextTemplate === 'string'
                            ? statusMetadata.destructibleDefenseRestore.pendingTooltipTextTemplate
                            : '';
                    const restoreTurnsLeft = Math.max(
                        0,
                        Number(statusMetadata?._destructibleDefenseRestoreTurnsLeft) || 0
                    );
                    const runtimeTooltipTemplate =
                        restoreTurnsLeft > 0 && pendingRestoreTooltipTemplate
                            ? pendingRestoreTooltipTemplate
                            : tooltipTemplate;
                    if (runtimeTooltipTemplate) {
                        const stackKey =
                            typeof statusMetadata?.stackMetadataKey === 'string'
                                ? statusMetadata.stackMetadataKey
                                : '';
                        text = renderTooltipTemplate(runtimeTooltipTemplate, statusMetadata, {
                            ...(stackKey
                                ? { stacks: Math.max(0, Number(statusMetadata?.[stackKey]) || 0) }
                                : {}),
                            restoreTurnsLeft,
                            ...(groupedTurnEndDamageTotal > 0 ? { turnEndDamage: groupedTurnEndDamageTotal } : {}),
                            ...(groupedNonAfflictionDebuffTotal > 0
                                ? { NonAfflictionDamageDebuff: groupedNonAfflictionDebuffTotal }
                                : {}),
                            ...(groupedDamageDebuffTotal > 0 ? { DamageDebuff: groupedDamageDebuffTotal } : {}),
                        });
                    }
                    const hasCustomTooltipText = Boolean(statusMetadata?.tooltipText || runtimeTooltipTemplate);
                    if (groupedNonAfflictionDebuffTotal > 0 && !hasCustomTooltipText) {
                        const ownDebuff = Math.max(
                            0,
                            Number(status?.metadata?.NonAfflictionDamageDebuff) || 0
                        );
                        if (ownDebuff > 0) {
                            text = `This character deals ${groupedNonAfflictionDebuffTotal} less non-affliction damage.`;
                        }
                    }
                    if (groupedDamageDebuffTotal > 0 && !hasCustomTooltipText) {
                        const ownDebuff = Math.max(0, Number(status?.metadata?.DamageDebuff) || 0);
                        if (ownDebuff > 0) {
                            text = `This character deals ${groupedDamageDebuffTotal} less damage.`;
                        }
                    }
                    const skillDamageBonuses =
                        status?.metadata?.skillDamageBonuses &&
                        typeof status.metadata.skillDamageBonuses === 'object'
                            ? status.metadata.skillDamageBonuses
                            : null;
                    if (skillDamageBonuses && !hasCustomTooltipText) {
                        const bonusLines = Object.entries(skillDamageBonuses)
                            .map(([skillId, value]) => {
                                const bonus = Number(value) || 0;
                                if (!skillId || bonus <= 0) return null;
                                const bonusSkill = findSkillById(skillId);
                                const bonusSkillName = bonusSkill?.name || 'This skill';
                                return `${bonusSkillName} deals ${bonus} additional permanent damage.`;
                            })
                            .filter(Boolean);
                        if (bonusLines.length > 0) {
                            text = bonusLines.join(' ');
                        }
                    }
                    const byRemaining = status?.metadata?.skillReplacementsByRemainingTurns;
                    if (byRemaining && typeof byRemaining === 'object') {
                        const remaining = Math.max(0, Number(status?.remainingTurns) || 0);
                        const replacements =
                            byRemaining[String(remaining)] || byRemaining[remaining] || null;
                        if (replacements && typeof replacements === 'object') {
                            const firstReplacementId = Object.values(replacements).find((id) => Boolean(id));
                            const replacementSkill = findSkillById(firstReplacementId);
                            const replacementName = replacementSkill?.name || null;
                            if (replacementName) {
                                if (text.includes('replaced by: .')) {
                                    text = text.replace('replaced by: .', `replaced by: ${replacementName}.`);
                                } else if (text.includes('replaced by:')) {
                                    text = `${text} ${replacementName}`;
                                }
                            }
                        }
                    }
                    const remaining = Math.max(0, Number(status?.remainingTurns) || 0);
                    const key = `${text}::${remaining}`;
                    if (textRows.some((row) => row.key === key)) return;
                    textRows.push({
                        key,
                        text,
                        remaining,
                    });
                });
                const textLinesHtml = textRows
                    .map((row, idx) => {
                        const line =
                            `<div class="status-tooltip-desc-line">- ${escapeHtml(row.text)}</div>`;
                        const turns =
                            `<div class="status-tooltip-turns">${escapeHtml(formatTurnsLabel(row.remaining))}</div>`;
                        const divider =
                            idx < textRows.length - 1
                                ? `<div class="status-tooltip-line-divider"></div>`
                                : '';
                        return `${line}${turns}${divider}`;
                    })
                    .join('');
                return (
                    `<div class="status-tooltip-item">` +
                        `<div class="status-tooltip-title">${escapeHtml(skillName)}</div>` +
                        `<div class="status-tooltip-desc">${textLinesHtml}</div>` +
                    `</div>`
                );
            };

            groupedStatuses.forEach((group, index) => {
                const statusSkill = findSkillById(group?.sourceSkillId);
                const iconEl =
                    index === 0 ? tooltipImgTemplate : tooltipImgTemplate.cloneNode(true);
                if (index > 0) {
                    iconEl.classList.remove('status-icon-template');
                    iconEl.classList.add('dynamic-status-icon');
                } else {
                    iconEl.classList.remove('dynamic-status-icon');
                }
                iconEl.style.display = 'block';
                iconEl.removeAttribute('title');
                const iconSrc = resolveStatusIconSrc(group, statusSkill);
                if (iconSrc) {
                    iconEl.src = iconSrc;
                }
                const tooltipHtml = buildStatusTooltipHtml(group, statusSkill);
                iconEl.onmouseenter = (event) => {
                    const tooltip = ensureGlobalStatusTooltip();
                    tooltip.innerHTML = tooltipHtml;
                    tooltip.style.display = 'block';
                    const anchor = iconEl;
                    positionGlobalStatusTooltip(event, anchor, false, isEnemySide);
                };
                iconEl.onmousemove = (event) => {
                    if (!globalStatusTooltipEl || globalStatusTooltipEl.style.display === 'none') return;
                    const anchor = iconEl;
                    positionGlobalStatusTooltip(event, anchor, false, isEnemySide);
                };
                iconEl.onmouseleave = () => {
                    if (!globalStatusTooltipEl) return;
                    globalStatusTooltipEl.style.display = 'none';
                    globalStatusTooltipEl.innerHTML = '';
                };
                if (index > 0) {
                    tooltipWrap.appendChild(iconEl);
                }
            });
        };

        const renderBoardStatuses = (data) => {
            if (!data || typeof data !== 'object') return;
            const board = data.board && typeof data.board === 'object' ? data.board : null;
            if (!board) return;
            const playerUnits = currentPlayerUsername ? board[currentPlayerUsername] : null;
            const opponentUsername = data.opponent?.username || currentOpponentUsername;
            const opponentUnits = opponentUsername ? board[opponentUsername] : null;
            if (Array.isArray(playerCards) && Array.isArray(playerUnits)) {
                playerCards.forEach((card, slot) =>
                    renderStatusTooltipForCard(card, playerUnits[slot], currentPlayerUsername || '')
                );
            }
            if (Array.isArray(enemyCards) && Array.isArray(opponentUnits)) {
                enemyCards.forEach((card, slot) =>
                    renderStatusTooltipForCard(card, opponentUnits[slot], opponentUsername || '')
                );
            }
        };

        const applyMatchState = (data) => {
            if (!data || typeof data !== 'object') return;
            if (battleEndShown) return;
            if (data.player?.username) {
                currentPlayerUsername = data.player.username;
            }
            if (typeof data.mode === 'string' && data.mode.trim()) {
                currentMatchMode = data.mode.trim().toLowerCase();
            }
            if (data.opponent?.username) {
                const nextOpponentUsername = data.opponent.username;
                const nextOpponentDisplayName =
                    data.opponent.displayName ||
                    (isGameBotUsername(nextOpponentUsername) ? 'Game Bot' : nextOpponentUsername);
                const opponentChanged = nextOpponentUsername !== currentOpponentUsername;
                currentOpponentUsername = nextOpponentUsername;
                currentOpponentDisplayName = nextOpponentDisplayName;
                if (opponentChanged) {
                    if (data.opponent.isBot) {
                        applyOpponentIdentity({
                            name: nextOpponentDisplayName,
                            avatarUrl: defaultProfileAvatar,
                            ladder: null,
                        });
                    } else {
                        hydrateOpponentIdentity(nextOpponentUsername).catch(() => {});
                    }
                }
            }
            const pool = data.chakraPools?.[currentPlayerUsername] || playerPoolState || emptyPool();
            renderChakra(pool);
            renderBoardHealth(data);
            renderBoardStatuses(data);
            renderSkillCooldownBadges(data);
            pendingTurnState = normalizePendingTurn(data.pendingTurn);
            applyQueuedSkillVisuals();
            if (endTurnModalEl && endTurnModalEl.style.visibility === 'visible') {
                renderEndTurnModal(pool, pendingTurnState);
            }
            if (data.status === 'ended') {
                const didWin = Boolean(data.winner && data.winner === currentPlayerUsername);
                const opponentFromResult = didWin ? data.surrenderedBy : data.winner;
                showBattleEndOverlay({
                    didWin,
                    opponentUsername:
                        (data.opponent?.isBot ? data.opponent.displayName : null) ||
                        (opponentFromResult && isGameBotUsername(opponentFromResult) ? 'Game Bot' : opponentFromResult) ||
                        data.opponent?.displayName ||
                        data.opponent?.username ||
                        currentOpponentDisplayName ||
                        currentOpponentUsername,
                    expDelta: data.ladderResult?.expDelta,
                    clanExpDelta: data.ladderResult?.clanExpDelta,
                });
                return;
            }
            const playerAlive = getAliveCountFromUnits(data.board?.[currentPlayerUsername] || []);
            const opponentAlive = getAliveCountFromUnits(data.board?.[currentOpponentUsername] || []);
            if (
                currentPlayerUsername &&
                currentOpponentUsername &&
                (playerAlive <= 0 || opponentAlive <= 0)
            ) {
                if (currentMatchMode === 'ladder') {
                    return;
                }
                showBattleEndOverlay({
                    didWin: playerAlive > opponentAlive,
                    opponentUsername: currentOpponentDisplayName || currentOpponentUsername,
                });
                return;
            }
            syncTurnState(data.currentTurn, data.turnExpiresAt, data.turnDurationMs);
        };

        setSkillInteractivity(true);
        renderChakra();

        const energyClassMap = {
            ninjutsu: 'blue',
            bloodline: 'red',
            taijutsu: 'green',
            genjutsu: 'white',
            random: 'black',
        };

        const renderQueuedTargetTooltips = () => {
            const allCards = [...(Array.isArray(playerCards) ? playerCards : []), ...(Array.isArray(enemyCards) ? enemyCards : [])];
            allCards.forEach((card) => {
                const wrap = card?.querySelector('.skilltooltips');
                if (!wrap) return;
                wrap.querySelectorAll('.skilltooltipimage.dynamic-queued-target-icon').forEach((node) => node.remove());
            });

            const pending = normalizePendingTurn(pendingTurnState);
            const queuedByTargetKey = new Map();
            Object.values(pending.queuedByActorSlot || {}).forEach((queued) => {
                const actorSlot = Number.parseInt(queued?.actorSlot, 10);
                const skillIdx = Number.parseInt(queued?.skillIndex, 10);
                const effectiveSkill = getEffectiveSkillForActorSlot(actorSlot, skillIdx);
                const iconSrc = effectiveSkill?.skillimage || '';
                const selection = Array.isArray(queued?.targetSelection)
                    ? queued.targetSelection
                    : queued?.targetSelection
                        ? [queued.targetSelection]
                        : [];
                selection.forEach((target) => {
                    const username = target?.username;
                    const slot = Number.parseInt(target?.slot, 10);
                    if (!username || !Number.isInteger(slot) || slot < 0) return;
                    const unit = latestBoardState?.[username]?.[slot];
                    if (unit && isUnitDeadLike(unit)) return;
                    const card = getCardByUsernameSlot(username, slot) || (
                        username === currentPlayerUsername
                            ? (Array.isArray(playerCards) ? playerCards[slot] : null)
                            : (Array.isArray(enemyCards) ? enemyCards[slot] : null)
                    );
                    if (!card) return;
                    const key = `${username}:${slot}`;
                    if (!queuedByTargetKey.has(key)) {
                        queuedByTargetKey.set(key, {
                            card,
                            entries: [],
                        });
                    }
                    queuedByTargetKey.get(key).entries.push({
                        iconSrc,
                        skillName: effectiveSkill?.name || 'Queued Skill',
                    });
                });
            });

            queuedByTargetKey.forEach(({ card, entries }) => {
                const tooltipWrap = card?.querySelector('.skilltooltips');
                const tooltipImgTemplate =
                    tooltipWrap?.querySelector('.skilltooltipimage.status-icon-template') ||
                    tooltipWrap?.querySelector('.skilltooltipimage');
                if (!tooltipWrap || !tooltipImgTemplate) return;
                if (!tooltipImgTemplate.classList.contains('status-icon-template')) {
                    tooltipImgTemplate.classList.add('status-icon-template');
                }
                tooltipWrap.style.visibility = 'visible';
                entries.forEach((entry) => {
                    const iconEl = tooltipImgTemplate.cloneNode(true);
                    iconEl.classList.remove('status-icon-template', 'dynamic-status-icon');
                    iconEl.classList.add('dynamic-queued-target-icon');
                    iconEl.style.display = 'block';
                    if (entry.iconSrc) {
                        iconEl.src = entry.iconSrc;
                    }
                    iconEl.title = `Targeted by: ${entry.skillName}`;
                    tooltipWrap.appendChild(iconEl);
                });
            });
        };

        const renderSkillInfo = (character, skill, actorSlot = null, skillIdx = null) => {
            if (!skill || !character) return;
            const actorUnit =
                actorSlot !== null && currentPlayerUsername && latestBoardState?.[currentPlayerUsername]
                    ? latestBoardState[currentPlayerUsername][actorSlot]
                    : null;
            const usageState = getSkillUsageState(actorUnit, skill);
            if (skillInfo.imgEl) {
                skillInfo.imgEl.src = skill.skillimage || '';
                skillInfo.imgEl.alt = skill.name || 'Skill';
            }
            if (skillInfo.nameEl) {
                skillInfo.nameEl.textContent = skill.name || 'Skill';
            }
            if (skillInfo.descEl) {
                const baseDescription = skill.skilldescription || '';
                skillInfo.descEl.textContent = baseDescription;
            }
            if (skillInfo.cooldownEl) {
                skillInfo.cooldownEl.textContent = `Cooldown: ${skill.cooldown ?? '-'}`;
            }
            if (skillInfo.classesEl) {
                const classes = getVisibleSkillClasses(skill.classes).join(', ');
                skillInfo.classesEl.textContent = `Classes: ${classes}`;
            }
            if (skillInfo.classPickerWrapEl && skillInfo.classPickerEl) {
                const options = getClassChoiceOptions(skill);
                const picker = skillInfo.classPickerEl;
                const key = getClassChoiceKey(actorSlot, skillIdx);
                if (!options.length || !key) {
                    skillInfo.classPickerWrapEl.style.display = 'none';
                    picker.innerHTML = '';
                } else {
                    const queuedForActor = getQueuedSkillForActorSlot(actorSlot);
                    const queuedChoice =
                        queuedForActor && Number.parseInt(queuedForActor.skillIndex, 10) === skillIdx
                            ? normalizeClassChoice(queuedForActor.classChoice)
                            : '';
                    const storedChoice = normalizeClassChoice(classChoiceBySkillKey.get(key));
                    const selectedChoice = [queuedChoice, storedChoice, options[0]].find(
                        (entry) => entry && options.includes(entry)
                    );
                    classChoiceBySkillKey.set(key, selectedChoice);
                    skillInfo.classPickerWrapEl.style.display = 'flex';
                    picker.innerHTML = '';
                    options.forEach((optionValue) => {
                        const optionEl = document.createElement('option');
                        optionEl.value = optionValue;
                        optionEl.textContent = formatClassChoiceLabel(optionValue);
                        picker.appendChild(optionEl);
                    });
                    picker.value = selectedChoice;
                    picker.onchange = () => {
                        const next = normalizeClassChoice(picker.value);
                        if (!next || !options.includes(next)) return;
                        classChoiceBySkillKey.set(key, next);
                        if (
                            activeCastingSkill &&
                            activeCastingSkill.actorSlot === actorSlot &&
                            activeCastingSkill.skillIdx === skillIdx
                        ) {
                            activeCastingSkill.classChoice = next;
                        }
                    };
                }
            }
            if (skillInfo.energyEl) {
                skillInfo.energyEl.innerHTML = '';
                const label = document.createElement('span');
                label.textContent = 'Energy:';
                skillInfo.energyEl.appendChild(label);
                const effectiveEnergy = getEffectiveEnergyList(skill.energy || [], actorSlot, skill);
                if (!effectiveEnergy.length) {
                    const noneText = document.createElement('span');
                    noneText.className = 'energy-none';
                    noneText.textContent = ' none';
                    skillInfo.energyEl.appendChild(noneText);
                    return;
                }
                effectiveEnergy.forEach((type) => {
                    const box = document.createElement('span');
                    const normalized = typeof type === 'string' ? type.trim().toLowerCase() : '';
                    const cls = energyClassMap[normalized];
                    box.className = ['chakra-box', cls].filter(Boolean).join(' ');
                    if (!cls) {
                        box.style.backgroundColor = '#000';
                    }
                    skillInfo.energyEl.appendChild(box);
                });
            }
        };

        const renderDynamicSkillIcons = () => {
            playerSkillMetaByKey.forEach((meta) => {
                if (!meta?.imgEl) return;
                const effectiveSkill = getEffectiveSkillForActorSlot(meta.actorSlot, meta.skillIdx) || meta?.baseSkill;
                if (!effectiveSkill) return;
                const actorUnit = latestBoardState?.[currentPlayerUsername]?.[meta.actorSlot];
                const usageState = getSkillUsageState(actorUnit, effectiveSkill);
                meta.skill = effectiveSkill;
                meta.imgEl.src = effectiveSkill.skillimage || '';
                meta.imgEl.alt = effectiveSkill.name || `Skill ${meta.skillIdx + 1}`;
                meta.imgEl.title = usageState.tooltipText || '';
            });
        };

        const applyIncomingMatchState = (data, { playEntrySound = false } = {}) => {
            if (!data || typeof data !== 'object') return;
            if (data.player?.username) {
                currentPlayerUsername = data.player.username;
            }
            if (
                playEntrySound &&
                !hasPlayedMatchEntrySound &&
                data.player?.username &&
                data.currentTurn
            ) {
                playIngameSound(
                    data.player.username === data.currentTurn ? startFirstSound : secondPlayerStartSound
                );
                hasPlayedMatchEntrySound = true;
            }
            applyMatchState(data);
            renderDynamicSkillIcons();
        };

        const clearMatchSocketReconnect = () => {
            if (matchSocketReconnectTimer) {
                clearTimeout(matchSocketReconnectTimer);
                matchSocketReconnectTimer = null;
            }
        };

        const connectMatchSocket = () => {
            if (!matchIdFromUrl || battleEndShown || typeof WebSocket === 'undefined') return;
            if (
                matchSocket &&
                (matchSocket.readyState === WebSocket.OPEN ||
                    matchSocket.readyState === WebSocket.CONNECTING)
            ) {
                return;
            }
            clearMatchSocketReconnect();
            matchSocketManuallyClosed = false;
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const socketUrl = `${protocol}//${window.location.host}/ws?matchId=${encodeURIComponent(matchIdFromUrl)}`;
            const socket = new WebSocket(socketUrl);
            matchSocket = socket;
            socket.addEventListener('open', () => {
                matchSocketReconnectDelay = 1000;
            });
            socket.addEventListener('message', (event) => {
                try {
                    const message = JSON.parse(event.data);
                    if (message?.type === 'match_state' && message.payload) {
                        applyIncomingMatchState(message.payload);
                    }
                } catch (error) {
                    console.warn('Failed to process match socket message.', error);
                }
            });
            socket.addEventListener('close', () => {
                if (matchSocket === socket) {
                    matchSocket = null;
                }
                if (matchSocketManuallyClosed || battleEndShown || !matchIdFromUrl) {
                    return;
                }
                clearMatchSocketReconnect();
                matchSocketReconnectTimer = setTimeout(() => {
                    matchSocketReconnectTimer = null;
                    connectMatchSocket();
                }, matchSocketReconnectDelay);
                matchSocketReconnectDelay = Math.min(matchSocketReconnectDelay * 2, 10000);
            });
            socket.addEventListener('error', () => {
                try {
                    socket.close();
                } catch (error) {
                    // Ignore socket close failures.
                }
            });
        };

        const closeMatchSocket = () => {
            matchSocketManuallyClosed = true;
            clearMatchSocketReconnect();
            if (!matchSocket) return;
            try {
                matchSocket.close();
            } catch (error) {
                // Ignore socket close failures.
            }
            matchSocket = null;
        };

        window.addEventListener('beforeunload', closeMatchSocket);

        const fetchTargetOptions = async (actorSlot, skillIdx, skill = null) => {
            if (!matchIdFromUrl) return;
            clearTargetHighlights();
            activeTargetOptions = null;
            activeCastingSkill = null;
            try {
                const res = await fetch(
                    `${API_BASE_URL}/api/match/${encodeURIComponent(matchIdFromUrl)}/skill/targets`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ actorSlot, skillIndex: skillIdx }),
                    }
                );
                if (!res.ok) {
                    throw new Error('Unable to fetch targets.');
                }
                const data = await res.json();
                if (!data?.ok) {
                    throw new Error('Unable to fetch targets.');
                }
                pendingTurnState = normalizePendingTurn(data.pendingTurn);
                applyQueuedSkillVisuals();
                activeTargetOptions = data;
                const skillEl = playerSkillMetaByKey.get(`${actorSlot}:${skillIdx}`)?.imgEl || null;
                const classChoiceOptions = getClassChoiceOptions(skill);
                const key = getClassChoiceKey(actorSlot, skillIdx);
                const classChoice = normalizeClassChoice(classChoiceBySkillKey.get(key));
                activeCastingSkill = {
                    actorSlot,
                    skillIdx,
                    skillEl,
                    classChoiceOptions,
                    classChoice:
                        classChoiceOptions.length > 0 && classChoiceOptions.includes(classChoice)
                            ? classChoice
                            : classChoiceOptions[0] || null,
                };
                renderTargetHighlights(data);
            } catch (error) {
                console.warn('Target fetch failed.', error);
                activeTargetOptions = null;
                activeCastingSkill = null;
            }
        };

        const getValidTargetKeySet = () => {
            if (!activeTargetOptions || !Array.isArray(activeTargetOptions.targets)) return new Set();
            return new Set(activeTargetOptions.targets.map((t) => `${t.username}:${t.slot}`));
        };

        const closeClassChoicePopup = () => {
            pendingQueuePayload = null;
            pendingTurnStartChoicePayload = null;
            activeTurnStartChoiceKey = '';
            activeChoicePopupMode = '';
            if (!classChoicePopupEl) return;
            classChoicePopupEl.classList.remove('visible');
            classChoicePopupEl.setAttribute('aria-hidden', 'true');
            if (classChoicePopupOptionsEl) {
                classChoicePopupOptionsEl.innerHTML = '';
            }
            if (classChoicePopupTitleEl) {
                classChoicePopupTitleEl.textContent = 'Choose Class';
            }
            if (classChoicePopupCancelButton) {
                classChoicePopupCancelButton.style.display = '';
            }
        };

        const queueSelectedSkill = ({ actorSlot, skillIdx, selection, classChoice = null }) => {
            if (!matchIdFromUrl) return Promise.resolve();
            return fetch(`${API_BASE_URL}/api/match/${encodeURIComponent(matchIdFromUrl)}/skill/queue`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    actorSlot,
                    skillIndex: skillIdx,
                    targetSelection: selection,
                    ...(classChoice ? { classChoice } : {}),
                }),
            })
                .then(async (response) => {
                    const data = await response.json();
                    if (!response.ok || !data?.ok) {
                        throw new Error(data?.error || 'Unable to queue skill.');
                    }
                    playIngameSound(applySkillSound);
                    renderChakra(data.chakraPools?.[currentPlayerUsername] || emptyPool());
                    pendingTurnState = normalizePendingTurn(data.pendingTurn);
                    applyQueuedSkillVisuals();
                    syncTurnState(data.currentTurn, data.turnExpiresAt, data.turnDurationMs);
                })
                .catch((error) => {
                    console.warn('Failed to queue skill.', error);
                })
                .finally(() => {
                    closeClassChoicePopup();
                    clearTargetHighlights();
                    activeTargetOptions = null;
                    activeCastingSkill = null;
                });
        };

        const openClassChoicePopup = ({ actorSlot, skillIdx, selection, options = [] }) => {
            if (!classChoicePopupEl || !classChoicePopupOptionsEl || !options.length) return;
            activeChoicePopupMode = 'skill-class';
            pendingQueuePayload = { actorSlot, skillIdx, selection };
            pendingTurnStartChoicePayload = null;
            classChoicePopupOptionsEl.innerHTML = '';
            if (classChoicePopupTitleEl) {
                classChoicePopupTitleEl.textContent = 'Choose Class';
            }
            if (classChoicePopupCancelButton) {
                classChoicePopupCancelButton.style.display = '';
            }
            options.forEach((optionValue) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.textContent = formatClassChoiceLabel(optionValue);
                button.addEventListener('click', () => {
                    const key = getClassChoiceKey(actorSlot, skillIdx);
                    if (key) classChoiceBySkillKey.set(key, optionValue);
                    queueSelectedSkill({
                        actorSlot,
                        skillIdx,
                        selection,
                        classChoice: optionValue,
                    });
                });
                classChoicePopupOptionsEl.appendChild(button);
            });
            classChoicePopupEl.classList.add('visible');
            classChoicePopupEl.setAttribute('aria-hidden', 'false');
        };

        const resolveTurnStartChoice = async (choiceKey) => {
            if (!matchIdFromUrl || !choiceKey || !pendingTurnStartChoicePayload) return;
            try {
                const response = await fetch(
                    `${API_BASE_URL}/api/match/${encodeURIComponent(matchIdFromUrl)}/turn/start-choice`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ choiceKey }),
                    }
                );
                const data = await response.json();
                if (!response.ok || !data?.ok) {
                    throw new Error(data?.error || 'Unable to resolve choice.');
                }
                pendingTurnState = normalizePendingTurn(data.pendingTurn);
                applyMatchState({
                    ok: true,
                    player: data.player || { username: currentPlayerUsername },
                    opponent: data.opponent || { username: currentOpponentUsername },
                    board: data.board || latestBoardState,
                    currentTurn: data.currentTurn,
                    turnExpiresAt: data.turnExpiresAt,
                    turnDurationMs: data.turnDurationMs,
                    pendingTurn: data.pendingTurn,
                    chakraPools: data.chakraPools || { [currentPlayerUsername]: playerPoolState },
                    status: data.status || 'active',
                });
                playIngameSound(applySkillSound);
            } catch (error) {
                console.warn('Failed to resolve turn start choice.', error);
            } finally {
                closeClassChoicePopup();
                clearTargetHighlights();
                activeTargetOptions = null;
                activeCastingSkill = null;
            }
        };

        const openTurnStartChoicePopup = ({ promptText = '', options = [] }) => {
            if (!classChoicePopupEl || !classChoicePopupOptionsEl || !options.length) return;
            activeChoicePopupMode = 'turn-start';
            pendingTurnStartChoicePayload = { promptText, options };
            pendingQueuePayload = null;
            classChoicePopupOptionsEl.innerHTML = '';
            if (classChoicePopupTitleEl) {
                classChoicePopupTitleEl.textContent = promptText || "Doctor's Bag";
            }
            if (classChoicePopupCancelButton) {
                classChoicePopupCancelButton.style.display = 'none';
            }
            options.forEach((optionValue) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.textContent = optionValue.label || formatClassChoiceLabel(optionValue.key);
                button.addEventListener('click', () => {
                    activeTurnStartChoiceKey = optionValue.key || '';
                    resolveTurnStartChoice(optionValue.key || '');
                });
                classChoicePopupOptionsEl.appendChild(button);
            });
            classChoicePopupEl.classList.add('visible');
            classChoicePopupEl.setAttribute('aria-hidden', 'false');
        };

        const handleCardTargetClick = (event) => {
            if (!activeTargetOptions || !activeCastingSkill || !matchIdFromUrl) return;
            if (event?.button !== undefined && event.button !== 0) return;
            event.preventDefault();
            event.stopPropagation();
            const card = event.currentTarget;
            const username = card.dataset.username;
            const slot = Number.parseInt(card.dataset.slot, 10);
            const validKeys = getValidTargetKeySet();
            if (!validKeys.has(`${username}:${slot}`)) return;
            const selection =
                activeTargetOptions.mode === 'all'
                    ? activeTargetOptions.targets.map((t) => ({ username: t.username, slot: t.slot }))
                    : { username, slot };
            const classChoiceOptions = Array.isArray(activeCastingSkill.classChoiceOptions)
                ? activeCastingSkill.classChoiceOptions
                : [];
            if (classChoiceOptions.length > 0) {
                clearTargetHighlights();
                openClassChoicePopup({
                    actorSlot: activeCastingSkill.actorSlot,
                    skillIdx: activeCastingSkill.skillIdx,
                    selection,
                    options: classChoiceOptions,
                });
                return;
            }
            queueSelectedSkill({
                actorSlot: activeCastingSkill.actorSlot,
                skillIdx: activeCastingSkill.skillIdx,
                selection,
            });
        };

        if (classChoicePopupCancelButton) {
            classChoicePopupCancelButton.addEventListener('click', () => {
                if (activeChoicePopupMode === 'turn-start') return;
                closeClassChoicePopup();
                clearTargetHighlights();
                activeTargetOptions = null;
                activeCastingSkill = null;
            });
        }
        if (classChoicePopupEl) {
            classChoicePopupEl.addEventListener('click', (event) => {
                if (event.target !== classChoicePopupEl) return;
                if (activeChoicePopupMode === 'turn-start') return;
                closeClassChoicePopup();
                clearTargetHighlights();
                activeTargetOptions = null;
                activeCastingSkill = null;
            });
        }

        const attachCardTargetHandlers = (cards, username) => {
            cards.forEach((card, slot) => {
                if (!card) return;
                card.dataset.username = username;
                card.dataset.slot = slot;
                card.removeEventListener('pointerdown', handleCardTargetClick);
                card.addEventListener('pointerdown', handleCardTargetClick);
            });
        };

        const loadMatchForIngame = async () => {
            const matchId = matchIdFromUrl;
            if (!matchId || !Array.isArray(rosterData)) return;
            try {
                const response = await fetch(`${API_BASE_URL}/api/match/${encodeURIComponent(matchId)}`, {
                    credentials: 'include',
                });
                const data = await response.json();
                if (!data?.ok) return;

                const playerCardsLocal = Array.from(document.querySelectorAll('.player-characters .character-card'));
                const enemyCardsLocal = Array.from(document.querySelectorAll('.enemy-characters .character-card'));
                playerCardsLocal.forEach((card) => card && card.classList.remove('targetable'));
                if (!playerCardsLocal.length || !enemyCardsLocal.length) return;
                const team = data.player?.team || [];
                const enemyTeam = data.opponent?.team || [];
                if (!Array.isArray(team) || team.length !== playerCardsLocal.length) return;
                if (!Array.isArray(enemyTeam) || enemyTeam.length !== enemyCardsLocal.length) return;
                playerSkillMetaByKey.clear();

                const playerNameEl = document.querySelector('.player-name.red');
                if (playerNameEl && data.player?.username) {
                    playerNameEl.textContent = data.player.username;
                }
                const enemyNameEl = document.querySelector('.player-right .player-name.red');
                if (enemyNameEl && data.opponent?.username) {
                    const nextOpponentUsername = data.opponent.username;
                    const nextOpponentDisplayName = data.opponent.displayName || (isGameBotUsername(nextOpponentUsername) ? 'Game Bot' : nextOpponentUsername);
                    enemyNameEl.textContent = nextOpponentDisplayName;
                    const opponentChanged = nextOpponentUsername !== currentOpponentUsername;
                    currentOpponentUsername = nextOpponentUsername;
                    currentOpponentDisplayName = nextOpponentDisplayName;
                    if (opponentChanged) {
                        if (data.opponent.isBot) {
                            applyOpponentIdentity({
                                name: nextOpponentDisplayName,
                                avatarUrl: defaultProfileAvatar,
                                ladder: null,
                            });
                        } else {
                            hydrateOpponentIdentity(nextOpponentUsername).catch(() => {});
                        }
                    }
                }

                const populateCard = (card, rosterIndex, isPlayer, slotIndex) => {
                    const character = rosterData[rosterIndex];
                    if (!character) return;
                    const face = card.querySelector('.character-face');
                    if (face) {
                        face.src = character.facePicture || '';
                        face.alt = character.name || 'Character';
                        face.dataset.aliveSrc = face.src;
                    }
                    const tooltipWrap = card.querySelector('.skilltooltips');
                    const tooltipImg = card.querySelector('.skilltooltips .skilltooltipimage');
                    if (tooltipWrap && tooltipImg) {
                        tooltipWrap.style.visibility = 'hidden';
                        tooltipImg.title = '';
                    }
                    const skillImgs = Array.from(card.querySelectorAll('.skillscrollingame .skillimage'));
                    if (Array.isArray(character.skills)) {
                        skillImgs.forEach((imgEl, skillIdx) => {
                    const skill = character.skills[skillIdx];
                    if (!skill) return;
                    imgEl.src = skill.skillimage || '';
                    imgEl.alt = skill.name || `Skill ${skillIdx + 1}`;
                            imgEl.dataset.actorSlot = String(slotIndex);
                            imgEl.dataset.skillIdx = String(skillIdx);
                            if (isPlayer) {
                                const key = `${slotIndex}:${skillIdx}`;
                                playerSkillMetaByKey.set(key, {
                                    actorSlot: slotIndex,
                                    skillIdx,
                                    skill,
                                    baseSkill: skill,
                                    imgEl,
                                });
                                imgEl.style.cursor = 'pointer';
                                const existingSkillClickHandler = imgEl._skillClickHandler;
                                if (typeof existingSkillClickHandler === 'function') {
                                    imgEl.removeEventListener('pointerdown', existingSkillClickHandler);
                                }
                                const onSkillClick = (event) => {
                                    if (event?.button !== undefined && event.button !== 0) return;
                                    event.preventDefault();
                                    event.stopPropagation();
                                    const effectiveSkill =
                                        getEffectiveSkillForActorSlot(slotIndex, skillIdx) || skill;
                                    renderSkillInfo(character, effectiveSkill, slotIndex, skillIdx);
                                    if (!currentPlayerUsername || currentPlayerUsername !== currentTurnUsername) {
                                        return;
                                    }
                                    const queued = getQueuedSkillForActorSlot(slotIndex);
                                    if (queued && queued.skillIndex === skillIdx) {
                                        clearTargetHighlights();
                                        activeTargetOptions = null;
                                        activeCastingSkill = null;
                                        fetch(
                                            `${API_BASE_URL}/api/match/${encodeURIComponent(
                                                matchIdFromUrl
                                            )}/skill/cancel`,
                                            {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                credentials: 'include',
                                                body: JSON.stringify({ actorSlot: slotIndex }),
                                            }
                                        )
                                            .then(async (response) => {
                                                const data = await response.json();
                                                if (!response.ok || !data?.ok) {
                                                    throw new Error(data?.error || 'Unable to cancel skill.');
                                                }
                                                renderChakra(
                                                    data.chakraPools?.[currentPlayerUsername] || emptyPool()
                                                );
                                                pendingTurnState = normalizePendingTurn(data.pendingTurn);
                                                applyQueuedSkillVisuals();
                                                syncTurnState(data.currentTurn, data.turnExpiresAt, data.turnDurationMs);
                                            })
                                            .catch((error) => console.warn('Failed to cancel skill.', error));
                                        return;
                                    }
                                    const actorUnit = latestBoardState?.[currentPlayerUsername]?.[slotIndex];
                                    const actorStatuses = Array.isArray(actorUnit?.state?.statuses)
                                        ? actorUnit.state.statuses
                                        : [];
                                    if (actorStatuses.some((status) => status?.metadata?.cannotUseSkills)) {
                                        return;
                                    }
                                    if (
                                        actorStatuses.some((status) => status?.metadata?.cannotUseHarmfulSkills) &&
                                        skillIsEnemyTargeting(effectiveSkill)
                                    ) {
                                        return;
                                    }
                                    if (isSkillBlockedByClassLock(actorUnit, effectiveSkill)) {
                                        return;
                                    }
                                    if (isSkillBlockedByIndexLock(actorUnit, skillIdx)) {
                                        return;
                                    }
                                    if (isSkillBlockedByActorCondition(actorUnit, effectiveSkill)) {
                                        return;
                                    }
                                    const cooldowns = actorUnit?.state?.cooldowns || {};
                                    const cooldownRemaining = effectiveSkill?.id
                                        ? Math.max(0, Number(cooldowns[effectiveSkill.id]) || 0)
                                        : 0;
                                    if (cooldownRemaining > 0) {
                                        return;
                                    }
                                    if (!canAffordSkill(effectiveSkill?.energy, playerPoolState, slotIndex, effectiveSkill)) {
                                        return;
                                    }
                                    fetchTargetOptions(slotIndex, skillIdx, effectiveSkill).catch(() =>
                                        clearTargetHighlights()
                                    );
                                };
                                imgEl._skillClickHandler = onSkillClick;
                                imgEl.addEventListener('pointerdown', onSkillClick);
                            }
                        });
                    }
                };

                playerCardsLocal.forEach((card, idx) => populateCard(card, team[idx], true, idx));
                enemyCardsLocal.forEach((card, idx) => populateCard(card, enemyTeam[idx], false, idx));
                enemyCards = enemyCardsLocal;
                playerCards = playerCardsLocal;
                attachCardTargetHandlers(enemyCards, currentOpponentUsername || '');
                attachCardTargetHandlers(playerCards, data.player?.username || '');

                if (Array.isArray(team) && team.length > 0) {
                    const firstChar = rosterData[team[0]];
                    const firstSkill = firstChar?.skills?.[0];
                    if (firstSkill) {
                        renderSkillInfo(firstChar, firstSkill, 0, 0);
                    }
                }

                if (data.player?.username) {
                    currentPlayerUsername = data.player.username;
                }
                applyIncomingMatchState(data, { playEntrySound: true });
                connectMatchSocket();
            } catch (error) {
                console.warn('Failed to load match data.', error);
            }
        };

        loadMatchForIngame().finally(() => {
            document.body.classList.remove('app-loading', 'app-loading-ingame');
        });

        const surrenderButton = document.querySelector('.surrenderbutton');
        const handleReadySectionClick = async () => {
            if (!currentPlayerUsername || !currentTurnUsername) return;
            if (currentPlayerUsername !== currentTurnUsername) return;
            if (normalizePendingTurn(pendingTurnState).turnStartChoice) return;
            await openEndTurnModal();
        };

        const handleEndTurnConfirm = async () => {
            if (isEndingTurn || !matchIdFromUrl) return;
            const pending = normalizePendingTurn(pendingTurnState);
            if (pending.unresolvedRandom > 0) {
                updateEndTurnButtons();
                return;
            }
            isEndingTurn = true;
            if (endTurnOkButton) {
                endTurnOkButton.disabled = true;
            }
            try {
                const response = await fetch(
                    `${API_BASE_URL}/api/match/${encodeURIComponent(matchIdFromUrl)}/turn/end`,
                    {
                        method: 'POST',
                        credentials: 'include',
                    }
                );
                const data = await response.json();
                if (!response.ok || !data?.ok) {
                    const detailSuffix = data?.details ? ` Details: ${data.details}` : '';
                    throw new Error((data?.error || 'Failed to end turn.') + detailSuffix);
                }
                playIngameSound(nextRoundSound);
                applyMatchState(data);
                closeEndTurnModal();
            } catch (error) {
                console.warn('Failed to end turn.', error);
            } finally {
                isEndingTurn = false;
                updateEndTurnButtons();
            }
        };

        const handleEndTurnCancel = () => {
            closeEndTurnModal();
        };

        const clonePoolState = (pool = emptyPool()) => ({
            taijutsu: Math.max(0, Number(pool?.taijutsu) || 0),
            ninjutsu: Math.max(0, Number(pool?.ninjutsu) || 0),
            bloodline: Math.max(0, Number(pool?.bloodline) || 0),
            genjutsu: Math.max(0, Number(pool?.genjutsu) || 0),
        });

        const clonePendingTurnState = (pending = normalizePendingTurn()) => ({
            queuedByActorSlot: JSON.parse(JSON.stringify(pending?.queuedByActorSlot || {})),
            queueOrder: Array.isArray(pending?.queueOrder) ? [...pending.queueOrder] : [],
            unresolvedRandom: Math.max(0, Number(pending?.unresolvedRandom) || 0),
            randomAssignments: clonePoolState(pending?.randomAssignments || emptyPool()),
            turnStartChoice:
                pending?.turnStartChoice && typeof pending.turnStartChoice === 'object'
                    ? JSON.parse(JSON.stringify(pending.turnStartChoice))
                    : null,
        });

        const applyRandomChakraAdjustmentLocally = (chakraType, delta) => {
            const normalizedType = typeof chakraType === 'string' ? chakraType.trim().toLowerCase() : '';
            if (!chakraTypes.includes(normalizedType)) return false;
            const nextPool = clonePoolState(playerPoolState);
            const nextPending = clonePendingTurnState(pendingTurnState);
            if (delta === 1) {
                if (nextPending.unresolvedRandom <= 0) return false;
                if ((nextPool[normalizedType] || 0) <= 0) return false;
                nextPool[normalizedType] -= 1;
                nextPending.randomAssignments[normalizedType] = (nextPending.randomAssignments[normalizedType] || 0) + 1;
                nextPending.unresolvedRandom -= 1;
            } else if (delta === -1) {
                if ((nextPending.randomAssignments[normalizedType] || 0) <= 0) return false;
                nextPool[normalizedType] += 1;
                nextPending.randomAssignments[normalizedType] -= 1;
                nextPending.unresolvedRandom += 1;
            } else {
                return false;
            }
            renderChakra(nextPool);
            pendingTurnState = nextPending;
            applyQueuedSkillVisuals();
            if (endTurnModalEl && endTurnModalEl.style.visibility === 'visible') {
                renderEndTurnModal(nextPool, nextPending);
            }
            return true;
        };

        const adjustRandomChakra = async (chakraType, delta) => {
            if (!matchIdFromUrl) return;
            const previousPoolState = clonePoolState(playerPoolState);
            const previousPendingState = clonePendingTurnState(pendingTurnState);
            const appliedLocally = applyRandomChakraAdjustmentLocally(chakraType, delta);
            if (!appliedLocally) return;
            try {
                const response = await fetch(
                    `${API_BASE_URL}/api/match/${encodeURIComponent(matchIdFromUrl)}/turn/random/adjust`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ chakraType, delta }),
                    }
                );
                const data = await response.json();
                if (!response.ok || !data?.ok) {
                    throw new Error(data?.error || 'Unable to adjust random chakra.');
                }
                renderChakra(data.chakraPools?.[currentPlayerUsername] || emptyPool());
                pendingTurnState = normalizePendingTurn(data.pendingTurn);
                applyQueuedSkillVisuals();
                syncTurnState(data.currentTurn, data.turnExpiresAt, data.turnDurationMs);
                if (endTurnModalEl && endTurnModalEl.style.visibility === 'visible') {
                    renderEndTurnModal(playerPoolState, pendingTurnState);
                }
            } catch (error) {
                renderChakra(previousPoolState);
                pendingTurnState = previousPendingState;
                applyQueuedSkillVisuals();
                if (endTurnModalEl && endTurnModalEl.style.visibility === 'visible') {
                    renderEndTurnModal(previousPoolState, previousPendingState);
                }
                console.warn('Failed to adjust random chakra.', error);
            }
        };

        const handleExchangeConfirm = async () => {
            if (!matchIdFromUrl || battleEndShown) return;
            if (!currentPlayerUsername || currentPlayerUsername !== currentTurnUsername) return;
            try {
                const response = await fetch(
                    `${API_BASE_URL}/api/match/${encodeURIComponent(matchIdFromUrl)}/chakra/exchange`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                            chakraType: selectedExchangeType,
                            spendAssignments: exchangeSpendAssignments,
                        }),
                    }
                );
                const data = await response.json();
                if (!response.ok || !data?.ok) {
                    throw new Error(data?.error || 'Unable to exchange chakra.');
                }
                renderChakra(data.chakraPools?.[currentPlayerUsername] || emptyPool());
                pendingTurnState = normalizePendingTurn(data.pendingTurn);
                applyQueuedSkillVisuals();
                syncTurnState(data.currentTurn, data.turnExpiresAt, data.turnDurationMs);
                exchangeSpendAssignments = emptyPool();
                closeExchangeModal();
            } catch (error) {
                console.warn('Failed to exchange chakra.', error);
            }
        };

        if (readySectionEl) {
            readySectionEl.addEventListener('click', () => {
                handleReadySectionClick().catch((error) =>
                    console.warn('Failed to open end turn dialog.', error)
                );
            });
        }
        if (endTurnOkButton) {
            endTurnOkButton.addEventListener('click', () => {
                handleEndTurnConfirm().catch((error) => console.warn('Turn end confirm failed.', error));
            });
        }
        if (endTurnCancelButton) {
            endTurnCancelButton.addEventListener('click', handleEndTurnCancel);
        }
        if (exchangeLabel) {
            exchangeLabel.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                openExchangeModal();
            });
        }
        exchangeChoiceButtons.forEach((button) => {
            const type = getExchangeTypeFromButton(button);
            if (!type) return;
            button.addEventListener('click', () => {
                selectedExchangeType = type;
                renderExchangeModal(playerPoolState);
            });
        });
        if (exchangeModalEl) {
            const columns = Array.from(exchangeModalEl.querySelectorAll('.exchange_chakra_column'));
            const leftRows = Array.from(columns[0]?.querySelectorAll('.exchange_chakra_row') || []);
            leftRows.forEach((row) => {
                const name = getRowChakraType(row);
                const symbols = Array.from(row.querySelectorAll('.exchange_symbol'));
                if (!name || symbols.length < 2 || !chakraTypes.includes(name)) return;
                const minusEl = symbols[0];
                const plusEl = symbols[1];
                minusEl.style.cursor = 'pointer';
                plusEl.style.cursor = 'pointer';
                minusEl.addEventListener('click', () => {
                    adjustExchangeSpend(name, -1);
                    renderExchangeModal(playerPoolState);
                });
                plusEl.addEventListener('click', () => {
                    adjustExchangeSpend(name, 1);
                    renderExchangeModal(playerPoolState);
                });
            });
        }
        if (exchangeOkButton) {
            exchangeOkButton.addEventListener('click', () => {
                handleExchangeConfirm().catch((error) =>
                    console.warn('Exchange confirm failed.', error)
                );
            });
        }
        if (exchangeCancelButton) {
            exchangeCancelButton.addEventListener('click', closeExchangeModal);
        }
        chakraTypes.forEach((type) => {
            const row = endTurnLeftRowEls[type];
            if (!row) return;
            const plusButton = row.querySelector('.plus-button');
            const minusButton = row.querySelector('.minus-button');
            if (plusButton) {
                plusButton.addEventListener('click', (event) => {
                    event.stopPropagation();
                    adjustRandomChakra(type, 1).catch((error) =>
                        console.warn('Random chakra + failed.', error)
                    );
                });
            }
            if (minusButton) {
                minusButton.addEventListener('click', (event) => {
                    event.stopPropagation();
                    adjustRandomChakra(type, -1).catch((error) =>
                        console.warn('Random chakra - failed.', error)
                    );
                });
            }
        });

        const handleSurrender = async () => {
            if (!matchIdFromUrl) return;
            try {
                const response = await fetch(
                    `${API_BASE_URL}/api/match/${encodeURIComponent(matchIdFromUrl)}/surrender`,
                    {
                        method: 'POST',
                        credentials: 'include',
                    }
                );
                const data = await response.json();
                if (!response.ok || !data?.ok) {
                    throw new Error(data?.error || 'Failed to surrender.');
                }
                const didWin = Boolean(data.winner && data.winner === currentPlayerUsername);
                const opponentUsername = didWin
                    ? data.surrenderedBy
                    : data.winner || currentOpponentUsername;
                showBattleEndOverlay({
                    didWin,
                    opponentUsername,
                    expDelta: data.ladderResult?.expDelta,
                    clanExpDelta: data.ladderResult?.clanExpDelta,
                });
            } catch (error) {
                console.warn('Failed to surrender.', error);
                window.location.href = 'selection.html';
            }
        };

        if (battleEndOverlayEl) {
            battleEndOverlayEl.classList.remove('visible');
        }
        if (exchangeModalEl) {
            exchangeModalEl.style.visibility = 'hidden';
            renderExchangeModal(playerPoolState);
        }
        if (battleEndContinueButton) {
            battleEndContinueButton.addEventListener('click', () => {
                window.location.href = 'selection.html';
            });
        }

        if (surrenderButton) {
            surrenderButton.addEventListener('click', openSurrenderConfirm);
        }
        if (surrenderConfirmOkButton) {
            surrenderConfirmOkButton.addEventListener('click', () => {
                handleSurrender().catch((error) => console.warn('Surrender failed.', error));
            });
        }
        if (surrenderConfirmCancelButton) {
            surrenderConfirmCancelButton.addEventListener('click', closeSurrenderConfirm);
        }

        return;
    }

    await hydratePlayerIdentity();

    const logoutButton = document.querySelector('.logout-button');
    const quickButton = document.querySelector('.quick-button');
    const ladderButton = document.querySelector('.ladder-button');
    const privateButton = document.querySelector('.private-button');
    const searchingBackdrop = document.querySelector('.searching-backdrop');
    const searchingOverlay = document.querySelector('.searchingscroll');
    const searchingMessage = document.querySelector('.searching');
    const searchingSpinner = document.querySelector('.sharingan');
    const cancelSearchingButton = document.querySelector('.cancel-button');
    const battleBotWheelButton = document.getElementById('battle-bot-wheel-button');
    const battleBotWheelStatus = document.getElementById('battle-bot-wheel-status');
    const battleBotChoicePopup = document.getElementById('battle-bot-choice-popup');
    const battleBotChoiceCloseButton = document.getElementById('battle-bot-choice-close');
    const battleBotChoiceButtons = Array.from(
        document.querySelectorAll('[data-battle-bot-choice]')
    );
    const privateMatchBackdrop = document.querySelector('.private-match-backdrop');
    const privateMatchInput = document.querySelector('.private-match-input');
    const privateMatchError = document.querySelector('.private-match-error');
    const privateMatchOkButton = document.querySelector('.private-match-ok');
    const privateMatchCancelButton = document.querySelector('.private-match-cancel');
    const defaultCancelButtonLabel = cancelSearchingButton ? cancelSearchingButton.textContent : '';
    let activeSearchTargetUsername = '';
    const foundMatchSound = new Audio('sounds/found-match.mp3');
    const skillViewerOpenSound = new Audio('sounds/scroll_open.mp3');
    const skillViewerCloseSound = new Audio('sounds/scroll_close.mp3');
    let matchmakingPoll = null;
    let isSearching = false;
    let pendingMatchRedirect = null;
    const setBattleBotWheelStatus = (message = '', variant = 'info') => {
        if (!battleBotWheelStatus) return;
        battleBotWheelStatus.textContent = message;
        battleBotWheelStatus.dataset.variant = variant;
    };

    const syncBattleBotWheel = () => {
        const enabled = getBattleBotPreference();
        if (battleBotWheelButton) {
            battleBotWheelButton.classList.toggle('enabled', enabled);
            battleBotWheelButton.classList.toggle('disabled', !enabled);
            battleBotWheelButton.setAttribute('aria-expanded', 'false');
        }
    };

    const setBattleBotChoicePopupVisible = (visible) => {
        if (!battleBotChoicePopup) return;
        battleBotChoicePopup.classList.toggle('visible', visible);
        battleBotChoicePopup.setAttribute('aria-hidden', visible ? 'false' : 'true');
        if (battleBotWheelButton) {
            battleBotWheelButton.setAttribute('aria-expanded', visible ? 'true' : 'false');
        }
    };

    const saveBattleBotPreference = async (enabled) => {
        const response = await fetch(`${API_BASE_URL}/api/profile/matchmaking`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                battleBotEnabled: Boolean(enabled),
            }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.ok || !data?.user) {
            throw new Error(data?.error || 'Unable to update battle bot preference.');
        }
        profileCache = data.user;
        writeCachedUser(data.user);
        syncBattleBotWheel();
    };
    const handleLogout = async () => {
        try {
            await fetch(`${API_BASE_URL}/api/logout`, {
                method: 'POST',
                credentials: 'include',
            });
        } catch (error) {
            console.warn('Logout request failed; proceeding to clear session locally.', error);
        } finally {
            localStorage.removeItem('narutoUser');
            window.location.href = 'selection-login.html';
        }
    };

    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }

    syncBattleBotWheel();

    if (battleBotWheelButton) {
        battleBotWheelButton.addEventListener('click', () => {
            setBattleBotChoicePopupVisible(true);
        });
    }

    if (battleBotChoiceCloseButton) {
        battleBotChoiceCloseButton.addEventListener('click', () => {
            setBattleBotChoicePopupVisible(false);
        });
    }

    if (battleBotChoicePopup) {
        battleBotChoicePopup.addEventListener('click', (event) => {
            if (event.target !== battleBotChoicePopup) return;
            setBattleBotChoicePopupVisible(false);
        });
    }

    battleBotChoiceButtons.forEach((button) => {
        button.addEventListener('click', async () => {
            const enabled = button.dataset.battleBotChoice === 'enabled';
            try {
                await saveBattleBotPreference(enabled);
            } catch (error) {
                console.warn('Failed to update battle bot preference.', error);
                setBattleBotWheelStatus('Unable to update Game Bot setting.', 'error');
            } finally {
                setBattleBotChoicePopupVisible(false);
            }
        });
    });

    const clearPendingMatchRedirect = () => {
        if (!pendingMatchRedirect) return;
        window.clearTimeout(pendingMatchRedirect);
        pendingMatchRedirect = null;
    };

    const playOneShotSound = (audio) => {
        soundManager.play(audio);
    };

    const setSearchingState = (state = 'searching', mode = 'quick') => {
        if (!searchingMessage) return;
        if (state === 'found') {
            searchingMessage.textContent = 'Opponent found!';
            if (searchingSpinner) {
                searchingSpinner.src = 'found.png';
                searchingSpinner.style.visibility = 'visible';
                searchingSpinner.style.animation = 'none';
            }
            if (cancelSearchingButton) {
                cancelSearchingButton.textContent = '';
                cancelSearchingButton.disabled = true;
                cancelSearchingButton.style.top = '';
                cancelSearchingButton.style.left = '';
                cancelSearchingButton.style.marginTop = '50px';
                cancelSearchingButton.style.marginLeft = '125px';
                cancelSearchingButton.style.width = '200px';
                cancelSearchingButton.style.textAlign = 'center';
                cancelSearchingButton.style.backgroundColor = 'transparent';
                cancelSearchingButton.style.border = 'none';
                cancelSearchingButton.style.pointerEvents = 'none';
            }
            playOneShotSound(foundMatchSound);
            return;
        }
        searchingMessage.textContent =
            mode === 'private' && activeSearchTargetUsername
                ? `Searching for ${activeSearchTargetUsername}`
                : 'Searching for an opponent';
        if (searchingSpinner) {
            searchingSpinner.src = 'sharingan.png';
            searchingSpinner.style.visibility = 'visible';
            searchingSpinner.style.animation = '';
        }
        if (cancelSearchingButton) {
            cancelSearchingButton.textContent = defaultCancelButtonLabel || 'Cancel';
            cancelSearchingButton.disabled = false;
            cancelSearchingButton.style.top = '';
            cancelSearchingButton.style.left = '';
            cancelSearchingButton.style.marginTop = '';
            cancelSearchingButton.style.marginLeft = '';
            cancelSearchingButton.style.width = '';
            cancelSearchingButton.style.textAlign = '';
            cancelSearchingButton.style.backgroundColor = '';
            cancelSearchingButton.style.border = '';
            cancelSearchingButton.style.pointerEvents = '';
        }
    };

    const openSearching = () => {
        if (!searchingOverlay || !searchingBackdrop) return;
        searchingBackdrop.classList.remove('hidden');
        searchingBackdrop.classList.add('visible');
    };

    const closeSearching = () => {
        if (!searchingOverlay || !searchingBackdrop) return;
        clearPendingMatchRedirect();
        setSearchingState('searching');
        searchingBackdrop.classList.add('hidden');
        searchingBackdrop.classList.remove('visible');
    };

    closeSearching();

    const openPrivateMatchDialog = () => {
        if (!privateMatchBackdrop) return;
        if (privateMatchError) {
            privateMatchError.textContent = '';
        }
        if (privateMatchInput) {
            privateMatchInput.value = '';
        }
        privateMatchBackdrop.classList.remove('hidden');
        privateMatchBackdrop.classList.add('visible');
        if (privateMatchInput) {
            window.setTimeout(() => privateMatchInput.focus(), 0);
        }
    };

    const closePrivateMatchDialog = () => {
        if (!privateMatchBackdrop) return;
        privateMatchBackdrop.classList.add('hidden');
        privateMatchBackdrop.classList.remove('visible');
        if (privateMatchError) {
            privateMatchError.textContent = '';
        }
    };

    const scheduleMatchRedirect = (matchId, matchStartsAt) => {
        if (!matchId) return;
        clearPendingMatchRedirect();
        const startAtMs = matchStartsAt ? new Date(matchStartsAt).getTime() : Date.now();
        const delayMs = Math.max(0, startAtMs - Date.now());
        pendingMatchRedirect = window.setTimeout(() => {
            pendingMatchRedirect = null;
            closeSearching();
            redirectToMatch(matchId);
        }, delayMs);
    };

    const handleMatchFound = (data = {}) => {
        if (!data?.matchFound || !data?.matchId) return false;
        const startAtMs = data.matchStartsAt ? new Date(data.matchStartsAt).getTime() : Date.now();
        const shouldHold = !data.matchReady && startAtMs > Date.now();
        if (!shouldHold) {
            closeSearching();
            redirectToMatch(data.matchId);
            return true;
        }
        openSearching();
        setSearchingState('found');
        isSearching = false;
        if (matchmakingPoll) {
            clearInterval(matchmakingPoll);
            matchmakingPoll = null;
        }
        scheduleMatchRedirect(data.matchId, data.matchStartsAt);
        return true;
    };

    const resumeMatchIfActive = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/match/status`, {
                credentials: 'include',
            });
            const data = await response.json();
            if (data?.matchFound && data.matchId) {
                handleMatchFound(data);
            }
        } catch (error) {
            console.warn('Failed to resume active match.', error);
        }
    };

    const redirectToMatch = (matchId) => {
        window.location.href = `ingame.html?matchId=${encodeURIComponent(matchId)}`;
    };

    const startPollingMatch = () => {
        if (matchmakingPoll) return;
        matchmakingPoll = setInterval(async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/match/status`, {
                    credentials: 'include',
                });
                const data = await response.json();
                if (data?.matchFound && data.matchId) {
                    handleMatchFound(data);
                }
            } catch (error) {
                console.warn('Match status check failed:', error);
            }
        }, 2000);
    };

    const joinMatchmaking = async (mode = 'quick', options = {}) => {
        if (isSearching) return;
        isSearching = true;
        activeSearchTargetUsername = mode === 'private' ? (options.targetUsername || '').trim() : '';
        setSearchingState('searching', mode);
        openSearching();
        try {
            const response = await fetch(`${API_BASE_URL}/api/match/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    team: getTeamIndices(),
                    mode,
                    targetUsername: options.targetUsername || '',
                }),
            });
            const data = await response.json();
            if (!response.ok || !data?.ok) {
                throw new Error(data?.error || 'Could not start matchmaking. Please try again.');
            }
            if (data?.matchFound && data.matchId) {
                handleMatchFound(data);
                return;
            }
            startPollingMatch();
        } catch (error) {
            console.error('Failed to join matchmaking:', error);
            isSearching = false;
            activeSearchTargetUsername = '';
            closeSearching();
            alert(error?.message || 'Could not start matchmaking. Please try again.');
        }
    };

    const cancelMatchmaking = async () => {
        isSearching = false;
        activeSearchTargetUsername = '';
        if (matchmakingPoll) {
            clearInterval(matchmakingPoll);
            matchmakingPoll = null;
        }
        closeSearching();
        try {
            await fetch(`${API_BASE_URL}/api/match/cancel`, {
                method: 'POST',
                credentials: 'include',
            });
        } catch (error) {
            console.warn('Failed to cancel matchmaking:', error);
        }
    };

    if (quickButton) {
        quickButton.addEventListener('click', (event) => {
            event.preventDefault();
            persistTeamSelection();
            joinMatchmaking('quick');
        });
    }

    if (ladderButton) {
        ladderButton.addEventListener('click', (event) => {
            event.preventDefault();
            persistTeamSelection();
            joinMatchmaking('ladder');
        });
    }

    if (privateButton) {
        privateButton.addEventListener('click', (event) => {
            event.preventDefault();
            openPrivateMatchDialog();
        });
    }

    if (privateMatchCancelButton) {
        privateMatchCancelButton.addEventListener('click', (event) => {
            event.preventDefault();
            closePrivateMatchDialog();
        });
    }

    if (privateMatchOkButton) {
        privateMatchOkButton.addEventListener('click', (event) => {
            event.preventDefault();
            const targetUsername = privateMatchInput ? privateMatchInput.value.trim() : '';
            if (!targetUsername) {
                if (privateMatchError) {
                    privateMatchError.textContent = 'Enter a username.';
                }
                if (privateMatchInput) {
                    privateMatchInput.focus();
                }
                return;
            }
            closePrivateMatchDialog();
            persistTeamSelection();
            joinMatchmaking('private', { targetUsername });
        });
    }

    if (privateMatchInput) {
        privateMatchInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                if (privateMatchOkButton) {
                    privateMatchOkButton.click();
                }
                return;
            }
            if (event.key === 'Escape') {
                event.preventDefault();
                closePrivateMatchDialog();
            }
        });
    }

    if (cancelSearchingButton) {
        cancelSearchingButton.addEventListener('click', (event) => {
            event.preventDefault();
            cancelMatchmaking();
        });
    }

    const playSkillViewerSound = (audio) => {
        soundManager.play(audio);
    };

    const openSkillViewer = () => {
        if (!skillViewer || !skillViewer.classList.contains('collapsed')) return;
        skillViewer.classList.remove('collapsed');
        playSkillViewerSound(skillViewerOpenSound);
    };

    const closeSkillViewer = () => {
        if (!skillViewer || skillViewer.classList.contains('collapsed')) return;
        skillViewer.classList.add('collapsed');
        playSkillViewerSound(skillViewerCloseSound);
    };

    if (skillViewer) {
        closeSkillViewer();
    }

    if (skillScroll && skillViewer) {
        skillScroll.addEventListener('click', () => {
            if (skillViewer.classList.contains('collapsed')) {
                openSkillViewer();
                return;
            }
            closeSkillViewer();
        });
    }

    let roster = [];
    if (typeof characters !== 'undefined' && Array.isArray(characters)) {
        roster = characters;
    } else if (Array.isArray(window.characters)) {
        roster = window.characters;
    }

    const CHARACTERS_PER_PAGE = 21;
    const totalSlots = Math.max(roster.length, CHARACTERS_PER_PAGE);
    const totalPages = Math.max(1, Math.ceil(totalSlots / CHARACTERS_PER_PAGE));
    let currentRosterPage = 0;
    let currentCharacterIndex = null;
    slotList.innerHTML = '';

    const renderEnergy = (energyList = []) => {
        if (!energyBarEl) return;
        const label = energyBarEl.querySelector('.energy-label');
        energyBarEl.innerHTML = '';
        if (label) {
            energyBarEl.appendChild(label);
        } else {
            const newLabel = document.createElement('span');
            newLabel.className = 'energy-label';
            newLabel.textContent = 'ENERGY:';
            energyBarEl.appendChild(newLabel);
        }
        const energyClassMap = {
            ninjutsu: 'energy-ninjutsu',
            bloodline: 'energy-bloodline',
            random: 'energy-random',
            genjutsu: 'energy-genjutsu',
            taijutsu: 'energy-taijutsu',
        };
        const normalizedList = (Array.isArray(energyList) ? energyList : [])
            .filter((type) => {
                const normalized = typeof type === 'string' ? type.trim().toLowerCase() : '';
                return normalized && normalized !== 'none' && normalized !== 'non';
            });
        if (!normalizedList.length) {
            const noneText = document.createElement('span');
            noneText.className = 'energy-none';
            noneText.textContent = 'none';
            energyBarEl.appendChild(noneText);
            return;
        }
        normalizedList.forEach((type) => {
            const normalized = typeof type === 'string' ? type.trim().toLowerCase() : '';
            const pip = document.createElement('span');
            const colorClass = energyClassMap[normalized];
            pip.className = ['energy-pip', 'filled', colorClass].filter(Boolean).join(' ');
            pip.title = type;
            energyBarEl.appendChild(pip);
        });
    };

    const renderClasses = (classes = []) => {
        if (!classesEl) return;
        classesEl.innerHTML = '';
        const label = document.createElement('span');
        label.className = 'classes-label';
        label.textContent = 'CLASSES:';
        classesEl.appendChild(label);
        getVisibleSkillClasses(classes).forEach((cls) => {
            const span = document.createElement('span');
            span.className = 'class-type';
            span.textContent = cls;
            classesEl.appendChild(span);
        });
    };

    const setActiveSkillImage = (activeIndex) => {
        skillImages.forEach((img, idx) => {
            img.classList.toggle('active', idx === activeIndex);
        });
    };

    const ensureSkillImageSlots = (count) => {
        if (!skillImagesContainer) return;
        const required = Math.max(0, Number(count) || 0);
        const current = Array.from(skillImagesContainer.querySelectorAll('.skill-image'));
        if (current.length < required) {
            for (let i = current.length; i < required; i += 1) {
                const img = document.createElement('img');
                img.className = 'skill-image';
                img.dataset.skillIndex = String(i);
                img.alt = `Skill ${i + 1}`;
                img.src = '';
                skillImagesContainer.appendChild(img);
            }
        } else if (current.length > required) {
            current.slice(required).forEach((img) => img.remove());
        }
        skillImages = Array.from(skillImagesContainer.querySelectorAll('.skill-image'));
    };

    const renderSkill = (skill, activeIndex = 0) => {
        if (!skill) return;
        if (skillNameEl) {
            skillNameEl.textContent = skill.name || 'Skill name';
            skillNameEl.style.visibility = 'visible';
        }
        if (skillDescEl) {
            skillDescEl.textContent = skill.skilldescription || '';
        }
        if (energyBarEl) {
            energyBarEl.style.display = 'flex';
        }
        if (classesEl) {
            classesEl.style.display = 'flex';
        }
        renderEnergy(skill.energy);
        renderClasses(skill.classes);
        if (cooldownEl) {
            cooldownEl.textContent = skill.cooldown ?? '-';
        }
        if (cooldownWrapper) {
            cooldownWrapper.style.display = 'flex';
        }
        setActiveSkillImage(activeIndex);
    };

    const renderCharacterOverview = (character) => {
        if (skillNameEl) {
            skillNameEl.textContent = '';
            skillNameEl.style.visibility = 'hidden';
        }
        if (skillDescEl) {
            skillDescEl.textContent =
                character.characterdescription ||
                character.characterdeescription ||
                '';
        }
        if (energyBarEl) {
            energyBarEl.style.display = 'none';
        }
        if (classesEl) {
            classesEl.style.display = 'none';
        }
        renderEnergy([]);
        renderClasses([]);
        if (cooldownEl) {
            cooldownEl.textContent = '-';
        }
        if (cooldownWrapper) {
            cooldownWrapper.style.display = 'none';
        }
        setActiveSkillImage(-1);
    };

    const handleSkillSelect = (skillIndex) => {
        if (currentCharacterIndex === null) return;
        const character = roster[currentCharacterIndex];
        if (!character || !Array.isArray(character.skills)) return;
        const visibleSkills = character.skills.filter(
            (skill) => skill && !Boolean(skill.hiddenFromSelectionViewer)
        );
        const skill = visibleSkills[skillIndex];
        if (!skill) return;
        renderSkill(skill, skillIndex);
    };

    const renderCharacter = (character, index) => {
        if (!character) return;
        currentCharacterIndex = index;
        if (nameEl) {
            nameEl.textContent = character.name || 'Unknown shinobi';
        }
        if (portraitEl) {
            portraitEl.src = character.facePicture || '';
            portraitEl.alt = character.name ? `${character.name} portrait` : 'Character portrait';
        }
        renderCharacterOverview(character);
        if (Array.isArray(character.skills)) {
            const visibleSkills = character.skills.filter(
                (skill) => skill && !Boolean(skill.hiddenFromSelectionViewer)
            );
            ensureSkillImageSlots(visibleSkills.length);
            if (skillImagesContainer) {
                skillImagesContainer.scrollLeft = 0;
            }
            visibleSkills.forEach((skill, skillIdx) => {
                const targetImg = skillImages[skillIdx];
                if (!targetImg) return;
                if (skill) {
                    targetImg.src = skill.skillimage || '';
                    targetImg.alt = skill.name || `Skill ${skillIdx + 1}`;
                    targetImg.style.visibility = 'visible';
                    targetImg.onclick = () => handleSkillSelect(skillIdx);
                } else {
                    targetImg.src = '';
                    targetImg.alt = `Skill ${skillIdx + 1}`;
                    targetImg.style.visibility = 'hidden';
                    targetImg.onclick = null;
                }
            });
        }
    };

    const handleCharacterSelect = (index, { openViewer = true } = {}) => {
        const character = roster[index];
        if (!character) return;
        if (openViewer) {
            openSkillViewer();
        }
        renderCharacter(character, index);
    };

    const setDragPayload = (dataTransfer, payload) => {
        const serialized = JSON.stringify(payload);
        dataTransfer.setData('application/json', serialized);
        dataTransfer.setData('text/plain', serialized);
        dataTransfer.effectAllowed = 'copyMove';
        dataTransfer.dropEffect = 'move';
    };

    const parseDragPayload = (event) => {
        const raw = event.dataTransfer.getData('application/json') || event.dataTransfer.getData('text/plain');
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch (error) {
            return null;
        }
    };

    const handleSlotDragStart = (event, rosterIndex) => {
        const rosterSlot = rosterSlotElements[rosterIndex];
        if (rosterSlot && rosterSlot.classList.contains('slot-empty')) return;
        const character = roster[rosterIndex];
        if (isCharacterLocked(character)) return;
        if (!character || !event.dataTransfer) return;
        setDragPayload(event.dataTransfer, { type: 'roster', rosterIndex });
        const img = event.target.closest('.slot-image');
        if (img) {
            const rect = img.getBoundingClientRect();
            event.dataTransfer.setDragImage(img, rect.width / 2, rect.height / 2);
        }
    };

    const startableButtons = [quickButton, ladderButton, privateButton];

    const updateGameButtons = () => {
        const filled = selectedAssignments.filter(Boolean).length;
        const enabled = filled >= 3;
        startableButtons.forEach((btn) => {
            if (!btn) return;
            btn.disabled = !enabled;
            btn.style.opacity = enabled ? '1' : '0.5';
            btn.style.pointerEvents = enabled ? 'auto' : 'none';
        });
    };

    const getTeamIndices = () =>
        selectedAssignments.map((assignment) => assignment?.characterIndex).filter((idx) => Number.isInteger(idx));

    const persistTeamSelection = async () => {
        const indices = selectedAssignments.map((assignment) => assignment?.characterIndex);
        if (!indices.every((idx) => Number.isInteger(idx))) {
            return;
        }
        try {
            await fetch(`${API_BASE_URL}/api/team/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ team: indices }),
            });
        } catch (error) {
            console.warn('Failed to save team selection.', error);
        }
    };

    const handleSlotDragEnd = () => {};

    const clearRosterSlot = (index) => {
        const slot = rosterSlotElements[index];
        if (!slot) return;
        slot.innerHTML = '';
        slot.classList.add('slot-empty');
        slot.draggable = false;
    };

    const buildRosterSlot = (index) => {
        const slot = rosterSlotElements[index];
        const character = roster[index];
        if (!slot) return;
        slot.innerHTML = '';
        const locked = isCharacterLocked(character);
        const isSelected = selectedAssignments.some((assignment) => assignment?.rosterIndex === index);
        if (!character || isSelected) {
            slot.classList.add('slot-empty');
            slot.classList.remove('slot-locked');
            slot.draggable = false;
            return;
        }
        slot.classList.remove('slot-empty');
        slot.classList.toggle('slot-locked', locked);
        slot.draggable = !locked;
        const image = document.createElement('img');
        image.className = 'slot-image';
        if (locked) {
            image.classList.add('slot-locked');
        }
        image.src = character.facePicture;
        image.alt = character.name || `Character ${index + 1}`;
        image.draggable = !locked;
        image.title = locked ? `${character.name || 'Character'} is locked.` : character.name || `Character ${index + 1}`;
        slot.appendChild(image);
        if (!locked) {
            image.addEventListener('dragstart', (event) => handleSlotDragStart(event, index));
        }
        image.addEventListener('dragend', handleSlotDragEnd);
    };

    const fillRosterSlot = (index) => {
        buildRosterSlot(index);
    };

    const setSelectedSlot = (slotIndex, assignment) => {
        const slotElement = selectedSlots[slotIndex];
        if (!slotElement) return;
        if (assignment && isCharacterLocked(roster[assignment.characterIndex])) {
            return;
        }
        selectedAssignments[slotIndex] = assignment;
        slotElement.innerHTML = '';
        slotElement.classList.remove('drag-over');
        if (!assignment) {
            slotElement.textContent = String(slotIndex + 1);
            return;
        }
        const character = roster[assignment.characterIndex];
        const img = document.createElement('img');
        img.src = character?.facePicture || '';
        img.alt = character?.name || 'Selected character';
        img.className = 'selected-slot-image';
        img.draggable = true;
        const dragStart = (event) => {
            setDragPayload(event.dataTransfer, { type: 'selected', selectedIndex: slotIndex });
        };
        img.addEventListener('dragstart', dragStart);
        slotElement.appendChild(img);
        handleCharacterSelect(assignment.characterIndex, { openViewer: false });
        updateGameButtons();
        persistTeamSelection();
    };

    const handleSelectedSlotDrop = (event, targetSlotIndex) => {
        event.preventDefault();
        const slotElement = selectedSlots[targetSlotIndex];
        if (!slotElement) return;
        slotElement.classList.remove('drag-over');
        const payload = parseDragPayload(event);
        if (!payload) return;

        let incoming = null;
        if (payload.type === 'selected' && payload.selectedIndex === targetSlotIndex) {
            return;
        }

        if (payload.type === 'roster' && Number.isInteger(payload.rosterIndex) && roster[payload.rosterIndex]) {
            incoming = { characterIndex: payload.rosterIndex, rosterIndex: payload.rosterIndex };
            clearRosterSlot(payload.rosterIndex);
        } else if (
            payload.type === 'selected' &&
            Number.isInteger(payload.selectedIndex) &&
            selectedAssignments[payload.selectedIndex]
        ) {
            incoming = selectedAssignments[payload.selectedIndex];
            setSelectedSlot(payload.selectedIndex, null);
        }

        if (!incoming) return;

        const displaced = selectedAssignments[targetSlotIndex];
        setSelectedSlot(targetSlotIndex, incoming);

        if (displaced && Number.isInteger(displaced.rosterIndex)) {
            fillRosterSlot(displaced.rosterIndex);
        }
        updateGameButtons();
        persistTeamSelection();
    };

    const handleSelectedSlotDragOver = (event, slotElement) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        if (slotElement) {
            slotElement.classList.add('drag-over');
        }
    };

    const handleSelectedSlotDragLeave = (event, slotElement) => {
        event.preventDefault();
        if (slotElement) {
            slotElement.classList.remove('drag-over');
        }
    };

    const handleSelectedSlotDoubleClick = (slotIndex) => {
        const assignment = selectedAssignments[slotIndex];
        if (!assignment) return;
        setSelectedSlot(slotIndex, null);
        if (Number.isInteger(assignment.rosterIndex)) {
            fillRosterSlot(assignment.rosterIndex);
        }
        updateGameButtons();
        persistTeamSelection();
    };

    const handleSelectedSlotClick = (slotIndex) => {
        const assignment = selectedAssignments[slotIndex];
        if (!assignment) return;
        handleCharacterSelect(assignment.characterIndex, { openViewer: true });
    };

    const queueSelectionPreview = (callback) => {
        if (selectionClickTimer) {
            clearTimeout(selectionClickTimer);
        }
        selectionClickTimer = window.setTimeout(() => {
            selectionClickTimer = null;
            callback();
        }, 225);
    };

    const cancelSelectionPreview = () => {
        if (!selectionClickTimer) return;
        clearTimeout(selectionClickTimer);
        selectionClickTimer = null;
    };

    const addRosterCharacterToSelection = (rosterIndex) => {
        if (!Number.isInteger(rosterIndex) || !roster[rosterIndex]) return;
        if (isCharacterLocked(roster[rosterIndex])) return;
        const existingSlotIndex = selectedAssignments.findIndex(
            (assignment) => assignment?.characterIndex === rosterIndex
        );
        if (existingSlotIndex >= 0) return;
        const emptySlotIndex = selectedAssignments.findIndex((assignment) => !assignment);
        if (emptySlotIndex < 0) return;
        clearRosterSlot(rosterIndex);
        setSelectedSlot(emptySlotIndex, { characterIndex: rosterIndex, rosterIndex });
        updateGameButtons();
        persistTeamSelection();
    };

    const handleRosterDragOver = (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    };

    const handleRosterDrop = (event, rosterIndex) => {
        event.preventDefault();
        const payload = parseDragPayload(event);
        if (!payload) return;
        if (
            payload.type === 'selected' &&
            Number.isInteger(payload.selectedIndex) &&
            selectedAssignments[payload.selectedIndex]
        ) {
            const assignment = selectedAssignments[payload.selectedIndex];
            setSelectedSlot(payload.selectedIndex, null);
            fillRosterSlot(assignment.rosterIndex);
        }
    };

    const updateRosterPageButtons = () => {
        if (lastPageButton) {
            const canGoBack = currentRosterPage > 0;
            lastPageButton.style.opacity = canGoBack ? '1' : '0.45';
            lastPageButton.style.pointerEvents = canGoBack ? 'auto' : 'none';
        }
        if (nextPageButton) {
            const canGoNext = currentRosterPage < totalPages - 1;
            nextPageButton.style.opacity = canGoNext ? '1' : '0.45';
            nextPageButton.style.pointerEvents = canGoNext ? 'auto' : 'none';
        }
    };

    const renderRosterPage = () => {
        slotList.innerHTML = '';
        rosterSlotElements.length = 0;
        const pageStart = currentRosterPage * CHARACTERS_PER_PAGE;
        const pageEnd = pageStart + CHARACTERS_PER_PAGE;

        for (let i = pageStart; i < pageEnd; i += 1) {
            const listItem = document.createElement('li');
            listItem.className = 'slot-item';
            listItem.dataset.index = i;
            listItem.addEventListener('dragover', handleRosterDragOver);
            listItem.addEventListener('drop', (event) => handleRosterDrop(event, i));

            const handleClick = () => {
                if (listItem.classList.contains('slot-empty')) return;
                queueSelectionPreview(() => {
                    if (listItem.classList.contains('slot-empty')) return;
                    handleCharacterSelect(i);
                });
            };

            const handleDoubleClick = () => {
                cancelSelectionPreview();
                if (listItem.classList.contains('slot-empty')) return;
                addRosterCharacterToSelection(i);
            };

            listItem.addEventListener('click', handleClick);
            listItem.addEventListener('dblclick', handleDoubleClick);
            listItem.addEventListener('dragstart', (event) => handleSlotDragStart(event, i));
            listItem.addEventListener('dragend', handleSlotDragEnd);

            rosterSlotElements[i] = listItem;
            slotList.appendChild(listItem);
            buildRosterSlot(i);
        }

        updateRosterPageButtons();
    };

    selectedSlots.forEach((slot, slotIndex) => {
        slot.addEventListener('click', () => {
            queueSelectionPreview(() => handleSelectedSlotClick(slotIndex));
        });
        slot.addEventListener('dragover', (event) => handleSelectedSlotDragOver(event, slot));
        slot.addEventListener('dragenter', (event) => handleSelectedSlotDragOver(event, slot));
        slot.addEventListener('dragleave', (event) => handleSelectedSlotDragLeave(event, slot));
        slot.addEventListener('drop', (event) => handleSelectedSlotDrop(event, slotIndex));
        slot.addEventListener('dblclick', () => {
            cancelSelectionPreview();
            handleSelectedSlotDoubleClick(slotIndex);
        });
    });

    const applySavedTeam = () => {
        const saved = profileCache?.savedTeamIndices;
        if (!Array.isArray(saved) || saved.length !== selectedSlots.length) {
            updateGameButtons();
            renderRosterPage();
            return;
        }
        const used = new Set();
        saved.forEach((rosterIdx, slotIdx) => {
            if (!Number.isInteger(rosterIdx) || rosterIdx < 0 || rosterIdx >= roster.length) return;
            if (isCharacterLocked(roster[rosterIdx])) return;
            if (used.has(rosterIdx)) return;
            const assignment = { characterIndex: rosterIdx, rosterIndex: rosterIdx };
            clearRosterSlot(rosterIdx);
            setSelectedSlot(slotIdx, assignment);
            used.add(rosterIdx);
        });
        updateGameButtons();
        renderRosterPage();
    };

    if (nextPageButton) {
        nextPageButton.addEventListener('click', () => {
            if (currentRosterPage >= totalPages - 1) return;
            currentRosterPage += 1;
            renderRosterPage();
        });
    }

    if (lastPageButton) {
        lastPageButton.addEventListener('click', () => {
            if (currentRosterPage <= 0) return;
            currentRosterPage -= 1;
            renderRosterPage();
        });
    }

    await loadMissionLockedCharacterIds();
    renderRosterPage();
    updateGameButtons();
    persistTeamSelection();
    applySavedTeam();
    resumeMatchIfActive();
    document.body.classList.remove('app-loading', 'app-loading-selection');
});
