# 005: Scoring engine

Status: implemented

`score = 60·N + 30·A + 10·P`, with N, A, P in [0, 1]. Pure, deterministic Python. No I/O,
no clock, no randomness. Weights, bands and ranges are in `config/scoring.yaml`.

## Input

A `ProductFacts` value: nutrients per 100 g/ml (each optionally flagged `estimated`),
category tags, NOVA group, the additive list (or `None` if unknown), and
`ingredients_known`.

## Requirements

- **ENGINE-1** N = `(max_score − fns) / (max_score − min_score)`, using the Nutri-Score class range from NS-21. Water gives N = 1.0.
- **ENGINE-2** The total is `round_half_up(Σ weight × component / Σ weight of known components × 100)` and is an integer 0–100.
- **ENGINE-3** If Nutri-Score is `not_computable` (NS-3), the product is **not scored**: `status = "not_scored"`, `total = null`, `band = null`. The additives and processing components are still computed and returned.
- **ENGINE-4** The same `ProductFacts` and `engine_version` always give the same output, byte for byte.
- **ENGINE-5** An `unknown` component (ADD-6, PROC-2) is left out and the remaining weights are rescaled (ENGINE-2). It is listed in `missing_inputs`. Missing data lowers confidence, not the score.
- **ENGINE-6** The additive cap (ADD-5) is applied after ENGINE-2.
- **ENGINE-7** Bands: `0–24 poor`, `25–49 mediocre`, `50–74 good`, `75–100 excellent`, from `bands` in the config. The band has an `id` and a text `label`; the UI never relies on color alone.
- **ENGINE-8** Every breakdown line has `rule_id`, `component`, `points`, `input_value`, `source_url` and `estimated`. No line has an empty `rule_id` or `source_url`.
- **ENGINE-9** The breakdown also has one summary line per component, `component.<name>` with `points` = its contribution to the total (rounded to 2 decimals), so the UI can draw component bars from the list alone.
- **ENGINE-10** `confidence` = share of the scoring inputs that are present and not estimated, rounded to 2 decimals. Inputs counted: the 4 required nutrients, fibre, protein, fvl, NOVA, additive list.
- **ENGINE-11** The output carries `engine_version` from the config.
- **ENGINE-12** `explain(result)` turns a result into plain sentences from templates only. It never says "toxic", "dangerous" or "unsafe".

## Output contract

```json
{
  "engine_version": "0.1.0",
  "status": "scored",
  "total": 62,
  "band": {"id": "good", "label": "Good"},
  "confidence": 0.89,
  "missing_inputs": ["fiber_g"],
  "nutriscore": {"class": "general", "score": 4, "grade": "c"},
  "components": {
    "nutrition":  {"weight": 60, "value": 0.7361, "known": true},
    "additives":  {"weight": 30, "value": 0.85,   "known": true},
    "processing": {"weight": 10, "value": 0.0,    "known": true}
  },
  "breakdown": [
    {"rule_id": "nutriscore.general.sugars", "component": "nutrition", "points": 3,
     "input_value": 12.5, "source_url": "https://...", "estimated": false}
  ]
}
```

## Open questions

- N is a linear map over the class's full theoretical range (about −17 to 55). Real
  products cluster from −5 to 25, which squeezes N into roughly 0.4–0.85. If that feels
  too flat once real products are scored, change the range in the config and bump the
  version.

## Changelog

| engine_version | Change |
| --- | --- |
| 0.1.0 | First version: Nutri-Score 2023, OFF-taxonomy additives, NOVA. |
