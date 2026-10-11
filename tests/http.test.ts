import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../src/server/http.ts';
test('HTTP isolates sessions, rejects cross-origin mutations and never serves source', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'adverteyes-http-'));
    const server = createApp({ dataDir: dir, answerMs: 500, revealMs: 100 });
    await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const base = `http://127.0.0.1:${address.port}`;
    try {
        const start = await fetch(base + '/api/start', { method: 'POST' });
        assert.equal(start.status, 200);
        const cookie = start.headers.get('set-cookie')!.split(';')[0];
        const state = await start.json();
        assert.equal(state.turn, 0);
        const missing = await fetch(base + '/api/state');
        assert.equal(missing.status, 404);
        const own = await fetch(base + '/api/state', { headers: { cookie } });
        assert.equal(own.status, 200);
        const foreign = await fetch(base + '/api/answer', { method: 'POST', headers: { cookie, origin: 'https://evil.example', 'content-type': 'application/json' }, body: JSON.stringify({ turn: 0, choice: 1, revision: 1, attemptId: 'a' }) });
        assert.equal(foreign.status, 403);
        const code = await fetch(base + '/src/domain/questions.ts');
        assert.equal(code.status, 404);
        const good = await fetch(base + '/api/answer', { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ turn: 0, choice: 1, revision: 1, attemptId: 'a' }) });
        assert.equal(good.status, 200);
    }
    finally {
        await new Promise<void>(r => server.close(() => r()));
        rmSync(dir, { recursive: true, force: true });
    }
});
test('complete 30-question HTTP race survives authority restart and replays identically', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'adverteyes-full-'));
    let now = 1000;
    let server = createApp({ dataDir: dir, answerMs: 100, revealMs: 20, clock: () => now });
    async function listen() { await new Promise<void>(r => server.listen(0, '127.0.0.1', r)); const address = server.address(); assert.ok(address && typeof address !== 'string'); return `http://127.0.0.1:${address.port}`; }
    let base = await listen();
    try {
        const start = await fetch(base + '/api/start', { method: 'POST' });
        const cookie = start.headers.get('set-cookie')!.split(';')[0];
        const headers = { cookie, 'content-type': 'application/json' };
        const { questions } = await import('../src/domain/questions.ts');
        for (let i = 0; i < 30; i++) {
            now = 1000 + i * 120;
            const response = await fetch(base + '/api/answer', { method: 'POST', headers, body: JSON.stringify({ turn: i, choice: questions[i].answer, revision: i + 1, attemptId: `full${i}` }) });
            assert.equal(response.status, 200);
            if (i === 10) {
                await new Promise<void>(r => server.close(() => r()));
                server = createApp({ dataDir: dir, answerMs: 100, revealMs: 20, clock: () => now });
                base = await listen();
                const recovered = await (await fetch(base + '/api/state', { headers })).json();
                assert.equal(recovered.receipt.attemptId, 'full10');
            }
            now = 1100 + i * 120;
            const state = await (await fetch(base + '/api/state', { headers })).json();
            assert.equal(state.own.correct, i + 1);
            if (state.blackout) {
                assert.equal(state.standings, null);
                assert.equal(state.rank, null);
                assert.deepEqual(state.effects, []);
            }
        }
        now = 4600;
        const final = await (await fetch(base + '/api/state', { headers })).json();
        assert.equal(final.phase, 'finished');
        assert.equal(final.own.correct, 30);
        const replay = await (await fetch(base + '/api/replay', { headers })).json();
        assert.equal(replay.resultHash, final.resultHash);
        assert.equal(replay.state.turn, 30);
        assert.equal(replay.events.filter((e: {
            type: string;
        }) => e.type === 'resolve').length, 30);
    }
    finally {
        await new Promise<void>(r => server.close(() => r()));
        rmSync(dir, { recursive: true, force: true });
    }
});

test('malformed Host gets 400 and a subsequent valid request survives in the same process', async () => {
    const {spawn} = await import('node:child_process');
    const {once} = await import('node:events');
    const {request} = await import('node:http');
    const dir = mkdtempSync(join(tmpdir(),'adverteyes-host-'));
    const script = `import {createApp} from './src/server/http.ts'; const server=createApp({dataDir:${JSON.stringify(dir)}});server.listen(0,'127.0.0.1',()=>console.log(server.address().port));`;
    const child = spawn(process.execPath,['--experimental-strip-types','--input-type=module','-e',script],{stdio:['ignore','pipe','pipe']});
    let stderr='';child.stderr.on('data',chunk=>{stderr+=chunk;});
    try {
        const [data]=await once(child.stdout,'data');
        const port=Number(String(data).trim());assert.ok(port>0);
        const badStatus=await new Promise<number|undefined>((resolve,reject)=>{
            const req=request({hostname:'127.0.0.1',port,path:'/api/start',method:'POST',headers:{Host:'['}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});
            req.on('error',reject);req.end();
        });
        assert.equal(badStatus,400,stderr);
        const good=await fetch(`http://127.0.0.1:${port}/api/start`,{method:'POST'});
        assert.equal(good.status,200,stderr);
        assert.equal(child.exitCode,null,stderr);
    } finally {
        if(child.exitCode===null&&child.signalCode===null){child.kill();await once(child,'exit');}
        rmSync(dir,{recursive:true,force:true});
    }
});

test('GET and HEAD directories are rejected and the same server process remains usable', async () => {
    const {spawn}=await import('node:child_process');
    const {once}=await import('node:events');
    const {mkdirSync,writeFileSync}=await import('node:fs');
    const dir=mkdtempSync(join(tmpdir(),'adverteyes-static-'));
    mkdirSync(join(dir,'assets'));
    writeFileSync(join(dir,'index.html'),'<!doctype html><title>Safe static fixture</title>');
    const script=`import {createApp} from './src/server/http.ts';const server=createApp({dataDir:${JSON.stringify(join(dir,'data'))},staticDir:${JSON.stringify(dir)}});server.listen(0,'127.0.0.1',()=>console.log(server.address().port));`;
    const child=spawn(process.execPath,['--experimental-strip-types','--input-type=module','-e',script],{stdio:['ignore','pipe','pipe']});
    let stderr='';child.stderr.on('data',chunk=>{stderr+=chunk;});
    try {
        const [data]=await once(child.stdout,'data');
        const base=`http://127.0.0.1:${Number(String(data).trim())}`;
        for(const method of ['GET','HEAD']){
            const directory=await fetch(base+'/assets',{method});
            assert.equal(directory.status,404,stderr);
            if(method==='HEAD')assert.equal(await directory.text(),'');
            const valid=await fetch(base+'/');
            assert.equal(valid.status,200,stderr);
            assert.match(await valid.text(),/Safe static fixture/);
            assert.equal(child.exitCode,null,stderr);
        }
    } finally {
        if(child.exitCode===null&&child.signalCode===null){child.kill();await once(child,'exit');}
        rmSync(dir,{recursive:true,force:true});
    }
});
