-- Authorization and first activation are separate events.
ALTER TABLE "DataSource" ADD COLUMN "activatedAt" DATETIME;
