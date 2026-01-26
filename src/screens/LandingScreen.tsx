import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Image,
} from 'react-native';

const { width } = Dimensions.get('window');

interface LandingScreenProps {
  onSignUp: () => void;
  onSignIn: () => void;
}

const LandingScreen: React.FC<LandingScreenProps> = ({ onSignUp, onSignIn }) => {
  const handleSignUp = () => {
    console.log('Sign Up pressed');
    onSignUp();
  };

  const handleSignIn = () => {
    console.log('Sign In pressed');
    onSignIn();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />

      {/* Main Content */}
      <View style={styles.content}>
        {/* Logo and Branding Section */}
        <View style={styles.brandingSection}>
          {/* App Logo */}
          <Image 
            source={require('../assets/logo-2.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          
          {/* App Name */}
          <Text style={styles.appNameCenter}>HireSight</Text>
          <Text style={styles.tagline}>
            Your gateway to connecting talent with opportunity
          </Text>
        </View>

        {/* Auth Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.signUpButton}
            onPress={handleSignUp}
            activeOpacity={0.8}>
            <Text style={styles.signUpButtonText}>Sign Up</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.signInButton}
            onPress={handleSignIn}
            activeOpacity={0.8}>
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          By continuing, you agree to our Terms & Privacy Policy
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingTop: 40,
  },
  brandingSection: {
    marginBottom: 80,
    alignItems: 'center',
  },
  logo: {
    width: 140,
    height: 140,
    marginBottom: 28,
  },
  appNameCenter: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1A1A1A',
    letterSpacing: 1,
    marginBottom: 16,
  },
  tagline: {
    fontSize: 17,
    color: '#666',
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: '100%',
  },
  signUpButton: {
    backgroundColor: '#1A1A1A',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  signUpButtonText: {
    color: '#FAFAFA',
    fontSize: 18,
    fontWeight: '600',
  },
  signInButton: {
    backgroundColor: '#FAFAFA',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1A1A1A',
  },
  signInButtonText: {
    color: '#1A1A1A',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 30,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default LandingScreen;
