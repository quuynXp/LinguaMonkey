package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.entity.UserMedia;
import com.connectJPA.LinguaVietnameseApp.enums.MediaType;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserMediaRepository;
import com.connectJPA.LinguaVietnameseApp.service.MinioService;
import io.minio.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MinioServiceImpl implements MinioService {
    private final MinioClient minioClient;
    private final UserMediaRepository mediaRepo;

    @Value("${minio.bucket-name}")
    private String bucket;

    @Transactional
    @Override
    public String uploadTemp(MultipartFile file) {
        try (InputStream inputStream = file.getInputStream()) {
            String fileName = "temp/" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"))
                    + "_" + file.getOriginalFilename();

            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucket)
                            .object(fileName)
                            .stream(inputStream, file.getSize(), -1)
                            .contentType(file.getContentType())
                            .build()
            );

            // **THAY ĐỔI: Trả về path (object name) thay vì URL**
            return fileName;
        } catch (Exception e) {
            throw new RuntimeException("Failed to upload file: " + e.getMessage(), e);
        }
    }

    @Override
    public String uploadStream(InputStream inputStream, String objectName, String contentType) {
        try {
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucket)
                            .object(objectName)
                            .stream(inputStream, inputStream.available(), -1)
                            .contentType(contentType)
                            .build()
            );
            return objectName;
        } catch (Exception e) {
            throw new RuntimeException("Upload failed", e);
        }
    }

    @Transactional
    @Override
    public UserMedia commit(String tempPath, String newPath, UUID userId, MediaType mediaType) {
        try {
            minioClient.copyObject(
                    CopyObjectArgs.builder()
                            .bucket(bucket)
                            .object(newPath)
                            .source(CopySource.builder().bucket(bucket).object(tempPath).build())
                            .build()
            );
            minioClient.removeObject(RemoveObjectArgs.builder().bucket(bucket).object(tempPath).build());

            // **THAY ĐỔI: Lưu metadata vào DB với userId và mediaType**
            UserMedia media = UserMedia.builder()
                    .filePath(newPath)
                    .userId(userId) // Thêm userId
                    .mediaType(mediaType) // Thêm mediaType
                    .createdAt(OffsetDateTime.now())
                    .build();

            UserMedia savedMedia = mediaRepo.save(media);

            // Set URL vào trường @Transient để trả về cho controller
            savedMedia.setFileUrl(getFileUrl(newPath));

            return savedMedia;
        } catch (Exception e) {
            throw new RuntimeException("Commit file failed: " + e.getMessage(), e);
        }
    }

    @Transactional
    @Override
    public byte[] getFile(String objectPath) {
        try (InputStream stream = minioClient.getObject(GetObjectArgs.builder()
                .bucket(bucket)
                .object(objectPath)
                .build())) {
            return stream.readAllBytes();
        } catch (Exception e) {
            throw new RuntimeException("Get file failed: " + e.getMessage(), e);
        }
    }

    @Transactional
    @Override
    public void deleteFile(String objectPath) {
        try {
            minioClient.removeObject(RemoveObjectArgs.builder()
                    .bucket(bucket)
                    .object(objectPath)
                    .build());
        } catch (Exception e) {
            throw new RuntimeException("Delete file failed: " + e.getMessage(), e);
        }
    }

    @Transactional
    @Override
    public String getFileUrl(String objectName) {
        return String.format("%s/%s/%s", System.getenv("MINIO_PUBLIC_URL"), bucket, objectName);
    }
}
