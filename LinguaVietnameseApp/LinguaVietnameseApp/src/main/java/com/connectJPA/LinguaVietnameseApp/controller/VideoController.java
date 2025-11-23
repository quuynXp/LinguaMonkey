package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.CreateReviewRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.VideoProgressRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.VideoRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.VideoSubtitleRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.*;
import com.connectJPA.LinguaVietnameseApp.entity.Video;
import com.connectJPA.LinguaVietnameseApp.entity.VideoReview;
import com.connectJPA.LinguaVietnameseApp.entity.VideoSubtitle;
import com.connectJPA.LinguaVietnameseApp.enums.DifficultyLevel;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.VideoRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.VideoSubtitleRepository;
import com.connectJPA.LinguaVietnameseApp.service.StorageService;
import com.connectJPA.LinguaVietnameseApp.service.VideoService;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/videos")
@RequiredArgsConstructor
public class VideoController {
    private final VideoService videoService;
    private final StorageService storageService;
    private final VideoRepository videoRepository;
    private final VideoSubtitleRepository  VideoSubtitleRepository;

    @GetMapping("/bilingual")
    public AppApiResponse<Page<BilingualVideoResponse>> getBilingualVideos(
            Pageable pageable,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String level,
            Locale locale
    ) {
        Page<BilingualVideoResponse> page = videoService.getBilingualVideos(pageable, category, level);
        return AppApiResponse.<Page<BilingualVideoResponse>>builder()
                .code(200)
                .message("Bilingual videos fetched")
                .result(page)
                .build();
    }

