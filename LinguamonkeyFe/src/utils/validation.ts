import * as Yup from "yup"

// User validation schemas
export const userProfileSchema = Yup.object().shape({
  fullname: Yup.string().min(2, "Name must be at least 2 characters").max(255, "Name is too long"),
  nickname: Yup.string().max(50, "Nickname is too long"),
  phone: Yup.string().matches(/^\+?[1-9]\d{1,14}$/, "Invalid phone number"),
  country: Yup.string().max(50, "Country name is too long"),
})

// Memorization validation schemas
export const memorizationSchema = Yup.object().shape({
  content_type: Yup.string().required("Content type is required"),
  note_text: Yup.string().min(1, "Note text is required").max(1000, "Note text is too long"),
  is_favorite: Yup.boolean(),
})

// Reminder validation schemas
export const reminderSchema = Yup.object().shape({
  target_type: Yup.string().required("Target type is required"),
  title: Yup.string().max(255, "Title is too long"),
  message: Yup.string().max(1000, "Message is too long"),
  reminder_time: Yup.string().required("Reminder time is required"),
  repeat_type: Yup.string().oneOf(["none", "daily", "weekly", "monthly"], "Invalid repeat type"),
  enabled: Yup.boolean(),
})

// Lesson validation schemas
export const lessonAnswerSchema = Yup.object().shape({
  lesson_id: Yup.string().uuid("Invalid lesson ID").required("Lesson ID is required"),
  answers: Yup.object().required("Answers are required"),
})

// Generic validation function
export const validateData = async <T>(schema: Yup.Schema<T>, data: any): Promise<T> => {
  try {
    return await schema.validate(data, { abortEarly: false })
  } catch (error) {
    if (error instanceof Yup.ValidationError) {
      const validationErrors: Record<string, string> = {}
      error.inner.forEach((err) => {
        if (err.path) {
          validationErrors[err.path] = err.message
        }
      })
      throw new Error(JSON.stringify(validationErrors))
    }
    throw error
  }
}
