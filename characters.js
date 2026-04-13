const characters = [
    {
        "id": "uzumaki-naruto",
        "characterId": "uzumaki-naruto",
        "name": "Uzumaki Naruto",
        "facePicture": "https://i.imgur.com/JY8WbiV.png",
        "characterdeescription": "Uzumaki Naruto is a high-pressure momentum fighter built around aggression, combo chains, and form-shifting power spikes. He excels at snowballing fights through burst damage, state changes, and multi-turn pressure, rewarding players who maintain tempo and punish openings with relentless offense.",
        "skills": [
            {
                "id": "uzumaki-naruto-underground-ambush",
                "name": "Underground Ambush",
                "skillimage": "https://i.imgur.com/Zz5vK7k.png",
                "skilldescription": "Naruto deals 25 damage to one enemy. This also deals 10 damage to the other enemies during 'Shadow Clones'",
                "energy": [
                    "Taijutsu"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Physical",
                    "Melee",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 25,
                        "scope": "target"
                    },
                    {
                        "type": "damage",
                        "amount": 0,
                        "scope": "other-enemies",
                        "condition": {
                            "statusId": "uzumaki_naruto_shadow_clones_active",
                            "scope": "self",
                            "conditionalAmount": 10
                        }
                    }
                ]
            },
            {
                "id": "uzumaki-naruto-kyuubi-chakra-surge",
                "name": "Kyuubi Chakra Surge",
                "skillimage": "https://i.imgur.com/7mtmZSp.png",
                "skilldescription": "Naruto gains 1 random chakra and heals 20 HP then swaps this skill to 'Rasengan' until it is used. If 'Shadow Clones' is used next turn, it will last for 4 turns instead of 1 turn.",
                "energy": [
                    "Random"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 2,
                "classes": [
                    "Chakra",
                    "Instant",
                    "Unique"
                ],
                "effects": [
                    {
                        "type": "gain_chakra",
                        "chakraType": "random",
                        "amount": 1
                    },
                    {
                        "type": "heal",
                        "amount": 20,
                        "scope": "self"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "uzumaki_naruto_kyuubi_swap",
                        "duration": 99,
                        "scope": "self",
                        "metadata": {
                            "skillReplacements": {
                                "uzumaki-naruto-kyuubi-chakra-surge": "uzumaki-naruto-rasengan"
                            },
                            "tooltipText": "Kyuubi Chakra Surge is replaced by Rasengan."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "uzumaki_naruto_kyuubi_shadow_clones_bonus",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "turnDurationAnchor": "source_turn",
                            "tooltipText": "If Shadow Clones is used next turn, it will last for 4 turns."
                        }
                    }
                ]
            },
            {
                "id": "uzumaki-naruto-shadow-clones",
                "name": "Shadow Clones",
                "skillimage": "https://i.imgur.com/SWb18ro.png",
                "skilldescription": "For 2 turns, Naruto gains 50% damage reduction from the first enemy skill each turn. This swaps to 'Explosive Thousand Years of Death' the first turn then swaps to 'Uzumaki 2k Combo' the second turn. If 'Kyuubi Chakra Surge' is actve, the alternate skills will swap in the same order.",
                "energy": [
                    "Random"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 2,
                "classes": [
                    "Chakra",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "uzumaki_naruto_shadow_clones_active",
                        "duration": 2,
                        "scope": "self",
                        "metadata": {
                            "damageReductionPercent": 50,
                            "skillReplacementsByRemainingTurns": {
                                "1": {
                                    "uzumaki-naruto-shadow-clones": "uzumaki-naruto-uzumaki-2k-barrage"
                                },
                                "2": {
                                    "uzumaki-naruto-shadow-clones": "uzumaki-naruto-explosive-thousand-years-of-death"
                                },
                                "3": {
                                    "uzumaki-naruto-shadow-clones": "uzumaki-naruto-uzumaki-2k-barrage"
                                },
                                "4": {
                                    "uzumaki-naruto-shadow-clones": "uzumaki-naruto-explosive-thousand-years-of-death"
                                }
                            },
                            "tooltipText": "Naruto has 50% damage reduction and Shadow Clones is replaced by: ."
                        }
                    },
                    {
                        "type": "extend_status",
                        "targetStatusId": "uzumaki_naruto_shadow_clones_active",
                        "amount": 2,
                        "scope": "self",
                        "condition": {
                            "statusId": "uzumaki_naruto_kyuubi_shadow_clones_bonus",
                            "scope": "self",
                            "consumeOnMatch": true
                        }
                    }
                ]
            },
            {
                "id": "uzumaki-naruto-summoning-gamabunta",
                "name": "Summoning: Gamabunta",
                "skillimage": "https://i.imgur.com/BaAUdwf.png",
                "skilldescription": "Removes one random harmful effect from Naruto. Casts 'Water Bullet' on a random enemy. For 2 turns, this skill swaps into 'Water Bullet'.",
                "energy": [
                    "Bloodline",
                    "Ninjutsu"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 5,
                "classes": [
                    "Chakra",
                    "Instant",
                    "Unique"
                ],
                "effects": [
                    {
                        "type": "cleanse_harmful",
                        "count": 1,
                        "scope": "self"
                    },
                    {
                        "type": "damage",
                        "amount": 35,
                        "scope": "random-enemy",
                        "metadata": {
                            "randomScopeGroupKey": "naruto_gamabunta_random_enemy"
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "uzumaki_naruto_water_bullet_debuff",
                        "duration": 1,
                        "scope": "random-enemy",
                        "sourceSkillId": "uzumaki-naruto-water-bullet",
                        "metadata": {
                            "randomScopeGroupKey": "naruto_gamabunta_random_enemy",
                            "harmful": true,
                            "DamageDebuff": -15,
                            "tooltipText": "This character deals 15 less damage."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "uzumaki_naruto_gamabunta_swap",
                        "duration": 2,
                        "scope": "self",
                        "metadata": {
                            "skillReplacements": {
                                "uzumaki-naruto-summoning-gamabunta": "uzumaki-naruto-water-bullet"
                            },
                            "tooltipText": "Summoning: Gamabunta is replaced by Water Bullet."
                        }
                    }
                ]
            },
            {
                "id": "uzumaki-naruto-explosive-thousand-years-of-death",
                "name": "Explosive Thousand Years of Death",
                "skillimage": "https://i.imgur.com/OGbeSwO.png",
                "skilldescription": "Deals 5 piercing damage to one enemy. After 1 turn, they are dealt 20 affliction damage and cannot reduce damage or become invulnerable for 2 turns.",
                "energy": [
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Physical",
                    "Instant",
                    "Melee",
                    "Affliction"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 5,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageReduction": true
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "uzumaki_naruto_explosive_lock",
                        "duration": 2,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "cannotReduceDamage": true,
                            "cannotBecomeInvulnerable": true,
                            "tooltipText": "This character cannot reduce damage or become invulnerable."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "uzumaki_naruto_explosive_affliction",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "turnEndDamage": 20,
                            "afflictionDamage": true,
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "tooltipText": "This character will take 20 affliction damage next turn."
                        }
                    }
                ]
            },
            {
                "id": "uzumaki-naruto-rasengan",
                "name": "Rasengan",
                "skillimage": "https://i.imgur.com/mBhZXdP.png",
                "skilldescription": "Naruto deals 15 damage to one enemy this turn and fully stuns them for 1 turn then deals 15 piercing damage next turn. Swaps to 'Kyuubi Chakra Surge'.",
                "energy": [
                    "Ninjutsu"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Chakra",
                    "Melee",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 15,
                        "scope": "target"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "stunned",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "cannotUseSkills": true,
                            "tooltipText": "This character is stunned."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "uzumaki_naruto_rasengan_followup",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "turnEndDamage": 15,
                            "ignoreTargetDamageReduction": true,
                            "ignoreTargetDestructibleDefense": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "tooltipText": "This character will take 15 piercing damage next turn."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "uzumaki_naruto_kyuubi_swap",
                        "duration": 99,
                        "scope": "self",
                        "metadata": {
                            "skillReplacements": {
                                "uzumaki-naruto-kyuubi-chakra-surge": "uzumaki-naruto-kyuubi-chakra-surge"
                            },
                            "tooltipText": "Kyuubi Chakra Surge is restored."
                        }
                    }
                ]
            },
            {
                "id": "uzumaki-naruto-uzumaki-2k-barrage",
                "name": "Uzumaki 2k Barrage",
                "skillimage": "https://i.imgur.com/J8a7lIo.png",
                "skilldescription": "Deals 24 damage to one enemy for 2 turns.",
                "energy": [
                    "Taijutsu",
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Physical",
                    "Instant",
                    "Melee"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 24,
                        "scope": "target"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "uzumaki_naruto_2k_barrage_followup",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "turnEndDamage": 24,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "tooltipText": "This character will take 24 damage next turn."
                        }
                    }
                ]
            },
            {
                "id": "uzumaki-naruto-water-bullet",
                "name": "Water Bullet",
                "skillimage": "https://i.imgur.com/8UFKnoL.png",
                "skilldescription": "Deals 35 damage to one enemy and reduces their damage by 15 for one turn.",
                "energy": [
                    "Ninjutsu",
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Chakra",
                    "Instant",
                    "Ranged",
                    "Unique"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 35,
                        "scope": "target"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "uzumaki_naruto_water_bullet_debuff",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "DamageDebuff": -15,
                            "tooltipText": "This character deals 15 less damage."
                        }
                    }
                ]
            }
        ]
    },
    {
        "id": "haruno-sakura",
        "characterId": "haruno-sakura",
        "name": "Haruno Sakura",
        "facePicture": "https://i.imgur.com/mOMqqq0.png",
        "characterdeescription": "Sakura shifts between steady pressure and explosive control once her Inner state is active. She chips enemies down with persistent damage and punishes aggression through well-timed defensive traps, creating tempo swings that favor prolonged engagements. When fully ramped, she becomes a disruptive powerhouse—shrugging off stuns, reducing incoming damage, and unleashing decisive strikes that can dismantle fragile backlines.",
        "skills": [
            {
                "id": "haruno-sakura-kunai-stab",
                "name": "Kunai Stab",
                "skillimage": "https://i.imgur.com/Jtl9MTB.png",
                "skilldescription": "Deals 15 damage to one enemy. The following 2 turns, the target bleeds for 5 affliction damage.",
                "energy": [
                    "Taijutsu"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Physical",
                    "Melee",
                    "Instant",
                    "Affliction"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 15,
                        "scope": "target",
                        "condition": {
                            "statusId": "haruno_sakura_inner_sakura_active",
                            "scope": "self",
                            "conditionalAmount": 25
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "haruno_sakura_kunai_bleed",
                        "duration": 2,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "turnEndDamage": 5,
                            "afflictionDamage": true,
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "ongoingClass": "action",
                            "tooltipText": "This character takes 5 affliction damage each turn."
                        }
                    }
                ]
            },
            {
                "id": "haruno-sakura-log-fall-trap",
                "name": "Log Fall Trap",
                "skillimage": "https://i.imgur.com/fXRBwFN.png",
                "skilldescription": "Sakura targets herself or an ally until the next enemy harmful non-mental skill is used on them. When triggered, the attacker is dealt 15 damage and has their damage reduced by 15 for 2 turns. This is invisible and cannot be used on an already affected ally.",
                "energy": [
                    "Random"
                ],
                "target": "self-or-single-ally",
                "targetCondition": {
                    "missingStatusId": "haruno_sakura_log_fall_trap"
                },
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "haruno_sakura_log_fall_trap",
                        "duration": 99,
                        "scope": "target",
                        "metadata": {
                            "triggerOnEnemyHarmfulNonMental": true,
                            "counterDamage": 15,
                            "counterStatusId": "haruno_sakura_log_fall_damage_down",
                            "counterStatusDuration": 2,
                            "counterStatusMetadata": {
                                "harmful": true,
                                "DamageDebuff": -15,
                                "tooltipText": "This character deals 15 less damage."
                            },
                            "hideTooltipFromEnemy": true,
                            "tooltipText": "The next enemy harmful non-mental skill is used on this character will trigger this skill: The attacker is dealt 15 damage and has their damage reduced by 15 for 2 turns."
                        }
                    }
                ]
            },
            {
                "id": "haruno-sakura-inner-sakura",
                "name": "Inner Sakura",
                "skillimage": "https://i.imgur.com/cmXR9AK.png",
                "skilldescription": "For 4 turns, Sakura will gain 10 points of damage reduction. During this time, Sakura will ignore stun effects and 'Kunai Stab' will deal 10 additional damage. Swaps to 'Mental Rampage' while active.",
                "energy": [
                    "Random"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 4,
                "classes": [
                    "Mental",
                    "Instant",
                    "Unique"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "haruno_sakura_inner_sakura_active",
                        "duration": 4,
                        "scope": "self",
                        "metadata": {
                            "damageReductionFlat": 10,
                            "cannotBeStunned": true,
                            "skillReplacements": {
                                "haruno-sakura-inner-sakura": "haruno-sakura-mental-rampage"
                            },
                            "tooltipText": "Sakura has 10 damage reduction, ignores stuns, and Inner Sakura is replaced by Mental Rampage."
                        }
                    }
                ]
            },
            {
                "id": "haruno-sakura-sakura-replacement-technique",
                "name": "Sakura Replacement Technique",
                "skillimage": "https://i.imgur.com/lli0iV2.png",
                "skilldescription": "This skill makes Haruno Sakura invulnerable for 1 turn.",
                "energy": [
                    "Random"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 4,
                "classes": [
                    "Chakra",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "invulnerable",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "invulnerable": true,
                            "tooltipText": "This character is invulnerable."
                        }
                    }
                ]
            },
            {
                "id": "haruno-sakura-mental-rampage",
                "name": "Mental Rampage",
                "skillimage": "https://i.imgur.com/NXk2FSj.png",
                "skilldescription": "Deals 25 damage to one enemy and stuns their chakra and mental skills for 1 turn.",
                "hiddenFromSelectionViewer": true,
                "energy": [
                    "Genjutsu"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Mental",
                    "Instant",
                    "Ranged"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 25,
                        "scope": "target"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "haruno_sakura_mental_rampage_lock",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "cannotUseSkillClasses": [
                                "chakra",
                                "mental"
                            ],
                            "tooltipText": "This character chakra and mental skills are stunned."
                        }
                    }
                ]
            }
        ]
    },
    {
        "id": "uchiha-sasuke",
        "characterId": "uchiha-sasuke",
        "name": "Uchiha Sasuke",
        "facePicture": "https://i.imgur.com/JruPrgE.png",
        "characterdeescription": "Uchiha Sasuke is a high-skill, evasive duelist who thrives on prediction and punishment. Rather than overwhelming enemies with raw durability, Sasuke avoids attacks through precise timing, gradually increasing his damage each time he successfully evades. His kit rewards patience and awareness, allowing him to turn enemy aggression into permanent offensive power..",
        "skills": [
            {
                "id": "uchiha-sasuke-mimicked-taijutsu",
                "name": "Mimicked Taijutsu",
                "skillimage": "https://i.imgur.com/KCCpAPy.png",
                "skilldescription": "Sasuke deals 30 damage to one enemy. Sasuke has a 10% chance to Evade enemy non-mental skills for 1 turn. (stacks with 'Sharingan' & 'Uchiha Reflexes').",
                "energy": [
                    "Taijutsu",
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Physical",
                    "Melee",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 30,
                        "scope": "target"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "uchiha_sasuke_taijutsu_evade",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "evadeChancePercent": 10,
                            "evadeAgainstNonMental": true,
                            "tooltipText": "This character has a 10% chance to evade enemy non-mental skills."
                        }
                    }
                ]
            },
            {
                "id": "uchiha-sasuke-triple-windmill-attack",
                "name": "Triple Windmill Attack",
                "skillimage": "https://i.imgur.com/904CWZw.png",
                "skilldescription": "One enemy has their harmful skills stunned and may not reduce damage or become invulnerable for 1 turn. Swaps to 'Dragon Flame Jutsu' for 1 turn. This may not be used on an already affected enemy.",
                "energy": [
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Chakra",
                    "Melee",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "uchiha_sasuke_triple_windmill_lock2",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "cannotUseHarmfulSkills": true,
                            "tooltipText": "This character harmful skills are stunned."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "uchiha_sasuke_triple_windmill_lock",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "cannotReduceDamage": true,
                            "cannotBecomeInvulnerable": true,
                            "tooltipText": "This character cannot reduce damage or become invulnerable."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "uchiha_sasuke_triple_windmill_mark",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "turnDurationAnchor": "source_turn",
                            "triggerOnApply": false,
                            "tooltipText": "This character is marked by Triple Windmill Attack."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "uchiha_sasuke_dragon_flame_swap",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "skillReplacements": {
                                "uchiha-sasuke-triple-windmill-attack": "uchiha-sasuke-dragon-flame-jutsu"
                            },
                            "tooltipText": "Triple Windmill Attack is replaced by Dragon Flame Jutsu."
                        }
                    }
                ]
            },
            {
                "id": "uchiha-sasuke-sharingan",
                "name": "Sharingan",
                "skillimage": "https://i.imgur.com/NhDRPOE.png",
                "skilldescription": "For 4 turns, Sasuke gains a 15% chance to Evade all enemy non-mental skills and this swaps to 'Chidori'. Every time he Evades a physical skill, 'Mimicked Taijutsu' permanently deals 5 additional damage & every time he Evades a chakra skill, 'Chidori' deals 5 additional damage permanently (stacks).",
                "energy": [
                    "none"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 3,
                "classes": [
                    "Mental",
                    "Instant",
                    "Unique"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "uchiha_sasuke_sharingan_active",
                        "duration": 4,
                        "scope": "self",
                        "metadata": {
                            "evadeChancePercent": 15,
                            "evadeAgainstNonMental": true,
                            "skillReplacements": {
                                "uchiha-sasuke-sharingan": "uchiha-sasuke-chidori"
                            },
                            "onEvadeSkillClassBonuses": {
                                "physical": {
                                    "statusId": "uchiha_sasuke_mimicked_taijutsu_scaling",
                                    "duration": 99,
                                    "metadata": {
                                        "skillDamageBonuses": {
                                            "uchiha-sasuke-mimicked-taijutsu": 5
                                        },
                                        "tooltipText": "Mimicked Taijutsu deals 5 additional damage."
                                    }
                                },
                                "chakra": {
                                    "statusId": "uchiha_sasuke_chidori_scaling",
                                    "duration": 99,
                                    "metadata": {
                                        "skillDamageBonuses": {
                                            "uchiha-sasuke-chidori": 5
                                        },
                                        "tooltipText": "Chidori deals 5 additional damage."
                                    }
                                }
                            },
                            "tooltipText": "This character has a 15% chance to evade enemy non-mental skills and Sharingan is replaced by Chidori."
                        }
                    }
                ]
            },
            {
                "id": "uchiha-sasuke-uchiha-reflexes",
                "name": "Uchiha Reflexes",
                "skillimage": "https://i.imgur.com/FJDxgOR.png",
                "skilldescription": "This skill makes Uchiha Sasuke have a 25% chance to Evade enemy non-mental skills for 2 turns (stacks with 'Mimicked Taijutsu' and 'Sharingan'). If a skill is successfully evaded, Sasuke becomes invulnerable to all other enemy skills that turn.",
                "energy": [
                    "Random"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 4,
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "uchiha_sasuke_reflexes_evade",
                        "duration": 2,
                        "scope": "self",
                        "metadata": {
                            "evadeChancePercent": 25,
                            "evadeAgainstNonMental": true,
                            "onEvadeApplyStatus": {
                                "statusId": "uchiha_sasuke_evade_invulnerable",
                                "duration": 1,
                                "metadata": {
                                    "invulnerable": true,
                                    "turnDurationAnchor": "source_turn",
                                    "tooltipText": "This character is invulnerable for the rest of this enemy turn after evading."
                                }
                            },
                            "tooltipText": "This character has a 25% chance to evade enemy non-mental skills, if triggered, Sasuke will become invulnerable to all other enemy skills that turn."
                        }
                    }
                ]
            },
            {
                "id": "uchiha-sasuke-dragon-flame-jutsu",
                "name": "Dragon Flame Jutsu",
                "skillimage": "https://i.imgur.com/kjIOA8y.png",
                "skilldescription": "Deals 15 affliction damage to the enemy affected by 'Triple Windmill Attack' for 2 turns. 'Triple Windmill Attack' has its duration extended by 1 turn.",
                "energy": [
                    "Ninjutsu",
                    "Random"
                ],
                "target": "single-enemy",
                "targetCondition": {
                    "statusId": "uchiha_sasuke_triple_windmill_mark"
                },
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Chakra",
                    "Ranged",
                    "Action",
                    "Affliction"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "uchiha_sasuke_dragon_flame_dot",
                        "duration": 2,
                        "scope": "target",
                        "condition": {
                            "statusId": "uchiha_sasuke_triple_windmill_mark",
                            "scope": "target"
                        },
                        "metadata": {
                            "harmful": true,
                            "turnEndDamage": 15,
                            "afflictionDamage": true,
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "ongoingClass": "action",
                            "tooltipText": "This character takes 15 affliction damage each turn."
                        }
                    },
                    {
                        "type": "extend_status",
                        "targetStatusId": "uchiha_sasuke_triple_windmill_lock",
                        "amount": 1,
                        "scope": "target",
                        "condition": {
                            "statusId": "uchiha_sasuke_triple_windmill_mark",
                            "scope": "target"
                        }
                    },
                    {
                        "type": "extend_status",
                        "targetStatusId": "uchiha_sasuke_triple_windmill_mark",
                        "amount": 1,
                        "scope": "target",
                        "condition": {
                            "statusId": "uchiha_sasuke_triple_windmill_mark",
                            "scope": "target"
                        }
                    }
                ]
            },
            {
                "id": "uchiha-sasuke-chidori",
                "name": "Chidori",
                "skillimage": "https://i.imgur.com/y2WbP01.png",
                "skilldescription": "Sasuke deals 45 piercing damage to one enemy. If the target's health drops to 10 HP or below, they are executed.",
                "energy": [
                    "Ninjutsu",
                    "Ninjutsu"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Chakra",
                    "Melee",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 45,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageReduction": true
                        }
                    },
                    {
                        "type": "execute_below_hp",
                        "threshold": 10,
                        "scope": "target"
                    }
                ]
            }
        ]
    },
    {
        "id": "inuzuka-kiba",
        "characterId": "inuzuka-kiba",
        "name": "Inuzuka Kiba",
        "facePicture": "https://i.imgur.com/xPWcUtA.png",
        "characterdeescription": "Kiba is a fast-paced, pressure-oriented damage dealer who excels at isolating a single target and mauling them over multiple turns. His kit rewards smart setup and timing rather than raw burst spam. Once Kiba marks an enemy, they become his prey—unable to hide behind damage reduction or invulnerability, and steadily torn apart by repeated strikes.",
        "skills": [
            {
                "id": "inuzuka-kiba-fang-over-fang",
                "name": "Fang over Fang",
                "skillimage": "https://i.imgur.com/tODxqPs.png",
                "skilldescription": "Deals 10 damage to one enemy and 5 damage to one random enemy for 2 turns. Kiba gains 10 points of destructible defense for 1 turn.",
                "energy": [
                    "Taijutsu"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Physical",
                    "Ranged",
                    "Action",
                    "Unique"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "inuzuka_kiba_fang_over_fang_target_rend",
                        "duration": 2,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "turnEndDamage": 10,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "ongoingClass": "action",
                            "triggerOnApply": true,
                            "tooltipText": "This character takes 10 damage each turn."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "inuzuka_kiba_fang_over_fang_random_rend",
                        "duration": 2,
                        "scope": "random-enemy",
                        "metadata": {
                            "harmful": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "ongoingClass": "action",
                            "triggerOnApply": true,
                            "ignoreSourceNonAfflictionDamageBonus": true,
                            "turnEndDamage": 5,
                            "tooltipText": "This character takes 5 damage each turn."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "inuzuka_kiba_fang_over_fang_dd",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "destructibleDefensePoints": 10,
                            "tooltipText": "Kiba has 10 destructible defense."
                        }
                    }
                ]
            },
            {
                "id": "inuzuka-kiba-dynamic-marking",
                "name": "Dynamic Marking",
                "skillimage": "https://i.imgur.com/i3T37zV.png",
                "skilldescription": "One enemy becomes unable to reduce damage or become invulnerable for 2 turns. During this time, they take 10 additional damage from Kiba's skills.",
                "energy": [
                    "none"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 2,
                "classes": [
                    "Physical",
                    "Ranged",
                    "Instant",
                    "Unique",
                    "Affliction"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "inuzuka_kiba_dynamic_marking_lock",
                        "duration": 2,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "cannotReduceDamage": true,
                            "cannotBecomeInvulnerable": true,
                            "tooltipText": "This character cannot reduce damage or become invulnerable."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "inuzuka_kiba_dynamic_marking",
                        "duration": 2,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "bonusDamageFromSourceSkillsFlat": 10,
                            "bonusDamageFromSourceCharacterId": "inuzuka-kiba",
                            "tooltipText": "This character takes 10 additional damage from Kiba's skills."
                        }
                    }
                ]
            },
            {
                "id": "inuzuka-kiba-twin-headed-wolf",
                "name": "Twin-Headed Wolf",
                "skillimage": "https://i.imgur.com/UIlaRmo.png",
                "skilldescription": "Kiba gains 15 points of damage reduction and deals 15 piercing damage to a random enemy for 3 turns each turn. If an enemy is affected by 'Dynamic Marking' this will target them instead. This swaps to 'Fang wolf Fang' while active.",
                "energy": [
                    "Bloodline",
                    "Random"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 3,
                "classes": [
                    "Physical",
                    "Melee",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "inuzuka_kiba_twin_headed_wolf",
                        "duration": 3,
                        "scope": "self",
                        "metadata": {
                            "damageReductionFlat": 15,
                            "skillReplacements": {
                                "inuzuka-kiba-twin-headed-wolf": "inuzuka-kiba-fang-wolf-fang"
                            },
                            "tooltipText": "Kiba has 15 damage reduction and Twin-Headed Wolf is replaced by Fang wolf Fang."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "inuzuka_kiba_twin_headed_wolf_rend",
                        "duration": 3,
                        "scope": "self",
                        "metadata": {
                            "turnEndRandomEnemyDamage": 15,
                            "turnEndRandomEnemyIgnoreDamageReduction": true,
                            "turnEndRandomEnemyIgnoreDestructibleDefense": true,
                            "turnEndRandomEnemySkillClasses": [
                                "Physical",
                                "Melee",
                                "Action"
                            ],
                            "preferEnemyWithStatusId": "inuzuka_kiba_dynamic_marking",
                            "triggerOnApply": true,
                            "tooltipText": "This character deals 15 piercing damage to a random enemy each turn."
                        }
                    }
                ]
            },
            {
                "id": "inuzuka-kiba-man-beast-clone",
                "name": "Man-Beast Clone",
                "skillimage": "https://i.imgur.com/Y5XIKMo.png",
                "skilldescription": "For 4 turns, Kiba ignores enemy stun effects then makes 'Fang over Fang' have no cooldown and deal 5 additional damage.",
                "energy": [
                    "Random"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 4,
                "classes": [
                    "Chakra",
                    "Instant",
                    "Unique"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "inuzuka_kiba_man_beast_clone",
                        "duration": 4,
                        "scope": "self",
                        "metadata": {
                            "cannotBeStunned": true,
                            "skillReplacements": {
                                "inuzuka-kiba-fang-over-fang": "inuzuka-kiba-fang-over-fang-empowered"
                            },
                            "tooltipText": "Kiba ignores stuns and Fang over Fang has no cooldown and now deals 15 damage to one enemy and 10 damage to one random enemy for 2 turns."
                        }
                    }
                ]
            },
            {
                "id": "inuzuka-kiba-fang-wolf-fang",
                "name": "Fang wolf Fang",
                "skillimage": "https://i.imgur.com/dhx6Qvr.png",
                "skilldescription": "Deals 25 damage to one enemy for 2 turns. Kiba becomes invulnerable for 1 turn.",
                "energy": [
                    "Taijutsu",
                    "Bloodline"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Physical",
                    "Action",
                    "Melee",
                    "Unique"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 25,
                        "scope": "target"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "inuzuka_kiba_fang_wolf_fang_dot",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "turnEndDamage": 25,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "ongoingClass": "action",
                            "tooltipText": "This character will take 25 damage next turn."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "invulnerable",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "invulnerable": true,
                            "tooltipText": "This character is invulnerable."
                        }
                    }
                ]
            },
            {
                "id": "inuzuka-kiba-fang-over-fang-empowered",
                "name": "Fang over Fang",
                "hiddenFromSelectionViewer": true,
                "useBaseSkillCooldown": true,
                "skillimage": "https://i.imgur.com/tODxqPs.png",
                "skilldescription": "Deals 15 damage to one enemy and 10 damage to one random enemy for 2 turns. Kiba gains 10 points of destructible defense for 1 turn.",
                "energy": [
                    "Taijutsu"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Physical",
                    "Ranged",
                    "Action",
                    "Unique"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "inuzuka_kiba_fang_over_fang_empowered_target_rend",
                        "duration": 2,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "turnEndDamage": 15,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "ongoingClass": "action",
                            "triggerOnApply": true,
                            "tooltipText": "This character takes 15 damage each turn."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "inuzuka_kiba_fang_over_fang_empowered_random_rend",
                        "duration": 2,
                        "scope": "random-enemy",
                        "metadata": {
                            "harmful": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "ongoingClass": "action",
                            "triggerOnApply": true,
                            "ignoreSourceNonAfflictionDamageBonus": true,
                            "turnEndDamage": 10,
                            "tooltipText": "This character takes 10 damage each turn."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "inuzuka_kiba_fang_over_fang_dd",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "destructibleDefensePoints": 10,
                            "tooltipText": "Kiba has 10 destructible defense."
                        }
                    }
                ]
            }
        ]
    },
    {
        "id": "aburame-shino",
        "characterId": "aburame-shino",
        "name": "Aburame Shino",
        "facePicture": "https://i.imgur.com/iAjJn2w.png",
        "characterdeescription": "Aburame Shino is a calculated, methodical controller who dominates combat through inevitability rather than burst. He excels at locking down a single target, bypassing defenses, and dismantling enemies over time with relentless affliction pressure. Once Shino marks a target, escape becomes impossible—his bugs track, drain, and weaken until the enemy collapses.",
        "skills": [
            {
                "id": "aburame-shino-female-bug",
                "name": "Female Bug",
                "skillimage": "https://i.imgur.com/6KPrkAg.png",
                "skilldescription": "Shino directs one of his female bugs to attach itself to one enemy until they die. While affected, Shino's skills are improved on them, ignore their invulnerability, and cannot be evaded. This cannot be evaded and will remove itself from the previous target if used on another.",
                "energy": [
                    "none"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Physical",
                    "Ranged",
                    "Instant",
                    "Unique",
                    "Affliction"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "aburame_shino_female_bug",
                        "duration": 99,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "cannotBeEvaded": true,
                            "uniqueEnemyMarkFromSource": true,
                            "cannotEvadeFromSourceCharacterId": "aburame-shino",
                            "ignoreInvulnerabilityFromSourceCharacterId": "aburame-shino",
                            "tooltipText": "Marked by Female Bug: Shino's skills are improved on this enemy, they will also ignore invulnerability and cannot be evaded."
                        }
                    }
                ]
            },
            {
                "id": "aburame-shino-infestation",
                "name": "Infestation",
                "skillimage": "https://i.imgur.com/4q7jf6A.png",
                "skilldescription": "Shino calls millions of bugs to swarm an enemy, dealing 5 affliction damage and lowering their non-affliction damage by 5 permanently (stacks). If they are affected by 'Female Bug', the damage and lowering effect are doubled.",
                "energy": [
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 2,
                "classes": [
                    "Physical",
                    "Ranged",
                    "Instant",
                    "Affliction",
                    "Unique"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "aburame_shino_infestation_perma_debuff",
                        "duration": 99,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "infiniteDuration": true,
                            "mergeNumericAddKeys": [
                                "turnEndDamage",
                                "NonAfflictionDamageDebuff"
                            ],
                            "turnEndDamage": 5,
                            "afflictionDamage": true,
                            "ignoreTargetDamageReduction": true,
                            "ignoreTargetDestructibleDefense": true,
                            "turnEndTrigger": "source_turn",
                            "NonAfflictionDamageDebuff": 5,
                            "tooltipTextTemplate": "This character takes {turnEndDamage} permanent affliction damage and deals {NonAfflictionDamageDebuff} less non-affliction damage."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "aburame_shino_infestation_perma_debuff_bonus",
                        "duration": 99,
                        "scope": "target",
                        "condition": {
                            "statusId": "aburame_shino_female_bug",
                            "scope": "target"
                        },
                        "metadata": {
                            "harmful": true,
                            "infiniteDuration": true,
                            "mergeNumericAddKeys": [
                                "turnEndDamage",
                                "NonAfflictionDamageDebuff"
                            ],
                            "turnEndDamage": 5,
                            "afflictionDamage": true,
                            "ignoreTargetDamageReduction": true,
                            "ignoreTargetDestructibleDefense": true,
                            "turnEndTrigger": "source_turn",
                            "NonAfflictionDamageDebuff": 5,
                            "tooltipTextTemplate": "This character takes {turnEndDamage} permanent affliction damage and deals {NonAfflictionDamageDebuff} less non-affliction damage."
                        }
                    }
                ]
            },
            {
                "id": "aburame-shino-chakra-leach",
                "name": "Chakra Leach",
                "skillimage": "https://i.imgur.com/ZzFx99m.png",
                "skilldescription": "Shino directs his chakra draining bugs to one enemy, dealing 15 affliction damage for 2 turns and stealing 1 non-bloodline chakra from their chakra pool the following turn. If the target is affected by 'Female Bug', this instead deals 30 affliction damage and steals 1 non-bloodline chakra instantly.",
                "energy": [
                    "Bloodline"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Chakra",
                    "Ranged",
                    "Control",
                    "Instant*",
                    "Unique",
                    "Affliction"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 0,
                        "scope": "target",
                        "condition": {
                            "statusId": "aburame_shino_female_bug",
                            "scope": "target",
                            "conditionalAmount": 30
                        },
                        "metadata": {
                            "afflictionDamage": true,
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "aburame_shino_chakra_leach_dot",
                        "duration": 2,
                        "scope": "target",
                        "condition": {
                            "missingStatusId": "aburame_shino_female_bug",
                            "scope": "target"
                        },
                        "metadata": {
                            "harmful": true,
                            "turnEndDamage": 15,
                            "afflictionDamage": true,
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "triggerOnApply": true,
                            "ongoingClass": "control",
                            "tooltipText": "This character takes 15 affliction damage each turn."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "aburame_shino_chakra_leach_drain_next",
                        "duration": 1,
                        "scope": "target",
                        "condition": {
                            "missingStatusId": "aburame_shino_female_bug",
                            "scope": "target"
                        },
                        "metadata": {
                            "harmful": true,
                            "turnEndDrainNonBloodlineToSource": 1,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "ongoingClass": "control",
                            "tooltipText": "Shino will steal 1 non-bloodline chakra next turn."
                        }
                    },
                    {
                        "type": "drain_chakra_non_bloodline_from_target_to_self",
                        "amount": 1,
                        "scope": "target",
                        "condition": {
                            "statusId": "aburame_shino_female_bug",
                            "scope": "target"
                        }
                    }
                ]
            },
            {
                "id": "aburame-shino-bug-clone",
                "name": "Bug Clone",
                "skillimage": "https://i.imgur.com/8M9NPsd.png",
                "skilldescription": "This skill makes Aburame Shino invulnerable for 1 turn.",
                "energy": [
                    "Random"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 4,
                "classes": [
                    "Chakra",
                    "Instant",
                    "Unique"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "invulnerable",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "invulnerable": true,
                            "tooltipText": "This character is invulnerable."
                        }
                    }
                ]
            }
        ]
    },
    {
        "id": "hyuuga-hinata",
        "characterId": "hyuuga-hinata",
        "name": "Hyuuga Hinata",
        "facePicture": "https://i.imgur.com/0Sa9tPk.png",
        "characterdeescription": "Hyūga Hinata is a defensive pressure specialist who excels at chakra denial, sustained damage, and team protection. When Byakugan is active, Hinata shifts from a cautious support into a battlefield controller, punishing enemies for using skills while reinforcing her allies with layered defenses and healing.",
        "skills": [
            {
                "id": "hyuuga-hinata-byakugan",
                "name": "Byakugan",
                "skillimage": "https://i.imgur.com/ifMreas.png",
                "skilldescription": "Hinata activates her Byakugan, making her skills unable to be Evaded, improving her skills, and gaining 10 points of damage reduction for 3 turns.",
                "energy": [
                    "none"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 3,
                "classes": [
                    "Mental",
                    "Ranged",
                    "Instant",
                    "Unique"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "hyuuga_hinata_byakugan_active",
                        "duration": 3,
                        "scope": "self",
                        "metadata": {
                            "cannotBeEvadedSkills": true,
                            "damageReductionFlat": 10,
                            "facePictureOverride": "https://i.imgur.com/x4M9ysf.png",
                            "skillReplacements": {
                                "hyuuga-hinata-hinata-gentle-fist": "hyuuga-hinata-hinata-gentle-fist-byakugan",
                                "hyuuga-hinata-eight-trigrams-64-palms-protection": "hyuuga-hinata-eight-trigrams-64-palms-protection-byakugan",
                                "hyuuga-hinata-hinata-medicine": "hyuuga-hinata-hinata-medicine-team"
                            },
                            "tooltipText": "Hinata has 10 damage reduction, her skills cannot be evaded, and her skills are improved."
                        }
                    }
                ]
            },
            {
                "id": "hyuuga-hinata-hinata-gentle-fist",
                "name": "Hinata Gentle Fist",
                "skillimage": "https://i.imgur.com/k0nWgv6.png",
                "skilldescription": "Using the Hyuuga clan's style of taijutsu, Hinata deals 15 damage to one enemy and increasing the cost of their skills by 1 random chakra for 1 turn and then dealing 10 damage to them next turn. During 'Byakugan', this will increase their skill costs by 1 genjutsu chakra for 1 turn instead.",
                "energy": [
                    "Genjutsu"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Physical",
                    "Melee",
                    "Action",
                    "Unique"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 15,
                        "scope": "target"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "hyuuga_hinata_gentle_fist_cost_lock",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "randomCostIncrease": 1,
                            "tooltipText": "This character's skills cost 1 additional random chakra."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "hyuuga_hinata_gentle_fist_followup",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "turnEndDamage": 10,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "ongoingClass": "action",
                            "tooltipText": "This character will take 10 damage next turn."
                        }
                    }
                ]
            },
            {
                "id": "hyuuga-hinata-eight-trigrams-64-palms-protection",
                "name": "Eight Trigrams 64 Palms Protection",
                "skillimage": "https://i.imgur.com/NHwkyNb.png",
                "skilldescription": "Hinata deals 15 damage to all enemies for 2 turns. For 1 turn, Hinata and her allies have 15 destructible defense and any enemy that breaks the Destructible Defense will lose 1 random chakra. During 'Byakugan', this skill will deal 5 additional damage and become piercing damage.",
                "energy": [
                    "Ninjutsu",
                    "Random"
                ],
                "target": "all-enemy",
                "damage": 0,
                "cooldown": 2,
                "classes": [
                    "Chakra",
                    "Melee",
                    "Action",
                    "Unique",
                    "Instant*"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 15,
                        "scope": "all-enemy"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "hyuuga_hinata_64_palms_followup",
                        "duration": 1,
                        "scope": "all-enemy",
                        "metadata": {
                            "harmful": true,
                            "turnEndDamage": 15,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "ongoingClass": "action",
                            "tooltipText": "This character will take 15 damage next turn."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "hyuuga_hinata_64_palms_dd",
                        "duration": 1,
                        "scope": "all-allies",
                        "metadata": {
                            "destructibleDefensePoints": 15,
                            "loseRandomChakraOnBreakByEnemy": true,
                            "tooltipText": "This character has 15 destructible defense. Any enemy that breaks the Destructible Defense will lose 1 random chakra."
                        }
                    }
                ]
            },
            {
                "id": "hyuuga-hinata-hinata-medicine",
                "name": "Hinata Medicine",
                "skillimage": "https://i.imgur.com/68O6hme.png",
                "skilldescription": "Heals one ally or herself 15% their current health every turn for 2 turns. This may not be used on an already affected target. During 'Byakugan' this will affect Hinata's whole team.",
                "energy": [
                    "Random"
                ],
                "target": "self-or-single-ally",
                "targetCondition": {
                    "missingStatusId": "hyuuga_hinata_medicine_regen"
                },
                "damage": 0,
                "cooldown": 2,
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "hyuuga_hinata_medicine_regen",
                        "duration": 2,
                        "scope": "target",
                        "metadata": {
                            "turnEndHealPercentCurrent": 15,
                            "triggerOnApply": true,
                            "tooltipText": "This character heals 15% of current health each turn."
                        }
                    }
                ]
            },
            {
                "id": "hyuuga-hinata-hinata-gentle-fist-byakugan",
                "name": "Hinata Gentle Fist",
                "hiddenFromSelectionViewer": true,
                "useBaseSkillCooldown": true,
                "skillimage": "https://i.imgur.com/k0nWgv6.png",
                "skilldescription": "Using the Hyuuga clan's style of taijutsu, Hinata deals 15 damage to one enemy and increasing the cost of their skills by 1 genjutsu chakra for 1 turn and then dealing 10 damage to them next turn.",
                "energy": [
                    "Genjutsu"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Physical",
                    "Melee",
                    "Action",
                    "Unique"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 15,
                        "scope": "target"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "hyuuga_hinata_gentle_fist_cost_lock_byakugan",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "genjutsuCostIncrease": 1,
                            "tooltipText": "This character's skills cost 1 additional genjutsu chakra."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "hyuuga_hinata_gentle_fist_followup",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "turnEndDamage": 10,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "ongoingClass": "action",
                            "tooltipText": "This character will take 10 damage next turn."
                        }
                    }
                ]
            },
            {
                "id": "hyuuga-hinata-eight-trigrams-64-palms-protection-byakugan",
                "name": "Eight Trigrams 64 Palms Protection",
                "hiddenFromSelectionViewer": true,
                "useBaseSkillCooldown": true,
                "skillimage": "https://i.imgur.com/NHwkyNb.png",
                "skilldescription": "Hinata deals 20 piercing damage to all enemies for 2 turns. For 1 turn, Hinata and her allies have 15 destructible defense. Any enemy that breaks the Destructible Defense will lose 1 random chakra.",
                "energy": [
                    "Ninjutsu",
                    "Random"
                ],
                "target": "all-enemy",
                "damage": 0,
                "cooldown": 2,
                "classes": [
                    "Chakra",
                    "Melee",
                    "Action",
                    "Unique",
                    "Instant*"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 20,
                        "scope": "all-enemy",
                        "metadata": {
                            "ignoreDamageReduction": true
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "hyuuga_hinata_64_palms_followup_byakugan",
                        "duration": 1,
                        "scope": "all-enemy",
                        "metadata": {
                            "harmful": true,
                            "turnEndDamage": 20,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "ongoingClass": "action",
                            "ignoreTargetDamageReduction": true,
                            "tooltipText": "This character will take 20 piercing damage next turn."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "hyuuga_hinata_64_palms_dd",
                        "duration": 1,
                        "scope": "all-allies",
                        "metadata": {
                            "destructibleDefensePoints": 15,
                            "loseRandomChakraOnBreakByEnemy": true,
                            "tooltipText": "This character has 15 destructible defense. Any enemy that breaks the Destructible Defense will lose 1 random chakra."
                        }
                    }
                ]
            },
            {
                "id": "hyuuga-hinata-hinata-medicine-team",
                "name": "Hinata Medicine",
                "hiddenFromSelectionViewer": true,
                "useBaseSkillCooldown": true,
                "skillimage": "https://i.imgur.com/68O6hme.png",
                "skilldescription": "Heals Hinata's whole team for 15% of current health every turn for 2 turns.",
                "energy": [
                    "Random"
                ],
                "target": "all-allies",
                "damage": 0,
                "cooldown": 2,
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "hyuuga_hinata_medicine_regen",
                        "duration": 2,
                        "scope": "all-allies",
                        "metadata": {
                            "turnEndHealPercentCurrent": 15,
                            "triggerOnApply": true,
                            "tooltipText": "This character heals 15% of current health each turn."
                        }
                    }
                ]
            }
        ]
    },
    {
        "id": "nara-shikamaru",
        "characterId": "nara-shikamaru",
        "name": "Nara Shikamaru",
        "facePicture": "https://i.imgur.com/kLCdz5O.png",
        "characterdeescription": "Shikamaru Nara is a tactical prodigy of Konohagakure who weaponizes shadows as extensions of his will. He excels at battlefield control, dismantling enemy formations through patience and precision rather than brute force.",
        "skills": [
            {
                "id": "nara-shikamaru-shadow-possession",
                "name": "Shadow Possession",
                "skillimage": "https://i.imgur.com/RqlOKy1.png",
                "skilldescription": "The following turn, Shikamaru deals 20 damage to one enemy and stuns their non-mental skills for 1 turn. If Shikamaru has a new enemy harmful skill used on him before it activates, this will be canceled. This skill is invisible.",
                "energy": [
                    "Genjutsu"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Chakra",
                    "Control",
                    "Instant",
                    "Invisible"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 20,
                        "scope": "target",
                        "condition": {
                            "statusId": "nara_shikamaru_shadow_balloon_mark",
                            "scope": "target"
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "nara_shikamaru_shadow_possession_stun",
                        "duration": 1,
                        "scope": "target",
                        "fresh": true,
                        "condition": {
                            "statusId": "nara_shikamaru_shadow_balloon_mark",
                            "scope": "target"
                        },
                        "metadata": {
                            "harmful": true,
                            "cannotUseNonMentalSkills": true,
                            "turnDurationAnchor": "source_turn",
                            "tooltipText": "This characters non-mental skills are stunned.",
                            "onExpireApplyStatusToSelf": {
                                "statusId": "nara_shikamaru_shadow_possession_used",
                                "duration": 1,
                                "metadata": {
                                    "tooltipText": "This skill was used."
                                }
                            }
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "nara_shikamaru_shadow_possession_pending",
                        "duration": 1,
                        "scope": "target",
                        "condition": {
                            "missingStatusId": "nara_shikamaru_shadow_balloon_mark",
                            "scope": "target"
                        },
                        "metadata": {
                            "harmful": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "turnEndDamage": 20,
                            "turnEndApplyStatusToSelf": {
                                "statusId": "nara_shikamaru_shadow_possession_stun",
                                "duration": 1,
                                "metadata": {
                                    "harmful": true,
                                    "cannotUseNonMentalSkills": true,
                                    "turnDurationAnchor": "source_turn",
                                    "tooltipText": "This characters non-mental skills are stunned.",
                                    "onExpireApplyStatusToSelf": {
                                        "statusId": "nara_shikamaru_shadow_possession_used",
                                        "duration": 1,
                                        "metadata": {
                                            "tooltipText": "This skill was used."
                                        }
                                    }
                                },
                                "fresh": true
                            },
                            "hideTooltipFromUnitOwner": true,
                            "tooltipText": "The following turn, Shikamaru deals 20 damage to one enemy and stuns their non-mental skills for 1 turn"
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "nara_shikamaru_shadow_possession_interrupt_window",
                        "duration": 1,
                        "scope": "self",
                        "condition": {
                            "missingStatusId": "nara_shikamaru_shadow_balloon_mark",
                            "scope": "target"
                        },
                        "metadata": {
                            "triggerOnEnemyHarmfulSkill": true,
                            "cancelEnemyStatusesByIdFromSelfSource": [
                                "nara_shikamaru_shadow_possession_pending"
                            ],
                            "hideTooltipFromEnemy": true,
                            "tooltipText": "If Shikamaru is hit by a new enemy harmful skill, Shadow Possession is canceled."
                        }
                    }
                ]
            },
            {
                "id": "nara-shikamaru-shadow-extending-balloon",
                "name": "Shadow Extending Balloon",
                "skillimage": "https://i.imgur.com/ySLkFoO.png",
                "skilldescription": "Shikamaru makes 'Shadow Possession' cost 1 random chakra for 1 turn. For 4 turns, a new random enemy will be marked by this skill every turn. While marked, 'Shadow Possession' will activate instantly on the target. This skill ignores invulnerability.",
                "energy": [
                    "none"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 4,
                "classes": [
                    "Physical",
                    "Ranged",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "nara_shikamaru_shadow_possession_cost_swap",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "skillReplacements": {
                                "nara-shikamaru-shadow-possession": "nara-shikamaru-shadow-possession-cheap",
                                "nara-shikamaru-shadow-possession-all": "nara-shikamaru-shadow-possession-all-cheap"
                            },
                            "tooltipText": "Shadow Possession costs 1 random chakra."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "nara_shikamaru_shadow_extending_balloon",
                        "duration": 4,
                        "scope": "self",
                        "metadata": {
                            "triggerOnApply": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "turnEndApplyStatusToRandomEnemy": {
                                "statusId": "nara_shikamaru_shadow_balloon_mark",
                                "duration": 1,
                                "metadata": {
                                    "harmful": true,
                                    "turnDurationAnchor": "source_turn",
                                    "tooltipText": "Marked by Shadow Extending Balloon: Shadow Possession activates instantly on this target."
                                },
                                "fresh": true,
                                "mustChangeTarget": true
                            },
                            "tooltipText": "Each turn, a new random enemy is marked. Shadow Possession activates instantly on marked enemies."
                        }
                    }
                ]
            },
            {
                "id": "nara-shikamaru-shadow-neck-bind",
                "name": "Shadow-Neck Bind",
                "skillimage": "https://i.imgur.com/S5vGQsi.png",
                "skilldescription": "Shikamaru chokes one enemy, dealing 25 affliction damage to them and making them unable to reduce damage or become invulnerable for 2 turns. If they are affected by 'Shadow Possession', this will re-apply its stun.",
                "energy": [
                    "Genjutsu",
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Chakra",
                    "Ranged",
                    "Action",
                    "Affliction"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 25,
                        "scope": "target",
                        "metadata": {
                            "afflictionDamage": true,
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "nara_shikamaru_shadow_neck_bind_lock",
                        "duration": 2,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "cannotReduceDamage": true,
                            "cannotBecomeInvulnerable": true,
                            "tooltipText": "This character cannot reduce damage or become invulnerable."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "nara_shikamaru_shadow_possession_stun",
                        "duration": 1,
                        "scope": "target",
                        "fresh": true,
                        "condition": {
                            "statusId": "nara_shikamaru_shadow_possession_stun",
                            "scope": "target"
                        },
                        "metadata": {
                            "harmful": true,
                            "cannotUseNonMentalSkills": true,
                            "turnDurationAnchor": "source_turn",
                            "tooltipText": "This character non-mental skills are stunned."
                        }
                    }
                ]
            },
            {
                "id": "nara-shikamaru-light-bomb",
                "name": "Light Bomb",
                "skillimage": "https://i.imgur.com/YX5Iv26.png",
                "skilldescription": "Next turn, all enemy harmful skills will be Blinded and target randomly for 1 turn. During this time, 'Shadow Possession' and 'Shadow-Neck Bind' will target all enemies.",
                "energy": [
                    "Random",
                    "Random"
                ],
                "target": "all-enemy",
                "damage": 0,
                "cooldown": 4,
                "classes": [
                    "Mental",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "nara_shikamaru_light_bomb_blind",
                        "duration": 1,
                        "scope": "all-enemy",
                        "metadata": {
                            "harmful": true,
                            "harmfulBlind": true,
                            "tooltipText": "This character harmful skills are blinded and will target a random enemy."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "nara_shikamaru_light_bomb_setup",
                        "duration": 2,
                        "scope": "self",
                        "metadata": {
                            "skillReplacements": {
                                "nara-shikamaru-shadow-possession": "nara-shikamaru-shadow-possession-all",
                                "nara-shikamaru-shadow-possession-cheap": "nara-shikamaru-shadow-possession-all-cheap",
                                "nara-shikamaru-shadow-neck-bind": "nara-shikamaru-shadow-neck-bind-all"
                            },
                            "tooltipText": "Shadow Possession and Shadow-Neck Bind target all enemies."
                        }
                    }
                ]
            },
            {
                "id": "nara-shikamaru-shadow-possession-cheap",
                "name": "Shadow Possession",
                "hiddenFromSelectionViewer": true,
                "useBaseSkillCooldown": true,
                "skillimage": "https://i.imgur.com/RqlOKy1.png",
                "skilldescription": "The following turn, Shikamaru deals 20 damage to one enemy and stuns their non-mental skills for 1 turn. If Shikamaru has a new enemy harmful skill used on him before it activates, this will be canceled. This skill is invisible.",
                "energy": [
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Chakra",
                    "Control",
                    "Instant",
                    "Invisible"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 20,
                        "scope": "target",
                        "condition": {
                            "statusId": "nara_shikamaru_shadow_balloon_mark",
                            "scope": "target"
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "nara_shikamaru_shadow_possession_stun",
                        "duration": 1,
                        "scope": "target",
                        "fresh": true,
                        "condition": {
                            "statusId": "nara_shikamaru_shadow_balloon_mark",
                            "scope": "target"
                        },
                        "metadata": {
                            "harmful": true,
                            "cannotUseNonMentalSkills": true,
                            "turnDurationAnchor": "source_turn",
                            "tooltipText": "This characters non-mental skills are stunned.",
                            "onExpireApplyStatusToSelf": {
                                "statusId": "nara_shikamaru_shadow_possession_used",
                                "duration": 1,
                                "metadata": {
                                    "tooltipText": "This skill was used."
                                }
                            }
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "nara_shikamaru_shadow_possession_pending",
                        "duration": 1,
                        "scope": "target",
                        "condition": {
                            "missingStatusId": "nara_shikamaru_shadow_balloon_mark",
                            "scope": "target"
                        },
                        "metadata": {
                            "harmful": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "turnEndDamage": 20,
                            "turnEndApplyStatusToSelf": {
                                "statusId": "nara_shikamaru_shadow_possession_stun",
                                "duration": 1,
                                "metadata": {
                                    "harmful": true,
                                    "cannotUseNonMentalSkills": true,
                                    "turnDurationAnchor": "source_turn",
                                    "tooltipText": "This characters non-mental skills are stunned.",
                                    "onExpireApplyStatusToSelf": {
                                        "statusId": "nara_shikamaru_shadow_possession_used",
                                        "duration": 1,
                                        "metadata": {
                                            "tooltipText": "This skill was used."
                                        }
                                    }
                                },
                                "fresh": true
                            },
                            "hideTooltipFromUnitOwner": true,
                            "tooltipText": "The following turn, Shikamaru deals 20 damage to one enemy and stuns their non-mental skills for 1 turn"
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "nara_shikamaru_shadow_possession_interrupt_window",
                        "duration": 1,
                        "scope": "self",
                        "condition": {
                            "missingStatusId": "nara_shikamaru_shadow_balloon_mark",
                            "scope": "target"
                        },
                        "metadata": {
                            "triggerOnEnemyHarmfulSkill": true,
                            "cancelEnemyStatusesByIdFromSelfSource": [
                                "nara_shikamaru_shadow_possession_pending"
                            ],
                            "hideTooltipFromEnemy": true,
                            "tooltipText": "If Shikamaru is hit by a new enemy harmful skill, Shadow Possession is canceled."
                        }
                    }
                ]
            },
            {
                "id": "nara-shikamaru-shadow-possession-all",
                "name": "Shadow Possession",
                "hiddenFromSelectionViewer": true,
                "useBaseSkillCooldown": true,
                "skillimage": "https://i.imgur.com/RqlOKy1.png",
                "skilldescription": "The following turn, Shikamaru deals 20 damage to all enemies and stuns their non-mental skills for 1 turn. If Shikamaru has a new enemy harmful skill used on him before it activates, this will be canceled. This skill is invisible.",
                "energy": [
                    "Genjutsu"
                ],
                "target": "all-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Chakra",
                    "Control",
                    "Instant",
                    "Invisible"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 20,
                        "scope": "all-enemy",
                        "condition": {
                            "statusId": "nara_shikamaru_shadow_balloon_mark",
                            "scope": "target"
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "nara_shikamaru_shadow_possession_stun",
                        "duration": 1,
                        "scope": "all-enemy",
                        "fresh": true,
                        "condition": {
                            "statusId": "nara_shikamaru_shadow_balloon_mark",
                            "scope": "target"
                        },
                        "metadata": {
                            "harmful": true,
                            "cannotUseNonMentalSkills": true,
                            "turnDurationAnchor": "source_turn",
                            "tooltipText": "This character non-mental skills is stunned.",
                            "onExpireApplyStatusToSelf": {
                                "statusId": "nara_shikamaru_shadow_possession_used",
                                "duration": 1,
                                "metadata": {
                                    "tooltipText": "This skill was used."
                                }
                            }
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "nara_shikamaru_shadow_possession_pending",
                        "duration": 1,
                        "scope": "all-enemy",
                        "condition": {
                            "missingStatusId": "nara_shikamaru_shadow_balloon_mark",
                            "scope": "target"
                        },
                        "metadata": {
                            "harmful": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "turnEndDamage": 20,
                            "turnEndApplyStatusToSelf": {
                                "statusId": "nara_shikamaru_shadow_possession_stun",
                                "duration": 1,
                                "metadata": {
                                    "harmful": true,
                                    "cannotUseNonMentalSkills": true,
                                    "turnDurationAnchor": "source_turn",
                                    "tooltipText": "This character non-mental skills is stunned.",
                                    "onExpireApplyStatusToSelf": {
                                        "statusId": "nara_shikamaru_shadow_possession_used",
                                        "duration": 1,
                                        "metadata": {
                                            "tooltipText": "This skill was used."
                                        }
                                    }
                                },
                                "fresh": true
                            },
                            "hideTooltipFromUnitOwner": true,
                            "tooltipText": "Shadow Possession is set and will trigger next turn."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "nara_shikamaru_shadow_possession_interrupt_window",
                        "duration": 1,
                        "scope": "self",
                        "condition": {
                            "missingStatusId": "nara_shikamaru_shadow_balloon_mark",
                            "scope": "target"
                        },
                        "metadata": {
                            "triggerOnEnemyHarmfulSkill": true,
                            "cancelEnemyStatusesByIdFromSelfSource": [
                                "nara_shikamaru_shadow_possession_pending"
                            ],
                            "hideTooltipFromEnemy": true,
                            "tooltipText": "If Shikamaru is hit by a new enemy harmful skill, Shadow Possession is canceled."
                        }
                    }
                ]
            },
            {
                "id": "nara-shikamaru-shadow-possession-all-cheap",
                "name": "Shadow Possession",
                "hiddenFromSelectionViewer": true,
                "useBaseSkillCooldown": true,
                "skillimage": "https://i.imgur.com/RqlOKy1.png",
                "skilldescription": "The following turn, Shikamaru deals 20 damage to all enemies and stuns their non-mental skills for 1 turn. If Shikamaru has a new enemy harmful skill used on him before it activates, this will be canceled. This skill is invisible.",
                "energy": [
                    "Random"
                ],
                "target": "all-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Chakra",
                    "Control",
                    "Instant",
                    "Invisible"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 20,
                        "scope": "all-enemy",
                        "condition": {
                            "statusId": "nara_shikamaru_shadow_balloon_mark",
                            "scope": "target"
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "nara_shikamaru_shadow_possession_stun",
                        "duration": 1,
                        "scope": "all-enemy",
                        "fresh": true,
                        "condition": {
                            "statusId": "nara_shikamaru_shadow_balloon_mark",
                            "scope": "target"
                        },
                        "metadata": {
                            "harmful": true,
                            "cannotUseNonMentalSkills": true,
                            "turnDurationAnchor": "source_turn",
                            "tooltipText": "This character non-mental skills is stunned.",
                            "onExpireApplyStatusToSelf": {
                                "statusId": "nara_shikamaru_shadow_possession_used",
                                "duration": 1,
                                "metadata": {
                                    "tooltipText": "This skill was used."
                                }
                            }
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "nara_shikamaru_shadow_possession_pending",
                        "duration": 1,
                        "scope": "all-enemy",
                        "condition": {
                            "missingStatusId": "nara_shikamaru_shadow_balloon_mark",
                            "scope": "target"
                        },
                        "metadata": {
                            "harmful": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "turnEndDamage": 20,
                            "turnEndApplyStatusToSelf": {
                                "statusId": "nara_shikamaru_shadow_possession_stun",
                                "duration": 1,
                                "metadata": {
                                    "harmful": true,
                                    "cannotUseNonMentalSkills": true,
                                    "turnDurationAnchor": "source_turn",
                                    "tooltipText": "This character non-mental skills is stunned.",
                                    "onExpireApplyStatusToSelf": {
                                        "statusId": "nara_shikamaru_shadow_possession_used",
                                        "duration": 1,
                                        "metadata": {
                                            "tooltipText": "This skill was used."
                                        }
                                    }
                                },
                                "fresh": true
                            },
                            "hideTooltipFromEnemy": true,
                            "tooltipText": "Shadow Possession is set and will trigger next turn."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "nara_shikamaru_shadow_possession_interrupt_window",
                        "duration": 1,
                        "scope": "self",
                        "condition": {
                            "missingStatusId": "nara_shikamaru_shadow_balloon_mark",
                            "scope": "target"
                        },
                        "metadata": {
                            "triggerOnEnemyHarmfulSkill": true,
                            "cancelEnemyStatusesByIdFromSelfSource": [
                                "nara_shikamaru_shadow_possession_pending"
                            ],
                            "hideTooltip": true,
                            "tooltipText": "If Shikamaru is hit by a new enemy harmful skill, Shadow Possession is canceled."
                        }
                    }
                ]
            },
            {
                "id": "nara-shikamaru-shadow-neck-bind-all",
                "name": "Shadow-Neck Bind",
                "hiddenFromSelectionViewer": true,
                "useBaseSkillCooldown": true,
                "skillimage": "https://i.imgur.com/S5vGQsi.png",
                "skilldescription": "Shikamaru chokes all enemies, dealing 25 affliction damage to them and making them unable to reduce damage or become invulnerable for 2 turns. If they are affected by 'Shadow Possession', this will re-apply its stun.",
                "energy": [
                    "Genjutsu",
                    "Random"
                ],
                "target": "all-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Chakra",
                    "Ranged",
                    "Action",
                    "Affliction"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 25,
                        "scope": "all-enemy",
                        "metadata": {
                            "afflictionDamage": true,
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "nara_shikamaru_shadow_neck_bind_lock",
                        "duration": 2,
                        "scope": "all-enemy",
                        "metadata": {
                            "harmful": true,
                            "cannotReduceDamage": true,
                            "cannotBecomeInvulnerable": true,
                            "tooltipText": "This character cannot reduce damage or become invulnerable."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "nara_shikamaru_shadow_possession_stun",
                        "duration": 1,
                        "scope": "all-enemy",
                        "fresh": true,
                        "condition": {
                            "statusId": "nara_shikamaru_shadow_possession_stun",
                            "scope": "target"
                        },
                        "metadata": {
                            "harmful": true,
                            "cannotUseNonMentalSkills": true,
                            "turnDurationAnchor": "source_turn",
                            "tooltipText": "This character cannot use non-mental skills."
                        }
                    }
                ]
            }
        ]
    },
    {
        "id": "akimichi-chouji",
        "characterId": "akimichi-chouji",
        "name": "Akimichi Chouji",
        "facePicture": "https://i.imgur.com/Qmwl4FM.png",
        "characterdeescription": "A loyal member of the Ino–Shika–Cho formation, Chouji turns devotion into overwhelming force. By converting his own vitality into power, he evolves throughout battle, shifting from defensive anchor to unstoppable juggernaut. The longer he stands, the harder he hits.",
        "skills": [
            {
                "id": "akimichi-chouji-sumo-toss",
                "name": "Sumo Toss",
                "cannotBeCountered": true,
                "skillimage": "https://i.imgur.com/W9gcvQ1.png",
                "skilldescription": "Chouji grapples and throws one enemy dealing 25 damage to them that cannot be countered. This deals piercing damage if 'Spiked Meat Tank' is active.",
                "energy": [
                    "Taijutsu"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Physical",
                    "Melee",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 25,
                        "scope": "target",
                        "condition": {
                            "scope": "self",
                            "missingStatusId": "akimichi_chouji_spiked_meat_tank_active"
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 25,
                        "scope": "target",
                        "condition": {
                            "scope": "self",
                            "statusId": "akimichi_chouji_spiked_meat_tank_active"
                        },
                        "metadata": {
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true
                        }
                    }
                ]
            },
            {
                "id": "akimichi-chouji-meat-tank",
                "name": "Meat Tank",
                "skillimage": "https://i.imgur.com/kfUBep4.png",
                "skilldescription": "Chouji transforms into a meat tank dealing 15 damage to one enemy for 2 turns. Chouji ignores enemy stun effects and gains 10 points of damage reduction for 2 turns.",
                "energy": [
                    "Bloodline"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 2,
                "classes": [
                    "Physical",
                    "Action",
                    "Melee"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 15,
                        "scope": "target"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "akimichi_chouji_meat_tank_followup",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "turnEndDamage": 15,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "ongoingClass": "action",
                            "tooltipText": "This character will take 15 damage next turn."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "akimichi_chouji_meat_tank_guard",
                        "duration": 2,
                        "scope": "self",
                        "metadata": {
                            "cannotBeStunned": true,
                            "damageReductionFlat": 10,
                            "tooltipText": "This character ignores stuns and has 10 damage reduction."
                        }
                    }
                ]
            },
            {
                "id": "akimichi-chouji-spinach-pill",
                "name": "Spinach Pill",
                "skillimage": "https://i.imgur.com/VuPJeKk.png",
                "skilldescription": "Chouji eats a pill, loses 15 health. 'Meat Tank' swaps to 'Spiked Meat Tank' and this swaps to 'Curry Pill' permanently. For 1 turn, Chouji's skill will have no cost.",
                "energy": [
                    "none"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Chakra",
                    "Instant",
                    "Unique",
                    "Affliction*"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "akimichi_chouji_spinach_pill_swap",
                        "duration": 99,
                        "scope": "self",
                        "metadata": {
                            "skillReplacements": {
                                "akimichi-chouji-meat-tank": "akimichi-chouji-spiked-meat-tank",
                                "akimichi-chouji-spinach-pill": "akimichi-chouji-curry-pill"
                            },
                            "tooltipText": "Meat Tank and Spinach Pill are replaced by transformed skills."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "akimichi_chouji_pill_cost_free",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "randomCostReduction": 99,
                            "taijutsuCostReduction": 99,
                            "ninjutsuCostReduction": 99,
                            "bloodlineCostReduction": 99,
                            "genjutsuCostReduction": 99,
                            "tooltipText": "This character skills cost no chakra this turn."
                        }
                    },
                    {
                        "type": "HealthLoss",
                        "amount": 15,
                        "scope": "self"
                    }
                ]
            },
            {
                "id": "akimichi-chouji-body-block",
                "name": "Body Block",
                "skillimage": "https://i.imgur.com/PKFvfvZ.png",
                "skilldescription": "Chouji makes himself or an ally invulnerable for 1 turn.",
                "energy": [
                    "Bloodline"
                ],
                "target": "self-or-single-ally",
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "akimichi_chouji_body_block",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "invulnerable": true,
                            "tooltipText": "This character is invulnerable."
                        }
                    }
                ]
            },
            {
                "id": "akimichi-chouji-spiked-meat-tank",
                "name": "Spiked Meat Tank",
                "useBaseSkillCooldown": true,
                "skillimage": "https://i.imgur.com/e94I4P6.png",
                "skilldescription": "Chouji deals 10 normal and 10 piercing damage to one enemy for 2 turns. Chouji ignores enemy stun effects, gains 10 damage reduction, and deals 10 piercing damage to any enemy that uses a new non-mental skill on him during this time*.",
                "energy": [
                    "Bloodline"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 2,
                "classes": [
                    "Physical",
                    "Action",
                    "Melee",
                    "Instant*"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 10,
                        "scope": "target"
                    },
                    {
                        "type": "damage",
                        "amount": 10,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageReduction": true
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "akimichi_chouji_spiked_meat_tank_followup_normal",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "turnEndDamage": 10,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "ongoingClass": "action",
                            "tooltipText": "This character will take 10 damage next turn."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "akimichi_chouji_spiked_meat_tank_followup_pierce",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "turnEndDamage": 10,
                            "ignoreTargetDamageReduction": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "ongoingClass": "action",
                            "tooltipText": "This character will take 10 piercing damage next turn."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "akimichi_chouji_spiked_meat_tank_active",
                        "duration": 2,
                        "scope": "self",
                        "metadata": {
                            "cannotBeStunned": true,
                            "damageReductionFlat": 10,
                            "triggerOnEnemyHarmfulNonMental": true,
                            "counterDamage": 10,
                            "counterDamageIgnoresReduction": true,
                            "tooltipText": "This character ignores stuns, has 10 damage reduction, and deals 10 piercing damage when targeted by an enemy's harmful non-mental skill."
                        }
                    }
                ]
            },
            {
                "id": "akimichi-chouji-partial-multi-size",
                "name": "Partial Multi-Size",
                "cannotBeCountered": true,
                "useBaseSkillCooldown": true,
                "ignoreInvulnerability": true,
                "skillimage": "https://i.imgur.com/CN8PWyT.png",
                "skilldescription": "Chouji doubles the size of his arm and strikes one enemy dealing 35 damage that cannot be countered and ignores invulnerability. This deals piercing damage if 'Spiked Meat Tank' is active.",
                "energy": [
                    "Taijutsu"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Physical",
                    "Instant",
                    "Melee"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 35,
                        "scope": "target",
                        "condition": {
                            "scope": "self",
                            "missingStatusId": "akimichi_chouji_spiked_meat_tank_active"
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 35,
                        "scope": "target",
                        "condition": {
                            "scope": "self",
                            "statusId": "akimichi_chouji_spiked_meat_tank_active"
                        },
                        "metadata": {
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true
                        }
                    }
                ]
            },
            {
                "id": "akimichi-chouji-curry-pill",
                "name": "Curry Pill",
                "useBaseSkillCooldown": true,
                "skillimage": "https://i.imgur.com/TnRxxJO.png",
                "skilldescription": "Chouji eats a pill, loses 25 health. 'Sumo Toss' becomes 'Partial Multi-Size' and this becomes 'Super Multi-Size' permanently. For 1 turn, Chouji's next skill will have no cost.",
                "energy": [
                    "none"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Chakra",
                    "Instant",
                    "Unique",
                    "Affliction"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "akimichi_chouji_curry_pill_swap",
                        "duration": 99,
                        "scope": "self",
                        "metadata": {
                            "skillReplacements": {
                                "akimichi-chouji-sumo-toss": "akimichi-chouji-partial-multi-size",
                                "akimichi-chouji-curry-pill": "akimichi-chouji-super-multi-size"
                            },
                            "tooltipText": "Sumo Toss and Curry Pill are replaced by transformed skills."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "akimichi_chouji_pill_cost_free",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "randomCostReduction": 99,
                            "taijutsuCostReduction": 99,
                            "ninjutsuCostReduction": 99,
                            "bloodlineCostReduction": 99,
                            "genjutsuCostReduction": 99,
                            "tooltipText": "This character skills cost no chakra this turn."
                        }
                    },
                    {
                        "type": "HealthLoss",
                        "amount": 25,
                        "scope": "self"
                    }
                ]
            },
            {
                "id": "akimichi-chouji-super-multi-size",
                "name": "Super Multi-Size",
                "useBaseSkillCooldown": true,
                "skillimage": "https://i.imgur.com/ibzuFzU.png",
                "skilldescription": "Chouji gains 45 destructible defense for 2 turns. When this skill ends, Chouji deals damage to the enemy team equal to the remaining destructible defense from this skill and fully stuns them for 1 turn. This skill is cancelled if the DD is completely destroyed.",
                "energy": [
                    "Taijutsu",
                    "Bloodline",
                    "Random"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 4,
                "classes": [
                    "Physical",
                    "Instant",
                    "Melee"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "akimichi_chouji_super_multi_size_trigger",
                        "duration": 2,
                        "scope": "self",
                        "metadata": {
                            "superMultiSizeBurstStatusId": "akimichi_chouji_super_multi_size_dd",
                            "superMultiSizeBurstStunDuration": 1,
                            "superMultiSizeBurstTooltip": "When this effect ends, enemies are hit for damage equal to remaining Super Multi-Size destructible defense and is stunned for 1 turn.",
                            "tooltipText": "When this effect ends, enemies are hit for damage equal to remaining Super Multi-Size destructible defense and is stunned for 1 turn."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "akimichi_chouji_super_multi_size_dd",
                        "duration": 2,
                        "scope": "self",
                        "metadata": {
                            "destructibleDefensePoints": 45,
                            "removeStatusIdsOnBreak": [
                                "akimichi_chouji_super_multi_size_trigger"
                            ],
                            "tooltipText": "This character has 45 destructible defense."
                        }
                    }
                ]
            }
        ]
    },
    {
        "id": "akimichi-chouji-butterfly-mode",
        "characterId": "akimichi-chouji-butterfly-mode",
        "name": "Akimichi Chouji (Butterfly Mode)",
        "facePicture": "https://i.imgur.com/Yp0EunK.png",
        "characterdeescription": "Butterfly Mode Chouji functions as a late-game execution threat who converts missing health into explosive damage. He excels at breaking through defensive teams, punishing high-defense compositions, and locking down priority targets. While difficult to control due to stun immunity and damage reduction, his self-draining mechanics force careful timing. Best deployed when enemy defenses are established and targets are vulnerable to burst.",
        "skills": [
            {
                "id": "akimichi-chouji-butterfly-mode-chili-pepper-pill",
                "name": "Chili Pepper Pill",
                "skillimage": "https://i.imgur.com/KTK6Tcd.png",
                "skilldescription": "Chouji begins losing 5 HP and capping his health every turn*. During this time, he gains 15 points of unpierceable damage reduction, may use his other skills, and ignores enemy stun effects. Swaps to 'Devastating Knockout. This cannot be removed or ignored.",
                "energy": [
                    "Random"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Chakra",
                    "Affliction*",
                    "Instant",
                    "Unique"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "akimichi_chouji_butterfly_mode_chili_pepper_pill_active",
                        "duration": 99,
                        "scope": "self",
                        "metadata": {
                            "cannotBeStunned": true,
                            "unpierceableDamageReductionFlat": 15,
                            "turnEndHealthLoss": 5,
                            "turnEndHealthCapLoss": 5,
                            "skillReplacements": {
                                "akimichi-chouji-butterfly-mode-chili-pepper-pill": "akimichi-chouji-butterfly-mode-devastating-knockout"
                            },
                            "tooltipText": "This character loses 5 health and 5 health cap each turn, ignores stuns, has 15 unpierceable damage reduction, and Chili Pepper Pill is replaced by Devastating Knockout."
                        }
                    }
                ]
            },
            {
                "id": "akimichi-chouji-butterfly-mode-butterfly-bullet-bombing",
                "name": "Butterfly Bullet Bombing",
                "cannotBeCountered": true,
                "cannotBeReflected": true,
                "skillimage": "https://i.imgur.com/x2kXa6R.png",
                "skilldescription": "Chouji destroys all of one enemy's destructible defense then deals 35 damage to them (+10 for every 30 HP he is missing). This skill cannot be countered or reflected. Requires 'Chili Pepper Pill' active to be used.",
                "energy": [
                    "Taijutsu",
                    "Ninjutsu"
                ],
                "target": "single-enemy",
                "actorCondition": {
                    "statusId": "akimichi_chouji_butterfly_mode_chili_pepper_pill_active"
                },
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Physical",
                    "Instant",
                    "Melee",
                    "Unique"
                ],
                "effects": [
                    {
                        "type": "destroy_destructible_defense",
                        "scope": "target",
                        "condition": {
                            "scope": "self",
                            "statusId": "akimichi_chouji_butterfly_mode_chili_pepper_pill_active"
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 35,
                        "scope": "target",
                        "condition": {
                            "scope": "self",
                            "statusId": "akimichi_chouji_butterfly_mode_chili_pepper_pill_active"
                        },
                        "metadata": {
                            "amountFromSourceMissingHpDivisor": 30,
                            "amountFromSourceMissingHpStep": 10
                        }
                    }
                ]
            },
            {
                "id": "akimichi-chouji-butterfly-mode-chakra-wings",
                "name": "Chakra Wings",
                "skillimage": "https://i.imgur.com/YlQxtCw.png",
                "skilldescription": "Chouji reduces the cost of his skills by 1 taijutsu chakra and loses 10 HP every turn for 3 turns. If Chouji kills an enemy during this time, his health cannot fall below 1 HP for 1 turn. Requires 'Chili Pepper Pill' to be active to be used.",
                "energy": [
                    "Ninjutsu",
                    "Random"
                ],
                "target": "self",
                "actorCondition": {
                    "statusId": "akimichi_chouji_butterfly_mode_chili_pepper_pill_active"
                },
                "damage": 0,
                "cooldown": 4,
                "classes": [
                    "Chakra",
                    "Instant",
                    "Unique",
                    "Affliction*"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "akimichi_chouji_butterfly_mode_chakra_wings_active",
                        "duration": 3,
                        "scope": "self",
                        "condition": {
                            "scope": "self",
                            "statusId": "akimichi_chouji_butterfly_mode_chili_pepper_pill_active"
                        },
                        "metadata": {
                            "taijutsuCostReduction": 1,
                            "turnEndHealthLoss": 10,
                            "tooltipText": "This character loses 10 health each turn and their skills cost 1 less taijutsu chakra."
                        }
                    }
                ]
            },
            {
                "id": "akimichi-chouji-butterfly-mode-effortless-block",
                "name": "Effortless Block",
                "skillimage": "https://i.imgur.com/CzT8mhU.png",
                "skilldescription": "This skill makes Akimichi Chouji invulnerable for 1 turn. Requires 'Chili Pepper Pill'.",
                "energy": [
                    "Random"
                ],
                "target": "self",
                "actorCondition": {
                    "statusId": "akimichi_chouji_butterfly_mode_chili_pepper_pill_active"
                },
                "damage": 0,
                "cooldown": 4,
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "akimichi_chouji_butterfly_mode_effortless_block",
                        "duration": 1,
                        "scope": "self",
                        "condition": {
                            "scope": "self",
                            "statusId": "akimichi_chouji_butterfly_mode_chili_pepper_pill_active"
                        },
                        "metadata": {
                            "invulnerable": true,
                            "tooltipText": "This character is invulnerable."
                        }
                    }
                ]
            },
            {
                "id": "akimichi-chouji-butterfly-mode-devastating-knockout",
                "name": "Devastating Knockout",
                "skillimage": "https://i.imgur.com/f1iAKd5.png",
                "skilldescription": "Deals 30 piercing damage to one enemy and fully stuns them for 1 turn. This deals 10 additional damage if Chouji has 25 HP or less.",
                "energy": [
                    "Taijutsu",
                    "Random"
                ],
                "target": "single-enemy",
                "actorCondition": {
                    "statusId": "akimichi_chouji_butterfly_mode_chili_pepper_pill_active"
                },
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Physical",
                    "Melee",
                    "Instant",
                    "Unique"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 30,
                        "scope": "target",
                        "condition": {
                            "scope": "self",
                            "statusId": "akimichi_chouji_butterfly_mode_chili_pepper_pill_active",
                            "sourceCurrentHpAtLeast": 26
                        },
                        "metadata": {
                            "ignoreDamageReduction": true
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 40,
                        "scope": "target",
                        "condition": {
                            "scope": "self",
                            "statusId": "akimichi_chouji_butterfly_mode_chili_pepper_pill_active",
                            "sourceCurrentHpAtMost": 25
                        },
                        "metadata": {
                            "ignoreDamageReduction": true
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "stunned",
                        "duration": 1,
                        "scope": "target",
                        "condition": {
                            "scope": "self",
                            "statusId": "akimichi_chouji_butterfly_mode_chili_pepper_pill_active"
                        },
                        "metadata": {
                            "harmful": true,
                            "cannotUseSkills": true,
                            "tooltipText": "This character is stunned."
                        }
                    }
                ]
            }
        ]
    },
    {
        "id": "yamanaka-ino",
        "characterId": "yamanaka-ino",
        "name": "Yamanaka Ino",
        "facePicture": "https://i.imgur.com/3EgUlLf.png",
        "characterdeescription": "Yamanaka Ino is the heir to the Yamanaka clan’s mind techniques, a kunoichi who turns emotion into a weapon sharper than steel. She dismantles opponents through redirection, silence, and layered psychological pressure, forcing enemies to betray their own strategies.",
        "skills": [
            {
                "id": "yamanaka-ino-mind-body-disturbance",
                "name": "Mind Body Disturbance",
                "skillimage": "https://i.imgur.com/PVjnd83.png",
                "skilldescription": "Target one enemy, a random skill of theirs becomes unusable next turn and they take 20 piercing damage that ignores invulnerability. If used on the same target twice in a row, it instead silences all their skills for 1 turn.",
                "energy": [
                    "Ninjutsu"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Mental",
                    "Ranged",
                    "Instant"
                ],
                "ignoreInvulnerability": true,
                "effects": [
                    {
                        "type": "damage",
                        "amount": 20,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "yamanaka_ino_mind_body_disturbance_control",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "repeatTargetControl": {
                                "trackerStatusId": "repeat_target_tracker",
                                "trackerDuration": 99,
                                "trackerTooltipText": "Mind Body Disturbance is tracking this target.",
                                "lockStatusId": "yamanaka_ino_mind_body_disturbance_skill_lock",
                                "silenceStatusId": "yamanaka_ino_mind_body_disturbance_silence",
                                "lockTooltipTextTemplate": "Skill slot {slot} is unusable this turn.",
                                "silenceTooltipText": "Silenced: only damage from this character's skills will work."
                            },
                            "harmful": true,
                            "tooltipText": "A random skill becomes unusable next turn."
                        }
                    }
                ]
            },
            {
                "id": "yamanaka-ino-change-of-heart",
                "name": "Change of Heart",
                "skillimage": "https://i.imgur.com/HPuwelK.png",
                "skilldescription": "Target enemy for 1 turn: Reflect their next harmful non-mental skill to a random ally on their team. If they are the last alive enemy, they re-direct it to themselves instead. This skill is invisible.",
                "energy": [
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 2,
                "classes": [
                    "Mental",
                    "Ranged",
                    "Instant",
                    "Invisible"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "yamanaka_ino_change_of_heart",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "reflectNextIncomingSkill": true,
                            "reflectOnlyHarmfulSkills": true,
                            "reflectExcludeSkillClasses": [
                                "mental"
                            ],
                            "reflectToRandomCasterAlly": true,
                            "hideTooltipFromUnitOwner": true,
                            "onExpireApplyStatusToSelf": {
                                "statusId": "yamanaka_ino_change_of_heart_used",
                                "duration": 1,
                                "metadata": {
                                    "tooltipText": "This skill was used."
                                }
                            },
                            "harmful": true,
                            "tooltipText": "The next harmful non-mental skill is reflected to another enemy."
                        }
                    }
                ]
            },
            {
                "id": "yamanaka-ino-chakra-hair-strand-trap",
                "name": "Chakra Hair Strand Trap",
                "skillimage": "https://i.imgur.com/FcB0U4w.png",
                "skilldescription": "Paralyzes one enemy's cooldowns for 2 turns and deals 10 piercing damage to them if they use a new non-mental skill next turn. This skill is invisible. 'Mind Body Disturbance' deals 10 additional damage and 'Change of Heart' lasts 1 additional turn on an affected enemy.",
                "energy": [
                    "none"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Chakra",
                    "Instant",
                    "Ranged",
                    "Invisible"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "yamanaka_ino_chakra_hair_cooldown_paralyze",
                        "duration": 2,
                        "scope": "target",
                        "metadata": {
                            "freezeCooldowns": true,
                            "hideTooltipFromUnitOwner": true,
                            "onExpireApplyStatusToSelf": {
                                "statusId": "yamanaka_ino_chakra_hair_strand_trap_used",
                                "duration": 1,
                                "metadata": {
                                    "tooltipText": "This skill was used."
                                }
                            },
                            "harmful": true,
                            "bonusDamageFromSourceSkillsFlat": 10,
                            "bonusDamageFromSourceCharacterId": "yamanaka-ino",
                            "bonusDamageAppliesToSkillIds": [
                                "yamanaka-ino-mind-body-disturbance"
                            ],
                            "extendIncomingStatusDuration": [
                                {
                                    "whenStatusHasMetadataFlag": "reflectNextIncomingSkill",
                                    "by": 1
                                }
                            ],
                            "tooltipText": "This enemies Cooldowns are paralyzed and Mind Body Disturbance deals 10 additional damage to them."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "yamanaka_ino_chakra_hair_non_mental_trigger",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "hideTooltipFromUnitOwner": true,
                            "onOwnerUseNonMentalSkillSelfDamage": 10,
                            "onOwnerUseNonMentalSkillSelfDamageIgnoreDamageReduction": true,
                            "tooltipText": "If this character uses a non-mental skill next turn, they take 10 damage."
                        }
                    }
                ]
            },
            {
                "id": "yamanaka-ino-mental-guard",
                "name": "Mental Guard",
                "skillimage": "https://i.imgur.com/PMkrEtQ.png",
                "skilldescription": "Ino ignores all mental skills for 2 turns and reflects the first mental skill used on her team back to the enemy that used it. This skill is invisible.",
                "energy": [
                    "Random"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 4,
                "classes": [
                    "Mental",
                    "Instant",
                    "Invisible"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "yamanaka_ino_mental_guard_ignore_mental",
                        "duration": 2,
                        "scope": "self",
                        "metadata": {
                            "ignoreSkillClasses": [
                                "mental"
                            ],
                            "tooltipText": "Ino ignores mental skills.",
                            "hideTooltipFromEnemy": true,
                            "onExpireApplyStatusToSelf": {
                                "statusId": "yamanaka_ino_mental_guard_used",
                                "duration": 1,
                                "metadata": {
                                    "tooltipText": "This skill was used."
                                }
                            }
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "yamanaka_ino_mental_guard_team_reflect",
                        "duration": 2,
                        "scope": "all-allies",
                        "metadata": {
                            "teamReflectNextIncomingSkill": true,
                            "hideTooltipFromEnemy": true,
                            "reflectOnlySkillClasses": [
                                "mental"
                            ],
                            "reflectBackToCaster": true,
                            "onExpireApplyStatusToSelf": {
                                "statusId": "yamanaka_ino_mental_guard_used",
                                "duration": 1,
                                "metadata": {
                                    "tooltipText": "This skill was used."
                                }
                            },
                            "tooltipText": "The first harmful mental skill used on Ino's team is reflected."
                        }
                    }
                ]
            }
        ]
    },
    {
        "id": "rock-lee",
        "characterId": "rock-lee",
        "name": "Rock Lee",
        "facePicture": "https://i.imgur.com/e11I0eR.png",
        "characterdeescription": "Rock Lee is a relentless close-range fighter who overwhelms enemies with speed, precision, and unbreakable discipline. Specializing in fast combos, pressure control, and survivability through pure taijutsu, Lee rewards aggressive play and skillful timing, turning momentum into constant advantage on the battlefield.",
        "skills": [
            {
                "id": "rock-lee-high-speed-taijutsu",
                "name": "High Speed Taijutsu",
                "skillimage": "https://i.imgur.com/dq0vpYR.png",
                "skilldescription": "Lee attacks one enemy with amazing speed, dealing 15 damage to them. For 1 turn, 'Strong Front Kick' will deal 20 damage then mark its target and Lee will have a 15% chance to Evade enemy non-mental skills.",
                "energy": [
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Physical",
                    "Melee",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 15,
                        "scope": "target"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "rock_lee_high_speed_taijutsu_buff",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "evadeChancePercent": 15,
                            "evadeAgainstNonMental": true,
                            "skillReplacements": {
                                "rock-lee-strong-front-kick": "rock-lee-strong-front-kick-empowered"
                            },
                            "tooltipText": "Strong Front Kick is improved and rock lee has a 15% chance to evade enemy non-mental skills."
                        }
                    }
                ]
            },
            {
                "id": "rock-lee-blowing-kisses",
                "name": "Blowing Kisses",
                "skillimage": "https://i.imgur.com/ZH5Jfzy.png",
                "skilldescription": "Targets an enemy for 1 turn. If they use a new skill, Lee heals 10 HP and they take 10 additional damage from him permanently, stacking up to 3 times. This skill is invisible (but its stacks aren't).",
                "energy": [
                    "none"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 2,
                "classes": [
                    "Mental",
                    "Ranged",
                    "Instant",
                    "Invisible"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "rock_lee_blowing_kisses_watch",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "onOwnerUseSkillTrigger": true,
                            "onOwnerUseSkillHealSourceAmount": 10,
                            "onOwnerUseSkillApplyStatusToOwner": {
                                "statusId": "rock_lee_blowing_kisses_vulnerability",
                                "duration": 99,
                                "metadata": {
                                    "harmful": true,
                                    "bonusDamageFromSourceCharacterId": "rock-lee",
                                    "bonusDamageFromSourceSkillsPerStack": 10,
                                    "bonusDamageFromSourceSkillsPerStackMetadataKey": "blowingKissesStacks",
                                    "blowingKissesStacks": 1,
                                    "stackMetadataKey": "blowingKissesStacks",
                                    "stackDelta": 1,
                                    "stackMax": 3,
                                    "tooltipTextTemplate": "This character takes {stacks}0 additional damage from Rock Lee's skills."
                                }
                            },
                            "hideTooltipFromUnitOwner": true,
                            "tooltipText": "If this character uses a new skill, Lee heals 10 HP and they take 10 additional damage from him permanently."
                        }
                    }
                ]
            },
            {
                "id": "rock-lee-strong-front-kick",
                "name": "Strong Front Kick",
                "skillimage": "https://i.imgur.com/d8vV5rn.png",
                "skilldescription": "Lee marks an enemy and gains 10 destructible defense for 1 turn. When the mark ends, the target takes 30 damage. Next turn, 'High Speed Taijutsu' deals 10 additional damage and grants 10% additional Evasion.",
                "energy": [
                    "Taijutsu"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Physical",
                    "Melee",
                    "Control"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "rock_lee_strong_front_kick_mark",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "turnEndDamage": 30,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "ongoingClass": "action",
                            "tooltipText": "When this mark ends, this character takes 30 damage."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "rock_lee_front_kick_defense",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "destructibleDefensePoints": 10,
                            "tooltipText": "Rock Lee has 10 destructible defense."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "rock_lee_front_kick_next_turn_delay",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "triggerOnApply": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "hideTooltip": true,
                            "turnEndApplyStatusToSelf": {
                                "statusId": "rock_lee_front_kick_next_turn_buff",
                                "duration": 1,
                                "metadata": {
                                    "skillDamageBonuses": {
                                        "rock-lee-high-speed-taijutsu": 10
                                    },
                                    "evadeChancePercent": 10,
                                    "evadeAgainstNonMental": true,
                                    "tooltipText": "Next turn High Speed Taijutsu deals 10 additional damage and this character gains 10% additional evade chance."
                                },
                                "fresh": false
                            }
                        }
                    }
                ]
            },
            {
                "id": "rock-lee-taijutsu-guard",
                "name": "Taijutsu Guard",
                "skillimage": "https://i.imgur.com/B2ovfhp.png",
                "skilldescription": "Rock Lee targets himself or an ally for 1 turn. If an enemy uses a new harmful skill on them, they will be countered. If successful, the countered enemy will have 'High Speed Taijutsu' cast on them. This skill is invisible.",
                "energy": [
                    "Random"
                ],
                "target": "self-or-single-ally",
                "damage": 0,
                "cooldown": 2,
                "classes": [
                    "Physical",
                    "Instant",
                    "Invisible"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "rock_lee_taijutsu_guard",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "triggerOnEnemyHarmfulSkill": true,
                            "counterCancelsSkill": true,
                            "counterDamage": 15,
                            "turnDurationAnchor": "source_turn",
                            "counterApplyStatusToSourceOwner": {
                                "statusId": "rock_lee_high_speed_taijutsu_buff",
                                "duration": 1,
                                "metadata": {
                                    "evadeChancePercent": 15,
                                    "evadeAgainstNonMental": true,
                                    "skillReplacements": {
                                        "rock-lee-strong-front-kick": "rock-lee-strong-front-kick-empowered"
                                    },
                                    "tooltipText": "Strong Front Kick is improved and Rock Lee has a 15% chance to evade enemy non-mental skills."
                                }
                            },
                            "usedStatusId": "rock_lee_taijutsu_guard_used",
                            "usedStatusDuration": 1,
                            "usedStatusMetadata": {
                                "tooltipText": "This skill has been used."
                            },
                            "onExpireApplyStatusToSelf": {
                                "statusId": "rock_lee_taijutsu_guard_used",
                                "duration": 1,
                                "metadata": {
                                    "tooltipText": "This skill has been used."
                                }
                            },
                            "hideTooltipFromEnemy": true,
                            "tooltipText": "The next enemy harmful skill on Rock Lee is countered."
                        }
                    }
                ]
            },
            {
                "id": "rock-lee-strong-front-kick-empowered",
                "name": "Strong Front Kick",
                "hiddenFromSelectionViewer": true,
                "skillimage": "https://i.imgur.com/d8vV5rn.png",
                "skilldescription": "Lee deals 20 damage to one enemy, marks them, and gains 10 destructible defense for 1 turn. When the mark ends, the target takes 30 damage. Next turn, High Speed Taijutsu deals 10 additional damage and grants 10% additional Evasion.",
                "energy": [
                    "Taijutsu"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Physical",
                    "Melee",
                    "Control"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 20,
                        "scope": "target"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "rock_lee_strong_front_kick_mark",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "turnEndDamage": 30,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "ongoingClass": "action",
                            "tooltipText": "When this mark ends, this character takes 30 damage."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "rock_lee_front_kick_defense",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "destructibleDefensePoints": 10,
                            "tooltipText": "Rock Lee has 10 destructible defense."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "rock_lee_high_speed_taijutsu_buff2",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "evadeChancePercent": 15,
                            "evadeAgainstNonMental": true,
                            "skillReplacements": {
                                "rock-lee-high-speed-taijutsu": "rock-lee-high-speed-taijutsu-empowered"
                            },
                            "tooltipText": "High Speed Taijutsu is improved."
                        }
                    }
                ]
            },
            {
                "id": "rock-lee-high-speed-taijutsu-empowered",
                "name": "High Speed Taijutsu",
                "hiddenFromSelectionViewer": true,
                "skillimage": "https://i.imgur.com/dq0vpYR.png",
                "skilldescription": "Lee attacks one enemy with amazing speed, dealing 25 damage to them. For 1 turn, 'Strong Front Kick' will deal 20 damage then mark its target and Lee will have a 25% chance to Evade enemy non-mental skills.",
                "energy": [
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Physical",
                    "Melee",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 25,
                        "scope": "target"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "rock_lee_high_speed_taijutsu_buff",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "evadeChancePercent": 25,
                            "evadeAgainstNonMental": true,
                            "skillReplacements": {
                                "rock-lee-strong-front-kick": "rock-lee-strong-front-kick-empowered"
                            },
                            "tooltipText": "Strong Front Kick is improved and rock lee has a 25% chance to evade enemy non-mental skills."
                        }
                    }
                ]
            }
        ]
    },
    {
        "id": "fourth-gate-lee",
        "characterId": "fourth-gate-lee",
        "name": "Fourth Gate Lee",
        "facePicture": "https://i.imgur.com/MF5nhCT.png",
        "characterdeescription": "Fourth Gate Lee is an explosive combo striker who chains aerial control into devastating self-sacrificial burst. He launches enemies with Skybound Kick to unlock powerful follow-ups, then amplifies his damage permanently through Fifth Gate Opening at the cost of his own life. If pushed to the brink, he converts the health he’s lost into an unavoidable Hidden Lotus finisher capable of ending fights outright.",
        "skills": [
            {
                "id": "fourth-gate-lee-skybound-kick",
                "name": "Skybound Kick",
                "skillimage": "https://i.imgur.com/xOCgX48.png",
                "skilldescription": "Lee send an enemy flying, dealing 25 damage to them and makes them unable to reduce damage or become invulnerable for 2 turns. Lee loses 5 HP. This swaps to 'Mid-Air Taijutsu' and 'Primary Lotus' may be used on the target next turn.",
                "energy": [
                    "Taijutsu",
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Physical",
                    "Melee",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 25,
                        "scope": "target"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "fourth_gate_lee_skybound_kick_launch",
                        "duration": 2,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "cannotReduceDamage": true,
                            "cannotBecomeInvulnerable": true,
                            "tooltipText": "This character cannot reduce damage or become invulnerable."
                        }
                    },
                    {
                        "type": "HealthLoss",
                        "amount": 5,
                        "scope": "self"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "fourth_gate_lee_mid_air_window",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "skillReplacements": {
                                "fourth-gate-lee-skybound-kick": "fourth-gate-lee-mid-air-taijutsu"
                            },
                            "tooltipText": "Skybound Kick is replaced by Mid-Air Taijutsu."
                        }
                    }
                ]
            },
            {
                "id": "fourth-gate-lee-primary-lotus",
                "name": "Primary Lotus",
                "skillimage": "https://i.imgur.com/56Zsseg.png",
                "skilldescription": "Lee slams an enemy down with a great force, dealing 30 damage to them and stunning their non-mental skills for 1 turn. Lee loses 10 HP and deals 10 less damage for 1 turn. This may only be used on an enemy affected by 'Skybound Kick'.",
                "energy": [
                    "Random",
                    "Random"
                ],
                "target": "single-enemy",
                "targetCondition": {
                    "statusId": "fourth_gate_lee_skybound_kick_launch"
                },
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Physical",
                    "Melee",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 30,
                        "scope": "target"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "fourth_gate_lee_primary_lotus_stun",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "cannotUseNonMentalSkills": true,
                            "tooltipText": "This character non-mental skills are stunned."
                        }
                    },
                    {
                        "type": "HealthLoss",
                        "amount": 10,
                        "scope": "self"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "fourth_gate_lee_primary_lotus_recoil",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "DamageDebuff": 10,
                            "tooltipText": "Lee deals 10 less damage."
                        }
                    }
                ]
            },
            {
                "id": "fourth-gate-lee-fifth-gate-opening",
                "name": "Fifth Gate Opening",
                "skillimage": "https://i.imgur.com/r2ir9ql.png",
                "skilldescription": "Lee opens five of his chakra gates. Permanently, his skills deal 10 additional damage, cost 1 less random chakra, and Lee will lose 5 more health from their use. During this time, Lee has a 30% chance to Evade their non-mental skills, losing 10 health whenever he does*, Lee will also receive 75% less healing, and this skill swaps to 'Hidden Lotus'.",
                "energy": [
                    "Taijutsu"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Mental",
                    "Instant",
                    "Unique"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "fourth_gate_lee_fifth_gate_open",
                        "duration": 99,
                        "scope": "self",
                        "metadata": {
                            "damageBonusFlat": 10,
                            "randomCostReduction": 1,
                            "evadeChancePercent": 30,
                            "evadeAgainstNonMental": true,
                            "healReceivedMultiplier": 0.25,
                            "persistOnOwnerUseSkillTrigger": true,
                            "skillReplacements": {
                                "fourth-gate-lee-fifth-gate-opening": "fourth-gate-lee-hidden-lotus"
                            },
                            "onOwnerUseSkillTrigger": true,
                            "onOwnerUseSkillApplyStatusToOwner": {
                                "statusId": "fourth_gate_lee_fifth_gate_recoil",
                                "duration": 1,
                                "metadata": {
                                    "triggerOnApply": true,
                                    "turnEndTrigger": "owner_turn",
                                    "turnDurationAnchor": "owner_turn",
                                    "turnEndHealthLoss": 5,
                                    "tooltipText": "Lee loses 5 health this turn as HealthLoss."
                                }
                            },
                            "onEvadeApplyStatus": {
                                "statusId": "fourth_gate_lee_fifth_gate_evade_recoil",
                                "duration": 1,
                                "metadata": {
                                    "triggerOnApply": true,
                                    "turnEndTrigger": "source_turn",
                                    "turnDurationAnchor": "source_turn",
                                    "turnEndHealthLoss": 10,
                                    "tooltipText": "Fifth Gate strain: Lee loses 10 health after evading as HealthLoss."
                                }
                            },
                            "tooltipText": "Lee deals 10 additional damage, his skills cost 1 less random, he has 30% evade against non-mental skills, loses 5 extra health from skills, receives 75% less healing, and Fifth Gate Opening is replaced by Hidden Lotus."
                        }
                    }
                ]
            },
            {
                "id": "fourth-gate-lee-fury-of-the-gates",
                "name": "Fury of the Gates",
                "skillimage": "https://i.imgur.com/IYkY5NS.png",
                "skilldescription": "For 2 turns, Lee's health cannot drop below 1 HP and Lee will gain 1 taijutsu chakra each turn.",
                "energy": [
                    "Random"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 5,
                "classes": [
                    "Mental",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "fourth_gate_lee_fury_of_the_gates",
                        "duration": 2,
                        "scope": "self",
                        "metadata": {
                            "minimumHp": 1,
                            "triggerOnApply": true,
                            "turnEndTrigger": "owner_turn",
                            "turnDurationAnchor": "owner_turn",
                            "turnEndGainChakra": {
                                "chakraType": "taijutsu",
                                "amount": 1
                            },
                            "tooltipText": "Lee cannot drop below 1 HP and gains 1 taijutsu chakra each turn."
                        }
                    }
                ]
            },
            {
                "id": "fourth-gate-lee-mid-air-taijutsu",
                "name": "Mid-Air Taijutsu",
                "skillimage": "https://i.imgur.com/UF8AlyX.png",
                "skilldescription": "Lee deals 20 damage to the target of 'Skybound Kick' , extending it's effect an additonal turn, and becoming invulnerable to Melee skills for 1 turn. Lee loses 5 HP.",
                "energy": [
                    "Taijutsu",
                    "Random"
                ],
                "target": "single-enemy",
                "targetCondition": {
                    "statusId": "fourth_gate_lee_skybound_kick_launch"
                },
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Physical",
                    "Melee",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 20,
                        "scope": "target"
                    },
                    {
                        "type": "extend_status",
                        "targetStatusId": "fourth_gate_lee_skybound_kick_launch",
                        "amount": 1,
                        "scope": "target"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "fourth_gate_lee_mid_air_guard",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "invulnerableToSkillClasses": [
                                "Melee"
                            ],
                            "tooltipText": "Lee is invulnerable to melee skills."
                        }
                    },
                    {
                        "type": "HealthLoss",
                        "amount": 5,
                        "scope": "self"
                    }
                ]
            },
            {
                "id": "fourth-gate-lee-hidden-lotus",
                "name": "Hidden Lotus",
                "skillimage": "https://i.imgur.com/wshl0ok.png",
                "skilldescription": "Lee uses his strongest ability, expending all his chakra and dealing damage equal the amount of health Lee has lost to one enemy then losing 10 HP*. The following turn, Lee will deal damage to the target equal to his current health.",
                "energy": [
                    "Taijutsu",
                    "Taijutsu",
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 3,
                "classes": [
                    "Physical",
                    "Melee",
                    "Control"
                ],
                "effects": [
                    {
                        "type": "spend_all_chakra"
                    },
                    {
                        "type": "damage",
                        "amount": 0,
                        "scope": "target",
                        "metadata": {
                            "amountFromSourceMissingHp": true
                        }
                    },
                    {
                        "type": "HealthLoss",
                        "amount": 10,
                        "scope": "self"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "fourth_gate_lee_hidden_lotus_followup",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "turnEndDamageFromSourceCurrentHp": true,
                            "ignoreTargetDamageReduction": true,
                            "ignoreTargetDestructibleDefense": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "tooltipText": "Next turn, this character takes damage equal to Lee's current health."
                        }
                    }
                ]
            }
        ]
    },
    {
        "id": "neji-hyuuga",
        "characterId": "neji-hyuuga",
        "name": "Neji Hyuuga",
        "facePicture": "https://i.imgur.com/d7giIVA.png",
        "characterdeescription": "Neji Hyuga is a scaling damage dealer and control specialist who excels at pressuring enemies over longer fights. His abilities allow him to steadily increase his damage output while disrupting enemy defenses and chakra generation.",
        "skills": [
            {
                "id": "neji-hyuuga-eight-trigrams-sixty-four-palms",
                "name": "Eight Trigrams Sixty-Four Palms",
                "skillimage": "https://i.imgur.com/yEuoyJS.png",
                "skilldescription": "Neji deals 2 piercing damage to one enemy. This skill will double in damage every time it is cast (2/4/8/16/32). This has a 25% chance to remove 1 random chakra. After being used at max damage, this swaps to 'Eight Trigrams One Hundred Twenty-Eight Palms'.",
                "energy": [
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Physical",
                    "Melee",
                    "Instant",
                    "Unique"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 2,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageReduction": true
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 2,
                        "scope": "target",
                        "condition": {
                            "statusId": "neji_hyuuga_eight_trigrams_symbol_mark",
                            "scope": "target"
                        },
                        "metadata": {
                            "ignoreDamageReduction": true
                        }
                    },
                    {
                        "type": "remove_random_chakra",
                        "amount": 1,
                        "chance": 25,
                        "scope": "target"
                    },
                    {
                        "type": "remove_random_chakra",
                        "amount": 1,
                        "chance": 25,
                        "scope": "target",
                        "condition": {
                            "statusId": "neji_hyuuga_eight_trigrams_symbol_mark",
                            "scope": "target"
                        }
                    },
                    {
                        "type": "cleanse_statuses",
                        "scope": "self",
                        "metadataAny": [
                            "neji64PalmsProgression"
                        ],
                        "count": 0
                    },
                    {
                        "type": "apply_status",
                        "statusId": "neji_hyuuga_64p_stage_3",
                        "duration": 99,
                        "scope": "self",
                        "condition": {
                            "statusId": "neji_hyuuga_eight_trigrams_symbol_mark",
                            "scope": "target"
                        },
                        "metadata": {
                            "neji64PalmsProgression": true,
                            "skillReplacements": {
                                "neji-hyuuga-eight-trigrams-sixty-four-palms": "neji-hyuuga-eight-trigrams-sixty-four-palms-stage-3"
                            },
                            "tooltipText": "Next Eight Trigrams Sixty-Four Palms deals 8 piercing damage and has a 25% chance to remove 1 random chakra (double-hit on Eight Trigrams Symbol targets)."
                        }
                    },
                    {
                        "type": "cleanse_statuses",
                        "scope": "self",
                        "metadataAny": [
                            "neji64PalmsProgression"
                        ],
                        "count": 0,
                        "condition": {
                            "missingStatusId": "neji_hyuuga_eight_trigrams_symbol_mark",
                            "scope": "target"
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "neji_hyuuga_64p_stage_2",
                        "duration": 99,
                        "scope": "self",
                        "condition": {
                            "missingStatusId": "neji_hyuuga_eight_trigrams_symbol_mark",
                            "scope": "target"
                        },
                        "metadata": {
                            "neji64PalmsProgression": true,
                            "skillReplacements": {
                                "neji-hyuuga-eight-trigrams-sixty-four-palms": "neji-hyuuga-eight-trigrams-sixty-four-palms-stage-2"
                            },
                            "tooltipText": "Next Eight Trigrams Sixty-Four Palms deals 4 piercing damage and has a 25% chance to remove 1 random chakra."
                        }
                    }
                ]
            },
            {
                "id": "neji-hyuuga-eight-trigram-heavenly-spin",
                "name": "Eight Trigram Heavenly Spin",
                "skillimage": "https://i.imgur.com/x0Ax3cw.png",
                "skilldescription": "Neji targets himself or an ally for 1 turn. The target is granted 20 destructible defense and any enemy that uses a new harmful skill on them is dealt 15 damage. This skill is invisible.",
                "energy": [
                    "Bloodline"
                ],
                "target": "self-or-single-ally",
                "damage": 0,
                "cooldown": 2,
                "classes": [
                    "Chakra",
                    "Melee",
                    "Instant",
                    "Unique",
                    "Invisible"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "neji_hyuuga_heavenly_spin_guard",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "destructibleDefensePoints": 20,
                            "triggerOnEnemyHarmfulSkill": true,
                            "counterDamage": 15,
                            "tooltipText": "This character has 20 destructible defense and deals 15 damage to an enemy that uses a new harmful skill on them."
                        }
                    }
                ]
            },
            {
                "id": "neji-hyuuga-eight-trigrams-symbol",
                "name": "Eight Trigrams Symbol",
                "skillimage": "https://i.imgur.com/VARxv1C.png",
                "skilldescription": "For 3 turns, one enemy becomes unable to become invulnerable. 'Eight Trigrams Sixty-Four Palms' will double-cast on an affected enemy. This skill is invisible.",
                "energy": [
                    "Bloodline"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 2,
                "classes": [
                    "Mental",
                    "Ranged",
                    "Control",
                    "Unique",
                    "Invisible"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "neji_hyuuga_eight_trigrams_symbol_mark",
                        "duration": 3,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "cannotBecomeInvulnerable": true,
                            "tooltipText": "This character cannot become invulnerable and can be double-hit by Eight Trigrams Sixty-Four Palms."
                        }
                    }
                ]
            },
            {
                "id": "neji-hyuuga-byakugan-awareness",
                "name": "Byakugan Awareness",
                "skillimage": "https://i.imgur.com/KjnmmdI.png",
                "skilldescription": "Neji removes all enemy invisible skills from all characters, removes all enemy skills from himself, and gains 1 bloodline chakra.",
                "energy": [
                    "Random"
                ],
                "target": "all-enemy",
                "damage": 0,
                "cooldown": 4,
                "classes": [
                    "Mental",
                    "Unique",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "cleanse_statuses",
                        "scope": "all-units",
                        "sourceRelation": "enemy",
                        "sourceSkillClassesAny": [
                            "Invisible"
                        ],
                        "count": 0
                    },
                    {
                        "type": "cleanse_statuses",
                        "scope": "self",
                        "sourceRelation": "enemy",
                        "count": 0
                    },
                    {
                        "type": "gain_chakra",
                        "chakraType": "bloodline",
                        "amount": 1
                    }
                ]
            },
            {
                "id": "neji-hyuuga-eight-trigram-one-hundred-twenty-eight-palms",
                "name": "Eight Trigram One Hundred Twenty-Eight Palms",
                "skillimage": "https://i.imgur.com/bBIVq6h.png",
                "skilldescription": "Deals 32 piercing damage to one enemy for 2 turns. If this successfully deals damage on both turns, the target becomes unable to generate chakra for 2 turns. After this skill is used twice, it swaps to 'Eight Trigrams Sixty-Four Palms'.",
                "energy": [
                    "Genjutsu",
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Physical",
                    "Control",
                    "Melee",
                    "Unique"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 32,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageReduction": true,
                            "onSuccessfulDamageApplyStatusToTarget": {
                                "statusId": "neji_hyuuga_128_success_counter",
                                "duration": 2,
                                "metadata": {
                                    "harmful": true,
                                    "hideTooltip": true,
                                    "hits": 1,
                                    "stackMetadataKey": "hits",
                                    "stackDelta": 1,
                                    "stackMax": 2,
                                    "applyStatusAtStack": {
                                        "metadataKey": "hits",
                                        "value": 2,
                                        "statusId": "neji_hyuuga_128_chakra_lock",
                                        "duration": 2,
                                        "metadata": {
                                            "harmful": true,
                                            "noChakraGain": true,
                                            "tooltipText": "This character cannot generate chakra."
                                        }
                                    }
                                }
                            }
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "neji_hyuuga_128_followup",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "turnEndDamage": 32,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "ignoreTargetDamageReduction": true,
                            "onSuccessfulTurnEndDamageApplyStatusToSelf": {
                                "statusId": "neji_hyuuga_128_success_counter",
                                "duration": 2,
                                "metadata": {
                                    "harmful": true,
                                    "hideTooltip": true,
                                    "stackMetadataKey": "hits",
                                    "stackDelta": 1,
                                    "stackMax": 2,
                                    "applyStatusAtStack": {
                                        "metadataKey": "hits",
                                        "value": 2,
                                        "statusId": "neji_hyuuga_128_chakra_lock",
                                        "duration": 2,
                                        "metadata": {
                                            "harmful": true,
                                            "noChakraGain": true,
                                            "tooltipText": "This character cannot generate chakra."
                                        }
                                    }
                                }
                            },
                            "tooltipText": "This character will take 32 piercing damage next turn."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "neji_hyuuga_128_to_64_next",
                        "duration": 99,
                        "scope": "self",
                        "metadata": {
                            "skillReplacements": {
                                "neji-hyuuga-eight-trigram-one-hundred-twenty-eight-palms": "neji-hyuuga-eight-trigram-one-hundred-twenty-eight-palms-stage-2"
                            },
                            "hideTooltip": true
                        }
                    }
                ]
            },
            {
                "id": "neji-hyuuga-eight-trigrams-sixty-four-palms-stage-2",
                "name": "Eight Trigrams Sixty-Four Palms",
                "hiddenFromSelectionViewer": true,
                "useBaseSkillCooldown": true,
                "skillimage": "https://i.imgur.com/yEuoyJS.png",
                "skilldescription": "Neji deals 4 piercing damage to one enemy. This has a 25% chance to remove 1 random chakra.",
                "energy": [
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Physical",
                    "Melee",
                    "Instant",
                    "Unique"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 4,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageReduction": true
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 4,
                        "scope": "target",
                        "condition": {
                            "statusId": "neji_hyuuga_eight_trigrams_symbol_mark",
                            "scope": "target"
                        },
                        "metadata": {
                            "ignoreDamageReduction": true
                        }
                    },
                    {
                        "type": "remove_random_chakra",
                        "amount": 1,
                        "chance": 25,
                        "scope": "target"
                    },
                    {
                        "type": "remove_random_chakra",
                        "amount": 1,
                        "chance": 25,
                        "scope": "target",
                        "condition": {
                            "statusId": "neji_hyuuga_eight_trigrams_symbol_mark",
                            "scope": "target"
                        }
                    },
                    {
                        "type": "cleanse_statuses",
                        "scope": "self",
                        "metadataAny": [
                            "neji64PalmsProgression"
                        ],
                        "count": 0
                    },
                    {
                        "type": "apply_status",
                        "statusId": "neji_hyuuga_64p_stage_4",
                        "duration": 99,
                        "scope": "self",
                        "condition": {
                            "statusId": "neji_hyuuga_eight_trigrams_symbol_mark",
                            "scope": "target"
                        },
                        "metadata": {
                            "neji64PalmsProgression": true,
                            "skillReplacements": {
                                "neji-hyuuga-eight-trigrams-sixty-four-palms": "neji-hyuuga-eight-trigrams-sixty-four-palms-stage-4",
                                "neji-hyuuga-eight-trigrams-sixty-four-palms-stage-2": "neji-hyuuga-eight-trigrams-sixty-four-palms-stage-4"
                            },
                            "tooltipText": "Next Eight Trigrams Sixty-Four Palms deals 16 piercing damage and has a 25% chance to remove 1 random chakra."
                        }
                    },
                    {
                        "type": "cleanse_statuses",
                        "scope": "self",
                        "metadataAny": [
                            "neji64PalmsProgression"
                        ],
                        "count": 0,
                        "condition": {
                            "missingStatusId": "neji_hyuuga_eight_trigrams_symbol_mark",
                            "scope": "target"
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "neji_hyuuga_64p_stage_3",
                        "duration": 99,
                        "scope": "self",
                        "condition": {
                            "missingStatusId": "neji_hyuuga_eight_trigrams_symbol_mark",
                            "scope": "target"
                        },
                        "metadata": {
                            "neji64PalmsProgression": true,
                            "skillReplacements": {
                                "neji-hyuuga-eight-trigrams-sixty-four-palms": "neji-hyuuga-eight-trigrams-sixty-four-palms-stage-3",
                                "neji-hyuuga-eight-trigrams-sixty-four-palms-stage-2": "neji-hyuuga-eight-trigrams-sixty-four-palms-stage-3"
                            },
                            "tooltipText": "Next Eight Trigrams Sixty-Four Palms deals 8 piercing damage and has a 25% chance to remove 1 random chakra."
                        }
                    }
                ]
            },
            {
                "id": "neji-hyuuga-eight-trigrams-sixty-four-palms-stage-3",
                "name": "Eight Trigrams Sixty-Four Palms",
                "hiddenFromSelectionViewer": true,
                "useBaseSkillCooldown": true,
                "skillimage": "https://i.imgur.com/yEuoyJS.png",
                "skilldescription": "Neji deals 8 piercing damage to one enemy. This has a 25% chance to remove 1 random chakra.",
                "energy": [
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Physical",
                    "Melee",
                    "Instant",
                    "Unique"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 8,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageReduction": true
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 8,
                        "scope": "target",
                        "condition": {
                            "statusId": "neji_hyuuga_eight_trigrams_symbol_mark",
                            "scope": "target"
                        },
                        "metadata": {
                            "ignoreDamageReduction": true
                        }
                    },
                    {
                        "type": "remove_random_chakra",
                        "amount": 1,
                        "chance": 25,
                        "scope": "target"
                    },
                    {
                        "type": "remove_random_chakra",
                        "amount": 1,
                        "chance": 25,
                        "scope": "target",
                        "condition": {
                            "statusId": "neji_hyuuga_eight_trigrams_symbol_mark",
                            "scope": "target"
                        }
                    },
                    {
                        "type": "cleanse_statuses",
                        "scope": "self",
                        "metadataAny": [
                            "neji64PalmsProgression"
                        ],
                        "count": 0
                    },
                    {
                        "type": "apply_status",
                        "statusId": "neji_hyuuga_64p_stage_5",
                        "duration": 99,
                        "scope": "self",
                        "condition": {
                            "statusId": "neji_hyuuga_eight_trigrams_symbol_mark",
                            "scope": "target"
                        },
                        "metadata": {
                            "neji64PalmsProgression": true,
                            "skillReplacements": {
                                "neji-hyuuga-eight-trigrams-sixty-four-palms": "neji-hyuuga-eight-trigrams-sixty-four-palms-stage-5",
                                "neji-hyuuga-eight-trigrams-sixty-four-palms-stage-2": "neji-hyuuga-eight-trigrams-sixty-four-palms-stage-5",
                                "neji-hyuuga-eight-trigrams-sixty-four-palms-stage-3": "neji-hyuuga-eight-trigrams-sixty-four-palms-stage-5"
                            },
                            "tooltipText": "Next Eight Trigrams Sixty-Four Palms deals 32 piercing damage and has a 25% chance to remove 1 random chakra."
                        }
                    },
                    {
                        "type": "cleanse_statuses",
                        "scope": "self",
                        "metadataAny": [
                            "neji64PalmsProgression"
                        ],
                        "count": 0,
                        "condition": {
                            "missingStatusId": "neji_hyuuga_eight_trigrams_symbol_mark",
                            "scope": "target"
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "neji_hyuuga_64p_stage_4",
                        "duration": 99,
                        "scope": "self",
                        "condition": {
                            "missingStatusId": "neji_hyuuga_eight_trigrams_symbol_mark",
                            "scope": "target"
                        },
                        "metadata": {
                            "neji64PalmsProgression": true,
                            "skillReplacements": {
                                "neji-hyuuga-eight-trigrams-sixty-four-palms": "neji-hyuuga-eight-trigrams-sixty-four-palms-stage-4",
                                "neji-hyuuga-eight-trigrams-sixty-four-palms-stage-2": "neji-hyuuga-eight-trigrams-sixty-four-palms-stage-4",
                                "neji-hyuuga-eight-trigrams-sixty-four-palms-stage-3": "neji-hyuuga-eight-trigrams-sixty-four-palms-stage-4"
                            },
                            "tooltipText": "Next Eight Trigrams Sixty-Four Palms deals 16 piercing damage and has a 25% chance to remove 1 random chakra."
                        }
                    }
                ]
            },
            {
                "id": "neji-hyuuga-eight-trigrams-sixty-four-palms-stage-4",
                "name": "Eight Trigrams Sixty-Four Palms",
                "hiddenFromSelectionViewer": true,
                "useBaseSkillCooldown": true,
                "skillimage": "https://i.imgur.com/yEuoyJS.png",
                "skilldescription": "Neji deals 16 piercing damage to one enemy. This has a 25% chance to remove 1 random chakra.",
                "energy": [
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Physical",
                    "Melee",
                    "Instant",
                    "Unique"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 16,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageReduction": true
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 16,
                        "scope": "target",
                        "condition": {
                            "statusId": "neji_hyuuga_eight_trigrams_symbol_mark",
                            "scope": "target"
                        },
                        "metadata": {
                            "ignoreDamageReduction": true
                        }
                    },
                    {
                        "type": "remove_random_chakra",
                        "amount": 1,
                        "chance": 25,
                        "scope": "target"
                    },
                    {
                        "type": "remove_random_chakra",
                        "amount": 1,
                        "chance": 25,
                        "scope": "target",
                        "condition": {
                            "statusId": "neji_hyuuga_eight_trigrams_symbol_mark",
                            "scope": "target"
                        }
                    },
                    {
                        "type": "cleanse_statuses",
                        "scope": "self",
                        "metadataAny": [
                            "neji64PalmsProgression"
                        ],
                        "count": 0
                    },
                    {
                        "type": "apply_status",
                        "statusId": "neji_hyuuga_64p_to_128",
                        "duration": 99,
                        "scope": "self",
                        "condition": {
                            "statusId": "neji_hyuuga_eight_trigrams_symbol_mark",
                            "scope": "target"
                        },
                        "metadata": {
                            "neji64PalmsProgression": true,
                            "skillReplacements": {
                                "neji-hyuuga-eight-trigrams-sixty-four-palms": "neji-hyuuga-eight-trigram-one-hundred-twenty-eight-palms",
                                "neji-hyuuga-eight-trigrams-sixty-four-palms-stage-2": "neji-hyuuga-eight-trigram-one-hundred-twenty-eight-palms",
                                "neji-hyuuga-eight-trigrams-sixty-four-palms-stage-3": "neji-hyuuga-eight-trigram-one-hundred-twenty-eight-palms",
                                "neji-hyuuga-eight-trigrams-sixty-four-palms-stage-4": "neji-hyuuga-eight-trigram-one-hundred-twenty-eight-palms",
                                "neji-hyuuga-eight-trigrams-sixty-four-palms-stage-5": "neji-hyuuga-eight-trigram-one-hundred-twenty-eight-palms"
                            },
                            "tooltipText": "Eight Trigrams Sixty-Four Palms is replaced by Eight Trigram One Hundred Twenty-Eight Palms."
                        }
                    },
                    {
                        "type": "cleanse_statuses",
                        "scope": "self",
                        "metadataAny": [
                            "neji64PalmsProgression"
                        ],
                        "count": 0,
                        "condition": {
                            "missingStatusId": "neji_hyuuga_eight_trigrams_symbol_mark",
                            "scope": "target"
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "neji_hyuuga_64p_stage_5",
                        "duration": 99,
                        "scope": "self",
                        "condition": {
                            "missingStatusId": "neji_hyuuga_eight_trigrams_symbol_mark",
                            "scope": "target"
                        },
                        "metadata": {
                            "neji64PalmsProgression": true,
                            "skillReplacements": {
                                "neji-hyuuga-eight-trigrams-sixty-four-palms": "neji-hyuuga-eight-trigrams-sixty-four-palms-stage-5",
                                "neji-hyuuga-eight-trigrams-sixty-four-palms-stage-2": "neji-hyuuga-eight-trigrams-sixty-four-palms-stage-5",
                                "neji-hyuuga-eight-trigrams-sixty-four-palms-stage-3": "neji-hyuuga-eight-trigrams-sixty-four-palms-stage-5",
                                "neji-hyuuga-eight-trigrams-sixty-four-palms-stage-4": "neji-hyuuga-eight-trigrams-sixty-four-palms-stage-5"
                            },
                            "tooltipText": "Next Eight Trigrams Sixty-Four Palms deals 32 piercing damage and has a 25% chance to remove 1 random chakra."
                        }
                    }
                ]
            },
            {
                "id": "neji-hyuuga-eight-trigrams-sixty-four-palms-stage-5",
                "name": "Eight Trigrams Sixty-Four Palms",
                "hiddenFromSelectionViewer": true,
                "useBaseSkillCooldown": true,
                "skillimage": "https://i.imgur.com/yEuoyJS.png",
                "skilldescription": "Neji deals 32 piercing damage to one enemy. This has a 25% chance to remove 1 random chakra. After use, this swaps to Eight Trigram One Hundred Twenty-Eight Palms.",
                "energy": [
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Physical",
                    "Melee",
                    "Instant",
                    "Unique"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 32,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageReduction": true,
                            "onSuccessfulDamageApplyStatusToTarget": {
                                "statusId": "neji_hyuuga_128_success_counter",
                                "duration": 2,
                                "metadata": {
                                    "harmful": true,
                                    "hideTooltip": true,
                                    "hits": 1,
                                    "stackMetadataKey": "hits",
                                    "stackDelta": 1,
                                    "stackMax": 2,
                                    "applyStatusAtStack": {
                                        "metadataKey": "hits",
                                        "value": 2,
                                        "statusId": "neji_hyuuga_128_chakra_lock",
                                        "duration": 2,
                                        "metadata": {
                                            "harmful": true,
                                            "noChakraGain": true,
                                            "tooltipText": "This character cannot generate chakra."
                                        }
                                    }
                                }
                            }
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 32,
                        "scope": "target",
                        "condition": {
                            "statusId": "neji_hyuuga_eight_trigrams_symbol_mark",
                            "scope": "target"
                        },
                        "metadata": {
                            "ignoreDamageReduction": true
                        }
                    },
                    {
                        "type": "remove_random_chakra",
                        "amount": 1,
                        "chance": 25,
                        "scope": "target"
                    },
                    {
                        "type": "cleanse_statuses",
                        "scope": "self",
                        "metadataAny": [
                            "neji64PalmsProgression"
                        ],
                        "count": 0
                    },
                    {
                        "type": "apply_status",
                        "statusId": "neji_hyuuga_64p_to_128",
                        "duration": 99,
                        "scope": "self",
                        "metadata": {
                            "neji64PalmsProgression": true,
                            "skillReplacements": {
                                "neji-hyuuga-eight-trigrams-sixty-four-palms": "neji-hyuuga-eight-trigram-one-hundred-twenty-eight-palms",
                                "neji-hyuuga-eight-trigrams-sixty-four-palms-stage-2": "neji-hyuuga-eight-trigram-one-hundred-twenty-eight-palms",
                                "neji-hyuuga-eight-trigrams-sixty-four-palms-stage-3": "neji-hyuuga-eight-trigram-one-hundred-twenty-eight-palms",
                                "neji-hyuuga-eight-trigrams-sixty-four-palms-stage-4": "neji-hyuuga-eight-trigram-one-hundred-twenty-eight-palms",
                                "neji-hyuuga-eight-trigrams-sixty-four-palms-stage-5": "neji-hyuuga-eight-trigram-one-hundred-twenty-eight-palms"
                            },
                            "tooltipText": "Eight Trigrams Sixty-Four Palms is replaced by Eight Trigram One Hundred Twenty-Eight Palms."
                        }
                    }
                ]
            },
            {
                "id": "neji-hyuuga-eight-trigram-one-hundred-twenty-eight-palms-stage-2",
                "name": "Eight Trigram One Hundred Twenty-Eight Palms",
                "hiddenFromSelectionViewer": true,
                "useBaseSkillCooldown": true,
                "skillimage": "https://i.imgur.com/bBIVq6h.png",
                "skilldescription": "Deals 32 piercing damage to one enemy for 2 turns. If this successfully deals damage on both turns, the target becomes unable to generate chakra for 2 turns. After this skill is used twice, it swaps to 'Eight Trigrams Sixty-Four Palms'.",
                "energy": [
                    "Genjutsu",
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Physical",
                    "Control",
                    "Melee",
                    "Unique"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 32,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageReduction": true
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "neji_hyuuga_128_followup",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "turnEndDamage": 32,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "ignoreTargetDamageReduction": true,
                            "onSuccessfulTurnEndDamageApplyStatusToSelf": {
                                "statusId": "neji_hyuuga_128_success_counter",
                                "duration": 2,
                                "metadata": {
                                    "harmful": true,
                                    "hideTooltip": true,
                                    "stackMetadataKey": "hits",
                                    "stackDelta": 1,
                                    "stackMax": 2,
                                    "applyStatusAtStack": {
                                        "metadataKey": "hits",
                                        "value": 2,
                                        "statusId": "neji_hyuuga_128_chakra_lock",
                                        "duration": 2,
                                        "metadata": {
                                            "harmful": true,
                                            "noChakraGain": true,
                                            "tooltipText": "This character cannot generate chakra."
                                        }
                                    }
                                }
                            },
                            "tooltipText": "This character will take 32 piercing damage next turn."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "neji_hyuuga_128_reset_to_64",
                        "duration": 99,
                        "scope": "self",
                        "metadata": {
                            "skillReplacements": {
                                "neji-hyuuga-eight-trigram-one-hundred-twenty-eight-palms": "neji-hyuuga-eight-trigrams-sixty-four-palms",
                                "neji-hyuuga-eight-trigram-one-hundred-twenty-eight-palms-stage-2": "neji-hyuuga-eight-trigrams-sixty-four-palms"
                            },
                            "hideTooltip": true
                        }
                    }
                ]
            }
        ]
    },
    {
        "id": "tenten",
        "characterId": "tenten",
        "name": "Tenten",
        "facePicture": "https://i.imgur.com/b9LpKL2.png",
        "characterdeescription": "Tenten functions as a scaling ranged damage dealer who builds Weapon stacks over time and converts them into explosive burst damage. She excels in prolonged fights where she can continuously pressure multiple enemies and capitalize on accumulated stacks.",
        "skills": [
            {
                "id": "tenten-tenten-toss",
                "name": "Tenten Toss",
                "skillimage": "https://i.imgur.com/rJdrABR.png",
                "skilldescription": "Throws 1 random 'Ninja Weapons' at each enemy. Each enemy hit gains 1 Weapon stack (for 'Rigged Weapons').",
                "energy": [
                    "Random"
                ],
                "target": "all-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Physical",
                    "Ranged",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "cleanse_statuses",
                        "scope": "all-enemy",
                        "metadataAny": [
                            "tentenWeaponLastType",
                            "tentenWeaponChoiceLock"
                        ],
                        "count": 0
                    },
                    {
                        "type": "apply_status",
                        "statusId": "tenten_weapon_stacks",
                        "duration": 99,
                        "scope": "all-enemy",
                        "metadata": {
                            "harmful": true,
                            "tentenWeaponStacks": true,
                            "stackMetadataKey": "stacks",
                            "stackDelta": 1,
                            "stackMax": 20,
                            "tooltipTextTemplate": "This character has {stacks} Ninja Weapon stack(s)."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "tenten_weapon_last_shuriken",
                        "duration": 99,
                        "scope": "all-enemy",
                        "chance": 30,
                        "rollPerRecipient": true,
                        "condition": {
                            "missingStatusId": "tenten_weapon_choice_lock",
                            "scope": "target"
                        },
                        "metadata": {
                            "harmful": true,
                            "tentenWeaponLastType": true,
                            "tooltipText": "Last weapon used: Shuriken."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "tenten_weapon_choice_lock",
                        "duration": 1,
                        "scope": "all-enemy",
                        "condition": {
                            "statusId": "tenten_weapon_last_shuriken",
                            "scope": "target"
                        },
                        "metadata": {
                            "tentenWeaponChoiceLock": true,
                            "hideTooltip": true
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 4,
                        "scope": "all-enemy",
                        "condition": {
                            "statusId": "tenten_weapon_last_shuriken",
                            "scope": "target"
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 4,
                        "scope": "all-enemy",
                        "chance": 75,
                        "rollPerRecipient": true,
                        "condition": {
                            "statusId": "tenten_weapon_last_shuriken",
                            "scope": "target"
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 4,
                        "scope": "all-enemy",
                        "chance": 25,
                        "rollPerRecipient": true,
                        "condition": {
                            "statusId": "tenten_weapon_last_shuriken",
                            "scope": "target"
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "tenten_weapon_last_kunai",
                        "duration": 99,
                        "scope": "all-enemy",
                        "chance": 35.7142857143,
                        "rollPerRecipient": true,
                        "condition": {
                            "missingStatusId": "tenten_weapon_choice_lock",
                            "scope": "target"
                        },
                        "metadata": {
                            "harmful": true,
                            "tentenWeaponLastType": true,
                            "tooltipText": "Last weapon used: Kunai."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "tenten_weapon_choice_lock",
                        "duration": 1,
                        "scope": "all-enemy",
                        "condition": {
                            "statusId": "tenten_weapon_last_kunai",
                            "scope": "target"
                        },
                        "metadata": {
                            "tentenWeaponChoiceLock": true,
                            "hideTooltip": true
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 5,
                        "scope": "all-enemy",
                        "condition": {
                            "statusId": "tenten_weapon_last_kunai",
                            "scope": "target"
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 5,
                        "scope": "all-enemy",
                        "chance": 50,
                        "rollPerRecipient": true,
                        "condition": {
                            "statusId": "tenten_weapon_last_kunai",
                            "scope": "target"
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "tenten_weapon_last_sword",
                        "duration": 99,
                        "scope": "all-enemy",
                        "chance": 33.3333333333,
                        "rollPerRecipient": true,
                        "condition": {
                            "missingStatusId": "tenten_weapon_choice_lock",
                            "scope": "target"
                        },
                        "metadata": {
                            "harmful": true,
                            "tentenWeaponLastType": true,
                            "tooltipText": "Last weapon used: Sword."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "tenten_weapon_choice_lock",
                        "duration": 1,
                        "scope": "all-enemy",
                        "condition": {
                            "statusId": "tenten_weapon_last_sword",
                            "scope": "target"
                        },
                        "metadata": {
                            "tentenWeaponChoiceLock": true,
                            "hideTooltip": true
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 7,
                        "scope": "all-enemy",
                        "condition": {
                            "statusId": "tenten_weapon_last_sword",
                            "scope": "target"
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 10,
                        "scope": "all-enemy",
                        "chance": 40,
                        "rollPerRecipient": true,
                        "condition": {
                            "statusId": "tenten_weapon_last_sword",
                            "scope": "target"
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "tenten_weapon_last_hooked_sword",
                        "duration": 99,
                        "scope": "all-enemy",
                        "chance": 50,
                        "rollPerRecipient": true,
                        "condition": {
                            "missingStatusId": "tenten_weapon_choice_lock",
                            "scope": "target"
                        },
                        "metadata": {
                            "harmful": true,
                            "tentenWeaponLastType": true,
                            "tooltipText": "Last weapon used: Hooked Sword."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "tenten_weapon_choice_lock",
                        "duration": 1,
                        "scope": "all-enemy",
                        "condition": {
                            "statusId": "tenten_weapon_last_hooked_sword",
                            "scope": "target"
                        },
                        "metadata": {
                            "tentenWeaponChoiceLock": true,
                            "hideTooltip": true
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 6,
                        "scope": "all-enemy",
                        "condition": {
                            "statusId": "tenten_weapon_last_hooked_sword",
                            "scope": "target"
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "tenten_weapon_bleed",
                        "duration": 5,
                        "scope": "all-enemy",
                        "condition": {
                            "statusId": "tenten_weapon_last_hooked_sword",
                            "scope": "target"
                        },
                        "metadata": {
                            "harmful": true,
                            "afflictionDamage": true,
                            "turnEndDamage": 2,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "tooltipText": "This character takes 2 affliction damage each turn."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "tenten_weapon_last_scythe",
                        "duration": 99,
                        "scope": "all-enemy",
                        "chance": 66.6666666667,
                        "rollPerRecipient": true,
                        "condition": {
                            "missingStatusId": "tenten_weapon_choice_lock",
                            "scope": "target"
                        },
                        "metadata": {
                            "harmful": true,
                            "tentenWeaponLastType": true,
                            "tooltipText": "Last weapon used: Scythe."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "tenten_weapon_choice_lock",
                        "duration": 1,
                        "scope": "all-enemy",
                        "condition": {
                            "statusId": "tenten_weapon_last_scythe",
                            "scope": "target"
                        },
                        "metadata": {
                            "tentenWeaponChoiceLock": true,
                            "hideTooltip": true
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 13,
                        "scope": "all-enemy",
                        "condition": {
                            "statusId": "tenten_weapon_last_scythe",
                            "scope": "target"
                        },
                        "metadata": {
                            "ignoreDamageReduction": true
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 10,
                        "scope": "all-enemy",
                        "chance": 40,
                        "rollPerRecipient": true,
                        "condition": {
                            "statusId": "tenten_weapon_last_scythe",
                            "scope": "target"
                        },
                        "metadata": {
                            "ignoreDamageReduction": true
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "tenten_weapon_last_mace",
                        "duration": 99,
                        "scope": "all-enemy",
                        "condition": {
                            "missingStatusId": "tenten_weapon_choice_lock",
                            "scope": "target"
                        },
                        "metadata": {
                            "harmful": true,
                            "tentenWeaponLastType": true,
                            "tooltipText": "Last weapon used: Mace."
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 18,
                        "scope": "all-enemy",
                        "condition": {
                            "statusId": "tenten_weapon_last_mace",
                            "scope": "target"
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "tenten_weapon_mace_stun",
                        "duration": 1,
                        "scope": "all-enemy",
                        "chance": 50,
                        "rollPerRecipient": true,
                        "condition": {
                            "statusId": "tenten_weapon_last_mace",
                            "scope": "target"
                        },
                        "metadata": {
                            "harmful": true,
                            "cannotUseNonMentalSkills": true,
                            "tooltipText": "This character non-mental skills are stunned."
                        }
                    },
                    {
                        "type": "cleanse_statuses",
                        "scope": "all-enemy",
                        "metadataAny": [
                            "tentenWeaponChoiceLock"
                        ],
                        "count": 0
                    }
                ]
            },
            {
                "id": "tenten-rigged-weapons",
                "name": "Rigged Weapons",
                "skillimage": "https://i.imgur.com/3bgTaua.png",
                "skilldescription": "Target: All enemies with 'Ninja Weapons' stacks. Tenten repeats the Ninja Weapon thrown at each enemy once per stack, consuming all stacks. Each repeated hit deals the damage and applies the effects of the Ninja Weapon used in the previous turn.",
                "energy": [
                    "Random",
                    "Random"
                ],
                "target": "all-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Physical",
                    "Ranged",
                    "Action"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 0,
                        "scope": "all-enemy",
                        "condition": {
                            "statusId": "tenten_weapon_last_shuriken",
                            "scope": "target",
                            "statusMetadataAtLeast": {
                                "statusId": "tenten_weapon_stacks",
                                "metadataKey": "stacks",
                                "value": 1
                            }
                        },
                        "metadata": {
                            "bonusPerStatusMetadata": {
                                "statusId": "tenten_weapon_stacks",
                                "metadataKey": "stacks",
                                "multiplier": 4
                            }
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 0,
                        "scope": "all-enemy",
                        "chance": 75,
                        "rollPerRecipient": true,
                        "condition": {
                            "statusId": "tenten_weapon_last_shuriken",
                            "scope": "target",
                            "statusMetadataAtLeast": {
                                "statusId": "tenten_weapon_stacks",
                                "metadataKey": "stacks",
                                "value": 1
                            }
                        },
                        "metadata": {
                            "bonusPerStatusMetadata": {
                                "statusId": "tenten_weapon_stacks",
                                "metadataKey": "stacks",
                                "multiplier": 4
                            }
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 0,
                        "scope": "all-enemy",
                        "chance": 25,
                        "rollPerRecipient": true,
                        "condition": {
                            "statusId": "tenten_weapon_last_shuriken",
                            "scope": "target",
                            "statusMetadataAtLeast": {
                                "statusId": "tenten_weapon_stacks",
                                "metadataKey": "stacks",
                                "value": 1
                            }
                        },
                        "metadata": {
                            "bonusPerStatusMetadata": {
                                "statusId": "tenten_weapon_stacks",
                                "metadataKey": "stacks",
                                "multiplier": 4
                            }
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 0,
                        "scope": "all-enemy",
                        "condition": {
                            "statusId": "tenten_weapon_last_kunai",
                            "scope": "target",
                            "statusMetadataAtLeast": {
                                "statusId": "tenten_weapon_stacks",
                                "metadataKey": "stacks",
                                "value": 1
                            }
                        },
                        "metadata": {
                            "bonusPerStatusMetadata": {
                                "statusId": "tenten_weapon_stacks",
                                "metadataKey": "stacks",
                                "multiplier": 5
                            }
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 0,
                        "scope": "all-enemy",
                        "chance": 50,
                        "rollPerRecipient": true,
                        "condition": {
                            "statusId": "tenten_weapon_last_kunai",
                            "scope": "target",
                            "statusMetadataAtLeast": {
                                "statusId": "tenten_weapon_stacks",
                                "metadataKey": "stacks",
                                "value": 1
                            }
                        },
                        "metadata": {
                            "bonusPerStatusMetadata": {
                                "statusId": "tenten_weapon_stacks",
                                "metadataKey": "stacks",
                                "multiplier": 5
                            }
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 0,
                        "scope": "all-enemy",
                        "condition": {
                            "statusId": "tenten_weapon_last_sword",
                            "scope": "target",
                            "statusMetadataAtLeast": {
                                "statusId": "tenten_weapon_stacks",
                                "metadataKey": "stacks",
                                "value": 1
                            }
                        },
                        "metadata": {
                            "bonusPerStatusMetadata": {
                                "statusId": "tenten_weapon_stacks",
                                "metadataKey": "stacks",
                                "multiplier": 7
                            }
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 0,
                        "scope": "all-enemy",
                        "chance": 40,
                        "rollPerRecipient": true,
                        "condition": {
                            "statusId": "tenten_weapon_last_sword",
                            "scope": "target",
                            "statusMetadataAtLeast": {
                                "statusId": "tenten_weapon_stacks",
                                "metadataKey": "stacks",
                                "value": 1
                            }
                        },
                        "metadata": {
                            "bonusPerStatusMetadata": {
                                "statusId": "tenten_weapon_stacks",
                                "metadataKey": "stacks",
                                "multiplier": 10
                            }
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 0,
                        "scope": "all-enemy",
                        "condition": {
                            "statusId": "tenten_weapon_last_hooked_sword",
                            "scope": "target",
                            "statusMetadataAtLeast": {
                                "statusId": "tenten_weapon_stacks",
                                "metadataKey": "stacks",
                                "value": 1
                            }
                        },
                        "metadata": {
                            "bonusPerStatusMetadata": {
                                "statusId": "tenten_weapon_stacks",
                                "metadataKey": "stacks",
                                "multiplier": 6
                            }
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "tenten_weapon_bleed",
                        "duration": 5,
                        "scope": "all-enemy",
                        "condition": {
                            "statusId": "tenten_weapon_last_hooked_sword",
                            "scope": "target",
                            "statusMetadataAtLeast": {
                                "statusId": "tenten_weapon_stacks",
                                "metadataKey": "stacks",
                                "value": 1
                            }
                        },
                        "metadata": {
                            "harmful": true,
                            "afflictionDamage": true,
                            "turnEndDamage": 2,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "tooltipText": "This character takes 2 affliction damage each turn."
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 0,
                        "scope": "all-enemy",
                        "condition": {
                            "statusId": "tenten_weapon_last_scythe",
                            "scope": "target",
                            "statusMetadataAtLeast": {
                                "statusId": "tenten_weapon_stacks",
                                "metadataKey": "stacks",
                                "value": 1
                            }
                        },
                        "metadata": {
                            "ignoreDamageReduction": true,
                            "bonusPerStatusMetadata": {
                                "statusId": "tenten_weapon_stacks",
                                "metadataKey": "stacks",
                                "multiplier": 13
                            }
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 0,
                        "scope": "all-enemy",
                        "chance": 40,
                        "rollPerRecipient": true,
                        "condition": {
                            "statusId": "tenten_weapon_last_scythe",
                            "scope": "target",
                            "statusMetadataAtLeast": {
                                "statusId": "tenten_weapon_stacks",
                                "metadataKey": "stacks",
                                "value": 1
                            }
                        },
                        "metadata": {
                            "ignoreDamageReduction": true,
                            "bonusPerStatusMetadata": {
                                "statusId": "tenten_weapon_stacks",
                                "metadataKey": "stacks",
                                "multiplier": 10
                            }
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 0,
                        "scope": "all-enemy",
                        "condition": {
                            "statusId": "tenten_weapon_last_mace",
                            "scope": "target",
                            "statusMetadataAtLeast": {
                                "statusId": "tenten_weapon_stacks",
                                "metadataKey": "stacks",
                                "value": 1
                            }
                        },
                        "metadata": {
                            "bonusPerStatusMetadata": {
                                "statusId": "tenten_weapon_stacks",
                                "metadataKey": "stacks",
                                "multiplier": 18
                            }
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "tenten_weapon_mace_stun",
                        "duration": 1,
                        "scope": "all-enemy",
                        "chance": 50,
                        "rollPerRecipient": true,
                        "condition": {
                            "statusId": "tenten_weapon_last_mace",
                            "scope": "target",
                            "statusMetadataAtLeast": {
                                "statusId": "tenten_weapon_stacks",
                                "metadataKey": "stacks",
                                "value": 1
                            }
                        },
                        "metadata": {
                            "harmful": true,
                            "cannotUseNonMentalSkills": true,
                            "tooltipText": "This character non-mental skills are stunned."
                        }
                    },
                    {
                        "type": "cleanse_statuses",
                        "scope": "all-enemy",
                        "metadataAny": [
                            "tentenWeaponStacks",
                            "tentenWeaponLastType"
                        ],
                        "count": 0,
                        "condition": {
                            "statusMetadataAtLeast": {
                                "statusId": "tenten_weapon_stacks",
                                "metadataKey": "stacks",
                                "value": 1
                            },
                            "scope": "target"
                        }
                    }
                ]
            },
            {
                "id": "tenten-twin-rising-dragons",
                "name": "Twin Rising Dragons",
                "skillimage": "https://i.imgur.com/mlelii2.png",
                "skilldescription": "Target: All enemies. Tenten automatically casts 'Tenten Toss' on all enemies each turn for 2 turns, applying Weapon stacks and Ninja Weapon effects each turn. Special Effect: Tenten gains 1 turn of invulnerability at the start of the skill.",
                "energy": [
                    "Ninjutsu",
                    "Random"
                ],
                "target": "all-enemy",
                "damage": 0,
                "cooldown": 3,
                "classes": [
                    "Physical",
                    "Ranged",
                    "Action"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "tenten_twin_rising_dragons_invulnerability",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "invulnerable": true,
                            "tooltipText": "Tenten is invulnerable."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "tenten_twin_rising_dragons_active",
                        "duration": 2,
                        "scope": "self",
                        "metadata": {
                            "turnDurationAnchor": "source_turn",
                            "autoCastSkillId": "tenten-tenten-toss",
                            "autoCastTarget": "all-enemy",
                            "autoCastOnApply": true,
                            "tooltipText": "Tenten will cast Tenten Toss on all enemies next turn."
                        }
                    }
                ]
            },
            {
                "id": "tenten-weapon-scroll-summoning",
                "name": "Weapon Scroll Summoning",
                "skillimage": "https://i.imgur.com/r5nA6Ol.png",
                "skilldescription": "Tenten grants an ally 5 additional non-affliction damage and 5 points of damage reduction for the rest of the game (stacks).",
                "energy": [
                    "Random"
                ],
                "target": "single-ally",
                "damage": 0,
                "cooldown": 4,
                "classes": [
                    "Chakra",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "tenten_weapon_scroll_summoning_buff",
                        "duration": 99,
                        "scope": "target",
                        "metadata": {
                            "stackMetadataKey": "stacks",
                            "stackDelta": 1,
                            "stackMax": 20,
                            "nonAfflictionDamageBonusFlat": 5,
                            "damageReductionFlat": 5,
                            "mergeNumericAddKeys": [
                                "nonAfflictionDamageBonusFlat",
                                "damageReductionFlat"
                            ],
                            "tooltipTextTemplate": "This character deal {nonAfflictionDamageBonusFlat} additional non-affliction damage and has {damageReductionFlat} damage reduction."
                        }
                    }
                ]
            },
            {
                "id": "tenten-ninja-weapons",
                "name": "Ninja Weapons",
                "skillimage": "https://i.imgur.com/vmWLfr7.png",
                "skilldescription": "Weapon Types: - (30% chance) Shuriken: 4 damage, 75% chance to throw a second Shuriken, 25% chance to throw a third shuriken- (25% chance) Kunai: 5 damage, 50% chance to throw a second Kunai - (15% chance) Sword: 7 damage, 40% chance to crit for 10 bonus damage- (15% chance) Hooked Sword: 6 damage + 2 affliction damage per turn for 5 turns - (10% chance) Scythe: 13 piercing damage, 40% chance to crit for 10 additional damage- (5% chance) Mace: 18 damage, 50% chance to stun non-mental skills for 1 turn.",
                "energy": [],
                "target": "",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Physical",
                    "Instant"
                ]
            }
        ]
    },
    {
        "id": "gaara-of-the-desert",
        "characterId": "gaara-of-the-desert",
        "name": "Gaara of the Desert",
        "facePicture": "https://i.imgur.com/67r49Zy.png",
        "characterdeescription": "Gaara dominates the battlefield with overwhelming defensive power and crushing sand techniques. His sand armor and autonomous defense make him extremely difficult to defeat, allowing him to absorb pressure while disrupting enemies with control effects and chakra disruption. By trapping opponents with Sand Coffin, Gaara can set up a devastating Sand Burial capable of eliminating even heavily protected targets.",
        "skills": [
            {
                "id": "gaara-of-the-desert-sand-assault",
                "name": "Sand Assault",
                "skillimage": "https://i.imgur.com/VeZUqFC.png",
                "skilldescription": "Gaara deals 15 damage to one enemy. This skill deals 15 additional damage if 'Sand Armor' is active.",
                "energy": [
                    "Bloodline"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Physical",
                    "Ranged",
                    "Control",
                    "Unique"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 15,
                        "scope": "target"
                    },
                    {
                        "type": "damage",
                        "amount": 0,
                        "scope": "target",
                        "condition": {
                            "statusId": "gaara_of_the_desert_sand_armor",
                            "scope": "self",
                            "conditionalAmount": 15
                        }
                    }
                ]
            },
            {
                "id": "gaara-of-the-desert-sand-coffin",
                "name": "Sand Coffin",
                "skillimage": "https://i.imgur.com/bWUkVPw.png",
                "skilldescription": "Gaara surrounds one enemy with a pile of sand, stunning their non-mental skills for 1 turn. This swaps to 'Sand Burial' next turn. This skill will fully stun the enemy if 'Sand Armor' is active.",
                "energy": [
                    "Ninjutsu"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 2,
                "classes": [
                    "Physical",
                    "Ranged",
                    "Control",
                    "Unique"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "gaara_of_the_desert_sand_coffin_non_mental_stun",
                        "duration": 1,
                        "scope": "target",
                        "condition": {
                            "missingStatusId": "gaara_of_the_desert_sand_armor",
                            "scope": "self"
                        },
                        "metadata": {
                            "harmful": true,
                            "cannotUseNonMentalSkills": true,
                            "tooltipText": "This character non-mental skills are stunned."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "gaara_of_the_desert_sand_coffin_full_stun",
                        "duration": 1,
                        "scope": "target",
                        "condition": {
                            "statusId": "gaara_of_the_desert_sand_armor",
                            "scope": "self"
                        },
                        "metadata": {
                            "harmful": true,
                            "cannotUseSkills": true,
                            "tooltipText": "This character is stunned."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "gaara_of_the_desert_sand_coffin_swap",
                        "duration": 2,
                        "scope": "self",
                        "metadata": {
                            "turnDurationAnchor": "source_turn",
                            "skillReplacements": {
                                "gaara-of-the-desert-sand-coffin": "gaara-of-the-desert-sand-burial"
                            },
                            "tooltipText": "Sand Coffin is replaced by Sand Burial."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "gaara_of_the_desert_sand_coffin_mark",
                        "duration": 2,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "hideTooltip": true
                        }
                    }
                ]
            },
            {
                "id": "gaara-of-the-desert-sand-armor",
                "name": "Sand Armor",
                "skillimage": "https://i.imgur.com/pVNYopc.png",
                "skilldescription": "Gaara gains 50 points of permanent destructible defense. When 30 destructible defense is destroyed: After 2 turns, if this skill's destructible defense is still active, it will renew itself back to 50 destructible defense. (Only triggers once per skill use). This skill is permanent until the destructible defense is destroyed and does not stack.",
                "energy": [
                    "Random"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 5,
                "classes": [
                    "Chakra",
                    "Ranged",
                    "Instant",
                    "Unique"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "gaara_of_the_desert_sand_armor",
                        "duration": 99,
                        "scope": "self",
                        "applyPolicy": "if_missing_at_cast_start",
                        "metadata": {
                            "destructibleDefensePoints": 50,
                            "destructibleDefenseRestore": {
                                "thresholdDamageTaken": 30,
                                "triggerAtOrBelowPoints": 30,
                                "restoreTo": 50,
                                "delayOwnerTurns": 2,
                                "pendingTooltipTextTemplate": "After {restoreTurnsLeft} turns, if this skill's destructible defense is still active, it will renew itself back to 50 destructible defense. Current defense: {destructibleDefensePoints}."
                            },
                            "tooltipTextTemplate": "This character has {destructibleDefensePoints} destructible defense."
                        }
                    }
                ]
            },
            {
                "id": "gaara-of-the-desert-autonomous-sand-defense",
                "name": "Autonomous Sand Defense",
                "skillimage": "https://i.imgur.com/hWcM4In.png",
                "skilldescription": "This skill makes Gaara invulnerable for 1 turn.",
                "energy": [
                    "Random"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 4,
                "classes": [
                    "Physical",
                    "Instant",
                    "Unique"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "gaara_of_the_desert_autonomous_sand_defense",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "invulnerable": true,
                            "tooltipText": "This character is invulnerable."
                        }
                    }
                ]
            },
            {
                "id": "gaara-of-the-desert-sand-burial",
                "name": "Sand Burial",
                "skillimage": "https://i.imgur.com/ByZQsEb.png",
                "skilldescription": "Target the enemy affected by Sand Coffin last turn. After 1 turn, Gaara will instantly kill this enemy. This skill cannot be evaded.",
                "energy": [
                    "Bloodline",
                    "Bloodline"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Physical",
                    "Ranged",
                    "Action",
                    "Unique"
                ],
                "actorCondition": {
                    "statusId": "gaara_of_the_desert_sand_coffin_swap"
                },
                "targetCondition": {
                    "statusId": "gaara_of_the_desert_sand_coffin_mark"
                },
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "gaara_of_the_desert_sand_burial_mark",
                        "duration": 1,
                        "scope": "target",
                        "condition": {
                            "statusId": "gaara_of_the_desert_sand_coffin_mark",
                            "scope": "target",
                            "consumeOnMatch": true
                        },
                        "metadata": {
                            "harmful": true,
                            "cannotBeEvaded": true,
                            "turnEndSetHpTo": 0,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "tooltipText": "This character will be killed next turn."
                        }
                    }
                ]
            }
        ]
    },
    {
        "id": "temari",
        "characterId": "temari",
        "name": "Temari",
        "facePicture": "https://i.imgur.com/fuIdIm6.png",
        "characterdeescription": "Temari dominates the battlefield through relentless wind pressure and precise control. Excelling from the backline, she weakens enemy formations over time while enabling her allies to strike harder from range. Her wind techniques stack continuous damage across the enemy team, forcing opponents into unfavorable engagements or slow defeat.",
        "skills": [
            {
                "id": "temari-cutting-whirlwind",
                "name": "Cutting Whirlwind",
                "skillimage": "https://i.imgur.com/YEiS2mm.png",
                "skilldescription": "Temari creates a razor sharp wind, dealing 10 piercing damage to one enemy and 5 piercing to all other enemies for 3 turns. This skill stacks.",
                "energy": [
                    "Genjutsu"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Physical",
                    "Ranged",
                    "Action"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "temari_cutting_whirlwind_primary",
                        "duration": 3,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "triggerOnApply": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "turnEndDamage": 10,
                            "ignoreTargetDamageReduction": true,
                            "ignoreTargetDestructibleDefense": true,
                            "mergeNumericAddKeys": [
                                "turnEndDamage"
                            ],
                            "tooltipText": "This character takes 10 piercing damage."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "temari_cutting_whirlwind_secondary",
                        "duration": 3,
                        "scope": "other-enemies",
                        "metadata": {
                            "harmful": true,
                            "triggerOnApply": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "turnEndDamage": 5,
                            "ignoreTargetDamageReduction": true,
                            "ignoreTargetDestructibleDefense": true,
                            "mergeNumericAddKeys": [
                                "turnEndDamage"
                            ],
                            "tooltipText": "This character takes 5 piercing damage."
                        }
                    }
                ]
            },
            {
                "id": "temari-slashing-cyclone",
                "name": "Slashing Cyclone",
                "skillimage": "https://i.imgur.com/OBJd1AV.png",
                "skilldescription": "One enemy has their non-mental skills stunned, becomes invulnerable to helpful skills, and takes 10 piercing damage each turn for 2 turns. Temari's other newly active skills deal 5 additional damage to the affected enemy.",
                "energy": [
                    "Genjutsu",
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 3,
                "classes": [
                    "Physical",
                    "Ranged",
                    "Control"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "temari_slashing_cyclone",
                        "duration": 2,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "cannotUseNonMentalSkills": true,
                            "invulnerableToHelpfulSkills": true,
                            "triggerOnApply": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "turnEndDamage": 10,
                            "ignoreTargetDamageReduction": true,
                            "bonusDamageFromSourceCharacterId": "temari",
                            "bonusDamageFromSourceSkillsFlat": 5,
                            "bonusDamageAppliesToSkillIds": [
                                "temari-cutting-whirlwind",
                                "temari-summoning-quick-beheading-dance",
                                "temari-wind-gust-barricade"
                            ],
                            "tooltipText": "This character non-mental skills are stunned, is invulnerable to helpful skills, takes 10 piercing damage and recieves 5 additional damage from newly active Temari skills."
                        }
                    }
                ]
            },
            {
                "id": "temari-summoning-quick-beheading-dance",
                "name": "Summoning Quick Beheading Dance",
                "skillimage": "https://i.imgur.com/AsbfOOH.png",
                "skilldescription": "Temari summons the wind weasel Kamatari in the battlefield, increasing all ranged damage her team deals by 5 and dealing 20 piercing damage that ignores invulnerability to a random enemy each turn for 3 turns.",
                "energy": [
                    "Ninjutsu",
                    "Genjutsu",
                    "Random"
                ],
                "target": "all-enemy",
                "damage": 0,
                "cooldown": 3,
                "classes": [
                    "Physical",
                    "Ranged",
                    "Instant",
                    "Unique"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "temari_quick_beheading_dance_team_buff",
                        "duration": 3,
                        "scope": "all-allies",
                        "metadata": {
                            "damageBonusBySkillClass": {
                                "ranged": 5
                            },
                            "tooltipText": "This character deals 5 additional damage with Ranged skills."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "temari_quick_beheading_dance_summon",
                        "duration": 3,
                        "scope": "self",
                        "metadata": {
                            "triggerOnApply": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "turnEndRandomEnemyDamage": 20,
                            "turnEndRandomEnemySkillClasses": [
                                "physical",
                                "ranged"
                            ],
                            "turnEndRandomEnemyIgnoreDamageReduction": true,
                            "turnEndRandomEnemyIgnoreDestructibleDefense": true,
                            "tooltipText": "At the end of Temari's turn, a random enemy takes 20 piercing damage that ignores invulnerability."
                        }
                    }
                ]
            },
            {
                "id": "temari-wind-gust-barricade",
                "name": "Wind Gust Barricade",
                "skillimage": "https://i.imgur.com/dhANE0M.png",
                "skilldescription": "Temari and her allies become invulnerable to enemy Ranged skills for 1 turn. One enemy is dealt 10 piercing damage.",
                "energy": [
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 4,
                "classes": [
                    "Physical",
                    "Ranged",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "temari_wind_gust_barricade_guard",
                        "duration": 1,
                        "scope": "all-allies",
                        "metadata": {
                            "invulnerableToSkillClasses": [
                                "ranged"
                            ],
                            "tooltipText": "This character is invulnerable to enemy Ranged skills."
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 10,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true
                        }
                    }
                ]
            }
        ]
    },
    {
        "id": "kankuro",
        "characterId": "kankuro",
        "name": "Kankuro",
        "facePicture": "https://i.imgur.com/7ddXchn.png",
        "characterdeescription": "Kankuro is a tactical control fighter who pressures enemies through traps, poison, and puppet manipulation. By deploying Crow, he can steadily weaken opponents with stacking poison and sustained damage, making him effective in longer battles. Alternatively, Black Ant allows Kankuro to capture a target and set up a devastating execution with Iron Maiden.",
        "skills": [
            {
                "id": "kankuro-puppet-mastery-crow",
                "name": "Puppet Mastery: Crow",
                "skillimage": "https://i.imgur.com/ttuEAPF.png",
                "skilldescription": "Kankuro uses his puppeteering expertise to control Crow, granting him 10 points of destructible defense and swapping this skill to 'Hidden Poisoned Blade' for 1 turn.",
                "energy": [
                    "none"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Physical",
                    "Instant",
                    "Unique"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "kankuro_puppet_mastery_crow",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "turnDurationAnchor": "source_turn",
                            "destructibleDefensePoints": 10,
                            "skillReplacements": {
                                "kankuro-puppet-mastery-crow": "kankuro-hidden-poisoned-blade"
                            },
                            "tooltipTextTemplate": "Kankuro has {destructibleDefensePoints} destructible defense and Puppet Mastery: Crow is replaced by Hidden Poisoned Blade."
                        }
                    }
                ]
            },
            {
                "id": "kankuro-puppet-mastery-black-ant",
                "name": "Puppet Mastery: Black Ant",
                "skillimage": "https://i.imgur.com/XCkdacb.png",
                "skilldescription": "Kankuro brings his newest puppet the Black Ant into position on the battlefield, granting him 15 points of destructible defense and swapping this skill to 'Black Ant Capture' for 1 turn.",
                "energy": [
                    "Random"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Physical",
                    "Instant",
                    "Unique"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "kankuro_puppet_mastery_black_ant",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "turnDurationAnchor": "source_turn",
                            "destructibleDefensePoints": 15,
                            "skillReplacements": {
                                "kankuro-puppet-mastery-black-ant": "kankuro-black-ant-capture"
                            },
                            "tooltipTextTemplate": "Kankuro has {destructibleDefensePoints} destructible defense and Puppet Mastery: Black Ant is replaced by Black Ant Capture."
                        }
                    }
                ]
            },
            {
                "id": "kankuro-poison-bomb",
                "name": "Poison Bomb",
                "skillimage": "https://i.imgur.com/vJFqLIY.png",
                "skilldescription": "One of Kankuro's puppets creates a cloud of smoke, dealing 9 affliction damage to all enemies for 3 turns. Requires 'Puppet Mastery: Crow' or 'Puppet Mastery: Black Ant' to be active.",
                "energy": [
                    "Random",
                    "Random"
                ],
                "target": "all-enemy",
                "damage": 0,
                "cooldown": 3,
                "actorCondition": {
                    "statusIdsAny": [
                        "kankuro_puppet_mastery_crow",
                        "kankuro_puppet_mastery_black_ant"
                    ]
                },
                "classes": [
                    "Physical",
                    "Ranged",
                    "Instant",
                    "Affliction"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "kankuro_poison_bomb",
                        "duration": 3,
                        "scope": "all-enemy",
                        "metadata": {
                            "harmful": true,
                            "turnEndDamage": 9,
                            "afflictionDamage": true,
                            "tooltipText": "This character takes 9 affliction damage each turn."
                        }
                    }
                ]
            },
            {
                "id": "kankuro-puppet-replacement-technique",
                "name": "Puppet Replacement Technique",
                "skillimage": "https://i.imgur.com/QSFFxQi.png",
                "skilldescription": "Kankuro removes all enemy skills from himself and sets his health back to what it was last turn. 'Puppet Mastery: Crow'/'Puppet Mastery: Black Ant' have their effect refreshed if they are active.",
                "energy": [
                    "Random",
                    "Random"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 5,
                "classes": [
                    "Chakra",
                    "Instant",
                    "Unique"
                ],
                "effects": [
                    {
                        "type": "cleanse_statuses",
                        "scope": "self",
                        "sourceRelation": "enemy",
                        "count": 0
                    },
                    {
                        "type": "set_hp_from_snapshot",
                        "scope": "self",
                        "snapshotKey": "ownerTurnEndHp"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "kankuro_puppet_mastery_crow",
                        "duration": 1,
                        "scope": "self",
                        "condition": {
                            "statusId": "kankuro_puppet_mastery_crow",
                            "scope": "self"
                        },
                        "metadata": {
                            "turnDurationAnchor": "source_turn",
                            "destructibleDefensePoints": 10,
                            "skillReplacements": {
                                "kankuro-puppet-mastery-crow": "kankuro-hidden-poisoned-blade"
                            },
                            "tooltipTextTemplate": "Kankuro has {destructibleDefensePoints} destructible defense and Puppet Mastery: Crow is replaced by Hidden Poisoned Blade."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "kankuro_puppet_mastery_black_ant",
                        "duration": 1,
                        "scope": "self",
                        "condition": {
                            "statusId": "kankuro_puppet_mastery_black_ant",
                            "scope": "self"
                        },
                        "metadata": {
                            "turnDurationAnchor": "source_turn",
                            "destructibleDefensePoints": 15,
                            "skillReplacements": {
                                "kankuro-puppet-mastery-black-ant": "kankuro-black-ant-capture"
                            },
                            "tooltipTextTemplate": "Kankuro has {destructibleDefensePoints} destructible defense and Puppet Mastery: Black Ant is replaced by Black Ant Capture."
                        }
                    }
                ]
            },
            {
                "id": "kankuro-hidden-poisoned-blade",
                "name": "Hidden Poisoned Blade",
                "skillimage": "https://i.imgur.com/vhy3qI1.png",
                "skilldescription": "Deals 15 piercing damage to one enemy and 3 affliction damage permanently (stacks). 'Puppet Mastery: Crow' has it's effect refreshed.",
                "energy": [
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "actorCondition": {
                    "statusId": "kankuro_puppet_mastery_crow"
                },
                "classes": [
                    "Physical",
                    "Ranged",
                    "Instant",
                    "Affliction*",
                    "Unique"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 15,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "kankuro_hidden_poisoned_blade_poison",
                        "duration": 99,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "infiniteDuration": true,
                            "mergeNumericAddKeys": [
                                "turnEndDamage",
                                "poisonStacks"
                            ],
                            "turnEndDamage": 3,
                            "poisonStacks": 1,
                            "afflictionDamage": true,
                            "tooltipTextTemplate": "This character takes {turnEndDamage} affliction damage each turn from Kankuro poison."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "kankuro_puppet_mastery_crow",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "turnDurationAnchor": "source_turn",
                            "destructibleDefensePoints": 10,
                            "skillReplacements": {
                                "kankuro-puppet-mastery-crow": "kankuro-hidden-poisoned-blade"
                            },
                            "tooltipTextTemplate": "Kankuro has {destructibleDefensePoints} destructible defense and Puppet Mastery: Crow is replaced by Hidden Poisoned Blade."
                        }
                    }
                ]
            },
            {
                "id": "kankuro-black-ant-capture",
                "name": "Black Ant Capture",
                "skillimage": "https://i.imgur.com/pF10cCb.png",
                "skilldescription": "Kankuro stuns one enemy's non-mental skills and makes them invulnerable to all skills for 2 turns. 'Puppet Mastery: Black Ant' has it's effect refreshed. This swaps 'Poison Bomb' to 'Black Secret Technique: Iron Maiden' while active.",
                "energy": [
                    "Random",
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 4,
                "actorCondition": {
                    "statusId": "kankuro_puppet_mastery_black_ant"
                },
                "classes": [
                    "Physical",
                    "Control",
                    "Ranged",
                    "Unique"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "kankuro_black_ant_capture",
                        "duration": 2,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "cannotUseNonMentalSkills": true,
                            "invulnerable": true,
                            "uniqueEnemyMarkFromSource": true,
                            "ignoreInvulnerabilityFromSourceCharacterId": "kankuro",
                            "tooltipText": "This character is stunned, captured by Black Ant, and is invulnerable to all skills."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "kankuro_puppet_mastery_black_ant",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "turnDurationAnchor": "source_turn",
                            "destructibleDefensePoints": 15,
                            "skillReplacements": {
                                "kankuro-puppet-mastery-black-ant": "kankuro-black-ant-capture"
                            },
                            "tooltipTextTemplate": "Kankuro has {destructibleDefensePoints} destructible defense and Puppet Mastery: Black Ant is replaced by Black Ant Capture."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "kankuro_iron_maiden_swap",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "turnDurationAnchor": "source_turn",
                            "skillReplacements": {
                                "kankuro-poison-bomb": "kankuro-black-secret-technique-iron-maiden"
                            },
                            "tooltipText": "Poison Bomb is replaced by Black Secret Technique: Iron Maiden."
                        }
                    }
                ]
            },
            {
                "id": "kankuro-black-secret-technique-iron-maiden",
                "name": "Black Secret Technique: Iron Maiden",
                "skillimage": "https://i.imgur.com/sZq6ZMW.png",
                "skilldescription": "Kankuro targets the enemy affected by 'Black Ant Capture', dealing 50 piercing damage. This skill ignores invulnerability.",
                "energy": [
                    "Random",
                    "Random",
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "actorCondition": {
                    "statusId": "kankuro_iron_maiden_swap"
                },
                "targetCondition": {
                    "statusId": "kankuro_black_ant_capture"
                },
                "ignoreInvulnerability": true,
                "classes": [
                    "Physical",
                    "Ranged",
                    "Instant",
                    "Unique"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 50,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true
                        }
                    }
                ]
            }
        ]
    },
    {
        "id": "tsuchi-kin",
        "characterId": "tsuchi-kin",
        "name": "Tsuchi Kin",
        "facePicture": "https://i.imgur.com/C0l9iG3.png",
        "characterdeescription": "Tsuchi Kin is a kunoichi of the Hidden Sound who weaponizes resonance and deception through the ringing of her bells. She excels at destabilizing opponents, unraveling their rhythm before striking with precision. Every bell she casts is a trap layered within another, turning confidence into hesitation and timing into ruin.",
        "skills": [
            {
                "id": "tsuchi-kin-illusion-bell-needles",
                "name": "Illusion Bell Needles",
                "skillimage": "https://i.imgur.com/Th7ihHd.png",
                "skilldescription": "One enemy takes 25 damage. If used after 'Needle and Bell Trap', the target has all their skills silenced for 1 turn. If used after 'Unnerving Bells', the target has all their skills delayed for 1 turn. If used after 'Sound Hallucinations', the target has all their skills Blinded for 1 turn.",
                "energy": [
                    "Genjutsu"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Mental",
                    "Ranged",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 25
                    },
                    {
                        "type": "apply_status",
                        "statusId": "tsuchi_kin_illusion_bell_silence",
                        "duration": 1,
                        "scope": "target",
                        "condition": {
                            "scope": "self",
                            "statusId": "tsuchi_kin_illusion_bell_trigger_needle_and_bell_trap"
                        },
                        "metadata": {
                            "harmful": true,
                            "silenceNonDamageEffects": true,
                            "tooltipText": "Silenced: only damage from this character's skills will work."
                        }
                    },
                    {
                        "type": "modify_cooldowns",
                        "amount": 1,
                        "includeAllCharacterSkills": true,
                        "scope": "target",
                        "condition": {
                            "scope": "self",
                            "statusId": "tsuchi_kin_illusion_bell_trigger_unnerving_bells"
                        },
                        "metadata": {
                            "harmful": true,
                            "tooltipText": "This character's skill cooldowns were delayed by 1 turn."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "tsuchi_kin_illusion_bell_blind",
                        "duration": 1,
                        "scope": "target",
                        "condition": {
                            "scope": "self",
                            "statusId": "tsuchi_kin_illusion_bell_trigger_sound_hallucinations"
                        },
                        "metadata": {
                            "harmful": true,
                            "fullBlind": true,
                            "tooltipText": "This character's skills are blinded and may hit random targets."
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 5,
                        "condition": {
                            "scope": "self",
                            "statusId": "tsuchi_kin_illusion_bell_trigger_needle_and_bell_trap",
                            "consumeOnMatch": true
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 5,
                        "condition": {
                            "scope": "self",
                            "statusId": "tsuchi_kin_illusion_bell_trigger_unnerving_bells",
                            "consumeOnMatch": true
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 5,
                        "condition": {
                            "scope": "self",
                            "statusId": "tsuchi_kin_illusion_bell_trigger_sound_hallucinations",
                            "consumeOnMatch": true
                        }
                    }
                ]
            },
            {
                "id": "tsuchi-kin-needle-and-bell-trap",
                "name": "Needle and Bell Trap",
                "skillimage": "https://i.imgur.com/K9UXPqY.png",
                "skilldescription": "One enemy cannot reduce damage or become invulnerable for 2 turns and has their skills stunned for 1 turn. 'Illusion Bell Needles' deals 5 damage next turn.",
                "energy": [
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 2,
                "classes": [
                    "Physical",
                    "Ranged",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "tsuchi_kin_needle_and_bell_trap_debuff",
                        "duration": 2,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "cannotReduceDamage": true,
                            "cannotBecomeInvulnerable": true,
                            "tooltipText": "This character cannot reduce damage or become invulnerable."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "tsuchi_kin_needle_and_bell_trap_stun",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "cannotUseSkills": true,
                            "tooltipText": "This character is stunned."
                        }
                    },
                    {
                        "type": "cleanse_statuses",
                        "scope": "self",
                        "metadataAny": [
                            "tsuchiKinIllusionBellPrep"
                        ]
                    },
                    {
                        "type": "apply_status",
                        "statusId": "tsuchi_kin_illusion_bell_trigger_needle_and_bell_trap",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "tsuchiKinIllusionBellPrep": true,
                            "tooltipText": "Illusion Bell Needles is empowered by Needle and Bell Trap."
                        }
                    }
                ]
            },
            {
                "id": "tsuchi-kin-unnerving-bells",
                "name": "Unnerving Bells",
                "skillimage": "https://i.imgur.com/GBQ17xZ.png",
                "skilldescription": "One enemy loses 1 random chakra and has their cooldowns paralyzed for 2 turns. 'Illusion Bell Needles' deals 5 additional damage next turn.",
                "energy": [
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 2,
                "classes": [
                    "Mental",
                    "Ranged",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "remove_random_chakra",
                        "amount": 1,
                        "scope": "target"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "tsuchi_kin_unnerving_bells_cooldown_paralyze",
                        "duration": 2,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "freezeCooldowns": true,
                            "tooltipText": "This character's cooldowns are paralyzed."
                        }
                    },
                    {
                        "type": "cleanse_statuses",
                        "scope": "self",
                        "metadataAny": [
                            "tsuchiKinIllusionBellPrep"
                        ]
                    },
                    {
                        "type": "apply_status",
                        "statusId": "tsuchi_kin_illusion_bell_trigger_unnerving_bells",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "tsuchiKinIllusionBellPrep": true,
                            "tooltipText": "Illusion Bell Needles is empowered by Unnerving Bells."
                        }
                    }
                ]
            },
            {
                "id": "tsuchi-kin-sound-hallucinations",
                "name": "Sound Hallucinations",
                "skillimage": "https://i.imgur.com/dOZNxe8.png",
                "skilldescription": "Kin gains 50% Evasion for 1 turn and increases the cooldowns of one enemy by 2 for 2 turns. 'Illusion Bell Needles' deals 5 additional damage next turn.",
                "energy": [
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 2,
                "classes": [
                    "Mental",
                    "Ranged",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "tsuchi_kin_sound_hallucinations_evasion",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "evadeChancePercent": 50,
                            "tooltipText": "This character has 50% evade chance."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "tsuchi_kin_sound_hallucinations_cooldown_increase",
                        "duration": 2,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "usedSkillCooldownPenalty": 2,
                            "tooltipText": "For 2 turns, the skills this character uses has its cooldown increased by 2 turns."
                        }
                    },
                    {
                        "type": "cleanse_statuses",
                        "scope": "self",
                        "metadataAny": [
                            "tsuchiKinIllusionBellPrep"
                        ]
                    },
                    {
                        "type": "apply_status",
                        "statusId": "tsuchi_kin_illusion_bell_trigger_sound_hallucinations",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "tsuchiKinIllusionBellPrep": true,
                            "tooltipText": "Illusion Bell Needles is empowered by Sound Hallucinations."
                        }
                    }
                ]
            }
        ]
    },
    {
        "id": "zaku-abumi",
        "characterId": "zaku-abumi",
        "name": "Zaku Abumi",
        "facePicture": "https://i.imgur.com/Gncmcer.png",
        "characterdeescription": "Zaku Abumi is a Sound Village shinobi whose surgically modified arms unleash devastating supersonic air blasts. He specializes in disrupting opponents by targeting and suppressing specific skill classes, forcing enemies into predictable and weakened states. Rather than relying on brute force alone, Zaku manipulates battlefield tempo through calculated interference..",
        "skills": [
            {
                "id": "zaku-abumi-air-cutter",
                "name": "Air Cutter",
                "skillimage": "https://i.imgur.com/rx3wYD7.png",
                "skilldescription": "Using his surgically altered arms Zaku fires a blast of supersonic air at one enemy dealing 20 piercing damage. Choose Physical, Chakra, or Mental. The target will have that class stunned for 1 turn. A random Secondary enemy takes 10  damage and is affected by the same class stun choice for 1 turn.",
                "energy": [
                    "Bloodline"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Physical",
                    "Ranged",
                    "Instant"
                ],
                "classChoiceOptions": [
                    "physical",
                    "chakra",
                    "mental"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 20,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageReduction": true
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "zaku_abumi_air_cutter_class_lock",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "useChosenSkillClassForCannotUseSkillClasses": true,
                            "tooltipText": "This characters {selectedSkillClassLabel} skills are stunned"
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 10,
                        "scope": "random-other-enemy",
                        "metadata": {
                            "randomScopeGroupKey": "zaku_abumi_air_cutter_secondary_target"
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "zaku_abumi_air_cutter_class_lock",
                        "duration": 1,
                        "scope": "random-other-enemy",
                        "metadata": {
                            "harmful": true,
                            "randomScopeGroupKey": "zaku_abumi_air_cutter_secondary_target",
                            "useChosenSkillClassForCannotUseSkillClasses": true,
                            "tooltipText": "This characters {selectedSkillClassLabel} skills are stunned."
                        }
                    }
                ]
            },
            {
                "id": "zaku-abumi-wall-of-air",
                "name": "Wall of Air",
                "skillimage": "https://i.imgur.com/5B2fWY0.png",
                "skilldescription": "Choose Physical, Chakra, or Mental. One enemy deals 15 less damage with that class and takes 15 damage if they use a skill of the same class for 1 turn.",
                "energy": [
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Physical",
                    "Ranged",
                    "Instant",
                    "Unique"
                ],
                "classChoiceOptions": [
                    "physical",
                    "chakra",
                    "mental"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "zaku_abumi_wall_of_air",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "useChosenSkillClassForDamageDebuffBySkillClass": true,
                            "chosenSkillClassDamageDebuffAmount": 15,
                            "onOwnerUseSkillSelfDamage": 15,
                            "useChosenSkillClassForOnOwnerUseSkillClassesAny": true,
                            "tooltipText": "This character deals 15 less damage with {selectedSkillClassLabel} skills and takes 15 damage when using a skill with {selectedSkillClassLabel} class."
                        }
                    }
                ]
            },
            {
                "id": "zaku-abumi-extreme-air-cutter",
                "name": "Extreme Air Cutter",
                "skillimage": "https://i.imgur.com/ARkw2BG.png",
                "skilldescription": "Zaku boosts his air waves to a frightening level and deals 40 piercing damage to one enemy and 15 damage to the other enemies. Choose Physical, Chakra, or Mental. All enemies will have the selected class stunned for 1 turn.",
                "energy": [
                    "Bloodline",
                    "Bloodline"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 2,
                "classes": [
                    "Physical",
                    "Ranged",
                    "Instant",
                    "Unique"
                ],
                "classChoiceOptions": [
                    "physical",
                    "chakra",
                    "mental"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 40,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageReduction": true
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 15,
                        "scope": "other-enemies"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "zaku_abumi_extreme_air_cutter_class_lock",
                        "duration": 1,
                        "scope": "all-enemy",
                        "metadata": {
                            "harmful": true,
                            "useChosenSkillClassForCannotUseSkillClasses": true,
                            "tooltipText": "This characters {selectedSkillClassLabel} skills are stunned"
                        }
                    }
                ]
            },
            {
                "id": "zaku-abumi-air-deflection",
                "name": "Air Deflection",
                "skillimage": "https://i.imgur.com/PfLncBX.png",
                "skilldescription": "Choose Physical, Chakra, or Mental. Zaku removes 1 harmful skill from that class from him and his allies.",
                "energy": [
                    "Random"
                ],
                "target": "self-or-single-ally",
                "damage": 0,
                "cooldown": 2,
                "classes": [
                    "Chakra",
                    "Instant"
                ],
                "classChoiceOptions": [
                    "physical",
                    "chakra",
                    "mental"
                ],
                "effects": [
                    {
                        "type": "cleanse_statuses",
                        "scope": "all-allies",
                        "count": 1,
                        "harmfulOnly": true,
                        "sourceRelation": "enemy",
                        "useChosenSkillClassForSourceSkillClassesAny": true
                    }
                ]
            }
        ]
    },
    {
        "id": "dosu-kinuta",
        "characterId": "dosu-kinuta",
        "name": "Dosu Kinuta",
        "facePicture": "https://i.imgur.com/zDqgb9F.png",
        "characterdeescription": "Unlike reckless fighters, Dosu methodically tunes his opponents into collapse. By destabilizing their ability to defend or mitigate damage, he transforms every follow-up attack into a lethal crescendo. His vibrations linger, stacking pressure over time, while his drill techniques shatter both body and mind in a single, perfectly timed burst. When played patiently, Dosu becomes an executioner—silencing resistance, denying protection, and ending fights in a calculated final note.",
        "skills": [
            {
                "id": "dosu-kinuta-melody-arm-tuning",
                "name": "Melody Arm Tuning",
                "skillimage": "https://i.imgur.com/rYQyV72.png",
                "skilldescription": "Dosu fine-tunes his Melody Arm to produce debilitating sound vibrations on an enemy and deals 5 damage to them then improves his next skill on them for 2 turns. If this skill is improved, this will also make them unable to reduce damage or become invulnerable for 3 turns.",
                "energy": [
                    "none"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Physical",
                    "Melee",
                    "Instant",
                    "Unique"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "dosu_kinuta_melody_arm_lock",
                        "duration": 3,
                        "scope": "target",
                        "condition": {
                            "statusId": "dosu_kinuta_melody_arm_tuning_mark",
                            "scope": "target",
                            "consumeOnMatch": true
                        },
                        "metadata": {
                            "harmful": true,
                            "cannotReduceDamage": true,
                            "cannotBecomeInvulnerable": true,
                            "tooltipText": "This character cannot reduce damage or become invulnerable."
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 5,
                        "scope": "target"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "dosu_kinuta_melody_arm_tuning_mark",
                        "duration": 2,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "turnDurationAnchor": "source_turn",
                            "tooltipText": "Dosu's next skill on this target is improved."
                        }
                    }
                ]
            },
            {
                "id": "dosu-kinuta-vibrating-sound-drill",
                "name": "Vibrating Sound Drill",
                "skillimage": "https://i.imgur.com/xQGbfG6.png",
                "skilldescription": "Dosu attacks with his drill, dealing 20 normal and 20 affliction damage to one enemy. If improved, the target has all their skills Silenced for 1 turn.",
                "energy": [
                    "Taijutsu",
                    "Genjutsu"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Physical",
                    "Melee",
                    "Instant",
                    "Affliction",
                    "Unique"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 20,
                        "scope": "target"
                    },
                    {
                        "type": "damage",
                        "amount": 20,
                        "scope": "target",
                        "metadata": {
                            "afflictionDamage": true,
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "dosu_kinuta_vibrating_sound_drill_silence",
                        "duration": 1,
                        "scope": "target",
                        "condition": {
                            "statusId": "dosu_kinuta_melody_arm_tuning_mark",
                            "scope": "target",
                            "consumeOnMatch": true
                        },
                        "metadata": {
                            "harmful": true,
                            "silenceNonDamageEffects": true,
                            "tooltipText": "Silenced: only damage from this character's skills will work."
                        }
                    }
                ]
            },
            {
                "id": "dosu-kinuta-sound-manipulation",
                "name": "Sound Manipulation",
                "skillimage": "https://i.imgur.com/mHvsWFC.png",
                "skilldescription": "Kinuta Dosu deals 15 damage to one enemy for 3 turns (stacks). If improved, their physical and mental damage is also lowered by 15 for 3 turns and this becomes piercing damage (stacks).",
                "energy": [
                    "Genjutsu",
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 2,
                "classes": [
                    "Mental",
                    "Melee",
                    "Instant",
                    "Unique"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "dosu_kinuta_sound_manipulation",
                        "duration": 3,
                        "scope": "target",
                        "condition": {
                            "missingStatusId": "dosu_kinuta_melody_arm_tuning_mark",
                            "scope": "target"
                        },
                        "metadata": {
                            "harmful": true,
                            "triggerOnApply": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "ongoingClass": "action",
                            "turnEndDamage": 15,
                            "mergeNumericAddKeys": [
                                "turnEndDamage"
                            ],
                            "tooltipText": "This character takes 15 damage each turn."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "dosu_kinuta_sound_manipulation_improved",
                        "duration": 3,
                        "scope": "target",
                        "condition": {
                            "statusId": "dosu_kinuta_melody_arm_tuning_mark",
                            "scope": "target",
                            "consumeOnMatch": true
                        },
                        "metadata": {
                            "harmful": true,
                            "triggerOnApply": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "ongoingClass": "action",
                            "turnEndDamage": 15,
                            "ignoreTargetDamageReduction": true,
                            "damageDebuffBySkillClass": {
                                "physical": 15,
                                "mental": 15
                            },
                            "mergeNumericAddKeys": [
                                "turnEndDamage"
                            ],
                            "mergeObjectNumericAddKeys": [
                                "damageDebuffBySkillClass"
                            ],
                            "tooltipText": "This character takes 15 piercing damage each turn and deals 15 less physical and mental damage."
                        }
                    }
                ]
            },
            {
                "id": "dosu-kinuta-dosu-replacement-technique",
                "name": "Dosu Replacement Technique",
                "skillimage": "https://i.imgur.com/24Wm7L4.png",
                "skilldescription": "Dosu becomes invulnerable to enemy physical and mental skills and his next used skill will have its cooldown reduced by 1.",
                "energy": [
                    "Random"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 4,
                "classes": [
                    "Mental",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "dosu_kinuta_replacement_invulnerability",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "invulnerableToSkillClasses": [
                                "physical",
                                "mental"
                            ],
                            "tooltipText": "Dosu is invulnerable to enemy physical and mental skills."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "dosu_kinuta_replacement_cooldown",
                        "duration": 99,
                        "scope": "self",
                        "metadata": {
                            "nextUsedSkillCooldownAdjustment": -1,
                            "consumeOnNextSkillUse": true,
                            "tooltipText": "Dosu's next used skill has its cooldown reduced by 1."
                        }
                    }
                ]
            }
        ]
    },
    {
        "id": "KonohamaruSarutobi",
        "characterId": "KonohamaruSarutobi",
        "name": "Konohamaru Sarutobi",
        "facePicture": "https://i.imgur.com/fRE42ie.png",
        "characterdeescription": "Konohamaru Sarutobi is a tactical support fighter who controls the flow of battle through disruption and setup rather than raw damage. He excels at taunting enemies, protecting allies, and generating chakra through smart skill sequencing, making him a tempo-focused utility character built around control and synergy.",
        "skills": [
            {
                "id": "UnsteadyShuriken",
                "name": "Unsteady Shuriken",
                "skillimage": "https://i.imgur.com/oHkRzpf.png",
                "skilldescription": "Deals 20 damage to one enemy. The next use of this skill deals +5 bonus damage and removes the bonus effect (active until used). If the target is affected by 'Not-So-Sexy Jutsu', the taunt duration is extended by 1 turn.",
                "energy": [
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Physical",
                    "Ranged",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 20,
                        "scope": "target"
                    },
                    {
                        "type": "damage",
                        "amount": 5,
                        "scope": "target",
                        "condition": {
                            "statusId": "konohamaru_unsteady_shuriken_bonus",
                            "scope": "self",
                            "consumeOnMatch": true
                        },
                        "metadata": {
                            "ignoreSourceNonAfflictionDamageBonus": true
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "konohamaru_unsteady_shuriken_bonus",
                        "duration": 99,
                        "scope": "self",
                        "applyPolicy": "if_missing_at_cast_start",
                        "metadata": {
                            "tooltipText": "Unsteady Shuriken will deal 25 damage on next use."
                        }
                    },
                    {
                        "type": "extend_status",
                        "scope": "target",
                        "targetStatusId": "konohamaru_not_so_sexy_taunt",
                        "amount": 1
                    },
                    {
                        "type": "apply_status",
                        "statusId": "konohamaru_last_skill_used",
                        "duration": 99,
                        "scope": "self",
                        "metadata": {
                            "lastSkillId": "UnsteadyShuriken",
                            "tooltipText": "Konohamaru's Last Skill Used: Unsteady Shuriken"
                        }
                    }
                ]
            },
            {
                "id": "Not-So-SexyJutsu",
                "name": "Not-So-Sexy Jutsu",
                "skillimage": "https://i.imgur.com/cCNGzMj.png",
                "skilldescription": "Konohamaru heals 15 HP and Ignores enemy stuns for 1 turn. Applies 'Taunt' to one enemy for 1 turn.",
                "energy": [
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Chakra",
                    "Melee",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "heal",
                        "amount": 15,
                        "scope": "self"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "konohamaru_ignore_stuns",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "cannotBeStunned": true,
                            "tooltipText": "Konohamaru ignores stuns."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "konohamaru_not_so_sexy_taunt",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "taunt": true,
                            "turnDurationAnchor": "source_turn",
                            "tooltipText": "This character is taunted and can only target Konohamaru."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "konohamaru_last_skill_used",
                        "duration": 99,
                        "scope": "self",
                        "metadata": {
                            "lastSkillId": "Not-So-SexyJutsu",
                            "tooltipText": "Konohamaru's Last Skill Used: Not-So-Sexy Jutsu"
                        }
                    }
                ]
            },
            {
                "id": "HideandSeek",
                "name": "Hide and Seek",
                "skillimage": "https://i.imgur.com/fEGHc3E.png",
                "skilldescription": "Target one ally. They become invulnerable to enemy non-affliction skills for 1 turn. The next turn, 'Not-So-Sexy Jutsu' targets all allies and all enemies.",
                "energy": [
                    "Random"
                ],
                "target": "single-ally",
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Mental",
                    "Instant",
                    "Unique"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "konohamaru_hide_seek_guard",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "invulnerableToNonAffliction": true,
                            "tooltipText": "This character is invulnerable to non-affliction enemy skills."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "konohamaru_hide_seek_empower",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "skillReplacements": {
                                "Not-So-SexyJutsu": "Not-So-SexyJutsuAll"
                            },
                            "tooltipText": "Not-So-Sexy Jutsu targets all enemies this turn."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "konohamaru_last_skill_used",
                        "duration": 99,
                        "scope": "self",
                        "metadata": {
                            "lastSkillId": "HideandSeek",
                            "tooltipText": "Konohamaru's Last Skill Used: Hide and Seek"
                        }
                    }
                ]
            },
            {
                "id": "ChakraBuilding",
                "name": "Chakra Building",
                "skillimage": "https://i.imgur.com/5VG0cE3.png",
                "skilldescription": "Gain 1 chakra based on the last skill used: If 'Unsteady Shuriken': Gain 1 Taijutsu. If 'Not-So-Sexy Jutsu': Gain 1 Ninjutsu. If 'Hide and Seek': Gain 1 Genjutsu.",
                "energy": [
                    "None"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 3,
                "classes": [],
                "effects": [
                    {
                        "type": "gain_chakra_by_last_skill",
                        "statusId": "konohamaru_last_skill_used",
                        "amount": 1,
                        "map": {
                            "UnsteadyShuriken": "taijutsu",
                            "Not-So-SexyJutsu": "ninjutsu",
                            "HideandSeek": "genjutsu"
                        }
                    }
                ]
            },
            {
                "id": "Not-So-SexyJutsuAll",
                "name": "Not-So-Sexy Jutsu",
                "skillimage": "https://i.imgur.com/cCNGzMj.png",
                "skilldescription": "Konohamaru heals 15 HP and Ignores enemy stuns for 1 turn. Applies 'Taunt' to all enemies for 1 turn.",
                "hiddenFromSelectionViewer": true,
                "useBaseSkillCooldown": true,
                "energy": [
                    "Random"
                ],
                "target": "all-enemy",
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Chakra",
                    "Melee",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "heal",
                        "amount": 15,
                        "scope": "all-allies"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "konohamaru_ignore_stuns",
                        "duration": 1,
                        "scope": "all-allies",
                        "metadata": {
                            "cannotBeStunned": true,
                            "tooltipText": "This character ignores stuns."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "konohamaru_not_so_sexy_taunt",
                        "duration": 1,
                        "scope": "all-enemy",
                        "metadata": {
                            "harmful": true,
                            "taunt": true,
                            "turnDurationAnchor": "source_turn",
                            "tooltipText": "This character is taunted and can only target Konohamaru."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "konohamaru_last_skill_used",
                        "duration": 99,
                        "scope": "self",
                        "metadata": {
                            "lastSkillId": "Not-So-SexyJutsu",
                            "tooltipText": "Konohamaru's Last Skill Used: Not-So-Sexy Jutsu"
                        }
                    }
                ]
            }
        ]
    },
    {
        "id": "young-gaara",
        "characterId": "young-gaara",
        "name": "Young Gaara",
        "facePicture": "https://i.imgur.com/oBENb9n.png",
        "characterdeescription": "Young Gaara is a control-focused pressure fighter who weakens enemies through Sand Pressure stacks, disrupts their resources, and converts setup into precise execution damage. When Shukaku is unleashed, he shifts into a dominant battlefield presence, applying sustained pressure and area damage to overwhelm teams through tempo, attrition, and relentless momentum.",
        "skills": [
            {
                "id": "young-gaara-amateur-desert-graveyard",
                "name": "Amateur Desert Graveyard",
                "skillimage": "https://i.imgur.com/t7E2DrU.png",
                "skilldescription": "Gaara crushes one enemy with compressed sand, dealing 22 piercing damage. Consumes all Sand Pressure stacks on the target to deal +6 damage per stack. If at least 2 stacks are consumed, the target's non-mental skills are stunned for 1 turn.",
                "energy": [
                    "Bloodline"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Physical",
                    "Ranged",
                    "Instant",
                    "Unique"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "young_gaara_non_mental_stun",
                        "duration": 1,
                        "scope": "target",
                        "condition": {
                            "scope": "target",
                            "statusMetadataAtLeast": {
                                "statusId": "young_gaara_sand_pressure",
                                "metadataKey": "sandPressureStacks",
                                "value": 2
                            }
                        },
                        "metadata": {
                            "harmful": true,
                            "cannotUseNonMentalSkills": true,
                            "tooltipText": "This character non-mental skills are stunned."
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 22,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true,
                            "bonusPerStatusMetadata": {
                                "statusId": "young_gaara_sand_pressure",
                                "metadataKey": "sandPressureStacks",
                                "multiplier": 6,
                                "consumeStatus": true
                            }
                        }
                    }
                ]
            },
            {
                "id": "young-gaara-amateur-desert-coffin",
                "name": "Amateur Desert Coffin",
                "skillimage": "https://i.imgur.com/uY202CN.png",
                "skilldescription": "Gaara binds one enemy with sand, dealing 10 piercing damage, increasing their non-mental skills by 1 random chakra for 1 turn, and applying 1 Sand Pressure stack.",
                "energy": [
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Physical",
                    "Ranged",
                    "Instant",
                    "Unique"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 10,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageReduction": true
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "young_gaara_non_mental_cost_up",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "nonMentalRandomCostIncrease": 1,
                            "tooltipText": "This character non-mental skills cost 1 additional random chakra."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "young_gaara_sand_pressure",
                        "duration": 3,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "refreshSameStatusOnEnemyTeam": true,
                            "sandPressureStacks": 1,
                            "stackMetadataKey": "sandPressureStacks",
                            "stackDelta": 1,
                            "stackMax": 3,
                            "tooltipTextTemplate": "This character has {stacks} Sand Pressure stack(s)."
                        }
                    }
                ]
            },
            {
                "id": "young-gaara-shukaku-unleashed",
                "name": "Shukaku Unleashed",
                "skillimage": "https://i.imgur.com/PriWN4R.png",
                "skilldescription": "Gaara releases Shukaku, gaining 55 destructible defense and transforming his skill set for 4 turns. All harmful effects on Gaara are removed. If the destructible defense is destroyed, the transformation ends early.",
                "energy": [
                    "Bloodline",
                    "Random"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 6,
                "classes": [
                    "Chakra",
                    "Ranged",
                    "Instant",
                    "Unique"
                ],
                "effects": [
                    {
                        "type": "cleanse_harmful",
                        "count": 99,
                        "scope": "self"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "young_gaara_shukaku_form",
                        "duration": 4,
                        "scope": "self",
                        "metadata": {
                            "facePictureOverride": "https://i.imgur.com/kxPTPh9.png",
                            "skillReplacements": {
                                "young-gaara-amateur-desert-graveyard": "young-gaara-drilling-air-bullet",
                                "young-gaara-amateur-desert-coffin": "young-gaara-sand-buckshot",
                                "young-gaara-shukaku-unleashed": "young-gaara-shukaku-tailed-beast-bomb",
                                "young-gaara-sand-pressure": "young-gaara-one-tailed-defense"
                            },
                            "tooltipText": "Gaara is transformed and has transformed skills."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "young_gaara_shukaku_defense",
                        "duration": 4,
                        "scope": "self",
                        "metadata": {
                            "destructibleDefensePoints": 55,
                            "removeStatusIdsOnBreak": [
                                "young_gaara_shukaku_form"
                            ],
                            "tooltipText": "Gaara has 55 destructible defense. If this defense is destroyed, Shukaku Unleashed ends."
                        }
                    }
                ]
            },
            {
                "id": "young-gaara-sand-pressure",
                "name": "Sand Pressure",
                "skillimage": "https://i.imgur.com/hOe6sjV.png",
                "skilldescription": "This skill makes Young Gaara ignore enemy damage for 1 turn and then gains 15 damage reduction and grant the enemy team a Sand Pressure stack. Passive: Sand Pressure stacks are 3 maximum per target. Stacks last 3 turns and refresh on re-application.",
                "energy": [
                    "Random"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 4,
                "classes": [
                    "Chakra",
                    "Instant",
                    "Unique"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "young_gaara_sand_pressure_ignore_damage",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "ignoreEnemyDamage": true,
                            "tooltipText": "This character ignores damage this turn."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "young_gaara_sand_pressure_guard",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "damageReductionFlat": 15,
                            "tooltipText": "This character has 15 damage reduction."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "young_gaara_sand_pressure_team_delay",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "triggerOnApply": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "hideTooltip": true,
                            "turnEndApplyStatusToEnemies": [
                                {
                                    "statusId": "young_gaara_sand_pressure",
                                    "duration": 3,
                                    "metadata": {
                                        "harmful": true,
                                        "refreshSameStatusOnEnemyTeam": true,
                                        "sandPressureStacks": 1,
                                        "stackMetadataKey": "sandPressureStacks",
                                        "stackDelta": 1,
                                        "stackMax": 3,
                                        "tooltipTextTemplate": "This character has {stacks} Sand Pressure stack(s)."
                                    }
                                }
                            ]
                        }
                    }
                ]
            },
            {
                "id": "young-gaara-drilling-air-bullet",
                "name": "Drilling Air Bullet",
                "hiddenFromSelectionViewer": true,
                "skillimage": "https://i.imgur.com/yZtNRim.png",
                "skilldescription": "Deals 28 piercing damage to one enemy. If the target has Sand Pressure, deal +8 damage.",
                "energy": [
                    "Ninjutsu",
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Chakra",
                    "Ranged",
                    "Instant",
                    "Unique"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 28,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 8,
                        "scope": "target",
                        "condition": {
                            "scope": "target",
                            "statusId": "young_gaara_sand_pressure"
                        },
                        "metadata": {
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true
                        }
                    }
                ]
            },
            {
                "id": "young-gaara-sand-buckshot",
                "name": "Sand Buckshot",
                "hiddenFromSelectionViewer": true,
                "skillimage": "https://i.imgur.com/UHpmtIs.png",
                "skilldescription": "Deals 16 piercing damage to all enemies. Applies 1 Sand Pressure stack to the primary target. Enemies hit have their non-mental skills increased in cost by +1 random chakra next turn.",
                "energy": [
                    "Bloodline",
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Physical",
                    "Ranged",
                    "Instant",
                    "Unique"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 16,
                        "scope": "all-enemy",
                        "metadata": {
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "young_gaara_sand_pressure",
                        "duration": 3,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "refreshSameStatusOnEnemyTeam": true,
                            "sandPressureStacks": 1,
                            "stackMetadataKey": "sandPressureStacks",
                            "stackDelta": 1,
                            "stackMax": 3,
                            "tooltipTextTemplate": "This character has {stacks} Sand Pressure stack(s)."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "young_gaara_non_mental_cost_up",
                        "duration": 1,
                        "scope": "all-enemy",
                        "metadata": {
                            "harmful": true,
                            "nonMentalRandomCostIncrease": 1,
                            "tooltipText": "This character non-mental skills cost 1 additional random chakra."
                        }
                    }
                ]
            },
            {
                "id": "young-gaara-shukaku-tailed-beast-bomb",
                "name": "Shukaku Tailed Beast Bomb",
                "hiddenFromSelectionViewer": true,
                "skillimage": "https://i.imgur.com/4G8DlFf.png",
                "skilldescription": "Deals 40 damage to one enemy and 12 damage to all other enemies. Enemies with Sand Pressure take +5 bonus damage.",
                "energy": [
                    "Bloodline",
                    "Random",
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Chakra",
                    "Ranged",
                    "Instant",
                    "Unique"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 40,
                        "scope": "target"
                    },
                    {
                        "type": "damage",
                        "amount": 5,
                        "scope": "target",
                        "condition": {
                            "scope": "target",
                            "statusId": "young_gaara_sand_pressure"
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 12,
                        "scope": "other-enemies"
                    },
                    {
                        "type": "damage",
                        "amount": 5,
                        "scope": "other-enemies",
                        "condition": {
                            "scope": "target",
                            "statusId": "young_gaara_sand_pressure"
                        }
                    }
                ]
            },
            {
                "id": "young-gaara-one-tailed-defense",
                "name": "One-Tailed Defense",
                "hiddenFromSelectionViewer": true,
                "skillimage": "https://i.imgur.com/vrlfWDI.png",
                "skilldescription": "Shukaku gains 25 damage reduction for 2 turns. During this time, Shukaku's skills cost 1 less random chakra.",
                "energy": [
                    "Random"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 4,
                "classes": [
                    "Physical",
                    "Instant",
                    "Unique"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "young_gaara_one_tailed_defense",
                        "duration": 2,
                        "scope": "self",
                        "metadata": {
                            "damageReductionFlat": 25,
                            "tooltipText": "This character has 25 damage reduction."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "young_gaara_shukaku_cost_reduction",
                        "duration": 2,
                        "scope": "self",
                        "metadata": {
                            "randomCostReduction": 1,
                            "tooltipText": "This character skills cost 1 less random chakra."
                        }
                    }
                ]
            }
        ]
    },
        {
            id: 'iron-man',
            characterId: 'iron-man',
            name: 'Iron Man',
            facePicture: 'https://i.imgur.com/rt5r1bu.png',
            characterdeescription:
                'Iron Man serves as a versatile control damage dealer, applying sustained pressure with energy-based attacks while adapting his suit mid-battle. Through Armor Upgrade, he evolves into a stronger form, gaining access to devastating abilities like Proton Cannon and Energy Burst. While his damage can be interrupted, Iron Man excels when protected, using mobility and precision to control the flow of combat and support his team.',
            skills: [
                {
                    id: 'iron-man-repulsor-blast',
                    name: 'Repulsor Blast',
                    skillimage: 'https://i.imgur.com/3ulWurz.png',
                    skilldescription:
                        'Deals 8 damage to one enemy per turn for 2 turns. If Overcharge is active, this instead deals 28 energy damage and stuns the target for 1 turn.',
                    energy: ['Random'],
                    target: 'single-enemy',
                    damage: 0,
                    cooldown: 0,
                    classes: ['Energy', 'Ranged', 'Control'],
                    effects: [
                        {
                            type: 'apply_status',
                            statusId: 'iron_man_repulsor_blast_dot',
                            duration: 2,
                            scope: 'target',
                            condition: {
                                scope: 'self',
                                missingStatusId: 'iron_man_overcharge_active',
                            },
                            metadata: {
                                harmful: true,
                                turnEndDamage: 8,
                                "triggerOnApply": true,
                                turnEndTrigger: 'source_turn',
                                turnDurationAnchor: 'source_turn',
                                ongoingClass: 'action',
                                tooltipText: 'This character takes 8 damage each turn.',
                            },
                        },
                        {
                            type: 'damage',
                            amount: 28,
                            scope: 'target',
                            condition: {
                                scope: 'self',
                                statusId: 'iron_man_overcharge_active',
                            },
                        },
                        {
                            type: 'apply_status',
                            statusId: 'stunned',
                            duration: 1,
                            scope: 'target',
                            condition: {
                                scope: 'self',
                                statusId: 'iron_man_overcharge_active',
                            },
                            metadata: {
                                harmful: true,
                                cannotUseSkills: true,
                                tooltipText: 'This character is stunned.',
                            },
                        },
                    ],
                },
                {
                    id: 'iron-man-overcharge',
                    name: 'Overcharge',
                    skillimage: 'https://i.imgur.com/XxNKoKu.png',
                    skilldescription:
                        "For 1 turn, Iron Man's Repulsor Blast and Proton Cannon is improved and gains a new effect.",
                    energy: ['Ninjutsu'],
                    target: 'self',
                    damage: 0,
                    cooldown: 0,
                    classes: ['Chakra', 'Instant'],
                    effects: [
                        {
                            type: 'apply_status',
                            statusId: 'iron_man_overcharge_active',
                            duration: 1,
                            scope: 'self',
                            metadata: {
                                infiniteDuration: false,
                                tooltipText: 'Iron Man\'s Repulsor Blast and Proton Cannon is overcharged for 1 turn.',
                            },
                        },
                    ],
                },
                {
                    id: 'iron-man-armor-upgrade',
                    name: 'Armor Upgrade',
                    skillimage: 'https://i.imgur.com/cUWpevS.png',
                    skilldescription:
                        "Iron Man may use this skill on himself or an ally. If used on himself, Repulsor Blast becomes Proton Cannon, this skill becomes Energy Burst, and Iron Man gains 10 points of unpierceable damage reduction. If used on an ally, they gain 5 bonus non-affliction damage and 10 permanent destructible defense. This effect stacks on allies and is permanent.",
                    energy: ['Bloodline'],
                    target: 'self-or-single-ally',
                    damage: 0,
                    cooldown: 2,
                    classes: ['Physical', 'Instant'],
                    effects: [
                        {
                            type: 'apply_status',
                            statusId: 'iron_man_armor_upgrade_self',
                            duration: 99,
                            scope: 'target',
                            condition: {
                                scope: 'target',
                                targetRelation: 'self',
                            },
                            metadata: {
                                infiniteDuration: true,
                                unpierceableDamageReductionFlat: 10,
                                skillReplacements: {
                                    'iron-man-repulsor-blast': 'iron-man-proton-cannon',
                                    'iron-man-armor-upgrade': 'iron-man-energy-burst',
                                },
                                tooltipText:
                                    'Iron Man has 10 unpierceable damage reduction, Repulsor Blast is replaced by Proton Cannon, and Armor Upgrade is replaced by Energy Burst.',
                            },
                        },
                        {
                            type: 'apply_status',
                            statusId: 'iron_man_armor_upgrade_ally',
                            duration: 99,
                            scope: 'target',
                            condition: {
                                scope: 'target',
                                targetRelation: 'ally',
                            },
                            metadata: {
                                infiniteDuration: true,
                                nonAfflictionDamageBonusFlat: 5,
                                destructibleDefensePoints: 10,
                                mergeNumericAddKeys: ['nonAfflictionDamageBonusFlat', 'destructibleDefensePoints'],
                                tooltipTextTemplate:
                                    'This character deals {nonAfflictionDamageBonusFlat} additional non-affliction damage and has {destructibleDefensePoints} destructible defense.',
                            },
                        },
                    ],
                },
                {
                    id: 'iron-man-iron-suit-mobility',
                    name: 'Iron Suit Mobility',
                    skillimage: 'https://i.imgur.com/JC495sM.png',
                    skilldescription:
                        "Iron Man and any ally affected by Armor Upgrade become invulnerable for 1 turn.",
                    energy: ['Random'],
                    target: 'self',
                    damage: 0,
                    cooldown: 4,
                    classes: ['Physical', 'Instant'],
                    effects: [
                        {
                            type: 'apply_status',
                            statusId: 'iron_man_iron_suit_mobility_invulnerable',
                            duration: 1,
                            scope: 'self',
                            metadata: {
                                invulnerable: true,
                                tooltipText: 'This character is invulnerable.',
                            },
                        },
                        {
                            type: 'apply_status',
                            statusId: 'iron_man_iron_suit_mobility_invulnerable',
                            duration: 1,
                            scope: 'all-allies',
                            condition: {
                                scope: 'target',
                                targetRelation: 'ally',
                                statusId: 'iron_man_armor_upgrade_ally',
                            },
                            metadata: {
                                invulnerable: true,
                                tooltipText: 'This character is invulnerable.',
                            },
                        },
                    ],
                },
                {
                    id: 'iron-man-proton-cannon',
                    name: 'Proton Cannon',
                    hiddenFromSelectionViewer: true,
                    actorCondition: {
                        statusId: 'iron_man_armor_upgrade_self',
                    },
                    skillimage: 'https://i.imgur.com/5AoKo39.png',
                    skilldescription:
                        'Deals 18 damage to one enemy per turn for 2 turns. If Overcharge is active, this instead deals 42 affliction damage.',
                    energy: ['Random', 'Random'],
                    target: 'single-enemy',
                    damage: 0,
                    cooldown: 0,
                    classes: ['Energy', 'Ranged', 'Control'],
                    effects: [
                        {
                            type: 'apply_status',
                            statusId: 'iron_man_proton_cannon_dot',
                            duration: 2,
                            scope: 'target',
                            condition: {
                                scope: 'self',
                                missingStatusId: 'iron_man_overcharge_active',
                            },
                            metadata: {
                                harmful: true,
                                turnEndDamage: 18,
                                turnEndTrigger: 'source_turn',
                                turnDurationAnchor: 'source_turn',
                                ongoingClass: 'action',
                                tooltipText: 'This character takes 18 damage each turn.',
                            },
                        },
                        {
                            type: 'damage',
                            amount: 42,
                            scope: 'target',
                            condition: {
                                scope: 'self',
                                statusId: 'iron_man_overcharge_active',
                            },
                            metadata: {
                                afflictionDamage: true,
                                ignoreDamageReduction: true,
                                ignoreDestructibleDefense: true,
                            },
                        },
                    ],
                },
                {
                    id: 'iron-man-energy-burst',
                    name: 'Energy Burst',
                    hiddenFromSelectionViewer: true,
                    actorCondition: {
                        statusId: 'iron_man_armor_upgrade_self',
                    },
                    skillimage: 'https://i.imgur.com/r6cDktw.png',
                    skilldescription: 'Deals 22 damage to all enemies and stuns their energy skills for 1 turn.',
                    energy: ['Bloodline', 'Ninjutsu'],
                    target: 'all-enemy',
                    damage: 0,
                    cooldown: 2,
                    classes: ['Energy', 'Ranged', 'Instant'],
                    effects: [
                        {
                            type: 'damage',
                            amount: 22,
                            scope: 'all-enemy',
                        },
                        {
                            type: 'apply_status',
                            statusId: 'iron_man_energy_burst_lock',
                            duration: 1,
                            scope: 'all-enemy',
                            metadata: {
                                harmful: true,
                                cannotUseSkillClasses: ['energy'],
                                tooltipText: 'This character energy skills are stunned.',
                            },
                        },
                    ],
                },
            ],
        },
        {
    id: 'spider-man',
    characterId: 'spider-man',
    name: 'Spider-Man',
    facePicture: 'https://i.imgur.com/P6HqSu0.png',
    startStatuses: [
        {
            statusId: 'spider_man_spider_senses_passive',
            duration: 999,
            sourceSkillId: 'spider-man-passive-spider-senses',
            metadata: {
                infiniteDuration: true,
                persistOnOwnerSkillEvadedTrigger: true,
                evadeChancePercent: 0,
                tooltipAggregateStatusIds: [
                    'spider_man_spider_strike_senses',
                    'spider_man_web_shot_senses',
                    'spider_man_web_wrap_senses',
                    'spider_man_web_slinging_senses'
                ],
                tooltipAggregateMetadataKey: 'evadeChancePercent',
                tooltipTextTemplate:
                    'Spider-Man has {evadeChancePercent}% Evasion (this increases by up to 75% through his other skills). When a skill misses, Spider Strike and Web Shot have their costs changed to 1 random energy for 1 turn.',
                onOwnerSkillEvadedApplyStatusToOwner: {
                    statusId: 'spider_man_spider_senses_evade_cost_shift',
                    duration: 1,
                    metadata: {
                        skillCostOverridesBySkillId: {
                            'spider-man-spider-strike': {
                                energy: ['Random']
                            },
                            'spider-man-web-shot': {
                                energy: ['Random']
                            }
                        },
                        tooltipText: 'Spider-Man\'s Spider Strike and Web Shot cost 1 random energy for 1 turn after he evades a skill.'
                    }
                },
                tooltipText: 'Spider-Man has 0% Evasion (this increases by up to 75% through his other skills). When a skill misses, Spider Strike and Web Shot have their costs changed to 1 random energy for 1 turn.'
            }
        }
    ],
    characterdeescription: 'Agile, reactive, and relentlessly disruptive, Spider-Man excels at controlling the flow of battle through precision and timing. Rather than overpowering enemies, he weakens them—restricting their options, increasing their costs, and punishing every misstep. With abilities that hinder enemy actions and amplify his own evasiveness, Spider-Man thrives in drawn-out encounters where his Spider Senses can fully take over.',
    skills: [
        {
            id: 'spider-man-spider-strike',
            name: 'Spider Strike',
            skillimage: 'https://i.imgur.com/nlYDkTI.png',
            skilldescription: 'Deals 20 damage to one enemy. This deals 5 additional damage to an enemy affected by \'Web Shot\' or \'Web Wrap\' and becomes piercing if Spider-Man is under the effects of \'Web Slinging\'. Increases \'Passive: Spider Senses\' by 5%.',
            energy: [
                'Taijutsu'
            ],
            target: 'all-enemy',
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
                    amount: 20,
                    scope: 'target',
                    metadata: {
                        ignoreDamageReduction: false
                    }
                },
                {
                    type: 'damage',
                    amount: 5,
                    scope: 'target',
                    condition: {
                        scope: 'target',
                        statusIdsAny: ['spider_man_web_shot_stun', 'spider_man_web_wrap_cost']
                    },
                    metadata: {
                        ignoreDamageReduction: false
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'spider_man_spider_strike_senses',
                    duration: 999,
                    scope: 'self',
                    metadata: {
                        infiniteDuration: true,
                        evadeChancePercent: 5,
                        mergeNumericAddKeys: ['evadeChancePercent'],
                        tooltipText: 'This character has 5% evasion.',
                        "hideTooltip": true,
                    }
                }
            ]
        },
        {
            id: 'spider-man-web-shot',
            name: 'Web Shot',
            skillimage: 'https://i.imgur.com/tubyiRo.png',
            skilldescription: 'Stuns one enemy’s harmful skills for 1 turn. If the target is affected by \'Web Wrap\', the cost of their skills is increased by 1 random energy until they use a new skill (does not stack). Increases \'Passive: Spider Senses\' by 5%.',
            energy: [
                'Genjutsu'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 1,
            classes: [
                'Physical',
                'Ranged',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'spider_man_web_shot_stun',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        cannotUseHarmfulSkills: true,
                        tooltipText: 'This character cannot use harmful skills.'
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'spider_man_web_shot_wrap_cost',
                    duration: 999,
                    scope: 'target',
                    condition: {
                        scope: 'target',
                        statusId: 'spider_man_web_wrap_cost'
                    },
                    metadata: {
                        harmful: true,
                        randomCostIncrease: 1,
                        onOwnerUseSkillTrigger: true,
                        tooltipText: 'This character\'s skills cost 1 additional random energy until they use a skill.'
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'spider_man_web_shot_senses',
                    duration: 999,
                    scope: 'self',
                    metadata: {
                        infiniteDuration: true,
                        evadeChancePercent: 5,
                        mergeNumericAddKeys: ['evadeChancePercent'],
                        tooltipText: 'This character has 5% evasion.',
                        "hideTooltip": true,
                    }
                }
            ]
        },
        {
            id: 'spider-man-web-wrap',
            name: 'Web Wrap',
            skillimage: 'https://i.imgur.com/6lWrM2t.png',
            skilldescription: 'Increases the cost of one enemy’s skills by 2 White Energy until they use a new skill. This does not stack and may only affect one enemy at a time (will remove itself from a previous enemy if used on a new one). Increases \'Passive: Spider Senses\' by 5%.',
            energy: [
                'Genjutsu',
                'Genjutsu'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 4,
            classes: [
                'Physical',
                'Ranged',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'spider_man_web_wrap_cost',
                    duration: 999,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        genjutsuCostIncrease: 2,
                        onOwnerUseSkillTrigger: true,
                        uniqueEnemyMarkFromSource: true,
                        tooltipText: 'This character\'s skills cost 2 additional white energy until they use a skill.'
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'spider_man_web_wrap_senses',
                    duration: 999,
                    scope: 'self',
                    metadata: {
                        infiniteDuration: true,
                        evadeChancePercent: 5,
                        mergeNumericAddKeys: ['evadeChancePercent'],
                        tooltipText: 'This character has 5% evasion.',
                        "hideTooltip": true,
                    }
                }
            ]
        },
        {
            id: 'spider-man-web-slinging',
            name: 'Web Slinging',
            skillimage: 'https://i.imgur.com/7gcVo5T.png',
            skilldescription: 'Spider-Man ignores enemy stun effects and deals 5 bonus damage with \'Spider Strike\' for 2 turns. Increases \'Passive: Spider Senses\' by 10%.',
            energy: [
                'Random'
            ],
            target: 'self',
            damage: 0,
            cooldown: 3,
            classes: [
                'Physical',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'spider_man_web_slinging_active',
                    duration: 2,
                    scope: 'self',
                    metadata: {
                        cannotBeStunned: true,
                        ignoreDamageReductionForSkillIds: ['spider-man-spider-strike'],
                        skillDamageBonuses: {
                            'spider-man-spider-strike': 5
                        },
                        tooltipText: 'Spider-Man ignores stun effects and Spider Strike deals 5 additional damage.'
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'spider_man_web_slinging_senses',
                    duration: 999,
                    scope: 'self',
                    metadata: {
                        infiniteDuration: true,
                        evadeChancePercent: 10,
                        mergeNumericAddKeys: ['evadeChancePercent'],
                        tooltipText: 'This character has 10% evasion.',
                        "hideTooltip": true,
                    }
                }
            ]
        },
        {
            id: 'spider-man-passive-spider-senses',
            name: 'Passive: Spider Senses',
            
            skillimage: 'https://i.imgur.com/Ucz75UH.png',
            skilldescription: 'Spider-Man has 0% Evasion (this increases by up to 75% through his other skills). When a skill misses, \'Spider Strike\' and \'Web Shot\' have their costs changed to 1 random energy for 1 turn.',
            energy: [],
            target: 'self',
            damage: 0,
            cooldown: 0,
            classes: [
                'Passive',
                'Instant'
            ],
        }
    ]
},
    {
    id: 'captain-america',
    characterId: 'captain-america',
    name: 'Captain America',
    facePicture: 'https://i.imgur.com/hdlwp4G.png',
    characterdeescription: 'Captain America serves as a disciplined frontline protector who excels at controlling the pace of battle through precise, well-timed defensive plays. Rather than building long-term power, he focuses on creating short windows of advantage that allow his team to safely pressure the enemy. His abilities provide a versatile mix of disruption and protection—silencing key threats, forcing enemies to target him, and reducing incoming damage at critical moments. With low cooldowns across his kit, he can consistently adapt to the flow of combat and respond to enemy actions in real time.',
    startStatuses: [
        {
            statusId: 'captain_america_america_shield_passive',
            sourceSkillId: 'captain_america_america_shield_passive2',
            duration: 999,
            metadata: {
                infiniteDuration: true,
                onTeamMemberUseSkillApplyStatusToOwner: {
                    statusId: 'captain_america_america_shield_defense',
                    duration: 999,
                    energyTypes: ['genjutsu', 'ninjutsu', 'bloodline'],
                    scaleMetadataKeys: ['destructibleDefensePoints'],
                    metadata: {
                        destructibleDefensePoints: 5,
                        mergeNumericAddKeys: ['destructibleDefensePoints'],
                        tooltipTextTemplate: 'This character has {destructibleDefensePoints} destructible defense.'
                    }
                },
                tooltipText:
                    "While Cap is alive, teammates gain 5 permanent destructible defense for each red, white, or blue energy spent by a skill."
            }
        },
        {
            statusId: 'captain_america_vibranium_ricochet_cost_red',
            sourceSkillId: 'captain-america-vibranium-ricochet',
            duration: 1,
            metadata: {
                hideTooltipFromUnitOwner: true,
                hideTooltipFromEnemy: true,
                skillCostOverridesBySkillId: {
                    'captain-america-vibranium-ricochet': {
                        energy: ['Bloodline']
                    }
                },
                onExpireApplyStatusToSelf: {
                    statusId: 'captain_america_vibranium_ricochet_cost_white',
                    duration: 1,
                    metadata: {
                        hideTooltipFromUnitOwner: true,
                        hideTooltipFromEnemy: true,
                        skillCostOverridesBySkillId: {
                            'captain-america-vibranium-ricochet': {
                                energy: ['Genjutsu']
                            }
                        },
                        onExpireApplyStatusToSelf: {
                            statusId: 'captain_america_vibranium_ricochet_cost_blue',
                            duration: 1,
                            metadata: {
                                hideTooltipFromUnitOwner: true,
                                hideTooltipFromEnemy: true,
                                skillCostOverridesBySkillId: {
                                    'captain-america-vibranium-ricochet': {
                                        energy: ['Ninjutsu']
                                    }
                                },
                                onExpireApplyStatusToSelf: {
                                    statusId: 'captain_america_vibranium_ricochet_cost_red',
                                    duration: 1,
                                    metadata: {
                                        hideTooltipFromUnitOwner: true,
                                        hideTooltipFromEnemy: true,
                                        skillCostOverridesBySkillId: {
                                            'captain-america-vibranium-ricochet': {
                                                energy: ['Bloodline']
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    ],
    skills: [
        {
            id: 'captain-america-shield-throw',
            name: 'Shield Throw',
            skillimage: 'https://i.imgur.com/evOMqYo.png',
            skilldescription: 'Deals 20 damage to one main enemy and 15 damage to a random different enemy then silences the main enemy\'s harmful skills for 1 turn.',
            energy: [
                'Bloodline'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 1,
            classes: [
                'Physical',
                'Ranged',
                'Instant'
            ],
            effects: [
                {
                    type: 'damage',
                    amount: 20,
                    scope: 'target'
                },
                {
                    type: 'damage',
                    amount: 15,
                    scope: 'random-other-enemy'
                },
                {
                    type: 'apply_status',
                    statusId: 'captain_america_shield_throw_silence',
                    duration: 1,
                    scope: 'target',
                        "metadata": {
                            "harmful": true,
                            "silenceNonDamageEffects": true,
                            "tooltipText": "Silenced: only damage from this character's skills will work."
                        }
                }
            ]
        },
        {
            id: 'captain-america-shield-bash',
            name: 'Shield Bash',
            skillimage: 'https://i.imgur.com/tMxWAWJ.png',
            skilldescription: 'One enemy receives 20 damage and is taunted for 1 turn. This skill grants Captain America 20 points of destructible defense for 1 turn.',
            energy: [
                'Genjutsu'
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
                    amount: 20,
                    scope: 'target'
                },
                {
                    type: 'apply_status',
                    statusId: 'captain_america_shield_bash_taunt',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        taunt: true,
                        tooltipText: 'This character is taunted and can only target Captain America.'
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'captain_america_shield_bash_defense',
                    duration: 1,
                    scope: 'self',
                    metadata: {
                        destructibleDefensePoints: 20,
                        tooltipText: 'Captain America has 20 destructible defense.'
                    }
                }
            ]
        },
        {
            id: 'captain-america-patriot-s-flag',
            name: 'Patriot\'s Flag',
            skillimage: 'https://i.imgur.com/rV2vZHe.png',
            skilldescription: 'Captain America rallies his team to stand united. For 1 turn, all allies gain 10 health, 5 points of unpierceable damage reduction, deal +5 additional non-affliction damage, and are immune to stun effects.',
            energy: [
                'Ninjutsu'
            ],
            target: 'all-allies',
            damage: 0,
            cooldown: 1,
            classes: [
                'Physical',
                'Instant'
            ],
            effects: [
                {
                    type: 'heal',
                    amount: 10,
                    scope: 'all-allies'
                },
                {
                    type: 'apply_status',
                    statusId: 'captain_america_patriots_flag_buff',
                    duration: 1,
                    scope: 'all-allies',
                    metadata: {
                        unpierceableDamageReductionFlat: 5,
                        nonAfflictionDamageBonusFlat: 5,
                        cannotBeStunned: true,
                        mergeNumericAddKeys: [
                            'unpierceableDamageReductionFlat',
                            'nonAfflictionDamageBonusFlat'
                        ],
                        tooltipText:
                            'This character has 5 unpierceable damage reduction, deals 5 additional non-affliction damage, and ignores stun effects.'
                    }
                }
            ]
        },
        {
            id: 'captain-america-vibranium-ricochet',
            name: 'Vibranium Ricochet',
            skillimage: 'https://i.imgur.com/360RvnV.png',
            skilldescription: 'Captain America or one ally ignores all enemy non-mental skills for 1 turn. Reflects 25% of all non-mental damage directed at the character affected by this skill back at the attacker. This skill is invisible and cycles its cost between red/white/blue each turn.',
            energy: [
                'Bloodline'
            ],
            target: 'self-or-single-ally',
            damage: 0,
            cooldown: 2,
            classes: [
                'Physical',
                'Instant',
                'Invisible'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'captain_america_vibranium_ricochet_guard',
                    duration: 1,
                    scope: 'self-or-single-ally',
                    metadata: {
                        ignoreEnemyNonMentalDamage: true,
                        "hideTooltipFromEnemy": true,
                        reflectDamagePercent: 25,
                        reflectDamageExcludeSkillClasses: ['mental'],
                        tooltipText:
                            'This character will ignore all non-mental enemy skills and reflects 25% of non-mental damage back at the attacker.',
                        onExpireApplyStatusToSelf: {
                            statusId: 'captain_america_vibranium_ricochet_guard_used',
                            duration: 1,
                            metadata: {
                                tooltipText: 'This skill was used.'
                            }
                        }
                    }
                }
            ]
        },
        {
            id: 'captain_america_america_shield_passive2',
            name: 'Passive: America\'s Shield',
            skillimage: 'https://i.imgur.com/kNCwURs.png',
            skilldescription: 'While Cap is alive, every time a member of his team uses a skill with an individual Red/White/Blue energy in its cost (or any combination of the 3, but not black or green), they gain 5 points of permanent destructible defense for each color spent.',
            energy: [],
            target: '',
            damage: 0,
            cooldown: 0,
            classes: [
                'Passive',
                'Instant'
            ]
        }
    ]
},
    {
    id: 'superman',
    characterId: 'superman',
    name: 'Superman',
    facePicture: 'https://i.imgur.com/qxxeJxM.png',
    startStatuses: [
        {
            statusId: 'superman_the_man_of_steel_passive',
            sourceSkillId: 'superman-passive-the-man-of-steel',
            duration: 999,
            metadata: {
                infiniteDuration: true,
                unpierceableDamageReductionFlat: 10,
                tooltipText: 'Superman has 10 unpierceable damage reduction.',
            },
        },
    ],
    characterdeescription: 'Superman plays as a tempo enforcer—opening fights with debilitating control like Frost Breath, then following with consistent, unavoidable damage from Laser Eyes and Solar Flare to wear down entire teams. His Man of Steel passive anchors everything, giving him the durability to stay aggressive longer than most damage dealers',
    skills: [
        {
            id: 'superman-laser-eyes',
            name: 'Laser Eyes',
            skillimage: 'https://i.imgur.com/TD7qGDJ.png',
            skilldescription: 'Superman blasts one enemy with his laser vision, dealing 10 piercing and 10 affliction damage to them. For 1 turn, this skill costs 1 more red energy and deals 20 piercing and 20 affliction damage.',
            energy: ['Bloodline'],
            target: 'single-enemy',
            damage: 0,
            cooldown: 0,
            classes: ['Energy', 'Ranged', 'Instant'],
            effects: [
                {
                    type: 'damage',
                    amount: 10,
                    scope: 'target',
                    metadata: {
                            "ignoreDamageReduction": true,
                    }
                },
                {
                    type: 'damage',
                    amount: 10,
                    scope: 'target',
                    metadata: {
                        afflictionDamage: true,
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true,
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'superman_laser_eyes_charge',
                    duration: 2,
                    scope: 'self',
                    metadata: {
                        skillReplacementsBySkillId: {
                            'superman-laser-eyes': 'superman-laser-eyes-empowered'
                        },
                        tooltipText: 'Laser Eyes costs 1 more red energy and deals 20 piercing and 20 affliction damage..'
                    }
                }
            ]
        },
        {
            id: 'superman-frost-breath',
            name: 'Frost Breath',
            skillimage: 'https://i.imgur.com/OdxIs9J.png',
            skilldescription: 'Superman freezes one enemy in ice, dealing 10 affliction damage to them and fully stuns them for 1 turn. For 1 turn, this skill costs 1 more blue energy, deals 20 affliction damage, and fully stuns for 2 turns.',
            energy: ['Ninjutsu'],
            target: 'single-enemy',
            damage: 0,
            cooldown: 0,
            classes: ['Energy', 'Ranged', 'Instant'],
            effects: [
                {
                    type: 'damage',
                    amount: 10,
                    scope: 'target',
                    metadata: {
                        afflictionDamage: true,
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true,
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'stunned',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        cannotUseSkills: true,
                        tooltipText: 'This character is stunned.'
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'superman_frost_breath_charge',
                    duration: 2,
                    scope: 'self',
                    metadata: {
                        skillReplacementsBySkillId: {
                            'superman-frost-breath': 'superman-frost-breath-empowered'
                        },
                        tooltipText: 'Frost Breath costs 1 more blue energy, deals 20 affliction damage, and fully stuns for 2 turns.'
                    }
                }
            ]
        },
        {
            id: 'superman-solar-flare',
            name: 'Solar Flare',
            skillimage: 'https://i.imgur.com/oNMuLXK.png',
            skilldescription: 'Superman deals 30 damage to the enemy team. For 2 turns, Passive: The Man of Steel is de-activated.',
            energy: ['Random', 'Random', 'Random'],
            target: 'all-enemy',
            damage: 0,
            cooldown: 3,
            classes: ['Energy', 'Ranged', 'Instant'],
            effects: [
                {
                    type: 'damage',
                    amount: 30,
                    scope: 'all-enemy'
                },
                {
                    type: 'apply_status',
                    statusId: 'superman_solar_flare_deactivation',
                    duration: 2,
                    scope: 'self',
                    metadata: {
                        removeStatusIdsOnApply: ['superman_the_man_of_steel_passive'],
                        onExpireApplyStatusToSelf: {
                            statusId: 'superman_the_man_of_steel_passive',
                            duration: 999,
                            sourceSkillId: 'superman-passive-the-man-of-steel',
                            metadata: {
                                infiniteDuration: true,
                                unpierceableDamageReductionFlat: 10,
                                tooltipText: 'Superman has 10 unpierceable damage reduction.'
                            }
                        },
                        tooltipText: 'Superman\'s Man of Steel passive is de-activated.'
                    }
                }
            ]
        },
        {
            id: 'superman-super-powered-flight',
            name: 'Super-Powered Flight',
            skillimage: 'https://i.imgur.com/59xjdEo.png',
            skilldescription: 'Superman becomes invulnerable for 1 turn and deals 25 damage to one enemy.',
            energy: ['Random', 'Random'],
            target: 'single-enemy',
            damage: 0,
            cooldown: 4,
            classes: ['Physical', 'Melee', 'Instant'],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'invulnerable',
                    duration: 1,
                    scope: 'self',
                    metadata: {
                        invulnerable: true,
                        tooltipText: 'This character is invulnerable.'
                    }
                },
                {
                    type: 'damage',
                    amount: 25,
                    scope: 'target'
                }
            ]
        },
        {
            id: 'superman-passive-the-man-of-steel',
            name: 'Passive: The Man of Steel',
            skillimage: 'https://i.imgur.com/BDerCDI.png',
            skilldescription: 'Superman has 10 unpierceable damage reduction.',
            energy: [],
            target: '',
            damage: 0,
            cooldown: 0,
            classes: [
                'Passive',
                'Instant'
            ]
        },
                {
            id: 'superman-laser-eyes-empowered',
            name: 'Laser Eyes',
            hiddenFromSelectionViewer: true,
            skillimage: 'https://i.imgur.com/TD7qGDJ.png',
            skilldescription: 'Laser Eyes is empowered, dealing 20 piercing damage and 20 affliction damage to one enemy.',
            energy: ['Bloodline', 'Bloodline'],
            target: 'single-enemy',
            damage: 0,
            cooldown: 0,
            classes: ['Energy', 'Ranged', 'Instant'],
            effects: [
                {
                    type: 'damage',
                    amount: 20,
                    scope: 'target',
                    "metadata": {
                        "ignoreDamageReduction": true
                    }
                },
                {
                    type: 'damage',
                    amount: 20,
                    scope: 'target',
                    metadata: {
                        afflictionDamage: true,
                        "ignoreDamageReduction": true,
                     "ignoreDestructibleDefense": true,

                    }
                }
            ]
        },
                {
            id: 'superman-frost-breath-empowered',
            name: 'Frost Breath',
            hiddenFromSelectionViewer: true,
            skillimage: 'https://i.imgur.com/OdxIs9J.png',
            skilldescription: 'Frost Breath is empowered, dealing 20 affliction damage to one enemy and fully stunning them for 2 turns.',
            energy: ['Ninjutsu', 'Ninjutsu'],
            target: 'single-enemy',
            damage: 0,
            cooldown: 0,
            classes: ['Energy', 'Ranged', 'Instant'],
            effects: [
                {
                    type: 'damage',
                    amount: 20,
                    scope: 'target',
                    metadata: {
                        afflictionDamage: true,
                        "ignoreDamageReduction": true,
                     "ignoreDestructibleDefense": true,
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'stunned',
                    duration: 2,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        cannotUseSkills: true,
                        tooltipText: 'This character is stunned.'
                    }
                }
            ]
        },
    ]
},
    {
    id: 'batman',
    characterId: 'batman',
    name: 'Batman',
    facePicture: 'https://i.imgur.com/lFB3seb.png',
    startStatuses: [
        {
            statusId: 'batman_bat_signal',
            sourceSkillId: 'batman-passive-bat-signal',
            duration: 2,
            metadata: {
                infiniteDuration: false,
                invulnerableToHarmfulEffects: true,
                onOwnerUseSkillTrigger: true,
                removeStatusIdsOnEnemyHarmfulSkill: ['batman_bat_signal'],
                tooltipText: 'Batman is invulnerable to harmful effects for the first 2 turns, if he uses a new skill, this passive will end.'
            }
        }
    ],
    characterdeescription: 'Batman is a master tactician who controls the battlefield with gadgets, evasive maneuvers, and precision strikes. Using advanced technology and relentless preparation, he can disrupt enemy teams, reflect attacks, and pressure opponents with bursts of damage. Batman excels at manipulating enemy positioning and punishing careless aggression, making him a highly adaptable fighter who thrives when staying one step ahead.',
    skills: [
        {
            id: 'batman-explosive-batarangs',
            name: 'Explosive Batarangs',
            skillimage: 'https://i.imgur.com/8EK9yEi.png',
            skilldescription: 'Deals 5 damage and 3 affliction damage to all enemies. For the next turn, this skill instead targets one enemy and strikes them three times, each hit dealing 5 damage and 3 affliction damage, before returning to its normal effect.',
            energy: [
                'Random'
            ],
            target: 'all-enemy',
            damage: 0,
            cooldown: 0,
            classes: [
                'Physical',
                'Ranged',
                'Instant',
                'Affliction'
            ],
            effects: [
                {
                    type: 'damage',
                    amount: 5,
                    scope: 'all-enemy'
                },
                {
                    type: 'damage',
                    amount: 3,
                    scope: 'all-enemy',
                    metadata: {
                        afflictionDamage: true
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'batman_explosive_batarangs_followup',
                    duration: 1,
                    scope: 'self',
                    metadata: {
                        skillReplacementsByRemainingTurns: {
                            '1': {
                                'batman-explosive-batarangs': 'batman-explosive-batarangs-empowered'
                            }
                        },
                        tooltipText: 'Explosive Batarangs now targets one enemy and strikes them three times, each hit dealing 5 damage and 3 affliction damage,'
                    }
                }
            ]
        },
        {
            id: 'batman-pocket-emp',
            name: 'Pocket EMP',
            skillimage: 'https://i.imgur.com/4Pr0xxy.png',
            skilldescription: 'Batman releases a compact electromagnetic pulse that silences the enemy team for 1 turn, preventing all non-damage effects. Enemies also take 5 additional damage from all sources for 1 turn. This skill ignores invulnerability and then swaps to \'Smoke Bomb\'.',
            energy: [
                'Genjutsu'
            ],
            target: 'all-enemy',
            damage: 0,
            cooldown: 3,
            classes: [
                'Energy',
                'Ranged',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'batman_pocket_emp_silence',
                    duration: 1,
                    scope: 'all-enemy',
                    metadata: {
                        harmful: true,
                        silenceNonDamageEffects: true,
                        damageTakenBonusFlat: 5,
                        tooltipText: 'This character is silenced and takes 5 additional damage from all sources.'
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'batman_gadget_swap',
                    duration: 99,
                    scope: 'self',
                    metadata: {
                        skillReplacements: {
                            'batman-pocket-emp': 'batman-smoke-bomb',
                            'batman-smoke-bomb': 'batman-pocket-emp'
                        },
                        tooltipText: 'Pocket EMP and Smoke Bomb are replaced by each other.'
                    }
                }
            ]
        },
        {
            id: 'batman-grappling-hook',
            name: 'Grappling Hook',
            skillimage: 'https://i.imgur.com/7PwWb6Z.png',
            skilldescription: 'Batman evades danger using his grappling hook, becoming invulnerable for 1 turn and removing all harmful effects from himself. One enemy becomes unable to go invulnerable or reduce damage for 1 turn and takes 5 additional damage from all sources during that time. This skill then swaps to \'Bullet-Deflecting Cape\'.',
            energy: [
                'Random'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 3,
            classes: [
                'Physical',
                'Ranged',
                'Instant'
            ],
            effects: [
                {
                    type: 'cleanse_harmful',
                    count: 99,
                    scope: 'self'
                },
                {
                    type: 'apply_status',
                    statusId: 'batman_grappling_hook_invulnerable',
                    duration: 1,
                    scope: 'self',
                    metadata: {
                        invulnerable: true,
                        tooltipText: 'This character is invulnerable.'
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'batman_grappling_hook_lock',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        cannotReduceDamage: true,
                        cannotBecomeInvulnerable: true,
                        damageTakenBonusFlat: 5,
                        tooltipText: 'This character cannot reduce damage or become invulnerable and takes 5 additional damage from all sources.'
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'batman_cape_swap',
                    duration: 99,
                    scope: 'self',
                    metadata: {
                        skillReplacements: {
                            'batman-grappling-hook': 'batman-bullet-deflecting-cape',
                        },
                        tooltipText: 'Grappling Hook is now Bullet-Deflecting Cape.'
                    }
                }
            ]
        },
        {
            id: 'batman-batmobile',
            name: 'Batmobile',
            skillimage: 'https://i.imgur.com/NA1Udzh.png',
            skilldescription: 'Batman deploys the Batmobile, gaining 55 permanent destructible defense and becoming invulnerable for 1 turn. While this destructible defense remains, this skill can be used for no energy cost to deal 35 piercing damage to one enemy, reducing Batman’s destructible defense by 25 each use. When the destructible defense is destroyed, this skill is replaced with \'Bat Kick\'.',
            energy: [
                'Genjutsu',
                'Random',
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
                    statusId: 'batman_batmobile_active',
                    duration: 99,
                    scope: 'self',
                    metadata: {
                        destructibleDefensePoints: 55,
                        removeStatusIdsOnBreak: ['batman_batmobile_active'],
                        skillReplacements: {
                            'batman-batmobile': 'batman-batmobile-active'
                        },
                        onBreakApplyStatusToSelf: {
                            statusId: 'batman_batmobile_broken_swap',
                            duration: 99,
                            metadata: {
                                infiniteDuration: true,
                                skillReplacements: {
                                    'batman-batmobile': 'batman-bat-kick'
                                },
                                tooltipText: 'Batmobile is replaced by Bat Kick once the Batmobile is destroyed.'
                            }
                        },
                        tooltipTextTemplate: 'Batman has {destructibleDefensePoints} destructible defense and Batmobile is active.'
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'batman_batmobile_invulnerable',
                    duration: 1,
                    scope: 'self',
                    metadata: {
                        invulnerable: true,
                        tooltipText: 'This character is invulnerable.'
                    }
                }
            ]
        },
        {
            id: 'batman-batmobile-active',
            name: 'Batmobile',
            hiddenFromSelectionViewer: true,
            skillimage: 'https://i.imgur.com/NA1Udzh.png',
            skilldescription: 'Batman drives the Batmobile into one enemy, dealing 35 piercing damage and consuming 25 points of destructible defense.',
            energy: [],
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
                    amount: 35,
                    scope: 'target',
                    metadata: {
                        ignoreDamageReduction: true,
                        ignoreDestructibleDefense: true
                    }
                },
                {
                    type: 'damage',
                    amount: 25,
                    scope: 'self',
                    metadata: {
                        ignoreDamageReduction: true
                    }
                }
            ]
        },
        {
            id: 'batman_batmobile_broken_swap',
            name: 'Batmobile Broken Swap',
            hiddenFromSelectionViewer: true,
            skillimage: 'https://i.imgur.com/NA1Udzh.png',
            skilldescription: 'Internal replacement status that changes Batmobile into Bat Kick after the Batmobile is destroyed.',
            energy: [],
            target: '',
            damage: 0,
            cooldown: 0,
            classes: [
                'Passive',
                'Instant'
            ]
        },
        {
            id: 'batman-bullet-deflecting-cape',
            name: 'Bullet-Deflecting Cape',
            skillimage: 'https://i.imgur.com/QPcJuMv.png',
            skilldescription: 'For 1 turn, the first non-mental harmful skill used on Batman is reflected onto a random enemy. This skill is invisible. This skill then swaps back to \'Grappling Hook\'.',
            energy: [
                'Random'
            ],
            target: 'self',
            damage: 0,
            cooldown: 3,
            classes: [
                'Physical',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'batman_bullet_deflecting_cape_reflect',
                    duration: 1,
                    scope: 'self',
                    metadata: {
                        reflectNextIncomingSkill: true,
                        reflectOnlyHarmfulSkills: true,
                        reflectExcludeSkillClasses: ['mental'],
                        reflectToRandomCasterAlly: true,
                        skipFirstTurnEndTick: true,
                        preserveOnOwnerUseSkillTrigger: true,
                        hideTooltipFromEnemy: true,
                        onExpireApplyStatusToSelf: {
                            statusId: 'batman_bullet_deflecting_cape_used',
                            duration: 1,
                            metadata: {
                                tooltipText: 'This skill was used.'
                            }
                        },
                        harmful: true,
                        tooltipText: 'The next harmful non-mental skill used on Batman is reflected to a random enemy.'
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'batman_cape_swap',
                    duration: 99,
                    scope: 'self',
                    metadata: {
                        hideTooltip: true,
                        skillReplacements: {
                            'batman-grappling-hook': 'batman-bullet-deflecting-cape',
                        },
                        tooltipText: 'Grappling Hook is now Bullet-Deflecting Cape.'
                    }
                }
            ]
        },
        {
            id: 'batman-smoke-bomb',
            name: 'Smoke Bomb',
            skillimage: 'https://i.imgur.com/WmwINXG.png',
            skilldescription: 'Batman throws a smoke bomb that blinds the enemy team for 1 turn, causing their next skill to target a random character. Enemies also take 5 additional damage from all sources for 1 turn. This skill then swaps back to \'Pocket EMP\'.',
            energy: [
                'Genjutsu',
                'Random'
            ],
            target: 'all-enemy',
            damage: 0,
            cooldown: 3,
            classes: [
                'Physical',
                'Instant',
                'Ranged'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'batman_smoke_bomb_blind',
                    duration: 1,
                    scope: 'all-enemy',
                    metadata: {
                        harmful: true,
                        harmfulBlind: true,
                        damageTakenBonusFlat: 5,
                        tooltipText: 'This character is blinded and takes 5 additional damage from all sources.'
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'batman_gadget_swap',
                    duration: 99,
                    scope: 'self',
                    metadata: {
                        skillReplacements: {
                            'batman-pocket-emp': 'batman-smoke-bomb',
                            'batman-smoke-bomb': 'batman-pocket-emp'
                        },
                        tooltipText: 'Pocket EMP and Smoke Bomb are replaced by each other.'
                    }
                }
            ]
        },
        {
            id: 'batman-bat-kick',
            name: 'Bat Kick',
            skillimage: 'https://i.imgur.com/C7eIM8u.png',
            skilldescription: 'Batman delivers a brutal martial arts strike, dealing 35 damage to one enemy.',
            energy: [
                'Random',
                'Random'
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
                    amount: 35,
                    scope: 'target'
                }
            ]
        },
        {
            id: 'batman-passive-bat-signal',
            name: 'Passive: Bat Signal',
            skillimage: 'https://i.imgur.com/czU1Ikq.png',
            skilldescription: 'Batman enters battle fully prepared. For the first 2 turns of the match, Batman is invulnerable to harmful effects. This protection ends immediately if Batman uses a skill or if a new harmful enemy skill affects him.',
            energy: [],
            target: '',
            damage: 0,
            cooldown: 0,
            classes: [
                'Passive',
                'Instant'
            ]
        },
                {
            id: 'batman-explosive-batarangs-empowered',
            name: 'Explosive Batarangs',
            hiddenFromSelectionViewer: true,
            skillimage: 'https://i.imgur.com/8EK9yEi.png',
            skilldescription: 'Batman hurls three explosive batarangs at one enemy, each hit dealing 5 damage and 3 affliction damage.',
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
                'Affliction'
            ],
            effects: [
                {
                    type: 'damage',
                    amount: 15,
                    scope: 'target'
                },
                {
                    type: 'damage',
                    amount: 9,
                    scope: 'target',
                    metadata: {
                        afflictionDamage: true,
                        ignoreDamageReduction: true,
                        ignoreDestructibleDefense: true
                    }
                }
            ]
        },
    ]
},
{
    id: 'the-flash-barry-allen',
    characterId: 'the-flash-barry-allen',
    name: 'The Flash (Barry Allen)',
    facePicture: 'https://i.imgur.com/X3TO0hk.png',
    characterdeescription: 'The Flash dominates the pace of battle through unmatched speed and relentless momentum. Rather than relying on raw durability, he overwhelms opponents by acting faster, striking repeatedly, and disrupting their ability to keep up. His abilities create rapid pressure windows, forcing enemies into reactive play while he dictates the flow of combat. With tools that accelerate his own actions and interfere with enemy timing, The Flash thrives in fast-paced encounters where every second matters. He can evade danger, reset momentum, and enable his team to act more efficiently, turning brief openings into decisive advantages.',
    skills: [
        {
            id: 'the-flash-barry-allen-infinite-mass-punch',
            name: 'Infinite Mass Punch',
            skillimage: 'https://i.imgur.com/vwUOYsd.png',
            skilldescription: 'Deals 40 piercing damage to one enemy. If The Flash has \'Speed Up\' this skill cannot be countered or reflected and ignores invulnerability.',
            energy: [
                'Taijutsu',
                'Bloodline'
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
                    amount: 40,
                    scope: 'target',
                    metadata: {
                        ignoreDamageReduction: true,
                    }
                }
            ]
        },
        {
            id: 'the-flash-barry-allen-lightning-rush',
            name: 'Lightning Rush',
            skillimage: 'https://i.imgur.com/ZlN4KC4.png',
            skilldescription: 'The Flash strikes one enemy 4 times in quick succession, dealing 5 damage each time. Each hit has a 25% chance to apply \'Shock\': dealing 3 piercing damage for 4 turns. The Flash gains \'Speed Up\' for 1 turn.',
            energy: [
                'Bloodline'
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
                    amount: 5,
                    scope: 'target'
                },
                {
                    type: 'damage',
                    amount: 5,
                    scope: 'target'
                },
                {
                    type: 'damage',
                    amount: 5,
                    scope: 'target'
                },
                {
                    type: 'damage',
                    amount: 5,
                    scope: 'target'
                },
                {
                    type: 'apply_status',
                    statusId: 'the_flash_barry_allen_shock',
                    duration: 4,
                    scope: 'target',
                    chance: 25,
                    metadata: {
                        harmful: true,
                        turnEndDamage: 3,
                        ignoreTargetDamageReduction: true,
                        ignoreTargetDestructibleDefense: true,
                        turnEndTrigger: 'source_turn',
                        turnDurationAnchor: 'source_turn',
                        mergeNumericAddKeys: ['turnEndDamage'],
                        tooltipTextTemplate: 'This character takes {turnEndDamage} piercing damage from Shock each turn.'
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'the_flash_barry_allen_shock',
                    duration: 4,
                    scope: 'target',
                    chance: 25,
                    metadata: {
                        harmful: true,
                        turnEndDamage: 3,
                        ignoreTargetDamageReduction: true,
                        ignoreTargetDestructibleDefense: true,
                        turnEndTrigger: 'source_turn',
                        turnDurationAnchor: 'source_turn',
                        mergeNumericAddKeys: ['turnEndDamage'],
                        tooltipTextTemplate: 'This character takes {turnEndDamage} piercing damage from Shock each turn.'
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'the_flash_barry_allen_shock',
                    duration: 4,
                    scope: 'target',
                    chance: 25,
                    metadata: {
                        harmful: true,
                        turnEndDamage: 3,
                        ignoreTargetDamageReduction: true,
                        ignoreTargetDestructibleDefense: true,
                        turnEndTrigger: 'source_turn',
                        turnDurationAnchor: 'source_turn',
                        mergeNumericAddKeys: ['turnEndDamage'],
                        tooltipTextTemplate: 'This character takes {turnEndDamage} piercing damage from Shock each turn.'
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'the_flash_barry_allen_shock',
                    duration: 4,
                    scope: 'target',
                    chance: 25,
                    metadata: {
                        harmful: true,
                        turnEndDamage: 3,
                        ignoreTargetDamageReduction: true,
                        ignoreTargetDestructibleDefense: true,
                        turnEndTrigger: 'source_turn',
                        turnDurationAnchor: 'source_turn',
                        mergeNumericAddKeys: ['turnEndDamage'],
                        tooltipTextTemplate: 'This character takes {turnEndDamage} piercing damage from Shock each turn.'
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'the_flash_barry_allen_speed_up',
                    duration: 1,
                    scope: 'self',
                    metadata: {
                        ownerTurnEndExtraCooldownTicksBySkillId: {
                            'the-flash-barry-allen-phase-shift': 1
                        },
                        skillReplacements: {
                            'the-flash-barry-allen-infinite-mass-punch': 'the-flash-barry-allen-infinite-mass-punch-speed-up'
                        },
                        tooltipText: 'The Flash is sped up. Infinite Mass Punch is improved and Phase Shift active cooldown is lowered by 1.'
                    }
                }
            ]
        },
        {
            id: 'the-flash-barry-allen-speed-steal',
            name: 'Speed Steal',
            skillimage: 'https://i.imgur.com/laG0u0X.png',
            skilldescription: 'For 2 turns, the enemy player only has 40 seconds to complete their turn and you are given 20 additional seconds to complete yours. The Flash gains \'Speed Up\' and this swaps to \'Flashpoint Surge\' while active.',
            energy: [
                'Random',
                'Random'
            ],
            target: 'self',
            damage: 0,
            cooldown: 4,
            classes: [
                'Energy',
                'Ranged',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'the_flash_barry_allen_speed_up',
                    duration: 2,
                    scope: 'self',
                    metadata: {
                        ownerTurnEndExtraCooldownTicksBySkillId: {
                            'the-flash-barry-allen-phase-shift': 1
                        },
                        skillReplacements: {
                            'the-flash-barry-allen-infinite-mass-punch': 'the-flash-barry-allen-infinite-mass-punch-speed-up'
                        },
                        tooltipText: 'The Flash is sped up. Infinite Mass Punch is improved and Phase Shift active cooldown is lowered by 1.'
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'the_flash_barry_allen_speed_steal_active',
                    duration: 2,
                    scope: 'self',
                    metadata: {
                        ownTurnDurationBonusMs: 20000,
                        enemyTurnDurationPenaltyMs: 20000,
                        skillReplacements: {
                            'the-flash-barry-allen-speed-steal': 'the-flash-barry-allen-flashpoint-surge'
                        },
                        tooltipText: 'For 2 turns, your turns last 20 additional seconds, enemy turns last 20 fewer seconds, and Speed Steal is replaced by Flashpoint Surge.'
                    }
                }
            ]
        },
        {
            id: 'the-flash-barry-allen-phase-shift',
            name: 'Phase Shift',
            skillimage: 'https://i.imgur.com/ovup1JS.png',
            skilldescription: 'The Flash removes all harmful skills and gains 100% evasion for 1 turn. If The Flash is \'Speed Up\', this skill\'s active cooldown is 1 turn less.',
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
                    type: 'cleanse_harmful',
                    count: 99,
                    scope: 'self'
                },
                {
                    type: 'apply_status',
                    statusId: 'the_flash_barry_allen_phase_shift',
                    duration: 1,
                    scope: 'self',
                    metadata: {
                        evadeChancePercent: 100,
                        tooltipText: 'The Flash has 100% evasion.'
                    }
                }
            ]
        },
        {
            id: 'the-flash-barry-allen-flashpoint-surge',
            name: 'Flashpoint Surge',
            useBaseSkillCooldown: true,
            skillimage: 'https://i.imgur.com/teE3m1U.png',
            skilldescription: 'The Flash resets his team\'s cooldowns and heals them 25 HP. This skill ignores invulnerability.',
            energy: [
                'Bloodline',
                'Random',
                'Random'
            ],
            target: 'all-allies',
            damage: 0,
            cooldown: 4,
            classes: [
                'Physical',
                'Melee',
                'Instant'
            ],
            effects: [
                {
                    type: 'modify_cooldowns',
                    operation: 'set',
                    amount: 0,
                    includeAllCharacterSkills: true,
                    scope: 'all-allies',
                    ignoreHelpfulInvulnerability: true
                },
                {
                    type: 'heal',
                    amount: 25,
                    scope: 'all-allies',
                    metadata: {
                        ignoreHelpfulInvulnerability: true
                    }
                }
            ]
        },
        {
            id: 'the-flash-barry-allen-infinite-mass-punch-speed-up',
            name: 'Infinite Mass Punch',
            hiddenFromSelectionViewer: true,
            useBaseSkillCooldown: true,
            cannotBeCountered: true,
            cannotBeReflected: true,
            ignoreInvulnerability: true,
            skillimage: 'https://i.imgur.com/vwUOYsd.png',
            skilldescription: 'Deals 40 piercing damage to one enemy. This skill cannot be countered or reflected and ignores invulnerability while Speed Up is active.',
            energy: [
                'Taijutsu',
                'Bloodline'
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
                    amount: 40,
                    scope: 'target',
                    metadata: {
                        ignoreDamageReduction: true,
                    }
                }
            ]
        },
    ]
},
    {
    id: 'aquaman',
    characterId: 'aquaman',
    name: 'Aquaman',
    facePicture: 'https://i.imgur.com/lUWpCxK.png',
    characterdeescription: 'Ruler of Atlantis and master of the oceans, Aquaman dominates the battlefield through relentless pressure and crushing tidal control. Wielding his legendary trident, he marks enemies for punishment, drags them beneath the waves, and unleashes swarms of sea creatures to finish them off. Whether shielding himself with rushing currents or drowning foes in mounting afflictions, Aquaman excels at overwhelming teams that rely on defense or invulnerability.',
    skills: [
        {
            id: 'aquaman-trident-strike',
            name: 'Trident Strike',
            skillimage: 'https://i.imgur.com/jWzBCve.png',
            skilldescription: 'Aquaman strikes one enemy with his trident, dealing 17 piercing damage and marking them for 1 turn. If used on a marked enemy, Aquaman also stuns their helpful skills for 1 turn.',
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
                    amount: 17,
                    scope: 'target',
                    metadata: {
                        ignoreDamageReduction: true,
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'aquaman_trident_strike_helpful_stun',
                    duration: 1,
                    scope: 'target',
                    condition: {
                        statusId: 'aquaman_trident_strike_mark',
                        scope: 'target'
                    },
                    metadata: {
                        harmful: true,
                        cannotUseHelpfulSkills: true,
                        tooltipText: 'This character helpful skills are stunned.'
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'aquaman_trident_strike_mark',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        tooltipText: 'This character is marked by Trident Strike.'
                    }
                }
            ]
        },
        {
            id: 'aquaman-drown',
            name: 'Drown',
            skillimage: 'https://i.imgur.com/OnxjSgd.png',
            skilldescription: 'Aquaman forces one enemy\'s head underwater, removing 1 random energy from them and dealing 15 affliction damage. If they are marked by \'Trident Strike\', they are given a stack of \'Sea Sharks\'.',
            energy: [
                'Ninjutsu'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 1,
            classes: [
                'Physical',
                'Melee',
                'Instant',
                'Affliction'
            ],
            effects: [
                {
                    type: 'remove_random_chakra',
                    amount: 1,
                    scope: 'target'
                },
                {
                    type: 'damage',
                    amount: 15,
                    scope: 'target',
                    metadata: {
                        afflictionDamage: true,
                        ignoreDamageReduction: true,
                        ignoreDestructibleDefense: true
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'aquaman_sea_sharks',
                    duration: 99,
                    scope: 'target',
                    condition: {
                        statusId: 'aquaman_trident_strike_mark',
                        scope: 'target'
                    },
                    metadata: {
                        harmful: true,
                        infiniteDuration: true,
                        turnEndDamage: 5,
                        ignoreTargetDamageReduction: true,
                        turnEndTrigger: 'source_turn',
                        turnDurationAnchor: 'source_turn',
                        triggerOnApply: true,
                        mergeNumericAddKeys: ['turnEndDamage'],
                        tooltipTextTemplate: 'This character takes {turnEndDamage} piercing damage each turn from Sea Sharks.'
                    }
                }
            ]
        },
        {
            id: 'aquaman-tidal-wave',
            name: 'Tidal Wave',
            skillimage: 'https://i.imgur.com/VepAJ8X.png',
            skilldescription: 'Aquaman makes the enemy team unable to reduce damage or become invulnerable and increases their cooldowns by 1 for 2 turns. When this skill ends, they have their harmful skills stunned for 1 turn and are granted a stack of \'Sea Sharks\'. If an enemy is marked by \'Trident Strike\' at the end of the second turn, they take 30 damage.',
            energy: [
                'Ninjutsu',
                'Ninjutsu'
            ],
            target: 'all-enemy',
            damage: 0,
            cooldown: 3,
            classes: [
                'Physical',
                'Ranged',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'aquaman_tidal_wave',
                    duration: 2,
                    scope: 'all-enemy',
                    metadata: {
                        harmful: true,
                        cannotReduceDamage: true,
                        cannotBecomeInvulnerable: true,
                        usedSkillCooldownPenalty: 1,
                        onExpireEffects: [
                            {
                                type: 'apply_status',
                                statusId: 'aquaman_tidal_wave_harmful_stun',
                                duration: 1,
                                metadata: {
                                    harmful: true,
                                    cannotUseHarmfulSkills: true,
                                    tooltipText: 'This character harmful skills are stunned.'
                                }
                            },
                            {
                                type: 'apply_status',
                                statusId: 'aquaman_sea_sharks',
                                duration: 99,
                                metadata: {
                                    harmful: true,
                                    infiniteDuration: true,
                                    turnEndDamage: 5,
                                    ignoreTargetDamageReduction: true,
                                    turnEndTrigger: 'source_turn',
                                    turnDurationAnchor: 'source_turn',
                                    triggerOnApply: true,
                                    mergeNumericAddKeys: ['turnEndDamage'],
                                    tooltipTextTemplate: 'This character takes {turnEndDamage} piercing damage each turn from Sea Sharks.'
                                }
                            },
                            {
                                type: 'damage',
                                amount: 30,
                                condition: {
                                    statusId: 'aquaman_trident_strike_mark',
                                    scope: 'target'
                                }
                            }
                        ],
                        tooltipText: 'This character cannot reduce damage or become invulnerable and the skills they use have their cooldown increased by 1 turn. When this skill ends, this character will be stunned for 1 turn'
                    }
                }
            ]
        },
        {
            id: 'aquaman-water-jet',
            name: 'Water Jet',
            skillimage: 'https://i.imgur.com/DEowat1.png',
            skilldescription: 'This skill makes Aquaman invulnerable for 1 turn and grants all enemies a stack of \'Sea Sharks\'.',
            energy: [
                'Random'
            ],
            target: 'self',
            damage: 0,
            cooldown: 4,
            classes: [
                'Physical',
                'Ranged',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'aquaman_water_jet_invulnerable',
                    duration: 1,
                    scope: 'self',
                    metadata: {
                        invulnerable: true,
                        tooltipText: 'This character is invulnerable.'
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'aquaman_sea_sharks',
                    duration: 99,
                    scope: 'all-enemy',
                    metadata: {
                        harmful: true,
                        infiniteDuration: true,
                        turnEndDamage: 5,
                        ignoreTargetDamageReduction: true,
                        turnEndTrigger: 'source_turn',
                        turnDurationAnchor: 'source_turn',
                        triggerOnApply: true,
                        mergeNumericAddKeys: ['turnEndDamage'],
                        tooltipTextTemplate: 'This character takes {turnEndDamage} piercing damage each turn from Sea Sharks.'
                    }
                }
            ]
        },
        {
            id: 'aquaman-sea-sharks',
            name: 'Sea Sharks',
            hiddenFromSelectionViewer: true,
            skillimage: 'https://i.imgur.com/TYkjQdu.png',
            skilldescription: 'Deals 5 piercing damage permanently (stacks).',
            energy: [],
            target: '',
            damage: 0,
            cooldown: 0,
            classes: [
                'Physical',
                'Ranged',
                'Instant'
            ]
        }
    ]
},
    {
    id: 'storm',
    characterId: 'storm',
    name: 'Storm',
    facePicture: 'https://i.imgur.com/5v5AXWu.png',
    characterdeescription: 'Storm is a support-controller who heals allies over time, removes harmful effects, and disrupts enemy actions. Her abilities reward smart timing and positioning, allowing her to sustain her team while limiting enemy options.',
    skills: [
        {
            id: 'storm-lightning-strike',
            name: 'Lightning Strike',
            skillimage: 'https://i.imgur.com/cIQ7sTM.png',
            skilldescription: 'Storm calls down lightning, dealing 30 piercing damage to one enemy and fully stunning them for 1 turn. If \'Rainstorm\' is active, this also deals 10 piercing damage to all other enemies and ignores invulnerability.',
            energy: [
                'ninjutsu',
                'random'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 1,
            classes: [
                'Energy',
                'Ranged',
                'Instant'
            ],
            effects: [
                {
                    type: 'damage',
                    amount: 30,
                    scope: 'target',
                    metadata: {
                        ignoreDamageReduction: true,
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'stunned',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        cannotUseSkills: true,
                        tooltipText: 'This character is stunned.'
                    }
                }
            ]
        },
        {
            id: 'storm-wind-funnel',
            name: 'Wind Funnel',
            skillimage: 'https://i.imgur.com/L0Yu0B4.png',
            skilldescription: 'Storm targets an ally or herself, removing all active enemy effects from them. If \'Rainstorm\' is active, one random enemy has their skills silenced for 1 turn.',
            energy: [
                'genjutsu'
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
                    type: 'cleanse_statuses',
                    count: 0,
                    harmfulOnly: true,
                    sourceRelation: 'enemy',
                    scope: 'target'
                }
            ]
        },
        {
            id: 'storm-rainstorm',
            name: 'Rainstorm',
            skillimage: 'https://i.imgur.com/xB6A34j.png',
            skilldescription: 'Storm heals her entire team for 12 HP per turn for 4 turns. While active, this becomes \'Hailstorm\' and Storm\'s skills are improved. This skill ignores invulnerability.',
            energy: [
                'random',
                'random'
            ],
            target: 'all-allies',
            damage: 0,
            cooldown: 4,
            classes: [
                'Energy',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'storm_rainstorm_active',
                    duration: 4,
                    scope: 'self',
                    metadata: {
                        skillReplacements: {
                            'storm-rainstorm': 'storm-hailstorm',
                            'storm-lightning-strike': 'storm-lightning-strike-rainstorm',
                            'storm-wind-funnel': 'storm-wind-funnel-rainstorm'
                        },
                        tooltipText: ' This skill is now Hailstorm and storm\'s skills are improved'
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'storm_rainstorm_heal',
                    duration: 4,
                    scope: 'all-allies',
                    metadata: {
                        turnEndHealFlat: 12,
                        tooltipText: 'This character will heal 12 health each turn.'
                    },
                    ignoreHelpfulInvulnerability: true
                }
            ]
        },
        {
            id: 'storm-ice-barrier',
            name: 'Ice Barrier',
            skillimage: 'https://i.imgur.com/fsSRHNk.png',
            skilldescription: 'Storm targets herself or one ally, countering the first enemy skill used on them for 1 turn. If triggered, the ally gains 15 points of permanent destructible defense. This skill is invisible until triggered.',
            energy: [
                'random'
            ],
            target: 'self-or-single-ally',
            damage: 0,
            cooldown: 3,
            classes: [
                'Energy',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'storm_ice_barrier_guard',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        triggerOnEnemyHarmfulSkill: true,
                        counterCancelsSkill: true,
                        counterStatusId: 'storm_ice_barrier_countered',
                        counterStatusDuration: 1,
                        counterStatusMetadata: {
                            harmful: true,
                            tooltipText: 'This character was countered by Ice Barrier.'
                        },
                        turnDurationAnchor: 'source_turn',
                        onExpireApplyStatusToSelf: {
                            statusId: 'storm_ice_barrier_used',
                            duration: 1,
                            metadata: {
                                tooltipText: 'This skill has been used.'
                            }
                        },
                        usedStatusId: 'storm_ice_barrier_used',
                        usedStatusDuration: 1,
                        usedStatusMetadata: {
                            tooltipText: 'This skill has been used.'
                        },
                        counterApplyStatusToSourceOwner: {
                            statusId: 'storm_ice_barrier_defense',
                            duration: 99,
                            metadata: {
                                destructibleDefensePoints: 15,
                                mergeNumericAddKeys: ['destructibleDefensePoints'],
                                tooltipTextTemplate: 'This character has {destructibleDefensePoints} destructible defense.'
                            }
                        },
                        hideTooltipFromEnemy: true,
                        tooltipText: 'The next enemy harmful skill used on this character this turn is countered. If triggered, this character gains 15 permanent destructible defense.'
                    }
                }
            ]
        },
        {
            id: 'storm-hailstorm',
            name: 'Hailstorm',
            hiddenFromSelectionViewer: true,
            skillimage: 'https://i.imgur.com/HPsujWh.png',
            skilldescription: 'For 4 turns, all enemies take 8 damage per turn. On turn 2 of this skill, their harmful skills are stunned for 1 turn. On turn 4 of this skill, their helpful skills are stunned for 1 turn. This skill ignores invulnerability.',
            energy: [
                'ninjutsu',
                'genjutsu'
            ],
            target: 'all-enemy',
            damage: 0,
            cooldown: 4,
            classes: [
                'Energy',
                'Ranged',
                'Instant'
            ],
            ignoreInvulnerability: true,
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'storm_hailstorm_damage',
                    duration: 4,
                    scope: 'all-enemy',
                    metadata: {
                        harmful: true,
                        turnEndDamage: 8,
                        turnEndTrigger: 'source_turn',
                        turnDurationAnchor: 'source_turn',
                        tooltipText: 'This character takes 8 damage at the end of each of Storm\'s turns.'
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'storm_hailstorm_harmful_delay',
                    duration: 2,
                    scope: 'all-enemy',
                    metadata: {
                        harmful: true,
                        turnDurationAnchor: 'source_turn',
                        hideTooltip: true,
                        onExpireApplyStatusToSelf: {
                            statusId: 'storm_hailstorm_harmful_stun',
                            duration: 1,
                            metadata: {
                                harmful: true,
                                cannotUseHarmfulSkills: true,
                                tooltipText: 'This character harmful skills are stunned.'
                            }
                        }
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'storm_hailstorm_helpful_delay',
                    duration: 4,
                    scope: 'all-enemy',
                    metadata: {
                        harmful: true,
                        turnDurationAnchor: 'source_turn',
                        hideTooltip: true,
                        onExpireApplyStatusToSelf: {
                            statusId: 'storm_hailstorm_helpful_stun',
                            duration: 1,
                            metadata: {
                                harmful: true,
                                cannotUseHelpfulSkills: true,
                                tooltipText: 'This character helpful skills are stunned.'
                            }
                        }
                    }
                }
            ]
        },
        {
            id: 'storm-lightning-strike-rainstorm',
            name: 'Lightning Strike',
            hiddenFromSelectionViewer: true,
            useBaseSkillCooldown: true,
            skillimage: 'https://i.imgur.com/cIQ7sTM.png',
            skilldescription: 'Storm calls down lightning, dealing 30 piercing damage to one enemy and fully stunning them for 1 turn. This also deals 10 piercing damage to all other enemies and ignores invulnerability.',
            energy: [
                'ninjutsu',
                'random'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 1,
            classes: [
                'Energy',
                'Ranged',
                'Instant'
            ],
            ignoreInvulnerability: true,
            effects: [
                {
                    type: 'damage',
                    amount: 30,
                    scope: 'target',
                    metadata: {
                        ignoreDamageReduction: true,
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'stunned',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        cannotUseSkills: true,
                        tooltipText: 'This character is stunned.'
                    }
                },
                {
                    type: 'damage',
                    amount: 10,
                    scope: 'other-enemies',
                    metadata: {
                        ignoreDamageReduction: true,
                    }
                }
            ]
        },
        {
            id: 'storm-wind-funnel-rainstorm',
            name: 'Wind Funnel',
            hiddenFromSelectionViewer: true,
            useBaseSkillCooldown: true,
            skillimage: 'https://i.imgur.com/L0Yu0B4.png',
            skilldescription: 'Storm targets herself or one ally, removing all active enemy effects from them. One random enemy then has all their skills silenced for 1 turn.',
            energy: [
                'genjutsu'
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
                    type: 'cleanse_statuses',
                    count: 0,
                    harmfulOnly: true,
                    sourceRelation: 'enemy',
                    scope: 'target'
                },
                {
                    type: 'apply_status',
                    statusId: 'storm_wind_funnel_silence',
                    duration: 1,
                    scope: 'random-enemy',
                    metadata: {
                        harmful: true,
                        silenceNonDamageEffects: true,
                        tooltipText: 'Silenced: only damage from this character\'s skills will work.'
                    }
                }
            ]
        }
    ]
},
    {
    id: 'venom',
    characterId: 'venom',
    name: 'Venom',
    facePicture: 'https://i.imgur.com/T7RpFwn.png',
    characterdeescription: 'Venom excels as a self-sustaining bruiser who draws aggression, disrupts enemies, and converts his own survival into team advantage. He thrives in the chaos of focus fire, feeding on damage to keep himself standing while forcing enemies to deal with him. His presence is oppressive but calculated—taunting teams into attacking him, isolating threats with precise control, and sustaining through relentless lifesteal. When the tide turns or his body begins to fail, Venom becomes something even more dangerous, sacrificing himself to empower an ally with overwhelming defense and energy. Whether anchoring the front line or enabling a decisive swing, he ensures that ignoring him is never an option—and killing him may be even worse.',
    skills: [
        {
            id: 'venom-ravenous-bite',
            name: 'Ravenous Bite',
            skillimage: 'https://i.imgur.com/tjeIQ9D.png',
            skilldescription: 'Deals 30 damage to one enemy. Venom heals 20 HP.',
            energy: [
                'Taijutsu',
                'Random'
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
                    amount: 30,
                    scope: 'target'
                },
                {
                    type: 'heal',
                    amount: 20,
                    scope: 'self'
                }
            ]
        },
        {
            id: 'venom-pulling-tendrils',
            name: 'Pulling Tendrils',
            skillimage: 'https://i.imgur.com/MWVKUSL.png',
            skilldescription: 'Venom taunts the enemy team for 1 turn. Next turn, \'Ravenous Bite\' heals 15 more health.',
            energy: [
                'Random',
                'Random'
            ],
            target: 'all-enemy',
            damage: 0,
            cooldown: 1,
            classes: [
                'Physical',
                'Ranged',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'venom_pulling_tendrils_taunt',
                    duration: 1,
                    scope: 'all-enemy',
                    metadata: {
                        harmful: true,
                        taunt: true,
                        turnDurationAnchor: 'source_turn',
                        tooltipText: 'This character is taunted and can only target Venom.'
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'venom_pulling_tendrils_bite_buff',
                    duration: 1,
                    scope: 'self',
                    metadata: {
                        turnDurationAnchor: 'source_turn',
                        skillReplacements: {
                            'venom-ravenous-bite': 'venom-ravenous-bite-empowered'
                        },
                        tooltipText: 'Ravenous Bite now deals 30 damage to one enemy and heals Venom for 35 HP.'
                    }
                }
            ]
        },
        {
            id: 'venom-venom-web-wrap',
            name: 'Venom Web Wrap',
            skillimage: 'https://i.imgur.com/aFSulnK.png',
            skilldescription: 'Venom stuns one enemy\'s non-affliction skills for 2 turns. If the target recieves new damage, this skill will end.',
            energy: [
                'Bloodline'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 3,
            classes: [
                'Physical',
                'Ranged',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'venom_web_wrap_lock',
                    duration: 2,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        cannotUseSkillClasses: [
                            'physical',
                            'chakra',
                            'mental',
                            'energy'
                        ],
                        removeStatusIdsOnNewDamage: [
                            'venom_web_wrap_lock'
                        ],
                        tooltipText: 'This character non-affliction skills are stunned. This effect ends if they take new damage.'
                    }
                }
            ]
        },
        {
            id: 'venom-ally-symbiosis',
            name: 'Ally Symbiosis',
            skillimage: 'https://i.imgur.com/VnKHJsU.png',
            skilldescription: 'Venom dies and grants one ally permanent destructible defense equal to his current HP. While the ally has that destructible defense, they gain 1 additional random energy each turn. This may only be used if Venom is at 50 HP or below.',
            energy: [
                'Random'
            ],
            target: 'single-ally',
            damage: 0,
            cooldown: 0,
            actorCondition: {
                sourceCurrentHpAtMost: 50
            },
            classes: [
                'Physical',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'venom_ally_symbiosis_transfer',
                    duration: 99,
                    scope: 'target',
                    metadata: {
                        copySourceCurrentHpToKeys: ['destructibleDefensePoints'],
                        destructibleDefensePoints: 0,
                        additionalRandomChakraPerTurn: 1,
                        tooltipTextTemplate: 'This character has {destructibleDefensePoints} destructible defense and gains 1 additional random chakra each turn.'
                    }
                },
                {
                    type: 'HealthLoss',
                    amount: 0,
                    scope: 'self',
                    metadata: {
                        amountFromSourceCurrentHp: true
                    }
                }
            ]
        },
        {
            id: 'venom-passive-symbiote-vigor',
            name: 'Passive: Symbiote Vigor',
            skillimage: 'https://i.imgur.com/AuGDgXi.png',
            skilldescription: 'Venom has 10% damage reduction while above 50 HP.',
            energy: [],
            target: '',
            damage: 0,
            cooldown: 0,
            classes: [
                'Passive',
                'Instant'
            ]
        },
        {
            id: 'venom-ravenous-bite-empowered',
            name: 'Ravenous Bite',
            hiddenFromSelectionViewer: true,
            useBaseSkillCooldown: true,
            skillimage: 'https://i.imgur.com/tjeIQ9D.png',
            skilldescription: 'Deals 30 damage to one enemy. Venom heals 35 HP.',
            energy: [
                'Taijutsu',
                'Random'
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
                    amount: 30,
                    scope: 'target'
                },
                {
                    type: 'heal',
                    amount: 35,
                    scope: 'self'
                }
            ]
        }
    ],
    startStatuses: [
        {
            statusId: 'venom_passive_symbiote_vigor',
            sourceSkillId: 'venom-passive-symbiote-vigor',
            duration: 99,
            metadata: {
                infiniteDuration: true,
                activeWhileOwnerCurrentHpAtLeast: 51,
                damageReductionPercent: 10,
                tooltipText: 'While above 50 HP, Venom has 10% damage reduction.'
            }
        }
    ]
},
    {
    id: 'the-joker',
    characterId: 'the-joker',
    name: 'The Joker',
    facePicture: 'https://i.imgur.com/DSEdkUO.png',
    characterdeescription: 'The Joker specializes in destabilizing enemies through unpredictable traps, afflictions, and psychological pressure. Rather than overwhelming opponents with raw damage, he punishes decision-making itself—forcing enemies into lose-lose situations where every action carries risk. By planting hidden threats and disrupting key abilities, The Joker excels at dismantling coordinated strategies and isolating high-value targets. His toxins weaken offensive output over time, while his gadgets interrupt, silence, and invalidate enemy actions at critical moments. The longer a fight drags on, the more control he exerts, turning chaos into a weapon and forcing opponents to play on his terms.',
    skills: [
        {
            id: 'the-joker-hand-buzzer',
            name: 'Hand Buzzer',
            skillimage: 'https://i.imgur.com/t0AM8jf.png',
            skilldescription: 'Deals 1 piercing damage to one enemy and stuns their harmful skills for 1 turn. Swaps to \'Acid Flower\'.',
            energy: [],
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
                    amount: 1,
                    scope: 'target',
                    metadata: {
                        ignoreDamageReduction: true,
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'the_joker_hand_buzzer_lock',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        cannotUseHarmfulSkills: true,
                        tooltipText: 'This character harmful skills are stunned.'
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'the_joker_gag_cycle',
                    duration: 99,
                    scope: 'self',
                    metadata: {
                        skillReplacements: {
                            'the-joker-hand-buzzer': 'the-joker-acid-flower'
                        },
                        tooltipText: 'Hand Buzzer is replaced by Acid Flower.'
                    }
                }
            ]
        },
        {
            id: 'the-joker-crowbar',
            name: 'Crowbar',
            skillimage: 'https://i.imgur.com/EloJhie.png',
            skilldescription: 'For 2 turns, destroy one enemy\'s destructible defense each turn and deal 15 damage to them each turn.',
            energy: [
                'Random',
                'Random'
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
                    statusId: 'the_joker_crowbar_mauling',
                    duration: 2,
                    scope: 'target',
                    metadata: {
                        turnEndDestroyDestructibleDefense: true,
                        harmful: true,
                        turnEndDamage: 15,
                        turnEndTrigger: 'source_turn',
                        turnDurationAnchor: 'source_turn',
                        tooltipText: 'This character recieves 15 damage and all of their destructible defense is destroyed each turn.'
                    }
                }
            ]
        },
        {
            id: 'the-joker-joker-venom',
            name: 'Joker Venom',
            skillimage: 'https://i.imgur.com/MZgtCyw.png',
            skilldescription: 'For 3 turns, one enemy has their maximum damage output capped to 15 and is dealt 10 affliction damage each turn.',
            energy: [
                'Taijutsu',
                'Taijutsu'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 3,
            classes: [
                'Physical',
                'Melee',
                'Instant',
                'Affliction'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'the_joker_joker_venom',
                    duration: 3,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        maxDamageOutput: 15,
                        turnEndDamage: 10,
                        afflictionDamage: true,
                        ignoreTargetDamageReduction: true,
                        ignoreTargetDestructibleDefense: true,
                        turnEndTrigger: 'source_turn',
                        turnDurationAnchor: 'source_turn',
                        tooltipText: 'This character\'s damage is capped to 15 and they recieve 10 affliction damage each turn.'
                    }
                }
            ]
        },
        {
            id: 'the-joker-bang',
            name: 'BANG!',
            skillimage: 'https://i.imgur.com/O3C7ZSC.png',
            skilldescription: 'This skill makes The Joker invulnerable for 1 turn. When this ends, one enemy is dealt 15 piercing damage.',
            energy: [
                'Random'
            ],
            target: 'self',
            damage: 0,
            cooldown: 4,
            classes: [
                'Physical',
                'Ranged',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'the_joker_bang_invulnerable',
                    duration: 1,
                    scope: 'self',
                    metadata: {
                        invulnerable: true,
                        tooltipText: 'This character is invulnerable.'
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'the_joker_bang_followup',
                    duration: 1,
                    scope: 'self',
                    metadata: {
                        triggerOnApply: true,
                        turnEndTrigger: 'source_turn',
                        turnDurationAnchor: 'source_turn',
                        turnEndRandomEnemyDamage: 15,
                        turnEndRandomEnemyIgnoreDamageReduction: true,
                        turnEndRandomEnemyIgnoreDestructibleDefense: true,
                        tooltipText: 'When this skill ends, a random enemy recieves 15 piercing damage.'
                    }
                }
            ]
        },
        {
            id: 'the-joker-acid-flower',
            name: 'Acid Flower',
            hiddenFromSelectionViewer: true,
            useBaseSkillCooldown: true,
            skillimage: 'https://i.imgur.com/GIOcMgw.png',
            skilldescription: 'Deals 5 affliction damage to one enemy permanently. For 1 turn, the target has their helpful skills stunned. Swaps to \'Chattering Teeth\'.',
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
                'Affliction'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'the_joker_acid_flower_burn',
                    duration: 99,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        infiniteDuration: true,
                        mergeNumericAddKeys: [
                            'turnEndDamage'
                        ],
                        turnEndDamage: 5,
                        afflictionDamage: true,
                        ignoreTargetDamageReduction: true,
                        ignoreTargetDestructibleDefense: true,
                        turnEndTrigger: 'source_turn',
                        tooltipTextTemplate: 'This character takes {turnEndDamage} permanent affliction damage each turn.'
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'the_joker_acid_flower_helpful_lock',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        cannotUseHelpfulSkills: true,
                        tooltipText: 'This character helpful skills are stunned.'
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'the_joker_gag_cycle',
                    duration: 99,
                    scope: 'self',
                    metadata: {
                        skillReplacements: {
                            'the-joker-hand-buzzer': 'the-joker-chattering-teeth'
                        },
                        tooltipText: 'Hand Buzzer is replaced by Chattering Teeth.'
                    }
                }
            ]
        },
        {
            id: 'the-joker-chattering-teeth',
            name: 'Chattering Teeth',
            hiddenFromSelectionViewer: true,
            useBaseSkillCooldown: true,
            skillimage: 'https://i.imgur.com/vh7qbuR.png',
            skilldescription: 'Targets one enemy for 1 turn, countering them if they use a new harmful skill. If successful, silence their harmful skills for 2 turns. This is invisible. Swaps to \'Remote Bomb\'.',
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
                    type: 'apply_status',
                    statusId: 'the_joker_chattering_teeth_trap',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        triggerOnEnemyHarmfulSkill: true,
                        counterCancelsSkill: true,
                        counterStatusId: 'the_joker_chattering_teeth_silence',
                        counterStatusDuration: 2,
                        counterStatusMetadata: {
                            harmful: true,
                            cannotUseHarmfulSkills: true,
                            tooltipText: 'This character harmful skills are silenced.'
                        },
                        hideTooltipFromEnemy: true,
                        tooltipText: 'If this character uses a new harmful skill this turn, it is countered and their harmful skills are silenced for 2 turns.'
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'the_joker_gag_cycle',
                    duration: 99,
                    scope: 'self',
                    metadata: {
                        skillReplacements: {
                            'the-joker-hand-buzzer': 'the-joker-remote-bomb'
                        },
                        tooltipText: 'Hand Buzzer is replaced by Remote Bombs.'
                    }
                }
            ]
        },
        {
            id: 'the-joker-remote-bomb',
            name: 'Remote Bomb',
            hiddenFromSelectionViewer: true,
            useBaseSkillCooldown: true,
            skillimage: 'https://i.imgur.com/gA4KqdI.png',
            skilldescription: 'Marks one enemy for 1 turn. When this ends, they are dealt 20 affliction damage and have their active harmful skills cancelled. Swaps to \'Hand Buzzer\'.',
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
                'Affliction'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'the_joker_remote_bomb_mark',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        turnDurationAnchor: 'source_turn',
                        onExpireEffects: [
                            {
                                type: 'damage',
                                amount: 20,
                                metadata: {
                                    afflictionDamage: true,
                                    ignoreDamageReduction: true,
                                    ignoreDestructibleDefense: true
                                }
                            },
                            {
                                type: 'cleanse_statuses',
                                count: 0,
                                harmfulOnly: true,
                                sourceRelation: 'ally'
                            }
                        ],
                        tooltipText: 'When this effect ends, this character recieves 20 affliction damage and their active harmful effects are cancelled.'
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'the_joker_gag_cycle',
                    duration: 99,
                    scope: 'self',
                    metadata: {
                        hideTooltipFromEnemy: true,
                        skillReplacements: {
                            'the-joker-hand-buzzer': 'the-joker-hand-buzzer'
                        },
                        tooltipText: 'Hand Buzzer is restored. It deals 1 piercing damage to one enemy and stuns their harmful skills for 1 turn.'
                    }
                }
            ]
        }
    ]
},
    {
    id: 'negan',
    characterId: 'negan',
    name: 'Negan',
    facePicture: 'https://i.imgur.com/csZvbwl.png',
    characterdeescription: 'Negan excels at isolating and eliminating priority targets through relentless, no-nonsense pressure. He doesn’t overwhelm enemies with flashy bursts—he breaks them down, step by step, until they’re completely screwed and out of options. With abilities that apply sustained damage and shut down healing, Negan forces opponents into dangerous territory fast. Once a target is marked, they’re on borrowed time—and if they don’t deal with him quickly, they’re as good as dead. Negan thrives on punishing mistakes. One bad move, one wrong target, one moment of hesitation—and he’ll capitalize immediately, ending the fight before the enemy team can recover.',
    skills: [
        {
            id: 'negan-you-re-already-fucked',
            name: 'You\'re Already Fucked',
            skillimage: 'https://i.imgur.com/xlCXPVg.png',
            skilldescription: 'Negan strikes an enemy with Lucille, dealing 25 normal damage and 5 piercing damage to them. Negan heals 5 HP. This deals 5 additional damage to the target of \'You Got No Guts\'.',
            energy: [
                'Random',
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
                    scope: 'target'
                },
                {
                    type: 'damage',
                    amount: 5,
                    scope: 'target',
                    metadata: {
                        ignoreDamageReduction: true,
                    }
                },
                {
                    type: 'heal',
                    amount: 5,
                    scope: 'self'
                },
                {
                    type: 'damage',
                    amount: 0,
                    scope: 'target',
                    condition: {
                        statusId: 'negan_you_got_no_guts',
                        scope: 'target',
                        conditionalAmount: 5
                    }
                }
            ]
        },
        {
            id: 'negan-you-got-no-guts',
            name: 'You Got No Guts',
            skillimage: 'https://i.imgur.com/VoLDAm3.png',
            skilldescription: 'Negan cuts open an enemy\'s bowels, dealing 5 piercing damage permanently. While affected, if the target\'s HP falls to 15 or less they are executed. This may only affect one enemy at a time and will remove itself from the previous if used on a new one.',
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
                    type: 'apply_status',
                    statusId: 'negan_you_got_no_guts',
                    duration: 99,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        infiniteDuration: true,
                        uniqueEnemyMarkFromSource: true,
                        turnEndDamage: 5,
                        ignoreTargetDamageReduction: true,
                        ignoreTargetDestructibleDefense: true,
                        turnEndTrigger: 'source_turn',
                        executeBelowHpThreshold: 15,
                        bonusDamageFromSourceCharacterId: 'negan',
                        bonusDamageFromSourceSkillsFlat: 5,
                        tooltipText: 'This character takes 5 piercing damage and will recieve 5 additional damage by Negan\'s skills, and is executed if their HP falls to 15 or below.'
                    }
                }
            ]
        },
        {
            id: 'negan-the-iron',
            name: 'The Iron',
            skillimage: 'https://i.imgur.com/vgyp2m8.png',
            skilldescription: 'Deals 25 affliction damage to one enemy and makes them unable to be healed for 4 turns.',
            energy: [
                'Random'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 4,
            classes: [
                'Physical',
                'Melee',
                'Instant',
                'Affliction'
            ],
            effects: [
                {
                    type: 'damage',
                    amount: 25,
                    scope: 'target',
                    metadata: {
                        afflictionDamage: true,
                        ignoreDamageReduction: true,
                        ignoreDestructibleDefense: true
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'negan_the_iron_lock',
                    duration: 4,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        healReceivedMultiplier: 0,
                        tooltipText: 'This character cannot be healed.'
                    }
                }
            ]
        },
        {
            id: 'negan-bat-smashes-knives',
            name: 'Bat Smashes Knives',
            skillimage: 'https://i.imgur.com/1aqHgid.png',
            skilldescription: 'This skill makes Negan invulnerable for 1 turn.',
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
                    statusId: 'negan_bat_smashes_knives_invulnerable',
                    duration: 1,
                    scope: 'self',
                    metadata: {
                        invulnerable: true,
                        tooltipText: 'This character is invulnerable.'
                    }
                }
            ]
        },
        {
            id: 'negan-passive-tainted-weapons',
            name: 'Passive: Tainted Weapons',
            skillimage: 'https://i.imgur.com/lIF0QtB.png',
            skilldescription: 'While Negan is alive, all physical-class damage him and his team deal will also apply this skill to their target (stacks). Deals 1 affliction damage permanently.',
            energy: [],
            target: '',
            damage: 0,
            cooldown: 0,
            classes: [
                'Passive',
                'Instant'
            ]
        }
    ],
    startStatuses: [
        {
            statusId: 'negan_passive_tainted_weapons',
            sourceSkillId: 'negan-passive-tainted-weapons',
            duration: 99,
            metadata: {
                infiniteDuration: true,
                onTeamMemberSuccessfulDamageSkillClassesAny: [
                    'physical'
                ],
                onTeamMemberSuccessfulDamageApplyStatusToTarget: {
                    statusId: 'negan_tainted_weapons_poison',
                    duration: 99,
                    metadata: {
                        harmful: true,
                        infiniteDuration: true,
                        mergeNumericAddKeys: [
                            'turnEndDamage'
                        ],
                        turnEndDamage: 1,
                        afflictionDamage: true,
                        ignoreTargetDamageReduction: true,
                        ignoreTargetDestructibleDefense: true,
                        turnEndTrigger: 'source_turn',
                        tooltipTextTemplate: 'This character takes {turnEndDamage} permanent affliction damage each turn.'
                    }
                },
                tooltipText: 'While Negan is alive, all physical-class damage his team deals also applies 1 permanent affliction damage to the target.'
            }
        }
    ]
},
    {
    id: 'rick-grimes',
    characterId: 'rick-grimes',
    name: 'Rick Grimes',
    facePicture: 'https://i.imgur.com/4p90X9r.png',
    characterdeescription: 'A hardened survivor from a world overrun by the dead, Rick Grimes leads with grit, instinct, and relentless will. He excels as a precision damage dealer who balances risky shots with calculated setup and late-game sustain. A man forged in chaos, Rick walks the line between control and desperation—each bullet a gamble, each decision a fight to stay alive. When his aim is steady, enemies fall in an instant; when the odds turn against him, he adapts, enduring through sheer brutality and resolve. In the end, whether by skill or sheer luck, Rick is the one still standing.',
    skills: [
        {
            id: 'rick-grimes-357-revolver',
            name: '.357 Revolver',
            skillimage: 'https://i.imgur.com/J7oYkQt.png',
            skilldescription: 'Rick fires his signature weapon at one enemy, dealing 20 piercing damage. This has an 80% chance to successfully hit and a 20% chance to miss. If successful, this has a 25% chance to be a \'Headshot\'. If it misses, it has a 10% chance to hit a random different enemy (and 5% chance for that to then be a \'Headshot\'). Rick only carries six bullets with him per game.',
            energy: [],
            target: 'single-enemy',
            damage: 0,
            cooldown: 0,
            maxUses: 6,
            classes: [
                'Physical',
                'Ranged',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'rick_grimes_revolver_hit_confirmed',
                    duration: 1,
                    scope: 'self',
                    chance: 80,
                    condition: {
                        missingStatusId: 'rick_grimes_throat_slit_bleed',
                        scope: 'target'
                    },
                    metadata: {
                        hideTooltipFromUnitOwner: true,
                        hideTooltipFromEnemy: true
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'rick_grimes_revolver_resolved_hit',
                    duration: 1,
                    scope: 'self',
                    condition: {
                        statusId: 'rick_grimes_revolver_hit_confirmed',
                        scope: 'self'
                    },
                    metadata: {
                        hideTooltipFromUnitOwner: true,
                        hideTooltipFromEnemy: true
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'rick_grimes_revolver_bleed_hit_confirmed',
                    duration: 1,
                    scope: 'self',
                    chance: 100,
                    condition: {
                        statusId: 'rick_grimes_throat_slit_bleed',
                        scope: 'target'
                    },
                    metadata: {
                        hideTooltipFromUnitOwner: true,
                        hideTooltipFromEnemy: true
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'rick_grimes_revolver_resolved_hit',
                    duration: 1,
                    scope: 'self',
                    condition: {
                        statusId: 'rick_grimes_revolver_bleed_hit_confirmed',
                        scope: 'self'
                    },
                    metadata: {
                        hideTooltipFromUnitOwner: true,
                        hideTooltipFromEnemy: true
                    }
                },
                {
                    type: 'damage',
                    amount: 20,
                    scope: 'target',
                    condition: {
                        statusId: 'rick_grimes_revolver_hit_confirmed',
                        scope: 'self'
                    },
                    metadata: {
                        ignoreDamageReduction: true,
                        ignoreDestructibleDefense: true
                    }
                },
                {
                    type: 'damage',
                    amount: 20,
                    scope: 'target',
                    condition: {
                        statusId: 'rick_grimes_revolver_bleed_hit_confirmed',
                        scope: 'self'
                    },
                    metadata: {
                        ignoreDamageReduction: true,
                        ignoreDestructibleDefense: true
                    }
                },
                {
                    type: 'damage',
                    amount: 10,
                    scope: 'target',
                    chance: 25,
                    condition: {
                        statusId: 'rick_grimes_revolver_hit_confirmed',
                        scope: 'self'
                    },
                    metadata: {
                        ignoreDamageReduction: true,
                        ignoreDestructibleDefense: true
                    }
                },
                {
                    type: 'damage',
                    amount: 10,
                    scope: 'target',
                    chance: 40,
                    condition: {
                        statusId: 'rick_grimes_revolver_bleed_hit_confirmed',
                        scope: 'self'
                    },
                    metadata: {
                        ignoreDamageReduction: true,
                        ignoreDestructibleDefense: true
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'rick_grimes_revolver_missed',
                    duration: 1,
                    scope: 'self',
                    condition: {
                        missingStatusId: 'rick_grimes_revolver_resolved_hit',
                        scope: 'self'
                    },
                    metadata: {
                        hideTooltipFromUnitOwner: true,
                        hideTooltipFromEnemy: true
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'rick_grimes_revolver_redirect_hit',
                    duration: 1,
                    scope: 'self',
                    chance: 10,
                    condition: {
                        statusId: 'rick_grimes_revolver_missed',
                        scope: 'self'
                    },
                    metadata: {
                        hideTooltipFromUnitOwner: true,
                        hideTooltipFromEnemy: true
                    }
                },
                {
                    type: 'damage',
                    amount: 20,
                    scope: 'random-other-enemy',
                    condition: {
                        statusId: 'rick_grimes_revolver_redirect_hit',
                        scope: 'self'
                    },
                    metadata: {
                        ignoreDamageReduction: true,
                        ignoreDestructibleDefense: true,
                        randomScopeGroupKey: 'rick_grimes_revolver_redirect_target'
                    }
                },
                {
                    type: 'damage',
                    amount: 10,
                    scope: 'random-other-enemy',
                    chance: 5,
                    condition: {
                        statusId: 'rick_grimes_revolver_redirect_hit',
                        scope: 'self'
                    },
                    metadata: {
                        ignoreDamageReduction: true,
                        ignoreDestructibleDefense: true,
                        randomScopeGroupKey: 'rick_grimes_revolver_redirect_target'
                    }
                }
            ]
        },
        {
            id: 'rick-grimes-throat-slit',
            name: 'Throat Slit',
            skillimage: 'https://i.imgur.com/xcN920R.png',
            skilldescription: 'Rick slashes an enemy\'s throat, dealing 10 damage this turn then making them bleed 10 affliction damage next turn. While bleeding, the target\'s harmful skills are silenced, \'.357 Revolver\' cannot miss them, and has a 15% bonus chance to \'Headshot\'.',
            energy: [
                'Random'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 1,
            classes: [
                'Physical',
                'Melee',
                'Instant',
                'Affliction'
            ],
            effects: [
                {
                    type: 'damage',
                    amount: 10,
                    scope: 'target'
                },
                {
                    type: 'apply_status',
                    statusId: 'rick_grimes_throat_slit_bleed',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        cannotUseHarmfulSkills: true,
                        turnEndDamage: 10,
                        afflictionDamage: true,
                        ignoreTargetDamageReduction: true,
                        ignoreTargetDestructibleDefense: true,
                        turnEndTrigger: 'source_turn',
                        turnDurationAnchor: 'source_turn',
                        tooltipText: 'This character will take 10 affliction damage next turn, their harmful skills are silenced, Rick\'s .357 Revolver cannot miss them, and it has a 40% chance to Headshot them.'
                    }
                }
            ]
        },
        {
            id: 'rick-grimes-desperation',
            name: 'Desperation',
            skillimage: 'https://i.imgur.com/hIVO2kn.png',
            skilldescription: 'Rick steals 20 HP from one enemy. If \'.357 Revolver\' is out of bullets, this steals 25 bonus health.',
            energy: [
                'Random',
                'Random'
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
                    type: 'damage',
                    amount: 20,
                    scope: 'target'
                },
                {
                    type: 'heal',
                    amount: 20,
                    scope: 'self'
                },
                {
                    type: 'damage',
                    amount: 25,
                    scope: 'target',
                    condition: {
                        scope: 'self',
                        sourceSkillUsesAtLeast: {
                            skillId: 'rick-grimes-357-revolver',
                            value: 6
                        }
                    }
                },
                {
                    type: 'heal',
                    amount: 25,
                    scope: 'self',
                    condition: {
                        scope: 'self',
                        sourceSkillUsesAtLeast: {
                            skillId: 'rick-grimes-357-revolver',
                            value: 6
                        }
                    }
                }
            ]
        },
        {
            id: 'rick-grimes-arm-guard',
            name: 'Arm Guard',
            skillimage: 'https://i.imgur.com/KPOD3Mo.png',
            skilldescription: 'This skill makes Rick Grimes invulnerable for 1 turn.',
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
                    statusId: 'rick_grimes_arm_guard_invulnerable',
                    duration: 1,
                    scope: 'self',
                    metadata: {
                        invulnerable: true,
                        tooltipText: 'This character is invulnerable.'
                    }
                }
            ]
        },
        {
            id: 'rick-grimes-headshot',
            name: 'Headshot',
            skillimage: 'https://i.imgur.com/1GWRE0R.png',
            skilldescription: '\'.357 Revolver\' has a 25% chance to deal 10 bonus piercing damage on a successful hit. If the shot ricochets to a random different enemy after a miss, it has a 5% chance to deal 10 bonus piercing damage instead. Against a target affected by \'Throat Slit\', the successful-hit chance becomes 40%.',
            energy: [],
            target: '',
            damage: 0,
            cooldown: 0,
            classes: [
                'Passive',
                'Instant'
            ]
        }
    ]
},
    {
    id: 'andrea',
    characterId: 'andrea',
    name: 'Andrea',
    facePicture: 'https://i.imgur.com/MECXiBj.png',
    characterdeescription: 'Andrea excels at punishing exposed targets with precise, high-impact shots, capitalizing on moments when enemies leave themselves vulnerable. Rather than applying constant pressure, she waits for the right opportunity—marking targets who act and striking them down with devastating force. Through her ‘Locked On’ passive, Andrea rewards awareness and timing, turning enemy actions into openings for lethal follow-ups. When positioned safely, she can enter a focused state that enhances her accuracy and enables her most powerful attacks, but this advantage is fragile and easily disrupted.',
    startStatuses: [
        {
            statusId: 'andrea_passive_locked_on',
            sourceSkillId: 'andrea-passive-locked-on',
            duration: 99,
            metadata: {
                infiniteDuration: true,
                onEnemyTeamMemberUseSkillApplyStatusToTarget: {
                    statusId: 'andrea_locked_on_mark',
                    duration: 1,
                    metadata: {
                        harmful: true,
                        ignoreInvulnerabilityFromSourceSkillIdsAny: ['andrea-quick-shot'],
                        turnDurationAnchor: 'source_turn',
                        tooltipText: 'This character is Locked On.'
                    }
                },
                tooltipText: 'Enemies that use a new skill are marked as Locked On.'
            }
        }
    ],
    skills: [
        {
            id: 'andrea-quick-shot',
            name: 'Quick Shot',
            skillimage: 'https://i.imgur.com/6a9Sd7K.png',
            skilldescription: 'Andrea deals 30 piercing damage to one enemy. If the target is Locked On, this ignores their invulnerability.',
            energy: [
                'Random',
                'Random'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 1,
            classes: [
                'Physical',
                'Ranged',
                'Instant'
            ],
            effects: [
                {
                    type: 'damage',
                    amount: 30,
                    scope: 'target',
                    metadata: {
                        ignoreDamageReduction: true,
                        ignoreDestructibleDefense: true
                    }
                }
            ]
        },
        {
            id: 'andrea-sniper-tower',
            name: 'Sniper Tower',
            skillimage: 'https://i.imgur.com/bp5oUro.png',
            skilldescription: 'For 3 turns, Andrea gains Sniper Tower. While active, she becomes invulnerable for 1 turn each time she uses a skill. If Andrea takes new non-affliction damage, Sniper Tower is ignored for 1 turn.',
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
                    statusId: 'andrea_sniper_tower_active',
                    duration: 3,
                    scope: 'self',
                    metadata: {
                        onOwnerUseSkillTrigger: true,
                        persistOnOwnerUseSkillTrigger: true,
                        onOwnerUseSkillApplyStatusToOwnerCondition: {
                            scope: 'self',
                            missingStatusId: 'andrea_sniper_tower_disabled'
                        },
                        onOwnerUseSkillApplyStatusToOwner: {
                            statusId: 'andrea_sniper_tower_invulnerable',
                            duration: 1,
                            metadata: {
                                invulnerable: true,
                                tooltipText: 'This character is invulnerable.'
                            }
                        },
                        onTeamMemberDamageTakenApplyStatusToOwner: {
                            statusId: 'andrea_sniper_tower_disabled',
                            duration: 1,
                            nonAfflictionOnly: true,
                            metadata: {
                                harmful: true,
                                tooltipText: 'Sniper Tower is ignored for 1 turn.'
                            }
                        },
                        tooltipText: 'For 3 turns, Andrea becomes invulnerable for 1 turn each time she uses a skill. If she takes new non-affliction damage, Sniper Tower is ignored for 1 turn.'
                    }
                }
            ]
        },
        {
            id: 'andrea-snipe',
            name: 'Snipe',
            skillimage: 'https://i.imgur.com/GA4nBnh.png',
            skilldescription: 'Andrea deals 85 piercing damage to one Locked On enemy, but only while Sniper Tower is active.',
            energy: [
                'Random',
                'Random',
                'Random'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 1,
            classes: [
                'Physical',
                'Ranged',
                'Instant'
            ],
            actorCondition: {
                statusId: 'andrea_sniper_tower_active'
            },
            targetCondition: {
                statusId: 'andrea_locked_on_mark'
            },
            effects: [
                {
                    type: 'damage',
                    amount: 85,
                    scope: 'target',
                    metadata: {
                        ignoreDamageReduction: true,
                        ignoreDestructibleDefense: true
                    }
                }
            ]
        },
        {
            id: 'andrea-horse-escape',
            name: 'Horse Escape',
            skillimage: 'https://i.imgur.com/MFmkXQ2.png',
            skilldescription: 'Andrea removes all harmful effects from herself and makes one ally invulnerable for 1 turn.',
            energy: [
                'Random'
            ],
            target: 'single-ally',
            damage: 0,
            cooldown: 4,
            classes: [
                'Physical',
                'Instant'
            ],
            effects: [
                {
                    type: 'cleanse_harmful',
                    count: 99,
                    scope: 'self'
                },
                {
                    type: 'apply_status',
                    statusId: 'andrea_horse_escape_invulnerable',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        invulnerable: true,
                        tooltipText: 'This character is invulnerable.'
                    }
                }
            ]
        },
        {
            id: 'andrea-passive-locked-on',
            name: 'Passive: Locked On',
            skillimage: 'https://i.imgur.com/p74b06s.png',
            skilldescription: 'Any enemy that uses a new skill is marked as Locked On. Locked On enemies lose invulnerability against Andrea\'s attacks.',
            energy: [],
            target: '',
            damage: 0,
            cooldown: 0,
            classes: [
                'Passive',
                'Instant'
            ]
        }
    ]
},
    {
    id: 'walker',
    characterId: 'walker',
    name: 'Walker',
    facePicture: 'https://i.imgur.com/NqFhNs6.png',
    characterdeescription: 'Walker is an undead vanguard spawned from the endless hunger of the infected masses. On a team, Walker functions as a scaling pressure engine and anti-healing disruptor, gradually overwhelming enemies through persistent damage and infection. He excels in longer fights, where his effects stack and compound, forcing opponents into a losing war of attrition.',
    skills: [
        {
            id: 'walker-infected-horde',
            name: 'Infected Horde',
            skillimage: 'https://i.imgur.com/e4sEkft.png',
            skilldescription: 'For the rest of the game, Walker and his team gain 10 damage reduction and the enemy team takes 10 affliction damage at the end of Walker\'s turns. The next Surprise Chomp or Overpower Walker uses will target all enemies. This effect stacks up to 3 times and ends when Walker dies.',
            energy: [
                'Random',
                'Random',
                'Random'
            ],
            target: 'self',
            damage: 0,
            cooldown: 2,
            classes: [
                'Physical',
                'Melee',
                'Action',
                'Instant*'
            ],
            maxUses: 3,
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'walker_infected_horde_team_aura',
                    duration: 99,
                    scope: 'all-allies',
                    metadata: {
                        infiniteDuration: true,
                        ongoingClass: 'action',
                        damageReductionFlat: 10,
                        stackMetadataKey: 'infectedHordeStacks',
                        stackDelta: 1,
                        stackMax: 3,
                        mergeNumericAddKeys: ['damageReductionFlat'],
                        tooltipTextTemplate: 'This character has {damageReductionFlat} damage reduction from Infected Horde.'
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'walker_infected_horde_enemy_bleed',
                    duration: 99,
                    scope: 'all-enemy',
                    metadata: {
                        harmful: true,
                        infiniteDuration: true,
                        ongoingClass: 'action',
                        turnEndDamage: 10,
                        afflictionDamage: true,
                        ignoreTargetDamageReduction: true,
                        ignoreTargetDestructibleDefense: true,
                        turnEndTrigger: 'source_turn',
                        turnDurationAnchor: 'source_turn',
                        triggerOnApply: true,
                        mergeNumericAddKeys: ['turnEndDamage'],
                        tooltipTextTemplate: 'This character takes {turnEndDamage} affliction damage at the end of each of Walker\'s turns.'
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'walker_infected_horde_next_attack',
                    duration: 99,
                    scope: 'self',
                    metadata: {
                        infiniteDuration: true,
                        onOwnerUseSkillTrigger: true,
                        onOwnerUseSkillClassesAny: ['melee'],
                        skillReplacements: {
                            'walker-surprise-chomp': 'walker-surprise-chomp-all',
                            'walker-overpower': 'walker-overpower-all'
                        },
                        tooltipText: 'Walker\'s next Surprise Chomp or Overpower targets all enemies.'
                    }
                }
            ]
        },
        {
            id: 'walker-surprise-chomp',
            name: 'Surprise Chomp',
            skillimage: 'https://i.imgur.com/WajPlhY.png',
            skilldescription: 'Walker steals 15 HP from one enemy and grants them Infected Bite.',
            energy: [
                'Random'
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
                    amount: 15,
                    scope: 'target'
                },
                {
                    type: 'heal',
                    amount: 15,
                    scope: 'self'
                },
                {
                    type: 'apply_status',
                    statusId: 'walker_infected_bite',
                    duration: 99,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        infiniteDuration: true,
                        ongoingClass: 'action',
                        turnEndDamage: 2,
                        afflictionDamage: true,
                        ignoreTargetDamageReduction: true,
                        ignoreTargetDestructibleDefense: true,
                        turnEndTrigger: 'source_turn',
                        turnDurationAnchor: 'source_turn',
                        triggerOnApply: true,
                        healReceivedMultiplier: 0.75,
                        healReceivedMultiplierWhenOwnerCurrentHpAtMostThreshold: 40,
                        healReceivedMultiplierWhenOwnerCurrentHpAtMost: 0.5,
                        bonusDamageFromSourceCharacterId: 'walker',
                        bonusDamageAppliesToSkillIds: ['walker-surprise-chomp', 'walker-surprise-chomp-all'],
                        bonusDamageFromSourceSkillsFlat: 5,
                        tooltipText: 'This character takes 2 affliction damage each turn, receives 25% less healing or 50% less healing at 40 HP or below, and Walker\'s Surprise Chomp steals 5 additional HP from them.'
                    }
                }
            ]
        },
        {
            id: 'walker-surprise-chomp-all',
            name: 'Surprise Chomp',
            hiddenFromSelectionViewer: true,
            useBaseSkillCooldown: true,
            skillimage: 'https://i.imgur.com/WajPlhY.png',
            skilldescription: 'Walker steals 15 HP from all enemies and grants Infected Bite to one enemy.',
            energy: [
                'Random'
            ],
            target: 'all-enemy',
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
                    amount: 15,
                    scope: 'all-enemy',
                    metadata: {
                        randomScopeGroupKey: 'walker_surprise_chomp_all_target'
                    }
                },
                {
                    type: 'heal',
                    amount: 15,
                    scope: 'self'
                },
                {
                    type: 'apply_status',
                    statusId: 'walker_infected_bite',
                    duration: 99,
                    scope: 'random-enemy',
                    metadata: {
                        harmful: true,
                        infiniteDuration: true,
                        ongoingClass: 'action',
                        turnEndDamage: 2,
                        afflictionDamage: true,
                        ignoreTargetDamageReduction: true,
                        ignoreTargetDestructibleDefense: true,
                        turnEndTrigger: 'source_turn',
                        turnDurationAnchor: 'source_turn',
                        triggerOnApply: true,
                        healReceivedMultiplier: 0.75,
                        healReceivedMultiplierWhenOwnerCurrentHpAtMostThreshold: 40,
                        healReceivedMultiplierWhenOwnerCurrentHpAtMost: 0.5,
                        bonusDamageFromSourceCharacterId: 'walker',
                        bonusDamageAppliesToSkillIds: ['walker-surprise-chomp', 'walker-surprise-chomp-all'],
                        bonusDamageFromSourceSkillsFlat: 5,
                        tooltipText: 'This character takes 2 affliction damage each turn, receives 25% less healing or 50% less healing at 40 HP or below, and Walker\'s Surprise Chomp steals 5 additional HP from them.'
                    }
                }
            ]
        },
        {
            id: 'walker-overpower',
            name: 'Overpower',
            skillimage: 'https://i.imgur.com/g0Tie8I.png',
            skilldescription: 'Walker stuns one enemy\'s non-mental skills for 1 turn. The following turn, Surprise Chomp deals 10 additional damage to this target.',
            energy: [
                'Random',
                'Random'
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
                    statusId: 'walker_overpower_stun',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        cannotUseNonMentalSkills: true,
                        tooltipText: 'This character non-mental skills are stunned.'
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'walker_overpower_bonus',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        bonusDamageFromSourceCharacterId: 'walker',
                        bonusDamageAppliesToSkillIds: ['walker-surprise-chomp', 'walker-surprise-chomp-all'],
                        bonusDamageFromSourceSkillsFlat: 10,
                        turnEndTrigger: 'source_turn',
                        turnDurationAnchor: 'source_turn',
                        tooltipText: 'Walker\'s Surprise Chomp deals 10 additional damage to this character.'
                    }
                }
            ]
        },
        {
            id: 'walker-overpower-all',
            name: 'Overpower',
            hiddenFromSelectionViewer: true,
            useBaseSkillCooldown: true,
            skillimage: 'https://i.imgur.com/g0Tie8I.png',
            skilldescription: 'Walker stuns all enemies\' non-mental skills for 1 turn. The following turn, Surprise Chomp deals 10 additional damage to one enemy.',
            energy: [
                'Random',
                'Random'
            ],
            target: 'all-enemy',
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
                    statusId: 'walker_overpower_stun_all',
                    duration: 1,
                    scope: 'all-enemy',
                    metadata: {
                        harmful: true,
                        cannotUseNonMentalSkills: true,
                        tooltipText: 'This character non-mental skills are stunned.'
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'walker_overpower_bonus',
                    duration: 1,
                    scope: 'random-enemy',
                    metadata: {
                        harmful: true,
                        randomScopeGroupKey: 'walker_overpower_bonus_target',
                        bonusDamageFromSourceCharacterId: 'walker',
                        bonusDamageAppliesToSkillIds: ['walker-surprise-chomp', 'walker-surprise-chomp-all'],
                        bonusDamageFromSourceSkillsFlat: 10,
                        turnEndTrigger: 'source_turn',
                        turnDurationAnchor: 'source_turn',
                        tooltipText: 'Walker\'s Surprise Chomp deals 10 additional damage to this character.'
                    }
                }
            ]
        },
        {
            id: 'walker-group-banquet',
            name: 'Group Banquet',
            skillimage: 'https://i.imgur.com/J1mBmGk.png',
            skilldescription: 'Walker heals 15 HP at the end of each of his turns for 2 turns.',
            energy: [
                'Random',
                'Random'
            ],
            target: 'self',
            damage: 0,
            cooldown: 2,
            classes: [
                'Physical',
                'Control'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'walker_group_banquet_regen',
                    duration: 2,
                    scope: 'self',
                    metadata: {
                        turnEndHealFlat: 15,
                        turnEndTrigger: 'source_turn',
                        turnDurationAnchor: 'source_turn',
                        triggerOnApply: true,
                        tooltipText: 'Walker heals 15 HP at the end of each of his turns.'
                    }
                }
            ]
        },
        {
            id: 'walker-passive-infected-bite',
            name: 'Passive: Infected Bite',
            skillimage: 'https://i.imgur.com/zeUfS91.png',
            skilldescription: 'This character takes 2 affliction damage every turn, receives 25% less healing or 50% less healing at 40 HP or below, and Walker\'s Surprise Chomp steals 5 additional HP from them. This effect does not stack.',
            energy: [],
            target: '',
            damage: 0,
            cooldown: 0,
            classes: [
                'Passive',
                'Instant',
                'Affliction'
            ]
        }
    ]
},
    {
    id: 'hershel-greene',
    characterId: 'hershel-greene',
    name: 'Hershel Greene',
    facePicture: 'https://i.imgur.com/A4uAHH9.png',
    characterdeescription: 'A steady hand in the chaos, Hershel Greene keeps his team alive through sheer experience and resolve. Though not a frontline fighter, his medical expertise allows him to stabilize allies, mitigate incoming damage, and even bring the fallen back into the fight. Hershel excels at sustaining his team over extended battles—delaying damage, cleansing afflictions, and turning lethal situations into survivable ones. However, his reliance on timing and limited supplies means every decision matters. Misuse his tools, and his team will crumble. Use them wisely, and they simply won’t die.',
    skills: [
        {
            id: 'hershel-greene-reluctant-bullet',
            name: 'Reluctant Bullet',
            skillimage: 'https://i.imgur.com/N57Xbty.png',
            skilldescription: 'Hershel deals 20 piercing damage to one enemy and reduces the healing they recieve by 50% for 1 turn.',
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
                    scope: 'target',
                    metadata: {
                        ignoreDamageReduction: true,
                        ignoreDestructibleDefense: true
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'hershel_greene_reluctant_bullet_healing_debuff',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        healReceivedMultiplier: 0.5,
                        tooltipText: 'This character receives 50% less healing.'
                    }
                }
            ]
        },
        {
            id: 'hershel-greene-tending-the-crops',
            name: 'Tending the Crops',
            skillimage: 'https://i.imgur.com/5i9qL6M.png',
            skilldescription: 'Hershel heals his entire team 10 HP and grants them 10 points of destructible defense.',
            energy: [
                'Random'
            ],
            target: 'self',
            damage: 0,
            cooldown: 0,
            classes: [
                'Physical',
                'Instant'
            ],
            effects: [
                {
                    type: 'heal',
                    amount: 10,
                    scope: 'all-allies'
                },
                {
                    type: 'apply_status',
                    statusId: 'hershel_greene_tending_the_crops_defense',
                    duration: 99,
                    scope: 'all-allies',
                    metadata: {
                        destructibleDefensePoints: 10,
                        mergeNumericAddKeys: ['destructibleDefensePoints'],
                        tooltipTextTemplate: 'This character has {destructibleDefensePoints} destructible defense.'
                    }
                }
            ]
        },
        {
            id: 'hershel-greene-morphine-shot',
            name: 'Morphine Shot',
            skillimage: 'https://i.imgur.com/cT2uA4x.png',
            skilldescription: 'Hershel targets himself or an ally. For 3 turns, they gain 60% unpierceable damage reduction that decays by 20% each turn. Swaps to \'Antibiotics\' once used.',
            energy: [
                'Ninjutsu'
            ],
            target: 'self-or-single-ally',
            damage: 0,
            cooldown: 3,
            classes: [
                'Physical',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'hershel_greene_morphine_shot_reduction_60',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        unpierceableDamageReductionFlat: 60,
                        tooltipTextTemplate: 'This character has {unpierceableDamageReductionFlat}% unpierceable damage reduction.',
                        onExpireApplyStatusToSelf: {
                            statusId: 'hershel_greene_morphine_shot_reduction_40',
                            duration: 1,
                            metadata: {
                                unpierceableDamageReductionFlat: 40,
                                tooltipTextTemplate: 'This character has {unpierceableDamageReductionFlat}% unpierceable damage reduction.',
                                onExpireApplyStatusToSelf: {
                                    statusId: 'hershel_greene_morphine_shot_reduction_20',
                                    duration: 1,
                                    metadata: {
                                        unpierceableDamageReductionFlat: 20,
                                        tooltipTextTemplate: 'This character has {unpierceableDamageReductionFlat}% unpierceable damage reduction.'
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'hershel_greene_medkit_swap_to_antibiotics',
                    duration: 99,
                    scope: 'self',
                    metadata: {
                        skillReplacements: {
                            'hershel-greene-morphine-shot': 'hershel-greene-antibiotics'
                        },
                        removeStatusIdsOnApply: ['hershel_greene_medkit_swap_to_morphine'],
                        tooltipText: 'Morphine Shot is replaced by Antibiotics.'
                    }
                }
            ]
        },
        {
            id: 'hershel-greene-doctor-s-bag',
            name: 'Doctor\'s Bag',
            skillimage: 'https://i.imgur.com/neBRimV.png',
            skilldescription: 'Hershel activates this skill. Each time an ally dies, at the start of your next turn, choose one of the following: 1. Heal an ally 35 HP. 2. Remove all harmful damaging skills on an ally. 3. Revive a dead ally to 30 HP. Only activates once per turn and can only activate twice in a game.',
            energy: [],
            target: 'all-allies',
            damage: 0,
            maxUses: 1,
            cooldown: 0,
            classes: [
                'Physical',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'hershel_greene_doctor_s_bag_active',
                    duration: 99,
                    scope: 'self',
                    metadata: {
                        turnStartChoicePromptText: 'Choose one Doctor\'s Bag effect.',
                        turnStartChoiceMaxUses: 2,
                        turnStartChoiceUsesUsed: 0,
                        onTeamMemberDeathQueueTurnStartChoice: true,
                        turnStartChoiceOptions: [
                            {
                                key: 'heal',
                                label: 'Heal an ally 35 HP',
                                targetStrategy: 'alive-ally-lowest-hp',
                                effect: {
                                    type: 'heal',
                                    amount: 35
                                }
                            },
                            {
                                key: 'cleanse',
                                label: 'Remove harmful damaging skills',
                                targetStrategy: 'alive-ally-most-harmful',
                                effect: {
                                    type: 'cleanse_harmful',
                                    count: 0
                                }
                            },
                            {
                                key: 'revive',
                                label: 'Revive a dead ally to 30 HP',
                                targetStrategy: 'dead-ally-first',
                                effect: {
                                    type: 'revive',
                                    amount: 30
                                }
                            }
                        ],
                        tooltipText: 'When an ally dies, choose a Doctor\'s Bag effect at the start of your next turn.'
                    }
                }
            ]
        },
        {
            id: 'hershel-greene-antibiotics',
            name: 'Antibiotics',
            skillimage: 'https://i.imgur.com/fzgNljs.png',
            skilldescription: 'Hershel targets himself or an ally. For 3 turns, the target has all enemy affliction skills removed from them and heals 10 HP each turn. Swaps to \'Morphine Shot\' once used.',
            energy: [
                'Ninjutsu'
            ],
            target: 'self-or-single-ally',
            damage: 0,
            cooldown: 3,
            classes: [
                'Physical',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'hershel_greene_antibiotics_active',
                    duration: 3,
                    scope: 'target',
                    metadata: {
                        removeEnemyAfflictionStatusesOnApply: true,
                        removeEnemyAfflictionStatusesOnTurnEnd: true,
                        turnEndHealFlat: 10,
                        tooltipText: 'Enemy affliction damage effects are removed and this character heals 10 HP each turn.'
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'hershel_greene_medkit_swap_to_morphine',
                    duration: 99,
                    scope: 'self',
                    metadata: {
                        skillReplacements: {
                            'hershel-greene-antibiotics': 'hershel-greene-morphine-shot'
                        },
                        removeStatusIdsOnApply: ['hershel_greene_medkit_swap_to_antibiotics'],
                        tooltipText: 'Antibiotics is replaced by Morphine Shot.'
                    }
                }
            ]
        }
    ]
},
    {
    id: 'invincible',
    characterId: 'invincible',
    name: 'Invincible',
    facePicture: 'https://i.imgur.com/vNO0ebm.png',
    characterdeescription: 'Invincible thrives in the chaos of battle, growing stronger as his team endures enemy pressure. Rather than avoiding damage, he embraces it—using each hit his allies take as fuel to amplify his own power. With the ability to shield teammates at critical moments and retaliate with increasingly devastating force, Invincible rewards calculated risk and precise timing.',
    startStatuses: [
        {
            statusId: 'invincible_passive_something_to_fight_for',
            sourceSkillId: 'invincible-passive-something-to-fight-for',
            duration: 99,
            metadata: {
                onTeamMemberDamageTakenApplyStatusToOwner: {
                    statusId: 'invincible_passive_something_to_fight_for_damage_bonus',
                    duration: 99,
                    nonAfflictionOnly: true,
                    metadata: {
                        damageBonusFlat: 5,
                        mergeNumericAddKeys: ['damageBonusFlat'],
                        tooltipTextTemplate: 'Invincible deals {damageBonusFlat} additional damage.'
                    }
                },
                tooltipText: 'Invincible deals 5 bonus damage every time an ally recieves new non-affliction damage.'
            }
        }
    ],
    skills: [
        {
            id: 'invincible-invincible-punch',
            name: 'Invincible Punch',
            skillimage: 'https://i.imgur.com/HowF8NS.png',
            skilldescription: 'Invincible punches one enemy dealing 5 damage to them.',
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
                    amount: 5,
                    scope: 'target'
                }
            ]
        },
        {
            id: 'invincible-to-the-rescue',
            name: 'To the Rescue',
            skillimage: 'https://i.imgur.com/MZHQ6n3.png',
            skilldescription: 'Invincible makes an ally invulnerable for 1 turn.',
            energy: [
                'Taijutsu'
            ],
            target: 'ally',
            damage: 0,
            cooldown: 0,
            classes: [
                'Physical',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'invincible_to_the_rescue_invulnerable',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        invulnerable: true,
                        tooltipText: 'This character is invulnerable.'
                    }
                }
            ]
        },
        {
            id: 'invincible-desperate-bite',
            name: 'Desperate Bite',
            skillimage: 'https://i.imgur.com/lv18VL8.png',
            skilldescription: 'Deals 10 affliction damage to one enemy. This swaps to \'Head Smash\' for 1 turn.',
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
                    amount: 10,
                    scope: 'target',
                    metadata: {
                        afflictionDamage: true
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'invincible_desperate_bite_to_head_smash',
                    duration: 1,
                    scope: 'self',
                    metadata: {
                        skillReplacements: {
                            'invincible-desperate-bite': 'invincible-head-smash'
                        },
                        tooltipText: 'Desperate Bite is replaced by Head Smash.'
                    }
                }
            ]
        },
        {
            id: 'invincible-viltrumite-flight',
            name: 'Viltrumite Flight',
            skillimage: 'https://i.imgur.com/0ZS3Gfm.png',
            skilldescription: 'This skill makes Invincible invulnerable and deal 15 bonus damage for 1 turn.',
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
                    statusId: 'invincible_viltrumite_flight',
                    duration: 1,
                    scope: 'self',
                    metadata: {
                        invulnerable: true,
                        damageBonusFlat: 15,
                        mergeNumericAddKeys: ['damageBonusFlat'],
                        tooltipText: 'Invincible is invulnerable and deals 15 additional damage.'
                    }
                }
            ]
        },
        {
            hiddenFromSelectionViewer: true,
            id: 'invincible-head-smash',
            name: 'Head Smash',
            skillimage: 'https://i.imgur.com/5wQuvL7.png',
            skilldescription: 'Deals 20 piercing damage to one enemy and fully stuns them for 1 turn.',
            energy: [
                'Taijutsu',
                'Taijutsu'
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
                    amount: 20,
                    scope: 'target',
                    metadata: {
                        ignoreDamageReduction: true,
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'stunned',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        cannotUseSkills: true,
                        tooltipText: 'This character is stunned.'
                    }
                }
            ]
        },
        {
            id: 'invincible-passive-something-to-fight-for',
            name: 'Passive: Something to Fight For',
            skillimage: 'https://i.imgur.com/1eD58MB.png',
            skilldescription: 'Invincible deals 5 bonus damage every time an ally recieves new non-affliction damage. This effect is permanent.',
            energy: [],
            target: '',
            damage: 0,
            cooldown: 0,
            classes: [
                'Passive',
                'Instant'
            ]
        }
    ]
},
    {
    id: 'rex-splode',
    characterId: 'rex-splode',
    name: 'Rex Splode',
    facePicture: 'https://i.imgur.com/sYSm26V.png',
    characterdeescription: 'On a team, Rex excels as a burst damage and disruption specialist, ideal for breaking through durable targets and creating openings for allies. Played well, he controls the pace of the fight—forcing opponents to react or risk getting blown apart. Rex Splode is a high-pressure ranged damage dealer who thrives on controlled bursts of explosive power. Rather than relying on sustained output, he manages limited resources—charged batons and coins—to deliver precise, piercing attacks that weaken and disrupt enemies',
     startStatuses: [
         {
             statusId: 'rex_splode_ammo_swap_tracker',
             sourceSkillId: 'rex-splode-passive-ammo-shift',
             duration: 99,
             metadata: {
                 onOwnerUseSkillTrigger: true,
                 persistOnOwnerUseSkillTrigger: true,
                 onOwnerUseSkillApplyStatusToOwnerCondition: {
                     scope: 'self',
                     sourceSkillUsesAtLeast: {
                         skillId: 'rex-splode-explosive-baton',
                         value: 2
                     }
                 },
                 onOwnerUseSkillApplyStatusToOwner: {
                     statusId: 'rex_splode_explosive_baton_spent',
                     duration: 99,
                     metadata: {
                         hideTooltipFromUnitOwner: true,
                         hideTooltipFromEnemy: true,
                         skillReplacements: {
                             'rex-splode-explosive-baton': 'rex-splode-explosive-debris'
                         },
                         tooltipText: 'Explosive Baton is replaced by Explosive Debris.'
                     }
                 },
                 hideTooltipFromUnitOwner: true,
                 hideTooltipFromEnemy: true,
                 tooltipText: 'When Explosive Baton runs out of ammo, it is replaced by Explosive Debris.'
             }
         },
         {
             statusId: 'rex_splode_pocket_change_swap_tracker',
             sourceSkillId: 'rex-splode-passive-ammo-shift',
             duration: 99,
             metadata: {
                 onOwnerUseSkillTrigger: true,
                 persistOnOwnerUseSkillTrigger: true,
                 onOwnerUseSkillApplyStatusToOwnerCondition: {
                     scope: 'self',
                     sourceSkillUsesAtLeast: {
                         skillId: 'rex-splode-explosive-pocket-change',
                         value: 3
                     }
                 },
                 onOwnerUseSkillApplyStatusToOwner: {
                     statusId: 'rex_splode_explosive_pocket_change_spent',
                     duration: 99,
                     metadata: {
                         hideTooltipFromUnitOwner: true,
                         hideTooltipFromEnemy: true,
                         skillReplacements: {
                             'rex-splode-explosive-pocket-change': 'rex-splode-explosive-debris'
                         },
                         tooltipText: 'Explosive Pocket Change is replaced by Explosive Debris.'
                     }
                 },
                 hideTooltipFromUnitOwner: true,
                 hideTooltipFromEnemy: true,
                 tooltipText: 'When Explosive Pocket Change runs out of ammo, it is replaced by Explosive Debris.'
             }
         }
     ],
     skills: [
         {
             id: 'rex-splode-explosive-baton',
            name: 'Explosive Baton',
            skillimage: 'https://i.imgur.com/Vqrh1D8.png',
            skilldescription: 'Rex throws a charged baton at one enemy, dealing 24 piercing damage and reducing their non-affliction damage by 15 for 1 turn. Rex can only use this skill twice per game.',
            energy: [
                'Bloodline'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 0,
            maxUses: 2,
            classes: [
                'Energy',
                'Ranged',
                'Instant'
            ],
            effects: [
                {
                    type: 'damage',
                    amount: 24,
                    scope: 'target',
                    metadata: {
                        ignoreDamageReduction: true,
                        bonusPerStatusMetadata: {
                            statusId: 'rex_splode_floor_detonation_mark',
                            metadataKey: 'floorDetonationBonusDamage',
                            multiplier: 1,
                            consumeStatus: true
                        }
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'rex_splode_baton_damage_debuff',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        nonAfflictionDamageDebuffFlat: 15,
                        tooltipText: 'This character deals 15 less non-affliction damage.'
                    }
                }
            ]
        },
        {
            id: 'rex-splode-explosive-pocket-change',
            name: 'Explosive Pocket Change',
            skillimage: 'https://i.imgur.com/51ENwBD.png',
            skilldescription: 'Rex charges a coin in his pocket and throws it a one enemy, dealing 15 piercing damage and removing 1 random chakra from them. Rex can only use this skill three times per game.',
            energy: [
                'Random'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 1,
            maxUses: 3,
            classes: [
                'Energy',
                'Ranged',
                'Instant'
            ],
            effects: [
                {
                    type: 'damage',
                    amount: 15,
                    scope: 'target',
                    metadata: {
                        ignoreDamageReduction: true,
                        bonusPerStatusMetadata: {
                            statusId: 'rex_splode_floor_detonation_mark',
                            metadataKey: 'floorDetonationBonusDamage',
                            multiplier: 1,
                            consumeStatus: true
                        }
                    }
                },
                {
                    type: 'remove_random_chakra',
                    amount: 1,
                    scope: 'target'
                }
            ]
        },
        {
            id: 'rex-splode-floor-detonation',
            name: 'Floor Detonation',
            skillimage: 'https://i.imgur.com/LrqRUVL.png',
            skilldescription: 'Rex charges the entire floor underneath the enemy team, dealing 20 affliction damage to them and marking them for 2 turns. The next skill Rex uses on them if they are marked deals 10 additional damage.',
            energy: [
                'Bloodline',
                'Random'
            ],
            target: 'all-enemy',
            damage: 0,
            cooldown: 2,
            classes: [
                'Energy',
                'Ranged',
                'Instant',
                'Affliction'
            ],
            effects: [
                {
                    type: 'damage',
                    amount: 20,
                    scope: 'all-enemy',
                    metadata: {
                        afflictionDamage: true,
                        ignoreDamageReduction: true,
                        ignoreDestructibleDefense: true,
                        bonusPerStatusMetadata: {
                            statusId: 'rex_splode_floor_detonation_mark',
                            metadataKey: 'floorDetonationBonusDamage',
                            multiplier: 1,
                            consumeStatus: true
                        }
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'rex_splode_floor_detonation_mark',
                    duration: 2,
                    scope: 'all-enemy',
                    metadata: {
                        harmful: true,
                        floorDetonationBonusDamage: 10,
                        tooltipText: 'This character is marked by Floor Detonation: Rex\'s next skill on them will deal 10 additional damage.'
                    }
                }
            ]
        },
        {
            id: 'rex-splode-smoke-screen',
            name: 'Smoke Screen',
            skillimage: 'https://i.imgur.com/EbbHfy2.png',
            skilldescription: 'This skill makes Rex Splode invulnerable for 1 turn.',
            energy: [
                'Random'
            ],
            target: 'self',
            damage: 0,
            cooldown: 4,
            classes: [
                'Energy',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'rex_splode_smoke_screen_invulnerable',
                    duration: 1,
                    scope: 'self',
                    metadata: {
                        invulnerable: true,
                        tooltipText: 'This character is invulnerable.'
                    }
                }
            ]
        },
        {
            id: 'rex-splode-explosive-debris',
            name: 'Explosive Debris',
            skillimage: 'https://i.imgur.com/gOwnLXF.png',
            skilldescription: 'This skill replaces Explosive Baton or Explosive Pocket Change when they run out of ammo. Deal 20 piercing damage to one enemy. The following turn, if this skill is used on the same target it will deal 35 piercing damage instead.',
            energy: [],
            target: 'single-enemy',
            damage: 0,
            cooldown: 2,
            classes: [
                'Energy',
                'Ranged',
                'Instant'
            ],
            effects: [
                {
                    type: 'damage',
                    amount: 20,
                    scope: 'target',
                    metadata: {
                        ignoreDamageReduction: true,
                        bonusPerStatusMetadata: {
                            statusId: 'rex_splode_floor_detonation_mark',
                            metadataKey: 'floorDetonationBonusDamage',
                            multiplier: 1,
                            consumeStatus: true
                        }
                    }
                },
                {
                    type: 'damage',
                    amount: 15,
                    scope: 'target',
                    condition: {
                        scope: 'target',
                        statusId: 'rex_splode_explosive_debris_followup'
                    },
                    metadata: {
                        ignoreDamageReduction: true,
                        ignoreDestructibleDefense: true
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'rex_splode_explosive_debris_followup',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        turnDurationAnchor: 'source_turn',
                        tooltipText: 'If Rex uses Explosive Debris on this target next turn, it deals 15 additional damage.'
                    }
                }
            ]
        }
    ]
},
    {
    id: 'atom-eve',
    characterId: 'atom-eve',
    name: 'Atom Eve',
    facePicture: 'https://i.imgur.com/Gsfj3gN.png',
    characterdeescription: 'Atom Eve is a battlefield control support who reshapes fights through precise molecular constructs. Rather than overwhelming enemies with raw damage, she dominates through disruption, protection, and inevitability—shutting down key threats while reinforcing her team with layered defenses. Her constructs allow her to disable high-impact enemies, create protective barriers, and mitigate incoming damage across her team, making her especially valuable in slower, control-oriented compositions. Eve thrives when dictating tempo—forcing opponents into unfavorable positions while her allies capitalize on the openings she creates.',
    startStatuses: [
        {
            statusId: 'atom_eve_passive_near_death_awakening',
            sourceSkillId: 'atom-eve-passive-near-death-awakening',
            duration: 99,
            metadata: {
                onOwnerDeathReviveToHp: 50,
                onOwnerDeathApplyStatusToSelf: {
                    statusId: 'atom_eve_near_death_awakening_active',
                    duration: 2,
                    metadata: {
                        removeStatusIdsOnApply: ['atom_eve_passive_near_death_awakening'],
                        turnEndHealthLoss: 25,
                        skillReplacements: {
                            'atom-eve-molecule-crush': 'atom-eve-molecular-deconstruction-beam',
                            'atom-eve-molecule-helmet': 'atom-eve-molecular-deconstruction-beam',
                            'atom-eve-molecule-shield': 'atom-eve-molecular-deconstruction-beam',
                            'atom-eve-molecule-battle-armor': 'atom-eve-molecular-deconstruction-beam'
                        },
                        tooltipTextTemplate:
                            'Eve has {turnEndHealthLoss} health loss each turn and all her skills become Molecular Deconstruction Beam.'
                    }
                },
                tooltipText:
                    'When Eve is killed, she is revived to 50 HP for 2 turns and all her skills become Molecular Deconstruction Beam.'
            }
        }
    ],
    skills: [
        {
            id: 'atom-eve-molecule-crush',
            name: 'Molecule Crush',
            skillimage: 'https://i.imgur.com/Q9Pbq4F.png',
            skilldescription: 'Grants one enemy 15 points of Barrier for 1 turn and deals 20 damage to them.',
            energy: [
                'Bloodline'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 0,
            classes: [
                'Energy',
                'Ranged',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'atom_eve_molecule_crush_barrier',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        barrierPoints: 15,
                        mergeNumericAddKeys: ['barrierPoints'],
                        tooltipTextTemplate: 'This character has {barrierPoints} barrier.'
                    }
                },
                {
                    type: 'damage',
                    amount: 20,
                    scope: 'target',
                }
            ]
        },
        {
            id: 'atom-eve-molecule-helmet',
            name: 'Molecule Helmet',
            skillimage: 'https://i.imgur.com/Fa6bU6r.png',
            skilldescription: 'Grants one enemy 30 permanent Barrier. While they have any Barrier from this skill, their harmful skills are Silenced and Blinded. This cannot be used on an already affected enemy.',
            energy: [
                'Bloodline',
                'Ninjutsu'
            ],
            target: 'single-enemy',
            targetCondition: {
                missingStatusId: 'atom_eve_molecule_helmet_barrier'
            },
            damage: 0,
            cooldown: 3,
            classes: [
                'Energy',
                'Ranged',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'atom_eve_molecule_helmet_barrier',
                    duration: 99,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        barrierPoints: 30,
                        mergeNumericAddKeys: ['barrierPoints'],
                        silenceNonDamageEffects: true,
                        harmfulBlind: true,
                        tooltipTextTemplate:
                            'This character has {barrierPoints} barrier. Their harmful skills are silenced and blinded.'
                    }
                }
            ]
        },
        {
            id: 'atom-eve-molecule-shield',
            name: 'Molecule Shield',
            skillimage: 'https://i.imgur.com/268NZqY.png',
            skilldescription: 'Eve grants her entire team 20 points of destructible defense for 1 turn. This skill is invisible.',
            energy: [
                'Random',
                'Random'
            ],
            target: 'all-allies',
            damage: 0,
            cooldown: 2,
            classes: [
                'Energy',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'atom_eve_molecule_shield_defense',
                    duration: 1,
                    scope: 'all-allies',
                    metadata: {
                        destructibleDefensePoints: 20,
                        mergeNumericAddKeys: ['destructibleDefensePoints'],
                        hideTooltipFromEnemy: true,
                        tooltipTextTemplate: 'This character has {destructibleDefensePoints} destructible defense.'
                    }
                }
            ]
        },
        {
            id: 'atom-eve-molecule-battle-armor',
            name: 'Molecule Battle Armor',
            skillimage: 'https://i.imgur.com/rwhfkYI.png',
            skilldescription: 'Eve may use this on herself or an ally. Grants the target 20 points of damage reduction for 3 turns.',
            energy: [
                'Random'
            ],
            target: 'self-or-single-ally',
            damage: 0,
            cooldown: 4,
            classes: [
                'Energy',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'atom_eve_molecule_battle_armor',
                    duration: 3,
                    scope: 'target',
                    metadata: {
                        damageReductionFlat: 20,
                        mergeNumericAddKeys: ['damageReductionFlat'],
                        tooltipTextTemplate: 'This character has {damageReductionFlat} damage reduction.'
                    }
                }
            ]
        },
        {
            id: 'atom-eve-passive-near-death-awakening',
            name: 'Passive: Near Death Awakening',
            skillimage: 'https://i.imgur.com/2GW1mrj.png',
            skilldescription: 'When Eve is killed, her health is set to 50 HP for 2 turns. Each turn, she loses 25 HP and all her skills become \'Molecular Deconstruction Beam\'.',
            energy: [],
            target: 'self',
            damage: 0,
            cooldown: 0,
            classes: [
                'Passive',
                'Instant'
            ]
        },
        {
            id: 'atom-eve-molecular-deconstruction-beam',
            name: 'Molecular Deconstruction Beam',
            hiddenFromSelectionViewer: true,
            skillimage: 'https://i.imgur.com/lT7gHa3.png',
            skilldescription: 'Deals 35 affliction damage to one enemy. This skill cannot be ignored.',
            energy: [
                'Random',
                'Random'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 0,
            classes: [
                'Energy',
                'Ranged',
                'Instant',
                'Affliction'
            ],
            effects: [
                {
                    type: 'damage',
                    amount: 35,
                    scope: 'target',
                    metadata: {
                        afflictionDamage: true,
                        ignoreDamageReduction: true,
                        ignoreDestructibleDefense: true
                    }
                }
            ]
        }
    ]
},
    {
    id: 'omni-man',
    characterId: 'omni-man',
    name: 'Omni-Man',
    facePicture: 'https://i.imgur.com/YwXook2.png',
    characterdeescription: 'Omni-Man dominates the battlefield through overwhelming force and relentless punishment, thriving in direct confrontation where he can dismantle enemies over time. Rather than relying on burst or utility alone, he pressures opponents with sustained damage, disruptive control, and permanent stat reduction that weakens enemies the longer the fight continues. With abilities that force engagement and punish enemy actions, Omni-Man excels at drawing attention and turning it into an advantage. As he takes damage, his power escalates, transforming him into an increasingly dangerous threat that cannot be ignored.',
    startStatuses: [
        {
            statusId: 'omni_man_passive_omni_rage',
            sourceSkillId: 'omni-man-passive-omni-rage',
            duration: 99,
            metadata: {
                infiniteDuration: true,
                onTeamMemberDamageTakenApplyStatusToOwner: {
                    statusId: 'omni_man_passive_omni_rage_damage_bonus',
                    duration: 99,
                    ownerOnly: true,
                    enemyOnly: true,
                    nonAfflictionOnly: true,
                    metadata: {
                        infiniteDuration: true,
                        damageBonusFlat: 5,
                        mergeNumericAddKeys: ['damageBonusFlat'],
                        tooltipTextTemplate: 'Omni-Man deals {damageBonusFlat} additional damage.'
                    }
                },
                tooltipText: 'Omni-Man gains 5 additional damage each time he receives new enemy non-affliction damage.'
            }
        }
    ],
    skills: [
        {
            id: 'omni-man-omni-headbutt',
            name: 'Omni-Headbutt',
            skillimage: 'https://i.imgur.com/gVtgAob.png',
            skilldescription: 'Omni-Man headbutts one enemy, dealing 15 damage and stunning their harmful skills for 1 turn.',
            energy: [
                'Random',
                'Random'
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
                    amount: 15,
                    scope: 'target'
                },
                {
                    type: 'apply_status',
                    statusId: 'omni_man_omni_headbutt_harmful_stun',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        cannotUseHarmfulSkills: true,
                        tooltipText: 'This character harmful skills are stunned.'
                    }
                }
            ]
        },
        {
            id: 'omni-man-omni-bisect',
            name: 'Omni-Bisect',
            skillimage: 'https://i.imgur.com/sZ1V2HR.png',
            skilldescription: 'Omni-Man rips one enemy in half, dealing 30 piercing damage and permanently reducing their non-affliction damage by 5 (stacks).',
            energy: [
                'Bloodline',
                'Genjutsu'
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
                    amount: 30,
                    scope: 'target',
                    metadata: {
                        ignoreDamageReduction: true,
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'omni_man_omni_bisect_debuff',
                    duration: 99,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        infiniteDuration: true,
                        NonAfflictionDamageDebuff: 5,
                        mergeNumericAddKeys: ['NonAfflictionDamageDebuff'],
                        tooltipTextTemplate: 'This character deals {NonAfflictionDamageDebuff} less non-affliction damage.'
                    }
                }
            ]
        },
        {
            id: 'omni-man-omni-rush',
            name: 'Omni-Rush',
            skillimage: 'https://i.imgur.com/nOu6M16.png',
            skilldescription: 'Omni-Man gains 50% unpierceable damage reduction and taunts one enemy for 1 turn. This ignores invulnerability. This cannot be used on an enemy that had this skill used on them last turn.',
            energy: [
                'Bloodline'
            ],
            ignoreInvulnerability: true,
            target: 'single-enemy',
            targetCondition: {
                missingStatusId: 'omni_man_omni_rush_recent_target'
            },
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
                    statusId: 'omni_man_omni_rush_defense',
                    duration: 1,
                    scope: 'self',
                    metadata: {
                        unpierceableDamageReductionFlat: 50,
                        tooltipText: 'Omni-Man has 50 unpierceable damage reduction.'
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'omni_man_omni_rush_taunt',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        taunt: true,
                        turnDurationAnchor: 'source_turn',
                        tooltipText: 'This character is taunted and can only target Omni-Man.'
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'omni_man_omni_rush_recent_target',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        turnDurationAnchor: 'source_turn',
                        tooltipText: 'Omni-Rush cannot target this character this turn.'
                    }
                }
            ]
        },
        {
            id: 'omni-man-omni-guard',
            name: 'Omni-Guard',
            hiddenFromSelectionViewer: true,
            skillimage: 'https://i.imgur.com/CfSDPu2.png',
            skilldescription: 'Omni-Man targets one enemy for 1 turn, countering them if they use a new harmful skill. If successful, Omni-Man deals 10 additional damage permanently. This skill is invisible.',
            energy: [
                'Random'
            ],
            target: 'single-enemy',
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
                    statusId: 'omni_man_omni_guard_trap',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        triggerOnEnemyHarmfulSkill: true,
                        counterCancelsSkill: true,
                        counterApplyStatusToSourceOwner: {
                            statusId: 'omni_man_omni_guard_damage_bonus',
                            duration: 99,
                            metadata: {
                                infiniteDuration: true,
                                damageBonusFlat: 10,
                                mergeNumericAddKeys: ['damageBonusFlat'],
                                tooltipTextTemplate: 'Omni-Man deals {damageBonusFlat} additional damage.'
                            }
                        },
                        hideTooltipFromEnemy: true,
                        tooltipText: 'If this character uses a new harmful skill this turn, it is countered and Omni-Man gains 10 additional damage permanently.'
                    }
                }
            ]
        },
        {
            id: 'omni-man-passive-omni-rage',
            name: 'Passive: Omni-Rage',
            skillimage: 'https://i.imgur.com/3kXPrrT.png',
            skilldescription: 'Omni-Man will deal 5 additional damage every time he receives new enemy non-affliction damage (stacks). This skill is permanent.',
            energy: [],
            target: '',
            damage: 0,
            cooldown: 0,
            classes: [
                'Passive',
                'Instant'
            ]
        }
    ]
},
    {
    id: 'angstrom-levy',
    characterId: 'angstrom-levy',
    name: 'Angstrom Levy',
    facePicture: 'https://i.imgur.com/Rg974iR.png',
    characterdeescription: 'Levy controls the tempo of combat by manipulating space and timing. His portals counter enemy abilities, banish priority targets, and create openings for his team to strike safely. Enemies who act without caution risk being erased from the battlefield entirely, making Angstrom a constant threat to coordinated teams.',
    skills: [
        {
            id: 'angstrom-levy-spy-drones',
            name: 'Spy Drones',
            skillimage: 'https://i.imgur.com/Wyhuo5P.png',
            skilldescription: 'For 2 turns, deals 10 normal and 10 piercing damage to one enemy each turn. \'Sneaky Portal\' will instantly cast \'Dimension Abandon\' on an enemy affected by this skill.',
            energy: [
                'Bloodline',
                'Random'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 1,
            classes: [
                'Physical',
                'Ranged',
                'Action'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'angstrom_levy_spy_drones_damage',
                    duration: 2,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        turnEndTrigger: 'source_turn',
                        turnDurationAnchor: 'source_turn',
                        turnEndDamage: 10,
                        tooltipText: 'This character takes 10 damage and 10 piercing damage from Spy Drones each turn.'
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'angstrom_levy_spy_drones_piercing_damage',
                    duration: 2,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        turnEndTrigger: 'source_turn',
                        turnDurationAnchor: 'source_turn',
                        turnEndDamage: 10,
                        ignoreTargetDamageReduction: true,
                        ignoreTargetDestructibleDefense: true,
                        tooltipText: 'This character takes 10 piercing damage from Spy Drones each turn.'
                    }
                }
            ]
        },
        {
            id: 'angstrom-levy-sneaky-portal',
            name: 'Sneaky Portal',
            skillimage: 'https://i.imgur.com/Lafh95q.png',
            skilldescription: 'Targets one enemy for 1 turn, and if they use a new harmful skill they will be countered. If successful, \'Dimension Abandon\' will be cast on the target. This skill is invisible.',
            energy: [
                'Taijutsu'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 2,
            classes: [
                'Energy',
                'Ranged',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'angstrom_levy_dimension_abandon_banish',
                    duration: 1,
                    scope: 'target',
                    condition: {
                        statusIdsAny: [
                            'angstrom_levy_spy_drones_damage',
                            'angstrom_levy_spy_drones_piercing_damage'
                        ],
                        scope: 'target'
                    },
                    metadata: {
                        harmful: true,
                        banished: true,
                        tooltipText: 'This character is banished and is treated as if dead until this effect ends.'
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'angstrom_levy_sneaky_portal_trap',
                    duration: 1,
                    scope: 'target',
                    condition: {
                        missingStatusId: 'angstrom_levy_spy_drones_damage',
                        scope: 'target'
                    },
                    metadata: {
                        triggerOnEnemyHarmfulSkill: true,
                        counterCancelsSkill: true,
                        counterStatusId: 'angstrom_levy_dimension_abandon_banish',
                        counterStatusDuration: 1,
                        counterStatusMetadata: {
                            harmful: true,
                            banished: true,
                            tooltipText: 'This character is banished and is treated as if dead until this effect ends.'
                        },
                        hideTooltipFromEnemy: true,
                        tooltipText: 'If this character uses a new harmful skill this turn, it is countered and they are banished for 1 turn.'
                    }
                }
            ]
        },
        {
            id: 'angstrom-levy-multi-dimensional-rifts',
            name: 'Multi-Dimensional Rifts',
            skillimage: 'https://i.imgur.com/oEhNlWW.png',
            skilldescription: 'For 2 turns, \'Sneaky Portal\' is cast on one random enemy each turn and \'Portal Save\' has its cooldown reset. While active, \'Spy Drones\' will have no cooldown. This skill is invisible.',
            energy: [
                'Taijutsu',
                'Taijutsu',
                'Random'
            ],
            target: 'self',
            damage: 0,
            cooldown: 5,
            classes: [
                'Energy',
                'Ranged',
                'Instant'
            ],
            effects: [
                {
                    type: 'modify_cooldowns',
                    amount: 0,
                    operation: 'set',
                    skillIds: ['angstrom-levy-portal-save'],
                    scope: 'self'
                },
                {
                    type: 'apply_status',
                    statusId: 'angstrom_levy_multi_dimensional_rifts_active',
                    duration: 2,
                    scope: 'self',
                    metadata: {
                        turnDurationAnchor: 'source_turn',
                        skillReplacements: {
                            'angstrom-levy-spy-drones': 'angstrom-levy-spy-drones-rifts'
                        },
                        turnEndApplyStatusesToRandomEnemy: [
                            {
                                statusId: 'angstrom_levy_dimension_abandon_banish',
                                duration: 1,
                                condition: {
                                    scope: 'target',
                                    statusIdsAny: [
                                        'angstrom_levy_spy_drones_damage',
                                        'angstrom_levy_spy_drones_piercing_damage'
                                    ]
                                },
                                metadata: {
                                    harmful: true,
                                    banished: true,
                                    tooltipText: 'This character is banished and is treated as if dead until this effect ends.'
                                }
                            },
                            {
                                statusId: 'angstrom_levy_sneaky_portal_trap',
                                duration: 1,
                                condition: {
                                    scope: 'target',
                                    missingStatusId: 'angstrom_levy_spy_drones_damage'
                                },
                                metadata: {
                                    triggerOnEnemyHarmfulSkill: true,
                                    counterCancelsSkill: true,
                                    counterStatusId: 'angstrom_levy_dimension_abandon_banish',
                                    counterStatusDuration: 1,
                                    counterStatusMetadata: {
                                        harmful: true,
                                        banished: true,
                                        tooltipText: 'This character is banished and is treated as if dead until this effect ends.'
                                    },
                                    hideTooltipFromEnemy: true,
                                    tooltipText: 'If this character uses a new harmful skill this turn, it is countered and they are banished for 1 turn.'
                                }
                            }
                        ],
                        turnEndModifyCooldownsSelf: {
                            operation: 'set',
                            amount: 0,
                            skillIds: ['angstrom-levy-portal-save']
                        },
                        tooltipText: 'Each turn, Sneaky Portal is applied to one random enemy, Portal Save has its cooldown reset, and Spy Drones has no cooldown.'
                    }
                }
            ]
        },
        {
            id: 'angstrom-levy-portal-save',
            name: 'Portal Save',
            skillimage: 'https://i.imgur.com/xoNB4ZG.png',
            skilldescription: 'This skill makes Angstrom Levy or an ally invulnerable for 1 turn.',
            energy: [
                'Random'
            ],
            target: 'self-or-single-ally',
            damage: 0,
            cooldown: 4,
            classes: [
                'Energy',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'angstrom_levy_portal_save_invulnerable',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        invulnerable: true,
                        tooltipText: 'This character is invulnerable.'
                    }
                }
            ]
        },
        {
            id: 'angstrom-levy-dimension-abandon',
            name: 'Dimension Abandon',
            hiddenFromSelectionViewer: true,
            skillimage: 'https://i.imgur.com/JK3dEhh.png',
            skilldescription: 'This character is Banished for 1 turn. Banished characters are treated as if they are dead.',
            energy: [],
            target: 'single-enemy',
            damage: 0,
            cooldown: 0,
            classes: [
                'Energy',
                'Ranged',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'angstrom_levy_dimension_abandon_banish',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        banished: true,
                        tooltipText: 'This character is banished and is treated as if dead until this effect ends.'
                    }
                }
            ]
        },
                {
            id: 'angstrom-levy-spy-drones-rifts',
            name: 'Spy Drones',
            hiddenFromSelectionViewer: true,
            skillimage: 'https://i.imgur.com/Wyhuo5P.png',
            skilldescription: 'For 2 turns, deals 10 normal and 10 piercing damage to one enemy each turn. \'Sneaky Portal\' will instantly cast \'Dimension Abandon\' on an enemy affected by this skill. This skill has no cooldown while Multi-Dimensional Rifts is active.',
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
                'Action'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'angstrom_levy_spy_drones_damage',
                    duration: 2,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        turnEndTrigger: 'source_turn',
                        turnDurationAnchor: 'source_turn',
                        turnEndDamage: 10,
                        tooltipText: 'This character takes 10 damage and 10 piercing damage from Spy Drones each turn.'
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'angstrom_levy_spy_drones_piercing_damage',
                    duration: 2,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        turnEndTrigger: 'source_turn',
                        turnDurationAnchor: 'source_turn',
                        turnEndDamage: 10,
                        ignoreTargetDamageReduction: true,
                        ignoreTargetDestructibleDefense: true,
                        tooltipText: 'This character takes 10 piercing damage from Spy Drones each turn.'
                    }
                }
            ]
        },
    ]
},
    {
    id: 'doctor-octopus',
    characterId: 'doctor-octopus',
    name: 'Doctor Octopus',
    facePicture: 'https://i.imgur.com/0rcAM48.png',
    startStatuses: [
        {
            statusId: 'doctor_octopus_mechanical_tentacles',
            sourceSkillId: 'doctor-octopus-passive-mechanical-tentacles',
            duration: 99,
            metadata: {
                infiniteDuration: true,
                stackMetadataKey: 'mechanicalTentacles',
                mechanicalTentacles: 4,
                stackDerivedNumericKeys: {
                    damageReductionFlat: 4
                },
                onOwnerDamagedByBaseDamageAtLeastApplyStatusToOwner: {
                    statusId: 'doctor_octopus_mechanical_tentacles',
                    duration: 99,
                    threshold: 30,
                    enemyOnly: true,
                    oncePerSourceSkillPerTurn: true,
                    metadata: {
                        stackMetadataKey: 'mechanicalTentacles',
                        stackDelta: -1,
                        stackDerivedNumericKeys: {
                            damageReductionFlat: 4
                        },
                        tooltipTextTemplate: 'Doctor Octopus has {mechanicalTentacles} Mechanical Tentacles and {damageReductionFlat} damage reduction.'
                    }
                },
                tooltipTextTemplate: 'Doctor Octopus has {mechanicalTentacles} Mechanical Tentacles and {damageReductionFlat} damage reduction.'
            }
        }
    ],
    characterdeescription: 'Play Doctor Octopus as a strategic controller—manage your tentacles wisely, disrupt at the right moments, and outmaneuver your opponents through superior planning. Doctor Octopus dominates the battlefield through calculated control and mechanical superiority. His ever-present tentacles enhance his resilience and empower his abilities, allowing him to pressure enemies while protecting himself and his team.',
    skills: [
        {
            id: 'doctor-octopus-tentacle-assault',
            name: 'Tentacle Assault',
            skillimage: 'https://i.imgur.com/ooC0I7y.png',
            skilldescription: 'Deals 8 piercing damage plus 4 damage per Mechanical Tentacle to one enemy and taunts them for 1 turn.',
            energy: [
                'Ninjutsu'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 1,
            classes: [
                'Physical',
                'Ranged',
                'Instant'
            ],
            effects: [
                {
                    type: 'damage',
                    amount: 8,
                    scope: 'target',
                    metadata: {
                        ignoreDamageReduction: true,
                        bonusPerStatusMetadata: {
                            statusId: 'doctor_octopus_mechanical_tentacles',
                            metadataKey: 'mechanicalTentacles',
                            multiplier: 4,
                            scope: 'self'
                        }
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'doctor_octopus_tentacle_assault_taunt',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        taunt: true,
                        tooltipText: 'This character is taunted and can only target Doctor Octopus.'
                    }
                }
            ]
        },
        {
            id: 'doctor-octopus-tentacle-manipulation',
            name: 'Tentacle Manipulation',
            skillimage: 'https://i.imgur.com/h0WxoR6.png',
            skilldescription: 'Deals 24 damage to one enemy and stuns their non-mental skills for 1 turn. If Doctor Octopus has 4 Mechanical Tentacles, the target\'s harmful skills are silenced for 1 turn.',
            energy: [
                'Random',
                'Random'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 2,
            classes: [
                'Physical',
                'Ranged',
                'Instant'
            ],
            effects: [
                {
                    type: 'damage',
                    amount: 24,
                    scope: 'target'
                },
                {
                    type: 'apply_status',
                    statusId: 'doctor_octopus_tentacle_manipulation_stun',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        cannotUseNonMentalSkills: true,
                        tooltipText: 'This character non-mental skills are stunned.'
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'doctor_octopus_tentacle_manipulation_silence',
                    duration: 1,
                    scope: 'target',
                    condition: {
                        scope: 'self',
                        statusMetadataAtLeast: {
                            statusId: 'doctor_octopus_mechanical_tentacles',
                            metadataKey: 'mechanicalTentacles',
                            value: 4
                        }
                    },
                    metadata: {
                        harmful: true,
                        silenceNonDamageEffects: true,
                        tooltipText: 'Silenced: only damage from this character\'s skills will work.'
                    }
                }
            ]
        },
        {
            id: 'doctor-octopus-tentacle-strangulation',
            name: 'Tentacle Strangulation',
            skillimage: 'https://i.imgur.com/DvOD11W.png',
            skilldescription: 'Silences one enemy\'s harmful skills for 1 turn and deals 4 damage plus 4 damage per Mechanical Tentacle.',
            energy: [
                'Random'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 1,
            classes: [
                'Physical',
                'Ranged',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'doctor_octopus_tentacle_strangulation_silence',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        silenceNonDamageEffects: true,
                        tooltipText: 'Silenced: only damage from this character\'s skills will work.'
                    }
                },
                {
                    type: 'damage',
                    amount: 4,
                    scope: 'target',
                    metadata: {
                        bonusPerStatusMetadata: {
                            statusId: 'doctor_octopus_mechanical_tentacles',
                            metadataKey: 'mechanicalTentacles',
                            multiplier: 4,
                            scope: 'self'
                        }
                    }
                }
            ]
        },
        {
            id: 'doctor-octopus-tentacle-parry',
            name: 'Tentacle Parry',
            skillimage: 'https://i.imgur.com/PnLSTOC.png',
            skilldescription: 'Doctor Octopus grants his team 4 points of destructible defense per Mechanical Tentacle for 1 turn. If an enemy uses a new harmful skill on his team next turn, they are taunted for 1 turn.',
            energy: [
                'Random'
            ],
            target: 'all-allies',
            damage: 0,
            cooldown: 3,
            classes: [
                'Physical',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'doctor_octopus_tentacle_parry_defense',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        scaleFromSourceStatusMetadata: {
                            statusId: 'doctor_octopus_mechanical_tentacles',
                            metadataKey: 'mechanicalTentacles',
                            multiplier: 4,
                            targetKeys: ['destructibleDefensePoints']
                        },
                        destructibleDefensePoints: 0,
                        tooltipTextTemplate: 'This character has {destructibleDefensePoints} destructible defense.'
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'doctor_octopus_tentacle_parry_trap',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        triggerOnEnemyHarmfulSkill: true,
                        counterStatusId: 'doctor_octopus_tentacle_parry_taunt',
                        counterStatusDuration: 1,
                        counterStatusMetadata: {
                            harmful: true,
                            taunt: true,
                            tooltipText: 'This character is taunted and can only target Doctor Octopus.'
                        },
                        hideTooltipFromEnemy: true,
                        tooltipText: 'If an enemy uses a new harmful skill on this character next turn, they are taunted for 1 turn.'
                    }
                }
            ]
        },
        {
            id: 'doctor-octopus-passive-mechanical-tentacles',
            name: 'Passive: Mechanical Tentacles',
            skillimage: 'https://i.imgur.com/wYhb8lf.png',
            skilldescription: 'Doctor Octopus starts the game with 4 Mechanical Tentacles. Each one grants him 4 points of damage reduction. Every time a skill with base damage of 30 or more is used on him, he loses 1 Mechanical Tentacle.',
            energy: [],
            target: '',
            damage: 0,
            cooldown: 0,
            classes: [
                'Passive',
                'Instant'
            ]
        }
    ]
},
    {
    id: 'carnage',
    characterId: 'carnage',
    name: 'Carnage',
    facePicture: 'https://i.imgur.com/ECJOkvk.png',
    startStatuses: [
        {
            statusId: 'carnage_passive_blood_bonded',
            sourceSkillId: 'carnage-passive-blood-bonded',
            duration: 99,
            metadata: {
                infiniteDuration: true,
                minimumHp: 1,
                onOwnerUseSkillTrigger: true,
                persistOnOwnerUseSkillTrigger: true,
                onOwnerUseSkillApplyStatusToOwnerCondition: {
                    scope: 'self',
                    statusIdsAny: [
                        'carnage_blood_bonded_trigger_blood_slash',
                        'carnage_blood_bonded_trigger_wide_area_cutting',
                        'carnage_blood_bonded_trigger_blood_slinging'
                    ]
                },
                onOwnerUseSkillApplyStatusToOwner: {
                    statusId: 'carnage_blood_bonded_defense',
                    duration: 1,
                    metadata: {
                        destructibleDefensePoints: 15,
                        tooltipTextTemplate: 'Carnage has {destructibleDefensePoints} destructible defense from Blood-Bonded.'
                    }
                },
                tooltipText: 'All health lost from Carnage\'s skills is given to him in the same amount as destructible defense for 1 turn. Carnage\'s skills cannot kill him.'
            }
        }
    ],
    characterdeescription: 'Play Carnage as a high-risk finisher—wait for the right moment, then unleash unstoppable carnage. Carnage thrives in chaos, trading his own life force for overwhelming offense. His attacks are relentless and impossible to stop, carving through enemies while setting up lethal execution windows. Through Blood Slinging, he becomes evasive and unpredictable, striking at the perfect moment to finish off weakened foes.',
    skills: [
        {
            id: 'carnage-blood-slash',
            name: 'Blood Slash',
            skillimage: 'https://i.imgur.com/f69xBeL.png',
            skilldescription: 'Deals 35 piercing damage to one enemy. Carnage loses 15 HP. This skill cannot be countered or reflected. This executes enemies that fall to 15 HP or less during \'Blood Slinging\'.',
            energy: [
                'Bloodline',
                'Random'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 1,
            classes: [
                'Physical',
                'Melee',
                'Instant'
            ],
            cannotBeCountered: true,
            effects: [
                {
                    type: 'damage',
                    amount: 35,
                    scope: 'target',
                    metadata: {
                        ignoreDamageReduction: true,
                        ignoreDestructibleDefense: true
                    }
                },
                {
                    type: 'HealthLoss',
                    amount: 15,
                    scope: 'self'
                },
                {
                    type: 'apply_status',
                    statusId: 'carnage_blood_bonded_trigger_blood_slash',
                    duration: 1,
                    scope: 'self',
                    metadata: {
                        hideTooltipFromUnitOwner: true,
                        hideTooltipFromEnemy: true,
                        tooltipText: 'Blood Slash triggered Blood-Bonded.'
                    }
                },
                {
                    type: 'execute_below_hp',
                    threshold: 15,
                    scope: 'target',
                    condition: {
                        statusId: 'carnage_blood_slinging_active',
                        scope: 'self'
                    },
                    metadata: {
                        cannotBeEvaded: true
                    }
                }
            ]
        },
        {
            id: 'carnage-wide-area-cutting',
            name: 'Wide-Area Cutting',
            skillimage: 'https://i.imgur.com/9H59XyW.png',
            skilldescription: 'Deals 25 piercing damage to the enemy team. Carnage loses 15 HP. This skill cannot be countered or reflected. This executes enemies that fall to 5 HP or less during \'Blood Slinging\'.',
            energy: [
                'Bloodline',
                'Random'
            ],
            target: 'all-enemy',
            damage: 0,
            cooldown: 2,
            classes: [
                'Physical',
                'Ranged',
                'Instant'
            ],
            cannotBeCountered: true,
            effects: [
                {
                    type: 'damage',
                    amount: 25,
                    scope: 'all-enemy',
                    metadata: {
                        ignoreDamageReduction: true,
                        ignoreDestructibleDefense: true
                    }
                },
                {
                    type: 'HealthLoss',
                    amount: 15,
                    scope: 'self'
                },
                {
                    type: 'apply_status',
                    statusId: 'carnage_blood_bonded_trigger_wide_area_cutting',
                    duration: 1,
                    scope: 'self',
                    metadata: {
                        hideTooltipFromUnitOwner: true,
                        hideTooltipFromEnemy: true,
                        tooltipText: 'Wide-Area Cutting triggered Blood-Bonded.'
                    }
                },
                {
                    type: 'execute_below_hp',
                    threshold: 5,
                    scope: 'all-enemy',
                    condition: {
                        statusId: 'carnage_blood_slinging_active',
                        scope: 'self'
                    },
                    metadata: {
                        cannotBeEvaded: true
                    }
                }
            ]
        },
        {
            id: 'carnage-brain-devour',
            name: 'Brain Devour',
            skillimage: 'https://i.imgur.com/HDzBQV8.png',
            skilldescription: 'Carnage steals 1 random energy and 15HP from one enemy. This costs 1 random energy during \'Blood Slinging\'.',
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
                    type: 'drain_chakra',
                    amount: 1,
                    chakraType: 'random',
                    scope: 'target'
                },
                {
                    type: 'damage',
                    amount: 15,
                    scope: 'target',
                    metadata: {
                        ignoreDamageReduction: true,
                        ignoreDestructibleDefense: true
                    }
                },
                {
                    type: 'heal',
                    amount: 15,
                    scope: 'self'
                }
            ]
        },
        {
            id: 'carnage-blood-slinging',
            name: 'Blood Slinging',
            skillimage: 'https://i.imgur.com/VANex95.png',
            skilldescription: 'This skill makes Carnage gain 40% Evasion for 2 turns. Carnage loses 15 HP.',
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
                    statusId: 'carnage_blood_slinging_active',
                    duration: 2,
                    scope: 'self',
                    metadata: {
                        evadeChancePercent: 40,
                        evadeAgainstNonMental: true,
                        skillCostOverridesBySkillId: {
                            'carnage-brain-devour': {
                                energy: ['Random']
                            }
                        },
                        tooltipText: 'Carnage has 40% evade chance against enemy non-mental skills and Brain Devour costs 1 random energy.'
                    }
                },
                {
                    type: 'HealthLoss',
                    amount: 15,
                    scope: 'self'
                },
                {
                    type: 'apply_status',
                    statusId: 'carnage_blood_bonded_trigger_blood_slinging',
                    duration: 1,
                    scope: 'self',
                    metadata: {
                        hideTooltipFromUnitOwner: true,
                        hideTooltipFromEnemy: true,
                        tooltipText: 'Blood Slinging triggered Blood-Bonded.'
                    }
                }
            ]
        },
        {
            id: 'carnage-passive-blood-bonded',
            name: 'Passive: Blood-Bonded',
            skillimage: 'https://i.imgur.com/VjHW4nb.png',
            skilldescription: 'All health lost from Carnage\'s skills is given to him in the same amount as destructible defense for 1 turn. Carnage\'s skills cannot kill him.',
            energy: [],
            target: '',
            damage: 0,
            cooldown: 0,
            classes: [
                'Passive',
                'Instant'
            ]
        }
    ]
},
    {
    id: 'the-green-goblin',
    characterId: 'the-green-goblin',
    name: 'The Green Goblin',
    facePicture: 'https://i.imgur.com/DvnhkRP.png',
    startStatuses: [
        {
            statusId: 'the_green_goblin_mad_bomber_passive',
            duration: 99,
            sourceSkillId: 'the-green-goblin-passive-mad-bomber',
            metadata: {
                infiniteDuration: true,
                tooltipText: 'Whenever one of Green Goblin\'s skills comes off cooldown, he has a 15% chance to plant a Bomb on a random enemy for 2 turns. If that enemy uses a harmful skill, or when the Bomb ends, Green Goblin deals 15 affliction damage to the enemy team.',
                onOwnerSkillCooldownFinishedApplyStatusToRandomEnemy: {
                    statusId: 'the_green_goblin_mad_bomber_bomb',
                    duration: 2,
                    chancePercent: 15,
                    sourceSkillId: 'the-green-goblin-passive-mad-bomber',
                    metadata: {
                        harmful: true,
                        triggerOnEnemyHarmfulSkill: true,
                        onExpireEffectsToEnemiesOfSource: [
                            {
                                type: 'damage',
                                amount: 15,
                                metadata: {
                                    afflictionDamage: true,
                                    ignoreDamageReduction: true,
                                    ignoreDestructibleDefense: true
                                }
                            }
                        ],
                        counterEffectsToEnemiesOfSource: [
                            {
                                type: 'damage',
                                amount: 15,
                                metadata: {
                                    afflictionDamage: true,
                                    ignoreDamageReduction: true,
                                    ignoreDestructibleDefense: true
                                }
                            }
                        ],
                        tooltipText: 'If this character uses a harmful skill, or when this effect ends, Green Goblin deals 15 affliction damage to the enemy team.'
                    }
                }
            }
        }
    ],
    characterdeescription: 'Green Goblin dominates the battlefield by turning every action into a risk, layering delayed threats that punish enemies for acting without caution. Rather than relying on direct control or overwhelming burst, he creates zones of danger through his bombs—forcing opponents to constantly weigh the consequences of every move.',
    skills: [
        {
            id: 'the-green-goblin-pumpkin-bomb',
            name: 'Pumpkin Bomb',
            skillimage: 'https://i.imgur.com/j7P6oI0.png',
            skilldescription: 'Deals 20 damage to one enemy and plants a Bomb on them for 2 turns. If the target uses a harmful skill → Bomb explodes (15 affliction damage to all enemies). If it expires → explodes anyway.',
            energy: [
                'Bloodline'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 2,
            classes: [
                'Energy',
                'Ranged',
                'Instant',
                'Affliction'
            ],
            effects: [
                {
                    type: 'damage',
                    amount: 20,
                    scope: 'target'
                },
                {
                    type: 'apply_status',
                    statusId: 'the_green_goblin_pumpkin_bomb',
                    duration: 2,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        triggerOnEnemyHarmfulSkill: true,
                        onExpireEffectsToEnemiesOfSource: [
                            {
                                type: 'damage',
                                amount: 15,
                                metadata: {
                                    afflictionDamage: true,
                                    ignoreDamageReduction: true,
                                    ignoreDestructibleDefense: true
                                }
                            }
                        ],
                        counterEffectsToEnemiesOfSource: [
                            {
                                type: 'damage',
                                amount: 15,
                                metadata: {
                                    afflictionDamage: true,
                                    ignoreDamageReduction: true,
                                    ignoreDestructibleDefense: true
                                }
                            }
                        ],
                        tooltipText: 'If this character uses a harmful skill, or when this effect ends, Green Goblin deals 15 affliction damage to the enemy team.'
                    }
                }
            ]
        },
        {
            id: 'the-green-goblin-carpet-bombing',
            name: 'Carpet Bombing',
            skillimage: 'https://i.imgur.com/eDPHpc8.png',
            skilldescription: 'Deals 10 damage to the enemy team and plants a Bomb on each of them for 2 turns. If the target uses a harmful skill → Bomb explodes (10 affliction damage to all enemies). If it expires → explodes anyway.',
            energy: [
                'Bloodline',
                'Random',
                'Random'
            ],
            target: 'all-enemy',
            damage: 0,
            cooldown: 3,
            classes: [
                'Energy',
                'Ranged',
                'Instant',
                'Affliction'
            ],
            effects: [
                {
                    type: 'damage',
                    amount: 10,
                    scope: 'all-enemy'
                },
                {
                    type: 'apply_status',
                    statusId: 'the_green_goblin_carpet_bomb',
                    duration: 2,
                    scope: 'all-enemy',
                    metadata: {
                        harmful: true,
                        triggerOnEnemyHarmfulSkill: true,
                        onExpireEffectsToEnemiesOfSource: [
                            {
                                type: 'damage',
                                amount: 10,
                                metadata: {
                                    afflictionDamage: true,
                                    ignoreDamageReduction: true,
                                    ignoreDestructibleDefense: true
                                }
                            }
                        ],
                        counterEffectsToEnemiesOfSource: [
                            {
                                type: 'damage',
                                amount: 10,
                                metadata: {
                                    afflictionDamage: true,
                                    ignoreDamageReduction: true,
                                    ignoreDestructibleDefense: true
                                }
                            }
                        ],
                        tooltipText: 'If this character uses a harmful skill, or when this effect ends, Green Goblin deals 10 affliction damage to the enemy team.'
                    }
                }
            ]
        },
        {
            id: 'the-green-goblin-glider-impale',
            name: 'Glider Impale',
            skillimage: 'https://i.imgur.com/Wg00OkV.png',
            skilldescription: 'Deals 25 damage to one enemy and makes them take 10 additional damage from all sources for 1 turn. If they are affected by a Bomb immediately detonate it.',
            energy: [
                'Random',
                'Random'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 2,
            classes: [
                'Physical',
                'Ranged',
                'Instant'
            ],
            effects: [
                {
                    type: 'damage',
                    amount: 25,
                    scope: 'target'
                },
                {
                    type: 'apply_status',
                    statusId: 'the_green_goblin_glider_impale_vulnerability',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        damageTakenBonusFlat: 10,
                        tooltipText: 'This character takes 10 additional damage from all sources.'
                    }
                },
                {
                    type: 'trigger_status_effects',
                    scope: 'target',
                    statusIdsAny: [
                        'the_green_goblin_pumpkin_bomb',
                        'the_green_goblin_carpet_bomb',
                        'the_green_goblin_mad_bomber_bomb'
                    ],
                    consumeMatchedStatus: true
                }
            ]
        },
        {
            id: 'the-green-goblin-glider-flight',
            name: 'Glider Flight',
            skillimage: 'https://i.imgur.com/vcMHrD9.png',
            skilldescription: 'This skill makes The Green Goblin invulnerable for 1 turn and reduces his active cooldowns by 1.',
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
                    statusId: 'the_green_goblin_glider_flight',
                    duration: 1,
                    scope: 'self',
                    metadata: {
                        invulnerable: true,
                        tooltipText: 'Green Goblin is invulnerable.'
                    }
                },
                {
                    type: 'modify_cooldowns',
                    amount: -1,
                    includeAllCharacterSkills: true,
                    scope: 'self'
                }
            ]
        },
        {
            id: 'the-green-goblin-passive-mad-bomber',
            name: 'Passive: Mad Bomber',
            skillimage: 'https://i.imgur.com/oAcpnSv.png',
            skilldescription: 'The Green Goblin has a 15% chance to toss a Bomb onto a random enemy for 2 turns whenever he has a skill come off of cooldown. If the target uses a harmful skill → Bomb explodes (15 affliction damage AoE). If it expires → explodes anyway.',
            energy: [],
            target: '',
            damage: 0,
            cooldown: 0,
            classes: [
                'Passive',
                'Instant'
            ]
        }
    ]
},
    {
    id: 'sandman',
    characterId: 'sandman',
    name: 'Sandman',
    facePicture: 'https://i.imgur.com/pJj5Wz0.png',
    characterdeescription: 'Sandman excels at isolating key enemies and forcing them into unfavorable situations, using his shifting form to control engagements and dictate the flow of combat. Rather than overwhelming entire teams, he focuses on a single target—marking them, limiting their effectiveness, and isetting up unavoidable punishment through well-timed ability sequences.',
    skills: [
        {
            id: 'sandman-sand-body-enter',
            name: 'Sand Body Enter',
            skillimage: 'https://i.imgur.com/jyd0lvn.png',
            skilldescription: 'Sandman marks an enemy for 1 turn. During this time, Sandman is invulnerable and this swaps to \'Sand Body Exit\'.',
            energy: [
                'Genjutsu'
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
                    statusId: 'sandman_sand_body_mark',
                    duration: 2,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        turnDurationAnchor: 'source_turn',
                        tooltipText: 'This character is marked by Sand Body Enter.'
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'sandman_sand_body_enter_active',
                    duration: 2,
                    scope: 'self',
                    metadata: {
                        invulnerable: true,
                        skillReplacementsByRemainingTurns: {
                            '2': {
                                'sandman-sand-body-enter': 'sandman-sand-body-exit'
                            },
                            '1': {
                                'sandman-sand-body-exit': 'sandman-sand-body-enter'
                            }
                        },
                        tooltipText: 'Sandman is invulnerable and Sand Body Enter is replaced by Sand Body Exit.'
                    }
                }
            ]
        },
        {
            id: 'sandman-sand-clone-counter',
            name: 'Sand Clone Counter',
            skillimage: 'https://i.imgur.com/8g6oZlb.png',
            skilldescription: 'Target an ally, granting them 20 destructible defense and himself 10 destructible defense for 1 turn. Sandman and the Ally will swap places. This skill is invisible to the enemy for 1 turn.',
            energy: [
                'Genjutsu'
            ],
            target: 'ally',
            damage: 0,
            cooldown: 2,
            classes: [
                'Physical',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'sandman_sand_clone_counter_ally_defense',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        destructibleDefensePoints: 20,
                        tooltipText: 'This character has 20 destructible defense.'
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'sandman_sand_clone_counter_self_defense',
                    duration: 1,
                    scope: 'self',
                    metadata: {
                        destructibleDefensePoints: 10,
                        hideTooltipFromEnemy: true,
                        tooltipText: 'Sandman has 10 destructible defense.'
                    }
                },
                {
                    type: 'swap_positions',
                    scope: 'target'
                },
                {
                    type: 'apply_status',
                    statusId: 'sandman_sand_clone_counter_hidden',
                    duration: 1,
                    scope: 'self',
                    metadata: {
                        hideTooltipFromEnemy: true,
                        tooltipText: 'This skill is invisible.'
                    }
                }
            ]
        },
        {
            id: 'sandman-sand-smothering',
            name: 'Sand Smothering',
            skillimage: 'https://i.imgur.com/AUkTp1z.png',
            skilldescription: 'For 2 turns, one enemy has their non-affliction damage reduced by 10 and takes 15 damage each turn.',
            energy: [
                'Random',
                'Random'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 1,
            classes: [
                'Physical',
                'Melee',
                'Action'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'sandman_sand_smothering',
                    duration: 2,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        nonAfflictionDamageDebuffFlat: 10,
                        turnEndDamage: 15,
                        tooltipText: 'This character deals 10 less non-affliction damage and takes 15 damage each turn.'
                    }
                }
            ]
        },
        {
            id: 'sandman-body-of-sand',
            name: 'Body of Sand',
            skillimage: 'https://i.imgur.com/nzJlnhN.png',
            skilldescription: 'Sandman ignores all enemy physical skills for 2 turns. This effect is invisible on its first turn.',
            energy: [
                'Random',
                'Random'
            ],
            target: 'self',
            damage: 0,
            cooldown: 5,
            classes: [
                'Physical',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'sandman_body_of_sand_active',
                    duration: 2,
                    scope: 'self',
                    metadata: {
                        ignoreEnemyPhysicalSkills: true,
                        ignoreSkillClasses: ['physical'],
                        hideTooltipFromEnemy: true,
                        tooltipText: 'Sandman ignores enemy physical skills.'
                    }
                }
            ]
        },
        {
            id: 'sandman-sand-body-exit',
            name: 'Sand Body Exit',
            skillimage: 'https://i.imgur.com/LLIk8Nu.png',
            skilldescription: 'Deals 45 affliction damage to the enemy marked by \'Sand Body Enter\'. This skill ignores invulnerability and cannot be reflected.',
            energy: [
                'Genjutsu',
                'Random'
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
            cannotBeReflected: true,
            ignoreInvulnerability: true,
            effects: [
                {
                    type: 'damage',
                    amount: 45,
                    scope: 'target',
                    condition: {
                        statusId: 'sandman_sand_body_mark',
                        scope: 'target'
                    },
                    metadata: {
                        afflictionDamage: true,
                        ignoreDamageReduction: true,
                        ignoreDestructibleDefense: true
                    }
                },
                {
                    type: 'cleanse_statuses',
                    scope: 'target',
                    statusId: 'sandman_sand_body_mark',
                    count: 0
                }
            ]
        }
    ]
},
    {
    id: 'mysterio',
    characterId: 'mysterio',
    name: 'Mysterio',
    facePicture: 'https://i.imgur.com/QOsgmSs.png',
    characterdeescription: 'Mysterio excels at destabilizing the battlefield through deception, punishing enemies for acting without caution. Rather than directly overpowering opponents, he manipulates outcomes—redirecting abilities, setting hidden traps, and turning enemy decisions against them. With tools that reward prediction and punish routine play.',
    skills: [
        {
            id: 'mysterio-illusion-of-choice',
            name: 'Illusion of Choice',
            skillimage: 'https://i.imgur.com/L6xYXGc.png',
            skilldescription: 'Mysterio targets one enemy for 1 turn. During this time, their next harmful skill will be reflected to a random enemy and their next helpful skill will be re-directed to a random ally. This skill is invisible.',
            energy: [
                'Genjutsu'
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
                    statusId: 'mysterio_illusion_of_choice_reflect',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        hideTooltipFromEnemy: true,
                        reflectNextIncomingSkill: true,
                        reflectOnlyHarmfulSkills: true,
                        reflectToRandomCasterAlly: true,
                        tooltipText: 'The next harmful skill used on this character is reflected to a random enemy.'
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'mysterio_illusion_of_choice_helpful_blind',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        hideTooltipFromEnemy: true,
                        helpfulBlind: true,
                        tooltipText: 'The next helpful skill used on this character will target a random ally.'
                    }
                }
            ]
        },
        {
            id: 'mysterio-script-rewrite',
            name: 'Script Rewrite',
            skillimage: 'https://i.imgur.com/pt6KJHc.png',
            skilldescription: 'Mysterio targets one enemy for 2 turns. If they use a new harmful skill, they take 30 affliction damage, their cooldown is increased by 1, and this trap is consumed. This skill is invisible. This cannot be used on an already affected enemy.',
            energy: [
                'Ninjutsu'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 1,
            classes: [
                'Mental',
                'Ranged',
                'Instant',
                'Affliction'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'mysterio_script_rewrite_trap',
                    duration: 2,
                    scope: 'target',
                    metadata: {
                        harmful: true,
                        triggerOnEnemyHarmfulSkill: true,
                        counterCancelsSkill: true,
                        counterEffectsToSourceOwner: [
                            {
                                type: 'damage',
                                amount: 30,
                                metadata: {
                                    afflictionDamage: true,
                                    ignoreDamageReduction: true,
                                    ignoreDestructibleDefense: true
                                }
                            },
                            {
                                type: 'modify_cooldowns',
                                amount: 1,
                                metadata: {
                                    targetTriggeredSkillOnly: true
                                }
                            }
                        ],
                        hideTooltipFromEnemy: true,
                        tooltipText: 'If this character uses a new harmful skill, they take 30 affliction damage and that skill\'s cooldown increases by 1.'
                    }
                }
            ]
        },
        {
            id: 'mysterio-hall-of-mirrors',
            name: 'Hall of Mirrors',
            skillimage: 'https://i.imgur.com/MV1gA5Q.png',
            skilldescription: 'For 2 turns, your team gains 30% evasion. This skill is invisible on its first turn.',
            energy: [
                'Ninjutsu',
                'Genjutsu'
            ],
            target: 'all-allies',
            damage: 0,
            cooldown: 4,
            classes: [
                'Mental',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'mysterio_hall_of_mirrors_evasion',
                    duration: 2,
                    scope: 'all-allies',
                    metadata: {
                        hideTooltipFromEnemy: true,
                        turnDurationAnchor: 'source_turn',
                        evadeChancePercent: 30,
                        evadeAgainstNonMental: true,
                        tooltipText: 'This character has 30% evasion against enemy non-mental skills.'
                    }
                }
            ]
        },
        {
            id: 'mysterio-grand-illusion',
            name: 'Grand Illusion',
            skillimage: 'https://i.imgur.com/jGNjooo.png',
            skilldescription: 'Mysterio creates a “Decoy” for 2 turns. Decoy absorbs the next harmful skill used on Mysterio’s team and If destroyed → the enemy team has their damage reduced by 10 for 1 turn.',
            energy: [
                'Random'
            ],
            target: 'all-allies',
            damage: 0,
            cooldown: 4,
            classes: [
                'Mental',
                'Instant'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'mysterio_grand_illusion_decoy',
                    duration: 2,
                    scope: 'all-allies',
                    metadata: {
                        harmful: true,
                        triggerOnEnemyHarmfulSkill: true,
                        counterCancelsSkill: true,
                        statusGroupId: 'mysterio_grand_illusion_decoy',
                        removeStatusGroupIdsOnTrigger: ['mysterio_grand_illusion_decoy'],
                        counterEffectsToEnemiesOfSource: [
                            {
                                type: 'apply_status',
                                statusId: 'mysterio_grand_illusion_enemy_damage_debuff',
                                duration: 1,
                                metadata: {
                                    harmful: true,
                                    damageDebuffFlat: 10,
                                    tooltipText: 'This character deals 10 less damage.'
                                }
                            }
                        ],
                        hideTooltipFromEnemy: true,
                        tooltipText: 'The next harmful skill used on this character\'s team is absorbed. If the decoy is destroyed, the enemy team deals 10 less damage for 1 turn.'
                    }
                }
            ]
        }
    ]
},
    {
    id: 'scorpion',
    characterId: 'scorpion',
    name: 'Scorpion',
    facePicture: 'https://i.imgur.com/PLACEHOLDER.png',
    characterdeescription: 'Scorpion controls the battlefield through unpredictable venom cycles, forcing enemies to adapt to constantly shifting effects. His abilities layer affliction, disruption, and scaling damage, making him a dangerous threat the longer he remains active.',
    startStatuses: [
        {
            statusId: 'scorpion_passive_scorpion_venom',
            sourceSkillId: 'scorpion-passive-scorpion-venom',
            duration: 1,
            metadata: {
                randomizeMetadataKeyFromOptions: {
                    metadataKey: 'currentVenom',
                    options: ['Neurotoxin', 'Acid', 'Paralytic Agent']
                },
                turnEndRandomizeMetadataKeyFromOptions: {
                    metadataKey: 'currentVenom',
                    options: ['Neurotoxin', 'Acid', 'Paralytic Agent'],
                    excludeCurrentValue: true,
                    resetDuration: 1
                },
                hideTooltipFromEnemy: true,
                tooltipTextTemplate: 'Current venom: {currentVenom}'
            }
        }
    ],
    skills: [
        {
            id: 'scorpion-scorpion-sting',
            name: 'Scorpion Sting',
            skillimage: 'https://i.imgur.com/PLACEHOLDER.png',
            skilldescription: 'Deals 15 piercing damage to one enemy and injects them with Scorpion\'s current venom for 2 turns.\n\nNeurotoxin: Target ignores healing effects and deals 10 less non-affliction damage.\nAcid: Deals 10 affliction damage the first turn and 5 the second.\nParalytic Agent: Stuns harmful skills the first turn and helpful skills the second.',
            energy: [
                'Taijutsu'
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
                    amount: 15,
                    scope: 'target',
                    metadata: {
                        ignoreDamageReduction: true,
                        ignoreDestructibleDefense: true
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'scorpion_scorpion_sting_neurotoxin',
                    duration: 2,
                    scope: 'target',
                    condition: {
                        scope: 'self',
                        statusMetadataEquals: {
                            statusId: 'scorpion_passive_scorpion_venom',
                            metadataKey: 'currentVenom',
                            value: 'Neurotoxin'
                        }
                    },
                    metadata: {
                        healReceivedMultiplier: 0,
                        nonAfflictionDamageDebuffFlat: 10,
                        tooltipText: 'This character ignores healing and deals 10 less non-affliction damage.'
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'scorpion_scorpion_sting_acid_primary',
                    duration: 1,
                    scope: 'target',
                    condition: {
                        scope: 'self',
                        statusMetadataEquals: {
                            statusId: 'scorpion_passive_scorpion_venom',
                            metadataKey: 'currentVenom',
                            value: 'Acid'
                        }
                    },
                    metadata: {
                        turnEndDamage: 10,
                        afflictionDamage: true,
                        removeStatusIdsOnApply: ['scorpion_scorpion_sting_acid_secondary'],
                        onExpireApplyStatusToSelf: {
                            statusId: 'scorpion_scorpion_sting_acid_secondary',
                            duration: 1,
                            metadata: {
                                turnEndDamage: 5,
                                afflictionDamage: true,
                                tooltipText: 'This character takes 5 affliction damage each turn.'
                            }
                        },
                        tooltipText: 'This character takes 10 affliction damage each turn.'
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'scorpion_scorpion_sting_paralytic_primary',
                    duration: 1,
                    scope: 'target',
                    condition: {
                        scope: 'self',
                        statusMetadataEquals: {
                            statusId: 'scorpion_passive_scorpion_venom',
                            metadataKey: 'currentVenom',
                            value: 'Paralytic Agent'
                        }
                    },
                    metadata: {
                        cannotUseHarmfulSkills: true,
                        removeStatusIdsOnApply: ['scorpion_scorpion_sting_paralytic_secondary'],
                        onExpireApplyStatusToSelf: {
                            statusId: 'scorpion_scorpion_sting_paralytic_secondary',
                            duration: 1,
                            metadata: {
                                cannotUseHelpfulSkills: true,
                                tooltipText: 'This character cannot use helpful skills.'
                            }
                        },
                        tooltipText: 'This character cannot use harmful skills.'
                    }
                }
            ]
        },
        {
            id: 'scorpion-tail-laser',
            name: 'Tail Laser',
            skillimage: 'https://i.imgur.com/PLACEHOLDER.png',
            skilldescription: 'Targets an enemy with an effect depending on Scorpion\'s current venom.\n\nNeurotoxin: Deals 40 affliction damage and makes the target ignore helpful effects for 1 turn.\nAcid: Deals 15 affliction damage permanently (stacks).\nParalytic Agent: Deals 30 affliction damage and stuns physical and chakra skills for 2 turns.',
            energy: [
                'Taijutsu',
                'Taijutsu'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 0,
            classes: [
                'Chakra',
                'Ranged',
                'Instant',
                'Affliction'
            ],
            effects: [
                {
                    type: 'damage',
                    amount: 40,
                    scope: 'target',
                    condition: {
                        scope: 'self',
                        statusMetadataEquals: {
                            statusId: 'scorpion_passive_scorpion_venom',
                            metadataKey: 'currentVenom',
                            value: 'Neurotoxin'
                        }
                    },
                    metadata: {
                        afflictionDamage: true,
                        ignoreDamageReduction: true,
                        ignoreDestructibleDefense: true
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'scorpion_tail_laser_neurotoxin',
                    duration: 1,
                    scope: 'target',
                    condition: {
                        scope: 'self',
                        statusMetadataEquals: {
                            statusId: 'scorpion_passive_scorpion_venom',
                            metadataKey: 'currentVenom',
                            value: 'Neurotoxin'
                        }
                    },
                    metadata: {
                        invulnerableToHelpfulSkills: true,
                        tooltipText: 'This character ignores helpful skills.'
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'scorpion_tail_laser_acid_burn',
                    duration: 1,
                    scope: 'target',
                    condition: {
                        scope: 'self',
                        statusMetadataEquals: {
                            statusId: 'scorpion_passive_scorpion_venom',
                            metadataKey: 'currentVenom',
                            value: 'Acid'
                        }
                    },
                    metadata: {
                        afflictionDamage: true,
                        stackMetadataKey: 'acidStacks',
                        stackDelta: 1,
                        stackMax: 99,
                        stackDerivedNumericKeys: {
                            turnEndDamage: 15
                        },
                        turnEndDamage: 15,
                        tooltipTextTemplate: 'This character takes {turnEndDamage} affliction damage each turn.',
                        onExpireApplyStatusToSelf: {
                            statusId: 'scorpion_tail_laser_acid_burn',
                            duration: 1,
                            inheritSourceMetadata: true
                        }
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'scorpion_tail_laser_paralytic',
                    duration: 2,
                    scope: 'target',
                    condition: {
                        scope: 'self',
                        statusMetadataEquals: {
                            statusId: 'scorpion_passive_scorpion_venom',
                            metadataKey: 'currentVenom',
                            value: 'Paralytic Agent'
                        }
                    },
                    metadata: {
                        afflictionDamage: true,
                        cannotUseSkillClasses: ['physical', 'chakra'],
                        tooltipText: 'This character cannot use physical or chakra skills.'
                    }
                },
                {
                    type: 'damage',
                    amount: 30,
                    scope: 'target',
                    condition: {
                        scope: 'self',
                        statusMetadataEquals: {
                            statusId: 'scorpion_passive_scorpion_venom',
                            metadataKey: 'currentVenom',
                            value: 'Paralytic Agent'
                        }
                    },
                    metadata: {
                        afflictionDamage: true,
                        ignoreDamageReduction: true,
                        ignoreDestructibleDefense: true
                    }
                }
            ]
        },
        {
            id: 'scorpion-neck-constriction',
            name: 'Neck Constriction',
            skillimage: 'https://i.imgur.com/PLACEHOLDER.png',
            skilldescription: 'Stuns one enemy\'s non-mental skills for 1 turn. Permanently, Scorpion deals 5 additional damage to this target (stacks).',
            energy: [
                'Random'
            ],
            target: 'single-enemy',
            damage: 0,
            cooldown: 1,
            classes: [
                'Physical',
                'Control',
                'Ranged'
            ],
            effects: [
                {
                    type: 'apply_status',
                    statusId: 'scorpion_neck_constriction_lock',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        cannotUseNonMentalSkills: true,
                        tooltipText: 'This character cannot use non-mental skills.'
                    }
                },
                {
                    type: 'apply_status',
                    statusId: 'scorpion_neck_constriction_mark',
                    duration: 1,
                    scope: 'target',
                    metadata: {
                        bonusDamageFromSourceCharacterId: 'scorpion',
                        bonusDamageFromSourceSkillsFlat: 5,
                        mergeNumericAddKeys: ['bonusDamageFromSourceSkillsFlat'],
                        tooltipTextTemplate: 'Scorpion deals {bonusDamageFromSourceSkillsFlat} additional damage to this target.',
                        onExpireApplyStatusToSelf: {
                            statusId: 'scorpion_neck_constriction_mark',
                            duration: 1,
                            inheritSourceMetadata: true
                        }
                    }
                }
            ]
        },
        {
            id: 'scorpion-scorpion-crawl',
            name: 'Scorpion Crawl',
            skillimage: 'https://i.imgur.com/PLACEHOLDER.png',
            skilldescription: 'This skill makes Scorpion invulnerable for 1 turn.',
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
                    statusId: 'scorpion_scorpion_crawl_invulnerable',
                    duration: 1,
                    scope: 'self',
                    metadata: {
                        invulnerable: true,
                        tooltipText: 'Scorpion is invulnerable.'
                    }
                }
            ]
        },
        {
            id: 'scorpion-passive-scorpion-venom',
            name: 'Passive: Scorpion Venom',
            skillimage: 'https://i.imgur.com/PLACEHOLDER.png',
            skilldescription: 'Each turn, Scorpion randomly cycles his venom between Neurotoxin, Acid, and Paralytic Agent. This cannot repeat the same venom as the previous turn and is hidden from enemies.',
            energy: [],
            target: '',
            damage: 0,
            cooldown: 0,
            classes: [
                'Passive',
                'Instant',
                'Affliction'
            ]
        }
    ]
},
];

if (typeof module !== 'undefined') {
    module.exports = characters;
}
