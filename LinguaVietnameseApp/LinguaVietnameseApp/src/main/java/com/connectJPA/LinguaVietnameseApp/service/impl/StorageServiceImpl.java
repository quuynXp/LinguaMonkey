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

import java.io.BufferedInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class StorageServiceImpl implements StorageService {

    private final Drive driveService;
    private final UserMediaRepository mediaRepo;

    @Value("${google.drive.folderId}")
    private String folderId;

    private static final long MAX_FILE_SIZE = 500 * 1024 * 1024;
    private static final String THUMBNAIL_URL_TEMPLATE = "https://drive.google.com/thumbnail?id=%s&sz=w1920";
    private static final String BINARY_URL_TEMPLATE = "https://drive.google.com/uc?export=download&id=%s";

    @Transactional
    @Override
    public String uploadTemp(MultipartFile file) {
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new RuntimeException("File too large. Max size is 500MB.");
        }

        try {
            return uploadStream(file.getInputStream(), file.getOriginalFilename(), file.getContentType());
        } catch (IOException e) {
            log.error("Upload failed", e);
            throw new RuntimeException("Failed to upload file", e);
        }
    }

    public String uploadBytes(byte[] data, String fileName, String contentType) {
        return uploadStream(new java.io.ByteArrayInputStream(data), fileName, contentType);
    }

    @Override
    public String uploadStream(InputStream inputStream, String fileName, String contentType) {
        try {
            File fileMetadata = new File();
            fileMetadata.setName(fileName);
            fileMetadata.setParents(Collections.singletonList(folderId));

            BufferedInputStream bufferedInputStream = new BufferedInputStream(inputStream);
            InputStreamContent mediaContent = new InputStreamContent(contentType, bufferedInputStream);

            File uploadedFile = driveService.files().create(fileMetadata, mediaContent)
                    .setFields("id, thumbnailLink, webContentLink, webViewLink")
                    .execute();

            String fileId = uploadedFile.getId();

            try {
                Permission permission = new Permission().setType("anyone").setRole("reader");
                driveService.permissions().create(fileId, permission).execute();
            } catch (Exception e) {
                log.warn("Could not set public permission for file {}", fileId);
            }

            if (contentType != null && contentType.startsWith("image/") && uploadedFile.getThumbnailLink() != null) {
                return uploadedFile.getThumbnailLink().replace("=s220", "=s1920");
            }

            return uploadedFile.getWebContentLink() != null
                    ? uploadedFile.getWebContentLink()
                    : String.format(BINARY_URL_TEMPLATE, fileId);

        } catch (IOException e) {
            log.error("Google Drive stream upload failed", e);
            throw new RuntimeException("Failed to upload stream to Google Drive", e);
        }
    }

    @Transactional
    @Override
    public UserMedia commit(String tempPath, String newPath, UUID userId, MediaType mediaType) {
        try {
            String fileId = extractFileId(tempPath);
            File driveFile = driveService.files().get(fileId)
                    .setFields("id, name, thumbnailLink, webContentLink")
                    .execute();

            String fileName = driveFile.getName();

            UserMedia media = UserMedia.builder()
                    .filePath(fileId)
                    .fileName(fileName)
                    .userId(userId)
                    .mediaType(mediaType)
                    .createdAt(OffsetDateTime.now())
                    .build();

            String optimizedUrl;
            if (mediaType == MediaType.IMAGE && driveFile.getThumbnailLink() != null) {
                optimizedUrl = driveFile.getThumbnailLink().replace("=s220", "=s1920");
            } else {
                optimizedUrl = driveFile.getWebContentLink() != null
                        ? driveFile.getWebContentLink()
                        : String.format(BINARY_URL_TEMPLATE, fileId);
            }

            media.setFileUrl(optimizedUrl);

            return mediaRepo.save(media);
        } catch (IOException e) {
            log.error("Commit Drive file failed. TempPath: {}", tempPath, e);
            throw new RuntimeException("Commit Drive file failed", e);
        }
    }

    private String extractFileId(String url) {
        if (url == null) return "";
        Pattern pattern = Pattern.compile("id=([a-zA-Z0-9_-]+)|/d/([a-zA-Z0-9_-]+)");
        Matcher matcher = pattern.matcher(url);

        if (url.contains("/file/d/") || url.contains("/d/") || url.contains("id=")) {
            while (matcher.find()) {
                String candidate = matcher.group(1) != null ? matcher.group(1) : matcher.group(2);
                if (candidate != null && !candidate.contains("http") && !candidate.contains("google")) {
                    return candidate;
                }
            }
        }
        if (url.matches("^[a-zA-Z0-9_-]+$")) {
            return url;
        }
        return url;
    }

    @Override
    public void deleteFile(String objectPath) {
        try {
            String fileId = extractFileId(objectPath);
            if (fileId.contains("http")) return;
            driveService.files().delete(fileId).execute();
        } catch (IOException e) {
            log.error("Delete failed for File path: {}", objectPath, e);
            throw new RuntimeException("Delete file failed", e);
        }
    }

    @Override
    public String getFileUrl(String fileId) {
        return String.format(THUMBNAIL_URL_TEMPLATE, fileId);
    }

    public String getFileUrl(String fileId, MediaType type) {
        if (type == MediaType.IMAGE) {
            return String.format(THUMBNAIL_URL_TEMPLATE, fileId);
        }
        return String.format(BINARY_URL_TEMPLATE, fileId);
    }

    @Override
    public byte[] getFile(String objectPath) {
        throw new UnsupportedOperationException("Not supported");
    }
}