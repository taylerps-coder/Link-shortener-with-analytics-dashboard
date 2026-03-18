import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db, links, workspaceMembers } from '@linksnap/db';
import { eq, desc } from 'drizzle-orm';
import DashboardClient from './DashboardClient';

async function getOrCreateWorkspace(userId: string) {
  // Get the user's primary workspace
  const membership = await db.select()
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId))
    .limit(1);

  if (membership.length === 0) return null;
  return membership[0];
}

export default async function DashboardPage() {
  const { userId } = auth();
  if (!userId) redirect('/sign-in');

  const membership = await getOrCreateWorkspace(userId);
  if (!membership) {
    // First time login — redirect to onboarding
    redirect('/onboarding');
  }

  const workspaceId = membership.workspaceId;

  const recentLinks = await db.select()
    .from(links)
    .where(eq(links.workspaceId, workspaceId))
    .orderBy(desc(links.createdAt))
    .limit(20);

  return (
    <DashboardClient
      workspaceId={workspaceId}
      initialLinks={recentLinks}
      userId={userId}
    />
  );
}
