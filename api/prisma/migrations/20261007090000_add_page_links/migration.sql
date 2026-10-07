-- Links a content editor attaches to public guide pages (Admin → Page links).
CREATE TABLE IF NOT EXISTS "page_links" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "anchor" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "rel" TEXT NOT NULL DEFAULT 'nofollow',
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "page_links_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "page_links_path_active_position_idx" ON "page_links"("path", "active", "position");

DO $$ BEGIN
  ALTER TABLE "page_links" ADD CONSTRAINT "page_links_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
