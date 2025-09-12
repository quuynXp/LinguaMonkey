package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.connectJPA.LinguaVietnameseApp.dto.request.MoveRequest;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.service.CloudinaryService;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@Service
public class CloudinaryServiceImpl implements CloudinaryService {
    private final Cloudinary cloudinary;

    public CloudinaryServiceImpl(Cloudinary cloudinary) {
        this.cloudinary = cloudinary;
    }

    @Override
    public Map<?, ?> move(MoveRequest req) {
        try {
            return cloudinary.uploader().rename(
                    req.getFromPublicId(),
                    req.getToPublicId(),
                    ObjectUtils.asMap(
                            "overwrite", Boolean.TRUE.equals(req.getOverwrite()),
                            "resource_type", req.getResourceType() == null ? "image" : req.getResourceType()
                    )
            );
        } catch (Exception ex) {
            // Thử check toPublicId tồn tại -> coi như ok
            try {
                cloudinary.api().resource(
                        req.getToPublicId(),
                        ObjectUtils.asMap("resource_type", req.getResourceType() == null ? "image" : req.getResourceType())
                );
                return Map.of("status", "already_moved");
            } catch (Exception ignore) {
                throw new AppException(ErrorCode.FILE_PROCESSING_ERROR);
            }
        }
    }

    @Override
    public Map<?, ?> upload(MultipartFile file, String folder, String resourceType) {
        try {
            return cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "folder", folder == null ? "" : folder,
                            "resource_type", resourceType == null ? "auto" : resourceType
                    )
            );
        } catch (IOException e) {
            throw new AppException(ErrorCode.FILE_PROCESSING_ERROR);
        }
    }

    @Override
    public Map<?, ?> uploadBytes(byte[] data, String fileName, String folder, String resourceType) {
        try {
            return cloudinary.uploader().upload(
                    data,
                    ObjectUtils.asMap(
                            "public_id", fileName,
                            "folder", folder == null ? "" : folder,
                            "resource_type", resourceType == null ? "auto" : resourceType
                    )
            );
        } catch (IOException e) {
            throw new AppException(ErrorCode.FILE_PROCESSING_ERROR);
        }
    }
}
