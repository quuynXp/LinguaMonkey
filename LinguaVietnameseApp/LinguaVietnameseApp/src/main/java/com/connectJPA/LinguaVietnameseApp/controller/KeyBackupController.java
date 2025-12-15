package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.entity.UserPrivateKeyBackup;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserPrivateKeyBackupRepository;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/keys/backup")
@RequiredArgsConstructor
public class KeyBackupController {

    private final UserPrivateKeyBackupRepository backupRepository;

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class KeyBackupRequest {
        private String encryptedIdentityPrivateKey;
        private String encryptedSigningPrivateKey;
        private String encryptedSignedPreKeyPrivate;
    }

    @PostMapping("/{userId}")
    @Transactional
    public ResponseEntity<AppApiResponse<Void>> backupKeys(
            @PathVariable UUID userId,
            @RequestBody KeyBackupRequest request) {

        UserPrivateKeyBackup backup = UserPrivateKeyBackup.builder()
                .userId(userId)
                .encryptedIdentityPrivateKey(request.getEncryptedIdentityPrivateKey())
                .encryptedSigningPrivateKey(request.getEncryptedSigningPrivateKey())
                .encryptedSignedPreKeyPrivate(request.getEncryptedSignedPreKeyPrivate())
                .build();

        backupRepository.save(backup);

        return ResponseEntity.ok(AppApiResponse.<Void>builder()
                .code(200)
                .message("Keys backed up successfully")
                .build());
    }

    @GetMapping("/{userId}")
    public ResponseEntity<AppApiResponse<UserPrivateKeyBackup>> getBackup(@PathVariable UUID userId) {
        return backupRepository.findById(userId)
                .map(backup -> ResponseEntity.ok(AppApiResponse.<UserPrivateKeyBackup>builder()
                        .code(200)
                        .result(backup)
                        .build()))
                .orElse(ResponseEntity.ok(AppApiResponse.<UserPrivateKeyBackup>builder()
                        .code(404)
                        .message("No backup found")
                        .build()));
    }
}