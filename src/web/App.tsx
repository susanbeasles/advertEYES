import { useEffect, useRef, useState } from 'react';
import { shouldApplySnapshot } from './client-state.ts';
import type { Authority } from '../server/authority.ts';
import type {TourAuthority} from '../server/tour-authority.ts';
import {TourSummary, CommercialBreak, AnswerReview} from './TourPanels.tsx';
type TourSnapshot=ReturnType<TourAuthority['snapshot']>;
type Snapshot=Omit<ReturnType<Authority['snapshot']>,'phase'> & {phase:TourSnapshot['phase'];tour?:TourSnapshot['tour'];history?:TourSnapshot['history']};
const itemCopy = { pulse: { name: 'Pulse', icon: '↗', description: 'Disrupt the nearest rival ahead. −6 progress.' }, echo: { name: 'Echo', icon: '↙', description: 'Disrupt the nearest rival behind. −6 progress.' }, surge: { name: 'Surge', icon: '✳', description: 'Disrupt the leading group. −8 progress each.' } };
async function api(path: string, body?: unknown) { const r = await fetch('/api/' + path, { method: body === undefined ? 'GET' : 'POST', headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }); const data = await r.json(); if (!r.ok)
    throw new Error(data.error); return data; }
function Mark() { return <span className="brand-symbol" aria-hidden="true"><i /><i /></span>; }
export function App() {
    const [state, setState] = useState<Snapshot | null>(null), [online, setOnline] = useState(true), [error, setError] = useState(''), [starting, setStarting] = useState(false), [pending, setPending] = useState<number | null>(null), [rules, setRules] = useState(false), [clock, setClock] = useState(Date.now());
    const requestGeneration = useRef(0);
    const stateRef = useRef(state), revision = useRef(0), startGuard = useRef(false), offset = useRef(0), choiceGuard = useRef(false);
    function accept(next: Snapshot, generation = requestGeneration.current) { if (!shouldApplySnapshot(stateRef.current, next, generation, requestGeneration.current))
        return; offset.current = next.serverNow - Date.now(); stateRef.current = next; setState(next); revision.current = Math.max(revision.current, next.receipt?.revision ?? 0); setOnline(true); }
    useEffect(() => { let active = true; let timer: ReturnType<typeof setTimeout>; const poll = async () => { const generation = requestGeneration.current; try {
        const next = await api('state');
        if (active)
            accept(next, generation);
    }
    catch (e) {
        if (active && e instanceof Error && e.message !== 'No active race')
            setOnline(false);
    } if (active)
        timer = setTimeout(poll, 350); }; void poll(); const tick = setInterval(() => setClock(Date.now()), 150); return () => { active = false; clearTimeout(timer); clearInterval(tick); }; }, []);
    async function start() { if (startGuard.current)
        return; startGuard.current = true; requestGeneration.current++; setStarting(true); setError(''); try {
        accept(await api('start', {}));
        revision.current = 0;
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        startGuard.current = false;
        setStarting(false);
    } }
    async function answer(choice: number) { if (!state || state.phase !== 'answer' || choiceGuard.current)
        return; choiceGuard.current = true; setPending(choice); setError(''); try {
        await api('answer', { turn: state.activeTurn, choice, revision: ++revision.current, attemptId: crypto.randomUUID() });
        accept(await api('state'));
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        choiceGuard.current = false;
        setPending(null);
    } }
    async function useItem() { if (!state)
        return; try {
        await api('item', { turn: state.activeTurn });
        accept(await api('state'));
    }
    catch (e) {
        setError((e as Error).message);
    } }
    const remaining = state ? Math.max(0, Math.ceil(((state.phase === 'answer' ? state.closeAt : state.nextAt) - (clock + offset.current)) / 1000)) : 0;
    const finished = state?.phase === 'finished' || !!(state?.tour?.resultsAvailable && state.phase === 'break');
    const q = state?.question;
    return <div className="app"><header className="header"><a className="brand" href="/" aria-label="AdvertEYES home"><Mark />advert<span>EYES</span><small>.me</small></a><div className="header-right"><span className="practice-pill"><span />PRIVATE PRACTICE</span><button className="text-button" onClick={() => setRules(!rules)} aria-expanded={rules}>How to play <span aria-hidden="true">↗</span></button></div></header>
 {rules && <section className="rules" aria-label="Practice rules"><strong>Knowledge sets the pace.</strong><p>Four tracks, ten questions each. Every question gives you exactly 15 seconds to answer. Difficulty bands are estimates, not measured rankings. Every correct answer earns 10 progress, regardless of when you answer inside the window. Change your choice until the server closes the turn.</p><p>Every 4 correct answers earns an item. One held item, one reserve; additional grants expire. Pulse hits ahead, Echo hits behind. Two leader-checkpoint opportunities can award a Surge to a correct trailing contestant. Items never prevent answering. Ties share a place.</p><p>16 rivals are deterministic simulations. Rankings briefly hide within each track. A 1.5-second reveal follows each question; explanations stay in your review history. Four one-minute commercial placeholders complete the 15-minute schedule. No actual ads are served. Demo content is uncalibrated. This is an unranked local rehearsal with no prizes, signup or tracking.</p><button className="text-button" onClick={() => setRules(false)}>Close rules ×</button></section>}
 {error && <div className="notice error" role="alert">{error}. {error === 'Turn closed' ? 'The next question is on its way.' : 'Please try again.'}</div>}
 {!online && <div className="notice" role="status">Connection interrupted. Reconnecting to the official state…</div>}
 {!state ? <main className="lobby"><div className="lobby-copy"><p className="eyebrow"><span className="small-star">✳</span> WORLD TOUR · 15 MINUTES</p><h1>Outthink<br />the field<span className="lime-dot">.</span></h1><p className="intro">The whole field moves together.<br />Until knowledge pulls you ahead.</p><button className="primary enter" onClick={start} disabled={starting}>{starting ? 'Joining…' : 'Enter World Tour'}<span aria-hidden="true">↗</span></button><p className="entry-note">No signup. No speed bonus. Just you and what you know.</p><div className="lobby-stats"><div><b>40</b><span>QUESTIONS</span></div><div><b>16</b><span>SIMULATED RIVALS</span></div><div><b>04</b><span>KNOWLEDGE TRACKS</span></div></div></div><div className="preview"><div className="preview-top"><span>EVERY ANSWER CHANGES THE RACE</span><span>↗</span></div><div className="preview-symbol">✳</div><div className="preview-question"><span>KNOW IT. EARN IT. USE IT.</span><h2>A little knowledge.<br />A lot can change.</h2></div><div className="preview-positions"><div><span>01</span><b>NOVA</b><i /></div><div className="you"><span>02</span><b>YOU</b><em>↑ 3 places</em></div><div><span>03</span><b>ATLAS</b><i /></div></div><p className="preview-label">Illustrative preview · simulated field</p></div></main> :
            <main className="race"><div className="race-title"><div><p className="eyebrow">THE KNOWLEDGE GRAND PRIX <span>/</span> {state.tour ? `TRACK ${state.tour.packIndex+1}/4 · ${state.tour.packName}` : 'LEGACY PRACTICE'}</p><h1>{finished ? 'That’s your tour.' : state.blackout ? 'Trust what you know.' : 'Every mind. Same moment.'}</h1></div><div className="connection"><i className={online ? '' : 'offline'}/>{online ? 'Authority connected' : 'Reconnecting'}</div></div>
 {state.tour && <TourSummary tour={state.tour}/>}<div className="race-layout"><div className="main-column"><section className="score-strip" aria-label="Your race"><div><span>{state.tour ? 'TRACK PROGRESS' : 'YOUR PROGRESS'}</span><strong>{state.own.progress}<small> / {state.total*10}</small></strong></div><div><span>YOUR POSITION</span><strong>{state.blackout ? '—' : `#${state.rank}`}<small> / 17</small></strong></div><div><span>CORRECT</span><strong>{state.own.correct}<small> / {state.turn}</small></strong></div></section>
 {state.phase==='break' && state.tour && <CommercialBreak tour={state.tour} remaining={remaining}/>}
 {finished ? <section className="result-card"><span className="result-star">✳</span><p className="eyebrow">QUESTIONS COMPLETE · UNRANKED REHEARSAL</p><h2>Your results are ready.</h2><p>You answered {state.tour?.totalCorrect ?? state.own.correct} of {state.tour?.totalQuestions ?? state.total} correctly. Your final track position is {state.rank}. Every contestant reaches every question.</p><div className="result-actions"><button className="primary" onClick={start} disabled={starting}>Play another tour ↗</button><a className="secondary" href="/api/replay" download>Download replay ↓</a></div><p className="hash">Replay fingerprint<br />{state.resultHash}</p><p className="fineprint">Same demo questions on replay. A fresh simulated field. Track scores are not calibrated for official qualification.</p></section> : q && <section className={'question-card ' + (state.phase === 'reveal' ? 'revealing' : '')} aria-labelledby="question-title"><div className="question-meta"><span>QUESTION <b>{String(state.tour?.packQuestion ?? state.activeTurn + 1).padStart(2, '0')}</b><small> / {state.total}</small></span><span className="difficulty">{['ESTIMATE 1', 'ESTIMATE 2', 'ESTIMATE 3', 'ESTIMATE 4', 'ESTIMATE 5'][q.difficulty - 1]} <span aria-label={`Difficulty ${q.difficulty} of 5`}>{Array.from({ length: 5 }, (_, i) => <i key={i} className={i < q.difficulty ? 'filled' : ''}/>)}</span></span></div><div className="question-body"><span className="category">{q.category}</span><div className="question-visual" role="img" aria-label={q.alt}>{q.visual}</div><h2 id="question-title" aria-live="polite">{q.prompt}</h2></div><div className="answer-grid" aria-label="Answer choices">{q.choices.map((choice, i) => { const selected = (pending ?? state.receipt?.choice) === i; return <button key={i} className={'answer ' + (selected ? 'selected ' : '') + (state.phase === 'reveal' && state.result?.answer === i ? 'correct' : '')} aria-pressed={selected} disabled={state.phase !== 'answer' || pending !== null || !online} onClick={() => answer(i)}><span className="answer-letter">{'ABCD'[i]}</span><span>{choice}</span><span className="answer-check" aria-hidden="true">{state.phase === 'reveal' && state.result?.answer === i ? '✓' : selected ? '●' : ''}</span></button>; })}</div><div className="answer-status" role="status">{state.phase === 'reveal' ? <><b>{state.result?.correct ? 'Correct. +10 progress' : 'No progress this turn.'}</b><span>{state.result?.explanation}</span></> : pending !== null ? 'Sending your selection…' : state.receipt ? 'Received. You can still change your answer.' : 'Choose your answer. Timing never earns extra points.'}</div><div className="turn-clock"><div className="clock-track"><i style={{ width: `${Math.max(0, Math.min(100, remaining / (state.phase === 'answer' ? state.timing.answerMs / 1000 : state.timing.revealMs / 1000) * 100))}%` }}/></div><span role="timer" aria-label={`${remaining} seconds ${state.phase === 'answer' ? 'to answer' : 'until next question'}`}>{state.phase === 'answer' ? 'TURN CLOSES' : 'NEXT QUESTION'} <b>{String(remaining).padStart(2, '0')}s</b></span></div></section>}
 <section className="item-bar" aria-label="Earned item"><div className={'item-icon ' + (state.own.item ? 'charged' : '')}>{state.own.item ? itemCopy[state.own.item].icon : '↗'}</div><div className="item-copy"><span className="eyebrow">{state.own.item ? 'ITEM READY' : 'KNOWLEDGE IS YOUR ADVANTAGE'}</span><h3>{state.own.item ? itemCopy[state.own.item].name : `${4 - state.own.correct % 4} correct to your next item`}</h3><p>{state.own.item ? itemCopy[state.own.item].description : 'Earn a disruption every four correct answers.'}{state.own.queuedItem ? ' One item in reserve.' : ''}</p></div><button className="item-button" onClick={useItem} disabled={!state.own.item || state.itemQueued || state.phase !== 'answer' || !online}>{state.itemQueued ? 'Queued ✓' : 'Use item ↗'}</button></section></div>
 <aside className="field-panel" aria-label="Race standings"><div className="field-heading"><h2>The field</h2><span>{state.blackout ? 'BLACKOUT' : '17 MINDS'}</span></div><p className="simulation-note"><i /> You + 16 simulated rivals</p>{state.blackout ? <div className="blackout"><span>◌</span><h3>The field is hidden.</h3><p>Your progress is still counting.<br />Keep making your move.</p><small>Positions return after this blackout.</small></div> : <ol className="standings">{state.standings?.map(p => <li key={p.id} className={p.id === 'you' ? 'is-you' : ''}><span className="place">{String(p.rank).padStart(2, '0')}</span><span className="avatar">{p.name.slice(0, 1)}</span><span className="contestant">{p.name}{p.id === 'you' && <small>THAT’S YOU</small>}</span><b>{p.progress}</b></li>)}</ol>}<div className="field-foot"><span>↗</span><p>Same question. Same window.<br /><b>No faster-tap advantage.</b></p></div></aside></div>{state.history && <AnswerReview history={state.history}/>}<div className="race-footer"><span>EVERY TRACK. EVERY QUESTION. KNOWLEDGE, NEVER REACTION SPEED.</span><span>DEMO CONTENT · NOT YET CALIBRATED</span></div></main>}
 <footer className="footer"><span>A race of minds.</span><span>KNOWLEDGE MOVES EVERYONE FORWARD.</span><span>AdvertEYES © 2026</span></footer></div>;
}
