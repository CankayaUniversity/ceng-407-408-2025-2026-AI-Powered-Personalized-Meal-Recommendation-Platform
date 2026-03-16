package com.mealapp.app.model.mapper.recipe;

import com.mealapp.app.model.dto.recipe.IngredientDTO;
import com.mealapp.domain.recipe.entity.Ingredient;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class IngredientMapperTest {
    private final IngredientMapper mapper = new IngredientMapper();

    @Test
    void toDTOShouldMapFields() {
        Ingredient entity = Ingredient.builder()
                .id(1L)
                .name("Salt")
                .category(Ingredient.Category.SPICE)
                .build();

        IngredientDTO dto = mapper.toDTO(entity);

        assertNotNull(dto);
        assertEquals(1L, dto.getId());
        assertEquals("Salt", dto.getName());
        assertEquals("SPICE", dto.getCategory());
    }

    @Test
    void toEntityShouldMapFields() {
        IngredientDTO dto = IngredientDTO.builder()
                .id(1L)
                .name("Pepper")
                .category("SPICE")
                .build();

        Ingredient entity = mapper.toEntity(dto);

        assertNotNull(entity);
        assertEquals(1L, entity.getId());
        assertEquals("Pepper", entity.getName());
        assertEquals(Ingredient.Category.SPICE, entity.getCategory());
    }

    @Test
    void shouldReturnNullWhenInputIsNull() {
        assertNull(mapper.toDTO(null));
        assertNull(mapper.toEntity(null));
    }
}
