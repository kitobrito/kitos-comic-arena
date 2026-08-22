const assert = require('node:assert/strict');
const test = require('node:test');

const characters = require('../characters');

// Every "gradual stat -> evolve" Pokemon (Zubat, Squirtle, Pidgey, Charmander, ...) works the
// same way: a hidden tracker status accumulates a stat (HP stolen, damage dealt, etc.) via
// `onSuccessfulDamageApplyStatusToOwner` / `onOwnerUseSkillApplyStatusToSourceOwner` /
// `onCleanseApplyStatusToOwner` re-applying itself on the pre-evolution skill, and once the
// tracked stat crosses `applyStatusAtStack.value`, the real evolution status is applied
// (optionally removing the tracker via `removeStatusIdsOnApply`).
//
// The bug this guards against: an *evolved* form's own skill (one of the values in
// `skillReplacements`) copy-pasted from its pre-evolution counterpart and kept the trigger
// that re-applies the tracker. Since the Pokemon has already evolved, that trigger has
// nothing left to do except re-create the tracker and eventually cross the threshold again --
// which re-applies the evolution status and replays the evolution animation on an already-
// evolved Pokemon (reported live: evolving Zubat into Golbat, then using Golbat's own Leech
// Life on a later turn, replayed the evolution cinematic).
const findEvolutionTrackerConfigs = (character) => {
    const configs = [];
    const visit = (node) => {
        if (!node || typeof node !== 'object') return;
        // applyStatusAtStack lives on the tracker status's *metadata*, not the status
        // object itself (e.g. { statusId: "zubat_evolution_tracker", metadata: {
        // applyStatusAtStack: { statusId: "zubat_golbat_evolution", metadata: {
        // skillReplacements: {...} } } } }).
        const applyStatusAtStack = node.metadata?.applyStatusAtStack;
        if (
            applyStatusAtStack &&
            typeof applyStatusAtStack === 'object' &&
            typeof node.statusId === 'string' &&
            applyStatusAtStack.metadata?.skillReplacements &&
            typeof applyStatusAtStack.metadata.skillReplacements === 'object'
        ) {
            configs.push({
                trackerStatusId: node.statusId,
                skillReplacements: applyStatusAtStack.metadata.skillReplacements,
            });
        }
        Object.values(node).forEach((value) => {
            if (Array.isArray(value)) value.forEach(visit);
            else if (value && typeof value === 'object') visit(value);
        });
    };
    visit(character);
    return configs;
};

const findSkillById = (character, skillId) => {
    let found = null;
    const visit = (node) => {
        if (found || !node || typeof node !== 'object') return;
        if (node.id === skillId && Array.isArray(node.effects)) {
            found = node;
            return;
        }
        Object.values(node).forEach((value) => {
            if (found) return;
            if (Array.isArray(value)) value.forEach(visit);
            else if (value && typeof value === 'object') visit(value);
        });
    };
    visit(character);
    return found;
};

// Only flags the tracker's statusId when it's the *target* of an apply-status trigger key
// (onSuccessfulDamageApplyStatusToOwner, onOwnerUseSkillApplyStatusToSourceOwner,
// turnStartApplyStatusToSourceOwner, onCleanseApplyStatusToOwner, etc. -- anything ending in
// "ApplyStatusToOwner" or "ApplyStatusToSourceOwner"). Reading the tracker for a scaling bonus
// (chancePerStatusMetadata, randomCostReductionPerStatusMetadata) or cleaning it up
// (removeStatusIdsOnApply) are both legitimate post-evolution uses, not the bug.
const APPLY_STATUS_TRIGGER_KEY = /ApplyStatusTo(Owner|SourceOwner)$/;

const reAppliesTracker = (node, trackerStatusId) => {
    if (!node || typeof node !== 'object') return false;
    for (const [key, value] of Object.entries(node)) {
        if (!value || typeof value !== 'object') continue;
        if (APPLY_STATUS_TRIGGER_KEY.test(key) && value.statusId === trackerStatusId) {
            return true;
        }
        if (Array.isArray(value)) {
            if (value.some((entry) => reAppliesTracker(entry, trackerStatusId))) return true;
        } else if (reAppliesTracker(value, trackerStatusId)) {
            return true;
        }
    }
    return false;
};

test('no evolved-form skill re-applies its own species\' pre-evolution tracker status', () => {
    const violations = [];
    characters.forEach((character) => {
        findEvolutionTrackerConfigs(character).forEach(({ trackerStatusId, skillReplacements }) => {
            Object.values(skillReplacements).forEach((evolvedSkillId) => {
                const evolvedSkill = findSkillById(character, evolvedSkillId);
                if (!evolvedSkill) return; // covered by other content tests; not this one's concern
                if (reAppliesTracker(evolvedSkill.effects, trackerStatusId)) {
                    violations.push(`${character.id}: "${evolvedSkillId}" still re-applies "${trackerStatusId}"`);
                }
            });
        });
    });
    assert.deepEqual(violations, []);
});
