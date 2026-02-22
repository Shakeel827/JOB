const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const FREE_MODEL = "meta-llama/llama-3.2-3b-instruct:free";
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 min
const cache = new Map<string, { value: string; expiry: number }>();

function cacheKey(prefix: string, input: string): string {
  return prefix + ":" + input.slice(0, 500);
}

function getCached(key: string): string | null {
  const entry = cache.get(key);
  if (!entry || Date.now() > entry.expiry) return null;
  return entry.value;
}

function setCache(key: string, value: string) {
  cache.set(key, { value, expiry: Date.now() + CACHE_TTL_MS });
}

export async function chatWithAI(messages: { role: "user" | "assistant"; content: string }[], skipCache = false): Promise<string> {
  const key = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!key) {
    return "AI is not configured. Add VITE_OPENROUTER_API_KEY to your .env file.";
  }
  const cacheKeyStr = !skipCache && messages.length === 1 ? cacheKey("chat", messages[0].content) : null;
  if (cacheKeyStr) {
    const cached = getCached(cacheKeyStr);
    if (cached) return cached;
  }
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "",
    },
    body: JSON.stringify({
      model: FREE_MODEL,
      messages,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    return `Error: ${res.status} ${err}`;
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content ?? "No response.";
  if (cacheKeyStr) setCache(cacheKeyStr, content);
  return content;
}

export async function getResumeScoreFeedback(resumeText: string): Promise<string> {
  return chatWithAI([
    {
      role: "user",
      content: `You are a career coach. Briefly analyze this resume text and give a short score out of 100 and 3 bullet-point improvements. Keep response under 200 words.\n\nResume:\n${resumeText.slice(0, 3000)}`,
    },
  ]);
}

export async function getSkillGapAnalysis(skills: string[], targetRole: string): Promise<string> {
  return chatWithAI([
    {
      role: "user",
      content: `You are a career advisor. Given skills: ${skills.join(", ")} and target role: ${targetRole}, list 3-5 skill gaps and one learning tip for each. Keep under 150 words.`,
    },
  ]);
}

export async function getJobDescriptionSuggestion(title: string, company: string): Promise<string> {
  return chatWithAI([
    {
      role: "user",
      content: `Write a short job description (2-3 paragraphs) for: ${title} at ${company}. Include responsibilities and requirements. Keep under 250 words.`,
    },
  ]);
}

export async function getResumeSummary(resumeText: string): Promise<string> {
  return chatWithAI([
    {
      role: "user",
      content: `Summarize this resume in 3-4 bullet points (experience, skills, strengths). Keep under 100 words.\n\n${resumeText.slice(0, 2500)}`,
    },
  ]);
}

export async function getJobRecommendations(skills: string[], preferences: string): Promise<string> {
  return chatWithAI([
    {
      role: "user",
      content: `User skills: ${skills.join(", ")}. Preferences: ${preferences}. Suggest 3 job titles or roles that match. One line each with a brief reason.`,
    },
  ]);
}
