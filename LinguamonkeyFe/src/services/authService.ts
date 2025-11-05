import { useTokenStore } from '../stores/tokenStore';
import { useUserStore } from '../stores/UserStore';
import { decodeToken, getRoleFromToken } from '../utils/decodeToken';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resetToTab, resetToAuth, gotoTab } from "../utils/navigationRef";
import axios from 'axios';
import * as WebBrowser from 'expo-web-browser';
import { EXPO_PUBLIC_API_BASE_URL } from "react-native-dotenv"

WebBrowser.maybeCompleteAuthSession();

const API_BASE_URL = EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_API_BASE_URL;


export const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export const loginWithEmail = async (email: string, password: string) => {
  try {
    const res = await refreshClient.post('/api/v1/auth/login', { email, password });
    if (res.data.result.authenticated) {
      await handleLoginSuccess(res.data.result.token, res.data.result.refreshToken);
      return true;
    }
  } catch (error) {
    console.error('Email login error:', error);
    throw error;
  }
  return false;
};

export const handleGoogleLogin = async (idToken: string) => {
  try {
    const res = await refreshClient.post('/api/v1/auth/google-login', { idToken });
    await handleLoginSuccess(res.data.result.token, res.data.result.refreshToken);
    return true;
  } catch (error) {
    console.error('Google login error:', error);
    throw error;
  }
}

export const handleFacebookLogin = async (accessToken: string) => {
  try {
    const res = await refreshClient.post('/api/v1/auth/facebook-login', { accessToken });
    await handleLoginSuccess(res.data.result.token, res.data.result.refreshToken);
    return true;
  } catch (error) {
    console.error('Facebook login error:', error);
    throw error;
  }
}

export const logout = async () => {
  try {
    await refreshClient.post('/auth/logout');
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    await useTokenStore.getState().clearTokens();
    useUserStore.getState().setUser(null);
    useUserStore.getState().setAuthenticated(false);
    resetToAuth('Login'); // Hoặc 'AppLaunchScreen' tùy logic của bạn
  }
};

async function handleLoginSuccess(token: string, refreshToken: string) {
  try {
    if (!token || !refreshToken) {
      throw new Error('Invalid login response: missing token or refreshToken');
    }

    await useTokenStore.getState().setTokens(token, refreshToken);
    console.log('Login response:', { token: '...', refreshToken: '...' });
    refreshClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    const payload = decodeToken(token);
    if (!payload?.userId) {
      throw new Error('Invalid token payload: missing userId');
    }
    const { user, setUser } = useUserStore.getState();

    setUser({ ...user, userId: payload.userId });
    const userRes = await refreshClient.get(`/users/${payload.userId}`);
    const rawUser = userRes.data.result || {};
    const normalizedUser = {
      ...rawUser,
      userId: rawUser.userId ?? rawUser.user_id ?? rawUser.id,
      roles: getRoleFromToken(token),
    };

    useUserStore.getState().setUser(normalizedUser);
    useUserStore.getState().setAuthenticated(true);
    await AsyncStorage.setItem("hasLoggedIn", "true");

    console.log('User roles:', normalizedUser.roles);

    // KIỂM TRA LOGIC SETUP TRƯỚC KHI ĐIỀU HƯỚNG
    // (Giả sử bạn đã thêm cờ 'hasFinishedSetup' như chúng ta đã thảo luận)
    const hasFinishedSetup =
      (await AsyncStorage.getItem("hasFinishedSetup")) === "true";

    // Nếu user đã đăng nhập nhưng chưa setup, buộc họ vào SetupInitScreen
    if (!hasFinishedSetup && !normalizedUser.roles.includes('ROLE_ADMIN')) {
      console.log('Login success, but user has not finished setup. Navigating to SetupInitScreen.');
      gotoTab('SetupInitScreen'); // Đảm bảo bạn có 'SetupInitScreen' trong AuthStack hoặc MainStack
      return;
    }

    let targetRoute: 'Admin' | 'Teacher' | 'DailyWelcome' | 'Home' = 'Home';

    if (normalizedUser.roles.includes('ROLE_ADMIN')) {
      targetRoute = 'Admin';
    } else if (normalizedUser.roles.includes('ROLE_TEACHER')) {
      targetRoute = 'Teacher';
    } else {
      const currentDate = new Date().toLocaleDateString('en-CA');
      const lastAppOpenDate = await AsyncStorage.getItem('lastAppOpenDate');
      const isFirstOpenToday = lastAppOpenDate !== currentDate;
      if (isFirstOpenToday) {
        targetRoute = 'DailyWelcome';
        try {
          await AsyncStorage.setItem('lastAppOpenDate', currentDate);
        } catch (e) {
          console.warn('Failed to set lastAppOpenDate', e);
        }
      }
    }

    console.log('DEBUG navigate targetRoute:', targetRoute);
    resetToTab(targetRoute);
  } catch (e) {
    console.error('handleLoginSuccess error:', e);
    resetToAuth('Login');
  }
}

