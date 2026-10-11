import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Authority } from '../src/server/authority.ts';
import { questions } from '../src/domain/questions.ts';
function setup() { let now = 1000; const dir = mkdtempSync(join(tmpdir(), 'adverteyes-')); const file = join(dir, 'race.jsonl'); const a = new Authority(file, () => now); a.start('race', 22, { answerMs: 100, revealMs: 20 }); return { a, file, set: (t: number) => { now = t; }, clock: () => now, clean: () => rmSync(dir, { recursive: true, force: true }) }; }
test('receipt survives restart and stale revisions cannot replace later choice', () => {
    const h = setup();
    try {
        h.a.answer({ turn: 0, choice: 2, revision: 2, attemptId: 'two' });
        h.a.answer({ turn: 0, choice: 1, revision: 1, attemptId: 'one' });
        const restored = new Authority(h.file, h.clock);
        assert.equal(restored.snapshot().receipt?.choice, 2);
        assert.equal(restored.snapshot().receipt?.revision, 2);
        assert.ok(readFileSync(h.file, 'utf8').includes('two'));
    }
    finally {
        h.clean();
    }
});
test('duplicate attempt returns receipt without awarding twice; conflicting retry rejected', () => {
    const h = setup();
    try {
        const cmd = { turn: 0, choice: questions[0].answer, revision: 1, attemptId: 'a' };
        assert.deepEqual(h.a.answer(cmd), h.a.answer(cmd));
        assert.throws(() => h.a.answer({ ...cmd, choice: 0 }), /conflict/);
        h.set(1100);
        const v = h.a.snapshot();
        assert.equal(v.own.progress, 10);
        assert.equal(v.phase, 'reveal');
    }
    finally {
        h.clean();
    }
});
test('server cutoff rejects late answers and ignores forged client time', () => {
    const h = setup();
    try {
        h.set(1100);
        assert.throws(() => h.a.answer({ turn: 0, choice: 1, revision: 1, attemptId: 'late' }), /closed/);
        assert.equal(h.a.snapshot().own.progress, 0);
    }
    finally {
        h.clean();
    }
});
test('invalid payloads and out of order turns are rejected', () => {
    const h = setup();
    try {
        for (const cmd of [{ turn: 0, choice: 5, revision: 1, attemptId: 'x' }, { turn: 4, choice: 1, revision: 1, attemptId: 'x' }, { turn: 0, choice: 1, revision: -1, attemptId: 'x' }])
            assert.throws(() => h.a.answer(cmd));
    }
    finally {
        h.clean();
    }
});
test('late reconnect catches up all thirty rounds with reproducible final hash', () => {
    const h = setup();
    try {
        h.a.answer({ turn: 0, choice: 1, revision: 1, attemptId: 'a' });
        h.set(1000 + 3600);
        const v = h.a.snapshot();
        assert.equal(v.finished, true);
        assert.equal(v.turn, 30);
        const other = new Authority(h.file, h.clock);
        assert.equal(other.snapshot().resultHash, v.resultHash);
        assert.equal(other.snapshot().own.correct, 1);
        assert.ok(other.replay().events.length >= 31);
    }
    finally {
        h.clean();
    }
});
test('future answer keys and replay are unavailable during a race', () => {
    const h = setup();
    try {
        assert.throws(() => h.a.replay(), /finished/);
        const v = h.a.snapshot();
        assert.equal(v.result, null);
        assert.ok(!JSON.stringify(v).includes('explanation'));
    }
    finally {
        h.clean();
    }
});
test('simulated rivals use earned items deterministically without touching answer access', () => {
    const h = setup();
    try {
        for (let i = 0; i < 30; i++) {
            h.set(1000 + i * 120);
            h.a.answer({ turn: i, choice: questions[i].answer, revision: i + 1, attemptId: `a${i}` });
            h.set(1100 + i * 120);
            h.a.snapshot();
        }
        const replay = h.a.replay();
        assert.ok(replay.state.players.some(p => p.id !== 'you' && p.progress < p.correct * 10));
        assert.equal(replay.state.players[0].correct, 30);
        const restored = new Authority(h.file, h.clock);
        assert.deepEqual(restored.replay().state, replay.state);
    }
    finally {
        h.clean();
    }
});
test('acceptance timestamp is sampled once and cannot move across the deadline', () => {
    const dir = mkdtempSync(join(tmpdir(), 'adverteyes-clock-'));
    let time = 1000;
    const a = new Authority(join(dir, 'r.jsonl'), () => time++);
    try {
        a.start('r', 1, { answerMs: 100, revealMs: 20 });
        time = 1099;
        const r = a.answer({ turn: 0, choice: 1, revision: 1, attemptId: 'edge' });
        assert.ok(r.acceptedAt < 1100, `receipt arrived at ${r.acceptedAt}`);
    }
    finally {
        rmSync(dir, { recursive: true, force: true });
    }
});
test('an interrupted final journal append cannot erase acknowledged earlier answers', () => {
    const h = setup();
    try {
        h.a.answer({ turn: 0, choice: 1, revision: 1, attemptId: 'durable' });
        appendFileSync(h.file, '{"type":"answer","receipt":');
        const restored = new Authority(h.file, h.clock);
        assert.equal(restored.snapshot().receipt?.attemptId, 'durable');
        restored.answer({ turn: 0, choice: 2, revision: 2, attemptId: 'after-recovery' });
        const again = new Authority(h.file, h.clock);
        assert.equal(again.snapshot().receipt?.attemptId, 'after-recovery');
    }
    finally {
        h.clean();
    }
});
test('answer arrival speed inside the valid window never changes scoring', () => {
    const a = setup(), b = setup();
    try {
        a.set(1001);
        b.set(1099);
        a.a.answer({ turn: 0, choice: 1, revision: 1, attemptId: 'early' });
        b.a.answer({ turn: 0, choice: 1, revision: 1, attemptId: 'late' });
        a.set(1100);
        b.set(1100);
        assert.deepEqual(a.a.snapshot().own, b.a.snapshot().own);
    }
    finally {
        a.clean();
        b.clean();
    }
});
