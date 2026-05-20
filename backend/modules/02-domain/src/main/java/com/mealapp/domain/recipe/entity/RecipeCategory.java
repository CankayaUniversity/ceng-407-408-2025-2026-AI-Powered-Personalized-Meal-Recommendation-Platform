package com.mealapp.domain.recipe.entity;

import lombok.Getter;

@Getter
public enum RecipeCategory {
    ANA_YEMEKLER("Ana Yemekler"),
    CORBALAR("Çorbalar"),
    KAHVALTILIK_VE_BRANCH("Kahvaltılıklar & Branç"),
    HAMUR_ISLERI_VE_BOREKLER("Hamur İşleri & Börekler"),
    TATLILAR_VE_PASTALAR("Tatlılar & Pastalar"),
    SALATALAR_VE_MEZELER("Salatalar & Mezeler"),
    ATISTIRMALIKLAR_VE_APARATIFLER("Atıştırmalıklar & Aparatifler"),
    ICECEKLER("İçecekler");

    private final String displayName;

    RecipeCategory(String displayName) {
        this.displayName = displayName;
    }
}
