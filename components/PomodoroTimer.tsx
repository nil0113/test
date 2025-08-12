'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from './ui/Button';

type Props = { taskId?: number; subtaskId?: number; onSessionSaved?: () => void; };
const FOCUS_OPTIONS=[5,10,20,30]; const BREAK_OPTIONS=[5,10];

export default function PomodoroTimer({ taskId, subtaskId, onSessionSaved }: Props){
  const [mode,setMode]=useState<'focus'|'break'>('focus');
  const [minutes,setMinutes]=useState(25);
  const [secondsLeft,setSecondsLeft]=useState(25*60);
  const [isRunning,setIsRunning]=useState(false);
  const [sessionId,setSessionId]=useState<number|null>(null);
  const tickRef=useRef<NodeJS.Timeout|null>(null);
  const storageKey=`lifeos.pomo.${taskId ?? 'none'}.${subtaskId ?? 'none'}`;

  useEffect(()=>{const s=localStorage.getItem(storageKey);if(s){const d=JSON.parse(s);setMode(d.mode??'focus');setMinutes(d.minutes??25);setSecondsLeft(d.secondsLeft??(d.minutes??25)*60);setIsRunning(d.isRunning??false);setSessionId(d.sessionId??null);}else{setMinutes(25);setSecondsLeft(25*60);} },[storageKey]);
  useEffect(()=>{localStorage.setItem(storageKey,JSON.stringify({mode,minutes,secondsLeft,isRunning,sessionId}));},[mode,minutes,secondsLeft,isRunning,sessionId,storageKey]);

  useEffect(()=>{ if(isRunning){ tickRef.current=setInterval(()=>{ setSecondsLeft(p=>{ if(p<=1){ stop(false,true); return 0; } return p-1; }); },1000);} return()=>{ if(tickRef.current) clearInterval(tickRef.current); }; },[isRunning]);

  useEffect(()=>{ const h=()=>{ stop(false,false); }; window.addEventListener('lifeos:stopTimers',h); return()=>window.removeEventListener('lifeos:stopTimers',h); },[sessionId,isRunning,minutes,secondsLeft]);

  function pick(m:number){ if(!isRunning){ setMinutes(m); setSecondsLeft(m*60); } }
  async function start(){ if(isRunning) return; setIsRunning(true); const res=await fetch('/api/sessions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'start',type:mode,taskId,subtaskId})}); const data=await res.json(); setSessionId(data.id); }
  async function stop(fromUI=false,auto=false){ if(tickRef.current) clearInterval(tickRef.current); if(!isRunning) return; setIsRunning(false); if(sessionId){ const elapsed=minutes*60 - secondsLeft; await fetch('/api/sessions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'stop',id:sessionId,elapsed})}); setSessionId(null); onSessionSaved?.(); if(auto && mode==='focus'){ setMode('break'); pick(5); } } }

  const mm=String(Math.floor(secondsLeft/60)).padStart(2,'0'); const ss=String(secondsLeft%60).padStart(2,'0');

  return(<div className="glass p-4 text-center">
    <div className="flex justify-center gap-2 mb-3">
      <Button variant={mode==='focus'?'primary':'ghost'} onClick={()=>{ if(!isRunning){ setMode('focus'); pick(25); } }}>Focus</Button>
      <Button variant={mode==='break'?'primary':'ghost'} onClick={()=>{ if(!isRunning){ setMode('break'); pick(5); } }}>Break</Button>
    </div>
    <div className="flex justify-center gap-2 mb-2">{(mode==='focus'?FOCUS_OPTIONS:BREAK_OPTIONS).map(m=>(<Button key={m} variant="ghost" onClick={()=>pick(m)}>{m}m</Button>))}</div>
    <div className="text-5xl font-bold tabular-nums">{mm}:{ss}</div>
    <div className="mt-3 flex items-center justify-center gap-2">
      {!isRunning ? <Button onClick={start} disabled={!taskId && !subtaskId}>Start</Button> : <Button variant="danger" onClick={()=>stop(true,false)}>Stop</Button>}
      <Button variant="ghost" onClick={()=>{ if(tickRef.current) clearInterval(tickRef.current); setIsRunning(false); setSecondsLeft(minutes*60); }}>Reset</Button>
    </div>
    {(!taskId && !subtaskId) && <div className="text-xs text-white/70 mt-2">Select a task or subtask to enable Start</div>}
  </div>);
}
