import { ImageSourcePropType } from "react-native"
import { CourseResponse, CourseVersionResponse } from "../types/dto"

// --- Placeholder Images ---
export const ImagePlaceholderCourse = require("../assets/images/ImagePlacehoderCourse.png")
export const ImagePlaceholderFemale = require("../assets/images/placeholder_female.png")
export const ImagePlaceholderMale = require("../assets/images/placeholder_male.png")

// --- State/Context Images ---
export const ImageChatDualSubtitle = require("../assets/images/ImageChatDualSubtitle.png")
export const ImageDancing = require("../assets/images/ImageDancing.png")
export const ImageGradule = require("../assets/images/ImageGradule.png")
export const ImageHandLearning = require("../assets/images/ImageHardLearning.png")
export const ImageHug = require("../assets/images/ImageHug.png")
export const ImageLoading = require("../assets/images/ImageLoading.png")
export const ImageLove = require("../assets/images/ImageLove.png")
export const ImageP2P = require("../assets/images/ImageP2P.png")
export const ImageSleeping = require("../assets/images/ImageSleeping.png")
export const ImageSmileAlone = require("../assets/images/ImageSmileAlone.png")
export const ImageSmileTogether = require("../assets/images/ImageSmileTogether.png")
export const ImageStudyTogether = require("../assets/images/ImageStudyTogether.png")
export const ImageThinking2 = require("../assets/images/ImageThinking_2.png")
export const ImageThinking = require("../assets/images/ImageThinking.png")

// --- Course/Lesson Images ---
export const getCourseImage = (url?: string | null): ImageSourcePropType => {
    if (url && url.length > 0) {
        return { uri: url }
    }
    return ImagePlaceholderCourse
}

export const getLessonImage = (url?: string | null): ImageSourcePropType => {
    if (url && url.length > 0) {
        return { uri: url }
    }
    return ImagePlaceholderCourse
}

// --- Badge Images ---
export const getBadgeImage = (url?: string | null): ImageSourcePropType => {
    if (url && url.length > 0) {
        return { uri: url }
    }
    return ImagePlaceholderCourse
}

export const getBadgeImageByType = (type: string): ImageSourcePropType => {
    switch (type.toUpperCase()) {
        case "BATNGO":
            return require("../assets/images/ImageBatNgo.png")
        default:
            return ImagePlaceholderCourse
    }
}

// --- Rating ---
export const getRatingStarProps = (rating: number, index: number) => {
    if (index < Math.floor(rating)) {
        return { name: "star", color: "#F59E0B" }
    } else if (index < rating) {
        return { name: "star-half", color: "#F59E0B" }
    } else {
        return { name: "star-border", color: "#E5E7EB" }
    }
}

// --- Share ---
export const getSafeCourseSharePayload = (course: CourseResponse, version?: CourseVersionResponse) => {
    return {
        type: "COURSE_SHARE_CARD",
        id: course.courseId,
        title: course.title,
        price: course.latestPublicVersion.price,
        rating: 4.5,
        level: course.latestPublicVersion.difficultyLevel,
        thumbnailUrl: version?.thumbnailUrl || null,
        descriptionSummary: version?.description ? version.description.substring(0, 100) + "..." : "",
        aiContext: "PREVIEW_ONLY",
        warning: "Full content restricted for AI consumption."
    }
}