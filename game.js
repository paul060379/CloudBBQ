const $ = s => document.querySelector(s);
const T = (key,params) => PicnicI18n.t(key,params);
const lang = () => PicnicI18n.language();
const foods = [{id:'meat',emoji:'🍖',time:6},{id:'corn',emoji:'🌽',time:7},{id:'sausage',emoji:'🌭',time:5},{id:'mushroom',emoji:'🍄',time:5},{id:'shrimp',emoji:'🍤',time:6},{id:'marshmallow',emoji:'🍡',time:4}];
const friends = [{id:'bunny',emoji:'🐰',wish:1},{id:'capybara',emoji:'🐹',wish:0},{id:'cat',emoji:'🐱',wish:5}];
const foodName = f => T('food.'+f.id);
const friendName = f => T('friend.'+f.id);
const fx = PicnicAudio.play;
let slots=Array(6).fill(null), selected=0, score=0, combo=0, served=0, mode='cozy', remaining=90;
let paused=true, ended=false, started=false, sauced=false, sound=false, fan=3, fanTime=0, last=performance.now();
let player='', runId='', runStart='', bestRecords=[], allRecords=[], saveQueue=Promise.resolve(), drag=null, suppressClickUntil=0;
let recordRevision=0, savedRevision=-1, storageAvailable=true, recordsLoaded=false, tipKey='tip.intro', tipParams;
let perfects=0, burnts=0, pokes=0, guestServes=0, lastChatter='', chatterWait=8, chatterLeft=0, cues=[];
const slotNodes=[];
const modeName = m => T(m==='rush'?'mode.rushName':'mode.cozyName');
function resolve(params){if(!params)return params;const out={};for(const [key,value] of Object.entries(params))out[key]=value&&typeof value==='object'&&value.key?T(value.key,resolve(value.params)):value;return out}
function say(key,params){tipKey=key;tipParams=params;PicnicI18n.set($('#tip'),key,resolve(params))}
function chatter(key,params){if(!key)return;lastChatter=key;const node=$('#chatter');PicnicI18n.set(node,key,params);node.classList.add('show');chatterLeft=2.4+Math.random()*1.4;chatterWait=Math.max(chatterWait,8)}
function ambient(){const cooking=slots.filter(Boolean);
 const nearBurn=cooking.some(s=>{const r=s.elapsed/foods[s.kind].time;return r>=1.5&&r<1.9});
 const bucket=nearBurn?'chatter.burning':cooking.length>=4?'chatter.busy':Math.random()<.14?'chatter.rare':'chatter.idle';
 chatter(PicnicI18n.pick(bucket,lastChatter))}
