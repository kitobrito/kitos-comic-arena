const POKEMON_TYPES = Object.freeze([
    'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice', 'Fighting', 'Poison', 'Ground',
    'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy',
]);

const POKEMON_TYPE_SET = new Set(POKEMON_TYPES.map((type) => type.toLowerCase()));

const POKEMON_CHARACTER_TYPES = Object.freeze({
    charmander: ['Fire'],
    squirtle: ['Water'],
    bulbasaur: ['Grass', 'Poison'],
    pikachu: ['Electric'],
    butterfree: ['Bug', 'Flying'],
    'pokemon-trainer': ['Normal'],
    chansey: ['Normal'],
    pidgey: ['Normal', 'Flying'],
    koffing: ['Poison'],
    zubat: ['Poison', 'Flying'],
    gastly: ['Ghost', 'Poison'],
    abra: ['Psychic'],
    krabby: ['Water'],
    scyther: ['Bug', 'Flying'],
    eevee: ['Normal'],
    jolteon: ['Electric'],
    flareon: ['Fire'],
    vaporeon: ['Water'],
    ekans: ['Poison'],
    machop: ['Fighting'],
    magikarp: ['Water'],
    'mr-mime': ['Psychic', 'Fairy'],
    hitmonchan: ['Fighting'],
    hitmonlee: ['Fighting'],
    aerodactyl: ['Rock', 'Flying'],
    magnemite: ['Electric', 'Steel'],
    onix: ['Rock', 'Ground'],
    meowth: ['Normal'],
    clefairy: ['Fairy'],
    jigglypuff: ['Normal', 'Fairy'],
    beedrill: ['Bug', 'Poison'],
    articuno: ['Ice', 'Flying'],
    moltres: ['Fire', 'Flying'],
    zapdos: ['Electric', 'Flying'],
    mew: ['Psychic'],
    mewtwo: ['Psychic'],
    dragonite: ['Dragon', 'Flying'],
    cyndaquil: ['Fire'],
    chikorita: ['Grass'],
    totodile: ['Water'],
    aegislash: ['Steel', 'Ghost'],
    ditto: ['Normal'],
    scraggy: ['Dark', 'Fighting'],
    dragapult: ['Dragon', 'Ghost'],
    nincada: ['Bug', 'Ground'],
    ninjask: ['Bug', 'Flying'],
    shedinja: ['Bug', 'Ghost'],
    primeape: ['Fighting'],
    drowzee: ['Psychic'],
});

