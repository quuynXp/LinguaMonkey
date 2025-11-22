import { useState } from "react"
import { FlatList, ScrollView, Text, TouchableOpacity, View, ActivityIndicator } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useTranslation } from "react-i18next"
import { useCertificates } from "../../hooks/useCertifications"
import { createScaledSheet } from "../../utils/scaledStyles"
import ScreenLayout from "../../components/layout/ScreenLayout"
import type { CertificateResponse } from "../../types/dto"

const CertificationLearningScreen = ({ navigation }: any) => {
  const { t } = useTranslation()

  const [selectedLanguage, setSelectedLanguage] = useState<string>("All")
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateResponse | null>(null)
  const [testMode, setTestMode] = useState<"selection" | "practice" | "exam" | "results">("selection")

  const { data: certificatesResponse, isLoading, error, refetch } = useCertificates(0, 20)

  const certificates = certificatesResponse?.data || []
  const availableLanguages = ["All", ...new Set(certificates?.map((cert) => cert.languageCode) || [])]
  const filteredCertificates =
    selectedLanguage === "All"
      ? certificates
      : certificates?.filter((cert) => cert.languageCode === selectedLanguage) || []

  const handleSelectCertificate = (certificate: CertificateResponse) => {
    setSelectedCertificate(certificate)
    setTestMode("practice")
  }

  const handleBackToSelection = () => {
    setTestMode("selection")
    setSelectedCertificate(null)
  }

  const renderCertificateCard = ({ item }: { item: CertificateResponse }) => (
    <View style={styles.certificateCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardIcon}>🎓</Text>
        <View style={styles.cardInfo}>
          <Text style={styles.certificateName}>{item.certificateName}</Text>
          <Text style={styles.languageCode}>{item.languageCode}</Text>
        </View>
      </View>

      <Text style={styles.description}>{item.description}</Text>

      <TouchableOpacity
        style={styles.startButton}
        onPress={() => handleSelectCertificate(item)}
      >
        <Text style={styles.startButtonText}>{t("certifications.startPractice")}</Text>
      </TouchableOpacity>
    </View>
  )

  if (error) {
    return (
      <ScreenLayout>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>{t("certifications.title")}</Text>
          <View />
        </View>
        <View style={styles.errorContainer}>
          <Icon name="error" size={64} color="#F44336" />
          <Text style={styles.errorText}>{t("errors.loadCertificationsFailed")}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryText}>{t("common.retry")}</Text>
          </TouchableOpacity>
        </View>
      </ScreenLayout>
    )
  }

  if (testMode === "practice" && selectedCertificate) {
    return (
      <ScreenLayout>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackToSelection}>
            <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>{selectedCertificate.certificateName}</Text>
          <View />
        </View>
        <ScrollView style={styles.practiceContainer}>
          <View style={styles.practiceCard}>
            <Text style={styles.practiceTitle}>{t("certifications.practiceMode")}</Text>
            <Text style={styles.practiceDescription}>
              {selectedCertificate.description}
            </Text>
            <Text style={styles.infoText}>{t("certifications.practiceInfo")}</Text>
          </View>
        </ScrollView>
      </ScreenLayout>
    )
  }

  return (
    <ScreenLayout>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>{t("certifications.title")}</Text>
        <View />
      </View>

      <View style={styles.languageSelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {availableLanguages.map((language) => (
            <TouchableOpacity
              key={language}
              style={[
                styles.languageChip,
                selectedLanguage === language && styles.selectedLanguageChip,
              ]}
              onPress={() => setSelectedLanguage(language)}
            >
              <Text
                style={[
                  styles.languageChipText,
                  selectedLanguage === language && styles.selectedLanguageChipText,
                ]}
              >
                {language === "All" ? t("common.all") : language}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4ECDC4" />
          <Text style={styles.loadingText}>{t("certifications.loadingCertifications")}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredCertificates}
          renderItem={renderCertificateCard}
          keyExtractor={(item) => item.certificateId}
          contentContainerStyle={styles.certificatesList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="school" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>{t("certifications.noCertificationsAvailable")}</Text>
              <Text style={styles.emptySubtext}>{t("certifications.checkBackLater")}</Text>
            </View>
          }
        />
      )}
    </ScreenLayout>
  )
}

const styles = createScaledSheet({
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
  languageSelector: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  languageChip: {
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 5,
    marginLeft: 15,
  },
  selectedLanguageChip: {
    backgroundColor: "#4ECDC4",
  },
  languageChipText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  selectedLanguageChipText: {
    color: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginVertical: 16,
  },
  retryButton: {
    backgroundColor: "#4ECDC4",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  certificatesList: {
    padding: 20,
  },
  certificateCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: "#4ECDC4",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  cardIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  certificateName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  languageCode: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  description: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 15,
  },
  startButton: {
    backgroundColor: "#4ECDC4",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  startButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  practiceContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  practiceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginVertical: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  practiceTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  practiceDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 15,
  },
  infoText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#9CA3AF",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#D1D5DB",
    textAlign: "center",
  },
})

export default CertificationLearningScreen
