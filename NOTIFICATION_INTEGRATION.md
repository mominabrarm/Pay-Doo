# Pay-Doo Notification System Integration Guide
**Email (Resend) & WhatsApp (Twilio) Multi-Channel Architecture**

---

## 1. Overview & Architecture

Pay-Doo includes an enterprise-grade multi-channel notification engine powering real-time transactional billing communication across **Email** and **WhatsApp**.

### Key Architectural Tenets:
1. **Non-Blocking Fault Isolation (Fail-Safe)**:
   - External notification dispatches run with strict error containment. If Resend or Twilio is unreachable, rate-limited, or unconfigured, invoices and payments **never** roll back. The transaction completes, and a diagnostic `NotificationLog` is persisted.
2. **Duplicate-Send Protection (Idempotency)**:
   - Every dispatch is guarded by an idempotency key structured as `{event}:{channel}:{target_id}` (e.g., `invoice_created:email:104`, `payment_confirmation:whatsapp:42`). Repeated processing of the same invoice or payment event skips duplicate sending unless explicitly forced via manual resend (`force_resend=True`).
3. **Cryptographically Signed Direct Access**:
   - Invoices include a 72-hour time-limited PyJWT token signed with `HS256` (`purpose="invoice_download"`, `invoice_id`, `customer_id`, `exp`). This allows one-click PDF downloads from WhatsApp and Email without placing long-lived user session credentials or passwords in links. Mismatched or tampered tokens are rejected with `403 Forbidden`.
4. **Official ReportLab PDF Attachments**:
   - Emails automatically generate and attach the exact legal GST-compliant PDF invoice rendered by ReportLab in-memory as base64 without temporary disk leaks.
5. **Customer Role Isolation & Consent**:
   - Customers can view and trigger resends exclusively for their own invoices. Notification channel preferences (`notify_email`, `notify_whatsapp`, `whatsapp_number`) can be configured by the customer at any time in Account Settings.

---

## 2. Event Triggers

| Event Trigger | Channels Dispatched | Description | Payload Data |
| :--- | :--- | :--- | :--- |
| **Customer Checkout / Self-Subscribe** (`POST /api/subscriptions/subscribe`) | Email + WhatsApp | Dispatches immediate initial invoice statement when subscription is initiated. | Total amount, due date, billing period, PDF attachment, secure download link. |
| **Automated Billing Run** (`POST /api/invoices/run-billing-cycle`) | Email + WhatsApp | Dispatches new cycle invoice statements for all subscriptions renewed. | Same as invoice generation. |
| **Manual Admin Invoice Generation** (`POST /api/subscriptions/{id}/generate-invoice`) | Email + WhatsApp | Dispatched when staff/admin generates an ad-hoc or cycle invoice. | Same as invoice generation. |
| **Payment Recorded** (`POST /api/invoices/{id}/payments`) | Email + WhatsApp | Real-time payment receipt confirmation for settled amounts. | Payment reference number, amount paid, payment method, remaining balance. |
| **Manual Resend** (`POST /api/notifications/invoices/{id}/send`) | Email, WhatsApp, or Both | On-demand invoice copy resend triggered by customer or admin. | Fresh signed 72-hour link, PDF attachment. |

---

## 3. Environment Variables & Configuration

All messaging credentials remain strictly server-side in `backend/.env`.

```bash
# ==============================================================================
# EMAIL NOTIFICATIONS (Resend)
# ==============================================================================
# API Key from https://resend.com/api-keys
RESEND_API_KEY="re_123456789_abcdef..."

# Verified Sender Email (e.g. "Pay-Doo Billing <billing@yourdomain.com>" or onboarding address)
RESEND_FROM="Pay-Doo Billing <onboarding@resend.dev>"

# ==============================================================================
# WHATSAPP NOTIFICATIONS (Twilio)
# ==============================================================================
# Twilio Account SID & Auth Token from https://console.twilio.com
TWILIO_ACCOUNT_SID="ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
TWILIO_AUTH_TOKEN="your_twilio_auth_token_here"

# WhatsApp Sender Number (defaults to Twilio sandbox: whatsapp:+14155238886)
TWILIO_WHATSAPP_FROM="whatsapp:+14155238886"

# ==============================================================================
# APPLICATION URLS (For Download Links)
# ==============================================================================
APP_BASE_URL="http://localhost:8000"
FRONTEND_BASE_URL="http://localhost:5173"
```

