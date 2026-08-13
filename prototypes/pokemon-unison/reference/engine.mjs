import { DEFAULT_TEAMS, Energy, ROSTER, validateMatchTeams } from './roster.mjs';

export const PROTOCOL_VERSION = 1;
export const MAX_HP = 100;
export const players = ['A', 'B'];

const emptyEnergy = () => ({
    [Energy.TAIJUTSU]: 0,
    [Energy.NINJUTSU]: 0,
    [Energy.BLOODLINE]: 0,
    [Energy.GENJUTSU]: 0,
});

const sandboxEnergy = () => ({
    [Energy.TAIJUTSU]: 2,
    [Energy.NINJUTSU]: 2,
    [Energy.BLOODLINE]: 2,
    [Energy.GENJUTSU]: 2,
});

const clone = (value) => JSON.parse(JSON.stringify(value));
const otherPlayer = (player) => (player === 'A' ? 'B' : 'A');
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const unitMaxHp = (unit) => Math.max(1, Number(unit?.maxHp) || MAX_HP);
const statusActive = (status) =>
    status &&
    (status.durationActions === null ||
        !Number.isFinite(status.durationActions) ||
        status.durationActions > 0);

const DAMAGING_EFFECT_KINDS = new Set([
    'damage',
    'drain',
    'health-loss',
    'execute',
    'fixed-affliction-damage',
    'random-other-enemy-damage',
]);
const ACTOR_ONLY_EFFECT_KINDS = new Set([
    'source-status',
    'increment-actor-counter',
    'increment-actor-status-field',
    'remove-actor-status',
    'reset-actor-counter',
    'reset-actor-status-field',
    'reset-actor-unique-skill-group',
    'record-unique-skill',
    'consume-actor-tracked-shield',
    'set-weather',
    'clear-weather',
]);
const SILENCE_ALLOWED_EFFECT_KINDS = new Set([...DAMAGING_EFFECT_KINDS, 'chance']);

const typeChart = {
    Normal: { Rock: 0.5, Steel: 0.5, Ghost: 0 },
    Fire: { Grass: 2, Ice: 2, Bug: 2, Steel: 2, Fire: 0.5, Water: 0.5, Rock: 0.5, Dragon: 0.5 },
    Water: { Fire: 2, Ground: 2, Rock: 2, Water: 0.5, Grass: 0.5, Dragon: 0.5 },
    Electric: { Water: 2, Flying: 2, Electric: 0.5, Grass: 0.5, Dragon: 0.5, Ground: 0 },
    Grass: { Water: 2, Ground: 2, Rock: 2, Fire: 0.5, Grass: 0.5, Poison: 0.5, Flying: 0.5, Bug: 0.5, Dragon: 0.5, Steel: 0.5 },
    Ice: { Grass: 2, Ground: 2, Flying: 2, Dragon: 2, Fire: 0.5, Water: 0.5, Ice: 0.5, Steel: 0.5 },
    Fighting: { Normal: 2, Ice: 2, Rock: 2, Dark: 2, Steel: 2, Poison: 0.5, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Fairy: 0.5, Ghost: 0 },
    Poison: { Grass: 2, Fairy: 2, Poison: 0.5, Ground: 0.5, Rock: 0.5, Ghost: 0.5, Steel: 0 },
    Ground: { Fire: 2, Electric: 2, Poison: 2, Rock: 2, Steel: 2, Grass: 0.5, Bug: 0.5, Flying: 0 },
    Flying: { Grass: 2, Fighting: 2, Bug: 2, Electric: 0.5, Rock: 0.5, Steel: 0.5 },
    Psychic: { Fighting: 2, Poison: 2, Psychic: 0.5, Steel: 0.5, Dark: 0 },
    Bug: { Grass: 2, Psychic: 2, Dark: 2, Fire: 0.5, Fighting: 0.5, Poison: 0.5, Flying: 0.5, Ghost: 0.5, Steel: 0.5, Fairy: 0.5 },
    Rock: { Fire: 2, Ice: 2, Flying: 2, Bug: 2, Fighting: 0.5, Ground: 0.5, Steel: 0.5 },
    Ghost: { Psychic: 2, Ghost: 2, Dark: 0.5, Normal: 0 },
    Dragon: { Dragon: 2, Steel: 0.5, Fairy: 0 },
    Dark: { Psychic: 2, Ghost: 2, Fighting: 0.5, Dark: 0.5, Fairy: 0.5 },
    Steel: { Ice: 2, Rock: 2, Fairy: 2, Fire: 0.5, Water: 0.5, Electric: 0.5, Steel: 0.5 },
    Fairy: { Fighting: 2, Dragon: 2, Dark: 2, Fire: 0.5, Poison: 0.5, Steel: 0.5 },
};

export function typeEffectiveness(moveType, defenderTypes = []) {
    const rawScore = defenderTypes.reduce((score, defenderType) => {
        const chartValue = typeChart[moveType]?.[defenderType] ?? 1;
        if (chartValue === 0) return score - 2;
        if (chartValue === 2) return score + 1;
        if (chartValue === 0.5) return score - 1;
        return score;
    }, 0);
    const score = clamp(rawScore, -2, 2);
    const labels = {
        2: 'Double Super Effective',
        1: 'Super Effective',
        '-1': 'Not Very Effective',
        '-2': 'Double Not Very Effective',
    };
    return { score, modifier: score * 5, label: labels[score] ?? '' };
}

const WEATHER_TURNS_PER_ROUND = 2;

function setWeather(state, weather) {
    const current = state.weather;
    if (current && current.key === weather.key && weather.blockRefreshIfActive) {
        log(state, 'weather', `${weather.name} is already active and cannot be refreshed.`, {
            weatherKey: weather.key,
        });
        return;
    }
    if (current && current.key !== weather.key) {
        log(state, 'weather', `${current.name} fades as ${weather.name} begins.`, {
            previousWeatherKey: current.key,
            weatherKey: weather.key,
        });
    } else {
        log(state, 'weather', current ? `${weather.name} is refreshed.` : `${weather.name} begins.`, {
            weatherKey: weather.key,
        });
    }
    state.weather = {
        key: weather.key,
        name: weather.name,
        description: weather.description ?? '',
        sourcePlayer: weather.sourcePlayer,
        sourceSlot: weather.sourceSlot,
        excludeSkillId: weather.excludeSkillId ?? null,
        roundsRemaining: weather.rounds,
        totalRounds: weather.rounds,
        lastDecrementTurn: state.turnNumber,
        blockRefreshIfActive: Boolean(weather.blockRefreshIfActive),
        damageTypeModifiers: weather.damageTypeModifiers ?? {},
        afflictionDamageBonusFlat: weather.afflictionDamageBonusFlat ?? 0,
        costTypeModifiers: weather.costTypeModifiers ?? {},
        evasionImmuneTypes: weather.evasionImmuneTypes ?? [],
        periodicNonTypeDamage: weather.periodicNonTypeDamage ?? null,
        transformMoveType: weather.transformMoveType ?? {},
        periodicRandomTargetDamage: weather.periodicRandomTargetDamage ?? null,
    };
}

function clearWeather(state, reason) {
    if (!state.weather) return;
    log(state, 'weather', `${state.weather.name} ends.`, {
        weatherKey: state.weather.key,
        reason: reason ?? 'expired',
    });
    state.weather = null;
}

function resolveWeatherPeriodicDamage(state) {
    const weather = state.weather;
    const periodic = weather?.periodicNonTypeDamage;
    if (periodic) {
        const source = findUnit(state, weather.sourcePlayer, weather.sourceSlot);
        const immuneTypes = periodic.immuneTypes ?? (periodic.immuneType ? [periodic.immuneType] : []);
        players.forEach((player) => {
            livingTargets(state, player).forEach((unit) => {
                if (getForm(unit).types?.some((type) => immuneTypes.includes(type))) return;
                dealFixedStatusDamage(state, source, unit, weather.name, periodic.amount);
            });
        });
    }
    resolveWeatherRandomTargetDamage(state);
}

function resolveWeatherRandomTargetDamage(state) {
    const weather = state.weather;
    const config = weather?.periodicRandomTargetDamage;
    if (!config) return;
    const source = findUnit(state, weather.sourcePlayer, weather.sourceSlot);
    if (!source) return;
    const immuneTypes = config.immuneTypes ?? [];
    const eligible = players.flatMap((player) =>
        livingTargets(state, player).filter(
            (unit) => !getForm(unit).types?.some((type) => immuneTypes.includes(type))
        )
    );
    if (!eligible.length) return;
    const picked = eligible[Math.floor(nextRandom(state) * eligible.length)];
    damageUnit(
        state,
        source,
        picked,
        {
            id: weather.excludeSkillId ?? weather.key,
            name: weather.name,
            moveType: config.moveType ?? null,
            classes: config.skillClasses ?? [],
        },
        config.amount,
        config.damageKind ?? 'piercing',
        false
    );
    if (config.paralyzeCooldowns && picked.alive) {
        addStatus(state, picked, {
            player: source.player,
            slot: source.slot,
            targetPlayer: picked.player,
        }, {
            id: `${weather.key}-random-target-paralysis`,
            name: weather.name,
            description: 'Skill cooldowns cannot decrease for 1 turn.',
            hidden: false,
            harmful: true,
            durationActions: 1,
            durationAnchor: 'target',
            replaceExisting: true,
            paralyzeCooldowns: true,
        });
    }
}

function advanceWeather(state) {
    if (!state.weather) return;
    if (state.turnNumber - state.weather.lastDecrementTurn < WEATHER_TURNS_PER_ROUND) return;
    state.weather.lastDecrementTurn = state.turnNumber;
    state.weather.roundsRemaining -= 1;
    if (state.weather.roundsRemaining <= 0) {
        resolveWeatherPeriodicDamage(state);
        clearWeather(state, 'expired');
    } else {
        resolveWeatherPeriodicDamage(state);
    }
}

function weatherDamageTypeBonus(state, skill) {
    const weather = state.weather;
    if (!weather || !skill) return 0;
    if (weather.excludeSkillId && skill.id === weather.excludeSkillId) return 0;
    return Number(weather.damageTypeModifiers?.[skill.moveType]) || 0;
}

function weatherAfflictionBonus(state, damageKind) {
    const weather = state.weather;
    if (!weather || damageKind !== 'affliction') return 0;
    return Number(weather.afflictionDamageBonusFlat) || 0;
}

function weatherEvasionImmune(state, skill) {
    const weather = state.weather;
    if (!weather || !skill) return false;
    return (weather.evasionImmuneTypes ?? []).includes(skill.moveType);
}

function weatherCostModifierFor(state, skill) {
    const weather = state.weather;
    if (!weather || !skill) return 0;
    return Number(weather.costTypeModifiers?.[skill.moveType]) || 0;
}

function weatherStatusFieldBonus(state, actor, effect) {
    const weather = state.weather;
    const config = effect.bonusFromWeather;
    if (!weather || !config) return 0;
    if (weather.key !== config.weatherKey) return 0;
    if (
        config.sourceMustMatch &&
        (weather.sourcePlayer !== actor.player || weather.sourceSlot !== actor.slot)
    ) return 0;
    return Number(config.amount) || 0;
}

function makeUnit(speciesId, slot, player) {
    const species = ROSTER[speciesId];
    if (!species) throw new Error(`Unknown species: ${speciesId}`);
    return {
        slot,
        player,
        speciesId,
        form: 'base',
        effectiveSpeciesId: null,
        effectiveForm: null,
        banished: false,
        hp: MAX_HP,
        maxHp: MAX_HP,
        shield: Math.max(0, Number(species.startShield) || 0),
        shieldCapacity: Math.max(0, Number(species.startShield) || 0),
        barrier: 0,
        barrierCapacity: 0,
        alive: true,
        cooldowns: {},
        statuses: (species.startStatuses ?? []).map((status) => ({
            ...clone(status),
            sourcePlayer: player,
            sourceSlot: slot,
            appliedTurn: 0,
        })),
        counters: {},
        skillUses: {},
        uniqueSkillUses: {},
        lastSkillId: null,
        skillSequenceSteps: {},
        triggerLedger: {},
    };
}

function grantShield(target, amount) {
    const granted = Math.max(0, Number(amount) || 0);
    if (granted <= 0) return 0;
    const previous = Math.max(0, Number(target.shield) || 0);
    target.shield = previous + granted;
    target.shieldCapacity = previous > 0
        ? Math.max(Number(target.shieldCapacity) || previous, target.shield)
        : target.shield;
    return granted;
}

function grantBarrier(target, amount) {
    const granted = Math.max(0, Number(amount) || 0);
    if (granted <= 0) return 0;
    const previous = Math.max(0, Number(target.barrier) || 0);
    target.barrier = previous + granted;
    target.barrierCapacity = previous > 0
        ? Math.max(Number(target.barrierCapacity) || previous, target.barrier)
        : target.barrier;
    return granted;
}

function consumeTrackedShieldStatus(state, target, statusId) {
    const tracked = target.statuses.filter(
        (status) => statusActive(status) && status.id === statusId
    );
    const amount = tracked.reduce(
        (total, status) => total + Math.max(0, Number(status.trackedShieldPoints) || 0),
        0
    );
    const removed = Math.min(target.shield, amount);
    target.shield = Math.max(0, target.shield - removed);
    target.statuses = target.statuses.filter((status) => status.id !== statusId);
    if (amount > 0) {
        log(state, 'shield-consumed', `${getSpecies(target).name} consumed ${removed} tracked defense.`, {
            amount: removed,
            targetPlayer: target.player,
            targetSlot: target.slot,
            statusId,
        });
    }
    return removed;
}

function makeTeam(speciesIds, player) {
    return speciesIds.map((speciesId, slot) => makeUnit(speciesId, slot, player));
}

export function createGame({
    seed = 0x5eed1234,
    teams = DEFAULT_TEAMS,
    startingPlayer = 'A',
    economyMode = 'sandbox',
} = {}) {
    if (!players.includes(startingPlayer)) throw new Error('startingPlayer must be A or B.');
    if (!['arena', 'sandbox'].includes(economyMode)) throw new Error('economyMode must be arena or sandbox.');
    const teamError = validateMatchTeams(teams);
    if (teamError) throw new Error(teamError);
    const state = {
        protocolVersion: PROTOCOL_VERSION,
        seed: seed >>> 0,
        initialSeed: seed >>> 0,
        startingPlayer,
        economyMode,
        energyStartGranted: {
            A: false,
            B: false,
        },
        turnNumber: 0,
        currentPlayer: startingPlayer,
        winner: null,
        weather: null,
        teams: {
            A: makeTeam(teams.A, 'A'),
            B: makeTeam(teams.B, 'B'),
        },
        energy: {
            A: economyMode === 'arena' ? emptyEnergy() : sandboxEnergy(),
            B: economyMode === 'arena' ? emptyEnergy() : sandboxEnergy(),
        },
        actions: [],
        turns: [],
        events: [],
    };
    state.events.push({
        turn: 0,
        kind: 'match-start',
        message: `${startingPlayer} has the first turn.`,
    });
    if (economyMode === 'arena') {
        grantRandomEnergy(state, startingPlayer, 1, 'the opening turn');
        state.energyStartGranted[startingPlayer] = true;
    }
    processTurnStartEffects(state, startingPlayer);
    processCyclingClassAuras(state);
    return state;
}

function nextRandom(state) {
    let value = state.seed >>> 0;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    state.seed = value >>> 0;
    return state.seed / 0x100000000;
}

function findUnit(state, player, slot) {
    if (!players.includes(player) || !Number.isInteger(slot)) return null;
    return state.teams[player]?.[slot] ?? null;
}

function getSpecies(unit) {
    return unit ? ROSTER[unit.effectiveSpeciesId ?? unit.speciesId] ?? null : null;
}

function getForm(unit) {
    const species = getSpecies(unit);
    const formId = unit?.effectiveSpeciesId ? unit.effectiveForm ?? 'base' : unit?.form;
    return species?.forms?.[formId] ?? {
        id: 'base',
        name: species?.name,
        types: species?.types ?? [],
        facePicture: species?.facePicture,
        skillIds: species?.skills.map((skill) => skill.id) ?? [],
    };
}

function getSkill(unit, skillId) {
    const species = getSpecies(unit);
    if (!activeSkillIds(unit).includes(skillId)) return null;
    return species?.skills.find((entry) => entry.id === skillId) ?? null;
}

function activeSkillIds(unit) {
    const replacements = unit.statuses
        .filter(statusActive)
        .reduce((map, status) => ({ ...map, ...(status.skillReplacements ?? {}) }), {});
    return getForm(unit).skillIds.map((skillId) => replacements[skillId] ?? skillId);
}

function cooldownSkillIdAfterAction(unit, usedSkillId) {
    if (!getForm(unit).remapTriggeringSkillCooldown) return usedSkillId;
    const currentActiveIds = activeSkillIds(unit);
    if (currentActiveIds.includes(usedSkillId)) return usedSkillId;
    const species = getSpecies(unit);
    for (const form of Object.values(species?.forms ?? {})) {
        const slot = form.skillIds.indexOf(usedSkillId);
        if (slot >= 0) return currentActiveIds[slot] ?? usedSkillId;
    }
    return usedSkillId;
}

function validateActorCondition(actor, skill) {
    if (skill.actorCondition?.allOtherSkillsOnCooldown) {
        const everyOtherSkillIsCoolingDown = activeSkillIds(actor)
            .filter((skillId) => skillId !== skill.id)
            .every((skillId) => (actor.cooldowns[skillId] ?? 0) > 0);
        if (!everyOtherSkillIsCoolingDown) return 'All other active skills must be on cooldown.';
    }
    if (skill.actorCondition?.counterAtLeast) {
        const { counter, value } = skill.actorCondition.counterAtLeast;
        if ((actor.counters[counter] ?? 0) < value) return `Requires at least ${value} ${counter}.`;
    }
    return null;
}

function livingTargets(state, player) {
    return state.teams[player].filter((unit) => unit.alive && !unit.banished);
}

function hasStatus(unit, predicate) {
    return unit.statuses.some((status) => statusActive(status) && predicate(status));
}

function stunnedSkillClasses(unit, skill) {
    const skillClasses = new Set(skill.classes ?? []);
    return [...new Set(unit.statuses
        .filter(statusActive)
        .flatMap((status) => status.cannotUseSkillClasses ?? [])
        .filter((skillClass) => skillClasses.has(skillClass)))];
}

