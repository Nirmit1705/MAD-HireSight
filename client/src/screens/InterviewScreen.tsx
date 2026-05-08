import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Alert,
  ActivityIndicator,
  PermissionsAndroid,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import RNFS from 'react-native-fs';

const { height } = Dimensions.get('window');
const audioRecorderPlayer = new AudioRecorderPlayer();

interface Message {
  id: string;
  text: string;
  sender: 'ai' | 'user';
  timestamp: Date;
}

interface InterviewScreenProps {
  navigation?: any;
  resumeAnalysis?: any;
  selectedPosition?: string;
  selectedDomain?: string;
  isAiMode?: boolean;
  onBack?: () => void;
  onComplete?: (feedback: any) => void;
  skipPermissionCheck?: boolean;
}

export const InterviewScreen: React.FC<InterviewScreenProps> = ({
  navigation,
  resumeAnalysis,
  selectedPosition,
  selectedDomain,
  isAiMode = false,
  onBack,
  onComplete,
  skipPermissionCheck = false,
}) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(skipPermissionCheck ? true : null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [isInterviewActive, setIsInterviewActive] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [recordingPath, setRecordingPath] = useState<string>('');
  
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (skipPermissionCheck) {
      // Permissions already granted in loading screen, proceed directly
      initializeInterview();
    } else {
      checkAndRequestPermission();
    }
  }, []);

  const checkAndRequestPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        // Request both camera and audio permissions
        const permissions = [
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ];

        const granted = await PermissionsAndroid.requestMultiple(permissions);

        const cameraGranted = granted['android.permission.CAMERA'] === PermissionsAndroid.RESULTS.GRANTED;
        const audioGranted = granted['android.permission.RECORD_AUDIO'] === PermissionsAndroid.RESULTS.GRANTED;

        if (cameraGranted && audioGranted) {
          setHasPermission(true);
          initializeInterview();
        } else {
          setHasPermission(false);
          Alert.alert(
            'Permissions Required',
            'Camera and microphone permissions are required for interviews. Please enable them in settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]
          );
        }
      } catch (err) {
        console.warn('Permission error:', err);
        setHasPermission(false);
      }
    } else {
      // iOS permissions are handled via Info.plist
      setHasPermission(true);
      initializeInterview();
    }
  };

  const requestCameraPermission = async () => {
    await checkAndRequestPermission();
  };

  const initializeInterview = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('accessToken');
      
      if (!token) {
        Alert.alert('Error', 'Authentication required');
        return;
      }

      // Prepare request body based on mode
      const requestBody: any = {
        mode: isAiMode ? 'resume' : 'manual',
      };

      if (isAiMode && resumeAnalysis) {
        requestBody.resumeAnalysis = resumeAnalysis;
      } else {
        requestBody.position = selectedPosition;
        requestBody.domain = selectedDomain;
      }

      console.log('🚀 Starting interview with:', requestBody);

      const response = await fetch(`${API_URL}/api/ai-interview/start-contextual-interview`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to start interview');
      }

      const result = await response.json();
      console.log('✅ Interview started:', result);

      if (result.success && result.data) {
        setSessionId(result.data.sessionId);
        setInterviewId(result.data.interviewId);
        
        // Add first question to messages
        if (result.data.firstQuestion) {
          // Extract text from question object if it's an object
          const questionText = typeof result.data.firstQuestion === 'string' 
            ? result.data.firstQuestion 
            : result.data.firstQuestion.text;
          
          const aiMessage: Message = {
            id: Date.now().toString(),
            text: questionText,
            sender: 'ai',
            timestamp: new Date(),
          };
          setMessages([aiMessage]);
          
          // Play TTS for first question
          playTextToSpeech(questionText);
        }
      }
    } catch (error) {
      console.error('❌ Error starting interview:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to start interview'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputText.trim();
    
    if (!textToSend || !sessionId || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: textToSend,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const token = await AsyncStorage.getItem('accessToken');
      
      const response = await fetch(`${API_URL}/api/ai-interview/submit-contextual-answer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          answer: userMessage.text,
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to submit answer';
        try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
        } catch (e) {
            // response not json
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('📨 Answer response:', result);

      if (result.success && result.data) {
        // Check if interview should continue
        if (!result.data.shouldContinue) {
          setIsInterviewActive(false);
          const completionMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: "Thank you for completing the interview! We'll review your responses and get back to you soon. 🎉",
            sender: 'ai',
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, completionMessage]);
          
          // Complete interview
          setTimeout(() => {
            completeInterview();
          }, 2000);
        } else if (result.data.nextQuestion) {
          // Extract text from question object if it's an object
          const questionText = typeof result.data.nextQuestion === 'string' 
            ? result.data.nextQuestion 
            : result.data.nextQuestion.text;
          
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: questionText,
            sender: 'ai',
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, aiMessage]);
          
          // Play TTS for next question
          playTextToSpeech(questionText);
        }
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to send your response. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Text-to-Speech using Deepgram API
  const playTextToSpeech = async (text: string) => {
    let audioPath: string | null = null;
    try {
      // IMPORTANT: Stop any currently playing audio before starting new one
      // This prevents multiple voices playing simultaneously
      await audioRecorderPlayer.stopPlayer().catch(() => {});
      audioRecorderPlayer.removePlayBackListener();
      
      setIsPlayingAudio(true);
      console.log('🎤 Playing TTS for:', text.substring(0, 50) + '...');
      
      const token = await AsyncStorage.getItem('accessToken');
      audioPath = `${RNFS.CachesDirectoryPath}/tts_audio_${Date.now()}.wav`;
      
      // Download audio file using RNFS to cache directory
      const downloadResult = await RNFS.downloadFile({
        fromUrl: `${API_URL}/api/text-to-speech/synthesize?text=${encodeURIComponent(text)}&voice=aura-luna-en`,
        toFile: audioPath,
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }).promise;

      if (downloadResult.statusCode !== 200) {
        throw new Error(`Failed to synthesize speech: ${downloadResult.statusCode}`);
      }

      console.log('✅ Audio saved to cache:', audioPath);
      
      // Play the audio
      await audioRecorderPlayer.startPlayer(audioPath);
      
      const currentAudioPath = audioPath; // Capture for closure
      audioRecorderPlayer.addPlayBackListener((e) => {
        if (e.currentPosition >= e.duration && e.duration > 0) {
          console.log('🎵 Audio playback completed');
          audioRecorderPlayer.stopPlayer();
          audioRecorderPlayer.removePlayBackListener();
          setIsPlayingAudio(false);
          
          // Auto-cleanup: Delete temporary audio file from cache
          if (currentAudioPath) {
            RNFS.unlink(currentAudioPath)
              .then(() => console.log('🗑️ Temp audio file deleted from cache'))
              .catch(err => console.log('⚠️ Failed to delete temp audio file:', err));
          }
        }
      });
      
    } catch (error) {
      console.error('❌ TTS error:', error);
      setIsPlayingAudio(false);
      
      // Clean up audio file if it was created but playback failed
      if (audioPath) {
        RNFS.unlink(audioPath).catch(() => {});
      }
      
      // Don't show error to user, just log it (TTS is not critical for interview continuity)
      console.log('ℹ️ TTS failed but interview continues normally');
    }
  };

  // Start recording audio
  const startRecording = async () => {
    try {
      const audioPath = `${RNFS.CachesDirectoryPath}/interview_audio.wav`;
      
      const result = await audioRecorderPlayer.startRecorder(audioPath);
      setIsRecording(true);
      setRecordingPath(result);
      console.log('Recording started:', result);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please check microphone permissions.');
    }
  };

  // Stop recording and transcribe
  const stopRecordingAndTranscribe = async () => {
    try {
      const result = await audioRecorderPlayer.stopRecorder();
      setIsRecording(false);
      console.log('Recording stopped:', result);

      if (!recordingPath) {
        Alert.alert('Error', 'No recording found');
        return;
      }

      // Check if file exists before uploading
      const fileExists = await RNFS.exists(recordingPath);
      if (!fileExists) {
        console.error('❌ Recording file does not exist at:', recordingPath);
        Alert.alert('Error', 'Recording file not found. Please try recording again.');
        return;
      }

      // Upload to backend STT endpoint
      setIsLoading(true);
      const token = await AsyncStorage.getItem('accessToken');

      console.log('📤 Uploading audio from:', recordingPath);

      const formData = new FormData();
      formData.append('audio', {
        uri: Platform.OS === 'android' ? `file://${recordingPath}` : `file://${recordingPath}`,
        type: 'audio/wav',
        name: 'interview_audio.wav',
      } as any);

      const response = await fetch(`${API_URL}/api/speech-to-text/transcribe`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ Server error:', response.status, errorData);
        throw new Error(`Server error: ${errorData.error || errorData.message || response.statusText}`);
      }

      const data = await response.json();
      console.log('STT response:', data);

      if (data.success && data.transcript) {
        setInputText(data.transcript);
        
        // Clean up the recording file after successful transcription
        if (recordingPath) {
          RNFS.unlink(recordingPath).catch(() => {});
        }

        // Automatically send the transcribed message
        console.log('📨 Auto-sending transcribed message...');
        setIsLoading(false); // Reset loading before sending
        await handleSendMessage(data.transcript);
      } else {
        throw new Error('No transcript received');
      }
    } catch (error) {
      console.error('Transcription error:', error);
      Alert.alert(
        'Transcription Error',
        error instanceof Error ? error.message : 'Failed to transcribe audio. Please try again.'
      );
      setIsLoading(false);
    }
  };

  const completeInterview = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token || !sessionId) {
        throw new Error('Authentication or session missing');
      }

      const response = await fetch(`${API_URL}/api/ai-interview/complete-contextual-interview`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      const result = await response.json();
      console.log('✅ Interview completed result:', result);

      // Clean up temporary audio files from cache before navigating away
      console.log('🧹 Cleaning up cache before completing interview...');
      RNFS.readDir(RNFS.CachesDirectoryPath)
        .then(files => {
          const audioFiles = files.filter(file => 
            file.name.startsWith('tts_audio_') || file.name === 'interview_audio.wav'
          );
          return Promise.all(
            audioFiles.map(file => RNFS.unlink(file.path).catch(() => {}))
          );
        })
        .catch(() => {});

      // Navigate back or to results
      setTimeout(() => {
        if (onComplete && result.success) {
          onComplete(result.data?.feedback || result.data);
        } else if (onBack) {
          onBack();
        } else if (navigation) {
          navigation.navigate('Dashboard');
        }
      }, 2000);
    } catch (error) {
      console.error('Error completing interview:', error);
      if (onBack) onBack();
    }
  };

  const handleEndInterview = () => {
    Alert.alert(
      'End Interview',
      'Are you sure you want to end the interview? Your progress will be saved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End',
          style: 'destructive',
          onPress: () => {
            setIsInterviewActive(false);
            // Stop any playing audio
            if (isPlayingAudio) {
              audioRecorderPlayer.stopPlayer();
              audioRecorderPlayer.removePlayBackListener();
              setIsPlayingAudio(false);
            }
            // Stop recording if active
            if (isRecording) {
              audioRecorderPlayer.stopRecorder();
              setIsRecording(false);
            }
            completeInterview();
          },
        },
      ]
    );
  };

  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  // Cleanup audio resources and temporary files on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 Cleaning up audio resources...');
      
      // Stop any playing audio
      audioRecorderPlayer.stopPlayer().catch(() => {});
      audioRecorderPlayer.removePlayBackListener();
      
      // Stop recording if active
      audioRecorderPlayer.stopRecorder().catch(() => {});
      
      // Clean up all temporary TTS audio files from cache
      RNFS.readDir(RNFS.CachesDirectoryPath)
        .then(files => {
          const audioFiles = files.filter(file => 
            file.name.startsWith('tts_audio_') || file.name === 'interview_audio.wav'
          );
          console.log(`🗑️ Found ${audioFiles.length} temp audio files to clean up`);
          
          return Promise.all(
            audioFiles.map(file => 
              RNFS.unlink(file.path)
                .then(() => console.log(`✅ Deleted: ${file.name}`))
                .catch(() => {})
            )
          );
        })
        .catch(err => console.log('⚠️ Cache cleanup error:', err));
    };
  }, []);

  if (hasPermission === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="camera-off" size={64} color="#999" />
        <Text style={styles.errorText}>Camera Permission Required</Text>
        <Text style={styles.errorSubtext}>
          We need camera access to record your interview responses
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestCameraPermission}
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => Linking.openSettings()}
        >
          <Text style={styles.settingsButtonText}>Open Settings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Upper Half - Camera Placeholder */}
      <View style={styles.cameraContainer}>
        <View style={styles.cameraPlaceholder}>
          <Icon name="camera" size={80} color="#666" />
          <Text style={styles.cameraText}>Front Camera View</Text>
          <Text style={styles.cameraSubtext}>
            Camera will be enabled during live interview
          </Text>
        </View>
        <View style={styles.cameraOverlay}>
          {/* End interview button */}
          <TouchableOpacity
            style={styles.endButton}
            onPress={handleEndInterview}
          >
            <Icon name="stop-circle" size={24} color="#fff" />
            <Text style={styles.endButtonText}>End Interview</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Lower Half - Chat Interface */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Chat Header */}
        <View style={styles.chatHeader}>
          <Icon name="robot" size={24} color="#000" />
          <Text style={styles.chatHeaderText}>AI Interviewer</Text>
          {isPlayingAudio && (
            <View style={styles.audioIndicator}>
              <Icon name="volume-high" size={16} color="#000" />
              <Text style={styles.audioIndicatorText}>Speaking...</Text>
            </View>
          )}
          {isLoading && (
            <ActivityIndicator size="small" color="#000" style={styles.headerLoader} />
          )}
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageBubble,
                message.sender === 'user'
                  ? styles.userMessage
                  : styles.aiMessage,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  message.sender === 'user'
                    ? styles.userMessageText
                    : styles.aiMessageText,
                ]}
              >
                {message.text}
              </Text>
              <Text
                style={[
                  styles.messageTime,
                  message.sender === 'user'
                    ? styles.userMessageTime
                    : styles.aiMessageTime,
                ]}
              >
                {message.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          ))}
          {isLoading && (
            <View style={styles.typingIndicator}>
              <View style={styles.typingDot} />
              <View style={styles.typingDot} />
              <View style={styles.typingDot} />
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View style={styles.inputContainer}>
          {/* Voice Recording Button - Circular */}
          <TouchableOpacity
            style={[
              styles.voiceButton,
              isRecording && styles.voiceButtonRecording,
            ]}
            onPress={isRecording ? stopRecordingAndTranscribe : startRecording}
            disabled={!isInterviewActive || isLoading}
            activeOpacity={0.7}
          >
            <Icon
              name={isRecording ? 'stop-circle' : 'microphone'}
              size={32}
              color="#fff"
            />
          </TouchableOpacity>
          
          {/* Recording Status Text */}
          {isRecording && (
            <Text style={styles.recordingStatusText}>Recording...</Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: '600',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  permissionButton: {
    backgroundColor: '#000',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  settingsButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#000',
    marginTop: 12,
  },
  settingsButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  cameraContainer: {
    height: height * 0.5,
    backgroundColor: '#1a1a1a',
    position: 'relative',
  },
  cameraPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  cameraText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 15,
  },
  cameraSubtext: {
    color: '#999',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    padding: 20,
  },
  endButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  endButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  chatHeaderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginLeft: 10,
    flex: 1,
  },
  headerLoader: {
    marginLeft: 10,
  },
  audioIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  audioIndicatorText: {
    fontSize: 12,
    color: '#000',
    fontWeight: '500',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  messagesContent: {
    padding: 15,
    paddingBottom: 20,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  userMessage: {
    backgroundColor: '#000',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  aiMessage: {
    backgroundColor: '#f0f0f0',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#fff',
  },
  aiMessageText: {
    color: '#000',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  userMessageTime: {
    color: '#ccc',
    textAlign: 'right',
  },
  aiMessageTime: {
    color: '#666',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 16,
    alignSelf: 'flex-start',
    maxWidth: '80%',
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#666',
    marginRight: 6,
  },
  inputContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  voiceButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  voiceButtonRecording: {
    backgroundColor: '#dc2626',
  },
  recordingStatusText: {
    marginTop: 12,
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '600',
  },
});

export default InterviewScreen;
