import Groq from 'groq-sdk';
import { pipeline, env } from '@xenova/transformers';

// Configure transformers to use /tmp/ for Vercel serverless survival
env.cacheDir = '/tmp/';

let groq = null;
function getGroqClient() {
  if (!groq) {
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groq;
}// Singleton pipeline for embeddings
class EmbeddingPipeline {
  static task = 'feature-extraction';
  static model = 'Xenova/all-MiniLM-L6-v2';
  static instance = null;

  static async getInstance(progress_callback = null) {
    if (this.instance === null) {
      this.instance = pipeline(this.task, this.model, { progress_callback });
    }
    return this.instance;
  }
}

/**
 * Generate embedding vector for a text/URL string.
 * Uses the local all-MiniLM-L6-v2 model (384 dims).
 */
export async function generateLocalEmbedding(text) {
  const extractor = await EmbeddingPipeline.getInstance();
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

// Keep the old function name as a wrapper for backward compatibility
export async function getEmbedding(text) {
  return generateLocalEmbedding(text);
}

/**
 * Safely parse JSON from LLM output, handling potential markdown wrappers.
 */
export function safeParseLLMJSON(text) {
  if (!text) return null;
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    return null;
  } catch (e) {
    console.error('LLM JSON Parse Error:', e.message, 'Raw text:', text);
    return null;
  }
}

/**
 * Classify text content for phishing/spam/safe using Groq.
 * Returns { status, ai_reason } via JSON enforcement.
 */
export async function generateThreatVerdict(prompt, senderAddress = null) {
  if (senderAddress) {
    const s = senderAddress.toLowerCase();
    if (s === 'no-reply@mail.instagram.com' || s.endsWith('@google.com')) {
      return { status: 'safe', ai_reason: 'Trusted sender domain bypass.' };
    }
  }

  try {
    const groqClient = getGroqClient();
    const chatCompletion = await groqClient.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are an elite PhishNinja Security Engine. Your goal is to analyze text content for phishing, brand impersonation, and social engineering.

If context from the Vector Database is provided in the user prompt, use it to compare patterns. A high similarity score in context is a strong signal, but verify if the current content actually exhibits malicious intent.

ANALYSIS GUIDELINES:
1. Brand Impersonation: Look for slight misspellings or unofficial domains.
2. Sense of Urgency: "Account suspended", "Action required immediately".
3. Credential Harvesting: Requests for passwords, OTPs, or sensitive info.
4. Technical Metadata: Ignore UTM parameters, session IDs, or generic app states.

OUTPUT FORMAT (JSON ONLY):
{
  "status": "safe" | "risk" | "danger",
  "ai_reason": "Brief, technical explanation of the verdict."
}

Rules:
- "danger": Confirmed malicious content or very high-confidence threat.
- "risk": Suspicious patterns, potential spam, or medium-confidence threat.
- "safe": Legitimate content.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "llama-3.1-8b-instant",
      response_format: { type: "json_object" },
    });

    const content = chatCompletion.choices[0]?.message?.content;
    if (content) {
      const parsed = safeParseLLMJSON(content);
      if (parsed && ['safe', 'risk', 'danger', 'warning'].includes(parsed.status)) {
        // Map 'warning' to 'risk' if LLM uses it, or keep it consistent
        if (parsed.status === 'warning') parsed.status = 'risk';
        return parsed;
      }
    }
    return { status: 'safe', ai_reason: 'AI analysis could not determine a definitive threat.' };
  } catch (e) {
    console.error('Groq classification error:', e.message);
    return { status: 'safe', ai_reason: 'Classification service temporarily unavailable.' };
  }
}

export async function classifyText(text, aggressiveness = 'Standard', senderAddress = null, context = null) {
  let aggressivenessInstruction = '';
  if (aggressiveness === 'High Alert') {
    aggressivenessInstruction = "Aggressiveness Level: HIGH ALERT. You are highly suspicious. Flag anything even slightly suspicious as 'risk'.";
  } else if (aggressiveness === 'Zero Trust') {
    aggressivenessInstruction = "Aggressiveness Level: ZERO TRUST. You are extremely paranoid. Classify anything not explicitly and obviously safe as 'danger'.";
  } else {
    aggressivenessInstruction = "Aggressiveness Level: STANDARD. Balance false positives and block only clear threats.";
  }

  const contextBlock = context ? `\n\nCONTEXT FROM PREVIOUS THREATS (Vector Match):\n"""\n${context}\n"""\nUse this context to identify similar patterns, but verify the current content individually.` : '';

  const prompt = `${aggressivenessInstruction}${contextBlock}\n\nText to analyze:\n"""\n${text.substring(0, 1000)}\n"""`;
  return generateThreatVerdict(prompt, senderAddress);
}

/**
 * Specialized URL Forensic analysis using Groq.
 */
