import { Dimensions } from "react-native"

const { width: SCREEN_WIDTH } = Dimensions.get("window")

export const ITEM_SPACING = 20
export const ITEM_WIDTH = SCREEN_WIDTH * 0.85
export const FIXED_PADDING = 10
export const SNAP_INTERVAL = ITEM_WIDTH + ITEM_SPACING

export { SCREEN_WIDTH }