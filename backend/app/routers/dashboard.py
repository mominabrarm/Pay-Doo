from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.dashboard import DashboardSummaryResponse, CustomerDashboardResponse
from app.services.dashboard import get_dashboard_summary, get_customer_dashboard_summary
from app.services.auth import get_current_user, security_bearer, decode_access_token

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummaryResponse)
def dashboard_summary(
    auth=Depends(security_bearer),
    db: Session = Depends(get_db)
):
    # Enforce role boundary: customers are strictly forbidden from viewing company-wide revenue metrics
    if auth and auth.credentials:
        try:
            payload = decode_access_token(auth.credentials)
            user_id = payload.get("sub")
            if user_id:
                user = db.query(User).filter(User.id == int(user_id)).first()
                if user and user.role == "customer":
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access denied: Customers are not permitted to access company-wide financial metrics.",
                    )
        except HTTPException as e:
            if e.status_code == status.HTTP_403_FORBIDDEN:
                raise e

    return get_dashboard_summary(db)


@router.get("/customer-summary", response_model=CustomerDashboardResponse)
def customer_dashboard_summary(
    customer_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Customers can strictly access only their own customer dashboard
    if current_user.role == "customer":
        if not current_user.customer_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No customer profile associated with this account.",
            )
        target_customer_id = current_user.customer_id
    else:
        # Admin or staff can query a specific customer's portal view
        if not customer_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="customer_id query parameter is required for staff or administrator requests.",
            )
        target_customer_id = customer_id

    return get_customer_dashboard_summary(db, target_customer_id)
