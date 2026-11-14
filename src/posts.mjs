// Compatibility adapter. Article content and authors are edited only in data/articles.json.
import {loadArchive} from '../scripts/archive-data.mjs';
export const {posts}=await loadArchive();
