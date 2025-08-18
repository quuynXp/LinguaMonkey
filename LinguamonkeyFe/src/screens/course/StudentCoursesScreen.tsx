// "use client"

// import { useState } from "react"
// import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native"
// import Icon from "react-native-vector-icons/MaterialIcons"

// const StudentCoursesScreen = ({ navigation }) => {
//   const [searchQuery, setSearchQuery] = useState("")
//   const [selectedCategory, setSelectedCategory] = useState("All")

//   const categories = ["All", "Business", "Conversation", "Grammar", "Vocabulary", "Pronunciation"]

//   const [purchasedCourses] = useState([
//     {
//       id: 1,
//       title: "Business English Mastery",
//       instructor: "Dr. Sarah Wilson",
//       rating: 4.8,
//       students: 12500,
//       progress: 65,
//       totalLessons: 20,
//       completedLessons: 13,
//       price: 99.99,
//       image: "/placeholder.svg?height=120&width=200",
//       category: "Business",
//       level: "Intermediate",
//       duration: "8 weeks",
//     },
//     {
//       id: 2,
//       title: "Conversational Spanish",
//       instructor: "Prof. Carlos Martinez",
//       rating: 4.9,
//       students: 8900,
//       progress: 40,
//       totalLessons: 15,
//       completedLessons: 6,
//       price: 79.99,
//       image: "/placeholder.svg?height=120&width=200",
//       category: "Conversation",
//       level: "Beginner",
//       duration: "6 weeks",
//     },
//   ])

//   const [suggestedCourses] = useState([
//     {
//       id: 3,
//       title: "Advanced Grammar Techniques",
//       instructor: "Dr. Emily Chen",
//       rating: 4.7,
//       students: 6700,
//       price: 89.99,
//       originalPrice: 129.99,
//       image: "/placeholder.svg?height=120&width=200",
//       category: "Grammar",
//       level: "Advanced",
//       duration: "10 weeks",
//       discount: 30,
//     },
//     {
//       id: 4,
//       title: "French Pronunciation Mastery",
//       instructor: "Marie Dubois",
//       rating: 4.6,
//       students: 4200,
//       price: 69.99,
//       originalPrice: 99.99,
//       image: "/placeholder.svg?height=120&width=200",
//       category: "Pronunciation",
//       level: "Intermediate",
//       duration: "4 weeks",
//       discount: 30,
//     },
//   ])

//   const [allCourses] = useState([
//     {
//       id: 5,
//       title: "Japanese for Beginners",
//       instructor: "Hiroshi Tanaka",
//       rating: 4.5,
//       students: 15600,
//       price: 119.99,
//       image: "/placeholder.svg?height=120&width=200",
//       category: "Conversation",
//       level: "Beginner",
//       duration: "12 weeks",
//     },
//     {
//       id: 6,
//       title: "Business German Essentials",
//       instructor: "Dr. Klaus Weber",
//       rating: 4.4,
//       students: 3400,
//       price: 94.99,
//       image: "/placeholder.svg?height=120&width=200",
//       category: "Business",
//       level: "Intermediate",
//       duration: "8 weeks",
//     },
//     {
//       id: 7,
//       title: "English Vocabulary Builder",
//       instructor: "Jennifer Smith",
//       rating: 4.7,
//       students: 9800,
//       price: 59.99,
//       image: "/placeholder.svg?height=120&width=200",
//       category: "Vocabulary",
//       level: "All Levels",
//       duration: "6 weeks",
//     },
//     {
//       id: 8,
//       title: "Italian Conversation Practice",
//       instructor: "Marco Rossi",
//       rating: 4.6,
//       students: 5600,
//       price: 84.99,
//       image: "/placeholder.svg?height=120&width=200",
//       category: "Conversation",
//       level: "Intermediate",
//       duration: "7 weeks",
//     },
//   ])

//   const handleCoursePress = (course, isPurchased = false) => {
//     navigation.navigate("CourseDetails", { course, isPurchased })
//   }

//   const renderCourseCard = (course, isPurchased = false, isRecommended = false) => (
//     <TouchableOpacity
//       key={course.id}
//       style={[styles.courseCard, isPurchased && styles.purchasedCourseCard]}
//       onPress={() => handleCoursePress(course, isPurchased)}
//     >
//       <Image source={{ uri: course.image }} style={styles.courseImage} />

//       {isPurchased && (
//         <View style={styles.purchasedBadge}>
//           <Icon name="check-circle" size={16} color="#FFFFFF" />
//           <Text style={styles.purchasedText}>Purchased</Text>
//         </View>
//       )}

//       {isRecommended && course.discount && (
//         <View style={styles.discountBadge}>
//           <Text style={styles.discountText}>{course.discount}% OFF</Text>
//         </View>
//       )}

