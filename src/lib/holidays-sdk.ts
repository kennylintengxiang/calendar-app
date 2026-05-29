/**
 * Holiday fetching using z-ai-web-dev-sdk
 * This file is only imported in the sandbox environment (not on Vercel)
 * because the SDK is not available on Vercel.
 */

export async function fetchHolidaysWithSDK(year: number): Promise<Array<{ date: string; name: string; type: string; year: number }>> {
  // Dynamic import - z-ai-web-dev-sdk is only available in sandbox
  const ZAI = (await import('z-ai-web-dev-sdk')).default;
  const zai = await ZAI.create();

  // Search for Chinese holiday schedule
  const searchQuery = `中国${year}年放假安排`;
  const searchResults = await zai.functions.invoke('web_search', {
    query: searchQuery,
    num: 10
  });

  // Use LLM to parse the search results into structured holiday data
  const searchContext = searchResults
    .map((r: { name?: string; snippet?: string }) =>
      `${r.name || ''}: ${r.snippet || ''}`
    )
    .join('\n');

  const prompt = `Based on the following search results about Chinese holiday schedule for ${year}, extract all holiday dates and makeup workday dates into a structured JSON array.

Rules:
- Each entry should have: date (YYYY-MM-DD format), name (Chinese holiday name), type ("holiday" for days off, "workday" for makeup/调休 days), year (${year})
- Include all official holidays: 元旦, 春节, 清明节, 劳动节, 端午节, 中秋节, 国庆节
- Include all 调休 (makeup workdays) as type "workday"
- Be accurate with dates, cross-reference multiple sources if available

Search results:
${searchContext}

Return ONLY a valid JSON array, no other text. Example format:
[{"date":"${year}-01-01","name":"元旦","type":"holiday","year":${year}}]`;

  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: 'assistant',
        content: 'You are a data extraction assistant. Return only valid JSON arrays as instructed, with no additional text or markdown formatting.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    thinking: { type: 'disabled' }
  });
  const llmResponse = completion.choices[0]?.message?.content || '';

  // Parse the LLM response - extract JSON from the response
  const jsonMatch = llmResponse.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  } else {
    throw new Error('No JSON array found in LLM response');
  }
}
