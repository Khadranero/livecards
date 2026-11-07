import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function createListing(formData: FormData) {
  'use server';
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');

  // Anyone logged in can sell for now; add seller approval later.
  await supabase.from('profiles').update({ is_seller: true }).eq('id', auth.user.id);

  const type = String(formData.get('type')) === 'auction' ? 'auction' : 'fixed';
  const hours = Number(formData.get('hours') || 24);
  const { data, error } = await supabase
    .from('listings')
    .insert({
      seller_id: auth.user.id,
      title: String(formData.get('title')),
      description: String(formData.get('description') || ''),
      image_url: String(formData.get('image_url') || '') || null,
      type,
      price_usd: Number(formData.get('price')),
      ends_at: type === 'auction' ? new Date(Date.now() + hours * 3600 * 1000).toISOString() : null,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  redirect(`/listings/${data.id}`);
}

export default async function NewListing() {
  const { data } = await createClient().auth.getUser();
  if (!data.user) redirect('/login');
  return (
    <div>
      <h1>New listing</h1>
      <form className="stack" action={createListing}>
        <input name="title" placeholder="Title (e.g. 2023 Prizm Victor Wembanyama RC)" required />
        <textarea name="description" placeholder="Condition, grade, details" rows={4} />
        <input name="image_url" placeholder="Image URL (photo upload coming next)" />
        <select name="type" defaultValue="fixed">
          <option value="fixed">Fixed price (buy now)</option>
          <option value="auction">Auction</option>
        </select>
        <input name="price" type="number" step="0.01" min="0.01" placeholder="Price in USD (starting price for auctions)" required />
        <input name="hours" type="number" min="1" defaultValue={24} placeholder="Auction length in hours (auctions only)" />
        <button type="submit">Publish</button>
      </form>
    </div>
  );
}
