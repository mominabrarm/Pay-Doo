from datetime import date
from decimal import Decimal
from unittest.mock import patch, MagicMock
import pytest
import jwt

from app.config import settings
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.notification import NotificationLog
from app.models.payment import Payment
from app.services.notification import (
    normalize_phone_number,
    generate_secure_invoice_token,
    send_invoice_email,
    send_invoice_whatsapp,
    send_payment_confirmation_email,
    send_payment_confirmation_whatsapp,
    dispatch_invoice_notifications,
    dispatch_payment_notifications,
)


def _setup_sub_and_invoice(client, cust_id, prod_code, plan_code, start_date="2026-03-01", end_date="2026-03-31", due_date="2026-04-15", price="100.00"):
    prod = client.post("/api/products", json={"name": f"Product {prod_code}", "code": prod_code, "sales_price": price, "cost_price": "20.00"}).json()
    plan = client.post("/api/plans", json={"name": f"Plan {plan_code}", "code": plan_code, "billing_interval": "monthly", "price": price}).json()

    sub = client.post(
        "/api/subscriptions",
        json={
            "customer_id": cust_id,
            "plan_id": plan["id"],
            "start_date": start_date,
            "status": "active",
            "lines": [{"product_id": prod["id"], "quantity": 1, "unit_price": price, "tax_rate": "0.00"}],
        },
    ).json()

    inv = client.post(
        f"/api/subscriptions/{sub['id']}/generate-invoice",
        json={"billing_period_start": start_date, "billing_period_end": end_date, "due_date": due_date},
    ).json()

    return sub, inv


def test_normalize_phone_number():
    assert normalize_phone_number("9876543210") == "+919876543210"
    assert normalize_phone_number("+91 98765 43210") == "+919876543210"
    assert normalize_phone_number("+1 (415) 555-2671") == "+14155552671"
    assert normalize_phone_number("+44 20 7946 0958") == "+442079460958"
    assert normalize_phone_number("123") is None
    assert normalize_phone_number("") is None
    assert normalize_phone_number(None) is None


def test_secure_invoice_download_token(client, db_session):
    cust = Customer(name="Secure Client", email="secure@client.com", phone="+919876543210")
    db_session.add(cust)
    db_session.commit()

    sub, inv = _setup_sub_and_invoice(client, cust.id, "P-SEC", "PLAN-SEC", "2026-03-01", "2026-03-31", "2026-04-15", "100.00")
    inv_id = inv["id"]

    token = generate_secure_invoice_token(invoice_id=inv_id, customer_id=cust.id, hours_valid=72)
    decoded = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    assert decoded["invoice_id"] == inv_id
    assert decoded["customer_id"] == cust.id
    assert decoded["purpose"] == "invoice_download"

    # Download PDF using valid signed token
    resp = client.get(f"/api/invoices/{inv_id}/pdf?token={token}")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert b"%PDF-" in resp.content[:10]

    # Tampered or mismatched token (token for invoice A used on invoice B)
    fake_token = generate_secure_invoice_token(invoice_id=999999, customer_id=cust.id)
    resp_tampered = client.get(f"/api/invoices/{inv_id}/pdf?token={fake_token}")
    assert resp_tampered.status_code == 403


