import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
export async function GET(){
  const sessions=await prisma.session.findMany({ include:{ task:true, subtask:true }, orderBy:{ id:'desc' }, take:50 });
  const rows=sessions.map(s=>({ id:s.id, type:s.type, minutes: Math.round((s.durationSec ?? 0)/60), date: s.startedAt.toLocaleString(), taskTitle: s.task?.title ?? null, subtaskTitle: s.subtask?.title ?? null }));
  return NextResponse.json(rows);
}
