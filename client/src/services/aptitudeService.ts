import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

const API_BASE_URL = `${API_URL}/api/aptitude`;

export interface Question {
  id: number;
  questionText: string;
  options: string[];
  correctOption?: number; // Backend sends 0-based index
  explanation?: string;
  category: string;
  difficulty: string;
}

export class AptitudeService {
  static async getPracticeQuestions(position: string = 'FRONTEND_DEVELOPER'): Promise<Question[]> {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/practice-questions?position=${position}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      
      if (data.success) {
        return data.data.questions;
      } else {
        throw new Error(data.message || 'Failed to fetch questions');
      }
    } catch (error) {
      console.error('Error fetching practice questions:', error);
      throw error;
    }
  }
}