export async function classifyURL(url) {
  try {
    const groqClient = getGroqClient();
    const chatCompletion = await groqClient.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are an elite URL Forensic Expert. Your goal is to analyze a URL for phishing, typosquatting, hidden redirections, and suspicious TLDs.
          
ANALYSIS GUIDELINES:
1. Typosquatting: Look for domains mimicking famous brands (e.g., g00gle.com, paypa1.com).
2. Suspicious TLDs: Flag .zip, .mov, or unusual TLDs if used in a deceptive context.
3. Path Analysis: Look for suspicious subdirectories like /login, /secure, /verify on unknown domains.
4. Redirection: Identify patterns suggesting double-extension or deceptive subdomains (e.g., login.microsoft.com-security.net).

OUTPUT FORMAT (JSON ONLY):
{
  "status": "safe" | "risk" | "danger",
  "ai_reason": "Brief, technical explanation of the verdict based on URL patterns."
}`
        },
        {
          role: "user",
          content: `Analyze the following URL for security risks: ${url}`
        }
      ],
      model: "llama-3.1-8b-instant",
      response_format: { type: "json_object" },
    });

    const content = chatCompletion.choices[0]?.message?.content;
    if (content) {
      const parsed = safeParseLLMJSON(content);
      if (parsed && ['safe', 'risk', 'danger', 'warning'].includes(parsed.status)) {
        if (parsed.status === 'warning') parsed.status = 'risk';
        return parsed;
      }
    }
    return { status: 'safe', ai_reason: 'URL pattern appears benign or inconclusive.' };
  } catch (e) {
    console.error('Groq URL classification error:', e.message);
    return { status: 'safe', ai_reason: 'URL Forensic service temporarily unavailable.' };
  }
}

/**
 * Multi-Agent Consensus Logic: Query multiple models and reconcile their verdicts.
 * Models used: llama-3.1-8b-instant (Fast) + llama3-70b-8192 (Powerful)
 */
export async function getMultiAgentConsensus(type, content, senderAddress = null, context = null) {
  const groqClient = getGroqClient();
  
  // Prepare prompts
  let systemPrompt = "";
  let userPrompt = "";

  if (type === 'URL') {
    systemPrompt = `You are an elite URL Forensic Expert. Analyze the URL for phishing, typosquatting, and deceptive patterns.
    OUTPUT FORMAT (JSON ONLY): {"status": "safe" | "risk" | "danger", "ai_reason": "..."}`;
    userPrompt = `Analyze this URL: ${content}`;
  } else {
    const contextBlock = context ? `\n\nCONTEXT FROM PREVIOUS THREATS:\n"""\n${context}\n"""` : '';
    systemPrompt = `You are an elite PhishNinja Security Engine. Analyze text content for phishing and social engineering.
    ${contextBlock}
    OUTPUT FORMAT (JSON ONLY): {"status": "safe" | "risk" | "danger", "ai_reason": "..."}`;
    userPrompt = `Analyze this content: ${content}`;
  }

  // Define models
  const models = ["llama-3.1-8b-instant", "llama3-70b-8192"];
  
  try {
    // Run models in parallel
    const predictions = await Promise.all(models.map(async (model) => {
      try {
        const completion = await groqClient.chat.completions.create({
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
          model: model,
          response_format: { type: "json_object" },
        });
        const parsed = safeParseLLMJSON(completion.choices[0]?.message?.content);
        return { model, ...parsed };
      } catch (err) {
        console.error(`Multi-Agent Error (${model}):`, err.message);
        return { model, status: 'safe', ai_reason: 'Model failed.' };
      }
    }));

    // Reconcile
    const v8b = predictions.find(p => p.model === "llama-3.1-8b-instant") || { status: 'safe', ai_reason: '8B failed.' };
    const v70b = predictions.find(p => p.model === "llama3-70b-8192") || { status: 'safe', ai_reason: '70B failed.' };

    console.log(`[Consensus] 8B: ${v8b.status}, 70B: ${v70b.status}`);

    if (v8b.status === v70b.status) {
      return v8b; 
    }

    // Escalation logic
    if (v70b.status === 'danger' || v8b.status === 'danger') {
      if (v70b.status === 'risk' || v8b.status === 'risk') {
          return { status: 'danger', ai_reason: `[Consensus Escalation] ${v70b.ai_reason} (Secondary verification: ${v8b.status})` };
      }
      if (v70b.status === 'danger') return v70b;
      return { status: 'risk', ai_reason: `[Disputed] 8B flagged DANGER but 70B remained skeptical. Treating as RISK.` };
    }

    if (v70b.status === 'risk' || v8b.status === 'risk') {
      return v70b.status === 'risk' ? v70b : v8b;
    }

    return v70b; 
  } catch (err) {
    console.error('Consensus process failed:', err.message);
    return { status: 'safe', ai_reason: 'Consensus engine failed.' };
  }
}
