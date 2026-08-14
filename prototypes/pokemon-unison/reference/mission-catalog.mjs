// Mission data mirrors production's DEFAULT_MISSION_CATALOG field names
// (server.js) verbatim for the arena:'pokemon' entries whose reward_character
// is already ported into ROSTER. See MISSION_PORT.md for the full mapping
// from production missionIds to the entries kept, adapted, or skipped here.

const TRACKABLE_GOAL_TYPES = new Set([
    'win_matches',
    'win_ladder_matches',
    'win_streak',
    'win_streak_same_team',
    'win_matches_same_team',
]);

// Characters selectable without any account/unlock check. Two groups:
//
// 1. Confirmed free in production — these 12 never appear as a
//    reward_character on any Pokemon-arena mission (verified by direct
//    research against server.js): pokemon-trainer, charmander, squirtle,
//    bulbasaur, butterfree, koffing, zubat, chansey, pidgey, abra, meowth,
//    nincada.
// 2. Temporarily free here, pending an unbuilt unlock path — production
//    gates these 8 through mechanics this prototype hasn't built yet
//    (the direct-pick starter/evolution-choice endpoints, or an unresearched
//    release mission): eevee, jolteon, flareon, vaporeon (Eevee's evolution
//    choice), cyndaquil, chikorita, totodile (the Johto starter choice), and
//    primeape (the only mission found for it grants a cosmetic skin, not the
//    character itself — its real unlock path wasn't found in research).
//    Leaving these locked with no way to ever unlock them would be a worse
//    regression than leaving them free; when their real unlock mechanic is
//    ported, move them out of this list.
//
// Every other ROSTER character (34 total) is gated: 26 by a real, working
// mission in MISSION_CATALOG below, and the remaining 8 above by nothing yet.
export const ALWAYS_UNLOCKED_CHARACTER_IDS = [
    'pokemon-trainer', 'charmander', 'squirtle', 'bulbasaur', 'butterfree', 'koffing',
    'zubat', 'chansey', 'pidgey', 'abra', 'meowth', 'nincada',
    'eevee', 'jolteon', 'flareon', 'vaporeon', 'cyndaquil', 'chikorita', 'totodile', 'primeape',
];

// Rank-tier unlock-point pricing, ported verbatim from getMissionUnlockPointCostForRank
// (server.js:199-205). Used by the future store phase (purchasing a mission-locked
// character outright) as the fallback when a mission has no explicit unlock_point_cost.
export function getMissionUnlockPointCostForRank(missionRank) {
    const rank = Math.max(1, Math.floor(Number(missionRank) || 1));
    if (rank <= 6) return 150;
    if (rank <= 12) return 250;
    if (rank <= 17) return 350;
    return 450;
}

export function resolveMissionUnlockPointCost(mission = {}) {
    const explicitCost = Number(mission.unlock_point_cost);
    if (Number.isFinite(explicitCost) && explicitCost > 0) {
        return Math.max(150, Math.min(600, Math.floor(explicitCost)));
    }
    return getMissionUnlockPointCostForRank(mission.level_requirement ?? mission.rank ?? 1);
}

