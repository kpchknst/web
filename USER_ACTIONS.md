# Lab 4 — manual actions you need to do

> **Audience:** you (Anastasia), reading this in a fresh Claude Code session
> after the autonomous Lab 4 build finished.
> **Branch:** `lab4` (off `development`, **not yet pushed** to `origin`).
> **Last commit:** `62f487e` (MSW scaffolding) plus the post-impl report
> metrics fill-in (uncommitted as of writing).

This file lists every step the autonomous session **could not finish on its
own** — either because it requires interactive smoke testing in a browser,
because it touches a service the session has no permission to modify, or
because it involves secrets that must never enter chat.

If you ask Claude to continue Lab 4 in a new session, say:
*"Read `web/USER_ACTIONS.md` and walk me through the remaining items in
order. I'll do each step on my machine and tell you when it's done."*

---

## 1. Verify the lab4 branch is sane

```bash
cd ~/uni/2_kurs/ВТіВД/web
git checkout lab4
git status                    # working tree clean (or just the report metrics edit)
git log --oneline development..lab4 | wc -l   # ≥ 21 commits
gh auth status                # Active account: kpchknst
```

If `gh auth status` shows `a-kupchak` as active, **STOP and switch back**
to `kpchknst` before any push.

---

## 2. Stage + commit the report metrics fill-in

```bash
git status        # should show docs/lab4-report.md as modified
git add docs/lab4-report.md
git commit -m "lab4: fill report metrics (lint silent, bundle 99.64 KB gzip, 50/50 tests)"
```

(If you don't see this file as modified, the autonomous session already
committed it — skip this step.)

---

## 3. Run the manual smoke (8-step Variant-5 demo)

This is graded — the teacher walks through it on their machine. Do it on
yours first, capture screenshots, paste them into `docs/lab4-report.md`
under §5 (Demo flow).

### 3.1 Boot both servers

```bash
# Terminal A — backend on :8002 (Docker holds 8001 on your Mac)
cd backend && source .venv/bin/activate
CORS_ORIGINS="http://localhost:5173,http://localhost:8000" \
    uvicorn app.main:app --reload --port 8002

# Terminal B — Vite dev server (proxies /api/* to :8002 if VITE_API_TARGET set)
cd frontend
echo 'VITE_API_TARGET=http://localhost:8002' > .env.local   # one-time
npm run dev
# → http://localhost:5173
```

### 3.2 The 8-step run (capture screenshots as you go)

1. **Open `/`** → search "quartz" → grid filters live to quartz-family
   stones. Click a tag chip → grid filters to that tag.
2. **Login `regular` / `regular123`** → click into Rose Quartz → click
   **Propose edit** → tweak a sentence → submit. `/profile` should show
   the proposal as *pending*.
3. **Logout, login `admin` / `admin123`** → top-nav **Moderation** → the
   queue lists the proposal at the top.
4. **Click the proposal** → side-by-side diff renders → click **Approve**.
5. **`/articles/rose-quartz`** should now show **v2** (or higher); the
   meta line and content reflect the change.
6. **`/articles/rose-quartz/history`** should list the approved edit with
   the diff between v1 and v2.
7. **Race**: as a *second* regular user, propose another edit; logout,
   login as the *first* regular, propose a third; admin approves the
   *second-oldest* → the third one shows the **stale** badge.
8. **Cover upload**: as admin, on `/articles/new`, drag a small JPG into
   the cover-image drop zone → preview appears → fill title/slug/content
   → submit → homepage card uses the uploaded image.
9. (Bonus) **Tag admin**: `/tags` → add a tag → attach it to an article in
   `/articles/<slug>/edit` → see the chip appear on the homepage filter.

### 3.3 Two browsers

Repeat the smoke in Firefox (the Lab 1 / Lab 2 / Lab 3 cross-browser
discipline carries forward; spec wants no console errors in either).

### 3.4 Update the report

After smoking, paste screenshots into a new directory
`frontend/pages/assets/lab4/` and reference them from
`docs/lab4-report.md` §5. Then commit:

```bash
git add docs/lab4-report.md frontend/pages/assets/lab4/
git commit -m "lab4: report — smoke screenshots + two-browser confirmation"
```

---

## 4. Supabase Storage bucket — create it manually

The autonomous session **could not** create the bucket: the Supabase MCP
returned `permission denied` on both `apply_migration` and `execute_sql`
against the `storage` schema.

**Option A (simplest — required for the live demo on Render/Vercel):**
Create the bucket via the Supabase dashboard.

1. Open <https://supabase.com/dashboard/project/paxnpiuvpkcnemchvtvy/storage/buckets>.
2. Click **New bucket**.
3. Name: `article-covers`. **Public** = ON.
4. Click **Create**.
5. Storage → Policies (top-right of the new bucket) → ensure a SELECT
   policy exists allowing `bucket_id = 'article-covers'` (the public
   toggle usually creates this; if not, add it manually).

