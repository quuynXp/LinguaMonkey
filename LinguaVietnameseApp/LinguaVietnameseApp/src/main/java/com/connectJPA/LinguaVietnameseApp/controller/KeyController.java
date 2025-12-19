package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.PreKeyBundleRequest;
import com.connectJPA.LinguaVietnameseApp.entity.OneTimePreKey;
import com.connectJPA.LinguaVietnameseApp.entity.UserE2EKey;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.OneTimePreKeyRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserE2EKeyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/keys")
@RequiredArgsConstructor
public class KeyController {

    private final UserE2EKeyRepository userE2EKeyRepository;
    private final OneTimePreKeyRepository oneTimePreKeyRepository;
    private static final int MIN_PREKEYS = 100;

    @PostMapping("/upload/{userId}")
    @Transactional
    public ResponseEntity<Void> uploadPreKeyBundle(
            @PathVariable UUID userId,
            @RequestBody PreKeyBundleRequest request) {
        
        UserE2EKey key = userE2EKeyRepository.findById(userId).orElse(new UserE2EKey());
        key.setUserId(userId);
        key.setIdentityPublicKey(request.getIdentityPublicKey());
        key.setSignedPreKeyId(request.getSignedPreKeyId());
        key.setSignedPreKeyPublicKey(request.getSignedPreKeyPublicKey());
        key.setSignedPreKeySignature(request.getSignedPreKeySignature());
        key.setLastPreKeyBundleUpload(LocalDateTime.now());
        
        if (request.getEncryptedPrivateKeys() != null) {
            key.setEncryptedPrivateKeys(request.getEncryptedPrivateKeys());
        }

        userE2EKeyRepository.save(key);
        
        if (request.getOneTimePreKeys() != null && !request.getOneTimePreKeys().isEmpty()) {
            LocalDateTime now = LocalDateTime.now();
            for (Map.Entry<Integer, String> entry : request.getOneTimePreKeys().entrySet()) {
                OneTimePreKey otpKey = OneTimePreKey.builder()
                        .userId(userId)
                        .preKeyId(entry.getKey())
                        .publicKey(entry.getValue())
                        .uploadedAt(now)
                        .build();
                oneTimePreKeyRepository.save(otpKey);
            }
        }

        return ResponseEntity.ok().build();
    }

    @GetMapping("/fetch/{userId}")
    @Transactional
    public ResponseEntity<PreKeyBundleRequest> fetchPreKeyBundle(@PathVariable UUID userId) {
        Optional<UserE2EKey> keyOptional = userE2EKeyRepository.findById(userId);

        if (keyOptional.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        UserE2EKey key = keyOptional.get();
        PreKeyBundleRequest response = new PreKeyBundleRequest();
        response.setIdentityPublicKey(key.getIdentityPublicKey());
        response.setSignedPreKeyId(key.getSignedPreKeyId());
        response.setSignedPreKeyPublicKey(key.getSignedPreKeyPublicKey());
        response.setSignedPreKeySignature(key.getSignedPreKeySignature());
        
        response.setEncryptedPrivateKeys(key.getEncryptedPrivateKeys());

        Optional<OneTimePreKey> otpKeyOptional = oneTimePreKeyRepository.findNextAvailablePreKey(userId);

        if (otpKeyOptional.isPresent()) {
            OneTimePreKey otpKey = otpKeyOptional.get();
            response.setOneTimePreKeyId(otpKey.getPreKeyId());
            response.setOneTimePreKeyPublicKey(otpKey.getPublicKey());
            oneTimePreKeyRepository.deleteByUserIdAndPreKeyId(userId, otpKey.getPreKeyId());
        }
        
        long remainingKeys = oneTimePreKeyRepository.countByUserId(userId);
        if (remainingKeys < MIN_PREKEYS) {
        }

        return ResponseEntity.ok(response);
    }
}