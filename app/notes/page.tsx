
// app/notes/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Rnd } from 'react-rnd';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';

type Note = {
  id: number;
  title: string;
  content: string;
  color: string;
  isPinned: boolean;
  x: number; y: number; width: number; height: number; zIndex: number;
  createdAt: string; updatedAt: string;
};

const BOARD_BG_COLORS = ['#ffffff','#fff6a5','#ffd6e7','#d5ffdc','#d6e8ff','#f3d6ff'];
const STICKY_PALETTE   = ['#FFF6A5','#FFD6E7','#D5FFDC','#D6E8FF','#F3D6FF','#FFE9C7','#E7FFD6','#E0E0E0'];

export default function NotesPage() {
  const [view, setView] = useState<'document'|'stickies'>('document');
  const [notes, setNotes] = useState<Note[]>([]);
  const [filter, setFilter] = useState('');
  const [saving, setSaving] = useState<'idle'|'saving'|'saved'>('idle');

  // Document view state
  const [activeId, setActiveId] = useState<number | null>(null);
  const [title, setTitle]     = useState('');
  const [content, setContent] = useState('');
  const [boardColor, setBoardColor] = useState('#ffffff');
  const [isPinned, setIsPinned] = useState(false);
  const taRef = useRef<HTMLTextAreaElement|null>(null);

  // Load notes
  async function load() {
    const res = await fetch('/api/notes');
    const data: Note[] = await res.json();
    const sorted = data.sort((a,b) => Number(b.isPinned) - Number(a.isPinned) ||
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    setNotes(sorted);
    if (view === 'document' && sorted.length && activeId === null) hydrate(sorted[0]);
  }
  useEffect(()=>{ load(); }, []); // eslint-disable-line

  const maxZ = useMemo(()=> notes.reduce((m,n)=>Math.max(m, n.zIndex || 1), 1), [notes]);

  function hydrate(n: Note) {
    setActiveId(n.id);
    setTitle(n.title ?? '');
    setContent(n.content ?? '');
    setBoardColor(n.color || '#ffffff');
    setIsPinned(!!n.isPinned);
  }

  // Create / Delete
  async function createNote(defaults?: Partial<Note>) {
    const body = {
      title: 'Untitled',
      content: '',
      color: '#ffffff',
      x: 60 + Math.round(Math.random()*80),
      y: 60 + Math.round(Math.random()*60),
      width: 320,
      height: 220,
      zIndex: maxZ + 1,
      isPinned: false,
      ...defaults
    };
    const res = await fetch('/api/notes', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    const n: Note = await res.json();
    await load();
    if (view==='document') hydrate(n);
  }
  async function deleteNote(id: number) {
    if (!confirm('Delete this note?')) return;
    await fetch(`/api/notes/${id}`, { method: 'DELETE' });
    await load();
    if (activeId === id) {
      const rest = notes.filter(n => n.id !== id);
      if (rest[0]) hydrate(rest[0]); else { setActiveId(null); setTitle(''); setContent(''); }
    }
  }

  // Debounced save helper (+ immediate onBlur)
  const timers = useRef<Record<string, any>>({});
  function debounceSave(id: number, data: Partial<Note>, delay=400) {
    setSaving('saving');
    const key = `${id}`;
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(async () => {
      await fetch(`/api/notes/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) });
      setSaving('saved'); setTimeout(()=>setSaving('idle'), 600);
    }, delay);
  }
  async function saveNow(id:number, data:Partial<Note>) {
    setSaving('saving');
    await fetch(`/api/notes/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) });
    setSaving('saved'); setTimeout(()=>setSaving('idle'), 600);
  }

  // Autosave document fields
  useEffect(() => {
    if (!activeId) return;
    debounceSave(activeId, { title, content, color: boardColor, isPinned }, 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, boardColor, isPinned, activeId]);

  // Filter
  const filtered = useMemo(()=>{
    const q = filter.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(n =>
      (n.title || '').toLowerCase().includes(q) ||
      (n.content || '').toLowerCase().includes(q.replace(/<[^>]*>?/gm,'')) ||
      (n.content || '').toLowerCase().includes(q)
    );
  }, [notes, filter]);

  // Stickies helpers
  function bringToFront(n: Note) {
    const next = maxZ + 1;
    setNotes(curr => curr.map(x => x.id === n.id ? ({ ...x, zIndex: next }) : x));
    debounceSave(n.id, { zIndex: next }, 0);
  }
  async function tidyLayout() {
    const gap = 16, colW = 320, colH = 240, cols = 3;
    let x = 24, y = 24, c = 0;
    const updates: Array<Promise<any>> = [];
    const ordered = [...notes];
    ordered.forEach((n, idx) => {
      const nx = x, ny = y;
      updates.push(saveNow(n.id, { x:nx, y:ny, width:colW, height:colH, zIndex: idx+1 }));
      x += colW + gap; c++;
      if (c >= cols) { c = 0; x = 24; y += colH + gap; }
    });
    await Promise.all(updates);
    await load();
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl overflow-hidden border border-white/10">
            <button onClick={()=>setView('document')} className={`px-3 py-2 ${view==='document'?'bg-white/20':''}`}>Document</button>
            <button onClick={()=>setView('stickies')} className={`px-3 py-2 ${view==='stickies'?'bg-white/20':''}`}>Stickies</button>
          </div>

          <Input placeholder="Search…" value={filter} onChange={e=>setFilter(e.target.value)} style={{ width: 260 }}/>
          <Button onClick={()=>createNote(view==='stickies' ? { title: 'Sticky', color: '#FFF6A5' } : {})}>
            {view==='stickies' ? 'New Sticky' : 'New Note'}
          </Button>
          {view==='stickies' && (
            <>
              <Button variant="ghost" onClick={tidyLayout}>Tidy</Button>
              <span className="label">Drag by header • Snap 10px</span>
            </>
          )}
          <div className="ml-auto text-xs text-white/70 min-w-[48px]">{saving==='saving'?'Saving…':saving==='saved'?'Saved':''}</div>
        </div>
      </Card>

      {/* MAIN */}
      {view === 'document' ? (
        <div className="grid lg:grid-cols-[320px,1fr] gap-4">
          {/* Sidebar */}
          <div className="space-y-3">
            <Card>
              <div className="space-y-2 max-h-[70vh] overflow-auto pr-1">
                {filtered.map(n => {
                  const active = n.id === activeId;
                  return (
                    <div key={n.id} className={`glass p-3 ${active?'bg-white/20':''}`}>
                      <div className="flex items-center gap-2">
                        <input
                          className="w-full bg-transparent outline-none font-semibold"
                          defaultValue={n.title}
                          onBlur={async e=>{
                            const v=e.target.value;
                            await saveNow(n.id,{title:v});
                            if (active) setTitle(v);
                          }}
                          onClick={()=>hydrate(n)}
                          placeholder="Untitled"
                        />
                        <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: n.color||'#fff' }} />
                        <Button variant="ghost" onClick={()=>deleteNote(n.id)}>✕</Button>
                      </div>
                      <button className="text-left text-xs text-white/70 line-clamp-2 mt-1 w-full"
                              onClick={()=>hydrate(n)}>
                        {(n.content || '').replace(/<[^>]*>?/gm,'').slice(0,140)}
                      </button>
                    </div>
                  );
                })}
                {filtered.length===0 && <div className="label">No notes yet.</div>}
              </div>
            </Card>
          </div>

          {/* Live Split View */}
          <div className="space-y-3">
            <Card>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  placeholder="Title"
                  value={title}
                  onChange={e=>setTitle(e.target.value)}
                  onBlur={()=> activeId && saveNow(activeId,{ title })}
                  style={{ maxWidth: 480 }}
                />


                {/* <div className="flex items-center gap-1">
                {BOARD_BG_COLORS.map(c => (
                  <button
                    key={c}
                    className="w-6 h-6 rounded-full border border-white/20"
                    style={{ backgroundColor: c }}
                    onClick={async () => {
                      setBoardColor(c);                                     // update editor bg immediately
                      if (!activeId) return;
                      setNotes(cs => cs.map(x => x.id === activeId          // reflect in sidebar dot right away
                        ? { ...x, color: c }
                        : x
                      ));
                      await saveNow(activeId, { color: c });                // persist to DB immediately
                    }}
                  />
                ))} 
                </div> */}



                {/* <div className="flex items-center gap-1">
                  {BOARD_BG_COLORS.map(c => (
                    <button
                      key={c}
                      className="w-6 h-6 rounded-full border border-white/20"
                      style={{ backgroundColor: c }}
                      onClick={async () => {
                        setBoardColor(c);                                   // update editor bg
                        if (!activeId) return;
                        setNotes(cs => cs.map(x => x.id === activeId        // update sidebar dot
                          ? { ...x, color: c }
                          : x
                        ));
                        await saveNow(activeId, { color: c });              // persist
                      }}
                    />
                  ))}

                  <input
                    type="color"
                    className="w-7 h-7 rounded border border-white/20 bg-transparent"
                    value={boardColor}
                    title="Pick any color"
                    onChange={async (e) => {
                      const hex = e.target.value;
                      setBoardColor(hex);                                   // update editor bg
                      if (!activeId) return;
                      setNotes(cs => cs.map(x => x.id === activeId          // update sidebar dot
                        ? { ...x, color: hex }
                        : x
                      ));
                      await saveNow(activeId, { color: hex });              // persist
                    }}
                  />
                </div> */}


              <div className="flex items-center gap-1">
                {BOARD_BG_COLORS.map((c) => (
                  <button
                    key={c}
                    className="w-6 h-6 rounded-full border border-white/20"
                    style={{ backgroundColor: c }}
                    onClick={async () => {
                      setBoardColor(c);
                      if (!activeId) return;
                      setNotes((cs) => cs.map((x) => (x.id === activeId ? { ...x, color: c } : x)));
                      await saveNow(activeId, { color: c });
                    }}
                  />
                ))}

                {/* Color wheel icon + overlaid native color input */}
                <span className="relative inline-block w-7 h-7" title="Pick any color">
                  <span
                    className="absolute inset-0 rounded-full border border-white/20"
                    style={{ background: 'conic-gradient(#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)' }}
                  />
                  <input
                    type="color"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    value={boardColor}
                    onChange={async (e) => {
                      const hex = e.target.value;
                      setBoardColor(hex); // update editor bg
                      if (!activeId) return;
                      setNotes((cs) => cs.map((x) => (x.id === activeId ? { ...x, color: hex } : x)));
                      await saveNow(activeId, { color: hex }); // persist
                    }}
                  />
                </span>
              </div>



                <Button variant="ghost" onClick={()=>{
                  setIsPinned(p=>!p);
                  if (activeId) debounceSave(activeId,{isPinned:!isPinned},0);
                }}>
                  {isPinned ? 'Unpin' : 'Pin'}
                </Button>
                {activeId && <Button variant="ghost" onClick={()=>deleteNote(activeId)}>Delete</Button>}
              </div>
            </Card>

            <Card className="overflow-hidden">
              <div className="grid md:grid-cols-2 gap-0">
                {/* Editor */}
                <div className="p-4" style={{ backgroundColor: boardColor }}>
                  <textarea
                    ref={taRef}
                    className="w-full h-[60vh] bg-transparent outline-none resize-none text-black"
                    value={content}
                    onChange={e=>setContent(e.target.value)}
                    onBlur={()=> activeId && saveNow(activeId,{ content })}
                    placeholder="Write your note… Markdown + math ($...$, $$...$$)."
                  />
                </div>
                {/* Live Preview */}
                <div className="p-4 border-l border-white/10">
                  <div className="prose prose-invert max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeRaw, rehypeKatex]}
                    >
                      {content || '*Nothing to preview…*'}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        // ===== STICKIES VIEW =====
        <Card className="p-0 overflow-hidden">
          <div
            className="relative min-h-[70vh] rounded-2xl overflow-hidden"
            style={{ background:
              'radial-gradient(1200px 600px at 20% 10%, rgba(255,255,255,.04), transparent 60%), radial-gradient(900px 500px at 90% 20%, rgba(255,255,255,.03), transparent 60%)' }}
          >
            {filtered
              .sort((a,b)=>(a.zIndex||1)-(b.zIndex||1))
              .map(n => (
              <Rnd
                key={n.id}
                default={{ x: n.x, y: n.y, width: n.width, height: n.height }}
                position={{ x: n.x, y: n.y }}
                size={{ width: n.width, height: n.height }}
                bounds="parent"
                style={{ zIndex: n.zIndex }}
                dragHandleClassName="sticky-drag-handle"
                enableUserSelectHack
                grid={[10,10]}
                onDragStart={() => bringToFront(n)}
                onResizeStart={() => bringToFront(n)}
                onDragStop={(_e, d) => {
                  setNotes(cs => cs.map(x => x.id===n.id ? { ...x, x:d.x, y:d.y } : x));
                  debounceSave(n.id, { x:d.x, y:d.y });
                }}
                onResizeStop={(_e, _dir, ref, _delta, pos) => {
                  const w = Math.round(parseFloat(ref.style.width));
                  const h = Math.round(parseFloat(ref.style.height));
                  setNotes(cs => cs.map(x => x.id===n.id ? { ...x, x:pos.x, y:pos.y, width:w, height:h } : x));
                  debounceSave(n.id, { x:pos.x, y:pos.y, width:w, height:h });
                }}
              >
                <StickyCard
                  note={n}
                  onPatch={(patch) => {
                    setNotes(cs => cs.map(x => x.id===n.id ? { ...x, ...patch } : x));
                    debounceSave(n.id, patch, 200);
                  }}
                  onSaveContent={(html) => {
                    // Save content without re-injecting HTML while typing
                    debounceSave(n.id, { content: html }, 300);
                  }}
                  onDelete={() => deleteNote(n.id)}
                  onFocus={() => bringToFront(n)}
                />
              </Rnd>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ---------- Stickies Card (uncontrolled contentEditable) ---------- */
function StickyCard({
  note, onPatch, onSaveContent, onDelete, onFocus
}: {
  note: Note;
  onPatch: (patch: Partial<Note>) => void;
  onSaveContent: (html: string) => void;
  onDelete: () => void;
  onFocus: () => void;
}) {
  const contentRef = useRef<HTMLDivElement|null>(null);

  // Set initial HTML only when switching to a different note
  useEffect(() => {
    if (contentRef.current) contentRef.current.innerHTML = note.content || '';
  }, [note.id]);

  const colorPickerRef = useRef<HTMLInputElement|null>(null);


  return (
    <div className="h-full w-full flex flex-col rounded-xl shadow-[0_12px_30px_rgba(0,0,0,.45)] border border-black/10 overflow-hidden"
         style={{ backgroundColor: note.color }}>
      {/* Drag handle */}
      <div className="sticky-drag-handle flex items-center gap-2 px-3 py-2 bg-black/10 select-none" onMouseDown={onFocus}>
        <input
          className="bg-transparent outline-none text-black/80 placeholder-black/50 font-semibold flex-1"
          defaultValue={note.title}
          onBlur={(e)=> onPatch({ title: e.target.value })}
          onMouseDown={(e)=> e.stopPropagation()}
          placeholder="Title"
        />

        
        {/* <div className="flex items-center gap-1">
          {STICKY_PALETTE.map(c=>(
            <button key={c} className="w-4 h-4 rounded-full border border-black/20"
                    style={{ backgroundColor: c }}
                    onMouseDown={(e)=>e.stopPropagation()}
                    onClick={()=> onPatch({ color: c })} />
          ))}
        </div>

        <button className="ml-2 text-black/60 hover:text-black"
                onMouseDown={(e)=>e.stopPropagation()}
                onClick={onDelete}
                aria-label="Delete">✕</button>
        */}


      <div className="flex items-center gap-1">
        {STICKY_PALETTE.map((c) => (
          <button
            key={c}
            className="w-4 h-4 rounded-full border border-black/20"
            style={{ backgroundColor: c }}
            onMouseDown={(e) => e.stopPropagation()}    // keep header as drag handle
            onClick={() => onPatch({ color: c })}
            title={c}
          />
        ))}

        {/* Color wheel icon + overlaid native color input (same look) */}
        <span
          className="relative inline-block w-5 h-5"
          title="Pick any color"
          onMouseDown={(e) => e.stopPropagation()}      // prevent drag when opening picker
        >
          <span
            className="absolute inset-0 rounded-full border border-black/20"
            style={{ background: 'conic-gradient(#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)' }}
          />
          <input
            type="color"
            className="absolute inset-0 opacity-0 cursor-pointer"
            value={note.color || '#FFF6A5'}
            onChange={(e) => onPatch({ color: e.target.value })} // updates + debounced save
          />
        </span>
      </div>




      </div>

      {/* Content (uncontrolled to preserve caret) */}
      <div
        ref={contentRef}
        className="flex-1 p-3 text-black/90 outline-none overflow-auto leading-relaxed"
        style={{ fontSize: 16, fontFamily: 'ui-sans-serif, system-ui', direction: 'ltr' }}
        contentEditable
        suppressContentEditableWarning
        onMouseDown={(e)=>{ e.stopPropagation(); onFocus(); }}
        onInput={(e)=> {
          const html = (e.target as HTMLDivElement).innerHTML;
          onSaveContent(html);
        }}
      />

      <div className="px-3 py-2 bg-black/5 border-t border-black/10 text-xs text-black/50">
        Drag by header • Snap 10px • Autosave
      </div>
    </div>
  );
}


function ColorWheelButton({
  initial,
  onPick,
  borderClass = 'border-white/20',
  stopPropagation = false,
  size = 20,
}: {
  initial?: string;
  onPick: (hex: string) => void;
  borderClass?: string;
  stopPropagation?: boolean;
  size?: number;
}) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState(initial ?? '#ffffff');
  const btnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => setVal(initial ?? '#ffffff'), [initial]);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!btnRef.current) return;
      if (btnRef.current.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div className="relative inline-block">
      <button
        ref={btnRef}
        className={`rounded-full ${borderClass}`}
        style={{
          width: size,
          height: size,
          background:
            'conic-gradient(#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)',
        }}
        onMouseDown={(e) => stopPropagation && e.stopPropagation()}
        onClick={(e) => {
          if (stopPropagation) e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-label="Pick any color"
        title="Pick any color"
      />
      {open && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 rounded-md bg-[#0b1026] p-2 border border-white/10 shadow-lg">
          <input
            type="color"
            className="w-9 h-9 bg-transparent"
            value={val}
            onChange={(e) => {
              const hex = e.target.value;
              setVal(hex);
              onPick(hex); // save immediately
            }}
          />
        </div>
      )}
    </div>
  );
}




// // ## sticky notes

// 'use client';

// import { useEffect, useMemo, useRef, useState } from 'react';
// import { Rnd } from 'react-rnd';
// import { Button } from '@/components/ui/Button';
// import { Card } from '@/components/ui/Card';
// import { Input } from '@/components/ui/Input';

// type Note = {
//   id: number; title: string; content: string; color: string; isPinned: boolean;
//   x: number; y: number; width: number; height: number; zIndex: number;
//   createdAt: string; updatedAt: string;
// };

// const PALETTE = ['#FFF6A5','#FFD6E7','#D5FFDC','#D6E8FF','#F3D6FF','#FFE9C7','#E7FFD6','#E0E0E0'];

// export default function StickiesPage() {
//   const [notes, setNotes] = useState<Note[]>([]);
//   const [filter, setFilter] = useState('');
//   const [saving, setSaving] = useState<'idle'|'saving'|'saved'>('idle');

//   const maxZ = useMemo(()=> notes.reduce((m,n)=>Math.max(m,n.zIndex||1), 1), [notes]);

//   async function load() {
//     const res = await fetch('/api/notes');
//     const data: Note[] = await res.json();
//     // show pinned first on higher z
//     setNotes(data.sort((a,b)=> (a.zIndex||1) - (b.zIndex||1)));
//   }
//   useEffect(()=>{ load(); }, []);

//   async function createNote() {
//     const res = await fetch('/api/notes', {
//       method: 'POST',
//       headers: {'Content-Type':'application/json'},
//       body: JSON.stringify({
//         title: 'Sticky',
//         content: '',
//         color: '#FFF6A5',
//         x: 60 + Math.round(Math.random()*60),
//         y: 60 + Math.round(Math.random()*40),
//         width: 260,
//         height: 180,
//         zIndex: maxZ + 1
//       })
//     });
//     await res.json();
//     await load();
//   }

//   async function removeNote(id: number) {
//     await fetch(`/api/notes/${id}`, { method: 'DELETE' });
//     await load();
//   }

//   // Debounced save helper
//   const timers = useRef<Record<number, any>>({});
//   function debounceSave(id: number, data: Partial<Note>, delay=350) {
//     setSaving('saving');
//     clearTimeout(timers.current[id]);
//     timers.current[id] = setTimeout(async () => {
//       await fetch(`/api/notes/${id}`, {
//         method: 'PATCH',
//         headers: {'Content-Type':'application/json'},
//         body: JSON.stringify(data)
//       });
//       setSaving('saved');
//       setTimeout(()=>setSaving('idle'), 600);
//     }, delay);
//   }

//   function bringToFront(n: Note) {
//     const next = maxZ + 1;
//     debounceSave(n.id, { zIndex: next }, 0);
//     setNotes(curr => curr.map(x => x.id === n.id ? { ...x, zIndex: next } : x));
//   }

//   const filtered = useMemo(()=>{
//     const q=filter.trim().toLowerCase();
//     if(!q) return notes;
//     return notes.filter(n => (n.title||'').toLowerCase().includes(q) || (n.content||'').toLowerCase().includes(q));
//   }, [notes, filter]);

//   return (
//     <div className="space-y-3">
//       <Card>
//         <div className="flex items-center gap-2">
//           <Button onClick={createNote}>New Sticky</Button>
//           <div className="label">Drag, resize, click to focus. Autosaves.</div>
//           <div className="ml-auto flex items-center gap-2">
//             <Input placeholder="Search…" value={filter} onChange={e=>setFilter(e.target.value)} style={{ width: 240 }}/>
//             <div className="text-xs text-white/70 w-16">{saving==='saving'?'Saving…':saving==='saved'?'Saved':''}</div>
//           </div>
//         </div>
//       </Card>

//       <div className="relative min-h-[70vh] rounded-2xl border border-white/10 overflow-hidden"
//            style={{ background:
//             'radial-gradient(1200px 600px at 20% 10%, rgba(255,255,255,.04), transparent 60%), radial-gradient(900px 500px at 90% 20%, rgba(255,255,255,.03), transparent 60%)' }}>

//         {filtered.map(n => (
//           <Rnd key={n.id}
//                default={{ x: n.x, y: n.y, width: n.width, height: n.height }}
//                position={{ x: n.x, y: n.y }}
//                size={{ width: n.width, height: n.height }}
//                bounds="parent"
//                style={{ zIndex: n.zIndex }}
//                onDragStart={() => bringToFront(n)}
//                onResizeStart={() => bringToFront(n)}
//                onDragStop={(_e, d) => {
//                  setNotes(curr => curr.map(x => x.id===n.id ? { ...x, x: d.x, y: d.y } : x));
//                  debounceSave(n.id, { x: d.x, y: d.y });
//                }}
//                onResizeStop={(_e, _dir, ref, _delta, pos) => {
//                  const w = Math.round(parseFloat(ref.style.width));
//                  const h = Math.round(parseFloat(ref.style.height));
//                  setNotes(curr => curr.map(x => x.id===n.id ? { ...x, x: pos.x, y: pos.y, width: w, height: h } : x));
//                  debounceSave(n.id, { x: pos.x, y: pos.y, width: w, height: h });
//                }}
//           >
//             <Sticky
//               note={n}
//               onFocus={()=>bringToFront(n)}
//               onChange={(patch)=> {
//                 setNotes(curr => curr.map(x => x.id===n.id ? { ...x, ...patch } : x));
//                 debounceSave(n.id, patch);
//               }}
//               onDelete={()=>removeNote(n.id)}
//             />
//           </Rnd>
//         ))}
//       </div>
//     </div>
//   );
// }

// function Sticky({
//   note,
//   onChange,
//   onDelete,
//   onFocus
// }: {
//   note: Note;
//   onChange: (patch: Partial<Note>) => void;
//   onDelete: () => void;
//   onFocus: () => void;
// }) {
//   const contentRef = useRef<HTMLDivElement|null>(null);

//   return (
//     <div className="h-full w-full flex flex-col rounded-xl shadow-[0_12px_30px_rgba(0,0,0,.45)] border border-black/10 overflow-hidden"
//          style={{ backgroundColor: note.color }}>
//       {/* Title bar */}
//       <div className="flex items-center gap-2 px-3 py-2 bg-black/10 cursor-move select-none">
//         <input
//           className="bg-transparent outline-none text-black/80 placeholder-black/50 font-semibold flex-1"
//           value={note.title}
//           onChange={e=>onChange({ title: e.target.value })}
//           onFocus={onFocus}
//           placeholder="Title"
//         />
//         {/* color palette */}
//         <div className="flex items-center gap-1">
//           {PALETTE.map(c=>(
//             <button key={c} className="w-4 h-4 rounded-full border border-black/20"
//                     style={{ backgroundColor: c }} onClick={()=>onChange({ color: c })} />
//           ))}
//         </div>
//         <button className="ml-2 text-black/60 hover:text-black" onClick={onDelete} aria-label="Delete">✕</button>
//       </div>

//       {/* Content (contenteditable) */}
//       <div
//         ref={contentRef}
//         className="flex-1 p-3 text-black/90 outline-none overflow-auto leading-relaxed"
//         contentEditable
//         suppressContentEditableWarning
//         onInput={e=> onChange({ content: (e.target as HTMLDivElement).innerHTML })}
//         onFocus={onFocus}
//         dangerouslySetInnerHTML={{ __html: note.content || '' }}
//         style={{ fontSize: 16, fontFamily: 'ui-sans-serif, system-ui' }}
//       />

//       {/* Footer / mini toolbar */}
//       <div className="px-3 py-2 bg-black/5 border-t border-black/10 flex items-center gap-2">
//         <small className="text-black/50">Drag borders to resize • Click note to bring to front</small>
//         <div className="ml-auto flex items-center gap-2">
//           <TextTool onCmd={cmd => applyInlineCommand(cmd, contentRef, onChange)} />
//         </div>
//       </div>
//     </div>
//   );
// }

// function TextTool({ onCmd }:{ onCmd:(cmd:{type:'bold'|'italic'|'underline'|'smaller'|'bigger'|'color', value?:string})=>void }) {
//   return (
//     <>
//       <button className="px-2 py-1 rounded bg-white/60 text-black hover:bg-white" onClick={()=>onCmd({type:'bold'})}>B</button>
//       <button className="px-2 py-1 rounded bg-white/60 text-black hover:bg-white italic" onClick={()=>onCmd({type:'italic'})}>I</button>
//       <button className="px-2 py-1 rounded bg-white/60 text-black hover:bg-white underline" onClick={()=>onCmd({type:'underline'})}>U</button>
//       <button className="px-2 py-1 rounded bg-white/60 text-black hover:bg-white" onClick={()=>onCmd({type:'smaller'})}>A−</button>
//       <button className="px-2 py-1 rounded bg-white/60 text-black hover:bg-white" onClick={()=>onCmd({type:'bigger'})}>A+</button>
//       <input type="color" className="w-7 h-7 rounded border border-black/20" onChange={e=>onCmd({type:'color', value:e.target.value})}/>
//     </>
//   );
// }

// function applyInlineCommand(
//   cmd: {type:'bold'|'italic'|'underline'|'smaller'|'bigger'|'color', value?:string},
//   ref: React.RefObject<HTMLDivElement>,
//   onChange: (patch: Partial<Note>) => void
// ){
//   const el = ref.current;
//   if (!el) return;
//   el.focus();
//   // Use document.execCommand for quick inline styling (supported in contentEditable)
//   switch (cmd.type) {
//     case 'bold': document.execCommand('bold'); break;
//     case 'italic': document.execCommand('italic'); break;
//     case 'underline': document.execCommand('underline'); break;
//     case 'smaller': document.execCommand('decreaseFontSize'); break;
//     case 'bigger': document.execCommand('increaseFontSize'); break;
//     case 'color': if(cmd.value) document.execCommand('foreColor', false, cmd.value); break;
//   }
//   onChange({ content: el.innerHTML });
// }







//// ##  NOTES

// 'use client';

// import { useEffect, useMemo, useRef, useState } from 'react';
// import { Card } from '@/components/ui/Card';
// import { Button } from '@/components/ui/Button';
// import { Input } from '@/components/ui/Input';
// import ReactMarkdown from 'react-markdown';
// import remarkGfm from 'remark-gfm';
// import remarkMath from 'remark-math';
// import rehypeKatex from 'rehype-katex';
// import rehypeRaw from 'rehype-raw';

// type Note = {
//   id: number;
//   title: string;
//   content: string;
//   color: string;
//   isPinned: boolean;
//   createdAt: string;
//   updatedAt: string;
// };

// const COLORS = ['#ffffff','#fff6a5','#ffd6e7','#d5ffdc','#d6e8ff','#f3d6ff']; // board bg colors
// const TEXT_COLORS = ['#ffffff','#ffd166','#ef476f','#06d6a0','#118ab2','#e0e0e0','#ff9f1c','#2ec4b6','#e71d36','#8d99ae'];
// const FONTS = [
//   { label: 'Default', value: 'inherit' },
//   { label: 'Serif (Georgia)', value: 'Georgia, serif' },
//   { label: 'Sans (Inter/System)', value: 'Inter, system-ui, sans-serif' },
//   { label: 'Mono (Courier)', value: '"Courier New", monospace' },
//   { label: 'Times', value: 'Times, "Times New Roman", serif' },
// ];
// const SIZES = ['12px','14px','16px','18px','20px','24px','28px','32px'];

// export default function NotesPage() {
//   const [notes, setNotes] = useState<Note[]>([]);
//   const [activeId, setActiveId] = useState<number | null>(null);
//   const [title, setTitle] = useState('');
//   const [content, setContent] = useState('');
//   const [color, setColor] = useState('#ffffff');       // board color
//   const [isPinned, setIsPinned] = useState(false);
//   const [filter, setFilter] = useState('');
//   const [mode, setMode] = useState<'edit'|'preview'>('edit');
//   const [saving, setSaving] = useState<'idle'|'saving'|'saved'>('idle');

//   const taRef = useRef<HTMLTextAreaElement|null>(null);

//   async function load() {
//     const res = await fetch('/api/notes');
//     const data = await res.json();
//     setNotes(data);
//     if (data.length && activeId === null) {
//       setActiveId(data[0].id);
//       hydrate(data[0]);
//     }
//   }
//   useEffect(() => { load(); }, []);

//   function hydrate(n: Note) {
//     setTitle(n.title);
//     setContent(n.content);
//     setColor(n.color || '#ffffff');
//     setIsPinned(!!n.isPinned);
//   }

//   const activeNote = useMemo(() => notes.find(n => n.id === activeId) || null, [notes, activeId]);

//   async function createNote() {
//     const res = await fetch('/api/notes', {
//       method: 'POST',
//       headers: {'Content-Type':'application/json'},
//       body: JSON.stringify({ title: 'Untitled', content: '', color: '#ffffff', isPinned: false })
//     });
//     const n = await res.json();
//     await load();
//     setActiveId(n.id);
//     hydrate(n);
//   }

//   async function deleteNote(id: number) {
//     if (!confirm('Delete this note?')) return;
//     await fetch(`/api/notes/${id}`, { method: 'DELETE' });
//     await load();
//     if (activeId === id) {
//       const rest = notes.filter(n => n.id !== id);
//       if (rest[0]) { setActiveId(rest[0].id); hydrate(rest[0]); }
//       else { setActiveId(null); setTitle(''); setContent(''); }
//     }
//   }

//   // --- Formatting helpers (operate on current selection in textarea) ---
//   function replaceSelection(wrapperStart: string, wrapperEnd: string = '') {
//     const ta = taRef.current;
//     if (!ta) return;
//     const { selectionStart, selectionEnd, value } = ta;
//     const start = selectionStart ?? 0;
//     const end = selectionEnd ?? 0;
//     const selected = value.slice(start, end) || 'text';
//     const newValue = value.slice(0, start) + wrapperStart + selected + wrapperEnd + value.slice(end);
//     setContent(newValue);
//     // restore selection after state update
//     requestAnimationFrame(() => {
//       if (!ta) return;
//       const extra = (wrapperStart + selected).length;
//       ta.focus();
//       ta.setSelectionRange(extra, extra);
//     });
//   }
//   function wrapMarkdown(mdStart: string, mdEnd: string = mdStart) {
//     replaceSelection(mdStart, mdEnd);
//   }
//   function applySpanStyle(style: string) {
//     replaceSelection(`<span style="${style}">`, `</span>`);
//   }

//   // Autosave on change (debounced)
//   useEffect(() => {
//     if (!activeId) return;
//     setSaving('saving');
//     const t = setTimeout(async () => {
//       await fetch(`/api/notes/${activeId}`, {
//         method: 'PATCH',
//         headers: {'Content-Type':'application/json'},
//         body: JSON.stringify({ title, content, color, isPinned })
//       });
//       setSaving('saved');
//       setTimeout(() => setSaving('idle'), 800);
//       load();
//     }, 600);
//     return () => clearTimeout(t);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [title, content, color, isPinned, activeId]);

//   const filtered = useMemo(() => {
//     const q = filter.trim().toLowerCase();
//     if (!q) return notes;
//     return notes.filter(n =>
//       (n.title || '').toLowerCase().includes(q) ||
//       (n.content || '').toLowerCase().includes(q)
//     );
//   }, [notes, filter]);

//   return (
//     <div className="grid lg:grid-cols-[320px,1fr] gap-4">
//       {/* Sidebar */}
//       <div className="space-y-3">
//         <Card>
//           <div className="flex gap-2">
//             <Input placeholder="Search notes…" value={filter} onChange={e=>setFilter(e.target.value)} />
//             <Button onClick={createNote}>New</Button>
//           </div>
//         </Card>

//         <div className="space-y-2 max-h-[70vh] overflow-auto pr-1">
//           {filtered.map(n => (
//             <button
//               key={n.id}
//               onClick={() => { setActiveId(n.id); hydrate(n); }}
//               className={`w-full text-left glass p-3 hover:bg-white/20 ${activeId===n.id?'bg-white/20':''}`}
//               style={{ backgroundColor: activeId===n.id ? undefined : 'transparent' }}
//             >
//               <div className="flex items-center justify-between">
//                 <div className="font-semibold truncate">{n.title || 'Untitled'}</div>
//                 <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: n.color || '#ffffff' }} />
//               </div>
//               <div className="text-xs text-white/70 line-clamp-2 mt-1">{(n.content || '').replace(/[#*_`>]/g,'').slice(0,120)}</div>
//               {n.isPinned && <div className="text-[10px] text-white/60 mt-1">📌 Pinned</div>}
//             </button>
//           ))}
//           {filtered.length===0 && <div className="label">No notes yet.</div>}
//         </div>
//       </div>

//       {/* Editor */}
//       <div className="space-y-3">
//         <Card>
//           <div className="flex flex-wrap items-center gap-2">
//             <Input
//               placeholder="Title"
//               value={title}
//               onChange={e=>setTitle(e.target.value)}
//               style={{ maxWidth: 480 }}
//             />
//             <div className="flex items-center gap-1">
//               {COLORS.map(c => (
//                 <button key={c} className="w-6 h-6 rounded-full border border-white/20" style={{ backgroundColor: c }}
//                   onClick={()=>setColor(c)} aria-label={`color ${c}`} />
//               ))}
//             </div>
//             <Button variant="ghost" onClick={()=>setIsPinned(p=>!p)}>{isPinned ? 'Unpin' : 'Pin'}</Button>
//             <div className="ml-auto text-xs text-white/70">
//               {saving==='saving' ? 'Saving…' : saving==='saved' ? 'Saved' : ''}
//             </div>
//             {activeId && <Button variant="ghost" onClick={()=>deleteNote(activeId)}>Delete</Button>}
//           </div>
//         </Card>

//         <Card className="p-0 overflow-hidden">
//           {/* Toolbar */}
//           <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-white/10">
//             {/* Markdown basics */}
//             <Button variant="ghost" onClick={()=>wrapMarkdown('**')}>Bold</Button>
//             <Button variant="ghost" onClick={()=>wrapMarkdown('*')}>Italic</Button>
//             <Button variant="ghost" onClick={()=>replaceSelection('# ')}>H1</Button>
//             <Button variant="ghost" onClick={()=>replaceSelection('## ')}>H2</Button>
//             <Button variant="ghost" onClick={()=>replaceSelection('### ')}>H3</Button>
//             <Button variant="ghost" onClick={()=>wrapMarkdown('`')}>Code</Button>
//             <Button variant="ghost" onClick={()=>replaceSelection('- [ ] ')}>Checklist</Button>

//             <div className="w-px h-6 bg-white/20 mx-1" />

//             {/* Text color */}
//             <div className="flex items-center gap-1">
//               {TEXT_COLORS.map(c=>(
//                 <button
//                   key={c}
//                   className="w-5 h-5 rounded-full border border-white/30"
//                   style={{ backgroundColor: c }}
//                   title={`Color ${c}`}
//                   onClick={()=>applySpanStyle(`color:${c}`)}
//                 />
//               ))}
//               <input
//                 type="color"
//                 className="w-7 h-7 rounded border border-white/20 bg-transparent"
//                 onChange={(e)=>applySpanStyle(`color:${e.target.value}`)}
//                 title="Pick color"
//               />
//             </div>

//             {/* Font family */}
//             <select
//               className="glass px-2 py-1 text-sm"
//               onChange={(e)=>applySpanStyle(`font-family:${e.target.value}`)}
//               defaultValue="inherit"
//               title="Font"
//             >
//               {FONTS.map(f=>(<option key={f.value} value={f.value} className="bg-[#0b1026]">{f.label}</option>))}
//             </select>

//             {/* Font size */}
//             <select
//               className="glass px-2 py-1 text-sm"
//               onChange={(e)=>applySpanStyle(`font-size:${e.target.value}`)}
//               defaultValue="16px"
//               title="Size"
//             >
//               {SIZES.map(s=>(<option key={s} value={s} className="bg-[#0b1026]">{s}</option>))}
//             </select>

//             <div className="ml-auto label">Markdown + inline styles. Preview renders math & styles.</div>
//           </div>

//           {/* Canvas */}
//           <div className="whiteboard p-4 min-h-[60vh]" style={{ backgroundColor: color }}>
//             {mode==='edit' ? (
//               <textarea
//                 ref={taRef}
//                 className="w-full h-[60vh] bg-transparent outline-none resize-none text-black"
//                 value={content}
//                 onChange={e=>setContent(e.target.value)}
//                 placeholder="Write your note… Use toolbar to style selected text."
//               />
//             ) : (
//               <div className="prose prose-invert max-w-none text-black">
//                 <ReactMarkdown
//                   remarkPlugins={[remarkGfm, remarkMath]}
//                   rehypePlugins={[rehypeRaw, rehypeKatex]}
//                 >
//                   {content || '*Nothing to preview…*'}
//                 </ReactMarkdown>
//               </div>
//             )}
//           </div>

//           {/* Edit / Preview toggle */}
//           <div className="flex items-center gap-2 px-4 py-2 border-t border-white/10">
//             <Button variant={mode==='edit'?'primary':'ghost'} onClick={()=>setMode('edit')}>Edit</Button>
//             <Button variant={mode==='preview'?'primary':'ghost'} onClick={()=>setMode('preview')}>Preview</Button>
//           </div>
//         </Card>
//       </div>
//     </div>
//   );
// }
