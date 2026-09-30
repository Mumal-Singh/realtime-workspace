import { prisma } from '../src/lib/prisma';

// wipe tables between test files - order matters because of foreign keys
export async function resetDb() {
  await prisma.activityLog.deleteMany();
  await prisma.task.deleteMany();
  await prisma.list.deleteMany();
  await prisma.board.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();
}
