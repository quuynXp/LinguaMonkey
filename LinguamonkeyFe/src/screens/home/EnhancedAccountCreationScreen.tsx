// import { useEffect, useRef, useState } from "react"
// import { Alert, Animated, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native"
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import { createScaledSheet } from "../../utils/scaledStyles";
// interface Character3D {
//   id: string
//   name: string
//   type: string
//   emoji: string
//   description: string
//   modelUrl: string
// }

// interface UserProfile {
//   name: string
//   email: string
//   password: string
//   gender: "male" | "female" | "other" | ""
//   age: string
//   studyPurpose: string[]
//   interests: string[]
//   learningIntensity: "intensive" | "stable" | ""
//   selectedCharacter: Character3D | null
//   nativeLanguage: string
//   targetLanguage: string
// }

// const EnhancedAccountCreationScreen = ({ navigation }) => {
//   const [currentStep, setCurrentStep] = useState(0)
//   const [userProfile, setUserProfile] = useState<UserProfile>({
//     name: "",
//     email: "",
//     password: "",
//     gender: "",
//     age: "",
//     studyPurpose: [],
//     interests: [],
//     learningIntensity: "",
//     selectedCharacter: null,
//     nativeLanguage: "",
//     targetLanguage: "",
//   })

//   const fadeAnim = useRef(new Animated.Value(0)).current
//   const slideAnim = useRef(new Animated.Value(30)).current

//   const characters: Character3D[] = [
//     {
//       id: "wizard",
//       name: "Luna the Wizard",
//       type: "wizard",
//       emoji: "🧙‍♀️",
//       description: "Master of languages and ancient wisdom",
//       modelUrl: "wizard_female.glb",
//     },
//     {
//       id: "warrior",
//       name: "Alex the Warrior",
//       type: "warrior",
//       emoji: "⚔️",
//       description: "Brave and determined language fighter",
//       modelUrl: "warrior_male.glb",
//     },
//     {
//       id: "mage",
//       name: "Sage the Mage",
//       type: "mage",
//       emoji: "🔮",
//       description: "Mystical scholar of communication",
//       modelUrl: "mage_neutral.glb",
//     },
//     {
//       id: "archer",
//       name: "Robin the Archer",
//       type: "archer",
//       emoji: "🏹",
//       description: "Precise and focused language learner",
//       modelUrl: "archer_female.glb",
//     },
//     {
//       id: "knight",
//       name: "Arthur the Knight",
//       type: "knight",
//       emoji: "🛡️",
//       description: "Noble protector of proper grammar",
//       modelUrl: "knight_male.glb",
//     },
//     {
//       id: "ninja",
//       name: "Kira the Ninja",
//       type: "ninja",
//       emoji: "🥷",
//       description: "Swift and silent vocabulary master",
//       modelUrl: "ninja_neutral.glb",
//     },
//   ]

//   const studyPurposes = [
//     { id: "academic", name: "Academic Study", icon: "school", description: "University or academic requirements" },
//     { id: "business", name: "Business", icon: "business", description: "Professional development" },
//     { id: "travel", name: "Travel", icon: "flight", description: "Tourism and exploration" },
//     { id: "immigration", name: "Immigration", icon: "public", description: "Moving to new country" },
//     { id: "personal", name: "Personal Interest", icon: "favorite", description: "Hobby and self-improvement" },
//     { id: "test", name: "Test Preparation", icon: "assignment", description: "TOEIC, IELTS, TOEFL" },
//   ]

//   const interests = [
//     { id: "movies", name: "Movies & TV", icon: "movie" },
//     { id: "music", name: "Music", icon: "music-note" },
//     { id: "sports", name: "Sports", icon: "sports-soccer" },
//     { id: "technology", name: "Technology", icon: "computer" },
//     { id: "cooking", name: "Cooking", icon: "restaurant" },
//     { id: "reading", name: "Reading", icon: "menu-book" },
//     { id: "gaming", name: "Gaming", icon: "sports-esports" },
//     { id: "art", name: "Art & Design", icon: "palette" },
//     { id: "science", name: "Science", icon: "science" },
//     { id: "history", name: "History", icon: "account-balance" },
//   ]

