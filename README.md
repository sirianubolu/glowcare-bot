# GlowCare Complaint Care Assistant

AIML-500 AI Lab — "Build a Bot" · by Siri Anubolu

An LLM-powered complaint intake chatbot for GlowCare, a D2C cosmetics brand,
designed with Design Thinking (Empathy → Define → Ideate → Prototype → Test).
The entire application logic is a single system prompt; a Vercel serverless
function keeps the API key server-side so it never reaches the browser.

## Structure
- `public/index.html` — chat interface
- `api/chat.js` — serverless proxy to Groq (Llama 3.3 70B), holds the system prompt
- If no API key is configured, the page automatically runs a clearly-labeled
  scripted demo of the same conversation design, so the link always works.

## Deploy to Vercel
1. Push this folder to a GitHub repo (e.g. `glowcare-bot`)
2. vercel.com → Add New → Project → Import the repo → Deploy (defaults are fine)
3. Get a free API key at console.groq.com → Vercel Project → Settings →
   Environment Variables → add `GROQ_API_KEY` = your key → Redeploy
4. Your live bot: `https://<project>.vercel.app`

## Test scenarios (from the lab plan)
- Damaged product: "My serum arrived leaking" → Damaged Product, MEDIUM
- Safety trigger: "I got a rash from the face cream" → HIGH priority + escalation
- Guardrail: ask for a refund → politely declines to promise, explains follow-up
- Off-topic: ask about the weather → redirects to complaint intake
- Order validation: give a wrong-format order number → asks once, then proceeds
