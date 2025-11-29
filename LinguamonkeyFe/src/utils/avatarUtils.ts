const PLACEHOLDER_MALE = require("../assets/images/placeholder_male.png");
const PLACEHOLDER_FEMALE = require("../assets/images/placeholder_female.png");
const PLACEHOLDER_DEFAULT = require("../assets/images/placeholder_male.png");

/**
 * Lấy source hình ảnh cho avatar, sử dụng placeholder theo giới tính nếu URL không tồn tại.
 * @param url URL avatar thực tế.
 * @param gender Giới tính của người dùng ('MALE', 'FEMALE', 'Nam', 'Nữ').
 * @returns ImageSourcePropType cho React Native Image component.
 */
export const getAvatarSource = (url?: string, gender?: string) => {
    if (url) return { uri: url };
    if (gender === "MALE" || gender === "Nam") return PLACEHOLDER_MALE;
    if (gender === "FEMALE" || gender === "Nữ") return PLACEHOLDER_FEMALE;
    return PLACEHOLDER_DEFAULT;
};