//   const languages = [
//     { code: "en", name: "English", flag: "🇺🇸" },
//     { code: "zh", name: "中文", flag: "🇨🇳" },
//     { code: "vi", name: "Tiếng Việt", flag: "🇻🇳" },
//     { code: "ja", name: "日本語", flag: "🇯🇵" },
//     { code: "ko", name: "한국어", flag: "🇰🇷" },
//     { code: "fr", name: "Français", flag: "🇫🇷" },
//     { code: "es", name: "Español", flag: "🇪🇸" },
//     { code: "de", name: "Deutsch", flag: "🇩🇪" },
//   ]

//   const steps = [
//     "Basic Info",
//     "Personal Details",
//     "Study Goals",
//     "Interests",
//     "Learning Style",
//     "Character Selection",
//     "Languages",
//     "Complete",
//   ]

//   useEffect(() => {
//     Animated.parallel([
//       Animated.timing(fadeAnim, {
//         toValue: 1,
//         duration: 600,
//         useNativeDriver: true,
//       }),
//       Animated.timing(slideAnim, {
//         toValue: 0,
//         duration: 600,
//         useNativeDriver: true,
//       }),
//     ]).start()
//   }, [currentStep])

//   const handleNext = () => {
//     if (validateCurrentStep()) {
//       if (currentStep < steps.length - 1) {
//         setCurrentStep(currentStep + 1)
//       } else {
//         handleCreateAccount()
//       }
//     }
//   }

//   const handleBack = () => {
//     if (currentStep > 0) {
//       setCurrentStep(currentStep - 1)
//     }
//   }

//   const validateCurrentStep = () => {
//     switch (currentStep) {
//       case 0:
//         if (!userProfile.name || !userProfile.email || !userProfile.password) {
//           Alert.alert("Error", "Please fill in all required fields")
//           return false
//         }
//         break
//       case 1:
//         if (!userProfile.gender || !userProfile.age) {
//           Alert.alert("Error", "Please select your gender and age")
//           return false
//         }
//         break
//       case 2:
//         if (userProfile.studyPurpose.length === 0) {
//           Alert.alert("Error", "Please select at least one study purpose")
//           return false
//         }
//         break
//       case 3:
//         if (userProfile.interests.length === 0) {
//           Alert.alert("Error", "Please select at least one interest")
//           return false
//         }
//         break
//       case 4:
//         if (!userProfile.learningIntensity) {
//           Alert.alert("Error", "Please select your learning intensity")
//           return false
//         }
//         break
//       case 5:
//         if (!userProfile.selectedCharacter) {
//           Alert.alert("Error", "Please select your 3D character")
//           return false
//         }
//         break
//       case 6:
//         if (!userProfile.nativeLanguage || !userProfile.targetLanguage) {
//           Alert.alert("Error", "Please select your languages")
//           return false
//         }
//         break
//     }
//     return true
//   }

//   const handleCreateAccount = async () => {
//     try {
//       // In real app, send to API
//       console.log("Creating account with profile:", userProfile)
//       Alert.alert("Success", "Account created successfully!", [
//         { text: "OK", onPress: () => navigation.navigate("Home") },
//       ])
//     } catch (error) {
//       Alert.alert("Error", "Failed to create account. Please try again.")
//     }
//   }

//   const toggleArraySelection = (array: string[], item: string, setter: (arr: string[]) => void) => {
//     if (array.includes(item)) {
//       setter(array.filter((i) => i !== item))
//     } else {
//       setter([...array, item])
//     }
//   }

//   const renderProgressBar = () => (
//     <View style={styles.progressContainer}>
//       <View style={styles.progressBar}>
//         <View style={[styles.progressFill, { width: `${((currentStep + 1) / steps.length) * 100}%` }]} />
//       </View>
//       <Text style={styles.progressText}>
//         Step {currentStep + 1} of {steps.length}: {steps[currentStep]}
//       </Text>
//     </View>
//   )

//   const renderBasicInfo = () => (
//     <View style={styles.stepContainer}>
//       <Text style={styles.stepTitle}>Lets get started!</Text>
//       <Text style={styles.stepDescription}>Tell us a bit about yourself</Text>

//       <View style={styles.inputContainer}>
//         <Text style={styles.inputLabel}>Full Name *</Text>
//         <TextInput
//           style={styles.textInput}
//           placeholder="Enter your full name"
//           value={userProfile.name}
//           onChangeText={(text) => setUserProfile({ ...userProfile, name: text })}
//         />
//       </View>

