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
        'chikorita-sweet-scent', 'totodile-scary-face',
    ],
    Fire: [
        'charmander-ember', 'charmander-flamethrower', 'charmander-passive-evolution-charmeleon',
        'charmander-fire-punch', 'charmander-charmeleon-flamethrower',
        'charmander-charizard-x-fire-punch', 'charmander-charizard-x-flamethrower',
        'charmander-charizard-y-fire-punch', 'charmander-charizard-y-flamethrower',
        'hitmonchan-fire-punch', 'flareon-heating-up', 'flareon-fire-spin', 'flareon-fire-blast',
        'moltres-fire-spin', 'moltres-sunny-day', 'moltres-heat-wave', 'moltres-overheat',
        'moltres-heat', 'cyndaquil-aerial-flamethrower', 'cyndaquil-skyward-leap',
        'cyndaquil-warming-up',
    ],
    Water: [
        'squirtle-water-gun', 'squirtle-withdraw', 'squirtle-bubble',
        'squirtle-passive-evolution-wartortle', 'wartortle-shell-guard', 'wartortle-hydro-pump',
        'wartortle-bubblebeam', 'wartortle-aqua-spin', 'krabby-leer', 'krabby-crabhammer',
        'krabby-passive-evolution-kingler', 'kingler-leer', 'kingler-crabhammer',
        'magikarp-passive-evolution-gyarados', 'gyarados-hydro-pump', 'vaporeon-hydro-pump',
        'mew-life-dew', 'totodile-aerial-water-gun', 'totodile-aqua-tail', 'totodile-water-rings',
    ],
    Electric: [
        'pikachu-thundershock', 'pikachu-volt-tackle', 'pikachu-thunder', 'pikachu-passive-static',
        'jolteon-thunderbolt', 'jolteon-thunder-fang', 'jolteon-charge', 'hitmonchan-thunder-punch',
        'magnemite-spark', 'magnemite-thunder-wave', 'magnemite-magnet-rise',
        'magnemite-passive-evolution-magneton', 'magneton-spark', 'magneton-thunder-wave',
        'magneton-magnet-rise', 'zapdos-charge', 'zapdos-thunderbolt', 'zapdos-zap-cannon',
    ],
    Grass: [
        'bulbasaur-leech-seed', 'bulbasaur-vine-whip', 'bulbasaur-razor-leaf',
        'bulbasaur-solar-beam', 'bulbasaur-passive-evolution-ivysaur', 'ivysaur-leech-seed',
        'ivysaur-vine-whip', 'ivysaur-razor-leaf', 'ivysaur-solar-beam',
        'butterfree-stun-spore', 'butterfree-sleep-powder', 'chikorita-aerial-razor-leaf',
        'chikorita-chikorita-solar-beam', 'chikorita-vine-defense',
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
    ],
    Poison: [
        'koffing-smog', 'koffing-passive-poison-gas', 'koffing-passive-evolution-weezing',
        'koffing-weezing-passive-poison-gas', 'koffing-weezing-smog',
        'zubat-passive-evolution-golbat', 'ekans-poison-fang', 'ekans-toxic', 'ekans-shed-skin',
        'ekans-passive-evolution-arbok', 'arbok-poison-fang', 'arbok-toxic', 'arbok-shed-skin',
        'vaporeon-acid-armor', 'beedrill-poison-sting', 'beedrill-envenom',
    ],
    Ground: ['pidgey-sand-attack', 'pidgeotto-sand-attack', 'eevee-dig', 'vaporeon-sand-attack'],
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
    ],
    Bug: [
        'zubat-leech-life', 'golbat-leech-life', 'scyther-fury-cutter', 'scyther-x-cutter',
        'jolteon-pin-missile', 'beedrill-twinneedle', 'beedrill-hive-swarm',
        'beedrill-hive-sting', 'beedrill-evolution-mega',
    ],
    Rock: [
        'aerodactyl-rock-slide', 'aerodactyl-stone-edge', 'aerodactyl-passive-tough-head',
        'onix-rock-throw', 'onix-stealth-rock', 'onix-passive-sturdy',
    ],
    Ghost: [
        'gastly-lick', 'gastly-curse', 'gastly-spite', 'gastly-passive-evolution-haunter',
        'haunter-lick', 'haunter-curse', 'haunter-spite', 'mewtwo-shadow-ball',
    ],
    Dragon: [
        'charmander-dragon-claw', 'charmander-charizard-x-dragon-claw',
        'charmander-charizard-y-dragon-claw', 'gyarados-dragon-rage', 'dragonite-dragon-claw',
        'dragonite-draco-meteor', 'dragonite-dragon-boost', 'dragonite-pressure',
    ],
    Dark: [
        'zubat-bite', 'zubat-draining-fangs', 'golbat-bite', 'golbat-draining-fangs',
        'ekans-crunch', 'arbok-crunch', 'machop-taunt', 'machoke-taunt',
        'meowth-night-slash', 'persian-night-slash',
    ],
    Steel: [
        'krabby-metal-claw', 'kingler-metal-claw', 'magneton-flash-cannon', 'onix-iron-tail',
    ],
    Fairy: [
        'mr-mime-dazzling-gleam', 'clefairy-disarming-voice', 'clefairy-moonlight',
        'clefairy-evolution-clefable',
    ],
};

