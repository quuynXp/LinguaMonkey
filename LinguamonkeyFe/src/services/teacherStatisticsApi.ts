import axios from "axios";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080/api/teacher/statistics";

// Lấy overview cho teacher (courses, lessons, students, revenue)
export const getTeacherStatisticsOverview = async (
  period: "week" | "month" | "year"
) => {
  try {
    const [coursesRes, lessonsRes, studentsRes, revenueRes] = await Promise.all([
      axios.get(`${API_URL}/courses/count`, { params: { period } }),
      axios.get(`${API_URL}/lessons/count`, { params: { period } }),
      axios.get(`${API_URL}/students/count`, { params: { period } }),
      axios.get(`${API_URL}/revenue`, { params: { period } }),
    ]);

    return {
      courses: coursesRes.data.result || 0,
      lessons: lessonsRes.data.result || 0,
      students: studentsRes.data.result || 0,
      revenue: revenueRes.data.result || 0,
    };
  } catch (error: any) {
    console.error("Error fetching teacher statistics:", error?.response?.data || error.message);
    throw error;
  }
};

// Chi tiết revenue theo thời gian
export const getTeacherRevenue = async (
  params: { period: "week" | "month" | "year"; startDate?: string; endDate?: string }
) => {
  const res = await axios.get(`${API_URL}/revenue`, { params });
  return res.data.result;
};

// Lấy activity log cho teacher
export const getTeacherActivities = async (
  params: { activityType?: string; startDate?: string; endDate?: string } = {}
) => {
  const res = await axios.get(`${API_URL}/activities`, { params });
  return res.data.result;
};

// Performance từng course
export const getTeacherCoursePerformance = async (courseId: number, period: "week" | "month" | "year") => {
  const res = await axios.get(`${API_URL}/courses/${courseId}/performance`, {
    params: { period },
  });
  return res.data.result;
};
