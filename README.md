# 🌀 rn-sensors — Gyroscope Experience

> A React Native Expo application that turns your device's gyroscope into a live, interactive visual experience. Tilt your phone and watch layered rings drift with friction parallax, images shift with depth, and photo cards fan out mid-air.

---

## 📱 Screens

| Gyroscope Visualiser | Friction Gallery |
|---|---|
| ![Gyroscope screen](./my-app/assets/image.png) | ![Friction gallery screen](./my-app/assets/image2.png) |

---

## ✨ Features

### 🔵 Gyroscope Screen
- **Real-time ring visualiser** — three concentric rings (outer, mid, inner) each shift with a different *friction multiplier*, simulating depth-of-field parallax
- **Rotation** — the Z-axis angular velocity spins all rings simultaneously
- **Live axis cards** — X (Roll), Y (Pitch), Z (Yaw) shown in rad/s with colour-coded labels
- **Magnitude bar** — smooth animated progress bar colour-shifts from blue → green → purple as motion intensity increases
- **Motion badge** — IDLE / DETECTING MOTION status with a pulsing indicator dot

### 🖼 Gallery Screen (Imaze)
- **Gyroscope parallax** — the featured photo shifts ±40 px in any direction as you tilt the device, using a low-pass accumulator to prevent drift
- **Smooth entrance animation** — content springs in from below on mount
- **Thumbnail strip** — horizontally scrollable snap-list; tap a thumb to jump to any photo
- **Dot indicator** — pill-expanding active dot synced to the scroll position

### 🃏 Friction Gallery Screen
- **Stacked card deck** — five photos layered at different scales, rotations and z-indices
- **Per-card friction** — each card has its own `friction` coefficient; tilting the device fans the deck into an arc, back cards moving the most
- **Staggered entrance** — cards spring in from the bottom with incremental offsets for a cascading reveal

---

## 🛠 Tech Stack

| Layer | Choice |
|---|---|
| Framework | React Native 0.81 + Expo SDK 54 |
| Language | TypeScript (`.tsx`) |
| Sensors | `expo-sensors` — `Gyroscope` |
| Navigation | `@react-navigation/native-stack` |
| Animation | `Animated` API — native driver throughout |
| Status Bar | `expo-status-bar` |

---

## 📐 Architecture

```
my-app/
├── App.tsx                      # Root navigator (typed RootStackParamList)
├── index.js                     # Expo entry point
├── screens/
│   ├── GyroscopeScreen.tsx      # Ring visualiser + live sensor data
│   ├── ImazeScreen.tsx          # Parallax photo gallery
│   └── FrictionScreen.tsx       # Gyro-driven card-stack
└── assets/
    ├── image.png                # Screenshot — Gyroscope screen
    └── image2.png               # Screenshot — Friction gallery
```

### Sensor Strategy

All three screens share the same pattern for zero-drift, high-performance gyro reading:

```ts
// Low-pass accumulator — decays toward zero when the phone is still
accX.current = accX.current * 0.80 + g.y * 2.8;
accY.current = accY.current * 0.80 + g.x * 2.8;

// Direct Animated.Value mutation — no React re-render, no JS→Native bridge overhead
animatedValue.setValue(accX.current);
```

- **React state** is throttled to every 4th frame (~5 Hz) for the data cards
- **Animated values** are set at full sensor rate (16–50 ms interval) via `setValue` — zero allocation, runs entirely on the native thread

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18
- Expo CLI (`npm install -g expo-cli`) or use `npx expo`
- iOS Simulator / Android Emulator **or** a physical device with [Expo Go](https://expo.dev/go)

> **Note:** The gyroscope sensor is **not available** in iOS Simulator or Android Emulator. Use a real device for the full experience.

### Install

```bash
git clone https://github.com/your-username/rn-sensors.git
cd rn-sensors/my-app
npm install
```

### Run

```bash
# Start Metro bundler
npx expo start

# Open on iOS
npx expo start --ios

# Open on Android
npx expo start --android
```

Scan the QR code with Expo Go on your device.

---

## 🗺 Navigation Flow

```
GyroscopeScreen  ──[Open Imaze Gallery]──▶  ImazeScreen  ──[Explore Stack]──▶  FrictionScreen
       ▲                                         │                                      │
       └─────────────────────────────────────────┴──────────────[goBack()]──────────────┘
```

---

## 🎛 Gyroscope Constants

| Constant | File | Purpose |
|---|---|---|
| `FRICTION = { outer: 1.8, mid: 1.0, inner: 0.4, dot: 0.1 }` | `GyroscopeScreen.tsx` | Per-ring displacement multiplier |
| `PARALLAX_EXTRA = 40` | `ImazeScreen.tsx` | Max image bleed in px for parallax |
| `CARDS[i].friction` | `FrictionScreen.tsx` | Per-card tilt amplification |

---

## 📦 Dependencies

```json
{
  "expo": "~54.0.33",
  "expo-sensors": "~15.0.8",
  "expo-status-bar": "~3.0.9",
  "react": "19.1.0",
  "react-native": "0.81.5",
  "@react-navigation/native": "^7.2.1",
  "@react-navigation/native-stack": "^7.14.9",
  "react-native-safe-area-context": "~5.6.0",
  "react-native-screens": "~4.16.0"
}
```

---

## 📄 License

MIT — feel free to use, remix, and ship.
