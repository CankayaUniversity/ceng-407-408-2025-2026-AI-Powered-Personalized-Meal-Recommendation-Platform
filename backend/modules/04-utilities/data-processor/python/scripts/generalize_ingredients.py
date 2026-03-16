import pandas as pd
import os
import argparse

# Genelleştirme için silinecek kelimeler (Hazırlık ve Durum belirtenler)
REDUNDANT_WORDS = [
    'fresh ', 'chopped ', 'sliced ', 'diced ', 'minced ', 'grated ', 'shredded ', 
    'peeled ', 'cooked ', 'boiled ', 'frozen ', 'dried ', 'canned ', 'large ', 
    'small ', 'medium ', 'thinly ', 'thickly ', 'ripe ', 'firm ', 'batch ', 
    'bunch of ', 'can of ', 'box of ', 'package of ', 'frozen ', 'thawed '
]

def generalize_name(name):
    if not isinstance(name, str):
        return ""
    
    new_name = name.lower().strip()
    for word in REDUNDANT_WORDS:
        new_name = new_name.replace(word, "")
    
    return new_name.strip()

def process_generalization(input_path, output_path):
    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found.")
        return

    print(f"Reading {input_path}...")
    df_ingredients = pd.read_excel(input_path, sheet_name='ingredients')
    df_nutrition = pd.read_excel(input_path, sheet_name='ingredient_nutrition')
    df_recipes = pd.read_excel(input_path, sheet_name='recipes')
    df_recipe_ingredients = pd.read_excel(input_path, sheet_name='recipe_ingredients')

    df_ingredients['general_name'] = df_ingredients['name'].apply(generalize_name)

    # Ingredient ID Mapping
    id_map = {}
    for name, group in df_ingredients.groupby('general_name'):
        best_row = group.loc[group['name'].str.len().idxmin()]
        id_map[name] = best_row['id']

    ingredient_id_mapping = {}
    for index, row in df_ingredients.iterrows():
        ingredient_id_mapping[row['id']] = id_map[row['general_name']]

    # Update Dataframes
    df_ingredients_final = df_ingredients[df_ingredients['id'].isin(id_map.values())].copy()
    df_ingredients_final = df_ingredients_final.drop(columns=['general_name'])

    df_nutrition['new_ingredient_id'] = df_nutrition['ingredient_id'].map(ingredient_id_mapping)
    df_nutrition_final = df_nutrition.groupby('new_ingredient_id').agg({
        'calories_100g': 'mean',
        'protein_100g': 'mean',
        'carbs_100g': 'mean',
        'fat_100g': 'mean'
    }).reset_index()
    df_nutrition_final.rename(columns={'new_ingredient_id': 'ingredient_id'}, inplace=True)
    
    # Re-add names for clarity
    df_nutrition_final = df_nutrition_final.merge(df_ingredients_final[['id', 'name']], left_on='ingredient_id', right_on='id', how='left')
    df_nutrition_final.rename(columns={'name': 'ingredient_name'}, inplace=True)
    df_nutrition_final = df_nutrition_final.drop(columns=['id'])

    df_recipe_ingredients_final = df_recipe_ingredients.copy()
    df_recipe_ingredients_final['ingredient_id'] = df_recipe_ingredients_final['ingredient_id'].map(ingredient_id_mapping)
    df_recipe_ingredients_final = df_recipe_ingredients_final.groupby(['recipe_id', 'ingredient_id'])['grams'].sum().reset_index()

    with pd.ExcelWriter(output_path) as writer:
        df_ingredients_final[['id', 'name', 'category']].to_excel(writer, sheet_name='ingredients', index=False)
        df_nutrition_final[['ingredient_id', 'ingredient_name', 'calories_100g', 'protein_100g', 'carbs_100g', 'fat_100g']].to_excel(writer, sheet_name='ingredient_nutrition', index=False)
        df_recipes.to_excel(writer, sheet_name='recipes', index=False)
        df_recipe_ingredients_final.to_excel(writer, sheet_name='recipe_ingredients', index=False)

    print(f"Generalized data saved to: {output_path}")
    print(f"Ingredients reduced from {len(df_ingredients)} to {len(df_ingredients_final)}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Generalize ingredient names by removing prep words.')
    parser.add_argument('--input', required=True, help='Input Excel file path')
    parser.add_argument('--output', required=True, help='Output Excel file path')
    args = parser.parse_args()
    process_generalization(args.input, args.output)
