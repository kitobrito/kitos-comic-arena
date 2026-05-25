const characters = [
    {
        "id": "iron-man",
        "characterId": "iron-man",
        "name": "Iron Man",
        "facePicture": "https://i.imgur.com/rt5r1bu.png",
        "characterdeescription": "Iron Man serves as a versatile control damage dealer, applying sustained pressure with energy-based attacks while adapting his suit mid-battle. Through Armor Upgrade, he evolves into a stronger form, gaining access to devastating abilities like Proton Cannon and Energy Burst. While his damage can be interrupted, Iron Man excels when protected, using mobility and precision to control the flow of combat and support his team.",
        "skills": [
            {
                "id": "iron-man-repulsor-blast",
                "name": "Repulsor Blast",
                "skillimage": "https://i.imgur.com/3ulWurz.png",
                "skilldescription": "Deals 15 damage to one enemy per turn for 2 turns. If Overcharge is active, this instead deals 30 energy damage and stuns the target for 1 turn.",
                "energy": [
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Energy",
                    "Ranged",
                    "Control"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "iron_man_repulsor_blast_dot",
                        "duration": 2,
                        "scope": "target",
                        "condition": {
                            "scope": "self",
                            "missingStatusId": "iron_man_overcharge_active"
                        },
                        "metadata": {
                            "harmful": true,
                            "turnEndDamage": 15,
                            "triggerOnApply": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "ongoingClass": "action",
                            "tooltipText": "This character takes 15 damage each turn."
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 30,
                        "scope": "target",
                        "condition": {
                            "scope": "self",
                            "statusId": "iron_man_overcharge_active"
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "stunned",
                        "duration": 1,
                        "scope": "target",
                        "condition": {
                            "scope": "self",
                            "statusId": "iron_man_overcharge_active"
                        },
                        "metadata": {
                            "harmful": true,
                            "cannotUseSkills": true,
                            "tooltipText": "This character is stunned."
                        }
                    }
                ]
            },
            {
                "id": "iron-man-overcharge",
                "name": "Overcharge",
                "skillimage": "https://i.imgur.com/XxNKoKu.png",
                "skilldescription": "For 1 turn, Iron Man's Repulsor Blast and Proton Cannon is improved and gains a new effect.",
                "energy": [
                    "Ninjutsu"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Energy",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "iron_man_overcharge_active",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "infiniteDuration": false,
                            "tooltipText": "Iron Man's Repulsor Blast and Proton Cannon is overcharged for 1 turn."
                        }
                    }
                ]
            },
            {
                "id": "iron-man-armor-upgrade",
                "name": "Armor Upgrade",
                "skillimage": "https://i.imgur.com/cUWpevS.png",
                "skilldescription": "Iron Man may use this skill on himself or an ally. If used on himself, Repulsor Blast becomes Proton Cannon, this skill becomes Energy Burst, and Iron Man gains 10 points of unpierceable damage reduction. If used on an ally, they gain 2 bonus non-affliction damage and 10 permanent destructible defense. This effect stacks on allies and is permanent.",
                "energy": [
                    "Bloodline"
                ],
                "target": "self-or-single-ally",
                "damage": 0,
                "cooldown": 2,
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "iron_man_armor_upgrade_self",
                        "duration": 99,
                        "scope": "target",
                        "condition": {
                            "scope": "target",
                            "targetRelation": "self"
                        },
                        "metadata": {
                            "infiniteDuration": true,
                            "unpierceableDamageReductionFlat": 10,
                            "skillReplacements": {
                                "iron-man-repulsor-blast": "iron-man-proton-cannon",
                                "iron-man-armor-upgrade": "iron-man-energy-burst"
                            },
                            "tooltipText": "Iron Man has 10 unpierceable damage reduction, Repulsor Blast is replaced by Proton Cannon, and Armor Upgrade is replaced by Energy Burst."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "iron_man_armor_upgrade_ally",
                        "duration": 99,
                        "scope": "target",
                        "condition": {
                            "scope": "target",
                            "targetRelation": "ally"
                        },
                        "metadata": {
                            "infiniteDuration": true,
                            "nonAfflictionDamageBonusFlat": 2,
                            "destructibleDefensePoints": 10,
                            "mergeNumericAddKeys": [
                                "nonAfflictionDamageBonusFlat",
                                "destructibleDefensePoints"
                            ],
                            "tooltipTextTemplate": "This character deals {nonAfflictionDamageBonusFlat} additional non-affliction damage and has {destructibleDefensePoints} destructible defense."
                        }
                    }
                ]
            },
            {
                "id": "iron-man-iron-suit-mobility",
                "name": "Iron Suit Mobility",
                "skillimage": "https://i.imgur.com/JC495sM.png",
                "skilldescription": "Iron Man and any ally affected by Armor Upgrade become invulnerable for 1 turn.",
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
                        "statusId": "iron_man_iron_suit_mobility_invulnerable",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "invulnerable": true,
                            "tooltipText": "This character is invulnerable."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "iron_man_iron_suit_mobility_invulnerable",
                        "duration": 1,
                        "scope": "all-allies",
                        "condition": {
                            "scope": "target",
                            "targetRelation": "ally",
                            "statusId": "iron_man_armor_upgrade_ally"
                        },
                        "metadata": {
                            "invulnerable": true,
                            "tooltipText": "This character is invulnerable."
                        }
                    }
                ]
            },
            {
                "id": "iron-man-proton-cannon",
                "name": "Proton Cannon",
                "actorCondition": {
                    "statusId": "iron_man_armor_upgrade_self"
                },
                "skillimage": "https://i.imgur.com/5AoKo39.png",
                "skilldescription": "Deals 18 damage to one enemy per turn for 2 turns. If Overcharge is active, this instead deals 38 affliction damage.",
                "energy": [
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Energy",
                    "Ranged",
                    "Control"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "iron_man_proton_cannon_dot",
                        "duration": 2,
                        "scope": "target",
                        "condition": {
                            "scope": "self",
                            "missingStatusId": "iron_man_overcharge_active"
                        },
                        "metadata": {
                            "harmful": true,
                            "turnEndDamage": 18,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "ongoingClass": "action",
                            "tooltipText": "This character takes 18 damage each turn."
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 38,
                        "scope": "target",
                        "condition": {
                            "scope": "self",
                            "statusId": "iron_man_overcharge_active"
                        },
                        "metadata": {
                            "afflictionDamage": true,
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true
                        }
                    }
                ]
            },
            {
                "id": "iron-man-energy-burst",
                "name": "Energy Burst",
                "actorCondition": {
                    "statusId": "iron_man_armor_upgrade_self"
                },
                "skillimage": "https://i.imgur.com/r6cDktw.png",
                "skilldescription": "Deals 22 damage to all enemies and stuns their energy skills for 1 turn.",
                "energy": [
                    "Ninjutsu",
                    "Random"
                ],
                "target": "all-enemy",
                "damage": 0,
                "cooldown": 2,
                "classes": [
                    "Energy",
                    "Ranged",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 22,
                        "scope": "all-enemy"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "iron_man_energy_burst_lock",
                        "duration": 1,
                        "scope": "all-enemy",
                        "metadata": {
                            "harmful": true,
                            "cannotUseSkillClasses": [
                                "energy"
                            ],
                            "tooltipText": "This character energy skills are stunned."
                        }
                    }
                ]
            }
        ],
        "role": "Hybrid DPS",
        "roleCategory": "hybrid",
        "universe": "marvel"
    },
    {
        "id": "spider-man",
        "characterId": "spider-man",
        "name": "Spider-Man",
        "facePicture": "https://i.imgur.com/10hGC1C.jpeg",
        "startStatuses": [
            {
                "statusId": "spider_man_spider_senses_passive",
                "duration": 999,
                "sourceSkillId": "spider-man-passive-spider-senses",
                "metadata": {
                    "infiniteDuration": true,
                    "persistOnOwnerSkillEvadedTrigger": true,
                    "evadeChancePercent": 0,
                    "tooltipAggregateStatusIds": [
                        "spider_man_spider_strike_senses",
                        "spider_man_web_shot_senses",
                        "spider_man_web_wrap_senses",
                        "spider_man_web_slinging_senses"
                    ],
                    "tooltipAggregateMetadataKey": "evadeChancePercent",
                    "tooltipTextTemplate": "Spider-Man has {evadeChancePercent}% Evasion (this increases by up to 75% through his other skills). When a skill misses, Spider Strike and Web Shot have their costs changed to 1 random energy for 1 turn.",
                    "onOwnerSkillEvadedApplyStatusToOwner": {
                        "statusId": "spider_man_spider_senses_evade_cost_shift",
                        "duration": 1,
                        "metadata": {
                            "skillCostOverridesBySkillId": {
                                "spider-man-spider-strike": {
                                    "energy": [
                                        "Random"
                                    ]
                                },
                                "spider-man-web-shot": {
                                    "energy": [
                                        "Random"
                                    ]
                                }
                            },
                            "tooltipText": "Spider-Man's Spider Strike and Web Shot cost 1 random energy for 1 turn after he evades a skill."
                        }
                    },
                    "tooltipText": "Spider-Man has 0% Evasion (this increases by up to 75% through his other skills). When a skill misses, Spider Strike and Web Shot have their costs changed to 1 random energy for 1 turn."
                }
            }
        ],
        "characterdeescription": "Agile, reactive, and relentlessly disruptive, Spider-Man excels at controlling the flow of battle through precision and timing. Rather than overpowering enemies, he weakens them—restricting their options, increasing their costs, and punishing every misstep. With abilities that hinder enemy actions and amplify his own evasiveness, Spider-Man thrives in drawn-out encounters where his Spider Senses can fully take over.",
        "skills": [
            {
                "id": "spider-man-spider-strike",
                "name": "Spider Strike",
                "skillimage": "https://i.imgur.com/FKv3P8m.png",
                "skilldescription": "Deals 20 damage to one enemy. This deals 5 additional damage to an enemy affected by 'Web Shot' or 'Web Wrap' and becomes piercing if Spider-Man is under the effects of 'Web Slinging'. Increases 'Passive: Spider Senses' by 5%.",
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
                        "amount": 20,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageReduction": false
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 5,
                        "scope": "target",
                        "condition": {
                            "scope": "target",
                            "statusIdsAny": [
                                "spider_man_web_shot_stun",
                                "spider_man_web_wrap_cost"
                            ]
                        },
                        "metadata": {
                            "ignoreDamageReduction": false
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "spider_man_spider_strike_senses",
                        "duration": 999,
                        "scope": "self",
                        "metadata": {
                            "infiniteDuration": true,
                            "evadeChancePercent": 5,
                            "mergeNumericAddKeys": [
                                "evadeChancePercent"
                            ],
                            "tooltipText": "This character has 5% evasion.",
                            "hideTooltip": true
                        }
                    }
                ]
            },
            {
                "id": "spider-man-web-shot",
                "name": "Web Shot",
                "skillimage": "https://i.imgur.com/696d5RE.jpeg",
                "skilldescription": "Stuns one enemy’s harmful skills for 1 turn. If the target is affected by 'Web Wrap', the cost of their skills is increased by 1 random energy until they use a new skill (does not stack). Increases 'Passive: Spider Senses' by 5%.",
                "energy": [
                    "Genjutsu"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Physical",
                    "Ranged",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "spider_man_web_shot_stun",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "cannotUseHarmfulSkills": true,
                            "tooltipText": "This character cannot use harmful skills."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "spider_man_web_shot_wrap_cost",
                        "duration": 999,
                        "scope": "target",
                        "condition": {
                            "scope": "target",
                            "statusId": "spider_man_web_wrap_cost"
                        },
                        "metadata": {
                            "harmful": true,
                            "randomCostIncrease": 1,
                            "onOwnerUseSkillTrigger": true,
                            "tooltipText": "This character's skills cost 1 additional random energy until they use a skill."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "spider_man_web_shot_senses",
                        "duration": 999,
                        "scope": "self",
                        "metadata": {
                            "infiniteDuration": true,
                            "evadeChancePercent": 5,
                            "mergeNumericAddKeys": [
                                "evadeChancePercent"
                            ],
                            "tooltipText": "This character has 5% evasion.",
                            "hideTooltip": true
                        }
                    }
                ]
            },
            {
                "id": "spider-man-web-wrap",
                "name": "Web Wrap",
                "skillimage": "https://i.imgur.com/zIKyZk2.jpeg",
                "skilldescription": "Increases the cost of one enemy’s skills by 2 White Energy until they use a new skill. This does not stack and may only affect one enemy at a time (will remove itself from a previous enemy if used on a new one). Increases 'Passive: Spider Senses' by 5%.",
                "energy": [
                    "Genjutsu",
                    "Genjutsu"
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
                        "statusId": "spider_man_web_wrap_cost",
                        "duration": 999,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "genjutsuCostIncrease": 2,
                            "onOwnerUseSkillTrigger": true,
                            "uniqueEnemyMarkFromSource": true,
                            "tooltipText": "This character's skills cost 2 additional white energy until they use a skill."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "spider_man_web_wrap_senses",
                        "duration": 999,
                        "scope": "self",
                        "metadata": {
                            "infiniteDuration": true,
                            "evadeChancePercent": 5,
                            "mergeNumericAddKeys": [
                                "evadeChancePercent"
                            ],
                            "tooltipText": "This character has 5% evasion.",
                            "hideTooltip": true
                        }
                    }
                ]
            },
            {
                "id": "spider-man-web-slinging",
                "name": "Web Slinging",
                "skillimage": "https://i.imgur.com/jKG2vsk.jpeg",
                "skilldescription": "Spider-Man ignores enemy stun effects and deals 5 bonus damage with 'Spider Strike' for 2 turns. Increases 'Passive: Spider Senses' by 10%.",
                "energy": [
                    "Random"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 3,
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "spider_man_web_slinging_active",
                        "duration": 2,
                        "scope": "self",
                        "metadata": {
                            "cannotBeStunned": true,
                            "ignoreDamageReductionForSkillIds": [
                                "spider-man-spider-strike"
                            ],
                            "skillDamageBonuses": {
                                "spider-man-spider-strike": 5
                            },
                            "tooltipText": "Spider-Man ignores stun effects and Spider Strike deals 5 additional damage."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "spider_man_web_slinging_senses",
                        "duration": 999,
                        "scope": "self",
                        "metadata": {
                            "infiniteDuration": true,
                            "evadeChancePercent": 10,
                            "mergeNumericAddKeys": [
                                "evadeChancePercent"
                            ],
                            "tooltipText": "This character has 10% evasion.",
                            "hideTooltip": true
                        }
                    }
                ]
            },
            {
                "id": "spider-man-passive-spider-senses",
                "name": "Passive: Spider Senses",
                "skillimage": "https://i.imgur.com/ImdCo6q.jpeg",
                "skilldescription": "Spider-Man has 0% Evasion (this increases by up to 75% through his other skills). When a skill misses, 'Spider Strike' and 'Web Shot' have their costs changed to 1 random energy for 1 turn.",
                "energy": [],
                "target": "self",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Passive",
                    "Instant"
                ]
            }
        ],
        "role": "Evasion Disruptor",
        "roleCategory": "strategic",
        "universe": "marvel"
    },
    {
        "id": "the-hulk",
        "characterId": "the-hulk",
        "name": "The Hulk",
        "nameHtml": "The Hulk",
        "facePicture": "https://i.imgur.com/SIkUVer.jpeg",
        "url": "https://i.imgur.com/SIkUVer.jpeg",
        "unlockRequirement": "None",
        "unlockRequirementHtml": "None",
        "characterdeescription": "Bruce Banner lives a life caught between the soft-spoken scientist he's always been and the uncontrollable green monster powered by his rage. Exposed to heavy doses of gamma radiation, scientist Bruce Banner transforms into the mean, green rage machine called the Hulk.",
        "description": "Bruce Banner lives a life caught between the soft-spoken scientist he's always been and the uncontrollable green monster powered by his rage. Exposed to heavy doses of gamma radiation, scientist Bruce Banner transforms into the mean, green rage machine called the Hulk.",
        "descriptionHtml": "Bruce Banner lives a life caught between the soft-spoken scientist he's always been and the uncontrollable green monster powered by his rage.<br>Exposed to heavy doses of gamma radiation, scientist Bruce Banner transforms into the mean, green rage machine called the Hulk.",
        "startStatuses": [
            {
                "statusId": "hulk_anger_management",
                "duration": 999,
                "sourceSkillId": "the-hulk-passive-anger-management",
                "metadata": {
                    "infiniteDuration": true,
                    "stackMetadataKey": "hulkRage",
                    "stackMax": 100,
                    "hulkRage": 0,
                    "unpierceableDamageReductionFlatPerStatusMetadataKey": "hulkRage",
                    "unpierceableDamageReductionFlatPerStatusMetadataStep": 25,
                    "unpierceableDamageReductionFlatPerStatusMetadataAmount": 10,
                    "onEnemySkillTargetedHarmfulOnly": true,
                    "onEnemySkillTargetedApplyStatusToOwner": {
                        "statusId": "hulk_anger_management",
                        "duration": 999,
                        "metadata": {
                            "infiniteDuration": true,
                            "stackMetadataKey": "hulkRage",
                            "stackDelta": 25,
                            "stackMax": 100,
                            "unpierceableDamageReductionFlatPerStatusMetadataKey": "hulkRage",
                            "unpierceableDamageReductionFlatPerStatusMetadataStep": 25,
                            "unpierceableDamageReductionFlatPerStatusMetadataAmount": 10,
                            "tooltipTextTemplate": "Hulk has {hulkRage} rage and {currentUnpierceableDamageReductionFlat} unpierceable damage reduction."
                        }
                    },
                    "onOwnerUseSkillTrigger": true,
                    "onOwnerUseSkillHarmfulOnly": true,
                    "persistOnOwnerUseSkillTrigger": true,
                    "onOwnerUseSkillApplyStatusToOwner": {
                        "statusId": "hulk_anger_management",
                        "duration": 999,
                        "metadata": {
                            "infiniteDuration": true,
                            "stackMetadataKey": "hulkRage",
                            "stackDelta": 10,
                            "stackMax": 100,
                            "unpierceableDamageReductionFlatPerStatusMetadataKey": "hulkRage",
                            "unpierceableDamageReductionFlatPerStatusMetadataStep": 25,
                            "unpierceableDamageReductionFlatPerStatusMetadataAmount": 10,
                            "tooltipTextTemplate": "Hulk has {hulkRage} rage and {currentUnpierceableDamageReductionFlat} unpierceable damage reduction."
                        }
                    },
                    "applyStatusAtStack": {
                        "metadataKey": "hulkRage",
                        "value": 100,
                        "statusId": "hulk_worldbreaker_active",
                        "duration": 999,
                        "metadata": {
                            "infiniteDuration": true,
                            "facePictureOverride": "https://i.imgur.com/SGK1J5U.jpeg",
                            "silenceNonDamageEffects": true,
                            "skillReplacements": {
                                "the-hulk-debris-catapult": "the-hulk-world-break"
                            },
                            "skillCostOverridesBySkillId": {
                                "the-hulk-hulk-smash": {
                                    "energy": []
                                },
                                "the-hulk-thunder-clap": {
                                    "energy": []
                                },
                                "the-hulk-debris-catapult": {
                                    "energy": []
                                },
                                "the-hulk-hulk-leap": {
                                    "energy": []
                                },
                                "the-hulk-world-break": {
                                    "energy": []
                                }
                            },
                            "tooltipText": "Worldbreaker is active. Hulk ignores enemy non-damage effects and his skills cost no energy."
                        }
                    },
                    "tooltipTextTemplate": "Hulk has {hulkRage} rage and {currentUnpierceableDamageReductionFlat} unpierceable damage reduction."
                }
            }
        ],
        "skills": [
            {
                "id": "the-hulk-hulk-smash",
                "name": "Hulk Smash",
                "nameHtml": "Hulk Smash",
                "skillimage": "https://i.imgur.com/JeNdeM5.jpeg",
                "url": "https://i.imgur.com/JeNdeM5.jpeg",
                "skilldescription": "Destroys all of one enemy's destructible defense, then deals 35 damage to them and stuns their non-mental skills for 1 turn. Consumes 50 rage to increase this skill's damage by 10 and 100 rage to increase it by 20.",
                "description": "Destroys all of one enemy's destructible defense, then deals 35 damage to them and stuns their non-mental skills for 1 turn. Consumes 50 rage to increase this skill's damage by 10 and 100 rage to increase it by 20.",
                "descriptionHtml": "Destroys all of one enemy's destructible defense, then deals 35 damage to them and stuns their non-mental skills for 1 turn.<br>Consumes 50 rage to increase this skill's damage by 10 and 100 rage to increase it by 20.",
                "energy": [
                    "Taijutsu",
                    "Taijutsu"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "cooldownHtml": "None",
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "classesHtml": "Physical, Instant",
                "effects": [
                    {
                        "type": "destroy_destructible_defense",
                        "scope": "target"
                    },
                    {
                        "type": "damage",
                        "amount": 35,
                        "scope": "target",
                        "metadata": {
                            "bonusFromStatusMetadataThresholds": {
                                "scope": "self",
                                "statusId": "hulk_anger_management",
                                "metadataKey": "hulkRage",
                                "thresholds": [
                                    {
                                        "atLeast": 100,
                                        "bonus": 20,
                                        "consume": 100
                                    },
                                    {
                                        "atLeast": 50,
                                        "bonus": 10,
                                        "consume": 50
                                    }
                                ]
                            }
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "hulk_smash_non_mental_stun",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "cannotUseNonMentalSkills": true,
                            "tooltipText": "This character's non-mental skills are stunned."
                        }
                    }
                ]
            },
            {
                "id": "the-hulk-thunder-clap",
                "name": "Thunder Clap",
                "nameHtml": "Thunder Clap",
                "skillimage": "https://i.imgur.com/LQ7Pyik.jpeg",
                "url": "https://i.imgur.com/LQ7Pyik.jpeg",
                "skilldescription": "Hulk taunts the enemy team for 1 turn. Hulk heals 10 HP for every enemy hit. Consumes 50 rage to increase the duration of this skill's effect by 1 turn.",
                "description": "Hulk taunts the enemy team for 1 turn. Hulk heals 10 HP for every enemy hit. Consumes 50 rage to increase the duration of this skill's effect by 1 turn.",
                "descriptionHtml": "Hulk taunts the enemy team for 1 turn.<br>Hulk heals 10 HP for every enemy hit.<br>Consumes 50 rage to increase the duration of this skill's effect by 1 turn.",
                "energy": [
                    "Random",
                    "Random"
                ],
                "target": "all-enemy",
                "damage": 0,
                "cooldown": 3,
                "cooldownHtml": "3",
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "classesHtml": "Physical, Instant",
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "hulk_thunder_clap_taunt",
                        "duration": 1,
                        "scope": "all-enemy",
                        "metadata": {
                            "harmful": true,
                            "taunt": true,
                            "durationBonusFromStatusMetadataThresholds": {
                                "scope": "self",
                                "statusId": "hulk_anger_management",
                                "metadataKey": "hulkRage",
                                "thresholds": [
                                    {
                                        "atLeast": 50,
                                        "bonus": 1,
                                        "consume": 50
                                    }
                                ]
                            },
                            "tooltipText": "This character is taunted by Hulk."
                        }
                    },
                    {
                        "type": "heal",
                        "amount": 30,
                        "scope": "self"
                    }
                ]
            },
            {
                "id": "the-hulk-debris-catapult",
                "name": "Debris Catapult",
                "nameHtml": "Debris Catapult",
                "skillimage": "https://i.imgur.com/6afyDto.jpeg",
                "url": "https://i.imgur.com/6afyDto.jpeg",
                "skilldescription": "Deals 35 damage to one enemy. Consumes 25 rage to reduce this skill's cooldown by 1 and 50 rage to reduce it by 2.",
                "description": "Deals 35 damage to one enemy. Consumes 25 rage to reduce this skill's cooldown by 1 and 50 rage to reduce it by 2.",
                "descriptionHtml": "Deals 35 damage to one enemy.<br>Consumes 25 rage to reduce this skill's cooldown by 1 and 50 rage to reduce it by 2.",
                "energy": [
                    "Random",
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 2,
                "cooldownHtml": "2",
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "classesHtml": "Physical, Instant",
                "metadata": {
                    "cooldownReductionFromStatusMetadataThresholds": {
                        "scope": "self",
                        "statusId": "hulk_anger_management",
                        "metadataKey": "hulkRage",
                        "thresholds": [
                            {
                                "atLeast": 50,
                                "amount": 2,
                                "consume": 50
                            },
                            {
                                "atLeast": 25,
                                "amount": 1,
                                "consume": 25
                            }
                        ]
                    }
                },
                "effects": [
                    {
                        "type": "damage",
                        "amount": 35,
                        "scope": "target"
                    }
                ]
            },
            {
                "id": "the-hulk-hulk-leap",
                "name": "Hulk Leap",
                "nameHtml": "Hulk Leap",
                "skillimage": "https://i.imgur.com/nOKU4B9.jpeg",
                "url": "https://i.imgur.com/nOKU4B9.jpeg",
                "skilldescription": "Hulk becomes invulnerable for 1 turn and marks an enemy. When this skill ends, the marked target is dealt 20 damage and has their non-strategic skills stunned for 1 turn.",
                "description": "Hulk becomes invulnerable for 1 turn and marks an enemy. When this skill ends, the marked target is dealt 20 damage and has their non-strategic skills stunned for 1 turn.",
                "descriptionHtml": "Hulk becomes invulnerable for 1 turn and marks an enemy.<br>When this skill ends, the marked target is dealt 20 damage and has their non-strategic skills stunned for 1 turn.",
                "energy": [
                    "Taijutsu"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 2,
                "cooldownHtml": "2",
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "classesHtml": "Physical, Instant",
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "hulk_leap_invulnerable",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "invulnerable": true,
                            "tooltipText": "Hulk is invulnerable."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "hulk_leap_mark",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "onExpireEffects": [
                                {
                                    "type": "damage",
                                    "amount": 20
                                },
                                {
                                    "type": "apply_status",
                                    "statusId": "hulk_leap_non_mental_stun",
                                    "duration": 1,
                                    "metadata": {
                                        "harmful": true,
                                        "cannotUseNonMentalSkills": true,
                                        "tooltipText": "This character's non-mental skills are stunned."
                                    }
                                }
                            ],
                            "tooltipText": "When this expires, Hulk lands for 20 damage and stuns non-mental skills."
                        }
                    }
                ]
            },
            {
                "id": "the-hulk-passive-anger-management",
                "name": "Passive: Anger Management",
                "nameHtml": "Passive: Anger Management",
                "skillimage": "https://i.imgur.com/SqCB3OU.jpeg",
                "url": "https://i.imgur.com/SqCB3OU.jpeg",
                "skilldescription": "Hulk starts the game with 0 rage, which can stack up to 100. Rage reduces by 35 at the end of Hulk's turns if he has any and did not use a skill, and he gains 25 every time an enemy uses a new skill on him. For every enemy he uses a new skill on, he gains 10 rage after any previous rage has been consumed. Hulk gains 10 points unpierceable damage reduction for every 25 points of rage he has.",
                "description": "Hulk starts the game with 0 rage, which can stack up to 100. Rage reduces by 35 at the end of Hulk's turns if he has any and did not use a skill, and he gains 25 every time an enemy uses a new skill on him. For every enemy he uses a new skill on, he gains 10 rage after any previous rage has been consumed. Hulk gains 10 points unpierceable damage reduction for every 25 points of rage he has.",
                "descriptionHtml": "Hulk starts the game with 0 rage, which can stack up to 100.<br>Rage reduces by 35 at the end of Hulk's turns if he has any and did not use a skill, and he gains 25 every time an enemy uses a new skill on him.<br>For every enemy he uses a new skill on, he gains 10 rage after any previous rage has been consumed.<br>Hulk gains 10 points unpierceable damage reduction for every 25 points of rage he has.",
                "energy": [],
                "target": "",
                "damage": 0,
                "cooldown": 0,
                "cooldownHtml": "Passive",
                "classes": [
                    "Passive",
                    "Instant"
                ],
                "classesHtml": "Passive, Instant"
            },
            {
                "id": "the-hulk-passive-worldbreaker",
                "name": "Passive: Worldbreaker",
                "nameHtml": "Passive: Worldbreaker",
                "skillimage": "https://i.imgur.com/rhYz0Af.jpeg",
                "url": "https://i.imgur.com/rhYz0Af.jpeg",
                "activatedFacePicture": "https://i.imgur.com/SGK1J5U.jpeg",
                "skilldescription": "If Hulk's health is reduced to 25 HP or below while he has 100 rage, this will activate. Hulk removes all skills from himself, ignores enemy non-damage effects, and reduces the cost of all of his skills to no cost for the rest of the game. 'Debris Catapult' swaps to 'World-Break'.",
                "description": "If Hulk's health is reduced to 25 HP or below while he has 100 rage, this will activate. Hulk removes all skills from himself, ignores enemy non-damage effects, and reduces the cost of all of his skills to no cost for the rest of the game. 'Debris Catapult' swaps to 'World-Break'.",
                "descriptionHtml": "If Hulk's health is reduced to 25 HP or below while he has 100 rage, this will activate.<br>Hulk removes all skills from himself, ignores enemy non-damage effects, and reduces the cost of all of his skills to no cost for the rest of the game.<br>'Debris Catapult' swaps to 'World-Break'.",
                "energy": [],
                "target": "",
                "damage": 0,
                "cooldown": 0,
                "cooldownHtml": "Passive",
                "classes": [
                    "Passive",
                    "Instant"
                ],
                "classesHtml": "Passive, Instant"
            },
            {
                "id": "the-hulk-world-break",
                "name": "World-Break",
                "nameHtml": "World-Break",
                "actorCondition": {
                    "statusId": "hulk_worldbreaker_active"
                },
                "skillimage": "https://i.imgur.com/Peb79BG.jpeg",
                "url": "https://i.imgur.com/Peb79BG.jpeg",
                "skilldescription": "Deals 25 piercing damage to the enemy team. Bypasses invulnerability.",
                "description": "Deals 25 piercing damage to the enemy team. Bypasses invulnerability.",
                "descriptionHtml": "Deals 25 piercing damage to the enemy team.<br>Bypasses invulnerability.",
                "energy": [
                    "Random"
                ],
                "ignoreInvulnerability": true,
                "target": "all-enemy",
                "damage": 0,
                "cooldown": 2,
                "cooldownHtml": "2",
                "classes": [
                    "Physical",
                    "Instant",
                    "Bypassing"
                ],
                "classesHtml": "Physical, Instant, Bypassing",
                "effects": [
                    {
                        "type": "damage",
                        "amount": 25,
                        "scope": "all-enemy",
                        "metadata": {
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true
                        }
                    }
                ]
            }
        ],
        "role": "Juggernaut",
        "roleCategory": "tank",
        "universe": "marvel"
    },
    {
        "id": "captain-america",
        "characterId": "captain-america",
        "name": "Captain America",
        "facePicture": "https://i.imgur.com/7j5pcra.jpeg",
        "characterdeescription": "Captain America serves as a disciplined frontline protector who excels at controlling the pace of battle through precise, well-timed defensive plays. Rather than building long-term power, he focuses on creating short windows of advantage that allow his team to safely pressure the enemy. His abilities provide a versatile mix of disruption and protection—silencing key threats, forcing enemies to target him, and reducing incoming damage at critical moments. With low cooldowns across his kit, he can consistently adapt to the flow of combat and respond to enemy actions in real time.",
        "startStatuses": [
            {
                "statusId": "captain_america_america_shield_passive",
                "sourceSkillId": "captain_america_america_shield_passive2",
                "duration": 999,
                "metadata": {
                    "infiniteDuration": true,
                    "onTeamMemberUseSkillApplyStatusToOwner": {
                        "statusId": "captain_america_america_shield_defense",
                        "duration": 999,
                        "energyTypes": [
                            "genjutsu",
                            "ninjutsu",
                            "bloodline"
                        ],
                        "scaleMetadataKeys": [
                            "destructibleDefensePoints"
                        ],
                        "metadata": {
                            "destructibleDefensePoints": 3,
                            "mergeNumericAddKeys": [
                                "destructibleDefensePoints"
                            ],
                            "tooltipTextTemplate": "This character has {destructibleDefensePoints} destructible defense."
                        }
                    },
                    "tooltipText": "While Cap is alive, teammates gain 3 permanent destructible defense for each red, white, or blue energy spent by a skill."
                }
            },
            {
                "statusId": "captain_america_vibranium_ricochet_cost_red",
                "sourceSkillId": "captain-america-vibranium-ricochet",
                "duration": 1,
                "metadata": {
                    "hideTooltipFromUnitOwner": true,
                    "hideTooltipFromEnemy": true,
                    "skillCostOverridesBySkillId": {
                        "captain-america-vibranium-ricochet": {
                            "energy": [
                                "Bloodline"
                            ]
                        }
                    },
                    "onExpireApplyStatusToSelf": {
                        "statusId": "captain_america_vibranium_ricochet_cost_white",
                        "duration": 1,
                        "metadata": {
                            "hideTooltipFromUnitOwner": true,
                            "hideTooltipFromEnemy": true,
                            "skillCostOverridesBySkillId": {
                                "captain-america-vibranium-ricochet": {
                                    "energy": [
                                        "Genjutsu"
                                    ]
                                }
                            },
                            "onExpireApplyStatusToSelf": {
                                "statusId": "captain_america_vibranium_ricochet_cost_blue",
                                "duration": 1,
                                "metadata": {
                                    "hideTooltipFromUnitOwner": true,
                                    "hideTooltipFromEnemy": true,
                                    "skillCostOverridesBySkillId": {
                                        "captain-america-vibranium-ricochet": {
                                            "energy": [
                                                "Ninjutsu"
                                            ]
                                        }
                                    },
                                    "onExpireApplyStatusToSelf": {
                                        "statusId": "captain_america_vibranium_ricochet_cost_red",
                                        "duration": 1,
                                        "metadata": {
                                            "hideTooltipFromUnitOwner": true,
                                            "hideTooltipFromEnemy": true,
                                            "skillCostOverridesBySkillId": {
                                                "captain-america-vibranium-ricochet": {
                                                    "energy": [
                                                        "Bloodline"
                                                    ]
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
        "skills": [
            {
                "id": "captain-america-shield-throw",
                "name": "Shield Throw",
                "skillimage": "https://i.imgur.com/uulT2pq.jpeg",
                "skilldescription": "Deals 25 damage to one main enemy and 15 damage to a random different enemy then silences the main enemy's harmful skills for 1 turn.",
                "energy": [
                    "Bloodline"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Physical",
                    "Ranged",
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
                        "amount": 15,
                        "scope": "random-other-enemy"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "captain_america_shield_throw_silence",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "silenceNonDamageEffects": true,
                            "tooltipText": "Silenced: only damage from this character's skills will work."
                        }
                    }
                ]
            },
            {
                "id": "captain-america-shield-bash",
                "name": "Shield Bash",
                "skillimage": "https://i.imgur.com/MoJrXEu.jpeg",
                "skilldescription": "One enemy receives 20 damage and is taunted for 1 turn. This skill grants Captain America 20 points of destructible defense for 1 turn.",
                "energy": [
                    "Genjutsu"
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
                        "amount": 20,
                        "scope": "target"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "captain_america_shield_bash_taunt",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "taunt": true,
                            "tooltipText": "This character is taunted and can only target Captain America."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "captain_america_shield_bash_defense",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "destructibleDefensePoints": 20,
                            "tooltipText": "Captain America has 20 destructible defense."
                        }
                    }
                ]
            },
            {
                "id": "captain-america-patriot-s-flag",
                "name": "Patriot's Flag",
                "skillimage": "https://i.imgur.com/QJ1Gn8l.jpeg",
                "skilldescription": "Captain America rallies his team to stand united. For 1 turn, all allies gain 10 health, 5 points of unpierceable damage reduction, deal +5 additional non-affliction damage, and are immune to stun effects.",
                "energy": [
                    "Ninjutsu"
                ],
                "target": "all-allies",
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "heal",
                        "amount": 10,
                        "scope": "all-allies"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "captain_america_patriots_flag_buff",
                        "duration": 1,
                        "scope": "all-allies",
                        "metadata": {
                            "unpierceableDamageReductionFlat": 5,
                            "nonAfflictionDamageBonusFlat": 5,
                            "cannotBeStunned": true,
                            "mergeNumericAddKeys": [
                                "unpierceableDamageReductionFlat",
                                "nonAfflictionDamageBonusFlat"
                            ],
                            "tooltipText": "This character has 5 unpierceable damage reduction, deals 5 additional non-affliction damage, and ignores stun effects."
                        }
                    }
                ]
            },
            {
                "id": "captain-america-vibranium-ricochet",
                "name": "Vibranium Ricochet",
                "skillimage": "https://i.imgur.com/Lmj8tYf.jpeg",
                "skilldescription": "Captain America or one ally ignores all enemy non-mental skills for 1 turn. Reflects 25% of all non-mental damage directed at the character affected by this skill back at the attacker. cycles its cost between red/white/blue each turn.",
                "energy": [
                    "Bloodline"
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
                        "statusId": "captain_america_vibranium_ricochet_guard",
                        "duration": 1,
                        "scope": "self-or-single-ally",
                        "metadata": {
                            "ignoreEnemyNonMentalDamage": true,
                            "hideTooltipFromEnemy": true,
                            "reflectDamagePercent": 25,
                            "reflectDamageExcludeSkillClasses": [
                                "mental"
                            ],
                            "tooltipText": "This character will ignore all non-mental enemy skills and reflects 25% of non-mental damage back at the attacker.",
                            "onExpireApplyStatusToSelf": {
                                "statusId": "captain_america_vibranium_ricochet_guard_used",
                                "duration": 1,
                                "metadata": {
                                    "tooltipText": "This skill was used."
                                }
                            }
                        }
                    }
                ],
                "classesHtml": "Physical, Instant, Invisible"
            },
            {
                "id": "captain_america_america_shield_passive2",
                "name": "Passive: America's Shield",
                "skillimage": "https://i.imgur.com/WiTTvPl.jpeg",
                "skilldescription": "While Cap is alive, every time a member of his team uses a skill with an individual Red/White/Blue energy in its cost (or any combination of the 3, but not black or green), they gain 5 points of permanent destructible defense for each color spent.",
                "energy": [],
                "target": "",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Passive",
                    "Instant"
                ]
            }
        ],
        "role": "Protection Tank",
        "roleCategory": "tank",
        "universe": "marvel"
    },
    {
        "id": "superman",
        "characterId": "superman",
        "name": "Superman",
        "facePicture": "https://i.imgur.com/mDgc01K.jpeg",
        "startStatuses": [
            {
                "statusId": "superman_the_man_of_steel_passive",
                "sourceSkillId": "superman-passive-the-man-of-steel",
                "duration": 999,
                "metadata": {
                    "infiniteDuration": true,
                    "unpierceableDamageReductionFlat": 12,
                    "tooltipText": "Superman has 12 unpierceable damage reduction."
                }
            }
        ],
        "characterdeescription": "Superman plays as a tempo enforcer—opening fights with debilitating control like Frost Breath, then following with consistent, unavoidable damage from Laser Eyes and Solar Flare to wear down entire teams. His Man of Steel passive anchors everything, giving him the durability to stay aggressive longer than most damage dealers",
        "skills": [
            {
                "id": "superman-laser-eyes",
                "name": "Laser Eyes",
                "skillimage": "https://i.imgur.com/E1mzMke.jpeg",
                "skilldescription": "Superman blasts one enemy with his laser vision, dealing 10 piercing and 10 affliction damage to them. For 1 turn, this skill costs 1 more red energy and deals 20 piercing and 20 affliction damage.",
                "energy": [
                    "Bloodline"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Energy",
                    "Ranged",
                    "Instant"
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
                        "type": "damage",
                        "amount": 10,
                        "scope": "target",
                        "metadata": {
                            "afflictionDamage": true,
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "superman_laser_eyes_charge",
                        "duration": 2,
                        "scope": "self",
                        "metadata": {
                            "skillReplacements": {
                                "superman-laser-eyes": "superman-laser-eyes-empowered"
                            },
                            "tooltipText": "Laser Eyes costs 1 more red energy and deals 20 piercing and 20 affliction damage.."
                        }
                    }
                ]
            },
            {
                "id": "superman-frost-breath",
                "name": "Frost Breath",
                "skillimage": "https://i.imgur.com/Vty8muB.jpeg",
                "skilldescription": "Superman freezes one enemy in ice, dealing 15 affliction damage to them and fully stuns them for 1 turn. For 1 turn, this skill costs 1 more blue energy, deals 30 affliction damage, and fully stuns for 2 turns.",
                "energy": [
                    "Ninjutsu"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Energy",
                    "Ranged",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 15,
                        "scope": "target",
                        "metadata": {
                            "afflictionDamage": true,
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true
                        }
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
                        "statusId": "superman_frost_breath_charge",
                        "duration": 2,
                        "scope": "self",
                        "metadata": {
                            "skillReplacements": {
                                "superman-frost-breath": "superman-frost-breath-empowered"
                            },
                            "tooltipText": "Frost Breath costs 1 more blue energy, deals 30 affliction damage, and fully stuns for 2 turns."
                        }
                    }
                ]
            },
            {
                "id": "superman-solar-flare",
                "name": "Solar Flare",
                "skillimage": "https://i.imgur.com/THwGbwn.jpeg",
                "skilldescription": "Superman deals 35 damage to the enemy team. For 3 turns, Passive: The Man of Steel is de-activated.",
                "energy": [
                    "Bloodline",
                    "Random",
                    "Random"
                ],
                "target": "all-enemy",
                "damage": 0,
                "cooldown": 3,
                "classes": [
                    "Energy",
                    "Ranged",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 35,
                        "scope": "all-enemy"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "superman_solar_flare_deactivation",
                        "duration": 3,
                        "scope": "self",
                        "metadata": {
                            "removeStatusIdsOnApply": [
                                "superman_the_man_of_steel_passive"
                            ],
                            "onExpireApplyStatusToSelf": {
                                "statusId": "superman_the_man_of_steel_passive",
                                "duration": 999,
                                "sourceSkillId": "superman-passive-the-man-of-steel",
                                "metadata": {
                                    "infiniteDuration": true,
                                    "unpierceableDamageReductionFlat": 12,
                                    "tooltipText": "Superman has 12 unpierceable damage reduction."
                                }
                            },
                            "tooltipText": "Superman's Man of Steel passive is de-activated."
                        }
                    }
                ]
            },
            {
                "id": "superman-super-powered-flight",
                "name": "Super-Powered Flight",
                "skillimage": "https://i.imgur.com/BMQtiPt.jpeg",
                "skilldescription": "Superman becomes invulnerable for 1 turn and deals 25 damage to one enemy.",
                "energy": [
                    "Random",
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 4,
                "classes": [
                    "Physical",
                    "Melee",
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
                    },
                    {
                        "type": "damage",
                        "amount": 25,
                        "scope": "target"
                    }
                ]
            },
            {
                "id": "superman-passive-the-man-of-steel",
                "name": "Passive: The Man of Steel",
                "skillimage": "https://i.imgur.com/ACqPlGK.jpeg",
                "skilldescription": "Superman has 12 unpierceable damage reduction.",
                "energy": [],
                "target": "",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Passive",
                    "Instant"
                ]
            },
            {
                "id": "superman-laser-eyes-empowered",
                "name": "Laser Eyes",
                "hiddenFromSelectionViewer": true,
                "skillimage": "https://i.imgur.com/E1mzMke.jpeg",
                "skilldescription": "Laser Eyes is empowered, dealing 20 piercing damage and 20 affliction damage to one enemy.",
                "energy": [
                    "Bloodline",
                    "Bloodline"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Energy",
                    "Ranged",
                    "Instant"
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
                        "type": "damage",
                        "amount": 20,
                        "scope": "target",
                        "metadata": {
                            "afflictionDamage": true,
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true
                        }
                    }
                ]
            },
            {
                "id": "superman-frost-breath-empowered",
                "name": "Frost Breath",
                "hiddenFromSelectionViewer": true,
                "skillimage": "https://i.imgur.com/Vty8muB.jpeg",
                "skilldescription": "Frost Breath deals 30 affliction damage to one enemy and fully stunning them for 2 turns.",
                "energy": [
                    "Ninjutsu",
                    "Ninjutsu"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Energy",
                    "Ranged",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 30,
                        "scope": "target",
                        "metadata": {
                            "afflictionDamage": true,
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "stunned",
                        "duration": 2,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "cannotUseSkills": true,
                            "tooltipText": "This character is stunned."
                        }
                    }
                ]
            }
        ],
        "role": "Battle Mage",
        "roleCategory": "damage",
        "universe": "dc"
    },
    {
        "id": "batman",
        "characterId": "batman",
        "name": "Batman",
        "facePicture": "https://i.imgur.com/uV53DZN.jpeg",
        "startStatuses": [
            {
                "statusId": "batman_bat_signal",
                "sourceSkillId": "batman-passive-bat-signal",
                "duration": 1,
                "metadata": {
                    "infiniteDuration": false,
                    "invulnerable": true,
                    "onOwnerUseSkillTrigger": true,
                    "removeStatusIdsOnOwnerUseSkill": [
                        "batman_bat_signal"
                    ],
                    "removeStatusIdsOnEnemyHarmfulSkill": [
                        "batman_bat_signal"
                    ],
                    "tooltipText": "Batman is invulnerable to harmful skills for the first turn. If Batman uses a new skill or receives a new harmful skill, this passive ends."
                }
            }
        ],
        "characterdeescription": "Batman is a master tactician who controls the battlefield with gadgets, evasive maneuvers, and precision strikes. Using advanced technology and relentless preparation, he can disrupt enemy teams, reflect attacks, and pressure opponents with bursts of damage. Batman excels at manipulating enemy positioning and punishing careless aggression, making him a highly adaptable fighter who thrives when staying one step ahead.",
        "skills": [
            {
                "id": "batman-explosive-batarangs",
                "name": "Explosive Batarangs",
                "skillimage": "https://i.imgur.com/WJmxjLz.jpeg",
                "skilldescription": "Deals 5 damage and 4 affliction damage to all enemies. For the next turn, this skill instead targets one enemy and strikes them three times, each hit dealing 5 damage and 4 affliction damage, before returning to its normal effect.",
                "energy": [
                    "Random"
                ],
                "target": "all-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Physical",
                    "Ranged",
                    "Instant",
                    "Affliction"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 5,
                        "scope": "all-enemy"
                    },
                    {
                        "type": "damage",
                        "amount": 4,
                        "scope": "all-enemy",
                        "metadata": {
                            "afflictionDamage": true
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "batman_explosive_batarangs_followup",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "skillReplacementsByRemainingTurns": {
                                "1": {
                                    "batman-explosive-batarangs": "batman-explosive-batarangs-empowered"
                                }
                            },
                            "tooltipText": "Explosive Batarangs now targets one enemy and strikes them three times, each hit dealing 5 damage and 4 affliction damage,"
                        }
                    }
                ]
            },
            {
                "id": "batman-pocket-emp",
                "name": "Pocket EMP",
                "skillimage": "https://i.imgur.com/KoxLeK9.jpeg",
                "skilldescription": "Batman releases a compact electromagnetic pulse that silences the enemy team for 1 turn, preventing all non-damage effects. Enemies also take 5 additional damage from all sources for 1 turn. This skill then swaps to 'Smoke Bomb'.",
                "energy": [
                    "Genjutsu"
                ],
                "target": "all-enemy",
                "damage": 0,
                "cooldown": 3,
                "classes": [
                    "Energy",
                    "Ranged",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "batman_pocket_emp_silence",
                        "duration": 1,
                        "scope": "all-enemy",
                        "metadata": {
                            "harmful": true,
                            "silenceNonDamageEffects": true,
                            "skipFirstTurnEndTick": true,
                            "damageTakenBonusFlat": 5,
                            "tooltipText": "This character is silenced and takes 5 additional damage from all sources."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "batman_gadget_swap",
                        "duration": 99,
                        "scope": "self",
                        "metadata": {
                            "skillReplacements": {
                                "batman-pocket-emp": "batman-smoke-bomb",
                                "batman-smoke-bomb": "batman-pocket-emp"
                            },
                            "tooltipText": "Pocket EMP and Smoke Bomb are replaced by each other."
                        }
                    }
                ]
            },
            {
                "id": "batman-grappling-hook",
                "name": "Grappling Hook",
                "skillimage": "https://i.imgur.com/c3nX3zy.jpeg",
                "skilldescription": "Batman evades danger using his grappling hook, becoming invulnerable for 1 turn and removing all harmful effects from himself. One enemy becomes unable to go invulnerable for 1 turn and takes 5 additional damage from all sources during that time. This skill then swaps to 'Bullet-Deflecting Cape'.",
                "energy": [
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 3,
                "classes": [
                    "Physical",
                    "Ranged",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "cleanse_harmful",
                        "count": 99,
                        "scope": "self"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "batman_grappling_hook_invulnerable",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "invulnerable": true,
                            "tooltipText": "This character is invulnerable."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "batman_grappling_hook_lock",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "cannotBecomeInvulnerable": true,
                            "damageTakenBonusFlat": 5,
                            "tooltipText": "This character cannot become invulnerable and takes 5 additional damage from all sources."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "batman_cape_swap",
                        "duration": 99,
                        "scope": "self",
                        "metadata": {
                            "skillReplacements": {
                                "batman-grappling-hook": "batman-bullet-deflecting-cape"
                            },
                            "tooltipText": "Grappling Hook is now Bullet-Deflecting Cape."
                        }
                    }
                ]
            },
            {
                "id": "batman-batmobile",
                "name": "Batmobile",
                "skillimage": "https://i.imgur.com/D1IKpC8.jpeg",
                "skilldescription": "Batman deploys the Batmobile, gaining 55 permanent destructible defense and becoming invulnerable for 1 turn. While this destructible defense remains, this skill can be used for no energy cost to deal 35 piercing damage to one enemy, reducing Batman’s destructible defense by 25 each use. When the destructible defense is destroyed, this skill is replaced with 'Bat Kick'.",
                "energy": [
                    "Random",
                    "Random",
                    "Random"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Physical",
                    "Melee",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "batman_batmobile_active",
                        "duration": 99,
                        "scope": "self",
                        "metadata": {
                            "destructibleDefensePoints": 55,
                            "removeStatusIdsOnBreak": [
                                "batman_batmobile_active"
                            ],
                            "skillReplacements": {
                                "batman-batmobile": "batman-batmobile-active"
                            },
                            "onBreakApplyStatusToSelf": {
                                "statusId": "batman_batmobile_broken_swap",
                                "duration": 99,
                                "metadata": {
                                    "infiniteDuration": true,
                                    "skillReplacements": {
                                        "batman-batmobile": "batman-bat-kick"
                                    },
                                    "tooltipText": "Batmobile is replaced by Bat Kick once the Batmobile is destroyed."
                                }
                            },
                            "tooltipTextTemplate": "Batman has {destructibleDefensePoints} destructible defense and Batmobile is active."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "batman_batmobile_invulnerable",
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
                "id": "batman-batmobile-active",
                "name": "Batmobile",
                "hiddenFromSelectionViewer": true,
                "skillimage": "https://i.imgur.com/NA1Udzh.png",
                "skilldescription": "Batman drives the Batmobile into one enemy, dealing 35 piercing damage and consuming 25 points of destructible defense.",
                "energy": [],
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
                        "amount": 35,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 25,
                        "scope": "self",
                        "metadata": {
                            "ignoreDamageReduction": true
                        }
                    }
                ]
            },
            {
                "id": "batman_batmobile_broken_swap",
                "name": "Batmobile Broken Swap",
                "hiddenFromSelectionViewer": true,
                "skillimage": "https://i.imgur.com/NA1Udzh.png",
                "skilldescription": "Internal replacement status that changes Batmobile into Bat Kick after the Batmobile is destroyed.",
                "energy": [],
                "target": "",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Passive",
                    "Instant"
                ]
            },
            {
                "id": "batman-bullet-deflecting-cape",
                "name": "Bullet-Deflecting Cape",
                "skillimage": "https://i.imgur.com/c0AlSs8.jpeg",
                "skilldescription": "For 1 turn, the first non-mental harmful skill used on Batman is reflected onto a random enemy. This skill then swaps back to 'Grappling Hook'.",
                "energy": [
                    "Random"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 3,
                "classes": [
                    "Physical",
                    "Instant",
                    "Invisible"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "batman_bullet_deflecting_cape_reflect",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "reflectNextIncomingSkill": true,
                            "reflectOnlyHarmfulSkills": true,
                            "reflectExcludeSkillClasses": [
                                "mental"
                            ],
                            "reflectToRandomCasterAlly": true,
                            "skipFirstTurnEndTick": true,
                            "preserveOnOwnerUseSkillTrigger": true,
                            "hideTooltipFromEnemy": true,
                            "onExpireApplyStatusToSelf": {
                                "statusId": "batman_bullet_deflecting_cape_used",
                                "duration": 1,
                                "metadata": {
                                    "tooltipText": "This skill was used."
                                }
                            },
                            "harmful": true,
                            "tooltipText": "The next harmful non-mental skill used on Batman is reflected to a random enemy."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "batman_cape_swap",
                        "duration": 99,
                        "scope": "self",
                        "metadata": {
                            "hideTooltip": true,
                            "skillReplacements": {
                                "batman-grappling-hook": "batman-bullet-deflecting-cape"
                            },
                            "tooltipText": "Grappling Hook is now Bullet-Deflecting Cape."
                        }
                    }
                ],
                "classesHtml": "Physical, Instant, Invisible"
            },
            {
                "id": "batman-smoke-bomb",
                "name": "Smoke Bomb",
                "skillimage": "https://i.imgur.com/I9CEmJw.jpeg",
                "skilldescription": "Batman throws a smoke bomb that blinds the enemy team for 1 turn, causing their next skill to target a random character. Enemies also take 5 additional damage from all sources for 1 turn. This skill then swaps back to 'Pocket EMP'.",
                "energy": [
                    "Genjutsu",
                    "Random"
                ],
                "target": "all-enemy",
                "damage": 0,
                "cooldown": 3,
                "classes": [
                    "Physical",
                    "Instant",
                    "Ranged"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "batman_smoke_bomb_blind",
                        "duration": 1,
                        "scope": "all-enemy",
                        "metadata": {
                            "harmful": true,
                            "harmfulBlind": true,
                            "damageTakenBonusFlat": 5,
                            "tooltipText": "This character is blinded and takes 5 additional damage from all sources."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "batman_gadget_swap",
                        "duration": 99,
                        "scope": "self",
                        "metadata": {
                            "skillReplacements": {
                                "batman-pocket-emp": "batman-smoke-bomb",
                                "batman-smoke-bomb": "batman-pocket-emp"
                            },
                            "tooltipText": "Pocket EMP and Smoke Bomb are replaced by each other."
                        }
                    }
                ]
            },
            {
                "id": "batman-bat-kick",
                "name": "Bat Kick",
                "skillimage": "https://i.imgur.com/Lp7x70v.jpeg",
                "skilldescription": "Batman delivers a brutal martial arts strike, dealing 35 damage to one enemy.",
                "energy": [
                    "Genjutsu",
                    "Random"
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
                        "amount": 35,
                        "scope": "target"
                    }
                ]
            },
            {
                "id": "batman-passive-bat-signal",
                "name": "Passive: Bat Signal",
                "skillimage": "https://i.imgur.com/BJPvrVa.jpeg",
                "skilldescription": "Batman enters battle fully prepared. For the first turn of the match, Batman is invulnerable to harmful skills. This protection ends immediately if Batman uses a skill or if a new harmful enemy skill affects him.",
                "energy": [],
                "target": "",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Passive",
                    "Instant"
                ]
            },
            {
                "id": "batman-explosive-batarangs-empowered",
                "name": "Explosive Batarangs",
                "hiddenFromSelectionViewer": true,
                "skillimage": "https://i.imgur.com/8EK9yEi.png",
                "skilldescription": "Batman hurls three explosive batarangs at one enemy, each hit dealing 5 damage and 4 affliction damage.",
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
                    "Affliction"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 15,
                        "scope": "target"
                    },
                    {
                        "type": "damage",
                        "amount": 12,
                        "scope": "target",
                        "metadata": {
                            "afflictionDamage": true,
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true
                        }
                    }
                ]
            }
        ],
        "role": "Gadget Disruptor",
        "roleCategory": "strategic",
        "universe": "dc"
    },
    {
        "id": "the-flash-barry-allen",
        "characterId": "the-flash-barry-allen",
        "name": "The Flash (Barry Allen)",
        "facePicture": "https://i.imgur.com/hYpELKX.jpeg",
        "characterdeescription": "The Flash dominates the pace of battle through unmatched speed and relentless momentum. Rather than relying on raw durability, he overwhelms opponents by acting faster, striking repeatedly, and disrupting their ability to keep up. His abilities create rapid pressure windows, forcing enemies into reactive play while he dictates the flow of combat. With tools that accelerate his own actions and interfere with enemy timing, The Flash thrives in fast-paced encounters where every second matters. He can evade danger, reset momentum, and enable his team to act more efficiently, turning brief openings into decisive advantages.",
        "skills": [
            {
                "id": "the-flash-barry-allen-infinite-mass-punch",
                "name": "Infinite Mass Punch",
                "skillimage": "https://i.imgur.com/tZfTTzm.jpeg",
                "skilldescription": "Deals 45 damage to one enemy. This has no cooldown.",
                "energy": [
                    "Taijutsu",
                    "Bloodline"
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
                        "amount": 45,
                        "scope": "target"
                    }
                ],
                "classesHtml": "Physical, Melee, Instant"
            },
            {
                "id": "the-flash-barry-allen-lightning-rush",
                "name": "Lightning Rush",
                "skillimage": "https://i.imgur.com/Pwzbd89.jpeg",
                "skilldescription": "The Flash strikes one enemy 4 times in quick succession, dealing 5 damage each time. Each hit has a 25% chance to apply 'Shock': dealing 4 piercing damage for 4 turns. The Flash gains 'Speed Up' for 1 turn.",
                "energy": [
                    "Bloodline"
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
                        "amount": 5,
                        "scope": "target"
                    },
                    {
                        "type": "damage",
                        "amount": 5,
                        "scope": "target"
                    },
                    {
                        "type": "damage",
                        "amount": 5,
                        "scope": "target"
                    },
                    {
                        "type": "damage",
                        "amount": 5,
                        "scope": "target"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "the_flash_barry_allen_shock",
                        "duration": 4,
                        "scope": "target",
                        "chance": 25,
                        "metadata": {
                            "harmful": true,
                            "turnEndDamage": 4,
                            "ignoreTargetDamageReduction": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "mergeNumericAddKeys": [
                                "turnEndDamage"
                            ],
                            "tooltipTextTemplate": "This character takes {turnEndDamage} piercing damage from Shock each turn."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "the_flash_barry_allen_shock",
                        "duration": 4,
                        "scope": "target",
                        "chance": 25,
                        "metadata": {
                            "harmful": true,
                            "turnEndDamage": 4,
                            "ignoreTargetDamageReduction": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "mergeNumericAddKeys": [
                                "turnEndDamage"
                            ],
                            "tooltipTextTemplate": "This character takes {turnEndDamage} piercing damage from Shock each turn."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "the_flash_barry_allen_shock",
                        "duration": 4,
                        "scope": "target",
                        "chance": 25,
                        "metadata": {
                            "harmful": true,
                            "turnEndDamage": 4,
                            "ignoreTargetDamageReduction": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "mergeNumericAddKeys": [
                                "turnEndDamage"
                            ],
                            "tooltipTextTemplate": "This character takes {turnEndDamage} piercing damage from Shock each turn."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "the_flash_barry_allen_shock",
                        "duration": 4,
                        "scope": "target",
                        "chance": 25,
                        "metadata": {
                            "harmful": true,
                            "turnEndDamage": 4,
                            "ignoreTargetDamageReduction": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "mergeNumericAddKeys": [
                                "turnEndDamage"
                            ],
                            "tooltipTextTemplate": "This character takes {turnEndDamage} piercing damage from Shock each turn."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "the_flash_barry_allen_speed_up",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "ownerTurnEndExtraCooldownTicksBySkillId": {
                                "the-flash-barry-allen-phase-shift": 1
                            },
                            "skillReplacements": {
                                "the-flash-barry-allen-infinite-mass-punch": "the-flash-barry-allen-infinite-mass-punch-speed-up"
                            },
                            "tooltipText": "The Flash is sped up. Infinite Mass Punch is improved and Phase Shift active cooldown is lowered by 1."
                        }
                    }
                ]
            },
            {
                "id": "the-flash-barry-allen-speed-steal",
                "name": "Speed Steal",
                "skillimage": "https://i.imgur.com/XF2SCm0.jpeg",
                "skilldescription": "For 2 turns, the enemy player only has 40 seconds to complete their turn and you are given 20 additional seconds to complete yours. The Flash gains 'Speed Up' and this swaps to 'Flashpoint Surge' while active.",
                "energy": [
                    "Random",
                    "Random"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 4,
                "classes": [
                    "Energy",
                    "Ranged",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "the_flash_barry_allen_speed_up",
                        "duration": 2,
                        "scope": "self",
                        "metadata": {
                            "ownerTurnEndExtraCooldownTicksBySkillId": {
                                "the-flash-barry-allen-phase-shift": 1
                            },
                            "skillReplacements": {
                                "the-flash-barry-allen-infinite-mass-punch": "the-flash-barry-allen-infinite-mass-punch-speed-up"
                            },
                            "tooltipText": "The Flash is sped up. Infinite Mass Punch is improved and Phase Shift active cooldown is lowered by 1."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "the_flash_barry_allen_speed_steal_active",
                        "duration": 2,
                        "scope": "self",
                        "metadata": {
                            "ownTurnDurationBonusMs": 20000,
                            "enemyTurnDurationPenaltyMs": 20000,
                            "skillReplacements": {
                                "the-flash-barry-allen-speed-steal": "the-flash-barry-allen-flashpoint-surge"
                            },
                            "tooltipText": "For 2 turns, your turns last 20 additional seconds, enemy turns last 20 fewer seconds, and Speed Steal is replaced by Flashpoint Surge."
                        }
                    }
                ]
            },
            {
                "id": "the-flash-barry-allen-phase-shift",
                "name": "Phase Shift",
                "skillimage": "https://i.imgur.com/3m7tgys.jpeg",
                "skilldescription": "The Flash removes all harmful skills and gains 100% evasion for 1 turn. If The Flash is 'Speed Up', this skill's active cooldown is 1 turn less.",
                "energy": [],
                "target": "self",
                "damage": 0,
                "cooldown": 4,
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "cleanse_harmful",
                        "count": 99,
                        "scope": "self"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "the_flash_barry_allen_phase_shift",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "evadeChancePercent": 100,
                            "tooltipText": "The Flash has 100% evasion."
                        }
                    }
                ]
            },
            {
                "id": "the-flash-barry-allen-flashpoint-surge",
                "name": "Flashpoint Surge",
                "useBaseSkillCooldown": true,
                "skillimage": "https://i.imgur.com/2rQgv0G.jpeg",
                "skilldescription": "The Flash resets his team's cooldowns and heals them 25 HP.",
                "energy": [
                    "Bloodline",
                    "Random",
                    "Random"
                ],
                "target": "all-allies",
                "damage": 0,
                "cooldown": 4,
                "classes": [
                    "Physical",
                    "Melee",
                    "Instant",
                    "Bypassing"
                ],
                "effects": [
                    {
                        "type": "modify_cooldowns",
                        "operation": "set",
                        "amount": 0,
                        "includeAllCharacterSkills": true,
                        "scope": "all-allies",
                        "ignoreHelpfulInvulnerability": true
                    },
                    {
                        "type": "heal",
                        "amount": 25,
                        "scope": "all-allies",
                        "metadata": {
                            "ignoreHelpfulInvulnerability": true
                        }
                    }
                ],
                "classesHtml": "Physical, Melee, Instant, Bypassing"
            },
            {
                "id": "the-flash-barry-allen-infinite-mass-punch-speed-up",
                "name": "Infinite Mass Punch",
                "hiddenFromSelectionViewer": true,
                "useBaseSkillCooldown": true,
                "cannotBeCountered": true,
                "cannotBeReflected": true,
                "ignoreInvulnerability": true,
                "skillimage": "https://i.imgur.com/vwUOYsd.png",
                "skilldescription": "Deals 55 damage to one enemy while Speed Up is active. This skill is Bypassing, Uncounterable, and Unreflectable.",
                "energy": [
                    "Taijutsu",
                    "Bloodline"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Physical",
                    "Melee",
                    "Instant",
                    "Bypassing",
                    "Uncounterable",
                    "Unreflectable"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 55,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageImmunity": true
                        }
                    }
                ],
                "classesHtml": "Physical, Melee, Instant, Bypassing, Uncounterable, Unreflectable"
            }
        ],
        "role": "Tempo DPS",
        "roleCategory": "damage",
        "universe": "dc"
    },
    {
        "id": "wonder-woman",
        "characterId": "wonder-woman",
        "name": "Wonder Woman",
        "nameHtml": "Wonder Woman",
        "facePicture": "https://i.imgur.com/ZAAWc5G.jpeg",
        "url": "https://i.imgur.com/ZAAWc5G.jpeg",
        "unlockRequirement": "None",
        "unlockRequirementHtml": "None",
        "characterdeescription": "A battle-hardened warrior from Themyscira, Wonder Woman leads the charge with unmatched strength and strategy. On any team, she serves as the frontline powerhouse, able to dish out heavy damage while shielding allies from harm. Her spear and combat prowess allow her to strike key targets relentlessly, while her Lasso of Truth can neutralize the enemy's biggest threats.",
        "description": "A battle-hardened warrior from Themyscira, Wonder Woman leads the charge with unmatched strength and strategy. On any team, she serves as the frontline powerhouse, able to dish out heavy damage while shielding allies from harm. Her spear and combat prowess allow her to strike key targets relentlessly, while her Lasso of Truth can neutralize the enemy's biggest threats.",
        "descriptionHtml": "A battle-hardened warrior from Themyscira, Wonder Woman leads the charge with unmatched strength and strategy.<br>On any team, she serves as the frontline powerhouse, able to dish out heavy damage while shielding allies from harm.<br>Her spear and combat prowess allow her to strike key targets relentlessly, while her Lasso of Truth can neutralize the enemy's biggest threats.",
        "skills": [
            {
                "id": "wonder-woman-spear-thrust",
                "name": "Spear Thrust",
                "nameHtml": "Spear Thrust",
                "skillimage": "https://i.imgur.com/tRwPWpF.jpeg",
                "url": "https://i.imgur.com/tRwPWpF.jpeg",
                "skilldescription": "Deals 30 piercing damage to one enemy and 20 piercing damage to a random different enemy. Swaps to Warrior's Strike for 1 turn.",
                "description": "Deals 30 piercing damage to one enemy and 20 piercing damage to a random different enemy. Swaps to Warrior's Strike for 1 turn.",
                "descriptionHtml": "Deals 25 piercing damage to one enemy and 10 piercing damage to a random different enemy.<br>Swaps to Warrior's Strike for 1 turn.",
                "energy": [
                    "Taijutsu",
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "cooldownHtml": "None",
                "classes": [
                    "Physical",
                    "Melee",
                    "Instant"
                ],
                "classesHtml": "Physical, Melee, Instant",
                "effects": [
                    {
                        "type": "damage",
                        "amount": 30,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageReduction": true
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 20,
                        "scope": "random-other-enemy",
                        "metadata": {
                            "ignoreDamageReduction": true
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "wonder_woman_spear_thrust_followup",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "skillReplacementsByRemainingTurns": {
                                "1": {
                                    "wonder-woman-spear-thrust": "wonder-woman-warriors-strike"
                                }
                            },
                            "tooltipText": "Spear Thrust is replaced by Warrior's Strike."
                        }
                    }
                ]
            },
            {
                "id": "wonder-woman-brace-of-submission",
                "name": "Brace of Submission",
                "nameHtml": "Brace of Submission",
                "skillimage": "https://i.imgur.com/hOWzTTF.jpeg",
                "url": "https://i.imgur.com/hOWzTTF.jpeg",
                "skilldescription": "For 1 turn, the next non-mental skill used on Wonder Woman will be reflected to a random enemy.",
                "description": "For 1 turn, the next non-mental skill used on Wonder Woman will be reflected to a random enemy.",
                "descriptionHtml": "For 1 turn, the next non-mental skill used on Wonder Woman will be reflected to a random enemy.<br>",
                "energy": [
                    "Ninjutsu"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 2,
                "cooldownHtml": "2",
                "classes": [
                    "Physical",
                    "Ranged",
                    "Instant",
                    "Invisible"
                ],
                "classesHtml": "Physical, Ranged, Instant, Invisible",
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "wonder_woman_brace_of_submission_reflect",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "reflectNextIncomingSkill": true,
                            "reflectExcludeSkillClasses": [
                                "mental"
                            ],
                            "reflectToRandomCasterAlly": true,
                            "skipFirstTurnEndTick": true,
                            "preserveOnOwnerUseSkillTrigger": true,
                            "hideTooltipFromEnemy": true,
                            "tooltipText": "The next non-mental skill used on Wonder Woman is reflected to a random enemy."
                        }
                    }
                ]
            },
            {
                "id": "wonder-woman-lasso-of-truth",
                "name": "Lasso of Truth",
                "nameHtml": "Lasso of Truth",
                "skillimage": "https://i.imgur.com/8JgkJPq.jpegg",
                "url": "https://i.imgur.com/8JgkJPq.jpeg",
                "skilldescription": "Stuns one enemy's physical and mental skills and paralyzes their cooldowns for 1 turn. For the rest of the game, this enemy takes 5 additional damage from all sources.",
                "description": "Stuns one enemy's physical and mental skills and paralyzes their cooldowns for 1 turn. For the rest of the game, this enemy takes 5 additional damage from all sources.",
                "descriptionHtml": "Stuns one enemy's physical and mental skills and paralyzes their cooldowns for 1 turn.<br>For the rest of the game, this enemy takes 5 additional damage from all sources.",
                "energy": [
                    "Ninjutsu"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 2,
                "cooldownHtml": "2",
                "classes": [
                    "Physical",
                    "Ranged",
                    "Instant"
                ],
                "classesHtml": "Physical, Ranged, Instant",
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "wonder_woman_lasso_of_truth_lock",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "freezeCooldowns": true,
                            "cannotUseSkillClasses": [
                                "physical",
                                "mental"
                            ],
                            "tooltipText": "This character's physical and mental skills are stunned, and their cooldowns are paralyzed."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "wonder_woman_lasso_of_truth_mark",
                        "duration": 99,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "infiniteDuration": true,
                            "damageTakenBonusFlat": 5,
                            "mergeNumericAddKeys": [
                                "damageTakenBonusFlat"
                            ],
                            "tooltipTextTemplate": "This character takes {damageTakenBonusFlat} additional damage."
                        }
                    }
                ]
            },
            {
                "id": "wonder-woman-amazonian-guard",
                "name": "Amazonian Guard",
                "nameHtml": "Amazonian Guard",
                "skillimage": "https://i.imgur.com/XQ0qm1p.jpeg",
                "url": "https://i.imgur.com/XQ0qm1p.jpeg",
                "skilldescription": "Grants Wonder Woman or one selected ally 15 points of destructible defense for 1 turn.",
                "description": "Grants Wonder Woman or one selected ally 15 points of destructible defense for 1 turn.",
                "descriptionHtml": "Grants Wonder Woman or one selected ally 15 points of destructible defense for 1 turn.<br>",
                "energy": [
                    "Random"
                ],
                "target": "self-or-single-ally",
                "damage": 0,
                "cooldown": 1,
                "cooldownHtml": "1",
                "classes": [
                    "Physical",
                    "Instant",
                    "Invisible"
                ],
                "classesHtml": "Physical, Instant, Invisible",
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "wonder_woman_amazonian_guard",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "destructibleDefensePoints": 15,
                            "tooltipTextTemplate": "This character has {destructibleDefensePoints} destructible defense."
                        }
                    }
                ]
            },
            {
                "id": "wonder-woman-warriors-strike",
                "name": "Warrior's Strike",
                "nameHtml": "Warrior's Strike",
                "hiddenFromSelectionViewer": true,
                "useBaseSkillCooldown": true,
                "skillimage": "https://i.imgur.com/q35I98q.jpeg",
                "url": "https://i.imgur.com/q35I98q.jpeg",
                "skilldescription": "Wonder Woman deals 25 damage to one enemy and casts Amazonian Guard on herself for 15 points of destructible defense.",
                "description": "Wonder Woman deals 25 damage to one enemy and casts Amazonian Guard on herself for 15 points of destructible defense.",
                "descriptionHtml": "Wonder Woman deals 25 damage to one enemy and casts Amazonian Guard on herself for 15 points of destructible defense.",
                "energy": [
                    "Taijutsu"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "cooldownHtml": "None",
                "classes": [
                    "Physical",
                    "Melee",
                    "Instant"
                ],
                "classesHtml": "Physical, Melee, Instant",
                "effects": [
                    {
                        "type": "damage",
                        "amount": 25,
                        "scope": "target"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "wonder_woman_amazonian_guard",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "destructibleDefensePoints": 15,
                            "tooltipTextTemplate": "This character has {destructibleDefensePoints} destructible defense."
                        }
                    }
                ]
            }
        ],
        "role": "Frontline Bruiser",
        "roleCategory": "bruiser",
        "universe": "dc"
    },
    {
        "id": "aquaman",
        "characterId": "aquaman",
        "name": "Aquaman",
        "facePicture": "https://i.imgur.com/76Svd5q.jpeg",
        "characterdeescription": "Ruler of Atlantis and master of the oceans, Aquaman dominates the battlefield through relentless pressure and crushing tidal control. Wielding his legendary trident, he marks enemies for punishment, drags them beneath the waves, and unleashes swarms of sea creatures to finish them off. Whether shielding himself with rushing currents or drowning foes in mounting afflictions, Aquaman excels at overwhelming teams that rely on defense or invulnerability.",
        "skills": [
            {
                "id": "aquaman-trident-strike",
                "name": "Trident Strike",
                "skillimage": "https://i.imgur.com/fvvaagh.jpeg",
                "skilldescription": "Aquaman strikes one enemy with his trident, dealing 17 piercing damage and marking them for 1 turn. If used on a marked enemy, Aquaman also stuns their helpful skills for 1 turn.",
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
                        "amount": 17,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageReduction": true
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "aquaman_trident_strike_helpful_stun",
                        "duration": 1,
                        "scope": "target",
                        "condition": {
                            "statusId": "aquaman_trident_strike_mark",
                            "scope": "target"
                        },
                        "metadata": {
                            "harmful": true,
                            "cannotUseHelpfulSkills": true,
                            "tooltipText": "This character helpful skills are stunned."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "aquaman_trident_strike_mark",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "skipFirstTurnEndTick": true,
                            "tooltipText": "This character is marked by Trident Strike."
                        }
                    }
                ]
            },
            {
                "id": "aquaman-drown",
                "name": "Drown",
                "skillimage": "https://i.imgur.com/Quiv9Wj.jpeg",
                "skilldescription": "Aquaman forces one enemy's head underwater, removing 1 random energy from them and dealing 20 affliction damage. If they are marked by 'Trident Strike', they are given a stack of 'Sea Sharks'.",
                "energy": [
                    "Ninjutsu"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Physical",
                    "Melee",
                    "Instant",
                    "Affliction"
                ],
                "effects": [
                    {
                        "type": "remove_random_chakra",
                        "amount": 1,
                        "scope": "target"
                    },
                    {
                        "type": "damage",
                        "amount": 15,
                        "scope": "target",
                        "metadata": {
                            "afflictionDamage": true,
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "aquaman_sea_sharks",
                        "sourceSkillId": "aquaman-sea-sharks",
                        "duration": 99,
                        "scope": "target",
                        "condition": {
                            "statusId": "aquaman_trident_strike_mark",
                            "scope": "target"
                        },
                        "metadata": {
                            "harmful": true,
                            "infiniteDuration": true,
                            "turnEndDamage": 4,
                            "ignoreTargetDamageReduction": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "triggerOnApply": true,
                            "mergeNumericAddKeys": [
                                "turnEndDamage"
                            ],
                            "tooltipTextTemplate": "This character takes {turnEndDamage} piercing damage each turn from Sea Sharks."
                        }
                    }
                ]
            },
            {
                "id": "aquaman-tidal-wave",
                "name": "Tidal Wave",
                "skillimage": "https://i.imgur.com/CaFUaKo.jpeg",
                "skilldescription": "Aquaman makes the enemy team unable to reduce damage or become invulnerable, increases their cooldowns by 1 and their energy costs by 1 random energy for 2 turns. When this skill ends, they have their harmful skills stunned for 1 turn and are granted a stack of 'Sea Sharks'. If an enemy is marked by 'Trident Strike' at the end of the second turn, they take 30 damage.",
                "energy": [
                    "Ninjutsu",
                    "Ninjutsu"
                ],
                "target": "all-enemy",
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
                        "statusId": "aquaman_tidal_wave_cost_increase",
                        "duration": 2,
                        "scope": "all-enemy",
                        "metadata": {
                            "harmful": true,
                            "randomCostIncrease": 1,
                            "tooltipText": "This character's skills cost 1 additional random energy from Tidal Wave."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "aquaman_tidal_wave",
                        "duration": 2,
                        "scope": "all-enemy",
                        "metadata": {
                            "harmful": true,
                            "cannotReduceDamage": true,
                            "cannotBecomeInvulnerable": true,
                            "usedSkillCooldownPenalty": 1,
                            "onExpireEffects": [
                                {
                                    "type": "apply_status",
                                    "statusId": "aquaman_tidal_wave_harmful_stun",
                                    "duration": 1,
                                    "metadata": {
                                        "harmful": true,
                                        "cannotUseHarmfulSkills": true,
                                        "tooltipText": "This character harmful skills are stunned."
                                    }
                                },
                                {
                                    "type": "apply_status",
                                    "statusId": "aquaman_sea_sharks",
                                    "sourceSkillId": "aquaman-sea-sharks",
                                    "duration": 99,
                                    "metadata": {
                                        "harmful": true,
                                        "infiniteDuration": true,
                                        "turnEndDamage": 4,
                                        "ignoreTargetDamageReduction": true,
                                        "turnEndTrigger": "source_turn",
                                        "turnDurationAnchor": "source_turn",
                                        "triggerOnApply": true,
                                        "mergeNumericAddKeys": [
                                            "turnEndDamage"
                                        ],
                                        "tooltipTextTemplate": "This character takes {turnEndDamage} piercing damage each turn from Sea Sharks."
                                    }
                                },
                                {
                                    "type": "damage",
                                    "amount": 30,
                                    "condition": {
                                        "statusId": "aquaman_trident_strike_mark",
                                        "scope": "target"
                                    }
                                }
                            ],
                            "tooltipText": "This character cannot reduce damage or become invulnerable and the skills they use have their cooldown increased by 1 turn. When this skill ends, this character will be stunned for 1 turn"
                        }
                    }
                ]
            },
            {
                "id": "aquaman-water-jet",
                "name": "Water Jet",
                "skillimage": "https://i.imgur.com/0NmOe89.jpeg",
                "skilldescription": "This skill makes Aquaman invulnerable for 1 turn and grants all enemies a stack of 'Sea Sharks'.",
                "energy": [
                    "Random"
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
                        "statusId": "aquaman_water_jet_invulnerable",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "invulnerable": true,
                            "tooltipText": "This character is invulnerable."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "aquaman_sea_sharks",
                        "sourceSkillId": "aquaman-sea-sharks",
                        "duration": 99,
                        "scope": "all-enemy",
                        "metadata": {
                            "harmful": true,
                            "infiniteDuration": true,
                            "turnEndDamage": 4,
                            "ignoreTargetDamageReduction": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "triggerOnApply": true,
                            "mergeNumericAddKeys": [
                                "turnEndDamage"
                            ],
                            "tooltipTextTemplate": "This character takes {turnEndDamage} piercing damage each turn from Sea Sharks."
                        }
                    }
                ]
            },
            {
                "id": "aquaman-sea-sharks",
                "name": "Sea Sharks",
                "skillimage": "https://i.imgur.com/38s3F0Z.jpeg",
                "skilldescription": "Deals 4 piercing damage permanently (stacks).",
                "energy": [],
                "target": "",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Physical",
                    "Ranged",
                    "Instant"
                ]
            }
        ],
        "role": "Anti-Tank",
        "roleCategory": "bruiser",
        "universe": "dc"
    },
    {
        "id": "storm",
        "characterId": "storm",
        "name": "Storm",
        "facePicture": "https://i.imgur.com/5v5AXWu.png",
        "characterdeescription": "Storm is a support-controller who heals allies over time, removes harmful effects, and disrupts enemy actions. Her abilities reward smart timing and positioning, allowing her to sustain her team while limiting enemy options.",
        "skills": [
            {
                "id": "storm-lightning-strike",
                "name": "Lightning Strike",
                "skillimage": "https://i.imgur.com/cIQ7sTM.png",
                "skilldescription": "Storm calls down lightning, dealing 30 piercing damage to one enemy and fully stunning them for 1 turn.",
                "energy": [
                    "ninjutsu",
                    "random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Energy",
                    "Ranged",
                    "Instant",
                    "Bypassing"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 30,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageReduction": true
                        }
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
                    }
                ],
                "classesHtml": "Energy, Ranged, Instant, Bypassing"
            },
            {
                "id": "storm-wind-funnel",
                "name": "Wind Funnel",
                "skillimage": "https://i.imgur.com/L0Yu0B4.png",
                "skilldescription": "Storm targets an ally or herself, removing all active enemy effects from them. If 'Rainstorm' is active, one random enemy has their skills silenced for 1 turn.",
                "energy": [
                    "Random"
                ],
                "target": "self-or-single-ally",
                "damage": 0,
                "cooldown": 2,
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "cleanse_statuses",
                        "count": 0,
                        "harmfulOnly": true,
                        "sourceRelation": "enemy",
                        "scope": "target"
                    }
                ]
            },
            {
                "id": "storm-rainstorm",
                "name": "Rainstorm",
                "skillimage": "https://i.imgur.com/xB6A34j.png",
                "skilldescription": "Storm heals her entire team for 12 HP per turn for 4 turns. While active, this becomes 'Hailstorm' and Storm's skills are improved.",
                "energy": [
                    "Ninjutsu"
                ],
                "target": "all-allies",
                "damage": 0,
                "cooldown": 4,
                "classes": [
                    "Energy",
                    "Instant",
                    "Bypassing"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "storm_rainstorm_active",
                        "duration": 4,
                        "scope": "self",
                        "metadata": {
                            "skillReplacements": {
                                "storm-rainstorm": "storm-hailstorm",
                                "storm-lightning-strike": "storm-lightning-strike-rainstorm",
                                "storm-wind-funnel": "storm-wind-funnel-rainstorm"
                            },
                            "tooltipText": " This skill is now Hailstorm and storm's skills are improved"
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "storm_rainstorm_heal",
                        "duration": 4,
                        "scope": "all-allies",
                        "metadata": {
                            "turnEndHealFlat": 12,
                            "tooltipText": "This character will heal 12 health each turn."
                        },
                        "ignoreHelpfulInvulnerability": true
                    }
                ],
                "classesHtml": "Energy, Instant, Bypassing"
            },
            {
                "id": "storm-ice-barrier",
                "name": "Ice Barrier",
                "skillimage": "https://i.imgur.com/fsSRHNk.png",
                "skilldescription": "Storm targets herself or one ally, countering the first enemy skill used on them for 1 turn. until triggered.",
                "energy": [
                    "random"
                ],
                "target": "self-or-single-ally",
                "damage": 0,
                "cooldown": 3,
                "classes": [
                    "Energy",
                    "Instant",
                    "Invisible"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "storm_ice_barrier_guard",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "triggerOnEnemyHarmfulSkill": true,
                            "counterCancelsSkill": true,
                            "counterStatusId": "storm_ice_barrier_countered",
                            "counterStatusDuration": 1,
                            "counterStatusMetadata": {
                                "harmful": true,
                                "tooltipText": "This character was countered by Ice Barrier."
                            },
                            "turnDurationAnchor": "source_turn",
                            "onExpireApplyStatusToSelf": {
                                "statusId": "storm_ice_barrier_used",
                                "duration": 1,
                                "metadata": {
                                    "tooltipText": "This skill has been used."
                                }
                            },
                            "usedStatusId": "storm_ice_barrier_used",
                            "usedStatusDuration": 1,
                            "usedStatusMetadata": {
                                "tooltipText": "This skill has been used."
                            },
                            "counterApplyStatusToSourceOwner": {
                                "statusId": "storm_ice_barrier_defense",
                                "duration": 99,
                                "metadata": {
                                    "destructibleDefensePoints": 15,
                                    "mergeNumericAddKeys": [
                                        "destructibleDefensePoints"
                                    ],
                                    "tooltipTextTemplate": "This character has {destructibleDefensePoints} destructible defense.",
                                    "tooltipText": "This character has 15 destructible defense."
                                }
                            },
                            "hideTooltipFromEnemy": true,
                            "tooltipText": "The next enemy harmful skill used on this character this turn is countered. If triggered, this character gains 15 permanent destructible defense."
                        }
                    }
                ],
                "classesHtml": "Energy, Instant, Invisible"
            },
            {
                "id": "storm-hailstorm",
                "name": "Hailstorm",
                "skillimage": "https://i.imgur.com/HPsujWh.png",
                "skilldescription": "For 4 turns, all enemies take 8 damage per turn. On turn 2 of this skill, their harmful skills are stunned for 1 turn. On turn 4 of this skill, their helpful skills are stunned for 1 turn.",
                "energy": [
                    "Genjutsu",
                    "Random"
                ],
                "target": "all-enemy",
                "damage": 0,
                "cooldown": 4,
                "classes": [
                    "Energy",
                    "Ranged",
                    "Instant",
                    "Bypassing"
                ],
                "ignoreInvulnerability": true,
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "storm_hailstorm_damage",
                        "duration": 4,
                        "scope": "all-enemy",
                        "metadata": {
                            "harmful": true,
                            "turnEndDamage": 8,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "tooltipText": "This character takes 8 damage at the end of each of Storm's turns."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "storm_hailstorm_harmful_delay",
                        "duration": 2,
                        "scope": "all-enemy",
                        "metadata": {
                            "harmful": true,
                            "turnDurationAnchor": "source_turn",
                            "hideTooltip": true,
                            "onExpireApplyStatusToSelf": {
                                "statusId": "storm_hailstorm_harmful_stun",
                                "duration": 1,
                                "metadata": {
                                    "harmful": true,
                                    "cannotUseHarmfulSkills": true,
                                    "tooltipText": "This character harmful skills are stunned."
                                }
                            }
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "storm_hailstorm_helpful_delay",
                        "duration": 4,
                        "scope": "all-enemy",
                        "metadata": {
                            "harmful": true,
                            "turnDurationAnchor": "source_turn",
                            "hideTooltip": true,
                            "onExpireApplyStatusToSelf": {
                                "statusId": "storm_hailstorm_helpful_stun",
                                "duration": 1,
                                "metadata": {
                                    "harmful": true,
                                    "cannotUseHelpfulSkills": true,
                                    "tooltipText": "This character helpful skills are stunned."
                                }
                            }
                        }
                    }
                ],
                "classesHtml": "Energy, Ranged, Instant, Bypassing"
            },
            {
                "id": "storm-lightning-strike-rainstorm",
                "name": "Lightning Strike",
                "hiddenFromSelectionViewer": true,
                "useBaseSkillCooldown": true,
                "skillimage": "https://i.imgur.com/cIQ7sTM.png",
                "skilldescription": "Storm calls down lightning, dealing 30 piercing damage to one enemy and fully stunning them for 1 turn. This also deals 10 piercing damage to all other enemies.",
                "energy": [
                    "ninjutsu",
                    "random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Energy",
                    "Ranged",
                    "Instant",
                    "Bypassing"
                ],
                "ignoreInvulnerability": true,
                "effects": [
                    {
                        "type": "damage",
                        "amount": 30,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageReduction": true
                        }
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
                        "type": "damage",
                        "amount": 10,
                        "scope": "other-enemies",
                        "metadata": {
                            "ignoreDamageReduction": true
                        }
                    }
                ],
                "classesHtml": "Energy, Ranged, Instant, Bypassing"
            },
            {
                "id": "storm-wind-funnel-rainstorm",
                "name": "Wind Funnel",
                "hiddenFromSelectionViewer": true,
                "useBaseSkillCooldown": true,
                "skillimage": "https://i.imgur.com/L0Yu0B4.png",
                "skilldescription": "Storm targets herself or one ally, removing all active enemy effects from them. One random enemy then has all their skills silenced for 1 turn.",
                "energy": [
                    "Random"
                ],
                "target": "self-or-single-ally",
                "damage": 0,
                "cooldown": 2,
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "cleanse_statuses",
                        "count": 0,
                        "harmfulOnly": true,
                        "sourceRelation": "enemy",
                        "scope": "target"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "storm_wind_funnel_silence",
                        "duration": 1,
                        "scope": "random-enemy",
                        "metadata": {
                            "harmful": true,
                            "silenceNonDamageEffects": true,
                            "tooltipText": "Silenced: only damage from this character's skills will work."
                        }
                    }
                ]
            }
        ],
        "role": "Heal Support",
        "roleCategory": "support",
        "universe": "marvel"
    },
    {
        "id": "venom",
        "characterId": "venom",
        "name": "Venom",
        "facePicture": "https://i.imgur.com/T7RpFwn.png",
        "characterdeescription": "Venom excels as a self-sustaining bruiser who draws aggression, disrupts enemies, and converts his own survival into team advantage. He thrives in the chaos of focus fire, feeding on damage to keep himself standing while forcing enemies to deal with him. His presence is oppressive but calculated—taunting teams into attacking him, isolating threats with precise control, and sustaining through relentless lifesteal. When the tide turns or his body begins to fail, Venom becomes something even more dangerous, sacrificing himself to empower an ally with overwhelming defense and energy. Whether anchoring the front line or enabling a decisive swing, he ensures that ignoring him is never an option—and killing him may be even worse.",
        "skills": [
            {
                "id": "venom-ravenous-bite",
                "name": "Ravenous Bite",
                "skillimage": "https://i.imgur.com/tjeIQ9D.png",
                "skilldescription": "Deals 35 damage to one enemy. Venom heals 20 HP.",
                "energy": [
                    "Bloodline",
                    "Random"
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
                        "amount": 35,
                        "scope": "target"
                    },
                    {
                        "type": "heal",
                        "amount": 20,
                        "scope": "self"
                    }
                ]
            },
            {
                "id": "venom-pulling-tendrils",
                "name": "Pulling Tendrils",
                "skillimage": "https://i.imgur.com/MWVKUSL.png",
                "skilldescription": "Venom taunts the enemy team for 1 turn. Next turn, 'Ravenous Bite' heals 15 more health.",
                "energy": [
                    "Random",
                    "Random"
                ],
                "target": "all-enemy",
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Physical",
                    "Ranged",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "venom_pulling_tendrils_taunt",
                        "duration": 1,
                        "scope": "all-enemy",
                        "metadata": {
                            "harmful": true,
                            "taunt": true,
                            "turnDurationAnchor": "source_turn",
                            "tooltipText": "This character is taunted and can only target Venom."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "venom_pulling_tendrils_bite_buff",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "turnDurationAnchor": "source_turn",
                            "skillReplacements": {
                                "venom-ravenous-bite": "venom-ravenous-bite-empowered"
                            },
                            "tooltipText": "Ravenous Bite now deals 30 damage to one enemy and heals Venom for 35 HP."
                        }
                    }
                ]
            },
            {
                "id": "venom-venom-web-wrap",
                "name": "Venom Web Wrap",
                "skillimage": "https://i.imgur.com/aFSulnK.png",
                "skilldescription": "Venom stuns one enemy's non-affliction skills for 2 turns. If the target recieves new damage, this skill will end.",
                "energy": [
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 3,
                "classes": [
                    "Physical",
                    "Ranged",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "venom_web_wrap_lock",
                        "duration": 2,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "cannotUseSkillClasses": [
                                "physical",
                                "chakra",
                                "mental",
                                "energy"
                            ],
                            "removeStatusIdsOnNewDamage": [
                                "venom_web_wrap_lock"
                            ],
                            "tooltipText": "This character non-affliction skills are stunned. This effect ends if they take new damage."
                        }
                    }
                ]
            },
            {
                "id": "venom-ally-symbiosis",
                "name": "Ally Symbiosis",
                "skillimage": "https://i.imgur.com/VnKHJsU.png",
                "skilldescription": "Venom dies and grants one ally permanent destructible defense equal to his current HP. While the ally has that destructible defense, they gain 1 additional random energy each turn. This may only be used if Venom is at 50 HP or below.",
                "energy": [
                    "Random"
                ],
                "target": "single-ally",
                "damage": 0,
                "cooldown": 0,
                "actorCondition": {
                    "sourceCurrentHpAtMost": 50
                },
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "venom_ally_symbiosis_transfer",
                        "duration": 99,
                        "scope": "target",
                        "metadata": {
                            "copySourceCurrentHpToKeys": [
                                "destructibleDefensePoints"
                            ],
                            "destructibleDefensePoints": 0,
                            "additionalRandomChakraPerTurn": 1,
                            "tooltipTextTemplate": "This character has {destructibleDefensePoints} destructible defense and gains 1 additional random chakra each turn."
                        }
                    },
                    {
                        "type": "HealthLoss",
                        "amount": 0,
                        "scope": "self",
                        "metadata": {
                            "amountFromSourceCurrentHp": true
                        }
                    }
                ]
            },
            {
                "id": "venom-passive-symbiote-vigor",
                "name": "Passive: Symbiote Vigor",
                "skillimage": "https://i.imgur.com/AuGDgXi.png",
                "skilldescription": "Venom has 10% damage reduction while above 50 HP.",
                "energy": [],
                "target": "",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Passive",
                    "Instant"
                ]
            },
            {
                "id": "venom-ravenous-bite-empowered",
                "name": "Ravenous Bite",
                "hiddenFromSelectionViewer": true,
                "useBaseSkillCooldown": true,
                "skillimage": "https://i.imgur.com/tjeIQ9D.png",
                "skilldescription": "Deals 30 damage to one enemy. Venom heals 35 HP.",
                "energy": [
                    "Taijutsu",
                    "Random"
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
                        "amount": 30,
                        "scope": "target"
                    },
                    {
                        "type": "heal",
                        "amount": 35,
                        "scope": "self"
                    }
                ]
            }
        ],
        "startStatuses": [
            {
                "statusId": "venom_passive_symbiote_vigor",
                "sourceSkillId": "venom-passive-symbiote-vigor",
                "duration": 99,
                "metadata": {
                    "infiniteDuration": true,
                    "activeWhileOwnerCurrentHpAtLeast": 51,
                    "damageReductionPercent": 10,
                    "tooltipText": "While above 50 HP, Venom has 10% damage reduction."
                }
            }
        ],
        "role": "Sustain Tank",
        "roleCategory": "tank",
        "universe": "marvel"
    },
    {
        "id": "the-joker",
        "characterId": "the-joker",
        "name": "The Joker",
        "facePicture": "https://i.imgur.com/kbaUc1f.png",
        "characterdeescription": "The Joker specializes in destabilizing enemies through unpredictable traps, afflictions, and psychological pressure. Rather than overwhelming opponents with raw damage, he punishes decision-making itself—forcing enemies into lose-lose situations where every action carries risk. By planting hidden threats and disrupting key abilities, The Joker excels at dismantling coordinated strategies and isolating high-value targets. His toxins weaken offensive output over time, while his gadgets interrupt, silence, and invalidate enemy actions at critical moments. The longer a fight drags on, the more control he exerts, turning chaos into a weapon and forcing opponents to play on his terms.",
        "skills": [
            {
                "id": "the-joker-hand-buzzer",
                "name": "Hand Buzzer",
                "skillimage": "https://i.imgur.com/t0AM8jf.png",
                "skilldescription": "Deals 1 piercing damage to one enemy and stuns their harmful skills for 1 turn. Swaps to 'Acid Flower'.",
                "energy": [],
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
                        "amount": 1,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageReduction": true
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "the_joker_hand_buzzer_lock",
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
                        "statusId": "the_joker_gag_cycle",
                        "duration": 99,
                        "scope": "self",
                        "metadata": {
                            "skillReplacements": {
                                "the-joker-hand-buzzer": "the-joker-acid-flower"
                            },
                            "tooltipText": "Hand Buzzer is replaced by Acid Flower."
                        }
                    }
                ]
            },
            {
                "id": "the-joker-crowbar",
                "name": "Crowbar",
                "skillimage": "https://i.imgur.com/EloJhie.png",
                "skilldescription": "For 2 turns, destroy one enemy's destructible defense each turn and deal 20 damage to them each turn.",
                "energy": [
                    "Random",
                    "Random"
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
                        "statusId": "the_joker_crowbar_mauling",
                        "duration": 2,
                        "scope": "target",
                        "metadata": {
                            "turnEndDestroyDestructibleDefense": true,
                            "harmful": true,
                            "turnEndDamage": 20,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "tooltipText": "This character recieves 20 damage and all of their destructible defense is destroyed each turn."
                        }
                    }
                ]
            },
            {
                "id": "the-joker-joker-venom",
                "name": "Joker Venom",
                "skillimage": "https://i.imgur.com/MZgtCyw.png",
                "skilldescription": "For 3 turns, one enemy has their maximum damage output capped to 15 and is dealt 15 affliction damage each turn.",
                "energy": [
                    "Taijutsu",
                    "Genjutsu"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 3,
                "classes": [
                    "Physical",
                    "Melee",
                    "Instant",
                    "Affliction"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "the_joker_joker_venom",
                        "duration": 3,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "maxDamageOutput": 15,
                            "turnEndDamage": 15,
                            "afflictionDamage": true,
                            "ignoreTargetDamageReduction": true,
                            "ignoreTargetDestructibleDefense": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "tooltipText": "This character's damage is capped to 15 and they recieve 15 affliction damage each turn."
                        }
                    }
                ]
            },
            {
                "id": "the-joker-bang",
                "name": "BANG!",
                "skillimage": "https://i.imgur.com/O3C7ZSC.png",
                "skilldescription": "This skill makes The Joker invulnerable for 1 turn. When this ends, one enemy is dealt 15 piercing damage.",
                "energy": [
                    "Random"
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
                        "statusId": "the_joker_bang_invulnerable",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "invulnerable": true,
                            "tooltipText": "This character is invulnerable."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "the_joker_bang_followup",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "triggerOnApply": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "turnEndRandomEnemyDamage": 15,
                            "turnEndRandomEnemyIgnoreDamageReduction": true,
                            "turnEndRandomEnemyIgnoreDestructibleDefense": true,
                            "tooltipText": "When this skill ends, a random enemy recieves 15 piercing damage."
                        }
                    }
                ]
            },
            {
                "id": "the-joker-acid-flower",
                "name": "Acid Flower",
                "useBaseSkillCooldown": true,
                "skillimage": "https://i.imgur.com/GIOcMgw.png",
                "skilldescription": "Deals 12 affliction damage to one enemy permanently. For 1 turn, the target has their helpful skills stunned. Swaps to 'Chattering Teeth'.",
                "energy": [
                    "Genjutsu"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Physical",
                    "Ranged",
                    "Instant",
                    "Affliction"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "the_joker_acid_flower_burn",
                        "duration": 99,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "infiniteDuration": true,
                            "mergeNumericAddKeys": [
                                "turnEndDamage"
                            ],
                            "turnEndDamage": 12,
                            "afflictionDamage": true,
                            "ignoreTargetDamageReduction": true,
                            "ignoreTargetDestructibleDefense": true,
                            "turnEndTrigger": "source_turn",
                            "tooltipTextTemplate": "This character takes {turnEndDamage} permanent affliction damage each turn."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "the_joker_acid_flower_helpful_lock",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "cannotUseHelpfulSkills": true,
                            "tooltipText": "This character helpful skills are stunned."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "the_joker_gag_cycle",
                        "duration": 99,
                        "scope": "self",
                        "metadata": {
                            "skillReplacements": {
                                "the-joker-hand-buzzer": "the-joker-chattering-teeth"
                            },
                            "tooltipText": "Hand Buzzer is replaced by Chattering Teeth."
                        }
                    }
                ]
            },
            {
                "id": "the-joker-chattering-teeth",
                "name": "Chattering Teeth",
                "useBaseSkillCooldown": true,
                "skillimage": "https://i.imgur.com/vh7qbuR.png",
                "skilldescription": "Marks the enemy team for 2 turns. If a marked enemy uses a new skill, they take 5 damage, have their harmful skills silenced the following turn, and the mark is removed. Swaps to 'Remote Bomb'.",
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
                        "type": "apply_status",
                        "statusId": "the_joker_chattering_teeth_mark",
                        "duration": 2,
                        "scope": "all-enemy",
                        "metadata": {
                            "harmful": true,
                            "onOwnerUseSkillTrigger": true,
                            "onOwnerUseSkillSelfDamage": 5,
                            "onOwnerUseSkillSelfDamageIgnoreDamageReduction": true,
                            "onOwnerUseSkillSelfDamageIgnoreDestructibleDefense": true,
                            "onOwnerUseSkillApplyStatusToOwner": {
                                "statusId": "the_joker_chattering_teeth_silence",
                                "duration": 1,
                                "fresh": true,
                                "metadata": {
                                    "harmful": true,
                                    "cannotUseHarmfulSkills": true,
                                    "tooltipText": "This character's harmful skills are silenced."
                                }
                            },
                            "tooltipText": "If this character uses a new skill, they take 5 damage, their harmful skills are silenced the following turn, and this mark is removed."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "the_joker_gag_cycle",
                        "duration": 99,
                        "scope": "self",
                        "metadata": {
                            "skillReplacements": {
                                "the-joker-hand-buzzer": "the-joker-remote-bomb"
                            },
                            "tooltipText": "Hand Buzzer is replaced by Remote Bombs."
                        }
                    }
                ]
            },
            {
                "id": "the-joker-remote-bomb",
                "name": "Remote Bomb",
                "useBaseSkillCooldown": true,
                "skillimage": "https://i.imgur.com/gA4KqdI.png",
                "skilldescription": "Marks one enemy for 1 turn. When this ends, they are dealt 20 affliction damage and have their active harmful skills cancelled. Swaps to 'Hand Buzzer'.",
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
                    "Affliction"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "the_joker_remote_bomb_mark",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "turnDurationAnchor": "source_turn",
                            "onExpireEffects": [
                                {
                                    "type": "damage",
                                    "amount": 20,
                                    "metadata": {
                                        "afflictionDamage": true,
                                        "ignoreDamageReduction": true,
                                        "ignoreDestructibleDefense": true
                                    }
                                },
                                {
                                    "type": "cleanse_statuses",
                                    "count": 0,
                                    "harmfulOnly": true,
                                    "sourceRelation": "ally"
                                }
                            ],
                            "tooltipText": "When this effect ends, this character recieves 20 affliction damage and their active harmful effects are cancelled."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "the_joker_gag_cycle",
                        "duration": 99,
                        "scope": "self",
                        "metadata": {
                            "hideTooltipFromEnemy": true,
                            "skillReplacements": {
                                "the-joker-hand-buzzer": "the-joker-hand-buzzer"
                            },
                            "tooltipText": "Hand Buzzer is restored. It deals 1 piercing damage to one enemy and stuns their harmful skills for 1 turn."
                        }
                    }
                ]
            }
        ],
        "role": "Gadget Disruptor",
        "roleCategory": "strategic",
        "universe": "dc"
    },
    {
        "id": "negan",
        "characterId": "negan",
        "name": "Negan",
        "facePicture": "https://i.imgur.com/SHLVdT9.jpeg",
        "characterdeescription": "Negan excels at isolating and eliminating priority targets through relentless, no-nonsense pressure. He doesn’t overwhelm enemies with flashy bursts—he breaks them down, step by step, until they’re completely screwed and out of options. With abilities that apply sustained damage and shut down healing, Negan forces opponents into dangerous territory fast. Once a target is marked, they’re on borrowed time—and if they don’t deal with him quickly, they’re as good as dead. Negan thrives on punishing mistakes. One bad move, one wrong target, one moment of hesitation—and he’ll capitalize immediately, ending the fight before the enemy team can recover.",
        "skills": [
            {
                "id": "negan-you-re-already-fucked",
                "name": "You're Already Fucked",
                "skillimage": "https://i.imgur.com/xlCXPVg.png",
                "skilldescription": "Negan strikes an enemy with Lucille, dealing 25 normal damage and 5 piercing damage to them. Negan heals 15 HP. This deals 5 additional damage to the target of 'You Got No Guts'.",
                "energy": [
                    "Random",
                    "Random"
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
                        "amount": 5,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageReduction": true
                        }
                    },
                    {
                        "type": "heal",
                        "amount": 15,
                        "scope": "self"
                    },
                    {
                        "type": "damage",
                        "amount": 0,
                        "scope": "target",
                        "condition": {
                            "statusId": "negan_you_got_no_guts",
                            "scope": "target",
                            "conditionalAmount": 5
                        }
                    }
                ]
            },
            {
                "id": "negan-you-got-no-guts",
                "name": "You Got No Guts",
                "skillimage": "https://i.imgur.com/VoLDAm3.png",
                "skilldescription": "Negan cuts open an enemy's bowels, dealing 10 bleed damage and then 5 bleed damage the following 3 turns. While affected, if the target's HP falls to 15 or less they are executed. Bleed cannot be ignored, increased, or reduced, and is removed by any healing effect. This ends on the previous target if used on a new one.",
                "energy": [
                    "Bloodline"
                ],
                "target": "single-enemy",
                "damage": 5,
                "cooldown": 0,
                "classes": [
                    "Physical",
                    "Melee",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 10,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageImmunity": true,
                            "ignoreAfflictionDamageImmunity": true,
                            "ignoreDamageReduction": true,
                            "fixedDamage": true
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "negan_you_got_no_guts",
                        "duration": 3,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "uniqueEnemyMarkFromSource": true,
                            "afflictionDamage": true,
                            "fixedTurnEndDamage": true,
                            "ignoreDamageImmunity": true,
                            "ignoreAfflictionDamageImmunity": true,
                            "removeOnHealingEffect": true,
                            "turnEndDamage": 5,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "executeBelowHpThreshold": 15,
                            "tooltipText": "This character takes 5 bleed damage each turn and is executed if their HP falls to 15 or below. Bleed cannot be ignored, increased, or reduced, and is removed by any healing effect."
                        }
                    }
                ]
            },
            {
                "id": "negan-the-iron",
                "name": "The Iron",
                "skillimage": "https://i.imgur.com/vgyp2m8.png",
                "skilldescription": "Deals 25 affliction damage to one enemy and makes them unable to be healed for 4 turns.",
                "energy": [
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 4,
                "classes": [
                    "Physical",
                    "Melee",
                    "Instant",
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
                        "statusId": "negan_the_iron_lock",
                        "duration": 4,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "healReceivedMultiplier": 0,
                            "tooltipText": "This character cannot be healed."
                        }
                    }
                ]
            },
            {
                "id": "negan-bat-smashes-knives",
                "name": "Bat Smashes Knives",
                "skillimage": "https://i.imgur.com/1aqHgid.png",
                "skilldescription": "This skill makes Negan invulnerable for 1 turn.",
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
                        "statusId": "negan_bat_smashes_knives_invulnerable",
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
                "id": "negan-passive-tainted-weapons",
                "name": "Passive: Tainted Weapons",
                "skillimage": "https://i.imgur.com/lIF0QtB.png",
                "skilldescription": "While Negan is alive, all physical-class damage him and his team deal will also apply this skill to their target (stacks). Deals 1 affliction damage permanently.",
                "energy": [],
                "target": "",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Passive",
                    "Instant"
                ]
            }
        ],
        "startStatuses": [
            {
                "statusId": "negan_passive_tainted_weapons",
                "sourceSkillId": "negan-passive-tainted-weapons",
                "duration": 99,
                "metadata": {
                    "infiniteDuration": true,
                    "onTeamMemberSuccessfulDamageSkillClassesAny": [
                        "physical"
                    ],
                    "onTeamMemberSuccessfulDamageApplyStatusToTarget": {
                        "statusId": "negan_tainted_weapons_poison",
                        "duration": 99,
                        "sourceSkillId": "negan-passive-tainted-weapons",
                        "metadata": {
                            "harmful": true,
                            "infiniteDuration": true,
                            "mergeNumericAddKeys": [
                                "turnEndDamage"
                            ],
                            "turnEndDamage": 1,
                            "afflictionDamage": true,
                            "ignoreTargetDamageReduction": true,
                            "ignoreTargetDestructibleDefense": true,
                            "turnEndTrigger": "source_turn",
                            "tooltipTextTemplate": "This character takes {turnEndDamage} permanent affliction damage each turn."
                        }
                    },
                    "tooltipText": "While Negan is alive, all physical-class damage his team deals also applies 1 permanent affliction damage to the target."
                }
            }
        ],
        "role": "Executioner",
        "roleCategory": "assassin",
        "universe": "image"
    },
    {
        "id": "rick-grimes",
        "characterId": "rick-grimes",
        "name": "Rick Grimes",
        "facePicture": "https://i.imgur.com/jJpqV3f.jpeg",
        "characterdeescription": "A hardened survivor from a world overrun by the dead, Rick Grimes leads with grit, instinct, and relentless will. He excels as a precision damage dealer who balances risky shots with calculated setup and late-game sustain. A man forged in chaos, Rick walks the line between control and desperation—each bullet a gamble, each decision a fight to stay alive. When his aim is steady, enemies fall in an instant; when the odds turn against him, he adapts, enduring through sheer brutality and resolve. In the end, whether by skill or sheer luck, Rick is the one still standing.",
        "startStatuses": [
            {
                "statusId": "rick_grimes_revolver_bullets",
                "sourceSkillId": "rick-grimes-357-revolver",
                "duration": 99,
                "metadata": {
                    "bulletsRemaining": 6,
                    "hideTooltipFromEnemy": true,
                    "tooltipTextTemplate": "Rick has {bulletsRemaining} bullets left."
                }
            },
            {
                "statusId": "rick_grimes_revolver_bullet_tracker",
                "sourceSkillId": "rick-grimes-357-revolver",
                "duration": 99,
                "metadata": {
                    "onOwnerUseSkillTrigger": true,
                    "persistOnOwnerUseSkillTrigger": true,
                    "onOwnerUseSkillIdsAny": [
                        "rick-grimes-357-revolver"
                    ],
                    "hideTooltipFromUnitOwner": true,
                    "hideTooltipFromEnemy": true,
                    "onOwnerUseSkillApplyStatusToOwner": {
                        "statusId": "rick_grimes_revolver_bullets",
                        "duration": 99,
                        "sourceSkillId": "rick-grimes-357-revolver",
                        "metadata": {
                            "bulletsRemaining": -1,
                            "mergeNumericAddKeys": [
                                "bulletsRemaining"
                            ],
                            "hideTooltipFromEnemy": true,
                            "tooltipTextTemplate": "Rick has {bulletsRemaining} bullets left."
                        }
                    }
                }
            }
        ],
        "skills": [
            {
                "id": "rick-grimes-357-revolver",
                "name": ".357 Revolver",
                "skillimage": "https://i.imgur.com/J7oYkQt.png",
                "skilldescription": "Rick fires his signature weapon at one enemy, dealing 20 piercing damage. This has an 80% chance to successfully hit and a 20% chance to miss. If successful, this has a 25% chance to be a 'Headshot'. If it misses, it has a 10% chance to hit a random different enemy (and 5% chance for that to then be a 'Headshot'). Rick only carries six bullets with him per game.",
                "energy": [
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "maxUses": 6,
                "classes": [
                    "Physical",
                    "Ranged",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "rick_grimes_revolver_hit_confirmed",
                        "duration": 1,
                        "scope": "self",
                        "chance": 80,
                        "condition": {
                            "missingStatusId": "rick_grimes_throat_slit_bleed",
                            "scope": "target"
                        },
                        "metadata": {
                            "hideTooltipFromUnitOwner": true,
                            "hideTooltipFromEnemy": true
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "rick_grimes_revolver_resolved_hit",
                        "duration": 1,
                        "scope": "self",
                        "condition": {
                            "statusId": "rick_grimes_revolver_hit_confirmed",
                            "scope": "self"
                        },
                        "metadata": {
                            "hideTooltipFromUnitOwner": true,
                            "hideTooltipFromEnemy": true
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "rick_grimes_revolver_bleed_hit_confirmed",
                        "duration": 1,
                        "scope": "self",
                        "chance": 100,
                        "condition": {
                            "statusId": "rick_grimes_throat_slit_bleed",
                            "scope": "target"
                        },
                        "metadata": {
                            "hideTooltipFromUnitOwner": true,
                            "hideTooltipFromEnemy": true
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "rick_grimes_revolver_resolved_hit",
                        "duration": 1,
                        "scope": "self",
                        "condition": {
                            "statusId": "rick_grimes_revolver_bleed_hit_confirmed",
                            "scope": "self"
                        },
                        "metadata": {
                            "hideTooltipFromUnitOwner": true,
                            "hideTooltipFromEnemy": true
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 20,
                        "scope": "target",
                        "condition": {
                            "statusId": "rick_grimes_revolver_hit_confirmed",
                            "scope": "self"
                        },
                        "metadata": {
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 20,
                        "scope": "target",
                        "condition": {
                            "statusId": "rick_grimes_revolver_bleed_hit_confirmed",
                            "scope": "self"
                        },
                        "metadata": {
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 10,
                        "scope": "target",
                        "chance": 25,
                        "condition": {
                            "statusId": "rick_grimes_revolver_hit_confirmed",
                            "scope": "self"
                        },
                        "metadata": {
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 10,
                        "scope": "target",
                        "chance": 40,
                        "condition": {
                            "statusId": "rick_grimes_revolver_bleed_hit_confirmed",
                            "scope": "self"
                        },
                        "metadata": {
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "rick_grimes_revolver_missed",
                        "duration": 1,
                        "scope": "self",
                        "condition": {
                            "missingStatusId": "rick_grimes_revolver_resolved_hit",
                            "scope": "self"
                        },
                        "metadata": {
                            "hideTooltipFromUnitOwner": true,
                            "hideTooltipFromEnemy": true
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "rick_grimes_revolver_redirect_hit",
                        "duration": 1,
                        "scope": "self",
                        "chance": 10,
                        "condition": {
                            "statusId": "rick_grimes_revolver_missed",
                            "scope": "self"
                        },
                        "metadata": {
                            "hideTooltipFromUnitOwner": true,
                            "hideTooltipFromEnemy": true
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 20,
                        "scope": "random-other-enemy",
                        "condition": {
                            "statusId": "rick_grimes_revolver_redirect_hit",
                            "scope": "self"
                        },
                        "metadata": {
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true,
                            "randomScopeGroupKey": "rick_grimes_revolver_redirect_target"
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 10,
                        "scope": "random-other-enemy",
                        "chance": 5,
                        "condition": {
                            "statusId": "rick_grimes_revolver_redirect_hit",
                            "scope": "self"
                        },
                        "metadata": {
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true,
                            "randomScopeGroupKey": "rick_grimes_revolver_redirect_target"
                        }
                    }
                ]
            },
            {
                "id": "rick-grimes-throat-slit",
                "name": "Throat Slit",
                "skillimage": "https://i.imgur.com/xcN920R.png",
                "skilldescription": "Rick slashes an enemy's throat, dealing 10 bleed damage this turn then making them bleed 10 bleed damage next turn. While bleeding, the target's harmful skills are silenced, '.357 Revolver' cannot miss them, and has a 15% bonus chance to 'Headshot'. Bleed cannot be ignored, increased, or reduced, and is removed by any healing effect.",
                "energy": [
                    "Random"
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
                        "amount": 10,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageImmunity": true,
                            "ignoreAfflictionDamageImmunity": true,
                            "ignoreDamageReduction": true,
                            "fixedDamage": true
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "rick_grimes_throat_slit_bleed",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "cannotUseHarmfulSkills": true,
                            "afflictionDamage": true,
                            "fixedTurnEndDamage": true,
                            "ignoreDamageImmunity": true,
                            "ignoreAfflictionDamageImmunity": true,
                            "removeOnHealingEffect": true,
                            "turnEndDamage": 10,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "tooltipText": "This character will take 10 bleed damage next turn, their harmful skills are silenced, Rick's .357 Revolver cannot miss them, and it has a 40% chance to Headshot them. Bleed cannot be ignored, increased, or reduced, and is removed by any healing effect."
                        }
                    }
                ]
            },
            {
                "id": "rick-grimes-desperation",
                "name": "Desperation",
                "skillimage": "https://i.imgur.com/hIVO2kn.png",
                "skilldescription": "Rick steals 20 HP from one enemy. If '.357 Revolver' is out of bullets, this steals 25 bonus health.",
                "energy": [
                    "Random",
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 2,
                "classes": [
                    "Physical",
                    "Melee",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "health_steal_damage",
                        "amount": 20,
                        "scope": "target"
                    },
                    {
                        "type": "health_steal_damage",
                        "amount": 25,
                        "scope": "target",
                        "condition": {
                            "scope": "self",
                            "sourceSkillUsesAtLeast": {
                                "skillId": "rick-grimes-357-revolver",
                                "value": 6
                            }
                        }
                    }
                ]
            },
            {
                "id": "rick-grimes-arm-guard",
                "name": "Arm Guard",
                "skillimage": "https://i.imgur.com/KPOD3Mo.png",
                "skilldescription": "This skill makes Rick Grimes invulnerable for 1 turn.",
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
                        "statusId": "rick_grimes_arm_guard_invulnerable",
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
                "id": "rick-grimes-headshot",
                "name": "Headshot",
                "skillimage": "https://i.imgur.com/1GWRE0R.png",
                "skilldescription": "'.357 Revolver' has a 25% chance to deal 10 bonus piercing damage on a successful hit. If the shot ricochets to a random different enemy after a miss, it has a 5% chance to deal 10 bonus piercing damage instead. Against a target affected by 'Throat Slit', the successful-hit chance becomes 40%.",
                "energy": [],
                "target": "",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Passive",
                    "Instant"
                ]
            }
        ],
        "role": "DPS",
        "roleCategory": "damage",
        "universe": "image"
    },
    {
        "id": "andrea",
        "characterId": "andrea",
        "name": "Andrea",
        "facePicture": "https://i.imgur.com/pO911Ro.jpeg",
        "characterdeescription": "Andrea excels at punishing exposed targets with precise, high-impact shots, capitalizing on moments when enemies leave themselves vulnerable. Rather than applying constant pressure, she waits for the right opportunity—marking targets who act and striking them down with devastating force. Through her ‘Locked On’ passive, Andrea rewards awareness and timing, turning enemy actions into openings for lethal follow-ups. When positioned safely, she can enter a focused state that enhances her accuracy and enables her most powerful attacks, but this advantage is fragile and easily disrupted.",
        "startStatuses": [
            {
                "statusId": "andrea_passive_locked_on",
                "sourceSkillId": "andrea-passive-locked-on",
                "duration": 99,
                "metadata": {
                    "infiniteDuration": true,
                    "onEnemyTeamMemberUseSkillApplyStatusToTarget": {
                        "statusId": "andrea_locked_on_mark",
                        "duration": 1,
                        "metadata": {
                            "harmful": true,
                            "ignoreInvulnerabilityFromSourceSkillIdsAny": [
                                "andrea-quick-shot"
                            ],
                            "turnDurationAnchor": "source_turn",
                            "tooltipText": "This character is Locked On."
                        }
                    },
                    "tooltipText": "Enemies that use a new skill are marked as Locked On."
                }
            }
        ],
        "skills": [
            {
                "id": "andrea-quick-shot",
                "name": "Quick Shot",
                "skillimage": "https://i.imgur.com/6a9Sd7K.png",
                "skilldescription": "Andrea deals 30 piercing damage to one enemy. If the target is Locked On, this ignores their invulnerability.",
                "energy": [
                    "Random",
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Physical",
                    "Ranged",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 30,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageReduction": true
                        }
                    }
                ]
            },
            {
                "id": "andrea-sniper-tower",
                "name": "Sniper Tower",
                "skillimage": "https://i.imgur.com/bp5oUro.png",
                "skilldescription": "For 3 turns, Andrea gains Sniper Tower. While active, she becomes invulnerable for 1 turn each time she uses a skill. If Andrea takes new non-affliction damage, Sniper Tower is ignored for 1 turn.",
                "energy": [
                    "Genjutsu"
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
                        "statusId": "andrea_sniper_tower_active",
                        "duration": 3,
                        "scope": "self",
                        "metadata": {
                            "onOwnerUseSkillTrigger": true,
                            "persistOnOwnerUseSkillTrigger": true,
                            "onOwnerUseSkillApplyStatusToOwnerCondition": {
                                "scope": "self",
                                "missingStatusId": "andrea_sniper_tower_disabled"
                            },
                            "onOwnerUseSkillApplyStatusToOwner": {
                                "statusId": "andrea_sniper_tower_invulnerable",
                                "duration": 1,
                                "metadata": {
                                    "invulnerable": true,
                                    "tooltipText": "This character is invulnerable."
                                }
                            },
                            "onTeamMemberDamageTakenApplyStatusToOwner": {
                                "statusId": "andrea_sniper_tower_disabled",
                                "duration": 1,
                                "nonAfflictionOnly": true,
                                "metadata": {
                                    "harmful": true,
                                    "tooltipText": "Sniper Tower is ignored for 1 turn."
                                }
                            },
                            "tooltipText": "For 3 turns, Andrea becomes invulnerable for 1 turn each time she uses a skill. If she takes new non-affliction damage, Sniper Tower is ignored for 1 turn."
                        }
                    }
                ]
            },
            {
                "id": "andrea-snipe",
                "name": "Snipe",
                "skillimage": "https://i.imgur.com/GA4nBnh.png",
                "skilldescription": "Andrea deals 60 piercing damage to one Locked On enemy, but only while Sniper Tower is active and she is currently invulnerable from it.",
                "energy": [
                    "Genjutsu",
                    "Genjutsu"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Physical",
                    "Ranged",
                    "Instant"
                ],
                "actorCondition": {
                    "statusId": "andrea_sniper_tower_active",
                    "missingStatusId": "andrea_sniper_tower_disabled"
                },
                "targetCondition": {
                    "statusId": "andrea_locked_on_mark"
                },
                "effects": [
                    {
                        "type": "damage",
                        "amount": 60,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageReduction": true
                        }
                    }
                ]
            },
            {
                "id": "andrea-horse-escape",
                "name": "Horse Escape",
                "skillimage": "https://i.imgur.com/MFmkXQ2.png",
                "skilldescription": "Andrea removes all harmful effects from herself and makes one ally invulnerable for 1 turn.",
                "energy": [
                    "Random"
                ],
                "target": "single-ally",
                "damage": 0,
                "cooldown": 4,
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "cleanse_harmful",
                        "count": 99,
                        "scope": "self"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "andrea_horse_escape_invulnerable",
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
                "id": "andrea-passive-locked-on",
                "name": "Passive: Locked On",
                "skillimage": "https://i.imgur.com/p74b06s.png",
                "skilldescription": "Any enemy that uses a new skill is marked as Locked On. Locked On enemies lose invulnerability against Andrea's attacks.",
                "energy": [],
                "target": "",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Passive",
                    "Instant"
                ]
            }
        ],
        "role": "Marksman Assassin",
        "roleCategory": "assassin",
        "universe": "image"
    },
    {
        "id": "walker",
        "characterId": "walker",
        "name": "Walker",
        "facePicture": "https://i.imgur.com/wTmLyGl.jpeg",
        "characterdeescription": "Walker is an undead vanguard spawned from the endless hunger of the infected masses. On a team, Walker functions as a scaling pressure engine and anti-healing disruptor, gradually overwhelming enemies through persistent damage and infection. He excels in longer fights, where his effects stack and compound, forcing opponents into a losing war of attrition.",
        "skills": [
            {
                "id": "walker-infected-horde",
                "name": "Infected Horde",
                "skillimage": "https://i.imgur.com/e4sEkft.png",
                "skilldescription": "For the rest of the game, Walker and his team gain 10 damage reduction and the enemy team takes 10 damage at the end of Walker's turns. Walker's next skill will become AOE. This effect stacks up to 3 times and ends when Walker dies.",
                "energy": [
                    "Random",
                    "Random",
                    "Random"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 3,
                "classes": [
                    "Physical",
                    "Melee",
                    "Action",
                    "Instant*"
                ],
                "maxUses": 3,
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "walker_infected_horde_team_aura",
                        "duration": 99,
                        "scope": "all-allies",
                        "metadata": {
                            "infiniteDuration": true,
                            "ongoingClass": "action",
                            "damageReductionFlat": 10,
                            "stackMetadataKey": "infectedHordeStacks",
                            "stackDelta": 1,
                            "stackMax": 3,
                            "mergeNumericAddKeys": [
                                "damageReductionFlat"
                            ],
                            "tooltipTextTemplate": "This character has {damageReductionFlat} damage reduction from Infected Horde."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "walker_infected_horde_enemy_bleed",
                        "duration": 99,
                        "scope": "all-enemy",
                        "metadata": {
                            "harmful": true,
                            "infiniteDuration": true,
                            "ongoingClass": "action",
                            "turnEndDamage": 10,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "triggerOnApply": true,
                            "mergeNumericAddKeys": [
                                "turnEndDamage"
                            ],
                            "tooltipTextTemplate": "This character takes {turnEndDamage} damage at the end of each of Walker's turns."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "walker_infected_horde_next_attack",
                        "duration": 99,
                        "scope": "self",
                        "metadata": {
                            "infiniteDuration": true,
                            "onOwnerUseSkillTrigger": true,
                            "skillReplacementsRequireSourceSkillId": "walker-infected-horde",
                            "skillReplacements": {
                                "walker-surprise-chomp": "walker-surprise-chomp-all",
                                "walker-overpower": "walker-overpower-all",
                                "walker-group-banquet": "walker-group-banquet-all"
                            },
                            "tooltipText": "Walker's next skill will become AOE."
                        }
                    }
                ]
            },
            {
                "id": "walker-surprise-chomp",
                "name": "Surprise Chomp",
                "skillimage": "https://i.imgur.com/WajPlhY.png",
                "skilldescription": "Walker steals 15 HP from one enemy and grants them Infected Bite.",
                "energy": [
                    "Bloodline"
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
                        "type": "health_steal_damage",
                        "amount": 15,
                        "scope": "target"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "walker_infected_bite",
                        "duration": 99,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "infiniteDuration": true,
                            "ongoingClass": "action",
                            "turnEndDamage": 2,
                            "afflictionDamage": true,
                            "ignoreTargetDamageReduction": true,
                            "ignoreTargetDestructibleDefense": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "triggerOnApply": true,
                            "transformationChance": 0.01,
                            "transformationCharacterId": "walker",
                            "transformationFacePicture": "https://i.imgur.com/wTmLyGl.jpeg",
                            "mergeNumericAddKeys": [
                                "turnEndDamage"
                            ],
                            "healReceivedMultiplier": 0.75,
                            "healReceivedMultiplierWhenOwnerCurrentHpAtMostThreshold": 40,
                            "healReceivedMultiplierWhenOwnerCurrentHpAtMost": 0.5,
                            "bonusDamageFromSourceCharacterId": "walker",
                            "bonusDamageAppliesToSkillIds": [
                                "walker-surprise-chomp",
                                "walker-surprise-chomp-all"
                            ],
                            "bonusDamageFromSourceSkillsFlat": 5,
                            "tooltipTextTemplate": "This character takes {turnEndDamage} affliction damage each turn, receives 25% less healing or 50% less healing at 40 HP or below, and Walker's Surprise Chomp steals 5 additional HP from them. Each turn there is a 1% chance this character turns into a Walker."
                        }
                    }
                ]
            },
            {
                "id": "walker-overpower",
                "name": "Overpower",
                "skillimage": "https://i.imgur.com/g0Tie8I.png",
                "skilldescription": "Walker stuns one enemy's non-mental skills for 1 turn. The following turn, Surprise Chomp deals 10 additional damage to this target.",
                "energy": [
                    "Random",
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 2,
                "classes": [
                    "Physical",
                    "Melee",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "walker_overpower_stun",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "cannotUseNonMentalSkills": true,
                            "tooltipText": "This character non-mental skills are stunned."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "walker_overpower_bonus",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "bonusDamageFromSourceCharacterId": "walker",
                            "bonusDamageAppliesToSkillIds": [
                                "walker-surprise-chomp",
                                "walker-surprise-chomp-all"
                            ],
                            "bonusDamageFromSourceSkillsFlat": 10,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "tooltipText": "Walker's Surprise Chomp deals 10 additional damage to this character."
                        }
                    }
                ]
            },
            {
                "id": "walker-group-banquet",
                "name": "Group Banquet",
                "skillimage": "https://i.imgur.com/J1mBmGk.png",
                "skilldescription": "Walker heals 15 HP at the end of each of his turns for 2 turns.",
                "energy": [
                    "Random",
                    "Random"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 2,
                "classes": [
                    "Physical",
                    "Control"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "walker_group_banquet_regen",
                        "duration": 2,
                        "scope": "self",
                        "metadata": {
                            "turnEndHealFlat": 15,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "triggerOnApply": true,
                            "tooltipText": "Walker heals 15 HP at the end of each of his turns."
                        }
                    }
                ]
            },
            {
                "id": "walker-passive-infected-bite",
                "name": "Passive: Infected Bite",
                "skillimage": "https://i.imgur.com/zeUfS91.png",
                "skilldescription": "This character takes stacking affliction damage every turn, receives 25% less healing or 50% less healing at 40 HP or below, and Walker's Surprise Chomp steals 5 additional HP from them. Each turn, there is a 1% chance they permanently turn into a Walker.",
                "energy": [],
                "target": "",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Passive",
                    "Instant",
                    "Affliction"
                ]
            },
            {
                "id": "walker-overpower-all",
                "name": "Overpower",
                "hiddenFromSelectionViewer": true,
                "useBaseSkillCooldown": true,
                "skillimage": "https://i.imgur.com/g0Tie8I.png",
                "skilldescription": "Walker stuns all enemies' non-mental skills for 1 turn. The following turn, Surprise Chomp deals 10 additional damage to one enemy.",
                "energy": [
                    "Random",
                    "Random"
                ],
                "target": "all-enemy",
                "damage": 0,
                "cooldown": 2,
                "classes": [
                    "Physical",
                    "Melee",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "walker_overpower_stun_all",
                        "duration": 1,
                        "scope": "all-enemy",
                        "metadata": {
                            "harmful": true,
                            "cannotUseNonMentalSkills": true,
                            "tooltipText": "This character non-mental skills are stunned."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "walker_overpower_bonus",
                        "duration": 1,
                        "scope": "random-enemy",
                        "metadata": {
                            "harmful": true,
                            "randomScopeGroupKey": "walker_overpower_bonus_target",
                            "bonusDamageFromSourceCharacterId": "walker",
                            "bonusDamageAppliesToSkillIds": [
                                "walker-surprise-chomp",
                                "walker-surprise-chomp-all"
                            ],
                            "bonusDamageFromSourceSkillsFlat": 10,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "tooltipText": "Walker's Surprise Chomp deals 10 additional damage to this character."
                        }
                    }
                ]
            },
            {
                "id": "walker-surprise-chomp-all",
                "name": "Surprise Chomp",
                "hiddenFromSelectionViewer": true,
                "useBaseSkillCooldown": true,
                "skillimage": "https://i.imgur.com/WajPlhY.png",
                "skilldescription": "Walker steals 15 HP from all enemies and grants Infected Bite to one enemy.",
                "energy": [
                    "Random"
                ],
                "target": "all-enemy",
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Physical",
                    "Melee",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "health_steal_damage",
                        "amount": 15,
                        "scope": "all-enemy",
                        "metadata": {
                            "randomScopeGroupKey": "walker_surprise_chomp_all_target"
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "walker_infected_bite",
                        "duration": 99,
                        "scope": "random-enemy",
                        "metadata": {
                            "harmful": true,
                            "infiniteDuration": true,
                            "ongoingClass": "action",
                            "turnEndDamage": 2,
                            "afflictionDamage": true,
                            "ignoreTargetDamageReduction": true,
                            "ignoreTargetDestructibleDefense": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "triggerOnApply": true,
                            "transformationChance": 0.01,
                            "transformationCharacterId": "walker",
                            "transformationFacePicture": "https://i.imgur.com/wTmLyGl.jpeg",
                            "mergeNumericAddKeys": [
                                "turnEndDamage"
                            ],
                            "healReceivedMultiplier": 0.75,
                            "healReceivedMultiplierWhenOwnerCurrentHpAtMostThreshold": 40,
                            "healReceivedMultiplierWhenOwnerCurrentHpAtMost": 0.5,
                            "bonusDamageFromSourceCharacterId": "walker",
                            "bonusDamageAppliesToSkillIds": [
                                "walker-surprise-chomp",
                                "walker-surprise-chomp-all"
                            ],
                            "bonusDamageFromSourceSkillsFlat": 5,
                            "tooltipTextTemplate": "This character takes {turnEndDamage} affliction damage each turn, receives 25% less healing or 50% less healing at 40 HP or below, and Walker's Surprise Chomp steals 5 additional HP from them. Each turn there is a 1% chance this character turns into a Walker."
                        }
                    }
                ]
            },
            {
                "id": "walker-group-banquet-all",
                "name": "Group Banquet",
                "hiddenFromSelectionViewer": true,
                "useBaseSkillCooldown": true,
                "skillimage": "https://i.imgur.com/J1mBmGk.png",
                "skilldescription": "Walker and his team heals 15 HP for 2 turns.",
                "energy": [
                    "Random",
                    "Random"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 2,
                "classes": [
                    "Physical",
                    "Control"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "walker_group_banquet_regen",
                        "duration": 2,
                        "scope": "all-allies",
                        "metadata": {
                            "turnEndHealFlat": 15,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "triggerOnApply": true,
                            "tooltipText": "This character heals 15 HP at the end of each of Walker's turns."
                        }
                    }
                ]
            }
        ],
        "role": "Attrition DPS",
        "roleCategory": "specialist",
        "universe": "image"
    },
    {
        "id": "hershel-greene",
        "characterId": "hershel-greene",
        "name": "Hershel Greene",
        "facePicture": "https://i.imgur.com/6SJSKyY.jpeg",
        "characterdeescription": "A steady hand in the chaos, Hershel Greene keeps his team alive through sheer experience and resolve. Though not a frontline fighter, his medical expertise allows him to stabilize allies, mitigate incoming damage, and even bring the fallen back into the fight. Hershel excels at sustaining his team over extended battles—delaying damage, cleansing afflictions, and turning lethal situations into survivable ones. However, his reliance on timing and limited supplies means every decision matters. Misuse his tools, and his team will crumble. Use them wisely, and they simply won’t die.",
        "skills": [
            {
                "id": "hershel-greene-reluctant-bullet",
                "name": "Reluctant Bullet",
                "skillimage": "https://i.imgur.com/N57Xbty.png",
                "skilldescription": "Hershel deals 20 piercing damage to one enemy and reduces the healing they recieve by 50% for 1 turn.",
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
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageReduction": true
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "hershel_greene_reluctant_bullet_healing_debuff",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "healReceivedMultiplier": 0.5,
                            "tooltipText": "This character receives 50% less healing."
                        }
                    }
                ]
            },
            {
                "id": "hershel-greene-tending-the-crops",
                "name": "Tending the Crops",
                "skillimage": "https://i.imgur.com/5i9qL6M.png",
                "skilldescription": "Hershel heals his entire team 15 HP and grants them 10 points of destructible defense.",
                "energy": [
                    "Taijutsu"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Physical",
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
                        "statusId": "hershel_greene_tending_the_crops_defense",
                        "duration": 99,
                        "scope": "all-allies",
                        "metadata": {
                            "destructibleDefensePoints": 10,
                            "mergeNumericAddKeys": [
                                "destructibleDefensePoints"
                            ],
                            "tooltipTextTemplate": "This character has {destructibleDefensePoints} destructible defense."
                        }
                    }
                ]
            },
            {
                "id": "hershel-greene-morphine-shot",
                "name": "Morphine Shot",
                "skillimage": "https://i.imgur.com/cT2uA4x.png",
                "skilldescription": "Hershel targets himself or an ally. For 3 turns, they gain 60% unpierceable damage reduction that decays by 20% each turn. Swaps to 'Antibiotics' once used.",
                "energy": [
                    "Genjutsu"
                ],
                "target": "self-or-single-ally",
                "damage": 0,
                "cooldown": 3,
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "hershel_greene_morphine_shot_reduction_60",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "unpierceableDamageReductionPercent": 60,
                            "tooltipTextTemplate": "This character has {unpierceableDamageReductionPercent}% unpierceable damage reduction.",
                            "onExpireApplyStatusToSelf": {
                                "statusId": "hershel_greene_morphine_shot_reduction_40",
                                "duration": 1,
                                "metadata": {
                                    "unpierceableDamageReductionPercent": 40,
                                    "tooltipTextTemplate": "This character has {unpierceableDamageReductionPercent}% unpierceable damage reduction.",
                                    "onExpireApplyStatusToSelf": {
                                        "statusId": "hershel_greene_morphine_shot_reduction_20",
                                        "duration": 1,
                                        "metadata": {
                                            "unpierceableDamageReductionPercent": 20,
                                            "tooltipTextTemplate": "This character has {unpierceableDamageReductionPercent}% unpierceable damage reduction."
                                        }
                                    }
                                }
                            }
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "hershel_greene_medkit_swap_to_antibiotics",
                        "duration": 99,
                        "scope": "self",
                        "metadata": {
                            "skillReplacements": {
                                "hershel-greene-morphine-shot": "hershel-greene-antibiotics"
                            },
                            "removeStatusIdsOnApply": [
                                "hershel_greene_medkit_swap_to_morphine"
                            ],
                            "tooltipText": "Morphine Shot is replaced by Antibiotics."
                        }
                    }
                ]
            },
            {
                "id": "hershel-greene-doctor-s-bag",
                "name": "Doctor's Bag",
                "skillimage": "https://i.imgur.com/neBRimV.png",
                "skilldescription": "Each time an ally dies, at the start of your next turn choose one of the following: Heal Hershel or an ally 35 HP; remove all enemy skills from Hershel or an ally and make them invulnerable for 1 turn; or revive a dead ally to 30 HP. Can only activate twice in a game.",
                "description": "Each time an ally dies, at the start of your next turn choose one of the following: Heal Hershel or an ally 35 HP; remove all enemy skills from Hershel or an ally and make them invulnerable for 1 turn; or revive a dead ally to 30 HP. Can only activate twice in a game.",
                "descriptionHtml": "Each time an ally dies, at the start of your next turn choose one of the following:<br>Heal Hershel or an ally 35 HP.<br>Remove all enemy skills from Hershel or an ally and make them invulnerable for 1 turn.<br>Revive a dead ally to 30 HP.<br>Can only activate twice in a game.",
                "energy": [],
                "target": "all-allies",
                "damage": 0,
                "maxUses": 1,
                "cooldown": 0,
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "hershel_greene_doctor_s_bag_active",
                        "duration": 99,
                        "scope": "self",
                        "metadata": {
                            "turnStartChoicePromptText": "Choose one Doctor's Bag effect.",
                            "turnStartChoiceMaxUses": 2,
                            "turnStartChoiceUsesUsed": 0,
                            "onTeamMemberDeathQueueTurnStartChoice": true,
                            "turnStartChoiceOptions": [
                                {
                                    "key": "heal",
                                    "label": "Heal Hershel or an ally 35 HP",
                                    "targetStrategy": "alive-ally-lowest-hp",
                                    "effect": {
                                        "type": "heal",
                                        "amount": 35
                                    }
                                },
                                {
                                    "key": "cleanse_invuln",
                                    "label": "Remove enemy skills and become invulnerable",
                                    "targetStrategy": "alive-ally-most-harmful",
                                    "effects": [
                                        {
                                            "type": "cleanse_harmful",
                                            "count": 0
                                        },
                                        {
                                            "type": "apply_status",
                                            "statusId": "hershel_greene_doctor_s_bag_invulnerable",
                                            "duration": 1,
                                            "metadata": {
                                                "invulnerable": true,
                                                "tooltipText": "This character is invulnerable."
                                            }
                                        }
                                    ]
                                },
                                {
                                    "key": "revive",
                                    "label": "Revive a dead ally to 30 HP",
                                    "targetStrategy": "dead-ally-first",
                                    "effect": {
                                        "type": "revive",
                                        "amount": 30
                                    }
                                }
                            ],
                            "tooltipText": "When an ally dies, choose a Doctor's Bag effect at the start of your next turn."
                        }
                    }
                ]
            },
            {
                "id": "hershel-greene-antibiotics",
                "name": "Antibiotics",
                "skillimage": "https://i.imgur.com/fzgNljs.png",
                "skilldescription": "Hershel targets himself or an ally. For 3 turns, the target has all enemy affliction skills removed from them and heals 15 HP each turn. Swaps to 'Morphine Shot' once used.",
                "energy": [
                    "Genjutsu"
                ],
                "target": "self-or-single-ally",
                "damage": 0,
                "cooldown": 3,
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "hershel_greene_antibiotics_active",
                        "duration": 3,
                        "scope": "target",
                        "metadata": {
                            "removeEnemyAfflictionStatusesOnApply": true,
                            "removeEnemyAfflictionStatusesOnTurnEnd": true,
                            "turnEndHealFlat": 15,
                            "tooltipText": "Enemy affliction damage effects are removed and this character heals 15 HP each turn."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "hershel_greene_medkit_swap_to_morphine",
                        "duration": 99,
                        "scope": "self",
                        "metadata": {
                            "skillReplacements": {
                                "hershel-greene-antibiotics": "hershel-greene-morphine-shot"
                            },
                            "removeStatusIdsOnApply": [
                                "hershel_greene_medkit_swap_to_antibiotics"
                            ],
                            "tooltipText": "Antibiotics is replaced by Morphine Shot."
                        }
                    }
                ]
            }
        ],
        "role": "Heal Support",
        "roleCategory": "support",
        "universe": "image"
    },
    {
        "id": "invincible",
        "characterId": "invincible",
        "name": "Invincible",
        "facePicture": "https://i.imgur.com/lFKn0A0.png",
        "characterdeescription": "Invincible thrives in the chaos of battle, growing stronger as his team endures enemy pressure. Rather than avoiding damage, he embraces it—using each hit his allies take as fuel to amplify his own power. With the ability to shield teammates at critical moments and retaliate with increasingly devastating force, Invincible rewards calculated risk and precise timing.",
        "startStatuses": [
            {
                "statusId": "invincible_passive_something_to_fight_for",
                "sourceSkillId": "invincible-passive-something-to-fight-for",
                "duration": 99,
                "metadata": {
                    "onTeamMemberDamageTakenApplyStatusToOwner": {
                        "statusId": "invincible_passive_something_to_fight_for_damage_bonus",
                        "duration": 99,
                        "allyOnly": true,
                        "nonAfflictionOnly": true,
                        "sourceSkillId": "invincible-passive-something-to-fight-for",
                        "metadata": {
                            "damageBonusFlat": 5,
                            "mergeNumericAddKeys": [
                                "damageBonusFlat"
                            ],
                            "tooltipTextTemplate": "Invincible deals {damageBonusFlat} additional damage."
                        }
                    },
                    "tooltipText": "Invincible deals 5 bonus damage every time an ally recieves new non-affliction damage."
                }
            }
        ],
        "skills": [
            {
                "id": "invincible-invincible-punch",
                "name": "Invincible Punch",
                "skillimage": "https://i.imgur.com/SPOWsaf.jpeg",
                "skilldescription": "Invincible punches one enemy dealing 5 damage to them.",
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
                        "amount": 5,
                        "scope": "target"
                    }
                ]
            },
            {
                "id": "invincible-to-the-rescue",
                "name": "To the Rescue",
                "skillimage": "https://i.imgur.com/zfwfOzL.jpeg",
                "skilldescription": "Invincible makes an ally invulnerable for 1 turn.",
                "energy": [
                    "Taijutsu"
                ],
                "target": "single-ally",
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "invincible_to_the_rescue_invulnerable",
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
                "id": "invincible-desperate-bite",
                "name": "Desperate Bite",
                "skillimage": "https://i.imgur.com/BURjHNr.jpeg",
                "skilldescription": "Deals 10 affliction damage to one enemy. This swaps to 'Head Smash' for 1 turn.",
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
                        "amount": 10,
                        "scope": "target",
                        "metadata": {
                            "afflictionDamage": true
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "invincible_desperate_bite_to_head_smash",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "skillReplacements": {
                                "invincible-desperate-bite": "invincible-head-smash"
                            },
                            "tooltipText": "Desperate Bite is replaced by Head Smash."
                        }
                    }
                ]
            },
            {
                "id": "invincible-viltrumite-flight",
                "name": "Viltrumite Flight",
                "skillimage": "https://i.imgur.com/cFLjDwX.jpeg",
                "skilldescription": "This skill makes Invincible invulnerable and deal 15 bonus damage for 1 turn.",
                "energy": [
                    "Taijutsu"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "invincible_viltrumite_flight",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "invulnerable": true,
                            "damageBonusFlat": 15,
                            "mergeNumericAddKeys": [
                                "damageBonusFlat"
                            ],
                            "tooltipText": "Invincible is invulnerable and deals 15 additional damage."
                        }
                    }
                ]
            },
            {
                "id": "invincible-head-smash",
                "name": "Head Smash",
                "skillimage": "https://i.imgur.com/CM1PmTW.jpeg",
                "skilldescription": "Deals 15 piercing damage to one enemy and fully stuns them for 1 turn.",
                "energy": [
                    "Random",
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
                        "amount": 20,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageReduction": true
                        }
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
                    }
                ]
            },
            {
                "id": "invincible-passive-something-to-fight-for",
                "name": "Passive: Something to Fight For",
                "skillimage": "https://i.imgur.com/BarSsoW.jpeg",
                "skilldescription": "Invincible deals 5 bonus damage every time an ally recieves new non-affliction damage. This effect is permanent.",
                "energy": [],
                "target": "",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Passive",
                    "Instant"
                ]
            }
        ],
        "role": "Bruiser/Scaling Carry",
        "roleCategory": "bruiser",
        "universe": "image"
    },
    {
        "id": "rex-splode",
        "characterId": "rex-splode",
        "name": "Rex Splode",
        "facePicture": "https://i.imgur.com/ntQvjKH.jpeg",
        "characterdeescription": "On a team, Rex excels as a burst damage and disruption specialist, ideal for breaking through durable targets and creating openings for allies. Played well, he controls the pace of the fight—forcing opponents to react or risk getting blown apart. Rex Splode is a high-pressure ranged damage dealer who thrives on controlled bursts of explosive power. Rather than relying on sustained output, he manages limited resources—charged batons and coins—to deliver precise, piercing attacks that weaken and disrupt enemies",
        "startStatuses": [
            {
                "statusId": "rex_splode_explosive_baton_usage_tracker",
                "sourceSkillId": "rex-splode-explosive-baton",
                "duration": 99,
                "metadata": {
                    "onOwnerUseSkillTrigger": true,
                    "persistOnOwnerUseSkillTrigger": true,
                    "onOwnerUseSkillIdsAny": [
                        "rex-splode-explosive-baton"
                    ],
                    "hideTooltipFromUnitOwner": true,
                    "hideTooltipFromEnemy": true,
                    "onOwnerUseSkillApplyStatusToOwner": {
                        "statusId": "rex_splode_explosive_baton_usage",
                        "duration": 99,
                        "sourceSkillId": "rex-splode-explosive-baton",
                        "metadata": {
                            "usesUsedCount": 1,
                            "mergeNumericAddKeys": [
                                "usesUsedCount"
                            ],
                            "tooltipTextTemplate": "Rex has used this skill {usesUsedCount} times."
                        }
                    }
                }
            },
            {
                "statusId": "rex_splode_explosive_pocket_change_usage_tracker",
                "sourceSkillId": "rex-splode-explosive-pocket-change",
                "duration": 99,
                "metadata": {
                    "onOwnerUseSkillTrigger": true,
                    "persistOnOwnerUseSkillTrigger": true,
                    "onOwnerUseSkillIdsAny": [
                        "rex-splode-explosive-pocket-change"
                    ],
                    "hideTooltipFromUnitOwner": true,
                    "hideTooltipFromEnemy": true,
                    "onOwnerUseSkillApplyStatusToOwner": {
                        "statusId": "rex_splode_explosive_pocket_change_usage",
                        "duration": 99,
                        "sourceSkillId": "rex-splode-explosive-pocket-change",
                        "metadata": {
                            "usesUsedCount": 1,
                            "mergeNumericAddKeys": [
                                "usesUsedCount"
                            ],
                            "tooltipTextTemplate": "Rex has used this skill {usesUsedCount} times."
                        }
                    }
                }
            },
            {
                "statusId": "rex_splode_ammo_swap_tracker",
                "sourceSkillId": "rex-splode-passive-ammo-shift",
                "duration": 99,
                "metadata": {
                    "onOwnerUseSkillTrigger": true,
                    "persistOnOwnerUseSkillTrigger": true,
                    "onOwnerUseSkillApplyStatusToOwnerCondition": {
                        "scope": "self",
                        "sourceSkillUsesAtLeast": {
                            "skillId": "rex-splode-explosive-baton",
                            "value": 2
                        }
                    },
                    "onOwnerUseSkillApplyStatusToOwner": {
                        "statusId": "rex_splode_explosive_baton_spent",
                        "duration": 99,
                        "metadata": {
                            "hideTooltipFromEnemy": true,
                            "skillReplacements": {
                                "rex-splode-explosive-baton": "rex-splode-explosive-debris"
                            },
                            "tooltipText": "Explosive Baton is replaced by Explosive Debris."
                        }
                    },
                    "tooltipText": "When Explosive Baton runs out of ammo, it is replaced by Explosive Debris."
                }
            },
            {
                "statusId": "rex_splode_pocket_change_swap_tracker",
                "sourceSkillId": "rex-splode-passive-ammo-shift",
                "duration": 99,
                "metadata": {
                    "onOwnerUseSkillTrigger": true,
                    "persistOnOwnerUseSkillTrigger": true,
                    "onOwnerUseSkillApplyStatusToOwnerCondition": {
                        "scope": "self",
                        "sourceSkillUsesAtLeast": {
                            "skillId": "rex-splode-explosive-pocket-change",
                            "value": 3
                        }
                    },
                    "onOwnerUseSkillApplyStatusToOwner": {
                        "statusId": "rex_splode_explosive_pocket_change_spent",
                        "duration": 99,
                        "metadata": {
                            "hideTooltipFromEnemy": true,
                            "skillReplacements": {
                                "rex-splode-explosive-pocket-change": "rex-splode-explosive-debris"
                            },
                            "tooltipText": "Explosive Pocket Change is replaced by Explosive Debris."
                        }
                    },
                    "tooltipText": "When Explosive Pocket Change runs out of ammo, it is replaced by Explosive Debris."
                }
            }
        ],
        "skills": [
            {
                "id": "rex-splode-explosive-baton",
                "name": "Explosive Baton",
                "skillimage": "https://i.imgur.com/N0bWSfK.jpeg",
                "skilldescription": "Rex throws a charged baton at one enemy, dealing 30 piercing damage and reducing their non-affliction damage by 15 for 1 turn. Rex can only use this skill twice per game.",
                "energy": [
                    "Bloodline"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "maxUses": 2,
                "classes": [
                    "Energy",
                    "Ranged",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 30,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageReduction": true,
                            "bonusPerStatusMetadata": {
                                "statusId": "rex_splode_floor_detonation_mark",
                                "metadataKey": "floorDetonationBonusDamage",
                                "multiplier": 1,
                                "consumeStatus": true
                            }
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "rex_splode_baton_damage_debuff",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "nonAfflictionDamageDebuffFlat": 15,
                            "tooltipText": "This character deals 15 less non-affliction damage."
                        }
                    }
                ]
            },
            {
                "id": "rex-splode-explosive-pocket-change",
                "name": "Explosive Pocket Change",
                "skillimage": "https://i.imgur.com/7B0U28W.jpeg",
                "skilldescription": "Rex charges a coin in his pocket and throws it a one enemy, dealing 15 piercing damage and removing 1 random energy from them. Rex can only use this skill three times per game.",
                "energy": [
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 1,
                "maxUses": 3,
                "classes": [
                    "Energy",
                    "Ranged",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 15,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageReduction": true,
                            "bonusPerStatusMetadata": {
                                "statusId": "rex_splode_floor_detonation_mark",
                                "metadataKey": "floorDetonationBonusDamage",
                                "multiplier": 1,
                                "consumeStatus": true
                            }
                        }
                    },
                    {
                        "type": "remove_random_chakra",
                        "amount": 1,
                        "scope": "target"
                    }
                ]
            },
            {
                "id": "rex-splode-floor-detonation",
                "name": "Floor Detonation",
                "skillimage": "https://i.imgur.com/46lxBIX.jpeg",
                "skilldescription": "Rex charges the entire floor underneath the enemy team, dealing 20 affliction damage to them and marking them for 2 turns. The next skill Rex uses on them if they are marked deals 10 additional damage.",
                "energy": [
                    "Bloodline",
                    "Random"
                ],
                "target": "all-enemy",
                "damage": 0,
                "cooldown": 2,
                "classes": [
                    "Energy",
                    "Ranged",
                    "Instant",
                    "Affliction"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 20,
                        "scope": "all-enemy",
                        "metadata": {
                            "afflictionDamage": true,
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true,
                            "bonusPerStatusMetadata": {
                                "statusId": "rex_splode_floor_detonation_mark",
                                "metadataKey": "floorDetonationBonusDamage",
                                "multiplier": 1,
                                "consumeStatus": true
                            }
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "rex_splode_floor_detonation_mark",
                        "duration": 2,
                        "scope": "all-enemy",
                        "metadata": {
                            "harmful": true,
                            "floorDetonationBonusDamage": 10,
                            "tooltipText": "This character is marked by Floor Detonation: Rex's next skill on them will deal 10 additional damage."
                        }
                    }
                ]
            },
            {
                "id": "rex-splode-smoke-screen",
                "name": "Smoke Screen",
                "skillimage": "https://i.imgur.com/4YK42j9.jpeg",
                "skilldescription": "This skill makes Rex Splode invulnerable for 1 turn.",
                "energy": [
                    "Random"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 4,
                "classes": [
                    "Energy",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "rex_splode_smoke_screen_invulnerable",
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
                "id": "rex-splode-explosive-debris",
                "name": "Explosive Debris",
                "skillimage": "https://i.imgur.com/sUz3JDv.jpeg",
                "skilldescription": "This skill replaces Explosive Baton or Explosive Pocket Change when they run out of ammo. Deal 20 piercing damage to one enemy. The following turn, if this skill is used on the same target it will deal 35 piercing damage instead.",
                "energy": [
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Energy",
                    "Ranged",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 20,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageReduction": true,
                            "bonusPerStatusMetadata": {
                                "statusId": "rex_splode_floor_detonation_mark",
                                "metadataKey": "floorDetonationBonusDamage",
                                "multiplier": 1,
                                "consumeStatus": true
                            }
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 15,
                        "scope": "target",
                        "condition": {
                            "scope": "target",
                            "statusId": "rex_splode_explosive_debris_followup"
                        },
                        "metadata": {
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "rex_splode_explosive_debris_followup",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "turnDurationAnchor": "source_turn",
                            "tooltipText": "If Rex uses Explosive Debris on this target next turn, it deals 15 additional damage."
                        }
                    }
                ]
            }
        ],
        "role": "DPS",
        "roleCategory": "damage",
        "universe": "image"
    },
    {
        "id": "atom-eve",
        "characterId": "atom-eve",
        "name": "Atom Eve",
        "facePicture": "https://i.imgur.com/O08XwjS.jpeg",
        "characterdeescription": "Atom Eve is a battlefield control support who reshapes fights through precise molecular constructs. Rather than overwhelming enemies with raw damage, she dominates through disruption, protection, and inevitability—shutting down key threats while reinforcing her team with layered defenses. Her constructs allow her to disable high-impact enemies, create protective barriers, and mitigate incoming damage across her team, making her especially valuable in slower, control-oriented compositions. Eve thrives when dictating tempo—forcing opponents into unfavorable positions while her allies capitalize on the openings she creates.",
        "startStatuses": [
            {
                "statusId": "atom_eve_passive_near_death_awakening",
                "sourceSkillId": "atom-eve-passive-near-death-awakening",
                "duration": 99,
                "metadata": {
                    "onOwnerDeathReviveToHp": 50,
                    "onOwnerDeathApplyStatusToSelf": {
                        "statusId": "atom_eve_near_death_awakening_active",
                        "duration": 2,
                        "metadata": {
                            "removeStatusIdsOnApply": [
                                "atom_eve_passive_near_death_awakening"
                            ],
                            "turnEndHealthLoss": 25,
                            "skillReplacements": {
                                "atom-eve-molecule-crush": "atom-eve-molecular-deconstruction-beam",
                                "atom-eve-molecule-helmet": "atom-eve-molecular-deconstruction-beam",
                                "atom-eve-molecule-shield": "atom-eve-molecular-deconstruction-beam",
                                "atom-eve-molecule-battle-armor": "atom-eve-molecular-deconstruction-beam"
                            },
                            "tooltipTextTemplate": "Eve has {turnEndHealthLoss} health loss each turn and all her skills become Molecular Deconstruction Beam."
                        }
                    },
                    "tooltipText": "When Eve is killed, she is revived to 50 HP for 2 turns and all her skills become Molecular Deconstruction Beam."
                }
            }
        ],
        "skills": [
            {
                "id": "atom-eve-molecule-crush",
                "name": "Molecule Crush",
                "skillimage": "https://i.imgur.com/JClGCas.jpeg",
                "skilldescription": "Grants one enemy 15 points of Barrier for 1 turn and deals 20 damage to them.",
                "energy": [
                    "Ninjutsu"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Energy",
                    "Ranged",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "atom_eve_molecule_crush_barrier",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "barrierPoints": 15,
                            "mergeNumericAddKeys": [
                                "barrierPoints"
                            ],
                            "tooltipTextTemplate": "This character has {barrierPoints} barrier."
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 20,
                        "scope": "target"
                    }
                ]
            },
            {
                "id": "atom-eve-molecule-helmet",
                "name": "Molecule Helmet",
                "skillimage": "https://i.imgur.com/JX1tefx.jpeg",
                "skilldescription": "Grants one enemy 35 permanent Barrier. While they have any Barrier from this skill, their harmful skills are Silenced and Blinded. This cannot be used on an already affected enemy.",
                "energy": [
                    "Ninjutsu",
                    "Random"
                ],
                "target": "single-enemy",
                "targetCondition": {
                    "missingStatusId": "atom_eve_molecule_helmet_barrier"
                },
                "damage": 0,
                "cooldown": 3,
                "classes": [
                    "Energy",
                    "Ranged",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "atom_eve_molecule_helmet_barrier",
                        "duration": 99,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "barrierPoints": 35,
                            "mergeNumericAddKeys": [
                                "barrierPoints"
                            ],
                            "silenceNonDamageEffects": true,
                            "harmfulBlind": true,
                            "tooltipTextTemplate": "This character has {barrierPoints} barrier. Their harmful skills are silenced and blinded."
                        }
                    }
                ]
            },
            {
                "id": "atom-eve-molecule-shield",
                "name": "Molecule Shield",
                "skillimage": "https://i.imgur.com/oeKbnxE.jpeg",
                "skilldescription": "Eve grants her entire team 20 points of destructible defense for 1 turn.",
                "energy": [
                    "Random",
                    "Random"
                ],
                "target": "all-allies",
                "damage": 0,
                "cooldown": 2,
                "classes": [
                    "Energy",
                    "Instant",
                    "Invisible"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "atom_eve_molecule_shield_defense",
                        "duration": 1,
                        "scope": "all-allies",
                        "metadata": {
                            "destructibleDefensePoints": 20,
                            "mergeNumericAddKeys": [
                                "destructibleDefensePoints"
                            ],
                            "hideTooltipFromEnemy": true,
                            "tooltipTextTemplate": "This character has {destructibleDefensePoints} destructible defense."
                        }
                    }
                ],
                "classesHtml": "Energy, Instant, Invisible"
            },
            {
                "id": "atom-eve-molecule-battle-armor",
                "name": "Molecule Battle Armor",
                "skillimage": "https://i.imgur.com/yzflAg2.jpeg",
                "skilldescription": "Eve may use this on herself or an ally. Grants the target 20 points of damage reduction for 3 turns.",
                "energy": [
                    "Random"
                ],
                "target": "self-or-single-ally",
                "damage": 0,
                "cooldown": 4,
                "classes": [
                    "Energy",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "atom_eve_molecule_battle_armor",
                        "duration": 3,
                        "scope": "target",
                        "metadata": {
                            "damageReductionFlat": 20,
                            "mergeNumericAddKeys": [
                                "damageReductionFlat"
                            ],
                            "tooltipTextTemplate": "This character has {damageReductionFlat} damage reduction."
                        }
                    }
                ]
            },
            {
                "id": "atom-eve-passive-near-death-awakening",
                "name": "Passive: Near Death Awakening",
                "skillimage": "https://i.imgur.com/o2t3dtM.jpeg",
                "skilldescription": "When Eve is killed, her health is set to 50 HP for 2 turns. Each turn, she loses 25 HP and all her skills become 'Molecular Deconstruction Beam'.",
                "energy": [],
                "target": "self",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Passive",
                    "Instant"
                ]
            },
            {
                "id": "atom-eve-molecular-deconstruction-beam",
                "name": "Molecular Deconstruction Beam",
                "hiddenFromSelectionViewer": true,
                "skillimage": "https://i.imgur.com/1E4AQ15.jpeg",
                "skilldescription": "Deals 35 affliction damage to one enemy. This skill cannot be ignored.",
                "energy": [
                    "Random",
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Energy",
                    "Ranged",
                    "Instant",
                    "Affliction"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 35,
                        "scope": "target",
                        "metadata": {
                            "afflictionDamage": true,
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true
                        }
                    }
                ]
            }
        ],
        "role": "Shield Support",
        "roleCategory": "support",
        "universe": "image"
    },
    {
        "id": "omni-man",
        "characterId": "omni-man",
        "name": "Omni-Man",
        "facePicture": "https://i.imgur.com/n0iErJ8.png",
        "characterdeescription": "Omni-Man dominates the battlefield through overwhelming force and relentless punishment, thriving in direct confrontation where he can dismantle enemies over time. Rather than relying on burst or utility alone, he pressures opponents with sustained damage, disruptive control, and permanent stat reduction that weakens enemies the longer the fight continues. With abilities that force engagement and punish enemy actions, Omni-Man excels at drawing attention and turning it into an advantage. As he takes damage, his power escalates, transforming him into an increasingly dangerous threat that cannot be ignored.",
        "startStatuses": [
            {
                "statusId": "omni_man_passive_omni_rage",
                "sourceSkillId": "omni-man-passive-omni-rage",
                "duration": 99,
                "metadata": {
                    "infiniteDuration": true,
                    "onTeamMemberDamageTakenApplyStatusToOwner": {
                        "statusId": "omni_man_passive_omni_rage_damage_bonus",
                        "duration": 99,
                        "ownerOnly": true,
                        "enemyOnly": true,
                        "nonAfflictionOnly": true,
                        "metadata": {
                            "infiniteDuration": true,
                            "damageBonusFlat": 5,
                            "mergeNumericAddKeys": [
                                "damageBonusFlat"
                            ],
                            "tooltipTextTemplate": "Omni-Man deals {damageBonusFlat} additional damage."
                        }
                    },
                    "tooltipText": "Omni-Man gains 5 additional damage each time he receives new enemy non-affliction damage."
                }
            }
        ],
        "skills": [
            {
                "id": "omni-man-omni-headbutt",
                "name": "Omni-Headbutt",
                "skillimage": "https://i.imgur.com/kLXbd4b_d.webp?maxwidth=760&fidelity=grand",
                "skilldescription": "Omni-Man headbutts one enemy, dealing 15 damage and stunning their harmful skills for 1 turn.",
                "energy": [
                    "Random",
                    "Random"
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
                        "amount": 15,
                        "scope": "target"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "omni_man_omni_headbutt_harmful_stun",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "cannotUseHarmfulSkills": true,
                            "tooltipText": "This character harmful skills are stunned."
                        }
                    }
                ]
            },
            {
                "id": "omni-man-omni-bisect",
                "name": "Omni-Bisect",
                "skillimage": "https://i.imgur.com/hnJmXsL.jpeg",
                "skilldescription": "Omni-Man rips one enemy in half, dealing 30 piercing damage and permanently reducing their non-affliction damage by 5 (stacks).",
                "energy": [
                    "Bloodline",
                    "Genjutsu"
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
                        "amount": 30,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageReduction": true
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "omni_man_omni_bisect_debuff",
                        "duration": 99,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "infiniteDuration": true,
                            "NonAfflictionDamageDebuff": 5,
                            "mergeNumericAddKeys": [
                                "NonAfflictionDamageDebuff"
                            ],
                            "tooltipTextTemplate": "This character deals {NonAfflictionDamageDebuff} less non-affliction damage."
                        }
                    }
                ]
            },
            {
                "id": "omni-man-omni-rush",
                "name": "Omni-Rush",
                "skillimage": "https://i.imgur.com/Z163Kpb.jpeg",
                "skilldescription": "Omni-Man gains 50% unpierceable damage reduction and taunts one enemy for 1 turn. This. This cannot be used on an enemy that had this skill used on them last turn.",
                "energy": [
                    "Bloodline"
                ],
                "ignoreInvulnerability": true,
                "target": "single-enemy",
                "targetCondition": {
                    "missingStatusId": "omni_man_omni_rush_recent_target"
                },
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Physical",
                    "Melee",
                    "Instant",
                    "Bypassing"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "omni_man_omni_rush_defense",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "unpierceableDamageReductionPercent": 50,
                            "tooltipText": "Omni-Man has 50% unpierceable damage reduction."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "omni_man_omni_rush_taunt",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "taunt": true,
                            "turnDurationAnchor": "source_turn",
                            "tooltipText": "This character is taunted and can only target Omni-Man."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "omni_man_omni_rush_recent_target",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "turnDurationAnchor": "source_turn",
                            "tooltipText": "Omni-Rush cannot target this character this turn."
                        }
                    }
                ],
                "classesHtml": "Physical, Melee, Instant, Bypassing"
            },
            {
                "id": "omni-man-omni-guard",
                "name": "Omni-Guard",
                "skillimage": "https://i.imgur.com/sHp09rW.jpeg",
                "skilldescription": "Omni-Man targets one enemy for 1 turn, countering them.",
                "energy": [
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 3,
                "classes": [
                    "Physical",
                    "Melee",
                    "Instant",
                    "Invisible"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "omni_man_omni_guard_trap",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "triggerOnEnemyHarmfulSkill": true,
                            "counterCancelsSkill": true,
                            "counterApplyStatusToSourceOwner": {
                                "statusId": "omni_man_omni_guard_damage_bonus",
                                "duration": 99,
                                "metadata": {
                                    "infiniteDuration": true,
                                    "damageBonusFlat": 10,
                                    "mergeNumericAddKeys": [
                                        "damageBonusFlat"
                                    ],
                                    "tooltipTextTemplate": "Omni-Man deals {damageBonusFlat} additional damage."
                                }
                            },
                            "hideTooltipFromEnemy": true,
                            "tooltipText": "If this character uses a new harmful skill this turn, it is countered and Omni-Man gains 10 additional damage permanently."
                        }
                    }
                ],
                "classesHtml": "Physical, Melee, Instant, Invisible"
            },
            {
                "id": "omni-man-passive-omni-rage",
                "name": "Passive: Omni-Rage",
                "skillimage": "https://i.imgur.com/sgAqXNY.jpeg",
                "skilldescription": "Omni-Man will deal 5 additional damage every time he receives new enemy non-affliction damage (stacks). This skill is permanent.",
                "energy": [],
                "target": "",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Passive",
                    "Instant"
                ]
            }
        ],
        "role": "Juggernaut",
        "roleCategory": "tank",
        "universe": "image"
    },
    {
        "id": "angstrom-levy",
        "characterId": "angstrom-levy",
        "name": "Angstrom Levy",
        "facePicture": "https://i.imgur.com/HZ86RDV.jpeg",
        "characterdeescription": "Levy controls the tempo of combat by manipulating space and timing. His portals counter enemy abilities, banish priority targets, and create openings for his team to strike safely. Enemies who act without caution risk being erased from the battlefield entirely, making Angstrom a constant threat to coordinated teams.",
        "skills": [
            {
                "id": "angstrom-levy-spy-drones",
                "name": "Spy Drones",
                "skillimage": "https://i.imgur.com/UpCFN5q.jpeg",
                "skilldescription": "For 2 turns, deals 10 normal and 10 piercing damage to one enemy each turn. 'Sneaky Portal' will instantly cast 'Dimension Abandon' on an enemy affected by this skill.",
                "energy": [
                    "Bloodline",
                    "Random"
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
                        "statusId": "angstrom_levy_spy_drones_damage",
                        "duration": 2,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "triggerOnApply": true,
                            "turnEndDamage": 10,
                            "tooltipText": "This character takes 10 damage from Spy Drones."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "angstrom_levy_spy_drones_piercing_damage",
                        "duration": 2,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "triggerOnApply": true,
                            "turnEndDamage": 10,
                            "ignoreTargetDamageReduction": true,
                            "ignoreTargetDestructibleDefense": true,
                            "tooltipText": "This character takes 10 piercing damage from Spy Drones."
                        }
                    }
                ]
            },
            {
                "id": "angstrom-levy-sneaky-portal",
                "name": "Sneaky Portal",
                "skillimage": "https://i.imgur.com/oSJHrpN.jpeg",
                "skilldescription": "Targets one enemy for 1 turn, and.",
                "energy": [
                    "Taijutsu"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 2,
                "classes": [
                    "Energy",
                    "Ranged",
                    "Instant",
                    "Invisible"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "angstrom_levy_dimension_abandon_banish",
                        "duration": 1,
                        "scope": "target",
                        "condition": {
                            "statusIdsAny": [
                                "angstrom_levy_spy_drones_damage",
                                "angstrom_levy_spy_drones_piercing_damage"
                            ],
                            "scope": "target"
                        },
                        "metadata": {
                            "harmful": true,
                            "banished": true,
                            "tooltipText": "This character is banished and is treated as if dead until this effect ends."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "angstrom_levy_sneaky_portal_trap",
                        "duration": 1,
                        "scope": "target",
                        "condition": {
                            "missingStatusId": "angstrom_levy_spy_drones_damage",
                            "scope": "target"
                        },
                        "metadata": {
                            "triggerOnEnemyHarmfulSkill": true,
                            "counterCancelsSkill": true,
                            "counterStatusId": "angstrom_levy_dimension_abandon_banish",
                            "counterStatusDuration": 1,
                            "counterStatusMetadata": {
                                "harmful": true,
                                "banished": true,
                                "tooltipText": "This character is banished and is treated as if dead until this effect ends."
                            },
                            "hideTooltipFromUnit": true,
                            "tooltipText": "If this character uses a new harmful skill this turn, it is countered and they are banished for 1 turn."
                        }
                    }
                ],
                "classesHtml": "Energy, Ranged, Instant, Invisible"
            },
            {
                "id": "angstrom-levy-multi-dimensional-rifts",
                "name": "Multi-Dimensional Rifts",
                "skillimage": "https://i.imgur.com/8gbeVqS.jpeg",
                "skilldescription": "For 2 turns, 'Sneaky Portal' is cast on one random enemy each turn and 'Portal Save' has its cooldown reset. While active, 'Spy Drones' will have no cooldown.",
                "energy": [
                    "Taijutsu",
                    "Taijutsu",
                    "Random"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 5,
                "classes": [
                    "Energy",
                    "Ranged",
                    "Instant",
                    "Invisible"
                ],
                "effects": [
                    {
                        "type": "modify_cooldowns",
                        "amount": 0,
                        "operation": "set",
                        "skillIds": [
                            "angstrom-levy-portal-save"
                        ],
                        "scope": "self"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "angstrom_levy_multi_dimensional_rifts_active",
                        "duration": 2,
                        "scope": "self",
                        "metadata": {
                            "turnDurationAnchor": "source_turn",
                            "skillReplacements": {
                                "angstrom-levy-spy-drones": "angstrom-levy-spy-drones-rifts"
                            },
                            "turnEndApplyStatusesToRandomEnemy": [
                                {
                                    "statusId": "angstrom_levy_dimension_abandon_banish",
                                    "duration": 1,
                                    "condition": {
                                        "scope": "target",
                                        "statusIdsAny": [
                                            "angstrom_levy_spy_drones_damage",
                                            "angstrom_levy_spy_drones_piercing_damage"
                                        ]
                                    },
                                    "metadata": {
                                        "harmful": true,
                                        "banished": true,
                                        "tooltipText": "This character is banished and is treated as if dead until this effect ends."
                                    }
                                },
                                {
                                    "statusId": "angstrom_levy_sneaky_portal_trap",
                                    "duration": 1,
                                    "condition": {
                                        "scope": "target",
                                        "missingStatusId": "angstrom_levy_spy_drones_damage"
                                    },
                                    "metadata": {
                                        "triggerOnEnemyHarmfulSkill": true,
                                        "counterCancelsSkill": true,
                                        "counterStatusId": "angstrom_levy_dimension_abandon_banish",
                                        "counterStatusDuration": 1,
                                        "counterStatusMetadata": {
                                            "harmful": true,
                                            "banished": true,
                                            "tooltipText": "This character is banished and is treated as if dead until this effect ends."
                                        },
                                        "hideTooltipFromUnit": true,
                                        "tooltipText": "If this character uses a new harmful skill this turn, it is countered and they are banished for 1 turn."
                                    }
                                }
                            ],
                            "turnEndModifyCooldownsSelf": {
                                "operation": "set",
                                "amount": 0,
                                "skillIds": [
                                    "angstrom-levy-portal-save"
                                ]
                            },
                            "tooltipText": "Each turn, Sneaky Portal is applied to one random enemy, Portal Save has its cooldown reset, and Spy Drones has no cooldown."
                        }
                    }
                ],
                "classesHtml": "Energy, Ranged, Instant, Invisible"
            },
            {
                "id": "angstrom-levy-portal-save",
                "name": "Portal Save",
                "skillimage": "https://i.imgur.com/2CXX1YE.jpeg",
                "skilldescription": "This skill makes Angstrom Levy or an ally invulnerable for 1 turn.",
                "energy": [
                    "Random"
                ],
                "target": "self-or-single-ally",
                "damage": 0,
                "cooldown": 4,
                "classes": [
                    "Energy",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "angstrom_levy_portal_save_invulnerable",
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
                "id": "angstrom-levy-dimension-abandon",
                "name": "Dimension Abandon",
                "skillimage": "https://i.imgur.com/OuFPdYN.jpeg",
                "skilldescription": "This character is Banished for 1 turn. Banished characters are treated as if they are dead.",
                "energy": [],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Energy",
                    "Ranged",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "angstrom_levy_dimension_abandon_banish",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "banished": true,
                            "tooltipText": "This character is banished and is treated as if dead until this effect ends."
                        }
                    }
                ]
            },
            {
                "id": "angstrom-levy-spy-drones-rifts",
                "name": "Spy Drones",
                "hiddenFromSelectionViewer": true,
                "skillimage": "https://i.imgur.com/Wyhuo5P.png",
                "skilldescription": "For 2 turns, deals 10 normal and 10 piercing damage to one enemy each turn. 'Sneaky Portal' will instantly cast 'Dimension Abandon' on an enemy affected by this skill. This skill has no cooldown while Multi-Dimensional Rifts is active.",
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
                    "Action"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "angstrom_levy_spy_drones_damage",
                        "duration": 2,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "triggerOnApply": true,
                            "turnEndDamage": 10,
                            "tooltipText": "This character takes 10 damage and 10 piercing damage from Spy Drones each turn."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "angstrom_levy_spy_drones_piercing_damage",
                        "duration": 2,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "triggerOnApply": true,
                            "turnEndDamage": 10,
                            "ignoreTargetDamageReduction": true,
                            "ignoreTargetDestructibleDefense": true,
                            "tooltipText": "This character takes 10 piercing damage from Spy Drones each turn."
                        }
                    }
                ]
            }
        ],
        "role": "Remover",
        "roleCategory": "strategic",
        "universe": "image"
    },
    {
        "id": "billy-butcher",
        "characterId": "billy-butcher",
        "name": "Billy Butcher",
        "facePicture": "https://i.imgur.com/MblvOMD.png",
        "characterdeescription": "Leader of The Boys and driven by a relentless, bloody vendetta against Supes, Billy Butcher is a fierce melee brawler who uses everything from a crowbar to temporary V24 to get the job done. While V24 gives him access to devastating ranged laser attacks, it ravages his body over time, eventually forcing him to rely on the horrific, parasitic tumorous tentacles growing inside him to crush his enemies.",
        "skills": [
            {
                "id": "billy-butcher-crowbar-maim",
                "name": "Blood and Bone",
                "skillimage": "https://i.imgur.com/ghyZueb.png",
                "skilldescription": "One enemy becomes unable to reduce damage or become invulnerable for 2 turns and takes 20 damage. This deals 10 additional damage during 'V24'.",
                "energy": [
                    "Random"
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
                        "type": "apply_status",
                        "statusId": "billy_butcher_crowbar_maim_vulnerable",
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
                        "type": "damage",
                        "amount": 20,
                        "scope": "target"
                    },
                    {
                        "type": "damage",
                        "amount": 10,
                        "scope": "target",
                        "condition": {
                            "scope": "self",
                            "statusId": "billy_butcher_v24_active"
                        }
                    }
                ]
            },
            {
                "id": "billy-butcher-v24",
                "name": "V24",
                "skillimage": "https://i.imgur.com/hFsL74M.png",
                "skilldescription": "For 2 turns, Butcher gains 50% unpierceable damage reduction and swaps this to 'Yellow Death Lasers'. Afterwards, Butcher loses 25HP, has his health capped, then 'Cancerous Tentacles' deals 10 additional damage (Stacks).",
                "energy": [
                    "Taijutsu"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 3,
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "billy_butcher_v24_active",
                        "duration": 2,
                        "scope": "self",
                        "metadata": {
                            "unpierceableDamageReductionPercent": 50,
                            "skillReplacements": {
                                "billy-butcher-v24": "billy-butcher-yellow-death-lasers"
                            },
                            "onExpireEffects": [
                                {
                                    "type": "HealthLoss",
                                    "amount": 25
                                },
                                {
                                    "type": "HealthCapLoss",
                                    "amount": 25
                                },
                                {
                                    "type": "apply_status",
                                    "statusId": "billy_butcher_tentacles_damage_bonus",
                                    "duration": 99,
                                    "metadata": {
                                        "infiniteDuration": true,
                                        "skillDamageBonuses": {
                                            "billy-butcher-cancerous-tentacles": 10
                                        },
                                        "tooltipText": "Cancerous Tentacles deals 10 additional damage. This effect stacks."
                                    }
                                }
                            ],
                            "tooltipText": "Butcher has 50% unpierceable damage reduction and V24 is replaced by Yellow Death Lasers."
                        }
                    }
                ]
            },
            {
                "id": "billy-butcher-cancerous-tentacles",
                "name": "Cancerous Tentacles",
                "skillimage": "https://i.imgur.com/MUVL2C6.png",
                "skilldescription": "Deals 25 piercing damage to one enemy and stuns their harmful skills for 1 turn. Butcher loses 10HP.",
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
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 25,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "billy_butcher_cancerous_tentacles_harmful_stun",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "cannotUseHarmfulSkills": true,
                            "tooltipText": "This character's harmful skills are stunned."
                        }
                    },
                    {
                        "type": "HealthLoss",
                        "amount": 10,
                        "scope": "self"
                    }
                ]
            },
            {
                "id": "billy-butcher-escape",
                "name": "Butcher Escape",
                "skillimage": "https://i.imgur.com/heQWQJH.png",
                "skilldescription": "This skill makes Butcher invulnerable for 1 turn.",
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
                        "statusId": "billy_butcher_escape_invulnerable",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "invulnerable": true,
                            "tooltipText": "Butcher is invulnerable."
                        }
                    }
                ]
            },
            {
                "id": "billy-butcher-yellow-death-lasers",
                "name": "Yellow Death Lasers",
                "skillimage": "https://i.imgur.com/1MFzKut.jpeg",
                "skilldescription": "Butcher deals 35 affliction damage to one enemy that.",
                "energy": [
                    "Random",
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 1,
                "ignoreInvulnerability": true,
                "classes": [
                    "Energy",
                    "Ranged",
                    "Instant",
                    "Affliction",
                    "Bypassing"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 35,
                        "scope": "target",
                        "metadata": {
                            "afflictionDamage": true,
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true
                        }
                    }
                ],
                "classesHtml": "Energy, Ranged, Instant, Affliction, Bypassing"
            }
        ],
        "role": "Brawler",
        "roleCategory": "bruiser",
        "universe": "other"
    },
    {
        "id": "doctor-octopus",
        "characterId": "doctor-octopus",
        "name": "Doctor Octopus",
        "facePicture": "https://i.imgur.com/HdMCEue.jpeg",
        "startStatuses": [
            {
                "statusId": "doctor_octopus_mechanical_tentacles",
                "sourceSkillId": "doctor-octopus-passive-mechanical-tentacles",
                "duration": 99,
                "metadata": {
                    "infiniteDuration": true,
                    "stackMetadataKey": "mechanicalTentacles",
                    "mechanicalTentacles": 4,
                    "stackDerivedNumericKeys": {
                        "damageReductionFlat": 4
                    },
                    "onOwnerDamagedByBaseDamageAtLeastApplyStatusToOwner": {
                        "statusId": "doctor_octopus_mechanical_tentacles",
                        "duration": 99,
                        "threshold": 30,
                        "enemyOnly": true,
                        "oncePerSourceSkillPerTurn": true,
                        "metadata": {
                            "stackMetadataKey": "mechanicalTentacles",
                            "stackDelta": -1,
                            "stackDerivedNumericKeys": {
                                "damageReductionFlat": 4
                            },
                            "tooltipTextTemplate": "Doctor Octopus has {mechanicalTentacles} Mechanical Tentacles and {damageReductionFlat} damage reduction."
                        }
                    },
                    "tooltipTextTemplate": "Doctor Octopus has {mechanicalTentacles} Mechanical Tentacles and {damageReductionFlat} damage reduction."
                }
            }
        ],
        "characterdeescription": "Play Doctor Octopus as a strategic controller—manage your tentacles wisely, disrupt at the right moments, and outmaneuver your opponents through superior planning. Doctor Octopus dominates the battlefield through calculated control and mechanical superiority. His ever-present tentacles enhance his resilience and empower his abilities, allowing him to pressure enemies while protecting himself and his team.",
        "skills": [
            {
                "id": "doctor-octopus-tentacle-assault",
                "name": "Tentacle Assault",
                "skillimage": "https://i.imgur.com/ooC0I7y.png",
                "skilldescription": "Deals 14 piercing damage plus 4 damage per Mechanical Tentacle to one enemy and taunts them for 1 turn.",
                "energy": [
                    "Ninjutsu"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Physical",
                    "Ranged",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 14,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageReduction": true,
                            "bonusPerStatusMetadata": {
                                "statusId": "doctor_octopus_mechanical_tentacles",
                                "metadataKey": "mechanicalTentacles",
                                "multiplier": 4,
                                "scope": "self"
                            }
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "doctor_octopus_tentacle_assault_taunt",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "taunt": true,
                            "tooltipText": "This character is taunted and can only target Doctor Octopus."
                        }
                    }
                ]
            },
            {
                "id": "doctor-octopus-tentacle-manipulation",
                "name": "Tentacle Manipulation",
                "skillimage": "https://i.imgur.com/h0WxoR6.png",
                "skilldescription": "Deals 20 damage to all enemies and stuns their non-mental skills for 1 turn. If Doctor Octopus has 4 Mechanical Tentacles, the target's harmful skills are silenced for 1 turn.",
                "energy": [
                    "Ninjutsu",
                    "Random"
                ],
                "target": "all-enemy",
                "damage": 0,
                "cooldown": 2,
                "classes": [
                    "Physical",
                    "Ranged",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 24,
                        "scope": "all-enemy"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "doctor_octopus_tentacle_manipulation_stun",
                        "duration": 1,
                        "scope": "all-enemy",
                        "metadata": {
                            "harmful": true,
                            "cannotUseNonMentalSkills": true,
                            "tooltipText": "This character non-mental skills are stunned."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "doctor_octopus_tentacle_manipulation_silence",
                        "duration": 1,
                        "scope": "all-enemy",
                        "condition": {
                            "scope": "self",
                            "statusMetadataAtLeast": {
                                "statusId": "doctor_octopus_mechanical_tentacles",
                                "metadataKey": "mechanicalTentacles",
                                "value": 4
                            }
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
                "id": "doctor-octopus-tentacle-strangulation",
                "name": "Tentacle Strangulation",
                "skillimage": "https://i.imgur.com/DvOD11W.png",
                "skilldescription": "Silences all enemies harmful skills for 2 turns and deals 22 damage plus 2 damage per Mechanical Tentacle.",
                "energy": [
                    "Ninjutsu",
                    "Random",
                    "Random"
                ],
                "target": "all-enemy",
                "damage": 0,
                "cooldown": 3,
                "classes": [
                    "Physical",
                    "Ranged",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "doctor_octopus_tentacle_strangulation_silence",
                        "duration": 2,
                        "scope": "all-enemy",
                        "metadata": {
                            "harmful": true,
                            "silenceNonDamageEffects": true,
                            "tooltipText": "Silenced: only damage from this character's skills will work."
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 22,
                        "scope": "all-enemy",
                        "metadata": {
                            "bonusPerStatusMetadata": {
                                "statusId": "doctor_octopus_mechanical_tentacles",
                                "metadataKey": "mechanicalTentacles",
                                "multiplier": 2,
                                "scope": "self"
                            }
                        }
                    }
                ]
            },
            {
                "id": "doctor-octopus-tentacle-parry",
                "name": "Tentacle Parry",
                "skillimage": "https://i.imgur.com/PnLSTOC.png",
                "skilldescription": "Doctor Octopus grants his team 4 points of destructible defense per Mechanical Tentacle for 1 turn. If an enemy uses a new harmful skill on his team next turn, they are taunted for 1 turn.",
                "energy": [
                    "Random"
                ],
                "target": "all-allies",
                "damage": 0,
                "cooldown": 3,
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "doctor_octopus_tentacle_parry_defense",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "scaleFromSourceStatusMetadata": {
                                "statusId": "doctor_octopus_mechanical_tentacles",
                                "metadataKey": "mechanicalTentacles",
                                "multiplier": 4,
                                "targetKeys": [
                                    "destructibleDefensePoints"
                                ]
                            },
                            "destructibleDefensePoints": 0,
                            "tooltipTextTemplate": "This character has {destructibleDefensePoints} destructible defense."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "doctor_octopus_tentacle_parry_trap",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "triggerOnEnemyHarmfulSkill": true,
                            "counterStatusId": "doctor_octopus_tentacle_parry_taunt",
                            "counterStatusDuration": 1,
                            "counterStatusMetadata": {
                                "harmful": true,
                                "taunt": true,
                                "tooltipText": "This character is taunted and can only target Doctor Octopus."
                            },
                            "hideTooltipFromEnemy": true,
                            "tooltipText": "If an enemy uses a new harmful skill on this character next turn, they are taunted for 1 turn."
                        }
                    }
                ]
            },
            {
                "id": "doctor-octopus-passive-mechanical-tentacles",
                "name": "Passive: Mechanical Tentacles",
                "skillimage": "https://i.imgur.com/wYhb8lf.png",
                "skilldescription": "Doctor Octopus starts the game with 4 Mechanical Tentacles. Each one grants him 4 points of damage reduction. Every time a skill with base damage of 30 or more is used on him, he loses 1 Mechanical Tentacle.",
                "energy": [],
                "target": "",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Passive",
                    "Instant"
                ]
            }
        ],
        "role": "Defensive Controller",
        "roleCategory": "strategic",
        "universe": "marvel"
    },
    {
        "id": "carnage",
        "characterId": "carnage",
        "name": "Carnage",
        "facePicture": "https://i.imgur.com/053csjw.png",
        "startStatuses": [
            {
                "statusId": "carnage_passive_blood_bonded",
                "sourceSkillId": "carnage-passive-blood-bonded",
                "duration": 99,
                "metadata": {
                    "infiniteDuration": true,
                    "minimumHpFromSelfSkillDamage": 1,
                    "tooltipText": "All health lost from Carnage's skills is given to him in the same amount as destructible defense for 1 turn. Carnage's skills cannot kill him."
                }
            }
        ],
        "characterdeescription": "Play Carnage as a high-risk finisher—wait for the right moment, then unleash unstoppable carnage. Carnage thrives in chaos, trading his own life force for overwhelming offense. His attacks are relentless and impossible to stop, carving through enemies while setting up lethal execution windows. Through Blood Slinging, he becomes evasive and unpredictable, striking at the perfect moment to finish off weakened foes.",
        "skills": [
            {
                "id": "carnage-blood-slash",
                "name": "Blood Slash",
                "skillimage": "https://i.imgur.com/f69xBeL.png",
                "skilldescription": "Deals 35 bleed damage to one enemy. Carnage loses 15 HP. This executes enemies that fall to 15 HP or less during 'Blood Slinging'. Bleed cannot be ignored, increased, or reduced, and is removed by any healing effect.",
                "energy": [
                    "Bloodline",
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Physical",
                    "Melee",
                    "Instant",
                    "Uncounterable"
                ],
                "cannotBeCountered": true,
                "effects": [
                    {
                        "type": "damage",
                        "amount": 35,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageImmunity": true,
                            "ignoreAfflictionDamageImmunity": true,
                            "ignoreDamageReduction": true,
                            "fixedDamage": true,
                            "removeOnHealingEffect": true
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 15,
                        "scope": "self",
                        "metadata": {
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "carnage_blood_bonded_defense",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "destructibleDefensePoints": 15,
                            "tooltipTextTemplate": "Carnage has {destructibleDefensePoints} destructible defense from Blood-Bonded."
                        }
                    },
                    {
                        "type": "execute_below_hp",
                        "threshold": 15,
                        "scope": "target",
                        "condition": {
                            "statusId": "carnage_blood_slinging_active",
                            "scope": "self"
                        },
                        "metadata": {
                            "cannotBeEvaded": true
                        }
                    }
                ],
                "classesHtml": "Physical, Melee, Instant, Uncounterable"
            },
            {
                "id": "carnage-wide-area-cutting",
                "name": "Wide-Area Cutting",
                "skillimage": "https://i.imgur.com/9H59XyW.png",
                "skilldescription": "Deals 20 bleed damage to the enemy team. Carnage loses 15 HP. This executes enemies that fall to 5 HP or less during 'Blood Slinging'. Bleed cannot be ignored, increased, or reduced, and is removed by any healing effect.",
                "energy": [
                    "Bloodline",
                    "Random"
                ],
                "target": "all-enemy",
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Physical",
                    "Ranged",
                    "Instant",
                    "Uncounterable"
                ],
                "cannotBeCountered": true,
                "effects": [
                    {
                        "type": "damage",
                        "amount": 20,
                        "scope": "all-enemy",
                        "metadata": {
                            "ignoreDamageImmunity": true,
                            "ignoreAfflictionDamageImmunity": true,
                            "ignoreDamageReduction": true,
                            "fixedDamage": true,
                            "removeOnHealingEffect": true
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 15,
                        "scope": "self",
                        "metadata": {
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "carnage_blood_bonded_defense",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "destructibleDefensePoints": 15,
                            "tooltipTextTemplate": "Carnage has {destructibleDefensePoints} destructible defense from Blood-Bonded."
                        }
                    },
                    {
                        "type": "execute_below_hp",
                        "threshold": 5,
                        "scope": "all-enemy",
                        "condition": {
                            "statusId": "carnage_blood_slinging_active",
                            "scope": "self"
                        },
                        "metadata": {
                            "cannotBeEvaded": true
                        }
                    }
                ],
                "classesHtml": "Physical, Ranged, Instant, Uncounterable"
            },
            {
                "id": "carnage-brain-devour",
                "name": "Brain Devour",
                "skillimage": "https://i.imgur.com/HDzBQV8.png",
                "skilldescription": "Carnage steals 1 random energy and 15HP from one enemy. This costs 1 random energy during 'Blood Slinging'.",
                "energy": [
                    "Bloodline"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 2,
                "classes": [
                    "Physical",
                    "Melee",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "drain_chakra",
                        "amount": 1,
                        "chakraType": "random",
                        "scope": "target"
                    },
                    {
                        "type": "health_steal_damage",
                        "amount": 15,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageReduction": true
                        }
                    }
                ]
            },
            {
                "id": "carnage-blood-slinging",
                "name": "Blood Slinging",
                "skillimage": "https://i.imgur.com/VANex95.png",
                "skilldescription": "This skill makes Carnage gain 40% Evasion for 2 turns. Carnage loses 15 HP.",
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
                        "statusId": "carnage_blood_slinging_active",
                        "duration": 2,
                        "scope": "self",
                        "metadata": {
                            "evadeChancePercent": 40,
                            "evadeAgainstNonMental": true,
                            "skillCostOverridesBySkillId": {
                                "carnage-brain-devour": {
                                    "energy": [
                                        "Random"
                                    ]
                                }
                            },
                            "tooltipText": "Carnage has 40% evade chance against enemy non-mental skills and Brain Devour costs 1 random energy."
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 15,
                        "scope": "self",
                        "metadata": {
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "carnage_blood_bonded_defense",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "destructibleDefensePoints": 15,
                            "tooltipTextTemplate": "Carnage has {destructibleDefensePoints} destructible defense from Blood-Bonded."
                        }
                    }
                ]
            },
            {
                "id": "carnage-passive-blood-bonded",
                "name": "Passive: Blood-Bonded",
                "skillimage": "https://i.imgur.com/VjHW4nb.png",
                "skilldescription": "All health lost from Carnage's skills is given to him in the same amount as destructible defense for 1 turn. Carnage's skills cannot kill him.",
                "energy": [],
                "target": "",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Passive",
                    "Instant"
                ]
            }
        ],
        "role": "Execution Beserker",
        "roleCategory": "assassin",
        "universe": "marvel"
    },
    {
        "id": "the-green-goblin",
        "characterId": "the-green-goblin",
        "name": "The Green Goblin",
        "facePicture": "https://i.imgur.com/DvnhkRP.png",
        "startStatuses": [
            {
                "statusId": "the_green_goblin_mad_bomber_passive",
                "duration": 99,
                "sourceSkillId": "the-green-goblin-passive-mad-bomber",
                "metadata": {
                    "infiniteDuration": true,
                    "tooltipText": "Whenever Green Goblin uses a skill, he has a 15% chance to plant a Bomb on a random enemy for 2 turns. If that enemy uses a harmful skill, or when the Bomb ends, Green Goblin deals 15 affliction damage to the enemy team.",
                    "onOwnerUseSkillTrigger": true,
                    "persistOnOwnerUseSkillTrigger": true,
                    "onOwnerUseSkillApplyStatusToRandomEnemy": {
                        "statusId": "the_green_goblin_mad_bomber_bomb",
                        "duration": 2,
                        "chancePercent": 15,
                        "sourceSkillId": "the-green-goblin-passive-mad-bomber",
                        "metadata": {
                            "harmful": true,
                            "specialStatusVisual": "green-goblin-bomb",
                            "allowDuplicateStatusInstances": true,
                            "triggerOnOwnerHarmfulSkillOnly": true,
                            "triggerOnEnemyHarmfulSkill": true,
                            "onExpireEffectsToEnemiesOfSource": [
                                {
                                    "type": "damage",
                                    "amount": 15,
                                    "metadata": {
                                        "afflictionDamage": true,
                                        "ignoreDamageReduction": true,
                                        "ignoreDestructibleDefense": true
                                    }
                                }
                            ],
                            "counterEffectsToEnemiesOfSource": [
                                {
                                    "type": "damage",
                                    "amount": 15,
                                    "metadata": {
                                        "afflictionDamage": true,
                                        "ignoreDamageReduction": true,
                                        "ignoreDestructibleDefense": true
                                    }
                                }
                            ],
                            "tooltipText": "If this character uses a harmful skill, or when this effect ends, Green Goblin deals 15 affliction damage to the enemy team."
                        }
                    },
                    "onSuccessApplyStatusToOwner": {
                        "statusId": "the_green_goblin_mad_bomber_triggered",
                        "duration": 1,
                        "metadata": {
                            "sourceSkillName": "Passive: Mad Bomber",
                            "statusIconUrl": "https://i.imgur.com/oAcpnSv.png",
                            "tooltipText": "The Green Goblin threw an extra bomb onto a random enemy!"
                        }
                    }
                }
            }
        ],
        "characterdeescription": "Green Goblin dominates the battlefield by turning every action into a risk, layering delayed threats that punish enemies for acting without caution. Rather than relying on direct control or overwhelming burst, he creates zones of danger through his bombs—forcing opponents to constantly weigh the consequences of every move.",
        "skills": [
            {
                "id": "the-green-goblin-pumpkin-bomb",
                "name": "Pumpkin Bomb",
                "skillimage": "https://i.imgur.com/j7P6oI0.png",
                "skilldescription": "Deals 20 damage to one enemy and plants a Bomb on them for 2 turns. If the target uses a harmful skill → Bomb explodes (15 affliction damage to all enemies). If it expires → explodes anyway.",
                "energy": [
                    "Bloodline"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Energy",
                    "Ranged",
                    "Instant",
                    "Affliction"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 20,
                        "scope": "target"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "the_green_goblin_pumpkin_bomb",
                        "duration": 2,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "specialStatusVisual": "green-goblin-bomb",
                            "allowDuplicateStatusInstances": true,
                            "triggerOnOwnerHarmfulSkillOnly": true,
                            "triggerOnEnemyHarmfulSkill": true,
                            "onExpireEffectsToEnemiesOfSource": [
                                {
                                    "type": "damage",
                                    "amount": 15,
                                    "metadata": {
                                        "afflictionDamage": true,
                                        "ignoreDamageReduction": true,
                                        "ignoreDestructibleDefense": true
                                    }
                                }
                            ],
                            "counterEffectsToEnemiesOfSource": [
                                {
                                    "type": "damage",
                                    "amount": 15,
                                    "metadata": {
                                        "afflictionDamage": true,
                                        "ignoreDamageReduction": true,
                                        "ignoreDestructibleDefense": true
                                    }
                                }
                            ],
                            "tooltipText": "If this character uses a harmful skill, or when this effect ends, Green Goblin deals 15 affliction damage to the enemy team."
                        }
                    }
                ]
            },
            {
                "id": "the-green-goblin-carpet-bombing",
                "name": "Carpet Bombing",
                "skillimage": "https://i.imgur.com/eDPHpc8.png",
                "skilldescription": "Deals 10 damage to the enemy team and plants a Bomb on each of them for 2 turns. If the target uses a harmful skill → Bomb explodes (10 affliction damage to all enemies). If it expires → explodes anyway.",
                "energy": [
                    "Bloodline",
                    "Random",
                    "Random"
                ],
                "target": "all-enemy",
                "damage": 0,
                "cooldown": 3,
                "classes": [
                    "Energy",
                    "Ranged",
                    "Instant",
                    "Affliction"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 10,
                        "scope": "all-enemy"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "the_green_goblin_carpet_bomb",
                        "duration": 2,
                        "scope": "all-enemy",
                        "metadata": {
                            "harmful": true,
                            "specialStatusVisual": "green-goblin-bomb",
                            "allowDuplicateStatusInstances": true,
                            "triggerOnOwnerHarmfulSkillOnly": true,
                            "triggerOnEnemyHarmfulSkill": true,
                            "onExpireEffectsToEnemiesOfSource": [
                                {
                                    "type": "damage",
                                    "amount": 10,
                                    "metadata": {
                                        "afflictionDamage": true,
                                        "ignoreDamageReduction": true,
                                        "ignoreDestructibleDefense": true
                                    }
                                }
                            ],
                            "counterEffectsToEnemiesOfSource": [
                                {
                                    "type": "damage",
                                    "amount": 10,
                                    "metadata": {
                                        "afflictionDamage": true,
                                        "ignoreDamageReduction": true,
                                        "ignoreDestructibleDefense": true
                                    }
                                }
                            ],
                            "tooltipText": "If this character uses a harmful skill, or when this effect ends, Green Goblin deals 10 affliction damage to the enemy team."
                        }
                    }
                ]
            },
            {
                "id": "the-green-goblin-glider-impale",
                "name": "Glider Impale",
                "skillimage": "https://i.imgur.com/Wg00OkV.png",
                "skilldescription": "Deals 25 damage to one enemy and makes them take 10 additional damage from all sources for 1 turn. If they are affected by a Bomb immediately detonate it.",
                "energy": [
                    "Random",
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
                        "type": "damage",
                        "amount": 25,
                        "scope": "target"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "the_green_goblin_glider_impale_vulnerability",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "damageTakenBonusFlat": 10,
                            "tooltipText": "This character takes 10 additional damage from all sources."
                        }
                    },
                    {
                        "type": "trigger_status_effects",
                        "scope": "target",
                        "statusIdsAny": [
                            "the_green_goblin_pumpkin_bomb",
                            "the_green_goblin_carpet_bomb",
                            "the_green_goblin_mad_bomber_bomb"
                        ],
                        "consumeMatchedStatus": true
                    }
                ]
            },
            {
                "id": "the-green-goblin-glider-flight",
                "name": "Glider Flight",
                "skillimage": "https://i.imgur.com/vcMHrD9.png",
                "skilldescription": "This skill makes The Green Goblin invulnerable for 1 turn and reduces his active cooldowns by 1.",
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
                        "statusId": "the_green_goblin_glider_flight",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "invulnerable": true,
                            "tooltipText": "Green Goblin is invulnerable."
                        }
                    },
                    {
                        "type": "modify_cooldowns",
                        "amount": -1,
                        "includeAllCharacterSkills": true,
                        "scope": "self"
                    }
                ]
            },
            {
                "id": "the-green-goblin-passive-mad-bomber",
                "name": "Passive: Mad Bomber",
                "skillimage": "https://i.imgur.com/oAcpnSv.png",
                "skilldescription": "The Green Goblin has a 15% chance to toss a Bomb onto a random enemy for 2 turns whenever he uses a skill. If the target uses a harmful skill → Bomb explodes (15 affliction damage AoE). If it expires → explodes anyway.",
                "energy": [],
                "target": "",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Passive",
                    "Instant"
                ]
            }
        ],
        "role": "Punisher",
        "roleCategory": "specialist",
        "universe": "marvel"
    },
    {
        "id": "sandman",
        "characterId": "sandman",
        "name": "Sandman",
        "facePicture": "https://i.imgur.com/achNzMq.png",
        "characterdeescription": "Sandman excels at isolating key enemies and forcing them into unfavorable situations, using his shifting form to control engagements and dictate the flow of combat. Rather than overwhelming entire teams, he focuses on a single target—marking them, limiting their effectiveness, and isetting up unavoidable punishment through well-timed ability sequences.",
        "skills": [
            {
                "id": "sandman-sand-body-enter",
                "name": "Sand Body Enter",
                "skillimage": "https://i.imgur.com/jyd0lvn.png",
                "skilldescription": "Sandman marks an enemy for 1 turn. During this time, Sandman is invulnerable and this swaps to 'Sand Body Exit'.",
                "energy": [
                    "Genjutsu"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 2,
                "classes": [
                    "Physical",
                    "Melee",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "sandman_sand_body_mark",
                        "duration": 2,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "turnDurationAnchor": "source_turn",
                            "tooltipText": "This character is marked by Sand Body Enter."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "sandman_sand_body_enter_active",
                        "duration": 2,
                        "scope": "self",
                        "metadata": {
                            "invulnerable": true,
                            "skillReplacementsByRemainingTurns": {
                                "1": {
                                    "sandman-sand-body-exit": "sandman-sand-body-enter"
                                },
                                "2": {
                                    "sandman-sand-body-enter": "sandman-sand-body-exit"
                                }
                            },
                            "tooltipText": "Sandman is invulnerable and Sand Body Enter is replaced by Sand Body Exit."
                        }
                    }
                ]
            },
            {
                "id": "sandman-sand-clone-counter",
                "name": "Sand Clone Counter",
                "skillimage": "https://i.imgur.com/8g6oZlb.png",
                "skilldescription": "Target an ally, granting them 20 destructible defense and himself 10 destructible defense for 1 turn. Sandman and the Ally will swap places. to the enemy for 1 turn.",
                "energy": [
                    "Genjutsu"
                ],
                "target": "single-ally",
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
                        "statusId": "sandman_sand_clone_counter_ally_defense",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "destructibleDefensePoints": 20,
                            "tooltipText": "This character has 20 destructible defense."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "sandman_sand_clone_counter_self_defense",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "destructibleDefensePoints": 10,
                            "hideTooltipFromEnemy": true,
                            "tooltipText": "Sandman has 10 destructible defense."
                        }
                    },
                    {
                        "type": "swap_positions",
                        "scope": "target"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "sandman_sand_clone_counter_hidden",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "hideTooltipFromEnemy": true,
                            "tooltipText": "This skill is invisible."
                        }
                    }
                ],
                "classesHtml": "Physical, Instant, Invisible"
            },
            {
                "id": "sandman-sand-smothering",
                "name": "Sand Smothering",
                "skillimage": "https://i.imgur.com/AUkTp1z.png",
                "skilldescription": "For 2 turns, one enemy has their non-affliction damage reduced by 10 and takes 15 damage each turn.",
                "energy": [
                    "Random",
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Physical",
                    "Melee",
                    "Action"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "sandman_sand_smothering",
                        "duration": 2,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "nonAfflictionDamageDebuffFlat": 10,
                            "turnEndDamage": 15,
                            "tooltipText": "This character deals 10 less non-affliction damage and takes 15 damage each turn."
                        }
                    }
                ]
            },
            {
                "id": "sandman-body-of-sand",
                "name": "Body of Sand",
                "skillimage": "https://i.imgur.com/nzJlnhN.png",
                "skilldescription": "Sandman ignores all enemy physical skills for 2 turns.",
                "energy": [
                    "Random",
                    "Random"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 5,
                "classes": [
                    "Physical",
                    "Instant",
                    "Invisible"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "sandman_body_of_sand_active",
                        "duration": 2,
                        "scope": "self",
                        "metadata": {
                            "ignoreEnemyPhysicalSkills": true,
                            "ignoreSkillClasses": [
                                "physical"
                            ],
                            "hideTooltipFromEnemy": true,
                            "tooltipText": "Sandman ignores enemy physical skills."
                        }
                    }
                ],
                "classesHtml": "Physical, Instant, Invisible"
            },
            {
                "id": "sandman-sand-body-exit",
                "name": "Sand Body Exit",
                "skillimage": "https://i.imgur.com/LLIk8Nu.png",
                "skilldescription": "Deals 45 affliction damage to the enemy marked by 'Sand Body Enter'.",
                "energy": [
                    "Genjutsu",
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Physical",
                    "Melee",
                    "Instant",
                    "Affliction",
                    "Bypassing",
                    "Unreflectable"
                ],
                "cannotBeReflected": true,
                "ignoreInvulnerability": true,
                "effects": [
                    {
                        "type": "damage",
                        "amount": 45,
                        "scope": "target",
                        "condition": {
                            "statusId": "sandman_sand_body_mark",
                            "scope": "target"
                        },
                        "metadata": {
                            "afflictionDamage": true,
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true
                        }
                    },
                    {
                        "type": "cleanse_statuses",
                        "scope": "target",
                        "statusId": "sandman_sand_body_mark",
                        "count": 0
                    }
                ],
                "classesHtml": "Physical, Melee, Instant, Affliction, Bypassing, Unreflectable"
            }
        ],
        "role": "Duelist Bruiser",
        "roleCategory": "bruiser",
        "universe": "marvel"
    },
    {
        "id": "mysterio",
        "characterId": "mysterio",
        "name": "Mysterio",
        "facePicture": "https://i.imgur.com/mc1rZn0.jpeg",
        "characterdeescription": "Mysterio excels at destabilizing the battlefield through deception, punishing enemies for acting without caution. Rather than directly overpowering opponents, he manipulates outcomes—redirecting abilities, setting hidden traps, and turning enemy decisions against them. With tools that reward prediction and punish routine play.",
        "skills": [
            {
                "id": "mysterio-illusion-of-choice",
                "name": "Illusion of Choice",
                "skillimage": "https://i.imgur.com/L6xYXGc.png",
                "skilldescription": "Mysterio targets one enemy for 1 turn. During this time, their next harmful skill will be reflected to a random enemy and their next helpful skill will be re-directed to a random ally.",
                "energy": [
                    "Genjutsu"
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
                        "statusId": "mysterio_illusion_of_choice_reflect",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "hideTooltipFromUnitOwner": true,
                            "reflectNextIncomingSkill": true,
                            "reflectOnlyHarmfulSkills": true,
                            "reflectToRandomCasterAlly": true,
                            "tooltipText": "The next harmful skill used on this character is reflected to a random enemy."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "mysterio_illusion_of_choice_helpful_blind",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "hideTooltipFromUnitOwner": true,
                            "helpfulBlind": true,
                            "tooltipText": "The next helpful skill used on this character will target a random ally."
                        }
                    }
                ],
                "classesHtml": "Mental, Ranged, Instant, Invisible"
            },
            {
                "id": "mysterio-script-rewrite",
                "name": "Script Rewrite",
                "skillimage": "https://i.imgur.com/pt6KJHc.png",
                "skilldescription": "Mysterio targets one enemy for 2 turns. If that enemy uses a new harmful skill, that skill will target themselves or an ally instead, they take 30 affliction damage, and that skill's cooldown increases by 1. This cannot be used on an already affected enemy.",
                "description": "Mysterio targets one enemy for 2 turns. If that enemy uses a new harmful skill, that skill will target themselves or an ally instead, they take 30 affliction damage, and that skill's cooldown increases by 1. This cannot be used on an already affected enemy.",
                "descriptionHtml": "Mysterio targets one enemy for 2 turns. If that enemy uses a new harmful skill, that skill will target themselves or an ally instead, they take 30 affliction damage, and that skill's cooldown increases by 1.<br>This cannot be used on an already affected enemy.",
                "energy": [
                    "Ninjutsu"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Mental",
                    "Ranged",
                    "Instant",
                    "Affliction",
                    "Invisible"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "mysterio_script_rewrite_trap",
                        "duration": 2,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "triggerOnEnemyHarmfulSkill": true,
                            "counterCancelsSkill": true,
                            "counterEffectsToSourceOwner": [
                                {
                                    "type": "damage",
                                    "amount": 30,
                                    "metadata": {
                                        "afflictionDamage": true,
                                        "ignoreDamageReduction": true,
                                        "ignoreDestructibleDefense": true
                                    }
                                },
                                {
                                    "type": "modify_cooldowns",
                                    "amount": 1,
                                    "metadata": {
                                        "targetTriggeredSkillOnly": true
                                    }
                                }
                            ],
                            "hideTooltipFromEnemy": true,
                            "tooltipText": "If this character uses a new harmful skill, they take 30 affliction damage and that skill's cooldown increases by 1."
                        }
                    }
                ],
                "classesHtml": "Mental, Ranged, Instant, Affliction, Invisible"
            },
            {
                "id": "mysterio-hall-of-mirrors",
                "name": "Hall of Mirrors",
                "skillimage": "https://i.imgur.com/MV1gA5Q.png",
                "skilldescription": "For 2 turns, your team gains 30% evasion. This skill becomes visible on the second turn.",
                "description": "For 2 turns, your team gains 30% evasion. This skill becomes visible on the second turn.",
                "descriptionHtml": "For 2 turns, your team gains 30% evasion.<br>This skill becomes visible on the second turn.",
                "energy": [
                    "Ninjutsu",
                    "Genjutsu"
                ],
                "target": "all-allies",
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
                        "statusId": "mysterio_hall_of_mirrors_evasion",
                        "duration": 2,
                        "scope": "all-allies",
                        "metadata": {
                            "hideTooltipFromEnemy": true,
                            "turnDurationAnchor": "source_turn",
                            "evadeChancePercent": 30,
                            "evadeAgainstNonMental": true,
                            "tooltipText": "This character has 30% evasion against enemy non-mental skills."
                        }
                    }
                ],
                "classesHtml": "Mental, Instant, Invisible"
            },
            {
                "id": "mysterio-grand-illusion",
                "name": "Grand Illusion",
                "skillimage": "https://i.imgur.com/jGNjooo.png",
                "skilldescription": "Mysterio creates a “Decoy” for 2 turns. Decoy absorbs the next harmful skill used on Mysterio’s team and If destroyed → the enemy team has their damage reduced by 10 for 1 turn.",
                "energy": [
                    "Random"
                ],
                "target": "all-allies",
                "damage": 0,
                "cooldown": 4,
                "classes": [
                    "Mental",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "mysterio_grand_illusion_decoy",
                        "duration": 2,
                        "scope": "all-allies",
                        "metadata": {
                            "harmful": true,
                            "triggerOnEnemyHarmfulSkill": true,
                            "counterCancelsSkill": true,
                            "statusGroupId": "mysterio_grand_illusion_decoy",
                            "removeStatusGroupIdsOnTrigger": [
                                "mysterio_grand_illusion_decoy"
                            ],
                            "counterEffectsToEnemiesOfSource": [
                                {
                                    "type": "apply_status",
                                    "statusId": "mysterio_grand_illusion_enemy_damage_debuff",
                                    "duration": 1,
                                    "metadata": {
                                        "harmful": true,
                                        "damageDebuffFlat": 10,
                                        "tooltipText": "This character deals 10 less damage."
                                    }
                                }
                            ],
                            "hideTooltipFromEnemy": true,
                            "tooltipText": "The next harmful skill used on this character's team is absorbed. If the decoy is destroyed, the enemy team deals 10 less damage for 1 turn."
                        }
                    }
                ]
            }
        ],
        "role": "Trickster Mage",
        "roleCategory": "strategic",
        "universe": "marvel"
    },
    {
        "id": "scorpion",
        "characterId": "scorpion",
        "name": "Scorpion",
        "facePicture": "https://i.imgur.com/ZlrriRW.png",
        "characterdeescription": "Scorpion controls the battlefield through unpredictable venom cycles, forcing enemies to adapt to constantly shifting effects. His abilities layer affliction, disruption, and scaling damage, making him a dangerous threat the longer he remains active.",
        "startStatuses": [
            {
                "statusId": "scorpion_passive_scorpion_venom",
                "sourceSkillId": "scorpion-passive-scorpion-venom",
                "duration": 1,
                "metadata": {
                    "randomizeMetadataKeyFromOptions": {
                        "metadataKey": "currentVenom",
                        "options": [
                            "Neurotoxin",
                            "Acid",
                            "Paralytic Agent"
                        ]
                    },
                    "turnEndRandomizeMetadataKeyFromOptions": {
                        "metadataKey": "currentVenom",
                        "options": [
                            "Neurotoxin",
                            "Acid",
                            "Paralytic Agent"
                        ],
                        "excludeCurrentValue": true,
                        "resetDuration": 1
                    },
                    "tooltipTextTemplate": "Current venom: {currentVenom}"
                }
            }
        ],
        "skills": [
            {
                "id": "scorpion-scorpion-sting",
                "name": "Scorpion Sting",
                "skillimage": "https://i.imgur.com/6GJ74IJ.jpeg",
                "skilldescription": "Deals 15 piercing damage to one enemy and injects them with Scorpion's current venom for 2 turns.\n\nNeurotoxin: Target ignores healing effects and deals 10 less non-affliction damage.\nAcid: Deals 10 affliction damage the first turn and 5 the second.\nParalytic Agent: Stuns harmful skills the first turn and helpful skills the second.",
                "energy": [
                    "Taijutsu"
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
                        "amount": 15,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "scorpion_scorpion_sting_neurotoxin",
                        "duration": 2,
                        "scope": "target",
                        "condition": {
                            "scope": "self",
                            "statusMetadataEquals": {
                                "statusId": "scorpion_passive_scorpion_venom",
                                "metadataKey": "currentVenom",
                                "value": "Neurotoxin"
                            }
                        },
                        "metadata": {
                            "healReceivedMultiplier": 0,
                            "nonAfflictionDamageDebuffFlat": 10,
                            "tooltipText": "This character ignores healing and deals 10 less non-affliction damage."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "scorpion_scorpion_sting_acid_primary",
                        "duration": 1,
                        "scope": "target",
                        "condition": {
                            "scope": "self",
                            "statusMetadataEquals": {
                                "statusId": "scorpion_passive_scorpion_venom",
                                "metadataKey": "currentVenom",
                                "value": "Acid"
                            }
                        },
                        "metadata": {
                            "turnEndDamage": 10,
                            "afflictionDamage": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "removeStatusIdsOnApply": [
                                "scorpion_scorpion_sting_acid_secondary"
                            ],
                            "onExpireApplyStatusToSelf": {
                                "statusId": "scorpion_scorpion_sting_acid_secondary",
                                "duration": 1,
                                "metadata": {
                                    "turnEndDamage": 5,
                                    "afflictionDamage": true,
                                    "turnEndTrigger": "source_turn",
                                    "turnDurationAnchor": "source_turn",
                                    "tooltipText": "This character takes 5 affliction."
                                }
                            },
                            "tooltipText": "This character takes 10 affliction damage this turn and 5 affliction damage the next turn."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "scorpion_scorpion_sting_paralytic_primary",
                        "duration": 1,
                        "scope": "target",
                        "condition": {
                            "scope": "self",
                            "statusMetadataEquals": {
                                "statusId": "scorpion_passive_scorpion_venom",
                                "metadataKey": "currentVenom",
                                "value": "Paralytic Agent"
                            }
                        },
                        "metadata": {
                            "cannotUseHarmfulSkills": true,
                            "removeStatusIdsOnApply": [
                                "scorpion_scorpion_sting_paralytic_secondary"
                            ],
                            "onExpireApplyStatusToSelf": {
                                "statusId": "scorpion_scorpion_sting_paralytic_secondary",
                                "duration": 1,
                                "metadata": {
                                    "cannotUseHelpfulSkills": true,
                                    "tooltipText": "This character cannot use helpful skills."
                                }
                            },
                            "tooltipText": "This character cannot use harmful skills."
                        }
                    }
                ]
            },
            {
                "id": "scorpion-tail-laser",
                "name": "Tail Laser",
                "skillimage": "https://i.imgur.com/27sdY9f.png",
                "skilldescription": "Targets an enemy with an effect depending on Scorpion's current venom.\n\nNeurotoxin: Deals 40 affliction damage and makes the target ignore helpful effects for 1 turn.\nAcid: Deals 15 affliction damage permanently (stacks).\nParalytic Agent: Deals 30 affliction damage and stuns physical and chakra skills for 2 turns.",
                "energy": [
                    "Taijutsu",
                    "Taijutsu"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Energy",
                    "Ranged",
                    "Instant",
                    "Affliction"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 40,
                        "scope": "target",
                        "condition": {
                            "scope": "self",
                            "statusMetadataEquals": {
                                "statusId": "scorpion_passive_scorpion_venom",
                                "metadataKey": "currentVenom",
                                "value": "Neurotoxin"
                            }
                        },
                        "metadata": {
                            "afflictionDamage": true,
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "scorpion_tail_laser_neurotoxin",
                        "duration": 1,
                        "scope": "target",
                        "condition": {
                            "scope": "self",
                            "statusMetadataEquals": {
                                "statusId": "scorpion_passive_scorpion_venom",
                                "metadataKey": "currentVenom",
                                "value": "Neurotoxin"
                            }
                        },
                        "metadata": {
                            "invulnerableToHelpfulSkills": true,
                            "tooltipText": "This character ignores helpful skills."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "scorpion_tail_laser_acid_burn",
                        "duration": 1,
                        "scope": "target",
                        "condition": {
                            "scope": "self",
                            "statusMetadataEquals": {
                                "statusId": "scorpion_passive_scorpion_venom",
                                "metadataKey": "currentVenom",
                                "value": "Acid"
                            }
                        },
                        "metadata": {
                            "afflictionDamage": true,
                            "stackMetadataKey": "acidStacks",
                            "stackDelta": 1,
                            "stackMax": 99,
                            "stackDerivedNumericKeys": {
                                "turnEndDamage": 15
                            },
                            "turnEndDamage": 15,
                            "tooltipTextTemplate": "This character takes {turnEndDamage} affliction damage each turn.",
                            "onExpireApplyStatusToSelf": {
                                "statusId": "scorpion_tail_laser_acid_burn",
                                "duration": 1,
                                "inheritSourceMetadata": true
                            }
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "scorpion_tail_laser_paralytic",
                        "duration": 2,
                        "scope": "target",
                        "condition": {
                            "scope": "self",
                            "statusMetadataEquals": {
                                "statusId": "scorpion_passive_scorpion_venom",
                                "metadataKey": "currentVenom",
                                "value": "Paralytic Agent"
                            }
                        },
                        "metadata": {
                            "afflictionDamage": true,
                            "cannotUseSkillClasses": [
                                "physical",
                                "chakra"
                            ],
                            "tooltipText": "This character cannot use physical or chakra skills."
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 30,
                        "scope": "target",
                        "condition": {
                            "scope": "self",
                            "statusMetadataEquals": {
                                "statusId": "scorpion_passive_scorpion_venom",
                                "metadataKey": "currentVenom",
                                "value": "Paralytic Agent"
                            }
                        },
                        "metadata": {
                            "afflictionDamage": true,
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true
                        }
                    }
                ]
            },
            {
                "id": "scorpion-neck-constriction",
                "name": "Neck Constriction",
                "skillimage": "https://i.imgur.com/VeQNiUA.png",
                "skilldescription": "Stuns one enemy's non-mental skills for 1 turn. Permanently, Scorpion deals 5 additional damage to this target (stacks).",
                "energy": [
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Physical",
                    "Control",
                    "Ranged"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "scorpion_neck_constriction_lock",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "cannotUseNonMentalSkills": true,
                            "tooltipText": "This character cannot use non-mental skills."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "scorpion_neck_constriction_mark",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "bonusDamageFromSourceCharacterId": "scorpion",
                            "bonusDamageFromSourceSkillsFlat": 5,
                            "mergeNumericAddKeys": [
                                "bonusDamageFromSourceSkillsFlat"
                            ],
                            "tooltipTextTemplate": "Scorpion deals {bonusDamageFromSourceSkillsFlat} additional damage to this target.",
                            "onExpireApplyStatusToSelf": {
                                "statusId": "scorpion_neck_constriction_mark",
                                "duration": 1,
                                "inheritSourceMetadata": true
                            }
                        }
                    }
                ]
            },
            {
                "id": "scorpion-scorpion-crawl",
                "name": "Scorpion Crawl",
                "skillimage": "https://i.imgur.com/0kjGXyD.png",
                "skilldescription": "This skill makes Scorpion invulnerable for 1 turn.",
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
                        "statusId": "scorpion_scorpion_crawl_invulnerable",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "invulnerable": true,
                            "tooltipText": "Scorpion is invulnerable."
                        }
                    }
                ]
            },
            {
                "id": "scorpion-passive-scorpion-venom",
                "name": "Passive: Scorpion Venom",
                "skillimage": "https://i.imgur.com/1M0z4rN.png",
                "skilldescription": "Each turn, Scorpion randomly cycles his venom between Neurotoxin, Acid, and Paralytic Agent. This cannot repeat the same venom as the previous turn.",
                "energy": [],
                "target": "",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Passive",
                    "Instant",
                    "Affliction"
                ]
            }
        ],
        "role": "Affliction Specialist",
        "roleCategory": "specialist",
        "universe": "marvel"
    },
    {
        "id": "green-lantern-hal-jordan",
        "characterId": "green-lantern-hal-jordan",
        "name": "Green Lantern (Hal Jordan)",
        "facePicture": "https://i.imgur.com/G4WAQZH.jpeg",
        "characterdeescription": "Green Lantern functions as a scaling control damage dealer who adapts to the needs of his team as the fight progresses. Through a rotating arsenal of constructs, he applies steady pressure, breaks through defenses, and disrupts key enemies before ramping into powerful finishing blows.",
        "startStatuses": [
            {
                "statusId": "green_lantern_hal_jordan_passive_green_lantern_ring",
                "sourceSkillId": "green-lantern-hal-jordan-passive-green-lantern-ring",
                "duration": 99,
                "metadata": {
                    "infiniteDuration": true,
                    "lanternPassiveVisual": "green",
                    "turnEndApplyStatusToSelf": {
                        "statusId": "green_lantern_hal_jordan_green_lantern_ring_damage_bonus",
                        "duration": 99,
                        "metadata": {
                            "infiniteDuration": true,
                            "lanternEffectVisual": "green",
                            "damageBonusFlat": 1,
                            "mergeNumericAddKeys": [
                                "damageBonusFlat"
                            ],
                            "tooltipTextTemplate": "Green Lantern deals {damageBonusFlat} additional damage."
                        }
                    },
                    "tooltipText": "At the end of each of Green Lantern's turns, he will deal 1 additional damage."
                }
            }
        ],
        "skills": [
            {
                "id": "green-lantern-hal-jordan-willpower-blast",
                "name": "Willpower Blast",
                "skillimage": "https://i.imgur.com/CD68MhW.jpeg",
                "skilldescription": "Deals 20 affliction damage to one enemy. If the target uses a new harmful skill next turn, Green Lantern gains 1 green energy.",
                "energy": [
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Energy",
                    "Instant",
                    "Ranged",
                    "Affliction"
                ],
                "effects": [
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
                        "statusId": "green_lantern_hal_jordan_willpower_blast_charge_trap",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "triggerOnEnemyHarmfulSkill": true,
                            "counterEffectsToSourceOwner": [
                                {
                                    "type": "gain_chakra",
                                    "chakraType": "taijutsu",
                                    "amount": 1
                                }
                            ],
                            "tooltipText": "If this character uses a new harmful skill next turn, Green Lantern gains 1 taijutsu chakra."
                        }
                    }
                ]
            },
            {
                "id": "green-lantern-hal-jordan-willpower-shackles",
                "name": "Willpower Shackles",
                "skillimage": "https://i.imgur.com/8MRaEkC.jpeg",
                "skilldescription": "Deals 15 damage to one enemy and stuns their harmful skills for 1 turn.",
                "energy": [
                    "Taijutsu"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Energy",
                    "Instant",
                    "Ranged"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 15,
                        "scope": "target"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "green_lantern_hal_jordan_willpower_shackles_lock",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "cannotUseHarmfulSkills": true,
                            "tooltipText": "This character's harmful skills are stunned."
                        }
                    }
                ]
            },
            {
                "id": "green-lantern-hal-jordan-willpower-minigun",
                "name": "Willpower Minigun",
                "skillimage": "https://i.imgur.com/dUigTdU.jpeg",
                "skilldescription": "Deals 5 piercing damage to the enemy team for 3 turns. This skill becomes 'Willpower Torpedo' after use.",
                "energy": [
                    "Taijutsu"
                ],
                "target": "all-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Energy",
                    "Action",
                    "Ranged"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "green_lantern_hal_jordan_willpower_minigun_barrage",
                        "duration": 3,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "ongoingClass": "action",
                            "turnEndDamage": 5,
                            "ignoreTargetDamageReduction": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "tooltipText": "This character takes 5 piercing damage each turn."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "green_lantern_hal_jordan_construct_cycle_torpedo",
                        "duration": 99,
                        "scope": "self",
                        "metadata": {
                            "infiniteDuration": true,
                            "removeStatusIdsOnApply": [
                                "green_lantern_hal_jordan_construct_cycle_train"
                            ],
                            "skillReplacements": {
                                "green-lantern-hal-jordan-willpower-minigun": "green-lantern-hal-jordan-willpower-torpedo"
                            },
                            "tooltipText": "Willpower Minigun is replaced by Willpower Torpedo."
                        }
                    }
                ]
            },
            {
                "id": "green-lantern-hal-jordan-willpower-truck",
                "name": "Willpower Truck",
                "skillimage": "https://i.imgur.com/unHjSDc.jpeg",
                "skilldescription": "Green Lantern grants himself or one ally 40 destructible defense for 2 turns.",
                "energy": [
                    "Taijutsu"
                ],
                "target": "self-or-single-ally",
                "damage": 0,
                "cooldown": 4,
                "classes": [
                    "Energy",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "green_lantern_hal_jordan_willpower_truck_defense",
                        "duration": 2,
                        "scope": "target",
                        "metadata": {
                            "destructibleDefensePoints": 40,
                            "tooltipTextTemplate": "This character has {destructibleDefensePoints} destructible defense."
                        }
                    }
                ]
            },
            {
                "id": "green-lantern-hal-jordan-willpower-torpedo",
                "name": "Willpower Torpedo",
                "useBaseSkillCooldown": true,
                "skillimage": "https://i.imgur.com/oI2gHKQ.jpeg",
                "skilldescription": "Destroys one enemy's destructible defense and deals 40 piercing damage to them. This skill becomes 'Willpower Train' after use.",
                "energy": [
                    "Taijutsu",
                    "Taijutsu"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Energy",
                    "Instant",
                    "Ranged"
                ],
                "effects": [
                    {
                        "type": "destroy_destructible_defense",
                        "scope": "target"
                    },
                    {
                        "type": "damage",
                        "amount": 40,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageReduction": true
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "green_lantern_hal_jordan_construct_cycle_train",
                        "duration": 99,
                        "scope": "self",
                        "metadata": {
                            "infiniteDuration": true,
                            "removeStatusIdsOnApply": [
                                "green_lantern_hal_jordan_construct_cycle_torpedo"
                            ],
                            "skillReplacements": {
                                "green-lantern-hal-jordan-willpower-minigun": "green-lantern-hal-jordan-willpower-train"
                            },
                            "tooltipText": "Willpower Minigun is replaced by Willpower Train, which deals 60 damage and stuns one enemy for 1 turn.",
                            "hideTooltip": true
                        }
                    }
                ]
            },
            {
                "id": "green-lantern-hal-jordan-willpower-train",
                "name": "Willpower Train",
                "useBaseSkillCooldown": true,
                "skillimage": "https://i.imgur.com/cnCsYcB.jpeg",
                "skilldescription": "Deals 60 damage to one enemy and stuns them for 1 turn. This skill becomes 'Willpower Minigun' after use.",
                "energy": [
                    "Taijutsu",
                    "Taijutsu",
                    "Taijutsu"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Energy",
                    "Instant",
                    "Ranged"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 60,
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
                        "type": "cleanse_statuses",
                        "count": 1,
                        "scope": "self",
                        "statusId": "green_lantern_hal_jordan_construct_cycle_train"
                    }
                ]
            },
            {
                "id": "green-lantern-hal-jordan-passive-green-lantern-ring",
                "name": "Passive: Green Lantern Ring",
                "skillimage": "https://i.imgur.com/NuSX2n9.jpeg",
                "skilldescription": "At the end of each of Green Lantern's turns, he gains 1 additional damage permanently.",
                "energy": [],
                "target": "",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Passive",
                    "Instant"
                ]
            }
        ],
        "role": "Scaling Carry",
        "roleCategory": "hybrid",
        "universe": "dc"
    },
    {
        "id": "homelander",
        "characterId": "homelander",
        "name": "Homelander",
        "facePicture": "https://i.imgur.com/UEKWk6t.jpeg",
        "characterdeescription": "Homelander functions as a snowball executioner who grows deadlier every time he finishes off a weakened target. Starting as a strong single-target threat, he uses brutal burst damage and intimidation tools to pick off vulnerable enemies, then converts each kill into permanent bonus damage and self-healing. The longer he is allowed to secure eliminations, the faster he spirals into an overwhelming late-game menace.",
        "startStatuses": [
            {
                "statusId": "homelander_passive_finish_the_weak",
                "sourceSkillId": "homelander-passive-finish-the-weak",
                "duration": 99,
                "metadata": {
                    "infiniteDuration": true,
                    "onOwnerKillTargetRelation": "any",
                    "onOwnerKillHealSelfAmount": 15,
                    "onOwnerKillApplyStatusToSelf": {
                        "statusId": "homelander_finish_the_weak_damage_bonus",
                        "duration": 99,
                        "metadata": {
                            "infiniteDuration": true,
                            "damageBonusFlat": 5,
                            "mergeNumericAddKeys": [
                                "damageBonusFlat"
                            ],
                            "tooltipTextTemplate": "Homelander deals {damageBonusFlat} additional damage."
                        }
                    },
                    "tooltipText": "If Homelander kills a character, he heals 15 HP and gains 5 permanent damage."
                }
            }
        ],
        "skills": [
            {
                "id": "homelander-laser-death-beam",
                "name": "Laser Death Beam",
                "skillimage": "https://i.imgur.com/n5ttNa6_d.jpeg?maxwidth=520&shape=thumb&fidelity=high",
                "skilldescription": "Deals 40 piercing damage to ally or enemy.",
                "energy": [
                    "Bloodline",
                    "Bloodline"
                ],
                "target": "single-character",
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Energy",
                    "Ranged",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 40,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageReduction": true
                        }
                    }
                ]
            },
            {
                "id": "homelander-flying-assault",
                "name": "Flying Assault",
                "skillimage": "https://i.imgur.com/e83Q4Oh_d.jpeg?maxwidth=520&shape=thumb&fidelity=high",
                "skilldescription": "Taunts one enemy for 3 turns. If the target uses a new harmful skill during this time, their skills cost all random energy for 1 turn.",
                "energy": [
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 3,
                "classes": [
                    "Physical",
                    "Control",
                    "Melee"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "homelander_flying_assault_taunt",
                        "duration": 3,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "taunt": true,
                            "tooltipText": "This character is taunted and can only target Homelander."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "homelander_flying_assault_trap",
                        "duration": 3,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "triggerOnEnemyHarmfulSkill": true,
                            "counterStatusId": "homelander_flying_assault_all_random",
                            "counterStatusDuration": 1,
                            "counterStatusMetadata": {
                                "harmful": true,
                                "overrideAllSkillsToAllRandom": true,
                                "tooltipText": "This character's skills cost all random energy."
                            },
                            "tooltipText": "If this character uses a new harmful skill, their skills cost all random energy for 1 turn."
                        }
                    }
                ]
            },
            {
                "id": "homelander-god-s-fist",
                "name": "God's Fist",
                "skillimage": "https://i.imgur.com/VRYBKoR_d.jpeg?maxwidth=520&shape=thumb&fidelity=high",
                "skilldescription": "Deals 30 damage to an ally or enemy. For 1 turn, 'Laser Death Beam' deals 50 piercing damage.",
                "energy": [
                    "Taijutsu",
                    "Random"
                ],
                "target": "single-character",
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
                        "statusId": "homelander_gods_fist_empower",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "skillReplacements": {
                                "homelander-laser-death-beam": "homelander-laser-death-beam-empowered"
                            },
                            "tooltipText": "Laser Death Beam deals 50 piercing damage."
                        }
                    }
                ]
            },
            {
                "id": "homelander-unbreakable-body",
                "name": "Unbreakable Body",
                "skillimage": "https://i.imgur.com/7Muvcwt_d.jpeg?maxwidth=520&shape=thumb&fidelity=high",
                "skilldescription": "For the rest of the game, Homelander gains 20% unpierceable damage reduction and enemies take 10 damage when they use a new skill on him. This skill may only be used 3 times.",
                "energy": [
                    "Bloodline"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 2,
                "maxUses": 3,
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "homelander_unbreakable_body_active",
                        "duration": 99,
                        "scope": "self",
                        "metadata": {
                            "infiniteDuration": true,
                            "unpierceableDamageReductionPercent": 20,
                            "onEnemySkillTargetedDamageToSourceAmount": 10,
                            "mergeNumericAddKeys": [
                                "unpierceableDamageReductionPercent",
                                "onEnemySkillTargetedDamageToSourceAmount"
                            ],
                            "tooltipTextTemplate": "Homelander has {unpierceableDamageReductionPercent}% unpierceable damage reduction and enemies take {onEnemySkillTargetedDamageToSourceAmount} damage when they use a new skill on him."
                        }
                    }
                ]
            },
            {
                "id": "homelander-passive-finish-the-weak",
                "name": "Passive: Finish the Weak",
                "skillimage": "https://i.imgur.com/taU9ypw_d.jpeg?maxwidth=520&shape=thumb&fidelity=high",
                "skilldescription": "If Homelander kills a character, he heals 15 HP and gains 5 permanent damage. This effect stacks.",
                "energy": [],
                "target": "",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Passive",
                    "Instant"
                ]
            },
            {
                "id": "homelander-laser-death-beam-empowered",
                "name": "Laser Death Beam",
                "useBaseSkillCooldown": true,
                "skillimage": "https://i.imgur.com/Lj24mN6_d.jpeg?maxwidth=520&shape=thumb&fidelity=high",
                "skilldescription": "Deals 50 piercing damage to one character.",
                "energy": [
                    "Bloodline",
                    "Bloodline"
                ],
                "target": "single-character",
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Energy",
                    "Ranged",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 50,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageReduction": true
                        }
                    }
                ]
            }
        ],
        "role": "Executioner",
        "roleCategory": "assassin",
        "universe": "other"
    },
    {
        "id": "xenomorph-drone",
        "characterId": "xenomorph-drone",
        "name": "Xenomorph Drone",
        "nameHtml": "Xenomorph Drone",
        "facePicture": "https://i.imgur.com/IwSu3G7_d.png?maxwidth=520&shape=thumb&fidelity=high",
        "url": "https://i.imgur.com/IwSu3G7_d.png?maxwidth=520&shape=thumb&fidelity=high",
        "unlockRequirement": "None",
        "unlockRequirementHtml": "None",
        "characterdeescription": "Xenomorph Drone is a scaling swarm-based fighter that punishes enemies with affliction and executes weakened targets. It becomes stronger as more drones are present.",
        "description": "Xenomorph Drone is a scaling swarm-based fighter that punishes enemies with affliction and executes weakened targets. It becomes stronger as more drones are present.",
        "descriptionHtml": "Xenomorph Drone is a scaling swarm-based fighter that punishes enemies with affliction and executes weakened targets.<br>It becomes stronger as more drones are present.",
        "startStatuses": [
            {
                "statusId": "xenomorph_drone_acid_blood_passive",
                "sourceSkillId": "xenomorph-drone-passive-acid-blood",
                "duration": 999,
                "metadata": {
                    "infiniteDuration": true,
                    "triggerOnEnemyHarmfulSkill": true,
                    "triggerOnEnemyHarmfulSkillClassesAny": [
                        "Melee"
                    ],
                    "counterDamageMetadata": {
                        "bonusPerAliveTeamMember": {
                            "characterId": "xenomorph-drone",
                            "statusId": "xenomorph_hive_member",
                            "amount": 3
                        }
                    },
                    "counterDamageIgnoresReduction": true,
                    "counterDamageIgnoresDestructibleDefense": true,
                    "persistOnTrigger": true,
                    "tooltipText": "Enemies using melee skills on this character take 3 affliction damage for each Xenomorph Drone on this team."
                }
            },
            {
                "statusId": "xenomorph_hive_member",
                "sourceSkillId": "xenomorph-drone-passive-the-hive",
                "duration": 999,
                "metadata": {
                    "infiniteDuration": true,
                    "effectiveCharacterId": "xenomorph-drone",
                    "tooltipText": "This character counts as a Xenomorph for The Hive."
                }
            },
            {
                "statusId": "xenomorph_drone_facehugger_reward",
                "sourceSkillId": "xenomorph-drone-facehugger",
                "duration": 999,
                "metadata": {
                    "infiniteDuration": true,
                    "hideTooltip": true,
                    "onOwnerKillTargetRelation": "enemy",
                    "onOwnerKillSourceSkillIdsAny": [
                        "xenomorph-drone-facehugger"
                    ],
                    "onOwnerKillApplyStatusToSelf": {
                        "statusId": "xenomorph_drone_facehugger_carapace",
                        "duration": 999,
                        "metadata": {
                            "destructibleDefensePoints": 25,
                            "mergeNumericAddKeys": [
                                "destructibleDefensePoints"
                            ],
                            "tooltipTextTemplate": "This character has {destructibleDefensePoints} destructible defense from Facehugger."
                        }
                    }
                }
            }
        ],
        "skills": [
            {
                "id": "xenomorph-drone-inner-jaw-strike",
                "name": "Inner-Jaw Strike",
                "nameHtml": "Inner-Jaw Strike",
                "skillimage": "https://i.imgur.com/OeSLg1o_d.png?maxwidth=520&shape=thumb&fidelity=high",
                "url": "https://i.imgur.com/OeSLg1o_d.png?maxwidth=520&shape=thumb&fidelity=high",
                "skilldescription": "Deals 20 damage to one enemy. If their health falls to 10 HP or below, they are executed.",
                "description": "Deals 20 damage to one enemy. If their health falls to 10 HP or below, they are executed.",
                "descriptionHtml": "Deals 20 damage to one enemy.<br>If their health falls to 10 HP or below, they are executed.",
                "energy": [
                    "Random",
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "cooldownHtml": "None",
                "classes": [
                    "Physical",
                    "Melee",
                    "Instant"
                ],
                "classesHtml": "Physical, Melee, Instant",
                "effects": [
                    {
                        "type": "damage",
                        "amount": 20,
                        "scope": "target",
                        "metadata": {
                            "bonusPerAliveTeamMember": {
                                "characterId": "xenomorph-drone",
                                "statusId": "xenomorph_hive_member",
                                "amount": 5
                            }
                        }
                    },
                    {
                        "type": "execute_below_hp",
                        "threshold": 10,
                        "scope": "target"
                    }
                ]
            },
            {
                "id": "xenomorph-drone-cystic-acid-spit",
                "name": "Cystic Acid Spit",
                "nameHtml": "Cystic Acid Spit",
                "skillimage": "https://i.imgur.com/LJwMFWx_d.png?maxwidth=520&shape=thumb&fidelity=high",
                "url": "https://i.imgur.com/LJwMFWx_d.png?maxwidth=520&shape=thumb&fidelity=high",
                "skilldescription": "Removes all damage reduction and destructible defense from one enemy, then deals 15 affliction damage. Lasts 1 extra turn if they had none.",
                "description": "Removes all damage reduction and destructible defense from one enemy, then deals 15 affliction damage. Lasts 1 extra turn if they had none.",
                "descriptionHtml": "Removes all damage reduction and destructible defense from one enemy, then deals 15 affliction damage.<br>Lasts 1 extra turn if they had none.",
                "energy": [
                    "Bloodline"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 2,
                "cooldownHtml": "2",
                "classes": [
                    "Physical",
                    "Ranged",
                    "Instant",
                    "Affliction"
                ],
                "classesHtml": "Physical, Ranged, Instant",
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "xenomorph_drone_cystic_acid_linger",
                        "duration": 1,
                        "scope": "target",
                        "condition": {
                            "scope": "target",
                            "missingStatusMetadataAny": [
                                "damageReductionFlat",
                                "damageReductionPercent",
                                "unpierceableDamageReductionFlat",
                                "destructibleDefensePoints"
                            ]
                        },
                        "metadata": {
                            "harmful": true,
                            "turnEndDamage": 15,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "afflictionDamage": true,
                            "tooltipText": "This character will take 15 affliction damage next turn."
                        }
                    },
                    {
                        "type": "cleanse_statuses",
                        "scope": "target",
                        "metadataAny": [
                            "damageReductionFlat",
                            "damageReductionPercent",
                            "unpierceableDamageReductionFlat"
                        ]
                    },
                    {
                        "type": "destroy_destructible_defense",
                        "scope": "target"
                    },
                    {
                        "type": "damage",
                        "amount": 15,
                        "scope": "target",
                        "metadata": {
                            "afflictionDamage": true,
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true,
                            "bonusPerAliveTeamMember": {
                                "characterId": "xenomorph-drone",
                                "statusId": "xenomorph_hive_member",
                                "amount": 5
                            }
                        }
                    }
                ]
            },
            {
                "id": "xenomorph-drone-facehugger",
                "name": "Facehugger",
                "nameHtml": "Facehugger",
                "skillimage": "https://i.imgur.com/q9VzVoj_d.jpeg?maxwidth=520&shape=thumb&fidelity=high",
                "url": "https://i.imgur.com/q9VzVoj_d.jpeg?maxwidth=520&shape=thumb&fidelity=high",
                "skilldescription": "May target ally or enemy. Allies become Xenomorphs. Enemies take 25 affliction damage after 2 turns; if they die, gain 25 destructible defense.",
                "description": "May target ally or enemy. Allies become Xenomorphs. Enemies take 25 affliction damage after 2 turns; if they die, gain 25 destructible defense.",
                "descriptionHtml": "May target ally or enemy.<br>Allies become Xenomorphs.<br>Enemies take 25 affliction damage after 2 turns; if they die, gain 25 destructible defense.",
                "energy": [
                    "Bloodline"
                ],
                "target": "single-character",
                "damage": 0,
                "cooldown": 1,
                "cooldownHtml": "1",
                "classes": [
                    "Physical",
                    "Ranged",
                    "Instant",
                    "Affliction"
                ],
                "classesHtml": "Physical, Ranged, Instant, Affliction",
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "xenomorph_hive_member",
                        "duration": 999,
                        "scope": "target",
                        "condition": {
                            "scope": "target",
                            "targetRelation": "ally",
                            "characterId": "predator-stalker"
                        },
                        "metadata": {
                            "infiniteDuration": true,
                            "effectiveCharacterId": "predalien",
                            "facePictureOverride": "https://i.imgur.com/Rq2FZug.jpeg",
                            "tooltipText": "This ally has been turned into a Predalien!"
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "xenomorph_hive_member",
                        "duration": 999,
                        "scope": "target",
                        "condition": {
                            "scope": "target",
                            "targetRelation": "ally",
                            "missingCharacterIdsAny": [
                                "predator-stalker",
                                "predalien"
                            ]
                        },
                        "metadata": {
                            "infiniteDuration": true,
                            "effectiveCharacterId": "xenomorph-drone",
                            "facePictureOverride": "https://i.imgur.com/IwSu3G7_d.png?maxwidth=520&shape=thumb&fidelity=high",
                            "tooltipText": "This ally counts as a Xenomorph for The Hive."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "xenomorph_facehugger_implanted",
                        "duration": 2,
                        "scope": "target",
                        "condition": {
                            "scope": "target",
                            "targetRelation": "enemy"
                        },
                        "metadata": {
                            "harmful": true,
                            "onExpireEffects": [
                                {
                                    "type": "damage",
                                    "amount": 25,
                                    "metadata": {
                                        "afflictionDamage": true,
                                        "ignoreDamageReduction": true,
                                        "ignoreDestructibleDefense": true,
                                        "skillClasses": [
                                            "Affliction"
                                        ]
                                    }
                                }
                            ],
                            "tooltipText": "After 2 turns, this character takes 25 affliction damage."
                        }
                    }
                ]
            },
            {
                "id": "xenomorph-drone-xeno-stealth",
                "name": "Xeno-Stealth",
                "nameHtml": "Xeno-Stealth",
                "skillimage": "https://i.imgur.com/HylKUuA_d.jpeg?maxwidth=520&shape=thumb&fidelity=high",
                "url": "https://i.imgur.com/HylKUuA_d.jpeg?maxwidth=520&shape=thumb&fidelity=high",
                "skilldescription": "Heals 15 HP, becomes invulnerable, and increases 'Inner-Jaw Strike' damage by 10 for 1 turn.",
                "description": "Heals 15 HP, becomes invulnerable, and increases 'Inner-Jaw Strike' damage by 10 for 1 turn.",
                "descriptionHtml": "Heals 15 HP, becomes invulnerable, and increases 'Inner-Jaw Strike' damage by 10 for 1 turn.",
                "energy": [
                    "Random"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 5,
                "cooldownHtml": "5",
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "classesHtml": "Physical, Instant",
                "effects": [
                    {
                        "type": "heal",
                        "amount": 15,
                        "scope": "self"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "xenomorph_drone_xeno_stealth",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "invulnerable": true,
                            "skillDamageBonuses": {
                                "xenomorph-drone-inner-jaw-strike": 10
                            },
                            "tooltipText": "This character is invulnerable and Inner-Jaw Strike deals 10 additional damage."
                        }
                    }
                ]
            },
            {
                "id": "xenomorph-drone-passive-acid-blood",
                "name": "Passive: Acid Blood",
                "nameHtml": "Passive: Acid Blood",
                "skillimage": "https://i.imgur.com/O5qNmea_d.png?maxwidth=520&shape=thumb&fidelity=high",
                "url": "https://i.imgur.com/O5qNmea_d.png?maxwidth=520&shape=thumb&fidelity=high",
                "skilldescription": "Enemies using new melee skills on Xenomorph take 3 affliction damage (increases per drone).",
                "description": "Enemies using new melee skills on Xenomorph take 3 affliction damage (increases per drone).",
                "descriptionHtml": "Enemies using new melee skills on Xenomorph take 3 affliction damage (increases per drone).",
                "energy": [],
                "target": "",
                "damage": 0,
                "cooldown": 0,
                "cooldownHtml": "Passive",
                "classes": [
                    "Passive",
                    "Instant",
                    "Affliction"
                ],
                "classesHtml": "Passive, Instant, Affliction"
            },
            {
                "id": "xenomorph-drone-passive-the-hive",
                "name": "Passive: The Hive",
                "nameHtml": "Passive: The Hive",
                "skillimage": "https://i.imgur.com/wOMvYEY_d.jpeg?maxwidth=520&shape=thumb&fidelity=high",
                "url": "https://i.imgur.com/wOMvYEY_d.jpeg?maxwidth=520&shape=thumb&fidelity=high",
                "skilldescription": "'Inner-Jaw Strike' and 'Cystic Acid Spit' deal 5 bonus damage for every Xenomorph Drone on your team.",
                "description": "'Inner-Jaw Strike' and 'Cystic Acid Spit' deal 5 bonus damage for every Xenomorph Drone on your team.",
                "descriptionHtml": "'Inner-Jaw Strike' and 'Cystic Acid Spit' deal 5 bonus damage for every Xenomorph Drone on your team.",
                "energy": [],
                "target": "",
                "damage": 0,
                "cooldown": 0,
                "cooldownHtml": "Passive",
                "classes": [
                    "Passive",
                    "Instant"
                ],
                "classesHtml": "Passive, Instant"
            }
        ],
        "role": "Swarm DPS",
        "roleCategory": "damage",
        "universe": "other"
    },
    {
        "id": "predalien",
        "characterId": "predalien",
        "name": "Predalien",
        "nameHtml": "Predalien",
        "facePicture": "https://i.imgur.com/Rq2FZug.jpeg",
        "url": "https://i.imgur.com/Rq2FZug.jpeg",
        "unlockRequirement": "None",
        "unlockRequirementHtml": "None",
        "characterdeescription": "Predalien is a relentless bruiser-disruptor that grows stronger the longer combat continues, combining overwhelming physical aggression with stacking defenses and teamwide pressure. It excels at forcing enemies into unfavorable trades while becoming increasingly difficult to bring down.",
        "description": "Predalien is a relentless bruiser-disruptor that grows stronger the longer combat continues, combining overwhelming physical aggression with stacking defenses and teamwide pressure. It excels at forcing enemies into unfavorable trades while becoming increasingly difficult to bring down.",
        "descriptionHtml": "Predalien is a relentless bruiser-disruptor that grows stronger the longer combat continues, combining overwhelming physical aggression with stacking defenses and teamwide pressure.<br>It excels at forcing enemies into unfavorable trades while becoming increasingly difficult to bring down.",
        "skills": [
            {
                "id": "predalien-tail-ravage",
                "name": "Tail Ravage",
                "nameHtml": "Tail Ravage",
                "skillimage": "https://i.imgur.com/jOZDXEw.jpeg",
                "url": "https://i.imgur.com/jOZDXEw.jpeg",
                "skilldescription": "Deals 45 piercing damage to one enemy. If this kills the target, Predalien gains 1 stack of 'Plated Armor' permanently and deals 10 bonus damage permanently that stacks.",
                "description": "Deals 45 piercing damage to one enemy. If this kills the target, Predalien gains 1 stack of 'Plated Armor' permanently and deals 10 bonus damage permanently that stacks.",
                "descriptionHtml": "Deals 45 piercing damage to one enemy. If this kills the target, Predalien gains 1 stack of 'Plated Armor' permanently and deals 10 bonus damage permanently that stacks.",
                "energy": [
                    "Genjutsu",
                    "Genjutsu"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 1,
                "cooldownHtml": "1",
                "classes": [
                    "Physical",
                    "Melee",
                    "Instant"
                ],
                "classesHtml": "Physical, Melee, Instant",
                "effects": [
                    {
                        "type": "damage",
                        "amount": 45,
                        "scope": "target",
                        "metadata": {
                            "piercingDamage": true,
                            "onKillApplyStatusesToSource": [
                                {
                                    "statusId": "predalien_plated_armor_stack",
                                    "duration": 999,
                                    "metadata": {
                                        "infiniteDuration": true,
                                        "damageReductionPercent": 10,
                                        "unpierceableDamageReduction": true,
                                        "destructibleDefensePoints": 10,
                                        "stackMetadataKey": "platedArmorStacks",
                                        "mergeNumericAddKeys": [
                                            "damageReductionPercent",
                                            "destructibleDefensePoints"
                                        ],
                                        "maxStacks": 9,
                                        "tooltipTextTemplate": "This character has {damageReductionPercent}% unpierceable damage reduction and {destructibleDefensePoints} destructible defense."
                                    }
                                },
                                {
                                    "statusId": "predalien_tail_ravage_bonus",
                                    "duration": 999,
                                    "metadata": {
                                        "infiniteDuration": true,
                                        "damageBonusFlat": 10,
                                        "mergeNumericAddKeys": [
                                            "damageBonusFlat"
                                        ],
                                        "tooltipTextTemplate": "This character deals {damageBonusFlat} additional damage."
                                    }
                                }
                            ]
                        }
                    }
                ]
            },
            {
                "id": "predalien-predalien-screech",
                "name": "Predalien Screech",
                "nameHtml": "Predalien Screech",
                "skillimage": "https://i.imgur.com/AT8pjLr.jpeg",
                "url": "https://i.imgur.com/AT8pjLr.jpeg",
                "skilldescription": "Taunts the enemy team and lowers their non-affliction damage by 15 for 1 turn.",
                "description": "Taunts the enemy team and lowers their non-affliction damage by 15 for 1 turn.",
                "descriptionHtml": "Taunts the enemy team and lowers their non-affliction damage by 15 for 1 turn.",
                "energy": [
                    "Random",
                    "Random"
                ],
                "target": "enemy-team",
                "damage": 0,
                "cooldown": 2,
                "cooldownHtml": "2",
                "classes": [
                    "Physical",
                    "Ranged",
                    "Instant",
                    "Bypassing"
                ],
                "classesHtml": "Physical, Ranged, Instant, Bypassing",
                "ignoreInvulnerability": true,
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "predalien_screech_taunt",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "taunt": true,
                            "tooltipText": "This character is taunted."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "predalien_screech_debuff",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "nonAfflictionDamageDebuffFlat": 15,
                            "tooltipText": "This character deals 15 less non-affliction damage."
                        }
                    }
                ]
            },
            {
                "id": "predalien-plated-armor",
                "name": "Plated Armor",
                "nameHtml": "Plated Armor",
                "skillimage": "https://i.imgur.com/txYFMtr.jpeg",
                "url": "https://i.imgur.com/txYFMtr.jpeg",
                "skilldescription": "Predalien gains 10% unpierceable damage reduction and 10 points of destructible defense for 1 turn. This skill stacks up to 9 times.",
                "description": "Predalien gains 10% unpierceable damage reduction and 10 points of destructible defense for 1 turn. This skill stacks up to 9 times.",
                "descriptionHtml": "Predalien gains 10% unpierceable damage reduction and 10 points of destructible defense for 1 turn. This skill stacks up to 9 times.",
                "energy": [],
                "target": "self",
                "damage": 0,
                "cooldown": 1,
                "cooldownHtml": "1",
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "classesHtml": "Physical, Instant",
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "predalien_plated_armor_stack",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "damageReductionPercent": 10,
                            "unpierceableDamageReduction": true,
                            "destructibleDefensePoints": 10,
                            "stackMetadataKey": "platedArmorStacks",
                            "mergeNumericAddKeys": [
                                "damageReductionPercent",
                                "destructibleDefensePoints"
                            ],
                            "maxStacks": 9,
                            "tooltipTextTemplate": "This character has {damageReductionPercent}% unpierceable damage reduction and {destructibleDefensePoints} destructible defense."
                        }
                    }
                ]
            },
            {
                "id": "predalien-predalien-nest",
                "name": "Predalien Nest",
                "nameHtml": "Predalien Nest",
                "skillimage": "https://i.imgur.com/NTVnZF4.jpeg",
                "url": "https://i.imgur.com/NTVnZF4.jpeg",
                "skilldescription": "Predalien becomes invulnerable for 1 turn and gains 1 genjutsu energy.",
                "description": "Predalien becomes invulnerable for 1 turn and gains 1 genjutsu energy.",
                "descriptionHtml": "Predalien becomes invulnerable for 1 turn and gains 1 genjutsu energy.",
                "energy": [
                    "Random"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 4,
                "cooldownHtml": "4",
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "classesHtml": "Physical, Instant",
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "predalien_nest_invulnerable",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "invulnerable": true,
                            "tooltipText": "This character is invulnerable."
                        }
                    },
                    {
                        "type": "gain_chakra",
                        "amount": 1,
                        "chakraType": "genjutsu",
                        "scope": "self"
                    }
                ]
            }
        ],
        "role": "Bruiser",
        "universe": "other",
        "roleCategory": "bruiser"
    },
    {
        "id": "rage-infected",
        "characterId": "rage-infected",
        "name": "Rage Infected",
        "nameHtml": "Rage Infected",
        "facePicture": "https://i.imgur.com/k4lrBvO_d.png?maxwidth=520&shape=thumb&fidelity=high",
        "url": "https://i.imgur.com/k4lrBvO_d.png?maxwidth=520&shape=thumb&fidelity=high",
        "unlockRequirement": "None",
        "unlockRequirementHtml": "None",
        "characterdeescription": "Infected with the Rage Virus is a relentless berserker who overwhelms enemies through pain, chaos, and psychological pressure. Using brutal attacks, blindness effects, and self-destructive rage, he punishes opponents for trying to fight back while growing deadlier the longer combat continues. Though vulnerable to sustained focus and burst damage, Rage Infected excels at disrupting enemy coordination and forcing reckless decisions through constant pressure and unpredictable aggression.",
        "description": "Infected with the Rage Virus is a relentless berserker who overwhelms enemies through pain, chaos, and psychological pressure. Using brutal attacks, blindness effects, and self-destructive rage, he punishes opponents for trying to fight back while growing deadlier the longer combat continues. Though vulnerable to sustained focus and burst damage, Rage Infected excels at disrupting enemy coordination and forcing reckless decisions through constant pressure and unpredictable aggression.",
        "descriptionHtml": "Infected with the Rage Virus is a relentless berserker who overwhelms enemies through pain, chaos, and psychological pressure. Using brutal attacks, blindness effects, and self-destructive rage, he punishes opponents for trying to fight back while growing deadlier the longer combat continues. Though vulnerable to sustained focus and burst damage, Rage Infected excels at disrupting enemy coordination and forcing reckless decisions through constant pressure and unpredictable aggression.",
        "skills": [
            {
                "id": "rage-infected-blood-vomit",
                "name": "Blood Vomit",
                "nameHtml": "Blood Vomit",
                "skillimage": "https://i.imgur.com/5L1V6jg_d.png?maxwidth=520&shape=thumb&fidelity=high",
                "url": "https://i.imgur.com/5L1V6jg_d.png?maxwidth=520&shape=thumb&fidelity=high",
                "skilldescription": "For 2 turns, one enemy takes 15 bleed damage, deals 10 additional non-affliction damage, and is fully blinded, causing their new harmful skills to randomly select their target from both teams. Bleed cannot be ignored, increased, or reduced, and is removed by any healing effect.",
                "description": "For 2 turns, one enemy takes 15 bleed damage, deals 10 additional non-affliction damage, and is fully blinded, causing their new harmful skills to randomly select their target from both teams. Bleed cannot be ignored, increased, or reduced, and is removed by any healing effect.",
                "descriptionHtml": "For 2 turns, one enemy takes 15 bleed damage, deals 10 additional non-affliction damage, and is fully blinded, causing their new harmful skills to randomly select their target from both teams.<br>Bleed cannot be ignored, increased, or reduced, and is removed by any healing effect.",
                "energy": [
                    "Bloodline",
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 3,
                "cooldownHtml": "3",
                "classes": [
                    "Physical",
                    "Ranged",
                    "Instant"
                ],
                "classesHtml": "Physical, Ranged, Instant",
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "rage_infected_blood_vomit",
                        "duration": 2,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "fullBlind": true,
                            "nonAfflictionDamageBonusFlat": 10,
                            "afflictionDamage": true,
                            "fixedTurnEndDamage": true,
                            "ignoreDamageImmunity": true,
                            "ignoreAfflictionDamageImmunity": true,
                            "removeOnHealingEffect": true,
                            "turnEndDamage": 15,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "tooltipText": "This character takes 15 bleed damage each turn, deals 10 additional non-affliction damage, and harmful skills randomly target either team. Bleed cannot be ignored, increased, or reduced, and is removed by any healing effect."
                        }
                    }
                ]
            },
            {
                "id": "rage-infected-eye-gouge",
                "name": "Eye Gouge",
                "nameHtml": "Eye Gouge",
                "skillimage": "https://i.imgur.com/3f7cgd3_d.jpeg?maxwidth=520&shape=thumb&fidelity=high",
                "url": "https://i.imgur.com/3f7cgd3_d.jpeg?maxwidth=520&shape=thumb&fidelity=high",
                "skilldescription": "Deals 25 bleed damage to one enemy and 5 bleed damage the following turn. For 1 turn, they are partially-blinded, causing their new harmful skills to randomly select their target from the opposing team only. Bleed cannot be ignored, increased, or reduced, and is removed by any healing effect.",
                "description": "Deals 25 bleed damage to one enemy and 5 bleed damage the following turn. For 1 turn, they are partially-blinded, causing their new harmful skills to randomly select their target from the opposing team only. Bleed cannot be ignored, increased, or reduced, and is removed by any healing effect.",
                "descriptionHtml": "Deals 25 bleed damage to one enemy and 5 bleed damage the following turn.<br>For 1 turn, they are partially-blinded, causing their new harmful skills to randomly select their target from the opposing team only.<br>Bleed cannot be ignored, increased, or reduced, and is removed by any healing effect.",
                "energy": [
                    "Taijutsu",
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 1,
                "cooldownHtml": "1",
                "classes": [
                    "Physical",
                    "Melee",
                    "Instant"
                ],
                "classesHtml": "Physical, Melee, Instant",
                "effects": [
                    {
                        "type": "damage",
                        "amount": 25,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageImmunity": true,
                            "ignoreAfflictionDamageImmunity": true,
                            "ignoreDamageReduction": true,
                            "fixedDamage": true
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "rage_infected_eye_gouge_bleed",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "harmfulBlind": true,
                            "afflictionDamage": true,
                            "fixedTurnEndDamage": true,
                            "ignoreDamageImmunity": true,
                            "ignoreAfflictionDamageImmunity": true,
                            "removeOnHealingEffect": true,
                            "turnEndDamage": 5,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "tooltipText": "This character's harmful skills randomly target the opposing team and they take 5 bleed damage next turn. Bleed cannot be ignored, increased, or reduced, and is removed by any healing effect."
                        }
                    }
                ]
            },
            {
                "id": "rage-infected-murderous-rage",
                "name": "Murderous Rage",
                "nameHtml": "Murderous Rage",
                "skillimage": "https://i.imgur.com/39yHcrF_d.jpeg?maxwidth=520&shape=thumb&fidelity=high",
                "url": "https://i.imgur.com/39yHcrF_d.jpeg?maxwidth=520&shape=thumb&fidelity=high",
                "skilldescription": "For 1 turn, one selected enemy cannot bring Rage Infected's health below 1 HP. While active. cannot be used while active.",
                "description": "For 1 turn, one selected enemy cannot bring Rage Infected's health below 1 HP. While active. cannot be used while active.",
                "descriptionHtml": "For 1 turn, one selected enemy cannot bring Rage Infected's health below 1 HP.<br>While active.<br> and cannot be used while active.",
                "energy": [
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 2,
                "cooldownHtml": "2",
                "classes": [
                    "Mental",
                    "Ranged",
                    "Instant",
                    "Invisible"
                ],
                "classesHtml": "Mental, Ranged, Instant, Invisible",
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "rage_infected_murderous_rage_guard",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "minimumHp": 1,
                            "copySelectedTargetKeyToKeys": [
                                "minimumHpFromSourceKey"
                            ],
                            "skillReplacements": {
                                "rage-infected-murderous-rage": "rage-infected-murderous-rage-active"
                            },
                            "tooltipText": "The selected enemy cannot reduce Rage Infected below 1 HP."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "rage_infected_murderous_rage_mark",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "onOwnerUseSkillTrigger": true,
                            "onOwnerUseSkillHarmfulOnly": true,
                            "onOwnerUseSkillApplyStatusToSourceOwner": {
                                "statusId": "rage_infected_murderous_rage_guard",
                                "duration": 1,
                                "metadata": {
                                    "minimumHp": 1,
                                    "copyOwnerKeyToKeys": [
                                        "minimumHpFromSourceKey"
                                    ],
                                    "skillReplacements": {
                                        "rage-infected-murderous-rage": "rage-infected-murderous-rage-active"
                                    },
                                    "tooltipText": "The selected enemy cannot reduce Rage Infected below 1 HP."
                                }
                            },
                            "onOwnerUseSkillApplyStatusToOwner": {
                                "statusId": "rage_infected_murderous_rage_bonus",
                                "duration": 99,
                                "metadata": {
                                    "infiniteDuration": true,
                                    "bonusDamageFromSourceCharacterId": "rage-infected",
                                    "bonusDamageFromSourceSkillsFlat": 5,
                                    "mergeNumericAddKeys": [
                                        "bonusDamageFromSourceSkillsFlat"
                                    ],
                                    "tooltipTextTemplate": "Rage Infected deals {bonusDamageFromSourceSkillsFlat} additional damage to this character."
                                }
                            },
                            "tooltipText": "If this character uses a skill, Rage Infected gains permanent bonus damage against them."
                        }
                    }
                ]
            },
            {
                "id": "rage-infected-relentless-pursuit",
                "name": "Relentless Pursuit",
                "nameHtml": "Relentless Pursuit",
                "skillimage": "https://i.imgur.com/osxi6DC_d.jpeg?maxwidth=520&shape=thumb&fidelity=high",
                "url": "https://i.imgur.com/osxi6DC_d.jpeg?maxwidth=520&shape=thumb&fidelity=high",
                "skilldescription": "For 3 turns, Rage Infected ignores enemy stun effects, reduces the cost of his skills by 1 random energy, but takes 10 additional non-affliction damage from enemy skills.",
                "description": "For 3 turns, Rage Infected ignores enemy stun effects, reduces the cost of his skills by 1 random energy, but takes 10 additional non-affliction damage from enemy skills.",
                "descriptionHtml": "For 3 turns, Rage Infected ignores enemy stun effects, reduces the cost of his skills by 1 random energy, but takes 10 additional non-affliction damage from enemy skills.",
                "energy": [
                    "Random"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 4,
                "cooldownHtml": "4",
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "classesHtml": "Physical, Instant",
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "rage_infected_relentless_pursuit",
                        "duration": 3,
                        "scope": "self",
                        "metadata": {
                            "cannotBeStunned": true,
                            "randomCostReduction": 1,
                            "bonusDamageFromSourceSkillsFlat": 10,
                            "bonusDamageFromSourceNonAfflictionOnly": true,
                            "bonusDamageFromSourceEnemyOnly": true,
                            "tooltipText": "Rage Infected ignores stuns, his skills cost 1 less random energy, and enemy skills deal 10 additional non-affliction damage to him."
                        }
                    }
                ]
            },
            {
                "id": "rage-infected-murderous-rage-active",
                "name": "Murderous Rage",
                "hiddenFromSelectionViewer": true,
                "actorCondition": {
                    "missingStatusId": "rage_infected_murderous_rage_guard"
                },
                "skillimage": "https://i.imgur.com/39yHcrF_d.jpeg?maxwidth=520&shape=thumb&fidelity=high",
                "skilldescription": "Murderous Rage is active.",
                "energy": [],
                "target": "",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Mental",
                    "Instant"
                ],
                "effects": []
            }
        ],
        "role": "Beserker",
        "roleCategory": "bruiser",
        "universe": "other"
    },
    {
        "id": "space-marine-infantry",
        "characterId": "space-marine-infantry",
        "name": "Pvt. Saunders",
        "nameHtml": "Space Marine Infantry",
        "facePicture": "https://i.imgur.com/Ch1wobl.png",
        "url": "https://i.imgur.com/Ch1wobl.png",
        "unlockRequirement": "None",
        "unlockRequirementHtml": "None",
        "characterdeescription": "A frontline shock trooper equipped with brutal anti-infantry weaponry and battlefield support tools, the Space Marine Infantry overwhelms enemies through sustained pressure and explosive area damage. Whether suppressing targets with disciplined rifle fire, burning entire teams with incendiary attacks, or shielding allies with emergency extraction protocols, this soldier turns every engagement into a warzone.",
        "description": "A frontline shock trooper equipped with brutal anti-infantry weaponry and battlefield support tools, the Space Marine Infantry overwhelms enemies through sustained pressure and explosive area damage. Whether suppressing targets with disciplined rifle fire, burning entire teams with incendiary attacks, or shielding allies with emergency extraction protocols, this soldier turns every engagement into a warzone.",
        "descriptionHtml": "A frontline shock trooper equipped with brutal anti-infantry weaponry and battlefield support tools, the Space Marine Infantry overwhelms enemies through sustained pressure and explosive area damage. Whether suppressing targets with disciplined rifle fire, burning entire teams with incendiary attacks, or shielding allies with emergency extraction protocols, this soldier turns every engagement into a warzone.",
        "skills": [
            {
                "id": "space-marine-infantry-m41a-pulse-rifle",
                "name": "M41A Pulse Rifle",
                "nameHtml": "M41A Pulse Rifle",
                "skillimage": "https://i.imgur.com/aqlogGB.png",
                "url": "https://i.imgur.com/aqlogGB.png",
                "skilldescription": "Deals 15 piercing damage to one enemy each turn for 3 turns. This skill is channeled and will end if Space Marine Infantry uses a new skill. While active, Grenade Launcher costs 1 random energy less.",
                "description": "Deals 15 piercing damage to one enemy each turn for 3 turns. This skill is channeled and will end if Space Marine Infantry uses a new skill. While active, Grenade Launcher costs 1 random energy less.",
                "descriptionHtml": "Deals 15 piercing damage to one enemy each turn for 3 turns.<br>This skill is channeled and will end if Space Marine Infantry uses a new skill.<br>While active, Grenade Launcher costs 1 random energy less.",
                "energy": [
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "cooldownHtml": "None",
                "classes": [
                    "Physical",
                    "Ranged",
                    "Channeled"
                ],
                "classesHtml": "Physical, Ranged, Channeled",
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "space_marine_infantry_m41a_pulse_rifle_channel",
                        "duration": 3,
                        "scope": "self",
                        "metadata": {
                            "ongoingClass": "channeled",
                            "skillCostOverridesBySkillId": {
                                "space-marine-infantry-grenade-launcher": {
                                    "random": 0
                                }
                            },
                            "tooltipText": "M41A Pulse Rifle is being channeled. Grenade Launcher costs 1 less random energy."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "space_marine_infantry_m41a_pulse_rifle_barrage",
                        "duration": 3,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "ongoingClass": "channeled",
                            "turnEndDamage": 15,
                            "triggerOnApply": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "ignoreTargetDamageReduction": true,
                            "ignoreTargetDestructibleDefense": true,
                            "tooltipText": "This character takes 15 piercing damage each turn from M41A Pulse Rifle."
                        }
                    }
                ]
            },
            {
                "id": "space-marine-infantry-grenade-launcher",
                "name": "Grenade Launcher",
                "nameHtml": "Grenade Launcher",
                "skillimage": "https://i.imgur.com/Auz9hYU.png",
                "url": "https://i.imgur.com/Auz9hYU.png",
                "skilldescription": "Deals 25 affliction damage to one enemy and reduces all their damage by 15 for 1 turn.",
                "description": "Deals 25 affliction damage to one enemy and reduces all their damage by 15 for 1 turn.",
                "descriptionHtml": "Deals 25 affliction damage to one enemy and reduces all their damage by 15 for 1 turn.",
                "energy": [
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 2,
                "cooldownHtml": "2",
                "classes": [
                    "Physical",
                    "Ranged",
                    "Instant",
                    "Affliction"
                ],
                "classesHtml": "Physical, Ranged, Instant, Affliction",
                "effects": [
                    {
                        "type": "damage",
                        "amount": 25,
                        "scope": "target",
                        "metadata": {
                            "afflictionDamage": true
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "space_marine_infantry_grenade_launcher_suppressed",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "damageDebuffFlat": 15,
                            "tooltipText": "This character deals 15 less damage."
                        }
                    }
                ]
            },
            {
                "id": "space-marine-infantry-flamethrower",
                "name": "Flamethrower",
                "nameHtml": "Flamethrower",
                "skillimage": "https://i.imgur.com/Y435B8s.png",
                "url": "https://i.imgur.com/Y435B8s.png",
                "skilldescription": "Deals 12 affliction damage to one enemy, 6 affliction damage to all other enemies, and reduces all their damage by 5 each turn for 3 turns. This skill is channeled and will end if Space Marine Infantry uses a new skill.",
                "description": "Deals 12 affliction damage to one enemy, 6 affliction damage to all other enemies, and reduces all their damage by 5 each turn for 3 turns. This skill is channeled and will end if Space Marine Infantry uses a new skill.",
                "descriptionHtml": "Deals 12 affliction damage to one enemy, 6 affliction damage to all other enemies, and reduces all their damage by 5 each turn for 3 turns.<br>This skill is channeled and will end if Space Marine Infantry uses a new skill.",
                "energy": [
                    "Bloodline"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "cooldownHtml": "None",
                "classes": [
                    "Energy",
                    "Ranged",
                    "Channeled",
                    "Affliction"
                ],
                "classesHtml": "Energy, Ranged, Channeled, Affliction",
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "space_marine_infantry_flamethrower_channel",
                        "duration": 3,
                        "scope": "self",
                        "metadata": {
                            "ongoingClass": "channeled",
                            "tooltipText": "Flamethrower is being channeled."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "space_marine_infantry_flamethrower_burn",
                        "duration": 3,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "ongoingClass": "channeled",
                            "turnEndDamage": 12,
                            "triggerOnApply": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "afflictionDamage": true,
                            "damageDebuffFlat": 5,
                            "tooltipText": "This character takes 12 affliction damage each turn and deals 5 less damage."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "space_marine_infantry_flamethrower_splash_burn",
                        "duration": 3,
                        "scope": "other-enemies",
                        "metadata": {
                            "harmful": true,
                            "ongoingClass": "channeled",
                            "turnEndDamage": 6,
                            "triggerOnApply": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "afflictionDamage": true,
                            "damageDebuffFlat": 5,
                            "tooltipText": "This character takes 6 affliction damage each turn and deals 5 less damage."
                        }
                    }
                ]
            },
            {
                "id": "space-marine-infantry-drop-ship",
                "name": "Drop Ship",
                "nameHtml": "Drop Ship",
                "skillimage": "https://i.imgur.com/euIXe6O.png",
                "url": "https://i.imgur.com/euIXe6O.png",
                "skilldescription": "For 1 turn, your entire team becomes invulnerable.",
                "description": "For 1 turn, your entire team becomes invulnerable.",
                "descriptionHtml": "For 1 turn, your entire team becomes invulnerable.",
                "energy": [
                    "Random",
                    "Random",
                    "Random"
                ],
                "target": "all-allies",
                "damage": 0,
                "cooldown": 4,
                "cooldownHtml": "4",
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "classesHtml": "Physical, Instant",
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "space_marine_infantry_drop_ship_invulnerable",
                        "duration": 1,
                        "scope": "all-allies",
                        "metadata": {
                            "invulnerable": true,
                            "tooltipText": "This character is invulnerable."
                        }
                    }
                ]
            }
        ],
        "role": "Damage",
        "universe": "other",
        "roleCategory": "damage"
    },
    {
        "id": "space-marine-medic",
        "characterId": "space-marine-medic",
        "name": "Lieutenant Seraphina Vale",
        "nameHtml": "Lieutenant Seraphina Vale",
        "facePicture": "https://i.imgur.com/04OvCP9.jpeg",
        "url": "https://i.imgur.com/04OvCP9.jpeg",
        "unlockRequirement": "None",
        "unlockRequirementHtml": "None",
        "characterdeescription": "Lieutenant Seraphina Vale is a battlefield surgeon forged in the endless wars between the outer colonies and hostile alien forces. Calm under pressure and feared by enemy commanders, she serves on the front lines beside assault squads, patching wounds while laying down suppressive fire. Soldiers call her The Guardian Angel of the Void because no marine under her watch is ever left behind.",
        "description": "Lieutenant Seraphina Vale is a battlefield surgeon forged in the endless wars between the outer colonies and hostile alien forces. Calm under pressure and feared by enemy commanders, she serves on the front lines beside assault squads, patching wounds while laying down suppressive fire. Soldiers call her The Guardian Angel of the Void because no marine under her watch is ever left behind.",
        "descriptionHtml": "Lieutenant Seraphina Vale is a battlefield surgeon forged in the endless wars between the outer colonies and hostile alien forces.<br>Calm under pressure and feared by enemy commanders, she patches wounds while laying down suppressive fire.<br>Soldiers call her The Guardian Angel of the Void because no marine under her watch is ever left behind.",
        "startStatuses": [
            {
                "statusId": "seraphina_vale_battlefield_triage_passive",
                "sourceSkillId": "space-marine-medic-passive-battlefield-triage",
                "duration": 999,
                "metadata": {
                    "infiniteDuration": true,
                    "hideTooltip": true,
                    "onTeamMemberDamageTakenApplyStatusToOwner": {
                        "statusId": "seraphina_vale_battlefield_triage_ready",
                        "duration": 1,
                        "allyOnly": true,
                        "enemyOnly": true,
                        "targetCurrentHpAtMost": 29,
                        "targetPreviousHpAtLeast": 30,
                        "metadata": {
                            "additionalRandomChakraPerTurn": 1,
                            "healingBonusFlat": 10,
                            "tooltipText": "Battlefield Triage is active. Seraphina gains 1 additional random chakra next turn and her healing is increased by 10."
                        }
                    }
                }
            }
        ],
        "skills": [
            {
                "id": "space-marine-medic-pump-shotgun",
                "name": "Pump Shotgun",
                "nameHtml": "Pump Shotgun",
                "skillimage": "https://i.imgur.com/qu9wKKN.png",
                "url": "https://i.imgur.com/qu9wKKN.png",
                "skilldescription": "Deals 20 piercing damage to one enemy and makes them bleed for 3 bleed damage each turn for 4 turns. Bleed cannot be ignored, increased, or reduced, and is removed by any healing effect. After every 2 uses, Pump Shotgun reloads and is disabled for 1 turn.",
                "description": "Deals 20 piercing damage to one enemy and makes them bleed for 3 bleed damage each turn for 4 turns. Bleed cannot be ignored, increased, or reduced, and is removed by any healing effect. After every 2 uses, Pump Shotgun reloads and is disabled for 1 turn.",
                "descriptionHtml": "Deals 20 piercing damage to one enemy.<br>Makes them bleed for 3 bleed damage each turn for 4 turns.<br>Bleed cannot be ignored, increased, or reduced, and is removed by any healing effect.<br>After every 2 uses, Pump Shotgun reloads and is disabled for 1 turn.",
                "energy": [
                    "Taijutsu"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "cooldownHtml": "None",
                "metadata": {
                    "cooldownAfterEveryUses": {
                        "interval": 2,
                        "turns": 1
                    }
                },
                "classes": [
                    "Physical",
                    "Ranged",
                    "Instant"
                ],
                "classesHtml": "Physical, Ranged, Instant",
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
                        "statusId": "seraphina_vale_pump_shotgun_buckshot",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "damageDebuffFlat": 5,
                            "turnDurationAnchor": "source_turn",
                            "tooltipText": "Buckshot damage reduces this character's damage by 5."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "seraphina_vale_pump_shotgun_bleed",
                        "duration": 4,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "afflictionDamage": true,
                            "fixedTurnEndDamage": true,
                            "ignoreDamageImmunity": true,
                            "ignoreAfflictionDamageImmunity": true,
                            "removeOnHealingEffect": true,
                            "turnEndDamage": 3,
                            "turnDurationAnchor": "source_turn",
                            "tooltipText": "This character bleeds for 3 bleed damage each turn. Bleed cannot be ignored, increased, or reduced, and is removed by any healing effect."
                        }
                    }
                ]
            },
            {
                "id": "space-marine-medic-marking-flares",
                "name": "Marking Flares",
                "nameHtml": "Marking Flares",
                "skillimage": "https://i.imgur.com/uJQI6Ul.png",
                "url": "https://i.imgur.com/uJQI6Ul.png",
                "skilldescription": "Marks one enemy for 3 turns. Marked enemies take 5 additional non-affliction damage from all attacks and receive 100% less healing. This may only be used 3 times.",
                "description": "Marks one enemy for 3 turns. Marked enemies take 5 additional non-affliction damage from all attacks and receive 100% less healing. This may only be used 3 times.",
                "descriptionHtml": "Marks one enemy for 3 turns.<br>Marked enemies take 5 additional non-affliction damage from all attacks and receive 100% less healing.<br>This may only be used 3 times.",
                "energy": [
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "cooldownHtml": "None",
                "maxUses": 3,
                "classes": [
                    "Physical",
                    "Ranged",
                    "Instant"
                ],
                "classesHtml": "Physical, Ranged, Instant",
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "seraphina_vale_marking_flares_mark",
                        "duration": 3,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "damageTakenBonusFlat": 5,
                            "healReceivedMultiplier": 0,
                            "tooltipText": "This character takes 5 additional non-affliction damage from all attacks and cannot be healed."
                        }
                    }
                ]
            },
            {
                "id": "space-marine-medic-emergency-medical-station",
                "name": "Emergency Medical Station",
                "nameHtml": "Emergency Medical Station",
                "skillimage": "https://i.imgur.com/gWp1vfu.png",
                "url": "https://i.imgur.com/gWp1vfu.png",
                "skilldescription": "Deploys a medical station on herself or one ally, healing them for 25 HP each turn for 2 turns. Battlefield Triage increases this healing by 10. This may only be used 2 times.",
                "description": "Deploys a medical station on herself or one ally, healing them for 25 HP each turn for 2 turns. Battlefield Triage increases this healing by 10. This may only be used 2 times.",
                "descriptionHtml": "Deploys a medical station on herself or one ally, healing them for 25 HP each turn for 2 turns.<br>Battlefield Triage increases this healing by 10.<br>This may only be used 2 times.",
                "energy": [
                    "Genjutsu",
                    "Random"
                ],
                "target": "self-or-single-ally",
                "damage": 0,
                "cooldown": 0,
                "cooldownHtml": "None",
                "maxUses": 2,
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "classesHtml": "Physical, Instant",
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "seraphina_vale_emergency_medical_station",
                        "duration": 2,
                        "scope": "target",
                        "metadata": {
                            "turnEndHealFlat": 25,
                            "tooltipText": "This character is healed by Emergency Medical Station each turn."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "seraphina_vale_battlefield_triage_healing_boost",
                        "duration": 2,
                        "scope": "target",
                        "condition": {
                            "scope": "self",
                            "statusId": "seraphina_vale_battlefield_triage_ready"
                        },
                        "metadata": {
                            "turnEndHealFlat": 10,
                            "tooltipText": "Battlefield Triage increases Emergency Medical Station healing by 10."
                        }
                    }
                ]
            },
            {
                "id": "space-marine-medic-motion-tracker",
                "name": "Motion Tracker",
                "nameHtml": "Motion Tracker",
                "skillimage": "https://i.imgur.com/3IZPq6V.png",
                "url": "https://i.imgur.com/3IZPq6V.png",
                "skilldescription": "For 2 turns, all enemies cannot become invulnerable or reduce incoming damage.",
                "description": "For 2 turns, all enemies cannot become invulnerable or reduce incoming damage.",
                "descriptionHtml": "For 2 turns, all enemies cannot become invulnerable or reduce incoming damage.",
                "energy": [],
                "target": "all-enemy",
                "damage": 0,
                "cooldown": 4,
                "cooldownHtml": "4",
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "classesHtml": "Physical, Instant",
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "seraphina_vale_motion_tracker_scanned",
                        "duration": 2,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "cannotBecomeInvulnerable": true,
                            "cannotReduceDamage": true,
                            "tooltipText": "This character cannot become invulnerable or reduce incoming damage."
                        }
                    }
                ]
            },
            {
                "id": "space-marine-medic-passive-battlefield-triage",
                "name": "Passive: Battlefield Triage",
                "nameHtml": "Passive: Battlefield Triage",
                "skillimage": "https://i.imgur.com/Ga0m3ad.png",
                "url": "https://i.imgur.com/Ga0m3ad.png",
                "skilldescription": "Whenever an ally falls below 30 HP from enemy damage, Seraphina gains 1 additional random chakra on her next turn and her healing is increased by 10 for 1 turn.",
                "description": "Whenever an ally falls below 30 HP from enemy damage, Seraphina gains 1 additional random chakra on her next turn and her healing is increased by 10 for 1 turn.",
                "descriptionHtml": "Whenever an ally falls below 30 HP from enemy damage, Seraphina gains 1 additional random chakra on her next turn and her healing is increased by 10 for 1 turn.",
                "energy": [],
                "target": "",
                "damage": 0,
                "cooldown": 0,
                "cooldownHtml": "Passive",
                "classes": [
                    "Passive",
                    "Instant"
                ],
                "classesHtml": "Passive, Instant"
            }
        ],
        "role": "Frontline Support",
        "universe": "comic-arena",
        "roleCategory": "support"
    },
    {
        "id": "space-marine-smartgunner",
        "characterId": "space-marine-smartgunner",
        "name": "Sergeant William Hillford",
        "facePicture": "https://i.imgur.com/xhy4DuC.png",
        "characterdeescription": "A hardened urban warfare sergeant who specializes in locking down weakened enemies and systematically eliminating anyone left exposed on the battlefield. William Hillford controls the pace of combat through tactical suppression, relentless target marking, and brutal close-range enforcement, turning vulnerable opponents into guaranteed kills while protecting himself from retaliation.",
        "skills": [
            {
                "id": "space-marine-smartgunner-smartgun-lock-on",
                "name": "Smartgun Lock-On",
                "nameHtml": "Smartgun Lock-On",
                "skillimage": "https://i.imgur.com/Oq1tldJ.png",
                "url": "https://i.imgur.com/Oq1tldJ.png",
                "skilldescription": "For 3 turns, the current lowest health enemy is locked onto each turn and marked for 1 turn. This skill has no cooldown and can be cancelled by using it again while active.",
                "description": "For 3 turns, the current lowest health enemy is locked onto each turn and marked for 1 turn. This skill has no cooldown and can be cancelled by using it again while active.",
                "descriptionHtml": "For 3 turns, the current lowest health enemy is locked onto each turn and marked for 1 turn.<br>This skill has no cooldown and can be cancelled by using it again while active.",
                "energy": [],
                "target": "self",
                "damage": 0,
                "cooldown": 0,
                "cooldownHtml": "None",
                "classes": [
                    "Mental",
                    "Ranged",
                    "Instant",
                    "Bypassing",
                    "Uncounterable",
                    "Unreflectable"
                ],
                "classesHtml": "Mental, Ranged, Instant, Bypassing, Uncounterable, Unreflectable",
                "ignoreInvulnerability": true,
                "cannotBeCountered": true,
                "cannotBeReflected": true,
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "sergeant_william_hillford_smartgun_lock_on_active",
                        "duration": 3,
                        "scope": "self",
                        "condition": {
                            "scope": "self",
                            "missingStatusId": "sergeant_william_hillford_smartgun_lock_on_active"
                        },
                        "metadata": {
                            "turnEndApplyStatusToRandomEnemy": {
                                "statusId": "sergeant_william_hillford_smartgun_lock_on_mark",
                                "duration": 1,
                                "targetStrategy": "lowest-hp",
                                "trackingMetadataKey": "_hillfordSmartgunLockTarget",
                                "metadata": {
                                    "harmful": true,
                                    "tooltipText": "This character is marked by Smartgun Lock-On."
                                }
                            },
                            "tooltipText": "At the end of each turn, the lowest health enemy is marked by Smartgun Lock-On."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "sergeant_william_hillford_smartgun_lock_on_cancel_helper",
                        "duration": 0,
                        "scope": "self",
                        "condition": {
                            "scope": "self",
                            "statusId": "sergeant_william_hillford_smartgun_lock_on_active"
                        },
                        "metadata": {
                            "removeStatusIdsOnApply": [
                                "sergeant_william_hillford_smartgun_lock_on_active",
                                "sergeant_william_hillford_smartgun_lock_on_cancel_helper"
                            ],
                            "hideTooltip": true
                        }
                    }
                ]
            },
            {
                "id": "space-marine-smartgunner-smartgunner-spray",
                "name": "Smartgunner Spray",
                "nameHtml": "Smartgunner Spray",
                "skillimage": "https://i.imgur.com/2hGgaIj.png",
                "url": "https://i.imgur.com/2hGgaIj.png",
                "skilldescription": "Deals 27 piercing damage to a new random enemy every turn for 3 turns. This skill stacks. If a target is marked by Smartgun Lock-On, this will target them instead and ignore their invulnerability. This executes any enemy that falls to 5 HP or below. After use, this costs 2 random energy for 1 turn.",
                "description": "Deals 27 piercing damage to a new random enemy every turn for 3 turns. This skill stacks. If a target is marked by Smartgun Lock-On, this will target them instead and ignore their invulnerability. This executes any enemy that falls to 5 HP or below. After use, this costs 2 random energy for 1 turn.",
                "descriptionHtml": "Deals 27 piercing damage to a new random enemy every turn for 3 turns.<br>This skill stacks.<br>If a target is marked by Smartgun Lock-On, this will target them instead and ignore their invulnerability.<br>This executes any enemy that falls to 5 HP or below.<br>After use, this costs 2 random energy for 1 turn.",
                "energy": [
                    "Taijutsu",
                    "Genjutsu"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 0,
                "cooldownHtml": "None",
                "classes": [
                    "Physical",
                    "Ranged",
                    "Control"
                ],
                "classesHtml": "Physical, Ranged, Control",
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "sergeant_william_hillford_smartgunner_spray_active",
                        "duration": 3,
                        "scope": "self",
                        "metadata": {
                            "allowDuplicateStatusInstances": true,
                            "turnEndRandomEnemyDamage": 27,
                            "turnEndRandomEnemySkillClasses": [
                                "Physical",
                                "Ranged",
                                "Control"
                            ],
                            "turnEndRandomEnemyIgnoreDamageReduction": true,
                            "turnEndRandomEnemyIgnoreDestructibleDefense": true,
                            "turnEndRandomEnemyMustChangeTarget": true,
                            "preferEnemyWithStatusId": "sergeant_william_hillford_smartgun_lock_on_mark",
                            "turnEndRandomEnemyIgnoreDamageImmunityIfPreferredStatus": true,
                            "turnEndRandomEnemyExecuteBelowHpThreshold": 5,
                            "tooltipText": "Every turn, this character deals 27 piercing damage to a new random enemy. Smartgun Lock-On marks are targeted first."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "sergeant_william_hillford_smartgunner_spray_random_cost",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "skillCostOverridesBySkillId": {
                                "space-marine-smartgunner-smartgunner-spray": {
                                    "energy": [
                                        "Random",
                                        "Random"
                                    ]
                                }
                            },
                            "tooltipText": "Smartgunner Spray costs 2 random energy for 1 turn."
                        }
                    }
                ]
            },
            {
                "id": "space-marine-smartgunner-flashlight-attachment",
                "name": "Flashlight Attachment",
                "nameHtml": "Flashlight Attachment",
                "skillimage": "https://i.imgur.com/pqhEl50.png",
                "url": "https://i.imgur.com/pqhEl50.png",
                "skilldescription": "Immediately ends all active counter and reflect skills being used by the enemy team. For 2 turns, all enemy skills become visible.",
                "description": "Immediately ends all active counter and reflect skills being used by the enemy team. For 2 turns, all enemy skills become visible.",
                "descriptionHtml": "Immediately ends all active counter and reflect skills being used by the enemy team.<br>For 2 turns, all enemy skills become visible.<br>",
                "energy": [
                    "Genjutsu"
                ],
                "target": "all-enemy",
                "damage": 0,
                "cooldown": 3,
                "cooldownHtml": "3",
                "classes": [
                    "Physical",
                    "Ranged",
                    "Instant",
                    "Uncounterable",
                    "Unreflectable"
                ],
                "classesHtml": "Physical, Ranged, Instant, Uncounterable, Unreflectable",
                "cannotBeCountered": true,
                "cannotBeReflected": true,
                "effects": [
                    {
                        "type": "cleanse_statuses",
                        "scope": "all-enemy",
                        "count": 0,
                        "metadataAny": [
                            "counterCancelsSkill",
                            "reflectNextIncomingSkill",
                            "reflectDamagePercent",
                            "reflectFirstHarmfulDamage"
                        ]
                    },
                    {
                        "type": "apply_status",
                        "statusId": "sergeant_william_hillford_flashlight_attachment_revealed",
                        "duration": 2,
                        "scope": "all-enemy",
                        "metadata": {
                            "harmful": true,
                            "tooltipText": "This character's hidden skills are revealed by Flashlight Attachment."
                        }
                    }
                ]
            },
            {
                "id": "space-marine-smartgunner-smartgun-block",
                "name": "Smartgun Block",
                "nameHtml": "Smartgun Block",
                "skillimage": "https://i.imgur.com/qGHbWEk.png",
                "url": "https://i.imgur.com/qGHbWEk.png",
                "skilldescription": "This skill makes Sergeant Hillford invulnerable for 1 turn.",
                "description": "This skill makes Sergeant Hillford invulnerable for 1 turn.",
                "descriptionHtml": "This skill makes Sergeant Hillford invulnerable for 1 turn.",
                "energy": [
                    "Random"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 4,
                "cooldownHtml": "4",
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "classesHtml": "Physical, Instant",
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "sergeant_william_hillford_smartgun_block_invulnerable",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "invulnerable": true,
                            "tooltipText": "Sergeant Hillford is invulnerable."
                        }
                    }
                ]
            }
        ],
        "role": "Control / Executioner",
        "universe": "alien",
        "roleCategory": "control"
    },
    {
        "id": "predator-stalker",
        "characterId": "predator-stalker",
        "name": "Predator Stalker",
        "facePicture": "https://i.imgur.com/1NssQOv_d.jpeg?maxwidth=520&shape=thumb&fidelity=high",
        "characterdeescription": "Predator Stalker is a calculated hunter who chains multi-turn damage and lethal burst through stealth. He excels at softening multiple targets before executing a priority enemy while remaining highly evasive.",
        "startStatuses": [
            {
                "statusId": "predator_stalker_trophy_hunter_passive",
                "sourceSkillId": "predator-stalker-passive-trophy-hunter",
                "duration": 99,
                "metadata": {
                    "infiniteDuration": true,
                    "onOwnerKillTargetRelation": "enemy",
                    "onOwnerKillGainChakra": {
                        "chakraType": "random",
                        "amount": 1
                    },
                    "tooltipText": "If Predator Stalker kills an enemy, he gains 1 random energy."
                }
            }
        ],
        "skills": [
            {
                "id": "predator-stalker-yautja-shuriken",
                "name": "Yautja Shuriken",
                "skillimage": "https://i.imgur.com/v2YOpMA_d.jpeg?maxwidth=520&shape=thumb&fidelity=high",
                "skilldescription": "Deals 15 piercing damage to one enemy. At the end of Predator Stalker's next turn, it bounces to the nearest other enemy and deals 10 piercing damage. At the end of the following turn, it bounces to the nearest other enemy and deals 5 piercing damage.",
                "energy": [
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Physical",
                    "Ranged",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "damage",
                        "amount": 15,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageReduction": true
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "predator_stalker_yautja_shuriken_bounce_one",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "hideTooltip": true,
                            "copySelectedTargetKeyToKeys": [
                                "_lastRandomStatusEnemyKey"
                            ],
                            "turnEndEffectsToRandomEnemy": [
                                {
                                    "targetStrategy": "nearest-other-enemy",
                                    "mustChangeTarget": true,
                                    "effects": [
                                        {
                                            "type": "damage",
                                            "amount": 10,
                                            "metadata": {
                                                "ignoreDamageReduction": true,
                                                "skillClasses": [
                                                    "physical",
                                                    "ranged"
                                                ]
                                            }
                                        },
                                        {
                                            "type": "apply_status",
                                            "statusId": "predator_stalker_yautja_shuriken_ricochet_marker",
                                            "duration": 1,
                                            "metadata": {
                                                "harmful": true,
                                                "tooltipText": "Yautja Shuriken ricocheted to this character."
                                            }
                                        }
                                    ]
                                }
                            ],
                            "onExpireApplyStatusToSelf": {
                                "statusId": "predator_stalker_yautja_shuriken_bounce_two",
                                "duration": 1,
                                "inheritSourceMetadata": true,
                                "metadata": {
                                    "hideTooltip": true,
                                    "onExpireApplyStatusToSelf": null,
                                    "copySelectedTargetKeyToKeys": [],
                                    "turnEndEffectsToRandomEnemy": [
                                        {
                                            "targetStrategy": "nearest-other-enemy",
                                            "mustChangeTarget": true,
                                            "effects": [
                                                {
                                                    "type": "damage",
                                                    "amount": 5,
                                                    "metadata": {
                                                        "ignoreDamageReduction": true,
                                                        "skillClasses": [
                                                            "physical",
                                                            "ranged"
                                                        ]
                                                    }
                                                },
                                                {
                                                    "type": "apply_status",
                                                    "statusId": "predator_stalker_yautja_shuriken_ricochet_marker",
                                                    "duration": 1,
                                                    "metadata": {
                                                        "harmful": true,
                                                        "tooltipText": "Yautja Shuriken ricocheted to this character."
                                                    }
                                                }
                                            ]
                                        }
                                    ]
                                }
                            }
                        }
                    }
                ]
            },
            {
                "id": "predator-stalker-bleeder-spear",
                "name": "Bleeder Spear",
                "skillimage": "https://i.imgur.com/wcV1Ubk_d.jpeg?maxwidth=520&shape=thumb&fidelity=high",
                "skilldescription": "Deals 10 piercing damage to one enemy. That enemy takes 10 bleed damage at the end of each of Predator Stalker's turns permanently. This effect stacks. Bleed cannot be ignored, increased, or reduced, and is removed by any healing effect.",
                "energy": [
                    "Random",
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 1,
                "classes": [
                    "Physical",
                    "Ranged",
                    "Instant"
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
                        "statusId": "predator_stalker_bleeder_spear_dot",
                        "duration": 99,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "infiniteDuration": true,
                            "ongoingClass": "action",
                            "turnEndDamage": 10,
                            "afflictionDamage": true,
                            "fixedTurnEndDamage": true,
                            "ignoreDamageImmunity": true,
                            "ignoreAfflictionDamageImmunity": true,
                            "removeOnHealingEffect": true,
                            "triggerOnApply": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "mergeNumericAddKeys": [
                                "turnEndDamage"
                            ],
                            "tooltipTextTemplate": "This character takes {turnEndDamage} bleed damage at the end of each of Predator Stalker's turns. Bleed cannot be ignored, increased, or reduced, and is removed by any healing effect."
                        }
                    }
                ]
            },
            {
                "id": "predator-stalker-cloaking-assassination",
                "name": "Cloaking Assassination",
                "skillimage": "https://i.imgur.com/uDof8fR_d.jpeg?maxwidth=520&shape=thumb&fidelity=high",
                "skilldescription": "Requires Cloaking Tech. Deals 50 piercing damage to one enemy.",
                "energy": [
                    "Genjutsu",
                    "Genjutsu"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "ignoreInvulnerability": true,
                "actorCondition": {
                    "statusId": "predator_stalker_cloaking_tech_active"
                },
                "classes": [
                    "Physical",
                    "Melee",
                    "Instant",
                    "Bypassing"
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
                ],
                "classesHtml": "Physical, Melee, Instant, Bypassing"
            },
            {
                "id": "predator-stalker-cloaking-tech",
                "name": "Cloaking Tech",
                "skillimage": "https://i.imgur.com/NcKmrHh_d.jpeg?maxwidth=520&shape=thumb&fidelity=high",
                "skilldescription": "For 1 turn, Predator Stalker gains 90% evasion and can use Cloaking Assassination. If Cloaking Assassination kills an enemy while this is active, this effect lasts 1 additional turn.",
                "energy": [
                    "Genjutsu"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 2,
                "classes": [
                    "Energy",
                    "Instant"
                ],
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "predator_stalker_cloaking_tech_active",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "evadeChancePercent": 90,
                            "onOwnerKillTargetRelation": "enemy",
                            "onOwnerKillSourceSkillIdsAny": [
                                "predator-stalker-cloaking-assassination"
                            ],
                            "onOwnerKillApplyStatusToSelf": {
                                "statusId": "predator_stalker_cloaking_tech_active",
                                "duration": 2,
                                "metadata": {
                                    "evadeChancePercent": 90,
                                    "onOwnerKillTargetRelation": "enemy",
                                    "onOwnerKillSourceSkillIdsAny": [
                                        "predator-stalker-cloaking-assassination"
                                    ],
                                    "tooltipText": "Predator Stalker has 90% evasion and can use Cloaking Assassination."
                                }
                            },
                            "tooltipText": "Predator Stalker has 90% evasion and can use Cloaking Assassination."
                        }
                    }
                ]
            },
            {
                "id": "predator-stalker-passive-trophy-hunter",
                "name": "Passive: Trophy Hunter",
                "skillimage": "https://i.imgur.com/0H3OgJV_d.jpeg?maxwidth=520&shape=thumb&fidelity=high",
                "skilldescription": "If Predator Stalker kills an enemy, he gains 1 random energy.",
                "energy": [],
                "target": "",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Passive",
                    "Instant"
                ]
            }
        ],
        "role": "Evasion Assassin",
        "roleCategory": "assassin",
        "universe": "other"
    },
    {
        "id": "sinestro",
        "characterId": "sinestro",
        "name": "Sinestro",
        "nameHtml": "Sinestro",
        "facePicture": "https://i.imgur.com/v9pUryk.jpeg",
        "url": "https://i.imgur.com/v9pUryk.jpeg",
        "unlockRequirement": "None",
        "unlockRequirementHtml": "None",
        "characterdeescription": "Sinestro is a fear-based pressure fighter who weakens enemies over time, punishes healing, and builds escalating damage reduction through his Yellow Lantern Ring.",
        "description": "Sinestro is a fear-based pressure fighter who weakens enemies over time, punishes healing, and builds escalating damage reduction through his Yellow Lantern Ring.",
        "descriptionHtml": "Sinestro is a fear-based pressure fighter who weakens enemies over time, punishes healing, and builds escalating damage reduction through his Yellow Lantern Ring.",
        "startStatuses": [
            {
                "statusId": "sinestro_yellow_lantern_ring_passive",
                "duration": 99,
                "sourceSkillId": "sinestro-passive-yellow-lantern-ring",
                "metadata": {
                    "infiniteDuration": true,
                    "lanternPassiveVisual": "yellow",
                    "onOwnerUseSkillTrigger": true,
                    "persistOnOwnerUseSkillTrigger": true,
                    "onOwnerUseSkillApplyStatusToEnemies": {
                        "statusId": "sinestro_yellow_lantern_ring_fear",
                        "duration": 99,
                        "sourceSkillId": "sinestro-passive-yellow-lantern-ring",
                        "metadata": {
                            "harmful": true,
                            "infiniteDuration": true,
                            "lanternEffectVisual": "yellow",
                            "sinestroFearStacks": 1,
                            "NonAfflictionDamageDebuff": 1,
                            "mergeNumericAddKeys": [
                                "sinestroFearStacks",
                                "NonAfflictionDamageDebuff"
                            ],
                            "tooltipTextTemplate": "This character deals {NonAfflictionDamageDebuff} less non-affliction damage from Yellow Lantern Ring."
                        }
                    },
                    "tooltipText": "Whenever Sinestro uses a skill, every enemy gains 1 Yellow Lantern Ring stack."
                }
            }
        ],
        "skills": [
            {
                "id": "sinestro-terrifying-crash",
                "name": "Terrifying Crash",
                "nameHtml": "Terrifying Crash",
                "skillimage": "https://i.imgur.com/HPxFTX3.jpeg",
                "url": "https://i.imgur.com/HPxFTX3.jpeg",
                "skilldescription": "Deals 30 damage to one enemy and increases their cooldowns by 2 for 1 turn.",
                "description": "Deals 30 damage to one enemy and increases their cooldowns by 2 for 1 turn.",
                "descriptionHtml": "Deals 30 damage to one enemy and increases their cooldowns by 2 for 1 turn.",
                "energy": [
                    "Taijutsu",
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "cooldownHtml": "None",
                "classes": [
                    "Energy",
                    "Ranged",
                    "Instant"
                ],
                "classesHtml": "Energy, Ranged, Instant",
                "effects": [
                    {
                        "type": "damage",
                        "amount": 30,
                        "scope": "target"
                    },
                    {
                        "type": "modify_cooldowns",
                        "operation": "add",
                        "amount": 2,
                        "includeAllCharacterSkills": true,
                        "scope": "target",
                        "metadata": {
                            "harmful": true
                        }
                    }
                ]
            },
            {
                "id": "sinestro-dreadful-scorpion",
                "name": "Dreadful Scorpion",
                "nameHtml": "Dreadful Scorpion",
                "skillimage": "https://i.imgur.com/q4a1X6O.png",
                "url": "https://i.imgur.com/q4a1X6O.png",
                "skilldescription": "Deals 25 piercing damage to one enemy, then paralyzes their cooldowns and makes them ignore healing effects for 1 turn. The other enemies are dealt 10 piercing damage.",
                "description": "Deals 25 piercing damage to one enemy, then paralyzes their cooldowns and makes them ignore healing effects for 1 turn. The other enemies are dealt 10 piercing damage.",
                "descriptionHtml": "Deals 25 piercing damage to one enemy, then paralyzes their cooldowns and makes them ignore healing effects for 1 turn.<br>The other enemies are dealt 10 piercing damage.",
                "energy": [
                    "Genjutsu",
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "cooldownHtml": "None",
                "classes": [
                    "Energy",
                    "Ranged",
                    "Instant"
                ],
                "classesHtml": "Energy, Ranged, Instant",
                "effects": [
                    {
                        "type": "damage",
                        "amount": 25,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageReduction": true
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "sinestro_dreadful_scorpion_paralysis",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "freezeCooldowns": true,
                            "healReceivedMultiplier": 0,
                            "tooltipText": "This character's cooldowns are paralyzed and they ignore healing effects."
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 10,
                        "scope": "other-enemies",
                        "metadata": {
                            "ignoreDamageReduction": true
                        }
                    }
                ]
            },
            {
                "id": "sinestro-scary-dragon",
                "name": "Scary Dragon",
                "nameHtml": "Scary Dragon",
                "skillimage": "https://i.imgur.com/OTLfxav.jpeg",
                "url": "https://i.imgur.com/OTLfxav.jpeg",
                "skilldescription": "Deals 10 damage to the enemy team for 4 turns and applies a stack of 'Passive: Yellow Lantern Ring' each turn.",
                "description": "Deals 10 damage to the enemy team for 4 turns and applies a stack of 'Passive: Yellow Lantern Ring' each turn.",
                "descriptionHtml": "Deals 10 damage to the enemy team for 4 turns and applies a stack of 'Passive: Yellow Lantern Ring' each turn.",
                "energy": [
                    "Taijutsu",
                    "Genjutsu"
                ],
                "target": "all-enemy",
                "damage": 0,
                "cooldown": 4,
                "cooldownHtml": "4",
                "classes": [
                    "Energy",
                    "Ranged",
                    "Action"
                ],
                "classesHtml": "Energy, Ranged, Action",
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "sinestro_scary_dragon",
                        "duration": 4,
                        "scope": "all-enemy",
                        "metadata": {
                            "harmful": true,
                            "ongoingClass": "action",
                            "turnEndDamage": 10,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "turnEndApplyStatusToSelf": {
                                "statusId": "sinestro_yellow_lantern_ring_fear",
                                "duration": 99,
                                "metadata": {
                                    "harmful": true,
                                    "infiniteDuration": true,
                                    "sinestroFearStacks": 1,
                                    "NonAfflictionDamageDebuff": 1,
                                    "mergeNumericAddKeys": [
                                        "sinestroFearStacks",
                                        "NonAfflictionDamageDebuff"
                                    ],
                                    "tooltipTextTemplate": "This character deals {NonAfflictionDamageDebuff} less non-affliction damage from Yellow Lantern Ring."
                                }
                            },
                            "tooltipText": "This character takes 10 damage each Sinestro turn and gains Yellow Lantern Ring stacks."
                        }
                    }
                ]
            },
            {
                "id": "sinestro-fear-the-reaper",
                "name": "Fear the Reaper",
                "nameHtml": "Fear the Reaper",
                "skillimage": "https://i.imgur.com/cImcBvC.png",
                "url": "https://i.imgur.com/cImcBvC.png",
                "skilldescription": "Sinestro conjures an avatar of death to harvest the weak. Deals 10 damage to a single enemy. This attack deals an additional 5 damage for every stack of 'Passive: Yellow Lantern Ring' currently applied to the target.",
                "description": "Sinestro conjures an avatar of death to harvest the weak. Deals 10 damage to a single enemy. This attack deals an additional 5 damage for every stack of 'Passive: Yellow Lantern Ring' currently applied to the target.",
                "descriptionHtml": "Sinestro conjures an avatar of death to harvest the weak.<br>Deals 10 damage to a single enemy.<br>This attack deals an additional 5 damage for every stack of 'Passive: Yellow Lantern Ring' currently applied to the target.",
                "energy": [],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 3,
                "cooldownHtml": "3",
                "ignoreInvulnerability": true,
                "classes": [
                    "Energy",
                    "Ranged",
                    "Instant",
                    "Bypassing"
                ],
                "classesHtml": "Energy, Ranged, Instant, Bypassing",
                "effects": [
                    {
                        "type": "damage",
                        "amount": 10,
                        "scope": "target",
                        "metadata": {
                            "bonusFromStatusMetadataThresholds": {
                                "scope": "target",
                                "statusId": "sinestro_yellow_lantern_ring_fear",
                                "metadataKey": "sinestroFearStacks",
                                "thresholds": [
                                    {
                                        "atLeast": 20,
                                        "bonus": 100
                                    },
                                    {
                                        "atLeast": 15,
                                        "bonus": 75
                                    },
                                    {
                                        "atLeast": 10,
                                        "bonus": 50
                                    },
                                    {
                                        "atLeast": 5,
                                        "bonus": 25
                                    },
                                    {
                                        "atLeast": 4,
                                        "bonus": 20
                                    },
                                    {
                                        "atLeast": 3,
                                        "bonus": 15
                                    },
                                    {
                                        "atLeast": 2,
                                        "bonus": 10
                                    },
                                    {
                                        "atLeast": 1,
                                        "bonus": 5
                                    }
                                ]
                            }
                        }
                    }
                ]
            },
            {
                "id": "sinestro-passive-yellow-lantern-ring",
                "name": "Passive: Yellow Lantern Ring",
                "nameHtml": "Passive: Yellow Lantern Ring",
                "skillimage": "https://i.imgur.com/iubF9pw.png",
                "url": "https://i.imgur.com/iubF9pw.png",
                "skilldescription": "Every time Sinestro uses a new skill, every targetable enemy has their damage reduced by 1. If an enemy dies, all other enemies have their damage reduced by 3.",
                "description": "Every time Sinestro uses a new skill, every targetable enemy has their damage reduced by 1. If an enemy dies, all other enemies have their damage reduced by 3.",
                "descriptionHtml": "Every time Sinestro uses a new skill, every targetable enemy has their damage reduced by 1.<br>If an enemy dies, all other enemies have their damage reduced by 3.",
                "energy": [],
                "target": "",
                "damage": 0,
                "cooldown": 0,
                "cooldownHtml": "Passive",
                "classes": [
                    "Passive",
                    "Instant"
                ],
                "classesHtml": "Passive, Instant"
            }
        ],
        "role": "De-Buff DPS",
        "roleCategory": "strategic",
        "universe": "dc"
    },
    {
        "id": "atrocitus",
        "characterId": "atrocitus",
        "name": "Atrocitus",
        "nameHtml": "Atrocitus",
        "facePicture": "https://i.imgur.com/nS6xXG6.png",
        "url": "https://i.imgur.com/nS6xXG6.png",
        "unlockRequirement": "None",
        "unlockRequirementHtml": "None",
        "characterdeescription": "Atrocitus is a relentless rage-fueled bruiser who grows stronger the more he is attacked. By building Rage stacks through damage taken, he steadily increases the power of his abilities and forces enemies to think twice before focusing him.",
        "description": "Atrocitus is a relentless rage-fueled bruiser who grows stronger the more he is attacked. By building Rage stacks through damage taken, he steadily increases the power of his abilities and forces enemies to think twice before focusing him.",
        "descriptionHtml": "Atrocitus is a relentless rage-fueled bruiser who grows stronger the more he is attacked.<br>By building Rage stacks through damage taken, he steadily increases the power of his abilities and forces enemies to think twice before focusing him.",
        "startStatuses": [
            {
                "statusId": "atrocitus_red_lantern_ring_passive",
                "duration": 99,
                "sourceSkillId": "atrocitus-passive-red-lantern-ring",
                "metadata": {
                    "infiniteDuration": true,
                    "lanternPassiveVisual": "red",
                    "onOwnerDamagedByBaseDamageAtLeastApplyStatusToOwner": {
                        "threshold": 25,
                        "enemyOnly": true,
                        "statusId": "atrocitus_rage_stacks",
                        "duration": 99,
                        "metadata": {
                            "infiniteDuration": true,
                            "lanternEffectVisual": "red",
                            "atrocitusRageStacks": 1,
                            "stackMetadataKey": "atrocitusRageStacks",
                            "stackDelta": 1,
                            "stackMax": 99,
                            "stackDerivedNumericKeys": {
                                "damageBonusFlat": 5
                            },
                            "tooltipTextTemplate": "Atrocitus has {atrocitusRageStacks} Rage stacks and deals {damageBonusFlat} additional damage."
                        }
                    },
                    "tooltipText": "When Atrocitus takes 25 or more damage from an enemy skill, he gains 1 Rage stack."
                }
            }
        ],
        "skills": [
            {
                "id": "atrocitus-rage-of-ysmault",
                "name": "Rage of Ysmault",
                "nameHtml": "Rage of Ysmault",
                "skillimage": "https://i.imgur.com/VOeek9r.jpeg",
                "url": "https://i.imgur.com/VOeek9r.jpeg",
                "skilldescription": "Atrocitus channels the endless rage that fuels the Red Lantern Corps and gains 20 permanent destructible defense. For 3 turns, he gains 1 Rage stack and lowers his active cooldowns by 1 whenever he is damaged. Each Rage stack increases his skill damage by 5. This may not be used while active.",
                "description": "Atrocitus channels the endless rage that fuels the Red Lantern Corps and gains 20 permanent destructible defense. For 3 turns, he gains 1 Rage stack and lowers his active cooldowns by 1 whenever he is damaged. Each Rage stack increases his skill damage by 5. This may not be used while active.",
                "descriptionHtml": "Atrocitus channels the endless rage that fuels the Red Lantern Corps and gains 20 permanent destructible defense.<br>For 3 turns, he gains 1 Rage stack and lowers his active cooldowns by 1 whenever he is damaged.<br>Each Rage stack increases his skill damage by 5.<br>This may not be used while active.",
                "energy": [
                    "Random"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 4,
                "cooldownHtml": "4",
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "classesHtml": "Energy, Instant",
                "actorCondition": {
                    "missingStatusId": "atrocitus_rage_of_ysmault_active"
                },
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "atrocitus_rage_of_ysmault_defense",
                        "duration": 99,
                        "scope": "self",
                        "metadata": {
                            "destructibleDefensePoints": 20,
                            "mergeNumericAddKeys": [
                                "destructibleDefensePoints"
                            ],
                            "tooltipTextTemplate": "Atrocitus has {destructibleDefensePoints} destructible defense."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "atrocitus_rage_of_ysmault_active",
                        "duration": 3,
                        "scope": "self",
                        "metadata": {
                            "onOwnerDamagedByBaseDamageAtLeastApplyStatusToOwner": {
                                "threshold": 1,
                                "enemyOnly": true,
                                "statusId": "atrocitus_rage_stacks",
                                "duration": 99,
                                "metadata": {
                                    "infiniteDuration": true,
                                    "atrocitusRageStacks": 1,
                                    "stackMetadataKey": "atrocitusRageStacks",
                                    "stackDelta": 1,
                                    "stackMax": 99,
                                    "stackDerivedNumericKeys": {
                                        "damageBonusFlat": 5
                                    },
                                    "tooltipTextTemplate": "Atrocitus has {atrocitusRageStacks} Rage stacks and deals {damageBonusFlat} additional damage."
                                }
                            },
                            "tooltipText": "Atrocitus gains 1 Rage stack whenever damaged."
                        }
                    }
                ]
            },
            {
                "id": "atrocitus-napalm-blood-vomit",
                "name": "Napalm Blood Vomit",
                "nameHtml": "Napalm Blood Vomit",
                "skillimage": "https://i.imgur.com/4kS6GoG.jpeg",
                "url": "https://i.imgur.com/4kS6GoG.jpeg",
                "skilldescription": "Atrocitus spews volatile plasma blood at an enemy, dealing 20 affliction damage and applying Burning Rage, which deals 10 affliction damage the following 2 turns.",
                "description": "Atrocitus spews volatile plasma blood at an enemy, dealing 20 affliction damage and applying Burning Rage, which deals 10 affliction damage the following 2 turns.",
                "descriptionHtml": "Atrocitus spews volatile plasma blood at an enemy, dealing 20 affliction damage and applying Burning Rage, which deals 10 affliction damage the following 2 turns.<br>If Atrocitus has 3 or more Rage stacks, and silences the target for 1 turn.",
                "energy": [
                    "Bloodline",
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 2,
                "cooldownHtml": "2",
                "classes": [
                    "Energy",
                    "Ranged",
                    "Instant",
                    "Affliction",
                    "Unremovable"
                ],
                "classesHtml": "Energy, Ranged, Instant, Affliction, Unremovable",
                "effects": [
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
                        "statusId": "atrocitus_burning_rage",
                        "duration": 2,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "turnEndDamage": 10,
                            "afflictionDamage": true,
                            "ignoreTargetDamageReduction": true,
                            "ignoreTargetDestructibleDefense": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "tooltipText": "This character takes 10 affliction damage on Atrocitus's turns."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "atrocitus_burning_rage_silence",
                        "duration": 1,
                        "scope": "target",
                        "condition": {
                            "statusMetadataAtLeast": {
                                "scope": "self",
                                "statusId": "atrocitus_rage_stacks",
                                "metadataKey": "atrocitusRageStacks",
                                "value": 3
                            }
                        },
                        "metadata": {
                            "harmful": true,
                            "silenceNonDamageEffects": true,
                            "tooltipText": "Silenced: only damage effects from this character's skills will work."
                        }
                    }
                ]
            },
            {
                "id": "atrocitus-blood-magic-of-the-butcher",
                "name": "Blood Magic of the Butcher",
                "nameHtml": "Blood Magic of the Butcher",
                "skillimage": "https://i.imgur.com/WgD4R09.jpeg",
                "url": "https://i.imgur.com/WgD4R09.jpeg",
                "skilldescription": "Atrocitus brands an enemy with an ancient rage magic for 3 turns. The target takes 5 affliction damage whenever they use a skill. If the target becomes stunned or silenced, they take 10 energy damage.",
                "description": "Atrocitus brands an enemy with an ancient rage magic for 3 turns. The target takes 5 affliction damage whenever they use a skill. If the target becomes stunned or silenced, they take 10 energy damage.",
                "descriptionHtml": "Atrocitus brands an enemy with an ancient rage magic for 3 turns.<br>The target takes 5 affliction damage whenever they use a skill.<br>If the target becomes stunned or silenced, they take 10 energy damage.",
                "energy": [
                    "Bloodline"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 3,
                "cooldownHtml": "3",
                "classes": [
                    "Energy",
                    "Ranged",
                    "Instant",
                    "Affliction"
                ],
                "classesHtml": "Energy, Ranged, Instant, Affliction",
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "atrocitus_blood_magic_of_the_butcher",
                        "duration": 3,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "onOwnerUseSkillSelfDamage": 5,
                            "onOwnerUseSkillSelfDamageIgnoreDamageReduction": true,
                            "onOwnerUseSkillSelfDamageIgnoreDestructibleDefense": true,
                            "tooltipText": "This character takes 5 affliction damage whenever they use a skill."
                        }
                    }
                ]
            },
            {
                "id": "atrocitus-red-lantern-execution",
                "name": "Red Lantern Execution",
                "nameHtml": "Red Lantern Execution",
                "skillimage": "https://i.imgur.com/zAcr8c8.png",
                "url": "https://i.imgur.com/zAcr8c8.png",
                "skilldescription": "Atrocitus brutally tears into an enemy using rage-fueled constructs, dealing 25 piercing damage plus 10 per Rage stack. After use, all Rage stacks are consumed.",
                "description": "Atrocitus brutally tears into an enemy using rage-fueled constructs, dealing 25 piercing damage plus 10 per Rage stack. After use, all Rage stacks are consumed.",
                "descriptionHtml": "Atrocitus brutally tears into an enemy using rage-fueled constructs, dealing 25 piercing damage plus 10 per Rage stack.<br>After use, all Rage stacks are consumed.",
                "energy": [
                    "Bloodline",
                    "Bloodline"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 0,
                "cooldownHtml": "None",
                "classes": [
                    "Chakra",
                    "Melee",
                    "Instant"
                ],
                "classesHtml": "Chakra, Melee, Instant",
                "effects": [
                    {
                        "type": "damage",
                        "amount": 25,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageReduction": true,
                            "bonusFromStatusMetadataThresholds": {
                                "scope": "self",
                                "statusId": "atrocitus_rage_stacks",
                                "metadataKey": "atrocitusRageStacks",
                                "thresholds": [
                                    {
                                        "atLeast": 10,
                                        "bonus": 100,
                                        "consume": 10
                                    },
                                    {
                                        "atLeast": 5,
                                        "bonus": 50,
                                        "consume": 5
                                    },
                                    {
                                        "atLeast": 4,
                                        "bonus": 40,
                                        "consume": 4
                                    },
                                    {
                                        "atLeast": 3,
                                        "bonus": 30,
                                        "consume": 3
                                    },
                                    {
                                        "atLeast": 2,
                                        "bonus": 20,
                                        "consume": 2
                                    },
                                    {
                                        "atLeast": 1,
                                        "bonus": 10,
                                        "consume": 1
                                    }
                                ]
                            }
                        }
                    },
                    {
                        "type": "cleanse_statuses",
                        "scope": "self",
                        "statusId": "atrocitus_rage_stacks",
                        "count": 0
                    }
                ]
            },
            {
                "id": "atrocitus-passive-red-lantern-ring",
                "name": "Passive: Red Lantern Ring",
                "nameHtml": "Passive: Red Lantern Ring",
                "skillimage": "https://i.imgur.com/Liii5O0.jpeg",
                "url": "https://i.imgur.com/Liii5O0.jpeg",
                "skilldescription": "Whenever Atrocitus takes 25 or more damage in one turn, he gains 1 Rage stack and deals 5 affliction damage to the attacker.",
                "description": "Whenever Atrocitus takes 25 or more damage in one turn, he gains 1 Rage stack and deals 5 affliction damage to the attacker.",
                "descriptionHtml": "Whenever Atrocitus takes 25 or more damage in one turn, he gains 1 Rage stack and deals 5 affliction damage to the attacker.",
                "energy": [],
                "target": "",
                "damage": 0,
                "cooldown": 0,
                "cooldownHtml": "Passive",
                "classes": [
                    "Passive",
                    "Energy",
                    "Instant"
                ],
                "classesHtml": "Passive, Energy, Instant"
            }
        ],
        "role": "Rage Scaling Bruiser",
        "roleCategory": "bruiser",
        "universe": "dc"
    },
    {
        "id": "saint-walker",
        "characterId": "saint-walker",
        "name": "Saint Walker",
        "nameHtml": "Saint Walker",
        "facePicture": "https://i.imgur.com/unzClm5.jpeg",
        "url": "https://i.imgur.com/unzClm5.jpeg",
        "unlockRequirement": "None",
        "unlockRequirementHtml": "None",
        "characterdeescription": "Saint Walker is a Hope-powered support protector who specializes in shielding allies, preventing death, and empowering his team through permanent defensive growth.",
        "description": "Saint Walker is a Hope-powered support protector who specializes in shielding allies, preventing death, and empowering his team through permanent defensive growth.",
        "descriptionHtml": "Saint Walker is a Hope-powered support protector who specializes in shielding allies, preventing death, and empowering his team through permanent defensive growth.",
        "startStatuses": [
            {
                "statusId": "saint_walker_blue_lantern_ring_passive",
                "duration": 99,
                "sourceSkillId": "saint-walker-passive-blue-lantern-ring",
                "metadata": {
                    "infiniteDuration": true,
                    "lanternPassiveVisual": "blue",
                    "blueLanternRingDefensePerTurn": 1,
                    "turnEndApplyStatusToAllies": [
                        {
                            "statusId": "saint_walker_blue_lantern_ring_defense",
                            "duration": 99,
                            "metadata": {
                                "destructibleDefensePoints": 0,
                                "lanternEffectVisual": "blue",
                                "scaleFromSourceStatusMetadata": {
                                    "metadataKey": "blueLanternRingDefensePerTurn",
                                    "multiplier": 1,
                                    "targetKeys": [
                                        "destructibleDefensePoints"
                                    ]
                                },
                                "mergeNumericAddKeys": [
                                    "destructibleDefensePoints"
                                ],
                                "tooltipTextTemplate": "This character has {destructibleDefensePoints} destructible defense from Blue Lantern Ring."
                            }
                        },
                        {
                            "statusId": "green_lantern_hal_jordan_green_lantern_ring_damage_bonus",
                            "duration": 99,
                            "condition": {
                                "scope": "target",
                                "statusId": "green_lantern_hal_jordan_passive_green_lantern_ring"
                            },
                            "metadata": {
                                "infiniteDuration": true,
                                "lanternEffectVisual": "green",
                                "damageBonusFlat": 1,
                                "mergeNumericAddKeys": [
                                    "damageBonusFlat"
                                ],
                                "tooltipTextTemplate": "Green Lantern deals {damageBonusFlat} additional damage."
                            }
                        }
                    ],
                    "tooltipText": "Saint Walker grants his team 1 permanent destructible defense at the end of each of his turns. Also increases Passive: Green Lantern by 1 each turn while he is alive.",
                    "tooltipTextTemplate": "Saint Walker grants his team {blueLanternRingDefensePerTurn} permanent destructible defense at the end of each of his turns. Also increases Passive: Green Lantern by 1 each turn while he is alive."
                }
            }
        ],
        "skills": [
            {
                "id": "saint-walker-fist-of-hope",
                "name": "Fist of Hope",
                "nameHtml": "Fist of Hope",
                "skillimage": "https://i.imgur.com/nGR4QYX.png",
                "url": "https://i.imgur.com/nGR4QYX.png",
                "skilldescription": "Deals 25 damage to one enemy and grants your team 5 points of destructible defense.",
                "description": "Deals 25 damage to one enemy and grants your team 5 points of destructible defense.",
                "descriptionHtml": "Deals 25 damage to one enemy and grants your team 5 points of destructible defense.",
                "energy": [
                    "Ninjutsu"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 1,
                "cooldownHtml": "1",
                "classes": [
                    "Energy",
                    "Melee",
                    "Instant"
                ],
                "classesHtml": "Energy, Melee, Instant",
                "effects": [
                    {
                        "type": "damage",
                        "amount": 25,
                        "scope": "target"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "saint_walker_fist_of_hope_defense",
                        "duration": 99,
                        "scope": "all-allies",
                        "metadata": {
                            "destructibleDefensePoints": 5,
                            "mergeNumericAddKeys": [
                                "destructibleDefensePoints"
                            ],
                            "tooltipTextTemplate": "This character has {destructibleDefensePoints} destructible defense from Fist of Hope."
                        }
                    }
                ]
            },
            {
                "id": "saint-walker-radiant-hope",
                "name": "Radiant Hope",
                "nameHtml": "Radiant Hope",
                "skillimage": "https://i.imgur.com/4th9J63.jpeg",
                "url": "https://i.imgur.com/4th9J63.jpeg",
                "skilldescription": "At the start of your next turn choose one option: Grant one ally 20 permanent destructible defense; grant an enemy 20 barrier; or prevent an ally from dying for 1 turn. This skill is invisible.",
                "description": "At the start of your next turn choose one option: Grant one ally 20 permanent destructible defense; grant an enemy 20 barrier; or prevent an ally from dying for 1 turn. This skill is invisible.",
                "descriptionHtml": "At the start of your next turn choose one option:<br>Grant one ally 20 permanent destructible defense.<br>Grant an enemy 20 barrier.<br>Prevent an ally from dying for 1 turn.<br>This skill is invisible.",
                "energy": [
                    "Ninjutsu"
                ],
                "target": "self-or-single-ally",
                "damage": 0,
                "cooldown": 1,
                "cooldownHtml": "1",
                "classes": [
                    "Energy",
                    "Ranged",
                    "Instant",
                    "Invisible"
                ],
                "classesHtml": "Energy, Ranged, Instant, Invisible",
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "saint_walker_radiant_hope_active",
                        "duration": 2,
                        "scope": "self",
                        "metadata": {
                            "turnStartChoicePromptText": "Choose one Radiant Hope effect.",
                            "turnStartChoiceMaxUses": 1,
                            "turnStartChoiceUsesUsed": 0,
                            "turnStartChoiceQueued": true,
                            "turnStartChoiceOptions": [
                                {
                                    "key": "defense",
                                    "label": "Grant ally 20 defense",
                                    "targetStrategy": "alive-ally-lowest-hp",
                                    "effect": {
                                        "type": "apply_status",
                                        "statusId": "saint_walker_radiant_hope_defense_option",
                                        "duration": 99,
                                        "metadata": {
                                            "destructibleDefensePoints": 20,
                                            "infiniteDuration": true,
                                            "tooltipText": "This character has 20 points of permanent destructible defense from Radiant Hope."
                                        }
                                    }
                                },
                                {
                                    "key": "barrier",
                                    "label": "Grant enemy 20 barrier",
                                    "targetStrategy": "alive-enemy-first",
                                    "effect": {
                                        "type": "apply_status",
                                        "statusId": "saint_walker_radiant_hope_barrier_option",
                                        "duration": 99,
                                        "metadata": {
                                            "barrierPoints": 20,
                                            "infiniteDuration": true,
                                            "tooltipText": "This character has 20 points of barrier from Radiant Hope."
                                        }
                                    }
                                },
                                {
                                    "key": "survival",
                                    "label": "Prevent ally death",
                                    "targetStrategy": "alive-ally-lowest-hp",
                                    "effect": {
                                        "type": "apply_status",
                                        "statusId": "saint_walker_radiant_hope_survival_option",
                                        "duration": 1,
                                        "metadata": {
                                            "minimumHp": 1,
                                            "tooltipText": "This character cannot be killed this turn."
                                        }
                                    }
                                }
                            ],
                            "tooltipText": "At the start of your next turn, choose a Radiant Hope effect."
                        }
                    }
                ]
            },
            {
                "id": "saint-walker-emotional-aura-attunement",
                "name": "Emotional Aura Attunement",
                "nameHtml": "Emotional Aura Attunement",
                "skillimage": "https://i.imgur.com/7ACcyxD.jpeg",
                "url": "https://i.imgur.com/7ACcyxD.jpeg",
                "skilldescription": "Saint Walker increases the amount of destructible defense granted by 'Passive: Blue Lantern Ring' by 1 (stacks) and gains 1 blue energy. This swaps to 'Phoenix of Hope' for 2 turns.",
                "description": "Saint Walker increases the amount of destructible defense granted by 'Passive: Blue Lantern Ring' by 1 (stacks) and gains 1 blue energy. This swaps to 'Phoenix of Hope' for 2 turns.",
                "descriptionHtml": "Saint Walker increases the amount of destructible defense granted by 'Passive: Blue Lantern Ring' by 1 (stacks) and gains 1 blue energy.<br>This swaps to 'Phoenix of Hope' for 2 turns.",
                "energy": [
                    "Random"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 4,
                "cooldownHtml": "4",
                "classes": [
                    "Energy",
                    "Instant"
                ],
                "classesHtml": "Energy, Instant",
                "effects": [
                    {
                        "type": "gain_chakra",
                        "chakraType": "ninjutsu",
                        "amount": 1
                    },
                    {
                        "type": "apply_status",
                        "statusId": "saint_walker_blue_lantern_ring_passive",
                        "sourceSkillId": "saint-walker-passive-blue-lantern-ring",
                        "duration": 99,
                        "scope": "self",
                        "fresh": false,
                        "metadata": {
                            "infiniteDuration": true,
                            "blueLanternRingDefensePerTurn": 1,
                            "turnEndApplyStatusToAllies": [
                                {
                                    "statusId": "saint_walker_blue_lantern_ring_defense",
                                    "duration": 99,
                                    "metadata": {
                                        "destructibleDefensePoints": 0,
                                        "lanternEffectVisual": "blue",
                                        "scaleFromSourceStatusMetadata": {
                                            "metadataKey": "blueLanternRingDefensePerTurn",
                                            "multiplier": 1,
                                            "targetKeys": [
                                                "destructibleDefensePoints"
                                            ]
                                        },
                                        "mergeNumericAddKeys": [
                                            "destructibleDefensePoints"
                                        ],
                                        "tooltipTextTemplate": "This character has {destructibleDefensePoints} destructible defense from Blue Lantern Ring."
                                    }
                                },
                                {
                                    "statusId": "green_lantern_hal_jordan_green_lantern_ring_damage_bonus",
                                    "duration": 99,
                                    "condition": {
                                        "scope": "target",
                                        "statusId": "green_lantern_hal_jordan_passive_green_lantern_ring"
                                    },
                                    "metadata": {
                                        "infiniteDuration": true,
                                        "lanternEffectVisual": "green",
                                        "damageBonusFlat": 1,
                                        "mergeNumericAddKeys": [
                                            "damageBonusFlat"
                                        ],
                                        "tooltipTextTemplate": "Green Lantern deals {damageBonusFlat} additional damage."
                                    }
                                }
                            ],
                            "mergeNumericAddKeys": [
                                "blueLanternRingDefensePerTurn"
                            ],
                            "tooltipTextTemplate": "Saint Walker grants his team {blueLanternRingDefensePerTurn} permanent destructible defense at the end of each of his turns. Also increases Passive: Green Lantern by 1 each turn while he is alive."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "saint_walker_phoenix_of_hope_ready",
                        "duration": 2,
                        "scope": "self",
                        "metadata": {
                            "skillReplacements": {
                                "saint-walker-emotional-aura-attunement": "saint-walker-phoenix-of-hope"
                            },
                            "tooltipText": "Emotional Aura Attunement is replaced by Phoenix of Hope."
                        }
                    }
                ]
            },
            {
                "id": "saint-walker-hope-shield",
                "name": "Hope Shield",
                "nameHtml": "Hope Shield",
                "skillimage": "https://i.imgur.com/07QdV07.png",
                "url": "https://i.imgur.com/07QdV07.png",
                "skilldescription": "Saint Walker targets himself or an ally, granting them 50% unpierceable damage reduction and making them ignore affliction damage for 1 turn.",
                "description": "Saint Walker targets himself or an ally, granting them 50% unpierceable damage reduction and making them ignore affliction damage for 1 turn.",
                "descriptionHtml": "Saint Walker targets himself or an ally, granting them 50% unpierceable damage reduction and making them ignore affliction damage for 1 turn.",
                "energy": [
                    "Random"
                ],
                "target": "self-or-single-ally",
                "damage": 0,
                "cooldown": 2,
                "cooldownHtml": "2",
                "classes": [
                    "Energy",
                    "Instant"
                ],
                "classesHtml": "Energy, Instant",
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "saint_walker_hope_shield",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "unpierceableDamageReductionPercent": 50,
                            "ignoreAfflictionDamage": true,
                            "tooltipText": "This character has 50% unpierceable damage reduction and ignores affliction damage."
                        }
                    }
                ]
            },
            {
                "id": "saint-walker-phoenix-of-hope",
                "name": "Phoenix of Hope",
                "nameHtml": "Phoenix of Hope",
                "hiddenFromSelectionViewer": true,
                "useBaseSkillCooldown": true,
                "skillimage": "https://i.imgur.com/oH6BgBg.jpeg",
                "url": "https://i.imgur.com/oH6BgBg.jpeg",
                "skilldescription": "Saint Walker makes his whole team invulnerable for 1 turn and grants them 15 points of permanent destructible defense.",
                "description": "Saint Walker makes his whole team invulnerable for 1 turn and grants them 15 points of permanent destructible defense.",
                "descriptionHtml": "Saint Walker makes his whole team invulnerable for 1 turn and grants them 15 points of permanent destructible defense.",
                "energy": [
                    "Ninjutsu",
                    "Ninjutsu"
                ],
                "target": "all-allies",
                "damage": 0,
                "cooldown": 4,
                "cooldownHtml": "4",
                "classes": [
                    "Energy",
                    "Instant"
                ],
                "classesHtml": "Energy, Instant",
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "saint_walker_phoenix_of_hope_invulnerable",
                        "duration": 1,
                        "scope": "all-allies",
                        "metadata": {
                            "invulnerable": true,
                            "tooltipText": "This character is invulnerable."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "saint_walker_phoenix_of_hope_defense",
                        "duration": 99,
                        "scope": "all-allies",
                        "metadata": {
                            "destructibleDefensePoints": 15,
                            "mergeNumericAddKeys": [
                                "destructibleDefensePoints"
                            ],
                            "tooltipTextTemplate": "This character has {destructibleDefensePoints} destructible defense from Phoenix of Hope."
                        }
                    }
                ]
            },
            {
                "id": "saint-walker-passive-blue-lantern-ring",
                "name": "Passive: Blue Lantern Ring",
                "nameHtml": "Passive: Blue Lantern Ring",
                "skillimage": "https://i.imgur.com/tOBn10V.jpeg",
                "url": "https://i.imgur.com/tOBn10V.jpeg",
                "skilldescription": "Saint Walker grants his entire team 1 permanent destructible defense every turn. Also increases the damage of all 'Passive: Green Lantern Ring' by 1 each turn while he is alive.",
                "description": "Saint Walker grants his entire team 1 permanent destructible defense every turn. Also increases the damage of all 'Passive: Green Lantern Ring' by 1 each turn while he is alive.",
                "descriptionHtml": "Saint Walker grants his entire team 1 permanent destructible defense every turn.<br>Also increases the damage of all 'Passive: Green Lantern Ring' by 1 each turn while he is alive.",
                "energy": [],
                "target": "",
                "damage": 0,
                "cooldown": 0,
                "cooldownHtml": "Passive",
                "classes": [
                    "Passive",
                    "Instant"
                ],
                "classesHtml": "Passive, Instant"
            }
        ],
        "role": "Shield Support",
        "roleCategory": "support",
        "universe": "dc"
    },
    {
        "id": "indigo-1",
        "characterId": "indigo-1",
        "name": "Indigo-1",
        "nameHtml": "Indigo-1",
        "facePicture": "https://i.imgur.com/nOzu8z7.jpeg",
        "url": "https://i.imgur.com/nOzu8z7.jpeg",
        "unlockRequirement": "None",
        "unlockRequirementHtml": "None",
        "characterdeescription": "Indigo-1 is a versatile empath support who alternates between healing allies and punishing enemies through mirrored suffering and powerful affliction effects.",
        "description": "Indigo-1 is a versatile empath support who alternates between healing allies and punishing enemies through mirrored suffering and powerful affliction effects.",
        "descriptionHtml": "Indigo-1 is a versatile empath support who alternates between healing allies and punishing enemies through mirrored suffering and powerful affliction effects.",
        "startStatuses": [
            {
                "statusId": "indigo_1_indigo_lantern_ring_passive",
                "duration": 99,
                "sourceSkillId": "indigo-1-passive-indigo-lantern-ring",
                "metadata": {
                    "infiniteDuration": true,
                    "lanternPassiveVisual": "indigo",
                    "tooltipText": "Indigo-1's healing and damage alternate through the Indigo Lantern Ring."
                }
            }
        ],
        "skills": [
            {
                "id": "indigo-1-compassion-staff",
                "name": "Compassion Staff",
                "nameHtml": "Compassion Staff",
                "skillimage": "https://i.imgur.com/QiNbR2W.jpeg",
                "url": "https://i.imgur.com/QiNbR2W.jpeg",
                "skilldescription": "May be used on an enemy or an ally. If enemy: Deals 13 affliction damage immediately and each turn for 2 turns. If ally: Heal 13 HP immediately and each turn for 2 turns. This will cancel the previous cast if it is used while active.",
                "description": "May be used on an enemy or an ally. If enemy: Deals 13 affliction damage immediately and each turn for 2 turns. If ally: Heal 13 HP immediately and each turn for 2 turns. This will cancel the previous cast if it is used while active.",
                "descriptionHtml": "May be used on an enemy or an ally.<br>If enemy: Deals 13 affliction damage immediately and each turn for 2 turns.<br>If ally: Heal 13 HP immediately and each turn for 2 turns.<br>This will cancel the previous cast if it is used while active.",
                "energy": [
                    "Ninjutsu"
                ],
                "target": "single-character",
                "damage": 0,
                "cooldown": 0,
                "cooldownHtml": "None",
                "classes": [
                    "Energy",
                    "Ranged",
                    "Control",
                    "Affliction"
                ],
                "classesHtml": "Energy, Ranged, Control, Affliction",
                "effects": [
                    {
                        "type": "damage",
                        "amount": 13,
                        "scope": "target",
                        "condition": {
                            "scope": "target",
                            "targetRelation": "enemy"
                        },
                        "metadata": {
                            "afflictionDamage": true,
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true
                        }
                    },
                    {
                        "type": "heal",
                        "amount": 13,
                        "scope": "target",
                        "condition": {
                            "scope": "target",
                            "targetRelation": "ally"
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "indigo_1_compassion_staff_suffering",
                        "duration": 2,
                        "scope": "target",
                        "condition": {
                            "scope": "target",
                            "targetRelation": "enemy"
                        },
                        "metadata": {
                            "harmful": true,
                            "ongoingClass": "control",
                            "turnEndDamage": 13,
                            "afflictionDamage": true,
                            "ignoreTargetDamageReduction": true,
                            "ignoreTargetDestructibleDefense": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "tooltipText": "This character takes 13 affliction damage each Indigo-1 turn."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "indigo_1_compassion_staff_healing",
                        "duration": 2,
                        "scope": "target",
                        "condition": {
                            "scope": "target",
                            "targetRelation": "ally"
                        },
                        "metadata": {
                            "turnEndHealFlat": 13,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "tooltipText": "This character is healed for 13 HP each Indigo-1 turn."
                        }
                    }
                ]
            },
            {
                "id": "indigo-1-influx-of-empathy",
                "name": "Influx of Empathy",
                "nameHtml": "Influx of Empathy",
                "skillimage": "https://i.imgur.com/xnVwbwY.jpeg",
                "url": "https://i.imgur.com/xnVwbwY.jpeg",
                "skilldescription": "Marks an ally or an enemy for 4 turns. While marked, all damage dealt by Indigo-1 will be given to the target as healing (if on ally) or all healing done by Indigo-1 will be dealt as affliction damage (if on enemy). This will end on the previous target if used on a new one.",
                "description": "Marks an ally or an enemy for 4 turns. While marked, all damage dealt by Indigo-1 will be given to the target as healing (if on ally) or all healing done by Indigo-1 will be dealt as affliction damage (if on enemy). This will end on the previous target if used on a new one.",
                "descriptionHtml": "Marks an ally or an enemy for 4 turns.<br>While marked, all damage dealt by Indigo-1 will be given to the target as healing (if on ally) or all healing done by Indigo-1 will be dealt as affliction damage (if on enemy).<br>This will end on the previous target if used on a new one.",
                "energy": [
                    "Random"
                ],
                "target": "single-character",
                "damage": 0,
                "cooldown": 2,
                "cooldownHtml": "2",
                "classes": [
                    "Energy",
                    "Ranged",
                    "Instant"
                ],
                "classesHtml": "Energy, Ranged, Instant",
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "indigo_1_influx_of_empathy_ally",
                        "duration": 4,
                        "scope": "target",
                        "condition": {
                            "scope": "target",
                            "targetRelation": "ally"
                        },
                        "metadata": {
                            "tooltipText": "Indigo-1's damage is mirrored as healing to this ally."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "indigo_1_influx_of_empathy_enemy",
                        "duration": 4,
                        "scope": "target",
                        "condition": {
                            "scope": "target",
                            "targetRelation": "enemy"
                        },
                        "metadata": {
                            "harmful": true,
                            "uniqueEnemyMarkFromSource": true,
                            "tooltipText": "Indigo-1's healing is mirrored as affliction damage to this enemy."
                        }
                    }
                ]
            },
            {
                "id": "indigo-1-purge",
                "name": "Purge",
                "nameHtml": "Purge",
                "skillimage": "https://i.imgur.com/CWBSD5C.jpeg",
                "url": "https://i.imgur.com/CWBSD5C.jpeg",
                "skilldescription": "May be used on an enemy or an ally. If enemy: Deals 37 affliction damage to one enemy and banishes them for 2 turns if their health falls to 35 HP or below. If ally: Heals 37 HP and makes them ignore enemy non-damage effects for 2 turns.",
                "description": "May be used on an enemy or an ally. If enemy: Deals 37 affliction damage to one enemy and banishes them for 2 turns if their health falls to 35 HP or below. If ally: Heals 37 HP and makes them ignore enemy non-damage effects for 2 turns.",
                "descriptionHtml": "May be used on an enemy or an ally.<br>If enemy: Deals 37 affliction damage to one enemy and banishes them for 2 turns if their health falls to 35 HP or below.<br>If ally: Heals 37 HP and makes them ignore enemy non-damage effects for 2 turns.",
                "energy": [
                    "Ninjutsu",
                    "Ninjutsu"
                ],
                "target": "single-character",
                "damage": 0,
                "cooldown": 4,
                "cooldownHtml": "4",
                "classes": [
                    "Energy",
                    "Melee",
                    "Instant",
                    "Affliction"
                ],
                "classesHtml": "Energy, Melee, Instant, Affliction",
                "effects": [
                    {
                        "type": "damage",
                        "amount": 37,
                        "scope": "target",
                        "condition": {
                            "scope": "target",
                            "targetRelation": "enemy"
                        },
                        "metadata": {
                            "afflictionDamage": true,
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "indigo_1_purge_banished",
                        "duration": 2,
                        "scope": "target",
                        "condition": {
                            "scope": "target",
                            "targetRelation": "enemy",
                            "sourceCurrentHpAtMost": 35
                        },
                        "metadata": {
                            "harmful": true,
                            "banished": true,
                            "tooltipText": "This character is banished and is treated as if dead until this effect ends."
                        }
                    },
                    {
                        "type": "heal",
                        "amount": 37,
                        "scope": "target",
                        "condition": {
                            "scope": "target",
                            "targetRelation": "ally"
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "indigo_1_purge_protection",
                        "duration": 2,
                        "scope": "target",
                        "condition": {
                            "scope": "target",
                            "targetRelation": "ally"
                        },
                        "metadata": {
                            "invulnerableToHarmfulEffects": true,
                            "tooltipText": "This character ignores enemy non-damage effects."
                        }
                    }
                ]
            },
            {
                "id": "indigo-1-compassion-shield",
                "name": "Compassion Shield",
                "nameHtml": "Compassion Shield",
                "skillimage": "https://i.imgur.com/2tQ8NvJ.jpeg",
                "url": "https://i.imgur.com/2tQ8NvJ.jpeg",
                "skilldescription": "Indigo-1 grants her team 90% unpierceable damage reduction for 1 turn.",
                "description": "Indigo-1 grants her team 90% unpierceable damage reduction for 1 turn.",
                "descriptionHtml": "Indigo-1 grants her team 90% unpierceable damage reduction for 1 turn.",
                "energy": [
                    "Random",
                    "Random"
                ],
                "target": "all-allies",
                "damage": 0,
                "cooldown": 5,
                "cooldownHtml": "5",
                "classes": [
                    "Energy",
                    "Instant"
                ],
                "classesHtml": "Energy, Instant",
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "indigo_1_compassion_shield",
                        "duration": 1,
                        "scope": "all-allies",
                        "metadata": {
                            "unpierceableDamageReductionPercent": 90,
                            "tooltipText": "This character has 90% unpierceable damage reduction."
                        }
                    }
                ]
            },
            {
                "id": "indigo-1-passive-indigo-lantern-ring",
                "name": "Passive: Indigo Lantern Ring",
                "nameHtml": "Passive: Indigo Lantern Ring",
                "skillimage": "https://i.imgur.com/42bESKD.jpeg",
                "url": "https://i.imgur.com/42bESKD.jpeg",
                "skilldescription": "If Indigo-1 dealt damage to an enemy last turn, she will heal 10 HP if she heals an ally on this turn. If Indigo-1 healed an ally last turn, she will heal 10 HP if she deals damage to an enemy on this turn.",
                "description": "If Indigo-1 dealt damage to an enemy last turn, she will heal 10 HP if she heals an ally on this turn. If Indigo-1 healed an ally last turn, she will heal 10 HP if she deals damage to an enemy on this turn.",
                "descriptionHtml": "If Indigo-1 dealt damage to an enemy last turn, she will heal 10 HP if she heals an ally on this turn.<br>If Indigo-1 healed an ally last turn, she will heal 10 HP if she deals damage to an enemy on this turn.",
                "energy": [],
                "target": "",
                "damage": 0,
                "cooldown": 0,
                "cooldownHtml": "Passive",
                "classes": [
                    "Passive",
                    "Instant"
                ],
                "classesHtml": "Passive, Instant"
            }
        ],
        "role": "Heal Support",
        "roleCategory": "support",
        "universe": "dc"
    },
    {
        "id": "john-stewart",
        "characterId": "john-stewart",
        "name": "John Stewart",
        "nameHtml": "John Stewart",
        "facePicture": "https://i.imgur.com/s2MM50x.jpeg",
        "url": "https://i.imgur.com/s2MM50x.jpeg",
        "unlockRequirement": "None",
        "unlockRequirementHtml": "None",
        "characterdeescription": "John Stewart is a methodical control fighter who spreads Emotional Possession across the battlefield, weakening enemies and manipulating their actions through Ultraviolet constructs.",
        "description": "John Stewart is a methodical control fighter who spreads Emotional Possession across the battlefield, weakening enemies and manipulating their actions through Ultraviolet constructs.",
        "descriptionHtml": "John Stewart is a methodical control fighter who spreads Emotional Possession across the battlefield, weakening enemies and manipulating their actions through Ultraviolet constructs.",
        "startStatuses": [
            {
                "statusId": "john_stewart_ultraviolet_lantern_ring_passive",
                "duration": 99,
                "sourceSkillId": "john-stewart-passive-ultraviolet-lantern-ring",
                "metadata": {
                    "infiniteDuration": true,
                    "lanternPassiveVisual": "ultraviolet",
                    "onEnemySkillTargetedMissingStatusId": "john_stewart_ultraviolet_lantern_ring_cooldown",
                    "onEnemySkillTargetedApplyStatusToSource": {
                        "statusId": "john_stewart_emotional_possession",
                        "duration": 2,
                        "metadata": {
                            "harmful": true,
                            "lanternEffectVisual": "ultraviolet",
                            "turnEndDamage": 10,
                            "afflictionDamage": true,
                            "ignoreTargetDamageReduction": true,
                            "ignoreTargetDestructibleDefense": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "mergeNumericAddKeys": [
                                "turnEndDamage"
                            ],
                            "tooltipTextTemplate": "This character takes {turnEndDamage} affliction damage from Emotional Possession each John Stewart turn."
                        }
                    },
                    "onEnemySkillTargetedApplyStatusToOwner": {
                        "statusId": "john_stewart_ultraviolet_lantern_ring_cooldown",
                        "duration": 3,
                        "metadata": {
                            "tooltipText": "Ultraviolet Lantern Ring is on cooldown."
                        }
                    },
                    "tooltipText": "The first enemy to use a new skill on John Stewart gains Emotional Possession. This effect then goes on cooldown for 3 turns."
                }
            }
        ],
        "skills": [
            {
                "id": "john-stewart-dark-constructs",
                "name": "Dark Constructs",
                "nameHtml": "Dark Constructs",
                "skillimage": "https://i.imgur.com/W5z1afo.jpeg",
                "url": "https://i.imgur.com/W5z1afo.jpeg",
                "skilldescription": "All enemies are given 'Emotional Possession'.",
                "description": "All enemies are given 'Emotional Possession'.",
                "descriptionHtml": "All enemies are given 'Emotional Possession'.",
                "energy": [
                    "Ninjutsu",
                    "Random"
                ],
                "target": "all-enemy",
                "damage": 0,
                "cooldown": 1,
                "cooldownHtml": "1",
                "classes": [
                    "Energy",
                    "Ranged",
                    "Instant"
                ],
                "classesHtml": "Energy, Ranged, Instant",
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "john_stewart_emotional_possession",
                        "duration": 2,
                        "scope": "all-enemy",
                        "metadata": {
                            "harmful": true,
                            "turnEndDamage": 10,
                            "afflictionDamage": true,
                            "ignoreTargetDamageReduction": true,
                            "ignoreTargetDestructibleDefense": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "mergeNumericAddKeys": [
                                "turnEndDamage"
                            ],
                            "tooltipTextTemplate": "This character takes {turnEndDamage} affliction damage from Emotional Possession each John Stewart turn."
                        }
                    }
                ]
            },
            {
                "id": "john-stewart-giant-dark-construct",
                "name": "Giant Dark Construct",
                "nameHtml": "Giant Dark Construct",
                "skillimage": "https://i.imgur.com/yv7F2Ny.jpeg",
                "url": "https://i.imgur.com/yv7F2Ny.jpeg",
                "skilldescription": "Deals 30 damage to one enemy and permanently increases the damage they take from 'Emotional Possession' by 5 stacks.",
                "description": "Deals 30 damage to one enemy and permanently increases the damage they take from 'Emotional Possession' by 5 stacks.",
                "descriptionHtml": "Deals 30 damage to one enemy and permanently increases the damage they take from 'Emotional Possession' by 5 stacks.",
                "energy": [
                    "Bloodline",
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 1,
                "cooldownHtml": "1",
                "classes": [
                    "Energy",
                    "Ranged",
                    "Instant"
                ],
                "classesHtml": "Energy, Ranged, Instant",
                "effects": [
                    {
                        "type": "damage",
                        "amount": 30,
                        "scope": "target"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "john_stewart_emotional_possession",
                        "duration": 99,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "infiniteDuration": true,
                            "turnEndDamage": 5,
                            "afflictionDamage": true,
                            "ignoreTargetDamageReduction": true,
                            "ignoreTargetDestructibleDefense": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "mergeNumericAddKeys": [
                                "turnEndDamage"
                            ],
                            "tooltipTextTemplate": "This character takes {turnEndDamage} affliction damage from Emotional Possession each John Stewart turn."
                        }
                    }
                ]
            },
            {
                "id": "john-stewart-mind-manipulation",
                "name": "Mind Manipulation",
                "nameHtml": "Mind Manipulation",
                "skillimage": "https://i.imgur.com/dS10X4K.jpeg",
                "url": "https://i.imgur.com/dS10X4K.jpeg",
                "skilldescription": "Targets one enemy affected by 'Emotional Possession' and replaces two random skills of theirs with 'Emotional Possession'. This cannot be used on an already affected enemy.",
                "description": "Targets one enemy affected by 'Emotional Possession' and replaces two random skills of theirs with 'Emotional Possession'. This cannot be used on an already affected enemy.",
                "descriptionHtml": "Targets one enemy affected by 'Emotional Possession' and replaces two random skills of theirs with 'Emotional Possession'.<br>This cannot be used on an already affected enemy.",
                "energy": [
                    "Bloodline",
                    "Ninjutsu"
                ],
                "target": "single-enemy",
                "targetCondition": {
                    "statusId": "john_stewart_emotional_possession",
                    "missingStatusId": "john_stewart_mind_manipulation"
                },
                "damage": 0,
                "cooldown": 2,
                "cooldownHtml": "2",
                "classes": [
                    "Energy",
                    "Ranged",
                    "Instant"
                ],
                "classesHtml": "Energy, Ranged, Instant",
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "john_stewart_mind_manipulation",
                        "duration": 2,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "tooltipText": "Two of this character's skills are replaced by Emotional Possession."
                        }
                    }
                ]
            },
            {
                "id": "john-stewart-unseen-guard",
                "name": "Unseen Guard",
                "nameHtml": "Unseen Guard",
                "skillimage": "https://i.imgur.com/hKwdORa.jpeg",
                "url": "https://i.imgur.com/hKwdORa.jpeg",
                "skilldescription": "John Stewart gains 20 points of destructible defense for 1 turn. The first enemy to use a new skill on him during this time is given 'Emotional Possession'.",
                "description": "John Stewart gains 20 points of destructible defense for 1 turn. The first enemy to use a new skill on him during this time is given 'Emotional Possession'.",
                "descriptionHtml": "John Stewart gains 20 points of destructible defense for 1 turn.<br>The first enemy to use a new skill on him during this time is given 'Emotional Possession'.<br>",
                "energy": [
                    "Random"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 2,
                "cooldownHtml": "2",
                "classes": [
                    "Energy",
                    "Instant",
                    "Invisible"
                ],
                "classesHtml": "Energy, Instant, Invisible",
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "john_stewart_unseen_guard",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "destructibleDefensePoints": 20,
                            "triggerOnEnemyHarmfulSkill": true,
                            "counterEffectsToSourceOwner": [
                                {
                                    "type": "apply_status",
                                    "statusId": "john_stewart_emotional_possession",
                                    "duration": 2,
                                    "metadata": {
                                        "harmful": true,
                                        "turnEndDamage": 10,
                                        "afflictionDamage": true,
                                        "ignoreTargetDamageReduction": true,
                                        "ignoreTargetDestructibleDefense": true,
                                        "turnEndTrigger": "source_turn",
                                        "turnDurationAnchor": "source_turn",
                                        "mergeNumericAddKeys": [
                                            "turnEndDamage"
                                        ],
                                        "tooltipTextTemplate": "This character takes {turnEndDamage} affliction damage from Emotional Possession each John Stewart turn."
                                    }
                                }
                            ],
                            "tooltipText": "John Stewart has 20 destructible defense. The first enemy to use a new harmful skill on him gains Emotional Possession."
                        }
                    }
                ]
            },
            {
                "id": "john-stewart-passive-ultraviolet-lantern-ring",
                "name": "Passive: Ultraviolet Lantern Ring",
                "nameHtml": "Passive: Ultraviolet Lantern Ring",
                "skillimage": "https://i.imgur.com/PdrROxH.jpeg",
                "url": "https://i.imgur.com/PdrROxH.jpeg",
                "skilldescription": "The first enemy to use a new skill on John Stewart is given 'Emotional Possession' for 2 turns. This effect then goes on cooldown for 3 turns.",
                "description": "The first enemy to use a new skill on John Stewart is given 'Emotional Possession' for 2 turns. This effect then goes on cooldown for 3 turns.",
                "energy": [],
                "target": "",
                "damage": 0,
                "cooldown": 0,
                "cooldownHtml": "Passive",
                "classes": [
                    "Passive",
                    "Instant"
                ],
                "classesHtml": "Passive, Instant"
            },
            {
                "id": "john-stewart-emotional-possession",
                "name": "Emotional Possession",
                "nameHtml": "Emotional Possession",
                "skillimage": "https://i.imgur.com/5D8ltK0.jpeg",
                "url": "https://i.imgur.com/5D8ltK0.jpeg",
                "skilldescription": "Deals 10 affliction damage each turn for 2 turns. This cannot be ignored and increases its duration by 2 turns instead of stacking. If used by an enemy, this will cast this effect on them and replace itself with their original skill.",
                "description": "Deals 10 affliction damage each turn for 2 turns. This cannot be ignored and increases its duration by 2 turns instead of stacking. If used by an enemy, this will cast this effect on them and replace itself with their original skill.",
                "energy": [],
                "target": "self",
                "damage": 0,
                "cooldown": 0,
                "cooldownHtml": "None",
                "classes": [
                    "Energy",
                    "Ranged",
                    "Instant",
                    "Affliction"
                ],
                "classesHtml": "Energy, Ranged, Instant, Affliction",
                "effects": [
                    {
                        "type": "extend_status",
                        "targetStatusId": "john_stewart_emotional_possession",
                        "amount": 2,
                        "scope": "self",
                        "condition": {
                            "scope": "self",
                            "statusId": "john_stewart_emotional_possession"
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "john_stewart_emotional_possession",
                        "duration": 2,
                        "scope": "self",
                        "condition": {
                            "scope": "self",
                            "missingStatusId": "john_stewart_emotional_possession"
                        },
                        "metadata": {
                            "harmful": true,
                            "turnEndDamage": 10,
                            "afflictionDamage": true,
                            "ignoreTargetDamageReduction": true,
                            "ignoreTargetDestructibleDefense": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "mergeNumericAddKeys": [
                                "turnEndDamage"
                            ],
                            "tooltipTextTemplate": "This character takes {turnEndDamage} affliction damage from Emotional Possession each John Stewart turn."
                        }
                    },
                    {
                        "type": "cleanse_statuses",
                        "statusId": "john_stewart_mind_manipulation",
                        "count": 0,
                        "scope": "self"
                    }
                ]
            }
        ],
        "role": "Hybrid",
        "universe": "dc",
        "roleCategory": "hybrid"
    },
    {
        "id": "sorrow",
        "characterId": "sorrow",
        "name": "Sorrow",
        "nameHtml": "Sorrow",
        "facePicture": "https://i.imgur.com/1T6Wf9Y.jpeg",
        "url": "https://i.imgur.com/1T6Wf9Y.jpeg",
        "unlockRequirement": "None",
        "unlockRequirementHtml": "None",
        "characterdeescription": "Sorrow is a manipulative control fighter who weakens enemies through despair, punishment effects, and escalating Stack of Sorrow debuffs that make targets increasingly vulnerable.",
        "description": "Sorrow is a manipulative control fighter who weakens enemies through despair, punishment effects, and escalating Stack of Sorrow debuffs that make targets increasingly vulnerable.",
        "startStatuses": [
            {
                "statusId": "sorrow_grey_lantern_ring_passive",
                "duration": 99,
                "sourceSkillId": "sorrow-passive-grey-lantern-ring",
                "metadata": {
                    "infiniteDuration": true,
                    "lanternPassiveVisual": "grey-smoke",
                    "onAnyCharacterDeathApplyStatusToRandomEnemy": {
                        "statusId": "sorrow_stack",
                        "duration": 99,
                        "metadata": {
                            "infiniteDuration": true,
                            "lanternEffectVisual": "grey-smoke",
                            "sorrowStacks": 1,
                            "mergeNumericAddKeys": [
                                "sorrowStacks"
                            ],
                            "tooltipTextTemplate": "This character has {sorrowStacks} Stack(s) of Sorrow."
                        }
                    },
                    "tooltipText": "Every time any character dies, a random enemy gains a Stack of Sorrow."
                }
            }
        ],
        "skills": [
            {
                "id": "sorrow-mourning-claw",
                "name": "Mourning Claw",
                "nameHtml": "Mourning Claw",
                "skillimage": "https://i.imgur.com/Xj9tEOb.jpeg",
                "url": "https://i.imgur.com/Xj9tEOb.jpeg",
                "skilldescription": "Deals 35 damage to one enemy and consumes all Stacks of Sorrow to stun them for 1 turn per stack. This may only stun each character once per game.",
                "description": "Deals 35 damage to one enemy and consumes all Stacks of Sorrow to stun them for 1 turn per stack. This may only stun each character once per game.",
                "energy": [
                    "Genjutsu",
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 1,
                "cooldownHtml": "None",
                "classes": [
                    "Energy",
                    "Ranged",
                    "Instant"
                ],
                "classesHtml": "Energy, Ranged, Instant",
                "effects": [
                    {
                        "type": "damage",
                        "amount": 35,
                        "scope": "target"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "stunned",
                        "duration": 1,
                        "durationFromStatusMetadata": {
                            "scope": "target",
                            "statusId": "sorrow_stack",
                            "metadataKey": "sorrowStacks",
                            "multiplier": 1,
                            "minimum": 1
                        },
                        "scope": "target",
                        "condition": {
                            "scope": "target",
                            "statusId": "sorrow_stack",
                            "missingStatusId": "sorrow_mourning_claw_stunned_once"
                        },
                        "metadata": {
                            "harmful": true,
                            "cannotUseSkills": true,
                            "tooltipText": "This character is stunned by Mourning Claw."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "sorrow_mourning_claw_stunned_once",
                        "duration": 99,
                        "scope": "target",
                        "condition": {
                            "scope": "target",
                            "statusId": "sorrow_stack",
                            "missingStatusId": "sorrow_mourning_claw_stunned_once"
                        },
                        "metadata": {
                            "infiniteDuration": true,
                            "hideTooltip": true
                        }
                    },
                    {
                        "type": "cleanse_statuses",
                        "statusId": "sorrow_stack",
                        "count": 0,
                        "scope": "target"
                    }
                ]
            },
            {
                "id": "sorrow-sorrow-spikes",
                "name": "Sorrow Spikes",
                "nameHtml": "Sorrow Spikes",
                "skillimage": "https://i.imgur.com/ubRYRX3.jpeg",
                "url": "https://i.imgur.com/ubRYRX3.jpeg",
                "skilldescription": "Marks an enemy for 1 turn. If this character does not use a new skill, they take 25 piercing damage and gain a Stack of Sorrow.",
                "description": "Marks an enemy for 1 turn. If this character does not use a new skill, they take 25 piercing damage and gain a Stack of Sorrow.",
                "energy": [
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 2,
                "cooldownHtml": "2",
                "classes": [
                    "Energy",
                    "Ranged",
                    "Instant",
                    "Invisible"
                ],
                "classesHtml": "Energy, Ranged, Instant, Invisible",
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "sorrow_spikes_mark",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "onOwnerUseSkillTrigger": true,
                            "removeStatusIdsOnOwnerUseSkill": [
                                "sorrow_spikes_mark"
                            ],
                            "onExpireEffects": [
                                {
                                    "type": "damage",
                                    "amount": 25,
                                    "metadata": {
                                        "ignoreDamageReduction": true
                                    }
                                },
                                {
                                    "type": "apply_status",
                                    "statusId": "sorrow_stack",
                                    "duration": 99,
                                    "metadata": {
                                        "infiniteDuration": true,
                                        "lanternEffectVisual": "grey-smoke",
                                        "sorrowStacks": 1,
                                        "mergeNumericAddKeys": [
                                            "sorrowStacks"
                                        ],
                                        "tooltipTextTemplate": "This character has {sorrowStacks} Stack(s) of Sorrow."
                                    }
                                }
                            ],
                            "tooltipText": "If this character does not use a new skill, they take 25 piercing damage and gain a Stack of Sorrow."
                        }
                    }
                ]
            },
            {
                "id": "sorrow-depression-orb",
                "name": "Depression Coffin",
                "nameHtml": "Depression Coffin",
                "skillimage": "https://i.imgur.com/fBlXOmL.jpeg",
                "url": "https://i.imgur.com/fBlXOmL.jpeg",
                "skilldescription": "Marks an enemy for 1 turn. If this character uses a new skill, that skill deals 25 less damage and they gain a Stack of Sorrow.",
                "description": "Marks an enemy for 1 turn. If this character uses a new skill, that skill deals 25 less damage and they gain a Stack of Sorrow.",
                "energy": [
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 2,
                "cooldownHtml": "2",
                "classes": [
                    "Energy",
                    "Ranged",
                    "Instant",
                    "Invisible"
                ],
                "classesHtml": "Energy, Ranged, Instant, Invisible",
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "sorrow_depression_orb_mark",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "onOwnerUseSkillTrigger": true,
                            "onOwnerUseSkillApplyStatusesToOwner": [
                                {
                                    "statusId": "sorrow_depression_orb_damage_debuff",
                                    "duration": 1,
                                    "metadata": {
                                        "harmful": true,
                                        "DamageDebuff": 25,
                                        "tooltipText": "This character's next skill deals 25 less damage."
                                    }
                                },
                                {
                                    "statusId": "sorrow_stack",
                                    "duration": 99,
                                    "metadata": {
                                        "harmful": true,
                                        "infiniteDuration": true,
                                        "lanternEffectVisual": "grey-smoke",
                                        "sorrowStacks": 1,
                                        "mergeNumericAddKeys": [
                                            "sorrowStacks"
                                        ],
                                        "tooltipTextTemplate": "This character has {sorrowStacks} Stack(s) of Sorrow."
                                    }
                                }
                            ],
                            "tooltipText": "If this character uses a new skill, that skill deals 25 less damage and they gain a Stack of Sorrow."
                        }
                    }
                ]
            },
            {
                "id": "sorrow-tornado-of-grief",
                "name": "Tornado of Grief",
                "nameHtml": "Tornado of Grief",
                "skillimage": "https://i.imgur.com/RwWrRqW.jpeg",
                "url": "https://i.imgur.com/RwWrRqW.jpeg",
                "skilldescription": "Sorrow becomes invulnerable for 1 turn and grants one enemy a Stack of Sorrow.",
                "description": "Sorrow becomes invulnerable for 1 turn and grants one enemy a Stack of Sorrow.",
                "energy": [
                    "Random"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 4,
                "cooldownHtml": "4",
                "classes": [
                    "Energy",
                    "Instant"
                ],
                "classesHtml": "Energy, Instant",
                "effects": [
                    {
                        "type": "apply_status",
                        "statusId": "sorrow_tornado_of_grief_invulnerable",
                        "duration": 1,
                        "scope": "self",
                        "metadata": {
                            "invulnerable": true,
                            "tooltipText": "Sorrow is invulnerable."
                        }
                    },
                    {
                        "type": "apply_status",
                        "statusId": "sorrow_stack",
                        "duration": 99,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "infiniteDuration": true,
                            "lanternEffectVisual": "grey-smoke",
                            "sorrowStacks": 1,
                            "mergeNumericAddKeys": [
                                "sorrowStacks"
                            ],
                            "tooltipTextTemplate": "This character has {sorrowStacks} Stack(s) of Sorrow."
                        }
                    }
                ]
            },
            {
                "id": "sorrow-passive-grey-lantern-ring",
                "name": "Passive: Grey Lantern Ring",
                "nameHtml": "Passive: Grey Lantern Ring",
                "skillimage": "https://i.imgur.com/y8mSovk.jpeg",
                "url": "https://i.imgur.com/y8mSovk.jpeg",
                "skilldescription": "Every time any character dies, a random enemy gains a Stack of Sorrow.",
                "description": "Every time any character dies, a random enemy gains a Stack of Sorrow.",
                "energy": [],
                "target": "",
                "damage": 0,
                "cooldown": 0,
                "cooldownHtml": "Passive",
                "classes": [
                    "Passive",
                    "Instant"
                ],
                "classesHtml": "Passive, Instant"
            },
            {
                "id": "sorrow-stack-of-sorrow",
                "name": "Stack of Sorrow",
                "nameHtml": "Stack of Sorrow",
                "hiddenFromSelectionViewer": true,
                "skillimage": "https://i.imgur.com/41ChnWv.png",
                "url": "https://i.imgur.com/41ChnWv.png",
                "skilldescription": "A lingering burden of grief and despair that amplifies the effects of Sorrow's abilities.",
                "description": "A lingering burden of grief and despair that amplifies the effects of Sorrow's abilities.",
                "energy": [],
                "target": "",
                "damage": 0,
                "cooldown": 0,
                "cooldownHtml": "None",
                "classes": [
                    "Skill"
                ],
                "classesHtml": "Skill"
            }
        ],
        "role": "Hybrid",
        "universe": "dc",
        "roleCategory": "hybrid"
    }
];

if (typeof module !== 'undefined') {
    module.exports = characters;
}