function effectiveSkillCosts(state, actor, skill) {
    const override = actor.statuses
        .filter(statusActive)
        .map((status) => status.skillCostOverrides?.[skill.id])
        .find(Array.isArray);
    const dynamicCost = skill.energyByActorStatusField
        ? (() => {
            const config = skill.energyByActorStatusField;
            const status = actor.statuses.find(
                (entry) => statusActive(entry) && entry.id === config.statusId
            );
            const value = Math.max(0, Number(status?.[config.field]) || 0);
            const tier = [...(config.tiers ?? [])]
                .sort((left, right) => (right.atLeast ?? 0) - (left.atLeast ?? 0))
                .find((entry) => value >= (entry.atLeast ?? 0));
            return Array.isArray(tier?.energy) ? tier.energy : null;
        })()
        : null;
    const baseCosts = override ?? dynamicCost ?? skill.energy;
    const reduction = skill.randomCostReductionCounter
        ? Math.max(0, actor.counters[skill.randomCostReductionCounter] ?? 0)
        : 0;
    const weatherCostModifier = weatherCostModifierFor(state, skill);
    const statusReduction = actor.statuses.reduce(
        (total, status) => total + (statusActive(status) ? status.randomCostReduction ?? 0 : 0),
        0
    );
    let remainingReduction = reduction + statusReduction + Math.max(0, -weatherCostModifier);
    const specificReductions = actor.statuses.reduce((totals, status) => {
        if (!statusActive(status)) return totals;
        Object.entries(status.specificCostReductions ?? {}).forEach(([cost, amount]) => {
            totals[cost] = (totals[cost] ?? 0) + Math.max(0, Number(amount) || 0);
        });
        return totals;
    }, {});
    const reducedCosts = baseCosts.filter((cost) => {
        if (cost === Energy.RANDOM && remainingReduction > 0) {
            remainingReduction -= 1;
            return false;
        }
        if ((specificReductions[cost] ?? 0) > 0) {
            specificReductions[cost] -= 1;
            return false;
        }
        return true;
    });
    const randomCostIncrease = actor.statuses.reduce(
        (total, status) => total + (statusActive(status) ? status.randomCostIncrease ?? 0 : 0),
        0
    ) + Math.max(0, weatherCostModifier);
    return reducedCosts.concat(Array(randomCostIncrease).fill(Energy.RANDOM));
}

function skillIsHarmfulToTarget(skill, actor, target) {
    if (['single-enemy-or-ally', 'single-character'].includes(skill.target)) {
        return actor.player !== target.player;
    }
    return actor.player !== target.player && Boolean(skill.harmful);
}

function validateTarget(state, action, skill) {
    const target = findUnit(state, action.targetPlayer, action.targetSlot);
    if (!target) return 'Target does not exist.';
    const actor = findUnit(state, action.player, action.actorSlot);
    if (target.banished) return 'A captured Pokemon is no longer a legal target.';
    const canTargetDefeatedAlly = skill.target === 'single-ally-or-dead-ally' || skill.target === 'dead-ally';
    if (!target.alive && !canTargetDefeatedAlly) return 'Target must be a living Pokémon.';
    if (skill.target === 'dead-ally' && target.alive) return 'This skill can only target a defeated ally.';
    const allied = action.targetPlayer === action.player;
    if (
        skill.targetCannotHaveStatus &&
        hasStatus(target, (status) => status.id === skill.targetCannotHaveStatus)
    ) {
        return 'That target is already affected by this skill.';
    }
    if (
        skill.targetCannotHaveStatusFromActorSource &&
        hasStatus(target, (status) =>
            status.id === skill.targetCannotHaveStatusFromActorSource &&
            status.sourcePlayer === actor?.player &&
            status.sourceSlot === actor?.slot
        )
    ) {
        return 'This Pokemon has already been targeted by this user.';
    }
    if (skill.target === 'self' && (!allied || action.targetSlot !== action.actorSlot)) {
        return 'This skill can only target its user.';
    }
    if ((skill.target === 'single-enemy' || skill.target === 'random-enemy') && allied) {
        return 'This skill must target an enemy.';
    }
    if (skill.target === 'all-enemy' && allied) return 'This skill must target the enemy team.';
    if (skill.target === 'single-ally' && (!allied || action.targetSlot === action.actorSlot)) {
        return 'This skill must target another ally.';
    }
    if (canTargetDefeatedAlly && (!allied || action.targetSlot === action.actorSlot)) {
        return skill.target === 'dead-ally'
            ? 'This skill must target a defeated ally.'
            : 'This skill must target another ally, living or defeated.';
    }
    if (
        skill.target === 'single-enemy-or-ally' &&
        allied &&
        action.targetSlot === action.actorSlot
    ) {
        return 'This skill must target another character.';
    }
    if (skill.target === 'all-allies' && !allied) return 'This skill must target the allied team.';
    if (skill.target === 'self-or-single-ally' && !allied) return 'This skill must target an ally.';
    const harmfulToTarget = skillIsHarmfulToTarget(skill, actor, target);
    if (harmfulToTarget && hasStatus(actor, (status) => status.stunHarmful)) {
        return 'This Pokémon’s harmful skills are stunned.';
    }
    if (!harmfulToTarget && hasStatus(actor, (status) => status.cannotUseHelpfulSkills)) {
        return 'This Pokémon cannot use helpful skills.';
    }
    const taunt = actor?.statuses.find((status) => statusActive(status) && status.tauntSource);
    if (taunt) {
        if (
            !skillIsHarmfulToTarget(skill, actor, target) ||
            !['single-enemy', 'single-enemy-or-ally'].includes(skill.target) ||
            target.player !== taunt.sourcePlayer ||
            target.slot !== taunt.sourceSlot
        ) {
            return 'This Pokemon is taunted and must use a harmful targeted skill on its taunter.';
        }
    }
    if (
        allied &&
        !skillIsHarmfulToTarget(skill, actor, target) &&
        hasStatus(target, (status) => status.invulnerableToHelpfulSkills)
    ) {
        return 'That target is invulnerable to helpful skills.';
    }
    return null;
}

const concreteEnergyTypes = [
    Energy.TAIJUTSU,
    Energy.NINJUTSU,
    Energy.BLOODLINE,
    Energy.GENJUTSU,
];
const energyColorNames = {
    [Energy.TAIJUTSU]: 'Green',
    [Energy.NINJUTSU]: 'Blue',
    [Energy.BLOODLINE]: 'Red',
    [Energy.GENJUTSU]: 'Yellow',
};

function createSpendPlan(pool, costs, selectedRandomEnergy, { requireExplicitRandom = false } = {}) {
    const next = { ...pool };
    const specific = costs.filter((cost) => cost !== Energy.RANDOM);
    const randomCount = costs.length - specific.length;
    for (const cost of specific) {
        if ((next[cost] ?? 0) <= 0) return { error: 'Not enough energy.' };
        next[cost] -= 1;
    }

    if (randomCount === 0 && Array.isArray(selectedRandomEnergy) && selectedRandomEnergy.length > 0) {
        return { error: 'This skill has no Random energy cost.' };
    }
    if (randomCount > 0 && requireExplicitRandom && !Array.isArray(selectedRandomEnergy)) {
        return { error: `Choose ${randomCount} energy for the Random cost.` };
    }
    if (Array.isArray(selectedRandomEnergy) && selectedRandomEnergy.length !== randomCount) {
        return { error: `Choose exactly ${randomCount} energy for the Random cost.` };
    }

    const randomEnergy = Array.isArray(selectedRandomEnergy) ? [...selectedRandomEnergy] : [];
    for (let index = 0; index < randomCount; index += 1) {
        const selected = randomEnergy[index] ?? Object.keys(next).sort().find((key) => next[key] > 0);
        if (!selected && !Array.isArray(selectedRandomEnergy)) {
            return { error: 'Not enough energy.' };
        }
        if (!concreteEnergyTypes.includes(selected)) {
            return { error: 'Random costs must be paid with Green, Blue, Red, or Yellow energy.' };
        }
        if ((next[selected] ?? 0) <= 0) {
            return { error: `Not enough ${energyColorNames[selected]} energy for the selected Random payment.` };
        }
        if (!Array.isArray(selectedRandomEnergy)) randomEnergy.push(selected);
        next[selected] -= 1;
    }
    return { next, randomEnergy };
}

function buildSpendPlan(pool, costs, selectedRandomEnergy) {
    return createSpendPlan(pool, costs, selectedRandomEnergy).next ?? null;
}

export function legalActions(state, player = state.currentPlayer) {
    if (state.winner || player !== state.currentPlayer) return [];
    const actions = [];
    state.teams[player].forEach((actor) => {
        if (!actor.alive) return;
        if (hasStatus(actor, (status) => status.cannotUseSkills)) return;
        const species = getSpecies(actor);
        const activeIds = new Set(activeSkillIds(actor));
        species.skills.filter((skill) => activeIds.has(skill.id)).forEach((skill) => {
            if ((actor.cooldowns[skill.id] ?? 0) > 0) return;
            if (validateActorCondition(actor, skill)) return;
            if (Number.isInteger(skill.maxUses) && (actor.skillUses?.[skill.id] ?? 0) >= skill.maxUses) return;
            const energyCosts = effectiveSkillCosts(state, actor, skill);
            const spendPlan = createSpendPlan(state.energy[player], energyCosts);
            if (spendPlan.error) return;
            if (
                hasStatus(actor, (status) => status.cannotUseNonMentalSkills) &&
                !skill.classes?.includes('Mental')
            ) return;
            if (stunnedSkillClasses(actor, skill).length > 0) return;
            const targetPlayers = skill.target === 'single-enemy-or-ally'
                ? players
                : skill.target === 'self' || skill.target.includes('ally')
                ? [player]
                : players;
            targetPlayers.forEach((targetPlayer) => {
                let targets = state.teams[targetPlayer];
                if (skill.target === 'self') targets = [actor];
                if (skill.target === 'all-enemy' || skill.target === 'all-allies') {
                    targets = targets.filter((target) => target.alive).slice(0, 1);
                }
                targets.forEach((target) => {
                    const candidate = {
                        player,
                        actorSlot: actor.slot,
                        skillId: skill.id,
                        targetPlayer,
                        targetSlot: target.slot,
                        energyCosts,
                        randomEnergyRequired: energyCosts.filter((cost) => cost === Energy.RANDOM).length,
                        suggestedRandomEnergy: spendPlan.randomEnergy,
                    };
                    if (!validateTarget(state, candidate, skill)) actions.push(candidate);
                });
            });
        });
    });
    return actions;
}

export function validateAction(state, action, { requireExplicitRandom = false } = {}) {
    if (!state || typeof state !== 'object') return 'Missing match state.';
    if (state.winner) return 'The match is already over.';
    if (!action || typeof action !== 'object') return 'Missing action.';
    if (action.player !== state.currentPlayer) return `It is ${state.currentPlayer}'s turn.`;
    const actor = findUnit(state, action.player, action.actorSlot);
    if (!actor || !actor.alive) return 'Actor must be a living Pokémon.';
    if (hasStatus(actor, (status) => status.cannotUseSkills)) return 'This Pokémon cannot use skills.';
    const skill = getSkill(actor, action.skillId);
    if (!skill) return 'Unknown skill for this actor.';
    if ((actor.cooldowns[skill.id] ?? 0) > 0) return 'That skill is on cooldown.';
    const actorConditionError = validateActorCondition(actor, skill);
    if (actorConditionError) return actorConditionError;
    if (Number.isInteger(skill.maxUses) && (actor.skillUses?.[skill.id] ?? 0) >= skill.maxUses) {
        return 'That skill has no uses remaining.';
    }
    if (
        hasStatus(actor, (status) => status.cannotUseNonMentalSkills) &&
        !skill.classes?.includes('Mental')
    ) {
        return 'This Pokemon cannot use non-Mental skills.';
    }
    const disabledClasses = stunnedSkillClasses(actor, skill);
    if (disabledClasses.length > 0) {
        return `This Pokemon's ${disabledClasses.join(' and ')} skills are stunned.`;
    }
    const spendPlan = createSpendPlan(
        state.energy[action.player],
        effectiveSkillCosts(state, actor, skill),
        action.randomEnergy,
        { requireExplicitRandom }
    );
    if (spendPlan.error) return spendPlan.error;
    return validateTarget(state, action, skill);
}

function buildQueuedPlanningState(state, queuedActions = []) {
    const planning = clone(state);
    const usedActors = new Set();
    for (let index = 0; index < queuedActions.length; index += 1) {
        const action = queuedActions[index];
        if (usedActors.has(action.actorSlot)) {
            return { ok: false, error: `Queued action ${index + 1}: each Pokemon may act once per team turn.` };
        }
        const error = validateAction(planning, action);
        if (error) return { ok: false, error: `Queued action ${index + 1}: ${error}` };
        const actor = findUnit(planning, action.player, action.actorSlot);
        const skill = getSkill(actor, action.skillId);
        planning.energy[action.player] = buildSpendPlan(
            planning.energy[action.player],
            effectiveSkillCosts(state, actor, skill),
            action.randomEnergy
        );
        usedActors.add(action.actorSlot);
    }
    return { ok: true, state: planning, usedActors };
}

export function validateQueuedAction(state, queuedActions, action) {
    const planned = buildQueuedPlanningState(state, queuedActions);
    if (!planned.ok) return planned.error;
    if (planned.usedActors.has(action?.actorSlot)) {
        return 'Each Pokemon may act once per team turn.';
    }
    return validateAction(planned.state, action, { requireExplicitRandom: true });
}

export function legalQueuedActions(state, queuedActions = []) {
    const planned = buildQueuedPlanningState(state, queuedActions);
    if (!planned.ok) return [];
    return legalActions(planned.state).filter((action) => !planned.usedActors.has(action.actorSlot));
}

export function remainingQueuedEnergy(state, queuedActions = []) {
    const planned = buildQueuedPlanningState(state, queuedActions);
    if (!planned.ok) return null;
    return clone(planned.state.energy[state.currentPlayer]);
}

function log(state, kind, message, details = {}) {
    state.events.push({ turn: state.turnNumber, kind, message, ...details });
}

function evolveUnit(state, unit, formId) {
    const species = getSpecies(unit);
    const form = species?.forms?.[formId];
    if (!form || unit.form === formId) return;
    const previousForm = getForm(unit);
    const nextCooldowns = {};
    previousForm.skillIds.forEach((skillId, index) => {
        const remaining = unit.cooldowns[skillId];
        const replacementId = form.skillIds[index];
        if (remaining && replacementId) nextCooldowns[replacementId] = remaining;
    });
    unit.form = formId;
    unit.cooldowns = nextCooldowns;
    if (Array.isArray(form.removeStatusIdsOnEnter)) {
        const removeIds = new Set(form.removeStatusIdsOnEnter);
        unit.statuses = unit.statuses.filter((status) => !removeIds.has(status.id));
    }
    (form.addStatusesOnEnter ?? []).forEach((status) => {
        addStatus(state, unit, {
            player: unit.player,
            slot: unit.slot,
            targetPlayer: unit.player,
        }, status);
    });
    healUnit(state, unit, form.healOnEnter ?? 10, `Evolution into ${form.name}`);
    log(state, 'evolution', `${species.name} evolved into ${form.name}.`, {
        player: unit.player,
        slot: unit.slot,
        form: formId,
    });
}

function incrementCounter(state, unit, counter, delta = 1, maximum = Number.POSITIVE_INFINITY) {
    if (!unit?.alive || !counter) return 0;
    const next = Math.min(maximum, Math.max(0, (unit.counters[counter] ?? 0) + delta));
    unit.counters[counter] = next;
    const statusEvolution = unit.statuses.find((status) =>
        statusActive(status) &&
        status.evolveOnCounter?.counter === counter &&
        next >= status.evolveOnCounter.threshold
    )?.evolveOnCounter;
    if (statusEvolution?.form) {
        evolveUnit(state, unit, statusEvolution.form);
    } else if (unit.speciesId === 'charmander' && counter === 'evolution' && next >= 2) {
        evolveUnit(state, unit, 'charmeleon');
    } else if (unit.speciesId === 'squirtle' && counter === 'evolution' && next >= 3) {
        evolveUnit(state, unit, 'wartortle');
    } else if (unit.speciesId === 'zubat' && counter === 'evolution' && next >= 50) {
        evolveUnit(state, unit, 'golbat');
    } else if (unit.speciesId === 'chansey' && counter === 'evolution' && next >= 100) {
        evolveUnit(state, unit, 'blissey');
    } else if (unit.speciesId === 'pidgey' && counter === 'evolution' && next >= 50) {
        evolveUnit(state, unit, 'pidgeotto');
    } else if (
        unit.speciesId === 'bulbasaur' &&
        counter === 'sun' &&
        next >= 5 &&
        unit.form === 'base'
    ) {
        unit.counters.sun = 0;
        evolveUnit(state, unit, 'ivysaur');
    }
    return next;
}

function recordDamageTaken(state, unit, amount) {
    if (!unit?.alive || amount <= 0) return;
    const trackers = unit.statuses
        .filter(statusActive)
        .filter((status) => status.damageTakenCounter);
    trackers.forEach((status) => {
        incrementCounter(
            state,
            unit,
            status.damageTakenCounter,
            amount,
            status.damageTakenCounterMaximum
        );
    });
}

function sourceUnitForStatus(state, status) {
    return findUnit(state, status.sourcePlayer, status.sourceSlot);
}

function acceleratePerishSong(state, source, target) {
    if (!source?.alive || !target?.alive) return false;
    const mark = target.statuses.find((status) =>
        statusActive(status) &&
        status.id === 'jigglypuff-perish-song-mark' &&
        status.sourcePlayer === source.player &&
        status.sourceSlot === source.slot &&
        Number(status.durationActions) > 1
    );
    if (!mark) return false;
    if (!source.triggerLedger) source.triggerLedger = {};
    if (source.triggerLedger.perishAccelerationTurn === state.turnNumber) return false;
    source.triggerLedger.perishAccelerationTurn = state.turnNumber;
    mark.durationActions = Math.max(1, mark.durationActions - 1);
    log(state, 'status-accelerated', `${getForm(source).name} advanced Perish Song on ${getSpecies(target).name}.`, {
        player: source.player,
        actorSlot: source.slot,
        targetPlayer: target.player,
        targetSlot: target.slot,
        statusId: mark.id,
        remainingTurns: mark.durationActions,
    });
    return true;
}

function grantRandomEnergyToSource(state, source, reason) {
    if (!source?.alive) return null;
    const types = [
        Energy.TAIJUTSU,
        Energy.NINJUTSU,
        Energy.BLOODLINE,
        Energy.GENJUTSU,
    ];
    const gained = types[Math.floor(nextRandom(state) * types.length)];
    state.energy[source.player][gained] = (state.energy[source.player][gained] ?? 0) + 1;
    log(state, 'energy', `${getForm(source).name} gained 1 ${gained} energy from ${reason}.`, {
        energy: gained,
        player: source.player,
        actorSlot: source.slot,
    });
    return gained;
}

