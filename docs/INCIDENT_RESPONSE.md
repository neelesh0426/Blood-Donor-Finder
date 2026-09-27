# BloodLink – Incident Response Runbook & Security Operations

> **Transfusion Medicine & Voluntary Blood Directory Security Standard**  
> Operational triage procedures for security events, fraudulent solicitations, notification outages, and data integrity incidents.

---

## 1. Incident Severity Classification

| Severity | Definition | Examples | Response SLA |
| :--- | :--- | :--- | :--- |
| **P1 - Critical** | Active data breach, unauthorized donor contact scraping, database compromise. | Mass extraction of donor contacts, compromised admin credentials. | **< 15 minutes** |
| **P2 - High** | Commercial blood selling, advance payment scam, fake hospital broadcast. | User demanding payment for blood, fraudulent hospital requisition. | **< 1 hour** |
| **P3 - Medium** | Health check degraded, persistent rate limit tripping, latency spike. | `/api/health` returning degraded, database write queue contention. | **< 4 hours** |
| **P4 - Low** | Third-party provider failure (e.g. Resend or Twilio outage). | SMS delivery failures due to gateway downtime or quota exhaustion. | **< 12 hours** |

---

## 2. Immediate Containment & Resolution Procedures

### Scenario A: Commercial Blood Selling or Advance Payment Scam (P2)
*Commercial blood trading is illegal in India under the Drugs and Cosmetics Act (1940) and Supreme Court ruling (1996).*

1. **Immediate Suspension:**
   - Navigate to `/admin` -> **Fraud & Scam Reports**.
   - Review reported phone number, email, or message logs.
   - Click **Resolve & Suspend** on the target account. This immediately sets `moderation_status = 'suspended'` and disables public listing.
2. **Evidence Preservation:**
   - Run audit trail export from `/admin` for target entity ID.
   - Preserve timestamped messages, screenshots, and bank/UPI handles submitted by the reporter.
3. **Notify Affected Requesters:**
   - If the scammer contacted urgent requesters, dispatch a high-priority warning via `NotificationService`:
     > *"⚠️ Security Alert: User [Target] has been suspended for soliciting unauthorized payments. BloodLink never asks for money. Do not transfer funds."*
4. **Regulatory Reporting:**
   - Forward dossier to the State Blood Transfusion Council (SBTC) and local Cyber Crime Cell if extortion or large-scale fraud is detected.

---

### Scenario B: Suspected PII Scraping or Automated Crawling (P1)
1. **Rate Limiting Inspection:**
   - Check rate limit logs for endpoints `/api/donors/search` and `/api/requests`.
   - The built-in rate limiter restricts contact inquiries to 10/hour per IP.
2. **Cloudflare Turnstile Enforcement:**
   - Verify `TURNSTILE_SECRET_KEY` is active in `.env.local` / production environment variables.
   - Set Turnstile challenge mode to "Managed" or "Interactive" in Cloudflare Dashboard for aggressive bot protection.
3. **Database Safeguards:**
   - Note that public search endpoints (`/api/donors/search`, `/public_donor_directory`) **do not contain** phone numbers or email addresses in the schema. Even if scraped, attacker only receives pseudonymous first names and blood groups.

---

### Scenario C: Notification Provider Failure (Resend or Twilio) (P4)
1. **Diagnosis via Health Endpoint:**
   - Query `GET /api/health` without authentication.
   - Inspect `checks.notifications.emailConfigured` and `checks.notifications.smsConfigured`.
2. **Fallback Verification:**
   - In accordance with BloodLink trust standards, when provider credentials are absent or return HTTP errors, the system marks delivery as `provider_not_configured` or `failed`. **It never pretends messages were delivered.**
3. **Provider Rotation:**
   - Update `RESEND_API_KEY` or `TWILIO_AUTH_TOKEN` in the environment configuration.
   - Restart the server process.

---

### Scenario D: Database Latency or Write Queue Degradation (P3)
1. **Inspect `/api/health`:**
   - Check `checks.database.latencyMs`. If > 1000ms, investigate storage I/O.
2. **File Store Integrity (Local / Fallback Mode):**
   - Verify write permissions on `data/bloodlink_db.json`.
   - Check if temporary atomic write files (`*.tmp.*`) are stuck in `data/`.
3. **Supabase PostgreSQL Mode:**
   - Check Supabase Dashboard connection pooler metrics (PgBouncer).
   - Verify active Row Level Security (RLS) policies are indexed on foreign keys (`profile_id`, `blood_group`, `verification_status`).

---

## 3. Post-Incident Review & Compliance Log
Following any P1 or P2 resolution:
1. Conduct root-cause analysis (RCA) within 48 hours.
2. Ensure the action is logged in `public.audit_logs` with sanitized metadata.
3. File the post-mortem summary in the compliance archive.
