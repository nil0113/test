import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
type Params={ params:{ id:string } };
export async function POST(req:Request,{params}:Params){
  const taskId=Number(params.id); const body=await req.json();
  const st=await prisma.subtask.create({ data:{ title: body.title ?? 'Untitled subtask', taskId } });
  return NextResponse.json(st);
}
