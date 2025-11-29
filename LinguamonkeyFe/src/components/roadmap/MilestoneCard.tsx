// import React, { useState } from "react";
// import {
//     View,
//     Text,
//     TouchableOpacity,
//     TextInput,
//     Image,
//     ActivityIndicator,
//     LayoutAnimation,
//     Platform,
//     UIManager,
// } from "react-native";
// import Icon from "react-native-vector-icons/MaterialIcons";
// import { createScaledSheet } from "../../utils/scaledStyles";
// import type { MilestoneUserResponse, RoadmapSuggestionResponse } from "../../types/dto";

// // Enable LayoutAnimation on Android
// if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
//     UIManager.setLayoutAnimationEnabledExperimental(true);
// }

// interface Resource {
//     type: string;
//     title: string;
//     url: string;
//     duration?: number;
// }

// interface MilestoneCardProps {
//     milestone: MilestoneUserResponse & {
//         skills?: string[];
//         resources?: Resource[];
//     };
//     suggestions: RoadmapSuggestionResponse[];
//     index: number;
//     isLast: boolean;
//     isExpanded: boolean;
//     onToggle: () => void;
//     onComplete?: () => void;
//     onAddSuggestion?: (text: string) => Promise<void>;
//     isOwner?: boolean;
// }

// const MilestoneCard: React.FC<MilestoneCardProps> = ({
//     milestone,
//     suggestions,
//     index,
//     isLast,
//     isExpanded,
//     onToggle,
//     onComplete,
//     onAddSuggestion,
//     isOwner = false,
// }) => {
//     const [suggestionText, setSuggestionText] = useState("");
//     const [isSubmitting, setIsSubmitting] = useState(false);

//     const handleSubmitSuggestion = async () => {
//         if (!suggestionText.trim() || !onAddSuggestion) return;
//         setIsSubmitting(true);
//         try {
//             await onAddSuggestion(suggestionText);
//             setSuggestionText("");
//         } catch (error) {
//             console.error(error);
//         } finally {
//             setIsSubmitting(false);
//         }
//     };

//     const handleToggle = () => {
//         LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
//         onToggle();
//     };

//     const getStatusColor = () => {
//         if (milestone.completed) return "#10B981";
//         return milestone.status === "in_progress" ? "#3B82F6" : "#F59E0B";
//     };

//     const getStatusIcon = () => {
//         if (milestone.completed) return "check-circle";
//         return milestone.status === "in_progress" ? "play-circle-filled" : "radio-button-unchecked";
//     };

//     const statusColor = getStatusColor();

//     return (
//         <View style={styles.container}>
//             {/* Timeline Line */}
//             {!isLast && (
//                 <View
//                     style={[
//                         styles.timelineLine,
//                         { backgroundColor: milestone.completed ? "#10B981" : "#E5E7EB" },
//                     ]}
//                 />
//             )}

//             {/* Main Card */}
//             <View style={styles.card}>
//                 {/* Header */}
//                 <TouchableOpacity
//                     style={styles.header}
//                     onPress={handleToggle}
//                     activeOpacity={0.8}
//                 >
//                     {/* Status Icon */}
//                     <View
//                         style={[
//                             styles.statusIcon,
//                             {
//                                 backgroundColor: milestone.completed ? statusColor : "#FFF",
//                                 borderColor: statusColor,
//                             },
//                         ]}
//                     >
//                         <Icon
//                             name={getStatusIcon()}
//                             size={20}
//                             color={milestone.completed ? "#FFF" : statusColor}
//                         />
//                     </View>

//                     {/* Content */}
//                     <View style={styles.headerContent}>
//                         <View style={styles.titleRow}>
//                             <Text style={styles.title} numberOfLines={isExpanded ? undefined : 2}>
//                                 {milestone.title}
//                             </Text>
//                             <Icon
//                                 name={isExpanded ? "expand-less" : "expand-more"}
//                                 size={24}
//                                 color="#9CA3AF"
//                             />
//                         </View>

//                         <Text
//                             style={styles.description}
//                             numberOfLines={isExpanded ? undefined : 2}
//                         >
//                             {milestone.description}
//                         </Text>

