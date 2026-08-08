const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const characters = require('../characters');
const {
    buildInitialBoard,
    computeEffectiveEnergyCost,
    computeTargetOptions,
    resolveEffectiveSkill,
    resolvePendingTurnSkills,
} = require('../battleLogic');
const {
    POKEMON_SKIN_CATALOG,
    ensureRequiredMissionCatalogEntries,
    resolveMissionUnlockPointCost,
} = require('../server');
const {
    buildLatestReleasesState,
    newsPost,
    syncPokemonDittoRelease,
} = require('../sync_pokemon_ditto_release');
const {
    DITTO_TRANSFORMATION_FACE_BY_CHARACTER_ID,
    DITTO_TRANSFORMATION_FACE_BY_SKIN_ID,
    DITTO_TRANSFORMATION_FACE_BY_SKIN_STATUS_ID,
    DITTO_TRANSFORMATION_FACE_BY_STATUS_ID,
    resolveDittoTransformationFacePicture,
} = require('../pokemonDittoTransformationFaces');

const root = path.resolve(__dirname, '..');
const dittoIndex = characters.findIndex((character) => character?.id === 'ditto');
const trainerIndex = characters.findIndex((character) => character?.id === 'pokemon-trainer');
const eeveeIndex = characters.findIndex((character) => character?.id === 'eevee');
const moltresIndex = characters.findIndex((character) => character?.id === 'moltres');
const totodileIndex = characters.findIndex((character) => character?.id === 'totodile');
const aegislashIndex = characters.findIndex((character) => character?.id === 'aegislash');

const makeMatch = (players, roster = characters) => ({
    players,
    board: buildInitialBoard(players, roster),
    chakraPools: Object.fromEntries(
        players.map((player) => [
            player.username,
            { taijutsu: 3, ninjutsu: 3, genjutsu: 3, bloodline: 3 },
        ])
    ),
    pendingTurns: {},
    pendingActions: [],
    pendingQueuedEffects: [],
    economy: {
        turnCounts: Object.fromEntries(players.map((player) => [player.username, 1])),
    },
});

const queueSkill = ({
    match,
    username,
    actorSlot = 0,
    skillIndex = 0,
    targetUsername,
    targetSlot = 0,
}) => {
    match.pendingTurns[username] = {
        queueOrder: [String(actorSlot)],
        queuedByActorSlot: {
            [actorSlot]: {
                skillIndex,
                targetSelection: [{ username: targetUsername, slot: targetSlot }],
            },
        },
    };
};

test('Ditto uses the official supplied assets, Normal typing, and KiruKasai credit', () => {
    const ditto = characters[dittoIndex];
    assert.ok(ditto);
    assert.deepEqual(ditto.pokemonTypes, ['Normal']);
    assert.match(ditto.description, /designed by KiruKasai/i);
    assert.equal(ditto.facePicture, 'assets/images/PokemonArena/Ditto/Done/FP.jpg');
    assert.equal(ditto.skills.length, 5);
    ditto.skills.forEach((skill) => {
        assert.equal(skill.skillimage, 'assets/images/PokemonArena/Ditto/Done/transform.jpg');
        assert.ok(fs.existsSync(path.join(root, skill.skillimage)));
    });
    assert.ok(fs.existsSync(path.join(root, ditto.facePicture)));
});

