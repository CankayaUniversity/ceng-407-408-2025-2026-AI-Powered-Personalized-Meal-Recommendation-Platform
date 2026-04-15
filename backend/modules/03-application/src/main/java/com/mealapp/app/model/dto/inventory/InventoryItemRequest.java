package com.mealapp.app.model.dto.inventory;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class InventoryItemRequest {

    @NotNull(message = "Malzeme seçimi zorunludur")
    private Long ingredientId;

    @NotNull(message = "Miktar zorunludur")
    @jakarta.validation.constraints.Min(value = 0, message = "Miktar negatif olamaz")
    private Double quantity;

    @NotBlank(message = "Birim zorunludur")
    private String unit;

    /**
     * Gram cinsinden hesaplanmış toplam miktar.
     */
    private Double grams;

    /**
     * Güncelleme modu: ADD (ekle), SUBTRACT (çıkar), SET (belirle).
     * Varsayılan olarak SET seçili kalabilir (geriye dönük uyumluluk).
     */
    private UpdateMode updateMode = UpdateMode.SET;

    public enum UpdateMode {
        ADD, SUBTRACT, SET
    }
}
