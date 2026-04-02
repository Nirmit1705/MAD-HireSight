import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DocumentPicker, { DocumentPickerResponse } from 'react-native-document-picker';
import { aiInterviewAPI, ResumeAnalysis } from '../services/aiInterviewAPI';

export const useResumeUpload = (
  setResumeAnalysis?: (analysis: ResumeAnalysis | null) => void,
  setIsAiMode?: (isAi: boolean) => void
) => {
  const [uploadedFile, setUploadedFile] = useState<DocumentPickerResponse | null>(null);
  const [isProcessingResume, setIsProcessingResume] = useState(false);
  const [localResumeAnalysis, setLocalResumeAnalysis] = useState<ResumeAnalysis | null>(null);

  const handleFileUpload = async () => {
    try {
      const result = await DocumentPicker.pick({
        type: [
          DocumentPicker.types.pdf,
          DocumentPicker.types.doc,
          DocumentPicker.types.docx,
          DocumentPicker.types.images,
        ],
      });

      const file = result[0];
      setUploadedFile(file);
      await processResume(file);
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        console.error('Document picker error:', err);
      }
    }
  };

  const processResume = async (file: DocumentPickerResponse) => {
    setIsProcessingResume(true);
    try {
      console.log('📄 Starting resume processing...');
      console.log('File details:', {
        name: file.name,
        type: file.type,
        size: file.size,
        uri: file.uri
      });
      
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Please log in to upload resume');
      }

      // Convert DocumentPickerResponse to File-like object for upload
      const fileToUpload = {
        uri: file.uri,
        type: file.type || 'application/octet-stream',
        name: file.name || 'resume',
      };

      console.log('🚀 Uploading resume to server...');
      const result = await aiInterviewAPI.uploadResume(fileToUpload as any);
      
      console.log('✅ Resume processing complete!');
      console.log('Analysis result:', {
        domain: result.analysis?.domain,
        experience: result.analysis?.experience,
        skillsCount: result.analysis?.skills?.length || 0,
        projectsCount: result.analysis?.projects?.length || 0
      });
      
      setLocalResumeAnalysis(result.analysis);
      
      if (setResumeAnalysis) {
        setResumeAnalysis(result.analysis);
      }
      if (setIsAiMode) {
        setIsAiMode(true);
      }
    } catch (error) {
      console.error('❌ Resume processing error:', error);
      throw error;
    } finally {
      setIsProcessingResume(false);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setLocalResumeAnalysis(null);
    if (setResumeAnalysis) {
      setResumeAnalysis(null);
    }
    if (setIsAiMode) {
      setIsAiMode(false);
    }
  };

  return {
    uploadedFile,
    isProcessingResume,
    resumeAnalysis: localResumeAnalysis,
    handleFileUpload,
    handleRemoveFile,
  };
};
