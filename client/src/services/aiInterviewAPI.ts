import { API_URL } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ResumeAnalysis {
  domain: string;
  experience: string;
  skills: string[];
  education: string[];
  certifications: string[];
  projects: string[];
  workExperience: string[];
  achievements: string[];
  technologies: string[];
  keywords: string[];
}

export interface UploadResumeResponse {
  success: boolean;
  analysis: ResumeAnalysis;
  message?: string;
}

class AIInterviewAPI {
  async uploadResume(file: any): Promise<UploadResumeResponse> {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Authentication required');
      }

      const formData = new FormData();
      formData.append('resume', {
        uri: file.uri,
        type: file.type,
        name: file.name,
      } as any);

      console.log('📤 Sending resume to:', `${API_URL}/api/ai-interview/upload-resume`);
      
      const response = await fetch(`${API_URL}/api/ai-interview/upload-resume`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      console.log('📥 Server response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Upload failed:', errorData);
        throw new Error(errorData.message || 'Failed to upload resume');
      }

      const result = await response.json();
      console.log('✅ Upload successful, parsing response...');
      console.log('Raw server response:', JSON.stringify(result, null, 2));
      
      // Server returns {success, data: {analysis, extractedText, message}}
      // Transform to expected format {success, analysis}
      const transformedResult = {
        success: result.success,
        analysis: result.data?.analysis || result.analysis,
        message: result.data?.message || result.message
      };
      
      console.log('📊 Parsed analysis:', {
        domain: transformedResult.analysis?.domain,
        experience: transformedResult.analysis?.experience,
        skillsCount: transformedResult.analysis?.skills?.length || 0
      });
      
      return transformedResult;
    } catch (error) {
      console.error('❌ Error uploading resume:', error);
      throw error;
    }
  }
}

export const aiInterviewAPI = new AIInterviewAPI();
