'use strict';

// Deadpool: Comic-Arena character, READY BUT NOT LIVE.
//
// Nothing in the game loads this file: he isn't in characters.js, the character pages, team
// select or the mission list, and /staging/ is never served to browsers (server.js keeps it
// private). To release him, run:
//
//     node scripts/release-staged-character.js deadpool
//
// which adds the character to characters.js and the mission to server.js's mission catalog.
// test/deadpool-staged.test.js plays every skill through the real battle engine.

const IMG = 'assets/images/deadpool';

const KATANA_SLICE_BUFF = {
    statusId: 'deadpool_katana_slice_bonus',
    duration: 1,
    sourceSkillId: 'deadpool-katana-slice',
    scope: 'self',
    metadata: {
        damageBonusFlat: 10,
        turnEndTrigger: 'source_turn',
        turnDurationAnchor: 'source_turn',
        sourceSkillName: 'Katana Slice',
        statusIconUrl: `${IMG}/katana-slice.webp`,
        tooltipText: 'Deadpool deals 10 additional damage with his skills.',
    },
};

const GUN_PLAY_BUFF = {
    statusId: 'deadpool_gun_play_bonus',
    duration: 1,
    sourceSkillId: 'deadpool-gun-play',
    scope: 'self',
    metadata: {
        damageBonusFlat: 5,
        turnEndTrigger: 'source_turn',
        turnDurationAnchor: 'source_turn',
        sourceSkillName: 'Gun Play',
        statusIconUrl: `${IMG}/gun-play.webp`,
        tooltipText: 'Deadpool deals 5 additional damage with his skills.',
    },
};