// The 26 characters gated below are enforced at team selection
// (validateTeamOwnership, and reference/server.mjs's use of it) whenever a
// match is created by a signed-in account — see ALWAYS_UNLOCKED_CHARACTER_IDS
// above for the 20 that are exempt (12 confirmed free in production, 8
// temporarily free pending an unbuilt unlock mechanic).
//
// Deliberately NOT ported in this pass (documented, not silently dropped):
// - pikachu-starter-path: ported below as a normal goal-based mission (win 10 with
//   Pidgey) since the direct-pick starter endpoint itself isn't built yet.
// - eevee-evolution-path, gen2-starter-choice: both resolve to a *choice* between
//   multiple reward characters via a dedicated pick endpoint, not a single
//   reward_character grant. Needs that endpoint before it can be ported faithfully.
// - cyndaquil-evolve-{quilava,typhlosion}, chikorita-evolve-{bayleaf,meganium},
//   totodile-evolve-{croconaw,feraligatr}: gated on starter_character_id (which
//   Johto starter the player chose) via the same missing pick endpoint, plus grant
//   a reward_skin_id rather than a character (skins don't exist here until Phase 3).
// - primeape-annihilape-week: a real-time-windowed event mission granting a
//   reward_skin_id, not a character; needs both Phase 3 (skins) and event-window
//   plumbing production has no standalone equivalent for yet.
// - pokemon-wave-2-dragonite's team-mate requirement is 'gyarados' in production,
//   which isn't a standalone ROSTER id here (Magikarp evolves in place under the
//   'magikarp' id, mirroring how machop/machoke share 'machop'). Remapped to
//   'magikarp' below.
export const MISSION_CATALOG = [
    {
        missionId: 'scyther-trial',
        title: 'The Scyther Trial',
        level_requirement: 6,
        rank: '6',
        reward_character: 'scyther',
        reward_character_name: 'Scyther',
        reward: 'Unlock Scyther.',
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        requirements: [
            'This trial is still a milestone, but it is a much lighter climb than the original version.',
            'Clear a 3-win streak with Zubat and Gastly on the same team.',
        ],
        goals: [
            { type: 'win_matches', character_id: 'chansey', character_name: 'Chansey', wins: 4 },
            { type: 'win_matches', character_id: 'pidgey', character_name: 'Pidgey', wins: 4 },
            { type: 'win_matches', character_id: 'koffing', character_name: 'Koffing', wins: 4 },
            { type: 'win_streak_same_team', character_ids: ['zubat', 'gastly'], character_names: ['Zubat', 'Gastly'], wins: 3 },
        ],
        sortOrder: 5,
    },
    {
        missionId: 'gastly-haunted-tower',
        title: 'The Haunted Tower',
        level_requirement: 6,
        rank: '6',
        reward_character: 'gastly',
        reward_character_name: 'Gastly',
        reward: 'Unlock Gastly.',
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        requirements: [
            'A grindy early Pokemon mission that asks for patience before it pays out.',
            'Clear a 4-win streak with Zubat and Abra on the same team.',
        ],
        goals: [
            { type: 'win_matches', character_id: 'chansey', character_name: 'Chansey', wins: 8 },
            { type: 'win_matches', character_id: 'koffing', character_name: 'Koffing', wins: 8 },
            { type: 'win_streak_same_team', character_ids: ['zubat', 'abra'], character_names: ['Zubat', 'Abra'], wins: 4 },
        ],
        sortOrder: 6,
    },
    {
        missionId: 'krabby-tide-trial',
        title: 'Krabby Tide Trial',
        level_requirement: 7,
        rank: '7',
        reward_character: 'krabby',
        reward_character_name: 'Krabby',
        reward: 'Unlock Krabby.',
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        requirements: [
            'Krabby unlocks through a mid-ladder bruiser mission built around defense and physical pressure.',
            'Clear a 4-win streak with Squirtle and Scyther on the same team.',
        ],
        goals: [
            { type: 'win_matches', character_id: 'squirtle', character_name: 'Squirtle', wins: 8 },
            { type: 'win_matches', character_id: 'scyther', character_name: 'Scyther', wins: 8 },
            { type: 'win_streak_same_team', character_ids: ['squirtle', 'scyther'], character_names: ['Squirtle', 'Scyther'], wins: 4 },
        ],
        sortOrder: 7,
    },
    {
        missionId: 'ekans-venom-trial',
        title: 'Ekans Venom Trial',
        level_requirement: 8,
        rank: '8',
        reward_character: 'ekans',
        reward_character_name: 'Ekans',
        reward: 'Unlock Ekans.',
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        requirements: [
            'Ekans unlocks through a poison-pressure mission built around attrition and setup.',
            'Clear a 4-win streak with Koffing and Zubat on the same team.',
        ],
        goals: [
            { type: 'win_matches', character_id: 'koffing', character_name: 'Koffing', wins: 8 },
            { type: 'win_matches', character_id: 'zubat', character_name: 'Zubat', wins: 8 },
            { type: 'win_streak_same_team', character_ids: ['koffing', 'zubat'], character_names: ['Koffing', 'Zubat'], wins: 4 },
        ],
        sortOrder: 8,
    },
    {
        missionId: 'machop-power-run',
        title: 'Machop Power Run',
        level_requirement: 8,
        rank: '8',
        reward_character: 'machop',
        reward_character_name: 'Machop',
        reward: 'Unlock Machop.',
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        requirements: [
            'Machop unlocks through a bruiser mission centered on direct physical pressure.',
            'Clear a 4-win streak with Charmander and Scyther on the same team.',
        ],
        goals: [
            { type: 'win_matches', character_id: 'charmander', character_name: 'Charmander', wins: 8 },
            { type: 'win_matches', character_id: 'scyther', character_name: 'Scyther', wins: 8 },
            { type: 'win_streak_same_team', character_ids: ['charmander', 'scyther'], character_names: ['Charmander', 'Scyther'], wins: 4 },
        ],
        sortOrder: 9,
    },
    {
        missionId: 'magikarp-long-climb',
        title: 'Magikarp Long Climb',
        level_requirement: 9,
        rank: '9',
        reward_character: 'magikarp',
        reward_character_name: 'Magikarp',
        reward: 'Unlock Magikarp.',
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        requirements: [
            'Magikarp unlocks through a patience test built around water-team endurance.',
            'Clear a 4-win streak with Squirtle and Krabby on the same team.',
        ],
        goals: [
            { type: 'win_matches', character_id: 'squirtle', character_name: 'Squirtle', wins: 8 },
            { type: 'win_matches', character_id: 'krabby', character_name: 'Krabby', wins: 8 },
            { type: 'win_streak_same_team', character_ids: ['squirtle', 'krabby'], character_names: ['Squirtle', 'Krabby'], wins: 4 },
        ],
        sortOrder: 10,
    },
    {
        missionId: 'mr-mime-stage-trial',
        title: 'Mr. Mime Stage Trial',
        level_requirement: 10,
        rank: '10',
        reward_character: 'mr-mime',
        reward_character_name: 'Mr. Mime',
        reward: 'Unlock Mr. Mime.',
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        requirements: [
            'Mr. Mime unlocks through a control-and-support trial built around clean team play.',
            'Clear a 4-win streak with Abra and Chansey on the same team.',
        ],
        goals: [
            { type: 'win_matches', character_id: 'abra', character_name: 'Abra', wins: 8 },
            { type: 'win_matches', character_id: 'chansey', character_name: 'Chansey', wins: 8 },
            { type: 'win_streak_same_team', character_ids: ['abra', 'chansey'], character_names: ['Abra', 'Chansey'], wins: 4 },
        ],
        sortOrder: 11,
    },
    {
        missionId: 'hitmonchan-power-grid',
        title: 'Hitmonchan Power Grid',
        level_requirement: 11,
        rank: '11',
        reward_character: 'hitmonchan',
        reward_character_name: 'Hitmonchan',
        reward: 'Unlock Hitmonchan.',
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        requirements: [
            'Hitmonchan unlocks through a tempo-and-combo mission built around pressure and precision.',
            'Clear a 4-win streak with Machop and Pikachu on the same team.',
        ],
        goals: [
            { type: 'win_matches', character_id: 'machop', character_name: 'Machop', wins: 10 },
            { type: 'win_matches', character_id: 'pikachu', character_name: 'Pikachu', wins: 10 },
            { type: 'win_streak_same_team', character_ids: ['machop', 'pikachu'], character_names: ['Machop', 'Pikachu'], wins: 4 },
        ],
        sortOrder: 12,
    },
    {
        missionId: 'hitmonlee-kick-circuit',
        title: 'Hitmonlee Kick Circuit',
        level_requirement: 12,
        rank: '12',
        reward_character: 'hitmonlee',
        reward_character_name: 'Hitmonlee',
        reward: 'Unlock Hitmonlee.',
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        requirements: [
            'Hitmonlee unlocks through a pressure mission built around physical momentum and clean finishers.',
            'Clear a 4-win streak with Machop and Scyther on the same team.',
        ],
        goals: [
            { type: 'win_matches', character_id: 'machop', character_name: 'Machop', wins: 10 },
            { type: 'win_matches', character_id: 'scyther', character_name: 'Scyther', wins: 10 },
            { type: 'win_streak_same_team', character_ids: ['machop', 'scyther'], character_names: ['Machop', 'Scyther'], wins: 4 },
        ],
        sortOrder: 13,
    },
    {
        missionId: 'magnemite-magnet-rise',
        title: 'Magnemite Magnet Rise',
        level_requirement: 12,
        rank: '12',
        reward_character: 'magnemite',
        reward_character_name: 'Magnemite',
        reward: 'Unlock Magnemite.',
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        requirements: [
            'Magnemite unlocks through a control mission built around electric pressure and clean setup.',
            'Clear a 4-win streak with Pikachu and Abra on the same team.',
        ],
        goals: [
            { type: 'win_matches', character_id: 'pikachu', character_name: 'Pikachu', wins: 10 },
            { type: 'win_matches', character_id: 'abra', character_name: 'Abra', wins: 10 },
            { type: 'win_streak_same_team', character_ids: ['pikachu', 'abra'], character_names: ['Pikachu', 'Abra'], wins: 4 },
        ],
        sortOrder: 14,
    },
    {
        missionId: 'aerodactyl-fossil-flight',
        title: 'Aerodactyl Fossil Flight',
        level_requirement: 13,
        rank: '13',
        reward_character: 'aerodactyl',
        reward_character_name: 'Aerodactyl',
        reward: 'Unlock Aerodactyl.',
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        requirements: [
            'Aerodactyl unlocks through a high-speed fossil trial built around recoil and fast finishes.',
            'Clear a 4-win streak with Scyther and Hitmonlee on the same team.',
        ],
        goals: [
            { type: 'win_matches', character_id: 'scyther', character_name: 'Scyther', wins: 10 },
            { type: 'win_matches', character_id: 'hitmonlee', character_name: 'Hitmonlee', wins: 10 },
            { type: 'win_streak_same_team', character_ids: ['scyther', 'hitmonlee'], character_names: ['Scyther', 'Hitmonlee'], wins: 4 },
        ],
        sortOrder: 15,
    },
    {
        missionId: 'onix-stonewall-trial',
        title: 'Onix Stonewall Trial',
        level_requirement: 13,
        rank: '13',
        reward_character: 'onix',
        reward_character_name: 'Onix',
        reward: 'Unlock Onix.',
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        requirements: [
            'Onix unlocks through a tank-focused trial built around bulk, tempo, and clean frontline play.',
            'Clear a 4-win streak with Squirtle and Machop on the same team.',
        ],
        goals: [
            { type: 'win_matches', character_id: 'squirtle', character_name: 'Squirtle', wins: 10 },
            { type: 'win_matches', character_id: 'machop', character_name: 'Machop', wins: 10 },
            { type: 'win_streak_same_team', character_ids: ['squirtle', 'machop'], character_names: ['Squirtle', 'Machop'], wins: 4 },
        ],
        sortOrder: 16,
    },
    {
        missionId: 'aegislash-kings-shield-trial',
        title: "Aegislash King's Shield Trial",
        level_requirement: 13,
        rank: '13',
        reward_character: 'aegislash',
        reward_character_name: 'Aegislash',
        reward: 'Unlock Aegislash.',
        unlock_point_cost: 300,
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        requirements: [
            'Prove your command of Ghost and Steel tactics with Gastly and Magnemite.',
            'Win 8 Quick or Ladder matches with Gastly and Magnemite on the same team.',
            'Win 4 Quick or Ladder matches in a row with Gastly and Magnemite on the same team.',
            'Bot and human opponents both count.',
        ],
        goals: [
            { type: 'win_matches_same_team', character_ids: ['gastly', 'magnemite'], character_names: ['Gastly', 'Magnemite'], wins: 8 },
            { type: 'win_streak_same_team', character_ids: ['gastly', 'magnemite'], character_names: ['Gastly', 'Magnemite'], wins: 4 },
        ],
        sortOrder: 230,
    },
    {
        missionId: 'ditto-perfect-copy-trial',
        title: 'Ditto Perfect Copy Trial',
        level_requirement: 13,
        rank: '13',
        reward_character: 'ditto',
        reward_character_name: 'Ditto',
        reward: 'Unlock Ditto.',
        unlock_point_cost: 300,
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        requirements: [
            'Master adaptability with Eevee and Pokemon Trainer.',
            'Win 8 Quick or Ladder matches with Eevee and Pokemon Trainer on the same team.',
            'Win 4 Quick or Ladder matches in a row with Eevee and Pokemon Trainer on the same team.',
            'Bot and human opponents both count.',
        ],
        goals: [
            { type: 'win_matches_same_team', character_ids: ['eevee', 'pokemon-trainer'], character_names: ['Eevee', 'Pokemon Trainer'], wins: 8 },
            { type: 'win_streak_same_team', character_ids: ['eevee', 'pokemon-trainer'], character_names: ['Eevee', 'Pokemon Trainer'], wins: 4 },
        ],
        sortOrder: 231,
    },
    {
        missionId: 'scraggy-focus-energy-trial',
        title: 'Scraggy Focus Energy Trial',
        level_requirement: 13,
        rank: '13',
        reward_character: 'scraggy',
        reward_character_name: 'Scraggy',
        reward: 'Unlock Scraggy.',
        unlock_point_cost: 300,
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        requirements: [
            'Train precision and poison pressure with Hitmonlee and Koffing.',
            'Win 8 Quick or Ladder matches with Hitmonlee and Koffing on the same team.',
            'Win 4 Quick or Ladder matches in a row with Hitmonlee and Koffing on the same team.',
            'Bot and human opponents both count.',
        ],
        goals: [
            { type: 'win_matches_same_team', character_ids: ['hitmonlee', 'koffing'], character_names: ['Hitmonlee', 'Koffing'], wins: 8 },
            { type: 'win_streak_same_team', character_ids: ['hitmonlee', 'koffing'], character_names: ['Hitmonlee', 'Koffing'], wins: 4 },
        ],
        sortOrder: 232,
    },
    {
        missionId: 'dragapult-dragon-darts-trial',
        title: 'Dragapult Dragon Darts Trial',
        level_requirement: 14,
        rank: '14',
        reward_character: 'dragapult',
        reward_character_name: 'Dragapult',
        reward: 'Unlock Dragapult.',
        unlock_point_cost: 400,
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        requirements: [
            'Master Dragon and Ghost pressure with Dragonite and Gastly.',
            'Win 8 Quick or Ladder matches with Dragonite and Gastly on the same team.',
            'Win 4 Quick or Ladder matches in a row with Dragonite and Gastly on the same team.',
            'Bot and human opponents both count.',
        ],
        goals: [
            { type: 'win_matches_same_team', character_ids: ['dragonite', 'gastly'], character_names: ['Dragonite', 'Gastly'], wins: 8 },
            { type: 'win_streak_same_team', character_ids: ['dragonite', 'gastly'], character_names: ['Dragonite', 'Gastly'], wins: 4 },
        ],
        sortOrder: 233,
    },
    {
        missionId: 'pikachu-starter-path',
        title: 'Pikachu Starter Path',
        level_requirement: 1,
        rank: '1',
        reward_character: 'pikachu',
        reward_character_name: 'Pikachu',
        reward: 'Unlock Pikachu.',
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        requirements: [],
        goals: [{ type: 'win_matches', character_id: 'pidgey', character_name: 'Pidgey', wins: 10 }],
        sortOrder: 3,
    },
    {
        missionId: 'pokemon-wave-2-clefairy',
        title: 'Moon Stone Melody',
        level_requirement: 3,
        rank: '3',
        reward_character: 'clefairy',
        reward_character_name: 'Clefairy',
        reward: 'Unlock Clefairy.',
        unlock_point_cost: 150,
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        requirements: [
            'Win 5 Quick or Ladder matches with chansey and mr-mime on the same team.',
            'Win 3 Quick or Ladder matches in a row with chansey and mr-mime on the same team.',
            'Bot and human opponents both count.',
        ],
        // "Mr Mime" (no period) is a literal production data quirk, not a typo here —
        // goal character_names there are auto-capitalized from the hyphenated id.
        goals: [
            { type: 'win_matches_same_team', character_ids: ['chansey', 'mr-mime'], character_names: ['Chansey', 'Mr Mime'], wins: 5 },
            { type: 'win_streak_same_team', character_ids: ['chansey', 'mr-mime'], character_names: ['Chansey', 'Mr Mime'], wins: 3 },
        ],
        sortOrder: 210,
    },
    {
        missionId: 'pokemon-wave-2-jigglypuff',
        title: 'The Encore That Never Ends',
        level_requirement: 4,
        rank: '4',
        reward_character: 'jigglypuff',
        reward_character_name: 'Jigglypuff',
        reward: 'Unlock Jigglypuff.',
        unlock_point_cost: 150,
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        requirements: [
            'Win 5 Quick or Ladder matches with gastly and clefairy on the same team.',
            'Win 3 Quick or Ladder matches in a row with gastly and clefairy on the same team.',
            'Bot and human opponents both count.',
        ],
        goals: [
            { type: 'win_matches_same_team', character_ids: ['gastly', 'clefairy'], character_names: ['Gastly', 'Clefairy'], wins: 5 },
            { type: 'win_streak_same_team', character_ids: ['gastly', 'clefairy'], character_names: ['Gastly', 'Clefairy'], wins: 3 },
        ],
        sortOrder: 211,
    },
    {
        missionId: 'pokemon-wave-2-beedrill',
        title: 'Trial of the Hive',
        level_requirement: 5,
        rank: '5',
        reward_character: 'beedrill',
        reward_character_name: 'Beedrill',
        reward: 'Unlock Beedrill.',
        unlock_point_cost: 150,
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        requirements: [
            'Win 6 Quick or Ladder matches with butterfree and scyther on the same team.',
            'Win 3 Quick or Ladder matches in a row with butterfree and scyther on the same team.',
            'Bot and human opponents both count.',
        ],
        goals: [
            { type: 'win_matches_same_team', character_ids: ['butterfree', 'scyther'], character_names: ['Butterfree', 'Scyther'], wins: 6 },
            { type: 'win_streak_same_team', character_ids: ['butterfree', 'scyther'], character_names: ['Butterfree', 'Scyther'], wins: 3 },
        ],
        sortOrder: 212,
    },
    {
        missionId: 'pokemon-wave-2-articuno',
        title: 'Frozen Legendary Trial',
        level_requirement: 20,
        rank: '20',
        reward_character: 'articuno',
        reward_character_name: 'Articuno',
        reward: 'Unlock Articuno.',
        unlock_point_cost: 600,
        purchase_requires_rank: true,
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        requirements: [
            'Win 7 Quick or Ladder matches with squirtle and vaporeon on the same team.',
            'Win 6 Quick or Ladder matches in a row with squirtle and vaporeon on the same team.',
            'Bot and human opponents both count.',
        ],
        goals: [
            { type: 'win_matches_same_team', character_ids: ['squirtle', 'vaporeon'], character_names: ['Squirtle', 'Vaporeon'], wins: 7 },
            { type: 'win_streak_same_team', character_ids: ['squirtle', 'vaporeon'], character_names: ['Squirtle', 'Vaporeon'], wins: 6 },
        ],
        sortOrder: 213,
    },
    {
        missionId: 'pokemon-wave-2-moltres',
        title: 'Blazing Legendary Trial',
        level_requirement: 21,
        rank: '21',
        reward_character: 'moltres',
        reward_character_name: 'Moltres',
        reward: 'Unlock Moltres.',
        unlock_point_cost: 600,
        purchase_requires_rank: true,
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        requirements: [
            'Win 7 Quick or Ladder matches with charmander and flareon on the same team.',
            'Win 6 Quick or Ladder matches in a row with charmander and flareon on the same team.',
            'Bot and human opponents both count.',
        ],
        goals: [
            { type: 'win_matches_same_team', character_ids: ['charmander', 'flareon'], character_names: ['Charmander', 'Flareon'], wins: 7 },
            { type: 'win_streak_same_team', character_ids: ['charmander', 'flareon'], character_names: ['Charmander', 'Flareon'], wins: 6 },
        ],
        sortOrder: 214,
    },
    {
        missionId: 'pokemon-wave-2-zapdos',
        title: 'Storm Legendary Trial',
        level_requirement: 22,
        rank: '22',
        reward_character: 'zapdos',
        reward_character_name: 'Zapdos',
        reward: 'Unlock Zapdos.',
        unlock_point_cost: 600,
        purchase_requires_rank: true,
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        requirements: [
            'Win 7 Quick or Ladder matches with pikachu and jolteon on the same team.',
            'Win 6 Quick or Ladder matches in a row with pikachu and jolteon on the same team.',
            'Bot and human opponents both count.',
        ],
        goals: [
            { type: 'win_matches_same_team', character_ids: ['pikachu', 'jolteon'], character_names: ['Pikachu', 'Jolteon'], wins: 7 },
            { type: 'win_streak_same_team', character_ids: ['pikachu', 'jolteon'], character_names: ['Pikachu', 'Jolteon'], wins: 6 },
        ],
        sortOrder: 215,
    },
    {
        missionId: 'pokemon-wave-2-mew',
        title: 'A Mythical Discovery',
        level_requirement: 23,
        rank: '23',
        reward_character: 'mew',
        reward_character_name: 'Mew',
        reward: 'Unlock Mew.',
        unlock_point_cost: 600,
        purchase_requires_rank: true,
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        requirements: [
            'Win 8 Quick or Ladder matches with clefairy and jigglypuff on the same team.',
            'Win 6 Quick or Ladder matches in a row with clefairy and jigglypuff on the same team.',
            'Bot and human opponents both count.',
        ],
        goals: [
            { type: 'win_matches_same_team', character_ids: ['clefairy', 'jigglypuff'], character_names: ['Clefairy', 'Jigglypuff'], wins: 8 },
            { type: 'win_streak_same_team', character_ids: ['clefairy', 'jigglypuff'], character_names: ['Clefairy', 'Jigglypuff'], wins: 6 },
        ],
        sortOrder: 216,
    },
    {
        missionId: 'pokemon-wave-2-mewtwo',
        title: 'Genetic Power Unbound',
        level_requirement: 25,
        rank: '25',
        reward_character: 'mewtwo',
        reward_character_name: 'Mewtwo',
        reward: 'Unlock Mewtwo.',
        unlock_point_cost: 600,
        purchase_requires_rank: true,
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        requirements: [
            'Win 9 Quick or Ladder matches with mew and dragonite on the same team.',
            'Win 6 Quick or Ladder matches in a row with mew and dragonite on the same team.',
            'Bot and human opponents both count.',
        ],
        goals: [
            { type: 'win_matches_same_team', character_ids: ['mew', 'dragonite'], character_names: ['Mew', 'Dragonite'], wins: 9 },
            { type: 'win_streak_same_team', character_ids: ['mew', 'dragonite'], character_names: ['Mew', 'Dragonite'], wins: 6 },
        ],
        sortOrder: 217,
    },
    {
        missionId: 'pokemon-wave-2-dragonite',
        title: 'Dragon Mastery',
        level_requirement: 18,
        rank: '18',
        reward_character: 'dragonite',
        reward_character_name: 'Dragonite',
        reward: 'Unlock Dragonite.',
        unlock_point_cost: 450,
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        requirements: [
            'Win 8 Quick or Ladder matches with aerodactyl and magikarp on the same team.',
            'Win 6 Quick or Ladder matches in a row with aerodactyl and magikarp on the same team.',
            'Bot and human opponents both count.',
        ],
        // Production requires 'gyarados' here; remapped to 'magikarp' (see file-header note).
        goals: [
            { type: 'win_matches_same_team', character_ids: ['aerodactyl', 'magikarp'], character_names: ['Aerodactyl', 'Magikarp'], wins: 8 },
            { type: 'win_streak_same_team', character_ids: ['aerodactyl', 'magikarp'], character_names: ['Aerodactyl', 'Magikarp'], wins: 6 },
        ],
        sortOrder: 218,
    },
    {
        missionId: 'pokemon-ladder-first-25-wins',
        title: 'Road to Champion: 25 Ladder Wins',
        level_requirement: 1,
        rank: '1',
        reward_character: '',
        reward_character_name: '',
        reward: 'Earn 1,000 Pokemon Arena points.',
        reward_unlock_points: 1000,
        mode_restriction: { allowed_modes: ['ladder'] },
        requirements: [
            'Win 25 Ladder matches in Pokemon Arena.',
            'Human and battle-bot Ladder wins both count. Quick, Private, and mission battles do not.',
            'Spend points on character unlocks, skins, and additional Eevee evolutions.',
        ],
        // This prototype has no separate ladder mode yet, so mode_restriction is not
        // enforced here — any match (solo or private) counts, unlike production where
        // only real Ladder-mode wins would.
        goals: [{ type: 'win_ladder_matches', wins: 25 }],
        sortOrder: 1,
    },
    // Johto starter evolution missions. Unlike production, this prototype has
    // no starter-choice pick endpoint and doesn't need one: all three Johto
    // starters are freely selectable here (see ALWAYS_UNLOCKED_CHARACTER_IDS),
    // so each can just track its own independent win count instead of being
    // gated on which one the player "chose". The prerequisite chain naturally
    // gives "36 more wins" semantics: the second mission's own goal counter
    // only starts accumulating once the first mission is already complete.
    {
        missionId: 'cyndaquil-evolve-quilava',
        title: 'Cyndaquil Evolution: Quilava',
        level_requirement: 1,
        rank: '1',
        reward_character: '',
        reward_character_name: '',
        reward_skin_id: 'cyndaquil-quilava-evolution',
        reward: 'Cyndaquil permanently evolves into Quilava.',
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        requirements: ['Win 16 Quick or Ladder matches with Cyndaquil on the team.'],
        goals: [{ type: 'win_ladder_matches', character_id: 'cyndaquil', character_name: 'Cyndaquil', wins: 16 }],
        sortOrder: 219,
    },
    {
        missionId: 'cyndaquil-evolve-typhlosion',
        title: 'Cyndaquil Evolution: Typhlosion',
        level_requirement: 1,
        rank: '1',
        reward_character: '',
        reward_character_name: '',
        reward_skin_id: 'cyndaquil-typhlosion-evolution',
        reward: 'Quilava permanently evolves into Typhlosion.',
        prerequisite_mission_id: 'cyndaquil-evolve-quilava',
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        requirements: ['Win 36 more Quick or Ladder matches with Cyndaquil on the team.'],
        goals: [{ type: 'win_ladder_matches', character_id: 'cyndaquil', character_name: 'Cyndaquil', wins: 36 }],
        sortOrder: 220,
    },
    {
        missionId: 'chikorita-evolve-bayleaf',
        title: 'Chikorita Evolution: Bayleaf',
        level_requirement: 1,
        rank: '1',
        reward_character: '',
        reward_character_name: '',
        reward_skin_id: 'chikorita-bayleaf-evolution',
        reward: 'Chikorita permanently evolves into Bayleaf.',
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        requirements: ['Win 16 Quick or Ladder matches with Chikorita on the team.'],
        goals: [{ type: 'win_ladder_matches', character_id: 'chikorita', character_name: 'Chikorita', wins: 16 }],
        sortOrder: 221,
    },
    {
        missionId: 'chikorita-evolve-meganium',
        title: 'Chikorita Evolution: Meganium',
        level_requirement: 1,
        rank: '1',
        reward_character: '',
        reward_character_name: '',
        reward_skin_id: 'chikorita-meganium-evolution',
        reward: 'Bayleaf permanently evolves into Meganium.',
        prerequisite_mission_id: 'chikorita-evolve-bayleaf',
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        requirements: ['Win 36 more Quick or Ladder matches with Chikorita on the team.'],
        goals: [{ type: 'win_ladder_matches', character_id: 'chikorita', character_name: 'Chikorita', wins: 36 }],
        sortOrder: 222,
    },
    {
        missionId: 'totodile-evolve-croconaw',
        title: 'Totodile Evolution: Croconaw',
        level_requirement: 1,
        rank: '1',
        reward_character: '',
        reward_character_name: '',
        reward_skin_id: 'totodile-croconaw-evolution',
        reward: 'Totodile permanently evolves into Croconaw.',
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        requirements: ['Win 16 Quick or Ladder matches with Totodile on the team.'],
        goals: [{ type: 'win_ladder_matches', character_id: 'totodile', character_name: 'Totodile', wins: 16 }],
        sortOrder: 223,
    },
    {
        missionId: 'totodile-evolve-feraligatr',
        title: 'Totodile Evolution: Feraligatr',
        level_requirement: 1,
        rank: '1',
        reward_character: '',
        reward_character_name: '',
        reward_skin_id: 'totodile-feraligatr-evolution',
        reward: 'Croconaw permanently evolves into Feraligatr.',
        prerequisite_mission_id: 'totodile-evolve-croconaw',
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        requirements: ['Win 36 more Quick or Ladder matches with Totodile on the team.'],
        goals: [{ type: 'win_ladder_matches', character_id: 'totodile', character_name: 'Totodile', wins: 36 }],
        sortOrder: 224,
    },
];

