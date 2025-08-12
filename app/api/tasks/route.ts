import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

async function seedIfEmpty(){
  const count=await prisma.task.count(); if(count>0) return;
  const defaults=[
    { title:'Workout', subs:['Warm-up','Strength x3','Cool down'] },
    { title:'Project 1 — (edit name)', subs:['Literature review','Design experiment','Data collection','Analysis','Write draft'] },
    { title:'Read papers', subs:['Pick 2 papers','Skim & highlight','Write 5 bullets each'] },
    { title:'Advisor meeting prep', subs:['Agenda','Updates','Questions','Next steps'] },
    { title:'Coursework / TA', subs:['Prepare section','Grade batch','Office hours'] },
    { title:'Writing', subs:['Outline','Write 300 words','Revise 300 words'] },
    { title:'Coding experiments', subs:['Implement baseline','Run ablation','Plot results'] }
  ];
  for(const d of defaults){
    const t=await prisma.task.create({ data:{ title:d.title } });
    for(let i=0;i<d.subs.length;i++){ await prisma.subtask.create({ data:{ title:d.subs[i], taskId:t.id, order:i } }); }
  }
}

export async function GET(){ await seedIfEmpty(); const tasks=await prisma.task.findMany({ include:{ subtasks:true }, orderBy:{ id:'desc' } }); return NextResponse.json(tasks); }
export async function POST(req:Request){ const body=await req.json(); const task=await prisma.task.create({ data:{ title: body.title ?? 'Untitled' } }); return NextResponse.json(task); }
