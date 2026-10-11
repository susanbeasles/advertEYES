import {TourAuthority} from './tour-authority.ts';
import { createServer, type IncomingMessage } from 'node:http';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve, join, extname } from 'node:path';
import { Authority } from './authority.ts';
type Options = {
    dataDir: string;
    answerMs?: number;
    revealMs?: number;
    staticDir?: string;
    clock?: () => number;
    format?: 'legacy' | 'tour';
    breakMs?: number;
};
async function body(req: IncomingMessage) { let raw = ''; for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 4096)
        throw new Error('Request too large');
} return raw ? JSON.parse(raw) : {}; }
export function createApp(options: Options) {
    const sessions = new Map<string, Authority | TourAuthority>();
    return createServer(async (req, res) => {
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Referrer-Policy', 'no-referrer');
        res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'");
        const send = (status: number, data: unknown) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
        try {
            // Validate untrusted metadata inside the request error boundary.
            const host = req.headers.host;
            if (!host || /[\s/\\?#@]/.test(host)) throw new Error('Invalid Host header');
            const authority = new URL(`http://${host}`);
            if (!authority.hostname) throw new Error('Invalid Host header');
            const target = req.url ?? '/';
            if (!target.startsWith('/') || target.startsWith('//') || target.includes('\\')) {
                throw new Error('Invalid request target');
            }
            // Routing does not depend on client-controlled Host text.
            const path = new URL(target, 'http://localhost').pathname;
            if (path.startsWith('/api/')) {
                if (req.method === 'POST' && req.headers.origin && req.headers.origin !== `http://${req.headers.host}` && req.headers.origin !== `https://${req.headers.host}`) {
                    send(403, { error: 'Origin rejected' });
                    return;
                }
                let token = req.headers.cookie?.match(/(?:^|; )adverteyes=([a-f0-9]{48})(?:;|$)/)?.[1];
                if (path === '/api/start' && req.method === 'POST') {
                    token = randomBytes(24).toString('hex');
                    const id=randomBytes(8).toString('hex'), seed=randomBytes(4).readUInt32BE();
                    const race = options.format === 'tour'
                        ? new TourAuthority(join(options.dataDir, token + '.tour.json'), options.clock)
                        : new Authority(join(options.dataDir, token + '.jsonl'), options.clock);
                    if(race instanceof TourAuthority) race.start(id,seed,{answerMs:options.answerMs??15000,revealMs:options.revealMs??1500,breakMs:options.breakMs??60000});
                    else race.start(id,seed,{answerMs:options.answerMs??12000,revealMs:options.revealMs??3000});
                    sessions.set(token, race);
                    res.setHeader('Set-Cookie', `adverteyes=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400`);
                    send(200, race.snapshot());
                    return;
                }
                if (!token) {
                    send(404, { error: 'No active race' });
                    return;
                }
                let race = sessions.get(token);
                if (!race && existsSync(join(options.dataDir, token + '.tour.json'))) {
                    race = new TourAuthority(join(options.dataDir, token + '.tour.json'), options.clock);
                    sessions.set(token,race);
                }
                if (!race && existsSync(join(options.dataDir, token + '.jsonl'))) {
                    race = new Authority(join(options.dataDir, token + '.jsonl'), options.clock);
                    sessions.set(token, race);
                }
                if (!race) {
                    send(404, { error: 'No active race' });
                    return;
                }
                if (path === '/api/state' && req.method === 'GET') {
                    send(200, race.snapshot());
                    return;
                }
                if (path === '/api/answer' && req.method === 'POST') {
                    send(200, race.answer(await body(req)));
                    return;
                }
                if (path === '/api/item' && req.method === 'POST') {
                    const input = await body(req);
                    send(200, race.item(input.turn));
                    return;
                }
                if (path === '/api/replay' && req.method === 'GET') {
                    res.setHeader('Content-Disposition', 'attachment; filename="adverteyes-replay.json"');
                    send(200, race.replay());
                    return;
                }
                send(404, { error: 'Unknown route' });
                return;
            }
            if (req.method !== 'GET' && req.method !== 'HEAD') {
                send(405, { error: 'Method not allowed' });
                return;
            }
            const root = resolve(options.staticDir ?? 'dist');
            const file = resolve(root, '.' + (path === '/' ? '/index.html' : path));
            if (!file.startsWith(root + '/') || !existsSync(file) || !statSync(file).isFile()) {
                send(404, { error: 'Not found' });
                return;
            }
            const types: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
            // Finish filesystem work before committing successful response headers.
            const content = readFileSync(file);
            res.writeHead(200, {
                'Content-Type': types[extname(file)] ?? 'application/octet-stream',
                'Content-Length': content.length
            });
            res.end(req.method === 'HEAD' ? undefined : content);
        }
        catch (error) {
            if (res.destroyed || res.writableEnded) return;
            if (!res.headersSent) {
                send(400, { error: error instanceof Error ? error.message : 'Request failed' });
            } else {
                // A response already in flight cannot become a second JSON response.
                res.destroy();
            }
        }
    });
}
