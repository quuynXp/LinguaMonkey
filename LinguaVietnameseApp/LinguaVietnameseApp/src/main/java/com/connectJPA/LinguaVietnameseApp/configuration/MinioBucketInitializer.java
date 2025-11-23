// package com.connectJPA.LinguaVietnameseApp.configuration;

// import io.minio.BucketExistsArgs;
// import io.minio.MakeBucketArgs;
// import io.minio.MinioClient;
// import lombok.RequiredArgsConstructor;
// import lombok.extern.slf4j.Slf4j;
// import org.springframework.beans.factory.annotation.Value;
// import org.springframework.boot.ApplicationArguments;
// import org.springframework.boot.ApplicationRunner;
// import org.springframework.stereotype.Component;

// @Component
// @RequiredArgsConstructor
// @Slf4j
// public class MinioBucketInitializer implements ApplicationRunner {

//     private final MinioClient minioClient; // Inject MinioClient

//     @Value("${minio.bucket-name}")
//     private String bucket;

//     @Override
//     public void run(ApplicationArguments args) throws Exception {
//         try {
//             log.info("Checking if MinIO bucket '{}' exists...", bucket);
//             boolean found = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucket).build());
//             if (!found) {
//                 log.warn("Bucket '{}' not found. Creating it...", bucket);
//                 minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
//                 log.info("Bucket '{}' created successfully.", bucket);
//             } else {
//                 log.info("Bucket '{}' already exists.", bucket);
//             }
//         } catch (Exception e) {
//             log.error("Failed to ensure MinIO bucket exists: {}", e.getMessage(), e);
//             throw new RuntimeException("Failed to ensure bucket exists: " + e.getMessage(), e);
//         }
//     }
// }