test('every transformable Pokemon and supplied form has an optimized Ditto portrait', () => {
    const transformableCharacterIds = characters
        .filter(
            (character) =>
                String(character?.arena || character?.universe || '').toLowerCase() === 'pokemon' &&
                character.id !== 'ditto'
        )
        .flatMap((character) => [
            character.id,
            ...(Array.isArray(character.battleForms)
                ? character.battleForms.map((form) => form.id)
                : []),
        ])
        .sort();
    assert.deepEqual(
        Object.keys(DITTO_TRANSFORMATION_FACE_BY_CHARACTER_ID).sort(),
        transformableCharacterIds
    );

    const mappedFaces = new Set([
        ...Object.values(DITTO_TRANSFORMATION_FACE_BY_CHARACTER_ID),
        ...Object.values(DITTO_TRANSFORMATION_FACE_BY_STATUS_ID),
        ...Object.values(DITTO_TRANSFORMATION_FACE_BY_SKIN_ID),
        ...Object.values(DITTO_TRANSFORMATION_FACE_BY_SKIN_STATUS_ID),
    ]);
    const optimizedDirectory = path.join(
        root,
        'assets',
        'images',
        'PokemonArena',
        'Ditto',
        'transformationfps',
        'optimized'
    );
    const optimizedFaces = fs.readdirSync(optimizedDirectory)
        .filter((filename) => filename.endsWith('.webp'))
        .sort();
    assert.equal(mappedFaces.size, 86);
    assert.deepEqual(
        [...mappedFaces].map((face) => path.basename(face)).sort(),
        optimizedFaces
    );
    mappedFaces.forEach((face) => {
        assert.ok(fs.existsSync(path.join(root, face)), `Missing optimized Ditto face: ${face}`);
    });
});

test('Ditto portrait resolution prefers supplied forms and skins with safe fallbacks', () => {
    assert.equal(
        resolveDittoTransformationFacePicture({ characterId: 'moltres' }),
        DITTO_TRANSFORMATION_FACE_BY_CHARACTER_ID.moltres
    );
    assert.equal(
        resolveDittoTransformationFacePicture({
            characterId: 'aegislash',
            activeStatusIds: ['aegislash_shield_stance', 'aegislash_blade_stance'],
        }),
        DITTO_TRANSFORMATION_FACE_BY_STATUS_ID.aegislash_blade_stance
    );
    assert.equal(
        resolveDittoTransformationFacePicture({
            characterId: 'pikachu',
            effectiveSkinId: 'pikachu-raichu',
            targetFacePicture: characters.find((character) => character.id === 'pikachu').facePicture,
            characterFacePicture: characters.find((character) => character.id === 'pikachu').facePicture,
        }),
        DITTO_TRANSFORMATION_FACE_BY_SKIN_ID['pikachu-raichu']
    );
    assert.equal(
        resolveDittoTransformationFacePicture({
            characterId: 'onix',
            effectiveSkinId: 'onix-crystal',
            targetFacePicture: characters.find((character) => character.id === 'onix').facePicture,
            characterFacePicture: characters.find((character) => character.id === 'onix').facePicture,
        }),
        DITTO_TRANSFORMATION_FACE_BY_SKIN_ID['onix-crystal']
    );
    const redGyaradosFace = 'assets/images/PokemonArena/magikarp/skins/gold/redfp.jpeg';
    assert.equal(
        resolveDittoTransformationFacePicture({
            characterId: 'magikarp',
            effectiveSkinId: 'magikarp-golden-gyarados-red',
            activeStatusIds: ['magikarp_gyarados_evolution'],
            targetFacePicture: redGyaradosFace,
            characterFacePicture: characters.find((character) => character.id === 'magikarp').facePicture,
        }),
        DITTO_TRANSFORMATION_FACE_BY_SKIN_STATUS_ID[
            'magikarp-golden-gyarados-red:magikarp_gyarados_evolution'
        ]
    );
    assert.equal(
        resolveDittoTransformationFacePicture({
            characterId: 'charmander',
            effectiveSkinId: 'charmander-charizard-legendary',
            activeStatusIds: ['charmander_charizard_x_evolution_branch'],
            targetFacePicture:
                'assets/images/PokemonArena/Charmander/skins/charizard/megacharizardxfp.webp',
            characterFacePicture: characters.find((character) => character.id === 'charmander').facePicture,
        }),
        DITTO_TRANSFORMATION_FACE_BY_SKIN_STATUS_ID[
            'charmander-charizard-legendary:charmander_charizard_x_evolution_branch'
        ]
    );
});

