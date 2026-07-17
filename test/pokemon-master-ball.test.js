const assert = require('node:assert/strict');
const test = require('node:test');

const characters = require('../characters');
const { buildInitialBoard, resolveEffectiveSkill, resolvePendingTurnSkills } = require('../battleLogic');

test('Master Ball copies the skills of a newly released Pokemon', () => {
    const trainerIndex = characters.findIndex((character) => character.id === 'pokemon-trainer');
    const mewtwoIndex = characters.findIndex((character) => character.id === 'mewtwo');
    const masterBallIndex = characters[trainerIndex].skills.findIndex(
        (skill) => skill.id === 'pokemon-trainer-master-ball'
    );
    const players = [
        { username: 'Trainer', team: [trainerIndex] },
        { username: 'Opponent', team: [mewtwoIndex] },
    ];
    const board = buildInitialBoard(players, characters);
    const match = {
        players,
        board,
        chakraPools: {
            Trainer: { taijutsu: 0, ninjutsu: 1, genjutsu: 1, bloodline: 1 },
            Opponent: { taijutsu: 0, ninjutsu: 0, genjutsu: 0, bloodline: 0 },
        },
        pendingTurns: {
            Trainer: {
                queueOrder: ['0'],
                queuedByActorSlot: {
                    0: {
                        skillIndex: masterBallIndex,
                        targetSelection: [{ username: 'Opponent', slot: 0 }],
                    },
                },
            },
        },
        pendingActions: [],
        pendingQueuedEffects: [],
        economy: { turnCounts: { Trainer: 1, Opponent: 1 } },
    };

    resolvePendingTurnSkills({ match, actingUsername: 'Trainer', characters });

    const captureForm = board.Trainer[0].state.statuses.find(
        (status) => status.id === 'pokemon_trainer_capture_form'
    );
    assert.equal(captureForm?.metadata?.effectiveCharacterId, 'mewtwo');
    assert.equal(
        resolveEffectiveSkill({
            characters,
            rosterIndex: trainerIndex,
            skillIndex: 0,
            actorState: board.Trainer[0].state,
        })?.id,
        'mewtwo-psychic'
    );
});
