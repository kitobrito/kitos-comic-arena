const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const characters = require('../characters');
const {
    buildInitialBoard,
    reduceHulkRageForInactiveTurn,
    resolvePendingTurnSkills,
    tickStatusesForTurnEnd,
} = require('../battleLogic');
const {
    ensureRequiredMissionCatalogEntries,
    resolveMissionUnlockPointCost,
} = require('../server');
const {
    buildLatestReleasesState,
    newsPost,
    syncPokemonDragapultRelease,
} = require('../sync_pokemon_dragapult_release');

const root = path.resolve(__dirname, '..');
const dragapultIndex = characters.findIndex((character) => character?.id === 'dragapult');
const koffingIndex = characters.findIndex((character) => character?.id === 'koffing');

const makeMatch = (teams) => {
    const players = Object.entries(teams).map(([username, team]) => ({ username, team }));
    return {
        players,
        board: buildInitialBoard(players, characters),
        chakraPools: Object.fromEntries(
            players.map(({ username }) => [
                username,
                { taijutsu: 20, ninjutsu: 20, genjutsu: 20, bloodline: 20 },
            ])
        ),
        pendingTurns: {},
        pendingActions: [],
        pendingQueuedEffects: [],
        economy: { turnCounts: Object.fromEntries(players.map(({ username }) => [username, 1])) },
    };
};

const queueSkill = (match, username, skillIndex, targetUsername, targetSlot = 0) => {
    match.pendingTurns[username] = {
        queueOrder: ['0'],
        queuedByActorSlot: {
            0: {
                skillIndex,
                targetSelection: [{ username: targetUsername, slot: targetSlot }],
            },
        },
    };
};

const useSkill = (match, skillIndex, targetSlot = 0) => {
    queueSkill(match, 'ash', skillIndex, 'gary', targetSlot);
    resolvePendingTurnSkills({ match, actingUsername: 'ash', characters });
};

test('Dragapult uses supplied art, Moses credit, Dragon/Ghost typing, and exact costs', () => {
    const dragapult = characters[dragapultIndex];
    assert.ok(dragapult);
    assert.deepEqual(dragapult.pokemonTypes, ['Dragon', 'Ghost']);
    assert.match(dragapult.description, /community character.*designed by Moses/i);
    assert.deepEqual(
        dragapult.skills.map((skill) => skill.energy),
        [
            ['Ninjutsu'],
            ['Genjutsu', 'Genjutsu'],
            ['Taijutsu', 'Taijutsu'],
            ['Bloodline', 'Bloodline'],
        ]
    );
    assert.deepEqual(
        dragapult.skills.map((skill) => skill.cooldown),
        [0, 3, 3, 4]
    );
    [
        dragapult.facePicture,
        ...dragapult.skills.map((skill) => skill.skillimage),
        'assets/images/PokemonArena/missionpics/dragapult.jpg',
        'assets/images/selection-featured/PokemonArena/BIB/dragapult.jpg.webp',
    ].forEach((asset) => assert.ok(fs.existsSync(path.join(root, asset)), asset));
});

test('Dragon Darts keeps two FIFO stacks across targets and stacks on one target', () => {
    const match = makeMatch({
        ash: [dragapultIndex],
        gary: [koffingIndex, koffingIndex, koffingIndex],
    });

    useSkill(match, 0, 0);
    useSkill(match, 0, 0);
    let mark = match.board.gary[0].state.statuses.find(
        (status) => status.id === 'dragapult_dragon_darts'
    );
    assert.equal(mark?.metadata?.dragapultDragonDartsStacks, 2);

    useSkill(match, 0, 1);
    mark = match.board.gary[0].state.statuses.find(
        (status) => status.id === 'dragapult_dragon_darts'
    );
    assert.equal(mark?.metadata?.dragapultDragonDartsStacks, 1);
    assert.equal(
        match.board.gary[1].state.statuses.find(
            (status) => status.id === 'dragapult_dragon_darts'
        )?.metadata?.dragapultDragonDartsStacks,
        1
    );

    useSkill(match, 0, 2);
    assert.equal(
        match.board.gary[0].state.statuses.some(
            (status) => status.id === 'dragapult_dragon_darts'
        ),
        false
    );
    assert.ok(match.board.gary[1].state.statuses.some(
        (status) => status.id === 'dragapult_dragon_darts'
    ));
    assert.ok(match.board.gary[2].state.statuses.some(
        (status) => status.id === 'dragapult_dragon_darts'
    ));
});

test('Dragon Darts deals turn damage and inactive piercing damage, doubled while stunned', () => {
    const normal = makeMatch({ ash: [dragapultIndex], gary: [koffingIndex] });
    useSkill(normal, 0);
    reduceHulkRageForInactiveTurn({
        match: normal,
        endingUsername: 'gary',
        pendingTurn: {},
    });
    tickStatusesForTurnEnd({ match: normal, endingUsername: 'gary' });
    assert.equal(normal.board.gary[0].hp, 85);

    const stacked = makeMatch({ ash: [dragapultIndex], gary: [koffingIndex] });
    useSkill(stacked, 0);
    useSkill(stacked, 0);
    reduceHulkRageForInactiveTurn({
        match: stacked,
        endingUsername: 'gary',
        pendingTurn: {},
    });
    tickStatusesForTurnEnd({ match: stacked, endingUsername: 'gary' });
    assert.equal(stacked.board.gary[0].hp, 70);

    const stunned = makeMatch({ ash: [dragapultIndex], gary: [koffingIndex] });
    useSkill(stunned, 0);
    useSkill(stunned, 0);
    stunned.board.gary[0].state.statuses.push({
        id: 'test_dragapult_stun',
        remainingTurns: 1,
        metadata: { harmful: true, stunLikeEffect: true, cannotUseSkills: true },
    });
    reduceHulkRageForInactiveTurn({
        match: stunned,
        endingUsername: 'gary',
        pendingTurn: {},
    });
    tickStatusesForTurnEnd({ match: stunned, endingUsername: 'gary' });
    assert.equal(stunned.board.gary[0].hp, 40);
});

