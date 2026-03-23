"""
Düzeltmeler:
- argparse parse_on_unknown_args çökme hatası
- Kaydetmeden önce gerçek 'name' sütununa 's' ve gereksiz ad temizleme uygulandı
- Zincir eşleme çözümü (A->B->C artık A->C olarak çözümleniyor)
- Birleştirmeden sonra Nutrition ingredient_id FK doğru şekilde yeniden eşlendi
- Boş/tek karakterli/sadece boşluk içeren içerik filtreleme
- Sağlam benzer çiftler yineleme kaldırma
"""

import os
import argparse
import pandas as pd
from thefuzz import fuzz, process

GARBAGE_PATTERNS = ["'s", '"s', "`s"]

def clean_name(name: str) -> str:
    """Normalize ingredient name: strip garbage suffixes, lowercase, trim."""
    if not isinstance(name, str):
        return ""
    result = name.lower().strip()
    for pat in GARBAGE_PATTERNS:
        result = result.replace(pat, "")
    return result.strip()

def is_valid_name(name: str) -> bool:
    """Filter out empty, whitespace-only, or single-character ingredient names."""
    if not isinstance(name, str):
        return False
    stripped = name.strip()
    return len(stripped) > 1 and stripped not in GARBAGE_PATTERNS

def resolve_chain(mapping: dict) -> dict:
    resolved = {}
    for key in mapping:
        target = mapping[key]
        visited = {key}
        while target in mapping and target not in visited:
            visited.add(target)
            target = mapping[target]
        resolved[key] = target
    return resolved


#  Core Processing

def process_data(input_path: str, output_path: str, similarity_threshold: int = 90):
    if not os.path.exists(input_path):
        print(f"[ERROR] File not found: {input_path}")
        return

    print(f"[1/6] Reading Excel: {input_path}")
    df_ingredients      = pd.read_excel(input_path, sheet_name='ingredients')
    df_nutrition        = pd.read_excel(input_path, sheet_name='ingredient_nutrition')
    df_recipes          = pd.read_excel(input_path, sheet_name='recipes')
    df_recipe_ingr      = pd.read_excel(input_path, sheet_name='recipe_ingredients')

    original_count = len(df_ingredients)

    # ── Step 1: Clean names & filter garbage rows ─────────────────────────────
    print("[2/6] Cleaning ingredient names...")
    df_ingredients['clean_name'] = df_ingredients['name'].apply(clean_name)

    before_filter = len(df_ingredients)
    df_ingredients = df_ingredients[df_ingredients['clean_name'].apply(is_valid_name)].copy()
    print(f"       Removed {before_filter - len(df_ingredients)} garbage/empty rows")

    # ── Step 2: Fuzzy similarity matching ────────────────────────────────────
    print(f"[3/6] Finding similar names (threshold={similarity_threshold})...")
    unique_names = df_ingredients['clean_name'].unique().tolist()
    raw_mapping = {}  # match_name -> canonical_name

    for i, name in enumerate(unique_names):
        if not name:
            continue
        candidates = unique_names[i + 1:]
        if not candidates:
            continue
        matches = process.extract(name, candidates, scorer=fuzz.ratio, limit=5)
        for match_name, score in matches:
            if score >= similarity_threshold and match_name not in raw_mapping:
                # Keep the shorter/simpler name as canonical
                canonical = name if len(name) <= len(match_name) else match_name
                duplicate = match_name if canonical == name else name
                raw_mapping[duplicate] = canonical

    # Resolve chains: A->B->C becomes A->C
    resolved_mapping = resolve_chain(raw_mapping)
    print(f"       Found {len(resolved_mapping)} similar pairs to merge")

    #
    print("[4/6] Merging similar ingredients...")
    df_ingredients['clean_name'] = df_ingredients['clean_name'].apply(
        lambda x: resolved_mapping.get(x, x)
    )

    df_ingredients['name'] = df_ingredients['clean_name']

    df_ingredients_clean = df_ingredients.drop_duplicates(subset=['clean_name'], keep='first').copy()

    canonical_id_map = df_ingredients_clean.set_index('clean_name')['id'].to_dict()
    all_clean = df_ingredients.set_index('id')['clean_name'].to_dict()
    id_remap = {
        old_id: canonical_id_map[clean]
        for old_id, clean in all_clean.items()
        if clean in canonical_id_map
    }

    # ingredient_nutrition'ı güncelle
    df_nutrition_clean = df_nutrition.copy()
    df_nutrition_clean['ingredient_id'] = df_nutrition_clean['ingredient_id'].map(
        lambda x: id_remap.get(x, x)
    )
    # Drop nutrition rows whose ingredient no longer exists
    valid_ids = set(df_ingredients_clean['id'])
    df_nutrition_clean = df_nutrition_clean[
        df_nutrition_clean['ingredient_id'].isin(valid_ids)
    ]
    # Birden fazla beslenme bilgisi satırı aynı ingredient_id'yi paylaşıyorsa, bunların ortalamasını al (?)
    df_nutrition_clean = df_nutrition_clean.groupby('ingredient_id').agg({
        'ingredient_name':  'first',
        'calories_100g':    'mean',
        'protein_100g':     'mean',
        'carbs_100g':       'mean',
        'fat_100g':         'mean',
    }).reset_index()

    # recipe_ingredients güncelleştirme
    df_ri_clean = df_recipe_ingr.copy()
    df_ri_clean['ingredient_id'] = df_ri_clean['ingredient_id'].map(
        lambda x: id_remap.get(x, x)
    )
    # Drop orphaned rows
    df_ri_clean = df_ri_clean[df_ri_clean['ingredient_id'].isin(valid_ids)]
    # Merge duplicate (recipe_id, ingredient_id) pairs by summing grams
    df_ri_clean = (
        df_ri_clean
        .groupby(['recipe_id', 'ingredient_id'], as_index=False)['grams']
        .sum()
    )
    # Restore id column
    df_ri_clean.insert(0, 'id', range(1, len(df_ri_clean) + 1))

    # Kaydetme
    print(f"[5/6] Writing output to: {output_path}")
    with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
        df_ingredients_clean[['id', 'name', 'category']].to_excel(
            writer, sheet_name='ingredients', index=False)
        df_nutrition_clean[['ingredient_id', 'ingredient_name', 'calories_100g',
                            'protein_100g', 'carbs_100g', 'fat_100g']].to_excel(
            writer, sheet_name='ingredient_nutrition', index=False)
        df_recipes.to_excel(writer, sheet_name='recipes', index=False)
        df_ri_clean[['id', 'recipe_id', 'ingredient_id', 'grams']].to_excel(
            writer, sheet_name='recipe_ingredients', index=False)

    print(f"[6/6] Done.")
    print(f"       Ingredients : {original_count:,} → {len(df_ingredients_clean):,} "
          f"(removed {original_count - len(df_ingredients_clean):,})")
    print(f"       Nutrition   : {len(df_nutrition_clean):,} rows")
    print(f"       Recipe-Ingr : {len(df_ri_clean):,} mappings")


# Giriş noktası

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Clean and merge similar food ingredients in Excel database."
    )
    parser.add_argument('--input',     required=True, help='Input Excel file path')
    parser.add_argument('--output',    required=True, help='Output Excel file path')
    parser.add_argument('--threshold', type=int, default=90,
                        help='Fuzzy matching similarity threshold 0-100 (default: 90)')
    args = parser.parse_args()
    process_data(args.input, args.output, args.threshold)