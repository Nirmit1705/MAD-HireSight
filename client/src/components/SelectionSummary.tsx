import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Position, Domain } from '../services/metadataAPI';
import { ResumeAnalysis } from '../services/aiInterviewAPI';

interface SelectionSummaryProps {
  selectionMode: 'manual' | 'resume';
  selectedPosition: string;
  selectedDomain: string;
  positions: Position[];
  domains: Domain[];
  resumeAnalysis: ResumeAnalysis | null;
}

export const SelectionSummary: React.FC<SelectionSummaryProps> = ({
  selectionMode,
  selectedPosition,
  selectedDomain,
  positions,
  domains,
  resumeAnalysis,
}) => {
  const shouldShow =
    (selectionMode === 'manual' && (selectedPosition || selectedDomain)) ||
    (selectionMode === 'resume' && resumeAnalysis);

  if (!shouldShow) {
    return null;
  }

  const getPositionTitle = () => {
    const position = positions.find((p) => p.id === selectedPosition);
    return position?.title || '';
  };

  const getDomainTitle = () => {
    const domain = domains.find((d) => d.id === selectedDomain);
    return domain?.title || '';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Selection</Text>
      <View style={styles.content}>
        {selectionMode === 'manual' ? (
          <>
            {selectedPosition && (
              <View style={styles.row}>
                <Text style={styles.label}>Position: </Text>
                <Text style={styles.value}>{getPositionTitle()}</Text>
              </View>
            )}
            {selectedDomain && (
              <View style={styles.row}>
                <Text style={styles.label}>Domain: </Text>
                <Text style={styles.value}>{getDomainTitle()}</Text>
              </View>
            )}
            <View style={styles.row}>
              <Text style={styles.label}>Interview Type: </Text>
              <Text style={styles.value}>Standard Interview</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>Domain: </Text>
              <Text style={styles.value}>{resumeAnalysis?.domain}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Experience: </Text>
              <Text style={styles.value}>{resumeAnalysis?.experience}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Interview Type: </Text>
              <Text style={styles.value}>AI-Powered Personalized Interview</Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 32,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#000000',
  },
  content: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  label: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: '#6B7280',
  },
});