function addStatus(state, target, sourceRef, statusTemplate) {
    if (
        sourceRef.player !== target.player &&
        hasStatus(target, (entry) => entry.ignoreEnemyNonDamageEffects)
    ) {
        log(state, 'ignored-effect', `${getSpecies(target).name} ignored ${statusTemplate.name}.`, {
            targetPlayer: target.player,
            targetSlot: target.slot,
            statusId: statusTemplate.id,
        });
        return null;
    }
    const status = {
        ...clone(statusTemplate),
        sourcePlayer: sourceRef.player,
        sourceSlot: sourceRef.slot,
        appliedTurn: state.turnNumber,
    };
    const accuracyReduction = Boolean(status.fullBlind || status.harmfulBlindToSourceTeam);
    const teamPreventsAccuracyReduction = state.teams[target.player].some(
        (unit) => unit.alive && hasStatus(unit, (entry) => entry.preventTeamAccuracyReduction)
    );
    const enemyPreventsEvasion = state.teams[otherPlayer(target.player)].some(
        (unit) => unit.alive && hasStatus(unit, (entry) => entry.preventEnemyEvasion)
    );
    if (
        (accuracyReduction && teamPreventsAccuracyReduction) ||
        ((Number(status.evadeChancePercent) || 0) > 0 && enemyPreventsEvasion)
    ) {
        log(state, 'prevented-status', `${getSpecies(target).name} could not gain ${status.name}.`, {
            targetPlayer: target.player,
            targetSlot: target.slot,
            statusId: status.id,
        });
        return null;
    }
    const stunLikeEffect = Boolean(
        status.stunLikeEffect ||
        status.cannotUseSkills ||
        status.stunHarmful ||
        status.cannotUseNonMentalSkills ||
        (Array.isArray(status.cannotUseSkillClasses) && status.cannotUseSkillClasses.length > 0)
    );
    if (
        stunLikeEffect &&
        sourceRef.player !== target.player &&
        hasStatus(target, (entry) => entry.ignoreEnemyStuns)
    ) {
        log(state, 'ignored-stun', `${getSpecies(target).name} ignored ${status.name}.`, {
            targetPlayer: target.player,
            targetSlot: target.slot,
            statusId: status.id,
        });
        return null;
    }
    if (stunLikeEffect && Number.isInteger(status.durationActions)) {
        const durationReduction = target.statuses.reduce(
            (total, entry) =>
                total + (statusActive(entry) ? Math.max(0, Number(entry.stunDurationReduction) || 0) : 0),
            0
        );
        status.durationActions = Math.max(0, status.durationActions - durationReduction);
        if (status.durationActions <= 0) {
            log(state, 'reduced-status', `${getSpecies(target).name} prevented ${status.name} with status-duration protection.`, {
                targetPlayer: target.player,
                targetSlot: target.slot,
                statusId: status.id,
            });
            return null;
        }
    }
    if (Array.isArray(status.removeStatusIdsOnApply)) {
        const removeIds = new Set(status.removeStatusIdsOnApply);
        target.statuses = target.statuses.filter((entry) => !removeIds.has(entry.id));
    }
    if (status.uniqueEnemyStatusFromSource) {
        players.forEach((player) => {
            state.teams[player].forEach((unit) => {
                unit.statuses = unit.statuses.filter((entry) => !(
                    entry.id === status.id &&
                    entry.sourcePlayer === status.sourcePlayer &&
                    entry.sourceSlot === status.sourceSlot
                ));
            });
        });
    }
    if (status.replaceExisting) {
        target.statuses = target.statuses.filter((entry) => entry.id !== status.id);
    }
    const existing = target.statuses.find((entry) => entry.id === status.id);
    if (existing && status.durationActions === null) {
        existing.stacks = (existing.stacks ?? 1) + 1;
        existing.periodicDamage = (existing.periodicDamage ?? 0) + (status.periodicDamage ?? 0);
        existing.outgoingDamageDebuff =
            (existing.outgoingDamageDebuff ?? 0) + (status.outgoingDamageDebuff ?? 0);
        (status.mergeNumericFields ?? []).forEach((field) => {
            existing[field] = (existing[field] ?? 0) + (status[field] ?? 0);
        });
        (status.mergeMapFields ?? []).forEach((field) => {
            const merged = { ...(existing[field] ?? {}) };
            Object.entries(status[field] ?? {}).forEach(([key, value]) => {
                merged[key] = (merged[key] ?? 0) + value;
            });
            existing[field] = merged;
        });
    } else {
        target.statuses.push(status);
    }
    log(state, 'status', `${getSpecies(target).name} gained ${status.name}.`, {
        targetPlayer: sourceRef.targetPlayer,
        targetSlot: target.slot,
        statusId: status.id,
        hidden: Boolean(status.hidden),
        ownerPlayer: sourceRef.targetPlayer,
    });
    return status;
}

function incomingBlocked(state, actor, target, skill) {
    const harmfulToTarget = skillIsHarmfulToTarget(skill, actor, target);
    if (!harmfulToTarget) {
        const helpfulGuard = target.statuses.find(
            (status) => statusActive(status) && status.invulnerableToHelpfulSkills
        );
        if (helpfulGuard) {
            log(state, 'blocked', `${getSpecies(target).name} avoided ${skill.name} with ${helpfulGuard.name}.`);
            return true;
        }
        return false;
    }
    if (
        skill.ignoreInvulnerability ||
        skill.cannotBeCountered ||
        skill.classes?.includes('Bypassing') ||
        skill.classes?.includes('Uncounterable')
    ) return false;
    if (hasStatus(target, (status) => status.guardBroken)) return false;
    if (actor.player !== target.player) {
        const evadeChance = target.statuses.reduce(
            (total, status) => total + (statusActive(status) ? status.evadeChancePercent ?? 0 : 0),
            0
        );
        if (evadeChance > 0 && !skill.ignoreEvasion && !weatherEvasionImmune(state, skill)) {
            const roll = nextRandom(state) * 100;
            log(state, 'roll', `${getSpecies(target).name} rolled ${roll.toFixed(2)} against ${evadeChance}% evasion.`, {
                roll,
                threshold: evadeChance,
            });
            if (roll < evadeChance) {
                log(state, 'evade', `${getSpecies(target).name} evaded ${skill.name}.`, {
                    targetPlayer: target.player,
                    targetSlot: target.slot,
                    skillId: skill.id,
                });
                target.statuses
                    .filter((status) =>
                        statusActive(status) &&
                        (Number(status.evadeChancePercent) || 0) > 0 &&
                        status.consumeOnEvade
                    )
                    .forEach((status) => {
                        if (status.onEvadeApplyStatus) {
                            addStatus(state, target, {
                                player: status.sourcePlayer ?? target.player,
                                slot: status.sourceSlot ?? target.slot,
                                targetPlayer: target.player,
                            }, status.onEvadeApplyStatus);
                        }
                        status.durationActions = 0;
                    });
                target.statuses = target.statuses.filter(statusActive);
                return true;
            }
        }
        const classGuard = target.statuses.find((status) =>
            statusActive(status) &&
            Array.isArray(status.invulnerableToSkillClasses) &&
            status.invulnerableToSkillClasses.some((entry) => skill.classes?.includes(entry))
        );
        if (classGuard) {
            log(state, 'blocked', `${getSpecies(target).name} avoided ${skill.name} with ${classGuard.name}.`);
            return true;
        }
        const nonAfflictionGuard = target.statuses.find((status) =>
            statusActive(status) &&
            status.invulnerableToNonAffliction &&
            !skill.classes?.includes('Affliction')
        );
        if (nonAfflictionGuard) {
            log(state, 'blocked', `${getSpecies(target).name} avoided ${skill.name} with ${nonAfflictionGuard.name}.`);
            return true;
        }
    }
    const invulnerable = target.statuses.find((status) => statusActive(status) && status.invulnerable);
    if (invulnerable) {
        log(state, 'blocked', `${getSpecies(target).name} avoided ${skill.name} with ${invulnerable.name}.`);
        return true;
    }
    const guard = target.statuses.find(
        (status) => statusActive(status) && (status.blockNextHarmful || status.blockAllHarmful)
    );
    if (guard) {
        if (guard.blockNextHarmful) guard.durationActions = 0;
        if (guard.counterSourceOnBlock) {
            incrementCounter(state, sourceUnitForStatus(state, guard), guard.counterSourceOnBlock, 1, 3);
        }
        log(state, 'blocked', `${getSpecies(target).name} blocked ${skill.name} with ${guard.name}.`);
        return true;
    }
    return false;
}

function outgoingDebuff(actor) {
    return actor.statuses.reduce(
        (total, status) => total + (statusActive(status) ? status.outgoingDamageDebuff ?? 0 : 0),
        0
    );
}

function outgoingSkillBonus(actor, skill) {
    return actor.statuses.reduce(
        (total, status) => total + (statusActive(status) ? status.skillDamageBonuses?.[skill.id] ?? 0 : 0),
        0
    );
}

function outgoingGeneralBonus(actor, skill, damageKind) {
    return actor.statuses.reduce((total, status) => {
        if (!statusActive(status)) return total;
        const nonAffliction = damageKind === 'affliction'
            ? 0
            : status.nonAfflictionDamageBonusFlat ?? 0;
        const classBonus = Object.entries(status.damageBonusBySkillClass ?? {}).reduce(
            (sum, [skillClass, amount]) =>
                skill.classes?.includes(skillClass) ? sum + amount : sum,
            0
        );
        return total + (status.damageBonusFlat ?? 0) + nonAffliction + classBonus;
    }, 0);
}

function outgoingClassMultiplier(actor, skill) {
    return actor.statuses.reduce((multiplier, status) => {
        if (!statusActive(status)) return multiplier;
        const statusMultiplier = Object.entries(status.damageMultiplierBySkillClass ?? {})
            .reduce((value, [skillClass, amount]) =>
                skill.classes?.includes(skillClass) ? value * Math.max(0, Number(amount) || 0) : value,
            1);
        return multiplier * statusMultiplier;
    }, 1);
}

function copyActorStatusNumericToTemplate(actor, statusTemplate, copy) {
    if (!copy?.statusId || !copy?.sourceField || !copy?.targetField) return;
    const sourceStatus = actor.statuses.find(
        (status) => statusActive(status) && status.id === copy.statusId
    );
    let value = (Number(sourceStatus?.[copy.sourceField]) || 0) * (copy.multiplier ?? 1);
    if (Number.isFinite(copy.minimum)) value = Math.max(copy.minimum, value);
    if (Number.isFinite(copy.maximum)) value = Math.min(copy.maximum, value);
    statusTemplate[copy.targetField] = value;
    if (copy.addToOnExpireDamage) {
        statusTemplate.onExpireDamage =
            (Number(statusTemplate.onExpireDamage) || 0) + value;
    }
}

function stealRandomEnergy(state, fromPlayer, toPlayer, source, target) {
    const available = Object.keys(state.energy[fromPlayer] ?? {})
        .sort()
        .filter((key) => state.energy[fromPlayer][key] > 0);
    if (!available.length) return null;
    const picked = available[Math.floor(nextRandom(state) * available.length)];
    state.energy[fromPlayer][picked] -= 1;
    state.energy[toPlayer][picked] = (state.energy[toPlayer][picked] ?? 0) + 1;
    log(state, 'energy-steal', `${source ? getSpecies(source).name : toPlayer} stole 1 ${picked} energy.`, {
        energy: picked,
        player: toPlayer,
        targetPlayer: fromPlayer,
        targetSlot: target?.slot,
    });
    return picked;
}

function applyStolenEnergyCostOverride(state, actor, skill, picked, config) {
    if (!picked || !config?.statusId || !Array.isArray(config.skillIds)) return;
    const skillCostOverrides = {};
    config.skillIds.forEach((skillId) => {
        const configuredSkill = getSpecies(actor).skills.find((candidate) => candidate.id === skillId);
        if (!configuredSkill) return;
        let replaced = false;
        skillCostOverrides[skillId] = configuredSkill.energy.map((cost) => {
            if (!replaced && cost !== Energy.RANDOM) {
                replaced = true;
                return picked;
            }
            return cost;
        });
    });
    if (!Object.keys(skillCostOverrides).length) return;
    addStatus(state, actor, {
        player: actor.player,
        slot: actor.slot,
        targetPlayer: actor.player,
    }, {
        id: config.statusId,
        name: config.name ?? 'Stolen Energy Cost',
        description: config.description ?? 'The next listed skill uses the stolen energy color.',
        hidden: false,
        harmful: false,
        durationActions: null,
        replaceExisting: true,
        skillCostOverrides,
        consumeOnOwnerSkillIds: Object.keys(skillCostOverrides),
        sourceSkillId: skill.id,
    });
}

function triggerSuccessfulEnemyDamageHooks(state, actor, target) {
    if (!actor?.alive || !target || actor.player === target.player) return;
    actor.statuses.filter(statusActive).forEach((status) => {
        const hook = status.onSuccessfulEnemyDamageRandomStatus;
        if (!hook || !Array.isArray(hook.statusOptions) || hook.statusOptions.length === 0) return;
        const threshold = Math.max(0, Number(hook.chancePercent) || 0);
        const roll = nextRandom(state) * 100;
        log(state, 'roll', `${status.name} rolled ${roll.toFixed(2)} against ${threshold}%.`, {
            roll,
            threshold,
            sourcePlayer: actor.player,
            sourceSlot: actor.slot,
        });
        if (roll >= threshold) return;
        const selected = hook.statusOptions[
            Math.floor(nextRandom(state) * hook.statusOptions.length)
        ];
        addStatus(state, target, {
            player: actor.player,
            slot: actor.slot,
            targetPlayer: target.player,
        }, selected);
    });
}

function removeSourceBoundStatuses(state, source) {
    players.forEach((player) => {
        state.teams[player].forEach((unit) => {
            unit.statuses = unit.statuses.filter((status) => !(
                status.endIfSourceDies &&
                status.sourcePlayer === source.player &&
                status.sourceSlot === source.slot
            ));
        });
    });
}

function triggerOwnerDeathHooks(state, target) {
    for (const status of [...target.statuses]) {
        if (!statusActive(status) || !status.onOwnerDeathDamageEnemyTeam) continue;
        const hook = status.onOwnerDeathDamageEnemyTeam;
        status.durationActions = 0;
        livingTargets(state, otherPlayer(target.player)).forEach((enemy) => {
            dealFixedStatusDamage(state, target, enemy, status.name, hook.amount);
        });
    }
    target.statuses = target.statuses.filter(statusActive);
    removeSourceBoundStatuses(state, target);
}

function triggerOwnerKillHooks(state, actor) {
    if (!actor?.alive) return;
    for (const status of [...actor.statuses]) {
        if (statusActive(status) && Number.isInteger(status.onOwnerKillRefreshDuration)) {
            status.durationActions = status.onOwnerKillRefreshDuration;
            status.appliedTurn = state.turnNumber;
        }
        if (statusActive(status) && Number.isInteger(status.onOwnerKillExtendDuration)) {
            status.durationActions = Math.max(0, Number(status.durationActions) || 0) + status.onOwnerKillExtendDuration;
        }
        if (!statusActive(status) || !status.onOwnerKillRefreshSelf) continue;
        addStatus(state, actor, {
            player: actor.player,
            slot: actor.slot,
            targetPlayer: actor.player,
        }, status.onOwnerKillRefreshSelf);
    }
}

function dealFixedStatusDamage(state, source, target, reason, amount) {
    if (!target?.alive || amount <= 0) return 0;
    const wasAlive = target.alive;
    const lost = Math.min(amount, target.hp);
    target.hp = clamp(target.hp - lost, 0, unitMaxHp(target));
    target.alive = target.hp > 0;
    recordDamageTaken(state, target, lost);
    if (lost > 0) {
        const removeIds = new Set(
            target.statuses
                .filter(statusActive)
                .flatMap((status) => status.removeStatusIdsOnNewDamage ?? [])
        );
        if (removeIds.size) {
            target.statuses = target.statuses.filter((status) => !removeIds.has(status.id));
        }
    }
    log(state, 'damage', `${reason} dealt ${lost} fixed affliction damage to ${getSpecies(target).name}.`, {
        amount: lost,
        hpDamage: lost,
        shieldDamage: 0,
        effectiveness: 0,
        effectivenessLabel: '',
        targetSlot: target.slot,
        targetPlayer: target.player,
    });
    if (wasAlive && !target.alive) {
        triggerOwnerDeathHooks(state, target);
        triggerOwnerKillHooks(state, source);
    }
    if (lost > 0 && source) triggerSuccessfulEnemyDamageHooks(state, source, target);
    return lost;
}

