'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, NotebookPen, BarChart3, Settings } from 'lucide-react';
const nav=[{href:'/',label:'Dashboard',icon:Home},{href:'/tasks',label:'Tasks',icon:NotebookPen},{href:'/history',label:'History',icon:BarChart3},{href:'/settings',label:'Settings',icon:Settings}];
export default function Header(){
  const pathname=usePathname();
  return(<header className="sticky top-0 z-50 backdrop-blur border-b border-white/10">
    <div className="container py-4 flex items-center justify-between">
      <Link href="/" className="text-xl font-bold flex items-center gap-2"><span className="inline-block w-2.5 h-2.5 rounded-full bg-brand-500 animate-pulse" />LifeOS Academic</Link>
      <nav className="hidden md:flex items-center gap-1">
        {nav.map(i=>{const Icon=i.icon;const active=pathname===i.href;return(<Link key={i.href} href={i.href} className={`glass px-4 py-2 flex items-center gap-2 transition ${active?'bg-white/20':'hover:bg-white/20'}`}><Icon size={18}/><span className="text-sm">{i.label}</span></Link>);})}
      </nav>
    </div>
  </header>);
}
