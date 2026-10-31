from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.product import Product, ProductVariant
from app.schemas.product import (
    ProductCreate,
    ProductResponse,
    ProductVariantCreate,
    ProductVariantResponse,
)

router = APIRouter(prefix="/products", tags=["Products"])


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(payload: ProductCreate, db: Session = Depends(get_db)):
    existing = db.query(Product).filter(Product.code == payload.code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Product with code '{payload.code}' already exists.",
        )

    product = Product(**payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.get("", response_model=List[ProductResponse])
def list_products(db: Session = Depends(get_db)):
    return db.query(Product).filter(Product.is_active == True).order_by(Product.id.asc()).all()


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")
    return product


@router.post("/{product_id}/variants", response_model=ProductVariantResponse, status_code=status.HTTP_201_CREATED)
def create_variant(product_id: int, payload: ProductVariantCreate, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")

    existing_sku = db.query(ProductVariant).filter(ProductVariant.sku == payload.sku).first()
    if existing_sku:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Variant SKU '{payload.sku}' already exists.",
        )

    variant = ProductVariant(product_id=product.id, **payload.model_dump())
    db.add(variant)
    db.commit()
    db.refresh(variant)
    return variant
