import './globals.css';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'LiveCards', description: 'Live sports card auctions and sales in Lebanon' };

async function signOut() {
  'use server';
  await createClient().auth.signOut();
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { data } = await createClient().auth.getUser();
  return (
    <html lang="en">
      <body>
        <nav>
          <Link href="/" className="brand">LiveCards</Link>
          <div className="links">
            {data.user ? (
              <>
                <Link href="/sell/new">Sell</Link>
                <form action={signOut}><button type="submit">Log out</button></form>
              </>
            ) : (
              <Link href="/login" className="btn">Log in</Link>
            )}
          </div>
        </nav>
        <div className="container">{children}</div>
      </body>
    </html>
  );
}
