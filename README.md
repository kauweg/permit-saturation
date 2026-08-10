# Permit Saturation Tracker — Starter

This starter gives you:

- Next.js dashboard
- Supabase/Postgres schema
- Seattle Open Data ingestion
- Permit stage normalization
- New-residential classification
- Active unit/project totals
- Map of active permits
- Saturation rollup by neighborhood/ZIP/city
- Daily GitHub Action sync
- Placeholders/architecture for Bellevue, Kirkland and Redmond

## 1. Create Supabase project

Create a Supabase project. Open SQL Editor, create a new query, paste `supabase/schema.sql`, and run it.

Then copy:
- Project URL
- Secret key

Keep the Secret key private; never commit it to GitHub.

## 2. Put the project in GitHub

Create a new private GitHub repository named `permit-saturation`.

Upload all files in this starter project to the repository root.

## 3. Add GitHub Actions secrets

In the repo:

Settings → Secrets and variables → Actions → New repository secret

Add:
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`

## 4. Run the Seattle import

GitHub repo → Actions → `Sync permit data` → Run workflow.

When it finishes, go to Supabase → Table Editor → permits.

You should see Seattle permit rows.

IMPORTANT: classification is intentionally conservative and should be validated against a sample of permits before using it for underwriting decisions.

## 5. Deploy the dashboard

Create a Render Web Service connected to this GitHub repo.

Use:
- Environment: Node
- Build command: `npm install && npm run build`
- Start command: `npm run start`

Add environment variables:
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`

Deploy.

## 6. Verify the dashboard

The first version should show:
- Active units
- Issued/construction units
- Pre-issue units
- Active projects
- Permit map
- Saturation by ZIP/neighborhood
- Newest active projects

## 7. Validate Seattle classification

In Supabase, inspect a sample of rows where `is_new_residential = true`.

We want to confirm:
- true new residential
- unit count
- address
- stage
- coordinates

Once validated, refine the classifier before adding Bellevue.

## 8. Next adapters

Add:
- `scripts/sync-bellevue.mjs`
- `scripts/sync-kirkland.mjs`
- `scripts/sync-redmond.mjs`

All four should write into the same `permits` table.

## 9. Later saturation model

V1 = active units and permit momentum.

V2 should add:
- 6-month application growth
- issued-but-not-finaled units
- permit age/backlog
- historic completions
- market absorption
- Blueprint exposure

That allows a real saturation score rather than just a raw permit count.
