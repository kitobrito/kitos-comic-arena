const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const characters = require('../characters');
const {
    buildInitialBoard,
    reduceHulkRageForInactiveTurn,
    resolvePendingTurnSkills,
} = require('../battleLogic');
const {
    buildLatestReleasesState,
    newsPost,
    syncPokemonAegislashRelease,
} = require('../sync_pokemon_aegislash_release');

const aegislash = characters.find((character) => character?.id === 'aegislash');
const root = path.resolve(__dirname, '..');
const attackSkill = {
    id: 'test-physical-attack',
    name: 'Test Attack',
    energy: [],
    cooldown: 0,
    target: 'single-enemy',
    classes: ['Physical', 'Instant'],
    effects: [{ type: 'damage', amount: 20, scope: 'target' }],
};
const attacker = {
    id: 'test-attacker',
    characterId: 'test-attacker',
    name: 'Test Attacker',
    arena: 'comic',
    skills: [attackSkill],
};

const makeMatch = () => {
    const roster = [aegislash, attacker];
    const players = [
        { username: 'ash', team: [0] },
        { username: 'gary', team: [1] },
    ];
    return {
        roster,
        match: {
            players,
            board: buildInitialBoard(players, roster),
            chakraPools: {
                ash: { taijutsu: 5, ninjutsu: 5, genjutsu: 5, bloodline: 5 },
                gary: { taijutsu: 5, ninjutsu: 5, genjutsu: 5, bloodline: 5 },
            },
            pendingTurns: {},
            pendingActions: [],
            pendingQueuedEffects: [],
            economy: { turnCounts: { ash: 1, gary: 1 } },
        },
    };
};

const queueSkill = ({ match, username, actorSlot = 0, skillIndex, targetUsername, targetSlot = 0 }) => {
    match.pendingTurns[username] = {
        queueOrder: [String(actorSlot)],
        queuedByActorSlot: {
            [String(actorSlot)]: {
                skillIndex,
                targetSelection: targetUsername ? [{ username: targetUsername, slot: targetSlot }] : [],
            },
        },
    };
};

test('Aegislash uses every supplied portrait and skill image', () => {
    assert.ok(aegislash);
    const expectedFiles = [
        aegislash.facePicture,
        ...aegislash.skills.map((skill) => skill.skillimage),
        'assets/images/PokemonArena/aegislash/OfficialPictures/facepicturewhenattacking.jpg',
    ];
    expectedFiles.forEach((relativePath) => {
        assert.ok(fs.existsSync(path.join(root, relativePath)), relativePath);
    });
    assert.deepEqual(aegislash.pokemonTypes, ['Steel', 'Ghost']);
});

test('Stance Change starts shielded, damaging moves enter Blade Stance, and inactivity preserves it', () => {
    const { match, roster } = makeMatch();
    const unit = match.board.ash[0];
    const initialShield = unit.state.statuses.find((status) => status.id === 'aegislash_shield_stance');
    assert.equal(initialShield.metadata.destructibleDefensePoints, 10);
    assert.equal(initialShield.metadata.unpierceableDamageReductionFlat, 5);

    const cutIndex = aegislash.skills.findIndex((skill) => skill.id === 'aegislash-slash');
    queueSkill({ match, username: 'ash', skillIndex: cutIndex, targetUsername: 'gary' });
    resolvePendingTurnSkills({ match, actingUsername: 'ash', characters: roster });
    assert.equal(match.board.gary[0].hp, 80);
    assert.equal(unit.state.statuses.some((status) => status.id === 'aegislash_shield_stance'), false);
    assert.equal(unit.state.statuses.some((status) => status.id === 'aegislash_blade_stance'), true);

    match._manualSkillActorSlotsByUsername.ash = [];
    reduceHulkRageForInactiveTurn({
        match,
        endingUsername: 'ash',
        pendingTurn: { queuedByActorSlot: {} },
    });
    assert.equal(unit.state.statuses.some((status) => status.id === 'aegislash_shield_stance'), false);
    assert.equal(unit.state.statuses.some((status) => status.id === 'aegislash_blade_stance'), true);
});

