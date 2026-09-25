const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
function audioHarness(){let context,resolveResume,rejectResume,tones=0;const node=()=>({gain:{value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){}},frequency:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},Q:{},connect(){},disconnect(){},start(){},stop(){}});class Context{constructor(){context=this;this.state='suspended';this.sampleRate=10;this.currentTime=0}createGain(){return node()}createBuffer(){return{getChannelData:()=>new Float32Array(20)}}createOscillator(){tones++;return node()}createBufferSource(){return node()}createBiquadFilter(){return node()}resume(){return new Promise((r,j)=>{resolveResume=()=>{this.state='running';r()};rejectResume=j})}suspend(){this.state='suspended';return Promise.resolve()}}
const window={AudioContext:Context,dispatchEvent(){}};const navigator={audioSession:{type:'auto'}};vm.runInNewContext(fs.readFileSync('audio.js','utf8'),{window,navigator,Event,Math,Float32Array});return{api:window.PicnicAudio,navigator,get context(){return context},get tones(){return tones},resume:()=>resolveResume(),reject:()=>rejectResume(new Error('blocked'))}}
test('audio does not schedule sound before resume completes',async()=>{const h=audioHarness();const p=h.api.setEnabled(true);h.api.play('magic');assert.equal(h.tones,0);assert.equal(h.api.status().running,false);h.resume();assert.equal(await p,true);h.api.play('magic');assert.equal(h.tones,4);assert.equal(h.navigator.audioSession.type,'playback')});
test('blocked audio reports not running; next gesture can retry',async()=>{const h=audioHarness();const p=h.api.setEnabled(true);h.reject();assert.equal(await p,false);assert.equal(h.api.status().running,false);const retry=h.api.unlock();h.resume();assert.equal(await retry,true)});
test('switching sound off invalidates pending enable',async()=>{const h=audioHarness();const pending=h.api.setEnabled(true);await h.api.setEnabled(false);h.resume();assert.equal(await pending,false);h.api.play('magic');assert.equal(h.tones,0);assert.equal(h.navigator.audioSession.type,'auto')});

function i18nHarness(stored){const window={},kept=stored===undefined?{}:{'picnic-lang':stored};
 const localStorage={getItem:k=>k in kept?kept[k]:null,setItem:(k,v)=>{kept[k]=v}};
 vm.runInNewContext(fs.readFileSync('i18n.js','utf8'),{window,localStorage,Event,JSON,Object,String});return{api:window.PicnicI18n,kept}}
/* Keys as written in the two dictionary literals, used to check both stay in step. */
function tableKeys(){const source=fs.readFileSync('i18n.js','utf8');const start=source.indexOf('const en = {');assert.ok(start>0);const read=text=>new Set(Array.from(text.matchAll(/^\s{4}'([\w.]+)':/gm),m=>m[1]));const zh=read(source.slice(0,start)),en=read(source.slice(start));assert.ok(zh.size>150);return{zh,en}}
test('both languages define exactly the same keys',()=>{const {zh,en}=tableKeys();assert.deepEqual([...zh].filter(k=>!en.has(k)),[]);assert.deepEqual([...en].filter(k=>!zh.has(k)),[])});
test('every key the game and markup ask for exists in both languages',()=>{const {zh,en}=tableKeys();const used=new Set();
 for(const file of ['game.js','share.js'])for(const m of fs.readFileSync(file,'utf8').matchAll(/'([a-z][\w]*\.[\w.]+)'/g))used.add(m[1].replace(/\.$/,''));
 const markup=fs.readFileSync('index.html','utf8');
 for(const m of markup.matchAll(/data-i18n(?:-html)?="([\w.]+)"/g))used.add(m[1]);
 for(const m of markup.matchAll(/data-i18n-attr="([^"]+)"/g))for(const pair of m[1].split(';'))used.add(pair.split(':')[1].trim());
 assert.ok(used.size>90);
 /* A key is satisfied by an exact entry, or by being the prefix of a numbered pool such as chatter.idle.3 */
 const defined=(table,key)=>table.has(key)||[...table].some(k=>k.startsWith(key+'.'));
 const missing=[...used].filter(key=>!defined(zh,key)||!defined(en,key));assert.deepEqual(missing,[])});
