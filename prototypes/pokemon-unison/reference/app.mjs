import { ALWAYS_UNLOCKED_CHARACTER_IDS, resolveMissionUnlockPointCost } from './mission-catalog.mjs';
import { ROSTER, unitPresentation } from './roster.mjs';
import { selectionFormRenderUrl, selectionRenderForms } from './selection-art.mjs';
import { skillArt } from './skill-art.mjs';

const applicationBaseUrl = new URL('.', import.meta.url);

function applicationUrl(path = '') {
    return new URL(String(path).replace(/^\/+/, ''), applicationBaseUrl).href;
}

function applicationLocation(search = '') {
    return `${applicationBaseUrl.pathname}${search}`;
}

const elements = {
    accountBar: document.querySelector('#account-bar'),
    accountForm: document.querySelector('#account-form'),
    accountUsername: document.querySelector('#account-username'),
    accountEmail: document.querySelector('#account-email'),
    accountPassword: document.querySelector('#account-password'),
    accountLoginButton: document.querySelector('#account-login-button'),
    accountRegisterButton: document.querySelector('#account-register-button'),
    accountError: document.querySelector('#account-error'),
    accountSignedIn: document.querySelector('#account-signed-in'),
    accountUsernameLabel: document.querySelector('#account-username-label'),
    accountPointsLabel: document.querySelector('#account-points-label'),
    accountLogoutButton: document.querySelector('#account-logout-button'),
    progressToggleButton: document.querySelector('#progress-toggle-button'),
    progressPanel: document.querySelector('#progress-panel'),
    progressCloseButton: document.querySelector('#progress-close-button'),
    progressTabMissions: document.querySelector('#progress-tab-missions'),
    progressTabSkins: document.querySelector('#progress-tab-skins'),
    progressTabStore: document.querySelector('#progress-tab-store'),
    progressMissions: document.querySelector('#progress-missions'),
    progressSkins: document.querySelector('#progress-skins'),
    progressStore: document.querySelector('#progress-store'),
    progressMissionsList: document.querySelector('#progress-missions-list'),
    progressSkinsList: document.querySelector('#progress-skins-list'),
    storePointsBalance: document.querySelector('#store-points-balance'),
    storePaypalStatus: document.querySelector('#store-paypal-status'),
    storePackagesList: document.querySelector('#store-packages-list'),
    actionError: document.querySelector('#action-error'),
    autoButton: document.querySelector('#auto-button'),
    commandHelp: document.querySelector('#command-help'),
    connectionLabel: document.querySelector('#connection-label'),
    copyInviteButton: document.querySelector('#copy-invite-button'),
    currentPlayer: document.querySelector('#current-player'),
    energyA: document.querySelector('#energy-a'),
    energyB: document.querySelector('#energy-b'),
    eventLog: document.querySelector('#event-log'),
    exportButton: document.querySelector('#export-button'),
    gameRoot: document.querySelector('#game-root'),
    invitePanel: document.querySelector('#invite-panel'),
    inviteUrl: document.querySelector('#invite-url'),
    legalCount: document.querySelector('#legal-count'),
    lobbyPanel: document.querySelector('#lobby-panel'),
    lobbyStatus: document.querySelector('#lobby-status'),
    newMatchButton: document.querySelector('#new-match-button'),
    rankedMatchButton: document.querySelector('#ranked-match-button'),
    quickMatchButton: document.querySelector('#quick-match-button'),
    queueSearchPanel: document.querySelector('#queue-search-panel'),
    queueSearchStatus: document.querySelector('#queue-search-status'),
    cancelQueueButton: document.querySelector('#cancel-queue-button'),
    profileCard: document.querySelector('#profile-card'),
    profileCardUsername: document.querySelector('#profile-card-username'),
    profileCardRank: document.querySelector('#profile-card-rank'),
    profileCardExp: document.querySelector('#profile-card-exp'),
    profileCardRecord: document.querySelector('#profile-card-record'),
    profileCardStreak: document.querySelector('#profile-card-streak'),
    profileCardLadder: document.querySelector('#profile-card-ladder'),
    rosterPagePrev: document.querySelector('#roster-page-prev'),
    rosterPageNext: document.querySelector('#roster-page-next'),
    queueCount: document.querySelector('#queue-count'),
    queueList: document.querySelector('#queue-list'),
    replayJson: document.querySelector('#replay-json'),
    replayPanel: document.querySelector('.replay-panel'),
    resolveTurnButton: document.querySelector('#resolve-turn-button'),
    resolveTurnTopButton: document.querySelector('#resolve-turn-top-button'),
    rosterCount: document.querySelector('#roster-count'),
    rosterGrid: document.querySelector('#roster-grid'),
    seatLabel: document.querySelector('#seat-label'),
    seedLabel: document.querySelector('#seed-label'),
    surrenderButton: document.querySelector('#surrender-button'),
    selectionPreviewCount: document.querySelector('#selection-preview-count'),
    selectionPreviewFormControls: document.querySelector('#selection-form-controls'),
    selectionPreviewImage: document.querySelector('#selection-preview-image'),
    selectionPreviewShadow: document.querySelector('#selection-preview-shadow'),
    selectionPreviewName: document.querySelector('#selection-preview-name'),
    selectionPreviewPassive: document.querySelector('#selection-preview-passive'),
    selectionPreviewSkills: document.querySelector('#selection-preview-skills'),
    selectionPreviewAlternates: document.querySelector('#selection-preview-alternates'),
    selectionAlternateSection: document.querySelector('#selection-alternate-section'),
    selectionSkillDetail: document.querySelector('#selection-skill-detail'),
    selectionSkillDetailKind: document.querySelector('#selection-skill-detail-kind'),
    selectionSkillDetailName: document.querySelector('#selection-skill-detail-name'),
    selectionSkillDetailDescription: document.querySelector('#selection-skill-detail-description'),
    selectionSkillDetailCost: document.querySelector('#selection-skill-detail-cost'),
    selectionSkillDetailClasses: document.querySelector('#selection-skill-detail-classes'),
    selectionSkillDetailCooldown: document.querySelector('#selection-skill-detail-cooldown'),
    selectionPreviewTypes: document.querySelector('#selection-preview-types'),
    selectionBaseForm: document.querySelector('#selection-base-form'),
    selectionEvolutionForm: document.querySelector('#selection-evolution-form'),
    selectionBadgeCount: document.querySelector('#selection-badge-count'),
    soloMatchButton: document.querySelector('#solo-match-button'),
    skillList: document.querySelector('#skill-list'),
    targetList: document.querySelector('#target-list'),
    targetingArrow: document.querySelector('#targeting-arrow'),
    targetingArrowPath: document.querySelector('#targeting-arrow-path'),
    targetingKicker: document.querySelector('#targeting-kicker'),
    targetingReadout: document.querySelector('#targeting-readout'),
    targetingSkillCooldown: document.querySelector('#targeting-skill-cooldown'),
    targetingSkillCost: document.querySelector('#targeting-skill-cost'),
    targetingSkillClasses: document.querySelector('#targeting-skill-classes'),
    targetingSkillDescription: document.querySelector('#targeting-skill-description'),
    targetingSkillImage: document.querySelector('#targeting-skill-image'),
    targetingSkillName: document.querySelector('#targeting-skill-name'),
    targetingTargetName: document.querySelector('#targeting-target-name'),
    teamA: document.querySelector('#team-a'),
    teamANames: document.querySelector('#team-a-names'),
    teamB: document.querySelector('#team-b'),
    teamBNames: document.querySelector('#team-b-names'),
    teamSelectA: document.querySelector('#team-select-a'),
    teamSelectB: document.querySelector('#team-select-b'),
    turnLabel: document.querySelector('#turn-label'),
    undoQueueButton: document.querySelector('#undo-queue-button'),
    weatherBanner: document.querySelector('#weather-banner'),
    weatherName: document.querySelector('#weather-name'),
    weatherRounds: document.querySelector('#weather-rounds'),
    winnerLabel: document.querySelector('#winner-label'),
    turnTimer: document.querySelector('#turn-timer'),
};

const PLAYER_TOKEN_STORAGE_KEY = 'pokemon-unison:player-token';
let playerSession = null;
let activeProgressTab = 'missions';
let unlockedCharacterIds = null;
let missionCatalog = [];
let missionProgressByMissionId = {};
let unlockPoints = 0;
let skinCatalog = [];
let unlockedSkinIds = [];
let equippedSkinByCharacterId = {};
let storeInfo = null;
let session = null;
let snapshot = null;
let selectedActorSlot = null;
let selectedSkillId = null;
let selectedPaymentAction = null;
let selectedRandomEnergy = [];
let rosterCatalog = [];
let activeDraftPlayer = 'A';
let activeDraftSlot = 0;
let previewSpeciesId = 'charmander';
let activeQueueToken = null;
let activeQueueMode = null;
let rosterPage = 0;
let previewSelectionForm = 'base';
let previewSkillId = null;
let hoveredTargetCard = null;
const teamDraft = {
    A: [null, null, null],
    B: [null, null, null],
};

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function skillIconMarkup(skill, index, className) {
    if (!skill?.image) {
        return `<span class="${className} skill-art-fallback">${index + 1}</span>`;
    }
    return `<img class="${className} skill-art" src="${escapeHtml(skill.image)}" alt="" aria-hidden="true" decoding="async">`;
}

function findSkillById(skillId) {
    if (!skillId) return null;
    for (const species of Object.values(ROSTER)) {
        const skill = species.skills?.find((candidate) => candidate.id === skillId);
        if (skill) return skill;
    }
    return null;
}

