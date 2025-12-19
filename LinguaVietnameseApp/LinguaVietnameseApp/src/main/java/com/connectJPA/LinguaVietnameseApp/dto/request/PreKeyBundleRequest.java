package com.connectJPA.LinguaVietnameseApp.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PreKeyBundleRequest {
    private String identityPublicKey;
    private int signedPreKeyId;
    private String signedPreKeyPublicKey;
    private String signedPreKeySignature;
    private Map<Integer, String> oneTimePreKeys;
    
    private Integer oneTimePreKeyId;
    private String oneTimePreKeyPublicKey;
    
    private String encryptedPrivateKeys;
}