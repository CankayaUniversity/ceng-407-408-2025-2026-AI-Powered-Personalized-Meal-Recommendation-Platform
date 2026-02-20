package com.mealapp.app;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import com.mealapp.infrastructure.test.AbstractSpringTest;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MealRecommendationApplicationTest extends AbstractSpringTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void contextLoads() {
        // Uygulama bağlamının (context) sorunsuz yüklendiğini kontrol eder.
    }

    @Test
    void databaseConnectionAndFlywayTest() {
        Integer count = jdbcTemplate.queryForObject(
            "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'", 
            Integer.class
        );
        
        assertTrue(count != null && count > 0, "Veritabanı bağlantısı kurulamamış veya 'users' tablosu oluşturulamamış.");
        System.out.println("[DEBUG_LOG] Veritabanı bağlantısı başarılı ve tablolar doğrulandı.");
    }
}
