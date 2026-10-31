import logging
from typing import List, Optional
from urllib.parse import parse_qs
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.notification import NotificationLog
from app.models.user import User
from app.schemas.notification import (
    NotificationLogResponse,
    SendNotificationRequest,
    NotificationPreferenceUpdate,
    NotificationPreferenceResponse,
)
from app.services.auth import get_optional_current_user, get_current_user
from app.services.notification import dispatch_invoice_notifications

logger = logging.getLogger("paydoo.notifications")

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=List[NotificationLogResponse])
def list_notifications(
    invoice_id: Optional[int] = None,
    customer_id: Optional[int] = None,
    channel: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """
    List notification history with strict customer role isolation.
    """
    query = db.query(NotificationLog)

    # Customer isolation
    if current_user and current_user.role == "customer":
        if not current_user.customer_id:
            cust = db.query(Customer).filter(Customer.email == current_user.email).first()
            if cust:
                current_user.customer_id = cust.id
                db.commit()
                db.refresh(current_user)
        if current_user.customer_id:
            query = query.filter(NotificationLog.customer_id == current_user.customer_id)
        else:
            return []
    elif customer_id:
        query = query.filter(NotificationLog.customer_id == customer_id)

    if invoice_id:
        query = query.filter(NotificationLog.invoice_id == invoice_id)
    if channel:
        query = query.filter(NotificationLog.channel == channel)
    if status_filter:
        query = query.filter(NotificationLog.status == status_filter)

    return query.order_by(NotificationLog.id.desc()).offset(skip).limit(limit).all()


@router.post("/invoices/{invoice_id}/send", response_model=List[NotificationLogResponse])
def send_invoice_notification(
    invoice_id: int,
    payload: SendNotificationRequest,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """
    Trigger or resend invoice notification via Email, WhatsApp, or both.
    Customer can only trigger for their own invoices.
    """
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found.")

    if current_user and current_user.role == "customer":
        if not current_user.customer_id:
            cust = db.query(Customer).filter(Customer.email == current_user.email).first()
            if cust:
                current_user.customer_id = cust.id
                db.commit()
                db.refresh(current_user)
        if not current_user.customer_id or current_user.customer_id != invoice.customer_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Customers may only trigger notifications for their own invoices.",
            )

    logs = dispatch_invoice_notifications(
        db=db,
        invoice=invoice,
        channel=payload.channel,
        force_resend=payload.force_resend,
    )
    return logs


@router.get("/preferences", response_model=NotificationPreferenceResponse)
def get_notification_preferences(
    customer_id: Optional[int] = None,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve customer notification channel preferences.
    """
    target_customer_id = None
    if current_user and current_user.role == "customer":
        if not current_user.customer_id:
            cust = db.query(Customer).filter(Customer.email == current_user.email).first()
            if cust:
                current_user.customer_id = cust.id
                db.commit()
                db.refresh(current_user)
        target_customer_id = current_user.customer_id
    elif customer_id:
        target_customer_id = customer_id
    elif current_user and current_user.customer_id:
        target_customer_id = current_user.customer_id

    if not target_customer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Customer ID required to retrieve notification preferences.",
        )

    customer = db.query(Customer).filter(Customer.id == target_customer_id).first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found.")

    return NotificationPreferenceResponse(
        customer_id=customer.id,
        notify_email=getattr(customer, "notify_email", True),
        notify_whatsapp=getattr(customer, "notify_whatsapp", True),
        whatsapp_number=getattr(customer, "whatsapp_number", None) or getattr(customer, "phone", None),
    )


@router.put("/preferences", response_model=NotificationPreferenceResponse)
def update_notification_preferences(
    payload: NotificationPreferenceUpdate,
    customer_id: Optional[int] = None,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """
    Update customer notification channel preferences.
    """
    target_customer_id = None
    if current_user and current_user.role == "customer":
        if not current_user.customer_id:
            cust = db.query(Customer).filter(Customer.email == current_user.email).first()
            if cust:
                current_user.customer_id = cust.id
                db.commit()
                db.refresh(current_user)
        target_customer_id = current_user.customer_id
    elif customer_id:
        target_customer_id = customer_id
    elif current_user and current_user.customer_id:
        target_customer_id = current_user.customer_id

    if not target_customer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Customer ID required to update notification preferences.",
        )

    customer = db.query(Customer).filter(Customer.id == target_customer_id).first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found.")

    if payload.notify_email is not None:
        customer.notify_email = payload.notify_email
    if payload.notify_whatsapp is not None:
        customer.notify_whatsapp = payload.notify_whatsapp
    if payload.whatsapp_number is not None:
        customer.whatsapp_number = payload.whatsapp_number.strip() if payload.whatsapp_number else None

    db.commit()
    db.refresh(customer)

    return NotificationPreferenceResponse(
        customer_id=customer.id,
        notify_email=customer.notify_email,
        notify_whatsapp=customer.notify_whatsapp,
        whatsapp_number=customer.whatsapp_number or customer.phone,
    )


@router.post("/webhook/resend", status_code=status.HTTP_200_OK)
async def resend_webhook(payload: dict, db: Session = Depends(get_db)):
    """
    Handle Resend delivery and failure webhooks (provider acceptance -> confirmed delivery).
    """
    event_type = payload.get("type")
    data = payload.get("data", {})
    email_id = data.get("email_id")
    if email_id and event_type:
        log = db.query(NotificationLog).filter(NotificationLog.provider_message_id == email_id).first()
        if log:
            if event_type == "email.delivered":
                log.status = "delivered"
                log.error_message = None
            elif event_type in ["email.bounced", "email.failed"]:
                log.status = "failed"
                log.error_message = f"Resend webhook reported: {event_type}"
            db.commit()
    return {"status": "ok"}


@router.post("/webhook/twilio", status_code=status.HTTP_200_OK)
async def twilio_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Handle Twilio WhatsApp status callbacks (sent -> delivered / read / failed).
    """
    raw_body = await request.body()
    try:
        payload = await request.json()
    except Exception:
        parsed = parse_qs(raw_body.decode("utf-8"))
        payload = {k: v[0] for k, v in parsed.items()}

    message_sid = payload.get("MessageSid")
    message_status = payload.get("MessageStatus")
    if message_sid and message_status:
        log = db.query(NotificationLog).filter(NotificationLog.provider_message_id == str(message_sid)).first()
        if log:
            if message_status in ["delivered", "read"]:
                log.status = "delivered"
                log.error_message = None
            elif message_status in ["failed", "undelivered"]:
                log.status = "failed"
                log.error_message = f"Twilio webhook reported: {message_status}"
            db.commit()
    return Response(content="<Response></Response>", media_type="application/xml")

