(function (root, factory) {
    const batch = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = batch;
    else if (root && Array.isArray(root.characters)) {
        const existingIds = new Set(root.characters.map((character) => character?.characterId || character?.id));
        batch.forEach((character) => {
            const characterId = character?.characterId || character?.id;
            if (characterId && !existingIds.has(characterId)) {
                root.characters.push(character);
                existingIds.add(characterId);
            }
        });
    }
})(typeof window !== 'undefined' ? window : globalThis, function () {
    const img = (pokemon, file) => `assets/images/PokemonArena/${pokemon}/${file}`;
    const damage = (amount, scope = 'target', metadata = {}) => ({ type: 'damage', amount, scope, metadata });
    const status = (statusId, duration, scope, metadata = {}) => ({ type: 'apply_status', statusId, duration, scope, metadata });
    const normalizeDamageClasses = (classes = []) => {
        const hasPhysical = classes.some((entry) => String(entry).toLowerCase() === 'physical');
        const hasSpecial = classes.some((entry) =>
            ['special', 'energy', 'mental'].includes(String(entry).toLowerCase())
        );
        const hasAffliction = classes.some((entry) => String(entry).toLowerCase() === 'affliction');
        const damageClass = hasPhysical ? 'Physical' : (hasSpecial || hasAffliction ? 'Special' : '');
        const otherClasses = classes.filter(
            (entry) => !['physical', 'special', 'energy', 'mental', 'affliction'].includes(String(entry).toLowerCase())
        );
        return Array.from(new Set([
            ...(damageClass ? [damageClass] : []),
            ...(hasAffliction ? ['Affliction'] : []),
            ...otherClasses,
        ]));
    };
    const skill = (id, name, pokemon, file, description, energy, cooldown, target, classes, effects) => ({
        id, name, skillimage: img(pokemon, file), skilldescription: description, description,
        energy, cooldown, target, damage: 0, classes: normalizeDamageClasses(classes), effects,
    });
    const roleCategory = (role) => String(role || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    const character = (id, name, role, folder, face, description, skills, startStatuses = []) => ({
        id, characterId: id, name, arena: 'pokemon', universe: 'pokemon', role,
        roleCategory: roleCategory(role), facePicture: img(folder, face), characterdeescription: description,
        description, descriptionHtml: description, skills, startStatuses,
    });
    const evolved = (base, next) => ({ ...base, evolvesTo: next });

    return [
        character('clefairy', 'Clefairy', 'Damage Support', 'clefairy', 'fp.webp',
            'A restorative specialist that cleanses battlefield tricks, borrows skills with Metronome, and evolves after restoring 75 actual HP.', [
            evolved(
                skill('clefairy-metronome', 'Metronome', 'clefairy', 'metronome.png', 'Casts a random copy-safe damaging skill on an enemy or a random copy-safe helpful skill on an ally.', ['Random','Random'], 2, 'single-character', ['Mental','Ranged','Instant'], [{ type:'metronome', scope:'target' }]),
                skill('clefable-metronome', 'Clefable Metronome', 'clefairy', 'clefablemetronome.webp', 'Casts a random copy-safe damaging skill on an enemy or a random copy-safe helpful skill on an ally.', ['Random'], 2, 'single-character', ['Mental','Ranged','Instant'], [{ type:'metronome', scope:'target' }])
            ),
            evolved(
                skill('clefairy-double-slap', 'Double Slap', 'clefairy', 'Double Slap.png', 'Deals 15 damage now and 15 more at the beginning of Clefairy\'s next turn.', ['Random'], 2, 'single-enemy', ['Physical','Melee','Instant'], [damage(15), status('clefairy_double_slap', 1, 'target', { turnEndTrigger:'source_turn',turnEndDamage:15,harmful:true })]),
                skill('clefable-double-slap', 'Clefable Double Slap', 'clefairy', 'clefabledoubleslap.webp', 'Deals 20 damage now and 20 more at the beginning of Clefable\'s next turn.', ['Random','Random'], 2, 'single-enemy', ['Physical','Melee','Instant'], [damage(20), status('clefable_double_slap', 1, 'target', { turnEndTrigger:'source_turn',turnEndDamage:20,harmful:true })])
            ),
            evolved(
                skill('clefairy-disarming-voice', 'Disarming Voice', 'clefairy', 'disarmingvoice.webp', 'Removes allied accuracy reductions and enemy evasion, then deals 20 damage to all enemies.', ['Random','Random'], 2, 'all-enemy', ['Physical','Ranged','Instant'], [{type:'cleanse_accuracy_and_evasion'}, damage(20,'all-enemy')]),
                skill('clefable-disarming-voice', 'Clefable Disarming Voice', 'clefairy', 'clefabledisarmingvoice.webp', 'Removes and prevents allied accuracy reductions and enemy evasion for 2 turns, then deals 20 damage to all enemies.', ['Random','Random','Random'], 2, 'all-enemy', ['Physical','Ranged','Instant'], [{type:'cleanse_accuracy_and_evasion'}, damage(20,'all-enemy'), status('clefable_disarming_voice_field',2,'self',{preventTeamAccuracyReduction:true,preventEnemyEvasion:true})])
            ),
            evolved(
                skill('clefairy-moonlight', 'Moonlight', 'clefairy', 'moonlight.webp', 'Heals an ally for 60% of current HP, then 40%, 20%, and 0% on consecutive uses. Cleanses Affliction effects.', ['Bloodline'], 0, 'self-or-single-ally', ['Mental','Ranged','Instant'], [{type:'moonlight'}]),
                skill('clefable-moonlight', 'Clefable Moonlight', 'clefairy', 'clefablemoonlight.webp', 'Heals an ally for 60% of current HP, then 40%, 20%, and 0% on consecutive uses. Cleanses Affliction effects.', ['Random'], 0, 'self-or-single-ally', ['Mental','Ranged','Instant'], [{type:'moonlight'}])
            ),
            skill('clefairy-evolution-clefable','Evolution: Clefable','clefairy','evolutionclefable.webp','After Clefairy restores 75 actual HP, it evolves into Clefable with improved skills.',[],0,'',['Passive','Strategic','Instant'],[])
        ], [{statusId:'clefairy_evolution_tracker',sourceSkillId:'clefairy-evolution-clefable',duration:999,metadata:{infiniteDuration:true,unremovable:true,healingProgress:0,evolutionThreshold:75,evolutionStatusId:'clefairy_clefable_evolution',evolvedFacePicture:img('clefairy','clefablefp.webp')}}]),

        character('jigglypuff','Jigglypuff','Utility Support','jigglypuff','fp.webp',
            'A countdown controller that accelerates Perish Song and evolves into Wigglytuff after completing its execution.', [
            evolved(
                skill('jigglypuff-perish-song','Perish Song','jigglypuff','parishsong.webp','Marks one enemy for 4 turns. When it expires, they are instantly defeated, even if Jigglypuff has died.', ['Random','Random','Random'],0,'single-enemy',['Mental','Ranged','Instant'],[status('jigglypuff_perish_song',4,'target',{harmful:true,visible:true,unremovable:true,instantKillOnExpire:true,uniqueEnemyMarkFromSource:true})]),
                skill('wigglytuff-perish-song','Wigglytuff Perish Song','jigglypuff','wigglytuffparishsong.webp','Marks one enemy for 3 turns. When it expires, they are instantly defeated, even if Wigglytuff has died.', ['Random','Random','Random'],0,'single-enemy',['Mental','Ranged','Instant'],[status('jigglypuff_perish_song',3,'target',{harmful:true,visible:true,unremovable:true,instantKillOnExpire:true,uniqueEnemyMarkFromSource:true})])
            ),
            evolved(
                skill('jigglypuff-sing','Sing','jigglypuff','sing.webp','Channels for 2 turns. Each turn, one enemy cannot use harmful skills and every enemy Perish Song advances once.', ['Ninjutsu','Random'],3,'single-enemy',['Mental','Ranged','Channeled'],[status('jigglypuff_sing',2,'target',{cannotUseHarmfulSkills:true,harmful:true}),status('jigglypuff_sing_channel',2,'self',{advanceAllEnemyPerishEachTurn:true,turnEndTrigger:'source_turn',tooltipText:'Sing is channeling and advances every enemy Perish Song once each turn.'})]),
                skill('wigglytuff-sing','Wigglytuff Sing','jigglypuff','wigglytuffsing.webp','Channels for 2 turns. Each turn, all enemies cannot use harmful skills and every enemy Perish Song advances once.', ['Ninjutsu','Ninjutsu','Random'],3,'all-enemy',['Mental','Ranged','Channeled'],[status('jigglypuff_sing',2,'all-enemy',{cannotUseHarmfulSkills:true,harmful:true}),status('jigglypuff_sing_channel',2,'self',{advanceAllEnemyPerishEachTurn:true,turnEndTrigger:'source_turn',tooltipText:'Sing is channeling and advances every enemy Perish Song once each turn.'})])
            ),
            evolved(
                skill('jigglypuff-wish','Wish','jigglypuff','wish.webp','Next turn, Jigglypuff or one ally heals 20 HP. Before it heals, a Perish Song target using a harmful skill on them advances its countdown once.', ['Random'],2,'self-or-single-ally',['Mental','Instant','Invisible'],[status('jigglypuff_wish',1,'target',{turnStartHeal:20,onOwnerTargetedBySkillTrigger:true,onOwnerTargetedByEnemyOnly:true,onOwnerTargetedByRequireNewSkill:true,wishAdvancePerishOnHarmful:true})]),
                skill('wigglytuff-wish','Wigglytuff Wish','jigglypuff','wigglytuffwish.webp','Next turn, Wigglytuff\'s whole team heals 20 HP. Before it heals, a Perish Song target using a harmful skill on them advances its countdown once.', ['Random','Random'],2,'all-allies',['Mental','Instant','Invisible'],[status('jigglypuff_wish',1,'all-allies',{turnStartHeal:20,onOwnerTargetedBySkillTrigger:true,onOwnerTargetedByEnemyOnly:true,onOwnerTargetedByRequireNewSkill:true,wishAdvancePerishOnHarmful:true})])
            ),
            evolved(
                skill('jigglypuff-humiliate','Humiliate','jigglypuff','humilate.webp','Costs no chakra. If the target is affected by Sing, instantly gain 1 Random chakra. If they use a new harmful skill this turn, gain 1 Random chakra and advance Perish Song once.', [],2,'single-enemy',['Physical','Melee','Instant','Invisible'],[status('jigglypuff_humiliate',1,'target',{harmful:true,triggerOnOwnerUseSkill:true,onOwnerUseSkillHarmfulOnly:true,perishAcceleration:true,gainRandomChakraForSource:true}),{type:'gain_chakra',chakraType:'random',amount:1,scope:'self',evaluateBeforeChannelCancel:true,condition:{scope:'target',statusId:'jigglypuff_sing'}}]),
                skill('wigglytuff-humiliate','Wigglytuff Humiliate','jigglypuff','wigglytuffhumilate.webp','Costs no chakra. If the target is affected by Sing, instantly gain 1 Random chakra. If they use any new skill this turn, gain 1 Random chakra and advance Perish Song once.', [],2,'single-enemy',['Physical','Melee','Instant','Invisible'],[status('jigglypuff_humiliate',1,'target',{harmful:true,triggerOnOwnerUseSkill:true,perishAcceleration:true,gainRandomChakraForSource:true}),{type:'gain_chakra',chakraType:'random',amount:1,scope:'self',evaluateBeforeChannelCancel:true,condition:{scope:'target',statusId:'jigglypuff_sing'}}])
            ),
            skill('jigglypuff-evolution-wigglytuff','Evolution: Wigglytuff','jigglypuff','evolutionwigglytuff.webp','When Perish Song defeats an enemy, Jigglypuff evolves into Wigglytuff and heals 10 HP.',[],0,'',['Passive','Strategic','Instant'],[])
        ], [{statusId:'jigglypuff_evolution_tracker',sourceSkillId:'jigglypuff-evolution-wigglytuff',duration:999,metadata:{infiniteDuration:true,unremovable:true,evolutionStatusId:'jigglypuff_wigglytuff_evolution',evolvedFacePicture:img('jigglypuff','wigglytufffp.webp')}}]),

        character('beedrill','Beedrill','Assassin','beedrill','FP.png','A stacking affliction assassin that evolves into Mega Beedrill after using Envenom twice.',[
            evolved(skill('beedrill-poison-sting','Poison Sting','beedrill','poisonsting.webp','Immediately deals 5 stacking affliction damage, then permanently repeats the current stacked damage each turn.', ['Random'],0,'single-enemy',['Affliction','Ranged','Instant'],[status('beedrill_poison_sting',999,'target',{infiniteDuration:true,harmful:true,turnStartDamage:5,afflictionDamage:true,mergeNumericAddKeys:['turnStartDamage'],poisonStingStacks:1,stackMetadataKey:'poisonStingStacks',stackDelta:1})]), skill('mega-beedrill-poison-sting','Mega Poison Sting','beedrill','poisonsting.webp','Deals 10 affliction damage, immediately adds the current Poison Sting damage, then permanently repeats that stacked damage each turn.', ['Random'],0,'single-enemy',['Affliction','Melee','Instant'],[damage(10,'target',{afflictionDamage:true}),status('beedrill_poison_sting',999,'target',{infiniteDuration:true,harmful:true,turnStartDamage:5,afflictionDamage:true,mergeNumericAddKeys:['turnStartDamage'],poisonStingStacks:1,stackMetadataKey:'poisonStingStacks',stackDelta:1})])),
            skill('beedrill-twinneedle','Twinneedle','beedrill','twinneedle.webp','Deals 15 damage twice and has a 25% chance to blind harmful skills for 1 turn.', ['Random','Random'],1,'single-enemy',['Physical','Ranged','Instant'],[damage(15),damage(15),{...status('beedrill_twinneedle_blind',1,'target',{harmful:true,harmfulBlind:true}),chance:25}]),
            evolved(skill('beedrill-envenom','Envenom','beedrill','envenom.webp','Enemies affected by Poison Sting take 10 affliction damage plus 5 per Poison Sting stack and are blinded for 1 turn.', ['Ninjutsu'],2,'all-enemy',['Affliction','Ranged','Instant'],[{type:'poison_sting_burst',baseAmount:10,amountPerStack:5,scope:'all-enemy'},{...status('beedrill_envenom_blind',1,'all-enemy',{harmful:true,harmfulBlind:true}),condition:{scope:'target',statusId:'beedrill_poison_sting'}}]), skill('mega-beedrill-fell-stinger','Fell Stinger','beedrill','fellstinger.webp','Deals 20 affliction damage plus 10 per Poison Sting stack. If the target survives, they are permanently blinded.', ['Ninjutsu'],3,'single-enemy',['Affliction','Melee','Instant'],[{type:'poison_sting_burst',baseAmount:20,amountPerStack:10,scope:'target'},status('mega_beedrill_permanent_blind',999,'target',{infiniteDuration:true,harmful:true,harmfulBlind:true})])),
            evolved(skill('beedrill-hive-swarm','Hive Swarm','beedrill','hiveswarm.webp','For 3 turns, ignores the next 3 enemy damage effects and enemy stuns. Replaced by Hive Sting.', ['Random'],6,'self',['Strategic','Instant'],[status('beedrill_hive_swarm',3,'self',{ignoreNextEnemyDamageEffects:3,ignoreEnemyStuns:true,skillReplacements:{'beedrill-hive-swarm':'beedrill-hive-sting'}})]), skill('beedrill-hive-swarm-mega','Mega Hive Swarm','beedrill','hiveswarm.webp','For 3 turns, ignores the next 3 enemy damage effects and enemy stuns. Replaced by Hive Sting.', ['Random'],6,'self',['Strategic','Instant'],[status('beedrill_hive_swarm',3,'self',{ignoreNextEnemyDamageEffects:3,ignoreEnemyStuns:true,skillReplacements:{'beedrill-hive-swarm-mega':'beedrill-hive-sting'}})])),
            skill('beedrill-hive-sting','Hive Sting','beedrill','hivesting.webp','Casts Poison Sting on the entire enemy team.', ['Random','Random'],0,'all-enemy',['Affliction','Ranged','Instant'],[status('beedrill_poison_sting',999,'all-enemy',{infiniteDuration:true,harmful:true,turnStartDamage:5,afflictionDamage:true,mergeNumericAddKeys:['turnStartDamage'],poisonStingStacks:1,stackMetadataKey:'poisonStingStacks',stackDelta:1})]),
            skill('beedrill-evolution-mega','Evolution: Mega Beedrill','beedrill','passive.webp','After Envenom is used twice, Beedrill evolves, heals 25 HP, gains permanent 10 unpierceable reduction, and Envenom becomes Fell Stinger.',[],0,'',['Passive','Instant'],[])
        ], [{statusId:'beedrill_evolution_tracker',sourceSkillId:'beedrill-evolution-mega',duration:999,metadata:{infiniteDuration:true,unremovable:true,envenomUses:0,evolutionStatusId:'beedrill_mega_evolution',evolvedFacePicture:img('beedrill','megafp.webp')}}]),

        character('articuno','Articuno','AOE DPS','articuno','fp.png','A legendary ice mage that chains cooldown paralysis and stuns into an escalating Sheer Cold.',[
            skill('articuno-blizzard','Blizzard','articuno','blizzard.png','Deals 15 damage to all enemies and paralyzes their cooldowns for 1 turn.', ['Ninjutsu'],1,'all-enemy',['Energy','Ranged','Instant'],[damage(15,'all-enemy'),status('articuno_blizzard',1,'all-enemy',{harmful:true,paralyzeCooldowns:true})]),
            skill('articuno-ice-beam','Ice Beam','articuno','icebeam.png','Deals 15 affliction damage and has a 50% chance to stun Special skills for 1 turn.', ['Ninjutsu'],0,'single-enemy',['Special','Affliction','Ranged','Instant'],[damage(15,'target',{afflictionDamage:true}),{...status('articuno_ice_beam_stun',1,'target',{harmful:true,cannotUseSkillClasses:['Special']}),chance:50}]),
            skill('articuno-sheer-cold','Sheer Cold','articuno','sheercold.png','Casts Blizzard then Ice Beam on the enemy team and permanently gains 5 damage each use.', ['Ninjutsu','Ninjutsu','Random'],2,'all-enemy',['Energy','Affliction','Ranged','Instant'],[{type:'articuno_sheer_cold',scope:'all-enemy'}]),
            skill('articuno-fast-agility','Fast Agility','articuno','agility.png','Articuno becomes invulnerable for 1 turn.', ['Random'],4,'self',['Physical','Instant'],[status('articuno_fast_agility',1,'self',{invulnerable:true})])
        ], [{statusId:'articuno_sheer_cold_tracker',sourceSkillId:'articuno-sheer-cold',duration:999,metadata:{infiniteDuration:true,unremovable:true,bonusDamage:0}}]),

        character('moltres','Moltres','AOE DPS','moltres','FP.png','A legendary fire attacker that builds Heat and spends it on a team-wide Overheat that weakens with every use.',[
            skill('moltres-fire-spin','Fire Spin','moltres','firespin.png','For 2 turns, enemies using a new harmful skill on Moltres\' team take 10 affliction damage. Gains 1 Heat.', ['Bloodline'],3,'self',['Affliction','Instant'],[status('moltres_fire_spin',2,'self',{teamTrapEnemyHarmfulDamage:10,afflictionDamage:true}),{type:'gain_heat',amount:1}]),
            skill('moltres-sunny-day','Sunny Day','moltres','sunnyday.png','For 2 turns, enemies take 3 additional affliction damage. Moltres gains 1 Heat.', ['Bloodline'],4,'all-enemy',['Energy','Ranged','Instant','Bypassing'],[status('moltres_sunny_day_enemy',2,'all-enemy',{harmful:true,additionalAfflictionDamageTaken:3}),{type:'gain_heat',amount:1}]),
            skill('moltres-heat-wave','Heat Wave','moltres','heatwave.png','Deals 20 affliction damage to one enemy and 10 to all others. Gains 1 Heat.', ['Bloodline','Random'],0,'single-enemy',['Affliction','Ranged','Instant'],[damage(20,'target',{afflictionDamage:true}),damage(10,'other-enemies',{afflictionDamage:true}),{type:'gain_heat',amount:1}]),
            skill('moltres-overheat','Overheat','moltres','overheat.png','Consumes all Heat to deal 15 affliction damage per Heat to all enemies. Damage per Heat permanently falls by 5 after every use, to 0. After the first use its Random cost is removed; after the second use it costs only 1 Red.', ['Bloodline','Bloodline','Random'],0,'all-enemy',['Affliction','Ranged','Instant'],[{type:'moltres_overheat',scope:'all-enemy'}]),
            skill('moltres-heat','Passive: Heat','moltres','warmingup.png','Moltres stores up to 3 Heat from its skills. Overheat consumes every stored Heat.', [],0,'',['Passive','Instant'],[])
        ], [{statusId:'moltres_heat',sourceSkillId:'moltres-overheat',duration:999,metadata:{infiniteDuration:true,unremovable:true,heat:0,overheatPenalty:0,overheatUses:0}}]),

        character('zapdos','Zapdos','Controller','zapdos','fp.png','A legendary electric controller that punishes harmful skills and detonates Thunderbolt into Zap Cannon.',[
            skill('zapdos-charge','Charge','zapdos','charge.webp','Channels for 2 turns. Zapdos skills cost 1 less Yellow energy each turn; using another skill ends Charge.', [],1,'self',['Energy','Channeled'],[status('zapdos_charge',2,'self',{genjutsuCostReduction:1,increaseGenjutsuReductionEachTurn:1,onOwnerUseSkillTrigger:true,persistOnOwnerUseSkillTrigger:false,removeStatusIdsOnOwnerUseSkill:['zapdos_charge']})]),
            skill('zapdos-thunderbolt','Thunderbolt','zapdos','thunderbolt.webp','For 3 turns, harmful enemy skills trigger 5 piercing damage and +1 cooldown for 1 turn. Recast detonates for 15 piercing team damage and paralyzes cooldowns for 1 turn.', ['Genjutsu'],0,'self',['Energy','Ranged','Instant','Bypassing'],[{type:'zapdos_thunderbolt'}]),
            skill('zapdos-zap-cannon','Zap Cannon','zapdos','zapcanon.png','Marks an enemy for 3 turns. Thunderbolt triggers shorten it and add 10 damage. On expiry, deals 30 plus bonus piercing damage and stuns for 1 turn.', ['Genjutsu','Genjutsu','Random'],0,'single-enemy',['Energy','Ranged','Instant','Uncounterable','Unreflectable'],[status('zapdos_zap_cannon',3,'target',{harmful:true,zapCannonBonus:0,onExpireDamage:30,onExpirePiercing:true,onExpireStun:1,endIfSourceDies:true})]),
            skill('zapdos-flight','Flight','zapdos','flight.webp','For 2 turns, Zapdos is invulnerable to non-affliction enemy skills and Thunderbolt triggers deal 7 instead of 5.', ['Random'],4,'self',['Physical','Instant'],[status('zapdos_flight',2,'self',{invulnerableToNonAffliction:true,zapdosThunderboltDamage:7})])
        ]),

        character('mew','Mew','Shield Support','mew','fp.png','A mythical support that builds permanent barriers and converts accumulated shields into maximum HP.',[
            skill('mew-psychic-barrier','Psychic Barrier','mew','psychicbarrier.png','Gives an enemy 15 permanent stacking Barrier. While any remains, their skills cost 1 additional Random.', ['Ninjutsu'],1,'single-enemy',['Mental','Ranged','Instant'],[{type:'grant_barrier',amount:15,scope:'target',statusId:'mew_psychic_barrier',costIncrease:1}]),
            skill('mew-psychic','Psychic','mew','psychic.png','Deals 30 damage. If Psychic Barrier remains, the target\'s harmful skills deal 0 damage for 1 turn.', ['Ninjutsu','Random'],1,'single-enemy',['Mental','Ranged','Instant'],[damage(30),{...status('mew_psychic_suppression',1,'target',{harmful:true,damageDebuffFlat:999}),condition:{scope:'target',statusId:'mew_psychic_barrier'}}]),
            skill('mew-pink-bubble','Pink Bubble','mew','pinkbarrier.png','Gives an ally 15 permanent stacking Shield. While any remains, their skills cost 1 less Random.', ['Bloodline'],1,'self-or-single-ally',['Mental','Instant'],[{type:'grant_shield',amount:15,scope:'target',statusId:'mew_pink_bubble',costReduction:1}]),
            skill('mew-life-dew','Life Dew','mew','lifedew.png','Mew and one ally consume all Pink Bubble Shield, gain that much maximum HP, then heal 25% of updated maximum HP.', ['Bloodline','Random'],2,'self-or-single-ally',['Mental','Instant'],[{type:'mew_life_dew',scope:'target',includeSelf:true}])
        ]),

        character('mewtwo','Mewtwo','Specialist','mewtwo','fp.png','A deliberately direct bruiser with one efficient move for disruption, delay, sustain, and effect theft.',[
            skill('mewtwo-psychic','Psychic','mewtwo','psychic.png','Deals 20 damage and steals one copy-safe helpful active effect from the enemy for up to 2 turns. For 1 turn, Mewtwo\'s next Drain Punch or Shadow Ball deals 5 additional damage.', ['Ninjutsu'],1,'single-enemy',['Mental','Ranged','Instant'],[damage(20),{type:'steal_helpful_status',scope:'target',maxDuration:2},{type:'health_steal_damage',amount:5,scope:'target',condition:{scope:'self',statusId:'mewtwo_drain_punch_followup',consumeOnMatch:true}},{type:'damage',amount:5,scope:'target',condition:{scope:'self',statusId:'mewtwo_shadow_ball_followup',consumeOnMatch:true},metadata:{afflictionDamage:true}},status('mewtwo_psychic_followup',1,'self',{statusIconUrl:'assets/images/PokemonArena/mewtwo/psychic.png',tooltipText:'Mewtwo\'s next Drain Punch or Shadow Ball deals 5 additional damage.'})]),
            skill('mewtwo-shadow-ball','Shadow Ball','mewtwo','shadowball.png','Deals 20 damage and delays the target\'s skills for 1 turn. For 1 turn, Mewtwo\'s next Drain Punch or Psychic deals 5 affliction damage.', ['Bloodline'],1,'single-enemy',['Energy','Ranged','Instant'],[damage(20),{type:'modify_cooldowns',scope:'target',amount:1,includeAllCharacterSkills:true},{type:'damage',amount:5,scope:'target',condition:{scope:'self',statusId:'mewtwo_psychic_followup',consumeOnMatch:true}},{type:'health_steal_damage',amount:5,scope:'target',condition:{scope:'self',statusId:'mewtwo_drain_punch_followup',consumeOnMatch:true}},status('mewtwo_shadow_ball_followup',1,'self',{statusIconUrl:'assets/images/PokemonArena/mewtwo/shadowball.png',tooltipText:'Mewtwo\'s next Drain Punch or Psychic deals 5 affliction damage.'})]),
            skill('mewtwo-drain-punch','Drain Punch','mewtwo','drainpunch.png','Steals 20 HP from one enemy. For 1 turn, Mewtwo\'s next Shadow Ball or Psychic steals 5 HP.', ['Genjutsu'],0,'single-enemy',['Physical','Melee','Instant'],[{type:'health_steal_damage',amount:20,scope:'target'},{type:'damage',amount:5,scope:'target',condition:{scope:'self',statusId:'mewtwo_psychic_followup',consumeOnMatch:true}},{type:'damage',amount:5,scope:'target',condition:{scope:'self',statusId:'mewtwo_shadow_ball_followup',consumeOnMatch:true},metadata:{afflictionDamage:true}},status('mewtwo_drain_punch_followup',1,'self',{statusIconUrl:'assets/images/PokemonArena/mewtwo/drainpunch.png',tooltipText:'Mewtwo\'s next Shadow Ball or Psychic steals 5 HP.'})]),
            skill('mewtwo-recover','Recover','mewtwo','recover.png','Heals Mewtwo for 20 HP. Consecutive uses heal 2 less HP each time, stacking down to 0; using another skill resets it.', ['Taijutsu'],0,'self',['Energy','Instant'],[{type:'mewtwo_recover',scope:'self'}])
        ]),

        character('dragonite','Dragonite','Tank','dragonite','fp.png','A durable controller that taunts enemies and refreshes Pressure whenever it uses a skill.',[
            skill('dragonite-dragon-claw','Dragon Claw','dragonite','dragonclaw.png','Deals 30 piercing damage, steals 1 random energy, and taunts the target for 1 turn.', ['Taijutsu','Ninjutsu'],2,'single-enemy',['Physical','Melee','Instant'],[damage(30,'target',{ignoreDamageReduction:true}),{type:'drain_chakra',scope:'target',chakraType:'random',amount:1},status('dragonite_taunt',1,'target',{harmful:true,taunt:true,refreshIfIgnoredOnce:true})]),
            skill('dragonite-hyper-beam','Hyper Beam','dragonite','hyperbeam.png','Deals 35 affliction damage, stuns helpful skills, and taunts the target for 1 turn.', ['Ninjutsu','Genjutsu'],2,'single-enemy',['Affliction','Ranged','Instant'],[damage(35,'target',{afflictionDamage:true}),status('dragonite_hyper_beam_stun',1,'target',{harmful:true,cannotUseHelpfulSkills:true}),status('dragonite_taunt',1,'target',{harmful:true,taunt:true,refreshIfIgnoredOnce:true})]),
            skill('dragonite-draco-meteor','Draco Meteor','dragonite','draco meteor.png','Deals 15 damage to all enemies for 2 turns and taunts each target for 1 turn on cast.', ['Ninjutsu','Bloodline','Random'],3,'all-enemy',['Physical','Ranged','Action'],[status('dragonite_draco_meteor',2,'all-enemy',{harmful:true,turnStartDamage:15}),status('dragonite_taunt',1,'all-enemy',{harmful:true,taunt:true,refreshIfIgnoredOnce:true})]),
            skill('dragonite-dragon-boost','Dragon Boost','dragonite','skill 4.png','Dragonite gains 1 Blue energy.', ['Random'],3,'self',['Energy','Instant'],[{type:'gain_chakra',chakraType:'ninjutsu',amount:1,scope:'self'}]),
            skill('dragonite-pressure','Passive: Pressure','dragonite','passive.png','After Dragonite uses a new skill, it gains a stacking 10 unpierceable damage reduction for 2 turns. If an enemy does not attack while taunted by Dragonite, that taunt refreshes once.',[],0,'',['Passive','Instant'],[])
        ], [{statusId:'dragonite_pressure_passive',sourceSkillId:'dragonite-pressure',duration:999,metadata:{infiniteDuration:true,unremovable:true,onOwnerUseSkillTrigger:true,persistOnOwnerUseSkillTrigger:true,onOwnerUseSkillApplyStatusToOwner:{statusId:'dragonite_pressure_reduction',duration:2,metadata:{unpierceableDamageReductionFlat:10,allowDuplicateStatusInstances:true}}}}])
    ];
});