test('every random pool has the same lines in both languages',()=>{const {zh,en}=tableKeys();
 const pools=['chatter.idle','chatter.burning','chatter.busy','chatter.burnt','chatter.poke','chatter.cat','chatter.rare','chatter.streak','chatter.obsessed','chatter.fed','chatter.legend','chatter.legendIn','chatter.legendBurnt','praise.perfect','praise.good'];
 for(const prefix of pools){const lines=[...zh].filter(k=>k.startsWith(prefix+'.'));
  assert.ok(lines.length>=1,prefix+' is empty');
  for(const key of lines)assert.ok(en.has(key),key+' missing in en')}
 for(const seconds of [10,7,5,3,1]){assert.ok(zh.has('countdown.'+seconds)&&en.has('countdown.'+seconds),'countdown.'+seconds)}});
test('pick returns a key from the pool and avoids repeating the last line',()=>{const api=i18nHarness().api;
 const seen=new Set();for(let i=0;i<60;i++)seen.add(api.pick('chatter.idle'));
 assert.ok(seen.size>=5,'pick should spread across the pool');
 for(const key of seen)assert.match(key,/^chatter\.idle\.\d+$/);
 const first=api.pick('chatter.cat');for(let i=0;i<30;i++)assert.notEqual(api.pick('chatter.cat',first),first);
 assert.equal(api.pick('chatter.nothing'),null)});
test('chinese is the default; only a stored choice moves away from it',()=>{
 assert.equal(i18nHarness().api.language(),'zh');
 assert.equal(i18nHarness('en').api.language(),'en');
 assert.equal(i18nHarness('klingon').api.language(),'zh');
 const h=i18nHarness();assert.equal(h.api.t('mode.rushName'),'90 秒派對');
 assert.equal(h.api.toggle(),'en');assert.equal(h.api.t('mode.rushName'),'90-second party');
 assert.equal(h.kept['picnic-lang'],'en');
 assert.equal(h.api.setLanguage('klingon'),'en');assert.equal(h.api.setLanguage('zh'),'zh');
 assert.equal(h.kept['picnic-lang'],'zh')});
test('placeholders are filled in both languages and unknown keys fall back to the key',()=>{const api=i18nHarness('en').api;assert.equal(api.t('memory.served',{n:3}),'Shared 3 tasty plates');assert.equal(api.t('clock.rush',{n:12}),'⏱ 12s');assert.equal(api.t('no.such.key'),'no.such.key');
 api.setLanguage('zh');assert.equal(api.t('memory.served',{n:3}),'已分享 3 份美味');assert.equal(api.t('clock.rush',{n:12}),'⏱ 12 秒')});

