/**
 * HireSight - Mobile Application
 * @format
 */

import React, { useState } from 'react';
import { View } from 'react-native';
import SplashScreen from './src/screens/SplashScreen';
import LandingScreen from './src/screens/LandingScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import SignInScreen from './src/screens/SignInScreen';

type Screen = 'splash' | 'landing' | 'signup' | 'signin';

function App(): JSX.Element {
  const [currentScreen, setCurrentScreen] = useState<Screen>('splash');

  const handleSplashFinish = () => {
    setCurrentScreen('landing');
  };

  const navigateToSignUp = () => {
    setCurrentScreen('signup');
  };

  const navigateToSignIn = () => {
    setCurrentScreen('signin');
  };

  const navigateToLanding = () => {
    setCurrentScreen('landing');
  };

  if (currentScreen === 'splash') {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  if (currentScreen === 'signup') {
    return <SignUpScreen onSignIn={navigateToSignIn} onBack={navigateToLanding} />;
  }

  if (currentScreen === 'signin') {
    return <SignInScreen onSignUp={navigateToSignUp} onBack={navigateToLanding} />;
  }

  return <LandingScreen onSignUp={navigateToSignUp} onSignIn={navigateToSignIn} />;
}

export default App;
