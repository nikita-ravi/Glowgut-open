# Specs

This project uses spec-driven development. `docs/SPEC.md` is the product-level spec.
The files here are **feature specs**: small, testable, and the source of truth for
behaviour. Code and tests are derived from them, never the other way round.

## Workflow

1. **Write or change the spec first.** Add or edit requirements in a `specs/NNN-*.md` file.
   Set its status to `draft`.
2. **Review.** A human reads the spec. When the requirements are agreed, set the status
   to `approved`. Settle open questions in the spec, not in code.
3. **Tests.** Write a test for every requirement, tagged with its ID:
   `@pytest.mark.spec("GTIN-3")`. A test can cover several IDs.
4. **Code.** Implement until the tests pass. When everything is in, set the status to
   `implemented`.
5. **Change = spec change.** A behaviour change starts with a spec edit in the same PR.
   Scoring changes also bump `engine_version` in `config/scoring.yaml` and get a
   changelog line in `specs/005-engine.md`.

`api/tests/test_spec_traceability.py` enforces two things in CI:

- every requirement ID in an `approved` or `implemented` spec has at least one test;
- every test's `spec(...)` marker points at a requirement ID that exists.

## Requirement format

Each requirement sits on its own line and starts with a bold ID:

```
- **GTIN-3** UPC-A (12 digits) is zero-padded to GTIN-13.
```

IDs are stable. Never renumber. Retire a requirement by striking it out (`~~...~~`)
and noting why; its tests go with it.

## Index

| Spec | Area | Status |
| --- | --- | --- |
| [001-gtin](001-gtin.md) | Barcode normalization and validation | implemented |
| [002-nutriscore-2023](002-nutriscore-2023.md) | Nutri-Score 2023 port (N component input) | implemented |