function selectFood(i) { selected=i; document.querySelectorAll('.ingredient').forEach((n,j)=>{n.classList.toggle('selected',i===j);n.setAttribute('aria-pressed',i===j)}); }
foods.forEach((f,i)=>{ const b=document.createElement('button');b.className='ingredient';b.dataset.ingredient=i;b.innerHTML=`<span>${f.emoji}</span><b class="ingredient-name"></b>`;b.onclick=()=>{if(performance.now()<suppressClickUntil)return;selectFood(i);fx('pick')};$('#ingredients').append(b);bindDrag(b,'ingredient',i); });
function drawIngredients(){document.querySelectorAll('.ingredient').forEach((node,i)=>{node.querySelector('.ingredient-name').textContent=foodName(foods[i]);node.setAttribute('aria-label',T('ingredient.label',{food:foodName(foods[i])}))})}
for(let i=0;i<6;i++){const b=document.createElement('button');b.dataset.slot=i;b.onclick=()=>{if(performance.now()>=suppressClickUntil)tap(i)};$('#grill').append(b);slotNodes.push(b);bindDrag(b,'slot',i)}
function drawGuests(){friends.forEach((f,i)=>{let g=$('#guest'+i);if(!g){g=document.createElement('div');g.id='guest'+i;g.dataset.guest=i;g.className='guest';$('#guests').append(g)}g.innerHTML=`<div class="bubble">${T('guest.wish',{emoji:foods[f.wish].emoji})}</div><span class="animal">${f.emoji}</span><span class="guest-name">${friendName(f)}</span>`})}
function rank(){return score>=500?['👑','rank.legend']:score>=250?['🏆','rank.master']:score>=100?['🌟','rank.chef']:score>=30?['🌼','rank.friend']:['🌱','rank.newbie']}
function render(){
 slots.forEach((s,i)=>{const b=slotNodes[i];if(!s){const empty=lang()+'-empty';if(b.dataset.state!==empty){b.className='slot empty';b.innerHTML='＋';b.setAttribute('aria-label',T('slot.emptyLabel',{n:i+1}));b.dataset.state=empty}return}
 const f=foods[s.kind],p=s.elapsed/f.time,burnt=p>=1.9,ready=p>=1,sweet=ready&&!burnt&&p<=1.4&&(s.side?s.quality===1:true);
 const status=burnt?'slot.burnt':ready?(s.side?(sweet?'slot.perfectNow':'slot.serve'):(sweet?'slot.flipNow':'slot.flip')):(s.side?'slot.second':'slot.first');const key=`${lang()}-${s.kind}-${s.side}-${status}-${s.legend?1:0}`;
 if(b.dataset.state!==key){b.dataset.state=key;b.className='slot '+(s.side?'flipped ':'')+(s.legend?'legend ':'')+(sweet?'perfect ':'')+(burnt?'burnt':ready?'ready':'early');b.innerHTML=`<span class="food">${f.emoji}</span><span class="status"></span><progress max="1.9" value="0"></progress>`;b.querySelector('.status').textContent=T(status);b.setAttribute('aria-label',T('slot.label',{food:foodName(f),status:T(status)}))}b.querySelector('progress').value=Math.min(p,1.9);
 });
 $('#score').textContent=score;$('#combo').textContent=combo;$('#clock').textContent=mode==='cozy'?T('clock.cozy'):T('clock.rush',{n:Math.ceil(remaining)});
 $('#fan-count').textContent=T('scene.fanCount',{n:fan});$('#fan').disabled=fan===0||fanTime>0;$('#heat-label').textContent=T(fanTime>0?'heat.fast':'heat.slow');$('.play-area').classList.toggle('fan-on',fanTime>0);
 $('#served').textContent=T('memory.served',{n:served});$('#badge-icon').textContent=rank()[0];$('#badge').textContent=T(rank()[1]);
}
function particles(target,emoji='✨'){const rect=target.getBoundingClientRect();for(let j=0;j<9;j++){const p=document.createElement('span');p.className='particle';p.textContent=j%3===0?emoji:['✨','♥','✦'][j%3];p.style.left=(rect.left+rect.width/2+Math.random()*40-20)+'px';p.style.top=(rect.top+20)+'px';p.style.setProperty('--dx',(Math.random()*160-80)+'px');$('#particles').append(p);setTimeout(()=>p.remove(),1500)}}
function place(i,kind){if(!started||paused||ended)return;if(slots[i]){say('tip.occupied');fx('wait');return}
 const legend=foods[kind].id==='meat'&&Math.random()<.03;slots[i]={kind,side:0,elapsed:0,quality:1,legend};fx(legend?'rare':'place');
 if(legend){say('legend.appear');chatter(PicnicI18n.pick('chatter.legendIn'))}else say('tip.placed',{emoji:foods[kind].emoji,food:{key:'food.'+foods[kind].id}});render()}
function tap(i){if(!started||paused||ended)return;const s=slots[i];if(!s){place(i,selected);return}const ratio=s.elapsed/foods[s.kind].time;
 if(ratio>=1.9){slots[i]=null;combo=0;burnts++;say('tip.burnt');fx('burn');
  const alarm=s.legend?'':burnts===1?'chatter.fireFirst':burnts===3?'chatter.fireAgain':burnts===6?'chatter.fireStaying':'';
  chatter(alarm||PicnicI18n.pick(s.legend?'chatter.legendBurnt':'chatter.burnt',lastChatter));render();return}
 if(ratio<1){pokes++;say('tip.wait');fx('wait');if(pokes%3===0)chatter(PicnicI18n.pick('chatter.poke',lastChatter));return}
 if(!s.side){s.side=1;s.quality=ratio<=1.4?1:.7;s.elapsed=0;fx('flip');say('tip.flipped');render();return}serveFood(i)}
