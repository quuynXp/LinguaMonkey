import React, { useRef, useState, useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Animated,
    Image,
    Dimensions,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { createScaledSheet } from "../../utils/scaledStyles";
import { LessonQuestionResponse } from "../../types/dto";
import { getLessonImage } from "../../utils/courseUtils";

const { width } = Dimensions.get("window");

interface VocabularyFlashcardViewProps {
    question: LessonQuestionResponse;
}

export const VocabularyFlashcardView = ({ question }: VocabularyFlashcardViewProps) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const flipAnimation = useRef(new Animated.Value(0)).current;

    // Reset state when question changes
    useEffect(() => {
        setIsFlipped(false);
        flipAnimation.setValue(0);
    }, [question.lessonQuestionId]);

    const flipCard = () => {
        const toValue = isFlipped ? 0 : 180;
        Animated.spring(flipAnimation, {
            toValue,
            friction: 8,
            tension: 10,
            useNativeDriver: true,
        }).start();
        setIsFlipped(!isFlipped);
    };

    const frontInterpolate = flipAnimation.interpolate({
        inputRange: [0, 180],
        outputRange: ["0deg", "180deg"],
    });

    const backInterpolate = flipAnimation.interpolate({
        inputRange: [0, 180],
        outputRange: ["180deg", "360deg"],
    });

    const frontOpacity = flipAnimation.interpolate({
        inputRange: [89, 90],
        outputRange: [1, 0],
    });

    const backOpacity = flipAnimation.interpolate({
        inputRange: [89, 90],
        outputRange: [0, 1],
    });

    // Data Mapping for LessonQuestionResponse
    // Front: question text (Word) + Optional Image
    // Back: transcript (Definition) + correctOption (Example/Details)
    const frontText = question.question;
    const backText = question.transcript || "No definition available";
    const imageSource = question.mediaUrl ? getLessonImage(question.mediaUrl) : null;

    return (
        <View style={styles.container}>
            <TouchableOpacity activeOpacity={1} onPress={flipCard} style={styles.cardContainer}>

                {/* FRONT SIDE */}
                <Animated.View
                    style={[
                        styles.cardFace,
                        styles.cardFront,
                        { transform: [{ rotateY: frontInterpolate }], opacity: frontOpacity },
                    ]}
                >
                    <View style={styles.headerRow}>
                        <Text style={styles.label}>VOCABULARY</Text>
                        <Icon name="touch-app" size={20} color="#9CA3AF" />
                    </View>

                    {imageSource && (
                        <Image source={imageSource} style={styles.cardImage} resizeMode="contain" />
                    )}

                    <View style={styles.contentCenter}>
                        <Text style={styles.wordText}>{frontText}</Text>
                        <Text style={styles.hintText}>Tap to flip</Text>
                    </View>
                </Animated.View>

                {/* BACK SIDE */}
                <Animated.View
                    style={[
                        styles.cardFace,
                        styles.cardBack,
                        { transform: [{ rotateY: backInterpolate }], opacity: backOpacity },
                    ]}
                >
                    <View style={styles.headerRow}>
                        <Text style={styles.label}>DEFINITION</Text>
                        <Icon name="school" size={20} color="#9CA3AF" />
                    </View>

                    <View style={styles.contentCenter}>
                        <Text style={styles.definitionText}>{backText}</Text>
                        {question.correctOption && (
                            <View style={styles.exampleBox}>
                                <Text style={styles.exampleTitle}>Example:</Text>
                                <Text style={styles.exampleText}>{question.correctOption}</Text>
                            </View>
                        )}
                    </View>
                </Animated.View>
            </TouchableOpacity>
        </View>
    );
};

const styles = createScaledSheet({
    container: {
        width: "100%",
        alignItems: "center",
        marginBottom: 20,
    },
    cardContainer: {
        width: "100%",
        height: 350,
    },
    cardFace: {
        width: "100%",
        height: "100%",
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 24,
        position: "absolute",
        backfaceVisibility: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        borderWidth: 1,
        borderColor: "#F3F4F6",
    },
    cardFront: {
        justifyContent: "space-between",
    },
    cardBack: {
        backgroundColor: "#F0F9FF",
        justifyContent: "space-between",
    },
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    label: {
        fontSize: 12,
        fontWeight: "700",
        color: "#9CA3AF",
        letterSpacing: 1,
    },
    cardImage: {
        width: "100%",
        height: 120,
        marginTop: 10,
        marginBottom: 10,
    },
    contentCenter: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    wordText: {
        fontSize: 32,
        fontWeight: "800",
        color: "#1F2937",
        textAlign: "center",
    },
    hintText: {
        fontSize: 12,
        color: "#9CA3AF",
        marginTop: 12,
    },
    definitionText: {
        fontSize: 20,
        fontWeight: "500",
        color: "#374151",
        textAlign: "center",
        marginBottom: 20,
    },
    exampleBox: {
        marginTop: 10,
        padding: 12,
        backgroundColor: "rgba(255,255,255,0.6)",
        borderRadius: 8,
        width: '100%',
    },
    exampleTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#4B5563',
        marginBottom: 4
    },
    exampleText: {
        fontSize: 14,
        fontStyle: 'italic',
        color: '#4B5563'
    }
});