import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldApplySnapshot } from '../src/web/client-state.ts';
test('an in-flight response from a previous race cannot replace the new race', () => {
    assert.equal(shouldApplySnapshot({ id: 'new', version: 1, activeTurn: 0, phase: 'answer' }, { id: 'old', version: 80, activeTurn: 0, phase: 'answer' }, 0, 1), false);
});
test('a stale snapshot cannot erase an accepted receipt even in the same millisecond', () => {
    assert.equal(shouldApplySnapshot({ id: 'same', version: 5, activeTurn: 0, phase: 'answer' }, { id: 'same', version: 4, activeTurn: 0, phase: 'answer' }, 1, 1), false);
    assert.equal(shouldApplySnapshot({ id: 'same', version: 5, activeTurn: 0, phase: 'answer' }, { id: 'same', version: 6, activeTurn: 0, phase: 'answer' }, 1, 1), true);
});

test('same-version reveal to next-answer transition advances but cannot rewind', () => {
    const reveal = {id:'race',version:2,activeTurn:0,phase:'reveal' as const};
    const answer = {id:'race',version:2,activeTurn:1,phase:'answer' as const};
    assert.equal(shouldApplySnapshot(reveal,answer,1,1),true);
    assert.equal(shouldApplySnapshot(answer,reveal,1,1),false);
});
test('same-version final reveal to finished transition advances but cannot rewind', () => {
    const reveal = {id:'race',version:31,activeTurn:29,phase:'reveal' as const};
    const finished = {id:'race',version:31,activeTurn:29,phase:'finished' as const};
    assert.equal(shouldApplySnapshot(reveal,finished,1,1),true);
    assert.equal(shouldApplySnapshot(finished,reveal,1,1),false);
});

test('actual authority snapshots progress across non-journaled turn and finish boundaries', async () => {
    const {Authority}=await import('../src/server/authority.ts');
    const {mkdtempSync,rmSync}=await import('node:fs');
    const {tmpdir}=await import('node:os');
    const {join}=await import('node:path');
    const dir=mkdtempSync(join(tmpdir(),'adverteyes-order-'));let now=1000;
    try {
        const authority=new Authority(join(dir,'race.jsonl'),()=>now);
        authority.start('ordering',1,{answerMs:100,revealMs:20});
        now=1100;const firstReveal=authority.snapshot();
        now=1120;const secondAnswer=authority.snapshot();
        assert.equal(firstReveal.version,secondAnswer.version);
        assert.equal(shouldApplySnapshot(firstReveal,secondAnswer,1,1),true);
        assert.equal(shouldApplySnapshot(secondAnswer,firstReveal,1,1),false);
        now=4580;const finalReveal=authority.snapshot();
        now=4600;const finished=authority.snapshot();
        assert.equal(finalReveal.version,finished.version);
        assert.equal(shouldApplySnapshot(finalReveal,finished,1,1),true);
        assert.equal(shouldApplySnapshot(finished,finalReveal,1,1),false);
    } finally {rmSync(dir,{recursive:true,force:true});}
});
