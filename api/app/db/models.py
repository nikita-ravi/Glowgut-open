"""SQLAlchemy models for SPEC §5. User tables arrive with accounts (M5)."""

from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Numeric,
    SmallInteger,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Product(Base):
    __tablename__ = "products"

    gtin: Mapped[str] = mapped_column(Text, primary_key=True)
    name: Mapped[str | None] = mapped_column(Text)
    brand: Mapped[str | None] = mapped_column(Text)
    primary_category: Mapped[str | None] = mapped_column(Text)
    categories: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    image_url: Mapped[str | None] = mapped_column(Text)
    ingredients_text: Mapped[str | None] = mapped_column(Text)
    nutrition: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)  # per 100 g/ml
    nova_group: Mapped[int | None] = mapped_column(SmallInteger)
    labels: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    is_organic: Mapped[bool] = mapped_column(Boolean, default=False)
    additives_known: Mapped[bool] = mapped_column(Boolean, default=False)
    source_by_field: Mapped[dict[str, str]] = mapped_column(JSONB, default=dict)
    completeness: Mapped[Decimal | None] = mapped_column(Numeric(3, 2))
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Additive(Base):
    __tablename__ = "additives"

    code: Mapped[str] = mapped_column(Text, primary_key=True)  # e.g. "e250"
    name: Mapped[str] = mapped_column(Text)
    additive_class: Mapped[str | None] = mapped_column("class", Text)
    risk_level: Mapped[int | None] = mapped_column(SmallInteger)
    evidence_grade: Mapped[str | None] = mapped_column(Text)
    adi_mg_kg: Mapped[Decimal | None] = mapped_column(Numeric)
    us_status: Mapped[str | None] = mapped_column(Text)
    efsa_url: Mapped[str | None] = mapped_column(Text)
    fda_cfr_ref: Mapped[str | None] = mapped_column(Text)
    overexposure_risk: Mapped[str | None] = mapped_column(Text)


class ProductAdditive(Base):
    __tablename__ = "product_additives"

    gtin: Mapped[str] = mapped_column(
        Text, ForeignKey("products.gtin", ondelete="CASCADE"), primary_key=True
    )
    additive_code: Mapped[str] = mapped_column(Text, ForeignKey("additives.code"), primary_key=True)


class Score(Base):
    __tablename__ = "scores"

    gtin: Mapped[str] = mapped_column(
        Text, ForeignKey("products.gtin", ondelete="CASCADE"), primary_key=True
    )
    engine_version: Mapped[str] = mapped_column(Text, primary_key=True)
    total: Mapped[int | None] = mapped_column(SmallInteger)
    nutrition_pts: Mapped[Decimal | None] = mapped_column(Numeric)
    additive_pts: Mapped[Decimal | None] = mapped_column(Numeric)
    processing_pts: Mapped[Decimal | None] = mapped_column(Numeric)
    breakdown: Mapped[dict[str, Any]] = mapped_column(JSONB)  # full engine output
    computed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
