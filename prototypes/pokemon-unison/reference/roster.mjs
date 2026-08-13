import { skillArt } from './skill-art.mjs';
import { productionSkillDescription } from './production-skill-descriptions-current.mjs';

export const Energy = Object.freeze({
    TAIJUTSU: 'taijutsu',
    NINJUTSU: 'ninjutsu',
    BLOODLINE: 'bloodline',
    GENJUTSU: 'genjutsu',
    RANDOM: 'random',
});

export const Type = Object.freeze({
    BUG: 'Bug',
    DARK: 'Dark',
    DRAGON: 'Dragon',
    ELECTRIC: 'Electric',
    FAIRY: 'Fairy',
    FIGHTING: 'Fighting',
    FIRE: 'Fire',
    FLYING: 'Flying',
    GHOST: 'Ghost',
    GRASS: 'Grass',
    GROUND: 'Ground',
    ICE: 'Ice',
    NORMAL: 'Normal',
    POISON: 'Poison',
    PSYCHIC: 'Psychic',
    ROCK: 'Rock',
    STEEL: 'Steel',
    WATER: 'Water',
});

const skill = (entry) => ({
    harmful: true,
    classes: ['Physical'],
    ...entry,
    description: entry.forceDescription ?? productionSkillDescription(entry.id) ?? entry.description,
    image: entry.image ?? skillArt(entry.id),
});
const rageBonus = { counter: 'rage', multiplier: 5 };
const sunCritical = { counter: 'sun', multiplier: 10 };

const burn = () => ({
    id: 'charmander-burn',
    name: 'Burn',
    hidden: false,
    harmful: true,
    affliction: true,
    durationActions: null,
    periodicDamage: 5,
    outgoingDamageDebuff: 5,
});

const guardBreak = (durationActions) => ({
    id: 'squirtle-guard-break',
    name: 'Guard Break',
    hidden: false,
    harmful: true,
    durationActions,
    durationAnchor: 'target',
    guardBroken: true,
});

const charmanderSkills = [
    skill({
        id: 'charmander-ember',
        name: 'Ember',
        description: 'Deals 20 affliction damage with a 30% chance to Burn permanently.',
        target: 'single-enemy',
        energy: [Energy.BLOODLINE],
        cooldown: 0,
        moveType: Type.FIRE,
        classes: ['Fire', 'Special', 'Instant', 'Affliction'],
        ignoreDamageReduction: true,
        effects: [
            { kind: 'damage', amount: 20, damageKind: 'affliction', bonusPerCounter: rageBonus },
            {
                kind: 'chance',
                percent: 30,
                effects: [
                    { kind: 'status', status: burn() },
                    { kind: 'increment-actor-counter', counter: 'evolution', maximum: 2 },
                ],
            },
        ],
    }),
    skill({
        id: 'charmander-scratch',
        name: 'Scratch',
        description: 'Deals 20 damage with a 30% chance to critically strike for 10 piercing damage.',
        target: 'single-enemy',
        energy: [Energy.TAIJUTSU],
        cooldown: 1,
        moveType: Type.NORMAL,
        classes: ['Normal', 'Physical', 'Instant'],
        effects: [
            { kind: 'damage', amount: 20, damageKind: 'normal', bonusPerCounter: rageBonus },
            {
                kind: 'chance',
                percent: 30,
                effects: [
                    { kind: 'damage', amount: 10, damageKind: 'piercing' },
                    { kind: 'increment-actor-counter', counter: 'evolution', maximum: 2 },
                ],
            },
        ],
    }),
    skill({
        id: 'charmander-flamethrower',
        name: "Charmander's Flamethrower",
        description: 'Deals 20 affliction damage to all enemies; each has a 30% chance to Burn.',
        target: 'all-enemy',
        energy: [Energy.BLOODLINE, Energy.RANDOM],
        cooldown: 2,
        moveType: Type.FIRE,
        classes: ['Fire', 'Special', 'Instant', 'Affliction'],
        ignoreDamageReduction: true,
        effects: [
            { kind: 'damage', scope: 'all-enemy', amount: 20, damageKind: 'affliction', bonusPerCounter: rageBonus },
            {
                kind: 'status',
                scope: 'all-enemy',
                chance: 30,
                status: burn(),
                actorCounter: { counter: 'evolution', maximum: 2 },
            },
        ],
    }),
    skill({
        id: 'charmander-rage',
        name: "Charmander's Rage",
        description: 'For 4 turns, gains 25% damage reduction and up to two permanent Rage stacks.',
        target: 'self',
        energy: [Energy.BLOODLINE],
        cooldown: 3,
        moveType: Type.NORMAL,
        harmful: false,
        classes: ['Normal', 'Physical', 'Instant', 'Invisible'],
        effects: [{
            kind: 'status',
            status: {
                id: 'charmander-rage-active',
                name: 'Rage',
                hidden: true,
                harmful: false,
                durationActions: 4,
                durationAnchor: 'source',
                damageReductionPercent: 25,
                rageCounterMax: 2,
            },
        }],
    }),
    skill({
        id: 'charmander-fire-punch',
        name: 'Fire Punch',
        description: 'Deals 15 physical and 30 affliction damage with a 30% chance to Burn.',
        target: 'single-enemy',
        energy: [Energy.BLOODLINE, Energy.BLOODLINE],
        cooldown: 0,
        moveType: Type.FIRE,
        classes: ['Fire', 'Physical', 'Instant', 'Affliction'],
        effects: [
            { kind: 'damage', amount: 15, damageKind: 'normal', bonusPerCounter: rageBonus },
            { kind: 'damage', amount: 30, damageKind: 'affliction', ignoreDamageReduction: true },
            { kind: 'status', chance: 30, status: burn() },
        ],
    }),
    skill({
        id: 'charmander-dragon-claw',
        name: 'Dragon Claw',
        description: 'Deals 30 damage with a 30% chance to critically strike for 10 piercing damage.',
        target: 'single-enemy',
        energy: [Energy.TAIJUTSU, Energy.RANDOM],
        cooldown: 1,
        moveType: Type.DRAGON,
        classes: ['Dragon', 'Physical', 'Instant'],
        effects: [
            { kind: 'damage', amount: 30, damageKind: 'normal', bonusPerCounter: rageBonus },
            { kind: 'damage', amount: 10, damageKind: 'piercing', chance: 30 },
        ],
    }),
    skill({
        id: 'charmander-charmeleon-flamethrower',
        name: "Charmeleon's Flamethrower",
        description: 'Deals 30 affliction damage to all enemies; each has a 30% chance to Burn.',
        target: 'all-enemy',
        energy: [Energy.BLOODLINE, Energy.RANDOM, Energy.RANDOM],
        cooldown: 2,
        moveType: Type.FIRE,
        classes: ['Fire', 'Special', 'Instant', 'Affliction'],
        ignoreDamageReduction: true,
        effects: [
            { kind: 'damage', scope: 'all-enemy', amount: 30, damageKind: 'affliction', bonusPerCounter: rageBonus },
            { kind: 'status', scope: 'all-enemy', chance: 30, status: burn() },
        ],
    }),
    skill({
        id: 'charmander-charmeleon-rage',
        name: "Charmeleon's Rage",
        description: 'For 4 turns, gains 50% damage reduction and up to four permanent Rage stacks.',
        target: 'self',
        energy: [Energy.BLOODLINE],
        cooldown: 3,
        moveType: Type.NORMAL,
        harmful: false,
        classes: ['Normal', 'Physical', 'Instant', 'Invisible'],
        effects: [{
            kind: 'status',
            status: {
                id: 'charmander-rage-active',
                name: 'Rage',
                hidden: true,
                harmful: false,
                durationActions: 4,
                durationAnchor: 'source',
                damageReductionPercent: 50,
                rageCounterMax: 4,
            },
        }],
    }),
];

const squirtleSkills = [
    skill({
        id: 'squirtle-water-gun',
        name: 'Water Gun',
        description: 'Deals 20 damage now and 10 next turn; harmful use triggers Guard Break.',
        target: 'single-enemy',
        energy: [Energy.NINJUTSU],
        cooldown: 0,
        moveType: Type.WATER,
        classes: ['Water', 'Special', 'Instant'],
        effects: [
            { kind: 'damage', amount: 20, damageKind: 'normal' },
            { kind: 'status', status: {
                id: 'squirtle-water-gun-followup',
                name: 'Water Gun',
                hidden: false,
                harmful: true,
                durationActions: 1,
                periodicDamage: 10,
                onHarmfulSkill: {
                    status: guardBreak(2),
                    sourceCounter: 'evolution',
                    sourceCounterMaximum: 3,
                },
            } },
        ],
    }),
    skill({
        id: 'squirtle-withdraw',
        name: 'Withdraw',
        description: 'One ally blocks the next enemy harmful skill through the opposing turn.',
        target: 'self-or-single-ally',
        energy: [Energy.RANDOM, Energy.RANDOM],
        cooldown: 2,
        moveType: Type.WATER,
        harmful: false,
        classes: ['Water', 'Strategic', 'Instant', 'Invisible'],
        effects: [{ kind: 'status', status: {
            id: 'squirtle-withdraw',
            name: 'Withdraw',
            hidden: true,
            harmful: false,
            durationActions: 1,
            blockNextHarmful: true,
            counterSourceOnBlock: 'evolution',
        } }],
    }),
    skill({
        id: 'squirtle-bubble',
        name: 'Bubble',
        description: 'Deals 10 damage for 5 turns, plus 10 against Guard Break. Stacks.',
        target: 'single-enemy',
        energy: [Energy.NINJUTSU, Energy.RANDOM],
        cooldown: 0,
        moveType: Type.WATER,
        classes: ['Water', 'Special', 'Instant'],
        effects: [{ kind: 'status', status: {
            id: 'squirtle-bubble',
            name: 'Bubble',
            hidden: false,
            harmful: true,
            durationActions: 9,
            periodicDamage: 10,
            periodicBonusIfStatus: { statusId: 'squirtle-guard-break', amount: 10 },
        } }],
    }),
    skill({
        id: 'squirtle-rapid-spin',
        name: 'Rapid Spin',
        description: 'Cleanses one ally and deals 15 damage to all enemies.',
        target: 'self-or-single-ally',
        energy: [Energy.TAIJUTSU, Energy.RANDOM],
        cooldown: 4,
        moveType: Type.NORMAL,
        classes: ['Normal', 'Physical', 'Instant'],
        effects: [
            { kind: 'cleanse-enemy-statuses', actorCounter: 'evolution' },
            { kind: 'damage', scope: 'all-enemy', amount: 15, damageKind: 'normal' },
        ],
    }),
    skill({
        id: 'wartortle-hydro-pump',
        name: 'Hydro Pump',
        description: 'Deals 30 damage now and 20 next turn; harmful use triggers Guard Break.',
        target: 'single-enemy',
        energy: [Energy.NINJUTSU, Energy.NINJUTSU],
        cooldown: 0,
        moveType: Type.WATER,
        classes: ['Water', 'Special', 'Instant'],
        effects: [
            { kind: 'damage', amount: 30, damageKind: 'normal' },
            { kind: 'status', status: {
                id: 'wartortle-hydro-pump-followup',
                name: 'Hydro Pump',
                hidden: false,
                harmful: true,
                durationActions: 1,
                periodicDamage: 20,
                onHarmfulSkill: { status: guardBreak(3) },
            } },
        ],
    }),
    skill({
        id: 'wartortle-shell-guard',
        name: 'Shell Guard',
        description: 'Wartortle and one ally block all enemy harmful skills for 1 turn.',
        target: 'single-ally',
        energy: [Energy.RANDOM, Energy.RANDOM],
        cooldown: 2,
        moveType: Type.WATER,
        harmful: false,
        classes: ['Water', 'Strategic', 'Instant', 'Invisible'],
        effects: [{ kind: 'status', scope: 'selected-and-self', status: {
            id: 'wartortle-shell-guard',
            name: 'Shell Guard',
            hidden: true,
            harmful: false,
            durationActions: 1,
            blockAllHarmful: true,
        } }],
    }),
    skill({
        id: 'wartortle-bubblebeam',
        name: 'Bubblebeam',
        description: 'Deals 10 damage to all enemies for 5 turns, plus 10 against Guard Break.',
        target: 'all-enemy',
        energy: [Energy.NINJUTSU, Energy.RANDOM, Energy.RANDOM],
        cooldown: 2,
        moveType: Type.WATER,
        classes: ['Water', 'Special', 'Instant'],
        effects: [{ kind: 'status', scope: 'all-enemy', status: {
            id: 'wartortle-bubblebeam',
            name: 'Bubblebeam',
            hidden: false,
            harmful: true,
            durationActions: 9,
            periodicDamage: 10,
            periodicBonusIfStatus: { statusId: 'squirtle-guard-break', amount: 10 },
        } }],
    }),
    skill({
        id: 'wartortle-aqua-spin',
        name: 'Aqua Spin',
        description: 'Cleanses the allied team and deals 25 damage to all enemies.',
        target: 'all-allies',
        energy: [Energy.TAIJUTSU, Energy.RANDOM, Energy.RANDOM],
        cooldown: 4,
        moveType: Type.WATER,
        classes: ['Water', 'Physical', 'Instant'],
        effects: [
            { kind: 'cleanse-enemy-statuses', scope: 'all-allies' },
            { kind: 'damage', scope: 'all-enemy', amount: 25, damageKind: 'normal' },
        ],
    }),
];

const bulbasaurSkills = [
    skill({
        id: 'bulbasaur-leech-seed',
        name: 'Leech Seed',
        description: 'Steals 20 HP immediately, then 5 HP at the start of the target’s next 2 turns; grants Bulbasaur 1 Sun each time it deals damage.',
        target: 'single-enemy',
        energy: [Energy.TAIJUTSU],
        cooldown: 1,
        moveType: Type.GRASS,
        classes: ['Grass', 'Physical', 'Control'],
        effects: [
            {
                kind: 'drain', amount: 20, damageKind: 'normal',
                actorCounterOnDamage: { counter: 'sun', delta: 1, maximum: 5 },
            },
            { kind: 'status', status: {
                id: 'bulbasaur-leech-seed',
                name: 'Leech Seed',
                hidden: false,
                harmful: true,
                durationActions: 2,
                durationAnchor: 'target',
                periodicDrain: 5,
                sourceCounter: 'sun',
                sourceCounterMaximum: 5,
            } },
        ],
    }),
    skill({
        id: 'bulbasaur-vine-whip',
        name: 'Vine Whip',
        description: 'Deals 25 piercing damage, stuns harmful skills, and can critically strike per Sun.',
        target: 'single-enemy',
        energy: [Energy.TAIJUTSU, Energy.RANDOM],
        cooldown: 1,
        moveType: Type.GRASS,
        classes: ['Grass', 'Physical', 'Instant'],
        effects: [
            { kind: 'damage', amount: 25, damageKind: 'piercing' },
            { kind: 'damage', amount: 15, damageKind: 'piercing', chance: 0, chanceCounter: sunCritical },
            { kind: 'status', status: {
                id: 'bulbasaur-vine-whip-stun',
                name: 'Harmful Skills Stunned',
                hidden: false,
                harmful: true,
                durationActions: 1,
                stunHarmful: true,
            } },
        ],
    }),
    skill({
        id: 'bulbasaur-razor-leaf',
        name: 'Razor Leaf',
        description: 'Deals 15 to one enemy and 10 to the others, with a critical chance per Sun.',
        target: 'single-enemy',
        energy: [Energy.RANDOM, Energy.RANDOM],
        cooldown: 2,
        moveType: Type.GRASS,
        classes: ['Grass', 'Physical', 'Instant'],
        effects: [
            { kind: 'damage', amount: 15, damageKind: 'normal' },
            { kind: 'damage', scope: 'other-enemies', amount: 10, damageKind: 'normal' },
            { kind: 'damage', scope: 'all-enemy', amount: 10, damageKind: 'piercing', chance: 0, chanceCounter: sunCritical },
        ],
    }),
    skill({
        id: 'bulbasaur-solar-beam',
        name: 'Solar Beam',
        description: 'Deals 50 damage, costs 1 less random energy per Sun, then consumes all Sun.',
        target: 'single-enemy',
        energy: [Energy.TAIJUTSU, Energy.RANDOM, Energy.RANDOM, Energy.RANDOM, Energy.RANDOM, Energy.RANDOM],
        randomCostReductionCounter: 'sun',
        cooldown: 3,
        moveType: Type.GRASS,
        classes: ['Grass', 'Special', 'Instant', 'Uncounterable'],
        effects: [
            { kind: 'damage', amount: 50, damageKind: 'normal' },
            { kind: 'reset-actor-counter', counter: 'sun' },
        ],
    }),
    skill({
        id: 'ivysaur-leech-seed',
        name: "Ivysaur's Leech Seed",
        description: 'Steals 25 HP immediately, then 10 HP at the start of the target’s next 2 turns; grants Ivysaur 1 Sun each time it deals damage.',
        target: 'single-enemy',
        energy: [Energy.TAIJUTSU, Energy.RANDOM],
        cooldown: 1,
        moveType: Type.GRASS,
        classes: ['Grass', 'Physical', 'Control'],
        effects: [
            {
                kind: 'drain', amount: 25, damageKind: 'normal',
                actorCounterOnDamage: { counter: 'sun', delta: 1, maximum: 5 },
            },
            { kind: 'status', status: {
                id: 'ivysaur-leech-seed',
                name: "Ivysaur's Leech Seed",
                hidden: false,
                harmful: true,
                durationActions: 2,
                durationAnchor: 'target',
                periodicDrain: 10,
                sourceCounter: 'sun',
                sourceCounterMaximum: 5,
            } },
        ],
    }),
    skill({
        id: 'ivysaur-vine-whip',
        name: "Ivysaur's Vine Whip",
        description: 'Deals 35 piercing damage, stuns harmful skills, and can critically strike per Sun.',
        target: 'single-enemy',
        energy: [Energy.TAIJUTSU, Energy.RANDOM],
        cooldown: 1,
        moveType: Type.GRASS,
        classes: ['Grass', 'Physical', 'Instant'],
        effects: [
            { kind: 'damage', amount: 35, damageKind: 'piercing' },
            { kind: 'damage', amount: 15, damageKind: 'piercing', chance: 0, chanceCounter: sunCritical },
            { kind: 'status', status: {
                id: 'ivysaur-vine-whip-stun',
                name: 'Harmful Skills Stunned',
                hidden: false,
                harmful: true,
                durationActions: 1,
                stunHarmful: true,
            } },
        ],
    }),
    skill({
        id: 'ivysaur-razor-leaf',
        name: "Ivysaur's Razor Leaf",
        description: 'Deals 30 to one enemy and 25 to the others, with a critical chance per Sun.',
        target: 'single-enemy',
        energy: [Energy.RANDOM, Energy.RANDOM, Energy.RANDOM],
        cooldown: 2,
        moveType: Type.GRASS,
        classes: ['Grass', 'Physical', 'Instant'],
        effects: [
            { kind: 'damage', amount: 30, damageKind: 'normal' },
            { kind: 'damage', scope: 'other-enemies', amount: 25, damageKind: 'normal' },
            { kind: 'damage', scope: 'all-enemy', amount: 10, damageKind: 'piercing', chance: 0, chanceCounter: sunCritical },
        ],
    }),
    skill({
        id: 'ivysaur-solar-beam',
        name: "Ivysaur's Solar Beam",
        description: 'Deals 65 damage, costs 1 less random energy per Sun, then consumes all Sun.',
        target: 'single-enemy',
        energy: [Energy.TAIJUTSU, Energy.RANDOM, Energy.RANDOM, Energy.RANDOM, Energy.RANDOM, Energy.RANDOM],
        randomCostReductionCounter: 'sun',
        cooldown: 3,
        moveType: Type.GRASS,
        classes: ['Grass', 'Special', 'Instant', 'Uncounterable'],
        effects: [
            { kind: 'damage', amount: 65, damageKind: 'normal' },
            { kind: 'reset-actor-counter', counter: 'sun' },
        ],
    }),
];

const butterfreeSkills = [
    skill({
        id: 'butterfree-confusion', name: 'Confusion',
        description: 'Deals 25 damage with a 25% chance to reflect the target’s next harmful skill; empowers Psybeam for one turn.',
        target: 'single-enemy', energy: [Energy.TAIJUTSU, Energy.RANDOM], cooldown: 1,
        moveType: Type.PSYCHIC, classes: ['Psychic', 'Special', 'Instant', 'Invisible'],
        effects: [
            { kind: 'damage', amount: 25, damageKind: 'normal-ignore-reduction' },
            { kind: 'status', percent: 25, status: {
                id: 'butterfree-confusion-reflect', name: 'Confusion Reflection', hidden: false, harmful: true,
                durationActions: 1, reflectNextOwnerUseSkill: true, reflectOnlyHarmfulSkills: true,
            } },
            { kind: 'source-status', status: {
                id: 'butterfree-confusion-psybeam-bonus', name: 'Psybeam Empowered', hidden: true, harmful: false,
                durationActions: 2, skillDamageBonuses: { 'butterfree-psybeam': 5 },
                skillCostOverrides: { 'butterfree-psybeam': [Energy.NINJUTSU] },
            } },
        ],
    }),
    skill({
        id: 'butterfree-psybeam', name: 'Psybeam',
        description: 'Deals 25 damage and increases the target’s next new cooldown by 2; empowers Confusion for one turn.',
        target: 'single-enemy', energy: [Energy.NINJUTSU, Energy.RANDOM], cooldown: 1,
        moveType: Type.PSYCHIC, classes: ['Psychic', 'Special', 'Instant'],
        effects: [
            { kind: 'damage', amount: 25, damageKind: 'normal-ignore-reduction' },
            { kind: 'status', status: {
                id: 'butterfree-psybeam-cooldown-wave', name: 'Cooldown Wave', hidden: false, harmful: true,
                durationActions: 1, newSkillCooldownIncrease: 2,
            } },
            { kind: 'source-status', status: {
                id: 'butterfree-psybeam-confusion-bonus', name: 'Confusion Empowered', hidden: true, harmful: false,
                durationActions: 2, skillDamageBonuses: { 'butterfree-confusion': 5 },
                skillCostOverrides: { 'butterfree-confusion': [Energy.TAIJUTSU] },
            } },
        ],
    }),
    skill({
        id: 'butterfree-stun-spore', name: 'Stun Spore',
        description: 'For two turns, deals 10 affliction damage at Butterfree’s turn end and paralyzes cooldowns; swaps to Sleep Powder.',
        target: 'single-enemy', energy: [Energy.GENJUTSU], cooldown: 2,
        moveType: Type.GRASS, classes: ['Grass', 'Physical', 'Affliction', 'Instant'],
        effects: [
            { kind: 'status', status: {
                id: 'butterfree-stun-spore-lock', name: 'Stun Spore', hidden: false, harmful: true,
                durationActions: 2, durationAnchor: 'source', turnEndDamage: 10, paralyzeCooldowns: true,
            } },
            { kind: 'source-status', status: {
                id: 'butterfree-stun-spore-swap', name: 'Sleep Powder Ready', hidden: true, harmful: false,
                durationActions: null,
                skillReplacements: { 'butterfree-stun-spore': 'butterfree-sleep-powder' },
                removeStatusIdsOnApply: ['butterfree-sleep-powder-swap'],
            } },
        ],
    }),
    skill({
        id: 'butterfree-whirlwind', name: 'Whirlwind',
        description: 'For one turn, the allied team is invulnerable to Physical and Special skills.',
        target: 'all-allies', energy: [Energy.NINJUTSU], cooldown: 4,
        moveType: Type.NORMAL, classes: ['Normal', 'Physical', 'Instant'], harmful: false,
        effects: [{ kind: 'status', scope: 'all-allies', status: {
            id: 'butterfree-whirlwind-cover', name: 'Whirlwind Cover', hidden: false, harmful: false,
            durationActions: 1, invulnerableToSkillClasses: ['Physical', 'Special'],
        } }],
    }),
    skill({
        id: 'butterfree-sleep-powder', name: 'Sleep Powder',
        description: 'Stuns one enemy for two turns until new damage wakes them, then swaps back to Stun Spore.',
        target: 'single-enemy', energy: [Energy.RANDOM, Energy.RANDOM], cooldown: 3,
        moveType: Type.GRASS, classes: ['Grass', 'Physical', 'Instant'],
        effects: [
            { kind: 'status', status: {
                id: 'butterfree-sleep-powder-stun', name: 'Sleep Powder', hidden: false, harmful: true,
                durationActions: 3, cannotUseSkills: true,
                removeStatusIdsOnNewDamage: ['butterfree-sleep-powder-stun'],
            } },
            { kind: 'source-status', status: {
                id: 'butterfree-sleep-powder-swap', name: 'Stun Spore Ready', hidden: true, harmful: false,
                durationActions: null,
                skillReplacements: { 'butterfree-stun-spore': 'butterfree-stun-spore' },
                removeStatusIdsOnApply: ['butterfree-stun-spore-swap'],
            } },
        ],
    }),
];

const pidgeySkills = [
    skill({
        id: 'pidgey-gust', name: 'Gust',
        description: 'Deals 15 piercing damage to one enemy and 10 to the others; Sand-Attack and Whirlwind add damage.',
        target: 'single-enemy', energy: [Energy.BLOODLINE], cooldown: 0,
        moveType: Type.FLYING, classes: ['Flying', 'Physical', 'Instant'],
        effects: [
            { kind: 'damage', amount: 15, damageKind: 'normal-ignore-reduction', actorCounterFromDamage: { counter: 'evolution', maximum: 50 } },
            { kind: 'damage', scope: 'other-enemies', amount: 10, damageKind: 'normal-ignore-reduction', actorCounterFromDamage: { counter: 'evolution', maximum: 50 } },
            { kind: 'damage', amount: 10, damageKind: 'normal-ignore-reduction', requiresTargetStatus: 'pidgey-sand-attack', actorCounterFromDamage: { counter: 'evolution', maximum: 50 } },
            { kind: 'damage', scope: 'other-enemies', amount: 5, damageKind: 'normal-ignore-reduction', requiresActorStatus: 'pidgey-whirlwind', actorCounterFromDamage: { counter: 'evolution', maximum: 50 } },
        ],
    }),
    skill({
        id: 'pidgey-whirlwind', name: 'Whirlwind',
        description: 'For two Pidgey turns, grants 25% evasion and adds 5 damage to Gust and Peck’s secondary hits.',
        target: 'self', energy: [Energy.BLOODLINE, Energy.BLOODLINE], cooldown: 3,
        moveType: Type.NORMAL, classes: ['Normal', 'Physical', 'Instant'], harmful: false,
        effects: [{ kind: 'status', status: {
            id: 'pidgey-whirlwind', name: 'Whirlwind', hidden: false, harmful: false,
            durationActions: 2, durationAnchor: 'source', evadeChancePercent: 25,
        } }],
    }),
    skill({
        id: 'pidgey-peck', name: 'Peck',
        description: 'Deals 20 piercing damage; Sand-Attack adds 10, and Whirlwind deals 10 to the other enemies.',
        target: 'single-enemy', energy: [Energy.TAIJUTSU, Energy.RANDOM], cooldown: 0,
        moveType: Type.FLYING, classes: ['Flying', 'Physical', 'Instant'],
        effects: [
            { kind: 'damage', amount: 20, damageKind: 'normal-ignore-reduction', actorCounterFromDamage: { counter: 'evolution', maximum: 50 } },
            { kind: 'damage', amount: 10, damageKind: 'normal-ignore-reduction', requiresTargetStatus: 'pidgey-sand-attack', actorCounterFromDamage: { counter: 'evolution', maximum: 50 } },
            { kind: 'damage', scope: 'other-enemies', amount: 10, damageKind: 'normal-ignore-reduction', requiresActorStatus: 'pidgey-whirlwind', actorCounterFromDamage: { counter: 'evolution', maximum: 50 } },
        ],
    }),
    skill({
        id: 'pidgey-sand-attack', name: 'Sand-Attack',
        description: 'For two turns, the target’s harmful skills are redirected to a random living Pokémon.',
        target: 'single-enemy', energy: [Energy.RANDOM], cooldown: 5,
        moveType: Type.GROUND, classes: ['Ground', 'Physical', 'Instant'],
        effects: [{ kind: 'status', status: {
            id: 'pidgey-sand-attack', name: 'Sand-Attack', hidden: false, harmful: true,
            durationActions: 2, durationAnchor: 'target', fullBlind: true,
        } }],
    }),
    skill({
        id: 'pidgeotto-gust', name: 'Gust',
        description: 'Deals 20 piercing damage to one enemy and 15 to the others, with improved Sand-Attack and Whirlwind bonuses.',
        target: 'single-enemy', energy: [Energy.BLOODLINE], cooldown: 0,
        moveType: Type.FLYING, classes: ['Flying', 'Physical', 'Instant'],
        effects: [
            { kind: 'damage', amount: 20, damageKind: 'normal-ignore-reduction' },
            { kind: 'damage', scope: 'other-enemies', amount: 15, damageKind: 'normal-ignore-reduction' },
            { kind: 'damage', amount: 10, damageKind: 'normal-ignore-reduction', requiresTargetStatus: 'pidgeotto-sand-attack' },
            { kind: 'damage', scope: 'other-enemies', amount: 10, damageKind: 'normal-ignore-reduction', requiresActorStatus: 'pidgeotto-whirlwind' },
        ],
    }),
    skill({
        id: 'pidgeotto-whirlwind', name: 'Whirlwind',
        description: 'For three Pidgeotto turns, grants 50% evasion and adds 10 damage to secondary hits.',
        target: 'self', energy: [Energy.BLOODLINE, Energy.BLOODLINE, Energy.RANDOM], cooldown: 3,
        moveType: Type.NORMAL, classes: ['Normal', 'Physical', 'Instant'], harmful: false,
        effects: [{ kind: 'status', status: {
            id: 'pidgeotto-whirlwind', name: 'Whirlwind', hidden: false, harmful: false,
            durationActions: 3, durationAnchor: 'source', evadeChancePercent: 50,
        } }],
    }),
    skill({
        id: 'pidgeotto-peck', name: 'Peck',
        description: 'Deals 30 piercing damage; Sand-Attack adds 15, and Whirlwind deals 15 to the other enemies.',
        target: 'single-enemy', energy: [Energy.TAIJUTSU, Energy.RANDOM], cooldown: 0,
        moveType: Type.FLYING, classes: ['Flying', 'Physical', 'Instant'],
        effects: [
            { kind: 'damage', amount: 30, damageKind: 'normal-ignore-reduction' },
            { kind: 'damage', amount: 15, damageKind: 'normal-ignore-reduction', requiresTargetStatus: 'pidgeotto-sand-attack' },
            { kind: 'damage', scope: 'other-enemies', amount: 15, damageKind: 'normal-ignore-reduction', requiresActorStatus: 'pidgeotto-whirlwind' },
        ],
    }),
    skill({
        id: 'pidgeotto-sand-attack', name: 'Sand-Attack',
        description: 'For three turns, the target’s harmful skills are redirected to a random living Pokémon.',
        target: 'single-enemy', energy: [Energy.RANDOM, Energy.RANDOM], cooldown: 6,
        moveType: Type.GROUND, classes: ['Ground', 'Physical', 'Instant'],
        effects: [{ kind: 'status', status: {
            id: 'pidgeotto-sand-attack', name: 'Sand-Attack', hidden: false, harmful: true,
            durationActions: 3, durationAnchor: 'target', fullBlind: true,
        } }],
    }),
];

