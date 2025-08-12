'use client';
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import TrackerTimer from '@/components/TrackerTimer';
import PomodoroTimer from '@/components/PomodoroTimer';

type Subtask={id:number;title:string;status:string};
type Task={id:number;title:string;status:string;subtasks:Subtask[]};

export default function Dashboard(){
  const [tasks,setTasks]=useState<Task[]>([]);
  const [taskId,setTaskId]=useState<number|undefined>(undefined);
  const [subtaskId,setSubtaskId]=useState<number|undefined>(undefined);
  const [today,setToday]=useState<{focusMin:number;trackMin:number;sessions:number}>({focusMin:0,trackMin:0,sessions:0});

  async function load(){ const t=await fetch('/api/tasks').then(r=>r.json()); setTasks(t); if(!taskId && t.length) setTaskId(t[0].id); await refreshToday(); }
  async function refreshToday(){ const d=await fetch('/api/sessions/today').then(r=>r.json()); setToday(d); }
  useEffect(()=>{ load(); },[]);

  const currentTask=useMemo(()=>tasks.find(t=>t.id===taskId),[tasks,taskId]);
  const currentSubtask=useMemo(()=>currentTask?.subtasks.find(s=>s.id===subtaskId),[currentTask,subtaskId]);

  function onSelectTask(id:number){ setTaskId(id); setSubtaskId(undefined); }
  function onSelectSubtask(id:number){ setSubtaskId(id||undefined); }

  function stopTimers(){ window.dispatchEvent(new CustomEvent('lifeos:stopTimers')); }

  async function completeSelected(){
    stopTimers();
    // create a zero-duration 'complete' session (so history reflects completions even if no timer ran)
    await fetch('/api/sessions',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'complete', taskId, subtaskId }) });
    if (subtaskId){
      await fetch(`/api/subtasks/${subtaskId}`,{ method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status:'done' }) });
      // If all subtasks done -> optionally mark task done
      const fresh=await fetch('/api/tasks').then(r=>r.json());
      const t=fresh.find((x:Task)=>x.id===taskId);
      if (t && t.subtasks.length>0 && t.subtasks.every(s=>s.status==='done')){
        await fetch(`/api/tasks/${taskId}`,{ method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status:'done' }) });
      }
    } else if (taskId){
      await fetch(`/api/tasks/${taskId}`,{ method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status:'done' }) });
    }
    setSubtaskId(undefined);
    await load();
  }

  const doneTasks=tasks.filter(t=>t.status==='done');
  const doneSubtasks=(tasks.flatMap(t=>t.subtasks.map(s=>({ ...s, taskTitle:t.title })))).filter(s=>s.status==='done');

  return (
    <div className="grid xl:grid-cols-[420px,1fr] gap-6 items-start">
      <div className="space-y-4">
        <Card>
          <div className="text-sm text-white/60 mb-2">Now</div>
          <div className="grid gap-2">
            <select className="glass p-2.5 bg-transparent outline-none" value={taskId ?? ''} onChange={e=>onSelectTask(Number(e.target.value))}>
              {tasks.map(t=>(<option key={t.id} value={t.id} className="bg-[#0b1026]">{t.title}</option>))}
            </select>
            {currentTask?.subtasks?.length ? (
              <select className="glass p-2.5 bg-transparent outline-none" value={subtaskId ?? ''} onChange={e=>onSelectSubtask(Number(e.target.value))}>
                <option value="">(no subtask)</option>
                {currentTask.subtasks.map(st=>(<option key={st.id} value={st.id} className="bg-[#0b1026]">{st.title}</option>))}
              </select>
            ) : <div className="label">No subtasks (add them under Tasks)</div>}
          </div>

          <div className="mt-3 glass p-3">
            {currentTask ? (
              <div>
                <div className="font-semibold">{currentTask.title}</div>
                {currentSubtask && <div className="text-white/70 text-sm">Subtask: {currentSubtask.title}</div>}
                <div className="mt-2 flex gap-2">
                  <Button variant="ghost" onClick={stopTimers}>Stop timers</Button>
                  <Button onClick={completeSelected}>Complete & Move to Done</Button>
                </div>
              </div>
            ) : <div>Select a task to begin.</div>}
          </div>
        </Card>

        <TrackerTimer taskId={taskId} subtaskId={subtaskId} onSessionSaved={refreshToday} />
        <PomodoroTimer taskId={taskId} subtaskId={subtaskId} onSessionSaved={refreshToday} />

        <Card>
          <div className="text-sm text-white/60">Today</div>
          <div className="mt-2 text-lg">Focus: <b>{today.focusMin}</b> min • Tracked: <b>{today.trackMin}</b> min</div>
          <div className="text-white/70">{today.sessions} sessions</div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <div className="text-white/80 mb-2">Done — Tasks</div>
          {doneTasks.length===0 ? <div className="label">No tasks done yet.</div> : (
            <div className="grid md:grid-cols-2 gap-2">
              {doneTasks.map(t=>(<div key={t.id} className="glass p-3">{t.title}</div>))}
            </div>
          )}
        </Card>
        <Card>
          <div className="text-white/80 mb-2">Done — Subtasks</div>
          {doneSubtasks.length===0 ? <div className="label">No subtasks done yet.</div> : (
            <div className="grid md:grid-cols-2 gap-2">
              {doneSubtasks.map(s=>(<div key={s.id} className="glass p-3"><div className="font-semibold">{s.taskTitle}</div><div className="text-white/70 text-sm">• {s.title}</div></div>))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
