import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
type Params={ params:{ id:string } };

export async function PATCH(req:Request,{params}:Params){
  const id=Number(params.id); const body=await req.json();
  if(body.status==='doing'){ await prisma.task.updateMany({ data:{ status:'todo' }, where:{ status:'doing' } }); }
  const task=await prisma.task.update({ where:{ id }, data:{ ...body } });
  return NextResponse.json(task);
}
export async function DELETE(_req:Request,{params}:Params){
  const id=Number(params.id);
  await prisma.session.deleteMany({ where:{ taskId:id } });
  await prisma.subtask.deleteMany({ where:{ taskId:id } });
  await prisma.task.delete({ where:{ id } });
  return NextResponse.json({ ok:true });
}
