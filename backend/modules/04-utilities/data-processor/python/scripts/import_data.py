"""
Düzeltmeler:
- Herhangi bir sayfa başarısız olursa tam işlem geri alma (atomik içe aktarma)
- Eklemeden önce tüm yabancı anahtar ilişkilerini doğrulama (ön kontrol)
- Yalnızca 's' ile sınırlı olmayan genişletilmiş çöp filtreleme
- Veritabanına dokunmadan güvenli test için --dry-run modu
- Sıra sıfırlama, boş tabloları güvenli bir şekilde ele almak için COALESCE kullanır
- Satır sayılarıyla birlikte tablo başına ayrıntılı içe aktarma özeti
"""

import os
import argparse
import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError


# ── Validation Helpers ────────────────────────────────────────────────────────

GARBAGE_NAMES = {"'s", '"s', '`s', '', ' '}

def is_valid_ingredient_name(name) -> bool:
    """Geçersiz içerik adlarını kontrol et (Tam oldumu bilmiyorum). boş, tek karakterli veya bilinen geçersiz değerler.."""
    if not isinstance(name, str):
        return False
    stripped = name.strip()
    return len(stripped) > 1 and stripped not in GARBAGE_NAMES

def preflight_check(df_ingredients, df_nutrition, df_recipes, df_ri) -> bool:
    """Validate FK relationships and data integrity before import."""
    passed = True

    ingredient_ids = set(df_ingredients['id'])
    recipe_ids     = set(df_recipes['id'])

    # Nutrition FK check
    orphan_nutrition = df_nutrition[~df_nutrition['ingredient_id'].isin(ingredient_ids)]
    if not orphan_nutrition.empty:
        print(f"  [WARN] {len(orphan_nutrition)} nutrition rows reference missing ingredient IDs — will be skipped")

    # Recipe-ingredients recipe FK check
    orphan_ri_recipe = df_ri[~df_ri['recipe_id'].isin(recipe_ids)]
    if not orphan_ri_recipe.empty:
        print(f"  [WARN] {len(orphan_ri_recipe)} recipe_ingredient rows reference missing recipe IDs — will be skipped")

    # Recipe-ingredients ingredient FK check
    orphan_ri_ingr = df_ri[~df_ri['ingredient_id'].isin(ingredient_ids)]
    if not orphan_ri_ingr.empty:
        print(f"  [WARN] {len(orphan_ri_ingr)} recipe_ingredient rows reference missing ingredient IDs — will be skipped")

    # Tekrardan kontrol (recipe_id, ingredient_id)
    dupes = df_ri[df_ri.duplicated(subset=['recipe_id', 'ingredient_id'], keep=False)]
    if not dupes.empty:
        print(f"  [WARN] {len(dupes)} duplicate (recipe_id, ingredient_id) pairs found — keeping first occurrence")

    return passed


# ── Core Import ───────────────────────────────────────────────────────────────