//       <View style={styles.inputContainer}>
//         <Text style={styles.inputLabel}>Email Address *</Text>
//         <TextInput
//           style={styles.textInput}
//           placeholder="Enter your email"
//           value={userProfile.email}
//           onChangeText={(text) => setUserProfile({ ...userProfile, email: text })}
//           keyboardType="email-address"
//           autoCapitalize="none"
//         />
//       </View>

//       <View style={styles.inputContainer}>
//         <Text style={styles.inputLabel}>Password *</Text>
//         <TextInput
//           style={styles.textInput}
//           placeholder="Create a password"
//           value={userProfile.password}
//           onChangeText={(text) => setUserProfile({ ...userProfile, password: text })}
//           secureTextEntry
//         />
//       </View>
//     </View>
//   )

//   const renderPersonalDetails = () => (
//     <View style={styles.stepContainer}>
//       <Text style={styles.stepTitle}>Personal Details</Text>
//       <Text style={styles.stepDescription}>Help us personalize your experience</Text>

//       <View style={styles.sectionContainer}>
//         <Text style={styles.sectionTitle}>Gender *</Text>
//         <View style={styles.optionsGrid}>
//           {[
//             { value: "male", label: "Male", icon: "man" },
//             { value: "female", label: "Female", icon: "woman" },
//             { value: "other", label: "Other", icon: "person" },
//           ].map((option) => (
//             <TouchableOpacity
//               key={option.value}
//               style={[styles.optionButton, userProfile.gender === option.value && styles.selectedOption]}
//               onPress={() => setUserProfile({ ...userProfile, gender: option.value as any })}
//             >
//               <Icon name={option.icon} size={24} color={userProfile.gender === option.value ? "#FFFFFF" : "#6B7280"} />
//               <Text style={[styles.optionText, userProfile.gender === option.value && styles.selectedOptionText]}>
//                 {option.label}
//               </Text>
//             </TouchableOpacity>
//           ))}
//         </View>
//       </View>

//       <View style={styles.sectionContainer}>
//         <Text style={styles.sectionTitle}>Age Range *</Text>
//         <View style={styles.optionsGrid}>
//           {["13-17", "18-24", "25-34", "35-44", "45-54", "55+"].map((age) => (
//             <TouchableOpacity
//               key={age}
//               style={[styles.optionButton, userProfile.age === age && styles.selectedOption]}
//               onPress={() => setUserProfile({ ...userProfile, age })}
//             >
//               <Text style={[styles.optionText, userProfile.age === age && styles.selectedOptionText]}>{age}</Text>
//             </TouchableOpacity>
//           ))}
//         </View>
//       </View>
//     </View>
//   )

//   const renderStudyGoals = () => (
//     <View style={styles.stepContainer}>
//       <Text style={styles.stepTitle}>Study Goals</Text>
//       <Text style={styles.stepDescription}>Whats your main purpose for learning? (Select all that apply)</Text>

//       <View style={styles.purposesList}>
//         {studyPurposes.map((purpose) => (
//           <TouchableOpacity
//             key={purpose.id}
//             style={[styles.purposeCard, userProfile.studyPurpose.includes(purpose.id) && styles.selectedPurposeCard]}
//             onPress={() =>
//               toggleArraySelection(userProfile.studyPurpose, purpose.id, (arr) =>
//                 setUserProfile({ ...userProfile, studyPurpose: arr }),
//               )
//             }
//           >
//             <View style={styles.purposeIcon}>
//               <Icon
//                 name={purpose.icon}
//                 size={24}
//                 color={userProfile.studyPurpose.includes(purpose.id) ? "#4F46E5" : "#6B7280"}
//               />
//             </View>
//             <View style={styles.purposeInfo}>
//               <Text
//                 style={[
//                   styles.purposeName,
//                   userProfile.studyPurpose.includes(purpose.id) && styles.selectedPurposeName,
//                 ]}
//               >
//                 {purpose.name}
//               </Text>
//               <Text style={styles.purposeDescription}>{purpose.description}</Text>
//             </View>
//             {userProfile.studyPurpose.includes(purpose.id) && <Icon name="check-circle" size={20} color="#4F46E5" />}
//           </TouchableOpacity>
//         ))}
//       </View>
//     </View>
//   )

