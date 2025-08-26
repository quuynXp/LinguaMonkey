package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.Character3dRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.Character3dResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Character3d;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.exception.SystemException;
import com.connectJPA.LinguaVietnameseApp.mapper.Character3dMapper;
import com.connectJPA.LinguaVietnameseApp.repository.Character3dRepository;
import com.connectJPA.LinguaVietnameseApp.service.Character3dService;
import com.connectJPA.LinguaVietnameseApp.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.dao.DataAccessException;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class Character3dServiceImpl implements Character3dService {
    private final Character3dRepository character3dRepository;
    private final UserService userService;
    private final Character3dMapper character3dMapper;

    @Override
    public Page<Character3dResponse> getAllCharacter3ds(String character3dName, Pageable pageable) {
        try {
            Page<Character3d> characters;
            if (character3dName == null || character3dName.isBlank()) {
                characters = character3dRepository.findByIsDeletedFalse(pageable);
            } else {
                characters = character3dRepository.findByCharacter3dNameContainingAndIsDeletedFalse(character3dName, pageable);
            }
            return characters.map(character3dMapper::toResponse);
        } catch (IllegalArgumentException e) {
            throw new AppException(ErrorCode.INVALID_KEY);
        } catch (DataAccessException e) {
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        } catch (Exception e) {
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }


    @Override
    public Character3dResponse getCharacter3dById(UUID id) {
        try {
            Character3d character = character3dRepository.findByCharacter3dIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.CHARACTER3D_NOT_FOUND));
            return character3dMapper.toResponse(character);
        } catch (IllegalArgumentException e) {
            throw new AppException(ErrorCode.INVALID_KEY);
        } catch (DataAccessException e) {
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        } catch (Exception e) {
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public Character3dResponse createCharacter3d(Character3dRequest request) {
        try {
            if (request == null) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            Character3d character = character3dMapper.toEntity(request);
            character.setDeleted(false);
            character = character3dRepository.save(character);
            return character3dMapper.toResponse(character);
        } catch (IllegalArgumentException e) {
            throw new AppException(ErrorCode.INVALID_KEY);
        } catch (DataAccessException e) {
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        } catch (Exception e) {
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public Character3dResponse updateCharacter3d(UUID id, Character3dRequest request) {
        try {
            if (request == null) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            Character3d character = character3dRepository.findByCharacter3dIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.CHARACTER3D_NOT_FOUND));
            character3dMapper.updateEntityFromRequest(request, character);
            character = character3dRepository.save(character);
            return character3dMapper.toResponse(character);
        } catch (IllegalArgumentException e) {
            throw new AppException(ErrorCode.INVALID_KEY);
        } catch (DataAccessException e) {
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        } catch (Exception e) {
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public void deleteCharacter3d(UUID id) {
        try {
            Character3d character = character3dRepository.findByCharacter3dIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.CHARACTER3D_NOT_FOUND));
            character.setDeleted(true);
            character3dRepository.save(character);
        } catch (IllegalArgumentException e) {
            throw new AppException(ErrorCode.INVALID_KEY);
        } catch (DataAccessException e) {
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        } catch (Exception e) {
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }
}