"""RFC 9457 problem+json errors."""

from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

PROBLEM_JSON = "application/problem+json"


class Problem(Exception):
    def __init__(self, status: int, title: str, detail: str, **extra: Any) -> None:
        self.status, self.title, self.detail, self.extra = status, title, detail, extra


def problem_response(p: Problem, instance: str) -> JSONResponse:
    body = {"type": "about:blank", "title": p.title, "status": p.status, "detail": p.detail,
            "instance": instance, **p.extra}  # fmt: skip
    return JSONResponse(body, status_code=p.status, media_type=PROBLEM_JSON)


def install(app: FastAPI) -> None:
    @app.exception_handler(Problem)
    async def _handle(request: Request, exc: Problem) -> JSONResponse:
        return problem_response(exc, request.url.path)
