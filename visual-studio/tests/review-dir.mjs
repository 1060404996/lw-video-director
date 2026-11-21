import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';

export const studioRoot = fileURLToPath(new URL('../', import.meta.url));
export const reviewDir = path.resolve(studioRoot, process.env.LW_REVIEW_DIR || 'test-results/review');
fs.mkdirSync(reviewDir, {recursive:true});
