import instance from "../api/axiosClient";

// teacher overview
export const getTeacherOverview = async (params: {
  teacherId: string;
  startDate?: Date;
  endDate?: Date;
  aggregate?: "day" | "week" | "month";
  period?: "week" | "month" | "year";
}) => {
  const formatted: any = {};
  if (params.teacherId) formatted.teacherId = params.teacherId;
  if (params.startDate instanceof Date) formatted.startDate = params.startDate.toISOString().split("T")[0];
  if (params.endDate instanceof Date) formatted.endDate = params.endDate.toISOString().split("T")[0];
  if (params.aggregate) formatted.aggregate = params.aggregate;
  if (params.period) formatted.period = params.period;

  const res = await instance.get(`/api/v1/statistics/teacher/overview`, { params: formatted });
  return res.data.result;
};

// courses performance
export const getTeacherCoursesPerformance = async (params: {
  teacherId: string;
  startDate?: Date;
  endDate?: Date;
  aggregate?: "day" | "week" | "month";
  period?: "week" | "month" | "year";
}) => {
  const formatted: any = {};
  if (params.teacherId) formatted.teacherId = params.teacherId;
  if (params.startDate instanceof Date) formatted.startDate = params.startDate.toISOString().split("T")[0];
  if (params.endDate instanceof Date) formatted.endDate = params.endDate.toISOString().split("T")[0];
  if (params.aggregate) formatted.aggregate = params.aggregate;
  if (params.period) formatted.period = params.period;

  const res = await instance.get(`/api/v1/statistics/teacher/courses/performance`, { params: formatted });
  return res.data.result;
};

// lesson stats for a course
export const getTeacherCourseLessons = async (courseId: string, params: {
  teacherId?: string;
  startDate?: Date;
  endDate?: Date;
}) => {
  const formatted: any = {};
  if (params.teacherId) formatted.teacherId = params.teacherId;
  if (params.startDate instanceof Date) formatted.startDate = params.startDate.toISOString().split("T")[0];
  if (params.endDate instanceof Date) formatted.endDate = params.endDate.toISOString().split("T")[0];

  const res = await instance.get(`/api/v1/statistics/teacher/courses/${courseId}/lessons`, { params: formatted });
  return res.data.result;
};

// revenue timeseries for a course
export const getTeacherCourseRevenue = async (courseId: string, params: {
  teacherId?: string;
  startDate?: Date;
  endDate?: Date;
  aggregate?: "day" | "week" | "month";
}) => {
  const formatted: any = {};
  if (params.teacherId) formatted.teacherId = params.teacherId;
  if (params.startDate instanceof Date) formatted.startDate = params.startDate.toISOString().split("T")[0];
  if (params.endDate instanceof Date) formatted.endDate = params.endDate.toISOString().split("T")[0];
  if (params.aggregate) formatted.aggregate = params.aggregate;

  const res = await instance.get(`/api/v1/statistics/teacher/courses/${courseId}/revenue`, { params: formatted });
  return res.data.result;
};