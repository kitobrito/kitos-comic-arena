const characters = [
{
    id: 'uzumaki-naruto',
    characterId: 'uzumaki-naruto',
    name: 'Uzumaki Naruto',
    facePicture: 'https://i.imgur.com/JY8WbiV.png',
    characterdeescription: 'Uzumaki Naruto is a high-pressure momentum fighter built around aggression, combo chains, and form-shifting power spikes. He excels at snowballing fights through burst damage, state changes, and multi-turn pressure, rewarding players who maintain tempo and punish openings with relentless offense.',
    skills: [
        {
            id: 'uzumaki-naruto-underground-ambush',
            name: 'Underground Ambush',
            skillimage: 'https://i.imgur.com/Zz5vK7k.png',
            skilldescription: 'Naruto deals 25 damage to one enemy. This also deals 10 damage to the other enemies during \'Shadow Clones\'',
            energy: [
                'Taijutsu'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 1,
            classes: [
                'Physical',
                'Melee',
                'Instant'
            ],
            effects: [
                {
                    type: 'damage',
                    amount: 25,
                    scope: 'target',
                },
                {
                    type: 'damage',
                    amount: 0,
                    scope: 'other-enemies',
                    condition: {
                        statusId: 'uzumaki_naruto_shadow_clones_active',
                        scope: 'self',
                        conditionalAmount: 10,
                    },
                },
            ]
        },
        {
            id: 'uzumaki-naruto-kyuubi-chakra-surge',
            name: 'Kyuubi Chakra Surge',
            skillimage: 'https://i.imgur.com/7mtmZSp.png',
            skilldescription: 'Naruto gains 1 random chakra and heals 20 HP then swaps this skill to \'Rasengan\' until it is used. If \'Shadow Clones\' is used next turn, it will last for 4 turns instead of 1 turn.',
            energy: [
                'Random'
            ],
            target: 'self',
            damage: 0,
            cooldown: 2,
            classes: [
                'Chakra',
                'Instant',
                'Unique'
            ],
            effects: [
                {
                    type: 'gain_chakra',
                    chakraType: 'random',
                    amount: 1,
                },
                {
                    type: 'heal',
                    amount: 20,
                    scope: 'self',
                },
                {
                    type: 'apply_status',
                    statusId: 'uzumaki_naruto_kyuubi_swap',
                    duration: 99,
                    scope: 'self',
                    metadata: {
                        skillReplacements: {
                            'uzumaki-naruto-kyuubi-chakra-surge': 'uzumaki-naruto-rasengan',
                        },
                        tooltipText: "Kyuubi Chakra Surge is replaced by Rasengan.",
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'uzumaki_naruto_kyuubi_shadow_clones_bonus',
                    duration: 1,
                    scope: 'self',
                    metadata: {
                        turnDurationAnchor: 'source_turn',
                        tooltipText: "If Shadow Clones is used next turn, it will last for 4 turns.",
                    },
                },
            ]
        },
        {
            id: 'uzumaki-naruto-shadow-clones',
            name: 'Shadow Clones',
            skillimage: 'https://i.imgur.com/SWb18ro.png',
            skilldescription: 'For 2 turns, Naruto gains 50% damage reduction from the first enemy skill each turn. This swaps to \'Explosive Thousand Years of Death\' the first turn then swaps to \'Uzumaki 2k Combo\' the second turn. If \'Kyuubi Chakra Surge\' is actve, the alternate skills will swap in the same order.',
            energy: [
                'Random'
            ],
            target: 'self',
            damage: 0,
            cooldown: 2,
            classes: [
                'Chakra',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'uzumaki_naruto_shadow_clones_active',
                    duration: 2,
                    scope: 'self',
                    metadata: {
                        damageReductionPercent: 50,
                        skillReplacementsByRemainingTurns: {
                            '4': {
                                'uzumaki-naruto-shadow-clones': 'uzumaki-naruto-explosive-thousand-years-of-death',
                            },
                            '3': {
                                'uzumaki-naruto-shadow-clones': 'uzumaki-naruto-uzumaki-2k-barrage',
                            },
                            '2': {
                                'uzumaki-naruto-shadow-clones': 'uzumaki-naruto-explosive-thousand-years-of-death',
                            },
                            '1': {
                                'uzumaki-naruto-shadow-clones': 'uzumaki-naruto-uzumaki-2k-barrage',
                            },
                        },
                        tooltipText: "Naruto has 50% damage reduction and Shadow Clones is replaced by: .",
                    },
                },
                {
                    type: 'extend_status',
                    targetStatusId: 'uzumaki_naruto_shadow_clones_active',
                    amount: 2,
                    scope: 'self',
                    condition: {
                        statusId: 'uzumaki_naruto_kyuubi_shadow_clones_bonus',
                        scope: 'self',
                        consumeOnMatch: true,
                    },
                },
            ]
        },
        {
            id: 'uzumaki-naruto-summoning-gamabunta',
            name: 'Summoning: Gamabunta',
            skillimage: 'https://i.imgur.com/BaAUdwf.png',
            skilldescription: 'Removes one random harmful effect from Naruto. Casts \'Water Bullet\' on a random enemy. For 2 turns, this skill swaps into \'Water Bullet\'.',
            energy: [
                'Bloodline',
                'Ninjutsu'
            ],
            target: 'self',
            damage: 0,
            cooldown: 5,
            classes: [
                'Chakra',
                'Instant',
                'Unique'
            ],
            effects: [
                {
                    type: 'cleanse_harmful',
                    count: 1,
                    scope: 'self',
                },
                {
                    type: 'damage',
                    amount: 35,
                    scope: 'random-enemy',
                    metadata: {
                        randomScopeGroupKey: 'naruto_gamabunta_random_enemy',
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'uzumaki_naruto_water_bullet_debuff',
                    duration: 1,
                    scope: 'random-enemy',
                    sourceSkillId: 'uzumaki-naruto-water-bullet',
                    metadata: {
                        randomScopeGroupKey: 'naruto_gamabunta_random_enemy',
                        harmful: true,
                        DamageDebuff: -15,
                        tooltipText: 'This character deals 15 less damage.',
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'uzumaki_naruto_gamabunta_swap',
                    duration: 2,
                    scope: 'self',
                    metadata: {
                        skillReplacements: {
                            'uzumaki-naruto-summoning-gamabunta': 'uzumaki-naruto-water-bullet',
                        },
                        tooltipText: "Summoning: Gamabunta is replaced by Water Bullet.",
                    },
                },
            ]
        },
        {
            id: 'uzumaki-naruto-explosive-thousand-years-of-death',
            name: 'Explosive Thousand Years of Death',
            skillimage: 'https://i.imgur.com/OGbeSwO.png',
            skilldescription: 'Deals 5 piercing damage to one enemy. After 1 turn, they are dealt 20 affliction damage and cannot reduce damage or become invulnerable for 2 turns.',
            
            energy: [
                'Random'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 0,
            classes: [
                'Physical',
                'Instant',
                'Melee',
                'Affliction'
            ],
            effects: [
                {
                    type: 'damage',
                    amount: 5,
                    scope: 'target',
                    metadata: {
                        ignoreDamageReduction: true,
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'uzumaki_naruto_explosive_lock',
                    duration: 2,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        cannotReduceDamage: true,
                        cannotBecomeInvulnerable: true,
                        tooltipText: 'This character cannot reduce damage or become invulnerable.',
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'uzumaki_naruto_explosive_affliction',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        turnEndDamage: 20,
                        afflictionDamage: true,
                        ignoreDamageReduction: true,
                        ignoreDestructibleDefense: true,
                        turnEndTrigger: 'source_turn',
                        turnDurationAnchor: 'source_turn',
                        tooltipText: 'This character will take 20 affliction damage next turn.',
                    },
                },
            ]
        },
        {
            id: 'uzumaki-naruto-rasengan',
            name: 'Rasengan',
            skillimage: 'https://i.imgur.com/mBhZXdP.png',
            skilldescription: 'Naruto deals 15 damage to one enemy this turn and fully stuns them for 1 turn then deals 15 piercing damage next turn. Swaps to \'Kyuubi Chakra Surge\'.',
            
            energy: [
                'Ninjutsu'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 0,
            classes: [
                'Chakra',
                'Melee',
                'Instant'
            ],
            effects: [
                {
                    type: 'damage',
                    amount: 15,
                    scope: 'target',
                },
                {
                    type: 'apply_status',
                    statusId: 'stunned',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        cannotUseSkills: true,
                        tooltipText: 'This character is stunned and cannot use skills.',
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'uzumaki_naruto_rasengan_followup',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        turnEndDamage: 15,
                        ignoreTargetDamageReduction: true,
                        ignoreTargetDestructibleDefense: true,
                        turnEndTrigger: 'source_turn',
                        turnDurationAnchor: 'source_turn',
                        tooltipText: 'This character will take 15 piercing damage next turn.',
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'uzumaki_naruto_kyuubi_swap',
                    duration: 99,
                    scope: 'self',
                    metadata: {
                        skillReplacements: {
                            'uzumaki-naruto-kyuubi-chakra-surge': 'uzumaki-naruto-kyuubi-chakra-surge',
                        },
                        tooltipText: "Kyuubi Chakra Surge is restored.",
                    },
                },
            ]
        },
        {
            id: 'uzumaki-naruto-uzumaki-2k-barrage',
            name: 'Uzumaki 2k Barrage',
            skillimage: 'https://i.imgur.com/J8a7lIo.png',
            skilldescription: 'Deals 24 damage to one enemy for 2 turns.',
            
            energy: [
                'Taijutsu',
                'Random'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 0,
            classes: [
                'Physical',
                'Instant',
                'Melee'
            ],
            effects: [
                {
                    type: 'damage',
                    amount: 24,
                    scope: 'target',
                },
                {
                    type: 'apply_status',
                    statusId: 'uzumaki_naruto_2k_barrage_followup',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        turnEndDamage: 24,
                        turnEndTrigger: 'source_turn',
                        turnDurationAnchor: 'source_turn',
                        tooltipText: 'This character will take 24 damage next turn.',
                    },
                },
            ]
        },
        {
            id: 'uzumaki-naruto-water-bullet',
            name: 'Water Bullet',
            skillimage: 'https://i.imgur.com/8UFKnoL.png',
            skilldescription: 'Deals 35 damage to one enemy and reduces their damage by 15 for one turn.',
            
            energy: [
                'Ninjutsu',
                'Random'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 0,
            classes: [
                'Chakra',
                'Instant',
                'Ranged',
                'Unique'
            ],
            effects: [
                {
                    type: 'damage',
                    amount: 35,
                    scope: 'target',
                },
                {
                    type: 'apply_status',
                    statusId: 'uzumaki_naruto_water_bullet_debuff',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        DamageDebuff: -15,
                        tooltipText: 'This character deals 15 less damage.',
                    },
                },
            ]
        }
    ]
},
    {
    id: 'haruno-sakura',
    characterId: 'haruno-sakura',
    name: 'Haruno Sakura',
    facePicture: 'https://i.imgur.com/mOMqqq0.png',
    characterdeescription: 'Sakura shifts between steady pressure and explosive control once her Inner state is active. She chips enemies down with persistent damage and punishes aggression through well-timed defensive traps, creating tempo swings that favor prolonged engagements. When fully ramped, she becomes a disruptive powerhouse—shrugging off stuns, reducing incoming damage, and unleashing decisive strikes that can dismantle fragile backlines.',
    skills: [
        {
            id: 'haruno-sakura-kunai-stab',
            name: 'Kunai Stab',
            skillimage: 'https://i.imgur.com/Jtl9MTB.png',
            skilldescription: 'Deals 15 damage to one enemy. The following 2 turns, the target bleeds for 5 affliction damage.',
            energy: [
                'Taijutsu'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 0,
            classes: [
                'Physical',
                'Melee',
                'Instant',
                'Affliction'
            ],
            effects: [
                {
                    type: 'damage',
                    amount: 15,
                    scope: 'target',
                    condition: {
                        statusId: 'haruno_sakura_inner_sakura_active',
                        scope: 'self',
                        conditionalAmount: 25,
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'haruno_sakura_kunai_bleed',
                    duration: 2,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        turnEndDamage: 5,
                        afflictionDamage: true,
                        ignoreDamageReduction: true,
                        ignoreDestructibleDefense: true,
                        turnEndTrigger: 'source_turn',
                        turnDurationAnchor: 'source_turn',
                        ongoingClass: 'action',
                        tooltipText: 'This character takes 5 affliction damage each turn.',
                    },
                },
            ]
        },
        {
            id: 'haruno-sakura-log-fall-trap',
            name: 'Log Fall Trap',
            skillimage: 'https://i.imgur.com/fXRBwFN.png',
            skilldescription: 'Sakura targets herself or an ally until the next enemy harmful non-mental skill is used on them. When triggered, the attacker is dealt 15 damage and has their damage reduced by 15 for 2 turns. This is invisible and cannot be used on an already affected ally.',
            energy: [
                'Random'
            ],
            target: 'self-or-single-ally',
            targetCondition: {
                missingStatusId: 'haruno_sakura_log_fall_trap',
            },
            damage: 0,
            cooldown: 1,
            classes: [
                'Physical',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'haruno_sakura_log_fall_trap',
                    duration: 99,
                    scope: 'target',
                    metadata: {
                        triggerOnEnemyHarmfulNonMental: true,
                        counterDamage: 15,
                        counterStatusId: 'haruno_sakura_log_fall_damage_down',
                        counterStatusDuration: 2,
                        counterStatusMetadata: {
                            harmful: true,
                            DamageDebuff: -15,
                            tooltipText: 'This character deals 15 less damage.',
                        },
                        hideTooltipFromEnemy: true,
                        tooltipText: 'The next enemy harmful non-mental skill is used on this character will trigger this skill: The attacker is dealt 15 damage and has their damage reduced by 15 for 2 turns.',
                    },
                },
            ]
        },
        {
            id: 'haruno-sakura-inner-sakura',
            name: 'Inner Sakura',
            skillimage: 'https://i.imgur.com/cmXR9AK.png',
            skilldescription: 'For 4 turns, Sakura will gain 10 points of damage reduction. During this time, Sakura will ignore stun effects and \'Kunai Stab\' will deal 10 additional damage. Swaps to \'Mental Rampage\' while active.',
            energy: [
                'Random'
            ],
            target: 'self',
            damage: 0,
            cooldown: 4,
            classes: [
                'Mental',
                'Instant',
                'Unique'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'haruno_sakura_inner_sakura_active',
                    duration: 4,
                    scope: 'self',
                    metadata: {
                        damageReductionFlat: 10,
                        cannotBeStunned: true,
                        skillReplacements: {
                            'haruno-sakura-inner-sakura': 'haruno-sakura-mental-rampage',
                        },
                        tooltipText: 'Sakura has 10 damage reduction, ignores stuns, and Inner Sakura is replaced by Mental Rampage.',
                    },
                },
            ]
        },
        {
            id: 'haruno-sakura-sakura-replacement-technique',
            name: 'Sakura Replacement Technique',
            skillimage: 'https://i.imgur.com/lli0iV2.png',
            skilldescription: 'This skill makes Haruno Sakura invulnerable for 1 turn.',
            energy: [
                'Random'
            ],
            target: 'self',
            damage: 0,
            cooldown: 4,
            classes: [
                'Chakra',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'invulnerable',
                    duration: 1,
                    scope: 'self',
                    metadata: {
                        invulnerable: true,
                        tooltipText: 'This character is invulnerable.',
                    },
                },
            ]
        },
        {
            id: 'haruno-sakura-mental-rampage',
            name: 'Mental Rampage',
            skillimage: 'https://i.imgur.com/NXk2FSj.png',
            skilldescription: 'Deals 25 damage to one enemy and stuns their chakra and mental skills for 1 turn.',
            hiddenFromSelectionViewer: true,
            energy: [
                'Genjutsu'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 0,
            classes: [
                'Mental',
                'Instant',
                'Ranged'
            ],
            effects: [
                {
                    type: 'damage',
                    amount: 25,
                    scope: 'target',
                },
                {
                    type: 'apply_status',
                    statusId: 'haruno_sakura_mental_rampage_lock',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        cannotUseSkillClasses: ['chakra', 'mental'],
                        tooltipText: 'This character chakra and mental skills are stunned.',
                    },
                },
            ]
        }
    ]
},
    {
    id: 'uchiha-sasuke',
    characterId: 'uchiha-sasuke',
    name: 'Uchiha Sasuke',
    facePicture: 'https://i.imgur.com/JruPrgE.png',
    characterdeescription: 'Uchiha Sasuke is a high-skill, evasive duelist who thrives on prediction and punishment. Rather than overwhelming enemies with raw durability, Sasuke avoids attacks through precise timing, gradually increasing his damage each time he successfully evades. His kit rewards patience and awareness, allowing him to turn enemy aggression into permanent offensive power..',
    skills: [
        {
            id: 'uchiha-sasuke-mimicked-taijutsu',
            name: 'Mimicked Taijutsu',
            skillimage: 'https://i.imgur.com/KCCpAPy.png',
            skilldescription: 'Sasuke deals 30 damage to one enemy. Sasuke has a 10% chance to Evade enemy non-mental skills for 1 turn. (stacks with \'Sharingan\' & \'Uchiha Reflexes\').',
            energy: [
                'Taijutsu',
                'Random'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 0,
            classes: [
                'Physical',
                'Melee',
                'Instant'
            ],
            effects: [
                {
                    type: 'damage',
                    amount: 30,
                    scope: 'target',
                },
                {
                    type: 'apply_status',
                    statusId: 'uchiha_sasuke_taijutsu_evade',
                    duration: 1,
                    scope: 'self',
                    metadata: {
                        evadeChancePercent: 10,
                        evadeAgainstNonMental: true,
                        tooltipText: 'This character has a 10% chance to evade enemy non-mental skills.',
                    },
                },
            ]
        },
        {
            id: 'uchiha-sasuke-triple-windmill-attack',
            name: 'Triple Windmill Attack',
            skillimage: 'https://i.imgur.com/904CWZw.png',
            skilldescription: 'One enemy has their harmful skills stunned and may not reduce damage or become invulnerable for 1 turn. Swaps to \'Dragon Flame Jutsu\' for 1 turn. This may not be used on an already affected enemy.',
            energy: [
                'Random'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 1,
            classes: [
                'Chakra',
                'Melee',
                'Instant'
            ],
            effects: [
                                {
                    type: 'apply_status',
                    statusId: 'uchiha_sasuke_triple_windmill_lock2',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        cannotUseHarmfulSkills: true,
                        tooltipText: 'This character harmful skills are stunned.',
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'uchiha_sasuke_triple_windmill_lock',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        cannotReduceDamage: true,
                        cannotBecomeInvulnerable: true,
                        tooltipText: 'This character cannot reduce damage or become invulnerable.',
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'uchiha_sasuke_triple_windmill_mark',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        turnDurationAnchor: 'source_turn',
                        triggerOnApply: false,
                        tooltipText: 'This character is marked by Triple Windmill Attack.',
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'uchiha_sasuke_dragon_flame_swap',
                    duration: 1,
                    scope: 'self',
                    metadata: {
                        skillReplacements: {
                            'uchiha-sasuke-triple-windmill-attack': 'uchiha-sasuke-dragon-flame-jutsu',
                        },
                        tooltipText: 'Triple Windmill Attack is replaced by Dragon Flame Jutsu.',
                    },
                },
            ]
        },
        {
            id: 'uchiha-sasuke-sharingan',
            name: 'Sharingan',
            skillimage: 'https://i.imgur.com/NhDRPOE.png',
            skilldescription: 'For 4 turns, Sasuke gains a 15% chance to Evade all enemy non-mental skills and this swaps to \'Chidori\'. Every time he Evades a physical skill, \'Mimicked Taijutsu\' permanently deals 5 additional damage & every time he Evades a chakra skill, \'Chidori\' deals 5 additional damage permanently (stacks).',
            energy: [
                'none'
            ],
            target: 'self',
            damage: 0,
            cooldown: 3,
            classes: [
                'Mental',
                'Instant',
                'Unique'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'uchiha_sasuke_sharingan_active',
                    duration: 4,
                    scope: 'self',
                    metadata: {
                        evadeChancePercent: 15,
                        evadeAgainstNonMental: true,
                        skillReplacements: {
                            'uchiha-sasuke-sharingan': 'uchiha-sasuke-chidori',
                        },
                        onEvadeSkillClassBonuses: {
                            physical: {
                                statusId: 'uchiha_sasuke_mimicked_taijutsu_scaling',
                                duration: 99,
                                metadata: {
                                    skillDamageBonuses: {
                                        'uchiha-sasuke-mimicked-taijutsu': 5,
                                    },
                                    tooltipText: 'Mimicked Taijutsu deals 5 additional damage.',
                                },
                            },
                            chakra: {
                                statusId: 'uchiha_sasuke_chidori_scaling',
                                duration: 99,
                                metadata: {
                                    skillDamageBonuses: {
                                        'uchiha-sasuke-chidori': 5,
                                    },
                                    tooltipText: 'Chidori deals 5 additional damage.',
                                },
                            },
                        },
                        tooltipText: 'This character has a 15% chance to evade enemy non-mental skills and Sharingan is replaced by Chidori.',
                    },
                },
            ]
        },
        {
            id: 'uchiha-sasuke-uchiha-reflexes',
            name: 'Uchiha Reflexes',
            skillimage: 'https://i.imgur.com/FJDxgOR.png',
            skilldescription: 'This skill makes Uchiha Sasuke have a 25% chance to Evade enemy non-mental skills for 2 turns (stacks with \'Mimicked Taijutsu\' and \'Sharingan\'). If a skill is successfully evaded, Sasuke becomes invulnerable to all other enemy skills that turn.',
            energy: [
                'Random'
            ],
            target: 'self',
            damage: 0,
            cooldown: 4,
            classes: [
                'Physical',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'uchiha_sasuke_reflexes_evade',
                    duration: 2,
                    scope: 'self',
                    metadata: {
                        evadeChancePercent: 25,
                        evadeAgainstNonMental: true,
                        onEvadeApplyStatus: {
                            statusId: 'uchiha_sasuke_evade_invulnerable',
                            duration: 1,
                            metadata: {
                                invulnerable: true,
                                turnDurationAnchor: 'source_turn',
                                tooltipText: 'This character is invulnerable for the rest of this enemy turn after evading.',
                            },
                        },
                        tooltipText: 'This character has a 25% chance to evade enemy non-mental skills, if triggered, Sasuke will become invulnerable to all other enemy skills that turn.',
                    },
                },
            ]
        },
        {
            id: 'uchiha-sasuke-dragon-flame-jutsu',
            name: 'Dragon Flame Jutsu',
            skillimage: 'https://i.imgur.com/kjIOA8y.png',
            skilldescription: 'Deals 15 affliction damage to the enemy affected by \'Triple Windmill Attack\' for 2 turns. \'Triple Windmill Attack\' has its duration extended by 1 turn.',
            energy: [
                'Ninjutsu',
                'Random'
            ],
            target: 'single-enemy',
            targetCondition: {
                statusId: 'uchiha_sasuke_triple_windmill_mark',
            },
            damage: 0,
            cooldown: 1,
            classes: [
                'Chakra',
                'Ranged',
                'Action',
                'Affliction'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'uchiha_sasuke_dragon_flame_dot',
                    duration: 2,
                    scope: 'target',
                    condition: {
                        statusId: 'uchiha_sasuke_triple_windmill_mark',
                        scope: 'target',
                    },
                    metadata: {
                        harmful: true,
                        turnEndDamage: 15,
                        afflictionDamage: true,
                        ignoreDamageReduction: true,
                        ignoreDestructibleDefense: true,
                        turnEndTrigger: 'source_turn',
                        turnDurationAnchor: 'source_turn',
                        ongoingClass: 'action',
                        tooltipText: 'This character takes 15 affliction damage each turn.',
                    },
                },
                {
                    type: 'extend_status',
                    targetStatusId: 'uchiha_sasuke_triple_windmill_lock',
                    amount: 1,
                    scope: 'target',
                    condition: {
                        statusId: 'uchiha_sasuke_triple_windmill_mark',
                        scope: 'target',
                    },
                },
                {
                    type: 'extend_status',
                    targetStatusId: 'uchiha_sasuke_triple_windmill_mark',
                    amount: 1,
                    scope: 'target',
                    condition: {
                        statusId: 'uchiha_sasuke_triple_windmill_mark',
                        scope: 'target',
                    },
                },
            ]
        },
        {
            id: 'uchiha-sasuke-chidori',
            name: 'Chidori',
            skillimage: 'https://i.imgur.com/y2WbP01.png',
            skilldescription: 'Sasuke deals 45 piercing damage to one enemy. If the target\'s health drops to 10 HP or below, they are executed.',
            energy: [
                'Ninjutsu',
                'Ninjutsu'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 1,
            classes: [
                'Chakra',
                'Melee',
                'Instant'
            ],
            effects: [
                {
                    type: 'damage',
                    amount: 45,
                    scope: 'target',
                    metadata: {
                        ignoreDamageReduction: true,
                    },
                },
                {
                    type: 'execute_below_hp',
                    threshold: 10,
                    scope: 'target',
                },
            ]
        }
    ]
},
    {
    id: 'inuzuka-kiba',
    characterId: 'inuzuka-kiba',
    name: 'Inuzuka Kiba',
    facePicture: 'https://i.imgur.com/xPWcUtA.png',
    characterdeescription: 'Kiba is a fast-paced, pressure-oriented damage dealer who excels at isolating a single target and mauling them over multiple turns. His kit rewards smart setup and timing rather than raw burst spam. Once Kiba marks an enemy, they become his prey—unable to hide behind damage reduction or invulnerability, and steadily torn apart by repeated strikes.',
    skills: [
        {
            id: 'inuzuka-kiba-fang-over-fang',
            name: 'Fang over Fang',
            skillimage: 'https://i.imgur.com/tODxqPs.png',
            skilldescription: 'Deals 10 damage to one enemy and 5 damage to one random enemy for 2 turns. Kiba gains 10 points of destructible defense for 1 turn.',
            energy: [
                'Taijutsu'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 1,
            classes: [
                'Physical',
                'Ranged',
                'Action',
                'Unique'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'inuzuka_kiba_fang_over_fang_target_rend',
                    duration: 2,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        turnEndDamage: 10,
                        turnEndTrigger: 'source_turn',
                        turnDurationAnchor: 'source_turn',
                        ongoingClass: 'action',
                        triggerOnApply: true,
                        tooltipText: 'This character takes 10 damage each turn.',
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'inuzuka_kiba_fang_over_fang_random_rend',
                    duration: 2,
                    scope: 'random-enemy',
                    metadata: {
                        harmful: true,
                        turnEndTrigger: 'source_turn',
                        turnDurationAnchor: 'source_turn',
                        ongoingClass: 'action',
                        triggerOnApply: true,
                        ignoreSourceNonAfflictionDamageBonus: true,
                        turnEndDamage: 5,
                        tooltipText: 'This character takes 5 damage each turn.',
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'inuzuka_kiba_fang_over_fang_dd',
                    duration: 1,
                    scope: 'self',
                    metadata: {
                        destructibleDefensePoints: 10,
                        tooltipText: 'Kiba has 10 destructible defense.',
                    },
                },
            ]
        },
        {
            id: 'inuzuka-kiba-dynamic-marking',
            name: 'Dynamic Marking',
            skillimage: 'https://i.imgur.com/i3T37zV.png',
            skilldescription: 'One enemy becomes unable to reduce damage or become invulnerable for 2 turns. During this time, they take 10 additional damage from Kiba\'s skills.',
            energy: [
                'none'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 2,
            classes: [
                'Physical',
                'Ranged',
                'Instant',
                'Unique',
                'Affliction'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'inuzuka_kiba_dynamic_marking_lock',
                    duration: 2,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        cannotReduceDamage: true,
                        cannotBecomeInvulnerable: true,
                        tooltipText: 'This character cannot reduce damage or become invulnerable.',
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'inuzuka_kiba_dynamic_marking',
                    duration: 2,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        bonusDamageFromSourceSkillsFlat: 10,
                        bonusDamageFromSourceCharacterId: 'inuzuka-kiba',
                        tooltipText: 'This character takes 10 additional damage from Kiba\'s skills.',
                    },
                },
            ]
        },
        {
            id: 'inuzuka-kiba-twin-headed-wolf',
            name: 'Twin-Headed Wolf',
            skillimage: 'https://i.imgur.com/UIlaRmo.png',
            skilldescription: 'Kiba gains 15 points of damage reduction and deals 15 piercing damage to a random enemy for 3 turns each turn. If an enemy is affected by \'Dynamic Marking\' this will target them instead. This swaps to \'Fang wolf Fang\' while active.',
            energy: [
                'Bloodline',
                'Random'
            ],
            target: 'self',
            damage: 0,
            cooldown: 3,
            classes: [
                'Physical',
                'Melee',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'inuzuka_kiba_twin_headed_wolf',
                    duration: 3,
                    scope: 'self',
                    metadata: {
                        damageReductionFlat: 15,
                        skillReplacements: {
                            'inuzuka-kiba-twin-headed-wolf': 'inuzuka-kiba-fang-wolf-fang',
                        },
                        tooltipText: 'Kiba has 15 damage reduction and Twin-Headed Wolf is replaced by Fang wolf Fang.',
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'inuzuka_kiba_twin_headed_wolf_rend',
                    duration: 3,
                    scope: 'self',
                    metadata: {
                        turnEndRandomEnemyDamage: 15,
                        turnEndRandomEnemyIgnoreDamageReduction: true,
                        turnEndRandomEnemyIgnoreDestructibleDefense: true,
                        turnEndRandomEnemySkillClasses: ['Physical', 'Melee', 'Action'],
                        preferEnemyWithStatusId: 'inuzuka_kiba_dynamic_marking',
                        triggerOnApply: true,
                        tooltipText: 'This character deals 15 piercing damage to a random enemy each turn.',
                    },
                },
            ]
        },
        {
            id: 'inuzuka-kiba-man-beast-clone',
            name: 'Man-Beast Clone',
            skillimage: 'https://i.imgur.com/Y5XIKMo.png',
            skilldescription: 'For 4 turns, Kiba ignores enemy stun effects then makes \'Fang over Fang\' have no cooldown and deal 5 additional damage.',
            energy: [
                'Random'
            ],
            target: 'self',
            damage: 0,
            cooldown: 4,
            classes: [
                'Chakra',
                'Instant',
                'Unique'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'inuzuka_kiba_man_beast_clone',
                    duration: 4,
                    scope: 'self',
                    metadata: {
                        cannotBeStunned: true,
                        skillReplacements: {
                            'inuzuka-kiba-fang-over-fang': 'inuzuka-kiba-fang-over-fang-empowered',
                        },
                        tooltipText: 'Kiba ignores stuns and Fang over Fang has no cooldown and now deals 15 damage to one enemy and 10 damage to one random enemy for 2 turns.',
                    },
                },
            ]
        },
        {
            id: 'inuzuka-kiba-fang-wolf-fang',
            name: 'Fang wolf Fang',
            skillimage: 'https://i.imgur.com/dhx6Qvr.png',
            skilldescription: 'Deals 25 damage to one enemy for 2 turns. Kiba becomes invulnerable for 1 turn.',
            energy: [
                'Taijutsu',
                'Bloodline'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 1,
            classes: [
                'Physical',
                'Action',
                'Melee',
                'Unique'
            ],
            effects: [
                {
                    type: 'damage',
                    amount: 25,
                    scope: 'target',
                },
                {
                    type: 'apply_status',
                    statusId: 'inuzuka_kiba_fang_wolf_fang_dot',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        turnEndDamage: 25,
                        turnEndTrigger: 'source_turn',
                        turnDurationAnchor: 'source_turn',
                        ongoingClass: 'action',
                        tooltipText: 'This character will take 25 damage next turn.',
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'invulnerable',
                    duration: 1,
                    scope: 'self',
                    metadata: {
                        invulnerable: true,
                        tooltipText: 'This character is invulnerable.',
                    },
                },
            ]
        },
        {
            id: 'inuzuka-kiba-fang-over-fang-empowered',
            name: 'Fang over Fang',
            hiddenFromSelectionViewer: true,
            useBaseSkillCooldown: true,
            skillimage: 'https://i.imgur.com/tODxqPs.png',
            skilldescription: 'Deals 15 damage to one enemy and 10 damage to one random enemy for 2 turns. Kiba gains 10 points of destructible defense for 1 turn.',
            energy: [
                'Taijutsu'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 0,
            classes: [
                'Physical',
                'Ranged',
                'Action',
                'Unique'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'inuzuka_kiba_fang_over_fang_empowered_target_rend',
                    duration: 2,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        turnEndDamage: 15,
                        turnEndTrigger: 'source_turn',
                        turnDurationAnchor: 'source_turn',
                        ongoingClass: 'action',
                        triggerOnApply: true,
                        tooltipText: 'This character takes 15 damage each turn.',
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'inuzuka_kiba_fang_over_fang_empowered_random_rend',
                    duration: 2,
                    scope: 'random-enemy',
                    metadata: {
                        harmful: true,
                        turnEndTrigger: 'source_turn',
                        turnDurationAnchor: 'source_turn',
                        ongoingClass: 'action',
                        triggerOnApply: true,
                        ignoreSourceNonAfflictionDamageBonus: true,
                        turnEndDamage: 10,
                        tooltipText: 'This character takes 10 damage each turn.',
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'inuzuka_kiba_fang_over_fang_dd',
                    duration: 1,
                    scope: 'self',
                    metadata: {
                        destructibleDefensePoints: 10,
                        tooltipText: 'Kiba has 10 destructible defense.',
                    },
                },
            ]
        }
    ]
},
    {
    id: 'aburame-shino',
    characterId: 'aburame-shino',
    name: 'Aburame Shino',
    facePicture: 'https://i.imgur.com/iAjJn2w.png',
    characterdeescription: 'Aburame Shino is a calculated, methodical controller who dominates combat through inevitability rather than burst. He excels at locking down a single target, bypassing defenses, and dismantling enemies over time with relentless affliction pressure. Once Shino marks a target, escape becomes impossible—his bugs track, drain, and weaken until the enemy collapses.',
    skills: [
        {
            id: 'aburame-shino-female-bug',
            name: 'Female Bug',
            skillimage: 'https://i.imgur.com/6KPrkAg.png',
            skilldescription: 'Shino directs one of his female bugs to attach itself to one enemy until they die. While affected, Shino\'s skills are improved on them, ignore their invulnerability, and cannot be evaded. This cannot be evaded and will remove itself from the previous target if used on another.',
            energy: [
                'none'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 0,
            classes: [
                'Physical',
                'Ranged',
                'Instant',
                'Unique',
                'Affliction'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'aburame_shino_female_bug',
                    duration: 99,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        cannotBeEvaded: true,
                        uniqueEnemyMarkFromSource: true,
                        bonusDamageFromSourceSkillsFlat: 10,
                        bonusDamageFromSourceCharacterId: 'aburame-shino',
                        cannotEvadeFromSourceCharacterId: 'aburame-shino',
                        ignoreInvulnerabilityFromSourceCharacterId: 'aburame-shino',
                        tooltipText: 'Marked by Female Bug: Shino\'s skills are improved on this enemy, they will also ignore invulnerability and cannot be evaded.',
                    },
                },
            ]
        },
        {
            id: 'aburame-shino-infestation',
            name: 'Infestation',
            skillimage: 'https://i.imgur.com/4q7jf6A.png',
            skilldescription: 'Shino calls millions of bugs to swarm an enemy, dealing 5 affliction damage and lowering their non-affliction damage by 5 permanently (stacks). If they are affected by \'Female Bug\', the damage and lowering effect are doubled.',
            energy: [
                'Random'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 2,
            classes: [
                'Physical',
                'Ranged',
                'Instant',
                'Affliction',
                'Unique'
            ],
            effects: [
                {
                    type: 'damage',
                    amount: 5,
                    scope: 'target',
                    condition: {
                        statusId: 'aburame_shino_female_bug',
                        scope: 'target',
                        conditionalAmount: 10,
                    },
                    metadata: {
                        ignoreDamageReduction: true,
                        ignoreDestructibleDefense: true,
                        afflictionDamage: true
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'aburame_shino_infestation_perma_debuff',
                    duration: 99,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        NonAfflictionDamageDebuff: 5,
                        tooltipText: 'This character deals 5 less non-affliction damage.',
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'aburame_shino_infestation_perma_debuff_bonus',
                    duration: 99,
                    scope: 'target',
                    condition: {
                        statusId: 'aburame_shino_female_bug',
                        scope: 'target',
                    },
                    metadata: {
                        harmful: true,
                        NonAfflictionDamageDebuff: 5,
                        tooltipText: 'This character deals 5 less non-affliction damage.',
                    },
                },
            ]
        },
        {
            id: 'aburame-shino-chakra-leach',
            name: 'Chakra Leach',
            skillimage: 'https://i.imgur.com/ZzFx99m.png',
            skilldescription: 'Shino directs his chakra draining bugs to one enemy, dealing 15 affliction damage for 2 turns and stealing 1 non-bloodline chakra from their chakra pool the following turn. If the target is affected by \'Female Bug\', this instead deals 30 affliction damage and steals 1 non-bloodline chakra instantly.',
            energy: [
                'Bloodline'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 1,
            classes: [
                'Chakra',
                'Ranged',
                'Control',
                'Instant*',
                'Unique',
                'Affliction'
            ],
            effects: [
                {
                    type: 'damage',
                    amount: 0,
                    scope: 'target',
                    condition: {
                        statusId: 'aburame_shino_female_bug',
                        scope: 'target',
                        conditionalAmount: 30,
                    },
                    metadata: {
                        afflictionDamage: true,
                        ignoreDamageReduction: true,
                        ignoreDestructibleDefense: true,
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'aburame_shino_chakra_leach_dot',
                    duration: 2,
                    scope: 'target',
                    condition: {
                        missingStatusId: 'aburame_shino_female_bug',
                        scope: 'target',
                    },
                    metadata: {
                        harmful: true,
                        turnEndDamage: 15,
                        afflictionDamage: true,
                        ignoreDamageReduction: true,
                        ignoreDestructibleDefense: true,
                        turnEndTrigger: 'source_turn',
                        turnDurationAnchor: 'source_turn',
                        triggerOnApply: true,
                        ongoingClass: 'control',
                        tooltipText: 'This character takes 15 affliction damage each turn.',
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'aburame_shino_chakra_leach_drain_next',
                    duration: 1,
                    scope: 'target',
                    condition: {
                        missingStatusId: 'aburame_shino_female_bug',
                        scope: 'target',
                    },
                    metadata: {
                        harmful: true,
                        turnEndDrainNonBloodlineToSource: 1,
                        turnEndTrigger: 'source_turn',
                        turnDurationAnchor: 'source_turn',
                        ongoingClass: 'control',
                        tooltipText: 'Shino will steal 1 non-bloodline chakra next turn.',
                    },
                },
                {
                    type: 'drain_chakra_non_bloodline_from_target_to_self',
                    amount: 1,
                    scope: 'target',
                    condition: {
                        statusId: 'aburame_shino_female_bug',
                        scope: 'target',
                    },
                },
            ]
        },
        {
            id: 'aburame-shino-bug-clone',
            name: 'Bug Clone',
            skillimage: 'https://i.imgur.com/8M9NPsd.png',
            skilldescription: 'This skill makes Aburame Shino invulnerable for 1 turn.',
            energy: [
                'Random'
            ],
            target: 'self',
            damage: 0,
            cooldown: 4,
            classes: [
                'Chakra',
                'Instant',
                'Unique'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'invulnerable',
                    duration: 1,
                    scope: 'self',
                    metadata: {
                        invulnerable: true,
                        tooltipText: 'This character is invulnerable.',
                    },
                },
            ]
        }
    ]
},
    {
    id: 'hyuuga-hinata',
    characterId: 'hyuuga-hinata',
    name: 'Hyuuga Hinata',
    facePicture: 'https://i.imgur.com/0Sa9tPk.png',
    characterdeescription: 'Hyūga Hinata is a defensive pressure specialist who excels at chakra denial, sustained damage, and team protection. When Byakugan is active, Hinata shifts from a cautious support into a battlefield controller, punishing enemies for using skills while reinforcing her allies with layered defenses and healing.',
    skills: [
        {
            id: 'hyuuga-hinata-byakugan',
            name: 'Byakugan',
            skillimage: 'https://i.imgur.com/ifMreas.png',
            skilldescription: 'Hinata activates her Byakugan, making her skills unable to be Evaded, improving her skills, and gaining 10 points of damage reduction for 3 turns.',
            energy: [
                'none'
            ],
            target: 'self',
            damage: 0,
            cooldown: 3,
            classes: [
                'Mental',
                'Ranged',
                'Instant',
                'Unique'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'hyuuga_hinata_byakugan_active',
                    duration: 3,
                    scope: 'self',
                    metadata: {
                        cannotBeEvadedSkills: true,
                        damageReductionFlat: 10,
                        facePictureOverride: 'https://i.imgur.com/x4M9ysf.png',
                        skillReplacements: {
                            'hyuuga-hinata-hinata-gentle-fist': 'hyuuga-hinata-hinata-gentle-fist-byakugan',
                            'hyuuga-hinata-eight-trigrams-64-palms-protection':
                                'hyuuga-hinata-eight-trigrams-64-palms-protection-byakugan',
                            'hyuuga-hinata-hinata-medicine': 'hyuuga-hinata-hinata-medicine-team',
                        },
                        tooltipText:
                            'Hinata has 10 damage reduction, her skills cannot be evaded, and her skills are improved.',
                    },
                },
            ]
        },
        {
            id: 'hyuuga-hinata-hinata-gentle-fist',
            name: 'Hinata Gentle Fist',
            skillimage: 'https://i.imgur.com/k0nWgv6.png',
            skilldescription: 'Using the Hyuuga clan\'s style of taijutsu, Hinata deals 15 damage to one enemy and increasing the cost of their skills by 1 random chakra for 1 turn and then dealing 10 damage to them next turn. During \'Byakugan\', this will increase their skill costs by 1 genjutsu chakra for 1 turn instead.',
            energy: [
                'Genjutsu'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 0,
            classes: [
                'Physical',
                'Melee',
                'Action',
                'Unique'
            ],
            effects: [
                {
                    type: 'damage',
                    amount: 15,
                    scope: 'target',
                },
                {
                    type: 'apply_status',
                    statusId: 'hyuuga_hinata_gentle_fist_cost_lock',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        randomCostIncrease: 1,
                        tooltipText: 'This character\'s skills cost 1 additional random chakra.',
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'hyuuga_hinata_gentle_fist_followup',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        turnEndDamage: 10,
                        turnEndTrigger: 'source_turn',
                        turnDurationAnchor: 'source_turn',
                        ongoingClass: 'action',
                        tooltipText: 'This character will take 10 damage next turn.',
                    },
                },
            ]
        },
        {
            id: 'hyuuga-hinata-eight-trigrams-64-palms-protection',
            name: 'Eight Trigrams 64 Palms Protection',
            skillimage: 'https://i.imgur.com/NHwkyNb.png',
            skilldescription: 'Hinata deals 15 damage to all enemies for 2 turns. For 1 turn, Hinata and her allies have 15 destructible defense and any enemy that breaks the Destructible Defense will lose 1 random chakra. During \'Byakugan\', this skill will deal 5 additional damage and become piercing damage.',
            energy: [
                'Ninjutsu',
                'Random'
            ],
            target: 'all-enemy',
            damage: 0,
            cooldown: 2,
            classes: [
                'Chakra',
                'Melee',
                'Action',
                'Unique',
                'Instant*'
            ],
            effects: [
                {
                    type: 'damage',
                    amount: 15,
                    scope: 'all-enemy',
                },
                {
                    type: 'apply_status',
                    statusId: 'hyuuga_hinata_64_palms_followup',
                    duration: 1,
                    scope: 'all-enemy',
                    metadata: {
                        harmful: true,
                        turnEndDamage: 15,
                        turnEndTrigger: 'source_turn',
                        turnDurationAnchor: 'source_turn',
                        ongoingClass: 'action',
                        tooltipText: 'This character will take 15 damage next turn.',
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'hyuuga_hinata_64_palms_dd',
                    duration: 1,
                    scope: 'all-allies',
                    metadata: {
                        destructibleDefensePoints: 15,
                        loseRandomChakraOnBreakByEnemy: true,
                        tooltipText: 'This character has 15 destructible defense. Any enemy that breaks the Destructible Defense will lose 1 random chakra.',
                    },
                },
            ]
        },
        {
            id: 'hyuuga-hinata-hinata-medicine',
            name: 'Hinata Medicine',
            skillimage: 'https://i.imgur.com/68O6hme.png',
            skilldescription: 'Heals one ally or herself 15% their current health every turn for 2 turns. This may not be used on an already affected target. During \'Byakugan\' this will affect Hinata\'s whole team.',
            energy: [
                'Random'
            ],
            target: 'self-or-single-ally',
            targetCondition: {
                missingStatusId: 'hyuuga_hinata_medicine_regen',
            },
            damage: 0,
            cooldown: 2,
            classes: [
                'Physical',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'hyuuga_hinata_medicine_regen',
                    duration: 2,
                    scope: 'target',
                    metadata: {
                        turnEndHealPercentCurrent: 15,
                        triggerOnApply: true,
                        tooltipText: 'This character heals 15% of current health each turn.',
                    },
                },
            ]
        },
        {
            id: 'hyuuga-hinata-hinata-gentle-fist-byakugan',
            name: 'Hinata Gentle Fist',
            hiddenFromSelectionViewer: true,
            useBaseSkillCooldown: true,
            skillimage: 'https://i.imgur.com/k0nWgv6.png',
            skilldescription: 'Using the Hyuuga clan\'s style of taijutsu, Hinata deals 15 damage to one enemy and increasing the cost of their skills by 1 genjutsu chakra for 1 turn and then dealing 10 damage to them next turn.',
            energy: [
                'Genjutsu'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 0,
            classes: [
                'Physical',
                'Melee',
                'Action',
                'Unique'
            ],
            effects: [
                {
                    type: 'damage',
                    amount: 15,
                    scope: 'target',
                },
                {
                    type: 'apply_status',
                    statusId: 'hyuuga_hinata_gentle_fist_cost_lock_byakugan',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        genjutsuCostIncrease: 1,
                        tooltipText: 'This character\'s skills cost 1 additional genjutsu chakra.',
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'hyuuga_hinata_gentle_fist_followup',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        turnEndDamage: 10,
                        turnEndTrigger: 'source_turn',
                        turnDurationAnchor: 'source_turn',
                        ongoingClass: 'action',
                        tooltipText: 'This character will take 10 damage next turn.',
                    },
                },
            ]
        },
        {
            id: 'hyuuga-hinata-eight-trigrams-64-palms-protection-byakugan',
            name: 'Eight Trigrams 64 Palms Protection',
            hiddenFromSelectionViewer: true,
            useBaseSkillCooldown: true,
            skillimage: 'https://i.imgur.com/NHwkyNb.png',
            skilldescription: 'Hinata deals 20 piercing damage to all enemies for 2 turns. For 1 turn, Hinata and her allies have 15 destructible defense. Any enemy that breaks the Destructible Defense will lose 1 random chakra.',
            energy: [
                'Ninjutsu',
                'Random'
            ],
            target: 'all-enemy',
            damage: 0,
            cooldown: 2,
            classes: [
                'Chakra',
                'Melee',
                'Action',
                'Unique',
                'Instant*'
            ],
            effects: [
                {
                    type: 'damage',
                    amount: 20,
                    scope: 'all-enemy',
                    metadata: {
                        ignoreDamageReduction: true,
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'hyuuga_hinata_64_palms_followup_byakugan',
                    duration: 1,
                    scope: 'all-enemy',
                    metadata: {
                        harmful: true,
                        turnEndDamage: 20,
                        turnEndTrigger: 'source_turn',
                        turnDurationAnchor: 'source_turn',
                        ongoingClass: 'action',
                        ignoreTargetDamageReduction: true,
                        tooltipText: 'This character will take 20 piercing damage next turn.',
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'hyuuga_hinata_64_palms_dd',
                    duration: 1,
                    scope: 'all-allies',
                    metadata: {
                        destructibleDefensePoints: 15,
                        loseRandomChakraOnBreakByEnemy: true,
                        tooltipText: 'This character has 15 destructible defense. Any enemy that breaks the Destructible Defense will lose 1 random chakra.',
                    },
                },
            ]
        },
        {
            id: 'hyuuga-hinata-hinata-medicine-team',
            name: 'Hinata Medicine',
            hiddenFromSelectionViewer: true,
            useBaseSkillCooldown: true,
            skillimage: 'https://i.imgur.com/68O6hme.png',
            skilldescription: 'Heals Hinata\'s whole team for 15% of current health every turn for 2 turns.',
            energy: [
                'Random'
            ],
            target: 'all-allies',
            damage: 0,
            cooldown: 2,
            classes: [
                'Physical',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'hyuuga_hinata_medicine_regen',
                    duration: 2,
                    scope: 'all-allies',
                    metadata: {
                        turnEndHealPercentCurrent: 15,
                        triggerOnApply: true,
                        tooltipText: 'This character heals 15% of current health each turn.',
                    },
                },
            ]
        }
    ]
},
    {
    id: 'NaraShikamaru',
    characterId: 'NaraShikamaru',
    name: 'Nara Shikamaru',
    facePicture: 'https://i.imgur.com/hr2kmUW.png',
    characterdeescription: 'A Genin from Team 10, a member of the Nara clan, Shikamaru is considered to be the smartest Genin of all the Konoha 11. Using his bloodline, Shikamaru can manipulate the shadows in the battlefield to disable and attack his enemies.',
    skills: [
        {
            id: 'Meditate',
            name: 'Meditate',
            skillimage: 'https://i.imgur.com/QJDOAa8.png',
            skilldescription: 'For 3 turns, Shikamaru gains 1 additional random chakra per turn and takes 10 less damage from all sources.',
            energy: [
                'random'
            ],
            target: 'self',
            damage: 0,
            cooldown: 4,
            classes: [
                'Strategic',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'shikamaru_meditate',
                    duration: 3,
                    scope: 'self',
                    metadata: {
                        additionalRandomChakraPerTurn: 1,
                        damageReductionFlat: 10,
                        tooltipText:
                            'Shikamaru gains 1 additional random chakra per turn and takes 10 less damage.',
                    },
                },
            ],
        },
        {
            id: 'ShadowNeckBind',
            name: 'Shadow-Neck Bind',
            skillimage: 'https://i.imgur.com/MGok5HR.png',
            skilldescription: 'Deal 15 damage to all enemies and prevent them from reducing damage and becoming invulnerable for 1 turn.',
            energy: [
                'Genjutsu'
            ],
            target: 'all-enemy',
            damage: 15,
            cooldown: 1,
            classes: [
                'Strategic',
                'Instant'
            ],
            effects: [
                {
                    type: 'damage',
                    amount: 15,
                    scope: 'all-enemy',
                },
                {
                    type: 'apply_status',
                    statusId: 'shadow_neck_bind_lockdown',
                    duration: 1,
                    scope: 'all-enemy',
                    metadata: {
                        harmful: true,
                        cannotBecomeInvulnerable: true,
                        cannotReduceDamage: true,
                        tooltipText:
                            'This character cannot reduce damage or become invulnerable this turn.',
                    },
                },
            ],
        },
        {
            id: 'ShadowImitation',
            name: 'Shadow Imitation',
            skillimage: 'https://i.imgur.com/IqaYmyn.png',
            skilldescription: 'Stun all enemies for 1 turn.',
            energy: [
                'Genjutsu',
                'Genjutsu'
            ],
            target: 'all-enemy',
            damage: 0,
            cooldown: 2,
            classes: [
                'Strategic',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'stunned',
                    duration: 1,
                    scope: 'all-enemy',
                    metadata: {
                        harmful: true,
                        cannotUseSkills: true,
                        tooltipText: 'This character is stunned and cannot use skills.',
                    },
                },
            ],
        },
        {
            id: 'ShikamaruHide',
            name: 'Shikamaru Hide',
            skillimage: 'https://i.imgur.com/YJt3VRX.png',
            skilldescription: 'This skill makes Nara Shikamaru invulnerable for 1 turn.',
            energy: [
                'Random'
            ],
            target: 'self',
            damage: 0,
            cooldown: 4,
            classes: [
                'Strategic',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'invulnerable',
                    duration: 1,
                    scope: 'self',
                    metadata: {
                        invulnerable: true,
                        tooltipText: 'This character is invulnerable.',
                    },
                },
            ],
        }
    ]
},
    {
    id: 'AkimichiChouji',
    characterId: 'AkimichiChouji',
    name: 'Akimichi Chouji',
    facePicture: 'https://i.imgur.com/cQKRlLk.png',
    characterdeescription: 'A Genin from Team 10, Chouji is a member of the Akimichi clan, a large eater, and a close friend to his allies. While innately strong, Chouji is able to sacrifice his own life using special pills from his clan to become insanely powerful.',
    skills: [
        {
            id: 'PartialDoubleSize',
            name: 'Partial Double Size',
            skillimage: 'https://i.imgur.com/4ToTD15.png',
            skilldescription: 'Deal 20 damage to one enemy. For 2 turns, Chouji takes 5 less damage from physical classed skills.',
            energy: [
                'Taijutsu'
            ],
            target: 'single-enemy',
            damage: 20,
            cooldown: 1,
            classes: [
                'Physical',
                'Melee',
                'Instant'
            ],
            effects: [
                {
                    type: 'damage',
                    amount: 20,
                },
                {
                    type: 'apply_status',
                    statusId: 'partial_double_size_guard',
                    duration: 2,
                    scope: 'self',
                    metadata: {
                        physicalDamageReductionFlat: 5,
                        tooltipText: 'Chouji takes 5 less damage from physical skills.',
                    },
                },
            ],
        },
        {
            id: 'Meattank',
            name: 'Meat Tank',
            skillimage: 'https://i.imgur.com/nLkOqdy.png',
            skilldescription: 'Deal 10 damage to one enemy for 2 turns and become invulnerable for 2 turns. Chouji cannot use other skills while this is active.',
            energy: [
                'Bloodline'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 2,
            classes: [
                'Physical',
                'Melee',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'meat_tank_dot',
                    duration: 2,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        turnEndDamage: 10,
                        turnEndTrigger: 'source_turn',
                        turnDurationAnchor: 'source_turn',
                        triggerOnApply: true,
                        scaleWithSourceDamageBonus: true,
                        tooltipText: 'This character takes 10 damage.',
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'meat_tank_active',
                    duration: 2,
                    scope: 'self',
                    metadata: {
                        invulnerable: true,
                        cannotUseSkills: true,
                        tooltipText: 'Chouji is invulnerable and cannot use other skills.',
                    },
                },
            ],
        },
        {
            id: 'AkimichiPills',
            name: 'Akimichi Pills',
            skillimage: 'https://i.imgur.com/9QmznME.png',
            skilldescription: 'For the rest of the game, Choujis skills deal 15 additional damage and he takes 15 affliction damage per turn. This skill can only be used once.',
            energy: [
                'Random'
            ],
            target: 'self',
            damage: 0,
            cooldown: 0,
            classes: [
                'Physical',
                'Melee',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'akimichi_pills_power',
                    duration: 99,
                    scope: 'self',
                    applyPolicy: 'if_missing_at_cast_start',
                    metadata: {
                        damageBonusFlat: 15,
                        turnEndDamage: 15,
                        afflictionDamage: true,
                        tooltipText:
                            'For the rest of the game, Chouji deals 15 additional damage and takes 15 affliction damage each turn.',
                    },
                },
            ],
        },
        {
            id: 'EffortlessBlock',
            name: 'Effortless Block',
            skillimage: 'https://i.imgur.com/SVGD225.png',
            skilldescription: 'This skill makes Akimichi Chouji invulnerable for 1 turn.',
            energy: [
                'Random'
            ],
            target: 'self',
            damage: 0,
            cooldown: 4,
            classes: [
                'Physical',
                'Melee',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'invulnerable',
                    duration: 1,
                    scope: 'self',
                    metadata: {
                        invulnerable: true,
                        tooltipText: 'This character is invulnerable.',
                    },
                },
            ],
        }
    ]
},
    {
    id: 'YamanakaIno',
    characterId: 'YamanakaIno',
    name: 'Yamanaka Ino',
    facePicture: 'https://i.imgur.com/K6WiIiF.png',
    characterdeescription: 'A Genin from Team 10, Ino is a member of the Yamanaka clan, and a very confident and vain girl. Ino is able to use a variety of abilities to take over and control her enemies, making it difficult to tell friend from foe.',
    skills: [
        {
            id: 'MindBodyDisturbance',
            name: 'Mind Body Disturbance',
            skillimage: 'https://i.imgur.com/rwTWXOR.png',
            skilldescription: 'Stun one enemy for 1 turn. That enemy cannot reduce damage or become invulnerable. One random enemy takes 20 piercing damage.',
            energy: [
                'Genjutsu'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 1,
            classes: [
                'Strategic',
                'Ranged',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'stunned',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        cannotUseSkills: true,
                        tooltipText: 'This character is stunned and cannot use skills.',
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'mind_body_disturbance_lock',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        cannotReduceDamage: true,
                        cannotBecomeInvulnerable: true,
                        tooltipText: 'This character cannot reduce damage or become invulnerable.',
                    },
                },
                {
                    type: 'damage',
                    amount: 20,
                    scope: 'random-enemy',
                },
            ],
        },
        {
            id: 'MindBodySwitch',
            name: 'Mind Body Switch',
            skillimage: 'https://i.imgur.com/FBzWCpT.png',
            skilldescription: 'For 3 turns, target one enemy and stun them. During this time, Ino cannot use skills and takes double damage, but the stunned enemys team cannot target Inos allies.',
            energy: [
                'Genjutsu',
                'Genjutsu'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 3,
            classes: [
                'Strategic',
                'Ranged',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'stunned',
                    duration: 3,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        cannotUseSkills: true,
                        tooltipText: 'This character is stunned and cannot use skills.',
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'mind_body_switch_self',
                    duration: 3,
                    scope: 'self',
                    metadata: {
                        cannotUseSkills: true,
                        damageTakenMultiplier: 2,
                        tooltipText: 'Ino cannot use skills and takes double damage.',
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'mind_body_switch_lock',
                    duration: 3,
                    scope: 'all-enemy',
                    metadata: {
                        tooltipText: "This character cannot target Ino's allies.",
                    },
                },
            ],
        },
        {
            id: 'ChakraHairStrandTrap',
            name: 'Chakra Hair Strand Trap',
            skillimage: 'https://i.imgur.com/QzC31dc.png',
            skilldescription: 'For 2 turns, if any enemy uses a new harmful skill, they will have all their skill cooldowns increased by 1 turn. During this time, this skill becomes Art of the Valentine.',
            energy: [
                'Random'
            ],
            target: 'all-enemy',
            damage: 0,
            cooldown: 3,
            classes: [
                'Strategic',
                'Ranged',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'chakra_hair_strand_trap',
                    duration: 2,
                    scope: 'self',
                    metadata: {
                        harmfulSkillCooldownPenalty: 1,
                        skillReplacements: {
                            ChakraHairStrandTrap: 'ArtoftheValentine',
                        },
                        tooltipText:
                            'This skill is now Art of the Valentine.',
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'chakra_hair_strand_trap_warning',
                    duration: 2,
                    scope: 'all-enemy',
                    metadata: {
                        tooltipText:
                            'If this character uses a new skill, that skill cooldown is increased by 1 turn.',
                    },
                },
            ],
        },
        {
            id: 'InoBlock',
            name: 'Ino Block',
            skillimage: 'https://i.imgur.com/nwbylEp.png',
            skilldescription: 'This skill makes Yamanaka Ino invulnerable for 1 turn.',
            energy: [
                'Random'
            ],
            target: 'self',
            damage: 0,
            cooldown: 4,
            classes: [
                'Strategic',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'invulnerable',
                    duration: 1,
                    scope: 'self',
                    metadata: {
                        invulnerable: true,
                        tooltipText: 'This character is invulnerable.',
                    },
                },
            ],
        },
                {
            id: 'ArtoftheValentine',
            name: 'Art of the Valentine',
            skillimage: 'https://i.imgur.com/CQcDCxx.png',
            skilldescription: 'Deal 25 damage to one enemy.',
            energy: [
                'Random'
            ],
            target: 'single-enemy',
            damage: 25,
            cooldown: 1,
            classes: [
                'Strategic',
                'Instant'
            ],
            effects: [
                {
                    type: 'damage',
                    amount: 25,
                },
            ],
        }
    ]
},
    {
    id: 'rock-lee',
    characterId: 'rock-lee',
    name: 'Rock Lee',
    facePicture: 'https://i.imgur.com/e11I0eR.png',
    characterdeescription: 'Rock Lee is a relentless close-range fighter who overwhelms enemies with speed, precision, and unbreakable discipline. Specializing in fast combos, pressure control, and survivability through pure taijutsu, Lee rewards aggressive play and skillful timing, turning momentum into constant advantage on the battlefield.',
    skills: [
        {
            id: 'rock-lee-high-speed-taijutsu',
            name: 'High Speed Taijutsu',
            skillimage: 'https://i.imgur.com/dq0vpYR.png',
            skilldescription: 'Lee attacks one enemy with amazing speed, dealing 15 damage to them. For 1 turn, \'Strong Front Kick\' will deal 20 damage then mark its target and Lee will have a 15% chance to Evade enemy non-mental skills.',
            energy: [
                'Random'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 0,
            classes: [
                'Physical',
                'Melee',
                'Instant'
            ],
            effects: [
                {
                    type: 'damage',
                    amount: 15,
                    scope: 'target',
                },
                {
                    type: 'apply_status',
                    statusId: 'rock_lee_high_speed_taijutsu_buff',
                    duration: 1,
                    scope: 'self',
                    metadata: {
                        evadeChancePercent: 15,
                        evadeAgainstNonMental: true,
                        skillReplacements: {
                            'rock-lee-strong-front-kick': 'rock-lee-strong-front-kick-empowered',
                        },
                        tooltipText: 'Strong Front Kick is improved and rock lee has a 15% chance to evade enemy non-mental skills.',
                    },
                },
            ]
        },
        {
            id: 'rock-lee-blowing-kisses',
            name: 'Blowing Kisses',
            skillimage: 'https://i.imgur.com/ZH5Jfzy.png',
            skilldescription: 'Targets an enemy for 1 turn. If they use a new skill, Lee heals 10 HP and they take 10 additional damage from him permanently, stacking up to 3 times. This skill is invisible (but its stacks aren\'t).',
            energy: [
                'none'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 2,
            classes: [
                'Mental',
                'Ranged',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'rock_lee_blowing_kisses_watch',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        onOwnerUseSkillTrigger: true,
                        onOwnerUseSkillHealSourceAmount: 10,
                        onOwnerUseSkillApplyStatusToOwner: {
                            statusId: 'rock_lee_blowing_kisses_vulnerability',
                            duration: 99,
                            metadata: {
                                harmful: true,
                                bonusDamageFromSourceCharacterId: 'rock-lee',
                                bonusDamageFromSourceSkillsPerStack: 10,
                                bonusDamageFromSourceSkillsPerStackMetadataKey: 'blowingKissesStacks',
                                blowingKissesStacks: 1,
                                stackMetadataKey: 'blowingKissesStacks',
                                stackDelta: 1,
                                stackMax: 3,
                                tooltipTextTemplate: 'This character takes {stacks}0 additional damage from Rock Lee\'s skills.',
                            },
                        },
                        hideTooltipFromUnitOwner: true,
                        tooltipText: 'If this character uses a new skill, Lee heals 10 HP and they take 10 additional damage from him permanently.',
                    },
                },
            ]
        },
        {
            id: 'rock-lee-strong-front-kick',
            name: 'Strong Front Kick',
            skillimage: 'https://i.imgur.com/d8vV5rn.png',
            skilldescription: 'Lee marks an enemy and gains 10 destructible defense for 1 turn. When the mark ends, the target takes 30 damage. Next turn, \'High Speed Taijutsu\' deals 10 additional damage and grants 10% additional Evasion.',
            energy: [
                'Taijutsu'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 1,
            classes: [
                'Physical',
                'Melee',
                'Control'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'rock_lee_strong_front_kick_mark',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        turnEndDamage: 30,
                        turnEndTrigger: 'source_turn',
                        turnDurationAnchor: 'source_turn',
                        ongoingClass: 'action',
                        tooltipText: 'When this mark ends, this character takes 30 damage.',
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'rock_lee_front_kick_defense',
                    duration: 1,
                    scope: 'self',
                    metadata: {
                        destructibleDefensePoints: 10,
                        tooltipText: 'Rock Lee has 10 destructible defense.',
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'rock_lee_front_kick_next_turn_delay',
                    duration: 1,
                    scope: 'self',
                    metadata: {
                        triggerOnApply: true,
                        turnEndTrigger: 'source_turn',
                        turnDurationAnchor: 'source_turn',
                        hideTooltip: true,
                        turnEndApplyStatusToSelf: {
                            statusId: 'rock_lee_front_kick_next_turn_buff',
                            duration: 1,
                            metadata: {
                                skillDamageBonuses: {
                                    'rock-lee-high-speed-taijutsu': 10,
                                },
                                evadeChancePercent: 10,
                                evadeAgainstNonMental: true,
                                tooltipText: 'Next turn High Speed Taijutsu deals 10 additional damage and this character gains 10% additional evade chance.',
                            },
                            fresh: false,
                        },
                    },
                },
            ]
        },
        {
            id: 'rock-lee-taijutsu-guard',
            name: 'Taijutsu Guard',
            skillimage: 'https://i.imgur.com/B2ovfhp.png',
            skilldescription: 'Rock Lee targets himself or an ally for 1 turn. If an enemy uses a new harmful skill on them, they will be countered. If successful, the countered enemy will have \'High Speed Taijutsu\' cast on them. This skill is invisible.',
            energy: [
                'Random'
            ],
            target: 'self-or-single-ally',
            damage: 0,
            cooldown: 2,
            classes: [
                'Physical',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'rock_lee_taijutsu_guard',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        triggerOnEnemyHarmfulSkill: true,
                        counterCancelsSkill: true,
                        counterDamage: 15,
                        turnDurationAnchor: 'source_turn',
                        counterApplyStatusToSourceOwner: {
                            statusId: 'rock_lee_high_speed_taijutsu_buff',
                            duration: 1,
                            metadata: {
                                evadeChancePercent: 15,
                                evadeAgainstNonMental: true,
                                skillReplacements: {
                                    'rock-lee-strong-front-kick': 'rock-lee-strong-front-kick-empowered',
                                },
                                tooltipText: 'Strong Front Kick is improved and Rock Lee has a 15% chance to evade enemy non-mental skills.',
                            },
                        },
                        usedStatusId: 'rock_lee_taijutsu_guard_used',
                        usedStatusDuration: 1,
                        usedStatusMetadata: {
                            tooltipText: 'This skill has been used.',
                        },
                        onExpireApplyStatusToSelf: {
                            statusId: 'rock_lee_taijutsu_guard_used',
                            duration: 1,
                            metadata: {
                                tooltipText: 'This skill has been used.',
                            },
                        },
                        hideTooltipFromEnemy: true,
                        tooltipText: 'The next enemy harmful skill on Rock Lee is countered.',
                    },
                },
            ]
        },
        {
            id: 'rock-lee-strong-front-kick-empowered',
            name: 'Strong Front Kick',
            hiddenFromSelectionViewer: true,
            skillimage: 'https://i.imgur.com/d8vV5rn.png',
            skilldescription: 'Lee deals 20 damage to one enemy, marks them, and gains 10 destructible defense for 1 turn. When the mark ends, the target takes 30 damage. Next turn, High Speed Taijutsu deals 10 additional damage and grants 10% additional Evasion.',
            energy: [
                'Taijutsu'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 1,
            classes: [
                'Physical',
                'Melee',
                'Control'
            ],
            effects: [
                {
                    type: 'damage',
                    amount: 20,
                    scope: 'target',
                },
                {
                    type: 'apply_status',
                    statusId: 'rock_lee_strong_front_kick_mark',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        turnEndDamage: 30,
                        turnEndTrigger: 'source_turn',
                        turnDurationAnchor: 'source_turn',
                        ongoingClass: 'action',
                        tooltipText: 'When this mark ends, this character takes 30 damage.',
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'rock_lee_front_kick_defense',
                    duration: 1,
                    scope: 'self',
                    metadata: {
                        destructibleDefensePoints: 10,
                        tooltipText: 'Rock Lee has 10 destructible defense.',
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'rock_lee_high_speed_taijutsu_buff2',
                    duration: 1,
                    scope: 'self',
                    metadata: {
                        evadeChancePercent: 15,
                        evadeAgainstNonMental: true,
                        skillReplacements: {
                            'rock-lee-high-speed-taijutsu': 'rock-lee-high-speed-taijutsu-empowered',
                        },
                        tooltipText: 'High Speed Taijutsu is improved.',
                    },
                },
            ]
        },
                {
            id: 'rock-lee-high-speed-taijutsu-empowered',
            name: 'High Speed Taijutsu',
            hiddenFromSelectionViewer: true,
            skillimage: 'https://i.imgur.com/dq0vpYR.png',
            skilldescription: 'Lee attacks one enemy with amazing speed, dealing 25 damage to them. For 1 turn, \'Strong Front Kick\' will deal 20 damage then mark its target and Lee will have a 25% chance to Evade enemy non-mental skills.',
            energy: [
                'Random'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 0,
            classes: [
                'Physical',
                'Melee',
                'Instant'
            ],
            effects: [
                {
                    type: 'damage',
                    amount: 25,
                    scope: 'target',
                },
                {
                    type: 'apply_status',
                    statusId: 'rock_lee_high_speed_taijutsu_buff',
                    duration: 1,
                    scope: 'self',
                    metadata: {
                        evadeChancePercent: 25,
                        evadeAgainstNonMental: true,
                        skillReplacements: {
                            'rock-lee-strong-front-kick': 'rock-lee-strong-front-kick-empowered',
                        },
                        tooltipText: 'Strong Front Kick is improved and rock lee has a 25% chance to evade enemy non-mental skills.',
                    },
                },
            ]
        },
    ]
},,
    {
    id: 'KonohamaruSarutobi',
    characterId: 'KonohamaruSarutobi',
    name: 'Konohamaru Sarutobi',
    facePicture: 'https://i.imgur.com/fRE42ie.png',
    characterdeescription: 'Konohamaru Sarutobi is a tactical support fighter who controls the flow of battle through disruption and setup rather than raw damage. He excels at taunting enemies, protecting allies, and generating chakra through smart skill sequencing, making him a tempo-focused utility character built around control and synergy.',
    skills: [
        {
            id: 'UnsteadyShuriken',
            name: 'Unsteady Shuriken',
            skillimage: 'https://i.imgur.com/oHkRzpf.png',
            skilldescription: 'Deals 20 damage to one enemy. The next use of this skill deals +5 bonus damage and removes the bonus effect (active until used). If the target is affected by \'Not-So-Sexy Jutsu\', the taunt duration is extended by 1 turn.',
            energy: [
                'Random'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 0,
            classes: [
                'Physical',
                'Ranged',
                'Instant'
            ],
            effects: [
                {
                    type: 'damage',
                    amount: 20,
                    condition: {
                        statusId: 'konohamaru_unsteady_shuriken_bonus',
                        scope: 'self',
                        conditionalAmount: 25,
                        consumeOnMatch: true,
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'konohamaru_unsteady_shuriken_bonus',
                    duration: 99,
                    scope: 'self',
                    applyPolicy: 'if_missing_at_cast_start',
                    metadata: {
                        tooltipText: 'Unsteady Shuriken will deal 25 damage on next use.',
                    },
                },
                {
                    type: 'extend_status',
                    scope: 'target',
                    targetStatusId: 'konohamaru_not_so_sexy_taunt',
                    amount: 1,
                },
                {
                    type: 'apply_status',
                    statusId: 'konohamaru_last_skill_used',
                    duration: 99,
                    scope: 'self',
                    metadata: {
                        lastSkillId: 'UnsteadyShuriken',
                        tooltipText: 'Konohamaru\'\s Last Skill Used: Unsteady Shuriken',
                    },
                },
            ]
        },
        {
            id: 'Not-So-SexyJutsu',
            name: 'Not-So-Sexy Jutsu',
            skillimage: 'https://i.imgur.com/cCNGzMj.png',
            skilldescription: 'Konohamaru heals 15 HP and Ignores enemy stuns for 1 turn. Applies \'Taunt\' to one enemy for 1 turn.',
            energy: [
                'Random'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 1,
            classes: [
                'Chakra',
                'Melee',
                'Instant'
            ],
            effects: [
                {
                    type: 'heal',
                    amount: 15,
                    scope: 'self',
                },
                {
                    type: 'apply_status',
                    statusId: 'konohamaru_ignore_stuns',
                    duration: 1,
                    scope: 'self',
                    metadata: {
                        cannotBeStunned: true,
                        tooltipText: 'Konohamaru ignores stuns.',
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'konohamaru_not_so_sexy_taunt',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        taunt: true,
                        turnDurationAnchor: 'source_turn',
                        tooltipText: 'This character is taunted and can only target Konohamaru.',
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'konohamaru_last_skill_used',
                    duration: 99,
                    scope: 'self',
                    metadata: {
                        lastSkillId: 'Not-So-SexyJutsu',
                        tooltipText: 'Konohamaru\'\s Last Skill Used: Not-So-Sexy Jutsu',
                    },
                },
            ]
        },
        {
            id: 'HideandSeek',
            name: 'Hide and Seek',
            skillimage: 'https://i.imgur.com/fEGHc3E.png',
            skilldescription: 'Target one ally. They become invulnerable to enemy non-affliction skills for 1 turn. The next turn, \'Not-So-Sexy Jutsu\' targets all allies and all enemies.',
            energy: [
                'Random'
            ],
            target: 'single-ally',
            damage: 0,
            cooldown: 1,
            classes: [
                'Mental',
                'Instant',
                'Unique'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'konohamaru_hide_seek_guard',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        invulnerableToNonAffliction: true,
                        tooltipText: 'This character is invulnerable to non-affliction enemy skills.',
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'konohamaru_hide_seek_empower',
                    duration: 1,
                    scope: 'self',
                    metadata: {
                        skillReplacements: {
                            'Not-So-SexyJutsu': 'Not-So-SexyJutsuAll',
                        },
                        tooltipText: 'Not-So-Sexy Jutsu targets all enemies this turn.',
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'konohamaru_last_skill_used',
                    duration: 99,
                    scope: 'self',
                    metadata: {
                        lastSkillId: 'HideandSeek',
                        tooltipText: 'Konohamaru\'\s Last Skill Used: Hide and Seek',
                    },
                },
            ]
        },
        {
            id: 'ChakraBuilding',
            name: 'Chakra Building',
            skillimage: 'https://i.imgur.com/5VG0cE3.png',
            skilldescription: 'Gain 1 chakra based on the last skill used: If \'Unsteady Shuriken\': Gain 1 Taijutsu. If \'Not-So-Sexy Jutsu\': Gain 1 Ninjutsu. If \'Hide and Seek\': Gain 1 Genjutsu.',
            energy: [
                'None'
            ],
            target: 'self',
            damage: 0,
            cooldown: 3,
            classes: [],
            effects: [
                {
                    type: 'gain_chakra_by_last_skill',
                    statusId: 'konohamaru_last_skill_used',
                    amount: 1,
                    map: {
                        'UnsteadyShuriken': 'taijutsu',
                        'Not-So-SexyJutsu': 'ninjutsu',
                        'HideandSeek': 'genjutsu',
                    },
                },
            ]
        },
        {
            id: 'Not-So-SexyJutsuAll',
            name: 'Not-So-Sexy Jutsu',
            skillimage: 'https://i.imgur.com/cCNGzMj.png',
            skilldescription: 'Konohamaru heals 15 HP and Ignores enemy stuns for 1 turn. Applies \'Taunt\' to all enemies for 1 turn.',
            hiddenFromSelectionViewer: true,
            useBaseSkillCooldown: true,
            energy: [
                'Random'
            ],
            target: 'all-enemy',
            damage: 0,
            cooldown: 1,
            classes: [
                'Chakra',
                'Melee',
                'Instant'
            ],
            effects: [
                {
                    type: 'heal',
                    amount: 15,
                    scope: 'all-allies',
                },
                {
                    type: 'apply_status',
                    statusId: 'konohamaru_ignore_stuns',
                    duration: 1,
                    scope: 'all-allies',
                    metadata: {
                        cannotBeStunned: true,
                        tooltipText: 'This character ignores stuns.',
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'konohamaru_not_so_sexy_taunt',
                    duration: 1,
                    scope: 'all-enemy',
                    metadata: {
                        harmful: true,
                        taunt: true,
                        turnDurationAnchor: 'source_turn',
                        tooltipText: 'This character is taunted and can only target Konohamaru.',
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'konohamaru_last_skill_used',
                    duration: 99,
                    scope: 'self',
                    metadata: {
                        lastSkillId: 'Not-So-SexyJutsu',
                        tooltipText: 'Konohamaru\'\s Last Skill Used: Not-So-Sexy Jutsu',
                    },
                },
            ]
        }
    ]
},
    {
    id: 'young-gaara',
    characterId: 'young-gaara',
    name: 'Young Gaara',
    facePicture: 'https://i.imgur.com/oBENb9n.png',
    characterdeescription: 'Young Gaara is a control-focused pressure fighter who weakens enemies through Sand Pressure stacks, disrupts their resources, and converts setup into precise execution damage. When Shukaku is unleashed, he shifts into a dominant battlefield presence, applying sustained pressure and area damage to overwhelm teams through tempo, attrition, and relentless momentum.',
    skills: [
        {
            id: 'young-gaara-amateur-desert-graveyard',
            name: 'Amateur Desert Graveyard',
            skillimage: 'https://i.imgur.com/t7E2DrU.png',
            skilldescription: 'Gaara crushes one enemy with compressed sand, dealing 22 piercing damage. Consumes all Sand Pressure stacks on the target to deal +6 damage per stack. If at least 2 stacks are consumed, the target\'s non-mental skills are stunned for 1 turn.',
            energy: [
                'Bloodline'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 0,
            classes: [
                'Physical',
                'Ranged',
                'Instant',
                'Unique'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'young_gaara_non_mental_stun',
                    duration: 1,
                    scope: 'target',
                    condition: {
                        scope: 'target',
                        statusMetadataAtLeast: {
                            statusId: 'young_gaara_sand_pressure',
                            metadataKey: 'sandPressureStacks',
                            value: 2,
                        },
                    },
                    metadata: {
                        harmful: true,
                        cannotUseNonMentalSkills: true,
                        tooltipText: 'This character non-mental skills are stunned.',
                    },
                },
                {
                    type: 'damage',
                    amount: 22,
                    scope: 'target',
                    metadata: {
                        ignoreDamageReduction: true,
                        ignoreDestructibleDefense: true,
                        bonusPerStatusMetadata: {
                            statusId: 'young_gaara_sand_pressure',
                            metadataKey: 'sandPressureStacks',
                            multiplier: 6,
                            consumeStatus: true,
                        },
                    },
                },
            ]
        },
        {
            id: 'young-gaara-amateur-desert-coffin',
            name: 'Amateur Desert Coffin',
            skillimage: 'https://i.imgur.com/uY202CN.png',
            skilldescription: 'Gaara binds one enemy with sand, dealing 10 piercing damage, increasing their non-mental skills by 1 random chakra for 1 turn, and applying 1 Sand Pressure stack.',
            energy: [
                'Random'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 0,
            classes: [
                'Physical',
                'Ranged',
                'Instant',
                'Unique'
            ],
            effects: [
                {
                    type: 'damage',
                    amount: 10,
                    scope: 'target',
                    metadata: {
                        ignoreDamageReduction: true,
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'young_gaara_non_mental_cost_up',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        nonMentalRandomCostIncrease: 1,
                        tooltipText: 'This character non-mental skills cost 1 additional random chakra.',
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'young_gaara_sand_pressure',
                    duration: 3,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        refreshSameStatusOnEnemyTeam: true,
                        sandPressureStacks: 1,
                        stackMetadataKey: 'sandPressureStacks',
                        stackDelta: 1,
                        stackMax: 3,
                        tooltipTextTemplate: 'This character has {stacks} Sand Pressure stack(s).',
                    },
                },
            ]
        },
        {
            id: 'young-gaara-shukaku-unleashed',
            name: 'Shukaku Unleashed',
            skillimage: 'https://i.imgur.com/PriWN4R.png',
            skilldescription: 'Gaara releases Shukaku, gaining 55 destructible defense and transforming his skill set for 4 turns. All harmful effects on Gaara are removed. If the destructible defense is destroyed, the transformation ends early.',
            energy: [
                'Bloodline',
                'Random'
            ],
            target: 'self',
            damage: 0,
            cooldown: 6,
            classes: [
                'Chakra',
                'Ranged',
                'Instant',
                'Unique'
            ],
            effects: [
                {
                    type: 'cleanse_harmful',
                    count: 99,
                    scope: 'self',
                },
                {
                    type: 'apply_status',
                    statusId: 'young_gaara_shukaku_form',
                    duration: 4,
                    scope: 'self',
                    metadata: {
                        facePictureOverride: 'https://i.imgur.com/kxPTPh9.png',
                        skillReplacements: {
                            'young-gaara-amateur-desert-graveyard': 'young-gaara-drilling-air-bullet',
                            'young-gaara-amateur-desert-coffin': 'young-gaara-sand-buckshot',
                            'young-gaara-shukaku-unleashed': 'young-gaara-shukaku-tailed-beast-bomb',
                            'young-gaara-sand-pressure': 'young-gaara-one-tailed-defense',
                        },
                        tooltipText: 'Gaara is transformed and has transformed skills.',
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'young_gaara_shukaku_defense',
                    duration: 4,
                    scope: 'self',
                    metadata: {
                        destructibleDefensePoints: 55,
                        removeStatusIdsOnBreak: ['young_gaara_shukaku_form'],
                        tooltipText: 'Gaara has 55 destructible defense. If this defense is destroyed, Shukaku Unleashed ends.',
                    },
                },
            ]
        },
        {
            id: 'young-gaara-sand-pressure',
            name: 'Sand Pressure',
            skillimage: 'https://i.imgur.com/hOe6sjV.png',
            skilldescription: 'This skill makes Young Gaara ignore enemy damage for 1 turn and then gains 15 damage reduction and grant the enemy team a Sand Pressure stack. Passive: Sand Pressure stacks are 3 maximum per target. Stacks last 3 turns and refresh on re-application.',
            energy: [
                'Random'
            ],
            target: 'self',
            damage: 0,
            cooldown: 4,
            classes: [
                'Chakra',
                'Instant',
                'Unique'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'young_gaara_sand_pressure_ignore_damage',
                    duration: 1,
                    scope: 'self',
                    metadata: {
                        ignoreEnemyDamage: true,
                        tooltipText: 'This character ignores damage this turn.',
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'young_gaara_sand_pressure_guard',
                    duration: 1,
                    scope: 'self',
                    metadata: {
                        damageReductionFlat: 15,
                        tooltipText: 'This character has 15 damage reduction.',
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'young_gaara_sand_pressure_team_delay',
                    duration: 1,
                    scope: 'self',
                    metadata: {
                        triggerOnApply: true,
                        turnEndTrigger: 'source_turn',
                        turnDurationAnchor: 'source_turn',
                        hideTooltip: true,
                        turnEndApplyStatusToEnemies: [
                            {
                                statusId: 'young_gaara_sand_pressure',
                                duration: 3,
                                metadata: {
                                    harmful: true,
                                    refreshSameStatusOnEnemyTeam: true,
                                    sandPressureStacks: 1,
                                    stackMetadataKey: 'sandPressureStacks',
                                    stackDelta: 1,
                                    stackMax: 3,
                                    tooltipTextTemplate: 'This character has {stacks} Sand Pressure stack(s).',
                                },
                            },
                        ],
                    },
                },
            ]
        },
        {
            id: 'young-gaara-drilling-air-bullet',
            name: 'Drilling Air Bullet',
            hiddenFromSelectionViewer: true,
            skillimage: 'https://i.imgur.com/yZtNRim.png',
            skilldescription: 'Deals 28 piercing damage to one enemy. If the target has Sand Pressure, deal +8 damage.',
            energy: [
                'Ninjutsu',
                'Random'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 1,
            classes: [
                'Chakra',
                'Ranged',
                'Instant',
                'Unique'
            ],
            effects: [
                {
                    type: 'damage',
                    amount: 28,
                    scope: 'target',
                    metadata: {
                        ignoreDamageReduction: true,
                        ignoreDestructibleDefense: true,
                    },
                },
                {
                    type: 'damage',
                    amount: 8,
                    scope: 'target',
                    condition: {
                        scope: 'target',
                        statusId: 'young_gaara_sand_pressure',
                    },
                    metadata: {
                        ignoreDamageReduction: true,
                        ignoreDestructibleDefense: true,
                    },
                },
            ]
        },
        {
            id: 'young-gaara-sand-buckshot',
            name: 'Sand Buckshot',
            hiddenFromSelectionViewer: true,
            skillimage: 'https://i.imgur.com/UHpmtIs.png',
            skilldescription: 'Deals 16 piercing damage to all enemies. Applies 1 Sand Pressure stack to the primary target. Enemies hit have their non-mental skills increased in cost by +1 random chakra next turn.',
            energy: [
                'Bloodline',
                'Random'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 0,
            classes: [
                'Physical',
                'Ranged',
                'Instant',
                'Unique'
            ],
            effects: [
                {
                    type: 'damage',
                    amount: 16,
                    scope: 'all-enemy',
                    metadata: {
                        ignoreDamageReduction: true,
                        ignoreDestructibleDefense: true,
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'young_gaara_sand_pressure',
                    duration: 3,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        refreshSameStatusOnEnemyTeam: true,
                        sandPressureStacks: 1,
                        stackMetadataKey: 'sandPressureStacks',
                        stackDelta: 1,
                        stackMax: 3,
                        tooltipTextTemplate: 'This character has {stacks} Sand Pressure stack(s).',
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'young_gaara_non_mental_cost_up',
                    duration: 1,
                    scope: 'all-enemy',
                    metadata: {
                        harmful: true,
                        nonMentalRandomCostIncrease: 1,
                        tooltipText: 'This character non-mental skills cost 1 additional random chakra.',
                    },
                },
            ]
        },
        {
            id: 'young-gaara-shukaku-tailed-beast-bomb',
            name: 'Shukaku Tailed Beast Bomb',
            hiddenFromSelectionViewer: true,
            skillimage: 'https://i.imgur.com/4G8DlFf.png',
            skilldescription: 'Deals 40 damage to one enemy and 12 damage to all other enemies. Enemies with Sand Pressure take +5 bonus damage.',
            energy: [
                'Bloodline',
                'Random',
                'Random'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 1,
            classes: [
                'Chakra',
                'Ranged',
                'Instant',
                'Unique'
            ],
            effects: [
                {
                    type: 'damage',
                    amount: 40,
                    scope: 'target',
                },
                {
                    type: 'damage',
                    amount: 5,
                    scope: 'target',
                    condition: {
                        scope: 'target',
                        statusId: 'young_gaara_sand_pressure',
                    },
                },
                {
                    type: 'damage',
                    amount: 12,
                    scope: 'other-enemies',
                },
                {
                    type: 'damage',
                    amount: 5,
                    scope: 'other-enemies',
                    condition: {
                        scope: 'target',
                        statusId: 'young_gaara_sand_pressure',
                    },
                },
            ]
        },
        {
            id: 'young-gaara-one-tailed-defense',
            name: 'One-Tailed Defense',
            hiddenFromSelectionViewer: true,
            skillimage: 'https://i.imgur.com/vrlfWDI.png',
            skilldescription: 'Shukaku gains 25 damage reduction for 2 turns. During this time, Shukaku\'s skills cost 1 less random chakra.',
            energy: [
                'Random'
            ],
            target: 'self',
            damage: 0,
            cooldown: 4,
            classes: [
                'Physical',
                'Instant',
                'Unique'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'young_gaara_one_tailed_defense',
                    duration: 2,
                    scope: 'self',
                    metadata: {
                        damageReductionFlat: 25,
                        tooltipText: 'This character has 25 damage reduction.',
                    },
                },
                {
                    type: 'apply_status',
                    statusId: 'young_gaara_shukaku_cost_reduction',
                    duration: 2,
                    scope: 'self',
                    metadata: {
                        randomCostReduction: 1,
                        tooltipText: 'This character skills cost 1 less random chakra.',
                    },
                },
            ]
        }
    ]
},
];

if (typeof module !== 'undefined') {
    module.exports = characters;
}