const captureStun = (durationActions, ballName) => ({
    id: 'stunned',
    name: `${ballName} Containment`,
    hidden: false,
    harmful: true,
    durationActions,
    cannotUseSkills: true,
    invulnerable: true,
});

const captureBall = ({ id, name, description, energy, threshold, durationActions }) => skill({
    id,
    name,
    description,
    target: 'single-enemy',
    energy,
    cooldown: 0,
    moveType: Type.NORMAL,
    classes: ['Normal', 'Physical', 'Instant'],
    effects: [
        { kind: 'banish', captureThreshold: threshold, requiresEnemyTarget: true },
        { kind: 'copy-target-character', captureThreshold: threshold, requiresEnemyTarget: true },
        {
            kind: 'status',
            unlessCaptureThreshold: threshold,
            requiresEnemyTarget: true,
            status: captureStun(durationActions, name),
        },
    ],
});

const trainerSkills = [
    captureBall({
        id: 'pokemon-trainer-pokeball',
        name: 'Pokeball',
        description: 'Captures an enemy at 10 HP or less (20 if stunned or paralyzed); otherwise stuns and protects it for one turn.',
        energy: [Energy.BLOODLINE],
        threshold: 10,
        durationActions: 1,
    }),
    captureBall({
        id: 'pokemon-trainer-great-ball',
        name: 'Great Ball',
        description: 'Captures an enemy at 25 HP or less (35 if stunned or paralyzed); otherwise stuns and protects it for one turn.',
        energy: [Energy.NINJUTSU, Energy.RANDOM],
        threshold: 25,
        durationActions: 1,
    }),
    captureBall({
        id: 'pokemon-trainer-ultra-ball',
        name: 'Ultra Ball',
        description: 'Captures an enemy at 40 HP or less (50 if stunned or paralyzed); otherwise stuns and protects it for one turn.',
        energy: [Energy.GENJUTSU, Energy.GENJUTSU],
        threshold: 40,
        durationActions: 1,
    }),
    skill({
        id: 'pokemon-trainer-master-ball',
        name: 'Master Ball',
        description: 'Permanently captures any enemy, bypassing counters, reflection, and invulnerability, then copies its current form.',
        target: 'single-enemy',
        energy: [Energy.BLOODLINE, Energy.NINJUTSU, Energy.GENJUTSU, Energy.RANDOM],
        cooldown: 0,
        moveType: Type.NORMAL,
        classes: ['Normal', 'Physical', 'Instant', 'Bypassing', 'Uncounterable', 'Unreflectable'],
        cannotBeCountered: true,
        cannotBeReflected: true,
        ignoreInvulnerability: true,
        effects: [
            { kind: 'banish', requiresEnemyTarget: true },
            { kind: 'copy-target-character', requiresEnemyTarget: true },
        ],
    }),
    skill({
        id: 'pokemon-trainer-potion',
        name: 'Potion',
        description: 'Restores 30 HP to the Trainer or one ally. May be used twice per match.',
        target: 'self-or-single-ally',
        energy: [Energy.RANDOM],
        cooldown: 1,
        maxUses: 2,
        moveType: Type.NORMAL,
        classes: ['Normal', 'Physical', 'Instant'],
        harmful: false,
        effects: [{ kind: 'heal', amount: 30 }],
    }),
    skill({
        id: 'pokemon-trainer-x-stats',
        name: 'X-Stats',
        description: 'Alternates permanent, stackable Physical and Special boosts on one ally; Physical uses also grant +5 non-affliction damage and 5 flat reduction.',
        target: 'single-ally',
        energy: [Energy.RANDOM],
        cooldown: 2,
        moveType: Type.NORMAL,
        classes: ['Normal', 'Physical', 'Instant'],
        harmful: false,
        effects: [
            {
                kind: 'status',
                actorSkillUseModulo: { skillId: 'pokemon-trainer-x-stats', divisor: 2, remainder: 1 },
                status: {
                    id: 'pokemon_trainer_x_stats_physical_buff',
                    name: 'X-Stats: Physical',
                    hidden: false,
                    harmful: false,
                    durationActions: null,
                    damageBonusBySkillClass: { Physical: 5 },
                    mergeMapFields: ['damageBonusBySkillClass'],
                },
            },
            {
                kind: 'status',
                actorSkillUseModulo: { skillId: 'pokemon-trainer-x-stats', divisor: 2, remainder: 0 },
                status: {
                    id: 'pokemon_trainer_x_stats_special_buff',
                    name: 'X-Stats: Special',
                    hidden: false,
                    harmful: false,
                    durationActions: null,
                    damageBonusBySkillClass: { Special: 5 },
                    specialXStatsDamageBonus: 5,
                    mergeNumericFields: ['specialXStatsDamageBonus'],
                    mergeMapFields: ['damageBonusBySkillClass'],
                },
            },
        ],
    }),
    skill({
        id: 'pokemon-trainer-rare-candy',
        name: 'Rare Candy',
        description: 'Force-evolves an eligible ally, restores 10 HP through evolution, grants 25 defense, then permanently becomes Revive.',
        target: 'single-ally',
        energy: [Energy.NINJUTSU, Energy.RANDOM],
        cooldown: 0,
        moveType: Type.NORMAL,
        classes: ['Normal', 'Physical', 'Instant'],
        harmful: false,
        effects: [
            { kind: 'force-evolve' },
            { kind: 'source-status', status: {
                id: 'pokemon-trainer-rare-candy-swap',
                name: 'Revive Ready',
                hidden: true,
                harmful: false,
                durationActions: null,
                skillReplacements: { 'pokemon-trainer-rare-candy': 'pokemon-trainer-revive' },
            } },
        ],
    }),
    skill({
        id: 'pokemon-trainer-revive',
        name: 'Revive',
        description: 'Revives one defeated ally with 30 HP. This skill cannot target living allies.',
        target: 'dead-ally',
        energy: [Energy.RANDOM, Energy.RANDOM, Energy.RANDOM],
        cooldown: 4,
        moveType: Type.NORMAL,
        classes: ['Normal', 'Physical', 'Instant'],
        harmful: false,
        effects: [
            { kind: 'revive', amount: 30 },
        ],
    }),
];

const poisonGasOptions = (prefix) => [
    {
        id: `${prefix}-harmful-blind`,
        name: 'Poison Gas: Harmful Blind',
        hidden: false,
        harmful: true,
        durationActions: 1,
        harmfulBlindToSourceTeam: true,
    },
    {
        id: `${prefix}-paralyze-cooldowns`,
        name: 'Poison Gas: Cooldown Paralysis',
        hidden: false,
        harmful: true,
        durationActions: 1,
        paralyzeCooldowns: true,
    },
    {
        id: `${prefix}-helpful-lock`,
        name: 'Poison Gas: Helpful Skills Disabled',
        hidden: false,
        harmful: true,
        durationActions: 1,
        cannotUseHelpfulSkills: true,
    },
    {
        id: `${prefix}-skill-delay`,
        name: 'Poison Gas: Skill Delay',
        hidden: false,
        harmful: true,
        durationActions: 1,
        cannotUseSkills: true,
    },
    {
        id: `${prefix}-silence`,
        name: 'Poison Gas: Silence',
        hidden: false,
        harmful: true,
        durationActions: 1,
        silenceNonDamageEffects: true,
    },
    {
        id: `${prefix}-damage-reduction`,
        name: 'Poison Gas: Damage Reduction',
        hidden: false,
        harmful: true,
        durationActions: 1,
        damageReductionPercent: 50,
    },
];

const koffingPoisonGas = (evolved = false) => ({
    id: evolved ? 'weezing-poison-gas-passive' : 'koffing-poison-gas-passive',
    name: evolved ? 'Weezing Poison Gas' : 'Koffing Poison Gas',
    hidden: true,
    harmful: false,
    durationActions: null,
    unremovable: true,
    onSuccessfulEnemyDamageRandomStatus: {
        chancePercent: evolved ? 60 : 30,
        statusOptions: poisonGasOptions(evolved ? 'weezing-poison-gas' : 'koffing-poison-gas'),
    },
});

const koffingEvolutionProgress = {
    kind: 'record-unique-skill',
    scope: 'self',
    group: 'koffing-evolution',
    counter: 'evolution',
    threshold: 4,
    evolveForm: 'weezing',
};

const koffingSkills = [
    skill({
        id: 'koffing-smog', name: 'Smog',
        description: 'Deals 5 fixed affliction damage to all enemies immediately and on three later Koffing turns. Each cloud stacks.',
        target: 'all-enemy', energy: [Energy.NINJUTSU], cooldown: 0,
        moveType: Type.POISON, classes: ['Poison', 'Special', 'Affliction', 'Instant'],
        effects: [
            { kind: 'fixed-affliction-damage', scope: 'all-enemy', amount: 5 },
            { kind: 'status', scope: 'all-enemy', status: {
                id: 'koffing-smog-cloud', name: 'Smog', hidden: false, harmful: true,
                durationActions: 7, turnEndDamage: 5, skipTurnEndOnAppliedTurn: true,
            } },
            koffingEvolutionProgress,
        ],
    }),
    skill({
        id: 'koffing-haze', name: 'Haze',
        description: 'Cleanses enemy statuses from all allies and makes the team ignore enemy non-damaging effects through the next enemy turn.',
        target: 'all-allies', energy: [Energy.RANDOM], cooldown: 3,
        moveType: Type.ICE, classes: ['Ice', 'Physical', 'Instant'], harmful: false,
        effects: [
            { kind: 'status', scope: 'all-allies', status: {
                id: 'koffing-haze-cover', name: 'Haze', hidden: false, harmful: false,
                durationActions: 1, ignoreEnemyNonDamageEffects: true,
            } },
            { kind: 'cleanse-enemy-statuses', scope: 'all-allies' },
            koffingEvolutionProgress,
        ],
    }),
    skill({
        id: 'koffing-self-destruct', name: 'Self-Destruct',
        description: 'Deals 20 affliction damage to all enemies and costs Koffing 20 HP; if that defeats it, all enemies take 5 more fixed affliction damage.',
        target: 'all-enemy', energy: [Energy.NINJUTSU, Energy.RANDOM], cooldown: 4,
        moveType: Type.NORMAL, classes: ['Normal', 'Special', 'Affliction', 'Instant'],
        effects: [
            { kind: 'status', scope: 'self', status: {
                id: 'koffing-self-destruct-aftershock', name: 'Self-Destruct Aftershock',
                hidden: true, harmful: false, durationActions: 1,
                onOwnerDeathDamageEnemyTeam: { amount: 5 },
            } },
            { kind: 'damage', scope: 'all-enemy', amount: 20, damageKind: 'affliction', ignoreDamageReduction: true },
            { kind: 'health-loss', scope: 'self', amount: 20 },
            koffingEvolutionProgress,
        ],
    }),
    skill({
        id: 'koffing-smokescreen', name: 'Smokescreen',
        description: 'Grants the allied team 20% evasion for two enemy turns.',
        target: 'all-allies', energy: [Energy.RANDOM], cooldown: 4,
        moveType: Type.NORMAL, classes: ['Normal', 'Physical', 'Instant'], harmful: false,
        effects: [
            { kind: 'status', scope: 'all-allies', status: {
                id: 'koffing-smokescreen-cover', name: 'Smokescreen', hidden: false, harmful: false,
                durationActions: 3, evadeChancePercent: 20,
            } },
            koffingEvolutionProgress,
        ],
    }),
    skill({
        id: 'koffing-weezing-smog', name: 'Smog',
        description: 'Deals 10 fixed affliction damage to all enemies immediately and on three later Weezing turns. Each cloud stacks.',
        target: 'all-enemy', energy: [Energy.NINJUTSU, Energy.RANDOM], cooldown: 0,
        moveType: Type.POISON, classes: ['Poison', 'Special', 'Affliction', 'Instant'],
        effects: [
            { kind: 'fixed-affliction-damage', scope: 'all-enemy', amount: 10 },
            { kind: 'status', scope: 'all-enemy', status: {
                id: 'weezing-smog-cloud', name: 'Weezing Smog', hidden: false, harmful: true,
                durationActions: 7, turnEndDamage: 10, skipTurnEndOnAppliedTurn: true,
            } },
        ],
    }),
    skill({
        id: 'koffing-weezing-haze', name: 'Haze',
        description: 'Cleanses enemy statuses from all allies and makes the team ignore enemy non-damaging effects for two enemy turns.',
        target: 'all-allies', energy: [Energy.RANDOM, Energy.RANDOM], cooldown: 3,
        moveType: Type.ICE, classes: ['Ice', 'Physical', 'Instant'], harmful: false,
        effects: [
            { kind: 'status', scope: 'all-allies', status: {
                id: 'weezing-haze-cover', name: 'Weezing Haze', hidden: false, harmful: false,
                durationActions: 3, ignoreEnemyNonDamageEffects: true,
            } },
            { kind: 'cleanse-enemy-statuses', scope: 'all-allies' },
        ],
    }),
    skill({
        id: 'koffing-weezing-self-destruct', name: 'Self-Destruct',
        description: 'Deals 30 affliction damage to all enemies and costs Weezing 30 HP; if that defeats it, all enemies take 5 more fixed affliction damage.',
        target: 'all-enemy', energy: [Energy.NINJUTSU, Energy.RANDOM, Energy.RANDOM], cooldown: 4,
        moveType: Type.NORMAL, classes: ['Normal', 'Special', 'Affliction', 'Instant'],
        effects: [
            { kind: 'status', scope: 'self', status: {
                id: 'weezing-self-destruct-aftershock', name: 'Self-Destruct Aftershock',
                hidden: true, harmful: false, durationActions: 1,
                onOwnerDeathDamageEnemyTeam: { amount: 5 },
            } },
            { kind: 'damage', scope: 'all-enemy', amount: 30, damageKind: 'affliction', ignoreDamageReduction: true },
            { kind: 'health-loss', scope: 'self', amount: 30 },
        ],
    }),
    skill({
        id: 'koffing-weezing-smokescreen', name: 'Smokescreen',
        description: 'Grants the allied team 30% evasion for three enemy turns.',
        target: 'all-allies', energy: [Energy.RANDOM, Energy.RANDOM], cooldown: 4,
        moveType: Type.NORMAL, classes: ['Normal', 'Physical', 'Instant'], harmful: false,
        effects: [{ kind: 'status', scope: 'all-allies', status: {
            id: 'weezing-smokescreen-cover', name: 'Weezing Smokescreen', hidden: false, harmful: false,
            durationActions: 5, evadeChancePercent: 30,
        } }],
    }),
];

const gastlyEvolutionProgress = {
    counter: 'evolution',
    maximum: 35,
};

const curseMark = (evolved = false) => ({
    id: 'gastly-curse-mark',
    name: 'Curse',
    hidden: false,
    harmful: true,
    affliction: true,
    durationActions: null,
    turnEndDamage: evolved ? 20 : 15,
    turnEndAnchor: 'target',
    skipNextTurnEndDamage: true,
});

const gastlySkills = [
    skill({
        id: 'gastly-lick', name: 'Lick',
        description: 'Deals 20 affliction damage. Its 1% harmful-skill stun chance gains 1% for every missing HP.',
        target: 'single-enemy', energy: [Energy.NINJUTSU], cooldown: 0,
        moveType: Type.GHOST, classes: ['Ghost', 'Special', 'Affliction', 'Instant'],
        ignoreDamageReduction: true,
        effects: [
            { kind: 'damage', amount: 20, damageKind: 'affliction', actorCounterFromDamage: gastlyEvolutionProgress },
            { kind: 'status', chance: 1, chancePerMissingHp: 1, status: {
                id: 'gastly-lick-lock', name: 'Lick', hidden: false, harmful: true,
                durationActions: 1, stunHarmful: true,
            } },
        ],
    }),
    skill({
        id: 'gastly-curse', name: 'Curse',
        description: 'Immediately and permanently curses one enemy for 15 affliction damage, then Gastly loses 35 HP.',
        target: 'single-enemy', energy: [Energy.NINJUTSU, Energy.GENJUTSU], cooldown: 0,
        moveType: Type.GHOST, classes: ['Ghost', 'Special', 'Affliction', 'Instant'],
        effects: [
            { kind: 'fixed-affliction-damage', amount: 15 },
            { kind: 'status', status: curseMark(false) },
            { kind: 'health-loss', scope: 'self', amount: 35 },
        ],
    }),
    skill({
        id: 'gastly-spite', name: 'Spite',
        description: 'For two turns, grants the target 50% damage reduction and adds 10 to incoming non-fixed damage.',
        target: 'single-enemy', energy: [Energy.GENJUTSU, Energy.RANDOM], cooldown: 3,
        moveType: Type.GHOST, classes: ['Ghost', 'Strategic', 'Instant'],
        effects: [{ kind: 'status', status: {
            id: 'gastly-spite-dampen', name: 'Spite', hidden: false, harmful: true,
            durationActions: 3, damageReductionPercent: 50, damageTakenBonusFlat: 10,
        } }],
    }),
    skill({
        id: 'gastly-glare', name: 'Glare',
        description: 'The next used skill deals 15 affliction damage to them.',
        target: 'single-enemy', energy: [Energy.GENJUTSU], cooldown: 2,
        moveType: Type.NORMAL, classes: ['Normal', 'Special', 'Affliction', 'Instant'],
        effects: [{ kind: 'status', status: {
            id: 'gastly-glare-lock', name: 'Glare', hidden: false, harmful: true,
            durationActions: 3, guardBroken: true, paralyzeCooldowns: true,
            onUseSkill: { damageToOwner: 15, requireFirstSkillUse: true, consume: true },
        } }],
    }),
    skill({
        id: 'haunter-lick', name: 'Lick',
        description: 'Deals 20 affliction damage. Its 2% harmful-skill stun chance gains 2% for every missing HP.',
        target: 'single-enemy', energy: [Energy.NINJUTSU], cooldown: 0,
        moveType: Type.GHOST, classes: ['Ghost', 'Special', 'Affliction', 'Instant'],
        ignoreDamageReduction: true,
        effects: [
            { kind: 'damage', amount: 20, damageKind: 'affliction' },
            { kind: 'status', chance: 2, chancePerMissingHp: 2, status: {
                id: 'haunter-lick-lock', name: 'Lick', hidden: false, harmful: true,
                durationActions: 1, stunHarmful: true,
            } },
        ],
    }),
    skill({
        id: 'haunter-curse', name: 'Curse',
        description: 'Immediately and permanently curses one enemy for 20 affliction damage, then Haunter loses 35 HP.',
        target: 'single-enemy', energy: [Energy.NINJUTSU, Energy.GENJUTSU], cooldown: 0,
        moveType: Type.GHOST, classes: ['Ghost', 'Special', 'Affliction', 'Instant'],
        effects: [
            { kind: 'fixed-affliction-damage', amount: 20 },
            { kind: 'status', status: curseMark(true) },
            { kind: 'health-loss', scope: 'self', amount: 35 },
        ],
    }),
    skill({
        id: 'haunter-spite', name: 'Spite',
        description: 'For two turns, grants the target 75% damage reduction and adds 15 to incoming non-fixed damage.',
        target: 'single-enemy', energy: [Energy.GENJUTSU, Energy.RANDOM], cooldown: 3,
        moveType: Type.GHOST, classes: ['Ghost', 'Strategic', 'Instant'],
        effects: [{ kind: 'status', status: {
            id: 'haunter-spite-dampen', name: 'Haunter Spite', hidden: false, harmful: true,
            durationActions: 3, damageReductionPercent: 75, damageTakenBonusFlat: 15,
        } }],
    }),
    skill({
        id: 'haunter-glare', name: 'Glare',
        description: 'Guard Breaks and paralyzes cooldowns for three turns; the next new skill used costs 25 HP.',
        target: 'single-enemy', energy: [Energy.GENJUTSU], cooldown: 3,
        moveType: Type.NORMAL, classes: ['Normal', 'Special', 'Affliction', 'Instant'],
        effects: [{ kind: 'status', status: {
            id: 'haunter-glare-lock', name: 'Haunter Glare', hidden: false, harmful: true,
            durationActions: 5, guardBroken: true, paralyzeCooldowns: true,
            onUseSkill: { damageToOwner: 25, requireFirstSkillUse: true, consume: true },
        } }],
    }),
];

const futureSightMark = (evolved = false) => ({
    id: 'abra-future-sight-mark',
    name: 'Future Sight',
    hidden: false,
    harmful: true,
    durationActions: evolved ? 1 : 2,
    durationAnchor: 'target',
    replaceExisting: true,
    sourceSkillId: evolved ? 'kadabra-future-sight' : 'abra-future-sight',
    onExpireDamage: evolved ? 30 : 25,
    onExpireDamageKind: 'fixed-piercing',
});

const calmMindState = (evolved = false) => ({
    id: 'abra-calm-mind-state',
    name: 'Calm Mind',
    hidden: false,
    harmful: false,
    durationActions: 3,
    durationAnchor: 'source',
    replaceExisting: true,
    damageReductionPercent: evolved ? 15 : 10,
    damageBonusFlat: evolved ? 10 : 5,
});

const teleportCover = (evolved = false) => ({
    id: 'abra-teleport-cover',
    name: evolved ? 'Kadabra Teleport' : 'Teleport',
    hidden: false,
    harmful: false,
    durationActions: 1,
    durationAnchor: 'source',
    replaceExisting: true,
    invulnerable: true,
});

const abraSkills = [
    skill({
        id: 'abra-future-sight', name: 'Future Sight',
        description: 'Marks one enemy for two target turns, then deals 25 piercing damage when the mark expires.',
        target: 'single-enemy', energy: [Energy.NINJUTSU], cooldown: 2,
        moveType: Type.PSYCHIC, classes: ['Psychic', 'Special', 'Instant'],
        effects: [{ kind: 'status', status: futureSightMark(false) }],
    }),
    skill({
        id: 'abra-psychic', name: 'Psychic',
        description: 'Deals 25 damage, plus 20 more while the target has Future Sight.',
        target: 'single-enemy', energy: [Energy.GENJUTSU, Energy.RANDOM], cooldown: 0,
        moveType: Type.PSYCHIC, classes: ['Psychic', 'Special', 'Instant'],
        effects: [
            { kind: 'damage', amount: 25, damageKind: 'normal' },
            { kind: 'damage', amount: 20, damageKind: 'normal', requiresTargetStatus: 'abra-future-sight-mark' },
        ],
    }),
    skill({
        id: 'abra-calm-mind', name: 'Calm Mind',
        description: 'For three Abra turns, gains 10% damage reduction and adds 5 damage to each damage packet.',
        target: 'self', energy: [Energy.GENJUTSU], cooldown: 0,
        moveType: Type.PSYCHIC, classes: ['Psychic', 'Special', 'Instant'], harmful: false,
        effects: [
            { kind: 'status', status: calmMindState(false) },
            { kind: 'increment-actor-counter', counter: 'evolution', maximum: 3 },
        ],
    }),
    skill({
        id: 'abra-teleport', name: 'Teleport',
        description: 'Abra and one selected ally become invulnerable through the next enemy turn.',
        target: 'single-ally', energy: [Energy.RANDOM, Energy.RANDOM], cooldown: 4,
        moveType: Type.PSYCHIC, classes: ['Psychic', 'Special', 'Instant'], harmful: false,
        effects: [{ kind: 'status', scope: 'selected-and-self', status: teleportCover(false) }],
    }),
    skill({
        id: 'kadabra-future-sight', name: 'Future Sight',
        description: 'Marks one enemy for one target turn, then deals 30 piercing damage when the mark expires.',
        target: 'single-enemy', energy: [Energy.NINJUTSU], cooldown: 1,
        moveType: Type.PSYCHIC, classes: ['Psychic', 'Special', 'Instant'],
        effects: [{ kind: 'status', status: futureSightMark(true) }],
    }),
    skill({
        id: 'kadabra-psychic', name: 'Psychic',
        description: 'Deals 30 damage, plus 20 and a full skill stun while the target has Future Sight.',
        target: 'single-enemy', energy: [Energy.GENJUTSU, Energy.RANDOM], cooldown: 0,
        moveType: Type.PSYCHIC, classes: ['Psychic', 'Special', 'Instant'],
        effects: [
            { kind: 'damage', amount: 30, damageKind: 'normal' },
            { kind: 'damage', amount: 20, damageKind: 'normal', requiresTargetStatus: 'abra-future-sight-mark' },
            { kind: 'status', requiresTargetStatus: 'abra-future-sight-mark', status: {
                id: 'kadabra-psychic-stun', name: 'Psychic Stun', hidden: false, harmful: true,
                durationActions: 1, cannotUseSkills: true,
            } },
        ],
    }),
    skill({
        id: 'kadabra-calm-mind', name: 'Calm Mind',
        description: 'For three Kadabra turns, gains 15% damage reduction and adds 10 damage to each damage packet.',
        target: 'self', energy: [Energy.GENJUTSU], cooldown: 0,
        moveType: Type.PSYCHIC, classes: ['Psychic', 'Special', 'Instant'], harmful: false,
        effects: [
            { kind: 'status', status: calmMindState(true) },
            { kind: 'increment-actor-counter', counter: 'evolution', maximum: 3 },
        ],
    }),
    skill({
        id: 'kadabra-teleport', name: 'Teleport',
        description: 'Kadabra and one selected ally become invulnerable and remove enemy statuses affecting them.',
        target: 'single-ally', energy: [Energy.RANDOM, Energy.RANDOM], cooldown: 4,
        moveType: Type.PSYCHIC, classes: ['Psychic', 'Special', 'Instant'], harmful: false,
        effects: [
            { kind: 'status', scope: 'selected-and-self', status: teleportCover(true) },
            { kind: 'cleanse-enemy-statuses', scope: 'selected-and-self' },
        ],
    }),
];

const metalClawBonus = (evolved = false) => ({
    id: 'krabby-metal-claw-bonus',
    name: 'Metal Claw Bonus',
    hidden: false,
    harmful: false,
    durationActions: null,
    nonAfflictionDamageBonusFlat: evolved ? 10 : 5,
    mergeNumericFields: ['nonAfflictionDamageBonusFlat'],
});

const drenched = (evolved = false) => ({
    id: evolved ? 'kingler-bubble-drenched' : 'krabby-bubble-drenched',
    name: 'Drenched',
    hidden: false,
    harmful: true,
    durationActions: 2,
    durationAnchor: 'source',
    replaceExisting: true,
    physicalDamageTakenBonusFlat: evolved ? 15 : 10,
    randomCostIncrease: 1,
});

const hardenShieldStatus = {
    id: 'krabby-harden-defense',
    name: 'Harden Shield',
    hidden: false,
    harmful: false,
    durationActions: null,
    mergeNumericFields: ['trackedShieldPoints'],
    removeWhenTrackedShieldExhausted: true,
    turnStartActorCounter: { counter: 'evolution', maximum: 3 },
};

const hardenGuard = (evolved = false) => ({
    id: 'krabby-harden-guard',
    name: 'Harden',
    hidden: false,
    harmful: false,
    durationActions: 2,
    durationAnchor: 'source',
    replaceExisting: true,
    damageReductionPercent: evolved ? 50 : 25,
});

const krabbySkills = [
    skill({
        id: 'krabby-metal-claw', name: 'Metal Claw',
        description: 'Deals 20 piercing damage with a 30% chance to permanently add 5 non-affliction damage.',
        target: 'single-enemy', energy: [Energy.TAIJUTSU], cooldown: 0,
        moveType: Type.STEEL, classes: ['Steel', 'Physical', 'Instant'],
        effects: [
            { kind: 'damage', amount: 20, damageKind: 'normal-ignore-reduction' },
            { kind: 'source-status', chance: 30, status: metalClawBonus(false) },
        ],
    }),
    skill({
        id: 'krabby-leer', name: 'Bubble',
        description: 'Deals 20 damage, increases active cooldowns by 1, and Drenches the target for two Krabby turns.',
        target: 'single-enemy', energy: [Energy.RANDOM], cooldown: 3,
        moveType: Type.WATER, classes: ['Water', 'Strategic', 'Instant'],
        effects: [
            { kind: 'damage', amount: 20, damageKind: 'normal' },
            { kind: 'modify-cooldowns', amount: 1 },
            { kind: 'status', status: drenched(false) },
        ],
    }),
    skill({
        id: 'krabby-crabhammer', name: 'Crabhammer',
        description: 'Deals 25 damage and stuns all skills; it has a 30% chance to deal 15 additional damage.',
        target: 'single-enemy', energy: [Energy.BLOODLINE, Energy.RANDOM], cooldown: 2,
        moveType: Type.WATER, classes: ['Water', 'Physical', 'Instant'],
        effects: [
            { kind: 'damage', amount: 25, damageKind: 'normal' },
            { kind: 'status', status: {
                id: 'krabby-crabhammer-stun', name: 'Crabhammer Stun', hidden: false, harmful: true,
                durationActions: 1, cannotUseSkills: true,
            } },
            { kind: 'damage', amount: 15, damageKind: 'normal', chance: 30 },
        ],
    }),
    skill({
        id: 'krabby-harden', name: 'Harden',
        description: 'Adds 20 permanent tracked shield and grants 25% damage reduction for two Krabby turns.',
        target: 'self', energy: [Energy.RANDOM], cooldown: 4,
        moveType: Type.NORMAL, classes: ['Normal', 'Strategic', 'Instant'], harmful: false,
        effects: [
            { kind: 'shield', amount: 20, trackedStatus: hardenShieldStatus },
            { kind: 'status', status: hardenGuard(false) },
        ],
    }),
    skill({
        id: 'kingler-metal-claw', name: 'Metal Claw',
        description: 'Deals 30 piercing damage with a 30% chance to permanently add 10 non-affliction damage.',
        target: 'single-enemy', energy: [Energy.TAIJUTSU, Energy.RANDOM], cooldown: 0,
        moveType: Type.STEEL, classes: ['Steel', 'Physical', 'Instant'],
        effects: [
            { kind: 'damage', amount: 30, damageKind: 'normal-ignore-reduction' },
            { kind: 'source-status', chance: 30, status: metalClawBonus(true) },
        ],
    }),
    skill({
        id: 'kingler-leer', name: 'Bubble',
        description: 'Deals 25 to one enemy and 10 to the others, increases active cooldowns by 2, and Drenches the main target.',
        target: 'single-enemy', energy: [Energy.RANDOM], cooldown: 3,
        moveType: Type.WATER, classes: ['Water', 'Strategic', 'Instant'],
        effects: [
            { kind: 'damage', amount: 25, damageKind: 'normal' },
            { kind: 'damage', scope: 'other-enemies', amount: 10, damageKind: 'normal' },
            { kind: 'modify-cooldowns', amount: 2 },
            { kind: 'status', status: drenched(true) },
        ],
    }),
    skill({
        id: 'kingler-crabhammer', name: 'Crabhammer',
        description: 'Deals 40 damage and stuns all skills; it has a 30% chance to deal 15 additional damage.',
        target: 'single-enemy', energy: [Energy.BLOODLINE, Energy.BLOODLINE], cooldown: 2,
        moveType: Type.WATER, classes: ['Water', 'Physical', 'Instant'],
        effects: [
            { kind: 'damage', amount: 40, damageKind: 'normal' },
            { kind: 'status', status: {
                id: 'krabby-crabhammer-stun', name: 'Crabhammer Stun', hidden: false, harmful: true,
                durationActions: 1, cannotUseSkills: true,
            } },
            { kind: 'damage', amount: 15, damageKind: 'normal', chance: 30 },
        ],
    }),
    skill({
        id: 'kingler-harden', name: 'Harden',
        description: 'Adds 30 permanent tracked shield and grants 50% damage reduction for two Kingler turns.',
        target: 'self', energy: [Energy.RANDOM, Energy.RANDOM], cooldown: 4,
        moveType: Type.NORMAL, classes: ['Normal', 'Strategic', 'Instant'], harmful: false,
        effects: [
            { kind: 'shield', amount: 30, trackedStatus: hardenShieldStatus },
            { kind: 'status', status: hardenGuard(true) },
        ],
    }),
];

