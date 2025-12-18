export const extractDriveId = (url: string): string | null => {
    if (!url) return null;
    const cleanUrl = url.trim();
    // Regex bắt ID Google Drive chuẩn
    const driveRegex = /(?:\/file\/d\/|\/d\/|id=)([-w]+)/;
    const match = cleanUrl.match(driveRegex);
    if (match && match[1]) {
        return match[1].split('&')[0];
    }
    return null;
};

export const getDriveThumbnailUrl = (url: string): string | null => {
    const fileId = extractDriveId(url);
    if (fileId) {
        // Link này của Google Drive trả về ảnh thumbnail cho CẢ Video và Ảnh
        return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1920`;
    }
    return null;
};

export const getDirectMediaUrl = (url?: string, type?: string | null): string => {
    if (!url) return "";
    const cleanUrl = url.trim();

    // Nếu là file đã xử lý backend trả về thumbnail link
    if (cleanUrl.includes("googleusercontent.com")) {
        if (cleanUrl.startsWith("http")) {
            if ((!type || type === 'IMAGE') && !cleanUrl.includes("=s")) {
                return `${cleanUrl}=s1920`;
            }
            return cleanUrl;
        }
    }

    const fileId = extractDriveId(cleanUrl);
    if (fileId) {
        let mediaType = type ? type.toUpperCase() : '';

        // Nếu là Ảnh -> Lấy link thumbnail chất lượng cao
        if (mediaType === 'IMAGE') {
            return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1920`;
        }

        // Nếu là Video/Audio -> Lấy link stream direct
        // Link này hỗ trợ Range Request tốt hơn /uc?export=download
        return `https://drive.google.com/uc?export=download&id=${fileId}`;
        // Lưu ý: Nếu user tải nhiều, nên cân nhắc dùng proxy server stream. 
        // Nhưng với optimize FFmpeg ở backend, link này là đủ cho MVP.
    }

    return cleanUrl;
};