const skillsByType = {
    Normal: [
        'charmander-scratch', 'charmander-rage', 'charmander-charmeleon-rage',
        'charmander-charizard-x-rage', 'charmander-charizard-y-rage', 'squirtle-rapid-spin',
        'butterfree-whirlwind', 'pokemon-trainer-pokeball', 'pokemon-trainer-potion',
        'pokemon-trainer-x-stats', 'pokemon-trainer-rare-candy', 'pokemon-trainer-great-ball',
        'pokemon-trainer-ultra-ball', 'pokemon-trainer-master-ball', 'pokemon-trainer-revive',
        'chansey-eggbomb', 'chansey-pokemon-center-healing', 'chansey-softboil',
        'chansey-emergency-life-support', 'chansey-passive-evolution-blissey', 'blissey-eggbomb',
        'blissey-pokemon-center-healing', 'blissey-softboil', 'blissey-emergency-life-support',
        'pidgey-whirlwind', 'pidgey-passive-evolution-pidgeotto', 'pidgeotto-whirlwind',
        'koffing-self-destruct', 'koffing-smokescreen', 'koffing-weezing-self-destruct',
        'koffing-weezing-smokescreen', 'zubat-supersonic', 'golbat-supersonic', 'gastly-glare',
        'haunter-glare', 'krabby-harden', 'kingler-harden', 'scyther-swords-dance',
        'scyther-double-team', 'eevee-swift', 'eevee-hidden-power', 'eevee-protect',
        'flareon-double-team', 'magikarp-tackle', 'magikarp-splash', 'magikarp-flail',
        'magikarp-struggle', 'gyarados-hyper-beam', 'gyarados-hyper-beam-affliction',
        'mr-mime-safeguard', 'hitmonchan-mega-punch', 'hitmonlee-focus-energy',
        'hitmonlee-mega-kick', 'aerodactyl-take-down', 'aerodactyl-double-edge',
        'magnemite-swift', 'onix-harden', 'meowth-pay-day', 'meowth-fury-swipes',
        'meowth-fake-out', 'meowth-passive-evolution-persian', 'persian-pay-day',
        'persian-fury-swipes', 'persian-fake-out', 'clefairy-metronome',
        'clefairy-double-slap', 'jigglypuff-perish-song', 'jigglypuff-sing', 'jigglypuff-wish',
        'jigglypuff-humiliate', 'jigglypuff-evolution-wigglytuff', 'mewtwo-recover',
        'dragonite-hyper-beam', 'cyndaquil-aerial-tackle', 'cyndaquil-cynda-smokescreen',
        'chikorita-sweet-scent', 'totodile-scary-face', 'clefable-metronome',
        'drowzee-disable', 'hypno-disable',
        'clefable-double-slap', 'wigglytuff-perish-song', 'wigglytuff-sing',
        'wigglytuff-wish', 'wigglytuff-humiliate',
        'aegislash-slash', 'aegislash-swords-dance', 'aegislash-stance-change',
        'ditto-transform-1', 'ditto-transform-2', 'ditto-transform-3',
        'ditto-transform-4', 'ditto-passive-transform',
        'scraggy-headbutt', 'scrafty-headbutt', 'scraggy-leer', 'scrafty-leer',
        'scraggy-focus-energy', 'nincada-hidden-power', 'ninjask-extreme-speed',
        'ninjask-double-team',
    ],
    Fire: [
        'charmander-ember', 'charmander-flamethrower', 'charmander-passive-evolution-charmeleon',
        'charmander-fire-punch', 'charmander-charmeleon-flamethrower',
        'charmander-charizard-x-fire-punch', 'charmander-charizard-x-flamethrower',
        'charmander-charizard-y-fire-punch', 'charmander-charizard-y-flamethrower',
        'hitmonchan-fire-punch', 'flareon-heating-up', 'flareon-fire-spin', 'flareon-fire-blast',
        'moltres-fire-spin', 'moltres-sunny-day', 'moltres-heat-wave', 'moltres-overheat',
        'moltres-heat', 'cyndaquil-aerial-flamethrower', 'cyndaquil-skyward-leap',
        'cyndaquil-warming-up', 'cyndaquil-quilava-flame-wheel', 'cyndaquil-typhlosion-flame-wheel',
    ],
    Water: [
        'squirtle-water-gun', 'squirtle-withdraw', 'squirtle-bubble',
        'squirtle-passive-evolution-wartortle', 'wartortle-shell-guard', 'wartortle-hydro-pump',
        'wartortle-bubblebeam', 'wartortle-aqua-spin', 'krabby-leer', 'krabby-crabhammer',
        'krabby-passive-evolution-kingler', 'kingler-leer', 'kingler-crabhammer',
        'magikarp-passive-evolution-gyarados', 'gyarados-hydro-pump', 'vaporeon-hydro-pump',
        'mew-life-dew', 'totodile-aerial-water-gun', 'totodile-aqua-tail', 'totodile-water-rings',
        'totodile-croconaw-bite',
    ],
    Electric: [
        'pikachu-thundershock', 'pikachu-volt-tackle', 'pikachu-thunder', 'pikachu-passive-static',
        'jolteon-thunderbolt', 'jolteon-thunder-fang', 'jolteon-charge', 'hitmonchan-thunder-punch',
        'magnemite-spark', 'magnemite-thunder-wave', 'magnemite-magnet-rise',
        'magnemite-passive-evolution-magneton', 'magneton-spark', 'magneton-thunder-wave',
        'magneton-magnet-rise', 'zapdos-charge', 'zapdos-thunderbolt', 'zapdos-zap-cannon',
        'dragapult-ten-thousand-volt-thunderbolt',
    ],
    Grass: [
        'bulbasaur-leech-seed', 'bulbasaur-vine-whip', 'bulbasaur-razor-leaf',
        'bulbasaur-solar-beam', 'bulbasaur-passive-evolution-ivysaur', 'ivysaur-leech-seed',
        'ivysaur-vine-whip', 'ivysaur-razor-leaf', 'ivysaur-solar-beam',
        'butterfree-stun-spore', 'butterfree-sleep-powder', 'chikorita-aerial-razor-leaf',
        'chikorita-chikorita-solar-beam', 'chikorita-vine-defense', 'shedinja-solar-beam',
        'chikorita-bayleaf-magical-leaf', 'chikorita-meganium-magical-leaf',
    ],
    Ice: [
        'koffing-haze', 'koffing-weezing-haze', 'vaporeon-aurora-beam', 'gyarados-ice-fang',
        'hitmonchan-ice-punch', 'articuno-blizzard', 'articuno-ice-beam', 'articuno-sheer-cold',
    ],
    Fighting: [
        'machop-brick-break', 'machop-counter', 'machop-bulk-up',
        'machop-passive-evolution-machoke', 'machoke-brick-break', 'machoke-counter',
        'machoke-bulk-up', 'hitmonlee-double-kick', 'hitmonlee-high-jump-kick',
        'hitmonlee-low-kick', 'mewtwo-drain-punch', 'totodile-superpower',
        'aegislash-sacred-sword',
        'scraggy-hi-jump-kick', 'scrafty-hi-jump-kick',
        'scraggy-focus-blast', 'scrafty-focus-blast',
        'primeape-rock-smash', 'primeape-close-combat', 'primeape-passive-anger-point',
    ],
    Poison: [
        'koffing-smog', 'koffing-passive-poison-gas', 'koffing-passive-evolution-weezing',
        'koffing-weezing-passive-poison-gas', 'koffing-weezing-smog',
        'zubat-passive-evolution-golbat', 'ekans-poison-fang', 'ekans-toxic', 'ekans-shed-skin',
        'ekans-passive-evolution-arbok', 'arbok-poison-fang', 'arbok-toxic', 'arbok-shed-skin',
        'vaporeon-acid-armor', 'beedrill-poison-sting', 'beedrill-envenom',
        'mega-beedrill-poison-sting',
    ],
    Ground: [
        'pidgey-sand-attack', 'pidgeotto-sand-attack', 'eevee-dig', 'vaporeon-sand-attack',
        'nincada-evolve',
    ],
    Flying: [
        'pidgey-gust', 'pidgey-peck', 'pidgeotto-gust', 'pidgeotto-peck', 'zapdos-flight',
    ],
    Psychic: [
        'pikachu-agility', 'butterfree-confusion', 'butterfree-psybeam', 'abra-future-sight',
        'abra-psychic', 'abra-calm-mind', 'abra-teleport', 'abra-passive-evolution-kadabra',
        'kadabra-future-sight', 'kadabra-psychic', 'kadabra-calm-mind', 'kadabra-teleport',
        'mr-mime-forcefield', 'mr-mime-light-screen', 'articuno-fast-agility',
        'mew-psychic-barrier', 'mew-psychic', 'mew-pink-bubble', 'mewtwo-psychic',
        'chikorita-light-screen',
        'drowzee-hypnosis', 'drowzee-dream-eater', 'drowzee-evolution',
        'hypno-hypnosis', 'hypno-dream-eater',
    ],
    Bug: [
        'zubat-leech-life', 'golbat-leech-life', 'scyther-fury-cutter', 'scyther-x-cutter',
        'jolteon-pin-missile', 'beedrill-twinneedle', 'beedrill-hive-swarm',
        'beedrill-hive-sting', 'beedrill-evolution-mega', 'mega-beedrill-fell-stinger',
        'beedrill-hive-swarm-mega', 'nincada-struggle-bug', 'ninjask-skitter-smack',
        'ninjask-speed-boost', 'shedinja-bug-buzz', 'shedinja-wonder-guard',
    ],
    Rock: [
        'aerodactyl-rock-slide', 'aerodactyl-stone-edge', 'aerodactyl-passive-tough-head',
        'onix-rock-throw', 'onix-stealth-rock', 'onix-passive-sturdy',
    ],
    Ghost: [
        'gastly-lick', 'gastly-curse', 'gastly-spite', 'gastly-passive-evolution-haunter',
        'haunter-lick', 'haunter-curse', 'haunter-spite', 'mewtwo-shadow-ball',
        'ninjask-shadow-ball', 'shedinja-hex', 'primeape-rage-fist',
        'drowzee-nightmare', 'hypno-nightmare',
    ],
    Dragon: [
        'charmander-dragon-claw', 'charmander-charizard-x-dragon-claw',
        'charmander-charizard-y-dragon-claw', 'gyarados-dragon-rage', 'dragonite-dragon-claw',
        'dragonite-draco-meteor', 'dragonite-dragon-boost', 'dragonite-pressure',
        'dragapult-dragon-darts', 'dragapult-dragon-tail', 'dragapult-dragon-rush',
        'totodile-feraligatr-dragon-claw',
    ],
    Dark: [
        'zubat-bite', 'zubat-draining-fangs', 'golbat-bite', 'golbat-draining-fangs',
        'ekans-crunch', 'arbok-crunch', 'machop-taunt', 'machoke-taunt',
        'meowth-night-slash', 'persian-night-slash', 'shedinja-feint-attack',
        'primeape-knock-off',
    ],
    Steel: [
        'krabby-metal-claw', 'kingler-metal-claw', 'magneton-flash-cannon', 'onix-iron-tail',
        'aegislash-kings-shield', 'nincada-metal-claw',
    ],
    Fairy: [
        'mr-mime-dazzling-gleam', 'clefairy-disarming-voice', 'clefairy-moonlight',
        'clefairy-evolution-clefable', 'clefable-disarming-voice', 'clefable-moonlight',
    ],
};

