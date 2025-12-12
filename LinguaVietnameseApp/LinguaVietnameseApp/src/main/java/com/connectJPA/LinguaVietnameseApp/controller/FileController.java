package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.response.FileResponse;
import com.connectJPA.LinguaVietnameseApp.entity.UserMedia;
import com.connectJPA.LinguaVietnameseApp.enums.MediaType;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserMediaRepository;
import com.connectJPA.LinguaVietnameseApp.service.StorageService;
import com.connectJPA.LinguaVietnameseApp.service.VirusScanService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/files")
public class FileController {

    private final StorageService storageService;
    private final UserMediaRepository userMediaRepository;

    @Autowired
    private VirusScanService virusScanService;

    @PostMapping(value = "/upload-temp", consumes = "multipart/form-data")
    public ResponseEntity<?> uploadTemp(@RequestPart("file") MultipartFile file) {
        log.info("Received upload request. Name: {}, Size: {}", file.getOriginalFilename(), file.getSize());
        
        if (!virusScanService.isSafeByHash(file)) {
            return ResponseEntity.status(400).body("File bị phát hiện có chứa mã độc.");
        }

        String fileId = storageService.uploadTemp(file);
        String fileUrl = storageService.getFileUrl(fileId);

        FileResponse response = FileResponse.builder()
                .fileId(fileId)
                .fileUrl(fileUrl)
                .fileName(file.getOriginalFilename())
                .fileType(file.getContentType())
                .size(file.getSize())
                .build();

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/temp")
    public ResponseEntity<Map<String, String>> deleteTemp(@RequestParam String path) {
        storageService.deleteFile(path);
        return ResponseEntity.ok(Collections.singletonMap("message", "File deleted successfully"));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<UserMedia>> getUserMedia(@PathVariable UUID userId,
                                                        @RequestParam(required = false) MediaType type) {
        List<UserMedia> mediaList;
        if (type != null) {
            mediaList = userMediaRepository.findByUserIdAndMediaType(userId, type);
        } else {
            mediaList = userMediaRepository.findByUserId(userId);
        }

        mediaList.forEach(media ->
                media.setFileUrl(storageService.getFileUrl(media.getFilePath()))
        );

        return ResponseEntity.ok(mediaList);
    }
}