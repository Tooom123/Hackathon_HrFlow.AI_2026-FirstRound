from fastapi import APIRouter

from app.api.v1.endpoints.hrflow import router as hrflow_router
from app.api.v1.endpoints.interview import router as interview_router

api_router = APIRouter()


@api_router.get("/health", tags=["health"])
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


api_router.include_router(hrflow_router)
api_router.include_router(interview_router)
