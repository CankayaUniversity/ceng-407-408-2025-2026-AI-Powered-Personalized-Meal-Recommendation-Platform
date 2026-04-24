import os
import argparse
import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

# ── TEMİZLİK VE DOĞRULAMA YARDIMCILARI ────────────────────────────────────────

def preflight_check(df_ing, df_nutr, df_rec, df_ri, df_units):
    """FK ilişkilerini ve veri bütünlüğünü içe aktarmadan önce doğrular."""
    ing_ids = set(df_ing['id'])
    rec_ids = set(df_rec['id'])
    passed = True

    # Malzemesi olmayan besin değerleri
    orphan_nutr = df_nutr[~df_nutr['ingredient_id'].isin(ing_ids)]
    if not orphan_nutr.empty:
        print(f"  [WARN] {len(orphan_nutr)} besin satırı malzeme ID'si bulamadı - atlanacak.")

    # Malzemesi olmayan birim tanımları
    orphan_units = df_units[~df_units['ingredient_id'].isin(ing_ids)]
    if not orphan_units.empty:
        print(f"  [WARN] {len(orphan_units)} birim satırı malzeme ID'si bulamadı - atlanacak.")

    # Tarifi veya malzemesi olmayan recipe_ingredient satırları
    orphan_ri = df_ri[~df_ri['recipe_id'].isin(rec_ids) | ~df_ri['ingredient_id'].isin(ing_ids)]
    if not orphan_ri.empty:
        print(f"  [WARN] {len(orphan_ri)} tarif-malzeme eşleşmesi geçersiz ID içeriyor - atlanacak.")

    return passed

# ── ANA İÇE AKTARMA FONKSİYONU ───────────────────────────────────────────────

def import_data(file_path: str, db_url: str, dry_run: bool = False):
    if not os.path.exists(file_path):
        print(f"[ERROR] Dosya bulunamadı: {file_path}")
        return

    print(f"[1/7] Excel okunuyor: {file_path}")
    xls = pd.ExcelFile(file_path)
    df_ing = pd.read_excel(xls, 'ingredients')
    df_nutr = pd.read_excel(xls, 'ingredient_nutrition')
    df_rec = pd.read_excel(xls, 'recipes')
    df_ri = pd.read_excel(xls, 'recipe_ingredients')
    df_units = pd.read_excel(xls, 'ingredient_units')

    print("[2/7] Veriler filtreleniyor ve hazırlanıyor...")
    # Sadece geçerli ID'lere sahip olanları tut
    valid_ing_ids = set(df_ing['id'])
    valid_rec_ids = set(df_rec['id'])

    df_nutr = df_nutr[df_nutr['ingredient_id'].isin(valid_ing_ids)].copy()
    df_units = df_units[df_units['ingredient_id'].isin(valid_ing_ids)].copy()
    df_ri = df_ri[df_ri['ingredient_id'].isin(valid_ing_ids) & df_ri['recipe_id'].isin(valid_rec_ids)].copy()

    # Sütun isimlerini DB şemasına uyarla (nutrition tablosu için)
    df_nutr = df_nutr.rename(columns={
        'calories_100g': 'calories_per100g',
        'protein_100g':  'protein_per100g',
        'carbs_100g':    'carbs_per100g',
        'fat_100g':      'fat_per100g',
    })

    print("[3/7] Ön kontroller (Pre-flight) yapılıyor...")
    preflight_check(df_ing, df_nutr, df_rec, df_ri, df_units)

    if dry_run:
        print("\n[DRY RUN] Kontrol tamamlandı. Veritabanına yazılmadı.")
        return

    print(f"[4/7] Veritabanına bağlanılıyor...")
    try:
        engine = create_engine(db_url)
        # Bağlantı testi
        with engine.connect() as t_conn: t_conn.execute(text("SELECT 1"))
    except Exception as e:
        print(f"[ERROR] Bağlantı başarısız: {e}")
        return

    print("[5/7] Veriler aktarılıyor (Single Transaction)...")
    try:
        with engine.begin() as conn:
            # 1. Ingredients (density eklendi)
            df_ing[['id', 'name', 'category', 'density']].to_sql(
                'ingredients', conn, if_exists='append', index=False)
            conn.execute(text("SELECT setval('ingredients_id_seq', (SELECT COALESCE(MAX(id), 1) FROM ingredients))"))
            print(f"       ✅ ingredients")

            # 2. Nutrition
            df_nutr.to_sql('ingredient_nutrition', conn, if_exists='append', index=False)
            print(f"       ✅ ingredient_nutrition")

            # 3. Ingredient Units (Yeni Tablo)
            df_units[['ingredient_id', 'unit_name', 'grams']].to_sql(
                'ingredient_units', conn, if_exists='append', index=False)
            print(f"       ✅ ingredient_units")

            # 4. Recipes
            # average_rating ve rating_count gibi alanlar Excel'de yoksa varsayılan 0 ata
            if 'average_rating' not in df_rec.columns: df_rec['average_rating'] = 0.0
            if 'rating_count' not in df_rec.columns: df_rec['rating_count'] = 0

            df_rec.to_sql('recipes', conn, if_exists='append', index=False)
            conn.execute(text("SELECT setval('recipes_id_seq', (SELECT COALESCE(MAX(id), 1) FROM recipes))"))
            print(f"       ✅ recipes")

            # 5. Recipe Ingredients (amount, unit, grams eklendi)
            df_ri[['recipe_id', 'ingredient_id', 'amount', 'unit', 'grams']].to_sql(
                'recipe_ingredients', conn, if_exists='append', index=False)
            conn.execute(text("SELECT setval('recipe_ingredients_id_seq', (SELECT COALESCE(MAX(id), 1) FROM recipe_ingredients))"))
            print(f"       ✅ recipe_ingredients")

        print("[6/7] İşlem başarıyla onaylandı (Committed).")
    except SQLAlchemyError as e:
        print(f"[ERROR] Import başarısız - Tüm işlemler geri alındı (Rolled back).\nSebep: {e}")
        return

    print("[7/7] İşlem tamamlandı!")

if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # Varsayılan olarak bir üst dizindeki temizlenmiş dosyayı arar
    default_file = os.path.join(script_dir, "mealai_database_cleaned.xlsx")

    parser = argparse.ArgumentParser(description='MealAI PostgreSQL Importer V2')
    parser.add_argument('--file', default=default_file)
    parser.add_argument('--db-url', default='postgresql://postgres:postgres@localhost:5432/meal_app_db')
    parser.add_argument('--dry-run', action='store_true')

    args = parser.parse_args()
    import_data(args.file, args.db_url, dry_run=args.dry_run)