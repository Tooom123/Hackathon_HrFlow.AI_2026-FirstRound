from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum


class SessionState(str, Enum):
    WAITING = "waiting"
    ASKING = "asking"
    LISTENING = "listening"
    PROCESSING = "processing"
    DONE = "done"


class WSMessageType(str, Enum):
    AUDIO_CHUNK = "audio_chunk"
    STATE_CHANGE = "state_change"
    TRANSCRIPT = "transcript"
    QUESTION_TEXT = "question_text"
    ERROR = "error"


@dataclass(frozen=True)
class Question:
    id: str
    text: str
    topic: str
    difficulty: str  # "easy" | "medium" | "hard"


@dataclass(frozen=True)
class Answer:
    question_id: str
    transcript: str
    audio_duration_s: float
    llm_evaluation: str
    follow_up_asked: bool


@dataclass
class InterviewSession:
    session_id: str
    job_id: str
    candidate_id: str
    questions: list[Question]
    state: SessionState = SessionState.WAITING
    current_question_index: int = 0
    answers: list[Answer] = field(default_factory=list)

    @property
    def current_question(self) -> Question | None:
        if self.current_question_index < len(self.questions):
            return self.questions[self.current_question_index]
        return None

    @property
    def is_finished(self) -> bool:
        return self.current_question_index >= len(self.questions)


@dataclass(frozen=True)
class WSMessage:
    type: WSMessageType
    data: dict | bytes
