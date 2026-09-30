import { prisma } from '../lib/prisma';

// the actual "expensive-ish" work - summarizes yesterday's activity for a workspace.
// this is deliberately simple (just a console.log "email") since the point of the
// assignment is proving the queue mechanics work, not building an email pipeline.
export async function generateDigest(workspaceId: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const recentActivity = await prisma.activityLog.findMany({
    where: { workspaceId, createdAt: { gte: since } },
    include: { actor: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const summary = `Workspace ${workspaceId}: ${recentActivity.length} activity events in the last 24h`;
  console.log('[digest]', summary);

  return { workspaceId, eventCount: recentActivity.length };
}
