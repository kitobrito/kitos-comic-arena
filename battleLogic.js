const DEFAULT_HP = 100;
const chakraTypes = ['taijutsu', 'ninjutsu', 'bloodline', 'genjutsu'];

const createEmptyChakraCost = () => ({
    taijutsu: 0,
    ninjutsu: 0,
    bloodline: 0,
    genjutsu: 0,
});

const ensureUnitStateShape = (unit) => {
    if (!unit || typeof unit !== 'object') return { statuses: [], cooldowns: {} };
    if (!unit.state || typeof unit.state !== 'object') {
        unit.state = { statuses: [], cooldowns: {} };
    }
    if (!Array.isArray(unit.state.statuses)) {
        unit.state.statuses = [];
    }
    if (!unit.state.cooldowns || typeof unit.state.cooldowns !== 'object') {
        unit.state.cooldowns = {};
    }
    if (!unit.state._cooldownsStartedThisTurn || typeof unit.state._cooldownsStartedThisTurn !== 'object') {
        unit.state._cooldownsStartedThisTurn = {};
    }
    if (typeof unit.state._lastEvadeTurnMarker !== 'string') {
        unit.state._lastEvadeTurnMarker = '';
    }
    if (!unit.state.snapshots || typeof unit.state.snapshots !== 'object') {
        unit.state.snapshots = {};
    }
    return unit.state;
};

const buildInitialBoard = (players = []) => {
    const board = {};
    players.forEach((player) => {
        const team = Array.isArray(player.team) ? player.team : [];
        board[player.username] = team.map((rosterIndex, slot) => ({
            slot,
            rosterIndex,
            alive: true,
            hp: DEFAULT_HP,
            state: {
                statuses: [],
                cooldowns: {},
            },
        }));
    });
    return board;
};

const getSkillTargetType = (characters, rosterIndex, skillIndex) => {
    const character = Array.isArray(characters) ? characters[rosterIndex] : null;
    const skill = character?.skills?.[skillIndex];
    return skill?.target || null;
};

const buildSkillReplacementMap = (actorState) => {
    const map = {};
    const statuses = Array.isArray(actorState?.statuses) ? actorState.statuses : [];
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

const resolveEffectiveSkill = ({ characters, rosterIndex, skillIndex, actorState }) => {
    const character = Array.isArray(characters) ? characters[rosterIndex] : null;
    const baseSkill = character?.skills?.[skillIndex] || null;
    if (!baseSkill) return null;
    const replacementMap = buildSkillReplacementMap(actorState);
    let resolvedSkill = baseSkill;
    const visited = new Set();
    while (resolvedSkill?.id && replacementMap[resolvedSkill.id] && !visited.has(resolvedSkill.id)) {
        visited.add(resolvedSkill.id);
        const replacementId = replacementMap[resolvedSkill.id];
        const replacementSkill =
            (Array.isArray(character?.skills) ? character.skills : []).find((skill) => skill?.id === replacementId) ||
            null;
        if (!replacementSkill) {
            break;
        }
        resolvedSkill = replacementSkill;
    }
    return resolvedSkill || baseSkill;
};

const getStatusMetadataTotals = (actorState) => {
    const totals = {
        damageReductionFlat: 0,
        damageReductionPercent: 0,
        unpierceableDamageReductionFlat: 0,
        physicalDamageReductionFlat: 0,
        damageTakenMultiplier: 1,
        healReceivedMultiplier: 1,
        minimumHp: 0,
        randomCostReduction: 0,
        randomCostIncrease: 0,
        taijutsuCostReduction: 0,
        ninjutsuCostReduction: 0,
        bloodlineCostReduction: 0,
        genjutsuCostReduction: 0,
        taijutsuCostIncrease: 0,
        ninjutsuCostIncrease: 0,
        bloodlineCostIncrease: 0,
        genjutsuCostIncrease: 0,
        cannotUseSkills: false,
        damageBonusFlat: 0,
        nonAfflictionDamageBonusFlat: 0,
        damageDebuffFlat: 0,
        nonAfflictionDamageDebuffFlat: 0,
        invulnerable: false,
    };
    const statuses = Array.isArray(actorState?.statuses) ? actorState.statuses : [];
    statuses.forEach((status) => {
        const metadata = status?.metadata || {};
        totals.damageReductionFlat += Number(metadata.damageReductionFlat) || 0;
        totals.unpierceableDamageReductionFlat += Number(metadata.unpierceableDamageReductionFlat) || 0;
        totals.damageReductionPercent += Math.max(0, Number(metadata.damageReductionPercent) || 0);
        totals.physicalDamageReductionFlat += Number(metadata.physicalDamageReductionFlat) || 0;
        if (Number.isFinite(metadata.damageTakenMultiplier)) {
            totals.damageTakenMultiplier *= Math.max(0, Number(metadata.damageTakenMultiplier) || 1);
        }
        if (Number.isFinite(metadata.healReceivedMultiplier)) {
            totals.healReceivedMultiplier *= Math.max(0, Number(metadata.healReceivedMultiplier) || 1);
        }
        totals.minimumHp = Math.max(totals.minimumHp, Math.max(0, Number(metadata.minimumHp) || 0));
        totals.randomCostReduction += Number(metadata.randomCostReduction) || 0;
        totals.randomCostIncrease += Number(metadata.randomCostIncrease) || 0;
        totals.taijutsuCostReduction += Number(metadata.taijutsuCostReduction) || 0;
        totals.ninjutsuCostReduction += Number(metadata.ninjutsuCostReduction) || 0;
        totals.bloodlineCostReduction += Number(metadata.bloodlineCostReduction) || 0;
        totals.genjutsuCostReduction += Number(metadata.genjutsuCostReduction) || 0;
        totals.taijutsuCostIncrease += Number(metadata.taijutsuCostIncrease) || 0;
        totals.ninjutsuCostIncrease += Number(metadata.ninjutsuCostIncrease) || 0;
        totals.bloodlineCostIncrease += Number(metadata.bloodlineCostIncrease) || 0;
        totals.genjutsuCostIncrease += Number(metadata.genjutsuCostIncrease) || 0;
        totals.damageBonusFlat += Number(metadata.damageBonusFlat) || 0;
        totals.nonAfflictionDamageBonusFlat += Number(metadata.nonAfflictionDamageBonusFlat) || 0;
        totals.damageDebuffFlat += Math.max(0, Number(metadata.DamageDebuff) || 0);
        totals.nonAfflictionDamageDebuffFlat += Math.max(
            0,
            Number(metadata.NonAfflictionDamageDebuff) || 0
        );
        if (metadata.cannotUseSkills) {
            totals.cannotUseSkills = true;
        }
        if (metadata.invulnerable) {
            totals.invulnerable = true;
        }
    });
    return totals;
};

const getSkillCooldownRemaining = (actorState, skillId) => {
    if (!actorState || !skillId) return 0;
    const cooldowns =
        actorState.cooldowns && typeof actorState.cooldowns === 'object' ? actorState.cooldowns : {};
    return Math.max(0, Number(cooldowns[skillId]) || 0);
};

const getCharacterCooldownSkillIds = ({ characters, unit }) => {
    const rosterIndex = Number.isInteger(unit?.rosterIndex) ? Number(unit.rosterIndex) : null;
    const character = Number.isInteger(rosterIndex) && Array.isArray(characters) ? characters[rosterIndex] : null;
    if (!character) return [];
    const activeIndices = getCharacterActiveSkillIndices(character);
    return activeIndices
        .map((index) => character?.skills?.[index]?.id)
        .filter((skillId) => typeof skillId === 'string' && skillId);
};

const isActorUnableToUseSkills = (actorState) => getStatusMetadataTotals(actorState).cannotUseSkills;

const isUnitInvulnerable = (unit) => {
    if (!unit) return false;
    const state = ensureUnitStateShape(unit);
    return getStatusMetadataTotals(state).invulnerable;
};

const skillHasAfflictionClass = (skillClasses = []) =>
    Array.isArray(skillClasses) &&
    skillClasses.some(
        (entry) => typeof entry === 'string' && entry.trim().toLowerCase() === 'affliction'
    );

const isUnitInvulnerableForSkill = (unit, skillClasses = []) => {
    if (!unit) return false;
    const state = ensureUnitStateShape(unit);
    const statuses = Array.isArray(state?.statuses) ? state.statuses : [];
    const afflictionSkill = skillHasAfflictionClass(skillClasses);
    const cannotBecomeInvulnerableActive = statuses.some((status) => {
        const remaining = Number(status?.remainingTurns) || 0;
        if (remaining <= 0) return false;
        return Boolean(status?.metadata?.cannotBecomeInvulnerable);
    });
    if (cannotBecomeInvulnerableActive) {
        return false;
    }
    for (const status of statuses) {
        const remaining = Number(status?.remainingTurns) || 0;
        if (remaining <= 0) continue;
        const metadata = status?.metadata || {};
        if (metadata.invulnerable) return true;
        if (metadata.invulnerableToNonAffliction && !afflictionSkill) return true;
        if (
            Array.isArray(metadata.invulnerableToSkillClasses) &&
            metadata.invulnerableToSkillClasses.some((entry) => hasSkillClass(skillClasses, entry))
        ) {
            return true;
        }
    }
    return false;
};

const canActorIgnoreEnemyInvulnerability = (actorUnit) => {
    if (!actorUnit) return false;
    const actorState = ensureUnitStateShape(actorUnit);
    return hasStatusMetadataFlag(actorState, 'ignoreEnemyInvulnerability');
};

const canActorIgnoreTargetInvulnerabilityBySourceMark = ({ actorCharacterId, targetUnit }) => {
    if (!actorCharacterId || !targetUnit) return false;
    const state = ensureUnitStateShape(targetUnit);
    const statuses = Array.isArray(state?.statuses) ? state.statuses : [];
    return statuses.some((status) => {
        const remaining = Number(status?.remainingTurns) || 0;
        if (remaining <= 0) return false;
        return status?.metadata?.ignoreInvulnerabilityFromSourceCharacterId === actorCharacterId;
    });
};

const canActorTargetUnit = ({ actorState, targetUsername, targetSlot }) => {
    const statuses = Array.isArray(actorState?.statuses) ? actorState.statuses : [];
    for (const status of statuses) {
        const remaining = Number(status?.remainingTurns) || 0;
        if (remaining <= 0) continue;
        const blockedUsername = status?.metadata?.cannotTargetAlliesOfUsername;
        if (!blockedUsername || blockedUsername !== targetUsername) continue;
        const allowedSlot = Number.isInteger(status?.metadata?.allowedTargetSlot)
            ? Number(status.metadata.allowedTargetSlot)
            : null;
        if (allowedSlot !== null && allowedSlot === targetSlot) {
            continue;
        }
        return false;
    }
    return true;
};

const isUnitInvulnerableToHelpfulSkills = (unit) => {
    if (!unit) return false;
    const state = ensureUnitStateShape(unit);
    const statuses = Array.isArray(state?.statuses) ? state.statuses : [];
    return statuses.some((status) => {
        const remaining = Number(status?.remainingTurns) || 0;
        if (remaining <= 0) return false;
        return Boolean(status?.metadata?.invulnerableToHelpfulSkills);
    });
};

const doesEffectTargetHelpfulRecipient = ({ effect, recipient, actingUsername }) => {
    if (!effect || !recipient || !actingUsername) return false;
    if (recipient.username !== actingUsername) return false;
    const scope = typeof effect?.scope === 'string' ? effect.scope.trim().toLowerCase() : '';
    return scope === 'self' || scope === 'target' || scope === 'all-allies';
};

const filterHelpfulImmuneRecipients = ({ effect, recipients, actingUsername }) =>
    (Array.isArray(recipients) ? recipients : []).filter((recipient) => {
        if (!recipient?.unit || recipient.unit.alive === false) return false;
        if (!doesEffectTargetHelpfulRecipient({ effect, recipient, actingUsername })) return true;
        return !isUnitInvulnerableToHelpfulSkills(recipient.unit);
    });

const doesUnitSatisfySkillTargetCondition = (unit, skill) => {
    const condition = skill?.targetCondition;
    const state = ensureUnitStateShape(unit);
    if (condition?.statusId && !hasStatus(state, condition.statusId)) return false;
    if (
        Array.isArray(condition?.statusIdsAny) &&
        condition.statusIdsAny.length > 0 &&
        !condition.statusIdsAny.some((statusId) => hasStatus(state, statusId))
    ) {
        return false;
    }
    if (condition?.missingStatusId && hasStatus(state, condition.missingStatusId)) return false;
    return true;
};

const doesActorSatisfySkillCondition = (actorUnit, actorState, skill) => {
    const condition = skill?.actorCondition;
    if (!condition || typeof condition !== 'object') return true;
    if (condition?.statusId && !hasStatus(actorState, condition.statusId)) return false;
    if (
        Array.isArray(condition?.statusIdsAny) &&
        condition.statusIdsAny.length > 0 &&
        !condition.statusIdsAny.some((statusId) => hasStatus(actorState, statusId))
    ) {
        return false;
    }
    if (condition?.missingStatusId && hasStatus(actorState, condition.missingStatusId)) return false;
    const currentHp = Math.max(0, Number(actorUnit?.hp) || 0);
    const hpAtMost = Number(condition?.sourceCurrentHpAtMost);
    if (Number.isFinite(hpAtMost) && currentHp > hpAtMost) return false;
    const hpAtLeast = Number(condition?.sourceCurrentHpAtLeast);
    if (Number.isFinite(hpAtLeast) && currentHp < hpAtLeast) return false;
    return true;
};

const computeTargetOptions = ({ match, actingUsername, actorSlot, skillIndex, characters }) => {
    const result = {
        targetType: null,
        mode: 'single',
        targets: [],
    };
    if (!match || !actingUsername) return result;

    const actorBoard = match.board?.[actingUsername] || [];
    const actorUnit = actorBoard[actorSlot];
    if (!actorUnit || actorUnit.alive === false) return result;
    const actorState = ensureUnitStateShape(actorUnit);
    const actorCharacter =
        Number.isInteger(actorUnit?.rosterIndex) && Array.isArray(characters)
            ? characters[actorUnit.rosterIndex]
            : null;
    const actorCharacterId =
        (typeof actorCharacter?.id === 'string' && actorCharacter.id) ||
        (typeof actorCharacter?.characterId === 'string' && actorCharacter.characterId) ||
        null;
    const effectiveSkill = resolveEffectiveSkill({
        characters,
        rosterIndex: actorUnit.rosterIndex,
        skillIndex,
        actorState,
    });
    if (!doesActorSatisfySkillCondition(actorUnit, actorState, effectiveSkill)) {
        return result;
    }
    const bypassEnemyInvulnerability =
        canActorIgnoreEnemyInvulnerability(actorUnit) || Boolean(effectiveSkill?.ignoreInvulnerability);
    const targetType = effectiveSkill?.target || null;
    result.targetType = targetType;

    const opponentEntry = (match.players || []).find((p) => p.username !== actingUsername);
    const opponentUsername = opponentEntry?.username;
    const opponentBoard = opponentUsername ? match.board?.[opponentUsername] || [] : [];

    const aliveFilter = (unit) => unit && unit.alive !== false;
    const mapTargets = (
        username,
        units,
        { enemyTargeting = false, helpfulTargeting = false, skillClasses = [] } = {}
    ) =>
        units
            .map((unit, slot) => ({ unit, slot }))
            .filter(({ unit, slot }) => {
                if (!aliveFilter(unit)) return false;
                if (
                    enemyTargeting &&
                    isUnitInvulnerableForSkill(unit, skillClasses) &&
                    !bypassEnemyInvulnerability &&
                    !canActorIgnoreTargetInvulnerabilityBySourceMark({
                        actorCharacterId,
                        targetUnit: unit,
                    })
                ) {
                    return false;
                }
                if (helpfulTargeting && isUnitInvulnerableToHelpfulSkills(unit)) {
                    return false;
                }
                if (!canActorTargetUnit({ actorState, targetUsername: username, targetSlot: slot })) return false;
                if (!doesUnitSatisfySkillTargetCondition(unit, effectiveSkill)) return false;
                return true;
            })
            .map(({ unit, slot }) => ({
                username,
                slot,
                rosterIndex: unit.rosterIndex,
                alive: true,
            }));

    switch (targetType) {
        case 'single-enemy': {
            result.mode = 'single';
            result.targets = mapTargets(opponentUsername, opponentBoard, {
                enemyTargeting: true,
                skillClasses: effectiveSkill?.classes || [],
            });
            break;
        }
        case 'all-enemy': {
            result.mode = 'all';
            result.targets = mapTargets(opponentUsername, opponentBoard, {
                enemyTargeting: true,
                skillClasses: effectiveSkill?.classes || [],
            });
            break;
        }
        case 'self': {
            result.mode = 'self';
            result.targets = mapTargets(actingUsername, actorBoard, { helpfulTargeting: true }).filter(
                (t) => t.slot === actorSlot
            );
            break;
        }
        case 'single-ally': {
            result.mode = 'single';
            result.targets = mapTargets(actingUsername, actorBoard, { helpfulTargeting: true }).filter(
                (t) => t.slot !== actorSlot
            );
            break;
        }
        case 'self-or-single-ally': {
            result.mode = 'single';
            result.targets = mapTargets(actingUsername, actorBoard, { helpfulTargeting: true });
            break;
        }
        case 'all-allies': {
            result.mode = 'all';
            result.targets = mapTargets(actingUsername, actorBoard, { helpfulTargeting: true });
            break;
        }
        default: {
            result.mode = 'unknown';
            result.targets = [];
            break;
        }
    }

    return result;
};

const validateTargetSelection = ({ mode, targets }, selection) => {
    if (!selection) return false;
    const selectionArr = Array.isArray(selection) ? selection : [selection];
    const availableKeys = new Set((targets || []).map((t) => `${t.username}:${t.slot}`));

    if (mode === 'single' || mode === 'self') {
        if (selectionArr.length !== 1) return false;
        const key = `${selectionArr[0].username}:${selectionArr[0].slot}`;
        return availableKeys.has(key);
    }

    return selectionArr.every((sel) => availableKeys.has(`${sel.username}:${sel.slot}`));
};

const getUnitState = (match, username, slot) => {
    const unit = match?.board?.[username]?.[slot];
    if (!unit) return null;
    return ensureUnitStateShape(unit);
};

const normalizeEnergyCost = (energy = []) => {
    const reservedSpecific = createEmptyChakraCost();
    let requiredRandom = 0;
    (Array.isArray(energy) ? energy : []).forEach((entry) => {
        const normalized = typeof entry === 'string' ? entry.trim().toLowerCase() : '';
        if (normalized === 'random') {
            requiredRandom += 1;
            return;
        }
        if (Object.prototype.hasOwnProperty.call(reservedSpecific, normalized)) {
            reservedSpecific[normalized] += 1;
        }
    });
    return { reservedSpecific, requiredRandom };
};

const computeEffectiveEnergyCost = ({ skill, actorState }) => {
    const base = normalizeEnergyCost(skill?.energy || []);
    const totals = getStatusMetadataTotals(actorState || { statuses: [] });
    const reservedSpecific = { ...base.reservedSpecific };
    chakraTypes.forEach((type) => {
        const reductionKey = `${type}CostReduction`;
        const increaseKey = `${type}CostIncrease`;
        const reduction = Math.max(0, Number(totals[reductionKey]) || 0);
        const increase = Math.max(0, Number(totals[increaseKey]) || 0);
        reservedSpecific[type] = Math.max(0, (reservedSpecific[type] || 0) - reduction + increase);
    });
    const randomReduction = Math.max(0, totals.randomCostReduction);
    let randomIncrease = Math.max(0, totals.randomCostIncrease);
    const skillIsMental =
        Array.isArray(skill?.classes) &&
        skill.classes.some(
            (entry) => typeof entry === 'string' && entry.trim().toLowerCase() === 'mental'
        );
    if (!skillIsMental) {
        const statuses = Array.isArray(actorState?.statuses) ? actorState.statuses : [];
        const nonMentalIncrease = statuses.reduce((sum, status) => {
            const remaining = Number(status?.remainingTurns) || 0;
            if (remaining <= 0) return sum;
            return sum + Math.max(0, Number(status?.metadata?.nonMentalRandomCostIncrease) || 0);
        }, 0);
        randomIncrease += nonMentalIncrease;
    }
    return {
        reservedSpecific,
        requiredRandom: Math.max(0, base.requiredRandom + randomIncrease - randomReduction),
    };
};

const hasStatus = (actorState, statusId) =>
    Array.isArray(actorState?.statuses) &&
    actorState.statuses.some((status) => status?.id === statusId && (status.remainingTurns || 0) > 0);

const hasStatusMetadataFlag = (actorState, flagName) =>
    Array.isArray(actorState?.statuses) &&
    actorState.statuses.some((status) => {
        const remaining = Number(status?.remainingTurns) || 0;
        return remaining > 0 && Boolean(status?.metadata?.[flagName]);
    });

const pickRandomEntry = (entries = []) => {
    if (!Array.isArray(entries) || !entries.length) return null;
    return entries[Math.floor(Math.random() * entries.length)] || null;
};

const renderTooltipTemplate = (template, metadata = {}) => {
    if (typeof template !== 'string' || !template) return template;
    return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => {
        const value = metadata?.[key];
        if (value === undefined || value === null) return '';
        return String(value);
    });
};

const consumeStatus = (actorState, statusId) => {
    if (!Array.isArray(actorState?.statuses)) return;
    const index = actorState.statuses.findIndex((status) => status?.id === statusId);
    if (index >= 0) {
        actorState.statuses.splice(index, 1);
    }
};

const getCastStartNextUsedSkillCooldownAdjustment = (castStartStatuses = []) => {
    if (!Array.isArray(castStartStatuses) || !castStartStatuses.length) {
        return { amount: 0, statusIdsToConsume: [] };
    }
    return castStartStatuses.reduce(
        (result, status) => {
            const remaining = Number(status?.remainingTurns) || 0;
            if (remaining <= 0) return result;
            const metadata = status?.metadata || {};
            const adjustment = Number(metadata?.nextUsedSkillCooldownAdjustment) || 0;
            if (!adjustment) return result;
            result.amount += adjustment;
            if (metadata?.consumeOnNextSkillUse !== false && typeof status?.id === 'string' && status.id) {
                result.statusIdsToConsume.push(status.id);
            }
            return result;
        },
        { amount: 0, statusIdsToConsume: [] }
    );
};