test('Ditto automatically copies the character opposite it without discounting its Random cost', () => {
    const ditto = structuredClone(characters[dittoIndex]);
    const copied = {
        id: 'copy-target',
        characterId: 'copy-target',
        name: 'Copy Target',
        facePicture: 'copy-target.jpg',
        arena: 'comic',
        skills: [
            {
                id: 'copy-target-strike',
                name: 'Strike',
                energy: ['Ninjutsu'],
                target: 'single-enemy',
                cooldown: 0,
                classes: ['Physical', 'Instant'],
                effects: [{ type: 'damage', amount: 20, scope: 'target' }],
            },
            {
                id: 'copy-target-heavy',
                name: 'Heavy',
                energy: ['Ninjutsu', 'Genjutsu'],
                target: 'single-enemy',
                cooldown: 0,
                classes: ['Physical', 'Instant'],
                effects: [{ type: 'damage', amount: 30, scope: 'target' }],
            },
        ],
    };
    const victim = {
        id: 'copy-victim',
        characterId: 'copy-victim',
        name: 'Victim',
        facePicture: 'victim.jpg',
        arena: 'comic',
        skills: [],
    };
    const roster = [ditto, copied, victim];
    const players = [
        { username: 'DittoUser', team: [0] },
        { username: 'Opponent', team: [1, 2] },
    ];
    const match = makeMatch(players, roster);
    const unit = match.board.DittoUser[0];
    const transformation = unit.state.statuses.find((status) => status.id === 'ditto_transformation');

    assert.equal(transformation?.metadata?.effectiveCharacterId, 'copy-target');
    assert.equal(transformation?.metadata?.DamageDebuff, 5);
    assert.equal(
        resolveEffectiveSkill({
            characters: roster,
            rosterIndex: 0,
            skillIndex: 0,
            actorState: unit.state,
        })?.id,
        'copy-target-strike'
    );
    assert.equal(
        computeEffectiveEnergyCost({ skill: copied.skills[0], actorState: unit.state }).requiredRandom,
        1
    );
    assert.equal(
        computeEffectiveEnergyCost({ skill: copied.skills[1], actorState: unit.state }).requiredRandom,
        2
    );

    queueSkill({
        match,
        username: 'DittoUser',
        skillIndex: 0,
        targetUsername: 'Opponent',
        targetSlot: 1,
    });
    resolvePendingTurnSkills({ match, actingUsername: 'DittoUser', characters: roster });
    assert.equal(match.board.Opponent[1].hp, 85);
});

test('Ditto copies Pokemon passive trackers and can build Moltres Heat', () => {
    const players = [
        { username: 'DittoUser', team: [dittoIndex] },
        { username: 'Opponent', team: [moltresIndex] },
    ];
    const match = makeMatch(players);
    const ditto = match.board.DittoUser[0];
    const transformation = ditto.state.statuses.find(
        (status) => status.id === 'ditto_transformation'
    );
    assert.equal(
        transformation?.metadata?.facePictureOverride,
        DITTO_TRANSFORMATION_FACE_BY_CHARACTER_ID.moltres
    );
    const heatTracker = ditto.state.statuses.find((status) => status.id === 'moltres_heat');
    const heatWaveIndex = characters[moltresIndex].skills.findIndex(
        (skill) => skill.id === 'moltres-heat-wave'
    );

    assert.ok(heatTracker, 'Ditto should receive Moltres Heat when transforming');
    assert.equal(heatTracker.metadata.heat, 0);

    queueSkill({
        match,
        username: 'DittoUser',
        skillIndex: heatWaveIndex,
        targetUsername: 'Opponent',
    });
    resolvePendingTurnSkills({ match, actingUsername: 'DittoUser', characters });

    assert.equal(heatTracker.metadata.heat, 1);
});

