-- Simplify Dish model: remove unused fields, change category to categories array
-- DropColumn
ALTER TABLE "dishes" DROP COLUMN IF EXISTS "description";
ALTER TABLE "dishes" DROP COLUMN IF EXISTS "prepTime";
ALTER TABLE "dishes" DROP COLUMN IF EXISTS "servings";
ALTER TABLE "dishes" DROP COLUMN IF EXISTS "ingredients";
ALTER TABLE "dishes" DROP COLUMN IF EXISTS "category";

-- AddColumn
ALTER TABLE "dishes" ADD COLUMN IF NOT EXISTS "categories" "dish_category"[] NOT NULL DEFAULT ARRAY[]::"dish_category"[];
