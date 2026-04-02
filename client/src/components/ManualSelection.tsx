import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { Position, Domain } from '../services/metadataAPI';

interface ManualSelectionProps {
  positions: Position[];
  domains: Domain[];
  selectedPosition: string;
  selectedDomain: string;
  onPositionSelect: (positionId: string) => void;
  onDomainSelect: (domainId: string) => void;
  loading: boolean;
  error: string | null;
}

const iconMap: { [key: string]: string } = {
  'Code': 'code',
  'Database': 'database',
  'Settings': 'settings',
  'PieChart': 'pie-chart',
  'Briefcase': 'briefcase',
  'Users': 'users',
};

export const ManualSelection: React.FC<ManualSelectionProps> = ({
  positions,
  domains,
  selectedPosition,
  selectedDomain,
  onPositionSelect,
  onDomainSelect,
  loading,
  error,
}) => {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000000" />
        <Text style={styles.loadingText}>Loading options...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View>
      {/* Position Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Position</Text>
        <View style={styles.grid}>
          {positions.map((position) => {
            const iconName = iconMap[position.icon] || 'code';
            const isSelected = selectedPosition === position.id;

            return (
              <TouchableOpacity
                key={position.id}
                onPress={() => onPositionSelect(position.id)}
                style={[
                  styles.card,
                  isSelected && styles.cardSelected,
                ]}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.iconContainer,
                      isSelected && styles.iconContainerSelected,
                    ]}
                  >
                    <Icon
                      name={iconName}
                      size={24}
                      color={isSelected ? '#FFFFFF' : '#000000'}
                    />
                  </View>
                  <Text style={styles.cardTitle}>{position.title}</Text>
                </View>
                <Text style={styles.cardDescription}>{position.description}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Domain Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Domain</Text>
        <View style={styles.grid}>
          {domains.map((domain) => {
            const isSelected = selectedDomain === domain.id;

            return (
              <TouchableOpacity
                key={domain.id}
                onPress={() => onDomainSelect(domain.id)}
                style={[
                  styles.domainCard,
                  isSelected && styles.domainCardSelected,
                ]}
                activeOpacity={0.7}
              >
                <View style={styles.domainHeader}>
                  <View
                    style={[
                      styles.domainIndicator,
                      isSelected && styles.domainIndicatorSelected,
                    ]}
                  />
                  <Text style={styles.domainTitle}>{domain.title}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 16,
    color: '#000000',
  },
  grid: {
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardSelected: {
    borderColor: '#000000',
    backgroundColor: '#F9FAFB',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconContainerSelected: {
    backgroundColor: '#000000',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },
  cardDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  domainCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  domainCardSelected: {
    borderColor: '#000000',
    backgroundColor: '#F9FAFB',
  },
  domainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  domainIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#9CA3AF',
    marginRight: 12,
  },
  domainIndicatorSelected: {
    backgroundColor: '#000000',
  },
  domainTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
});
