# Supabase setup (one-time)

This wires the tracker to a hosted Postgres database so your data syncs across
every browser you log in from. The app stays a static site on GitHub Pages — the
browser talks to Supabase directly, protected by Row Level Security.

Do all of this in the Supabase dashboard. **You never need to send anyone the
service_role key or the database password.** Keep those private.

## 1. Create the project
- Go to https://supabase.com → **New project**.
- Pick a region close to you.
- Set a database password and save it in your password manager. (You won't paste
  it into the app or share it.)

## 2. Create the tables
- Dashboard → **SQL Editor** → **New query**.
- Paste the entire contents of [`schema.sql`](./schema.sql) and click **Run**.
- You should see "Success. No rows returned."

## 3. Create your user account
- Dashboard → **Authentication** → **Users** → **Add user** → **Create new user**.
- Email: `abdallahm785@gmail.com`, choose a password, and tick **Auto Confirm User**.

## 4. Lock it to just you
- Dashboard → **Authentication** → **Sign In / Providers** → **Email**.
- Turn **off** "Allow new users to sign up" so no one else can register.

## 5. Grab the two public values
- Dashboard → **Project Settings** → **API Keys**.
- Copy the **Project URL** and the **publishable** key (`sb_publishable_...`).
  (This is Supabase's newer name for the old "anon" key — the public client key.
  It's safe to expose: it ships in the browser bundle and is useless without a
  login + RLS.)

## 6. Put them in a local env file
Fill in the `.env.local` file in the project root (it's gitignored):

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

That's it — **you fill this file, I don't need the values.** The code reads them
from the environment at build time.

> Never put the **secret** key (`sb_secret_...`) or the database password in this
> file or anywhere in the app. They bypass all security.

## 7. Tell me it's done
Once `.env.local` exists and the SQL has run, say so and I'll wire up:
- the Supabase client + real email/password login (replacing the placeholder gate),
- reading/writing your sessions, metrics, check-ins and phases to Supabase,
- a one-time **"Import my existing data"** button so nothing in your current
  browser is lost.

## For the deployed site (later)
The GitHub Pages build needs the same two values. We'll add them as repository
**Variables** (Settings → Secrets and variables → Actions → Variables):
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, then reference them
in the build step of `.github/workflows/deploy.yml`. I'll handle that wiring.
