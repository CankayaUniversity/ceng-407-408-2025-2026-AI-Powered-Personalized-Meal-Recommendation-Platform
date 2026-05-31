package com.mealapp.app.model.dto.inventory;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class InventoryGroupRequest {

    @NotBlank(message = "{validation.inventory.group.name.required}")
    @Size(max = 100, message = "{validation.inventory.group.name.max}")
    private String name;

    @Size(max = 50, message = "{validation.inventory.group.icon.max}")
    private String icon;
}