const scytherSkills = [
    skill({
        id: 'scyther-fury-cutter', name: 'Fury Cutter',
        description: 'Deals 15 plus 5 per permanent stack, gains one stack on damage, and pierces during Swords Dance.',
        target: 'single-enemy', energy: [Energy.TAIJUTSU], cooldown: 0,
        moveType: Type.BUG, classes: ['Bug', 'Physical', 'Instant'],
        effects: [
            {
                kind: 'damage', amount: 15, damageKind: 'normal',
                unlessActorStatus: 'scyther-swords-dance-active',
                bonusPerCounter: { counter: 'fury-cutter', multiplier: 5 },
                actorCounterOnDamage: { counter: 'fury-cutter', delta: 1, maximum: 99 },
            },
            {
                kind: 'damage', amount: 15, damageKind: 'normal-ignore-reduction',
                requiresActorStatus: 'scyther-swords-dance-active',
                bonusPerCounter: { counter: 'fury-cutter', multiplier: 5 },
                actorCounterOnDamage: { counter: 'fury-cutter', delta: 2, maximum: 99 },
            },
        ],
    }),
    skill({
        id: 'scyther-swords-dance', name: 'Swords Dance',
        description: 'For three Scyther turns, every damaging packet gains 10 damage and X-Cutter gains 25% critical chance.',
        target: 'self', energy: [Energy.RANDOM], cooldown: 4,
        moveType: Type.NORMAL, classes: ['Normal', 'Physical', 'Instant'], harmful: false,
        effects: [{ kind: 'status', status: {
            id: 'scyther-swords-dance-active', name: 'Swords Dance', hidden: false, harmful: false,
            durationActions: 3, durationAnchor: 'source', replaceExisting: true,
            damageBonusFlat: 10,
        } }],
    }),
    skill({
        id: 'scyther-x-cutter', name: 'X-Cutter',
        description: 'Deals 40 piercing damage with layered 25% critical chances from low target HP, low Scyther HP, and Swords Dance.',
        target: 'single-enemy', energy: [Energy.TAIJUTSU, Energy.TAIJUTSU], cooldown: 2,
        moveType: Type.BUG, classes: ['Bug', 'Physical', 'Instant'],
        effects: [
            { kind: 'damage', amount: 40, damageKind: 'normal-ignore-reduction' },
            {
                kind: 'chance', percent: 25,
                chanceBonusIfInitialTargetHpAtMost: { threshold: 50, amount: 25 },
                chanceBonusIfActorStatus: { statusId: 'scyther-swords-dance-active', amount: 25 },
                effects: [
                    { kind: 'damage', amount: 15, damageKind: 'normal-ignore-reduction' },
                    {
                        kind: 'damage', amount: 40, damageKind: 'normal-ignore-reduction',
                        requiresActorStatus: 'scyther-swords-dance-active', initialTargetHpAtMost: 50,
                    },
                    {
                        kind: 'damage', amount: 15, damageKind: 'normal-ignore-reduction',
                        requiresActorStatus: 'scyther-swords-dance-active', initialTargetHpAtMost: 50,
                    },
                ],
            },
        ],
    }),
    skill({
        id: 'scyther-double-team', name: 'Double Team',
        description: 'Grants 100% evasion through Scyther next turn and refreshes if Scyther defeats an enemy.',
        target: 'self', energy: [Energy.RANDOM], cooldown: 5,
        moveType: Type.NORMAL, classes: ['Normal', 'Physical', 'Instant'], harmful: false,
        effects: [{ kind: 'status', status: {
            id: 'scyther-double-team-active', name: 'Double Team', hidden: false, harmful: false,
            durationActions: 2, durationAnchor: 'source', replaceExisting: true,
            evadeChancePercent: 100, onOwnerKillExtendDuration: 1,
        } }],
    }),
];

const eeveeSkills = [
    skill({
        id: 'eevee-dig', name: 'Dig',
        description: 'Eevee becomes invulnerable through the enemy turn and deals 30 damage to one enemy.',
        target: 'single-enemy', energy: [Energy.RANDOM, Energy.RANDOM], cooldown: 2,
        moveType: Type.GROUND, classes: ['Ground', 'Physical', 'Instant'],
        effects: [
            { kind: 'source-status', status: {
                id: 'eevee-dig-invulnerable', name: 'Dig', hidden: false, harmful: false,
                durationActions: 1, durationAnchor: 'source', replaceExisting: true, invulnerable: true,
            } },
            { kind: 'damage', amount: 30, damageKind: 'normal' },
        ],
    }),
    skill({
        id: 'eevee-swift', name: 'Swift',
        description: 'Deals 15 damage to every enemy.',
        target: 'all-enemy', energy: [Energy.RANDOM, Energy.RANDOM], cooldown: 1,
        moveType: Type.NORMAL, classes: ['Normal', 'Special', 'Instant'],
        effects: [{ kind: 'damage', scope: 'all-enemy', amount: 15, damageKind: 'normal' }],
    }),
    skill({
        id: 'eevee-hidden-power', name: 'Hidden Power',
        description: 'Independently chooses a random enemy for 30 affliction, 20 piercing, and 10 normal damage.',
        target: 'random-enemy', energy: [Energy.RANDOM, Energy.RANDOM, Energy.RANDOM], cooldown: 2,
        moveType: Type.NORMAL, classes: ['Normal', 'Special', 'Affliction', 'Instant'],
        effects: [
            { kind: 'damage', scope: 'random-enemy', amount: 30, damageKind: 'affliction', ignoreDamageReduction: true },
            { kind: 'damage', scope: 'random-enemy', amount: 20, damageKind: 'normal-ignore-reduction' },
            { kind: 'damage', scope: 'random-enemy', amount: 10, damageKind: 'normal' },
        ],
    }),
    skill({
        id: 'eevee-protect', name: 'Protect',
        description: 'Makes one other ally invulnerable through the enemy turn.',
        target: 'single-ally', energy: [Energy.RANDOM], cooldown: 2,
        moveType: Type.NORMAL, classes: ['Normal', 'Special', 'Instant'], harmful: false,
        effects: [{ kind: 'status', status: {
            id: 'eevee-protect-invulnerable', name: 'Protect', hidden: false, harmful: false,
            durationActions: 1, durationAnchor: 'source', replaceExisting: true, invulnerable: true,
        } }],
    }),
];

const jolteonSkills = [
    skill({
        id: 'jolteon-pin-missile', name: 'Pin Missile',
        description: 'Deals 15 piercing damage to all enemies, increases their next-skill cooldowns, and retaliates against enemies targeting Jolteon.',
        target: 'all-enemy', energy: [Energy.TAIJUTSU], cooldown: 1,
        moveType: Type.BUG, classes: ['Bug', 'Physical', 'Instant'],
        effects: [
            { kind: 'damage', scope: 'all-enemy', amount: 15, damageKind: 'normal-ignore-reduction' },
            { kind: 'status', scope: 'all-enemy', status: {
                id: 'jolteon-pin-missile-cooldown-increase', name: 'Pin Missile',
                hidden: false, harmful: true, durationActions: 1, durationAnchor: 'target',
                newSkillCooldownIncrease: 1,
            } },
            { kind: 'source-status', status: {
                id: 'jolteon-pin-missile-static', name: 'Pin Missile Static',
                hidden: false, harmful: false, durationActions: 1, durationAnchor: 'source',
                replaceExisting: true,
                onEnemyTargeted: {
                    harmfulOnly: true, damageToActor: 15, damageKind: 'normal-ignore-reduction',
                },
            } },
        ],
    }),
    skill({
        id: 'jolteon-thunderbolt', name: 'Thunderbolt',
        description: 'Deals 30 piercing damage and paralyzes the first enemy that next uses a harmful skill on Jolteon.',
        target: 'single-enemy', energy: [Energy.GENJUTSU, Energy.RANDOM], cooldown: 1,
        moveType: Type.ELECTRIC, classes: ['Electric', 'Special', 'Instant'],
        effects: [
            { kind: 'damage', amount: 30, damageKind: 'normal-ignore-reduction' },
            { kind: 'source-status', status: {
                id: 'jolteon-thunderbolt-paralyze-trap', name: 'Thunderbolt Trap',
                hidden: false, harmful: false, durationActions: 1, durationAnchor: 'source',
                replaceExisting: true,
                onEnemyTargeted: {
                    harmfulOnly: true, consumeOnTrigger: true,
                    statusOnActor: {
                        id: 'jolteon-thunderbolt-cooldown-paralysis', name: 'Thunderbolt Paralysis',
                        hidden: false, harmful: true, durationActions: 2, durationAnchor: 'target',
                        paralyzeCooldowns: true,
                    },
                },
            } },
        ],
    }),
    skill({
        id: 'jolteon-thunder-fang', name: 'Thunder Fang',
        description: 'Deals 35 piercing damage, stuns for one turn, and permanently increases new-skill cooldowns by one.',
        target: 'single-enemy', energy: [Energy.TAIJUTSU, Energy.GENJUTSU], cooldown: 2,
        moveType: Type.ELECTRIC, classes: ['Electric', 'Special', 'Instant'],
        effects: [
            { kind: 'damage', amount: 35, damageKind: 'normal-ignore-reduction' },
            { kind: 'status', status: {
                id: 'jolteon-thunder-fang-stun', name: 'Thunder Fang Stun',
                hidden: false, harmful: true, durationActions: 1, durationAnchor: 'target',
                cannotUseSkills: true,
            } },
            { kind: 'status', status: {
                id: 'jolteon-thunder-fang-cooldown-increase', name: 'Thunder Fang Slow',
                hidden: false, harmful: true, durationActions: null,
                newSkillCooldownIncrease: 1,
            } },
        ],
    }),
    skill({
        id: 'jolteon-charge', name: 'Charge',
        description: 'For two Jolteon turns, gains 50% unpierceable reduction, +5 damage per packet, and reduced Electric costs.',
        target: 'self', energy: [Energy.RANDOM], cooldown: 2,
        moveType: Type.ELECTRIC, classes: ['Electric', 'Strategic', 'Channeled'], harmful: false,
        effects: [{ kind: 'status', status: {
            id: 'jolteon-charge-active', name: 'Charge', hidden: false, harmful: false,
            durationActions: 2, durationAnchor: 'source', replaceExisting: true,
            unpierceableDamageReductionPercent: 50, damageBonusFlat: 5,
            skillCostOverrides: {
                'jolteon-thunderbolt': [],
                'jolteon-thunder-fang': [Energy.TAIJUTSU],
            },
        } }],
    }),
];

const flareonHeatingDefense = {
    id: 'flareon-heating-up-defense', name: 'Heating Up Defense',
    hidden: false, harmful: false, durationActions: null,
    mergeNumericFields: ['trackedShieldPoints'], removeWhenTrackedShieldExhausted: true,
};

const flareonSkills = [
    skill({
        id: 'flareon-heating-up', name: 'Heating Up',
        description: 'Adds 20 permanent defense and a non-stacking 5 affliction damage aura to all enemies.',
        target: 'self', energy: [Energy.BLOODLINE], cooldown: 2,
        moveType: Type.FIRE, classes: ['Fire', 'Special', 'Affliction', 'Instant'], harmful: false,
        effects: [
            { kind: 'shield', amount: 20, trackedStatus: flareonHeatingDefense },
            { kind: 'status', scope: 'all-enemy', status: {
                id: 'flareon-heating-up-burn-aura', name: 'Heating Up',
                hidden: false, harmful: true, durationActions: null,
                turnEndAnchor: 'target', turnEndDamage: 5, endIfSourceDies: true,
                turnEndDamageKind: 'affliction', turnEndMoveType: Type.FIRE,
                turnEndSkillClasses: ['Fire', 'Special', 'Affliction'],
            } },
        ],
    }),
    skill({
        id: 'flareon-fire-spin', name: 'Fire Spin',
        description: 'For three target turns, blocks helpful skills and deals 15 affliction damage each turn.',
        target: 'single-enemy', energy: [Energy.BLOODLINE, Energy.RANDOM], cooldown: 0,
        targetCannotHaveStatus: 'flareon-fire-spin-burn',
        moveType: Type.FIRE, classes: ['Fire', 'Special', 'Affliction', 'Action'],
        effects: [{ kind: 'status', status: {
            id: 'flareon-fire-spin-burn', name: 'Fire Spin', hidden: false, harmful: true,
            durationActions: 3, durationAnchor: 'target', turnEndAnchor: 'target',
            turnEndDamage: 15, endIfSourceDies: true, invulnerableToHelpfulSkills: true,
            turnEndDamageKind: 'affliction', turnEndMoveType: Type.FIRE,
            turnEndSkillClasses: ['Fire', 'Special', 'Affliction'],
        } }],
    }),
    skill({
        id: 'flareon-fire-blast', name: 'Fire Blast',
        description: 'Deals 20 affliction damage, then burns the target for 10 and every other enemy for 5 each turn.',
        target: 'single-enemy', energy: [Energy.GENJUTSU, Energy.BLOODLINE], cooldown: 2,
        moveType: Type.FIRE, classes: ['Fire', 'Special', 'Affliction', 'Instant'],
        effects: [
            { kind: 'damage', amount: 20, damageKind: 'affliction', ignoreDamageReduction: true },
            { kind: 'status', status: {
                id: 'flareon-fire-blast-burn', name: 'Fire Blast Burn',
                hidden: false, harmful: true, durationActions: null,
                turnEndAnchor: 'target', turnEndDamage: 10, endIfSourceDies: true,
                turnEndDamageKind: 'affliction', turnEndMoveType: Type.FIRE,
                turnEndSkillClasses: ['Fire', 'Special', 'Affliction'],
            } },
            { kind: 'status', scope: 'all-other-enemies', status: {
                id: 'flareon-fire-blast-splash-burn', name: 'Fire Blast Splash',
                hidden: false, harmful: true, durationActions: null,
                turnEndAnchor: 'target', turnEndDamage: 5, endIfSourceDies: true,
                turnEndDamageKind: 'affliction', turnEndMoveType: Type.FIRE,
                turnEndSkillClasses: ['Fire', 'Special', 'Affliction'],
            } },
        ],
    }),
    skill({
        id: 'flareon-double-team', name: 'Double Team',
        description: 'Flareon becomes invulnerable through the enemy turn.',
        target: 'self', energy: [Energy.RANDOM], cooldown: 4,
        moveType: Type.NORMAL, classes: ['Normal', 'Strategic', 'Instant'], harmful: false,
        effects: [{ kind: 'status', status: {
            id: 'flareon-double-team-invulnerable', name: 'Double Team',
            hidden: false, harmful: false, durationActions: 1, durationAnchor: 'source',
            replaceExisting: true, invulnerable: true,
        } }],
    }),
];

const vaporeonSkills = [
    skill({
        id: 'vaporeon-aurora-beam', name: 'Aurora Beam',
        description: 'Damages and weakens an enemy, or heals and empowers one other ally.',
        target: 'single-enemy-or-ally', energy: [Energy.TAIJUTSU], cooldown: 0,
        moveType: Type.ICE, classes: ['Ice', 'Special', 'Instant'],
        effects: [
            { kind: 'damage', amount: 20, damageKind: 'normal', targetRelation: 'enemy' },
            {
                kind: 'damage', amount: 10, damageKind: 'normal', targetRelation: 'enemy',
                requiresTargetStatus: 'vaporeon-sand-attack-blind',
            },
            { kind: 'status', targetRelation: 'enemy', status: {
                id: 'vaporeon-aurora-beam-weakened', name: 'Aurora Beam Weakened',
                hidden: false, harmful: true, durationActions: 1, durationAnchor: 'target',
                nonAfflictionDamageBonusFlat: -5,
            } },
            { kind: 'heal', amount: 20, targetRelation: 'ally' },
            { kind: 'status', targetRelation: 'ally', status: {
                id: 'vaporeon-aurora-beam-empowered', name: 'Aurora Beam Empowered',
                hidden: false, harmful: false, durationActions: 1, durationAnchor: 'target',
                nonAfflictionDamageBonusFlat: 5,
            } },
        ],
    }),
    skill({
        id: 'vaporeon-sand-attack', name: 'Sand-Attack',
        description: 'Blinds one enemy toward Vaporeon team and discounts Hydro Pump through Vaporeon next turn.',
        target: 'single-enemy', energy: [Energy.RANDOM], cooldown: 3,
        moveType: Type.GROUND, classes: ['Ground', 'Physical', 'Instant'],
        effects: [
            { kind: 'status', status: {
                id: 'vaporeon-sand-attack-blind', name: 'Sand-Attack',
                hidden: false, harmful: true, durationActions: 1, durationAnchor: 'target',
                harmfulBlindToSourceTeam: true,
            } },
            { kind: 'source-status', status: {
                id: 'vaporeon-sand-attack-hydro-discount', name: 'Hydro Pump Discount',
                hidden: false, harmful: false, durationActions: 1, durationAnchor: 'source',
                replaceExisting: true,
                skillCostOverrides: { 'vaporeon-hydro-pump': [Energy.TAIJUTSU] },
            } },
        ],
    }),
    skill({
        id: 'vaporeon-hydro-pump', name: 'Hydro Pump',
        description: 'Deals 35 damage to one enemy and heals every ally for 15 HP.',
        target: 'single-enemy', energy: [Energy.TAIJUTSU, Energy.NINJUTSU], cooldown: 2,
        moveType: Type.WATER, classes: ['Water', 'Physical', 'Instant'],
        effects: [
            { kind: 'damage', amount: 35, damageKind: 'normal' },
            { kind: 'heal', scope: 'all-allies', amount: 15 },
        ],
    }),
    skill({
        id: 'vaporeon-acid-armor', name: 'Acid Armor',
        description: 'Ignores enemy skills through the enemy turn and heals the allied team when targeted by a harmful skill.',
        target: 'self', energy: [Energy.RANDOM], cooldown: 2,
        moveType: Type.POISON, classes: ['Poison', 'Special', 'Instant', 'Invisible'], harmful: false,
        effects: [{ kind: 'status', status: {
            id: 'vaporeon-acid-armor-active', name: 'Acid Armor',
            hidden: false, harmful: false, durationActions: 1, durationAnchor: 'source',
            replaceExisting: true, invulnerable: true,
            onEnemyTargeted: { harmfulOnly: true, healAllies: 5 },
        } }],
    }),
];

const badlyPoisoned = (id) => ({
    id, name: 'Badly Poisoned', hidden: false, harmful: true, affliction: true,
    durationActions: null, turnEndAnchor: 'target', turnEndDamage: 2,
    turnEndDamageKind: 'affliction',
    onUseSkill: { requireFirstSkillUse: true, doubleOwnNumericField: 'turnEndDamage' },
});

const poisonFangVenom = (amount) => ({
    id: 'ekans-poison-fang-venom', name: 'Poison Fang Venom',
    hidden: false, harmful: true, affliction: true, durationActions: null,
    turnEndAnchor: 'target', turnEndDamage: amount, turnEndDamageKind: 'affliction',
    mergeNumericFields: ['turnEndDamage'],
});

const crunchMark = (amount) => ({
    id: 'ekans-crunch-mark', name: 'Crunch', hidden: false, harmful: true,
    durationActions: 1, durationAnchor: 'source', replaceExisting: true,
    afflictionDamageTakenBonusFlat: amount,
});

const ekansSkills = [
    skill({
        id: 'ekans-poison-fang', name: 'Poison Fang',
        description: 'Deals 10 physical and 15 affliction damage; Badly Poisoned targets gain 3 permanent stacking affliction damage.',
        target: 'single-enemy', energy: [Energy.BLOODLINE, Energy.RANDOM], cooldown: 1,
        moveType: Type.POISON, classes: ['Poison', 'Physical', 'Affliction', 'Instant'],
        effects: [
            { kind: 'damage', amount: 10, damageKind: 'normal' },
            { kind: 'damage', amount: 15, damageKind: 'affliction', ignoreDamageReduction: true },
            {
                kind: 'status',
                requiresAnyTargetStatus: ['ekans-badly-poison', 'ekans-badly-poison-2'],
                status: poisonFangVenom(3),
            },
        ],
    }),
    skill({
        id: 'ekans-toxic', name: 'Toxic',
        description: 'Deals 2 affliction damage and applies one permanent Badly Poison stack that doubles after each newly used skill.',
        target: 'single-enemy', energy: [Energy.BLOODLINE], cooldown: 2,
        moveType: Type.POISON, classes: ['Poison', 'Special', 'Affliction', 'Instant'],
        effects: [
            { kind: 'damage', amount: 2, damageKind: 'affliction', ignoreDamageReduction: true },
            { kind: 'status', unlessInitialTargetStatus: 'ekans-badly-poison', status: badlyPoisoned('ekans-badly-poison') },
        ],
    }),
    skill({
        id: 'ekans-shed-skin', name: 'Shed Skin',
        description: 'Removes enemy affliction effects and heals 15 HP at the end of each of the next two Ekans turns.',
        target: 'self', energy: [Energy.RANDOM, Energy.RANDOM], cooldown: 3,
        moveType: Type.POISON, classes: ['Poison', 'Physical', 'Action'], harmful: false,
        effects: [
            { kind: 'cleanse-enemy-affliction', scope: 'self' },
            { kind: 'source-status', status: {
                id: 'ekans-shed-skin-regen', name: 'Shed Skin', hidden: false, harmful: false,
                durationActions: 2, durationAnchor: 'source', turnEndAnchor: 'source',
                turnEndHeal: 15, skipTurnEndOnAppliedTurn: true, replaceExisting: true,
            } },
        ],
    }),
    skill({
        id: 'ekans-crunch', name: 'Crunch',
        description: 'Adds 10 affliction damage taken through Ekans next turn and executes at 25 HP, evolving Ekans into Arbok.',
        target: 'single-enemy', energy: [Energy.BLOODLINE], cooldown: 3,
        moveType: Type.DARK, classes: ['Dark', 'Special', 'Affliction', 'Instant', 'Bypassing'],
        effects: [
            { kind: 'status', status: crunchMark(10) },
            { kind: 'execute', initialTargetHpAtMost: 25, evolveActorForm: 'arbok' },
        ],
    }),
    skill({
        id: 'arbok-poison-fang', name: 'Poison Fang',
        description: 'Deals 25 physical and 20 affliction damage; Badly Poisoned targets gain 6 permanent stacking affliction damage.',
        target: 'single-enemy', energy: [Energy.BLOODLINE, Energy.RANDOM, Energy.RANDOM], cooldown: 1,
        moveType: Type.POISON, classes: ['Poison', 'Physical', 'Affliction', 'Instant'],
        effects: [
            { kind: 'damage', amount: 25, damageKind: 'normal' },
            { kind: 'damage', amount: 20, damageKind: 'affliction', ignoreDamageReduction: true },
            {
                kind: 'status',
                requiresAnyTargetStatus: ['ekans-badly-poison', 'ekans-badly-poison-2'],
                status: poisonFangVenom(6),
            },
        ],
    }),
    skill({
        id: 'arbok-toxic', name: 'Toxic',
        description: 'Deals 2 affliction damage and adds up to two independently doubling Badly Poison stacks.',
        target: 'single-enemy', energy: [Energy.BLOODLINE], cooldown: 2,
        moveType: Type.POISON, classes: ['Poison', 'Special', 'Affliction', 'Instant'],
        effects: [
            { kind: 'damage', amount: 2, damageKind: 'affliction', ignoreDamageReduction: true },
            {
                kind: 'status', unlessInitialTargetStatus: 'ekans-badly-poison',
                status: badlyPoisoned('ekans-badly-poison'),
            },
            {
                kind: 'status', requiresInitialTargetStatus: 'ekans-badly-poison',
                unlessInitialTargetStatus: 'ekans-badly-poison-2',
                status: badlyPoisoned('ekans-badly-poison-2'),
            },
        ],
    }),
    skill({
        id: 'arbok-shed-skin', name: 'Shed Skin',
        description: 'Removes enemy affliction effects and heals 25 HP at the end of each of the next two Arbok turns.',
        target: 'self', energy: [Energy.RANDOM, Energy.RANDOM], cooldown: 3,
        moveType: Type.POISON, classes: ['Poison', 'Physical', 'Action'], harmful: false,
        effects: [
            { kind: 'cleanse-enemy-affliction', scope: 'self' },
            { kind: 'source-status', status: {
                id: 'ekans-shed-skin-regen', name: 'Shed Skin', hidden: false, harmful: false,
                durationActions: 2, durationAnchor: 'source', turnEndAnchor: 'source',
                turnEndHeal: 25, skipTurnEndOnAppliedTurn: true, replaceExisting: true,
            } },
        ],
    }),
    skill({
        id: 'arbok-crunch', name: 'Crunch',
        description: 'Adds 15 affliction damage taken through Arbok next turn and executes at 35 HP.',
        target: 'single-enemy', energy: [Energy.BLOODLINE], cooldown: 3,
        moveType: Type.DARK, classes: ['Dark', 'Special', 'Affliction', 'Instant', 'Bypassing'],
        effects: [
            { kind: 'status', status: crunchMark(15) },
            { kind: 'execute', initialTargetHpAtMost: 35 },
        ],
    }),
];

const machopBulkUp = (evolved = false) => ({
    id: 'machop-bulk-up-bonus', name: 'Bulk Up', hidden: false, harmful: false,
    durationActions: null,
    machopBulkUpBonus: evolved ? 15 : 10,
    mergeNumericFields: ['machopBulkUpBonus', 'trackedShieldPoints'],
    removeWhenTrackedShieldExhausted: true,
});

const brickBreakDefenseBonus = {
    id: 'machop-brick-break-destroyed-defense-bonus', name: 'Brick Break Bonus',
    hidden: true, harmful: false, durationActions: 1, durationAnchor: 'source',
    replaceExisting: true, damageBonusFlat: 10,
};

const machopCounterMark = (evolved = false) => ({
    id: 'machop-counter-mark', name: 'Counter', hidden: true, harmful: true,
    durationActions: 1, durationAnchor: 'target', replaceExisting: true,
    counterNextNewDamagingSkill: true,
    counterDamageMultiplier: evolved ? 2 : 1,
    counterAliveBonus: evolved ? 10 : 5,
    onExpireDamage: evolved ? 10 : 5,
    onExpireDamageKind: 'fixed-piercing',
    onExpireEvolveSourceForm: evolved ? null : 'machoke',
    evolveSourceForm: evolved ? null : 'machoke',
});

const machopSkills = [
    skill({
        id: 'machop-brick-break', name: 'Brick Break',
        description: 'Destroys all enemy defense and deals 20 damage, gaining 10 damage when defense was destroyed.',
        target: 'single-enemy', energy: [Energy.NINJUTSU], cooldown: 1,
        moveType: Type.FIGHTING, classes: ['Fighting', 'Physical', 'Instant'],
        effects: [
            { kind: 'destroy-shield', actorStatusIfDestroyed: brickBreakDefenseBonus },
            {
                kind: 'damage', amount: 20, damageKind: 'normal',
                bonusFromActorStatus: { statusId: 'machop-bulk-up-bonus', field: 'machopBulkUpBonus' },
            },
            { kind: 'remove-actor-status', statusIds: ['machop-bulk-up-bonus'] },
        ],
    }),
    skill({
        id: 'machop-counter', name: 'Counter',
        description: 'Counters the target first newly used damaging skill, reflects its damage plus 5, and evolves Machop on success.',
        target: 'single-enemy', energy: [Energy.NINJUTSU], cooldown: 3,
        moveType: Type.FIGHTING, classes: ['Fighting', 'Physical', 'Instant', 'Invisible'],
        effects: [
            {
                kind: 'status', status: machopCounterMark(false),
                copyActorStatusNumeric: {
                    statusId: 'machop-bulk-up-bonus', sourceField: 'machopBulkUpBonus',
                    targetField: 'storedBulkUpBonus', addToOnExpireDamage: true,
                },
            },
            { kind: 'remove-actor-status', statusIds: ['machop-bulk-up-bonus'] },
        ],
    }),
    skill({
        id: 'machop-bulk-up', name: 'Bulk Up',
        description: 'Adds 10 permanent defense and 5 damage to the next Brick Break or Counter; the second use evolves Machop.',
        target: 'self', energy: [Energy.RANDOM], cooldown: 1,
        moveType: Type.FIGHTING, classes: ['Fighting', 'Physical', 'Instant'], harmful: false,
        effects: [
            { kind: 'shield', amount: 10, trackedStatus: machopBulkUp(false) },
            { kind: 'increment-actor-counter', counter: 'bulk-up', maximum: 2 },
        ],
    }),
    skill({
        id: 'machop-taunt', name: 'Taunt',
        description: 'For three target turns, the enemy may only use harmful targeted skills on Machop and deals 25% less Physical damage.',
        target: 'single-enemy', energy: [Energy.GENJUTSU], cooldown: 2,
        moveType: Type.DARK, classes: ['Dark', 'Special', 'Instant'],
        effects: [{ kind: 'status', status: {
            id: 'machop-taunt', name: 'Taunt', hidden: false, harmful: true,
            durationActions: 3, durationAnchor: 'target', tauntSource: true,
            damageMultiplierBySkillClass: { Physical: 0.75 },
        } }],
    }),
    skill({
        id: 'machoke-brick-break', name: 'Brick Break',
        description: 'Destroys all enemy defense and deals 35 damage; Bulk Up adds damage.',
        target: 'single-enemy', energy: [Energy.NINJUTSU, Energy.RANDOM], cooldown: 1,
        moveType: Type.FIGHTING, classes: ['Fighting', 'Physical', 'Instant'],
        effects: [
            { kind: 'destroy-shield', actorStatusIfDestroyed: brickBreakDefenseBonus },
            {
                kind: 'damage', amount: 35, damageKind: 'normal',
                bonusFromActorStatus: { statusId: 'machop-bulk-up-bonus', field: 'machopBulkUpBonus' },
            },
            { kind: 'remove-actor-status', statusIds: ['machop-bulk-up-bonus'] },
        ],
    }),
    skill({
        id: 'machoke-counter', name: 'Counter',
        description: 'Counters the target first newly used damaging skill, reflects twice its damage, and adds 10 while Machoke lives.',
        target: 'single-enemy', energy: [Energy.NINJUTSU], cooldown: 3,
        moveType: Type.FIGHTING, classes: ['Fighting', 'Physical', 'Instant', 'Invisible'],
        effects: [
            {
                kind: 'status', status: machopCounterMark(true),
                copyActorStatusNumeric: {
                    statusId: 'machop-bulk-up-bonus', sourceField: 'machopBulkUpBonus',
                    targetField: 'storedBulkUpBonus', addToOnExpireDamage: true,
                },
            },
            { kind: 'remove-actor-status', statusIds: ['machop-bulk-up-bonus'] },
        ],
    }),
    skill({
        id: 'machoke-bulk-up', name: 'Bulk Up',
        description: 'Adds 20 permanent defense and 10 damage to Machoke next Brick Break or Counter.',
        target: 'self', energy: [Energy.RANDOM, Energy.RANDOM], cooldown: 1,
        moveType: Type.FIGHTING, classes: ['Fighting', 'Physical', 'Instant'], harmful: false,
        effects: [{ kind: 'shield', amount: 20, trackedStatus: machopBulkUp(true) }],
    }),
    skill({
        id: 'machoke-taunt', name: 'Taunt',
        description: 'For three target turns, the enemy may only use harmful targeted skills on Machoke and deals 25% less Physical damage.',
        target: 'single-enemy', energy: [Energy.GENJUTSU], cooldown: 3,
        moveType: Type.DARK, classes: ['Dark', 'Special', 'Instant'],
        effects: [{ kind: 'status', status: {
            id: 'machop-taunt', name: 'Taunt', hidden: false, harmful: true,
            durationActions: 3, durationAnchor: 'target', tauntSource: true,
            damageMultiplierBySkillClass: { Physical: 0.75 },
        } }],
    }),
];