const POKEMON_SKILL_TYPES = Object.freeze(
    Object.fromEntries(
        Object.entries(skillsByType).flatMap(([type, skillIds]) => skillIds.map((skillId) => [skillId, type]))
    )
);

const POKEMON_STATUS_TOOLTIPS = Object.freeze({
    charmander_evolution_tracker: { tooltipTextTemplate: 'Charmander has {charmanderEvolutionProgress}/2 evolution progress. At 2, Charmander evolves into Charmeleon.' },
    bulbasaur_sun_spent: { tooltipText: 'Solar Beam consumed all of this Pokemon\'s Sun stacks.' },
    ekans_badly_poison: { tooltipText: 'After this character uses a skill, Badly Poison permanently doubles its damage.' },
    ekans_badly_poison_2: { tooltipText: 'After this character uses a skill, Badly Poison permanently doubles its damage.' },
    clefairy_evolution_tracker: { tooltipTextTemplate: 'Clefairy has restored {healingProgress}/75 HP toward evolving into Clefable.' },
    clefairy_double_slap: { tooltipTextTemplate: 'This character takes {turnEndDamage} damage at the beginning of Clefairy\'s next turn.' },
    clefable_double_slap: { tooltipTextTemplate: 'This character takes {turnEndDamage} damage at the beginning of Clefable\'s next turn.' },
    clefable_disarming_voice_field: { tooltipText: 'Allied accuracy cannot be reduced and enemy evasion cannot be increased.' },
    jigglypuff_evolution_tracker: { tooltipText: 'Jigglypuff evolves into Wigglytuff after Perish Song defeats an enemy.' },
    jigglypuff_perish_song: { tooltipText: 'When this countdown expires, this character is instantly defeated. The mark ends if its source is defeated.' },
    jigglypuff_sing: { tooltipText: 'This character cannot use harmful skills.' },
    jigglypuff_wish: { tooltipTextTemplate: 'At the start of the next turn, this character heals {turnStartHeal} HP. A marked Perish Song target using a harmful skill on them advances its countdown.' },
    'jigglypuff-humiliate:jigglypuff_humiliate': { tooltipText: 'If this character uses a new harmful skill, Jigglypuff gains 1 Random energy and advances Perish Song once.' },
    'wigglytuff-humiliate:jigglypuff_humiliate': { tooltipText: 'If this character uses any new skill, Wigglytuff gains 1 Random energy and advances Perish Song once.' },
    beedrill_evolution_tracker: { tooltipTextTemplate: 'Beedrill has used Envenom {envenomUses}/2 times. At 2 uses, Beedrill evolves into Mega Beedrill.' },
    beedrill_poison_sting: { tooltipTextTemplate: 'This character takes {turnStartDamage} affliction damage each turn from permanent Poison Sting stacks.' },
    beedrill_twinneedle_blind: { tooltipText: 'This character\'s harmful skills have a chance to miss.' },
    beedrill_envenom_blind: { tooltipText: 'This character\'s harmful skills have a chance to miss.' },
    mega_beedrill_permanent_blind: { tooltipText: 'This character is permanently blinded; its skills have a chance to miss.' },
    beedrill_hive_swarm: { tooltipText: 'Beedrill ignores the next 3 enemy damage effects and enemy stuns. Hive Swarm is replaced by Hive Sting.' },
    articuno_sheer_cold_tracker: { tooltipTextTemplate: 'Sheer Cold has {bonusDamage} permanent bonus damage.' },
    articuno_blizzard: { tooltipText: 'This character\'s skill cooldowns are paralyzed and cannot decrease.' },
    articuno_ice_beam_stun: { tooltipText: 'This character cannot use Special skills.' },
    articuno_fast_agility: { tooltipText: 'Articuno is invulnerable to enemy skills.' },
    moltres_fire_spin: { tooltipTextTemplate: 'Using a new harmful skill on Moltres\' team deals {teamTrapEnemyHarmfulDamage} affliction damage to this character.' },
    moltres_sunny_day_enemy: { tooltipTextTemplate: 'This character takes {additionalAfflictionDamageTaken} additional affliction damage from all sources.' },
    moltres_heat: { tooltipTextTemplate: 'Moltres has {heat}/3 Heat. Overheat has been used {overheatUses} time(s), reducing each Heat stack by {overheatPenalty} damage.' },
    zapdos_charge: { tooltipTextTemplate: 'Zapdos skills cost {genjutsuCostReduction} less Yellow energy. The reduction increases each turn; using another skill ends Charge.' },
    zapdos_zap_cannon: { tooltipTextTemplate: 'When this countdown expires, this character takes {onExpireDamage} plus {zapCannonBonus} bonus piercing damage and is stunned. Thunderbolt triggers shorten the countdown and add damage.' },
    zapdos_flight: { tooltipTextTemplate: 'Zapdos is invulnerable to non-affliction enemy skills, and Thunderbolt triggers deal {zapdosThunderboltDamage} damage.' },
    mew_psychic_suppression: { tooltipText: 'This character\'s harmful skills deal 0 damage while Psychic Barrier remains active.' },
    dragonite_pressure_passive: { tooltipText: 'Whenever Dragonite uses a skill, it gains 10 unpierceable damage reduction for 2 turns. Each activation stacks separately.' },
    dragonite_pressure_reduction: { tooltipTextTemplate: 'Dragonite has {unpierceableDamageReductionFlat} unpierceable damage reduction from this Pressure stack.' },
    dragonite_taunt: { tooltipText: 'This character is taunted and can only target Dragonite. Ignoring the taunt once refreshes it.' },
    dragonite_hyper_beam_stun: { tooltipText: 'This character cannot use helpful skills.' },
    dragonite_draco_meteor: { tooltipTextTemplate: 'This character takes {turnStartDamage} damage at the start of each turn.' },
    cyndaquil_warming_up: { tooltipText: 'Each new skill Cyndaquil uses permanently adds 5 damage to Aerial Flamethrower and Warming Up.' },
    cyndaquil_smokescreen: { tooltipText: 'This character is fully blinded; all of its skills miss.' },
    cyndaquil_skyward_leap: { tooltipText: 'The next enemy skill used on Cyndaquil misses. Taking damage ends this effect.' },
    cyndaquil_skyward_bonus: { tooltipText: 'Aerial Tackle and Aerial Flamethrower deal 10 additional damage.' },
    chikorita_sweet_scent_tracker: { tooltipTextTemplate: 'Sweet Scent cycles the weakened class between Physical, Special, and Affliction each turn. Solar Beam currently has {solarBeamStacks} bonus stack(s).' },
    chikorita_light_screen: { tooltipTextTemplate: 'This character has {destructibleDefensePoints} destructible defense. A new enemy skill used on them weakens Sweet Scent\'s current class and adds 1 Solar Beam stack.' },
    chikorita_vine_defense: { tooltipText: 'Chikorita is invulnerable to enemy skills.' },
    chikorita_magical_leaf_debuff: { tooltipTextTemplate: 'This character deals {DamageDebuff} less damage from Magical Leaf.' },
    totodile_water_rings_tracker: { tooltipTextTemplate: 'Totodile has {waterRings} Water Ring(s) and heals 5 HP per ring each turn. Aqua Tail has {aquaTailPermanentPenalty} permanent damage penalty.' },
    totodile_superpower_invulnerable: { tooltipText: 'Totodile is invulnerable to enemy skills. Its next Aqua Tail gains 10 damage, then permanently loses 5 damage.' },
    ditto_transformation: { tooltipText: 'This character has transformed. Its copied skills deal 5 less damage and cost only Random energy.' },
    drowzee_evolution_tracker: { tooltipText: 'Drowzee evolves into Hypno after using both Nightmare and Dream Eater in this match.' },
});

