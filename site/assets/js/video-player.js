import { videoId } from './archive-view.js';
let apiPromise;
function loadAPI() {
  if(globalThis.YT?.Player)return Promise.resolve(globalThis.YT);
  return apiPromise ||= new Promise((resolve,reject)=>{
    const prior=globalThis.onYouTubeIframeAPIReady;
    globalThis.onYouTubeIframeAPIReady=()=>{prior?.();resolve(globalThis.YT);};
    const script=document.createElement('script');
    script.src='https://www.youtube.com/iframe_api';
    script.onerror=()=>{apiPromise=null;script.remove();reject(new Error('API unavailable'));};
    document.head.append(script);
  });
}
// No network activity until a deliberate play action. Removing the frame stops all media.
export function attachPlayer(root,video,{autoplay=false,reduced=false}={}) {
  const screen=root.querySelector('#tv-screen'),status=root.querySelector('#player-status');
  root.classList.add('player-enhanced');
  let iframe,player,disposed=false,timer;
  const setStatus=(state,text)=>{if(disposed)return;screen.dataset.playerState=state;status.textContent=text;};
  function play() {
    if(iframe||disposed)return;
    const id=videoId(video);
    if(!/^[\w-]{11}$/.test(id))return;
    const src=new URL(`https://www.youtube-nocookie.com/embed/${id}`);
    for(const [k,v] of Object.entries({autoplay:'1',playsinline:'1',enablejsapi:'1',origin:location.origin,rel:'0'}))src.searchParams.set(k,v);
    iframe=document.createElement('iframe');
    iframe.id='tv-youtube-player';iframe.title=`YouTube: ${video.title}`;
    iframe.src=src.href;iframe.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.allowFullscreen=true;iframe.referrerPolicy='strict-origin-when-cross-origin';
    iframe.addEventListener('load',()=>{
      if(disposed)return;
      screen.dataset.frameLoaded='true';
      if(!['playing','error'].includes(screen.dataset.playerState))setStatus('frame-loaded','Reproductor cargado. Si no comienza, pulsa reproducir en la pantalla.');
    });
    screen.replaceChildren(iframe);
    setStatus('loading','Encendiendo la TV… YouTube puede solicitar que pulses reproducir.');
    if(!reduced)screen.animate([{opacity:.2,transform:'scale(.98)'},{opacity:1,transform:'none'}],{duration:220,easing:'ease-out'});
    timer=setTimeout(()=>{if(!disposed&&!['playing','error'].includes(screen.dataset.playerState))setStatus('waiting','Si la pantalla no reproduce el video, usa los controles de YouTube en la pantalla.');},12000);
    loadAPI().then(YT=>{
      if(disposed||!iframe?.isConnected)return;
      player=new YT.Player(iframe,{events:{
        onReady:()=>{if(!disposed){screen.dataset.apiReady='true';player.playVideo();}},
        onStateChange:event=>{if(event.data===1)setStatus('playing','Reproduciendo en YouTube.');else if(event.data===2)setStatus('paused','Reproducción en pausa.');else if(event.data===0)setStatus('ended','La grabación terminó.');},
        onAutoplayBlocked:()=>setStatus('autoplay-blocked','Pulsa reproducir en la pantalla: el navegador bloqueó el inicio automático.'),
        onError:event=>setStatus('error',`YouTube no permite reproducir aquí esta grabación (código ${event.data}). Puedes abrir YouTube desde los controles del reproductor.`),
      }});
    }).catch(()=>setStatus('unavailable','No se pudo conectar con los controles de YouTube. Usa los controles del reproductor.'));
  }
  const button=root.querySelector('[data-play-video]');
  if(button){button.hidden=false;button.addEventListener('click',play);}
  if(autoplay)play();
  return ()=>{disposed=true;clearTimeout(timer);try{player?.destroy();}catch{}iframe?.remove();screen.replaceChildren();};
}
