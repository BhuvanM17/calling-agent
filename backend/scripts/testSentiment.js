const { analyzeCallSentiment, extractTranscript, extractSummary, extractCallbackInfo, deriveCallOutcome } = require("../src/core/utils/sentimentUtils");

console.log("=== Testing Sentiment & Transcript Extraction Utility ===");

const testCases = [
  {
    name: "Positive: Lead interested in 10 seats Indiranagar with pricing request",
    summary: "User expressed interest in 10 seats at Indiranagar center and requested brochure and pricing on WhatsApp.",
    transcript: "Agent: Hello from BizzHub. User: Yes I need 10 seats in Indiranagar, please send pricing on WhatsApp.",
    expectedSentiment: "Positive",
    expectedOutcome: "Call Completed",
  },
  {
    name: "Positive: Short call booking site visit (duration was 5s)",
    summary: "The customer confirmed they want to schedule a site visit for tomorrow 3 PM.",
    transcript: "User: Yes please book a site visit for tomorrow at 3 PM.",
    expectedSentiment: "Positive",
    expectedOutcome: "Call Completed",
  },
  {
    name: "Negative: Short call rejection (duration was 4s)",
    summary: "User said not interested and hung up.",
    transcript: "User: Not interested, don't call again.",
    expectedSentiment: "Negative",
    expectedOutcome: "Call Completed",
  },
  {
    name: "Negative: Wrong number",
    summary: "The receiver said it was a wrong number and they never enquired.",
    transcript: "User: Wrong number, I never applied for any office.",
    expectedSentiment: "Negative",
    expectedOutcome: "Call Completed",
  },
  {
    name: "Positive: Callback requested with time",
    summary: "User is interested in coworking desks and requested a callback at 4:30 PM.",
    transcript: "User: I am looking for coworking space. Please call me back around 4:30 PM.",
    expectedSentiment: "Positive",
    expectedOutcome: "Callback Requested",
  },
  {
    name: "Neutral: Disconnected without speaking",
    summary: "No response from user. User did not speak and hung up.",
    transcript: "",
    expectedSentiment: "Neutral",
    expectedOutcome: "No Response / Hung Up",
  },
  {
    name: "Neutral: Driving right now",
    summary: "User answered but mentioned they are driving and cannot talk right now.",
    transcript: "User: I am driving right now.",
    expectedSentiment: "Neutral",
    expectedOutcome: "Call Completed",
  },
];

let allPassed = true;

for (const tc of testCases) {
  const sentiment = analyzeCallSentiment({ summary: tc.summary, transcript: tc.transcript });
  const { isCallbackRequested, callbackTime } = extractCallbackInfo({ summary: tc.summary, transcript: tc.transcript });
  const outcome = deriveCallOutcome({ summary: tc.summary, transcript: tc.transcript, isCallbackRequested, callStatus: "completed" });

  const sentimentMatch = sentiment === tc.expectedSentiment;
  const outcomeMatch = outcome === tc.expectedOutcome;

  if (sentimentMatch && outcomeMatch) {
    console.log(`✅ [PASS] ${tc.name}`);
    console.log(`   Sentiment: ${sentiment} | Outcome: ${outcome} ${callbackTime ? `| Callback: ${callbackTime}` : ""}`);
  } else {
    console.error(`❌ [FAIL] ${tc.name}`);
    console.error(`   Expected: Sentiment=${tc.expectedSentiment}, Outcome=${tc.expectedOutcome}`);
    console.error(`   Got:      Sentiment=${sentiment}, Outcome=${outcome}`);
    allPassed = false;
  }
}

// Test Bolna payload structures (array transcript, agent_execution_summary, extracted_data)
console.log("\n=== Testing Bolna Payload Extraction ===");

const bolnaPayload = {
  agent_execution_id: "bolna_exec_123",
  agent_execution_summary: "Customer confirmed 20 seats requirement in HSR Layout and agreed for follow-up.",
  transcript: [
    { role: "assistant", message: "Hi, this is Sophia calling from BizzHub." },
    { role: "user", message: "Hi Sophia, yes I need 20 seats in HSR Layout." },
    { role: "assistant", message: "Awesome, would you like to schedule a site visit?" },
    { role: "user", message: "Yes, call me tomorrow at 11 AM to confirm the visit." }
  ],
  telephony_data: {
    duration: 35
  }
};

const extractedSummary = extractSummary(bolnaPayload);
const extractedTranscript = extractTranscript(bolnaPayload);
const bolnaSentiment = analyzeCallSentiment({ summary: extractedSummary, transcript: extractedTranscript });
const bolnaCallback = extractCallbackInfo({ summary: extractedSummary, transcript: extractedTranscript, payload: bolnaPayload });
const bolnaOutcome = deriveCallOutcome({ summary: extractedSummary, transcript: extractedTranscript, isCallbackRequested: bolnaCallback.isCallbackRequested });

console.log("Extracted Summary:", extractedSummary);
console.log("Extracted Transcript:\n" + extractedTranscript);
console.log("Derived Sentiment:", bolnaSentiment);
console.log("Derived Callback Time:", bolnaCallback.callbackTime);
console.log("Derived Outcome:", bolnaOutcome);

if (bolnaSentiment === "Positive" && bolnaOutcome === "Callback Requested" && bolnaCallback.callbackTime?.includes("11 AM")) {
  console.log("✅ Bolna payload extraction & analysis tests passed successfully!");
} else {
  console.error("❌ Bolna payload extraction failed expectation!");
  allPassed = false;
}

if (!allPassed) {
  process.exit(1);
} else {
  console.log("\n🎉 ALL TESTS PASSED!");
}
