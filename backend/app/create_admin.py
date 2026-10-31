import argparse
import sys
from app.database import SessionLocal, Base, engine
import app.models
from app.models.user import User
from app.services.auth import hash_password, validate_password_complexity


def create_admin(email: str, password: str, full_name: str = "System Administrator"):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"[ERROR] User with email '{email}' already exists.")
            return False

        try:
            validate_password_complexity(password)
        except Exception as e:
            print(f"[ERROR] Password does not meet requirements: {e.detail}")
            return False

        admin_user = User(
            email=email,
            hashed_password=hash_password(password),
            full_name=full_name,
            role="admin",
            is_active=True,
        )
        db.add(admin_user)
        db.commit()
        print(f"[SUCCESS] Admin account created for {email} (ID: {admin_user.id}).")
        return True
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create initial system administrator account")
    parser.add_argument("--email", required=True, help="Administrator email address")
    parser.add_argument("--password", required=True, help="Administrator password")
    parser.add_argument("--name", default="System Administrator", help="Administrator full name")
    args = parser.parse_args()

    success = create_admin(email=args.email, password=args.password, full_name=args.name)
    sys.exit(0 if success else 1)