function damageUnit(
    state,
    actor,
    target,
    skill,
    amount,
    damageKind = 'normal',
    applyTypeAdjustment = true
) {
    const damageGuard = actor.player !== target.player && amount > 0
        ? target.statuses.find((status) =>
            statusActive(status) && Number(status.ignoreNextEnemyDamageEffects) > 0
        )
        : null;
    if (damageGuard) {
        damageGuard.ignoreNextEnemyDamageEffects = Math.max(
            0,
            Number(damageGuard.ignoreNextEnemyDamageEffects) - 1
        );
        log(state, 'ignored-damage', `${getSpecies(target).name} ignored damage from ${skill.name}.`, {
            targetPlayer: target.player,
            targetSlot: target.slot,
            skillId: skill.id,
            remainingBlocks: damageGuard.ignoreNextEnemyDamageEffects,
        });
        return 0;
    }
    const transformedMoveType = state.weather?.transformMoveType?.[skill.moveType];
    if (transformedMoveType) {
        skill = { ...skill, moveType: transformedMoveType };
        if (damageKind !== 'piercing') damageKind = 'piercing';
    }
    const wasAlive = target.alive;
    const hpBefore = target.hp;
    const fixedDamage = damageKind.startsWith('fixed-');
    const incomingBonus = target.statuses.reduce(
        (total, status) => total + (
            !fixedDamage && statusActive(status)
                ? (status.damageTakenBonusFlat ?? 0) + (
                    skill.classes?.includes('Physical')
                        ? status.physicalDamageTakenBonusFlat ?? 0
                        : 0
                ) + (damageKind === 'affliction'
                    ? status.afflictionDamageTakenBonusFlat ?? 0
                    : 0) + Object.entries(status.incomingDamageBonusBySkillClass ?? {}).reduce(
                    (sum, [skillClass, amount]) =>
                        skill.classes?.includes(skillClass) ? sum + amount : sum,
                    0
                )
                : 0
        ),
        0
    );
    const weatherBonus = weatherDamageTypeBonus(state, skill) + weatherAfflictionBonus(state, damageKind);
    const outgoingBase = (
        fixedDamage
            ? amount + weatherBonus
            : damageKind === 'affliction'
            ? Math.max(
                0,
                amount + weatherBonus + outgoingSkillBonus(actor, skill) +
                    outgoingGeneralBonus(actor, skill, damageKind)
            )
            : Math.max(
                0,
                amount + weatherBonus + outgoingSkillBonus(actor, skill) +
                    outgoingGeneralBonus(actor, skill, damageKind) - outgoingDebuff(actor)
            )
    );
    const adjustedBase = incomingBonus + Math.ceil(outgoingBase * outgoingClassMultiplier(actor, skill));
    const effectiveness = applyTypeAdjustment && actor.player !== target.player
        ? typeEffectiveness(skill.moveType, getForm(target).types)
        : { score: 0, modifier: 0, label: '' };
    let finalAmount = adjustedBase;
    if (finalAmount > 0 && effectiveness.modifier !== 0) {
        finalAmount = effectiveness.modifier < 0
            ? Math.max(5, finalAmount + effectiveness.modifier)
            : finalAmount + effectiveness.modifier;
    }
    const afflictionReductionApplies =
        (damageKind === 'affliction' || damageKind === 'fixed-affliction') &&
        !skill.ignoreDamageReduction;
    const reductionApplies = damageKind === 'normal' || afflictionReductionApplies;
    const reduction = target.statuses.reduce(
        (largest, status) =>
            statusActive(status) ? Math.max(largest, status.damageReductionPercent ?? 0) : largest,
        0
    );
    if (reductionApplies && reduction > 0 && !hasStatus(target, (status) => status.guardBroken)) {
        finalAmount = Math.ceil(finalAmount * (1 - reduction / 100));
    }
    const flatReduction = target.statuses.reduce(
        (total, status) => total + (statusActive(status) ? status.damageReductionFlat ?? 0 : 0),
        0
    );
    if (reductionApplies && flatReduction > 0 && !hasStatus(target, (status) => status.guardBroken)) {
        finalAmount = Math.max(0, finalAmount - flatReduction);
    }
    const unpierceableReduction = target.statuses.reduce(
        (largest, status) => statusActive(status)
            ? Math.max(largest, status.unpierceableDamageReductionPercent ?? 0)
            : largest,
        0
    );
    if (unpierceableReduction > 0 && !hasStatus(target, (status) => status.guardBroken)) {
        finalAmount = Math.ceil(finalAmount * (1 - unpierceableReduction / 100));
    }
    const unpierceableFlatReduction = target.statuses.reduce(
        (total, status) =>
            total + (statusActive(status) ? status.unpierceableDamageReductionFlat ?? 0 : 0),
        0
    );
    if (
        unpierceableFlatReduction > 0 &&
        damageKind !== 'affliction' &&
        damageKind !== 'fixed-affliction'
    ) {
        finalAmount = Math.max(0, finalAmount - unpierceableFlatReduction);
    }
    let barrierDamage = 0;
    const barrierApplies = damageKind !== 'affliction' && damageKind !== 'fixed-affliction';
    if (barrierApplies && actor.barrier > 0 && finalAmount > 0) {
        barrierDamage = Math.min(actor.barrier, finalAmount);
        actor.barrier -= barrierDamage;
        finalAmount -= barrierDamage;
        let trackedDamage = barrierDamage;
        for (const status of actor.statuses) {
            if (trackedDamage <= 0) break;
            if (!statusActive(status) || !status.trackedBarrierPoints) continue;
            const absorbed = Math.min(status.trackedBarrierPoints, trackedDamage);
            status.trackedBarrierPoints -= absorbed;
            trackedDamage -= absorbed;
        }
        actor.statuses = actor.statuses.filter(
            (status) => !status.removeWhenTrackedBarrierExhausted || status.trackedBarrierPoints > 0
        );
        log(state, 'barrier', `${getSpecies(actor).name}'s barrier absorbed ${barrierDamage} outgoing damage from ${skill.name}.`, {
            amount: barrierDamage,
            sourcePlayer: actor.player,
            sourceSlot: actor.slot,
            skillId: skill.id,
        });
    }
    let remaining = finalAmount;
    let shieldDamage = 0;
    if ((damageKind === 'normal' || damageKind === 'normal-ignore-reduction') && target.shield > 0) {
        shieldDamage = Math.min(target.shield, remaining);
        target.shield -= shieldDamage;
        remaining -= shieldDamage;
        let trackedDamage = shieldDamage;
        for (const status of target.statuses) {
            if (trackedDamage <= 0) break;
            if (!statusActive(status) || !status.trackedShieldPoints) continue;
            const absorbed = Math.min(status.trackedShieldPoints, trackedDamage);
            status.trackedShieldPoints -= absorbed;
            trackedDamage -= absorbed;
        }
        target.statuses = target.statuses.filter(
            (status) => !status.removeWhenTrackedShieldExhausted || status.trackedShieldPoints > 0
        );
    }
    const minimumHp = target.statuses.reduce(
        (largest, status) => statusActive(status) ? Math.max(largest, status.minimumHp ?? 0) : largest,
        0
    );
    const hpWithoutMinimum = target.hp - remaining;
    target.hp = clamp(Math.max(minimumHp, hpWithoutMinimum), 0, unitMaxHp(target));
    target.alive = target.hp > 0;
    if (remaining > 0 && minimumHp > 0 && hpWithoutMinimum < minimumHp) {
        const preventedDeathStatus = target.statuses.find((status) =>
            statusActive(status) &&
            status.consumeOnPreventedDeath &&
            (status.minimumHp ?? 0) >= minimumHp
        );
        if (preventedDeathStatus) {
            target.statuses = target.statuses.filter((status) => status !== preventedDeathStatus);
            log(state, 'status-consumed', `${preventedDeathStatus.name} kept ${getSpecies(target).name} at ${minimumHp} HP.`, {
                targetPlayer: target.player,
                targetSlot: target.slot,
                statusId: preventedDeathStatus.id,
            });
        }
    }
    recordDamageTaken(state, target, Math.max(0, hpBefore - target.hp));
    if (finalAmount > 0) {
        const removeIds = new Set(
            target.statuses
                .filter(statusActive)
                .flatMap((status) => status.removeStatusIdsOnNewDamage ?? [])
        );
        if (removeIds.size) {
            target.statuses = target.statuses.filter((status) => !removeIds.has(status.id));
        }
    }
    if (finalAmount > 0 && actor.player !== target.player) {
        const rage = target.statuses.find(
            (status) => statusActive(status) && status.rageCounterMax && status.lastTriggeredTurn !== state.turnNumber
        );
        if (rage) {
            rage.lastTriggeredTurn = state.turnNumber;
            incrementCounter(state, target, 'rage', 1, rage.rageCounterMax);
        }
    }
    log(
        state,
        'damage',
        `${getSpecies(actor).name}'s ${skill.name} dealt ${finalAmount} damage to ${getSpecies(target).name}.`,
        {
            amount: finalAmount,
            hpDamage: remaining,
            shieldDamage,
            barrierDamage,
            effectiveness: effectiveness.modifier,
            effectivenessLabel: effectiveness.label,
            targetSlot: target.slot,
        }
    );
    if (wasAlive && !target.alive) {
        triggerOwnerDeathHooks(state, target);
        triggerOwnerKillHooks(state, actor);
    }
    if (finalAmount > 0) triggerSuccessfulEnemyDamageHooks(state, actor, target);
    return finalAmount;
}

function healUnit(state, target, amount, reason) {
    if (!target.alive) return 0;
    if (hasStatus(target, (status) => status.healBlocked)) {
        log(state, 'blocked-heal', `${getSpecies(target).name} could not be healed by ${reason}.`);
        return 0;
    }
    const multiplier = target.statuses.reduce(
        (value, status) =>
            statusActive(status) ? value * Math.max(0, Number(status.healReceivedMultiplier) || 1) : value,
        1
    );
    const healed = Math.min(amount * multiplier, unitMaxHp(target) - target.hp);
    target.hp += healed;
    if (healed > 0) log(state, 'heal', `${getSpecies(target).name} restored ${healed} HP with ${reason}.`);
    return healed;
}

function metronomeCandidates(mode) {
    return Object.values(ROSTER).flatMap((species) =>
        species.skills.flatMap((candidateSkill) =>
            (candidateSkill.effects ?? [])
                .filter((effect) => {
                    if ((effect.scope ?? 'target') !== 'target') return false;
                    if (!Number.isFinite(effect.amount) || effect.amount <= 0) return false;
                    return mode === 'damage' ? effect.kind === 'damage' : effect.kind === 'heal';
                })
                .map((effect) => ({ skill: candidateSkill, effect }))
        )
    );
}

function cleanseAccuracyAndEvasion(state, actor, skill) {
    state.teams[actor.player].forEach((ally) => {
        const before = ally.statuses.length;
        ally.statuses = ally.statuses.filter(
            (status) => !status.fullBlind && !status.harmfulBlindToSourceTeam
        );
        if (ally.statuses.length !== before) {
            log(state, 'cleanse', `${getSpecies(ally).name} removed accuracy reductions with ${skill.name}.`, {
                targetPlayer: ally.player,
                targetSlot: ally.slot,
                skillId: skill.id,
            });
        }
    });
    state.teams[otherPlayer(actor.player)].forEach((enemy) => {
        const before = enemy.statuses.length;
        enemy.statuses = enemy.statuses.filter(
            (status) => !(Number(status.evadeChancePercent) > 0)
        );
        if (enemy.statuses.length !== before) {
            log(state, 'cleanse', `${getSpecies(enemy).name} lost evasion to ${skill.name}.`, {
                targetPlayer: enemy.player,
                targetSlot: enemy.slot,
                skillId: skill.id,
            });
        }
    });
}

function effectTargets(state, context, scope = 'target') {
    const { action, actor, target } = context;
    if (scope === 'self') return [actor];
    if (scope === 'all-enemy') return livingTargets(state, otherPlayer(action.player));
    if (scope === 'other-enemies' || scope === 'all-other-enemies') {
        return livingTargets(state, otherPlayer(action.player)).filter((unit) => unit.slot !== target.slot);
    }
    if (scope === 'random-enemy') {
        const candidates = livingTargets(state, otherPlayer(action.player));
        if (!candidates.length) return [];
        return [candidates[Math.floor(nextRandom(state) * candidates.length)]];
    }
    if (scope === 'all-allies') return livingTargets(state, action.player);
    if (scope === 'all-allies-except-target') {
        return livingTargets(state, action.player).filter(
            (unit) => unit.slot !== target.slot && unit.slot !== actor.slot
        );
    }
    if (scope === 'selected-and-self') {
        return target === actor ? [actor] : [target, actor];
    }
    return [target];
}

function chanceThreshold(actor, effect, target, context) {
    const base = effect.chance ?? effect.percent ?? 100;
    const counterBonus = effect.chanceCounter
        ? (actor.counters[effect.chanceCounter.counter] ?? 0) * effect.chanceCounter.multiplier
        : 0;
    const missingHpBonus = effect.chancePerMissingHp
        ? (unitMaxHp(actor) - actor.hp) * effect.chancePerMissingHp
        : 0;
    const initialTargetHp = context?.initialTargetHp ?? target?.hp ?? unitMaxHp(target);
    const targetHpBonus = effect.chanceBonusIfInitialTargetHpAtMost &&
        initialTargetHp <= effect.chanceBonusIfInitialTargetHpAtMost.threshold
        ? effect.chanceBonusIfInitialTargetHpAtMost.amount
        : 0;
    const actorStatusBonus = effect.chanceBonusIfActorStatus &&
        hasStatus(actor, (status) => status.id === effect.chanceBonusIfActorStatus.statusId)
        ? effect.chanceBonusIfActorStatus.amount
        : 0;
    const actorStatusFieldBonus = effect.chanceBonusFromActorStatus
        ? actor.statuses
            .filter(statusActive)
            .filter((status) => status.id === effect.chanceBonusFromActorStatus.statusId)
            .reduce((total, status) => total +
                (Number(status[effect.chanceBonusFromActorStatus.field]) || 0) *
                    (effect.chanceBonusFromActorStatus.multiplier ?? 1), 0)
        : 0;
    const stunCertainty = effect.chanceCertainIfTargetStunned && target && hasAnyStunLikeStatus(target)
        ? 100
        : 0;
    return Math.max(
        base + counterBonus + missingHpBonus + targetHpBonus + actorStatusBonus + actorStatusFieldBonus,
        stunCertainty
    );
}

function hasAnyStunLikeStatus(unit) {
    return unit.statuses.some((status) => statusActive(status) && Boolean(
        status.stunLikeEffect ||
        status.cannotUseSkills ||
        status.stunHarmful ||
        status.cannotUseNonMentalSkills ||
        status.cannotUseHarmfulSkills ||
        (Array.isArray(status.cannotUseSkillClasses) && status.cannotUseSkillClasses.length > 0)
    ));
}

function rollEffectChance(state, actor, skill, effect, target, context) {
    const threshold = chanceThreshold(actor, effect, target, context);
    if (threshold >= 100) return true;
    const roll = nextRandom(state) * 100;
    log(state, 'roll', `${skill.name} rolled ${roll.toFixed(2)} against ${threshold}%.`, {
        roll,
        threshold,
    });
    return roll < threshold;
}

function shouldApplyTypeAdjustment(context, target) {
    if (context.actor.player === target.player) return false;
    if (!context.typeAdjustedTargets) context.typeAdjustedTargets = new Set();
    const key = `${target.player}:${target.slot}`;
    if (context.typeAdjustedTargets.has(key)) return false;
    context.typeAdjustedTargets.add(key);
    return true;
}

function prepareTargetForSkill(state, context, target) {
    const key = `${target.player}:${target.slot}`;
    if (!context.preparedTargets) context.preparedTargets = new Set();
    if (!context.preparedTargets.has(key)) {
        context.preparedTargets.add(key);
        triggerEnemyTargetedHooks(state, context.actor, [target], context.skill);
        if (incomingBlocked(state, context.actor, target, context.skill)) {
            context.blockedTargets.add(key);
        }
    }
    return context.blockedTargets.has(key);
}

