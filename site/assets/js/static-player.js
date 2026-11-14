import { attachPlayer } from './video-player.js';
const root=document.querySelector('[data-static-video]');
if(root){
  const video=JSON.parse(root.dataset.staticVideo);
  const stop=attachPlayer(root,video,{reduced:matchMedia('(prefers-reduced-motion: reduce)').matches});
  addEventListener('pagehide',stop,{once:true});
  addEventListener('keydown',e=>{if(e.key==='Escape')location.href=document.querySelector('.archive-close').href;});
}
