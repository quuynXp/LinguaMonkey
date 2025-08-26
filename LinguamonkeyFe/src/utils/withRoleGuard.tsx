import React, { ComponentType } from "react";
import { View, Text } from "react-native";
import { useTokenStore } from "../stores/tokenStore";
import { getRoleFromToken } from "../utils/decodeToken";
import { resetToTab } from "../utils/navigationRef";

// HOC: bọc màn hình cần guard role
function withRoleGuard<P>(
  WrappedComponent: ComponentType<P>,
  allowedRoles: string[]
) {
  const GuardedComponent: React.FC<P> = (props) => {
    const { accessToken } = useTokenStore();
    const roles = accessToken ? getRoleFromToken(accessToken) : [];

    // Kiểm tra nếu user có ít nhất 1 role nằm trong allowedRoles
    const hasPermission =
      Array.isArray(roles) &&
      roles.some((r) => allowedRoles.includes(r));

    if (!hasPermission) {
      resetToTab("Home"); // hoặc resetToTab("Auth")
      return (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text>Bạn không có quyền truy cập</Text>
        </View>
      );
    }

    return <WrappedComponent {...props} />;
  };

  return GuardedComponent;
}

export default withRoleGuard;
