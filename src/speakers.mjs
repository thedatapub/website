import { mkdir,readFile,writeFile } from 'node:fs/promises';
import { renderArchive,yearsFor,PAGE_SIZE,eventVideos,videoId,escapeHtml,editionLabel } from '../site/assets/js/archive-view.js';
import { renderPeople,peopleYears,peopleForYear } from '../site/assets/js/people-view.js';
export async function buildSpeakers(head) {
  const data=JSON.parse(await readFile('site/assets/data/talks.json','utf8'));
  const people=JSON.parse(await readFile('site/assets/data/people.json','utf8'));
  const routes=[{path:'speakers',kind:'speakers',route:{}},{path:'tv',kind:'tv',route:{}}];
  for(const year of peopleYears(people))for(let page=1;page<=Math.ceil(peopleForYear(people,year).length/PAGE_SIZE);page++)routes.push({path:`speakers/${year}/${page}`,kind:'speakers',route:{year,page}});
  for(const p of people.people)for(const id of [p.id,...(p.previousIds||[])])routes.push({path:`speakers/person/${id}`,kind:'speakers',route:{id:p.id}});
  for(const year of yearsFor(data))for(let page=1;page<=Math.ceil(data.events.filter(e=>e.year===year).length/PAGE_SIZE);page++)routes.push({path:`tv/${year}/${page}`,kind:'tv',route:{year,page}});
  for(const e of data.events) {
    routes.push({path:`tv/event/${e.id}`,kind:'tv',route:{id:e.id}});
    // Historical event/session paths stay functional, but render the TV collection.
    routes.push({path:`speakers/event/${e.id}`,kind:'tv',route:{id:e.id}});
    for(const t of e.talks)routes.push({path:`speakers/talk/${t.id}`,kind:'tv',route:{id:e.id}});
    for(const v of eventVideos(e))routes.push({path:`tv/watch/${e.id}/${videoId(v)}`,kind:'tv',route:{id:e.id,video:videoId(v)},video:v});
  }
  const manifestPath='site/speakers/generated-routes.json';
  let previous=[];try{previous=JSON.parse(await readFile(manifestPath,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
  for(const path of previous){
    if(!/^(?:speakers|tv)(?:\/(?:\d{4}\/\d+|(?:talk|event|person)\/[a-z0-9]+(?:-[a-z0-9]+)*|watch\/[a-z0-9]+(?:-[a-z0-9]+)*\/[\w-]{11}))?$/.test(path))throw Error('Invalid generated path');
    const match=/^speakers\/(\d{4})\/(\d+)$/.exec(path);
    if(match&&!routes.some(r=>r.path===path))routes.push({path,kind:'speakers',route:{year:Number(match[1]),page:Number(match[2])}});
  }
  for(const {path,kind,route,video} of routes) {
    const prefix='../'.repeat(path.split('/').length),isPerson=kind==='speakers';
    const body=isPerson?renderPeople(people,data,route,{standalone:true,prefix}):renderArchive(data,route,{standalone:true,prefix});
    const title=video?editionLabel(data.events.find(e=>e.id===route.id).date):`${isPerson?'Speakers · Reconocimientos':'TV · Archivo de encuentros'} · The Data Pub`;
    await mkdir(`site/${path}`,{recursive:true});
    await writeFile(`site/${path}/index.html`,`${head(title,prefix,isPerson?'Las personas que comparten su conocimiento en The Data Pub.':'Una cinta por encuentro, con su programa y grabaciones disponibles.').replace('</head>',`<link rel="stylesheet" href="${prefix}assets/archive.css">${isPerson&&route.id?`<link rel="canonical" href="${prefix}speakers/person/${route.id}/">`:''}</head>`)}<body class="archive-standalone"><a class="skip-link" href="#archive-title">Ir al archivo</a><main class="archive-page" ${video?`data-static-video="${escapeHtml(JSON.stringify(video))}"`:''}>${body}</main>${video?`<script type="module" src="${prefix}assets/js/static-player.js"></script>`:''}</body></html>`);
  }
  await writeFile(manifestPath,JSON.stringify(routes.map(r=>r.path),null,2)+'\n');
  console.log(`Built ${routes.length} collection routes: ${people.people.length} person records and ${data.events.length} tapes; legacy event URLs retained.`);
}
