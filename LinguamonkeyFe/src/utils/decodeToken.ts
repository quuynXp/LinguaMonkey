import { jwtDecode } from "jwt-decode";
import { CommonActions } from "@react-navigation/native";

interface TokenPayload {
  sub: string;
  userId: string;
  exp: number;
  scope?: string; // "ROLE_ADMIN ROLE_TEACHER"
}

// --- Decode helpers ---
export const decodeToken = (token: string): TokenPayload | null => {
  try {
    return jwtDecode<TokenPayload>(token);
  } catch (error) {
    console.error("Invalid token:", error);
    return null;
  }

};
export const isTokenExpired = (token: string): boolean => {
  const decoded = decodeToken(token);
  if (!decoded) return true;
  return decoded.exp * 1000 < Date.now();
};

export const getRoleFromToken = (token: string): string[] => {
  try {
    const decoded = jwtDecode<any>(token);

    // BE trả scope: "ROLE_ADMIN ROLE_TEACHER"
    if (decoded.scope && typeof decoded.scope === "string") {
      return decoded.scope.split(" ").map((r: string) => r.trim());
    }

    return [];
  } catch (err) {
    console.error("Decode token error:", err);
    return [];
  }
};




// --- Role Guard helpers ---
export const hasRole = (token: string, role: string): boolean => {
  const roles = getRoleFromToken(token);
  return roles.includes(role);
};

export const requireRole = (token: string, roles: string[], navigation: any) => {
  const userRoles = getRoleFromToken(token);
  const matched = roles.some(r => userRoles.includes(r));

  if (!matched) {
    console.warn("Access denied. Redirecting to Home.");
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "Home" }],
      })
    );
  }
};
