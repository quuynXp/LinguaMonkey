import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LessonProgressWrongItemResponse } from '../../types/dto';

interface MistakeReviewProps {
    wrongItems: LessonProgressWrongItemResponse[];
    onRetry: (wrongAnswer: string, questionId: string) => void;
}

const MistakeReviewComponent: React.FC<MistakeReviewProps> = ({ wrongItems, onRetry }) => {
    if (!wrongItems || wrongItems.length === 0) return null;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Icon name="warning" size={20} color="#B45309" />
                <Text style={styles.title}>Cần cải thiện ({wrongItems.length})</Text>
            </View>
            <Text style={styles.subtitle}>Hãy luyện tập lại những phần bạn chưa đạt điểm tối đa:</Text>
            
            <FlatList
                data={wrongItems}
                keyExtractor={(item) => item.lessonQuestionId || Math.random().toString()}
                scrollEnabled={false}
                renderItem={({ item }) => (
                    <View style={styles.itemContainer}>
                        <View style={styles.textContainer}>
                            <Text style={styles.questionText} numberOfLines={1}>
                                {item.wrongAnswer ? `"${item.wrongAnswer}"` : "Phát âm chưa chuẩn"}
                            </Text>
                            <Text style={styles.attemptText}>
                                {/* Lần thử: {item.attemptNumber} */}
                                Lần thử: 0
                            </Text>
                        </View>
                        
                        <TouchableOpacity 
                            style={styles.retryButton}
                            onPress={() => onRetry(item.wrongAnswer || "", item.lessonQuestionId || "")}
                        >
                            <Icon name="refresh" size={16} color="#FFF" />
                            <Text style={styles.retryText}>Làm lại</Text>
                        </TouchableOpacity>
                    </View>
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 24,
        backgroundColor: '#FFFBEB',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#92400E',
    },
    subtitle: {
        fontSize: 14,
        color: '#B45309',
        marginBottom: 12,
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    textContainer: {
        flex: 1,
        marginRight: 12,
    },
    questionText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#EF4444',
        marginBottom: 4,
    },
    attemptText: {
        fontSize: 12,
        color: '#6B7280',
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F59E0B',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 4,
    },
    retryText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});

export default MistakeReviewComponent;