test('Ditto receives every Pokemon start-of-battle passive and tracker', () => {
    characters.forEach((character, characterIndex) => {
        const startStatuses = Array.isArray(character?.startStatuses) ? character.startStatuses : [];
        if (
            characterIndex === dittoIndex ||
            character?.arena !== 'pokemon' ||
            startStatuses.length === 0
        ) {
            return;
        }
        const players = [
            { username: 'DittoUser', team: [dittoIndex] },
            { username: 'Opponent', team: [characterIndex] },
        ];
        const match = makeMatch(players);
        const copiedStatusIds = new Set(
            match.board.DittoUser[0].state.statuses.map((status) => status?.id).filter(Boolean)
        );

        startStatuses.forEach((status) => {
            const statusId = status?.statusId || status?.id;
            assert.ok(
                copiedStatusIds.has(statusId),
                `Ditto should copy ${character.id}'s ${statusId} passive tracker`
            );
        });
    });
});

test('Ditto keeps passive trackers when copying an already-evolved Pokemon', () => {
    const players = [
        { username: 'Pink', team: [dittoIndex] },
        { username: 'Blue', team: [dittoIndex, totodileIndex] },
    ];
    const match = makeMatch(players);
    const evolvedTotodile = match.board.Blue[1];
    evolvedTotodile.state.statuses.push({
        id: 'test_totodile_evolution',
        remainingTurns: 999,
        metadata: {
            infiniteDuration: true,
            useEvolvedSkills: true,
        },
    });

    queueSkill({
        match,
        username: 'Pink',
        skillIndex: 0,
        targetUsername: 'Blue',
        targetSlot: 1,
    });
    resolvePendingTurnSkills({ match, actingUsername: 'Pink', characters });

    const copiedDitto = match.board.Pink[0];
    assert.ok(
        copiedDitto.state.statuses.some(
            (status) => status.id === 'totodile_water_rings_tracker'
        )
    );
    assert.equal(
        copiedDitto.state.statuses.find((status) => status.id === 'ditto_transformation')
            ?.metadata?.useEvolvedSkills,
        true
    );
});

test('opposing Ditto remain Ditto and can manually Transform into a living ally or enemy', () => {
    const players = [
        { username: 'Pink', team: [dittoIndex, eeveeIndex] },
        { username: 'Blue', team: [dittoIndex, trainerIndex] },
    ];
    const match = makeMatch(players);
    const pinkDitto = match.board.Pink[0];

    assert.equal(
        pinkDitto.state.statuses.some((status) => status.id === 'ditto_transformation'),
        false
    );
    const options = computeTargetOptions({
        match,
        actingUsername: 'Pink',
        actorSlot: 0,
        skillIndex: 0,
        characters,
    });
    assert.deepEqual(
        options.targets.map((target) => `${target.username}:${target.slot}`).sort(),
        ['Blue:0', 'Blue:1', 'Pink:1']
    );

    queueSkill({
        match,
        username: 'Pink',
        skillIndex: 0,
        targetUsername: 'Pink',
        targetSlot: 1,
    });
    resolvePendingTurnSkills({ match, actingUsername: 'Pink', characters });
    assert.equal(
        resolveEffectiveSkill({
            characters,
            rosterIndex: dittoIndex,
            skillIndex: 0,
            actorState: pinkDitto.state,
        })?.id,
        characters[eeveeIndex].skills[0].id
    );
});