def test_resend_email_dispatch_and_mock(client, db_session):
    cust = Customer(name="Enterprise Corp", email="enterprise@corp.com", phone="+919876543210")
    db_session.add(cust)
    db_session.commit()

    sub, inv = _setup_sub_and_invoice(client, cust.id, "P-ENT", "PLAN-ENT", "2026-04-01", "2026-04-30", "2026-05-15", "2000.00")
    invoice = db_session.query(Invoice).filter(Invoice.id == inv["id"]).first()

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"id": "resend_msg_test_12345"}

    with patch.object(settings, "RESEND_API_KEY", "re_test_mock_key_123"):
        with patch("app.services.notification._post_request", return_value=mock_resp) as mock_post:
            log_entry = send_invoice_email(db_session, invoice, cust, force_resend=True)

            assert log_entry.status == "sent"
            assert log_entry.provider == "resend"
            assert log_entry.provider_message_id == "resend_msg_test_12345"
            assert log_entry.recipient == "enterprise@corp.com"
            assert mock_post.called

            args, kwargs = mock_post.call_args
            assert args[0] == "https://api.resend.com/emails"
            assert kwargs["headers"]["Authorization"] == "Bearer re_test_mock_key_123"
            assert kwargs["json"]["to"] == ["enterprise@corp.com"]
            assert len(kwargs["json"]["attachments"]) == 1
            assert kwargs["json"]["attachments"][0]["filename"] == f"Invoice-{invoice.invoice_number}.pdf"
            assert len(kwargs["json"]["attachments"][0]["content"]) > 100


def test_twilio_whatsapp_dispatch_and_mock(client, db_session):
    cust = Customer(name="WhatsApp Client", email="wa@client.com", phone="+919876543210")
    db_session.add(cust)
    db_session.commit()

    sub, inv = _setup_sub_and_invoice(client, cust.id, "P-WA", "PLAN-WA", "2026-05-01", "2026-05-31", "2026-06-15", "300.00")
    invoice = db_session.query(Invoice).filter(Invoice.id == inv["id"]).first()

    mock_resp = MagicMock()
    mock_resp.status_code = 201
    mock_resp.json.return_value = {"sid": "SM_twilio_wa_test_98765"}

    with patch.object(settings, "TWILIO_ACCOUNT_SID", "AC_test_account_sid"):
        with patch.object(settings, "TWILIO_AUTH_TOKEN", "auth_token_mock_123"):
            with patch("app.services.notification._post_request", return_value=mock_resp) as mock_post:
                wa_log = send_invoice_whatsapp(db_session, invoice, cust, force_resend=True)

                assert wa_log.status == "sent"
                assert wa_log.provider == "twilio"
                assert wa_log.provider_message_id == "SM_twilio_wa_test_98765"
                assert wa_log.recipient == "+919876543210"
                assert mock_post.called

                args, kwargs = mock_post.call_args
                assert "api.twilio.com" in args[0]
                assert kwargs["auth"] == ("AC_test_account_sid", "auth_token_mock_123")
                assert kwargs["data"]["To"] == "whatsapp:+919876543210"
                assert "Invoice Notification" in kwargs["data"]["Body"]
                assert f"#{invoice.invoice_number}" in kwargs["data"]["Body"]


def test_missing_credentials_graceful_handling(client, db_session):
    cust = Customer(name="No Creds Corp", email="nocreds@corp.com", phone="+919876543210")
    db_session.add(cust)
    db_session.commit()

    sub, inv = _setup_sub_and_invoice(client, cust.id, "P-NOCRED", "PLAN-NOCRED", "2026-06-01", "2026-06-30", "2026-07-15", "150.00")
    invoice = db_session.query(Invoice).filter(Invoice.id == inv["id"]).first()

    with patch.object(settings, "RESEND_API_KEY", None):
        email_log = send_invoice_email(db_session, invoice, cust, force_resend=True)
        assert email_log.status == "skipped_no_credentials"
        assert "RESEND_API_KEY" in email_log.error_message

    with patch.object(settings, "TWILIO_ACCOUNT_SID", None):
        wa_log = send_invoice_whatsapp(db_session, invoice, cust, force_resend=True)
        assert wa_log.status == "skipped_no_credentials"
        assert "TWILIO_ACCOUNT_SID" in wa_log.error_message


