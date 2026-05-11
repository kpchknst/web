"""Integration tests for /ai/readings.

The happy-path POST is exercised in `test_dedupe_returns_cached_row` by
stubbing the Gemini service so we don't pay for or wait on a real LLM call.
All other tests cover validation, auth, and error mapping.
"""

import pytest


def _post(client, token, body):
    return client.post(
        "/ai/readings",
        json=body,
        headers={"Authorization": f"Bearer {token}"},
    )


def test_unauthorized_create_returns_401(client):
    response = client.post(
        "/ai/readings",
        json={"kind": "perfume", "stone_slugs": ["amethyst"]},
    )
    assert response.status_code == 401


def test_unauthorized_list_returns_401(client):
    response = client.get("/ai/readings")
    assert response.status_code == 401


def test_invalid_kind_returns_422(client, admin_token):
    response = _post(client, admin_token, {"kind": "horoscope", "stone_slugs": ["amethyst"]})
    assert response.status_code == 422


def test_zero_stones_returns_422(client, admin_token):
    response = _post(client, admin_token, {"kind": "perfume", "stone_slugs": []})
    assert response.status_code == 422


def test_too_many_stones_returns_422(client, admin_token):
    response = _post(
        client,
        admin_token,
        {"kind": "perfume", "stone_slugs": ["a", "b", "c", "d"]},
    )
    assert response.status_code == 422


def test_unknown_stone_returns_404(client, admin_token):
    response = _post(
        client, admin_token, {"kind": "perfume", "stone_slugs": ["unicorn-quartz"]}
    )
    assert response.status_code == 404


def test_list_empty_for_fresh_user_is_200(client, regular_token):
    response = client.get(
        "/ai/readings",
        headers={"Authorization": f"Bearer {regular_token}"},
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_no_gemini_key_returns_503(monkeypatch, client, admin_token):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    response = _post(
        client, admin_token, {"kind": "perfume", "stone_slugs": ["amethyst"]}
    )
    assert response.status_code == 503


def test_dedupe_returns_cached_row(monkeypatch, client, admin_token):
    """Two identical POSTs should hit the LLM at most once."""
    from app.services import gemini

    call_count = {"n": 0}

    def fake_perfume(slugs, gender):  # noqa: ARG001
        call_count["n"] += 1
        return "fake reading content"

    monkeypatch.setattr(gemini, "generate_perfume_reading", fake_perfume)

    first = _post(
        client, admin_token, {"kind": "perfume", "stone_slugs": ["amethyst"]}
    )
    assert first.status_code == 200
    body = first.json()
    assert body["content"] == "fake reading content"
    assert body["kind"] == "perfume"
    assert body["stone_slugs"] == ["amethyst"]

    second = _post(
        client, admin_token, {"kind": "perfume", "stone_slugs": ["amethyst"]}
    )
    assert second.status_code == 200
    assert second.json()["id"] == body["id"]
    assert call_count["n"] == 1  # second call was the cache, not the LLM
