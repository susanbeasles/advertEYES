import type {TourAuthority} from '../server/tour-authority.ts';
type Snapshot=ReturnType<TourAuthority['snapshot']>;
export function TourSummary({tour}:{tour:Snapshot['tour']}){
 return <section className="tour-summary" aria-label="World Tour progress">
  <div><span className="eyebrow">WORLD TOUR · FOUR TRACKS</span><b>{tour.completedQuestions} / 40 questions</b><span>{tour.totalCorrect} correct across the tour</span></div>
  <div className="track-results">{tour.completedPacks.map(p=><span key={p.index}>{p.name}<strong>{p.progress} progress · {p.correct}/10</strong></span>)}</div>
  <p>Best single track: {tour.bestSingleRaceScore??'—'} progress. Original best-one-of-four rule retained; official qualification is disabled until track difficulty is equated. Tour-wide accuracy is a separate summary.</p>
 </section>;
}
export function CommercialBreak({tour,remaining}:{tour:Snapshot['tour'];remaining:number}){
 return <section className="commercial-break" aria-label="Commercial break placeholder"><p className="eyebrow">COMMERCIAL BREAK {tour.breakNumber} / 4 · PLACEHOLDER</p><h2>{tour.resultsAvailable?'Your results are already available.':'Take a breath. The next track is coming.'}</h2><p>No advertisement is loaded or served. Watching or completing an ad never changes your score or access to the next question.</p><strong role="timer">{remaining}s</strong><p>{tour.resultsAvailable?'The scheduled program ends after this break.':`Next track starts automatically after this ${tour.breakMs/1000}-second break.`}</p><small>No sponsorships. Product donations buy no influence. Advertising requires evidence-backed conflict and ownership review.</small></section>;
}
export function AnswerReview({history}:{history:Snapshot['history']}){
 return <details className="answer-review"><summary>Review completed questions ({history.length})</summary><p>Answers and explanations remain available after the brief reveal. Future questions stay hidden.</p>{history.map(q=><details key={q.id}><summary>{q.turn+1}. {q.prompt} <span>{q.correct?'Correct':'Missed'}</span></summary><p><b>{q.choices[q.answer]}</b> · {q.explanation}</p><p>Your choice: {q.selected===null?'No answer':q.choices[q.selected]}</p><ul>{q.sources.map(source=><li key={source.title}>{source.url?<a href={source.url} target="_blank" rel="noreferrer">{source.title}</a>:source.title}</li>)}</ul></details>)}</details>;
}
