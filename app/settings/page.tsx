'use client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
export default function Settings(){
  function resetLocal(){ Object.keys(localStorage).forEach(k=>{ if(k.startsWith('lifeos.pomo.')||k.startsWith('lifeos.track.')) localStorage.removeItem(k);}); location.reload(); }
  return(<div className="space-y-4"><h1 className="text-3xl font-bold">Settings</h1><Card><div className="mb-2 text-white/80">Timers</div><div className="text-white/70 text-sm">Dashboard has a <b>Tracker</b> (count-up) and a <b>Pomodoro</b> (count-down). They attach to the selected task/subtask and save to history.</div><div className="mt-3"><Button variant="ghost" onClick={resetLocal}>Reset local timer state</Button></div></Card></div>);
}
