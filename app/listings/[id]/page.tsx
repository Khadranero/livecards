import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function placeBid(formData: FormData) {
  'use server';
  const id = String(formData.get('id'));
  const { error } = await createClient().rpc('place_bid', {
    p_listing: id,
    p_amount: Number(formData.get('amount')),
  });
  if (error) redirect(`/listings/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/listings/${id}`);
}

async function placeOrder(formData: FormData) {
  'use server';
  const id = String(formData.get('id'));
  const { error } = await createClient().rpc('place_order', {
    p_listing: id,
    p_full_name: String(formData.get('full_name')),
    p_phone: String(formData.get('phone')),
    p_city: String(formData.get('city')),
    p_address: String(formData.get('address')),
  });
  if (error) redirect(`/listings/${id}?error=${encodeURIComponent(error.message)}`);
  redirect(`/listings/${id}?ordered=1`);
}

export default async function ListingPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string; ordered?: string };
}) {
  const supabase = createClient();
  const { data: l } = await supabase
    .from('listings')
    .select('*, profiles(username)')
    .eq('id', params.id)
    .single();
  if (!l) notFound();

  const { data: auth } = await supabase.auth.getUser();
  const isAuction = l.type === 'auction';
  const open = l.status === 'active' && (!isAuction || !l.ends_at || new Date(l.ends_at) > new Date());
  const current = Number(l.current_bid_usd ?? l.price_usd);

  return (
    <div className="two">
      <div className="card">
        <div className="img" style={l.image_url ? { backgroundImage: `url(${l.image_url})` } : undefined} />
      </div>
      <div>
        <h1>{l.title}</h1>
        <p className="muted">Sold by @{l.profiles?.username}</p>
        <p>{l.description}</p>
        <h2>
          ${current.toFixed(2)}{' '}
          <span className="badge">{isAuction ? (l.current_bid_usd ? 'Current bid' : 'Starting price') : 'Buy now'}</span>
        </h2>
        {isAuction && l.ends_at && <p className="muted">Ends {new Date(l.ends_at).toLocaleString()}</p>}

        {searchParams.error && <p className="error">{searchParams.error}</p>}
        {searchParams.ordered && <p>Order placed. The seller will contact you to arrange cash on delivery.</p>}

        {!open && !searchParams.ordered && <p className="muted">This listing is no longer available.</p>}

        {open && !auth.user && <a className="btn" href="/login">Log in to {isAuction ? 'bid' : 'buy'}</a>}

        {open && auth.user && isAuction && (
          <form className="stack" action={placeBid}>
            <input type="hidden" name="id" value={l.id} />
            <input name="amount" type="number" step="0.01" min={(current + 0.01).toFixed(2)} placeholder="Your bid in USD" required />
            <button type="submit">Place bid</button>
          </form>
        )}

        {open && auth.user && !isAuction && (
          <form className="stack" action={placeOrder}>
            <input type="hidden" name="id" value={l.id} />
            <strong>Cash on delivery</strong>
            <input name="full_name" placeholder="Full name" required />
            <input name="phone" placeholder="Phone number" required />
            <input name="city" placeholder="City" required />
            <textarea name="address" placeholder="Delivery address" rows={3} required />
            <button type="submit">Place order</button>
          </form>
        )}
      </div>
    </div>
  );
}
