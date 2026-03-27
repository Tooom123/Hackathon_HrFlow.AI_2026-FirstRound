"""LLM service using Ollama (local).

Handles two responsibilities:
1. Evaluate candidate answers against the expected question context.
2. Decide whether to ask a follow-up or move to the next question.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from enum import Enum

import httpx

logger = logging.getLogger(__name__)

EVALUATE_SYSTEM_PROMPT = """\
Tu es un recruteur technique expérimenté qui conduit un entretien.
Tu évalues les réponses des candidats de manière concise et bienveillante.

Réponds UNIQUEMENT avec un JSON valide (sans markdown) au format:
{
  "decision": "next_question" ou "follow_up",
  "evaluation": "évaluation brève de la réponse (1-2 phrases)",
  "follow_up_text": "question de relance si decision=follow_up, sinon null"
}

Règles:
- Si la réponse est suffisamment complète → "next_question"
- Si la réponse est vague, incomplète ou hors sujet → "follow_up" avec une relance ciblée
- La relance doit être courte et naturelle (comme à l'oral)
- Maximum 1 relance par question
"""

INTRO_SYSTEM_PROMPT = """\
Tu es un recruteur technique bienveillant. Génère une introduction courte et naturelle
(2-3 phrases max) pour un entretien technique. Le ton doit être professionnel mais chaleureux.
Parle à la deuxième personne. Ne dis pas "je suis une IA".
"""


class LLMDecision(str, Enum):
    NEXT_QUESTION = "next_question"
    FOLLOW_UP = "follow_up"


@dataclass(frozen=True)
class EvaluationResult:
    decision: LLMDecision
    evaluation: str
    follow_up_text: str | None


@dataclass
class LLMConfig:
    base_url: str = "http://localhost:11434"
    model: str = "llama3.2"
    temperature: float = 0.3
    max_tokens: int = 512


class LLMService:
    """Wraps Ollama HTTP API for local LLM inference."""

    def __init__(self, config: LLMConfig | None = None) -> None:
        self._config = config or LLMConfig()
        self._client = httpx.AsyncClient(
            base_url=self._config.base_url,
            timeout=60.0,
        )

    async def evaluate_answer(
        self,
        question_text: str,
        candidate_answer: str,
        job_context: str,
    ) -> EvaluationResult:
        """Evaluate a candidate's answer and decide next action."""
        user_prompt = (
            f"Contexte du poste: {job_context}\n\n"
            f"Question posée: {question_text}\n\n"
            f"Réponse du candidat: {candidate_answer}"
        )

        raw = await self._chat(
            system=EVALUATE_SYSTEM_PROMPT,
            user=user_prompt,
        )

        return self._parse_evaluation(raw)

    async def generate_introduction(self, job_title: str) -> str:
        """Generate a short spoken introduction for the interview."""
        return await self._chat(
            system=INTRO_SYSTEM_PROMPT,
            user=f"Poste: {job_title}",
        )

    async def _chat(self, system: str, user: str) -> str:
        """Send a chat completion request to Ollama."""
        payload = {
            "model": self._config.model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "stream": False,
            "options": {
                "temperature": self._config.temperature,
                "num_predict": self._config.max_tokens,
            },
        }

        response = await self._client.post("/api/chat", json=payload)
        response.raise_for_status()

        data = response.json()
        return data["message"]["content"]

    def _parse_evaluation(self, raw: str) -> EvaluationResult:
        """Parse LLM JSON response into EvaluationResult."""
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            logger.warning("LLM returned non-JSON, defaulting to next_question: %s", raw)
            return EvaluationResult(
                decision=LLMDecision.NEXT_QUESTION,
                evaluation=raw[:200],
                follow_up_text=None,
            )

        decision_str = parsed.get("decision", "next_question")
        try:
            decision = LLMDecision(decision_str)
        except ValueError:
            decision = LLMDecision.NEXT_QUESTION

        return EvaluationResult(
            decision=decision,
            evaluation=parsed.get("evaluation", ""),
            follow_up_text=parsed.get("follow_up_text"),
        )

    async def close(self) -> None:
        await self._client.aclose()
