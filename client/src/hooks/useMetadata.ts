import { useState, useEffect } from 'react';
import { metadataAPI, Position, Domain } from '../services/metadataAPI';

export const useMetadata = () => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setLoading(true);
        const [positionsData, domainsData] = await Promise.all([
          metadataAPI.getPositions(),
          metadataAPI.getDomains()
        ]);
        setPositions(positionsData);
        setDomains(domainsData);
      } catch (err) {
        console.error('Error fetching metadata:', err);
        setError('Failed to load positions and domains');
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, []);

  return { positions, domains, loading, error };
};
