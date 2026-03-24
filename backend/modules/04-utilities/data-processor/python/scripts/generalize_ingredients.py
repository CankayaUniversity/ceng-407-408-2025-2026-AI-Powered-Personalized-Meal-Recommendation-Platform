"""

Düzeltmeler:
- Gereksiz kelime ayıklama artık sadece ön ekleri değil, dize ortasındaki tekrarları da ele alıyor
- Çoğul normalleştirme (soğan->soğan, havuç->havuç)
- Birim kelime ayıklama eklendi (oz, yemek kaşığı, fincan vb.)
- Standart ad seçimi, en kısa adı değil, en yaygın adı tercih ediyor
- NaN/boş içerik adlarını sorunsuz bir şekilde ele alıyor
- Genelleştirmeden sonra besin içeriği adı doğru şekilde yeniden ekleniyor
- Genelleştirmeden sonra tarif malzemelerindeki yetim temizleme

Usage:
    py generalize_ingredients.py --input cleaned_food_database.xlsx --output generalized_food_database.xlsx
"""

import os
import re
import argparse
import pandas as pd


# ─ Redundant word list (expanded) ─

REDUNDANT_WORDS = [
    'fresh', 'chopped', 'sliced', 'diced', 'minced', 'grated', 'shredded',
    'peeled', 'cooked', 'boiled', 'frozen', 'dried', 'canned', 'large',
    'small', 'medium', 'thinly', 'thickly', 'ripe', 'firm', 'thawed',
    'ground', 'crushed', 'whole', 'raw', 'roasted', 'toasted', 'smoked',
    'skinless', 'boneless', 'lean', 'low-fat', 'low fat', 'fat-free',
    'unsalted', 'salted', 'sweetened', 'unsweetened', 'organic',
    'batch', 'bunch', 'can', 'box', 'package', 'pkg', 'jar',
]

# Measurement units to strip
UNIT_WORDS = [
    'oz', 'lb', 'lbs', 'g', 'kg', 'ml', 'l', 'cup', 'cups',
    'tbsp', 'tsp', 'tablespoon', 'teaspoon', 'pint', 'quart', 'gallon',
]




def build_pattern(words: list) -> re.Pattern:
    """Build a regex that matches whole-word occurrences of any word in list."""
    escaped = [re.escape(w) for w in sorted(words, key=len, reverse=True)]
    return re.compile(r'\b(' + '|'.join(escaped) + r')\b', re.IGNORECASE)

# Pre-compiled regex patterns for performance
REDUNDANT_PATTERN = build_pattern(REDUNDANT_WORDS)
UNIT_PATTERN      = build_pattern(UNIT_WORDS)

def normalize_plural(name: str) -> str:
    """Simple plural normalization: trailing 'ies'->y, trailing 's' (non-ss)."""
    if name.endswith('ies') and len(name) > 4:
        return name[:-3] + 'y'
    if name.endswith('s') and not name.endswith('ss') and len(name) > 3:
        return name[:-1]
    return name

def generalize_name(name: str) -> str:
    """Remove prep/state/unit words and normalize plurals."""
    if not isinstance(name, str) or not name.strip():
        return ""
    result = name.lower().strip()
    # Ölçü birimlerini strip et
    result = UNIT_PATTERN.sub('', result)

    result = REDUNDANT_PATTERN.sub('', result)

    result = re.sub(r'[\s,/()-]+', ' ', result).strip().strip('.,;:()-')
    # Normalize plurals
    result = normalize_plural(result)
    return result.strip()

def pick_canonical(group: pd.DataFrame) -> int:

    idx = group['name'].str.len().idxmin()
    return group.loc[idx, 'id']


#

