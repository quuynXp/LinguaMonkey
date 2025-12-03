package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.entity.UserMedia;
import com.connectJPA.LinguaVietnameseApp.enums.MediaType;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.UUID;

public interface StorageService {
    
    String uploadTemp(MultipartFile file);

    String uploadBytes(byte[] data, String fileName, String contentType); // <--- THÊM KHAI BÁO NÀY

    String uploadStream(InputStream inputStream, String objectName, String contentType);

    UserMedia commit(String tempPath, String newPath, UUID userId, MediaType mediaType);

    void deleteFile(String objectPath);

    String getFileUrl(String objectName);

    byte[] getFile(String objectPath);
}