// Skin data mirrors production's POKEMON_SKIN_CATALOG field names (server.js)
// verbatim for entries whose characterId is already ported into ROSTER. See
// SKIN_PORT.md for the full mapping from production skinIds to what's kept,
// adapted, or skipped here — including why the battle-affecting type-override
// mechanic (a handful of skins change a Pokemon's actual type) is captured as
// data here but not yet wired into the battle engine.

export function normalizeSkinId(value) {
    return String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export function normalizeCharacterId(value) {
    return String(value ?? '').trim().toLowerCase();
}

export const SKIN_CATALOG = [
    {
        skinId: 'ditto-shiny',
        characterId: 'ditto',
        name: 'Shiny Ditto',
        description: 'Ditto begins battle in its blue shiny appearance and still copies the exact skin of any Pokemon it transforms into.',
        unlockPointCost: 500,
        previewFacePicture: '/game-assets/images/PokemonArena/Ditto/Done/shinyFP.jpg',
    },
    {
        skinId: 'ditto-flubber',
        characterId: 'ditto',
        name: 'Flubber Ditto',
        description: 'A green Flubber-inspired Ditto skin. After transforming, Ditto still uses the copied Pokemon’s exact equipped appearance.',
        unlockPointCost: 500,
        previewFacePicture: '/game-assets/images/PokemonArena/Ditto/Done/dittoflubberskin.png',
    },
    {
        skinId: 'pikachu-raichu',
        characterId: 'pikachu',
        name: 'Raichu',
        description: 'A Raichu-inspired skin for Pikachu with custom portrait and skill art.',
        unlockPointCost: 750,
        previewFacePicture: '/game-assets/images/PokemonArena/Pikachu/skins/raichu/fp.webp',
    },
    {
        skinId: 'butterfree-pink',
        characterId: 'butterfree',
        name: 'Pink Butterfree',
        description: 'A rosy Pink Butterfree skin with custom portrait and full skill art.',
        unlockPointCost: 750,
        previewFacePicture: '/game-assets/images/PokemonArena/butterfree/skins/Pink/PinkFP.png',
    },
    {
        skinId: 'onix-crystal',
        characterId: 'onix',
        name: 'Crystal Onix',
        description: 'A crystal-blue Onix skin with custom portrait and full skill art.',
        unlockPointCost: 750,
        previewFacePicture: '/game-assets/images/PokemonArena/onix/skins/crystal/crystalfp.webp',
    },
    {
        skinId: 'onix-bismuth',
        characterId: 'onix',
        name: 'Bismuth Onix',
        description: 'A prismatic Bismuth Onix skin with custom portrait and full skill art.',
        unlockPointCost: 750,
        previewFacePicture: '/game-assets/images/PokemonArena/onix/skins/Bismuth/BismuthFP.png',
    },
    {
        skinId: 'onix-golden',
        characterId: 'onix',
        name: 'Golden Onix',
        description: 'A gleaming Golden Onix skin with custom portrait and full skill art.',
        unlockPointCost: 750,
        previewFacePicture: '/game-assets/images/PokemonArena/onix/skins/Golden/GoldFP.png',
    },
    {
        skinId: 'onix-magma',
        characterId: 'onix',
        name: 'Magma Onix',
        description: 'A molten Magma Onix skin with custom portrait and full skill art.',
        unlockPointCost: 750,
        previewFacePicture: '/game-assets/images/PokemonArena/onix/skins/Magma/MagmaFP.png',
    },
    {
        skinId: 'onix-cosmic',
        characterId: 'onix',
        name: 'Cosmic Onix',
        description: 'A celestial Cosmic Onix skin with custom portrait and full skill art.',
        unlockPointCost: 1000,
        previewFacePicture: '/game-assets/images/PokemonArena/onix/skins/Cosmic/CosmicFP.png',
    },
    {
        skinId: 'magikarp-golden-gyarados-red',
        characterId: 'magikarp',
        name: 'Golden Magikarp',
        description: 'A golden Magikarp skin that evolves into a red Gyarados with custom portrait and skill art.',
        unlockPointCost: 1000,
        previewFacePicture: '/game-assets/images/PokemonArena/magikarp/skins/gold/goldenfp.jpeg',
    },
    {
        skinId: 'charmander-charizard-legendary',
        characterId: 'charmander',
        name: 'Charizard',
        description: 'A legendary Charizard skin for Charmander that branches into Mega Charizard X if Seismic Toss activates the evolution or Mega Charizard Y if Flamethrower or Fire Blast activates the evolution.',
        unlockPointCost: 1350,
        previewFacePicture: '/game-assets/images/PokemonArena/Charmander/skins/charizard/charizardfp.jpg',
        patch: { name: 'Charizard', pokemonTypes: ['Fire', 'Flying'] },
        // Skill name/description renames only (no art) — production's literal
        // skillOverridesBySkillId text for this skin, verbatim.
        skillOverridesBySkillId: {
            'charmander-passive-evolution-charmeleon': {
                name: 'Legendary Evolution - Charizard',
                skilldescription: 'After Charmander critically strikes or burns an enemy twice, he evolves with his legendary Charizard skin. If Seismic Toss activates the evolution, he becomes Mega Charizard X. If Flamethrower or Fire Blast activates the evolution, he becomes Mega Charizard Y.',
            },
            'charmander-ember': { name: 'Flamethrower' },
            'charmander-scratch': { name: 'Seismic Toss' },
            'charmander-flamethrower': { name: 'Fire Blast' },
            'charmander-rage': {
                name: 'Charizard Flight',
                skilldescription: 'For 4 turns, Charizard gains 25% damage reduction. The first time each turn Charizard takes damage, the damage of his damaging skills is permanently increased by 5. Maximum: 2 stacks.',
            },
            'charmander-fire-punch': {
                name: 'Flamethrower',
                skilldescription: 'Charizard deals 15 physical damage and 30 affliction damage to one enemy. This skill has a 30% chance to Burn the target. Burn: The target takes 5 permanent affliction damage and deals 5 less non-affliction damage. This effect stacks.',
            },
            'charmander-dragon-claw': {
                name: 'Seismic Toss',
                skilldescription: 'Charizard deals 30 damage to one enemy. This skill has a 30% chance to critically strike, dealing 10 additional damage and becoming Piercing.',
            },
            'charmander-charmeleon-flamethrower': {
                name: 'Fire Blast',
                skilldescription: 'Charizard deals 30 affliction damage to all enemies. Each enemy has a 30% chance to be Burned. Burn: The target takes 5 permanent affliction damage and deals 5 less non-affliction damage. This effect stacks.',
            },
            'charmander-charmeleon-rage': {
                name: 'Charizard Flight',
                skilldescription: 'For 4 turns, Charizard gains 50% damage reduction. The first time each turn Charizard takes damage, the damage of his damaging skills is permanently increased by 5. Maximum: 4 stacks.',
            },
            'charmander-charizard-x-fire-punch': { name: 'Flamethrower' },
            'charmander-charizard-x-dragon-claw': { name: 'Dragon Claw' },
            'charmander-charizard-x-flamethrower': { name: 'Fire Blast' },
            'charmander-charizard-x-rage': {
                name: 'Mega Charizard X Rampage',
                skilldescription: 'For 4 turns, Mega Charizard X gains 50% damage reduction. The first time each turn Mega Charizard X takes damage, the damage of his damaging skills is permanently increased by 5. Maximum: 4 stacks.',
            },
            'charmander-charizard-y-fire-punch': { name: 'Overheat' },
            'charmander-charizard-y-dragon-claw': { name: 'Dragon Tail' },
            'charmander-charizard-y-flamethrower': { name: 'Fire Spin' },
            'charmander-charizard-y-rage': {
                name: 'Mega Charizard Y Flight',
                skilldescription: 'For 4 turns, Mega Charizard Y gains 50% damage reduction. The first time each turn Mega Charizard Y takes damage, the damage of his damaging skills is permanently increased by 5. Maximum: 4 stacks.',
            },
        },
    },
    // The next 5 are generated in production by buildStagedPokemonEvolutionSkin()
    // from live production skill text at server startup — not a literal source
    // value here, so (unlike charmander-charizard-legendary above) their
    // skillOverridesBySkillId renames are intentionally not reproduced. Name,
    // description, and the battle-affecting pokemonTypes override are kept.
    {
        skinId: 'bulbasaur-mega-venusaur',
        characterId: 'bulbasaur',
        name: 'Mega Venusaur',
        description: 'Begins battle as Venusaur and becomes Mega Venusaur when its five-Sun evolution activates.',
        unlockPointCost: 750,
        patch: { name: 'Venusaur', pokemonTypes: ['Grass', 'Poison'] },
        previewFacePicture: '/game-assets/images/PokemonArena/Bulbasaur/skins/mega/megafp.png',
    },
    {
        skinId: 'bulbasaur-gigantamax-venusaur',
        characterId: 'bulbasaur',
        name: 'Gigantamax Venusaur',
        description: 'Begins battle as Venusaur and becomes Gigantamax Venusaur when its five-Sun evolution activates.',
        unlockPointCost: 750,
        patch: { name: 'Venusaur', pokemonTypes: ['Grass', 'Poison'] },
        previewFacePicture: '/game-assets/images/PokemonArena/Bulbasaur/skins/gigantamax/fp.png',
    },
    {
        skinId: 'squirtle-mega-blastoise',
        characterId: 'squirtle',
        name: 'Mega Blastoise',
        description: 'Begins battle as Blastoise and becomes Mega Blastoise when its three-stack evolution activates.',
        unlockPointCost: 750,
        patch: { name: 'Blastoise', pokemonTypes: ['Water'] },
        previewFacePicture: '/game-assets/images/PokemonArena/squirtle/skins/mega/megafp.png',
    },
    {
        skinId: 'squirtle-gigantamax-blastoise',
        characterId: 'squirtle',
        name: 'Gigantamax Blastoise',
        description: 'Begins battle as Blastoise and becomes Gigantamax Blastoise when its three-stack evolution activates.',
        unlockPointCost: 750,
        patch: { name: 'Blastoise', pokemonTypes: ['Water'] },
        previewFacePicture: '/game-assets/images/PokemonArena/squirtle/skins/gigantamax/fp.png',
    },
    {
        skinId: 'charmander-gigantamax-charizard',
        characterId: 'charmander',
        name: 'Gigantamax Charizard',
        description: 'Begins battle as Charizard and becomes Gigantamax Charizard after critically striking or burning an enemy twice.',
        unlockPointCost: 750,
        patch: { name: 'Charizard', pokemonTypes: ['Fire', 'Flying'] },
        previewFacePicture: '/game-assets/images/PokemonArena/Charmander/skins/gigantamax/fp.png',
    },
    // Gen2 evolution skins: all missionRewardOnly (never directly purchasable),
    // granted by the starter-evolution missions in mission-catalog.mjs
    // (cyndaquil-evolve-quilava, etc). patch.form selects the matching entry
    // in the character's ROSTER forms{} map (see roster.mjs), which swaps in
    // a real replacement skill (not just cosmetic renaming) — applied at
    // match-creation time via match-service.mjs's formOverrides plumbing.
    {
        skinId: 'cyndaquil-quilava-evolution',
        characterId: 'cyndaquil',
        name: 'Quilava',
        description: 'Cyndaquil permanently evolves into Quilava after 16 ranked wins.',
        unlockPointCost: 0,
        missionRewardOnly: true,
        patch: { name: 'Quilava', form: 'quilava' },
        previewFacePicture: '/game-assets/images/PokemonArena/Cyndaquil/quilavafp.png',
    },
    {
        skinId: 'cyndaquil-typhlosion-evolution',
        characterId: 'cyndaquil',
        name: 'Typhlosion',
        description: 'Quilava permanently evolves into Typhlosion after 36 more ranked wins.',
        unlockPointCost: 0,
        missionRewardOnly: true,
        patch: { name: 'Typhlosion', form: 'typhlosion' },
        previewFacePicture: '/game-assets/images/PokemonArena/Cyndaquil/typlosionfp.png',
    },
    {
        skinId: 'chikorita-bayleaf-evolution',
        characterId: 'chikorita',
        name: 'Bayleaf',
        description: 'Chikorita permanently evolves into Bayleaf after 16 ranked wins.',
        unlockPointCost: 0,
        missionRewardOnly: true,
        patch: { name: 'Bayleaf', form: 'bayleaf' },
        previewFacePicture: '/game-assets/images/PokemonArena/Cyndaquil/Chikorita/bayleaffp.png',
    },
    {
        skinId: 'chikorita-meganium-evolution',
        characterId: 'chikorita',
        name: 'Meganium',
        description: 'Bayleaf permanently evolves into Meganium after 36 more ranked wins.',
        unlockPointCost: 0,
        missionRewardOnly: true,
        patch: { name: 'Meganium', form: 'meganium' },
        previewFacePicture: '/game-assets/images/PokemonArena/Cyndaquil/Chikorita/meganiumfp.png',
    },
    {
        skinId: 'totodile-croconaw-evolution',
        characterId: 'totodile',
        name: 'Croconaw',
        description: 'Totodile permanently evolves into Croconaw after 16 ranked wins.',
        unlockPointCost: 0,
        missionRewardOnly: true,
        patch: { name: 'Croconaw', form: 'croconaw' },
        previewFacePicture: '/game-assets/images/PokemonArena/Cyndaquil/Totodile/croconawfp.png',
    },
    {
        skinId: 'totodile-feraligatr-evolution',
        characterId: 'totodile',
        name: 'Feraligatr',
        description: 'Croconaw permanently evolves into Feraligatr after 36 more ranked wins.',
        unlockPointCost: 0,
        missionRewardOnly: true,
        patch: { name: 'Feraligatr', form: 'feraligatr' },
        previewFacePicture: '/game-assets/images/PokemonArena/Cyndaquil/Totodile/feraligatrfp.png',
    },
    // Production gates direct purchase behind a live release-event window
    // (purchaseAvailableAt); no event-window mechanic exists here yet, so this
    // is simply always purchasable, unlike production during its event week.
    {
        skinId: 'primeape-annihilape-evolution',
        characterId: 'primeape',
        name: 'Annihilape',
        description: 'Primeape evolves into Annihilape with a custom portrait, complete skill art, and new-UI render.',
        unlockPointCost: 750,
        patch: { name: 'Annihilape' },
        previewFacePicture: '/game-assets/images/PokemonArena/Primeape/skins/annihilape/Annihilape-FP.jpg',
    },
];

/**
 * Ported from production's POKEMON_SKIN_TYPE_OVERRIDES (pokemonTypeSystem.js).
 * A handful of skins change a Pokemon's actual battle type, which changes
 * type-effectiveness math. Kept here as data (skinId -> types) for a future
 * pass that wires it into reference/engine.mjs; not applied to battles yet.
 */
export const SKIN_TYPE_OVERRIDES = {
    'charmander-charizard-legendary': ['Fire', 'Flying'],
    'charmander-gigantamax-charizard': ['Fire', 'Flying'],
    'bulbasaur-mega-venusaur': ['Grass', 'Poison'],
    'bulbasaur-gigantamax-venusaur': ['Grass', 'Poison'],
    'squirtle-mega-blastoise': ['Water'],
    'squirtle-gigantamax-blastoise': ['Water'],
};

export function getSkinCatalogById(catalog = SKIN_CATALOG) {
    const catalogById = new Map();
    (catalog ?? []).forEach((entry) => {
        const skinId = normalizeSkinId(entry.skinId);
        const characterId = normalizeCharacterId(entry.characterId);
        if (!skinId || !characterId) return;
        catalogById.set(skinId, {
            ...entry,
            skinId,
            characterId,
            unlockPointCost: entry.missionRewardOnly ? 0 : Math.max(1, Math.floor(Number(entry.unlockPointCost) || 100)),
        });
    });
    return catalogById;
}

export function createDefaultSkinState() {
    return { unlockedSkinIds: [], equippedSkinByCharacterId: {} };
}

export function normalizeSkinState(state, catalog = SKIN_CATALOG) {
    const source = state && typeof state === 'object' ? state : {};
    const catalogById = getSkinCatalogById(catalog);
    const unlockedSkinIds = Array.from(
        new Set(
            (Array.isArray(source.unlockedSkinIds) ? source.unlockedSkinIds : [])
                .map(normalizeSkinId)
                .filter((skinId) => catalogById.has(skinId))
        )
    );
    const equippedSource =
        source.equippedSkinByCharacterId && typeof source.equippedSkinByCharacterId === 'object'
            ? source.equippedSkinByCharacterId
            : {};
    const equippedSkinByCharacterId = {};
    Object.entries(equippedSource).forEach(([characterId, skinId]) => {
        const normalizedCharacterId = normalizeCharacterId(characterId);
        const normalizedSkinId = normalizeSkinId(skinId);
        const catalogEntry = catalogById.get(normalizedSkinId);
        if (!normalizedCharacterId || !catalogEntry) return;
        if (!unlockedSkinIds.includes(normalizedSkinId)) return;
        if (catalogEntry.characterId !== normalizedCharacterId) return;
        equippedSkinByCharacterId[normalizedCharacterId] = normalizedSkinId;
    });
    return { unlockedSkinIds, equippedSkinByCharacterId };
}

export function resolveSkinTypeOverride(skinId) {
    const override = SKIN_TYPE_OVERRIDES[normalizeSkinId(skinId)];
    return Array.isArray(override) ? [...override] : null;
}

// Unlike SKIN_TYPE_OVERRIDES (still inert data, not yet wired into the battle
// engine), form overrides ARE wired in: match-service.mjs's create() resolves
// each equipped skin's patch.form and passes it to engine.mjs's createGame as
// formOverrides, which selects that entry in the character's ROSTER forms{}
// map — swapping in a real replacement skill, not just a cosmetic rename.
export function resolveSkinFormOverride(skinId) {
    const entry = getSkinCatalogById().get(normalizeSkinId(skinId));
    const form = entry?.patch?.form;
    return typeof form === 'string' && form ? form : null;
}
