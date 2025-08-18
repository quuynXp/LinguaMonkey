"use client"

import Icon from 'react-native-vector-icons/MaterialIcons';
import { useEffect, useRef, useState } from "react"
import { Alert, Animated, Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import * as FileSystem from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import { Platform } from "react-native";

const { width, height } = Dimensions.get("window")

interface GameQuestion {
  id: string
  audioInstruction: string
  correctDirection: "north" | "south" | "east" | "west" | "northeast" | "northwest" | "southeast" | "southwest"
  targetLocation: string
  mapImage: string
  startPosition: { x: number; y: number }
  targetPosition: { x: number; y: number }
}



const GameBasedLearningScreen = ({ navigation }: any) => {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [score, setScore] = useState(0)
  const [isListening, setIsListening] = useState(false)
  const [userResponse, setUserResponse] = useState("")
  const [gameState, setGameState] = useState<"instruction" | "listening" | "moving" | "result">("instruction")
  const [characterPosition, setCharacterPosition] = useState({ x: 0, y: 0 })
  const [isCorrect, setIsCorrect] = useState(false)

  const characterAnimation = useRef(new Animated.ValueXY()).current

  const questions: GameQuestion[] = [
    {
      id: "1",
      audioInstruction: "Go north to reach the library",
      correctDirection: "north",
      targetLocation: "Library",
      mapImage: "/placeholder.svg?height=300&width=300",
      startPosition: { x: 150, y: 200 },
      targetPosition: { x: 150, y: 100 },
    },
    {
      id: "2",
      audioInstruction: "Head southeast to find the coffee shop",
      correctDirection: "southeast",
      targetLocation: "Coffee Shop",
      mapImage: "/placeholder.svg?height=300&width=300",
      startPosition: { x: 100, y: 100 },
      targetPosition: { x: 200, y: 200 },
    },
    {
      id: "3",
      audioInstruction: "Walk west to reach the park entrance",
      correctDirection: "west",
      targetLocation: "Park",
      mapImage: "/placeholder.svg?height=300&width=300",
      startPosition: { x: 200, y: 150 },
      targetPosition: { x: 50, y: 150 },
    },
  ]

  useEffect(() => {
    if (questions[currentQuestion]) {
      const startPos = questions[currentQuestion].startPosition
      setCharacterPosition(startPos)
      characterAnimation.setValue(startPos)
    }
  }, [currentQuestion])



  const startListening = async () => {
    try {
      // Giả sử bạn đã có file âm thanh từ Microphone
      const result = await DocumentPicker.getDocumentAsync({ type: "audio/*" });

      if (result.type === "success") {
        setGameState("listening");
        const transcript = await uploadAndTranscribeAudio(result.uri);
        setUserResponse(transcript);
        processVoiceResponse(transcript);
      } else {
        Alert.alert("Thông báo", "Bạn chưa chọn file âm thanh.");
      }
    } catch (error) {
      Alert.alert("Lỗi", "Không thể gửi file âm thanh để phân tích.");
    }
  };


  const uploadAndTranscribeAudio = async (filePath: string): Promise<string> => {
    const fileUri = Platform.OS === 'ios' ? filePath : `file://${filePath}`;
    const formData = new FormData();

    formData.append('file', {
      uri: fileUri,
      name: 'recording.m4a',
      type: 'audio/m4a',
    } as any);

    try {
      const response = await fetch("http://localhost:8080/api/speech-to-text", {
        method: "POST",
        headers: {
          "Content-Type": "multipart/form-data",
        },
        body: formData,
      });

      const data = await response.json();
      return data.transcript;
    } catch (err) {
      console.error("Upload error:", err);
      Alert.alert("Lỗi", "Không thể gửi file âm thanh để phân tích.");
      return "";
    }
  };


  const processVoiceResponse = async (response: string) => {
    // Simulate backend analysis
    setGameState("moving")

    // Simple direction detection (in real app, this would be sent to backend)
    const directions = ["north", "south", "east", "west", "northeast", "northwest", "southeast", "southwest"]
    const detectedDirection = directions.find((dir) => response.toLowerCase().includes(dir))

    const currentQ = questions[currentQuestion]
    const isResponseCorrect = detectedDirection === currentQ.correctDirection

    // Animate character movement
    const targetPos = isResponseCorrect ? currentQ.targetPosition : getRandomPosition()

    Animated.timing(characterAnimation, {
      toValue: targetPos,
      duration: 2000,
      useNativeDriver: false,
    }).start(() => {
      setCharacterPosition(targetPos)
      setIsCorrect(isResponseCorrect)
      setGameState("result")

      if (isResponseCorrect) {
        setScore((prev) => prev + 10)
      }
    })
  }

  const getRandomPosition = () => {
    return {
      x: Math.random() * 250 + 25,
      y: Math.random() * 250 + 25,
    }
  }

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1)
      setGameState("instruction")
      setUserResponse("")
      setIsCorrect(false)
    } else {
      // Game completed
      Alert.alert("Game Complete!", `Your final score: ${score}/${questions.length * 10}`, [
        { text: "Play Again", onPress: resetGame },
      ])
    }
  }

  const resetGame = () => {
    setCurrentQuestion(0)
    setScore(0)
    setGameState("instruction")
    setUserResponse("")
    setIsCorrect(false)
  }

  const playAudioInstruction = () => {
    // In a real app, this would play the audio file
    Alert.alert("Audio Instruction", questions[currentQuestion].audioInstruction)
  }

  const renderGameMap = () => {
    const currentQ = questions[currentQuestion]

    return (
      <View style={styles.gameMap}>
        <Image source={{ uri: currentQ.mapImage }} style={styles.mapBackground} />

        {/* Target location marker */}
        <View
          style={[
            styles.targetMarker,
            {
              left: currentQ.targetPosition.x - 15,
              top: currentQ.targetPosition.y - 15,
            },
          ]}
        >
          <Icon name="place" size={30} color="#FF6B6B" />
        </View>

        {/* Character */}
        <Animated.View
          style={[
            styles.character,
            {
              left: characterAnimation.x,
              top: characterAnimation.y,
            },
          ]}
        >
          <View style={styles.characterCircle}>
            <Icon name="person" size={20} color="#FFFFFF" />
          </View>
        </Animated.View>

        {/* Compass */}
        <View style={styles.compass}>
          <Text style={styles.compassText}>N</Text>
          <View style={styles.compassCenter}>
            <Text style={styles.compassText}>W</Text>
            <View style={styles.compassDot} />
            <Text style={styles.compassText}>E</Text>
          </View>
          <Text style={styles.compassText}>S</Text>
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Navigation Game</Text>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreText}>{score}</Text>
        </View>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((currentQuestion + 1) / questions.length) * 100}%` }]} />
      </View>

      <Text style={styles.questionCounter}>
        Question {currentQuestion + 1} of {questions.length}
      </Text>

      {renderGameMap()}

      <View style={styles.gameControls}>
        {gameState === "instruction" && (
          <View style={styles.instructionPanel}>
            <Text style={styles.instructionTitle}>Listen to the direction:</Text>
            <TouchableOpacity style={styles.playButton} onPress={playAudioInstruction}>
              <Icon name="play-arrow" size={30} color="#FFFFFF" />
              <Text style={styles.playButtonText}>Play Audio</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.micButton} onPress={startListening}>
              <Icon name="mic" size={24} color="#FFFFFF" />
              <Text style={styles.micButtonText}>Give Direction</Text>
            </TouchableOpacity>
          </View>
        )}

        {gameState === "listening" && (
          <View style={styles.listeningPanel}>
            <View style={styles.listeningIndicator}>
              <Icon name="mic" size={40} color="#FF6B6B" />
            </View>
            <Text style={styles.listeningText}>Listening...</Text>
            <Text style={styles.listeningSubtext}>Say the direction to move</Text>
          </View>
        )}

        {gameState === "moving" && (
          <View style={styles.movingPanel}>
            <Text style={styles.movingText}>Moving character...</Text>
            {userResponse && <Text style={styles.responseText}>You said: "{userResponse}"</Text>}
          </View>
        )}

        {gameState === "result" && (
          <View style={styles.resultPanel}>
            <View style={[styles.resultIcon, { backgroundColor: isCorrect ? "#4CAF50" : "#F44336" }]}>
              <Icon name={isCorrect ? "check" : "close"} size={40} color="#FFFFFF" />
            </View>
            <Text style={[styles.resultText, { color: isCorrect ? "#4CAF50" : "#F44336" }]}>
              {isCorrect ? "Correct!" : "Incorrect!"}
            </Text>
            {isCorrect ? (
              <Text style={styles.resultSubtext}>
                Great job! You reached the {questions[currentQuestion].targetLocation}
              </Text>
            ) : (
              <Text style={styles.resultSubtext}>
                The correct direction was {questions[currentQuestion].correctDirection}
              </Text>
            )}
            <TouchableOpacity style={styles.nextButton} onPress={nextQuestion}>
              <Text style={styles.nextButtonText}>
                {currentQuestion < questions.length - 1 ? "Next Question" : "Finish Game"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  scoreContainer: {
    backgroundColor: "#4ECDC4",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  scoreText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  progressBar: {
    height: 4,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 2,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4ECDC4",
    borderRadius: 2,
  },
  questionCounter: {
    textAlign: "center",
    fontSize: 14,
    color: "#666",
    marginVertical: 10,
  },
  gameMap: {
    height: 300,
    marginHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    position: "relative",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapBackground: {
    width: "100%",
    height: "100%",
    opacity: 0.3,
  },
  targetMarker: {
    position: "absolute",
    zIndex: 2,
  },
  character: {
    position: "absolute",
    zIndex: 3,
  },
  characterCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#4ECDC4",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  compass: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 25,
    padding: 8,
    alignItems: "center",
  },
  compassCenter: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 2,
  },
  compassText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#333",
    marginHorizontal: 8,
  },
  compassDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#333",
    marginHorizontal: 4,
  },
  gameControls: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  instructionPanel: {
    alignItems: "center",
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 20,
  },
  playButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#45B7D1",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 15,
  },
  playButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  micButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF6B6B",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  micButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  listeningPanel: {
    alignItems: "center",
  },
  listeningIndicator: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 107, 107, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  listeningText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FF6B6B",
    marginBottom: 5,
  },
  listeningSubtext: {
    fontSize: 14,
    color: "#666",
  },
  movingPanel: {
    alignItems: "center",
  },
  movingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  responseText: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },
  resultPanel: {
    alignItems: "center",
  },
  resultIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  resultText: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  resultSubtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  nextButton: {
    backgroundColor: "#4ECDC4",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  nextButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
})

export default GameBasedLearningScreen
