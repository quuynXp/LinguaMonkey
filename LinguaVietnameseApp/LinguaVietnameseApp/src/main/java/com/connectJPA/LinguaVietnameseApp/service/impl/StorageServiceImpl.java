// package com.connectJPA.LinguaVietnameseApp.service.impl;

// import com.cloudinary.utils.ObjectUtils;
// import com.connectJPA.LinguaVietnameseApp.dto.request.MoveRequest;
// import com.connectJPA.LinguaVietnameseApp.entity.UserMedia;
// import com.connectJPA.LinguaVietnameseApp.enums.MediaType;
// import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserMediaRepository;
// import com.connectJPA.LinguaVietnameseApp.service.CloudinaryService;
// import com.connectJPA.LinguaVietnameseApp.service.StorageService;
// import lombok.RequiredArgsConstructor;
// import lombok.extern.slf4j.Slf4j;
// import org.springframework.stereotype.Service;
// import org.springframework.transaction.annotation.Transactional;
// import org.springframework.web.multipart.MultipartFile;

// import java.io.ByteArrayOutputStream;
// import java.io.InputStream;
// import java.net.URI;
// import java.net.http.HttpClient;
// import com.cloudinary.Cloudinary;
// import com.cloudinary.utils.ObjectUtils;
// import java.net.http.HttpRequest;
// import java.net.http.HttpResponse;
// import java.time.OffsetDateTime;
// import java.util.Map;
// import java.util.UUID;

// @Service
// @RequiredArgsConstructor
// @Slf4j
// public class StorageServiceImpl implements StorageService {
//     private final CloudinaryService cloudinaryService;
//     private final UserMediaRepository mediaRepo;
//     private final Cloudinary cloudinary;
//     private final HttpClient httpClient = HttpClient.newHttpClient();

//     private static final String TEMP_FOLDER = "monkeylingua/temp";
//     private static final String USER_FOLDER = "monkeylingua/users";
//     private static final String DEFAULT_RESOURCE_TYPE = "auto";

//     @Transactional
//     @Override
//     public String uploadTemp(MultipartFile file) {
//         try {
//             Map<?, ?> uploadResult = cloudinaryService.upload(
//                 file, 
//                 TEMP_FOLDER, 
//                 DEFAULT_RESOURCE_TYPE
//             );
//             return (String) uploadResult.get("public_id"); 
//         } catch (Exception e) {
//             log.error("Cloudinary upload failed (MultipartFile)", e);
//             throw new RuntimeException("Failed to upload file to Cloudinary", e);
//         }
//     }

//     @Override
//     public String uploadStream(InputStream inputStream, String objectName, String contentType) {
//         try {
//             ByteArrayOutputStream buffer = new ByteArrayOutputStream();
//             int nRead;
//             byte[] data = new byte[1024];
//             while ((nRead = inputStream.read(data, 0, data.length)) != -1) {
//                 buffer.write(data, 0, nRead);
//             }
//             buffer.flush();
//             byte[] fileBytes = buffer.toByteArray();

//             Map<?, ?> uploadResult = cloudinaryService.uploadBytes(
//                 fileBytes, 
//                 objectName, // Sử dụng objectName làm Public ID
//                 USER_FOLDER, // Upload thẳng vào folder user (vì đây là data đã được xử lý/tạo)
//                 DEFAULT_RESOURCE_TYPE
//             );
//             return (String) uploadResult.get("public_id");
//         } catch (Exception e) {
//             log.error("Cloudinary upload failed (InputStream)", e);
//             throw new RuntimeException("Failed to upload stream to Cloudinary", e);
//         }
//     }
    
//     @Transactional
//     @Override
//     public UserMedia commit(String tempPath, String newPath, UUID userId, MediaType mediaType) {
//         try {
//             String tempPublicId = tempPath; 
//             String fileNameWithExt = newPath.substring(newPath.lastIndexOf('/') + 1);
//             String finalPublicId = USER_FOLDER + "/" + fileNameWithExt;

//             MoveRequest req = new MoveRequest();
//             req.setFromPublicId(tempPublicId);
//             req.setToPublicId(finalPublicId);
//             req.setOverwrite(true);
//             req.setResourceType(DEFAULT_RESOURCE_TYPE);

//             cloudinaryService.move(req);
            
//             UserMedia media = UserMedia.builder()
//                     .filePath(finalPublicId) 
//                     .userId(userId) 
//                     .mediaType(mediaType) 
//                     .createdAt(OffsetDateTime.now())
//                     .build();

//             UserMedia savedMedia = mediaRepo.save(media);
//             savedMedia.setFileUrl(getFileUrl(finalPublicId)); 

//             return savedMedia;
//         } catch (Exception e) {
//             log.error("Commit file failed", e);
//             throw new RuntimeException("Commit file failed: " + e.getMessage(), e);
//         }
//     }

//     @Override
//     public void deleteFile(String objectPath) {
//         try {
//             cloudinary.uploader().destroy(objectPath, ObjectUtils.emptyMap());
//         } catch (Exception e) {
//             log.error("Cloudinary delete failed for publicId: {}", objectPath, e);
//             throw new RuntimeException("Delete file failed: " + e.getMessage(), e);
//         }
//     }

//     @Override
//     public String getFileUrl(String objectName) {
//         return cloudinary.url().secure(true).generate(objectName);
//     }
    
//     @Override
//     public byte[] getFile(String objectPath) {
//         String fileUrl = getFileUrl(objectPath);
//         log.warn("GET FILE: Downloading file from Cloudinary URL to simulate MinIO getFile(). Path: {}", objectPath);
//         try {
//             HttpRequest request = HttpRequest.newBuilder()
//                 .uri(new URI(fileUrl))
//                 .GET()
//                 .build();

//             HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());

//             if (response.statusCode() != 200) {
//                 log.error("Failed to download file from Cloudinary. Status: {}", response.statusCode());
//                 throw new RuntimeException("Failed to download file: " + response.statusCode());
//             }

//             return response.body();
//         } catch (Exception e) {
//             log.error("Error during file download for getFile() simulation", e);
//             throw new RuntimeException("Failed to simulate getFile from Cloudinary", e);
//         }
//     }
// }
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

    private static final String DOWNLOAD_URL_TEMPLATE = "https://drive.google.com/uc?export=download&id=%s";

    @Transactional
    @Override
    public String uploadTemp(MultipartFile file) {
        try {
            File fileMetadata = new File();
            fileMetadata.setName(file.getOriginalFilename());
            fileMetadata.setParents(Collections.singletonList(folderId));

            InputStreamContent mediaContent = new InputStreamContent(
                    file.getContentType(),
                    file.getInputStream()
            );

            File uploadedFile = driveService.files().create(fileMetadata, mediaContent)
                    .setFields("id")
                    .execute();

            Permission permission = new Permission()
                    .setType("anyone")
                    .setRole("reader");

            driveService.permissions().create(uploadedFile.getId(), permission).execute();

            return uploadedFile.getId();
        } catch (IOException e) {
            log.error("Google Drive upload failed", e);
            throw new RuntimeException("Failed to upload file to Google Drive", e);
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
            File driveFile = driveService.files().get(tempPath).setFields("name").execute();
            String fileName = driveFile.getName();

            UserMedia media = UserMedia.builder()
                    .filePath(tempPath)
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