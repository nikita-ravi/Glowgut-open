from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI

from app import problems
from app.db.session import make_engine, make_sessionmaker
from app.routers import products
from app.services.off_client import OFFClient
from app.settings import APP_VERSION, get_settings


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    engine = make_engine(settings.database_url)
    app.state.sessionmaker = make_sessionmaker(engine)
    async with httpx.AsyncClient(timeout=settings.off_timeout_s) as http:
        app.state.off = OFFClient(http, settings.off_base_url, settings.user_agent)
        yield
    await engine.dispose()


app = FastAPI(title="Open Food Scanner API", version=APP_VERSION, lifespan=lifespan)
problems.install(app)
app.include_router(products.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