const applyPokemonStatusTooltips = (value, sourceSkillId = '', errors = []) => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
        value.forEach((entry) => applyPokemonStatusTooltips(entry, sourceSkillId, errors));
        return;
    }
    const statusId = typeof value.statusId === 'string' ? value.statusId : '';
    const metadata = value.metadata && typeof value.metadata === 'object' ? value.metadata : null;
    const isStatusConfig = Boolean(statusId && metadata && (value.type === 'apply_status' || 'duration' in value));
    if (isStatusConfig) {
        const authored =
            POKEMON_STATUS_TOOLTIPS[`${sourceSkillId}:${statusId}`] ||
            POKEMON_STATUS_TOOLTIPS[statusId] ||
            null;
        if (!metadata.tooltipText && !metadata.tooltipTextTemplate && authored) {
            Object.assign(metadata, authored);
        }
        const hiddenFromEveryone =
            Boolean(metadata.hidden || metadata.hideTooltip) ||
            Boolean(metadata.hideTooltipFromEnemy && (metadata.hideTooltipFromOwner || metadata.hideTooltipFromUnitOwner));
        if (
            Number(value.duration) !== 0 &&
            !hiddenFromEveryone &&
            !metadata.tooltipText &&
            !metadata.tooltipTextTemplate
        ) {
            errors.push(`Missing Pokemon status tooltip for ${sourceSkillId || '(start status)'}:${statusId}`);
        }
    }
    Object.entries(value).forEach(([key, entry]) => {
        if (key !== 'evolvesTo') applyPokemonStatusTooltips(entry, sourceSkillId, errors);
    });
};

