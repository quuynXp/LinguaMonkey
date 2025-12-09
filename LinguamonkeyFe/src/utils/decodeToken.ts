import { jwtDecode } from "jwt-decode";

export interface StandardJwtPayload {
  sub: string;
  scope?: string;
  exp: number;
  [key: string]: any;
}

export interface TokenPayload extends StandardJwtPayload {
  userId: string;
  scope: string;
}

export const decodeToken = (token: string | null): TokenPayload | null => {
  if (!token) return null;
  try {
    const decodedPayload = jwtDecode<StandardJwtPayload>(token);

    const scopeString = decodedPayload.scope || "";

    return {
      ...decodedPayload,
      userId: decodedPayload.sub,
      scope: scopeString,
    } as TokenPayload;
  } catch (error) {
    console.warn("Failed to decode token. Token might be invalid or expired.");
    return null;
  }
};

export const getRolesFromToken = (token: string | null): string[] => {
  const payload = decodeToken(token);
  if (!payload) {
    return [];
  }

  const rawScope = payload.scope;

  console.log("DEBUG: Raw Token Scope:", rawScope);

  return rawScope
    .trim()
    .split(/\s+/)
    .filter((role) => role.length > 0);
};

export const isAdmin = (token: string | null): boolean => {
  const roles = getRolesFromToken(token);
  const isAdministrator = roles.includes("ROLE_ADMIN");

  console.log("DEBUG: Extracted Roles:", roles);
  console.log("DEBUG: Is Admin:", isAdministrator);

  return isAdministrator;
};