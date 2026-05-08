/**
 * HireSight - Mobile Application
 * @format
 */

import React, { useEffect, useState } from 'react';
import { BackHandler, View } from 'react-native';
import SplashScreen from './src/screens/SplashScreen';
import LandingScreen from './src/screens/LandingScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import SignInScreen from './src/screens/SignInScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import { AuthService } from './src/services/authService';

type Screen = 'splash' | 'landing' | 'signup' | 'signin' | 'dashboard';

function App(): JSX.Element {
  const [screenStack, setScreenStack] = useState<Screen[]>(['splash']);
  const [initialRoute, setInitialRoute] = useState<Screen>('landing');
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [isSplashFinished, setIsSplashFinished] = useState(false);

  const currentScreen = screenStack[screenStack.length - 1];

  useEffect(() => {
    const resolveInitialRoute = async () => {
      const authenticated = await AuthService.isAuthenticated();
      setInitialRoute(authenticated ? 'dashboard' : 'landing');
      setIsAuthChecked(true);
    };

    resolveInitialRoute();
  }, []);

  useEffect(() => {
    const backAction = () => {
      if (currentScreen === 'dashboard') {
        return true;
      }

      if (screenStack.length > 1) {
        setScreenStack(previousStack => previousStack.slice(0, -1));
      }

      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, [currentScreen, screenStack.length]);

  useEffect(() => {
    if (isSplashFinished && isAuthChecked && currentScreen === 'splash') {
      setScreenStack([initialRoute]);
    }
  }, [currentScreen, initialRoute, isAuthChecked, isSplashFinished]);

  const navigateTo = (screen: Screen) => {
    setScreenStack(previousStack => [...previousStack, screen]);
  };

  const replaceWith = (screen: Screen) => {
    setScreenStack([screen]);
  };

  const goBack = () => {
    setScreenStack(previousStack => (previousStack.length > 1 ? previousStack.slice(0, -1) : previousStack));
  };

  const handleSplashFinish = () => {
    setIsSplashFinished(true);

    if (isAuthChecked) {
      setScreenStack([initialRoute]);
    }
  };

  const navigateToSignUp = () => {
    navigateTo('signup');
  };

  const navigateToSignIn = () => {
    navigateTo('signin');
  };

  const navigateToDashboard = () => {
    replaceWith('dashboard');
  };

  const handleLogout = () => {
    replaceWith('landing');
  };

  if (currentScreen === 'splash') {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  if (currentScreen === 'signup') {
    return <SignUpScreen onSignIn={navigateToSignIn} onBack={goBack} onSignUpSuccess={navigateToDashboard} />;
  }

  if (currentScreen === 'signin') {
    return <SignInScreen onSignUp={navigateToSignUp} onBack={goBack} onSignInSuccess={navigateToDashboard} />;
  }

  if (currentScreen === 'dashboard') {
    return <DashboardScreen onLogout={handleLogout} />;
  }

  return <LandingScreen onSignUp={navigateToSignUp} onSignIn={navigateToSignIn} />;
}

export default App;
