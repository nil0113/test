'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from './ui/Button';

type Props = { taskId?: number; subtaskId?: number; onSessionSaved?: () => void; };

export default function TrackerTimer({ taskId, subtaskId, onSessionSaved }: Props){
  const [seconds,setSeconds]=useState(0);
  const [isRunning,setIsRunning]=useState(false);
  const [sessionId,setSessionId]=useState<number|null>(null);
  const tickRef=useRef<NodeJS.Timeout|null>(null);
  const storageKey=`lifeos.track.${taskId ?? 'none'}.${subtaskId ?? 'none'}`;

  useEffect(()=>{const s=localStorage.getItem(storageKey); if(s){const d=JSON.parse(s); setSeconds(d.seconds??0); setIsRunning(d.isRunning??false); setSessionId(d.sessionId??null);} },[storageKey]);
  useEffect(()=>{localStorage.setItem(storageKey,JSON.stringify({seconds,isRunning,sessionId}));},[seconds,isRunning,sessionId,storageKey]);

  useEffect(()=>{ if(isRunning){ tickRef.current=setInterval(()=>setSeconds(s=>s+1),1000);} return()=>{ if(tickRef.current) clearInterval(tickRef.current); }; },[isRunning]);

  useEffect(()=>{ const h=()=>{ stop(); }; window.addEventListener('lifeos:stopTimers',h); return()=>window.removeEventListener('lifeos:stopTimers',h); },[sessionId,isRunning,seconds]);

  async function start(){ if(isRunning) return; setIsRunning(true); const res=await fetch('/api/sessions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'start',type:'track',taskId,subtaskId})}); const data=await res.json(); setSessionId(data.id); }
  async function stop(){ if(tickRef.current) clearInterval(tickRef.current); if(!isRunning) return; setIsRunning(false); if(sessionId){ await fetch('/api/sessions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'stop',id:sessionId,elapsed:seconds})}); setSessionId(null); onSessionSaved?.(); } }
  function reset(){ if(tickRef.current) clearInterval(tickRef.current); setIsRunning(false); setSeconds(0); }

  const hh=String(Math.floor(seconds/3600)).padStart(2,'0'); const mm=String(Math.floor((seconds%3600)/60)).padStart(2,'0'); const ss=String(seconds%60).padStart(2,'0');
  return(<div className="glass p-4 text-center">
    <div className="text-5xl font-bold tabular-nums">{hh}:{mm}:{ss}</div>
    <div className="mt-3 flex items-center justify-center gap-2">
      {!isRunning ? <Button onClick={start} disabled={!taskId && !subtaskId}>Start</Button> : <Button variant="danger" onClick={stop}>Stop</Button>}
      <Button variant="ghost" onClick={reset}>Reset</Button>
    </div>
    {(!taskId && !subtaskId) && <div className="text-xs text-white/70 mt-2">Select a task or subtask to enable Start</div>}
  </div>);
}