export function normalizeCharacterId(value) {
    return String(value ?? '').trim().toLowerCase();
}

/**
 * Checks a team's species ids against ALWAYS_UNLOCKED_CHARACTER_IDS plus a
 * player's own unlockedCharacterIds. Returns an error string naming the
 * first locked character found, or null if the whole team is playable.
 */
export function validateTeamOwnership(speciesIds, unlockedCharacterIds = []) {
    const allowed = new Set([
        ...ALWAYS_UNLOCKED_CHARACTER_IDS,
        ...unlockedCharacterIds.map(normalizeCharacterId),
    ]);
    const locked = (speciesIds ?? []).find((speciesId) => !allowed.has(normalizeCharacterId(speciesId)));
    return locked ? `${locked} is locked. Unlock it through missions or the store first.` : null;
}

function normalizeGoalProgress(entry) {
    const source = entry && typeof entry === 'object' ? entry : {};
    return {
        count: Math.max(0, Number(source.count) || 0),
        completedAt: source.completedAt ?? null,
    };
}

function normalizeMissionProgress(entry) {
    const source = entry && typeof entry === 'object' ? entry : {};
    const goalProgressByIndex = {};
    if (source.goalProgressByIndex && typeof source.goalProgressByIndex === 'object') {
        Object.entries(source.goalProgressByIndex).forEach(([index, value]) => {
            goalProgressByIndex[index] = normalizeGoalProgress(value);
        });
    }
    return {
        goalProgressByIndex,
        completedAt: source.completedAt ?? null,
    };
}

