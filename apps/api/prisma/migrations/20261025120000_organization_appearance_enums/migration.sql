CREATE TYPE "OrganizationIcon" AS ENUM (
  'flag', 'zap', 'rocket', 'flask', 'target', 'layers', 'code', 'building', 'bell', 'book',
  'briefcase', 'cloud', 'compass', 'database', 'flame', 'globe', 'heart', 'key', 'lightbulb',
  'lock', 'message', 'package', 'puzzle', 'shield', 'users', 'wrench', 'workflow', 'coffee'
);

CREATE TYPE "OrganizationColor" AS ENUM (
  'teal', 'blue', 'indigo', 'violet', 'rose', 'orange', 'amber', 'slate'
);

ALTER TABLE "Organization"
  ALTER COLUMN "icon" DROP DEFAULT,
  ALTER COLUMN "color" DROP DEFAULT;

ALTER TABLE "Organization"
  ALTER COLUMN "icon" TYPE "OrganizationIcon" USING "icon"::"OrganizationIcon",
  ALTER COLUMN "color" TYPE "OrganizationColor" USING "color"::"OrganizationColor";

ALTER TABLE "Organization"
  ALTER COLUMN "icon" SET DEFAULT 'flag',
  ALTER COLUMN "color" SET DEFAULT 'teal';
