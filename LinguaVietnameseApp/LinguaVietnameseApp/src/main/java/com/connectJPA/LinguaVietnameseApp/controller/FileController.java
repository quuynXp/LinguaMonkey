package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.entity.UserMedia;
import com.connectJPA.LinguaVietnameseApp.enums.MediaType;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserMediaRepository;
import com.connectJPA.LinguaVietnameseApp.service.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/files")
public class FileController {

    private final StorageService storageService;
    private final UserMediaRepository userMediaRepository;

    @PostMapping("/upload-temp")
    public ResponseEntity<?> uploadTemp(@RequestPart("file") MultipartFile file) {
        return ResponseEntity.ok(storageService.uploadTemp(file));
    }

    @DeleteMapping("/temp")
    public ResponseEntity<?> deleteTemp(@RequestParam String path) {
        storageService.deleteFile(path);
        return ResponseEntity.ok("Deleted");
    }

    /**
     * Lấy tất cả media của một user (giải quyết yêu cầu #3)
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<UserMedia>> getUserMedia(@PathVariable UUID userId,
                                                        @RequestParam(required = false) MediaType type) {
        List<UserMedia> mediaList;
        if (type != null) {
            mediaList = userMediaRepository.findByUserIdAndMediaType(userId, type);
        } else {
            mediaList = userMediaRepository.findByUserId(userId);
        }

        // Gán URL đầy đủ cho mỗi file trước khi trả về
        mediaList.forEach(media ->
                media.setFileUrl(storageService.getFileUrl(media.getFilePath()))
        );

        return ResponseEntity.ok(mediaList);
    }
}
