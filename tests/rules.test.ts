import test from 'node:test';
import assert from 'node:assert/strict';
import { createRace, resolveTurn, project, rankPlayers } from '../src/domain/rules.ts';
import { questions } from '../src/domain/questions.ts';
test('thirty increasingly difficult questions have original visuals and valid keys', () => {
    assert.equal(questions.length, 30);
    questions.forEach((q, i) => {
        assert.equal(q.choices.length, 4);
        assert.ok(q.answer >= 0 && q.answer < 4);
        assert.ok(q.visual && q.alt && q.explanation);
        if (i)
            assert.ok(q.difficulty >= questions[i - 1].difficulty);
    });
});
test('equal correct answers gain equal progress, all contestants finish all 30 turns', () => {
    let state = createRace('test', 8);
    for (let i = 0; i < 30; i++) {
        state = resolveTurn(state, [{ playerId: 'you', choice: questions[i].answer }], []);
        assert.equal(state.players[0].correct, i + 1);
        assert.equal(state.players[0].progress, (i + 1) * 10);
    }
    assert.equal(state.turn, 30);
    assert.equal(state.players.length, 17);
    assert.throws(() => resolveTurn(state, [], []), /finished/);
});
test('correct cumulative answers grant every four, overflow is explicit', () => {
    let s = createRace('a', 8);
    for (let i = 0; i < 12; i++)
        s = resolveTurn(s, [{ playerId: 'you', choice: questions[i].answer }], []);
    assert.ok(s.players[0].item);
    assert.ok(s.players[0].queuedItem);
    assert.equal(s.players[0].expiredGrants, 1);
});
test('wrong and absent answers award no progress or items', () => {
    let s = createRace('a', 9);
    for (let i = 0; i < 5; i++)
        s = resolveTurn(s, [], []);
    assert.equal(s.players[0].progress, 0);
    assert.equal(s.players[0].item, null);
});
test('deterministic replay has byte-identical state', () => {
    const run = () => { let s = createRace('a', 42); for (let i = 0; i < 30; i++)
        s = resolveTurn(s, [{ playerId: 'you', choice: i % 4 }], []); return s; };
    assert.deepEqual(run(), run());
});
test('blackout projection omits ranks and opponent state, never leaks future keys', () => {
    let s = createRace('a', 9);
    for (let i = 0; i < 15; i++)
        s = resolveTurn(s, [], []);
    const visible = project(s, false);
    assert.equal(visible.blackout, true);
    assert.equal(visible.standings, null);
    assert.equal(visible.rank, null);
    assert.equal('answer' in visible.question!, false);
    assert.equal('explanation' in visible.question!, false);
});
test('shared ties use competition rank, no speed tiebreak', () => {
    const s = createRace('a', 1);
    const rows = rankPlayers(s.players);
    assert.ok(rows.every(p => p.rank === 1));
});
test('item disruption never blocks answers and a spent item cannot be reused', () => {
    let s = createRace('a', 5);
    s.players[0].item = 'pulse';
    s.players[1].progress = 40;
    s = resolveTurn(s, [{ playerId: 'you', choice: questions[0].answer }], [{ playerId: 'you' }]);
    assert.equal(s.players[0].progress, 10);
    assert.equal(s.players[0].item, null);
    assert.ok(s.effects.some(e => e.actor === 'you'));
    s = resolveTurn(s, [], [{ playerId: 'you' }]);
    assert.ok(!s.effects.some(e => e.actor === 'you'));
});
test('Echo hits the nearest rival behind, never the furthest trailing rival', () => {
 const s=createRace('rear',1);s.players[0].progress=30;s.players[0].item='echo';s.players[1].progress=20;s.players[2].progress=10;
 const next=resolveTurn(s,[],[{playerId:'you'}]);assert.equal(next.effects[0].target,'sim1');
});
test('duplicate item intents cannot spend the reserve in the same turn', () => {
 const s=createRace('single',1);s.players[0].progress=30;s.players[0].item='echo';s.players[0].queuedItem='pulse';s.players[1].progress=20;s.players[2].progress=40;
 const next=resolveTurn(s,[],[{playerId:'you'},{playerId:'you'}]);assert.equal(next.effects.filter(e=>e.actor==='you').length,1);assert.equal(next.players[0].item,'pulse');
});
