package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.entity.UserMedia;
import com.connectJPA.LinguaVietnameseApp.enums.MediaType;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.UUID;

public interface MinioService {
    String uploadTemp(MultipartFile file);

    UserMedia commit(String tempPath, String newPath, UUID userId, MediaType mediaType);

    byte[] getFile(String objectPath);


    void deleteFile(String objectPath);


    String getFileUrl(String objectName);
}
