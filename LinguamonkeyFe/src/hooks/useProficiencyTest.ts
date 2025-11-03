import { useState, useEffect, useRef } from "react";
import { Alert, Animated } from "react-native";
import instance from "../api/axiosInstance";
import { useUserStore } from "../stores/UserStore";
import { useTranslation } from "react-i18next";
import { LessonCategoryResponse, LessonResponse, LessonQuestionResponse, LessonProgressWrongItemRequest, UIQuestion } from "../types/api";

type BackendPage<T> = { content: T[]; totalElements?: number; totalPages?: number };
type BackendApiResponse<T> = { code: number; result?: T; data?: T; message?: string };

export const useProficiencyTest = () => {
  const { t } = useTranslation();
  const user = useUserStore((s) => s.user);
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [selectedLangIndex, setSelectedLangIndex] = useState(0);
  const [stage, setStage] = useState<"choose-language" | "testing" | "finished">("choose-language");

  const [questions, setQuestions] = useState<UIQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: number }>({});
  const [timeLeft, setTimeLeft] = useState(300);
  const [isCompleted, setIsCompleted] = useState(false);
  const [results, setResults] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const langs = (user?.languages ?? []).map((l: string) => String(l.toLowerCase()));
    setAvailableLanguages(langs.length ? langs : ["en"]);
  }, [user]);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    const progress = questions.length ? (currentQuestion + 1) / questions.length : 0;
    Animated.timing(progressAnim, { toValue: progress, duration: 200, useNativeDriver: false }).start();
  }, [currentQuestion, questions]);

  const startTest = async () => {
    const code = (availableLanguages[selectedLangIndex] || "EN").toLowerCase();
    setLoading(true);
    setStage("testing");
    setCurrentQuestion(0);
    setAnswers({});
    setIsCompleted(false);
    setResults(null);
    setTimeLeft(300);

    try {
      // 1) get category
      const catResp = await instance.get("/api/v1/lesson-categories", {
        params: { lessonCategoryName: "initial", languageCode: code, page: 0, size: 1 },
      });
      const catPayload = catResp.data as BackendApiResponse<BackendPage<LessonCategoryResponse>>;
      const categories = catPayload.result?.content ?? (catPayload.data as any)?.content ?? [];
      if (!categories?.length) throw new Error(t("proficiencyTest.errors.noInitialCategory"));

      const categoryId = categories[0].lessonCategoryId;

      // 2) get lesson
      const lessonResp = await instance.get("/api/v1/lessons", {
        params: { categoryId, languageCode: code, page: 0, size: 1 },
      });
      const lessonPayload = lessonResp.data as BackendApiResponse<BackendPage<LessonResponse>>;
      const lessons = lessonPayload.result?.content ?? (lessonPayload.data as any)?.content ?? [];
      if (!lessons?.length) throw new Error(t("proficiencyTest.errors.noLessonForInitial"));

      const lesson = lessons[0];

      // 3) get questions
      const qResp = await instance.get("/api/v1/lesson-questions", {
        params: { lessonId: lesson.lessonId, languageCode: code, page: 0, size: 500 },
      });
      const qPayload = qResp.data as BackendApiResponse<BackendPage<LessonQuestionResponse>>;
      const qList = qPayload.result?.content ?? (qPayload.data as any)?.content ?? [];
      if (!qList?.length) throw new Error(t("proficiencyTest.errors.noQuestions"));

      const uiQs: UIQuestion[] = qList.map((q) => {
        const opts = [q.optionA ?? "", q.optionB ?? "", q.optionC ?? "", q.optionD ?? ""];
        const correctLetter = (q.correctOption ?? "A").toUpperCase();
        const correctIndex = Math.max(0, ["A", "B", "C", "D"].indexOf(correctLetter));
        return {
          id: q.lessonQuestionId,
          lessonId: q.lessonId,
          question: q.question,
          options: opts,
          correctIndex,
        };
      });

      setQuestions(uiQs);
    } catch (err) {
      console.error("startTest error", err);
      Alert.alert(t("common.error"), t("proficiencyTest.errors.loadFailed"));
      setStage("choose-language");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (answerIndex: number) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion]: answerIndex }));

    setTimeout(() => {
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion((c) => c + 1);
      } else {
        completeTest();
      }
    }, 250);
  };

  const indexToLetter = (i: number) => String.fromCharCode(65 + i);

  const completeTest = async () => {
    if (isCompleted) return;
    setIsCompleted(true);

    let correctAnswers = 0;
    questions.forEach((q, idx) => {
      if (answers[idx] === q.correctIndex) correctAnswers++;
    });
    const percentage = questions.length ? Math.round((correctAnswers / questions.length) * 100) : 0;
    setResults({ totalQuestions: questions.length, correctAnswers, percentage });

    const userId = user?.userId;
    if (userId) {
      const wrongItems: LessonProgressWrongItemRequest[] = [];
      questions.forEach((q, idx) => {
        const selected = answers[idx];
        if (selected === undefined || selected !== q.correctIndex) {
          wrongItems.push({
            lessonId: q.lessonId,
            userId,
            lessonQuestionId: q.id,
            wrongAnswer: selected === undefined ? "?" : indexToLetter(selected),
            isDeleted: false,
          });
        }
      });
      try {
        await Promise.all(
          wrongItems.map((item) => instance.post("/api/v1/lesson-progress-wrong-items", item))
        );
      } catch (err) {
        console.error("Save wrong items error", err);
      }
    }
  };

  return {
    t,
    availableLanguages,
    selectedLangIndex,
    setSelectedLangIndex,
    stage,
    setStage,
    questions,
    currentQuestion,
    answers,
    handleAnswer,
    startTest,
    completeTest,
    fadeAnim,
    progressAnim,
    results,
    isCompleted,
    timeLeft,
    loading,
  };
};
