package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.MoveRequest;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

public interface CloudinaryService {
    public Map<?, ?> move(MoveRequest req);

    Map<?, ?> upload(MultipartFile file, String folder, String resourceType);

    Map<?, ?> uploadBytes(byte[] data, String fileName, String folder, String resourceType);

}