function statusEffectDescription(status) {
    if (status.description) return status.description;
    const effects = [];
    const damageKind = (kind = 'affliction') => kind.replaceAll('-', ' ');
    if (status.periodicDamage) {
        effects.push(`Takes ${status.periodicDamage} ${damageKind(status.periodicDamageKind)} damage each turn.`);
    }
    if (status.periodicDrain) {
        effects.push(`Loses ${status.periodicDrain} HP each turn and heals the source by the HP lost.`);
    }
    if (status.turnEndDamage) {
        effects.push(`Takes ${status.turnEndDamage} ${damageKind(status.turnEndDamageKind)} damage at turn end.`);
    }
    if (status.onExpireDamage) {
        effects.push(`Takes ${status.onExpireDamage} ${damageKind(status.onExpireDamageKind)} damage when this effect expires.`);
    }
    if (status.healBlocked) effects.push('Cannot be healed.');
    if (status.paralyzeCooldowns) effects.push('Cooldowns are paralyzed and do not recover.');
    if (status.cannotUseSkills) effects.push('Cannot use skills.');
    if (status.stunHarmful) effects.push('Harmful skills are stunned.');
    if (status.cannotUseNonMentalSkills) effects.push('Can only use Mental skills.');
    if (status.cannotUseSkillClasses?.length) {
        effects.push(`${status.cannotUseSkillClasses.join(' and ')} skills are stunned.`);
    }
    if (status.cannotUseHelpfulSkills) effects.push('Cannot use helpful skills.');
    if (status.newSkillCooldownIncrease) {
        effects.push(`Newly used skills receive ${status.newSkillCooldownIncrease} extra cooldown${status.newSkillCooldownIncrease === 1 ? '' : 's'}.`);
    }
    if (status.newSkillCooldownIncreaseOnFirstUse) {
        effects.push(`Each skill receives ${status.newSkillCooldownIncreaseOnFirstUse} extra cooldown${status.newSkillCooldownIncreaseOnFirstUse === 1 ? '' : 's'} the first time it is used.`);
    }
    if (status.randomCostIncrease) {
        effects.push(`Skills cost ${status.randomCostIncrease} additional Random energy.`);
    }
    if (status.skillFailChance) {
        effects.push(`Skills have a ${status.skillFailChance}% chance to fail${status.skillFailDamage ? ` and cost ${status.skillFailDamage} HP` : ''}.`);
    }
    if (status.guardBroken) effects.push('Defensive damage reduction is bypassed.');
    if (status.invulnerable) effects.push('Invulnerable to enemy skills.');
    if (status.invulnerableToSkillClasses?.length) {
        effects.push(`Invulnerable to ${status.invulnerableToSkillClasses.join(' and ')} skills.`);
    }
    if (status.blockNextHarmful) effects.push('Blocks the next harmful enemy skill.');
    if (status.blockAllHarmful) effects.push('Blocks harmful enemy skills.');
    if (status.reflectNextOwnerUseSkill) effects.push('Reflects the next qualifying skill back onto its user.');
    if (status.evadeChancePercent) effects.push(`Has ${status.evadeChancePercent}% evasion.`);
    if (status.turnStartDamage) {
        effects.push(`Takes ${status.turnStartDamage} damage at the beginning of the source's next turn.`);
    }
    if (status.preventTeamAccuracyReduction) effects.push('Allied accuracy cannot be reduced.');
    if (status.preventEnemyEvasion) effects.push('Enemy evasion cannot be increased.');
    if (status.damageReductionPercent) effects.push(`Takes ${status.damageReductionPercent}% less ordinary damage.`);
    if (status.damageReductionFlat) effects.push(`Takes ${status.damageReductionFlat} less ordinary damage per hit.`);
    if (status.unpierceableDamageReductionPercent) {
        effects.push(`Takes ${status.unpierceableDamageReductionPercent}% less non-fixed damage.`);
    }
    if (status.unpierceableDamageReductionFlat) {
        effects.push(`Takes ${status.unpierceableDamageReductionFlat} less non-affliction damage per packet, including piercing damage.`);
    }
    if (status.outgoingDamageDebuff) effects.push(`Deals ${status.outgoingDamageDebuff} less damage per packet.`);
    if (status.damageBonusFlat) effects.push(`Deals ${status.damageBonusFlat} additional damage per packet.`);
    if (status.nonAfflictionDamageBonusFlat) effects.push(`Deals ${status.nonAfflictionDamageBonusFlat} additional non-affliction damage per packet.`);
    if (status.healReceivedMultiplier && status.healReceivedMultiplier !== 1) {
        effects.push(`Receives ${Math.round((status.healReceivedMultiplier - 1) * 100)}% more healing.`);
    }
    if (status.additionalIncomingShieldPoints) {
        effects.push(`Receives ${status.additionalIncomingShieldPoints} additional Shield from new grants.`);
    }
    if (status.minimumHp) effects.push(`Cannot fall below ${status.minimumHp} HP.`);
    if (status.onUseSkill?.damageToOwner) {
        effects.push(`The next skill used costs ${status.onUseSkill.damageToOwner} HP${status.onUseSkill.healSource ? ` and heals the source by ${status.onUseSkill.healSource}` : ''}.`);
    }
    if (status.skillCostOverrides) effects.push('The listed skill costs are temporarily modified.');
    if (status.trackedShieldPoints) effects.push(`${status.trackedShieldPoints} Shield remains tied to this effect.`);
    if (status.trackedBarrierPoints) effects.push(`${status.trackedBarrierPoints} Barrier remains tied to this effect.`);
    if (status.storedDamageBonus) {
        effects.push(`The next ${status.storedDamageBonusSkillName ?? 'qualifying skill'} deals ${status.storedDamageBonus} additional damage.`);
    }
    if (status.storedPiercingBonus) {
        effects.push(`The next qualifying piercing attack deals ${status.storedPiercingBonus} additional damage.`);
    }
    if (status.tauntSource) effects.push('Must use harmful targeted skills on the taunting Pokémon.');
    if (status.fullBlind) effects.push('Harmful targeted skills are redirected.');
    if (status.invulnerableToHelpfulSkills) effects.push('Cannot be targeted by helpful skills.');
    if (status.ignoreEnemyNonDamageEffects) effects.push('Ignores enemy non-damaging effects.');
    if (status.onEnemyTargeted?.damageToActor) {
        effects.push(`Enemies that target this Pokémon take ${status.onEnemyTargeted.damageToActor} damage and receive its retaliation effect.`);
    }
    return effects.join(' ') || `${status.name} remains active.`;
}

function statusIconMarkup(status, index) {
    const sourceArtAliases = {
        'pikachu-static-passive': 'pikachu-passive-static',
    };
    const sourceId = status.sourceSkillId ?? sourceArtAliases[status.id] ?? status.id;
    const catalogSkill = findSkillById(sourceId);
    const sourceSkill = catalogSkill ?? {
        image: skillArt(sourceId),
        description: status.id === 'pikachu-static-passive'
            ? ROSTER.pikachu.passiveDescription
            : status.name,
    };
    const description = statusEffectDescription(status);
    const duration = Number.isInteger(status.durationActions)
        ? `${status.durationActions} turn${status.durationActions === 1 ? '' : 's'} remaining`
        : 'Permanent effect';
    return `<button type="button" class="status-icon" aria-expanded="false"
        aria-label="${escapeHtml(`${status.name}. ${description}. ${duration}`)}">
        ${skillIconMarkup(sourceSkill, index, 'status-skill-art')}
        <span class="status-tooltip" role="tooltip"><strong>${escapeHtml(status.name)}</strong><span>${escapeHtml(description)}</span><small>${escapeHtml(duration)}</small></span>
    </button>`;
}

function protectionTrackMarkup(kind, currentValue, capacityValue) {
    const current = Math.max(0, Number(currentValue) || 0);
    const capacity = Math.max(current, Number(capacityValue) || 0);
    const percent = capacity > 0 ? Math.min(100, (current / capacity) * 100) : 0;
    const label = `${current}/${capacity}`;
    return `
        <div class="protection-track protection-${kind} ${current > 0 ? 'is-active' : 'is-empty'}"
             role="img" aria-label="${escapeHtml(kind)} ${label}" title="${escapeHtml(kind)} ${label}">
            <div class="protection-fill" style="width:${percent}%"></div>
            <span>${label}</span>
        </div>
    `;
}

function passiveCounterMarkup(unit) {
    if (unit.speciesId !== 'bulbasaur') return '';
    const sun = Math.max(0, Math.min(5, Number(unit.counters.sun) || 0));
    return `<div class="sun-meter" role="img" aria-label="Sun ${sun} of 5" title="Sun ${sun}/5">
        ${Array.from({ length: 5 }, (_, index) => `<span class="sun-orb ${index < sun ? 'active' : ''}"></span>`).join('')}
        <small>${sun}/5</small>
    </div>`;
}

