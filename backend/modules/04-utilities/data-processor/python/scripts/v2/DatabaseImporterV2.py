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

    # Veri Temizliği: Virgüllü sayıları (1,5) noktalı (1.5) yap ve float'a çevir
    def clean_float(val):
        if pd.isna(val): return 0.0
        if isinstance(val, (int, float)): return float(val)
        if isinstance(val, str):
            try:
                return float(val.replace(',', '.'))
            except ValueError:
                return 0.0
        return 0.0

    def calculate_density(row):
        """Kategori, isim ve fiziksel duruma göre akıllı yoğunluk tahmini yapar."""
        # Eğer Excel'de zaten bir yoğunluk girilmişse ve geçerliyse onu kullan
        if 'density' in row and pd.notna(row['density']) and row['density'] > 0:
            return float(row['density'])

        name = str(row['name']).lower()
        category = str(row['category']).upper()
        state = str(row.get('physical_state', 'SOLID')).upper()

        # 1. SIVI VE YARI SIVI MALZEMELER (LIQUID / SEMI_SOLID)
        if state in ['LIQUID', 'SEMI_SOLID']:
            # Süt ve Süt Alternatifleri (Öncelikli)
            if any(word in name for word in ['süt', 'milk', 'krema', 'cream', 'kefir', 'ayran']):
                return 1.03
            # Yağlar
            if 'OIL' in category or any(word in name for word in ['yağ', 'oil', 'zeytinyağ', 'margarin', 'tereyağ']):
                return 0.92
            # Şuruplar ve Bal (Ağır sıvılar)
            if any(word in name for word in ['bal', 'honey', 'pekmez', 'molasses', 'şurup', 'syrup', 'reçel', 'jam']):
                return 1.40
            # Soslar ve Macunlar
            if any(word in name for word in ['sos', 'sauce', 'ketçap', 'ketchup', 'mayonez', 'mayo', 'hardal', 'mustard', 'salça', 'ezme']):
                return 1.15
            if any(word in name for word in ['sirke', 'vinegar', 'limon suyu', 'lemon juice']):
                return 1.01
            # Su bazlılar
            if any(word in name for word in ['su', 'water', 'çay', 'tea', 'kahve', 'coffee', 'meyve suyu']):
                return 1.0
            return 1.0

        # 2. KATI / TOZ MALZEMELER (SOLID)
        
        # Un, Nişasta ve Tozlar (Hafif ve boşluklu)
        is_powder = any(word in name for word in ['flour', 'un', 'nişasta', 'starch', 'pudra', 'toz', 'kakao', 'cocoa', 'karbonat', 'kabartma tozu']) or \
                    (name == 'un') or (' un ' in f' {name} ') or (' unu' in name) or (' unlu' in name)
        if is_powder:
            return 0.6

        # Şeker (Kristal şeker toza göre daha yoğundur)
        if any(word in name for word in ['şeker', 'sugar']) and 'pudra' not in name:
            return 0.85

        # Tuz
        if 'tuz' in name or 'salt' in name:
            return 1.2

        # Bakliyat (Pirinç, mercimek, fasulye vb.)
        if any(word in name for word in ['pirinç', 'rice', 'mercimek', 'lentil', 'fasulye', 'bean', 'nohut', 'chickpea', 'bulgur', 'makarna', 'pasta']):
            return 0.80

        # Baharatlar (Çok hafif)
        if 'SPICE' in category or any(word in name for word in ['nane', 'kekik', 'pul biber', 'karabiber', 'kimyon', 'sumak', 'tarçın', 'biberiye']):
            return 0.4

        # Kuruyemişler
        if 'NUT' in category or any(word in name for word in ['ceviz', 'walnut', 'fındık', 'hazelnut', 'fıstık', 'peanut', 'badem', 'almond']):
            return 0.55

        # Et ve Şarküteri
        if 'MEAT' in category or any(word in name for word in ['et', 'kıyma', 'tavuk', 'chicken', 'balık', 'fish', 'sucuk', 'salam', 'sosis']):
            return 1.05

        # Peynirler
        if any(word in name for word in ['peynir', 'cheese', 'kaşar', 'lor', 'çökelek']):
            return 0.65

        # Sebze ve Meyveler (Genelde su yoğunluğuna yakın ama boşluklu)
        if 'VEGETABLE' in category or 'FRUIT' in category:
            return 0.9

        # Varsayılan katı yoğunluğu
        return 1.0

    df_ri['amount'] = df_ri['amount'].apply(clean_float)
    if 'grams' in df_ri.columns:
        df_ri['grams'] = df_ri['grams'].apply(clean_float)

    # Sütun isimlerini DB şemasına uyarla (nutrition tablosu için)
    df_nutr = df_nutr.rename(columns={
        'calories_100g': 'calories_per100g',
        'protein_100g':  'protein_per100g',
        'carbs_100g':    'carbs_per100g',
        'fat_100g':      'fat_per100g',
    })

    # Nutrition tablosu için eksik değerleri 0 ile doldur
    nutr_cols = ['calories_per100g', 'protein_per100g', 'carbs_per100g', 'fat_per100g']
    for col in nutr_cols:
        if col not in df_nutr.columns:
            df_nutr[col] = 0.0
        else:
            df_nutr[col] = df_nutr[col].fillna(0.0)

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
            # Önce mevcut verileri temizle (kullanıcı onayı varsayılıyor veya test ortamı)
            conn.execute(text("TRUNCATE TABLE recipe_ingredients, ingredient_nutrition, ingredient_units, recipes, ingredients RESTART IDENTITY CASCADE"))
            print("       🧹 Mevcut veriler temizlendi (Truncate).")

            # 1. Ingredients (density ve physical_state akıllı atama)
            if 'physical_state' not in df_ing.columns: 
                df_ing['physical_state'] = 'SOLID'
            
            # Excel'deki physical_state verisini koru, sadece boşsa kategori bazlı tahmin et
            def predict_state(row):
                if pd.notna(row.get('physical_state')):
                    return str(row['physical_state']).upper()
                if str(row['category']).upper() in ['OIL', 'SAUCE', 'BEVERAGE']:
                    return 'LIQUID'
                return 'SOLID'

            df_ing['physical_state'] = df_ing.apply(predict_state, axis=1)

            # Akıllı density hesaplama
            df_ing['density'] = df_ing.apply(calculate_density, axis=1)
            
            # BaseEntity ve zorunlu kolonlar
            now = pd.Timestamp.now()
            df_ing['active'] = True
            df_ing['created_at'] = now
            df_ing['updated_at'] = now

            df_ing[['id', 'name', 'category', 'density', 'physical_state', 'active', 'created_at', 'updated_at']].to_sql(
                'ingredients', conn, if_exists='append', index=False)
            conn.execute(text("SELECT setval('ingredients_id_seq', (SELECT COALESCE(MAX(id), 1) FROM ingredients))"))
            print(f"       ✅ ingredients")

            # 2. Nutrition
            if not df_nutr.empty:
                df_nutr.to_sql('ingredient_nutrition', conn, if_exists='append', index=False)
                print(f"       ✅ ingredient_nutrition")
            else:
                print(f"       ℹ️ ingredient_nutrition (Boş - Atlandı)")

            # 3. Ingredient Units (Yeni Tablo)
            if not df_units.empty:
                df_units[['ingredient_id', 'unit_name', 'grams']].to_sql(
                    'ingredient_units', conn, if_exists='append', index=False)
                conn.execute(text("SELECT setval('ingredient_units_id_seq', (SELECT COALESCE(MAX(id), 1) FROM ingredient_units))"))
                print(f"       ✅ ingredient_units")
            else:
                print(f"       ℹ️ ingredient_units (Boş - Atlandı)")

            # 4. Recipes
            # average_rating ve rating_count gibi alanlar Excel'de yoksa varsayılan 0 ata
            if 'average_rating' not in df_rec.columns: df_rec['average_rating'] = 0.0
            if 'rating_count' not in df_rec.columns: df_rec['rating_count'] = 0
            
            # BaseEntity ve zorunlu kolonlar
            now = pd.Timestamp.now()
            df_rec['active'] = True
            df_rec['created_at'] = now
            df_rec['updated_at'] = now
            if 'status' not in df_rec.columns: df_rec['status'] = 'APPROVED'
            df_rec['status'] = df_rec['status'].fillna('APPROVED')

            df_rec.to_sql('recipes', conn, if_exists='append', index=False)
            conn.execute(text("SELECT setval('recipes_id_seq', (SELECT COALESCE(MAX(id), 1) FROM recipes))"))
            print(f"       ✅ recipes")

            # 5. Recipe Ingredients (amount, unit, grams)
            if 'grams' not in df_ri.columns:
                df_ri['grams'] = 0.0
            else:
                df_ri['grams'] = df_ri['grams'].fillna(0.0)
            
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
    # Varsayılan olarak iki üst dizindeki temizlenmiş dosyayı arar
    default_file = os.path.join(script_dir, "..", "..", "mealai_database_cleaned.xlsx")

    parser = argparse.ArgumentParser(description='MealAI PostgreSQL Importer V2')
    parser.add_argument('--file', default=default_file)
    parser.add_argument('--db-url', default='postgresql://postgres:postgres@localhost:5432/meal_app_db')
    parser.add_argument('--dry-run', action='store_true')

    args = parser.parse_args()
    import_data(args.file, args.db_url, dry_run=args.dry_run)