import * as Localization from "expo-localization"
import { useEffect, useRef, useState } from "react"
import { Alert, Animated, ScrollView, Text, TextInput, TouchableOpacity, View, FlatList, Image } from "react-native"
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Character3D, Language, Interest, Country, LearningPace, CreateUserPayload, languageToCountry } from "../../types/api"
import instance from "../../api/axiosClient"
import CountryFlag from "react-native-country-flag"
import { useTranslation } from "react-i18next"
import { gotoTab } from "../../utils/navigationRef";
import PhoneInput from "react-native-phone-number-input";
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useUserStore } from "../../stores/UserStore";
import { useTokenStore } from "../../stores/tokenStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { createScaledSheet } from "../../utils/scaledStyles";

type SetupInitScreenProps = {
  navigation: NativeStackNavigationProp<any>
}

const countryToDefaultLanguage: Record<string, string> = {
  US: "en",
  VN: "vi",
  JP: "jp",
  CN: "zh",
  FR: "fr",
  DE: "de",
  ES: "es",
  IT: "it",
  KR: "ko",
  RU: "ru",
  IN: "in",
  ZH: "zh",
}

const SUPPORTED_LEARNING_LANGUAGES = ['vi', 'en', 'zh']

const SetupInitScreen = ({ navigation }: SetupInitScreenProps) => {
  const { t } = useTranslation()
  const [currentStep, setCurrentStep] = useState(1)
  // const [selectedCharacter, setSelectedCharacter] = useState<Character3D | null>(null)
  const [accountName, setAccountName] = useState("")
  const [email, setEmail] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("");
  const [country, setCountry] = useState<string | null>(null)
  const [ageRange, setAgeRange] = useState("")
  const [nativeLanguage, setNativeLanguage] = useState<string | null>(null)
  const [targetLanguages, setTargetLanguages] = useState<string[]>([])
  const [certificationsSelected, setCertificationsSelected] = useState<string[]>([])
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const [learningGoalsSelected, setLearningGoalsSelected] = useState<string[]>([])
  const [learningPace, setLearningPace] = useState("")

  // const [characters, setCharacters] = useState<Character3D[]>([])
  const [languages, setLanguages] = useState<Language[]>([])
  const [interests, setInterests] = useState<Interest[]>([])

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  const countries = [
    { code: "US", name: "United States" },
    { code: "VN", name: "Vietnam" },
    { code: "JP", name: "Japan" },
    { code: "CN", name: "China" },
    { code: "FR", name: "France" },
    { code: "DE", name: "Germany" },
    { code: "ES", name: "Spain" },
    { code: "IT", name: "Italy" },
    { code: "KR", name: "South Korea" },
    { code: "RU", name: "Russia" },
    { code: "IN", name: "India" },
  ]

  const certifications = [
    { id: "toefl", name: "TOEFL", description: "Test of English as a Foreign Language", languageCode: "en" },
    { id: "ielts", name: "IELTS", description: "International English Language Testing System", languageCode: "en" },
    { id: "hsk", name: "HSK", description: "Hanyu Shuiping Kaoshi (Chinese)", languageCode: "zh" },
    { id: "jlpt", name: "JLPT", description: "Japanese Language Proficiency Test", languageCode: "jp" },
    { id: "topik", name: "TOPIK", description: "Test of Proficiency in Korean", languageCode: "kr" },
    { id: "dalf", name: "DALF", description: "Diplôme Approfondi de Langue Française", languageCode: "fr" },
    { id: "dele", name: "DELE", description: "Diplomas de Español como Lengua Extranjera", languageCode: "es" },
    { id: "goethe", name: "Goethe", description: "German Language Certificate", languageCode: "de" },
  ]

  const learningGoals = [
    { id: "conversation", name: "Daily Conversation", icon: "chat", description: "Practice everyday speaking and listening" },
    { id: "business", name: "Business Communication", icon: "work", description: "Master professional language skills" },
    { id: "academic", name: "Academic Study", icon: "school", description: "Prepare for academic success" },
    { id: "travel", name: "Travel Communication", icon: "luggage", description: "Learn phrases for travel" },
    { id: "certification", name: "Test Preparation", icon: "assignment", description: "Get ready for language exams" },
    { id: "culture", name: "Cultural Understanding", icon: "explore", description: "Dive into cultural nuances" },
  ]

  const learningPaces = [
    { id: "slow", name: "Slow & Steady", description: "10-15 min/day • Relaxed pace", icon: "directions-walk", color: "#10B981" },
    { id: "maintain", name: "Maintain Skills", description: "15-30 min/day • Keep current level", icon: "trending-flat", color: "#3B82F6" },
    { id: "fast", name: "Fast Progress", description: "30-45 min/day • Quick improvement", icon: "directions-run", color: "#F59E0B" },
    { id: "accelerated", name: "Accelerated", description: "45+ min/day • Intensive learning", icon: "rocket-launch", color: "#EF4444" },
  ]

  const randomSuffix = (len = 6) =>
    Math.random().toString(36).slice(2, 2 + len);

  const interestsWithDesc = interests.map((interest) => ({
    ...interest,
    description:
      interest.description ||
      `Explore ${(interest.interestName ?? "interest").toLowerCase()} to enhance your learning experience.`,
    id: interest.interestId,
  }))

  const mapCountryToEnum = (c: string | undefined) => {
    if (!c) return undefined;
    const normalized = c.trim().toUpperCase();
    const map: Record<string, string> = {
      "UNITED STATES": "UNITED_STATES",
      "US": "UNITED_STATES",
      "VN": "VIETNAM",
      "VIETNAM": "VIETNAM",
      "JP": "JAPAN",
      "JAPAN": "JAPAN",
      "CN": "CHINA",
      "CHINA": "CHINA",
      "FR": "FRANCE",
      "FRANCE": "FRANCE",
      "DE": "GERMANY",
      "GERMANY": "GERMANY",
      "IT": "ITALY",
      "ITALY": "ITALY",
      "ES": "SPAIN",
      "SPAIN": "SPAIN",
      "KR": "SOUTH_KOREA",
      "SOUTH KOREA": "SOUTH_KOREA",
      "IN": "INDIA",
      "INDIA": "INDIA",
      "TOGA": "TONGA",
      "TONGA": "TONGA"
    };
    return map[normalized] ?? undefined;
  };

  const AGE_ENUM_MAP: Record<string, string> = {
    "13-17": "AGE_13_17",
    "18-24": "AGE_18_24",
    "25-34": "AGE_25_34",
    "35-44": "AGE_35_44",
    "45-54": "AGE_45_54",
    "55+": "AGE_55_PLUS",
  };

  const mapAgeRangeToEnum = (display: string | undefined) => {
    if (!display) return undefined;
    return AGE_ENUM_MAP[display] ?? undefined;
  };

  useEffect(() => {
    const prefillData = () => {
      const user = useUserStore.getState().user;
      if (user) {
        if (user.fullname) {
          setAccountName(user.fullname);
        }
        if (user.email) {
          setEmail(user.email);
        }
        if (user.phone)
          setPhoneNumber(user.phone)
      }
    };
    prefillData();
  }, []);

  // useEffect(() => {
  //   fetchLanguages()
  //   fetchCharacters()
  //   fetchInterests()
  // }, [])

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start()

    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start()
  }, [])

  // useEffect(() => {
  // }, [characters])

  useEffect(() => {
    if (interests.length && selectedInterests.length === 0) {
      setSelectedInterests([interests[0].interestId])
    }
  }, [interests])

  useEffect(() => {
    const locales = Localization.getLocales()
    if (locales && locales.length > 0) {
      const regionCode = locales[0]?.regionCode?.toUpperCase()
      const languageCodeRaw = locales[0]?.languageCode
      const languageCode = languageCodeRaw ? languageCodeRaw.toUpperCase() : undefined
      const foundCountry = countries.find(c => c.code === regionCode)
      if (foundCountry) {
        setCountry(foundCountry.code)
        const defaultLang = countryToDefaultLanguage[foundCountry.code] ?? languageCode
        if (defaultLang) {
          setNativeLanguage(String(defaultLang).toUpperCase())
          setTargetLanguages(prev => prev.filter(c => c !== String(defaultLang).toUpperCase()))
        }
      } else if (languageCode) {
        setNativeLanguage(languageCode)
        setTargetLanguages(prev => prev.filter(c => c !== languageCode))
      }
    }

    // if (interests.length > 0) setSelectedInterests([interests[0].interestId])
    if (learningGoals.length > 0) setLearningGoalsSelected(["conversation"])
    setLearningPace("slow")
    setAgeRange("18-24")
  }, [])

  // const fetchCharacters = async () => {
  //   try {
  //     const response = await instance.get('/api/v1/character3ds');
  //     const charactersArray = response.data.result?.content;

  //     if (Array.isArray(charactersArray)) {
  //       setCharacters(charactersArray);
  //     } else {
  //       setCharacters([]);
  //     }
  //   } catch (error) {
  //     Alert.alert(t("error.title"), t("error.loadCharacters"));
  //   }
  // };

  const fetchLanguages = async () => {
    try {
      const response = await instance.get('/api/v1/languages')
      const languageArray = response.data.result?.content
      if (Array.isArray(languageArray)) {
        const normalized = languageArray.map((lang: any) => ({
          languageCode: String(lang.languageCode ?? "").toLowerCase(),
          languageName: lang.languageName,
          description: lang.description ?? undefined,
        }))
        setLanguages(normalized)
      } else {
        setLanguages([])
      }
    } catch (error) {
      Alert.alert(t("error.title"), t("error.loadLanguages"))
    }
  }

  const fetchInterests = async () => {
    try {
      const response = await instance.get('/api/v1/interests')
      const data = response.data.result || []
      setInterests(data)
    } catch (error) {
      Alert.alert(t("error.title"), t("error.loadInterests"))
    }
  }

  const handleNext = async () => {
    if (currentStep === 2) {
      if (!accountName.trim()) {
        Alert.alert(t("error.title"), t("error.nameRequired"))
        return
      }
      if (!email.trim() || !email.includes('@')) {
        Alert.alert(t("error.title"), t("error.enterValidEmail") || "Please enter a valid email")
        return
      }
    }

    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    } else {
      await createTempAccountAndSetup()
    }
  }

  const handleSkip = async () => {
    if (currentStep >= 3) {
      if (!email.trim() || !email.includes('@') || !accountName.trim()) {
        Alert.alert(t("error.title"), t("error.requiredFieldsMissing") || "Please complete the required fields in Step 2 (Name, Email) before skipping.");
        return;
      }
      await createTempAccountAndSetup(true);
    } else {
      Alert.alert(t("error.title"), t("setup.skipNotAllowed") || "Skipping is only allowed from step 3 onwards.");
    }
  };

  const createTempAccountAndSetup = async (isSkipping = false) => {
    try {
      if (!email || !email.includes("@")) {
        Alert.alert(t("error.title"), t("error.enterValidEmail") || "Please enter a valid email")
        return
      }

      const payload: Partial<CreateUserPayload> = {
        email: email.toLowerCase(),
        fullname: accountName || undefined,
        nickname: accountName || undefined,
        phone: phoneNumber || undefined,
      }

      // if (selectedCharacter?.character3dId) {
      //   payload.character3dId = selectedCharacter.character3dId
      // }

      const mappedCountry = mapCountryToEnum(country ?? undefined)
      if (mappedCountry) payload.country = mappedCountry as Country

      const mappedAge = mapAgeRangeToEnum(ageRange)
      if (mappedAge) payload.ageRange = mappedAge as unknown as string

      if (nativeLanguage) payload.nativeLanguageCode = nativeLanguage.toLowerCase()
      if (targetLanguages?.length) payload.languages = targetLanguages.map(code => code.toLowerCase())

      if (certificationsSelected?.length) {
        payload.certificationIds = certificationsSelected
          .map(id => id?.toUpperCase())
          .filter(Boolean) as string[]
      }

      if (selectedInterests?.length) {
        payload.interestIds = selectedInterests
          .map(id => (id ? String(id) : null))
          .filter(Boolean) as string[]
      }

      if (learningGoalsSelected?.length) {
        payload.goalIds = learningGoalsSelected.map(id => id.toUpperCase()).filter(Boolean) as string[]
      }

      if (learningPace) payload.learningPace = learningPace.toUpperCase() as LearningPace

      console.log("Create user payload ->", JSON.stringify(payload, null, 2))

      const existingUser = useUserStore.getState().user;

      let response;

      if (existingUser?.userId) {
        console.log(`Updating existing user ${existingUser.userId}...`);
        response = await instance.put(`/api/v1/users/${existingUser.userId}`, payload);
        console.log("Account updated, response:", response.data);
        useUserStore.getState().setUser(response.data.result);
      } else {
        console.log("Quick Start: Checking if email is available...");
        let emailCheckResponse;
        try {
          emailCheckResponse = await instance.get('/api/v1/users/check-email', {
            params: { email: payload.email }
          });
        } catch (checkError: any) {
          console.error("Email check failed:", checkError.response?.data || checkError.message);
          throw new Error("Failed to verify email. Please check connection.");
        }

        const isEmailAvailable = emailCheckResponse.data.result;

        if (!isEmailAvailable) {
          console.warn("Email already exists. Quick start failed.");
          Alert.alert(
            t("error.title"),
            t("error.emailExistsQuickStart", "This email is already registered. Please go back and log in.")
          );
          return;
        }

        console.log("Email is available. Creating new user...");
        response = await instance.post('/api/v1/users', payload);
        console.log("Account created, response:", response.data);

        const result = response.data.result;
        useUserStore.getState().setUser(result.user);

        if (result.accessToken) {
          useTokenStore.getState().setTokens(result.accessToken, result.refreshToken);
        }
      }

      await useUserStore.getState().finishSetup();
      gotoTab("ProficiencyTestScreen");

    } catch (error: any) {
      console.error("createTempAccountAndSetup error:", error.response?.data || error.message);
      const errorMessage = error.response?.data?.message || t("error.setupAccount");
      Alert.alert(t("error.title"), errorMessage);
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    } else {
      navigation.goBack()
    }
  }

  const toggleArraySelection = (array: string[], item: string, setter: (arr: string[]) => void) => {
    const newArray = array.includes(item) ? array.filter(i => i !== item) : [...array, item]
    console.log(`Toggling ${item}, new state:`, newArray)
    setter(newArray)
  }

  const normalizeLangCode = (code?: string) => (code ? String(code).toLowerCase() : "")

  const toggleTargetLanguage = (langCodeRaw: string) => {
    const langCode = normalizeLangCode(langCodeRaw)
    if (!langCode) return

    if (nativeLanguage && langCode === nativeLanguage) {
      Alert.alert(t("error.title"), t("setup.cannotSelectNativeAsTarget") || "Cannot select native language as learning target")
      return
    }

    if (targetLanguages.includes(langCode)) {
      setTargetLanguages(prev => prev.filter(c => c !== langCode))
    } else {
      setTargetLanguages(prev => [...prev, langCode])
    }
  }

  const toggleCertification = (certId: string) => {
    toggleArraySelection(certificationsSelected, certId, setCertificationsSelected)
  }

  const toggleInterest = (interestId: string) => {
    toggleArraySelection(selectedInterests, interestId, setSelectedInterests)
  }

  const toggleLearningGoal = (goalId: string) => {
    toggleArraySelection(learningGoalsSelected, goalId, setLearningGoalsSelected)
  }

  const getFilteredCertifications = () => {
    if (targetLanguages.length === 0) return certifications
    return certifications.filter(cert => targetLanguages.includes(cert.languageCode))
  }

  const onSelectCountry = (countryCode: string) => {
    setCountry(countryCode)
    const defaultLang = countryToDefaultLanguage[countryCode]
    if (defaultLang) {
      const code = defaultLang.toUpperCase()
      setNativeLanguage(code)
      setTargetLanguages(prev => prev.filter(c => c !== code))
    }
  }

  const onSelectNativeLanguage = (langCodeRaw: string) => {
    const code = normalizeLangCode(langCodeRaw)
    setNativeLanguage(code)
    setTargetLanguages(prev => prev.filter(c => c !== code))
  }

  const getFlagIsoFromLang = (langCode?: string) => {
    if (!langCode) return undefined
    const lower = String(langCode).toLowerCase()
    const mapped = (languageToCountry as Record<string, string>)[lower]
    if (mapped) return mapped
    return langCode.slice(0, 2).toUpperCase()
  }

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3, 4].map((step) => (
        <View key={`step-${step}`} style={styles.stepContainer}>
          <View style={[styles.stepCircle, currentStep >= step && styles.stepCircleActive]}>
            <Text style={[styles.stepText, currentStep >= step && styles.stepTextActive]}>{step}</Text>
          </View>
          {step < 5 && <View style={[styles.stepLine, currentStep > step && styles.stepLineActive]} />}
        </View>
      ))}
    </View>
  )

  // const renderCharacterSelection = () => (
  //   <View style={styles.stepContent}>
  //     <Text style={styles.stepTitle}>{t("setup.chooseCompanion")}</Text>
  //     <Text style={styles.stepSubtitle}>{t("setup.chooseCompanion.desc")}</Text>

  //     <FlatList
  //       data={characters}
  //       numColumns={2}
  //       keyExtractor={(item) => item.character3dId}
  //       columnWrapperStyle={styles.charactersRow}
  //       renderItem={({ item }) => (
  //         <TouchableOpacity
  //           key={item.character3dId}
  //           style={[
  //             styles.characterCard,
  //             selectedCharacter?.character3dId === item.character3dId && styles.characterCardSelected
  //           ]}
  //           onPress={() => setSelectedCharacter(item)}
  //         >
  //           {item.modelUrl && typeof item.modelUrl === 'string' ? (
  //             <Image
  //               source={{ uri: item.modelUrl }}
  //               style={styles.characterImage}
  //               resizeMode="contain"
  //             />
  //           ) : (
  //             <View style={styles.modelPlaceholder}>
  //               <Icon name="image" size={40} color="#9CA3AF" />
  //               <Text style={styles.modelErrorText}>No Image</Text>
  //             </View>
  //           )}
  //           <Text style={styles.characterName}>{item.character3dName}</Text>
  //           <Text style={styles.characterPersonality}>{item.description}</Text>

  //           {selectedCharacter?.character3dId === item.character3dId && (
  //             <View style={styles.selectedIndicator}>
  //               <Icon name="check-circle" size={20} color="#10B981" />
  //             </View>
  //           )}
  //         </TouchableOpacity>
  //       )}
  //       contentContainerStyle={styles.charactersGrid}
  //     />
  //   </View>
  // )

  const renderBasicInfo = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>{t("setup.createAccount")}</Text>
      <Text style={styles.stepSubtitle}>{t("setup.createAccount.desc")}</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>{t("auth.fullName")} *</Text>
        <TextInput
          style={styles.textInput}
          value={accountName}
          onChangeText={setAccountName}
          placeholder={t("auth.enterName")}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>{t("auth.phoneNumber")}</Text>
        <PhoneInput
          defaultValue={phoneNumber}
          defaultCode={(country || "VN") as any}
          layout="first"
          onChangeFormattedText={(text) => {
            setPhoneNumber(text);
          }}
          withDarkTheme={false}
          withShadow
          containerStyle={styles.phoneInputContainer}
          textContainerStyle={styles.phoneInputTextContainer}
        />
        <Text style={styles.inputHint}>
          {t("auth.phoneHint")}
        </Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>{t("auth.email")} *</Text>
        <TextInput
          style={styles.textInput}
          value={email}
          onChangeText={setEmail}
          placeholder={t("auth.enterEmail")}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>{t("profile.country")}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.languageScroll}>
          {countries.map((c) => (
            <TouchableOpacity key={`country-${c.code}`}
              style={[styles.languageChip, country === c.code && styles.languageChipSelected]}
              onPress={() => onSelectCountry(c.code)}
            >
              <CountryFlag isoCode={c.code} size={22} style={{ marginRight: 8 }} />
              <Text style={[styles.languageText, country === c.code && styles.languageTextSelected]}>
                {c.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>{t("setup.ageRange")}</Text>
        <View style={styles.ageGrid}>
          {["13-17", "18-24", "25-34", "35-44", "45-54", "55+"].map((age) => (
            <TouchableOpacity key={`age-${age}`}
              style={[styles.ageCard, ageRange === age && styles.selectedAgeCard]}
              onPress={() => setAgeRange(age)}
            >
              <View style={styles.ageInner}>
                <Icon name="person" size={14} color={ageRange === age ? "#FFFFFF" : "#6B7280"} style={{ marginRight: 6 }} />
                <Text style={[styles.ageText, ageRange === age && styles.selectedAgeText]}>{age}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={[styles.inputContainer, styles.nativeContainer]}>
        <Text style={styles.inputLabel}>{t("language.nativeLanguage")}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.languageScroll}>
          {languages.map((lang, i) => {
            const iso = getFlagIsoFromLang(lang.languageCode)
            return (
              <TouchableOpacity key={`native-${lang.languageCode}-${i}`}
                style={[styles.languageChip, nativeLanguage === lang.languageCode && styles.languageChipSelected]}
                onPress={() => onSelectNativeLanguage(lang.languageCode)}
              >
                {iso ? <CountryFlag isoCode={iso} size={22} style={{ marginRight: 8 }} /> : <View style={{ width: 22, height: 22, marginRight: 8 }} />}
                <Text style={[styles.languageText, nativeLanguage === lang.languageCode && styles.languageTextSelected]}>
                  {lang.languageName}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>
          {t("language.learningLanguage")} ({targetLanguages.length} {t("setup.selected")})
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.languageScroll}>
          {languages
            .filter((lang) => lang.languageCode !== nativeLanguage)
            .filter((lang) => SUPPORTED_LEARNING_LANGUAGES.includes(lang.languageCode))
            .map((lang) => {
              const iso = getFlagIsoFromLang(lang.languageCode)
              return (
                <TouchableOpacity
                  key={lang.languageCode}
                  style={[styles.languageChip, targetLanguages.includes(lang.languageCode) && styles.languageChipSelected]}
                  onPress={() => toggleTargetLanguage(lang.languageCode)}
                >
                  {iso ? <CountryFlag isoCode={iso} size={22} style={{ marginRight: 8 }} /> : <View style={{ width: 22, height: 22, marginRight: 8 }} />}
                  <Text
                    style={[styles.languageText, targetLanguages.includes(lang.languageCode) && styles.languageTextSelected]}
                  >
                    {lang.languageName}
                  </Text>
                </TouchableOpacity>
              )
            })}
        </ScrollView>
      </View>
    </View>
  )

  const renderInterestsAndGoals = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>{t("setup.interestsAndGoals")}</Text>
      <Text style={styles.stepSubtitle}>{t("setup.interestsAndGoals.desc")}</Text>

      <Text style={styles.sectionTitle}>{t("setup.interests")} ({selectedInterests.length} {t("setup.selected")})</Text>
      <View style={styles.interestsGrid}>
        {interestsWithDesc.map((interest) => (
          <TouchableOpacity key={`interest-${interest.id}`}
            style={[
              styles.interestCard,
              selectedInterests.includes(interest.id) && styles.interestCardSelected,
              { borderColor: interest.color },
            ]}
            onPress={() => toggleInterest(interest.id)}
          >
            <Icon
              name={interest.icon ?? "star"}
              size={24}
              color={selectedInterests.includes(interest.id) ? "#FFFFFF" : interest.color ?? "#4F46E5"}
            />
            <Text style={[styles.interestText, selectedInterests.includes(interest.id) && styles.interestTextSelected]}>
              {interest.interestName}
            </Text>
            <Text style={styles.interestDescription}>{interest.description}</Text>
            {selectedInterests.includes(interest.id) && (
              <View style={styles.interestSelectedIndicator}>
                <Icon name="check" size={16} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>{t("setup.learningGoals")} ({learningGoalsSelected.length} {t("setup.selected")})</Text>
      <View style={styles.goalsList}>
        {learningGoals.map((goal) => (
          <TouchableOpacity key={`goal-${goal.id}`}
            style={[styles.goalCard, learningGoalsSelected.includes(goal.id) && styles.selectedGoalCard]}
            onPress={() => toggleLearningGoal(goal.id)}
          >
            <View style={styles.goalIcon}>
              <Icon
                name={goal.icon}
                size={24}
                color={learningGoalsSelected.includes(goal.id) ? "#4F46E5" : "#6B7280"}
              />
            </View>
            <View style={styles.goalInfo}>
              <Text style={[styles.goalName, learningGoalsSelected.includes(goal.id) && styles.selectedGoalName]}>
                {goal.name}
              </Text>
              <Text style={styles.goalDescription}>{goal.description}</Text>
            </View>
            {learningGoalsSelected.includes(goal.id) && <Icon name="check-circle" size={20} color="#4F46E5" />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )

  const renderCertificationsAndPace = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>{t("setup.certificationsAndPace")}</Text>
      <Text style={styles.stepSubtitle}>{t("setup.certificationsAndPace.desc")}</Text>

      <Text style={styles.sectionTitle}>{t("setup.certificationGoals")}</Text>
      <View style={styles.certificationsList}>
        {getFilteredCertifications().map((cert, i) => (
          <TouchableOpacity key={`cert-${cert.id}-${i}`}
            style={[
              styles.certificationCard,
              certificationsSelected.includes(cert.id) && styles.selectedCertificationCard,
            ]}
            onPress={() => toggleCertification(cert.id)}
          >
            <View style={styles.certificationInfo}>
              <Text style={styles.certificationName}>{cert.name}</Text>
              <Text style={styles.certificationDescription}>{cert.description}</Text>
            </View>
            {certificationsSelected.includes(cert.id) && <Icon name="check-circle" size={20} color="#4F46E5" />}
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>{t("setup.learningPace")}</Text>
      <View style={styles.paceContainer}>
        {learningPaces.map((pace) => (
          <TouchableOpacity key={`pace-${pace.id}`}
            style={[styles.paceCard, learningPace === pace.id && styles.selectedPaceCard]}
            onPress={() => setLearningPace(pace.id)}
          >
            <View style={[styles.paceIcon, { backgroundColor: `${pace.color}20` }]}>
              <Icon name={pace.icon} size={32} color={pace.color} />
            </View>
            <Text style={styles.paceName}>{pace.name}</Text>
            <Text style={styles.paceDescription}>{pace.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )

  const renderSummary = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>{t("setup.readyToStart")}</Text>
      <Text style={styles.stepSubtitle}>{t("setup.readyToStart.desc")}</Text>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t("setup.character")}:</Text>
          {/* <Text style={styles.summaryText}>{selectedCharacter?.character3dName || "None"}</Text> */}
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t("auth.fullName")}:</Text>
          <Text style={styles.summaryText}>{accountName}</Text>
        </View>

        {email && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t("auth.email")}:</Text>
            <Text style={styles.summaryText}>{email}</Text>
          </View>
        )}

        {country && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t("profile.country")}:</Text>
            <Text style={styles.summaryText}>{countries.find(c => c.code === country)?.name || country}</Text>
          </View>
        )}

        {ageRange && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t("setup.ageRange")}:</Text>
            <Text style={styles.summaryText}>{ageRange}</Text>
          </View>
        )}

        {nativeLanguage && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t("language.nativeLanguage")}:</Text>
            <Text style={styles.summaryText}>
              {languages.find((lang) => lang.languageCode === nativeLanguage)?.languageName || nativeLanguage}
            </Text>
          </View>
        )}

        {targetLanguages.length > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t("language.learningLanguage")}:</Text>
            <View style={styles.summaryLanguages}>
              {targetLanguages.map((code) => {
                const lang = languages.find((l) => l.languageCode === code)
                return (
                  <Text key={code} style={styles.summaryLanguage}>
                    {lang?.languageName || code}
                  </Text>
                )
              })}
            </View>
          </View>
        )}

        {selectedInterests.length > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t("setup.interests")}:</Text>
            <View style={styles.summaryInterests}>
              {selectedInterests.map((id) => {
                const interest = interests.find((i) => i.interestId === id)
                return (
                  <Text key={id} style={styles.summaryInterest}>
                    {interest?.interestName || id}
                  </Text>
                )
              })}
            </View>
          </View>
        )}

        {learningGoalsSelected.length > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t("setup.learningGoals")}:</Text>
            <View style={styles.summaryInterests}>
              {learningGoalsSelected.map((id) => {
                const goal = learningGoals.find((g) => g.id === id)
                return (
                  <Text key={id} style={styles.summaryInterest}>
                    {goal?.name || id}
                  </Text>
                )
              })}
            </View>
          </View>
        )}

        {certificationsSelected.length > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t("setup.certifications")}:</Text>
            <Text style={styles.summaryText}>{certificationsSelected.length} {t("setup.selected")}</Text>
          </View>
        )}

        {learningPace && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t("setup.learningPace")}:</Text>
            <Text style={styles.summaryText}>
              {learningPaces.find((p) => p.id === learningPace)?.name || "None"}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.nextStepInfo}>
        <Icon name="quiz" size={24} color="#4F46E5" />
        <Text style={styles.nextStepText}>{t("setup.nextProficiencyTest")}</Text>
      </View>
    </View>
  )

  const renderSkipButton = () => {
    if (currentStep >= 3 && currentStep < 5) {
      return (
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipButtonText}>{t("setup.skip") || "Skip"}</Text>
        </TouchableOpacity>
      )
    }
    return <View style={{ width: 24 }} />
  }

  return (
    <ScreenLayout style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack}>
            <Icon name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("setup.title")}</Text>
          {renderSkipButton()}
        </View>

        {renderStepIndicator()}

        <ScrollView>
          {/* {currentStep === 1 && renderCharacterSelection()} */}
          {currentStep === 1 && renderBasicInfo()}
          {currentStep === 2 && renderInterestsAndGoals()}
          {currentStep === 3 && renderCertificationsAndPace()}
          {currentStep === 4 && renderSummary()}
        </ScrollView>

        <View style={styles.navigationButtons}>
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>{currentStep === 5 ? t("setup.takeTest") : t("setup.continue")}</Text>
            <Icon name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </ScreenLayout>
  )
}