test('Swords Dance stacks Cut and Sacred Sword damage', () => {
    const { match, roster } = makeMatch();
    const swordsDanceIndex = aegislash.skills.findIndex((skill) => skill.id === 'aegislash-swords-dance');
    const slashIndex = aegislash.skills.findIndex((skill) => skill.id === 'aegislash-slash');

    queueSkill({ match, username: 'ash', skillIndex: swordsDanceIndex, targetUsername: 'ash' });
    resolvePendingTurnSkills({ match, actingUsername: 'ash', characters: roster });
    match.pendingTurns.ash = {};
    queueSkill({ match, username: 'ash', skillIndex: slashIndex, targetUsername: 'gary' });
    resolvePendingTurnSkills({ match, actingUsername: 'ash', characters: roster });

    assert.equal(match.board.gary[0].hp, 75);
    const dance = match.board.ash[0].state.statuses.find((status) => status.id === 'aegislash_swords_dance');
    assert.equal(dance.metadata.skillDamageBonuses['aegislash-slash'], 5);
    assert.equal(dance.metadata.skillDamageBonuses['aegislash-sacred-sword'], 10);
});

test("Aegislash uses Cut naming and King's Shield has no Invisible or Invincible class", () => {
    const cut = aegislash.skills.find((skill) => skill.id === 'aegislash-slash');
    const swordsDance = aegislash.skills.find((skill) => skill.id === 'aegislash-swords-dance');
    const kingsShield = aegislash.skills.find((skill) => skill.id === 'aegislash-kings-shield');
    const stanceChange = aegislash.skills.find((skill) => skill.id === 'aegislash-stance-change');
    assert.equal(cut.name, 'Cut');
    assert.match(swordsDance.skilldescription, /Cut's damage by 5/i);
    assert.equal(kingsShield.classes.includes('Invincible'), false);
    assert.equal(kingsShield.classes.includes('Invisible'), false);
    assert.match(stanceChange.skilldescription, /does not change its stance/i);
    const tracker = aegislash.startStatuses.find(
        (status) => status.statusId === 'aegislash_stance_change_tracker'
    );
    assert.equal(tracker.metadata.turnEndApplyStatusToOwnerIfNoManualSkill, undefined);
});

test("King's Shield ignores damage and penalizes each attacking enemy only once per use", () => {
    const { match, roster } = makeMatch();
    const kingsShieldIndex = aegislash.skills.findIndex((skill) => skill.id === 'aegislash-kings-shield');
    queueSkill({ match, username: 'ash', skillIndex: kingsShieldIndex, targetUsername: 'ash' });
    resolvePendingTurnSkills({ match, actingUsername: 'ash', characters: roster });

    queueSkill({ match, username: 'gary', skillIndex: 0, targetUsername: 'ash' });
    resolvePendingTurnSkills({ match, actingUsername: 'gary', characters: roster });
    queueSkill({ match, username: 'gary', skillIndex: 0, targetUsername: 'ash' });
    resolvePendingTurnSkills({ match, actingUsername: 'gary', characters: roster });

    assert.equal(match.board.ash[0].hp, 100);
    const penalty = match.board.gary[0].state.statuses.find(
        (status) => status.id === 'aegislash_kings_shield_damage_penalty'
    );
    assert.equal(penalty.metadata.nonAfflictionDamageDebuffFlat, 5);
});

test('Aegislash release news credits fghop and covers community characters, classes, Chikorita, and iPhone sound', async () => {
    const text = newsPost.paragraphs.join(' ');
    assert.match(text, /old Anime Arena game.*designed by fghop/i);
    assert.match(text, /other community characters.*next/i);
    assert.match(text, /Physical and Special.*only primary damage classes/i);
    assert.match(text, /Affliction.*secondary class/i);
    assert.match(text, /Chikorita.*Physical, Special, and Affliction.*5 each turn/i);
    assert.match(text, /iPhone sound controls.*repaired/i);

    const documents = new Map();
    const db = {
        collection(name) {
            return {
                async findOne(filter) {
                    return documents.get(`${name}:${filter.key || filter.title}`) || null;
                },
                async updateOne(filter, update) {
                    const key = `${name}:${filter.key || filter.title}`;
                    documents.set(key, {
                        ...(documents.get(key) || {}),
                        ...(update.$setOnInsert || {}),
                        ...(update.$set || {}),
                        ...filter,
                    });
                },
            };
        },
    };
    documents.set('app_state:latest_character_releases', {
        key: 'latest_character_releases',
        releasesByArena: { comic: [{ characterId: 'the-hulk' }], pokemon: [{ characterId: 'totodile' }] },
    });
    assert.deepEqual(await syncPokemonAegislashRelease(db), { migrated: true, newsSynced: true });
    assert.deepEqual(await syncPokemonAegislashRelease(db), { migrated: false, newsSynced: true });
    assert.deepEqual(
        buildLatestReleasesState(documents.get('app_state:latest_character_releases')).releasesByArena.comic,
        [{ characterId: 'the-hulk' }]
    );
    assert.deepEqual(
        documents.get('app_state:latest_character_releases').releasesByArena.pokemon,
        [{ characterId: 'aegislash' }]
    );
});
