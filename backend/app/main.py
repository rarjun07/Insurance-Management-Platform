from fastapi import FastAPI

from app.api.v1.routes import api_router
from app.core.config import settings


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="Backend API for the Insurance Management Platform.",
)


@app.get("/")
def root() -> dict[str, str]:
    return {
        "message": "Insurance Management Platform API",
        "docs": "/docs",
    }


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(api_router, prefix=settings.API_V1_PREFIX)
