export const extractDriveId = (url: string): string | null => {
    if (!url) return null;
    const cleanUrl = url.trim();
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
        return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1920`;
    }
    return null;
};

export const getDirectMediaUrl = (url?: string, type?: string | null): string => {
    if (!url) return "";
    const cleanUrl = url.trim();

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

        if (mediaType === 'IMAGE') {
            return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1920`;
        }

        return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }

    return cleanUrl;
};