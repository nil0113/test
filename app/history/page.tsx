'use client';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';

type Row={month:string;minutes:number};
type SessionRow={id:number;type:string|null;minutes:number;date:string;taskTitle:string|null;subtaskTitle:string|null};

export default function History(){
  const [rows,setRows]=useState<Row[]>([]);
  const [recent,setRecent]=useState<SessionRow[]>([]);
  useEffect(()=>{ (async()=>{ setRows(await fetch('/api/sessions/summary').then(r=>r.json())); setRecent(await fetch('/api/sessions/recent').then(r=>r.json())); })(); },[]);
  return(<div className="space-y-4">
    <h1 className="text-3xl font-bold">History</h1>
    <Card>
      <div className="mb-2 text-white/80">Focus Minutes per Month (last 12)</div>
      <div className="grid grid-cols-12 gap-2 items-end">
        {rows.map((r,i)=>(<div key={i} className="text-center"><div className="glass w-6 sm:w-8 mx-auto" style={{height:Math.max(8,r.minutes/5)+'px'}}/><div className="text-xs text-white/70 mt-1">{r.month}</div></div>))}
      </div>
    </Card>
    <Card>
      <div className="mb-2 text-white/80">Recent Sessions</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-white/70"><th className="text-left p-2">Date</th><th className="text-left p-2">Type</th><th className="text-left p-2">Task</th><th className="text-left p-2">Subtask</th><th className="text-right p-2">Minutes</th></tr></thead>
          <tbody>
            {recent.map(r=>(<tr key={r.id} className="border-t border-white/10"><td className="p-2">{r.date}</td><td className="p-2">{r.type}</td><td className="p-2">{r.taskTitle??'—'}</td><td className="p-2">{r.subtaskTitle??'—'}</td><td className="p-2 text-right">{r.minutes}</td></tr>))}
          </tbody>
        </table>
      </div>
    </Card>
  </div>);
}
