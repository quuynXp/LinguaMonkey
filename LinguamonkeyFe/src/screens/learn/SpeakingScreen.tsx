"use client"

import Icon from 'react-native-vector-icons/MaterialIcons'; 
import { Audio } from 'expo-av'
import { useEffect, useRef, useState } from "react"
import {
    Alert,
    Animated,
    Modal,
    PermissionsAndroid,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

interface Sentence {
    id: string
    text: string
    phonetic: string
    difficulty: "easy" | "medium" | "hard"
    category: string
    audioUrl: string
}

interface WordScore {
    word: string
    score: number
    isCorrect: boolean
    suggestion?: string
}

interface PronunciationResult {
    overallScore: number
    wordScores: WordScore[]
    transcript: string
    suggestions: string[]
}



const SpeakingScreen = ({ navigation }) => {
    const [selectedSentence, setSelectedSentence] = useState<Sentence | null>(null)
    const [isRecording, setIsRecording] = useState(false)
    const [isPlaying, setIsPlaying] = useState(false)
    const [recordedAudio, setRecordedAudio] = useState<string | null>(null)
    const [pronunciationResult, setPronunciationResult] = useState<PronunciationResult | null>(null)
    const [showResult, setShowResult] = useState(false)
    const [practiceHistory, setPracticeHistory] = useState([])
    const [currentCategory, setCurrentCategory] = useState("daily")

    const fadeAnim = useRef(new Animated.Value(0)).current
    const pulseAnim = useRef(new Animated.Value(1)).current
    const recordingRef = useRef<Audio.Recording | null>(null)


    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start()

        requestPermissions()
    }, [])


    const requestPermissions = async () => {
        if (Platform.OS === "android") {
            try {
                const grants = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
                    PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
                    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                ])
            } catch (err) {
                console.warn(err)
            }
        }
    }

    const sentences: Sentence[] = [
        {
            id: "1",
            text: "Hello, how are you today?",
            phonetic: "/həˈloʊ, haʊ ɑr ju təˈdeɪ/",
            difficulty: "easy",
            category: "daily",
            audioUrl: "sample_audio_1.mp3",
        },
        {
            id: "2",
            text: "I would like to make a reservation for dinner.",
            phonetic: "/aɪ wʊd laɪk tu meɪk ə ˌrɛzərˈveɪʃən fɔr ˈdɪnər/",
            difficulty: "medium",
            category: "restaurant",
            audioUrl: "sample_audio_2.mp3",
        },
        {
            id: "3",
            text: "The implementation of artificial intelligence requires sophisticated algorithms.",
            phonetic: "/ðə ˌɪmpləmənˈteɪʃən ʌv ˌɑrtəˈfɪʃəl ɪnˈtɛləʤəns rɪˈkwaɪərz səˈfɪstəˌkeɪtəd ˈælgəˌrɪðəmz/",
            difficulty: "hard",
            category: "technology",
            audioUrl: "sample_audio_3.mp3",
        },
    ]

    const categories = [
        { id: "daily", name: "Hàng ngày", icon: "chat", color: "#10B981" },
        { id: "business", name: "Kinh doanh", icon: "business", color: "#3B82F6" },
        { id: "restaurant", name: "Nhà hàng", icon: "restaurant", color: "#F59E0B" },
        { id: "technology", name: "Công nghệ", icon: "computer", color: "#8B5CF6" },
    ]



    const startRecording = async () => {
        if (!selectedSentence) return

        try {
            setIsRecording(true)
            startPulseAnimation()

            await Audio.requestPermissionsAsync()
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            })

            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            )
            recordingRef.current = recording
        } catch (error) {
            console.error("Recording error:", error)
            setIsRecording(false)
            Alert.alert("Lỗi", "Không thể bắt đầu ghi âm.")
        }
    }

    const stopRecording = async () => {
        try {
            const recording = recordingRef.current
            if (!recording) return

            await recording.stopAndUnloadAsync()
            const uri = recording.getURI()
            console.log("Audio file URI:", uri)

            setRecordedAudio(uri)
            setIsRecording(false)
            stopPulseAnimation()

            const result = await uploadAndAnalyzeAudio(uri!)
            if (result) {
                setPronunciationResult(result)
                setShowResult(true)
                savePracticeHistory(result)
            }
        } catch (error) {
            console.error("Stop recording error:", error)
        }
    }

    const uploadAndAnalyzeAudio = async (filePath: string): Promise<PronunciationResult | null> => {
        const fileUri = Platform.OS === 'ios' ? filePath : `file://${filePath}`

        const formData = new FormData()
        formData.append('file', {
            uri: fileUri,
            name: 'recording.m4a',
            type: 'audio/m4a',
        } as any)

        try {
            const response = await fetch("https://localhost:8080/api/speech-to-text", {
                method: "POST",
                headers: {
                    "Content-Type": "multipart/form-data",
                },
                body: formData,
            })

            if (!response.ok) {
                console.error("Upload failed", await response.text())
                return null
            }

            const data = await response.json()
            return data as PronunciationResult
        } catch (err) {
            console.error("Upload error:", err)
            Alert.alert("Lỗi", "Không thể gửi file âm thanh để phân tích.")
            return null
        }
    }



    const startPulseAnimation = () => {
        const pulseAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ]),
        )
        pulseAnimation.start()
    }

    const stopPulseAnimation = () => {
        pulseAnim.stopAnimation()
        Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
        }).start()
    }

    const analyzePronunciation = (transcript: string) => {
        if (!selectedSentence) return

        // Simulate pronunciation analysis
        const originalWords = selectedSentence.text.toLowerCase().split(" ")
        const spokenWords = transcript.toLowerCase().split(" ")

        const wordScores: WordScore[] = originalWords.map((word, index) => {
            const spokenWord = spokenWords[index] || ""
            const similarity = calculateSimilarity(word, spokenWord)
            const score = Math.round(similarity * 100)

            return {
                word: word,
                score: score,
                isCorrect: score >= 70,
                suggestion: score < 70 ? generateSuggestion(word, spokenWord) : undefined,
            }
        })

        const overallScore = Math.round(wordScores.reduce((sum, ws) => sum + ws.score, 0) / wordScores.length)

        const result: PronunciationResult = {
            overallScore,
            wordScores,
            transcript,
            suggestions: generateOverallSuggestions(wordScores),
        }

        setPronunciationResult(result)
        setShowResult(true)
        savePracticeHistory(result)
    }

    const calculateSimilarity = (word1: string, word2: string): number => {
        // Simple similarity calculation (in real app, use more sophisticated algorithm)
        if (word1 === word2) return 1

        const longer = word1.length > word2.length ? word1 : word2
        const shorter = word1.length > word2.length ? word2 : word1

        if (longer.length === 0) return 1

        const distance = levenshteinDistance(longer, shorter)
        return (longer.length - distance) / longer.length
    }

    const levenshteinDistance = (str1: string, str2: string): number => {
        const matrix = []

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i]
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1]
                } else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
                }
            }
        }

        return matrix[str2.length][str1.length]
    }

    const generateSuggestion = (original: string, spoken: string): string => {
        const suggestions = [
            `Thử phát âm "${original}" chậm hơn`,
            `Chú ý âm cuối của "${original}"`,
            `Luyện tập âm đầu của "${original}"`,
            `Nghe lại cách phát âm "${original}"`,
        ]
        return suggestions[Math.floor(Math.random() * suggestions.length)]
    }

    const generateOverallSuggestions = (wordScores: WordScore[]): string[] => {
        const suggestions = []
        const incorrectWords = wordScores.filter((ws) => !ws.isCorrect)

        if (incorrectWords.length > 0) {
            suggestions.push("Luyện tập thêm các từ được đánh dấu đỏ")
            suggestions.push("Nghe và lặp lại câu mẫu nhiều lần")
            suggestions.push("Chú ý đến ngữ điệu và nhịp điệu")
        }

        return suggestions
    }

    const savePracticeHistory = (result: PronunciationResult) => {
        const historyItem = {
            id: Date.now().toString(),
            sentence: selectedSentence?.text,
            score: result.overallScore,
            date: new Date(),
            wordScores: result.wordScores,
        }

        setPracticeHistory((prev) => [historyItem, ...prev.slice(0, 9)]) // Keep last 10
    }

    const playOriginalAudio = async () => {
        if (!selectedSentence) return

        try {
            setIsPlaying(true)
            // In real app, play the actual audio file
            setTimeout(() => setIsPlaying(false), 3000)
        } catch (error) {
            console.error("Play audio error:", error)
            setIsPlaying(false)
        }
    }

    const playRecordedAudio = async () => {
        if (!recordedAudio) return

        try {
            const { sound } = await Audio.Sound.createAsync({ uri: recordedAudio })
            await sound.playAsync()
        } catch (error) {
            console.error("Play recorded audio error:", error)
        }
    }


    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case "easy":
                return "#10B981"
            case "medium":
                return "#F59E0B"
            case "hard":
                return "#EF4444"
            default:
                return "#6B7280"
        }
    }

    const getScoreColor = (score: number) => {
        if (score >= 80) return "#10B981"
        if (score >= 60) return "#F59E0B"
        return "#EF4444"
    }

    const renderSentenceCard = (sentence: Sentence) => (
        <TouchableOpacity
            key={sentence.id}
            style={[styles.sentenceCard, selectedSentence?.id === sentence.id && styles.selectedSentenceCard]}
            onPress={() => setSelectedSentence(sentence)}
        >
            <View style={styles.sentenceHeader}>
                <View style={[styles.difficultyBadge, { backgroundColor: `${getDifficultyColor(sentence.difficulty)}20` }]}>
                    <Text style={[styles.difficultyText, { color: getDifficultyColor(sentence.difficulty) }]}>
                        {sentence.difficulty === "easy" ? "Dễ" : sentence.difficulty === "medium" ? "Trung bình" : "Khó"}
                    </Text>
                </View>
                <TouchableOpacity onPress={playOriginalAudio}>
                    <Icon name="volume-up" size={20} color="#4F46E5" />
                </TouchableOpacity>
            </View>

            <Text style={styles.sentenceText}>{sentence.text}</Text>
            <Text style={styles.phoneticText}>{sentence.phonetic}</Text>
        </TouchableOpacity>
    )

    const renderResultModal = () => (
        <Modal visible={showResult} animationType="slide">
            <View style={styles.resultContainer}>
                <View style={styles.resultHeader}>
                    <Text style={styles.resultTitle}>Kết quả phát âm</Text>
                    <TouchableOpacity onPress={() => setShowResult(false)}>
                        <Icon name="close" size={24} color="#374151" />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.resultContent}>
                    {pronunciationResult && (
                        <>
                            {/* Overall Score */}
                            <View style={styles.overallScoreCard}>
                                <Text style={styles.overallScoreLabel}>Điểm tổng</Text>
                                <Text style={[styles.overallScore, { color: getScoreColor(pronunciationResult.overallScore) }]}>
                                    {pronunciationResult.overallScore}/100
                                </Text>
                                <View style={styles.scoreBar}>
                                    <View
                                        style={[
                                            styles.scoreBarFill,
                                            {
                                                width: `${pronunciationResult.overallScore}%`,
                                                backgroundColor: getScoreColor(pronunciationResult.overallScore),
                                            },
                                        ]}
                                    />
                                </View>
                            </View>

                            {/* Word by Word Analysis */}
                            <View style={styles.wordAnalysisSection}>
                                <Text style={styles.sectionTitle}>Phân tích từng từ</Text>
                                <View style={styles.originalSentence}>
                                    <Text style={styles.originalLabel}>Câu gốc:</Text>
                                    <Text style={styles.originalText}>{selectedSentence?.text}</Text>
                                </View>

                                <View style={styles.transcriptSentence}>
                                    <Text style={styles.transcriptLabel}>Bạn đã nói:</Text>
                                    <Text style={styles.transcriptText}>{pronunciationResult.transcript}</Text>
                                </View>

                                <View style={styles.wordScores}>
                                    {pronunciationResult.wordScores.map((wordScore, index) => (
                                        <View
                                            key={index}
                                            style={[styles.wordScoreItem, { backgroundColor: wordScore.isCorrect ? "#ECFDF5" : "#FEF2F2" }]}
                                        >
                                            <Text style={[styles.wordText, { color: wordScore.isCorrect ? "#10B981" : "#EF4444" }]}>
                                                {wordScore.word}
                                            </Text>
                                            <Text style={styles.wordScoreText}>{wordScore.score}/100</Text>
                                            {wordScore.suggestion && <Text style={styles.suggestionText}>{wordScore.suggestion}</Text>}
                                        </View>
                                    ))}
                                </View>
                            </View>

                            {/* Suggestions */}
                            <View style={styles.suggestionsSection}>
                                <Text style={styles.sectionTitle}>Gợi ý cải thiện</Text>
                                {pronunciationResult.suggestions.map((suggestion, index) => (
                                    <View key={index} style={styles.suggestionItem}>
                                        <Icon name="lightbulb" size={16} color="#F59E0B" />
                                        <Text style={styles.suggestionItemText}>{suggestion}</Text>
                                    </View>
                                ))}
                            </View>

                            {/* Action Buttons */}
                            <View style={styles.resultActions}>
                                <TouchableOpacity style={styles.actionButton} onPress={playOriginalAudio}>
                                    <Icon name="volume-up" size={20} color="#4F46E5" />
                                    <Text style={styles.actionButtonText}>Nghe lại mẫu</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.actionButton} onPress={playRecordedAudio}>
                                    <Icon name="play-arrow" size={20} color="#10B981" />
                                    <Text style={styles.actionButtonText}>Nghe bản ghi</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.actionButton} onPress={() => setShowResult(false)}>
                                    <Icon name="refresh" size={20} color="#F59E0B" />
                                    <Text style={styles.actionButtonText}>Thử lại</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </ScrollView>
            </View>
        </Modal>
    )

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-back" size={24} color="#374151" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Luyện nói</Text>
                <TouchableOpacity>
                    <Icon name="history" size={24} color="#6B7280" />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <Animated.View style={[styles.scrollContent, { opacity: fadeAnim }]}>
                    {/* Welcome Section */}
                    <View style={styles.welcomeSection}>
                        <Icon name="mic" size={64} color="#4F46E5" />
                        
                        <Text style={styles.welcomeTitle}>Luyện phát âm</Text>
                        <Text style={styles.welcomeText}>Chọn câu và luyện phát âm với AI đánh giá chính xác</Text>
                    </View>

                    {/* Categories */}
                    <View style={styles.categoriesSection}>
                        <Text style={styles.sectionTitle}>Chủ đề</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={styles.categoriesList}>
                                {categories.map((category) => (
                                    <TouchableOpacity
                                        key={category.id}
                                        style={[
                                            styles.categoryItem,
                                            currentCategory === category.id && styles.selectedCategoryItem,
                                            { borderColor: category.color },
                                        ]}
                                        onPress={() => setCurrentCategory(category.id)}
                                    >
                                        <Icon
                                            name={category.icon}
                                            size={20}
                                            color={currentCategory === category.id ? "#FFFFFF" : category.color}
                                        />
                                        <Text style={[styles.categoryText, currentCategory === category.id && styles.selectedCategoryText]}>
                                            {category.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                    </View>

                    {/* Sentences */}
                    <View style={styles.sentencesSection}>
                        <Text style={styles.sectionTitle}>Chọn câu luyện tập</Text>
                        {sentences.filter((s) => s.category === currentCategory).map(renderSentenceCard)}
                    </View>

                    {/* Recording Section */}
                    {selectedSentence && (
                        <View style={styles.recordingSection}>
                            <Text style={styles.recordingTitle}>Sẵn sàng luyện tập?</Text>
                            <Text style={styles.recordingInstruction}>Nhấn và giữ để ghi âm, thả ra để dừng</Text>

                            <Animated.View style={[styles.recordButton, { transform: [{ scale: pulseAnim }] }]}>
                                <TouchableOpacity
                                    style={[styles.recordButtonInner, isRecording && styles.recordingActive]}
                                    onPressIn={startRecording}
                                    onPressOut={stopRecording}
                                >
                                    <Icon name={isRecording ? "stop" : "mic"} size={32} color="#FFFFFF" />
                                </TouchableOpacity>
                            </Animated.View>

                            {isRecording && <Text style={styles.recordingText}>Đang ghi âm...</Text>}
                        </View>
                    )}
                </Animated.View>
            </ScrollView>

            {renderResultModal()}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8FAFC",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 16,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1F2937",
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    welcomeSection: {
        alignItems: "center",
        marginBottom: 30,
    },
    welcomeAnimation: {
        width: 120,
        height: 120,
        marginBottom: 16,
    },
    welcomeTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#1F2937",
        marginBottom: 8,
    },
    welcomeText: {
        fontSize: 14,
        color: "#6B7280",
        textAlign: "center",
        lineHeight: 20,
    },
    categoriesSection: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 16,
    },
    categoriesList: {
        flexDirection: "row",
        gap: 12,
        paddingHorizontal: 4,
    },
    categoryItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        backgroundColor: "#FFFFFF",
        gap: 6,
    },
    selectedCategoryItem: {
        backgroundColor: "#4F46E5",
        borderColor: "#4F46E5",
    },
    categoryText: {
        fontSize: 14,
        color: "#374151",
        fontWeight: "500",
    },
    selectedCategoryText: {
        color: "#FFFFFF",
    },
    sentencesSection: {
        marginBottom: 30,
    },
    sentenceCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: "transparent",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    selectedSentenceCard: {
        borderColor: "#4F46E5",
        backgroundColor: "#EEF2FF",
    },
    sentenceHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    difficultyBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    difficultyText: {
        fontSize: 10,
        fontWeight: "600",
    },
    sentenceText: {
        fontSize: 16,
        color: "#1F2937",
        marginBottom: 8,
        lineHeight: 24,
    },
    phoneticText: {
        fontSize: 14,
        color: "#6B7280",
        fontStyle: "italic",
    },
    recordingSection: {
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    recordingTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 8,
    },
    recordingInstruction: {
        fontSize: 14,
        color: "#6B7280",
        textAlign: "center",
        marginBottom: 24,
    },
    recordButton: {
        marginBottom: 16,
    },
    recordButtonInner: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "#4F46E5",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    recordingActive: {
        backgroundColor: "#EF4444",
    },
    recordingText: {
        fontSize: 14,
        color: "#EF4444",
        fontWeight: "500",
    },
    resultContainer: {
        flex: 1,
        backgroundColor: "#F8FAFC",
    },
    resultHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 16,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    resultTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1F2937",
    },
    resultContent: {
        flex: 1,
        padding: 20,
    },
    overallScoreCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 24,
        alignItems: "center",
        marginBottom: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    overallScoreLabel: {
        fontSize: 16,
        color: "#6B7280",
        marginBottom: 8,
    },
    overallScore: {
        fontSize: 48,
        fontWeight: "bold",
        marginBottom: 16,
    },
    scoreBar: {
        width: "100%",
        height: 8,
        backgroundColor: "#E5E7EB",
        borderRadius: 4,
        overflow: "hidden",
    },
    scoreBarFill: {
        height: "100%",
        borderRadius: 4,
    },
    wordAnalysisSection: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    originalSentence: {
        marginBottom: 12,
    },
    originalLabel: {
        fontSize: 14,
        color: "#6B7280",
        marginBottom: 4,
    },
    originalText: {
        fontSize: 16,
        color: "#1F2937",
    },
    transcriptSentence: {
        marginBottom: 16,
    },
    transcriptLabel: {
        fontSize: 14,
        color: "#6B7280",
        marginBottom: 4,
    },
    transcriptText: {
        fontSize: 16,
        color: "#1F2937",
    },
    wordScores: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    wordScoreItem: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: "center",
        minWidth: 60,
    },
    wordText: {
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 2,
    },
    wordScoreText: {
        fontSize: 10,
        color: "#6B7280",
    },
    suggestionText: {
        fontSize: 10,
        color: "#6B7280",
        textAlign: "center",
        marginTop: 2,
    },
    suggestionsSection: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    suggestionItem: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 8,
        gap: 8,
    },
    suggestionItemText: {
        flex: 1,
        fontSize: 14,
        color: "#374151",
        lineHeight: 20,
    },
    resultActions: {
        flexDirection: "row",
        justifyContent: "space-around",
        marginTop: 20,
    },
    actionButton: {
        alignItems: "center",
        gap: 4,
    },
    actionButtonText: {
        fontSize: 12,
        color: "#6B7280",
    },
})

export default SpeakingScreen