test('tip parameters carry keys, so a language switch retranslates the names inside',()=>{const src=fs.readFileSync('game.js','utf8');
 assert.match(src,/say\('tip\.placed',\{emoji:[^,]+,food:\{key:'food\.'/,'tip.placed must pass a food key, not a translated name');
 assert.match(src,/say\('tip\.serveGuest',\{emoji:[^,]+,name:\{key:'friend\.'/,'tip.serveGuest must pass a friend key, not a translated name')});

function shareHarness(support=true,language='zh'){const elements={};for(const id of ['share-dialog','share-image','share-status','native-share','download-card','close-share','share-caption','share-caption-text'])elements['#'+id]={hidden:false,disabled:false,open:false,handlers:{},showModal(){this.open=true},close(){this.open=false;this.handlers.close?.()},addEventListener(k,f){this.handlers[k]=f},removeAttribute(k){delete this[k]}};let calls=0,shared,resolveShare,rejectShare;const draw=new Proxy({measureText:s=>({width:s.length*20})},{get:(t,k)=>k in t?t[k]:()=>{}});const document={querySelector:s=>elements[s],createElement:()=>({getContext:()=>draw,toBlob:cb=>cb(new Blob(['png']))})};const navigator={canShare:p=>support==='files-only'?!p.text:!!support,share:f=>{calls++;shared=f;return new Promise((r,j)=>{resolveShare=r;rejectShare=j})}};const window={};let serial=0;const URL={createObjectURL:()=>`blob:${++serial}`,revokeObjectURL(){}};const context={window,document,navigator,URL,File,Blob,Date,Event,JSON,Object,String};vm.runInNewContext(fs.readFileSync('i18n.js','utf8'),context);window.PicnicI18n.setLanguage(language);vm.runInNewContext(fs.readFileSync('share.js','utf8'),context);return{api:window.PicnicShare,i18n:window.PicnicI18n,e:elements,get calls(){return calls},get shared(){return shared},cancel:()=>rejectShare({name:'AbortError'}),fail:()=>rejectShare({name:'NotAllowedError'})}}
const record={player:'大廚',mode:'cozy',score:42,served:1,updatedAt:new Date().toISOString()};
test('share always presents image first; explicit button opens native share',async()=>{const h=shareHarness();await h.api.open(record);assert.equal(h.e['#share-dialog'].open,true);assert.equal(h.e['#share-image'].hidden,false);assert.equal(h.calls,0);const p=h.e['#native-share'].onclick();assert.equal(h.calls,1);h.cancel();await p;assert.match(h.e['#share-status'].textContent,/已取消/);assert.equal(h.e['#download-card'].hidden,false);assert.equal(h.e['#native-share'].disabled,false)});
test('unsupported browser keeps visible image and a direct save link',async()=>{const h=shareHarness(false);await h.api.open(record);assert.equal(h.e['#native-share'].hidden,true);assert.equal(h.e['#share-image'].hidden,false);assert.match(h.e['#download-card'].href,/blob:/)});
test('blocked share shows actionable fallback and re-opening uses fresh card',async()=>{const h=shareHarness();await h.api.open(record);const old=h.e['#download-card'].href;const p=h.e['#native-share'].onclick();h.fail();await p;assert.match(h.e['#share-status'].textContent,/儲存圖片/);h.e['#close-share'].onclick();assert.equal(h.e['#share-image'].src,undefined);await h.api.open({...record,score:85});assert.notEqual(h.e['#download-card'].href,old)});
test('share card speaks the chosen language, file name included',async()=>{const h=shareHarness(true,'en');await h.api.open({...record,player:'Paul'});assert.match(h.e['#share-status'].textContent,/image is ready/);assert.equal(h.e['#native-share'].textContent,'↗ Share image');const p=h.e['#native-share'].onclick();assert.equal(h.shared.files[0].name,'my-bbq-score.png');h.cancel();await p;assert.match(h.e['#share-status'].textContent,/Sharing cancelled/)});
test('the image goes out with a caption and the game link, shown in the dialog too',async()=>{const h=shareHarness(true,'zh');await h.api.open({...record,player:'阿肉',score:120});
 assert.equal(h.e['#share-caption'].hidden,false);
 assert.match(h.e['#share-caption-text'].textContent,/阿肉/);
 assert.match(h.e['#share-caption-text'].textContent,/120/);
 assert.match(h.e['#share-caption-text'].textContent,/https:\/\/paul060379\.github\.io\/CloudBBQ\//);
 const p=h.e['#native-share'].onclick();
 assert.equal(h.shared.files.length,1);
 assert.match(h.shared.text,/阿肉/);
 assert.equal(h.shared.url,'https://paul060379.github.io/CloudBBQ/');
 h.cancel();await p;
 h.e['#close-share'].onclick();
 assert.equal(h.e['#share-caption'].hidden,true)});
test('a target that refuses text still gets the image, and the caption stays on screen to copy',async()=>{const h=shareHarness('files-only','zh');await h.api.open(record);
 assert.equal(h.e['#native-share'].hidden,false,'the share button must survive the fallback');
 assert.equal(h.e['#share-caption'].hidden,false);
 const p=h.e['#native-share'].onclick();
 assert.equal(h.shared.files.length,1);
 assert.equal(h.shared.text,undefined);
 h.cancel();await p});
