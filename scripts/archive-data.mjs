import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {compileArchive} from './archive-model.mjs';
export async function loadArchive(sourceDir='data') {
 const entries=await Promise.all(['people','events','talks','articles'].map(async name=>[name,JSON.parse(await readFile(join(sourceDir,`${name}.json`),'utf8'))]));
 return compileArchive(Object.fromEntries(entries));
}
export async function generateArchive({sourceDir='data',outputDir='site/assets/data'}={}) {
 // Validate the complete graph before touching generated outputs. Sources are read-only.
 const result=await loadArchive(sourceDir);await mkdir(outputDir,{recursive:true});
 for(const [name,data] of [['talks',result.eventsData],['people',result.peopleData]])await writeFile(join(outputDir,`${name}.json`),JSON.stringify(data,null,2)+'\n');
 console.log(`Built ${result.peopleData.people.length} profiles, ${result.eventsData.sourceCount} events, ${result.eventsData.talkCount} talks, ${result.posts.length} local articles and ${result.eventsData.mediaCoverage.videos} video links.`);
 return result;
}
