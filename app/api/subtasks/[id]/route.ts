import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
type Params={ params:{ id:string } };
export async function PATCH(req:Request,{params}:Params){
  const id=Number(params.id); const body=await req.json();
  const st=await prisma.subtask.update({ where:{ id }, data:{ ...body } });
  return NextResponse.json(st);
}
export async function DELETE(_req:Request,{params}:Params){
  const id=Number(params.id);
  await prisma.session.deleteMany({ where:{ subtaskId:id } });
  await prisma.subtask.delete({ where:{ id } });
  return NextResponse.json({ ok:true });
}
