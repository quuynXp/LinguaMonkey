import { ImageSourcePropType } from "react-native"
import { CourseResponse, CourseVersionResponse } from "../types/dto"

export const getCourseImage = (url?: string | null): ImageSourcePropType => {
    if (url && url.length > 0) {
        return { uri: url }
    }
    return require("../assets/images/ImagePlacehoderCourse.png")
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