async function api(path, { method = 'GET', body, token = session?.token } = {}) {
    const response = await fetch(applicationUrl(path), {
        method,
        headers: {
            ...(body ? { 'content-type': 'application/json' } : {}),
            ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || `Request failed (${response.status}).`);
    return payload;
}

function tokenKey(matchId, player) {
    return `pokemon-unison:${matchId}:${player}`;
}

function inviteKey(matchId) {
    return `pokemon-unison:${matchId}:invite`;
}

function saveSession(next) {
    session = next;
    sessionStorage.setItem(tokenKey(next.matchId, next.player), next.token);
}

function loadStoredPlayerToken() {
    return localStorage.getItem(PLAYER_TOKEN_STORAGE_KEY) ?? '';
}

function savePlayerToken(token) {
    if (token) {
        localStorage.setItem(PLAYER_TOKEN_STORAGE_KEY, token);
    } else {
        localStorage.removeItem(PLAYER_TOKEN_STORAGE_KEY);
    }
}

function renderAccountBar() {
    const signedIn = Boolean(playerSession);
    elements.accountForm.hidden = signedIn;
    elements.accountSignedIn.hidden = !signedIn;
    if (signedIn) {
        elements.accountUsernameLabel.textContent = playerSession.player.username;
        elements.accountPointsLabel.textContent = `${unlockPoints} pts`;
    } else {
        elements.progressPanel.hidden = true;
    }
    renderProfileCard();
}

function renderProfileCard() {
    elements.profileCard.hidden = !playerSession;
    if (!playerSession) return;
    const ladder = playerSession.player.profile?.ladder ?? {
        rank: 'Sparkstrike', level: 1, experiencePoints: 0, wins: 0, losses: 0, streak: 0, ladderRank: null,
    };
    elements.profileCardUsername.textContent = playerSession.player.username;
    elements.profileCardRank.textContent = ladder.rank;
    elements.profileCardExp.textContent = `${ladder.experiencePoints} XP · LV ${ladder.level}`;
    elements.profileCardRecord.textContent = `${ladder.wins}W · ${ladder.losses}L`;
    elements.profileCardStreak.textContent = ladder.streak > 0 ? `+${ladder.streak}` : String(ladder.streak);
    elements.profileCardLadder.textContent = ladder.ladderRank ? `#${ladder.ladderRank}` : '—';
}

function isCharacterLocked(speciesId) {
    if (!playerSession || !unlockedCharacterIds) return false;
    if (ALWAYS_UNLOCKED_CHARACTER_IDS.includes(speciesId)) return false;
    return !unlockedCharacterIds.includes(speciesId);
}

function missionUnlockCost(characterId) {
    const mission = missionCatalog.find((entry) => entry.reward_character === characterId);
    return mission ? resolveMissionUnlockPointCost(mission) : null;
}

// Mirrors match-service.mjs's formOverrides resolution client-side, so the
// pre-match roster/team UI shows the same evolved Pokemon and kit that will
// actually be used once the match is created — not just the base form.
function equippedFormFor(speciesId) {
    const skinId = equippedSkinByCharacterId[speciesId];
    if (!skinId) return null;
    const skin = skinCatalog.find((entry) => entry.skinId === skinId);
    const formId = skin?.patch?.form;
    return typeof formId === 'string' && formId ? formId : null;
}

// A display-only variant of catalogSpecies() that swaps in the equipped
// evolution form's name/portrait/types when one applies. Never used for
// identity/lock/assignment checks, which still key off the base speciesId.
function displaySpecies(speciesId) {
    const base = catalogSpecies(speciesId);
    if (!base) return base;
    const formId = equippedFormFor(speciesId);
    const form = formId ? ROSTER[speciesId]?.forms?.[formId] : null;
    if (!form) return base;
    return {
        ...base,
        name: form.name || base.name,
        facePicture: form.facePicture || base.facePicture,
        types: form.types || base.types,
    };
}

async function loadAccountProgress() {
    if (!playerSession) {
        unlockedCharacterIds = null;
        missionCatalog = [];
        missionProgressByMissionId = {};
        unlockPoints = 0;
        skinCatalog = [];
        unlockedSkinIds = [];
        equippedSkinByCharacterId = {};
        storeInfo = null;
        renderAccountBar();
        renderProgressPanel();
        renderRosterGrid();
        return;
    }
    try {
        const [missions, skins, store, me] = await Promise.all([
            api('/api/missions', { token: playerSession.token }),
            api('/api/skins', { token: playerSession.token }),
            api('/api/store', { token: playerSession.token }),
            api('/api/players/me', { token: playerSession.token }),
        ]);
        playerSession.player = me.player;
        missionCatalog = missions.missions ?? [];
        missionProgressByMissionId = missions.missionProgressByMissionId ?? {};
        unlockedCharacterIds = missions.unlockedCharacterIds ?? [];
        unlockPoints = missions.unlockPoints ?? 0;
        skinCatalog = skins.skins ?? [];
        unlockedSkinIds = skins.unlockedSkinIds ?? [];
        equippedSkinByCharacterId = skins.equippedSkinByCharacterId ?? {};
        storeInfo = store;
    } catch (error) {
        elements.accountError.textContent = error.message;
    }
    renderAccountBar();
    renderProgressPanel();
    renderTeamSelectors();
}

function missionGoalMarkup(goal, progress) {
    const type = String(goal?.type ?? '').toLowerCase();
    if (type === 'text') {
        return `<li class="mission-goal">${escapeHtml(goal.text ?? '')}</li>`;
    }
    const target = type === 'reach_rank' ? Number(goal.rank) || 0 : Number(goal.wins) || 0;
    const count = Math.min(target, Number(progress?.count) || 0);
    const complete = Boolean(progress?.completedAt);
    const characters = goal.character_names ?? (goal.character_name ? [goal.character_name] : []);
    const label = characters.length ? `${characters.join(' + ')}: ` : '';
    const percent = target > 0 ? Math.round((count / target) * 100) : 0;
    return `
        <li class="mission-goal ${complete ? 'complete' : ''}">
            <span>${complete ? '✓' : ''} ${escapeHtml(label)}${count}/${target}</span>
            <span class="mission-goal-bar"><span class="mission-goal-bar-fill" style="width:${percent}%"></span></span>
        </li>
    `;
}

function renderProgressPanel() {
    if (activeProgressTab === 'missions') renderMissionsTab();
    else if (activeProgressTab === 'skins') renderSkinsTab();
    else renderStoreTab();
}

function renderMissionsTab() {
    if (!playerSession) {
        elements.progressMissionsList.innerHTML = '<p class="progress-empty-note">Sign in to track mission progress.</p>';
        return;
    }
    if (!missionCatalog.length) {
        elements.progressMissionsList.innerHTML = '<p class="progress-empty-note">No missions available.</p>';
        return;
    }
    elements.progressMissionsList.innerHTML = missionCatalog
        .slice()
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((mission) => {
            const progress = missionProgressByMissionId[mission.missionId];
            const completed = Boolean(progress?.completedAt);
            const goalsHtml = (mission.goals ?? [])
                .map((goal, index) => missionGoalMarkup(goal, progress?.goalProgressByIndex?.[index]))
                .join('');
            return `
                <article class="mission-card ${completed ? 'completed' : ''}">
                    <div class="mission-card-heading">
                        <span>${escapeHtml(mission.title ?? mission.missionId)}</span>
                        ${completed ? '<span class="mission-card-status">Complete</span>' : ''}
                    </div>
                    <ul class="mission-goal-list">${goalsHtml}</ul>
                </article>
            `;
        })
        .join('');
}

async function unlockSkin(skinId) {
    if (!playerSession) return;
    try {
        await api('/api/skins/unlock', { method: 'POST', token: playerSession.token, body: { skinId } });
        await loadAccountProgress();
    } catch (error) {
        elements.accountError.textContent = error.message;
    }
}

async function equipSkin(characterId, skinId) {
    if (!playerSession) return;
    try {
        await api('/api/skins/equip', {
            method: 'POST',
            token: playerSession.token,
            body: { characterId, skinId },
        });
        await loadAccountProgress();
    } catch (error) {
        elements.accountError.textContent = error.message;
    }
}

function renderSkinsTab() {
    if (!playerSession) {
        elements.progressSkinsList.innerHTML = '<p class="progress-empty-note">Sign in to unlock and equip skins.</p>';
        return;
    }
    if (!skinCatalog.length) {
        elements.progressSkinsList.innerHTML = '<p class="progress-empty-note">No skins available.</p>';
        return;
    }
    elements.progressSkinsList.replaceChildren();
    skinCatalog
        .slice()
        .sort((a, b) => a.characterId.localeCompare(b.characterId))
        .forEach((skin) => {
            const speciesName = ROSTER[skin.characterId]?.name ?? skin.characterId;
            const unlocked = unlockedSkinIds.includes(skin.skinId);
            const equipped = equippedSkinByCharacterId[skin.characterId] === skin.skinId;
            const card = document.createElement('article');
            card.className = 'skin-card';
            card.innerHTML = `
                <div class="skin-card-heading">
                    <span>${escapeHtml(skin.name)} <small>(${escapeHtml(speciesName)})</small></span>
                    ${skin.missionRewardOnly ? '<small>Mission reward</small>' : `<small>${skin.unlockPointCost} pts</small>`}
                </div>
                <p class="progress-empty-note">${escapeHtml(skin.description ?? '')}</p>
            `;
            const actions = document.createElement('div');
            actions.className = 'skin-card-actions';
            if (!unlocked) {
                if (!skin.missionRewardOnly) {
                    const unlockButton = document.createElement('button');
                    unlockButton.type = 'button';
                    unlockButton.textContent = `Unlock for ${skin.unlockPointCost} pts`;
                    unlockButton.addEventListener('click', () => unlockSkin(skin.skinId));
                    actions.append(unlockButton);
                } else {
                    const lockedNote = document.createElement('span');
                    lockedNote.className = 'progress-empty-note';
                    lockedNote.textContent = 'Unlocked through missions.';
                    actions.append(lockedNote);
                }
            } else {
                const equipButton = document.createElement('button');
                equipButton.type = 'button';
                equipButton.textContent = equipped ? 'Equipped' : 'Equip';
                if (equipped) equipButton.classList.add('equipped');
                equipButton.addEventListener('click', () => equipSkin(skin.characterId, equipped ? '' : skin.skinId));
                actions.append(equipButton);
            }
            card.append(actions);
            elements.progressSkinsList.append(card);
        });
}

async function purchaseCharacterWithPoints(characterId) {
    if (!playerSession) return;
    try {
        await api(`/api/store/characters/${encodeURIComponent(characterId)}/purchase`, {
            method: 'POST',
            token: playerSession.token,
        });
        await loadAccountProgress();
    } catch (error) {
        elements.accountError.textContent = error.message;
    }
}

async function buyPointPackage(packageId) {
    if (!playerSession) return;
    try {
        const result = await api('/api/store/paypal/create-order', {
            method: 'POST',
            token: playerSession.token,
            body: { packageId },
        });
        if (result.approveUrl) window.open(result.approveUrl, '_blank', 'noopener');
    } catch (error) {
        elements.accountError.textContent = error.message;
    }
}

function renderStoreTab() {
    elements.storePointsBalance.textContent = String(unlockPoints);
    if (!playerSession) {
        elements.storePaypalStatus.textContent = 'Sign in to buy unlock points.';
        elements.storePackagesList.innerHTML = '';
        return;
    }
    const paypalAvailable = Boolean(storeInfo?.paypalAvailable);
    elements.storePaypalStatus.textContent = paypalAvailable
        ? `PayPal payments are available (${storeInfo.paypalEnvironment}).`
        : 'PayPal payments are not configured for this build yet.';
    const packages = storeInfo?.packages ?? [];
    elements.storePackagesList.replaceChildren();
    packages.forEach((entry) => {
        const card = document.createElement('article');
        card.className = 'store-package-card';
        card.innerHTML = `
            <div class="store-package-heading">
                <span>${escapeHtml(entry.label)}</span>
                <small>$${escapeHtml(entry.amountUsd)}</small>
            </div>
            <p class="progress-empty-note">${escapeHtml(entry.description ?? '')}</p>
        `;
        const actions = document.createElement('div');
        actions.className = 'store-package-actions';
        const buyButton = document.createElement('button');
        buyButton.type = 'button';
        buyButton.textContent = 'Buy with PayPal';
        buyButton.disabled = !paypalAvailable;
        buyButton.addEventListener('click', () => buyPointPackage(entry.packageId));
        actions.append(buyButton);
        card.append(actions);
        elements.storePackagesList.append(card);
    });
}

function setProgressTab(tab) {
    activeProgressTab = tab;
    [
        [elements.progressTabMissions, elements.progressMissions, 'missions'],
        [elements.progressTabSkins, elements.progressSkins, 'skins'],
        [elements.progressTabStore, elements.progressStore, 'store'],
    ].forEach(([tabButton, panel, key]) => {
        const active = key === tab;
        tabButton.classList.toggle('active', active);
        tabButton.setAttribute('aria-selected', String(active));
        panel.hidden = !active;
    });
    renderProgressPanel();
}

elements.progressTabMissions.addEventListener('click', () => setProgressTab('missions'));
elements.progressTabSkins.addEventListener('click', () => setProgressTab('skins'));
elements.progressTabStore.addEventListener('click', () => setProgressTab('store'));
elements.progressCloseButton.addEventListener('click', () => {
    elements.progressPanel.hidden = true;
});
elements.progressToggleButton.addEventListener('click', () => {
    elements.progressPanel.hidden = !elements.progressPanel.hidden;
    if (!elements.progressPanel.hidden) renderProgressPanel();
});

async function restorePlayerSession() {
    const token = loadStoredPlayerToken();
    if (!token) return;
    try {
        const { player } = await api('/api/players/me', { token });
        playerSession = { player, token };
    } catch {
        savePlayerToken('');
        playerSession = null;
    }
    renderAccountBar();
    await loadAccountProgress();
}

async function registerPlayer() {
    elements.accountError.textContent = '';
    try {
        const { player, token } = await api('/api/players/register', {
            method: 'POST',
            token: null,
            body: {
                username: elements.accountUsername.value,
                email: elements.accountEmail.value,
                password: elements.accountPassword.value,
            },
        });
        playerSession = { player, token };
        savePlayerToken(token);
        elements.accountForm.reset();
        renderAccountBar();
        await loadAccountProgress();
    } catch (error) {
        elements.accountError.textContent = error.message;
    }
}

async function loginPlayer() {
    elements.accountError.textContent = '';
    try {
        const { player, token } = await api('/api/players/login', {
            method: 'POST',
            token: null,
            body: {
                username: elements.accountUsername.value,
                password: elements.accountPassword.value,
            },
        });
        playerSession = { player, token };
        savePlayerToken(token);
        elements.accountForm.reset();
        renderAccountBar();
        await loadAccountProgress();
    } catch (error) {
        elements.accountError.textContent = error.message;
    }
}

async function logoutPlayer() {
    if (!playerSession) return;
    try {
        await api('/api/players/logout', { method: 'POST', token: playerSession.token });
    } catch {
        // The token may already be revoked or expired; clear local state regardless.
    }
    playerSession = null;
    savePlayerToken('');
    await loadAccountProgress();
}

elements.accountForm.addEventListener('submit', (event) => {
    event.preventDefault();
    loginPlayer();
});
elements.accountRegisterButton.addEventListener('click', registerPlayer);
elements.accountLogoutButton.addEventListener('click', logoutPlayer);

function energyLabel(key) {
    return {
        taijutsu: 'GREEN',
        ninjutsu: 'BLUE',
        bloodline: 'RED',
        genjutsu: 'YELLOW',
        random: 'RANDOM',
        total: 'TOTAL',
    }[key] ?? key.toUpperCase();
}

function formatEnergyCosts(costs) {
    return costs.length > 0 ? costs.map(energyLabel).join(' + ') : 'Free';
}

const TYPE_COLORS = {
    Normal: '#A8A878', Fire: '#F08030', Water: '#6890F0', Electric: '#F8D030',
    Grass: '#78C850', Ice: '#98D8D8', Fighting: '#C03028', Poison: '#A040A0',
    Ground: '#E0C068', Flying: '#A890F0', Psychic: '#F85888', Bug: '#A8B820',
    Rock: '#B8A038', Ghost: '#705898', Dragon: '#7038F8', Dark: '#705848',
    Steel: '#B8B8D0', Fairy: '#EE99AC',
};

function typeBadgeMarkup(moveType) {
    if (!moveType) return '';
    const color = TYPE_COLORS[moveType] ?? '#888';
    return `<span class="type-badge" style="background:${color}">${escapeHtml(moveType)}</span>`;
}

const CLASS_DISPLAY_RANK = {
    Weather: 0, Passive: 0,
    Physical: 1, Special: 1, Strategic: 1,
    Instant: 2, Action: 2, Control: 2, Channeled: 2,
    Affliction: 4,
};

const TARGET_LABELS = {
    'all-enemy': 'All Enemies',
    'all-allies': 'All Allies',
    self: 'Self',
    passive: 'Passive',
    'random-enemy': 'Random Enemy',
    'dead-ally': 'Defeated Ally',
    'single-enemy': 'Single Enemy',
    'single-ally': 'Single Ally',
    'single-character': 'Any Character',
    'self-or-single-ally': 'Self or Ally',
    'single-ally-or-dead-ally': 'Ally (Living or Defeated)',
    'single-enemy-or-ally': 'Any Single Target',
};

function skillHasTeamHarmfulSkillTrap(skill) {
    return Array.isArray(skill?.effects) &&
        skill.effects.some((effect) => effect?.status?.teamHarmfulSkillTrap);
}

function skillTargetLabel(skill) {
    if (!skill) return 'No target';
    if (skill.target === 'self' && skillHasTeamHarmfulSkillTrap(skill)) return 'Team';
    return TARGET_LABELS[skill.target] ?? skill.target ?? 'No target';
}

function classesMarkup(skill) {
    const classes = Array.isArray(skill?.classes) ? skill.classes : [];
    const displayClasses = classes
        .filter((entry) => entry !== skill.moveType)
        .slice()
        .sort((a, b) => (CLASS_DISPLAY_RANK[a] ?? 3) - (CLASS_DISPLAY_RANK[b] ?? 3));
    if (!displayClasses.length) return '';
    return `<span class="skill-classes">${displayClasses
        .map((entry) => `<span class="skill-class-badge">${escapeHtml(entry)}</span>`)
        .join('')}</span>`;
}

function energyCostMarkup(costs, compact = false) {
    if (!costs.length) return `<span class="skill-cost-free">FREE</span>`;
    return `<span class="skill-cost ${compact ? 'compact' : ''}" role="img" aria-label="Costs ${escapeHtml(formatEnergyCosts(costs))}">
        ${costs.map((cost) => `<i class="cost-square cost-${escapeHtml(cost)}" title="${escapeHtml(energyLabel(cost))}"></i>`).join('')}
    </span>`;
}

function clearTargetingArrow() {
    hoveredTargetCard?.classList.remove('target-hovered');
    hoveredTargetCard = null;
    elements.targetingArrow.classList.remove('is-visible');
    elements.targetingArrowPath.removeAttribute('d');
    if (!elements.targetingReadout.hidden) {
        elements.targetingTargetName.textContent = 'Hover a glowing target';
    }
}

function drawTargetingArrow(card, targetName) {
    if (!card || elements.targetingReadout.hidden) return;
    hoveredTargetCard?.classList.remove('target-hovered');
    hoveredTargetCard = card;
    hoveredTargetCard.classList.add('target-hovered');
    elements.targetingTargetName.textContent = `TARGET: ${targetName}`;
    requestAnimationFrame(() => {
        if (hoveredTargetCard !== card || elements.targetingReadout.hidden) return;
        const field = elements.targetingArrow.parentElement.getBoundingClientRect();
        const panel = elements.targetingReadout.getBoundingClientRect();
        const target = card.getBoundingClientRect();
        if (!field.width || !field.height || !panel.width || !target.width) return;
        const panelCenter = { x: panel.left + panel.width / 2, y: panel.top + panel.height / 2 };
        const targetCenter = { x: target.left + target.width / 2, y: target.top + target.height / 2 };
        const dx = targetCenter.x - panelCenter.x;
        const dy = targetCenter.y - panelCenter.y;
        const panelScale = Math.max(
            Math.abs(dx) / Math.max(1, panel.width / 2),
            Math.abs(dy) / Math.max(1, panel.height / 2),
            1
        );
        const targetScale = Math.max(
            Math.abs(dx) / Math.max(1, target.width / 2),
            Math.abs(dy) / Math.max(1, target.height / 2),
            1
        );
        const startX = panelCenter.x + dx / panelScale - field.left;
        const startY = panelCenter.y + dy / panelScale - field.top;
        const endX = targetCenter.x - dx / targetScale - field.left;
        const endY = targetCenter.y - dy / targetScale - field.top;
        const horizontal = Math.abs(dx) >= Math.abs(dy);
        const firstControlX = horizontal ? startX + (endX - startX) * 0.48 : startX;
        const firstControlY = horizontal ? startY : startY + (endY - startY) * 0.48;
        const secondControlX = horizontal ? startX + (endX - startX) * 0.52 : endX;
        const secondControlY = horizontal ? endY : startY + (endY - startY) * 0.52;
        elements.targetingArrow.setAttribute('viewBox', `0 0 ${field.width} ${field.height}`);
        elements.targetingArrowPath.setAttribute(
            'd',
            `M ${startX} ${startY} C ${firstControlX} ${firstControlY}, ${secondControlX} ${secondControlY}, ${endX} ${endY}`
        );
        elements.targetingArrow.classList.add('is-visible');
    });
}

function hideTargetingReadout() {
    clearTargetingArrow();
    elements.targetingReadout.hidden = true;
}

function renderTargetingReadout(skill, energyCosts, { kicker = 'SELECTED SKILL', prompt = 'Hover a glowing target' } = {}) {
    if (!skill) {
        hideTargetingReadout();
        return;
    }
    clearTargetingArrow();
    elements.targetingReadout.hidden = false;
    elements.targetingKicker.textContent = kicker;
    elements.targetingSkillImage.src = skill.image ?? '';
    elements.targetingSkillImage.alt = `${skill.name} skill`;
    elements.targetingSkillImage.hidden = !skill.image;
    elements.targetingSkillName.innerHTML = `${escapeHtml(skill.name)}${typeBadgeMarkup(skill.moveType)}`;
    elements.targetingSkillDescription.textContent = skill.description;
    elements.targetingSkillCost.innerHTML = energyCostMarkup(energyCosts ?? skill.energy);
    elements.targetingSkillCooldown.textContent = `CD ${skill.cooldown}`;
    elements.targetingSkillClasses.innerHTML = classesMarkup(skill);
    elements.targetingTargetName.textContent = prompt;
    if (selectedPaymentAction) {
        const lockedUnit = snapshot?.state.teams[selectedPaymentAction.targetPlayer]?.[selectedPaymentAction.targetSlot];
        const lockedCard = document.querySelector(
            `.unit[data-player="${selectedPaymentAction.targetPlayer}"][data-slot="${selectedPaymentAction.targetSlot}"]`
        );
        if (lockedUnit && lockedCard) {
            drawTargetingArrow(lockedCard, unitPresentation(lockedUnit).name);
        }
    }
}

function renderEnergy(container, pool) {
    container.replaceChildren();
    Object.entries(pool).forEach(([key, value]) => {
        const token = document.createElement('span');
        token.className = `energy energy-${key}`;
        token.innerHTML = `<i aria-hidden="true"></i><b>${escapeHtml(energyLabel(key))}</b><span>× ${value}</span>`;
        container.append(token);
    });
}

function displayedEnergyPool(view, player) {
    if (player !== session.player) return view.energy[player];
    const available = view.availableEnergy ?? view.energy[player] ?? {};
    const displayed = Object.fromEntries(concreteEnergyTypes.map((type) => [type, available[type] ?? 0]));
    if (!selectedPaymentAction || view.currentPlayer !== player) return displayed;
    (selectedPaymentAction.energyCosts ?? []).filter((cost) => cost !== 'random').forEach((cost) => {
        displayed[cost] = Math.max(0, (displayed[cost] ?? 0) - 1);
    });
    selectedRandomEnergy.forEach((cost) => {
        displayed[cost] = Math.max(0, (displayed[cost] ?? 0) - 1);
    });
    return displayed;
}

const concreteEnergyTypes = ['taijutsu', 'ninjutsu', 'bloodline', 'genjutsu'];

function sameAction(left, right) {
    return Boolean(
        left && right &&
        left.player === right.player &&
        left.actorSlot === right.actorSlot &&
        left.skillId === right.skillId &&
        left.targetPlayer === right.targetPlayer &&
        left.targetSlot === right.targetSlot
    );
}

function isAutomaticAreaTarget(skill) {
    return skill?.target === 'all-enemy' || skill?.target === 'all-allies';
}

function remainingEnergyAfterFixedCosts(action) {
    const available = snapshot.state.availableEnergy ?? snapshot.state.energy[session.player] ?? {};
    const remaining = Object.fromEntries(concreteEnergyTypes.map((type) => [type, available[type] ?? 0]));
    (action.energyCosts ?? []).filter((cost) => cost !== 'random').forEach((cost) => {
        remaining[cost] = Math.max(0, (remaining[cost] ?? 0) - 1);
    });
    return remaining;
}

function renderRandomEnergyPayment(action) {
    const required = action.randomEnergyRequired ?? 0;
    if (required <= 0) return;
    const remaining = remainingEnergyAfterFixedCosts(action);
    const panel = document.createElement('section');
    panel.className = 'energy-payment';
    const heading = document.createElement('div');
    heading.className = 'energy-payment-heading';
    heading.innerHTML = `<strong>Choose Random Energy</strong><span>${selectedRandomEnergy.length}/${required} selected</span>`;
    panel.append(heading);

    const choices = document.createElement('div');
    choices.className = 'energy-payment-choices';
    concreteEnergyTypes.forEach((type) => {
        const selectedCount = selectedRandomEnergy.filter((entry) => entry === type).length;
        const availableCount = remaining[type] ?? 0;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `energy-choice energy-${type}`;
        button.disabled = selectedRandomEnergy.length >= required || selectedCount >= availableCount;
        button.innerHTML = `<i aria-hidden="true"></i><b>${escapeHtml(energyLabel(type))}</b><span>${selectedCount}/${availableCount}</span>`;
        button.addEventListener('click', () => {
            selectedRandomEnergy.push(type);
            render();
        });
        choices.append(button);
    });
    panel.append(choices);

    const selected = document.createElement('div');
    selected.className = 'energy-payment-selected';
    selectedRandomEnergy.forEach((type, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `energy-token energy-${type}`;
        button.innerHTML = `<i aria-hidden="true"></i>${escapeHtml(energyLabel(type))}<span aria-hidden="true">×</span>`;
        button.setAttribute('aria-label', `Remove ${energyLabel(type)} payment`);
        button.addEventListener('click', () => {
            selectedRandomEnergy.splice(index, 1);
            renderCommands();
        });
        selected.append(button);
    });
    panel.append(selected);

    const confirm = document.createElement('button');
    confirm.type = 'button';
    confirm.className = 'confirm-energy-payment';
    confirm.disabled = selectedRandomEnergy.length !== required;
    confirm.textContent = selectedRandomEnergy.length === required
        ? 'Queue with this energy'
        : `Choose ${required - selectedRandomEnergy.length} more`;
    confirm.addEventListener('click', () => queueAction({ ...action, randomEnergy: [...selectedRandomEnergy] }));
    panel.append(confirm);
    elements.targetList.append(panel);
}

function catalogSpecies(speciesId) {
    return rosterCatalog.find((species) => species.id === speciesId) ?? null;
}

function renderSelectionSkillDetail(skill, index, alternate = false) {
    if (!skill) return;
    previewSkillId = skill.id;
    elements.selectionSkillDetailKind.textContent = alternate ? 'Alternate / replacement skill' : `Current skill ${index + 1}`;
    elements.selectionSkillDetailName.textContent = skill.name;
    elements.selectionSkillDetailDescription.textContent = skill.description || 'No description available.';
    elements.selectionSkillDetailCost.innerHTML = `<span class="selection-skill-detail-label">Energy:</span>${energyCostMarkup(skill.energy)}`;
    elements.selectionSkillDetailClasses.innerHTML = `<span class="selection-skill-detail-label">Classes:</span>${typeBadgeMarkup(skill.moveType)}${classesMarkup(skill)}`;
    elements.selectionSkillDetailCooldown.innerHTML = `<span class="selection-skill-detail-label">Cooldown:</span> ${skill.cooldown}`;
    for (const card of elements.selectionPreviewSkills.querySelectorAll('.preview-skill')) {
        card.classList.toggle('selected', card.dataset.skillId === skill.id);
        card.setAttribute('aria-pressed', String(card.dataset.skillId === skill.id));
    }
    for (const card of elements.selectionPreviewAlternates.querySelectorAll('.preview-skill')) {
        card.classList.toggle('selected', card.dataset.skillId === skill.id);
        card.setAttribute('aria-pressed', String(card.dataset.skillId === skill.id));
    }
}

function appendSelectionSkillCard(container, skill, index, alternate = false) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `preview-skill${alternate ? ' alternate' : ''}`;
    card.dataset.skillId = skill.id;
    card.innerHTML = skillIconMarkup(skill, index, 'skill-number');
    card.title = skill.name;
    card.setAttribute('aria-label', `View ${skill.name}`);
    card.addEventListener('click', () => renderSelectionSkillDetail(skill, index, alternate));
    container.append(card);
}

function renderSelectionPreview() {
    const catalogEntry = catalogSpecies(previewSpeciesId) ?? rosterCatalog[0];
    if (!catalogEntry) return;
    previewSpeciesId = catalogEntry.id;
    const species = ROSTER[catalogEntry.id];
    const renderForms = selectionRenderForms(catalogEntry.id, catalogEntry.name);
    const activeRender = renderForms.find((entry) => entry.id === previewSelectionForm)
        ?? renderForms[0]
        ?? { id: 'base', name: catalogEntry.name, url: catalogEntry.facePicture };
    const alternateRender = renderForms.find((entry) => entry.id !== activeRender.id) ?? null;
    previewSelectionForm = activeRender.id;
    const evolvedFormId = Object.keys(species?.forms ?? {}).find((formId) => formId !== 'base');
    // A mission-equipped evolution (Quilava, Feraligatr, ...) is a separate,
    // permanent account-level swap from the Base/Evolution toggle above (which
    // previews an in-battle transformation like Charmander -> Charmeleon). The
    // toggle wins when it applies; otherwise default to whatever's equipped.
    const equippedFormId = equippedFormFor(catalogEntry.id);
    const formId = activeRender.id === 'evolution' && evolvedFormId
        ? evolvedFormId
        : equippedFormId && species?.forms?.[equippedFormId] ? equippedFormId : 'base';
    const form = species?.forms?.[formId] ?? species?.forms?.base;
    const skillIds = form?.skillIds ?? species?.skills?.slice(0, 4).map((skill) => skill.id) ?? [];
    const skills = skillIds
        .map((skillId) => species?.skills?.find((skill) => skill.id === skillId))
        .filter(Boolean);
    const formSkillIds = Object.values(species?.forms ?? {}).flatMap((entry) => entry.skillIds ?? []);
    const primarySkillIds = new Set(formSkillIds.length ? formSkillIds : skillIds);
    const alternateSkills = (species?.skills ?? []).filter((skill) => !primarySkillIds.has(skill.id));
    const displayName = activeRender.id === 'evolution' ? (activeRender.name || catalogEntry.name) : (form?.name || catalogEntry.name);
    // When an equipped evolution applies, showing base Cyndaquil's big fan-art (the
    // only "featured render" this species has under the base/evolution toggle above)
    // would misrepresent who's actually on the team. Prefer that evolved form's own
    // featured render (SELECTION_FORM_RENDER_BY_ID) when one exists, then fall back
    // to its plain face picture rather than the mismatched base render.
    const equippedFormRenderUrl = activeRender.id !== 'evolution' && equippedFormId
        ? selectionFormRenderUrl(catalogEntry.id, equippedFormId)
        : '';
    const equippedFormArt = equippedFormRenderUrl || (activeRender.id !== 'evolution' && equippedFormId ? form?.facePicture : null);
    elements.selectionPreviewImage.src = equippedFormArt || activeRender.url || form?.facePicture || catalogEntry.facePicture;
    elements.selectionPreviewImage.alt = `${displayName} render`;
    elements.selectionPreviewImage.dataset.speciesId = catalogEntry.id;
    elements.selectionPreviewImage.dataset.selectionForm = activeRender.id;
    if (equippedFormRenderUrl) {
        elements.selectionPreviewImage.dataset.equippedForm = equippedFormId;
    } else {
        delete elements.selectionPreviewImage.dataset.equippedForm;
    }
    elements.selectionPreviewImage.classList.toggle('uses-featured-render', Boolean(equippedFormRenderUrl || (!equippedFormArt && activeRender.url)));
    elements.selectionPreviewShadow.src = alternateRender?.url || '';
    elements.selectionPreviewShadow.classList.toggle('visible', Boolean(alternateRender?.url));
    elements.selectionPreviewName.textContent = displayName;
    elements.selectionPreviewTypes.textContent = (form?.types ?? catalogEntry.types).join(' / ');
    elements.selectionPreviewFormControls.hidden = renderForms.length < 2;
    elements.selectionBaseForm.classList.toggle('active', activeRender.id === 'base');
    elements.selectionBaseForm.setAttribute('aria-pressed', String(activeRender.id === 'base'));
    elements.selectionEvolutionForm.classList.toggle('active', activeRender.id === 'evolution');
    elements.selectionEvolutionForm.setAttribute('aria-pressed', String(activeRender.id === 'evolution'));
    const evolutionRender = renderForms.find((entry) => entry.id === 'evolution');
    elements.selectionEvolutionForm.textContent = evolutionRender?.name || 'Evolution';
    elements.selectionPreviewCount.textContent = alternateSkills.length
        ? `${skills.length} + ${alternateSkills.length} ALT`
        : `${skills.length} SKILLS`;
    elements.selectionPreviewPassive.textContent = catalogEntry.passiveDescription || 'No passive description.';
    elements.selectionPreviewSkills.replaceChildren();
    elements.selectionPreviewAlternates.replaceChildren();
    skills.forEach((skill, index) => {
        appendSelectionSkillCard(elements.selectionPreviewSkills, skill, index, false);
    });
    alternateSkills.forEach((skill, index) => {
        appendSelectionSkillCard(elements.selectionPreviewAlternates, skill, skills.length + index, true);
    });
    elements.selectionAlternateSection.hidden = alternateSkills.length === 0;
    const selectedSkill = skills.find((skill) => skill.id === previewSkillId)
        ?? alternateSkills.find((skill) => skill.id === previewSkillId)
        ?? skills[0]
        ?? alternateSkills[0];
    const alternateSelected = alternateSkills.some((skill) => skill.id === selectedSkill?.id);
    renderSelectionSkillDetail(
        selectedSkill,
        alternateSelected ? skills.length + alternateSkills.indexOf(selectedSkill) : Math.max(0, skills.indexOf(selectedSkill)),
        alternateSelected
    );
}

function renderDraftSlots(player) {
    const container = player === 'A' ? elements.teamSelectA : elements.teamSelectB;
    container.replaceChildren();
    teamDraft[player].forEach((speciesId, slot) => {
        const species = displaySpecies(speciesId);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `team-slot${species ? '' : ' empty'}`;
        button.setAttribute('aria-label', `Player ${player} slot ${slot + 1}${species ? ` (double-click to clear ${species.name})` : ''}`);
        if (activeDraftPlayer === player && activeDraftSlot === slot) button.classList.add('active');
        button.innerHTML = `
            <span class="team-slot-number">${slot + 1}</span>
            ${species ? `<img src="${escapeHtml(species.facePicture || '')}" alt="${escapeHtml(species.name)}">` : '<span class="team-slot-placeholder" aria-hidden="true">+</span>'}
            <span class="team-slot-name">${escapeHtml(species?.name || 'Choose')}</span>
        `;
        button.addEventListener('click', () => {
            activeDraftPlayer = player;
            activeDraftSlot = slot;
            if (speciesId && previewSpeciesId !== speciesId) previewSelectionForm = 'base';
            if (speciesId) previewSpeciesId = speciesId;
            renderTeamSelectors();
        });
        button.addEventListener('dblclick', () => {
            if (!speciesId) return;
            teamDraft[player][slot] = null;
            activeDraftPlayer = player;
            activeDraftSlot = slot;
            renderTeamSelectors();
        });
        container.append(button);
    });
}

function assignDraftSpecies(speciesId) {
    // Only Player A's team is enforced server-side at match creation (the
    // creator's own account); Player B's roster is either a bot's (never
    // gated) or validated later against whoever actually joins, so it's
    // deliberately left unrestricted here.
    if (activeDraftPlayer === 'A' && isCharacterLocked(speciesId)) {
        elements.lobbyStatus.textContent = `${ROSTER[speciesId]?.name ?? speciesId} is locked. Unlock it through missions or the store first.`;
        return;
    }
    const currentId = teamDraft[activeDraftPlayer][activeDraftSlot];
    const existingSlot = teamDraft[activeDraftPlayer].indexOf(speciesId);
    if (existingSlot >= 0 && existingSlot !== activeDraftSlot) {
        teamDraft[activeDraftPlayer][existingSlot] = currentId;
    }
    teamDraft[activeDraftPlayer][activeDraftSlot] = speciesId;
    if (previewSpeciesId !== speciesId) previewSelectionForm = 'base';
    previewSpeciesId = speciesId;
    activeDraftSlot = (activeDraftSlot + 1) % 3;
    renderTeamSelectors();
}

const ROSTER_PAGE_SIZE = 15;

function renderRosterGrid() {
    const pageCount = Math.max(1, Math.ceil(rosterCatalog.length / ROSTER_PAGE_SIZE));
    rosterPage = Math.min(Math.max(0, rosterPage), pageCount - 1);
    elements.rosterPagePrev.disabled = rosterPage <= 0;
    elements.rosterPageNext.disabled = rosterPage >= pageCount - 1;
    const pageItems = rosterCatalog.slice(rosterPage * ROSTER_PAGE_SIZE, (rosterPage + 1) * ROSTER_PAGE_SIZE);
    elements.rosterGrid.replaceChildren();
    pageItems.forEach((species) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'roster-card';
        if (species.id === previewSpeciesId) button.classList.add('previewed');
        const assignments = [];
        for (const player of ['A', 'B']) {
            teamDraft[player].forEach((speciesId, slot) => {
                if (speciesId === species.id) assignments.push(`${player}${slot + 1}`);
            });
        }
        if (assignments.length) button.classList.add('drafted');
        const locked = isCharacterLocked(species.id);
        const lockCost = locked ? missionUnlockCost(species.id) : null;
        const canBuyNow = locked && lockCost !== null && unlockPoints >= lockCost;
        if (locked) button.classList.add('locked');
        const display = displaySpecies(species.id) ?? species;
        button.setAttribute('aria-label', `Inspect ${display.name} skills`);
        // The buy action is a <span role="button"> rather than a nested <button>,
        // since a real <button> can't validly contain another <button> — a browser
        // would otherwise silently hoist it out of this card and break the layout.
        button.innerHTML = `
            <img src="${escapeHtml(display.facePicture)}" alt="${escapeHtml(display.name)}">
            <span class="roster-card-name">${escapeHtml(display.name)}</span>
            <span class="roster-card-type">${escapeHtml(display.types.join(' / '))}</span>
            ${assignments.length ? `<span class="draft-mark">${assignments.join(' · ')}</span>` : ''}
            ${locked ? `<span class="roster-card-lock-badge">${lockCost !== null ? `LOCKED · ${lockCost} PTS` : 'LOCKED'}</span>` : ''}
            ${canBuyNow ? '<span class="roster-card-buy-badge" role="button" tabindex="0">Buy now</span>' : ''}
        `;
        button.addEventListener('click', (event) => {
            if (canBuyNow && event.target.closest('.roster-card-buy-badge')) {
                event.stopPropagation();
                purchaseCharacterWithPoints(species.id);
                return;
            }
            if (previewSpeciesId !== species.id) previewSelectionForm = 'base';
            if (previewSpeciesId !== species.id) previewSkillId = null;
            assignDraftSpecies(species.id);
        });
        elements.rosterGrid.append(button);
    });
}

