package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.entity.UserMedia;
import com.connectJPA.LinguaVietnameseApp.enums.MediaType;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserMediaRepository;
import com.connectJPA.LinguaVietnameseApp.service.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/files")
public class FileController {

    private final StorageService storageService;
    private final UserMediaRepository userMediaRepository;

    @PostMapping(value = "/upload-temp", consumes = "multipart/form-data")
    public ResponseEntity<?> uploadTemp(@RequestPart("file") MultipartFile file) {
        log.info("Received upload request. Name: {}, Size: {}", file.getOriginalFilename(), file.getSize());
        return ResponseEntity.ok(storageService.uploadTemp(file));
    }

    @DeleteMapping("/temp")
    public ResponseEntity<?> deleteTemp(@RequestParam String path) {
        storageService.deleteFile(path);
        return ResponseEntity.ok("Deleted");
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