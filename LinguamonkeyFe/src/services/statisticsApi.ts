// import instance from "../api/axiosClient";

// // Hàm tiện ích để chuyển Date object thành chuỗi yyyy-MM-dd
// const formatDateParam = (date?: Date): string | undefined => {
//   if (date instanceof Date && !isNaN(date.getTime())) {
//     return date.toISOString().split("T")[0];
//   }
//   // Trả về undefined nếu không hợp lệ, để axios không gửi param
//   return undefined;
// };

// // Định nghĩa kiểu chung cho các tham số thời gian
// interface DateRangeParams {
//   period?: "day" | "week" | "month" | "year";
//   startDate?: Date;
//   endDate?: Date;
//   aggregate?: "day" | "week" | "month" | "year"; // Controller hỗ trợ day/week/month/year cho aggregate
// }

// // ---------------------------------------------
// // 1. Endpoint: GET /api/v1/statistics/overview
// // ---------------------------------------------
// export const getStatisticsOverview = async (
//   params: DateRangeParams & { userId?: string } = {}
// ) => {
//   const formattedParams: any = {
//     userId: params.userId,
//     period: params.period,
//     aggregate: params.aggregate,
//     startDate: formatDateParam(params.startDate),
//     endDate: formatDateParam(params.endDate),
//   };

//   // Lọc bỏ các giá trị undefined để Axios không gửi chúng
//   const filteredParams = Object.fromEntries(
//     Object.entries(formattedParams).filter(([, v]) => v !== undefined)
//   );

//   try {
//     const res = await instance.get(`/api/v1/statistics/overview`, {
//       params: filteredParams,
//     });

//     const result = res.data.result || res.data || {};

//     return {
//       users: result.totalUsers || 0,
//       courses: result.totalCourses || 0,
//       lessons: result.totalLessons || 0,
//       revenue: result.totalRevenue ? Number(result.totalRevenue) : 0,
//       transactions: result.totalTransactions || 0,
//       raw: result,
//     };
//   } catch (error: any) {
//     console.error(
//       "Error fetching statistics overview:",
//       error?.response?.data || error.message
//     );
//     throw error;
//   }
// };

// // ---------------------------------------------
// // 2. Endpoint: GET /api/v1/statistics/user/{userId}/dashboard (NEW)
// // ---------------------------------------------
// export const getDashboardStatistics = async (
//   userId: string,
//   params: DateRangeParams = {}
// ) => {
//   const formattedParams: any = {
//     period: params.period,
//     aggregate: params.aggregate,
//     startDate: formatDateParam(params.startDate),
//     endDate: formatDateParam(params.endDate),
//   };

//   const filteredParams = Object.fromEntries(
//     Object.entries(formattedParams).filter(([, v]) => v !== undefined)
//   );

//   const res = await instance.get(`/api/v1/statistics/user/${userId}/dashboard`, {
//     params: filteredParams,
//   });
//   return res.data.result;
// };

// // ---------------------------------------------
// // 3. Endpoint: GET /api/v1/statistics/user/{userId}
// // ---------------------------------------------
// export const getUserStatistics = async (
//   userId: string,
//   params: DateRangeParams = {}
// ) => {
//   const formattedParams: any = {
//     period: params.period,
//     aggregate: params.aggregate,
//     startDate: formatDateParam(params.startDate),
//     endDate: formatDateParam(params.endDate),
//   };

//   const filteredParams = Object.fromEntries(
//     Object.entries(formattedParams).filter(([, v]) => v !== undefined)
//   );

//   const res = await instance.get(`/api/v1/statistics/user/${userId}`, {
//     params: filteredParams,
//   });
//   return res.data.result;
// };


// // ---------------------------------------------
// // 4. Endpoint: GET /api/v1/statistics/users/count (Cập nhật params)
// // ---------------------------------------------
// // Controller yêu cầu period, nhưng startDate/endDate là optional.
// export const getUserCounts = async (
//   params: { period: "day" | "month" | "year" } & Omit<DateRangeParams, 'aggregate'>
// ) => {
//   const formattedParams: any = {
//     period: params.period,
//     startDate: formatDateParam(params.startDate),
//     endDate: formatDateParam(params.endDate),
//   };

//   const filteredParams = Object.fromEntries(
//     Object.entries(formattedParams).filter(([, v]) => v !== undefined)
//   );

//   const res = await instance.get(`/api/v1/statistics/users/count`, {
//     params: filteredParams,
//   });
//   return res.data.result;
// };

// // ---------------------------------------------
// // 5. Endpoint: GET /api/v1/statistics/users/growth (Cập nhật params)
// // ---------------------------------------------
// export const getUserGrowth = async (
//   params: { period: "day" | "month" | "year" } & Omit<DateRangeParams, 'aggregate'>
// ) => {
//   const formattedParams: any = {
//     period: params.period,
//     startDate: formatDateParam(params.startDate),
//     endDate: formatDateParam(params.endDate),
//   };

//   const filteredParams = Object.fromEntries(
//     Object.entries(formattedParams).filter(([, v]) => v !== undefined)
//   );

//   const res = await instance.get(`/api/v1/statistics/users/growth`, {
//     params: filteredParams,
//   });
//   return res.data.result;
// };

