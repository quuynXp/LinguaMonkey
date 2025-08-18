package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.Character3dRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.Character3dResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface Character3dService {
    Page<Character3dResponse> getAllCharacter3ds(String character3dName, Pageable pageable);
    Character3dResponse getCharacter3dById(UUID id);
    Character3dResponse createCharacter3d(Character3dRequest request);
    Character3dResponse updateCharacter3d(UUID id, Character3dRequest request);
    void deleteCharacter3d(UUID id);
}