export function createDefaultMissionState() {
    return {
        progressByMissionId: {},
        unlockedCharacterIds: [],
        unlockPoints: 0,
        purchasedUnlocks: [],
    };
}

function teamHasCharacterId(teamSpeciesIds, characterId) {
    return (teamSpeciesIds ?? []).map(normalizeCharacterId).includes(characterId);
}

/**
 * Pure port of production's post-match mission-evaluation loop
 * (server.js, "for (const mission of missionCatalog)"), narrowed to the goal
 * types and fields this standalone slice actually uses. No level/rank system
 * exists here, so level_requirement is ignored and the reach_rank goal type
 * is treated as untrackable (a mission whose only goals are reach_rank can
 * never auto-complete, matching production's own behavior for a mission
 * whose only goals are all non-trackable). win_ladder_matches is treated
 * identically to win_matches.
 *
 * `mode` is the match's mode ('solo' | 'private' | 'quick' | 'ladder') and
 * gates each mission's `mode_restriction.allowed_modes`, if set: a match
 * played in a non-allowed mode is a complete no-op for that mission this
 * round (it neither advances nor resets any of its goals), matching
 * production's behavior where only real Ladder/Quick wins count toward
 * mode-restricted missions. Callers that don't know/care about mode (e.g.
 * older tests exercising goal math directly) can omit it entirely, which is
 * treated as unrestricted rather than as a non-qualifying mode - only a
 * caller that passes an actual mode string enforces the restriction.
 */