//   const renderInterests = () => (
//     <View style={styles.stepContainer}>
//       <Text style={styles.stepTitle}>Your Interests</Text>
//       <Text style={styles.stepDescription}>What topics interest you? This helps us personalize content</Text>

//       <View style={styles.interestsGrid}>
//         {interests.map((interest) => (
//           <TouchableOpacity
//             key={interest.id}
//             style={[styles.interestCard, userProfile.interests.includes(interest.id) && styles.selectedInterestCard]}
//             onPress={() =>
//               toggleArraySelection(userProfile.interests, interest.id, (arr) =>
//                 setUserProfile({ ...userProfile, interests: arr }),
//               )
//             }
//           >
//             <Icon
//               name={interest.icon}
//               size={32}
//               color={userProfile.interests.includes(interest.id) ? "#FFFFFF" : "#6B7280"}
//             />
//             <Text
//               style={[styles.interestName, userProfile.interests.includes(interest.id) && styles.selectedInterestName]}
//             >
//               {interest.name}
//             </Text>
//           </TouchableOpacity>
//         ))}
//       </View>
//     </View>
//   )

//   const renderLearningStyle = () => (
//     <View style={styles.stepContainer}>
//       <Text style={styles.stepTitle}>Learning Style</Text>
//       <Text style={styles.stepDescription}>How would you like to approach your learning?</Text>

//       <View style={styles.learningStyleContainer}>
//         <TouchableOpacity
//           style={[
//             styles.learningStyleCard,
//             userProfile.learningIntensity === "intensive" && styles.selectedLearningStyle,
//           ]}
//           onPress={() => setUserProfile({ ...userProfile, learningIntensity: "intensive" })}
//         >
          
//           <Text style={styles.learningStyleTitle}>Intensive Learning</Text>
//           <Text style={styles.learningStyleDescription}>Daily practice, challenging exercises, rapid progress</Text>
//           <View style={styles.learningStyleFeatures}>
//             <Text style={styles.featureText}>• 30-60 min daily sessions</Text>
//             <Text style={styles.featureText}>• Advanced challenges</Text>
//             <Text style={styles.featureText}>• Fast-paced progression</Text>
//           </View>
//         </TouchableOpacity>

//         <TouchableOpacity
//           style={[styles.learningStyleCard, userProfile.learningIntensity === "stable" && styles.selectedLearningStyle]}
//           onPress={() => setUserProfile({ ...userProfile, learningIntensity: "stable" })}
//         >
          
//           <Text style={styles.learningStyleTitle}>Stable Maintenance</Text>
//           <Text style={styles.learningStyleDescription}>
//             Consistent practice, steady improvement, balanced approach
//           </Text>
//           <View style={styles.learningStyleFeatures}>
//             <Text style={styles.featureText}>• 15-30 min daily sessions</Text>
//             <Text style={styles.featureText}>• Balanced difficulty</Text>
//             <Text style={styles.featureText}>• Steady progression</Text>
//           </View>
//         </TouchableOpacity>
//       </View>
//     </View>
//   )

//   const renderCharacterSelection = () => (
//     <View style={styles.stepContainer}>
//       <Text style={styles.stepTitle}>Choose Your Character</Text>
//       <Text style={styles.stepDescription}>Select a 3D character that will grow with your progress</Text>

//       <View style={styles.charactersGrid}>
//         {characters.map((character) => (
//           <TouchableOpacity
//             key={character.id}
//             style={[
//               styles.characterCard,
//               userProfile.selectedCharacter?.id === character.id && styles.selectedCharacterCard,
//             ]}
//             onPress={() => setUserProfile({ ...userProfile, selectedCharacter: character })}
//           >
//             <View style={styles.characterAvatar}>
//               <Text style={styles.characterEmoji}>{character.emoji}</Text>
//               {userProfile.selectedCharacter?.id === character.id && (
//                 <View style={styles.selectedBadge}>
//                   <Icon name="check" size={16} color="#FFFFFF" />
//                 </View>
//               )}
//             </View>
//             <Text style={styles.characterName}>{character.name}</Text>
//             <Text style={styles.characterDescription}>{character.description}</Text>
//           </TouchableOpacity>
//         ))}
//       </View>

