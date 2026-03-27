import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router

logging.basicConfig(level=logging.DEBUG, format="%(levelname)s %(name)s: %(message)s")


app = FastAPI(
    title="Hackathon HrFlow.AI 2026 API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "API is running"}