const magikarpSkills = [
    skill({
        id: 'magikarp-tackle', name: 'Tackle',
        description: 'Deals 15 Physical damage to one enemy.',
        target: 'single-enemy', energy: [Energy.RANDOM], cooldown: 3,
        moveType: Type.NORMAL, classes: ['Normal', 'Physical', 'Instant'],
        effects: [{ kind: 'damage', amount: 15, damageKind: 'normal' }],
    }),
    skill({
        id: 'magikarp-splash', name: 'Splash',
        description: 'Advances Magikarp one turn toward evolving into Gyarados.',
        target: 'self', energy: [], cooldown: 3,
        moveType: Type.NORMAL, classes: ['Normal', 'Physical', 'Instant'], harmful: false,
        effects: [{ kind: 'increment-actor-counter', counter: 'evolution', maximum: 6 }],
    }),
    skill({
        id: 'magikarp-flail', name: 'Flail',
        description: 'Deals 25 Physical damage to one enemy.',
        target: 'single-enemy', energy: [Energy.RANDOM, Energy.RANDOM], cooldown: 3,
        moveType: Type.NORMAL, classes: ['Normal', 'Physical', 'Instant'],
        effects: [{ kind: 'damage', amount: 25, damageKind: 'normal' }],
    }),
    skill({
        id: 'magikarp-struggle', name: 'Struggle',
        description: 'Deals 25 Physical damage and costs Magikarp 5 HP; usable only while its other three active skills are on cooldown.',
        actorCondition: { allOtherSkillsOnCooldown: true },
        target: 'single-enemy', energy: [Energy.RANDOM], cooldown: 0,
        moveType: Type.NORMAL, classes: ['Normal', 'Physical', 'Instant'],
        effects: [
            { kind: 'damage', amount: 25, damageKind: 'normal' },
            { kind: 'health-loss', scope: 'self', amount: 5 },
        ],
    }),
    skill({
        id: 'gyarados-hyper-beam', name: 'Hyper Beam',
        description: 'Deals 65 Special damage, then prevents Gyarados from using a new skill on its next turn.',
        target: 'single-enemy', energy: [Energy.RANDOM, Energy.RANDOM, Energy.RANDOM, Energy.RANDOM], cooldown: 3,
        moveType: Type.NORMAL, classes: ['Normal', 'Special', 'Instant'],
        effects: [
            { kind: 'damage', amount: 65, damageKind: 'normal' },
            { kind: 'source-status', status: {
                id: 'gyarados-hyper-beam-lock', name: 'Hyper Beam Recovery',
                hidden: false, harmful: false, durationActions: 1, durationAnchor: 'source',
                cannotUseSkills: true,
            } },
        ],
    }),
    skill({
        id: 'gyarados-hyper-beam-affliction', name: 'Hyper Beam',
        description: 'Deals 65 affliction damage during Dragon Rage, then prevents Gyarados from using a new skill on its next turn.',
        target: 'single-enemy', energy: [Energy.RANDOM, Energy.RANDOM, Energy.RANDOM, Energy.RANDOM], cooldown: 3,
        moveType: Type.NORMAL, classes: ['Normal', 'Special', 'Instant'],
        ignoreDamageReduction: true,
        effects: [
            { kind: 'damage', amount: 65, damageKind: 'affliction' },
            { kind: 'source-status', status: {
                id: 'gyarados-hyper-beam-lock', name: 'Hyper Beam Recovery',
                hidden: false, harmful: false, durationActions: 1, durationAnchor: 'source',
                cannotUseSkills: true,
            } },
        ],
    }),
    skill({
        id: 'gyarados-dragon-rage', name: 'Dragon Rage',
        description: 'Deals 20 affliction damage at the end of this and the next two Gyarados turns; Hyper Beam becomes affliction damage for the same window.',
        target: 'single-enemy', energy: [Energy.TAIJUTSU, Energy.RANDOM], cooldown: 3,
        moveType: Type.DRAGON, classes: ['Dragon', 'Special', 'Action'],
        effects: [
            { kind: 'status', status: {
                id: 'gyarados-dragon-rage-burn', name: 'Dragon Rage',
                hidden: false, harmful: true, durationActions: 2,
                durationAnchor: 'source', turnEndAnchor: 'source',
                turnEndDamage: 20, turnEndDamageKind: 'affliction',
                replaceExisting: true,
            } },
            { kind: 'source-status', status: {
                id: 'gyarados-dragon-rage-active', name: 'Dragon Rage',
                hidden: false, harmful: false, durationActions: 2, durationAnchor: 'source',
                replaceExisting: true,
                skillReplacements: { 'gyarados-hyper-beam': 'gyarados-hyper-beam-affliction' },
            } },
        ],
    }),
    skill({
        id: 'gyarados-ice-fang', name: 'Ice Fang',
        description: 'Deals the current runtime value of 45 Physical damage through ordinary reduction and fully stuns the target for one turn.',
        target: 'single-enemy', energy: [Energy.NINJUTSU, Energy.NINJUTSU], cooldown: 1,
        moveType: Type.ICE, classes: ['Ice', 'Physical', 'Instant'],
        effects: [
            { kind: 'damage', amount: 45, damageKind: 'normal-ignore-reduction' },
            { kind: 'status', status: {
                id: 'gyarados-ice-fang-stun', name: 'Ice Fang',
                hidden: false, harmful: true, durationActions: 1, durationAnchor: 'target',
                cannotUseSkills: true,
            } },
        ],
    }),
    skill({
        id: 'gyarados-hydro-pump', name: 'Hydro Pump',
        description: 'Deals 45 Physical damage to one enemy and 15 Physical damage to every other enemy.',
        target: 'single-enemy', energy: [Energy.NINJUTSU, Energy.RANDOM, Energy.RANDOM], cooldown: 3,
        moveType: Type.WATER, classes: ['Water', 'Physical', 'Instant'],
        effects: [
            { kind: 'damage', amount: 45, damageKind: 'normal' },
            { kind: 'damage', scope: 'all-other-enemies', amount: 15, damageKind: 'normal' },
        ],
    }),
];

const mimeScreenChargeBonus = { counter: 'screen-charge', multiplier: 5 };
const mimeSafeguardDurationBonus = { statusId: 'mr-mime-safeguard', amount: 1 };

const mrMimeSkills = [
    skill({
        id: 'mr-mime-dazzling-gleam', name: 'Dazzling Gleam',
        description: 'Deals 30 damage to one enemy and 10 to every other enemy. The next Forcefield or Light Screen gains 5 extra protection per stack.',
        target: 'single-enemy', energy: [Energy.NINJUTSU, Energy.RANDOM], cooldown: 0,
        moveType: Type.FAIRY, classes: ['Fairy', 'Special', 'Instant'],
        effects: [
            { kind: 'damage', amount: 30, damageKind: 'normal' },
            { kind: 'damage', scope: 'all-other-enemies', amount: 10, damageKind: 'normal' },
            { kind: 'increment-actor-counter', counter: 'screen-charge', maximum: 20 },
        ],
    }),
    skill({
        id: 'mr-mime-forcefield', name: 'Forcefield',
        description: 'Applies 20 Barrier to every enemy for one Mr. Mime turn, plus 5 per Dazzling Gleam stack. Light Screen costs 1 Random next turn.',
        target: 'all-enemy', energy: [Energy.RANDOM, Energy.RANDOM], cooldown: 3,
        moveType: Type.PSYCHIC, classes: ['Psychic', 'Special', 'Instant', 'Invisible'],
        effects: [
            {
                kind: 'barrier', scope: 'all-enemy', amount: 20,
                bonusPerActorCounter: mimeScreenChargeBonus,
                durationBonusFromActorStatus: mimeSafeguardDurationBonus,
                trackedStatus: {
                    id: 'mr-mime-forcefield', name: 'Forcefield', hidden: false, harmful: true,
                    durationActions: 1, durationAnchor: 'source', replaceExisting: true,
                    removeTrackedBarrierOnExpire: true, removeWhenTrackedBarrierExhausted: true,
                },
            },
            { kind: 'reset-actor-counter', counter: 'screen-charge' },
            { kind: 'source-status', status: {
                id: 'mr-mime-light-screen-discount', name: 'Forcefield Setup',
                hidden: false, harmful: false, durationActions: 1, durationAnchor: 'source',
                replaceExisting: true,
                skillCostOverrides: { 'mr-mime-light-screen': [Energy.RANDOM] },
            } },
        ],
    }),
    skill({
        id: 'mr-mime-light-screen', name: 'Light Screen',
        description: 'Grants the allied team 20 Shield for one Mr. Mime turn, plus Dazzling Gleam and Safeguard bonuses. Forcefield costs 1 Random next turn.',
        target: 'all-allies', energy: [Energy.RANDOM, Energy.RANDOM], cooldown: 3,
        moveType: Type.PSYCHIC, classes: ['Psychic', 'Special', 'Instant', 'Invisible'],
        harmful: false,
        effects: [
            {
                kind: 'shield', scope: 'all-allies', amount: 20,
                bonusPerActorCounter: mimeScreenChargeBonus,
                includeIncomingShieldBonus: true,
                durationBonusFromActorStatus: mimeSafeguardDurationBonus,
                trackedStatus: {
                    id: 'mr-mime-light-screen', name: 'Light Screen', hidden: false, harmful: false,
                    durationActions: 1, durationAnchor: 'source', replaceExisting: true,
                    removeTrackedShieldOnExpire: true, removeWhenTrackedShieldExhausted: true,
                },
            },
            { kind: 'reset-actor-counter', counter: 'screen-charge' },
            { kind: 'source-status', status: {
                id: 'mr-mime-forcefield-discount', name: 'Light Screen Setup',
                hidden: false, harmful: false, durationActions: 1, durationAnchor: 'source',
                replaceExisting: true,
                skillCostOverrides: { 'mr-mime-forcefield': [Energy.RANDOM] },
            } },
        ],
    }),
    skill({
        id: 'mr-mime-safeguard', name: 'Safeguard',
        description: 'For three Mr. Mime turns, allies receive 25% more healing and 5 extra Shield, while stuns lose one turn and both screens last one turn longer.',
        target: 'all-allies', energy: [Energy.NINJUTSU], cooldown: 5,
        moveType: Type.NORMAL, classes: ['Normal', 'Special', 'Instant'], harmful: false,
        effects: [{ kind: 'status', scope: 'all-allies', status: {
            id: 'mr-mime-safeguard', name: 'Safeguard', hidden: false, harmful: false,
            durationActions: 3, durationAnchor: 'source', replaceExisting: true,
            healReceivedMultiplier: 1.25,
            additionalIncomingShieldPoints: 5,
            stunDurationReduction: 1,
        } }],
    }),
];

const hitmonchanMegaPunchBonus = {
    id: 'hitmonchan-mega-punch-bonus',
    name: 'Mega Punch Bonus',
    hidden: false,
    harmful: false,
    durationActions: null,
    sourceSkillId: 'hitmonchan-mega-punch',
    storedDamageBonus: 10,
    storedDamageBonusSkillName: 'Mega Punch',
    mergeNumericFields: ['storedDamageBonus'],
};

const hitmonchanSkills = [
    skill({
        id: 'hitmonchan-thunder-punch', name: 'Thunder Punch',
        description: "Deals 25 piercing damage to one enemy and 5 piercing damage to every other enemy, paralyzes the target's cooldowns for one turn, and adds 10 damage to the next Mega Punch.",
        target: 'single-enemy', energy: [Energy.GENJUTSU], cooldown: 2,
        moveType: Type.ELECTRIC, classes: ['Electric', 'Physical', 'Instant'],
        effects: [
            { kind: 'damage', amount: 25, damageKind: 'normal-ignore-reduction' },
            { kind: 'damage', scope: 'all-other-enemies', amount: 5, damageKind: 'normal-ignore-reduction' },
            { kind: 'status', status: {
                id: 'hitmonchan-thunder-punch-paralysis', name: 'Thunder Punch Paralysis',
                hidden: false, harmful: true, durationActions: 1, durationAnchor: 'target',
                paralyzeCooldowns: true,
            } },
            { kind: 'source-status', status: hitmonchanMegaPunchBonus },
        ],
    }),
    skill({
        id: 'hitmonchan-fire-punch', name: 'Fire Punch',
        description: 'Deals 25 affliction damage to one enemy, deals 5 affliction damage at the end of each of its next two turns, and adds 10 damage to the next Mega Punch.',
        target: 'single-enemy', energy: [Energy.BLOODLINE], cooldown: 2,
        moveType: Type.FIRE, classes: ['Fire', 'Physical', 'Instant'],
        effects: [
            { kind: 'damage', amount: 25, damageKind: 'affliction', ignoreDamageReduction: true },
            { kind: 'status', status: {
                id: 'hitmonchan-fire-punch-burn', name: 'Fire Punch Burn',
                hidden: false, harmful: true, durationActions: 2, durationAnchor: 'target',
                turnEndAnchor: 'target', turnEndDamage: 5, turnEndDamageKind: 'affliction',
                turnEndMoveType: Type.FIRE, turnEndSkillClasses: ['Fire', 'Physical'],
            } },
            { kind: 'source-status', status: hitmonchanMegaPunchBonus },
        ],
    }),
    skill({
        id: 'hitmonchan-ice-punch', name: 'Ice Punch',
        description: 'Deals 25 damage to one enemy, stuns its Physical skills for one turn, adds two cooldowns to skills used during that turn, and adds 10 damage to the next Mega Punch.',
        target: 'single-enemy', energy: [Energy.NINJUTSU], cooldown: 2,
        moveType: Type.ICE, classes: ['Ice', 'Physical', 'Instant'],
        effects: [
            { kind: 'damage', amount: 25, damageKind: 'normal' },
            { kind: 'status', status: {
                id: 'hitmonchan-ice-punch-stun', name: 'Ice Punch Stun',
                hidden: false, harmful: true, durationActions: 1, durationAnchor: 'target',
                cannotUseSkillClasses: ['Physical'],
            } },
            { kind: 'status', status: {
                id: 'hitmonchan-ice-punch-cooldown-increase', name: 'Ice Punch Slow',
                hidden: false, harmful: true, durationActions: 1, durationAnchor: 'target',
                newSkillCooldownIncrease: 2,
            } },
            { kind: 'source-status', status: hitmonchanMegaPunchBonus },
        ],
    }),
    skill({
        id: 'hitmonchan-mega-punch', name: 'Mega Punch',
        description: 'Deals 15 damage plus 10 for every elemental punch used since the previous Mega Punch, then consumes the entire bonus.',
        target: 'single-enemy', energy: [Energy.RANDOM], cooldown: 0,
        moveType: Type.NORMAL, classes: ['Normal', 'Physical', 'Instant'],
        effects: [
            {
                kind: 'damage', amount: 15, damageKind: 'normal',
                bonusFromActorStatus: {
                    statusId: 'hitmonchan-mega-punch-bonus',
                    field: 'storedDamageBonus',
                },
            },
            { kind: 'remove-actor-status', statusIds: ['hitmonchan-mega-punch-bonus'] },
        ],
    }),
];

const hitmonleeFocusCriticalBonus = {
    statusId: 'hitmonlee-focus-energy',
    amount: 50,
};

const hitmonleeCritical = (amount) => ({
    kind: 'damage',
    amount,
    damageKind: 'normal-ignore-reduction',
    chance: 25,
    chanceBonusIfActorStatus: hitmonleeFocusCriticalBonus,
});

const hitmonleeSkills = [
    skill({
        id: 'hitmonlee-double-kick', name: 'Double Kick',
        description: 'Deals 10 damage twice. Each hit independently has a 25% chance to deal 5 additional piercing damage, increased to 75% by Focus Energy. Becomes Low Kick after use.',
        target: 'single-enemy', energy: [Energy.TAIJUTSU], cooldown: 0,
        moveType: Type.FIGHTING, classes: ['Fighting', 'Physical', 'Instant'],
        effects: [
            { kind: 'damage', amount: 10, damageKind: 'normal' },
            { kind: 'damage', amount: 10, damageKind: 'normal' },
            hitmonleeCritical(5),
            hitmonleeCritical(5),
            { kind: 'source-status', status: {
                id: 'hitmonlee-double-kick-swap', name: 'Low Kick Ready',
                description: 'Double Kick is replaced by Low Kick.',
                hidden: false, harmful: false, durationActions: null,
                replaceExisting: true,
                skillReplacements: { 'hitmonlee-double-kick': 'hitmonlee-low-kick' },
            } },
        ],
    }),
    skill({
        id: 'hitmonlee-focus-energy', name: 'Focus Energy',
        description: "For two Hitmonlee turns, damaging skills gain 50 percentage points of critical-strike chance.",
        target: 'self', energy: [Energy.RANDOM], cooldown: 3,
        moveType: Type.NORMAL, classes: ['Normal', 'Physical', 'Instant'], harmful: false,
        effects: [{ kind: 'status', status: {
            id: 'hitmonlee-focus-energy', name: 'Focus Energy',
            description: 'Damaging skills gain 50 percentage points of critical-strike chance.',
            hidden: false, harmful: false, durationActions: 2, durationAnchor: 'source',
            replaceExisting: true, criticalChanceBonus: 50,
        } }],
    }),
    skill({
        id: 'hitmonlee-mega-kick', name: 'Mega Kick',
        description: 'Deals 40 damage and has a 25% chance to deal the current runtime\'s 5 additional piercing damage, increased to 75% by Focus Energy.',
        target: 'single-enemy', energy: [Energy.RANDOM, Energy.RANDOM, Energy.RANDOM], cooldown: 2,
        moveType: Type.NORMAL, classes: ['Normal', 'Physical', 'Instant'],
        effects: [
            { kind: 'damage', amount: 40, damageKind: 'normal' },
            hitmonleeCritical(5),
        ],
    }),
    skill({
        id: 'hitmonlee-high-jump-kick', name: 'High Jump Kick',
        description: 'Has a 70% chance to deal 45 damage; on a miss Hitmonlee loses 30 HP. A successful hit has a 25% chance to deal 5 additional piercing damage, increased to 75% by Focus Energy.',
        target: 'single-enemy', energy: [Energy.TAIJUTSU, Energy.TAIJUTSU], cooldown: 2,
        moveType: Type.FIGHTING, classes: ['Fighting', 'Physical', 'Instant'],
        effects: [{
            kind: 'chance', percent: 70,
            effects: [
                { kind: 'damage', amount: 45, damageKind: 'normal' },
                hitmonleeCritical(5),
            ],
            elseEffects: [{ kind: 'health-loss', scope: 'self', amount: 30 }],
        }],
    }),
    skill({
        id: 'hitmonlee-low-kick', name: 'Low Kick',
        description: 'Deals 20 damage, reduces the target\'s non-affliction damage by 15 for one target turn, and has a 25% chance to deal 10 additional piercing damage, increased to 75% by Focus Energy. Becomes Double Kick after use.',
        target: 'single-enemy', energy: [Energy.TAIJUTSU], cooldown: 0,
        moveType: Type.FIGHTING, classes: ['Fighting', 'Physical', 'Instant'],
        effects: [
            { kind: 'damage', amount: 20, damageKind: 'normal' },
            hitmonleeCritical(10),
            { kind: 'status', status: {
                id: 'hitmonlee-low-kick-debuff', name: 'Low Kick',
                hidden: false, harmful: true, durationActions: 1, durationAnchor: 'target',
                outgoingDamageDebuff: 15,
            } },
            { kind: 'remove-actor-status', statusIds: ['hitmonlee-double-kick-swap'] },
        ],
    }),
];

const aerodactylRockHeadDefense = {
    id: 'aerodactyl-rock-head-defense',
    name: 'Rock Head Defense',
    hidden: false,
    harmful: false,
    durationActions: null,
    sourceSkillId: 'aerodactyl-passive-tough-head',
    mergeNumericFields: ['trackedShieldPoints'],
    removeWhenTrackedShieldExhausted: true,
};

const aerodactylSkills = [
    skill({
        id: 'aerodactyl-take-down', name: 'Take Down',
        description: 'Deals 20 damage and costs Aerodactyl up to 10 HP without defeating it; Rock Head grants Shield equal to the HP actually lost.',
        target: 'single-enemy', energy: [Energy.RANDOM], cooldown: 0,
        moveType: Type.NORMAL, classes: ['Normal', 'Physical', 'Instant'],
        effects: [
            { kind: 'damage', amount: 20, damageKind: 'normal' },
            { kind: 'health-loss', scope: 'self', amount: 10 },
        ],
    }),
    skill({
        id: 'aerodactyl-rock-slide', name: 'Rock Slide',
        description: 'Deals 10 damage to every enemy, consumes all Rock Head Shield as equal bonus damage to the selected target, and independently has a 30% chance to stun each enemy\'s harmful skills for one turn.',
        target: 'single-enemy', energy: [Energy.GENJUTSU], cooldown: 2,
        moveType: Type.ROCK, classes: ['Rock', 'Physical', 'Instant'],
        effects: [
            { kind: 'damage', scope: 'all-enemy', amount: 10, damageKind: 'normal' },
            {
                kind: 'damage', amount: 0, damageKind: 'normal',
                requiresActorStatus: 'aerodactyl-rock-head-defense',
                bonusFromActorStatus: {
                    statusId: 'aerodactyl-rock-head-defense',
                    field: 'trackedShieldPoints',
                },
                consumeActorTrackedShieldStatus: 'aerodactyl-rock-head-defense',
            },
            { kind: 'status', scope: 'all-enemy', chance: 30, status: {
                id: 'aerodactyl-rock-slide-stun', name: 'Rock Slide Stun',
                hidden: false, harmful: true, durationActions: 1, durationAnchor: 'target',
                stunHarmful: true,
            } },
        ],
    }),
    skill({
        id: 'aerodactyl-double-edge', name: 'Double Edge',
        description: 'Deals 35 damage and costs Aerodactyl up to 15 HP without defeating it; Rock Head grants Shield equal to the HP actually lost.',
        target: 'single-enemy', energy: [Energy.RANDOM, Energy.RANDOM], cooldown: 3,
        moveType: Type.NORMAL, classes: ['Normal', 'Physical', 'Instant'],
        effects: [
            { kind: 'damage', amount: 35, damageKind: 'normal' },
            { kind: 'health-loss', scope: 'self', amount: 15 },
        ],
    }),
    skill({
        id: 'aerodactyl-stone-edge', name: 'Stone Edge',
        description: 'Deals 35 damage, then has 30% plus one percentage point per Rock Head Shield to stun all skills for two target turns. A successful stun adds 5 piercing damage. All Rock Head Shield is consumed.',
        target: 'single-enemy', energy: [Energy.GENJUTSU, Energy.RANDOM], cooldown: 2,
        moveType: Type.ROCK, classes: ['Rock', 'Physical', 'Instant'],
        effects: [
            { kind: 'damage', amount: 35, damageKind: 'normal' },
            {
                kind: 'status', chance: 30,
                chanceBonusFromActorStatus: {
                    statusId: 'aerodactyl-rock-head-defense',
                    field: 'trackedShieldPoints',
                    multiplier: 1,
                },
                status: {
                    id: 'aerodactyl-stone-edge-stun', name: 'Stone Edge Stun',
                    hidden: false, harmful: true, durationActions: 2, durationAnchor: 'target',
                    cannotUseSkills: true,
                },
                onAppliedEffects: [
                    { kind: 'damage', amount: 5, damageKind: 'normal-ignore-reduction' },
                ],
            },
            {
                kind: 'consume-actor-tracked-shield', scope: 'self',
                statusId: 'aerodactyl-rock-head-defense',
            },
        ],
    }),
];

const magnemitePiercingVulnerability = (amount) => ({
    id: 'magnemite-piercing-vulnerability',
    name: 'Piercing Vulnerability',
    hidden: false,
    harmful: true,
    durationActions: null,
    storedPiercingBonus: amount,
    mergeNumericFields: ['storedPiercingBonus'],
});

const magnemiteEvolutionProgress = {
    kind: 'record-unique-skill',
    scope: 'self',
    requiresActorStatus: 'magnemite-magnet-rise-active',
    group: 'magnemite-magnet-rise-evolution',
    counter: 'evolution',
    threshold: 2,
    evolveForm: 'magneton',
};

const magnemiteThunderWaveMark = (sourceSkillId) => ({
    id: 'magnemite-thunder-wave-mark',
    name: 'Thunder Wave',
    description: 'The next Spark used against this Pokemon deals 15 additional piercing damage.',
    hidden: false,
    harmful: true,
    durationActions: 1,
    durationAnchor: 'source',
    replaceExisting: true,
    sourceSkillId,
});

const magnemiteMagnetRise = (evolved = false) => ({
    id: 'magnemite-magnet-rise-active',
    name: 'Magnet Rise',
    description: `${evolved ? 'Magneton' : 'Magnemite'} ignores enemy Physical skills and deals ${evolved ? 10 : 5} additional damage per packet.`,
    hidden: false,
    harmful: false,
    durationActions: 3,
    durationAnchor: 'source',
    replaceExisting: true,
    invulnerableToSkillClasses: ['Physical'],
    damageBonusFlat: evolved ? 10 : 5,
});

const magnemiteSkills = [
    skill({
        id: 'magnemite-spark', name: 'Spark',
        description: 'Deals 10 piercing damage to one enemy and 5 piercing damage to every other enemy. Thunder Wave adds and consumes 15 bonus damage.',
        target: 'single-enemy', energy: [Energy.RANDOM], cooldown: 0,
        moveType: Type.ELECTRIC, classes: ['Electric', 'Special', 'Instant'],
        effects: [
            { kind: 'damage', amount: 10, damageKind: 'normal-ignore-reduction' },
            {
                kind: 'damage', amount: 15, damageKind: 'normal-ignore-reduction',
                requiresTargetStatus: 'magnemite-thunder-wave-mark',
                consumeTargetStatus: 'magnemite-thunder-wave-mark',
            },
            { kind: 'damage', scope: 'all-other-enemies', amount: 5, damageKind: 'normal-ignore-reduction' },
            magnemiteEvolutionProgress,
        ],
    }),
    skill({
        id: 'magnemite-thunder-wave', name: 'Thunder Wave',
        description: "Stuns one enemy's harmful skills, paralyzes its cooldowns for one turn, and marks it for 15 bonus Spark damage during Magnemite's next turn.",
        target: 'single-enemy', energy: [Energy.GENJUTSU], cooldown: 3,
        moveType: Type.ELECTRIC, classes: ['Electric', 'Special', 'Instant'],
        effects: [
            { kind: 'status', status: {
                id: 'magnemite-thunder-wave-stun', name: 'Thunder Wave Paralysis',
                description: 'Harmful skills are stunned and cooldowns do not recover.',
                hidden: false, harmful: true, durationActions: 1, durationAnchor: 'source',
                stunHarmful: true, paralyzeCooldowns: true,
            } },
            { kind: 'status', status: magnemiteThunderWaveMark('magnemite-thunder-wave') },
            magnemiteEvolutionProgress,
        ],
    }),
    skill({
        id: 'magnemite-swift', name: 'Swift',
        description: 'Deals 30 damage and permanently stores 5 additional damage for the next qualifying piercing attack against the target; repeated uses stack.',
        target: 'single-enemy', energy: [Energy.RANDOM, Energy.RANDOM], cooldown: 1,
        moveType: Type.NORMAL, classes: ['Normal', 'Special', 'Instant'],
        effects: [
            { kind: 'damage', amount: 30, damageKind: 'normal' },
            { kind: 'status', status: magnemitePiercingVulnerability(5) },
        ],
    }),
    skill({
        id: 'magnemite-magnet-rise', name: 'Magnet Rise',
        description: 'For three Magnemite turns, ignores enemy Physical skills and adds 5 damage to every damaging packet. Using both Spark and Thunder Wave during this window evolves Magnemite.',
        target: 'self', energy: [Energy.GENJUTSU], cooldown: 6,
        moveType: Type.ELECTRIC, classes: ['Electric', 'Strategic', 'Instant'], harmful: false,
        effects: [
            {
                kind: 'reset-actor-unique-skill-group', scope: 'self',
                group: 'magnemite-magnet-rise-evolution', counter: 'evolution',
            },
            { kind: 'status', scope: 'self', status: magnemiteMagnetRise(false) },
        ],
    }),
    skill({
        id: 'magneton-spark', name: 'Spark',
        description: 'Hits the selected enemy for 10 piercing damage and every other enemy for 5 piercing damage three times. Thunder Wave adds 15 to the first selected hit; stored piercing vulnerability adds a flat 10 more.',
        target: 'single-enemy', energy: [Energy.RANDOM, Energy.RANDOM], cooldown: 0,
        moveType: Type.ELECTRIC, classes: ['Electric', 'Special', 'Instant'],
        effects: [
            { kind: 'damage', amount: 10, damageKind: 'normal-ignore-reduction' },
            {
                kind: 'damage', amount: 15, damageKind: 'normal-ignore-reduction',
                requiresTargetStatus: 'magnemite-thunder-wave-mark',
                consumeTargetStatus: 'magnemite-thunder-wave-mark',
            },
            {
                kind: 'damage', amount: 10, damageKind: 'normal-ignore-reduction',
                requiresTargetStatus: 'magnemite-piercing-vulnerability',
                consumeTargetStatus: 'magnemite-piercing-vulnerability',
            },
            { kind: 'damage', scope: 'all-other-enemies', amount: 5, damageKind: 'normal-ignore-reduction' },
            { kind: 'damage', amount: 10, damageKind: 'normal-ignore-reduction' },
            { kind: 'damage', scope: 'all-other-enemies', amount: 5, damageKind: 'normal-ignore-reduction' },
            { kind: 'damage', amount: 10, damageKind: 'normal-ignore-reduction' },
            { kind: 'damage', scope: 'all-other-enemies', amount: 5, damageKind: 'normal-ignore-reduction' },
        ],
    }),
    skill({
        id: 'magneton-thunder-wave', name: 'Thunder Wave',
        description: "Stuns every enemy's harmful skills and paralyzes all enemy cooldowns for one turn, while marking the selected enemy for 15 bonus Spark damage.",
        target: 'single-enemy', energy: [Energy.GENJUTSU, Energy.GENJUTSU], cooldown: 3,
        moveType: Type.ELECTRIC, classes: ['Electric', 'Special', 'Instant'],
        effects: [
            { kind: 'status', scope: 'all-enemy', status: {
                id: 'magneton-thunder-wave-stun', name: 'Thunder Wave Paralysis',
                description: 'Harmful skills are stunned and cooldowns do not recover.',
                hidden: false, harmful: true, durationActions: 1, durationAnchor: 'source',
                stunHarmful: true, paralyzeCooldowns: true,
            } },
            { kind: 'status', status: magnemiteThunderWaveMark('magneton-thunder-wave') },
        ],
    }),
    skill({
        id: 'magneton-flash-cannon', name: 'Flash Cannon',
        description: 'Deals 40 damage, consumes stored piercing vulnerability for a flat 10 bonus piercing damage, then stores it again for the next qualifying attack.',
        target: 'single-enemy', energy: [Energy.RANDOM, Energy.RANDOM, Energy.RANDOM], cooldown: 1,
        moveType: Type.STEEL, classes: ['Steel', 'Special', 'Instant'],
        effects: [
            { kind: 'damage', amount: 40, damageKind: 'normal' },
            {
                kind: 'damage', amount: 10, damageKind: 'normal-ignore-reduction',
                requiresTargetStatus: 'magnemite-piercing-vulnerability',
                consumeTargetStatus: 'magnemite-piercing-vulnerability',
            },
            { kind: 'status', status: magnemitePiercingVulnerability(10) },
        ],
    }),
    skill({
        id: 'magneton-magnet-rise', name: 'Magnet Rise',
        description: 'For three Magneton turns, ignores enemy Physical skills and adds 10 damage to every damaging packet.',
        target: 'self', energy: [Energy.GENJUTSU], cooldown: 6,
        moveType: Type.ELECTRIC, classes: ['Electric', 'Strategic', 'Instant'], harmful: false,
        effects: [{ kind: 'status', scope: 'self', status: magnemiteMagnetRise(true) }],
    }),
];

