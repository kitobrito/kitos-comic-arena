import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
import access from '../access.cjs';
import * as C from '../campaign.mjs';
import {CAMPAIGN_ROSTER as R,STARTERS,SECOND_POKEMON,THIRD_POKEMON,MOVE_CHOICES} from '../roster.mjs';
import {applyTalents,talentOptions} from '../talents.mjs';
import {createGame,createScenarioGame,applyAction,resolveQueuedTurn,legalActions} from '../../pokemon-unison/reference/engine.mjs';
import {ROSTER,Energy} from '../../pokemon-unison/reference/roster.mjs';
const clone=structuredClone;
function duel(id,target='zigzagoon',seed=73){const roster=clone(R);roster[target].startingHp=200;return createScenarioGame({roster,teams:{A:[id],B:[target]},economyMode:'sandbox',seed:(seed*2654435761)>>>0});}
function cast(s,id,actorSlot=0,targetSlot=0,targetPlayer=s.currentPlayer==='A'?'B':'A'){
 const a=legalActions(s).find(a=>a.actorSlot===actorSlot&&a.skillId===id&&a.targetSlot===targetSlot&&a.targetPlayer===targetPlayer);assert.ok(a,`${id} must be legal`);const r=applyAction(s,{...a,randomEnergy:a.suggestedRandomEnergy});assert.ok(r.ok,r.error);return r.state;
}
function pass(s){const r=resolveQueuedTurn(s,[]);assert.ok(r.ok,r.error);return r.state;}
function opening(id){let p=C.beginEncounter(C.chooseStarter(C.freshJourney(),id)),s=C.battleFromProgress(p);while(!s.winner)s=C.playTurn(p,s,[C.openingAction(s)]);return {p:C.finishEncounter(C.recordBattle(p,s)),s};}
function progressed(n=7){return {...C.freshJourney(),starter:'mudkip',partner:'pineco',third:'seviper',cleared:C.ENCOUNTERS.slice(0,n).map(e=>e.id)};}