//                         <View style={styles.metaRow}>
//                             <View style={styles.metaItem}>
//                                 <Icon name="layers" size={14} color="#6B7280" />
//                                 <Text style={styles.metaText}>Level {milestone.level}</Text>
//                             </View>
//                             <View style={styles.dot} />
//                             <View style={styles.metaItem}>
//                                 <Icon name="schedule" size={14} color="#6B7280" />
//                                 <Text style={styles.metaText}>2h</Text>
//                             </View>
//                             <View style={styles.dot} />
//                             <View style={styles.metaItem}>
//                                 <Icon name="stars" size={14} color="#F59E0B" />
//                                 <Text style={styles.metaText}>100 XP</Text>
//                             </View>
//                         </View>
//                     </View>
//                 </TouchableOpacity>

//                 {/* Expanded Details */}
//                 {isExpanded && (
//                     <View style={styles.expandedContent}>
//                         {/* Progress Bar */}
//                         {milestone.status === "in_progress" && milestone.progress !== undefined && (
//                             <View style={styles.progressSection}>
//                                 <View style={styles.progressHeader}>
//                                     <Text style={styles.progressLabel}>Progress</Text>
//                                     <Text style={styles.progressPercent}>{milestone.progress}%</Text>
//                                 </View>
//                                 <View style={styles.progressBar}>
//                                     <View
//                                         style={[
//                                             styles.progressFill,
//                                             { width: `${milestone.progress}%` },
//                                         ]}
//                                     />
//                                 </View>
//                             </View>
//                         )}

//                         {/* Skills */}
//                         {milestone.skills && milestone.skills.length > 0 && (
//                             <View style={styles.section}>
//                                 <Text style={styles.sectionTitle}>Skills You'll Learn</Text>
//                                 <View style={styles.skillsGrid}>
//                                     {milestone.skills.map((skill, i) => (
//                                         <View key={i} style={styles.skillChip}>
//                                             <Text style={styles.skillText}>{skill}</Text>
//                                         </View>
//                                     ))}
//                                 </View>
//                             </View>
//                         )}

//                         {/* Resources */}
//                         {milestone.resources && milestone.resources.length > 0 && (
//                             <View style={styles.section}>
//                                 <Text style={styles.sectionTitle}>Resources</Text>
//                                 {milestone.resources.map((resource, i) => (
//                                     <TouchableOpacity key={i} style={styles.resourceItem}>
//                                         <View style={styles.resourceIcon}>
//                                             <Icon
//                                                 name={
//                                                     resource.type === "video"
//                                                         ? "play-circle-filled"
//                                                         : resource.type === "article"
//                                                             ? "article"
//                                                             : "fitness-center"
//                                                 }
//                                                 size={20}
//                                                 color="#3B82F6"
//                                             />
//                                         </View>
//                                         <View style={styles.resourceContent}>
//                                             <Text style={styles.resourceTitle}>{resource.title}</Text>
//                                             {resource.duration && (
//                                                 <Text style={styles.resourceDuration}>
//                                                     {resource.duration} min
//                                                 </Text>
//                                             )}
//                                         </View>
//                                         <Icon name="chevron-right" size={20} color="#9CA3AF" />
//                                     </TouchableOpacity>
//                                 ))}
//                             </View>
//                         )}

//                         {/* Action Button */}
//                         {!milestone.completed && isOwner && onComplete && (
//                             <TouchableOpacity style={styles.completeBtn} onPress={onComplete}>
//                                 <Text style={styles.completeBtnText}>
//                                     {milestone.status === "available" ? "Start Learning" : "Mark as Complete"}
//                                 </Text>
//                                 <Icon name="arrow-forward" size={16} color="#FFF" />
//                             </TouchableOpacity>
//                         )}

//                         {/* Suggestions Section */}
//                         <View style={styles.suggestionsSection}>
//                             <View style={styles.suggestionHeader}>
//                                 <Icon name="comment" size={16} color="#6B7280" />
//                                 <Text style={styles.sectionTitle}>
//                                     Suggestions & Tips ({suggestions.length})
//                                 </Text>
//                             </View>

//                             {/* Existing Suggestions */}
//                             {suggestions.length > 0 ? (
//                                 suggestions.map((suggestion) => (
//                                     <View key={suggestion.suggestionId} style={styles.suggestionItem}>
//                                         <Image
//                                             source={{
//                                                 uri: suggestion.userAvatar || "https://via.placeholder.com/32",
//                                             }}
//                                             style={styles.avatar}
//                                         />
//                                         <View style={styles.suggestionContent}>
//                                             <View style={styles.suggestionMeta}>
//                                                 <Text style={styles.suggestionUser}>
//                                                     {suggestion.fullname}
//                                                 </Text>
//                                                 <Text style={styles.suggestionDate}>
//                                                     {new Date(suggestion.createdAt).toLocaleDateString()}
//                                                 </Text>
//                                             </View>
//                                             <Text style={styles.suggestionText}>{suggestion.reason}</Text>
//                                             {suggestion.applied && (
//                                                 <View style={styles.appliedBadge}>
//                                                     <Icon name="check" size={10} color="#065F46" />
//                                                     <Text style={styles.appliedText}>Applied</Text>
//                                                 </View>
//                                             )}
//                                         </View>
//                                     </View>
//                                 ))
//                             ) : (
//                                 <Text style={styles.emptyText}>
//                                     No suggestions yet. Be the first to share!
//                                 </Text>
//                             )}

