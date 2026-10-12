"""Layered product lookup: Postgres cache -> Open Food Facts live (specs/006)."""

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, cast

from sqlalchemy import Table, delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Additive, Product, ProductAdditive, Score
from app.scoring.config import ScoringConfig
from app.scoring.engine import ScoreResult, score
from app.scoring.types import AdditiveInfo, Nutrient, ProductFacts
from app.services.gtin import lookup_forms
from app.services.off_client import OFFClient, SourceUnavailable
from app.services.off_mapping import additive_codes, map_product


class ProductNotFound(Exception):
    pass


@dataclass(frozen=True)
class LookupResult:
    product: Product
    score: dict[str, Any]  # engine output (spec 005 contract), with breakdown
    stale: bool


def is_fresh(product: Product, now: datetime, cache_days: int) -> bool:
    return now - product.fetched_at < timedelta(days=cache_days)


async def _upsert(
    session: AsyncSession, row: dict[str, Any], codes: list[str] | None, engine_version: str
) -> None:
    stmt = insert(Product).values(**row)
    await session.execute(
        stmt.on_conflict_do_update(
            index_elements=["gtin"], set_={k: stmt.excluded[k] for k in row if k != "gtin"}
        )
    )
    await session.execute(delete(ProductAdditive).where(ProductAdditive.gtin == row["gtin"]))
    if codes:
        # Codes missing from the reference table get a stub row so the FK holds (ADD-3).
        await session.execute(
            insert(cast(Table, Additive.__table__))
            .values([{"code": c, "name": c.upper()} for c in codes])
            .on_conflict_do_nothing(index_elements=["code"])
        )
        await session.execute(
            insert(ProductAdditive).values(
                [{"gtin": row["gtin"], "additive_code": c} for c in codes]
            )
        )
    # Refreshed data invalidates this version's score; it is recomputed below. Rows for
    # other engine versions are left alone (scores are never rewritten across versions).
    await session.execute(
        delete(Score).where(Score.gtin == row["gtin"], Score.engine_version == engine_version)
    )


async def _facts(session: AsyncSession, product: Product) -> ProductFacts:
    additives: tuple[AdditiveInfo, ...] | None = None
    if product.additives_known:
        rows = await session.scalars(
            select(Additive)
            .join(ProductAdditive, ProductAdditive.additive_code == Additive.code)
            .where(ProductAdditive.gtin == product.gtin)
            .order_by(Additive.code)
        )
        additives = tuple(
            AdditiveInfo(a.code, a.name, a.risk_level, a.evidence_grade, a.efsa_url) for a in rows
        )
    return ProductFacts(
        nutrients={
            k: Nutrient(float(v["value"]), bool(v.get("estimated", False)))
            for k, v in product.nutrition.items()
        },
        category_tags=tuple(product.categories),
        nova_group=product.nova_group,
        additives=additives,
    )


async def _score(session: AsyncSession, product: Product, cfg: ScoringConfig) -> dict[str, Any]:
    """Return the stored score for this engine version, computing it once if absent (LOOKUP-9)."""
    existing = await session.get(Score, (product.gtin, cfg.engine_version))
    if existing is not None:
        return existing.breakdown
    result: ScoreResult = score(await _facts(session, product), cfg)
    out = result.to_dict()
    pts = {k: c["value"] for k, c in out["components"].items()}
    await session.execute(
        insert(Score)
        .values(
            gtin=product.gtin,
            engine_version=cfg.engine_version,
            total=result.total,
            nutrition_pts=pts["nutrition"],
            additive_pts=pts["additives"],
            processing_pts=pts["processing"],
            breakdown=out,
        )
        .on_conflict_do_nothing(index_elements=["gtin", "engine_version"])
    )
    await session.commit()
    return out


async def lookup(
    session: AsyncSession,
    gtin: str,
    off: OFFClient,
    cfg: ScoringConfig,
    now: datetime,
    cache_days: int,
) -> LookupResult:
    """Raise ProductNotFound or SourceUnavailable; otherwise return product + score."""
    cached = await session.get(Product, gtin)
    if cached is not None and is_fresh(cached, now, cache_days):  # LOOKUP-2
        return LookupResult(cached, await _score(session, cached, cfg), stale=False)

    try:
        raw = await off.fetch(lookup_forms(gtin))  # LOOKUP-3
    except SourceUnavailable:
        if cached is None:
            raise
        return LookupResult(cached, await _score(session, cached, cfg), stale=True)  # LOOKUP-8

    if raw is None:
        raise ProductNotFound(gtin)  # LOOKUP-7

    row = map_product(gtin, raw, now)
    await _upsert(session, row, additive_codes(raw), cfg.engine_version)  # LOOKUP-6
    await session.commit()
    product = await session.get(Product, gtin, populate_existing=True)
    assert product is not None
    return LookupResult(product, await _score(session, product, cfg), stale=False)
