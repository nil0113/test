



'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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
  createdAt: string;
  updatedAt: string;
};

const COLORS = ['#ffffff','#fff6a5','#ffd6e7','#d5ffdc','#d6e8ff','#f3d6ff']; // board bg colors
const TEXT_COLORS = ['#ffffff','#ffd166','#ef476f','#06d6a0','#118ab2','#e0e0e0','#ff9f1c','#2ec4b6','#e71d36','#8d99ae'];
const FONTS = [
  { label: 'Default', value: 'inherit' },
  { label: 'Serif (Georgia)', value: 'Georgia, serif' },
  { label: 'Sans (Inter/System)', value: 'Inter, system-ui, sans-serif' },
  { label: 'Mono (Courier)', value: '"Courier New", monospace' },
  { label: 'Times', value: 'Times, "Times New Roman", serif' },
];
const SIZES = ['12px','14px','16px','18px','20px','24px','28px','32px'];

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState('#ffffff');       // board color
  const [isPinned, setIsPinned] = useState(false);
  const [filter, setFilter] = useState('');
  const [mode, setMode] = useState<'edit'|'preview'>('edit');
  const [saving, setSaving] = useState<'idle'|'saving'|'saved'>('idle');

  const taRef = useRef<HTMLTextAreaElement|null>(null);

  async function load() {
    const res = await fetch('/api/notes');
    const data = await res.json();
    setNotes(data);
    if (data.length && activeId === null) {
      setActiveId(data[0].id);
      hydrate(data[0]);
    }
  }
  useEffect(() => { load(); }, []);

  function hydrate(n: Note) {
    setTitle(n.title);
    setContent(n.content);
    setColor(n.color || '#ffffff');
    setIsPinned(!!n.isPinned);
  }

  const activeNote = useMemo(() => notes.find(n => n.id === activeId) || null, [notes, activeId]);

  async function createNote() {
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ title: 'Untitled', content: '', color: '#ffffff', isPinned: false })
    });
    const n = await res.json();
    await load();
    setActiveId(n.id);
    hydrate(n);
  }

  async function deleteNote(id: number) {
    if (!confirm('Delete this note?')) return;
    await fetch(`/api/notes/${id}`, { method: 'DELETE' });
    await load();
    if (activeId === id) {
      const rest = notes.filter(n => n.id !== id);
      if (rest[0]) { setActiveId(rest[0].id); hydrate(rest[0]); }
      else { setActiveId(null); setTitle(''); setContent(''); }
    }
  }

  // --- Formatting helpers (operate on current selection in textarea) ---
  function replaceSelection(wrapperStart: string, wrapperEnd: string = '') {
    const ta = taRef.current;
    if (!ta) return;
    const { selectionStart, selectionEnd, value } = ta;
    const start = selectionStart ?? 0;
    const end = selectionEnd ?? 0;
    const selected = value.slice(start, end) || 'text';
    const newValue = value.slice(0, start) + wrapperStart + selected + wrapperEnd + value.slice(end);
    setContent(newValue);
    // restore selection after state update
    requestAnimationFrame(() => {
      if (!ta) return;
      const extra = (wrapperStart + selected).length;
      ta.focus();
      ta.setSelectionRange(extra, extra);
    });
  }
  function wrapMarkdown(mdStart: string, mdEnd: string = mdStart) {
    replaceSelection(mdStart, mdEnd);
  }
  function applySpanStyle(style: string) {
    replaceSelection(`<span style="${style}">`, `</span>`);
  }

  // Autosave on change (debounced)
  useEffect(() => {
    if (!activeId) return;
    setSaving('saving');
    const t = setTimeout(async () => {
      await fetch(`/api/notes/${activeId}`, {
        method: 'PATCH',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ title, content, color, isPinned })
      });
      setSaving('saved');
      setTimeout(() => setSaving('idle'), 800);
      load();
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, color, isPinned, activeId]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(n =>
      (n.title || '').toLowerCase().includes(q) ||
      (n.content || '').toLowerCase().includes(q)
    );
  }, [notes, filter]);

  return (
    <div className="grid lg:grid-cols-[320px,1fr] gap-4">
      {/* Sidebar */}
      <div className="space-y-3">
        <Card>
          <div className="flex gap-2">
            <Input placeholder="Search notes…" value={filter} onChange={e=>setFilter(e.target.value)} />
            <Button onClick={createNote}>New</Button>
          </div>
        </Card>

        <div className="space-y-2 max-h-[70vh] overflow-auto pr-1">
          {filtered.map(n => (
            <button
              key={n.id}
              onClick={() => { setActiveId(n.id); hydrate(n); }}
              className={`w-full text-left glass p-3 hover:bg-white/20 ${activeId===n.id?'bg-white/20':''}`}
              style={{ backgroundColor: activeId===n.id ? undefined : 'transparent' }}
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold truncate">{n.title || 'Untitled'}</div>
                <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: n.color || '#ffffff' }} />
              </div>
              <div className="text-xs text-white/70 line-clamp-2 mt-1">{(n.content || '').replace(/[#*_`>]/g,'').slice(0,120)}</div>
              {n.isPinned && <div className="text-[10px] text-white/60 mt-1">📌 Pinned</div>}
            </button>
          ))}
          {filtered.length===0 && <div className="label">No notes yet.</div>}
        </div>
      </div>

      {/* Editor */}
      <div className="space-y-3">
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Title"
              value={title}
              onChange={e=>setTitle(e.target.value)}
              style={{ maxWidth: 480 }}
            />
            <div className="flex items-center gap-1">
              {COLORS.map(c => (
                <button key={c} className="w-6 h-6 rounded-full border border-white/20" style={{ backgroundColor: c }}
                  onClick={()=>setColor(c)} aria-label={`color ${c}`} />
              ))}
            </div>
            <Button variant="ghost" onClick={()=>setIsPinned(p=>!p)}>{isPinned ? 'Unpin' : 'Pin'}</Button>
            <div className="ml-auto text-xs text-white/70">
              {saving==='saving' ? 'Saving…' : saving==='saved' ? 'Saved' : ''}
            </div>
            {activeId && <Button variant="ghost" onClick={()=>deleteNote(activeId)}>Delete</Button>}
          </div>
        </Card>

        <Card className="p-0 overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-white/10">
            {/* Markdown basics */}
            <Button variant="ghost" onClick={()=>wrapMarkdown('**')}>Bold</Button>
            <Button variant="ghost" onClick={()=>wrapMarkdown('*')}>Italic</Button>
            <Button variant="ghost" onClick={()=>replaceSelection('# ')}>H1</Button>
            <Button variant="ghost" onClick={()=>replaceSelection('## ')}>H2</Button>
            <Button variant="ghost" onClick={()=>replaceSelection('### ')}>H3</Button>
            <Button variant="ghost" onClick={()=>wrapMarkdown('`')}>Code</Button>
            <Button variant="ghost" onClick={()=>replaceSelection('- [ ] ')}>Checklist</Button>

            <div className="w-px h-6 bg-white/20 mx-1" />

            {/* Text color */}
            <div className="flex items-center gap-1">
              {TEXT_COLORS.map(c=>(
                <button
                  key={c}
                  className="w-5 h-5 rounded-full border border-white/30"
                  style={{ backgroundColor: c }}
                  title={`Color ${c}`}
                  onClick={()=>applySpanStyle(`color:${c}`)}
                />
              ))}
              <input
                type="color"
                className="w-7 h-7 rounded border border-white/20 bg-transparent"
                onChange={(e)=>applySpanStyle(`color:${e.target.value}`)}
                title="Pick color"
              />
            </div>

            {/* Font family */}
            <select
              className="glass px-2 py-1 text-sm"
              onChange={(e)=>applySpanStyle(`font-family:${e.target.value}`)}
              defaultValue="inherit"
              title="Font"
            >
              {FONTS.map(f=>(<option key={f.value} value={f.value} className="bg-[#0b1026]">{f.label}</option>))}
            </select>

            {/* Font size */}
            <select
              className="glass px-2 py-1 text-sm"
              onChange={(e)=>applySpanStyle(`font-size:${e.target.value}`)}
              defaultValue="16px"
              title="Size"
            >
              {SIZES.map(s=>(<option key={s} value={s} className="bg-[#0b1026]">{s}</option>))}
            </select>

            <div className="ml-auto label">Markdown + inline styles. Preview renders math & styles.</div>
          </div>

          {/* Canvas */}
          <div className="whiteboard p-4 min-h-[60vh]" style={{ backgroundColor: color }}>
            {mode==='edit' ? (
              <textarea
                ref={taRef}
                className="w-full h-[60vh] bg-transparent outline-none resize-none text-white/90"
                value={content}
                onChange={e=>setContent(e.target.value)}
                placeholder="Write your note… Use toolbar to style selected text."
              />
            ) : (
              <div className="prose prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeRaw, rehypeKatex]}
                >
                  {content || '*Nothing to preview…*'}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {/* Edit / Preview toggle */}
          <div className="flex items-center gap-2 px-4 py-2 border-t border-white/10">
            <Button variant={mode==='edit'?'primary':'ghost'} onClick={()=>setMode('edit')}>Edit</Button>
            <Button variant={mode==='preview'?'primary':'ghost'} onClick={()=>setMode('preview')}>Preview</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
