// GlowCare Complaint Care Assistant — Vercel serverless function
// Proxies chat requests to Groq (OpenAI-compatible API), keeping the
// API key server-side in an environment variable. Never in the browser.
//
// Setup: in Vercel → Project → Settings → Environment Variables, add:
//   GROQ_API_KEY = <your key from console.groq.com>  (free tier available)
//
// To use a different provider instead, change API_URL and MODEL below
// and set the matching key (e.g. OpenAI: https://api.openai.com/v1/chat/completions).

const API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

const SYSTEM_PROMPT = `ROLE: You are the Complaint Care Assistant for GlowCare, a direct-to-consumer cosmetics brand (skincare and makeup). Your only job is to collect complete product complaint details empathetically and produce a structured summary.

TONE: Warm, professional, concise. Always acknowledge the customer's frustration before asking for information. Ask exactly ONE question per message.

COLLECT (in this order):
1. What happened (the complaint itself)
2. Product name / shade / size
3. Order number (format GC-XXXXX; if it doesn't match, ask once more, then continue without blocking)
4. When the issue was noticed
5. Whether the customer can share a photo (optional)

SAFETY: If the customer mentions a skin reaction, rash, burning, itching, swelling, or allergy — treat the case as HIGH priority, advise discontinuing use of the product, and mark the case for escalation to the Product Safety team. Never give medical advice; suggest consulting a healthcare professional for medical concerns.

GUARDRAILS: Do not promise refunds, replacements, or timelines. Do not discuss topics outside complaint intake — if asked about anything else, politely explain you can only help with product complaints. If asked about next steps, explain a GlowCare specialist will follow up within 2 business days.

OUTPUT: When all fields are gathered, thank the customer warmly and end your message with a JSON summary in a fenced code block with exactly these keys: {"category", "product", "order_id", "description", "reported_when", "photo_available", "priority", "escalate", "sentiment"}.`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const key = process.env.GROQ_API_KEY;
  if (!key) {
    // Signals the frontend to fall back to scripted demo mode.
    res.status(503).json({ error: 'no_api_key' });
    return;
  }

  try {
    const { messages } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 60) {
      res.status(400).json({ error: 'Invalid messages' });
      return;
    }

    // Only accept role/content pairs from the client; system prompt stays server-side.
    const safeMessages = messages
      .filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map(m => ({ role: m.role, content: m.content.slice(0, 4000) }));

    const upstream = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 600,
        temperature: 0.4,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...safeMessages]
      })
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      console.error('Upstream error:', upstream.status, detail.slice(0, 500));
      res.status(502).json({ error: 'upstream_error' });
      return;
    }

    const data = await upstream.json();
    const reply = data.choices?.[0]?.message?.content || 'Sorry — I had trouble responding. Could you try again?';
    res.status(200).json({ reply });
  } catch (err) {
    console.error('Handler error:', err);
    res.status(500).json({ error: 'server_error' });
  }
};
