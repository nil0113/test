import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const notes = await prisma.note.findMany({
    orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
  });
  return NextResponse.json(notes);
}

export async function POST(req: Request) {
  const body = await req.json();
  const note = await prisma.note.create({
    data: {
      title: body.title ?? 'Untitled',
      content: body.content ?? '',
      color: body.color ?? '#ffffff',
      isPinned: !!body.isPinned,
      taskId: body.taskId ?? null,
      subtaskId: body.subtaskId ?? null,
    },
  });
  return NextResponse.json(note);
}
