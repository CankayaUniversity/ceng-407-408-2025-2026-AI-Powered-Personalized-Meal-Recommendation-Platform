import pandas as pd
from thefuzz import fuzz, process
import os
import argparse

def clean_name(name):
    if not isinstance(name, str):
        return ""
    # "'s" ve gereksiz boşlukları temizle, küçük harfe çevir
    name = name.replace("'s", "").strip().lower()
    return name

def process_data(input_path, output_path, similarity_threshold=90):
    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found.")
        return

    print(f"Reading {input_path}...")
    df_ingredients = pd.read_excel(input_path, sheet_name='ingredients')
    df_nutrition = pd.read_excel(input_path, sheet_name='ingredient_nutrition')
    df_recipes = pd.read_excel(input_path, sheet_name='recipes')
    df_recipe_ingredients = pd.read_excel(input_path, sheet_name='recipe_ingredients')

    # Temizlenmiş isimler sütunu ekle
    df_ingredients['clean_name'] = df_ingredients['name'].apply(clean_name)
    
    unique_names = df_ingredients['clean_name'].unique().tolist()
    similar_pairs = []

    print(f"Finding similar names with threshold {similarity_threshold}...")
    for i, name in enumerate(unique_names):
        if not name: continue
        matches = process.extract(name, unique_names[i+1:], scorer=fuzz.ratio, limit=5)
        for match in matches:
            match_name, score = match[0], match[1]
            if score >= similarity_threshold:
                similar_pairs.append((name, match_name, score))

    # Temizleme Stratejisi
    df_ingredients_cleaned = df_ingredients.drop_duplicates(subset=['clean_name'], keep='first').copy()

    for name, match_name, score in similar_pairs:
        if match_name in df_ingredients_cleaned['clean_name'].values and name in df_ingredients_cleaned['clean_name'].values:
            df_ingredients_cleaned.loc[df_ingredients_cleaned['clean_name'] == match_name, 'clean_name'] = name

    df_ingredients_cleaned = df_ingredients_cleaned.drop_duplicates(subset=['clean_name'], keep='first')

    # ID Mapping
    id_map = df_ingredients_cleaned.set_index('clean_name')['id'].to_dict()
    full_map = df_ingredients.copy()
    full_map['clean_name'] = full_map['name'].apply(clean_name)
    for name, match_name, score in similar_pairs:
        full_map.loc[full_map['clean_name'] == match_name, 'clean_name'] = name

    full_map['new_id'] = full_map['clean_name'].map(id_map)
    ingredient_id_mapping = full_map.set_index('id')['new_id'].to_dict()

    # Nutrition Update
    df_nutrition_cleaned = df_nutrition.copy()
    df_nutrition_cleaned['clean_name'] = df_nutrition_cleaned['ingredient_name'].apply(clean_name)
    for name, match_name, score in similar_pairs:
         df_nutrition_cleaned.loc[df_nutrition_cleaned['clean_name'] == match_name, 'clean_name'] = name
    df_nutrition_cleaned = df_nutrition_cleaned.drop_duplicates(subset=['clean_name'], keep='first')

    # Recipe Ingredients Update
    df_recipe_ingredients_cleaned = df_recipe_ingredients.copy()
    df_recipe_ingredients_cleaned['ingredient_id'] = df_recipe_ingredients_cleaned['ingredient_id'].map(ingredient_id_mapping)
    df_recipe_ingredients_cleaned = df_recipe_ingredients_cleaned.groupby(['recipe_id', 'ingredient_id'])['grams'].sum().reset_index()

    with pd.ExcelWriter(output_path) as writer:
        df_ingredients_cleaned[['id', 'name', 'category']].to_excel(writer, sheet_name='ingredients', index=False)
        df_nutrition_cleaned[['ingredient_id', 'ingredient_name', 'calories_100g', 'protein_100g', 'carbs_100g', 'fat_100g']].to_excel(writer, sheet_name='ingredient_nutrition', index=False)
        df_recipes.to_excel(writer, sheet_name='recipes', index=False)
        df_recipe_ingredients_cleaned.to_excel(writer, sheet_name='recipe_ingredients', index=False)

    print(f"Cleaned data saved to: {output_path}")
    print(f"Ingredients reduced from {len(df_ingredients)} to {len(df_ingredients_cleaned)}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Clean and merge similar food ingredients in Excel.')
    parser.add_argument('--input', required=True, help='Input Excel file path')
    parser.add_argument('--output', required=True, help='Output Excel file path')
    parser.add_argument('--threshold', type=int, default=90, help='Fuzzy matching threshold (default: 90)')
    args = parser.parse_on_unknown_args() if hasattr(parser, 'parse_on_unknown_args') else parser.parse_args()
    process_data(args.input, args.output, args.threshold)
