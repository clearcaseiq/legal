-- AlterTable
ALTER TABLE "ads_conversion_uploads" ADD COLUMN     "clickIdType" TEXT NOT NULL DEFAULT 'gclid';

-- AlterTable
ALTER TABLE "ads_qualified_conversion_uploads" ADD COLUMN     "clickIdType" TEXT NOT NULL DEFAULT 'gclid';

-- AlterTable
ALTER TABLE "ads_submitted_conversion_uploads" ADD COLUMN     "clickIdType" TEXT NOT NULL DEFAULT 'gclid';
