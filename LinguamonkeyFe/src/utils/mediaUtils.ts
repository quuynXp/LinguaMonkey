/**
 * Chuyển đổi Google Drive Share Link sang Direct Link
 * @param url Link gốc
 * @param type (Optional) Loại media.
 */
export const getDirectMediaUrl = (url?: string, type?: string | null): string => {
    if (!url) return "";

    const cleanUrl = url.trim();

    if (cleanUrl.includes("googleusercontent.com")) {
        if ((!type || type === 'IMAGE') && !cleanUrl.includes("=s")) {
            return `${cleanUrl}=s1920`;
        }
        return cleanUrl;
    }

    let mediaType = type ? type.toUpperCase() : '';
    if (!mediaType) {
        const lowerUrl = cleanUrl.toLowerCase();
        if (lowerUrl.match(/\.(jpeg|jpg|gif|png|webp|bmp)($|\?)/)) { // Thêm ($|\?) để bắt đuôi file kể cả khi có param
            mediaType = 'IMAGE';
        } else if (lowerUrl.match(/\.(mp4|mov|avi|mkv|webm)($|\?)/)) {
            mediaType = 'VIDEO';
        } else if (lowerUrl.match(/\.(mp3|wav|m4a|aac)($|\?)/)) {
            mediaType = 'AUDIO';
        }
    }

    if (cleanUrl.includes("drive.google.com") || cleanUrl.includes("docs.google.com")) {
        const driveRegex = /(?:\/file\/d\/|\/d\/|id=)([a-zA-Z0-9_-]+)/;
        const match = cleanUrl.match(driveRegex);

        if (match && match[1]) {
            const fileId = match[1];
            if (fileId.includes("http")) return cleanUrl;

            if (mediaType === 'IMAGE') {
                return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1920`;
            }

            return `https://drive.google.com/uc?export=download&id=${fileId}`;
        }
    }

    return cleanUrl;
};