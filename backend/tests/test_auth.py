"""Authentication and authorisation tests."""


def test_login_admin_returns_jwt(client):
    response = client.post(
        "/auth/login", json={"username": "admin", "password": "admin123"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    # JWT has three dot-separated base64url segments; sanity check the shape
    assert body["access_token"].count(".") == 2


def test_login_wrong_password_returns_401(client):
    response = client.post(
        "/auth/login", json={"username": "admin", "password": "definitely-wrong"}
    )
    assert response.status_code == 401


def test_login_unknown_user_returns_401(client):
    response = client.post(
        "/auth/login", json={"username": "ghost", "password": "anything-goes-12"}
    )
    assert response.status_code == 401


def test_me_without_token_returns_401(client):
    response = client.get("/auth/me")
    assert response.status_code == 401


def test_me_with_admin_token_returns_admin_profile(client, admin_headers):
    response = client.get("/auth/me", headers=admin_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["username"] == "admin"
    assert body["role"] == "admin"


def test_me_with_invalid_token_returns_401(client):
    response = client.get(
        "/auth/me", headers={"Authorization": "Bearer not.a.realtoken"}
    )
    assert response.status_code == 401


def test_users_listing_is_admin_only(client, regular_headers):
    response = client.get("/users", headers=regular_headers)
    assert response.status_code == 403


def test_admin_can_list_users(client, admin_headers):
    response = client.get("/users", headers=admin_headers)
    assert response.status_code == 200
    usernames = {u["username"] for u in response.json()}
    assert {"admin", "regular"}.issubset(usernames)


def test_register_creates_regular_user(client):
    response = client.post(
        "/auth/register",
        json={"username": "alice-test", "password": "alice-secret"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["username"] == "alice-test"
    assert body["role"] == "regular"  # public registration cannot self-promote to admin


def test_duplicate_registration_returns_409(client):
    response = client.post(
        "/auth/register", json={"username": "admin", "password": "any-password"}
    )
    assert response.status_code == 409