const TYPE_EFFECTIVENESS = Object.freeze({
    normal: { strong: [], resisted: ['rock', 'steel'], immune: ['ghost'] },
    fire: { strong: ['grass', 'ice', 'bug', 'steel'], resisted: ['fire', 'water', 'rock', 'dragon'], immune: [] },
    water: { strong: ['fire', 'ground', 'rock'], resisted: ['water', 'grass', 'dragon'], immune: [] },
    electric: { strong: ['water', 'flying'], resisted: ['electric', 'grass', 'dragon'], immune: ['ground'] },
    grass: { strong: ['water', 'ground', 'rock'], resisted: ['fire', 'grass', 'poison', 'flying', 'bug', 'dragon', 'steel'], immune: [] },
    ice: { strong: ['grass', 'ground', 'flying', 'dragon'], resisted: ['fire', 'water', 'ice', 'steel'], immune: [] },
    fighting: { strong: ['normal', 'ice', 'rock', 'dark', 'steel'], resisted: ['poison', 'flying', 'psychic', 'bug', 'fairy'], immune: ['ghost'] },
    poison: { strong: ['grass', 'fairy'], resisted: ['poison', 'ground', 'rock', 'ghost'], immune: ['steel'] },
    ground: { strong: ['fire', 'electric', 'poison', 'rock', 'steel'], resisted: ['grass', 'bug'], immune: ['flying'] },
    flying: { strong: ['grass', 'fighting', 'bug'], resisted: ['electric', 'rock', 'steel'], immune: [] },
    psychic: { strong: ['fighting', 'poison'], resisted: ['psychic', 'steel'], immune: ['dark'] },
    bug: { strong: ['grass', 'psychic', 'dark'], resisted: ['fire', 'fighting', 'poison', 'flying', 'ghost', 'steel', 'fairy'], immune: [] },
    rock: { strong: ['fire', 'ice', 'flying', 'bug'], resisted: ['fighting', 'ground', 'steel'], immune: [] },
    ghost: { strong: ['psychic', 'ghost'], resisted: ['dark'], immune: ['normal'] },
    dragon: { strong: ['dragon'], resisted: ['steel'], immune: ['fairy'] },
    dark: { strong: ['psychic', 'ghost'], resisted: ['fighting', 'dark', 'fairy'], immune: [] },
    steel: { strong: ['ice', 'rock', 'fairy'], resisted: ['fire', 'water', 'electric', 'steel'], immune: [] },
    fairy: { strong: ['fighting', 'dragon', 'dark'], resisted: ['fire', 'poison', 'steel'], immune: [] },
});

