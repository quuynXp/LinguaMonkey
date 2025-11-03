package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.LessonOrderInSeriesRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.LessonOrderInSeriesResponse;
import com.connectJPA.LinguaVietnameseApp.entity.LessonOrderInSeries;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.exception.SystemException;
import com.connectJPA.LinguaVietnameseApp.mapper.LessonOrderInSeriesMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.LessonOrderInSeriesRepository;
import com.connectJPA.LinguaVietnameseApp.service.LessonOrderInSeriesService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class LessonOrderInSeriesServiceImpl implements LessonOrderInSeriesService {
    private final LessonOrderInSeriesRepository lessonOrderInSeriesRepository;
    private final LessonOrderInSeriesMapper lessonOrderInSeriesMapper;

    @Override
    @Cacheable(value = "lessonOrderInSeries", key = "#lessonId + ':' + #lessonSeriesId + ':' + #pageable.pageNumber + ':' + #pageable.pageSize")
    public Page<LessonOrderInSeriesResponse> getAllLessonOrdersInSeries(String lessonId, String lessonSeriesId, Pageable pageable) {
        try {
            if (pageable == null) {
                throw new AppException(ErrorCode.INVALID_PAGEABLE);
            }
            UUID lessonUuid = (lessonId != null) ? UUID.fromString(lessonId) : null;
            UUID seriesUuid = (lessonSeriesId != null) ? UUID.fromString(lessonSeriesId) : null;
            Page<LessonOrderInSeries> orders = lessonOrderInSeriesRepository.findByLessonIdAndLessonSeriesIdAndIsDeletedFalse(lessonUuid, seriesUuid, pageable);
            return orders.map(lessonOrderInSeriesMapper::toResponse);
        } catch (Exception e) {
            log.error("Error while fetching all lesson orders in series: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Cacheable(value = "lessonOrderInSeries", key = "#lessonId + ':' + #lessonSeriesId")
    public LessonOrderInSeriesResponse getLessonOrderInSeriesByIds(UUID lessonId, UUID lessonSeriesId) {
        try {
            if (lessonId == null || lessonSeriesId == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            LessonOrderInSeries order = lessonOrderInSeriesRepository.findByLessonIdAndLessonSeriesIdAndIsDeletedFalse(lessonId, lessonSeriesId)
                    .orElseThrow(() -> new AppException(ErrorCode.LESSON_ORDER_IN_SERIES_NOT_FOUND));
            return lessonOrderInSeriesMapper.toResponse(order);
        } catch (Exception e) {
            log.error("Error while fetching lesson order by IDs {} and {}: {}", lessonId, lessonSeriesId, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CachePut(value = "lessonOrderInSeries", key = "#result.lessonId + ':' + #result.lessonSeriesId")
    public LessonOrderInSeriesResponse createLessonOrderInSeries(LessonOrderInSeriesRequest request) {
        try {
            if (request == null || request.getLessonId() == null || request.getLessonSeriesId() == null) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            LessonOrderInSeries order = lessonOrderInSeriesMapper.toEntity(request);
            order = lessonOrderInSeriesRepository.save(order);
            return lessonOrderInSeriesMapper.toResponse(order);
        } catch (Exception e) {
            log.error("Error while creating lesson order in series: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CachePut(value = "lessonOrderInSeries", key = "#lessonId + ':' + #lessonSeriesId")
    public LessonOrderInSeriesResponse updateLessonOrderInSeries(UUID lessonId, UUID lessonSeriesId, LessonOrderInSeriesRequest request) {
        try {
            if (lessonId == null || lessonSeriesId == null || request == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            LessonOrderInSeries order = lessonOrderInSeriesRepository.findByLessonIdAndLessonSeriesIdAndIsDeletedFalse(lessonId, lessonSeriesId)
                    .orElseThrow(() -> new AppException(ErrorCode.LESSON_ORDER_IN_SERIES_NOT_FOUND));
            lessonOrderInSeriesMapper.updateEntityFromRequest(request, order);
            order = lessonOrderInSeriesRepository.save(order);
            return lessonOrderInSeriesMapper.toResponse(order);
        } catch (Exception e) {
            log.error("Error while updating lesson order for {} and {}: {}", lessonId, lessonSeriesId, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CacheEvict(value = "lessonOrderInSeries", key = "#lessonId + ':' + #lessonSeriesId")
    public void deleteLessonOrderInSeries(UUID lessonId, UUID lessonSeriesId) {
        try {
            if (lessonId == null || lessonSeriesId == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            LessonOrderInSeries order = lessonOrderInSeriesRepository.findByLessonIdAndLessonSeriesIdAndIsDeletedFalse(lessonId, lessonSeriesId)
                    .orElseThrow(() -> new AppException(ErrorCode.LESSON_ORDER_IN_SERIES_NOT_FOUND));
            lessonOrderInSeriesRepository.softDeleteByLessonIdAndLessonSeriesId(lessonId, lessonSeriesId);
        } catch (Exception e) {
            log.error("Error while deleting lesson order for {} and {}: {}", lessonId, lessonSeriesId, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }
}