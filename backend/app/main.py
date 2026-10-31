from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.config import settings
from app.database import Base, engine
import app.models
from app.routers import (
    health,
    customers,
    products,
    plans,
    discounts,
    subscriptions,
    invoices,
    dashboard,
)

Base.metadata.create_all(bind=engine)

# Ensure backward compatibility for existing postgres databases
try:
    with engine.begin() as conn:
        if engine.dialect.name == "postgresql":
            conn.execute(
                text(
                    "ALTER TABLE invoice_lines ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00;"
                )
            )
except Exception:
    pass

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix=settings.API_V1_PREFIX)
app.include_router(customers.router, prefix=settings.API_V1_PREFIX)
app.include_router(products.router, prefix=settings.API_V1_PREFIX)
app.include_router(plans.router, prefix=settings.API_V1_PREFIX)
app.include_router(discounts.router, prefix=settings.API_V1_PREFIX)
app.include_router(subscriptions.router, prefix=settings.API_V1_PREFIX)
app.include_router(invoices.router, prefix=settings.API_V1_PREFIX)
app.include_router(dashboard.router, prefix=settings.API_V1_PREFIX)


@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "docs": "/docs",
        "health": f"{settings.API_V1_PREFIX}/health",
    }
