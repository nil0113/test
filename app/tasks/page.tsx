'use client';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type Subtask={id:number;title:string;status:string};
type Task={id:number;title:string;status:string;subtasks:Subtask[]};

export default function Tasks(){
  const [tasks,setTasks]=useState<Task[]>([]);
  const [title,setTitle]=useState('Write methods section');
  const [loading,setLoading]=useState(false);
  const [edit,setEdit]=useState<Record<number,string>>({});
  const [subTitle,setSubTitle]=useState<Record<number,string>>({});

  async function load(){ const r=await fetch('/api/tasks'); setTasks(await r.json()); }
  useEffect(()=>{ load(); },[]);

  async function addTask(){ setLoading(true); await fetch('/api/tasks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title})}); setTitle(''); setLoading(false); await load(); }
  async function delTask(id:number){ await fetch(`/api/tasks/${id}`,{method:'DELETE'}); await load(); }
  async function renameTask(id:number){ const t=edit[id]; if(!t) return; await fetch(`/api/tasks/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:t})}); setEdit(s=>({...s,[id]:''})); await load(); }
  async function addSubtask(taskId:number){ const st=subTitle[taskId]; if(!st) return; await fetch(`/api/tasks/${taskId}/subtasks`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:st})}); setSubTitle(s=>({...s,[taskId]:''})); await load(); }
  async function delSubtask(id:number){ await fetch(`/api/subtasks/${id}`,{method:'DELETE'}); await load(); }

  return(<div className="space-y-4">
    <h1 className="text-3xl font-bold">Tasks</h1>
    <Card>
      <div className="mb-2 text-white/80">Recommended defaults are preloaded. Add more:</div>
      <div className="grid sm:grid-cols-[1fr,auto] gap-2">
        <Input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Task title"/>
        <Button onClick={addTask} disabled={!title||loading}>Add Task</Button>
      </div>
    </Card>

    <div className="grid gap-4">
      {tasks.map(t=>(
        <Card key={t.id}>
          <div className="flex items-center justify-between">
            <div className="font-semibold text-lg">{t.title}</div>
            <div className="flex gap-2">
              <Input style={{width:220}} value={edit[t.id]??''} onChange={e=>setEdit(s=>({...s,[t.id]:e.target.value}))} placeholder="Rename task"/>
              <Button variant="ghost" onClick={()=>renameTask(t.id)} disabled={!edit[t.id]}>Save</Button>
              <Button variant="ghost" onClick={()=>delTask(t.id)}>Delete</Button>
            </div>
          </div>
          <div className="mt-3">
            <div className="label mb-1">Subtasks</div>
            <div className="space-y-2">
              {t.subtasks.map(st=>(
                <div key={st.id} className="glass p-3 flex items-center justify-between">
                  <div>{st.title}</div>
                  <Button variant="ghost" onClick={()=>delSubtask(st.id)}>Delete</Button>
                </div>
              ))}
            </div>
            <div className="grid sm:grid-cols-[1fr,auto] gap-2 mt-2">
              <Input value={subTitle[t.id]??''} onChange={e=>setSubTitle(s=>({...s,[t.id]:e.target.value}))} placeholder="Add subtask"/>
              <Button onClick={()=>addSubtask(t.id)} disabled={!subTitle[t.id]}>Add Subtask</Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  </div>);
}
