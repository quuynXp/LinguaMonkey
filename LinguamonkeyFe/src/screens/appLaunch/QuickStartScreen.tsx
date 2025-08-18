"use client"

import { useEffect, useRef, useState } from "react"
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import Icon from 'react-native-vector-icons/MaterialIcons';
import type { StackNavigationProp } from '@react-navigation/stack';

type QuickStartScreenProps = {
  navigation: StackNavigationProp<any>;
};

const QuickStartScreen = ({ navigation }: QuickStartScreenProps) => {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedUser, setGeneratedUser] = useState(null)

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

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

  const handleQuickStart = async () => {
    setIsGenerating(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Không còn generate user ở đây nữa
      navigation.navigate("SetupInitScreen")


    } catch (error) {
      console.error("Failed to generate account:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  if (generatedUser) {
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
          {/* Success Animation */}
        

          {/* Generated Account Info */}
          <View style={styles.accountCard}>
            <Text style={styles.avatarText}>{generatedUser.avatar}</Text>
            <Text style={styles.generatedName}>{generatedUser.fullName}</Text>
            <Text style={styles.generatedEmail}>{generatedUser.email}</Text>
            <Text style={styles.userIdText}>ID: {generatedUser.userId}</Text>
          </View>

          <Text style={styles.successTitle}>Account Created!</Text>
          <Text style={styles.successSubtitle}>
            Your temporary account is ready. You can upgrade to a permanent account anytime in settings.
          </Text>

          <View style={styles.featuresContainer}>
            <View style={styles.featureItem}>
              <Icon name="check-circle" size={20} color="#10B981" />
              <Text style={styles.featureText}>Full access to all lessons</Text>
            </View>
            <View style={styles.featureItem}>
              <Icon name="check-circle" size={20} color="#10B981" />
              <Text style={styles.featureText}>Progress tracking</Text>
            </View>
            <View style={styles.featureItem}>
              <Icon name="check-circle" size={20} color="#10B981" />
              <Text style={styles.featureText}>AI-powered learning</Text>
            </View>
          </View>

          <Text style={styles.redirectText}>Starting your learning journey...</Text>
        </Animated.View>
      </View>
    )
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

       

        {/* Title */}
        <Text style={styles.title}>Quick Start</Text>
        <Text style={styles.subtitle}>Jump right into learning with a temporary account. No email required!</Text>

        {/* Benefits */}
        <View style={styles.benefitsContainer}>
          <View style={styles.benefitItem}>
            <Icon name="flash-on" size={24} color="#F59E0B" />
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Instant Access</Text>
              <Text style={styles.benefitDescription}>Start learning immediately</Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <Icon name="privacy-tip" size={24} color="#10B981" />
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>No Personal Info</Text>
              <Text style={styles.benefitDescription}>We'll generate everything for you</Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <Icon name="upgrade" size={24} color="#4F46E5" />
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Upgrade Anytime</Text>
              <Text style={styles.benefitDescription}>Convert to permanent account later</Text>
            </View>
          </View>
        </View>

        {/* Quick Start Button */}
        <TouchableOpacity
          style={[styles.quickStartButton, isGenerating && styles.buttonDisabled]}
          onPress={handleQuickStart}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <Icon name="hourglass-top" size={24} color="#FFFFFF" />
              <Text style={styles.quickStartButtonText}>Generating Account...</Text>
            </>
          ) : (
            <>
              <Icon name="rocket-launch" size={24} color="#FFFFFF" />
              <Text style={styles.quickStartButtonText}>Generate Account & Start</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Alternative Options */}
        <View style={styles.alternativeContainer}>
          <Text style={styles.alternativeText}>Prefer a permanent account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={styles.alternativeLink}>Sign In</Text>
          </TouchableOpacity>
        </View>

        {/* Disclaimer */}
        <Text style={styles.disclaimerText}>
          Temporary accounts are automatically deleted after 30 days of inactivity. Upgrade to keep your progress
          forever.
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
    paddingTop: 50,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  quickStartAnimation: {
    width: 150,
    height: 150,
    alignSelf: "center",
    marginBottom: 24,
  },
  successAnimation: {
    width: 120,
    height: 120,
    alignSelf: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  benefitsContainer: {
    marginBottom: 40,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  benefitContent: {
    marginLeft: 16,
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  benefitDescription: {
    fontSize: 14,
    color: "#6B7280",
  },
  quickStartButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F59E0B",
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  quickStartButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  loadingAnimation: {
    width: 24,
    height: 24,
  },
  accountCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    fontSize: 48,
    marginBottom: 12,
  },
  generatedName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  generatedEmail: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  userIdText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontFamily: "monospace",
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#10B981",
    textAlign: "center",
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
  },
  featuresContainer: {
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: "#374151",
    marginLeft: 12,
  },
  redirectText: {
    fontSize: 14,
    color: "#F59E0B",
    textAlign: "center",
    fontWeight: "500",
  },
  alternativeContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  alternativeText: {
    fontSize: 14,
    color: "#6B7280",
    marginRight: 4,
  },
  alternativeLink: {
    fontSize: 14,
    color: "#4F46E5",
    fontWeight: "600",
  },
  disclaimerText: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 18,
  },
})

export default QuickStartScreen
