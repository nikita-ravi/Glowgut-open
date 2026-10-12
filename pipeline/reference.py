"""Build the `additives` table from the Open Food Facts additives taxonomy (specs/003).

Usage: uv run python -m pipeline.reference
FDA status and OpenFoodTox ADI values are added in M1; until then those columns stay null.
"""

import asyncio
import json
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any, cast

import httpx
from sqlalchemy import Table
from sqlalchemy.dialects.postgresql import insert

from app.db.models import Additive
from app.db.session import make_engine, make_sessionmaker
from app.settings import get_settings

TAXONOMY_URL = "https://static.openfoodfacts.org/data/taxonomies/additives.json"
CACHE = Path("data/reference/additives.json")
RISK_LEVELS = {"en:high": 3, "en:moderate": 2, "en:no": 0}


def _en(entry: dict[str, Any], key: str) -> str | None:
    """Taxonomy properties are keyed by language: {"en": "..."}."""
    value = entry.get(key, {})
    return value.get("en") if isinstance(value, dict) else None


def _adi(raw: str | None) -> Decimal | None:
    try:
        return Decimal(raw) if raw else None
    except InvalidOperation:
        return None


def parse_entry(tag: str, entry: dict[str, Any]) -> dict[str, Any]:
    """Map one taxonomy entry to an `additives` row (mapping table in specs/003)."""
    risk_raw = _en(entry, "efsa_evaluation_overexposure_risk")
    has_evaluation = _en(entry, "efsa_evaluation") is not None
    if risk_raw in RISK_LEVELS:
        grade = "A"
    elif has_evaluation:
        grade = "B"
    else:
        grade = "C"
    names = entry.get("name", {})
    return {
        "code": tag.split(":", 1)[-1],
        "name": names.get("en") or names.get("xx") or tag,
        "class": _en(entry, "additives_classes"),
        "risk_level": RISK_LEVELS.get(risk_raw or ""),
        "evidence_grade": grade,
        "adi_mg_kg": _adi(_en(entry, "efsa_evaluation_adi")),
        "efsa_url": _en(entry, "efsa_evaluation_url"),
        "overexposure_risk": risk_raw,
    }


def load_taxonomy(path: Path = CACHE) -> dict[str, Any]:
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        headers = {"User-Agent": get_settings().user_agent}
        resp = httpx.get(TAXONOMY_URL, headers=headers, timeout=30, follow_redirects=True)
        resp.raise_for_status()
        path.write_bytes(resp.content)
    data: dict[str, Any] = json.loads(path.read_text())
    return data


async def upsert(rows: list[dict[str, Any]], database_url: str) -> None:
    engine = make_engine(database_url)
    async with make_sessionmaker(engine)() as session:
        stmt = insert(cast(Table, Additive.__table__)).values(rows)
        update_cols = {c: stmt.excluded[c] for c in rows[0] if c != "code"}
        await session.execute(stmt.on_conflict_do_update(index_elements=["code"], set_=update_cols))
        await session.commit()
    await engine.dispose()


def main() -> None:
    rows = [parse_entry(tag, entry) for tag, entry in load_taxonomy().items()]
    asyncio.run(upsert(rows, get_settings().database_url))
    rated = sum(1 for r in rows if r["risk_level"] is not None)
    print(f"additives: {len(rows)} loaded, {rated} with an EFSA overexposure rating")


if __name__ == "__main__":
    main()
