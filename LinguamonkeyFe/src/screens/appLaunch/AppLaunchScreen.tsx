"use client"

import { useEffect, useRef, useState } from "react"
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import Icon from 'react-native-vector-icons/MaterialIcons';

const AppLaunchScreen = ({ navigation }) => {
  const [selectedOption, setSelectedOption] = useState<"new" | "existing" | null>(null)
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(50)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  const handleOptionSelect = (option: "new" | "existing") => {
    setSelectedOption(option)
    setTimeout(() => {
      if (option === "new") {
        navigation.navigate("AccountSetup")
      } else {
        navigation.navigate("Login")
      }
    }, 300)
  }

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Welcome Animation */}
      

        {/* App Title */}
        <Text style={styles.appTitle}>LinguaLearn</Text>
        <Text style={styles.appSubtitle}>Your AI-Powered Language Learning Journey</Text>

        {/* Feature Highlights */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <Icon name="psychology" size={24} color="#4F46E5" />
            <Text style={styles.featureText}>AI-Powered Learning</Text>
          </View>
          <View style={styles.featureItem}>
            <Icon name="people" size={24} color="#10B981" />
            <Text style={styles.featureText}>Social Learning</Text>
          </View>
          <View style={styles.featureItem}>
            <Icon name="emoji-events" size={24} color="#F59E0B" />
            <Text style={styles.featureText}>Gamified Experience</Text>
          </View>
        </View>

        {/* Account Options */}
        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={[styles.optionButton, styles.newAccountButton, selectedOption === "new" && styles.selectedOption]}
            onPress={() => handleOptionSelect("new")}
            activeOpacity={0.8}
          >
            <View style={styles.optionIcon}>
              <Icon name="person-add" size={32} color="#FFFFFF" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Start Fresh</Text>
              <Text style={styles.optionDescription}>Create a new account and begin your learning journey</Text>
            </View>
            <Icon name="arrow-forward" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionButton,
              styles.existingAccountButton,
              selectedOption === "existing" && styles.selectedOption,
            ]}
            onPress={() => handleOptionSelect("existing")}
            activeOpacity={0.8}
          >
            <View style={[styles.optionIcon, styles.existingIcon]}>
              <Icon name="login" size={32} color="#4F46E5" />
            </View>
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, styles.existingTitle]}>Welcome Back</Text>
              <Text style={[styles.optionDescription, styles.existingDescription]}>
                Sign in to continue your progress
              </Text>
            </View>
            <Icon name="arrow-forward" size={24} color="#4F46E5" />
          </TouchableOpacity>
        </View>

        {/* Terms and Privacy */}
        <Text style={styles.termsText}>
          By continuing, you agree to our <Text style={styles.linkText}>Terms of Service</Text> and{" "}
          <Text style={styles.linkText}>Privacy Policy</Text>
        </Text>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  welcomeAnimation: {
    width: 200,
    height: 200,
    marginBottom: 32,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  appSubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 24,
  },
  featuresContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 48,
  },
  featureItem: {
    alignItems: "center",
    flex: 1,
  },
  featureText: {
    fontSize: 12,
    color: "#374151",
    marginTop: 8,
    textAlign: "center",
    fontWeight: "500",
  },
  optionsContainer: {
    width: "100%",
    gap: 16,
    marginBottom: 32,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  newAccountButton: {
    backgroundColor: "#4F46E5",
  },
  existingAccountButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  selectedOption: {
    transform: [{ scale: 0.98 }],
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  existingIcon: {
    backgroundColor: "#EEF2FF",
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  existingTitle: {
    color: "#1F2937",
  },
  optionDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    lineHeight: 20,
  },
  existingDescription: {
    color: "#6B7280",
  },
  termsText: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 18,
  },
  linkText: {
    color: "#4F46E5",
    fontWeight: "500",
  },
})

export default AppLaunchScreen
