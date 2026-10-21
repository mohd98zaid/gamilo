import React from 'react';
import { redirect } from 'next/navigation';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { getCurrentUser, isTestEnvironment } from '@/lib/auth';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isTestEnvironment()) {
    const user = await getCurrentUser();
    if (!user) redirect('/login');
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
