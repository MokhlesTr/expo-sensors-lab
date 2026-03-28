import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, Animated,
  Dimensions, Platform, TouchableOpacity,
} from 'react-native';
import { Gyroscope } from 'expo-sensors';

const { width } = Dimensions.get('window');
const RING_SIZE = width * 0.52;

export default function GyroscopeScreen({ navigation }) {
  const [data, setData] = useState({ x: 0, y: 0, z: 0 });
  const [active, setActive] = useState(false);

  // ─── Animated values: only rotateZ + scale → native driver ✓ ─────────────
  const angleOuter = useRef(new Animated.Value(0)).current; // Z gyro
  const angleMid   = useRef(new Animated.Value(0)).current; // X gyro
  const angleInner = useRef(new Animated.Value(0)).current; // Y gyro
  const pulse      = useRef(new Animated.Value(0.6)).current;
  const btnScale   = useRef(new Animated.Value(1)).current;

  // frame counter for throttling setState
  const frameCount = useRef(0);

  useEffect(() => {
    // Pulse glow — native driver ✓
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1,   duration: 1200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.6, duration: 1200, useNativeDriver: true }),
      ])
    ).start();

    Gyroscope.setUpdateInterval(50); // 20 Hz

    const sub = Gyroscope.addListener((g) => {
      // Map CURRENT velocity to ring angle.
      // When still → rings spring back to 0. No accumulation drift.
      const SENS = 55; // degrees per rad/s

      // Springs run on the native thread (useNativeDriver: true) ✓
      Animated.spring(angleOuter, {
        toValue: g.z * SENS,
        useNativeDriver: true,
        damping: 18, mass: 0.25, stiffness: 220, overshootClamping: true,
      }).start();

      Animated.spring(angleMid, {
        toValue: g.x * SENS,
        useNativeDriver: true,
        damping: 18, mass: 0.25, stiffness: 220, overshootClamping: true,
      }).start();

      Animated.spring(angleInner, {
        toValue: g.y * SENS,
        useNativeDriver: true,
        damping: 18, mass: 0.25, stiffness: 220, overshootClamping: true,
      }).start();

      // Throttle state updates: only every 4th frame (~5 Hz) to reduce re-renders
      frameCount.current++;
      if (frameCount.current % 4 === 0) {
        const isMoving = Math.abs(g.x) > 0.05 || Math.abs(g.y) > 0.05 || Math.abs(g.z) > 0.05;
        setData({ x: g.x, y: g.y, z: g.z });
        setActive(isMoving);
      }
    });

    return () => sub.remove();
  }, []);

  const mkRot = (val) =>
    val.interpolate({ inputRange: [-180, 180], outputRange: ['-180deg', '180deg'], extrapolate: 'extend' });

  const rotOuter = mkRot(angleOuter);
  const rotMid   = mkRot(angleMid);
  const rotInner = mkRot(angleInner);

  const fmt = (v) => (v >= 0 ? '+' : '') + v.toFixed(3);

  const onPressIn  = () => Animated.spring(btnScale, { toValue: 0.94, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(btnScale, { toValue: 1, friction: 4, useNativeDriver: true }).start();

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.subtitle}>EXPO SENSORS</Text>
        <Text style={styles.title}>Gyroscope</Text>
        <View style={[styles.badge, active && styles.badgeActive]}>
          <View style={[styles.dot, active && styles.dotActive]} />
          <Text style={[styles.badgeText, active && styles.badgeTextActive]}>
            {active ? 'DETECTING MOTION' : 'IDLE'}
          </Text>
        </View>
      </View>

      {/* Visualizer */}
      <View style={styles.visualContainer}>
        <Animated.View
          style={[styles.glow, {
            opacity: pulse.interpolate({ inputRange: [0.6, 1], outputRange: [0.04, 0.12] }),
          }]}
        />
        {/* All three rings use rotateZ → native driver ✓ */}
        <Animated.View style={[styles.ring, styles.ringX, { transform: [{ rotateZ: rotOuter }] }]} />
        <Animated.View style={[styles.ring, styles.ringY, { transform: [{ rotateZ: rotMid   }] }]} />
        <Animated.View style={[styles.ring, styles.ringZ, { transform: [{ rotateZ: rotInner }] }]} />
        <Animated.View style={[styles.axisCenter, { opacity: pulse }]} />
      </View>

      {/* Data Cards */}
      <View style={styles.dataSection}>
        <Text style={styles.sectionLabel}>ANGULAR VELOCITY (rad/s)</Text>
        <View style={styles.cards}>
          <DataCard axis="X" value={fmt(data.x)} color="#00BFFF" icon="↔" />
          <DataCard axis="Y" value={fmt(data.y)} color="#00E5CC" icon="↕" />
          <DataCard axis="Z" value={fmt(data.z)} color="#A78BFA" icon="↻" />
        </View>
      </View>

      <MagnitudeBar x={data.x} y={data.y} z={data.z} />

      {/* Navigate to Imaze */}
      <Animated.View style={[styles.navBtnWrapper, { transform: [{ scale: btnScale }] }]}>
        <TouchableOpacity
          style={styles.navBtn}
          
          activeOpacity={1}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          onPress={() => navigation.navigate('Imaze')}
        >
          <Text style={styles.navBtnText}>Open Imaze Gallery</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function DataCard({ axis, value, color, icon }) {
  return (
    <View style={[styles.card, { borderColor: color + '44' }]}>
      <Text style={[styles.cardIcon, { color }]}>{icon}</Text>
      <Text style={[styles.cardAxis, { color }]}>{axis}</Text>
      <Text style={styles.cardValue}>{value}</Text>
    </View>
  );
}

// MagnitudeBar: drives its own Animated.Value directly, no effect-loop needed
function MagnitudeBar({ x, y, z }) {
  const barAnim = useRef(new Animated.Value(0)).current;
  const magnitude = Math.sqrt(x * x + y * y + z * z);

  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: Math.min(magnitude / 5, 1),
      duration: 80,
      useNativeDriver: false, // width % requires layout driver
    }).start();
  }, [magnitude]);

  const barWidth = barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const barColor = barAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['#00BFFF', '#00E5CC', '#A78BFA'],
  });

  return (
    <View style={styles.magSection}>
      <View style={styles.magHeader}>
        <Text style={styles.sectionLabel}>MAGNITUDE</Text>
        <Text style={styles.magValue}>{magnitude.toFixed(3)} rad/s</Text>
      </View>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, { width: barWidth, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050A1A', alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: 20 },
  header: { alignItems: 'center', marginBottom: 24 },
  subtitle: { color: '#00BFFF', fontSize: 11, fontWeight: '700', letterSpacing: 4, marginBottom: 4 },
  title: { color: '#FFFFFF', fontSize: 32, fontWeight: '800', letterSpacing: 1, marginBottom: 12 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, backgroundColor: '#0D1B2E', borderWidth: 1, borderColor: '#1E3251' },
  badgeActive: { borderColor: '#00BFFF44', backgroundColor: '#001B33' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#2E4060' },
  dotActive: { backgroundColor: '#00BFFF' },
  badgeText: { color: '#3D5580', fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  badgeTextActive: { color: '#00BFFF' },
  visualContainer: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  glow: { position: 'absolute', width: RING_SIZE * 1.25, height: RING_SIZE * 1.25, borderRadius: (RING_SIZE * 1.25) / 2, backgroundColor: '#00BFFF' },
  ring: { position: 'absolute', borderRadius: RING_SIZE / 2 },
  ringX: { width: RING_SIZE, height: RING_SIZE, borderWidth: 2.5, borderColor: '#C0C0C0' },
  ringY: { width: RING_SIZE * 0.78, height: RING_SIZE * 0.78, borderWidth: 2.5, borderColor: '#00E5CC' },
  ringZ: { width: RING_SIZE * 0.56, height: RING_SIZE * 0.56, borderWidth: 2.5, borderColor: '#00BFFF' },
  axisCenter: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#00BFFF', shadowColor: '#00BFFF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 10 },
  dataSection: { width: '100%', marginBottom: 16 },
  sectionLabel: { color: '#3D5580', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 10 },
  cards: { flexDirection: 'row', gap: 10 },
  card: { flex: 1, backgroundColor: '#0D1B2E', borderRadius: 14, borderWidth: 1, paddingVertical: 14, alignItems: 'center', gap: 4 },
  cardIcon: { fontSize: 18 },
  cardAxis: { fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  cardValue: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  magSection: { width: '100%', marginBottom: 24 },
  magHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  magValue: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  barTrack: { width: '100%', height: 6, backgroundColor: '#0D1B2E', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  navBtnWrapper: { width: '100%' },
  navBtn: { backgroundColor: '#00000071', borderRadius: 50, paddingVertical: 16, alignItems: 'center', shadowColor: '#00BFFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 },
  navBtnText: { color: '#00BFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
});