const onixIronTailReduction = (amount) => ({
    id: 'onix-iron-tail-reduction',
    name: 'Iron Tail Armor',
    description: 'Permanently reduces ordinary damage taken from every packet.',
    hidden: false,
    harmful: false,
    durationActions: null,
    damageReductionFlat: amount,
    mergeNumericFields: ['damageReductionFlat'],
    sourceSkillId: 'onix-iron-tail',
});

const onixStealthRockDamageDebuff = {
    id: 'onix-stealth-rock-damage-debuff',
    name: 'Stealth Rock Damage Loss',
    description: 'Deals 10 less non-affliction damage per packet.',
    hidden: false,
    harmful: true,
    durationActions: 1,
    durationAnchor: 'source',
    replaceExisting: true,
    outgoingDamageDebuff: 10,
    sourceSkillId: 'onix-stealth-rock',
};

const onixStealthRockMark = {
    id: 'onix-stealth-rock-mark',
    name: 'Stealth Rock',
    hidden: false,
    harmful: true,
    durationActions: 3,
    durationAnchor: 'source',
    replaceExisting: true,
    onExpireDamage: 10,
    onExpireDamageKind: 'fixed-piercing',
    onExpireSkillClasses: ['Rock', 'Physical', 'Invisible'],
    newSkillCooldownIncreaseOnFirstUse: 1,
    onUseSkill: {
        requireFirstSkillUse: true,
        applyStatusesToOwner: [onixStealthRockDamageDebuff],
        incrementOwnNumericField: 'onExpireDamage',
        incrementOwnNumericAmount: 5,
    },
    sourceSkillId: 'onix-stealth-rock',
};

const onixSkills = [
    skill({
        id: 'onix-rock-throw', name: 'Rock Throw',
        description: 'Deals 15 damage to the enemy team. For one Onix turn, Iron Tail grants 2 additional permanent damage reduction.',
        target: 'all-enemy', energy: [Energy.RANDOM], cooldown: 1,
        moveType: Type.ROCK, classes: ['Rock', 'Physical', 'Instant'],
        effects: [
            { kind: 'damage', scope: 'all-enemy', amount: 15, damageKind: 'normal' },
            { kind: 'source-status', scope: 'self', status: {
                id: 'onix-rock-throw-iron-tail-bonus',
                name: 'Rock Throw Setup',
                description: 'The next Iron Tail this turn grants 2 additional permanent damage reduction.',
                hidden: false,
                harmful: false,
                durationActions: 1,
                durationAnchor: 'source',
                replaceExisting: true,
                sourceSkillId: 'onix-rock-throw',
            } },
        ],
    }),
    skill({
        id: 'onix-iron-tail', name: 'Iron Tail',
        description: 'Permanently grants 3 ordinary damage reduction, then deals 25 damage. Rock Throw adds 2 more reduction and is consumed.',
        target: 'single-enemy', energy: [Energy.RANDOM, Energy.RANDOM], cooldown: 1,
        moveType: Type.STEEL, classes: ['Steel', 'Physical', 'Instant'],
        effects: [
            { kind: 'source-status', scope: 'self', status: onixIronTailReduction(3) },
            {
                kind: 'source-status', scope: 'self',
                requiresActorStatus: 'onix-rock-throw-iron-tail-bonus',
                status: onixIronTailReduction(2),
            },
            { kind: 'damage', amount: 25, damageKind: 'normal' },
            {
                kind: 'remove-actor-status', scope: 'self',
                statusIds: ['onix-rock-throw-iron-tail-bonus'],
            },
        ],
    }),
    skill({
        id: 'onix-stealth-rock', name: 'Stealth Rock',
        description: "Marks the enemy team for three Onix turns. Each enemy's newly used skills gain 1 cooldown and deal 10 less non-affliction damage; every new skill adds 5 piercing damage to the mark's final 10-damage burst.",
        target: 'all-enemy', energy: [Energy.RANDOM, Energy.RANDOM], cooldown: 6,
        moveType: Type.ROCK, classes: ['Rock', 'Physical', 'Instant', 'Invisible'],
        effects: [
            { kind: 'status', scope: 'all-enemy', status: onixStealthRockMark },
        ],
    }),
    skill({
        id: 'onix-harden', name: 'Harden',
        description: "Taunts the enemy team and grants 10 tracked Shield for one Onix turn. Up to 10 of Iron Tail's permanent reduction is also applied to piercing damage while Harden lasts.",
        target: 'all-enemy', energy: [Energy.RANDOM], cooldown: 4,
        moveType: Type.NORMAL, classes: ['Normal', 'Physical', 'Instant'],
        effects: [
            { kind: 'status', scope: 'all-enemy', status: {
                id: 'onix-harden-taunt',
                name: 'Harden Taunt',
                description: 'Must use a harmful single-target skill on Onix.',
                hidden: false,
                harmful: true,
                durationActions: 1,
                durationAnchor: 'source',
                tauntSource: true,
                sourceSkillId: 'onix-harden',
            } },
            {
                kind: 'shield', scope: 'self', amount: 10,
                copyActorStatusNumeric: {
                    statusId: 'onix-iron-tail-reduction',
                    sourceField: 'damageReductionFlat',
                    targetField: 'unpierceableDamageReductionFlat',
                    maximum: 10,
                },
                trackedStatus: {
                    id: 'onix-harden-active',
                    name: 'Harden',
                    description: "Has 10 tracked Shield and converts up to 10 of Iron Tail's reduction into unpierceable reduction.",
                    hidden: false,
                    harmful: false,
                    durationActions: 1,
                    durationAnchor: 'source',
                    removeTrackedShieldOnExpire: true,
                    sourceSkillId: 'onix-harden',
                },
            },
        ],
    }),
];

const meowthFurySwipesStatus = ({ persian = false, affliction = false } = {}) => ({
    id: affliction ? 'meowth-fury-swipes-affliction' : 'meowth-fury-swipes-physical',
    name: `${persian ? 'Persian ' : ''}Fury Swipes ${affliction ? 'Affliction' : 'Physical'}`,
    description: `Takes 5 ${affliction ? 'affliction' : persian ? 'piercing Physical' : 'Physical'} damage at the start of each turn.`,
    hidden: false,
    harmful: true,
    affliction,
    durationActions: 3,
    durationAnchor: 'source',
    replaceExisting: true,
    periodicDamage: 5,
    periodicDamageKind: affliction
        ? 'affliction'
        : persian
        ? 'normal-ignore-reduction'
        : 'normal',
    periodicSkillClasses: ['Normal', 'Physical', 'Action'],
    sourceSkillId: persian ? 'persian-fury-swipes' : 'meowth-fury-swipes',
});

const meowthExtendFurySwipes = (trackEvolution = false) => ({
    kind: 'extend-status-duration',
    amount: 1,
    statusIds: ['meowth-fury-swipes-physical', 'meowth-fury-swipes-affliction'],
    sourceMustBeActor: true,
    actorCounterOnSuccess: trackEvolution
        ? { counter: 'evolution', delta: 1, maximum: 3 }
        : undefined,
});

const meowthFakeOutHistory = {
    id: 'meowth-fake-out-target-history',
    name: 'Fake Out Targeted',
    description: 'This Meowth or Persian cannot target this Pokemon with Fake Out again this match.',
    hidden: true,
    harmful: true,
    durationActions: null,
    unremovable: true,
};

const meowthSkills = [
    skill({
        id: 'meowth-pay-day', name: 'Pay Day',
        description: "Steals 1 random enemy energy. Its color becomes the next Night Slash cost, and an active Fury Swipes on the target is extended by one turn.",
        target: 'single-enemy', energy: [Energy.RANDOM], cooldown: 2,
        moveType: Type.NORMAL, classes: ['Normal', 'Physical', 'Instant'],
        effects: [
            {
                kind: 'steal-energy',
                actorSkillCostOverrideFromStolen: {
                    statusId: 'meowth-pay-day-night-slash-cost',
                    name: 'Pay Day Cost',
                    description: 'The next Night Slash uses the stolen colored energy cost.',
                    skillIds: ['meowth-night-slash', 'persian-night-slash'],
                },
            },
            meowthExtendFurySwipes(true),
        ],
    }),
    skill({
        id: 'meowth-fury-swipes', name: 'Fury Swipes',
        description: 'Immediately deals 5 Physical and 5 affliction damage to the enemy team, then repeats both packets for three turns.',
        target: 'all-enemy', energy: [Energy.RANDOM, Energy.RANDOM], cooldown: 2,
        moveType: Type.NORMAL, classes: ['Normal', 'Physical', 'Affliction', 'Action'],
        effects: [
            { kind: 'damage', scope: 'all-enemy', amount: 5, damageKind: 'normal' },
            { kind: 'damage', scope: 'all-enemy', amount: 5, damageKind: 'affliction' },
            { kind: 'status', scope: 'all-enemy', status: meowthFurySwipesStatus() },
            { kind: 'status', scope: 'all-enemy', status: meowthFurySwipesStatus({ affliction: true }) },
        ],
    }),
    skill({
        id: 'meowth-fake-out', name: 'Fake Out',
        description: 'Deals 10 damage and fully stuns one enemy for one turn, ignoring invulnerability. Each enemy can be targeted only once per match; extends Fury Swipes.',
        target: 'single-enemy', energy: [], cooldown: 2,
        moveType: Type.NORMAL, classes: ['Normal', 'Physical', 'Instant'],
        ignoreInvulnerability: true,
        targetCannotHaveStatusFromActorSource: 'meowth-fake-out-target-history',
        effects: [
            { kind: 'damage', amount: 10, damageKind: 'normal' },
            { kind: 'status', status: {
                id: 'meowth-fake-out-stun', name: 'Fake Out Stun',
                description: 'Cannot use skills.', hidden: false, harmful: true,
                durationActions: 1, cannotUseSkills: true,
                sourceSkillId: 'meowth-fake-out',
            } },
            { kind: 'status', status: meowthFakeOutHistory },
            meowthExtendFurySwipes(true),
        ],
    }),
    skill({
        id: 'meowth-night-slash', name: 'Night Slash',
        description: 'Deals 25 damage, or 35 piercing damage when the target begins at 50 HP or less. Extends Fury Swipes.',
        target: 'single-enemy', energy: [Energy.TAIJUTSU], cooldown: 1,
        moveType: Type.DARK, classes: ['Dark', 'Physical', 'Instant'],
        effects: [
            { kind: 'damage', amount: 35, damageKind: 'normal-ignore-reduction', initialTargetHpAtMost: 50 },
            { kind: 'damage', amount: 25, damageKind: 'normal', initialTargetHpAtLeast: 51 },
            meowthExtendFurySwipes(true),
        ],
    }),
    skill({
        id: 'persian-pay-day', name: 'Persian Pay Day',
        description: "Steals 1 random energy and changes only the colored cost of Persian's next Night Slash. For one turn, each other enemy's first new harmful skill also loses 1 random energy.",
        target: 'single-enemy', energy: [Energy.RANDOM, Energy.RANDOM], cooldown: 2,
        moveType: Type.NORMAL, classes: ['Normal', 'Physical', 'Instant'],
        effects: [
            {
                kind: 'steal-energy',
                actorSkillCostOverrideFromStolen: {
                    statusId: 'persian-pay-day-night-slash-cost',
                    name: 'Persian Pay Day Cost',
                    description: "The next Persian Night Slash uses the stolen color while retaining its Random cost.",
                    skillIds: ['persian-night-slash'],
                },
            },
            { kind: 'status', scope: 'other-enemies', status: {
                id: 'persian-pay-day-reactive-theft',
                name: 'Persian Pay Day Theft',
                description: 'The first newly used harmful skill loses 1 random energy to Persian.',
                hidden: false,
                harmful: true,
                durationActions: 1,
                durationAnchor: 'source',
                onHarmfulSkill: {
                    requireFirstSkillUse: true,
                    stealEnergyToSource: 1,
                },
                sourceSkillId: 'persian-pay-day',
            } },
            meowthExtendFurySwipes(false),
        ],
    }),
    skill({
        id: 'persian-fury-swipes', name: 'Persian Fury Swipes',
        description: 'Immediately deals 5 piercing Physical and 5 affliction damage to the enemy team, then repeats both packets for three turns.',
        target: 'all-enemy', energy: [Energy.RANDOM, Energy.RANDOM], cooldown: 2,
        moveType: Type.NORMAL, classes: ['Normal', 'Physical', 'Affliction', 'Action'],
        effects: [
            { kind: 'damage', scope: 'all-enemy', amount: 5, damageKind: 'normal-ignore-reduction' },
            { kind: 'damage', scope: 'all-enemy', amount: 5, damageKind: 'affliction' },
            { kind: 'status', scope: 'all-enemy', status: meowthFurySwipesStatus({ persian: true }) },
            { kind: 'status', scope: 'all-enemy', status: meowthFurySwipesStatus({ persian: true, affliction: true }) },
        ],
    }),
    skill({
        id: 'persian-fake-out', name: 'Persian Fake Out',
        description: "Deals 15 damage and fully stuns one enemy for one turn, ignoring invulnerability. Meowth's previous targets remain unavailable; extends Fury Swipes.",
        target: 'single-enemy', energy: [], cooldown: 1,
        moveType: Type.NORMAL, classes: ['Normal', 'Physical', 'Instant'],
        ignoreInvulnerability: true,
        targetCannotHaveStatusFromActorSource: 'meowth-fake-out-target-history',
        effects: [
            { kind: 'damage', amount: 15, damageKind: 'normal' },
            { kind: 'status', status: {
                id: 'persian-fake-out-stun', name: 'Persian Fake Out Stun',
                description: 'Cannot use skills.', hidden: false, harmful: true,
                durationActions: 1, cannotUseSkills: true,
                sourceSkillId: 'persian-fake-out',
            } },
            { kind: 'status', status: meowthFakeOutHistory },
            meowthExtendFurySwipes(false),
        ],
    }),
    skill({
        id: 'persian-night-slash', name: 'Persian Night Slash',
        description: 'Deals 30 damage, or 45 piercing damage when the target begins at 50 HP or less. Its colored and Random costs are preserved separately; extends Fury Swipes.',
        target: 'single-enemy', energy: [Energy.TAIJUTSU, Energy.RANDOM], cooldown: 1,
        moveType: Type.DARK, classes: ['Dark', 'Physical', 'Instant'],
        effects: [
            { kind: 'damage', amount: 45, damageKind: 'normal-ignore-reduction', initialTargetHpAtMost: 50 },
            { kind: 'damage', amount: 30, damageKind: 'normal', initialTargetHpAtLeast: 51 },
            meowthExtendFurySwipes(false),
        ],
    }),
];

const clefairyEvolutionHealing = {
    counter: 'evolution',
    maximum: 75,
};

const clefairyDoubleSlapFollowup = ({ evolved = false } = {}) => ({
    id: evolved ? 'clefable-double-slap-followup' : 'clefairy-double-slap-followup',
    name: `${evolved ? 'Clefable ' : ''}Double Slap`,
    description: `Takes ${evolved ? 20 : 15} damage at the beginning of ${evolved ? "Clefable's" : "Clefairy's"} next turn.`,
    hidden: false,
    harmful: true,
    durationActions: 1,
    durationAnchor: 'source',
    turnStartAnchor: 'source',
    turnStartDamage: evolved ? 20 : 15,
    turnStartDamageKind: 'normal',
    turnStartMoveType: Type.NORMAL,
    turnStartSkillClasses: ['Normal', 'Physical', 'Instant'],
    consumeAfterTurnStart: true,
    sourceSkillId: evolved ? 'clefable-double-slap' : 'clefairy-double-slap',
});

const clefairySkills = [
    skill({
        id: 'clefairy-metronome', name: 'Metronome',
        description: 'Casts a seeded random copy-safe damaging skill on an enemy or a copy-safe healing skill on an ally.',
        target: 'single-character', energy: [Energy.RANDOM, Energy.RANDOM], cooldown: 2,
        moveType: Type.NORMAL, classes: ['Normal', 'Mental', 'Instant'],
        effects: [{ kind: 'metronome', actorCounterFromHealing: clefairyEvolutionHealing }],
    }),
    skill({
        id: 'clefairy-double-slap', name: 'Double Slap',
        description: "Deals 15 damage now and 15 more at the beginning of Clefairy's next turn.",
        target: 'single-enemy', energy: [Energy.RANDOM], cooldown: 2,
        moveType: Type.NORMAL, classes: ['Normal', 'Physical', 'Instant'],
        effects: [
            { kind: 'damage', amount: 15, damageKind: 'normal' },
            { kind: 'status', status: clefairyDoubleSlapFollowup() },
        ],
    }),
    skill({
        id: 'clefairy-disarming-voice', name: 'Disarming Voice',
        description: 'Removes allied accuracy reductions and enemy evasion, then deals 20 damage to all enemies.',
        target: 'all-enemy', energy: [Energy.RANDOM, Energy.RANDOM], cooldown: 2,
        moveType: Type.FAIRY, classes: ['Fairy', 'Physical', 'Instant'], ignoreEvasion: true,
        effects: [
            { kind: 'cleanse-accuracy-and-evasion' },
            { kind: 'damage', scope: 'all-enemy', amount: 20, damageKind: 'normal' },
        ],
    }),
    skill({
        id: 'clefairy-moonlight', name: 'Moonlight',
        description: 'Heals an ally for 60%, 40%, 20%, then 0% of current HP on consecutive uses and cleanses affliction effects.',
        target: 'self-or-single-ally', energy: [Energy.BLOODLINE], cooldown: 0,
        moveType: Type.FAIRY, classes: ['Fairy', 'Special', 'Instant'], harmful: false,
        effects: [
            {
                kind: 'percentage-current-hp-heal-sequence',
                percentages: [60, 40, 20, 0],
                actorCounterFromHealing: clefairyEvolutionHealing,
            },
            { kind: 'cleanse-affliction' },
        ],
    }),
    skill({
        id: 'clefable-metronome', name: 'Clefable Metronome',
        description: 'Casts a seeded random copy-safe damaging skill on an enemy or a copy-safe healing skill on an ally.',
        target: 'single-character', energy: [Energy.RANDOM], cooldown: 2,
        moveType: Type.NORMAL, classes: ['Normal', 'Mental', 'Instant'],
        effects: [{ kind: 'metronome', actorCounterFromHealing: clefairyEvolutionHealing }],
    }),
    skill({
        id: 'clefable-double-slap', name: 'Clefable Double Slap',
        description: "Deals 20 damage now and 20 more at the beginning of Clefable's next turn.",
        target: 'single-enemy', energy: [Energy.RANDOM, Energy.RANDOM], cooldown: 2,
        moveType: Type.NORMAL, classes: ['Normal', 'Physical', 'Instant'],
        effects: [
            { kind: 'damage', amount: 20, damageKind: 'normal' },
            { kind: 'status', status: clefairyDoubleSlapFollowup({ evolved: true }) },
        ],
    }),
    skill({
        id: 'clefable-disarming-voice', name: 'Clefable Disarming Voice',
        description: 'Removes and prevents allied accuracy reductions and enemy evasion for two turns, then deals 20 damage to all enemies.',
        target: 'all-enemy', energy: [Energy.RANDOM, Energy.RANDOM, Energy.RANDOM], cooldown: 2,
        moveType: Type.FAIRY, classes: ['Fairy', 'Physical', 'Instant'], ignoreEvasion: true,
        effects: [
            { kind: 'cleanse-accuracy-and-evasion' },
            { kind: 'damage', scope: 'all-enemy', amount: 20, damageKind: 'normal' },
            { kind: 'source-status', scope: 'self', status: {
                id: 'clefable-disarming-voice-field', name: 'Clefable Disarming Voice',
                description: 'Allied accuracy cannot be reduced and enemy evasion cannot be increased.',
                hidden: false, harmful: false, durationActions: 2, durationAnchor: 'source',
                replaceExisting: true, preventTeamAccuracyReduction: true, preventEnemyEvasion: true,
                sourceSkillId: 'clefable-disarming-voice',
            } },
        ],
    }),
    skill({
        id: 'clefable-moonlight', name: 'Clefable Moonlight',
        description: 'Heals an ally for 60%, 40%, 20%, then 0% of current HP on consecutive uses and cleanses affliction effects.',
        target: 'self-or-single-ally', energy: [Energy.RANDOM], cooldown: 0,
        moveType: Type.FAIRY, classes: ['Fairy', 'Special', 'Instant'], harmful: false,
        effects: [
            {
                kind: 'percentage-current-hp-heal-sequence',
                percentages: [60, 40, 20, 0],
                actorCounterFromHealing: clefairyEvolutionHealing,
            },
            { kind: 'cleanse-affliction' },
        ],
    }),
];

const perishSongMark = ({ evolved = false } = {}) => ({
    id: 'jigglypuff-perish-song-mark',
    name: 'Perish Song',
    description: 'When this countdown expires, this Pokemon is instantly defeated. The mark ends if its source is defeated.',
    hidden: false,
    harmful: true,
    durationActions: evolved ? 3 : 4,
    durationAnchor: 'target',
    replaceExisting: true,
    unremovable: true,
    endIfSourceDies: true,
    uniqueEnemyStatusFromSource: true,
    instantKillOnExpire: true,
    evolveSourceForm: 'wigglytuff',
});

const singStun = ({ evolved = false } = {}) => ({
    id: 'jigglypuff-sing-stun',
    name: evolved ? 'Wigglytuff Sing' : 'Sing',
    description: 'Harmful skills are stunned.',
    hidden: false,
    harmful: true,
    durationActions: 2,
    durationAnchor: 'target',
    replaceExisting: true,
    stunHarmful: true,
});

const singChannel = ({ evolved = false } = {}) => ({
    id: 'jigglypuff-sing-channel',
    name: evolved ? 'Wigglytuff Sing' : 'Sing',
    description: 'Sing is channeling and advances every enemy Perish Song once each turn.',
    hidden: false,
    harmful: false,
    durationActions: 2,
    durationAnchor: 'source',
    replaceExisting: true,
    turnStartAdvanceAllEnemyPerish: true,
});

const wishStatus = ({ evolved = false } = {}) => ({
    id: 'jigglypuff-wish-heal',
    name: evolved ? 'Wigglytuff Wish' : 'Wish',
    description: 'At the start of this Pokemon next turn, it restores 20 HP. A marked enemy using a new harmful skill on it advances Perish Song.',
    hidden: true,
    harmful: false,
    durationActions: 1,
    durationAnchor: 'target',
    turnStartAnchor: 'target',
    turnStartHeal: 20,
    consumeAfterTurnStart: true,
    replaceExisting: true,
    onEnemyTargeted: {
        harmfulOnly: true,
        requireFirstSkillUse: true,
        advanceSourcePerishSong: true,
    },
});

const humiliateStatus = ({ evolved = false } = {}) => ({
    id: 'jigglypuff-humiliate-mark',
    name: evolved ? 'Wigglytuff Humiliate' : 'Humiliate',
    description: evolved
        ? 'The next newly used skill grants Wigglytuff one random energy and advances Perish Song once.'
        : 'The next newly used harmful skill grants Jigglypuff one random energy and advances Perish Song once.',
    hidden: true,
    harmful: true,
    durationActions: 1,
    durationAnchor: 'target',
    replaceExisting: true,
    onUseSkill: {
        harmfulOnly: !evolved,
        requireFirstSkillUse: true,
        advanceSourcePerishSong: true,
        gainRandomEnergyToSource: true,
        consume: true,
    },
});

const jigglypuffSkills = [
    skill({
        id: 'jigglypuff-perish-song', name: 'Perish Song',
        description: 'Marks one enemy for 4 turns. When it expires, they are instantly defeated. Ends if Jigglypuff dies.',
        target: 'single-enemy', energy: [Energy.RANDOM, Energy.RANDOM, Energy.RANDOM], cooldown: 0,
        moveType: Type.NORMAL, classes: ['Normal', 'Special', 'Instant'],
        effects: [{ kind: 'status', status: perishSongMark() }],
    }),
    skill({
        id: 'jigglypuff-sing', name: 'Sing',
        description: 'Channels for 2 turns. Each turn, one enemy cannot use harmful skills and every enemy Perish Song advances once.',
        target: 'single-enemy', energy: [Energy.NINJUTSU, Energy.RANDOM], cooldown: 3,
        moveType: Type.NORMAL, classes: ['Normal', 'Special', 'Channeled'],
        effects: [
            { kind: 'status', status: singStun() },
            { kind: 'source-status', status: singChannel() },
        ],
    }),
    skill({
        id: 'jigglypuff-wish', name: 'Wish',
        description: 'Next turn, Jigglypuff or one ally heals 20 HP. A marked enemy using a new harmful skill on them advances Perish Song once.',
        target: 'self-or-single-ally', energy: [Energy.RANDOM], cooldown: 2,
        moveType: Type.NORMAL, classes: ['Normal', 'Special', 'Instant', 'Invisible'], harmful: false,
        effects: [{ kind: 'status', status: wishStatus() }],
    }),
    skill({
        id: 'jigglypuff-humiliate', name: 'Humiliate',
        description: 'Costs no energy. If the target is affected by Sing, instantly gain 1 random energy. If they use a new harmful skill this turn, gain 1 random energy and advance Perish Song once.',
        target: 'single-enemy', energy: [], cooldown: 2,
        moveType: Type.NORMAL, classes: ['Normal', 'Physical', 'Instant', 'Invisible'],
        effects: [
            { kind: 'grant-random-energy-to-actor', requiresTargetStatus: 'jigglypuff-sing-stun', amount: 1 },
            { kind: 'status', status: humiliateStatus() },
        ],
    }),
    skill({
        id: 'wigglytuff-perish-song', name: 'Wigglytuff Perish Song',
        description: 'Marks one enemy for 3 turns. When it expires, they are instantly defeated. Ends if Wigglytuff dies.',
        target: 'single-enemy', energy: [Energy.RANDOM, Energy.RANDOM, Energy.RANDOM], cooldown: 0,
        moveType: Type.NORMAL, classes: ['Normal', 'Special', 'Instant'],
        effects: [{ kind: 'status', status: perishSongMark({ evolved: true }) }],
    }),
    skill({
        id: 'wigglytuff-sing', name: 'Wigglytuff Sing',
        description: 'Channels for 2 turns. Each turn, all enemies cannot use harmful skills and every enemy Perish Song advances once.',
        target: 'all-enemy', energy: [Energy.NINJUTSU, Energy.NINJUTSU, Energy.RANDOM], cooldown: 3,
        moveType: Type.NORMAL, classes: ['Normal', 'Special', 'Channeled'],
        effects: [
            { kind: 'status', scope: 'all-enemy', status: singStun({ evolved: true }) },
            { kind: 'source-status', status: singChannel({ evolved: true }) },
        ],
    }),
    skill({
        id: 'wigglytuff-wish', name: 'Wigglytuff Wish',
        description: "Next turn, Wigglytuff's whole team heals 20 HP. A marked enemy using a new harmful skill on them advances Perish Song once.",
        target: 'all-allies', energy: [Energy.RANDOM, Energy.RANDOM], cooldown: 2,
        moveType: Type.NORMAL, classes: ['Normal', 'Special', 'Instant', 'Invisible'], harmful: false,
        effects: [{ kind: 'status', scope: 'all-allies', status: wishStatus({ evolved: true }) }],
    }),
    skill({
        id: 'wigglytuff-humiliate', name: 'Wigglytuff Humiliate',
        description: 'Costs no energy. If the target is affected by Sing, instantly gain 1 random energy. If they use any new skill this turn, gain 1 random energy and advance Perish Song once.',
        target: 'single-enemy', energy: [], cooldown: 2,
        moveType: Type.NORMAL, classes: ['Normal', 'Physical', 'Instant', 'Invisible'],
        effects: [
            { kind: 'grant-random-energy-to-actor', requiresTargetStatus: 'jigglypuff-sing-stun', amount: 1 },
            { kind: 'status', status: humiliateStatus({ evolved: true }) },
        ],
    }),
];

