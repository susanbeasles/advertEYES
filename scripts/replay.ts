import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {Authority} from '../src/server/authority.ts';
import {TourAuthority} from '../src/server/tour-authority.ts';
const path=process.argv[2];
if(!path)throw new Error('Usage: npm run replay -- path/to/adverteyes-replay.json');
const input=JSON.parse(readFileSync(path,'utf8'));
const dir=mkdtempSync(join(tmpdir(),'adverteyes-replay-'));
function journal(events:unknown[]){return events.map(e=>JSON.stringify(e)).join('\n')+'\n';}
try{
 let resultHash:string;
 if(input.rules==='adverteyes-world-tour-v1'){
  const file=join(dir,'tour.json');writeFileSync(file,JSON.stringify(input.manifest));
  input.packs.forEach((pack:{events:unknown[]},i:number)=>writeFileSync(`${file}.pack${i}.jsonl`,journal(pack.events)));
  const t=input.manifest.timing;const end=input.manifest.at+40*(t.answerMs+t.revealMs)+4*t.breakMs;
  resultHash=new TourAuthority(file,()=>end).replay().resultHash;
 }else if(input.rules==='adverteyes-demo-v1'&&Array.isArray(input.events)){
  const file=join(dir,'replay.jsonl');writeFileSync(file,journal(input.events));
  const start=input.events[0];resultHash=new Authority(file,()=>start.at+30*(start.timing.answerMs+start.timing.revealMs)).replay().resultHash;
 }else throw new Error('Unsupported replay format');
 if(resultHash!==input.resultHash)throw new Error(`Replay mismatch: ${resultHash}`);
 console.log(`Verified ${input.rules} replay: ${resultHash}`);
}finally{rmSync(dir,{recursive:true,force:true});}
