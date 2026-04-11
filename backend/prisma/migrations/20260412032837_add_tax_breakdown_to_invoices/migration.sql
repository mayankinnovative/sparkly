-- AlterTable
ALTER TABLE "invoices" ADD COLUMN "tax_type" VARCHAR(10) NOT NULL DEFAULT 'GST_QST';
ALTER TABLE "invoices" ADD COLUMN "tax_breakdown" JSONB;
