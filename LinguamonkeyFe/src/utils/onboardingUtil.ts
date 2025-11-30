import { ImageSourcePropType } from "react-native"

export const getOnboardingImage = (id: number): ImageSourcePropType => {
    switch (id) {
        case 1:
            return require("../assets/images/ImagePlacehoderCourse.png")
        case 2:
            return require("../assets/images/ImagePlacehoderCourse.png")
        case 3:
            return require("../assets/images/ImagePlacehoderCourse.png")
        default:
            return require("../assets/images/ImagePlacehoderCourse.png")
    }
}