// --- OTP login (sẽ hoạt động sau khi sửa backend) ---
export const requestOtp = async (emailOrPhone: string) => {
  try {
    // Hàm này sẽ ném lỗi 'USER_NOT_FOUND' nếu bạn chưa sửa backend.
    // Sau khi sửa backend, nó sẽ luôn thành công.
    const res = await refreshClient.post('/auth/request-otp', { emailOrPhone });
    return res.data.result?.success || false;
  } catch (error: any) {
    console.error('Request OTP error:', error.response?.data || error.message);
    // Nếu backend ném lỗi, chúng ta ném lại để UI xử lý
    throw new Error(error.response?.data?.message || 'Failed to request OTP');
  }
};

export const verifyOtpLogin = async (emailOrPhone: string, otpCode: string) => {
  try {
    // Hàm này gọi '/auth/verify-otp', vốn đã hỗ trợ 'findOrCreateUserAccount'
    const res = await refreshClient.post('/auth/verify-otp', { emailOrPhone, code: otpCode });
    if (res.data.result?.token && res.data.result?.refreshToken) {
      await handleLoginSuccess(res.data.result.token, res.data.result.refreshToken);
      return true;
    }
  } catch (error) {
    console.error('OTP login error:', error);
  }
  return false;
};

// --- SỬA LOGIC ĐĂNG KÝ EMAIL ---
export const registerWithEmail = async (firstName: string, lastName: string, email: string, password: string) => {
  try {
    const fullname = `${firstName} ${lastName}`;

    // Bước 1: Gọi endpoint đăng ký (sử dụng /auth/register từ Controller)
    // Giả sử UserRequest trên backend chấp nhận { fullname, email, password }
    await refreshClient.post('/auth/register', {
      fullname,
      email: email.toLowerCase(),
      password
    });

    // Bước 2: Nếu đăng ký thành công, gọi hàm login để lấy token
    console.log('Registration successful, attempting login...');
    return await loginWithEmail(email, password);

  } catch (error: any) {
    console.error('Register with email error:', error.response?.data || error.message);
    // Ném lỗi để UI (RegisterScreen) có thể bắt và hiển thị
    throw new Error(error.response?.data?.message || 'Registration failed');
  }
};
// --- KẾT THÚC SỬA ---


// --- BẮT ĐẦU FLOW RESET PASSWORD MỚI ---

/**
 * Bước 1: Kiểm tra user (bằng email/SĐT) có những phương thức nào để reset.
 * @param identifier (email hoặc SĐT)
 * @returns {Promise<{ hasEmail: boolean; hasPhone: boolean; email?: string; phone?: string; }>}
 */
export const checkResetMethods = async (identifier: string) => {
  try {
    const res = await refreshClient.post('/auth/check-reset-methods', { identifier });
    return res.data.result as { hasEmail: boolean; hasPhone: boolean; email?: string; phone?: string; };
  } catch (error: any) {
    console.error('Check reset methods error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to check account');
  }
};

