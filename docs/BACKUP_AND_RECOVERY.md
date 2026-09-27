# BloodLink – Backup, Data Retention & Disaster Recovery Standard

> **Regulatory Compliance & Clinical Continuity Standard**  
> Covers data preservation, encryption at rest, restoration auditing, and two-person authorization.

---

## 1. Objectives & Metrics

- **Recovery Point Objective (RPO):** < 1 Hour  
  *Maximum tolerable data loss period in the event of catastrophic server or host failure.*
- **Recovery Time Objective (RTO):** < 30 Minutes  
  *Target duration to restore database operations and public directory services.*

---

## 2. Configurable Data Retention Policies

BloodLink enforces statutory clinical and data privacy lifecycles:

| Data Type | Retention Window | Governance Rationale | Post-Expiry Action |
| :--- | :--- | :--- | :--- |
| **Inactive Donor Contacts** | 730 Days (2 Years) | Contact details of donors who have neither logged in nor updated availability. | Verification reminder dispatched; if unconfirmed, personal phone/email scrubbed. |
| **Closed Request Disclosures** | 90 Days | Mutual phone/email access granted between matched donor and patient. | Revoked; access token expired; numbers masked in UI. |
| **Notification Queue Logs** | 60 Days | Transient SMS, email, and web push delivery metadata. | Automated TTL table purge. |
| **Clinical Cooldown Records** | 2,555 Days (7 Years) | Verified donation dates, units, adverse reactions, and cooldown overrides. | Preserved in immutable clinical archive (DGHS standards). |
| **Audit Logs** | 2,555 Days (7 Years) | Administrative actions, consent approvals, verification reviews, and bans. | Preserved with all PII masked. |

---

## 3. Safe Deletion Strategy

When a voluntary donor requests account deletion via `/dashboard/privacy` or `/api/user/delete`:
1. **Immediate Unlisting:** `public_listing_enabled` is immediately set to `false`, and `availability_status` to `'temporarily_unavailable'`.
2. **Contact Scrubbing:** Full name is replaced with `"Deleted Donor"`, email with `deleted_<uuid>@anonymized.bloodlink.org`, and phone with `***-***-0000`. Home locality and notes are cleared.
3. **Clinical Registry Retention:** Historical donation dates and units are maintained under the anonymized ID to prevent falsification of cooldown intervals and ensure hospital transfusion logs remain auditable.
4. **Audit Logging:** An `ACCOUNT_DELETED` entry is recorded in the append-only audit trail.

---

## 4. Backup Strategy & Encryption

### Supabase Production Database
- **Continuous Archiving:** PostgreSQL Write-Ahead Logging (WAL) enabled with Point-In-Time-Recovery (PITR).
- **Daily Full Backups:** Automated daily snapshot stored across redundant cloud storage regions.
- **Encryption at Rest:** All backups encrypted using AES-256 with customer-managed or cloud KMS keys.

### Local JSON Store (Demo / Fallback Mode)
- **Atomic Writes:** Database writes use atomic staging (`tempFile.tmp.<timestamp>`) and asynchronous promise-chained serialization to prevent corruption from concurrent requests.
- **Periodic Snapshot Script:** Run `npm run backup:snapshot` to archive `data/bloodlink_db.json` with timestamped gzip compression.

---

## 5. Restoration Authority & Audit Protocol

- **Authorized Personnel:** Only users with the designated `system_superadmin` role may trigger a database restoration.
- **Two-Person Rule:** Production restorations require secondary approval from the Medical Director or Data Protection Officer.
- **Audit Logging:** Every restoration operation triggers an append-only audit log entry recording:
  - Timestamp of restoration
  - Restoring administrator ID
  - Authorizing medical officer ID
  - Source snapshot identifier
  - Post-restoration verification checksum