elements.rosterPagePrev.addEventListener('click', () => {
    rosterPage -= 1;
    renderRosterGrid();
});

elements.rosterPageNext.addEventListener('click', () => {
    rosterPage += 1;
    renderRosterGrid();
});

elements.selectionBaseForm.addEventListener('click', () => {
    previewSelectionForm = 'base';
    renderSelectionPreview();
});

elements.selectionEvolutionForm.addEventListener('click', () => {
    previewSelectionForm = 'evolution';
    renderSelectionPreview();
});

function teamsComplete() {
    return teamDraft.A.every(Boolean) && teamDraft.B.every(Boolean);
}

function renderTeamSelectors() {
    renderDraftSlots('A');
    renderDraftSlots('B');
    renderRosterGrid();
    renderSelectionPreview();
    setLobbyButtonsDisabled(!teamsComplete());
}

function setLobbyButtonsDisabled(disabled) {
    elements.newMatchButton.disabled = disabled;
    elements.soloMatchButton.disabled = disabled;
    elements.rankedMatchButton.disabled = disabled || !playerSession;
    elements.quickMatchButton.disabled = disabled || !playerSession;
}

function selectedTeams() {
    return { A: [...teamDraft.A], B: [...teamDraft.B] };
}

async function loadRoster() {
    const payload = await api('/api/roster', { token: null });
    rosterCatalog = payload.characters ?? [];
    if (rosterCatalog.length < 3) throw new Error('The standalone roster is not ready for team selection.');
    elements.rosterCount.textContent = `${rosterCatalog.length} PLAYABLE POKEMON`;
    elements.selectionBadgeCount.textContent = `${rosterCatalog.length} PLAYABLE`;
    renderTeamSelectors();
}

