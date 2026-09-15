require("dotenv").config();

const API_KEY = process.env.BOLNA_API_KEY;
const AGENT_ID = process.env.BOLNA_AGENT_ID;

if (!API_KEY || !AGENT_ID) {
  console.error("❌ Missing BOLNA_API_KEY or BOLNA_AGENT_ID in .env file.");
  process.exit(1);
}

const BASE_URL = "https://api.bolna.dev";
const headers = {
  Authorization: `Bearer ${API_KEY}`,
  "X-Api-Key": API_KEY,
  "Content-Type": "application/json",
};

async function updateAgent() {
  console.log(`🔍 Fetching current configuration for Bolna Agent ID: ${AGENT_ID}...`);

  const getRes = await fetch(`${BASE_URL}/agent/${AGENT_ID}`, { headers });
  if (!getRes.ok) {
    const errorText = await getRes.text();
    console.error(`❌ Failed to fetch agent details (${getRes.status}):`, errorText);
    return;
  }

  const agentData = await getRes.json();
  console.log("✅ Current Agent Configuration fetched.");

  // Modify task configs for optimal latency
  let tasks = agentData.tasks || agentData.agent_config?.tasks || [];
  if (Array.isArray(tasks) && tasks.length > 0) {
    tasks.forEach((task, idx) => {
      console.log(`⚙️ Optimizing Task [${idx + 1}]...`);

      if (!task.tools_config) task.tools_config = {};

      // 1. Set LLM Model to gpt-4o-mini
      if (!task.tools_config.llm_agent) task.tools_config.llm_agent = {};
      task.tools_config.llm_agent.llm_config = {
        ...task.tools_config.llm_agent.llm_config,
        provider: "openai",
        model: "gpt-4o-mini",
      };

      // 2. Set TTS Model to ElevenLabs Turbo v2.5 / Low Latency
      if (task.tools_config.synthesizer) {
        if (!task.tools_config.synthesizer.provider_config) {
          task.tools_config.synthesizer.provider_config = {};
        }
        if (task.tools_config.synthesizer.provider === "elevenlabs") {
          task.tools_config.synthesizer.provider_config.model = "eleven_turbo_v2_5";
        }
        task.tools_config.synthesizer.stream = true;
      }

      // 3. Set VAD / Silence Timeout / Interruption parameters
      if (!task.task_config) task.task_config = {};
      task.task_config.incremental_delay = 500; // 500ms response buffer delay
      task.task_config.interruption_backoff_period = 300;
    });
  }

  console.log("🚀 Pushing updated agent configuration to Bolna AI...");
  const updateRes = await fetch(`${BASE_URL}/agent/${AGENT_ID}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(agentData),
  });

  if (!updateRes.ok) {
    const errText = await updateRes.text();
    console.error(`❌ Agent update failed (${updateRes.status}):`, errText);
    return;
  }

  const result = await updateRes.json().catch(() => ({}));
  console.log("🎉 Agent successfully updated with low-latency settings!", result);
}

updateAgent().catch((err) => console.error("Unhandled error:", err));