function applyEffectToTarget(state, context, effect, target) {
    const { action, actor, skill } = context;
    if (prepareTargetForSkill(state, context, target)) return;
    const damagingToTarget = DAMAGING_EFFECT_KINDS.has(effect.kind) ||
        (effect.kind === 'metronome' && actor.player !== target.player);
    if (
        actor.player !== target.player &&
        !damagingToTarget &&
        !ACTOR_ONLY_EFFECT_KINDS.has(effect.kind) &&
        !skill.classes?.includes('Bypassing') &&
        hasStatus(target, (status) => status.ignoreEnemyNonDamageEffects)
    ) {
        log(state, 'ignored-effect', `${getSpecies(target).name} ignored a non-damaging effect from ${skill.name}.`, {
            targetPlayer: target.player,
            targetSlot: target.slot,
            skillId: skill.id,
        });
        return;
    }
    if (effect.kind === 'damage') {
        const counterBonus = effect.bonusPerCounter
            ? (actor.counters[effect.bonusPerCounter.counter] ?? 0) * effect.bonusPerCounter.multiplier
            : 0;
        const actorStatusBonus = effect.bonusFromActorStatus
            ? actor.statuses
                .filter(statusActive)
                .filter((status) => status.id === effect.bonusFromActorStatus.statusId)
                .reduce((total, status) =>
                    total + (Number(status[effect.bonusFromActorStatus.field]) || 0), 0)
            : 0;
        const targetStatusBonus = effect.bonusFromTargetStatus
            ? target.statuses
                .filter(statusActive)
                .filter((status) => status.id === effect.bonusFromTargetStatus.statusId)
                .reduce((total, status) =>
                    total + (Number(status[effect.bonusFromTargetStatus.field]) || 0) *
                        (effect.bonusFromTargetStatus.multiplier ?? 1), 0)
            : 0;
        const actorStatusScaledAmount = effect.amountFromActorStatus
            ? actor.statuses
                .filter(statusActive)
                .filter((status) => status.id === effect.amountFromActorStatus.statusId)
                .reduce((total, status) => {
                    const count = Math.max(
                        0,
                        Number(status[effect.amountFromActorStatus.countField]) || 0
                    );
                    const penalty = effect.amountFromActorStatus.penaltyField
                        ? Math.max(
                            0,
                            Number(status[effect.amountFromActorStatus.penaltyField]) || 0
                        )
                        : 0;
                    const perCount = Math.max(
                        0,
                        (effect.amountFromActorStatus.amountPerCount ?? 0) - penalty
                    );
                    return total + count * perCount;
                }, 0)
            : 0;
        const stunnedTargetBonus = effect.bonusIfTargetStunned && hasAnyStunLikeStatus(target)
            ? effect.bonusIfTargetStunned
            : 0;
        const dealt = damageUnit(
            state,
            actor,
            target,
            effect.ignoreDamageReduction !== undefined
                ? { ...skill, ignoreDamageReduction: effect.ignoreDamageReduction }
                : skill,
            effect.amount + counterBonus + actorStatusBonus + targetStatusBonus + actorStatusScaledAmount +
                stunnedTargetBonus,
            effect.damageKind,
            effect.applyTypeAdjustment === false
                ? false
                : shouldApplyTypeAdjustment(context, target)
        );
        if (dealt > 0 && effect.actorCounterFromDamage) {
            incrementCounter(
                state,
                actor,
                effect.actorCounterFromDamage.counter,
                dealt,
                effect.actorCounterFromDamage.maximum
            );
        }
        if (dealt > 0 && effect.actorCounterOnDamage) {
            incrementCounter(
                state,
                actor,
                effect.actorCounterOnDamage.counter,
                effect.actorCounterOnDamage.delta ?? 1,
                effect.actorCounterOnDamage.maximum
            );
        }
        if (effect.consumeActorTrackedShieldStatus) {
            consumeTrackedShieldStatus(state, actor, effect.consumeActorTrackedShieldStatus);
        }
        if (effect.consumeTargetStatus) {
            target.statuses = target.statuses.filter(
                (status) => status.id !== effect.consumeTargetStatus
            );
        }
        if (effect.consumeActorStatus) {
            actor.statuses = actor.statuses.filter((status) => status.id !== effect.consumeActorStatus);
        }
    } else if (effect.kind === 'heal') {
        const healed = healUnit(state, target, effect.amount, skill.name);
        if (healed > 0 && effect.actorCounterFromHealing) {
            incrementCounter(
                state,
                actor,
                effect.actorCounterFromHealing.counter,
                healed,
                effect.actorCounterFromHealing.maximum
            );
        }
    } else if (effect.kind === 'percentage-current-hp-heal-sequence') {
        const percentages = Array.isArray(effect.percentages) && effect.percentages.length > 0
            ? effect.percentages
            : [0];
        if (!actor.skillSequenceSteps) actor.skillSequenceSteps = {};
        const previousStep = Number(actor.skillSequenceSteps[skill.id]) || 0;
        const step = context.previousSkillId === skill.id
            ? Math.min(percentages.length - 1, previousStep + 1)
            : 0;
        actor.skillSequenceSteps[skill.id] = step;
        const amount = Math.floor(target.hp * Math.max(0, Number(percentages[step]) || 0) / 100);
        const healed = healUnit(state, target, amount, skill.name);
        if (healed > 0 && effect.actorCounterFromHealing) {
            incrementCounter(
                state,
                actor,
                effect.actorCounterFromHealing.counter,
                healed,
                effect.actorCounterFromHealing.maximum
            );
        }
        log(state, 'heal-sequence', `${getForm(actor).name}'s ${skill.name} used its ${percentages[step]}% step.`, {
            player: actor.player,
            actorSlot: actor.slot,
            skillId: skill.id,
            step,
            percent: percentages[step],
            amount: healed,
        });
    } else if (effect.kind === 'flat-heal-sequence') {
        if (!actor.skillSequenceSteps) actor.skillSequenceSteps = {};
        const previousStep = Number(actor.skillSequenceSteps[skill.id]) || 0;
        const step = context.previousSkillId === skill.id ? previousStep + 1 : 0;
        actor.skillSequenceSteps[skill.id] = step;
        const amount = Math.max(0, (Number(effect.amount) || 0) - step * (Number(effect.decrement) || 0));
        const healed = healUnit(state, target, amount, skill.name);
        log(state, 'heal-sequence', `${getForm(actor).name}'s ${skill.name} used its step ${step} amount.`, {
            player: actor.player,
            actorSlot: actor.slot,
            skillId: skill.id,
            step,
            amount: healed,
        });
    } else if (effect.kind === 'metronome') {
        const mode = target.player === actor.player ? 'heal' : 'damage';
        const candidates = metronomeCandidates(mode);
        const selected = candidates[Math.floor(nextRandom(state) * candidates.length)] ?? null;
        const amount = Math.max(1, Number(selected?.effect?.amount) || 20);
        let resolvedAmount = 0;
        if (mode === 'damage') {
            resolvedAmount = damageUnit(
                state,
                actor,
                target,
                skill,
                amount,
                selected?.effect?.damageKind ?? 'normal',
                shouldApplyTypeAdjustment(context, target)
            );
        } else {
            resolvedAmount = healUnit(state, target, amount, skill.name);
            if (resolvedAmount > 0 && effect.actorCounterFromHealing) {
                incrementCounter(
                    state,
                    actor,
                    effect.actorCounterFromHealing.counter,
                    resolvedAmount,
                    effect.actorCounterFromHealing.maximum
                );
            }
        }
        log(state, 'metronome-copy', `${getForm(actor).name}'s ${skill.name} copied ${selected?.skill?.name ?? `${amount} ${mode}`}.`, {
            player: actor.player,
            actorSlot: actor.slot,
            targetPlayer: target.player,
            targetSlot: target.slot,
            skillId: skill.id,
            copiedSkillId: selected?.skill?.id ?? null,
            copiedEffectKind: mode,
            copiedBaseAmount: amount,
            amount: resolvedAmount,
        });
    } else if (effect.kind === 'cleanse-affliction') {
        const before = target.statuses.length;
        target.statuses = target.statuses.filter((status) => !(
            status.harmful &&
            !status.unremovable &&
            (
                status.affliction ||
                status.periodicDamageKind === 'affliction' ||
                status.turnEndDamageKind === 'affliction' ||
                status.turnStartDamageKind === 'affliction'
            )
        ));
        if (target.statuses.length !== before) {
            log(state, 'cleanse', `${getSpecies(target).name} removed affliction effects with ${skill.name}.`, {
                targetPlayer: target.player,
                targetSlot: target.slot,
                skillId: skill.id,
            });
        }
    } else if (effect.kind === 'drain') {
        const bonus = actor.statuses.reduce(
            (total, status) => total + (statusActive(status) ? status.drainBonus ?? 0 : 0),
            0
        );
        const hpBefore = target.hp;
        damageUnit(
            state,
            actor,
            target,
            effect.ignoreDamageReduction !== undefined
                ? { ...skill, ignoreDamageReduction: effect.ignoreDamageReduction }
                : skill,
            effect.amount + bonus,
            effect.damageKind,
            shouldApplyTypeAdjustment(context, target)
        );
        const dealt = Math.max(0, hpBefore - target.hp);
        healUnit(state, actor, dealt, skill.name);
        if (dealt > 0 && effect.actorCounterFromDamage) {
            incrementCounter(
                state,
                actor,
                effect.actorCounterFromDamage.counter,
                dealt,
                effect.actorCounterFromDamage.maximum
            );
        }
        if (dealt > 0 && effect.actorCounterOnDamage) {
            incrementCounter(
                state,
                actor,
                effect.actorCounterOnDamage.counter,
                effect.actorCounterOnDamage.delta ?? 1,
                effect.actorCounterOnDamage.maximum
            );
        }
        if (effect.consumeActorStatus) {
            actor.statuses = actor.statuses.filter((status) => status.id !== effect.consumeActorStatus);
        }
    } else if (effect.kind === 'health-loss') {
        const wasAlive = target.alive;
        const selfSkillMinimumHp = target === actor
            ? target.statuses.reduce(
                (minimum, status) => statusActive(status)
                    ? Math.max(minimum, Number(status.minimumHpFromSelfSkillDamage) || 0)
                    : minimum,
                0
            )
            : 0;
        const lost = Math.min(effect.amount, Math.max(0, target.hp - selfSkillMinimumHp));
        target.hp = clamp(target.hp - lost, 0, unitMaxHp(target));
        target.alive = target.hp > 0;
        recordDamageTaken(state, target, lost);
        log(state, 'health-loss', `${getSpecies(target).name} lost ${lost} HP from ${skill.name}.`, {
            amount: lost,
            targetPlayer: target.player,
            targetSlot: target.slot,
        });
        if (target === actor && lost > 0) {
            target.statuses.filter(statusActive).forEach((status) => {
                if (!status.selfSkillHealthLossShieldStatus) return;
                grantShield(target, lost);
                addStatus(state, target, {
                    player: actor.player,
                    slot: actor.slot,
                    targetPlayer: actor.player,
                }, {
                    ...status.selfSkillHealthLossShieldStatus,
                    trackedShieldPoints: lost,
                });
            });
        }
        if (wasAlive && !target.alive) triggerOwnerDeathHooks(state, target);
    } else if (effect.kind === 'execute') {
        const executeGuard = target.statuses.find(
            (status) => statusActive(status) && status.ignoreExecutionEffects
        );
        if (executeGuard) {
            log(state, 'ignored-execute', `${getSpecies(target).name} ignored ${skill.name} with ${executeGuard.name}.`, {
                targetPlayer: target.player,
                targetSlot: target.slot,
                statusId: executeGuard.id,
            });
            return;
        }
        const wasAlive = target.alive;
        const lost = target.hp;
        target.hp = 0;
        target.alive = false;
        recordDamageTaken(state, target, lost);
        log(state, 'execute', `${getSpecies(actor).name}'s ${skill.name} executed ${getSpecies(target).name}.`, {
            amount: lost,
            targetPlayer: target.player,
            targetSlot: target.slot,
        });
        if (wasAlive) {
            triggerOwnerDeathHooks(state, target);
            triggerOwnerKillHooks(state, actor);
            if (effect.evolveActorForm && actor.alive) evolveUnit(state, actor, effect.evolveActorForm);
        }
    } else if (effect.kind === 'fixed-affliction-damage') {
        dealFixedStatusDamage(state, actor, target, skill.name, effect.amount);
    } else if (effect.kind === 'status') {
        const statusTemplate = clone(effect.status);
        statusTemplate.sourceSkillId ??= skill.id;
        if (effect.copyActorStatusNumeric) {
            copyActorStatusNumericToTemplate(actor, statusTemplate, effect.copyActorStatusNumeric);
        }
        if (effect.durationFromTargetStatusField) {
            const { statusId, field, multiplier, minimum, maximum } = effect.durationFromTargetStatusField;
            const sourceStatus = target.statuses.find((entry) => entry.id === statusId);
            const raw = Math.max(0, Number(sourceStatus?.[field]) || 0) * (Number(multiplier) || 1);
            statusTemplate.durationActions = Math.min(
                Number.isFinite(maximum) ? maximum : Infinity,
                Math.max(Number.isFinite(minimum) ? minimum : 0, raw)
            );
        }
        const appliedStatus = statusTemplate.durationActions === 0
            ? null
            : addStatus(state, target, {
            player: action.player,
            slot: actor.slot,
            targetPlayer: target.player,
        }, statusTemplate);
        if (appliedStatus) {
            (effect.onAppliedEffects ?? []).forEach((nested) => resolveEffect(state, context, nested));
        }
        if (effect.actorCounter) {
            incrementCounter(
                state,
                actor,
                effect.actorCounter.counter,
                effect.actorCounter.delta ?? 1,
                effect.actorCounter.maximum
            );
        }
    } else if (effect.kind === 'source-status') {
        addStatus(state, actor, {
            player: action.player,
            slot: actor.slot,
            targetPlayer: action.player,
        }, {
            ...effect.status,
            sourceSkillId: effect.status.sourceSkillId ?? skill.id,
        });
    } else if (effect.kind === 'increment-actor-counter') {
        incrementCounter(state, actor, effect.counter, effect.delta ?? 1, effect.maximum);
    } else if (effect.kind === 'increment-actor-status-field') {
        const status = actor.statuses.find(
            (entry) => statusActive(entry) && entry.id === effect.statusId
        );
        if (status && effect.field) {
            const current = Math.max(0, Number(status[effect.field]) || 0);
            const maximum = Number.isFinite(effect.maximum)
                ? effect.maximum
                : Number.POSITIVE_INFINITY;
            const delta = (Number(effect.delta) || 0) + weatherStatusFieldBonus(state, actor, effect);
            status[effect.field] = Math.min(
                maximum,
                Math.max(0, current + delta)
            );
        }
    } else if (effect.kind === 'grant-random-energy-to-actor') {
        grantRandomEnergy(state, actor.player, effect.amount ?? 1, effect.reason ?? skill.name);
    } else if (effect.kind === 'grant-energy-to-actor') {
        const amount = Math.max(0, Number(effect.amount) || 0);
        state.energy[actor.player][effect.energyType] =
            (state.energy[actor.player][effect.energyType] ?? 0) + amount;
        if (amount > 0) {
            log(state, 'energy', `${getSpecies(actor).name} gained ${amount} ${effect.energyType} energy.`, {
                player: actor.player,
                energy: effect.energyType,
                amount,
            });
        }
    } else if (effect.kind === 'set-weather') {
        setWeather(state, {
            ...effect.weather,
            sourcePlayer: actor.player,
            sourceSlot: actor.slot,
        });
    } else if (effect.kind === 'clear-weather') {
        if (!effect.weatherKey || state.weather?.key === effect.weatherKey) {
            clearWeather(state, 'consumed');
        }
    } else if (effect.kind === 'reset-actor-counter') {
        actor.counters[effect.counter] = 0;
    } else if (effect.kind === 'reset-actor-status-field') {
        const status = actor.statuses.find(
            (entry) => statusActive(entry) && entry.id === effect.statusId
        );
        if (status && effect.field) status[effect.field] = Math.max(0, Number(effect.value) || 0);
    } else if (effect.kind === 'reset-actor-unique-skill-group') {
        if (!actor.uniqueSkillUses) actor.uniqueSkillUses = {};
        delete actor.uniqueSkillUses[effect.group];
        if (effect.counter) actor.counters[effect.counter] = 0;
    } else if (effect.kind === 'accelerate-perish-song') {
        acceleratePerishSong(state, actor, target);
    } else if (effect.kind === 'remove-actor-status') {
        const removeIds = new Set(effect.statusIds ?? []);
        actor.statuses = actor.statuses.filter((status) => !removeIds.has(status.id));
    } else if (effect.kind === 'consume-actor-tracked-shield') {
        consumeTrackedShieldStatus(state, actor, effect.statusId);
    } else if (effect.kind === 'destroy-shield') {
        const removed = target.shield;
        target.shield = 0;
        target.statuses = target.statuses.filter((status) => !status.trackedShieldPoints);
        if (removed > 0 && effect.actorStatusIfDestroyed) {
            addStatus(state, actor, {
                player: action.player,
                slot: actor.slot,
                targetPlayer: action.player,
            }, {
                ...effect.actorStatusIfDestroyed,
                sourceSkillId: effect.actorStatusIfDestroyed.sourceSkillId ?? skill.id,
            });
        }
        log(state, 'shield-destroyed', `${getSpecies(actor).name} destroyed ${removed} defense on ${getSpecies(target).name}.`, {
            amount: removed,
            targetPlayer: target.player,
            targetSlot: target.slot,
        });
    } else if (effect.kind === 'shield') {
        const counterBonus = effect.bonusPerActorCounter
            ? (actor.counters[effect.bonusPerActorCounter.counter] ?? 0) *
                effect.bonusPerActorCounter.multiplier
            : 0;
        const incomingBonus = effect.includeIncomingShieldBonus
            ? target.statuses.reduce(
                (total, status) =>
                    total + (statusActive(status) ? status.additionalIncomingShieldPoints ?? 0 : 0),
                0
            )
            : 0;
        const granted = grantShield(target, effect.amount + counterBonus + incomingBonus);
        if (effect.trackedStatus) {
            const trackedStatus = clone(effect.trackedStatus);
            if (effect.copyActorStatusNumeric) {
                copyActorStatusNumericToTemplate(actor, trackedStatus, effect.copyActorStatusNumeric);
            }
            if (
                effect.durationBonusFromActorStatus &&
                hasStatus(actor, (status) => status.id === effect.durationBonusFromActorStatus.statusId)
            ) {
                trackedStatus.durationActions =
                    (trackedStatus.durationActions ?? 0) + effect.durationBonusFromActorStatus.amount;
            }
            addStatus(state, target, {
                player: action.player,
                slot: actor.slot,
                targetPlayer: target.player,
            }, {
                ...trackedStatus,
                sourceSkillId: trackedStatus.sourceSkillId ?? skill.id,
                trackedShieldPoints: granted,
            });
        }
        log(state, 'shield', `${getSpecies(target).name} gained ${granted} destructible defense.`, {
            amount: granted,
            targetPlayer: target.player,
            targetSlot: target.slot,
        });
    } else if (effect.kind === 'barrier') {
        const counterBonus = effect.bonusPerActorCounter
            ? (actor.counters[effect.bonusPerActorCounter.counter] ?? 0) *
                effect.bonusPerActorCounter.multiplier
            : 0;
        const granted = grantBarrier(target, effect.amount + counterBonus);
        if (effect.trackedStatus) {
            const trackedStatus = clone(effect.trackedStatus);
            if (
                effect.durationBonusFromActorStatus &&
                hasStatus(actor, (status) => status.id === effect.durationBonusFromActorStatus.statusId)
            ) {
                trackedStatus.durationActions =
                    (trackedStatus.durationActions ?? 0) + effect.durationBonusFromActorStatus.amount;
            }
            addStatus(state, target, {
                player: action.player,
                slot: actor.slot,
                targetPlayer: target.player,
            }, {
                ...trackedStatus,
                sourceSkillId: trackedStatus.sourceSkillId ?? skill.id,
                trackedBarrierPoints: granted,
            });
        }
        log(state, 'barrier', `${getSpecies(target).name} gained ${granted} outgoing-damage barrier.`, {
            amount: granted,
            targetPlayer: target.player,
            targetSlot: target.slot,
        });
    } else if (effect.kind === 'convert-shield-to-max-hp') {
        const gained = Math.max(0, Number(target.shield) || 0);
        if (gained > 0) {
            target.shield = 0;
            target.shieldCapacity = 0;
            target.maxHp = unitMaxHp(target) + gained;
            log(state, 'max-hp', `${getSpecies(target).name} converted ${gained} Shield into permanent maximum HP.`, {
                amount: gained,
                targetPlayer: target.player,
                targetSlot: target.slot,
            });
        }
        const healAmount = Math.floor(unitMaxHp(target) * (Number(effect.healPercent) || 0) / 100);
        if (healAmount > 0) healUnit(state, target, healAmount, skill.name);
    } else if (effect.kind === 'remove-source-control-statuses') {
        const isControlStatus = (status) => Boolean(
            status.cannotUseSkills || status.cannotUseHarmfulSkills || status.cannotUseHelpfulSkills ||
            status.cannotUseNonMentalSkills || status.fullBlind || status.harmfulBlindToSourceTeam ||
            status.paralyzeCooldowns || status.tauntSource ||
            (Array.isArray(status.cannotUseSkillClasses) && status.cannotUseSkillClasses.length > 0) ||
            status.ongoingClass === 'channeled'
        );
        players.forEach((player) => {
            state.teams[player].forEach((unit) => {
                unit.statuses = unit.statuses.filter((status) =>
                    status.unremovable ||
                    !isControlStatus(status) ||
                    status.sourcePlayer !== target.player ||
                    status.sourceSlot !== target.slot
                );
            });
        });
    } else if (effect.kind === 'cycling-class-damage-debuff') {
        const source = actor.statuses.find((status) => statusActive(status) && status.cyclingClassAura);
        const resolved = resolveActiveCyclingClass(state, source);
        if (resolved) {
            addStatus(state, target, {
                player: actor.player, slot: actor.slot, targetPlayer: target.player,
            }, {
                id: effect.statusId,
                name: effect.name ?? 'Sweet Scent Weakness',
                hidden: false, harmful: true, durationActions: null,
                damageBonusBySkillClass: { [resolved.activeClass]: -(Number(effect.amount) || 0) },
                mergeMapFields: ['damageBonusBySkillClass'],
                sourceSkillId: skill.id,
            });
        }
    } else if (effect.kind === 'cycling-class-stun') {
        const source = actor.statuses.find((status) => statusActive(status) && status.cyclingClassAura);
        const resolved = resolveActiveCyclingClass(state, source);
        if (resolved) {
            addStatus(state, target, {
                player: actor.player, slot: actor.slot, targetPlayer: target.player,
            }, {
                id: effect.statusId,
                name: effect.name ?? 'Sweet Scent Stun',
                hidden: false, harmful: true,
                durationActions: effect.durationActions ?? 3, durationAnchor: 'target',
                cannotUseSkillClasses: [resolved.activeClass],
                sourceSkillId: skill.id,
            });
        }
    } else if (effect.kind === 'consume-actor-counter-into-target-stun') {
        const source = actor.statuses.find((status) => statusActive(status) && status.id === effect.statusId);
        const count = Math.max(0, Number(source?.[effect.field]) || 0);
        if (count > 0) {
            addStatus(state, target, {
                player: actor.player, slot: actor.slot, targetPlayer: target.player,
            }, {
                ...effect.status,
                durationActions: count,
            });
        }
        if (source) source[effect.field] = 0;
    } else if (effect.kind === 'consume-actor-empowerment') {
        const status = actor.statuses.find((entry) => statusActive(entry) && entry.id === effect.statusId);
        if (status && (Number(status[effect.flagField]) || 0) > 0) {
            status[effect.targetField] = (Number(status[effect.targetField]) || 0) + (Number(effect.delta) || 0);
            status[effect.flagField] = 0;
        }
    } else if (effect.kind === 'stacking-mark') {
        const existing = target.statuses.find((status) => status.id === effect.statusId);
        const currentStacks = Math.max(0, Number(existing?.[effect.stackField]) || 0);
        const nextStacks = Math.min(
            Number.isFinite(effect.stackMax) ? effect.stackMax : Infinity,
            currentStacks + 1
        );
        target.statuses = target.statuses.filter((status) => status.id !== effect.statusId);
        addStatus(state, target, {
            player: actor.player, slot: actor.slot, targetPlayer: target.player,
        }, {
            ...effect.status,
            id: effect.statusId,
            [effect.stackField]: nextStacks,
            ...(effect.scaledField
                ? { [effect.scaledField]: nextStacks * (Number(effect.perStack) || 0) }
                : {}),
        });
    } else if (effect.kind === 'steal-helpful-status') {
        const stolen = target.statuses.find((status) =>
            statusActive(status) &&
            !status.harmful &&
            !status.unremovable &&
            status.durationActions !== null
        );
        if (stolen) {
            target.statuses = target.statuses.filter((status) => status !== stolen);
            const duration = Math.min(
                Math.max(1, Number(effect.maxDuration) || 2),
                Number(stolen.durationActions) || 1
            );
            addStatus(state, actor, {
                player: actor.player,
                slot: actor.slot,
                targetPlayer: actor.player,
            }, {
                ...stolen,
                id: `${skill.id}-stolen-${stolen.id}`,
                durationActions: duration,
                harmful: false,
                unremovable: false,
                sourceSkillId: skill.id,
            });
            log(state, 'status-stolen', `${getSpecies(actor).name} stole ${stolen.name} from ${getSpecies(target).name}.`, {
                player: actor.player,
                actorSlot: actor.slot,
                targetPlayer: target.player,
                targetSlot: target.slot,
                statusId: stolen.id,
            });
        }
    } else if (effect.kind === 'modify-cooldowns') {
        const skillIds = effect.allSkills
            ? activeSkillIds(target).filter((skillId) =>
                !effect.harmfulOnly || getSkill(target, skillId)?.harmful !== false
            )
            : Object.keys(target.cooldowns);
        skillIds.forEach((skillId) => {
            target.cooldowns[skillId] = Math.max(0, (target.cooldowns[skillId] ?? 0) + effect.amount);
            if (target.cooldowns[skillId] === 0) delete target.cooldowns[skillId];
        });
    } else if (effect.kind === 'extend-status-duration') {
        const ids = new Set(effect.statusIds ?? []);
        const extended = target.statuses.filter((status) =>
            statusActive(status) &&
            ids.has(status.id) &&
            (!effect.sourceMustBeActor || (
                status.sourcePlayer === actor.player && status.sourceSlot === actor.slot
            )) &&
            Number.isInteger(status.durationActions)
        );
        extended.forEach((status) => {
            status.durationActions += Math.max(0, Number(effect.amount) || 0);
        });
        if (extended.length) {
            log(state, 'status-extended', `${getSpecies(actor).name} extended ${extended.map((status) => status.name).join(' and ')}.`, {
                targetPlayer: target.player,
                targetSlot: target.slot,
                amount: Math.max(0, Number(effect.amount) || 0),
            });
            if (effect.actorCounterOnSuccess) {
                incrementCounter(
                    state,
                    actor,
                    effect.actorCounterOnSuccess.counter,
                    effect.actorCounterOnSuccess.delta ?? 1,
                    effect.actorCounterOnSuccess.maximum
                );
            }
        }
    } else if (effect.kind === 'steal-energy') {
        const picked = stealRandomEnergy(
            state,
            target.player,
            actor.player,
            actor,
            target
        );
        applyStolenEnergyCostOverride(
            state,
            actor,
            skill,
            picked,
            effect.actorSkillCostOverrideFromStolen
        );
    } else if (effect.kind === 'revive') {
        if (!target.alive && !target.banished) {
            target.hp = clamp(effect.amount, 1, unitMaxHp(target));
            target.alive = true;
            log(state, 'revive', `${getSpecies(target).name} returned with ${target.hp} HP.`, {
                amount: target.hp,
                targetPlayer: target.player,
                targetSlot: target.slot,
            });
            if (effect.actorCounterFromHealing) {
                incrementCounter(
                    state,
                    actor,
                    effect.actorCounterFromHealing.counter,
                    target.hp,
                    effect.actorCounterFromHealing.maximum
                );
            }
        }
    } else if (effect.kind === 'banish') {
        const capturedName = getForm(target).name;
        target.hp = 0;
        target.shield = 0;
        target.alive = false;
        target.banished = true;
        log(state, 'capture', `${capturedName} was captured and permanently removed from the battle.`, {
            targetPlayer: target.player,
            targetSlot: target.slot,
            skillId: skill.id,
        });
    } else if (effect.kind === 'copy-target-character') {
        const copiedSpeciesId = target.effectiveSpeciesId ?? target.speciesId;
        const copiedForm = target.effectiveSpeciesId ? target.effectiveForm ?? 'base' : target.form;
        actor.effectiveSpeciesId = copiedSpeciesId;
        actor.effectiveForm = copiedForm;
        actor.cooldowns = {};
        addStatus(state, actor, {
            player: action.player,
            slot: actor.slot,
            targetPlayer: actor.player,
        }, {
            id: 'pokemon-trainer-captured-form',
            name: `Captured ${getForm(actor).name}`,
            hidden: false,
            harmful: false,
            durationActions: null,
            unremovable: true,
        });
        log(state, 'copy', `Pokemon Trainer copied ${getForm(actor).name}'s current form and skills.`, {
            player: actor.player,
            actorSlot: actor.slot,
            effectiveSpeciesId: copiedSpeciesId,
            effectiveForm: copiedForm,
        });
    } else if (effect.kind === 'force-evolve') {
        const species = ROSTER[target.speciesId];
        const forcedForm = species?.forcedEvolutionForm;
        const alreadyEmpowered = hasStatus(target, (status) => status.id === 'pokemon-trainer-rare-candy-defense');
        if (forcedForm && !target.effectiveSpeciesId && !alreadyEmpowered) {
            if (target.form === 'base') evolveUnit(state, target, forcedForm);
            grantShield(target, 25);
            addStatus(state, target, {
                player: action.player,
                slot: actor.slot,
                targetPlayer: target.player,
            }, {
                id: 'pokemon-trainer-rare-candy-defense',
                name: 'Rare Candy Defense',
                hidden: false,
                harmful: false,
                durationActions: null,
                unremovable: true,
            });
            log(state, 'shield', `${getForm(target).name} gained 25 destructible defense from Rare Candy.`, {
                amount: 25,
                targetPlayer: target.player,
                targetSlot: target.slot,
            });
        }
    } else if (effect.kind === 'cleanse') {
        const before = target.statuses.length;
        target.statuses = target.statuses.filter((status) => !status.harmful || status.unremovable);
        if (before !== target.statuses.length && effect.actorCounter) {
            incrementCounter(state, actor, effect.actorCounter, 1, 3);
        }
    } else if (effect.kind === 'cleanse-enemy-statuses') {
        const before = target.statuses.length;
        target.statuses = target.statuses.filter(
            (status) => status.unremovable || status.sourcePlayer === target.player
        );
        if (before !== target.statuses.length) {
            log(state, 'cleanse', `${getSpecies(target).name} removed enemy non-damaging effects.`, {
                targetPlayer: target.player,
                targetSlot: target.slot,
            });
            if (effect.actorCounter) incrementCounter(state, actor, effect.actorCounter, 1, 3);
        }
    } else if (effect.kind === 'cleanse-enemy-affliction') {
        const before = target.statuses.length;
        target.statuses = target.statuses.filter((status) => !(
            status.harmful &&
            status.affliction &&
            status.sourcePlayer !== target.player &&
            !status.unremovable
        ));
        if (before !== target.statuses.length) {
            log(state, 'cleanse', `${getSpecies(target).name} shed enemy affliction effects.`, {
                targetPlayer: target.player,
                targetSlot: target.slot,
            });
        }
    } else if (effect.kind === 'record-unique-skill') {
        if (!actor.uniqueSkillUses) actor.uniqueSkillUses = {};
        const used = new Set(actor.uniqueSkillUses[effect.group] ?? []);
        if (!used.has(skill.id)) {
            used.add(skill.id);
            actor.uniqueSkillUses[effect.group] = [...used];
            actor.counters[effect.counter] = used.size;
            log(state, 'counter', `${getForm(actor).name} has used ${used.size}/${effect.threshold} unique skills.`, {
                player: actor.player,
                slot: actor.slot,
                counter: effect.counter,
                value: used.size,
            });
            if (used.size >= effect.threshold) evolveUnit(state, actor, effect.evolveForm);
        }
    }
}