const TYPE_OVERRIDES_BY_STATUS_ID = Object.freeze({
    charmander_charizard_x_evolution_branch: ['Fire', 'Dragon'],
    charmander_charizard_y_evolution_branch: ['Fire', 'Flying'],
    magikarp_gyarados_evolution: ['Water', 'Flying'],
});

const POKEMON_SKIN_TYPE_OVERRIDES = Object.freeze({
    'charmander-charizard-legendary': ['Fire', 'Flying'],
    'charmander-gigantamax-charizard': ['Fire', 'Flying'],
    'bulbasaur-mega-venusaur': ['Grass', 'Poison'],
    'bulbasaur-gigantamax-venusaur': ['Grass', 'Poison'],
    'squirtle-mega-blastoise': ['Water'],
    'squirtle-gigantamax-blastoise': ['Water'],
});

const getPokemonSkinTypeOverride = (skinId = '') =>
    normalizePokemonTypes(
        POKEMON_SKIN_TYPE_OVERRIDES[String(skinId || '').trim().toLowerCase()]
    );

// Johto starters evolve permanently via equipped skin (ranked-win rewards), not an
// in-battle trigger like Charmander/Nincada/etc. Each entry marks the actor with
// markerStatusId (satisfying the evolved skill's actorCondition) and swaps the base
// skill into its evolved form via skillReplacements, both consumed by
// buildInitialBoard/resolveEffectiveSkill in battleLogic.js.
const JOHTO_STARTER_EVOLUTION_SKILL_REPLACEMENTS = Object.freeze({
    'cyndaquil-quilava-evolution': {
        markerStatusId: 'cyndaquil_quilava_evolution',
        skillReplacements: { 'cyndaquil-aerial-flamethrower': 'cyndaquil-quilava-flame-wheel' },
    },
    'cyndaquil-typhlosion-evolution': {
        markerStatusId: 'cyndaquil_typhlosion_evolution',
        skillReplacements: { 'cyndaquil-aerial-flamethrower': 'cyndaquil-typhlosion-flame-wheel' },
    },
    'chikorita-bayleaf-evolution': {
        markerStatusId: 'chikorita_bayleaf_evolution',
        skillReplacements: { 'chikorita-aerial-razor-leaf': 'chikorita-bayleaf-magical-leaf' },
    },
    'chikorita-meganium-evolution': {
        markerStatusId: 'chikorita_meganium_evolution',
        skillReplacements: { 'chikorita-aerial-razor-leaf': 'chikorita-meganium-magical-leaf' },
    },
    'totodile-croconaw-evolution': {
        markerStatusId: 'totodile_croconaw_evolution',
        skillReplacements: { 'totodile-scary-face': 'totodile-croconaw-bite' },
    },
    'totodile-feraligatr-evolution': {
        markerStatusId: 'totodile_feraligatr_evolution',
        skillReplacements: { 'totodile-scary-face': 'totodile-feraligatr-dragon-claw' },
    },
});

