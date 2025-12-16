package com.connectJPA.LinguaVietnameseApp.utils;

import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

@Component
public class AESUtils {
    private static final String AES_ALGO = "AES/GCM/NoPadding";
    private static final int IV_LENGTH_BYTE = 12;
    private static final int TAG_LENGTH_BIT = 128;

    public String encrypt(String content, String base64Key) {
        try {
            if (content == null) return null;
            byte[] keyBytes = Base64.getDecoder().decode(base64Key);
            SecretKeySpec secretKey = new SecretKeySpec(keyBytes, "AES");
            
            byte[] iv = new byte[IV_LENGTH_BYTE];
            new SecureRandom().nextBytes(iv);

            Cipher cipher = Cipher.getInstance(AES_ALGO);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, new GCMParameterSpec(TAG_LENGTH_BIT, iv));

            byte[] cipherText = cipher.doFinal(content.getBytes(StandardCharsets.UTF_8));
            
            byte[] ivAndCipherText = new byte[iv.length + cipherText.length];
            System.arraycopy(iv, 0, ivAndCipherText, 0, iv.length);
            System.arraycopy(cipherText, 0, ivAndCipherText, iv.length, cipherText.length);

            return Base64.getEncoder().encodeToString(ivAndCipherText);
        } catch (Exception e) {
            throw new RuntimeException("AES Encryption failed", e);
        }
    }

    public String decrypt(String base64Content, String base64Key) {
        try {
            if (base64Content == null) return null;
            byte[] decode = Base64.getDecoder().decode(base64Content);
            byte[] keyBytes = Base64.getDecoder().decode(base64Key);
            SecretKeySpec secretKey = new SecretKeySpec(keyBytes, "AES");

            if (decode.length < IV_LENGTH_BYTE) return null;

            byte[] iv = new byte[IV_LENGTH_BYTE];
            byte[] cipherText = new byte[decode.length - IV_LENGTH_BYTE];

            System.arraycopy(decode, 0, iv, 0, IV_LENGTH_BYTE);
            System.arraycopy(decode, IV_LENGTH_BYTE, cipherText, 0, cipherText.length);

            Cipher cipher = Cipher.getInstance(AES_ALGO);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, new GCMParameterSpec(TAG_LENGTH_BIT, iv));

            byte[] plainText = cipher.doFinal(cipherText);
            return new String(plainText, StandardCharsets.UTF_8);
        } catch (Exception e) {
            return null;
        }
    }

    public String generateRoomKey() {
        byte[] key = new byte[32]; // 256-bit key
        new SecureRandom().nextBytes(key);
        return Base64.getEncoder().encodeToString(key);
    }
}