const character = {
    id: 'deadpool',
    characterId: 'deadpool',
    name: 'Deadpool',
    facePicture: `${IMG}/deadpoolfp.webp`,
    characterdeescription:
        "Wade Wilson: mercenary, mouth, and the only one here who knows he's in a game. Two katanas, too many guns, and a healing factor that turns every mistake into a punchline.",
    description:
        "Wade Wilson: mercenary, mouth, and the only one here who knows he's in a game. Two katanas, too many guns, and a healing factor that turns every mistake into a punchline.",
    role: 'Assassin',
    roleCategory: 'assassin',
    universe: 'marvel',
    startStatuses: [
        {
            statusId: 'deadpool_cancer_factor',
            duration: 999,
            sourceSkillId: 'deadpool-passive-cancer-factor',
            metadata: {
                infiniteDuration: true,
                turnStartHealIfNoEnemyDamage: 12,
                turnStartHealIfNoEnemyDamageStep: 3,
                turnStartHealIfNoEnemyDamageMin: 4,
                noDamageHealStreak: 0,
                sourceSkillName: 'Passive: Cancer Factor',
                statusIconUrl: `${IMG}/cancer-factor.webp`,
                tooltipText:
                    'If Deadpool took no enemy damage last turn, he heals at the start of his turn: 12 HP, then 3 less for each consecutive turn, down to 4 HP. Taking enemy damage resets it.',
            },
        },
    ],
    skills: [
        {
            id: 'deadpool-katana-slice',
            name: 'Katana Slice',
            skillimage: `${IMG}/katana-slice.webp`,
            skilldescription:
                'Deadpool deals 25 piercing damage to one enemy. For 1 turn, Deadpool deals 10 additional damage with his skills.',
            energy: ['Taijutsu'],
            target: 'single-enemy',
            damage: 0,
            cooldown: 0,
            classes: ['Physical', 'Melee', 'Instant'],
            effects: [
                { type: 'damage', amount: 25, scope: 'target', metadata: { ignoreDamageReduction: true } },
                { type: 'apply_status', ...KATANA_SLICE_BUFF },
            ],
        },
        {
            id: 'deadpool-gun-play',
            name: 'Gun Play',
            skillimage: `${IMG}/gun-play.webp`,
            skilldescription:
                'Deadpool deals 20 piercing damage to one enemy and 10 piercing damage to another random enemy. For 1 turn, Deadpool deals 5 additional damage with his skills.',
            energy: ['Bloodline'],
            target: 'single-enemy',
            damage: 0,
            cooldown: 0,
            classes: ['Physical', 'Ranged', 'Instant'],
            effects: [
                { type: 'damage', amount: 20, scope: 'target', metadata: { ignoreDamageReduction: true } },
                { type: 'damage', amount: 10, scope: 'random-other-enemy', metadata: { ignoreDamageReduction: true } },
                { type: 'apply_status', ...GUN_PLAY_BUFF },
            ],
        },
        {
            id: 'deadpool-katana-slash-n-hack',
            name: "Katana Slash n' Hack",
            skillimage: `${IMG}/katana-slash-n-hack.webp`,
            skilldescription:
                "Deadpool ignores all enemy physical skills for 1 turn. Any enemy who uses a new skill on Deadpool during this time has Katana Slice cast on them once. This skill is invisible.",
            energy: ['Random'],
            target: 'self',
            damage: 0,
            cooldown: 3,
            classes: ['Physical', 'Instant', 'Invisible'],
            classesHtml: 'Physical, Instant, Invisible',
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'deadpool_katana_slash_n_hack',
                    duration: 1,
                    sourceSkillId: 'deadpool-katana-slash-n-hack',
                    scope: 'self',
                    metadata: {
                        ignoreEnemyPhysicalSkills: true,
                        ignoreSkillClasses: ['physical'],
                        hideTooltipFromEnemy: true,
                        onOwnerTargetedBySkillTrigger: true,
                        onOwnerTargetedByEnemyOnly: true,
                        onOwnerTargetedBySkillOncePerSourceDuringStatus: true,
                        // "Katana Slice is cast on them": its 25 piercing damage, and Deadpool gets its bonus.
                        onOwnerTargetedBySkillDamageToSourceAmount: 25,
                        onOwnerTargetedBySkillDamageToSourceIgnoreDamageReduction: true,
                        onOwnerTargetedBySkillDamageToSourceIgnoreDestructibleDefense: false,
                        onOwnerTargetedBySkillDamageToSourceSkillClasses: ['Physical', 'Melee', 'Instant'],
                        onOwnerTargetedBySkillDamageToSourceLabel: 'Katana Slice',
                        onOwnerTargetedBySkillDamageToSourceReason: "Katana Slash n' Hack",
                        onOwnerTargetedBySkillApplyStatusToOwner: {
                            statusId: KATANA_SLICE_BUFF.statusId,
                            duration: KATANA_SLICE_BUFF.duration,
                            sourceSkillId: KATANA_SLICE_BUFF.sourceSkillId,
                            metadata: KATANA_SLICE_BUFF.metadata,
                        },
                        sourceSkillName: "Katana Slash n' Hack",
                        statusIconUrl: `${IMG}/katana-slash-n-hack.webp`,
                        tooltipText:
                            'Deadpool ignores enemy physical skills. An enemy who uses a new skill on him has Katana Slice cast on them once.',
                    },
                },
            ],
        },
        {
            id: 'deadpool-fourth-wall-break',
            name: '4th-Wall Break',
            skillimage: `${IMG}/fourth-wall-break.webp`,
            skilldescription:
                "Deadpool realizes he's just in a game, and he can make his own rules any time he wants. Skip your opponent's next turn!",
            energy: ['Taijutsu', 'Bloodline', 'Ninjutsu', 'Genjutsu', 'Random'],
            target: 'self',
            damage: 0,
            cooldown: 8,
            classes: ['Mental', 'Instant', 'Bypassing'],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'deadpool_fourth_wall_break',
                    duration: 1,
                    sourceSkillId: 'deadpool-fourth-wall-break',
                    scope: 'all-enemy',
                    metadata: {
                        harmful: true,
                        cannotUseSkills: true,
                        ignoreInvulnerability: true,
                        sourceSkillName: '4th-Wall Break',
                        statusIconUrl: `${IMG}/fourth-wall-break.webp`,
                        tooltipText: "Deadpool broke the fourth wall. This character's turn is skipped.",
                    },
                },
            ],
        },
        {
            id: 'deadpool-passive-cancer-factor',
            name: 'Passive: Cancer Factor',
            skillimage: `${IMG}/cancer-factor.webp`,
            skilldescription:
                'If Deadpool took no enemy damage last turn, he heals 12 HP. Each consecutive turn he heals, the amount drops by 3, down to a minimum of 4 HP per turn. Taking enemy damage resets it to 12.',
            energy: [],
            target: '',
            damage: 0,
            cooldown: 0,
            classes: ['Passive', 'Instant'],
        },
    ],
};

const mission = {
    missionId: 'deadpool',
    title: 'Maximum Effort',
    level_requirement: 1,
    rank: '1',
    reward_character: 'deadpool',
    reward_character_name: 'Deadpool',
    reward: 'Unlock Deadpool',
    mode_restriction: { allowed_modes: ['quick', 'ladder'] },
    win_streak: { character_id: '', character_name: '', wins: 0 },
    image: `${IMG}/mission.webp`,
    imageAlt: 'Deadpool mission artwork',
    characterName: 'Deadpool',
    portrait: `${IMG}/deadpoolfp.webp`,
    portraitAlt: 'Deadpool portrait',
    requirements: [
        'Win 10 Quick or Ladder matches with Wolverine.',
        'Win 4 Quick or Ladder matches in a row with Wolverine.',
    ],
    goals: [
        { type: 'win_matches', character_id: 'wolverine', character_name: 'Wolverine', wins: 10 },
        { type: 'win_streak', character_id: 'wolverine', character_name: 'Wolverine', wins: 4 },
    ],
};

module.exports = { character, mission };
