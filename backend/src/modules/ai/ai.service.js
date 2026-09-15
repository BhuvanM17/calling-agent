const { env } = require("../../core/config/env.config");
const logger = require("../../core/utils/logger");
const AI_CONSTANTS = require("./ai.constants");

/**
 * Call Gemini API with system and user prompt.
 */
async function callGeminiAPI(systemPrompt, userPrompt) {
  const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on server.");
  }

  const url = `${AI_CONSTANTS.GEMINI_BASE_URL}/${AI_CONSTANTS.DEFAULT_MODEL}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: { maxOutputTokens: 1000, temperature: 0.7 },
    }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error?.message || `Gemini API error: ${res.status}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

class AIService {
  /**
   * Score leads from 1-10 based on sentiment, requirements, seat count, and status.
   */
  static async scoreLeads(leadsList = []) {
    if (!leadsList.length) return [];

    try {
      const systemPrompt = `You are a lead scoring engine for BizzHub Workspaces, Bangalore.
Score each lead 1–10 based on:
- Call Sentiment & Outcome: POSITIVE / CURIOUS / HIGH INTENT leads MUST score 7-10. Neutral=5-6. Negative/Uninterested=1-3.
- Requirement changes during calls indicate strong engagement (add +2).
- Seat count & deal size: Larger teams get higher score.
- Converted leads = 10, Lost = 1.
Return ONLY valid JSON array — no markdown formatting:
[{"id":"<id>","score":<1-10>,"reason":"<max 6 words rationale>"}]`;

      const userPrompt = `Score these leads:\n${leadsList
        .map((l) =>
          JSON.stringify({
            id: l.id,
            name: l.name,
            status: l.status,
            call_sentiment: l.sentiment || "No call yet",
            requirements_changed: Boolean(l.requirementsChanged),
            space_type: l.spaceType || "",
            seats: l.seats || "",
            location: l.location || "",
            has_email: Boolean(l.email),
          })
        )
        .join("\n")}`;

      const raw = await callGeminiAPI(systemPrompt, userPrompt);
      const clean = raw.replace(/```json|```/g, "").trim();
      return JSON.parse(clean);
    } catch (err) {
      logger.warn("Gemini lead scoring failed, using rule-based fallback", { error: err.message });
      return leadsList.map((l) => {
        let s = 5;
        if (l.status === "converted") return { id: l.id, score: 10, reason: "Closed deal / Converted" };
        if (l.status === "lost") return { id: l.id, score: 1, reason: "Lost lead" };

        const sent = (l.sentiment || "").toLowerCase();
        if (sent.includes("pos") || sent.includes("high") || sent.includes("interested")) s += 3;
        else if (sent.includes("curious")) s += 2;
        else if (sent.includes("neu")) s += 1;
        else if (sent.includes("neg") || sent.includes("uninterested")) s -= 3;
        else if (sent.includes("hesit")) s -= 2;

        if (l.requirementsChanged) s += 2;

        const seats = parseInt(l.seats) || 0;
        if (seats >= 50) s += 3;
        else if (seats >= 20) s += 2;
        else if (seats >= 5) s += 1;

        if (l.email) s += 1;

        const finalScore = Math.max(1, Math.min(10, s));
        let reason = "Rule-based score";
        if (l.sentiment) reason = `Sentiment: ${l.sentiment}`;
        else if (l.requirementsChanged) reason = `Req. Changed (${l.seats || ""} seats)`;
        else if (seats > 0) reason = `${seats} seats enquiry`;

        return { id: l.id, score: finalScore, reason };
      });
    }
  }

