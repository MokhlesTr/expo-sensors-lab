import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  Platform,
  Animated,
} from "react-native";
import { Gyroscope } from "expo-sensors";
import { StatusBar } from "expo-status-bar";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../App";

type Props = NativeStackScreenProps<RootStackParamList, "Friction">;

const { width } = Dimensions.get("window");

const PHOTOS = [
  "https://images.unsplash.com/photo-1499678329028-101435549a4e?w=600&q=80",
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80",
  "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=600&q=80",
  "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&q=80",
  "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=600&q=80",
];

const CARD_W = width * 0.68;
const CARD_H = CARD_W * 1.25;

interface CardConfig {
  initRot: number;
  friction: number;
  scale: number;
  zIndex: number;
}

const CARDS: CardConfig[] = [
  { initRot: -18, friction: 2.5, scale: 0.8, zIndex: 1 },
  { initRot: -9, friction: 1.8, scale: 0.86, zIndex: 2 },
  { initRot: 2, friction: 1.1, scale: 0.92, zIndex: 3 },
  { initRot: 10, friction: 0.5, scale: 0.97, zIndex: 4 },
  { initRot: 0, friction: 0.0, scale: 1.0, zIndex: 5 },
];

export default function FrictionScreen({ navigation }: Props) {
  const gyroX = useRef(new Animated.Value(0)).current;
  const gyroY = useRef(new Animated.Value(0)).current;
  const accX = useRef(0);
  const accY = useRef(0);
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(entrance, {
      toValue: 1,
      friction: 6,
      tension: 50,
      useNativeDriver: true,
    }).start();

    Gyroscope.setUpdateInterval(16);

    const sub = Gyroscope.addListener(({ x, y }) => {
      accX.current = accX.current * 0.8 + y * 3.0;
      accY.current = accY.current * 0.8 + x * 3.0;
      gyroX.setValue(accX.current);
      gyroY.setValue(accY.current);
    });

    return () => {
      sub.remove();
      Gyroscope.setUpdateInterval(50);
    };
  }, []);

  const entranceTranslate = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [80, 0],
  });

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Friction Gallery</Text>
        <View style={{ width: 38 }} />
      </View>

      <Animated.View
        style={[
          styles.stackContainer,
          { opacity: entrance, transform: [{ translateY: entranceTranslate }] },
        ]}
      >
        {PHOTOS.map((uri, i) => {
          const cfg = CARDS[i];

          const translateX = gyroX.interpolate({
            inputRange: [-10, 10],
            outputRange: [-cfg.friction * 30, cfg.friction * 30],
            extrapolate: "clamp",
          });
          const translateY = gyroY.interpolate({
            inputRange: [-10, 10],
            outputRange: [-cfg.friction * 14, cfg.friction * 14],
            extrapolate: "clamp",
          });
          const rotateZ = gyroX.interpolate({
            inputRange: [-10, 10],
            outputRange: [
              `${cfg.initRot - cfg.friction * 5}deg`,
              `${cfg.initRot + cfg.friction * 5}deg`,
            ],
            extrapolate: "clamp",
          });

          const cardEntranceY = entrance.interpolate({
            inputRange: [0, 1],
            outputRange: [(CARDS.length - i) * 18, 0],
          });

          return (
            <Animated.View
              key={i}
              style={[
                styles.card,
                {
                  zIndex: cfg.zIndex,
                  opacity: entrance,
                  transform: [
                    { translateY: cardEntranceY },
                    { scale: cfg.scale },
                    { translateX },
                    { translateY },
                    { rotateZ },
                  ],
                },
              ]}
            >
              <Image
                source={{ uri }}
                style={styles.cardImage}
                resizeMode="cover"
              />

              {i === PHOTOS.length - 1 && (
                <View style={styles.frontLabel}>
                  <View style={styles.frictionBadge}>
                    <Text style={styles.frictionBadgeTxt}>
                      🌀 Tilt to fan cards
                    </Text>
                  </View>
                </View>
              )}
            </Animated.View>
          );
        })}
      </Animated.View>

      <View style={styles.bottomSection}>
        <Text style={styles.appName}>Imaze</Text>
        <Text style={styles.tagline}>
          Store, organize, and access your memories anywhere, anytime.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F5F7" },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 56 : 36,
    marginBottom: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#00000010",
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: { fontSize: 26, color: "#111", lineHeight: 30, marginTop: -2 },
  screenTitle: { fontSize: 17, fontWeight: "700", color: "#111" },

  stackContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    position: "absolute",
    width: CARD_W,
    height: CARD_H,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 10,
  },
  cardImage: { width: "100%", height: "100%" },

  frontLabel: {
    position: "absolute",
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  frictionBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    borderRadius: 50,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  frictionBadgeTxt: { color: "#fff", fontSize: 13, fontWeight: "700" },

  bottomSection: {
    paddingHorizontal: 28,
    paddingBottom: Platform.OS === "ios" ? 44 : 28,
  },
  appName: {
    fontSize: 30,
    fontWeight: "800",
    color: "#111",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  tagline: { fontSize: 14, color: "#666", lineHeight: 20, marginBottom: 18 },
});
