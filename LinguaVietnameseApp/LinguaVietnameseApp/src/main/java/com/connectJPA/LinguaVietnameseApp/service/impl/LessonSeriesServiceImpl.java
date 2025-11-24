package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.LessonSeriesRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.LessonSeriesResponse;
import com.connectJPA.LinguaVietnameseApp.entity.LessonSeries;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.exception.SystemException;
import com.connectJPA.LinguaVietnameseApp.mapper.LessonSeriesMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.LessonSeriesRepository;
import com.connectJPA.LinguaVietnameseApp.service.LessonSeriesService;
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
public class LessonSeriesServiceImpl implements LessonSeriesService {
    private final LessonSeriesRepository lessonSeriesRepository;
    private final LessonSeriesMapper lessonSeriesMapper;

    @Override
    //@Cacheable(value = "lessonSeries", key = "#lessonSeriesName + ':' + #languageCode + ':' + #pageable.pageNumber + ':' + #pageable.pageSize")
    public Page<LessonSeriesResponse> getAllLessonSeries(String lessonSeriesName, String languageCode, Pageable pageable) {
        try {
            if (pageable == null) {
                throw new AppException(ErrorCode.INVALID_PAGEABLE);
            }
            Page<LessonSeries> series = lessonSeriesRepository.findByLessonSeriesNameAndLanguageCodeAndIsDeletedFalse(lessonSeriesName, languageCode, pageable);
            return series.map(lessonSeriesMapper::toResponse);
        } catch (Exception e) {
            log.error("Error while fetching all lesson series: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    //@Cacheable(value = "lessonSeries", key = "#id")
    public LessonSeriesResponse getLessonSeriesById(UUID id) {
        try {
            if (id == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            LessonSeries series = lessonSeriesRepository.findByLessonSeriesIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.LESSON_SERIES_NOT_FOUND));
            return lessonSeriesMapper.toResponse(series);
        } catch (Exception e) {
            log.error("Error while fetching lesson series by ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    //@CachePut(value = "lessonSeries", key = "#result.lessonSeriesId")
    public LessonSeriesResponse createLessonSeries(LessonSeriesRequest request) {
        try {
            if (request == null) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            LessonSeries series = lessonSeriesMapper.toEntity(request);
            series = lessonSeriesRepository.save(series);
            return lessonSeriesMapper.toResponse(series);
        } catch (Exception e) {
            log.error("Error while creating lesson series: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    //@CachePut(value = "lessonSeries", key = "#id")
    public LessonSeriesResponse updateLessonSeries(UUID id, LessonSeriesRequest request) {
        try {
            if (id == null || request == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            LessonSeries series = lessonSeriesRepository.findByLessonSeriesIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.LESSON_SERIES_NOT_FOUND));
            lessonSeriesMapper.updateEntityFromRequest(request, series);
            series = lessonSeriesRepository.save(series);
            return lessonSeriesMapper.toResponse(series);
        } catch (Exception e) {
            log.error("Error while updating lesson series ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    //@CacheEvict(value = "lessonSeries", key = "#id")
    public void deleteLessonSeries(UUID id) {
        try {
            if (id == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            LessonSeries series = lessonSeriesRepository.findByLessonSeriesIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.LESSON_SERIES_NOT_FOUND));
            lessonSeriesRepository.softDeleteById(id);
        } catch (Exception e) {
            log.error("Error while deleting lesson series ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }
}