test('Thunderbolt and Dragon Tail apply their intended two-turn class stuns', () => {
    const thunderbolt = makeMatch({ ash: [dragapultIndex], gary: [koffingIndex] });
    useSkill(thunderbolt, 1);
    assert.equal(thunderbolt.board.gary[0].hp, 85);
    assert.deepEqual(
        thunderbolt.board.gary[0].state.statuses.find(
            (status) => status.id === 'dragapult_thunderbolt_physical_stun'
        )?.metadata?.cannotUseSkillClasses,
        ['Physical']
    );

    const dragonTail = makeMatch({ ash: [dragapultIndex], gary: [koffingIndex] });
    useSkill(dragonTail, 2);
    assert.equal(dragonTail.board.gary[0].hp, 70);
    assert.deepEqual(
        dragonTail.board.gary[0].state.statuses.find(
            (status) => status.id === 'dragapult_dragon_tail_special_stun'
        )?.metadata?.cannotUseSkillClasses,
        ['Special']
    );
});

test('Dragon Rush becomes invulnerable and fully stuns for each Dragon Darts stack', () => {
    const match = makeMatch({ ash: [dragapultIndex], gary: [koffingIndex] });
    useSkill(match, 0);
    useSkill(match, 0);
    useSkill(match, 3);

    assert.equal(match.board.gary[0].hp, 70);
    assert.equal(
        match.board.gary[0].state.statuses.find(
            (status) => status.id === 'dragapult_dragon_rush_stun'
        )?.remainingTurns,
        2
    );
    assert.equal(
        match.board.ash[0].state.statuses.find(
            (status) => status.id === 'dragapult_dragon_rush_invulnerable'
        )?.metadata?.invulnerable,
        true
    );
});

test('Dragapult mission is level 14, uses the supplied art, and costs 400 points', () => {
    const mission = ensureRequiredMissionCatalogEntries([]).find(
        (entry) => entry.reward_character === 'dragapult'
    );
    assert.ok(mission);
    assert.equal(mission.missionId, 'dragapult-dragon-darts-trial');
    assert.equal(mission.level_requirement, 14);
    assert.equal(resolveMissionUnlockPointCost(mission), 400);
    assert.equal(mission.image, 'assets/images/PokemonArena/missionpics/dragapult.jpg');
    assert.deepEqual(
        mission.goals.map((goal) => [goal.type, goal.character_ids, goal.wins]),
        [
            ['win_matches_same_team', ['dragonite', 'gastly'], 8],
            ['win_streak_same_team', ['dragonite', 'gastly'], 4],
        ]
    );
});

test('Dragapult release news is idempotent, credits Moses, and updates latest releases', async () => {
    const text = newsPost.paragraphs.join(' ');
    assert.match(text, /designed by Moses/i);
    assert.match(text, /400 points/i);
    assert.match(text, /Dragonite and Gastly/i);

    const documents = new Map();
    const getFilterKey = (filter) => {
        if (filter?.key) return filter.key;
        const clauses = Array.isArray(filter?.$or) ? filter.$or : [];
        return clauses.find((clause) => clause?.releaseVersion)?.releaseVersion
            || clauses.find((clause) => clause?.title)?.title;
    };
    const db = {
        collection(name) {
            return {
                async findOne(filter) {
                    return documents.get(`${name}:${getFilterKey(filter)}`) || null;
                },
                async updateOne(filter, update) {
                    const key = `${name}:${getFilterKey(filter)}`;
                    documents.set(key, {
                        ...(documents.get(key) || {}),
                        ...(update.$setOnInsert || {}),
                        ...(update.$set || {}),
                    });
                },
            };
        },
    };
    documents.set('app_state:latest_character_releases', {
        key: 'latest_character_releases',
        releasesByArena: {
            comic: [{ characterId: 'the-hulk' }],
            pokemon: [{ characterId: 'aegislash' }, { characterId: 'scraggy' }],
        },
    });

    assert.deepEqual(await syncPokemonDragapultRelease(db), {
        migrated: true,
        newsSynced: true,
    });
    assert.deepEqual(await syncPokemonDragapultRelease(db), {
        migrated: false,
        newsSynced: true,
    });
    assert.deepEqual(
        buildLatestReleasesState(documents.get('app_state:latest_character_releases'))
            .releasesByArena.comic,
        [{ characterId: 'the-hulk' }]
    );
    assert.deepEqual(
        documents.get('app_state:latest_character_releases').releasesByArena.pokemon,
        [
            { characterId: 'dragapult' },
            { characterId: 'scraggy' },
            { characterId: 'ditto' },
        ]
    );
});