def test_idempotency_duplicate_send_prevention(client, db_session):
    cust = Customer(name="Idempotent Client", email="idemp@client.com", phone="+919876543210")
    db_session.add(cust)
    db_session.commit()

    sub, inv = _setup_sub_and_invoice(client, cust.id, "P-IDEMP", "PLAN-IDEMP", "2026-07-01", "2026-07-31", "2026-08-15", "100.00")
    invoice = db_session.query(Invoice).filter(Invoice.id == inv["id"]).first()

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"id": "resend_first_dispatch"}

    with patch.object(settings, "RESEND_API_KEY", "re_mock_key"):
        with patch("app.services.notification._post_request", return_value=mock_resp) as mock_post:
            first_log = send_invoice_email(db_session, invoice, cust, force_resend=False)
            assert first_log.status == "sent"
            assert mock_post.call_count == 1

            # Second call without force_resend MUST NOT hit the external API again
            second_log = send_invoice_email(db_session, invoice, cust, force_resend=False)
            assert second_log.status == "sent"
            assert second_log.id == first_log.id
            assert mock_post.call_count == 1  # Unchanged!


def test_payment_confirmation_dispatch(client, db_session):
    cust = Customer(name="Payment Notif User", email="paynotif@user.com", phone="+919876543210")
    db_session.add(cust)
    db_session.commit()

    sub, inv = _setup_sub_and_invoice(client, cust.id, "P-PAYN", "PLAN-PAYN", "2026-08-01", "2026-08-31", "2026-09-15", "500.00")

    mock_resend = MagicMock()
    mock_resend.status_code = 200
    mock_resend.json.return_value = {"id": "resend_pay_1"}

    mock_twilio = MagicMock()
    mock_twilio.status_code = 201
    mock_twilio.json.return_value = {"sid": "twilio_pay_1"}

    with patch.object(settings, "RESEND_API_KEY", "re_pay_mock"):
        with patch.object(settings, "TWILIO_ACCOUNT_SID", "AC_pay_mock"):
            with patch.object(settings, "TWILIO_AUTH_TOKEN", "auth_pay_mock"):
                with patch("app.services.notification._post_request") as mock_post:
                    mock_post.side_effect = [mock_resend, mock_twilio]

                    pay_resp = client.post(
                        f"/api/invoices/{inv['id']}/payments",
                        json={
                            "amount": "500.00",
                            "payment_method": "credit_card",
                            "payment_date": "2026-08-10",
                            "notes": "Full settlement",
                        },
                    )
                    assert pay_resp.status_code == 201

                    # Check notification logs in DB
                    logs = db_session.query(NotificationLog).filter(NotificationLog.invoice_id == inv["id"]).all()
                    assert len(logs) >= 2
                    email_logs = [l for l in logs if l.channel == "email" and l.notification_type == "payment_confirmation"]
                    wa_logs = [l for l in logs if l.channel == "whatsapp" and l.notification_type == "payment_confirmation"]
                    assert len(email_logs) == 1
                    assert email_logs[0].status == "sent"
                    assert len(wa_logs) == 1
                    assert wa_logs[0].status == "sent"


def test_customer_notification_preferences(client, db_session):
    cust = Customer(name="Opt-Out User", email="optout@test.com", phone="+919876543210", notify_email=False, notify_whatsapp=False)
    db_session.add(cust)
    db_session.commit()

    sub, inv = _setup_sub_and_invoice(client, cust.id, "P-OPT", "PLAN-OPT", "2026-09-01", "2026-09-30", "2026-10-15", "50.00")
    invoice = db_session.query(Invoice).filter(Invoice.id == inv["id"]).first()

    with patch.object(settings, "RESEND_API_KEY", "re_opt_mock"):
        with patch.object(settings, "TWILIO_ACCOUNT_SID", "AC_opt_mock"):
            with patch.object(settings, "TWILIO_AUTH_TOKEN", "auth_opt_mock"):
                email_log = send_invoice_email(db_session, invoice, cust, force_resend=True)
                assert email_log.status == "skipped_preference"

                wa_log = send_invoice_whatsapp(db_session, invoice, cust, force_resend=True)
                assert wa_log.status == "skipped_preference"

    # Test preference update endpoint
    pref_update = client.put(
        f"/api/notifications/preferences?customer_id={cust.id}",
        json={"notify_email": True, "notify_whatsapp": True, "whatsapp_number": "+919999988888"},
    )
    assert pref_update.status_code == 200
    assert pref_update.json()["notify_email"] is True
    assert pref_update.json()["whatsapp_number"] == "+919999988888"


