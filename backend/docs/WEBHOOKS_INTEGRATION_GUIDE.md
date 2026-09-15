# BizzHub CRM — Webhooks & Telephony Integration Guide

## Overview
The BizzHub Voice Agent Bridge receives real-time webhook events from telephony AI provider (**Bolna AI**) and advertising platforms (**Meta Lead Ads**).

---

## 1. Bolna AI Webhook Integration

### Endpoint
```http
POST /webhooks/bolna
```

### Webhook Event Flow
1. Bolna executes an automated outbound phone call with the prospect.
2. At the end of the call, Bolna sends an HTTP `POST` webhook with transcripts, execution status, and extracted data.
3. The server acknowledges with `200 OK` immediately.
4. The server runs NLP extraction:
   - Evaluates conversation transcript and summary.
   - Extracts customer sentiment (`Positive`, `Neutral`, `Negative`).
   - Identifies callback requests and extracted timings.
   - Updates the `calls` table and the matching `leads` table in SQLite.
   - Logs a timeline item in `activities`.

### Payload Structure Example
```json
{
  "agent_execution_id": "exec_883a9f1b72",
  "status": "completed",
  "assistant_name": "Sophia",
  "company_name": "BizzHub Workspaces",
  "user_data": {
    "lead_id": "lead_1788515020614_o1d0",
    "location": "Koramangala",
    "seats": "15"
  },
  "extracted_data": {
    "location_preference": "Koramangala",
    "seats": "15",
    "workspace_type": "Managed Office",
    "recommended_centre": "BizzHub Prime Koramangala",
    "sentiment": "Positive"
  },
  "conversation_summary": "Client confirmed requirement for 15 seats in Koramangala. Scheduled site visit for Friday.",
  "conversation_transcript": [
    { "role": "assistant", "message": "Hi Aakash, this is Sophia from BizzHub Workspaces. How are you?" },
    { "role": "user", "message": "Hi Sophia, I am looking for a 15-seat office in Koramangala." },
    { "role": "assistant", "message": "Wonderful! We have great availability at BizzHub Prime Koramangala. Would you like to visit on Friday?" },
    { "role": "user", "message": "Yes, Friday afternoon works great." }
  ]
}
```

---

## 2. Meta Lead Ads Webhook Integration

### Verification Endpoint (Handshake)
```http
GET /webhooks/facebook?hub.mode=subscribe&hub.challenge=1158201444&hub.verify_token=YOUR_VERIFY_TOKEN
```

### Live Ingestion Endpoint
```http
POST /webhooks/facebook
```

### Ingestion Flow
1. When a user submits an Instagram / Facebook Lead Form, Meta sends a webhook event with `leadgen_id`.
2. The server verifies the `X-Hub-Signature-256` HMAC signature using `FB_APP_SECRET`.
3. The server retrieves form fields via Meta Graph API.
4. The lead is inserted into the `leads` table and triggers an automatic outbound confirmation call if enabled.