function renderTeam(container, units, player, view) {
    container.replaceChildren();
    units.forEach((unit) => {
        const species = ROSTER[unit.effectiveSpeciesId ?? unit.speciesId];
        const presentation = unitPresentation(unit);
        const card = document.createElement('article');
        card.className = 'unit';
        card.dataset.player = player;
        card.dataset.slot = String(unit.slot);
        const actorSelectable =
            !snapshot.waitingForOpponent &&
            player === session.player &&
            player === view.currentPlayer &&
            unit.alive &&
            view.legalActions.some((action) => action.actorSlot === unit.slot);
        if (actorSelectable) card.classList.add('selectable');
        if (!unit.alive) card.classList.add('defeated');
        if (player === session.player && selectedActorSlot === unit.slot) card.classList.add('selected');
        const healthHue = Math.round(Math.max(0, Math.min(100, unit.hp)) * 1.2);
        const burnStacks = unit.statuses
            .filter((status) => status.name?.toLowerCase().includes('burn') || status.id?.includes('burn'))
            .reduce((total, status) => total + Math.max(1, Number(status.stacks) || 1), 0);
        const cooldownsParalyzed = unit.statuses.some((status) => status.paralyzeCooldowns);
        const burnStrength = Math.min(1, 0.22 + burnStacks * 0.16);
        const portraitEffects = `
            ${burnStacks > 0 ? '<span class="portrait-fire-effect" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>' : ''}
            ${cooldownsParalyzed ? '<span class="portrait-static-effect" aria-hidden="true"><i></i><i></i><i></i></span>' : ''}
        `;
        const skillPips = presentation.skillIds.map((skillId, index) => {
            const skill = species.skills.find((candidate) => candidate.id === skillId);
            const cooldown = unit.cooldowns[skillId] ?? 0;
            const availableAction = player === session.player && view.legalActions.find((action) =>
                action.actorSlot === unit.slot && action.skillId === skillId
            );
            const usable = Boolean(availableAction);
            const inspectable = player !== session.player;
            const selected = player === session.player &&
                selectedActorSlot === unit.slot && selectedSkillId === skillId;
            return `<button type="button" class="unit-skill ${cooldown ? 'cooling' : ''} ${selected ? 'selected' : ''} ${inspectable ? 'inspect-only' : ''}"
                data-skill-id="${escapeHtml(skillId)}" aria-label="${inspectable ? 'Inspect' : 'Select'} ${escapeHtml(skill?.name || skillId)}"
                ${usable || inspectable ? '' : 'disabled'}>${skillIconMarkup(skill, index, 'unit-skill-art')}${energyCostMarkup(availableAction?.energyCosts ?? skill.energy, true)}${cooldown ? `<i class="skill-cooldown">${cooldown}</i>` : ''}</button>`;
        }).join('');
        card.innerHTML = `
            <button type="button" class="unit-portrait ${burnStacks > 0 ? 'is-burning' : ''} ${cooldownsParalyzed ? 'is-paralyzed' : ''}"
                style="--burn-strength:${burnStrength};--burn-stacks:${Math.min(6, burnStacks)}"
                aria-label="${escapeHtml(presentation.name)} portrait">
                <img src="${escapeHtml(presentation.facePicture)}" alt="${escapeHtml(presentation.name)}">
                ${portraitEffects}
                <div class="hp-track"><div class="hp-fill" style="width:${unit.hp}%;--health-hue:${healthHue}"></div><span>${unit.hp}/100</span></div>
                ${protectionTrackMarkup('shield', unit.shield, unit.shieldCapacity)}
                ${protectionTrackMarkup('barrier', unit.barrier, unit.barrierCapacity)}
                ${passiveCounterMarkup(unit)}
            </button>
            <div class="unit-body">
                <div class="unit-name"><strong>${escapeHtml(presentation.name)}</strong><span>${escapeHtml(presentation.types.join(' / '))}</span></div>
                <div class="status-list">
                    ${unit.statuses.map(statusIconMarkup).join('')}
                    ${Object.entries(unit.counters).filter(([key, value]) => value > 0 && !(unit.speciesId === 'bulbasaur' && key === 'sun')).map(([key, value]) => `<span class="status">${escapeHtml(key)} ${value}</span>`).join('')}
                </div>
                <div class="unit-skills">${skillPips}</div>
                <div class="unit-stats"><span>${Object.keys(unit.cooldowns).length} COOLDOWNS</span></div>
            </div>
        `;
        const selectedSkill = selectedActor() && selectedSkillId
            ? ROSTER[selectedActor().effectiveSpeciesId ?? selectedActor().speciesId]?.skills.find(
                (skill) => skill.id === selectedSkillId
            )
            : null;
        const matchingTargets = view.legalActions.filter((action) =>
            action.actorSlot === selectedActorSlot && action.skillId === selectedSkillId
        );
        let targetAction = matchingTargets.find((action) =>
            action.targetPlayer === player && action.targetSlot === unit.slot
        );
        if (
            !targetAction &&
            ((selectedSkill?.target === 'all-enemy' && player !== session.player) ||
                (selectedSkill?.target === 'all-allies' && player === session.player))
        ) {
            targetAction = matchingTargets[0];
        }
        const portraitButton = card.querySelector('.unit-portrait');
        const effectLabel = `${burnStacks > 0 ? `. Burn ${burnStacks} stack${burnStacks === 1 ? '' : 's'}` : ''}${cooldownsParalyzed ? '. Cooldowns paralyzed' : ''}`;
        if (targetAction && unit.alive) {
            card.classList.add('targetable');
            if (sameAction(selectedPaymentAction, targetAction)) card.classList.add('payment-target');
            card.addEventListener('pointerenter', () => drawTargetingArrow(card, presentation.name));
            card.addEventListener('pointerleave', () => clearTargetingArrow());
            card.addEventListener('focusin', () => drawTargetingArrow(card, presentation.name));
            card.addEventListener('focusout', (event) => {
                if (!card.contains(event.relatedTarget)) clearTargetingArrow();
            });
            card.addEventListener('pointerdown', () => drawTargetingArrow(card, presentation.name));
            portraitButton.disabled = false;
            portraitButton.setAttribute('aria-label', `Target ${presentation.name}${effectLabel}`);
            portraitButton.addEventListener('click', (event) => {
                event.stopPropagation();
                chooseTargetAction(targetAction);
            });
            card.addEventListener('click', (event) => {
                if (event.target.closest('.unit-portrait, .unit-skill, .status-icon')) return;
                chooseTargetAction(targetAction);
            });
        } else if (actorSelectable) {
            portraitButton.disabled = false;
            portraitButton.setAttribute('aria-label', `Select ${presentation.name}${effectLabel}`);
            portraitButton.addEventListener('click', () => {
                selectedActorSlot = unit.slot;
                selectedSkillId = null;
                selectedPaymentAction = null;
                selectedRandomEnergy = [];
                elements.actionError.textContent = '';
                render();
            });
        } else {
            portraitButton.disabled = true;
        }
        card.querySelectorAll('.unit-skill:not(:disabled)').forEach((skillButton) => {
            skillButton.addEventListener('click', (event) => {
                event.stopPropagation();
                if (player !== session.player) {
                    const inspectedSkill = species.skills.find((skill) => skill.id === skillButton.dataset.skillId);
                    selectedSkillId = null;
                    selectedPaymentAction = null;
                    selectedRandomEnergy = [];
                    render();
                    renderTargetingReadout(inspectedSkill, inspectedSkill?.energy, {
                        kicker: 'OPPONENT SKILL',
                        prompt: `Viewing ${presentation.name}'s skill`,
                    });
                    return;
                }
                if (targetAction && unit.alive) {
                    chooseTargetAction(targetAction);
                    return;
                }
                selectedActorSlot = unit.slot;
                selectedSkillId = skillButton.dataset.skillId;
                selectedPaymentAction = null;
                selectedRandomEnergy = [];
                elements.actionError.textContent = '';
                const chosenSkill = species.skills.find((skill) => skill.id === selectedSkillId);
                const areaAction = view.legalActions.find((action) =>
                    action.actorSlot === unit.slot && action.skillId === selectedSkillId
                );
                if (isAutomaticAreaTarget(chosenSkill) && areaAction) {
                    chooseTargetAction(areaAction);
                    return;
                }
                render();
            });
        });
        card.querySelectorAll('.status-icon').forEach((statusButton) => {
            statusButton.addEventListener('click', (event) => {
                event.stopPropagation();
                const opening = !statusButton.classList.contains('is-open');
                document.querySelectorAll('.status-icon.is-open').forEach((entry) => {
                    entry.classList.remove('is-open');
                    entry.setAttribute('aria-expanded', 'false');
                });
                statusButton.classList.toggle('is-open', opening);
                statusButton.setAttribute('aria-expanded', String(opening));
            });
        });
        container.append(card);
    });
}

