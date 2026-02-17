package com.mealapp.app;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
class MealRecommendationApplicationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void contextLoads() {
        // Uygulama bağlamının (context) sorunsuz yüklendiğini kontrol eder.
        // Eğer veritabanı bağlantısı veya Flyway'de bir hata varsa bu test başarısız olur.
    }

    @Test
    void databaseConnectionAndFlywayTest() {
        // Flyway'in oluşturduğu 'users' tablosunun varlığını kontrol eder
        Integer count = jdbcTemplate.queryForObject(
            "SELECT count(*) FROM information_schema.tables WHERE table_name = 'users'", 
            Integer.class
        );
        
        assertTrue(count != null && count > 0, "Flyway 'users' tablosunu oluşturamamış veya veritabanı bağlantısı kurulamamış.");
        System.out.println("[DEBUG_LOG] Veritabanı bağlantısı başarılı ve tablolar doğrulandı.");
    }
}
