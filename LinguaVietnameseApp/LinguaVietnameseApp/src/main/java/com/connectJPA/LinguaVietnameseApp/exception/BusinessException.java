package com.connectJPA.LinguaVietnameseApp.exception;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class BusinessException extends AppException{
    private ErrorCode errorCode;

}
