package com.mealapp.infrastructure.storage;

import com.mealapp.infrastructure.test.AbstractSpringTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.io.ByteArrayInputStream;
import java.io.InputStream;

import static org.junit.jupiter.api.Assertions.*;

class MinioFileStorageServiceTest extends AbstractSpringTest {

    @Autowired
    private MinioFileStorageService fileStorageService;

    @Test
    void testUploadAndGetUrlAndDelete() {
        // Given
        String fileName = "test-file-" + System.currentTimeMillis() + ".txt";
        String content = "Hello MinIO!";
        InputStream inputStream = new ByteArrayInputStream(content.getBytes());
        String contentType = "text/plain";

        // When: Upload
        String uploadedName = fileStorageService.uploadFile(inputStream, fileName, contentType);

        // Then: Uploaded name matches
        assertEquals(fileName, uploadedName);

        // When: Get URL
        String url = fileStorageService.getFileUrl(fileName);

        // Then: URL is not null and contains filename
        assertNotNull(url);
        assertTrue(url.contains(fileName));

        // When: Delete
        assertDoesNotThrow(() -> fileStorageService.deleteFile(fileName));
    }
}