def import_data(file_path: str, db_url: str, dry_run: bool = False):
    if not os.path.exists(file_path):
        print(f"[ERROR] File not found: {file_path}")
        return

    print(f"[1/7] Reading Excel: {file_path}")
    df_ingredients  = pd.read_excel(file_path, sheet_name='ingredients')
    df_nutrition    = pd.read_excel(file_path, sheet_name='ingredient_nutrition')
    df_recipes      = pd.read_excel(file_path, sheet_name='recipes')
    df_ri           = pd.read_excel(file_path, sheet_name='recipe_ingredients')

    # Veri temizleme
    print("[2/7] Cleaning data...")

    # Filter garbage ingredient names
    before = len(df_ingredients)
    df_ingredients = df_ingredients[df_ingredients['name'].apply(is_valid_ingredient_name)].copy()
    print(f"       Removed {before - len(df_ingredients)} invalid ingredient rows")

    valid_ingredient_ids = set(df_ingredients['id'])
    valid_recipe_ids     = set(df_recipes['id'])

    # Filter orphaned nutrition rows
    df_nutrition = df_nutrition[df_nutrition['ingredient_id'].isin(valid_ingredient_ids)].copy()

    # Tarifteki kullanılmayan malzeme satırlarını filtrele
    df_ri = df_ri[
        df_ri['ingredient_id'].isin(valid_ingredient_ids) &
        df_ri['recipe_id'].isin(valid_recipe_ids)
        ].copy()

    # Tekrarlananları Kaldır (recipe_id, ingredient_id) — toplam gram
    df_ri = (
        df_ri
        .groupby(['recipe_id', 'ingredient_id'], as_index=False)['grams']
        .sum()
    )
    df_ri.insert(0, 'id', range(1, len(df_ri) + 1))

    # Beslenme sütunlarını veritabanı şemasına uyacak şekilde yeniden adlandır. (*_100g değilde, *_per100g şeklinde)
    df_nutrition_db = df_nutrition.rename(columns={
        'calories_100g': 'calories_per100g',
        'protein_100g':  'protein_per100g',
        'carbs_100g':    'carbs_per100g',
        'fat_100g':      'fat_per100g',
    })

    # ─Pre-flight Validation ─
    print("[3/7] Running pre-flight validation...")
    preflight_check(df_ingredients, df_nutrition, df_recipes, df_ri)

    if dry_run:
        print("\n[DRY RUN] Validation complete. No data was imported.")
        print(f"  Would import:")
        print(f"    ingredients        : {len(df_ingredients):,} rows")
        print(f"    ingredient_nutrition: {len(df_nutrition_db):,} rows")
        print(f"    recipes            : {len(df_recipes):,} rows")
        print(f"    recipe_ingredients : {len(df_ri):,} rows")
        return

    #  Database Import
    print(f"[4/7] Connecting to database...")
    try:
        engine = create_engine(db_url)
        with engine.connect() as test_conn:
            test_conn.execute(text("SELECT 1"))
        print("       Connection OK")
    except Exception as e:
        print(f"[ERROR] Cannot connect to database: {e}")
        return

    print("[5/7] Importing data (single transaction)...")
    try:
        with engine.begin() as conn:
            # 1. Ingredients
            df_ingredients[['id', 'name', 'category']].to_sql(
                'ingredients', conn, if_exists='append', index=False)
            conn.execute(text(
                "SELECT setval('ingredients_id_seq', (SELECT COALESCE(MAX(id), 1) FROM ingredients))"
            ))
            print(f"       ✅ ingredients        : {len(df_ingredients):,} rows")

            # 2. Ingredient Nutrition
            df_nutrition_db[['ingredient_id', 'calories_per100g', 'protein_per100g',
                             'carbs_per100g', 'fat_per100g']].to_sql(
                'ingredient_nutrition', conn, if_exists='append', index=False)
            print(f"       ✅ ingredient_nutrition: {len(df_nutrition_db):,} rows")

            # 3. Recipes
            df_recipes[['id', 'title', 'instructions',
                        'preparation_time_minutes', 'servings', 'difficulty']].to_sql(
                'recipes', conn, if_exists='append', index=False)
            conn.execute(text(
                "SELECT setval('recipes_id_seq', (SELECT COALESCE(MAX(id), 1) FROM recipes))"
            ))
            print(f"       ✅ recipes             : {len(df_recipes):,} rows")

            # 4. Recipe Ingredients
            df_ri[['recipe_id', 'ingredient_id', 'grams']].to_sql(
                'recipe_ingredients', conn, if_exists='append', index=False)
            conn.execute(text(
                "SELECT setval('recipe_ingredients_id_seq', (SELECT COALESCE(MAX(id), 1) FROM recipe_ingredients))"
            ))
            print(f"       ✅ recipe_ingredients  : {len(df_ri):,} rows")

        print("[6/7] Transaction committed successfully.")

    except SQLAlchemyError as e:
        # If anything fails, the entire transaction is rolled back automatically
        print(f"[ERROR] Import failed — transaction rolled back.\n  Reason: {e}")
        return

    print("[7/7] Import complete!")
    print(f"  Summary:")
    print(f"    ingredients        : {len(df_ingredients):,}")
    print(f"    ingredient_nutrition: {len(df_nutrition_db):,}")
    print(f"    recipes            : {len(df_recipes):,}")
    print(f"    recipe_ingredients : {len(df_ri):,}")


# Giriş noktası

if __name__ == "__main__":
    script_dir   = os.path.dirname(os.path.abspath(__file__))
    default_file = os.path.join(script_dir, '..', 'final_food_database.xlsx')

    parser = argparse.ArgumentParser(
        description='Import food database from Excel into PostgreSQL.'
    )
    parser.add_argument(
        '--file', default=default_file,
        help=f'Path to Excel file (default: {default_file})'
    )
    parser.add_argument(
        '--db-url', default='postgresql://postgres:postgres@localhost:5432/meal_app_db',
        help='PostgreSQL connection URL'
    )
    parser.add_argument(
        '--dry-run', action='store_true',
        help='Validate data without importing to database'
    )
    args = parser.parse_args()
    import_data(args.file, args.db_url, dry_run=args.dry_run)