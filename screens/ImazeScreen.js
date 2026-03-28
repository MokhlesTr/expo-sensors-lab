import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Dimensions,
  TouchableOpacity, Image, Platform,
  Animated, FlatList, SafeAreaView,
} from 'react-native';
import { Gyroscope } from 'expo-sensors';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

const PHOTOS = [
  { id: '1', uri: 'https://images.unsplash.com/photo-1499678329028-101435549a4e?w=800&q=85', label: 'Cinque Terre', sub: 'Italy' },
  { id: '2', uri: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=85', label: 'Swiss Alps',    sub: 'Switzerland' },
  { id: '3', uri: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=800&q=85', label: 'Santorini',    sub: 'Greece' },
  { id: '4', uri: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&q=85', label: 'Fjords',       sub: 'Norway' },
  { id: '5', uri: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=85', label: 'City Lights',  sub: 'New York' },
];

const PARALLAX_EXTRA = 40;
const CARD_W = width - 56;
const CARD_H = CARD_W * 1.28;
const THUMB_W = 56;
const THUMB_H = 56;

export default function ImazeScreen({ navigation }) {
  const [activeIdx, setActiveIdx] = useState(0);

  const accX = useRef(0);
  const accY = useRef(0);
  const shiftX = useRef(new Animated.Value(0)).current;
  const shiftY = useRef(new Animated.Value(0)).current;
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(entrance, {
      toValue: 1, friction: 7, tension: 50, useNativeDriver: true,
    }).start();

    Gyroscope.setUpdateInterval(32);

    const sub = Gyroscope.addListener(({ x, y }) => {
      accX.current = accX.current * 0.78 + y * 3.5;
      accY.current = accY.current * 0.78 + x * 3.5;
      const cx = Math.max(-PARALLAX_EXTRA, Math.min(PARALLAX_EXTRA, accX.current));
      const cy = Math.max(-PARALLAX_EXTRA, Math.min(PARALLAX_EXTRA, accY.current));
      shiftX.setValue(cx);
      shiftY.setValue(cy);
    });

    return () => { sub.remove(); Gyroscope.setUpdateInterval(50); };
  }, []);

  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    if (viewableItems.length > 0) setActiveIdx(Number(viewableItems[0].key) - 1);
  }, []);

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 60 }).current;
  const flatRef = useRef(null);
  const goTo = (i) => { flatRef.current?.scrollToIndex({ index: i, animated: true }); setActiveIdx(i); };

  const entranceY = entrance.interpolate({ inputRange: [0, 1], outputRange: [60, 0] });

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Gallery</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Featured card */}
      <Animated.View style={[styles.featuredWrap, { opacity: entrance, transform: [{ translateY: entranceY }] }]}>
        <View style={styles.featuredCard}>

          {/* Parallax container — image + button move together with gyro */}
          <Animated.View
            style={[
              styles.parallaxContainer,
              { transform: [{ translateX: shiftX }, { translateY: shiftY }] },
            ]}
          >
            <Image
              source={{ uri: PHOTOS[activeIdx].uri }}
              style={styles.featuredImage}
              resizeMode="cover"
            />

            {/* Caption */}
            <View style={styles.caption}>
              <Text style={styles.captionLabel}>{PHOTOS[activeIdx].label}</Text>
              <Text style={styles.captionSub}>{PHOTOS[activeIdx].sub}</Text>
            </View>

            {/* ── Button INSIDE the image — moves with parallax ── */}
         
          </Animated.View>

        </View>
      </Animated.View>

      {/* Dot indicators */}
      <View style={styles.dots}>
        {PHOTOS.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => goTo(i)}>
            <View style={[styles.dot, i === activeIdx && styles.dotActive]} />
          </TouchableOpacity>
        ))}

      </View>
      

      {/* Horizontal thumbnail scroll */}
      <FlatList
        ref={flatRef}
        data={PHOTOS}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={THUMB_W + 10}
        decelerationRate="fast"
        contentContainerStyle={styles.thumbList}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewConfig}
        renderItem={({ item, index }) => (
          <TouchableOpacity onPress={() => goTo(index)} activeOpacity={0.8}>
            <View style={[styles.thumbWrap, index === activeIdx && styles.thumbActive]}>
              <Image source={{ uri: item.uri }} style={styles.thumb} resizeMode="cover" />
            </View>
          </TouchableOpacity>
        )}
      />
         <TouchableOpacity
              style={styles.insideBtn}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Friction')}
            >
              <Text style={styles.insideBtnText}>Explore Stack</Text>
            </TouchableOpacity>

      {/* Bottom branding */}
      <View style={styles.bottom}>
        <View style={styles.appNameRow}>
          <Text style={styles.appName}>Imaze</Text>
          <View style={styles.miniThumbs}>
            {PHOTOS.slice(0, 4).map((p, i) => (
              <Image key={i} source={{ uri: p.uri }} style={styles.miniThumb} />
            ))}
          </View>
        </View>
        <Text style={styles.tagline}>Store, organize, and access your memories anywhere, anytime.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F7F9' },

  topBar:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 16 : 4, marginBottom: 12 },
  backBtn:     { width: 38, height: 38, borderRadius: 19, backgroundColor: '#00000010', alignItems: 'center', justifyContent: 'center' },
  backIcon:    { fontSize: 26, color: '#111', lineHeight: 30, marginTop: -2 },
  screenTitle: { fontSize: 17, fontWeight: '700', color: '#111' },

  // Card
  featuredWrap: { paddingHorizontal: 28, marginBottom: 14 },
  featuredCard: {
    width: CARD_W, height: CARD_H,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 14,
  },

  // Parallax container: larger than card so shift fills the bleed
  parallaxContainer: {
    position: 'absolute',
    top: -PARALLAX_EXTRA,
    left: -PARALLAX_EXTRA,
    width: CARD_W + PARALLAX_EXTRA * 2,
    height: CARD_H + PARALLAX_EXTRA * 2,
  },
  featuredImage: { width: '100%', height: '100%' },

  caption: {
    position: 'absolute',
    bottom: PARALLAX_EXTRA + 68, // sit above the button
    left: PARALLAX_EXTRA + 20,
    right: PARALLAX_EXTRA,
    paddingHorizontal: 4,
  },
  captionLabel: { color: '#fff', fontSize: 22, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
  captionSub:   { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '500', marginTop: 2 },

  // ── Button inside the image ──────────────────────
  insideBtn: {
    backgroundColor: '#3D5580',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.55)',
    borderRadius: 50,
    paddingVertical: 14,
    paddingHorizontal: "10%",
    marginHorizontal: "auto",
    alignItems: 'center',
    marginBottom: "10%"
  },
  insideBtnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },

  // Dots
  dots:     { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 12 },
  dot:      { width: 6, height: 6, borderRadius: 3, backgroundColor: '#C8C8CE' },
  dotActive:{ width: 20, height: 6, borderRadius: 3, backgroundColor: '#111' },

  // Thumbnails
  thumbList:  { paddingHorizontal: 20, gap: 10, marginBottom: 14 },
  thumbWrap:  { width: THUMB_W, height: THUMB_H, borderRadius: 14, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  thumbActive:{ borderColor: '#111' },
  thumb:      { width: '100%', height: '100%' },

  // Bottom
  bottom:     { paddingHorizontal: 28, paddingBottom: 4 },
  appNameRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  appName:    { fontSize: 28, fontWeight: '800', color: '#111', letterSpacing: -0.5 },
  miniThumbs: { flexDirection: 'row', gap: 4 },
  miniThumb:  { width: 22, height: 22, borderRadius: 5, backgroundColor: '#ddd' },
  tagline:    { fontSize: 13, color: '#777', lineHeight: 19 },
});