function captureThresholdMet(context, threshold) {
    const statuses = context.initialTargetStatuses ?? [];
    const disabledBonus = statuses.some(
        (status) => statusActive(status) && (status.id === 'stunned' || status.paralyzeCooldowns)
    ) ? 10 : 0;
    return (context.initialTargetHp ?? context.target.hp) <= threshold + disabledBonus;
}

function effectConditionMet(context, target, effect) {
    const { action, actor } = context;
    if (effect.targetRelation === 'enemy' && target.player === action.player) return false;
    if (effect.targetRelation === 'ally' && target.player !== action.player) return false;
    if (effect.requiresTargetStatus && !hasStatus(target, (status) => status.id === effect.requiresTargetStatus)) {
        return false;
    }
    if (
        Array.isArray(effect.requiresAnyTargetStatus) &&
        !effect.requiresAnyTargetStatus.some((statusId) => hasStatus(target, (status) => status.id === statusId))
    ) return false;
    if (effect.unlessTargetStatus && hasStatus(target, (status) => status.id === effect.unlessTargetStatus)) {
        return false;
    }
    const initialStatuses = context.initialTargetStatuses ?? [];
    const initialActorStatuses = context.initialActorStatuses ?? [];
    if (
        effect.requiresInitialTargetStatus &&
        !initialStatuses.some((status) => statusActive(status) && status.id === effect.requiresInitialTargetStatus)
    ) return false;
    if (
        effect.unlessInitialTargetStatus &&
        initialStatuses.some((status) => statusActive(status) && status.id === effect.unlessInitialTargetStatus)
    ) return false;
    if (effect.requiresActorStatus && !hasStatus(actor, (status) => status.id === effect.requiresActorStatus)) {
        return false;
    }
    if (effect.unlessActorStatus && hasStatus(actor, (status) => status.id === effect.unlessActorStatus)) {
        return false;
    }
    if (
        effect.requiresActorStatusFieldAtMost &&
        !actor.statuses.some((status) =>
            statusActive(status) &&
            status.id === effect.requiresActorStatusFieldAtMost.statusId &&
            (Number(status[effect.requiresActorStatusFieldAtMost.field]) ?? Infinity) <=
                effect.requiresActorStatusFieldAtMost.atMost
        )
    ) return false;
    if (
        effect.unlessActorStatusFieldAtMost &&
        actor.statuses.some((status) =>
            statusActive(status) &&
            status.id === effect.unlessActorStatusFieldAtMost.statusId &&
            (Number(status[effect.unlessActorStatusFieldAtMost.field]) ?? Infinity) <=
                effect.unlessActorStatusFieldAtMost.atMost
        )
    ) return false;
    if (
        effect.requiresInitialActorStatus &&
        !initialActorStatuses.some(
            (status) => statusActive(status) && status.id === effect.requiresInitialActorStatus
        )
    ) return false;
    if (
        effect.unlessInitialActorStatus &&
        initialActorStatuses.some(
            (status) => statusActive(status) && status.id === effect.unlessInitialActorStatus
        )
    ) return false;
    if (effect.requiresTargetAlive === true && !target.alive) return false;
    if (effect.requiresTargetAlive === false && target.alive) return false;
    if (effect.requiresEnemyTarget && target.player === action.player) return false;
    if (Number.isFinite(effect.captureThreshold) && !captureThresholdMet(context, effect.captureThreshold)) {
        return false;
    }
    if (Number.isFinite(effect.unlessCaptureThreshold) && captureThresholdMet(context, effect.unlessCaptureThreshold)) {
        return false;
    }
    if (effect.actorSkillUseModulo) {
        const { skillId, divisor, remainder } = effect.actorSkillUseModulo;
        if ((actor.skillUses?.[skillId] ?? 0) % divisor !== remainder) return false;
    }
    if (Number.isFinite(effect.actorHpAtMost) && actor.hp > effect.actorHpAtMost) return false;
    if (
        Number.isFinite(effect.initialTargetHpAtMost) &&
        (context.initialTargetHp ?? target.hp) > effect.initialTargetHpAtMost
    ) return false;
    if (
        Number.isFinite(effect.initialTargetHpAtLeast) &&
        (context.initialTargetHp ?? target.hp) < effect.initialTargetHpAtLeast
    ) return false;
    return true;
}

function resolveEffect(state, context, effect) {
    const { action, actor, target, skill } = context;
    if (
        hasStatus(actor, (status) => status.silenceNonDamageEffects) &&
        !SILENCE_ALLOWED_EFFECT_KINDS.has(effect.kind)
    ) {
        log(state, 'silenced-effect', `${getSpecies(actor).name}'s non-damaging ${skill.name} effect was silenced.`, {
            player: actor.player,
            actorSlot: actor.slot,
            skillId: skill.id,
        });
        return;
    }
    if (effect.kind === 'cleanse-accuracy-and-evasion') {
        cleanseAccuracyAndEvasion(state, actor, skill);
        return;
    }
    if (effect.kind === 'chance') {
        if (!effectConditionMet(context, target, effect)) return;
        const branch = rollEffectChance(state, actor, skill, effect, target, context)
            ? effect.effects
            : effect.elseEffects;
        (branch ?? []).forEach((nested) => resolveEffect(state, context, nested));
        return;
    }
    if (effect.kind === 'random-other-enemy-damage') {
        const candidates = livingTargets(state, otherPlayer(action.player)).filter(
            (unit) => unit.slot !== target.slot
        );
        if (candidates.length) {
            const picked = candidates[Math.floor(nextRandom(state) * candidates.length)];
            if (!context.blockedTargets?.has(`${picked.player}:${picked.slot}`)) {
                damageUnit(
                    state,
                    actor,
                    picked,
                    skill,
                    effect.amount,
                    effect.damageKind,
                    shouldApplyTypeAdjustment(context, picked)
                );
            }
        }
        return;
    }
    effectTargets(state, context, effect.scope).forEach((recipient) => {
        if (
            effectConditionMet(context, recipient, effect) &&
            rollEffectChance(state, actor, skill, effect, recipient, context)
        ) {
            applyEffectToTarget(state, context, effect, recipient);
        }
    });
}

function triggerEnemyTargetedHooks(state, actor, targets, skill) {
    targets.forEach((target) => {
        target.statuses.filter(statusActive).forEach((status) => {
            const hook = status.onEnemyTargeted;
            if (!hook || actor.player === target.player) return;
            if (hook.harmfulOnly && !skillIsHarmfulToTarget(skill, actor, target)) return;
            if (hook.requireFirstSkillUse && (actor.skillUses?.[skill.id] ?? 0) > 1) return;
            const source = sourceUnitForStatus(state, status);
            if (hook.advanceSourcePerishSong && source?.alive) {
                acceleratePerishSong(state, source, actor);
            }
            if (hook.damageToActor) {
                damageUnit(
                    state,
                    target,
                    actor,
                    { name: status.name, moveType: hook.moveType },
                    hook.damageToActor,
                    hook.damageKind ?? 'piercing'
                );
            }
            if (hook.statusOnActor && actor.alive) {
                addStatus(state, actor, {
                    player: target.player,
                    slot: target.slot,
                    targetPlayer: actor.player,
                }, hook.statusOnActor);
            }
            if (hook.healAllies) {
                livingTargets(state, target.player).forEach((ally) => {
                    healUnit(state, ally, hook.healAllies, status.name);
                });
            }
            if (hook.consumeOnTrigger) status.durationActions = 0;
        });
        target.statuses = target.statuses.filter(statusActive);
    });
}

function resolvePeriodicStatuses(state, player) {
    state.teams[player].forEach((target) => {
        if (!target.alive) return;
        for (const status of [...target.statuses]) {
            if (!statusActive(status)) continue;
            if (status.periodicDamage) {
                const bonus = status.periodicBonusIfStatus && hasStatus(
                    target,
                    (entry) => entry.id === status.periodicBonusIfStatus.statusId
                )
                    ? status.periodicBonusIfStatus.amount
                    : 0;
                const amount = status.periodicDamage + bonus;
                const source = sourceUnitForStatus(state, status);
                if (status.periodicDamageKind && source) {
                    damageUnit(
                        state,
                        source,
                        target,
                        {
                            id: status.sourceSkillId ?? status.id,
                            name: status.name,
                            moveType: status.periodicMoveType ?? null,
                            classes: status.periodicSkillClasses ?? [],
                            ignoreDamageReduction: status.ignoreDamageReduction,
                        },
                        amount,
                        status.periodicDamageKind,
                        false
                    );
                } else {
                    dealFixedStatusDamage(state, source, target, status.name, amount);
                }
            }
            if (status.periodicDrain) {
                const source = findUnit(state, status.sourcePlayer, status.sourceSlot);
                const wasAlive = target.alive;
                const amount = Math.min(status.periodicDrain, target.hp);
                target.hp = clamp(target.hp - amount, 0, unitMaxHp(target));
                target.alive = target.hp > 0;
                recordDamageTaken(state, target, amount);
                if (source?.alive) healUnit(state, source, amount, status.name);
                log(state, 'periodic', `${status.name} stole ${amount} HP from ${getSpecies(target).name}.`);
                if (amount > 0 && source?.alive && status.sourceCounter) {
                    incrementCounter(state, source, status.sourceCounter, 1, status.sourceCounterMaximum);
                }
                if (wasAlive && !target.alive) triggerOwnerDeathHooks(state, target);
                if (amount > 0 && source) triggerSuccessfulEnemyDamageHooks(state, source, target);
            }
            if (status.consumeAfterPeriodic) status.durationActions = 0;
        }
        target.statuses = target.statuses.filter(statusActive);
    });
}

function resolveSourceTurnStartStatuses(state, player) {
    players.forEach((targetPlayer) => {
        state.teams[targetPlayer].forEach((target) => {
            if (!target.alive) return;
            for (const status of [...target.statuses]) {
                if (
                    !statusActive(status) ||
                    (!status.turnStartDamage && !status.turnStartHeal &&
                        !status.turnStartHealPerField && !status.turnStartAdvanceAllEnemyPerish)
                ) continue;
                const triggerPlayer = status.turnStartAnchor === 'target'
                    ? target.player
                    : status.sourcePlayer;
                if (triggerPlayer !== player) continue;
                if (status.skipFirstTurnStartTick && !status.firstTurnStartTickSkipped) {
                    status.firstTurnStartTickSkipped = true;
                    continue;
                }
                if (status.turnStartHeal) {
                    healUnit(state, target, status.turnStartHeal, status.name);
                }
                if (status.turnStartHealPerField) {
                    const count = Math.max(0, Number(status[status.turnStartHealPerField.field]) || 0);
                    const healAmount = count * (Number(status.turnStartHealPerField.amount) || 0);
                    if (healAmount > 0) healUnit(state, target, healAmount, status.name);
                }
                if (status.turnStartAdvanceAllEnemyPerish) {
                    const perishSource = sourceUnitForStatus(state, status) ?? target;
                    livingTargets(state, otherPlayer(target.player)).forEach((enemy) =>
                        acceleratePerishSong(state, perishSource, enemy)
                    );
                }
                const source = sourceUnitForStatus(state, status);
                if (status.turnStartDamage && source && status.turnStartDamageKind) {
                    damageUnit(
                        state,
                        source,
                        target,
                        {
                            id: status.sourceSkillId ?? status.id,
                            name: status.name,
                            moveType: status.turnStartMoveType ?? null,
                            classes: status.turnStartSkillClasses ?? [],
                            ignoreDamageReduction: status.ignoreDamageReduction,
                        },
                        status.turnStartDamage,
                        status.turnStartDamageKind,
                        false
                    );
                } else if (status.turnStartDamage && source) {
                    dealFixedStatusDamage(
                        state,
                        source,
                        target,
                        status.name,
                        status.turnStartDamage
                    );
                }
                if (status.consumeAfterTurnStart) status.durationActions = 0;
            }
            target.statuses = target.statuses.filter(statusActive);
        });
    });
}

