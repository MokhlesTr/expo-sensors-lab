import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, Animated,
  Dimensions, Platform, TouchableOpacity, ScrollView,
} from 'react-native';
import { Gyroscope } from 'expo-sensors';

const { width } = Dimensions.get('window');
const RING_SIZE = width * 0.52;

// Friction multiplier per ring: outer appears "far" → moves most
const FRICTION = { outer: 1.8, mid: 1.0, inner: 0.4, dot: 0.1 };

export default function GyroscopeScreen({ navigation }) {
  const [data, setData]     = useState({ x: 0, y: 0, z: 0 });
  const [active, setActive] = useState(false);

  // Position offset for each ring (friction parallax) — translateX / translateY
  const outerX = useRef(new Animated.Value(0)).current;
  const outerY = useRef(new Animated.Value(0)).current;
  const midX   = useRef(new Animated.Value(0)).current;
  const midY   = useRef(new Animated.Value(0)).current;
  const innerX = useRef(new Animated.Value(0)).current;
  const innerY = useRef(new Animated.Value(0)).current;
  const dotX   = useRef(new Animated.Value(0)).current;
  const dotY   = useRef(new Animated.Value(0)).current;

  // Rotation — all rotateZ (native driver compatible)
  const rotAngle = useRef(new Animated.Value(0)).current;

  // Pulse for center dot
  const pulse    = useRef(new Animated.Value(0.5)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  // Gyro accumulator with decay (prevents drift)
  const accX = useRef(0);
  const accY = useRef(0);
  const accZ = useRef(0);
  const frame = useRef(0);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1,   duration: 1300, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 1300, useNativeDriver: true }),
      ])
    ).start();

    Gyroscope.setUpdateInterval(50);

    const sub = Gyroscope.addListener((g) => {
      // Accumulate with decay — returns to center when phone is still
      accX.current = accX.current * 0.80 + g.y * 2.8;  // left/right tilt
      accY.current = accY.current * 0.80 + g.x * 2.8;  // forward/back tilt
      accZ.current = accZ.current * 0.80 + g.z * 40;   // spin → rotation

      const ax = accX.current;
      const ay = accY.current;

      // Each ring shifts by its own friction factor — outer moves most
      outerX.setValue(ax * FRICTION.outer);
      outerY.setValue(ay * FRICTION.outer);
      midX.setValue(ax * FRICTION.mid);
      midY.setValue(ay * FRICTION.mid);
      innerX.setValue(ax * FRICTION.inner);
      innerY.setValue(ay * FRICTION.inner);
      dotX.setValue(ax * FRICTION.dot);
      dotY.setValue(ay * FRICTION.dot);

      // Shared rotation for all rings (at their own offset positions)
      rotAngle.setValue(accZ.current);

      // Throttle state — every 4th frame ≈ 5 Hz
      frame.current++;
      if (frame.current % 4 === 0) {
        const moving = Math.abs(g.x) > 0.05 || Math.abs(g.y) > 0.05 || Math.abs(g.z) > 0.05;
        setData({ x: g.x, y: g.y, z: g.z });
        setActive(moving);
      }
    });

    return () => sub.remove();
  }, []);

  const rotDeg = rotAngle.interpolate({
    inputRange: [-180, 180], outputRange: ['-180deg', '180deg'], extrapolate: 'extend',
  });

  const fmt = (v) => (v >= 0 ? '+' : '') + v.toFixed(3);
  const mag  = Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <ScrollView
        style={{ flex: 1, width: '100%' }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── Header ─────────────────── */}
        <View style={styles.header}>
          <Text style={styles.chip}>EXPO SENSORS</Text>
          <Text style={styles.title}>Gyroscope</Text>
          <View style={[styles.badge, active && styles.badgeActive]}>
            <View style={[styles.dot, active && styles.dotActive]} />
            <Text style={[styles.badgeText, active && styles.badgeTextActive]}>
              {active ? 'DETECTING MOTION' : 'IDLE'}
            </Text>
          </View>
        </View>

        {/* ── Ring visualizer ─────────── */}
        <View style={styles.visual}>
          {/* Outer ring — moves most (highest friction / "deepest" layer) */}
          <Animated.View style={[
            styles.ring, styles.ringOuter,
            { transform: [{ translateX: outerX }, { translateY: outerY }, { rotateZ: rotDeg }] },
          ]} />

          {/* Middle ring */}
          <Animated.View style={[
            styles.ring, styles.ringMid,
            { transform: [{ translateX: midX }, { translateY: midY }, { rotateZ: rotDeg }] },
          ]} />

          {/* Inner ring — barely moves ("closest" layer) */}
          <Animated.View style={[
            styles.ring, styles.ringInner,
            { transform: [{ translateX: innerX }, { translateY: innerY }, { rotateZ: rotDeg }] },
          ]} />

          {/* Center dot — nearly stationary */}
          <Animated.View style={[
            styles.centerDot,
            { opacity: pulse, transform: [{ translateX: dotX }, { translateY: dotY }] },
          ]} />
        </View>

        {/* ── Friction hint ──────────── */}
        <Text style={styles.hint}>↔ Tilt device · each ring has different friction</Text>

        {/* ── Axis cards ─────────────── */}
        <Text style={styles.sectionLabel}>ANGULAR VELOCITY  ·  rad/s</Text>
        <View style={styles.cards}>
          {[
            { label: 'X', val: data.x, color: '#3D5580', sub: 'Roll' },
            { label: 'Y', val: data.y, color: '#34C759', sub: 'Pitch' },
            { label: 'Z', val: data.z, color: '#AF52DE', sub: 'Yaw' },
          ].map(({ label, val, color, sub }) => (
            <View key={label} style={[styles.card, { borderColor: color + '33' }]}>
              <Text style={[styles.cardLabel, { color }]}>{label}</Text>
              <Text style={styles.cardVal}>{fmt(val)}</Text>
              <Text style={[styles.cardSub, { color: color + 'AA' }]}>{sub}</Text>
            </View>
          ))}
        </View>

        {/* ── Magnitude ──────────────── */}
        <View style={styles.magRow}>
          <Text style={styles.sectionLabel}>MAGNITUDE</Text>
          <Text style={styles.magVal}>{mag.toFixed(4)} rad/s</Text>
        </View>
        <MagnitudeBar magnitude={mag} />

        {/* ── Navigate button ─────────── */}
        <Animated.View style={{ transform: [{ scale: btnScale }], marginTop: 24 }}>
          <TouchableOpacity
            style={styles.navBtn}
            activeOpacity={1}
            onPressIn={()  => Animated.spring(btnScale, { toValue: 0.95, useNativeDriver: true }).start()}
            onPressOut={() => Animated.spring(btnScale, { toValue: 1, friction: 5, useNativeDriver: true }).start()}
            onPress={() => navigation.navigate('Imaze')}
          >
            <Text style={styles.navBtnTxt}>Open Imaze Gallery</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── MagnitudeBar ─────────────────────────────────────────────────────────────
