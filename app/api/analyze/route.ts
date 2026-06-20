import { NextResponse } from 'next/server';
import { z } from 'zod';
import { analyzeRepository } from '@/lib/analyzer';

export const runtime = 'nodejs';
export const maxDuration = 60;

const payloadSchema = z.object({
  repoUrl: z
    .string()
    .url()
    .refine(
      (value: string) => value.includes('github.com/'),
      'Only GitHub repository URLs are supported.'
    ),
  force: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { repoUrl, force } = payloadSchema.parse(body);
    const graph = await analyzeRepository(repoUrl, force);
    return NextResponse.json(graph);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected analyzer failure.';

    if (message.startsWith('ICE:')) {
      return NextResponse.json({ error: message, isPrivate: true }, { status: 403 });
    }

    const status = error instanceof z.ZodError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
