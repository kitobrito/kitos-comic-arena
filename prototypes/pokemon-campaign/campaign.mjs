import { createScenarioGame, legalActions, legalQueuedActions, resolveQueuedTurn, remainingQueuedEnergy, typeEffectiveness } from '../pokemon-unison/reference/engine.mjs';
import { CAMPAIGN_ROSTER, STARTERS, SECOND_POKEMON, THIRD_POKEMON, MOVE_CHOICES } from './roster.mjs';
import { applyTalents, talentOptions } from './talents.mjs';
export { legalActions, legalQueuedActions, remainingQueuedEnergy };
export const SAVE_KEY='pokemon-campaign-v2';
export const ENCOUNTERS=Object.freeze([
 {id:'first-steps',name:'A friendly challenge',trainer:'Young Trainer',team:['zigzagoon'],hp:50,lesson:'Your first battle. Select your move, then choose Zigzagoon.',reward:'A new move, +10 max HP, 1 Talent Point, and your second Pokémon.'},
 {id:'trail-trainer',name:'Trouble on the trail',trainer:'Trail Trainer',team:['poochyena','wurmple'],hp:50,lesson:'Poochyena hits hard. Wurmple adds Poison. Decide which threat to remove first.',reward:'Choose Zangoose or Seviper as your third Pokémon.'},
 {id:'growing-threat',name:'The growing threat',trainer:'Bug Collector',team:['zigzagoon','pineco','slugma'],hp:60,lesson:'Needle Spit grows stronger and Magma stacks. A long fight favors this team.',reward:'Your starter can choose its third move.'},
 {id:'pond-path',name:'The pond path',trainer:'Pond Keeper',team:['lotad','wurmple','poochyena'],hp:70,lesson:'Lotad heals while its partners apply pressure. Coordinate your attacks.',reward:'Your second teammate can choose its third move.'},
 {id:'rival-encounter',name:'Rival encounter',trainer:'Rival Trainer',team:['zangoose','seviper','zigzagoon'],hp:80,lesson:'Expect piercing damage, Poison, and Venoshock. Guard the teammate they focus.',reward:'A fourth move for your starter; a third move for your newest teammate.'},
 {id:'lasting-pressure',name:'Lasting pressure',trainer:'Veteran Trainer',team:['slugma','pineco','lotad'],hp:90,lesson:'This team wins through attrition. Set up your own finish before it does.',reward:'Your second teammate can choose its fourth move.'},
 {id:'graduation',name:'The final lesson',trainer:'Route Captain',team:['zangoose','seviper','lotad'],hp:100,lesson:'A full team and its complete strategy. Bring the build you have been developing.',reward:'Every teammate reaches 100 max HP. Your newest teammate can choose its fourth move.'},
]);
export const freshJourney=()=>({version:2,starter:null,partner:null,third:null,cleared:[],choices:{},talents:{},active:null});
export function members(p){return [p.starter,p.partner,p.third].filter(Boolean);}
export function experience(p,id){const joined=id===p.starter?0:id===p.partner?1:id===p.third?2:Infinity;return Math.max(0,p.cleared.length-joined);}
export function maxHp(p,id){return Math.min(100,50+experience(p,id)*10);}
export function chooseStarter(p,id){if(p.starter||!STARTERS.includes(id))throw new Error('Choose an available starter.');return {...freshJourney(),starter:id};}
export function chooseCompanion(p,id){
 if(p.active)throw new Error('Finish the current battle first.');
 if(p.cleared.length>=1&&!p.partner&&SECOND_POKEMON.includes(id))return {...p,partner:id};
 if(p.cleared.length>=2&&p.partner&&!p.third&&THIRD_POKEMON.includes(id))return {...p,third:id};
 throw new Error('That companion is not available yet.');
}
export function availableMoves(p,id){
 const count=experience(p,id)>=1?2:1;const moves=CAMPAIGN_ROSTER[id].skills.slice(0,count).map(s=>structuredClone(s));
 for(let slot=0;slot<2;slot++)if(experience(p,id)>=[3,5][slot]){
  const selected=MOVE_CHOICES[id]?.[slot].find(s=>s.id===p.choices[id]?.[slot]);if(selected)moves.push(structuredClone(selected));
 }
 return moves;
}
export function learnedPokemon(p,id){
 const species=structuredClone(CAMPAIGN_ROSTER[id]);species.startingHp=maxHp(p,id);
 species.skills=availableMoves(p,id).map(s=>applyTalents(s,p.talents[s.id]??[]));
 species.forms.base.skillIds=species.skills.map(s=>s.id);return species;
}
export function pendingChoices(p){
 return members(p).flatMap(id=>[0,1].filter(slot=>experience(p,id)>=[3,5][slot]&&!p.choices[id]?.[slot]).map(slot=>({id,slot,options:MOVE_CHOICES[id][slot]})));
}
export function chooseMove(p,id,slot,moveId){
 if(p.active||!members(p).includes(id)||![0,1].includes(slot)||experience(p,id)<[3,5][slot]||!MOVE_CHOICES[id]?.[slot].some(s=>s.id===moveId))throw new Error('This move choice is not available.');
 const next=structuredClone(p),old=next.choices[id]?.[slot];next.choices[id]??={};next.choices[id][slot]=moveId;
 if(old&&old!==moveId)delete next.talents[old];return next;
}
export function pointsRemaining(p){return p.cleared.length-Object.values(p.talents).reduce((n,list)=>n+list.length,0);}
export function learnTalent(p,skillId,talentId){
 const skill=members(p).flatMap(id=>availableMoves(p,id)).find(s=>s.id===skillId);
 if(p.active||!skill||pointsRemaining(p)<1||!talentOptions(skill).some(t=>t.id===talentId)||p.talents[skillId]?.includes(talentId))throw new Error('This talent is not available.');
 const next=structuredClone(p);(next.talents[skillId]??=[]).push(talentId);return next;
}
export function resetTalents(p){if(p.active)throw new Error('Talents can only be changed between battles.');return {...p,talents:{}};}
export function beginEncounter(p){
 if(p.active||!p.starter||p.cleared.length>=ENCOUNTERS.length||pendingChoices(p).length||(p.cleared.length>=1&&!p.partner)||(p.cleared.length>=2&&!p.third))throw new Error('Finish choosing your team and moves first.');
 return {...p,active:{index:p.cleared.length,seed:258252255+p.cleared.length*7919,turns:[]}};
}
export function enemyDefinition(id,index){
 const species=structuredClone(CAMPAIGN_ROSTER[id]);species.startingHp=ENCOUNTERS[index].hp;
 if(index>=3&&MOVE_CHOICES[id])species.skills.push(MOVE_CHOICES[id][0][0]);
 if(index>=5&&MOVE_CHOICES[id])species.skills.push(MOVE_CHOICES[id][1][0]);
 species.forms.base.skillIds=species.skills.map(s=>s.id);return species;
}
function initialBattle(p){
 const encounter=ENCOUNTERS[p.active?.index];if(!encounter)throw new Error('Invalid campaign encounter.');
 const roster={};for(const id of members(p))roster[id]=learnedPokemon(p,id);
 // Opponents can share a species with the party. Use separate scenario IDs so
 // their fixed encounter loadout never overwrites a player's chosen build.
 const enemies=encounter.team.map((id,index)=>{
  const species=enemyDefinition(id,p.active.index);species.id=`enemy-${index}-${id}`;species.displaySpeciesId=id;
  species.forms.base.skillIds=species.skills.map(s=>s.id);roster[species.id]=species;return species.id;
 });
 if(p.active.index===0){roster[p.starter].skills=roster[p.starter].skills.slice(0,1);roster[p.starter].forms.base.skillIds=roster[p.starter].skills.map(s=>s.id);}
 return createScenarioGame({roster,teams:{A:members(p),B:enemies},startingHp:50,startingPlayer:'A',economyMode:'arena',seed:p.active.seed});
}
export function battleFromProgress(p){
 if(!p.active)return null;let state=initialBattle(p);
 if(!Array.isArray(p.active.turns)||p.active.turns.length>300)throw new Error('Invalid saved battle.');
 for(const turn of p.active.turns){state=playTurn(p,state,turn);}
 return state;
}
export function openingAction(state){const a=legalActions(state)[0];return a?{...a,randomEnergy:a.suggestedRandomEnergy}:null;}
export function planTurn(p,state,actions){
 if(!Array.isArray(actions))throw new Error('Invalid turn.');
 if(p.active.index===0){const expected=openingAction(state);if(actions.length!==1||!expected||['player','actorSlot','skillId','targetPlayer','targetSlot'].some(k=>actions[0][k]!==expected[k]))throw new Error('Choose your move, then target Zigzagoon.');}
 const result=resolveQueuedTurn(state,actions,{trace:true});if(!result.ok)throw new Error(result.error);return result;
}
export function playTurn(p,state,actions){return planTurn(p,state,actions).state;}
export function recordBattle(p,state){
 if(!p.active)throw new Error('No campaign battle.');
 return {...p,active:{...p.active,turns:structuredClone(state.turns)}};
}
export function finishEncounter(p){
 if(!p.active||p.active.index!==p.cleared.length||battleFromProgress(p).winner!=='A')throw new Error('Win this encounter before claiming its reward.');
 return {...p,cleared:[...p.cleared,ENCOUNTERS[p.active.index].id],active:null};
}
export function retryEncounter(p){if(!p.active)throw new Error('No encounter to retry.');return {...p,active:{...p.active,turns:[]}};}
export function botActions(state,side=state.currentPlayer){
 const queue=[];
 for(let i=0;i<3;i++){
  const options=legalQueuedActions(state,queue);if(!options.length)break;
  const scored=options.map(action=>{
   const actor=state.teams[side][action.actorSlot],target=state.teams[action.targetPlayer][action.targetSlot],skill=actor.scenarioSpecies.skills.find(s=>s.id===action.skillId);
   let score=0;
   for(const e of skill.effects){
    if(e.kind==='damage'||e.kind==='drain'){
     const amount=e.amount+(e.bonusPerCounter?(actor.counters[e.bonusPerCounter.counter]??0)*e.bonusPerCounter.multiplier:0)+typeEffectiveness(skill.moveType,target.scenarioSpecies.types).modifier;
     score+=Math.max(1,amount)*(e.scope==='all-enemy'?state.teams[side==='A'?'B':'A'].filter(u=>u.alive).length:1)+(target.hp<=amount?28:0);
     if(e.requiresTargetStatus&&!target.statuses.some(s=>s.id===e.requiresTargetStatus))score-=e.amount;
     if(e.kind==='drain')score+=Math.min(amount,actor.maxHp-actor.hp)*.7;
    }
    if(e.kind==='heal')score+=Math.min(e.amount,target.maxHp-target.hp)*1.3;
    if(e.kind==='shield')score+=target.shield>=e.amount?0:Math.min(e.amount,Math.max(0,50-target.hp))*.5;
    if(e.status)score+=e.status.periodicDamage?(target.statuses.some(s=>s.id===e.status.id)&&e.status.durationActions!==null?1:e.status.periodicDamage*2):e.status.cannotUseSkills?16:e.status.blockNextHarmful?(target.hp<30?12:2):5;
   }
   return {action,score:score+(action.targetPlayer!==side?(100-target.hp)*.04:0)};
  }).sort((a,b)=>b.score-a.score);
  if(scored[0].score<=0)break;const a=scored[0].action;queue.push({...a,randomEnergy:a.suggestedRandomEnergy});
 }
 return queue;
}
export function restoreJourney(raw){
 const value=JSON.parse(raw??'null');if(!value)return freshJourney();
 if(value.version===2&&value.starter===null&&Array.isArray(value.cleared)&&value.cleared.length===0&&!value.active&&!value.partner&&!value.third)return freshJourney();
 if(value.version!==2||!STARTERS.includes(value.starter)||!Array.isArray(value.cleared)||value.cleared.length>7||value.cleared.some((id,i)=>id!==ENCOUNTERS[i].id))throw new Error('Invalid saved campaign.');
 const p={...freshJourney(),starter:value.starter,cleared:[...value.cleared]};
 if(value.partner){if(!SECOND_POKEMON.includes(value.partner)||!p.cleared.length)throw new Error('Invalid second Pokemon.');p.partner=value.partner;}
 if(value.third){if(!THIRD_POKEMON.includes(value.third)||p.cleared.length<2||!p.partner)throw new Error('Invalid third Pokemon.');p.third=value.third;}
 for(const id of members(p))for(const slot of [0,1])if(value.choices?.[id]?.[slot])Object.assign(p,chooseMove(p,id,slot,value.choices[id][slot]));
 for(const [skillId,list]of Object.entries(value.talents??{})){
  if(!Array.isArray(list))throw new Error('Invalid saved talents.');for(const talent of list)Object.assign(p,learnTalent(p,skillId,talent));
 }
 if(value.active){
  if(value.active.index!==p.cleared.length||!Number.isInteger(value.active.seed))throw new Error('Invalid saved encounter.');
  p.active=structuredClone(value.active);battleFromProgress(p);
 }
 return p;
}
