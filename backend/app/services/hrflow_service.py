from __future__ import annotations

from app.core.config import settings


class HrFlowService:
    """Minimal HrFlow service placeholder.

    This keeps the API runnable while the real external integration is being
    implemented.
    """

    async def check_connection(self) -> dict[str, str]:
        return {
            "workspace_email": settings.user_email,
            "board_key": settings.hrflow_board_key,
            "status": "configured",
        }

    async def parse_text(self, text: str, language: str = "fr") -> dict:
        return {
            "text": text,
            "language": language,
            "parsed": False,
            "message": "HrFlow parsing is not implemented yet.",
        }

    async def ask_job(
        self,
        prompt: str,
        board_key: str | None = None,
        job_key: str | None = None,
        job_reference: str | None = None,
    ) -> dict:
        if not job_key and not job_reference:
            raise ValueError("Provide either `job_key` or `job_reference`.")

        return {
            "prompt": prompt,
            "board_key": board_key or settings.hrflow_board_key,
            "job_key": job_key,
            "job_reference": job_reference,
            "answered": False,
            "message": "HrFlow ask-job is not implemented yet.",
        }

    async def create_job_from_text(
        self,
        text: str,
        title: str,
        board_key: str | None = None,
        reference: str | None = None,
    ) -> dict:
        return {
            "title": title,
            "text": text,
            "board_key": board_key or settings.hrflow_board_key,
            "reference": reference,
            "created": False,
            "message": "HrFlow job creation is not implemented yet.",
        }
