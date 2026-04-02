import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { DocumentPickerResponse } from 'react-native-document-picker';
import { ResumeAnalysis } from '../services/aiInterviewAPI';

interface ResumeUploadProps {
  uploadedFile: DocumentPickerResponse | null;
  isProcessingResume: boolean;
  resumeAnalysis: ResumeAnalysis | null;
  onFileUpload: () => void;
  onRemoveFile: () => void;
}

export const ResumeUpload: React.FC<ResumeUploadProps> = ({
  uploadedFile,
  isProcessingResume,
  resumeAnalysis,
  onFileUpload,
  onRemoveFile,
}) => {
  const handleRemoveWithConfirmation = () => {
    Alert.alert(
      'Remove Resume',
      'Are you sure you want to upload a different resume?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: onRemoveFile },
      ]
    );
  };

  // Initial upload state
  if (!uploadedFile && !isProcessingResume && !resumeAnalysis) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upload Your Resume</Text>
        <View style={styles.uploadContainer}>
          <TouchableOpacity
            onPress={onFileUpload}
            style={styles.uploadBox}
            activeOpacity={0.7}
          >
            <View style={styles.uploadIconContainer}>
              <Icon name="upload" size={32} color="#9CA3AF" />
            </View>
            <Text style={styles.uploadTitle}>Upload your resume</Text>
            <Text style={styles.uploadDescription}>
              Our AI will analyze your background and create personalized interview questions
            </Text>
            <View style={styles.uploadButton}>
              <Text style={styles.uploadButtonText}>Choose File</Text>
            </View>
            <Text style={styles.uploadFormats}>
              Supported formats: PDF, Word documents, or images (JPG, PNG)
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Processing state
  if (isProcessingResume) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upload Your Resume</Text>
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" style={styles.processingSpinner} />
          <Text style={styles.processingTitle}>Processing your resume...</Text>
          <Text style={styles.processingDescription}>
            Our AI is analyzing your background to create personalized interview questions.
            This may take a few moments.
          </Text>
        </View>
      </View>
    );
  }

  // File uploaded but not yet analyzed
  if (uploadedFile && !isProcessingResume && !resumeAnalysis) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upload Your Resume</Text>
        <View style={styles.fileUploadedContainer}>
          <View style={styles.fileInfo}>
            <Icon name="file-text" size={32} color="#6B7280" />
            <View style={styles.fileDetails}>
              <Text style={styles.fileName}>{uploadedFile.name}</Text>
              <Text style={styles.fileSize}>
                {uploadedFile.size ? `${(uploadedFile.size / 1024 / 1024).toFixed(2)} MB` : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={onRemoveFile} style={styles.removeButton}>
              <Icon name="x" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Resume analysis complete
  if (resumeAnalysis) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upload Your Resume</Text>
        <View style={styles.analysisContainer}>
          <View style={styles.analysisHeader}>
            <View style={styles.successIcon}>
              <Icon name="check" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.analysisTitle}>Resume Analysis Complete!</Text>
            <Text style={styles.analysisSubtitle}>
              Your personalized AI interview is ready
            </Text>
          </View>

          <View style={styles.analysisDetails}>
            <View style={styles.analysisRow}>
              <View style={styles.analysisItem}>
                <Text style={styles.analysisLabel}>Detected Domain</Text>
                <View style={styles.analysisBadge}>
                  <Text style={styles.analysisBadgeText}>{resumeAnalysis.domain}</Text>
                </View>
              </View>
              <View style={styles.analysisItem}>
                <Text style={styles.analysisLabel}>Experience Level</Text>
                <View style={styles.analysisBadge}>
                  <Text style={styles.analysisBadgeText}>{resumeAnalysis.experience}</Text>
                </View>
              </View>
            </View>

            {resumeAnalysis.skills && resumeAnalysis.skills.length > 0 && (
              <View style={styles.skillsSection}>
                <Text style={styles.analysisLabel}>Key Skills Identified</Text>
                <View style={styles.skillsContainer}>
                  {resumeAnalysis.skills.slice(0, 8).map((skill: string, index: number) => (
                    <View key={index} style={styles.skillBadge}>
                      <Text style={styles.skillBadgeText}>{skill}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>

          {uploadedFile && (
            <View style={styles.fileFooter}>
              <View style={styles.fileNameContainer}>
                <Icon name="file-text" size={16} color="#10B981" />
                <Text style={styles.fileNameFooter}>{uploadedFile.name}</Text>
              </View>
              <TouchableOpacity onPress={handleRemoveWithConfirmation}>
                <Text style={styles.changeResumeButton}>Upload different resume</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 16,
    color: '#000000',
  },
  uploadContainer: {
    marginTop: 8,
  },
  uploadBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 48,
    alignItems: 'center',
  },
  uploadIconContainer: {
    width: 64,
    height: 64,
    backgroundColor: '#F3F4F6',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  uploadTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000000',
  },
  uploadDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  uploadButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  uploadFormats: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  processingContainer: {
    backgroundColor: '#EFF6FF',
    borderWidth: 2,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  processingSpinner: {
    marginBottom: 16,
  },
  processingTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 8,
  },
  processingDescription: {
    fontSize: 14,
    color: '#2563EB',
    textAlign: 'center',
    lineHeight: 20,
  },
  fileUploadedContainer: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileDetails: {
    flex: 1,
    marginLeft: 12,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  fileSize: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  removeButton: {
    padding: 4,
  },
  analysisContainer: {
    backgroundColor: '#ECFDF5',
    borderWidth: 2,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 24,
  },
  analysisHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  successIcon: {
    width: 64,
    height: 64,
    backgroundColor: '#10B981',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  analysisTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#065F46',
    marginBottom: 8,
  },
  analysisSubtitle: {
    fontSize: 14,
    color: '#059669',
  },
  analysisDetails: {
    gap: 16,
  },
  analysisRow: {
    flexDirection: 'row',
    gap: 16,
  },
  analysisItem: {
    flex: 1,
  },
  analysisLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
    marginBottom: 8,
  },
  analysisBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  analysisBadgeText: {
    fontSize: 14,
    color: '#047857',
  },
  skillsSection: {
    marginTop: 8,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
  },
  skillBadgeText: {
    fontSize: 12,
    color: '#047857',
  },
  fileFooter: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#A7F3D0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fileNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fileNameFooter: {
    fontSize: 14,
    color: '#047857',
  },
  changeResumeButton: {
    fontSize: 14,
    color: '#059669',
    textDecorationLine: 'underline',
  },
});
