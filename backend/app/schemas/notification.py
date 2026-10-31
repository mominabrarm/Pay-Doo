from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


class NotificationLogResponse(BaseModel):
    id: int
    customer_id: int
    invoice_id: Optional[int] = None
    payment_id: Optional[int] = None
    channel: str
    notification_type: str
    provider: str
    recipient: str
    subject: Optional[str] = None
    message_preview: Optional[str] = None
    provider_message_id: Optional[str] = None
    status: str
    attempt_count: int = 1
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class SendNotificationRequest(BaseModel):
    channel: str = Field(default="all", description="'email', 'whatsapp', or 'all'")
    force_resend: bool = Field(default=False, description="Bypass idempotency checks for manual trigger")


class NotificationPreferenceUpdate(BaseModel):
    notify_email: Optional[bool] = None
    notify_whatsapp: Optional[bool] = None
    whatsapp_number: Optional[str] = None


class NotificationPreferenceResponse(BaseModel):
    customer_id: int
    notify_email: bool
    notify_whatsapp: bool
    whatsapp_number: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

