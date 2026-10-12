import json
import random

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from app.scoring.config import default_config
from app.scoring.engine import band_for, score
from app.scoring.explain import explain
from app.scoring.types import AdditiveInfo, Nutrient, ProductFacts

from .factories import SNACK, additive, facts

spec = pytest.mark.spec
CFG = default_config()
BANNED = ("toxic", "dangerous", "unsafe")


@spec("ENGINE-1", "ENGINE-2")
def test_worked_example_total() -> None:
    # Nutri-Score 11 on [-17, 55] -> N = 44/72; no additives -> A = 1; NOVA 4 -> P = 0
    r = score(facts(nova=4, **SNACK))
    assert r.components["nutrition"]["value"] == pytest.approx(44 / 72, abs=1e-4)
    assert r.total == 67  # 60 * 0.6111 + 30 * 1 + 0 = 66.67
    assert r.status == "scored"


@spec("ENGINE-1")
def test_water_has_full_nutrition_value() -> None:
    r = score(facts(tags=("en:mineral-waters",), nova=1))
    assert r.components["nutrition"]["value"] == 1.0
    assert r.total == 100


@spec("ENGINE-3")
def test_not_scored_still_returns_other_components() -> None:
    r = score(facts(nova=4, additives=(additive("e250", 2, "B"),), energy_kj=100))
    assert (r.status, r.total, r.band) == ("not_scored", None, None)
    assert r.components["additives"]["known"] and r.components["processing"]["known"]
    assert {"sugars_g", "saturated_fat_g", "salt_g"} <= set(r.missing_inputs)


@spec("ENGINE-5")
def test_unknown_component_rescales_weights() -> None:
    r = score(facts(nova=None, **SNACK))
    # (60 * 0.6111 + 30 * 1) / 90 * 100 = 74.07
    assert r.total == 74
    assert "nova_group" in r.missing_inputs
    assert not r.components["processing"]["known"]


@spec("ENGINE-5")
def test_unknown_additives_rescale_weights() -> None:
    r = score(facts(nova=4, additives=None, **SNACK))
    assert r.total == round(60 * 44 / 72 / 70 * 100)
    assert "additives" in r.missing_inputs


@spec("ENGINE-6")
def test_additive_cap_applies_after_total() -> None:
    r = score(facts(tags=("en:mineral-waters",), nova=1, additives=(additive("e171", 3, "A"),)))
    assert r.total == 49
    cap = next(ln for ln in r.breakdown if ln.rule_id == "additives.cap")
    assert cap.points < 0


@spec("ENGINE-7")
@pytest.mark.parametrize(
    ("total", "band"),
    [(0, "poor"), (24, "poor"), (25, "mediocre"), (49, "mediocre"), (50, "good"),
     (74, "good"), (75, "excellent"), (100, "excellent")],
)  # fmt: skip
def test_bands(total: int, band: str) -> None:
    b = band_for(total, CFG)
    assert b["id"] == band and b["label"]


@spec("ENGINE-8")
def test_every_line_has_rule_and_source() -> None:
    r = score(facts(nova=3, additives=(additive("e250", 2, "B"), additive("e330")), **SNACK))
    for line in r.breakdown:
        d = line.to_dict()
        assert set(d) >= {"rule_id", "component", "points", "input_value", "source_url",
                          "estimated"}  # fmt: skip
        assert d["rule_id"] and d["source_url"]


@spec("ENGINE-9")
def test_component_lines_add_up_to_total() -> None:
    r = score(facts(nova=3, additives=(additive("e250", 2, "B"),), **SNACK))
    parts = [ln.points for ln in r.breakdown if ln.rule_id.startswith("component.")]
    assert len(parts) == 3
    assert round(sum(parts)) == r.total


@spec("ENGINE-10")
def test_confidence() -> None:
    assert score(facts(nova=4, **SNACK)).confidence == 1.0
    partial = {k: v for k, v in SNACK.items() if k != "fiber_g"}
    # 9 inputs: fibre and NOVA missing, fvl estimated -> 6/9
    r = score(facts(nova=None, estimated=("fvl_percent",), **partial))
    assert r.confidence == 0.67


@spec("ENGINE-11")
def test_engine_version_from_config() -> None:
    assert score(facts(**SNACK)).engine_version == CFG.engine_version


@spec("ENGINE-12")
def test_explain_is_template_text_without_banned_words() -> None:
    r = score(facts(nova=4, additives=(additive("e250", 3, "A", "Sodium nitrite"),), **SNACK))
    sentences = explain(r)
    assert sentences[0].startswith("Scores ")
    assert any("Sodium nitrite" in s for s in sentences)
    assert not any(w in s.lower() for s in sentences for w in BANNED)


@spec("ENGINE-12")
def test_explain_not_scored() -> None:
    sentences = explain(score(facts(energy_kj=100)))
    assert sentences[0].startswith("Not scored")


@spec("PROC-5")
def test_organic_gives_no_points() -> None:
    plain = score(facts(nova=4, **SNACK))
    organic = score(facts(nova=4, tags=("en:organic",), **SNACK))
    assert plain.total == organic.total


# --- Determinism and bounds (ENGINE-2, ENGINE-4) ---

_nutrient = st.floats(min_value=0, max_value=4000, allow_nan=False, allow_infinity=False)
_tags = st.sampled_from([(), ("en:beverages",), ("en:cheeses",), ("en:olive-oils",),
                         ("en:beef",), ("en:mineral-waters",)])  # fmt: skip
_additive = st.builds(
    AdditiveInfo,
    code=st.sampled_from(["e100", "e250", "e330", "e951", "e171"]),
    name=st.just("x"),
    risk_level=st.one_of(st.none(), st.integers(0, 3)),
    evidence_grade=st.one_of(st.none(), st.sampled_from(["A", "B", "C"])),
)
_facts = st.builds(
    ProductFacts,
    nutrients=st.dictionaries(
        st.sampled_from(
            [
                "energy_kj",
                "sugars_g",
                "saturated_fat_g",
                "fat_g",
                "salt_g",
                "fiber_g",
                "proteins_g",
                "fvl_percent",
            ]
        ),
        st.builds(Nutrient, _nutrient, st.booleans()),
    ),
    category_tags=_tags,
    nova_group=st.one_of(st.none(), st.integers(0, 5)),
    additives=st.one_of(st.none(), st.lists(_additive, max_size=5).map(tuple)),
)


@spec("ENGINE-2", "ENGINE-4")
@settings(max_examples=300, deadline=None)
@given(_facts)
def test_total_is_bounded_and_deterministic(f: ProductFacts) -> None:
    a, b = score(f), score(f)
    assert json.dumps(a.to_dict(), sort_keys=True) == json.dumps(b.to_dict(), sort_keys=True)
    if a.total is not None:
        assert 0 <= a.total <= 100 and isinstance(a.total, int)


@spec("ENGINE-4", "ADD-4")
@settings(max_examples=100, deadline=None)
@given(st.lists(_additive, min_size=2, max_size=5, unique_by=lambda a: a.code))
def test_additive_order_does_not_matter(adds: list[AdditiveInfo]) -> None:
    shuffled = adds[:]
    random.Random(0).shuffle(shuffled)
    a = score(facts(nova=3, additives=tuple(adds), **SNACK)).to_dict()
    b = score(facts(nova=3, additives=tuple(shuffled), **SNACK)).to_dict()
    assert a == b
