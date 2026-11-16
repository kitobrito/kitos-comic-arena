const clone=value=>structuredClone(value);
const primary=skill=>skill.effects.find(e=>['damage','drain','heal','shield'].includes(e.kind)||e.status?.periodicDamage);
export function talentOptions(skill){
 const effect=primary(skill),options=[];
 if(effect)options.push({id:'power',name:'Power',description:effect.status?.periodicDamage?'+5 damage to each periodic tick.':'+5 to this move’s primary damage, healing, or Shield.'});
 if(effect&&['damage','drain'].includes(effect.kind)){
  options.push({id:'critical',name:'Critical',description:'20% chance for the primary hit to deal double damage.'});
  options.push(skill.moveType==='Fire'?(skill.effects.some(e=>e.status?.name==='Burn')?{id:'kindling',name:'Kindling',description:'Your existing Burn deals 5 more damage per tick.'}:{id:'burn',name:'Kindling',description:'15% chance to Burn for 5 affliction damage for 2 turns.'}):{id:'stun',name:'Disrupt',description:'10% chance to Stun the target for 1 turn.'});
 }
 if(skill.cooldown>0)options.push({id:'flow',name:'Flow',description:'Reduce this move’s cooldown by 1.'});
 if(!effect)options.push({id:'shield',name:'Fortify',description:'Also gain 5 Shield when you use this move.'});
 return options;
}
export function applyTalents(original,chosen=[]){
 const skill=clone(original);const effect=primary(skill);
 for(const id of chosen){
  if(!talentOptions(original).some(t=>t.id===id))throw new Error('Invalid talent for this move.');
  if(id==='power'){if(effect.status?.periodicDamage)effect.status.periodicDamage+=5;else effect.amount+=5;}
  if(id==='flow')skill.cooldown=Math.max(0,skill.cooldown-1);
  if(id==='shield')skill.effects.push({kind:'shield',scope:'self',amount:5});
  if(id==='kindling')for(const e of skill.effects)if(e.status?.name==='Burn')e.status.periodicDamage+=5;
 }
 if(chosen.includes('critical')&&effect){
  const index=skill.effects.indexOf(effect),critical=clone(effect);critical.amount*=2;critical.campaignCritical=true;
  skill.effects[index]={kind:'chance',percent:20,effects:[critical],elseEffects:[effect],...(effect.scope?{scope:effect.scope}:{})};
 }
 for(const id of ['burn','stun'])if(chosen.includes(id))skill.effects.push({kind:'status',chance:id==='burn'?15:10,
  ...(skill.target==='all-enemy'?{scope:'all-enemy'}:{}),status:{id:`talent-${id}-${skill.id}`,name:id==='burn'?'Burn':'Stun',hidden:false,harmful:true,
   durationActions:id==='burn'?2:1,durationAnchor:'target',replaceExisting:true,
   ...(id==='burn'?{periodicDamage:5}:{cannotUseSkills:true,stunLikeEffect:true})}});
 skill.talents=[...chosen];
 if(chosen.length)skill.description+=' '+talentOptions(original).filter(t=>chosen.includes(t.id)).map(t=>`${t.name}: ${t.description}`).join(' ');
 return skill;
}