const doesEffectConditionMatch = ({ condition, actorState, targetState, actorUnit, targetUnit }) => {
    if (!condition || typeof condition !== 'object') return true;
    const scope = condition.scope === 'target' ? 'target' : 'self';
    const scopedState = scope === 'target' ? targetState : actorState;
    if (!scopedState) return false;
    if (condition.statusId && !hasStatus(scopedState, condition.statusId)) return false;
    if (condition.missingStatusId && hasStatus(scopedState, condition.missingStatusId)) return false;
    if (condition.statusMetadataAtLeast && typeof condition.statusMetadataAtLeast === 'object') {
        const statusId = condition.statusMetadataAtLeast.statusId;
        const metadataKey = condition.statusMetadataAtLeast.metadataKey;
        const minValue = Number(condition.statusMetadataAtLeast.value) || 0;
        if (!statusId || !metadataKey) return false;
        const status = Array.isArray(scopedState.statuses)
            ? scopedState.statuses.find(
                  (entry) => entry?.id === statusId && (Number(entry?.remainingTurns) || 0) > 0
              )
            : null;
        const metadataValue = Math.max(0, Number(status?.metadata?.[metadataKey]) || 0);
        if (metadataValue < minValue) return false;
    }
    const scopedUnit = scope === 'target' ? targetUnit : actorUnit;
    const sourceCurrentHpAtMost = Number(condition?.sourceCurrentHpAtMost);
    if (Number.isFinite(sourceCurrentHpAtMost)) {
        const currentHp = Math.max(0, Number(scopedUnit?.hp) || 0);
        if (currentHp > sourceCurrentHpAtMost) return false;
    }
    const sourceCurrentHpAtLeast = Number(condition?.sourceCurrentHpAtLeast);
    if (Number.isFinite(sourceCurrentHpAtLeast)) {
        const currentHp = Math.max(0, Number(scopedUnit?.hp) || 0);
        if (currentHp < sourceCurrentHpAtLeast) return false;
    }
    return true;
};

const applyStatus = ({
    targetState,
    statusId,
    duration,
    sourceSkillId,
    sourceUsername = null,
    sourceSlot = null,
    metadata,
    fresh = false,
}) => {
    if (!targetState || !statusId) return;
    const normalizedDuration = Math.max(0, Number(duration) || 0);
    const existing = targetState.statuses.find((status) => status?.id === statusId);
    if (existing) {
        existing.remainingTurns = Math.max(existing.remainingTurns || 0, normalizedDuration);
        existing.sourceSkillId = sourceSkillId || existing.sourceSkillId;
        existing.sourceUsername = sourceUsername || existing.sourceUsername || null;
        existing.sourceSlot = Number.isInteger(sourceSlot) ? sourceSlot : existing.sourceSlot ?? null;
        const nextMetadata = { ...(existing.metadata || {}), ...(metadata || {}) };
        const mergeNumericAddKeys = Array.isArray(metadata?.mergeNumericAddKeys)
            ? metadata.mergeNumericAddKeys.filter((key) => typeof key === 'string' && key)
            : [];
        mergeNumericAddKeys.forEach((key) => {
            const previousValue = Number(existing?.metadata?.[key]) || 0;
            const incomingValue = Number(metadata?.[key]) || 0;
            nextMetadata[key] = previousValue + incomingValue;
        });
        if (typeof metadata?.stackMetadataKey === 'string' && metadata.stackMetadataKey) {
            const stackKey = metadata.stackMetadataKey;
            const delta = Number(metadata?.stackDelta) || 0;
            const cap = Math.max(1, Number(metadata?.stackMax) || 1);
            const previous = Math.max(0, Number(existing?.metadata?.[stackKey]) || 0);
            nextMetadata[stackKey] = Math.min(cap, Math.max(0, previous + delta));
        }
        if (typeof metadata?.tooltipTextTemplate === 'string' && metadata.tooltipTextTemplate) {
            nextMetadata.tooltipText = renderTooltipTemplate(metadata.tooltipTextTemplate, nextMetadata);
        }
        const prevBonuses =
            existing?.metadata?.skillDamageBonuses &&
            typeof existing.metadata.skillDamageBonuses === 'object'
                ? existing.metadata.skillDamageBonuses
                : null;
        const incomingBonuses =
            metadata?.skillDamageBonuses && typeof metadata.skillDamageBonuses === 'object'
                ? metadata.skillDamageBonuses
                : null;
        if (prevBonuses || incomingBonuses) {
            const mergedBonuses = { ...(prevBonuses || {}) };
            Object.entries(incomingBonuses || {}).forEach(([skillId, value]) => {
                mergedBonuses[skillId] = (Number(mergedBonuses[skillId]) || 0) + (Number(value) || 0);
            });
            nextMetadata.skillDamageBonuses = mergedBonuses;
        }
        const mergeObjectNumericAddKeys = Array.isArray(metadata?.mergeObjectNumericAddKeys)
            ? metadata.mergeObjectNumericAddKeys.filter((key) => typeof key === 'string' && key)
            : [];
        mergeObjectNumericAddKeys.forEach((key) => {
            const previousObject =
                existing?.metadata?.[key] && typeof existing.metadata[key] === 'object' ? existing.metadata[key] : {};
            const incomingObject = metadata?.[key] && typeof metadata[key] === 'object' ? metadata[key] : {};
            const mergedObject = { ...previousObject };
            Object.entries(incomingObject).forEach(([entryKey, value]) => {
                mergedObject[entryKey] = (Number(mergedObject[entryKey]) || 0) + (Number(value) || 0);
            });
            nextMetadata[key] = mergedObject;
        });
        existing.metadata = nextMetadata;
        existing.fresh = Boolean(fresh);
        const applyStatusAtStack = nextMetadata?.applyStatusAtStack;
        if (applyStatusAtStack && typeof applyStatusAtStack === 'object') {
            const stackKey =
                typeof applyStatusAtStack.metadataKey === 'string' && applyStatusAtStack.metadataKey
                    ? applyStatusAtStack.metadataKey
                    : '';
            const stackValue = Math.max(0, Number(nextMetadata?.[stackKey]) || 0);
            const threshold = Math.max(1, Number(applyStatusAtStack.value) || 1);
            if (stackKey && stackValue >= threshold && applyStatusAtStack.statusId) {
                applyStatus({
                    targetState,
                    statusId: applyStatusAtStack.statusId,
                    duration: applyStatusAtStack.duration,
                    sourceSkillId: sourceSkillId || null,
                    sourceUsername: sourceUsername || null,
                    sourceSlot: Number.isInteger(sourceSlot) ? sourceSlot : null,
                    metadata: applyStatusAtStack.metadata || {},
                    fresh: false,
                });
            }
        }
        return;
    }
    let createdMetadata =
        typeof metadata?.stackMetadataKey === 'string' &&
        metadata.stackMetadataKey &&
        typeof metadata?.tooltipTextTemplate === 'string' &&
        metadata.tooltipTextTemplate
            ? {
                  ...(metadata || {}),
              }
            : metadata || {};
    if (typeof metadata?.stackMetadataKey === 'string' && metadata.stackMetadataKey) {
        const stackKey = metadata.stackMetadataKey;
        const cap = Math.max(1, Number(metadata?.stackMax) || 1);
        const initialFromMetadata = Number(metadata?.[stackKey]);
        const initialFromDelta = Number(metadata?.stackDelta);
        const fallbackInitial = Number.isFinite(initialFromDelta) ? initialFromDelta : 1;
        const normalizedInitial = Number.isFinite(initialFromMetadata) ? initialFromMetadata : fallbackInitial;
        createdMetadata = {
            ...(createdMetadata || {}),
            [stackKey]: Math.min(cap, Math.max(0, normalizedInitial)),
        };
    }
    if (typeof metadata?.tooltipTextTemplate === 'string' && metadata.tooltipTextTemplate) {
        createdMetadata.tooltipText = renderTooltipTemplate(metadata.tooltipTextTemplate, createdMetadata);
    }
    const createdStatus = {
        id: statusId,
        remainingTurns: normalizedDuration,
        sourceSkillId: sourceSkillId || null,
        sourceUsername: sourceUsername || null,
        sourceSlot: Number.isInteger(sourceSlot) ? sourceSlot : null,
        metadata: createdMetadata,
        fresh: Boolean(fresh),
    };
    targetState.statuses.push(createdStatus);
    const applyStatusAtStack = createdStatus?.metadata?.applyStatusAtStack;
    if (applyStatusAtStack && typeof applyStatusAtStack === 'object') {
        const stackKey =
            typeof applyStatusAtStack.metadataKey === 'string' && applyStatusAtStack.metadataKey
                ? applyStatusAtStack.metadataKey
                : '';
        const stackValue = Math.max(0, Number(createdStatus?.metadata?.[stackKey]) || 0);
        const threshold = Math.max(1, Number(applyStatusAtStack.value) || 1);
        if (stackKey && stackValue >= threshold && applyStatusAtStack.statusId) {
            applyStatus({
                targetState,
                statusId: applyStatusAtStack.statusId,
                duration: applyStatusAtStack.duration,
                sourceSkillId: sourceSkillId || null,
                sourceUsername: sourceUsername || null,
                sourceSlot: Number.isInteger(sourceSlot) ? sourceSlot : null,
                metadata: applyStatusAtStack.metadata || {},
                fresh: false,
            });
        }
    }
};

const refreshStatusOnTeam = ({ match, username, statusId, duration }) => {
    if (!match || !username || !statusId) return;
    const units = Array.isArray(match.board?.[username]) ? match.board[username] : [];
    const normalizedDuration = Math.max(0, Number(duration) || 0);
    units.forEach((unit) => {
        if (!unit || unit.alive === false) return;
        const state = ensureUnitStateShape(unit);
        const statuses = Array.isArray(state.statuses) ? state.statuses : [];
        statuses.forEach((status) => {
            if (status?.id !== statusId) return;
            if ((Number(status?.remainingTurns) || 0) <= 0) return;
            status.remainingTurns = normalizedDuration;
        });
    });
};

const normalizeTargetSelection = (selection) => {
    const arr = Array.isArray(selection) ? selection : selection ? [selection] : [];
    return arr
        .map((target) => ({
            username: target?.username,
            slot: Number.parseInt(target?.slot, 10),
        }))
        .filter((target) => target.username && Number.isInteger(target.slot) && target.slot >= 0);
};

const setUnitHpFromSnapshot = (unit, snapshotKey) => {
    if (!unit || !snapshotKey) return false;
    const state = ensureUnitStateShape(unit);
    const snapshots = state?.snapshots && typeof state.snapshots === 'object' ? state.snapshots : {};
    const snapshotValue = Number(snapshots[snapshotKey]);
    if (!Number.isFinite(snapshotValue)) return false;
    unit.hp = Math.max(0, snapshotValue);
    unit.alive = unit.hp > 0;
    return true;
};

const resolveEffectDamageAmount = ({ effect, actorState, actorUnit, targetState, skillClasses = [] }) => {
    let amount = Number(effect?.amount) || 0;
    const effectiveSkillClasses = Array.isArray(skillClasses) ? [...skillClasses] : [];
    if (Boolean(effect?.metadata?.afflictionDamage) && !hasSkillClass(effectiveSkillClasses, 'affliction')) {
        effectiveSkillClasses.push('affliction');
    }
    const afflictionDamage =
        hasSkillClass(effectiveSkillClasses, 'affliction') || Boolean(effect?.metadata?.afflictionDamage);
    const sourceTotals = getStatusMetadataTotals(actorState);
    const classScopedSourceTotals = getSourceClassScopedDamageModifiers(actorState, effectiveSkillClasses);
    amount += (Number(sourceTotals.damageBonusFlat) || 0) - (Number(sourceTotals.damageDebuffFlat) || 0);
    amount +=
        (Number(classScopedSourceTotals.damageBonusFlat) || 0) -
        (Number(classScopedSourceTotals.damageDebuffFlat) || 0);
    if (!afflictionDamage && !Boolean(effect?.metadata?.ignoreSourceNonAfflictionDamageBonus)) {
        amount +=
            (Number(sourceTotals.nonAfflictionDamageBonusFlat) || 0) -
            (Number(sourceTotals.nonAfflictionDamageDebuffFlat) || 0);
        amount +=
            (Number(classScopedSourceTotals.nonAfflictionDamageBonusFlat) || 0) -
            (Number(classScopedSourceTotals.nonAfflictionDamageDebuffFlat) || 0);
    }
    const applyStackBonus = (currentAmount) => {
        let nextAmount = currentAmount;
        const stackBonus = effect?.metadata?.bonusPerStatusMetadata;
        if (!stackBonus || typeof stackBonus !== 'object') return nextAmount;
        const statusId = stackBonus.statusId;
        const metadataKey = stackBonus.metadataKey;
        const multiplier = Number(stackBonus.multiplier) || 0;
        if (!statusId || !metadataKey || multiplier === 0) return nextAmount;
        const targetStatus = Array.isArray(targetState?.statuses)
            ? targetState.statuses.find(
                  (status) => status?.id === statusId && (Number(status?.remainingTurns) || 0) > 0
              )
            : null;
        const value = Math.max(0, Number(targetStatus?.metadata?.[metadataKey]) || 0);
        nextAmount += value * multiplier;
        if (Boolean(stackBonus.consumeStatus) && targetStatus) {
            consumeStatus(targetState, statusId);
        }
        return nextAmount;
    };
    const condition = effect?.condition;
    if (!condition || !condition.statusId) {
        let resolvedAmount = applyStackBonus(amount);
        if (condition?.missingStatusId && hasStatus(targetState, condition.missingStatusId)) {
            resolvedAmount = applyStackBonus(amount);
        }
        if (Boolean(effect?.metadata?.amountFromSourceMissingHp)) {
            const currentHp = Math.max(0, Number(actorUnit?.hp) || 0);
            resolvedAmount += Math.max(0, DEFAULT_HP - currentHp);
        }
        if (Boolean(effect?.metadata?.amountFromSourceCurrentHp)) {
            resolvedAmount += Math.max(0, Number(actorUnit?.hp) || 0);
        }
        return resolvedAmount;
    }
    const scope = condition.scope === 'target' ? 'target' : 'self';
    const scopedState = scope === 'target' ? targetState : actorState;
    if (!hasStatus(scopedState, condition.statusId)) {
        let resolvedAmount = applyStackBonus(amount);
        if (Boolean(effect?.metadata?.amountFromSourceMissingHp)) {
            const currentHp = Math.max(0, Number(actorUnit?.hp) || 0);
            resolvedAmount += Math.max(0, DEFAULT_HP - currentHp);
        }
        if (Boolean(effect?.metadata?.amountFromSourceCurrentHp)) {
            resolvedAmount += Math.max(0, Number(actorUnit?.hp) || 0);
        }
        return resolvedAmount;
    }
    if (Number.isFinite(condition.conditionalAmount)) {
        amount = Number(condition.conditionalAmount) || amount;
    }
    if (condition.consumeOnMatch) {
        consumeStatus(scopedState, condition.statusId);
    }
    let resolvedAmount = applyStackBonus(amount);
    if (Boolean(effect?.metadata?.amountFromSourceMissingHp)) {
        const currentHp = Math.max(0, Number(actorUnit?.hp) || 0);
        resolvedAmount += Math.max(0, DEFAULT_HP - currentHp);
    }
    if (Boolean(effect?.metadata?.amountFromSourceCurrentHp)) {
        resolvedAmount += Math.max(0, Number(actorUnit?.hp) || 0);
    }
    const missingHpStep = Math.max(0, Number(effect?.metadata?.amountFromSourceMissingHpStep) || 0);
    const missingHpDivisor = Math.max(1, Number(effect?.metadata?.amountFromSourceMissingHpDivisor) || 0);
    if (missingHpStep > 0 && missingHpDivisor > 0) {
        const currentHp = Math.max(0, Number(actorUnit?.hp) || 0);
        const missingHp = Math.max(0, DEFAULT_HP - currentHp);
        resolvedAmount += Math.floor(missingHp / missingHpDivisor) * missingHpStep;
    }
    return resolvedAmount;
};

const getTargetBonusDamageFromSource = ({ targetState, sourceCharacterId, sourceSkillId = null }) => {
    if (!targetState || !sourceCharacterId) return 0;
    const statuses = Array.isArray(targetState?.statuses) ? targetState.statuses : [];
    return statuses.reduce((sum, status) => {
        const remaining = Number(status?.remainingTurns) || 0;
        if (remaining <= 0) return sum;
        const metadata = status?.metadata || {};
        const flatBonus = Number(metadata?.bonusDamageFromSourceSkillsFlat) || 0;
        let bonus = flatBonus;
        const perStack = Number(metadata?.bonusDamageFromSourceSkillsPerStack) || 0;
        const stackKey =
            typeof metadata?.bonusDamageFromSourceSkillsPerStackMetadataKey === 'string'
                ? metadata.bonusDamageFromSourceSkillsPerStackMetadataKey
                : '';
        if (perStack > 0 && stackKey) {
            bonus += perStack * Math.max(0, Number(metadata?.[stackKey]) || 0);
        }
        if (bonus <= 0) return sum;
        const requiredCharacterId =
            typeof metadata?.bonusDamageFromSourceCharacterId === 'string'
                ? metadata.bonusDamageFromSourceCharacterId
                : '';
        if (requiredCharacterId && requiredCharacterId !== sourceCharacterId) return sum;
        const requiredSkillIds = Array.isArray(metadata?.bonusDamageAppliesToSkillIds)
            ? metadata.bonusDamageAppliesToSkillIds
            : null;
        if (requiredSkillIds && requiredSkillIds.length > 0) {
            if (
                !sourceSkillId ||
                !requiredSkillIds.some((entry) => typeof entry === 'string' && entry === sourceSkillId)
            ) {
                return sum;
            }
        }
        return sum + bonus;
    }, 0);
};

const hasSkillClass = (skillClasses = [], className = '') =>
    Array.isArray(skillClasses) &&
    skillClasses.some(
        (entry) =>
            typeof entry === 'string' &&
            typeof className === 'string' &&
            entry.trim().toLowerCase() === className.trim().toLowerCase()
    );

const normalizeSkillClassName = (value) =>
    typeof value === 'string' ? value.trim().toLowerCase() : '';

