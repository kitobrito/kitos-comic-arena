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
    const replacementId = replacementMap[baseSkill.id];
    if (!replacementId) return baseSkill;
    const replacementSkill =
        (Array.isArray(character?.skills) ? character.skills : []).find((skill) => skill?.id === replacementId) ||
        null;
    return replacementSkill || baseSkill;
};

const getStatusMetadataTotals = (actorState) => {
    const totals = {
        damageReductionFlat: 0,
        damageReductionPercent: 0,
        physicalDamageReductionFlat: 0,
        damageTakenMultiplier: 1,
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
        totals.damageReductionPercent += Math.max(0, Number(metadata.damageReductionPercent) || 0);
        totals.physicalDamageReductionFlat += Number(metadata.physicalDamageReductionFlat) || 0;
        if (Number.isFinite(metadata.damageTakenMultiplier)) {
            totals.damageTakenMultiplier *= Math.max(0, Number(metadata.damageTakenMultiplier) || 1);
        }
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

const doesUnitSatisfySkillTargetCondition = (unit, skill) => {
    const condition = skill?.targetCondition;
    const state = ensureUnitStateShape(unit);
    if (condition?.statusId && !hasStatus(state, condition.statusId)) return false;
    if (condition?.missingStatusId && hasStatus(state, condition.missingStatusId)) return false;
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
    const bypassEnemyInvulnerability = canActorIgnoreEnemyInvulnerability(actorUnit);

    const effectiveSkill = resolveEffectiveSkill({
        characters,
        rosterIndex: actorUnit.rosterIndex,
        skillIndex,
        actorState,
    });
    const targetType = effectiveSkill?.target || null;
    result.targetType = targetType;

    const opponentEntry = (match.players || []).find((p) => p.username !== actingUsername);
    const opponentUsername = opponentEntry?.username;
    const opponentBoard = opponentUsername ? match.board?.[opponentUsername] || [] : [];

    const aliveFilter = (unit) => unit && unit.alive !== false;
    const mapTargets = (username, units, { enemyTargeting = false, skillClasses = [] } = {}) =>
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
            result.targets = mapTargets(actingUsername, actorBoard).filter((t) => t.slot === actorSlot);
            break;
        }
        case 'single-ally': {
            result.mode = 'single';
            result.targets = mapTargets(actingUsername, actorBoard).filter((t) => t.slot !== actorSlot);
            break;
        }
        case 'self-or-single-ally': {
            result.mode = 'single';
            result.targets = mapTargets(actingUsername, actorBoard);
            break;
        }
        case 'all-allies': {
            result.mode = 'all';
            result.targets = mapTargets(actingUsername, actorBoard);
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

const consumeStatus = (actorState, statusId) => {
    if (!Array.isArray(actorState?.statuses)) return;
    const index = actorState.statuses.findIndex((status) => status?.id === statusId);
    if (index >= 0) {
        actorState.statuses.splice(index, 1);
    }
};

const doesEffectConditionMatch = ({ condition, actorState, targetState }) => {
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
        if (typeof metadata?.stackMetadataKey === 'string' && metadata.stackMetadataKey) {
            const stackKey = metadata.stackMetadataKey;
            const delta = Number(metadata?.stackDelta) || 0;
            const cap = Math.max(1, Number(metadata?.stackMax) || 1);
            const previous = Math.max(0, Number(existing?.metadata?.[stackKey]) || 0);
            nextMetadata[stackKey] = Math.min(cap, Math.max(0, previous + delta));
            if (typeof metadata?.tooltipTextTemplate === 'string' && metadata.tooltipTextTemplate) {
                nextMetadata.tooltipText = metadata.tooltipTextTemplate.replace(
                    /\{stacks\}/g,
                    String(nextMetadata[stackKey])
                );
            }
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
        existing.metadata = nextMetadata;
        existing.fresh = Boolean(fresh);
        return;
    }
    targetState.statuses.push({
        id: statusId,
        remainingTurns: normalizedDuration,
        sourceSkillId: sourceSkillId || null,
        sourceUsername: sourceUsername || null,
        sourceSlot: Number.isInteger(sourceSlot) ? sourceSlot : null,
        metadata:
            typeof metadata?.stackMetadataKey === 'string' &&
            metadata.stackMetadataKey &&
            typeof metadata?.tooltipTextTemplate === 'string' &&
            metadata.tooltipTextTemplate
                ? {
                      ...(metadata || {}),
                      tooltipText: metadata.tooltipTextTemplate.replace(
                          /\{stacks\}/g,
                          String(Math.max(0, Number(metadata?.[metadata.stackMetadataKey]) || 0))
                      ),
                  }
                : metadata || {},
        fresh: Boolean(fresh),
    });
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

const resolveEffectDamageAmount = ({ effect, actorState, targetState, skillClasses = [] }) => {
    let amount = Number(effect?.amount) || 0;
    const afflictionDamage =
        hasSkillClass(skillClasses, 'affliction') || Boolean(effect?.metadata?.afflictionDamage);
    const sourceTotals = getStatusMetadataTotals(actorState);
    amount += (Number(sourceTotals.damageBonusFlat) || 0) - (Number(sourceTotals.damageDebuffFlat) || 0);
    if (!afflictionDamage && !Boolean(effect?.metadata?.ignoreSourceNonAfflictionDamageBonus)) {
        amount +=
            (Number(sourceTotals.nonAfflictionDamageBonusFlat) || 0) -
            (Number(sourceTotals.nonAfflictionDamageDebuffFlat) || 0);
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
        if (condition?.missingStatusId && hasStatus(targetState, condition.missingStatusId)) {
            return applyStackBonus(amount);
        }
        return applyStackBonus(amount);
    }
    const scope = condition.scope === 'target' ? 'target' : 'self';
    const scopedState = scope === 'target' ? targetState : actorState;
    if (!hasStatus(scopedState, condition.statusId)) {
        return applyStackBonus(amount);
    }
    if (Number.isFinite(condition.conditionalAmount)) {
        amount = Number(condition.conditionalAmount) || amount;
    }
    if (condition.consumeOnMatch) {
        consumeStatus(scopedState, condition.statusId);
    }
    return applyStackBonus(amount);
};

const getTargetBonusDamageFromSource = ({ targetState, sourceCharacterId }) => {
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
    if (type === 'apply_status') {
        const metadata = effect?.metadata || {};
        return Boolean(
            metadata.harmful ||
                metadata.cannotUseSkills ||
                metadata.cannotUseHarmfulSkills ||
                metadata.cannotUseNonMentalSkills ||
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
            status.metadata = { ...(status.metadata || {}), destructibleDefensePoints: remainingPoints };
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
    const afterPercent = incoming * (1 - percentReduction / 100);
    const mitigation = ignoreDamageReduction
        ? 0
        : cannotReduceDamage
        ? 0
        : Math.max(0, totals.damageReductionFlat + (isPhysical ? totals.physicalDamageReductionFlat : 0));
    const dealt = Math.max(0, afterPercent - mitigation);
    unit.hp = Math.max(0, (Number(unit.hp) || 0) - dealt);
    if (unit.hp <= 0) {
        unit.alive = false;
    }
    return dealt;
};

const applyHealToUnit = (unit, rawAmount) => {
    if (!unit || unit.alive === false) return 0;
    const heal = Math.max(0, Number(rawAmount) || 0);
    const before = Number(unit.hp) || 0;
    unit.hp = Math.min(DEFAULT_HP, before + heal);
    return Math.max(0, unit.hp - before);
};

const applyChakraGainToMatch = ({ match, username, chakraType, amount = 1 }) => {
    if (!match || !username) return 0;
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
    const turnMarker = `${actingUsername}:${Number(match?.economy?.turnCounts?.[actingUsername]) || 0}`;

    queueOrder.forEach((actorSlotRaw) => {
        const actorSlot = Number.parseInt(actorSlotRaw, 10);
        if (!Number.isInteger(actorSlot) || actorSlot < 0) return;
        const queued = pending.queuedByActorSlot[String(actorSlot)];
        if (!queued) return;

        const actorUnit = actorBoard[actorSlot];
        if (!actorUnit || actorUnit.alive === false) return;

        const actorState = ensureUnitStateShape(actorUnit);
        if (getStatusMetadataTotals(actorState).cannotUseSkills) return;

        const baseSkill = Array.isArray(characters?.[actorUnit.rosterIndex]?.skills)
            ? characters[actorUnit.rosterIndex].skills[queued.skillIndex]
            : null;
        const skill = getSkillByIndices(characters, actorUnit.rosterIndex, queued.skillIndex, actorState);
        if (!skill) return;
        const cooldownSkillId =
            skill?.useBaseSkillCooldown && baseSkill?.id ? baseSkill.id : skill.id || baseSkill?.id || null;
        if (cooldownSkillId && getSkillCooldownRemaining(actorState, cooldownSkillId) > 0) return;

        const blockedByCannotUseHarmfulSkills =
            hasStatusMetadataFlag(actorState, 'cannotUseHarmfulSkills') &&
            ['single-enemy', 'other-enemies', 'all-enemy'].includes(
                String(skill?.target || '').trim().toLowerCase()
            );
        if (blockedByCannotUseHarmfulSkills) return;
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
            return;
        }
        if (
            hasStatusMetadataFlag(actorState, 'cannotUseNonMentalSkills') &&
            !hasSkillClass(skill?.classes || [], 'mental')
        ) {
            return;
        }
        const ownerUseSkillTriggeredStatusIds = new Set();
        (Array.isArray(actorState?.statuses) ? actorState.statuses : []).forEach((status) => {
            const remaining = Number(status?.remainingTurns) || 0;
            if (remaining <= 0) return;
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
            if (status?.id) {
                ownerUseSkillTriggeredStatusIds.add(status.id);
            }
        });
        if (ownerUseSkillTriggeredStatusIds.size > 0) {
            actorState.statuses = (Array.isArray(actorState.statuses) ? actorState.statuses : []).filter(
                (status) => !ownerUseSkillTriggeredStatusIds.has(status?.id)
            );
        }

        const effects = Array.isArray(skill.effects) ? skill.effects : [];
        if (!effects.length) return;
        const actingCharacterId =
            (typeof characters?.[actorUnit?.rosterIndex]?.id === 'string' &&
                characters[actorUnit.rosterIndex].id) ||
            (typeof characters?.[actorUnit?.rosterIndex]?.characterId === 'string' &&
                characters[actorUnit.rosterIndex].characterId) ||
            null;
        const castStartStatusIds = new Set(
            (Array.isArray(actorState.statuses) ? actorState.statuses : [])
                .filter((status) => (status?.remainingTurns || 0) > 0 && status?.id)
                .map((status) => status.id)
        );

        const selection = normalizeTargetSelection(queued.targetSelection);
        const bypassEnemyInvulnerability = canActorIgnoreEnemyInvulnerability(actorUnit);
        const selectedTargets = selection
            .map((target) => ({
                username: target.username,
                slot: target.slot,
                unit: match.board?.[target.username]?.[target.slot] || null,
            }))
            .filter((entry) => {
                if (!entry.unit || entry.unit.alive === false) return false;
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
        const randomScopeGroupPicks = new Map();
        const resolveRecipients = (effect) => {
            const scope = effect?.scope;
            if (scope === 'self') {
                return [{ username: actingUsername, slot: actorSlot, unit: actorUnit }];
            }
            if (scope === 'all-allies') {
                return actorAllies;
            }
            if (scope === 'all-enemy') {
                return opponentUnits;
            }
            if (scope === 'random-enemy') {
                if (!opponentUnits.length) return [];
                const randomGroupKey = effect?.metadata?.randomScopeGroupKey;
                if (randomGroupKey) {
                    const savedPick = randomScopeGroupPicks.get(randomGroupKey);
                    if (savedPick?.unit && savedPick.unit.alive !== false) {
                        return [savedPick];
                    }
                    const groupedPick = opponentUnits[Math.floor(Math.random() * opponentUnits.length)];
                    if (groupedPick) {
                        randomScopeGroupPicks.set(randomGroupKey, groupedPick);
                        return [groupedPick];
                    }
                    return [];
                }
                const pick = opponentUnits[Math.floor(Math.random() * opponentUnits.length)];
                return pick ? [pick] : [];
            }
            if (scope === 'other-enemies') {
                const selectedKeys = new Set(
                    selectedTargets
                        .filter((entry) => entry?.username && Number.isInteger(entry?.slot))
                        .map((entry) => `${entry.username}:${entry.slot}`)
                );
                return opponentUnits.filter(
                    (entry) => !selectedKeys.has(`${entry.username}:${entry.slot}`)
                );
            }
            return selectedTargets;
        };

        const pendingDamage = new Map();
        const evadedRecipients = new Set();
        const evadeDecisionByRecipient = new Map();
        let skillCancelledByEvade = false;
        const skillIsHarmful = skillHasHarmfulEffects(skill);
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
            return didEvadeRecipient(recipient) || shouldEvadeForRecipient(recipient);
        };
        const preflightRecipientsByTargetType = (() => {
            const targetType = String(skill?.target || '').trim().toLowerCase();
            if (targetType === 'single-enemy') {
                return selectedTargets.filter((entry) => entry?.username !== actingUsername);
            }
            if (targetType === 'all-enemy' || targetType === 'other-enemies') {
                return opponentUnits;
            }
            return [];
        })();
        for (const recipient of preflightRecipientsByTargetType) {
            if (!recipient?.unit || recipient.unit.alive === false) continue;
            if (
                skillIsHarmful &&
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

        effects.forEach((effect) => {
            if (skillCancelledByEvade) return;
            const effectType = effect?.type;
            const activationChance = Number(effect?.activationChancePercent);
            if (Number.isFinite(activationChance) && !rollPercentSuccess(activationChance)) {
                return;
            }
            if (effectType === 'damage') {
                const recipients = resolveRecipients(effect);
                recipients.forEach((recipient) => {
                    if (skillCancelledByEvade) return;
                    if (!recipient?.unit || recipient.unit.alive === false) return;
                    if (!Boolean(effect?.metadata?.cannotBeEvaded) && shouldCancelByEvade(recipient)) {
                        skillCancelledByEvade = true;
                        pendingDamage.clear();
                        return;
                    }
                    if (isHarmfulEffect(effect)) {
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
                    const targetState = ensureUnitStateShape(recipient.unit);
                    const amount = resolveEffectDamageAmount({
                        effect,
                        actorState,
                        targetState,
                        skillClasses: skill.classes || [],
                    });
                    const skillSpecificBonus = getSkillSpecificDamageBonus(actorState, skill.id || null);
                    const targetSourceBonus = getTargetBonusDamageFromSource({
                        targetState,
                        sourceCharacterId: actingCharacterId,
                    });
                    const totalAmount = Math.max(0, amount + skillSpecificBonus + targetSourceBonus);
                    queueDamage(recipient, totalAmount, effect);
                });
                return;
            }

            if (effectType === 'apply_status') {
                const recipients = resolveRecipients(effect);
                recipients.forEach((recipient) => {
                    if (skillCancelledByEvade) return;
                    if (!recipient?.unit || recipient.unit.alive === false) return;
                    if (!Boolean(effect?.metadata?.cannotBeEvaded) && shouldCancelByEvade(recipient)) {
                        skillCancelledByEvade = true;
                        pendingDamage.clear();
                        return;
                    }
                    if (isHarmfulEffect(effect)) {
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
                    if (
                        effect.applyPolicy === 'if_missing_at_cast_start' &&
                        effect.scope === 'self' &&
                        castStartStatusIds.has(effect.statusId)
                    ) {
                        return;
                    }
                    const targetState = ensureUnitStateShape(recipient.unit);
                    const condition = effect?.condition;
                    if (condition) {
                        if (!doesEffectConditionMatch({ condition, actorState, targetState })) return;
                        if (condition.consumeOnMatch && condition.statusId) {
                            const scope = condition.scope === 'target' ? 'target' : 'self';
                            const scopedState = scope === 'target' ? targetState : actorState;
                            consumeStatus(scopedState, condition.statusId);
                        }
                    }
                    let runtimeMetadata = effect.metadata || {};
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
                        effect.statusId === 'stunned' ||
                        Boolean(effect?.metadata?.cannotUseSkills) ||
                        Boolean(effect?.metadata?.cannotUseHarmfulSkills) ||
                        Boolean(effect?.metadata?.cannotUseNonMentalSkills) ||
                        (Array.isArray(effect?.metadata?.cannotUseSkillClasses) &&
                            effect.metadata.cannotUseSkillClasses.length > 0);
                    if (applyingStun && hasStatusMetadataFlag(targetState, 'cannotBeStunned')) {
                        return;
                    }
                    if (effect.statusId === 'mind_body_switch_lock' || Boolean(effect?.metadata?.taunt)) {
                        runtimeMetadata = {
                            ...(runtimeMetadata || {}),
                            cannotTargetAlliesOfUsername: actingUsername,
                            allowedTargetSlot: actorSlot,
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
                                        entry?.id === effect.statusId &&
                                        entry?.sourceUsername === actingUsername &&
                                        Number(entry?.sourceSlot) === actorSlot
                                    )
                            );
                        });
                    }
                    applyStatus({
                        targetState,
                        statusId: effect.statusId,
                        duration: effect.duration,
                        sourceSkillId: effect?.sourceSkillId || skill.id || null,
                        sourceUsername: actingUsername,
                        sourceSlot: actorSlot,
                        metadata: runtimeMetadata,
                        fresh:
                            recipient.username === actingUsername ||
                            (runtimeMetadata?.turnDurationAnchor === 'source_turn' &&
                                !runtimeMetadata?.triggerOnApply),
                    });
                    if (
                        runtimeMetadata?.refreshSameStatusOnEnemyTeam &&
                        recipient.username &&
                        recipient.username !== actingUsername &&
                        effect.statusId
                    ) {
                        refreshStatusOnTeam({
                            match,
                            username: recipient.username,
                            statusId: effect.statusId,
                            duration: effect.duration,
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
                    if (condition?.statusId) {
                        const targetState = ensureUnitStateShape(recipient.unit);
                        if (!doesEffectConditionMatch({ condition, actorState, targetState })) return;
                        if (condition.consumeOnMatch && condition.statusId) {
                            const scope = condition.scope === 'target' ? 'target' : 'self';
                            const scopedState = scope === 'target' ? targetState : actorState;
                            consumeStatus(scopedState, condition.statusId);
                        }
                    }
                    const targetState = ensureUnitStateShape(recipient.unit);
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
                    applyHealToUnit(recipient.unit, effect.amount);
                });
                return;
            }

            if (effectType === 'cleanse_harmful') {
                const recipients = resolveRecipients(effect);
                recipients.forEach((recipient) => {
                    if (!recipient?.unit || recipient.unit.alive === false) return;
                    cleanseHarmfulStatuses(recipient.unit, effect.count || 1);
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
            }

            if (effectType === 'drain_chakra_non_bloodline_from_target_to_self') {
                const recipients = resolveRecipients(effect);
                const maxAmount = Math.max(0, Number(effect?.amount) || 0);
                if (maxAmount <= 0) return;
                recipients.forEach((recipient) => {
                    if (!recipient?.username || recipient.username === actingUsername) return;
                    const condition = effect?.condition;
                    const targetState = ensureUnitStateShape(recipient.unit);
                    if (condition) {
                        if (!doesEffectConditionMatch({ condition, actorState, targetState })) return;
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
                    const condition = effect?.condition;
                    if (condition) {
                        if (!doesEffectConditionMatch({ condition, actorState, targetState })) return;
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

        pendingDamage.forEach((entry) => {
            if (!entry?.recipient?.unit || entry.recipient.unit.alive === false) return;
            applyDamageToUnit(entry.recipient.unit, entry.amount, {
                match,
                sourceUsername: actingUsername,
                targetUsername: entry.recipient.username,
                skillClasses: skill.classes || [],
                ignoreDamageReduction: entry.ignoreDamageReduction,
                ignoreDestructibleDefense: entry.ignoreDestructibleDefense,
            });
        });

        const cooldownTurns = Math.max(0, Number(skill.cooldown) || 0);
        if (cooldownSkillId && cooldownTurns > 0) {
            actorState.cooldowns[cooldownSkillId] = Math.max(
                getSkillCooldownRemaining(actorState, cooldownSkillId),
                cooldownTurns + 1
            );
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
    });

    (match.players || []).forEach((player) => {
        const units = match.board?.[player.username] || [];
        player.aliveCount = units.reduce((sum, unit) => sum + (unit?.alive === false ? 0 : 1), 0);
    });
};

const tickStatusesForTurnEnd = ({ match, endingUsername }) => {
    if (!match || !endingUsername) return;
    const players = Array.isArray(match.players) ? match.players : [];
    players.forEach((player) => {
        const username = player?.username;
        if (!username) return;
        const units = match.board?.[username] || [];
    units.forEach((unit) => {
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
                    applyDamageToUnit(unit, turnEndDamage, {
                        match,
                        sourceUsername: status?.sourceUsername || null,
                        targetUsername: username,
                        ignoreDamageReduction:
                            affliction || Boolean(status?.metadata?.ignoreTargetDamageReduction),
                        ignoreDestructibleDefense:
                            affliction || Boolean(status?.metadata?.ignoreTargetDestructibleDefense),
                    });
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
                            applyDamageToUnit(picked.enemyUnit, adjustedRandomEnemyDamage, {
                                match,
                                sourceUsername: username,
                                targetUsername: opponentUsername,
                                skillClasses: status?.metadata?.turnEndRandomEnemySkillClasses || [],
                                ignoreDamageReduction: Boolean(status?.metadata?.turnEndRandomEnemyIgnoreDamageReduction),
                                ignoreDestructibleDefense: Boolean(
                                    status?.metadata?.turnEndRandomEnemyIgnoreDestructibleDefense
                                ),
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
            });
            actorState.statuses = actorState.statuses
                .map((status) => {
                    if (!status || (status.remainingTurns || 0) <= 0) return null;
                    if (status?.id && endedByControl.has(status.id)) return null;
                    const remaining = Number(status?.remainingTurns) || 0;
                    if (remaining >= 99 || Boolean(status?.metadata?.infiniteDuration)) {
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
    });
};

const tickCooldownsForTurnEnd = ({ match, endingUsername }) => {
    if (!match || !endingUsername) return;
    const units = match.board?.[endingUsername] || [];
    units.forEach((unit) => {
        const actorState = ensureUnitStateShape(unit);
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
    isActorUnableToUseSkills,
    getUnitState,
};
