"""Plain-language sentences from a score breakdown. Templates only, no LLM (ENGINE-12)."""

from app.scoring.engine import ScoreResult
from app.scoring.types import BreakdownLine

CLASS_LABELS = {"general": "general food", "cheese": "cheese", "beverage": "drink",
                "fats_oils_nuts_seeds": "fat, oil, nut or seed", "water": "water"}  # fmt: skip
NUTRIENT_LABELS = {
    "energy": ("energy", "kJ"),
    "energy_from_saturates": ("energy from saturated fat", "kJ"),
    "sugars": ("sugars", "g"),
    "saturated_fat": ("saturated fat", "g"),
    "saturates_ratio": ("share of fat that is saturated", "%"),
    "salt": ("salt", "g"),
    "proteins": ("protein", "g"),
    "fiber": ("fibre", "g"),
    "fvl": ("fruit, vegetables and legumes", "%"),
}
FIELD_LABELS = {"energy_kj": "energy", "sugars_g": "sugars", "saturated_fat_g": "saturated fat",
                "fat_g": "fat", "salt_g": "salt", "fiber_g": "fibre", "proteins_g": "protein",
                "fvl_percent": "fruit/vegetable share", "nova_group": "processing level",
                "additives": "ingredient list"}  # fmt: skip


def _nutrient(line: BreakdownLine) -> tuple[str, str]:
    key = line.rule_id.rsplit(".", 1)[-1]
    return NUTRIENT_LABELS.get(key, (key, ""))


def _fmt(value: object, unit: str) -> str:
    if isinstance(value, float) and value.is_integer():
        value = int(value)
    return f"{value} {unit}".strip() if unit != "%" else f"{value}%"


def explain(result: ScoreResult) -> list[str]:
    out: list[str] = []
    missing = [FIELD_LABELS.get(m, m) for m in result.missing_inputs]
    if result.status == "not_scored":
        out.append(f"Not scored: the label data is missing {', '.join(missing)}.")
    else:
        assert result.band is not None
        out.append(f"Scores {result.total} out of 100 ({result.band['label']}).")

    ns = result.nutriscore
    if ns["grade"]:
        out.append(
            f"Nutri-Score 2023 grade {ns['grade'].upper()}, "
            f"scored as a {CLASS_LABELS[ns['class']]}."
        )

    per = "per 100 ml" if ns["class"] == "beverage" else "per 100 g"
    nutrition = [ln for ln in result.breakdown if ln.rule_id.startswith("nutriscore.")]
    worst = sorted((ln for ln in nutrition if ln.points > 0), key=lambda ln: -ln.points)[:2]
    for ln in worst:
        label, unit = _nutrient(ln)
        out.append(f"Lowered by {label}: {_fmt(ln.input_value, unit)} {per}.")
    best = sorted((ln for ln in nutrition if ln.points < 0), key=lambda ln: ln.points)[:2]
    for ln in best:
        label, unit = _nutrient(ln)
        out.append(f"Helped by {label}: {_fmt(ln.input_value, unit)} {per}.")

    for ln in result.breakdown:
        if ln.component == "additives" and ln.rule_id != "additives.cap" and ln.points < 0:
            assert isinstance(ln.input_value, dict)
            out.append(f"{ln.input_value['name']}: {ln.note}")
        elif ln.rule_id == "additives.cap":
            out.append(f"Capped at {ln.input_value} because of an additive's EFSA rating.")
        elif ln.rule_id == "processing.nova" and ln.note:
            out.append(f"Processing: {ln.note}")

    estimated = sorted({_nutrient(ln)[0] for ln in nutrition if ln.estimated})
    if estimated:
        out.append(f"Estimated from the ingredient list: {', '.join(estimated)}.")
    if missing and result.status == "scored":
        out.append(f"Some data is missing ({', '.join(missing)}), so this score is less certain.")
    return out
