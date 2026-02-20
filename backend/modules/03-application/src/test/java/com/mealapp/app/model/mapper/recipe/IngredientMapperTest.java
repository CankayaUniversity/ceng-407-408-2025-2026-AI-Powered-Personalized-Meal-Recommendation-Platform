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
                .amount(5.0)
                .unit("g")
                .build();

        IngredientDTO dto = mapper.toDTO(entity);

        assertNotNull(dto);
        assertEquals(1L, dto.getId());
        assertEquals("Salt", dto.getName());
        assertEquals(5.0, dto.getAmount());
        assertEquals("g", dto.getUnit());
    }

    @Test
    void toEntityShouldMapFields() {
        IngredientDTO dto = IngredientDTO.builder()
                .id(1L)
                .name("Pepper")
                .amount(2.0)
                .unit("mg")
                .build();

        Ingredient entity = mapper.toEntity(dto);

        assertNotNull(entity);
        assertEquals(1L, entity.getId());
        assertEquals("Pepper", entity.getName());
        assertEquals(2.0, entity.getAmount());
        assertEquals("mg", entity.getUnit());
    }

    @Test
    void shouldReturnNullWhenInputIsNull() {
        assertNull(mapper.toDTO(null));
        assertNull(mapper.toEntity(null));
    }
}