//       {userProfile.selectedCharacter && (
//         <View style={styles.characterPreview}>
//           <Text style={styles.previewTitle}>Your Character Preview</Text>
//           <View style={styles.previewCard}>
//             <Text style={styles.previewEmoji}>{userProfile.selectedCharacter.emoji}</Text>
//             <View style={styles.previewInfo}>
//               <Text style={styles.previewName}>{userProfile.selectedCharacter.name}</Text>
//               <Text style={styles.previewLevel}>Level 1 • 0/100 XP</Text>
//             </View>
//           </View>
//         </View>
//       )}
//     </View>
//   )

//   const renderLanguages = () => (
//     <View style={styles.stepContainer}>
//       <Text style={styles.stepTitle}>Language Settings</Text>
//       <Text style={styles.stepDescription}>Select your native and target languages</Text>

//       <View style={styles.languageSection}>
//         <Text style={styles.languageSectionTitle}>Native Language *</Text>
//         <View style={styles.languagesGrid}>
//           {languages.map((lang) => (
//             <TouchableOpacity
//               key={`native-${lang.code}`}
//               style={[styles.languageCard, userProfile.nativeLanguage === lang.code && styles.selectedLanguageCard]}
//               onPress={() => setUserProfile({ ...userProfile, nativeLanguage: lang.code })}
//             >
//               <Text style={styles.languageFlag}>{lang.flag}</Text>
//               <Text style={styles.languageName}>{lang.name}</Text>
//             </TouchableOpacity>
//           ))}
//         </View>
//       </View>

//       <View style={styles.languageSection}>
//         <Text style={styles.languageSectionTitle}>Target Language *</Text>
//         <View style={styles.languagesGrid}>
//           {languages.map((lang) => (
//             <TouchableOpacity
//               key={`target-${lang.code}`}
//               style={[styles.languageCard, userProfile.targetLanguage === lang.code && styles.selectedLanguageCard]}
//               onPress={() => setUserProfile({ ...userProfile, targetLanguage: lang.code })}
//             >
//               <Text style={styles.languageFlag}>{lang.flag}</Text>
//               <Text style={styles.languageName}>{lang.name}</Text>
//             </TouchableOpacity>
//           ))}
//         </View>
//       </View>
//     </View>
//   )

//   const renderComplete = () => (
//     <View style={styles.stepContainer}>
//       <LottieView
//         source={require("../../assets/animations/account-complete.json")}
//         autoPlay
//         loop={false}
//         style={styles.completeAnimation}
//       />
//       <Text style={styles.completeTitle}>You're All Set!</Text>
//       <Text style={styles.completeDescription}>Your personalized learning journey is ready to begin</Text>

//       <View style={styles.summaryCard}>
//         <Text style={styles.summaryTitle}>Profile Summary</Text>
//         <View style={styles.summaryItem}>
//           <Icon name="person" size={16} color="#6B7280" />
//           <Text style={styles.summaryText}>{userProfile.name}</Text>
//         </View>
//         <View style={styles.summaryItem}>
//           <Icon name="school" size={16} color="#6B7280" />
//           <Text style={styles.summaryText}>{userProfile.studyPurpose.length} study goals</Text>
//         </View>
//         <View style={styles.summaryItem}>
//           <Icon name="favorite" size={16} color="#6B7280" />
//           <Text style={styles.summaryText}>{userProfile.interests.length} interests</Text>
//         </View>
//         <View style={styles.summaryItem}>
//           <Icon name="trending-up" size={16} color="#6B7280" />
//           <Text style={styles.summaryText}>
//             {userProfile.learningIntensity === "intensive" ? "Intensive" : "Stable"} learning
//           </Text>
//         </View>
//         {userProfile.selectedCharacter && (
//           <View style={styles.summaryItem}>
//             <Text style={styles.summaryEmoji}>{userProfile.selectedCharacter.emoji}</Text>
//             <Text style={styles.summaryText}>{userProfile.selectedCharacter.name}</Text>
//           </View>
//         )}
//       </View>
//     </View>
//   )

