"""NOVA processing, the P component (specs/004-processing.md)."""

from dataclasses import dataclass

from app.scoring.config import ProcessingConfig
from app.scoring.types import BreakdownLine

NOVA_LABELS = {1: "unprocessed or minimally processed", 2: "processed culinary ingredient",
               3: "processed food", 4: "ultra-processed food"}  # fmt: skip


@dataclass(frozen=True)
class ProcessingResult:
    known: bool
    value: float | None
    lines: tuple[BreakdownLine, ...]


def compute(nova_group: int | None, cfg: ProcessingConfig) -> ProcessingResult:
    if nova_group not in cfg.nova_values:  # PROC-2, PROC-3
        return ProcessingResult(False, None, ())
    value = cfg.nova_values[nova_group]  # PROC-1
    line = BreakdownLine(
        "processing.nova", "processing", value, nova_group, cfg.source_url,
        note=f"NOVA {nova_group}: {NOVA_LABELS[nova_group]}.",
    )  # fmt: skip
    return ProcessingResult(True, value, (line,))
