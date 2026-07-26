const assert = require('node:assert/strict');
const test = require('node:test');

const characters = require('../characters');
const {
    POKEMON_TYPES,
    POKEMON_SKILL_TYPES,
    applyPokemonTypeSystem,
    getActivePokemonTypes,
    getPokemonMoveType,
    getPokemonTypeEffectiveness,
} = require('../pokemonTypeSystem');
const {
    buildInitialBoard,
    processTurnStartStatusEffects,
    resolvePendingTurnSkills,
    tickStatusesForTurnEnd,
} = require('../battleLogic');
const { newsPost, syncPokemonTypeClassNews } = require('../sync_pokemon_type_class_news');

const makeMatch = (roster, playerTeams) => {
    const players = Object.entries(playerTeams).map(([username, team]) => ({ username, team }));
    return {
        players,
        board: buildInitialBoard(players, roster),
        chakraPools: Object.fromEntries(
            players.map(({ username }) => [username, { taijutsu: 5, ninjutsu: 5, genjutsu: 5, bloodline: 5 }])
        ),
        pendingTurns: {},
        pendingActions: [],
        pendingQueuedEffects: [],
        economy: { turnCounts: Object.fromEntries(players.map(({ username }) => [username, 1])) },
    };
};

const makePokemon = (id, pokemonTypes, skills = []) => ({
    id,
    characterId: id,
    arena: 'pokemon',
    universe: 'pokemon',
    pokemonTypes,
    skills,
});

test('modern type chart uses flat scores and converts immunities to double resistance', () => {
    assert.deepEqual(getPokemonTypeEffectiveness('Fire', ['Grass']), {
        score: 1,
        modifier: 5,
        label: 'Super Effective',
    });
    assert.equal(getPokemonTypeEffectiveness('Fire', ['Grass', 'Steel']).modifier, 10);
    assert.equal(getPokemonTypeEffectiveness('Fire', ['Water']).modifier, -5);
    assert.equal(getPokemonTypeEffectiveness('Fire', ['Water', 'Dragon']).modifier, -10);
    assert.equal(getPokemonTypeEffectiveness('Poison', ['Steel']).modifier, -10);
    assert.equal(getPokemonTypeEffectiveness('Ground', ['Electric', 'Flying']).modifier, -5);
    assert.equal(getPokemonTypeEffectiveness('Normal', ['Normal']).modifier, 0);
});

test('all Pokemon characters and skills have explicit valid typing with no Melee or Ranged classes', () => {
    const roster = applyPokemonTypeSystem(structuredClone(characters), { strict: true });
    const pokemon = roster.filter((character) => (character.arena || character.universe) === 'pokemon');
    const pokemonTypeSet = new Set(POKEMON_TYPES);
    assert.equal(pokemon.length, 43);
    assert.equal(pokemon.flatMap((character) => character.skills || []).length, 279);
    assert.equal(Object.keys(POKEMON_SKILL_TYPES).length, 294);
    pokemon.forEach((character) => {
        assert.ok(character.pokemonTypes.length >= 1 && character.pokemonTypes.length <= 2, character.id);
        character.pokemonTypes.forEach((type) => assert.ok(pokemonTypeSet.has(type), `${character.id}:${type}`));
        const assertTypedSkill = (skill) => {
            const typedClasses = (skill.classes || []).filter((entry) => pokemonTypeSet.has(entry));
            assert.equal(typedClasses.length, 1, skill.id);
            assert.equal(skill.classes[0], typedClasses[0], skill.id);
            assert.ok(!(skill.classes || []).some((entry) => /^(melee|ranged)$/i.test(entry)), skill.id);
            assert.ok(!(skill.classes || []).some((entry) => /^(energy|mental)$/i.test(entry)), skill.id);
            const afflictionIndex = (skill.classes || []).indexOf('Affliction');
            if (afflictionIndex >= 0) {
                assert.ok(
                    ['Physical', 'Special'].includes(skill.classes[afflictionIndex - 1]),
                    `${skill.id}: Affliction must follow Physical or Special`
                );
            }
            assert.equal(getPokemonMoveType(skill.classes), POKEMON_SKILL_TYPES[skill.id], skill.id);
            if (skill.evolvesTo) assertTypedSkill(skill.evolvesTo);
        };
        (character.skills || []).forEach(assertTypedSkill);
    });
    const comicCharacter = roster.find((character) => (character.arena || character.universe) !== 'pokemon');
    assert.equal(comicCharacter.pokemonTypes, undefined);
});

