import instance from "../api/axiosInstance";


export const getStatisticsOverview = async (params: {
  period?: "week" | "month" | "year";
  startDate?: Date;
  endDate?: Date;
  aggregate?: "day" | "week" | "month";
} = {}) => {
  try {
    const formattedParams: any = {};

    if (params.period) formattedParams.period = params.period;

    if (params.startDate instanceof Date) {
      formattedParams.startDate = params.startDate.toISOString().split("T")[0];
    }
    if (params.endDate instanceof Date) {
      formattedParams.endDate = params.endDate.toISOString().split("T")[0];
    }
    if (params.aggregate) formattedParams.aggregate = params.aggregate;

    console.log("Fetching statistics overview with params: ", formattedParams);
    const res = await instance.get(`/api/v1/statistics/overview`, { params: formattedParams });

    // adjust depending on your backend structure: here we expect res.data.result
    const result = res.data.result || res.data || {};

    return {
      users: result.totalUsers || 0,
      courses: result.totalCourses || 0,
      lessons: result.totalLessons || 0,
      revenue: result.totalRevenue ? Number(result.totalRevenue) : 0,
      transactions: result.totalTransactions || 0,
      raw: result, // keep raw so component can use result.timeSeries if present
    };
  } catch (error: any) {
    console.error("Error fetching statistics overview:", error?.response?.data || error.message);
    throw error;
  }
};


// Lấy user count theo kỳ
export const getUserCounts = async (period: "day" | "month" | "year") => {
  const res = await instance.get(`/api/v1/statistics/users/count`, { params: { period } });
  return res.data.result;
};

// Lấy user growth
export const getUserGrowth = async (period: "day" | "month" | "year") => {
  const res = await instance.get(`/api/v1/statistics/users/growth`, { params: { period } });
  return res.data.result;
};

// Lấy activity statistics
export const getActivities = async (
  params: { status?: string; provider?: string; startDate?: string; endDate?: string; aggregate?: "day" | "week" | "month" } = {}
) => {
  const res = await instance.get(`/api/v1/statistics/activities`, { params });
  return res.data.result;
};

// Lấy transaction statistics
export const getTransactions = async (
  params: { status?: string; provider?: string; startDate?: string; endDate?: string; aggregate?: "day" | "week" | "month" } = {}
) => {
  const res = await instance.get(`/api/v1/statistics/transactions`, { params });
  return res.data.result;
};

export const getUserStatistics = async (userId: string, params: {
  period?: "week" | "month" | "year",
  startDate?: Date,
  endDate?: Date,
  aggregate?: "day" | "week" | "month"
} = {}) => {
  const formattedParams: any = {};
  if (params.period) formattedParams.period = params.period;
  if (params.startDate instanceof Date) formattedParams.startDate = params.startDate.toISOString().split("T")[0];
  if (params.endDate instanceof Date) formattedParams.endDate = params.endDate.toISOString().split("T")[0];
  if (params.aggregate) formattedParams.aggregate = params.aggregate;

  const res = await instance.get(`/api/v1/statistics/user/${userId}`, { params: formattedParams });
  return res.data.result;
};