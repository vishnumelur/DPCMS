/**
 * Probe whether AI prefill actually works against the live gateway.
 *
 * Outputs:
 *   - Env presence (without leaking secrets)
 *   - A single AI gateway call result
 *   - Recent ai_call_log entries (last 5)
 *
 * Run:  npx tsx scripts/probe-ai-prefill.ts
 */
import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local', override: true });

async function main() {
  const keyPresent = Boolean(process.env.AI_GATEWAY_API_KEY);
  const model = process.env.AI_MODEL ?? '(unset)';
  console.log('=== AI prefill probe ===');
  console.log('AI_GATEWAY_API_KEY:', keyPresent ? `present (len=${process.env.AI_GATEWAY_API_KEY!.length})` : 'MISSING');
  console.log('AI_MODEL          :', model);

  if (!keyPresent) {
    console.log('STOP: gateway key missing — prefill will use deterministic fallback.');
    return;
  }

  console.log('\n--- gateway live-call (single prompt) ---');
  try {
    const { generateText } = await import('ai');
    const t0 = Date.now();
    const result = await generateText({
      model,
      messages: [
        { role: 'system', content: 'You answer in strict JSON.' },
        { role: 'user', content: 'Return {"hello":"world"} only.' },
      ],
    });
    const ms = Date.now() - t0;
    console.log(`OK · ${ms}ms`);
    console.log('text         :', JSON.stringify(result.text).slice(0, 200));
    console.log('usage.in/out :', result.usage?.inputTokens, '/', result.usage?.outputTokens);
    console.log('finish reason:', (result as { finishReason?: string }).finishReason);
  } catch (err) {
    console.error('FAIL:', err instanceof Error ? err.message : String(err));
    console.error('stack:', err instanceof Error ? err.stack : '');
    return;
  }

  console.log('\n--- recent ai_call_log rows ---');
  try {
    const { db } = await import('@/db/client');
    const { aiCallLog } = await import('@/db/schema');
    const { desc } = await import('drizzle-orm');
    const rows = await db
      .select({
        id: aiCallLog.id,
        purpose: aiCallLog.purpose,
        model: aiCallLog.model,
        promptTokens: aiCallLog.promptTokens,
        completionTokens: aiCallLog.completionTokens,
        createdAt: aiCallLog.ts,
      })
      .from(aiCallLog)
      .orderBy(desc(aiCallLog.ts))
      .limit(5);
    if (rows.length === 0) {
      console.log('(none — no AI calls have been logged yet)');
    } else {
      for (const r of rows) {
        console.log(
          `${new Date(r.createdAt).toISOString()}  ${r.purpose.padEnd(28)}  ${r.model.padEnd(28)}  in=${r.promptTokens ?? '-'} out=${r.completionTokens ?? '-'}`,
        );
      }
    }
  } catch (err) {
    console.error('ai_call_log query failed:', err instanceof Error ? err.message : String(err));
  }
}

main().then(() => process.exit(0));
