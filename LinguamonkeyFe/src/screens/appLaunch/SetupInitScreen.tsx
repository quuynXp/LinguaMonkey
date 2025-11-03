import * as Localization from "expo-localization"
import { useEffect, useRef, useState } from "react"
import { Alert, Animated, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, FlatList } from "react-native"
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Character3D, Language, Interest, Country, AgeRange, LearningPace, CreateUserPayload, languageToCountry } from "../../types/api"
import instance from "../../api/axiosInstance"
import ModelViewer from "../../components/ModelViewer"
import CountryFlag from "react-native-country-flag"
import { useTranslation } from "react-i18next"
import { SafeAreaView } from "react-native-safe-area-context"
import { gotoTab } from "../../utils/navigationRef";

import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useUserStore } from "../../stores/UserStore";
import { t } from "i18next"
import { useTokenStore } from "../../stores/tokenStore";
import { createScaledSheet } from "../../utils/scaledStyles";
import AsyncStorage from "@react-native-async-storage/async-storage";


type SetupInitScreenProps = {
  navigation: NativeStackNavigationProp<any>
}

const countryToDefaultLanguage: Record<string, string> = {
  US: "EN",
  VN: "VI",
  JP: "JA",
  CN: "ZH",
  FR: "FR",
  DE: "DE",
  ES: "ES",
  IT: "IT",
  KR: "KO",
  RU: "RU",
  IN: "EN",
  ZH: "ZH",
}

