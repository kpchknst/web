"""Configuration-guard tests for the Gemini service wrapper.

We don't exercise the real Gemini API in tests (no network, no quota burn).
Instead we verify the guard rails: missing key raises a typed exception.
"""

import pytest

from app.services import gemini


def test_perfume_raises_without_key(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    with pytest.raises(gemini.AIConfigurationError):
        gemini.generate_perfume_reading(["amethyst"], "female")


def test_personality_raises_without_key(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    with pytest.raises(gemini.AIConfigurationError):
        gemini.generate_personality_reading(["amethyst", "moonstone"])
