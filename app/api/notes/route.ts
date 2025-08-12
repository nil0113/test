// app/api/notes/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const notes = await prisma.note.findMany({
    orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
  });
  return NextResponse.json(notes);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const note = await prisma.note.create({
    data: {
      title: body.title ?? 'Untitled',
      content: body.content ?? '',
      color: body.color ?? '#ffffff',
      isPinned: !!body.isPinned,
      // layout defaults for Stickies
      x: typeof body.x === 'number' ? body.x : 60,
      y: typeof body.y === 'number' ? body.y : 60,
      width: typeof body.width === 'number' ? body.width : 320,
      height: typeof body.height === 'number' ? body.height : 220,
      zIndex: typeof body.zIndex === 'number' ? body.zIndex : 1,
      // optional linkage
      taskId: body.taskId ?? null,
      subtaskId: body.subtaskId ?? null,
    },
  });

  return NextResponse.json(note);
}