const beedrillPoisonSting = () => ({
    id: 'beedrill-poison-sting-status',
    name: 'Poison Sting',
    description: 'Takes permanent stacking affliction damage at the start of each turn.',
    hidden: false,
    harmful: true,
    durationActions: null,
    turnStartAnchor: 'target',
    turnStartDamage: 5,
    turnStartDamageKind: 'affliction',
    turnStartMoveType: Type.POISON,
    turnStartSkillClasses: ['Poison', 'Special', 'Affliction', 'Instant'],
    poisonStingStacks: 1,
    mergeNumericFields: ['turnStartDamage', 'poisonStingStacks'],
});

const beedrillBlind = ({ id, name, durationActions = 1 } = {}) => ({
    id,
    name,
    description: durationActions === null
        ? 'Harmful skills are permanently redirected to a random enemy.'
        : 'Harmful skills are redirected to a random enemy for 1 turn.',
    hidden: false,
    harmful: true,
    durationActions,
    durationAnchor: 'target',
    harmfulBlindToSourceTeam: true,
});

const beedrillHiveSwarm = ({ evolved = false } = {}) => ({
    id: 'beedrill-hive-swarm-status',
    name: evolved ? 'Mega Hive Swarm' : 'Hive Swarm',
    description: 'Ignores the next 2 enemy damage effects and all enemy stuns; Hive Swarm becomes Hive Sting.',
    hidden: false,
    harmful: false,
    durationActions: 3,
    durationAnchor: 'source',
    replaceExisting: true,
    ignoreNextEnemyDamageEffects: 2,
    ignoreEnemyStuns: true,
    skillReplacements: {
        [evolved ? 'beedrill-hive-swarm-mega' : 'beedrill-hive-swarm']: 'beedrill-hive-sting',
    },
});

const poisonStingImmediateDamage = (scope = 'target') => ({
    kind: 'damage',
    scope,
    amount: 0,
    damageKind: 'affliction',
    applyTypeAdjustment: false,
    requiresTargetStatus: 'beedrill-poison-sting-status',
    bonusFromTargetStatus: {
        statusId: 'beedrill-poison-sting-status',
        field: 'turnStartDamage',
    },
});

const beedrillSkills = [
    skill({
        id: 'beedrill-poison-sting', name: 'Poison Sting',
        description: 'Immediately deals the current permanent Poison Sting stack, then repeats that damage at each target turn start.',
        target: 'single-enemy', energy: [Energy.RANDOM], cooldown: 0,
        moveType: Type.POISON, classes: ['Poison', 'Special', 'Affliction', 'Instant'],
        effects: [
            { kind: 'status', status: beedrillPoisonSting() },
            poisonStingImmediateDamage(),
        ],
    }),
    skill({
        id: 'mega-beedrill-poison-sting', name: 'Mega Poison Sting',
        description: 'Deals 10 affliction damage, then adds and immediately deals the current permanent Poison Sting stack.',
        target: 'single-enemy', energy: [Energy.RANDOM], cooldown: 0,
        moveType: Type.POISON, classes: ['Poison', 'Special', 'Affliction', 'Instant'],
        effects: [
            { kind: 'damage', amount: 10, damageKind: 'affliction' },
            { kind: 'status', status: beedrillPoisonSting() },
            poisonStingImmediateDamage(),
        ],
    }),
    skill({
        id: 'beedrill-twinneedle', name: 'Twinneedle',
        description: 'Deals 15 damage twice and has a 25% chance to blind harmful skills for 1 turn.',
        target: 'single-enemy', energy: [Energy.RANDOM, Energy.RANDOM], cooldown: 1,
        moveType: Type.BUG, classes: ['Bug', 'Physical', 'Instant'],
        effects: [
            { kind: 'damage', amount: 15, damageKind: 'normal' },
            { kind: 'damage', amount: 15, damageKind: 'normal' },
            { kind: 'status', chance: 25, status: beedrillBlind({
                id: 'beedrill-twinneedle-blind',
                name: 'Twinneedle Blind',
            }) },
        ],
    }),
    skill({
        id: 'beedrill-envenom', name: 'Envenom',
        description: 'Poison Sting enemies take 10 affliction damage plus 5 per stack and are blinded for 1 turn.',
        target: 'all-enemy', energy: [Energy.NINJUTSU], cooldown: 2,
        moveType: Type.POISON, classes: ['Poison', 'Special', 'Affliction', 'Instant'],
        effects: [
            {
                kind: 'damage', scope: 'all-enemy', amount: 10, damageKind: 'affliction',
                requiresTargetStatus: 'beedrill-poison-sting-status',
                bonusFromTargetStatus: {
                    statusId: 'beedrill-poison-sting-status',
                    field: 'poisonStingStacks',
                    multiplier: 5,
                },
            },
            {
                kind: 'status', scope: 'all-enemy',
                requiresTargetStatus: 'beedrill-poison-sting-status',
                status: beedrillBlind({ id: 'beedrill-envenom-blind', name: 'Envenom Blind' }),
            },
            { kind: 'increment-actor-counter', counter: 'envenomUses', delta: 1, maximum: 2 },
        ],
    }),
    skill({
        id: 'mega-beedrill-fell-stinger', name: 'Fell Stinger',
        description: 'Poison Sting targets take 20 affliction damage plus 10 per stack; survivors are permanently blinded.',
        target: 'single-enemy', energy: [Energy.NINJUTSU], cooldown: 3,
        moveType: Type.BUG, classes: ['Bug', 'Special', 'Affliction', 'Instant'],
        effects: [
            {
                kind: 'damage', amount: 20, damageKind: 'affliction',
                requiresTargetStatus: 'beedrill-poison-sting-status',
                bonusFromTargetStatus: {
                    statusId: 'beedrill-poison-sting-status',
                    field: 'poisonStingStacks',
                    multiplier: 10,
                },
            },
            {
                kind: 'status', requiresTargetAlive: true,
                status: beedrillBlind({
                    id: 'mega-beedrill-permanent-blind',
                    name: 'Fell Stinger Blind',
                    durationActions: null,
                }),
            },
        ],
    }),
    skill({
        id: 'beedrill-hive-swarm', name: 'Hive Swarm',
        description: 'For 3 turns, ignores the next 2 enemy damage effects and enemy stuns. Replaced by Hive Sting.',
        target: 'self', energy: [Energy.RANDOM], cooldown: 6,
        moveType: Type.BUG, classes: ['Bug', 'Strategic', 'Instant'], harmful: false,
        effects: [{ kind: 'status', status: beedrillHiveSwarm() }],
    }),
    skill({
        id: 'beedrill-hive-swarm-mega', name: 'Mega Hive Swarm',
        description: 'For 3 turns, ignores the next 2 enemy damage effects and enemy stuns. Replaced by Hive Sting.',
        target: 'self', energy: [Energy.RANDOM], cooldown: 6,
        moveType: Type.BUG, classes: ['Bug', 'Strategic', 'Instant'], harmful: false,
        effects: [{ kind: 'status', status: beedrillHiveSwarm({ evolved: true }) }],
    }),
    skill({
        id: 'beedrill-hive-sting', name: 'Hive Sting',
        description: 'Casts Poison Sting on the entire enemy team.',
        target: 'all-enemy', energy: [Energy.RANDOM, Energy.RANDOM], cooldown: 0,
        moveType: Type.BUG, classes: ['Bug', 'Special', 'Affliction', 'Instant'],
        effects: [
            { kind: 'status', scope: 'all-enemy', status: beedrillPoisonSting() },
            poisonStingImmediateDamage('all-enemy'),
        ],
    }),
];

const articunoSkills = [
    skill({
        id: 'articuno-blizzard', name: 'Blizzard',
        description: 'Deals 15 damage to all enemies and paralyzes their cooldowns for 1 turn.',
        forceDescription: "Deals 10 damage to all enemies. The next harmful skill each of them uses is delayed 1 turn before it activates. Summons Hail for 4 turns: Ice and Water Pokemon take no damage, everyone else takes 3 each turn. Ice skills besides Blizzard deal +5 damage and cannot be evaded, Fire skills deal -5 damage, Grass and Bug skills cost 1 more Random energy. Hail cannot be refreshed while already active.",
        target: 'all-enemy', energy: [Energy.NINJUTSU], cooldown: 2,
        moveType: Type.ICE, classes: ['Ice', 'Special', 'Instant'],
        effects: [
            { kind: 'damage', scope: 'all-enemy', amount: 10, damageKind: 'normal' },
            { kind: 'status', scope: 'all-enemy', status: {
                id: 'articuno-blizzard-delay', name: 'Blizzard',
                description: 'The next harmful skill this Pokemon uses does not activate until 1 turn later.',
                hidden: false, harmful: true, durationActions: 1, durationAnchor: 'target',
                delayNextHarmfulSkillActivation: true,
            } },
            { kind: 'set-weather', scope: 'self', weather: {
                key: 'hail', name: 'Hail',
                description: 'Ice and Water Pokemon take no damage; everyone else takes 3 each turn. Water skills become Ice-typed and deal piercing damage. Ice skills deal +5 damage (Blizzard excluded) and cannot be evaded. Fire skills deal -5 damage. Grass and Bug skills cost 1 more Random energy.',
                rounds: 4,
                blockRefreshIfActive: true,
                excludeSkillId: 'articuno-blizzard',
                damageTypeModifiers: { [Type.ICE]: 5, [Type.FIRE]: -5 },
                costTypeModifiers: { [Type.GRASS]: 1, [Type.BUG]: 1 },
                evasionImmuneTypes: [Type.ICE],
                periodicNonTypeDamage: { immuneTypes: [Type.ICE, Type.WATER], amount: 3 },
                transformMoveType: { [Type.WATER]: Type.ICE },
            } },
        ],
    }),
    skill({
        id: 'articuno-ice-beam', name: 'Ice Beam',
        description: 'Deals 15 affliction damage and has a 50% chance to stun Special skills for 1 turn.',
        target: 'single-enemy', energy: [Energy.NINJUTSU], cooldown: 0,
        moveType: Type.ICE, classes: ['Ice', 'Special', 'Affliction', 'Instant'],
        effects: [
            { kind: 'damage', amount: 15, damageKind: 'affliction' },
            { kind: 'status', chance: 50, status: {
                id: 'articuno-ice-beam-stun', name: 'Ice Beam',
                description: 'Special skills are stunned for 1 turn.',
                hidden: false, harmful: true, durationActions: 1, durationAnchor: 'target',
                cannotUseSkillClasses: ['Special'],
            } },
        ],
    }),
    skill({
        id: 'articuno-sheer-cold', name: 'Sheer Cold',
        description: 'Casts Blizzard then Ice Beam on the enemy team and permanently gains 5 damage each use.',
        target: 'all-enemy', energy: [Energy.NINJUTSU, Energy.NINJUTSU, Energy.RANDOM], cooldown: 2,
        moveType: Type.ICE, classes: ['Ice', 'Special', 'Affliction', 'Instant'],
        effects: [
            {
                kind: 'damage', scope: 'all-enemy', amount: 30, damageKind: 'affliction',
                bonusFromActorStatus: {
                    statusId: 'articuno-sheer-cold-tracker',
                    field: 'bonusDamage',
                },
            },
            { kind: 'status', scope: 'all-enemy', status: {
                id: 'articuno-blizzard-delay', name: 'Blizzard',
                description: 'The next harmful skill this Pokemon uses does not activate until 1 turn later.',
                hidden: false, harmful: true, durationActions: 1, durationAnchor: 'target',
                delayNextHarmfulSkillActivation: true,
            } },
            { kind: 'status', scope: 'all-enemy', chance: 50, status: {
                id: 'articuno-ice-beam-stun', name: 'Ice Beam',
                description: 'Special skills are stunned for 1 turn.',
                hidden: false, harmful: true, durationActions: 1, durationAnchor: 'target',
                cannotUseSkillClasses: ['Special'],
            } },
            { kind: 'set-weather', scope: 'self', weather: {
                key: 'hail', name: 'Hail',
                description: 'Ice and Water Pokemon take no damage; everyone else takes 3 each turn. Water skills become Ice-typed and deal piercing damage. Ice skills deal +5 damage (Blizzard excluded) and cannot be evaded. Fire skills deal -5 damage. Grass and Bug skills cost 1 more Random energy.',
                rounds: 4,
                blockRefreshIfActive: true,
                excludeSkillId: 'articuno-blizzard',
                damageTypeModifiers: { [Type.ICE]: 5, [Type.FIRE]: -5 },
                costTypeModifiers: { [Type.GRASS]: 1, [Type.BUG]: 1 },
                evasionImmuneTypes: [Type.ICE],
                periodicNonTypeDamage: { immuneTypes: [Type.ICE, Type.WATER], amount: 3 },
                transformMoveType: { [Type.WATER]: Type.ICE },
            } },
            {
                kind: 'increment-actor-status-field',
                statusId: 'articuno-sheer-cold-tracker',
                field: 'bonusDamage',
                delta: 5,
            },
        ],
    }),
    skill({
        id: 'articuno-fast-agility', name: 'Fast Agility',
        description: 'Articuno becomes invulnerable for 1 turn.',
        target: 'self', energy: [Energy.RANDOM], cooldown: 4,
        moveType: Type.PSYCHIC, classes: ['Psychic', 'Physical', 'Instant'], harmful: false,
        effects: [{ kind: 'status', status: {
            id: 'articuno-fast-agility', name: 'Fast Agility',
            description: 'Invulnerable to enemy skills for 1 turn.',
            hidden: false, harmful: false, durationActions: 1, invulnerable: true,
            replaceExisting: true,
        } }],
    }),
];

const moltresSkills = [
    skill({
        id: 'moltres-fire-spin', name: 'Fire Spin',
        description: "For 2 turns, enemies using a new harmful skill on Moltres' team take 10 affliction damage. Gains 1 Heat.",
        target: 'self', energy: [Energy.BLOODLINE], cooldown: 3,
        moveType: Type.FIRE, classes: ['Fire', 'Special', 'Affliction', 'Instant'], harmful: false,
        effects: [
            { kind: 'source-status', status: {
                id: 'moltres-fire-spin-active', name: 'Fire Spin',
                description: "Enemies using a harmful skill on Moltres' team take 10 affliction damage.",
                hidden: false, harmful: false, durationActions: 2, durationAnchor: 'source',
                replaceExisting: true,
                teamHarmfulSkillTrap: {
                    damageToActor: 10,
                    damageKind: 'affliction',
                    moveType: Type.FIRE,
                    skillClasses: ['Fire', 'Special', 'Affliction'],
                },
            } },
            {
                kind: 'increment-actor-status-field', statusId: 'moltres-heat-tracker',
                field: 'heat', delta: 1, maximum: 3,
                bonusFromWeather: { weatherKey: 'sunny-day', sourceMustMatch: true, amount: 1 },
            },
        ],
    }),
    skill({
        id: 'moltres-sunny-day', name: 'Sunny Day',
        description: 'For 2 turns, enemies take 3 additional affliction damage. Moltres gains 1 Heat.',
        forceDescription: 'Summons Sunny Day for 4 turns: Fire skills +5 damage, Water skills -5 damage, Grass skills cost 1 less Random energy, Electric skills cost 1 more Random energy. While it lasts, Moltres gains 1 additional Heat from her skills. Gains 1 Heat.',
        target: 'self', energy: [Energy.BLOODLINE], cooldown: 4,
        moveType: Type.FIRE, classes: ['Fire', 'Special', 'Instant'], harmful: false,
        effects: [
            { kind: 'set-weather', scope: 'self', weather: {
                key: 'sunny-day', name: 'Sunny Day',
                description: 'Fire skills +5 damage, Water skills -5 damage. Grass skills cost 1 less Random energy, Electric skills cost 1 more Random energy.',
                rounds: 4,
                damageTypeModifiers: { [Type.FIRE]: 5, [Type.WATER]: -5 },
                costTypeModifiers: { [Type.GRASS]: -1, [Type.ELECTRIC]: 1 },
            } },
            {
                kind: 'increment-actor-status-field', statusId: 'moltres-heat-tracker',
                field: 'heat', delta: 1, maximum: 3,
                bonusFromWeather: { weatherKey: 'sunny-day', sourceMustMatch: true, amount: 1 },
            },
        ],
    }),
    skill({
        id: 'moltres-heat-wave', name: 'Heat Wave',
        description: 'Deals 20 affliction damage to one enemy and 10 to all others. Gains 1 Heat.',
        target: 'single-enemy', energy: [Energy.BLOODLINE, Energy.RANDOM], cooldown: 0,
        moveType: Type.FIRE, classes: ['Fire', 'Special', 'Affliction', 'Instant'],
        effects: [
            { kind: 'damage', amount: 20, damageKind: 'affliction' },
            { kind: 'damage', scope: 'other-enemies', amount: 10, damageKind: 'affliction' },
            {
                kind: 'increment-actor-status-field', statusId: 'moltres-heat-tracker',
                field: 'heat', delta: 1, maximum: 3,
                bonusFromWeather: { weatherKey: 'sunny-day', sourceMustMatch: true, amount: 1 },
            },
        ],
    }),
    skill({
        id: 'moltres-overheat', name: 'Overheat',
        description: 'Consumes all Heat to deal 15 affliction damage per Heat to all enemies. Each use permanently lowers damage per Heat by 5 and reduces this skill\'s cost.',
        target: 'all-enemy', energy: [Energy.BLOODLINE, Energy.BLOODLINE, Energy.RANDOM], cooldown: 0,
        energyByActorStatusField: {
            statusId: 'moltres-heat-tracker',
            field: 'overheatUses',
            tiers: [
                { atLeast: 2, energy: [Energy.BLOODLINE] },
                { atLeast: 1, energy: [Energy.BLOODLINE, Energy.BLOODLINE] },
            ],
        },
        moveType: Type.FIRE, classes: ['Fire', 'Special', 'Affliction', 'Instant'],
        effects: [
            {
                kind: 'damage', scope: 'all-enemy', amount: 0, damageKind: 'affliction',
                amountFromActorStatus: {
                    statusId: 'moltres-heat-tracker',
                    countField: 'heat',
                    amountPerCount: 15,
                    penaltyField: 'overheatPenalty',
                },
            },
            {
                kind: 'reset-actor-status-field', statusId: 'moltres-heat-tracker',
                field: 'heat', value: 0,
            },
            {
                kind: 'increment-actor-status-field', statusId: 'moltres-heat-tracker',
                field: 'overheatPenalty', delta: 5,
            },
            {
                kind: 'increment-actor-status-field', statusId: 'moltres-heat-tracker',
                field: 'overheatUses', delta: 1,
            },
        ],
    }),
    skill({
        id: 'moltres-heat', name: 'Passive: Heat',
        description: 'Moltres stores up to 3 Heat from its skills. Overheat consumes every stored Heat.',
        target: 'passive', energy: [], cooldown: 0,
        moveType: Type.FIRE, classes: ['Fire', 'Passive', 'Instant'], harmful: false,
        effects: [],
    }),
];

const zapdosSkills = [
    skill({
        id: 'zapdos-charge', name: 'Charge',
        description: 'Channels for 2 turns. Zapdos skills cost 1 less Yellow energy each turn; using another skill ends Charge.',
        target: 'self', energy: [], cooldown: 1,
        moveType: Type.ELECTRIC, classes: ['Electric', 'Special', 'Channeled'], harmful: false,
        effects: [{ kind: 'source-status', status: {
            id: 'zapdos-charge-active', name: 'Charge',
            description: 'Zapdos skills cost less Yellow energy; using another skill ends Charge. Zap Cannon resolves instantly once this has been active for 2 turns.',
            hidden: false, harmful: false, durationActions: 2, durationAnchor: 'source',
            replaceExisting: true,
            specificCostReductions: { [Energy.GENJUTSU]: 1 },
            increaseSpecificCostReductionEachTurn: { [Energy.GENJUTSU]: 1 },
            maximumSpecificCostReduction: 2,
            consumeOnOwnerSkillIds: [
                'zapdos-thunderstorm',
                'zapdos-flight',
            ],
        } }],
    }),
    skill({
        id: 'zapdos-thunderstorm', name: 'Thunderstorm',
        description: "Summons Thunderstorm for 4 turns: harmful enemy skills targeting Zapdos' team trigger 5 piercing damage and +1 cooldown, Electric skills besides Thunderstorm itself deal +5 damage, and each turn a random non-Electric, non-Ground Pokemon from either team takes 10 piercing damage and has its cooldowns paralyzed for 1 turn. Recast detonates for 15 piercing team damage, paralyzes cooldowns, and ends the weather.",
        image: skillArt('zapdos-thunderbolt'),
        target: 'self', energy: [Energy.GENJUTSU], cooldown: 0,
        moveType: Type.ELECTRIC, classes: ['Electric', 'Special', 'Instant', 'Bypassing'], harmful: false,
        effects: [
            { kind: 'source-status', unlessInitialActorStatus: 'zapdos-thunderstorm-active', status: {
                id: 'zapdos-thunderstorm-active', name: 'Thunderstorm',
                description: 'Enemy harmful skills targeting this team trigger piercing damage and cooldown pressure.',
                hidden: false, harmful: false, durationActions: 4, durationAnchor: 'source',
                replaceExisting: true,
                teamHarmfulSkillTrap: {
                    damageToActor: 5,
                    damageKind: 'piercing',
                    moveType: Type.ELECTRIC,
                    skillClasses: ['Electric', 'Special'],
                    damageOverrideFromOwnerStatus: {
                        statusId: 'zapdos-flight-active',
                        field: 'thunderboltTriggerDamage',
                    },
                    statusOnActor: {
                        id: 'zapdos-thunderstorm-cooldown-pressure',
                        name: 'Thunderstorm',
                        description: 'The newly used skill receives 1 additional cooldown.',
                        hidden: false, harmful: true, durationActions: 1,
                        durationAnchor: 'target', replaceExisting: true,
                        newSkillCooldownIncrease: 1,
                    },
                    advanceStatusOnActor: {
                        statusId: 'zapdos-zap-cannon',
                        sourceMustMatch: true,
                        onExpireDamageDelta: 10,
                        durationDelta: -1,
                    },
                },
            } },
            { kind: 'set-weather', scope: 'self', unlessInitialActorStatus: 'zapdos-thunderstorm-active', weather: {
                key: 'thunderstorm', name: 'Thunderstorm',
                description: "Electric skills deal +5 damage (Thunderstorm's own damage excluded). Each turn, 10 piercing damage strikes one random non-Electric, non-Ground Pokemon from either team and paralyzes its cooldowns for 1 turn.",
                rounds: 4,
                excludeSkillId: 'zapdos-thunderstorm',
                damageTypeModifiers: { [Type.ELECTRIC]: 5 },
                periodicRandomTargetDamage: {
                    amount: 10,
                    damageKind: 'piercing',
                    moveType: Type.ELECTRIC,
                    immuneTypes: [Type.ELECTRIC, Type.GROUND],
                    paralyzeCooldowns: true,
                },
            } },
            {
                kind: 'damage', scope: 'all-enemy', amount: 15, damageKind: 'piercing',
                requiresInitialActorStatus: 'zapdos-thunderstorm-active',
            },
            { kind: 'status', scope: 'all-enemy', requiresInitialActorStatus: 'zapdos-thunderstorm-active', status: {
                id: 'zapdos-thunderstorm-paralysis', name: 'Thunderstorm',
                description: 'Skill cooldowns cannot decrease for 1 turn.',
                hidden: false, harmful: true, durationActions: 1, durationAnchor: 'target',
                paralyzeCooldowns: true,
            } },
            {
                kind: 'remove-actor-status',
                requiresInitialActorStatus: 'zapdos-thunderstorm-active',
                statusIds: ['zapdos-thunderstorm-active'],
            },
            {
                kind: 'clear-weather', weatherKey: 'thunderstorm',
                requiresInitialActorStatus: 'zapdos-thunderstorm-active',
            },
        ],
    }),
    skill({
        id: 'zapdos-zap-cannon', name: 'Zap Cannon',
        description: 'Marks an enemy for 3 turns. Thunderbolt triggers shorten it and add 10 damage. On expiry, deals 30 plus bonus piercing damage and stuns for 1 turn.',
        target: 'single-enemy', energy: [Energy.GENJUTSU, Energy.GENJUTSU, Energy.RANDOM], cooldown: 0,
        moveType: Type.ELECTRIC,
        classes: ['Electric', 'Special', 'Instant', 'Uncounterable', 'Unreflectable'],
        effects: [
            {
                kind: 'status',
                unlessActorStatusFieldAtMost: { statusId: 'zapdos-charge-active', field: 'durationActions', atMost: 1 },
                status: {
                    id: 'zapdos-zap-cannon', name: 'Zap Cannon',
                    description: 'On expiry, takes 30 plus stored bonus piercing damage and is stunned.',
                    hidden: false, harmful: true, durationActions: 3, durationAnchor: 'target',
                    replaceExisting: true, endIfSourceDies: true,
                    onExpireDamage: 30, onExpireDamageKind: 'piercing',
                    onExpireMoveType: Type.ELECTRIC,
                    onExpireSkillClasses: ['Electric', 'Special'],
                    onExpireStatus: {
                        id: 'zapdos-zap-cannon-stun', name: 'Zap Cannon',
                        description: 'Cannot use skills for 1 turn.',
                        hidden: false, harmful: true, durationActions: 1, durationAnchor: 'target',
                        cannotUseSkills: true,
                    },
                },
            },
            {
                kind: 'damage', amount: 30, damageKind: 'piercing',
                requiresActorStatusFieldAtMost: { statusId: 'zapdos-charge-active', field: 'durationActions', atMost: 1 },
            },
            {
                kind: 'status',
                requiresActorStatusFieldAtMost: { statusId: 'zapdos-charge-active', field: 'durationActions', atMost: 1 },
                status: {
                    id: 'zapdos-zap-cannon-stun', name: 'Zap Cannon',
                    description: 'Cannot use skills for 1 turn.',
                    hidden: false, harmful: true, durationActions: 1, durationAnchor: 'target',
                    cannotUseSkills: true,
                },
            },
            { kind: 'remove-actor-status', statusIds: ['zapdos-charge-active'] },
        ],
    }),
    skill({
        id: 'zapdos-flight', name: 'Flight',
        description: 'For 2 turns, Zapdos is invulnerable to non-affliction enemy skills and Thunderbolt triggers deal 7 instead of 5.',
        target: 'self', energy: [Energy.RANDOM], cooldown: 4,
        moveType: Type.FLYING, classes: ['Flying', 'Physical', 'Instant'], harmful: false,
        effects: [{ kind: 'source-status', status: {
            id: 'zapdos-flight-active', name: 'Flight',
            description: 'Invulnerable to non-affliction enemy skills; Thunderstorm triggers deal 7 damage.',
            hidden: false, harmful: false, durationActions: 2, durationAnchor: 'source',
            replaceExisting: true, invulnerableToNonAffliction: true,
            thunderboltTriggerDamage: 7,
        } }],
    }),
];

