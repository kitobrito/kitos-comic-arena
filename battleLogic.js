const defaultCharacters = require('./characters.js');

const DEFAULT_HP = 100;
const chakraTypes = ['taijutsu', 'ninjutsu', 'bloodline', 'genjutsu'];
const PARASITE_ASSET_BASE = 'assets/images/';
const PARASITE_ICONS = {
    negativeDamage: `${PARASITE_ASSET_BASE}parasite-neg-damage.svg`,
    negativeNonAffliction: `${PARASITE_ASSET_BASE}parasite-neg-nonaffliction.svg`,
    negativeAffliction: `${PARASITE_ASSET_BASE}parasite-neg-affliction.svg`,
    negativeComplete: `${PARASITE_ASSET_BASE}parasite-neg-complete.svg`,
    positiveDamage: `${PARASITE_ASSET_BASE}parasite-pos-damage.svg`,
    positiveDefense: `${PARASITE_ASSET_BASE}parasite-pos-defense.svg`,
    positiveRegen: `${PARASITE_ASSET_BASE}parasite-pos-regen.svg`,
    positiveComplete: `${PARASITE_ASSET_BASE}parasite-pos-complete.svg`,
    debuffCooldown: `${PARASITE_ASSET_BASE}parasite-debuff-cooldown.svg`,
    debuffHeal: `${PARASITE_ASSET_BASE}parasite-debuff-heal.svg`,
    debuffDefense: `${PARASITE_ASSET_BASE}parasite-debuff-defense.svg`,
};

const roundCombatAmountUp = (amount) => {
    const numericAmount = Math.max(0, Number(amount) || 0);
    return numericAmount > 0 ? Math.ceil(numericAmount) : 0;
};

const createEmptyChakraCost = () => ({
    taijutsu: 0,
    ninjutsu: 0,
    bloodline: 0,
    genjutsu: 0,
});

