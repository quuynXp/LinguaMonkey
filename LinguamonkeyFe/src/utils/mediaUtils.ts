/**
 * Chuyển đổi Google Drive Share Link sang Direct Link để hiển thị ảnh/video
 */
export const getDirectMediaUrl = (url?: string): string => {
    if (!url) return "";

    // Regex để lấy ID từ link Google Drive
    const driveRegex = /\/file\/d\/([a-zA-Z0-9_-]+)/;
    const match = url.match(driveRegex);

    if (match && match[1]) {
        // Trả về link direct thông qua Google API proxy (hoặc dùng thumbnail view)
        return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }

    return url;
};