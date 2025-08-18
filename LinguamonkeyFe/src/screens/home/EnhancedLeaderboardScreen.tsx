import axiosInstance from "../../api/axiosInstance";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  FlatList,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from 'react-native-vector-icons/MaterialIcons';
const fetcher = (url: string) => axiosInstance.get(url).then((res) => res.data);

import { StackNavigationProp } from "@react-navigation/stack";

type EnhancedLeaderboardScreenProps = {
  navigation: StackNavigationProp<any>;
};

const EnhancedLeaderboardScreen = ({ navigation }: EnhancedLeaderboardScreenProps) => {
  const { t } = useTranslation();
  const [selectedTab, setSelectedTab] = useState("top100");
  const [selectedPeriod, setSelectedPeriod] = useState("all");

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  // Top 3
  const { data: top3Data } = useSWRInfinite(
    () => `/leaderboards/top3?tab=${selectedTab}&period=${selectedPeriod}`,
    fetcher
  );
  const topThree = top3Data?.[0]?.result || [];

  // Leaderboard pages
  const {
    data: leaderboardPages,
    size,
    setSize,
    isValidating,
  } = useSWRInfinite(
    (index) =>
      `/leaderboards?page=${index}&size=20&tab=${selectedTab}&period=${selectedPeriod}`,
    fetcher
  );

  const leaderboardData = leaderboardPages
    ? leaderboardPages.flatMap((page) => page.result?.content || [])
    : [];

  const loadMore = () => {
    if (!isValidating) {
      setSize(size + 1);
    }
  };

  const tabs = [
    { id: "top100", title: t("leaderboard.tabs.top100"), icon: "leaderboard" },
    { id: "week", title: t("leaderboard.tabs.thisWeek"), icon: "date-range" },
    { id: "events", title: t("leaderboard.tabs.events"), icon: "event" },
    { id: "seasons", title: t("leaderboard.tabs.seasons"), icon: "ac-unit" },
    { id: "friends", title: t("leaderboard.tabs.friends"), icon: "people" },
    { id: "couples", title: t("leaderboard.tabs.couples"), icon: "favorite" },
  ];

  const periods = [
    { id: "all", title: t("leaderboard.periods.allTime") },
    { id: "month", title: t("leaderboard.periods.thisMonth") },
    { id: "week", title: t("leaderboard.periods.thisWeek") },
    { id: "today", title: t("leaderboard.periods.today") },
  ];

  const renderTopThree = () => {
    if (topThree.length < 3) return null;

    return (
      <View className="flex-row justify-center items-end mt-4">
        {[1, 0, 2].map((pos) => {
          const player = topThree[pos];
          if (!player) return null;

          const placeColors = [
            "bg-yellow-400",
            "bg-gray-300",
            "bg-orange-500",
          ];

          return (
            <TouchableOpacity
              key={pos}
              className={`mx-2 items-center ${pos === 0 ? "scale-110" : ""}`}
            >
              {pos === 0 && (
                <Icon name="star" size={32} color="#FFD700" />
              )}
              <View
                className={`w-8 h-8 rounded-full items-center justify-center ${placeColors[pos]}`}
              >
                <Text className="text-white font-bold">{pos + 1}</Text>
              </View>
              <Image
                source={{ uri: player.avatarUrl }}
                className="w-16 h-16 rounded-full mt-2"
              />
              <Text className="mt-1 font-semibold">
                {player.name?.split(" ")[0] || ""}
              </Text>
              <Text className="text-gray-500">
                {player.score?.toLocaleString() || 0}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  type LeaderboardItem = {
    userId: string | number;
    avatarUrl: string;
    name: string;
    country?: string;
    level?: number;
    streak?: number;
    score?: number;
    change?: number;
  };
  
  const renderLeaderboardItem = ({
    item,
    index,
  }: {
    item: LeaderboardItem;
    index: number;
  }) => (
    <View className="flex-row items-center p-3 border-b border-gray-200">
      <View className="flex-row items-center w-12">
        <Text className="text-base font-bold">{index + 4}</Text>
        {item.change !== 0 && (
          <Icon
            name={item.change > 0 ? "trending-up" : "trending-down"}
            size={12}
            color={(item.change ?? 0) > 0 ? "#10B981" : "#EF4444"}
          />
        )}
      </View>
      <Image
        source={{ uri: item.avatarUrl }}
        className="w-8 h-8 rounded-full mr-3"
      />
      <View className="flex-1">
        <View className="flex-row items-center">
          <Text className="font-semibold">{item.name}</Text>
          <Text className="ml-2 text-gray-500">{item.country}</Text>
        </View>
        <Text className="text-gray-500 text-sm">
          {t("leaderboard.level")} {item.level} • {item.streak}{" "}
          {t("leaderboard.streak")}
        </Text>
      </View>
      <View className="items-end">
        <Text className="font-semibold">
          {item.score?.toLocaleString() || 0}
        </Text>
        <Text className="text-xs text-gray-400">XP</Text>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-white">
      <Animated.View style={{ opacity: fadeAnim }} className="flex-1">
        {/* Header */}
        <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-lg font-bold">{t("leaderboard.title")}</Text>
          <TouchableOpacity>
            <Icon name="more-vert" size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="px-3 py-2"
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              className={`flex-row items-center px-3 py-1 rounded-full mr-2 ${
                selectedTab === tab.id ? "bg-blue-500" : "bg-gray-100"
              }`}
              onPress={() => setSelectedTab(tab.id)}
            >
              <Icon
                name={tab.icon}
                size={20}
                color={selectedTab === tab.id ? "#FFFFFF" : "#6B7280"}
              />
              <Text
                className={`ml-1 ${
                  selectedTab === tab.id
                    ? "text-white font-semibold"
                    : "text-gray-500"
                }`}
              >
                {tab.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Periods */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="px-3 py-2"
        >
          {periods.map((period) => (
            <TouchableOpacity
              key={period.id}
              className={`px-3 py-1 rounded-full mr-2 ${
                selectedPeriod === period.id ? "bg-blue-500" : "bg-gray-100"
              }`}
              onPress={() => setSelectedPeriod(period.id)}
            >
              <Text
                className={
                  selectedPeriod === period.id
                    ? "text-white font-semibold"
                    : "text-gray-500"
                }
              >
                {period.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Top 3 */}
        {renderTopThree()}

        {/* List */}
        <FlatList
          data={leaderboardData}
          renderItem={renderLeaderboardItem}
          keyExtractor={(item) => String(item.userId)}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
        />
      </Animated.View>
    </View>
  );
};

export default EnhancedLeaderboardScreen;
