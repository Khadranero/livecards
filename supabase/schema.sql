-- LiveCards schema. Run this once in the Supabase SQL editor.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  phone text,
  city text,
  avatar_url text,
  bio text,
  is_seller boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.streams (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  scheduled_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','live','ended')),
  created_at timestamptz not null default now()
);

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  stream_id uuid references public.streams(id) on delete set null,
  title text not null,
  description text,
  image_url text,
  type text not null check (type in ('fixed','auction')),
  price_usd numeric(10,2) not null check (price_usd > 0), -- fixed price, or auction starting price
  current_bid_usd numeric(10,2),
  ends_at timestamptz, -- auctions only
  status text not null default 'active' check (status in ('active','sold','ended')),
  created_at timestamptz not null default now()
);

create table public.bids (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  bidder_id uuid not null references public.profiles(id) on delete cascade,
  amount_usd numeric(10,2) not null,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id),
  buyer_id uuid not null references public.profiles(id),
  seller_id uuid not null references public.profiles(id),
  amount_usd numeric(10,2) not null,
  payment_method text not null default 'cod' check (payment_method in ('cod','wish')),
  status text not null default 'pending' check (status in ('pending','confirmed','shipped','delivered','cancelled')),
  full_name text not null,
  phone text not null,
  city text not null,
  address text not null,
  created_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  stream_id uuid not null references public.streams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

-- Create a profile automatically when someone signs up.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(split_part(new.email, '@', 1), 'user') || '_' || substr(new.id::text, 1, 4));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row level security
alter table public.profiles enable row level security;
alter table public.streams  enable row level security;
alter table public.listings enable row level security;
alter table public.bids     enable row level security;
alter table public.orders   enable row level security;
alter table public.messages enable row level security;

create policy "profiles readable" on public.profiles for select using (true);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

create policy "streams readable" on public.streams for select using (true);
create policy "seller manages streams" on public.streams for all
  using (auth.uid() = seller_id) with check (auth.uid() = seller_id);

create policy "listings readable" on public.listings for select using (true);
create policy "seller manages listings" on public.listings for all
  using (auth.uid() = seller_id) with check (auth.uid() = seller_id);

create policy "bids readable" on public.bids for select using (true);

create policy "buyer or seller sees order" on public.orders for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);
create policy "seller updates order status" on public.orders for update
  using (auth.uid() = seller_id);

create policy "chat readable" on public.messages for select using (true);
create policy "logged in users chat" on public.messages for insert
  with check (auth.uid() = user_id);

-- Atomic bid: must beat the current bid (or the starting price) and the auction must be open.
create or replace function public.place_bid(p_listing uuid, p_amount numeric) returns void
language plpgsql security definer set search_path = public as $$
declare l public.listings;
begin
  if auth.uid() is null then raise exception 'Login required'; end if;
  select * into l from public.listings where id = p_listing for update;
  if l.id is null or l.type <> 'auction' or l.status <> 'active'
     or (l.ends_at is not null and l.ends_at < now()) then
    raise exception 'Auction is not open';
  end if;
  if l.seller_id = auth.uid() then raise exception 'You cannot bid on your own item'; end if;
  if p_amount <= coalesce(l.current_bid_usd, l.price_usd - 0.01) then
    raise exception 'Bid must be higher than the current bid';
  end if;
  insert into public.bids (listing_id, bidder_id, amount_usd) values (p_listing, auth.uid(), p_amount);
  update public.listings set current_bid_usd = p_amount where id = p_listing;
end $$;

-- Atomic cash-on-delivery order for a fixed-price listing.
create or replace function public.place_order(
  p_listing uuid, p_full_name text, p_phone text, p_city text, p_address text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare l public.listings; new_id uuid;
begin
  if auth.uid() is null then raise exception 'Login required'; end if;
  select * into l from public.listings where id = p_listing for update;
  if l.id is null or l.type <> 'fixed' or l.status <> 'active' then
    raise exception 'Item is no longer available';
  end if;
  if l.seller_id = auth.uid() then raise exception 'You cannot buy your own item'; end if;
  insert into public.orders (listing_id, buyer_id, seller_id, amount_usd, full_name, phone, city, address)
  values (p_listing, auth.uid(), l.seller_id, l.price_usd, p_full_name, p_phone, p_city, p_address)
  returning id into new_id;
  update public.listings set status = 'sold' where id = p_listing;
  return new_id;
end $$;
