import { ImageSourcePropType } from "react-native"
import { CourseResponse, CourseVersionResponse } from "../types/dto"

export const getCourseImage = (url?: string | null): ImageSourcePropType => {
    if (url && url.length > 0) {
        return { uri: url }
    }
    return require("../assets/images/ImagePlacehoderCourse.png")
}

export const getLessonImage = (url?: string | null): ImageSourcePropType => {
    if (url && url.length > 0) {
        return { uri: url }
    }
    return require("../assets/images/ImagePlacehoderCourse.png")
}

export const getRatingStarProps = (rating: number, index: number) => {
    if (index < Math.floor(rating)) {
        return { name: "star", color: "#F59E0B" }
    } else if (index < rating) {
        return { name: "star-half", color: "#F59E0B" }
    } else {
        return { name: "star-border", color: "#E5E7EB" }
    }
}

export const getSafeCourseSharePayload = (course: CourseResponse, version?: CourseVersionResponse) => {
    return {
        type: "COURSE_SHARE_CARD",
        id: course.courseId,
        title: course.title,
        price: course.price,
        rating: 4.5,
        level: course.difficultyLevel,
        thumbnailUrl: version?.thumbnailUrl || null,
        descriptionSummary: version?.description ? version.description.substring(0, 100) + "..." : "",
        aiContext: "PREVIEW_ONLY",
        warning: "Full content restricted for AI consumption."
    }
}

/**
 * Lấy màu gradient cho Home Carousel Item dựa trên màu cơ sở.
 * @param baseColor Mã màu hex cơ sở (e.g., "#4F46E5").
 * @returns Mảng [startColor, endColor] cho LinearGradient.
 */
export const getCarouselBackgroundColors = (baseColor: string): string[] => {
    switch (baseColor) {
        case "#4F46E5":
            return ["#6366F1", "#4F46E5"] // Indigo
        case "#059669":
            return ["#10B981", "#059669"] // Emerald
        case "#DB2777":
            return ["#F472B6", "#DB2777"] // Pink
        default:
            return ["#6B7280", "#4B5563"] // Slate
    }
}