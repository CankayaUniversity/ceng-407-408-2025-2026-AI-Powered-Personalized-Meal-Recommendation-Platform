package com.mealapp.utilities.security;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * API Key gibi hassas verileri şifrelemek ve çözmek için yardımcı sınıf.
 * AES-GCM-NoPadding algoritmasını kullanır.
 */
public class EncryptionUtils {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12;
    private static final int GCM_TAG_LENGTH = 128;

    /**
     * Veriyi verilen anahtar ile şifreler.
     * 
     * @param data Şifrelenecek veri
     * @param secretKey 16, 24 veya 32 byte uzunluğunda anahtar
     * @return Şifrelenmiş veri (Base64 formatında IV + Ciphertext)
     */
    public static String encrypt(String data, String secretKey) throws Exception {
        byte[] iv = new byte[GCM_IV_LENGTH];
        SecureRandom random = new SecureRandom();
        random.nextBytes(iv);

        Cipher cipher = Cipher.getInstance(ALGORITHM);
        GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
        SecretKeySpec keySpec = new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "AES");

        cipher.init(Cipher.ENCRYPT_MODE, keySpec, parameterSpec);
        byte[] cipherText = cipher.doFinal(data.getBytes(StandardCharsets.UTF_8));

        byte[] combined = new byte[iv.length + cipherText.length];
        System.arraycopy(iv, 0, combined, 0, iv.length);
        System.arraycopy(cipherText, 0, combined, iv.length, cipherText.length);

        return Base64.getEncoder().encodeToString(combined);
    }

    /**
     * Şifrelenmiş veriyi verilen anahtar ile çözer.
     * 
     * @param encryptedData Şifreli veri (Base64 formatında IV + Ciphertext)
     * @param secretKey 16, 24 veya 32 byte uzunluğunda anahtar
     * @return Çözülmüş veri
     */
    public static String decrypt(String encryptedData, String secretKey) throws Exception {
        byte[] combined = Base64.getDecoder().decode(encryptedData);

        byte[] iv = new byte[GCM_IV_LENGTH];
        System.arraycopy(combined, 0, iv, 0, GCM_IV_LENGTH);

        int cipherTextLength = combined.length - GCM_IV_LENGTH;
        byte[] cipherText = new byte[cipherTextLength];
        System.arraycopy(combined, GCM_IV_LENGTH, cipherText, 0, cipherTextLength);

        Cipher cipher = Cipher.getInstance(ALGORITHM);
        GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
        SecretKeySpec keySpec = new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "AES");

        cipher.init(Cipher.DECRYPT_MODE, keySpec, parameterSpec);
        byte[] decryptedText = cipher.doFinal(cipherText);

        return new String(decryptedText, StandardCharsets.UTF_8);
    }
}
