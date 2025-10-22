package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.VideoProgressRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.VideoRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.VideoSubtitleRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.BilingualVideoResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.VideoResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.VideoSubtitleResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
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
}
