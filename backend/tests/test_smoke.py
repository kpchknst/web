"""Smoke tests for public endpoints — no auth required."""


def test_health(client):
    response = client.get("/")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "stones-and-scents-api"


def test_list_articles_returns_10_seeded_stones(client):
    response = client.get("/articles")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 10
    slugs = {a["slug"] for a in data}
    assert {"rose-quartz", "amethyst", "citrine", "lapis-lazuli", "carnelian"}.issubset(slugs)


def test_get_article_by_slug_returns_full_payload(client):
    """Read rose-quartz — no other test modifies this stone, so it stays at v1."""
    response = client.get("/articles/rose-quartz")
    assert response.status_code == 200
    article = response.json()
    assert article["slug"] == "rose-quartz"
    assert article["title"] == "Rose Quartz"
    assert article["version"] == 1
    assert "perfume" in article["content"].lower()
    assert len(article["content"]) <= 2000  # Variant 5 limit
    tag_slugs = {t["slug"] for t in article["tags"]}
    assert "quartz-family" in tag_slugs


def test_get_unknown_slug_returns_404(client):
    response = client.get("/articles/non-existent-stone")
    assert response.status_code == 404


def test_search_query_matches_content(client):
    """`?q=quartz` should match articles where 'quartz' appears in title OR content.

    We assert only on articles the rest of the test suite never modifies, so this
    test is order-independent. (Other quartz-containing entries — amethyst, citrine,
    aventurine — get their content rewritten by the Variant 5 tests, which removes
    the word 'quartz' from them.)
    """
    response = client.get("/articles", params={"q": "quartz"})
    assert response.status_code == 200
    slugs = {a["slug"] for a in response.json()}
    assert "rose-quartz" in slugs
    assert "tigers-eye" in slugs  # body says "Tiger's eye is a chatoyant variety of quartz"
    assert "carnelian" in slugs  # body mentions "microcrystalline quartz"


def test_filter_by_tag(client):
    response = client.get("/articles", params={"tag": "protective"})
    assert response.status_code == 200
    slugs = {a["slug"] for a in response.json()}
    assert "black-tourmaline" in slugs
    assert "tigers-eye" in slugs


def test_swagger_docs_available(client):
    response = client.get("/docs")
    assert response.status_code == 200
    assert "swagger" in response.text.lower()
