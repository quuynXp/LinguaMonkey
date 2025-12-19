import instance from "../api/axiosClient";
import { DepositRevenueResponse, StudyHistoryResponse, TransactionStatsResponse, UserCountResponse } from "../types/dto";

const formatDateParam = (date?: Date): string | undefined => {
  if (date instanceof Date && !isNaN(date.getTime())) {
    return date.toISOString().split("T")[0];
  }
  return undefined;
};

interface DateRangeParams {
  period?: "day" | "week" | "month" | "year";
  startDate?: Date;
  endDate?: Date;
  aggregate?: "day" | "week" | "month" | "year";
}

export const getStudyHistory = async (
  userId: string,
  period: "day" | "week" | "month" | "year" = "week"
): Promise<StudyHistoryResponse> => {
  try {
    const res = await instance.get(
      `/api/v1/statistics/user/${userId}/study-history`,
      {
        params: { period }
      }
    );
    return res.data.result;
  } catch (error: any) {
    console.error("Error fetching study history:", error?.response?.data || error.message);
    throw error;
  }
};


export const getStatisticsOverview = async (
  params: DateRangeParams & { userId?: string } = {}
) => {
  const formattedParams: any = {
    userId: params.userId,
    period: params.period,
    aggregate: params.aggregate,
    startDate: formatDateParam(params.startDate),
    endDate: formatDateParam(params.endDate),
  };

  const filteredParams = Object.fromEntries(
    Object.entries(formattedParams).filter(([, v]) => v !== undefined)
  );

  try {
    const res = await instance.get<any>(`/api/v1/statistics/overview`, {
      params: filteredParams,
    });

    const result = res.data.result || {};

    return {
      users: result.totalUsers || 0,
      courses: result.totalCourses || 0,
      lessons: result.totalLessons || 0,
      revenue: result.totalRevenue ? Number(result.totalRevenue) : 0,
      transactions: result.totalTransactions || 0,
      raw: result,
    };
  } catch (error: any) {
    console.error(
      "Error fetching statistics overview:",
      error?.response?.data || error.message
    );
    return {
      users: 0,
      courses: 0,
      lessons: 0,
      revenue: 0,
      transactions: 0,
      raw: {}
    };
  }
};

export const getDashboardStatistics = async (
  userId: string,
  params: DateRangeParams = {}
) => {
  const formattedParams: any = {
    period: params.period,
    aggregate: params.aggregate,
    startDate: formatDateParam(params.startDate),
    endDate: formatDateParam(params.endDate),
  };

  const filteredParams = Object.fromEntries(
    Object.entries(formattedParams).filter(([, v]) => v !== undefined)
  );

  const res = await instance.get(`/api/v1/statistics/user/${userId}/dashboard`, {
    params: filteredParams,
  });
  return res.data.result;
};

export const getUserStatistics = async (
  userId: string,
  params: DateRangeParams = {}
) => {
  const formattedParams: any = {
    period: params.period,
    aggregate: params.aggregate,
    startDate: formatDateParam(params.startDate),
    endDate: formatDateParam(params.endDate),
  };

  const filteredParams = Object.fromEntries(
    Object.entries(formattedParams).filter(([, v]) => v !== undefined)
  );

  const res = await instance.get(`/api/v1/statistics/user/${userId}`, {
    params: filteredParams,
  });
  return res.data.result;
};

export const getUserCounts = async (
  params: { period: "day" | "month" | "year" } & Omit<DateRangeParams, 'aggregate'>
): Promise<UserCountResponse[]> => {
  const formattedParams: any = {
    period: params.period,
    startDate: formatDateParam(params.startDate),
    endDate: formatDateParam(params.endDate),
  };

  const filteredParams = Object.fromEntries(
    Object.entries(formattedParams).filter(([, v]) => v !== undefined)
  );

  const res = await instance.get(`/api/v1/statistics/users/count`, {
    params: filteredParams,
  });
  return res.data.result;
};

export const getUserGrowth = async (
  params: { period: "day" | "month" | "year" } & Omit<DateRangeParams, 'aggregate'>
) => {
  const formattedParams: any = {
    period: params.period,
    startDate: formatDateParam(params.startDate),
    endDate: formatDateParam(params.endDate),
  };

  const filteredParams = Object.fromEntries(
    Object.entries(formattedParams).filter(([, v]) => v !== undefined)
  );

  const res = await instance.get(`/api/v1/statistics/users/growth`, {
    params: filteredParams,
  });
  return res.data.result;
};

