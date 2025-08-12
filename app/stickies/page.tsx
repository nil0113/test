'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Rnd } from 'react-rnd';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

type Note = {
  id: number; title: string; content: string; color: string; isPinned: boolean;
  x: number; y: number; width: number; height: number; zIndex: number;
  createdAt: string; updatedAt: string;
};

const PALETTE = ['#FFF6A5','#FFD6E7','#D5FFDC','#D6E8FF','#F3D6FF','#FFE9C7','#E7FFD6','#E0E0E0'];

export default function StickiesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [filter, setFilter] = useState('');
  const [saving, setSaving] = useState<'idle'|'saving'|'saved'>('idle');

  const maxZ = useMemo(()=> notes.reduce((m,n)=>Math.max(m,n.zIndex||1), 1), [notes]);

  async function load() {
    const res = await fetch('/api/notes');
    const data: Note[] = await res.json();
    // show pinned first on higher z
    setNotes(data.sort((a,b)=> (a.zIndex||1) - (b.zIndex||1)));
  }
  useEffect(()=>{ load(); }, []);

  async function createNote() {
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        title: 'Sticky',
        content: '',
        color: '#FFF6A5',
        x: 60 + Math.round(Math.random()*60),
        y: 60 + Math.round(Math.random()*40),
        width: 260,
        height: 180,
        zIndex: maxZ + 1
      })
    });
    await res.json();
    await load();
  }

  async function removeNote(id: number) {
    await fetch(`/api/notes/${id}`, { method: 'DELETE' });
    await load();
  }

  // Debounced save helper
  const timers = useRef<Record<number, any>>({});
  function debounceSave(id: number, data: Partial<Note>, delay=350) {
    setSaving('saving');
    clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(async () => {
      await fetch(`/api/notes/${id}`, {
        method: 'PATCH',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(data)
      });
      setSaving('saved');
      setTimeout(()=>setSaving('idle'), 600);
    }, delay);
  }

  function bringToFront(n: Note) {
    const next = maxZ + 1;
    debounceSave(n.id, { zIndex: next }, 0);
    setNotes(curr => curr.map(x => x.id === n.id ? { ...x, zIndex: next } : x));
  }

  const filtered = useMemo(()=>{
    const q=filter.trim().toLowerCase();
    if(!q) return notes;
    return notes.filter(n => (n.title||'').toLowerCase().includes(q) || (n.content||'').toLowerCase().includes(q));
  }, [notes, filter]);

  return (
    <div className="space-y-3">
      <Card>
        <div className="flex items-center gap-2">
          <Button onClick={createNote}>New Sticky</Button>
          <div className="label">Drag, resize, click to focus. Autosaves.</div>
          <div className="ml-auto flex items-center gap-2">
            <Input placeholder="Search…" value={filter} onChange={e=>setFilter(e.target.value)} style={{ width: 240 }}/>
            <div className="text-xs text-white/70 w-16">{saving==='saving'?'Saving…':saving==='saved'?'Saved':''}</div>
          </div>
        </div>
      </Card>

      <div className="relative min-h-[70vh] rounded-2xl border border-white/10 overflow-hidden"
           style={{ background:
            'radial-gradient(1200px 600px at 20% 10%, rgba(255,255,255,.04), transparent 60%), radial-gradient(900px 500px at 90% 20%, rgba(255,255,255,.03), transparent 60%)' }}>

        {filtered.map(n => (
          <Rnd key={n.id}
               default={{ x: n.x, y: n.y, width: n.width, height: n.height }}
               position={{ x: n.x, y: n.y }}
               size={{ width: n.width, height: n.height }}
               bounds="parent"
               style={{ zIndex: n.zIndex }}
               onDragStart={() => bringToFront(n)}
               onResizeStart={() => bringToFront(n)}
               onDragStop={(_e, d) => {
                 setNotes(curr => curr.map(x => x.id===n.id ? { ...x, x: d.x, y: d.y } : x));
                 debounceSave(n.id, { x: d.x, y: d.y });
               }}
               onResizeStop={(_e, _dir, ref, _delta, pos) => {
                 const w = Math.round(parseFloat(ref.style.width));
                 const h = Math.round(parseFloat(ref.style.height));
                 setNotes(curr => curr.map(x => x.id===n.id ? { ...x, x: pos.x, y: pos.y, width: w, height: h } : x));
                 debounceSave(n.id, { x: pos.x, y: pos.y, width: w, height: h });
               }}
          >
            <Sticky
              note={n}
              onFocus={()=>bringToFront(n)}
              onChange={(patch)=> {
                setNotes(curr => curr.map(x => x.id===n.id ? { ...x, ...patch } : x));
                debounceSave(n.id, patch);
              }}
              onDelete={()=>removeNote(n.id)}
            />
          </Rnd>
        ))}
      </div>
    </div>
  );
}