export const ROSTER = Object.freeze({
    'pokemon-trainer': {
        id: 'pokemon-trainer',
        name: 'Pokemon Trainer',
        types: [Type.NORMAL],
        facePicture: '/game-assets/images/PokemonArena/pokemontrainer/FP.jpg',
        passiveDescription: 'At the start of each turn, Pokeball becomes a weighted random Pokeball, Great Ball, Ultra Ball, or Master Ball.',
        startStatuses: [{
            id: 'pokemon_trainer_ball_cycle',
            name: 'Ball Cycle',
            hidden: false,
            harmful: false,
            durationActions: null,
            unremovable: true,
            turnStartRandomSkillReplacement: {
                fromSkillId: 'pokemon-trainer-pokeball',
                statusId: 'pokemon-trainer-turn-ball',
                options: [
                    { skillId: 'pokemon-trainer-pokeball', name: 'Pokeball', weight: 8 },
                    { skillId: 'pokemon-trainer-great-ball', name: 'Great Ball', weight: 6 },
                    { skillId: 'pokemon-trainer-ultra-ball', name: 'Ultra Ball', weight: 5 },
                    { skillId: 'pokemon-trainer-master-ball', name: 'Master Ball', weight: 1 },
                ],
            },
        }],
        forms: {
            base: {
                id: 'base', name: 'Pokemon Trainer', types: [Type.NORMAL],
                facePicture: '/game-assets/images/PokemonArena/pokemontrainer/FP.jpg',
                skillIds: [
                    'pokemon-trainer-pokeball',
                    'pokemon-trainer-potion',
                    'pokemon-trainer-x-stats',
                    'pokemon-trainer-rare-candy',
                ],
            },
        },
        skills: trainerSkills,
    },
    charmander: {
        id: 'charmander',
        name: 'Charmander',
        types: [Type.FIRE],
        facePicture: '/game-assets/images/PokemonArena/newcharmanderfp.jpeg',
        passiveDescription: 'Evolves into Charmeleon after two successful Burns or critical Scratches.',
        forcedEvolutionForm: 'charmeleon',
        forms: {
            base: {
                id: 'base', name: 'Charmander', types: [Type.FIRE],
                facePicture: '/game-assets/images/PokemonArena/newcharmanderfp.jpeg',
                skillIds: ['charmander-ember', 'charmander-scratch', 'charmander-flamethrower', 'charmander-rage'],
            },
            charmeleon: {
                id: 'charmeleon', name: 'Charmeleon', types: [Type.FIRE],
                facePicture: '/game-assets/images/PokemonArena/Charmander/charmeleonfp.jpg',
                skillIds: ['charmander-fire-punch', 'charmander-dragon-claw', 'charmander-charmeleon-flamethrower', 'charmander-charmeleon-rage'],
            },
        },
        skills: charmanderSkills,
    },
    squirtle: {
        id: 'squirtle',
        name: 'Squirtle',
        types: [Type.WATER],
        facePicture: '/game-assets/images/PokemonArena/newsquirtlefp.jpeg',
        passiveDescription: 'Evolves into Wartortle after three blocks, Guard Breaks, or successful cleanses.',
        forcedEvolutionForm: 'wartortle',
        forms: {
            base: {
                id: 'base', name: 'Squirtle', types: [Type.WATER],
                facePicture: '/game-assets/images/PokemonArena/newsquirtlefp.jpeg',
                skillIds: ['squirtle-water-gun', 'squirtle-withdraw', 'squirtle-bubble', 'squirtle-rapid-spin'],
            },
            wartortle: {
                id: 'wartortle', name: 'Wartortle', types: [Type.WATER],
                facePicture: '/game-assets/images/PokemonArena/squirtle/wartortlefp.jpg',
                skillIds: ['wartortle-hydro-pump', 'wartortle-shell-guard', 'wartortle-bubblebeam', 'wartortle-aqua-spin'],
            },
        },
        skills: squirtleSkills,
    },
    bulbasaur: {
        id: 'bulbasaur',
        name: 'Bulbasaur',
        types: [Type.GRASS, Type.POISON],
        facePicture: '/game-assets/images/PokemonArena/Bulbasaur/bulbasaurfp.jpg',
        passiveDescription: 'Gains Sun from Leech Seed or when an ally acts; at five Sun evolves into Ivysaur.',
        forcedEvolutionForm: 'ivysaur',
        forms: {
            base: {
                id: 'base', name: 'Bulbasaur', types: [Type.GRASS, Type.POISON],
                facePicture: '/game-assets/images/PokemonArena/Bulbasaur/bulbasaurfp.jpg',
                skillIds: ['bulbasaur-leech-seed', 'bulbasaur-vine-whip', 'bulbasaur-razor-leaf', 'bulbasaur-solar-beam'],
            },
            ivysaur: {
                id: 'ivysaur', name: 'Ivysaur', types: [Type.GRASS, Type.POISON],
                facePicture: '/game-assets/images/PokemonArena/Bulbasaur/ivysaurfp.jpg',
                skillIds: ['ivysaur-leech-seed', 'ivysaur-vine-whip', 'ivysaur-razor-leaf', 'ivysaur-solar-beam'],
            },
        },
        skills: bulbasaurSkills,
    },
    pikachu: {
        id: 'pikachu', name: 'Pikachu', types: [Type.ELECTRIC],
        facePicture: '/game-assets/images/PokemonArena/newpikachufp.jpeg',
        passiveDescription: 'Static: enemies targeting Pikachu take 5 piercing damage and are marked for one turn.',
        startStatuses: [{
            id: 'pikachu-static-passive',
            name: 'Static',
            hidden: false,
            harmful: false,
            durationActions: null,
            onEnemyTargeted: {
                damageToActor: 5,
                damageKind: 'piercing',
                moveType: Type.ELECTRIC,
                statusOnActor: {
                    id: 'pikachu-static-mark',
                    name: 'Static',
                    hidden: false,
                    harmful: true,
                    durationActions: 1,
                },
            },
        }],
        skills: [
            skill({
                id: 'pikachu-thundershock', name: 'Thundershock',
                description: 'Deals 20 piercing damage and 15 to another enemy, paralyzes cooldowns, and discounts Thunder.',
                target: 'single-enemy', energy: [Energy.GENJUTSU], cooldown: 0, moveType: Type.ELECTRIC,
                classes: ['Electric', 'Special', 'Instant'],
                effects: [
                    { kind: 'damage', amount: 20, damageKind: 'piercing' },
                    { kind: 'random-other-enemy-damage', amount: 15, damageKind: 'piercing' },
                    { kind: 'status', unlessTargetStatus: 'pikachu-static-mark', status: {
                        id: 'cooldown-paralyze', name: 'Cooldowns Paralyzed', hidden: false, harmful: true,
                        durationActions: 1, paralyzeCooldowns: true,
                    } },
                    { kind: 'status', requiresTargetStatus: 'pikachu-static-mark', status: {
                        id: 'cooldown-paralyze', name: 'Cooldowns Paralyzed by Static', hidden: false, harmful: true,
                        durationActions: 2, durationAnchor: 'target', paralyzeCooldowns: true,
                    } },
                    { kind: 'source-status', status: {
                        id: 'pikachu-thundershock-thunder-cost', name: 'Thunder Discount',
                        hidden: false, harmful: false, durationActions: 1, durationAnchor: 'source',
                        skillCostOverrides: { 'pikachu-thunder': [Energy.GENJUTSU, Energy.RANDOM] },
                    } },
                ],
            }),
            skill({
                id: 'pikachu-volt-tackle', name: 'Volt Tackle',
                description: 'Deals 35 piercing damage, costs Pikachu 15 HP, and increases the target’s next skill cooldown.',
                target: 'single-enemy', energy: [Energy.TAIJUTSU, Energy.GENJUTSU], cooldown: 0,
                moveType: Type.ELECTRIC,
                classes: ['Electric', 'Physical', 'Instant'],
                effects: [
                    { kind: 'damage', amount: 35, damageKind: 'piercing' },
                    { kind: 'health-loss', scope: 'self', amount: 15 },
                    { kind: 'status', unlessTargetStatus: 'pikachu-static-mark', status: {
                        id: 'pikachu-volt-tackle-cooldown-shock', name: 'Cooldown Shock',
                        hidden: false, harmful: true, durationActions: 1, newSkillCooldownIncrease: 2,
                    } },
                    { kind: 'status', requiresTargetStatus: 'pikachu-static-mark', status: {
                        id: 'pikachu-volt-tackle-cooldown-shock', name: 'Static Cooldown Shock',
                        hidden: false, harmful: true, durationActions: 4, durationAnchor: 'target', newSkillCooldownIncrease: 2,
                    } },
                ],
            }),
            skill({
                id: 'pikachu-thunder', name: 'Thunder',
                description: 'Deals 45 piercing damage; Static adds damage, stuns harmful skills, and refreshes its mark.',
                target: 'single-enemy', energy: [Energy.GENJUTSU, Energy.GENJUTSU], cooldown: 1,
                moveType: Type.ELECTRIC,
                classes: ['Electric', 'Special', 'Instant'],
                effects: [
                    { kind: 'damage', amount: 45, damageKind: 'piercing' },
                    { kind: 'damage', amount: 5, damageKind: 'piercing', requiresTargetStatus: 'pikachu-static-mark' },
                    { kind: 'status', requiresTargetStatus: 'pikachu-static-mark', status: {
                        id: 'pikachu-thunder-harmful-stun', name: 'Harmful Skills Stunned',
                        hidden: false, harmful: true, durationActions: 1, stunHarmful: true,
                    } },
                    { kind: 'status', requiresTargetStatus: 'pikachu-static-mark', status: {
                        id: 'pikachu-static-mark', name: 'Static', hidden: false, harmful: true, durationActions: 1,
                    } },
                ],
            }),
            skill({
                id: 'pikachu-agility', name: 'Pikachu Agility',
                description: 'Pikachu becomes invulnerable through the opposing turn.',
                target: 'self', energy: [Energy.RANDOM, Energy.RANDOM], cooldown: 4,
                moveType: Type.PSYCHIC, harmful: false,
                classes: ['Psychic', 'Strategic', 'Instant'],
                effects: [{ kind: 'status', status: {
                    id: 'agility', name: 'Agility', hidden: false, harmful: false,
                    durationActions: 1, invulnerable: true,
                } }],
            }),
        ],
    },
    butterfree: {
        id: 'butterfree', name: 'Butterfree', types: [Type.BUG, Type.FLYING],
        facePicture: '/game-assets/images/PokemonArena/butterfree/butterfreefp.webp',
        passiveDescription: 'Stun Spore and Sleep Powder permanently alternate in Butterfree’s third skill slot.',
        forms: {
            base: {
                id: 'base', name: 'Butterfree', types: [Type.BUG, Type.FLYING],
                facePicture: '/game-assets/images/PokemonArena/butterfree/butterfreefp.webp',
                skillIds: ['butterfree-confusion', 'butterfree-psybeam', 'butterfree-stun-spore', 'butterfree-whirlwind'],
            },
        },
        skills: butterfreeSkills,
    },
    koffing: {
        id: 'koffing', name: 'Koffing', types: [Type.POISON],
        facePicture: '/game-assets/images/PokemonArena/koffing/koffingfp.webp',
        passiveDescription: 'Poison Gas may disrupt enemies Koffing damages. After using all four unique skills, it evolves into Weezing.',
        forcedEvolutionForm: 'weezing',
        startStatuses: [koffingPoisonGas(false)],
        forms: {
            base: {
                id: 'base', name: 'Koffing', types: [Type.POISON],
                facePicture: '/game-assets/images/PokemonArena/koffing/koffingfp.webp',
                skillIds: [
                    'koffing-smog',
                    'koffing-haze',
                    'koffing-self-destruct',
                    'koffing-smokescreen',
                ],
            },
            weezing: {
                id: 'weezing', name: 'Weezing', types: [Type.POISON],
                facePicture: '/game-assets/images/PokemonArena/koffing/weezingfp.webp',
                skillIds: [
                    'koffing-weezing-smog',
                    'koffing-weezing-haze',
                    'koffing-weezing-self-destruct',
                    'koffing-weezing-smokescreen',
                ],
                removeStatusIdsOnEnter: ['koffing-poison-gas-passive'],
                addStatusesOnEnter: [koffingPoisonGas(true)],
            },
        },
        skills: koffingSkills,
    },
    gastly: {
        id: 'gastly', name: 'Gastly', types: [Type.GHOST, Type.POISON],
        facePicture: '/game-assets/images/PokemonArena/gastley/gastleyfp.webp',
        passiveDescription: 'Tracks Lick damage dealt; at 35 total it evolves into Haunter and restores 10 HP.',
        forcedEvolutionForm: 'haunter',
        startStatuses: [{
            id: 'gastly-evolution-tracker',
            name: 'Evolution - Haunter',
            hidden: true,
            harmful: false,
            durationActions: null,
            unremovable: true,
            evolveOnCounter: { counter: 'evolution', threshold: 35, form: 'haunter' },
        }],
        forms: {
            base: {
                id: 'base', name: 'Gastly', types: [Type.GHOST, Type.POISON],
                facePicture: '/game-assets/images/PokemonArena/gastley/gastleyfp.webp',
                skillIds: ['gastly-lick', 'gastly-curse', 'gastly-spite', 'gastly-glare'],
            },
            haunter: {
                id: 'haunter', name: 'Haunter', types: [Type.GHOST, Type.POISON],
                facePicture: '/game-assets/images/PokemonArena/gastley/haunterfp.webp',
                skillIds: ['haunter-lick', 'haunter-curse', 'haunter-spite', 'haunter-glare'],
            },
        },
        skills: gastlySkills,
    },
    abra: {
        id: 'abra', name: 'Abra', types: [Type.PSYCHIC],
        facePicture: '/game-assets/images/PokemonArena/abra/abrafp.webp',
        passiveDescription: 'After using Calm Mind three times, Abra evolves into Kadabra and restores 10 HP.',
        forcedEvolutionForm: 'kadabra',
        startStatuses: [{
            id: 'abra-calm-mind-tracker',
            name: 'Evolution - Kadabra',
            hidden: true,
            harmful: false,
            durationActions: null,
            unremovable: true,
            evolveOnCounter: { counter: 'evolution', threshold: 3, form: 'kadabra' },
        }],
        forms: {
            base: {
                id: 'base', name: 'Abra', types: [Type.PSYCHIC],
                facePicture: '/game-assets/images/PokemonArena/abra/abrafp.webp',
                skillIds: ['abra-future-sight', 'abra-psychic', 'abra-calm-mind', 'abra-teleport'],
            },
            kadabra: {
                id: 'kadabra', name: 'Kadabra', types: [Type.PSYCHIC],
                facePicture: '/game-assets/images/PokemonArena/abra/kadabrafp.webp',
                skillIds: ['kadabra-future-sight', 'kadabra-psychic', 'kadabra-calm-mind', 'kadabra-teleport'],
            },
        },
        skills: abraSkills,
    },
    krabby: {
        id: 'krabby', name: 'Krabby', types: [Type.WATER],
        facePicture: '/game-assets/images/PokemonArena/Krabby/krabbyfp.png',
        passiveDescription: 'After beginning three turns with Harden shield remaining, Krabby evolves into Kingler and restores 10 HP.',
        forcedEvolutionForm: 'kingler',
        startStatuses: [{
            id: 'krabby-harden-turn-tracker',
            name: 'Evolution - Kingler',
            hidden: true,
            harmful: false,
            durationActions: null,
            unremovable: true,
            evolveOnCounter: { counter: 'evolution', threshold: 3, form: 'kingler' },
        }],
        forms: {
            base: {
                id: 'base', name: 'Krabby', types: [Type.WATER],
                facePicture: '/game-assets/images/PokemonArena/Krabby/krabbyfp.png',
                skillIds: ['krabby-metal-claw', 'krabby-leer', 'krabby-crabhammer', 'krabby-harden'],
            },
            kingler: {
                id: 'kingler', name: 'Kingler', types: [Type.WATER],
                facePicture: '/game-assets/images/PokemonArena/Krabby/kinglerfp.webp',
                skillIds: ['kingler-metal-claw', 'kingler-leer', 'kingler-crabhammer', 'kingler-harden'],
                removeStatusIdsOnEnter: ['krabby-harden-turn-tracker'],
            },
        },
        skills: krabbySkills,
    },
    scyther: {
        id: 'scyther', name: 'Scyther', types: [Type.BUG, Type.FLYING],
        facePicture: '/game-assets/images/PokemonArena/scyther/scytherfp.webp',
        passiveDescription: 'Repeated Fury Cutter hits permanently scale its damage; Swords Dance opens Scyther burst windows.',
        forms: {
            base: {
                id: 'base', name: 'Scyther', types: [Type.BUG, Type.FLYING],
                facePicture: '/game-assets/images/PokemonArena/scyther/scytherfp.webp',
                skillIds: [
                    'scyther-fury-cutter',
                    'scyther-swords-dance',
                    'scyther-x-cutter',
                    'scyther-double-team',
                ],
            },
        },
        skills: scytherSkills,
    },
    eevee: {
        id: 'eevee', name: 'Eevee', types: [Type.NORMAL],
        facePicture: '/game-assets/images/PokemonArena/eevee/eevee/eeveefp.png',
        passiveDescription: 'A flexible Normal-type kit with protection, team damage, and independently randomized Hidden Power packets.',
        forms: {
            base: {
                id: 'base', name: 'Eevee', types: [Type.NORMAL],
                facePicture: '/game-assets/images/PokemonArena/eevee/eevee/eeveefp.png',
                skillIds: ['eevee-dig', 'eevee-swift', 'eevee-hidden-power', 'eevee-protect'],
            },
        },
        skills: eeveeSkills,
    },
    jolteon: {
        id: 'jolteon', name: 'Jolteon', types: [Type.ELECTRIC],
        facePicture: '/game-assets/images/PokemonArena/eevee/jolteon/jolteonfp.png',
        passiveDescription: 'Punishes enemies that target Jolteon and uses Charge to reduce costs, amplify damage, and mitigate all damage classes.',
        forms: {
            base: {
                id: 'base', name: 'Jolteon', types: [Type.ELECTRIC],
                facePicture: '/game-assets/images/PokemonArena/eevee/jolteon/jolteonfp.png',
                skillIds: [
                    'jolteon-pin-missile',
                    'jolteon-thunderbolt',
                    'jolteon-thunder-fang',
                    'jolteon-charge',
                ],
            },
        },
        skills: jolteonSkills,
    },
    flareon: {
        id: 'flareon', name: 'Flareon', types: [Type.FIRE],
        facePicture: '/game-assets/images/PokemonArena/eevee/flareon/flareonfp.png',
        passiveDescription: 'Builds permanent defense and maintains source-bound affliction damage across the enemy team.',
        forms: {
            base: {
                id: 'base', name: 'Flareon', types: [Type.FIRE],
                facePicture: '/game-assets/images/PokemonArena/eevee/flareon/flareonfp.png',
                skillIds: [
                    'flareon-heating-up',
                    'flareon-fire-spin',
                    'flareon-fire-blast',
                    'flareon-double-team',
                ],
            },
        },
        skills: flareonSkills,
    },
    vaporeon: {
        id: 'vaporeon', name: 'Vaporeon', types: [Type.WATER],
        facePicture: '/game-assets/images/PokemonArena/eevee/vaporeon/vaporeonfp.png',
        passiveDescription: 'Switches Aurora Beam between enemy pressure and ally support, while redirecting and absorbing attacks.',
        forms: {
            base: {
                id: 'base', name: 'Vaporeon', types: [Type.WATER],
                facePicture: '/game-assets/images/PokemonArena/eevee/vaporeon/vaporeonfp.png',
                skillIds: [
                    'vaporeon-aurora-beam',
                    'vaporeon-sand-attack',
                    'vaporeon-hydro-pump',
                    'vaporeon-acid-armor',
                ],
            },
        },
        skills: vaporeonSkills,
    },
    ekans: {
        id: 'ekans', name: 'Ekans', types: [Type.POISON],
        facePicture: '/game-assets/images/PokemonArena/ekans/ekansfp.png',
        passiveDescription: 'Crunch evolves Ekans into Arbok when it executes an enemy; Toxic and Poison Fang build permanent pressure.',
        forcedEvolutionForm: 'arbok',
        forms: {
            base: {
                id: 'base', name: 'Ekans', types: [Type.POISON],
                facePicture: '/game-assets/images/PokemonArena/ekans/ekansfp.png',
                skillIds: ['ekans-poison-fang', 'ekans-toxic', 'ekans-shed-skin', 'ekans-crunch'],
            },
            arbok: {
                id: 'arbok', name: 'Arbok', types: [Type.POISON],
                facePicture: '/game-assets/images/PokemonArena/ekans/arbokfp.png',
                skillIds: ['arbok-poison-fang', 'arbok-toxic', 'arbok-shed-skin', 'arbok-crunch'],
            },
        },
        skills: ekansSkills,
    },
    machop: {
        id: 'machop', name: 'Machop', types: [Type.FIGHTING],
        facePicture: '/game-assets/images/PokemonArena/machop/machopfp.png',
        passiveDescription: 'A successful Counter or the second Bulk Up evolves Machop into Machoke and restores 10 HP.',
        forcedEvolutionForm: 'machoke',
        startStatuses: [{
            id: 'machop-bulk-up-evolution-tracker', name: 'Evolution - Machoke',
            hidden: true, harmful: false, durationActions: null, unremovable: true,
            evolveOnCounter: { counter: 'bulk-up', threshold: 2, form: 'machoke' },
        }],
        forms: {
            base: {
                id: 'base', name: 'Machop', types: [Type.FIGHTING],
                facePicture: '/game-assets/images/PokemonArena/machop/machopfp.png',
                skillIds: ['machop-brick-break', 'machop-counter', 'machop-bulk-up', 'machop-taunt'],
            },
            machoke: {
                id: 'machoke', name: 'Machoke', types: [Type.FIGHTING],
                facePicture: '/game-assets/images/PokemonArena/machop/machokefp.png',
                skillIds: ['machoke-brick-break', 'machoke-counter', 'machoke-bulk-up', 'machoke-taunt'],
                removeStatusIdsOnEnter: ['machop-bulk-up-evolution-tracker'],
            },
        },
        skills: machopSkills,
    },
    magikarp: {
        id: 'magikarp', name: 'Magikarp', types: [Type.WATER],
        facePicture: '/game-assets/images/PokemonArena/magikarp/magikarpfp.png',
        passiveDescription: 'At the start of its sixth turn, Magikarp evolves into Gyarados; Splash advances that clock by one.',
        forcedEvolutionForm: 'gyarados',
        startStatuses: [{
            id: 'magikarp-evolution-tracker', name: 'Evolution - Gyarados',
            hidden: false, harmful: false, durationActions: null, unremovable: true,
            turnStartActorCounter: { counter: 'evolution', delta: 1, maximum: 6 },
            evolveOnCounter: { counter: 'evolution', threshold: 6, form: 'gyarados' },
        }],
        forms: {
            base: {
                id: 'base', name: 'Magikarp', types: [Type.WATER],
                facePicture: '/game-assets/images/PokemonArena/magikarp/magikarpfp.png',
                skillIds: ['magikarp-tackle', 'magikarp-splash', 'magikarp-flail', 'magikarp-struggle'],
            },
            gyarados: {
                id: 'gyarados', name: 'Gyarados', types: [Type.WATER, Type.FLYING],
                facePicture: '/game-assets/images/PokemonArena/magikarp/gyaradosfp.png',
                skillIds: ['gyarados-hyper-beam', 'gyarados-dragon-rage', 'gyarados-ice-fang', 'gyarados-hydro-pump'],
                removeStatusIdsOnEnter: ['magikarp-evolution-tracker'],
            },
        },
        skills: magikarpSkills,
    },
    'mr-mime': {
        id: 'mr-mime', name: 'Mr. Mime', types: [Type.PSYCHIC, Type.FAIRY],
        facePicture: '/game-assets/images/PokemonArena/Mr.mime/fp.jpg',
        passiveDescription: 'Dazzling Gleam stacks extra protection for the next screen; Safeguard extends and strengthens Mr. Mime\'s team utility.',
        forms: {
            base: {
                id: 'base', name: 'Mr. Mime', types: [Type.PSYCHIC, Type.FAIRY],
                facePicture: '/game-assets/images/PokemonArena/Mr.mime/fp.jpg',
                skillIds: [
                    'mr-mime-dazzling-gleam',
                    'mr-mime-forcefield',
                    'mr-mime-light-screen',
                    'mr-mime-safeguard',
                ],
            },
        },
        skills: mrMimeSkills,
    },
    hitmonchan: {
        id: 'hitmonchan', name: 'Hitmonchan', types: [Type.FIGHTING],
        facePicture: '/game-assets/images/PokemonArena/hitmonchan/fp.webp',
        passiveDescription: 'Elemental punches each store 10 additional damage for the next Mega Punch.',
        forms: {
            base: {
                id: 'base', name: 'Hitmonchan', types: [Type.FIGHTING],
                facePicture: '/game-assets/images/PokemonArena/hitmonchan/fp.webp',
                skillIds: [
                    'hitmonchan-thunder-punch',
                    'hitmonchan-fire-punch',
                    'hitmonchan-ice-punch',
                    'hitmonchan-mega-punch',
                ],
            },
        },
        skills: hitmonchanSkills,
    },
    hitmonlee: {
        id: 'hitmonlee', name: 'Hitmonlee', types: [Type.FIGHTING],
        facePicture: '/game-assets/images/PokemonArena/hitmonlee/fp.webp',
        passiveDescription: 'Focus Energy raises its independent critical rolls, while Double Kick and Low Kick alternate in the first skill slot.',
        forms: {
            base: {
                id: 'base', name: 'Hitmonlee', types: [Type.FIGHTING],
                facePicture: '/game-assets/images/PokemonArena/hitmonlee/fp.webp',
                skillIds: [
                    'hitmonlee-double-kick',
                    'hitmonlee-focus-energy',
                    'hitmonlee-mega-kick',
                    'hitmonlee-high-jump-kick',
                ],
            },
        },
        skills: hitmonleeSkills,
    },
    aerodactyl: {
        id: 'aerodactyl', name: 'Aerodactyl', types: [Type.ROCK, Type.FLYING],
        facePicture: '/game-assets/images/PokemonArena/aerodactyl/fp.webp',
        passiveDescription: 'Rock Head prevents self-skill recoil from reducing Aerodactyl below 1 HP and converts the actual HP lost into tracked Shield.',
        startStatuses: [{
            id: 'aerodactyl-rock-head-passive', name: 'Rock Head',
            description: 'Self-skill recoil cannot reduce Aerodactyl below 1 HP and grants equal tracked Shield.',
            hidden: false, harmful: false, durationActions: null, unremovable: true,
            sourceSkillId: 'aerodactyl-passive-tough-head',
            minimumHpFromSelfSkillDamage: 1,
            selfSkillHealthLossShieldStatus: aerodactylRockHeadDefense,
        }],
        forms: {
            base: {
                id: 'base', name: 'Aerodactyl', types: [Type.ROCK, Type.FLYING],
                facePicture: '/game-assets/images/PokemonArena/aerodactyl/fp.webp',
                skillIds: [
                    'aerodactyl-take-down',
                    'aerodactyl-rock-slide',
                    'aerodactyl-double-edge',
                    'aerodactyl-stone-edge',
                ],
            },
        },
        skills: aerodactylSkills,
    },
    magnemite: {
        id: 'magnemite', name: 'Magnemite', types: [Type.ELECTRIC, Type.STEEL],
        facePicture: '/game-assets/images/PokemonArena/mangemite/magnemitefp.webp',
        passiveDescription: 'Using both Spark and Thunder Wave while Magnet Rise is active evolves Magnemite into Magneton and restores 10 HP.',
        forcedEvolutionForm: 'magneton',
        forms: {
            base: {
                id: 'base', name: 'Magnemite', types: [Type.ELECTRIC, Type.STEEL],
                facePicture: '/game-assets/images/PokemonArena/mangemite/magnemitefp.webp',
                skillIds: [
                    'magnemite-spark',
                    'magnemite-thunder-wave',
                    'magnemite-swift',
                    'magnemite-magnet-rise',
                ],
            },
            magneton: {
                id: 'magneton', name: 'Magneton', types: [Type.ELECTRIC, Type.STEEL],
                facePicture: '/game-assets/images/PokemonArena/mangemite/magnetonfp.webp',
                skillIds: [
                    'magneton-spark',
                    'magneton-thunder-wave',
                    'magneton-flash-cannon',
                    'magneton-magnet-rise',
                ],
            },
        },
        skills: magnemiteSkills,
    },
    onix: {
        id: 'onix', name: 'Onix', types: [Type.ROCK, Type.GROUND],
        facePicture: '/game-assets/images/PokemonArena/onix/fp.webp',
        passiveDescription: 'Sturdy prevents the first lethal hit, leaving Onix at 1 HP, and ignores execute effects until it is consumed.',
        startStatuses: [{
            id: 'onix-sturdy-passive',
            name: 'Sturdy',
            description: 'The first lethal hit leaves Onix at 1 HP. Execute effects are ignored until Sturdy is consumed.',
            hidden: false,
            harmful: false,
            durationActions: null,
            unremovable: true,
            minimumHp: 1,
            consumeOnPreventedDeath: true,
            ignoreExecutionEffects: true,
            sourceSkillId: 'onix-passive-sturdy',
        }],
        forms: {
            base: {
                id: 'base', name: 'Onix', types: [Type.ROCK, Type.GROUND],
                facePicture: '/game-assets/images/PokemonArena/onix/fp.webp',
                skillIds: [
                    'onix-rock-throw',
                    'onix-iron-tail',
                    'onix-stealth-rock',
                    'onix-harden',
                ],
            },
        },
        skills: onixSkills,
    },
    meowth: {
        id: 'meowth', name: 'Meowth', types: [Type.NORMAL],
        facePicture: '/game-assets/images/PokemonArena/Meowth/FP.png',
        passiveDescription: 'After successfully extending Fury Swipes three times, Meowth evolves into Persian and restores 15 HP.',
        forcedEvolutionForm: 'persian',
        startStatuses: [{
            id: 'meowth-persian-evolution-tracker',
            name: 'Evolution - Persian',
            description: 'Evolves into Persian after extending Fury Swipes three times.',
            hidden: true,
            harmful: false,
            durationActions: null,
            unremovable: true,
            evolveOnCounter: { counter: 'evolution', threshold: 3, form: 'persian' },
            sourceSkillId: 'meowth-passive-evolution-persian',
        }],
        forms: {
            base: {
                id: 'base', name: 'Meowth', types: [Type.NORMAL],
                facePicture: '/game-assets/images/PokemonArena/Meowth/FP.png',
                skillIds: [
                    'meowth-pay-day',
                    'meowth-fury-swipes',
                    'meowth-fake-out',
                    'meowth-night-slash',
                ],
            },
            persian: {
                id: 'persian', name: 'Persian', types: [Type.NORMAL],
                facePicture: '/game-assets/images/PokemonArena/Meowth/persianfp.png',
                remapTriggeringSkillCooldown: true,
                healOnEnter: 15,
                skillIds: [
                    'persian-pay-day',
                    'persian-fury-swipes',
                    'persian-fake-out',
                    'persian-night-slash',
                ],
            },
        },
        skills: meowthSkills,
    },
    clefairy: {
        id: 'clefairy', name: 'Clefairy', types: [Type.FAIRY],
        facePicture: '/game-assets/images/PokemonArena/clefairy/fp.webp',
        passiveName: 'Evolution - Clefable',
        passiveDescription: 'After restoring 75 actual HP, Clefairy evolves into Clefable with improved skills.',
        forcedEvolutionForm: 'clefable',
        startStatuses: [{
            id: 'clefairy-evolution-tracker',
            name: 'Evolution - Clefable',
            description: 'Evolves into Clefable after restoring 75 actual HP.',
            hidden: true,
            harmful: false,
            durationActions: null,
            unremovable: true,
            evolveOnCounter: { counter: 'evolution', threshold: 75, form: 'clefable' },
            sourceSkillId: 'clefairy-evolution-clefable',
        }],
        forms: {
            base: {
                id: 'base', name: 'Clefairy', types: [Type.FAIRY],
                facePicture: '/game-assets/images/PokemonArena/clefairy/fp.webp',
                skillIds: [
                    'clefairy-metronome',
                    'clefairy-double-slap',
                    'clefairy-disarming-voice',
                    'clefairy-moonlight',
                ],
            },
            clefable: {
                id: 'clefable', name: 'Clefable', types: [Type.FAIRY],
                facePicture: '/game-assets/images/PokemonArena/clefairy/clefablefp.webp',
                healOnEnter: 0,
                skillIds: [
                    'clefable-metronome',
                    'clefable-double-slap',
                    'clefable-disarming-voice',
                    'clefable-moonlight',
                ],
            },
        },
        skills: clefairySkills,
    },
    jigglypuff: {
        id: 'jigglypuff', name: 'Jigglypuff', types: [Type.NORMAL, Type.FAIRY],
        facePicture: '/game-assets/images/PokemonArena/jigglypuff/fp.webp',
        passiveName: 'Evolution - Wigglytuff',
        passiveDescription: 'When Perish Song defeats an enemy, Jigglypuff evolves into Wigglytuff and restores 10 HP.',
        forcedEvolutionForm: 'wigglytuff',
        startStatuses: [{
            id: 'jigglypuff-evolution-tracker',
            name: 'Evolution - Wigglytuff',
            description: 'Evolves into Wigglytuff after Perish Song defeats an enemy.',
            hidden: false,
            harmful: false,
            durationActions: null,
            unremovable: true,
            sourceSkillId: 'jigglypuff-evolution-wigglytuff',
        }],
        forms: {
            base: {
                id: 'base', name: 'Jigglypuff', types: [Type.NORMAL, Type.FAIRY],
                facePicture: '/game-assets/images/PokemonArena/jigglypuff/fp.webp',
                skillIds: [
                    'jigglypuff-perish-song',
                    'jigglypuff-sing',
                    'jigglypuff-wish',
                    'jigglypuff-humiliate',
                ],
            },
            wigglytuff: {
                id: 'wigglytuff', name: 'Wigglytuff', types: [Type.NORMAL, Type.FAIRY],
                facePicture: '/game-assets/images/PokemonArena/jigglypuff/wigglytufffp.webp',
                removeStatusIdsOnEnter: ['jigglypuff-evolution-tracker'],
                healOnEnter: 10,
                skillIds: [
                    'wigglytuff-perish-song',
                    'wigglytuff-sing',
                    'wigglytuff-wish',
                    'wigglytuff-humiliate',
                ],
            },
        },
        skills: jigglypuffSkills,
    },
    beedrill: {
        id: 'beedrill', name: 'Beedrill', types: [Type.BUG, Type.POISON],
        facePicture: '/game-assets/images/PokemonArena/beedrill/FP.png',
        passiveName: 'Evolution - Mega Beedrill',
        passiveDescription: 'After Envenom is used twice, Beedrill evolves, heals 25 HP, and gains permanent 10 flat unpierceable reduction.',
        forcedEvolutionForm: 'mega-beedrill',
        startStatuses: [{
            id: 'beedrill-evolution-tracker',
            name: 'Evolution - Mega Beedrill',
            description: 'Envenom has been used 0/2 times.',
            hidden: false,
            harmful: false,
            durationActions: null,
            unremovable: true,
            sourceSkillId: 'beedrill-evolution-mega',
            evolveOnCounter: { counter: 'envenomUses', threshold: 2, form: 'mega-beedrill' },
        }],
        forms: {
            base: {
                id: 'base', name: 'Beedrill', types: [Type.BUG, Type.POISON],
                facePicture: '/game-assets/images/PokemonArena/beedrill/FP.png',
                skillIds: [
                    'beedrill-poison-sting',
                    'beedrill-twinneedle',
                    'beedrill-envenom',
                    'beedrill-hive-swarm',
                ],
            },
            'mega-beedrill': {
                id: 'mega-beedrill', name: 'Mega Beedrill', types: [Type.BUG, Type.POISON],
                facePicture: '/game-assets/images/PokemonArena/beedrill/megafp.webp',
                removeStatusIdsOnEnter: ['beedrill-evolution-tracker'],
                healOnEnter: 25,
                addStatusesOnEnter: [{
                    id: 'beedrill-mega-reduction',
                    name: 'Mega Beedrill Reduction',
                    description: 'Permanently reduces incoming non-affliction damage by 10.',
                    hidden: false,
                    harmful: false,
                    durationActions: null,
                    unremovable: true,
                    unpierceableDamageReductionFlat: 10,
                    sourceSkillId: 'beedrill-evolution-mega',
                }],
                skillIds: [
                    'mega-beedrill-poison-sting',
                    'beedrill-twinneedle',
                    'mega-beedrill-fell-stinger',
                    'beedrill-hive-swarm-mega',
                ],
            },
        },
        skills: beedrillSkills,
    },
    articuno: {
        id: 'articuno', name: 'Articuno', types: [Type.ICE, Type.FLYING],
        facePicture: '/game-assets/images/PokemonArena/articuno/fp.png',
        passiveName: 'Sheer Cold Escalation',
        passiveDescription: 'Every Sheer Cold permanently adds 5 damage to future uses.',
        startStatuses: [{
            id: 'articuno-sheer-cold-tracker',
            name: 'Sheer Cold Escalation',
            description: 'Sheer Cold has 0 permanent bonus damage.',
            hidden: false, harmful: false, durationActions: null, unremovable: true,
            sourceSkillId: 'articuno-sheer-cold', bonusDamage: 0,
        }],
        forms: {
            base: {
                id: 'base', name: 'Articuno', types: [Type.ICE, Type.FLYING],
                facePicture: '/game-assets/images/PokemonArena/articuno/fp.png',
                skillIds: [
                    'articuno-blizzard',
                    'articuno-ice-beam',
                    'articuno-sheer-cold',
                    'articuno-fast-agility',
                ],
            },
        },
        skills: articunoSkills,
    },
    moltres: {
        id: 'moltres', name: 'Moltres', types: [Type.FIRE, Type.FLYING],
        facePicture: '/game-assets/images/PokemonArena/moltres/FP.png',
        passiveName: 'Heat',
        passiveDescription: 'Stores up to 3 Heat; Overheat consumes it and permanently weakens each future Heat stack.',
        startStatuses: [{
            id: 'moltres-heat-tracker',
            name: 'Heat',
            description: 'Moltres has 0/3 Heat and Overheat has not been used.',
            hidden: false, harmful: false, durationActions: null, unremovable: true,
            sourceSkillId: 'moltres-heat', heat: 0, overheatPenalty: 0, overheatUses: 0,
        }],
        forms: {
            base: {
                id: 'base', name: 'Moltres', types: [Type.FIRE, Type.FLYING],
                facePicture: '/game-assets/images/PokemonArena/moltres/FP.png',
                skillIds: [
                    'moltres-fire-spin',
                    'moltres-sunny-day',
                    'moltres-heat-wave',
                    'moltres-overheat',
                ],
            },
        },
        skills: moltresSkills,
    },
    zapdos: {
        id: 'zapdos', name: 'Zapdos', types: [Type.ELECTRIC, Type.FLYING],
        facePicture: '/game-assets/images/PokemonArena/zapdos/fp.png',
        passiveDescription: 'Thunderstorm punishes harmful skills, buffs Electric skills, and accelerates Zap Cannon.',
        forms: {
            base: {
                id: 'base', name: 'Zapdos', types: [Type.ELECTRIC, Type.FLYING],
                facePicture: '/game-assets/images/PokemonArena/zapdos/fp.png',
                skillIds: [
                    'zapdos-charge',
                    'zapdos-thunderstorm',
                    'zapdos-zap-cannon',
                    'zapdos-flight',
                ],
            },
        },
        skills: zapdosSkills,
    },
    zubat: {
        id: 'zubat', name: 'Zubat', types: [Type.POISON, Type.FLYING],
        facePicture: '/game-assets/images/PokemonArena/zubat/zubatfp.webp',
        passiveDescription: 'After stealing 50 HP, Zubat evolves into Golbat and restores 10 HP.',
        forcedEvolutionForm: 'golbat',
        forms: {
            base: {
                id: 'base', name: 'Zubat', types: [Type.POISON, Type.FLYING],
                facePicture: '/game-assets/images/PokemonArena/zubat/zubatfp.webp',
                skillIds: ['zubat-leech-life', 'zubat-supersonic', 'zubat-bite', 'zubat-draining-fangs'],
            },
            golbat: {
                id: 'golbat', name: 'Golbat', types: [Type.POISON, Type.FLYING],
                facePicture: '/game-assets/images/PokemonArena/zubat/golbatfp.webp',
                skillIds: ['golbat-leech-life', 'golbat-supersonic', 'golbat-bite', 'golbat-draining-fangs'],
            },
        },
        skills: [
            skill({
                id: 'zubat-leech-life', name: 'Leech Life',
                description: 'Steals 25 HP, with bonuses from Supersonic and Bite, then punishes the target’s next skill.',
                target: 'single-enemy', energy: [Energy.BLOODLINE], cooldown: 1, moveType: Type.BUG,
                effects: [
                    { kind: 'drain', amount: 25, damageKind: 'normal', actorCounterFromDamage: { counter: 'evolution', maximum: 50 } },
                    { kind: 'drain', amount: 5, damageKind: 'normal', requiresTargetStatus: 'zubat-supersonic-mark', actorCounterFromDamage: { counter: 'evolution', maximum: 50 } },
                    { kind: 'drain', amount: 5, damageKind: 'normal', requiresActorStatus: 'zubat-bite-bonus', consumeActorStatus: 'zubat-bite-bonus', actorCounterFromDamage: { counter: 'evolution', maximum: 50 } },
                    { kind: 'status', status: {
                        id: 'zubat-leech-life-reckoning', name: 'Leech Life Reckoning', hidden: false, harmful: true,
                        durationActions: 1, durationAnchor: 'target', onUseSkill: {
                            damageToOwner: 5, healSource: 5, sourceCounter: 'evolution',
                            sourceCounterDelta: 5, sourceCounterMaximum: 50, consume: true,
                        },
                    } },
                    { kind: 'steal-energy', requiresActorStatus: 'zubat-draining-fangs-active' },
                ],
            }),
            skill({
                id: 'zubat-supersonic', name: 'Supersonic',
                description: 'For the target’s next turn, skills cost 1 extra random energy and have a 45% chance to fail for 15 HP loss.',
                target: 'single-enemy', energy: [Energy.GENJUTSU], cooldown: 3, moveType: Type.NORMAL,
                effects: [{ kind: 'status', status: {
                    id: 'zubat-supersonic-mark', name: 'Supersonic', hidden: false, harmful: true,
                    durationActions: 1, durationAnchor: 'target', randomCostIncrease: 1, skillFailChance: 45, skillFailDamage: 15,
                } }],
            }),
            skill({
                id: 'zubat-bite', name: 'Bite',
                description: 'Deals 20 damage, increases active cooldowns against Supersonic, and empowers the next Leech Life.',
                target: 'single-enemy', energy: [Energy.TAIJUTSU], cooldown: 0, moveType: Type.DARK,
                effects: [
                    { kind: 'damage', amount: 20, damageKind: 'normal' },
                    { kind: 'source-status', status: {
                        id: 'zubat-bite-bonus', name: 'Bite Empowerment', hidden: true, harmful: false,
                        durationActions: 1, durationAnchor: 'source',
                    } },
                    { kind: 'modify-cooldowns', amount: 1, requiresTargetStatus: 'zubat-supersonic-mark' },
                    { kind: 'steal-energy', requiresActorStatus: 'zubat-draining-fangs-active' },
                ],
            }),
            skill({
                id: 'zubat-draining-fangs', name: 'Draining Fangs',
                description: 'For three Zubat turns, Leech Life and Bite steal 1 random energy.',
                target: 'self', energy: [Energy.BLOODLINE], cooldown: 3, moveType: Type.DARK, harmful: false,
                effects: [{ kind: 'status', status: {
                    id: 'zubat-draining-fangs-active', name: 'Draining Fangs', hidden: false, harmful: false,
                    durationActions: 3, durationAnchor: 'source',
                } }],
            }),
            skill({
                id: 'golbat-leech-life', name: 'Leech Life',
                description: 'Steals 30 HP, gains 10-point Supersonic and Bite bonuses, and punishes the target’s next skill for 20.',
                target: 'single-enemy', energy: [Energy.BLOODLINE, Energy.RANDOM], cooldown: 1, moveType: Type.BUG,
                effects: [
                    { kind: 'drain', amount: 30, damageKind: 'normal' },
                    { kind: 'drain', amount: 10, damageKind: 'normal', requiresTargetStatus: 'golbat-supersonic-mark' },
                    { kind: 'drain', amount: 10, damageKind: 'normal', requiresActorStatus: 'golbat-bite-bonus', consumeActorStatus: 'golbat-bite-bonus' },
                    { kind: 'status', status: {
                        id: 'golbat-leech-life-reckoning', name: 'Leech Life Reckoning', hidden: false, harmful: true,
                        durationActions: 1, durationAnchor: 'target', onUseSkill: { damageToOwner: 20, healSource: 20, consume: true },
                    } },
                    { kind: 'steal-energy', requiresActorStatus: 'golbat-draining-fangs-active' },
                ],
            }),
            skill({
                id: 'golbat-supersonic', name: 'Supersonic',
                description: 'For two target turns, skills cost 1 extra random energy and have a 45% chance to fail for 15 HP loss.',
                target: 'single-enemy', energy: [Energy.GENJUTSU, Energy.RANDOM], cooldown: 3, moveType: Type.NORMAL,
                effects: [{ kind: 'status', status: {
                    id: 'golbat-supersonic-mark', name: 'Supersonic', hidden: false, harmful: true,
                    durationActions: 2, durationAnchor: 'target', randomCostIncrease: 1, skillFailChance: 45, skillFailDamage: 15,
                } }],
            }),
            skill({
                id: 'golbat-bite', name: 'Bite',
                description: 'Deals 30 damage ignoring reduction, increases active cooldowns against Supersonic, and empowers Leech Life.',
                target: 'single-enemy', energy: [Energy.TAIJUTSU, Energy.RANDOM], cooldown: 0, moveType: Type.DARK,
                effects: [
                    { kind: 'damage', amount: 30, damageKind: 'normal-ignore-reduction' },
                    { kind: 'source-status', status: {
                        id: 'golbat-bite-bonus', name: 'Bite Empowerment', hidden: true, harmful: false,
                        durationActions: 1, durationAnchor: 'source',
                    } },
                    { kind: 'modify-cooldowns', amount: 1, requiresTargetStatus: 'golbat-supersonic-mark' },
                    { kind: 'steal-energy', requiresActorStatus: 'golbat-draining-fangs-active' },
                ],
            }),
            skill({
                id: 'golbat-draining-fangs', name: 'Draining Fangs',
                description: 'For three Golbat turns, Leech Life and Bite steal 1 random energy.',
                target: 'self', energy: [Energy.BLOODLINE, Energy.RANDOM], cooldown: 3, moveType: Type.DARK, harmful: false,
                effects: [{ kind: 'status', status: {
                    id: 'golbat-draining-fangs-active', name: 'Draining Fangs', hidden: false, harmful: false,
                    durationActions: 3, durationAnchor: 'source',
                } }],
            }),
        ],
    },
    chansey: {
        id: 'chansey', name: 'Chansey', types: [Type.NORMAL],
        facePicture: '/game-assets/images/PokemonArena/Chansey/chanseyfp.webp',
        passiveDescription: 'After restoring 100 actual HP, Chansey evolves into Blissey and restores 10 HP.',
        forcedEvolutionForm: 'blissey',
        forms: {
            base: {
                id: 'base', name: 'Chansey', types: [Type.NORMAL],
                facePicture: '/game-assets/images/PokemonArena/Chansey/chanseyfp.webp',
                skillIds: ['chansey-eggbomb', 'chansey-pokemon-center-healing', 'chansey-softboil', 'chansey-emergency-life-support'],
            },
            blissey: {
                id: 'blissey', name: 'Blissey', types: [Type.NORMAL],
                facePicture: '/game-assets/images/PokemonArena/Chansey/blisseyfp.webp',
                skillIds: ['blissey-eggbomb', 'blissey-pokemon-center-healing', 'blissey-softboil', 'blissey-emergency-life-support'],
            },
        },
        skills: [
            skill({
                id: 'chansey-eggbomb', name: 'Egg Bomb',
                description: 'Deals 20 affliction damage and blocks healing through the target turn.',
                target: 'single-enemy', energy: [Energy.RANDOM], cooldown: 1, moveType: Type.NORMAL,
                ignoreDamageReduction: true,
                effects: [
                    { kind: 'damage', amount: 20, damageKind: 'affliction' },
                    { kind: 'status', status: {
                        id: 'heal-block', name: 'Healing Blocked', hidden: false, harmful: true,
                        durationActions: 1, healBlocked: true,
                    } },
                ],
            }),
            skill({
                id: 'chansey-pokemon-center-healing', name: 'Pokémon Center Healing',
                description: 'Heals all allies for 10, then grants each living ally 5 defense at the end of three Chansey turns.',
                target: 'all-allies', energy: [Energy.RANDOM], cooldown: 3,
                moveType: Type.NORMAL, classes: ['Normal', 'Physical', 'Instant'], harmful: false,
                effects: [
                    { kind: 'heal', scope: 'all-allies', amount: 10, actorCounterFromHealing: { counter: 'evolution', maximum: 100 } },
                    { kind: 'source-status', scope: 'self', status: {
                        id: 'chansey-pokemon-center-active', name: 'Pokémon Center Healing', hidden: false, harmful: false,
                        durationActions: 3, durationAnchor: 'source', turnEndShieldAllies: 5,
                        skillCostOverrides: { 'chansey-emergency-life-support': [Energy.BLOODLINE, Energy.GENJUTSU] },
                    } },
                ],
            }),
            skill({
                id: 'chansey-softboil', name: 'Softboil',
                description: 'Heals one other ally for 25 and may prevent defeat through its next turn; Pokémon Center guarantees it.',
                target: 'single-ally', energy: [Energy.GENJUTSU], cooldown: 1,
                moveType: Type.NORMAL, harmful: false, effects: [
                    { kind: 'heal', amount: 25, actorCounterFromHealing: { counter: 'evolution', maximum: 100 } },
                    { kind: 'status', percent: 50, unlessActorStatus: 'chansey-pokemon-center-active', status: {
                        id: 'chansey-softboil-undying', name: 'Softboil Protection', hidden: false, harmful: false,
                        durationActions: 1, minimumHp: 1,
                    } },
                    { kind: 'status', requiresActorStatus: 'chansey-pokemon-center-active', status: {
                        id: 'chansey-softboil-undying', name: 'Softboil Protection', hidden: false, harmful: false,
                        durationActions: 1, minimumHp: 1,
                    } },
                ],
            }),
            skill({
                id: 'chansey-emergency-life-support', name: 'Pokémon Center Emergency Life Support',
                description: 'Restores 50 HP to one other living ally and removes harmful statuses.',
                target: 'single-ally', energy: [Energy.BLOODLINE, Energy.GENJUTSU], cooldown: 4,
                moveType: Type.NORMAL, harmful: false, effects: [
                    { kind: 'heal', amount: 50, actorCounterFromHealing: { counter: 'evolution', maximum: 100 } },
                    { kind: 'cleanse' },
                ],
            }),
            skill({
                id: 'blissey-eggbomb', name: 'Egg Bomb',
                description: 'Deals 30 affliction damage and blocks healing through the target turn.',
                target: 'single-enemy', energy: [Energy.RANDOM, Energy.RANDOM], cooldown: 1, moveType: Type.NORMAL,
                ignoreDamageReduction: true,
                effects: [
                    { kind: 'damage', amount: 30, damageKind: 'affliction' },
                    { kind: 'status', status: {
                        id: 'blissey-heal-block', name: 'Healing Blocked', hidden: false, harmful: true,
                        durationActions: 1, healBlocked: true,
                    } },
                ],
            }),
            skill({
                id: 'blissey-pokemon-center-healing', name: 'Pokémon Center Healing',
                description: 'Heals all allies for 15, then grants each living ally 10 defense at the end of three Blissey turns.',
                target: 'all-allies', energy: [Energy.RANDOM, Energy.RANDOM], cooldown: 3,
                moveType: Type.NORMAL, classes: ['Normal', 'Physical', 'Instant'], harmful: false,
                effects: [
                    { kind: 'heal', scope: 'all-allies', amount: 15 },
                    { kind: 'source-status', scope: 'self', status: {
                        id: 'blissey-pokemon-center-active', name: 'Pokémon Center Healing', hidden: false, harmful: false,
                        durationActions: 3, durationAnchor: 'source', turnEndShieldAllies: 10,
                        skillCostOverrides: { 'blissey-emergency-life-support': [Energy.BLOODLINE, Energy.GENJUTSU] },
                    } },
                ],
            }),
            skill({
                id: 'blissey-softboil', name: 'Softboil',
                description: 'Heals the target for 25 and Blissey plus the remaining ally for 10; Pokémon Center guarantees protection.',
                target: 'single-ally', energy: [Energy.GENJUTSU, Energy.RANDOM], cooldown: 1,
                moveType: Type.NORMAL, harmful: false, effects: [
                    { kind: 'heal', amount: 25 },
                    { kind: 'heal', scope: 'self', amount: 10 },
                    { kind: 'heal', scope: 'all-allies-except-target', amount: 10 },
                    { kind: 'status', percent: 50, unlessActorStatus: 'blissey-pokemon-center-active', status: {
                        id: 'blissey-softboil-undying', name: 'Softboil Protection', hidden: false, harmful: false,
                        durationActions: 1, minimumHp: 1,
                    } },
                    { kind: 'status', requiresActorStatus: 'blissey-pokemon-center-active', status: {
                        id: 'blissey-softboil-undying', name: 'Softboil Protection', hidden: false, harmful: false,
                        durationActions: 1, minimumHp: 1,
                    } },
                ],
            }),
            skill({
                id: 'blissey-emergency-life-support', name: 'Pokémon Center Emergency Life Support',
                description: 'Heals and cleanses a living ally, or revives a defeated ally with 50 HP.',
                target: 'single-ally-or-dead-ally', energy: [Energy.BLOODLINE, Energy.GENJUTSU, Energy.RANDOM], cooldown: 5,
                moveType: Type.NORMAL, harmful: false, effects: [
                    { kind: 'heal', amount: 50, requiresTargetAlive: true },
                    { kind: 'revive', amount: 50, requiresTargetAlive: false },
                    { kind: 'cleanse' },
                ],
            }),
        ],
    },
    pidgey: {
        id: 'pidgey', name: 'Pidgey', types: [Type.NORMAL, Type.FLYING],
        facePicture: '/game-assets/images/PokemonArena/pidgey/pidgeyfp.webp',
        passiveDescription: 'After dealing 50 total damage, Pidgey evolves into Pidgeotto and restores 10 HP.',
        forcedEvolutionForm: 'pidgeotto',
        forms: {
            base: {
                id: 'base', name: 'Pidgey', types: [Type.NORMAL, Type.FLYING],
                facePicture: '/game-assets/images/PokemonArena/pidgey/pidgeyfp.webp',
                skillIds: ['pidgey-gust', 'pidgey-whirlwind', 'pidgey-peck', 'pidgey-sand-attack'],
            },
            pidgeotto: {
                id: 'pidgeotto', name: 'Pidgeotto', types: [Type.NORMAL, Type.FLYING],
                facePicture: '/game-assets/images/PokemonArena/pidgey/pidgeottofp.webp',
                skillIds: ['pidgeotto-gust', 'pidgeotto-whirlwind', 'pidgeotto-peck', 'pidgeotto-sand-attack'],
            },
        },
        skills: pidgeySkills,
    },
    mew: {
        id: 'mew', name: 'Mew', types: [Type.PSYCHIC],
        facePicture: '/game-assets/images/PokemonArena/mew/fp.png',
        passiveDescription: 'A mythical support that builds permanent barriers and converts accumulated shields into maximum HP.',
        forms: {
            base: {
                id: 'base', name: 'Mew', types: [Type.PSYCHIC],
                facePicture: '/game-assets/images/PokemonArena/mew/fp.png',
                skillIds: ['mew-psychic-barrier', 'mew-psychic', 'mew-pink-bubble', 'mew-life-dew'],
            },
        },
        skills: [
            skill({
                id: 'mew-psychic-barrier', name: 'Psychic Barrier',
                description: 'Gives an enemy 15 permanent stacking Barrier. While any remains, their skills cost 1 additional Random.',
                target: 'single-enemy', energy: [Energy.NINJUTSU], cooldown: 1,
                moveType: Type.PSYCHIC, classes: ['Psychic', 'Mental', 'Instant'],
                effects: [
                    { kind: 'barrier', amount: 15, trackedStatus: {
                        id: 'mew-psychic-barrier-active', name: 'Psychic Barrier', hidden: false, harmful: true,
                        durationActions: null, randomCostIncrease: 1, removeWhenTrackedBarrierExhausted: true,
                    } },
                ],
            }),
            skill({
                id: 'mew-psychic', name: 'Psychic',
                description: "Deals 30 damage. If Psychic Barrier remains, the target's harmful skills deal 0 damage for 1 turn.",
                target: 'single-enemy', energy: [Energy.NINJUTSU, Energy.RANDOM], cooldown: 1,
                moveType: Type.PSYCHIC, classes: ['Psychic', 'Special', 'Instant'],
                effects: [
                    { kind: 'damage', amount: 30, damageKind: 'normal' },
                    { kind: 'status', requiresTargetStatus: 'mew-psychic-barrier-active', status: {
                        id: 'mew-psychic-suppression', name: 'Psychic Suppression', hidden: false, harmful: true,
                        durationActions: 1, outgoingDamageDebuff: 999,
                    } },
                ],
            }),
            skill({
                id: 'mew-pink-bubble', name: 'Pink Bubble',
                description: 'Gives an ally 15 permanent stacking Shield. While any remains, their skills cost 1 less Random.',
                target: 'self-or-single-ally', energy: [Energy.BLOODLINE], cooldown: 1,
                moveType: Type.PSYCHIC, classes: ['Psychic', 'Mental', 'Instant'], harmful: false,
                effects: [
                    { kind: 'shield', amount: 15, trackedStatus: {
                        id: 'mew-pink-bubble-active', name: 'Pink Bubble', hidden: false, harmful: false,
                        durationActions: null, randomCostReduction: 1, removeWhenTrackedShieldExhausted: true,
                    } },
                ],
            }),
            skill({
                id: 'mew-life-dew', name: 'Life Dew',
                description: 'Mew and one ally consume all Pink Bubble Shield, gain that much maximum HP, then heal 25% of updated maximum HP.',
                target: 'self-or-single-ally', energy: [Energy.BLOODLINE, Energy.RANDOM], cooldown: 2,
                moveType: Type.WATER, classes: ['Water', 'Mental', 'Instant'], harmful: false,
                effects: [
                    { kind: 'convert-shield-to-max-hp', scope: 'selected-and-self', healPercent: 25 },
                ],
            }),
        ],
    },
    mewtwo: {
        id: 'mewtwo', name: 'Mewtwo', types: [Type.PSYCHIC],
        facePicture: '/game-assets/images/PokemonArena/mewtwo/fp.png',
        passiveDescription: 'A deliberately direct bruiser with one efficient move for disruption, delay, sustain, and effect theft.',
        forms: {
            base: {
                id: 'base', name: 'Mewtwo', types: [Type.PSYCHIC],
                facePicture: '/game-assets/images/PokemonArena/mewtwo/fp.png',
                skillIds: ['mewtwo-psychic', 'mewtwo-shadow-ball', 'mewtwo-drain-punch', 'mewtwo-recover'],
            },
        },
        skills: [
            skill({
                id: 'mewtwo-psychic', name: 'Psychic',
                description: "Deals 20 damage and steals one copy-safe helpful active effect from the enemy for up to 2 turns. For 1 turn, Mewtwo's next Drain Punch or Shadow Ball deals 5 additional damage.",
                target: 'single-enemy', energy: [Energy.NINJUTSU], cooldown: 1,
                moveType: Type.PSYCHIC, classes: ['Psychic', 'Special', 'Instant'],
                effects: [
                    { kind: 'damage', amount: 20, damageKind: 'normal' },
                    { kind: 'steal-helpful-status', maxDuration: 2 },
                    {
                        kind: 'drain', amount: 5, damageKind: 'normal',
                        requiresActorStatus: 'mewtwo-drain-punch-followup', consumeActorStatus: 'mewtwo-drain-punch-followup',
                    },
                    {
                        kind: 'damage', amount: 5, damageKind: 'affliction',
                        requiresActorStatus: 'mewtwo-shadow-ball-followup', consumeActorStatus: 'mewtwo-shadow-ball-followup',
                    },
                    { kind: 'source-status', status: {
                        id: 'mewtwo-psychic-followup', name: 'Psychic Follow-Up', hidden: true, harmful: false,
                        durationActions: 1, durationAnchor: 'source',
                    } },
                ],
            }),
            skill({
                id: 'mewtwo-shadow-ball', name: 'Shadow Ball',
                description: "Deals 20 damage and delays the target's skills for 1 turn. For 1 turn, Mewtwo's next Drain Punch or Psychic deals 5 affliction damage.",
                target: 'single-enemy', energy: [Energy.BLOODLINE], cooldown: 1,
                moveType: Type.GHOST, classes: ['Ghost', 'Special', 'Instant'],
                effects: [
                    { kind: 'damage', amount: 20, damageKind: 'normal' },
                    { kind: 'modify-cooldowns', amount: 2, allSkills: true },
                    {
                        kind: 'damage', amount: 5, damageKind: 'normal',
                        requiresActorStatus: 'mewtwo-psychic-followup', consumeActorStatus: 'mewtwo-psychic-followup',
                    },
                    {
                        kind: 'drain', amount: 5, damageKind: 'normal',
                        requiresActorStatus: 'mewtwo-drain-punch-followup', consumeActorStatus: 'mewtwo-drain-punch-followup',
                    },
                    { kind: 'source-status', status: {
                        id: 'mewtwo-shadow-ball-followup', name: 'Shadow Ball Follow-Up', hidden: true, harmful: false,
                        durationActions: 1, durationAnchor: 'source',
                    } },
                ],
            }),
            skill({
                id: 'mewtwo-drain-punch', name: 'Drain Punch',
                description: "Steals 20 HP from one enemy. For 1 turn, Mewtwo's next Shadow Ball or Psychic steals 5 HP.",
                target: 'single-enemy', energy: [Energy.GENJUTSU], cooldown: 0,
                moveType: Type.FIGHTING, classes: ['Fighting', 'Physical', 'Instant'],
                effects: [
                    { kind: 'drain', amount: 20, damageKind: 'normal' },
                    {
                        kind: 'damage', amount: 5, damageKind: 'normal',
                        requiresActorStatus: 'mewtwo-psychic-followup', consumeActorStatus: 'mewtwo-psychic-followup',
                    },
                    {
                        kind: 'damage', amount: 5, damageKind: 'affliction',
                        requiresActorStatus: 'mewtwo-shadow-ball-followup', consumeActorStatus: 'mewtwo-shadow-ball-followup',
                    },
                    { kind: 'source-status', status: {
                        id: 'mewtwo-drain-punch-followup', name: 'Drain Punch Follow-Up', hidden: true, harmful: false,
                        durationActions: 1, durationAnchor: 'source',
                    } },
                ],
            }),
            skill({
                id: 'mewtwo-recover', name: 'Recover',
                description: 'Heals Mewtwo for 20 HP. Consecutive uses heal 2 less HP each time, stacking down to 0; using another skill resets it.',
                target: 'self', energy: [Energy.TAIJUTSU], cooldown: 0,
                moveType: Type.NORMAL, classes: ['Normal', 'Special', 'Instant'], harmful: false,
                effects: [
                    { kind: 'flat-heal-sequence', amount: 20, decrement: 2 },
                ],
            }),
        ],
    },
});

