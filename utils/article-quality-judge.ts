/**
 * article-quality-judge.ts
 *
 * LLM-as-a-judge for "is this real meaningful article content, or is it
 * an error / empty / fallback / nonsense blob?". Used by the
 * contentQuality spec to catch the failure mode the user reported
 * repeatedly: the modal opens but the body is junk — 3 random words,
 * an "offline" notice, a Datawrapper "content blocked" page, or a
 * one-line fallback message. Functional tests don't catch this because
 * the modal is technically "loaded" and has "some" text.
 *
 * Provider selection reuses the existing model-registry rotation
 * (Groq → others) from utils/llm-judges.ts.
 */

import { request } from '@playwright/test';
import { resolveAllProviders, getProviderSummary } from './model-registry';

export interface ArticleQualityVerdict {
  isReal: boolean;
  score: 1 | 2 | 3 | 4 | 5;
  reasoning: string;
  judgeUsed: string; // "providerName:model" of the judge that ran, or "" on failure
}

const SYSTEM_PROMPT = `You are a content-quality classifier. You receive raw text extracted from an article modal on a news/blog site. Decide whether the text contains a real, meaningful article body OR whether it is some failure state.

Score on this exact scale:
- 5 = substantive article body, multiple coherent paragraphs on a clear topic
- 4 = short but legitimate article (intro + 1-2 paragraphs)
- 3 = mostly real content but truncated / partial / mostly the header
- 2 = error message, fallback notice, "preview unavailable", "loading...", offline
- 1 = empty, gibberish, random unrelated words, single header with no body

Treat scores 4-5 as PASS (isReal=true). Treat 1-3 as FAIL (isReal=false).

The user wants tests to catch the 1-3 cases. Be strict. A title plus one boilerplate sentence is NOT acceptable. Real article = informative paragraphs about a topic.

Respond ONLY with strict JSON, no markdown:
{"score": 1-5, "isReal": true/false, "reasoning": "1-2 sentences explaining the classification"}`;

const PASSING = 4;

function clip(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + ' …[truncated]' : s;
}

/**
 * Run the content-quality judge. If no providers are reachable, returns
 * a fail with reasoning. Never throws.
 */
export async function runArticleQualityJudge(
  articleTitle: string,
  articleSource: string,
  articleBodyText: string,
): Promise<ArticleQualityVerdict> {
  const providers = await resolveAllProviders('M');
  if (providers.length === 0) {
    const summary = await getProviderSummary();
    return {
      isReal: false,
      score: 1,
      reasoning: `No usable judge provider — cannot evaluate. ${summary}`,
      judgeUsed: '',
    };
  }

  const userPayload = [
    `ARTICLE TITLE: ${clip(articleTitle, 200)}`,
    `SOURCE LABEL: ${clip(articleSource, 80)}`,
    `RAW MODAL BODY TEXT (everything user can see inside the modal):`,
    '---BEGIN---',
    clip(articleBodyText, 6000),
    '---END---',
    '',
    'Classify per the scale. Reply JSON only.',
  ].join('\n');

  let lastReason = '';
  for (const { baseUrl, model, headers, providerName } of providers) {
    const tag = `${providerName}:${model}`;
    console.log(`[article-quality-judge] via ${tag} — title="${clip(articleTitle, 60)}"`);
    const reqContext = await request.newContext();
    try {
      const resp = await reqContext.post(baseUrl, {
        headers,
        data: {
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPayload },
          ],
          temperature: 0,
          response_format: { type: 'json_object' },
        },
      });
      const text = await resp.text();
      if (!resp.ok()) {
        lastReason = `${tag} HTTP ${resp.status()}: ${clip(text, 200)}`;
        continue;
      }
      const json = JSON.parse(text);
      const content = json?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') {
        lastReason = `${tag} no message.content in response`;
        continue;
      }
      const parsed = JSON.parse(content);
      const rawScore = Number(parsed.score);
      const score = (Number.isFinite(rawScore) ? Math.max(1, Math.min(5, Math.round(rawScore))) : 1) as 1 | 2 | 3 | 4 | 5;
      const isReal = typeof parsed.isReal === 'boolean' ? parsed.isReal : score >= PASSING;
      return {
        score,
        isReal,
        reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning.slice(0, 500) : 'No reasoning provided.',
        judgeUsed: tag,
      };
    } catch (e) {
      lastReason = `${tag} threw ${String(e).slice(0, 200)}`;
    } finally {
      await reqContext.dispose();
    }
  }

  return {
    isReal: false,
    score: 1,
    reasoning: `All judge providers failed. Last: ${lastReason}`,
    judgeUsed: '',
  };
}
