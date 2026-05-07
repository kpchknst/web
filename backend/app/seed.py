"""Create the schema and seed 10 stones, 4 tags, and 2 demo users.

Run as: ``python -m app.seed`` from the ``backend/`` directory.
Idempotent: safe to re-run; existing rows with the same slug/username are skipped.
"""

from .auth import hash_password
from .db import Base, SessionLocal, engine
from .models import Article, Tag, User


TAGS = [
    {"name": "Quartz family", "slug": "quartz-family"},
    {"name": "With perfume notes", "slug": "with-perfume-notes"},
    {"name": "Heart chakra", "slug": "chakra-heart"},
    {"name": "Protective", "slug": "protective"},
]


STONES = [
    {
        "slug": "rose-quartz",
        "title": "Rose Quartz",
        "tags": ["quartz-family", "with-perfume-notes", "chakra-heart"],
        "content": (
            "Rose quartz is a translucent pink variety of quartz, coloured by trace amounts of "
            "titanium, iron, or manganese. Its hardness on the Mohs scale is 7, the same as all "
            "macrocrystalline quartz, which makes it durable enough for jewellery and decorative "
            "carvings. Major deposits are mined in Brazil, Madagascar, and South Dakota.\n\n"
            "Across cultures rose quartz is regarded as the stone of unconditional love. Ancient "
            "Romans believed it could prevent the souring of relationships, and ancient Egyptians "
            "used rose-quartz facial masks for their reputed beauty-preserving properties. In "
            "modern crystal lore it is associated with the heart chakra, gentle compassion, "
            "self-acceptance, and emotional healing after loss.\n\n"
            "Perfume pairing: rose-forward fragrances. Try Tom Ford Rose Prick for a fresh, "
            "thorny rose, Jo Malone Velvet Rose & Oud for a deeper resinous take, or Frédéric "
            "Malle Une Rose for an unsweetened, almost wine-like rose absolute. The pink "
            "translucency of the stone harmonises beautifully with these soft floral profiles."
        ),
    },
    {
        "slug": "aventurine",
        "title": "Aventurine",
        "tags": ["quartz-family", "with-perfume-notes", "chakra-heart"],
        "content": (
            "Green aventurine is a quartzite — a metamorphic rock dominated by interlocking "
            "quartz grains — coloured by inclusions of fuchsite mica that give it a sparkly, "
            "shimmering look called aventurescence. Most aventurine on the market today comes "
            "from India, Brazil, and Russia. It rates 6.5–7 on the Mohs scale.\n\n"
            "Its name derives from the Italian a ventura, meaning 'by chance', referencing a "
            "type of glass accidentally discovered in 18th-century Murano that mimicked the "
            "stone's sparkle. Aventurine is widely called the 'stone of opportunity' and is a "
            "popular talisman for confidence, prosperity, and emotional balance, with strong "
            "ties to the heart chakra.\n\n"
            "Perfume pairing: green and herbal fragrances reflect aventurine's verdant tone. "
            "Hermès Un Jardin en Méditerranée brings fig leaf and cypress; Penhaligon's "
            "Bayolea is a refreshing citrus-aromatic; Diptyque Philosykos closes the season "
            "with creamy fig wood. All three echo the stone's mossy, garden-fresh personality."
        ),
    },
    {
        "slug": "amethyst",
        "title": "Amethyst",
        "tags": ["quartz-family", "with-perfume-notes"],
        "content": (
            "Amethyst is the purple variety of quartz, coloured by iron impurities and natural "
            "irradiation in the host rock. The hue ranges from pale lilac to a rich, almost "
            "wine-coloured violet; the deepest grades historically came from the Urals and "
            "today come from Uruguay and Brazil. Like all quartz it is 7 on the Mohs scale.\n\n"
            "The name comes from the Greek amethystos, 'not drunken' — ancient Greeks carved "
            "drinking cups from amethyst in the belief it would prevent intoxication. Across "
            "esoteric traditions amethyst is associated with clarity of mind, restful sleep, "
            "and the third-eye and crown chakras. It has been a favourite of bishops, mystics, "
            "and goldsmiths for over two thousand years.\n\n"
            "Perfume pairing: violet, iris, and orris-root fragrances mirror amethyst's "
            "noble purple. Frédéric Malle Iris Poudré is the classic powdery iris; Diptyque "
            "L'Ombre dans l'Eau pairs Bulgarian rose with blackcurrant for a violet-leaf "
            "effect; Guerlain Insolence carries a transparent violet over warm benzoin."
        ),
    },
    {
        "slug": "citrine",
        "title": "Citrine",
        "tags": ["quartz-family", "with-perfume-notes"],
        "content": (
            "Citrine is the yellow-to-orange variety of quartz, coloured by trace iron. "
            "Most commercial citrine is in fact heat-treated amethyst, which deepens the gold "
            "tone — natural unheated citrine is comparatively rare and tends towards a paler, "
            "lemon yellow. Major sources include Brazil, Madagascar, and the Russian Urals. "
            "It is 7 on the Mohs scale.\n\n"
            "Its name derives from the Latin citrus, after the lemon. Often nicknamed the "
            "'merchant's stone', citrine is associated in folklore with abundance, optimism, "
            "and creative drive, and corresponds to the solar-plexus chakra. Roman intaglios "
            "in citrine survive from the 1st century CE, attesting to its long popularity.\n\n"
            "Perfume pairing: citrus and warm-amber fragrances. Jo Malone Lime Basil & "
            "Mandarin sets a sparkling citrus accord; Maison Francis Kurkdjian Grand Soir "
            "wraps amber in benzoin; Atelier Cologne Orange Sanguine adds a juicy blood-"
            "orange brightness. The stone's golden warmth meets these in their middle notes."
        ),
    },
    {
        "slug": "black-tourmaline",
        "title": "Black Tourmaline",
        "tags": ["protective", "with-perfume-notes"],
        "content": (
            "Black tourmaline, also called schorl, is the most common species in the "
            "tourmaline family — a complex boron-silicate group with eleven recognised "
            "varieties. Its iron content gives the deep, almost light-absorbing black hue. "
            "Mohs hardness is 7–7.5. Major sources are Brazil, Pakistan, Afghanistan, and "
            "Madagascar.\n\n"
            "Schorl is one of the oldest gem materials known, named after a German mining "
            "village near a 14th-century deposit. In modern crystal lore it is the archetypal "
            "protective stone — associated with grounding, deflection of negative energy, and "
            "the root chakra. Tourmalines also exhibit pyroelectricity (they develop a charge "
            "under temperature change), a trait used by 18th-century Dutch traders to clean "
            "ash from meerschaum pipes — earning the variety the nickname aschentrekker.\n\n"
            "Perfume pairing: smoky, leather, and incense compositions. Tom Ford Tobacco "
            "Vanille combines pipe-tobacco with rich vanilla; Serge Lutens Chergui delivers "
            "honeyed hay over dry musk; Comme des Garçons Avignon is a pure Catholic-incense "
            "soliflore. All three echo the stone's protective, almost sacred dark warmth."
        ),
    },
    {
        "slug": "lapis-lazuli",
        "title": "Lapis Lazuli",
        "tags": ["with-perfume-notes"],
        "content": (
            "Lapis lazuli is a metamorphic rock, not a single mineral — its deep blue comes "
            "from lazurite, with calcite veining and shimmering pyrite flecks that look like "
            "stars in a night sky. The most prized lapis comes from the Sar-i-Sang mines of "
            "Afghanistan, where it has been mined continuously for over 6 000 years. Mohs "
            "hardness is 5–5.5, soft enough to require gentle handling.\n\n"
            "Lapis adorned the funerary mask of Tutankhamun, was ground into the rare "
            "ultramarine pigment of Renaissance painters, and held a place of honour in "
            "Sumerian and Babylonian seals. In modern crystal lore it is associated with the "
            "throat chakra, truthful self-expression, and inner wisdom.\n\n"
            "Perfume pairing: cool, regal, incense-tinted fragrances. Etro Shaal Nur balances "
            "cardamom and incense over cedar; Guerlain Samsara is a quintessential sandalwood "
            "and jasmine; Comme des Garçons Hinoki evokes a Japanese cypress bath-house. "
            "Each one captures the stone's serene, ceremonial blue."
        ),
    },
    {
        "slug": "moonstone",
        "title": "Moonstone",
        "tags": ["with-perfume-notes"],
        "content": (
            "Moonstone is a variety of orthoclase feldspar that displays adularescence — a "
            "soft, billowing inner glow caused by light scattering between two intergrown "
            "feldspar phases. The classic Sri Lankan moonstone is colourless with a cobalt-"
            "blue sheen; Indian rainbow moonstone (technically a labradorite) shows fiery "
            "spectral flashes. Mohs hardness is 6–6.5.\n\n"
            "Roman naturalists believed moonstone was solidified moonlight, and in Hindu "
            "tradition it was regarded as a sacred stone of the goddess Chandra. Art Nouveau "
            "jewellers like René Lalique used it extensively for its dreamlike inner glow. In "
            "modern lore moonstone is tied to the sacral chakra, intuition, and lunar cycles.\n\n"
            "Perfume pairing: luminous white florals and creamy musks. Annick Goutal Le "
            "Chèvrefeuille is a sun-warmed honeysuckle; Frédéric Malle Carnal Flower is the "
            "definitive narcotic tuberose; Serge Lutens Datura Noir adds vanilla almond to a "
            "cool moonflower heart. The stone's pearly inner light is reflected in their "
            "soft, cool radiance."
        ),
    },
    {
        "slug": "tigers-eye",
        "title": "Tiger's Eye",
        "tags": ["protective", "with-perfume-notes"],
        "content": (
            "Tiger's eye is a chatoyant variety of quartz — silky golden-brown bands that "
            "appear to shift like a cat's-eye when the stone is moved. Its appearance comes "
            "from parallel intergrowths of quartz over fibrous crocidolite (blue asbestos), "
            "later replaced by silica. Most tiger's eye on the market is mined in South "
            "Africa. Mohs hardness is 7.\n\n"
            "Roman soldiers reportedly carried tiger's eye amulets into battle for protection "
            "and clear vision. In modern crystal lore it is tied to the solar-plexus chakra, "
            "courage, focus, and grounded confidence. Heat treatment can deepen the gold to a "
            "rich red, producing the variety known as ox-eye or bull's-eye.\n\n"
            "Perfume pairing: warm, spicy, golden fragrances. Estée Lauder Sensuous wraps "
            "amber in honey and woods; Guerlain Spiritueuse Double Vanille is a brandy-soaked "
            "vanilla; Tom Ford Amber Absolute layers labdanum over incense. Each evokes the "
            "stone's banded golden glow under candlelight."
        ),
    },
    {
        "slug": "selenite",
        "title": "Selenite",
        "tags": ["with-perfume-notes"],
        "content": (
            "Selenite is a translucent crystalline form of gypsum — calcium sulphate "
            "dihydrate — soft enough to scratch with a fingernail (Mohs 2). Massive selenite "
            "shafts up to twelve metres long have been mined from the Cave of the Crystals in "
            "Naica, Mexico. Smaller wand-shaped pieces are common from Morocco.\n\n"
            "Its name comes from the Greek selene, 'moon', referring to the soft, lunar glow "
            "of polished pieces. Because it dissolves in water, selenite must be cleaned "
            "with a dry cloth. In crystal lore it is tied to the crown chakra, meditative "
            "clarity, and the cleansing of other stones — practitioners often place stones on "
            "a selenite slab to 'reset' them.\n\n"
            "Perfume pairing: clean, transparent musks and white woods. Glossier You is a "
            "skin-warmed musk that smells like fresh laundry; Le Labo Santal 33 sets cardamom "
            "and leather over creamy sandalwood; Maison Margiela Replica Lazy Sunday Morning "
            "captures clean cotton in the air. All three carry selenite's airy, lunar quality."
        ),
    },
    {
        "slug": "carnelian",
        "title": "Carnelian",
        "tags": ["with-perfume-notes"],
        "content": (
            "Carnelian is a translucent orange-red variety of chalcedony, a microcrystalline "
            "quartz. The colour comes from finely dispersed iron oxide; intense red carnelian "
            "is sometimes heat-treated from paler material. India is the largest modern "
            "producer; historic sources include Egypt and the Indus Valley. Mohs hardness "
            "is 7.\n\n"
            "Carnelian has been carved into seals and signet rings since the third "
            "millennium BCE — its slight oiliness made it an ideal material for impressing "
            "wax. Roman engravers, Mughal jewellers, and Tibetan dzi-bead makers all prized "
            "it. In modern crystal lore it is tied to the sacral chakra, vitality, creative "
            "drive, and renewed motivation.\n\n"
            "Perfume pairing: amber, spice, and incense compositions echo carnelian's warm "
            "glow. Yves Saint Laurent Opium is the archetypal oriental — clove, myrrh, and "
            "mandarin; Diptyque Volutes plays sweet tobacco against iris; Serge Lutens Five "
            "O'Clock au Gingembre lifts ginger over honey and tea. All three feel like "
            "lit fireplaces in the cooler months."
        ),
    },
]


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # --- demo users ---------------------------------------------------
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            admin = User(
                username="admin",
                password_hash=hash_password("admin123"),
                role="admin",
            )
            db.add(admin)
        regular = db.query(User).filter(User.username == "regular").first()
        if not regular:
            regular = User(
                username="regular",
                password_hash=hash_password("regular123"),
                role="regular",
            )
            db.add(regular)
        db.flush()

        # --- tags ---------------------------------------------------------
        tag_by_slug = {}
        for tag_payload in TAGS:
            tag = db.query(Tag).filter(Tag.slug == tag_payload["slug"]).first()
            if not tag:
                tag = Tag(name=tag_payload["name"], slug=tag_payload["slug"])
                db.add(tag)
                db.flush()
            tag_by_slug[tag.slug] = tag

        # --- 10 stones ----------------------------------------------------
        new_articles = 0
        for stone in STONES:
            existing = db.query(Article).filter(Article.slug == stone["slug"]).first()
            if existing:
                continue
            article = Article(
                slug=stone["slug"],
                title=stone["title"],
                content=stone["content"],
                author_id=admin.id,
                tags=[tag_by_slug[s] for s in stone["tags"] if s in tag_by_slug],
            )
            db.add(article)
            new_articles += 1

        db.commit()
        total_articles = db.query(Article).count()
        total_tags = db.query(Tag).count()
        total_users = db.query(User).count()
        print(
            f"Seed complete. Users: {total_users}, tags: {total_tags}, "
            f"articles: {total_articles} (new this run: {new_articles})."
        )
    finally:
        db.close()


if __name__ == "__main__":
    seed()