test('starter definitions and trainer match the designer’s exact HP, damage, type and Random costs',()=>{
 for(const [id,name,type]of [['mudkip','Squirt','Water'],['treecko','Leaf Slap','Grass'],['torchic','Flame Pellets','Fire']]){
  assert.equal(R[id].startingHp,50);const m=R[id].skills[0];assert.equal(m.name,name);assert.equal(m.moveType,type);assert.deepEqual(m.energy,['random']);assert.equal(m.effects[0].amount,25);
 }
 const m=R.zigzagoon.skills[0];assert.equal(m.name,'Tackle');assert.equal(m.moveType,'Normal');assert.equal(m.effects[0].amount,20);assert.deepEqual(m.energy,['random']);
});
test('every starter always wins the opening in two attacks, at 30 of 50 HP',()=>{
 for(const id of STARTERS){const {p,s}=opening(id);assert.equal(s.winner,'A');assert.equal(s.turns.length,3);assert.equal(s.teams.A[0].hp,30);assert.equal(s.teams.B[0].hp,0);assert.equal(C.maxHp(p,id),60);assert.equal(C.availableMoves(p,id).length,2);assert.equal(C.pointsRemaining(p),1);}
});
test('empty turns and invalid targets cannot lose the guided opening',()=>{
 const p=C.beginEncounter(C.chooseStarter(C.freshJourney(),'mudkip')),s=C.battleFromProgress(p);
 assert.throws(()=>C.playTurn(p,s,[]));const a=C.openingAction(s);assert.throws(()=>C.playTurn(p,s,[{...a,targetPlayer:'A'}]));assert.equal(s.teams.A[0].hp,50);
});
test('Random cost accepts any one concrete chakra color',()=>{
 for(const color of ['taijutsu','ninjutsu','bloodline','genjutsu']){const s=duel('mudkip');for(const k of Object.keys(s.energy.A))s.energy.A[k]=k===color?1:0;const n=cast(s,'mudkip-squirt');assert.equal(n.teams.B[0].hp,175);assert.equal(n.energy.A[color],0);}
});
test('the scenario API leaves existing 100-HP competitive rosters and exact three-member team rules intact',()=>{
 assert.equal(ROSTER.mudkip,undefined);assert.equal(createGame().teams.A[0].hp,100);assert.throws(()=>createGame({teams:{A:['mudkip'],B:['zigzagoon']}}));assert.throws(()=>createScenarioGame({teams:{A:[],B:[]},roster:R}));assert.throws(()=>createScenarioGame({teams:{A:['mudkip'],B:['zigzagoon']},roster:R,startingHp:0}));
});
test('Absorb drains actual health and respects the learner’s HP cap',()=>{
 let s=duel('treecko');s.teams.A[0].hp=10;s=cast(s,'treecko-absorb');assert.equal(s.teams.A[0].hp,25);assert.equal(s.teams.B[0].hp,185);
});
test('Mud Slap’s 50% next-skill miss is seeded and consumed on either outcome',()=>{
 let misses=0,hits=0;
 for(let seed=1;seed<=60;seed++){let s=duel('mudkip','zigzagoon',seed);s=cast(s,'mudkip-mud-slap');assert.equal(s.teams.B[0].hp,180);s=cast(s,'zigzagoon-tackle');if(s.teams.A[0].hp===50)misses++;else{hits++;assert.equal(s.teams.A[0].hp,30);}assert.ok(!s.teams.B[0].statuses.some(x=>x.id==='mud-in-eyes'&&(x.durationActions===null||x.durationActions>0)));}
 assert.ok(misses>10&&hits>10,`${misses} misses, ${hits} hits`);
});
test('Peck deals exactly two piercing ticks and then expires',()=>{
 let s=duel('torchic');s=cast(s,'torchic-peck');assert.equal(s.teams.B[0].hp,190);s=pass(s);s=pass(s);assert.equal(s.teams.B[0].hp,180);s=pass(s);s=pass(s);assert.equal(s.teams.B[0].hp,180);
});
test('Magma Toss uses Red, starts with 10 affliction, and stacks permanent 5-damage ticks',()=>{
 assert.deepEqual(R.slugma.skills[0].energy,[Energy.BLOODLINE]);let s=duel('slugma');s=cast(s,'slugma-magma-toss');assert.equal(s.teams.B[0].hp,185);s=pass(s);s=cast(s,'slugma-magma-toss');const magma=s.teams.B[0].statuses.find(x=>x.id==='slugma-magma');assert.equal(magma.periodicDamage,10);assert.equal(magma.durationActions,null);assert.equal(magma.stacks,2);assert.equal(s.teams.B[0].hp,165);
});
test('Powder Snow hits all enemies and weakens their next turn by 5',()=>{
 const roster=clone(R);roster.zigzagoon.startingHp=200;roster.poochyena.startingHp=200;let s=createScenarioGame({roster,teams:{A:['swinub'],B:['zigzagoon','poochyena']},economyMode:'sandbox'});s=cast(s,'swinub-powder-snow');assert.deepEqual(s.teams.B.map(u=>u.hp),[190,190]);let q=[];for(const u of s.teams.B){const a=C.legalQueuedActions(s,q).find(a=>a.actorSlot===u.slot);q.push({...a,randomEnergy:a.suggestedRandomEnergy});}const result=resolveQueuedTurn(s,q);assert.ok(result.ok);s=result.state;assert.equal(s.teams.A[0].hp,15);assert.ok(s.teams.B.every(u=>!u.statuses.some(x=>x.id==='powder-snow')));
});
test('Needle Spit grows by 5 per use, uses Green, and pierces ordinary reduction',()=>{
 assert.deepEqual(R.pineco.skills[0].energy,[Energy.TAIJUTSU]);let s=duel('pineco');s.teams.B[0].statuses.push({id:'test-reduction',durationActions:null,damageReductionFlat:100});s=cast(s,'pineco-needle-spit');assert.equal(s.teams.B[0].hp,185);s=pass(s);s=cast(s,'pineco-needle-spit');assert.equal(s.teams.B[0].hp,165);assert.equal(s.teams.A[0].counters['needle-spit'],2);
});
test('second and third recruitment are actual choices gated by campaign victories',()=>{
 let p=opening('mudkip').p;for(const id of SECOND_POKEMON)assert.equal(C.chooseCompanion(p,id).partner,id);assert.throws(()=>C.chooseCompanion(C.freshJourney(),'slugma'));p=C.chooseCompanion(p,'pineco');assert.throws(()=>C.chooseCompanion(p,'slugma'));assert.throws(()=>C.chooseCompanion(p,'seviper'));p.cleared=C.ENCOUNTERS.slice(0,2).map(e=>e.id);for(const id of THIRD_POKEMON)assert.equal(C.chooseCompanion(p,id).third,id);
});
test('each party member progresses by participation and stays at 100 max HP',()=>{
 const p=progressed();for(const id of C.members(p))assert.equal(C.maxHp(p,id),100);p.cleared.push('future-chapter');for(const id of C.members(p))assert.equal(C.maxHp(p,id),100);const early=progressed(2);assert.equal(C.maxHp(early,'mudkip'),70);assert.equal(C.maxHp(early,'pineco'),60);assert.equal(C.maxHp(early,'seviper'),50);
});
test('every playable has two distinct alternatives for each final slot, but only four equipped moves',()=>{
 for(const id of [...STARTERS,...SECOND_POKEMON,...THIRD_POKEMON]){
  assert.equal(MOVE_CHOICES[id].length,2);for(const list of MOVE_CHOICES[id]){assert.equal(list.length,2);assert.notEqual(list[0].id,list[1].id);}
  let p=progressed();p.starter=id;p.partner=null;p.third=null;
  for(const slot of [0,1])p=C.chooseMove(p,id,slot,MOVE_CHOICES[id][slot][0].id);
  assert.equal(C.availableMoves(p,id).length,4);p=C.chooseMove(p,id,0,MOVE_CHOICES[id][0][1].id);assert.equal(C.availableMoves(p,id).length,4);assert.equal(C.availableMoves(p,id)[2].id,MOVE_CHOICES[id][0][1].id);
 }
});
test('talents mix across moves, consume points, refund safely and cannot change during battle',()=>{
 let p=C.chooseCompanion(opening('mudkip').p,'pineco');p=C.learnTalent(p,'mudkip-squirt','power');assert.equal(C.pointsRemaining(p),0);assert.equal(C.learnedPokemon(p,'mudkip').skills[0].effects[0].amount,30);assert.equal(R.mudkip.skills[0].effects[0].amount,25);assert.throws(()=>C.learnTalent(p,'mudkip-squirt','critical'));p=C.resetTalents(p);assert.equal(C.pointsRemaining(p),1);p=C.beginEncounter(p);assert.throws(()=>C.learnTalent(p,'mudkip-squirt','power'));assert.throws(()=>C.resetTalents(p));
});
test('critical and proc talents use seeded chance and have working Burn/Stun outcomes',()=>{
 const base=R.torchic.skills[0],upgraded=applyTalents(base,['power','critical','burn']);assert.equal(upgraded.effects[0].percent,20);assert.equal(upgraded.effects[0].effects[0].amount,60);assert.equal(upgraded.effects[0].elseEffects[0].amount,30);let burns=0;
 for(let seed=1;seed<=150;seed++){const roster=clone(R);roster.torchic.skills[0]=applyTalents(base,['burn']);roster.zigzagoon.startingHp=200;let s=createScenarioGame({roster,teams:{A:['torchic'],B:['zigzagoon']},economyMode:'sandbox',seed:(seed*2654435761)>>>0});s=cast(s,'torchic-flame-pellets');if(s.teams.B[0].statuses.some(t=>t.name==='Burn'))burns++;}
 assert.ok(burns>5&&burns<60,`${burns} burns`);assert.ok(talentOptions(R.mudkip.skills[0]).some(t=>t.id==='stun'));
});
test('saved journeys reconstruct battle rules; corrupt or premature rewards cannot be restored',()=>{
 let p=C.beginEncounter(C.chooseStarter(C.freshJourney(),'treecko'));let s=C.battleFromProgress(p);s=C.playTurn(p,s,[C.openingAction(s)]);p=C.recordBattle(p,s);const restored=C.restoreJourney(JSON.stringify(p));assert.deepEqual(C.battleFromProgress(restored),s);assert.throws(()=>C.restoreJourney(JSON.stringify({...p,partner:'slugma'})));assert.throws(()=>C.restoreJourney(JSON.stringify({...p,active:{...p.active,turns:[[]]}})));assert.deepEqual(C.restoreJourney(JSON.stringify(C.freshJourney())),C.freshJourney());
});
test('a first-clear reward cannot be claimed twice or farmed from a retry',()=>{
 const {p}=opening('mudkip');assert.equal(C.maxHp(p,'mudkip'),60);assert.throws(()=>C.finishEncounter(p));const next=C.beginEncounter(C.chooseCompanion(p,'pineco'));const retry=C.retryEncounter(next);assert.equal(C.maxHp(retry,'mudkip'),60);assert.equal(C.pointsRemaining(retry),1);
});
test('trace mode exposes per-action visual snapshots without changing normal engine results',()=>{
 const s=duel('mudkip'),a=C.openingAction(s),plain=resolveQueuedTurn(s,[a]),traced=resolveQueuedTurn(s,[a],{trace:true});assert.deepEqual(plain.state,traced.state);assert.equal(traced.steps.length,1);assert.equal(traced.steps[0].state.currentPlayer,'A');assert.equal(traced.state.currentPlayer,'B');assert.equal(plain.steps,undefined);
});
test('admin-only handler rejects guests, regular accounts and asset/module guesses',async()=>{
 const root=fileURLToPath(new URL('../../../',import.meta.url));let verified=0;
 const handler=access({repositoryRoot:root,resolveUser:async req=>{verified++;const id=req.headers.cookie;return id==='session=admin'?{username:'owner',role:'admin'}:id==='session=user'?{username:'player',role:'user'}:null;}});
 const server=createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}`;
 try{
  for(const path of ['/pokemon-campaign/','/pokemon-campaign/app.mjs','/pokemon-campaign/assets/poochyena.png','/pokemon-campaign/engine/engine.mjs']){
   assert.equal((await fetch(url+path)).status,401);assert.equal((await fetch(url+path,{headers:{cookie:'session=user','x-admin-role':'admin'}})).status,403);
  }
  const ok=await fetch(url+'/pokemon-campaign/',{headers:{cookie:'session=admin'}});assert.equal(ok.status,200);assert.match(ok.headers.get('cache-control'),/private, no-store/);assert.match(await ok.text(),/Pokémon Campaign/);
  const asset=await fetch(url+'/pokemon-campaign/assets/poochyena.png',{headers:{cookie:'session=admin'}});assert.equal(asset.status,200);assert.equal(asset.headers.get('content-type'),'image/png');
  assert.equal((await fetch(url+'/pokemon-campaign/access.cjs',{headers:{cookie:'session=admin'}})).status,404);
  assert.equal((await fetch(url+'/pokemon-campaign/engine/server.mjs',{headers:{cookie:'session=admin'}})).status,404);
  assert.equal((await fetch(url+'/pokemon-campaign/session',{headers:{cookie:'session=admin'}})).status,200);assert.ok(verified>=13);
 }finally{await new Promise(r=>server.close(r));}
});
test('raw campaign source URLs, encoded spellings and traversal aliases cannot bypass the gate',()=>{
 for(const path of ['//prototypes/pokemon-campaign/index.html','/%2fprototypes/pokemon-campaign/assets/mudkip.png','/prototypes/pokemon-campaign/index.html','/prototypes/pokemon-campaign/assets/mudkip.png','/%70rototypes/pokemon-campaign/app.mjs','/prototypes%2Fpokemon-campaign/roster.mjs','/prototypes/pokemon-campaign/../pokemon-campaign/index.html'])assert.ok(access.isCampaignSourcePath(path),path);
 assert.equal(access.isCampaignSourcePath('/pokemon-home.html'),false);
 const server=fs.readFileSync(new URL('../../../server.js',import.meta.url),'utf8');assert.ok(server.indexOf("app.use('/pokemon-campaign'")<server.indexOf('app.use(express.static(path.join(__dirname)))'));
 assert.match(server,/resolveUser: getSessionUserFromRequest/);assert.match(server,/\.isCampaignSourcePath\(requestPath\)/);
});

test('a complete challenging route reaches the cap, unlocks all final choices and survives save/reload',()=>{
 let p=C.chooseStarter(C.freshJourney(),'mudkip'),fainted=0;
 for(let index=0;index<7;index++){
  if(index===1)p=C.chooseCompanion(p,'pineco');if(index===2)p=C.chooseCompanion(p,'zangoose');
  for(const ch of C.pendingChoices(p))p=C.chooseMove(p,ch.id,ch.slot,ch.options[0].id);
  for(const move of C.members(p).flatMap(id=>C.availableMoves(p,id))){if(C.pointsRemaining(p)<=0)break;try{p=C.learnTalent(p,move.id,'power');}catch{}}
  p=C.beginEncounter(p);let state=C.battleFromProgress(p),turns=0;
  while(!state.winner&&turns++<100)state=C.playTurn(p,state,C.botActions(state));
  assert.equal(state.winner,'A',`Encounter ${index+1} has a viable tactical route`);fainted+=state.teams.A.filter(u=>!u.alive).length;
  p=C.finishEncounter(C.recordBattle(p,state));p=C.restoreJourney(JSON.stringify(p));
 }
 for(const ch of C.pendingChoices(p))p=C.chooseMove(p,ch.id,ch.slot,ch.options[1].id);
 assert.ok(fainted>0,'Later fights are not guaranteed flawless wins');for(const id of C.members(p)){assert.equal(C.maxHp(p,id),100);assert.equal(C.availableMoves(p,id).length,4);}assert.equal(p.cleared.length,7);
});
test('a bad plan can lose after the opening; losing grants no HP or Talent Points',()=>{
 let p=C.beginEncounter(C.chooseCompanion(opening('mudkip').p,'slugma')),state=C.battleFromProgress(p),turns=0;
 while(!state.winner&&turns++<40)state=C.playTurn(p,state,state.currentPlayer==='A'?[]:C.botActions(state));
 assert.equal(state.winner,'B');assert.throws(()=>C.finishEncounter(C.recordBattle(p,state)));assert.equal(C.maxHp(p,'mudkip'),60);assert.equal(C.pointsRemaining(p),1);
});
