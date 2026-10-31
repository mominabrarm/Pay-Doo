from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.customer import Customer
from app.schemas.auth import (
    UserRegisterRequest,
    UserLoginRequest,
    UserResponse,
    TokenResponse,
    ProfileUpdateRequest,
)
from app.services.auth import (
    validate_password_complexity,
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    security_bearer,
    decode_access_token,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(
    payload: UserRegisterRequest,
    db: Session = Depends(get_db),
    auth=Depends(security_bearer),
):
    validate_password_complexity(payload.password)

    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An account with email '{payload.email}' already exists.",
        )

    # Creating admin or staff accounts requires an authenticated admin, unless initializing the very first user
    if payload.role in ["admin", "staff"]:
        total_users = db.query(User).count()
        if total_users > 0:
            if not auth or not auth.credentials:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required to create staff or admin accounts.",
                )
            token_payload = decode_access_token(auth.credentials)
            requester = db.query(User).filter(User.id == int(token_payload.get("sub"))).first()
            if not requester or requester.role != "admin":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only an administrator can create staff or admin accounts.",
                )

    target_customer_id = payload.customer_id
    if payload.customer_id:
        cust = db.query(Customer).filter(Customer.id == payload.customer_id).first()
        if not cust:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Customer with ID {payload.customer_id} does not exist.",
            )
    elif payload.role == "customer":
        # Look up existing customer by email
        existing_cust = db.query(Customer).filter(Customer.email == payload.email).first()
        if existing_cust:
            target_customer_id = existing_cust.id
        else:
            # Auto-provision CRM customer record for the new customer account
            new_cust = Customer(
                name=payload.full_name or payload.email.split("@")[0].title(),
                email=payload.email,
                is_active=True,
            )
            db.add(new_cust)
            db.flush()
            target_customer_id = new_cust.id

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role,
        is_active=True,
        customer_id=target_customer_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
def login(payload: UserLoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please contact your administrator.",
        )

    # Auto-link customer profile if role is customer and customer_id is None
    if user.role == "customer" and not user.customer_id:
        cust = db.query(Customer).filter(Customer.email == user.email).first()
        if not cust:
            cust = Customer(
                name=user.full_name or user.email.split("@")[0].title(),
                email=user.email,
                is_active=True,
            )
            db.add(cust)
            db.flush()
        user.customer_id = cust.id
        db.commit()
        db.refresh(user)

    token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "role": user.role,
            "customer_id": user.customer_id,
        }
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=user,
    )


@router.get("/me", response_model=UserResponse)
def get_current_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role == "customer" and not current_user.customer_id:
        cust = db.query(Customer).filter(Customer.email == current_user.email).first()
        if not cust:
            cust = Customer(
                name=current_user.full_name or current_user.email.split("@")[0].title(),
                email=current_user.email,
                is_active=True,
            )
            db.add(cust)
            db.flush()
        current_user.customer_id = cust.id
        db.commit()
        db.refresh(current_user)
    return current_user


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    return {"status": "logged_out", "message": "Successfully logged out."}


@router.put("/profile", response_model=UserResponse)
def update_profile(
    payload: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.full_name is not None and payload.full_name.strip():
        current_user.full_name = payload.full_name.strip()

    if current_user.customer_id:
        customer = db.query(Customer).filter(Customer.id == current_user.customer_id).first()
        if customer:
            if payload.full_name is not None and payload.full_name.strip():
                customer.name = payload.full_name.strip()
            if payload.phone is not None:
                customer.phone = payload.phone.strip()
            if payload.address is not None:
                customer.address = payload.address.strip()
            if payload.city is not None:
                customer.city = payload.city.strip()
            if payload.country is not None:
                customer.country = payload.country.strip()

    db.commit()
    db.refresh(current_user)
    return current_user
