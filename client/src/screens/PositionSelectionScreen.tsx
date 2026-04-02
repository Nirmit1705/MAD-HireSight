import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { ResumeAnalysis } from '../services/aiInterviewAPI';
import { useMetadata } from '../hooks/useMetadata';
import { useResumeUpload } from '../hooks/useResumeUpload';
import { ModeToggle } from '../components/ModeToggle';
import { ManualSelection } from '../components/ManualSelection';
import { ResumeUpload } from '../components/ResumeUpload';
import { SelectionSummary } from '../components/SelectionSummary';
import Header from '../components/Header';

interface PositionSelectionScreenProps {
  navigation?: any;
  route?: {
    params?: {
      fromContinueAssessment?: boolean;
    };
  };
  onNavigate?: (page: string) => void;
  onBack?: () => void;
  selectedPosition: string;
  setSelectedPosition: (position: string) => void;
  selectedDomain: string;
  setSelectedDomain: (domain: string) => void;
  setResumeAnalysis?: (analysis: ResumeAnalysis | null) => void;
  setIsAiMode?: (isAi: boolean) => void;
  showHeader: boolean;
  onProfilePress: () => void;
  onScroll: (event: any) => void;
}

const PositionSelectionScreen: React.FC<PositionSelectionScreenProps> = ({
  navigation,
  route,
  onNavigate,
  onBack,
  selectedPosition,
  setSelectedPosition,
  selectedDomain,
  setSelectedDomain,
  setResumeAnalysis,
  setIsAiMode,
  showHeader,
  onProfilePress,
  onScroll,
}) => {
  const fromContinueAssessment = route?.params?.fromContinueAssessment || false;
  const [selectionMode, setSelectionMode] = useState<'manual' | 'resume'>('manual');

  // Use custom hooks
  const { positions, domains, loading, error } = useMetadata();
  const {
    uploadedFile,
    isProcessingResume,
    resumeAnalysis,
    handleFileUpload,
    handleRemoveFile,
  } = useResumeUpload(setResumeAnalysis, setIsAiMode);

  const handleProceed = () => {
    if (selectionMode === 'manual' && selectedPosition && selectedDomain) {
      // Manual selection mode
      if (setIsAiMode) {
        setIsAiMode(false);
      }
      
      if (onNavigate) {
        onNavigate('interviewFlow');
      } else if (navigation) {
        navigation.navigate('InterviewFlow', {
          selectedPosition,
          selectedDomain,
          isAiMode: false,
        });
      }
    } else if (selectionMode === 'resume' && resumeAnalysis) {
      // Resume-based mode - proceed directly to contextual AI interview
      if (setIsAiMode) {
        setIsAiMode(true);
      }
      
      if (onNavigate) {
        onNavigate('interviewFlow');
      } else if (navigation) {
        navigation.navigate('InterviewFlow', {
          resumeAnalysis,
          isAiMode: true,
        });
      }
    }
  };

  const canProceed = () => {
    if (selectionMode === 'manual') {
      return selectedPosition && selectedDomain && !loading;
    } else {
      return resumeAnalysis && !isProcessingResume;
    }
  };

  const handleFileUploadWithError = async () => {
    try {
      await handleFileUpload();
    } catch (error) {
      Alert.alert(
        'Upload Failed',
        `Failed to process resume: ${error instanceof Error ? error.message : 'Unknown error'}`,
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Header */}
      <Header showHeader={showHeader} onProfilePress={onProfilePress} />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {/* Back Button */}
        {onBack && (
          <TouchableOpacity 
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <Icon name="arrow-left" size={24} color="#000" />
            <Text style={styles.backButtonText}>Back to Assessment</Text>
          </TouchableOpacity>
        )}
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Choose Your Interview Approach</Text>
          <Text style={styles.headerSubtitle}>
            Select your role manually or upload your resume for AI-powered personalized questions
          </Text>
          {fromContinueAssessment && (
            <View style={styles.assessmentNotice}>
              <Text style={styles.assessmentNoticeText}>
                Using your previous aptitude score - proceeding directly to interview
              </Text>
            </View>
          )}
        </View>

        {/* Mode Toggle */}
        <ModeToggle
          selectionMode={selectionMode}
          onModeChange={setSelectionMode}
        />

        {/* Content based on selection mode */}
        {selectionMode === 'manual' ? (
          <ManualSelection
            positions={positions}
            domains={domains}
            selectedPosition={selectedPosition}
            selectedDomain={selectedDomain}
            onPositionSelect={setSelectedPosition}
            onDomainSelect={setSelectedDomain}
            loading={loading}
            error={error}
          />
        ) : (
          <ResumeUpload
            uploadedFile={uploadedFile}
            isProcessingResume={isProcessingResume}
            resumeAnalysis={resumeAnalysis}
            onFileUpload={handleFileUploadWithError}
            onRemoveFile={handleRemoveFile}
          />
        )}

        {/* Action Button */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            onPress={handleProceed}
            disabled={!canProceed()}
            style={[
              styles.proceedButton,
              !canProceed() && styles.proceedButtonDisabled,
            ]}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.proceedButtonText,
                !canProceed() && styles.proceedButtonTextDisabled,
              ]}
            >
              {selectionMode === 'resume'
                ? 'Start AI Interview'
                : 'Start Interview'}
            </Text>
            <Icon
              name="arrow-right"
              size={20}
              color={canProceed() ? '#FFFFFF' : '#9CA3AF'}
            />
          </TouchableOpacity>
        </View>

        {/* Selection Summary */}
        <SelectionSummary
          selectionMode={selectionMode}
          selectedPosition={selectedPosition}
          selectedDomain={selectedDomain}
          positions={positions}
          domains={domains}
          resumeAnalysis={resumeAnalysis}
        />

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 92,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 48,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
    color: '#000000',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  assessmentNotice: {
    marginTop: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 8,
    padding: 12,
    maxWidth: 400,
  },
  assessmentNoticeText: {
    fontSize: 14,
    color: '#000000',
    textAlign: 'center',
  },
  actionContainer: {
    marginTop: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  proceedButton: {
    backgroundColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    minWidth: 280,
  },
  proceedButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  proceedButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  proceedButtonTextDisabled: {
    color: '#9CA3AF',
  },
  bottomSpacing: {
    height: 160,
  },
});

export default PositionSelectionScreen;
