"""Tests for /tags router — public read, admin-gated write."""

import uuid


def _unique_slug(prefix: str = "tag") -> str:
    return f"{prefix}-{uuid.uuid4().hex[:6]}"


def test_list_tags_public(client):
    response = client.get("/tags")
    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)
    assert len(body) >= 4


def test_create_tag_requires_admin(client, regular_headers):
    payload = {"name": "Forbidden", "slug": _unique_slug("forbidden")}
    response = client.post("/tags", json=payload, headers=regular_headers)
    assert response.status_code == 403


def test_create_tag_admin_ok(client, admin_headers):
    slug = _unique_slug("created")
    payload = {"name": "Created Tag", "slug": slug}
    response = client.post("/tags", json=payload, headers=admin_headers)
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["slug"] == slug
    assert body["name"] == "Created Tag"
    assert "id" in body


def test_create_tag_slug_conflict(client, admin_headers):
    slug = _unique_slug("dup")
    first = client.post(
        "/tags", json={"name": "First", "slug": slug}, headers=admin_headers
    )
    assert first.status_code == 201, first.text
    second = client.post(
        "/tags", json={"name": "Second", "slug": slug}, headers=admin_headers
    )
    assert second.status_code == 409


def test_update_tag(client, admin_headers):
    slug = _unique_slug("upd")
    created = client.post(
        "/tags", json={"name": "Old Name", "slug": slug}, headers=admin_headers
    )
    assert created.status_code == 201, created.text
    tag_id = created.json()["id"]

    response = client.put(
        f"/tags/{tag_id}", json={"name": "New Name"}, headers=admin_headers
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["id"] == tag_id
    assert body["name"] == "New Name"
    assert body["slug"] == slug


def test_delete_tag(client, admin_headers):
    slug = _unique_slug("del")
    created = client.post(
        "/tags", json={"name": "Doomed", "slug": slug}, headers=admin_headers
    )
    assert created.status_code == 201, created.text
    tag_id = created.json()["id"]

    deleted = client.delete(f"/tags/{tag_id}", headers=admin_headers)
    assert deleted.status_code == 204

    listing = client.get("/tags")
    assert listing.status_code == 200
    assert all(t["id"] != tag_id for t in listing.json())