test('Ditto portraits follow copied Aegislash stances and survive reconnect serialization', () => {
    const makeMirrorMatch = () =>
        makeMatch([
            { username: 'Pink', team: [dittoIndex, eeveeIndex] },
            { username: 'Blue', team: [dittoIndex, aegislashIndex] },
        ]);
    const transformIntoAegislash = (match) => {
        queueSkill({
            match,
            username: 'Pink',
            skillIndex: 0,
            targetUsername: 'Blue',
            targetSlot: 1,
        });
        resolvePendingTurnSkills({ match, actingUsername: 'Pink', characters });
        return match.board.Pink[0].state.statuses.find(
            (status) => status.id === 'ditto_transformation'
        );
    };

    const shieldMatch = makeMirrorMatch();
    const shieldTransformation = transformIntoAegislash(shieldMatch);
    assert.equal(
        shieldTransformation.metadata.facePictureOverride,
        DITTO_TRANSFORMATION_FACE_BY_STATUS_ID.aegislash_shield_stance
    );
    const recoveredBoard = JSON.parse(JSON.stringify(shieldMatch.board));
    assert.equal(
        recoveredBoard.Pink[0].state.statuses.find(
            (status) => status.id === 'ditto_transformation'
        ).metadata.facePictureOverride,
        DITTO_TRANSFORMATION_FACE_BY_STATUS_ID.aegislash_shield_stance
    );

    const bladeMatch = makeMirrorMatch();
    const bladeTargetState = bladeMatch.board.Blue[1].state;
    bladeTargetState.statuses = bladeTargetState.statuses.filter(
        (status) => status.id !== 'aegislash_shield_stance'
    );
    bladeTargetState.statuses.push({
        id: 'aegislash_blade_stance',
        remainingTurns: 999,
        metadata: {
            infiniteDuration: true,
            facePictureOverride:
                'assets/images/PokemonArena/aegislash/OfficialPictures/facepicturewhenattacking.jpg',
        },
    });
    const bladeTransformation = transformIntoAegislash(bladeMatch);
    assert.equal(
        bladeTransformation.metadata.facePictureOverride,
        DITTO_TRANSFORMATION_FACE_BY_STATUS_ID.aegislash_blade_stance
    );
});

test('Ditto copies the target skin, while Shiny Ditto never leaks its own skin into a transformation', () => {
    const pikachuIndex = characters.findIndex((character) => character?.id === 'pikachu');
    const players = [
        {
            username: 'Shiny',
            team: [dittoIndex],
            profile: {
                skins: {
                    equippedSkinByCharacterId: { ditto: 'ditto-shiny' },
                },
            },
        },
        {
            username: 'Target',
            team: [pikachuIndex],
            profile: {
                skins: {
                    equippedSkinByCharacterId: { pikachu: 'pikachu-raichu' },
                },
            },
        },
    ];
    const board = buildInitialBoard(players, characters);
    const transformation = board.Shiny[0].state.statuses.find(
        (status) => status.id === 'ditto_transformation'
    );
    assert.equal(transformation.metadata.effectiveCharacterId, 'pikachu');
    assert.equal(transformation.metadata.effectiveSkinId, 'pikachu-raichu');
    assert.equal(
        transformation.metadata.facePictureOverride,
        DITTO_TRANSFORMATION_FACE_BY_SKIN_ID['pikachu-raichu']
    );
    assert.notEqual(transformation.metadata.effectiveSkinId, 'ditto-shiny');
});