def test_customer_isolation_on_notification_history(client, db_session):
    # Customer A
    c_a = Customer(name="Customer A", email="cust_a@notif.com", phone="+919876543211")
    # Customer B
    c_b = Customer(name="Customer B", email="cust_b@notif.com", phone="+919876543212")
    db_session.add_all([c_a, c_b])
    db_session.commit()

    # User accounts
    client.post("/api/auth/register", json={"email": "cust_a@notif.com", "password": "Password123!", "full_name": "Cust A", "customer_id": c_a.id, "role": "customer"})
    client.post("/api/auth/register", json={"email": "cust_b@notif.com", "password": "Password123!", "full_name": "Cust B", "customer_id": c_b.id, "role": "customer"})

    token_a = client.post("/api/auth/login", json={"email": "cust_a@notif.com", "password": "Password123!"}).json()["access_token"]
    token_b = client.post("/api/auth/login", json={"email": "cust_b@notif.com", "password": "Password123!"}).json()["access_token"]

    # Notification logs for A and B
    log_a = NotificationLog(customer_id=c_a.id, channel="email", notification_type="invoice_created", recipient="cust_a@notif.com", status="sent")
    log_b = NotificationLog(customer_id=c_b.id, channel="email", notification_type="invoice_created", recipient="cust_b@notif.com", status="sent")
    db_session.add_all([log_a, log_b])
    db_session.commit()

    # Cust A listing notifications
    resp_a = client.get("/api/notifications", headers={"Authorization": f"Bearer {token_a}"})
    assert resp_a.status_code == 200
    items_a = resp_a.json()
    assert len(items_a) == 1
    assert items_a[0]["recipient"] == "cust_a@notif.com"

    # Cust B listing notifications
    resp_b = client.get("/api/notifications", headers={"Authorization": f"Bearer {token_b}"})
    assert resp_b.status_code == 200
    items_b = resp_b.json()
    assert len(items_b) == 1
    assert items_b[0]["recipient"] == "cust_b@notif.com"


def test_resend_and_twilio_webhooks_confirm_delivery(client, db_session):
    cust = Customer(name="Webhook Corp", email="webhook@corp.com", phone="+919876543210")
    db_session.add(cust)
    db_session.commit()

    # Create logs in "sent" state
    email_log = NotificationLog(
        customer_id=cust.id,
        channel="email",
        notification_type="invoice_created",
        recipient="webhook@corp.com",
        status="sent",
        provider="resend",
        provider_message_id="resend_msg_webhook_1",
    )
    wa_log = NotificationLog(
        customer_id=cust.id,
        channel="whatsapp",
        notification_type="invoice_created",
        recipient="+919876543210",
        status="sent",
        provider="twilio",
        provider_message_id="SM_twilio_webhook_1",
    )
    db_session.add_all([email_log, wa_log])
    db_session.commit()

    # 1. Resend webhook receives email.delivered
    r_resend = client.post(
        "/api/notifications/webhook/resend",
        json={
            "type": "email.delivered",
            "data": {"email_id": "resend_msg_webhook_1"},
        },
    )
    assert r_resend.status_code == 200
    db_session.refresh(email_log)
    assert email_log.status == "delivered"

    # 2. Twilio webhook receives delivered status
    r_twilio = client.post(
        "/api/notifications/webhook/twilio",
        data={
            "MessageSid": "SM_twilio_webhook_1",
            "MessageStatus": "delivered",
        },
    )
    assert r_twilio.status_code == 200
    db_session.refresh(wa_log)
    assert wa_log.status == "delivered"
