import React, { useRef } from 'react';
import {
    Animated,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons'; 

const AboutScreen = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
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
    ]).start();
  }, []);

  const teamMembers = [
    { name: 'Nguyễn Văn A', role: 'CEO & Founder', avatar: '👨‍💼' },
    { name: 'Trần Thị B', role: 'CTO', avatar: '👩‍💻' },
    { name: 'Lê Văn C', role: 'Lead Designer', avatar: '👨‍🎨' },
    { name: 'Phạm Thị D', role: 'Language Expert', avatar: '👩‍🏫' },
  ];

  const features = [
    {
      icon: 'school',
      title: 'Học tập thông minh',
      description: 'AI cá nhân hóa trải nghiệm học tập cho từng người dùng',
    },
    {
      icon: 'chat',
      title: 'Trò chuyện với AI',
      description: 'Luyện tập hội thoại với trợ lý AI thông minh',
    },
    {
      icon: 'trending-up',
      title: 'Theo dõi tiến độ',
      description: 'Phân tích chi tiết về quá trình học tập của bạn',
    },
    {
      icon: 'group',
      title: 'Cộng đồng',
      description: 'Kết nối với hàng triệu người học trên toàn thế giới',
    },
  ];

  const socialLinks = [
    { name: 'Facebook', icon: 'facebook', url: 'https://facebook.com/linguaviet' },
    { name: 'Instagram', icon: 'camera-alt', url: 'https://instagram.com/linguaviet' },
    { name: 'Twitter', icon: 'alternate-email', url: 'https://twitter.com/linguaviet' },
    { name: 'YouTube', icon: 'play-circle', url: 'https://youtube.com/linguaviet' },
  ];

  const openLink = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Về ứng dụng</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={[
            styles.scrollContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* App Logo & Info */}
          <View style={styles.appSection}>
            <View style={styles.logoContainer}>
              
            </View>
            <Text style={styles.appName}>LinguaViet</Text>
            <Text style={styles.appTagline}>
              Ứng dụng học ngôn ngữ thông minh cho người Việt
            </Text>
            <View style={styles.versionContainer}>
              <Text style={styles.versionText}>Phiên bản 1.0.0</Text>
              <View style={styles.versionBadge}>
                <Text style={styles.versionBadgeText}>Mới nhất</Text>
              </View>
            </View>
          </View>

          {/* Mission */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sứ mệnh</Text>
            <View style={styles.missionCard}>
              <Text style={styles.missionText}>
                Chúng tôi tin rằng việc học ngôn ngữ không chỉ là học từ vựng và ngữ pháp, 
                mà còn là cầu nối văn hóa giữa các dân tộc. LinguaViet được tạo ra để 
                giúp người Việt Nam tiếp cận và thành thạo các ngôn ngữ quốc tế một cách 
                hiệu quả và thú vị nhất.
              </Text>
            </View>
          </View>

          {/* Features */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tính năng nổi bật</Text>
            <View style={styles.featuresGrid}>
              {features.map((feature, index) => (
                <View key={index} style={styles.featureCard}>
                  <View style={styles.featureIcon}>
                    <Icon name={feature.icon} size={24} color="#4F46E5" />
                  </View>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Team */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Đội ngũ phát triển</Text>
            <View style={styles.teamGrid}>
              {teamMembers.map((member, index) => (
                <View key={index} style={styles.teamCard}>
                  <Text style={styles.teamAvatar}>{member.avatar}</Text>
                  <Text style={styles.teamName}>{member.name}</Text>
                  <Text style={styles.teamRole}>{member.role}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Statistics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thống kê</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>100K+</Text>
                <Text style={styles.statLabel}>Người dùng</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>50+</Text>
                <Text style={styles.statLabel}>Quốc gia</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>1M+</Text>
                <Text style={styles.statLabel}>Bài học</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>4.8★</Text>
                <Text style={styles.statLabel}>Đánh giá</Text>
              </View>
            </View>
          </View>

          {/* Social Media */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Theo dõi chúng tôi</Text>
            <View style={styles.socialContainer}>
              {socialLinks.map((social, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.socialButton}
                  onPress={() => openLink(social.url)}
                >
                  <Icon name={social.icon} size={24} color="#4F46E5" />
                  <Text style={styles.socialText}>{social.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Legal & Contact */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pháp lý & Liên hệ</Text>
            <View style={styles.legalContainer}>
              <TouchableOpacity style={styles.legalItem}>
                <Icon name="description" size={20} color="#6B7280" />
                <Text style={styles.legalText}>Điều khoản sử dụng</Text>
                <Icon name="open-in-new" size={16} color="#9CA3AF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.legalItem}>
                <Icon name="security" size={20} color="#6B7280" />
                <Text style={styles.legalText}>Chính sách bảo mật</Text>
                <Icon name="open-in-new" size={16} color="#9CA3AF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.legalItem}>
                <Icon name="email" size={20} color="#6B7280" />
                <Text style={styles.legalText}>Liên hệ: info@linguaviet.com</Text>
                <Icon name="open-in-new" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Copyright */}
          <View style={styles.copyrightSection}>
            <Text style={styles.copyrightText}>
              © 2024 LinguaViet. Tất cả quyền được bảo lưu.
            </Text>
            <Text style={styles.copyrightSubtext}>
              Được phát triển với ❤️ tại Việt Nam
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  placeholder: {
    width: 24,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  appSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  logoAnimation: {
    width: '100%',
    height: '100%',
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  appTagline: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  versionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  versionText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  versionBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  versionBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  missionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  missionText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    textAlign: 'justify',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: '47%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 16,
  },
  teamGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  teamCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: '47%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  teamAvatar: {
    fontSize: 32,
    marginBottom: 8,
  },
  teamName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  teamRole: {
    fontSize: 12,
    color: '#6B7280',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: '47%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4F46E5',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  socialContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  socialButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  socialText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
    fontWeight: '500',
  },
  legalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  legalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  legalText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    marginLeft: 12,
  },
  copyrightSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  copyrightText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  copyrightSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});

export default AboutScreen;