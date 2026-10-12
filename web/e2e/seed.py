"""Seed the e2e database (ofs_test) with one fresh product, so no Open Food Facts call is needed.

Run from the repo root: uv run python web/e2e/seed.py
"""

import asyncio
import json
import os
from datetime import UTC, datetime

from sqlalchemy import text

from app.db.session import make_engine

URL = os.environ["DATABASE_URL"]
NUTRITION = {
    "energy_kj": 1500, "sugars_g": 12, "saturated_fat_g": 2.5, "salt_g": 0.9,
    "fiber_g": 4.5, "proteins_g": 8, "fvl_percent": 0,
}  # fmt: skip

PRODUCT = """
INSERT INTO products (gtin, name, brand, primary_category, categories, image_url, ingredients_text,
  nutrition, nova_group, labels, is_organic, additives_known, source_by_field, completeness,
  fetched_at)
VALUES ('0036000291452', 'Crunchy Oat Bars', 'Acme Foods', 'en:cereal-bars',
  ARRAY['en:snacks', 'en:cereal-bars'], NULL, 'Oats, sugar, salt, sodium nitrite, citric acid',
  CAST(:nutrition AS jsonb),
  4, ARRAY[]::text[], false, true, '{"name": "off"}', 0.89, :now)
"""


async def main() -> None:
    engine = make_engine(URL)
    async with engine.begin() as conn:
        await conn.execute(text("TRUNCATE products, scores, product_additives CASCADE"))
        await conn.execute(
            text(PRODUCT),
            {
                "now": datetime.now(UTC),
                "nutrition": json.dumps(
                    {k: {"value": v, "estimated": k == "fvl_percent"} for k, v in NUTRITION.items()}
                ),
            },
        )
        await conn.execute(
            text(
                "INSERT INTO product_additives (gtin, additive_code) VALUES "
                "('0036000291452', 'e250'), ('0036000291452', 'e330')"
            )
        )
    await engine.dispose()


asyncio.run(main())
