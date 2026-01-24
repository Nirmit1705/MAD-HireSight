/**
 * HireSight - Mobile Application
 * @format
 */

import React, { useState } from 'react';
import { View } from 'react-native';
import SplashScreen from './src/screens/SplashScreen';
import LandingScreen from './src/screens/LandingScreen';

function App(): JSX.Element {
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashFinish = () => {
    setShowSplash(false);
  };

  if (showSplash) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  return <LandingScreen />;
}

export default App;
