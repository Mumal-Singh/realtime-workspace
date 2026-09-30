/*
  Warnings:

  - A unique constraint covering the columns `[id,workspaceId]` on the table `Board` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,workspaceId]` on the table `List` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `workspaceId` to the `List` table without a default value. This is not possible if the table is not empty.
  - Added the required column `workspaceId` to the `Task` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "List" DROP CONSTRAINT "List_boardId_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_listId_fkey";

-- AlterTable
ALTER TABLE "List" ADD COLUMN     "workspaceId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "label" TEXT,
ADD COLUMN     "workspaceId" TEXT NOT NULL,
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "Board_id_workspaceId_key" ON "Board"("id", "workspaceId");

-- CreateIndex
CREATE INDEX "List_workspaceId_idx" ON "List"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "List_id_workspaceId_key" ON "List"("id", "workspaceId");

-- CreateIndex
CREATE INDEX "Task_workspaceId_status_idx" ON "Task"("workspaceId", "status");

-- AddForeignKey
ALTER TABLE "List" ADD CONSTRAINT "List_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "List" ADD CONSTRAINT "List_boardId_workspaceId_fkey" FOREIGN KEY ("boardId", "workspaceId") REFERENCES "Board"("id", "workspaceId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_listId_workspaceId_fkey" FOREIGN KEY ("listId", "workspaceId") REFERENCES "List"("id", "workspaceId") ON DELETE CASCADE ON UPDATE CASCADE;