function chooseTargetAction(action) {
    if ((action.randomEnergyRequired ?? 0) === 0) {
        queueAction({ ...action, randomEnergy: [] });
        return;
    }
    selectedPaymentAction = { ...action };
    selectedRandomEnergy = [];
    elements.actionError.textContent = '';
    render();
}

function selectedActor() {
    return snapshot?.state.teams[session.player]?.[selectedActorSlot] ?? null;
}

function dismissSelectedSkill() {
    if (!selectedSkillId) return;
    selectedSkillId = null;
    selectedPaymentAction = null;
    selectedRandomEnergy = [];
    elements.actionError.textContent = '';
    clearTargetingArrow();
    render();
}

function protectsSelectedSkill(target) {
    return Boolean(target?.closest?.(
        '#targeting-readout, .unit.targetable, .target-button, .random-energy-payment, .unit-skill, .skill-button'
    ));
}

function renderCommands() {
    const view = snapshot.state;
    const actions = view.legalActions;
    hideTargetingReadout();
    elements.legalCount.textContent = `${actions.length} LEGAL TARGETS`;
    elements.skillList.replaceChildren();
    elements.targetList.replaceChildren();
    if (snapshot.waitingForOpponent) {
        elements.commandHelp.textContent = 'Waiting for Player B to open the invite link.';
        return;
    }
    if (view.winner) {
        elements.commandHelp.textContent = view.winner === 'draw' ? 'Match complete: draw.' : `Player ${view.winner} won.`;
        return;
    }
    if (view.currentPlayer !== session.player) {
        elements.commandHelp.textContent = `Waiting for Player ${view.currentPlayer}.`;
        return;
    }
    if (actions.length === 0) {
        elements.commandHelp.textContent = 'No more Pokemon can be queued. End the team turn.';
        return;
    }
    const actor = selectedActor();
    if (!actor?.alive) {
        elements.commandHelp.textContent = `Select one of your living Pokemon on Team ${session.player}.`;
        return;
    }
    const species = ROSTER[actor.effectiveSpeciesId ?? actor.speciesId];
    const presentation = unitPresentation(actor);
    elements.commandHelp.textContent = `${presentation.name} selected. Choose an available skill.`;
    species.skills.filter((skill) => presentation.skillIds.includes(skill.id)).forEach((skill, index) => {
        const matching = actions.filter((action) => action.actorSlot === actor.slot && action.skillId === skill.id);
        const cooldown = actor.cooldowns[skill.id] ?? 0;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'skill-button';
        if (selectedSkillId === skill.id) button.classList.add('selected');
        button.disabled = matching.length === 0;
        button.innerHTML = `
            ${skillIconMarkup(skill, index, 'skill-button-icon')}
            <span class="skill-button-copy"><strong>${escapeHtml(skill.name)}${typeBadgeMarkup(skill.moveType)}</strong><small>${escapeHtml(skill.description)}</small><span class="skill-meta">${energyCostMarkup(matching[0]?.energyCosts ?? skill.energy)}<span>CD ${skill.cooldown}${cooldown ? ` · ${cooldown} LEFT` : ''}</span></span></span>
        `;
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            selectedSkillId = skill.id;
            selectedPaymentAction = null;
            selectedRandomEnergy = [];
            elements.actionError.textContent = '';
            if (isAutomaticAreaTarget(skill) && matching[0]) {
                chooseTargetAction(matching[0]);
                return;
            }
            render();
        });
        elements.skillList.append(button);
    });
    if (!selectedSkillId) return;
    const selectedSkill = species.skills.find((skill) => skill.id === selectedSkillId);
    const selectedSkillAction = actions.find((action) =>
        action.actorSlot === actor.slot && action.skillId === selectedSkillId
    );
    renderTargetingReadout(selectedSkill, selectedSkillAction?.energyCosts ?? selectedSkill?.energy);
    elements.commandHelp.textContent = isAutomaticAreaTarget(selectedSkill)
        ? `${presentation.name} selected ${selectedSkill?.name}. The full team target is locked.`
        : `${presentation.name} selected ${selectedSkill?.name}. Hover a glowing target card, then click it.`;
    if (!isAutomaticAreaTarget(selectedSkill)) actions
        .filter((action) => action.actorSlot === actor.slot && action.skillId === selectedSkillId)
        .forEach((action) => {
            const target = view.teams[action.targetPlayer][action.targetSlot];
            const targetPresentation = unitPresentation(target);
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'target-button';
            if (sameAction(selectedPaymentAction, action)) button.classList.add('selected');
            button.textContent =
                selectedSkill.target === 'all-enemy'
                    ? 'Target all enemies'
                    : selectedSkill.target === 'all-allies'
                      ? 'Target all allies'
                      : selectedSkill.target === 'self'
                        ? `Use on ${presentation.name}`
                        : `Target ${action.targetPlayer} · ${targetPresentation.name}`;
            button.addEventListener('click', () => chooseTargetAction(action));
            elements.targetList.append(button);
        });
    const activePaymentAction = actions.find((action) => sameAction(action, selectedPaymentAction));
    if (activePaymentAction) renderRandomEnergyPayment(activePaymentAction);
}

