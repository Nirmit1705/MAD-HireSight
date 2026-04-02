import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ModeToggleProps {
  selectionMode: 'manual' | 'resume';
  onModeChange: (mode: 'manual' | 'resume') => void;
}

export const ModeToggle: React.FC<ModeToggleProps> = ({
  selectionMode,
  onModeChange,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          onPress={() => onModeChange('manual')}
          style={[
            styles.toggleButton,
            selectionMode === 'manual' && styles.toggleButtonActive,
          ]}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.toggleText,
              selectionMode === 'manual' && styles.toggleTextActive,
            ]}
          >
            Manual Selection
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => onModeChange('resume')}
          style={[
            styles.toggleButton,
            selectionMode === 'resume' && styles.toggleButtonActive,
          ]}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.toggleText,
              selectionMode === 'resume' && styles.toggleTextActive,
            ]}
          >
            Upload Resume
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 24,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
});