/**
 * Bước 2: Yêu cầu gửi OTP đến phương thức đã chọn (EMAIL hoặc PHONE).
 * @param identifier (email hoặc SĐT)
 * @param method ('EMAIL' hoặc 'PHONE')
 */
export const requestPasswordResetOtp = async (identifier: string, method: 'EMAIL' | 'PHONE') => {
  try {
    await refreshClient.post('/auth/request-password-reset-otp', { identifier, method });
    return true;
  } catch (error: any) {
    console.error('Request password reset OTP error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to send OTP');
  }
};

/**
 * Bước 3: Xác thực OTP và lấy về token an toàn (secure reset token).
 * @param identifier (email hoặc SĐT)
 * @param code (OTP 6 số)
 * @returns {Promise<string>} Trả về secureToken (ví dụ: "a-long-uuid-string")
 */
export const verifyPasswordResetOtp = async (identifier: string, code: string) => {
  try {
    const res = await refreshClient.post('/auth/verify-password-reset-otp', { identifier, code });
    if (!res.data.result?.resetToken) {
      throw new Error('Invalid response from server: missing resetToken');
    }
    return res.data.result.resetToken as string;
  } catch (error: any) {
    console.error('Verify password reset OTP error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Invalid or expired OTP');
  }
};

/**
 * Bước 4: (Hàm này giữ nguyên) Gửi token an toàn và mật khẩu mới lên.
 * Hàm này được gọi bởi ResetPasswordScreen.
 */
export const resetPassword = async (resetToken: string, newPassword: string) => {
  await refreshClient.post('/auth/reset-password', { token: resetToken, password: newPassword });
};

// --- KẾT THÚC FLOW RESET PASSWORD MỚI ---


export const refreshTokenApi = async (refreshToken: string, deviceId?: string, ip?: string, userAgent?: string) => {


  if (!refreshToken || !refreshToken.trim()) {
    console.error('[refreshTokenApi] called with EMPTY refreshToken -> throw and trace', { stack: new Error().stack });
    throw new Error('Missing refreshToken');
  }

  const masked = refreshToken.trim().substring(0, 10) + '...';
  console.log('[refreshTokenApi] called, maskedRefresh:', masked);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Refresh-Caller': 'client', // helpful to filter on server/logs
    };
    if (deviceId) headers['Device-Id'] = deviceId;
    if (ip) headers['X-Forwarded-For'] = ip;
    if (userAgent) headers['User-Agent'] = userAgent;

    const body = { refreshToken: refreshToken.trim() };

    console.log('[refreshTokenApi] sending request /auth/refresh-token', { headers, body: { refreshToken: '***' } });

    const res = await refreshClient.post('/auth/refresh-token', body, { headers });

    console.log('[refreshTokenApi] response', { status: res.status, dataSummary: res.data?.result ? 'has-result' : 'no-result' });

    if (!res.data?.result?.token || !res.data?.result?.refreshToken) {
      console.error('[refreshTokenApi] invalid refresh response format', res.data);
      throw new Error('Invalid refresh response format');
    }

    return { token: res.data.result.token, refreshToken: res.data.result.refreshToken };
  } catch (error: any) {
    console.error('[refreshTokenApi] error:', error.response?.data || error.message, { stack: error.stack });
    throw error;
  }
};


export const introspectToken = async (token: string) => {
  if (!token?.trim()) {
    console.warn('Introspect token error: empty token');
    return false;
  }

  try {
    const res = await refreshClient.post(
      '/auth/introspect',
      {},
      {
        headers: {
          Authorization: `Bearer ${token.trim()}`
        },
        withCredentials: true
      }
    );

    return !!res.data?.result?.valid;
  } catch (e: any) {
    console.warn('Introspect token error:', e.response?.data || e.message);
    return false;
  }
};