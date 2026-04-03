package com.mealapp.app.model.mapper.inventory;

import com.mealapp.app.model.dto.inventory.InventoryGroupResponse;
import com.mealapp.app.model.dto.inventory.InventoryItemResponse;
import com.mealapp.app.model.mapper.recipe.IngredientMapper;
import com.mealapp.app.util.UnitConverter;
import com.mealapp.domain.inventory.entity.Inventory;
import com.mealapp.domain.inventory.entity.InventoryGroup;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;

@Component
@RequiredArgsConstructor
public class InventoryMapper {

    private final IngredientMapper ingredientMapper;

    public InventoryGroupResponse toGroupResponse(InventoryGroup group) {
        List<InventoryItemResponse> items = group.getItems() == null
                ? List.of()
                : group.getItems().stream()
                .sorted(Comparator.comparing(
                        item -> item.getIngredient() != null ? item.getIngredient().getName() : "",
                        String.CASE_INSENSITIVE_ORDER
                ))
                .map(this::toItemResponse)
                .toList();

        return InventoryGroupResponse.builder()
                .id(group.getId())
                .name(group.getName())
                .icon(group.getIcon())
                .itemCount(items.size())
                .items(items)
                .build();
    }

    public List<InventoryGroupResponse> toGroupResponses(List<InventoryGroup> groups) {
        return groups.stream()
                .map(this::toGroupResponse)
                .toList();
    }

    public InventoryItemResponse toItemResponse(Inventory item) {
        Double grams = item.getQuantity();
        String unit = item.getUnit();
        Double displayQuantity = grams;

        // Convert back to display quantity if unit is not g/gram
        if (unit != null && !unit.equalsIgnoreCase("g") && !unit.equalsIgnoreCase("gram")) {
            Double unitWeight = UnitConverter.getUnitGramWeight(unit, item.getIngredient());
            if (unitWeight != null && unitWeight > 0) {
                displayQuantity = grams / unitWeight;
            }
        }

        return InventoryItemResponse.builder()
                .id(item.getId())
                .inventoryGroupId(item.getInventoryGroup() != null ? item.getInventoryGroup().getId() : null)
                .ingredientId(item.getIngredient() != null ? item.getIngredient().getId() : null)
                .quantity(displayQuantity)
                .grams(grams)
                .unit(unit)
                .ingredient(ingredientMapper.toDTO(item.getIngredient()))
                .build();
    }
}
