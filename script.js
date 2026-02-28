document.addEventListener('DOMContentLoaded', async () => {
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
            localStorage.setItem('narutoUser', JSON.stringify({ username: data.user?.username }));
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
    const rosterSlotElements = [];
    const selectedAssignments = selectedSlots.map(() => null);
    const teamStorageKey = 'narutoSelectedTeam';

    const matchIdFromUrl = new URLSearchParams(window.location.search).get('matchId');

    if (!slotList) {
        const rosterData = typeof characters !== 'undefined' ? characters : window.characters;
        let matchPoll = null;
        let currentPlayerUsername = null;
        let currentTurnUsername = null;
        let currentOpponentUsername = null;
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
        const endTurnChooseCountEl = endTurnModalEl?.querySelector('.chakrachoosered');
        const timerBar = document.querySelector('.timer-bar');
        const TURN_DURATION_MS = 60_000;
        const TIMER_MAX_WIDTH = 191;
        const EXCHANGE_CHAKRA_COST = 5;
        const READY_TEXT_PLAYER = 'PRESS WHEN READY';
        const READY_TEXT_OPPONENT = "OPPONENT'S TURN...";
        let lastTurnOwner = null;
        let turnExpiresAtMs = null;
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
        const playerSkillMetaByKey = new Map();
        let queuedSkillKeySet = new Set();
        let draggingQueueActorSlot = null;
        let latestBoardState = null;
        let globalStatusTooltipEl = null;
        let battleEndShown = false;
        let selectedExchangeType = 'taijutsu';
        const chakraCountEls = chakraDisplay
            ? {
                  taijutsu: chakraDisplay.querySelector('[data-chakra="taijutsu"] .chakra-count'),
                  ninjutsu: chakraDisplay.querySelector('[data-chakra="ninjutsu"] .chakra-count'),
                  bloodline: chakraDisplay.querySelector('[data-chakra="bloodline"] .chakra-count'),
                  genjutsu: chakraDisplay.querySelector('[data-chakra="genjutsu"] .chakra-count'),
                  total: chakraDisplay.querySelector('[data-chakra-total] .chakra-count'),
              }
            : {};
        const buildAmountElementMap = (columnSelector) => {
            if (!endTurnModalEl) return {};
            const rows = Array.from(endTurnModalEl.querySelectorAll(`${columnSelector} .chakra-row`));
            const result = {};
            rows.forEach((row) => {
                const name = row.querySelector('.chakra-name')?.textContent?.trim().toLowerCase();
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
                const name = row.querySelector('.chakra-name')?.textContent?.trim().toLowerCase();
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
        });

        const getActorUnitForSlot = (username, actorSlot) => {
            if (!username || !Number.isInteger(actorSlot) || actorSlot < 0) return null;
            const units = latestBoardState?.[username];
            if (!Array.isArray(units)) return null;
            return units[actorSlot] || null;
        };

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
            const replacementId = replacementMap[baseSkill.id];
            if (!replacementId) return baseSkill;
            const rosterIndex = Number.isInteger(unit?.rosterIndex) ? unit.rosterIndex : null;
            const character = Number.isInteger(rosterIndex) ? rosterData?.[rosterIndex] : null;
            const replacementSkill = (Array.isArray(character?.skills) ? character.skills : []).find(
                (skill) => skill?.id === replacementId
            );
            return replacementSkill || baseSkill;
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

        const getEffectiveEnergyList = (energy = [], actorSlot = null, skill = null) => {
            const normalizedEnergy = (Array.isArray(energy) ? energy : []).filter((entry) => {
                const normalized = typeof entry === 'string' ? entry.trim().toLowerCase() : '';
                return normalized && normalized !== 'none' && normalized !== 'non';
            });
            if (!Number.isInteger(actorSlot) || actorSlot < 0) {
                return normalizedEnergy;
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
            return target === 'single-enemy' || target === 'other-enemies' || target === 'all-enemy';
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
                const actorHp = Number(actorUnit?.hp);
                const actorDead =
                    actorUnit?.alive === false || (Number.isFinite(actorHp) && actorHp <= 0);
                if (actorDead) {
                    imgEl.style.opacity = '0.4';
                    return;
                }
                const cooldownRemaining = getCooldownRemainingForMeta(meta, actorUnit);
                if (cooldownRemaining > 0 || isActorStunned(actorUnit)) {
                    imgEl.style.opacity = '0.4';
                    return;
                }
                const effectiveSkill = getEffectiveSkillForActorSlot(meta.actorSlot, meta.skillIdx) || meta?.skill;
                if (isActorEnemyTargetingStunned(actorUnit) && skillIsEnemyTargeting(effectiveSkill)) {
                    imgEl.style.opacity = '0.4';
                    return;
                }
                if (isSkillBlockedByClassLock(actorUnit, effectiveSkill)) {
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
                imgEl.style.opacity = canAffordSkill(
                    effectiveSkill?.energy,
                    playerPoolState,
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
                syncTurnState(data.currentTurn, data.turnExpiresAt);
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
            const ratio = remaining / TURN_DURATION_MS;
            const widthPx = Math.max(0, Math.round(TIMER_MAX_WIDTH * ratio));
            timerBar.style.width = `${widthPx}px`;
            if (
                remaining <= 0 &&
                currentPlayerUsername &&
                currentTurnUsername === currentPlayerUsername &&
                normalizePendingTurn(pendingTurnState).unresolvedRandom === 0 &&
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

        const syncTurnState = (turnOwner, turnExpiresAt) => {
            const parsedExpiry = turnExpiresAt ? new Date(turnExpiresAt).getTime() : null;
            const turnChanged = turnOwner && turnOwner !== lastTurnOwner;
            if (turnChanged) {
                lastTurnOwner = turnOwner;
                autoEndRequested = false;
            }
            if (parsedExpiry) {
                turnExpiresAtMs = parsedExpiry;
            } else if (turnChanged) {
                turnExpiresAtMs = Date.now() + TURN_DURATION_MS;
            }
            currentTurnUsername = turnOwner || null;
            if (!currentPlayerUsername || !currentTurnUsername) {
                setSkillInteractivity(true);
                startTimerLoop();
                updateTimerBar();
                clearTargetHighlights();
                updateSkillAffordability();
                return;
            }
            const isPlayersTurn = currentPlayerUsername === currentTurnUsername;
            setSkillInteractivity(isPlayersTurn);
            startTimerLoop();
            updateTimerBar();
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

        const openEndTurnModal = async () => {
            if (!endTurnModalEl || !matchIdFromUrl) return;
            try {
                const res = await fetch(`${API_BASE_URL}/api/match/${encodeURIComponent(matchIdFromUrl)}`, {
                    credentials: 'include',
                });
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
                renderEndTurnModal(playerPool, pendingTurnState);
            } catch (error) {
                renderEndTurnModal(emptyPool(), normalizePendingTurn());
                console.warn('Unable to load end turn chakra preview.', error);
            }
            endTurnModalEl.style.visibility = 'visible';
        };

        const closeEndTurnModal = () => {
            if (!endTurnModalEl) return;
            endTurnModalEl.style.visibility = 'hidden';
        };

        const getExchangeTypeFromButton = (button) => {
            const label = button?.getAttribute('aria-label') || '';
            const normalized = label.trim().toLowerCase();
            if (normalized === 'taijutsu') return 'taijutsu';
            if (normalized === 'bloodline') return 'bloodline';
            if (normalized === 'ninjutsu') return 'ninjutsu';
            if (normalized === 'genjutsu') return 'genjutsu';
            return null;
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
                const name = row.querySelector('.chakra-name')?.textContent?.trim().toLowerCase();
                const amountEl = row.querySelector('.chakra-amount');
                if (!name || !amountEl) return;
                const assigned = Math.max(0, Number(exchangeSpendAssignments[name]) || 0);
                amountEl.textContent = String(Math.max(0, (normalizedPool[name] || 0) - assigned));
            });
            rightRows.forEach((row) => {
                const name = row.querySelector('.chakra-name')?.textContent?.trim().toLowerCase();
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
            if (matchPoll) {
                clearInterval(matchPoll);
                matchPoll = null;
            }
            if (turnTimerInterval) {
                clearInterval(turnTimerInterval);
                turnTimerInterval = null;
            }
        };

        const getAliveCountFromUnits = (units) => {
            if (!Array.isArray(units)) return 0;
            return units.reduce((sum, unit) => {
                const hp = Number(unit?.hp);
                const isDead = unit?.alive === false || (Number.isFinite(hp) && hp <= 0);
                return sum + (isDead ? 0 : 1);
            }, 0);
        };

        const showBattleEndOverlay = ({ didWin, opponentUsername }) => {
            if (!battleEndOverlayEl || battleEndShown) return;
            const opponent = (opponentUsername || currentOpponentUsername || 'UNKNOWN').trim();
            if (battleEndPortraitEl) {
                battleEndPortraitEl.src = didWin ? 'win.png' : 'lose.png';
                battleEndPortraitEl.alt = didWin ? 'Victory portrait' : 'Defeated portrait';
            }
            if (battleEndTitleEl) {
                battleEndTitleEl.textContent = didWin ? 'WINNER' : 'LOSER';
            }
            if (battleEndMessageEl) {
                battleEndMessageEl.innerHTML = didWin
                    ? `CONGRATULATIONS!<br>YOU HAVE WON A QUICK BATTLE AGAINST ${opponent}.`
                    : `TOO BAD!<br>YOU HAVE LOST A QUICK BATTLE AGAINST ${opponent}.`;
            }
            battleEndOverlayEl.classList.add('visible');
            battleEndShown = true;
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
            const rawHp = Number(unit?.hp);
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
            const dead = unit?.alive === false || hp <= 0;
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
            latestBoardState = board;
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
            if (!tooltipImgTemplate.classList.contains('status-icon-template')) {
                tooltipImgTemplate.classList.add('status-icon-template');
            }
            const unitHp = Number(unit?.hp);
            const dead = unit?.alive === false || (Number.isFinite(unitHp) && unitHp <= 0);
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
                const formatTurnsLabel = (remainingTurns) => {
                    const remaining = Math.max(0, Number(remainingTurns) || 0);
                    if (remaining >= 99) return 'Infinite';
                    return `${remaining} TURN${remaining === 1 ? '' : 'S'} LEFT`;
                };
                const textRows = [];
                groupStatuses.forEach((status) => {
                    let text =
                        status?.metadata?.tooltipText ||
                        findTooltipTextByStatusId(status?.id) ||
                        status?.id ||
                        'Status effect';
                    if (groupedNonAfflictionDebuffTotal > 0) {
                        const ownDebuff = Math.max(
                            0,
                            Number(status?.metadata?.NonAfflictionDamageDebuff) || 0
                        );
                        if (ownDebuff > 0) {
                            text = `This character deals ${groupedNonAfflictionDebuffTotal} less non-affliction damage.`;
                        }
                    }
                    if (groupedDamageDebuffTotal > 0) {
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
                    if (skillDamageBonuses) {
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
                if (statusSkill?.skillimage) {
                    iconEl.src = statusSkill.skillimage;
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
            if (data.opponent?.username) {
                currentOpponentUsername = data.opponent.username;
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
                    opponentUsername: opponentFromResult || data.opponent?.username || currentOpponentUsername,
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
                showBattleEndOverlay({
                    didWin: playerAlive > opponentAlive,
                    opponentUsername: currentOpponentUsername,
                });
                return;
            }
            syncTurnState(data.currentTurn, data.turnExpiresAt);
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
                    const hp = Number(unit?.hp);
                    const dead = unit?.alive === false || (Number.isFinite(hp) && hp <= 0);
                    if (dead) return;
                    const key = `${username}:${slot}`;
                    if (!queuedByTargetKey.has(key)) {
                        queuedByTargetKey.set(key, []);
                    }
                    queuedByTargetKey.get(key).push({
                        iconSrc,
                        skillName: effectiveSkill?.name || 'Queued Skill',
                    });
                });
            });

            queuedByTargetKey.forEach((entries, key) => {
                const [username, slotText] = key.split(':');
                const slot = Number.parseInt(slotText, 10);
                if (!username || !Number.isInteger(slot) || slot < 0) return;
                const cards = username === currentPlayerUsername ? playerCards : enemyCards;
                const card = Array.isArray(cards) ? cards[slot] : null;
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

        const renderSkillInfo = (character, skill, actorSlot = null) => {
            if (!skill || !character) return;
            if (skillInfo.imgEl) {
                skillInfo.imgEl.src = skill.skillimage || '';
                skillInfo.imgEl.alt = skill.name || 'Skill';
            }
            if (skillInfo.nameEl) {
                skillInfo.nameEl.textContent = skill.name || 'Skill';
            }
            if (skillInfo.descEl) {
                skillInfo.descEl.textContent = skill.skilldescription || '';
            }
            if (skillInfo.cooldownEl) {
                skillInfo.cooldownEl.textContent = `Cooldown: ${skill.cooldown ?? '-'}`;
            }
            if (skillInfo.classesEl) {
                const classes = Array.isArray(skill.classes) ? skill.classes.join(', ') : '';
                skillInfo.classesEl.textContent = `Classes: ${classes}`;
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
                meta.skill = effectiveSkill;
                meta.imgEl.src = effectiveSkill.skillimage || '';
                meta.imgEl.alt = effectiveSkill.name || `Skill ${meta.skillIdx + 1}`;
            });
        };

        const fetchTargetOptions = async (actorSlot, skillIdx) => {
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
                activeCastingSkill = { actorSlot, skillIdx, skillEl };
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

        const handleCardTargetClick = (event) => {
            if (!activeTargetOptions || !activeCastingSkill || !matchIdFromUrl) return;
            const card = event.currentTarget;
            const username = card.dataset.username;
            const slot = Number.parseInt(card.dataset.slot, 10);
            const validKeys = getValidTargetKeySet();
            if (!validKeys.has(`${username}:${slot}`)) return;
            const selection =
                activeTargetOptions.mode === 'all'
                    ? activeTargetOptions.targets.map((t) => ({ username: t.username, slot: t.slot }))
                    : { username, slot };
            fetch(`${API_BASE_URL}/api/match/${encodeURIComponent(matchIdFromUrl)}/skill/queue`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    actorSlot: activeCastingSkill.actorSlot,
                    skillIndex: activeCastingSkill.skillIdx,
                    targetSelection: selection,
                }),
            })
                .then(async (response) => {
                    const data = await response.json();
                    if (!response.ok || !data?.ok) {
                        throw new Error(data?.error || 'Unable to queue skill.');
                    }
                    renderChakra(data.chakraPools?.[currentPlayerUsername] || emptyPool());
                    pendingTurnState = normalizePendingTurn(data.pendingTurn);
                    applyQueuedSkillVisuals();
                    syncTurnState(data.currentTurn, data.turnExpiresAt);
                })
                .catch((error) => {
                    console.warn('Failed to queue skill.', error);
                })
                .finally(() => {
                    clearTargetHighlights();
                    activeTargetOptions = null;
                    activeCastingSkill = null;
                });
        };

        const attachCardTargetHandlers = (cards, username) => {
            cards.forEach((card, slot) => {
                if (!card) return;
                card.dataset.username = username;
                card.dataset.slot = slot;
                card.removeEventListener('click', handleCardTargetClick);
                card.addEventListener('click', handleCardTargetClick);
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
                    enemyNameEl.textContent = data.opponent.username;
                    currentOpponentUsername = data.opponent.username;
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
                                imgEl.addEventListener('click', () => {
                                    const effectiveSkill =
                                        getEffectiveSkillForActorSlot(slotIndex, skillIdx) || skill;
                                    renderSkillInfo(character, effectiveSkill, slotIndex);
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
                                                syncTurnState(data.currentTurn, data.turnExpiresAt);
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
                                    fetchTargetOptions(slotIndex, skillIdx).catch(() => clearTargetHighlights());
                                });
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
                        renderSkillInfo(firstChar, firstSkill, 0);
                    }
                }

                if (data.player?.username) {
                    currentPlayerUsername = data.player.username;
                }
                applyMatchState(data);
                renderDynamicSkillIcons();
            } catch (error) {
                console.warn('Failed to load match data.', error);
            }
        };

        loadMatchForIngame();

        const startMatchPoll = () => {
            if (matchPoll || !matchIdFromUrl) return;
            matchPoll = setInterval(async () => {
                try {
                    const res = await fetch(`${API_BASE_URL}/api/match/${encodeURIComponent(matchIdFromUrl)}`, {
                        credentials: 'include',
                    });
                    if (!res.ok) {
                        throw new Error('Match not found or finished.');
                    }
                    const data = await res.json();
                    if (!data?.ok) {
                        throw new Error('Match unavailable.');
                    }
                    if (data.player?.username) {
                        currentPlayerUsername = data.player.username;
                    }
                    applyMatchState(data);
                } catch (error) {
                    clearInterval(matchPoll);
                    matchPoll = null;
                }
            }, 3000);
        };
        startMatchPoll();

        const surrenderButton = document.querySelector('.surrenderbutton');
        const handleReadySectionClick = async () => {
            if (!currentPlayerUsername || !currentTurnUsername) return;
            if (currentPlayerUsername !== currentTurnUsername) return;
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
                    throw new Error(data?.error || 'Failed to end turn.');
                }
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

        const adjustRandomChakra = async (chakraType, delta) => {
            if (!matchIdFromUrl) return;
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
                syncTurnState(data.currentTurn, data.turnExpiresAt);
                if (endTurnModalEl && endTurnModalEl.style.visibility === 'visible') {
                    renderEndTurnModal(playerPoolState, pendingTurnState);
                }
            } catch (error) {
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
                syncTurnState(data.currentTurn, data.turnExpiresAt);
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
                const name = row.querySelector('.chakra-name')?.textContent?.trim().toLowerCase();
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
                showBattleEndOverlay({ didWin, opponentUsername });
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

    let profileCache = null;

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
                localStorage.setItem('narutoUser', JSON.stringify({ username: data.user.username }));
                return data.user;
            }
        } catch (error) {
            return null;
        }
        return null;
    };

    const hydratePlayerCard = async () => {
        const playerName = document.querySelector('.player-nameselection, .player-name');
        if (!playerName) return;

        // Use cached username immediately for instant UI update
        const cachedUser = localStorage.getItem('narutoUser');
        if (cachedUser) {
            try {
                const user = JSON.parse(cachedUser);
                if (user?.username) {
                    playerName.textContent = user.username;
                }
            } catch (error) {
                console.warn('Unable to load stored user profile.', error);
            }
        }

        // Refresh from API when available
        const apiUser = await fetchProfile();
        if (apiUser?.username) {
            playerName.textContent = apiUser.username;
            localStorage.setItem('narutoUser', JSON.stringify({ username: apiUser.username }));
        }
    };

    await hydratePlayerCard();

    const logoutButton = document.querySelector('.logout-button');
    const quickButton = document.querySelector('.quick-button');
    const ladderButton = document.querySelector('.ladder-button');
    const privateButton = document.querySelector('.private-button');
    const searchingBackdrop = document.querySelector('.searching-backdrop');
    const searchingOverlay = document.querySelector('.searchingscroll');
    const cancelSearchingButton = document.querySelector('.cancel-button');
    let matchmakingPoll = null;
    let isSearching = false;
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

    const openSearching = () => {
        if (!searchingOverlay || !searchingBackdrop) return;
        searchingBackdrop.classList.remove('hidden');
        searchingBackdrop.classList.add('visible');
    };

    const closeSearching = () => {
        if (!searchingOverlay || !searchingBackdrop) return;
        searchingBackdrop.classList.add('hidden');
        searchingBackdrop.classList.remove('visible');
    };

    closeSearching();

    const resumeMatchIfActive = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/match/status`, {
                credentials: 'include',
            });
            const data = await response.json();
            if (data?.matchFound && data.matchId) {
                redirectToMatch(data.matchId);
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
                    clearInterval(matchmakingPoll);
                    matchmakingPoll = null;
                    isSearching = false;
                    closeSearching();
                    redirectToMatch(data.matchId);
                }
            } catch (error) {
                console.warn('Match status check failed:', error);
            }
        }, 2000);
    };

    const joinMatchmaking = async () => {
        if (isSearching) return;
        isSearching = true;
        openSearching();
        try {
            const response = await fetch(`${API_BASE_URL}/api/match/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ team: getTeamIndices() }),
            });
            const data = await response.json();
            if (data?.matchFound && data.matchId) {
                isSearching = false;
                closeSearching();
                redirectToMatch(data.matchId);
                return;
            }
            startPollingMatch();
        } catch (error) {
            console.error('Failed to join matchmaking:', error);
            isSearching = false;
            closeSearching();
            alert('Could not start matchmaking. Please try again.');
        }
    };

    const cancelMatchmaking = async () => {
        isSearching = false;
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
            joinMatchmaking();
        });
    }

    if (cancelSearchingButton) {
        cancelSearchingButton.addEventListener('click', (event) => {
            event.preventDefault();
            cancelMatchmaking();
        });
    }

    const openSkillViewer = () => {
        if (skillViewer) {
            skillViewer.classList.remove('collapsed');
        }
    };

    const closeSkillViewer = () => {
        if (skillViewer) {
            skillViewer.classList.add('collapsed');
        }
    };

    if (skillViewer) {
        closeSkillViewer();
    }

    if (skillScroll && skillViewer) {
        skillScroll.addEventListener('click', () => {
            skillViewer.classList.toggle('collapsed');
        });
    }

    let roster = [];
    if (typeof characters !== 'undefined' && Array.isArray(characters)) {
        roster = characters;
    } else if (Array.isArray(window.characters)) {
        roster = window.characters;
    }

    const totalSlots = Math.max(roster.length, 21);
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
        classes.forEach((cls) => {
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
    };

    const fillRosterSlot = (index) => {
        const slot = rosterSlotElements[index];
        const character = roster[index];
        if (!slot || !character) return;
        slot.innerHTML = '';
        slot.classList.remove('slot-empty');
        const image = document.createElement('img');
        image.className = 'slot-image';
        image.src = character.facePicture;
        image.alt = character.name || `Character ${index + 1}`;
        slot.appendChild(image);
        image.addEventListener('dragstart', (event) => handleSlotDragStart(event, index));
        image.addEventListener('dragend', handleSlotDragEnd);
    };

    const setSelectedSlot = (slotIndex, assignment) => {
        const slotElement = selectedSlots[slotIndex];
        if (!slotElement) return;
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

    selectedSlots.forEach((slot, slotIndex) => {
        slot.addEventListener('click', () => handleSelectedSlotClick(slotIndex));
        slot.addEventListener('dragover', (event) => handleSelectedSlotDragOver(event, slot));
        slot.addEventListener('dragenter', (event) => handleSelectedSlotDragOver(event, slot));
        slot.addEventListener('dragleave', (event) => handleSelectedSlotDragLeave(event, slot));
        slot.addEventListener('drop', (event) => handleSelectedSlotDrop(event, slotIndex));
        slot.addEventListener('dblclick', () => handleSelectedSlotDoubleClick(slotIndex));
    });

    const applySavedTeam = () => {
        const saved = profileCache?.savedTeamIndices;
        if (!Array.isArray(saved) || saved.length !== selectedSlots.length) {
            updateGameButtons();
            return;
        }
        const used = new Set();
        saved.forEach((rosterIdx, slotIdx) => {
            if (!Number.isInteger(rosterIdx) || rosterIdx < 0 || rosterIdx >= roster.length) return;
            if (used.has(rosterIdx)) return;
            const assignment = { characterIndex: rosterIdx, rosterIndex: rosterIdx };
            clearRosterSlot(rosterIdx);
            setSelectedSlot(slotIdx, assignment);
            used.add(rosterIdx);
        });
        updateGameButtons();
    };

    for (let i = 0; i < totalSlots; i += 1) {
        const listItem = document.createElement('li');
        listItem.className = 'slot-item';
        listItem.dataset.index = i;
        listItem.draggable = true;
        listItem.addEventListener('dragstart', (event) => handleSlotDragStart(event, i));
        listItem.addEventListener('dragend', handleSlotDragEnd);
        listItem.addEventListener('dragover', handleRosterDragOver);
        listItem.addEventListener('drop', (event) => handleRosterDrop(event, i));

        const character = roster[i];
        if (character && character.facePicture) {
            const image = document.createElement('img');
            image.className = 'slot-image';
            image.src = character.facePicture;
            image.alt = character.name || `Character ${i + 1}`;
            listItem.appendChild(image);
            listItem.addEventListener('click', () => {
                if (listItem.classList.contains('slot-empty')) return;
                handleCharacterSelect(i);
            });
            image.draggable = true;
            image.addEventListener('dragstart', (event) => handleSlotDragStart(event, i));
            image.addEventListener('dragend', handleSlotDragEnd);
        }

        rosterSlotElements[i] = listItem;
        slotList.appendChild(listItem);
    }

    updateGameButtons();
    persistTeamSelection();
    applySavedTeam();
    resumeMatchIfActive();
});
