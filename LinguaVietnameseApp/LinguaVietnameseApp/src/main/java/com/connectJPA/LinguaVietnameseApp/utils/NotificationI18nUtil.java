package com.connectJPA.LinguaVietnameseApp.util;

import java.util.Map;

public class NotificationI18nUtil {

    private static final String DEFAULT_LANG = "en";

    private static final Map<String, Map<String, String[]>> MESSAGES = Map.of(
            // Tiêu đề (0) | Nội dung (1)
            
            // --- FLASHCARD_REMINDER ---
            "FLASHCARD_REMINDER", Map.of(
                    "vi", new String[]{"Ôn Tập Flashcard", "Bạn có flashcard đang chờ ôn tập!"},
                    "en", new String[]{"Flashcard Review", "You have flashcards ready for review!"},
                    "zh", new String[]{"复习抽认卡", "您有抽认卡待复习!"}
            ),

            // --- DAILY_CHALLENGE --- (New Challenges Assigned)
            "DAILY_CHALLENGE", Map.of(
                    "vi", new String[]{"Thử Thách Hàng Ngày Mới!", "Bạn có %d thử thách mới. Hãy xem chúng!"},
                    "en", new String[]{"New Daily Challenges!", "Your %d new daily challenges are available. Check them out!"},
                    "zh", new String[]{"新的每日挑战!", "您有 %d 个新的每日挑战。快去查看吧!"}
            ),

            // --- DAILY_CHALLENGE_SUGGESTION ---
            "DAILY_CHALLENGE_SUGGESTION", Map.of(
                    "vi", new String[]{"Thử Thách Hàng Ngày Đã Sẵn Sàng!", "Hoàn thành thử thách để kiếm XP và duy trì chuỗi!"},
                    "en", new String[]{"New Daily Challenge Available!", "Complete daily challenges to earn XP and maintain your streak!"},
                    "zh", new String[]{"每日挑战已准备好!", "完成每日挑战以赚取经验并保持您的学习连击!"}
            ),

            // --- DAILY_CHALLENGE_REMINDER ---
            "DAILY_CHALLENGE_REMINDER", Map.of(
                    "vi", new String[]{"Nhanh Lên! Hoàn Thành Thử Thách!", "Bạn còn %d thử thách chưa làm. Hãy nhanh chóng hoàn thành trước khi hết ngày!"},
                    "en", new String[]{"Hurry! Complete Your Challenges!", "You have %d challenge(s) left. Hurry up before day ends!"},
                    "zh", new String[]{"快点! 完成您的挑战!", "您还有 %d 个挑战未完成。快在今天结束前完成吧!"}
            ),

            // --- LEADERBOARD (Rank 1) ---
            "LEADERBOARD_RANK1", Map.of(
                    "vi", new String[]{"Bạn Đứng Hạng #1!", "Tuyệt vời! Bạn kết thúc tuần ở vị trí #1 trên bảng xếp hạng! 🏆"},
                    "en", new String[]{"You're #1!", "Amazing! You finished #1 on the weekly leaderboard! 🏆"},
                    "zh", new String[]{"您是第一名!", "太棒了! 您在每周排行榜上获得了第一名! 🏆"}
            ),

            // --- LEADERBOARD (Other Ranks) ---
            "LEADERBOARD_OTHER", Map.of(
                    "vi", new String[]{"Bạn là Người Học Tốt Nhất!", "Chúc mừng! Bạn kết thúc tuần ở vị trí #%d trên bảng xếp hạng!"},
                    "en", new String[]{"You're a Top Learner!", "Congratulations! You finished #%d on the weekly leaderboard!"},
                    "zh", new String[]{"您是顶尖学习者!", "恭喜! 您在每周排行榜上获得了第 #%d 名!"}
            ),

            // --- COURSE_UPDATE ---
            "COURSE_UPDATE", Map.of(
                    "vi", new String[]{"Khóa Học Đã Được Cập Nhật!", "Một khóa học bạn đã đăng ký (%s) đã có phiên bản mới."},
                    "en", new String[]{"Course Updated!", "A course you are enrolled in (%s) has a new version."},
                    "zh", new String[]{"课程已更新!", "您已注册的课程 (%s) 有一个新版本。"}
            ),

            // --- STREAK_REMINDER ---
            "STREAK_REMINDER", Map.of(
                    "vi", new String[]{"Giữ Vững Chuỗi Streak! ⏳", "Bạn cần học thêm %d phút để duy trì chuỗi %d ngày!"},
                    "en", new String[]{"Keep Your Streak Going! ⏳", "You need to study for %d more minute(s) to maintain your %d day streak!"},
                    "zh", new String[]{"保持学习连击! ⏳", "您还需要学习 %d 分钟以保持 %d 天的连击!"}
            ),

            // --- STREAK_RESET ---
            "STREAK_RESET", Map.of(
                    "vi", new String[]{"Chuỗi Streak Đã Bị Mất 😔", "Chuỗi học tập của bạn đã bị reset về 0 vì không hoàn thành mục tiêu học tập tối thiểu."},
                    "en", new String[]{"Streak Lost 😔", "Your learning streak has been reset to 0 for not meeting the minimum learning goal."},
                    "zh", new String[]{"学习连击已中断 😔", "您的学习连击已重置为 0，因为未达到最低学习目标。"}
            ),
            
            // --- THUMBNAIL_COURSE_READY ---
            "THUMBNAIL_COURSE_READY", Map.of(
                    "vi", new String[]{"Ảnh bìa Khóa Học Đã Sẵn Sàng!", "Ảnh bìa cho khóa học '%s' đã được tạo thành công!"},
                    "en", new String[]{"Course Thumbnail Ready!", "The thumbnail for course '%s' has been successfully generated!"},
                    "zh", new String[]{"课程缩略图已就绪!", "课程 '%s' 的缩略图已成功生成!"}
            ),
            
            // --- THUMBNAIL_LESSON_READY ---
            "THUMBNAIL_LESSON_READY", Map.of(
                    "vi", new String[]{"Ảnh bìa Bài Học Đã Sẵn Sàng!", "Ảnh bìa cho bài học '%s' đã được tạo thành công!"},
                    "en", new String[]{"Lesson Thumbnail Ready!", "The thumbnail for lesson '%s' has been successfully generated!"},
                    "zh", new String[]{"课时缩略图已就绪!", "课时 '%s' 的缩略图已成功生成!"}
            )
    );

    private NotificationI18nUtil() {}

    /**
     * Lấy tiêu đề và nội dung thông báo đã được dịch.
     * @param key Key của thông báo (Ví dụ: FLASHCARD_REMINDER)
     * @param langCode Mã ngôn ngữ (vi, en, zh)
     * @return String array: [Title, Content]
     */
    public static String[] getLocalizedMessage(String key, String langCode) {
        String finalLangCode = langCode != null && MESSAGES.get(key) != null && MESSAGES.get(key).containsKey(langCode.toLowerCase())
                ? langCode.toLowerCase()
                : DEFAULT_LANG;

        return MESSAGES.getOrDefault(key, Map.of())
                .getOrDefault(finalLangCode, new String[]{"Notification", "Check your app for details."});
    }
}