const getJohtoStarterEvolutionReplacement = (skinId = '') =>
    JOHTO_STARTER_EVOLUTION_SKILL_REPLACEMENTS[String(skinId || '').trim().toLowerCase()] || null;

const normalizePokemonType = (value) => {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
    return POKEMON_TYPES.find((type) => type.toLowerCase() === normalized) || '';
};

const normalizePokemonTypes = (values = []) =>
    Array.from(
        new Set((Array.isArray(values) ? values : []).map(normalizePokemonType).filter(Boolean))
    ).slice(0, 2);

const normalizePokemonDamageClasses = (skillId, classes = []) => {
    const normalizedClasses = Array.isArray(classes)
        ? classes.map((entry) => (typeof entry === 'string' ? entry.trim() : '')).filter(Boolean)
        : [];
    const typeClasses = normalizedClasses.filter((entry) => POKEMON_TYPE_SET.has(entry.toLowerCase()));
    const hasPhysical = normalizedClasses.some((entry) => entry.toLowerCase() === 'physical');
    const hasSpecial = normalizedClasses.some((entry) =>
        ['special', 'energy', 'mental'].includes(entry.toLowerCase())
    );
    const hasAffliction = normalizedClasses.some((entry) => entry.toLowerCase() === 'affliction');
    const damageClass = hasPhysical ? 'Physical' : (hasSpecial || hasAffliction ? 'Special' : '');
    const otherClasses = normalizedClasses.filter((entry) => {
        const normalized = entry.toLowerCase();
        return (
            !POKEMON_TYPE_SET.has(normalized) &&
            !['physical', 'special', 'energy', 'mental', 'affliction'].includes(normalized)
        );
    });
    return Array.from(new Set([
        ...typeClasses,
        ...(damageClass ? [damageClass] : []),
        ...(hasAffliction ? ['Affliction'] : []),
        ...otherClasses,
    ]));
};

const getPokemonMoveType = (classes = []) =>
    (Array.isArray(classes) ? classes : [])
        .map(normalizePokemonType)
        .find(Boolean) || '';

const applyTypeOverridesToStatusConfigs = (value) => {
    if (Array.isArray(value)) {
        value.forEach(applyTypeOverridesToStatusConfigs);
        return;
    }
    if (!value || typeof value !== 'object') return;
    const override = TYPE_OVERRIDES_BY_STATUS_ID[value.statusId];
    if (override) {
        value.metadata = { ...(value.metadata || {}), pokemonTypeOverride: [...override] };
    }
    Object.values(value).forEach(applyTypeOverridesToStatusConfigs);
};

