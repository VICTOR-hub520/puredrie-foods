ALTER TABLE "Product"
    ADD COLUMN "ingredients" TEXT NOT NULL DEFAULT '',
    ADD COLUMN "nutritionInformation" TEXT NOT NULL DEFAULT '',
    ADD COLUMN "allergenInformation" TEXT NOT NULL DEFAULT '',
    ADD COLUMN "storageInstructions" TEXT NOT NULL DEFAULT '',
    ADD COLUMN "countryOfOrigin" TEXT NOT NULL DEFAULT '',
    ADD COLUMN "detailsPublished" BOOLEAN NOT NULL DEFAULT false;
