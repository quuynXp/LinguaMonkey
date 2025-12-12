import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';

// Magic numbers (chữ ký đầu file) của các định dạng phổ biến
const SIGNATURES: { [key: string]: string } = {
    'ffd8ff': 'jpg', // JPEG
    '89504e47': 'png', // PNG
    '47494638': 'gif', // GIF
    '25504446': 'pdf', // PDF
    '504b0304': 'zip', // ZIP, DOCX, XLSX, JAR (Cẩn thận, file APK/EXE cũng có thể bắt đầu bằng cái này)
    // MP4 signature (ftyp) thường phức tạp hơn, check sơ bộ:
    '000000': 'mp4',
};

export const validateFileSignature = async (uri: string, expectedType: 'image' | 'video' | 'document'): Promise<boolean> => {
    try {
        // Chỉ đọc 4 bytes đầu tiên (8 ký tự hex) để check nhẹ nhàng
        const fileInfo = await FileSystem.readAsStringAsync(uri, {
            encoding: 'base64',
            length: 4, // Đọc rất ít, không tốn RAM
            position: 0
        });

        // Convert Base64 sang Hex
        const hex = Buffer.from(fileInfo, 'base64').toString('hex').toLowerCase();

        // Logic check đơn giản
        if (expectedType === 'image') {
            return hex.startsWith('ffd8ff') || hex.startsWith('89504e47') || hex.startsWith('47494638');
        }

        if (expectedType === 'document') {
            // Chấp nhận PDF hoặc các file Office (ZIP container)
            return hex.startsWith('25504446') || hex.startsWith('504b0304');
        }

        return true; // Với video hoặc audio check header phức tạp hơn, tạm bỏ qua để giữ "nhẹ"
    } catch (error) {
        console.log("File signature check failed", error);
        return true; // Nếu lỗi đọc file thì tạm cho qua (fail-open) hoặc chặn (fail-close) tùy bạn
    }
};
