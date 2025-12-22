-- CreateTable
CREATE TABLE "menu_posts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "publishedAt" DATETIME NOT NULL,
    "crawledAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "delivery_histories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "delivery_histories_postId_fkey" FOREIGN KEY ("postId") REFERENCES "menu_posts" ("postId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "menu_posts_postId_key" ON "menu_posts"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_histories_postId_channel_key" ON "delivery_histories"("postId", "channel");
