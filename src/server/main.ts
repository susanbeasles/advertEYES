import { createApp } from './http.ts';
const port = Number(process.env.PORT ?? 4173);
const server = createApp({ dataDir: process.env.DATA_DIR ?? '.data', format: 'tour' });
server.listen(port, '127.0.0.1', () => console.log(`AdvertEYES local practice: http://127.0.0.1:${port}`));
