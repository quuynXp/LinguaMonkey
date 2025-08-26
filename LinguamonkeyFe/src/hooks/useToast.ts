"use client"

import { useCallback } from "react"
import { showToast as showToastComponent } from "../components/Toast"

interface ToastOptions {
  message: string
  type?: "success" | "error" | "info" | "warning"
  duration?: number
}

export const useToast = () => {
  const showToast = useCallback((options: ToastOptions) => {
    showToastComponent(options)
  }, [])

  return { showToast }
}
