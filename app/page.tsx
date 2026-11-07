import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const supabase = createClient();
  const { data: listings } = await supabase
    .from('listings')
    .select('id, title, image_url, type, price_usd, current_bid_usd, profiles(username)')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  return (
    <div>
      <h1>Sports cards, live</h1>
      {!listings?.length && <p className="muted">No listings yet. Be the first to sell something.</p>}
      <div className="grid">
        {listings?.map((l: any) => (
          <Link key={l.id} href={`/listings/${l.id}`} className="card">
            <div className="img" style={l.image_url ? { backgroundImage: `url(${l.image_url})` } : undefined} />
            <div className="body">
              <div>{l.title}</div>
              <div className="muted">@{l.profiles?.username}</div>
              <div style={{ marginTop: 8 }}>
                <span className="badge">{l.type === 'auction' ? 'Auction' : 'Buy now'}</span>{' '}
                <strong>${Number(l.type === 'auction' ? l.current_bid_usd ?? l.price_usd : l.price_usd).toFixed(2)}</strong>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