//   const renderCurrentStep = () => {
//     switch (currentStep) {
//       case 0:
//         return renderBasicInfo()
//       case 1:
//         return renderPersonalDetails()
//       case 2:
//         return renderStudyGoals()
//       case 3:
//         return renderInterests()
//       case 4:
//         return renderLearningStyle()
//       case 5:
//         return renderCharacterSelection()
//       case 6:
//         return renderLanguages()
//       case 7:
//         return renderComplete()
//       default:
//         return renderBasicInfo()
//     }
//   }

//   return (
//     <View style={styles.container}>
//       <View style={styles.header}>
//         <TouchableOpacity onPress={currentStep > 0 ? handleBack : () => navigation.goBack()}>
//           <Icon name="arrow-back" size={24} color="#374151" />
//         </TouchableOpacity>
//         <Text style={styles.headerTitle}>Create Account</Text>
//         <View style={styles.placeholder} />
//       </View>

//       {renderProgressBar()}

//       <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
//         <Animated.View
//           style={[
//             styles.scrollContent,
//             {
//               opacity: fadeAnim,
//               transform: [{ translateY: slideAnim }],
//             },
//           ]}
//         >
//           {renderCurrentStep()}
//         </Animated.View>
//       </ScrollView>

//       <View style={styles.footer}>
//         {currentStep > 0 && (
//           <TouchableOpacity style={styles.backButton} onPress={handleBack}>
//             <Text style={styles.backButtonText}>Back</Text>
//           </TouchableOpacity>
//         )}
//         <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
//           <Text style={styles.nextButtonText}>{currentStep === steps.length - 1 ? "Create Account" : "Next"}</Text>
//           <Icon name="arrow-forward" size={20} color="#FFFFFF" />
//         </TouchableOpacity>
//       </View>
//     </View>
//   )
// }

