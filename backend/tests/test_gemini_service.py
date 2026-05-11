"""Configuration-guard tests for the LLM service wrapper.

We don't exercise the real provider APIs in tests (no network, no quota
burn). Instead we verify the guard rails: missing key raises a typed
exception, regardless of which provider is configured.
"""

import pytest

from app.services import gemini


def test_perfume_raises_without_key(monkeypatch):
    monkeypatch.delenv("LLM_PROVIDER", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    with pytest.raises(gemini.AIConfigurationError):
        gemini.generate_perfume_reading(["amethyst"], "female")


def test_personality_raises_without_key(monkeypatch):
    monkeypatch.delenv("LLM_PROVIDER", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    with pytest.raises(gemini.AIConfigurationError):
        gemini.generate_personality_reading(["amethyst", "moonstone"])


def test_groq_perfume_raises_without_key(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "groq")
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    with pytest.raises(gemini.AIConfigurationError):
        gemini.generate_perfume_reading(["amethyst"], "female")


def test_groq_personality_raises_without_key(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "groq")
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    with pytest.raises(gemini.AIConfigurationError):
        gemini.generate_personality_reading(["amethyst", "moonstone"])


def test_default_provider_is_gemini(monkeypatch):
    monkeypatch.delenv("LLM_PROVIDER", raising=False)
    assert gemini._provider() == "gemini"


def test_groq_provider_picks_llama_default(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "groq")
    monkeypatch.delenv("LLM_MODEL", raising=False)
    monkeypatch.delenv("GEMINI_MODEL", raising=False)
    assert gemini._model() == gemini.DEFAULT_GROQ_MODEL
