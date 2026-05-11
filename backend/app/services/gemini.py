"""LLM wrapper for AI readings — Gemini and Groq.

Default provider is `gemini` (gemini-2.0-flash). Set `LLM_PROVIDER=groq`
plus `GROQ_API_KEY` (and optionally `LLM_MODEL`) in the environment to
swap to Groq + Llama 3.3 70B, which has a much more generous free tier.

The public API (`generate_perfume_reading`, `generate_personality_reading`,
the three typed exceptions) is provider-agnostic.
"""

import os

DEFAULT_GEMINI_MODEL = "gemini-2.0-flash"
DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile"


class AIConfigurationError(Exception):
    """Raised when the configured provider's API key is not set."""


class AIRateLimitError(Exception):
    """Raised when the provider returns 429 / quota exhaustion."""


class AIServiceError(Exception):
    """Raised for generic provider failures (5xx, timeout, empty output)."""


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


def _provider() -> str:
    return (os.getenv("LLM_PROVIDER") or "gemini").strip().lower()


def _model() -> str:
    explicit = os.getenv("LLM_MODEL") or os.getenv("GEMINI_MODEL")
    if explicit:
        return explicit
    return DEFAULT_GROQ_MODEL if _provider() == "groq" else DEFAULT_GEMINI_MODEL


def _classify_provider_error(exc: Exception) -> Exception:
    message = str(exc).lower()
    if "429" in message or "rate" in message or "quota" in message:
        return AIRateLimitError(str(exc))
    return AIServiceError(str(exc))


def _call_gemini(system_instruction: str, user_prompt: str) -> str:
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        raise AIConfigurationError("GEMINI_API_KEY env var is not set")

    from google import genai
    from google.genai import types

    client = genai.Client(api_key=key)
    try:
        response = client.models.generate_content(
            model=_model(),
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0,
                top_p=1,
                max_output_tokens=800,
            ),
        )
    except Exception as exc:  # noqa: BLE001 — re-classified below
        raise _classify_provider_error(exc) from exc

    text = (getattr(response, "text", "") or "").strip()
    if not text:
        raise AIServiceError(f"Empty response from Gemini: {response!r}")
    return text


def _call_groq(system_instruction: str, user_prompt: str) -> str:
    key = os.getenv("GROQ_API_KEY")
    if not key:
        raise AIConfigurationError("GROQ_API_KEY env var is not set")

    from groq import Groq

    client = Groq(api_key=key)
    try:
        response = client.chat.completions.create(
            model=_model(),
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0,
            top_p=1,
            max_completion_tokens=800,
        )
    except Exception as exc:  # noqa: BLE001 — re-classified below
        raise _classify_provider_error(exc) from exc

    choices = getattr(response, "choices", None) or []
    text = ""
    if choices:
        message = getattr(choices[0], "message", None)
        if message is not None:
            text = (getattr(message, "content", "") or "").strip()
    if not text:
        raise AIServiceError(f"Empty response from Groq: {response!r}")
    return text


def _call(system_instruction: str, user_prompt: str) -> str:
    if _provider() == "groq":
        return _call_groq(system_instruction, user_prompt)
    return _call_gemini(system_instruction, user_prompt)


def generate_perfume_reading(stone_slugs: list[str], gender: str | None) -> str:
    gender_label = gender or "prefer_not_to_say"
    prompt = f"Stones: {', '.join(stone_slugs)}. Gender: {gender_label}."
    return _call(_PERFUME_SYSTEM, prompt)


def generate_personality_reading(stone_slugs: list[str]) -> str:
    prompt = f"Stones: {', '.join(stone_slugs)}."
    return _call(_PERSONALITY_SYSTEM, prompt)
