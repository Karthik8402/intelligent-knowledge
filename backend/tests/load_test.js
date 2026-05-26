// ============================================================
// Quick Knowledge — k6 Cloud Load Test Script
// Project: https://api-knowledge.karthikdev.app
// Tool: k6 Cloud (https://app.k6.io)
// ============================================================

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";

// Configure k6 to treat 429 (Too Many Requests) as an expected/successful status code
// so it does not falsely trigger failure in the global http_req_failed metric.
http.setResponseCallback(http.expectedStatuses(200, 201, 204, 302, 304, 429));

// ============================================================
// CONFIGURATION — Update these values before running
// ============================================================
const BASE_URL = "https://api-knowledge.karthikdev.app";
const FRONTEND_URL = "https://knowledge.karthikdev.app";

// Your Supabase JWT token for a real test user.
// Get this by opening your browser → DevTools (F12) → Application tab
// → Local Storage → your app URL → look for "access_token" or "sb-...auth-token"
// Paste the token value below. Leave empty "" if AUTH_ENABLED=false on backend.
const AUTH_TOKEN = __ENV.AUTH_TOKEN || "";

// ============================================================
// CUSTOM METRICS — Track specific performance indicators
// ============================================================
const healthLatency = new Trend("health_latency", true); // track /health latency
const chatLatency = new Trend("chat_latency", true); // track /chat latency
const listDocsLatency = new Trend("list_docs_latency", true); // track /documents latency
const errorRate = new Rate("error_rate");               // overall error %
const chatSuccessCount = new Counter("chat_successes");        // successful chat calls

// ============================================================
// LOAD TEST STAGES (adjust for your test scenario)
// ============================================================
// Stage 1: "Smoke Test" — 1 user for 30s to validate the script
// Stage 2: "Ramp-Up"   — Gradually increase to 10 concurrent users
// Stage 3: "Sustain"   — Hold at 10 users for 2 minutes
// Stage 4: "Spike"     — Jump to 25 users for 30s to test peak load
// Stage 5: "Ramp-Down" — Gracefully drop back to 0
export const options = {
  stages: [
    { duration: "1m", target: 10 }, // Ramp up to 10 users
    { duration: "2m", target: 50 }, // Ramp up to 50 users
    { duration: "2m", target: 100 }, // Ramp up to 100 users (Peak Load)
    { duration: "1m", target: 100 }, // Sustain at 100 users
    { duration: "30s", target: 0 }, // Ramp down to 0
  ],

  // ─── Thresholds: The test FAILS if these are not met ───
  thresholds: {
    // Health endpoint must respond in under 800ms for 95% of requests
    "health_latency": ["p(95)<800"],
    // Chat endpoint must respond in under 15 seconds for 95% of requests
    // (It calls Gemini/LLM + Supabase, so it's slower than simple endpoints)
    "chat_latency": ["p(95)<15000"],
    // List documents endpoint must respond in under 2 seconds
    "list_docs_latency": ["p(95)<2000"],
    // Overall error rate must be less than 5%
    "error_rate": ["rate<0.05"],
    // Standard k6 HTTP failure rate
    "http_req_failed": ["rate<0.05"],
    // 95% of ALL requests must complete in under 10 seconds
    "http_req_duration": ["p(95)<10000"],
  },

  // ─── Enable k6 Cloud output ───
  ext: {
    loadimpact: {
      projectID: __ENV.K6_PROJECT_ID, // Set as env variable in k6 Cloud
      name: "Quick Knowledge — Production Load Test",
    },
  },
};

// ============================================================
// HELPERS
// ============================================================
function authHeaders() {
  const headers = { "Content-Type": "application/json" };
  if (AUTH_TOKEN) {
    headers["Authorization"] = `Bearer ${AUTH_TOKEN}`;
  }
  return { headers };
}

