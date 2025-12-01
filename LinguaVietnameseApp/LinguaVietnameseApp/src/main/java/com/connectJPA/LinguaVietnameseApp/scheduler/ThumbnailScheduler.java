// package com.connectJPA.LinguaVietnameseApp.scheduler;

// import com.connectJPA.LinguaVietnameseApp.service.ThumbnailGenerationService;
// import lombok.RequiredArgsConstructor;
// import lombok.extern.slf4j.Slf4j;
// import org.springframework.scheduling.annotation.Scheduled;
// import org.springframework.stereotype.Component;

// @Component
// @RequiredArgsConstructor
// @Slf4j
// public class ThumbnailScheduler {

//     private final ThumbnailGenerationService thumbnailGenerationService;

//     @Scheduled(cron = "0 0 3 * * *")
//     public void runMissingThumbnailJob() {
//         log.info("Triggering daily thumbnail generation job at 03:00 AM.");
//         thumbnailGenerationService.generateAndUploadAllMissingThumbnails();
//     }
// }