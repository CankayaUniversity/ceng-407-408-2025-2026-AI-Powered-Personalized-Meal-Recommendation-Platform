package com.mealapp.utilities.security;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class EncryptionUtilsTest {

    private final String secretKey = "1234567890123456"; // 16 byte

    @Test
    void shouldEncryptAndDecryptSuccessfully() throws Exception {
        String originalText = "sk-ant-api03-abcdefg-12345";
        
        String encryptedText = EncryptionUtils.encrypt(originalText, secretKey);
        assertNotNull(encryptedText);
        assertNotEquals(originalText, encryptedText);

        String decryptedText = EncryptionUtils.decrypt(encryptedText, secretKey);
        assertEquals(originalText, decryptedText);
    }

    @Test
    void shouldThrowExceptionWithWrongKey() throws Exception {
        String originalText = "my-secret-api-key";
        String encryptedText = EncryptionUtils.encrypt(originalText, secretKey);
        
        String wrongKey = "wrongkey12345678";
        
        assertThrows(Exception.class, () -> {
            EncryptionUtils.decrypt(encryptedText, wrongKey);
        });
    }

    @Test
    void shouldProduceDifferentCiphertextForSamePlaintext() throws Exception {
        String originalText = "constant-text";
        
        String encrypted1 = EncryptionUtils.encrypt(originalText, secretKey);
        String encrypted2 = EncryptionUtils.encrypt(originalText, secretKey);
        
        assertNotEquals(encrypted1, encrypted2, "IV different should produce different ciphertext");
        assertEquals(EncryptionUtils.decrypt(encrypted1, secretKey), EncryptionUtils.decrypt(encrypted2, secretKey));
    }
}