// ============================================================
// DEFAULT FUNCTION — Each virtual user runs this in a loop
// ============================================================
export default function () {

  // ── GROUP 1: Health Check (Public, no auth needed) ──────────
  group("Health Check", function () {
    const res = http.get(`${BASE_URL}/health`);

    healthLatency.add(res.timings.duration);
    errorRate.add(res.status !== 200);

    check(res, {
      "health: status is 200": (r) => r.status === 200,
      "health: response has status key": (r) => {
        try { return JSON.parse(r.body).status !== undefined; }
        catch (e) { return false; }
      },
      "health: status is healthy/degraded": (r) => {
        try {
          const s = JSON.parse(r.body).status;
          return s === "healthy" || s === "degraded";
        } catch (e) { return false; }
      },
      "health: responds within 2 seconds": (r) => r.timings.duration < 2000,
    });

    sleep(1);
  });

  // ── GROUP 2: List Documents (Requires Auth) ──────────────────
  group("List Documents", function () {
    const res = http.get(`${BASE_URL}/documents`, authHeaders());

    listDocsLatency.add(res.timings.duration);
    errorRate.add(res.status !== 200);

    check(res, {
      "documents: status is 200": (r) => r.status === 200,
      "documents: returns documents array": (r) => {
        try { return Array.isArray(JSON.parse(r.body).documents); }
        catch (e) { return false; }
      },
      "documents: responds within 3 seconds": (r) => r.timings.duration < 3000,
    });

    sleep(1);
  });

  // ── GROUP 3: System Status (Requires Auth) ───────────────────
  group("System Status", function () {
    const res = http.get(`${BASE_URL}/status`, authHeaders());

    check(res, {
      "status: status is 200": (r) => r.status === 200,
      "status: has vector_store field": (r) => {
        try { return JSON.parse(r.body).vector_store !== undefined; }
        catch (e) { return false; }
      },
    });

    sleep(0.5);
  });

  // ── GROUP 4: Chat Endpoint (Heavy, Requires Auth) ─────────────
  // NOTE: Chat is rate-limited to 20 requests/minute per IP.
  // k6 Cloud runs from multiple IPs so this is safe in cloud mode,
  // but on local mode you will hit the rate limit quickly!
  group("Chat", function () {
    const questions = [
      "What is the main topic of the uploaded documents?",
      "Summarize the key points.",
      "What are the most important facts?",
      "Are there any dates or numbers mentioned?",
    ];
    const question = questions[Math.floor(Math.random() * questions.length)];

    const payload = JSON.stringify({ question });
    const res = http.post(`${BASE_URL}/chat`, payload, authHeaders());

    chatLatency.add(res.timings.duration);
    errorRate.add(res.status !== 200 && res.status !== 429);

    const passed = check(res, {
      "chat: status is 200 or 429": (r) => r.status === 200 || r.status === 429,
      "chat: has answer field": (r) => {
        if (r.status !== 200) return true;
        try { return JSON.parse(r.body).answer !== undefined; }
        catch (e) { return false; }
      },
      "chat: has citations array": (r) => {
        if (r.status !== 200) return true;
        try { return Array.isArray(JSON.parse(r.body).citations); }
        catch (e) { return false; }
      },
    });

    if (passed && res.status === 200) {
      chatSuccessCount.add(1);
    }

    sleep(3);
  });
}

// ============================================================
// SETUP FUNCTION — Runs once before the test
// ============================================================
export function setup() {
  console.log(`Starting load test against: ${BASE_URL}`);

  const res = http.get(`${BASE_URL}/health`);
  if (res.status !== 200) {
    throw new Error(`API is not healthy! Status: ${res.status}. Aborting.`);
  }

  const healthData = JSON.parse(res.body);
  console.log(`API Version: ${healthData.version}`);
  console.log(`Git Commit:  ${healthData.git_commit}`);
  console.log(`Storage:     ${healthData.storage_backend}`);
  console.log(`Auth:        ${healthData.auth_enabled}`);

  if (healthData.auth_enabled && !AUTH_TOKEN) {
    console.warn("WARNING: AUTH_ENABLED=true but no AUTH_TOKEN set. Chat/document tests will return 401!");
  }

  return { version: healthData.version, commit: healthData.git_commit };
}

// ============================================================
// TEARDOWN FUNCTION — Runs once after the test
// ============================================================
export function teardown(data) {
  console.log(`Test complete. Version: ${data.version} @ commit ${data.commit}`);
}
