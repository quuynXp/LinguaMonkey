package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.BilingualSubtitleDTO;
import com.connectJPA.LinguaVietnameseApp.dto.SubtitleItem;
import com.connectJPA.LinguaVietnameseApp.dto.request.VideoProgressRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.VideoRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.VideoSubtitleRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.BilingualVideoResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.VideoResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.VideoSubtitleResponse;
import com.connectJPA.LinguaVietnameseApp.entity.*;
import com.connectJPA.LinguaVietnameseApp.enums.VideoType;
import com.connectJPA.LinguaVietnameseApp.grpc.GrpcClientService;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.*;
import com.connectJPA.LinguaVietnameseApp.service.StorageService;
import com.connectJPA.LinguaVietnameseApp.service.VideoService;
import com.connectJPA.LinguaVietnameseApp.utils.SubtitleUtils;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class VideoServiceImpl implements VideoService {

    private final VideoRepository videoRepository;
    private final VideoSubtitleRepository subtitleRepository;
    private final ReviewReactionRepository reviewReactionRepository;
    private final VideoReactionRepository videoReactionRepository;
    private final VideoReviewRepository videoReviewRepository;
    private final StorageService storageService;
    private final SubtitleUtils subtitleUtils;
    private final GrpcClientService grpcClientService;

    @Override
    public Page<BilingualVideoResponse> getBilingualVideos(Pageable pageable, String category, String level) {
        Page<Video> page;
        VideoType type = null;
        if (category != null && !category.isEmpty()) {
            try { type = VideoType.valueOf(category.toUpperCase()); } catch (Exception ignored) {}
        }

        if (type != null && level != null && !level.isEmpty()) {
            page = videoRepository.findAllByTypeAndLevel(type, level, pageable);
        } else if (type != null) {
            page = videoRepository.findAllByType(type, pageable);
        } else if (level != null && !level.isEmpty()) {
            page = videoRepository.findAllByLevel(level, pageable);
        } else {
            page = videoRepository.findAll(pageable);
        }
        return searchVideos(pageable, null, null, category, "recent");
    }

    private void upsertReaction(UUID videoId, UUID userId, Short reactionValue) {
        VideoReaction existing = videoReactionRepository.findByVideoIdAndUserId(videoId, userId).orElse(null);
        if (existing == null) {
            VideoReaction r = new VideoReaction();
            r.setVideoId(videoId);
            r.setUserId(userId);
            r.setReaction(reactionValue);
            videoReactionRepository.save(r);
        } else {
            if (existing.getReaction().equals(reactionValue)) {
                // already same reaction -> no-op
            } else {
                existing.setReaction(reactionValue);
                videoReactionRepository.save(existing);
            }
        }
    }

    @Override
    @Transactional
    public VideoReview createReview(UUID videoId, UUID userId, Integer rating, String content) {
        VideoReview review = new VideoReview();
        review.setVideoId(videoId);
        review.setUserId(userId);
        review.setRating(rating);
        review.setContent(content);
        review.setCreatedAt(OffsetDateTime.now());
        return videoReviewRepository.save(review);
    }

    @Transactional
    public void reactReview(UUID reviewId, UUID userId, Short reaction) {
        ReviewReaction existing = reviewReactionRepository.findByReviewIdAndUserId(reviewId, userId).orElse(null);
        if (existing == null) {
            ReviewReaction rr = new ReviewReaction();
            rr.setReviewId(reviewId);
            rr.setUserId(userId);
            rr.setReaction(reaction);
            reviewReactionRepository.save(rr);
        } else {
            if (existing.getReaction().equals(reaction)) {
                reviewReactionRepository.delete(existing); // toggle off
            } else {
                existing.setReaction(reaction);
                reviewReactionRepository.save(existing);
            }
        }
    }

    @Override
    @Transactional
    public VideoSubtitleResponse generateTranslatedSubtitle(UUID videoId, String originalLang, String targetLang, String token) {
        // 1. Tìm video và Subtitle gốc
        videoRepository.findById(videoId).orElseThrow(() -> new RuntimeException("Video not found"));

        VideoSubtitle sourceSub = subtitleRepository.findByVideoId(videoId).stream()
                .filter(s -> s.getLanguageCode().equalsIgnoreCase(originalLang))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Source subtitle (" + originalLang + ") not found. Please upload it first."));

        // 2. Download file gốc từ MinIO
        byte[] sourceBytes = storageService.getFile(sourceSub.getSubtitleUrl());
        List<SubtitleItem> sourceItems = subtitleUtils.parseSrt(new ByteArrayInputStream(sourceBytes));

        // 3. Gọi gRPC Python để dịch từng dòng (Dùng Async để nhanh hơn)
        List<CompletableFuture<Void>> futures = new ArrayList<>();
        List<SubtitleItem> translatedItems = new ArrayList<>();

        // Copy structure
        for (SubtitleItem item : sourceItems) {
            SubtitleItem newItem = new SubtitleItem(item.getId(), item.getStartTime(), item.getEndTime(), "");
            translatedItems.add(newItem);

            // Gọi Async Translate
            CompletableFuture<Void> future = grpcClientService.callTranslateAsync(token, item.getText(), originalLang, targetLang)
                    .thenAccept(response -> {
                        if (response != null && !response.getError().isEmpty()) {
                            System.err.println("Translation Error: " + response.getError());
                            newItem.setText(item.getText()); // Fallback về gốc nếu lỗi
                        } else {
                            newItem.setText(response.getTranslatedText());
                        }
                    }).exceptionally(e -> {
                        System.err.println("gRPC Fail: " + e.getMessage());
                        newItem.setText(item.getText());
                        return null;
                    });
            futures.add(future);
        }

        // Chờ tất cả các dòng dịch xong
        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();

        // 4. Tạo file .srt mới từ list đã dịch
        byte[] newSrtContent = subtitleUtils.createSrtFile(translatedItems);

        // 5. Upload file mới lên MinIO
        // Tạo MultipartFile ảo hoặc upload trực tiếp byte[] (Cần sửa storageService xíu hoặc dùng InputStream)
        String fileName = "subtitles/" + videoId + "_" + targetLang + "_" + System.currentTimeMillis() + ".srt";
        String newUrl = uploadBytesToMinio(newSrtContent, fileName); // Hàm helper bên dưới

        // 6. Lưu vào Database
        VideoSubtitle newSub = new VideoSubtitle();
        newSub.setVideoId(videoId);
        newSub.setLanguageCode(targetLang);
        newSub.setSubtitleUrl(newUrl); // Lưu path object

        // Xóa sub cũ nếu đã tồn tại để tránh duplicate
        subtitleRepository.findByVideoId(videoId).stream()
                .filter(s -> s.getLanguageCode().equalsIgnoreCase(targetLang))
                .forEach(subtitleRepository::delete);

        VideoSubtitle saved = subtitleRepository.save(newSub);

        return toSubtitleResponse(saved);
    }

    private String uploadBytesToMinio(byte[] data, String objectName) {
        try {
            return storageService.uploadStream(new ByteArrayInputStream(data), objectName, "text/plain");
        } catch (Exception e) {
            throw new RuntimeException("Failed to upload translated subtitle", e);
        }
    }

    @Override
    public Page<BilingualVideoResponse> searchVideos(Pageable pageable, String q, String language, String category, String sort) {
        Specification<Video> spec = Specification.allOf();

        // tìm kiếm theo title hoặc description
        if (q != null && !q.isBlank()) {
            spec = spec.and((root, query, cb) ->
                    cb.or(
                            cb.like(cb.lower(root.get("title")), "%" + q.toLowerCase() + "%"),
                            cb.like(cb.lower(root.get("description")), "%" + q.toLowerCase() + "%")
                    )
            );
        }

        // lọc theo ngôn ngữ (ví dụ: "vi", "en")
        if (language != null && !language.isBlank()) {
            spec = spec.and((root, query, cb) ->
                    cb.equal(root.get("language"), language.toLowerCase())
            );
        }

        // lọc theo category (ví dụ: "grammar", "vocabulary", ...)
        if (category != null && !category.isBlank()) {
            spec = spec.and((root, query, cb) ->
                    cb.equal(root.get("category"), category.toLowerCase())
            );
        }

        // sort tuỳ loại
        Sort sortObj = switch (sort != null ? sort : "") {
            case "popular" -> Sort.by(Sort.Direction.DESC, "viewCount");
            case "rating" -> Sort.by(Sort.Direction.DESC, "averageRating");
            case "recent" -> Sort.by(Sort.Direction.DESC, "createdAt");
            default -> Sort.by(Sort.Direction.DESC, "createdAt");
        };

        Pageable sortedPageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), sortObj);

        Page<Video> page = videoRepository.findAll(spec, sortedPageable);
        return page.map(this::toBilingualDto);
    }



    @Override
    public List<String> getVideoCategories() {
        List<Video> videos = videoRepository.findDistinctByTypeIsNotNull();
        return videos.stream()
                .map(v -> v.getType() != null ? v.getType().name() : null)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());
    }

    @Override
    public VideoResponse getVideoById(UUID id, String targetLang) {
        // 1. Lấy Video
        Video v = videoRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Video not found: " + id));

        VideoResponse resp = toVideoResponse(v);

        // 2. Lấy danh sách Subtitles
        List<VideoSubtitle> allSubs = subtitleRepository.findByVideoId(id);

        // Xác định ngôn ngữ gốc (Lấy từ Video entity nếu có, hoặc mặc định 'en')
        String originalLang = v.getLanguage() != null ? v.getLanguage() : "en";

        // Tìm Record Subtitle Gốc và Đích
        VideoSubtitle srcSubRecord = allSubs.stream()
                .filter(s -> s.getLanguageCode().equalsIgnoreCase(originalLang))
                .findFirst().orElse(null);

        VideoSubtitle tgtSubRecord = allSubs.stream()
                .filter(s -> s.getLanguageCode().equalsIgnoreCase(targetLang))
                .findFirst().orElse(null);

        // 3. Merge Logic
        List<BilingualSubtitleDTO> mergedSubtitles = new ArrayList<>();

        if (srcSubRecord != null) {
            // Download & Parse Source
            List<SubtitleItem> srcItems = downloadAndParseSrt(srcSubRecord.getSubtitleUrl());

            // Download & Parse Target (nếu có)
            List<SubtitleItem> tgtItems = (tgtSubRecord != null)
                    ? downloadAndParseSrt(tgtSubRecord.getSubtitleUrl())
                    : new ArrayList<>();

            for (SubtitleItem item : srcItems) {
                BilingualSubtitleDTO dto = new BilingualSubtitleDTO();
                dto.setSubtitleId(UUID.randomUUID());

                // Convert milliseconds -> seconds cho React Native
                dto.setStartTime(item.getStartTime() / 1000.0);
                dto.setEndTime(item.getEndTime() / 1000.0);
                dto.setOriginalText(item.getText());

                // Tìm text dịch (Match khoảng thời gian)
                String translatedText = tgtItems.stream()
                        .filter(t -> isTimeOverlap(t, item))
                        .map(SubtitleItem::getText)
                        .findFirst()
                        .orElse("");

                dto.setTranslatedText(translatedText);
                mergedSubtitles.add(dto);
            }
        }

        // Gán vào field 'subtitles' đúng như FE mong đợi
        resp.setSubtitles(mergedSubtitles);

        return resp;
    }

    private List<SubtitleItem> downloadAndParseSrt(String minioObjectPath) {
        try {
            byte[] fileContent = storageService.getFile(minioObjectPath);
            return subtitleUtils.parseSrt(new ByteArrayInputStream(fileContent));
        } catch (Exception e) {
            log.error("Error parsing subtitle: {}", minioObjectPath);
            return new ArrayList<>();
        }
    }

    private boolean isTimeOverlap(SubtitleItem t, SubtitleItem s) {
        return t.getStartTime() >= s.getStartTime() - 500 && t.getEndTime() <= s.getEndTime() + 500;
    }

    private List<BilingualSubtitleDTO> mergeSubtitles(List<SubtitleItem> origins, List<SubtitleItem> targets) {
        List<BilingualSubtitleDTO> result = new ArrayList<>();

        for (SubtitleItem org : origins) {
            BilingualSubtitleDTO dto = new BilingualSubtitleDTO();
            dto.setStartTime(org.getStartTime());
            dto.setEndTime(org.getEndTime());
            dto.setOriginalText(org.getText());

            String transText = targets.stream()
                    .filter(tar -> tar.getStartTime() < org.getEndTime() && tar.getEndTime() > org.getStartTime())
                    .map(SubtitleItem::getText)
                    .collect(Collectors.joining(" ")); // Ghép nếu có nhiều câu dịch nhỏ

            dto.setTranslatedText(transText);
            result.add(dto);
        }
        return result;
    }

    @Override
    @Transactional
    public VideoResponse createVideo(VideoRequest request) {
        Video v = new Video();
        v.setVideoUrl(request.getVideoUrl());
        v.setTitle(request.getTitle());
        if (request.getType() != null) {
            try { v.setType(VideoType.valueOf(request.getType().toUpperCase())); } catch (Exception ignored) {}
        }
        v.setLevel(request.getLevel());
        v.setOriginalSubtitleUrl(request.getOriginalSubtitleUrl());
        v.setLessonId(request.getLessonId());
        Video saved = videoRepository.save(v);
        return toVideoResponse(saved);
    }

    @Override
    @Transactional
    public VideoResponse updateVideo(UUID id, VideoRequest request) {
        Video v = videoRepository.findById(id).orElseThrow(() -> new NoSuchElementException("Video not found: " + id));
        if (request.getVideoUrl() != null) v.setVideoUrl(request.getVideoUrl());
        if (request.getTitle() != null) v.setTitle(request.getTitle());
        if (request.getType() != null) {
            try { v.setType(VideoType.valueOf(request.getType().toUpperCase())); } catch (Exception ignored) {}
        }
        if (request.getLevel() != null) v.setLevel(request.getLevel());
        if (request.getOriginalSubtitleUrl() != null) v.setOriginalSubtitleUrl(request.getOriginalSubtitleUrl());
        v.setLessonId(request.getLessonId());
        Video saved = videoRepository.save(v);
        return toVideoResponse(saved);
    }

    @Override
    @Transactional
    public void deleteVideo(UUID id) {
        videoRepository.deleteById(id);
    }

    @Override
    @Transactional
    public VideoSubtitleResponse addSubtitle(UUID videoId, VideoSubtitleRequest request) {
        // ensure video exists
        videoRepository.findById(videoId).orElseThrow(() -> new NoSuchElementException("Video not found: " + videoId));
        VideoSubtitle sub = new VideoSubtitle();
        sub.setVideoId(videoId);
        sub.setLanguageCode(request.getLanguageCode());
        sub.setSubtitleUrl(request.getSubtitleUrl());
        VideoSubtitle saved = subtitleRepository.save(sub);
        return toSubtitleResponse(saved);
    }

    @Override
    public List<VideoSubtitleResponse> getSubtitles(UUID videoId) {
        return subtitleRepository.findByVideoId(videoId).stream().map(this::toSubtitleResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void deleteSubtitle(UUID subtitleId) {
        subtitleRepository.deleteById(subtitleId);
    }

    @Override
    public void likeVideo(UUID videoId, UUID userId) {
        upsertReaction(videoId, userId, (short)1);
    }

    @Override
    public void unlikeVideo(UUID videoId, UUID userId) {
        videoReactionRepository.findByVideoIdAndUserId(videoId, userId).ifPresent(videoReactionRepository::delete);
    }

    @Override
    public void favoriteVideo(UUID videoId, UUID userId) {

    }

    @Override
    public void unfavoriteVideo(UUID videoId, UUID userId) {

    }

    @Override
    public void trackProgress(UUID videoId, VideoProgressRequest request) {

    }

    @Override
    public void recordProgress(UUID videoId, VideoProgressRequest progressRequest) {
        // minimal implementation: validate video exists, then persist or emit event.
        videoRepository.findById(videoId).orElseThrow(() -> new NoSuchElementException("Video not found: " + videoId));
        // TODO: persist per-user progress if desired (create entity CourseVideoProgress)
        // For now just a placeholder (could log or push to analytics)
        // e.g., log.info("Progress saved for video {} user {} time {}/{}", videoId, progressRequest.getUserId(), progressRequest.getCurrentTime(), progressRequest.getDuration());
    }

    // --- mapping helpers ---
    private BilingualVideoResponse toBilingualDto(Video v) {
        BilingualVideoResponse r = new BilingualVideoResponse();
        r.setVideoId(v.getVideoId());
        r.setTitle(v.getTitle());
        r.setCategory(v.getType() != null ? v.getType().name() : null);
        r.setLevel(v.getLevel());
        r.setUrl(v.getVideoUrl());
        r.setCreatedAt(v.getCreatedAt() == null ? null : v.getCreatedAt());
        return r;
    }

    private VideoResponse toVideoResponse(Video v) {
        VideoResponse r = new VideoResponse();
        r.setVideoId(v.getVideoId());
        r.setVideoUrl(v.getVideoUrl());
        r.setTitle(v.getTitle());
        r.setType(String.valueOf(v.getType()));
        r.setLevel(String.valueOf(v.getLevel()));
        r.setOriginalSubtitleUrl(v.getOriginalSubtitleUrl());
        r.setLessonId(v.getLessonId());
        r.setCreatedAt(v.getCreatedAt());
        r.setUpdatedAt(v.getUpdatedAt());
        return r;
    }

    private VideoSubtitleResponse toSubtitleResponse(VideoSubtitle s) {
        VideoSubtitleResponse r = new VideoSubtitleResponse();
        r.setVideoSubtitleId(s.getVideoSubtitleId());
        r.setVideoId(s.getVideoId());
        r.setLanguageCode(s.getLanguageCode());
        r.setSubtitleUrl(s.getSubtitleUrl());
        r.setCreatedAt(s.getCreatedAt());
        return r;
    }
}