    @PostMapping(value = "/admin/create-auto-sub", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public AppApiResponse<VideoResponse> createVideoWithAutoSub(
            @RequestParam("title") String title,
            @RequestParam("level") String level, // beginner, intermediate...
            @RequestParam("videoFile") MultipartFile videoFile,
            @RequestParam("subtitleFile") MultipartFile subtitleFile,
            @RequestParam("sourceLang") String sourceLang, // e.g., "en"
            @RequestParam("targetLang") String targetLang,
            @RequestHeader("Authorization") String bearerToken // e.g., "vi"
    ) {
        String videoPath = storageService.uploadTemp(videoFile);
        VideoRequest vReq = new VideoRequest();
        vReq.setTitle(title);
        vReq.setLevel(DifficultyLevel.valueOf(level));
        vReq.setVideoUrl(videoPath);
        VideoResponse video = videoService.createVideo(vReq);
        UUID videoId = video.getVideoId();

        String subPath = storageService.uploadTemp(subtitleFile);
        VideoSubtitleRequest subReq = new VideoSubtitleRequest();
        subReq.setLanguageCode(sourceLang);
        subReq.setSubtitleUrl(subPath);
        videoService.addSubtitle(videoId, subReq);

        String token = bearerToken.startsWith("Bearer ") ? bearerToken.substring(7) : bearerToken;

        videoService.generateTranslatedSubtitle(videoId, sourceLang, targetLang, token);

        return getVideo(videoId, targetLang);
    }

    @PostMapping(value = "/admin/create-full", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public AppApiResponse<VideoResponse> createFullVideo(
            @RequestParam("title") String title,
            @RequestParam("level") String level, // Khớp schema
            @RequestParam("sourceLang") String sourceLang,
            @RequestParam("targetLang") String targetLang,
            @RequestParam("videoFile") MultipartFile videoFile,
            @RequestParam("subtitleFile") MultipartFile subtitleFile,
            @RequestHeader(value = "Authorization", required = false) String token
    ) {
        String videoPath = storageService.uploadTemp(videoFile);

        Video v = new Video();
        v.setTitle(title);
        v.setLevel(DifficultyLevel.valueOf(level)); // Lưu ý: bảng videos có cột 'level' kiểu varchar
        v.setVideoUrl(videoPath);
        v.setLessonId(UUID.fromString("...default or param..."));
        Video savedVideo = videoRepository.save(v);

        String subPath = storageService.uploadTemp(subtitleFile);
        VideoSubtitle vs = new VideoSubtitle();
        vs.setVideoId(savedVideo.getVideoId());
        vs.setLanguageCode(sourceLang);
        vs.setSubtitleUrl(subPath);
        VideoSubtitleRepository.save(vs);

        String cleanToken = (token != null && token.startsWith("Bearer ")) ? token.substring(7) : token;
        videoService.generateTranslatedSubtitle(savedVideo.getVideoId(), sourceLang, targetLang, cleanToken);

        return AppApiResponse.<VideoResponse>builder()
                .result(videoService.getVideoById(savedVideo.getVideoId(), targetLang))
                .build();
    }

    @PostMapping("/{videoId}/subtitles/generate")
    public AppApiResponse<VideoSubtitleResponse> generateSubtitle(
            @PathVariable UUID videoId,
            @RequestParam String originalLang, // Ví dụ: "en"
            @RequestParam String targetLang,   // Ví dụ: "vi"
            @RequestHeader("Authorization") String bearerToken // Lấy token JWT để gửi sang Python
    ) {
        // Cắt chữ "Bearer " nếu cần
        String token = bearerToken.startsWith("Bearer ") ? bearerToken.substring(7) : bearerToken;

        VideoSubtitleResponse resp = videoService.generateTranslatedSubtitle(videoId, originalLang, targetLang, token);

        return AppApiResponse.<VideoSubtitleResponse>builder()
                .code(200)
                .message("Subtitle generated successfully via AI")
                .result(resp)
                .build();
    }

    @PostMapping(value = "/{videoId}/subtitles/upload", consumes = "multipart/form-data")
    public AppApiResponse<VideoSubtitleResponse> uploadSubtitleFile(
            @PathVariable UUID videoId,
            @RequestParam("file") MultipartFile file,
            @RequestParam("languageCode") String languageCode
    ) {
        String objectPath = storageService.uploadTemp(file);

        VideoSubtitleRequest req = new VideoSubtitleRequest();
        req.setLanguageCode(languageCode);
        req.setSubtitleUrl(objectPath);

        VideoSubtitleResponse resp = videoService.addSubtitle(videoId, req);

        return AppApiResponse.<VideoSubtitleResponse>builder()
                .code(201)
                .message("Subtitle uploaded and linked successfully")
                .result(resp)
                .build();
    }

    @GetMapping("/categories")
    public AppApiResponse<List<String>> getCategories() {
        List<String> cats = videoService.getVideoCategories();
        return AppApiResponse.<List<String>>builder().code(200).message("Categories").result(cats).build();
    }

    @GetMapping("/{id}")
    public AppApiResponse<VideoResponse> getVideo(
            @PathVariable UUID id,
            @RequestParam(required = false, defaultValue = "vi") String targetLang // Mặc định 'vi' nếu không truyền
    ) {
        VideoResponse resp = videoService.getVideoById(id, targetLang);

        return AppApiResponse.<VideoResponse>builder()
                .code(200)
                .message("Video fetched")
                .result(resp)
                .build();
    }

    @PostMapping("/{videoId}/like")
    public AppApiResponse<Void> likeVideo(@PathVariable UUID videoId, @RequestParam UUID userId) {
        videoService.likeVideo(videoId, userId);
        return AppApiResponse.<Void>builder().code(200).message("Video liked").build();
    }

    @GetMapping("/search")
    public AppApiResponse<Page<BilingualVideoResponse>> searchVideos(
            Pageable pageable,
            @RequestParam(required=false) String q,
            @RequestParam(required=false) String language,
            @RequestParam(required=false) String category,
            @RequestParam(required=false) String sort // e.g. "popular", "rating", "recent"
    ) {
        Page<BilingualVideoResponse> page = videoService.searchVideos(pageable, q, language, category, sort);
        return AppApiResponse.<Page<BilingualVideoResponse>>builder().code(200).message("Search results").result(page).build();
    }

    @DeleteMapping("/{videoId}/like")
    public AppApiResponse<Void> unlikeVideo(@PathVariable UUID videoId, @RequestParam UUID userId) {
        videoService.unlikeVideo(videoId, userId);
        return AppApiResponse.<Void>builder().code(200).message("Video unliked").build();
    }

    @PostMapping("/{videoId}/reviews")
    public AppApiResponse<VideoReviewResponse> addReview(@PathVariable UUID videoId, @RequestBody CreateReviewRequest req) {
        VideoReview r = videoService.createReview(videoId, req.getUserId(), req.getRating(), req.getContent());
        return AppApiResponse.<VideoReviewResponse>builder().code(201).message("Review created").result(map(r)).build();
    }

    @PostMapping("/reviews/{reviewId}/react")
    public AppApiResponse<Void> reactReview(@PathVariable UUID reviewId, @RequestParam UUID userId, @RequestParam int reaction) {
        videoService.reactReview(reviewId, userId, (short)reaction);
        return AppApiResponse.<Void>builder().code(200).message("Reacted").build();
    }


    @PostMapping("/{videoId}/favorite")
    public AppApiResponse<Void> favoriteVideo(@PathVariable UUID videoId, @RequestParam UUID userId) {
        videoService.favoriteVideo(videoId, userId);
        return AppApiResponse.<Void>builder().code(200).message("Video favorited").build();
    }

    @DeleteMapping("/{videoId}/favorite")
    public AppApiResponse<Void> unfavoriteVideo(@PathVariable UUID videoId, @RequestParam UUID userId) {
        videoService.unfavoriteVideo(videoId, userId);
        return AppApiResponse.<Void>builder().code(200).message("Video unfavorited").build();
    }

    @PostMapping("/{videoId}/progress")
    public AppApiResponse<Void> trackProgress(@PathVariable UUID videoId, @RequestBody VideoProgressRequest request) {
        videoService.trackProgress(videoId, request);
        return AppApiResponse.<Void>builder().code(200).message("Progress updated").build();
    }


    @PostMapping
    public AppApiResponse<VideoResponse> createVideo(@RequestBody VideoRequest request) {
        VideoResponse r = videoService.createVideo(request);
        return AppApiResponse.<VideoResponse>builder().code(200).message("Video created").result(r).build();
    }

    @PutMapping("/{id}")
    public AppApiResponse<VideoResponse> updateVideo(@PathVariable UUID id, @RequestBody VideoRequest request) {
        VideoResponse r = videoService.updateVideo(id, request);
        return AppApiResponse.<VideoResponse>builder().code(200).message("Video updated").result(r).build();
    }

    @DeleteMapping("/{id}")
    public AppApiResponse<Void> deleteVideo(@PathVariable UUID id) {
        videoService.deleteVideo(id);
        return AppApiResponse.<Void>builder().code(200).message("Video deleted").build();
    }

    @PostMapping("/{videoId}/subtitles")
    public AppApiResponse<VideoSubtitleResponse> addSubtitle(@PathVariable UUID videoId, @RequestBody VideoSubtitleRequest request) {
        VideoSubtitleResponse r = videoService.addSubtitle(videoId, request);
        return AppApiResponse.<VideoSubtitleResponse>builder().code(201).message("Subtitle added").result(r).build();
    }

    @GetMapping("/{videoId}/subtitles")
    public AppApiResponse<List<VideoSubtitleResponse>> getSubtitles(@PathVariable UUID videoId) {
        List<VideoSubtitleResponse> list = videoService.getSubtitles(videoId);
        return AppApiResponse.<List<VideoSubtitleResponse>>builder().code(200).message("Subtitles").result(list).build();
    }

    @DeleteMapping("/{videoId}/subtitles/{subtitleId}")
    public AppApiResponse<Void> deleteSubtitle(@PathVariable UUID videoId, @PathVariable UUID subtitleId) {
        videoService.deleteSubtitle(subtitleId);
        return AppApiResponse.<Void>builder().code(200).message("Subtitle deleted").build();
    }

    private VideoReviewResponse map(VideoReview r) {
        VideoReviewResponse resp = new VideoReviewResponse();
        resp.setReviewId(r.getReviewId());
        resp.setVideoId(r.getVideoId());
        resp.setUserId(r.getUserId());
        resp.setRating(r.getRating());
        resp.setContent(r.getContent());
        resp.setCreatedAt(r.getCreatedAt());
        resp.setUpdatedAt(r.getUpdatedAt());
        resp.setLikeCount(0);
        resp.setDislikeCount(0);
        return resp;
    }

}