//       <View style={styles.courseContent}>
//         <Text style={styles.courseTitle}>{course.title}</Text>
//         <Text style={styles.courseInstructor}>by {course.instructor}</Text>

//         <View style={styles.courseStats}>
//           <View style={styles.ratingContainer}>
//             <Icon name="star" size={14} color="#F59E0B" />
//             <Text style={styles.ratingText}>{course.rating}</Text>
//             <Text style={styles.studentsText}>({course.students.toLocaleString()})</Text>
//           </View>
//           <View style={styles.courseMeta}>
//             <Text style={styles.levelText}>{course.level}</Text>
//             <Text style={styles.durationText}>{course.duration}</Text>
//           </View>
//         </View>

//         {isPurchased ? (
//           <View style={styles.progressSection}>
//             <View style={styles.progressInfo}>
//               <Text style={styles.progressText}>Progress: {course.progress}%</Text>
//               <Text style={styles.lessonsText}>
//                 {course.completedLessons}/{course.totalLessons} lessons
//               </Text>
//             </View>
//             <View style={styles.progressBar}>
//               <View style={[styles.progressFill, { width: `${course.progress}%` }]} />
//             </View>
//             <TouchableOpacity style={styles.continueButton}>
//               <Text style={styles.continueButtonText}>Continue Learning</Text>
//             </TouchableOpacity>
//           </View>
//         ) : (
//           <View style={styles.priceSection}>
//             {course.originalPrice && <Text style={styles.originalPrice}>${course.originalPrice}</Text>}
//             <Text style={styles.price}>${course.price}</Text>
//             <TouchableOpacity style={styles.enrollButton}>
//               <Text style={styles.enrollButtonText}>Enroll Now</Text>
//             </TouchableOpacity>
//           </View>
//         )}
//       </View>
//     </TouchableOpacity>
//   )

//   return (
//     <View style={styles.container}>
//       {/* Header */}
//       <View style={styles.header}>
//         <TouchableOpacity onPress={() => navigation.goBack()}>
//           <Icon name="arrow-back" size={24} color="#1F2937" />
//         </TouchableOpacity>
//         <Text style={styles.headerTitle}>My Courses</Text>
//         <TouchableOpacity>
//           <Icon name="filter-list" size={24} color="#1F2937" />
//         </TouchableOpacity>
//       </View>

//       {/* Search Bar */}
//       <View style={styles.searchContainer}>
//         <Icon name="search" size={20} color="#6B7280" />
//         <TextInput
//           style={styles.searchInput}
//           placeholder="Search courses..."
//           value={searchQuery}
//           onChangeText={setSearchQuery}
//         />
//       </View>

//       {/* Category Filter */}
//       <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryContainer}>
//         {categories.map((category) => (
//           <TouchableOpacity
//             key={category}
//             style={[styles.categoryChip, selectedCategory === category && styles.selectedCategoryChip]}
//             onPress={() => setSelectedCategory(category)}
//           >
//             <Text style={[styles.categoryText, selectedCategory === category && styles.selectedCategoryText]}>
//               {category}
//             </Text>
//           </TouchableOpacity>
//         ))}
//       </ScrollView>

//       <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
//         {/* Purchased Courses */}
//         {purchasedCourses.length > 0 && (
//           <View style={styles.section}>
//             <Text style={styles.sectionTitle}>📚 My Purchased Courses</Text>
//             {purchasedCourses.map((course) => renderCourseCard(course, true))}
//           </View>
//         )}

//         {/* Suggested Courses */}
//         <View style={styles.section}>
//           <Text style={styles.sectionTitle}>💡 Recommended for You</Text>
//           {suggestedCourses.map((course) => renderCourseCard(course, false, true))}
//         </View>

