package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.VideoProgressRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.VideoRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.VideoSubtitleRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.BilingualVideoResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.VideoResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.VideoSubtitleResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface VideoService {
    Page<BilingualVideoResponse> getBilingualVideos(Pageable pageable, String category, String level);
    List<String> getVideoCategories();
    VideoResponse getVideoById(UUID id);
    VideoResponse createVideo(VideoRequest request);
    VideoResponse updateVideo(UUID id, VideoRequest request);
    void deleteVideo(UUID id);
    VideoSubtitleResponse addSubtitle(UUID videoId, VideoSubtitleRequest request);
    List<VideoSubtitleResponse> getSubtitles(UUID videoId);
    void deleteSubtitle(UUID subtitleId);
    public void likeVideo(UUID videoId, UUID userId);
    public void unlikeVideo(UUID videoId, UUID userId);
    public void favoriteVideo(UUID videoId, UUID userId);
    public void unfavoriteVideo(UUID videoId, UUID userId);
    public void trackProgress(UUID videoId, VideoProgressRequest request);
    void recordProgress(UUID videoId, VideoProgressRequest progressRequest);
}
