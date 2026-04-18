import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import LandingPage from './_components/landing-page';
import { authOptions } from '@/lib/auth-options';

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    redirect('/dashboard');
  }

  return <LandingPage />;
}
