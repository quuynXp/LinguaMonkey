import { gotoTab } from "./navigationRef";

// Định nghĩa kiểu dữ liệu trả về từ Backend
interface NotificationPayload {
    screen?: string;      // Ví dụ: "Chat", "Home"
    stackScreen?: string; // Ví dụ: "ChatDetail"
    [key: string]: any;   // Các params khác: chatId, courseId...
}

export const handleNotificationNavigation = (remoteMessage: any) => {
    if (!remoteMessage || !remoteMessage.data) return;

    const data = remoteMessage.data as NotificationPayload;
    const { screen, stackScreen, ...params } = data;

    console.log("🚀 Notification Payload:", { screen, stackScreen, params });

    // Nếu Backend gửi field "screen", dùng gotoTab để điều hướng
    if (screen) {
        // Ép kiểu về any để bypass check type chặt chẽ của TS tạm thời, 
        // hoặc bạn cần update type trong navigationRef cho khớp các string từ BE
        gotoTab(screen as any, stackScreen, params);
    }
};