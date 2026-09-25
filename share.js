window.PicnicShare = (() => {
 const dialog=document.querySelector('#share-dialog'), image=document.querySelector('#share-image'), message=document.querySelector('#share-status'), share=document.querySelector('#native-share'), download=document.querySelector('#download-card'), caption=document.querySelector('#share-caption'), captionText=document.querySelector('#share-caption-text');
 const T=(key,params)=>window.PicnicI18n.t(key,params);
 let ticket=0, url=null, file=null, sharing=false, payload=null;
 const modeName=m=>T(m==='rush'?'mode.rushName':'mode.cozyName');
 /* Latin words stay whole; CJK may break anywhere. */
 const pieces=text=>String(text).match(/[A-Za-z0-9][A-Za-z0-9'’.,!?%-]*|\s+|[\s\S]/g)||[];
 function wrapText(ctx,text,x,y,maxWidth,lineHeight){
  let line='';
  for(const piece of pieces(text)){
   const blank=!piece.trim();
   if(blank&&!line)continue;
   const next=line+piece;
   if(line&&ctx.measureText(next).width>maxWidth){ctx.fillText(line.trimEnd(),x,y);y+=lineHeight;line=blank?'':piece}
   else line=next;
  }
  if(line)ctx.fillText(line.trimEnd(),x,y);
  return y;
 }
 function offer(candidate){try{return typeof navigator.share==='function'&&!!navigator.canShare?.(candidate)?candidate:null}catch{return null}}
 function cleanup(){ticket++;if(url)URL.revokeObjectURL(url);url=null;file=null;payload=null;image.removeAttribute('src');download.removeAttribute('href');caption.hidden=true;}
 async function open(record){
  cleanup();const request=ticket;
  image.hidden=download.hidden=true;share.hidden=false;share.disabled=true;share.textContent=T('share.button');message.textContent=T('share.building');
  if(!dialog.open)dialog.showModal();
  try {
 const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;const c=canvas.getContext('2d');
 c.fillStyle='#e3efd6';c.fillRect(0,0,1080,1350);c.fillStyle='#fffdf2';c.beginPath();c.roundRect(65,65,950,1220,48);c.fill();
 c.textAlign='center';c.fillStyle='#3d6748';c.font='bold 30px "Noto Sans TC", sans-serif';c.fillText(T('card.header'),540,157);
 c.font='bold 67px "Noto Sans TC", sans-serif';c.fillText(T('card.title'),540,260);c.fillStyle='#e17d37';c.font='bold 44px "Noto Sans TC", sans-serif';wrapText(c,T('card.chef',{player:record.player}),540,365,800,59);
 c.fillStyle='#738463';c.font='32px "Noto Sans TC", sans-serif';c.fillText(modeName(record.mode)+(record.mode==='rush'&&!record.completed?T('card.practice'):''),540,525);
 c.fillStyle='#2f6046';c.font='bold 176px sans-serif';c.fillText(String(record.score),540,742);c.font='38px "Noto Sans TC", sans-serif';c.fillText(T('card.points'),540,813);
 c.strokeStyle='#d9e2cb';c.lineWidth=2;c.beginPath();c.moveTo(190,879);c.lineTo(890,879);c.stroke();c.font='32px "Noto Sans TC", sans-serif';wrapText(c,T('card.served',{served:record.served}),540,963,800,45);
 c.fillStyle='#85916f';c.font='26px "Noto Sans TC", sans-serif';c.fillText(T('card.cta'),540,1090);c.font='25px sans-serif';c.fillText(T('card.site'),540,1140);c.font='22px "Noto Sans TC", sans-serif';c.fillText(T('card.footer',{date:new Date(record.updatedAt).toLocaleDateString(T('card.locale'))}),540,1210);
 const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('canvas produced no image')),'image/png'));

   if(request!==ticket||!dialog.open)return;
   file=new File([blob],T('share.fileName'),{type:'image/png'});url=URL.createObjectURL(blob);image.src=url;image.hidden=false;download.href=url;download.hidden=false;
   const words=T('share.caption',{player:record.player,score:record.score})+'\n'+T('share.github'),link=T('share.url');
   captionText.textContent=words+'\n'+link;caption.hidden=false;
   // Some targets only take the file, so fall back rather than losing the share button.
   payload=offer({files:[file],text:words,url:link})||offer({files:[file]});
   share.hidden=!payload;share.disabled=!payload;
   message.textContent=T(payload?'share.ready':'share.readyNoMenu');
  }catch{if(request===ticket){share.hidden=true;message.textContent=T('share.failed')}}
 }
 share.onclick=async()=>{
  if(!payload||sharing)return;sharing=true;share.disabled=true;
  try {
   // The already-prepared file is passed synchronously from this explicit tap.
   await navigator.share(payload);
   message.textContent=T('share.sent');
  }catch(error){message.textContent=T(error.name==='AbortError'?'share.cancelled':'share.blocked');}
  finally{sharing=false;share.disabled=false;}
 };
 document.querySelector('#close-share').onclick=()=>dialog.close();
 dialog.addEventListener('close',cleanup);
 return {open};
})();
