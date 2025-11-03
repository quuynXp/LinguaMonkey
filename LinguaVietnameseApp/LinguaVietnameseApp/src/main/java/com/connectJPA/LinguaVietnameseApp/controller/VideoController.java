package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.CreateReviewRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.VideoProgressRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.VideoRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.VideoSubtitleRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.*;
import com.connectJPA.LinguaVietnameseApp.entity.VideoReview;
import com.connectJPA.LinguaVietnameseApp.service.VideoService;
import io.swagger.v3.oas.annotations.Operation;
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

    @GetMapping("/categories")
    public AppApiResponse<List<String>> getCategories() {
        List<String> cats = videoService.getVideoCategories();
        return AppApiResponse.<List<String>>builder().code(200).message("Categories").result(cats).build();
    }

    @GetMapping("/{id}")
    public AppApiResponse<VideoResponse> getVideo(@PathVariable UUID id) {
        VideoResponse resp = videoService.getVideoById(id);
        return AppApiResponse.<VideoResponse>builder().code(200).message("Video fetched").result(resp).build();
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