test('type effectiveness applies once per target across immediate multi-packet damage', () => {
    const attack = {
        id: 'test-fire-skill',
        target: 'single-enemy',
        energy: [],
        cooldown: 0,
        classes: ['Fire', 'Physical', 'Instant'],
        effects: [
            { type: 'damage', amount: 10, scope: 'target' },
            { type: 'damage', amount: 10, scope: 'target', metadata: { ignoreDamageReduction: true } },
        ],
    };
    const roster = [makePokemon('attacker', ['Fire'], [attack]), makePokemon('target', ['Grass'])];
    const match = makeMatch(roster, { Ash: [0], Gary: [1] });
    match.pendingTurns.Ash = {
        queueOrder: ['0'],
        queuedByActorSlot: { 0: { skillIndex: 0, targetSelection: [{ username: 'Gary', slot: 0 }] } },
    };

    resolvePendingTurnSkills({ match, actingUsername: 'Ash', characters: roster });

    assert.equal(match.board.Gary[0].hp, 75);
    assert.equal(match.board.Gary[0].state.pokemonTypeEffectivenessEvent.modifier, 5);
});

test('AOE effectiveness is calculated independently with a five-damage resistance floor', () => {
    const attack = {
        id: 'test-fire-aoe',
        target: 'all-enemy',
        energy: [],
        cooldown: 0,
        classes: ['Fire', 'Special', 'Instant'],
        effects: [{ type: 'damage', amount: 10, scope: 'all-enemy' }],
    };
    const roster = [
        makePokemon('attacker', ['Fire'], [attack]),
        makePokemon('grass-target', ['Grass']),
        makePokemon('water-dragon-target', ['Water', 'Dragon']),
    ];
    const match = makeMatch(roster, { Ash: [0], Gary: [1, 2] });
    match.pendingTurns.Ash = {
        queueOrder: ['0'],
        queuedByActorSlot: { 0: { skillIndex: 0, targetSelection: [] } },
    };

    resolvePendingTurnSkills({ match, actingUsername: 'Ash', characters: roster });

    assert.equal(match.board.Gary[0].hp, 85);
    assert.equal(match.board.Gary[1].hp, 95);
    assert.equal(match.board.Gary[0].state.pokemonTypeEffectivenessEvent.modifier, 5);
    assert.equal(match.board.Gary[1].state.pokemonTypeEffectivenessEvent.modifier, -10);
});

test('fixed damage and persistent status ticks are excluded from effectiveness', () => {
    const fixedSkill = {
        id: 'test-fixed-fire',
        target: 'single-enemy',
        energy: [],
        cooldown: 0,
        classes: ['Fire', 'Physical', 'Instant'],
        effects: [{ type: 'damage', amount: 10, scope: 'target', metadata: { fixedDamage: true } }],
    };
    const roster = [makePokemon('attacker', ['Fire'], [fixedSkill]), makePokemon('target', ['Grass'])];
    const match = makeMatch(roster, { Ash: [0], Gary: [1] });
    match.pendingTurns.Ash = {
        queueOrder: ['0'],
        queuedByActorSlot: { 0: { skillIndex: 0, targetSelection: [{ username: 'Gary', slot: 0 }] } },
    };
    resolvePendingTurnSkills({ match, actingUsername: 'Ash', characters: roster });
    assert.equal(match.board.Gary[0].hp, 90);
    assert.equal(match.board.Gary[0].state.pokemonTypeEffectivenessEvent, undefined);

    match.board.Gary[0].state.statuses.push({
        id: 'test-fire-dot',
        remainingTurns: 1,
        sourceUsername: 'Ash',
        sourceSlot: 0,
        sourceSkillId: 'test-fire-dot',
        metadata: { harmful: true, turnEndDamage: 10, skillClasses: ['Fire', 'Affliction'] },
    });
    tickStatusesForTurnEnd({ match, endingUsername: 'Gary' });
    assert.equal(match.board.Gary[0].hp, 80);
});

