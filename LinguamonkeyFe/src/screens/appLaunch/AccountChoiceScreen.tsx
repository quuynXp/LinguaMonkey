"use client"

import { useEffect, useRef } from "react"
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import Icon from 'react-native-vector-icons/MaterialIcons';

const AccountChoiceScreen = ({ navigation }) => {
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
  

        {/* App Title */}
        <Text style={styles.appTitle}>LinguaLearn</Text>
        <Text style={styles.appSubtitle}>Choose how you'd like to get started</Text>

        {/* Account Options */}
        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={[styles.optionButton, styles.loginButton]}
            onPress={() => navigation.navigate("Login")}
            activeOpacity={0.8}
          >
            <View style={styles.optionIcon}>
              <Icon name="login" size={32} color="#FFFFFF" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Sign In</Text>
              <Text style={styles.optionDescription}>Already have an account? Welcome back!</Text>
            </View>
            <Icon name="arrow-forward" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionButton, styles.registerButton]}
            onPress={() => navigation.navigate("RegisterAccount")}
            activeOpacity={0.8}
          >
            <View style={[styles.optionIcon, styles.registerIcon]}>
              <Icon name="person-add" size={32} color="#10B981" />
            </View>
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, styles.registerTitle]}>Create Account</Text>
              <Text style={[styles.optionDescription, styles.registerDescription]}>
                Set up your personalized learning profile
              </Text>
            </View>
            <Icon name="arrow-forward" size={24} color="#10B981" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionButton, styles.quickStartButton]}
            onPress={() => navigation.navigate("QuickStart")}
            activeOpacity={0.8}
          >
            <View style={[styles.optionIcon, styles.quickStartIcon]}>
              <Icon name="flash-on" size={32} color="#F59E0B" />
            </View>
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, styles.quickStartTitle]}>Start Now</Text>
              <Text style={[styles.optionDescription, styles.quickStartDescription]}>
                Jump right in with a temporary account
              </Text>
            </View>
            <Icon name="arrow-forward" size={24} color="#F59E0B" />
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
    marginBottom: 48,
    lineHeight: 24,
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
  loginButton: {
    backgroundColor: "#4F46E5",
  },
  registerButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#10B981",
  },
  quickStartButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#F59E0B",
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
  registerIcon: {
    backgroundColor: "#D1FAE5",
  },
  quickStartIcon: {
    backgroundColor: "#FEF3C7",
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
  registerTitle: {
    color: "#10B981",
  },
  quickStartTitle: {
    color: "#F59E0B",
  },
  optionDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    lineHeight: 20,
  },
  registerDescription: {
    color: "#6B7280",
  },
  quickStartDescription: {
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

export default AccountChoiceScreen
