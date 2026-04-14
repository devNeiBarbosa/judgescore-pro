// DEPRECATED: Login is handled by NextAuth via /api/auth/[...nextauth]
// This route has been intentionally emptied.
// Use signIn('credentials', { email, password }) from next-auth/react.

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Use /api/auth/signin para autenticação' },
    { status: 410 }
  );
}
