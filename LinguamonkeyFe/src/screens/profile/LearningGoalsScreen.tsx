import React, { useRef, useState } from 'react';
import {
    Alert,
    Animated,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons'; 

interface Goal {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  unit: string;
  icon: string;
  color: string;
  isActive: boolean;
}

interface GoalPreset {
  id: string;
  title: string;
  description: string;
  dailyMinutes: number;
  weeklyLessons: number;
  difficulty: 'Dễ' | 'Trung bình' | 'Khó';
  icon: string;
}

const LearningGoalsScreen = ({ navigation }) => {
  const [currentGoals, setCurrentGoals] = useState<Goal[]>([
    {
      id: 'daily-minutes',
      title: 'Học mỗi ngày',
      description: 'Thời gian học tối thiểu mỗi ngày',
      target: 30,
      current: 25,
      unit: 'phút',
      icon: 'schedule',
      color: '#4F46E5',
      isActive: true,
    },
    {
      id: 'weekly-lessons',
      title: 'Bài học trong tuần',
      description: 'Số bài học hoàn thành mỗi tuần',
      target: 10,
      current: 7,
      unit: 'bài',
      icon: 'school',
      color: '#10B981',
      isActive: true,
    },
    {
      id: 'streak-days',
      title: 'Chuỗi ngày học',
      description: 'Học liên tục không nghỉ',
      target: 30,
      current: 7,
      unit: 'ngày',
      icon: 'local-fire-department',
      color: '#F59E0B',
      isActive: true,
    },
  ]);

  const [goalPresets] = useState<GoalPreset[]>([
    {
      id: 'casual',
      title: 'Học nhẹ nhàng',
      description: 'Phù hợp cho người bận rộn',
      dailyMinutes: 15,
      weeklyLessons: 5,
      difficulty: 'Dễ',
      icon: 'self-improvement',
    },
    {
      id: 'regular',
      title: 'Học đều đặn',
      description: 'Cân bằng giữa học và nghỉ',
      dailyMinutes: 30,
      weeklyLessons: 10,
      difficulty: 'Trung bình',
      icon: 'trending-up',
    },
    {
      id: 'intensive',
      title: 'Học chuyên sâu',
      description: 'Dành cho người quyết tâm',
      dailyMinutes: 60,
      weeklyLessons: 20,
      difficulty: 'Khó',
      icon: 'rocket-launch',
    },
  ]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [selectedPreset, setSelectedPreset] = useState<string>('regular');

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const updateGoal = (goalId: string, newTarget: number) => {
    setCurrentGoals(prev =>
      prev.map(goal =>
        goal.id === goalId ? { ...goal, target: newTarget } : goal
      )
    );
  };

  const applyPreset = (preset: GoalPreset) => {
    Alert.alert(
      'Áp dụng mục tiêu',
      `Bạn có muốn áp dụng gói "${preset.title}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Áp dụng',
          onPress: () => {
            setCurrentGoals(prev =>
              prev.map(goal => {
                if (goal.id === 'daily-minutes') {
                  return { ...goal, target: preset.dailyMinutes };
                }
                if (goal.id === 'weekly-lessons') {
                  return { ...goal, target: preset.weeklyLessons };
                }
                return goal;
              })
            );
            setSelectedPreset(preset.id);
          },
        },
      ]
    );
  };

  const renderGoalCard = (goal: Goal) => {
    const progress = Math.min((goal.current / goal.target) * 100, 100);
    
    return (
      <View key={goal.id} style={styles.goalCard}>
        <View style={styles.goalHeader}>
          <View style={[styles.goalIcon, { backgroundColor: `${goal.color}20` }]}>
            <Icon name={goal.icon} size={24} color={goal.color} />
          </View>
          <View style={styles.goalInfo}>
            <Text style={styles.goalTitle}>{goal.title}</Text>
            <Text style={styles.goalDescription}>{goal.description}</Text>
          </View>
          <TouchableOpacity style={styles.editButton}>
            <Icon name="edit" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <View style={styles.goalProgress}>
          <View style={styles.progressInfo}>
            <Text style={styles.progressText}>
              {goal.current}/{goal.target} {goal.unit}
            </Text>
            <Text style={[styles.progressPercent, { color: goal.color }]}>
              {Math.round(progress)}%
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress}%`, backgroundColor: goal.color },
              ]}
            />
          </View>
        </View>

        {progress >= 100 && (
          <View style={styles.completedBadge}>
            <Icon name="check-circle" size={16} color="#10B981" />
            <Text style={styles.completedText}>Hoàn thành!</Text>
          </View>
        )}
      </View>
    );
  };

  const renderPresetCard = (preset: GoalPreset) => {
    const isSelected = selectedPreset === preset.id;
    
    return (
      <TouchableOpacity
        key={preset.id}
        style={[styles.presetCard, isSelected && styles.selectedPreset]}
        onPress={() => applyPreset(preset)}
      >
        <View style={styles.presetHeader}>
          <View style={styles.presetIcon}>
            <Icon name={preset.icon} size={24} color="#4F46E5" />
          </View>
          <View style={styles.presetInfo}>
            <Text style={styles.presetTitle}>{preset.title}</Text>
            <Text style={styles.presetDescription}>{preset.description}</Text>
          </View>
          <View style={[styles.difficultyBadge, getDifficultyStyle(preset.difficulty)]}>
            <Text style={[styles.difficultyText, getDifficultyTextStyle(preset.difficulty)]}>
              {preset.difficulty}
            </Text>
          </View>
        </View>

        <View style={styles.presetDetails}>
          <View style={styles.presetStat}>
            <Icon name="schedule" size={16} color="#6B7280" />
            <Text style={styles.presetStatText}>{preset.dailyMinutes} phút/ngày</Text>
          </View>
          <View style={styles.presetStat}>
            <Icon name="school" size={16} color="#6B7280" />
            <Text style={styles.presetStatText}>{preset.weeklyLessons} bài/tuần</Text>
          </View>
        </View>

        {isSelected && (
          <View style={styles.selectedIndicator}>
            <Icon name="check-circle" size={20} color="#4F46E5" />
            <Text style={styles.selectedText}>Đang áp dụng</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const getDifficultyStyle = (difficulty: string) => {
    switch (difficulty) {
      case 'Dễ':
        return { backgroundColor: '#ECFDF5' };
      case 'Trung bình':
        return { backgroundColor: '#FFFBEB' };
      case 'Khó':
        return { backgroundColor: '#FEF2F2' };
      default:
        return { backgroundColor: '#F3F4F6' };
    }
  };

  const getDifficultyTextStyle = (difficulty: string) => {
    switch (difficulty) {
      case 'Dễ':
        return { color: '#10B981' };
      case 'Trung bình':
        return { color: '#F59E0B' };
      case 'Khó':
        return { color: '#EF4444' };
      default:
        return { color: '#6B7280' };
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mục tiêu học tập</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.scrollContent, { opacity: fadeAnim }]}>
          {/* Current Goals */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mục tiêu hiện tại</Text>
            <Text style={styles.sectionSubtitle}>
              Theo dõi tiến độ học tập của bạn
            </Text>
            {currentGoals.map(renderGoalCard)}
          </View>

          {/* Goal Presets */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Gói mục tiêu</Text>
            <Text style={styles.sectionSubtitle}>
              Chọn gói phù hợp với lịch trình của bạn
            </Text>
            {goalPresets.map(renderPresetCard)}
          </View>

          {/* Motivation Section */}
          <View style={styles.motivationSection}>
            <View style={styles.motivationHeader}>
              <Icon name="emoji-people" size={24} color="#4F46E5" style={styles.motivationIcon} />
              <Text style={styles.motivationTitle}>Động lực học tập</Text>
            </View>
            <View style={styles.motivationContent}>
              <Text style={styles.motivationText}>
                "Thành công không phải là chìa khóa của hạnh phúc. 
                Hạnh phúc là chìa khóa của thành công. 
                Nếu bạn yêu thích những gì mình đang làm, 
                bạn sẽ thành công."
              </Text>
              <Text style={styles.motivationAuthor}>- Albert Schweitzer</Text>
            </View>
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
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  goalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  goalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  goalInfo: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  goalDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  editButton: {
    padding: 4,
  },
  goalProgress: {
    marginBottom: 8,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#374151',
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  completedText: {
    fontSize: 12,
    color: '#10B981',
    marginLeft: 4,
    fontWeight: '500',
  },
  presetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedPreset: {
    borderColor: '#4F46E5',
  },
  presetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  presetIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  presetInfo: {
    flex: 1,
  },
  presetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  presetDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '500',
  },
  presetDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  presetStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  presetStatText: {
    fontSize: 12,
    color: '#6B7280',
  },
  selectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  selectedText: {
    fontSize: 12,
    color: '#4F46E5',
    marginLeft: 4,
    fontWeight: '500',
  },
  motivationSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  motivationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  motivationIcon: {
    width: 32,
    height: 32,
    marginRight: 8,
  },
  motivationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  motivationContent: {
    alignItems: 'center',
  },
  motivationText: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 22,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  motivationAuthor: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
});

export default LearningGoalsScreen;