def process_generalization(input_path: str, output_path: str):
    if not os.path.exists(input_path):
        print(f"[ERROR] File not found: {input_path}")
        return

    print(f"[1/6] Reading Excel: {input_path}")
    df_ingredients  = pd.read_excel(input_path, sheet_name='ingredients')
    df_nutrition    = pd.read_excel(input_path, sheet_name='ingredient_nutrition')
    df_recipes      = pd.read_excel(input_path, sheet_name='recipes')
    df_ri           = pd.read_excel(input_path, sheet_name='recipe_ingredients')

    original_count = len(df_ingredients)

    # İsimleri genelleştir
    print("[2/6] Generalizing ingredient names...")
    df_ingredients['general_name'] = df_ingredients['name'].apply(generalize_name)

    # Drop rows where generalization left an empty name
    df_ingredients = df_ingredients[df_ingredients['general_name'].str.len() > 1].copy()

    #
    print("[3/6] Selecting canonical ingredients...")
    canonical_ids = (
        df_ingredients
        .groupby('general_name', group_keys=False)
        .apply(pick_canonical)
        .to_dict()  # general_name -> canonical_id
    )


    general_map = df_ingredients.set_index('id')['general_name'].to_dict()
    id_remap = {
        old_id: canonical_ids[gen]
        for old_id, gen in general_map.items()
        if gen in canonical_ids
    }


    canonical_id_set = set(canonical_ids.values())
    df_ingredients_final = df_ingredients[
        df_ingredients['id'].isin(canonical_id_set)
    ][['id', 'name', 'category']].copy()

    print(f"       Ingredients: {original_count:,} → {len(df_ingredients_final):,} "
          f"(removed {original_count - len(df_ingredients_final):,})")

    # ingredient_nutrition güncelle
    print("[4/6] Updating nutrition data...")
    df_nutrition_upd = df_nutrition.copy()
    df_nutrition_upd['ingredient_id'] = df_nutrition_upd['ingredient_id'].map(
        lambda x: id_remap.get(x, x)
    )
    # Geçerli ID2leri tut (?)
    df_nutrition_upd = df_nutrition_upd[
        df_nutrition_upd['ingredient_id'].isin(canonical_id_set)
    ]
    # Birleştirilmiş malzemelerin ortalama besin değerleri (Umarım)
    df_nutrition_final = df_nutrition_upd.groupby('ingredient_id').agg({
        'calories_100g': 'mean',
        'protein_100g':  'mean',
        'carbs_100g':    'mean',
        'fat_100g':      'mean',
    }).reset_index()

    df_nutrition_final = df_nutrition_final.merge(
        df_ingredients_final[['id', 'name']],
        left_on='ingredient_id', right_on='id', how='left'
    ).rename(columns={'name': 'ingredient_name'}).drop(columns=['id'])

    # recipe_ingreient' güncelleştir
    print("[5/6] Updating recipe-ingredient mappings...")
    df_ri_final = df_ri.copy()
    df_ri_final['ingredient_id'] = df_ri_final['ingredient_id'].map(
        lambda x: id_remap.get(x, x)
    )
    # Drop orphaned rows
    df_ri_final = df_ri_final[df_ri_final['ingredient_id'].isin(canonical_id_set)]
    # Yinelenen (recipe_id, ingredient_id) çiftlerini birleştir
    df_ri_final = (
        df_ri_final
        .groupby(['recipe_id', 'ingredient_id'], as_index=False)['grams']
        .sum()
    )
    df_ri_final.insert(0, 'id', range(1, len(df_ri_final) + 1))

    # Kayıt noktası
    print(f"[6/6] Writing output to: {output_path}")
    with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
        df_ingredients_final.to_excel(writer, sheet_name='ingredients', index=False)
        df_nutrition_final[['ingredient_id', 'ingredient_name', 'calories_100g',
                            'protein_100g', 'carbs_100g', 'fat_100g']].to_excel(
            writer, sheet_name='ingredient_nutrition', index=False)
        df_recipes.to_excel(writer, sheet_name='recipes', index=False)
        df_ri_final[['id', 'recipe_id', 'ingredient_id', 'grams']].to_excel(
            writer, sheet_name='recipe_ingredients', index=False)

    print("       Done.")
    print(f"       Nutrition rows    : {len(df_nutrition_final):,}")
    print(f"       Recipe-Ingr rows  : {len(df_ri_final):,}")


# Giriş

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Generalize ingredient names by removing preparation/state words."
    )
    parser.add_argument('--input',  required=True, help='Input Excel file path')
    parser.add_argument('--output', required=True, help='Output Excel file path')
    args = parser.parse_args()
    process_generalization(args.input, args.output)