test('active form overrides expose Charizard and Gyarados typing', () => {
    const fire = { pokemonTypes: ['Fire'] };
    const water = { pokemonTypes: ['Water'] };
    const unitWith = (pokemonTypeOverride) => ({
        state: { statuses: [{ remainingTurns: 99, metadata: { pokemonTypeOverride } }] },
    });
    assert.deepEqual(getActivePokemonTypes({ character: fire, unit: unitWith(['Fire', 'Dragon']) }), ['Fire', 'Dragon']);
    assert.deepEqual(getActivePokemonTypes({ character: fire, unit: unitWith(['Fire', 'Flying']) }), ['Fire', 'Flying']);
    assert.deepEqual(getActivePokemonTypes({ character: water, unit: unitWith(['Water', 'Flying']) }), ['Water', 'Flying']);
});

test('captured Pokemon Trainer adopts the effective captured character typing in combat', () => {
    const attack = {
        id: 'test-fire-capture-check',
        target: 'single-enemy',
        energy: [],
        cooldown: 0,
        classes: ['Fire', 'Physical', 'Instant'],
        effects: [{ type: 'damage', amount: 10, scope: 'target' }],
    };
    const roster = [
        makePokemon('attacker', ['Fire'], [attack]),
        makePokemon('trainer', ['Normal']),
        makePokemon('captured-grass', ['Grass']),
    ];
    const match = makeMatch(roster, { Ash: [0], Gary: [1] });
    match.board.Gary[0].state.statuses.push({
        id: 'trainer-captured-form',
        remainingTurns: 99,
        metadata: { effectiveCharacterId: 'captured-grass' },
    });
    match.pendingTurns.Ash = {
        queueOrder: ['0'],
        queuedByActorSlot: { 0: { skillIndex: 0, targetSelection: [{ username: 'Gary', slot: 0 }] } },
    };

    resolvePendingTurnSkills({ match, actingUsername: 'Ash', characters: roster });

    assert.equal(match.board.Gary[0].hp, 85);
    assert.equal(match.board.Gary[0].state.pokemonTypeEffectivenessEvent.modifier, 5);
});

test('Comic Arena damage is unchanged even when a class name matches a Pokemon type', () => {
    const roster = [
        { id: 'comic-attacker', arena: 'comic', skills: [{
            id: 'comic-fire-skill',
            target: 'single-enemy',
            energy: [],
            cooldown: 0,
            classes: ['Fire', 'Physical', 'Instant'],
            effects: [{ type: 'damage', amount: 10, scope: 'target' }],
        }] },
        { id: 'comic-target', arena: 'comic', pokemonTypes: ['Grass'], skills: [] },
    ];
    const match = makeMatch(roster, { Hero: [0], Villain: [1] });
    match.pendingTurns.Hero = {
        queueOrder: ['0'],
        queuedByActorSlot: { 0: { skillIndex: 0, targetSelection: [{ username: 'Villain', slot: 0 }] } },
    };

    resolvePendingTurnSkills({ match, actingUsername: 'Hero', characters: roster });

    assert.equal(match.board.Villain[0].hp, 90);
    assert.equal(match.board.Villain[0].state.pokemonTypeEffectivenessEvent, undefined);
});

