import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Icon from 'react-native-vector-icons/Ionicons';
import { AuthService } from '../services/authService';

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: '955493235709-htnam5ci932okmng0qf6gje0bk4lapjh.apps.googleusercontent.com',
  offlineAccess: true,
  forceCodeForRefreshToken: true,
});

interface GoogleSignInButtonProps {
  onSuccess: (user: any) => void;
  onError?: (error: string) => void;
}

const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onSuccess,
  onError,
}) => {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);

      // Check if Google Play services are available
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Sign out first to force the account picker to show up
      // This solves the issue of it "pre-assuming" the last picked account
      try {
        await GoogleSignin.signOut();
      } catch (e) {
        // Ignore if not signed in
      }

      // Sign in with Google
      const userInfo = await GoogleSignin.signIn();
      console.log('Google User Info:', userInfo);
      
      // The response shape varies by library version; prefer the nested data token when present.
      let idToken = 'data' in userInfo ? userInfo.data?.idToken : undefined;
      
      if (!idToken) {
        const tokens = await GoogleSignin.getTokens();
        idToken = tokens.idToken;
      }

      if (!idToken) {
        throw new Error('No ID token received from Google');
      }

      // Send ID token to backend
      const result = await AuthService.signInWithGoogle(idToken);

      if (result.success && result.data) {
        console.log('Google Sign-In successful:', result.data.user);
        onSuccess(result.data.user);
      } else {
        const errorMessage = result.message || 'Google Sign-In failed';
        console.error('Google Sign-In error:', errorMessage);
        Alert.alert('Sign-In Failed', errorMessage);
        if (onError) {
          onError(errorMessage);
        }
      }
    } catch (error: any) {
      console.error('Google Sign-In error full:', error);
      
      let errorMessage = 'Failed to sign in with Google';
      
      if (error.code === 'SIGN_IN_CANCELLED') {
        errorMessage = 'Sign-In cancelled';
      } else if (error.code === 'IN_PROGRESS') {
        errorMessage = 'Sign-In already in progress';
      } else if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
        errorMessage = 'Google Play Services not available';
      } else if (error.message && error.message.includes('Network error')) {
        errorMessage = 'Network error: Please verify your Web Client ID and SHA-1 fingerprint in the Google Console.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Google Sign-In Error', errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handleGoogleSignIn}
      disabled={loading}
      activeOpacity={0.7}>
      <View style={styles.buttonContent}>
        {loading ? (
          <ActivityIndicator color="#4285F4" size="small" />
        ) : (
          <>
            <Icon name="logo-google" size={20} color="#000000" style={styles.icon} />
            <Text style={styles.buttonText}>Continue with Google</Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#DADCE0',
    marginVertical: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 12,
  },
  buttonText: {
    color: '#3C4043',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default GoogleSignInButton;