**Option B (skip, if you only ever demo locally):**
The backend has a local-fs fallback. When `SUPABASE_SERVICE_KEY` is empty
or `USE_SQLITE=1`, uploads land in `backend/uploads/` and are served
under `/uploads/*`. The graded Lab 4 demo (which the teacher runs locally)
works fine without the bucket.

---

## 5. Add the Supabase service-role key to your local `.env`

**Skip if you chose Option B above.**

⚠️ **NEVER paste this key into chat or commit it.** It's a sensitive
credential.

1. Open <https://supabase.com/dashboard/project/paxnpiuvpkcnemchvtvy/settings/api>.
2. Copy the **service_role** key (the one labelled "secret" — NOT
   `anon` or `publishable`).
3. Open `backend/.env` in your editor and append:
   ```
   SUPABASE_SERVICE_KEY=<paste here>
   SUPABASE_STORAGE_BUCKET=article-covers
   ```
4. Save. Restart `uvicorn`. Test the upload from `/articles/new`.

---

## 6. Add the same key to Render (for the live deploy)

Only needed if you want **`https://stones-and-scents.vercel.app`** to
support cover uploads against Supabase Storage in production. Skip if you
only care about local demos.

1. Open <https://dashboard.render.com> → Web service `stones-and-scents`.
2. Environment → Add Environment Variable.
3. Key: `SUPABASE_SERVICE_KEY`, Value: paste the service-role key.
4. Add another: `SUPABASE_STORAGE_BUCKET=article-covers`.
5. Save. Render auto-redeploys.

---

## 7. Push lab4 + open PRs

After the smoke + screenshots are in:

```bash
gh auth status                    # confirm kpchknst
git push -u origin lab4

# PR 1: lab4 → development
gh pr create --base development --title "Lab 4 — Variant-5 functionality" \
    --body-file docs/plans/2026-05-11-lab4-variant5-functionality-plan.md
# Open in browser, review, then "Create a merge commit" (NOT squash).

# After PR 1 merges:
git checkout development && git pull --ff-only origin development

# PR 2: development → main
gh pr create --base main --title "Promote: Lab 4 → main" \
    --body "Merge Lab 4 (Variant-5 functionality) from development."
# Merge commit again. NOT squash.
```

`lab4` branch stays alive on origin (never delete).

(Optional — only if you want a Lab 4 GitHub Pages preview):

```bash
gh api -X POST \
    repos/kpchknst/web/environments/github-pages/deployment-branch-policies \
    -f name=lab4 -f type=branch
```

---

## 8. Ask Claude to update memory

After the merge, in a fresh Claude session:

> *"Lab 4 is merged. Please update `~/.claude/projects/.../memory/project_webdev_labs.md`:*
> *(a) bump the `main` SHA in Section 0,*
> *(b) flip the Lab 4 row in Section 3 to ✅ ✅ ✅ ✅,*
> *(c) add `lab4` to the preserved-branches list,*
> *(d) append the new PR numbers to the closed-PRs paragraph,*
> *(e) note the cover-image bucket creation status (done / skipped) in the per-lab tracker."*

This keeps future sessions in sync with the new state.

---

## 9. (Optional) MSW dev mode sanity check

The Phase 5 MSW scaffolding is wired but disabled by default. To smoke it
without running the backend:

```bash
cd frontend
VITE_USE_MSW=1 npm run dev
# → open http://localhost:5173 — homepage shows 3 mocked articles
```

Stop the server when done. The prod build excludes MSW (verified by
treeshake grep during Phase 5). Lab 5 will use this scaffolding for
Vitest tests.

---

## What's blocked / skipped (and why)

| Item | Why I couldn't do it | Severity |
|---|---|---|
| Create `article-covers` Supabase Storage bucket | Supabase MCP returned `permission denied` on `storage` schema | Low — local-fs fallback works for graded demo |
| Set `SUPABASE_SERVICE_KEY` in `backend/.env` | Hard Rule 2: never paste secrets in chat | Low — fallback works without it |
| Set `SUPABASE_SERVICE_KEY` in Render | No Render API credentials in this session | Low — only needed for live cover-upload on Vercel/Render |
| Click-through 8-step Variant-5 manual smoke + screenshots | Multi-user race + admin actions — too many steps to automate reliably from this session | High — graded; you must do it before the PR |
| Push `lab4` to origin and open PRs | The instruction was "build the lab"; pushing is a deliberate, irreversible step that should be your call once the smoke is green | Medium — required to ship |
| Update memory after merge | Memory updates should reflect actual merged state, not pre-merge intent | Low — just ask Claude after the merge |

---

That's all. Steps 3 (smoke) and 7 (PR) are the two that actually gate
shipping; everything else is polish.
