-- AtomImage.tag becomes the catalog default; each Atom stores the tag it pulls.
ALTER TABLE "AtomImage" RENAME COLUMN "tag" TO "defaultTag";

ALTER TABLE "Atom" ADD COLUMN "tag" TEXT;

UPDATE "Atom" AS a
SET "tag" = i."defaultTag"
FROM "AtomImage" AS i
WHERE a."imageId" = i."id";

ALTER TABLE "Atom" ALTER COLUMN "tag" SET NOT NULL;
