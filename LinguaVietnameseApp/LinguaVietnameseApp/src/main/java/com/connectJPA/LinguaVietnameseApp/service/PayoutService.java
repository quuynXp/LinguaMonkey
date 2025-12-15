package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.entity.Transaction;

public interface PayoutService {
    /**
     * Thực hiện chuyển tiền tự động sang tài khoản thụ hưởng.
     * @param transaction Giao dịch chứa thông tin người nhận và số tiền.
     * @return String Mã giao dịch từ phía Payment Provider (External ID).
     */
    String executePayout(Transaction transaction);
}