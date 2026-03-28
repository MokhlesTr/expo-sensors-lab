import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import GyroscopeScreen from './screens/GyroscopeScreen';
import ImazeScreen from './screens/ImazeScreen';
import FrictionScreen from './screens/FrictionScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Gyroscope" component={GyroscopeScreen} />
        <Stack.Screen name="Imaze" component={ImazeScreen} />
        <Stack.Screen name="Friction" component={FrictionScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
