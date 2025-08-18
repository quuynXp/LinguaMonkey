import { getErrorMessageFromCode } from "../types/errorCodes";

export function handleApiError(
  code: number,
  backendMessage?: string
): void {
  const message = getErrorMessageFromCode(code, backendMessage);

  alert(message);
}
