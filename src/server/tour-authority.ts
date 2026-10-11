import {existsSync,readFileSync,writeFileSync,openSync,fsyncSync,closeSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {Authority,type Command} from './authority.ts';
import {worldPacks} from '../domain/world-packs.ts';
export const defaultTourTiming={answerMs:15000,revealMs:1500,breakMs:60000};
export type TourTiming=typeof defaultTourTiming;
type Manifest={version:1;id:string;seed:number;at:number;timing:TourTiming;contentHashes:string[]};
export class TourAuthority {
    private manifest:Manifest|null=null;
    private packs:Authority[]=[];
    private file:string;
    private clock:()=>number;
    constructor(file:string,clock:()=>number=Date.now){
        this.file=file;this.clock=clock;
        if(existsSync(file)){this.manifest=JSON.parse(readFileSync(file,'utf8')) as Manifest;if(JSON.stringify(this.manifest.contentHashes)!==JSON.stringify(this.contentHashes()))throw new Error('Question content version mismatch');this.loadPacks();}
    }
    private contentHashes(){return worldPacks.map(p=>createHash('sha256').update(JSON.stringify(p.questions)).digest('hex'));}
    private blockMs(){const t=this.manifest!.timing;return 10*(t.answerMs+t.revealMs)+t.breakMs;}
    private loadPacks(){
        const m=this.manifest!;
        this.packs=worldPacks.map((pack,index)=>{
            const a=new Authority(`${this.file}.pack${index}.jsonl`,this.clock);
            if(!existsSync(`${this.file}.pack${index}.jsonl`))a.start(m.id, m.seed+index, m.timing,pack.id,m.at+index*this.blockMs());
            return a;
        });
    }
    start(id:string,seed:number,timing:TourTiming=defaultTourTiming){
        if(this.manifest)throw new Error('Already started');
        if(Object.values(timing).some(n=>!Number.isSafeInteger(n)||n<1))throw new Error('Invalid tour timing');
        const manifest:Manifest={version:1,id,seed,at:this.clock(),timing,contentHashes:this.contentHashes()};
        mkdirSync(dirname(this.file),{recursive:true});const fd=openSync(this.file,'wx',0o600);
        try{writeFileSync(fd,JSON.stringify(manifest)+'\n');fsyncSync(fd);}finally{closeSync(fd);}
        this.manifest=manifest;this.loadPacks();
    }
    private current(): {now:number;index:number;phase:'break'|'finished'|null;breakEnd:number;eventEnd:number}{
        if(!this.manifest)throw new Error('No tour');
        const m=this.manifest,now=this.clock();const elapsed=Math.max(0,now-m.at);
        const block=this.blockMs();const index=Math.min(3,Math.floor(elapsed/block));
        const within=elapsed-index*block;const playMs=10*(m.timing.answerMs+m.timing.revealMs);
        const phase=elapsed>=block*4?'finished':within>=playMs?'break':null;
        return {now,index,phase,breakEnd:m.at+(index+1)*block,eventEnd:m.at+4*block};
    }
    answer(command:Command){
        const current=this.current();
        const index=Math.floor(command.turn/10);
        if(!Number.isSafeInteger(command.turn)||index<0||index>current.index)throw new Error('Turn closed');
        // The pack authority returns existing receipts before checking its closed window.
        // New commands in past packs or breaks remain rejected by that same authority.
        const receipt=this.packs[index].answer({...command,turn:command.turn%10});
        return {...receipt,turn:command.turn};
    }
    item(turn:number){const c=this.current();if(c.phase||Math.floor(turn/10)!==c.index)throw new Error('Turn closed');return this.packs[c.index].item(turn%10);}
    snapshot(){
        const c=this.current(),m=this.manifest!;
        // Never ask future packs for snapshots or review history.
        const visible=this.packs.slice(0,c.index+1).map(p=>p.snapshot());
        const base=visible[c.index];
        const completedPacks=visible.flatMap((s,index)=>s.finished?[{index,name:worldPacks[index].name,progress:s.own.progress,correct:s.own.correct,rank:s.rank}]:[]);
        const history=this.packs.slice(0,c.index+1).flatMap((p,index)=>p.review().map(q=>({...q,turn:index*10+q.turn,packName:worldPacks[index].name})));
        const resultsAvailable=completedPacks.length===4;
        const phase=c.phase??base.phase;
        return {...base,id:m.id,version:visible.reduce((sum,s)=>sum+s.version,0),
            phase,activeTurn:c.index*10+base.activeTurn,finished:phase==='finished',
            question:c.phase?null:base.question,result:c.phase?null:base.result,
            receipt:base.receipt?{...base.receipt,turn:c.index*10+base.receipt.turn}:null,
            serverNow:c.now,nextAt:c.phase?c.breakEnd:base.nextAt,
            resultHash:resultsAvailable?this.hash():null,history,
            tour:{packIndex:c.index,packName:worldPacks[c.index].name,packQuestion:base.activeTurn+1,
                packCount:4,questionsPerPack:10,totalQuestions:40,completedQuestions:history.length,
                totalCorrect:history.filter(q=>q.correct).length,completedPacks,
                bestSingleRaceScore:completedPacks.length?Math.max(...completedPacks.map(p=>p.progress)):null,
                qualificationStatus:'not-calibrated' as const,resultsAvailable,
                breakNumber:c.phase==='break'?c.index+1:null,breakMs:m.timing.breakMs,
                eventEndAt:c.eventEnd,durationMs:4*this.blockMs(),commercial:'Placeholder only — no ad is served.'}
        };
    }
    private hash(){return createHash('sha256').update(JSON.stringify({manifest:this.manifest,packs:this.packs.map(p=>p.replay().resultHash)})).digest('hex');}
    replay(){
        const c=this.current();const last=this.packs[3];
        if(c.index<3||!last.snapshot().finished)throw new Error('Tour questions must be finished');
        const packs=this.packs.map(p=>p.replay());
        return {version:1,rules:'adverteyes-world-tour-v1',manifest:this.manifest,packs,resultHash:this.hash()};
    }
}
