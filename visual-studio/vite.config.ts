import {defineConfig} from 'vite';
export default defineConfig({server:{watch:{ignored:['**/.cache/**','**/exports/**','**/test-results/**','**/evidence/**']}},build:{chunkSizeWarningLimit:1600}});
