import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
export async function GET(){
  const now=new Date(); const out:{month:string;minutes:number}[]=[];
  for(let i=11;i>=0;i--){ const d=new Date(now.getFullYear(), now.getMonth()-i, 1); const start=new Date(d.getFullYear(),d.getMonth(),1); const end=new Date(d.getFullYear(),d.getMonth()+1,0,23,59,59,999);
    const sessions=await prisma.session.findMany({ where:{ startedAt:{ gte:start, lte:end }, type:'focus' } });
    const totalSec=sessions.reduce((acc,s)=>acc+(s.durationSec??0),0); const label=`${start.toLocaleString('default',{month:'short'})}`; out.push({ month:label, minutes: Math.round(totalSec/60) }); }
  return NextResponse.json(out);
}
