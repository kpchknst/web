"""Tests for POST /uploads (admin-only cover image upload).

Because conftest sets USE_SQLITE=1 before any app import, the storage
service takes the local-fs fallback path here — we never touch real
Supabase Storage during tests, and uploaded files end up under
backend/uploads/ where StaticFiles serves them at /uploads/<key>.
"""

SMALL_JPG = b"\xff\xd8\xff\xe0fake-jpeg-bytes"


def test_upload_requires_admin(client, regular_headers):
    response = client.post(
        "/uploads",
        files={"file": ("a.jpg", SMALL_JPG, "image/jpeg")},
        headers=regular_headers,
    )
    assert response.status_code == 403


def test_upload_admin_ok(client, admin_headers):
    response = client.post(
        "/uploads",
        files={"file": ("a.jpg", SMALL_JPG, "image/jpeg")},
        headers=admin_headers,
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert "url" in body
    assert body["url"].startswith("/uploads/")


def test_upload_rejects_non_image(client, admin_headers):
    response = client.post(
        "/uploads",
        files={"file": ("a.txt", b"hello", "text/plain")},
        headers=admin_headers,
    )
    assert response.status_code == 415


def test_upload_rejects_large_file(client, admin_headers):
    big = b"\xff" * (2 * 1024 * 1024 + 1)
    response = client.post(
        "/uploads",
        files={"file": ("big.jpg", big, "image/jpeg")},
        headers=admin_headers,
    )
    assert response.status_code == 413


def test_upload_serves_back_via_static_route(client, admin_headers):
    payload = b"\xff\xd8\xff\xe0round-trip-payload"
    upload_response = client.post(
        "/uploads",
        files={"file": ("rt.jpg", payload, "image/jpeg")},
        headers=admin_headers,
    )
    assert upload_response.status_code == 201, upload_response.text
    url = upload_response.json()["url"]

    fetch_response = client.get(url)
    assert fetch_response.status_code == 200, fetch_response.text
    assert fetch_response.content == payload
