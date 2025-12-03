package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.entity.UserMedia;
import com.connectJPA.LinguaVietnameseApp.enums.MediaType;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserMediaRepository;
import com.connectJPA.LinguaVietnameseApp.service.StorageService;
import com.google.api.client.http.InputStreamContent;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.model.File;
import com.google.api.services.drive.model.Permission;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class StorageServiceImpl implements StorageService {

    private final Drive driveService;
    private final UserMediaRepository mediaRepo;

    @Value("${google.drive.folderId}")
    private String folderId;

    // Link download trực tiếp (lưu ý: link này cần file được set permission public reader nếu user không đăng nhập Google)
    private static final String DOWNLOAD_URL_TEMPLATE = "https://drive.google.com/uc?export=download&id=%s";

    @Transactional
    @Override
    public String uploadTemp(MultipartFile file) {
        try {
            return uploadBytes(file.getBytes(), file.getOriginalFilename(), file.getContentType());
        } catch (IOException e) {
            log.error("Google Drive upload failed", e);
            throw new RuntimeException("Failed to upload file to Google Drive", e);
        }
    }

    public String uploadBytes(byte[] data, String fileName, String contentType) {
        try {
            File fileMetadata = new File();
            fileMetadata.setName(fileName);
            fileMetadata.setParents(Collections.singletonList(folderId));

            InputStreamContent mediaContent = new InputStreamContent(
                    contentType,
                    new ByteArrayInputStream(data)
            );

            // Upload file
            File uploadedFile = driveService.files().create(fileMetadata, mediaContent)
                    .setFields("id, webContentLink, webViewLink")
                    .execute();

            String fileId = uploadedFile.getId();

            // Cấp quyền "Anyone with link" là "Reader" để thẻ <Image> hoặc <Video> ở Frontend load được
            try {
                Permission permission = new Permission()
                        .setType("anyone")
                        .setRole("reader");
                driveService.permissions().create(fileId, permission).execute();
            } catch (Exception e) {
                log.warn("Could not set public permission for file {}. Frontend might not view it.", fileId);
            }

            log.info("Uploaded {} to Drive (OAuth2). ID: {}", fileName, fileId);
            return fileId;
        } catch (IOException e) {
            log.error("Google Drive byte upload failed", e);
            throw new RuntimeException("Failed to upload bytes to Google Drive: " + e.getMessage(), e);
        }
    }

    @Override
    public String uploadStream(InputStream inputStream, String objectName, String contentType) {
        throw new UnsupportedOperationException("Upload stream not implemented for Drive");
    }

    @Transactional
    @Override
    public UserMedia commit(String tempPath, String newPath, UUID userId, MediaType mediaType) {
        try {
            // tempPath chính là fileId trong Google Drive
            File driveFile = driveService.files().get(tempPath).setFields("name").execute();
            String fileName = driveFile.getName();

            // Nếu muốn rename file theo newPath (logic cũ), Drive API dùng lệnh update.
            // Tuy nhiên với Drive, ID là định danh duy nhất, tên file chỉ là display.
            // Ở đây ta giữ nguyên ID, chỉ lưu vào DB.

            UserMedia media = UserMedia.builder()
                    .filePath(tempPath) // Lưu fileId vào DB
                    .fileName(fileName)
                    .userId(userId)
                    .mediaType(mediaType)
                    .createdAt(OffsetDateTime.now())
                    .build();

            UserMedia savedMedia = mediaRepo.save(media);
            savedMedia.setFileUrl(getFileUrl(tempPath));

            return savedMedia;
        } catch (IOException e) {
            log.error("Commit Drive file failed", e);
            throw new RuntimeException("Commit Drive file failed: " + e.getMessage(), e);
        }
    }

    @Override
    public void deleteFile(String objectPath) {
        try {
            driveService.files().delete(objectPath).execute();
            log.info("Deleted file from Drive: {}", objectPath);
        } catch (IOException e) {
            log.error("Google Drive delete failed for File ID: {}", objectPath, e);
            throw new RuntimeException("Delete file failed: " + e.getMessage(), e);
        }
    }

    @Override
    public String getFileUrl(String objectName) {
        return String.format(DOWNLOAD_URL_TEMPLATE, objectName);
    }

    @Override
    public byte[] getFile(String objectPath) {
        throw new UnsupportedOperationException("Direct file download not supported for Drive streaming setup");
    }
}