test('Pokemon Trainer captures base Ditto, including its shiny skin, then must use Transform', () => {
    const masterBallIndex = characters[trainerIndex].skills.findIndex(
        (skill) => skill.id === 'pokemon-trainer-master-ball'
    );
    const players = [
        { username: 'Trainer', team: [trainerIndex, eeveeIndex] },
        {
            username: 'DittoUser',
            team: [dittoIndex],
            profile: {
                skins: {
                    equippedSkinByCharacterId: { ditto: 'ditto-shiny' },
                },
            },
        },
    ];
    const match = makeMatch(players);
    assert.equal(
        match.board.DittoUser[0].state.statuses.find((status) => status.id === 'ditto_transformation')
            ?.metadata?.effectiveCharacterId,
        'pokemon-trainer'
    );

    queueSkill({
        match,
        username: 'Trainer',
        skillIndex: masterBallIndex,
        targetUsername: 'DittoUser',
    });
    resolvePendingTurnSkills({ match, actingUsername: 'Trainer', characters });
    const trainerUnit = match.board.Trainer[0];
    const capture = trainerUnit.state.statuses.find(
        (status) => status.id === 'pokemon_trainer_capture_form'
    );
    assert.equal(capture.metadata.effectiveCharacterId, 'ditto');
    assert.equal(capture.metadata.effectiveSkinId, 'ditto-shiny');
    assert.equal(capture.metadata.DamageDebuff, undefined);
    assert.equal(
        resolveEffectiveSkill({
            characters,
            rosterIndex: trainerIndex,
            skillIndex: 0,
            actorState: trainerUnit.state,
        })?.id,
        'ditto-transform-1'
    );

    match.pendingTurns.Trainer = {};
    queueSkill({
        match,
        username: 'Trainer',
        skillIndex: 0,
        targetUsername: 'Trainer',
        targetSlot: 1,
    });
    resolvePendingTurnSkills({ match, actingUsername: 'Trainer', characters });
    const transformation = trainerUnit.state.statuses.find(
        (status) => status.id === 'ditto_transformation'
    );
    assert.equal(transformation.metadata.effectiveCharacterId, 'eevee');
    assert.equal(transformation.metadata.DamageDebuff, 5);
    assert.equal(
        transformation.metadata.facePictureOverride,
        DITTO_TRANSFORMATION_FACE_BY_CHARACTER_ID.eevee
    );
    assert.equal(
        resolveEffectiveSkill({
            characters,
            rosterIndex: trainerIndex,
            skillIndex: 0,
            actorState: trainerUnit.state,
        })?.id,
        characters[eeveeIndex].skills[0].id
    );
});

