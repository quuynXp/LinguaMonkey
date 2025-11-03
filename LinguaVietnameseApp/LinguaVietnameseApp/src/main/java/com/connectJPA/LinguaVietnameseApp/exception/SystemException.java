package com.connectJPA.LinguaVietnameseApp.exception;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class SystemException extends AppException{
    private ErrorCode errorCode;


}