function serveFood(i,recipient){
 if(!started||paused||ended)return;const s=slots[i];if(!s)return;const f=foods[s.kind],ratio=s.elapsed/f.time;
 if(!s.side||ratio<1||ratio>=1.9){say(ratio>=1.9?'tip.burntServe':'tip.notReady');fx('wait');return}
 const receiver=recipient===undefined?friends.findIndex(g=>g.wish===s.kind):recipient;const match=receiver>=0&&friends[receiver].wish===s.kind;
 const perfect=ratio<=1.4&&s.quality===1;combo=perfect?combo+1:0;if(perfect)perfects++;
 const gain=(perfect?20:12)+(match?15:0)+(sauced?5:0)+Math.min(combo,5)*2+(s.legend&&perfect?25:0);
 score+=gain;served++;recordRevision++;slots[i]=null;
 if(sauced){sauced=false;$('#sauce').setAttribute('aria-pressed','false');PicnicI18n.set($('#sauce'),'pantry.sauceOff')}
 if(receiver>=0){guestServes++;const guest=friends[receiver];say('tip.serveGuest',{emoji:guest.emoji,name:{key:'friend.'+guest.id},reaction:{key:match?'reaction.match':'reaction.other'},gain});if(match)guest.wish=(guest.wish+1+Math.floor(Math.random()*5))%foods.length;drawGuests();const g=$('#guest'+receiver);g.classList.add('happy');setTimeout(()=>g.classList.remove('happy'),1300);particles(g,perfect?'🌟':'♥');fx(perfect?'perfect':match?'happy':'serve')}
 else {say('tip.serveShared',{praise:{key:PicnicI18n.pick(perfect?'praise.perfect':'praise.good')},emoji:f.emoji,gain});particles(slotNodes[i],perfect?'🌟':'♥');fx(perfect?'perfect':'serve')}
 if(served%5===0){fan=Math.min(fan+1,5);say('tip.newFan',{text:{key:tipKey,params:tipParams}})}
 if(perfect&&s.legend)chatter(PicnicI18n.pick('chatter.legend',lastChatter));
 else if(perfect&&combo>=5&&Math.random()<.5)chatter(PicnicI18n.pick('chatter.obsessed',lastChatter));
 else if(perfect&&combo>=3&&Math.random()<.45)chatter(PicnicI18n.pick('chatter.streak',lastChatter));
 else if(perfect&&combo>=2)chatter('combo.perfect',{fire:'🔥'.repeat(Math.min(combo-1,3)),n:combo});
 else if(receiver>=0&&lastChatter.startsWith('chatter.cat.'))chatter('chatter.catGivesIn');
 else if(receiver>=0&&guestServes>=4&&Math.random()<.22)chatter(PicnicI18n.pick('chatter.fed',lastChatter));
 else if(perfect&&Math.random()<.18)chatter(PicnicI18n.pick('chatter.cat',lastChatter));
 persist();render();
}
function bindDrag(node,type,index){
 node.addEventListener('pointerdown',e=>{if(!started||paused||ended||drag||!e.isPrimary||(e.pointerType==='mouse'&&e.button!==0))return;if(type==='slot'&&!slots[index])return;drag={type,index,node,id:e.pointerId,x:e.clientX,y:e.clientY,active:false,ghost:null};node.setPointerCapture(e.pointerId)});
 node.addEventListener('pointermove',e=>{if(!drag||drag.node!==node||drag.id!==e.pointerId)return;const d=drag;if(!d.active&&Math.hypot(e.clientX-d.x,e.clientY-d.y)<8)return;if(!d.active){d.active=true;const kind=type==='ingredient'?index:slots[index]?.kind;if(kind===undefined){cancelDrag();return}d.ghost=document.createElement('div');d.ghost.className='drag-ghost';d.ghost.textContent=foods[kind].emoji;d.ghost.setAttribute('aria-hidden','true');document.body.append(d.ghost);document.body.classList.add('dragging-food');fx('pick')}
 d.ghost.style.transform=`translate(${e.clientX-25}px,${e.clientY-55}px)`;document.querySelectorAll('.drop-target').forEach(n=>n.classList.remove('drop-target'));const target=document.elementFromPoint(e.clientX,e.clientY)?.closest(type==='ingredient'?'[data-slot]':'[data-guest]');target?.classList.add('drop-target');
 if(e.clientY<75)window.scrollBy(0,-12);else if(e.clientY>innerHeight-45)window.scrollBy(0,12);
 });
 node.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const d=drag;const target=document.elementFromPoint(e.clientX,e.clientY);cancelDrag();if(!d.active)return;suppressClickUntil=performance.now()+500;if(d.type==='ingredient'){const drop=target?.closest('[data-slot]');if(drop){selectFood(d.index);place(Number(drop.dataset.slot),d.index)}else say('tip.dropOnGrill')}
 else {const guest=target?.closest('[data-guest]');if(guest)serveFood(d.index,Number(guest.dataset.guest));else say('tip.dropOnFriend')}
 });
 node.addEventListener('pointercancel',cancelDrag);node.addEventListener('lostpointercapture',()=>{if(drag?.node===node)cancelDrag()});node.addEventListener('contextmenu',e=>e.preventDefault());
}
function cancelDrag(){if(!drag)return;const d=drag;drag=null;if(d.active)suppressClickUntil=performance.now()+500;d.ghost?.remove();document.body.classList.remove('dragging-food');document.querySelectorAll('.drop-target').forEach(n=>n.classList.remove('drop-target'));if(d.node.hasPointerCapture(d.id))d.node.releasePointerCapture(d.id)}
function updateSoundUI(){const state=PicnicAudio.status();sound=state.enabled;PicnicI18n.set($('#sound'),state.running?'sound.on':state.enabled?'sound.activate':'sound.off');$('#sound').setAttribute('aria-pressed',state.running);$('#start-sound').checked=state.enabled;PicnicI18n.set($('#audio-hint'),state.running?'audio.running':state.enabled?'audio.pending':'audio.idle');}
function setSound(value){const ready=PicnicAudio.setEnabled(value);updateSoundUI();return ready.then(ok=>{updateSoundUI();return ok})}
window.addEventListener('picnic-audio-state',updateSoundUI);
$('#sound').onclick=()=>{const state=PicnicAudio.status();setSound(!state.running).then(ok=>{if(ok)fx('magic');else if(PicnicAudio.status().enabled)say('audio.blocked')})};
$('#sound-preview').onclick=()=>setSound(true).then(ok=>{if(ok)fx('magic')});
$('#start-sound').onchange=()=>setSound($('#start-sound').checked).then(ok=>{if(ok)fx('magic')});
document.addEventListener('pointerdown',e=>{if(e.target.closest('#sound,#sound-preview,#start-sound'))return;if(PicnicAudio.status().enabled&&!PicnicAudio.status().running)PicnicAudio.unlock();},{capture:true});
$('#sauce').onclick=()=>{if(paused||ended)return;sauced=!sauced;$('#sauce').setAttribute('aria-pressed',sauced);PicnicI18n.set($('#sauce'),sauced?'pantry.sauceOn':'pantry.sauceOff');say(sauced?'tip.sauceOn':'tip.sauceOff');fx('magic')};
$('#fan').onclick=()=>{if(paused||ended||!fan||fanTime>0)return;fan--;fanTime=5;say('tip.fan');fx('fan');render()};
function snapshot(){return {id:runId,player,mode,score,served,startedAt:runStart,updatedAt:new Date().toISOString(),completed:ended,gameVersion:2}}
function persist(){
 if(!started||(!served&&!ended)||recordRevision===savedRevision)return saveQueue;
 const record=snapshot(),revision=recordRevision;savedRevision=revision;
 saveQueue=saveQueue.then(()=>PicnicStore.save(record)).then(()=>{PicnicI18n.set($('#save-note'),'storage.saved');storageAvailable=true}).catch(()=>{if(runId===record.id)savedRevision=-1;storageAvailable=false;PicnicI18n.set($('#save-note'),'storage.failed');PicnicI18n.set($('#storage-note'),'storage.noteFail')});
 return saveQueue;
}
async function records(){
 const container=$('#records');container.replaceChildren();
 try{allRecords=await PicnicStore.all();recordsLoaded=true;paintRecords();return;

 }catch{storageAvailable=false;PicnicI18n.set(container,'records.unreadable');PicnicI18n.set($('#storage-note'),'storage.noteFail')}
}
function paintRecords(){
 const container=$('#records');container.replaceChildren();delete container.dataset.i18n;const name=$('#player-name').value.trim();
 bestRecords=['rush','cozy'].map(m=>allRecords.filter(r=>(!name||r.player===name)&&r.mode===m&&(m!=='rush'||r.completed)).sort((a,b)=>b.score-a.score)[0]).filter(Boolean);
 if(!bestRecords.length){PicnicI18n.set(container,'records.empty')}
 for(const r of bestRecords){const row=document.createElement('div');row.className='score-row';const label=document.createElement('span');label.textContent=modeName(r.mode);const who=document.createElement('span');who.className='record-name';who.textContent=r.player;const points=document.createElement('b');points.textContent=T('records.points',{score:r.score});const share=document.createElement('button');share.textContent=T('records.share');share.setAttribute('aria-label',T('records.shareAria',{player:r.player,mode:modeName(r.mode)}));share.onclick=()=>shareCard(r,share);row.append(label,who,points,share);container.append(row)}
 $('#share-best').hidden=true;

 PicnicI18n.set($('#share-best'),name?'records.shareMine':'records.shareBest');
 $('#share-best').onclick=()=>{if(bestRecords[0])shareCard(bestRecords[0],$('#share-best'))};
}
function award(){return score>=300?'award.king':perfects>=5?'award.master':burnts>=4?'award.charcoal':pokes>=6?'award.flipper':guestServes>=8?'award.zoo':burnts>=2&&perfects>=2?'award.chaos':'award.solid'}
function showModal(done=false){paused=true;cancelDrag();PicnicAudio.cooking(0);persist();$('#chatter').classList.remove('show');$('#modal-art').textContent=done?'🎉':'☁️';const titled=done&&mode==='rush';$('#modal-award').hidden=!titled;if(titled)PicnicI18n.set($('#award-name'),award());PicnicI18n.set($('#modal-title'),done?'modal.doneTitle':'modal.pauseTitle');PicnicI18n.set($('#modal-copy'),done?'modal.doneCopy':'modal.pauseCopy',done?{player,score,served,rank:T(rank()[1])}:{player});PicnicI18n.set($('#resume'),done?'modal.again':'modal.resume');$('#share-score').hidden=served===0&&!ended;PicnicI18n.set($('#share-score'),'modal.shareScore');$('#share-score').onclick=()=>shareCard(snapshot(),$('#share-score')); PicnicI18n.set($('#save-note'),served||ended?'storage.saving':'storage.waiting');saveQueue.then(()=>{if(served||ended)PicnicI18n.set($('#save-note'),storageAvailable?'storage.saved':'storage.failed')});if(!$('#modal').open)$('#modal').showModal()}
$('#pause').onclick=()=>{if(started)showModal(ended)};
$('#resume').onclick=()=>{PicnicAudio.unlock();if(ended){persist();reset(mode)}else{paused=false;last=performance.now();$('#modal').close()}};
$('#restart').onclick=()=>{persist();reset(mode)};
$('#modal').addEventListener('cancel',e=>{e.preventDefault();if(!ended){paused=false;last=performance.now();$('#modal').close()}});
async function goHome(){paused=true;cancelDrag();PicnicAudio.cooking(0);$('#modal').close();await persist();started=false;$('#game-app').hidden=true;$('#welcome').hidden=false;$('#player-name').value=player;await records();window.scrollTo(0,0)}
$('#home').onclick=goHome;$('#modal-home').onclick=goHome;
function setPlayerLabel(){const node=$('#player-label');if(player){delete node.dataset.i18n;node.textContent=player}else PicnicI18n.set(node,'header.chef')}
function reset(newMode){cancelDrag();mode=newMode;score=combo=served=0;remaining=90;slots=Array(6).fill(null);fan=3;fanTime=0;paused=ended=sauced=false;started=true;recordRevision=0;savedRevision=-1;perfects=burnts=pokes=guestServes=0;lastChatter='';chatterLeft=0;chatterWait=11+Math.random()*8;$('#chatter').classList.remove('show');cues=mode==='rush'?[10,7,5,3,1].sort(()=>Math.random()-.5).slice(0,2+Math.floor(Math.random()*2)).sort((x,y)=>y-x):[];runId=crypto.randomUUID();runStart=new Date().toISOString();PicnicI18n.set($('#sauce'),'pantry.sauceOff');$('#sauce').setAttribute('aria-pressed','false');friends.forEach((f,i)=>f.wish=[1,0,5][i]);$('#cozy').classList.toggle('active',mode==='cozy');$('#rush').classList.toggle('active',mode==='rush');$('#cozy').setAttribute('aria-pressed',mode==='cozy');$('#rush').setAttribute('aria-pressed',mode==='rush');$('#modal').close();last=performance.now();drawGuests();say(mode==='cozy'?'tip.startCozy':'tip.startRush');render();fx('start')}
$('#cozy').onclick=()=>{if(mode!=='cozy'){persist();reset('cozy')}};$('#rush').onclick=()=>{if(mode!=='rush'){persist();reset('rush')}};
$('#start-form').onsubmit=e=>{e.preventDefault();const name=$('#player-name').value.trim();if(!name){$('#player-name').setCustomValidity(T('form.nameRequired'));$('#player-name').reportValidity();return}player=name;setPlayerLabel();setSound($('#start-sound').checked).then(ok=>{if(ok)fx('start')});PicnicStore.setPreference(player).catch(()=>{});$('#welcome').hidden=true;$('#game-app').hidden=false;reset(document.querySelector('input[name="mode"]:checked').value);window.scrollTo(0,0)};
$('#player-name').oninput=()=>{$('#player-name').setCustomValidity('');if(storageAvailable)paintRecords()};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&started&&!paused&&!ended)showModal();if(document.hidden)PicnicAudio.cooking(0)});
$('#lang').onclick=$('#lang-welcome').onclick=()=>PicnicI18n.toggle();
$('#story').onclick=()=>$('#story-dialog').showModal();$('#close-story').onclick=()=>$('#story-dialog').close();
window.addEventListener('picnic-lang-change',()=>{
 drawIngredients();drawGuests();setPlayerLabel();say(tipKey,tipParams);updateSoundUI();
 $('#player-name').setCustomValidity('');
 if(!$('#welcome').hidden&&storageAvailable&&recordsLoaded)paintRecords();
 if($('#modal').open)showModal(ended);
 render();
});
function tick(now){const dt=Math.min((now-last)/1000,.3);last=now;if(started&&!paused&&!ended){const speed=fanTime>0?1.8:1;if(chatterLeft>0){chatterLeft-=dt;if(chatterLeft<=0)$('#chatter').classList.remove('show')}chatterWait-=dt;if(chatterWait<=0){chatterWait=12+Math.random()*12;if(!(mode==='rush'&&remaining<=12))ambient()}slots.forEach(s=>{if(!s)return;const before=s.elapsed;s.elapsed+=dt*speed;if(before<foods[s.kind].time&&s.elapsed>=foods[s.kind].time)fx('ready')});fanTime=Math.max(0,fanTime-dt);if(mode==='rush'){remaining=Math.max(0,remaining-dt);if(cues.length&&remaining<=cues[0]){const cue=cues.shift();chatter('countdown.'+cue);if(cue===10||cue===3)fx('tick')}if(remaining===0){ended=true;recordRevision++;render();showModal(true);fx('finish')}}render();PicnicAudio.cooking(paused?0:slots.filter(s=>s&&s.elapsed<foods[s.kind].time*1.9).length)}requestAnimationFrame(tick)}
function shareCard(record){return PicnicShare.open(record)}
$('#share-score').onclick=()=>shareCard(snapshot(),$('#share-score'));
$('#share-best').onclick=()=>{const own=bestRecords.find(r=>r.player===$('#player-name').value.trim())||bestRecords[0];if(own)shareCard(own,$('#share-best'))};
PicnicStore.preference().then(name=>{if(name&&!$('#player-name').value){$('#player-name').value=name;if(storageAvailable)paintRecords()}}).catch(()=>{});
selectFood(0);drawIngredients();drawGuests();render();records();requestAnimationFrame(tick);