export const getActivityStatistics = async (
  params: DateRangeParams & { activityType?: string } = {}
) => {
  const formattedParams: any = {
    activityType: params.activityType,
    period: params.period,
    aggregate: params.aggregate,
    startDate: formatDateParam(params.startDate),
    endDate: formatDateParam(params.endDate),
  };

  const filteredParams = Object.fromEntries(
    Object.entries(formattedParams).filter(([, v]) => v !== undefined)
  );

  const res = await instance.get(`/api/v1/statistics/activities`, {
    params: filteredParams,
  });
  return res.data.result;
};

export const getTransactionStatistics = async (
  params: DateRangeParams & { status?: string; provider?: string } = {}
): Promise<TransactionStatsResponse[]> => {
  const formattedParams: any = {
    status: params.status,
    provider: params.provider,
    period: params.period,
    aggregate: params.aggregate,
    startDate: formatDateParam(params.startDate),
    endDate: formatDateParam(params.endDate),
  };

  const filteredParams = Object.fromEntries(
    Object.entries(formattedParams).filter(([, v]) => v !== undefined)
  );

  const res = await instance.get(`/api/v1/statistics/transactions`, {
    params: filteredParams,
  });
  return res.data.result;
};

export const getTeacherOverview = async (
  params: DateRangeParams & { teacherId?: string } = {}
) => {
  const formattedParams: any = {
    teacherId: params.teacherId,
    period: params.period,
    aggregate: params.aggregate,
    startDate: formatDateParam(params.startDate),
    endDate: formatDateParam(params.endDate),
  };

  const filteredParams = Object.fromEntries(
    Object.entries(formattedParams).filter(([, v]) => v !== undefined)
  );

  const res = await instance.get(`/api/v1/statistics/teacher/overview`, {
    params: filteredParams,
  });
  return res.data.result;
};

export const getTeacherCoursesPerformance = async (
  params: DateRangeParams & { teacherId?: string } = {}
) => {
  const formattedParams: any = {
    teacherId: params.teacherId,
    period: params.period,
    aggregate: params.aggregate,
    startDate: formatDateParam(params.startDate),
    endDate: formatDateParam(params.endDate),
  };

  const filteredParams = Object.fromEntries(
    Object.entries(formattedParams).filter(([, v]) => v !== undefined)
  );

  const res = await instance.get(
    `/api/v1/statistics/teacher/courses/performance`,
    { params: filteredParams }
  );
  return res.data.result;
};

export const getTeacherCourseLessonStats = async (
  courseId: string,
  params: Omit<DateRangeParams, 'period' | 'aggregate'> & { teacherId?: string } = {}
) => {
  const formattedParams: any = {
    teacherId: params.teacherId,
    startDate: formatDateParam(params.startDate),
    endDate: formatDateParam(params.endDate),
  };

  const filteredParams = Object.fromEntries(
    Object.entries(formattedParams).filter(([, v]) => v !== undefined)
  );

  const res = await instance.get(
    `/api/v1/statistics/teacher/courses/${courseId}/lessons`,
    { params: filteredParams }
  );
  return res.data.result;
};

export const getDepositRevenueStatistics = async (
  params: DateRangeParams = {}
): Promise<DepositRevenueResponse> => {
  const formattedParams: any = {
    period: params.period,
    aggregate: params.aggregate,
    startDate: formatDateParam(params.startDate),
    endDate: formatDateParam(params.endDate),
  };

  const filteredParams = Object.fromEntries(
    Object.entries(formattedParams).filter(([, v]) => v !== undefined)
  );

  const res = await instance.get(`/api/v1/statistics/deposit-revenue`, {
    params: filteredParams,
  });
  return res.data.result;
}

export const getTeacherCourseRevenue = async (
  courseId: string,
  params: Omit<DateRangeParams, 'period'> & { teacherId?: string } = {}
) => {
  const formattedParams: any = {
    teacherId: params.teacherId,
    aggregate: params.aggregate,
    startDate: formatDateParam(params.startDate),
    endDate: formatDateParam(params.endDate),
  };

  const filteredParams = Object.fromEntries(
    Object.entries(formattedParams).filter(([, v]) => v !== undefined)
  );

  const res = await instance.get(
    `/api/v1/statistics/teacher/courses/${courseId}/revenue`,
    { params: filteredParams }
  );
  return res.data.result;
};