  /**
   * Generate or improve an email for a lead.
   */
  static async generateEmail({ mode = "write", lead = {}, currentSubject = "", currentBody = "", extraInstructions = "" }) {
    const senderName = env.YOUR_NAME || "BizzHub Advisor";
    const senderPhone = env.YOUR_PHONE || "+91 96867 65227";

    const leadContext = `Lead details:
Name: ${lead.name || "Client"}
Space type: ${lead.spaceType || "workspace"}
Seats: ${lead.seats || "not specified"}
Location: ${lead.location || "Bangalore"}
Duration: ${lead.duration || "flexible"}
Status: ${lead.status || "new"}`;

    let systemPrompt = "";
    let userPrompt = "";

    if (mode === "write") {
      systemPrompt = `You are a sales assistant for BizzHub Workspaces, Bangalore.
Write a warm, concise, professional follow-up email to a workspace enquiry lead.
Tone: friendly but professional. Length: 120–180 words max for the body.
Return ONLY valid JSON — no markdown, no backticks: { "subject": "...", "body": "..." }
Use \\n for line breaks in body. Address the person by first name only. Sign off as "${senderName}, BizzHub Workspaces \\n📞 ${senderPhone}".
Never mention pricing. Focus on understanding their needs and offering a site visit.`;
      userPrompt = `${leadContext}\n${extraInstructions ? `\nSales rep instructions: ${extraInstructions}` : ""}\nWrite a personalised follow-up email.`;
    } else if (mode === "improve") {
      systemPrompt = `You are an expert email editor for BizzHub Workspaces. Improve the email for clarity, warmth, and conversion. Return ONLY valid JSON: { "subject": "...", "body": "..." }`;
      userPrompt = `Current subject: ${currentSubject}\nCurrent body:\n${currentBody}\n${extraInstructions ? `\nNote: ${extraInstructions}` : ""}`;
    } else if (mode === "shorter") {
      systemPrompt = `You are a concise email editor. Shorten the email to under 100 words while keeping key details. Return ONLY valid JSON: { "subject": "...", "body": "..." }`;
      userPrompt = `Current subject: ${currentSubject}\nCurrent body:\n${currentBody}`;
    } else if (mode === "formal") {
      systemPrompt = `You are an executive email writer. Rewrite the email in a polished, corporate tone. Return ONLY valid JSON: { "subject": "...", "body": "..." }`;
      userPrompt = `Current subject: ${currentSubject}\nCurrent body:\n${currentBody}`;
    } else if (mode === "hindi") {
      systemPrompt = `You are a translator. Translate the email into natural, conversational Hindi (Devanagari script). Return ONLY valid JSON: { "subject": "...", "body": "..." }`;
      userPrompt = `Translate this email:\nSubject: ${currentSubject}\nBody:\n${currentBody}`;
    }

    try {
      const raw = await callGeminiAPI(systemPrompt, userPrompt);
      const clean = raw.replace(/```json|```/g, "").trim();
      return JSON.parse(clean);
    } catch (err) {
      logger.warn("AI Email generation failed, using template", { error: err.message });
      const firstName = (lead.name || "there").split(" ")[0];
      return {
        subject: `Workspace enquiry follow-up — BizzHub Workspaces`,
        body: `Hi ${firstName},\n\nThank you for reaching out to BizzHub Workspaces regarding ${lead.spaceType || "workspace"} in ${lead.location || "Bangalore"}.\n\nWe'd love to schedule a quick tour for you to experience our vibrant spaces and amenities firsthand.\n\nAre you free for a 10-minute visit this week?\n\nBest regards,\n${senderName}\nBizzHub Workspaces\n📞 ${senderPhone}`,
      };
    }
  }

  /**
   * Generate pipeline insights.
   */
  static async generateInsights(summary = {}) {
    try {
      const systemPrompt = `You are a business analyst assistant for BizzHub Workspaces, a premium coworking brand in Bangalore.
Return ONLY a valid JSON array — no markdown, no prose, no backticks.
Each element: { "emoji": "<single emoji>", "text": "<insight as HTML with <strong> for key numbers/words>" }
Give exactly 4 concise, specific, actionable insights based on the data.`;

      const userPrompt = `Lead pipeline data: ${JSON.stringify(summary)}\nGenerate 4 insights covering pipeline health, demand trends, urgent actions, and one smart recommendation.`;

      const raw = await callGeminiAPI(systemPrompt, userPrompt);
      const clean = raw.replace(/```json|```/g, "").trim();
      return JSON.parse(clean);
    } catch (err) {
      logger.warn("AI Insights failed, returning computed defaults", { error: err.message });
      const total = summary.total || 0;
      const recent = summary.recentLeads || 0;
      return [
        { emoji: "📊", text: `Active pipeline has <strong>${total} leads</strong> with steady inflow.` },
        { emoji: "⚡", text: `<strong>${recent} new leads</strong> arrived in the last 24 hours requiring fast follow-up.` },
        { emoji: "🏢", text: `High demand noted across Koramangala and Whitefield hubs.` },
        { emoji: "🎯", text: `Prioritize leads with <strong>Positive sentiment</strong> for immediate tour bookings.` },
      ];
    }
  }
}

module.exports = { AIService };