function triggerTeamHarmfulSkillTraps(state, actor, skill, target) {
    if (actor.player === target.player) return;
    for (const owner of livingTargets(state, target.player)) {
        for (const status of [...owner.statuses]) {
            if (!statusActive(status) || !status.teamHarmfulSkillTrap) continue;
            const trap = status.teamHarmfulSkillTrap;
            const source = sourceUnitForStatus(state, status) ?? owner;
            if (!source?.alive) continue;
            const overrideStatus = trap.damageOverrideFromOwnerStatus
                ? owner.statuses.find((entry) =>
                    statusActive(entry) &&
                    entry.id === trap.damageOverrideFromOwnerStatus.statusId
                )
                : null;
            const overrideDamage = overrideStatus && trap.damageOverrideFromOwnerStatus?.field
                ? Number(overrideStatus[trap.damageOverrideFromOwnerStatus.field])
                : Number.NaN;
            const amount = Math.max(
                0,
                Number.isFinite(overrideDamage) ? overrideDamage : Number(trap.damageToActor) || 0
            );
            if (amount > 0) {
                if (trap.damageKind === 'fixed-affliction') {
                    dealFixedStatusDamage(state, source, actor, status.name, amount);
                } else {
                    damageUnit(
                        state,
                        source,
                        actor,
                        {
                            id: status.sourceSkillId ?? status.id,
                            name: status.name,
                            moveType: trap.moveType ?? null,
                            classes: trap.skillClasses ?? [],
                        },
                        amount,
                        trap.damageKind ?? 'piercing',
                        false
                    );
                }
            }
            if (!actor.alive) continue;
            if (trap.statusOnActor) {
                addStatus(state, actor, {
                    player: source.player,
                    slot: source.slot,
                    targetPlayer: actor.player,
                }, {
                    ...trap.statusOnActor,
                    sourceSkillId: trap.statusOnActor.sourceSkillId ?? status.sourceSkillId,
                });
            }
            const advance = trap.advanceStatusOnActor;
            if (!advance?.statusId) continue;
            const matching = actor.statuses.find((entry) =>
                statusActive(entry) &&
                entry.id === advance.statusId &&
                (!advance.sourceMustMatch || (
                    entry.sourcePlayer === source.player && entry.sourceSlot === source.slot
                ))
            );
            if (!matching) continue;
            if (advance.onExpireDamageDelta) {
                matching.onExpireDamage = Math.max(
                    0,
                    (Number(matching.onExpireDamage) || 0) + advance.onExpireDamageDelta
                );
            }
            if (advance.durationDelta && Number.isInteger(matching.durationActions)) {
                matching.durationActions += advance.durationDelta;
                if (matching.durationActions <= 0) {
                    triggerStatusExpiration(state, actor, matching);
                    actor.statuses = actor.statuses.filter((entry) => entry !== matching);
                }
            }
        }
    }
}

function triggerHarmfulSkillHooks(state, actor, skill, target) {
    if (!skillIsHarmfulToTarget(skill, actor, target)) return;
    triggerTeamHarmfulSkillTraps(state, actor, skill, target);
    for (const status of [...actor.statuses]) {
        if (!statusActive(status) || !status.onHarmfulSkill) continue;
        const hook = status.onHarmfulSkill;
        if (hook.requireFirstSkillUse && (actor.skillUses?.[skill.id] ?? 0) > 1) continue;
        if (hook.status) {
            addStatus(
                state,
                actor,
                {
                    player: status.sourcePlayer,
                    slot: status.sourceSlot,
                    targetPlayer: actor.player,
                },
                hook.status
            );
        }
        const source = sourceUnitForStatus(state, status);
        if (source?.alive && hook.stealEnergyToSource) {
            stealRandomEnergy(state, actor.player, source.player, source, actor);
        }
        if (source?.alive && hook.sourceCounter) {
            incrementCounter(state, source, hook.sourceCounter, 1, hook.sourceCounterMaximum);
        }
        status.durationActions = 0;
    }
    actor.statuses = actor.statuses.filter(statusActive);
}

function triggerOwnerUseSkillHooks(state, actor, skill, target) {
    for (const status of [...actor.statuses]) {
        if (!statusActive(status)) continue;
        if (status.consumeOnOwnerSkillIds?.includes(skill.id)) status.durationActions = 0;
        if (!statusActive(status) || !status.onUseSkill) continue;
        const hook = status.onUseSkill;
        if (hook.harmfulOnly && !skillIsHarmfulToTarget(skill, actor, target)) continue;
        if (hook.requireFirstSkillUse && (actor.skillUses?.[skill.id] ?? 0) > 1) continue;
        if (hook.damageToOwner) {
            dealFixedStatusDamage(
                state,
                sourceUnitForStatus(state, status),
                actor,
                status.name,
                hook.damageToOwner
            );
        }
        const source = sourceUnitForStatus(state, status);
        const perishAdvanced = hook.advanceSourcePerishSong && source?.alive
            ? acceleratePerishSong(state, source, actor)
            : false;
        if (perishAdvanced && hook.gainRandomEnergyToSource) {
            grantRandomEnergyToSource(state, source, status.name);
        }
        if (source?.alive && hook.healSource) healUnit(state, source, hook.healSource, status.name);
        if (source?.alive && hook.sourceCounter) {
            incrementCounter(
                state,
                source,
                hook.sourceCounter,
                hook.sourceCounterDelta ?? 1,
                hook.sourceCounterMaximum
            );
        }
        (hook.applyStatusesToOwner ?? []).forEach((statusTemplate) => {
            addStatus(
                state,
                actor,
                {
                    player: status.sourcePlayer,
                    slot: status.sourceSlot,
                    targetPlayer: actor.player,
                },
                statusTemplate
            );
        });
        if (hook.incrementOwnNumericField) {
            const field = hook.incrementOwnNumericField;
            status[field] = Math.max(0, Number(status[field]) || 0) +
                Math.max(0, Number(hook.incrementOwnNumericAmount) || 0);
        }
        if (hook.doubleOwnNumericField) {
            const field = hook.doubleOwnNumericField;
            status[field] = Math.max(0, Number(status[field]) || 0) * 2;
        }
        if (hook.consume) status.durationActions = 0;
    }
    actor.statuses = actor.statuses.filter(statusActive);
}

function skillCooldownIncrease(actor, skill) {
    const firstUse = (actor.skillUses?.[skill.id] ?? 0) === 1;
    return actor.statuses.reduce((largest, status) => {
        if (!statusActive(status)) return largest;
        const always = Math.max(0, Number(status.newSkillCooldownIncrease) || 0);
        const onFirstUse = firstUse
            ? Math.max(0, Number(status.newSkillCooldownIncreaseOnFirstUse) || 0)
            : 0;
        return Math.max(largest, always, onFirstUse);
    }, 0);
}

function triggerCounteredDamagingSkill(state, actor, skill) {
    if (skill.cannotBeCountered || skill.classes?.includes('Uncounterable')) return false;
    const status = actor.statuses.find((entry) =>
        statusActive(entry) &&
        entry.counterNextNewDamagingSkill &&
        (actor.skillUses?.[skill.id] ?? 0) === 1
    );
    if (!status) return false;
    // Mirrors production's resolveEffectDamageAmount: the countered skill's damage is evaluated
    // from the attacker's own buffed state (their outgoing bonuses/multipliers), not the raw
    // listed amount, since the skill never actually resolves against the target to pick up any
    // target-side reduction or type effectiveness.
    const baseDamage = skill.effects.reduce((total, effect) => {
        if (!['damage', 'drain', 'fixed-affliction-damage'].includes(effect.kind)) return total;
        const rawAmount = Math.max(0, Number(effect.amount) || 0);
        if (rawAmount <= 0) return total;
        const bonus = outgoingSkillBonus(actor, skill) +
            outgoingGeneralBonus(actor, skill, effect.damageKind) -
            outgoingDebuff(actor);
        return total + Math.max(0, (rawAmount + bonus) * outgoingClassMultiplier(actor, skill));
    }, 0);
    if (baseDamage <= 0) return false;
    const source = sourceUnitForStatus(state, status);
    status.durationActions = 0;
    actor.statuses = actor.statuses.filter(statusActive);
    if (!source?.alive) return false;
    const amount = baseDamage * Math.max(1, Number(status.counterDamageMultiplier) || 1) +
        Math.max(0, Number(status.storedBulkUpBonus) || 0) +
        Math.max(0, Number(status.counterAliveBonus) || 0);
    const dealt = damageUnit(
        state,
        source,
        actor,
        { id: status.sourceSkillId ?? status.id, name: status.name, moveType: null, classes: ['Physical'] },
        amount,
        'piercing',
        false
    );
    log(state, 'countered', `${getSpecies(source).name} countered ${getSpecies(actor).name}'s ${skill.name}.`, {
        player: actor.player,
        actorSlot: actor.slot,
        skillId: skill.id,
        amount: dealt,
    });
    if (dealt > 0 && status.evolveSourceForm && source.alive) {
        evolveUnit(state, source, status.evolveSourceForm);
    }
    return true;
}

function skillFailureStatus(actor) {
    return actor.statuses
        .filter(statusActive)
        .reduce((best, status) =>
            (status.skillFailChance ?? 0) > (best?.skillFailChance ?? 0) ? status : best, null);
}

function skillFails(state, actor, skill) {
    const status = skillFailureStatus(actor);
    if (!status) return false;
    const roll = nextRandom(state) * 100;
    log(state, 'roll', `${skill.name} rolled ${roll.toFixed(2)} against ${status.skillFailChance}% failure.`, {
        roll,
        threshold: status.skillFailChance,
    });
    if (roll >= status.skillFailChance) return false;
    const wasAlive = actor.alive;
    const lost = Math.min(status.skillFailDamage ?? 0, actor.hp);
    actor.hp = clamp(actor.hp - lost, 0, unitMaxHp(actor));
    actor.alive = actor.hp > 0;
    recordDamageTaken(state, actor, lost);
    log(state, 'skill-failed', `${getSpecies(actor).name}'s ${skill.name} failed because of ${status.name}.`, {
        amount: lost,
        player: actor.player,
        actorSlot: actor.slot,
        skillId: skill.id,
    });
    if (wasAlive && !actor.alive) triggerOwnerDeathHooks(state, actor);
    return true;
}

function triggerTurnEndHooks(state, player) {
    state.teams[player].forEach((unit) => {
        if (!unit.alive) return;
        unit.statuses.filter(statusActive).forEach((status) => {
            if (!status.turnEndShieldAllies) return;
            livingTargets(state, player).forEach((ally) => {
                grantShield(ally, status.turnEndShieldAllies);
                log(state, 'shield', `${getSpecies(ally).name} gained ${status.turnEndShieldAllies} destructible defense from ${status.name}.`, {
                    amount: status.turnEndShieldAllies,
                    targetPlayer: ally.player,
                    targetSlot: ally.slot,
                });
            });
        });
    });
    players.forEach((targetPlayer) => {
        state.teams[targetPlayer].forEach((target) => {
            if (!target.alive) return;
            target.statuses.filter(statusActive).forEach((status) => {
                const triggerPlayer = status.turnEndAnchor === 'target'
                    ? target.player
                    : status.sourcePlayer;
                if (triggerPlayer !== player || (!status.turnEndDamage && !status.turnEndHeal)) return;
                if (status.endIfSourceDies && !sourceUnitForStatus(state, status)?.alive) {
                    status.durationActions = 0;
                    return;
                }
                if (status.skipNextTurnEndDamage) {
                    status.skipNextTurnEndDamage = false;
                    return;
                }
                if (status.skipTurnEndOnAppliedTurn && status.appliedTurn === state.turnNumber) return;
                if (status.turnEndHeal) healUnit(state, target, status.turnEndHeal, status.name);
                const turnEndDamage = status.doubleTurnEndDamageIfTargetStunned && hasAnyStunLikeStatus(target)
                    ? (Number(status.turnEndDamage) || 0) * 2
                    : status.turnEndDamage;
                if (status.turnEndDamageKind) {
                    const source = sourceUnitForStatus(state, status);
                    if (source) {
                        damageUnit(
                            state,
                            source,
                            target,
                            {
                                id: status.sourceSkillId ?? status.id,
                                name: status.name,
                                moveType: status.turnEndMoveType ?? null,
                                classes: status.turnEndSkillClasses ?? [],
                                ignoreDamageReduction: status.ignoreDamageReduction,
                            },
                            turnEndDamage,
                            status.turnEndDamageKind,
                            false
                        );
                    }
                } else if (status.turnEndDamage) {
                    dealFixedStatusDamage(
                        state,
                        sourceUnitForStatus(state, status),
                        target,
                        status.name,
                        turnEndDamage
                    );
                }
            });
        });
    });
}

function decrementCooldowns(state, player) {
    state.teams[player].forEach((unit) => {
        if (hasStatus(unit, (status) => status.paralyzeCooldowns)) return;
        Object.keys(unit.cooldowns).forEach((skillId) => {
            unit.cooldowns[skillId] = Math.max(0, unit.cooldowns[skillId] - 1);
            if (unit.cooldowns[skillId] === 0) delete unit.cooldowns[skillId];
        });
    });
}

function triggerStatusExpiration(state, target, status) {
    if (status.instantKillOnExpire && target.alive) {
        const source = sourceUnitForStatus(state, status);
        if (!source?.alive) return;
        const lost = target.hp;
        target.hp = 0;
        target.alive = false;
        log(state, 'execute', `${getForm(source).name}'s Perish Song defeated ${getSpecies(target).name}.`, {
            amount: lost,
            player: source.player,
            actorSlot: source.slot,
            targetPlayer: target.player,
            targetSlot: target.slot,
            skillId: status.sourceSkillId,
        });
        triggerOwnerDeathHooks(state, target);
        triggerOwnerKillHooks(state, source);
        if (status.evolveSourceForm && source.alive) evolveUnit(state, source, status.evolveSourceForm);
        return;
    }
    if (status.removeTrackedShieldOnExpire && status.trackedShieldPoints > 0) {
        const removed = Math.min(target.shield, status.trackedShieldPoints);
        target.shield = Math.max(0, target.shield - removed);
        log(state, 'shield-expired', `${status.name} removed ${removed} destructible defense from ${getSpecies(target).name}.`, {
            amount: removed,
            targetPlayer: target.player,
            targetSlot: target.slot,
        });
    }
    if (status.removeTrackedBarrierOnExpire && status.trackedBarrierPoints > 0) {
        const removed = Math.min(target.barrier ?? 0, status.trackedBarrierPoints);
        target.barrier = Math.max(0, (target.barrier ?? 0) - removed);
        log(state, 'barrier-expired', `${status.name} removed ${removed} barrier from ${getSpecies(target).name}.`, {
            amount: removed,
            targetPlayer: target.player,
            targetSlot: target.slot,
        });
    }
    if (!target.alive) return;
    const source = sourceUnitForStatus(state, status);
    const amount = Math.max(0, Number(status.onExpireDamage) || 0);
    if (amount > 0 && source) {
        const dealt = damageUnit(
            state,
            source,
            target,
            {
                id: status.sourceSkillId ?? status.id,
                name: status.name,
                moveType: status.onExpireMoveType ?? null,
                classes: status.onExpireSkillClasses ?? [],
                ignoreDamageReduction: status.ignoreDamageReduction,
            },
            amount,
            status.onExpireDamageKind ?? 'fixed-piercing',
            false
        );
        if (dealt > 0 && status.onExpireEvolveSourceForm && source.alive) {
            evolveUnit(state, source, status.onExpireEvolveSourceForm);
        }
    }
    if (target.alive && source && status.onExpireStatus) {
        addStatus(state, target, {
            player: source.player,
            slot: source.slot,
            targetPlayer: target.player,
        }, {
            ...status.onExpireStatus,
            sourceSkillId: status.onExpireStatus.sourceSkillId ?? status.sourceSkillId,
        });
    }
    if (status.onExpireReplaySkillId && target.alive) {
        replayDelayedSkill(state, target, status);
    }
}

function replayDelayedSkill(state, actor, status) {
    const replayTarget = findUnit(state, status.onExpireReplayTargetPlayer, status.onExpireReplayTargetSlot);
    const replaySkill = getSkill(actor, status.onExpireReplaySkillId);
    if (!replayTarget || !replaySkill) return;
    log(state, 'skill', `${getSpecies(actor).name}'s delayed ${replaySkill.name} activates on ${getSpecies(replayTarget).name}.`, {
        player: actor.player,
        actorSlot: actor.slot,
        targetPlayer: replayTarget.player,
        targetSlot: replayTarget.slot,
        skillId: replaySkill.id,
    });
    const affectsAllEnemies = replaySkill.effects.some(
        (effect) => effect.scope === 'all-enemy' ||
            effect.scope === 'other-enemies' ||
            effect.scope === 'all-other-enemies'
    );
    const affectedTargets = replaySkill.target === 'all-enemy' || affectsAllEnemies
        ? livingTargets(state, otherPlayer(actor.player))
        : [replayTarget];
    const replayContext = {
        action: {
            player: actor.player,
            actorSlot: actor.slot,
            skillId: replaySkill.id,
            targetPlayer: replayTarget.player,
            targetSlot: replayTarget.slot,
        },
        actor,
        target: replayTarget,
        skill: replaySkill,
        blockedTargets: new Set(),
        typeAdjustedTargets: new Set(),
        initialTargetHp: replayTarget.hp,
        initialTargetStatuses: clone(replayTarget.statuses),
        initialActorStatuses: clone(actor.statuses),
        previousSkillId: actor.lastSkillId ?? null,
    };
    affectedTargets.forEach((recipient) => prepareTargetForSkill(state, replayContext, recipient));
    replaySkill.effects.forEach((effect) => resolveEffect(state, replayContext, effect));
}

function ageStatuses(state, actingPlayer) {
    players.forEach((player) => {
        state.teams[player].forEach((unit) => {
            unit.statuses.forEach((status) => {
                const durationPlayer = status.durationAnchor === 'source'
                    ? status.sourcePlayer
                    : status.durationAnchor === 'target'
                    ? unit.player
                    : actingPlayer;
                if (
                    Number.isInteger(status.durationActions) &&
                    status.appliedTurn < state.turnNumber &&
                    durationPlayer === actingPlayer
                ) {
                    status.durationActions -= 1;
                    if (status.durationActions <= 0) {
                        triggerStatusExpiration(state, unit, status);
                    }
                }
            });
            unit.statuses = unit.statuses.filter(statusActive);
        });
    });
}

function grantSandboxTurnEnergy(state, player) {
    const sequence = [
        Energy.TAIJUTSU,
        Energy.NINJUTSU,
        Energy.BLOODLINE,
        Energy.GENJUTSU,
    ];
    const gained = sequence[(state.turnNumber + (player === 'B' ? 1 : 0)) % sequence.length];
    state.energy[player][gained] = (state.energy[player][gained] ?? 0) + 1;
    log(state, 'energy', `${player} gained 1 ${gained} energy.`);
}

function grantRandomEnergy(state, player, count, reason) {
    const sequence = [
        Energy.TAIJUTSU,
        Energy.NINJUTSU,
        Energy.BLOODLINE,
        Energy.GENJUTSU,
    ];
    const gained = [];
    for (let index = 0; index < Math.max(0, count); index += 1) {
        const type = sequence[Math.floor(nextRandom(state) * sequence.length)];
        state.energy[player][type] = (state.energy[player][type] ?? 0) + 1;
        gained.push(type);
    }
    if (gained.length > 0) {
        log(state, 'energy', `${player} gained ${gained.length} random energy from ${reason}.`, {
            player,
            gained,
            reason,
        });
    }
    return gained;
}

function resolveActiveCyclingClass(state, source) {
    const config = source?.cyclingClassAura;
    if (!config || !Array.isArray(config.classes) || config.classes.length === 0) return null;
    const classIndex = Math.max(0, state.turnNumber - 2) % config.classes.length;
    return { config, classIndex, activeClass: config.classes[classIndex] };
}