function describeQueuedAction(action, view) {
    const actor = view.teams[action.player]?.[action.actorSlot];
    const target = view.teams[action.targetPlayer]?.[action.targetSlot];
    const actorName = actor ? unitPresentation(actor).name : `slot ${action.actorSlot + 1}`;
    const skill = actor
        ? ROSTER[actor.effectiveSpeciesId ?? actor.speciesId]?.skills.find((candidate) => candidate.id === action.skillId)
        : null;
    const targetName = isAutomaticAreaTarget(skill)
        ? (skill.target === 'all-enemy' ? 'All Enemies' : 'All Allies')
        : target ? unitPresentation(target).name : `slot ${action.targetSlot + 1}`;
    const payment = Array.isArray(action.randomEnergy) && action.randomEnergy.length > 0
        ? ` · ${action.randomEnergy.map(energyLabel).join(' + ')}`
        : '';
    return `${actorName} · ${skill?.name ?? action.skillId} → ${targetName}${payment}`;
}

function renderQueue() {
    const actions = snapshot.pendingTurn?.actions ?? [];
    elements.queueCount.textContent = snapshot.pendingTurn?.hidden ? 'HIDDEN' : `${actions.length} / 3`;
    elements.queueList.replaceChildren();
    if (snapshot.pendingTurn?.hidden) {
        const item = document.createElement('li');
        item.className = 'queue-placeholder';
        item.textContent = 'Opponent choices remain hidden.';
        elements.queueList.append(item);
        return;
    }
    if (actions.length === 0) {
        const item = document.createElement('li');
        item.className = 'queue-placeholder';
        item.textContent = 'Choose up to one action per Pokemon.';
        elements.queueList.append(item);
        return;
    }
    actions.forEach((action, index) => {
        const item = document.createElement('li');
        item.innerHTML = `<span>${index + 1}</span><strong>${escapeHtml(describeQueuedAction(action, snapshot.state))}</strong>`;
        elements.queueList.append(item);
    });
}

function renderEvents(events) {
    elements.eventLog.replaceChildren();
    [...events].reverse().forEach((event) => {
        const item = document.createElement('li');
        item.innerHTML = `<span>T${event.turn + 1}</span><span>${escapeHtml(event.message)}</span>`;
        elements.eventLog.append(item);
    });
}

function renderWeatherBanner(weather) {
    elements.weatherBanner.hidden = !weather;
    if (!weather) return;
    elements.weatherName.textContent = weather.name;
    const rounds = weather.roundsRemaining === 1 ? '1 turn left' : `${weather.roundsRemaining} turns left`;
    elements.weatherRounds.textContent = rounds;
    elements.weatherBanner.title = weather.description ?? '';
}

function renderTurnTimer() {
    if (!snapshot?.state || !session) {
        elements.turnTimer.hidden = true;
        return;
    }
    if (typeof snapshot.turnSecondsRemaining === 'number') {
        const minutes = Math.floor(snapshot.turnSecondsRemaining / 60);
        const seconds = String(snapshot.turnSecondsRemaining % 60).padStart(2, '0');
        elements.turnTimer.hidden = false;
        elements.turnTimer.textContent = `${snapshot.state.currentPlayer === session.player ? 'YOUR' : "OPPONENT'S"} TURN · ${minutes}:${seconds}`;
        elements.turnTimer.classList.toggle('turn-timer-low', snapshot.turnSecondsRemaining <= 10);
    } else {
        elements.turnTimer.hidden = true;
    }
}

function render() {
    if (!snapshot || !session) return;
    const view = snapshot.state;
    elements.gameRoot.hidden = false;
    elements.lobbyPanel.hidden = true;
    document.body.classList.remove('selection-mode');
    document.body.classList.add('battle-mode');
    elements.turnLabel.textContent = `Turn ${view.turnNumber + 1}`;
    elements.currentPlayer.textContent = `Player ${view.currentPlayer}`;
    elements.winnerLabel.textContent = view.winner ? (view.winner === 'draw' ? 'Draw' : `Player ${view.winner} won`) : '';
    renderTurnTimer();
    elements.seatLabel.textContent = snapshot.mode === 'solo'
        ? `Player ${session.player} · vs ${snapshot.opponent.name}`
        : `Player ${session.player}`;
    elements.connectionLabel.textContent = snapshot.waitingForOpponent
        ? 'Waiting for opponent'
        : snapshot.mode === 'solo'
          ? `Solo · revision ${snapshot.revision}`
          : `Revision ${snapshot.revision}`;
    elements.seedLabel.textContent = `MATCH ${session.matchId.slice(0, 8)}`;
    renderEnergy(elements.energyA, displayedEnergyPool(view, 'A'));
    renderEnergy(elements.energyB, displayedEnergyPool(view, 'B'));
    renderTeam(elements.teamA, view.teams.A, 'A', view);
    renderTeam(elements.teamB, view.teams.B, 'B', view);
    elements.teamANames.textContent = view.teams.A.map((unit) => unitPresentation(unit).name).join(' · ');
    elements.teamBNames.textContent = view.teams.B.map((unit) => unitPresentation(unit).name).join(' · ');
    renderQueue();
    renderCommands();
    renderEvents(view.recentEvents);
    renderWeatherBanner(view.weather);
    elements.autoButton.disabled =
        snapshot.waitingForOpponent || view.winner || view.currentPlayer !== session.player || view.legalActions.length === 0;
    const ownsTurn = !snapshot.waitingForOpponent && !view.winner && view.currentPlayer === session.player;
    elements.undoQueueButton.disabled = !ownsTurn || (snapshot.pendingTurn?.actions.length ?? 0) === 0;
    elements.resolveTurnButton.disabled = !ownsTurn;
    elements.resolveTurnTopButton.disabled = !ownsTurn;
}

async function queueAction(action) {
    try {
        elements.actionError.textContent = '';
        snapshot = await api(`/api/matches/${encodeURIComponent(session.matchId)}/queue`, {
            method: 'POST',
            body: {
                actorSlot: action.actorSlot,
                skillId: action.skillId,
                targetPlayer: action.targetPlayer,
                targetSlot: action.targetSlot,
                randomEnergy: action.randomEnergy ?? [],
            },
        });
        selectedActorSlot = null;
        selectedSkillId = null;
        selectedPaymentAction = null;
        selectedRandomEnergy = [];
        render();
    } catch (error) {
        elements.actionError.textContent = error.message;
    }
}