const SetupInitScreen = ({ navigation }: SetupInitScreenProps) => {
  const { t } = useTranslation()
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedCharacter, setSelectedCharacter] = useState<Character3D | null>(null)
  const [accountName, setAccountName] = useState("")
  const [email, setEmail] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("");
  const [country, setCountry] = useState<string | null>(null) // store country CODE (e.g. "VN", "US")
  const [ageRange, setAgeRange] = useState("")
  const [nativeLanguage, setNativeLanguage] = useState<string | null>(null) // store language CODE uppercase (e.g. "VI", "EN")
  const [targetLanguages, setTargetLanguages] = useState<string[]>([])
  const [certificationsSelected, setCertificationsSelected] = useState<string[]>([])
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const [learningGoalsSelected, setLearningGoalsSelected] = useState<string[]>([])
  const [learningPace, setLearningPace] = useState("")


  const [characters, setCharacters] = useState<Character3D[]>([])
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
    { id: "toefl", name: "TOEFL", description: "Test of English as a Foreign Language", languageCode: "EN" },
    { id: "ielts", name: "IELTS", description: "International English Language Testing System", languageCode: "EN" },
    { id: "hsk", name: "HSK", description: "Hanyu Shuiping Kaoshi (Chinese)", languageCode: "ZH" },
    { id: "jlpt", name: "JLPT", description: "Japanese Language Proficiency Test", languageCode: "JP" },
    { id: "topik", name: "TOPIK", description: "Test of Proficiency in Korean", languageCode: "KR" },
    { id: "dalf", name: "DALF", description: "Diplôme Approfondi de Langue Française", languageCode: "FR" },
    { id: "dele", name: "DELE", description: "Diplomas de Español como Lengua Extranjera", languageCode: "ES" },
    { id: "goethe", name: "Goethe", description: "German Language Certificate", languageCode: "DE" },
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
    return AGE_ENUM_MAP[display] ?? undefined; // undefined nếu không tìm thấy
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


  useEffect(() => {
    fetchLanguages()
    fetchCharacters()
    fetchInterests()
  }, [])


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

  useEffect(() => {
    if (characters.length && !selectedCharacter) setSelectedCharacter(characters[0])
  }, [characters])

  useEffect(() => {
    if (interests.length && selectedInterests.length === 0) {
      setSelectedInterests([interests[0].interestId])
    }
  }, [interests])

  useEffect(() => {
    // Initialize country and native language based on location (store codes and uppercase language codes)
    const locales = Localization.getLocales()
    if (locales && locales.length > 0) {
      const regionCode = locales[0]?.regionCode?.toUpperCase()
      const languageCodeRaw = locales[0]?.languageCode
      const languageCode = languageCodeRaw ? languageCodeRaw.toUpperCase() : undefined
      const foundCountry = countries.find(c => c.code === regionCode)
      if (foundCountry) {
        setCountry(foundCountry.code)
        // set default native language from country mapping (fallback to locale)
        const defaultLang = countryToDefaultLanguage[foundCountry.code] ?? languageCode
        if (defaultLang) {
          setNativeLanguage(String(defaultLang).toUpperCase())
          // ensure targetLanguages doesn't accidentally include native
          setTargetLanguages(prev => prev.filter(c => c !== String(defaultLang).toUpperCase()))
        }
      } else if (languageCode) {
        setNativeLanguage(languageCode)
        setTargetLanguages(prev => prev.filter(c => c !== languageCode))
      }
    }

    // Set default selections
    if (characters.length > 0) setSelectedCharacter(characters[0])
    if (interests.length > 0) setSelectedInterests([interests[0].interestId])
    if (learningGoals.length > 0) setLearningGoalsSelected(["conversation"])
    setLearningPace("slow")
    setAgeRange("18-24")
  }, [])

  const fetchCharacters = async () => {
    try {
      const response = await instance.get('/character3ds');
      const charactersArray = response.data.result?.content;

      if (Array.isArray(charactersArray)) {
        setCharacters(charactersArray); // BE đã trả camelCase, giữ nguyên
      } else {
        setCharacters([]);
      }
    } catch (error) {
      Alert.alert(t("error.title"), t("error.loadCharacters"));
    }
  };


  const fetchLanguages = async () => {
    try {
      const response = await instance.get('/languages')
      const languageArray = response.data.result?.content
      if (Array.isArray(languageArray)) {
        // normalize language codes to uppercase to avoid mismatch
        const normalized = languageArray.map((lang: any) => ({
          languageCode: String(lang.languageCode ?? "").toUpperCase(),
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
      const response = await instance.get('/interests')
      const data = response.data.result || []
      setInterests(data) // giữ nguyên camelCase từ BE
    } catch (error) {
      Alert.alert(t("error.title"), t("error.loadInterests"))
    }
  }

  const handleNext = async () => {
    if (currentStep === 1 && !selectedCharacter) {
      Alert.alert(t("error.title"), t("error.characterRequired"))
      return
    }
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

    // Optional fields can be empty, so no validation for steps 3 and 4

    if (currentStep < 5) {
      setCurrentStep(currentStep + 1)
    } else {
      await createTempAccountAndSetup()
    }
  }


  const createTempAccountAndSetup = async () => {
    try {
      // basic client-side validation
      if (!email || !email.includes("@")) {
        Alert.alert(t("error.title"), t("error.enterValidEmail") || "Please enter a valid email")
        return
      }

      // build payload but only attach keys that have real values (no "undefined" strings)
      const payload: Partial<CreateUserPayload> = {
        email: email.toLowerCase(),
        fullname: accountName || undefined,
        nickname: accountName || undefined,
        phone: phoneNumber || undefined,
      }

      // character3dId: only set if value exists and is a proper UUID-like string
      if (selectedCharacter?.character3dId) {
        payload.character3dId = selectedCharacter.character3dId // do NOT call String(...) when might be undefined
      }

      // country: use mapped enum token
      const mappedCountry = mapCountryToEnum(country ?? undefined)
      if (mappedCountry) payload.country = mappedCountry as Country

      // ageRange: map display -> BE enum (AGE_18_24 ...)
      const mappedAge = mapAgeRangeToEnum(ageRange)
      if (mappedAge) payload.ageRange = mappedAge as unknown as string

      if (nativeLanguage) payload.nativeLanguageCode = nativeLanguage.toUpperCase()
      if (targetLanguages?.length) payload.languages = targetLanguages.map(code => code.toUpperCase())

      if (certificationsSelected?.length) {
        // ensure we only map valid non-empty strings
        payload.certificationIds = certificationsSelected
          .map(id => id?.toUpperCase())
          .filter(Boolean) as string[]
      }

      // IMPORTANT: backend expects 'interestestIds' (typo) as array of UUID strings
      if (selectedInterests?.length) {
        payload.interestestIds = selectedInterests
          .map(id => (id ? String(id) : null))
          .filter(Boolean) as string[]
      }

      if (learningGoalsSelected?.length) {
        payload.goalIds = learningGoalsSelected.map(id => id.toUpperCase()).filter(Boolean) as string[]
      }

      if (learningPace) payload.learningPace = learningPace.toUpperCase() as LearningPace

      // DEBUG: ensure nothing silly like "undefined" exists
      console.log("Create user payload ->", JSON.stringify(payload, null, 2))

      console.log("Creating temp account with payload:", payload)
      const response = await instance.post('/users', payload)
      console.log("Account created, response:", response.data)
      useUserStore.getState().setUser(response.data.result.user)
      if (response.data.result.accessToken) {
         useTokenStore.getState().setTokens(response.data.result.accessToken, response.data.result.refreshToken)
      }
      // useTokenStore.getState().setTokens(response.data.result.accessToken, response.data.result.refreshToken)

      await AsyncStorage.setItem("hasFinishedSetup", "true");

      gotoTab("ProficiencyTestScreen")
    } catch (error) {
      console.error("createTempAccountAndSetup error:", error)
      Alert.alert(t("error.title"), t("error.setupAccount"))
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
    console.log(`Toggling ${item}, new state:`, newArray) // Debug log
    setter(newArray)
  }

  const normalizeLangCode = (code?: string) => (code ? String(code).toUpperCase() : "")

  // prevent selecting the same as native: user must explicitly choose a non-native language
  const toggleTargetLanguage = (langCodeRaw: string) => {
    const langCode = normalizeLangCode(langCodeRaw)
    if (!langCode) return

    if (nativeLanguage && langCode === nativeLanguage) {
      // disallow auto-selecting native as a learning language
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
      // remove native from targets if present
      setTargetLanguages(prev => prev.filter(c => c !== code))
    }
  }

  const onSelectNativeLanguage = (langCodeRaw: string) => {
    const code = normalizeLangCode(langCodeRaw)
    setNativeLanguage(code)
    // remove native from targets if present
    setTargetLanguages(prev => prev.filter(c => c !== code))
  }

  const getFlagIsoFromLang = (langCode?: string) => {
    if (!langCode) return undefined
    const lower = String(langCode).toLowerCase()
    const mapped = (languageToCountry as Record<string, string>)[lower]
    if (mapped) return mapped
    // fallback: try first two letters, uppercase
    return langCode.slice(0, 2).toUpperCase()
  }

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3, 4, 5].map((step) => (
        <View key={`step-${step}`} style={styles.stepContainer}>
          <View style={[styles.stepCircle, currentStep >= step && styles.stepCircleActive]}>
            <Text style={[styles.stepText, currentStep >= step && styles.stepTextActive]}>{step}</Text>
          </View>
          {step < 5 && <View style={[styles.stepLine, currentStep > step && styles.stepLineActive]} />}
        </View>
      ))}
    </View>
  )


  const renderCharacterSelection = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>{t("setup.chooseCompanion")}</Text>
      <Text style={styles.stepSubtitle}>{t("setup.chooseCompanion.desc")}</Text>

      <FlatList
        data={characters}
        numColumns={2} // 2 nhân vật mỗi hàng
        keyExtractor={(item) => item.character3dId}
        columnWrapperStyle={styles.charactersRow} // căn đều 2 item mỗi row
        renderItem={({ item }) => (
          <View
            style={[
              styles.characterCard,
              selectedCharacter?.character3dId === item.character3dId && styles.characterCardSelected
            ]}
          >
            {/* Truyền onTap để chọn khi user tap nhanh vào model */}
            <ModelViewer
              modelUrl={item.modelUrl}
              onTap={() => setSelectedCharacter(item)}
            />
            <Text style={styles.characterName}>{item.character3dName}</Text>
            <Text style={styles.characterPersonality}>{item.description}</Text>

            {selectedCharacter?.character3dId === item.character3dId && (
              <View style={styles.selectedIndicator}>
                <Icon name="check-circle" size={20} color="#10B981" />
              </View>
            )}
          </View>
        )}
        contentContainerStyle={styles.charactersGrid}
      />
    </View>
  )

  const renderBasicInfo = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>{t("setup.createAccount")}</Text>
      <Text style={styles.stepSubtitle}>{t("setup.createAccount.desc")}</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>{t("auth.fullName")} *</Text>
        <TextInput
          style={styles.textInput}
          value={accountName} // Sẽ được điền sẵn từ UserStore
          onChangeText={setAccountName}
          placeholder={t("auth.enterName")}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>{t("auth.email")} *</Text>
        <TextInput
          style={styles.textInput}
          value={email} // Sẽ được điền sẵn từ UserStore
          onChangeText={setEmail}
          placeholder={t("auth.enterEmail")}
          keyboardType="email-address"
          autoCapitalize="none"
          // Cân nhắc thêm: editable={false} nếu user đăng ký bằng email
        />
      </View>

      {/* --- INPUT SĐT MỚI --- */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>{t("auth.phoneNumber")}</Text>
        {/* GỢI Ý: Đây là nơi tốt nhất để dùng thư viện 'react-native-phone-number-input'
          <PhoneInput
            defaultValue={phoneNumber}
            defaultCode={country || "VN"}
            onChangeFormattedText={(text) => {
              setPhoneNumber(text);
            }}
            containerStyle={styles.phoneInputContainer}
            textContainerStyle={styles.phoneInputTextContainer}
          />
        */}
        {/* Fallback dùng TextInput đơn giản */}
        <TextInput
          style={styles.textInput}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          placeholder={t("auth.enterPhoneNumber")}
          keyboardType="phone-pad"
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
            // hide native from learning-language options so user cannot accidentally pick it
            .filter((lang) => lang.languageCode !== nativeLanguage)
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
          <Text style={styles.summaryText}>{selectedCharacter?.character3dName || "None"}</Text>
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
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack}>
            <Icon name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("setup.title")}</Text>
          <View style={{ width: 24 }} />
        </View>

        {renderStepIndicator()}

        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {currentStep === 1 && renderCharacterSelection()}
          {currentStep === 2 && renderBasicInfo()}
          {currentStep === 3 && renderInterestsAndGoals()}
          {currentStep === 4 && renderCertificationsAndPace()}
          {currentStep === 5 && renderSummary()}
        </ScrollView>

        <View style={styles.navigationButtons}>
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>{currentStep === 5 ? t("setup.takeTest") : t("setup.continue")}</Text>
            <Icon name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  )
}

const styles = createScaledSheet({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    flex: 1,
    paddingTop: 50,
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
    width: 40,
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
  },
  characterCardSelected: {
    borderColor: "#10B981",
    backgroundColor: "#F0FDF4",
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
    marginBottom: 18, // slightly smaller so sections don't feel too tall and reduce overlap risk
  },
  nativeContainer: {
    marginTop: 6, // ensure native language block doesn't sit tight on the previous block
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
    paddingVertical: 6, // reduce vertical padding so chips are not too tall
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
    paddingVertical: 6, // reduce vertical padding to avoid text dropping
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
  nextButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
})

export default SetupInitScreen