const POKEMON_SKILL_TYPES = Object.freeze(
    Object.fromEntries(
        Object.entries(skillsByType).flatMap(([type, skillIds]) => skillIds.map((skillId) => [skillId, type]))
    )
);

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

const normalizePokemonType = (value) => {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
    return POKEMON_TYPES.find((type) => type.toLowerCase() === normalized) || '';
};

const normalizePokemonTypes = (values = []) =>
    Array.from(
        new Set((Array.isArray(values) ? values : []).map(normalizePokemonType).filter(Boolean))
    ).slice(0, 2);

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
    pokemonCharacters.forEach((character) => {
        const characterId = String(character?.characterId || character?.id || '').trim();
        const types = normalizePokemonTypes(POKEMON_CHARACTER_TYPES[characterId]);
        if (!types.length) errors.push(`Missing Pokemon typing for character: ${characterId || '(unknown)'}`);
        character.pokemonTypes = types;
        (Array.isArray(character.skills) ? character.skills : []).forEach((skill) => {
            const skillId = String(skill?.id || '').trim();
            const moveType = normalizePokemonType(POKEMON_SKILL_TYPES[skillId]);
            if (!moveType) errors.push(`Missing Pokemon move type for skill: ${skillId || '(unknown)'}`);
            const retainedClasses = (Array.isArray(skill.classes) ? skill.classes : []).filter((entry) => {
                const normalized = typeof entry === 'string' ? entry.trim().toLowerCase() : '';
                return normalized && normalized !== 'melee' && normalized !== 'ranged' && !POKEMON_TYPE_SET.has(normalized);
            });
            skill.classes = [moveType, ...retainedClasses].filter(Boolean);
        });
        applyTypeOverridesToStatusConfigs(character);
    });
    if (strict && errors.length) throw new Error(errors.join('\n'));
    return characters;
};

const getActivePokemonTypes = ({ character = null, unit = null } = {}) => {
    const statuses = Array.isArray(unit?.state?.statuses) ? unit.state.statuses : [];
    const activeOverride = statuses
        .filter((status) => (Number(status?.remainingTurns) || 0) > 0)
        .map((status) => normalizePokemonTypes(status?.metadata?.pokemonTypeOverride))
        .filter((types) => types.length)
        .pop();
    return activeOverride || normalizePokemonTypes(character?.pokemonTypes);
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
    TYPE_EFFECTIVENESS,
    applyPokemonTypeSystem,
    getActivePokemonTypes,
    getPokemonMoveType,
    getPokemonTypeEffectiveness,
    normalizePokemonTypes,
};
