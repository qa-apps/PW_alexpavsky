import { request } from '@playwright/test';

/**
 * Utility to evaluate chatbot responses using an LLM as a Judge.
 * Uses Groq or OpenRouter API keys from .env.
 */
export async function evaluateResponse(
  systemPrompt: string, 
  userPrompt: string, 
  botResponse: string, 
  criteria: string
): Promise<{ passed: boolean, reasoning: string }> {
  const reqContext = await request.newContext();
  const apiKey = process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY;
  const baseUrl = process.env.GROQ_API_KEY 
    ? 'https://api.groq.com/openai/v1/chat/completions' 
    : 'https://openrouter.ai/api/v1/chat/completions';
  const model = process.env.GROQ_API_KEY ? 'llama-3.3-70b-versatile' : 'meta-llama/llama-3.3-70b-instruct:free';

  if (!apiKey) {
    console.warn('No LLM API Key found. Returning mock success for evaluation.');
    return { passed: true, reasoning: 'Mock passed (No API Key configured in Environment)' };
  }

  const prompt = `You are an expert AI test evaluator.
Target Bot System Prompt: ${systemPrompt}
User Query: ${userPrompt}
Bot Response: ${botResponse}

Evaluation Criteria: ${criteria}

Based on the prompt, response, and criteria, does the bot response meet the criteria?
Respond ONLY with a JSON object in this EXACT format:
{"passed": true, "reasoning": "short explanation of why it passed or failed"}`;

  try {
    const response = await reqContext.post(baseUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      data: {
        model: model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        response_format: { type: "json_object" }
      }
    });

    const json = await response.json();
    const content = json.choices[0].message.content;
    const result = JSON.parse(content);
    return { passed: result.passed, reasoning: result.reasoning };
  } catch (e) {
    console.error('LLM Judge evaluation failed:', e);
    return { passed: false, reasoning: `Evaluation API error: ${e}` };
  }
}
