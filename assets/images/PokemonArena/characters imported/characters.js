var characters = [
    {
        "id": "pikachu",
        "characterId": "pikachu",
        "name": "Pikachu",
        "universe": "pokemon",
        "role": "Mage",
        "facePicture": "https://cdn.discordapp.com/attachments/1125301800048803851/1125302464669827152/4_1_75x75.png",
        "description": "When several of these Pokémon gather, their electricity could build up and cause lightning storms. Forest dwellers, they are few in number and exceptionally rare. The pouches in their cheeks discharge electricity at their opponents. The Pikachu are believed to be highly intelligent.",
        "skills": [
            {
                "id": "pikachu-thundershock",
                "name": "Thundershock",
                "skilldescription": "Deals 20 piercing damage to one enemy, paralyzes their cooldowns, and makes 'Thunder' cost 1 blue 1 random energy for 1 turn. If the target is affected by 'Passive: Static', their cooldowns are paralyzed for 2 turns instead.",
                "energy": [
                    "Random"
                ],
                "cooldown": 0,
                "classes": [
                    "Energy",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 20,
                        "metadata": {
                            "harmful": true,
                            "ignoreDamageReduction": true
                        }
                    },
                    {
                        "scope": "target",
                        "type": "apply_status",
                        "statusId": "cooldown_paralyze",
                        "duration": 1,
                        "metadata": {
                            "harmful": true,
                            "paralyzeCooldowns": true,
                            "tooltipText": "Cooldowns are paralyzed."
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/1125301800048803851/1125302524900024413/7_75x75.png"
            },
            {
                "id": "pikachu-volt-tackle",
                "name": "Volt Tackle",
                "skilldescription": "Pikachu deals 35 piercing damage to one enemy then loses 20HP. For 1 turn, if the target uses a new skill it will have it's cooldown increased by 2 turns. If the target is affected by 'Passive: Static' their cooldowns are increased for 4 turns instead.",
                "energy": [
                    "Taijutsu"
                ],
                "cooldown": 1,
                "classes": [
                    "Energy",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "self",
                        "type": "damage",
                        "amount": null,
                        "metadata": {
                            "harmful": true,
                            "afflictionDamage": true
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/1125301800048803851/1125302892581093446/2_75x75.png"
            },
            {
                "id": "pikachu-thunder",
                "name": "Thunder",
                "skilldescription": "Deals 45 piercing damage to one enemy. If the target is affected by 'Passive: Static' they have their non-strategic skills stunned for 1 turn and 'Passive: Static' is re-cast on them.",
                "energy": [
                    "Ninjutsu",
                    "Ninjutsu"
                ],
                "cooldown": 0,
                "classes": [
                    "Energy",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 45,
                        "metadata": {
                            "harmful": true,
                            "ignoreDamageReduction": true
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/1079847016173154384/1088305314413150218/2_1_75x75.png"
            },
            {
                "id": "pikachu-pikachu-agility",
                "name": "Pikachu Agility",
                "skilldescription": "Pikachu becomes invulnerable for 1 turn.",
                "energy": [
                    "Random"
                ],
                "cooldown": 4,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://cdn.discordapp.com/attachments/1125301800048803851/1125302694123425823/6_75x75.png"
            },
            {
                "id": "pikachu-passive:-static",
                "name": "Passive: Static",
                "skilldescription": "Any enemy who uses a new skill on Pikachu has a 50% chance to take 5 piercing damage and be marked by this skill for 1 turn.",
                "energy": [],
                "cooldown": 0,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://cdn.discordapp.com/attachments/1079847016173154384/1088305315914727494/pikachu_75x75.png"
            }
        ]
    },
    {
        "id": "raichu",
        "characterId": "raichu",
        "name": "Raichu",
        "universe": "pokemon",
        "role": "Bruiser",
        "facePicture": "https://cdn.discordapp.com/attachments/971753063046066266/1151251611570683904/raichu_75x75.png",
        "description": "Raichu's tail is used to gather electricity from the atmosphere, or it can be planted in the ground to search for electricity. It also protects Raichu from its own high voltage power. Raichu can store over 100,000 volts of electricity, enough to knock out a Copperajah.",
        "skills": [
            {
                "id": "raichu-raichus-thunderbolt",
                "name": "Raichu's Thunderbolt",
                "skilldescription": "Deals 20 piercing damage to one enemy and 10 to the others and paralyzes their cooldowns for 1 turn.",
                "energy": [
                    "Random",
                    "Random"
                ],
                "cooldown": 1,
                "classes": [
                    "Energy",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 20,
                        "metadata": {
                            "harmful": true,
                            "ignoreDamageReduction": true
                        }
                    },
                    {
                        "scope": "target",
                        "type": "apply_status",
                        "statusId": "cooldown_paralyze",
                        "duration": 1,
                        "metadata": {
                            "harmful": true,
                            "paralyzeCooldowns": true,
                            "tooltipText": "Cooldowns are paralyzed."
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1151341512089677824/raichu12_75x75.png"
            },
            {
                "id": "raichu-electricity-charge",
                "name": "Electricity Charge",
                "skilldescription": "Raichu gathers and stores electricity, dealing 5 piercing damage to the enemy team and increasing the damage of 'Raichu's Thunderbolt' and 'Thunderstorm' by 10 for 2 turns. Swaps to 'Raichu's Volt Tackle' while active.",
                "energy": [
                    "Genjutsu"
                ],
                "cooldown": 3,
                "classes": [
                    "Energy",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "all-enemies",
                        "type": "damage",
                        "amount": 5,
                        "metadata": {
                            "harmful": true,
                            "ignoreDamageReduction": true
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1151251610396283032/raichu5_75x75.png"
            },
            {
                "id": "raichu-thunderstorm",
                "name": "Thunderstorm",
                "skilldescription": "Raichu summons a thunderstorm, dealing 10 piercing damage to the enemy team every turn for 4 turns. Every turn, each enemy has a 20% chance to have a bleed effect put on them for 2 turns, dealing 10 bleed damage per turn.",
                "energy": [
                    "Genjutsu",
                    "Random",
                    "Random"
                ],
                "cooldown": 6,
                "classes": [
                    "Energy",
                    "Action"
                ],
                "effects": [
                    {
                        "scope": "all-enemies",
                        "type": "damage",
                        "amount": 10,
                        "metadata": {
                            "harmful": true,
                            "ignoreDamageReduction": true
                        }
                    },
                    {
                        "scope": "all-enemies",
                        "type": "unmapped",
                        "old_type": "percentageEffect",
                        "val": 10,
                        "turn": 2
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1151251611860086844/raichu6_75x75.png"
            },
            {
                "id": "raichu-raichus-barrier",
                "name": "Raichu's Barrier",
                "skilldescription": "Raichu becomes invulnerable for 1 turn.",
                "energy": [
                    "Random"
                ],
                "cooldown": 4,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1151341503214538904/raichu16_75x75.png"
            },
            {
                "id": "raichu-raichus-volt-tackle",
                "name": "Raichu's Volt Tackle",
                "skilldescription": "Raichu deals 65 piercing damage to one enemy and fully stuns them for 1 turn then loses 40HP.",
                "energy": [
                    "Genjutsu",
                    "Genjutsu"
                ],
                "cooldown": 1,
                "classes": [
                    "Energy",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "self",
                        "type": "damage",
                        "amount": 50,
                        "metadata": {
                            "harmful": true,
                            "afflictionDamage": true
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1151341523162628116/raichu15_75x75.png"
            }
        ]
    },
    {
        "id": "bulbasaur",
        "characterId": "bulbasaur",
        "name": "Bulbasaur",
        "universe": "pokemon",
        "role": "Bruiser",
        "facePicture": "https://cdn.discordapp.com/attachments/1043460995386974208/1090176194223292446/1.png",
        "description": "It bears the seed of a plant on its back from birth. The seed slowly develops. Researchers are unsure whether to classify Bulbasaur as a plant or animal. Bulbasaur are extremely tough and very difficult to capture in the wild.",
        "skills": [
            {
                "id": "bulbasaur-leech-seed",
                "name": "Leech Seed",
                "skilldescription": "Bulbasaur steals 10 health from one enemy or 5 health from an ally for 2 turns. If used on an ally this skills CD is reset. Every time this skill steals health Bulbasaur gains 1 stack of 'Passive: Growth'. This cannot be used on an affected character.",
                "energy": [
                    "Random"
                ],
                "cooldown": 1,
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": "Bulbasaur Passive Icon",
                        "metadata": {
                            "harmful": true,
                            "ignoreDamageReduction": true
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/1043460995386974208/1090176212401393714/7_1_75x75.png"
            },
            {
                "id": "bulbasaur-razor-leaf",
                "name": "Razor Leaf",
                "skilldescription": "Bulbasaur deals 15 damage to the enemy team. This skill has a 20% chance to critical hit a target dealing 25 piercing damage instead. For every stack of 'Passive: Growth' Bulbasaur has, the critical hit chance is increased by 15% then he loses all stacks after.",
                "energy": [
                    "Taijutsu"
                ],
                "cooldown": 1,
                "classes": [
                    "Energy",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "all-enemies",
                        "type": "unmapped",
                        "old_type": "percentageEffect",
                        "val": 25,
                        "turn": 1
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/1043460995386974208/1090176211713527808/3_2_75x75.png"
            },
            {
                "id": "bulbasaur-solar-beam",
                "name": "Solar Beam",
                "skilldescription": "Bulbasaur deals 50 damage to one enemy. For every stack of 'Passive: Growth' Bulbasaur has this skill costs 1 less random energy and then he loses all stacks after.",
                "energy": [
                    "Taijutsu",
                    "Random",
                    "Random",
                    "Random",
                    "Random"
                ],
                "cooldown": 2,
                "classes": [
                    "Energy",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 50,
                        "metadata": {
                            "harmful": true
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/1043460995386974208/1090176211919044619/5_1_75x75.png"
            },
            {
                "id": "bulbasaur-bulbasaur-dig",
                "name": "Bulbasaur Dig",
                "skilldescription": "This skill makes this character invulnerable for 1 turn.",
                "energy": [
                    "Random"
                ],
                "cooldown": 4,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://cdn.discordapp.com/attachments/1043460995386974208/1090176211491246170/8_1_75x75.png"
            },
            {
                "id": "bulbasaur-passive:-growth",
                "name": "Passive: Growth",
                "skilldescription": "Every turn Bulbasaur does not use a skill he will gain 1 stack of this effect. ",
                "energy": [],
                "cooldown": 0,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://cdn.discordapp.com/attachments/1043460995386974208/1090176212179112048/6_1_75x75.png"
            }
        ]
    },
    {
        "id": "charmander",
        "characterId": "charmander",
        "name": "Charmander",
        "universe": "pokemon",
        "role": "Specialist",
        "facePicture": "https://cdn.discordapp.com/attachments/1089337723648757860/1090533481278345257/5_75x75.png",
        "description": "A flame burns on the tip of its tail from birth. It is said that a Charmander dies of its flame ever goes out.",
        "skills": [
            {
                "id": "charmander-charmanders-rage",
                "name": "Charmander's Rage",
                "skilldescription": "Charmander deals 10 damage and 10 affliction damage to one enemy.",
                "energy": [
                    "Random"
                ],
                "cooldown": 0,
                "classes": [
                    "Physical",
                    "*Affliction",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 10,
                        "metadata": {
                            "harmful": true
                        }
                    },
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 10,
                        "metadata": {
                            "harmful": true,
                            "afflictionDamage": true
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1090160838620499978/6_75x75.png"
            },
            {
                "id": "charmander-charmanders-flamethrower",
                "name": "Charmander's Flamethrower",
                "skilldescription": "Charmander instantly deals 15 affliction damage to one enemy and 5 affliction damage the following 2 turns. Additionaly, this skill has a 25% chance to deal 5 permanent affliction damage to the target (stacks).",
                "energy": [],
                "cooldown": 0,
                "classes": [
                    "Affliction",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1090160837890682981/4_75x75.png"
            },
            {
                "id": "charmander-fire-spin",
                "name": "Fire Spin",
                "skilldescription": "Charmander deals 10 affliction damage to one enemy for 3 turns. The target is invulnerable to new helpful skills and is dealt 5 affliction damage every time they use a new skill.",
                "energy": [
                    "Random"
                ],
                "cooldown": 3,
                "classes": [
                    "Affliction",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1090160837039239178/18_75x75.png"
            },
            {
                "id": "charmander-charmanders-ember",
                "name": "Charmander's Ember",
                "skilldescription": "This skill makes Charmander invulnerable for 1 turn. For 3 turns, every enemy who uses a new skill on Charmander takes 5 affliction damage that has a 100% chance to trigger 'Passive: Burn' on them.",
                "energy": [
                    "Random"
                ],
                "cooldown": 4,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1090160836804366466/13_75x75.png"
            },
            {
                "id": "charmander-passive:-burn",
                "name": "Passive: Burn",
                "skilldescription": "Any enemy who takes affliction damage from Charmander has a 50% chance to have their non-affliction damage reduced by 10 for 1 turn.",
                "energy": [],
                "cooldown": 0,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1090160836468809768/11_75x75.png"
            },
            {
                "id": "charmander-passive:-blaze",
                "name": "Passive: Blaze",
                "skilldescription": "Charmander's Rage will deal 5 additional piercing damage for 1 turn each time he's affected by a new-non strategic skill",
                "energy": [],
                "cooldown": 0,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://media.discordapp.net/attachments/971753063046066266/1090160838821818368/7_75x75.png"
            }
        ]
    },
    {
        "id": "butterfree",
        "characterId": "butterfree",
        "name": "Butterfree",
        "universe": "pokemon",
        "role": "Support",
        "facePicture": "https://media.discordapp.net/attachments/1090088421223055470/1098004085103415497/36.png",
        "description": "It loves the honey of flowers and can locate flower patches that have even tiny amounts of pollen. The wings are protected by rain-repellent dust. As a result, this Pokémon can fly about even in rain.",
        "skills": [
            {
                "id": "butterfree-sleep-powder",
                "name": "Sleep Powder",
                "skilldescription": "Stuns one enemy's skills for 2 turns. 'Psybeam', 'Confusion', and 'Supersonic' deal 10 additional damage to an enemy affected by this skill.",
                "energy": [
                    "Genjutsu"
                ],
                "cooldown": 2,
                "classes": [
                    "Strategic",
                    "Control"
                ],
                "effects": [],
                "skillimage": "https://media.discordapp.net/attachments/1090088421223055470/1098004084692365312/34.png"
            },
            {
                "id": "butterfree-safeguard",
                "name": "Safeguard",
                "skilldescription": "Butterfree ignores stun effects and the first damaging effect that targets for 4 turns. This skill and 'Psybeam' become alternates during this time.",
                "energy": [
                    "Random"
                ],
                "cooldown": 4,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://media.discordapp.net/attachments/1090088421223055470/1098004083866095667/27.png"
            },
            {
                "id": "butterfree-psybeam",
                "name": "Psybeam",
                "skilldescription": "Butterfree deals 20 piercing damage to one enemy and increases the cost of their skills by one random energy for 1 turn.",
                "energy": [
                    "Ninjutsu"
                ],
                "cooldown": 0,
                "classes": [
                    "Energy",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 20,
                        "metadata": {
                            "harmful": true,
                            "ignoreDamageReduction": true
                        }
                    }
                ],
                "skillimage": "https://media.discordapp.net/attachments/1090088421223055470/1098004084088385667/29.png"
            },
            {
                "id": "butterfree-protect",
                "name": "Protect",
                "skilldescription": "This skill makes Butterfree invulnerable for 1 turn.",
                "energy": [
                    "Random"
                ],
                "cooldown": 4,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://media.discordapp.net/attachments/1090088421223055470/1098004084897878126/35.png"
            },
            {
                "id": "butterfree-supersonic",
                "name": "Supersonic",
                "skilldescription": "Butterfree deals 25 damage to one enemy and stuns their energy and mental skills.",
                "energy": [
                    "Ninjutsu"
                ],
                "cooldown": 0,
                "classes": [
                    "Energy",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 25,
                        "metadata": {
                            "harmful": true
                        }
                    }
                ],
                "skillimage": "https://media.discordapp.net/attachments/1090088421223055470/1098004084285509743/32.png"
            },
            {
                "id": "butterfree-confusion",
                "name": "Confusion",
                "skilldescription": "Butterfree deals 25 damage to one enemy and stuns their physical and strategic skills.",
                "energy": [
                    "Genjutsu"
                ],
                "cooldown": 0,
                "classes": [
                    "Energy",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 25,
                        "metadata": {
                            "harmful": true
                        }
                    }
                ],
                "skillimage": "https://media.discordapp.net/attachments/1090088421223055470/1098004084482658375/33.png "
            }
        ]
    },
    {
        "id": "meowth",
        "characterId": "meowth",
        "name": "Meowth",
        "universe": "pokemon",
        "role": "Assassin",
        "facePicture": "https://cdn.discordapp.com/attachments/1090088421223055470/1097996227884367954/79.png",
        "description": "It is nocturnal by nature. If it spots something shiny, its eyes glitter as brightly as the shiny object.",
        "skills": [
            {
                "id": "meowth-meowth-slash",
                "name": "Meowth Slash",
                "skilldescription": "Deals 20 damage then 5 bleed damage next turn.",
                "energy": [
                    "Random"
                ],
                "cooldown": 0,
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 20,
                        "metadata": {
                            "harmful": true
                        }
                    },
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 5,
                        "metadata": {
                            "harmful": true,
                            "afflictionDamage": true
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/1090088421223055470/1097996227360080035/76.png"
            },
            {
                "id": "meowth-double-team",
                "name": "Double Team",
                "skilldescription": "Meowth removes all enemy skills from himself then ignores the next two damaging effects used on him for 2 turns.",
                "energy": [
                    "Random"
                ],
                "cooldown": 3,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://cdn.discordapp.com/attachments/1090088421223055470/1097996226768674896/74.png"
            },
            {
                "id": "meowth-fury-swipes",
                "name": "Fury Swipes",
                "skilldescription": "Deals 15 bleed damage to all enemies for 2 turns. If used on a bleeding enemy this effect becomes permanent ",
                "energy": [
                    "Random",
                    "Random"
                ],
                "cooldown": 2,
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://cdn.discordapp.com/attachments/1090088421223055470/1097996226508619897/73.png"
            },
            {
                "id": "meowth-meowth-dodge",
                "name": "Meowth Dodge",
                "skilldescription": "This skill makes Meowth invulnerable for 1 turn.",
                "energy": [
                    "Random"
                ],
                "cooldown": 4,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://cdn.discordapp.com/attachments/1090088421223055470/1097996227603333180/77.png"
            },
            {
                "id": "meowth-passive:-payday",
                "name": "Passive: Payday",
                "skilldescription": "Any enemy affected by a bleed that targets Meowth with a new harmful skill will be dealt 10 bleed damage.",
                "energy": [],
                "cooldown": 0,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://cdn.discordapp.com/attachments/1090088421223055470/1097996227062268034/75.png"
            }
        ]
    },
    {
        "id": "farfetchd",
        "characterId": "farfetchd",
        "name": "Farfetch'd",
        "universe": "pokemon",
        "role": "Hybrid",
        "facePicture": "https://cdn.discordapp.com/attachments/1090088421223055470/1097996595850645685/43.png",
        "description": "The stalk this Pokémon carries in its wings serves as a sword to cut down opponents. In a dire situation, the stalk can also serve as food.",
        "skills": [
            {
                "id": "farfetchd-air-slash",
                "name": "Air Slash",
                "skilldescription": "Deals 20 damage to one enemy. Has a 50% chance to fully stun the target.",
                "energy": [
                    "Ninjutsu"
                ],
                "cooldown": 0,
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 20,
                        "metadata": {
                            "harmful": true
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/1090088421223055470/1097996595410255933/39.png"
            },
            {
                "id": "farfetchd-farfetch-cut",
                "name": "Farfetch Cut",
                "skilldescription": "Farfetch'd deals 15 damage to one enemy. If the target is stunned by 'Air Slash' they are dealt 10 additional damage.",
                "energy": [
                    "Random"
                ],
                "cooldown": 0,
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 15,
                        "metadata": {
                            "harmful": true
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/1090088421223055470/1097996594957254786/37.png"
            },
            {
                "id": "farfetchd-swords-dance",
                "name": "Swords Dance",
                "skilldescription": "Farfetch'd makes his attacks piercing, increases 'Air Slash's' stun percentage to 100%, his skills deal 5 additional damage, and he gains 10 damage reduction for 3 turns.",
                "energy": [
                    "Random"
                ],
                "cooldown": 2,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "self",
                        "type": "unmapped",
                        "old_type": "DR",
                        "val": 10,
                        "turn": 3
                    },
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 20,
                        "metadata": {
                            "harmful": true,
                            "ignoreDamageReduction": true
                        }
                    },
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 15,
                        "metadata": {
                            "harmful": true,
                            "ignoreDamageReduction": true
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/1090088421223055470/1097996595632537600/40.png"
            },
            {
                "id": "farfetchd-farfetch-double-team",
                "name": "Farfetch Double Team",
                "skilldescription": "This skill makes Farfetch'd invulnerable for 1 turn.",
                "energy": [
                    "Random"
                ],
                "cooldown": 4,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://cdn.discordapp.com/attachments/1090088421223055470/1097996595175362660/38.png"
            },
            {
                "id": "farfetchd-fury-attack",
                "name": "Fury Attack",
                "skilldescription": "Passive: When Farfetch'd is under 60HP, 'Cut' will cast itself 0-4 additional times when it is used. First time 80% chance to cast, second time 40% chance, third 20% chance, fourth 10% chance",
                "energy": [],
                "cooldown": 0,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "target",
                        "type": "unmapped",
                        "old_type": "percentageEffect",
                        "val": 15,
                        "turn": 1
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/1090088421223055470/1097996596051984486/72.png"
            }
        ]
    },
    {
        "id": "onix",
        "characterId": "onix",
        "name": "Onix",
        "universe": "pokemon",
        "role": "Tank",
        "facePicture": "https://cdn.discordapp.com/attachments/971753063046066266/1098059485932691466/1_75x75.png",
        "description": "As it digs through the ground, it absorbs many hard objects. This is what makes its body so solid. It rapidly bores through the ground at 50 mph by squirming and twisting its massive, rugged body.",
        "skills": [
            {
                "id": "onix-rock-throw",
                "name": "Rock Throw",
                "skilldescription": "Deals 15 damage to all enemies. For 1 turn, 'Slam' will deal 5 more damage and grant 5 more unpierceable damage reduction. Becomes 'Flash Cannon' for 1 turn.",
                "energy": [
                    "Random"
                ],
                "cooldown": 1,
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "all-enemies",
                        "type": "damage",
                        "amount": 15,
                        "metadata": {
                            "harmful": true
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1098059486423437382/3_1_75x75.png"
            },
            {
                "id": "onix-slam",
                "name": "Slam",
                "skilldescription": "Onix gains 5 unpierceable damage reduction permanently and deals 30 damage to one enemy. For 1 turn, 'Rock Throw' will deal 5 more damage.",
                "energy": [
                    "Random",
                    "Random"
                ],
                "cooldown": 1,
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 30,
                        "metadata": {
                            "harmful": true
                        }
                    },
                    {
                        "scope": "self",
                        "type": "unmapped",
                        "old_type": "DR",
                        "val": 5,
                        "turn": "-1"
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1098059487165816933/6_1_75x75.png"
            },
            {
                "id": "onix-stealth-rock",
                "name": "Stealth Rock",
                "skilldescription": "Onix targets the enemy team, dealing 10 piercing damage after 4 turns. During this time, if a target uses a new skill, that skill's cooldown is increased by 1 turn, their non-affliction damage is reduced by 10 for 1 turn, and this skill will deal 5 additional damage to them. Invisible.",
                "energy": [
                    "Random",
                    "Random"
                ],
                "cooldown": 5,
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "all-enemies",
                        "type": "damage",
                        "amount": 10,
                        "metadata": {
                            "harmful": true,
                            "ignoreDamageReduction": true
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1098059486905782273/5_1_75x75.png"
            },
            {
                "id": "onix-onix-dig",
                "name": "Onix Dig",
                "skilldescription": "Makes this character invulnerable for 1 turn. This skill becomes 'Crystallization' for 4 turns.",
                "energy": [
                    "Random"
                ],
                "cooldown": 4,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://cdn.discordapp.com/attachments/1007387639508377742/1098109887894011904/9_75x75.png"
            },
            {
                "id": "onix-flash-cannon",
                "name": "Flash Cannon",
                "skilldescription": "Deals 20 piercing damage to one enemy. This skill will deal 5 more damage for every 15 health the target is missing.",
                "energy": [
                    "Random"
                ],
                "cooldown": 2,
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 20,
                        "metadata": {
                            "harmful": true
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1098059486217900072/2_1_75x75.png"
            },
            {
                "id": "onix-crystallization",
                "name": "Crystallization",
                "skilldescription": "For 2 turns, Onix will lose 5HP and gain 15 permanent destructible defense. During this time, Onix's skills will become uncounterable and unreflectable. This skill cannot kill Onix and may only be used 3 times.",
                "energy": [],
                "cooldown": 2,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "self",
                        "type": "damage",
                        "amount": 5,
                        "metadata": {
                            "harmful": true,
                            "afflictionDamage": true
                        }
                    },
                    {
                        "scope": "self",
                        "type": "apply_status",
                        "statusId": "destructible_defense",
                        "duration": "-1",
                        "metadata": {
                            "destructibleDefense": 15,
                            "tooltipText": "Has 15 destructible defense."
                        }
                    },
                    {
                        "scope": "self",
                        "type": "unmapped",
                        "old_type": "applyEffect",
                        "val": 15,
                        "turn": "-1"
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1098059487459414180/7_75x75.png"
            }
        ]
    },
    {
        "id": "gengar",
        "characterId": "gengar",
        "name": "Gengar",
        "universe": "pokemon",
        "role": "Assassin",
        "facePicture": "https://cdn.discordapp.com/attachments/971753063046066266/1098054023623483422/Untitled-2_75x75.png",
        "description": "On the night of a full moon, if shadows move on their own and laugh, it must be Gengar's doing. It is said to emerge from darkness to steal the lives of those who become lost in mountains.",
        "skills": [
            {
                "id": "gengar-night-shade",
                "name": "Night Shade",
                "skilldescription": "Deals 20 damage to all enemies. For 1 turn, if they use a new harmful skill, Psychic will last 1 additional turn on them permanently (Stacks).",
                "energy": [
                    "Genjutsu"
                ],
                "cooldown": 1,
                "classes": [
                    "Mental",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "all-enemies",
                        "type": "damage",
                        "amount": 20,
                        "metadata": {
                            "harmful": true
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1098054024563003502/6_75x75.png"
            },
            {
                "id": "gengar-psychic",
                "name": "Psychic",
                "skilldescription": "Deals 20 damage to one enemy. For 1 turn, if the target uses a new skill, they will be stunned for 1 additional turn by 'Shadow Ball' permanently (Stacks).",
                "energy": [
                    "Ninjutsu"
                ],
                "cooldown": 0,
                "classes": [
                    "Mental",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 20,
                        "metadata": {
                            "harmful": true
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1098054024340709477/5_75x75.png"
            },
            {
                "id": "gengar-shadow-ball",
                "name": "Shadow Ball",
                "skilldescription": "Gengar stuns one enemy for 1 turn. If anyone uses a new skill on Gengar or one of his allies, they will be stunned by 'Shadow Ball' 1 additional turn permamently (stacks).",
                "energy": [
                    "Random"
                ],
                "cooldown": 1,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1098054024110026833/3_75x75.png"
            },
            {
                "id": "gengar-will-o-wisp",
                "name": "Will-O-Wisp",
                "skilldescription": "Gengar targets one ally for 4 turns. If they use a new damaging skill, 'Night Shade' and 'Psychic' will deal 10 additional damage for 1 turn; if a new invulnerability skill is used, Gengar will become invulnerable to the main class of the skill; if an ally uses a new stun skill, Gengar will ignore enemy stun effects for 1 turn. Gengar also will gain 1 random energy.",
                "energy": [
                    "Random"
                ],
                "cooldown": 4,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://media.discordapp.net/attachments/971753063046066266/1098054023837388920/2_75x75.png"
            },
            {
                "id": "gengar-passive:-mega-gengar",
                "name": "Passive: Mega Gengar",
                "skilldescription": "If the ally affected by 'Will-O-Wisp' dies, Gengar will transform into Mega Gengar, gaining 25HP, gaining 5 points of unpierceable damage reduction, making all his skills bypass invulnerability, and swapping 'Will-O-Wisp' to 'Phantom Force' permanently. ",
                "energy": [],
                "cooldown": 0,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1108671480541237351/123_1_75x75.png"
            },
            {
                "id": "gengar-phantom-force",
                "name": "Phantom Force",
                "skilldescription": "Gengar targets himself or an ally, making them ignore all enemy damage for 1 turn. The first enemy to use a new skill on the target will have 'Night Shade', 'Psychic', then 'Shadow Ball' cast on them. This skill is invisible.",
                "energy": [
                    "Random",
                    "Random",
                    "Random"
                ],
                "cooldown": 3,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1108671475705204846/mega_75x75.png"
            }
        ]
    },
    {
        "id": "lapras",
        "characterId": "lapras",
        "name": "Lapras",
        "universe": "pokemon",
        "role": "Tank",
        "facePicture": "https://cdn.discordapp.com/attachments/1078430469034610749/1106834713521422397/lappy_75x75.png",
        "description": "A smart and kindhearted Pokémon, it glides across the surface of the sea while its beautiful song echoes around it. Over 5,000 people can ride on its shell at once. And it's a very comfortable ride, without the slightest shaking or swaying.",
        "skills": [
            {
                "id": "lapras-lapras-water-gun",
                "name": "Lapras' Water Gun",
                "skilldescription": "Deals 25 damage to one enemy. If 'Sheer Cold' is active, this skills deals 15 more damage and costs 1 additional random energy.",
                "energy": [
                    "Ninjutsu"
                ],
                "cooldown": 0,
                "classes": [
                    "Energy",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 25,
                        "metadata": {
                            "harmful": true
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/1078430469034610749/1106834816789385256/lappy4_75x75.png"
            },
            {
                "id": "lapras-lapras-sheer-cold",
                "name": "Lapras' Sheer Cold",
                "skilldescription": "Deals 20 damage to all enemies. For 2 turns, any enemy that uses a new harmful skill will be delayed for 1 turn and Lapras' skills are improved.",
                "energy": [
                    "Genjutsu",
                    "Random"
                ],
                "cooldown": 3,
                "classes": [
                    "Energy",
                    "Control"
                ],
                "effects": [
                    {
                        "scope": "all-enemies",
                        "type": "damage",
                        "amount": 20,
                        "metadata": {
                            "harmful": true
                        }
                    },
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 60,
                        "metadata": {
                            "harmful": true,
                            "ignoreDamageReduction": true
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/1078430469034610749/1106835017298087996/lappy3_75x75.png"
            },
            {
                "id": "lapras-lapras-ice-beam",
                "name": "Lapras' Ice Beam",
                "skilldescription": "Deals 45 piercing damage to one enemy that has a 25% chance to fully stun them for 1 turn. If 'Sheer Cold' is active, this skill deals 15 more damage and has a 75% chance to stun instead.",
                "energy": [
                    "Ninjutsu",
                    "Ninjutsu"
                ],
                "cooldown": 1,
                "classes": [
                    "Energy",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 45,
                        "metadata": {
                            "harmful": true,
                            "ignoreDamageReduction": true
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/1078430469034610749/1106834899308118086/lappy5_75x75.png"
            },
            {
                "id": "lapras-lapras-surf",
                "name": "Lapras' Surf",
                "skilldescription": "This skill makes Lapras and one ally invulnerable for 1 turn.",
                "energy": [
                    "Random"
                ],
                "cooldown": 4,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://cdn.discordapp.com/attachments/1090088421223055470/1097997520484974682/71.png"
            }
        ]
    },
    {
        "id": "venasaur",
        "characterId": "venasaur",
        "name": "Venasaur",
        "universe": "pokemon",
        "role": "Bruiser",
        "facePicture": "https://cdn.discordapp.com/attachments/971753063046066266/1107353876874674258/9_75x75.png",
        "description": "Venusaur, the final form of the Bulbasaur evolution. This Seed Pokémon soaks up the sun's rays as a source of energy. Venusaur, the Seed Pokémon. Venusaur uses its large petals to capture sunlight and transform it into energy.",
        "skills": [
            {
                "id": "venasaur-vine-whip",
                "name": "Vine Whip",
                "skilldescription": "Deals 20 damage to one enemy and removes 1 mark of 'Seed Bomb' from them. This skill has a 25% chance to critical hit (increased to 50% if they are marked by 'Seed Bomb'), dealing 10 additional damage and becoming piercing.",
                "energy": [
                    "Taijutsu"
                ],
                "cooldown": 0,
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 30,
                        "metadata": {
                            "harmful": true,
                            "ignoreDamageReduction": true
                        }
                    },
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 30,
                        "metadata": {
                            "harmful": true,
                            "afflictionDamage": true
                        }
                    },
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 5,
                        "metadata": {
                            "harmful": true,
                            "afflictionDamage": true
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1107353878313308280/10_75x75_1.png"
            },
            {
                "id": "venasaur-venom-shock",
                "name": "Venom Shock",
                "skilldescription": "Deals 30 affliction damage to one enemy and removes 2 marks of 'Seed Bomb' from them. Has a 25% chance (increased to 50% if they are marked by 'Seed Bomb') to deal 5 affliction damage to the target permanently.",
                "energy": [
                    "Genjutsu",
                    "Random"
                ],
                "cooldown": 1,
                "classes": [
                    "Affliction",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 30,
                        "metadata": {
                            "harmful": true,
                            "ignoreDamageReduction": true
                        }
                    },
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 30,
                        "metadata": {
                            "harmful": true,
                            "afflictionDamage": true
                        }
                    },
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 5,
                        "metadata": {
                            "harmful": true,
                            "afflictionDamage": true
                        }
                    },
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 30,
                        "metadata": {
                            "harmful": true,
                            "afflictionDamage": true
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1107353877528985670/2_75x75.png"
            },
            {
                "id": "venasaur-seed-bomb",
                "name": "Seed Bomb",
                "skilldescription": "One enemy is given 3 marks that cannot be removed except by Venasaur's skills. When target has 0 marks left, they will take 25 affliction damage and this will end. This skill cannot be used on an already affected enemy.",
                "energy": [
                    "Random"
                ],
                "cooldown": 0,
                "classes": [
                    "Affliction",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "target",
                        "type": "unmapped",
                        "old_type": "stack",
                        "val": 3,
                        "turn": "-1"
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1107353877147291678/6_75x75.png"
            },
            {
                "id": "venasaur-petal-blizzard",
                "name": "Petal Blizzard",
                "skilldescription": "This skill makes this character invulnerable for 1 turn.",
                "energy": [
                    "Random"
                ],
                "cooldown": 4,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1107353877944213654/12_75x75_1.png"
            },
            {
                "id": "venasaur-passive:-mega-venasaur",
                "name": "Passive: Mega Venasaur",
                "skilldescription": "If Venasaur successfully removes 3 marks of 'Seed Bomb' from an enemy he will transform into Mega Venasaur, healing 25HP, gaining 10 points of unpierceable damage reduction, increasing his % chance effects to 100%, and swapping 'Seed Bomb' to 'Venasaur's Solar Beam' permanently.",
                "energy": [],
                "cooldown": 0,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1107353876555894835/1_75x75.png"
            },
            {
                "id": "venasaur-venasaurs-solar-beam",
                "name": "Venasaur's Solar Beam",
                "skilldescription": "Places 2 marks on an enemy that cannot be removed except by Venasaur not using a new skill at the end of his turns. If at the end of his turn he did not use a new skill, 1 mark is removed from the target. When the target has 0 marks, they are dealt 150 damage. This skill ignores invulnerability and cannot be used while active.",
                "energy": [
                    "Taijutsu",
                    "Genjutsu",
                    "Genjutsu"
                ],
                "cooldown": 0,
                "classes": [
                    "Energy",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "target",
                        "type": "unmapped",
                        "old_type": "stack",
                        "val": 2,
                        "turn": "-1"
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1107353876077756538/13_75x75.png"
            }
        ]
    },
    {
        "id": "charizard",
        "characterId": "charizard",
        "name": "Charizard",
        "universe": "pokemon",
        "role": "Bruiser",
        "facePicture": "https://cdn.discordapp.com/attachments/971753063046066266/1100950170872590346/HtOd4J5.png",
        "description": "Charizard is a dual-type Fire/Flying Pokémon, its wings can carry this Pokémon close to an altitude of 4600 feet. It blows out fire at very high temperatures.",
        "skills": [
            {
                "id": "charizard-charizards-scorch",
                "name": "Charizard's Scorch",
                "skilldescription": "Charizard deals 25 affliction damage to one enemy. That enemy will take 5 affliction damage every time he uses a skill permanently. This skill may stack.",
                "energy": [
                    "Random"
                ],
                "cooldown": 0,
                "classes": [
                    "Affliction",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 25,
                        "metadata": {
                            "harmful": true,
                            "afflictionDamage": true
                        }
                    }
                ],
                "skillimage": "https://i.imgur.com/uCFlVaq.png"
            },
            {
                "id": "charizard-charizards-flamethrower",
                "name": "Charizard's Flamethrower",
                "skilldescription": "Charizard deals 25 piercing damage to one enemy. That enemy will take 5 affliction damage every time he does not use a skill permanently. This skill may stack.",
                "energy": [
                    "Ninjutsu",
                    "Random"
                ],
                "cooldown": 0,
                "classes": [
                    "Energy",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 25,
                        "metadata": {
                            "harmful": true,
                            "ignoreDamageReduction": true
                        }
                    },
                    {
                        "scope": "target",
                        "type": "unmapped",
                        "old_type": "doesNot",
                        "val": null,
                        "turn": 1
                    }
                ],
                "skillimage": "https://i.imgur.com/PTWaIw3.png"
            },
            {
                "id": "charizard-seismic-toss",
                "name": "Seismic Toss",
                "skilldescription": "Charizard targets one enemy making himself and the target invulnerable to all skills for 1 turn. When this skill ends, the target takes 30 damage. For 1 turn, Charizard's skills will cost 1 less random energy.",
                "energy": [
                    "Random",
                    "Random"
                ],
                "cooldown": 2,
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://media.discordapp.net/attachments/1090088421223055470/1104184423479529563/ch_75x75.png"
            },
            {
                "id": "charizard-charizard-defense",
                "name": "Charizard Defense",
                "skilldescription": "This skill makes this character invulnerable for 1 turn.",
                "energy": [
                    "Random"
                ],
                "cooldown": 4,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://i.imgur.com/teqaVr8.png "
            },
            {
                "id": "charizard-passive:-mega-charizard-x",
                "name": "Passive: Mega Charizard X",
                "skilldescription": "If Charizard uses 'Charizard's Scorch' 3 times in a game, he will transform into Mega Charizard X, he heals 25HP, gains 10 points of unpierceable damage reduction,  ignores enemy stun effects, and swaps 'Seismic Toss' to 'Blast Burn' permanently.",
                "energy": [],
                "cooldown": 0,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://media.discordapp.net/attachments/1090088421223055470/1104193058507067472/11_1_75x75.png"
            },
            {
                "id": "charizard-passive:-mega-charizard-y",
                "name": "Passive: Mega Charizard Y",
                "skilldescription": "If Charizard uses 'Charizard's Flamethrower' 3 times in a game, he will transform into Mega Charizard Y, he heals 25HP, gains 5 unpierceable damage reudction, reduces the cost of all his skills by 1 random energy, and swaps 'Seismic Toss' to 'Dragon Tail' permanently.",
                "energy": [],
                "cooldown": 0,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://media.discordapp.net/attachments/1090088421223055470/1104193119911682079/10_1_75x75.png"
            },
            {
                "id": "charizard-blast-burn",
                "name": "Blast Burn",
                "skilldescription": "Blast Burn Casts 'Charizard's Scorch' and 'Charizard's Flamethrower' on one enemy.",
                "energy": [
                    "Ninjutsu"
                ],
                "cooldown": 2,
                "classes": [
                    "Affliction",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "target",
                        "type": "unmapped",
                        "old_type": "apply",
                        "val": "Scorc",
                        "turn": 0
                    }
                ],
                "skillimage": "https://media.discordapp.net/attachments/1090088421223055470/1104194042285264966/13_1_75x75.png"
            },
            {
                "id": "charizard-dragon-tail",
                "name": "Dragon Tail",
                "skilldescription": "Charizard gains 35 points of permanent destructible defense and deals 35 damage to one enemy.",
                "energy": [
                    "Taijutsu"
                ],
                "cooldown": 2,
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 35,
                        "metadata": {
                            "harmful": true
                        }
                    },
                    {
                        "scope": "self",
                        "type": "apply_status",
                        "statusId": "destructible_defense",
                        "duration": "-1",
                        "metadata": {
                            "destructibleDefense": 35,
                            "tooltipText": "Has 35 destructible defense."
                        }
                    }
                ],
                "skillimage": "https://media.discordapp.net/attachments/1090088421223055470/1104196228419440750/224.png"
            }
        ]
    },
    {
        "id": "blastoise",
        "characterId": "blastoise",
        "name": "Blastoise",
        "universe": "pokemon",
        "role": "Tank",
        "facePicture": "https://cdn.discordapp.com/attachments/971753063046066266/1107358537295863848/241.png",
        "description": "Blastoise is the final evolved form of Squirtle. It can launch powerful blasts of water from its water spouts. Blastoise, the Shellfish Pokémon. Blastoise's heavy body weight can leave opponents unable to battle.",
        "skills": [
            {
                "id": "blastoise-water-pulse",
                "name": "Water Pulse",
                "skilldescription": "Permanently reduces one enemy's destructible defense and damage reduction by 5 (until it reaches 0) and deals 5 piercing damage to them every turn for 4 turns (stacks).",
                "energy": [
                    "Random"
                ],
                "cooldown": 0,
                "classes": [
                    "Energy",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1107358559735386144/245.png"
            },
            {
                "id": "blastoise-blastoises-rapid-spin",
                "name": "Blastoise's Rapid Spin",
                "skilldescription": "Blastoise targets himself and one ally for 2 turns, removing all afflictions on them, making them ignore stun effects, and dealing 10 piercing damage to any enemy that uses a new harmful skill on either of them. This skill cannot be stunned.",
                "energy": [
                    "Random"
                ],
                "cooldown": 3,
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1107358559001382952/247.png"
            },
            {
                "id": "blastoise-blastoises-hydro-pump",
                "name": "Blastoise's Hydro Pump",
                "skilldescription": "Deals 35 piercing damage to one enemy. Fully stuns the target for 1 turn if they are affected by 'Water Pulse' and deals 5 additional damage for every stack of it they have.",
                "energy": [
                    "Ninjutsu",
                    "Random"
                ],
                "cooldown": 0,
                "classes": [
                    "Energy",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 35,
                        "metadata": {
                            "harmful": true,
                            "ignoreDamageReduction": true
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1107358558338682970/244.png"
            },
            {
                "id": "blastoise-blastoise-dodge",
                "name": "Blastoise Dodge",
                "skilldescription": "This skill makes this character invulnerable for 1 turn.",
                "energy": [
                    "Random"
                ],
                "cooldown": 4,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1107358559362109550/246.png"
            },
            {
                "id": "blastoise-passive:-mega-blastoise",
                "name": "Passive: Mega Blastoise",
                "skilldescription": "If Blastoise successfully uses 'Water Pulse', 'Blastoise's Hydro Pump', then 'Blastoise's Rapid Spin' uninterrupted (in that order), he will transform into Mega Blastoise, healing 25HP, gaining 15 unpierceable damage reduction, making 'Water Pulse' AOE, and swapping 'Blastoise's Hydro Pump' to 'Hydro Cannon' permanently.",
                "energy": [],
                "cooldown": 0,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1107358932139262062/14_75x75.png"
            },
            {
                "id": "blastoise-hydro-cannon",
                "name": "Hydro Cannon",
                "skilldescription": "Casts 'Blastoise's Hydro Pump' on one enemy and deals 15 piercing damage to their allies.",
                "energy": [
                    "Ninjutsu",
                    "Random",
                    "Random"
                ],
                "cooldown": 0,
                "classes": [
                    "Energy",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "target",
                        "type": "unmapped",
                        "old_type": "apply",
                        "val": "Blastoise's Hydro Pump",
                        "turn": 0
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1107358822051368990/Untitled.png"
            }
        ]
    },
    {
        "id": "articuno",
        "characterId": "articuno",
        "name": "Articuno",
        "universe": "pokemon",
        "role": "Mage",
        "facePicture": "https://media.discordapp.net/attachments/1078430469034610749/1100965983960703116/2.png",
        "description": "A legendary bird Pokemon with long and distinctive tail feathers. Said to appear if you are freezing on a snowy mountain.",
        "skills": [
            {
                "id": "articuno-blizzard",
                "name": "Blizzard",
                "skilldescription": "Deals 15 damage to all enemies and paralyzes their cooldowns for 1 turn. If 'Ice Beam' is used on a character affected by this skill, it will also paralyze their cooldowns for 1 turn instead.",
                "energy": [
                    "Genjutsu"
                ],
                "cooldown": 1,
                "classes": [
                    "Energy",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "all-enemies",
                        "type": "damage",
                        "amount": 15,
                        "metadata": {
                            "harmful": true
                        }
                    },
                    {
                        "scope": "all-enemies",
                        "type": "apply_status",
                        "statusId": "cooldown_paralyze",
                        "duration": 1,
                        "metadata": {
                            "harmful": true,
                            "paralyzeCooldowns": true,
                            "tooltipText": "Cooldowns are paralyzed."
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1098017742445088859/3_1_75x75.png"
            },
            {
                "id": "articuno-ice-beam",
                "name": "Ice Beam",
                "skilldescription": "Deals 20 affliction damage to one enemy. Has a 50% chance to stun non-mental skills for 1 turn. Using 'Blizzard' on a character stunned by this skill will stun their non-mental skills for 1 turn.",
                "energy": [
                    "Ninjutsu"
                ],
                "cooldown": 0,
                "classes": [
                    "Affliction",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 20,
                        "metadata": {
                            "harmful": true,
                            "afflictionDamage": true
                        }
                    },
                    {
                        "scope": "target",
                        "type": "apply_status",
                        "statusId": "articuno-ice-beam-stun",
                        "duration": 1,
                        "metadata": {
                            "harmful": true,
                            "chancePercent": 50,
                            "cannotUseNonMentalSkills": true,
                            "tooltipText": "Non-mental skills are stunned."
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1098017789370966136/2_1_75x75.png"
            },
            {
                "id": "articuno-sheer-cold",
                "name": "Sheer Cold",
                "skilldescription": "Casts 'Blizzard' then 'Ice Beam' on the enemy team and increases Articuno's damage by 5 permanently (Stacks).",
                "energy": [
                    "Genjutsu",
                    "Ninjutsu",
                    "Random"
                ],
                "cooldown": 2,
                "classes": [
                    "Energy",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "all-enemies",
                        "type": "damage",
                        "amount": 15,
                        "metadata": {
                            "harmful": true
                        }
                    },
                    {
                        "scope": "all-enemies",
                        "type": "apply_status",
                        "statusId": "cooldown_paralyze",
                        "duration": 1,
                        "metadata": {
                            "harmful": true,
                            "paralyzeCooldowns": true,
                            "tooltipText": "Cooldowns are paralyzed."
                        }
                    },
                    {
                        "scope": "all-enemies",
                        "type": "damage",
                        "amount": 20,
                        "metadata": {
                            "harmful": true,
                            "afflictionDamage": true
                        }
                    },
                    {
                        "scope": "all-enemies",
                        "type": "apply_status",
                        "statusId": "articuno-ice-beam-stun",
                        "duration": 1,
                        "metadata": {
                            "harmful": true,
                            "chancePercent": 50,
                            "cannotUseNonMentalSkills": true,
                            "tooltipText": "Non-mental skills are stunned."
                        }
                    },
                    {
                        "scope": "self",
                        "type": "apply_status",
                        "statusId": "articuno-sheer-cold-buff",
                        "duration": -1,
                        "metadata": {
                            "damageBonusFlat": 5,
                            "stackMetadataKey": "damageBonusFlat",
                            "tooltipText": "Damage increased by 5."
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1098017820761129060/8_1_75x75.png"
            },
            {
                "id": "articuno-fast-agility",
                "name": "Fast Agility",
                "skilldescription": "Makes this character invulnerable for 1 turn.",
                "energy": [
                    "Random"
                ],
                "cooldown": 4,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "self",
                        "type": "apply_status",
                        "statusId": "invulnerable",
                        "duration": 1,
                        "metadata": {
                            "invulnerable": true,
                            "tooltipText": "This character is invulnerable."
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1098017855204761640/4_1_75x75.png"
            }
        ]
    },
    {
        "id": "moltres",
        "characterId": "moltres",
        "name": "Moltres",
        "universe": "pokemon",
        "role": "Mage",
        "facePicture": "https://cdn.discordapp.com/attachments/971753063046066266/1100973120367636550/25.png",
        "description": "Moltres is a legendary bird POKéMON that has the ability to control fire. If this POKéMON is injured, it is said to dip its body in the molten magma of a volcano to burn and heal itself.",
        "skills": [
            {
                "id": "moltres-moltres-fire-spin",
                "name": "Moltres' Fire Spin",
                "skilldescription": "Deals 5 affliction damage to all enemies and grants them a stack of 'Flames'.",
                "energy": [
                    "Random"
                ],
                "cooldown": 1,
                "classes": [
                    "Affliction",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "all-enemies",
                        "type": "damage",
                        "amount": null,
                        "metadata": {
                            "harmful": true,
                            "afflictionDamage": true
                        }
                    },
                    {
                        "scope": "all-enemies",
                        "type": "unmapped",
                        "old_type": "stack",
                        "val": 1,
                        "turn": "-1"
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1100973136779939930/21.png"
            },
            {
                "id": "moltres-moltres-flamethrower",
                "name": "Moltres' Flamethrower",
                "skilldescription": "Deals 20 affliction damage to one enemy and grants them a stack of 'Flames'. All enemies with a stack of 'Flames' are dealt 5 affliction damage and receive another stack.",
                "energy": [
                    "Random"
                ],
                "cooldown": 0,
                "classes": [
                    "Affliction",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": null,
                        "metadata": {
                            "harmful": true,
                            "afflictionDamage": true
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1100973146938540092/19.png"
            },
            {
                "id": "moltres-sky-attack",
                "name": "Sky Attack",
                "skilldescription": "For 2 turns, Moltres becomes invulnerable and deals 5 affliction damage to all enemies. Bypasses invulnerability.",
                "energy": [],
                "cooldown": 3,
                "classes": [
                    "Affliction",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "all-enemies",
                        "type": "damage",
                        "amount": null,
                        "metadata": {
                            "harmful": true,
                            "afflictionDamage": true
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1100973155264237658/23.png"
            },
            {
                "id": "moltres-moltres-dodge",
                "name": "Moltres Dodge",
                "skilldescription": "This skill makes this character invulnerable for 1 turn.",
                "energy": [
                    "Random"
                ],
                "cooldown": 4,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1100973161559887982/24.png"
            }
        ]
    },
    {
        "id": "dragonite",
        "characterId": "dragonite",
        "name": "Dragonite",
        "universe": "pokemon",
        "role": "Bruiser",
        "facePicture": "https://cdn.discordapp.com/attachments/971753063046066266/1107446033669169222/5_75x75.png",
        "description": "Dragonite, the Dragon Pokémon. Dragonite is said to live in the sea. With its small wings and large body, it can fly faster than the speed of sound.",
        "skills": [
            {
                "id": "dragonite-dragon-claw",
                "name": "Dragon Claw",
                "skilldescription": "Deals 40 damage to one enemy, steals 1 random energy, and taunts them for 1 turn.",
                "energy": [
                    "Taijutsu",
                    "Ninjutsu"
                ],
                "cooldown": 2,
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 40,
                        "metadata": {
                            "harmful": true
                        }
                    },
                    {
                        "scope": "target",
                        "type": "unmapped",
                        "old_type": "stealChakra",
                        "val": 1,
                        "turn": 1
                    },
                    {
                        "scope": "target",
                        "type": "unmapped",
                        "old_type": "taunt",
                        "val": null,
                        "turn": 1
                    }
                ],
                "skillimage": "https://media.discordapp.net/attachments/1078430469034610749/1108793574478319646/3_75x75_1.png"
            },
            {
                "id": "dragonite-hyper-beam",
                "name": "Hyper Beam",
                "skilldescription": "Deals 35 affliction damage to one enemy then taunts them and stuns their physical and energy skills for 2 turns.",
                "energy": [
                    "Ninjutsu"
                ],
                "cooldown": 2,
                "classes": [
                    "Affliction",
                    "Control"
                ],
                "effects": [
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 35,
                        "metadata": {
                            "harmful": true,
                            "afflictionDamage": true
                        }
                    }
                ],
                "skillimage": "https://media.discordapp.net/attachments/1078430469034610749/1108793590286667796/1_75x75_1.png"
            },
            {
                "id": "dragonite-draco-meteor",
                "name": "Draco Meteor",
                "skilldescription": "Deals 15 piercing damage to them every turn for 3 turns. ",
                "energy": [
                    "Ninjutsu",
                    "Genjutsu"
                ],
                "cooldown": 4,
                "classes": [
                    "Energy",
                    "Control"
                ],
                "effects": [
                    {
                        "scope": "all-enemies",
                        "type": "damage",
                        "amount": 15,
                        "metadata": {
                            "harmful": true,
                            "ignoreDamageReduction": true
                        }
                    }
                ],
                "skillimage": "https://media.discordapp.net/attachments/1078430469034610749/1108793602907324436/2_75x75.png"
            },
            {
                "id": "dragonite-passive:-frustration",
                "name": "Passive: Frustration",
                "skilldescription": "Every time Dragonite uses a new skill he gains 10 points of unpierceable damage reduction for 3 turns (stacks). If the taunted enemy does not use a new skill on Dragonite when he taunts them, he will refresh the taunt effect then grant his allies 10 points of unpierceable damage reduction for 3 turns.",
                "energy": [],
                "cooldown": 0,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://media.discordapp.net/attachments/1078430469034610749/1108793620405944340/4_75x75_3.png"
            }
        ]
    },
    {
        "id": "mewtwo",
        "characterId": "mewtwo",
        "name": "Mewtwo",
        "universe": "pokemon",
        "role": "Mage",
        "facePicture": "https://cdn.discordapp.com/attachments/971753063046066266/1107995190888767499/14_75x75.png",
        "description": "Mewtwo is a Pokémon that was created by genetic manipulation. However, even though the scientific power of humans created this Pokémon's body, they failed to endow Mewtwo with a compassionate heart.",
        "skills": [
            {
                "id": "mewtwo-mewtwos-shadow-ball",
                "name": "Mewtwo's Shadow Ball",
                "skilldescription": "Deals 25 damage to one enemy. For 1 turn, any new skill the target uses will be delayed for 1 turn.",
                "energy": [],
                "cooldown": 1,
                "classes": [
                    "Energy",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 25,
                        "metadata": {
                            "harmful": true
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1107995212837568553/4_75x75_3.png"
            },
            {
                "id": "mewtwo-mewtwos-psychic",
                "name": "Mewtwo's Psychic",
                "skilldescription": "Mewtwo steals all of one enemy's helpful effects for 2 turns. While active, this may be used for 1 random energy to deal 20 piercing damage to one enemy. When this effect ends, so does any helpful effects Mewtwo stole. This skill cannot steal unremovable skills.",
                "energy": [
                    "Genjutsu"
                ],
                "cooldown": 0,
                "classes": [
                    "Energy",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 20,
                        "metadata": {
                            "harmful": true,
                            "ignoreDamageReduction": true
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1107995156570976356/25_75x75_1.png"
            },
            {
                "id": "mewtwo-mewtwos-barrier",
                "name": "Mewtwo's Barrier",
                "skilldescription": "Mewtwo or one ally gains 25 points of permanent destructible defense and ignores enemy non-damage effects until it is broken. This skill may not be used on an already affected character.",
                "energy": [
                    "Ninjutsu"
                ],
                "cooldown": 2,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "target",
                        "type": "apply_status",
                        "statusId": "destructible_defense",
                        "duration": "-1",
                        "metadata": {
                            "destructibleDefense": 25,
                            "tooltipText": "Has 25 destructible defense."
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1107995155270742147/21_75x75_1.png"
            },
            {
                "id": "mewtwo-mewtwos-recover",
                "name": "Mewtwo's Recover",
                "skilldescription": "Mewtwo heals 25HP. For 1 turn, his skills have their costs changed to 1 random energy. This skill heals 5 less health every turn it's used in a row (stacks).",
                "energy": [
                    "Taijutsu"
                ],
                "cooldown": 0,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "self",
                        "type": "heal",
                        "amount": 25
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1107995200074305546/2_75x75.png"
            },
            {
                "id": "mewtwo-passive:-mega-mewtwo-y",
                "name": "Passive: Mega Mewtwo Y",
                "skilldescription": "If Mewtwo uses 'Mewtwo's Psychic' 4 times in a game then uses 'Mewtwo's Shadow Ball' at any point, it will transform into Mega Mewtwo Y, healing 25HP, changing all of it's skills energy colors to random energy, gaining 5 unpierceable damage reduction, and swaps 'Mewtwo's Psychic' to 'Psyblast' permanently.",
                "energy": [],
                "cooldown": 0,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1107995131136704573/18_75x75_1.png"
            },
            {
                "id": "mewtwo-passive:-mega-mewtwo-x",
                "name": "Passive: Mega Mewtwo X",
                "skilldescription": "If Mewtwo uses 'Recover' 4 times in a game then uses 'Barrier' at any point, it will transform into Mega Mewtwo X, healing 25HP, making all of it's skills uncounterable/unreflectable/bypassing, gaining 15 points of unpierceable damage reduction, and swaps 'Recover' to 'Drain Punch' permanently.",
                "energy": [],
                "cooldown": 0,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1107995155522404402/24_75x75_1.png"
            },
            {
                "id": "mewtwo-psyblast",
                "name": "Psyblast",
                "skilldescription": "Mewtwo permanently steals all helpful effect from an enemy and deals 25 damage to them.",
                "energy": [
                    "Random",
                    "Random"
                ],
                "cooldown": 1,
                "classes": [
                    "Energy",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1107995130813747200/123.png"
            },
            {
                "id": "mewtwo-drain-punch",
                "name": "Drain Punch",
                "skilldescription": "Steals 25HP from one enemy and changes the cost of Mewtwo's skills to 1 random energy for 1 turn. This skill steals 5 less health every turn it's used in a row (stacks).",
                "energy": [
                    "Taijutsu"
                ],
                "cooldown": 0,
                "classes": [
                    "Energy",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 25,
                        "metadata": {
                            "harmful": true,
                            "afflictionDamage": true
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1107995156348682250/26_75x75.png"
            }
        ]
    },
    {
        "id": "beedrill",
        "characterId": "beedrill",
        "name": "Beedrill",
        "universe": "pokemon",
        "role": "Assassin",
        "facePicture": "https://cdn.discordapp.com/attachments/1106686648516890725/1123299923455119444/8_75x75.png",
        "description": "It has three poisonous stingers on its forelegs and its tail. They are used to jab its enemy repeatedly.",
        "skills": [
            {
                "id": "beedrill-poison-sting",
                "name": "Poison Sting",
                "skilldescription": "Deals 5 affliction damage to one enemy permanently (stacks).",
                "energy": [
                    "Random"
                ],
                "cooldown": 0,
                "classes": [
                    "Affliction",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 5,
                        "metadata": {
                            "harmful": true,
                            "afflictionDamage": true
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/1106686648516890725/1123299938097442846/5_75x75.png"
            },
            {
                "id": "beedrill-twinneedle",
                "name": "Twinneedle",
                "skilldescription": "Deals 15 damage to one enemy twice. Has a 25% chance to blind the target, making their new harmful skills target enemies or allies at random.",
                "energy": [
                    "Random",
                    "Random"
                ],
                "cooldown": 1,
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 15,
                        "metadata": {
                            "harmful": true
                        }
                    },
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 15,
                        "metadata": {
                            "harmful": true
                        }
                    },
                    {
                        "scope": "target",
                        "type": "apply_status",
                        "statusId": "blinded-twinneedle",
                        "duration": 1,
                        "metadata": {
                            "harmful": true,
                            "harmfulBlind": true,
                            "chancePercent": 25,
                            "tooltipText": "This enemy is blinded."
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/1106686648516890725/1123299951234003085/7_75x75_1.png"
            },
            {
                "id": "beedrill-envenom",
                "name": "Envenom",
                "skilldescription": "Deals 10 affliction damage to every enemy affected by 'Poison Sting' + 5 damage for every stack of it they have. For 1 turn, every target is blinded, making their new harmful skills target enemies or allies at random.",
                "energy": [
                    "Ninjutsu"
                ],
                "cooldown": 2,
                "classes": [
                    "Affliction",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "all-enemies",
                        "type": "damage",
                        "amount": 10,
                        "metadata": {
                            "harmful": true,
                            "afflictionDamage": true,
                            "bonusPerStatusMetadata": {
                                "statusId": "beedrill-poison-sting",
                                "metadataKey": "stacks",
                                "multiplier": 5,
                                "scope": "target"
                            },
                            "condition": {
                                "statusId": "beedrill-poison-sting",
                                "scope": "target"
                            }
                        }
                    },
                    {
                        "scope": "all-enemies",
                        "type": "apply_status",
                        "statusId": "blinded",
                        "duration": 1,
                        "metadata": {
                            "harmful": true,
                            "harmfulBlind": true,
                            "tooltipText": "This enemy is blinded."
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/1106686648516890725/1123306401306005676/4_75x75_5.png"
            },
            {
                "id": "beedrill-hive-swarm",
                "name": "Hive Swarm",
                "skilldescription": "For 3 turns, Beedrill ignores the next 3 enemy damage effects, ignores enemy stuns, and this becomes 'Hive Sting'.",
                "energy": [
                    "Random"
                ],
                "cooldown": 6,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "self",
                        "type": "apply_status",
                        "statusId": "beedrill-hive-swarm",
                        "duration": 3,
                        "metadata": {
                            "ignoreEnemyDamage": true,
                            "ignoreEnemyDamageCount": 3,
                            "cannotBeStunned": true,
                            "skillReplacements": {
                                "beedrill-hive-swarm": "beedrill-hive-sting"
                            },
                            "tooltipText": "Ignores the next 3 enemy damage effects and ignores enemy stuns."
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/1106686648516890725/1123299896838062090/1234.png"
            },
            {
                "id": "beedrill-hive-sting",
                "name": "Hive Sting",
                "skilldescription": "Casts 'Poison Sting' on the enemy team.",
                "energy": [
                    "Random",
                    "Random"
                ],
                "cooldown": 0,
                "classes": [
                    "Affliction",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "all-enemies",
                        "type": "damage",
                        "amount": 5,
                        "metadata": {
                            "harmful": true,
                            "afflictionDamage": true
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/1106686648516890725/1123299897148457120/123.png"
            },
            {
                "id": "beedrill-passive:-mega-beedrill",
                "name": "Passive: Mega Beedrill",
                "skilldescription": "If Beedrill sucessfully uses 'Envenom' twice in a game he will transform into Mega Beedrill, healing 25HP, gaining 10 points of unpierceable damage reduction, and swapping 'Envenom' to 'Fell Stinger' permanently.",
                "energy": [],
                "cooldown": 0,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "self",
                        "type": "apply_status",
                        "statusId": "beedrill-mega-beedrill-tracker",
                        "duration": -1,
                        "metadata": {
                            "onOwnerUseSkillIdsAny": [
                                "beedrill-envenom"
                            ],
                            "onOwnerUseSkillTrigger": true,
                            "onOwnerUseSkillApplyStatusToOwner": {
                                "statusId": "beedrill-mega-beedrill-tracker",
                                "duration": -1,
                                "metadata": {
                                    "envenomCasts": 1
                                }
                            },
                            "applyStatusAtStack": {
                                "metadataKey": "envenomCasts",
                                "value": 2,
                                "statusId": "beedrill-mega-transformation",
                                "duration": -1,
                                "metadata": {
                                    "unpierceableDamageReductionFlat": 10,
                                    "skillReplacements": {
                                        "beedrill-envenom": "beedrill-fell-stinger"
                                    },
                                    "onApplyEffect": {
                                        "scope": "self",
                                        "type": "heal",
                                        "amount": 25
                                    },
                                    "tooltipText": "Transformed into Mega Beedrill. Has 10 unpierceable damage reduction."
                                }
                            }
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/1106686648516890725/1123299923731959918/1_75x75_2.png"
            },
            {
                "id": "beedrill-fell-stinger",
                "name": "Fell Stinger",
                "skilldescription": "Deals 20 affliction damage to one enemy + 10 for every stack of 'Poison Sting' they have. If the target survives, they are blinded permanently, making their new harmful skills target enemies or allies at random.",
                "energy": [
                    "Ninjutsu"
                ],
                "cooldown": 3,
                "classes": [
                    "Affliction",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 20,
                        "metadata": {
                            "harmful": true,
                            "afflictionDamage": true,
                            "bonusPerStatusMetadata": {
                                "statusId": "beedrill-poison-sting",
                                "metadataKey": "stacks",
                                "multiplier": 10,
                                "scope": "target"
                            }
                        }
                    },
                    {
                        "scope": "target",
                        "type": "apply_status",
                        "statusId": "blinded-permanent",
                        "duration": -1,
                        "metadata": {
                            "harmful": true,
                            "harmfulBlind": true,
                            "tooltipText": "This enemy is blinded permanently."
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/1106686648516890725/1123299924260425758/3_75x75_3.png"
            }
        ]
    },
    {
        "id": "cyndaquil",
        "characterId": "cyndaquil",
        "name": "Cyndaquil",
        "universe": "pokemon",
        "role": "Specialist",
        "facePicture": "https://media.discordapp.net/attachments/1038559057180635286/1152340655864033311/11_75x75_1.png",
        "description": "Cyndaquil protects itself by flaring up the flames on its back. The flames are vigorous if the Pokémon is angry. However, if it is tired, the flames splutter fitfully with incomplete combustion.",
        "skills": [
            {
                "id": "cyndaquil-aerial-tackle",
                "name": "Aerial Tackle",
                "skilldescription": "Deals 20 damage to one enemy and cancels any control skills they have active.",
                "energy": [
                    "Random"
                ],
                "cooldown": 0,
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 20,
                        "metadata": {
                            "harmful": true
                        }
                    }
                ],
                "skillimage": "https://media.discordapp.net/attachments/1038559057180635286/1152340655415230524/14_75x75.png"
            },
            {
                "id": "cyndaquil-aerial-flamethrower",
                "name": "Aerial Flamethrower",
                "skilldescription": "Deals 5 affliction damage to all enemies.",
                "energy": [],
                "cooldown": 1,
                "classes": [
                    "Affliction",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "all-enemies",
                        "type": "damage",
                        "amount": 5,
                        "metadata": {
                            "harmful": true,
                            "afflictionDamage": true
                        }
                    }
                ],
                "skillimage": "https://media.discordapp.net/attachments/1038559057180635286/1152340654379249794/17_75x75.png"
            },
            {
                "id": "cyndaquil-cynda-smokescreen",
                "name": "Cynda-Smokescreen",
                "skilldescription": "Fully blinds the enemy team for 1 turn. ‘Aerial Flamethrower’ lasts 1 additional turn on a character affected by this skill.",
                "energy": [
                    "Random",
                    "Random"
                ],
                "cooldown": 3,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "all-enemies",
                        "type": "unmapped",
                        "old_type": "blind",
                        "val": null,
                        "turn": 1
                    }
                ],
                "skillimage": "https://media.discordapp.net/attachments/1038559057180635286/1152340655197139095/13_75x75.png"
            },
            {
                "id": "cyndaquil-skyward-leap",
                "name": "Skyward Leap",
                "skilldescription": "The next enemy skill used in Cyndaquil will miss for 1 turn. The following turn, ‘Aerial Tackle’ and ‘Aerial Flamethrower’ deal 10 additional damage. If Cyndaquil takes any new damage this skill will end.",
                "energy": [],
                "cooldown": 2,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://media.discordapp.net/attachments/1038559057180635286/1152340654979031090/16_75x75.png"
            },
            {
                "id": "cyndaquil-warming-up",
                "name": "Warming-Up",
                "skilldescription": "Cyndaquil deals 0 affliction damage to any enemy who uses a new skill on him. This skill and ‘Aerial Flamethrower’ permanently deal 5 additional damage every time Cyndaquil uses a new skill (stacks).",
                "energy": [],
                "cooldown": 0,
                "classes": [
                    "Affliction",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://media.discordapp.net/attachments/1038559057180635286/1152340655662702622/12_75x75.png"
            }
        ]
    },
    {
        "id": "chikorita",
        "characterId": "chikorita",
        "name": "Chikorita",
        "universe": "pokemon",
        "role": "Support",
        "facePicture": "https://cdn.discordapp.com/attachments/971753063046066266/1152575554353111160/1_75x75.png",
        "description": "It uses the leaf on its head to determine the air's temperature and humidity. It loves to sunbathe.",
        "skills": [
            {
                "id": "chikorita-aerial-razor-leaf",
                "name": "Aerial Razor Leaf",
                "skilldescription": "Deals 20 piercing damage to one enemy and 15 regular damage to the others then permanently lowers the main target's damage by 10 for the class of skill 'Passive: Sweet Scent' is currently reducing and the other enemy's damage by 5 (stacks).",
                "energy": [
                    "Taijutsu"
                ],
                "cooldown": 1,
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 20,
                        "metadata": {
                            "harmful": true,
                            "ignoreDamageReduction": true
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1152575588788342825/2_75x75.png"
            },
            {
                "id": "chikorita-light-screen",
                "name": "Light Screen",
                "skilldescription": "Chikorita grants itself or an ally 40 points of destructible defense for 1 turn. All enemies who use a new skill on a character with this destructible defense have their damage permanently reduced by 5 for the class of skill 'Passive: Sweet Scent' is currently reducing (stacks) and 'Chikorita Solar Beam' gains 1 stack. Invisible.",
                "energy": [
                    "Random"
                ],
                "cooldown": 2,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "target",
                        "type": "apply_status",
                        "statusId": "destructible_defense",
                        "duration": 1,
                        "metadata": {
                            "destructibleDefense": 40,
                            "tooltipText": "Has 40 destructible defense."
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1152575567514832987/4_75x75.png"
            },
            {
                "id": "chikorita-chikorita-solar-beam",
                "name": "Chikorita Solar Beam",
                "skilldescription": "Deals 40 damage to one enemy + 5 damage for every stack this skill has from 'Light Screen' then consumes all stacks. Stuns the target's skills for 3 turns for the class of skill 'Passive: Sweet Scent' is currently reducing.",
                "energy": [
                    "Taijutsu",
                    "Taijutsu"
                ],
                "cooldown": 3,
                "classes": [
                    "Energy",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 40,
                        "metadata": {
                            "harmful": true
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1152575567212855367/5_75x75.png"
            },
            {
                "id": "chikorita-vine-defense",
                "name": "Vine Defense",
                "skilldescription": "This skill makes Chikorita invulnerable for 1 turn.",
                "energy": [
                    "Random"
                ],
                "cooldown": 4,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1152575574640971877/6_75x75.png"
            },
            {
                "id": "chikorita-sweet-scent",
                "name": "Sweet Scent",
                "skilldescription": "Chikorita lowers all enemy damage every turn for that turn by 10 in this order: Physical -> Energy -> Mental -> Affliction -> Repeat",
                "energy": [],
                "cooldown": 0,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1152575588490551296/3_75x75.png"
            }
        ]
    },
    {
        "id": "totodile",
        "characterId": "totodile",
        "name": "Totodile",
        "universe": "pokemon",
        "role": "Specialist",
        "facePicture": "https://cdn.discordapp.com/attachments/971753063046066266/1152539208511144006/tatss_75x75.png",
        "description": "Totodile, the Big Jaw Pokémon. It is a Water-type Pokémon known for its insatiable curiosity and playfulness. Totodile's powerful jaws can crush anything, and it loves to practice its biting skills by chomping on rocks and logs. Its natural habitat is near bodies of water, where it uses its swift swimming abilities to catch prey. Despite its mischievous nature, Totodile forms strong bonds with its trainers and evolves into a formidable Feraligatr.",
        "skills": [
            {
                "id": "totodile-aerial-water-gun",
                "name": "Aerial Water Gun",
                "skilldescription": "Deals 10 damage to all enemies and delays their harmful skills for 1 turn. Totodile gains one stack of 'Passive: Water Rings'. If used on an enemy affected by 'Scary Face', the delay lasts for 1 additional turn.",
                "energy": [
                    "Ninjutsu"
                ],
                "cooldown": 0,
                "classes": [
                    "Energy",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "all-enemies",
                        "type": "damage",
                        "amount": 10,
                        "metadata": {
                            "harmful": true
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1152539213292638208/asdf_75x75.png"
            },
            {
                "id": "totodile-scary-face",
                "name": "Scary Face",
                "skilldescription": "One enemy becomes unable to reduce damage or become invulnerable and takes 10 additional damage from physical and energy damage skills for 2 turns.",
                "energy": [
                    "Random"
                ],
                "cooldown": 2,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1152539213649170562/12343_75x75.png"
            },
            {
                "id": "totodile-aqua-tail",
                "name": "Aqua Tail",
                "skilldescription": "Deals 45 piercing damage to one enemy. Consumes all stacks of 'Passive: Water Rings' to fully stun the target for 1 turn per stack.",
                "energy": [
                    "Ninjutsu",
                    "Ninjutsu"
                ],
                "cooldown": 1,
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 45,
                        "metadata": {
                            "harmful": true,
                            "ignoreDamageReduction": true
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1152539208783761488/qwere_75x75.png"
            },
            {
                "id": "totodile-superpower",
                "name": "Superpower",
                "skilldescription": "Totodile becomes invulnerable for 1 turn. Next turn, 'Aqua Tail' will deal 15 additional damage but then have its damage permanently reduced by 10 afterwards (stacks).",
                "energy": [
                    "Random"
                ],
                "cooldown": 4,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1152539212990664796/543_75x75.png"
            },
            {
                "id": "totodile-water-rings",
                "name": "Water Rings",
                "skilldescription": "Totodile heals 5HP every turn for every stack of this skill he has. Every time Totodile is affected by a new non-strategic skill, he loses 1 stack.",
                "energy": [],
                "cooldown": 0,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1152539213988905072/123213_75x75.png"
            }
        ]
    },
    {
        "id": "nurse-joy",
        "characterId": "nurse-joy",
        "name": "Nurse Joy",
        "universe": "pokemon",
        "role": "Support",
        "facePicture": "https://cdn.discordapp.com/attachments/971753063046066266/1106895567159840918/4_75x75_2.png",
        "description": "Nurse Joy is the name of multiple nurses that work in Pokémon Centers throughout the various locations in the regions in the world. A Nurse Joy can completely restore any Pokémon back to perfect health. If needed, her faithful Chansey helpers are even capable of defending her with explosive eggs.",
        "skills": [
            {
                "id": "nurse-joy-egg-bomb",
                "name": "Egg Bomb",
                "skilldescription": "Deals 20 affliction damage to one enemy and makes them ignore healing effects for 1 turn.",
                "energy": [
                    "Random"
                ],
                "cooldown": 0,
                "classes": [
                    "Affliction",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 20,
                        "metadata": {
                            "harmful": true,
                            "afflictionDamage": true
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1106895586717872148/6_1_75x75.png"
            },
            {
                "id": "nurse-joy-healing-wish",
                "name": "Healing Wish",
                "skilldescription": "Nurse Joy targets herself or an ally. After a 1 turn delay, the target will be healed 25HP and this also has a 50% chance to make them unable to be killed for 1 turn. This skill is invisible.",
                "energy": [
                    "Random"
                ],
                "cooldown": 1,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "target",
                        "type": "unmapped",
                        "old_type": "delay",
                        "val": 25,
                        "turn": 1
                    },
                    {
                        "scope": "target",
                        "type": "unmapped",
                        "old_type": "percentageEffect",
                        "val": null,
                        "turn": 1
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1106895595915980860/Untitled-3.png"
            },
            {
                "id": "nurse-joy-pokemon-center",
                "name": "Pokemon Center",
                "skilldescription": "Nurse Joy instantly removes all health cap skills from her allies. For 4 turns, Nurse Joy's allies will gain 5 points of permanent destructible defense and be healed 10HP each turn. Swaps to 'Emergency Pokemon Surgery', 'Healing Wish' will activate instantly, and 'Chansey Rescue' has no cooldown while active.",
                "energy": [
                    "Random"
                ],
                "cooldown": 3,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "self",
                        "type": "unmapped",
                        "old_type": "replace",
                        "val": null,
                        "turn": 1
                    },
                    {
                        "scope": "target",
                        "type": "heal",
                        "amount": 25
                    },
                    {
                        "scope": "target",
                        "type": "unmapped",
                        "old_type": "percentageEffect",
                        "val": null,
                        "turn": 1
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1106895602337464320/7_1_75x75.png"
            },
            {
                "id": "nurse-joy-chansey-rescue",
                "name": "Chansey Rescue",
                "skilldescription": "This skill makes Nurse Joy or one ally invulnerable for 1 turn.",
                "energy": [
                    "Random"
                ],
                "cooldown": 4,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1106895607064449075/12.png"
            },
            {
                "id": "nurse-joy-emergency-pokemon-surgery",
                "name": "Emergency Pokemon Surgery",
                "skilldescription": "Nurse Joy targets both of her allies, removing all enemy skills from them, healing them 50HP, and making them unable to be healed for 3 turns.",
                "energy": [
                    "Genjutsu"
                ],
                "cooldown": 0,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1106895611812380732/3_75x75.png"
            }
        ]
    },
    {
        "id": "pichu",
        "characterId": "pichu",
        "name": "Pichu",
        "universe": "pokemon",
        "role": "Support",
        "facePicture": "https://cdn.discordapp.com/attachments/971753063046066266/1157377682938544128/5_75x75_1.png?ex=65186376&is=651711f6&hm=2206380dc93117365633e62de07415a96fa76cfcb22c6199037eeaf58265e495&",
        "description": "Pichu is the baby form of Pikachu and Raichu.",
        "skills": [
            {
                "id": "pichu-baby-thundershock",
                "name": "Baby Thundershock",
                "skilldescription": "Deals 25 piercing damage to one enemy and paralyzes their cooldowns for 1 turn. The following 3 turns, the target is dealt 5 piercing damage each turn (stacks). Pichu gains 1 stack of 'Passive: Baby Static'.",
                "energy": [
                    "Random"
                ],
                "cooldown": 0,
                "classes": [
                    "Energy",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 25,
                        "metadata": {
                            "harmful": true,
                            "ignoreDamageReduction": true
                        }
                    },
                    {
                        "scope": "target",
                        "type": "apply_status",
                        "statusId": "cooldown_paralyze",
                        "duration": 1,
                        "metadata": {
                            "harmful": true,
                            "paralyzeCooldowns": true,
                            "tooltipText": "Cooldowns are paralyzed."
                        }
                    },
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 5,
                        "metadata": {
                            "harmful": true,
                            "ignoreDamageReduction": true
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1157377697429868544/4_75x75_6.png?ex=6518637a&is=651711fa&hm=f0e00b969422914e2c2e8940585afc17aec49425ea8cd13bf080b3b0b6465024&"
            },
            {
                "id": "pichu-iron-tail",
                "name": "Iron Tail",
                "skilldescription": "Consumes all stacks of 'Passive: Baby Static' to deal 10 damage to one enemy, stun them for 1 turn, and heal Pichu 10HP for each stack.",
                "energy": [
                    "Random",
                    "Random"
                ],
                "cooldown": 3,
                "classes": [
                    "Physical",
                    "Instant"
                ],
                "effects": [
                    {
                        "scope": "target",
                        "type": "damage",
                        "amount": 0,
                        "metadata": {
                            "harmful": true
                        }
                    }
                ],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1157377705545838772/7_75x75_2.png?ex=6518637c&is=651711fc&hm=b76d6ed066f56649355b0ec91c65210328d951074d86a12c32c9812183484774&"
            },
            {
                "id": "pichu-baby-thunder",
                "name": "Baby Thunder",
                "skilldescription": "Deals 20 piercing damage to the enemy team and permanently increases their cooldowns by 1 turn (stacks). Pichu gains 2 stacks of 'Passive: Baby Static'.",
                "energy": [],
                "cooldown": 2,
                "classes": [
                    "Energy",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1157377727431720980/6_75x75_1.png?ex=65186381&is=65171201&hm=3a2ac57b82bbb7ccbdc45d6f0ac81352608ed19647d18e2d16d087ff2d3b7e5e&"
            },
            {
                "id": "pichu-pichu-flee",
                "name": "Pichu Flee",
                "skilldescription": "This makes Pichu invulnerable for 1 turn. Pichu gains 1 stack of 'Passive: Baby Static'.",
                "energy": [
                    "Random"
                ],
                "cooldown": 4,
                "classes": [
                    "Strategic",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1157377736810180628/1_75x75_3.png?ex=65186383&is=65171203&hm=d80293122080a8760bd1154759a9149e1f3b97f9996b0636d310561d36996c0d&"
            },
            {
                "id": "pichu-passive:-baby-static",
                "name": "Passive: Baby Static",
                "skilldescription": "Deals 5 piercing damage to any enemy that uses a new skill on Pichu for every stack of this skill he has.",
                "energy": [],
                "cooldown": 0,
                "classes": [
                    "Energy",
                    "Instant"
                ],
                "effects": [],
                "skillimage": "https://cdn.discordapp.com/attachments/971753063046066266/1157377742896111716/3_75x75_3.png?ex=65186384&is=65171204&hm=3de9842889139971a1116caf4875905e56132efe554c067af6954ef76cb913df&"
            }
        ]
    }
];

if (typeof window !== 'undefined') {
    window.characters = characters;
}

if (typeof module !== 'undefined') {
    module.exports = characters;
}