// const styles = createScaledSheet({
//   container: {
//     flex: 1,
//     backgroundColor: "#F8FAFC",
//   },
//   header: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     paddingHorizontal: 20,
//     paddingTop: 50,
//     paddingBottom: 16,
//     backgroundColor: "#FFFFFF",
//     borderBottomWidth: 1,
//     borderBottomColor: "#E5E7EB",
//   },
//   headerTitle: {
//     fontSize: 18,
//     fontWeight: "600",
//     color: "#1F2937",
//   },
//   placeholder: {
//     width: 24,
//   },
//   progressContainer: {
//     backgroundColor: "#FFFFFF",
//     paddingHorizontal: 20,
//     paddingVertical: 16,
//     borderBottomWidth: 1,
//     borderBottomColor: "#E5E7EB",
//   },
//   progressBar: {
//     height: 4,
//     backgroundColor: "#E5E7EB",
//     borderRadius: 2,
//     overflow: "hidden",
//     marginBottom: 8,
//   },
//   progressFill: {
//     height: "100%",
//     backgroundColor: "#4F46E5",
//     borderRadius: 2,
//   },
//   progressText: {
//     fontSize: 12,
//     color: "#6B7280",
//     textAlign: "center",
//   },
//   content: {
//     flex: 1,
//   },
//   scrollContent: {
//     padding: 20,
//   },
//   stepContainer: {
//     alignItems: "center",
//   },
//   stepTitle: {
//     fontSize: 24,
//     fontWeight: "bold",
//     color: "#1F2937",
//     marginBottom: 8,
//     textAlign: "center",
//   },
//   stepDescription: {
//     fontSize: 16,
//     color: "#6B7280",
//     textAlign: "center",
//     marginBottom: 32,
//     lineHeight: 24,
//   },
//   inputContainer: {
//     width: "100%",
//     marginBottom: 20,
//   },
//   inputLabel: {
//     fontSize: 14,
//     fontWeight: "600",
//     color: "#374151",
//     marginBottom: 8,
//   },
//   textInput: {
//     borderWidth: 1,
//     borderColor: "#D1D5DB",
//     borderRadius: 8,
//     paddingHorizontal: 16,
//     paddingVertical: 12,
//     fontSize: 16,
//     color: "#1F2937",
//     backgroundColor: "#FFFFFF",
//   },
//   sectionContainer: {
//     width: "100%",
//     marginBottom: 24,
//   },
//   sectionTitle: {
//     fontSize: 16,
//     fontWeight: "600",
//     color: "#1F2937",
//     marginBottom: 12,
//   },
//   optionsGrid: {
//     flexDirection: "row",
//     flexWrap: "wrap",
//     gap: 12,
//   },
//   optionButton: {
//     flex: 1,
//     minWidth: "30%",
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "center",
//     paddingVertical: 12,
//     paddingHorizontal: 16,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: "#D1D5DB",
//     backgroundColor: "#FFFFFF",
//     gap: 8,
//   },
//   selectedOption: {
//     backgroundColor: "#4F46E5",
//     borderColor: "#4F46E5",
//   },
//   optionText: {
//     fontSize: 14,
//     color: "#374151",
//     fontWeight: "500",
//   },
//   selectedOptionText: {
//     color: "#FFFFFF",
//   },
//   purposesList: {
//     width: "100%",
//     gap: 12,
//   },
//   purposeCard: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#FFFFFF",
//     borderRadius: 12,
//     padding: 16,
//     borderWidth: 2,
//     borderColor: "#E5E7EB",
//   },
//   selectedPurposeCard: {
//     borderColor: "#4F46E5",
//     backgroundColor: "#EEF2FF",
//   },
//   purposeIcon: {
//     width: 48,
//     height: 48,
//     borderRadius: 24,
//     backgroundColor: "#F3F4F6",
//     alignItems: "center",
//     justifyContent: "center",
//     marginRight: 16,
//   },
//   purposeInfo: {
//     flex: 1,
//   },
//   purposeName: {
//     fontSize: 16,
//     fontWeight: "600",
//     color: "#1F2937",
//     marginBottom: 4,
//   },
//   selectedPurposeName: {
//     color: "#4F46E5",
//   },
//   purposeDescription: {
//     fontSize: 14,
//     color: "#6B7280",
//   },
//   interestsGrid: {
//     flexDirection: "row",
//     flexWrap: "wrap",
//     gap: 12,
//     width: "100%",
//   },
//   interestCard: {
//     width: "30%",
//     aspectRatio: 1,
//     backgroundColor: "#FFFFFF",
//     borderRadius: 12,
//     alignItems: "center",
//     justifyContent: "center",
//     borderWidth: 2,
//     borderColor: "#E5E7EB",
//     padding: 12,
//   },
//   selectedInterestCard: {
//     backgroundColor: "#4F46E5",
//     borderColor: "#4F46E5",
//   },
//   interestName: {
//     fontSize: 12,
//     color: "#374151",
//     textAlign: "center",
//     marginTop: 8,
//     fontWeight: "500",
//   },
//   selectedInterestName: {
//     color: "#FFFFFF",
//   },
//   learningStyleContainer: {
//     width: "100%",
//     gap: 16,
//   },
//   learningStyleCard: {
//     backgroundColor: "#FFFFFF",
//     borderRadius: 16,
//     padding: 20,
//     borderWidth: 2,
//     borderColor: "#E5E7EB",
//     alignItems: "center",
//   },
//   selectedLearningStyle: {
//     borderColor: "#4F46E5",
//     backgroundColor: "#EEF2FF",
//   },
//   learningStyleAnimation: {
//     width: 80,
//     height: 80,
//     marginBottom: 16,
//   },
//   learningStyleTitle: {
//     fontSize: 18,
//     fontWeight: "bold",
//     color: "#1F2937",
//     marginBottom: 8,
//   },
//   learningStyleDescription: {
//     fontSize: 14,
//     color: "#6B7280",
//     textAlign: "center",
//     marginBottom: 16,
//   },
//   learningStyleFeatures: {
//     alignItems: "flex-start",
//   },
//   featureText: {
//     fontSize: 12,
//     color: "#374151",
//     marginBottom: 4,
//   },
//   charactersGrid: {
//     flexDirection: "row",
//     flexWrap: "wrap",
//     gap: 16,
//     width: "100%",
//     marginBottom: 24,
//   },
//   characterCard: {
//     width: "45%",
//     backgroundColor: "#FFFFFF",
//     borderRadius: 16,
//     padding: 16,
//     alignItems: "center",
//     borderWidth: 2,
//     borderColor: "#E5E7EB",
//   },
//   selectedCharacterCard: {
//     borderColor: "#4F46E5",
//     backgroundColor: "#EEF2FF",
//   },
//   characterAvatar: {
//     position: "relative",
//     marginBottom: 12,
//   },
//   characterEmoji: {
//     fontSize: 48,
//   },
//   selectedBadge: {
//     position: "absolute",
//     top: -4,
//     right: -4,
//     width: 24,
//     height: 24,
//     borderRadius: 12,
//     backgroundColor: "#4F46E5",
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   characterName: {
//     fontSize: 14,
//     fontWeight: "600",
//     color: "#1F2937",
//     textAlign: "center",
//     marginBottom: 4,
//   },
//   characterDescription: {
//     fontSize: 12,
//     color: "#6B7280",
//     textAlign: "center",
//   },
//   characterPreview: {
//     width: "100%",
//     marginTop: 24,
//   },
//   previewTitle: {
//     fontSize: 16,
//     fontWeight: "600",
//     color: "#1F2937",
//     marginBottom: 12,
//     textAlign: "center",
//   },
//   previewCard: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#FFFFFF",
//     borderRadius: 12,
//     padding: 16,
//     borderWidth: 2,
//     borderColor: "#4F46E5",
//   },
//   previewEmoji: {
//     fontSize: 40,
//     marginRight: 16,
//   },
//   previewInfo: {
//     flex: 1,
//   },
//   previewName: {
//     fontSize: 16,
//     fontWeight: "600",
//     color: "#1F2937",
//     marginBottom: 4,
//   },
//   previewLevel: {
//     fontSize: 12,
//     color: "#6B7280",
//   },
//   languageSection: {
//     width: "100%",
//     marginBottom: 24,
//   },
//   languageSectionTitle: {
//     fontSize: 16,
//     fontWeight: "600",
//     color: "#1F2937",
//     marginBottom: 12,
//   },
//   languagesGrid: {
//     flexDirection: "row",
//     flexWrap: "wrap",
//     gap: 12,
//   },
//   languageCard: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#FFFFFF",
//     borderRadius: 8,
//     padding: 12,
//     borderWidth: 1,
//     borderColor: "#D1D5DB",
//     gap: 8,
//     minWidth: "45%",
//   },
//   selectedLanguageCard: {
//     borderColor: "#4F46E5",
//     backgroundColor: "#EEF2FF",
//   },
//   languageFlag: {
//     fontSize: 20,
//   },
//   languageName: {
//     fontSize: 14,
//     color: "#374151",
//     fontWeight: "500",
//   },
//   completeAnimation: {
//     width: 150,
//     height: 150,
//     marginBottom: 24,
//   },
//   completeTitle: {
//     fontSize: 28,
//     fontWeight: "bold",
//     color: "#1F2937",
//     marginBottom: 12,
//     textAlign: "center",
//   },
//   completeDescription: {
//     fontSize: 16,
//     color: "#6B7280",
//     textAlign: "center",
//     marginBottom: 32,
//   },
//   summaryCard: {
//     backgroundColor: "#FFFFFF",
//     borderRadius: 16,
//     padding: 20,
//     width: "100%",
//     borderWidth: 1,
//     borderColor: "#E5E7EB",
//   },
//   summaryTitle: {
//     fontSize: 16,
//     fontWeight: "600",
//     color: "#1F2937",
//     marginBottom: 16,
//     textAlign: "center",
//   },
//   summaryItem: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginBottom: 8,
//     gap: 8,
//   },
//   summaryText: {
//     fontSize: 14,
//     color: "#374151",
//   },
//   summaryEmoji: {
//     fontSize: 16,
//   },
//   footer: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     paddingHorizontal: 20,
//     paddingVertical: 16,
//     backgroundColor: "#FFFFFF",
//     borderTopWidth: 1,
//     borderTopColor: "#E5E7EB",
//   },
//   backButton: {
//     paddingVertical: 12,
//     paddingHorizontal: 24,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: "#D1D5DB",
//   },
//   backButtonText: {
//     fontSize: 16,
//     color: "#374151",
//     fontWeight: "500",
//   },
//   nextButton: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#4F46E5",
//     paddingVertical: 12,
//     paddingHorizontal: 24,
//     borderRadius: 8,
//     gap: 8,
//   },
//   nextButtonText: {
//     fontSize: 16,
//     color: "#FFFFFF",
//     fontWeight: "600",
//   },
// })

// export default EnhancedAccountCreationScreen
