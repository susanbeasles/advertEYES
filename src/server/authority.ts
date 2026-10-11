import {questions, type Question} from '../domain/questions.ts';
import {packById, contentSources, type WorldQuestion} from '../domain/world-packs.ts';
import { existsSync, readFileSync, openSync, writeFileSync, fsyncSync, closeSync, mkdirSync, truncateSync } from 'node:fs';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { createRace, resolveTurn, project, random, type RaceState } from '../domain/rules.ts';
export type Timing = {
    answerMs: number;
    revealMs: number;
};
export type Command = {
    turn: number;
    choice: number;
    revision: number;
    attemptId: string;
};
export type Receipt = Command & {
    acceptedAt: number;
};
type Event = {
    type: 'start';
    id: string;
    seed: number;
    at: number;
    timing: Timing;
    packId?: string;
} | {
    type: 'answer';
    receipt: Receipt;
} | {
    type: 'item';
    turn: number;
} | {
    type: 'resolve';
    turn: number;
};
export class Authority {
    private state: RaceState | null = null;
    private bank: Question[] = questions;
    private packId: string | undefined;
    private timing: Timing = { answerMs: 12000, revealMs: 3000 };
    private startAt = 0;
    private receipts = new Map<string, Receipt>();
    private canonical = new Map<number, Receipt>();
    private intents = new Set<number>();
    private events: Event[] = [];
    private file: string;
    private clock: () => number;
    constructor(file: string, clock: () => number = Date.now) {
        this.file = file;
        this.clock = clock;
        if (existsSync(file)) {
            const journal = readFileSync(file);
            const committedLength = journal.lastIndexOf(10) + 1;
            // Only newline-terminated records can have been acknowledged. A torn tail is uncommitted.
            if (committedLength < journal.length)
                truncateSync(file, committedLength);
            for (const line of journal.subarray(0, committedLength).toString('utf8').split('\n').filter(Boolean))
                this.apply(JSON.parse(line) as Event);
        }
    }
    private append(event: Event) {
        mkdirSync(dirname(this.file), { recursive: true });
        const fd = openSync(this.file, 'a', 0o600);
        try {
            writeFileSync(fd, JSON.stringify(event) + '\n');
            fsyncSync(fd);
        }
        finally {
            closeSync(fd);
        }
        this.apply(event);
    }
    private apply(event: Event) {
        this.events.push(event);
        if (event.type === 'start') {
            this.packId = event.packId;
            this.bank = event.packId ? packById(event.packId).questions : questions;
            this.state = createRace(event.id, event.seed);
            this.startAt = event.at;
            this.timing = event.timing;
        }
        else if (event.type === 'answer') {
            const r = event.receipt;
            this.receipts.set(r.attemptId, r);
            if (r.revision > (this.canonical.get(r.turn)?.revision ?? -1))
                this.canonical.set(r.turn, r);
        }
        else if (event.type === 'item')
            this.intents.add(event.turn);
        else if (event.type === 'resolve') {
            const receipt = this.canonical.get(event.turn);
            const botIntents = this.state!.players.slice(1).filter((p, i) => p.item && random(this.state!.seed, event.turn, i + 91) < .7).map(p => ({ playerId: p.id }));
            this.state = resolveTurn(this.state!, receipt ? [{ playerId: 'you', choice: receipt.choice }] : [], [...botIntents, ...(this.intents.has(event.turn) ? [{ playerId: 'you' }] : [])], this.bank);
        }
    }
    start(id: string, seed: number, timing: Timing = this.timing, packId?: string, at = this.clock()) { if (this.state)
        throw new Error('Already started'); if (packId) packById(packId); this.append({ type: 'start', id, seed, at, timing, ...(packId ? {packId} : {}) }); }
    private advance(now = this.clock()) {
        if (!this.state)
            throw new Error('No race');
        while (this.state.turn < this.bank.length && now >= this.startAt + this.state.turn * (this.timing.answerMs + this.timing.revealMs) + this.timing.answerMs)
            this.append({ type: 'resolve', turn: this.state.turn });
    }
    private current(now = this.clock()): {turn: number; phase: 'answer' | 'reveal' | 'finished'; closeAt: number; nextAt: number} {
        this.advance(now);
        const elapsed = now - this.startAt;
        const cycle = this.timing.answerMs + this.timing.revealMs;
        const turn = Math.min(this.bank.length - 1, Math.floor(elapsed / cycle));
        const phase = this.state!.turn >= this.bank.length && elapsed >= this.bank.length * cycle ? 'finished' : elapsed % cycle >= this.timing.answerMs ? 'reveal' : 'answer';
        return { turn, phase, closeAt: this.startAt + turn * cycle + this.timing.answerMs, nextAt: this.startAt + (turn + 1) * cycle };
    }
    answer(command: Command): Receipt {
        if (!Number.isSafeInteger(command.turn) || !Number.isSafeInteger(command.choice) || command.choice < 0 || command.choice > 3 || !Number.isSafeInteger(command.revision) || command.revision < 1 || typeof command.attemptId !== 'string' || command.attemptId.length < 1 || command.attemptId.length > 100)
            throw new Error('Invalid answer');
        const duplicate = this.receipts.get(command.attemptId);
        if (duplicate) {
            if (duplicate.turn !== command.turn || duplicate.choice !== command.choice || duplicate.revision !== command.revision)
                throw new Error('Attempt conflict');
            return duplicate;
        }
        const acceptedAt = this.clock();
        const current = this.current(acceptedAt);
        if (current.phase !== 'answer' || command.turn !== current.turn || this.state!.turn >= this.bank.length)
            throw new Error('Turn closed');
        if (command.revision === (this.canonical.get(command.turn)?.revision ?? 0))
            throw new Error('Revision conflict');
        const receipt = { turn: command.turn, choice: command.choice, revision: command.revision, attemptId: command.attemptId, acceptedAt };
        this.append({ type: 'answer', receipt });
        return receipt;
    }
    item(turn: number) { const current = this.current(); if (current.phase !== 'answer' || turn !== current.turn)
        throw new Error('Turn closed'); if (!this.state!.players[0].item)
        throw new Error('No item'); if (!this.intents.has(turn))
        this.append({ type: 'item', turn }); return { queued: true }; }
    snapshot() {
        const current = this.current();
        const state = this.state!;
        const view = project(state, current.phase === 'reveal', this.bank);
        return { ...view, version: this.events.length, phase: current.phase, activeTurn: current.turn, serverNow: this.clock(), closeAt: current.closeAt, nextAt: current.nextAt, timing: this.timing, receipt: this.canonical.get(current.turn) ?? null, itemQueued: this.intents.has(current.turn), resultHash: state.turn === this.bank.length ? this.hash() : null };
    }
    review() {
        this.advance();
        return this.bank.slice(0, this.state!.turn).map((question, turn) => ({
            id: question.id, turn, prompt: question.prompt, choices: question.choices,
            answer: question.answer, explanation: question.explanation,
            selected: this.canonical.get(turn)?.choice ?? null,
            correct: this.canonical.get(turn)?.choice === question.answer,
            sources: ('evidence' in question ? (question as WorldQuestion).evidence : []).map(key => contentSources[key])
        }));
    }
    private hash() { return createHash('sha256').update(JSON.stringify(this.state)).digest('hex'); }
    replay() { this.advance(); if (this.state!.turn < this.bank.length)
        throw new Error('Race must be finished'); return { version: 1, rules: this.packId ? 'adverteyes-world-pack-v1' : 'adverteyes-demo-v1', events: this.events, state: this.state!, resultHash: this.hash() }; }
}