// // ---------------------------------------------
// // 6. Endpoint: GET /api/v1/statistics/activities
// // ---------------------------------------------
// export const getActivityStatistics = async (
//   params: DateRangeParams & { activityType?: string } = {}
// ) => {
//   const formattedParams: any = {
//     activityType: params.activityType,
//     period: params.period,
//     aggregate: params.aggregate,
//     startDate: formatDateParam(params.startDate),
//     endDate: formatDateParam(params.endDate),
//   };

//   const filteredParams = Object.fromEntries(
//     Object.entries(formattedParams).filter(([, v]) => v !== undefined)
//   );

//   const res = await instance.get(`/api/v1/statistics/activities`, {
//     params: filteredParams,
//   });
//   return res.data.result;
// };

// // ---------------------------------------------
// // 7. Endpoint: GET /api/v1/statistics/transactions
// // ---------------------------------------------
// export const getTransactionStatistics = async (
//   params: DateRangeParams & { status?: string; provider?: string } = {}
// ) => {
//   const formattedParams: any = {
//     status: params.status,
//     provider: params.provider,
//     period: params.period,
//     aggregate: params.aggregate,
//     startDate: formatDateParam(params.startDate),
//     endDate: formatDateParam(params.endDate),
//   };

//   const filteredParams = Object.fromEntries(
//     Object.entries(formattedParams).filter(([, v]) => v !== undefined)
//   );

//   const res = await instance.get(`/api/v1/statistics/transactions`, {
//     params: filteredParams,
//   });
//   return res.data.result;
// };

// // ---------------------------------------------
// // 8. Endpoint: GET /api/v1/statistics/teacher/overview (NEW)
// // ---------------------------------------------
// export const getTeacherOverview = async (
//   params: DateRangeParams & { teacherId?: string } = {}
// ) => {
//   const formattedParams: any = {
//     teacherId: params.teacherId,
//     period: params.period,
//     aggregate: params.aggregate,
//     startDate: formatDateParam(params.startDate),
//     endDate: formatDateParam(params.endDate),
//   };

//   const filteredParams = Object.fromEntries(
//     Object.entries(formattedParams).filter(([, v]) => v !== undefined)
//   );

//   const res = await instance.get(`/api/v1/statistics/teacher/overview`, {
//     params: filteredParams,
//   });
//   return res.data.result;
// };


// // ---------------------------------------------
// // 9. Endpoint: GET /api/v1/statistics/teacher/courses/performance (NEW)
// // ---------------------------------------------
// export const getTeacherCoursesPerformance = async (
//   params: DateRangeParams & { teacherId?: string } = {}
// ) => {
//   const formattedParams: any = {
//     teacherId: params.teacherId,
//     period: params.period,
//     aggregate: params.aggregate,
//     startDate: formatDateParam(params.startDate),
//     endDate: formatDateParam(params.endDate),
//   };

//   const filteredParams = Object.fromEntries(
//     Object.entries(formattedParams).filter(([, v]) => v !== undefined)
//   );

//   const res = await instance.get(
//     `/api/v1/statistics/teacher/courses/performance`,
//     { params: filteredParams }
//   );
//   return res.data.result;
// };

// // ---------------------------------------------
// // 10. Endpoint: GET /api/v1/statistics/teacher/courses/{courseId}/lessons (NEW)
// // ---------------------------------------------
// export const getTeacherCourseLessonStats = async (
//   courseId: string,
//   params: Omit<DateRangeParams, 'period' | 'aggregate'> & { teacherId?: string } = {}
// ) => {
//   const formattedParams: any = {
//     teacherId: params.teacherId,
//     startDate: formatDateParam(params.startDate),
//     endDate: formatDateParam(params.endDate),
//   };

//   const filteredParams = Object.fromEntries(
//     Object.entries(formattedParams).filter(([, v]) => v !== undefined)
//   );

//   const res = await instance.get(
//     `/api/v1/statistics/teacher/courses/${courseId}/lessons`,
//     { params: filteredParams }
//   );
//   return res.data.result;
// };

// // ---------------------------------------------
// // 11. Endpoint: GET /api/v1/statistics/teacher/courses/{courseId}/revenue (NEW)
// // ---------------------------------------------
// export const getTeacherCourseRevenue = async (
//   courseId: string,
//   params: Omit<DateRangeParams, 'period'> & { teacherId?: string } = {}
// ) => {
//   const formattedParams: any = {
//     teacherId: params.teacherId,
//     aggregate: params.aggregate,
//     startDate: formatDateParam(params.startDate),
//     endDate: formatDateParam(params.endDate),
//   };

//   const filteredParams = Object.fromEntries(
//     Object.entries(formattedParams).filter(([, v]) => v !== undefined)
//   );

//   const res = await instance.get(
//     `/api/v1/statistics/teacher/courses/${courseId}/revenue`,
//     { params: filteredParams }
//   );
//   return res.data.result;
// };

import instance from "../api/axiosClient";

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
    const res = await instance.get(`/api/v1/statistics/overview`, {
      params: filteredParams,
    });

    const result = res.data.result || res.data || {};

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
    throw error;
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
) => {
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
) => {
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

  try {
    const res = await instance.get(`/api/v1/statistics/deposit-revenue`, {
      params: filteredParams,
    });
    return res.data.result;
  } catch (error: any) {
    console.error(
      "Error fetching deposit revenue statistics:",
      error?.response?.data || error.message
    );
    throw error;
  }
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