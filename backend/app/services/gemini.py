"""Thin wrapper around Google Gemini for AI readings.

Uses the supported `google-genai` SDK (not the deprecated
`google-generativeai`). Default model `gemini-2.0-flash` — free tier,
no thinking-token truncation, predictable outputs.
"""

import os

from google import genai
from google.genai import types


class AIConfigurationError(Exception):
    """Raised when GEMINI_API_KEY is not set."""


class AIRateLimitError(Exception):
    """Raised when Gemini returns 429."""


class AIServiceError(Exception):
    """Raised for generic Gemini failures (5xx, timeout, empty output)."""


_PERFUME_SYSTEM = (
    "You are a thoughtful perfume guide. Given the user's chosen stones and "
    "gender, suggest a fragrance pairing. If the user's gender is "
    "'prefer_not_to_say' or unset, recommend ONLY unisex perfumes. Output "
    "exactly two parts: (1) a 2-3 sentence opening paragraph describing the "
    "overall scent profile that fits the stones, then (2) a markdown bullet "
    "list of exactly two real perfume picks in the format "
    "`**Brand — Name** — one sentence on why it fits.` Do not invent "
    "perfumes; if unsure, fall back to classics. Be warm but concise."
)

_PERSONALITY_SYSTEM = (
    "You are a writer of mystical, warm-toned personality readings. Output "
    "exactly three markdown sections in this order: '## Your inner climate', "
    "'## What others see in you', '## What these stones are asking of you'. "
    "Each section is one paragraph of roughly 50-70 words. Weave together all "
    "the chosen stones; do not list them separately. Be poetic but specific."
)

_MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")


def _client() -> genai.Client:
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        raise AIConfigurationError("GEMINI_API_KEY env var is not set")
    return genai.Client(api_key=key)


def _call(system_instruction: str, user_prompt: str) -> str:
    client = _client()
    try:
        response = client.models.generate_content(
            model=_MODEL_NAME,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0,
                top_p=1,
                max_output_tokens=800,
            ),
        )
    except Exception as exc:  # noqa: BLE001
        message = str(exc).lower()
        if "429" in message or "rate" in message or "quota" in message:
            raise AIRateLimitError(str(exc)) from exc
        raise AIServiceError(str(exc)) from exc

    text = (getattr(response, "text", "") or "").strip()
    if not text:
        raise AIServiceError(f"Empty response from Gemini: {response!r}")
    return text


def generate_perfume_reading(stone_slugs: list[str], gender: str | None) -> str:
    gender_label = gender or "prefer_not_to_say"
    prompt = f"Stones: {', '.join(stone_slugs)}. Gender: {gender_label}."
    return _call(_PERFUME_SYSTEM, prompt)


def generate_personality_reading(stone_slugs: list[str]) -> str:
    prompt = f"Stones: {', '.join(stone_slugs)}."
    return _call(_PERSONALITY_SYSTEM, prompt)