const applyPokemonTypeSystem = (characters = [], { strict = false } = {}) => {
    const pokemonCharacters = (Array.isArray(characters) ? characters : []).filter(
        (character) => String(character?.arena || character?.universe || '').trim().toLowerCase() === 'pokemon'
    );
    const errors = [];
    const applyCharacterType = (character) => {
        const characterId = String(character?.characterId || character?.id || '').trim();
        const types = normalizePokemonTypes(POKEMON_CHARACTER_TYPES[characterId]);
        if (!types.length) errors.push(`Missing Pokemon typing for character: ${characterId || '(unknown)'}`);
        character.pokemonTypes = types;
        const applySkillType = (skill) => {
            const skillId = String(skill?.id || '').trim();
            const moveType = normalizePokemonType(POKEMON_SKILL_TYPES[skillId]);
            if (!moveType) errors.push(`Missing Pokemon move type for skill: ${skillId || '(unknown)'}`);
            const retainedClasses = (Array.isArray(skill.classes) ? skill.classes : []).filter((entry) => {
                const normalized = typeof entry === 'string' ? entry.trim().toLowerCase() : '';
                return normalized && normalized !== 'melee' && normalized !== 'ranged' && !POKEMON_TYPE_SET.has(normalized);
            });
            skill.classes = normalizePokemonDamageClasses(
                skillId,
                [moveType, ...retainedClasses].filter(Boolean)
            );
            applyPokemonStatusTooltips(skill.effects, skillId, errors);
            if (skill?.evolvesTo && typeof skill.evolvesTo === 'object') applySkillType(skill.evolvesTo);
        };
        (Array.isArray(character.skills) ? character.skills : []).forEach(applySkillType);
        applyPokemonStatusTooltips(character.startStatuses, '', errors);
        applyTypeOverridesToStatusConfigs(character);
        (Array.isArray(character.battleForms) ? character.battleForms : []).forEach(applyCharacterType);
    };
    pokemonCharacters.forEach((character) => {
        applyCharacterType(character);
    });
    if (strict && errors.length) throw new Error(errors.join('\n'));
    return characters;
};

const getActivePokemonTypes = ({ character = null, unit = null } = {}) => {
    const statuses = Array.isArray(unit?.state?.statuses) ? unit.state.statuses : [];
    const forcedOverride = statuses
        .filter(
            (status) =>
                (Number(status?.remainingTurns) || 0) > 0 &&
                Boolean(status?.metadata?.forcePokemonTypeOverride)
        )
        .map((status) => normalizePokemonTypes(status?.metadata?.pokemonTypeOverride))
        .filter((types) => types.length)
        .pop();
    const activeOverride = statuses
        .filter((status) => (Number(status?.remainingTurns) || 0) > 0)
        .map((status) => normalizePokemonTypes(status?.metadata?.pokemonTypeOverride))
        .filter((types) => types.length)
        .pop();
    return forcedOverride || activeOverride || normalizePokemonTypes(character?.pokemonTypes);
};

const getPokemonTypeEffectiveness = (attackingType, defendingTypes = []) => {
    const attack = normalizePokemonType(attackingType).toLowerCase();
    const defense = normalizePokemonTypes(defendingTypes).map((type) => type.toLowerCase());
    const chart = TYPE_EFFECTIVENESS[attack];
    if (!chart || !defense.length) return { score: 0, modifier: 0, label: '' };
    const rawScore = defense.reduce((score, type) => {
        if (chart.immune.includes(type)) return score - 2;
        if (chart.strong.includes(type)) return score + 1;
        if (chart.resisted.includes(type)) return score - 1;
        return score;
    }, 0);
    const score = Math.max(-2, Math.min(2, rawScore));
    const labels = {
        2: 'Double Super Effective',
        1: 'Super Effective',
        '-1': 'Not Very Effective',
        '-2': 'Double Not Very Effective',
    };
    return { score, modifier: score * 5, label: labels[score] || '' };
};

module.exports = {
    POKEMON_TYPES,
    POKEMON_CHARACTER_TYPES,
    POKEMON_SKILL_TYPES,
    POKEMON_STATUS_TOOLTIPS,
    POKEMON_SKIN_TYPE_OVERRIDES,
    JOHTO_STARTER_EVOLUTION_SKILL_REPLACEMENTS,
    TYPE_EFFECTIVENESS,
    applyPokemonTypeSystem,
    getActivePokemonTypes,
    getJohtoStarterEvolutionReplacement,
    getPokemonMoveType,
    getPokemonSkinTypeOverride,
    getPokemonTypeEffectiveness,
    normalizePokemonDamageClasses,
    normalizePokemonTypes,
};