const styles = createScaledSheet({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    flex: 1,
  },
  inputHint: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    paddingLeft: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4F46E5",
  },
  stepIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  stepContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleActive: {
    backgroundColor: "#4F46E5",
  },
  stepText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  stepTextActive: {
    color: "#FFFFFF",
  },
  stepLine: {
    width: 30,
    height: 2,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: "#4F46E5",
  },
  scrollContent: {
    flex: 1,
  },
  stepContent: {
    paddingHorizontal: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 16,
    marginTop: 24,
  },
  charactersGrid: {
    paddingHorizontal: 16,
  },
  charactersRow: {
    justifyContent: "space-between",
    marginBottom: 16,
  },
  characterCard: {
    flex: 1,
    margin: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  characterCardSelected: {
    borderColor: "#10B981",
    backgroundColor: "#F0FDF4",
  },
  characterImage: {
    height: 150,
    width: '100%',
    borderRadius: 8,
    marginBottom: 8,
  },
  characterName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  characterPersonality: {
    fontSize: 12,
    color: "#6B7280",
  },
  selectedIndicator: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  inputContainer: {
    marginBottom: 18,
  },
  nativeContainer: {
    marginTop: 6,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  languageScroll: {
    flexDirection: "row",
    paddingVertical: 4,
  },
  languageChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  languageChipSelected: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  languageText: {
    fontSize: 13,
    color: "#374151",
  },
  languageTextSelected: {
    color: "#FFFFFF",
  },
  certificationsList: {
    width: "100%",
    gap: 12,
  },
  certificationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  selectedCertificationCard: {
    borderColor: "#4F46E5",
    backgroundColor: "#EEF2FF",
  },
  certificationInfo: {
    flex: 1,
  },
  certificationName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  certificationDescription: {
    fontSize: 14,
    color: "#6B7280",
  },
  ageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  ageCard: {
    width: "30%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    marginBottom: 10,
  },
  selectedAgeCard: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  ageInner: {
    flexDirection: "row",
    alignItems: "center",
  },
  ageText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "500",
  },
  selectedAgeText: {
    color: "#FFFFFF",
  },
  interestsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  interestCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 2,
    position: "relative",
  },
  interestCardSelected: {
    color: "#000000",
    backgroundColor: "#e8e6d6",
  },
  interestText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginTop: 8,
    textAlign: "center",
  },
  interestTextSelected: {
    color: "#FFFFFF",
  },
  interestDescription: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 4,
  },
  interestSelectedIndicator: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  goalsList: {
    width: "100%",
    gap: 12,
  },
  goalCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  selectedGoalCard: {
    borderColor: "#4F46E5",
    backgroundColor: "#EEF2FF",
  },
  goalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  goalInfo: {
    flex: 1,
  },
  goalName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  selectedGoalName: {
    color: "#4F46E5",
  },
  goalDescription: {
    fontSize: 14,
    color: "#6B7280",
  },
  paceContainer: {
    width: "100%",
    gap: 16,
  },
  paceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  selectedPaceCard: {
    borderColor: "#4F46E5",
    backgroundColor: "#EEF2FF",
  },
  paceIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  paceName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  paceDescription: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    width: 100,
  },
  summaryText: {
    fontSize: 14,
    color: "#1F2937",
    flex: 1,
  },
  summaryLanguages: {
    flex: 1,
  },
  summaryLanguage: {
    fontSize: 14,
    color: "#1F2937",
    marginBottom: 4,
  },
  summaryInterests: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  summaryInterest: {
    fontSize: 12,
    color: "#4F46E5",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  nextStepInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    borderRadius: 12,
    padding: 16,
  },
  nextStepText: {
    fontSize: 14,
    color: "#4F46E5",
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  navigationButtons: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F46E5",
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  phoneInputContainer: {
    width: "100%",
    height: 50,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  phoneInputTextContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingVertical: 0,
  },
  nextButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  modelPlaceholder: {
    height: 150,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginBottom: 8,
  },
  modelErrorText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
})

export default SetupInitScreen