const formatSkillClassLabel = (value = '') => {
    const normalized = normalizeSkillClassName(value);
    if (!normalized) return '';
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const getSourceClassScopedDamageModifiers = (actorState, skillClasses = []) => {
    const totals = {
        damageBonusFlat: 0,
        damageDebuffFlat: 0,
        nonAfflictionDamageBonusFlat: 0,
        nonAfflictionDamageDebuffFlat: 0,
    };
    const statuses = Array.isArray(actorState?.statuses) ? actorState.statuses : [];
    statuses.forEach((status) => {
        const remaining = Number(status?.remainingTurns) || 0;
        if (remaining <= 0) return;
        const metadata = status?.metadata || {};
        const classBonusMap =
            metadata?.damageBonusBySkillClass && typeof metadata.damageBonusBySkillClass === 'object'
                ? metadata.damageBonusBySkillClass
                : {};
        Object.entries(classBonusMap).forEach(([className, amount]) => {
            if (!hasSkillClass(skillClasses, className)) return;
            totals.damageBonusFlat += Number(amount) || 0;
        });
        const classDebuffMap =
            metadata?.damageDebuffBySkillClass && typeof metadata.damageDebuffBySkillClass === 'object'
                ? metadata.damageDebuffBySkillClass
                : {};
        Object.entries(classDebuffMap).forEach(([className, amount]) => {
            if (!hasSkillClass(skillClasses, className)) return;
            totals.damageDebuffFlat += Math.max(0, Number(amount) || 0);
        });
        const classNonAfflictionBonusMap =
            metadata?.nonAfflictionDamageBonusBySkillClass &&
            typeof metadata.nonAfflictionDamageBonusBySkillClass === 'object'
                ? metadata.nonAfflictionDamageBonusBySkillClass
                : {};
        Object.entries(classNonAfflictionBonusMap).forEach(([className, amount]) => {
            if (!hasSkillClass(skillClasses, className)) return;
            totals.nonAfflictionDamageBonusFlat += Number(amount) || 0;
        });
        const classNonAfflictionDebuffMap =
            metadata?.nonAfflictionDamageDebuffBySkillClass &&
            typeof metadata.nonAfflictionDamageDebuffBySkillClass === 'object'
                ? metadata.nonAfflictionDamageDebuffBySkillClass
                : {};
        Object.entries(classNonAfflictionDebuffMap).forEach(([className, amount]) => {
            if (!hasSkillClass(skillClasses, className)) return;
            totals.nonAfflictionDamageDebuffFlat += Math.max(0, Number(amount) || 0);
        });
    });
    return totals;
};

const resolveSkillClassChoiceForCast = ({ skill, queued }) => {
    const options = Array.isArray(skill?.classChoiceOptions)
        ? skill.classChoiceOptions.map(normalizeSkillClassName).filter(Boolean)
        : [];
    if (!options.length) return null;
    const queuedChoice = normalizeSkillClassName(queued?.classChoice);
    if (queuedChoice && options.includes(queuedChoice)) return queuedChoice;
    return options[Math.floor(Math.random() * options.length)];
};

const materializeEffectWithSkillClassChoice = (effect, chosenSkillClass) => {
    if (!effect || !chosenSkillClass) return effect;
    const metadata = effect?.metadata && typeof effect.metadata === 'object' ? { ...effect.metadata } : null;
    let next = effect;
    const placeholders = {
        '{selectedSkillClass}': chosenSkillClass,
        '{selectedSkillClassLabel}': formatSkillClassLabel(chosenSkillClass),
    };
    const replacePlaceholders = (text) => {
        if (typeof text !== 'string') return text;
        return Object.entries(placeholders).reduce((result, [token, value]) => {
            if (!token) return result;
            return result.split(token).join(value);
        }, text);
    };
    if (effect?.useChosenSkillClassForSourceSkillClassesAny) {
        const { useChosenSkillClassForSourceSkillClassesAny, ...rest } = next;
        next = { ...rest, sourceSkillClassesAny: [chosenSkillClass] };
    }
    if (metadata) {
        if (metadata?.useChosenSkillClassForCannotUseSkillClasses) {
            metadata.cannotUseSkillClasses = [chosenSkillClass];
            delete metadata.useChosenSkillClassForCannotUseSkillClasses;
        }
        if (metadata?.useChosenSkillClassForOnOwnerUseSkillClassesAny) {
            metadata.onOwnerUseSkillClassesAny = [chosenSkillClass];
            delete metadata.useChosenSkillClassForOnOwnerUseSkillClassesAny;
        }
        if (metadata?.useChosenSkillClassForDamageDebuffBySkillClass) {
            const amount = Math.max(0, Number(metadata?.chosenSkillClassDamageDebuffAmount) || 0);
            metadata.damageDebuffBySkillClass = { [chosenSkillClass]: amount };
            delete metadata.useChosenSkillClassForDamageDebuffBySkillClass;
            delete metadata.chosenSkillClassDamageDebuffAmount;
        }
        if (typeof metadata.tooltipText === 'string') {
            metadata.tooltipText = replacePlaceholders(metadata.tooltipText);
        }
        next = { ...next, metadata };
    }
    if (typeof next?.statusId === 'string') {
        next = { ...next, statusId: replacePlaceholders(next.statusId) };
    }
    return next;
};

const getSkillClassSet = (skillClasses = []) =>
    new Set(
        (Array.isArray(skillClasses) ? skillClasses : [])
            .map((entry) => (typeof entry === 'string' ? entry.trim().toLowerCase() : ''))
            .filter(Boolean)
    );

const getBlockedSkillIndices = (actorState) => {
    const blocked = new Set();
    const statuses = Array.isArray(actorState?.statuses) ? actorState.statuses : [];
    statuses.forEach((status) => {
        const remaining = Number(status?.remainingTurns) || 0;
        if (remaining <= 0) return;
        const indices = status?.metadata?.cannotUseSkillIndices;
        if (!Array.isArray(indices)) return;
        indices.forEach((index) => {
            const parsed = Number.parseInt(index, 10);
            if (Number.isInteger(parsed) && parsed >= 0) {
                blocked.add(parsed);
            }
        });
    });
    return blocked;
};

const isSkillIndexBlockedForActor = (actorState, skillIndex) => {
    const parsed = Number.parseInt(skillIndex, 10);
    if (!Number.isInteger(parsed) || parsed < 0) return false;
    return getBlockedSkillIndices(actorState).has(parsed);
};

const doesTargetIgnoreSkillByClass = ({ targetState, skillClasses = [], isEnemySkill = false }) => {
    if (!isEnemySkill) return false;
    const statuses = Array.isArray(targetState?.statuses) ? targetState.statuses : [];
    if (!statuses.length) return false;
    const classSet = getSkillClassSet(skillClasses);
    if (!classSet.size) return false;
    return statuses.some((status) => {
        const remaining = Number(status?.remainingTurns) || 0;
        if (remaining <= 0) return false;
        const ignored = status?.metadata?.ignoreSkillClasses;
        if (!Array.isArray(ignored) || !ignored.length) return false;
        return ignored.some((entry) =>
            classSet.has(typeof entry === 'string' ? entry.trim().toLowerCase() : '')
        );
    });
};

const getCharacterActiveSkillIndices = (character) => {
    const skills = Array.isArray(character?.skills) ? character.skills : [];
    const visible = [];
    for (let i = 0; i < skills.length; i += 1) {
        const skill = skills[i];
        if (!skill || skill.isHidden) continue;
        visible.push(i);
        if (visible.length >= 4) break;
    }
    if (visible.length >= 4) return visible;
    const fallback = [];
    for (let i = 0; i < skills.length && fallback.length < 4; i += 1) {
        fallback.push(i);
    }
    return fallback;
};

const skillMatchesReflectRule = ({ statusMetadata = {}, skillClasses = [], skillIsHarmful = false }) => {
    if (!statusMetadata || typeof statusMetadata !== 'object') return false;
    if (Boolean(statusMetadata.reflectOnlyHarmfulSkills) && !skillIsHarmful) return false;
    if (
        Array.isArray(statusMetadata.reflectOnlySkillClasses) &&
        statusMetadata.reflectOnlySkillClasses.length > 0 &&
        !statusMetadata.reflectOnlySkillClasses.some((entry) => hasSkillClass(skillClasses, entry))
    ) {
        return false;
    }
    if (
        Array.isArray(statusMetadata.reflectExcludeSkillClasses) &&
        statusMetadata.reflectExcludeSkillClasses.some((entry) => hasSkillClass(skillClasses, entry))
    ) {
        return false;
    }
    return true;
};

const getAdditionalIncomingStatusDuration = ({ targetState, incomingStatusId, incomingMetadata }) => {
    const statuses = Array.isArray(targetState?.statuses) ? targetState.statuses : [];
    if (!statuses.length) return 0;
    return statuses.reduce((sum, status) => {
        const remaining = Number(status?.remainingTurns) || 0;
        if (remaining <= 0) return sum;
        const rules = Array.isArray(status?.metadata?.extendIncomingStatusDuration)
            ? status.metadata.extendIncomingStatusDuration
            : [];
        if (!rules.length) return sum;
        const bonus = rules.reduce((acc, rule) => {
            const by = Number(rule?.by) || 0;
            if (by <= 0) return acc;
            if (rule?.whenStatusId && rule.whenStatusId !== incomingStatusId) return acc;
            if (
                rule?.whenStatusHasMetadataFlag &&
                !Boolean(incomingMetadata?.[rule.whenStatusHasMetadataFlag])
            ) {
                return acc;
            }
            return acc + by;
        }, 0);
        return sum + bonus;
    }, 0);
};

const getSkillSpecificDamageBonus = (actorState, skillId) => {
    if (!skillId) return 0;
    const statuses = Array.isArray(actorState?.statuses) ? actorState.statuses : [];
    return statuses.reduce((sum, status) => {
        const remaining = Number(status?.remainingTurns) || 0;
        if (remaining <= 0) return sum;
        const bonuses = status?.metadata?.skillDamageBonuses;
        if (!bonuses || typeof bonuses !== 'object') return sum;
        return sum + (Number(bonuses[skillId]) || 0);
    }, 0);
};

const rollPercentSuccess = (chancePercent) => {
    const chance = Math.max(0, Math.min(100, Number(chancePercent) || 0));
    if (chance <= 0) return false;
    return Math.random() * 100 < chance;
};

const getEvadeChanceAgainstSkill = ({ targetState, skillClasses, isEnemySkill }) => {
    if (!isEnemySkill) return 0;
    const statuses = Array.isArray(targetState?.statuses) ? targetState.statuses : [];
    const skillIsMental = hasSkillClass(skillClasses, 'mental');
    return statuses.reduce((sum, status) => {
        const remaining = Number(status?.remainingTurns) || 0;
        if (remaining <= 0) return sum;
        const metadata = status?.metadata || {};
        const evade = Math.max(0, Number(metadata.evadeChancePercent) || 0);
        if (evade <= 0) return sum;
        if (metadata.evadeAgainstNonMental && skillIsMental) return sum;
        sum += evade;
        return sum;
    }, 0);
};

const applyOnEvadeBonuses = ({
    targetState,
    sourceUsername,
    sourceSlot,
    sourceSkillId,
    skillClasses,
}) => {
    const statuses = Array.isArray(targetState?.statuses) ? targetState.statuses : [];
    statuses.forEach((status) => {
        const remaining = Number(status?.remainingTurns) || 0;
        if (remaining <= 0) return;
        const metadata = status?.metadata || {};
        const bonusSourceSkillId = status?.sourceSkillId || sourceSkillId || null;
        const classBonuses = metadata.onEvadeSkillClassBonuses;
        if (classBonuses && typeof classBonuses === 'object') {
            Object.entries(classBonuses).forEach(([skillClass, bonus]) => {
                if (!hasSkillClass(skillClasses, skillClass)) return;
                const statusId = bonus?.statusId;
                if (!statusId) return;
                applyStatus({
                    targetState,
                    statusId,
                    duration: Number(bonus?.duration) || 99,
                    sourceSkillId: bonusSourceSkillId,
                    sourceUsername: sourceUsername || null,
                    sourceSlot: Number.isInteger(sourceSlot) ? sourceSlot : null,
                    metadata: bonus?.metadata || {},
                    fresh: false,
                });
            });
        }
        const onEvadeApplyStatus = metadata.onEvadeApplyStatus;
        if (onEvadeApplyStatus?.statusId) {
            applyStatus({
                targetState,
                statusId: onEvadeApplyStatus.statusId,
                duration: Number(onEvadeApplyStatus?.duration) || 1,
                sourceSkillId: bonusSourceSkillId,
                sourceUsername: sourceUsername || null,
                sourceSlot: Number.isInteger(sourceSlot) ? sourceSlot : null,
                metadata: onEvadeApplyStatus?.metadata || {},
                fresh: false,
            });
        }
    });
};

const isHarmfulEffect = (effect) => {
    const type = effect?.type;
    if (type === 'damage') return true;
    if (type === 'execute_below_hp') return true;
    if (type === 'destroy_destructible_defense') return true;
    if (type === 'modify_cooldowns') {
        const amount = Number(effect?.amount) || 0;
        return amount > 0 || Boolean(effect?.metadata?.harmful);
    }
    if (type === 'apply_status') {
        const metadata = effect?.metadata || {};
        return Boolean(
            metadata.harmful ||
                metadata.cannotUseSkills ||
                metadata.cannotUseHarmfulSkills ||
                metadata.cannotUseNonMentalSkills ||
                metadata.useChosenSkillClassForCannotUseSkillClasses ||
                (Array.isArray(metadata.cannotUseSkillClasses) && metadata.cannotUseSkillClasses.length > 0) ||
                metadata.cannotReduceDamage ||
                metadata.cannotBecomeInvulnerable ||
                metadata.taunt
        );
    }
    return false;
};

const skillHasHarmfulEffects = (skill) => {
    const effects = Array.isArray(skill?.effects) ? skill.effects : [];
    return effects.some((effect) => isHarmfulEffect(effect));
};

const getTeamStatusMetadataMax = ({ match, username, metadataKey }) => {
    if (!match || !username || !metadataKey) return 0;
    const units = Array.isArray(match.board?.[username]) ? match.board[username] : [];
    let maxValue = 0;
    units.forEach((unit) => {
        if (!unit || unit.alive === false) return;
        const state = ensureUnitStateShape(unit);
        const statuses = Array.isArray(state.statuses) ? state.statuses : [];
        statuses.forEach((status) => {
            const remaining = Number(status?.remainingTurns) || 0;
            if (remaining <= 0) return;
            const value = Math.max(0, Number(status?.metadata?.[metadataKey]) || 0);
            maxValue = Math.max(maxValue, value);
        });
    });
    return maxValue;
};

const maybeTriggerReflectDamage = ({ match, turnMarker, actingUsername, recipient, actorUnit }) => {
    if (!recipient?.unit || recipient.unit.alive === false) return;
    if (!actorUnit || actorUnit.alive === false) return;
    if (recipient.username === actingUsername) return;

    const targetState = ensureUnitStateShape(recipient.unit);
    const statuses = Array.isArray(targetState.statuses) ? targetState.statuses : [];
    const sharinganStatus = statuses.find((status) => {
        const remaining = Number(status?.remainingTurns) || 0;
        const reflectAmount = Number(status?.metadata?.reflectFirstHarmfulDamage) || 0;
        return remaining > 0 && reflectAmount > 0;
    });
    if (!sharinganStatus) return;

    const metadata = sharinganStatus.metadata || {};
    if (metadata._lastReflectTurnMarker === turnMarker) return;
    metadata._lastReflectTurnMarker = turnMarker;
    sharinganStatus.metadata = metadata;

    const reflectAmount = Number(metadata.reflectFirstHarmfulDamage) || 0;
    if (reflectAmount <= 0) return;
    applyDamageToUnit(actorUnit, reflectAmount, {
        match,
        sourceUsername: recipient.username,
        targetUsername: actingUsername,
    });
};

const maybeTriggerReactiveDefenses = ({
    match,
    turnMarker,
    actingUsername,
    recipient,
    actorUnit,
    skillClasses = [],
}) => {
    if (!recipient?.unit || recipient.unit.alive === false) return false;
    if (!actorUnit || actorUnit.alive === false) return false;
    if (recipient.username === actingUsername) return false;

    maybeTriggerReflectDamage({
        match,
        turnMarker,
        actingUsername,
        recipient,
        actorUnit,
    });

    const targetState = ensureUnitStateShape(recipient.unit);
    const statuses = Array.isArray(targetState.statuses) ? targetState.statuses : [];
    const trapIndex = statuses.findIndex((status) => {
        const remaining = Number(status?.remainingTurns) || 0;
        return (
            remaining > 0 &&
            (Boolean(status?.metadata?.triggerOnEnemyHarmfulNonMental) ||
                Boolean(status?.metadata?.triggerOnEnemyHarmfulSkill))
        );
    });
    if (trapIndex < 0) return false;

    const trapStatus = statuses[trapIndex];
    const trapMetadata = trapStatus?.metadata || {};
    if (trapMetadata?.triggerOnEnemyHarmfulNonMental && hasSkillClass(skillClasses, 'mental')) {
        return false;
    }
    const counterDamage = Math.max(0, Number(trapMetadata?.counterDamage) || 0);
    if (counterDamage > 0) {
        applyDamageToUnit(actorUnit, counterDamage, {
            match,
            sourceUsername: recipient.username,
            targetUsername: actingUsername,
            ignoreDamageReduction: Boolean(trapMetadata?.counterDamageIgnoresReduction),
            ignoreDestructibleDefense: Boolean(trapMetadata?.counterDamageIgnoresDestructibleDefense),
        });
    }

    if (trapMetadata?.counterStatusId) {
        const actorState = ensureUnitStateShape(actorUnit);
        applyStatus({
            targetState: actorState,
            statusId: trapMetadata.counterStatusId,
            duration: Math.max(0, Number(trapMetadata?.counterStatusDuration) || 0),
            sourceSkillId: trapStatus?.sourceSkillId || null,
            sourceUsername: recipient.username || null,
            sourceSlot: Number.isInteger(recipient.slot) ? recipient.slot : null,
            metadata: trapMetadata?.counterStatusMetadata || {},
            fresh: false,
        });
    }
    const cancelEnemyStatusesByIdFromSelfSource = Array.isArray(
        trapMetadata?.cancelEnemyStatusesByIdFromSelfSource
    )
        ? trapMetadata.cancelEnemyStatusesByIdFromSelfSource.filter((id) => typeof id === 'string' && id)
        : [];
    if (
        cancelEnemyStatusesByIdFromSelfSource.length > 0 &&
        recipient.username &&
        Number.isInteger(recipient.slot) &&
        match
    ) {
        (match.players || [])
            .filter((player) => player?.username && player.username !== recipient.username)
            .forEach((player) => {
                const units = Array.isArray(match.board?.[player.username]) ? match.board[player.username] : [];
                units.forEach((unit) => {
                    if (!unit || unit.alive === false) return;
                    const state = ensureUnitStateShape(unit);
                    state.statuses = (Array.isArray(state.statuses) ? state.statuses : []).filter((status) => {
                        if (!status?.id || !cancelEnemyStatusesByIdFromSelfSource.includes(status.id)) {
                            return true;
                        }
                        return !(
                            status?.sourceUsername === recipient.username &&
                            Number(status?.sourceSlot) === Number(recipient.slot)
                        );
                    });
                });
            });
    }
    const counterApplyStatusToSourceOwner = trapMetadata?.counterApplyStatusToSourceOwner;
    if (
        counterApplyStatusToSourceOwner?.statusId &&
        trapStatus?.sourceUsername &&
        Number.isInteger(trapStatus?.sourceSlot)
    ) {
        const sourceUnit = match.board?.[trapStatus.sourceUsername]?.[Number(trapStatus.sourceSlot)] || null;
        if (sourceUnit && sourceUnit.alive !== false) {
            const sourceState = ensureUnitStateShape(sourceUnit);
            applyStatus({
                targetState: sourceState,
                statusId: counterApplyStatusToSourceOwner.statusId,
                duration: counterApplyStatusToSourceOwner.duration,
                sourceSkillId: trapStatus?.sourceSkillId || null,
                sourceUsername: trapStatus?.sourceUsername || null,
                sourceSlot: Number.isInteger(trapStatus?.sourceSlot) ? trapStatus.sourceSlot : null,
                metadata: counterApplyStatusToSourceOwner.metadata || {},
                fresh: false,
            });
        }
    }
    if (trapMetadata?.usedStatusId) {
        applyStatus({
            targetState,
            statusId: trapMetadata.usedStatusId,
            duration: Math.max(0, Number(trapMetadata?.usedStatusDuration) || 1),
            sourceSkillId: trapStatus?.sourceSkillId || null,
            sourceUsername: trapStatus?.sourceUsername || null,
            sourceSlot: Number.isInteger(trapStatus?.sourceSlot) ? trapStatus.sourceSlot : null,
            metadata: trapMetadata?.usedStatusMetadata || {},
            fresh: false,
        });
    }

    statuses.splice(trapIndex, 1);
    targetState.statuses = statuses;
    return Boolean(trapMetadata?.counterCancelsSkill);
};

const applyDamageToUnit = (unit, rawAmount, context = {}) => {
    if (!unit || unit.alive === false) return 0;
    const targetState = ensureUnitStateShape(unit);
    const ignoreEnemyDamage =
        hasStatusMetadataFlag(targetState, 'ignoreEnemyDamage') &&
        context?.sourceUsername &&
        context?.targetUsername &&
        context.sourceUsername !== context.targetUsername;
    if (ignoreEnemyDamage) {
        return 0;
    }
    const cannotReduceDamage = hasStatusMetadataFlag(targetState, 'cannotReduceDamage');
    let incoming = Math.max(0, Number(rawAmount) || 0);
    const incomingMultiplier = Math.max(0, Number(getStatusMetadataTotals(targetState).damageTakenMultiplier) || 1);
    incoming *= incomingMultiplier;
    if (incoming <= 0) return 0;

    // Destructible defense absorbs incoming damage first; overflow continues to HP.
    const ignoreDestructibleDefense = Boolean(context?.ignoreDestructibleDefense);
    if (!ignoreDestructibleDefense) {
        for (let i = 0; i < targetState.statuses.length && incoming > 0; i += 1) {
            const status = targetState.statuses[i];
            const points = Math.max(0, Number(status?.metadata?.destructibleDefensePoints) || 0);
            if (points <= 0) continue;
            const absorbed = Math.min(incoming, points);
            incoming -= absorbed;
            const remainingPoints = points - absorbed;
            const nextMetadata = { ...(status.metadata || {}), destructibleDefensePoints: remainingPoints };
            const restoreConfig =
                nextMetadata?.destructibleDefenseRestore &&
                typeof nextMetadata.destructibleDefenseRestore === 'object'
                    ? nextMetadata.destructibleDefenseRestore
                    : null;
            if (restoreConfig && absorbed > 0) {
                const thresholdDamageTaken = Math.max(1, Number(restoreConfig.thresholdDamageTaken) || 0);
                const triggerAtOrBelowPoints = Math.max(
                    0,
                    Number(restoreConfig.triggerAtOrBelowPoints)
                );
                const totalTaken = Math.max(0, Number(nextMetadata._destructibleDefenseDamageTaken) || 0) + absorbed;
                nextMetadata._destructibleDefenseDamageTaken = totalTaken;
                const alreadyTriggered = Boolean(nextMetadata._destructibleDefenseRestoreTriggered);
                const triggeredByDamageTaken = thresholdDamageTaken > 0 && totalTaken >= thresholdDamageTaken;
                const triggeredByRemainingPoints =
                    Number.isFinite(triggerAtOrBelowPoints) && remainingPoints <= triggerAtOrBelowPoints;
                if (!alreadyTriggered && (triggeredByDamageTaken || triggeredByRemainingPoints)) {
                    const delayTurns = Math.max(
                        0,
                        Number(restoreConfig.delayOwnerTurns ?? restoreConfig.ownerTurnRestoreCount) || 0
                    );
                    nextMetadata._destructibleDefenseRestoreTriggered = true;
                    nextMetadata._destructibleDefenseRestoreTurnsLeft = delayTurns;
                }
            }
            status.metadata = nextMetadata;
            if (remainingPoints <= 0) {
                const removeStatusIdsOnBreak = Array.isArray(status?.metadata?.removeStatusIdsOnBreak)
                    ? status.metadata.removeStatusIdsOnBreak.filter((id) => typeof id === 'string' && id)
                    : [];
                if (removeStatusIdsOnBreak.length > 0) {
                    targetState.statuses = targetState.statuses.filter(
                        (entry) => !removeStatusIdsOnBreak.includes(entry?.id)
                    );
                    i = -1;
                    continue;
                }
                if (
                    Boolean(status?.metadata?.loseRandomChakraOnBreakByEnemy) &&
                    context?.match &&
                    context?.sourceUsername &&
                    context?.targetUsername &&
                    context.sourceUsername !== context.targetUsername
                ) {
                    removeRandomChakraFromMatch({
                        match: context.match,
                        username: context.sourceUsername,
                        amount: 1,
                    });
                }
                targetState.statuses.splice(i, 1);
                i -= 1;
            }
        }
    }

    const totals = getStatusMetadataTotals(targetState);
    const skillClasses = Array.isArray(context?.skillClasses) ? context.skillClasses : [];
    const isPhysical = skillClasses.some(
        (entry) => typeof entry === 'string' && entry.trim().toLowerCase() === 'physical'
    );
    const ignoreDamageReduction = Boolean(context?.ignoreDamageReduction);
    const percentReduction = ignoreDamageReduction
        ? 0
        : cannotReduceDamage
        ? 0
        : Math.min(100, Math.max(0, Number(totals.damageReductionPercent) || 0));
    let afterPercent = incoming * (1 - percentReduction / 100);
    const percentMitigationStateMap = context?.percentMitigationStateMap;
    const percentMitigationStateKey = context?.percentMitigationStateKey;
    if (
        percentReduction > 0 &&
        percentMitigationStateMap instanceof Map &&
        percentMitigationStateKey
    ) {
        const existing = percentMitigationStateMap.get(percentMitigationStateKey);
        const state =
            existing && typeof existing === 'object'
                ? existing
                : { gross: 0, prevented: 0, percent: percentReduction };
        const stablePercent = Math.max(0, Math.min(100, Number(state.percent) || percentReduction));
        const nextGross = Math.max(0, Number(state.gross) || 0) + incoming;
        const targetPreventedTotal = nextGross * (stablePercent / 100);
        const preventedThisHit = Math.max(
            0,
            targetPreventedTotal - Math.max(0, Number(state.prevented) || 0)
        );
        afterPercent = Math.max(0, incoming - preventedThisHit);
        state.gross = nextGross;
        state.prevented = Math.max(0, Number(state.prevented) || 0) + preventedThisHit;
        state.percent = stablePercent;
        percentMitigationStateMap.set(percentMitigationStateKey, state);
    }
    const baseGeneralMitigation =
        ignoreDamageReduction || cannotReduceDamage
            ? 0
            : Math.max(0, Number(totals.damageReductionFlat) || 0);
    const basePhysicalMitigation =
        ignoreDamageReduction || cannotReduceDamage || !isPhysical
            ? 0
            : Math.max(0, Number(totals.physicalDamageReductionFlat) || 0);
    let appliedGeneralMitigation = baseGeneralMitigation;
    let appliedPhysicalMitigation = basePhysicalMitigation;
    const standardBudgetMap = context?.standardMitigationBudgetMap;
    const standardBudgetKey = context?.standardMitigationBudgetKey;
    if (standardBudgetMap instanceof Map && standardBudgetKey) {
        const generalKey = `g:${standardBudgetKey}`;
        const physicalKey = `p:${standardBudgetKey}`;
        const generalBudget = standardBudgetMap.has(generalKey)
            ? Math.max(0, Number(standardBudgetMap.get(generalKey)) || 0)
            : baseGeneralMitigation;
        appliedGeneralMitigation = Math.min(generalBudget, afterPercent);
        standardBudgetMap.set(generalKey, Math.max(0, generalBudget - appliedGeneralMitigation));

        const remainingAfterGeneral = Math.max(0, afterPercent - appliedGeneralMitigation);
        const physicalBudget = standardBudgetMap.has(physicalKey)
            ? Math.max(0, Number(standardBudgetMap.get(physicalKey)) || 0)
            : basePhysicalMitigation;
        appliedPhysicalMitigation = Math.min(physicalBudget, remainingAfterGeneral);
        standardBudgetMap.set(physicalKey, Math.max(0, physicalBudget - appliedPhysicalMitigation));
    } else {
        appliedGeneralMitigation = Math.min(baseGeneralMitigation, afterPercent);
        appliedPhysicalMitigation = Math.min(
            basePhysicalMitigation,
            Math.max(0, afterPercent - appliedGeneralMitigation)
        );
    }
    const postStandardMitigation = Math.max(0, afterPercent - appliedGeneralMitigation - appliedPhysicalMitigation);
    const baseUnpierceableMitigation = cannotReduceDamage
        ? 0
        : Math.max(0, Number(totals.unpierceableDamageReductionFlat) || 0);
    let appliedUnpierceableMitigation = baseUnpierceableMitigation;
    const budgetMap = context?.unpierceableBudgetMap;
    const budgetKey = context?.unpierceableBudgetKey;
    if (budgetMap instanceof Map && budgetKey) {
        const currentBudget = budgetMap.has(budgetKey)
            ? Math.max(0, Number(budgetMap.get(budgetKey)) || 0)
            : baseUnpierceableMitigation;
        appliedUnpierceableMitigation = Math.min(currentBudget, postStandardMitigation);
        budgetMap.set(budgetKey, Math.max(0, currentBudget - appliedUnpierceableMitigation));
    } else {
        appliedUnpierceableMitigation = Math.min(baseUnpierceableMitigation, postStandardMitigation);
    }
    const dealt = Math.max(0, postStandardMitigation - appliedUnpierceableMitigation);
    unit.hp = Math.max(Math.max(0, Number(totals.minimumHp) || 0), (Number(unit.hp) || 0) - dealt);
    if (unit.hp <= 0) {
        unit.alive = false;
    }
    return dealt;
};

const applyHealToUnit = (unit, rawAmount) => {
    if (!unit || unit.alive === false) return 0;
    const targetState = ensureUnitStateShape(unit);
    const totals = getStatusMetadataTotals(targetState);
    const heal = Math.max(0, Number(rawAmount) || 0) * Math.max(0, Number(totals.healReceivedMultiplier) || 0);
    const before = Number(unit.hp) || 0;
    const cap = Math.max(0, Number(unit?.hpCap) || DEFAULT_HP);
    unit.hp = Math.min(DEFAULT_HP, cap, before + heal);
    return Math.max(0, unit.hp - before);
};

const applyHealthLossToUnit = (unit, rawAmount) => {
    if (!unit || unit.alive === false) return 0;
    const loss = Math.max(0, Number(rawAmount) || 0);
    if (loss <= 0) return 0;
    const before = Math.max(0, Number(unit.hp) || 0);
    unit.hp = Math.max(0, before - loss);
    if (unit.hp <= 0) {
        unit.alive = false;
    }
    return Math.max(0, before - unit.hp);
};

const applyHealthCapLossToUnit = (unit, rawAmount) => {
    if (!unit || unit.alive === false) return 0;
    const loss = Math.max(0, Number(rawAmount) || 0);
    if (loss <= 0) return 0;
    const beforeCap = Math.max(0, Number(unit.hpCap) || DEFAULT_HP);
    const nextCap = Math.max(0, beforeCap - loss);
    unit.hpCap = nextCap;
    const hpBeforeClamp = Math.max(0, Number(unit.hp) || 0);
    if (hpBeforeClamp > nextCap) {
        unit.hp = nextCap;
        if (unit.hp <= 0) {
            unit.alive = false;
        }
    }
    return Math.max(0, beforeCap - nextCap);
};

const destroyAllDestructibleDefenseOnUnit = (unit) => {
    if (!unit || unit.alive === false) return 0;
    const targetState = ensureUnitStateShape(unit);
    const statuses = Array.isArray(targetState.statuses) ? targetState.statuses : [];
    let removedPoints = 0;
    const removeIds = new Set();
    const survivors = [];
    statuses.forEach((status) => {
        const points = Math.max(0, Number(status?.metadata?.destructibleDefensePoints) || 0);
        if (points <= 0) {
            survivors.push(status);
            return;
        }
        removedPoints += points;
        const removeStatusIdsOnBreak = Array.isArray(status?.metadata?.removeStatusIdsOnBreak)
            ? status.metadata.removeStatusIdsOnBreak.filter((id) => typeof id === 'string' && id)
            : [];
        removeStatusIdsOnBreak.forEach((id) => removeIds.add(id));
    });
    targetState.statuses = survivors.filter((entry) => !removeIds.has(entry?.id));
    return removedPoints;
};

const applyChakraGainToMatch = ({ match, username, chakraType, amount = 1 }) => {
    if (!match || !username) return 0;
    const units = Array.isArray(match.board?.[username]) ? match.board[username] : [];
    const chakraGainBlocked = units.some((unit) => {
        if (!unit || unit.alive === false) return false;
        const state = ensureUnitStateShape(unit);
        return (Array.isArray(state.statuses) ? state.statuses : []).some(
            (status) => (Number(status?.remainingTurns) || 0) > 0 && Boolean(status?.metadata?.noChakraGain)
        );
    });
    if (chakraGainBlocked) return 0;

    const normalizedType =
        typeof chakraType === 'string' ? chakraType.trim().toLowerCase() : '';
    if (!chakraTypes.includes(normalizedType)) return 0;
    const gain = Math.max(0, Number(amount) || 0);
    if (gain <= 0) return 0;
    match.chakraPools = match.chakraPools || {};
    const pool = match.chakraPools[username] || createEmptyChakraCost();
    pool[normalizedType] = (Number(pool[normalizedType]) || 0) + gain;
    match.chakraPools[username] = pool;
    match.economy = match.economy || {};
    match.economy.lastChakraGain = match.economy.lastChakraGain || {};
    const prev = Array.isArray(match.economy.lastChakraGain[username])
        ? match.economy.lastChakraGain[username]
        : [];
    match.economy.lastChakraGain[username] = [...prev, normalizedType];
    return gain;
};

const removeRandomChakraFromMatch = ({ match, username, amount = 1 }) => {
    if (!match || !username) return 0;
    const lossAmount = Math.max(0, Number(amount) || 0);
    if (lossAmount <= 0) return 0;
    match.chakraPools = match.chakraPools || {};
    const pool = match.chakraPools[username] || createEmptyChakraCost();
    let removed = 0;
    for (let i = 0; i < lossAmount; i += 1) {
        const available = chakraTypes.filter((type) => (Number(pool[type]) || 0) > 0);
        if (!available.length) break;
        const pick = available[Math.floor(Math.random() * available.length)];
        pool[pick] = Math.max(0, (Number(pool[pick]) || 0) - 1);
        removed += 1;
    }
    match.chakraPools[username] = pool;
    return removed;
};

const cleanseHarmfulStatuses = (unit, count = 1) => {
    if (!unit || unit.alive === false) return 0;
    const targetState = ensureUnitStateShape(unit);
    const maxCount = Math.max(0, Number(count) || 0);
    let removed = 0;
    targetState.statuses = targetState.statuses.filter((status) => {
        if (removed >= maxCount) return true;
        const harmful = Boolean(status?.metadata?.harmful);
        if (!harmful) return true;
        removed += 1;
        return false;
    });
    return removed;
};

const getSkillByIndices = (characters, rosterIndex, skillIndex, actorState = null) =>
    resolveEffectiveSkill({ characters, rosterIndex, skillIndex, actorState });

const resolvePendingTurnSkills = ({ match, actingUsername, characters }) => {
    if (!match || !actingUsername) return;
    const pending = match.pendingTurns?.[actingUsername];
    if (!pending || !pending.queuedByActorSlot) return;

    const actorBoard = match.board?.[actingUsername] || [];
    const queueOrder = Array.isArray(pending.queueOrder) ? pending.queueOrder : [];
    const queuedActions = queueOrder
        .map((actorSlotRaw) => {
            const actorSlot = Number.parseInt(actorSlotRaw, 10);
            if (!Number.isInteger(actorSlot) || actorSlot < 0) return null;
            const queued = pending.queuedByActorSlot[String(actorSlot)];
            if (!queued) return null;
            return {
                actorSlot,
                skillIndex: queued.skillIndex,
                targetSelection: queued.targetSelection,
                classChoice: queued.classChoice,
                isAutoCast: false,
            };
        })
        .filter(Boolean);
    actorBoard.forEach((actorUnit, actorSlot) => {
        if (!actorUnit || actorUnit.alive === false) return;
        const actorState = ensureUnitStateShape(actorUnit);
        const statuses = Array.isArray(actorState.statuses) ? actorState.statuses : [];
        statuses.forEach((status) => {
            if (!status || (Number(status?.remainingTurns) || 0) <= 0) return;
            const autoCastSkillId =
                typeof status?.metadata?.autoCastSkillId === 'string'
                    ? status.metadata.autoCastSkillId.trim()
                    : '';
            if (!autoCastSkillId) return;
            const actorCharacter = Number.isInteger(actorUnit?.rosterIndex)
                ? characters?.[actorUnit.rosterIndex]
                : null;
            const skillIndex = Array.isArray(actorCharacter?.skills)
                ? actorCharacter.skills.findIndex((entry) => entry?.id === autoCastSkillId)
                : -1;
            if (skillIndex < 0) return;
            const autoCastTarget =
                typeof status?.metadata?.autoCastTarget === 'string'
                    ? status.metadata.autoCastTarget.trim().toLowerCase()
                    : 'all-enemy';
            let targetSelection = [];
            if (autoCastTarget === 'self') {
                targetSelection = [{ username: actingUsername, slot: actorSlot }];
            }
            queuedActions.push({
                actorSlot,
                skillIndex,
                targetSelection,
                isAutoCast: true,
            });
        });
    });
    const turnMarker = `${actingUsername}:${Number(match?.economy?.turnCounts?.[actingUsername]) || 0}`;

    for (let queueIndex = 0; queueIndex < queuedActions.length; queueIndex += 1) {
        const queued = queuedActions[queueIndex];
        const actorSlot = Number.parseInt(queued?.actorSlot, 10);
        if (!Number.isInteger(actorSlot) || actorSlot < 0) continue;

        const actorUnit = actorBoard[actorSlot];
        if (!actorUnit || actorUnit.alive === false) continue;

        const actorState = ensureUnitStateShape(actorUnit);
        if (getStatusMetadataTotals(actorState).cannotUseSkills) continue;

        const baseSkill = Array.isArray(characters?.[actorUnit.rosterIndex]?.skills)
            ? characters[actorUnit.rosterIndex].skills[queued.skillIndex]
            : null;
        const skill = getSkillByIndices(characters, actorUnit.rosterIndex, queued.skillIndex, actorState);
        if (!skill) continue;
        const cooldownSkillId =
            skill?.useBaseSkillCooldown && baseSkill?.id ? baseSkill.id : skill.id || baseSkill?.id || null;
        if (!queued?.isAutoCast && cooldownSkillId && getSkillCooldownRemaining(actorState, cooldownSkillId) > 0) {
            continue;
        }
        if (isSkillIndexBlockedForActor(actorState, queued.skillIndex)) continue;

        const blockedByCannotUseHarmfulSkills =
            hasStatusMetadataFlag(actorState, 'cannotUseHarmfulSkills') &&
            ['single-enemy', 'other-enemies', 'all-enemy'].includes(
                String(skill?.target || '').trim().toLowerCase()
            );
        if (blockedByCannotUseHarmfulSkills) continue;
        const blockedSkillClasses = new Set(
            (Array.isArray(actorState?.statuses) ? actorState.statuses : []).flatMap((status) => {
                const remaining = Number(status?.remainingTurns) || 0;
                if (remaining <= 0) return [];
                const blocked = status?.metadata?.cannotUseSkillClasses;
                if (!Array.isArray(blocked)) return [];
                return blocked
                    .map((entry) => (typeof entry === 'string' ? entry.trim().toLowerCase() : ''))
                    .filter(Boolean);
            })
        );
        if (
            blockedSkillClasses.size > 0 &&
            (Array.isArray(skill?.classes) ? skill.classes : []).some((entry) =>
                blockedSkillClasses.has(typeof entry === 'string' ? entry.trim().toLowerCase() : '')
            )
        ) {
            continue;
        }
        if (
            hasStatusMetadataFlag(actorState, 'cannotUseNonMentalSkills') &&
            !hasSkillClass(skill?.classes || [], 'mental')
        ) {
            continue;
        }
        const ownerUseSkillTriggeredStatusIds = new Set();
        const skillIsMental = hasSkillClass(skill?.classes || [], 'mental');
        (Array.isArray(actorState?.statuses) ? actorState.statuses : []).forEach((status) => {
            const remaining = Number(status?.remainingTurns) || 0;
            if (remaining <= 0) return;
            const ownerUseSkillClassesAny = Array.isArray(status?.metadata?.onOwnerUseSkillClassesAny)
                ? status.metadata.onOwnerUseSkillClassesAny
                      .map((entry) => normalizeSkillClassName(entry))
                      .filter(Boolean)
                : [];
            const ownerSkillMatchesClassFilter =
                ownerUseSkillClassesAny.length === 0 ||
                ownerUseSkillClassesAny.some((entry) => hasSkillClass(skill?.classes || [], entry));
            if (!ownerSkillMatchesClassFilter) return;
            const ownerUseSkillSelfDamage = Math.max(
                0,
                Number(status?.metadata?.onOwnerUseSkillSelfDamage) || 0
            );
            if (ownerUseSkillSelfDamage > 0) {
                applyDamageToUnit(actorUnit, ownerUseSkillSelfDamage, {
                    match,
                    sourceUsername: status?.sourceUsername || null,
                    targetUsername: actingUsername,
                    ignoreDamageReduction:
                        status?.metadata?.onOwnerUseSkillSelfDamageIgnoreDamageReduction === undefined
                            ? true
                            : Boolean(status?.metadata?.onOwnerUseSkillSelfDamageIgnoreDamageReduction),
                    ignoreDestructibleDefense:
                        status?.metadata?.onOwnerUseSkillSelfDamageIgnoreDestructibleDefense === undefined
                            ? true
                            : Boolean(status?.metadata?.onOwnerUseSkillSelfDamageIgnoreDestructibleDefense),
                });
                if (status?.id && Boolean(status?.metadata?.consumeOnOwnerUseSkillSelfDamage)) {
                    ownerUseSkillTriggeredStatusIds.add(status.id);
                }
            }
            const nonMentalTriggerDamage = Math.max(
                0,
                Number(status?.metadata?.onOwnerUseNonMentalSkillSelfDamage) || 0
            );
            if (nonMentalTriggerDamage > 0 && !skillIsMental) {
                applyDamageToUnit(actorUnit, nonMentalTriggerDamage, {
                    match,
                    sourceUsername: status?.sourceUsername || null,
                    targetUsername: actingUsername,
                    ignoreDamageReduction:
                        status?.metadata?.onOwnerUseNonMentalSkillSelfDamageIgnoreDamageReduction === undefined
                            ? true
                            : Boolean(
                                  status?.metadata?.onOwnerUseNonMentalSkillSelfDamageIgnoreDamageReduction
                              ),
                    ignoreDestructibleDefense:
                        status?.metadata?.onOwnerUseNonMentalSkillSelfDamageIgnoreDestructibleDefense === undefined
                            ? true
                            : Boolean(
                                  status?.metadata?.onOwnerUseNonMentalSkillSelfDamageIgnoreDestructibleDefense
                              ),
                });
                if (status?.id) ownerUseSkillTriggeredStatusIds.add(status.id);
            }
            if (!Boolean(status?.metadata?.onOwnerUseSkillTrigger)) return;
            const sourceUnit =
                status?.sourceUsername && Number.isInteger(status?.sourceSlot)
                    ? match.board?.[status.sourceUsername]?.[Number(status.sourceSlot)] || null
                    : null;
            if (!sourceUnit || sourceUnit.alive === false) return;
            const healAmount = Math.max(0, Number(status?.metadata?.onOwnerUseSkillHealSourceAmount) || 0);
            if (healAmount > 0) {
                applyHealToUnit(sourceUnit, healAmount);
            }
            const applyStatusToOwner = status?.metadata?.onOwnerUseSkillApplyStatusToOwner;
            if (applyStatusToOwner?.statusId) {
                applyStatus({
                    targetState: actorState,
                    statusId: applyStatusToOwner.statusId,
                    duration: applyStatusToOwner.duration,
                    sourceSkillId: status?.sourceSkillId || null,
                    sourceUsername: status?.sourceUsername || null,
                    sourceSlot: Number.isInteger(status?.sourceSlot) ? status.sourceSlot : null,
                    metadata: applyStatusToOwner.metadata || {},
                    fresh: false,
                });
            }
            if (status?.id && !Boolean(status?.metadata?.persistOnOwnerUseSkillTrigger)) {
                ownerUseSkillTriggeredStatusIds.add(status.id);
            }
        });
        if (ownerUseSkillTriggeredStatusIds.size > 0) {
            actorState.statuses = (Array.isArray(actorState.statuses) ? actorState.statuses : []).filter(
                (status) => !ownerUseSkillTriggeredStatusIds.has(status?.id)
            );
        }

        const effects = Array.isArray(skill.effects) ? skill.effects : [];
        if (!effects.length) continue;
        if (!doesActorSatisfySkillCondition(actorUnit, actorState, skill)) continue;
        const skillCannotBeCountered = Boolean(skill?.cannotBeCountered);
        const actingCharacterId =
            (typeof characters?.[actorUnit?.rosterIndex]?.id === 'string' &&
                characters[actorUnit.rosterIndex].id) ||
            (typeof characters?.[actorUnit?.rosterIndex]?.characterId === 'string' &&
                characters[actorUnit.rosterIndex].characterId) ||
            null;
        const castStartStatuses = (Array.isArray(actorState.statuses) ? actorState.statuses : [])
            .filter((status) => (status?.remainingTurns || 0) > 0)
            .map((status) => ({
                id: status?.id,
                remainingTurns: status?.remainingTurns,
                metadata: status?.metadata && typeof status.metadata === 'object' ? { ...status.metadata } : {},
            }));
        const castStartStatusIds = new Set(
            castStartStatuses.filter((status) => status?.id).map((status) => status.id)
        );

        const selection = normalizeTargetSelection(queued.targetSelection);
        const bypassEnemyInvulnerability =
            canActorIgnoreEnemyInvulnerability(actorUnit) || Boolean(skill?.ignoreInvulnerability);
        const opponentEntry = (match.players || []).find((p) => p.username !== actingUsername);
        const opponentUsername = opponentEntry?.username;
        const actorAllies = (match.board?.[actingUsername] || [])
            .map((unit, slot) => ({ username: actingUsername, slot, unit }))
            .filter((entry) => entry.unit && entry.unit.alive !== false);
        const opponentUnits = (match.board?.[opponentUsername] || [])
            .map((unit, slot) => ({ username: opponentUsername, slot, unit }))
            .filter((entry) => {
                if (!entry.unit || entry.unit.alive === false) return false;
                if (
                    !canActorTargetUnit({
                        actorState,
                        targetUsername: entry.username,
                        targetSlot: entry.slot,
                    })
                ) {
                    return false;
                }
                if (!doesUnitSatisfySkillTargetCondition(entry.unit, skill)) return false;
                return (
                    bypassEnemyInvulnerability ||
                    canActorIgnoreTargetInvulnerabilityBySourceMark({
                        actorCharacterId: actingCharacterId,
                        targetUnit: entry.unit,
                    }) ||
                    !isUnitInvulnerableForSkill(entry.unit, skill.classes || [])
                );
            });
        const allAliveUnits = [...actorAllies, ...opponentUnits];
        const actorHasHarmfulBlind = hasStatusMetadataFlag(actorState, 'harmfulBlind');
        const actorHasHelpfulBlind = hasStatusMetadataFlag(actorState, 'helpfulBlind');
        const shouldRetargetToRandomEnemy = actorHasHarmfulBlind && skillHasHarmfulEffects(skill);
        const shouldRetargetToRandomAlly = actorHasHelpfulBlind && !skillHasHarmfulEffects(skill);
        const selectedTargets = selection
            .map((target) => {
                let entry = {
                    username: target.username,
                    slot: target.slot,
                    unit: match.board?.[target.username]?.[target.slot] || null,
                };
                if (!entry.unit || entry.unit.alive === false) return null;

                const targetState = ensureUnitStateShape(entry.unit);
                if (hasStatusMetadataFlag(targetState, 'fullBlind')) {
                    const blindPick = pickRandomEntry(allAliveUnits);
                    if (blindPick?.unit && blindPick.unit.alive !== false) {
                        entry = blindPick;
                    }
                }

                if (shouldRetargetToRandomEnemy) {
                    const harmfulPick = pickRandomEntry(opponentUnits);
                    if (harmfulPick?.unit && harmfulPick.unit.alive !== false) {
                        entry = harmfulPick;
                    }
                } else if (shouldRetargetToRandomAlly) {
                    const helpfulPool = actorAllies.filter((ally) => ally?.unit && ally.unit.alive !== false);
                    const helpfulPick = pickRandomEntry(helpfulPool);
                    if (helpfulPick?.unit && helpfulPick.unit.alive !== false) {
                        entry = helpfulPick;
                    }
                }

                return entry;
            })
            .filter((entry) => {
                if (!entry?.unit || entry.unit.alive === false) return false;
                const isEnemyTarget = entry.username !== actingUsername;
                if (!isEnemyTarget) return true;
                if (
                    !canActorTargetUnit({
                        actorState,
                        targetUsername: entry.username,
                        targetSlot: entry.slot,
                    })
                ) {
                    return false;
                }
                if (!doesUnitSatisfySkillTargetCondition(entry.unit, skill)) return false;
                return (
                    bypassEnemyInvulnerability ||
                    canActorIgnoreTargetInvulnerabilityBySourceMark({
                        actorCharacterId: actingCharacterId,
                        targetUnit: entry.unit,
                    }) ||
                    !isUnitInvulnerableForSkill(entry.unit, skill.classes || [])
                );
            });
        const skillIsHarmful = skillHasHarmfulEffects(skill);
        const personalReflectStatus = (Array.isArray(actorState.statuses) ? actorState.statuses : []).find(
            (status) => {
                const remaining = Number(status?.remainingTurns) || 0;
                if (remaining <= 0) return false;
                if (!Boolean(status?.metadata?.reflectNextIncomingSkill)) return false;
                return skillMatchesReflectRule({
                    statusMetadata: status?.metadata || {},
                    skillClasses: skill.classes || [],
                    skillIsHarmful,
                });
            }
        );
        const canReflectByPersonalStatus = Boolean(personalReflectStatus);
        const enemyTargetUsernames = new Set(
            selectedTargets
                .filter((entry) => entry?.username && entry.username !== actingUsername)
                .map((entry) => entry.username)
        );
        let mentalGuardReflectHolder = null;
        if (skillIsHarmful && enemyTargetUsernames.size > 0) {
            for (const username of enemyTargetUsernames) {
                const team = Array.isArray(match.board?.[username]) ? match.board[username] : [];
                for (let slot = 0; slot < team.length; slot += 1) {
                    const unit = team[slot];
                    if (!unit || unit.alive === false) continue;
                    const state = ensureUnitStateShape(unit);
                    const reflectStatus = (Array.isArray(state.statuses) ? state.statuses : []).find((status) => {
                        const remaining = Number(status?.remainingTurns) || 0;
                        if (remaining <= 0) return false;
                        if (!Boolean(status?.metadata?.teamReflectNextIncomingSkill)) return false;
                        return skillMatchesReflectRule({
                            statusMetadata: status?.metadata || {},
                            skillClasses: skill.classes || [],
                            skillIsHarmful,
                        });
                    });
                    if (!reflectStatus) continue;
                    mentalGuardReflectHolder = { username, slot, unit, state, reflectStatusId: reflectStatus.id };
                    break;
                }
                if (mentalGuardReflectHolder) break;
            }
        }
        const skillCannotBeReflected = Boolean(skill?.cannotBeReflected);
        const shouldReflectTargetsByPersonalStatus = !skillCannotBeReflected && canReflectByPersonalStatus;
        const shouldReflectTargetsByMentalGuard = !skillCannotBeReflected && Boolean(mentalGuardReflectHolder);
        if (shouldReflectTargetsByPersonalStatus && personalReflectStatus?.id) {
            consumeStatus(actorState, personalReflectStatus.id);
        }
        if (
            shouldReflectTargetsByMentalGuard &&
            mentalGuardReflectHolder?.state &&
            mentalGuardReflectHolder?.reflectStatusId
        ) {
            consumeStatus(mentalGuardReflectHolder.state, mentalGuardReflectHolder.reflectStatusId);
        }
        const randomScopeGroupPicks = new Map();
        const reflectedRecipientByOriginalKey = new Map();
        const reflectRecipients = (recipients = []) =>
            (Array.isArray(recipients) ? recipients : []).map((recipient) => {
                if (!recipient?.unit || recipient.unit.alive === false) return recipient;
                if (recipient.username === actingUsername) return recipient;
                if (shouldReflectTargetsByMentalGuard) {
                    return { username: actingUsername, slot: actorSlot, unit: actorUnit };
                }
                if (!shouldReflectTargetsByPersonalStatus) return recipient;
                const personalReflectMetadata = personalReflectStatus?.metadata || {};
                if (Boolean(personalReflectMetadata?.reflectBackToCaster)) {
                    return { username: actingUsername, slot: actorSlot, unit: actorUnit };
                }
                const reflectToRandomCasterAlly =
                    Boolean(personalReflectMetadata?.reflectToRandomCasterAlly) ||
                    Boolean(personalReflectMetadata?.reflectToRandomEnemyTarget);
                if (!reflectToRandomCasterAlly) {
                    return recipient;
                }
                const originalKey = `${recipient.username}:${recipient.slot}`;
                const existingRedirect = reflectedRecipientByOriginalKey.get(originalKey);
                if (existingRedirect?.unit && existingRedirect.unit.alive !== false) {
                    return existingRedirect;
                }
                const alternatives = actorAllies.filter(
                    (entry) =>
                        entry?.unit &&
                        entry.unit.alive !== false &&
                        Number(entry.slot) !== Number(actorSlot)
                );
                if (alternatives.length > 0) {
                    const redirect = alternatives[Math.floor(Math.random() * alternatives.length)];
                    reflectedRecipientByOriginalKey.set(originalKey, redirect);
                    return redirect;
                }
                const fallback = { username: actingUsername, slot: actorSlot, unit: actorUnit };
                reflectedRecipientByOriginalKey.set(originalKey, fallback);
                return fallback;
            });
        const resolveRecipients = (effect) => {
            const scope = effect?.scope;
            if (scope === 'self') {
                return filterHelpfulImmuneRecipients({
                    effect,
                    recipients: [{ username: actingUsername, slot: actorSlot, unit: actorUnit }],
                    actingUsername,
                });
            }
            if (scope === 'all-units') {
                return filterHelpfulImmuneRecipients({
                    effect,
                    recipients: [...actorAllies, ...opponentUnits],
                    actingUsername,
                });
            }
            if (scope === 'all-allies') {
                return filterHelpfulImmuneRecipients({ effect, recipients: actorAllies, actingUsername });
            }
            if (scope === 'all-enemy') {
                return filterHelpfulImmuneRecipients({
                    effect,
                    recipients: reflectRecipients(opponentUnits),
                    actingUsername,
                });
            }
            if (scope === 'random-enemy') {
                if (!opponentUnits.length) return [];
                const randomGroupKey = effect?.metadata?.randomScopeGroupKey;
                if (randomGroupKey) {
                    const savedPick = randomScopeGroupPicks.get(randomGroupKey);
                    if (savedPick?.unit && savedPick.unit.alive !== false) {
                        return filterHelpfulImmuneRecipients({
                            effect,
                            recipients: reflectRecipients([savedPick]),
                            actingUsername,
                        });
                    }
                    const groupedPick = opponentUnits[Math.floor(Math.random() * opponentUnits.length)];
                    if (groupedPick) {
                        randomScopeGroupPicks.set(randomGroupKey, groupedPick);
                        return filterHelpfulImmuneRecipients({
                            effect,
                            recipients: reflectRecipients([groupedPick]),
                            actingUsername,
                        });
                    }
                    return [];
                }
                const pick = opponentUnits[Math.floor(Math.random() * opponentUnits.length)];
                return pick
                    ? filterHelpfulImmuneRecipients({
                          effect,
                          recipients: reflectRecipients([pick]),
                          actingUsername,
                      })
                    : [];
            }
            if (scope === 'random-other-enemy') {
                const selectedKeys = new Set(
                    selectedTargets
                        .filter((entry) => entry?.username && Number.isInteger(entry?.slot))
                        .map((entry) => `${entry.username}:${entry.slot}`)
                );
                const pool = opponentUnits.filter(
                    (entry) => !selectedKeys.has(`${entry.username}:${entry.slot}`)
                );
                if (!pool.length) return [];
                const randomGroupKey = effect?.metadata?.randomScopeGroupKey;
                if (randomGroupKey) {
                    const savedPick = randomScopeGroupPicks.get(randomGroupKey);
                    if (
                        savedPick?.unit &&
                        savedPick.unit.alive !== false &&
                        !selectedKeys.has(`${savedPick.username}:${savedPick.slot}`)
                    ) {
                        return filterHelpfulImmuneRecipients({
                            effect,
                            recipients: reflectRecipients([savedPick]),
                            actingUsername,
                        });
                    }
                    const groupedPick = pool[Math.floor(Math.random() * pool.length)];
                    if (groupedPick) {
                        randomScopeGroupPicks.set(randomGroupKey, groupedPick);
                        return filterHelpfulImmuneRecipients({
                            effect,
                            recipients: reflectRecipients([groupedPick]),
                            actingUsername,
                        });
                    }
                    return [];
                }
                const pick = pool[Math.floor(Math.random() * pool.length)];
                return pick
                    ? filterHelpfulImmuneRecipients({
                          effect,
                          recipients: reflectRecipients([pick]),
                          actingUsername,
                      })
                    : [];
            }
            if (scope === 'other-enemies') {
                const selectedKeys = new Set(
                    selectedTargets
                        .filter((entry) => entry?.username && Number.isInteger(entry?.slot))
                        .map((entry) => `${entry.username}:${entry.slot}`)
                );
                return filterHelpfulImmuneRecipients({
                    effect,
                    recipients: reflectRecipients(
                        opponentUnits.filter((entry) => !selectedKeys.has(`${entry.username}:${entry.slot}`))
                    ),
                    actingUsername,
                });
            }
            return filterHelpfulImmuneRecipients({
                effect,
                recipients: reflectRecipients(selectedTargets),
                actingUsername,
            });
        };

        const pendingDamage = new Map();
        const evadedRecipients = new Set();
        const evadeDecisionByRecipient = new Map();
        let skillCancelledByEvade = false;
        const skillCannotBeEvaded =
            skillIsHarmful &&
            effects.length > 0 &&
            effects.every((effect) => !isHarmfulEffect(effect) || Boolean(effect?.metadata?.cannotBeEvaded));
        const didEvadeRecipient = (recipient) =>
            evadedRecipients.has(`${recipient?.username || ''}:${recipient?.slot ?? ''}`);
        const queueDamage = (recipient, amount, effect) => {
            if (!recipient?.unit || recipient.unit.alive === false) return;
            const numericAmount = Math.max(0, Number(amount) || 0);
            if (numericAmount <= 0) return;
            const ignoreDamageReduction = Boolean(effect?.metadata?.ignoreDamageReduction);
            const ignoreDestructibleDefense = Boolean(effect?.metadata?.ignoreDestructibleDefense);
            const key = [
                recipient.username || '',
                Number.isInteger(recipient.slot) ? recipient.slot : '',
                ignoreDamageReduction ? 1 : 0,
                ignoreDestructibleDefense ? 1 : 0,
                effect?.metadata?.onSuccessfulDamageApplyStatusToTarget?.statusId || '',
            ].join('|');
            const existing = pendingDamage.get(key);
            if (existing) {
                existing.amount += numericAmount;
                return;
            }
            pendingDamage.set(key, {
                recipient,
                amount: numericAmount,
                ignoreDamageReduction,
                ignoreDestructibleDefense,
                onSuccessfulDamageApplyStatusToTarget:
                    effect?.metadata?.onSuccessfulDamageApplyStatusToTarget || null,
            });
        };
        const shouldEvadeForRecipient = (recipient) => {
            if (!recipient?.unit || recipient.unit.alive === false) return false;
            const isEnemySkill = recipient.username !== actingUsername;
            if (!isEnemySkill) return false;
            if (hasStatusMetadataFlag(actorState, 'cannotBeEvadedSkills')) {
                return false;
            }
            const recipientKey = `${recipient.username}:${recipient.slot}`;
            if (evadeDecisionByRecipient.has(recipientKey)) {
                return Boolean(evadeDecisionByRecipient.get(recipientKey));
            }
            const targetState = ensureUnitStateShape(recipient.unit);
            if (targetState._lastEvadeTurnMarker === turnMarker) {
                evadeDecisionByRecipient.set(recipientKey, false);
                return false;
            }
            const evadeDisabledBySource = Array.isArray(targetState?.statuses)
                ? targetState.statuses.some((status) => {
                      const remaining = Number(status?.remainingTurns) || 0;
                      if (remaining <= 0) return false;
                      return (
                          status?.metadata?.cannotEvadeFromSourceCharacterId &&
                          status.metadata.cannotEvadeFromSourceCharacterId === actingCharacterId
                      );
                  })
                : false;
            if (evadeDisabledBySource) {
                evadeDecisionByRecipient.set(recipientKey, false);
                return false;
            }
            const evadeChance = getEvadeChanceAgainstSkill({
                targetState,
                skillClasses: skill.classes || [],
                isEnemySkill,
            });
            if (!rollPercentSuccess(evadeChance)) {
                evadeDecisionByRecipient.set(recipientKey, false);
                return false;
            }
            evadeDecisionByRecipient.set(recipientKey, true);
            evadedRecipients.add(`${recipient.username}:${recipient.slot}`);
            targetState._lastEvadeTurnMarker = turnMarker;
            applyOnEvadeBonuses({
                targetState,
                sourceUsername: actingUsername,
                sourceSlot: actorSlot,
                sourceSkillId: skill.id || null,
                skillClasses: skill.classes || [],
            });
            applyStatus({
                targetState: actorState,
                statusId: 'skill_evaded_notification',
                duration: 1,
                sourceSkillId: skill.id || null,
                sourceUsername: actingUsername,
                sourceSlot: actorSlot,
                metadata: {
                    tooltipText: 'This character had a skill evaded.',
                },
                fresh: true,
            });
            return true;
        };
        const shouldCancelByEvade = (recipient) => {
            if (!recipient?.unit || recipient.unit.alive === false) return false;
            if (recipient.username === actingUsername) return false;
            if (!skillIsHarmful) return false;
            if (skillCannotBeEvaded) return false;
            return didEvadeRecipient(recipient) || shouldEvadeForRecipient(recipient);
        };
        const preflightRecipientsByTargetType = (() => {
            const targetType = String(skill?.target || '').trim().toLowerCase();
            if (targetType === 'single-enemy') {
                return reflectRecipients(
                    selectedTargets.filter((entry) => entry?.username !== actingUsername)
                );
            }
            if (targetType === 'all-enemy' || targetType === 'other-enemies') {
                return reflectRecipients(opponentUnits);
            }
            return [];
        })();
        for (const recipient of preflightRecipientsByTargetType) {
            if (!recipient?.unit || recipient.unit.alive === false) continue;
            const targetState = ensureUnitStateShape(recipient.unit);
            if (
                doesTargetIgnoreSkillByClass({
                    targetState,
                    skillClasses: skill.classes || [],
                    isEnemySkill: recipient.username !== actingUsername,
                })
            ) {
                continue;
            }
            if (
                skillIsHarmful &&
                !skillCannotBeCountered &&
                maybeTriggerReactiveDefenses({
                    match,
                    turnMarker,
                    actingUsername,
                    recipient,
                    actorUnit,
                    skillClasses: skill.classes || [],
                })
            ) {
                skillCancelledByEvade = true;
                pendingDamage.clear();
                break;
            }
            if (!shouldCancelByEvade(recipient)) continue;
            skillCancelledByEvade = true;
            pendingDamage.clear();
            break;
        }

        const actorSilencedToNonDamage = hasStatusMetadataFlag(actorState, 'silenceNonDamageEffects');
        const chosenSkillClass = resolveSkillClassChoiceForCast({ skill, queued });
        effects.forEach((rawEffect) => {
            const effect = materializeEffectWithSkillClassChoice(rawEffect, chosenSkillClass);
            if (skillCancelledByEvade) return;
            const effectType = effect?.type;
            if (actorSilencedToNonDamage && effectType !== 'damage') return;
            const rollPerRecipient = Boolean(effect?.rollPerRecipient);
            const chance = Number(effect?.chance);
            if (!rollPerRecipient && Number.isFinite(chance) && chance >= 0 && chance < 100) {
                if (!rollPercentSuccess(chance)) return;
            }
            const activationChance = Number(effect?.activationChancePercent);
            if (!rollPerRecipient && Number.isFinite(activationChance) && !rollPercentSuccess(activationChance)) {
                return;
            }
            if (effectType === 'damage') {
                const recipients = resolveRecipients(effect);
                recipients.forEach((recipient) => {
                    if (skillCancelledByEvade) return;
                    if (!recipient?.unit || recipient.unit.alive === false) return;
                    if (rollPerRecipient && Number.isFinite(chance) && chance >= 0 && chance < 100) {
                        if (!rollPercentSuccess(chance)) return;
                    }
                    if (rollPerRecipient && Number.isFinite(activationChance)) {
                        if (!rollPercentSuccess(activationChance)) return;
                    }
                    const targetState = ensureUnitStateShape(recipient.unit);
                    if (
                        doesEffectTargetHelpfulRecipient({ effect, recipient, actingUsername }) &&
                        isUnitInvulnerableToHelpfulSkills(recipient.unit)
                    ) {
                        return;
                    }
                    if (
                        doesTargetIgnoreSkillByClass({
                            targetState,
                            skillClasses: skill.classes || [],
                            isEnemySkill: recipient.username !== actingUsername,
                        })
                    ) {
                        return;
                    }
                    if (!Boolean(effect?.metadata?.cannotBeEvaded) && shouldCancelByEvade(recipient)) {
                        skillCancelledByEvade = true;
                        pendingDamage.clear();
                        return;
                    }
                    if (isHarmfulEffect(effect)) {
                        if (skillCannotBeCountered) {
                            // This skill bypasses reactive counter mechanics.
                        } else {
                        const counterCancelled = maybeTriggerReactiveDefenses({
                            match,
                            turnMarker,
                            actingUsername,
                            recipient,
                            actorUnit,
                            skillClasses: skill.classes || [],
                        });
                        if (counterCancelled) {
                            skillCancelledByEvade = true;
                            pendingDamage.clear();
                            return;
                        }
                        }
                    }
                    const condition = effect?.condition;
                    if (condition) {
                        if (!doesEffectConditionMatch({ condition, actorState, targetState, actorUnit, targetUnit: recipient.unit })) return;
                        if (condition.consumeOnMatch && condition.statusId) {
                            const scope = condition.scope === 'target' ? 'target' : 'self';
                            const scopedState = scope === 'target' ? targetState : actorState;
                            consumeStatus(scopedState, condition.statusId);
                        }
                    }
                    const amount = resolveEffectDamageAmount({
                        effect,
                        actorState,
                        actorUnit,
                        targetState,
                        skillClasses: skill.classes || [],
                    });
                    const skillSpecificBonus = getSkillSpecificDamageBonus(actorState, skill.id || null);
                    const targetSourceBonus = getTargetBonusDamageFromSource({
                        targetState,
                        sourceCharacterId: actingCharacterId,
                        sourceSkillId: skill.id || null,
                    });
                    const totalAmount = Math.max(0, amount + skillSpecificBonus + targetSourceBonus);
                    queueDamage(recipient, totalAmount, effect);
                });
                return;
            }

            if (effectType === 'apply_status') {
                const statusTargets =
                    effect?.scope === 'self' && effect?.condition?.scope === 'target'
                        ? filterHelpfulImmuneRecipients({
                              effect,
                              recipients: reflectRecipients(selectedTargets),
                              actingUsername,
                          })
                        : resolveRecipients(effect);
                const recipients = statusTargets;
                recipients.forEach((recipient) => {
                    if (skillCancelledByEvade) return;
                    if (!recipient?.unit || recipient.unit.alive === false) return;
                    if (rollPerRecipient && Number.isFinite(chance) && chance >= 0 && chance < 100) {
                        if (!rollPercentSuccess(chance)) return;
                    }
                    if (rollPerRecipient && Number.isFinite(activationChance)) {
                        if (!rollPercentSuccess(activationChance)) return;
                    }
                    const targetState = ensureUnitStateShape(recipient.unit);
                    const appliesToSelf = effect?.scope === 'self';
                    const destinationState = appliesToSelf ? actorState : targetState;
                    if (
                        doesEffectTargetHelpfulRecipient({ effect, recipient, actingUsername }) &&
                        isUnitInvulnerableToHelpfulSkills(recipient.unit)
                    ) {
                        return;
                    }
                    if (
                        doesTargetIgnoreSkillByClass({
                            targetState: destinationState,
                            skillClasses: skill.classes || [],
                            isEnemySkill: appliesToSelf ? false : recipient.username !== actingUsername,
                        })
                    ) {
                        return;
                    }
                    if (
                        !appliesToSelf &&
                        !Boolean(effect?.metadata?.cannotBeEvaded) &&
                        shouldCancelByEvade(recipient)
                    ) {
                        skillCancelledByEvade = true;
                        pendingDamage.clear();
                        return;
                    }
                    if (!appliesToSelf && isHarmfulEffect(effect)) {
                        if (skillCannotBeCountered) {
                            // This skill bypasses reactive counter mechanics.
                        } else {
                        const counterCancelled = maybeTriggerReactiveDefenses({
                            match,
                            turnMarker,
                            actingUsername,
                            recipient,
                            actorUnit,
                            skillClasses: skill.classes || [],
                        });
                        if (counterCancelled) {
                            skillCancelledByEvade = true;
                            pendingDamage.clear();
                            return;
                        }
                        }
                    }
                    if (
                        effect.applyPolicy === 'if_missing_at_cast_start' &&
                        effect.scope === 'self' &&
                        castStartStatusIds.has(effect.statusId)
                    ) {
                        return;
                    }
                    const condition = effect?.condition;
                    if (condition) {
                        if (!doesEffectConditionMatch({ condition, actorState, targetState, actorUnit, targetUnit: recipient.unit })) return;
                        if (condition.consumeOnMatch && condition.statusId) {
                            const scope = condition.scope === 'target' ? 'target' : 'self';
                            const scopedState = scope === 'target' ? targetState : actorState;
                            consumeStatus(scopedState, condition.statusId);
                        }
                    }
                    let runtimeStatusId = effect.statusId;
                    let runtimeDuration = effect.duration;
                    let runtimeMetadata = effect.metadata || {};
                    if (runtimeMetadata?.repeatTargetControl && typeof runtimeMetadata.repeatTargetControl === 'object') {
                        const control = runtimeMetadata.repeatTargetControl;
                        const trackerStatusId =
                            typeof control?.trackerStatusId === 'string' && control.trackerStatusId
                                ? control.trackerStatusId
                                : 'repeat_target_tracker';
                        const trackerDuration = Math.max(1, Number(control?.trackerDuration) || 99);
                        const lockStatusId =
                            typeof control?.lockStatusId === 'string' && control.lockStatusId
                                ? control.lockStatusId
                                : 'random_skill_lock';
                        const silenceStatusId =
                            typeof control?.silenceStatusId === 'string' && control.silenceStatusId
                                ? control.silenceStatusId
                                : 'silence_non_damage';
                        const lastTargetStatus = (Array.isArray(actorState.statuses) ? actorState.statuses : []).find(
                            (status) =>
                                status?.id === trackerStatusId &&
                                (Number(status?.remainingTurns) || 0) > 0
                        );
                        const sameTargetAsLastCast =
                            lastTargetStatus?.metadata?.lastTargetUsername === recipient.username &&
                            Number(lastTargetStatus?.metadata?.lastTargetSlot) === Number(recipient.slot);
                        if (sameTargetAsLastCast) {
                            runtimeStatusId = silenceStatusId;
                            runtimeMetadata = {
                                silenceNonDamageEffects: true,
                                harmful: true,
                                tooltipText:
                                    (typeof control?.silenceTooltipText === 'string' && control.silenceTooltipText) ||
                                    'Silenced: only damage effects from this character\'s skills will work.',
                            };
                            consumeStatus(actorState, trackerStatusId);
                        } else {
                            const targetCharacter =
                                Number.isInteger(recipient?.unit?.rosterIndex) &&
                                Array.isArray(characters)
                                    ? characters[recipient.unit.rosterIndex]
                                    : null;
                            const activeIndices = getCharacterActiveSkillIndices(targetCharacter);
                            const chosenIndex = activeIndices.length
                                ? activeIndices[Math.floor(Math.random() * activeIndices.length)]
                                : null;
                            runtimeStatusId = lockStatusId;
                            const lockTooltipTemplate =
                                typeof control?.lockTooltipTextTemplate === 'string' &&
                                control.lockTooltipTextTemplate
                                    ? control.lockTooltipTextTemplate
                                    : 'Skill slot {slot} is unusable this turn.';
                            runtimeMetadata = {
                                harmful: true,
                                cannotUseSkillIndices: Number.isInteger(chosenIndex) ? [chosenIndex] : [],
                                tooltipText: Number.isInteger(chosenIndex)
                                    ? lockTooltipTemplate.replace(/\{slot\}/g, String(chosenIndex + 1))
                                    : 'A random skill is unusable this turn.',
                            };
                        }
                        if (!sameTargetAsLastCast) {
                            const trackerTooltipText =
                                typeof control?.trackerTooltipText === 'string' && control.trackerTooltipText
                                    ? control.trackerTooltipText
                                    : null;
                            applyStatus({
                                targetState: actorState,
                                statusId: trackerStatusId,
                                duration: trackerDuration,
                                sourceSkillId: skill.id || null,
                                sourceUsername: actingUsername,
                                sourceSlot: actorSlot,
                                metadata: {
                                    lastTargetUsername: recipient.username,
                                    lastTargetSlot: recipient.slot,
                                    ...(trackerTooltipText ? { tooltipText: trackerTooltipText } : {}),
                                },
                                fresh: false,
                            });
                        }
                    }
                    const extraDuration = getAdditionalIncomingStatusDuration({
                        targetState: destinationState,
                        incomingStatusId: runtimeStatusId,
                        incomingMetadata: runtimeMetadata,
                    });
                    if (extraDuration > 0) {
                        runtimeDuration = Math.max(0, Number(runtimeDuration) || 0) + extraDuration;
                    }
                    if (
                        runtimeMetadata?.cannotBecomeInvulnerable &&
                        runtimeMetadata?.turnDurationAnchor !== 'source_turn'
                    ) {
                        runtimeMetadata = {
                            ...(runtimeMetadata || {}),
                            turnDurationAnchor: 'source_turn',
                            triggerOnApply:
                                runtimeMetadata?.triggerOnApply === undefined
                                    ? false
                                    : runtimeMetadata.triggerOnApply,
                        };
                    }
                    const applyingStun =
                        runtimeStatusId === 'stunned' ||
                        Boolean(runtimeMetadata?.cannotUseSkills) ||
                        Boolean(runtimeMetadata?.cannotUseHarmfulSkills) ||
                        Boolean(runtimeMetadata?.cannotUseNonMentalSkills) ||
                        Boolean(runtimeMetadata?.useChosenSkillClassForCannotUseSkillClasses) ||
                        (Array.isArray(runtimeMetadata?.cannotUseSkillIndices) &&
                            runtimeMetadata.cannotUseSkillIndices.length > 0) ||
                        (Array.isArray(runtimeMetadata?.cannotUseSkillClasses) &&
                            runtimeMetadata.cannotUseSkillClasses.length > 0);
                    if (applyingStun && hasStatusMetadataFlag(destinationState, 'cannotBeStunned')) {
                        // Keep stun feedback visible, but strip all functional stun locks.
                        applyStatus({
                            targetState: destinationState,
                            statusId: 'stun_ignored_notification',
                            duration: Math.max(0, Number(runtimeDuration) || 0),
                            sourceSkillId: effect?.sourceSkillId || skill.id || null,
                            sourceUsername: actingUsername,
                            sourceSlot: actorSlot,
                            metadata: {
                                harmful: Boolean(runtimeMetadata?.harmful),
                                tooltipText:
                                    (typeof runtimeMetadata?.tooltipText === 'string' &&
                                        runtimeMetadata.tooltipText) ||
                                    'This character is stunned.',
                            },
                            fresh: false,
                        });
                        return;
                    }
                    if (runtimeStatusId === 'mind_body_switch_lock' || Boolean(runtimeMetadata?.taunt)) {
                        runtimeMetadata = {
                            ...(runtimeMetadata || {}),
                            cannotTargetAlliesOfUsername: actingUsername,
                            allowedTargetSlot: actorSlot,
                        };
                    }
                    const sourceSkillClassesSnapshot = (Array.isArray(skill?.classes) ? skill.classes : [])
                        .map((entry) => (typeof entry === 'string' ? entry.trim().toLowerCase() : ''))
                        .filter(Boolean);
                    if (sourceSkillClassesSnapshot.length > 0) {
                        runtimeMetadata = {
                            ...(runtimeMetadata || {}),
                            _sourceSkillClasses: sourceSkillClassesSnapshot,
                        };
                    }
                    if (runtimeMetadata?.uniqueEnemyMarkFromSource && recipient.username !== actingUsername) {
                        const enemyUnits = Array.isArray(match.board?.[recipient.username])
                            ? match.board[recipient.username]
                            : [];
                        enemyUnits.forEach((enemyUnit, enemySlot) => {
                            if (!enemyUnit || enemyUnit.alive === false) return;
                            if (enemySlot === recipient.slot) return;
                            const enemyState = ensureUnitStateShape(enemyUnit);
                            enemyState.statuses = (Array.isArray(enemyState.statuses) ? enemyState.statuses : []).filter(
                                (entry) =>
                                    !(
                                        entry?.id === runtimeStatusId &&
                                        entry?.sourceUsername === actingUsername &&
                                        Number(entry?.sourceSlot) === actorSlot
                                    )
                            );
                        });
                    }
                    applyStatus({
                        targetState: destinationState,
                        statusId: runtimeStatusId,
                        duration: runtimeDuration,
                        sourceSkillId: effect?.sourceSkillId || skill.id || null,
                        sourceUsername: actingUsername,
                        sourceSlot: actorSlot,
                        metadata: runtimeMetadata,
                        fresh:
                            recipient.username === actingUsername ||
                            Boolean(runtimeMetadata?.freezeCooldowns) ||
                            (runtimeMetadata?.turnDurationAnchor === 'source_turn' &&
                                !runtimeMetadata?.triggerOnApply),
                    });
                    if (
                        runtimeMetadata?.refreshSameStatusOnEnemyTeam &&
                        recipient.username &&
                        recipient.username !== actingUsername &&
                        runtimeStatusId
                    ) {
                        refreshStatusOnTeam({
                            match,
                            username: recipient.username,
                            statusId: runtimeStatusId,
                            duration: runtimeDuration,
                        });
                    }
                });
                return;
            }

            if (effectType === 'execute_below_hp') {
                const recipients = resolveRecipients(effect);
                const threshold = Math.max(0, Number(effect?.threshold) || 0);
                recipients.forEach((recipient) => {
                    if (skillCancelledByEvade) return;
                    if (!recipient?.unit || recipient.unit.alive === false) return;
                    const targetState = ensureUnitStateShape(recipient.unit);
                    if (
                        doesTargetIgnoreSkillByClass({
                            targetState,
                            skillClasses: skill.classes || [],
                            isEnemySkill: recipient.username !== actingUsername,
                        })
                    ) {
                        return;
                    }
                    if (!Boolean(effect?.metadata?.cannotBeEvaded) && shouldCancelByEvade(recipient)) {
                        skillCancelledByEvade = true;
                        pendingDamage.clear();
                        return;
                    }
                    const hp = Math.max(0, Number(recipient.unit.hp) || 0);
                    if (hp > threshold) return;
                    recipient.unit.hp = 0;
                    recipient.unit.alive = false;
                });
                return;
            }

            if (effectType === 'extend_status') {
                const recipients = resolveRecipients(effect);
                const targetStatusId = effect?.targetStatusId;
                const amount = Math.max(0, Number(effect?.amount) || 0);
                if (!targetStatusId || amount <= 0) return;
                const condition = effect?.condition;
                recipients.forEach((recipient) => {
                    if (!recipient?.unit || recipient.unit.alive === false) return;
                    const targetState = ensureUnitStateShape(recipient.unit);
                    if (
                        doesTargetIgnoreSkillByClass({
                            targetState,
                            skillClasses: skill.classes || [],
                            isEnemySkill: recipient.username !== actingUsername,
                        })
                    ) {
                        return;
                    }
                    if (condition?.statusId) {
                        if (!doesEffectConditionMatch({ condition, actorState, targetState, actorUnit, targetUnit: recipient.unit })) return;
                        if (condition.consumeOnMatch && condition.statusId) {
                            const scope = condition.scope === 'target' ? 'target' : 'self';
                            const scopedState = scope === 'target' ? targetState : actorState;
                            consumeStatus(scopedState, condition.statusId);
                        }
                    }
                    const status = Array.isArray(targetState.statuses)
                        ? targetState.statuses.find(
                              (entry) =>
                                  entry?.id === targetStatusId && (Number(entry?.remainingTurns) || 0) > 0
                          )
                        : null;
                    if (!status) return;
                    status.remainingTurns = (Number(status.remainingTurns) || 0) + amount;
                });
                return;
            }

            if (effectType === 'heal') {
                const recipients = resolveRecipients(effect);
                recipients.forEach((recipient) => {
                    if (!recipient?.unit || recipient.unit.alive === false) return;
                    const targetState = ensureUnitStateShape(recipient.unit);
                    if (
                        doesTargetIgnoreSkillByClass({
                            targetState,
                            skillClasses: skill.classes || [],
                            isEnemySkill: recipient.username !== actingUsername,
                        })
                    ) {
                        return;
                    }
                    applyHealToUnit(recipient.unit, effect.amount);
                });
                return;
            }

            if (effectType === 'set_hp_from_snapshot') {
                const recipients = resolveRecipients(effect);
                const snapshotKey =
                    typeof effect?.snapshotKey === 'string' ? effect.snapshotKey.trim() : '';
                if (!snapshotKey) return;
                recipients.forEach((recipient) => {
                    if (!recipient?.unit) return;
                    const targetState = ensureUnitStateShape(recipient.unit);
                    if (
                        doesTargetIgnoreSkillByClass({
                            targetState,
                            skillClasses: skill.classes || [],
                            isEnemySkill: recipient.username !== actingUsername,
                        })
                    ) {
                        return;
                    }
                    setUnitHpFromSnapshot(recipient.unit, snapshotKey);
                });
                return;
            }

            if (effectType === 'HealthLoss') {
                const recipients = resolveRecipients(effect);
                recipients.forEach((recipient) => {
                    if (!recipient?.unit || recipient.unit.alive === false) return;
                    const targetState = ensureUnitStateShape(recipient.unit);
                    if (
                        doesTargetIgnoreSkillByClass({
                            targetState,
                            skillClasses: skill.classes || [],
                            isEnemySkill: recipient.username !== actingUsername,
                        })
                    ) {
                        return;
                    }
                    applyHealthLossToUnit(recipient.unit, effect.amount);
                });
                return;
            }

            if (effectType === 'destroy_destructible_defense') {
                const recipients = resolveRecipients(effect);
                recipients.forEach((recipient) => {
                    if (!recipient?.unit || recipient.unit.alive === false) return;
                    const targetState = ensureUnitStateShape(recipient.unit);
                    if (
                        doesTargetIgnoreSkillByClass({
                            targetState,
                            skillClasses: skill.classes || [],
                            isEnemySkill: recipient.username !== actingUsername,
                        })
                    ) {
                        return;
                    }
                    destroyAllDestructibleDefenseOnUnit(recipient.unit);
                });
                return;
            }

            if (effectType === 'cleanse_harmful') {
                const recipients = resolveRecipients(effect);
                recipients.forEach((recipient) => {
                    if (!recipient?.unit || recipient.unit.alive === false) return;
                    const targetState = ensureUnitStateShape(recipient.unit);
                    if (
                        doesTargetIgnoreSkillByClass({
                            targetState,
                            skillClasses: skill.classes || [],
                            isEnemySkill: recipient.username !== actingUsername,
                        })
                    ) {
                        return;
                    }
                    cleanseHarmfulStatuses(recipient.unit, effect.count || 1);
                });
                return;
            }

            if (effectType === 'cleanse_statuses') {
                const cleanseTargets =
                    effect?.scope === 'self' && effect?.condition?.scope === 'target'
                        ? reflectRecipients(selectedTargets)
                        : resolveRecipients(effect);
                const recipients = cleanseTargets;
                const maxCountRaw = Number(effect?.count);
                const maxCount = Number.isFinite(maxCountRaw) && maxCountRaw >= 0 ? Math.floor(maxCountRaw) : 0;
                const removeAll = maxCount <= 0;
                const sourceRelation =
                    typeof effect?.sourceRelation === 'string' ? effect.sourceRelation.trim().toLowerCase() : 'any';
                const metadataAny = Array.isArray(effect?.metadataAny)
                    ? effect.metadataAny.filter((entry) => typeof entry === 'string' && entry)
                    : [];
                const sourceSkillClassesAny = Array.isArray(effect?.sourceSkillClassesAny)
                    ? effect.sourceSkillClassesAny
                          .map((entry) => (typeof entry === 'string' ? entry.trim().toLowerCase() : ''))
                          .filter(Boolean)
                    : [];

                recipients.forEach((recipient) => {
                    if (!recipient?.unit || recipient.unit.alive === false) return;
                    const appliesToSelf = effect?.scope === 'self';
                    const destinationUnit = appliesToSelf ? actorUnit : recipient.unit;
                    if (!destinationUnit || destinationUnit.alive === false) return;
                    const targetState = ensureUnitStateShape(destinationUnit);
                    const conditionTargetState = ensureUnitStateShape(recipient.unit);
                    const condition = effect?.condition;
                    if (condition) {
                        if (
                            !doesEffectConditionMatch({
                                condition,
                                actorState,
                                targetState: conditionTargetState,
                                actorUnit,
                                targetUnit: recipient.unit,
                            })
                        ) {
                            return;
                        }
                        if (condition.consumeOnMatch && condition.statusId) {
                            const scope = condition.scope === 'target' ? 'target' : 'self';
                            const scopedState = scope === 'target' ? conditionTargetState : actorState;
                            consumeStatus(scopedState, condition.statusId);
                        }
                    }
                    let removed = 0;
                    const targetUsername = appliesToSelf ? actingUsername : recipient.username || '';
                    targetState.statuses = (Array.isArray(targetState.statuses) ? targetState.statuses : []).filter(
                        (status) => {
                            if (!status || (Number(status?.remainingTurns) || 0) <= 0) return true;
                            if (!removeAll && removed >= maxCount) return true;

                            const sourceUsername = status?.sourceUsername || '';
                            const fromEnemy =
                                Boolean(sourceUsername) && Boolean(targetUsername) && sourceUsername !== targetUsername;
                            const fromAlly =
                                Boolean(sourceUsername) && Boolean(targetUsername) && sourceUsername === targetUsername;
                            if (sourceRelation === 'enemy' && !fromEnemy) return true;
                            if (sourceRelation === 'ally' && !fromAlly) return true;
                            if (Boolean(effect?.harmfulOnly) && !Boolean(status?.metadata?.harmful)) return true;
                            if (metadataAny.length > 0) {
                                const metadata = status?.metadata || {};
                                const hasAny = metadataAny.some((key) => Boolean(metadata?.[key]));
                                if (!hasAny) return true;
                            }
                            if (sourceSkillClassesAny.length > 0) {
                                const stamped = Array.isArray(status?.metadata?._sourceSkillClasses)
                                    ? status.metadata._sourceSkillClasses
                                          .map((entry) =>
                                              typeof entry === 'string' ? entry.trim().toLowerCase() : ''
                                          )
                                          .filter(Boolean)
                                    : [];
                                if (stamped.length > 0) {
                                    const stampedMatch = sourceSkillClassesAny.some((entry) => stamped.includes(entry));
                                    if (!stampedMatch) return true;
                                } else {
                                const sourceSkillId =
                                    typeof status?.sourceSkillId === 'string' ? status.sourceSkillId : '';
                                const sourceUser = typeof status?.sourceUsername === 'string' ? status.sourceUsername : '';
                                const sourceSlot = Number.isInteger(status?.sourceSlot)
                                    ? Number(status.sourceSlot)
                                    : null;
                                if (!sourceSkillId || !sourceUser || !Number.isInteger(sourceSlot)) return true;
                                const sourceUnit = match?.board?.[sourceUser]?.[sourceSlot] || null;
                                if (!sourceUnit || sourceUnit.alive === false) return true;
                                const rosterIndex = Number.isInteger(sourceUnit?.rosterIndex)
                                    ? Number(sourceUnit.rosterIndex)
                                    : null;
                                const sourceCharacter =
                                    Number.isInteger(rosterIndex) && Array.isArray(characters)
                                        ? characters[rosterIndex]
                                        : null;
                                const sourceSkill = Array.isArray(sourceCharacter?.skills)
                                    ? sourceCharacter.skills.find((entry) => entry?.id === sourceSkillId)
                                    : null;
                                const classSet = getSkillClassSet(sourceSkill?.classes || []);
                                const matchesClass = sourceSkillClassesAny.some((entry) => classSet.has(entry));
                                if (!matchesClass) return true;
                                }
                            }

                            removed += 1;
                            return false;
                        }
                    );
                });
                return;
            }

            if (effectType === 'remove_random_chakra') {
                const recipients = resolveRecipients(effect);
                const amount = Math.max(0, Number(effect?.amount) || 0);
                if (amount <= 0) return;
                recipients.forEach((recipient) => {
                    if (!recipient?.username) return;
                    const targetState = ensureUnitStateShape(recipient.unit);
                    const condition = effect?.condition;
                    if (condition) {
                        if (!doesEffectConditionMatch({ condition, actorState, targetState, actorUnit, targetUnit: recipient.unit })) return;
                        if (condition.consumeOnMatch && condition.statusId) {
                            const scope = condition.scope === 'target' ? 'target' : 'self';
                            const scopedState = scope === 'target' ? targetState : actorState;
                            consumeStatus(scopedState, condition.statusId);
                        }
                    }
                    removeRandomChakraFromMatch({
                        match,
                        username: recipient.username,
                        amount,
                    });
                });
                return;
            }

            if (effectType === 'modify_cooldowns') {
                const recipients = resolveRecipients(effect);
                const amount = Number(effect?.amount) || 0;
                if (!Number.isFinite(amount) || amount === 0) return;
                const operation =
                    typeof effect?.operation === 'string' ? effect.operation.trim().toLowerCase() : 'add';
                const includeAllCharacterSkills =
                    Boolean(effect?.includeAllCharacterSkills) ||
                    Boolean(effect?.metadata?.includeAllCharacterSkills);
                const explicitSkillIds = Array.isArray(effect?.skillIds)
                    ? effect.skillIds.filter((entry) => typeof entry === 'string' && entry)
                    : [];
                recipients.forEach((recipient) => {
                    if (skillCancelledByEvade) return;
                    if (!recipient?.unit || recipient.unit.alive === false) return;
                    if (rollPerRecipient && Number.isFinite(chance) && chance >= 0 && chance < 100) {
                        if (!rollPercentSuccess(chance)) return;
                    }
                    if (rollPerRecipient && Number.isFinite(activationChance)) {
                        if (!rollPercentSuccess(activationChance)) return;
                    }
                    const targetState = ensureUnitStateShape(recipient.unit);
                    const appliesToSelf = effect?.scope === 'self';
                    const destinationState = appliesToSelf ? actorState : targetState;
                    if (
                        doesTargetIgnoreSkillByClass({
                            targetState: destinationState,
                            skillClasses: skill.classes || [],
                            isEnemySkill: appliesToSelf ? false : recipient.username !== actingUsername,
                        })
                    ) {
                        return;
                    }
                    if (
                        !appliesToSelf &&
                        !Boolean(effect?.metadata?.cannotBeEvaded) &&
                        shouldCancelByEvade(recipient)
                    ) {
                        skillCancelledByEvade = true;
                        pendingDamage.clear();
                        return;
                    }
                    if (!appliesToSelf && isHarmfulEffect(effect)) {
                        if (skillCannotBeCountered) {
                            // This skill bypasses reactive counter mechanics.
                        } else {
                        const counterCancelled = maybeTriggerReactiveDefenses({
                            match,
                            turnMarker,
                            actingUsername,
                            recipient,
                            actorUnit,
                            skillClasses: skill.classes || [],
                        });
                        if (counterCancelled) {
                            skillCancelledByEvade = true;
                            pendingDamage.clear();
                            return;
                        }
                        }
                    }
                    const condition = effect?.condition;
                    if (condition) {
                        if (!doesEffectConditionMatch({ condition, actorState, targetState, actorUnit, targetUnit: recipient.unit })) return;
                        if (condition.consumeOnMatch && condition.statusId) {
                            const scope = condition.scope === 'target' ? 'target' : 'self';
                            const scopedState = scope === 'target' ? targetState : actorState;
                            consumeStatus(scopedState, condition.statusId);
                        }
                    }
                    const destinationUnit = appliesToSelf ? actorUnit : recipient.unit;
                    const cooldowns =
                        destinationState.cooldowns && typeof destinationState.cooldowns === 'object'
                            ? destinationState.cooldowns
                            : {};
                    const skillIds = new Set(explicitSkillIds);
                    if (!explicitSkillIds.length) {
                        Object.keys(cooldowns).forEach((skillId) => {
                            if (skillId) {
                                skillIds.add(skillId);
                            }
                        });
                        if (includeAllCharacterSkills) {
                            getCharacterCooldownSkillIds({ characters, unit: destinationUnit }).forEach((skillId) => {
                                skillIds.add(skillId);
                            });
                        }
                    }
                    skillIds.forEach((skillId) => {
                        const current = Math.max(0, Number(cooldowns[skillId]) || 0);
                        let next = current;
                        if (operation === 'set') {
                            next = Math.max(0, amount);
                        } else if (operation === 'max') {
                            next = Math.max(current, Math.max(0, amount));
                        } else if (operation === 'min') {
                            next = Math.max(0, Math.min(current, amount));
                        } else {
                            next = Math.max(0, current + amount);
                        }
                        if (next <= 0) {
                            delete cooldowns[skillId];
                        } else {
                            cooldowns[skillId] = next;
                        }
                    });
                    destinationState.cooldowns = cooldowns;
                });
                return;
            }

            if (effectType === 'gain_chakra_by_last_skill') {
                const targetState = ensureUnitStateShape(actorUnit);
                const lastSkillStatus = Array.isArray(targetState.statuses)
                    ? targetState.statuses.find(
                          (status) =>
                              status?.id === effect?.statusId &&
                              (Number(status?.remainingTurns) || 0) > 0
                      )
                    : null;
                const lastSkillId =
                    typeof lastSkillStatus?.metadata?.lastSkillId === 'string'
                        ? lastSkillStatus.metadata.lastSkillId
                        : '';
                const map = effect?.map && typeof effect.map === 'object' ? effect.map : {};
                const chakraType = typeof map[lastSkillId] === 'string' ? map[lastSkillId] : '';
                if (!chakraType) return;
                applyChakraGainToMatch({
                    match,
                    username: actingUsername,
                    chakraType,
                    amount: effect?.amount || 1,
                });
                return;
            }

            if (effectType === 'gain_chakra') {
                const amount = Math.max(0, Number(effect?.amount) || 0);
                if (amount <= 0) return;
                const rawType = typeof effect?.chakraType === 'string' ? effect.chakraType.trim().toLowerCase() : '';
                if (rawType === 'random') {
                    for (let i = 0; i < amount; i += 1) {
                        const pick = chakraTypes[Math.floor(Math.random() * chakraTypes.length)];
                        applyChakraGainToMatch({
                            match,
                            username: actingUsername,
                            chakraType: pick,
                            amount: 1,
                        });
                    }
                    return;
                }
                applyChakraGainToMatch({
                    match,
                    username: actingUsername,
                    chakraType: rawType,
                    amount,
                });
                return;
            }

            if (effectType === 'spend_all_chakra') {
                if (!match || !actingUsername) return;
                match.chakraPools = match.chakraPools || {};
                match.chakraPools[actingUsername] = createEmptyChakraCost();
                return;
            }

            if (effectType === 'drain_chakra_non_bloodline_from_target_to_self') {
                const recipients = resolveRecipients(effect);
                const maxAmount = Math.max(0, Number(effect?.amount) || 0);
                if (maxAmount <= 0) return;
                recipients.forEach((recipient) => {
                    if (!recipient?.username || recipient.username === actingUsername) return;
                    const targetState = ensureUnitStateShape(recipient.unit);
                    if (
                        doesTargetIgnoreSkillByClass({
                            targetState,
                            skillClasses: skill.classes || [],
                            isEnemySkill: recipient.username !== actingUsername,
                        })
                    ) {
                        return;
                    }
                    const condition = effect?.condition;
                    if (condition) {
                        if (!doesEffectConditionMatch({ condition, actorState, targetState, actorUnit, targetUnit: recipient.unit })) return;
                        if (condition.consumeOnMatch && condition.statusId) {
                            const scope = condition.scope === 'target' ? 'target' : 'self';
                            const scopedState = scope === 'target' ? targetState : actorState;
                            consumeStatus(scopedState, condition.statusId);
                        }
                    }
                    match.chakraPools = match.chakraPools || {};
                    const targetPool = match.chakraPools[recipient.username] || createEmptyChakraCost();
                    const sourcePool = match.chakraPools[actingUsername] || createEmptyChakraCost();
                    const nonBloodlineTypes = ['taijutsu', 'ninjutsu', 'genjutsu'].filter(
                        (type) => (Number(targetPool[type]) || 0) > 0
                    );
                    if (!nonBloodlineTypes.length) return;
                    for (let i = 0; i < maxAmount; i += 1) {
                        const available = ['taijutsu', 'ninjutsu', 'genjutsu'].filter(
                            (type) => (Number(targetPool[type]) || 0) > 0
                        );
                        if (!available.length) break;
                        const picked = available[Math.floor(Math.random() * available.length)];
                        targetPool[picked] = Math.max(0, (Number(targetPool[picked]) || 0) - 1);
                        sourcePool[picked] = (Number(sourcePool[picked]) || 0) + 1;
                    }
                    match.chakraPools[recipient.username] = targetPool;
                    match.chakraPools[actingUsername] = sourcePool;
                });
            }

            if (effectType === 'drain_chakra_specific_from_target_to_self') {
                const recipients = resolveRecipients(effect);
                const maxAmount = Math.max(0, Number(effect?.amount) || 0);
                const drainType =
                    typeof effect?.chakraType === 'string' ? effect.chakraType.trim().toLowerCase() : '';
                if (maxAmount <= 0 || !chakraTypes.includes(drainType)) return;
                recipients.forEach((recipient) => {
                    if (!recipient?.username || recipient.username === actingUsername) return;
                    const targetState = ensureUnitStateShape(recipient.unit);
                    if (
                        doesTargetIgnoreSkillByClass({
                            targetState,
                            skillClasses: skill.classes || [],
                            isEnemySkill: recipient.username !== actingUsername,
                        })
                    ) {
                        return;
                    }
                    const condition = effect?.condition;
                    if (condition) {
                        if (!doesEffectConditionMatch({ condition, actorState, targetState, actorUnit, targetUnit: recipient.unit })) return;
                        if (condition.consumeOnMatch && condition.statusId) {
                            const scope = condition.scope === 'target' ? 'target' : 'self';
                            const scopedState = scope === 'target' ? targetState : actorState;
                            consumeStatus(scopedState, condition.statusId);
                        }
                    }
                    match.chakraPools = match.chakraPools || {};
                    const targetPool = match.chakraPools[recipient.username] || createEmptyChakraCost();
                    const sourcePool = match.chakraPools[actingUsername] || createEmptyChakraCost();
                    const available = Math.max(0, Number(targetPool[drainType]) || 0);
                    if (available <= 0) return;
                    const drainAmount = Math.min(maxAmount, available);
                    targetPool[drainType] = available - drainAmount;
                    sourcePool[drainType] = (Number(sourcePool[drainType]) || 0) + drainAmount;
                    match.chakraPools[recipient.username] = targetPool;
                    match.chakraPools[actingUsername] = sourcePool;
                });
            }
        });

        const unpierceableBudgetByRecipient = new Map();
        const standardMitigationBudgetByRecipient = new Map();
        const percentMitigationStateByRecipient = new Map();
        pendingDamage.forEach((entry) => {
            if (!entry?.recipient?.unit || entry.recipient.unit.alive === false) return;
            const mitigationBudgetKey = `${entry.recipient.username || ''}:${
                Number.isInteger(entry.recipient.slot) ? entry.recipient.slot : ''
            }`;
            const dealt = applyDamageToUnit(entry.recipient.unit, entry.amount, {
                match,
                sourceUsername: actingUsername,
                targetUsername: entry.recipient.username,
                skillClasses: skill.classes || [],
                ignoreDamageReduction: entry.ignoreDamageReduction,
                ignoreDestructibleDefense: entry.ignoreDestructibleDefense,
                unpierceableBudgetMap: unpierceableBudgetByRecipient,
                unpierceableBudgetKey: mitigationBudgetKey,
                standardMitigationBudgetMap: standardMitigationBudgetByRecipient,
                standardMitigationBudgetKey: mitigationBudgetKey,
                percentMitigationStateMap: percentMitigationStateByRecipient,
                percentMitigationStateKey: mitigationBudgetKey,
            });
            const onSuccess = entry?.onSuccessfulDamageApplyStatusToTarget;
            if (dealt > 0 && onSuccess?.statusId) {
                applyStatus({
                    targetState: ensureUnitStateShape(entry.recipient.unit),
                    statusId: onSuccess.statusId,
                    duration: onSuccess.duration,
                    sourceSkillId: skill.id || null,
                    sourceUsername: actingUsername,
                    sourceSlot: actorSlot,
                    metadata: onSuccess.metadata || {},
                    fresh: false,
                });
            }
        });

        const cooldownTurns = Math.max(0, Number(skill.cooldown) || 0);
        if (cooldownSkillId && cooldownTurns > 0) {
            actorState.cooldowns[cooldownSkillId] = Math.max(
                getSkillCooldownRemaining(actorState, cooldownSkillId),
                cooldownTurns + 1
            );
            actorState._cooldownsStartedThisTurn = actorState._cooldownsStartedThisTurn || {};
            actorState._cooldownsStartedThisTurn[cooldownSkillId] = true;
        }
        const usedSkillPenalty = getTeamStatusMetadataMax({
            match,
            username: opponentUsername,
            metadataKey: 'usedSkillCooldownPenalty',
        });
        if (usedSkillPenalty > 0 && cooldownSkillId) {
            actorState.cooldowns = actorState.cooldowns || {};
            actorState.cooldowns[cooldownSkillId] =
                Math.max(0, Number(actorState.cooldowns[cooldownSkillId]) || 0) + usedSkillPenalty;
            actorState._cooldownsStartedThisTurn = actorState._cooldownsStartedThisTurn || {};
            actorState._cooldownsStartedThisTurn[cooldownSkillId] = true;
        }
        const harmfulSkillPenalty = getTeamStatusMetadataMax({
            match,
            username: opponentUsername,
            metadataKey: 'harmfulSkillCooldownPenalty',
        });
        if (harmfulSkillPenalty > 0 && skillHasHarmfulEffects(skill)) {
            const cooldowns = actorState.cooldowns || {};
            Object.keys(cooldowns).forEach((skillId) => {
                cooldowns[skillId] = Math.max(0, Number(cooldowns[skillId]) || 0) + harmfulSkillPenalty;
            });
            actorState.cooldowns = cooldowns;
        }
        if (cooldownSkillId) {
            const nextSkillCooldownAdjustment = getCastStartNextUsedSkillCooldownAdjustment(castStartStatuses);
            if (nextSkillCooldownAdjustment.amount !== 0) {
                actorState.cooldowns = actorState.cooldowns || {};
                const adjustedCooldown = Math.max(
                    0,
                    (Number(actorState.cooldowns[cooldownSkillId]) || 0) + nextSkillCooldownAdjustment.amount
                );
                if (adjustedCooldown <= 0) {
                    delete actorState.cooldowns[cooldownSkillId];
                } else {
                    actorState.cooldowns[cooldownSkillId] = adjustedCooldown;
                }
                nextSkillCooldownAdjustment.statusIdsToConsume.forEach((statusId) => {
                    consumeStatus(actorState, statusId);
                });
            }
        }
        const actorCharacter = Number.isInteger(actorUnit?.rosterIndex)
            ? characters?.[actorUnit.rosterIndex]
            : null;
        const activeStatuses = Array.isArray(actorState.statuses) ? actorState.statuses : [];
        activeStatuses.forEach((status) => {
            if (!status || (Number(status?.remainingTurns) || 0) <= 0) return;
            const metadata = status?.metadata || {};
            const autoCastSkillId =
                typeof metadata?.autoCastSkillId === 'string' ? metadata.autoCastSkillId.trim() : '';
            if (!autoCastSkillId) return;
            if (!Boolean(metadata?.autoCastOnApply)) return;
            if (metadata?._autoCastOnApplyTriggeredTurnMarker === turnMarker) return;
            const autoSkillIndex = Array.isArray(actorCharacter?.skills)
                ? actorCharacter.skills.findIndex((entry) => entry?.id === autoCastSkillId)
                : -1;
            if (autoSkillIndex < 0) return;
            metadata._autoCastOnApplyTriggeredTurnMarker = turnMarker;
            status.metadata = metadata;
            const autoCastTarget =
                typeof metadata?.autoCastTarget === 'string'
                    ? metadata.autoCastTarget.trim().toLowerCase()
                    : 'all-enemy';
            let targetSelection = [];
            if (autoCastTarget === 'self') {
                targetSelection = [{ username: actingUsername, slot: actorSlot }];
            }
            queuedActions.push({
                actorSlot,
                skillIndex: autoSkillIndex,
                targetSelection,
                isAutoCast: true,
            });
        });
    }

    (match.players || []).forEach((player) => {
        const units = match.board?.[player.username] || [];
        player.aliveCount = units.reduce((sum, unit) => sum + (unit?.alive === false ? 0 : 1), 0);
    });
};

const tickStatusesForTurnEnd = ({ match, endingUsername }) => {
    if (!match || !endingUsername) return;
    const players = Array.isArray(match.players) ? match.players : [];
    const turnEndUnpierceableBudgetByRecipient = new Map();
    const turnEndStandardMitigationBudgetByRecipient = new Map();
    const turnEndPercentMitigationStateByRecipient = new Map();
    const triggerSuperMultiSizeBurst = ({ status, actorState, sourceUsername, sourceSlot }) => {
        const burstStatusId =
            typeof status?.metadata?.superMultiSizeBurstStatusId === 'string'
                ? status.metadata.superMultiSizeBurstStatusId
                : '';
        if (!burstStatusId) return;
        const stunDuration = Math.max(0, Number(status?.metadata?.superMultiSizeBurstStunDuration) || 1);
        const defenseStatus = (Array.isArray(actorState?.statuses) ? actorState.statuses : []).find(
            (entry) => entry?.id === burstStatusId && (Number(entry?.remainingTurns) || 0) > 0
        );
        const burstDamage = Math.max(0, Number(defenseStatus?.metadata?.destructibleDefensePoints) || 0);
        if (burstDamage <= 0) return;

        const opponent = players.find((p) => p?.username && p.username !== sourceUsername);
        const opponentUsername = opponent?.username;
        const enemyUnits = Array.isArray(match.board?.[opponentUsername]) ? match.board[opponentUsername] : [];
        enemyUnits.forEach((enemyUnit, enemySlot) => {
            if (!enemyUnit || enemyUnit.alive === false) return;
            const mitigationBudgetKey = `${opponentUsername || ''}:${
                Number.isInteger(enemySlot) ? enemySlot : ''
            }`;
            applyDamageToUnit(enemyUnit, burstDamage, {
                match,
                sourceUsername,
                targetUsername: opponentUsername,
                unpierceableBudgetMap: turnEndUnpierceableBudgetByRecipient,
                unpierceableBudgetKey: mitigationBudgetKey,
                standardMitigationBudgetMap: turnEndStandardMitigationBudgetByRecipient,
                standardMitigationBudgetKey: mitigationBudgetKey,
                percentMitigationStateMap: turnEndPercentMitigationStateByRecipient,
                percentMitigationStateKey: mitigationBudgetKey,
            });
            applyStatus({
                targetState: ensureUnitStateShape(enemyUnit),
                statusId: 'stunned',
                duration: stunDuration,
                sourceSkillId: status?.sourceSkillId || null,
                sourceUsername: sourceUsername || null,
                sourceSlot: Number.isInteger(sourceSlot) ? sourceSlot : null,
                metadata: {
                    harmful: true,
                    cannotUseSkills: true,
                    tooltipText: 'This character is stunned.',
                },
                fresh: false,
            });
        });
    };
    players.forEach((player) => {
        const username = player?.username;
        if (!username) return;
        const units = match.board?.[username] || [];
    units.forEach((unit, unitSlot) => {
        const actorState = ensureUnitStateShape(unit);
        const endedByControl = new Set();
        const pendingExpireStatuses = [];
        actorState.statuses.forEach((status) => {
                if (!status || (status.remainingTurns || 0) <= 0) return;
                if (status.fresh && !Boolean(status?.metadata?.triggerOnApply)) return;
                const ongoingClass =
                    typeof status?.metadata?.ongoingClass === 'string'
                        ? status.metadata.ongoingClass.trim().toLowerCase()
                        : '';
                const sourceUnit =
                    status?.sourceUsername && Number.isInteger(status?.sourceSlot)
                        ? match.board?.[status.sourceUsername]?.[Number(status.sourceSlot)] || null
                        : null;
                const sourceState = sourceUnit ? ensureUnitStateShape(sourceUnit) : null;
                const sourceStunned = sourceState
                    ? Boolean(getStatusMetadataTotals(sourceState).cannotUseSkills)
                    : false;
                const sourceDamageBonusFlat = sourceState
                    ? Number(getStatusMetadataTotals(sourceState).damageBonusFlat) || 0
                    : 0;
                const sourceDamageDebuffFlat = sourceState
                    ? Number(getStatusMetadataTotals(sourceState).damageDebuffFlat) || 0
                    : 0;
                const sourceNonAfflictionDamageBonusFlat = sourceState
                    ? Number(getStatusMetadataTotals(sourceState).nonAfflictionDamageBonusFlat) || 0
                    : 0;
                const sourceNonAfflictionDamageDebuffFlat = sourceState
                    ? Number(getStatusMetadataTotals(sourceState).nonAfflictionDamageDebuffFlat) || 0
                    : 0;
                const targetInvulnerable = isUnitInvulnerable(unit);
                if (ongoingClass === 'control' && (sourceStunned || targetInvulnerable)) {
                    if (status?.id) {
                        endedByControl.add(status.id);
                    }
                    return;
                }
                const triggerAnchor =
                    status?.metadata?.turnEndTrigger === 'source_turn' ? 'source_turn' : 'owner_turn';
                const shouldTrigger =
                    triggerAnchor === 'source_turn'
                        ? status?.sourceUsername === endingUsername
                        : username === endingUsername;
                if (!shouldTrigger) return;
                const turnEndApplyStatusToSelf = status?.metadata?.turnEndApplyStatusToSelf;
                if (turnEndApplyStatusToSelf && typeof turnEndApplyStatusToSelf === 'object') {
                    applyStatus({
                        targetState: actorState,
                        statusId: turnEndApplyStatusToSelf.statusId,
                        duration: turnEndApplyStatusToSelf.duration,
                        sourceSkillId: status?.sourceSkillId || null,
                        sourceUsername: status?.sourceUsername || null,
                        sourceSlot: Number.isInteger(status?.sourceSlot) ? status.sourceSlot : null,
                        metadata: turnEndApplyStatusToSelf.metadata || {},
                        fresh: Boolean(turnEndApplyStatusToSelf.fresh),
                    });
                }
                const turnEndApplyStatusToEnemies = Array.isArray(status?.metadata?.turnEndApplyStatusToEnemies)
                    ? status.metadata.turnEndApplyStatusToEnemies
                    : [];
                if (turnEndApplyStatusToEnemies.length > 0) {
                    const opponent = players.find((p) => p?.username && p.username !== username);
                    const opponentUsername = opponent?.username;
                    const enemyUnits = Array.isArray(match.board?.[opponentUsername])
                        ? match.board[opponentUsername]
                        : [];
                    enemyUnits.forEach((enemyUnit, enemySlot) => {
                        if (!enemyUnit || enemyUnit.alive === false) return;
                        const enemyState = ensureUnitStateShape(enemyUnit);
                        turnEndApplyStatusToEnemies.forEach((entry) => {
                            if (!entry || !entry.statusId) return;
                            applyStatus({
                                targetState: enemyState,
                                statusId: entry.statusId,
                                duration: entry.duration,
                                sourceSkillId: status?.sourceSkillId || null,
                                sourceUsername: status?.sourceUsername || null,
                                sourceSlot: Number.isInteger(status?.sourceSlot) ? status.sourceSlot : null,
                                metadata: entry.metadata || {},
                                fresh: Boolean(entry.fresh),
                            });
                        });
                    });
                }
                const turnEndApplyStatusToRandomEnemy = status?.metadata?.turnEndApplyStatusToRandomEnemy;
                if (
                    turnEndApplyStatusToRandomEnemy?.statusId
                ) {
                    const opponent = players.find((p) => p?.username && p.username !== username);
                    const opponentUsername = opponent?.username;
                    const enemyUnits = Array.isArray(match.board?.[opponentUsername])
                        ? match.board[opponentUsername]
                        : [];
                    let aliveEnemyEntries = enemyUnits
                        .map((enemyUnit, enemySlot) => ({ enemyUnit, enemySlot }))
                        .filter((entry) => entry?.enemyUnit && entry.enemyUnit.alive !== false);
                    if (aliveEnemyEntries.length > 0) {
                        if (Boolean(turnEndApplyStatusToRandomEnemy.mustChangeTarget)) {
                            const lastKey =
                                typeof status?.metadata?._lastRandomStatusEnemyKey === 'string'
                                    ? status.metadata._lastRandomStatusEnemyKey
                                    : '';
                            if (lastKey && aliveEnemyEntries.length > 1) {
                                const filtered = aliveEnemyEntries.filter(
                                    (entry) => `${opponentUsername}:${entry.enemySlot}` !== lastKey
                                );
                                if (filtered.length > 0) {
                                    aliveEnemyEntries = filtered;
                                }
                            }
                        }
                        const picked = pickRandomEntry(aliveEnemyEntries);
                        if (picked?.enemyUnit) {
                            if (status?.metadata && typeof status.metadata === 'object') {
                                status.metadata._lastRandomStatusEnemyKey =
                                    `${opponentUsername}:${picked.enemySlot}`;
                            }
                            applyStatus({
                                targetState: ensureUnitStateShape(picked.enemyUnit),
                                statusId: turnEndApplyStatusToRandomEnemy.statusId,
                                duration: turnEndApplyStatusToRandomEnemy.duration,
                                sourceSkillId: status?.sourceSkillId || null,
                                sourceUsername: status?.sourceUsername || null,
                                sourceSlot: Number.isInteger(status?.sourceSlot) ? status.sourceSlot : null,
                                metadata: turnEndApplyStatusToRandomEnemy.metadata || {},
                                fresh: Boolean(turnEndApplyStatusToRandomEnemy.fresh),
                            });
                        }
                    }
                }
                if (ongoingClass === 'action' && (sourceStunned || targetInvulnerable)) return;
                let turnEndDamage = Math.max(0, Number(status?.metadata?.turnEndDamage) || 0);
                const turnEndIsAffliction = Boolean(status?.metadata?.afflictionDamage);
                const ignoreSourceNonAfflictionDamageBonus = Boolean(
                    status?.metadata?.ignoreSourceNonAfflictionDamageBonus
                );
                turnEndDamage = Math.max(
                    0,
                    turnEndDamage +
                        sourceDamageBonusFlat -
                        sourceDamageDebuffFlat +
                        (turnEndIsAffliction || ignoreSourceNonAfflictionDamageBonus
                            ? 0
                            : sourceNonAfflictionDamageBonusFlat - sourceNonAfflictionDamageDebuffFlat)
                );
                if (turnEndDamage > 0) {
                    const affliction = turnEndIsAffliction;
                    const mitigationBudgetKey = `${username || ''}:${Number.isInteger(unitSlot) ? unitSlot : ''}`;
                    const dealt = applyDamageToUnit(unit, turnEndDamage, {
                        match,
                        sourceUsername: status?.sourceUsername || null,
                        targetUsername: username,
                        ignoreDamageReduction:
                            affliction || Boolean(status?.metadata?.ignoreTargetDamageReduction),
                        ignoreDestructibleDefense:
                            affliction || Boolean(status?.metadata?.ignoreTargetDestructibleDefense),
                        unpierceableBudgetMap: turnEndUnpierceableBudgetByRecipient,
                        unpierceableBudgetKey: mitigationBudgetKey,
                        standardMitigationBudgetMap: turnEndStandardMitigationBudgetByRecipient,
                        standardMitigationBudgetKey: mitigationBudgetKey,
                        percentMitigationStateMap: turnEndPercentMitigationStateByRecipient,
                        percentMitigationStateKey: mitigationBudgetKey,
                    });
                    const onSuccessTurnEndApplyStatusToSelf =
                        status?.metadata?.onSuccessfulTurnEndDamageApplyStatusToSelf;
                    if (dealt > 0 && onSuccessTurnEndApplyStatusToSelf?.statusId) {
                        applyStatus({
                            targetState: actorState,
                            statusId: onSuccessTurnEndApplyStatusToSelf.statusId,
                            duration: onSuccessTurnEndApplyStatusToSelf.duration,
                            sourceSkillId: status?.sourceSkillId || null,
                            sourceUsername: status?.sourceUsername || null,
                            sourceSlot: Number.isInteger(status?.sourceSlot) ? status.sourceSlot : null,
                            metadata: onSuccessTurnEndApplyStatusToSelf.metadata || {},
                            fresh: false,
                        });
                    }
                }

                const turnEndRandomEnemyDamage = Math.max(
                    0,
                    Number(status?.metadata?.turnEndRandomEnemyDamage) || 0
                );
                const randomEnemyIsAffliction = hasSkillClass(
                    status?.metadata?.turnEndRandomEnemySkillClasses || [],
                    'affliction'
                );
                const adjustedRandomEnemyDamage = Math.max(
                    0,
                    turnEndRandomEnemyDamage +
                        sourceDamageBonusFlat -
                        sourceDamageDebuffFlat +
                        (randomEnemyIsAffliction ||
                        Boolean(status?.metadata?.ignoreSourceNonAfflictionDamageBonus)
                            ? 0
                            : sourceNonAfflictionDamageBonusFlat - sourceNonAfflictionDamageDebuffFlat)
                );
                if (adjustedRandomEnemyDamage > 0) {
                    const opponent = players.find((p) => p?.username && p.username !== username);
                    const opponentUsername = opponent?.username;
                    const enemyUnits = Array.isArray(match.board?.[opponentUsername])
                        ? match.board[opponentUsername]
                        : [];
                    const aliveEnemyEntries = enemyUnits
                        .map((enemyUnit, enemySlot) => ({ enemyUnit, enemySlot }))
                        .filter((entry) => entry?.enemyUnit && entry.enemyUnit.alive !== false);
                    if (aliveEnemyEntries.length > 0) {
                        const preferredStatusId =
                            typeof status?.metadata?.preferEnemyWithStatusId === 'string'
                                ? status.metadata.preferEnemyWithStatusId
                                : '';
                        const preferredEntries = preferredStatusId
                            ? aliveEnemyEntries.filter((entry) =>
                                  hasStatus(ensureUnitStateShape(entry.enemyUnit), preferredStatusId)
                              )
                            : [];
                        let pool = preferredEntries.length > 0 ? preferredEntries : aliveEnemyEntries;
                        if (Boolean(status?.metadata?.turnEndRandomEnemyMustChangeTarget)) {
                            const lastKey =
                                typeof status?.metadata?._lastRandomEnemyKey === 'string'
                                    ? status.metadata._lastRandomEnemyKey
                                    : '';
                            if (lastKey && pool.length > 1) {
                                const filtered = pool.filter(
                                    (entry) => `${opponentUsername}:${entry.enemySlot}` !== lastKey
                                );
                                if (filtered.length > 0) {
                                    pool = filtered;
                                }
                            }
                        }
                        const picked = pool[Math.floor(Math.random() * pool.length)];
                        if (picked?.enemyUnit) {
                            if (status?.metadata && typeof status.metadata === 'object') {
                                status.metadata._lastRandomEnemyKey = `${opponentUsername}:${picked.enemySlot}`;
                            }
                            const mitigationBudgetKey = `${opponentUsername || ''}:${
                                Number.isInteger(picked?.enemySlot) ? picked.enemySlot : ''
                            }`;
                            applyDamageToUnit(picked.enemyUnit, adjustedRandomEnemyDamage, {
                                match,
                                sourceUsername: username,
                                targetUsername: opponentUsername,
                                skillClasses: status?.metadata?.turnEndRandomEnemySkillClasses || [],
                                ignoreDamageReduction: Boolean(status?.metadata?.turnEndRandomEnemyIgnoreDamageReduction),
                                ignoreDestructibleDefense: Boolean(
                                    status?.metadata?.turnEndRandomEnemyIgnoreDestructibleDefense
                                ),
                                unpierceableBudgetMap: turnEndUnpierceableBudgetByRecipient,
                                unpierceableBudgetKey: mitigationBudgetKey,
                                standardMitigationBudgetMap: turnEndStandardMitigationBudgetByRecipient,
                                standardMitigationBudgetKey: mitigationBudgetKey,
                                percentMitigationStateMap: turnEndPercentMitigationStateByRecipient,
                                percentMitigationStateKey: mitigationBudgetKey,
                            });
                        }
                    }
                }

                const turnEndDrainNonBloodlineToSource = Math.max(
                    0,
                    Number(status?.metadata?.turnEndDrainNonBloodlineToSource) || 0
                );
                if (
                    turnEndDrainNonBloodlineToSource > 0 &&
                    status?.sourceUsername &&
                    status.sourceUsername !== username
                ) {
                    match.chakraPools = match.chakraPools || {};
                    const ownerPool = match.chakraPools[username] || createEmptyChakraCost();
                    const sourcePool = match.chakraPools[status.sourceUsername] || createEmptyChakraCost();
                    for (let i = 0; i < turnEndDrainNonBloodlineToSource; i += 1) {
                        const available = ['taijutsu', 'ninjutsu', 'genjutsu'].filter(
                            (type) => (Number(ownerPool[type]) || 0) > 0
                        );
                        if (!available.length) break;
                        const picked = available[Math.floor(Math.random() * available.length)];
                        ownerPool[picked] = Math.max(0, (Number(ownerPool[picked]) || 0) - 1);
                        sourcePool[picked] = (Number(sourcePool[picked]) || 0) + 1;
                    }
                    match.chakraPools[username] = ownerPool;
                    match.chakraPools[status.sourceUsername] = sourcePool;
                }

                const turnEndHealPercentCurrent = Number(status?.metadata?.turnEndHealPercentCurrent) || 0;
                if (turnEndHealPercentCurrent > 0) {
                    const currentHp = Math.max(0, Number(unit?.hp) || 0);
                    const healAmount = (currentHp * turnEndHealPercentCurrent) / 100;
                    applyHealToUnit(unit, healAmount);
                }
                const turnEndHealthLoss = Math.max(0, Number(status?.metadata?.turnEndHealthLoss) || 0);
                if (turnEndHealthLoss > 0) {
                    applyHealthLossToUnit(unit, turnEndHealthLoss);
                }
                const turnEndHealthCapLoss = Math.max(
                    0,
                    Number(status?.metadata?.turnEndHealthCapLoss) || 0
                );
                if (turnEndHealthCapLoss > 0) {
                    applyHealthCapLossToUnit(unit, turnEndHealthCapLoss);
                }
                const turnEndDamageFromSourceCurrentHp = Boolean(
                    status?.metadata?.turnEndDamageFromSourceCurrentHp
                );
                if (
                    turnEndDamageFromSourceCurrentHp &&
                    status?.sourceUsername &&
                    Number.isInteger(status?.sourceSlot)
                ) {
                    const sourceUnit =
                        match.board?.[status.sourceUsername]?.[Number(status.sourceSlot)] || null;
                    const sourceCurrentHp = Math.max(0, Number(sourceUnit?.hp) || 0);
                    if (sourceCurrentHp > 0) {
                        const mitigationBudgetKey = `${username || ''}:${Number.isInteger(unitSlot) ? unitSlot : ''}`;
                        applyDamageToUnit(unit, sourceCurrentHp, {
                            match,
                            sourceUsername: status.sourceUsername,
                            targetUsername: username,
                            ignoreDamageReduction: Boolean(status?.metadata?.ignoreTargetDamageReduction),
                            ignoreDestructibleDefense: Boolean(
                                status?.metadata?.ignoreTargetDestructibleDefense
                            ),
                            unpierceableBudgetMap: turnEndUnpierceableBudgetByRecipient,
                            unpierceableBudgetKey: mitigationBudgetKey,
                            standardMitigationBudgetMap: turnEndStandardMitigationBudgetByRecipient,
                            standardMitigationBudgetKey: mitigationBudgetKey,
                            percentMitigationStateMap: turnEndPercentMitigationStateByRecipient,
                            percentMitigationStateKey: mitigationBudgetKey,
                        });
                    }
                }
                const turnEndGainChakra = status?.metadata?.turnEndGainChakra;
                if (turnEndGainChakra?.chakraType) {
                    applyChakraGainToMatch({
                        match,
                        username,
                        chakraType: turnEndGainChakra.chakraType,
                        amount: Math.max(0, Number(turnEndGainChakra.amount) || 1),
                    });
                }
                const turnEndSetHpToRaw = Number(status?.metadata?.turnEndSetHpTo);
                if (Number.isFinite(turnEndSetHpToRaw)) {
                    const nextHp = Math.max(0, turnEndSetHpToRaw);
                    unit.hp = nextHp;
                    if (unit.hp <= 0) {
                        unit.alive = false;
                    }
                }
                const defenseRestoreConfig =
                    status?.metadata?.destructibleDefenseRestore &&
                    typeof status.metadata.destructibleDefenseRestore === 'object'
                        ? status.metadata.destructibleDefenseRestore
                        : null;
                if (defenseRestoreConfig && username === endingUsername) {
                    const turnsLeft = Math.max(0, Number(status?.metadata?._destructibleDefenseRestoreTurnsLeft) || 0);
                    if (turnsLeft > 0) {
                        const currentPoints = Math.max(
                            0,
                            Number(status?.metadata?.destructibleDefensePoints) || 0
                        );
                        const nextTurnsLeft = Math.max(0, turnsLeft - 1);
                        if (currentPoints > 0) {
                            if (nextTurnsLeft <= 0) {
                                const restoreTo = Math.max(
                                    0,
                                    Number(defenseRestoreConfig?.restoreTo) || currentPoints
                                );
                                status.metadata = {
                                    ...(status.metadata || {}),
                                    destructibleDefensePoints: restoreTo,
                                    _destructibleDefenseRestoreTurnsLeft: 0,
                                };
                            } else {
                                status.metadata = {
                                    ...(status.metadata || {}),
                                    _destructibleDefenseRestoreTurnsLeft: nextTurnsLeft,
                                };
                            }
                        } else {
                            status.metadata = {
                                ...(status.metadata || {}),
                                _destructibleDefenseRestoreTurnsLeft: 0,
                            };
                        }
                    }
                }
            });
            actorState.statuses = actorState.statuses
                .map((status) => {
                    if (!status || (status.remainingTurns || 0) <= 0) return null;
                    if (status?.id && endedByControl.has(status.id)) return null;
                    const remaining = Number(status?.remainingTurns) || 0;
                    if (remaining >= 99 || Boolean(status?.metadata?.infiniteDuration)) {
                        if (status.fresh) {
                            return { ...status, fresh: false };
                        }
                        return status;
                    }
                    const durationAnchor =
                        status?.metadata?.turnDurationAnchor === 'source_turn'
                            ? 'source_turn'
                            : 'owner_turn';
                    const shouldTickDuration =
                        durationAnchor === 'source_turn'
                            ? status?.sourceUsername === endingUsername
                            : username === endingUsername;
                    if (!shouldTickDuration) {
                        return status;
                    }
                    if (status.fresh && !Boolean(status?.metadata?.triggerOnApply)) {
                        return { ...status, fresh: false };
                    }
                    if (status.fresh && Boolean(status?.metadata?.triggerOnApply)) {
                        const nextRemaining = (status.remainingTurns || 0) - 1;
                        if (nextRemaining <= 0) {
                            triggerSuperMultiSizeBurst({
                                status,
                                actorState,
                                sourceUsername: username,
                                sourceSlot: unitSlot,
                            });
                        }
                        if (
                            nextRemaining <= 0 &&
                            status?.metadata?.onExpireApplyStatusToSelf?.statusId
                        ) {
                            applyStatus({
                                targetState: { statuses: pendingExpireStatuses },
                                statusId: status.metadata.onExpireApplyStatusToSelf.statusId,
                                duration: status.metadata.onExpireApplyStatusToSelf.duration,
                                sourceSkillId: status?.sourceSkillId || null,
                                sourceUsername: status?.sourceUsername || null,
                                sourceSlot: Number.isInteger(status?.sourceSlot) ? status.sourceSlot : null,
                                metadata: status.metadata.onExpireApplyStatusToSelf.metadata || {},
                                fresh: false,
                            });
                        }
                        return {
                            ...status,
                            fresh: false,
                            remainingTurns: nextRemaining,
                        };
                    }
                    const nextRemaining = (status.remainingTurns || 0) - 1;
                    if (nextRemaining <= 0) {
                        triggerSuperMultiSizeBurst({
                            status,
                            actorState,
                            sourceUsername: username,
                            sourceSlot: unitSlot,
                        });
                    }
                    if (nextRemaining <= 0 && status?.metadata?.onExpireApplyStatusToSelf?.statusId) {
                        applyStatus({
                            targetState: { statuses: pendingExpireStatuses },
                            statusId: status.metadata.onExpireApplyStatusToSelf.statusId,
                            duration: status.metadata.onExpireApplyStatusToSelf.duration,
                            sourceSkillId: status?.sourceSkillId || null,
                            sourceUsername: status?.sourceUsername || null,
                            sourceSlot: Number.isInteger(status?.sourceSlot) ? status.sourceSlot : null,
                            metadata: status.metadata.onExpireApplyStatusToSelf.metadata || {},
                            fresh: false,
                        });
                    }
                    return { ...status, remainingTurns: nextRemaining };
                })
                .filter((status) => status && (status.remainingTurns || 0) > 0);
            if (pendingExpireStatuses.length > 0) {
                actorState.statuses.push(...pendingExpireStatuses);
            }
        });
        if (username === endingUsername) {
            units.forEach((unit) => {
                if (!unit) return;
                const actorState = ensureUnitStateShape(unit);
                actorState.snapshots.ownerTurnEndHp = Math.max(0, Number(unit?.hp) || 0);
            });
        }
    });
};

const tickCooldownsForTurnEnd = ({ match, endingUsername }) => {
    if (!match || !endingUsername) return;
    const units = match.board?.[endingUsername] || [];
    units.forEach((unit) => {
        const actorState = ensureUnitStateShape(unit);
        const startedThisTurn =
            actorState._cooldownsStartedThisTurn && typeof actorState._cooldownsStartedThisTurn === 'object'
                ? actorState._cooldownsStartedThisTurn
                : {};
        const freezeActive = hasStatusMetadataFlag(actorState, 'freezeCooldowns');
        if (hasStatusMetadataFlag(actorState, 'freezeCooldowns')) {
            const cooldowns =
                actorState.cooldowns && typeof actorState.cooldowns === 'object' ? actorState.cooldowns : {};
            Object.keys(cooldowns).forEach((skillId) => {
                if (!startedThisTurn[skillId]) return;
                const next = Math.max(0, (Number(cooldowns[skillId]) || 0) - 1);
                if (next <= 0) {
                    delete cooldowns[skillId];
                } else {
                    cooldowns[skillId] = next;
                }
            });
            actorState.cooldowns = cooldowns;
            actorState._cooldownsStartedThisTurn = {};
            return;
        }
        const cooldowns =
            actorState.cooldowns && typeof actorState.cooldowns === 'object' ? actorState.cooldowns : {};
        Object.keys(cooldowns).forEach((skillId) => {
            const next = Math.max(0, (Number(cooldowns[skillId]) || 0) - 1);
            if (next <= 0) {
                delete cooldowns[skillId];
            } else {
                cooldowns[skillId] = next;
            }
        });
        actorState.cooldowns = cooldowns;
        if (!freezeActive) {
            actorState._cooldownsStartedThisTurn = {};
        }
    });
};

module.exports = {
    DEFAULT_HP,
    buildInitialBoard,
    getSkillTargetType,
    resolveEffectiveSkill,
    computeTargetOptions,
    validateTargetSelection,
    resolvePendingTurnSkills,
    computeEffectiveEnergyCost,
    tickStatusesForTurnEnd,
    tickCooldownsForTurnEnd,
    getSkillCooldownRemaining,
    isSkillIndexBlockedForActor,
    isActorUnableToUseSkills,
    getUnitState,
};