function processCyclingClassAuras(state) {
    players.forEach((ownerPlayer) => {
        state.teams[ownerPlayer].forEach((owner) => {
            if (!owner.alive) return;
            const source = owner.statuses.find((status) => statusActive(status) && status.cyclingClassAura);
            const resolved = resolveActiveCyclingClass(state, source);
            if (!resolved) return;
            const { config, activeClass } = resolved;
            livingTargets(state, otherPlayer(ownerPlayer)).forEach((enemy) => {
                addStatus(state, enemy, {
                    player: ownerPlayer,
                    slot: owner.slot,
                    targetPlayer: enemy.player,
                }, {
                    id: `${config.statusIdPrefix}-${ownerPlayer}-${owner.slot}`,
                    name: config.name ?? 'Sweet Scent',
                    hidden: false, harmful: true, replaceExisting: true,
                    durationActions: config.refreshDurationActions ?? 2,
                    damageBonusBySkillClass: { [activeClass]: -(Number(config.amount) || 0) },
                    sourceSkillId: source.sourceSkillId,
                });
            });
        });
    });
}

function triggerTargetedByEnemyHooks(state, actor, skill, target) {
    if (actor.player === target.player) return;
    for (const status of [...target.statuses]) {
        if (!statusActive(status) || !status.onTargetedByEnemySkill) continue;
        const hook = status.onTargetedByEnemySkill;
        if (hook.requireFirstUse && (actor.skillUses?.[skill.id] ?? 0) !== 1) continue;
        if (hook.harmfulOnly && !skillIsHarmfulToTarget(skill, actor, target)) continue;
        if (
            Array.isArray(hook.excludeSkillClasses) &&
            hook.excludeSkillClasses.some((entry) => skill.classes?.includes(entry))
        ) continue;
        if (hook.oncePerSource) {
            const sourceKey = `${actor.player}:${actor.slot}`;
            if (!Array.isArray(status.triggeredSources)) status.triggeredSources = [];
            if (status.triggeredSources.includes(sourceKey)) continue;
            status.triggeredSources.push(sourceKey);
        }
        if (hook.decrementOwnField) {
            const current = Math.max(0, Number(status[hook.decrementOwnField]) || 0);
            if (current > 0) status[hook.decrementOwnField] = current - 1;
        }
        if (hook.permanentNonAfflictionDebuffAmount) {
            addStatus(state, actor, {
                player: target.player,
                slot: target.slot,
                targetPlayer: actor.player,
            }, {
                id: hook.debuffStatusId ?? `${status.id}-debuff`,
                name: hook.debuffName ?? status.name,
                hidden: false, harmful: true, durationActions: null,
                outgoingDamageDebuff: hook.permanentNonAfflictionDebuffAmount,
                mergeNumericFields: ['outgoingDamageDebuff'],
                sourceSkillId: status.sourceSkillId,
            });
        }
        const source = sourceUnitForStatus(state, status);
        if (!source?.alive) continue;
        if (hook.permanentClassDebuffAmount) {
            const sourceCycling = source.statuses.find((entry) => statusActive(entry) && entry.cyclingClassAura);
            const resolved = resolveActiveCyclingClass(state, sourceCycling);
            if (resolved) {
                addStatus(state, actor, {
                    player: source.player,
                    slot: source.slot,
                    targetPlayer: actor.player,
                }, {
                    id: hook.debuffStatusId ?? `${status.id}-debuff`,
                    name: hook.debuffName ?? status.name,
                    hidden: false, harmful: true, durationActions: null,
                    damageBonusBySkillClass: { [resolved.activeClass]: -hook.permanentClassDebuffAmount },
                    mergeMapFields: ['damageBonusBySkillClass'],
                    sourceSkillId: status.sourceSkillId,
                });
            }
        }
        if (hook.incrementSourceStacksField) {
            const tracker = source.statuses.find((entry) => statusActive(entry) && entry.cyclingClassAura);
            if (tracker) {
                tracker[hook.incrementSourceStacksField] =
                    (Number(tracker[hook.incrementSourceStacksField]) || 0) + 1;
            }
        }
    }
}

function processTurnStartEffects(state, player) {
    livingTargets(state, player).forEach((unit) => {
        unit.statuses.filter(statusActive).forEach((status) => {
            Object.entries(status.increaseSpecificCostReductionEachTurn ?? {}).forEach(
                ([cost, amount]) => {
                    if (!status.specificCostReductions) status.specificCostReductions = {};
                    status.specificCostReductions[cost] = Math.min(
                        Number.isFinite(status.maximumSpecificCostReduction)
                            ? status.maximumSpecificCostReduction
                            : Number.POSITIVE_INFINITY,
                        Math.max(0, Number(status.specificCostReductions[cost]) || 0) +
                            Math.max(0, Number(amount) || 0)
                    );
                }
            );
            if (status.turnStartActorCounter) {
                incrementCounter(
                    state,
                    unit,
                    status.turnStartActorCounter.counter,
                    status.turnStartActorCounter.delta ?? 1,
                    status.turnStartActorCounter.maximum
                );
            }
            const replacement = status.turnStartRandomSkillReplacement;
            if (!replacement || !Array.isArray(replacement.options) || replacement.options.length === 0) {
                return;
            }
            const totalWeight = replacement.options.reduce(
                (total, option) => total + Math.max(0, Number(option.weight) || 0),
                0
            );
            if (totalWeight <= 0) return;
            let cursor = nextRandom(state) * totalWeight;
            let selected = replacement.options[replacement.options.length - 1];
            for (const option of replacement.options) {
                cursor -= Math.max(0, Number(option.weight) || 0);
                if (cursor < 0) {
                    selected = option;
                    break;
                }
            }
            unit.statuses = unit.statuses.filter((entry) => entry.id !== replacement.statusId);
            addStatus(state, unit, {
                player: unit.player,
                slot: unit.slot,
                targetPlayer: unit.player,
            }, {
                id: replacement.statusId,
                name: `${selected.name} Ready`,
                hidden: false,
                harmful: false,
                durationActions: 1,
                skillReplacements: { [replacement.fromSkillId]: selected.skillId },
            });
            log(state, 'turn-start', `${getForm(unit).name} prepared ${selected.name}.`, {
                player: unit.player,
                slot: unit.slot,
                skillId: selected.skillId,
            });
        });
    });
}

function updateWinner(state) {
    const aliveA = livingTargets(state, 'A').length;
    const aliveB = livingTargets(state, 'B').length;
    if (aliveA === 0 || aliveB === 0) {
        state.winner = aliveA === aliveB ? 'draw' : aliveA > 0 ? 'A' : 'B';
        log(state, 'match-end', state.winner === 'draw' ? 'The match ended in a draw.' : `${state.winner} won.`);
    }
}

function redirectedActionTarget(state, actor, selectedTarget, skill) {
    let target = selectedTarget;
    let reflected = false;
    const sourceTeamBlind = actor.statuses.find(
        (status) => statusActive(status) && status.harmfulBlindToSourceTeam
    );
    const globallyBlind = hasStatus(actor, (status) => status.fullBlind);
    const harmfulToSelectedTarget = skillIsHarmfulToTarget(skill, actor, selectedTarget);
    if (harmfulToSelectedTarget && (sourceTeamBlind || globallyBlind)) {
        const candidates = sourceTeamBlind
            ? livingTargets(state, sourceTeamBlind.sourcePlayer)
            : players.flatMap((player) => livingTargets(state, player));
        target = candidates[Math.floor(nextRandom(state) * candidates.length)] ?? selectedTarget;
        log(state, 'blind-target', `${getSpecies(actor).name}'s ${skill.name} was redirected to ${getSpecies(target).name}.`, {
            targetPlayer: target.player,
            targetSlot: target.slot,
            skillId: skill.id,
        });
    }
    const reflectStatus = actor.statuses.find((status) =>
        statusActive(status) &&
        status.reflectNextOwnerUseSkill &&
        (!status.reflectOnlyHarmfulSkills || harmfulToSelectedTarget)
    );
    if (reflectStatus && !skill.cannotBeReflected && !skill.classes?.includes('Unreflectable')) {
        reflectStatus.durationActions = 0;
        actor.statuses = actor.statuses.filter(statusActive);
        target = actor;
        reflected = true;
        log(state, 'reflected', `${getSpecies(actor).name}'s ${skill.name} was reflected back onto its user.`, {
            player: actor.player,
            actorSlot: actor.slot,
            skillId: skill.id,
        });
    }
    return { target, reflected };
}

function resolveActionWithoutAdvancingTurn(inputState, action) {
    const error = validateAction(inputState, action);
    if (error) return { ok: false, error, state: inputState };
    const state = clone(inputState);
    if (!Array.isArray(state.actions)) state.actions = [];
    const actor = findUnit(state, action.player, action.actorSlot);
    const selectedTarget = findUnit(state, action.targetPlayer, action.targetSlot);
    const skill = getSkill(actor, action.skillId);
    const previousSkillId = actor.lastSkillId ?? null;
    state.energy[action.player] = buildSpendPlan(
        state.energy[action.player],
        effectiveSkillCosts(state, actor, skill),
        action.randomEnergy
    );
    state.actions.push(clone(action));
    if (!actor.skillUses) actor.skillUses = {};
    actor.skillUses[skill.id] = (actor.skillUses[skill.id] ?? 0) + 1;
    const redirected = redirectedActionTarget(state, actor, selectedTarget, skill);
    const target = redirected.target;
    log(state, 'skill', `${getSpecies(actor).name} used ${skill.name} on ${getSpecies(target).name}.`, {
        player: action.player,
        actorSlot: actor.slot,
        targetPlayer: target.player,
        targetSlot: target.slot,
        skillId: skill.id,
    });
    triggerOwnerUseSkillHooks(state, actor, skill, target);
    triggerTargetedByEnemyHooks(state, actor, skill, target);
    triggerHarmfulSkillHooks(state, actor, skill, target);
    const countered = triggerCounteredDamagingSkill(state, actor, skill);
    if (!actor.alive || countered || skillFails(state, actor, skill)) {
        actor.lastSkillId = skill.id;
        const cooldownIncrease = skillCooldownIncrease(actor, skill);
        actor.cooldowns[cooldownSkillIdAfterAction(actor, skill.id)] =
            skill.cooldown + 1 + cooldownIncrease;
        updateWinner(state);
        return { ok: true, state };
    }
    const delayMark = actor.statuses.find((status) =>
        statusActive(status) && status.delayNextHarmfulSkillActivation
    );
    if (delayMark && skillIsHarmfulToTarget(skill, actor, target)) {
        delayMark.durationActions = 0;
        actor.statuses = actor.statuses.filter(statusActive);
        log(state, 'delayed', `${getSpecies(actor).name}'s ${skill.name} was delayed by ${delayMark.name} and will activate in 1 turn.`, {
            player: actor.player,
            actorSlot: actor.slot,
            skillId: skill.id,
        });
        addStatus(state, actor, {
            player: actor.player,
            slot: actor.slot,
            targetPlayer: actor.player,
        }, {
            id: `${skill.id}-delayed-activation`,
            name: skill.name,
            hidden: true,
            harmful: false,
            durationActions: 1,
            durationAnchor: 'source',
            onExpireReplaySkillId: skill.id,
            onExpireReplayTargetPlayer: target.player,
            onExpireReplayTargetSlot: target.slot,
        });
        actor.lastSkillId = skill.id;
        const cooldownIncrease = skillCooldownIncrease(actor, skill);
        actor.cooldowns[cooldownSkillIdAfterAction(actor, skill.id)] =
            skill.cooldown + 1 + cooldownIncrease;
        updateWinner(state);
        return { ok: true, state };
    }
    const affectsAllEnemies = skill.effects.some(
        (effect) => effect.scope === 'all-enemy' ||
            effect.scope === 'other-enemies' ||
            effect.scope === 'all-other-enemies'
    );
    const selectedTargetIsHarmful = skillIsHarmfulToTarget(skill, actor, target);
    const affectedTargets = selectedTargetIsHarmful
        ? redirected.reflected
            ? [actor]
            : skill.target === 'all-enemy' || affectsAllEnemies
            ? livingTargets(state, otherPlayer(action.player))
            : skill.target === 'random-enemy'
            ? []
            : [target]
        : [];
    const blockedTargets = new Set();
    const effectContext = {
        action,
        actor,
        target,
        skill,
        blockedTargets,
        typeAdjustedTargets: new Set(),
        initialTargetHp: target.hp,
        initialTargetStatuses: clone(target.statuses),
        initialActorStatuses: clone(actor.statuses),
        previousSkillId,
    };
    affectedTargets.forEach((recipient) => prepareTargetForSkill(state, effectContext, recipient));
    skill.effects.forEach((effect) => resolveEffect(state, effectContext, effect));
    actor.lastSkillId = skill.id;
    const cooldownIncrease = skillCooldownIncrease(actor, skill);
    actor.cooldowns[cooldownSkillIdAfterAction(actor, skill.id)] =
        skill.cooldown + 1 + cooldownIncrease;
    updateWinner(state);
    return { ok: true, state };
}

function finishTeamTurn(state, actingPlayer, actingSlots) {
    state.teams[actingPlayer].forEach((unit) => {
        if (unit.alive && unit.speciesId === 'bulbasaur' && !actingSlots.has(unit.slot)) {
            incrementCounter(state, unit, 'sun', 1, 5);
        }
    });
    triggerTurnEndHooks(state, actingPlayer);
    updateWinner(state);
    if (!state.winner) {
        if (state.economyMode === 'arena') {
            grantRandomEnergy(
                state,
                actingPlayer,
                livingTargets(state, actingPlayer).length,
                'living Pokemon at turn end'
            );
        }
        ageStatuses(state, actingPlayer);
        state.turnNumber += 1;
        advanceWeather(state);
        state.currentPlayer = otherPlayer(actingPlayer);
        decrementCooldowns(state, state.currentPlayer);
        resolveSourceTurnStartStatuses(state, state.currentPlayer);
        updateWinner(state);
        if (!state.winner) {
            resolvePeriodicStatuses(state, state.currentPlayer);
            updateWinner(state);
        }
        if (!state.winner) {
            processTurnStartEffects(state, state.currentPlayer);
            processCyclingClassAuras(state);
            if (state.economyMode === 'arena') {
                if (!state.energyStartGranted?.[state.currentPlayer]) {
                    grantRandomEnergy(
                        state,
                        state.currentPlayer,
                        livingTargets(state, state.currentPlayer).length,
                        'the first turn as second player'
                    );
                    state.energyStartGranted[state.currentPlayer] = true;
                }
            } else {
                grantSandboxTurnEnergy(state, state.currentPlayer);
            }
        }
    }
    return state;
}

export function resolveQueuedTurn(inputState, queuedActions = []) {
    if (inputState.winner) {
        return { ok: false, error: 'The match is already over.', state: inputState };
    }
    const actions = Array.isArray(queuedActions) ? queuedActions.map(clone) : [];
    const planned = buildQueuedPlanningState(inputState, actions);
    if (!planned.ok) return { ok: false, error: planned.error, state: inputState };
    const actingPlayer = inputState.currentPlayer;
    let state = clone(inputState);
    if (!Array.isArray(state.turns)) state.turns = [];
    const actingSlots = new Set(actions.map((action) => action.actorSlot));
    for (const action of actions) {
        if (state.winner) break;
        const result = resolveActionWithoutAdvancingTurn(state, action);
        if (!result.ok) {
            log(state, 'skipped-action', `${action.skillId} was skipped: ${result.error}`, {
                player: action.player,
                actorSlot: action.actorSlot,
                skillId: action.skillId,
            });
            continue;
        }
        state = result.state;
    }
    state.turns.push(actions);
    finishTeamTurn(state, actingPlayer, actingSlots);
    return { ok: true, state };
}

export function applyAction(inputState, action) {
    const result = resolveActionWithoutAdvancingTurn(inputState, action);
    if (!result.ok) return result;
    const state = result.state;
    if (!Array.isArray(state.turns)) state.turns = [];
    state.turns.push([clone(action)]);
    finishTeamTurn(state, action.player, new Set([action.actorSlot]));
    return { ok: true, state };
}

export function replay({ seed, teams = DEFAULT_TEAMS, startingPlayer = 'A', economyMode = 'sandbox', turns, actions = [] }) {
    let state = createGame({ seed, teams, startingPlayer, economyMode });
    if (Array.isArray(turns)) {
        for (let index = 0; index < turns.length; index += 1) {
            const result = resolveQueuedTurn(state, turns[index]);
            if (!result.ok) {
                return { ok: false, error: `Turn ${index + 1}: ${result.error}`, state };
            }
            state = result.state;
        }
        return { ok: true, state };
    }
    for (let index = 0; index < actions.length; index += 1) {
        const result = applyAction(state, actions[index]);
        if (!result.ok) {
            return { ok: false, error: `Action ${index + 1}: ${result.error}`, state };
        }
        state = result.state;
    }
    return { ok: true, state };
}

function censorUnit(unit, viewer) {
    const ownUnit = unit.player === viewer;
    return {
        slot: unit.slot,
        speciesId: unit.speciesId,
        form: unit.form,
        effectiveSpeciesId: unit.effectiveSpeciesId ?? null,
        effectiveForm: unit.effectiveForm ?? null,
        banished: Boolean(unit.banished),
        hp: unit.hp,
        maxHp: unitMaxHp(unit),
        shield: unit.shield,
        shieldCapacity: unit.shieldCapacity ?? unit.shield,
        barrier: unit.barrier ?? 0,
        barrierCapacity: unit.barrierCapacity ?? unit.barrier ?? 0,
        alive: unit.alive,
        counters: clone(unit.counters),
        skillUses: ownUnit ? clone(unit.skillUses ?? {}) : {},
        cooldowns: ownUnit ? clone(unit.cooldowns) : {},
        statuses: unit.statuses
            .filter((status) => ownUnit || !status.hidden)
            .map(({ sourcePlayer, sourceSlot, appliedTurn, ...status }) => status),
    };
}

export function viewerState(state, viewer) {
    if (!players.includes(viewer)) throw new Error('Viewer must be A or B.');
    return {
        protocolVersion: state.protocolVersion,
        turnNumber: state.turnNumber,
        currentPlayer: state.currentPlayer,
        winner: state.winner,
        weather: state.weather ? {
            key: state.weather.key,
            name: state.weather.name,
            description: state.weather.description,
            sourcePlayer: state.weather.sourcePlayer,
            sourceSlot: state.weather.sourceSlot,
            roundsRemaining: state.weather.roundsRemaining,
            totalRounds: state.weather.totalRounds,
        } : null,
        viewer,
        teams: Object.fromEntries(
            players.map((player) => [
                player,
                state.teams[player].map((unit) => censorUnit({ ...unit, player }, viewer)),
            ])
        ),
        energy: {
            [viewer]: clone(state.energy[viewer]),
            [otherPlayer(viewer)]: {
                total: Object.values(state.energy[otherPlayer(viewer)]).reduce(
                    (sum, value) => sum + value,
                    0
                ),
            },
        },
        legalActions: legalActions(state, viewer),
        recentEvents: state.events
            .filter((event) => !event.hidden || event.ownerPlayer === viewer)
            .slice(-12)
            .map(({ hidden, ownerPlayer, ...event }) => clone(event)),
    };
}

export function exportReplay(state) {
    return {
        protocolVersion: state.protocolVersion,
        seed: state.initialSeed,
        teams: {
            A: state.teams.A.map((unit) => unit.speciesId),
            B: state.teams.B.map((unit) => unit.speciesId),
        },
        startingPlayer: state.startingPlayer,
        economyMode: state.economyMode ?? 'sandbox',
        turns: clone(state.turns ?? []),
        actions: clone(state.actions),
    };
}
