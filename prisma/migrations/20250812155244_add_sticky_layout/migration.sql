-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Note" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL DEFAULT 'Untitled',
    "content" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT '#FFF6A5',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "x" INTEGER NOT NULL DEFAULT 40,
    "y" INTEGER NOT NULL DEFAULT 40,
    "width" INTEGER NOT NULL DEFAULT 260,
    "height" INTEGER NOT NULL DEFAULT 180,
    "zIndex" INTEGER NOT NULL DEFAULT 1,
    "taskId" INTEGER,
    "subtaskId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Note_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Note_subtaskId_fkey" FOREIGN KEY ("subtaskId") REFERENCES "Subtask" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Note" ("color", "content", "createdAt", "id", "isPinned", "subtaskId", "taskId", "title", "updatedAt") SELECT "color", "content", "createdAt", "id", "isPinned", "subtaskId", "taskId", "title", "updatedAt" FROM "Note";
DROP TABLE "Note";
ALTER TABLE "new_Note" RENAME TO "Note";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
