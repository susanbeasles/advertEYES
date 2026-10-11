import { questions, type Question } from './questions.ts';
export type Item = 'pulse' | 'echo' | 'surge';
export type Player = {
    id: string;
    name: string;
    progress: number;
    correct: number;
    item: Item | null;
    queuedItem: Item | null;
    expiredGrants: number;
};
export type Effect = {
    actor: string;
    target: string;
    item: Item;
    amount: number;
};
export type RaceState = {
    id: string;
    seed: number;
    turn: number;
    players: Player[];
    effects: Effect[];
    lastAnswers: Record<string, boolean>;
    milestones: number[];
};
export type Answer = {
    playerId: string;
    choice: number;
};
export type Intent = {
    playerId: string;
};
const names = ['NOVA', 'ATLAS', 'LUMEN', 'ORBIT', 'SAGE', 'EMBER', 'FLUX', 'INDIGO', 'SOL', 'VERVE', 'ECHO', 'MICA', 'ONYX', 'LYRA', 'PRISM', 'ZEN'];
export function createRace(id: string, seed: number): RaceState {
    return { id, seed, turn: 0, players: ['YOU', ...names].map((name, i) => ({ id: i ? `sim${i}` : 'you', name, progress: 0, correct: 0, item: null, queuedItem: null, expiredGrants: 0 })), effects: [], lastAnswers: {}, milestones: [] };
}
export function random(seed: number, turn: number, player: number): number {
    let x = (seed ^ Math.imul(turn + 1, 374761393) ^ Math.imul(player + 1, 668265263)) >>> 0;
    x = Math.imul(x ^ (x >>> 13), 1274126177);
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}
export function rankPlayers(players: Player[]) {
    return [...players].sort((a, b) => b.progress - a.progress || a.id.localeCompare(b.id)).map(p => ({ ...p, rank: 1 + players.filter(other => other.progress > p.progress).length }));
}
function grant(p: Player, item: Item) { if (!p.item)
    p.item = item;
else if (!p.queuedItem)
    p.queuedItem = item;
else
    p.expiredGrants++; }
export function resolveTurn(before: RaceState, answers: Answer[], intents: Intent[], bank: Question[] = questions): RaceState {
    if (before.turn >= bank.length)
        throw new Error('Race finished');
    const s = structuredClone(before);
    s.effects = [];
    s.lastAnswers = {};
    const q = bank[s.turn];
    // Targets derive only from the preceding settled snapshot; never arrival order.
    const order = rankPlayers(before.players);
    const usedActors = new Set<string>();
    for (const intent of [...intents].sort((a, b) => a.playerId.localeCompare(b.playerId))) {
        if (usedActors.has(intent.playerId)) continue;
        usedActors.add(intent.playerId);
        const p = s.players.find(p => p.id === intent.playerId);
        if (!p?.item)
            continue;
        const prior = before.players.find(x => x.id === p.id)!;
        const targets = p.item === 'echo' ? order.filter(x => x.progress < prior.progress) : p.item === 'surge' ? order.filter(x => x.progress === order[0].progress && x.id !== p.id) : order.filter(x => x.progress > prior.progress).reverse();
        if (!targets.length)
            continue;
        const selected = p.item === 'surge' ? targets : targets.slice(0, 1);
        for (const t of selected) {
            const target = s.players.find(x => x.id === t.id)!;
            const amount = Math.min(target.progress, p.item === 'surge' ? 8 : 6);
            target.progress -= amount;
            s.effects.push({ actor: p.id, target: t.id, item: p.item, amount });
        }
        p.item = p.queuedItem;
        p.queuedItem = null;
    }
    s.players.forEach((p, i) => {
        const correct = i === 0 ? answers.find(a => a.playerId === p.id)?.choice === q.answer : random(s.seed, s.turn, i) < Math.max(.22, .99 - q.difficulty * .105 + (i % 4) * .025);
        s.lastAnswers[p.id] = correct;
        if (correct) {
            p.correct++;
            p.progress += 10;
            if (p.correct % 4 === 0)
                grant(p, (['pulse', 'echo', 'pulse'] as Item[])[Math.floor(random(s.seed, s.turn, i + 21) * 3)]);
        }
    });
    const leader = Math.max(...s.players.map(p => p.progress));
    for (const checkpoint of [bank.length * 10 * .25, bank.length * 10 * .55])
        if (leader >= checkpoint && !s.milestones.includes(checkpoint)) {
            s.milestones.push(checkpoint);
            // Earned opportunities only: a correct trailing player receives the special item.
            const trailing = rankPlayers(s.players).reverse().find(p => s.lastAnswers[p.id]);
            if (trailing)
                grant(s.players.find(p => p.id === trailing.id)!, 'surge');
        }
    s.turn++;
    return s;
}
export function project(s: RaceState, reveal: boolean, bank: Question[] = questions) {
    const finished = s.turn >= bank.length;
    const blackout = !finished && (bank.length === 10 ? (s.turn >= 5 && s.turn < 7) || (s.turn >= 8 && s.turn < 9) : (s.turn >= 15 && s.turn < 19) || (s.turn >= 23 && s.turn < 27));
    const index = reveal ? Math.max(0, s.turn - 1) : s.turn;
    const q = bank[index];
    const safeQuestion = q ? { id: q.id, category: q.category, difficulty: q.difficulty, prompt: q.prompt, visual: q.visual, alt: q.alt, choices: q.choices } : null;
    const own = s.players[0];
    return { id: s.id, turn: s.turn, total: bank.length, finished, blackout, own: { ...own }, rank: blackout ? null : rankPlayers(s.players).find(p => p.id === 'you')!.rank, standings: blackout ? null : rankPlayers(s.players).map(({ id, name, progress, rank }) => ({ id, name, progress, rank })), question: safeQuestion, result: reveal && q ? { correct: s.lastAnswers.you, answer: q.answer, explanation: q.explanation } : null, effects: blackout ? [] : s.effects, simulatedRivals: 16 };
}