export function unitPresentation(unit) {
    const species = ROSTER[unit.effectiveSpeciesId ?? unit.speciesId];
    const formId = unit.effectiveSpeciesId ? unit.effectiveForm ?? 'base' : unit.form;
    const basePresentation = species?.forms?.[formId] ?? {
        id: 'base',
        name: species?.name,
        types: species?.types ?? [],
        facePicture: species?.facePicture,
        skillIds: species?.skills.map((entry) => entry.id) ?? [],
    };
    const replacements = (unit.statuses ?? [])
        .filter((status) =>
            status &&
            (status.durationActions === null || !Number.isFinite(status.durationActions) || status.durationActions > 0)
        )
        .reduce((map, status) => ({ ...map, ...(status.skillReplacements ?? {}) }), {});
    return {
        ...basePresentation,
        skillIds: basePresentation.skillIds.map((skillId) => replacements[skillId] ?? skillId),
    };
}

export const DEFAULT_TEAMS = Object.freeze({
    A: ['charmander', 'squirtle', 'bulbasaur'],
    B: ['pikachu', 'zubat', 'chansey'],
});

export const ROSTER_CATALOG = Object.freeze(
    Object.values(ROSTER).map((species) => Object.freeze({
        id: species.id,
        name: species.name,
        types: [...species.types],
        facePicture: species.facePicture,
        passiveDescription: species.passiveDescription ?? '',
        skillCount: species.skills.length,
    }))
);

export function validateTeamSelection(speciesIds) {
    if (!Array.isArray(speciesIds) || speciesIds.length !== 3) {
        return 'A team must contain exactly three Pokemon.';
    }
    if (new Set(speciesIds).size !== speciesIds.length) {
        return 'A team cannot contain duplicate Pokemon.';
    }
    const unknown = speciesIds.find((speciesId) => !ROSTER[speciesId]);
    if (unknown) return `Unknown Pokemon: ${unknown}.`;
    return null;
}

export function validateMatchTeams(teams) {
    if (!teams || typeof teams !== 'object') return 'Both match teams are required.';
    for (const player of ['A', 'B']) {
        const error = validateTeamSelection(teams[player]);
        if (error) return `Team ${player}: ${error}`;
    }
    return null;
}
