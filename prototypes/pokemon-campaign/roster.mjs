import { Energy } from '../pokemon-unison/reference/roster.mjs';
const R=Energy.RANDOM,G=Energy.TAIJUTSU,B=Energy.NINJUTSU,F=Energy.BLOODLINE,Y=Energy.GENJUTSU;
const damage=(amount,damageKind='normal',extra={})=>({kind:'damage',amount,damageKind,...extra});
const status=(id,name,extra={})=>({kind:'status',status:{id,name,hidden:false,harmful:true,durationActions:1,durationAnchor:'target',...extra}});
const poison=()=>status('campaign-poison','Poison',{periodicDamage:5,durationActions:2,replaceExisting:true});
const burn=()=>status('campaign-burn','Burn',{periodicDamage:5,durationActions:2,replaceExisting:true});
const skill=(id,name,type,energy,cooldown,effects,description,extra={})=>({id,name,moveType:type,energy,cooldown,effects,description,target:'single-enemy',harmful:true,classes:[type,'Instant'],...extra});
const hit=(id,name,type,amount,cost=[R],cooldown=0,kind='normal')=>skill(id,name,type,cost,cooldown,[damage(amount,kind)],`Deals ${amount}${kind==='normal-ignore-reduction'?' piercing':kind==='affliction'?' affliction':''} damage to one enemy.`);
const guard=(id,name,cost=[R],cooldown=2)=>skill(id,name,'Normal',cost,cooldown,[status(id,name,{harmful:false,blockNextHarmful:true})],'Blocks the next enemy harmful skill through the opposing turn.',{target:'self',harmful:false});
const heal=(id,name,amount,cost=[R],cooldown=1)=>skill(id,name,'Normal',cost,cooldown,[{kind:'heal',amount}],`Restore ${amount} HP to yourself.`,{target:'self',harmful:false});
const shield=(id,name,amount,cost=[G],all=false)=>skill(id,name,'Steel',cost,1,[{kind:'shield',amount,...(all?{scope:'all-allies'}:{})}],`Give ${all?'all allies': 'yourself'} ${amount} Shield.`,{target:all?'all-allies':'self',harmful:false});
const drain=(id,name,amount,cost=[G],cooldown=1)=>skill(id,name,'Grass',cost,cooldown,[{kind:'drain',amount,damageKind:'normal'}],`Steal ${amount} HP from one enemy.`);
const area=(id,name,type,amount,cost,cooldown=1,extras=[])=>skill(id,name,type,cost,cooldown,[damage(amount,'normal',{scope:'all-enemy'}),...extras],`Deal ${amount} damage to all enemies.`,{target:'all-enemy'});
const blind=()=>status('mud-in-eyes','Mud in Eyes',{durationActions:null,skillFailChance:50,consumeOnSkillAttempt:true,replaceExisting:true});
export const STARTER_NEW_MOVES=Object.freeze({
 mudkip:skill('mudkip-mud-slap','Mud Slap','Ground',[R],1,[damage(20),blind()],'Deal 20 damage. The target has a 50% chance to miss its next skill.'),
 treecko:drain('treecko-absorb','Absorb',15,[R],1),
 torchic:skill('torchic-peck','Peck','Flying',[R],1,[status('torchic-peck','Peck',{durationActions:2,periodicDamage:10,periodicDamageKind:'normal-ignore-reduction',periodicMoveType:'Flying',sourceSkillId:'torchic-peck',replaceExisting:true})],'Deal 10 piercing damage for 2 enemy turns.'),
});
const pokemon=(id,name,types,skills)=>({id,name,types,skills,startingHp:50,image:`./assets/${id}.png`,facePicture:`./assets/${id}.png`,forms:{base:{id:'base',name,types,skillIds:skills.map(s=>s.id)}}});
export const CAMPAIGN_ROSTER=Object.freeze({
 mudkip:pokemon('mudkip','Mudkip',['Water'],[hit('mudkip-squirt','Squirt','Water',25),STARTER_NEW_MOVES.mudkip]),
 treecko:pokemon('treecko','Treecko',['Grass'],[hit('treecko-leaf-slap','Leaf Slap','Grass',25),STARTER_NEW_MOVES.treecko]),
 torchic:pokemon('torchic','Torchic',['Fire'],[hit('torchic-flame-pellets','Flame Pellets','Fire',25),STARTER_NEW_MOVES.torchic]),
 zigzagoon:pokemon('zigzagoon','Zigzagoon',['Normal'],[hit('zigzagoon-tackle','Tackle','Normal',20)]),
 slugma:pokemon('slugma','Slugma',['Fire'],[
  skill('slugma-magma-toss','Magma Toss','Fire',[F],0,[damage(10,'affliction'),status('slugma-magma','Magma',{durationActions:null,periodicDamage:5})],'Deal 10 affliction damage, then 5 permanent affliction damage each enemy turn. Magma stacks.'),
  shield('slugma-harden','Harden',15,[R]),
 ]),
 swinub:pokemon('swinub','Swinub',['Ice','Ground'],[
  area('swinub-powder-snow','Powder Snow','Ice',10,[B],0,[status('powder-snow','Powder Snow',{outgoingDamageDebuff:5})]),
  skill('swinub-mud-sport','Mud Sport','Ground',[B],2,[{...status('mud-sport','Mud Sport',{harmful:false,damageReductionFlat:5}),scope:'all-allies'}],'All allies take 5 less normal damage through the opposing turn.',{target:'all-allies',harmful:false}),
 ]),
 pineco:pokemon('pineco','Pineco',['Bug'],[
  skill('pineco-needle-spit','Needle Spit','Bug',[G],0,[damage(15,'normal-ignore-reduction',{bonusPerCounter:{counter:'needle-spit',multiplier:5}}),{kind:'increment-actor-counter',counter:'needle-spit'}],'Deal 15 piercing damage. Permanently gain +5 damage for each use during this battle.'),
  {...guard('pineco-protect','Protect',[R,R],2),target:'self-or-single-ally'},
 ]),
 zangoose:pokemon('zangoose','Zangoose',['Normal'],[hit('zangoose-slash','Slash','Normal',20,[G],0,'normal-ignore-reduction'),guard('zangoose-detect','Detect')]),
 seviper:pokemon('seviper','Seviper',['Poison'],[
  skill('seviper-poison-fang','Poison Fang','Poison',[F],1,[damage(15),poison()],'Deal 15 damage and Poison the enemy for 5 affliction damage for 2 turns.'),
  skill('seviper-venoshock','Venoshock','Poison',[R],0,[damage(20),damage(10,'normal',{requiresTargetStatus:'campaign-poison'})],'Deal 20 damage, plus 10 if the target is Poisoned.'),
 ]),
 poochyena:pokemon('poochyena','Poochyena',['Dark'],[hit('poochyena-bite','Bite','Dark',25)]),
 wurmple:pokemon('wurmple','Wurmple',['Bug'],[
  skill('wurmple-poison-sting','Poison Sting','Poison',[R],0,[damage(10),poison()],'Deal 10 damage and Poison for 5 affliction damage for 2 turns.'),
  skill('wurmple-string-shot','String Shot','Bug',[G],1,[status('string-shot','String Shot',{outgoingDamageDebuff:5})],'Reduce an enemy’s damage by 5 for its next turn.'),
 ]),
 lotad:pokemon('lotad','Lotad',['Water','Grass'],[drain('lotad-absorb','Absorb',15,[B],0),heal('lotad-synthesis','Synthesis',20,[G],1)]),
});
CAMPAIGN_ROSTER.swinub.skills[0].description='Deal 10 damage to all enemies and reduce their damage by 5 for 1 turn.';
CAMPAIGN_ROSTER.swinub.skills[0].effects[1].scope='all-enemy';
// Two alternatives for EACH of the last two slots. A Pokemon equips only one
// alternative per slot. These are independent move choices, not specializations.
export const MOVE_CHOICES=Object.freeze({
 mudkip:[
  [hit('mudkip-water-gun','Water Gun','Water',25,[B],0,'normal-ignore-reduction'),guard('mudkip-protect','Protect')],
  [area('mudkip-surf','Surf','Water',20,[B,B]),heal('mudkip-rest','Rest',30,[R,R],2)],
 ],
 treecko:[
  [drain('treecko-mega-drain','Mega Drain',20),skill('treecko-double-team','Double Team','Normal',[R],1,[status('double-team','Double Team',{harmful:false,evadeChancePercent:50})],'Gain 50% evasion through the opposing turn.',{target:'self',harmful:false})],
  [drain('treecko-giga-drain','Giga Drain',25,[G,G]),area('treecko-bullet-seed','Bullet Seed','Grass',15,[G,G])],
 ],
 torchic:[
  [skill('torchic-ember','Ember','Fire',[F],1,[damage(20),burn()],'Deal 20 damage and Burn for 5 affliction damage for 2 turns.'),hit('torchic-quick-attack','Quick Attack','Normal',20)],
  [area('torchic-flamethrower','Flamethrower','Fire',25,[F,F]),hit('torchic-aerial-ace','Aerial Ace','Flying',30,[B,R],1,'normal-ignore-reduction')],
 ],
 slugma:[
  [hit('slugma-rock-throw','Rock Throw','Rock',25,[G],0,'normal-ignore-reduction'),heal('slugma-recover','Recover',25)],
  [area('slugma-lava-plume','Lava Plume','Fire',15,[F,F],2,[{...burn(),scope:'all-enemy'}]),shield('slugma-amnesia','Amnesia',10,[R,R],true)],
 ],
 pineco:[
  [hit('pineco-rapid-spin','Rapid Spin','Normal',20,[R],0,'normal-ignore-reduction'),shield('pineco-iron-defense','Iron Defense',25)],
  [hit('pineco-pin-missile','Pin Missile','Bug',30,[G,R],1,'normal-ignore-reduction'),skill('pineco-spikes','Spikes','Ground',[G,R],2,[{...status('spikes','Spikes',{durationActions:3,periodicDamage:5}),scope:'all-enemy'}],'All enemies take 5 affliction damage for 3 turns.',{target:'all-enemy'})],
 ],
 swinub:[
  [hit('swinub-ice-shard','Ice Shard','Ice',25,[B],0,'normal-ignore-reduction'),skill('swinub-sand-attack','Sand Attack','Ground',[R],1,[blind()],'The target has a 50% chance to miss its next skill.')],
  [area('swinub-blizzard','Blizzard','Ice',25,[B,B]),hit('swinub-avalanche','Avalanche','Ice',35,[B,R],1)],
 ],
 zangoose:[
  [hit('zangoose-x-scissor','X-Scissor','Bug',30,[G,R],1,'normal-ignore-reduction'),heal('zangoose-rest','Rest',30,[R,R],2)],
  [hit('zangoose-close-combat','Close Combat','Fighting',40,[G,R],2,'normal-ignore-reduction'),shield('zangoose-quick-guard','Quick Guard',20,[R,R],true)],
 ],
 seviper:[
  [hit('seviper-crunch','Crunch','Dark',25,[G],0,'normal-ignore-reduction'),skill('seviper-glare','Glare','Normal',[Y],2,[status('glare','Glare',{cannotUseSkills:true,stunLikeEffect:true})],'Stun one enemy for 1 turn.')],
  [skill('seviper-poison-tail','Poison Tail','Poison',[F,R],1,[damage(20,'normal-ignore-reduction'),{...poison(),status:{...poison().status,durationActions:3}}],'Deal 20 piercing damage and Poison for 5 affliction damage for 3 turns.'),skill('seviper-coil','Coil','Poison',[F,R],2,[{kind:'shield',amount:25},{kind:'heal',amount:10}],'Gain 25 Shield and restore 10 HP.',{target:'self',harmful:false})],
 ],
});
export const STARTERS=Object.freeze(['mudkip','treecko','torchic']);
export const SECOND_POKEMON=Object.freeze(['slugma','pineco','swinub']);
export const THIRD_POKEMON=Object.freeze(['zangoose','seviper']);
