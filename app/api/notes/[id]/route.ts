import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type Params = { params: { id: string } };

export async function GET(_req: Request, { params }: Params) {
  const id = Number(params.id);
  const note = await prisma.note.findUnique({ where: { id } });
  return NextResponse.json(note);
}

export async function PATCH(req: Request, { params }: Params) {
  const id = Number(params.id);
  const body = await req.json();
  const note = await prisma.note.update({
    where: { id },
    data: {
      title: body.title,
      content: body.content,
      color: body.color,
      isPinned: body.isPinned,
      taskId: body.taskId ?? null,
      subtaskId: body.subtaskId ?? null,
    },
  });
  return NextResponse.json(note);
}

export async function DELETE(_req: Request, { params }: Params) {
  const id = Number(params.id);
  await prisma.note.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