//         {/* All Courses */}
//         <View style={styles.section}>
//           <Text style={styles.sectionTitle}>🌟 All Courses</Text>
//           {allCourses.map((course) => renderCourseCard(course))}
//         </View>
//       </ScrollView>
//     </View>
//   )
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#F8FAFC",
//   },
//   header: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     paddingHorizontal: 24,
//     paddingTop: 60,
//     paddingBottom: 20,
//     backgroundColor: "#FFFFFF",
//     borderBottomWidth: 1,
//     borderBottomColor: "#E5E7EB",
//   },
//   headerTitle: {
//     fontSize: 20,
//     fontWeight: "bold",
//     color: "#1F2937",
//   },
//   searchContainer: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#FFFFFF",
//     marginHorizontal: 24,
//     marginVertical: 16,
//     paddingHorizontal: 16,
//     paddingVertical: 12,
//     borderRadius: 12,
//     borderWidth: 1,
//     borderColor: "#E5E7EB",
//   },
//   searchInput: {
//     flex: 1,
//     marginLeft: 12,
//     fontSize: 16,
//     color: "#1F2937",
//   },
//   categoryContainer: {
//     paddingHorizontal: 24,
//     marginBottom: 16,
//   },
//   categoryChip: {
//     backgroundColor: "#FFFFFF",
//     paddingHorizontal: 16,
//     paddingVertical: 8,
//     borderRadius: 20,
//     marginRight: 12,
//     borderWidth: 1,
//     borderColor: "#E5E7EB",
//   },
//   selectedCategoryChip: {
//     backgroundColor: "#4F46E5",
//     borderColor: "#4F46E5",
//   },
//   categoryText: {
//     fontSize: 14,
//     color: "#6B7280",
//     fontWeight: "500",
//   },
//   selectedCategoryText: {
//     color: "#FFFFFF",
//   },
//   content: {
//     flex: 1,
//   },
//   section: {
//     marginBottom: 32,
//   },
//   sectionTitle: {
//     fontSize: 18,
//     fontWeight: "bold",
//     color: "#1F2937",
//     marginBottom: 16,
//     paddingHorizontal: 24,
//   },
//   courseCard: {
//     backgroundColor: "#FFFFFF",
//     borderRadius: 16,
//     marginHorizontal: 24,
//     marginBottom: 16,
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 8,
//     elevation: 4,
//     overflow: "hidden",
//   },
//   purchasedCourseCard: {
//     borderWidth: 2,
//     borderColor: "#10B981",
//   },
//   courseImage: {
//     width: "100%",
//     height: 120,
//     backgroundColor: "#F3F4F6",
//   },
//   purchasedBadge: {
//     position: "absolute",
//     top: 12,
//     right: 12,
//     backgroundColor: "#10B981",
//     flexDirection: "row",
//     alignItems: "center",
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 12,
//   },
//   purchasedText: {
//     fontSize: 12,
//     color: "#FFFFFF",
//     fontWeight: "600",
//     marginLeft: 4,
//   },
//   discountBadge: {
//     position: "absolute",
//     top: 12,
//     left: 12,
//     backgroundColor: "#EF4444",
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 12,
//   },
//   discountText: {
//     fontSize: 12,
//     color: "#FFFFFF",
//     fontWeight: "bold",
//   },
//   courseContent: {
//     padding: 16,
//   },
//   courseTitle: {
//     fontSize: 16,
//     fontWeight: "bold",
//     color: "#1F2937",
//     marginBottom: 4,
//   },
//   courseInstructor: {
//     fontSize: 14,
//     color: "#6B7280",
//     marginBottom: 12,
//   },
//   courseStats: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginBottom: 16,
//   },
//   ratingContainer: {
//     flexDirection: "row",
//     alignItems: "center",
//   },
//   ratingText: {
//     fontSize: 14,
//     fontWeight: "600",
//     color: "#1F2937",
//     marginLeft: 4,
//   },
//   studentsText: {
//     fontSize: 12,
//     color: "#6B7280",
//     marginLeft: 4,
//   },
//   courseMeta: {
//     alignItems: "flex-end",
//   },
//   levelText: {
//     fontSize: 12,
//     color: "#4F46E5",
//     fontWeight: "600",
//   },
//   durationText: {
//     fontSize: 12,
//     color: "#6B7280",
//   },
//   progressSection: {
//     marginTop: 8,
//   },
//   progressInfo: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     marginBottom: 8,
//   },
//   progressText: {
//     fontSize: 14,
//     fontWeight: "600",
//     color: "#1F2937",
//   },
//   lessonsText: {
//     fontSize: 12,
//     color: "#6B7280",
//   },
//   progressBar: {
//     height: 6,
//     backgroundColor: "#F3F4F6",
//     borderRadius: 3,
//     overflow: "hidden",
//     marginBottom: 12,
//   },
//   progressFill: {
//     height: "100%",
//     backgroundColor: "#10B981",
//     borderRadius: 3,
//   },
//   continueButton: {
//     backgroundColor: "#10B981",
//     paddingVertical: 12,
//     borderRadius: 8,
//     alignItems: "center",
//   },
//   continueButtonText: {
//     fontSize: 14,
//     fontWeight: "600",
//     color: "#FFFFFF",
//   },
//   priceSection: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//   },
//   originalPrice: {
//     fontSize: 14,
//     color: "#6B7280",
//     textDecorationLine: "line-through",
//   },
//   price: {
//     fontSize: 18,
//     fontWeight: "bold",
//     color: "#1F2937",
//   },
//   enrollButton: {
//     backgroundColor: "#4F46E5",
//     paddingHorizontal: 16,
//     paddingVertical: 8,
//     borderRadius: 8,
//   },
//   enrollButtonText: {
//     fontSize: 14,
//     fontWeight: "600",
//     color: "#FFFFFF",
//   },
// })

// export default StudentCoursesScreen
