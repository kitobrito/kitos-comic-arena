const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const characters = require('../characters');
const {
    buildInitialBoard,
    processTurnStartStatusEffects,
    resolvePendingTurnSkills,
} = require('../battleLogic');
const { sanitizeBoardForViewer } = require('../server');

const root = path.resolve(__dirname, '..');
const aegislashIndex = characters.findIndex((character) => character?.id === 'aegislash');
const koffingIndex = characters.findIndex((character) => character?.id === 'koffing');
const scraggyIndex = characters.findIndex((character) => character?.id === 'scraggy');
const pokemonTrainer = characters.find((character) => character?.id === 'pokemon-trainer');

const makeMatch = (teams) => {
    const players = Object.entries(teams).map(([username, team]) => ({ username, team }));
    return {
        players,
        board: buildInitialBoard(players, characters),
        pendingTurns: {},
        economy: {
            turnCounts: Object.fromEntries(players.map(({ username }) => [username, 1])),
        },
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

test('successful resolved damage emits client animation metadata with class and piercing details', () => {
    const match = makeMatch({ ash: [aegislashIndex], gary: [koffingIndex] });
    queueSkill(match, 'ash', 0, 'gary');
    resolvePendingTurnSkills({ match, actingUsername: 'ash', characters });

    const event = match.board.gary[0].state.lastCombatEvent;
    assert.equal(event.type, 'damage');
    assert.equal(event.sourceUsername, 'ash');
    assert.equal(event.sourceSlot, 0);
    assert.equal(event.sourceSkillId, 'aegislash-slash');
    assert.ok(event.skillClasses.includes('physical'));
    assert.equal(event.piercing, true);
    assert.ok(event.amount > 0);
    assert.ok(event.sequence > 0);
});

test('ignored damage and missed Hi Jump Kick do not emit successful target impact events', () => {
    const blocked = makeMatch({ ash: [aegislashIndex], gary: [koffingIndex] });
    blocked.board.gary[0].state.statuses.push({
        id: 'test_invulnerable',
        remainingTurns: 1,
        metadata: { invulnerable: true },
    });
    queueSkill(blocked, 'ash', 0, 'gary');
    resolvePendingTurnSkills({ match: blocked, actingUsername: 'ash', characters });
    assert.equal(blocked.board.gary[0].state.lastCombatEvent, undefined);

    const missed = makeMatch({ ash: [scraggyIndex], gary: [koffingIndex] });
    const originalRandom = Math.random;
    Math.random = () => 0.99;
    try {
        queueSkill(missed, 'ash', 2, 'gary');
        resolvePendingTurnSkills({ match: missed, actingUsername: 'ash', characters });
    } finally {
        Math.random = originalRandom;
    }
    assert.equal(missed.board.gary[0].state.lastCombatEvent, undefined);
    assert.equal(
        missed.board.gary[0].state.statuses.some(
            (status) =>
                status.id === 'skill_missed_notification' &&
                status.sourceSkillId === 'scraggy-hi-jump-kick'
        ),
        true
    );
});

test('viewer-safe board state preserves confirmed combat and status animation sources', () => {
    const board = {
        ash: [
            {
                slot: 0,
                rosterIndex: aegislashIndex,
                alive: true,
                hp: 80,
                state: {
                    lastCombatEvent: {
                        sequence: 4,
                        type: 'damage',
                        amount: 20,
                        sourceUsername: 'gary',
                        sourceSlot: 0,
                        sourceCharacterId: 'koffing',
                        sourceSkillId: 'koffing-smog',
                        skillClasses: ['special', 'affliction'],
                        affliction: true,
                        piercing: false,
                        fixed: false,
                    },
                    statuses: [
                        {
                            id: 'test_stun',
                            remainingTurns: 1,
                            sourceSkillId: 'scraggy-leer',
                            sourceUsername: 'gary',
                            sourceSlot: 0,
                            metadata: {
                                cannotUseSkillClasses: ['Physical'],
                                invulnerableToSkillClasses: ['Special'],
                                scraggyFocusEnergyStacks: 2,
                            },
                        },
                    ],
                },
            },
        ],
    };

    const safe = sanitizeBoardForViewer(board, 'ash');
    assert.deepEqual(safe.ash[0].state.lastCombatEvent.skillClasses, ['special', 'affliction']);
    assert.equal(safe.ash[0].state.lastCombatEvent.sourceUsername, 'gary');
    assert.equal(safe.ash[0].state.statuses[0].sourceUsername, 'gary');
    assert.equal(safe.ash[0].state.statuses[0].sourceSlot, 0);
    assert.deepEqual(
        safe.ash[0].state.statuses[0].metadata.invulnerableToSkillClasses,
        ['Special']
    );
    assert.equal(safe.ash[0].state.statuses[0].metadata.scraggyFocusEnergyStacks, 2);
});

test('community animation batch is wired to confirmed events, settings, mobile, and reduced motion', () => {
    const script = fs.readFileSync(path.join(root, 'scripts', 'script.js'), 'utf8');
    const css = fs.readFileSync(path.join(root, 'styles', 'style.css'), 'utf8');
    const ingame = fs.readFileSync(path.join(root, 'ingame.html'), 'utf8');

    [
        'showConfirmedCombatEventFx',
        'showConfirmedStatusChangeFx',
        'community-aegislash-stance-change',
        'community-ditto-transform-confirmed',
        'community-scraggy-kick-recoil',
        'community-scraggy-focus-meter',
    ].forEach((marker) => assert.match(script, new RegExp(marker)));

    [
        '.confirmed-combat-travel.physical',
        '.confirmed-combat-travel.special',
        '.confirmed-combat-impact.piercing',
        '.confirmed-status-flash.invulnerable',
        '.confirmed-status-flash.stun',
        'body.ui-disable-skill-cast-animations .confirmed-combat-travel',
        '@media (max-width: 680px)',
        '@media (prefers-reduced-motion: reduce)',
    ].forEach((marker) => assert.ok(css.includes(marker), marker));

    assert.match(ingame, /community-animation-pass-v1/);
});

test('Pokemon Trainer capture visuals use supplied balls and audio-clock shake cues', () => {
    const script = fs.readFileSync(path.join(root, 'scripts', 'script.js'), 'utf8');
    const css = fs.readFileSync(path.join(root, 'styles', 'style.css'), 'utf8');
    const ingame = fs.readFileSync(path.join(root, 'ingame.html'), 'utf8');

    [
        'capture-animation/pokeball.webp',
        'capture-animation/great-ball.webp',
        'capture-animation/ultra-ball.webp',
        'capture-animation/master-ball.webp',
        'capture-failed.mp3',
        'capture-success.mp3',
        'shakeCues: [1.13, 2.59, 4.0]',
        'shakeCues: [1.94, 2.78, 3.7]',
        'hasAudioClock',
        'audio.currentTime',
        'captureSucceeded',
        'getPokemonTrainerBallCardKey',
        'soundManager.duckMusic',
    ].forEach((marker) => assert.ok(script.includes(marker), marker));
    assert.doesNotMatch(
        script,
        /if \(!entry \|\| entry\.completed\) \{\s*entry = \{\s*actorCard/
    );

    [
        '.pokemon-trainer-capture-ball.capture-success',
        'pokemon-capture-white-to-original',
        'pokemon-capture-star-inward',
        'pokemon-capture-failed-knock-away',
        '--capture-fail-dx',
    ].forEach((marker) => assert.ok(css.includes(marker), marker));

    [
        'pokeball.webp',
        'great-ball.webp',
        'ultra-ball.webp',
        'master-ball.webp',
    ].forEach((fileName) => {
        assert.ok(
            fs.existsSync(
                path.join(
                    root,
                    'assets',
                    'images',
                    'PokemonArena',
                    'pokemontrainer',
                    'capture-animation',
                    fileName
                )
            ),
            fileName
        );
    });
    ['capture-failed.mp3', 'capture-success.mp3'].forEach((fileName) => {
        assert.ok(
            fs.existsSync(
                path.join(root, 'assets', 'audio', 'sounds', 'pokemontrainer', fileName)
            ),
            fileName
        );
    });
    assert.match(ingame, /pokemon-trainer-capture-audio-v4/);
});

test('Bulbasaur Leech Seed deals one fixed 10 damage tick to Mewtwo per turn count', () => {
    const bulbasaurIndex = characters.findIndex((character) => character?.id === 'bulbasaur');
    const mewtwoIndex = characters.findIndex((character) => character?.id === 'mewtwo');
    const match = makeMatch({ ash: [bulbasaurIndex], gary: [mewtwoIndex] });
    queueSkill(match, 'ash', 0, 'gary');
    resolvePendingTurnSkills({ match, actingUsername: 'ash', characters });

    processTurnStartStatusEffects({ match, startingUsername: 'gary' });
    assert.equal(match.board.gary[0].hp, 90);

    processTurnStartStatusEffects({ match, startingUsername: 'gary' });
    assert.equal(match.board.gary[0].hp, 90);
});

test('failed Great Ball and Ultra Ball captures only control their target for one turn', () => {
    assert.ok(pokemonTrainer);
    ['pokemon-trainer-great-ball', 'pokemon-trainer-ultra-ball'].forEach((skillId) => {
        const skill = pokemonTrainer.skills.find((entry) => entry.id === skillId);
        assert.ok(skill, skillId);
        const failedCaptureStatuses = skill.effects.filter(
            (effect) =>
                effect.type === 'apply_status' &&
                (
                    effect.statusId === 'stunned' ||
                    String(effect.statusId || '').endsWith('_lock')
                )
        );
        assert.equal(failedCaptureStatuses.length, 2, skillId);
        failedCaptureStatuses.forEach((effect) => assert.equal(effect.duration, 1, skillId));
        assert.match(skill.skilldescription, /for 1 turn\./);
    });
});
