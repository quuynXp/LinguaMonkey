// package com.connectJPA.LinguaVietnameseApp.scheduler;

// import io.minio.ListObjectsArgs;
// import io.minio.MinioClient;
// import io.minio.RemoveObjectArgs;
// import io.minio.Result;
// import io.minio.messages.Item;
// import lombok.RequiredArgsConstructor;
// import lombok.extern.slf4j.Slf4j;
// import org.springframework.beans.factory.annotation.Value;
// import org.springframework.scheduling.annotation.Scheduled;
// import org.springframework.stereotype.Service;

// @Service
// @RequiredArgsConstructor
// @Slf4j
// public class MinioCleanupService {

//     private final MinioClient minioClient;

//     @Value("${minio.bucket-name}")
//     private String bucket;

//     @Scheduled(cron = "0 0 * * * *") // mỗi giờ
//     public void cleanupTempFiles() {
//         try {
//             Iterable<Result<Item>> results = minioClient.listObjects(
//                     ListObjectsArgs.builder().bucket(bucket).prefix("temp/").recursive(true).build()
//             );
//             for (Result<Item> r : results) {
//                 Item item = r.get();
//                 if (item.lastModified().isBefore(java.time.ZonedDateTime.now().minusHours(2))) {
//                     minioClient.removeObject(RemoveObjectArgs.builder()
//                             .bucket(bucket)
//                             .object(item.objectName())
//                             .build());
//                     log.info("🧹 Deleted temp file: {}", item.objectName());
//                 }
//             }
//         } catch (Exception e) {
//             log.error("Cleanup temp files failed", e);
//         }
//     }
// }