const ensureUnitStateShape = (unit) => {
    if (!unit || typeof unit !== 'object') return { statuses: [], cooldowns: {}, skillUses: {} };
    if (!unit.state || typeof unit.state !== 'object') {
        unit.state = { statuses: [], cooldowns: {}, skillUses: {} };
    }
    if (!Array.isArray(unit.state.statuses)) {
        unit.state.statuses = [];
    }
    if (!unit.state.cooldowns || typeof unit.state.cooldowns !== 'object') {
        unit.state.cooldowns = {};
    }
    if (!unit.state.skillUses || typeof unit.state.skillUses !== 'object') {
        unit.state.skillUses = {};
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

const buildInitialBoard = (players = [], characters = defaultCharacters) => {
    const board = {};
    players.forEach((player) => {
        const team = Array.isArray(player.team) ? player.team : [];
        board[player.username] = team.map((rosterIndex, slot) => {
            const character = Array.isArray(characters) ? characters[rosterIndex] : null;
            const startStatuses = Array.isArray(character?.startStatuses) ? character.startStatuses : [];
            return {
                slot,
                rosterIndex,
                alive: true,
                hp: DEFAULT_HP,
                state: {
                    statuses: startStatuses
                        .map((status) => {
                            if (!status || typeof status !== 'object') return null;
                            const statusId =
                                typeof status.statusId === 'string' && status.statusId
                                    ? status.statusId
                                    : typeof status.id === 'string' && status.id
                                    ? status.id
                                    : '';
                            if (!statusId) return null;
                            const duration = Number.isFinite(status.duration)
                                ? status.duration
                                : Number(status.remainingTurns) || 0;
                            return {
                                id: statusId,
                                remainingTurns: Math.max(0, Number(duration) || 0),
                                sourceSkillId:
                                    typeof status.sourceSkillId === 'string' && status.sourceSkillId
                                        ? status.sourceSkillId
                                        : null,
                                sourceUsername:
                                    typeof status.sourceUsername === 'string' && status.sourceUsername
                                        ? status.sourceUsername
                                        : null,
                                sourceSlot: Number.isInteger(status.sourceSlot) ? status.sourceSlot : null,
                                metadata:
                                    status.metadata && typeof status.metadata === 'object'
                                        ? (() => {
                                              const created = { ...status.metadata };
                                              const randomizeConfig =
                                                  created?.randomizeMetadataKeyFromOptions &&
                                                  typeof created.randomizeMetadataKeyFromOptions === 'object'
                                                      ? created.randomizeMetadataKeyFromOptions
                                                      : null;
                                              if (randomizeConfig) {
                                                  const metadataKey =
                                                      typeof randomizeConfig.metadataKey === 'string' &&
                                                      randomizeConfig.metadataKey
                                                          ? randomizeConfig.metadataKey
                                                          : '';
                                                  const options = Array.isArray(randomizeConfig.options)
                                                      ? randomizeConfig.options
                                                      : Array.isArray(randomizeConfig.values)
                                                      ? randomizeConfig.values
                                                      : [];
                                                  if (metadataKey && options.length > 0) {
                                                      const currentValue = created?.[metadataKey];
                                                      const pool = options.filter(
                                                          (entry) =>
                                                              !Boolean(randomizeConfig.excludeCurrentValue) ||
                                                              entry !== currentValue
                                                      );
                                                      const chosenValue =
                                                          pool[Math.floor(Math.random() * pool.length)] ??
                                                          currentValue ??
                                                          options[0];
                                                      created[metadataKey] = chosenValue;
                                                  }
                                              }
                                              return created;
                                          })()
                                        : {},
                                fresh: Boolean(status.fresh),
                            };
                        })
                        .filter(Boolean),
                    cooldowns: {},
                    skillUses: {},
                },
            };
        });
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
        const requiredSourceSkillId =
            typeof status?.metadata?.skillReplacementsRequireSourceSkillId === 'string'
                ? status.metadata.skillReplacementsRequireSourceSkillId
                : '';
        if (requiredSourceSkillId && status?.sourceSkillId !== requiredSourceSkillId) return;
        Object.entries(replacements).forEach(([fromId, toId]) => {
            if (!fromId || !toId) return;
            map[fromId] = toId;
        });
    });
    return map;
};

const getEffectiveCharacterOverrideId = (actorState) => {
    const statuses = Array.isArray(actorState?.statuses) ? actorState.statuses : [];
    const overrideStatus = statuses.find(
        (status) =>
            (Number(status?.remainingTurns) || 0) > 0 &&
            typeof status?.metadata?.effectiveCharacterId === 'string' &&
            status.metadata.effectiveCharacterId.trim()
    );
    return overrideStatus?.metadata?.effectiveCharacterId?.trim() || '';
};

const resolveEffectiveCharacter = ({ characters, rosterIndex, actorState = null }) => {
    const baseCharacter = Array.isArray(characters) ? characters[rosterIndex] : null;
    const overrideId = getEffectiveCharacterOverrideId(actorState);
    if (!overrideId || !Array.isArray(characters)) return baseCharacter;
    return (
        characters.find(
            (character) =>
                character?.id === overrideId ||
                character?.characterId === overrideId
        ) || baseCharacter
    );
};

const formatDebugIdentifier = (value) => {
    if (typeof value !== 'string' || !value.trim()) return '';
    return value
        .trim()
        .split('-')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
};

const setLastDamageDebug = (targetState, amount, context = {}) => {
    if (!targetState) return;
    const numericAmount = Math.max(0, Number(amount) || 0);
    if (numericAmount <= 0) return;
    const sourceLabel =
        (typeof context?.damageDebugLabel === 'string' && context.damageDebugLabel.trim()) ||
        formatDebugIdentifier(context?.sourceSkillId) ||
        (typeof context?.sourceUsername === 'string' && context.sourceUsername.trim()) ||
        'Unknown';
    const reasonLabel =
        typeof context?.damageDebugReason === 'string' && context.damageDebugReason.trim()
            ? ` (${context.damageDebugReason.trim()})`
            : '';
    targetState.lastDamageDebugText = `${numericAmount} from ${sourceLabel}${reasonLabel}`;
};

const resolveEffectiveSkill = ({ characters, rosterIndex, skillIndex, actorState }) => {
    const character = resolveEffectiveCharacter({ characters, rosterIndex, actorState });
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

const isStatusActiveForMetadata = (status, ownerUnit = null) => {
    const remaining = Number(status?.remainingTurns) || 0;
    if (remaining <= 0) return false;
    const metadata = status?.metadata || {};
    if (ownerUnit) {
        const currentHp = Math.max(0, Number(ownerUnit?.hp) || 0);
        const hpAtLeast = Number(metadata?.activeWhileOwnerCurrentHpAtLeast);
        if (Number.isFinite(hpAtLeast) && currentHp < hpAtLeast) {
            return false;
        }
        const hpAtMost = Number(metadata?.activeWhileOwnerCurrentHpAtMost);
        if (Number.isFinite(hpAtMost) && currentHp > hpAtMost) {
            return false;
        }
    }
    return true;
};

const isUnitBanished = (unit) => {
    if (!unit || typeof unit !== 'object') return false;
    const state = ensureUnitStateShape(unit);
    return (Array.isArray(state?.statuses) ? state.statuses : []).some((status) => {
        if (!isStatusActiveForMetadata(status, unit)) return false;
        return Boolean(status?.metadata?.banished);
    });
};

const getStatusMetadataTotals = (actorState, ownerUnit = null) => {
    const totals = {
        damageReductionFlat: 0,
        damageReductionPercent: 0,
        unpierceableDamageReductionFlat: 0,
        unpierceableDamageReductionPercent: 0,
        physicalDamageReductionFlat: 0,
        damageTakenBonusFlat: 0,
        nonAfflictionDamageTakenBonusFlat: 0,
        damageTakenMultiplier: 1,
        healReceivedMultiplier: 1,
        healingBonusFlat: 0,
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
        if (!isStatusActiveForMetadata(status, ownerUnit)) return;
        const metadata = status?.metadata || {};
        let statusHealReceivedMultiplier = 1;
        totals.damageReductionFlat += Number(metadata.damageReductionFlat) || 0;
        totals.unpierceableDamageReductionFlat += Number(metadata.unpierceableDamageReductionFlat) || 0;
        if (
            typeof metadata.unpierceableDamageReductionFlatPerStatusMetadataKey === 'string' &&
            metadata.unpierceableDamageReductionFlatPerStatusMetadataKey
        ) {
            const stackValue = Math.max(
                0,
                Number(metadata[metadata.unpierceableDamageReductionFlatPerStatusMetadataKey]) || 0
            );
            const step = Math.max(1, Number(metadata.unpierceableDamageReductionFlatPerStatusMetadataStep) || 1);
            const amount = Number(metadata.unpierceableDamageReductionFlatPerStatusMetadataAmount) || 0;
            totals.unpierceableDamageReductionFlat += Math.floor(stackValue / step) * amount;
        }
        totals.damageReductionPercent += Math.max(0, Number(metadata.damageReductionPercent) || 0);
        totals.unpierceableDamageReductionPercent += Math.max(
            0,
            Number(metadata.unpierceableDamageReductionPercent) || 0
        );
        totals.physicalDamageReductionFlat += Number(metadata.physicalDamageReductionFlat) || 0;
        totals.damageTakenBonusFlat += Number(metadata.damageTakenBonusFlat) || 0;
        totals.nonAfflictionDamageTakenBonusFlat +=
            Number(metadata.nonAfflictionDamageTakenBonusFlat) || 0;
        if (Number.isFinite(metadata.damageTakenMultiplier)) {
            totals.damageTakenMultiplier *= Math.max(0, Number(metadata.damageTakenMultiplier) || 1);
        }
        if (Number.isFinite(metadata.healReceivedMultiplier)) {
            statusHealReceivedMultiplier = Math.max(0, Number(metadata.healReceivedMultiplier) || 1);
        }
        const healMultiplierAtMostThreshold = Number(
            metadata.healReceivedMultiplierWhenOwnerCurrentHpAtMostThreshold
        );
        const healMultiplierAtMostValue = Number(metadata.healReceivedMultiplierWhenOwnerCurrentHpAtMost);
        const healMultiplierAtLeastThreshold = Number(
            metadata.healReceivedMultiplierWhenOwnerCurrentHpAtLeastThreshold
        );
        const healMultiplierAtLeastValue = Number(metadata.healReceivedMultiplierWhenOwnerCurrentHpAtLeast);
        if (ownerUnit) {
            const currentHp = Math.max(0, Number(ownerUnit?.hp) || 0);
            if (Number.isFinite(healMultiplierAtMostThreshold) && Number.isFinite(healMultiplierAtMostValue)) {
                if (currentHp <= healMultiplierAtMostThreshold) {
                    statusHealReceivedMultiplier = Math.max(0, healMultiplierAtMostValue);
                }
            }
            if (Number.isFinite(healMultiplierAtLeastThreshold) && Number.isFinite(healMultiplierAtLeastValue)) {
                if (currentHp >= healMultiplierAtLeastThreshold) {
                    statusHealReceivedMultiplier = Math.max(0, healMultiplierAtLeastValue);
                }
            }
        }
        totals.healReceivedMultiplier *= statusHealReceivedMultiplier;
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
        totals.healingBonusFlat += Number(metadata.healingBonusFlat) || 0;
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

const getContextualMinimumHp = (targetState, ownerUnit, context = {}) => {
    const totals = getStatusMetadataTotals(targetState, ownerUnit);
    let minimumHp = Math.max(0, Number(totals.minimumHp) || 0);
    const statuses = Array.isArray(targetState?.statuses) ? targetState.statuses : [];
    statuses.forEach((status) => {
        if (!isStatusActiveForMetadata(status, ownerUnit)) return;
        const scopedMinimumHp = Math.max(0, Number(status?.metadata?.minimumHp) || 0);
        if (scopedMinimumHp <= 0) return;
        const sourceKey =
            typeof status?.metadata?.minimumHpFromSourceKey === 'string'
                ? status.metadata.minimumHpFromSourceKey
                : '';
        if (sourceKey) {
            const contextKey =
                context?.sourceUsername && Number.isInteger(context?.sourceSlot)
                    ? `${context.sourceUsername}:${context.sourceSlot}`
                    : '';
            if (!contextKey || contextKey !== sourceKey) return;
        }
        minimumHp = Math.max(minimumHp, scopedMinimumHp);
    });
    const isSelfSkillDamage =
        typeof context?.sourceSkillId === 'string' &&
        context.sourceSkillId &&
        context?.sourceUsername &&
        context?.targetUsername &&
        context.sourceUsername === context.targetUsername &&
        Number.isInteger(context?.sourceSlot) &&
        Number.isInteger(context?.targetSlot) &&
        context.sourceSlot === context.targetSlot;
    if (!isSelfSkillDamage) {
        return minimumHp;
    }
    statuses.forEach((status) => {
        if (!isStatusActiveForMetadata(status, ownerUnit)) return;
        const scopedMinimumHp = Math.max(
            0,
            Number(status?.metadata?.minimumHpFromSelfSkillDamage) || 0
        );
        minimumHp = Math.max(minimumHp, scopedMinimumHp);
    });
    return minimumHp;
};

const getSkillCooldownRemaining = (actorState, skillId) => {
    if (!actorState || !skillId) return 0;
    const cooldowns =
        actorState.cooldowns && typeof actorState.cooldowns === 'object' ? actorState.cooldowns : {};
    return Math.max(0, Number(cooldowns[skillId]) || 0);
};

const getSkillUseCount = (actorState, skillId) => {
    if (!actorState || !skillId) return 0;
    const skillUses =
        actorState.skillUses && typeof actorState.skillUses === 'object' ? actorState.skillUses : {};
    return Math.max(0, Number(skillUses[skillId]) || 0);
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

const canActorIgnoreTargetInvulnerabilityBySourceMark = ({ actorCharacterId, actorSkillId = null, targetUnit }) => {
    if ((!actorCharacterId && !actorSkillId) || !targetUnit) return false;
    const state = ensureUnitStateShape(targetUnit);
    const statuses = Array.isArray(state?.statuses) ? state.statuses : [];
    return statuses.some((status) => {
        const remaining = Number(status?.remainingTurns) || 0;
        if (remaining <= 0) return false;
        const allowedSkillIds = Array.isArray(status?.metadata?.ignoreInvulnerabilityFromSourceSkillIdsAny)
            ? status.metadata.ignoreInvulnerabilityFromSourceSkillIdsAny
                  .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
                  .filter(Boolean)
            : [];
        if (allowedSkillIds.length > 0) {
            return Boolean(actorSkillId) && allowedSkillIds.includes(actorSkillId);
        }
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

const doesEffectIgnoreHelpfulInvulnerability = (effect) =>
    Boolean(effect?.ignoreHelpfulInvulnerability) || Boolean(effect?.metadata?.ignoreHelpfulInvulnerability);

const filterHelpfulImmuneRecipients = ({ effect, recipients, actingUsername }) =>
    (Array.isArray(recipients) ? recipients : []).filter((recipient) => {
        if (!recipient?.unit || recipient.unit.alive === false) return false;
        if (!doesEffectTargetHelpfulRecipient({ effect, recipient, actingUsername })) return true;
        if (doesEffectIgnoreHelpfulInvulnerability(effect)) return true;
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
    const maxUses = Number(skill?.maxUses);
    if (Number.isFinite(maxUses) && maxUses >= 0 && getSkillUseCount(actorState, skill?.id) >= maxUses) {
        return false;
    }
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
    if (condition?.sourceSkillUsesAtLeast && typeof condition.sourceSkillUsesAtLeast === 'object') {
        const skillId = condition.sourceSkillUsesAtLeast.skillId;
        const minValue = Math.max(0, Number(condition.sourceSkillUsesAtLeast.value) || 0);
        if (!skillId || getSkillUseCount(actorState, skillId) < minValue) return false;
    }
    if (condition?.sourceSkillUsesAtMost && typeof condition.sourceSkillUsesAtMost === 'object') {
        const skillId = condition.sourceSkillUsesAtMost.skillId;
        const maxValue = Math.max(0, Number(condition.sourceSkillUsesAtMost.value) || 0);
        if (!skillId || getSkillUseCount(actorState, skillId) > maxValue) return false;
    }
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
    if (!actorUnit || actorUnit.alive === false || isUnitBanished(actorUnit)) return result;
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
        canActorIgnoreEnemyInvulnerability(actorUnit) ||
        Boolean(effectiveSkill?.ignoreInvulnerability) ||
        hasSkillClass(effectiveSkill?.classes || [], 'bypassing');
    const targetType = effectiveSkill?.target || null;
    result.targetType = targetType;

    const opponentEntry = (match.players || []).find((p) => p.username !== actingUsername);
    const opponentUsername = opponentEntry?.username;
    const opponentBoard = opponentUsername ? match.board?.[opponentUsername] || [] : [];

    const aliveFilter = (unit) => unit && unit.alive !== false && !isUnitBanished(unit);
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
                        actorSkillId: effectiveSkill?.id || null,
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
        case 'single-enemy-or-ally': {
            result.mode = 'single';
            result.targets = [
                ...mapTargets(actingUsername, actorBoard, { helpfulTargeting: true }).filter(
                    (t) => t.slot !== actorSlot
                ),
                ...mapTargets(opponentUsername, opponentBoard, {
                    enemyTargeting: true,
                    skillClasses: effectiveSkill?.classes || [],
                }),
            ];
            break;
        }
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
        case 'single-character': {
            result.mode = 'single';
            result.targets = [
                ...mapTargets(actingUsername, actorBoard),
                ...mapTargets(opponentUsername, opponentBoard, {
                    enemyTargeting: true,
                    skillClasses: effectiveSkill?.classes || [],
                }),
            ];
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

const normalizeSkillCostOverride = (override = {}) => {
    const normalized = normalizeEnergyCost(Array.isArray(override?.energy) ? override.energy : []);
    if (Number.isFinite(override?.requiredRandom)) {
        normalized.requiredRandom = Math.max(0, Number(override.requiredRandom) || 0);
    }
    if (Number.isFinite(override?.random)) {
        normalized.requiredRandom = Math.max(0, Number(override.random) || 0);
    }
    if (override?.reservedSpecific && typeof override.reservedSpecific === 'object') {
        chakraTypes.forEach((type) => {
            if (Number.isFinite(override.reservedSpecific[type])) {
                normalized.reservedSpecific[type] = Math.max(0, Number(override.reservedSpecific[type]) || 0);
            }
        });
    }
    chakraTypes.forEach((type) => {
        if (Number.isFinite(override?.[type])) {
            normalized.reservedSpecific[type] = Math.max(0, Number(override[type]) || 0);
        }
    });
    return normalized;
};

const getSkillCostOverrideForSkill = (actorState, skillId) => {
    if (!skillId) return null;
    const statuses = Array.isArray(actorState?.statuses) ? actorState.statuses : [];
    let resolvedOverride = null;
    statuses.forEach((status) => {
        const remaining = Number(status?.remainingTurns) || 0;
        if (remaining <= 0) return;
        const overrides = status?.metadata?.skillCostOverridesBySkillId;
        if (!overrides || typeof overrides !== 'object') return;
        const overrideByRemaining = status?.metadata?.skillCostOverridesByRemainingTurns;
        const override =
            (overrideByRemaining && typeof overrideByRemaining === 'object'
                ? overrideByRemaining[String(remaining)] || overrideByRemaining[remaining]
                : null) || overrides[skillId];
        if (!override || typeof override !== 'object') return;
        resolvedOverride = normalizeSkillCostOverride(override);
    });
    return resolvedOverride;
};

const getOverrideAllSkillsToAllRandomConfig = (actorState, skillId) => {
    const statuses = Array.isArray(actorState?.statuses) ? actorState.statuses : [];
    let resolvedConfig = null;
    statuses.forEach((status) => {
        const remaining = Number(status?.remainingTurns) || 0;
        if (remaining <= 0) return;
        const metadata = status?.metadata || {};
        if (!Boolean(metadata.overrideAllSkillsToAllRandom)) return;
        const restrictedSkillIds = Array.isArray(metadata.overrideAllSkillsToAllRandomSkillIdsAny)
            ? metadata.overrideAllSkillsToAllRandomSkillIdsAny
                  .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
                  .filter(Boolean)
            : [];
        if (restrictedSkillIds.length > 0 && !restrictedSkillIds.includes(skillId || '')) {
            return;
        }
        resolvedConfig = metadata;
    });
    return resolvedConfig;
};

const computeEffectiveEnergyCost = ({ skill, actorState }) => {
    const base = normalizeEnergyCost(skill?.energy || []);
    const skillOverride = getSkillCostOverrideForSkill(actorState, skill?.id || null);
    if (skillOverride) {
        return skillOverride;
    }
    const allRandomOverride = getOverrideAllSkillsToAllRandomConfig(actorState, skill?.id || null);
    if (allRandomOverride) {
        const totalCost =
            chakraTypes.reduce((sum, type) => sum + Math.max(0, Number(base.reservedSpecific?.[type]) || 0), 0) +
            Math.max(0, Number(base.requiredRandom) || 0);
        return {
            reservedSpecific: createEmptyChakraCost(),
            requiredRandom: totalCost,
        };
    }
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

const getEffectiveEnergyCostCountForTypes = (skill, actorState, energyTypes = []) => {
    const normalizedTypes = Array.isArray(energyTypes)
        ? energyTypes
              .map((entry) => (typeof entry === 'string' ? entry.trim().toLowerCase() : ''))
              .filter(Boolean)
        : [];
    if (!normalizedTypes.length) return 0;
    const effectiveCost = computeEffectiveEnergyCost({ skill, actorState });
    return normalizedTypes.reduce(
        (sum, type) => sum + Math.max(0, Number(effectiveCost?.reservedSpecific?.[type]) || 0),
        0
    );
};

const hasStatus = (actorState, statusId) =>
    Array.isArray(actorState?.statuses) &&
    actorState.statuses.some((status) => status?.id === statusId && (status.remainingTurns || 0) > 0);

const hasStatusMetadataFlag = (actorState, flagName) =>
    Array.isArray(actorState?.statuses) &&
    actorState.statuses.some((status) => {
        return isStatusActiveForMetadata(status) && Boolean(status?.metadata?.[flagName]);
    });

const pickRandomEntry = (entries = []) => {
    if (!Array.isArray(entries) || !entries.length) return null;
    return entries[Math.floor(Math.random() * entries.length)] || null;
};

const parseTrackedUnitKey = (rawValue) => {
    if (typeof rawValue !== 'string' || !rawValue) return null;
    const [username, slotRaw] = rawValue.split(':');
    const slot = Number.parseInt(slotRaw, 10);
    if (!username || !Number.isInteger(slot) || slot < 0) return null;
    return { username, slot };
};

const pickTrackedEnemyEntry = ({
    aliveEnemyEntries = [],
    opponentUsername = '',
    strategy = '',
    previousKey = '',
    mustChangeTarget = false,
}) => {
    if (!Array.isArray(aliveEnemyEntries) || !aliveEnemyEntries.length) return null;
    const normalizedStrategy =
        typeof strategy === 'string' ? strategy.trim().toLowerCase() : '';
    const previous = parseTrackedUnitKey(previousKey);
    let pool = aliveEnemyEntries.slice();
    const shouldAvoidPrevious =
        mustChangeTarget ||
        normalizedStrategy === 'nearest-other-enemy' ||
        normalizedStrategy === 'different-random-enemy';
    if (shouldAvoidPrevious && previous && pool.length > 1) {
        const filtered = pool.filter((entry) => {
            const slot = Number.isInteger(entry?.enemySlot) ? entry.enemySlot : Number.parseInt(entry?.enemySlot, 10);
            return !(opponentUsername === previous.username && slot === previous.slot);
        });
        if (filtered.length > 0) {
            pool = filtered;
        }
    }
    if (
        (normalizedStrategy === 'nearest-enemy' || normalizedStrategy === 'nearest-other-enemy') &&
        previous
    ) {
        const sameTeamPool = pool.filter(
            (entry) => entry && opponentUsername === previous.username && Number.isInteger(entry.enemySlot)
        );
        const distancePool = sameTeamPool.length > 0 ? sameTeamPool : pool;
        const entriesByDistance = distancePool
            .map((entry) => ({
                entry,
                distance: Math.abs(Number(entry.enemySlot) - previous.slot),
            }))
            .filter((entry) => Number.isFinite(entry.distance));
        if (!entriesByDistance.length) return null;
        const nearestDistance = Math.min(...entriesByDistance.map((entry) => entry.distance));
        const nearestEntries = entriesByDistance
            .filter((entry) => entry.distance === nearestDistance)
            .map((entry) => entry.entry);
        return pickRandomEntry(nearestEntries);
    }
    if (normalizedStrategy === 'lowest-hp' || normalizedStrategy === 'alive-enemy-lowest-hp') {
        const sortedByHp = pool
            .map((entry) => ({
                entry,
                hp: Math.max(0, Number(entry?.enemyUnit?.hp) || 0),
            }))
            .sort((left, right) => {
                if (left.hp !== right.hp) return left.hp - right.hp;
                return (Number(left.entry?.enemySlot) || 0) - (Number(right.entry?.enemySlot) || 0);
            });
        return sortedByHp[0]?.entry || null;
    }
    return pickRandomEntry(pool);
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

const renderTooltipTemplate = (template, metadata = {}) => {
    if (typeof template !== 'string' || !template) return template;
    const stackKey =
        typeof metadata?.unpierceableDamageReductionFlatPerStatusMetadataKey === 'string'
            ? metadata.unpierceableDamageReductionFlatPerStatusMetadataKey
            : '';
    const stackValue = stackKey ? Math.max(0, Number(metadata?.[stackKey]) || 0) : 0;
    const step = Math.max(1, Number(metadata?.unpierceableDamageReductionFlatPerStatusMetadataStep) || 1);
    const amount = Number(metadata?.unpierceableDamageReductionFlatPerStatusMetadataAmount) || 0;
    const currentUnpierceableDamageReductionFlat = stackKey
        ? Math.floor(stackValue / step) * amount
        : Number(metadata?.currentUnpierceableDamageReductionFlat) || 0;
    const templateMetadata = {
        ...(metadata || {}),
        currentUnpierceableDamageReductionFlat,
        currentUnpierceableDamageReduction: currentUnpierceableDamageReductionFlat,
    };
    return template.replace(/\{([a-zA-Z0-9_]+)\}|\[([a-zA-Z0-9_]+)\]/g, (_, braceKey, bracketKey) => {
        const key = braceKey || bracketKey || '';
        const value = getTemplateMetadataValue(templateMetadata, key);
        if (value === undefined || value === null) return '';
        return String(value);
    });
};

const refreshDerivedStatusTooltips = (targetState) => {
    const statuses = Array.isArray(targetState?.statuses) ? targetState.statuses : [];
    if (!statuses.length) return;
    const activeStatuses = statuses.filter((status) => (Number(status?.remainingTurns) || 0) > 0);
    statuses.forEach((status) => {
        const metadata = status?.metadata || {};
        const aggregateStatusIds = Array.isArray(metadata.tooltipAggregateStatusIds)
            ? metadata.tooltipAggregateStatusIds.filter((entry) => typeof entry === 'string' && entry)
            : [];
        const aggregateMetadataKey =
            typeof metadata.tooltipAggregateMetadataKey === 'string' && metadata.tooltipAggregateMetadataKey
                ? metadata.tooltipAggregateMetadataKey
                : '';
        if (!aggregateStatusIds.length || !aggregateMetadataKey) return;
        const aggregateSet = new Set(aggregateStatusIds);
        const total = activeStatuses.reduce((sum, entry) => {
            if (!aggregateSet.has(entry?.id)) return sum;
            return sum + Math.max(0, Number(entry?.metadata?.[aggregateMetadataKey]) || 0);
        }, 0);
        const nextMetadata = {
            ...metadata,
            [aggregateMetadataKey]: total,
        };
        if (typeof metadata.tooltipTextTemplate === 'string' && metadata.tooltipTextTemplate) {
            nextMetadata.tooltipText = renderTooltipTemplate(metadata.tooltipTextTemplate, nextMetadata);
        }
        status.metadata = nextMetadata;
    });
};

const consumeStatus = (actorState, statusId) => {
    if (!Array.isArray(actorState?.statuses)) return;
    const nextStatuses = actorState.statuses.filter((status) => status?.id !== statusId);
    if (nextStatuses.length !== actorState.statuses.length) {
        actorState.statuses = nextStatuses;
        refreshDerivedStatusTooltips(actorState);
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

const doesEffectConditionMatch = ({
    condition,
    actorState,
    targetState,
    actorUnit,
    targetUnit,
    actorUsername = null,
    targetUsername = null,
}) => {
    if (!condition || typeof condition !== 'object') return true;
    const scope = condition.scope === 'target' ? 'target' : 'self';
    const scopedState = scope === 'target' ? targetState : actorState;
    if (!scopedState) return false;
    const targetRelation = typeof condition?.targetRelation === 'string' ? condition.targetRelation.trim().toLowerCase() : '';
    if (targetRelation) {
        const sameUnit = Boolean(actorUnit && targetUnit && actorUnit === targetUnit);
        const sameTeam = Boolean(
            typeof actorUsername === 'string' &&
                typeof targetUsername === 'string' &&
                actorUsername &&
                targetUsername &&
                actorUsername === targetUsername
        );
        if (targetRelation === 'self' && !sameUnit) return false;
        if (targetRelation === 'ally' && (!sameTeam || sameUnit)) return false;
        if (targetRelation === 'enemy' && sameTeam) return false;
    }
    if (condition.statusId && !hasStatus(scopedState, condition.statusId)) return false;
    if (
        Array.isArray(condition?.statusIdsAny) &&
        condition.statusIdsAny.length > 0 &&
        !condition.statusIdsAny.some((statusId) => hasStatus(scopedState, statusId))
    ) {
        return false;
    }
    if (condition.missingStatusId && hasStatus(scopedState, condition.missingStatusId)) return false;

    const scopedUnit = scope === 'target' ? targetUnit : actorUnit;
    const scopedUnitCharacter =
        Number.isInteger(scopedUnit?.rosterIndex) && Array.isArray(defaultCharacters)
            ? defaultCharacters[scopedUnit.rosterIndex]
            : null;
    const scopedUnitCharacterId =
        (typeof scopedUnitCharacter?.id === 'string' && scopedUnitCharacter.id) ||
        (typeof scopedUnitCharacter?.characterId === 'string' && scopedUnitCharacter.characterId) ||
        '';

    if (condition.characterId && scopedUnitCharacterId !== condition.characterId) return false;
    if (
        Array.isArray(condition.characterIdsAny) &&
        condition.characterIdsAny.length > 0 &&
        !condition.characterIdsAny.includes(scopedUnitCharacterId)
    ) {
        return false;
    }
    if (condition.missingCharacterId && scopedUnitCharacterId === condition.missingCharacterId) return false;
    if (
        Array.isArray(condition.missingCharacterIdsAny) &&
        condition.missingCharacterIdsAny.length > 0 &&
        condition.missingCharacterIdsAny.includes(scopedUnitCharacterId)
    ) {
        return false;
    }

    if (Array.isArray(condition?.missingStatusMetadataAny) && condition.missingStatusMetadataAny.length > 0) {
        const blockedKeys = condition.missingStatusMetadataAny.filter((key) => typeof key === 'string' && key);
        if (
            blockedKeys.length > 0 &&
            Array.isArray(scopedState.statuses) &&
            scopedState.statuses.some(
                (status) =>
                    status &&
                    (Number(status?.remainingTurns) || 0) > 0 &&
                    blockedKeys.some((key) => Boolean(status?.metadata?.[key]))
            )
        ) {
            return false;
        }
    }
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
    if (condition.statusMetadataEquals && typeof condition.statusMetadataEquals === 'object') {
        const statusId = condition.statusMetadataEquals.statusId;
        const metadataKey = condition.statusMetadataEquals.metadataKey;
        const expectedValue = condition.statusMetadataEquals.value;
        if (!statusId || !metadataKey) return false;
        const status = Array.isArray(scopedState.statuses)
            ? scopedState.statuses.find(
                  (entry) => entry?.id === statusId && (Number(entry?.remainingTurns) || 0) > 0
              )
            : null;
        if (!status || status?.metadata?.[metadataKey] !== expectedValue) return false;
    }
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
    if (scope === 'self' && condition?.sourceSkillUsesAtLeast && typeof condition.sourceSkillUsesAtLeast === 'object') {
        const skillId = condition.sourceSkillUsesAtLeast.skillId;
        const minValue = Math.max(0, Number(condition.sourceSkillUsesAtLeast.value) || 0);
        if (!skillId || getSkillUseCount(actorState, skillId) < minValue) return false;
    }
    if (scope === 'self' && condition?.sourceSkillUsesAtMost && typeof condition.sourceSkillUsesAtMost === 'object') {
        const skillId = condition.sourceSkillUsesAtMost.skillId;
        const maxValue = Math.max(0, Number(condition.sourceSkillUsesAtMost.value) || 0);
        if (!skillId || getSkillUseCount(actorState, skillId) > maxValue) return false;
    }
    return true;
};

const isConditionalDamageOverrideOnly = (condition) => {
    if (!condition || typeof condition !== 'object') return false;
    if (!Number.isFinite(condition?.conditionalAmount)) return false;
    const recognizedKeys = new Set([
        'statusId',
        'scope',
        'conditionalAmount',
        'consumeOnMatch',
    ]);
    return Object.keys(condition).every((key) => recognizedKeys.has(key));
};

const chooseRandomOption = (options = [], excludeValue = undefined) => {
    const pool = Array.isArray(options)
        ? options.filter((entry) => entry !== undefined && entry !== null && entry !== excludeValue)
        : [];
    if (!pool.length) return excludeValue;
    return pool[Math.floor(Math.random() * pool.length)];
};

const resolveMetadataScaledFromSourceStatus = (metadata = {}, sourceStatus = {}) => {
    const config =
        metadata?.scaleFromSourceStatusMetadata && typeof metadata.scaleFromSourceStatusMetadata === 'object'
            ? metadata.scaleFromSourceStatusMetadata
            : null;
    if (!config?.metadataKey) return metadata || {};
    const sourceMetadata = sourceStatus?.metadata && typeof sourceStatus.metadata === 'object' ? sourceStatus.metadata : {};
    const sourceValue = Math.max(0, Number(sourceMetadata?.[config.metadataKey]) || 0);
    const multiplier = Number(config.multiplier) || 0;
    const targetKeys = Array.isArray(config.targetKeys)
        ? config.targetKeys.filter((key) => typeof key === 'string' && key)
        : [];
    if (targetKeys.length <= 0) return metadata || {};

    const nextMetadata = { ...(metadata || {}) };
    targetKeys.forEach((key) => {
        nextMetadata[key] = sourceValue * multiplier;
    });
    return nextMetadata;
};

const resolveDurationFromStatusMetadata = ({ effect = {}, actorState, targetState }) => {
    const config =
        effect?.durationFromStatusMetadata && typeof effect.durationFromStatusMetadata === 'object'
            ? effect.durationFromStatusMetadata
            : null;
    if (!config?.statusId || !config?.metadataKey) return null;
    const scope = config.scope === 'self' ? 'self' : 'target';
    const scopedState = scope === 'self' ? actorState : targetState;
    const status = Array.isArray(scopedState?.statuses)
        ? scopedState.statuses.find((entry) => entry?.id === config.statusId && (Number(entry?.remainingTurns) || 0) > 0)
        : null;
    const value = Math.max(0, Number(status?.metadata?.[config.metadataKey]) || 0);
    const multiplier = Number(config.multiplier) || 1;
    const minimum = Number.isFinite(Number(config.minimum)) ? Number(config.minimum) : 0;
    const maximum = Number.isFinite(Number(config.maximum)) ? Number(config.maximum) : null;
    const resolved = Math.max(minimum, Math.floor(value * multiplier));
    return maximum === null ? resolved : Math.min(maximum, resolved);
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
    const applyStackDerivedNumericKeys = (nextMetadata) => {
        if (!nextMetadata || typeof nextMetadata !== 'object') return nextMetadata;
        const stackKey =
            typeof nextMetadata?.stackMetadataKey === 'string' && nextMetadata.stackMetadataKey
                ? nextMetadata.stackMetadataKey
                : '';
        const derivedConfig =
            nextMetadata?.stackDerivedNumericKeys && typeof nextMetadata.stackDerivedNumericKeys === 'object'
                ? nextMetadata.stackDerivedNumericKeys
                : null;
        if (!stackKey || !derivedConfig) return nextMetadata;
        const stackValue = Math.max(0, Number(nextMetadata?.[stackKey]) || 0);
        const updated = { ...(nextMetadata || {}) };
        Object.entries(derivedConfig).forEach(([key, multiplier]) => {
            if (!key) return;
            updated[key] = stackValue * (Number(multiplier) || 0);
        });
        return updated;
    };
    const normalizedDuration = Math.max(0, Number(duration) || 0);
    const allowDuplicateStatusInstances = Boolean(
        metadata?.allowDuplicateStatusInstances || metadata?.allowDuplicateStatusInstance
    );
    const existing = allowDuplicateStatusInstances
        ? null
        : targetState.statuses.find((status) => status?.id === statusId);
    if (existing) {
        existing.remainingTurns = Math.max(existing.remainingTurns || 0, normalizedDuration);
        existing.sourceSkillId = sourceSkillId || existing.sourceSkillId;
        existing.sourceUsername = sourceUsername || existing.sourceUsername || null;
        existing.sourceSlot = Number.isInteger(sourceSlot) ? sourceSlot : existing.sourceSlot ?? null;
        let nextMetadata = { ...(existing.metadata || {}), ...(metadata || {}) };
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
        nextMetadata = applyStackDerivedNumericKeys(nextMetadata);
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
        refreshDerivedStatusTooltips(targetState);
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
    createdMetadata = applyStackDerivedNumericKeys(createdMetadata);
    const randomizeOnApplyConfig =
        createdMetadata?.randomizeMetadataKeyFromOptions &&
        typeof createdMetadata.randomizeMetadataKeyFromOptions === 'object'
            ? createdMetadata.randomizeMetadataKeyFromOptions
            : null;
    if (randomizeOnApplyConfig) {
        const metadataKey =
            typeof randomizeOnApplyConfig.metadataKey === 'string' && randomizeOnApplyConfig.metadataKey
                ? randomizeOnApplyConfig.metadataKey
                : '';
        const options = Array.isArray(randomizeOnApplyConfig.options)
            ? randomizeOnApplyConfig.options
            : Array.isArray(randomizeOnApplyConfig.values)
            ? randomizeOnApplyConfig.values
            : [];
        if (metadataKey && options.length > 0) {
            const currentValue = createdMetadata?.[metadataKey];
            const chosenValue = chooseRandomOption(
                options.filter((entry) => !Boolean(randomizeOnApplyConfig.excludeCurrentValue) || entry !== currentValue),
                currentValue
            );
            createdMetadata[metadataKey] = chosenValue;
        }
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
    const removeStatusIdsOnApply = Array.isArray(createdStatus?.metadata?.removeStatusIdsOnApply)
        ? createdStatus.metadata.removeStatusIdsOnApply.filter((id) => typeof id === 'string' && id)
        : [];
    if (removeStatusIdsOnApply.length > 0) {
        targetState.statuses = targetState.statuses.filter(
            (status) => !removeStatusIdsOnApply.includes(status?.id)
        );
    }
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
    refreshDerivedStatusTooltips(targetState);
};

const applyParasiteAbsorptionState = ({
    targetState,
    kind = 'negative',
    variant = 'random',
    sourceSkillId = null,
    sourceUsername = null,
    sourceSlot = null,
    fresh = true,
}) => {
    if (!targetState) return;
    const negativeStates = {
        damage: {
            statusId: 'parasite_negative_absorption_damage',
            icon: PARASITE_ICONS.negativeDamage,
            metadata: {
                harmful: true,
                infiniteDuration: true,
                turnEndDamage: 5,
                afflictionDamage: true,
                mergeNumericAddKeys: ['turnEndDamage'],
                statusIconUrl: PARASITE_ICONS.negativeDamage,
                specialStatusVisual: 'parasite-negative-single',
                tooltipTextTemplate:
                    'Negative Absorption: This character takes {turnEndDamage} affliction damage each turn.',
            },
        },
        nonaffliction: {
            statusId: 'parasite_negative_absorption_nonaffliction',
            icon: PARASITE_ICONS.negativeNonAffliction,
            metadata: {
                harmful: true,
                infiniteDuration: true,
                NonAfflictionDamageDebuff: 5,
                mergeNumericAddKeys: ['NonAfflictionDamageDebuff'],
                statusIconUrl: PARASITE_ICONS.negativeNonAffliction,
                specialStatusVisual: 'parasite-negative-single',
                tooltipTextTemplate:
                    'Negative Absorption: This character deals {NonAfflictionDamageDebuff} less non-affliction damage.',
            },
        },
        affliction: {
            statusId: 'parasite_negative_absorption_affliction',
            icon: PARASITE_ICONS.negativeAffliction,
            metadata: {
                harmful: true,
                infiniteDuration: true,
                nonAfflictionDamageTakenBonusFlat: 5,
                mergeNumericAddKeys: ['nonAfflictionDamageTakenBonusFlat'],
                statusIconUrl: PARASITE_ICONS.negativeAffliction,
                specialStatusVisual: 'parasite-negative-single',
                tooltipTextTemplate:
                    'Negative Absorption: This character takes {nonAfflictionDamageTakenBonusFlat} more non-affliction damage.',
            },
        },
    };
    const positiveStates = {
        damage: {
            statusId: 'parasite_positive_absorption_damage',
            icon: PARASITE_ICONS.positiveDamage,
            metadata: {
                infiniteDuration: true,
                nonAfflictionDamageBonusFlat: 5,
                mergeNumericAddKeys: ['nonAfflictionDamageBonusFlat'],
                statusIconUrl: PARASITE_ICONS.positiveDamage,
                specialStatusVisual: 'parasite-positive-single',
                tooltipTextTemplate:
                    'Positive Absorption: This character deals {nonAfflictionDamageBonusFlat} additional non-affliction damage.',
            },
        },
        defense: {
            statusId: 'parasite_positive_absorption_defense',
            icon: PARASITE_ICONS.positiveDefense,
            metadata: {
                infiniteDuration: true,
                unpierceableDamageReductionPercent: 5,
                mergeNumericAddKeys: ['unpierceableDamageReductionPercent'],
                statusIconUrl: PARASITE_ICONS.positiveDefense,
                specialStatusVisual: 'parasite-positive-single',
                tooltipTextTemplate:
                    'Positive Absorption: This character has {unpierceableDamageReductionPercent}% unpierceable damage reduction.',
            },
        },
        regen: {
            statusId: 'parasite_positive_absorption_regen',
            icon: PARASITE_ICONS.positiveRegen,
            metadata: {
                infiniteDuration: true,
                turnEndHealFlat: 5,
                mergeNumericAddKeys: ['turnEndHealFlat'],
                statusIconUrl: PARASITE_ICONS.positiveRegen,
                specialStatusVisual: 'parasite-positive-single',
                tooltipTextTemplate:
                    'Positive Absorption: This character heals {turnEndHealFlat} HP each turn.',
            },
        },
    };
    const selectedPool = kind === 'positive' ? positiveStates : negativeStates;
    const selectedKeys = Object.keys(selectedPool);
    const applyEntry = (entry) => {
        applyStatus({
            targetState,
            statusId: entry.statusId,
            duration: 99,
            sourceSkillId,
            sourceUsername,
            sourceSlot,
            metadata: entry.metadata,
            fresh,
        });
    };
    if (variant === 'complete') {
        if (kind === 'positive') {
            applyStatus({
                targetState,
                statusId: 'parasite_positive_absorption_complete',
                duration: 99,
                sourceSkillId,
                sourceUsername,
                sourceSlot,
                metadata: {
                    infiniteDuration: true,
                    nonAfflictionDamageBonusFlat: 5,
                    unpierceableDamageReductionPercent: 5,
                    turnEndHealFlat: 5,
                    mergeNumericAddKeys: [
                        'nonAfflictionDamageBonusFlat',
                        'unpierceableDamageReductionPercent',
                        'turnEndHealFlat',
                    ],
                    statusIconUrl: PARASITE_ICONS.positiveComplete,
                    specialStatusVisual: 'parasite-positive-complete',
                    tooltipTextTemplate:
                        'Complete Positive Absorption: This character deals {nonAfflictionDamageBonusFlat} additional non-affliction damage, has {unpierceableDamageReductionPercent}% unpierceable damage reduction, and heals {turnEndHealFlat} HP each turn.',
                },
                fresh,
            });
            return;
        }
        applyStatus({
            targetState,
            statusId: 'parasite_negative_absorption_complete',
            duration: 99,
            sourceSkillId,
            sourceUsername,
            sourceSlot,
            metadata: {
                harmful: true,
                infiniteDuration: true,
                turnEndDamage: 5,
                afflictionDamage: true,
                NonAfflictionDamageDebuff: 5,
                nonAfflictionDamageTakenBonusFlat: 5,
                mergeNumericAddKeys: [
                    'turnEndDamage',
                    'NonAfflictionDamageDebuff',
                    'nonAfflictionDamageTakenBonusFlat',
                ],
                statusIconUrl: PARASITE_ICONS.negativeComplete,
                specialStatusVisual: 'parasite-negative-complete',
                tooltipTextTemplate:
                    'Complete Negative Absorption: This character takes {turnEndDamage} affliction damage each turn, deals {NonAfflictionDamageDebuff} less non-affliction damage, and takes {nonAfflictionDamageTakenBonusFlat} more non-affliction damage.',
            },
            fresh,
        });
        return;
    }
    const resolvedKey = selectedPool[variant] ? variant : selectedKeys[Math.floor(Math.random() * selectedKeys.length)];
    applyEntry(selectedPool[resolvedKey]);
};

const applyExpireReplacementStatus = ({
    pendingExpireStatuses,
    sourceStatus,
    replacement,
}) => {
    if (!replacement || typeof replacement !== 'object' || !replacement.statusId) return;
    const inheritSourceMetadata = Boolean(
        replacement?.inheritSourceMetadata || replacement?.metadata?.inheritSourceMetadata
    );
    const sourceMetadata =
        sourceStatus?.metadata && typeof sourceStatus.metadata === 'object' ? sourceStatus.metadata : {};
    const replacementMetadata = {
        ...(inheritSourceMetadata ? sourceMetadata : {}),
        ...(replacement.metadata || {}),
    };
    delete replacementMetadata.inheritSourceMetadata;
    applyStatus({
        targetState: { statuses: pendingExpireStatuses },
        statusId: replacement.statusId,
        duration: replacement.duration,
        sourceSkillId:
            typeof replacement.sourceSkillId === 'string' && replacement.sourceSkillId
                ? replacement.sourceSkillId
                : sourceStatus?.sourceSkillId || null,
        sourceUsername:
            typeof replacement.sourceUsername === 'string' && replacement.sourceUsername
                ? replacement.sourceUsername
                : sourceStatus?.sourceUsername || null,
        sourceSlot: Number.isInteger(replacement.sourceSlot)
            ? replacement.sourceSlot
            : Number.isInteger(sourceStatus?.sourceSlot)
            ? sourceStatus.sourceSlot
            : null,
        metadata: replacementMetadata,
        fresh: false,
    });
};

const queueExpireReplacementStatuses = ({
    pendingExpireStatuses,
    sourceStatus,
    actorState,
    targetState,
    actorUnit,
    targetUnit,
    actorUsername,
    targetUsername,
    replacements,
}) => {
    const entries = Array.isArray(replacements)
        ? replacements
        : replacements?.statusId
        ? [replacements]
        : [];
    entries.forEach((replacement) => {
        if (!replacement?.statusId) return;
        if (
            replacement.condition &&
            !doesEffectConditionMatch({
                condition: replacement.condition,
                actorState,
                targetState,
                actorUnit,
                targetUnit,
                actorUsername,
                targetUsername,
            })
        ) {
            return;
        }
        applyExpireReplacementStatus({
            pendingExpireStatuses,
            sourceStatus,
            replacement,
        });
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

const resolveScalarEffectAmount = ({ effect, actorUnit, targetUnit = null }) => {
    let amount = Number(effect?.amount) || 0;
    if (Boolean(effect?.metadata?.amountFromSourceCurrentHp)) {
        amount += Math.max(0, Number(actorUnit?.hp) || 0);
    }
    if (Boolean(effect?.metadata?.amountFromSourceMissingHp)) {
        amount += Math.max(0, DEFAULT_HP - Math.max(0, Number(actorUnit?.hp) || 0));
    }
    if (Boolean(effect?.metadata?.amountFromTargetCurrentHp)) {
        amount += Math.max(0, Number(targetUnit?.hp) || 0);
    }
    return Math.max(0, amount);
};

const getOutgoingDamageCap = (actorState, actorUnit = null) => {
    const statuses = Array.isArray(actorState?.statuses) ? actorState.statuses : [];
    let cap = null;
    statuses.forEach((status) => {
        if (!isStatusActiveForMetadata(status, actorUnit)) return;
        const nextCap = Number(status?.metadata?.maxDamageOutput);
        if (!Number.isFinite(nextCap) || nextCap < 0) return;
        cap = cap === null ? nextCap : Math.min(cap, nextCap);
    });
    return cap;
};

const resolveStatusMetadataThresholdAdjustment = ({
    actorState,
    targetState,
    config,
    valueKey = 'amount',
}) => {
    if (!config || typeof config !== 'object' || !config.statusId || !config.metadataKey) return 0;
    const scope = config.scope === 'target' ? 'target' : 'self';
    const scopedState = scope === 'target' ? targetState : actorState;
    const status = Array.isArray(scopedState?.statuses)
        ? scopedState.statuses.find(
              (entry) => entry?.id === config.statusId && (Number(entry?.remainingTurns) || 0) > 0
          )
        : null;
    if (!status?.metadata) return 0;
    const currentValue = Math.max(0, Number(status.metadata[config.metadataKey]) || 0);
    const thresholds = Array.isArray(config.thresholds) ? config.thresholds : [];
    const match = thresholds
        .filter((entry) => currentValue >= Math.max(0, Number(entry?.atLeast) || 0))
        .sort((a, b) => (Number(b?.atLeast) || 0) - (Number(a?.atLeast) || 0))[0];
    if (!match) return 0;
    const adjustment = Number(match?.[valueKey]) || 0;
    const consume = Math.max(0, Number(match?.consume) || 0);
    if (consume > 0) {
        status.metadata[config.metadataKey] = Math.max(0, currentValue - consume);
        if (typeof status.metadata.tooltipTextTemplate === 'string' && status.metadata.tooltipTextTemplate) {
            status.metadata.tooltipText = renderTooltipTemplate(status.metadata.tooltipTextTemplate, status.metadata);
        }
    }
    return adjustment;
};

const countAliveTeamMembersForScaling = ({
    match,
    username,
    characterId = '',
    statusId = '',
    includeSelf = true,
    sourceSlot = null,
}) => {
    if (!match || !username) return 0;
    const teamUnits = Array.isArray(match.board?.[username]) ? match.board[username] : [];
    return teamUnits.reduce((count, unit, slot) => {
        if (!unit || unit.alive === false) return count;
        if (!includeSelf && Number.isInteger(sourceSlot) && Number(slot) === Number(sourceSlot)) return count;
        const character =
            Number.isInteger(unit?.rosterIndex) && Array.isArray(defaultCharacters)
                ? defaultCharacters[unit.rosterIndex]
                : null;
        const matchesCharacter =
            characterId && (character?.characterId === characterId || character?.id === characterId);
        const state = ensureUnitStateShape(unit);
        const matchesStatus =
            statusId &&
            Array.isArray(state.statuses) &&
            state.statuses.some(
                (status) => status?.id === statusId && (Number(status?.remainingTurns) || 0) > 0
            );
        return matchesCharacter || matchesStatus ? count + 1 : count;
    }, 0);
};

const getAliveTeamMemberScalingBonus = ({ metadata, match, username, sourceSlot = null }) => {
    const teamScaling = metadata?.bonusPerAliveTeamMember;
    if (!teamScaling || typeof teamScaling !== 'object') return 0;
    const count = countAliveTeamMembersForScaling({
        match,
        username,
        characterId: typeof teamScaling.characterId === 'string' ? teamScaling.characterId : '',
        statusId: typeof teamScaling.statusId === 'string' ? teamScaling.statusId : '',
        includeSelf: teamScaling.includeSelf !== false,
        sourceSlot,
    });
    return count * (Number(teamScaling.amount) || 0);
};

const resolveEffectDamageAmount = ({
    effect,
    actorState,
    actorUnit,
    targetState,
    skillClasses = [],
    match = null,
    actorUsername = '',
    actorSlot = null,
}) => {
    let amount = Number(effect?.amount) || 0;
    if (Boolean(effect?.metadata?.fixedDamage)) {
        return Math.max(0, amount);
    }
    const effectiveSkillClasses = Array.isArray(skillClasses) ? [...skillClasses] : [];
    if (Boolean(effect?.metadata?.afflictionDamage) && !hasSkillClass(effectiveSkillClasses, 'affliction')) {
        effectiveSkillClasses.push('affliction');
    }
    const afflictionDamage =
        hasSkillClass(effectiveSkillClasses, 'affliction') || Boolean(effect?.metadata?.afflictionDamage);
    const sourceTotals = getStatusMetadataTotals(actorState);
    const classScopedSourceTotals = getSourceClassScopedDamageModifiers(actorState, effectiveSkillClasses);
    amount += (Number(sourceTotals.damageBonusFlat) || 0) - (Number(sourceTotals.damageDebuffFlat) || 0);
    amount += resolveStatusMetadataThresholdAdjustment({
        actorState,
        targetState,
        config: effect?.metadata?.bonusFromStatusMetadataThresholds,
        valueKey: 'bonus',
    });
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
        const scope = stackBonus.scope === 'self' ? 'self' : 'target';
        const scopedState = scope === 'self' ? actorState : targetState;
        const scopedStatus = Array.isArray(scopedState?.statuses)
            ? scopedState.statuses.find(
                  (status) => status?.id === statusId && (Number(status?.remainingTurns) || 0) > 0
              )
            : null;
        const value = Math.max(0, Number(scopedStatus?.metadata?.[metadataKey]) || 0);
        nextAmount += value * multiplier;
        if (Boolean(stackBonus.consumeStatus) && scopedStatus) {
            consumeStatus(scopedState, statusId);
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
        resolvedAmount += getAliveTeamMemberScalingBonus({
            metadata: effect?.metadata,
            match,
            username: actorUsername,
            sourceSlot: actorSlot,
        });
        const outgoingCap = getOutgoingDamageCap(actorState, actorUnit);
        return outgoingCap === null ? resolvedAmount : Math.min(resolvedAmount, outgoingCap);
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
        resolvedAmount += getAliveTeamMemberScalingBonus({
            metadata: effect?.metadata,
            match,
            username: actorUsername,
            sourceSlot: actorSlot,
        });
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
    resolvedAmount += getAliveTeamMemberScalingBonus({
        metadata: effect?.metadata,
        match,
        username: actorUsername,
        sourceSlot: actorSlot,
    });
    const missingHpStep = Math.max(0, Number(effect?.metadata?.amountFromSourceMissingHpStep) || 0);
    const missingHpDivisor = Math.max(1, Number(effect?.metadata?.amountFromSourceMissingHpDivisor) || 0);
    if (missingHpStep > 0 && missingHpDivisor > 0) {
        const currentHp = Math.max(0, Number(actorUnit?.hp) || 0);
        const missingHp = Math.max(0, DEFAULT_HP - currentHp);
        resolvedAmount += Math.floor(missingHp / missingHpDivisor) * missingHpStep;
    }
    const outgoingCap = getOutgoingDamageCap(actorState, actorUnit);
    return outgoingCap === null ? resolvedAmount : Math.min(resolvedAmount, outgoingCap);
};

const getTargetBonusDamageFromSource = ({
    targetState,
    sourceCharacterId,
    sourceSkillId = null,
    sourceSkillClasses = [],
    sourceUsername = null,
    targetUsername = null,
}) => {
    if (!targetState || !sourceCharacterId) return 0;
    const statuses = Array.isArray(targetState?.statuses) ? targetState.statuses : [];
    return statuses.reduce((sum, status) => {
        const remaining = Number(status?.remainingTurns) || 0;
        if (remaining <= 0) return sum;
        const metadata = status?.metadata || {};
        if (
            Boolean(metadata?.bonusDamageFromSourceEnemyOnly) &&
            sourceUsername &&
            targetUsername &&
            sourceUsername === targetUsername
        ) {
            return sum;
        }
        if (
            Boolean(metadata?.bonusDamageFromSourceNonAfflictionOnly) &&
            hasSkillClass(sourceSkillClasses, 'affliction')
        ) {
            return sum;
        }
        if (
            Boolean(metadata?.bonusDamageFromSourceAfflictionOnly) &&
            !hasSkillClass(sourceSkillClasses, 'affliction')
        ) {
            return sum;
        }
        const flatBonus = Number(metadata?.bonusDamageFromSourceSkillsFlat) || 0;
        let bonus =
            flatBonus +
            (hasSkillClass(sourceSkillClasses, 'affliction')
                ? Number(metadata?.bonusDamageFromSourceSkillsFlatAffliction) || 0
                : Number(metadata?.bonusDamageFromSourceSkillsFlatNonAffliction) || 0);
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
        if (Array.isArray(ignored) && ignored.length > 0) {
            if (
                ignored.some((entry) =>
                    classSet.has(typeof entry === 'string' ? entry.trim().toLowerCase() : '')
                )
            ) {
                return true;
            }
        }
        if (Boolean(status?.metadata?.ignoreEnemyPhysicalSkills) && classSet.has('physical')) {
            return true;
        }
        return false;
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

const hasSkillSpecificStatusFlag = (actorState, skillId, metadataKey) => {
    if (!skillId || !metadataKey) return false;
    const statuses = Array.isArray(actorState?.statuses) ? actorState.statuses : [];
    const matchesSkillId = (value) => {
        if (Array.isArray(value)) {
            return value.some((entry) => entry === skillId);
        }
        if (value && typeof value === 'object') {
            return Boolean(value[skillId]);
        }
        return value === skillId;
    };
    return statuses.some((status) => {
        const remaining = Number(status?.remainingTurns) || 0;
        if (remaining <= 0) return false;
        return matchesSkillId(status?.metadata?.[metadataKey]);
    });
};

const rollPercentSuccess = (chancePercent) => {
    const chance = Math.max(0, Math.min(100, Number(chancePercent) || 0));
    if (chance <= 0) return false;
    return Math.random() * 100 < chance;
};

const isPassiveSourceSkillId = (sourceSkillId) =>
    typeof sourceSkillId === 'string' && /passive/i.test(sourceSkillId);

const resolveTriggeredEffectSourceSkillId = ({ status = null, config = null, fallbackSkillId = null } = {}) => {
    const statusSourceSkillId =
        typeof status?.sourceSkillId === 'string' && status.sourceSkillId
            ? status.sourceSkillId
            : null;
    if (isPassiveSourceSkillId(statusSourceSkillId)) {
        return statusSourceSkillId;
    }
    return (
        (typeof config?.sourceSkillId === 'string' && config.sourceSkillId
            ? config.sourceSkillId
            : null) ||
        statusSourceSkillId ||
        (typeof fallbackSkillId === 'string' && fallbackSkillId ? fallbackSkillId : null)
    );
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

const applyOnSkillEvadedBonuses = ({
    actorState,
    ownerUsername,
    ownerSlot,
    sourceUsername,
    sourceSlot,
    sourceSkillId,
}) => {
    const statuses = Array.isArray(actorState?.statuses) ? actorState.statuses : [];
    const triggeredStatusIds = new Set();
    statuses.forEach((status) => {
        const remaining = Number(status?.remainingTurns) || 0;
        if (remaining <= 0) return;
        const applyStatusToOwner = status?.metadata?.onOwnerSkillEvadedApplyStatusToOwner;
        if (!applyStatusToOwner?.statusId) return;
        applyStatus({
            targetState: actorState,
            statusId: applyStatusToOwner.statusId,
            duration: applyStatusToOwner.duration,
            sourceSkillId: resolveTriggeredEffectSourceSkillId({
                status,
                config: applyStatusToOwner,
                fallbackSkillId: sourceSkillId,
            }),
            sourceUsername: ownerUsername || sourceUsername || null,
            sourceSlot: Number.isInteger(ownerSlot)
                ? ownerSlot
                : Number.isInteger(sourceSlot)
                ? sourceSlot
                : null,
            metadata: applyStatusToOwner.metadata || {},
            fresh: false,
        });
        if (status?.id && !Boolean(status?.metadata?.persistOnOwnerSkillEvadedTrigger)) {
            triggeredStatusIds.add(status.id);
        }
    });
    if (triggeredStatusIds.size > 0) {
        actorState.statuses = (Array.isArray(actorState.statuses) ? actorState.statuses : []).filter(
            (status) => !triggeredStatusIds.has(status?.id)
        );
    }
};

const isHarmfulEffect = (effect) => {
    const type = effect?.type;
    if (type === 'damage' || type === 'health_steal_damage') return true;
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
                metadata.cannotUseHelpfulSkills ||
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

const getStatusMetadataSum = (actorState, metadataKey) => {
    if (!actorState || !metadataKey) return 0;
    const statuses = Array.isArray(actorState.statuses) ? actorState.statuses : [];
    return statuses.reduce((sum, status) => {
        const remaining = Number(status?.remainingTurns) || 0;
        if (remaining <= 0) return sum;
        return sum + Math.max(0, Number(status?.metadata?.[metadataKey]) || 0);
    }, 0);
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
        sourceSlot: Number.isInteger(recipient.slot) ? recipient.slot : null,
        targetUsername: actingUsername,
        sourceSkillId: sharinganStatus?.sourceSkillId || null,
        damageDebugReason: 'reflect',
    });
};

const maybeTriggerReactiveDefenses = ({
    match,
    turnMarker,
    actingUsername,
    recipient,
    actorUnit,
    skillClasses = [],
    skillIsHarmful = false,
    sourceSkillId = null,
    allowSelfTrapTrigger = false,
}) => {
    if (!recipient?.unit || recipient.unit.alive === false) return false;
    if (!actorUnit || actorUnit.alive === false) return false;
    const isSelfTrapTrigger = recipient.username === actingUsername;
    if (isSelfTrapTrigger && !allowSelfTrapTrigger) return false;

    if (!isSelfTrapTrigger) {
        maybeTriggerReflectDamage({
            match,
            turnMarker,
            actingUsername,
            recipient,
            actorUnit,
        });
    }

    const targetState = ensureUnitStateShape(recipient.unit);
    const statuses = Array.isArray(targetState.statuses) ? targetState.statuses : [];
    if (skillIsHarmful) {
        const removeStatusIdsOnEnemyHarmfulSkill = new Set();
        statuses.forEach((status) => {
            const remaining = Number(status?.remainingTurns) || 0;
            if (remaining <= 0) return;
            const removeIds = Array.isArray(status?.metadata?.removeStatusIdsOnEnemyHarmfulSkill)
                ? status.metadata.removeStatusIdsOnEnemyHarmfulSkill.filter((id) => typeof id === 'string' && id)
                : [];
            removeIds.forEach((id) => removeStatusIdsOnEnemyHarmfulSkill.add(id));
        });
        if (removeStatusIdsOnEnemyHarmfulSkill.size > 0) {
            targetState.statuses = statuses.filter(
                (status) => !removeStatusIdsOnEnemyHarmfulSkill.has(status?.id)
            );
        }
    }
    const trapIndex = statuses.findIndex((status) => {
        const remaining = Number(status?.remainingTurns) || 0;
        const metadata = status?.metadata || {};
        if (Boolean(metadata?.triggerOnOwnerHarmfulSkillOnly) && !isSelfTrapTrigger) return false;
        return (
            remaining > 0 &&
            (Boolean(metadata?.triggerOnEnemyHarmfulNonMental) ||
                Boolean(metadata?.triggerOnEnemyHarmfulSkill))
        );
    });
    if (trapIndex < 0) return false;

    const trapStatus = statuses[trapIndex];
    const trapMetadata = trapStatus?.metadata || {};
    if (trapMetadata?.triggerOnEnemyHarmfulNonMental && hasSkillClass(skillClasses, 'mental')) {
        return false;
    }
    const classFilter = Array.isArray(trapMetadata?.triggerOnEnemyHarmfulSkillClassesAny)
        ? trapMetadata.triggerOnEnemyHarmfulSkillClassesAny
              .map((entry) => normalizeSkillClassName(entry))
              .filter(Boolean)
        : [];
    if (classFilter.length > 0 && !classFilter.some((entry) => hasSkillClass(skillClasses, entry))) {
        return false;
    }
    const counterDamage =
        Math.max(0, Number(trapMetadata?.counterDamage) || 0) +
        getAliveTeamMemberScalingBonus({
            metadata: trapMetadata?.counterDamageMetadata,
            match,
            username: recipient.username,
            sourceSlot: Number.isInteger(recipient.slot) ? recipient.slot : null,
        });
    if (counterDamage > 0) {
        applyDamageToUnit(actorUnit, counterDamage, {
            match,
            sourceUsername: recipient.username,
            sourceSlot: Number.isInteger(recipient.slot) ? recipient.slot : null,
            targetUsername: actingUsername,
            sourceSkillId: trapStatus?.sourceSkillId || null,
            damageDebugReason: 'counter',
            ignoreDamageReduction: Boolean(trapMetadata?.counterDamageIgnoresReduction),
            ignoreDestructibleDefense: Boolean(trapMetadata?.counterDamageIgnoresDestructibleDefense),
        });
    }

    if (trapMetadata?.counterStatusId) {
        const actorState = ensureUnitStateShape(actorUnit);
        const counterStatusMetadata =
            trapMetadata?.counterStatusMetadata && typeof trapMetadata.counterStatusMetadata === 'object'
                ? { ...trapMetadata.counterStatusMetadata }
                : {};
        if (Boolean(counterStatusMetadata?.taunt) && trapStatus?.sourceUsername) {
            counterStatusMetadata.cannotTargetAlliesOfUsername = trapStatus.sourceUsername;
            if (Number.isInteger(trapStatus?.sourceSlot)) {
                counterStatusMetadata.allowedTargetSlot = trapStatus.sourceSlot;
            }
        }
        applyStatus({
            targetState: actorState,
            statusId: trapMetadata.counterStatusId,
            duration: Math.max(0, Number(trapMetadata?.counterStatusDuration) || 0),
            sourceSkillId: trapStatus?.sourceSkillId || null,
            sourceUsername: recipient.username || null,
            sourceSlot: Number.isInteger(recipient.slot) ? recipient.slot : null,
            metadata: counterStatusMetadata,
            // Counter-applied statuses land during the triggering unit's turn, so they
            // need to start fresh or a 1-turn effect expires at that same turn end.
            fresh: true,
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
    const counterEffectsToSourceOwner = Array.isArray(trapMetadata?.counterEffectsToSourceOwner)
        ? trapMetadata.counterEffectsToSourceOwner.filter((entry) => entry && typeof entry === 'object')
        : [];
    if (counterEffectsToSourceOwner.length > 0 && trapStatus?.sourceUsername && Number.isInteger(trapStatus?.sourceSlot)) {
        const sourceUnit = match.board?.[trapStatus.sourceUsername]?.[Number(trapStatus.sourceSlot)] || null;
        if (sourceUnit && sourceUnit.alive !== false) {
            const sourceState = ensureUnitStateShape(sourceUnit);
            const materializedEffects = counterEffectsToSourceOwner.map((effect) => {
                if (
                    effect?.type === 'modify_cooldowns' &&
                    Boolean(effect?.metadata?.targetTriggeredSkillOnly) &&
                    typeof sourceSkillId === 'string' &&
                    sourceSkillId
                ) {
                    return {
                        ...effect,
                        skillIds: [sourceSkillId],
                    };
                }
                return effect;
            });
            applyTriggeredEffectsFromStatus({
                effects: materializedEffects,
                match,
                status: trapStatus,
                targetUnit: sourceUnit,
                targetState: sourceState,
                targetUsername: trapStatus.sourceUsername,
                targetSlot: Number.isInteger(trapStatus.sourceSlot) ? trapStatus.sourceSlot : null,
            });
        }
    }
    if (Array.isArray(trapMetadata?.counterEffectsToEnemiesOfSource) && trapMetadata.counterEffectsToEnemiesOfSource.length > 0) {
        applyTriggeredEffectsToRecipients({
            effects: trapMetadata.counterEffectsToEnemiesOfSource,
            match,
            status: trapStatus,
            recipients: getAliveEnemyRecipients({
                match,
                username: trapStatus?.sourceUsername || '',
            }),
        });
    }
    const removeStatusGroupIdsOnTrigger = [
        ...(typeof trapMetadata?.removeStatusGroupIdOnTrigger === 'string' && trapMetadata.removeStatusGroupIdOnTrigger
            ? [trapMetadata.removeStatusGroupIdOnTrigger]
            : []),
        ...(Array.isArray(trapMetadata?.removeStatusGroupIdsOnTrigger)
            ? trapMetadata.removeStatusGroupIdsOnTrigger.filter((entry) => typeof entry === 'string' && entry)
            : []),
    ];
    if (removeStatusGroupIdsOnTrigger.length > 0 && recipient.username && match) {
        const removeGroups = new Set(removeStatusGroupIdsOnTrigger);
        const teamUnits = Array.isArray(match.board?.[recipient.username]) ? match.board[recipient.username] : [];
        teamUnits.forEach((teamUnit) => {
            if (!teamUnit || teamUnit.alive === false) return;
            const teamState = ensureUnitStateShape(teamUnit);
            teamState.statuses = (Array.isArray(teamState.statuses) ? teamState.statuses : []).filter((status) => {
                const groupId = status?.metadata?.statusGroupId;
                return !groupId || !removeGroups.has(groupId);
            });
        });
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

    if (!Boolean(trapMetadata?.persistOnTrigger)) {
        statuses.splice(trapIndex, 1);
    }
    targetState.statuses = statuses;
    return Boolean(trapMetadata?.counterCancelsSkill);
};

const applyDamageToUnit = (unit, rawAmount, context = {}) => {
    if (!unit || unit.alive === false || isUnitBanished(unit)) return 0;
    const targetState = ensureUnitStateShape(unit);
    const fixedDamage = Boolean(context?.fixedDamage);
    applyOnOwnerDamagedByBaseDamageBonuses({
        match: context?.match || null,
        targetState,
        targetUnit: unit,
        sourceUsername: context?.sourceUsername || null,
        targetUsername: context?.targetUsername || null,
        sourceSkillId: context?.sourceSkillId || null,
        sourceSlot: Number.isInteger(context?.sourceSlot) ? context.sourceSlot : null,
        sourceBaseDamage:
            Number.isFinite(context?.sourceBaseDamage) || Number(context?.sourceBaseDamage) === 0
                ? Number(context.sourceBaseDamage) || 0
                : Math.max(0, Number(rawAmount) || 0),
    });
    const wasAlive = unit.alive !== false;
    const hpBeforeDamage = Math.max(0, Number(unit.hp) || 0);
    const skillClasses = Array.isArray(context?.skillClasses) ? context.skillClasses : [];
    const isPhysical = skillClasses.some(
        (entry) => typeof entry === 'string' && entry.trim().toLowerCase() === 'physical'
    );
    const ignoreDamageImmunity = Boolean(context?.ignoreDamageImmunity);
    const ignoreEnemyDamage =
        !ignoreDamageImmunity &&
        hasStatusMetadataFlag(targetState, 'ignoreEnemyDamage') &&
        context?.sourceUsername &&
        context?.targetUsername &&
        context.sourceUsername !== context.targetUsername;
    if (ignoreEnemyDamage) {
        return 0;
    }
    const skillIsMental = hasSkillClass(context?.skillClasses || [], 'mental');
    const ignoreEnemyPhysicalDamage =
        !ignoreDamageImmunity &&
        hasStatusMetadataFlag(targetState, 'ignoreEnemyPhysicalDamage') &&
        context?.sourceUsername &&
        context?.targetUsername &&
        context.sourceUsername !== context.targetUsername &&
        isPhysical;
    const ignoreEnemyNonMentalDamage =
        !ignoreDamageImmunity &&
        hasStatusMetadataFlag(targetState, 'ignoreEnemyNonMentalDamage') &&
        context?.sourceUsername &&
        context?.targetUsername &&
        context.sourceUsername !== context.targetUsername &&
        !skillIsMental;
    const damageForReflection = ignoreEnemyNonMentalDamage ? Math.max(0, Number(rawAmount) || 0) : 0;
    const cannotReduceDamage = hasStatusMetadataFlag(targetState, 'cannotReduceDamage');
    let incoming = Math.max(0, Number(rawAmount) || 0);
    if (ignoreEnemyPhysicalDamage) {
        incoming = 0;
    }
    if (ignoreEnemyNonMentalDamage) {
        incoming = 0;
    }
    const incomingMultiplier = fixedDamage
        ? 1
        : Math.max(0, Number(getStatusMetadataTotals(targetState, unit).damageTakenMultiplier) || 1);
    incoming *= incomingMultiplier;
    if (incoming <= 0 && !ignoreEnemyNonMentalDamage) return 0;
    const afflictionDamage =
        Boolean(context?.afflictionDamage) ||
        skillClasses.some((entry) => typeof entry === 'string' && entry.trim().toLowerCase() === 'affliction');
    if (
        afflictionDamage &&
        !Boolean(context?.ignoreAfflictionDamageImmunity) &&
        hasStatusMetadataFlag(targetState, 'ignoreAfflictionDamage')
    ) {
        return 0;
    }
    if (incoming > 0 && !afflictionDamage) {
        const sourceBarrierResult = consumeOutgoingBarrierOnSource({
            match: context?.match || null,
            sourceUsername: context?.sourceUsername || null,
            sourceSlot: Number.isInteger(context?.sourceSlot) ? context.sourceSlot : null,
            amount: incoming,
            afflictionDamage,
        });
        incoming = sourceBarrierResult.amount;
    }
    if (incoming <= 0 && !ignoreEnemyNonMentalDamage) return 0;

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

    const totals = getStatusMetadataTotals(targetState, unit);
    const contextualMinimumHp = getContextualMinimumHp(targetState, unit, context);
    const ignoreDamageReduction = Boolean(context?.ignoreDamageReduction);
    const damageTakenBonusFlat = fixedDamage
        ? 0
        : Math.max(0, Number(totals.damageTakenBonusFlat) || 0);
    if (damageTakenBonusFlat > 0) {
        incoming += damageTakenBonusFlat;
    }
    if (!afflictionDamage) {
        incoming += Math.max(0, Number(totals.nonAfflictionDamageTakenBonusFlat) || 0);
    }
    const standardPercentReduction = ignoreDamageReduction
        ? 0
        : cannotReduceDamage
        ? 0
        : Math.min(100, Math.max(0, Number(totals.damageReductionPercent) || 0));
    let afterStandardPercent = incoming * (1 - standardPercentReduction / 100);
    const percentMitigationStateMap = context?.percentMitigationStateMap;
    const percentMitigationStateKey = context?.percentMitigationStateKey;
    if (
        standardPercentReduction > 0 &&
        percentMitigationStateMap instanceof Map &&
        percentMitigationStateKey
    ) {
        const existing = percentMitigationStateMap.get(`standard:${percentMitigationStateKey}`);
        const state =
            existing && typeof existing === 'object'
                ? existing
                : { gross: 0, prevented: 0, percent: standardPercentReduction };
        const stablePercent = Math.max(
            0,
            Math.min(100, Number(state.percent) || standardPercentReduction)
        );
        const nextGross = Math.max(0, Number(state.gross) || 0) + incoming;
        const targetPreventedTotal = nextGross * (stablePercent / 100);
        const preventedThisHit = Math.max(
            0,
            targetPreventedTotal - Math.max(0, Number(state.prevented) || 0)
        );
        afterStandardPercent = Math.max(0, incoming - preventedThisHit);
        state.gross = nextGross;
        state.prevented = Math.max(0, Number(state.prevented) || 0) + preventedThisHit;
        state.percent = stablePercent;
        percentMitigationStateMap.set(`standard:${percentMitigationStateKey}`, state);
    }
    const unpierceablePercentReduction = cannotReduceDamage
        ? 0
        : Math.min(100, Math.max(0, Number(totals.unpierceableDamageReductionPercent) || 0));
    let afterPercent = afterStandardPercent * (1 - unpierceablePercentReduction / 100);
    if (
        unpierceablePercentReduction > 0 &&
        percentMitigationStateMap instanceof Map &&
        percentMitigationStateKey
    ) {
        const existing = percentMitigationStateMap.get(`unpierceable:${percentMitigationStateKey}`);
        const state =
            existing && typeof existing === 'object'
                ? existing
                : { gross: 0, prevented: 0, percent: unpierceablePercentReduction };
        const stablePercent = Math.max(
            0,
            Math.min(100, Number(state.percent) || unpierceablePercentReduction)
        );
        const nextGross = Math.max(0, Number(state.gross) || 0) + afterStandardPercent;
        const targetPreventedTotal = nextGross * (stablePercent / 100);
        const preventedThisHit = Math.max(
            0,
            targetPreventedTotal - Math.max(0, Number(state.prevented) || 0)
        );
        afterPercent = Math.max(0, afterStandardPercent - preventedThisHit);
        state.gross = nextGross;
        state.prevented = Math.max(0, Number(state.prevented) || 0) + preventedThisHit;
        state.percent = stablePercent;
        percentMitigationStateMap.set(`unpierceable:${percentMitigationStateKey}`, state);
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
    const baseUnpierceableMitigation = cannotReduceDamage || afflictionDamage
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
    const dealt = roundCombatAmountUp(postStandardMitigation - appliedUnpierceableMitigation);
    unit.hp = Math.max(contextualMinimumHp, (Number(unit.hp) || 0) - dealt);
    if (dealt > 0) {
        setLastDamageDebug(targetState, dealt, context);
    }
    if (dealt > 0) {
        const removeIds = new Set();
        (Array.isArray(targetState.statuses) ? targetState.statuses : []).forEach((status) => {
            if (!isStatusActiveForMetadata(status, unit)) return;
            const ids = Array.isArray(status?.metadata?.removeStatusIdsOnNewDamage)
                ? status.metadata.removeStatusIdsOnNewDamage.filter((id) => typeof id === 'string' && id)
                : [];
            ids.forEach((id) => removeIds.add(id));
        });
        if (removeIds.size > 0) {
            targetState.statuses = (Array.isArray(targetState.statuses) ? targetState.statuses : []).filter(
                (status) => !removeIds.has(status?.id)
            );
            refreshDerivedStatusTooltips(targetState);
        }
        const executeThreshold = (Array.isArray(targetState.statuses) ? targetState.statuses : []).reduce(
            (lowest, status) => {
                if (!isStatusActiveForMetadata(status, unit)) return lowest;
                const threshold = Number(status?.metadata?.executeBelowHpThreshold);
                if (!Number.isFinite(threshold) || threshold < 0) return lowest;
                return lowest === null ? threshold : Math.min(lowest, threshold);
            },
            null
        );
        if (executeThreshold !== null && unit.hp <= executeThreshold) {
            unit.hp = 0;
            unit.alive = false;
        }
    }
    if (unit.hp <= 0) {
        unit.alive = false;
    }
    if (wasAlive && unit.alive === false && context?.match && context?.targetUsername) {
        triggerTeamMemberDeathHooks({
            match: context.match,
            deadUsername: context.targetUsername,
            deadSlot: Number.isInteger(context?.targetSlot) ? context.targetSlot : null,
        });
        triggerOwnerDeathHooks({
            unit,
            match: context.match,
            username: context.targetUsername,
            slot: Number.isInteger(context?.targetSlot) ? context.targetSlot : null,
        });
        triggerSourceKillHooks({
            match: context.match,
            sourceUsername: context?.sourceUsername || null,
            sourceSlot: Number.isInteger(context?.sourceSlot) ? context.sourceSlot : null,
            targetUsername: context.targetUsername,
            sourceSkillId: context?.sourceSkillId || null,
            sourceSkillClasses: skillClasses,
        });
    }
    if (
        (dealt > 0 || damageForReflection > 0) &&
        !Boolean(context?.skipDamageReflection) &&
        !hasSkillClass(skillClasses, 'unreflectable') &&
        context?.match &&
        context?.sourceUsername &&
        context?.targetUsername &&
        context.sourceUsername !== context.targetUsername &&
        Array.isArray(skillClasses) &&
        skillClasses.length > 0
    ) {
        const skillIsMental = hasSkillClass(skillClasses, 'mental');
        const sourceUnit = context?.match?.board?.[context.sourceUsername]?.[Number(context?.sourceSlot)] || null;
        if (sourceUnit && sourceUnit.alive !== false) {
            const reflectStatuses = (Array.isArray(targetState.statuses) ? targetState.statuses : []).filter((status) => {
                const remaining = Number(status?.remainingTurns) || 0;
                if (remaining <= 0) return false;
                const percent = Math.max(0, Number(status?.metadata?.reflectDamagePercent) || 0);
                if (percent <= 0) return false;
                if (skillIsMental && !Boolean(status?.metadata?.reflectDamageIncludeMental)) {
                    return false;
                }
                const excludeClasses = Array.isArray(status?.metadata?.reflectDamageExcludeSkillClasses)
                    ? status.metadata.reflectDamageExcludeSkillClasses
                          .map((entry) => normalizeSkillClassName(entry))
                          .filter(Boolean)
                    : [];
                if (
                    excludeClasses.length > 0 &&
                    excludeClasses.some((entry) => hasSkillClass(skillClasses, entry))
                ) {
                    return false;
                }
                const includeClasses = Array.isArray(status?.metadata?.reflectDamageSkillClassesAny)
                    ? status.metadata.reflectDamageSkillClassesAny
                          .map((entry) => normalizeSkillClassName(entry))
                          .filter(Boolean)
                    : [];
                if (
                    includeClasses.length > 0 &&
                    !includeClasses.some((entry) => hasSkillClass(skillClasses, entry))
                ) {
                    return false;
                }
                return true;
            });
            const reflectionBase = dealt > 0 ? dealt : damageForReflection;
            const reflectAmount = reflectStatuses.reduce((sum, status) => {
                const percent = Math.max(0, Number(status?.metadata?.reflectDamagePercent) || 0);
                return sum + Math.max(0, Math.floor((reflectionBase * percent) / 100));
            }, 0);
            if (reflectAmount > 0) {
                applyDamageToUnit(sourceUnit, reflectAmount, {
                    match: context.match,
                    sourceUsername: context.targetUsername,
                    sourceSlot: Number.isInteger(context?.targetSlot) ? context.targetSlot : null,
                    targetUsername: context.sourceUsername,
                    sourceSkillId: context?.sourceSkillId || null,
                    skillClasses: ['affliction'],
                    damageDebugLabel: 'Damage Reflect',
                    damageDebugReason: 'reflect',
                    skipDamageReflection: true,
                });
            }
        }
    }
    if (dealt > 0 && context?.match && context?.sourceUsername && context?.targetUsername) {
        const sourceUnit = context?.match?.board?.[context.sourceUsername]?.[Number(context?.sourceSlot)] || null;
        const sourceState = sourceUnit ? ensureUnitStateShape(sourceUnit) : null;
        const sourceSkillClasses = Array.isArray(context?.skillClasses) ? context.skillClasses : [];
        applyOnTeamMemberDamageTakenBonuses({
            match: context.match,
            actingUsername: context.sourceUsername,
            targetUnit: unit,
            targetUsername: context.targetUsername,
            targetSlot: Number.isInteger(context?.targetSlot) ? context.targetSlot : null,
            targetHpBefore: hpBeforeDamage,
            sourceSkillId: context?.sourceSkillId || null,
            sourceSkillClasses,
            sourceSlot: context?.sourceSlot ?? null,
            afflictionDamage: Boolean(context?.afflictionDamage),
        });
    }
    return dealt;
};

const applyHealToUnit = (unit, rawAmount) => {
    if (!unit || unit.alive === false || isUnitBanished(unit)) return 0;
    const targetState = ensureUnitStateShape(unit);
    if (Math.max(0, Number(rawAmount) || 0) > 0) {
        targetState.statuses = (Array.isArray(targetState.statuses) ? targetState.statuses : []).filter(
            (status) => !Boolean(status?.metadata?.removeOnHealingEffect)
        );
        refreshDerivedStatusTooltips(targetState);
    }
    const totals = getStatusMetadataTotals(targetState);
    const heal = Math.max(0, Number(rawAmount) || 0) * Math.max(0, Number(totals.healReceivedMultiplier) || 0);
    const before = Number(unit.hp) || 0;
    const cap = Math.max(0, Number(unit?.hpCap) || DEFAULT_HP);
    unit.hp = Math.min(DEFAULT_HP, cap, before + heal);
    return Math.max(0, unit.hp - before);
};

const applyDirectHpGainToUnit = (unit, rawAmount) => {
    if (!unit || unit.alive === false || isUnitBanished(unit)) return 0;
    const gain = Math.max(0, Number(rawAmount) || 0);
    if (gain <= 0) return 0;
    const before = Number(unit.hp) || 0;
    const cap = Math.max(0, Number(unit?.hpCap) || DEFAULT_HP);
    unit.hp = Math.min(DEFAULT_HP, cap, before + gain);
    return Math.max(0, unit.hp - before);
};

const applyHealthStealToUnit = ({ targetUnit, sourceUnit, rawAmount, context = {} }) => {
    if (!targetUnit || !sourceUnit) {
        return applyDamageToUnit(targetUnit, rawAmount, {
            ...context,
            ignoreDamageReduction: true,
        });
    }
    const dealt = applyDamageToUnit(targetUnit, rawAmount, {
        ...context,
        ignoreDamageReduction: true,
    });
    if (dealt > 0) {
        applyDirectHpGainToUnit(sourceUnit, dealt);
    }
    return dealt;
};

const applyHealthLossToUnit = (unit, rawAmount, context = {}) => {
    if (!unit || unit.alive === false || isUnitBanished(unit)) return 0;
    const wasAlive = unit.alive !== false;
    const loss = roundCombatAmountUp(rawAmount);
    if (loss <= 0) return 0;
    const before = Math.max(0, Number(unit.hp) || 0);
    const targetState = ensureUnitStateShape(unit);
    const contextualMinimumHp = getContextualMinimumHp(targetState, unit, context);
    unit.hp = Math.max(contextualMinimumHp, before - loss);
    setLastDamageDebug(targetState, loss, context);
    if (unit.hp <= 0) {
        unit.alive = false;
    }
    if (wasAlive && unit.alive === false && context?.match && context?.targetUsername) {
        triggerTeamMemberDeathHooks({
            match: context.match,
            deadUsername: context.targetUsername,
            deadSlot: Number.isInteger(context?.targetSlot) ? context.targetSlot : null,
        });
        triggerOwnerDeathHooks({
            unit,
            match: context.match,
            username: context.targetUsername,
            slot: Number.isInteger(context?.targetSlot) ? context.targetSlot : null,
        });
        triggerSourceKillHooks({
            match: context.match,
            sourceUsername: context?.sourceUsername || null,
            sourceSlot: Number.isInteger(context?.sourceSlot) ? context.sourceSlot : null,
            targetUsername: context.targetUsername,
            sourceSkillId: context?.sourceSkillId || null,
            sourceSkillClasses: Array.isArray(context?.skillClasses) ? context.skillClasses : [],
        });
    }
    return Math.max(0, before - unit.hp);
};

const applyHealthCapLossToUnit = (unit, rawAmount, context = {}) => {
    if (!unit || unit.alive === false || isUnitBanished(unit)) return 0;
    const wasAlive = unit.alive !== false;
    const loss = roundCombatAmountUp(rawAmount);
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
    if (wasAlive && unit.alive === false && context?.match && context?.targetUsername) {
        triggerTeamMemberDeathHooks({
            match: context.match,
            deadUsername: context.targetUsername,
            deadSlot: Number.isInteger(context?.targetSlot) ? context.targetSlot : null,
        });
        triggerOwnerDeathHooks({
            unit,
            match: context.match,
            username: context.targetUsername,
            slot: Number.isInteger(context?.targetSlot) ? context.targetSlot : null,
        });
        triggerSourceKillHooks({
            match: context.match,
            sourceUsername: context?.sourceUsername || null,
            sourceSlot: Number.isInteger(context?.sourceSlot) ? context.sourceSlot : null,
            targetUsername: context.targetUsername,
            sourceSkillId: context?.sourceSkillId || null,
            sourceSkillClasses: Array.isArray(context?.skillClasses) ? context.skillClasses : [],
        });
    }
    return Math.max(0, beforeCap - nextCap);
};

const destroyAllDestructibleDefenseOnUnit = (unit) => {
    if (!unit || unit.alive === false) return 0;
    const targetState = ensureUnitStateShape(unit);
    const statuses = Array.isArray(targetState.statuses) ? targetState.statuses : [];
    let removedPoints = 0;
    const removeIds = new Set();
    const applyOnBreakStatuses = [];
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
        const onBreakApplyStatusToSelf = status?.metadata?.onBreakApplyStatusToSelf;
        if (onBreakApplyStatusToSelf?.statusId) {
            applyOnBreakStatuses.push({
                statusId: onBreakApplyStatusToSelf.statusId,
                duration: onBreakApplyStatusToSelf.duration,
                sourceSkillId: status?.sourceSkillId || null,
                sourceUsername: status?.sourceUsername || null,
                sourceSlot: Number.isInteger(status?.sourceSlot) ? status.sourceSlot : null,
                metadata: onBreakApplyStatusToSelf.metadata || {},
            });
        }
    });
    targetState.statuses = survivors.filter((entry) => !removeIds.has(entry?.id));
    applyOnBreakStatuses.forEach((statusConfig) => {
        applyStatus({
            targetState,
            statusId: statusConfig.statusId,
            duration: statusConfig.duration,
            sourceSkillId: statusConfig.sourceSkillId,
            sourceUsername: statusConfig.sourceUsername,
            sourceSlot: statusConfig.sourceSlot,
            metadata: statusConfig.metadata,
            fresh: false,
        });
    });
    return removedPoints;
};

const consumeOutgoingBarrierOnSource = ({
    match,
    sourceUsername,
    sourceSlot,
    amount,
    afflictionDamage = false,
}) => {
    const outgoingAmount = Math.max(0, Number(amount) || 0);
    if (
        outgoingAmount <= 0 ||
        afflictionDamage ||
        !match ||
        !sourceUsername ||
        !Number.isInteger(sourceSlot)
    ) {
        return { amount: outgoingAmount, consumed: 0 };
    }
    const sourceUnit = match.board?.[sourceUsername]?.[Number(sourceSlot)] || null;
    if (!sourceUnit) {
        return { amount: outgoingAmount, consumed: 0 };
    }
    const sourceState = ensureUnitStateShape(sourceUnit);
    const statuses = Array.isArray(sourceState.statuses) ? sourceState.statuses : [];
    let remainingAmount = outgoingAmount;
    const removeIds = new Set();
    const applyOnBreakStatuses = [];
    const survivors = [];
    let changed = false;

    statuses.forEach((status) => {
        const points = Math.max(0, Number(status?.metadata?.barrierPoints) || 0);
        if (points <= 0 || remainingAmount <= 0) {
            survivors.push(status);
            return;
        }
        const absorbed = Math.min(remainingAmount, points);
        if (absorbed <= 0) {
            survivors.push(status);
            return;
        }
        remainingAmount -= absorbed;
        changed = true;
        const remainingPoints = points - absorbed;
        const nextMetadata = { ...(status.metadata || {}), barrierPoints: remainingPoints };
        if (remainingPoints <= 0) {
            const removeStatusIdsOnBreak = Array.isArray(status?.metadata?.removeStatusIdsOnBreak)
                ? status.metadata.removeStatusIdsOnBreak.filter((id) => typeof id === 'string' && id)
                : [];
            removeStatusIdsOnBreak.forEach((id) => removeIds.add(id));
            const onBreakApplyStatusToSelf = status?.metadata?.onBreakApplyStatusToSelf;
            if (onBreakApplyStatusToSelf?.statusId) {
                applyOnBreakStatuses.push({
                    statusId: onBreakApplyStatusToSelf.statusId,
                    duration: onBreakApplyStatusToSelf.duration,
                    sourceSkillId: status?.sourceSkillId || null,
                    sourceUsername: status?.sourceUsername || null,
                    sourceSlot: Number.isInteger(status?.sourceSlot) ? status.sourceSlot : null,
                    metadata: onBreakApplyStatusToSelf.metadata || {},
                });
            }
            return;
        }
        status.metadata = nextMetadata;
        survivors.push(status);
    });

    if (!changed) {
        return { amount: outgoingAmount, consumed: 0 };
    }

    sourceState.statuses = survivors.filter((entry) => !removeIds.has(entry?.id));
    applyOnBreakStatuses.forEach((statusConfig) => {
        applyStatus({
            targetState: sourceState,
            statusId: statusConfig.statusId,
            duration: statusConfig.duration,
            sourceSkillId: statusConfig.sourceSkillId,
            sourceUsername: statusConfig.sourceUsername,
            sourceSlot: statusConfig.sourceSlot,
            metadata: statusConfig.metadata,
            fresh: false,
        });
    });
    refreshDerivedStatusTooltips(sourceState);
    return {
        amount: remainingAmount,
        consumed: outgoingAmount - remainingAmount,
    };
};

const triggerTeamMemberDeathHooks = ({ match, deadUsername, deadSlot = null }) => {
    if (!match || !deadUsername) return;
    const teamUnits = Array.isArray(match.board?.[deadUsername]) ? match.board[deadUsername] : [];

    if (teamUnits.length > 0) {
        teamUnits.forEach((teamUnit, teamSlot) => {
            if (!teamUnit || teamUnit.alive === false) return;
            if (Number.isInteger(deadSlot) && teamSlot === deadSlot) return;
            const teamState = ensureUnitStateShape(teamUnit);
            let changed = false;
            (Array.isArray(teamState.statuses) ? teamState.statuses : []).forEach((status) => {
                if (!isStatusActiveForMetadata(status, teamUnit)) return;
                const metadata = status?.metadata || {};
                if (!Boolean(metadata.onTeamMemberDeathQueueTurnStartChoice)) return;
                const maxUses = Math.max(0, Number(metadata.turnStartChoiceMaxUses) || 0);
                const usesUsed = Math.max(0, Number(metadata.turnStartChoiceUsesUsed) || 0);
                if (maxUses > 0 && usesUsed >= maxUses) return;
                if (Boolean(metadata.turnStartChoiceQueued)) return;
                status.metadata = {
                    ...metadata,
                    turnStartChoiceQueued: true,
                    turnStartChoiceQueuedTurnCount: Number(match?.economy?.turnCounts?.[deadUsername]) || 0,
                };
                changed = true;
            });
            (Array.isArray(teamState.statuses) ? teamState.statuses : []).forEach((status) => {
                if (!isStatusActiveForMetadata(status, teamUnit)) return;
                const applyStatusToRandomEnemy = status?.metadata?.onTeamMemberDeathApplyStatusToRandomEnemy;
                if (!applyStatusToRandomEnemy?.statusId) return;
                const enemies = getAliveEnemyRecipients({ match, username: deadUsername });
                if (!enemies.length) return;
                const picked = pickRandomEntry(enemies);
                if (!picked?.unit) return;
                applyStatus({
                    targetState: ensureUnitStateShape(picked.unit),
                    statusId: applyStatusToRandomEnemy.statusId,
                    duration: applyStatusToRandomEnemy.duration,
                    sourceSkillId: status?.sourceSkillId || null,
                    sourceUsername: deadUsername,
                    sourceSlot: teamSlot,
                    metadata: applyStatusToRandomEnemy.metadata || {},
                    fresh: false,
                });
            });
            if (changed) {
                refreshDerivedStatusTooltips(teamState);
            }
        });
    }

    (match.players || []).forEach((player) => {
        const ownerUsername = player?.username;
        if (!ownerUsername) return;
        const ownerUnits = Array.isArray(match.board?.[ownerUsername]) ? match.board[ownerUsername] : [];
        ownerUnits.forEach((ownerUnit, ownerSlot) => {
            if (!ownerUnit || ownerUnit.alive === false) return;
            if (ownerUsername === deadUsername && Number.isInteger(deadSlot) && ownerSlot === deadSlot) return;
            const ownerState = ensureUnitStateShape(ownerUnit);
            (Array.isArray(ownerState.statuses) ? ownerState.statuses : []).forEach((status) => {
                if (!isStatusActiveForMetadata(status, ownerUnit)) return;
                const applyStatusToRandomEnemy = status?.metadata?.onAnyCharacterDeathApplyStatusToRandomEnemy;
                if (!applyStatusToRandomEnemy?.statusId) return;
                const enemies = getAliveEnemyRecipients({ match, username: ownerUsername });
                if (!enemies.length) return;
                const picked = pickRandomEntry(enemies);
                if (!picked?.unit) return;
                applyStatus({
                    targetState: ensureUnitStateShape(picked.unit),
                    statusId: applyStatusToRandomEnemy.statusId,
                    duration: applyStatusToRandomEnemy.duration,
                    sourceSkillId: status?.sourceSkillId || null,
                    sourceUsername: ownerUsername,
                    sourceSlot: ownerSlot,
                    metadata: applyStatusToRandomEnemy.metadata || {},
                    fresh: false,
                });
            });
        });
    });
};

const triggerOwnerDeathHooks = ({ unit, match, username, slot }) => {
    if (!unit || !match || !username || !Number.isInteger(slot)) return;
    const targetState = ensureUnitStateShape(unit);
    let changed = false;
    (Array.isArray(targetState.statuses) ? targetState.statuses : []).forEach((status) => {
        if (!isStatusActiveForMetadata(status, unit)) return;
        const metadata = status?.metadata || {};
        const onOwnerDeathApplyStatusToSelf = metadata?.onOwnerDeathApplyStatusToSelf;
        const onOwnerDeathApplyStatusToSource = metadata?.onOwnerDeathApplyStatusToSource;
        const reviveToHp = Number(metadata?.onOwnerDeathReviveToHp);

        const hasRevive = Number.isFinite(reviveToHp) && reviveToHp > 0;
        const hasApplyToSelf = onOwnerDeathApplyStatusToSelf?.statusId;
        const hasApplyToSource = onOwnerDeathApplyStatusToSource?.statusId;

        if (!hasRevive && !hasApplyToSelf && !hasApplyToSource) return;
        if (Boolean(metadata?._onOwnerDeathTriggered)) return;

        metadata._onOwnerDeathTriggered = true;
        status.metadata = metadata;

        if (hasRevive) {
            reviveUnitToHp(unit, reviveToHp);
        }

        if (hasApplyToSelf) {
            applyStatus({
                targetState,
                statusId: onOwnerDeathApplyStatusToSelf.statusId,
                duration: onOwnerDeathApplyStatusToSelf.duration,
                sourceSkillId: status?.sourceSkillId || null,
                sourceUsername: status?.sourceUsername || null,
                sourceSlot: Number.isInteger(status?.sourceSlot) ? status.sourceSlot : null,
                metadata: onOwnerDeathApplyStatusToSelf.metadata || {},
                fresh: false,
            });
        }

        if (hasApplyToSource && status.sourceUsername) {
            const sourceUnit = (match.board?.[status.sourceUsername] || [])[status.sourceSlot];
            if (sourceUnit) {
                applyStatus({
                    targetState: ensureUnitStateShape(sourceUnit),
                    statusId: onOwnerDeathApplyStatusToSource.statusId,
                    duration: onOwnerDeathApplyStatusToSource.duration,
                    sourceSkillId: status?.sourceSkillId || null,
                    sourceUsername: status?.sourceUsername || null,
                    sourceSlot: Number.isInteger(status?.sourceSlot) ? status.sourceSlot : null,
                    metadata: onOwnerDeathApplyStatusToSource.metadata || {},
                    fresh: false,
                });
            }
        }

        changed = true;
    });
    if (changed) {
        refreshDerivedStatusTooltips(targetState);
    }
};

const triggerSourceKillHooks = ({
    match,
    sourceUsername,
    sourceSlot = null,
    targetUsername = null,
    sourceSkillId = null,
    sourceSkillClasses = [],
}) => {
    if (!match || !sourceUsername || !Number.isInteger(sourceSlot)) return;
    const sourceUnit = match.board?.[sourceUsername]?.[Number(sourceSlot)] || null;
    if (!sourceUnit || sourceUnit.alive === false) return;
    const sourceState = ensureUnitStateShape(sourceUnit);
    (Array.isArray(sourceState.statuses) ? sourceState.statuses : []).forEach((status) => {
        if (!isStatusActiveForMetadata(status, sourceUnit)) return;
        const metadata = status?.metadata || {};
        const targetRelation =
            typeof metadata.onOwnerKillTargetRelation === 'string'
                ? metadata.onOwnerKillTargetRelation.trim().toLowerCase()
                : 'any';
        if (targetRelation === 'enemy' && sourceUsername === targetUsername) return;
        if (targetRelation === 'ally' && sourceUsername !== targetUsername) return;
        const skillIdFilter = Array.isArray(metadata.onOwnerKillSourceSkillIdsAny)
            ? metadata.onOwnerKillSourceSkillIdsAny.filter((entry) => typeof entry === 'string' && entry)
            : [];
        if (skillIdFilter.length > 0 && !skillIdFilter.includes(sourceSkillId || '')) {
            return;
        }
        const classFilter = Array.isArray(metadata.onOwnerKillSourceSkillClassesAny)
            ? metadata.onOwnerKillSourceSkillClassesAny
                  .map((entry) => normalizeSkillClassName(entry))
                  .filter(Boolean)
            : [];
        if (
            classFilter.length > 0 &&
            !classFilter.some((entry) => hasSkillClass(sourceSkillClasses, entry))
        ) {
            return;
        }
        const healAmount = Math.max(0, Number(metadata.onOwnerKillHealSelfAmount) || 0);
        if (healAmount > 0) {
            applyHealToUnit(sourceUnit, healAmount);
        }
        const gainChakraConfig =
            metadata?.onOwnerKillGainChakra && typeof metadata.onOwnerKillGainChakra === 'object'
                ? metadata.onOwnerKillGainChakra
                : null;
        if (gainChakraConfig?.chakraType) {
            const chakraAmount = Math.max(0, Number(gainChakraConfig.amount) || 0);
            if (chakraAmount > 0) {
                const chakraType = String(gainChakraConfig.chakraType).trim().toLowerCase();
                if (chakraType === 'random') {
                    for (let i = 0; i < chakraAmount; i += 1) {
                        const pick = chakraTypes[Math.floor(Math.random() * chakraTypes.length)];
                        applyChakraGainToMatch({
                            match,
                            username: sourceUsername,
                            chakraType: pick,
                            amount: 1,
                        });
                    }
                } else {
                    applyChakraGainToMatch({
                        match,
                        username: sourceUsername,
                        chakraType,
                        amount: chakraAmount,
                    });
                }
            }
        }
        const applyStatusToSelf = metadata.onOwnerKillApplyStatusToSelf;
        if (applyStatusToSelf?.statusId) {
            applyStatus({
                targetState: sourceState,
                statusId: applyStatusToSelf.statusId,
                duration: applyStatusToSelf.duration,
                sourceSkillId: resolveTriggeredEffectSourceSkillId({
                    status,
                    config: applyStatusToSelf,
                    fallbackSkillId: sourceSkillId,
                }),
                sourceUsername,
                sourceSlot,
                metadata: applyStatusToSelf.metadata || {},
                fresh: false,
            });
        }
    });
};

const triggerOnEnemySkillTargetedBonuses = ({
    match,
    actingUsername,
    actorUnit,
    actorSlot = null,
    recipient,
    skill,
}) => {
    if (!match || !actingUsername || !actorUnit || !recipient?.unit) return;
    if (!recipient.username || recipient.username === actingUsername) return;
    const targetUnit = recipient.unit;
    const targetState = ensureUnitStateShape(targetUnit);
    (Array.isArray(targetState.statuses) ? targetState.statuses : []).forEach((status) => {
        if (!isStatusActiveForMetadata(status, targetUnit)) return;
        const metadata = status?.metadata || {};
        const missingStatusId =
            typeof metadata.onEnemySkillTargetedMissingStatusId === 'string'
                ? metadata.onEnemySkillTargetedMissingStatusId.trim()
                : '';
        if (missingStatusId && hasStatus(targetState, missingStatusId)) {
            return;
        }
        if (Boolean(metadata.onEnemySkillTargetedHarmfulOnly) && !skillHasHarmfulEffects(skill)) {
            return;
        }
        const classFilter = Array.isArray(metadata.onEnemySkillTargetedSkillClassesAny)
            ? metadata.onEnemySkillTargetedSkillClassesAny
                  .map((entry) => normalizeSkillClassName(entry))
                  .filter(Boolean)
            : [];
        if (classFilter.length > 0 && !classFilter.some((entry) => hasSkillClass(skill?.classes || [], entry))) {
            return;
        }
        if (Boolean(metadata.onEnemySkillTargetedOncePerTurn)) {
            const turnCount = Math.max(0, Number(match?.economy?.turnCounts?.[actingUsername] || 0));
            const triggerKey = `${actingUsername}:${turnCount}`;
            if (metadata._lastOnEnemySkillTargetedTurnKey === triggerKey) return;
            metadata._lastOnEnemySkillTargetedTurnKey = triggerKey;
            status.metadata = metadata;
        }
        const retaliateDamage = Math.max(0, Number(metadata.onEnemySkillTargetedDamageToSourceAmount) || 0);
        if (retaliateDamage > 0) {
            applyDamageToUnit(actorUnit, retaliateDamage, {
                match,
                sourceUsername: recipient.username,
                sourceSlot: Number.isInteger(recipient.slot) ? recipient.slot : null,
                sourceSkillId: status?.sourceSkillId || null,
                targetUsername: actingUsername,
                targetSlot: Number.isInteger(actorSlot) ? actorSlot : null,
                damageDebugReason: 'targeted trigger',
                ignoreDamageReduction: Boolean(metadata.onEnemySkillTargetedDamageToSourceIgnoreDamageReduction),
                ignoreDestructibleDefense: Boolean(
                    metadata.onEnemySkillTargetedDamageToSourceIgnoreDestructibleDefense
                ),
                skillClasses: Array.isArray(metadata.onEnemySkillTargetedDamageToSourceSkillClasses)
                    ? metadata.onEnemySkillTargetedDamageToSourceSkillClasses
                    : [],
            });
        }
        const applyStatusToSource = metadata.onEnemySkillTargetedApplyStatusToSource;
        if (applyStatusToSource?.statusId) {
            applyStatus({
                targetState: ensureUnitStateShape(actorUnit),
                statusId: applyStatusToSource.statusId,
                duration: applyStatusToSource.duration,
                sourceSkillId: status?.sourceSkillId || null,
                sourceUsername: recipient.username,
                sourceSlot: Number.isInteger(recipient.slot) ? recipient.slot : null,
                metadata: applyStatusToSource.metadata || {},
                fresh: Boolean(applyStatusToSource.fresh),
            });
        }
        const applyStatusToOwner = metadata.onEnemySkillTargetedApplyStatusToOwner;
        if (applyStatusToOwner?.statusId) {
            applyStatus({
                targetState,
                statusId: applyStatusToOwner.statusId,
                duration: applyStatusToOwner.duration,
                sourceSkillId: status?.sourceSkillId || null,
                sourceUsername: recipient.username,
                sourceSlot: Number.isInteger(recipient.slot) ? recipient.slot : null,
                metadata: applyStatusToOwner.metadata || {},
                fresh: Boolean(applyStatusToOwner.fresh),
            });
        }
        if (Boolean(metadata.onEnemySkillTargetedApplyRandomParasitePositiveStateToOwner)) {
            applyParasiteAbsorptionState({
                targetState,
                kind: 'positive',
                variant: 'random',
                sourceSkillId: status?.sourceSkillId || null,
                sourceUsername: recipient.username,
                sourceSlot: Number.isInteger(recipient.slot) ? recipient.slot : null,
                fresh: true,
            });
        }
    });
};

const reviveUnitToHp = (unit, rawAmount) => {
    if (!unit) return 0;
    const before = Math.max(0, Number(unit.hp) || 0);
    const cap = Math.max(1, Number(unit?.hpCap) || DEFAULT_HP);
    const amount = Math.max(1, Math.min(DEFAULT_HP, Number(rawAmount) || 0));
    unit.alive = true;
    unit.hp = Math.min(DEFAULT_HP, cap, amount);
    return Math.max(0, unit.hp - before);
};

const getTurnStartChoiceTargetOptions = ({ match, actingUsername, choice = {} }) => {
    if (!match || !actingUsername || !choice || typeof choice !== 'object') return [];
    const teamUnits = Array.isArray(match.board?.[actingUsername]) ? match.board[actingUsername] : [];
    if (!teamUnits.length) return [];
    const targetStrategy =
        typeof choice?.targetStrategy === 'string' ? choice.targetStrategy.trim().toLowerCase() : '';
    const isAliveTarget = (unit) => unit && unit.alive !== false && !isUnitBanished(unit);
    const allies = teamUnits
        .map((unit, slot) => ({ unit, slot, username: actingUsername }))
        .filter((entry) => entry?.unit);

    const aliveAllies = allies.filter((entry) => isAliveTarget(entry.unit));
    const deadAllies = allies.filter((entry) => entry.unit && entry.unit.alive === false);
    const aliveEnemies = getAliveEnemyRecipients({ match, username: actingUsername }).filter((entry) =>
        isAliveTarget(entry.unit)
    );

    if (targetStrategy === 'dead-ally-first' || targetStrategy === 'dead-ally-lowest-slot') {
        return deadAllies;
    }
    if (
        targetStrategy === 'alive-enemy-first' ||
        targetStrategy === 'single-enemy' ||
        targetStrategy === 'enemy'
    ) {
        return aliveEnemies;
    }
    if (
        targetStrategy === 'alive-ally-most-harmful' ||
        targetStrategy === 'alive-ally-lowest-hp' ||
        targetStrategy === 'alive-ally-first' ||
        targetStrategy === 'single-ally' ||
        targetStrategy === 'ally'
    ) {
        return aliveAllies;
    }
    return [...aliveAllies, ...deadAllies];
};

const selectTurnStartChoiceTarget = ({ match, actingUsername, choice = {}, manualTarget = null }) => {
    if (!match || !actingUsername || !choice || typeof choice !== 'object') return null;

    const availableTargets = getTurnStartChoiceTargetOptions({ match, actingUsername, choice });

    if (manualTarget && typeof manualTarget === 'object') {
        const { username, slot } = manualTarget;
        if (typeof username === 'string' && Number.isInteger(slot)) {
            return (
                availableTargets.find(
                    (entry) => entry?.username === username && Number(entry?.slot) === slot && entry?.unit
                ) || null
            );
        }
    }

    const targetStrategy =
        typeof choice?.targetStrategy === 'string' ? choice.targetStrategy.trim().toLowerCase() : '';
    const harmfulCountForUnit = (unit) => {
        const state = ensureUnitStateShape(unit);
        return (Array.isArray(state.statuses) ? state.statuses : []).reduce((sum, status) => {
            const remaining = Number(status?.remainingTurns) || 0;
            if (remaining <= 0) return sum;
            return sum + (Boolean(status?.metadata?.harmful) ? 1 : 0);
        }, 0);
    };

    if (targetStrategy === 'dead-ally-first' || targetStrategy === 'dead-ally-lowest-slot') {
        return availableTargets[0] || null;
    }
    if (targetStrategy === 'alive-ally-most-harmful') {
        const sorted = availableTargets
            .slice()
            .sort((a, b) => {
                const harmA = harmfulCountForUnit(a.unit);
                const harmB = harmfulCountForUnit(b.unit);
                if (harmA !== harmB) return harmB - harmA;
                const hpA = Math.max(0, Number(a.unit?.hp) || 0);
                const hpB = Math.max(0, Number(b.unit?.hp) || 0);
                if (hpA !== hpB) return hpA - hpB;
                return a.slot - b.slot;
            });
        return sorted[0] || null;
    }
    if (targetStrategy === 'alive-ally-lowest-hp') {
        const sorted = availableTargets
            .slice()
            .sort((a, b) => {
                const hpA = Math.max(0, Number(a.unit?.hp) || 0);
                const hpB = Math.max(0, Number(b.unit?.hp) || 0);
                if (hpA !== hpB) return hpA - hpB;
                return a.slot - b.slot;
            });
        return sorted[0] || null;
    }
    if (targetStrategy === 'alive-ally-first' || targetStrategy === 'single-ally') {
        return availableTargets[0] || null;
    }
    if (targetStrategy === 'alive-enemy-first' || targetStrategy === 'single-enemy') {
        return availableTargets[0] || null;
    }
    return availableTargets[0] || null;
};

const queueTurnStartChoicePrompts = ({ match, startingUsername }) => {
    if (!match || !startingUsername) return null;
    if (!match.pendingTurns || typeof match.pendingTurns !== 'object') {
        match.pendingTurns = {};
    }
    const pending = match.pendingTurns[startingUsername];
    if (pending?.turnStartChoice?.options?.length > 0) {
        return pending.turnStartChoice;
    }

    const teamUnits = Array.isArray(match.board?.[startingUsername]) ? match.board[startingUsername] : [];
    for (let slot = 0; slot < teamUnits.length; slot += 1) {
        const unit = teamUnits[slot];
        if (!unit) continue;
        const state = ensureUnitStateShape(unit);
        const statuses = Array.isArray(state.statuses) ? state.statuses : [];
        for (const status of statuses) {
            if (!isStatusActiveForMetadata(status, unit)) continue;
            const metadata = status?.metadata || {};
            const maxUses = Math.max(0, Number(metadata.turnStartChoiceMaxUses) || 0);
            const usesUsed = Math.max(0, Number(metadata.turnStartChoiceUsesUsed) || 0);
            if (maxUses > 0 && usesUsed >= maxUses) continue;
            if (!Boolean(metadata.turnStartChoiceQueued)) continue;
            const options = Array.isArray(metadata.turnStartChoiceOptions)
                ? metadata.turnStartChoiceOptions
                      .map((choice) => {
                          if (!choice || typeof choice !== 'object') return null;
                          const key =
                              typeof choice.key === 'string' && choice.key.trim()
                                  ? choice.key.trim().toLowerCase()
                                  : '';
                          const label =
                              typeof choice.label === 'string' && choice.label.trim()
                                  ? choice.label.trim()
                                  : '';
                          if (!key || !label) return null;
                          return {
                              key,
                              label,
                              targetStrategy:
                                  typeof choice.targetStrategy === 'string'
                                      ? choice.targetStrategy.trim().toLowerCase()
                                      : '',
                              effect:
                                  choice.effect && typeof choice.effect === 'object'
                                      ? { ...choice.effect }
                                      : null,
                              effects: Array.isArray(choice.effects)
                                  ? choice.effects
                                        .filter((effect) => effect && typeof effect === 'object')
                                        .map((effect) => ({ ...effect }))
                                  : null,
                          };
                      })
                      .filter(Boolean)
                : [];
            if (!options.length) continue;
            const nextPending = pending && typeof pending === 'object' ? { ...pending } : {};
            nextPending.turnStartChoice = {
                actorSlot: slot,
                sourceSkillId: status?.sourceSkillId || null,
                sourceUsername: status?.sourceUsername || startingUsername,
                sourceSlot: Number.isInteger(status?.sourceSlot) ? status.sourceSlot : slot,
                sourceStatusId: status?.id || null,
                promptText:
                    typeof metadata.turnStartChoicePromptText === 'string' &&
                    metadata.turnStartChoicePromptText.trim()
                        ? metadata.turnStartChoicePromptText.trim()
                        : 'Choose an effect.',
                options,
                maxUses: Math.max(0, Number(metadata.turnStartChoiceMaxUses) || 0),
                usesUsed: Math.max(0, Number(metadata.turnStartChoiceUsesUsed) || 0),
            };
            match.pendingTurns[startingUsername] = nextPending;
            return nextPending.turnStartChoice;
        }
    }
    return null;
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
    const pending = match.pendingTurns?.[username];
    const randomAssignments =
        pending && pending.randomAssignments && typeof pending.randomAssignments === 'object'
            ? pending.randomAssignments
            : null;
    let removed = 0;
    for (let i = 0; i < lossAmount; i += 1) {
        const available = chakraTypes.filter((type) => (Number(pool[type]) || 0) > 0);
        if (available.length) {
            const pick = available[Math.floor(Math.random() * available.length)];
            pool[pick] = Math.max(0, (Number(pool[pick]) || 0) - 1);
            removed += 1;
            continue;
        }
        const assigned = randomAssignments
            ? chakraTypes.filter((type) => (Number(randomAssignments[type]) || 0) > 0)
            : [];
        if (!assigned.length) break;
        const pick = assigned[Math.floor(Math.random() * assigned.length)];
        randomAssignments[pick] = Math.max(0, (Number(randomAssignments[pick]) || 0) - 1);
        if (pending) {
            pending.unresolvedRandom = Math.max(0, (Number(pending.unresolvedRandom) || 0) + 1);
            match.pendingTurns[username] = pending;
        }
        removed += 1;
    }
    match.chakraPools[username] = pool;
    return removed;
};

const cleanseHarmfulStatuses = (unit, count = 1) => {
    if (!unit || unit.alive === false) return 0;
    const targetState = ensureUnitStateShape(unit);
    const numericCount = Number(count);
    const maxCount = Number.isFinite(numericCount) && numericCount > 0 ? Math.floor(numericCount) : Infinity;
    let removed = 0;
    targetState.statuses = targetState.statuses.filter((status) => {
        if (removed >= maxCount) return true;
        const harmful = Boolean(status?.metadata?.harmful);
        if (!harmful || Boolean(status?.metadata?.unremovable)) return true;
        removed += 1;
        return false;
    });
    refreshDerivedStatusTooltips(targetState);
    return removed;
};

const cleanseEnemyAfflictionStatuses = (unit, ownerUsername, count = 0) => {
    if (!unit || unit.alive === false || !ownerUsername) return 0;
    const targetState = ensureUnitStateShape(unit);
    const numericCount = Number(count);
    const maxCount = Number.isFinite(numericCount) && numericCount > 0 ? Math.floor(numericCount) : Infinity;
    let removed = 0;
    targetState.statuses = targetState.statuses.filter((status) => {
        if (removed >= maxCount) return true;
        const sourceUsername = typeof status?.sourceUsername === 'string' ? status.sourceUsername : '';
        if (!sourceUsername || sourceUsername === ownerUsername) return true;
        if (!Boolean(status?.metadata?.afflictionDamage)) return true;
        if (Boolean(status?.metadata?.unremovable)) return true;
        removed += 1;
        return false;
    });
    refreshDerivedStatusTooltips(targetState);
    return removed;
};

const getSkillByIndices = (characters, rosterIndex, skillIndex, actorState = null) =>
    resolveEffectiveSkill({ characters, rosterIndex, skillIndex, actorState });

const cancelChanneledStatusesForActor = ({ match, sourceUsername, sourceSlot, nextSkillId }) => {
    if (!match || !sourceUsername || !Number.isInteger(sourceSlot)) return;
    const nextId = typeof nextSkillId === 'string' ? nextSkillId : '';
    Object.values(match.board || {}).forEach((team = []) => {
        (Array.isArray(team) ? team : []).forEach((unit) => {
            if (!unit || unit.alive === false) return;
            const state = ensureUnitStateShape(unit);
            state.statuses = (Array.isArray(state.statuses) ? state.statuses : []).filter((status) => {
                const ongoingClass =
                    typeof status?.metadata?.ongoingClass === 'string'
                        ? status.metadata.ongoingClass.trim().toLowerCase()
                        : '';
                if (ongoingClass !== 'channeled') return true;
                if (status?.sourceUsername !== sourceUsername || status?.sourceSlot !== sourceSlot) return true;
                if (nextId && status?.sourceSkillId === nextId) return true;
                return false;
            });
            refreshDerivedStatusTooltips(state);
        });
    });
};

const resolvePendingTurnSkills = ({ match, actingUsername, characters }) => {
    if (!match || !actingUsername) return;
    const pending = match.pendingTurns?.[actingUsername];
    if (!pending || !pending.queuedByActorSlot) return;
    if (!match._manualSkillActorSlotsByUsername || typeof match._manualSkillActorSlotsByUsername !== 'object') {
        match._manualSkillActorSlotsByUsername = {};
    }
    match._manualSkillActorSlotsByUsername[actingUsername] = [];

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
        if (!actorUnit || actorUnit.alive === false || isUnitBanished(actorUnit)) return;
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
        if (!actorUnit || actorUnit.alive === false || isUnitBanished(actorUnit)) continue;

        const actorState = ensureUnitStateShape(actorUnit);
        if (getStatusMetadataTotals(actorState).cannotUseSkills) continue;

        const actorCharacter = resolveEffectiveCharacter({
            characters,
            rosterIndex: actorUnit.rosterIndex,
            actorState,
        });
        const baseSkill = Array.isArray(actorCharacter?.skills)
            ? actorCharacter.skills[queued.skillIndex]
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
            hasStatusMetadataFlag(actorState, 'cannotUseHarmfulSkills') && skillHasHarmfulEffects(skill);
        if (blockedByCannotUseHarmfulSkills) continue;
        if (hasStatusMetadataFlag(actorState, 'cannotUseHelpfulSkills') && !skillHasHarmfulEffects(skill)) {
            continue;
        }
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
        if (skill?.id) {
            const skillUses =
                actorState.skillUses && typeof actorState.skillUses === 'object' ? actorState.skillUses : {};
            skillUses[skill.id] = (Number(skillUses[skill.id]) || 0) + 1;
            actorState.skillUses = skillUses;
        }
        if (!queued?.isAutoCast) {
            cancelChanneledStatusesForActor({
                match,
                sourceUsername: actingUsername,
                sourceSlot: actorSlot,
                nextSkillId: skill?.id || null,
            });
            if (!match._manualSkillActorSlotsByUsername || typeof match._manualSkillActorSlotsByUsername !== 'object') {
                match._manualSkillActorSlotsByUsername = {};
            }
            if (!Array.isArray(match._manualSkillActorSlotsByUsername[actingUsername])) {
                match._manualSkillActorSlotsByUsername[actingUsername] = [];
            }
            if (!match._manualSkillActorSlotsByUsername[actingUsername].includes(actorSlot)) {
                match._manualSkillActorSlotsByUsername[actingUsername].push(actorSlot);
            }
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
                    sourceSkillId: status?.sourceSkillId || null,
                    targetUsername: actingUsername,
                    damageDebugReason: 'owner-use self damage',
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
            if (
                Boolean(status?.metadata?.onOwnerUseSkillHarmfulOnly) &&
                !skillHasHarmfulEffects(skill)
            ) {
                return;
            }
            const ownerUseSkillTriggerClassesAny = Array.isArray(status?.metadata?.onOwnerUseSkillClassesAny)
                ? status.metadata.onOwnerUseSkillClassesAny
                      .map((entry) => normalizeSkillClassName(entry))
                      .filter(Boolean)
                : [];
            const ownerUseSkillTriggerIdsAny = Array.isArray(status?.metadata?.onOwnerUseSkillIdsAny)
                ? status.metadata.onOwnerUseSkillIdsAny
                      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
                      .filter(Boolean)
                : [];
            if (
                ownerUseSkillTriggerClassesAny.length > 0 &&
                !ownerUseSkillTriggerClassesAny.some((entry) => hasSkillClass(skill?.classes || [], entry))
            ) {
                return;
            }
            if (
                ownerUseSkillTriggerIdsAny.length > 0 &&
                !ownerUseSkillTriggerIdsAny.includes(skill?.id || '')
            ) {
                return;
            }
            const removeStatusIdsOnOwnerUseSkill = Array.isArray(status?.metadata?.removeStatusIdsOnOwnerUseSkill)
                ? status.metadata.removeStatusIdsOnOwnerUseSkill.filter((id) => typeof id === 'string' && id)
                : [];
            removeStatusIdsOnOwnerUseSkill.forEach((id) => ownerUseSkillTriggeredStatusIds.add(id));
            if (status?.id && !Boolean(status?.metadata?.persistOnOwnerUseSkillTrigger)) {
                ownerUseSkillTriggeredStatusIds.add(status.id);
            }
            const sourceUnit =
                status?.sourceUsername && Number.isInteger(status?.sourceSlot)
                    ? match.board?.[status.sourceUsername]?.[Number(status.sourceSlot)] || null
                    : null;
            const healAmount = Math.max(0, Number(status?.metadata?.onOwnerUseSkillHealSourceAmount) || 0);
            if (healAmount > 0 && sourceUnit && sourceUnit.alive !== false) {
                applyHealToUnit(sourceUnit, healAmount);
            }
            const applyStatusesToOwner = [
                ...(status?.metadata?.onOwnerUseSkillApplyStatusToOwner?.statusId
                    ? [status.metadata.onOwnerUseSkillApplyStatusToOwner]
                    : []),
                ...(Array.isArray(status?.metadata?.onOwnerUseSkillApplyStatusesToOwner)
                    ? status.metadata.onOwnerUseSkillApplyStatusesToOwner.filter((entry) => entry?.statusId)
                    : []),
            ];
            if (applyStatusesToOwner.length > 0) {
                const applyCondition = status?.metadata?.onOwnerUseSkillApplyStatusToOwnerCondition;
                if (
                    applyCondition &&
                    !doesEffectConditionMatch({
                        condition: applyCondition,
                        actorState,
                        targetState: actorState,
                        actorUnit,
                        targetUnit: actorUnit,
                        actorUsername: actingUsername,
                        targetUsername: actingUsername,
                    })
                ) {
                    return;
                }
                applyStatusesToOwner.forEach((applyStatusToOwner) => {
                    applyStatus({
                        targetState: actorState,
                        statusId: applyStatusToOwner.statusId,
                        duration: applyStatusToOwner.duration,
                        sourceSkillId: status?.sourceSkillId || null,
                        sourceUsername: status?.sourceUsername || null,
                        sourceSlot: Number.isInteger(status?.sourceSlot) ? status.sourceSlot : null,
                        metadata: applyStatusToOwner.metadata || {},
                        fresh: Boolean(applyStatusToOwner.fresh),
                    });
                });
            }
            const applyStatusToSourceOwner = status?.metadata?.onOwnerUseSkillApplyStatusToSourceOwner;
            if (
                applyStatusToSourceOwner?.statusId &&
                status?.sourceUsername &&
                Number.isInteger(status?.sourceSlot)
            ) {
                const sourceUnit = match.board?.[status.sourceUsername]?.[Number(status.sourceSlot)] || null;
                if (sourceUnit && sourceUnit.alive !== false) {
                    const sourceState = ensureUnitStateShape(sourceUnit);
                    let sourceMetadata = applyStatusToSourceOwner.metadata || {};
                    if (
                        sourceMetadata?.inheritMinimumHpFromSourceKey &&
                        typeof status?.metadata?.minimumHpFromSourceKey === 'string'
                    ) {
                        sourceMetadata = {
                            ...sourceMetadata,
                            minimumHpFromSourceKey: status.metadata.minimumHpFromSourceKey,
                        };
                    }
                    const copyOwnerKeyToKeys = Array.isArray(sourceMetadata?.copyOwnerKeyToKeys)
                        ? sourceMetadata.copyOwnerKeyToKeys
                        : [];
                    if (copyOwnerKeyToKeys.length > 0) {
                        const ownerKey = `${actingUsername}:${actorSlot}`;
                        sourceMetadata = copyOwnerKeyToKeys.reduce(
                            (nextMetadata, key) => {
                                if (typeof key !== 'string' || !key) return nextMetadata;
                                return {
                                    ...nextMetadata,
                                    [key]: ownerKey,
                                };
                            },
                            {
                                ...sourceMetadata,
                            }
                        );
                    }
                    applyStatus({
                        targetState: sourceState,
                        statusId: applyStatusToSourceOwner.statusId,
                        duration: applyStatusToSourceOwner.duration,
                        sourceSkillId: status?.sourceSkillId || null,
                        sourceUsername: status?.sourceUsername || null,
                        sourceSlot: Number.isInteger(status?.sourceSlot) ? status.sourceSlot : null,
                        metadata: sourceMetadata,
                        fresh: Boolean(applyStatusToSourceOwner.fresh),
                    });
                }
            }
            const applyStatusToEnemies = status?.metadata?.onOwnerUseSkillApplyStatusToEnemies;
            if (applyStatusToEnemies?.statusId) {
                const aliveEnemies = getAliveEnemyRecipients({
                    match,
                    username: actingUsername,
                });
                aliveEnemies.forEach((enemy) => {
                    if (!enemy?.unit) return;
                    applyStatus({
                        targetState: ensureUnitStateShape(enemy.unit),
                        statusId: applyStatusToEnemies.statusId,
                        duration: applyStatusToEnemies.duration,
                        sourceSkillId: resolveTriggeredEffectSourceSkillId({
                            status,
                            config: applyStatusToEnemies,
                        }),
                        sourceUsername: actingUsername,
                        sourceSlot: actorSlot,
                        metadata: applyStatusToEnemies.metadata || {},
                        fresh: Boolean(applyStatusToEnemies.fresh),
                    });
                });
            }
            const applyStatusToRandomEnemy = status?.metadata?.onOwnerUseSkillApplyStatusToRandomEnemy;
            if (applyStatusToRandomEnemy?.statusId) {
                const chancePercent = Number(applyStatusToRandomEnemy.chancePercent);
                if (
                    Number.isFinite(chancePercent) &&
                    chancePercent >= 0 &&
                    chancePercent < 100 &&
                    !rollPercentSuccess(chancePercent)
                ) {
                    return;
                }
                const aliveEnemies = getAliveEnemyRecipients({
                    match,
                    username: actingUsername,
                });
                if (!aliveEnemies.length) return;
                const picked = pickRandomEntry(aliveEnemies);
                if (!picked?.unit) return;
                applyStatus({
                    targetState: ensureUnitStateShape(picked.unit),
                    statusId: applyStatusToRandomEnemy.statusId,
                    duration: applyStatusToRandomEnemy.duration,
                    sourceSkillId: resolveTriggeredEffectSourceSkillId({
                        status,
                        config: applyStatusToRandomEnemy,
                    }),
                    sourceUsername: actingUsername,
                    sourceSlot: actorSlot,
                    metadata: applyStatusToRandomEnemy.metadata || {},
                    fresh: false,
                });
                const onSuccessApplyStatusToOwner =
                    applyStatusToRandomEnemy.onSuccessApplyStatusToOwner ||
                    status?.metadata?.onSuccessApplyStatusToOwner;
                if (onSuccessApplyStatusToOwner?.statusId) {
                    applyStatus({
                        targetState: actorState,
                        statusId: onSuccessApplyStatusToOwner.statusId,
                        duration: onSuccessApplyStatusToOwner.duration,
                        sourceSkillId: resolveTriggeredEffectSourceSkillId({
                            status,
                            config: onSuccessApplyStatusToOwner,
                        }),
                        sourceUsername: actingUsername,
                        sourceSlot: actorSlot,
                        metadata: onSuccessApplyStatusToOwner.metadata || {},
                        fresh: false,
                    });
                }
            }
        });
        if (ownerUseSkillTriggeredStatusIds.size > 0) {
            actorState.statuses = (Array.isArray(actorState.statuses) ? actorState.statuses : []).filter(
                (status) =>
                    !ownerUseSkillTriggeredStatusIds.has(status?.id) ||
                    Boolean(status?.metadata?.preserveOnOwnerUseSkillTrigger)
            );
        }

        applyOnTeamMemberUseSkillBonuses({
            match,
            actorState,
            actingUsername,
            skill,
            skillIsMental,
        });
        applyOnEnemyTeamMemberUseSkillBonuses({
            match,
            actorState,
            actingUsername,
            actorUnit,
            skill,
            skillIsMental,
        });

        const effects = Array.isArray(skill.effects) ? skill.effects : [];
        if (!effects.length) continue;
        if (!doesActorSatisfySkillCondition(actorUnit, actorState, skill)) continue;
        const skillCannotBeCountered =
            Boolean(skill?.cannotBeCountered) || hasSkillClass(skill?.classes || [], 'uncounterable');
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
            canActorIgnoreEnemyInvulnerability(actorUnit) ||
            Boolean(skill?.ignoreInvulnerability) ||
            hasSkillClass(skill?.classes || [], 'bypassing');
        const opponentEntry = (match.players || []).find((p) => p.username !== actingUsername);
        const opponentUsername = opponentEntry?.username;
        const actorAllies = (match.board?.[actingUsername] || [])
            .map((unit, slot) => ({ username: actingUsername, slot, unit }))
            .filter((entry) => entry.unit && entry.unit.alive !== false && !isUnitBanished(entry.unit));
        const opponentUnits = (match.board?.[opponentUsername] || [])
            .map((unit, slot) => ({ username: opponentUsername, slot, unit }))
            .filter((entry) => {
                if (!entry.unit || entry.unit.alive === false || isUnitBanished(entry.unit)) return false;
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
                        actorSkillId: skill?.id || null,
                        targetUnit: entry.unit,
                    }) ||
                    !isUnitInvulnerableForSkill(entry.unit, skill.classes || [])
                );
            });
        const allAliveUnits = [...actorAllies, ...opponentUnits];
        const actorHasHarmfulBlind = hasStatusMetadataFlag(actorState, 'harmfulBlind');
        const actorHasHelpfulBlind = hasStatusMetadataFlag(actorState, 'helpfulBlind');
        const actorHasFullBlind = hasStatusMetadataFlag(actorState, 'fullBlind');
        const shouldRetargetToRandomAny = actorHasFullBlind && skillHasHarmfulEffects(skill);
        const shouldRetargetToRandomEnemy = actorHasHarmfulBlind && skillHasHarmfulEffects(skill);
        const shouldRetargetToRandomAlly = actorHasHelpfulBlind && !skillHasHarmfulEffects(skill);
        const selectedTargets = selection
            .map((target) => {
                let entry = {
                    username: target.username,
                    slot: target.slot,
                    unit: match.board?.[target.username]?.[target.slot] || null,
                };
                if (!entry.unit || entry.unit.alive === false || isUnitBanished(entry.unit)) return null;

                const targetState = ensureUnitStateShape(entry.unit);
                if (hasStatusMetadataFlag(targetState, 'fullBlind')) {
                    const blindPick = pickRandomEntry(allAliveUnits);
                    if (blindPick?.unit && blindPick.unit.alive !== false) {
                        entry = blindPick;
                    }
                }

                if (shouldRetargetToRandomAny) {
                    const blindPick = pickRandomEntry(allAliveUnits);
                    if (blindPick?.unit && blindPick.unit.alive !== false) {
                        entry = blindPick;
                    }
                } else if (shouldRetargetToRandomEnemy) {
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
        const skillCannotBeReflected =
            Boolean(skill?.cannotBeReflected) || hasSkillClass(skill?.classes || [], 'unreflectable');
        const shouldReflectTargetsByPersonalStatus = !skillCannotBeReflected && canReflectByPersonalStatus;
        const shouldReflectTargetsByMentalGuard = !skillCannotBeReflected && Boolean(mentalGuardReflectHolder);
        const targetReflectStatusByKey = new Map();
        const getTargetReflectStatus = (recipient) => {
            if (!recipient?.unit || recipient.unit.alive === false) return null;
            if (recipient.username === actingUsername) return null;
            const key = `${recipient.username}:${recipient.slot}`;
            if (targetReflectStatusByKey.has(key)) {
                return targetReflectStatusByKey.get(key);
            }
            const state = ensureUnitStateShape(recipient.unit);
            const reflectStatus = (Array.isArray(state.statuses) ? state.statuses : []).find((status) => {
                const remaining = Number(status?.remainingTurns) || 0;
                if (remaining <= 0) return false;
                if (!Boolean(status?.metadata?.reflectNextIncomingSkill)) return false;
                return skillMatchesReflectRule({
                    statusMetadata: status?.metadata || {},
                    skillClasses: skill.classes || [],
                    skillIsHarmful,
                });
            });
            targetReflectStatusByKey.set(key, reflectStatus || null);
            return reflectStatus || null;
        };
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
                const targetReflectStatus = getTargetReflectStatus(recipient);
                if (targetReflectStatus?.id) {
                    const targetState = ensureUnitStateShape(recipient.unit);
                    consumeStatus(targetState, targetReflectStatus.id);
                    const metadata = targetReflectStatus?.metadata || {};
                    if (Boolean(metadata?.reflectBackToCaster)) {
                        return { username: actingUsername, slot: actorSlot, unit: actorUnit };
                    }
                    const reflectToRandomCasterAlly =
                        Boolean(metadata?.reflectToRandomCasterAlly) ||
                        Boolean(metadata?.reflectToRandomEnemyTarget);
                    if (!reflectToRandomCasterAlly) {
                        return { username: actingUsername, slot: actorSlot, unit: actorUnit };
                    }
                    const alternatives = actorAllies.filter(
                        (entry) =>
                            entry?.unit &&
                            entry.unit.alive !== false &&
                            Number(entry.slot) !== Number(actorSlot)
                    );
                    if (alternatives.length > 0) {
                        return alternatives[Math.floor(Math.random() * alternatives.length)];
                    }
                    return { username: actingUsername, slot: actorSlot, unit: actorUnit };
                }
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
            if (scope === 'target') {
                return filterHelpfulImmuneRecipients({
                    effect,
                    recipients: reflectRecipients(selectedTargets),
                    actingUsername,
                });
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
            const fixedDamage = Boolean(effect?.metadata?.fixedDamage);
            const ignoreDamageReduction =
                Boolean(effect?.metadata?.ignoreDamageReduction) ||
                hasSkillSpecificStatusFlag(actorState, skill.id || null, 'ignoreDamageReductionForSkillIds');
            const ignoreDestructibleDefense = Boolean(effect?.metadata?.ignoreDestructibleDefense);
            const ignoreDamageImmunity = Boolean(effect?.metadata?.ignoreDamageImmunity);
            const ignoreAfflictionDamageImmunity = Boolean(effect?.metadata?.ignoreAfflictionDamageImmunity);
            const effectSkillClasses = Array.isArray(effect?.metadata?.skillClasses)
                ? effect.metadata.skillClasses
                      .map((entry) => (typeof entry === 'string' ? entry.trim().toLowerCase() : ''))
                      .filter(Boolean)
                : Array.isArray(skill?.classes)
                ? skill.classes
                      .map((entry) => (typeof entry === 'string' ? entry.trim().toLowerCase() : ''))
                      .filter(Boolean)
                : [];
            if (
                Boolean(effect?.metadata?.afflictionDamage) &&
                !effectSkillClasses.includes('affliction')
            ) {
                effectSkillClasses.push('affliction');
            }
            const bypassingDamage = hasSkillClass(effectSkillClasses, 'bypassing');
            const key = [
                recipient.username || '',
                Number.isInteger(recipient.slot) ? recipient.slot : '',
                fixedDamage ? 1 : 0,
                ignoreDamageReduction ? 1 : 0,
                ignoreDestructibleDefense ? 1 : 0,
                ignoreDamageImmunity || bypassingDamage ? 1 : 0,
                ignoreAfflictionDamageImmunity ? 1 : 0,
                effect?.type === 'health_steal_damage' || Boolean(effect?.metadata?.healthStealDamage) ? 1 : 0,
                effectSkillClasses.slice().sort().join(','),
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
                sourceBaseDamage: Math.max(0, Number(effect?.amount) || 0),
                fixedDamage,
                ignoreDamageReduction,
                ignoreDestructibleDefense,
                ignoreDamageImmunity: ignoreDamageImmunity || bypassingDamage,
                ignoreAfflictionDamageImmunity,
                afflictionDamage: Boolean(effect?.metadata?.afflictionDamage),
                skillClasses: effectSkillClasses,
                sourceSkillId: skill?.id || null,
                onSuccessfulDamageApplyStatusToTarget:
                    effect?.metadata?.onSuccessfulDamageApplyStatusToTarget || null,
                healthStealDamage:
                    effect?.type === 'health_steal_damage' ||
                    Boolean(effect?.metadata?.healthStealDamage),
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
                targetState,
                statusId: 'skill_evaded_notification',
                duration: 1,
                sourceSkillId: skill.id || null,
                sourceUsername: actingUsername,
                sourceSlot: actorSlot,
                metadata: {
                    evadedSkillName: skill?.name || 'a skill',
                    evadedSourceName: characters?.[actorUnit?.rosterIndex]?.name || 'Enemy',
                    tooltipText: 'This character evaded an enemy skill.',
                },
                fresh: true,
            });
            applyOnSkillEvadedBonuses({
                actorState: targetState,
                ownerUsername: recipient.username,
                ownerSlot: recipient.slot,
                sourceUsername: actingUsername,
                sourceSlot: actorSlot,
                sourceSkillId: skill.id || null,
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
            if (targetType === 'single-enemy' || targetType === 'single-character') {
                return reflectRecipients(selectedTargets.filter((entry) => entry?.username !== actingUsername));
            }
            if (targetType === 'all-enemy' || targetType === 'other-enemies') {
                return reflectRecipients(opponentUnits);
            }
            return [];
        })();
        if (
            skillIsHarmful &&
            !skillCannotBeCountered &&
            maybeTriggerReactiveDefenses({
                match,
                turnMarker,
                actingUsername,
                recipient: { username: actingUsername, slot: actorSlot, unit: actorUnit },
                actorUnit,
                skillClasses: skill.classes || [],
                skillIsHarmful,
                sourceSkillId: skill.id || null,
                allowSelfTrapTrigger: true,
            })
        ) {
            skillCancelledByEvade = true;
            pendingDamage.clear();
        }
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
            triggerOnEnemySkillTargetedBonuses({
                match,
                actingUsername,
                actorUnit,
                actorSlot,
                recipient,
                skill,
            });
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
                    skillIsHarmful: skillHasHarmfulEffects(skill),
                    sourceSkillId: skill.id || null,
                })
            ) {
                skillCancelledByEvade = true;
                pendingDamage.clear();
                break;
            }
            if (!shouldCancelByEvade(recipient)) continue;
            continue;
        }

        const actorSilencedToNonDamage = hasStatusMetadataFlag(actorState, 'silenceNonDamageEffects');
        const chosenSkillClass = resolveSkillClassChoiceForCast({ skill, queued });
        effects.forEach((rawEffect) => {
            const effect = materializeEffectWithSkillClassChoice(rawEffect, chosenSkillClass);
            if (skillCancelledByEvade) return;
            const effectType = effect?.type;
            if (
                actorSilencedToNonDamage &&
                effectType !== 'damage' &&
                effectType !== 'health_steal_damage'
            ) return;
            const rollPerRecipient = Boolean(effect?.rollPerRecipient);
            const chance = Number(effect?.chance);
            if (!rollPerRecipient && Number.isFinite(chance) && chance >= 0 && chance < 100) {
                if (!rollPercentSuccess(chance)) return;
            }
            const activationChance = Number(effect?.activationChancePercent);
            if (!rollPerRecipient && Number.isFinite(activationChance) && !rollPercentSuccess(activationChance)) {
                return;
            }
            if (effectType === 'damage' || effectType === 'health_steal_damage') {
                const isHealthStealDamage = effectType === 'health_steal_damage';
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
                    if (hasStatusMetadataFlag(targetState, 'invulnerableToHarmfulEffects')) {
                        return;
                    }
                    if (
                        doesEffectTargetHelpfulRecipient({ effect, recipient, actingUsername }) &&
                        !doesEffectIgnoreHelpfulInvulnerability(effect) &&
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
                            sourceSkillId: skill.id || null,
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
                        const conditionMatches = doesEffectConditionMatch({
                            condition,
                            actorState,
                            targetState,
                            actorUnit,
                            actorUsername: actingUsername,
                            targetUnit: recipient.unit,
                            targetUsername: recipient.username,
                        });
                        if (!conditionMatches && !isConditionalDamageOverrideOnly(condition)) return;
                        if (conditionMatches && condition.consumeOnMatch && condition.statusId) {
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
                        match,
                        actorUsername: actingUsername,
                        actorSlot,
                    });
                    const skillSpecificBonus = getSkillSpecificDamageBonus(actorState, skill.id || null);
                    const targetSourceBonus = getTargetBonusDamageFromSource({
                        targetState,
                        sourceCharacterId: actingCharacterId,
                        sourceSkillId: skill.id || null,
                        sourceSkillClasses: skill.classes || [],
                        sourceUsername: actingUsername,
                        targetUsername: recipient.username,
                    });
                    const totalAmount = Boolean(effect?.metadata?.fixedDamage)
                        ? Math.max(0, amount)
                        : Math.max(0, amount + skillSpecificBonus + targetSourceBonus);
                    queueDamage(recipient, totalAmount, effect);
                });
                return;
            }

            if (effectType === 'parasite_absorption_state') {
                const recipients = resolveRecipients(effect);
                recipients.forEach((recipient) => {
                    if (!recipient?.unit || recipient.unit.alive === false) return;
                    const targetState = ensureUnitStateShape(recipient.unit);
                    const condition = effect?.condition;
                    if (
                        condition &&
                        !doesEffectConditionMatch({
                            condition,
                            actorState,
                            targetState,
                            actorUnit,
                            actorUsername: actingUsername,
                            targetUnit: recipient.unit,
                            targetUsername: recipient.username,
                        })
                    ) {
                        return;
                    }
                    applyParasiteAbsorptionState({
                        targetState,
                        kind: effect.kind === 'positive' ? 'positive' : 'negative',
                        variant: effect.variant || 'random',
                        sourceSkillId: skill.id || null,
                        sourceUsername: actingUsername,
                        sourceSlot: actorSlot,
                        fresh: true,
                    });
                });
                return;
            }

            if (effectType === 'parasite_metabolic_collapse') {
                const recipients = resolveRecipients(effect);
                recipients.forEach((recipient) => {
                    if (!recipient?.unit || recipient.unit.alive === false) return;
                    const targetState = ensureUnitStateShape(recipient.unit);
                    applyParasiteAbsorptionState({
                        targetState,
                        kind: 'negative',
                        variant: 'complete',
                        sourceSkillId: skill.id || null,
                        sourceUsername: actingUsername,
                        sourceSlot: actorSlot,
                        fresh: true,
                    });
                    const trackerId = 'parasite_metabolic_collapse_tracker';
                    const tracker = (Array.isArray(targetState.statuses) ? targetState.statuses : []).find(
                        (status) =>
                            status?.id === trackerId &&
                            status?.sourceUsername === actingUsername &&
                            Number(status?.sourceSlot) === actorSlot
                    );
                    const nextStack = Math.min(3, Math.max(0, Number(tracker?.metadata?.stacks) || 0) + 1);
                    applyStatus({
                        targetState,
                        statusId: trackerId,
                        duration: 99,
                        sourceSkillId: skill.id || null,
                        sourceUsername: actingUsername,
                        sourceSlot: actorSlot,
                        metadata: {
                            harmful: true,
                            infiniteDuration: true,
                            stacks: nextStack,
                            statusIconUrl: PARASITE_ICONS.negativeComplete,
                            tooltipTextTemplate:
                                'Metabolic Collapse has escalated {stacks}/3 times on this character.',
                        },
                        fresh: false,
                    });
                    if (nextStack === 1) {
                        applyStatus({
                            targetState,
                            statusId: 'parasite_metabolic_cooldown_chain',
                            duration: 99,
                            sourceSkillId: skill.id || null,
                            sourceUsername: actingUsername,
                            sourceSlot: actorSlot,
                            metadata: {
                                harmful: true,
                                infiniteDuration: true,
                                newSkillCooldownIncrease: 1,
                                statusIconUrl: PARASITE_ICONS.debuffCooldown,
                                specialStatusVisual: 'parasite-metabolic-cooldown',
                                tooltipText:
                                    "Metabolic Collapse: this character's new skills gain +1 cooldown.",
                            },
                            fresh: true,
                        });
                    } else if (nextStack === 2) {
                        applyStatus({
                            targetState,
                            statusId: 'parasite_metabolic_healing_reduction',
                            duration: 99,
                            sourceSkillId: skill.id || null,
                            sourceUsername: actingUsername,
                            sourceSlot: actorSlot,
                            metadata: {
                                harmful: true,
                                infiniteDuration: true,
                                healReceivedMultiplier: 0.5,
                                statusIconUrl: PARASITE_ICONS.debuffHeal,
                                specialStatusVisual: 'parasite-metabolic-heal',
                                tooltipText:
                                    'Metabolic Collapse: this character receives 50% less healing.',
                            },
                            fresh: true,
                        });
                    } else if (nextStack === 3) {
                        applyStatus({
                            targetState,
                            statusId: 'parasite_metabolic_anti_defense',
                            duration: 99,
                            sourceSkillId: skill.id || null,
                            sourceUsername: actingUsername,
                            sourceSlot: actorSlot,
                            metadata: {
                                harmful: true,
                                infiniteDuration: true,
                                cannotReduceDamage: true,
                                cannotBecomeInvulnerable: true,
                                statusIconUrl: PARASITE_ICONS.debuffDefense,
                                specialStatusVisual: 'parasite-metabolic-defense',
                                tooltipText:
                                    'Metabolic Collapse: this character cannot reduce damage or become invulnerable.',
                            },
                            fresh: true,
                        });
                    }
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
                        !doesEffectIgnoreHelpfulInvulnerability(effect) &&
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
                        return;
                    }
                    const targetHasHarmfulEffectImmunity = hasStatusMetadataFlag(
                        destinationState,
                        'invulnerableToHarmfulEffects'
                    );
                    const targetIgnoresHarmfulNonDamageEffects = hasStatusMetadataFlag(
                        destinationState,
                        'ignoreHarmfulNonDamageEffects'
                    );
                    if (!appliesToSelf && isHarmfulEffect(effect)) {
                        if (targetHasHarmfulEffectImmunity || targetIgnoresHarmfulNonDamageEffects) {
                            if (!hasSkillClass(skill?.classes || [], 'bypassing')) return;
                        }
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
                            skillIsHarmful: skillHasHarmfulEffects(skill),
                            sourceSkillId: skill.id || null,
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
                        if (
                            !doesEffectConditionMatch({
                                condition,
                                actorState,
                                targetState,
                                actorUnit,
                                actorUsername: actingUsername,
                                targetUnit: recipient.unit,
                                targetUsername: recipient.username,
                            })
                        )
                            return;
                        if (condition.consumeOnMatch && condition.statusId) {
                            const scope = condition.scope === 'target' ? 'target' : 'self';
                            const scopedState = scope === 'target' ? targetState : actorState;
                            consumeStatus(scopedState, condition.statusId);
                        }
                    }
                    if (
                        targetHasHarmfulEffectImmunity &&
                        isHarmfulEffect(effect) &&
                        !hasSkillClass(skill?.classes || [], 'bypassing')
                    ) {
                        return;
                    }
                    let runtimeStatusId = effect.statusId;
                    let runtimeDuration = effect.duration;
                    let runtimeMetadata = effect.metadata || {};
                    const statusMetadataDuration = resolveDurationFromStatusMetadata({
                        effect,
                        actorState,
                        targetState,
                    });
                    if (statusMetadataDuration !== null) {
                        runtimeDuration = statusMetadataDuration;
                    }
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
                    runtimeDuration += resolveStatusMetadataThresholdAdjustment({
                        actorState,
                        targetState,
                        config: runtimeMetadata?.durationBonusFromStatusMetadataThresholds,
                        valueKey: 'bonus',
                    });
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
                    if (hasSkillClass(skill?.classes || [], 'unremovable')) {
                        runtimeMetadata = {
                            ...(runtimeMetadata || {}),
                            unremovable: true,
                        };
                    }
                    const copySourceCurrentHpToKeys = Array.isArray(runtimeMetadata?.copySourceCurrentHpToKeys)
                        ? runtimeMetadata.copySourceCurrentHpToKeys.filter(
                              (key) => typeof key === 'string' && key
                          )
                        : [];
                    if (copySourceCurrentHpToKeys.length > 0) {
                        const sourceCurrentHp = Math.max(0, Number(actorUnit?.hp) || 0);
                        const nextMetadata = {
                            ...(runtimeMetadata || {}),
                        };
                        copySourceCurrentHpToKeys.forEach((key) => {
                            nextMetadata[key] = sourceCurrentHp;
                        });
                        runtimeMetadata = nextMetadata;
                    }
                    const copyTargetSlotToKeys = Array.isArray(runtimeMetadata?.copyTargetSlotToKeys)
                        ? runtimeMetadata.copyTargetSlotToKeys.filter((key) => typeof key === 'string' && key)
                        : [];
                    if (copyTargetSlotToKeys.length > 0) {
                        const nextMetadata = {
                            ...(runtimeMetadata || {}),
                        };
                        copyTargetSlotToKeys.forEach((key) => {
                            nextMetadata[key] = recipient.slot;
                        });
                        runtimeMetadata = nextMetadata;
                    }
                    const copyTargetUsernameToKeys = Array.isArray(runtimeMetadata?.copyTargetUsernameToKeys)
                        ? runtimeMetadata.copyTargetUsernameToKeys.filter((key) => typeof key === 'string' && key)
                        : [];
                    if (copyTargetUsernameToKeys.length > 0) {
                        const nextMetadata = {
                            ...(runtimeMetadata || {}),
                        };
                        copyTargetUsernameToKeys.forEach((key) => {
                            nextMetadata[key] = recipient.username;
                        });
                        runtimeMetadata = nextMetadata;
                    }
                    const copyTargetKeyToKeys = Array.isArray(runtimeMetadata?.copyTargetKeyToKeys)
                        ? runtimeMetadata.copyTargetKeyToKeys.filter((key) => typeof key === 'string' && key)
                        : [];
                    if (copyTargetKeyToKeys.length > 0) {
                        const targetKey = `${recipient.username}:${recipient.slot}`;
                        const nextMetadata = {
                            ...(runtimeMetadata || {}),
                        };
                        copyTargetKeyToKeys.forEach((key) => {
                            nextMetadata[key] = targetKey;
                        });
                        runtimeMetadata = nextMetadata;
                    }
                    const copySelectedTargetKeyToKeys = Array.isArray(runtimeMetadata?.copySelectedTargetKeyToKeys)
                        ? runtimeMetadata.copySelectedTargetKeyToKeys.filter((key) => typeof key === 'string' && key)
                        : [];
                    if (copySelectedTargetKeyToKeys.length > 0) {
                        const selectedTarget = selectedTargets.find(
                            (entry) => entry?.username && Number.isInteger(entry?.slot)
                        );
                        if (selectedTarget) {
                            const selectedTargetKey = `${selectedTarget.username}:${selectedTarget.slot}`;
                            const nextMetadata = {
                                ...(runtimeMetadata || {}),
                            };
                            copySelectedTargetKeyToKeys.forEach((key) => {
                                nextMetadata[key] = selectedTargetKey;
                            });
                            runtimeMetadata = nextMetadata;
                        }
                    }
                    const scaleFromSourceStatusMetadata =
                        runtimeMetadata?.scaleFromSourceStatusMetadata &&
                        typeof runtimeMetadata.scaleFromSourceStatusMetadata === 'object'
                            ? runtimeMetadata.scaleFromSourceStatusMetadata
                            : null;
                    if (scaleFromSourceStatusMetadata?.statusId && scaleFromSourceStatusMetadata?.metadataKey) {
                        const sourceStatus = (Array.isArray(actorState?.statuses) ? actorState.statuses : []).find(
                            (entry) =>
                                entry?.id === scaleFromSourceStatusMetadata.statusId &&
                                (Number(entry?.remainingTurns) || 0) > 0
                        );
                        const sourceValue = Math.max(
                            0,
                            Number(sourceStatus?.metadata?.[scaleFromSourceStatusMetadata.metadataKey]) || 0
                        );
                        const multiplier = Number(scaleFromSourceStatusMetadata.multiplier) || 0;
                        const targetKeys = Array.isArray(scaleFromSourceStatusMetadata.targetKeys)
                            ? scaleFromSourceStatusMetadata.targetKeys.filter((key) => typeof key === 'string' && key)
                            : [];
                        if (targetKeys.length > 0) {
                            const nextMetadata = {
                                ...(runtimeMetadata || {}),
                            };
                            targetKeys.forEach((key) => {
                                nextMetadata[key] = sourceValue * multiplier;
                            });
                            runtimeMetadata = nextMetadata;
                        }
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
                            typeof effect?.fresh === 'boolean'
                                ? effect.fresh
                                : recipient.username === actingUsername ||
                                  Boolean(runtimeMetadata?.freezeCooldowns) ||
                                  (runtimeMetadata?.turnDurationAnchor === 'source_turn' &&
                                      !runtimeMetadata?.triggerOnApply),
                    });
                    if (Boolean(runtimeMetadata?.removeEnemyAfflictionStatusesOnApply)) {
                        cleanseEnemyAfflictionStatuses(
                            recipient.unit,
                            recipient.username,
                            runtimeMetadata?.removeEnemyAfflictionStatusesOnApplyCount
                        );
                    }
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
                        return;
                    }
                    const hp = Math.max(0, Number(recipient.unit.hp) || 0);
                    if (hp > threshold) return;
                    recipient.unit.hp = 0;
                    recipient.unit.alive = false;
                    triggerTeamMemberDeathHooks({
                        match,
                        deadUsername: recipient.username,
                        deadSlot: recipient.slot,
                    });
                    triggerOwnerDeathHooks({
                        unit: recipient.unit,
                        match,
                        username: recipient.username,
                        slot: recipient.slot,
                    });
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
                        if (
                            !doesEffectConditionMatch({
                                condition,
                                actorState,
                                targetState,
                                actorUnit,
                                actorUsername: actingUsername,
                                targetUnit: recipient.unit,
                                targetUsername: recipient.username,
                            })
                        )
                            return;
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
                    const sourceHealingBonus = Math.max(
                        0,
                        Number(getStatusMetadataTotals(actorState, actorUnit).healingBonusFlat) || 0
                    );
                    applyHealToUnit(
                        recipient.unit,
                        resolveScalarEffectAmount({
                            effect,
                            actorUnit,
                            targetUnit: recipient.unit,
                        }) + sourceHealingBonus
                    );
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
                    applyHealthLossToUnit(
                        recipient.unit,
                        resolveScalarEffectAmount({
                            effect,
                            actorUnit,
                            targetUnit: recipient.unit,
                        }),
                        {
                            match,
                            targetUsername: recipient.username,
                            targetSlot: recipient.slot,
                        }
                    );
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
                    cleanseHarmfulStatuses(recipient.unit, effect.count);
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
                const exactStatusIds = [
                    ...(typeof effect?.statusId === 'string' && effect.statusId ? [effect.statusId] : []),
                    ...(Array.isArray(effect?.statusIdsAny)
                        ? effect.statusIdsAny.filter((entry) => typeof entry === 'string' && entry)
                        : []),
                ];
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
                                actorUsername: actingUsername,
                                targetUsername: recipient.username,
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
                            if (exactStatusIds.length > 0 && !exactStatusIds.includes(status?.id)) return true;
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
                        if (
                            !doesEffectConditionMatch({
                                condition,
                                actorState,
                                targetState,
                                actorUnit,
                                actorUsername: actingUsername,
                                targetUnit: recipient.unit,
                                targetUsername: recipient.username,
                            })
                        )
                            return;
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
                const operation =
                    typeof effect?.operation === 'string' ? effect.operation.trim().toLowerCase() : 'add';
                if (!Number.isFinite(amount)) return;
                if (operation !== 'set' && amount === 0) return;
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
                            skillIsHarmful: skillHasHarmfulEffects(skill),
                            sourceSkillId: skill.id || null,
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
                        if (
                            !doesEffectConditionMatch({
                                condition,
                                actorState,
                                targetState,
                                actorUnit,
                                actorUsername: actingUsername,
                                targetUnit: recipient.unit,
                                targetUsername: recipient.username,
                            })
                        )
                            return;
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

            if (effectType === 'trigger_status_effects') {
                const recipients = resolveRecipients(effect);
                const requestedStatusIds = [
                    ...(typeof effect?.statusId === 'string' && effect.statusId ? [effect.statusId] : []),
                    ...(Array.isArray(effect?.statusIdsAny)
                        ? effect.statusIdsAny.filter((entry) => typeof entry === 'string' && entry)
                        : []),
                ];
                if (!requestedStatusIds.length) return;
                recipients.forEach((recipient) => {
                    if (!recipient?.unit || recipient.unit.alive === false) return;
                    const targetState = ensureUnitStateShape(recipient.unit);
                    const matchedStatuses = (Array.isArray(targetState.statuses) ? targetState.statuses : []).filter(
                        (status) =>
                            requestedStatusIds.includes(status?.id) && (Number(status?.remainingTurns) || 0) > 0
                    );
                    if (!matchedStatuses.length) return;
                    matchedStatuses.forEach((matchedStatus) => {
                        triggerStoredStatusEffects({
                            match,
                            status: matchedStatus,
                            targetUnit: recipient.unit,
                            targetState,
                            targetUsername: recipient.username,
                            targetSlot: recipient.slot,
                        });
                        if (Boolean(effect?.consumeMatchedStatus ?? true) && matchedStatus?.id) {
                            consumeStatus(targetState, matchedStatus.id);
                        }
                    });
                });
                return;
            }

            if (effectType === 'swap_positions') {
                const recipients = resolveRecipients(effect);
                recipients.forEach((recipient) => {
                    if (!recipient?.unit || recipient.unit.alive === false) return;
                    swapBoardPositions({
                        match,
                        unitA: actorUnit,
                        unitB: recipient.unit,
                    });
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
                const chakraRecipients =
                    effect?.scope && effect.scope !== 'self'
                        ? resolveRecipients(effect).filter((recipient) => recipient?.username)
                        : [{ username: actingUsername }];
                const grantChakra = (username, chakraType) => {
                    applyChakraGainToMatch({
                        match,
                        username,
                        chakraType,
                        amount: 1,
                    });
                };
                if (rawType === 'random') {
                    chakraRecipients.forEach((recipient) => {
                        for (let i = 0; i < amount; i += 1) {
                            const pick = chakraTypes[Math.floor(Math.random() * chakraTypes.length)];
                            grantChakra(recipient.username, pick);
                        }
                    });
                    return;
                }
                chakraRecipients.forEach((recipient) => {
                    applyChakraGainToMatch({
                        match,
                        username: recipient.username,
                        chakraType: rawType,
                        amount,
                    });
                });
                return;
            }

            if (effectType === 'spend_all_chakra') {
                if (!match || !actingUsername) return;
                match.chakraPools = match.chakraPools || {};
                match.chakraPools[actingUsername] = createEmptyChakraCost();
                return;
            }

            if (effectType === 'drain_chakra') {
                const recipients = resolveRecipients(effect);
                const maxAmount = Math.max(0, Number(effect?.amount) || 0);
                const requestedType =
                    typeof effect?.chakraType === 'string' ? effect.chakraType.trim().toLowerCase() : 'random';
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
                        if (
                            !doesEffectConditionMatch({
                                condition,
                                actorState,
                                targetState,
                                actorUnit,
                                actorUsername: actingUsername,
                                targetUnit: recipient.unit,
                                targetUsername: recipient.username,
                            })
                        )
                            return;
                        if (condition.consumeOnMatch && condition.statusId) {
                            const scope = condition.scope === 'target' ? 'target' : 'self';
                            const scopedState = scope === 'target' ? targetState : actorState;
                            consumeStatus(scopedState, condition.statusId);
                        }
                    }
                    match.chakraPools = match.chakraPools || {};
                    const targetPool = match.chakraPools[recipient.username] || createEmptyChakraCost();
                    const sourcePool = match.chakraPools[actingUsername] || createEmptyChakraCost();
                    for (let i = 0; i < maxAmount; i += 1) {
                        const available =
                            requestedType === 'random'
                                ? chakraTypes.filter((type) => (Number(targetPool[type]) || 0) > 0)
                                : chakraTypes.includes(requestedType) && (Number(targetPool[requestedType]) || 0) > 0
                                  ? [requestedType]
                                  : [];
                        if (!available.length) break;
                        const picked = available[Math.floor(Math.random() * available.length)];
                        targetPool[picked] = Math.max(0, (Number(targetPool[picked]) || 0) - 1);
                        sourcePool[picked] = (Number(sourcePool[picked]) || 0) + 1;
                    }
                    match.chakraPools[recipient.username] = targetPool;
                    match.chakraPools[actingUsername] = sourcePool;
                });
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
                        if (
                            !doesEffectConditionMatch({
                                condition,
                                actorState,
                                targetState,
                                actorUnit,
                                actorUsername: actingUsername,
                                targetUnit: recipient.unit,
                                targetUsername: recipient.username,
                            })
                        )
                            return;
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
                        if (
                            !doesEffectConditionMatch({
                                condition,
                                actorState,
                                targetState,
                                actorUnit,
                                actorUsername: actingUsername,
                                targetUnit: recipient.unit,
                                targetUsername: recipient.username,
                            })
                        )
                            return;
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
                        sourceSlot: actorSlot,
                        sourceSkillId: entry.sourceSkillId || skill.id || null,
                        targetUsername: entry.recipient.username,
                        targetSlot: entry.recipient.slot,
                        sourceBaseDamage: entry.sourceBaseDamage,
                        skillClasses: entry.skillClasses || skill.classes || [],
                        fixedDamage: Boolean(entry.fixedDamage),
                        ignoreDamageImmunity: Boolean(entry.ignoreDamageImmunity),
                        ignoreAfflictionDamageImmunity: Boolean(entry.ignoreAfflictionDamageImmunity),
                        ignoreDamageReduction:
                            Boolean(entry.ignoreDamageReduction) || Boolean(entry.healthStealDamage),
                        ignoreDestructibleDefense: entry.ignoreDestructibleDefense,
                        unpierceableBudgetMap: unpierceableBudgetByRecipient,
                        unpierceableBudgetKey: mitigationBudgetKey,
                        standardMitigationBudgetMap: standardMitigationBudgetByRecipient,
                        standardMitigationBudgetKey: mitigationBudgetKey,
                        percentMitigationStateMap: percentMitigationStateByRecipient,
                        percentMitigationStateKey: mitigationBudgetKey,
                    });
                    if (dealt > 0 && entry.healthStealDamage) {
                        applyDirectHpGainToUnit(actorUnit, dealt);
                    }
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
            if (dealt > 0) {
                applyOnTeamMemberSuccessfulDamageBonuses({
                    match,
                    actingUsername,
                    targetUnit: entry.recipient.unit,
                    targetUsername: entry.recipient.username,
                    sourceSkillId: skill.id || null,
                    sourceSkillClasses: entry.skillClasses || skill.classes || [],
                    sourceSlot: actorSlot,
                });
            }
        });

        const cooldownTurns = Math.max(0, Number(skill.cooldown) || 0);
        const cooldownReduction = resolveStatusMetadataThresholdAdjustment({
            actorState,
            targetState: actorState,
            config: skill?.metadata?.cooldownReductionFromStatusMetadataThresholds,
            valueKey: 'amount',
        });
        const useScalingCooldownIncrease = Boolean(skill?.metadata?.cooldownIncreaseAfterEachUse);
        const useScalingCooldownBonus =
            useScalingCooldownIncrease && skill?.id ? Math.max(0, getSkillUseCount(actorState, skill.id)) : 0;
        const selfStatusCooldownIncrease = getStatusMetadataSum(actorState, 'newSkillCooldownIncrease');
        const adjustedCooldownTurns = Math.max(
            0,
            cooldownTurns -
                Math.max(0, Number(cooldownReduction) || 0) +
                useScalingCooldownBonus +
                selfStatusCooldownIncrease
        );
        if (cooldownSkillId && adjustedCooldownTurns > 0) {
            actorState.cooldowns[cooldownSkillId] = Math.max(
                getSkillCooldownRemaining(actorState, cooldownSkillId),
                adjustedCooldownTurns + 1
            );
            actorState._cooldownsStartedThisTurn = actorState._cooldownsStartedThisTurn || {};
            actorState._cooldownsStartedThisTurn[cooldownSkillId] = true;
        }
        const cooldownAfterUses = skill?.metadata?.cooldownAfterEveryUses;
        if (cooldownSkillId && cooldownAfterUses && typeof cooldownAfterUses === 'object') {
            const interval = Math.max(0, Number(cooldownAfterUses.interval) || 0);
            const turns = Math.max(0, Number(cooldownAfterUses.turns) || 0);
            const useCount = getSkillUseCount(actorState, skill.id);
            if (interval > 0 && turns > 0 && useCount > 0 && useCount % interval === 0) {
                actorState.cooldowns[cooldownSkillId] = Math.max(
                    getSkillCooldownRemaining(actorState, cooldownSkillId),
                    turns + 1
                );
                actorState._cooldownsStartedThisTurn = actorState._cooldownsStartedThisTurn || {};
                actorState._cooldownsStartedThisTurn[cooldownSkillId] = true;
            }
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
        const autoCastCharacter = resolveEffectiveCharacter({
            characters,
            rosterIndex: actorUnit.rosterIndex,
            actorState,
        });
        const activeStatuses = Array.isArray(actorState.statuses) ? actorState.statuses : [];
        activeStatuses.forEach((status) => {
            if (!status || (Number(status?.remainingTurns) || 0) <= 0) return;
            const metadata = status?.metadata || {};
            const autoCastSkillId =
                typeof metadata?.autoCastSkillId === 'string' ? metadata.autoCastSkillId.trim() : '';
            if (!autoCastSkillId) return;
            if (!Boolean(metadata?.autoCastOnApply)) return;
            if (metadata?._autoCastOnApplyTriggeredTurnMarker === turnMarker) return;
            const autoSkillIndex = Array.isArray(autoCastCharacter?.skills)
                ? autoCastCharacter.skills.findIndex((entry) => entry?.id === autoCastSkillId)
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
                sourceSlot: Number.isInteger(status?.sourceSlot) ? status.sourceSlot : null,
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
        const endedOngoingStatuses = new Set();
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
                const sourceDead =
                    Boolean(status?.sourceUsername) &&
                    Number.isInteger(status?.sourceSlot) &&
                    (!sourceUnit || sourceUnit.alive === false);
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
                if (
                    (ongoingClass === 'control' || ongoingClass === 'action' || ongoingClass === 'channeled') &&
                    sourceDead &&
                    status?.id
                ) {
                    endedOngoingStatuses.add(status.id);
                    return;
                }
                if (
                    (ongoingClass === 'control' || ongoingClass === 'channeled') &&
                    (sourceStunned || targetInvulnerable)
                ) {
                    if (status?.id) {
                        endedOngoingStatuses.add(status.id);
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
                        metadata: resolveMetadataScaledFromSourceStatus(turnEndApplyStatusToSelf.metadata || {}, status),
                        fresh: Boolean(turnEndApplyStatusToSelf.fresh),
                    });
                }
                const turnEndApplyStatusToAllies = Array.isArray(status?.metadata?.turnEndApplyStatusToAllies)
                    ? status.metadata.turnEndApplyStatusToAllies
                    : [];
                if (turnEndApplyStatusToAllies.length > 0) {
                    const allyUnits = Array.isArray(match.board?.[username]) ? match.board[username] : [];
                    allyUnits.forEach((allyUnit) => {
                        if (!allyUnit || allyUnit.alive === false) return;
                        const allyState = ensureUnitStateShape(allyUnit);
                        turnEndApplyStatusToAllies.forEach((entry) => {
                            if (!entry || !entry.statusId) return;
                            if (
                                entry.condition &&
                                !doesEffectConditionMatch({
                                    actorState: actorState,
                                    targetState: allyState,
                                    actorUnit: unit,
                                    targetUnit: allyUnit,
                                    actorUsername: username,
                                    targetUsername: username,
                                    condition: entry.condition,
                                })
                            ) {
                                return;
                            }
                            applyStatus({
                                targetState: allyState,
                                statusId: entry.statusId,
                                duration: entry.duration,
                                sourceSkillId: status?.sourceSkillId || null,
                                sourceUsername: status?.sourceUsername || null,
                                sourceSlot: Number.isInteger(status?.sourceSlot) ? status.sourceSlot : null,
                                metadata: resolveMetadataScaledFromSourceStatus(entry.metadata || {}, status),
                                fresh: Boolean(entry.fresh),
                            });
                        });
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
                            if (
                                entry.condition &&
                                !doesEffectConditionMatch({
                                    actorState: actorState,
                                    targetState: enemyState,
                                    actorUnit: unit,
                                    targetUnit: enemyUnit,
                                    actorUsername: username,
                                    targetUsername: opponentUsername,
                                    condition: entry.condition,
                                })
                            ) {
                                return;
                            }
                            applyStatus({
                                targetState: enemyState,
                                statusId: entry.statusId,
                                duration: entry.duration,
                                sourceSkillId: status?.sourceSkillId || null,
                                sourceUsername: status?.sourceUsername || null,
                                sourceSlot: Number.isInteger(status?.sourceSlot) ? status.sourceSlot : null,
                                metadata: resolveMetadataScaledFromSourceStatus(entry.metadata || {}, status),
                                fresh: Boolean(entry.fresh),
                            });
                        });
                    });
                }
                const turnEndApplyStatusesToRandomEnemy = Array.isArray(
                    status?.metadata?.turnEndApplyStatusesToRandomEnemy
                )
                    ? status.metadata.turnEndApplyStatusesToRandomEnemy.filter(
                          (entry) => entry && typeof entry === 'object' && entry.statusId
                      )
                    : [];
                const turnEndApplyStatusToRandomEnemy =
                    turnEndApplyStatusesToRandomEnemy.length > 0
                        ? null
                        : status?.metadata?.turnEndApplyStatusToRandomEnemy;
                if (turnEndApplyStatusesToRandomEnemy.length > 0 || turnEndApplyStatusToRandomEnemy?.statusId) {
                    const opponent = players.find((p) => p?.username && p.username !== username);
                    const opponentUsername = opponent?.username;
                    const enemyUnits = Array.isArray(match.board?.[opponentUsername])
                        ? match.board[opponentUsername]
                        : [];
                    const aliveEnemyEntries = enemyUnits
                        .map((enemyUnit, enemySlot) => ({ enemyUnit, enemySlot }))
                        .filter((entry) => entry?.enemyUnit && entry.enemyUnit.alive !== false);
                    if (aliveEnemyEntries.length > 0) {
                        const trackingMetadataKey =
                            typeof turnEndApplyStatusToRandomEnemy?.trackingMetadataKey === 'string' &&
                            turnEndApplyStatusToRandomEnemy.trackingMetadataKey
                                ? turnEndApplyStatusToRandomEnemy.trackingMetadataKey
                                : turnEndApplyStatusesToRandomEnemy.find(
                                      (entry) =>
                                          typeof entry?.trackingMetadataKey === 'string' &&
                                          entry.trackingMetadataKey
                                  )?.trackingMetadataKey || '_lastRandomStatusEnemyKey';
                        const lastKey =
                            typeof status?.metadata?.[trackingMetadataKey] === 'string'
                                ? status.metadata[trackingMetadataKey]
                                : '';
                        const targetStrategy =
                            typeof turnEndApplyStatusToRandomEnemy?.targetStrategy === 'string' &&
                            turnEndApplyStatusToRandomEnemy.targetStrategy
                                ? turnEndApplyStatusToRandomEnemy.targetStrategy
                                : turnEndApplyStatusesToRandomEnemy.find(
                                      (entry) => typeof entry?.targetStrategy === 'string' && entry.targetStrategy
                                  )?.targetStrategy || '';
                        const mustChangeTarget =
                            Boolean(turnEndApplyStatusToRandomEnemy?.mustChangeTarget) ||
                            turnEndApplyStatusesToRandomEnemy.some((entry) => Boolean(entry?.mustChangeTarget));
                        const picked = pickTrackedEnemyEntry({
                            aliveEnemyEntries,
                            opponentUsername,
                            strategy: targetStrategy,
                            previousKey: lastKey,
                            mustChangeTarget,
                        });
                        if (picked?.enemyUnit) {
                            if (status?.metadata && typeof status.metadata === 'object') {
                                status.metadata[trackingMetadataKey] =
                                    `${opponentUsername}:${picked.enemySlot}`;
                            }
                            const pickedState = ensureUnitStateShape(picked.enemyUnit);
                            const entries =
                                turnEndApplyStatusesToRandomEnemy.length > 0
                                    ? turnEndApplyStatusesToRandomEnemy
                                    : [turnEndApplyStatusToRandomEnemy];
                            entries.forEach((entry) => {
                                if (
                                    !doesEffectConditionMatch({
                                        condition: entry?.condition,
                                        actorState,
                                        targetState: pickedState,
                                        actorUnit: unit,
                                        targetUnit: picked.enemyUnit,
                                        actorUsername: username,
                                        targetUsername: opponentUsername,
                                    })
                                ) {
                                    return;
                                }
                                applyStatus({
                                    targetState: pickedState,
                                    statusId: entry.statusId,
                                    duration: entry.duration,
                                    sourceSkillId: status?.sourceSkillId || null,
                                    sourceUsername: status?.sourceUsername || null,
                                    sourceSlot: Number.isInteger(status?.sourceSlot) ? status.sourceSlot : null,
                                    metadata: entry.metadata || {},
                                    fresh: Boolean(entry.fresh),
                                });
                            });
                        }
                    }
                }
                const turnEndEffectsToRandomEnemy = Array.isArray(status?.metadata?.turnEndEffectsToRandomEnemy)
                    ? status.metadata.turnEndEffectsToRandomEnemy.filter(
                          (entry) =>
                              entry &&
                              typeof entry === 'object' &&
                              Array.isArray(entry.effects) &&
                              entry.effects.length > 0
                      )
                    : [];
                const turnEndEffectToRandomEnemy =
                    turnEndEffectsToRandomEnemy.length > 0
                        ? null
                        : status?.metadata?.turnEndEffectToRandomEnemy;
                if (turnEndEffectsToRandomEnemy.length > 0 || Array.isArray(turnEndEffectToRandomEnemy?.effects)) {
                    const opponent = players.find((p) => p?.username && p.username !== username);
                    const opponentUsername = opponent?.username;
                    const enemyUnits = Array.isArray(match.board?.[opponentUsername])
                        ? match.board[opponentUsername]
                        : [];
                    const aliveEnemyEntries = enemyUnits
                        .map((enemyUnit, enemySlot) => ({ enemyUnit, enemySlot }))
                        .filter((entry) => entry?.enemyUnit && entry.enemyUnit.alive !== false);
                    if (aliveEnemyEntries.length > 0) {
                        const trackingMetadataKey =
                            typeof turnEndEffectToRandomEnemy?.trackingMetadataKey === 'string' &&
                            turnEndEffectToRandomEnemy.trackingMetadataKey
                                ? turnEndEffectToRandomEnemy.trackingMetadataKey
                                : turnEndEffectsToRandomEnemy.find(
                                      (entry) =>
                                          typeof entry?.trackingMetadataKey === 'string' &&
                                          entry.trackingMetadataKey
                                  )?.trackingMetadataKey || '_lastRandomStatusEnemyKey';
                        const lastKey =
                            typeof status?.metadata?.[trackingMetadataKey] === 'string'
                                ? status.metadata[trackingMetadataKey]
                                : '';
                        const targetStrategy =
                            typeof turnEndEffectToRandomEnemy?.targetStrategy === 'string' &&
                            turnEndEffectToRandomEnemy.targetStrategy
                                ? turnEndEffectToRandomEnemy.targetStrategy
                                : turnEndEffectsToRandomEnemy.find(
                                      (entry) => typeof entry?.targetStrategy === 'string' && entry.targetStrategy
                                  )?.targetStrategy || '';
                        const mustChangeTarget =
                            Boolean(turnEndEffectToRandomEnemy?.mustChangeTarget) ||
                            turnEndEffectsToRandomEnemy.some((entry) => Boolean(entry?.mustChangeTarget));
                        const picked = pickTrackedEnemyEntry({
                            aliveEnemyEntries,
                            opponentUsername,
                            strategy: targetStrategy,
                            previousKey: lastKey,
                            mustChangeTarget,
                        });
                        if (picked?.enemyUnit) {
                            if (status?.metadata && typeof status.metadata === 'object') {
                                status.metadata[trackingMetadataKey] =
                                    `${opponentUsername}:${picked.enemySlot}`;
                            }
                            const entries =
                                turnEndEffectsToRandomEnemy.length > 0
                                    ? turnEndEffectsToRandomEnemy
                                    : [turnEndEffectToRandomEnemy];
                            entries.forEach((entry) => {
                                const pickedState = ensureUnitStateShape(picked.enemyUnit);
                                if (
                                    !doesEffectConditionMatch({
                                        condition: entry?.condition,
                                        actorState,
                                        targetState: pickedState,
                                        actorUnit: unit,
                                        targetUnit: picked.enemyUnit,
                                        actorUsername: username,
                                        targetUsername: opponentUsername,
                                    })
                                ) {
                                    return;
                                }
                                applyTriggeredEffectsToRecipients({
                                    effects: entry.effects,
                                    match,
                                    status,
                                    recipients: [
                                        {
                                            unit: picked.enemyUnit,
                                            slot: picked.enemySlot,
                                            username: opponentUsername,
                                        },
                                    ],
                                });
                            });
                        }
                    }
                }
                if (Boolean(status?.metadata?.removeEnemyAfflictionStatusesOnTurnEnd)) {
                    cleanseEnemyAfflictionStatuses(
                        unit,
                        username,
                        status?.metadata?.removeEnemyAfflictionStatusesOnTurnEndCount
                    );
                }
                if (ongoingClass === 'action' && (sourceStunned || targetInvulnerable)) return;
                const baseTurnEndDamage = Math.max(0, Number(status?.metadata?.turnEndDamage) || 0);
                let turnEndDamage = baseTurnEndDamage;
                const turnEndIsAffliction = Boolean(status?.metadata?.afflictionDamage);
                const fixedTurnEndDamage = Boolean(status?.metadata?.fixedTurnEndDamage);
                const ignoreSourceNonAfflictionDamageBonus = Boolean(
                    status?.metadata?.ignoreSourceNonAfflictionDamageBonus
                );
                if (baseTurnEndDamage > 0 && !fixedTurnEndDamage) {
                    turnEndDamage = Math.max(
                        0,
                        baseTurnEndDamage +
                            sourceDamageBonusFlat -
                            sourceDamageDebuffFlat +
                            (turnEndIsAffliction || ignoreSourceNonAfflictionDamageBonus
                                ? 0
                                : sourceNonAfflictionDamageBonusFlat - sourceNonAfflictionDamageDebuffFlat)
                    );
                }
                const sourceOutgoingCap = sourceState ? getOutgoingDamageCap(sourceState, sourceUnit) : null;
                if (sourceOutgoingCap !== null && !fixedTurnEndDamage) {
                    turnEndDamage = Math.min(turnEndDamage, sourceOutgoingCap);
                }
                if (turnEndDamage > 0) {
                    const affliction = turnEndIsAffliction;
                    const mitigationBudgetKey = `${username || ''}:${Number.isInteger(unitSlot) ? unitSlot : ''}`;
                    const dealt = applyDamageToUnit(unit, turnEndDamage, {
                        match,
                        sourceSkillId: status?.sourceSkillId || null,
                        sourceUsername: status?.sourceUsername || null,
                        sourceSlot: Number.isInteger(status?.sourceSlot) ? status.sourceSlot : null,
                        targetUsername: username,
                        afflictionDamage: affliction,
                        damageDebugReason: 'turn end',
                        fixedDamage: fixedTurnEndDamage,
                        ignoreDamageImmunity: Boolean(status?.metadata?.ignoreDamageImmunity),
                        ignoreAfflictionDamageImmunity: Boolean(
                            status?.metadata?.ignoreAfflictionDamageImmunity
                        ),
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

                    const transformationChance = Number(status?.metadata?.transformationChance) || 0;
                    if (transformationChance > 0 && Math.random() < transformationChance) {
                        const transformationId = status?.metadata?.transformationCharacterId;
                        const transformationFace = status?.metadata?.transformationFacePicture;
                        if (transformationId) {
                            applyStatus({
                                targetState: actorState,
                                statusId: `transformation_into_${transformationId}_permanent`,
                                duration: 999,
                                metadata: {
                                    infiniteDuration: true,
                                    effectiveCharacterId: transformationId,
                                    facePictureOverride: transformationFace,
                                    unremovable: true,
                                    tooltipText: `This character has been turned into ${transformationId.replace(/-/g, ' ')}.`,
                                },
                            });
                        }
                    }
                }
                if (Boolean(status?.metadata?.turnEndDestroyDestructibleDefense)) {
                    destroyAllDestructibleDefenseOnUnit(unit);
                }

                const baseTurnEndRandomEnemyDamage = Math.max(
                    0,
                    Number(status?.metadata?.turnEndRandomEnemyDamage) || 0
                );
                const randomEnemyIsAffliction = hasSkillClass(
                    status?.metadata?.turnEndRandomEnemySkillClasses || [],
                    'affliction'
                );
                const adjustedRandomEnemyDamage =
                    baseTurnEndRandomEnemyDamage > 0
                        ? Math.max(
                              0,
                              baseTurnEndRandomEnemyDamage +
                                  sourceDamageBonusFlat -
                                  sourceDamageDebuffFlat +
                                  (randomEnemyIsAffliction ||
                                  Boolean(status?.metadata?.ignoreSourceNonAfflictionDamageBonus)
                                      ? 0
                                      : sourceNonAfflictionDamageBonusFlat - sourceNonAfflictionDamageDebuffFlat)
                          )
                        : 0;
                const cappedRandomEnemyDamage =
                    sourceState && getOutgoingDamageCap(sourceState, sourceUnit) !== null
                        ? Math.min(adjustedRandomEnemyDamage, getOutgoingDamageCap(sourceState, sourceUnit))
                        : adjustedRandomEnemyDamage;
                if (cappedRandomEnemyDamage > 0) {
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
                            const pickedState = ensureUnitStateShape(picked.enemyUnit);
                            const pickedHasPreferredStatus =
                                preferredStatusId && hasStatus(pickedState, preferredStatusId);
                            const mitigationBudgetKey = `${opponentUsername || ''}:${
                                Number.isInteger(picked?.enemySlot) ? picked.enemySlot : ''
                            }`;
                            applyDamageToUnit(picked.enemyUnit, cappedRandomEnemyDamage, {
                                match,
                                sourceSkillId: status?.sourceSkillId || null,
                                sourceUsername: username,
                                sourceSlot: unitSlot,
                                targetUsername: opponentUsername,
                                afflictionDamage: randomEnemyIsAffliction,
                                skillClasses: status?.metadata?.turnEndRandomEnemySkillClasses || [],
                                damageDebugReason: 'turn end random',
                                ignoreDamageImmunity:
                                    Boolean(status?.metadata?.turnEndRandomEnemyIgnoreDamageImmunity) ||
                                    (Boolean(status?.metadata?.turnEndRandomEnemyIgnoreDamageImmunityIfPreferredStatus) &&
                                        pickedHasPreferredStatus),
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
                            const executeThreshold = Number(
                                status?.metadata?.turnEndRandomEnemyExecuteBelowHpThreshold
                            );
                            if (
                                Number.isFinite(executeThreshold) &&
                                executeThreshold >= 0 &&
                                picked.enemyUnit.alive !== false &&
                                Math.max(0, Number(picked.enemyUnit.hp) || 0) <= executeThreshold
                            ) {
                                picked.enemyUnit.hp = 0;
                                picked.enemyUnit.alive = false;
                                triggerTeamMemberDeathHooks({
                                    match,
                                    deadUsername: opponentUsername,
                                    deadSlot: picked.enemySlot,
                                });
                                triggerOwnerDeathHooks({
                                    unit: picked.enemyUnit,
                                    match,
                                    username: opponentUsername,
                                    slot: picked.enemySlot,
                                });
                                triggerSourceKillHooks({
                                    match,
                                    sourceUsername: username,
                                    sourceSlot: unitSlot,
                                    targetUsername: opponentUsername,
                                    sourceSkillId: status?.sourceSkillId || null,
                                    sourceSkillClasses: status?.metadata?.turnEndRandomEnemySkillClasses || [],
                                });
                            }
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
                const turnEndHealFlat = Math.max(0, Number(status?.metadata?.turnEndHealFlat) || 0);
                if (turnEndHealFlat > 0) {
                    applyHealToUnit(unit, turnEndHealFlat);
                }
                const turnEndHealthLoss = Math.max(0, Number(status?.metadata?.turnEndHealthLoss) || 0);
                if (turnEndHealthLoss > 0) {
                    applyHealthLossToUnit(unit, turnEndHealthLoss, {
                        match,
                        sourceSkillId: status?.sourceSkillId || null,
                        targetUsername: username,
                        targetSlot: unitSlot,
                        damageDebugReason: 'turn end health loss',
                    });
                }
                const turnEndHealthCapLoss = Math.max(
                    0,
                    Number(status?.metadata?.turnEndHealthCapLoss) || 0
                );
                if (turnEndHealthCapLoss > 0) {
                    applyHealthCapLossToUnit(unit, turnEndHealthCapLoss, {
                        match,
                        targetUsername: username,
                        targetSlot: unitSlot,
                    });
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
                            sourceSlot: Number.isInteger(status?.sourceSlot) ? status.sourceSlot : null,
                            targetUsername: username,
                            afflictionDamage: Boolean(status?.metadata?.afflictionDamage),
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
                    const wasAlive = unit.alive !== false;
                    unit.hp = nextHp;
                    if (unit.hp <= 0) {
                        unit.alive = false;
                    }
                    if (wasAlive && unit.alive === false) {
                        triggerTeamMemberDeathHooks({
                            match,
                            deadUsername: username,
                            deadSlot: unitSlot,
                        });
                        triggerOwnerDeathHooks({
                            unit,
                            match,
                            username,
                            slot: unitSlot,
                        });
                    }
                }
                const turnEndModifyCooldownsSelf =
                    status?.metadata?.turnEndModifyCooldownsSelf &&
                    typeof status.metadata.turnEndModifyCooldownsSelf === 'object'
                        ? status.metadata.turnEndModifyCooldownsSelf
                        : null;
                if (turnEndModifyCooldownsSelf && username === endingUsername && !isUnitBanished(unit)) {
                    const cooldowns =
                        actorState.cooldowns && typeof actorState.cooldowns === 'object'
                            ? actorState.cooldowns
                            : {};
                    const operation =
                        typeof turnEndModifyCooldownsSelf.operation === 'string'
                            ? turnEndModifyCooldownsSelf.operation.trim().toLowerCase()
                            : 'add';
                    const amount = Number(turnEndModifyCooldownsSelf.amount) || 0;
                    const skillIds = Array.isArray(turnEndModifyCooldownsSelf.skillIds)
                        ? turnEndModifyCooldownsSelf.skillIds.filter((entry) => typeof entry === 'string' && entry)
                        : [];
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
                    actorState.cooldowns = cooldowns;
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
                    if (status?.id && endedOngoingStatuses.has(status.id)) return null;
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
                    if (
                        Boolean(status?.metadata?.skipFirstTurnEndTick) &&
                        !Boolean(status?.metadata?._skipFirstTurnEndTickConsumed)
                    ) {
                        return {
                            ...status,
                            fresh: false,
                            metadata: {
                                ...(status.metadata || {}),
                                _skipFirstTurnEndTickConsumed: true,
                            },
                        };
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
                        triggerStoredStatusEffects({
                            match,
                            status,
                            targetUnit: unit,
                            targetState: actorState,
                            targetUsername: username,
                            targetSlot: unitSlot,
                            pendingStatuses: pendingExpireStatuses,
                        });
                    }
                    if (nextRemaining <= 0) {
                        queueExpireReplacementStatuses({
                            pendingExpireStatuses,
                            sourceStatus: status,
                            actorState,
                            targetState: actorState,
                            actorUnit: unit,
                            targetUnit: unit,
                            actorUsername: username,
                            targetUsername: username,
                            replacements:
                                status?.metadata?.onExpireApplyStatusesToSelf ||
                                status?.metadata?.onExpireApplyStatusToSelf,
                        });
                    }
                        return {
                            ...status,
                            fresh: false,
                            remainingTurns: nextRemaining,
                        };
                    }
                    const nextRemaining = (status.remainingTurns || 0) - 1;
                    const turnEndRandomizeConfig =
                        status?.metadata?.turnEndRandomizeMetadataKeyFromOptions &&
                        typeof status.metadata.turnEndRandomizeMetadataKeyFromOptions === 'object'
                            ? status.metadata.turnEndRandomizeMetadataKeyFromOptions
                            : null;
                    if (nextRemaining <= 0 && turnEndRandomizeConfig) {
                        const metadataKey =
                            typeof turnEndRandomizeConfig.metadataKey === 'string' && turnEndRandomizeConfig.metadataKey
                                ? turnEndRandomizeConfig.metadataKey
                                : '';
                        const options = Array.isArray(turnEndRandomizeConfig.options)
                            ? turnEndRandomizeConfig.options
                            : Array.isArray(turnEndRandomizeConfig.values)
                            ? turnEndRandomizeConfig.values
                            : [];
                        if (metadataKey && options.length > 0) {
                            const currentValue = status?.metadata?.[metadataKey];
                            const chosenValue = chooseRandomOption(
                                options.filter(
                                    (entry) => !Boolean(turnEndRandomizeConfig.excludeCurrentValue) || entry !== currentValue
                                ),
                                currentValue
                            );
                            status.metadata = {
                                ...(status.metadata || {}),
                                [metadataKey]: chosenValue,
                            };
                            if (
                                typeof status?.metadata?.tooltipTextTemplate === 'string' &&
                                status.metadata.tooltipTextTemplate
                            ) {
                                status.metadata.tooltipText = renderTooltipTemplate(
                                    status.metadata.tooltipTextTemplate,
                                    status.metadata
                                );
                            }
                            const resetDuration = Math.max(
                                1,
                                Number(turnEndRandomizeConfig.resetDuration) || 1
                            );
                            return {
                                ...status,
                                fresh: false,
                                remainingTurns: resetDuration,
                            };
                        }
                    }
                    if (nextRemaining <= 0) {
                        triggerSuperMultiSizeBurst({
                            status,
                            actorState,
                            sourceUsername: username,
                            sourceSlot: unitSlot,
                        });
                        triggerStoredStatusEffects({
                            match,
                            status,
                            targetUnit: unit,
                            targetState: actorState,
                            targetUsername: username,
                            targetSlot: unitSlot,
                            pendingStatuses: pendingExpireStatuses,
                        });
                    }
                    if (nextRemaining <= 0) {
                        queueExpireReplacementStatuses({
                            pendingExpireStatuses,
                            sourceStatus: status,
                            actorState,
                            targetState: actorState,
                            actorUnit: unit,
                            targetUnit: unit,
                            actorUsername: username,
                            targetUsername: username,
                            replacements:
                                status?.metadata?.onExpireApplyStatusesToSelf ||
                                status?.metadata?.onExpireApplyStatusToSelf,
                        });
                    }
                    return { ...status, remainingTurns: nextRemaining };
                })
                .filter((status) => status && (status.remainingTurns || 0) > 0);
            if (pendingExpireStatuses.length > 0) {
                actorState.statuses.push(...pendingExpireStatuses);
            }
            refreshDerivedStatusTooltips(actorState);
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

const applyOnTeamMemberUseSkillBonuses = ({ match, actorState, actingUsername, skill, skillIsMental }) => {
    if (!match || !actorState || !actingUsername || !skill) return;
    const teamUnits = Array.isArray(match.board?.[actingUsername]) ? match.board[actingUsername] : [];
    if (!teamUnits.length) return;
    const costCountCache = new Map();

    const getCountForTypes = (energyTypes = []) => {
        const key = Array.isArray(energyTypes)
            ? energyTypes
                  .map((entry) => (typeof entry === 'string' ? entry.trim().toLowerCase() : ''))
                  .filter(Boolean)
                  .join('|')
            : '';
        if (!key) return 0;
        if (costCountCache.has(key)) return costCountCache.get(key);
        const count = getEffectiveEnergyCostCountForTypes(skill, actorState, energyTypes);
        costCountCache.set(key, count);
        return count;
    };

    teamUnits.forEach((teamUnit, teamSlot) => {
        if (!teamUnit || teamUnit.alive === false) return;
        const teamState = ensureUnitStateShape(teamUnit);
        (Array.isArray(teamState.statuses) ? teamState.statuses : []).forEach((status) => {
            const remaining = Number(status?.remainingTurns) || 0;
            if (remaining <= 0) return;
            const metadata = status?.metadata || {};
            const teamUseSkillClassesAny = Array.isArray(metadata.onTeamMemberUseSkillClassesAny)
                ? metadata.onTeamMemberUseSkillClassesAny
                      .map((entry) => normalizeSkillClassName(entry))
                      .filter(Boolean)
                : [];
            const teamSkillMatchesClassFilter =
                teamUseSkillClassesAny.length === 0 ||
                teamUseSkillClassesAny.some((entry) => hasSkillClass(skill?.classes || [], entry));
            if (!teamSkillMatchesClassFilter) return;

            const onTeamMemberUseSkillApplyStatusToOwner = metadata.onTeamMemberUseSkillApplyStatusToOwner;
            if (onTeamMemberUseSkillApplyStatusToOwner?.statusId) {
                const energyTypes = Array.isArray(onTeamMemberUseSkillApplyStatusToOwner.energyTypes)
                    ? onTeamMemberUseSkillApplyStatusToOwner.energyTypes
                    : chakraTypes;
                const matchCount = getCountForTypes(energyTypes);
                if (matchCount > 0) {
                    const nextMetadata = {
                        ...(onTeamMemberUseSkillApplyStatusToOwner.metadata || {}),
                    };
                    const scaleMetadataKeys = Array.isArray(
                        onTeamMemberUseSkillApplyStatusToOwner.scaleMetadataKeys
                    )
                        ? onTeamMemberUseSkillApplyStatusToOwner.scaleMetadataKeys.filter(
                              (key) => typeof key === 'string' && key
                          )
                        : [];
                    scaleMetadataKeys.forEach((key) => {
                        nextMetadata[key] = (Number(nextMetadata[key]) || 0) * matchCount;
                    });
                    applyStatus({
                        targetState: actorState,
                        statusId: onTeamMemberUseSkillApplyStatusToOwner.statusId,
                        duration: onTeamMemberUseSkillApplyStatusToOwner.duration,
                        sourceSkillId: status?.sourceSkillId || null,
                        sourceUsername: actingUsername || status?.sourceUsername || null,
                        sourceSlot: Number.isInteger(teamSlot)
                            ? teamSlot
                            : Number.isInteger(status?.sourceSlot)
                            ? status.sourceSlot
                            : null,
                        metadata: nextMetadata,
                        fresh: false,
                    });
                }
            }
        });
    });
};

const applyOnEnemyTeamMemberUseSkillBonuses = ({
    match,
    actorState,
    actingUsername,
    actorUnit = null,
    skill,
    skillIsMental,
}) => {
    if (!match || !actorState || !actingUsername || !skill) return;
    const opponent = (match.players || []).find((player) => player?.username && player.username !== actingUsername);
    const opponentUsername = opponent?.username;
    const opponentTeamUnits = opponentUsername ? match.board?.[opponentUsername] || [] : [];
    if (!opponentTeamUnits.length) return;
    opponentTeamUnits.forEach((teamUnit, teamSlot) => {
        if (!teamUnit || teamUnit.alive === false) return;
        const teamState = ensureUnitStateShape(teamUnit);
        (Array.isArray(teamState.statuses) ? teamState.statuses : []).forEach((status) => {
            if (!isStatusActiveForMetadata(status, teamUnit)) return;
            const metadata = status?.metadata || {};
            const applyStatusToTarget = metadata.onEnemyTeamMemberUseSkillApplyStatusToTarget;
            if (!applyStatusToTarget?.statusId) return;
            const classFilter = Array.isArray(metadata.onEnemyTeamMemberUseSkillClassesAny)
                ? metadata.onEnemyTeamMemberUseSkillClassesAny
                      .map((entry) => normalizeSkillClassName(entry))
                      .filter(Boolean)
                : [];
            if (
                classFilter.length > 0 &&
                !classFilter.some((entry) => hasSkillClass(skill?.classes || [], entry))
            ) {
                return;
            }
            applyStatus({
                targetState: actorUnit ? ensureUnitStateShape(actorUnit) : teamState,
                statusId: applyStatusToTarget.statusId,
                duration: applyStatusToTarget.duration,
                sourceSkillId: resolveTriggeredEffectSourceSkillId({
                    status,
                    config: applyStatusToTarget,
                    fallbackSkillId: skill?.id || null,
                }),
                sourceUsername: opponentUsername || status?.sourceUsername || null,
                sourceSlot: Number.isInteger(teamSlot)
                    ? teamSlot
                    : Number.isInteger(status?.sourceSlot)
                    ? status.sourceSlot
                    : null,
                metadata: applyStatusToTarget.metadata || {},
                fresh: false,
            });
        });
    });
};

const applyOnTeamMemberSuccessfulDamageBonuses = ({
    match,
    actingUsername,
    targetUnit,
    targetUsername,
    targetSlot = null,
    sourceSkillId = null,
    sourceSkillClasses = [],
    sourceSlot = null,
}) => {
    if (!match || !actingUsername || !targetUnit || !targetUsername) return;
    const teamUnits = Array.isArray(match.board?.[actingUsername]) ? match.board[actingUsername] : [];
    if (!teamUnits.length) return;
    const targetState = ensureUnitStateShape(targetUnit);
    teamUnits.forEach((teamUnit, teamSlot) => {
        if (!teamUnit || teamUnit.alive === false) return;
        const teamState = ensureUnitStateShape(teamUnit);
        (Array.isArray(teamState.statuses) ? teamState.statuses : []).forEach((status) => {
            if (!isStatusActiveForMetadata(status, teamUnit)) return;
            const metadata = status?.metadata || {};
            const applyStatusToTarget = metadata.onTeamMemberSuccessfulDamageApplyStatusToTarget;
            if (!applyStatusToTarget?.statusId) return;
            const classFilter = Array.isArray(metadata.onTeamMemberSuccessfulDamageSkillClassesAny)
                ? metadata.onTeamMemberSuccessfulDamageSkillClassesAny
                      .map((entry) => normalizeSkillClassName(entry))
                      .filter(Boolean)
                : [];
            if (
                classFilter.length > 0 &&
                !classFilter.some((entry) => hasSkillClass(sourceSkillClasses, entry))
            ) {
                return;
            }
            applyStatus({
                targetState,
                statusId: applyStatusToTarget.statusId,
                duration: applyStatusToTarget.duration,
                sourceSkillId: resolveTriggeredEffectSourceSkillId({
                    status,
                    config: applyStatusToTarget,
                    fallbackSkillId: sourceSkillId,
                }),
                sourceUsername: status?.sourceUsername || actingUsername || null,
                sourceSlot: Number.isInteger(status?.sourceSlot)
                    ? status.sourceSlot
                    : Number.isInteger(teamSlot)
                    ? teamSlot
                    : null,
                metadata: applyStatusToTarget.metadata || {},
                fresh: false,
            });
        });
    });
};

const applyOnTeamMemberDamageTakenBonuses = ({
    match,
    actingUsername,
    targetUnit,
    targetUsername,
    targetSlot = null,
    targetHpBefore = null,
    sourceSkillId = null,
    sourceSkillClasses = [],
    sourceSlot = null,
    afflictionDamage = false,
}) => {
    if (!match || !actingUsername || !targetUnit || !targetUsername) return;
    const teamUnits = Array.isArray(match.board?.[targetUsername]) ? match.board[targetUsername] : [];
    if (!teamUnits.length) return;
    teamUnits.forEach((teamUnit, teamSlot) => {
        if (!teamUnit || teamUnit.alive === false) return;
        const teamState = ensureUnitStateShape(teamUnit);
        (Array.isArray(teamState.statuses) ? teamState.statuses : []).forEach((status) => {
            if (!isStatusActiveForMetadata(status, teamUnit)) return;
            const metadata = status?.metadata || {};
            const applyStatusToSelf = metadata.onTeamMemberDamageTakenApplyStatusToOwner;
            if (!applyStatusToSelf?.statusId) return;
            if (Boolean(applyStatusToSelf.ownerOnly) && Number(teamSlot) !== Number(targetSlot)) {
                return;
            }
            if (Boolean(applyStatusToSelf.allyOnly) && Number(teamSlot) === Number(targetSlot)) {
                return;
            }
            if (Boolean(applyStatusToSelf.enemyOnly) && actingUsername === targetUsername) return;
            if (afflictionDamage && Boolean(applyStatusToSelf.nonAfflictionOnly)) return;
            const targetCurrentHp = Math.max(0, Number(targetUnit?.hp) || 0);
            const targetHpBeforeDamage = Number.isFinite(Number(targetHpBefore))
                ? Math.max(0, Number(targetHpBefore) || 0)
                : targetCurrentHp;
            const targetHpAtMost = Number(applyStatusToSelf.targetCurrentHpAtMost);
            if (Number.isFinite(targetHpAtMost) && targetCurrentHp > targetHpAtMost) return;
            const targetHpBeforeAtLeast = Number(applyStatusToSelf.targetPreviousHpAtLeast);
            if (Number.isFinite(targetHpBeforeAtLeast) && targetHpBeforeDamage < targetHpBeforeAtLeast) return;
            const classFilter = Array.isArray(metadata.onTeamMemberDamageTakenSkillClassesAny)
                ? metadata.onTeamMemberDamageTakenSkillClassesAny
                      .map((entry) => normalizeSkillClassName(entry))
                      .filter(Boolean)
                : [];
            if (
                classFilter.length > 0 &&
                !classFilter.some((entry) => hasSkillClass(sourceSkillClasses, entry))
            ) {
                return;
            }
            applyStatus({
                targetState: teamState,
                statusId: applyStatusToSelf.statusId,
                duration: applyStatusToSelf.duration,
                sourceSkillId: resolveTriggeredEffectSourceSkillId({
                    status,
                    config: applyStatusToSelf,
                    fallbackSkillId: sourceSkillId,
                }),
                sourceUsername: targetUsername || status?.sourceUsername || actingUsername || null,
                sourceSlot: Number.isInteger(teamSlot)
                    ? teamSlot
                    : Number.isInteger(status?.sourceSlot)
                    ? status.sourceSlot
                    : Number.isInteger(sourceSlot)
                    ? sourceSlot
                    : null,
                metadata: applyStatusToSelf.metadata || {},
                fresh: false,
            });
        });
    });
};

const applyOnOwnerDamagedByBaseDamageBonuses = ({
    match,
    targetState,
    targetUnit,
    sourceUsername,
    targetUsername,
    sourceSkillId = null,
    sourceSlot = null,
    sourceBaseDamage = 0,
}) => {
    if (!targetState || !targetUnit) return;
    const statuses = Array.isArray(targetState.statuses) ? targetState.statuses : [];
    statuses.forEach((status) => {
        if (!isStatusActiveForMetadata(status, targetUnit)) return;
        const metadata = status?.metadata || {};
        const trigger = metadata.onOwnerDamagedByBaseDamageAtLeastApplyStatusToOwner;
        if (!trigger?.statusId) return;
        if (Boolean(trigger.enemyOnly) && sourceUsername === targetUsername) return;
        const threshold = Math.max(0, Number(trigger.threshold) || 0);
        if (Math.max(0, Number(sourceBaseDamage) || 0) < threshold) return;
        if (Boolean(trigger.oncePerSourceSkillPerTurn) && sourceSkillId && targetState?.snapshots) {
            const turnCount = Math.max(0, Number(match?.economy?.turnCounts?.[sourceUsername || '']) || 0);
            const key = [
                targetUsername || '',
                sourceUsername || '',
                Number.isInteger(sourceSlot) ? sourceSlot : '',
                sourceSkillId,
                turnCount,
                status?.id || '',
            ].join('|');
            if (targetState.snapshots._ownerDamageThresholdTriggerKey === key) return;
            targetState.snapshots._ownerDamageThresholdTriggerKey = key;
        }
        applyStatus({
            targetState,
            statusId: trigger.statusId,
            duration: trigger.duration,
            sourceSkillId: resolveTriggeredEffectSourceSkillId({
                status,
                config: trigger,
                fallbackSkillId: sourceSkillId,
            }),
            sourceUsername: sourceUsername || null,
            sourceSlot: Number.isInteger(sourceSlot) ? sourceSlot : null,
            metadata: trigger.metadata || {},
            fresh: false,
        });
    });
};

const applyTriggeredEffectsFromStatus = ({
    effects,
    match,
    status,
    targetUnit,
    targetState,
    targetUsername,
    targetSlot,
    pendingStatuses = null,
}) => {
    if (!Array.isArray(effects) || !effects.length || !targetUnit || !targetState) return;
    const mitigationBudgetKey = `${targetUsername || ''}:${Number.isInteger(targetSlot) ? targetSlot : ''}`;
    effects.forEach((effect) => {
        if (!effect || typeof effect !== 'object') return;
        const condition = effect?.condition;
        if (
            condition &&
            !doesEffectConditionMatch({
                condition,
                actorState: targetState,
                targetState,
                actorUnit: targetUnit,
                targetUnit,
                actorUsername: targetUsername,
                targetUsername,
            })
        ) {
            return;
        }
        if (effect.type === 'damage' || effect.type === 'health_steal_damage') {
            const isHealthStealDamage = effect.type === 'health_steal_damage';
            const amount = Math.max(0, Number(effect?.amount) || 0);
            if (amount <= 0) return;
            const sourceUsername = status?.sourceUsername || null;
            const sourceSlot = Number.isInteger(status?.sourceSlot) ? status.sourceSlot : null;
            const sourceUnit =
                isHealthStealDamage &&
                match &&
                sourceUsername &&
                Number.isInteger(sourceSlot) &&
                Array.isArray(match.board?.[sourceUsername])
                    ? match.board[sourceUsername][sourceSlot]
                    : null;
            if (isHealthStealDamage && sourceUnit) {
                applyHealthStealToUnit({
                    targetUnit,
                    sourceUnit,
                    rawAmount: amount,
                    context: {
                        match,
                        sourceSkillId: status?.sourceSkillId || null,
                        sourceUsername,
                        sourceSlot,
                        targetUsername,
                        targetSlot,
                        afflictionDamage: Boolean(effect?.metadata?.afflictionDamage),
                        skillClasses: Array.isArray(effect?.metadata?.skillClasses)
                            ? effect.metadata.skillClasses
                            : [],
                        damageDebugReason: 'status effect',
                        ignoreDestructibleDefense: Boolean(effect?.metadata?.ignoreDestructibleDefense),
                        unpierceableBudgetMap: new Map(),
                        unpierceableBudgetKey: mitigationBudgetKey,
                        standardMitigationBudgetMap: new Map(),
                        standardMitigationBudgetKey: mitigationBudgetKey,
                        percentMitigationStateMap: new Map(),
                        percentMitigationStateKey: mitigationBudgetKey,
                    },
                });
            } else {
                applyDamageToUnit(targetUnit, amount, {
                    match,
                    sourceSkillId: status?.sourceSkillId || null,
                    sourceUsername,
                    sourceSlot,
                    targetUsername,
                    afflictionDamage: Boolean(effect?.metadata?.afflictionDamage),
                    skillClasses: Array.isArray(effect?.metadata?.skillClasses) ? effect.metadata.skillClasses : [],
                    damageDebugReason: 'status effect',
                    ignoreDamageReduction: Boolean(effect?.metadata?.ignoreDamageReduction),
                    ignoreDestructibleDefense: Boolean(effect?.metadata?.ignoreDestructibleDefense),
                    unpierceableBudgetMap: new Map(),
                    unpierceableBudgetKey: mitigationBudgetKey,
                    standardMitigationBudgetMap: new Map(),
                    standardMitigationBudgetKey: mitigationBudgetKey,
                    percentMitigationStateMap: new Map(),
                    percentMitigationStateKey: mitigationBudgetKey,
                });
            }
            return;
        }
        if (effect.type === 'HealthLoss') {
            const amount = Math.max(0, Number(effect?.amount) || 0);
            if (amount <= 0) return;
            applyHealthLossToUnit(targetUnit, amount, {
                match,
                sourceSkillId: status?.sourceSkillId || null,
                sourceUsername: status?.sourceUsername || null,
                sourceSlot: Number.isInteger(status?.sourceSlot) ? status.sourceSlot : null,
                targetUsername,
                targetSlot,
                damageDebugReason: 'status effect',
            });
            return;
        }
        if (effect.type === 'HealthCapLoss') {
            const amount = Math.max(0, Number(effect?.amount) || 0);
            if (amount <= 0) return;
            applyHealthCapLossToUnit(targetUnit, amount, {
                match,
                targetUsername,
                targetSlot,
            });
            return;
        }
        if (effect.type === 'apply_status' && effect.statusId) {
            applyStatus({
                targetState: Array.isArray(pendingStatuses) ? { statuses: pendingStatuses } : targetState,
                statusId: effect.statusId,
                duration: effect.duration,
                sourceSkillId: status?.sourceSkillId || null,
                sourceUsername: status?.sourceUsername || null,
                sourceSlot: Number.isInteger(status?.sourceSlot) ? status.sourceSlot : null,
                metadata: effect.metadata || {},
                fresh: false,
            });
            return;
        }
        if (effect.type === 'cleanse_statuses') {
            const maxCountRaw = Number(effect?.count);
            const maxCount = Number.isFinite(maxCountRaw) && maxCountRaw >= 0 ? Math.floor(maxCountRaw) : 0;
            const removeAll = maxCount <= 0;
        const sourceRelation =
            typeof effect?.sourceRelation === 'string' ? effect.sourceRelation.trim().toLowerCase() : 'any';
        const exactStatusIds = [
            ...(typeof effect?.statusId === 'string' && effect.statusId ? [effect.statusId] : []),
            ...(Array.isArray(effect?.statusIdsAny)
                ? effect.statusIdsAny.filter((entry) => typeof entry === 'string' && entry)
                : []),
        ];
        const metadataAny = Array.isArray(effect?.metadataAny)
            ? effect.metadataAny.filter((entry) => typeof entry === 'string' && entry)
            : [];
            targetState.statuses = (Array.isArray(targetState.statuses) ? targetState.statuses : []).filter((entry) => {
                if (!entry || (Number(entry?.remainingTurns) || 0) <= 0) return true;
                if (!removeAll && maxCount > 0) {
                    // handled by removed counter below
                }
                const sourceUsername = entry?.sourceUsername || '';
                const fromEnemy =
                    Boolean(sourceUsername) && Boolean(targetUsername) && sourceUsername !== targetUsername;
                const fromAlly =
                    Boolean(sourceUsername) && Boolean(targetUsername) && sourceUsername === targetUsername;
                if (sourceRelation === 'enemy' && !fromEnemy) return true;
                if (sourceRelation === 'ally' && !fromAlly) return true;
                if (exactStatusIds.length > 0 && !exactStatusIds.includes(entry?.id)) return true;
                if (Boolean(effect?.harmfulOnly) && !Boolean(entry?.metadata?.harmful)) return true;
                if (metadataAny.length > 0) {
                    const hasAny = metadataAny.some((key) => Boolean(entry?.metadata?.[key]));
                    if (!hasAny) return true;
                }
                if (!removeAll) {
                    effect._removedCount = Math.max(0, Number(effect._removedCount) || 0);
                    if (effect._removedCount >= maxCount) return true;
                    effect._removedCount += 1;
                }
                return false;
            });
            refreshDerivedStatusTooltips(targetState);
        }
    });
};

const getAliveEnemyRecipients = ({ match, username }) => {
    if (!match || !username) return [];
    return (match.players || [])
        .filter((player) => player?.username && player.username !== username)
        .flatMap((player) => {
            const enemyUsername = player.username;
            const enemyUnits = Array.isArray(match.board?.[enemyUsername]) ? match.board[enemyUsername] : [];
            return enemyUnits
                .map((enemyUnit, enemySlot) => ({
                    unit: enemyUnit,
                    slot: enemySlot,
                    username: enemyUsername,
                }))
                .filter((entry) => entry?.unit && entry.unit.alive !== false && !isUnitBanished(entry.unit));
        });
};

const applyTriggeredEffectsToRecipients = ({
    effects,
    match,
    status,
    recipients,
    pendingStatuses = null,
}) => {
    if (!Array.isArray(effects) || !effects.length || !Array.isArray(recipients) || !recipients.length) return;
    recipients.forEach((recipient) => {
        if (!recipient?.unit || recipient.unit.alive === false) return;
        const targetState = ensureUnitStateShape(recipient.unit);
        applyTriggeredEffectsFromStatus({
            effects,
            match,
            status,
            targetUnit: recipient.unit,
            targetState,
            targetUsername: recipient.username || null,
            targetSlot: Number.isInteger(recipient.slot) ? recipient.slot : null,
            pendingStatuses,
        });
    });
};

const swapBoardPositions = ({ match, unitA, unitB }) => {
    if (!match || !unitA || !unitB || unitA === unitB) return;
    const usernameA = unitA.username || null;
    const usernameB = unitB.username || null;
    const slotA = Number.isInteger(unitA.slot) ? unitA.slot : null;
    const slotB = Number.isInteger(unitB.slot) ? unitB.slot : null;
    if (!usernameA || !usernameB || slotA === null || slotB === null) return;
    const boardA = Array.isArray(match.board?.[usernameA]) ? match.board[usernameA] : null;
    const boardB = Array.isArray(match.board?.[usernameB]) ? match.board[usernameB] : null;
    if (!boardA || !boardB) return;
    const sameBoard = usernameA === usernameB;
    if (sameBoard) {
        const temp = boardA[slotA];
        boardA[slotA] = boardA[slotB];
        boardA[slotB] = temp;
        if (boardA[slotA]) boardA[slotA].slot = slotA;
        if (boardA[slotB]) boardA[slotB].slot = slotB;
    } else {
        const temp = boardA[slotA];
        boardA[slotA] = boardB[slotB];
        boardB[slotB] = temp;
        if (boardA[slotA]) boardA[slotA].slot = slotA;
        if (boardB[slotB]) boardB[slotB].slot = slotB;
    }
    const nextSlotA = slotB;
    const nextSlotB = slotA;
    if (unitA) unitA.slot = nextSlotA;
    if (unitB) unitB.slot = nextSlotB;
};

const triggerStoredStatusEffects = ({
    match,
    status,
    targetUnit,
    targetState,
    targetUsername,
    targetSlot,
    pendingStatuses = null,
}) => {
    if (!status || !match || !targetUnit || !targetState) return;
    const selfEffects = Array.isArray(status?.metadata?.onExpireEffects) ? status.metadata.onExpireEffects : [];
    if (selfEffects.length > 0) {
        applyTriggeredEffectsFromStatus({
            effects: selfEffects,
            match,
            status,
            targetUnit,
            targetState,
            targetUsername,
            targetSlot,
            pendingStatuses,
        });
    }
    const enemyTeamEffects = Array.isArray(status?.metadata?.onExpireEffectsToEnemiesOfSource)
        ? status.metadata.onExpireEffectsToEnemiesOfSource
        : [];
    if (enemyTeamEffects.length > 0 && status?.sourceUsername) {
        applyTriggeredEffectsToRecipients({
            effects: enemyTeamEffects,
            match,
            status,
            recipients: getAliveEnemyRecipients({
                match,
                username: status.sourceUsername,
            }),
            pendingStatuses,
        });
    }
};

const applyOnOwnerSkillCooldownFinishedBonuses = ({
    match,
    ownerUsername,
    ownerSlot,
    ownerUnit,
    finishedSkillId,
}) => {
    if (!match || !ownerUsername || !ownerUnit || !finishedSkillId) return;
    const ownerState = ensureUnitStateShape(ownerUnit);
    (Array.isArray(ownerState.statuses) ? ownerState.statuses : []).forEach((status) => {
        if (!isStatusActiveForMetadata(status, ownerUnit)) return;
        const config = status?.metadata?.onOwnerSkillCooldownFinishedApplyStatusToRandomEnemy;
        if (!config?.statusId) return;
        const restrictedSkillIds = Array.isArray(config.skillIds)
            ? config.skillIds.filter((entry) => typeof entry === 'string' && entry)
            : [];
        if (restrictedSkillIds.length > 0 && !restrictedSkillIds.includes(finishedSkillId)) return;
        const chancePercent = Number(config.chancePercent);
        if (Number.isFinite(chancePercent) && chancePercent >= 0 && chancePercent < 100) {
            if (!rollPercentSuccess(chancePercent)) return;
        }
        const aliveEnemies = getAliveEnemyRecipients({
            match,
            username: ownerUsername,
        });
        if (!aliveEnemies.length) return;
        const picked = pickRandomEntry(aliveEnemies);
        if (!picked?.unit) return;
        const pickedState = ensureUnitStateShape(picked.unit);
        applyStatus({
            targetState: pickedState,
            statusId: config.statusId,
            duration: config.duration,
            sourceSkillId: resolveTriggeredEffectSourceSkillId({ status, config }),
            sourceUsername: ownerUsername,
            sourceSlot: Number.isInteger(ownerSlot)
                ? ownerSlot
                : Number.isInteger(status?.sourceSlot)
                ? status.sourceSlot
                : null,
            metadata: config.metadata || {},
            fresh: false,
        });
    });
};

const getTurnEndExtraCooldownTicksForSkill = (actorState, skillId) => {
    if (!skillId) return 0;
    const statuses = Array.isArray(actorState?.statuses) ? actorState.statuses : [];
    return statuses.reduce((sum, status) => {
        const remaining = Number(status?.remainingTurns) || 0;
        if (remaining <= 0) return sum;
        const metadata = status?.metadata || {};
        const allSkills = Math.max(0, Number(metadata?.ownerTurnEndExtraCooldownTicksAllSkills) || 0);
        const bySkillId =
            metadata?.ownerTurnEndExtraCooldownTicksBySkillId &&
            typeof metadata.ownerTurnEndExtraCooldownTicksBySkillId === 'object'
                ? Math.max(0, Number(metadata.ownerTurnEndExtraCooldownTicksBySkillId[skillId]) || 0)
                : 0;
        return sum + allSkills + bySkillId;
    }, 0);
};

const tickCooldownsForTurnEnd = ({ match, endingUsername }) => {
    if (!match || !endingUsername) return;
    const units = match.board?.[endingUsername] || [];
    units.forEach((unit, unitSlot) => {
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
                const current = Math.max(0, Number(cooldowns[skillId]) || 0);
                const next = Math.max(0, current - 1);
                if (next <= 0) {
                    delete cooldowns[skillId];
                    if (current > 0) {
                        applyOnOwnerSkillCooldownFinishedBonuses({
                            match,
                            ownerUsername: endingUsername,
                            ownerSlot: unitSlot,
                            ownerUnit: unit,
                            finishedSkillId: skillId,
                        });
                    }
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
            const current = Math.max(0, Number(cooldowns[skillId]) || 0);
            const extraTicks = getTurnEndExtraCooldownTicksForSkill(actorState, skillId);
            const next = Math.max(0, current - 1 - extraTicks);
            if (next <= 0) {
                delete cooldowns[skillId];
                if (current > 0) {
                    applyOnOwnerSkillCooldownFinishedBonuses({
                        match,
                        ownerUsername: endingUsername,
                        ownerSlot: unitSlot,
                        ownerUnit: unit,
                        finishedSkillId: skillId,
                    });
                }
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

const reduceHulkRageForInactiveTurn = ({ match, endingUsername, pendingTurn }) => {
    if (!match || !endingUsername) return;
    const units = Array.isArray(match.board?.[endingUsername]) ? match.board[endingUsername] : [];
    const actualManualSkillSlots = Array.isArray(match?._manualSkillActorSlotsByUsername?.[endingUsername])
        ? match._manualSkillActorSlotsByUsername[endingUsername]
        : null;
    const usedActorSlots = new Set(
        (actualManualSkillSlots || Object.keys(pendingTurn?.queuedByActorSlot || {}))
            .map((slotKey) => Number.parseInt(slotKey, 10))
            .filter((slot) => Number.isInteger(slot))
    );
    units.forEach((unit, slot) => {
        if (!unit || unit.alive === false || usedActorSlots.has(slot)) return;
        const actorState = ensureUnitStateShape(unit);
        const rageStatus = (Array.isArray(actorState.statuses) ? actorState.statuses : []).find(
            (status) => status?.id === 'hulk_anger_management' && (Number(status?.remainingTurns) || 0) > 0
        );
        if (!rageStatus?.metadata) return;
        const currentRage = Math.max(0, Number(rageStatus.metadata.hulkRage) || 0);
        if (currentRage <= 0) return;
        rageStatus.metadata.hulkRage = Math.max(0, currentRage - 35);
        if (typeof rageStatus.metadata.tooltipTextTemplate === 'string' && rageStatus.metadata.tooltipTextTemplate) {
            rageStatus.metadata.tooltipText = renderTooltipTemplate(
                rageStatus.metadata.tooltipTextTemplate,
                rageStatus.metadata
            );
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
    reduceHulkRageForInactiveTurn,
    getSkillCooldownRemaining,
    isSkillIndexBlockedForActor,
    isActorUnableToUseSkills,
    getUnitState,
    applyHealToUnit,
    cleanseHarmfulStatuses,
    reviveUnitToHp,
    getTurnStartChoiceTargetOptions,
    selectTurnStartChoiceTarget,
    queueTurnStartChoicePrompts,
};
