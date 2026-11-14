// Compatibility entry point: rebuild all joins from normalized sources, never overwrite them.
import {parseArgs} from 'node:util';
import {generateArchive} from './archive-data.mjs';
const {values}=parseArgs({options:{'source-dir':{type:'string',default:'data'},'output-dir':{type:'string',default:'site/assets/data'}}});
await generateArchive({sourceDir:values['source-dir'],outputDir:values['output-dir']});
