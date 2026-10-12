# Open Food Scanner

A mobile-first PWA: scan a US grocery barcode and get a 0–100 health score in which every point traces back to a rule and a cited source. It runs on open data and open-source software, with **$0/month infrastructure**.

Full spec: `docs/SPEC.md`. Build order and acceptance criteria: `docs/PLAN.md`. Read both before starting a milestone.

## Spec-driven development (how every change is made)

Feature behaviour is defined in `specs/NNN-*.md` as numbered requirements (`**GTIN-3**`). Workflow is in `specs/README.md`:

1. Write or edit the spec first. New specs start as `Status: draft` and need human review before code.
2. Tag every test with the requirement IDs it covers: `@spec("GTIN-3")` in Python, `[GTIN-3]` in web test titles.
3. Implement until the tests pass, then set the spec to `implemented`.

`api/tests/test_spec_traceability.py` fails CI if an approved or implemented requirement has no test, or a test cites an unknown ID. Never renumber IDs. Retire them with `~~strikethrough~~`.

## Hard rules (never break these)

1. **Zero cost.** No paid APIs, no usage-billed services, no API keys that can incur charges. Don't add a dependency on any hosted service without asking first. Heavy compute goes in the browser or the offline pipeline, never the server.
2. **No LLM in the scoring path.** Scoring is a pure, deterministic Python module. The same inputs and `engine_version` always give the same score. Product explanations are rendered from templates over the score breakdown.
3. **Licenses.** Don't copy code from AGPL/GPL projects (e.g. the Open Food Facts server, Piper TTS). Port logic from their docs and test against their outputs instead. Run the license check before adding a dependency. Open Food Facts data is ODbL: attribute it everywhere it's shown.
4. **Health language.** Never write "toxic", "dangerous", or "unsafe" in user-facing copy. Say "limited evidence of X at typical intake", state regulatory status as fact, and show the "educational, not medical advice" footer.
5. **Missing data lowers confidence, not the score.** Never guess a nutrient value. Estimated fields are flagged. If required inputs are missing, the product is "not scored".
6. **Privacy.** Scan history is health-adjacent. Collect the minimum, keep it deletable in one call, and enforce row-level security per user. No third-party analytics.

## Stack

| Layer | Choice |
| --- | --- |
| Offline pipeline | Python 3.12 + DuckDB (reads Parquet/CSV in place) |
| API | FastAPI + SQLAlchemy 2 + Alembic, async (`asyncpg`) |
| DB | PostgreSQL 16 (`pg_trgm`, full-text search, JSONB, RLS). Local: Docker. Hosted: Supabase free tier (500 MB cap: keep the DB ≤ 450 MB) |
| Web | Next.js (App Router) + TypeScript + Tailwind, installable PWA |
| Barcode | `barcode-detector` (BarcodeDetector polyfill on ZXing-C++ WASM). Do NOT use `html5-qrcode` (unmaintained) |
| OCR | Robotoff nutrition extraction API first, Tesseract.js fallback in the browser |
| Auth | Better Auth |
| Voice (phase 1.5) | Web Speech API for STT; `kokoro-js` (Apache-2.0) for TTS, in the browser |
| Python tooling | `uv`, `pytest`, `ruff`, `mypy` |
| JS tooling | `pnpm`, `eslint`, `vitest`, Playwright for e2e |
| CI | GitHub Actions (tests + lint on PR; weekly data refresh cron) |

## Repo layout

```
pipeline/        offline data: reference.py (additives, done); bulk OFF/USDA import (tool not chosen yet)
specs/           feature specs with requirement IDs (the source of truth for behaviour)
api/app/         FastAPI app: main.py, routers/, services/ (gtin, off_client, off_mapping, lookup), db/
api/app/scoring/ engine.py, nutriscore_2023.py, additives.py, processing.py, explain.py, config.py
api/migrations/  Alembic migrations
api/tests/       unit/, integration/ (Docker Postgres, OFF mocked with respx), golden/ (Nutri-Score golden set)
web/             Next.js PWA
config/scoring.yaml   weights and thresholds; bump engine_version on any change
data/            raw dumps (gitignored, never committed)
docs/            SPEC.md, PLAN.md
```

## Commands

```
cp .env.example .env                          # then set OFF_CONTACT
docker compose up -d db                       # local Postgres 16 (also creates ofs_test for tests)
uv run alembic upgrade head                   # migrations
uv run python -m pipeline.reference           # load the additives table from the OFF taxonomy
uv run pytest                                 # unit + integration + spec traceability
uv run ruff check . && uv run ruff format --check . && uv run mypy api pipeline   # lint and types
uv run fastapi dev api/app/main.py            # API on :8000
cd web && corepack pnpm@10.18.3 install       # web deps (also copies the ZXing .wasm into public/)
cd web && pnpm dev                            # PWA on :3000; reads API_URL (default http://localhost:8000)
cd web && pnpm test && pnpm lint && pnpm typecheck   # Vitest, ESLint, tsc (with Next route typegen)
cd web && pnpm e2e                            # Playwright: own API on :8001 + prod build on :3100, DB ofs_test
```

Update this section as soon as a command changes.

## Conventions

- **The barcode key is GTIN-13.** Normalize every input (UPC-A, EAN-8, EAN-13), zero-padded, and validate the mod-10 check digit before any lookup. Off-by-format barcodes are the #1 cause of false "not found".
- **The scoring breakdown is the contract.** The engine returns `[{rule_id, component, points, input_value, source_url, estimated}]` (specs/005). The UI and the explanations read only from this list.
- **Scores are versioned.** The `scores` primary key is `(gtin, engine_version)`. Never update a score row in place across versions.
- **Track sources per field.** `products.source_by_field` records whether each field came from `off` or `usda`. The merge keeps the more complete value per field.
- **Be a good Open Food Facts citizen.** Cache first, send a descriptive User-Agent (`OpenFoodScanner/0.1 (contact email)`), back off on 429s, and use the bulk dump for anything predictable.
- **Tests come with the code.** Every scoring rule gets a unit test. Any change to the lookup flow gets an integration test against the Docker DB.
- Keep functions small and typed. No new top-level dependency without a one-line reason in the PR description.

## Gotchas

- `fastapi[standard]` pulls in an OpenTelemetry exporter. Don't use it: depend on `fastapi`, `fastapi-cli` and `uvicorn[standard]` instead (privacy rule 6).
- This is Next.js 16: read `web/node_modules/next/dist/docs/` before writing Next code. With Cache Components on, route `params` are request-time data and must be read inside `<Suspense>`.
- Next 16 keeps the previous route mounted but hidden after navigation. In Playwright, scope text queries (e.g. to `footer`) or they match the hidden page too.
- `barcode-detector` fetches its WASM from jsDelivr by default. `src/lib/detector.ts` overrides that to `/zxing/`; keep it that way (spec 007, SCAN-11).
- OFF taxonomy properties are keyed by language (`{"en": "en:high"}`). Unwrap them; don't expect plain strings.
- The OFF Parquet file is ~4.2 GB. Query it with DuckDB in place. Never load it whole into Python memory or into Postgres.
- In OFF, US products may be stored with 12- or 13-digit codes. Look up both forms.
- USDA Branded Foods has no NOVA group, no Nutri-Score, and no parsed additives. Derive them from its ingredient text and nutrient rows.
- The Supabase free tier pauses after 7 idle days. The weekly GitHub Actions job keeps it active.
- Nutri-Score has separate rules for general foods, beverages, cheese, and fats/oils/nuts/seeds. Always pass the category.
