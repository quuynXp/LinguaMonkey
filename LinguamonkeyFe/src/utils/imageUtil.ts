import { ImageSourcePropType } from "react-native"
import { CourseResponse, CourseVersionResponse, TestConfigResponse } from "../types/dto"

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

export const getTestThumbnail = (test: TestConfigResponse): ImageSourcePropType => {
    const title = test.title.toLowerCase()
    const type = test.testType?.toLowerCase() || ""

    // You should add these specific images to your assets folder
    if (title.includes("ielts") || type.includes("ielts")) {
        return require("../assets/images/ImagePlacehoderCourse.png") // Replace with actual IELTS asset if available
    }
    if (title.includes("toeic") || type.includes("toeic")) {
        return require("../assets/images/ImagePlacehoderCourse.png")
    }
    if (title.includes("hsk") || type.includes("hsk")) {
        return require("../assets/images/ImagePlacehoderCourse.png")
    }
    if (title.includes("vsl") || type.includes("vsl")) {
        return require("../assets/images/ImagePlacehoderCourse.png")
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
        price: course.latestPublicVersion.price,
        rating: course.latestPublicVersion.systemRating,
        level: course.latestPublicVersion.difficultyLevel,
        thumbnailUrl: version?.thumbnailUrl || null,
        descriptionSummary: version?.description ? version.description.substring(0, 100) + "..." : "",
        aiContext: "PREVIEW_ONLY",
        warning: "Full content restricted for AI consumption."
    }
}