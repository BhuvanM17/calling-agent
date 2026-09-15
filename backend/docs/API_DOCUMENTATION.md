# BizzHub CRM & Calling Agent — API Documentation

## Overview
This document provides complete, production-ready documentation for all REST API endpoints, webhooks, and AI services provided by the **BizzHub CRM & Voice Agent Bridge** backend server.

---

## Base URL & Configuration

| Environment | Base URL |
| :--- | :--- |
| **Local Development** | `http://localhost:3000` |
| **Network Host** | `http://<server-ip>:3000` |

### Default Headers
```http
Content-Type: application/json
Accept: application/json
```

### CORS & Access
- The server supports cross-origin requests from web dashboards (`localhost`, custom domains, and `file://` origins).
- Pre-flight `OPTIONS` requests return `200 OK` with full headers allowed.

---

## Table of Contents
1. [Leads Management API](#1-leads-management-api)
   - [1.1 List All Leads](#11-list-all-leads)
   - [1.2 Get Lead by ID](#12-get-lead-by-id)
   - [1.3 Create Lead](#13-create-lead)
   - [1.4 Update Lead Details](#14-update-lead-details)
   - [1.5 Update Lead Status](#15-update-lead-status)
   - [1.6 Delete Lead](#16-delete-lead)
2. [Timeline & Notes API](#2-timeline--notes-api)
   - [2.1 Get Lead Activity Timeline](#21-get-lead-activity-timeline)
   - [2.2 Add Internal Note](#22-add-internal-note)
   - [2.3 Log Follow-up Outreach](#23-log-follow-up-outreach)
3. [Voice Calls & Simulation API](#3-voice-calls--simulation-api)
   - [3.1 List Call Logs](#31-list-call-logs)
   - [3.2 Get Call by ID](#32-get-call-by-id)
   - [3.3 Dispatch Outbound Call](#33-dispatch-outbound-call)
   - [3.4 Simulate Call Record](#34-simulate-call-record)
4. [Analytics & Stats API](#4-analytics--stats-api)
   - [4.1 Get Dashboard Statistics](#41-get-dashboard-statistics)
5. [AI Automation Services API](#5-ai-automation-services-api)
   - [5.1 AI Lead Scoring](#51-ai-lead-scoring)
   - [5.2 AI Email Generator & Polisher](#52-ai-email-generator--polisher)
   - [5.3 AI Pipeline Insights](#53-ai-pipeline-insights)
6. [Webhooks API](#6-webhooks-api)
   - [6.1 Bolna AI Webhook](#61-bolna-ai-webhook)
   - [6.2 Meta Lead Ads Webhook](#62-meta-lead-ads-webhook)
7. [Health & System API](#7-health--system-api)
   - [7.1 Health Check](#71-health-check)

---

## 1. Leads Management API

### 1.1 List All Leads

#### Endpoint
```http
GET /api/leads
```

#### Purpose
Retrieve all captured leads from the persistent database with support for text search, status filtering, source filtering, and pagination.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `page` | `number` | No | `1` | Page number for pagination (e.g., `1`, `2`, `3`). |
| `limit` | `number` | No | `10` | Maximum number of records to return per page. |
| `search` | `string` | No | — | Case-insensitive search across `name`, `phone`, `email`, `company`, `location`. |
| `status` | `string` | No | `all` | Filter by status (`new`, `contacted`, `qualified`, `tour_scheduled`, `converted`, `lost`). |
| `source` | `string` | No | `all` | Filter by source (`website`, `instagram`, `facebook`, `whatsapp`, `google_ads`, `call`, `manual`). |

#### Request Example
```http
GET /api/leads?page=1&limit=10&status=new&search=Koramangala HTTP/1.1
Host: localhost:3000
```

#### Paginated Response Example (`200 OK`)
```json
{
  "success": true,
  "message": "Leads retrieved successfully",
  "type": "success",
  "userFriendlyMessage": "Lead records have been retrieved.",
  "data": {
    "leads": [
      {
        "id": "lead_1788515020614_o1d0",
        "name": "Aakash Mehta",
        "phone": "+91 9811223344",
        "email": "aakash@mehtaenterprises.com",
        "company": "Mehta Enterprises",
        "source": "website",
        "status": "new",
        "spaceType": "Managed Office",
        "seats": "15",
        "location": "Koramangala",
        "duration": "12 months",
        "budget": "₹1,50,000/mo",
        "recommendedCentre": "BizzHub Prime Koramangala",
        "notes": "Requires dedicated conference room and high-speed leased line.",
        "tags": ["enterprise", "urgent"],
        "aiScore": 8,
        "aiScoreReason": "High intent enterprise team (15 seats)",
        "sentiment": "Positive",
        "requirementsChanged": false,
        "createdAt": "2026-09-04T09:43:20.614Z",
        "updatedAt": "2026-09-04T09:43:20.614Z"
      }
    ],
    "totalPages": 5,
    "currentPage": 1,
    "totalRecords": 48,
    "limit": 10
  }
}
```

> **Note:** If requested without `page` and `limit`, the endpoint can also return a direct array for simple list views.

---

### 1.2 Get Lead by ID

#### Endpoint
```http
GET /api/leads/:id
```

#### Purpose
Retrieve a single lead with their complete nested **activity timeline** and **call history**.

#### URL Parameters
- `id` (`string`, required): Unique ID of the lead (e.g., `lead_1788515020614_o1d0`).

#### Response Example (`200 OK`)
```json
{
  "id": "lead_1788515020614_o1d0",
  "name": "Aakash Mehta",
  "phone": "+91 9811223344",
  "email": "aakash@mehtaenterprises.com",
  "company": "Mehta Enterprises",
  "source": "website",
  "status": "tour_scheduled",
  "spaceType": "Managed Office",
  "seats": "15",
  "location": "Koramangala",
  "recommendedCentre": "BizzHub Prime Koramangala",
  "notes": "Requires dedicated conference room.",
  "tags": ["enterprise"],
  "aiScore": 9,
  "sentiment": "Positive",
  "requirementsChanged": false,
  "createdAt": "2026-09-04T09:43:20.614Z",
  "updatedAt": "2026-09-04T09:43:41.319Z",
  "activities": [
    {
      "id": "act_1788515021319_a1b2",
      "leadId": "lead_1788515020614_o1d0",
      "type": "status_change",
      "title": "Status updated: CONTACTED → TOUR_SCHEDULED",
      "detail": "Tour scheduled for 3 PM Friday.",
      "metadata": {
        "oldStatus": "contacted",
        "newStatus": "tour_scheduled"
      },
      "createdAt": "2026-09-04T09:43:41.319Z"
    },
    {
      "id": "act_1788515020641_ca6y",
      "leadId": "lead_1788515020614_o1d0",
      "type": "note",
      "title": "Note by Advisor",
      "detail": "Client requested a site visit on Friday afternoon.",
      "metadata": null,
      "createdAt": "2026-09-04T09:43:20.641Z"
    }
  ],
  "calls": [
    {
      "callId": "test_call_1788515020645",
      "leadId": "lead_1788515020614_o1d0",
      "leadName": "Aakash Mehta",
      "phone": "+91 9811223344",
      "provider": "bolna",
      "callType": "confirm_agent",
      "status": "completed",
      "sentiment": "Positive",
      "outcome": "Site Visit Confirmed",
      "callSummary": "Aakash confirmed interest in 15 seats at Koramangala Hub and agreed for tour.",
      "timestamp": "2026-09-04T09:43:20.645Z"
    }
  ]
}
```

---

### 1.3 Create Lead

#### Endpoint
```http
POST /api/leads
```

#### Purpose
Create a new lead enquiry from web forms, n8n AI chatbot, CRM UI, or landing pages. Automatically generates a `created` activity in the lead timeline.

#### Request Body
```json
{
  "name": "Rahul Sharma",
  "phone": "+91 9876543210",
  "email": "rahul.sharma@example.com",
  "company": "Fintech Innovations",
  "source": "website",
  "location": "Whitefield",
  "spaceType": "Private Cabin",
  "seats": "8",
  "duration": "6 months",
  "budget": "₹80,000/mo",
  "notes": "Looking for immediate move-in."
}
```

#### Field Specifications

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | **Yes** (or `phone`) | Full name of the prospect. |
| `phone` | `string` | **Yes** (or `name`) | Contact phone number (auto-normalized). |
| `email` | `string` | No | Prospect email address. |
| `company` | `string` | No | Organization / company name. |
| `source` | `string` | No | Lead acquisition channel (default: `website`). |
| `status` | `string` | No | Initial status (default: `new`). |
| `location` | `string` | No | Location preference (e.g., `Koramangala`, `Whitefield`). |
| `spaceType` | `string` | No | `Managed Office`, `Dedicated Desk`, `Private Cabin`, `Virtual Office`. |
| `seats` | `string` \| `number` | No | Number of seats required. |
| `notes` | `string` | No | Context notes or specific requests. |

#### Response Example (`201 Created`)
```json
{
  "success": true,
  "lead": {
    "id": "lead_1788515099123_k8x1",
    "name": "Rahul Sharma",
    "phone": "+91 9876543210",
    "email": "rahul.sharma@example.com",
    "company": "Fintech Innovations",
    "source": "website",
    "status": "new",
    "spaceType": "Private Cabin",
    "seats": "8",
    "location": "Whitefield",
    "createdAt": "2026-09-04T09:44:00.000Z",
    "updatedAt": "2026-09-04T09:44:00.000Z"
  }
}
```

---

### 1.4 Update Lead Details

#### Endpoint
```http
PUT /api/leads/:id
```

#### Purpose
Update full details of an existing lead record (contact details, space requirements, notes, tags).

#### Request Body
```json
{
  "name": "Rahul Sharma",
  "company": "Fintech Innovations Pvt Ltd",
  "seats": "12",
  "location": "Koramangala",
  "spaceType": "Managed Office",
  "recommendedCentre": "BizzHub Koramangala Hub 1",
  "notes": "Upgraded requirement from 8 to 12 seats.",
  "tags": ["priority", "expanding"]
}
```

#### Response Example (`200 OK`)
```json
{
  "success": true,
  "lead": {
    "id": "lead_1788515099123_k8x1",
    "name": "Rahul Sharma",
    "company": "Fintech Innovations Pvt Ltd",
    "seats": "12",
    "location": "Koramangala",
    "spaceType": "Managed Office",
    "recommendedCentre": "BizzHub Koramangala Hub 1",
    "updatedAt": "2026-09-04T09:45:12.000Z"
  }
}
```

---

### 1.5 Update Lead Status

#### Endpoint
```http
PATCH /api/leads/:id/status
```

#### Purpose
Update only the lead pipeline status and record a `status_change` entry in the lead's timeline history.

#### Request Body
```json
{
  "status": "tour_scheduled",
  "reason": "Scheduled in-person tour for Tuesday 11:00 AM."
}
```

#### Allowed Statuses
`new`, `contacted`, `qualified`, `tour_scheduled`, `converted`, `lost`.

#### Response Example (`200 OK`)
```json
{
  "success": true,
  "lead": {
    "id": "lead_1788515099123_k8x1",
    "name": "Rahul Sharma",
    "status": "tour_scheduled",
    "updatedAt": "2026-09-04T09:46:00.000Z"
  }
}
```

---

### 1.6 Delete Lead

#### Endpoint
```http
DELETE /api/leads/:id
```

#### Purpose
Permanently remove a lead and all associated timeline activities from the database.

#### Response Example (`200 OK`)
```json
{
  "success": true,
  "message": "Lead deleted successfully"
}
```

---

## 2. Timeline & Notes API

### 2.1 Get Lead Activity Timeline

#### Endpoint
```http
GET /api/leads/:id/activities
```

#### Purpose
Retrieve reverse-chronological timeline activities for a lead (calls, notes, emails, status changes).

#### Response Example (`200 OK`)
```json
[
  {
    "id": "act_1788515020641_ca6y",
    "leadId": "lead_1788515020614_o1d0",
    "type": "note",
    "title": "Note by Advisor",
    "detail": "Client requested a site visit on Friday afternoon.",
    "metadata": null,
    "createdAt": "2026-09-04T09:43:20.641Z"
  }
]
```

---

### 2.2 Add Internal Note

#### Endpoint
```http
POST /api/leads/:id/notes
```

#### Purpose
Add a manual observation, reminder, or meeting note directly to the lead's timeline. The backend automatically tags the note with a human-readable timestamp (`[05 Sep 2026, 12:12 PM]`), appends it to the lead's `notes` record in MySQL, logs an `Activity` entry, and returns the updated lead object.

#### Request Body
```json
{
  "note": "Decision maker is visiting Bangalore next week. Send customized quotation.",
  "author": "Pooja (Sales Executive)"
}
```

#### Response Example (`200 OK`)
```json
{
  "success": true,
  "message": "Note added",
  "type": "success",
  "userFriendlyMessage": "Note logged to timeline with timestamp.",
  "data": {
    "activity": {
      "id": "act_1788590537624_yduc",
      "lead_id": "lead_1788588184116_kmns",
      "type": "note",
      "title": "Note by Pooja (Sales Executive)",
      "detail": "Decision maker is visiting Bangalore next week. Send customized quotation.",
      "createdAt": "2026-09-05T12:12:00.000Z"
    },
    "lead": {
      "id": "lead_1788588184116_kmns",
      "name": "Vikram Reddy",
      "phone": "+91 9845012345",
      "company": "TechCorp Global",
      "notes": "[05 Sep 2026, 12:12 PM] Decision maker is visiting Bangalore next week. Send customized quotation.",
      "activities": [
        {
          "id": "act_1788590537624_yduc",
          "type": "note",
          "title": "Note by Pooja (Sales Executive)",
          "label": "Note by Pooja (Sales Executive)",
          "detail": "Decision maker is visiting Bangalore next week. Send customized quotation.",
          "createdAt": "2026-09-05T12:12:00.000Z",
          "time": "2026-09-05T12:12:00.000Z"
        }
      ]
    }
  }
}
```

---

### 2.3 Log Follow-up Outreach

#### Endpoint
```http
POST /api/followup
```

#### Purpose
Log an outgoing follow-up action (email or WhatsApp message) into the lead's persistent timeline.

#### Request Body
```json
{
  "leadId": "lead_1788515020614_o1d0",
  "name": "Aakash Mehta",
  "phone": "+91 9811223344",
  "email": "aakash@mehtaenterprises.com",
  "subject": "Workspace Tour Confirmation — BizzHub",
  "body": "Hi Aakash, looking forward to meeting you at our Koramangala Hub on Friday.",
  "type": "email"
}
```

#### Response Example (`200 OK`)
```json
{
  "success": true,
  "message": "Follow-up recorded for Aakash Mehta"
}
```

---

## 3. Voice Calls & Simulation API

### 3.1 List Call Logs

#### Endpoint
```http
GET /api/calls
GET /api/logs
```

#### Purpose
Retrieve call records executed by Bolna AI voice agent.

#### Query Parameters
- `limit` (`number`, default: `50`): Max number of records.
- `offset` (`number`, default: `0`): Pagination offset.

#### Response Example (`200 OK`)
```json
[
  {
    "callId": "bolna_call_1788515020645",
    "leadId": "lead_1788515020614_o1d0",
    "leadName": "Aakash Mehta",
    "phone": "+91 9811223344",
    "provider": "bolna",
    "callType": "confirm_agent",
    "status": "completed",
    "sentiment": "Positive",
    "outcome": "Site Visit Confirmed",
    "callbackTime": null,
    "callSummary": "Aakash confirmed requirement for 15 seats at Koramangala. Tour scheduled.",
    "transcript": "Agent: Hello Aakash... User: Yes, looking for 15 seats...",
    "location": "Koramangala",
    "originalLocation": "Koramangala",
    "seats": "15",
    "originalSeats": "15",
    "timestamp": "2026-09-04T09:43:20.645Z",
    "endedAt": "2026-09-04T09:44:15.000Z"
  }
]
```

---

### 3.2 Get Call by ID

#### Endpoint
```http
GET /api/calls/:id
```

#### Purpose
Fetch full details, transcript, and metrics for a specific call.

---

### 3.3 Dispatch Outbound Call

#### Endpoint
```http
POST /api/test-call
```

#### Purpose
Dispatch an automated AI voice agent outbound call to a prospective lead via Bolna AI. Automatically creates or updates the lead in the persistent database.

#### Request Body
```json
{
  "name": "Kavita Rao",
  "phone": "+91 9845012345",
  "location": "Whitefield",
  "seats": "6",
  "workspaceType": "Managed Office",
  "callType": "confirm_agent",
  "callbackSchedule": null
}
```

#### Call Types
- `confirm_agent`: AI voice agent confirms workspace enquiry and gathers specific needs.
- `just_call`: Standard automated outreach call.
- `follow_up`: Check-in follow-up call.
- `schedule_callback`: Schedule call for a specific future ISO datetime.

#### Response Example (`200 OK`)
```json
{
  "success": true,
  "callId": "exec_883a9f1b72",
  "leadId": "lead_1788515200000_w1q2",
  "provider": "bolna",
  "providerName": "Bolna AI (Agent: Sophia)",
  "callType": "confirm_agent"
}
```

---

### 3.4 Simulate Call Record

#### Endpoint
```http
POST /api/simulate-call
```

#### Purpose
Inject a simulated call execution record for local testing, webhook validation, and dashboard QA.

#### Request Body
```json
{
  "leadName": "Vikram Sethi",
  "phone": "+91 9123456780",
  "sentiment": "Positive",
  "outcome": "Callback Requested",
  "callbackTime": "4:30 PM",
  "callSummary": "Vikram expressed interest in 20 seats at Diamond District. Wants callback at 4:30 PM.",
  "location": "Diamond District",
  "seats": "20",
  "spaceType": "Managed Office"
}
```

#### Response Example (`200 OK`)
```json
{
  "success": true,
  "callId": "sim_1788515021338",
  "message": "Simulated call created for Vikram Sethi with callback at 4:30 PM"
}
```

---

## 4. Analytics & Stats API

### 4.1 Get Dashboard Statistics

#### Endpoint
```http
GET /api/stats
```

#### Purpose
Retrieve real-time aggregate statistics computed directly from the SQLite database.

#### Response Example (`200 OK`)
```json
{
  "total": 42,
  "completed": 38,
  "failed": 4,
  "initiated": 0,
  "today": 9,
  "callbacks": 6,
  "positive": 24,
  "neutral": 12,
  "negative": 2,
  "totalLeads": 58,
  "newLeads": 14,
  "contactedLeads": 22,
  "qualifiedLeads": 10,
  "tourLeads": 8,
  "convertedLeads": 3,
  "lostLeads": 1,
  "uptime": 1420,
  "provider": "bolna",
  "providerName": "Bolna AI (Agent: Sophia)",
  "configured": true
}
```

---

## 5. AI Automation Services API

### 5.1 AI Lead Scoring

#### Endpoint
```http
POST /api/ai/score
```

#### Purpose
Score leads (1–10) with reasoning based on call sentiment, requirement changes, seat count, and engagement status using Google Gemini (with deterministic rule-based fallback).

#### Request Body
```json
{
  "leads": [
    {
      "id": "lead_101",
      "name": "Ananya Roy",
      "status": "contacted",
      "sentiment": "Positive",
      "requirementsChanged": true,
      "seats": "25",
      "location": "Koramangala"
    }
  ]
}
```

#### Response Example (`200 OK`)
```json
{
  "success": true,
  "scores": [
    {
      "id": "lead_101",
      "score": 9,
      "reason": "High intent enterprise team (25 seats)"
    }
  ]
}
```

---

### 5.2 AI Email Generator & Polisher

#### Endpoint
```http
POST /api/ai/email
```

#### Purpose
Draft, improve, shorten, formalize, or translate follow-up emails for sales representatives.

#### Request Body
```json
{
  "mode": "write",
  "lead": {
    "name": "Siddharth",
    "location": "Whitefield",
    "spaceType": "Managed Office",
    "seats": "10",
    "duration": "1 year"
  },
  "extraInstructions": "Highlight our high-speed internet and complimentary meeting rooms."
}
```

#### Available Modes
- `write`: Draft new personalized follow-up email.
- `improve`: Enhance grammar, flow, and persuasion of existing text.
- `shorter`: Condense message to under 100 words.
- `formal`: Rewrite in an executive corporate tone.
- `hindi`: Translate email into natural conversational Hindi.

#### Response Example (`200 OK`)
```json
{
  "success": true,
  "subject": "Workspace Solutions for Your Team in Whitefield — BizzHub",
  "body": "Hi Siddharth,\n\nThank you for exploring BizzHub Workspaces for your 10-seat managed office in Whitefield.\n\nOur Whitefield centre features enterprise-grade high-speed leased lines, fully equipped meeting suites, and ergonomic workspaces tailored for high-growth teams.\n\nWe would love to invite you for a 15-minute walkthrough this week to experience the space firsthand.\n\nBest regards,\nBizzHub Team\n📞 +91 96867 65227"
}
```

---

### 5.3 AI Pipeline Insights

#### Endpoint
```http
POST /api/ai/insights
```

#### Purpose
Analyze overall pipeline distribution and produce 4 actionable business insights.

#### Response Example (`200 OK`)
```json
{
  "success": true,
  "insights": [
    { "emoji": "📊", "text": "Active pipeline has <strong>58 leads</strong> with steady inflow." },
    { "emoji": "⚡", "text": "<strong>9 new enquiries</strong> arrived today requiring immediate touchpoints." },
    { "emoji": "🏢", "text": "High demand noted across <strong>Koramangala</strong> and <strong>Whitefield</strong>." },
    { "emoji": "🎯", "text": "Prioritize leads with <strong>Positive call sentiment</strong> for site visits." }
  ]
}
```

---

## 6. Webhooks API

### 6.1 Bolna AI Webhook

#### Endpoint
```http
POST /webhooks/bolna
```

#### Purpose
Receives asynchronous post-call execution payloads from Bolna AI. Extracts transcript, generates summary, performs sentiment classification, detects callback requests, and updates both the `calls` table and the associated `leads` table.

---

### 6.2 Meta Lead Ads Webhook

#### Endpoints
```http
GET /webhooks/facebook   (Webhook verification challenge)
POST /webhooks/facebook  (Live lead event ingestion)
```

#### Purpose
Verifies Meta Webhook Handshake (Hub Challenge) and automatically ingests Facebook & Instagram Lead Ad submissions into the CRM database in real time.

---

## 7. Health & System API

### 7.1 Health Check

#### Endpoint
```http
GET /health
```

#### Response Example (`200 OK`)
```json
{
  "status": "ok",
  "timestamp": "2026-09-04T09:50:00.000Z"
}
```
