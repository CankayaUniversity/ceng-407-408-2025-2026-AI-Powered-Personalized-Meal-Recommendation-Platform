package com.mealapp.app.model.dto.inventory;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class InventoryGroupRequest {

    @NotBlank(message = "Lokasyon adı zorunludur")
    @Size(max = 100, message = "Lokasyon adı en fazla 100 karakter olabilir")
    private String name;

    @Size(max = 50, message = "İkon en fazla 50 karakter olabilir")
    private String icon;
}