export function evaluateMissionsForPlayer({ catalog, missionsState, didWin, teamSpeciesIds, mode }) {
    const state = {
        progressByMissionId: { ...(missionsState?.progressByMissionId ?? {}) },
        unlockedCharacterIds: [...(missionsState?.unlockedCharacterIds ?? [])],
        unlockPoints: Math.max(0, Number(missionsState?.unlockPoints) || 0),
        purchasedUnlocks: [...(missionsState?.purchasedUnlocks ?? [])],
    };
    const unlockedIds = new Set(state.unlockedCharacterIds.map(normalizeCharacterId));
    const completedMissionIdsAtStart = new Set(
        Object.entries(state.progressByMissionId)
            .filter(([, progress]) => Boolean(progress?.completedAt))
            .map(([missionId]) => missionId)
    );
    const newlyUnlockedSkinIds = new Set();
    let unlockPointsDelta = 0;
    const now = new Date().toISOString();

    for (const mission of catalog ?? []) {
        if (!mission?.missionId) continue;
        const existingProgress = normalizeMissionProgress(state.progressByMissionId[mission.missionId]);
        if (existingProgress.completedAt) continue;

        const rewardCharacterId = normalizeCharacterId(mission.reward_character);
        if (rewardCharacterId && unlockedIds.has(rewardCharacterId)) {
            state.progressByMissionId[mission.missionId] = { ...existingProgress, completedAt: now };
            continue;
        }

        const prerequisiteMissionId = mission.prerequisite_mission_id ?? null;
        if (prerequisiteMissionId && !completedMissionIdsAtStart.has(prerequisiteMissionId)) continue;

        const goals = mission.goals ?? [];
        const nextGoalProgressByIndex = { ...existingProgress.goalProgressByIndex };
        let hasTrackableGoals = false;
        let allComplete = goals.length > 0;
        const allowedModes = mission.mode_restriction?.allowed_modes;
        const matchQualifiesForMission = !allowedModes || mode === undefined || allowedModes.includes(mode);

        goals.forEach((goal, index) => {
            const type = String(goal?.type ?? '').trim().toLowerCase();
            if (!TRACKABLE_GOAL_TYPES.has(type)) return;
            hasTrackableGoals = true;

            const targetCount = Math.max(0, Number(goal.wins) || 0);
            if (!targetCount) {
                allComplete = false;
                return;
            }
            const goalCharacterId = goal.character_id ? normalizeCharacterId(goal.character_id) : '';
            const hasGoalCharacter = goalCharacterId ? teamHasCharacterId(teamSpeciesIds, goalCharacterId) : true;
            const sameTeamCharacterIds = Array.isArray(goal.character_ids)
                ? goal.character_ids.map(normalizeCharacterId).filter(Boolean)
                : [];
            const hasSameTeamCharacters =
                sameTeamCharacterIds.length >= 2 &&
                sameTeamCharacterIds.every((characterId) => teamHasCharacterId(teamSpeciesIds, characterId));
            const existingGoalProgress = normalizeGoalProgress(nextGoalProgressByIndex[index]);
            const nextGoalProgress = { ...existingGoalProgress };

            if (type === 'win_matches' || type === 'win_ladder_matches') {
                if (didWin && hasGoalCharacter) {
                    nextGoalProgress.count = Math.min(targetCount, existingGoalProgress.count + 1);
                }
            } else if (type === 'win_streak') {
                nextGoalProgress.count =
                    didWin && hasGoalCharacter ? Math.min(targetCount, existingGoalProgress.count + 1) : 0;
            } else if (type === 'win_streak_same_team') {
                nextGoalProgress.count =
                    didWin && hasSameTeamCharacters ? Math.min(targetCount, existingGoalProgress.count + 1) : 0;
            } else if (type === 'win_matches_same_team') {
                if (didWin && hasSameTeamCharacters) {
                    nextGoalProgress.count = Math.min(targetCount, existingGoalProgress.count + 1);
                }
            }

            if (nextGoalProgress.count >= targetCount) {
                nextGoalProgress.completedAt = existingGoalProgress.completedAt ?? now;
            }
            nextGoalProgressByIndex[index] = nextGoalProgress;
            if (!nextGoalProgressByIndex[index].completedAt) allComplete = false;
        });

        state.progressByMissionId[mission.missionId] = {
            ...existingProgress,
            goalProgressByIndex: nextGoalProgressByIndex,
        };

        if (hasTrackableGoals && allComplete) {
            state.progressByMissionId[mission.missionId] = {
                ...state.progressByMissionId[mission.missionId],
                completedAt: now,
            };
            unlockPointsDelta += Math.max(0, Math.floor(Number(mission.reward_unlock_points) || 0));
            if (rewardCharacterId) unlockedIds.add(rewardCharacterId);
            const rewardSkinId = mission.reward_skin_id ? normalizeCharacterId(mission.reward_skin_id) : '';
            if (rewardSkinId) newlyUnlockedSkinIds.add(rewardSkinId);
        }
    }

    state.unlockedCharacterIds = Array.from(unlockedIds);
    state.unlockPoints += unlockPointsDelta;
    return { missionsState: state, newlyUnlockedSkinIds: Array.from(newlyUnlockedSkinIds) };
}
