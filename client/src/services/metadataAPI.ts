import { API_URL } from '../config';

export interface Position {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface Domain {
  id: string;
  title: string;
}

class MetadataAPI {
  async getPositions(): Promise<Position[]> {
    try {
      const response = await fetch(`${API_URL}/api/metadata/positions`);
      if (!response.ok) {
        throw new Error('Failed to fetch positions');
      }
      const result = await response.json();
      return result.data?.positions || result.positions || [];
    } catch (error) {
      console.error('Error fetching positions:', error);
      throw error;
    }
  }

  async getDomains(): Promise<Domain[]> {
    try {
      const response = await fetch(`${API_URL}/api/metadata/domains`);
      if (!response.ok) {
        throw new Error('Failed to fetch domains');
      }
      const result = await response.json();
      return result.data?.domains || result.domains || [];
    } catch (error) {
      console.error('Error fetching domains:', error);
      throw error;
    }
  }
}

export const metadataAPI = new MetadataAPI();
