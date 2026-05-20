import pandas as pd
import numpy as np
import os
from thefuzz import fuzz, process

# --- AYARLAR ---
script_dir = os.path.dirname(os.path.abspath(__file__))
INPUT_FILE = os.path.join(script_dir, '..', '..', 'mealai_database.xlsx')
OUTPUT_FILE = os.path.join(script_dir, '..', '..', 'mealai_database_cleaned.xlsx')

SAFE_THRESHOLD = 97

DENSITY_MAP = {
    'VEGETABLE': 1.0, 'FRUIT': 1.0, 'GRAIN': 0.6, 'OIL': 0.92, 'SWEETENER': 0.8,
    'DAIRY': 1.03, 'EGG': 1.03, 'SPICE': 0.5, 'LEGUME': 0.8, 'MEAT': 1.0,
    'SAUCE': 1.1, 'BEVERAGE': 1.0, 'OTHER': 1.0
}

TYPO_FIXES = {
    'kako': 'kakao',
    'mısır ': 'mısır',
    'domates ': 'domates'
}

def clean_text(text, log_changes=False):
    if not isinstance(text, str): return text
    original = text
    text = text.lower().strip()
    fixed = TYPO_FIXES.get(text, text)
    if log_changes:
        if original.lower().strip() != fixed:
            print(f"  [TYPO] '{original}' -> '{fixed}'")
        elif original != text:
            print(f"  [NORM] '{original}' -> '{text}'")
    return fixed

def process_database():
    if not os.path.exists(INPUT_FILE):
        print(f"❌ Hata: {INPUT_FILE} bulunamadı!")
        return

    print("🚀 MealAI Veri İşleme Başlıyor (Güvenli Mod)...")

    # 1. Verileri Oku
    xls = pd.ExcelFile(INPUT_FILE)
    df_ing = pd.read_excel(xls, 'ingredients')
    df_rec = pd.read_excel(xls, 'recipes')
    df_ri = pd.read_excel(xls, 'recipe_ingredients')
    df_units = pd.read_excel(xls, 'ingredient_units')
    df_nutr = pd.read_excel(xls, 'ingredient_nutrition')

    # 2. Ingredients Temizliği ve Density Atama
    print("🧹 Malzemeler temizleniyor...")
    df_ing['name'] = df_ing['name'].apply(lambda x: clean_text(x, log_changes=True))
    df_ing['density'] = df_ing.apply(
        lambda row: DENSITY_MAP.get(row['category'], 1.0) if pd.isnull(row['density']) or row['density'] == 0 else row['density'],
        axis=1
    )

    # 3. Akıllı ve Güvenli Birleştirme
    print(f"🔍 Benzerlikler taranıyor (Eşik: %{SAFE_THRESHOLD})...")
    unique_names = df_ing['name'].unique().tolist()
    rename_map = {}
    merge_log = []

    for i, name in enumerate(unique_names):
        candidates = unique_names[i+1:]
        matches = process.extract(name, candidates, scorer=fuzz.ratio, limit=1)
        for match, score in matches:
            if score >= SAFE_THRESHOLD:
                if abs(len(name) - len(match)) < 3:
                    rename_map[match] = name
                    merge_log.append(f"  [MERGE] '{match}' -> '{name}' (Score: {score})")

    if merge_log:
        for log in merge_log: print(log)

    print(f"🔄 {len(rename_map)} adet yazım hatası/benzerlik düzeltilecek.")
    df_ing['name'] = df_ing['name'].replace(rename_map)
    df_ing_clean = df_ing.drop_duplicates(subset=['name'], keep='first').copy()

    id_map = {}
    for _, row in df_ing.iterrows():
        new_id = df_ing_clean[df_ing_clean['name'] == row['name']]['id'].values[0]
        id_map[row['id']] = new_id

    # 4. Recipes Tablosu Enum Temizliği (Hata Çözücü Akıllı Eşleşme)
    print("✨ Tariflerdeki category ve diet_type alanları standartlaştırılıyor...")

    # Excel dosyasından gelebilecek sütun başlığı varyasyonlarını güvenle yakala
    excel_category_col = next((col for col in df_rec.columns if col.strip().lower() == 'category'), None)
    excel_diet_col = next((col for col in df_rec.columns if col.strip().lower() in ['diettype', 'diet_type', 'diet type']), None)

    # Category sütununu işle ve geçici eski sütun varsa temizle
    if excel_category_col:
        df_rec['category_clean'] = df_rec[excel_category_col].fillna('ANA_YEMEKLER').astype(str).str.strip().str.upper()
        if excel_category_col != 'category':
            df_rec = df_rec.drop(columns=[excel_category_col])
    else:
        df_rec['category_clean'] = 'ANA_YEMEKLER'

    # Diet Type sütununu işle ve geçici eski sütun varsa temizle
    if excel_diet_col:
        df_rec['diet_type_clean'] = df_rec[excel_diet_col].fillna('NONE').astype(str).str.strip().str.upper()
        if excel_diet_col != 'diet_type':
            df_rec = df_rec.drop(columns=[excel_diet_col])
    else:
        df_rec['diet_type_clean'] = 'NONE'

    # Nihai sütun isimlerini standart şemaya oturt
    df_rec['category'] = df_rec['category_clean']
    df_rec['diet_type'] = df_rec['diet_type_clean']
    df_rec = df_rec.drop(columns=['category_clean', 'diet_type_clean'], errors='ignore')

    # 5. Tablo İlişkilerini Güncelle
    print("🔗 Tablo ilişkileri güncelleniyor...")
    df_ri['ingredient_id'] = df_ri['ingredient_id'].map(id_map)
    df_ri['grams'] = 0

    df_units['ingredient_id'] = df_units['ingredient_id'].map(id_map)
    df_units = df_units.drop_duplicates(subset=['ingredient_id', 'unit_name'])

    df_nutr['ingredient_id'] = df_nutr['ingredient_id'].map(id_map)
    df_nutr = df_nutr.drop_duplicates(subset=['ingredient_id'])

    # 6. Kaydet
    print(f"💾 Kaydediliyor: {OUTPUT_FILE}")
    with pd.ExcelWriter(OUTPUT_FILE, engine='openpyxl') as writer:
        df_ing_clean.to_excel(writer, sheet_name='ingredients', index=False)
        df_rec.to_excel(writer, sheet_name='recipes', index=False)
        df_ri.to_excel(writer, sheet_name='recipe_ingredients', index=False)
        df_units.to_excel(writer, sheet_name='ingredient_units', index=False)
        df_nutr.to_excel(writer, sheet_name='ingredient_nutrition', index=False)

    print("✅ İşlem tamam! Artık bu dosyayı DB'ye import edebilirsin.")

if __name__ == "__main__":
    process_database()