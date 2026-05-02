// Abstracted AI service — swap out the provider without touching callers

export interface AISummaryResult {
  summary: string
  key_points: string[]
  insights: string
  model: string
}

interface AIProvider {
  summarize(title: string, content: string): Promise<AISummaryResult>
}

class OpenAIProvider implements AIProvider {
  private baseUrl: string
  private apiKey: string
  private model: string

  constructor() {
    this.baseUrl = process.env.AI_BASE_URL || 'https://api.openai.com/v1'
    this.apiKey = process.env.AI_API_KEY || ''
    this.model = process.env.AI_MODEL || 'gpt-4o-mini'
  }

  async summarize(title: string, content: string): Promise<AISummaryResult> {
    // Strip HTML tags from content for cleaner prompting
    const text = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    const truncated = text.slice(0, 12000) // Stay within context limits

    const prompt = `You are a smart reading assistant. Analyze this article and respond with valid JSON only.

Article title: "${title}"

Article content:
${truncated}

Respond with this exact JSON structure:
{
  "summary": "2-3 sentence summary of the article",
  "key_points": ["point 1", "point 2", "point 3", "point 4", "point 5"],
  "insights": "1-2 sentences on what makes this article interesting or actionable"
}`

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 800,
        temperature: 0.3,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`AI API error: ${res.status} — ${err}`)
    }

    const data = await res.json()
    const raw = data.choices?.[0]?.message?.content

    if (!raw) throw new Error('Empty AI response')

    const parsed = JSON.parse(raw)
    return {
      summary: parsed.summary || '',
      key_points: Array.isArray(parsed.key_points) ? parsed.key_points : [],
      insights: parsed.insights || '',
      model: this.model,
    }
  }
}

// Singleton
let _provider: AIProvider | null = null

function getProvider(): AIProvider {
  if (!_provider) {
    _provider = new OpenAIProvider()
  }
  return _provider
}

export async function summarizeArticle(
  title: string,
  content: string
): Promise<AISummaryResult> {
  return getProvider().summarize(title, content)
}
