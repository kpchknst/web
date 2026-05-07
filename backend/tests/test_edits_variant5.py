"""Variant 5 — article edit moderation.

These tests cover the spec-mandatory features of the variant: propose,
review, approve/reject, and the concurrent-edit handling that flags
edits whose `base_version` is older than the current article version.

Tests are written to be order-independent: each modifying test uses a
distinct article slug so the mutated state of one test never leaks into
another. Untouched stones (rose-quartz, lapis-lazuli, moonstone, tigers-eye,
black-tourmaline, carnelian) are reserved for read-only smoke tests.
"""


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


def test_propose_edit_requires_authentication(client):
    response = client.post(
        "/articles/rose-quartz/edits",
        json={"proposed_title": "X", "proposed_content": "Y", "base_version": 1},
    )
    assert response.status_code == 401


def test_propose_and_approve_bumps_article_version(client, admin_headers, regular_headers):
    """Use 'amethyst' — no other test mutates it, so we own the state delta."""
    before = client.get("/articles/amethyst").json()
    base_version = before["version"]

    proposed = _propose(
        client, regular_headers, "amethyst",
        "Amethyst — refined", "Refined description proposed by a regular user.",
        base_version,
    )
    assert proposed.status_code == 201
    edit = proposed.json()
    assert edit["status"] == "pending"
    assert edit["base_version"] == base_version

    approval = client.post(f"/edits/{edit['id']}/approve", headers=admin_headers)
    assert approval.status_code == 200
    assert approval.json()["status"] == "approved"

    after = client.get("/articles/amethyst").json()
    assert after["version"] == base_version + 1
    assert after["title"] == "Amethyst — refined"
    assert after["content"].startswith("Refined description")


def test_reject_edit_records_reason(client, admin_headers, regular_headers):
    """Use 'selenite'."""
    before = client.get("/articles/selenite").json()
    proposed = _propose(
        client, regular_headers, "selenite",
        "Bad edit", "Junk", before["version"],
    )
    edit_id = proposed.json()["id"]

    rejection = client.post(
        f"/edits/{edit_id}/reject",
        json={"reason": "Inadequate sources cited."},
        headers=admin_headers,
    )
    assert rejection.status_code == 200
    body = rejection.json()
    assert body["status"] == "rejected"
    assert body["rejection_reason"] == "Inadequate sources cited."

    # Article version must NOT have been bumped on a rejection
    after = client.get("/articles/selenite").json()
    assert after["version"] == before["version"]
    assert after["title"] == before["title"]


def test_double_approve_returns_409(client, admin_headers, regular_headers):
    """Use 'citrine'."""
    before = client.get("/articles/citrine").json()
    proposed = _propose(
        client, regular_headers, "citrine",
        "Citrine v2 attempt", "Once-approved is enough.", before["version"],
    )
    edit_id = proposed.json()["id"]

    first = client.post(f"/edits/{edit_id}/approve", headers=admin_headers)
    assert first.status_code == 200

    second = client.post(f"/edits/{edit_id}/approve", headers=admin_headers)
    assert second.status_code == 409


def test_concurrent_edits_older_one_marked_stale(client, admin_headers, regular_headers):
    """Variant 5 mandatory flow.

    Two edits proposed against the same `base_version`. Admin approves the
    first → article.version increments → the second edit (still pending,
    base_version now stale) must be flipped to 'stale'.
    Use 'aventurine'.
    """
    before = client.get("/articles/aventurine").json()
    base = before["version"]

    first = _propose(
        client, regular_headers, "aventurine",
        "Aventurine A", "First proposal.", base,
    ).json()
    second = _propose(
        client, regular_headers, "aventurine",
        "Aventurine B", "Second proposal, parallel to first.", base,
    ).json()

    approval = client.post(f"/edits/{first['id']}/approve", headers=admin_headers)
    assert approval.status_code == 200

    # The second edit, still pending, should now be 'stale'
    second_after = client.get(f"/edits/{second['id']}", headers=admin_headers).json()
    assert second_after["status"] == "stale"

    # Article picked up edit A
    article_after = client.get("/articles/aventurine").json()
    assert article_after["version"] == base + 1
    assert article_after["title"] == "Aventurine A"


def test_my_edits_lists_own_proposals(client, regular_headers):
    """Each regular user can list their own edit history regardless of status."""
    response = client.get("/me/edits", headers=regular_headers)
    assert response.status_code == 200
    edits = response.json()
    # Earlier tests proposed several edits as 'regular'; we expect at least one
    assert len(edits) >= 1
    # Every entry must indeed belong to the same editor
    editor_ids = {e["editor_id"] for e in edits}
    assert len(editor_ids) == 1


def test_list_pending_queue_admin_only(client, regular_headers):
    response = client.get("/edits", params={"status": "pending"}, headers=regular_headers)
    assert response.status_code == 403


def test_propose_with_oversized_content_returns_422(client, regular_headers):
    """The 2000-char Variant 5 limit is enforced by Pydantic."""
    too_long = "x" * 2001
    before = client.get("/articles/lapis-lazuli").json()
    response = _propose(
        client, regular_headers, "lapis-lazuli",
        "Too long", too_long, before["version"],
    )
    assert response.status_code == 422
