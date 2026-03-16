import pandas as pd
from sqlalchemy import create_engine, text
import argparse
import os

def import_data(file_path, db_url):
    """
    Excel dosyasındaki verileri PostgreSQL veritabanına aktarır.
    """
    if not os.path.exists(file_path):
        print(f"Error: {file_path} not found.")
        return

    print(f"Connecting to database: {db_url}")
    engine = create_engine(db_url)

    print(f"Reading Excel file: {file_path}")
    df_ingredients = pd.read_excel(file_path, sheet_name='ingredients')
    df_nutrition = pd.read_excel(file_path, sheet_name='ingredient_nutrition')
    df_recipes = pd.read_excel(file_path, sheet_name='recipes')
    df_recipe_ingredients = pd.read_excel(file_path, sheet_name='recipe_ingredients')

    # Data Cleaning for DB constraints
    # "'s" gibi anlamsız verileri ele
    df_ingredients = df_ingredients[df_ingredients['name'] != "'s"]
    valid_ingredient_ids = df_ingredients['id'].tolist()
    
    df_nutrition = df_nutrition[df_nutrition['ingredient_id'].isin(valid_ingredient_ids)]
    df_recipe_ingredients = df_recipe_ingredients[df_recipe_ingredients['ingredient_id'].isin(valid_ingredient_ids)]

    with engine.begin() as conn:
        # 1. Ingredients
        print("Importing Ingredients...")
        df_ingredients[['id', 'name', 'category']].to_sql('ingredients', conn, if_exists='append', index=False)
        conn.execute(text("SELECT setval('ingredients_id_seq', (SELECT max(id) FROM ingredients))"))

        # 2. Ingredient Nutrition
        print("Importing Ingredient Nutrition...")
        # Sütun isimlerini DB şemasına uyarla: *_100g -> *_per100g
        df_nutrition_db = df_nutrition.rename(columns={
            'calories_100g': 'calories_per100g',
            'protein_100g': 'protein_per100g',
            'carbs_100g': 'carbs_per100g',
            'fat_100g': 'fat_per100g'
        })
        df_nutrition_db[['ingredient_id', 'calories_per100g', 'protein_per100g', 'carbs_per100g', 'fat_per100g']].to_sql('ingredient_nutrition', conn, if_exists='append', index=False)

        # 3. Recipes
        print("Importing Recipes...")
        df_recipes[['id', 'title', 'instructions', 'preparation_time_minutes', 'servings', 'difficulty']].to_sql('recipes', conn, if_exists='append', index=False)
        conn.execute(text("SELECT setval('recipes_id_seq', (SELECT max(id) FROM recipes))"))

        # 4. Recipe Ingredients
        print("Importing Recipe Ingredients...")
        df_recipe_ingredients[['recipe_id', 'ingredient_id', 'grams']].to_sql('recipe_ingredients', conn, if_exists='append', index=False)
        conn.execute(text("SELECT setval('recipe_ingredients_id_seq', (SELECT max(id) FROM recipe_ingredients))"))

    print("Data import completed successfully.")

if __name__ == "__main__":
    # Scriptin bulunduğu dizine göre varsayılan dosya yolunu belirle
    script_dir = os.path.dirname(os.path.abspath(__file__))
    default_file = os.path.join(script_dir, "..", "final_food_database.xlsx")
    
    parser = argparse.ArgumentParser(description='Import food database from Excel to PostgreSQL.')
    parser.add_argument('--file', default=default_file, help=f'Path to the final Excel file (Default: {default_file})')
    parser.add_argument('--db-url', default='postgresql://postgres:postgres@localhost:5432/meal_app_db', help='Database connection URL')
    
    args = parser.parse_args()
    import_data(args.file, args.db_url)
