import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return <DashboardLayout userName={session.user?.name || ''}>{children}</DashboardLayout>;
}
