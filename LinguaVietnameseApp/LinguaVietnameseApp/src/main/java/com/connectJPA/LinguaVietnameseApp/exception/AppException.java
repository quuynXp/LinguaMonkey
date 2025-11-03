package com.connectJPA.LinguaVietnameseApp.exception;

import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class AppException extends RuntimeException{
    private ErrorCode errorCode;
    private Object[] args;

    public AppException(ErrorCode errorCode, Object[] args) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
        this.args = args;
    }

    public AppException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }

    public AppException(Object[] args) {
        this.args = args;
    }


    public AppException() {
    }
}