function Sticky({
  note,
  onChange,
  onDelete,
  onFocus
}: {
  note: Note;
  onChange: (patch: Partial<Note>) => void;
  onDelete: () => void;
  onFocus: () => void;
}) {
  const contentRef = useRef<HTMLDivElement|null>(null);

  return (
    <div className="h-full w-full flex flex-col rounded-xl shadow-[0_12px_30px_rgba(0,0,0,.45)] border border-black/10 overflow-hidden"
         style={{ backgroundColor: note.color }}>
      {/* Title bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-black/10 cursor-move select-none">
        <input
          className="bg-transparent outline-none text-black/80 placeholder-black/50 font-semibold flex-1"
          value={note.title}
          onChange={e=>onChange({ title: e.target.value })}
          onFocus={onFocus}
          placeholder="Title"
        />
        {/* color palette */}
        <div className="flex items-center gap-1">
          {PALETTE.map(c=>(
            <button key={c} className="w-4 h-4 rounded-full border border-black/20"
                    style={{ backgroundColor: c }} onClick={()=>onChange({ color: c })} />
          ))}
        </div>
        <button className="ml-2 text-black/60 hover:text-black" onClick={onDelete} aria-label="Delete">✕</button>
      </div>

      {/* Content (contenteditable) */}
      <div
        ref={contentRef}
        className="flex-1 p-3 text-black/90 outline-none overflow-auto leading-relaxed"
        contentEditable
        suppressContentEditableWarning
        onInput={e=> onChange({ content: (e.target as HTMLDivElement).innerHTML })}
        onFocus={onFocus}
        dangerouslySetInnerHTML={{ __html: note.content || '' }}
        style={{ fontSize: 16, fontFamily: 'ui-sans-serif, system-ui' }}
      />

      {/* Footer / mini toolbar */}
      <div className="px-3 py-2 bg-black/5 border-t border-black/10 flex items-center gap-2">
        <small className="text-black/50">Drag borders to resize • Click note to bring to front</small>
        <div className="ml-auto flex items-center gap-2">
          <TextTool onCmd={cmd => applyInlineCommand(cmd, contentRef, onChange)} />
        </div>
      </div>
    </div>
  );
}

function TextTool({ onCmd }:{ onCmd:(cmd:{type:'bold'|'italic'|'underline'|'smaller'|'bigger'|'color', value?:string})=>void }) {
  return (
    <>
      <button className="px-2 py-1 rounded bg-white/60 text-black hover:bg-white" onClick={()=>onCmd({type:'bold'})}>B</button>
      <button className="px-2 py-1 rounded bg-white/60 text-black hover:bg-white italic" onClick={()=>onCmd({type:'italic'})}>I</button>
      <button className="px-2 py-1 rounded bg-white/60 text-black hover:bg-white underline" onClick={()=>onCmd({type:'underline'})}>U</button>
      <button className="px-2 py-1 rounded bg-white/60 text-black hover:bg-white" onClick={()=>onCmd({type:'smaller'})}>A−</button>
      <button className="px-2 py-1 rounded bg-white/60 text-black hover:bg-white" onClick={()=>onCmd({type:'bigger'})}>A+</button>
      <input type="color" className="w-7 h-7 rounded border border-black/20" onChange={e=>onCmd({type:'color', value:e.target.value})}/>
    </>
  );
}

function applyInlineCommand(
  cmd: {type:'bold'|'italic'|'underline'|'smaller'|'bigger'|'color', value?:string},
  ref: React.RefObject<HTMLDivElement>,
  onChange: (patch: Partial<Note>) => void
){
  const el = ref.current;
  if (!el) return;
  el.focus();
  // Use document.execCommand for quick inline styling (supported in contentEditable)
  switch (cmd.type) {
    case 'bold': document.execCommand('bold'); break;
    case 'italic': document.execCommand('italic'); break;
    case 'underline': document.execCommand('underline'); break;
    case 'smaller': document.execCommand('decreaseFontSize'); break;
    case 'bigger': document.execCommand('increaseFontSize'); break;
    case 'color': if(cmd.value) document.execCommand('foreColor', false, cmd.value); break;
  }
  onChange({ content: el.innerHTML });
}
