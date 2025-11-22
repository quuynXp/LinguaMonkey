import React, { useState } from 'react'
import { View, Text, FlatList, Image, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useTranslation } from 'react-i18next'
import { createScaledSheet } from '../../utils/scaledStyles'
import ScreenLayout from '../../components/layout/ScreenLayout'
import Icon from 'react-native-vector-icons/MaterialIcons'

const SuggestedTutorsScreen = ({ navigation }: any) => {
  const { t } = useTranslation()
  const [tutors, setTutors] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleBook = (tutorId: string) => {
    console.log('Booking tutor', tutorId)
  }

  const renderItem = ({ item }: any) => (
    <View style={styles.card}>
      <Image source={{ uri: item.avatar }} style={styles.avatar} />
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.detail}>
          {t('tutor.languageAndRating', { lang: item.lang, rating: item.rating })}
        </Text>
        <Text style={styles.price}>
          {t('tutor.pricePerHour', { price: item.price })}
        </Text>
      </View>
      <TouchableOpacity style={styles.bookBtn} onPress={() => handleBook(item.id)}>
        <Text style={styles.bookText}>{t('tutor.book')}</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <ScreenLayout>
      <View style={styles.container}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loadingText}>{t("common.loadingData")}</Text>
          </View>
        ) : (
          <FlatList
            data={tutors}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="person-search" size={48} color="#9CA3AF" />
                <Text style={styles.emptyText}>{t('suggested.noTutorsFound')}</Text>
              </View>
            }
          />
        )}
      </View>
    </ScreenLayout>
  )
}

const styles = createScaledSheet({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  listContent: {
    padding: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#4F46E5",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 10,
  },
  emptyText: {
    fontSize: 16,
    color: "#9CA3AF",
    marginTop: 10,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E5E7EB',
  },
  info: {
    flex: 1,
    marginLeft: 15,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  detail: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10B981',
    marginTop: 4,
  },
  bookBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bookText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
})

export default SuggestedTutorsScreen