async function undoQueued() {
    try {
        elements.actionError.textContent = '';
        snapshot = await api(`/api/matches/${encodeURIComponent(session.matchId)}/queue`, { method: 'DELETE' });
        selectedActorSlot = null;
        selectedSkillId = null;
        selectedPaymentAction = null;
        selectedRandomEnergy = [];
        render();
    } catch (error) {
        elements.actionError.textContent = error.message;
    }
}

async function resolveTurn() {
    try {
        elements.actionError.textContent = '';
        snapshot = await api(`/api/matches/${encodeURIComponent(session.matchId)}/resolve`, { method: 'POST' });
        selectedActorSlot = null;
        selectedSkillId = null;
        selectedPaymentAction = null;
        selectedRandomEnergy = [];
        render();
    } catch (error) {
        elements.actionError.textContent = error.message;
    }
}

async function surrenderMatch() {
    if (!session || !window.confirm('Surrender this match and return to character select?')) return;
    try {
        elements.surrenderButton.disabled = true;
        await api(`/api/matches/${encodeURIComponent(session.matchId)}/surrender`, { method: 'POST' });
        sessionStorage.removeItem(tokenKey(session.matchId, session.player));
        sessionStorage.removeItem(inviteKey(session.matchId));
        window.location.assign(applicationLocation());
    } catch (error) {
        elements.actionError.textContent = error.message;
        elements.surrenderButton.disabled = false;
    }
}

async function createMatch(opponent = 'human') {
    try {
        setLobbyButtonsDisabled(true);
        elements.lobbyStatus.textContent = opponent === 'bot' ? 'Creating a solo match…' : 'Creating a private match…';
        const created = await api('/api/matches', {
            method: 'POST',
            body: { opponent, teams: selectedTeams(), playerToken: playerSession?.token },
            token: null,
        });
        saveSession({ matchId: created.matchId, player: created.player, token: created.token });
        snapshot = created;
        if (created.mode === 'solo') {
            elements.invitePanel.hidden = true;
            elements.lobbyStatus.textContent = 'Solo match ready. The Training Bot controls Player B.';
        } else {
            const inviteUrl = new URL(created.invitePath, window.location.href).href;
            sessionStorage.setItem(inviteKey(created.matchId), inviteUrl);
            elements.inviteUrl.value = inviteUrl;
            elements.invitePanel.hidden = false;
            elements.lobbyStatus.textContent = 'Private match created. Open the invite link for Player B.';
        }
        history.replaceState(null, '', applicationLocation(`?match=${encodeURIComponent(created.matchId)}`));
        render();
    } catch (error) {
        elements.lobbyStatus.textContent = error.message;
    } finally {
        setLobbyButtonsDisabled(!teamsComplete());
    }
}

async function enterQueue(mode) {
    if (!playerSession) {
        elements.lobbyStatus.textContent = 'Sign in to use Ranked or Quick Match.';
        return;
    }
    try {
        setLobbyButtonsDisabled(true);
        elements.lobbyStatus.textContent = mode === 'ladder' ? 'Searching for a Ranked opponent…' : 'Searching for a Quick Match opponent…';
        const result = await api('/api/queue', {
            method: 'POST',
            body: { mode, teams: selectedTeams().A, playerToken: playerSession.token },
            token: null,
        });
        if (result.status === 'matched') {
            saveSession({ matchId: result.matchId, player: 'B', token: result.token });
            snapshot = await api(`/api/matches/${encodeURIComponent(result.matchId)}/state`, { token: result.token });
            history.replaceState(null, '', applicationLocation(`?match=${encodeURIComponent(result.matchId)}`));
            render();
            return;
        }
        activeQueueToken = result.queueToken;
        activeQueueMode = mode;
        elements.queueSearchPanel.hidden = false;
        elements.invitePanel.hidden = true;
        elements.queueSearchStatus.textContent = mode === 'ladder' ? 'Searching for a Ranked opponent…' : 'Searching for a Quick Match opponent…';
    } catch (error) {
        elements.lobbyStatus.textContent = error.message;
        setLobbyButtonsDisabled(!teamsComplete());
    }
}

async function cancelQueue() {
    if (!activeQueueToken) return;
    const token = activeQueueToken;
    activeQueueToken = null;
    activeQueueMode = null;
    elements.queueSearchPanel.hidden = true;
    try {
        await api(`/api/queue/${encodeURIComponent(token)}`, { method: 'DELETE', token: null });
    } catch {
        // The search may have already resolved server-side; nothing to do.
    }
    elements.lobbyStatus.textContent = 'Search cancelled.';
    setLobbyButtonsDisabled(!teamsComplete());
}

// Polled from the same 800ms loop as an in-match refresh() (see below) - a
// player waiting in the matchmaking queue has no matchId/session yet, so it
// can't reuse refresh()'s match-state polling, but it should use the same
// cadence rather than run a second independent timer.
async function pollActiveQueue() {
    if (!activeQueueToken) return;
    try {
        const result = await api(`/api/queue/${encodeURIComponent(activeQueueToken)}`, { token: null });
        if (result.status === 'matched') {
            activeQueueToken = null;
            activeQueueMode = null;
            elements.queueSearchPanel.hidden = true;
            // Whoever's own enqueue() call triggers a pairing becomes seat B
            // (see enterQueue); whoever was already waiting and discovers the
            // pairing via this poll was seat A all along.
            saveSession({ matchId: result.matchId, player: 'A', token: result.token });
            snapshot = await api(`/api/matches/${encodeURIComponent(result.matchId)}/state`, { token: result.token });
            history.replaceState(null, '', applicationLocation(`?match=${encodeURIComponent(result.matchId)}`));
            render();
        }
    } catch (error) {
        activeQueueToken = null;
        activeQueueMode = null;
        elements.queueSearchPanel.hidden = true;
        elements.lobbyStatus.textContent = error.message;
        setLobbyButtonsDisabled(!teamsComplete());
    }
}

async function joinMatch(matchId, inviteCode) {
    const savedToken = sessionStorage.getItem(tokenKey(matchId, 'B'));
    const joined = savedToken
        ? await api(`/api/matches/${encodeURIComponent(matchId)}/state`, { token: savedToken })
        : await api(`/api/matches/${encodeURIComponent(matchId)}/join`, {
              method: 'POST', body: { inviteCode, playerToken: playerSession?.token }, token: null,
          });
    const token = savedToken || joined.token;
    saveSession({ matchId, player: 'B', token });
    snapshot = joined;
    history.replaceState(null, '', applicationLocation(`?match=${encodeURIComponent(matchId)}`));
    render();
}

async function resumeMatch(matchId) {
    for (const player of ['A', 'B']) {
        const token = sessionStorage.getItem(tokenKey(matchId, player));
        if (!token) continue;
        try {
            const resumed = await api(`/api/matches/${encodeURIComponent(matchId)}/state`, { token });
            saveSession({ matchId, player, token });
            snapshot = resumed;
            const savedInvite = player === 'A' ? sessionStorage.getItem(inviteKey(matchId)) : '';
            if (resumed.waitingForOpponent && savedInvite) {
                elements.inviteUrl.value = savedInvite;
                elements.invitePanel.hidden = false;
            }
            render();
            return true;
        } catch {
            sessionStorage.removeItem(tokenKey(matchId, player));
        }
    }
    return false;
}

async function refresh() {
    if (!session) {
        await pollActiveQueue();
        return;
    }
    try {
        const next = await api(`/api/matches/${encodeURIComponent(session.matchId)}/state`);
        elements.actionError.textContent = '';
        elements.connectionLabel.textContent = next.waitingForOpponent
            ? 'Waiting for opponent'
            : next.mode === 'solo'
              ? `Solo · revision ${next.revision}`
              : `Revision ${next.revision}`;
        if (snapshot) {
            snapshot.turnSecondsRemaining = next.turnSecondsRemaining;
            snapshot.turnTimeoutSeconds = next.turnTimeoutSeconds;
        }
        if (
            !snapshot ||
            next.revision !== snapshot.revision ||
            next.queueRevision !== snapshot.queueRevision ||
            next.waitingForOpponent !== snapshot.waitingForOpponent
        ) {
            snapshot = next;
            selectedActorSlot = null;
            selectedSkillId = null;
            selectedPaymentAction = null;
            selectedRandomEnergy = [];
            render();
        } else {
            // The turn clock ticks between full re-renders without disturbing
            // the player's in-progress skill/target selection.
            renderTurnTimer();
        }
    } catch (error) {
        elements.connectionLabel.textContent = 'Disconnected';
        elements.actionError.textContent = error.message;
    }
}

document.addEventListener('click', () => {
    document.querySelectorAll('.status-icon.is-open').forEach((entry) => {
        entry.classList.remove('is-open');
        entry.setAttribute('aria-expanded', 'false');
    });
});

document.addEventListener('dblclick', (event) => {
    if (protectsSelectedSkill(event.target)) return;
    dismissSelectedSkill();
});

document.addEventListener('pointerup', (event) => {
    if (event.pointerType !== 'touch' || protectsSelectedSkill(event.target)) return;
    dismissSelectedSkill();
});

window.addEventListener('resize', () => {
    if (!hoveredTargetCard?.isConnected) return;
    const targetName = hoveredTargetCard.querySelector('.unit-name strong')?.textContent ?? 'Pokemon';
    drawTargetingArrow(hoveredTargetCard, targetName);
});

elements.newMatchButton.addEventListener('click', () => createMatch('human'));
elements.soloMatchButton.addEventListener('click', () => createMatch('bot'));
elements.rankedMatchButton.addEventListener('click', () => enterQueue('ladder'));
elements.quickMatchButton.addEventListener('click', () => enterQueue('quick'));
elements.cancelQueueButton.addEventListener('click', () => cancelQueue());
elements.copyInviteButton.addEventListener('click', async () => {
    await navigator.clipboard.writeText(elements.inviteUrl.value);
    elements.copyInviteButton.textContent = 'Copied';
    setTimeout(() => { elements.copyInviteButton.textContent = 'Copy Invite'; }, 1200);
});
elements.autoButton.addEventListener('click', () => {
    const action = snapshot?.state.legalActions[0];
    if (action) queueAction({ ...action, randomEnergy: [...(action.suggestedRandomEnergy ?? [])] });
});
elements.undoQueueButton.addEventListener('click', undoQueued);
elements.resolveTurnButton.addEventListener('click', resolveTurn);
elements.resolveTurnTopButton.addEventListener('click', resolveTurn);
elements.surrenderButton.addEventListener('click', surrenderMatch);
elements.exportButton.addEventListener('click', async () => {
    try {
        const replayData = await api(`/api/matches/${encodeURIComponent(session.matchId)}/replay`);
        elements.replayJson.value = JSON.stringify(replayData, null, 2);
        elements.replayPanel.open = true;
        elements.replayJson.focus();
        elements.replayJson.select();
    } catch (error) {
        elements.actionError.textContent = error.message;
    }
});

async function start() {
    const params = new URLSearchParams(window.location.search);
    const matchId = params.get('match');
    const inviteCode = params.get('invite');
    renderAccountBar();
    await restorePlayerSession();
    try {
        await loadRoster();
        if (matchId && inviteCode) {
            await joinMatch(matchId, inviteCode);
        } else if (matchId && !(await resumeMatch(matchId))) {
            elements.lobbyStatus.textContent = 'This tab has no player token for that match. Build a new team or use its invite link.';
        }
    } catch (error) {
        elements.lobbyStatus.textContent = `Could not start: ${error.message}`;
    }
}

await start();
setInterval(refresh, 800);
