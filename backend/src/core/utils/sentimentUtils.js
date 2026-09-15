/**
 * Utility functions for extracting call summary & transcript,
 * and performing intelligent sentiment & outcome analysis strictly
 * based on conversation transcripts and summaries.
 */

function extractTranscript(payload = {}) {
  if (!payload || typeof payload !== "object") return null;

  const raw =
    payload.transcript ||
    payload.agent_execution_transcript ||
    payload.telephony_data?.transcript ||
    payload.messages ||
    payload.conversation_history ||
    payload.transcript_history ||
    payload.utterances ||
    null;

  if (!raw) return null;

  if (typeof raw === "string") {
    return raw.trim() || null;
  }

  if (Array.isArray(raw)) {
    const formatted = raw
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (typeof item === "object" && item !== null) {
          const speaker =
            item.role ||
            item.speaker ||
            item.sender ||
            (item.user ? "User" : item.agent ? "Assistant" : "Speaker");
          const text = item.message || item.content || item.text || item.statement || "";
          return text ? `${speaker}: ${text}` : "";
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");

    return formatted || null;
  }

  return null;
}

function extractSummary(payload = {}) {
  if (!payload || typeof payload !== "object") return null;

  const summary =
    payload.agent_execution_summary ||
    payload.summary ||
    payload.call_summary ||
    payload.conversation_summary ||
    payload.analysis?.summary ||
    payload.analysis?.call_summary ||
    payload.telephony_data?.res_summary ||
    (payload.extracted_data && typeof payload.extracted_data === "object"
      ? payload.extracted_data.summary || payload.extracted_data.notes
      : null) ||
    null;

  if (typeof summary === "string" && summary.trim()) {
    return summary.trim();
  }

  return null;
}

function analyzeCallSentiment({
  summary = "",
  transcript = "",
  extractedData = {},
  rawSentiment = null,
} = {}) {
  const combinedText = `${summary || ""} \n ${transcript || ""}`.trim();
  const lowerText = combinedText.toLowerCase();

  if (!combinedText) {
    if (rawSentiment && typeof rawSentiment === "string") {
      const lowerRaw = rawSentiment.toLowerCase();
      if (lowerRaw.includes("pos") || lowerRaw.includes("interest") || lowerRaw.includes("confirm")) {
        return "Positive";
      }
      if (lowerRaw.includes("neg") || lowerRaw.includes("uninterested") || lowerRaw.includes("refus")) {
        return "Negative";
      }
      if (lowerRaw.includes("neu")) {
        return "Neutral";
      }
    }
    return "Neutral";
  }

  const negativePatterns = [
    /\bnot\s+interested\b/i,
    /\bno\s+interest\b/i,
    /\bdon'?t\s+want\b/i,
    /\bdo\s+not\s+want\b/i,
    /\bnot\s+looking\b/i,
    /\bno\s+requirement\b/i,
    /\bnot\s+required\b/i,
    /\bno\s+need\b/i,
    /\bnot\s+needed\b/i,
    /\bstop\s+calling\b/i,
    /\bdo\s+not\s+call\b/i,
    /\bdon'?t\s+call\b/i,
    /\bremove\s+(my\s+)?number\b/i,
    /\bwrong\s+number\b/i,
    /\bwrong\s+person\b/i,
    /\bdid\s+not\s+enquire\b/i,
    /\bdid\s+not\s+inquire\b/i,
    /\bdidn'?t\s+inquire\b/i,
    /\bnever\s+enquired\b/i,
    /\bnever\s+inquired\b/i,
    /\bspam\b/i,
    /\balready\s+booked\b/i,
    /\balready\s+taken\b/i,
    /\balready\s+found\b/i,
    /\balready\s+got\b/i,
    /\balready\s+finalized\b/i,
    /\btoo\s+expensive\b/i,
    /\bcancel(led)?\b/i,
    /\bdecline(d)?\b/i,
    /\brefuse(d)?\b/i,
    /\breject(ed)?\b/i,
    /\bunsubscribed?\b/i,
  ];

  const positivePatterns = [
    /\binterested\b/i,
    /\blooking\s+for\b/i,
    /\bneed\s+(\d+|office|desk|cabin|seats?|space)\b/i,
    /\brequire(s|d)?\s+(\d+|office|desk|cabin|seats?|space)\b/i,
    /\bbook(ed|ing)?\b/i,
    /\bschedule\b/i,
    /\bsite\s+visit\b/i,
    /\bvisit\s+(the\s+)?(office|centre|center|location|facility|space)\b/i,
    /\bcome\s+(and\s+)?(see|visit)\b/i,
    /\bwill\s+visit\b/i,
    /\bvisiting\b/i,
    /\bsend\s+(me\s+)?(the\s+)?(details|brochure|catalogue|pricing|quote|quotation|proposal|photos|pictures|location)\b/i,
    /\bshare\s+(the\s+)?(details|brochure|catalogue|pricing|quote|quotation|proposal|photos|pictures|location)\b/i,
    /\b(send|share)\s+(on|over|via)\s+whatsapp\b/i,
    /\bwhatsapp\s+me\b/i,
    /\bwhatsapp\s+details\b/i,
    /\bcall\s*(me\s+)?back\b/i,
    /\bcallback\b/i,
    /\bcall\s+around\b/i,
    /\bcall\s+at\s+\d+\b/i,
    /\bcall\s+tomorrow\b/i,
    /\bcall\s+later\s+(today|evening|afternoon)\b/i,
    /\bconnect\s+later\b/i,
    /\breach\s+out\s+later\b/i,
    /\bsounds\s+(good|great|interesting|perfect)\b/i,
    /\bagreed\b/i,
    /\bconfirm(ed)?\b/i,
    /\byes\s+please\b/i,
    /\bdefinitely\b/i,
    /\bcertainly\b/i,
    /\bshare\s+rates\b/i,
    /\bpricing\b/i,
    /\bready\s+to\s+move\b/i,
    /\bimmediate\s+(joining|move|requirement)\b/i,
    /\bprivate\s+cabin\b/i,
    /\bdedicated\s+desk\b/i,
    /\bmanaged\s+office\b/i,
    /\bcoworking\b/i,
  ];

  const silentPatterns = [
    /\bno\s+response\b/i,
    /\bno\s+speech\b/i,
    /\bdid\s+not\s+speak\b/i,
    /\buser\s+did\s+not\s+respond\b/i,
    /\bhung\s+up\s+without\s+speaking\b/i,
    /\bhung\s+up\s+immediately\b/i,
    /\bsilence\b/i,
    /\bvoicemail\b/i,
    /\banswering\s+machine\b/i,
    /\bivr\b/i,
  ];

  const hasNegative = negativePatterns.some((pattern) => pattern.test(lowerText));
  const hasPositive = positivePatterns.some((pattern) => pattern.test(lowerText));
  const hasSilent = silentPatterns.some((pattern) => pattern.test(lowerText));

  if (hasNegative && !hasPositive) {
    return "Negative";
  }

  if (hasNegative && hasPositive) {
    if (
      /\b(not interested|don'?t want|stop calling|wrong number|not looking anymore|already booked|too expensive)\b/i.test(
        lowerText
      )
    ) {
      return "Negative";
    }
    return "Positive";
  }

  if (hasPositive) {
    return "Positive";
  }

  if (hasSilent) {
    return "Neutral";
  }

  if (extractedData?.intent || extractedData?.sentiment) {
    const extVal = String(extractedData.intent || extractedData.sentiment).toLowerCase();
    if (extVal.includes("interest") || extVal.includes("positive") || extVal.includes("book") || extVal.includes("visit")) {
      return "Positive";
    }
    if (extVal.includes("not_interest") || extVal.includes("negative") || extVal.includes("reject")) {
      return "Negative";
    }
  }

  if (rawSentiment && typeof rawSentiment === "string") {
    const lowerRaw = rawSentiment.toLowerCase();
    if (lowerRaw.includes("pos") || lowerRaw.includes("interest") || lowerRaw.includes("confirm")) {
      return "Positive";
    }
    if (lowerRaw.includes("neg") || lowerRaw.includes("not_interested") || lowerRaw.includes("refus")) {
      return "Negative";
    }
  }

  return "Neutral";
}

function extractCallbackInfo({ summary = "", transcript = "", payload = {} } = {}) {
  const combinedText = `${summary || ""} \n ${transcript || ""}`.trim();
  const lowerText = combinedText.toLowerCase();

  const isExplicitDoNotCall = /\b(don'?t\s+call|do\s+not\s+call|stop\s+calling|never\s+call|wrong\s+number)\b/i.test(lowerText);

  const isCallbackRequested =
    !isExplicitDoNotCall &&
    (Boolean(payload.callback_time) ||
      Boolean(payload.extracted_data?.callback_time) ||
      Boolean(payload.agent_extraction?.callback_time) ||
      Boolean(payload.custom_extractions?.callback_time) ||
      /\b(call\s*(?:me|us|him|her)?\s*(?:back|later|tomorrow|around|at\s+\d+|in\s+the)|callback|requested\s+to\s+call|reach\s+out\s+later|connect\s+later|follow\s*up\s+later)\b/i.test(
        lowerText
      ));

  let callbackTime =
    payload.callback_time ||
    payload.extracted_data?.callback_time ||
    payload.agent_extraction?.callback_time ||
    payload.custom_extractions?.callback_time ||
    null;

  if (!callbackTime && isCallbackRequested) {
    const timeMatch = combinedText.match(
      /\b((?:tomorrow\s+(?:at\s+)?)?\d{1,2}(?::\d{2})?\s*(?:am|pm)|around\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?|\d{1,2}\s*o'clock|tomorrow\s*(?:morning|afternoon|evening)?|in\s+the\s+(?:morning|afternoon|evening))\b/i
    );
    if (timeMatch) {
      callbackTime = timeMatch[1].trim().toUpperCase();
    } else {
      callbackTime = "Requested (Time Pending)";
    }
  }

  return { isCallbackRequested, callbackTime };
}

function deriveCallOutcome({ summary = "", transcript = "", callStatus = "completed", isCallbackRequested = false } = {}) {
  const combinedText = `${summary || ""} \n ${transcript || ""}`.trim().toLowerCase();

  if (isCallbackRequested) {
    return "Callback Requested";
  }

  const isSilent =
    /\b(no\s+response|no\s+speech|hung\s+up\s+without\s+speaking|did\s+not\s+speak|no\s+reply|user\s+disconnected|silence|voicemail|answering\s+machine)\b/i.test(
      combinedText
    );

  if (isSilent) {
    return "No Response / Hung Up";
  }

  if (callStatus === "completed") {
    return "Call Completed";
  }

  return "Failed / No Answer";
}

module.exports = {
  extractTranscript,
  extractSummary,
  analyzeCallSentiment,
  extractCallbackInfo,
  deriveCallOutcome,
};
