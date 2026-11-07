# LiveCards

Live sports card selling for Lebanon. Next.js + Supabase. Payments: cash on delivery now, Wish later.

## Status

Built so far: accounts, listings (fixed price and auction), bidding, cash-on-delivery orders.
Not built yet: photo upload, seller profiles page, scheduled streams, live video, live chat, seller order dashboard, Wish.

## Setup

1. Create a free project at supabase.com.
2. In the Supabase SQL editor, paste and run `supabase/schema.sql`.
3. Copy `.env.example` to `.env.local` and fill in the project URL and anon key (Project Settings, API).
4. `npm install` then `npm run dev`, open http://localhost:3000.
5. To deploy: import this GitHub repo into Vercel and add the same two environment variables.

In Supabase, Authentication, Providers, Email: turn off "Confirm email" while testing so signups log in immediately.
