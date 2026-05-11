"""GET /articles/{slug}/history — approved-edit history (Tasks 2.3 + 2.4).

Each test creates a fresh article with a unique slug to remain
order-independent across the session-scoped in-memory SQLite, just like
test_edits_variant5.py.
"""

import uuid


def _create_article(client, admin_headers, slug):
    response = client.post(
        "/articles",
        json={
            "slug": slug,
            "title": "History fixture",
            "content": "Seed content for history endpoint tests.",
        },
        headers=admin_headers,
    )
    assert response.status_code == 201, response.text
    return response.json()


def _propose(client, headers, slug, title, content, base_version):
    return client.post(
        f"/articles/{slug}/edits",
        json={
            "proposed_title": title,
            "proposed_content": content,
            "base_version": base_version,
        },
        headers=headers,
    )


def test_history_returns_only_approved_in_order(client, admin_headers, regular_headers):
    slug = f"hist-{uuid.uuid4().hex[:6]}"
    article = _create_article(client, admin_headers, slug)
    base = article["version"]

    try:
        first = _propose(
            client, regular_headers, slug,
            "T1", "First proposed body.", base,
        ).json()
        approval1 = client.post(f"/edits/{first['id']}/approve", headers=admin_headers)
        assert approval1.status_code == 200

        after_first = client.get(f"/articles/{slug}").json()
        second = _propose(
            client, regular_headers, slug,
            "T2", "Second proposed body.", after_first["version"],
        ).json()
        approval2 = client.post(f"/edits/{second['id']}/approve", headers=admin_headers)
        assert approval2.status_code == 200

        response = client.get(f"/articles/{slug}/history")
        assert response.status_code == 200
        history = response.json()
        assert len(history) == 2
        assert history[0]["proposed_title"] == "T1"
        assert history[1]["proposed_title"] == "T2"
        assert history[0]["status"] == "approved"
        assert history[1]["status"] == "approved"
    finally:
        client.delete(f"/articles/{slug}", headers=admin_headers)


def test_history_excludes_pending_and_rejected(client, admin_headers, regular_headers):
    slug = f"hist-{uuid.uuid4().hex[:6]}"
    article = _create_article(client, admin_headers, slug)
    base = article["version"]

    try:
        first = _propose(
            client, regular_headers, slug,
            "Pending one", "Will stay pending.", base,
        ).json()
        second = _propose(
            client, regular_headers, slug,
            "Reject me", "Will be rejected.", base,
        ).json()

        rejection = client.post(
            f"/edits/{second['id']}/reject",
            json={"reason": "Not good enough."},
            headers=admin_headers,
        )
        assert rejection.status_code == 200
        # `first` left pending intentionally
        assert first["status"] == "pending"

        response = client.get(f"/articles/{slug}/history")
        assert response.status_code == 200
        assert response.json() == []
    finally:
        client.delete(f"/articles/{slug}", headers=admin_headers)


def test_history_404_unknown_slug(client):
    response = client.get("/articles/does-not-exist/history")
    assert response.status_code == 404
