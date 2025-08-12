import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req:Request){
  const body=await req.json();
  if(body.action==='start'){
    const startedAt=new Date();
    const s=await prisma.session.create({ data:{ startedAt, type: body.type ?? 'track', taskId: body.taskId ?? null, subtaskId: body.subtaskId ?? null } });
    return NextResponse.json({ id: s.id, startedAt });
  }
  if(body.action==='stop'){
    const id=Number(body.id); const elapsed=Number(body.elapsed ?? 0); const endedAt=new Date();
    const s=await prisma.session.update({ where:{ id }, data:{ endedAt, durationSec: Math.max(elapsed,0) } });
    return NextResponse.json({ ok:true, id: s.id });
  }
  if(body.action==='complete'){
    const now=new Date();
    await prisma.session.create({ data:{ startedAt: now, endedAt: now, durationSec: 0, type:'complete', taskId: body.taskId ?? null, subtaskId: body.subtaskId ?? null } });
    return NextResponse.json({ ok:true });
  }
  return NextResponse.json({ error:'unknown action' },{ status:400 });
}