//                             {/* Add Suggestion Input */}
//                             <View style={styles.inputContainer}>
//                                 <TextInput
//                                     style={styles.input}
//                                     placeholder="Share your suggestion..."
//                                     value={suggestionText}
//                                     onChangeText={setSuggestionText}
//                                     multiline
//                                     maxLength={500}
//                                 />
//                                 <TouchableOpacity
//                                     style={[
//                                         styles.sendBtn,
//                                         (!suggestionText.trim() || isSubmitting) && styles.disabledBtn,
//                                     ]}
//                                     onPress={handleSubmitSuggestion}
//                                     disabled={!suggestionText.trim() || isSubmitting}
//                                 >
//                                     {isSubmitting ? (
//                                         <ActivityIndicator size="small" color="#FFF" />
//                                     ) : (
//                                         <Icon name="send" size={18} color="#FFF" />
//                                     )}
//                                 </TouchableOpacity>
//                             </View>
//                         </View>
//                     </View>
//                 )}
//             </View>
//         </View>
//     );
// };

// const styles = createScaledSheet({
//     container: {
//         position: "relative",
//         marginBottom: 24,
//     },
//     timelineLine: {
//         position: "absolute",
//         left: 20,
//         top: 50,
//         bottom: -24,
//         width: 2,
//         zIndex: 0,
//     },
//     card: {
//         backgroundColor: "#FFF",
//         borderRadius: 12,
//         borderWidth: 2,
//         borderColor: "#F3F4F6",
//         overflow: "hidden",
//         zIndex: 1,
//     },
//     header: {
//         flexDirection: "row",
//         padding: 16,
//         alignItems: "flex-start",
//     },
//     statusIcon: {
//         width: 40,
//         height: 40,
//         borderRadius: 20,
//         borderWidth: 3,
//         justifyContent: "center",
//         alignItems: "center",
//         marginRight: 12,
//     },
//     headerContent: {
//         flex: 1,
//     },
//     titleRow: {
//         flexDirection: "row",
//         justifyContent: "space-between",
//         alignItems: "flex-start",
//         marginBottom: 4,
//     },
//     title: {
//         flex: 1,
//         fontSize: 16,
//         fontWeight: "bold",
//         color: "#1F2937",
//         marginRight: 8,
//     },
//     description: {
//         fontSize: 13,
//         color: "#6B7280",
//         lineHeight: 18,
//         marginBottom: 8,
//     },
//     metaRow: {
//         flexDirection: "row",
//         alignItems: "center",
//     },
//     metaItem: {
//         flexDirection: "row",
//         alignItems: "center",
//         gap: 4,
//     },
//     metaText: {
//         fontSize: 12,
//         color: "#6B7280",
//         fontWeight: "500",
//     },
//     dot: {
//         width: 3,
//         height: 3,
//         borderRadius: 1.5,
//         backgroundColor: "#D1D5DB",
//         marginHorizontal: 8,
//     },
//     expandedContent: {
//         borderTopWidth: 1,
//         borderTopColor: "#F3F4F6",
//         backgroundColor: "#F9FAFB",
//         padding: 16,
//     },
//     progressSection: {
//         backgroundColor: "#EFF6FF",
//         padding: 12,
//         borderRadius: 8,
//         marginBottom: 16,
//     },
//     progressHeader: {
//         flexDirection: "row",
//         justifyContent: "space-between",
//         marginBottom: 8,
//     },
//     progressLabel: {
//         fontSize: 13,
//         fontWeight: "600",
//         color: "#1E40AF",
//     },
//     progressPercent: {
//         fontSize: 13,
//         fontWeight: "bold",
//         color: "#3B82F6",
//     },
//     progressBar: {
//         height: 6,
//         backgroundColor: "#BFDBFE",
//         borderRadius: 3,
//         overflow: "hidden",
//     },
//     progressFill: {
//         height: "100%",
//         backgroundColor: "#3B82F6",
//     },
//     section: {
//         marginBottom: 16,
//     },
//     sectionTitle: {
//         fontSize: 14,
//         fontWeight: "600",
//         color: "#374151",
//         marginBottom: 8,
//     },
//     skillsGrid: {
//         flexDirection: "row",
//         flexWrap: "wrap",
//         gap: 8,
//     },
//     skillChip: {
//         backgroundColor: "#EEF2FF",
//         paddingHorizontal: 12,
//         paddingVertical: 6,
//         borderRadius: 16,
//     },
//     skillText: {
//         fontSize: 12,
//         color: "#3B82F6",
//         fontWeight: "500",
//     },
//     resourceItem: {
//         flexDirection: "row",
//         alignItems: "center",
//         backgroundColor: "#FFF",
//         padding: 12,
//         borderRadius: 8,
//         borderWidth: 1,
//         borderColor: "#E5E7EB",
//         marginBottom: 8,
//     },
//     resourceIcon: {
//         width: 36,
//         height: 36,
//         borderRadius: 18,
//         backgroundColor: "#EFF6FF",
//         justifyContent: "center",
//         alignItems: "center",
//         marginRight: 12,
//     },
//     resourceContent: {
//         flex: 1,
//     },
//     resourceTitle: {
//         fontSize: 14,
//         fontWeight: "600",
//         color: "#1F2937",
//         marginBottom: 2,
//     },
//     resourceDuration: {
//         fontSize: 12,
//         color: "#9CA3AF",
//     },
//     completeBtn: {
//         backgroundColor: "#3B82F6",
//         flexDirection: "row",
//         alignItems: "center",
//         justifyContent: "center",
//         padding: 12,
//         borderRadius: 8,
//         marginBottom: 16,
//         gap: 8,
//     },
//     completeBtnText: {
//         color: "#FFF",
//         fontWeight: "600",
//         fontSize: 14,
//     },
//     suggestionsSection: {
//         borderTopWidth: 1,
//         borderTopColor: "#E5E7EB",
//         paddingTop: 16,
//     },
//     suggestionHeader: {
//         flexDirection: "row",
//         alignItems: "center",
//         gap: 6,
//         marginBottom: 12,
//     },
//     suggestionItem: {
//         flexDirection: "row",
//         marginBottom: 12,
//         padding: 12,
//         backgroundColor: "#FFF",
//         borderRadius: 8,
//     },
//     avatar: {
//         width: 32,
//         height: 32,
//         borderRadius: 16,
//         marginRight: 10,
//     },
//     suggestionContent: {
//         flex: 1,
//     },
//     suggestionMeta: {
//         flexDirection: "row",
//         justifyContent: "space-between",
//         marginBottom: 4,
//     },
//     suggestionUser: {
//         fontSize: 13,
//         fontWeight: "600",
//         color: "#374151",
//     },
//     suggestionDate: {
//         fontSize: 11,
//         color: "#9CA3AF",
//     },
//     suggestionText: {
//         fontSize: 13,
//         color: "#4B5563",
//         lineHeight: 18,
//         marginBottom: 6,
//     },
//     appliedBadge: {
//         flexDirection: "row",
//         alignItems: "center",
//         alignSelf: "flex-start",
//         backgroundColor: "#D1FAE5",
//         paddingHorizontal: 8,
//         paddingVertical: 2,
//         borderRadius: 4,
//         gap: 4,
//     },
//     appliedText: {
//         fontSize: 10,
//         color: "#065F46",
//         fontWeight: "600",
//     },
//     emptyText: {
//         fontSize: 12,
//         color: "#9CA3AF",
//         fontStyle: "italic",
//         textAlign: "center",
//         paddingVertical: 16,
//     },
//     inputContainer: {
//         flexDirection: "row",
//         alignItems: "flex-end",
//         gap: 8,
//         marginTop: 8,
//     },
//     input: {
//         flex: 1,
//         backgroundColor: "#FFF",
//         borderWidth: 1,
//         borderColor: "#D1D5DB",
//         borderRadius: 20,
//         paddingHorizontal: 16,
//         paddingVertical: 10,
//         fontSize: 13,
//         maxHeight: 100,
//     },
//     sendBtn: {
//         width: 40,
//         height: 40,
//         borderRadius: 20,
//         backgroundColor: "#3B82F6",
//         justifyContent: "center",
//         alignItems: "center",
//     },
//     disabledBtn: {
//         backgroundColor: "#93C5FD",
//     },
// });

// export default MilestoneCard;