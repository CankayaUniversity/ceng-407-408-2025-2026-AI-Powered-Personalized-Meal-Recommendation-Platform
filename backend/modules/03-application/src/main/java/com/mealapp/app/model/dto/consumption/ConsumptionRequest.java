package com.mealapp.app.model.dto.consumption;

import com.mealapp.domain.consumption.entity.DailyConsumption;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

/**
 * Günlük tüketim kaydı oluştururken kullanılan istek nesnesi.
 */
@Data
public class ConsumptionRequest {
    /**
     * Legacy istemciler için korunur. Kimlik doğrulanmış isteklerde JWT subject önceliklidir.
     */
    private String userId;

    private String foodName;

    @NotNull(message = "Öğün tipi zorunludur")
    private DailyConsumption.MealType mealType;

    private DailyConsumption.PortionSize portionSize;

    /**
     * Eğer dışarıda yenilen bir yemekse true. AI tahmini tetiklenecek.
     */
    private Boolean isCustomEntry;

    /**
     * Eğer evdeki malzemelerle yapıldıysa true. Stok düşülecek.
     */
    private Boolean isFromInventory;

    /**
     * Sistemdeki bir tarif tüketilirse ID'si gönderilir.
     */
    private Long recipeId;

    /**
     * Doğrudan bir malzeme tüketimi girildiyse ID'si gönderilir.
     */
    private Long ingredientId;

    /**
     * Ev/Ofis gibi seçilen stok lokasyonu.
     */
    private Long inventoryGroupId;

    /**
     * Household unit etiketi (örn: 1 bowl, 1 slice, 1 piece).
     */
    private String portionLabel;

    /**
     * Malzeme kayıtlarında kullanıcının girdiği miktar.
     * Gram dönüşümü backend'de UnitConverterService ile yapılır.
     */
    @Positive(message = "Miktar sıfırdan büyük olmalıdır")
    private Double portionAmount;

    /**
     * Malzeme kayıtlarında kullanıcının seçtiği birim (örn: ML, GRAM, BARDAK).
     */
    private String portionUnit;

    /**
     * Tarif kayıtlarında uygulanacak porsiyon katsayısı.
     */
    @Positive(message = "Porsiyon katsayısı sıfırdan büyük olmalıdır")
    private Double portionMultiplier;

    /**
     * Malzeme kayıtlarında household unit'in yaklaşık gram karşılığı.
     */
    @Positive(message = "Gram karşılığı sıfırdan büyük olmalıdır")
    private Double portionGrams;

    /**
     * Seçilen stok lokasyonundaki (envanter grubu) üyelerin tüketim miktarları.
     */
    private java.util.List<MemberConsumption> members;

    /**
     * Üye özelinde tüketim bilgisi.
     */
    @lombok.Data
    public static class MemberConsumption {
        private String userId;
        private Double portionMultiplier;
        private Double portionGrams;
        private String portionLabel;
        private Double portionAmount;
        private String portionUnit;
        private Long recipeId;
        private Long ingredientId;
        private String foodName;
    }
}
