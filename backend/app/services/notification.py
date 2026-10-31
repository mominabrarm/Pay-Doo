import base64
import logging
import re
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import List, Optional
import httpx
import jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.notification import NotificationLog
from app.models.payment import Payment
from app.services.pdf import generate_invoice_pdf

logger = logging.getLogger("paydoo.notifications")


def _post_request(url: str, **kwargs) -> httpx.Response:
    with httpx.Client(timeout=10.0) as client:
        return client.post(url, **kwargs)


def generate_secure_invoice_token(invoice_id: int, customer_id: int, hours_valid: int = 72) -> str:
    """
    Generate a cryptographically signed, time-limited token for direct invoice PDF access.
    Expires after hours_valid (default: 72 hours).
    Does NOT leak user session tokens or passwords.
    """
    payload = {
        "sub": str(customer_id),
        "customer_id": customer_id,
        "invoice_id": invoice_id,
        "purpose": "invoice_download",
        "exp": datetime.now(timezone.utc) + timedelta(hours=hours_valid),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def normalize_phone_number(raw_phone: Optional[str]) -> Optional[str]:
    """
    Normalizes a phone number to E.164 format.
    Accepts numbers like +91 98765 43210, 9876543210, etc.
    Defaults 10-digit numbers to +91 (India).
    """
    if not raw_phone:
        return None
    cleaned = re.sub(r"[^\d+]", "", str(raw_phone).strip())
    if not cleaned:
        return None
    if cleaned.startswith("+"):
        digits = cleaned[1:]
        if len(digits) >= 8:
            return f"+{digits}"
        return None
    if len(cleaned) == 10:
        return f"+91{cleaned}"
    elif len(cleaned) >= 11:
        return f"+{cleaned}"
    return None


def _format_currency(val: Decimal) -> str:
    return f"{Decimal(str(val)):.2f}"


def build_invoice_email_html(invoice: Invoice, customer: Customer, download_url: str) -> str:
    items_html = ""
    for line in invoice.lines:
        items_html += f"""
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #1e293b;">{line.description}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #1e293b; text-align: center;">{line.quantity}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #1e293b; text-align: right;">INR {_format_currency(line.unit_price)}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #1e293b; text-align: right; font-weight: 600;">INR {_format_currency(line.total_amount)}</td>
        </tr>
        """

    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice #{invoice.invoice_number}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <div style="background-color: #0f172a; padding: 24px 32px; color: #ffffff;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; color: #ffffff;">Pay-Doo</h1>
        <span style="font-size: 13px; background-color: #0284c7; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; font-weight: 600;">{invoice.status}</span>
      </div>
      <p style="margin: 8px 0 0 0; font-size: 14px; color: #94a3b8;">Subscription Billing & Invoicing</p>
    </div>

    <div style="padding: 32px;">
      <p style="font-size: 16px; margin-top: 0;">Dear <strong>{customer.name}</strong>,</p>
      <p style="font-size: 14px; line-height: 1.6; color: #475569;">
        Your invoice <strong>#{invoice.invoice_number}</strong> for the billing period 
        <strong>{invoice.billing_period_start}</strong> to <strong>{invoice.billing_period_end}</strong> has been generated.
      </p>

      <div style="background-color: #f1f5f9; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;">
          <span style="color: #64748b;">Invoice Date:</span>
          <strong>{invoice.issue_date}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;">
          <span style="color: #64748b;">Payment Due Date:</span>
          <strong style="color: #dc2626;">{invoice.due_date}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;">
          <span style="color: #64748b;">Total Amount:</span>
          <strong style="font-size: 16px; color: #0f172a;">INR {_format_currency(invoice.total_amount)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 14px; border-top: 1px dashed #cbd5e1; padding-top: 8px;">
          <span style="color: #64748b;">Outstanding Balance:</span>
          <strong style="font-size: 16px; color: #b91c1c;">INR {_format_currency(invoice.outstanding_balance)}</strong>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-top: 20px; text-align: left;">
        <thead>
          <tr style="background-color: #f8fafc;">
            <th style="padding: 10px; border-bottom: 2px solid #cbd5e1; font-size: 12px; text-transform: uppercase; color: #64748b;">Item</th>
            <th style="padding: 10px; border-bottom: 2px solid #cbd5e1; font-size: 12px; text-transform: uppercase; color: #64748b; text-align: center;">Qty</th>
            <th style="padding: 10px; border-bottom: 2px solid #cbd5e1; font-size: 12px; text-transform: uppercase; color: #64748b; text-align: right;">Unit Price</th>
            <th style="padding: 10px; border-bottom: 2px solid #cbd5e1; font-size: 12px; text-transform: uppercase; color: #64748b; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items_html}
        </tbody>
      </table>

      <div style="text-align: center; margin: 32px 0 20px 0;">
        <a href="{download_url}" style="background-color: #0284c7; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(2, 132, 199, 0.3);">
          Download Invoice PDF
        </a>
      </div>
      <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
        A copy of your PDF invoice is also attached to this email.
      </p>
    </div>

    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 32px; text-align: center; font-size: 12px; color: #94a3b8;">
      Questions? Contact our billing team at support@paydoo.internal.<br/>
      This is an automated notification from Pay-Doo.
    </div>
  </div>
</body>
</html>
"""


def build_payment_email_html(payment: Payment, invoice: Invoice, customer: Customer) -> str:
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payment Receipt - {payment.payment_number}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <div style="background-color: #059669; padding: 24px 32px; color: #ffffff;">
      <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff;">Payment Confirmation</h1>
      <p style="margin: 8px 0 0 0; font-size: 14px; color: #d1fae5;">Receipt #{payment.payment_number}</p>
    </div>

    <div style="padding: 32px;">
      <p style="font-size: 16px; margin-top: 0;">Dear <strong>{customer.name}</strong>,</p>
      <p style="font-size: 14px; line-height: 1.6; color: #475569;">
        We have successfully received and recorded your payment of <strong>INR {_format_currency(payment.amount)}</strong>.
      </p>

      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;">
          <span style="color: #166534;">Payment Reference:</span>
          <strong>{payment.payment_number}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;">
          <span style="color: #166534;">Invoice Number:</span>
          <strong>#{invoice.invoice_number}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;">
          <span style="color: #166534;">Payment Method:</span>
          <strong>{payment.payment_method.replace('_', ' ').title()}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;">
          <span style="color: #166534;">Payment Date:</span>
          <strong>{payment.payment_date}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;">
          <span style="color: #166534;">Amount Paid:</span>
          <strong style="color: #059669; font-size: 16px;">INR {_format_currency(payment.amount)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 14px; border-top: 1px dashed #86efac; padding-top: 8px;">
          <span style="color: #166534;">Remaining Balance:</span>
          <strong style="font-size: 16px; color: #1e293b;">INR {_format_currency(invoice.outstanding_balance)}</strong>
        </div>
      </div>

      <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
        Thank you for keeping your account up to date. You can view your updated billing records directly in your customer portal.
      </p>
    </div>

    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 32px; text-align: center; font-size: 12px; color: #94a3b8;">
      Pay-Doo Billing System • Automated Receipt
    </div>
  </div>
</body>
</html>
"""


def send_invoice_email(
    db: Session,
    invoice: Invoice,
    customer: Optional[Customer] = None,
    force_resend: bool = False,
) -> NotificationLog:
    """
    Sends invoice email with attached PDF using Resend.
    Guarantees idempotency via idempotency_key.
    Handles missing credentials and provider errors gracefully.
    """
    if not customer:
        customer = db.query(Customer).filter(Customer.id == invoice.customer_id).first()

    if not customer:
        raise ValueError(f"Customer {invoice.customer_id} not found for invoice {invoice.id}")

    idempotency_key = f"invoice_created:email:{invoice.id}"
    existing_log = db.query(NotificationLog).filter(NotificationLog.idempotency_key == idempotency_key).first()

    if existing_log and existing_log.status in ["sent", "delivered"] and not force_resend:
        logger.info(f"Notification already sent for key {idempotency_key}; skipping duplicate dispatch.")
        return existing_log

    token = generate_secure_invoice_token(invoice.id, customer.id, hours_valid=72)
    download_url = f"{settings.APP_BASE_URL}/api/invoices/{invoice.id}/pdf?token={token}"

    log_entry = existing_log or NotificationLog(
        customer_id=customer.id,
        invoice_id=invoice.id,
        channel="email",
        notification_type="invoice_created",
        recipient=customer.email,
        subject=f"Invoice #{invoice.invoice_number} from Pay-Doo - Due {invoice.due_date}",
        idempotency_key=idempotency_key,
        attempt_count=0,
    )

    if not existing_log:
        db.add(log_entry)

    log_entry.attempt_count += 1
    log_entry.provider = "resend"
    log_entry.message_preview = f"Invoice #{invoice.invoice_number} | Due: {invoice.due_date} | Total: INR {_format_currency(invoice.total_amount)}"

    # Check customer notification preferences
    if hasattr(customer, "notify_email") and not customer.notify_email:
        log_entry.status = "skipped_preference"
        log_entry.error_message = "Customer has disabled email notifications."
        db.commit()
        return log_entry

    # Check Resend API Key configuration
    if not settings.RESEND_API_KEY:
        log_entry.status = "skipped_no_credentials"
        log_entry.error_message = "Resend API key not configured (RESEND_API_KEY). Set in .env to enable live email delivery."
        db.commit()
        return log_entry

    # Generate invoice PDF
    try:
        pdf_stream = generate_invoice_pdf(invoice)
        pdf_b64 = base64.b64encode(pdf_stream.getvalue()).decode("utf-8")
    except Exception as e:
        logger.error(f"Failed to generate invoice PDF for notification: {e}")
        log_entry.status = "failed"
        log_entry.error_message = f"Failed to generate PDF attachment: {str(e)[:200]}"
        db.commit()
        return log_entry

    html_content = build_invoice_email_html(invoice, customer, download_url)
    text_content = (
        f"Dear {customer.name},\n\n"
        f"Your invoice #{invoice.invoice_number} has been generated.\n"
        f"Amount: INR {_format_currency(invoice.total_amount)}\n"
        f"Due Date: {invoice.due_date}\n"
        f"Outstanding Balance: INR {_format_currency(invoice.outstanding_balance)}\n\n"
        f"Download your invoice PDF: {download_url}\n\n"
        f"Thank you,\nPay-Doo Billing"
    )

    resend_payload = {
        "from": settings.RESEND_FROM,
        "to": [customer.email],
        "subject": log_entry.subject,
        "html": html_content,
        "text": text_content,
        "attachments": [
            {
                "filename": f"Invoice-{invoice.invoice_number}.pdf",
                "content": pdf_b64,
            }
        ],
    }

    try:
        resp = _post_request(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json=resend_payload,
        )
        if resp.status_code in [200, 201]:
            data = resp.json()
            log_entry.status = "sent"
            log_entry.provider_message_id = data.get("id")
            log_entry.error_message = None
        else:
            log_entry.status = "failed"
            safe_err = resp.text[:200]
            try:
                err_json = resp.json()
                safe_err = err_json.get("message", safe_err)
            except Exception:
                pass
            log_entry.error_message = f"Resend API error ({resp.status_code}): {safe_err}"
    except Exception as e:
        logger.error(f"Resend HTTP request failed: {e}")
        log_entry.status = "failed"
        log_entry.error_message = f"Network/HTTP error: {str(e)[:200]}"

    db.commit()
    return log_entry


def send_invoice_whatsapp(
    db: Session,
    invoice: Invoice,
    customer: Optional[Customer] = None,
    force_resend: bool = False,
) -> NotificationLog:
    """
    Sends invoice alert via Twilio WhatsApp API with secure download link.
    Guarantees idempotency via idempotency_key.
    Handles missing credentials and provider errors gracefully.
    """
    if not customer:
        customer = db.query(Customer).filter(Customer.id == invoice.customer_id).first()

    if not customer:
        raise ValueError(f"Customer {invoice.customer_id} not found for invoice {invoice.id}")

    raw_phone = getattr(customer, "whatsapp_number", None) or getattr(customer, "phone", None)
    normalized_phone = normalize_phone_number(raw_phone)

    idempotency_key = f"invoice_created:whatsapp:{invoice.id}"
    existing_log = db.query(NotificationLog).filter(NotificationLog.idempotency_key == idempotency_key).first()

    if existing_log and existing_log.status in ["sent", "delivered"] and not force_resend:
        logger.info(f"WhatsApp notification already sent for key {idempotency_key}; skipping duplicate dispatch.")
        return existing_log

    token = generate_secure_invoice_token(invoice.id, customer.id, hours_valid=72)
    download_url = f"{settings.APP_BASE_URL}/api/invoices/{invoice.id}/pdf?token={token}"

    log_entry = existing_log or NotificationLog(
        customer_id=customer.id,
        invoice_id=invoice.id,
        channel="whatsapp",
        notification_type="invoice_created",
        recipient=normalized_phone or (raw_phone or "None"),
        subject=f"Invoice #{invoice.invoice_number}",
        idempotency_key=idempotency_key,
        attempt_count=0,
    )

    if not existing_log:
        db.add(log_entry)

    log_entry.attempt_count += 1
    log_entry.provider = "twilio"
    log_entry.message_preview = f"Invoice #{invoice.invoice_number} | INR {_format_currency(invoice.total_amount)} | Due {invoice.due_date}"

    # Check preferences
    if hasattr(customer, "notify_whatsapp") and not customer.notify_whatsapp:
        log_entry.status = "skipped_preference"
        log_entry.error_message = "Customer has disabled WhatsApp notifications."
        db.commit()
        return log_entry

    if not normalized_phone:
        log_entry.status = "failed"
        log_entry.error_message = f"Valid phone number missing or could not be normalized (value: '{raw_phone}')."
        db.commit()
        return log_entry

    # Check Twilio credentials
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
        log_entry.status = "skipped_no_credentials"
        log_entry.error_message = "Twilio credentials not configured (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN). Set in .env to enable live WhatsApp delivery."
        db.commit()
        return log_entry

    whatsapp_body = (
        f"🔔 *Pay-Doo Invoice Notification*\n\n"
        f"Hello *{customer.name}*,\n"
        f"Your invoice *#{invoice.invoice_number}* is ready.\n\n"
        f"• *Amount:* INR {_format_currency(invoice.total_amount)}\n"
        f"• *Due Date:* {invoice.due_date}\n"
        f"• *Outstanding Balance:* INR {_format_currency(invoice.outstanding_balance)}\n\n"
        f"📄 *Download your PDF Invoice:*\n{download_url}\n\n"
        f"Thank you for choosing Pay-Doo!"
    )

    # Twilio format: from and to must start with 'whatsapp:'
    from_number = settings.TWILIO_WHATSAPP_FROM
    if not from_number.startswith("whatsapp:"):
        from_number = f"whatsapp:{from_number}"
    to_number = f"whatsapp:{normalized_phone}"

    url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json"

    try:
        resp = _post_request(
            url,
            auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
            data={
                "From": from_number,
                "To": to_number,
                "Body": whatsapp_body,
            },
        )
        if resp.status_code in [200, 201]:
            data = resp.json()
            log_entry.status = "sent"
            log_entry.provider_message_id = data.get("sid")
            log_entry.error_message = None
        else:
            log_entry.status = "failed"
            safe_err = resp.text[:200]
            try:
                err_json = resp.json()
                safe_err = err_json.get("message", safe_err)
            except Exception:
                pass
            log_entry.error_message = f"Twilio API error ({resp.status_code}): {safe_err}"
    except Exception as e:
        logger.error(f"Twilio WhatsApp HTTP request failed: {e}")
        log_entry.status = "failed"
        log_entry.error_message = f"Network/HTTP error: {str(e)[:200]}"

    db.commit()
    return log_entry


def send_payment_confirmation_email(
    db: Session,
    payment: Payment,
    invoice: Invoice,
    customer: Customer,
    force_resend: bool = False,
) -> NotificationLog:
    """
    Sends payment receipt confirmation email via Resend.
    """
    idempotency_key = f"payment_confirmation:email:{payment.id}"
    existing_log = db.query(NotificationLog).filter(NotificationLog.idempotency_key == idempotency_key).first()

    if existing_log and existing_log.status in ["sent", "delivered"] and not force_resend:
        return existing_log

    log_entry = existing_log or NotificationLog(
        customer_id=customer.id,
        invoice_id=invoice.id,
        payment_id=payment.id,
        channel="email",
        notification_type="payment_confirmation",
        recipient=customer.email,
        subject=f"Payment Confirmation - Receipt #{payment.payment_number}",
        idempotency_key=idempotency_key,
        attempt_count=0,
    )

    if not existing_log:
        db.add(log_entry)

    log_entry.attempt_count += 1
    log_entry.provider = "resend"
    log_entry.message_preview = f"Receipt #{payment.payment_number} | Paid: INR {_format_currency(payment.amount)} | Balance: INR {_format_currency(invoice.outstanding_balance)}"

    if hasattr(customer, "notify_email") and not customer.notify_email:
        log_entry.status = "skipped_preference"
        log_entry.error_message = "Customer has disabled email notifications."
        db.commit()
        return log_entry

    if not settings.RESEND_API_KEY:
        log_entry.status = "skipped_no_credentials"
        log_entry.error_message = "Resend API key not configured (RESEND_API_KEY). Set in .env to enable live email delivery."
        db.commit()
        return log_entry

    html_content = build_payment_email_html(payment, invoice, customer)
    text_content = (
        f"Dear {customer.name},\n\n"
        f"Thank you for your payment of INR {_format_currency(payment.amount)}.\n"
        f"Payment Reference: {payment.payment_number}\n"
        f"Invoice: #{invoice.invoice_number}\n"
        f"Remaining Balance: INR {_format_currency(invoice.outstanding_balance)}\n\n"
        f"Pay-Doo Billing Team"
    )

    resend_payload = {
        "from": settings.RESEND_FROM,
        "to": [customer.email],
        "subject": log_entry.subject,
        "html": html_content,
        "text": text_content,
    }

    try:
        resp = _post_request(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json=resend_payload,
        )
        if resp.status_code in [200, 201]:
            data = resp.json()
            log_entry.status = "sent"
            log_entry.provider_message_id = data.get("id")
            log_entry.error_message = None
        else:
            log_entry.status = "failed"
            safe_err = resp.text[:200]
            try:
                err_json = resp.json()
                safe_err = err_json.get("message", safe_err)
            except Exception:
                pass
            log_entry.error_message = f"Resend API error ({resp.status_code}): {safe_err}"
    except Exception as e:
        logger.error(f"Resend HTTP request failed: {e}")
        log_entry.status = "failed"
        log_entry.error_message = f"Network/HTTP error: {str(e)[:200]}"

    db.commit()
    return log_entry


def send_payment_confirmation_whatsapp(
    db: Session,
    payment: Payment,
    invoice: Invoice,
    customer: Customer,
    force_resend: bool = False,
) -> NotificationLog:
    """
    Sends payment receipt confirmation via WhatsApp.
    """
    raw_phone = getattr(customer, "whatsapp_number", None) or getattr(customer, "phone", None)
    normalized_phone = normalize_phone_number(raw_phone)

    idempotency_key = f"payment_confirmation:whatsapp:{payment.id}"
    existing_log = db.query(NotificationLog).filter(NotificationLog.idempotency_key == idempotency_key).first()

    if existing_log and existing_log.status in ["sent", "delivered"] and not force_resend:
        return existing_log

    log_entry = existing_log or NotificationLog(
        customer_id=customer.id,
        invoice_id=invoice.id,
        payment_id=payment.id,
        channel="whatsapp",
        notification_type="payment_confirmation",
        recipient=normalized_phone or (raw_phone or "None"),
        subject=f"Payment Receipt #{payment.payment_number}",
        idempotency_key=idempotency_key,
        attempt_count=0,
    )

    if not existing_log:
        db.add(log_entry)

    log_entry.attempt_count += 1
    log_entry.provider = "twilio"
    log_entry.message_preview = f"Payment Receipt #{payment.payment_number} | INR {_format_currency(payment.amount)}"

    if hasattr(customer, "notify_whatsapp") and not customer.notify_whatsapp:
        log_entry.status = "skipped_preference"
        log_entry.error_message = "Customer has disabled WhatsApp notifications."
        db.commit()
        return log_entry

    if not normalized_phone:
        log_entry.status = "failed"
        log_entry.error_message = f"Valid phone number missing or could not be normalized (value: '{raw_phone}')."
        db.commit()
        return log_entry

    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
        log_entry.status = "skipped_no_credentials"
        log_entry.error_message = "Twilio credentials not configured (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN). Set in .env to enable live WhatsApp delivery."
        db.commit()
        return log_entry

    whatsapp_body = (
        f"✅ *Pay-Doo Payment Received*\n\n"
        f"Hello *{customer.name}*,\n"
        f"We have received your payment of *INR {_format_currency(payment.amount)}* via *{payment.payment_method.replace('_', ' ').title()}* for invoice *#{invoice.invoice_number}*.\n\n"
        f"• *Receipt Ref:* {payment.payment_number}\n"
        f"• *Date:* {payment.payment_date}\n"
        f"• *Remaining Balance:* INR {_format_currency(invoice.outstanding_balance)}\n\n"
        f"Thank you for your prompt payment!"
    )

    from_number = settings.TWILIO_WHATSAPP_FROM
    if not from_number.startswith("whatsapp:"):
        from_number = f"whatsapp:{from_number}"
    to_number = f"whatsapp:{normalized_phone}"

    url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json"

    try:
        resp = _post_request(
            url,
            auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
            data={
                "From": from_number,
                "To": to_number,
                "Body": whatsapp_body,
            },
        )
        if resp.status_code in [200, 201]:
            data = resp.json()
            log_entry.status = "sent"
            log_entry.provider_message_id = data.get("sid")
            log_entry.error_message = None
        else:
            log_entry.status = "failed"
            safe_err = resp.text[:200]
            try:
                err_json = resp.json()
                safe_err = err_json.get("message", safe_err)
            except Exception:
                pass
            log_entry.error_message = f"Twilio API error ({resp.status_code}): {safe_err}"
    except Exception as e:
        logger.error(f"Twilio WhatsApp HTTP request failed: {e}")
        log_entry.status = "failed"
        log_entry.error_message = f"Network/HTTP error: {str(e)[:200]}"

    db.commit()
    return log_entry


def dispatch_invoice_notifications(
    db: Session,
    invoice: Invoice,
    channel: str = "all",
    force_resend: bool = False,
) -> List[NotificationLog]:
    """
    Safely dispatches email and/or WhatsApp notifications for a given invoice.
    Wraps each in a safe try-catch block so failures never roll back invoices.
    """
    logs = []
    customer = db.query(Customer).filter(Customer.id == invoice.customer_id).first()
    if not customer:
        logger.error(f"Customer {invoice.customer_id} not found for invoice {invoice.id}")
        return logs

    if channel in ["all", "email"]:
        try:
            email_log = send_invoice_email(db, invoice, customer, force_resend=force_resend)
            logs.append(email_log)
        except Exception as e:
            logger.error(f"Unexpected error dispatching invoice email: {e}")

    if channel in ["all", "whatsapp"]:
        try:
            wa_log = send_invoice_whatsapp(db, invoice, customer, force_resend=force_resend)
            logs.append(wa_log)
        except Exception as e:
            logger.error(f"Unexpected error dispatching invoice WhatsApp: {e}")

    return logs


def dispatch_payment_notifications(
    db: Session,
    payment: Payment,
    force_resend: bool = False,
) -> List[NotificationLog]:
    """
    Safely dispatches email and WhatsApp payment confirmation receipts.
    """
    logs = []
    invoice = db.query(Invoice).filter(Invoice.id == payment.invoice_id).first()
    if not invoice:
        logger.error(f"Invoice {payment.invoice_id} not found for payment {payment.id}")
        return logs

    customer = db.query(Customer).filter(Customer.id == invoice.customer_id).first()
    if not customer:
        logger.error(f"Customer {invoice.customer_id} not found for payment {payment.id}")
        return logs

    try:
        email_log = send_payment_confirmation_email(db, payment, invoice, customer, force_resend=force_resend)
        logs.append(email_log)
    except Exception as e:
        logger.error(f"Unexpected error dispatching payment email: {e}")

    try:
        wa_log = send_payment_confirmation_whatsapp(db, payment, invoice, customer, force_resend=force_resend)
        logs.append(wa_log)
    except Exception as e:
        logger.error(f"Unexpected error dispatching payment WhatsApp: {e}")

    return logs
