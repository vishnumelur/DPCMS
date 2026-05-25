import { generateText, type ModelMessage } from 'ai';
import { db } from '@/db/client';
import { aiCallLog } from '@/db/schema';
import { env } from '@/lib/env';
import { redactPII } from './redact';

export type AiCallContext = { orgId: string; purpose: string };

export async function aiGenerateText(
  ctx: AiCallContext,
  messages: ModelMessage[],
): Promise<string> {
  const redactedMessages = messages.map((m) => ({
    ...m,
    content: typeof m.content === 'string' ? redactPII(m.content) : m.content,
  })) as ModelMessage[];

  const result = await generateText({
    model: env.AI_MODEL,
    messages: redactedMessages,
  });

  await db.insert(aiCallLog).values({
    orgId: ctx.orgId,
    model: env.AI_MODEL,
    purpose: ctx.purpose,
    promptRedacted: redactedMessages,
    responseRedacted: { text: redactPII(result.text) },
    promptTokens: result.usage?.inputTokens ?? null,
    completionTokens: result.usage?.outputTokens ?? null,
  });

  return result.text;
}
