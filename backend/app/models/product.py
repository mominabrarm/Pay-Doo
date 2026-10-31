from sqlalchemy import Column, Integer, String, Text, Numeric, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.base import TimestampMixin


class Product(Base, TimestampMixin):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    code = Column(String(100), unique=True, nullable=False, index=True)
    product_type = Column(String(50), default="software", nullable=False)
    sales_price = Column(Numeric(12, 2), nullable=False)
    cost_price = Column(Numeric(12, 2), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan")


class ProductVariant(Base, TimestampMixin):
    __tablename__ = "product_variants"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    variant_name = Column(String(255), nullable=False)
    sku = Column(String(100), unique=True, nullable=False, index=True)
    price_extra = Column(Numeric(12, 2), default=0.00, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    product = relationship("Product", back_populates="variants")
