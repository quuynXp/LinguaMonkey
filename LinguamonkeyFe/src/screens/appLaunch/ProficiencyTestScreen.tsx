import { View, Text, TouchableOpacity, ScrollView, Animated } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { createScaledSheet } from "../../utils/scaledStyles";
import { useProficiencyTest } from "../../hooks/useProficiencyTest";
import { formatDateTime } from "../../utils/timeHelper";

const ProficiencyTestScreen = () => {
  const {
    t, availableLanguages, selectedLangIndex, setSelectedLangIndex,
    stage, questions, currentQuestion, answers,
    handleAnswer, startTest, completeTest,
    fadeAnim, progressAnim, results, isCompleted,
    timeLeft, loading
  } = useProficiencyTest();

  // ví dụ UI rút gọn
  if (stage === "choose-language") {
    return (
      <View style={styles.container}>
        <Text>{t("proficiencyTest.selectLanguage")}</Text>
        {availableLanguages.map((lang, idx) => (
          <TouchableOpacity key={lang} onPress={() => setSelectedLangIndex(idx)}>
            <Text>{lang.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={startTest}>
          <Text>{t("proficiencyTest.startTest")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (stage === "testing") {
    return (
      <View style={styles.container}>
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text>
            {t("proficiencyTest.questionProgress", { current: currentQuestion + 1, total: questions.length })}
          </Text>
          <Text>{formatDateTime(timeLeft)}</Text>

          <ScrollView>
            <Text>{questions[currentQuestion]?.question}</Text>
            {questions[currentQuestion]?.options.map((opt, idx) => (
              <TouchableOpacity key={idx} onPress={() => handleAnswer(idx)}>
                <Text>{opt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity onPress={completeTest}>
            <Text>{t("proficiencyTest.completeTest")}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  if (isCompleted && results) {
    return (
      <View style={styles.container}>
        <Text>{t("proficiencyTest.results.title")}</Text>
        <Text>{results.percentage}%</Text>
      </View>
    );
  }

  return null;
};

const styles = createScaledSheet({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
});

export default ProficiencyTestScreen;
