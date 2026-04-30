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
                "skilldescription": "Deals 13 damage to one enemy per turn for 2 turns. If Overcharge is active, this instead deals 28 energy damage and stuns the target for 1 turn.",
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
                            "turnEndDamage": 13,
                            "triggerOnApply": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "ongoingClass": "action",
                            "tooltipText": "This character takes 13 damage each turn."
                        }
                    },
                    {
                        "type": "damage",
                        "amount": 28,
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
                    "Chakra",
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
        ]
    },
    {
        "id": "spider-man",
        "characterId": "spider-man",
        "name": "Spider-Man",
        "facePicture": "https://i.imgur.com/P6HqSu0.png",
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
                "skillimage": "https://i.imgur.com/nlYDkTI.png",
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
                "skillimage": "https://i.imgur.com/tubyiRo.png",
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
                "skillimage": "https://i.imgur.com/6lWrM2t.png",
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
                "skillimage": "https://i.imgur.com/7gcVo5T.png",
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
                "skillimage": "https://i.imgur.com/Ucz75UH.png",
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
        ]
    },
    {
        "id": "captain-america",
        "characterId": "captain-america",
        "name": "Captain America",
        "facePicture": "https://i.imgur.com/hdlwp4G.png",
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
                "skillimage": "https://i.imgur.com/evOMqYo.png",
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
                "skillimage": "https://i.imgur.com/tMxWAWJ.png",
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
                "skillimage": "https://i.imgur.com/rV2vZHe.png",
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
                "skillimage": "https://i.imgur.com/360RvnV.png",
                "skilldescription": "Captain America or one ally ignores all enemy non-mental skills for 1 turn. Reflects 25% of all non-mental damage directed at the character affected by this skill back at the attacker. This skill is invisible and cycles its cost between red/white/blue each turn.",
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
                ]
            },
            {
                "id": "captain_america_america_shield_passive2",
                "name": "Passive: America's Shield",
                "skillimage": "https://i.imgur.com/kNCwURs.png",
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
        ]
    },
    {
        "id": "superman",
        "characterId": "superman",
        "name": "Superman",
        "facePicture": "https://i.imgur.com/qxxeJxM.png",
        "startStatuses": [
            {
                "statusId": "superman_the_man_of_steel_passive",
                "sourceSkillId": "superman-passive-the-man-of-steel",
                "duration": 999,
                "metadata": {
                    "infiniteDuration": true,
                    "unpierceableDamageReductionFlat": 10,
                    "tooltipText": "Superman has 10 unpierceable damage reduction."
                }
            }
        ],
        "characterdeescription": "Superman plays as a tempo enforcer—opening fights with debilitating control like Frost Breath, then following with consistent, unavoidable damage from Laser Eyes and Solar Flare to wear down entire teams. His Man of Steel passive anchors everything, giving him the durability to stay aggressive longer than most damage dealers",
        "skills": [
            {
                "id": "superman-laser-eyes",
                "name": "Laser Eyes",
                "skillimage": "https://i.imgur.com/TD7qGDJ.png",
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
                "skillimage": "https://i.imgur.com/OdxIs9J.png",
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
                "skillimage": "https://i.imgur.com/oNMuLXK.png",
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
                "skillimage": "https://i.imgur.com/59xjdEo.png",
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
                "skillimage": "https://i.imgur.com/BDerCDI.png",
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
                "skillimage": "https://i.imgur.com/TD7qGDJ.png",
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
                "skillimage": "https://i.imgur.com/OdxIs9J.png",
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
        ]
    },
    {
        "id": "batman",
        "characterId": "batman",
        "name": "Batman",
        "facePicture": "https://i.imgur.com/lFB3seb.png",
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
                "skillimage": "https://i.imgur.com/8EK9yEi.png",
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
                "skillimage": "https://i.imgur.com/4Pr0xxy.png",
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
                "skillimage": "https://i.imgur.com/7PwWb6Z.png",
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
                "skillimage": "https://i.imgur.com/NA1Udzh.png",
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
                "skillimage": "https://i.imgur.com/QPcJuMv.png",
                "skilldescription": "For 1 turn, the first non-mental harmful skill used on Batman is reflected onto a random enemy. This skill is invisible. This skill then swaps back to 'Grappling Hook'.",
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
                ]
            },
            {
                "id": "batman-smoke-bomb",
                "name": "Smoke Bomb",
                "skillimage": "https://i.imgur.com/WmwINXG.png",
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
                "skillimage": "https://i.imgur.com/C7eIM8u.png",
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
                "skillimage": "https://i.imgur.com/czU1Ikq.png",
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
        ]
    },
    {
        "id": "the-flash-barry-allen",
        "characterId": "the-flash-barry-allen",
        "name": "The Flash (Barry Allen)",
        "facePicture": "https://i.imgur.com/X3TO0hk.png",
        "characterdeescription": "The Flash dominates the pace of battle through unmatched speed and relentless momentum. Rather than relying on raw durability, he overwhelms opponents by acting faster, striking repeatedly, and disrupting their ability to keep up. His abilities create rapid pressure windows, forcing enemies into reactive play while he dictates the flow of combat. With tools that accelerate his own actions and interfere with enemy timing, The Flash thrives in fast-paced encounters where every second matters. He can evade danger, reset momentum, and enable his team to act more efficiently, turning brief openings into decisive advantages.",
        "skills": [
            {
                "id": "the-flash-barry-allen-infinite-mass-punch",
                "name": "Infinite Mass Punch",
                "skillimage": "https://i.imgur.com/vwUOYsd.png",
                "skilldescription": "Deals 45 piercing damage to one enemy. If The Flash has 'Speed Up' this skill cannot be countered or reflected and ignores invulnerability.",
                "energy": [
                    "Taijutsu",
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
                        "amount": 45,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageReduction": true
                        }
                    }
                ]
            },
            {
                "id": "the-flash-barry-allen-lightning-rush",
                "name": "Lightning Rush",
                "skillimage": "https://i.imgur.com/ZlN4KC4.png",
                "skilldescription": "The Flash strikes one enemy 4 times in quick succession, dealing 5 damage each time. Each hit has a 25% chance to apply 'Shock': dealing 3 piercing damage for 4 turns. The Flash gains 'Speed Up' for 1 turn.",
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
                            "turnEndDamage": 3,
                            "ignoreTargetDamageReduction": true,
                            "ignoreTargetDestructibleDefense": true,
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
                            "turnEndDamage": 3,
                            "ignoreTargetDamageReduction": true,
                            "ignoreTargetDestructibleDefense": true,
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
                            "turnEndDamage": 3,
                            "ignoreTargetDamageReduction": true,
                            "ignoreTargetDestructibleDefense": true,
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
                            "turnEndDamage": 3,
                            "ignoreTargetDamageReduction": true,
                            "ignoreTargetDestructibleDefense": true,
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
                "skillimage": "https://i.imgur.com/laG0u0X.png",
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
                "skillimage": "https://i.imgur.com/ovup1JS.png",
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
                "skillimage": "https://i.imgur.com/teE3m1U.png",
                "skilldescription": "The Flash resets his team's cooldowns and heals them 25 HP. This skill ignores invulnerability.",
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
                    "Instant"
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
                ]
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
                "skilldescription": "Deals 45 piercing damage to one enemy. This skill cannot be countered or reflected and ignores invulnerability while Speed Up is active.",
                "energy": [
                    "Taijutsu",
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
                        "amount": 45,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageReduction": true
                        }
                    }
                ]
            }
        ]
    },
    {
        "id": "aquaman",
        "characterId": "aquaman",
        "name": "Aquaman",
        "facePicture": "https://i.imgur.com/lUWpCxK.png",
        "characterdeescription": "Ruler of Atlantis and master of the oceans, Aquaman dominates the battlefield through relentless pressure and crushing tidal control. Wielding his legendary trident, he marks enemies for punishment, drags them beneath the waves, and unleashes swarms of sea creatures to finish them off. Whether shielding himself with rushing currents or drowning foes in mounting afflictions, Aquaman excels at overwhelming teams that rely on defense or invulnerability.",
        "skills": [
            {
                "id": "aquaman-trident-strike",
                "name": "Trident Strike",
                "skillimage": "https://i.imgur.com/jWzBCve.png",
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
                "skillimage": "https://i.imgur.com/OnxjSgd.png",
                "skilldescription": "Aquaman forces one enemy's head underwater, removing 1 random energy from them and dealing 15 affliction damage. If they are marked by 'Trident Strike', they are given a stack of 'Sea Sharks'.",
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
                        "duration": 99,
                        "scope": "target",
                        "condition": {
                            "statusId": "aquaman_trident_strike_mark",
                            "scope": "target"
                        },
                        "metadata": {
                            "harmful": true,
                            "infiniteDuration": true,
                            "turnEndDamage": 5,
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
                "skillimage": "https://i.imgur.com/VepAJ8X.png",
                "skilldescription": "Aquaman makes the enemy team unable to reduce damage or become invulnerable, increases their cooldowns by 1 and their energy costs by 1 random energy for 2 turns. When this skill ends, they have their harmful skills stunned for 1 turn and are granted a stack of 'Sea Sharks'. If an enemy is marked by 'Trident Strike' at the end of the second turn, they take 30 damage.",
                "energy": [
                    "Ninjutsu",
                    "Ninjutsu"
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
                        "statusId": "hyuuga_hinata_gentle_fist_cost_lock",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "randomCostIncrease": 1,
                            "tooltipText": "This character's skills cost 1 additional random energy."
                        }
                    },
                    null,
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
                                    "duration": 99,
                                    "metadata": {
                                        "harmful": true,
                                        "infiniteDuration": true,
                                        "turnEndDamage": 5,
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
                "skillimage": "https://i.imgur.com/DEowat1.png",
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
                        "duration": 99,
                        "scope": "all-enemy",
                        "metadata": {
                            "harmful": true,
                            "infiniteDuration": true,
                            "turnEndDamage": 5,
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
                "skillimage": "https://i.imgur.com/TYkjQdu.png",
                "skilldescription": "Deals 5 piercing damage permanently (stacks).",
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
        ]
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
                "skilldescription": "Storm calls down lightning, dealing 30 piercing damage to one enemy and fully stunning them for 1 turn. If 'Rainstorm' is active, this also deals 10 piercing damage to all other enemies and ignores invulnerability.",
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
                "skilldescription": "Storm heals her entire team for 12 HP per turn for 4 turns. While active, this becomes 'Hailstorm' and Storm's skills are improved. This skill ignores invulnerability.",
                "energy": [
                    "Ninjutsu"
                ],
                "target": "all-allies",
                "damage": 0,
                "cooldown": 4,
                "classes": [
                    "Energy",
                    "Instant"
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
                ]
            },
            {
                "id": "storm-ice-barrier",
                "name": "Ice Barrier",
                "skillimage": "https://i.imgur.com/fsSRHNk.png",
                "skilldescription": "Storm targets herself or one ally, countering the first enemy skill used on them for 1 turn. If triggered, the ally gains 15 points of permanent destructible defense. This skill is invisible until triggered.",
                "energy": [
                    "random"
                ],
                "target": "self-or-single-ally",
                "damage": 0,
                "cooldown": 3,
                "classes": [
                    "Energy",
                    "Instant"
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
                ]
            },
            {
                "id": "storm-hailstorm",
                "name": "Hailstorm",
                "skillimage": "https://i.imgur.com/HPsujWh.png",
                "skilldescription": "For 4 turns, all enemies take 8 damage per turn. On turn 2 of this skill, their harmful skills are stunned for 1 turn. On turn 4 of this skill, their helpful skills are stunned for 1 turn. This skill ignores invulnerability.",
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
                    "Instant"
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
                ]
            },
            {
                "id": "storm-lightning-strike-rainstorm",
                "name": "Lightning Strike",
                "hiddenFromSelectionViewer": true,
                "useBaseSkillCooldown": true,
                "skillimage": "https://i.imgur.com/cIQ7sTM.png",
                "skilldescription": "Storm calls down lightning, dealing 30 piercing damage to one enemy and fully stunning them for 1 turn. This also deals 10 piercing damage to all other enemies and ignores invulnerability.",
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
                    "Instant"
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
                ]
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
        ]
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
        ]
    },
    {
        "id": "the-joker",
        "characterId": "the-joker",
        "name": "The Joker",
        "facePicture": "https://i.imgur.com/DSEdkUO.png",
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
                "skilldescription": "Targets one enemy for 1 turn, countering them if they use a new harmful skill. If successful, silence their harmful skills for 2 turns. This is invisible. Swaps to 'Remote Bomb'.",
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
                        "type": "apply_status",
                        "statusId": "the_joker_chattering_teeth_trap",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "triggerOnEnemyHarmfulSkill": true,
                            "counterCancelsSkill": true,
                            "counterStatusId": "the_joker_chattering_teeth_silence",
                            "counterStatusDuration": 2,
                            "counterStatusMetadata": {
                                "harmful": true,
                                "cannotUseHarmfulSkills": true,
                                "tooltipText": "This character harmful skills are silenced."
                            },
                            "hideTooltipFromEnemy": true,
                            "tooltipText": "If this character uses a new harmful skill this turn, it is countered and their harmful skills are silenced for 2 turns."
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
        ]
    },
    {
        "id": "negan",
        "characterId": "negan",
        "name": "Negan",
        "facePicture": "https://i.imgur.com/csZvbwl.png",
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
                "skilldescription": "Negan cuts open an enemy's bowels, dealing 10 piercing damage and then 5 piercing damage the following 3 turns. While affected, if the target's HP falls to 15 or less they are executed. This ends on the previous target if used on a new one.",
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
                        "amount": 0,
                        "scope": "target",
                        "metadata": {
                            "ignoreDamageReduction": true
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
                            "turnEndDamage": 5,
                            "ignoreTargetDamageReduction": true,
                            "turnEndTrigger": "source_turn",
                            "executeBelowHpThreshold": 15,
                            "tooltipText": "This character takes 5 piercing damage and is executed if their HP falls to 15 or below. This will end if Negan uses this on a new target."
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
        ]
    },
    {
        "id": "rick-grimes",
        "characterId": "rick-grimes",
        "name": "Rick Grimes",
        "facePicture": "https://i.imgur.com/4p90X9r.png",
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
                "energy": [],
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
                "skilldescription": "Rick slashes an enemy's throat, dealing 10 damage this turn then making them bleed 10 affliction damage next turn. While bleeding, the target's harmful skills are silenced, '.357 Revolver' cannot miss them, and has a 15% bonus chance to 'Headshot'.",
                "energy": [
                    "Random"
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
                        "type": "damage",
                        "amount": 10,
                        "scope": "target"
                    },
                    {
                        "type": "apply_status",
                        "statusId": "rick_grimes_throat_slit_bleed",
                        "duration": 1,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "cannotUseHarmfulSkills": true,
                            "turnEndDamage": 10,
                            "afflictionDamage": true,
                            "ignoreTargetDamageReduction": true,
                            "ignoreTargetDestructibleDefense": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "tooltipText": "This character will take 10 affliction damage next turn, their harmful skills are silenced, Rick's .357 Revolver cannot miss them, and it has a 40% chance to Headshot them."
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
        ]
    },
    {
        "id": "andrea",
        "characterId": "andrea",
        "name": "Andrea",
        "facePicture": "https://i.imgur.com/MECXiBj.png",
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
        ]
    },
    {
        "id": "walker",
        "characterId": "walker",
        "name": "Walker",
        "facePicture": "https://i.imgur.com/NqFhNs6.png",
        "characterdeescription": "Walker is an undead vanguard spawned from the endless hunger of the infected masses. On a team, Walker functions as a scaling pressure engine and anti-healing disruptor, gradually overwhelming enemies through persistent damage and infection. He excels in longer fights, where his effects stack and compound, forcing opponents into a losing war of attrition.",
        "skills": [
            {
                "id": "walker-infected-horde",
                "name": "Infected Horde",
                "skillimage": "https://i.imgur.com/e4sEkft.png",
                "skilldescription": "For the rest of the game, Walker and his team gain 10 damage reduction and the enemy team takes 10 damage at the end of Walker's turns. The next Surprise Chomp or Overpower Walker uses will target all enemies. This effect stacks up to 3 times and ends when Walker dies.",
                "energy": [
                    "Random",
                    "Random",
                    "Random"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 2,
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
                            "onOwnerUseSkillClassesAny": [
                                "melee"
                            ],
                            "skillReplacements": {
                                "walker-surprise-chomp": "walker-surprise-chomp-all",
                                "walker-overpower": "walker-overpower-all"
                            },
                            "tooltipText": "Walker's next Surprise Chomp or Overpower targets all enemies."
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
                            "healReceivedMultiplier": 0.75,
                            "healReceivedMultiplierWhenOwnerCurrentHpAtMostThreshold": 40,
                            "healReceivedMultiplierWhenOwnerCurrentHpAtMost": 0.5,
                            "bonusDamageFromSourceCharacterId": "walker",
                            "bonusDamageAppliesToSkillIds": [
                                "walker-surprise-chomp",
                                "walker-surprise-chomp-all"
                            ],
                            "bonusDamageFromSourceSkillsFlat": 5,
                            "tooltipText": "This character takes 2 affliction damage each turn, receives 25% less healing or 50% less healing at 40 HP or below, and Walker's Surprise Chomp steals 5 additional HP from them."
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
                "skilldescription": "This character takes 2 affliction damage every turn, receives 25% less healing or 50% less healing at 40 HP or below, and Walker's Surprise Chomp steals 5 additional HP from them. This effect does not stack.",
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
                            "healReceivedMultiplier": 0.75,
                            "healReceivedMultiplierWhenOwnerCurrentHpAtMostThreshold": 40,
                            "healReceivedMultiplierWhenOwnerCurrentHpAtMost": 0.5,
                            "bonusDamageFromSourceCharacterId": "walker",
                            "bonusDamageAppliesToSkillIds": [
                                "walker-surprise-chomp",
                                "walker-surprise-chomp-all"
                            ],
                            "bonusDamageFromSourceSkillsFlat": 5,
                            "tooltipText": "This character takes 2 affliction damage each turn, receives 25% less healing or 50% less healing at 40 HP or below, and Walker's Surprise Chomp steals 5 additional HP from them."
                        }
                    }
                ]
            },
            {
                "id": "walker-group-banquet-all",
                "name": "Group Banquet",
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
            }
        ]
    },
    {
        "id": "hershel-greene",
        "characterId": "hershel-greene",
        "name": "Hershel Greene",
        "facePicture": "https://i.imgur.com/A4uAHH9.png",
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
                    "Random"
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
                "skilldescription": "Hershel activates this skill. Each time an ally dies, at the start of your next turn, choose one of the following: 1. Heal an ally 35 HP. 2. Remove all harmful damaging skills on an ally. 3. Revive a dead ally to 30 HP. Only activates once per turn and can only activate twice in a game.",
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
                                    "label": "Heal an ally 35 HP",
                                    "targetStrategy": "alive-ally-lowest-hp",
                                    "effect": {
                                        "type": "heal",
                                        "amount": 35
                                    }
                                },
                                {
                                    "key": "cleanse",
                                    "label": "Remove harmful damaging skills",
                                    "targetStrategy": "alive-ally-most-harmful",
                                    "effect": {
                                        "type": "cleanse_harmful",
                                        "count": 0
                                    }
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
                    "Random"
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
        ]
    },
    {
        "id": "invincible",
        "characterId": "invincible",
        "name": "Invincible",
        "facePicture": "https://i.imgur.com/vNO0ebm.png",
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
                "skillimage": "https://i.imgur.com/HowF8NS.png",
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
                "skillimage": "https://i.imgur.com/MZHQ6n3.png",
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
                "skillimage": "https://i.imgur.com/lv18VL8.png",
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
                "skillimage": "https://i.imgur.com/0ZS3Gfm.png",
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
                "skillimage": "https://i.imgur.com/5wQuvL7.png",
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
                "skillimage": "https://i.imgur.com/1eD58MB.png",
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
        ]
    },
    {
        "id": "rex-splode",
        "characterId": "rex-splode",
        "name": "Rex Splode",
        "facePicture": "https://i.imgur.com/sYSm26V.png",
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
                "skillimage": "https://i.imgur.com/Vqrh1D8.png",
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
                "skillimage": "https://i.imgur.com/51ENwBD.png",
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
                "skillimage": "https://i.imgur.com/LrqRUVL.png",
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
                "skillimage": "https://i.imgur.com/EbbHfy2.png",
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
                "skillimage": "https://i.imgur.com/gOwnLXF.png",
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
        ]
    },
    {
        "id": "atom-eve",
        "characterId": "atom-eve",
        "name": "Atom Eve",
        "facePicture": "https://i.imgur.com/Gsfj3gN.png",
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
                "skillimage": "https://i.imgur.com/Q9Pbq4F.png",
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
                "skillimage": "https://i.imgur.com/Fa6bU6r.png",
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
                "skillimage": "https://i.imgur.com/268NZqY.png",
                "skilldescription": "Eve grants her entire team 20 points of destructible defense for 1 turn. This skill is invisible.",
                "energy": [
                    "Random",
                    "Random"
                ],
                "target": "all-allies",
                "damage": 0,
                "cooldown": 2,
                "classes": [
                    "Energy",
                    "Instant"
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
                ]
            },
            {
                "id": "atom-eve-molecule-battle-armor",
                "name": "Molecule Battle Armor",
                "skillimage": "https://i.imgur.com/rwhfkYI.png",
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
                "skillimage": "https://i.imgur.com/2GW1mrj.png",
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
                "skillimage": "https://i.imgur.com/lT7gHa3.png",
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
        ]
    },
    {
        "id": "omni-man",
        "characterId": "omni-man",
        "name": "Omni-Man",
        "facePicture": "https://i.imgur.com/YwXook2.png",
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
                "skillimage": "https://i.imgur.com/gVtgAob.png",
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
                "skillimage": "https://i.imgur.com/sZ1V2HR.png",
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
                "skillimage": "https://i.imgur.com/nOu6M16.png",
                "skilldescription": "Omni-Man gains 50% unpierceable damage reduction and taunts one enemy for 1 turn. This ignores invulnerability. This cannot be used on an enemy that had this skill used on them last turn.",
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
                    "Instant"
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
                ]
            },
            {
                "id": "omni-man-omni-guard",
                "name": "Omni-Guard",
                "skillimage": "https://i.imgur.com/CfSDPu2.png",
                "skilldescription": "Omni-Man targets one enemy for 1 turn, countering them if they use a new harmful skill. If successful, Omni-Man deals 10 additional damage permanently. This skill is invisible.",
                "energy": [
                    "Random"
                ],
                "target": "single-enemy",
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
                ]
            },
            {
                "id": "omni-man-passive-omni-rage",
                "name": "Passive: Omni-Rage",
                "skillimage": "https://i.imgur.com/3kXPrrT.png",
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
        ]
    },
    {
        "id": "angstrom-levy",
        "characterId": "angstrom-levy",
        "name": "Angstrom Levy",
        "facePicture": "https://i.imgur.com/Rg974iR.png",
        "characterdeescription": "Levy controls the tempo of combat by manipulating space and timing. His portals counter enemy abilities, banish priority targets, and create openings for his team to strike safely. Enemies who act without caution risk being erased from the battlefield entirely, making Angstrom a constant threat to coordinated teams.",
        "skills": [
            {
                "id": "angstrom-levy-spy-drones",
                "name": "Spy Drones",
                "skillimage": "https://i.imgur.com/Wyhuo5P.png",
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
                "skillimage": "https://i.imgur.com/Lafh95q.png",
                "skilldescription": "Targets one enemy for 1 turn, and if they use a new harmful skill they will be countered. If successful, 'Dimension Abandon' will be cast on the target. This skill is invisible.",
                "energy": [
                    "Taijutsu"
                ],
                "target": "single-enemy",
                "damage": 0,
                "cooldown": 2,
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
                ]
            },
            {
                "id": "angstrom-levy-multi-dimensional-rifts",
                "name": "Multi-Dimensional Rifts",
                "skillimage": "https://i.imgur.com/oEhNlWW.png",
                "skilldescription": "For 2 turns, 'Sneaky Portal' is cast on one random enemy each turn and 'Portal Save' has its cooldown reset. While active, 'Spy Drones' will have no cooldown. This skill is invisible.",
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
                    "Instant"
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
                ]
            },
            {
                "id": "angstrom-levy-portal-save",
                "name": "Portal Save",
                "skillimage": "https://i.imgur.com/xoNB4ZG.png",
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
                "skillimage": "https://i.imgur.com/JK3dEhh.png",
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
        ]
    },
    {
        "id": "doctor-octopus",
        "characterId": "doctor-octopus",
        "name": "Doctor Octopus",
        "facePicture": "https://i.imgur.com/0rcAM48.png",
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
        ]
    },
    {
        "id": "carnage",
        "characterId": "carnage",
        "name": "Carnage",
        "facePicture": "https://i.imgur.com/ECJOkvk.png",
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
                "skilldescription": "Deals 35 piercing damage to one enemy. Carnage loses 15 HP. This skill cannot be countered or reflected. This executes enemies that fall to 15 HP or less during 'Blood Slinging'.",
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
                "cannotBeCountered": true,
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
                ]
            },
            {
                "id": "carnage-wide-area-cutting",
                "name": "Wide-Area Cutting",
                "skillimage": "https://i.imgur.com/9H59XyW.png",
                "skilldescription": "Deals 25 piercing damage to the enemy team. Carnage loses 15 HP. This skill cannot be countered or reflected. This executes enemies that fall to 5 HP or less during 'Blood Slinging'.",
                "energy": [
                    "Bloodline",
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
                "cannotBeCountered": true,
                "effects": [
                    {
                        "type": "damage",
                        "amount": 25,
                        "scope": "all-enemy",
                        "metadata": {
                            "ignoreDamageReduction": true,
                            "ignoreDestructibleDefense": true
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
                ]
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
        ]
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
                    "tooltipText": "Whenever one of Green Goblin's skills comes off cooldown, he has a 15% chance to plant a Bomb on a random enemy for 2 turns. If that enemy uses a harmful skill, or when the Bomb ends, Green Goblin deals 15 affliction damage to the enemy team.",
                    "onOwnerSkillCooldownFinishedApplyStatusToRandomEnemy": {
                        "statusId": "the_green_goblin_mad_bomber_bomb",
                        "duration": 2,
                        "chancePercent": 15,
                        "sourceSkillId": "the-green-goblin-passive-mad-bomber",
                        "metadata": {
                            "harmful": true,
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
                "skilldescription": "The Green Goblin has a 15% chance to toss a Bomb onto a random enemy for 2 turns whenever he has a skill come off of cooldown. If the target uses a harmful skill → Bomb explodes (15 affliction damage AoE). If it expires → explodes anyway.",
                "energy": [],
                "target": "",
                "damage": 0,
                "cooldown": 0,
                "classes": [
                    "Passive",
                    "Instant"
                ]
            }
        ]
    },
    {
        "id": "sandman",
        "characterId": "sandman",
        "name": "Sandman",
        "facePicture": "https://i.imgur.com/pJj5Wz0.png",
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
                "skilldescription": "Target an ally, granting them 20 destructible defense and himself 10 destructible defense for 1 turn. Sandman and the Ally will swap places. This skill is invisible to the enemy for 1 turn.",
                "energy": [
                    "Genjutsu"
                ],
                "target": "ally",
                "damage": 0,
                "cooldown": 2,
                "classes": [
                    "Physical",
                    "Instant"
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
                ]
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
                "skilldescription": "Sandman ignores all enemy physical skills for 2 turns. This effect is invisible on its first turn.",
                "energy": [
                    "Random",
                    "Random"
                ],
                "target": "self",
                "damage": 0,
                "cooldown": 5,
                "classes": [
                    "Physical",
                    "Instant"
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
                ]
            },
            {
                "id": "sandman-sand-body-exit",
                "name": "Sand Body Exit",
                "skillimage": "https://i.imgur.com/LLIk8Nu.png",
                "skilldescription": "Deals 45 affliction damage to the enemy marked by 'Sand Body Enter'. This skill ignores invulnerability and cannot be reflected.",
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
                    "Affliction"
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
                ]
            }
        ]
    },
    {
        "id": "mysterio",
        "characterId": "mysterio",
        "name": "Mysterio",
        "facePicture": "https://i.imgur.com/QOsgmSs.png",
        "characterdeescription": "Mysterio excels at destabilizing the battlefield through deception, punishing enemies for acting without caution. Rather than directly overpowering opponents, he manipulates outcomes—redirecting abilities, setting hidden traps, and turning enemy decisions against them. With tools that reward prediction and punish routine play.",
        "skills": [
            {
                "id": "mysterio-illusion-of-choice",
                "name": "Illusion of Choice",
                "skillimage": "https://i.imgur.com/L6xYXGc.png",
                "skilldescription": "Mysterio targets one enemy for 1 turn. During this time, their next harmful skill will be reflected to a random enemy and their next helpful skill will be re-directed to a random ally. This skill is invisible to the target team.",
                "energy": [
                    "Genjutsu"
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
                ]
            },
            {
                "id": "mysterio-script-rewrite",
                "name": "Script Rewrite",
                "skillimage": "https://i.imgur.com/pt6KJHc.png",
                "skilldescription": "Mysterio targets one enemy for 2 turns. If they use a new harmful skill, they take 30 affliction damage, their cooldown is increased by 1, and this trap is consumed. This skill is invisible. This cannot be used on an already affected enemy.",
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
                    "Affliction"
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
                ]
            },
            {
                "id": "mysterio-hall-of-mirrors",
                "name": "Hall of Mirrors",
                "skillimage": "https://i.imgur.com/MV1gA5Q.png",
                "skilldescription": "For 2 turns, your team gains 30% evasion. This skill is invisible on its first turn.",
                "energy": [
                    "Ninjutsu",
                    "Genjutsu"
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
                ]
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
        ]
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
        ]
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
                    "turnEndApplyStatusToSelf": {
                        "statusId": "green_lantern_hal_jordan_green_lantern_ring_damage_bonus",
                        "duration": 99,
                        "metadata": {
                            "infiniteDuration": true,
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
        ]
    },
    {
        "id": "homelander",
        "characterId": "homelander",
        "name": "Homelander",
        "facePicture": "HOMELANDER_IMAGE_URL",
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
                "skillimage": "LASER_IMAGE_URL",
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
                "skillimage": "FLYING_IMAGE_URL",
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
                "skillimage": "FIST_IMAGE_URL",
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
                "skillimage": "BODY_IMAGE_URL",
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
                "skillimage": "PASSIVE_IMAGE_URL",
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
                "hiddenFromSelectionViewer": true,
                "useBaseSkillCooldown": true,
                "skillimage": "LASER_IMAGE_URL",
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
        ]
    },
    {
        "id": "predator-stalker",
        "characterId": "predator-stalker",
        "name": "Predator Stalker",
        "facePicture": "PREDATOR_IMAGE_URL",
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
                "skillimage": "SHURIKEN_IMAGE_URL",
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
                            "copyTargetKeyToKeys": [
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
                "skillimage": "SPEAR_IMAGE_URL",
                "skilldescription": "Deals 15 piercing damage to one enemy. That enemy takes 10 affliction damage at the end of each of Predator Stalker's turns permanently. This effect stacks.",
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
                    "Affliction"
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
                        "statusId": "predator_stalker_bleeder_spear_dot",
                        "duration": 99,
                        "scope": "target",
                        "metadata": {
                            "harmful": true,
                            "infiniteDuration": true,
                            "ongoingClass": "action",
                            "turnEndDamage": 10,
                            "afflictionDamage": true,
                            "ignoreTargetDamageReduction": true,
                            "ignoreTargetDestructibleDefense": true,
                            "triggerOnApply": true,
                            "turnEndTrigger": "source_turn",
                            "turnDurationAnchor": "source_turn",
                            "mergeNumericAddKeys": [
                                "turnEndDamage"
                            ],
                            "tooltipTextTemplate": "This character takes {turnEndDamage} affliction damage at the end of each of Predator Stalker's turns."
                        }
                    }
                ]
            },
            {
                "id": "predator-stalker-cloaking-assassination",
                "name": "Cloaking Assassination",
                "skillimage": "ASSASSINATION_IMAGE_URL",
                "skilldescription": "Requires Cloaking Tech. Deals 50 piercing damage to one enemy and ignores invulnerability. If this kills the target, Cloaking Tech lasts 1 additional turn.",
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
                    "Instant"
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
            },
            {
                "id": "predator-stalker-cloaking-tech",
                "name": "Cloaking Tech",
                "skillimage": "CLOAK_IMAGE_URL",
                "skilldescription": "For 1 turn, Predator Stalker gains 90% evasion and can use Cloaking Assassination. If Cloaking Assassination kills an enemy while this is active, this effect lasts 1 additional turn.",
                "energy": [
                    "Bloodline"
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
                "skillimage": "PASSIVE_IMAGE_URL",
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
        ]
    },
];

if (typeof module !== 'undefined') {
    module.exports = characters;
}
