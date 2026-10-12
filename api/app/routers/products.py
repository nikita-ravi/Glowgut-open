"""`GET /products/{gtin}` and `/breakdown` (specs/006)."""

import hashlib
from datetime import UTC, datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.problems import Problem
from app.scoring.config import ScoringConfig, default_config
from app.scoring.engine import ScoreResult
from app.scoring.explain import explain
from app.scoring.types import BreakdownLine
from app.services.gtin import InvalidGTIN, normalize
from app.services.lookup import LookupResult, ProductNotFound, lookup
from app.services.off_client import OFFClient, SourceUnavailable
from app.settings import Settings, get_settings

router = APIRouter(prefix="/products", tags=["products"])
ATTRIBUTION = "Data from Open Food Facts (ODbL)"
CACHE_CONTROL = "public, max-age=300"

Session = Annotated[AsyncSession, Depends(get_session)]


def get_off(request: Request) -> OFFClient:
    off: OFFClient = request.app.state.off
    return off


def get_now() -> datetime:
    return datetime.now(UTC)


async def _resolve(
    raw_gtin: str, session: AsyncSession, off: OFFClient, cfg: ScoringConfig,
    settings: Settings, now: datetime,
) -> LookupResult:  # fmt: skip
    try:
        gtin = normalize(raw_gtin)  # LOOKUP-1
    except InvalidGTIN as exc:
        raise Problem(422, "Invalid barcode", str(exc)) from exc
    try:
        return await lookup(session, gtin, off, cfg, now, settings.cache_days)
    except ProductNotFound as exc:  # LOOKUP-7
        raise Problem(
            404, "Product not found",
            "We couldn't find this barcode. You can add it by photographing the label.",
            gtin=gtin, next="contribute",
        ) from exc  # fmt: skip
    except SourceUnavailable as exc:  # LOOKUP-8
        raise Problem(503, "Product data source unavailable",
                      "Open Food Facts didn't respond. Try again in a moment.",
                      gtin=gtin) from exc  # fmt: skip


def _etag(result: LookupResult, cfg: ScoringConfig) -> str:  # LOOKUP-11
    key = f"{result.product.gtin}|{cfg.engine_version}|{result.product.fetched_at.isoformat()}"
    return '"' + hashlib.sha256(key.encode()).hexdigest()[:32] + '"'


def _cached(request: Request, response: Response, etag: str) -> Response | None:
    response.headers["ETag"] = etag
    response.headers["Cache-Control"] = CACHE_CONTROL
    if request.headers.get("if-none-match") == etag:
        return Response(status_code=304, headers={"ETag": etag, "Cache-Control": CACHE_CONTROL})
    return None


def _product_body(result: LookupResult) -> dict[str, Any]:
    p = result.product
    score = {k: v for k, v in result.score.items() if k != "breakdown"}
    return {
        "gtin": p.gtin,
        "name": p.name,
        "brand": p.brand,
        "primary_category": p.primary_category,
        "categories": p.categories,
        "image_url": p.image_url,
        "ingredients_text": p.ingredients_text,
        "nutrition": p.nutrition,
        "nova_group": p.nova_group,
        "labels": p.labels,
        "is_organic": p.is_organic,
        "completeness": float(p.completeness) if p.completeness is not None else None,
        "source_by_field": p.source_by_field,
        "fetched_at": p.fetched_at.isoformat(),
        "stale": result.stale,
        "score": score,
        "attribution": ATTRIBUTION,
    }


def _rehydrate(stored: dict[str, Any]) -> ScoreResult:
    """Rebuild a ScoreResult from its stored JSON so explain() can run on it."""
    lines = tuple(
        BreakdownLine(
            rule_id=d["rule_id"], component=d["component"], points=d["points"],
            input_value=d["input_value"], source_url=d["source_url"],
            estimated=d["estimated"], note=d.get("note"),
        )
        for d in stored["breakdown"]
    )  # fmt: skip
    return ScoreResult(
        engine_version=stored["engine_version"], status=stored["status"], total=stored["total"],
        band=stored["band"], confidence=stored["confidence"],
        missing_inputs=tuple(stored["missing_inputs"]), nutriscore=stored["nutriscore"],
        components=stored["components"], breakdown=lines,
    )  # fmt: skip


@router.get("/{gtin}", response_model=None)
async def get_product(
    gtin: str,
    request: Request,
    response: Response,
    session: Session,
    off: Annotated[OFFClient, Depends(get_off)],
    cfg: Annotated[ScoringConfig, Depends(default_config)],
    settings: Annotated[Settings, Depends(get_settings)],
    now: Annotated[datetime, Depends(get_now)],
) -> dict[str, Any] | Response:
    result = await _resolve(gtin, session, off, cfg, settings, now)
    if (not_modified := _cached(request, response, _etag(result, cfg))) is not None:
        return not_modified
    return _product_body(result)  # LOOKUP-10


@router.get("/{gtin}/breakdown", response_model=None)
async def get_breakdown(
    gtin: str,
    request: Request,
    response: Response,
    session: Session,
    off: Annotated[OFFClient, Depends(get_off)],
    cfg: Annotated[ScoringConfig, Depends(default_config)],
    settings: Annotated[Settings, Depends(get_settings)],
    now: Annotated[datetime, Depends(get_now)],
) -> dict[str, Any] | Response:
    result = await _resolve(gtin, session, off, cfg, settings, now)  # LOOKUP-12
    if (not_modified := _cached(request, response, _etag(result, cfg))) is not None:
        return not_modified
    return {
        "gtin": result.product.gtin,
        "score": result.score,
        "explanation": explain(_rehydrate(result.score)),
        "attribution": ATTRIBUTION,
    }