test('Ditto mission and both 500-point skins use the supplied assets', () => {
    const mission = ensureRequiredMissionCatalogEntries([]).find(
        (entry) => entry.reward_character === 'ditto'
    );
    assert.ok(mission);
    assert.equal(mission.missionId, 'ditto-perfect-copy-trial');
    assert.equal(resolveMissionUnlockPointCost(mission), 300);
    assert.equal(mission.image, 'assets/images/PokemonArena/missionpics/ditto.avif');
    assert.deepEqual(
        mission.goals.map((goal) => ({
            type: goal.type,
            characterIds: goal.character_ids,
            wins: goal.wins,
        })),
        [
            {
                type: 'win_matches_same_team',
                characterIds: ['eevee', 'pokemon-trainer'],
                wins: 8,
            },
            {
                type: 'win_streak_same_team',
                characterIds: ['eevee', 'pokemon-trainer'],
                wins: 4,
            },
        ]
    );
    assert.ok(fs.existsSync(path.join(root, mission.image)));

    const shiny = POKEMON_SKIN_CATALOG.find((skin) => skin.skinId === 'ditto-shiny');
    assert.ok(shiny);
    assert.equal(shiny.unlockPointCost, 500);
    assert.equal(shiny.patch.facePicture, 'assets/images/PokemonArena/Ditto/Done/shinyFP.jpg');
    assert.ok(fs.existsSync(path.join(root, shiny.patch.facePicture)));
    const flubber = POKEMON_SKIN_CATALOG.find((skin) => skin.skinId === 'ditto-flubber');
    assert.ok(flubber);
    assert.equal(flubber.unlockPointCost, 500);
    assert.equal(
        flubber.patch.facePicture,
        'assets/images/PokemonArena/Ditto/Done/dittoflubberskin.png'
    );
    assert.ok(fs.existsSync(path.join(root, flubber.patch.facePicture)));
    assert.ok(fs.existsSync(path.join(
        root,
        'assets/images/selection-thumbnails/PokemonArena/Ditto/Done/dittoflubberskin.png.webp'
    )));
    assert.ok(fs.existsSync(path.join(
        root,
        'assets/images/selection-featured/PokemonArena/BIB/ditto.webp'
    )));
    assert.ok(fs.existsSync(path.join(
        root,
        'assets/images/selection-featured/PokemonArena/BIB/shinyditto.webp'
    )));
    assert.ok(fs.existsSync(path.join(
        root,
        'assets/images/PokemonArena/BIB/dittoflubberskin.png'
    )));
    assert.ok(fs.existsSync(path.join(
        root,
        'assets/images/selection-featured/PokemonArena/BIB/flubberditto.webp'
    )));
    const selectionSource = fs.readFileSync(path.join(root, 'scripts', 'script.js'), 'utf8');
    const selectionHtml = fs.readFileSync(path.join(root, 'selection.html'), 'utf8');
    assert.match(selectionSource, /'ditto-flubber': \[[\s\S]*?filename: 'flubberditto\.webp'/);
    assert.match(selectionHtml, /flubber-ditto-v1/);
});

test('community batch news is idempotent, credits every designer, and orders latest releases', async () => {
    const text = newsPost.paragraphs.join(' ');
    assert.match(text, /Ditto was designed by KiruKasai/i);
    assert.match(text, /Scraggy, designed by Cheshire/i);
    assert.match(text, /Aegislash, designed by fghop/i);
    assert.match(text, /Shiny Ditto.*500 points/i);
    assert.match(text, /Physical, Special, and Affliction/i);
    assert.match(text, /one more community character release tomorrow/i);
    assert.match(text, /continue the focus on adding and improving battle animations/i);
    assert.match(text, /confirmed Physical attacks.*directional punch impacts/i);
    assert.match(text, /Aegislash, Ditto, and Scraggy or Scrafty.*character-specific/i);
    assert.match(text, /three individually synchronized ball shakes/i);
    assert.match(text, /successful catch flashes the ball white.*stars inward/i);
    assert.match(text, /failed catch knocks the ball away.*fades it out/i);
    assert.match(text, /failed ball capture.*invulnerable for only 1 turn/i);

    const documents = new Map();
    const getFilterKey = (filter) => {
        if (filter?.key) return filter.key;
        if (filter?.title) return filter.title;
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
            pokemon: [{ characterId: 'aegislash' }, { characterId: 'dragonite' }],
        },
    });

    assert.deepEqual(await syncPokemonDittoRelease(db), { migrated: true, newsSynced: true });
    documents.set('app_state:latest_character_releases', {
        key: 'latest_character_releases',
        releasesByArena: {
            comic: [{ characterId: 'the-hulk' }],
            pokemon: [
                { characterId: 'dragonite' },
                { characterId: 'mewtwo' },
                { characterId: 'mew' },
            ],
        },
    });
    assert.deepEqual(await syncPokemonDittoRelease(db), { migrated: false, newsSynced: true });
    assert.deepEqual(
        buildLatestReleasesState(documents.get('app_state:latest_character_releases'))
            .releasesByArena.comic,
        [{ characterId: 'the-hulk' }]
    );
    assert.deepEqual(
        documents.get('app_state:latest_character_releases').releasesByArena.pokemon,
        [
            { characterId: 'aegislash' },
            { characterId: 'ditto' },
            { characterId: 'scraggy' },
        ]
    );
    assert.deepEqual(
        documents.get('app_state:latest_character_releases').value.releasesByArena.pokemon,
        [
            { characterId: 'aegislash' },
            { characterId: 'ditto' },
            { characterId: 'scraggy' },
        ]
    );
});

test('Ditto copied-skin metadata is rendered through the ingame recovery path', () => {
    const source = fs.readFileSync(path.join(root, 'scripts', 'script.js'), 'utf8');
    const ingame = fs.readFileSync(path.join(root, 'ingame.html'), 'utf8');
    assert.match(source, /getEffectiveSkinOverrideIdFromUnit/);
    assert.match(source, /buildCharacterWithSkinId/);
    assert.match(source, /effectiveStatusIds/);
    assert.doesNotMatch(
        characters[dittoIndex].skills.find((skill) => skill.id === 'ditto-passive-transform').description,
        /one fewer Random/i
    );
    assert.match(ingame, /ditto-copy-ui-v1/);
});
