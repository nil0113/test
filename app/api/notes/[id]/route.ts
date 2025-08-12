// app/api/notes/[id]/route.ts
export const runtime = 'nodejs';

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
  const body = await req.json().catch(() => ({}));

  const data: any = {};
  if ('title' in body) data.title = body.title ?? '';
  if ('content' in body) data.content = body.content ?? '';
  if ('color' in body) data.color = body.color ?? '#ffffff';
  if ('isPinned' in body) data.isPinned = !!body.isPinned;

  if ('x' in body) data.x = Number(body.x);
  if ('y' in body) data.y = Number(body.y);
  if ('width' in body) data.width = Number(body.width);
  if ('height' in body) data.height = Number(body.height);
  if ('zIndex' in body) data.zIndex = Number(body.zIndex);

  if ('taskId' in body) data.taskId = body.taskId ?? null;
  if ('subtaskId' in body) data.subtaskId = body.subtaskId ?? null;

  const note = await prisma.note.update({ where: { id }, data });
  return NextResponse.json(note);
}

export async function DELETE(_req: Request, { params }: Params) {
  const id = Number(params.id);
  await prisma.note.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
