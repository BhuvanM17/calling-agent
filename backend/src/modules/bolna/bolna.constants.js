/**
 * Bolna Module Constants
 */
const BOLNA_CONSTANTS = {
  BASE_URL: "https://api.bolna.dev",
  ENDPOINTS: {
    CALL: "https://api.bolna.dev/call",
    AGENT: (agentId) => `https://api.bolna.dev/agent/${agentId}`,
  },
  DEFAULT_LATENCY_CONFIG: {
    LLM_PROVIDER: "openai",
    LLM_MODEL: "gpt-4o-mini",
    SYNTHESIZER_MODEL: "eleven_turbo_v2_5",
    INCREMENTAL_DELAY: 500,
    INTERRUPTION_BACKOFF: 300,
  },
  WEBHOOK_EVENTS: {
    CALL_INITIATED: "initiated",
    CALL_COMPLETED: "completed",
    CALL_FAILED: "failed",
  },
};

module.exports = BOLNA_CONSTANTS;
