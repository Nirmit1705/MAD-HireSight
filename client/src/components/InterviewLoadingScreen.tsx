import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Platform,
  PermissionsAndroid,
  Alert,
  Linking,
  TouchableOpacity,
} from 'react-native';

const { width, height } = Dimensions.get('window');

const LOADING_MESSAGES = [
  "🎯 Analyzing your profile with precision...",
  "🧠 Warming up the AI neurons...",
  "✨ Crafting personalized questions just for you...",
  "🔮 Predicting your career trajectory...",
  "🚀 Calibrating the interview simulator...",
  "💡 Mining insights from your experience...",
  "🎨 Painting your professional canvas...",
  "🔬 Conducting deep skill analysis...",
  "⚡ Charging up the question generator...",
  "🌟 Mapping your potential breakthrough...",
  "🎪 Setting the stage for brilliance...",
  "🧩 Connecting the dots in your journey...",
  "🎭 Preparing your spotlight moment...",
  "🌈 Creating your success pathway...",
  "🎯 Tuning into your frequency...",
];

interface InterviewLoadingScreenProps {
  onPermissionsGranted?: () => void;
  onPermissionsDenied?: () => void;
}

export const InterviewLoadingScreen: React.FC<InterviewLoadingScreenProps> = ({
  onPermissionsGranted,
  onPermissionsDenied,
}) => {
  const [currentMessage, setCurrentMessage] = useState(0);
  const [permissionStatus, setPermissionStatus] = useState<'checking' | 'granted' | 'denied'>('checking');
  const [permissionMessage, setPermissionMessage] = useState<string>('');
  
  // Animation values
  const spinValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;
  const orbitValue = useRef(new Animated.Value(0)).current;
  const fadeValue = useRef(new Animated.Value(0)).current;

  // Request permissions when component mounts
  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        setPermissionMessage('📱 Requesting microphone and camera access...');
        
        const permissions = [
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ];

        const granted = await PermissionsAndroid.requestMultiple(permissions);

        const cameraGranted = granted['android.permission.CAMERA'] === PermissionsAndroid.RESULTS.GRANTED;
        const audioGranted = granted['android.permission.RECORD_AUDIO'] === PermissionsAndroid.RESULTS.GRANTED;

        if (cameraGranted && audioGranted) {
          console.log('✅ All permissions granted');
          setPermissionStatus('granted');
          setPermissionMessage('✅ Microphone and camera ready!');
          onPermissionsGranted?.();
        } else {
          console.log('❌ Permissions denied');
          setPermissionStatus('denied');
          setPermissionMessage('❌ Microphone or camera access denied');
          onPermissionsDenied?.();
        }
      } catch (err) {
        console.warn('Permission error:', err);
        setPermissionStatus('denied');
        setPermissionMessage('⚠️ Error requesting permissions');
        onPermissionsDenied?.();
      }
    } else {
      // iOS permissions are handled via Info.plist
      // Just assume granted for now
      setPermissionStatus('granted');
      setPermissionMessage('✅ Microphone and camera ready!');
      onPermissionsGranted?.();
    }
  };

  const handleOpenSettings = () => {
    Linking.openSettings();
  };

  useEffect(() => {
    // Spin animation
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1.2,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Orbit animation
    Animated.loop(
      Animated.timing(orbitValue, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Fade in animation
    Animated.timing(fadeValue, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Rotate messages
    const messageInterval = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 3000);

    return () => clearInterval(messageInterval);
  }, []);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const orbit = orbitValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeValue }]}>
        {/* Central animated element */}
        <View style={styles.animationContainer}>
          {/* Rotating outer ring */}
          <Animated.View
            style={[
              styles.outerRing,
              {
                transform: [{ rotate: spin }],
              },
            ]}
          >
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <View
                key={index}
                style={[
                  styles.ringDot,
                  {
                    transform: [
                      { rotate: `${index * 60}deg` },
                      { translateY: -80 },
                    ],
                  },
                ]}
              />
            ))}
          </Animated.View>

          {/* Pulsing center circle */}
          <Animated.View
            style={[
              styles.centerCircle,
              {
                transform: [{ scale: pulseValue }],
              },
            ]}
          >
            <View style={styles.innerCircle}>
              <Text style={styles.aiText}>AI</Text>
            </View>
          </Animated.View>

          {/* Orbiting particles */}
          {[0, 1, 2].map((index) => {
            const orbitRotation = orbitValue.interpolate({
              inputRange: [0, 1],
              outputRange: [
                `${index * 120}deg`,
                `${(index * 120) + 360}deg`,
              ],
            });

            return (
              <Animated.View
                key={`orbit-${index}`}
                style={[
                  styles.orbitContainer,
                  {
                    transform: [{ rotate: orbitRotation }],
                  },
                ]}
              >
                <View style={styles.orbitParticle} />
              </Animated.View>
            );
          })}
        </View>

        {/* Loading text */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>Preparing Your Interview</Text>
          
          {/* Permission status message */}
          {permissionMessage && (
            <View style={[
              styles.permissionBadge,
              permissionStatus === 'granted' ? styles.permissionGranted : 
              permissionStatus === 'denied' ? styles.permissionDenied : styles.permissionChecking
            ]}>
              <Text style={styles.permissionText}>{permissionMessage}</Text>
            </View>
          )}
          
          {/* Show loading messages only if permissions are granted or checking */}
          {permissionStatus !== 'denied' && (
            <Animated.Text
              key={currentMessage}
              style={[styles.message]}
            >
              {LOADING_MESSAGES[currentMessage]}
            </Animated.Text>
          )}
          
          {/* Show error message and actions if permissions denied */}
          {permissionStatus === 'denied' && (
            <View style={styles.deniedContainer}>
              <Text style={styles.deniedText}>
                Camera and microphone permissions are required for the interview.
              </Text>
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.retryButton} onPress={requestPermissions}>
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.settingsButton} onPress={handleOpenSettings}>
                  <Text style={styles.settingsButtonText}>Open Settings</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          
          {/* Progress dots - only show when not denied */}
          {permissionStatus !== 'denied' && (
            <View style={styles.dotsContainer}>
              {[0, 1, 2, 3].map((index) => {
                const dotOpacity = pulseValue.interpolate({
                  inputRange: [1, 1.2],
                  outputRange: index === currentMessage % 4 ? [0.3, 1] : [0.3, 0.3],
                });

                return (
                  <Animated.View
                    key={index}
                    style={[
                      styles.dot,
                      {
                        opacity: dotOpacity,
                        backgroundColor: index <= currentMessage % 4 ? '#000' : '#ccc',
                      },
                    ]}
                  />
                );
              })}
            </View>
          )}
        </View>

        {permissionStatus !== 'denied' && (
          <Text style={styles.footer}>
            This won't take long. Get ready to shine! ✨
          </Text>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  animationContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 50,
  },
  outerRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#000',
  },
  centerCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  innerCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
  },
  orbitContainer: {
    position: 'absolute',
    width: 200,
    height: 200,
  },
  orbitParticle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#666',
    position: 'absolute',
    top: 0,
    left: 96,
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 30,
    minHeight: 50,
    fontWeight: '500',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  footer: {
    fontSize: 14,
    color: '#666',
    marginTop: 40,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  permissionBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  permissionChecking: {
    backgroundColor: '#f0f0f0',
  },
  permissionGranted: {
    backgroundColor: '#d4edda',
  },
  permissionDenied: {
    backgroundColor: '#f8d7da',
  },
  permissionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  deniedContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  deniedText: {
    fontSize: 15,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  retryButton: {
    backgroundColor: '#000',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  settingsButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#000',
  },
  settingsButtonText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '600',
  },
});