function MagnitudeBar({ magnitude }) {
  const anim = useRef(new Animated.Value(0)).current;
  const prev = useRef(0);
  const clamped = Math.min(magnitude / 5, 1);

  if (Math.abs(clamped - prev.current) > 0.01) {
    prev.current = clamped;
    Animated.timing(anim, { toValue: clamped, duration: 120, useNativeDriver: false }).start();
  }

  return (
    <View style={styles.barTrack}>
      <Animated.View style={[
        styles.barFill,
        {
          width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          backgroundColor: anim.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: ['#3D5580', '#34C759', '#AF52DE'],
          }),
        },
      ]} />
    </View>
  );
}

// ─── Styles (LIGHT MODE) ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F7F7F9' },
  scroll: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 58 : 38,
    paddingHorizontal: 22,
    paddingBottom: 36,
  },

  // Header
  header:          { alignItems: 'center', marginBottom: 22, width: '100%' },
  chip:            { color: '#3D5580', fontSize: 10, fontWeight: '800', letterSpacing: 4, marginBottom: 6 },
  title:           { color: '#111', fontSize: 30, fontWeight: '800', letterSpacing: 0.3, marginBottom: 10 },
  badge:           { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, backgroundColor: '#EBEBF0', borderWidth: 1, borderColor: '#D8D8DE' },
  badgeActive:     { borderColor: '#3D558055', backgroundColor: '#EAF3FF' },
  dot:             { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#C7C7CC' },
  dotActive:       { backgroundColor: '#3D5580' },
  badgeText:       { color: '#8E8E93', fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  badgeTextActive: { color: '#3D5580' },

  // Ring visualizer
  visual:     {
    width: RING_SIZE + 60,  // extra room for rings to shift without clipping
    height: RING_SIZE + 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  ring:       { position: 'absolute', borderRadius: RING_SIZE },
  ringOuter:  { width: RING_SIZE,        height: RING_SIZE,        borderWidth: 2.5, borderColor: '#C7C7CC' },
  ringMid:    { width: RING_SIZE * 0.76, height: RING_SIZE * 0.76, borderWidth: 2.5, borderColor: '#3D5580' },
  ringInner:  { width: RING_SIZE * 0.52, height: RING_SIZE * 0.52, borderWidth: 2.5, borderColor: '#34C759' },
  centerDot:  {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#3D5580',
    shadowColor: '#3D5580', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 8,
  },

  hint: { color: '#8E8E93', fontSize: 11, fontWeight: '500', marginBottom: 22, letterSpacing: 0.3 },

  // Axis cards
  sectionLabel: { color: '#8E8E93', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 10, alignSelf: 'flex-start' },
  cards: { flexDirection: 'row', gap: 8, width: '100%', marginBottom: 20 },
  card:  { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, paddingVertical: 14, alignItems: 'center', gap: 3,
           shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  cardLabel: { fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  cardVal:   { color: '#111', fontSize: 11, fontWeight: '600', fontVariant: ['tabular-nums'] },
  cardSub:   { fontSize: 9, fontWeight: '600', letterSpacing: 1 },

  // Magnitude
  magRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 10 },
  magVal:   { color: '#111', fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
  barTrack: { width: '100%', height: 5, backgroundColor: '#E5E5EA', borderRadius: 3, overflow: 'hidden' },
  barFill:  { height: '100%', borderRadius: 3 },

  // Button
  navBtn:    { backgroundColor: '#3D5580', borderRadius: 50, paddingVertical: 16, alignItems: 'center', width: '100%',
               shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  navBtnTxt: { paddingHorizontal: 20,color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.4 },
});