test('Chikorita Sweet Scent cycles Physical, Special, and Affliction at 5 damage reduction', () => {
    const chikoritaIndex = characters.findIndex((character) => character?.id === 'chikorita');
    const targetIndex = characters.findIndex((character) => character?.id === 'aegislash');
    const match = makeMatch(characters, { Ash: [chikoritaIndex], Gary: [targetIndex] });
    match.economy.turnCounts = { Ash: 1, Gary: 1 };

    processTurnStartStatusEffects({ match, startingUsername: 'Ash' });
    let aura = match.board.Gary[0].state.statuses.find((status) =>
        status.id.startsWith('chikorita_sweet_scent_aura_')
    );
    assert.deepEqual(aura.metadata.damageDebuffBySkillClass, { physical: 5 });

    match.economy.turnCounts.Ash = 2;
    processTurnStartStatusEffects({ match, startingUsername: 'Ash' });
    aura = match.board.Gary[0].state.statuses.find((status) =>
        status.id.startsWith('chikorita_sweet_scent_aura_')
    );
    assert.deepEqual(aura.metadata.damageDebuffBySkillClass, { special: 5 });

    match.economy.turnCounts.Ash = 3;
    processTurnStartStatusEffects({ match, startingUsername: 'Ash' });
    aura = match.board.Gary[0].state.statuses.find((status) =>
        status.id.startsWith('chikorita_sweet_scent_aura_')
    );
    assert.deepEqual(aura.metadata.damageDebuffBySkillClass, { affliction: 5 });
});

test('type-class news explains every player-facing rule and syncs idempotently', async () => {
    const text = newsPost.paragraphs.join(' ');
    assert.match(text, /40 Pokemon/i);
    assert.match(text, /264 roster skill entries plus their 11 nested evolved variants/i);
    assert.match(text, /Melee and Ranged.*removed/i);
    assert.match(text, /super-effective skill deals 5/i);
    assert.match(text, /doubly super-effective skill deals 10/i);
    assert.match(text, /does not use a same-type attack bonus/i);
    assert.match(text, /hard immunities.*double resistance/i);
    assert.match(text, /once per affected target/i);
    assert.match(text, /Persistent status ticks, delayed damage, recoil/i);
    assert.match(text, /Charizard X.*Fire\/Dragon/i);
    assert.match(text, /Pokemon Trainer.*adopts/i);
    assert.match(text, /BUG FIXES & UI IMPROVEMENTS/);
    assert.match(text, /Status icons.*explain what they actually do/i);
    assert.match(text, /double-click its portrait.*tap it once on a phone/i);
    assert.match(text, /red for Fire.*olive green for Bug/i);
    assert.match(text, /post-game result screen.*easier to read/i);
    assert.match(text, /match refresh issue.*exact live status effect/i);
    assert.ok(newsPost.changes.filter((change) => change.changeType === 'fix').length >= 4);

    const stored = new Map();
    const db = {
        collection() {
            return {
                async updateOne(filter, update) {
                    stored.set(filter.title, { ...(stored.get(filter.title) || {}), ...(update.$setOnInsert || {}), ...update.$set });
                },
            };
        },
    };
    assert.deepEqual(await syncPokemonTypeClassNews(db), { newsSynced: true });
    assert.deepEqual(await syncPokemonTypeClassNews(db), { newsSynced: true });
    assert.equal(stored.get(newsPost.title).title, newsPost.title);
});

test('client includes active typing and effectiveness cue hooks', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const root = path.join(__dirname, '..');
    const script = fs.readFileSync(path.join(root, 'scripts', 'script.js'), 'utf8');
    const styles = fs.readFileSync(path.join(root, 'styles', 'style.css'), 'utf8');
    const ingame = fs.readFileSync(path.join(root, 'ingame.html'), 'utf8');
    const selection = fs.readFileSync(path.join(root, 'selection.html'), 'utf8');
    assert.match(script, /pokemonTypeOverride/);
    assert.match(script, /pokemonTypeEffectivenessEvent/);
    assert.match(script, /Type: \$\{pokemonTypeText\}/);
    assert.match(styles, /\.hp-delta-popup\.type-effective/);
    assert.match(styles, /\.hp-delta-popup\.type-resisted/);
    assert.match(ingame, /pokemon-type-classes-v1/);
    assert.match(ingame, /styles\/style\.css\?v=[^"']*pokemon-type-classes-v1/);
    assert.match(selection, /pokemon-type-classes-v1/);
});
