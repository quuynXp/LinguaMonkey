import { ImageSourcePropType } from "react-native"
import { ImageGradule, ImageHandLearning, ImageStudyTogether, ImagePlaceholderCourse } from "./imageUtils"

export const getOnboardingImage = (id: number): ImageSourcePropType => {
    switch (id) {
        case 1:
            // Dùng cho 'welcome.title' (Bước 1: Chào mừng / Học cùng nhau)
            return ImageStudyTogether
        case 2:
            // Dùng cho 'aiLearning.title' (Bước 2: Học bằng AI)
            return ImageHandLearning
        case 3:
            // Dùng cho 'progress.title' (Bước 3: Tiến trình/Gradual)
            return ImageGradule
        default:
            return ImagePlaceholderCourse
    }
}