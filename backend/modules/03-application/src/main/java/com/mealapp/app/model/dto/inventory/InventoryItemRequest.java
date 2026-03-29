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
    @Positive(message = "Miktar sıfırdan büyük olmalıdır")
    private Double quantity;

    @NotBlank(message = "Birim zorunludur")
    private String unit;
}
