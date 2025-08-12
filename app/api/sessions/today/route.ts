import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
export async function GET(){
  const now=new Date(); const start=new Date(now.getFullYear(),now.getMonth(),now.getDate(),0,0,0,0); const end=new Date(now.getFullYear(),now.getMonth(),now.getDate(),23,59,59,999);
  const sessions=await prisma.session.findMany({ where:{ startedAt:{ gte:start, lte:end } } });
  const focusSec=sessions.filter(s=>s.type==='focus').reduce((a,b)=>a+(b.durationSec??0),0);
  const trackSec=sessions.filter(s=>s.type==='track').reduce((a,b)=>a+(b.durationSec??0),0);
  return NextResponse.json({ focusMin: Math.round(focusSec/60), trackMin: Math.round(trackSec/60), sessions: sessions.length });
}