> [!NOTE]
> If credentials are omitted in `.env`, the system automatically logs `skipped_no_credentials` status with a descriptive message in the database history, allowing full application usage and automated testing without crashes.

---

## 4. Setup & Provider Verification

### 4.1 Resend Email Setup
1. Create a free account at [Resend](https://resend.com).
2. Generate an API Key with "Full Access" or "Sending access".
3. **Sandbox / Development**:
   - You can send emails to your verified account email address using `onboarding@resend.dev` as `RESEND_FROM`.
4. **Production**:
   - Add and verify your custom domain in Resend DNS settings (DKIM, SPF, and DMARC records).
   - Set `RESEND_FROM="Pay-Doo Billing <billing@yourverifieddomain.com>"`.

### 4.2 Twilio WhatsApp Setup
1. Create an account at [Twilio](https://www.twilio.com).
2. Navigate to **Messaging -> Try WhatsApp** to activate the **Twilio WhatsApp Sandbox**.
3. **Sandbox Testing**:
   - Send the sandbox join code (e.g. `join <sandbox-keyword>`) from your testing WhatsApp phone to `+1 415 523 8886`.
   - Configure `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_WHATSAPP_FROM="whatsapp:+14155238886"`.
4. **Phone Normalization**:
   - Indian 10-digit mobile numbers (e.g., `9876543210`) are automatically normalized to `+919876543210`.
   - International numbers with country codes (e.g., `+1 (415) 555-2671` -> `+14155552671`) are sanitized to standard E.164.
5. **Production WhatsApp Business Profile**:
   - Requires Meta Business verification and approved Twilio WhatsApp Sender.
   - Proactive messaging outside customer-initiated 24-hour windows requires Meta-approved HSM message templates.

---

## 5. Testing & Verification

### 5.1 Automated Mocked Test Suite
Run the dedicated notification integration test suite:

```powershell
Set-Location "backend"
.\.venv\Scripts\python.exe -m pytest tests\test_notifications.py -v
```

**Tested Scenarios (100% Mocked - No external billing or live API costs required):**
- `test_normalize_phone_number`: Formats 10-digit, E.164, and rejects malformed numbers.
- `test_secure_invoice_download_token`: Verifies token creation, tamper rejection (403), and legitimate PDF download.
- `test_resend_email_dispatch_and_mock`: Verifies HTTP headers, PDF base64 encoding, recipient, and status transition.
- `test_twilio_whatsapp_dispatch_and_mock`: Verifies Twilio Basic Auth, E.164 parameters, body content, and message SID logging.
- `test_missing_credentials_graceful_handling`: Verifies fail-safe behavior when API keys are absent.
- `test_idempotency_duplicate_send_prevention`: Verifies second dispatch call does not fire duplicate outbound HTTP requests.
- `test_payment_confirmation_dispatch`: Verifies dual-channel dispatch upon payment recording.
- `test_customer_notification_preferences`: Verifies customer opt-out preferences (`skipped_preference`).
- `test_customer_isolation_on_notification_history`: Verifies customer A cannot inspect customer B's dispatch logs.

### 5.2 Manual Verification in the UI
1. Log in as a customer (`sarah@skynet-research.io` or register a new customer).
2. Go to **My Invoices** -> Select an invoice -> Click **View**.
3. Inspect the **Delivery & Notifications** card:
   - Review dispatch history logs and status badges (`SENT`, `SKIPPED`, `FAILED`).
   - Click **📧 Resend Email** or **💬 Resend WhatsApp** to trigger on-demand dispatch.
4. Go to **Account Settings**:
   - Toggle notification channels under **Notification Preferences**.
   - Set or update your WhatsApp phone number and click **Save Notification Preferences**.

---

## 6. Known Limitations & Production Notes

1. **Meta WhatsApp 24-Hour Customer Window**:
   - In freeform Twilio WhatsApp sandbox mode, messages can be sent freely to registered sandbox numbers. In production Meta WhatsApp, notifications initiated after 24 hours of customer contact must use pre-approved Meta WhatsApp Templates.
2. **Resend Free Tier Rate Limits**:
   - Resend free tier permits up to 100 emails per day and 2 emails per second. In high-volume production, an asynchronous Celery/Redis queue or webhook processor should ingest delivery receipts.

