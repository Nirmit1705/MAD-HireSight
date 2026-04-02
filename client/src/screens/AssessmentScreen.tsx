import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '../components/Header';
import { API_URL } from '../config';

interface AssessmentScreenProps {
  onContinuePrevious?: () => void;
  onStartNew?: () => void;
  showHeader: boolean;
  onProfilePress: () => void;
  onScroll: (event: any) => void;
}

const AssessmentScreen: React.FC<AssessmentScreenProps> = ({ 
  onContinuePrevious,
  onStartNew,
  showHeader,
  onProfilePress,
  onScroll,
}) => {
  const [hasPreviousScore, setHasPreviousScore] = useState(false);
  const [previousScore, setPreviousScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    checkPreviousAptitudeScore();
  }, []);

  const checkPreviousAptitudeScore = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('accessToken');
      
      if (!token) {
        setHasPreviousScore(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/aptitude/previous-score`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.hasScore) {
          setHasPreviousScore(true);
          setPreviousScore(data.score);
        } else {
          setHasPreviousScore(false);
        }
      } else {
        setHasPreviousScore(false);
      }
    } catch (error) {
      console.error('Error checking previous score:', error);
      setHasPreviousScore(false);
    } finally {
      setLoading(false);
    }
  };
  
  const handleContinuePrevious = () => {
    if (hasPreviousScore && onContinuePrevious) {
      onContinuePrevious();
    }
  };

  const handleStartNew = () => {
    if (onStartNew) {
      onStartNew();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Header */}
      <Header showHeader={showHeader} onProfilePress={onProfilePress} />
      
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {/* Header Section */}
        <View style={styles.headerCard}>
          <View style={styles.titleRow}>
            <Icon name="bullseye-arrow" size={32} color="#000" />
            <Text style={styles.headerTitle}>Official Assessment</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            Complete your assessment and get evaluated for your target role
          </Text>
        </View>

        {/* Continue with Previous Score Card */}
        <View style={[styles.optionCard, !hasPreviousScore && styles.optionCardDisabled]}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.iconContainer, !hasPreviousScore && styles.iconContainerDisabled]}>
              <Icon name="trophy-outline" size={32} color="#fff" />
            </View>
            <Text style={[styles.cardTitle, !hasPreviousScore && styles.cardTitleDisabled]}>
              Continue with Previous Score
            </Text>
          </View>
          
          <View style={styles.cardContent}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#000" />
                <Text style={styles.loadingText}>Checking previous scores...</Text>
              </View>
            ) : (
              <>
                <Text style={[styles.cardDescription, !hasPreviousScore && styles.cardDescriptionDisabled]}>
                  {hasPreviousScore 
                    ? `Use your previous aptitude score (${previousScore}%) and proceed to interview`
                    : 'No previous aptitude score found. Complete a new assessment first.'}
                </Text>
                
                {hasPreviousScore && (
                  <View style={styles.featuresGrid}>
                    <View style={styles.featureItem}>
                      <Icon name="check-circle-outline" size={16} color="#111827" />
                      <Text style={styles.featureText}>Skip aptitude test</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Icon name="check-circle-outline" size={16} color="#111827" />
                      <Text style={styles.featureText}>Use previous score</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Icon name="check-circle-outline" size={16} color="#111827" />
                      <Text style={styles.featureText}>Direct to interview</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Icon name="check-circle-outline" size={16} color="#111827" />
                      <Text style={styles.featureText}>Faster assessment</Text>
                    </View>
                  </View>
                )}

                <TouchableOpacity 
                  style={[styles.actionButton, !hasPreviousScore && styles.actionButtonDisabled]}
                  onPress={handleContinuePrevious}
                  activeOpacity={0.8}
                  disabled={!hasPreviousScore}
                >
                  <Text style={[styles.actionButtonText, !hasPreviousScore && styles.actionButtonTextDisabled]}>
                    Continue Assessment
                  </Text>
                  <Icon name="arrow-right" size={20} color={hasPreviousScore ? "#fff" : "#9ca3af"} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Complete New Assessment Card */}
        <View style={styles.optionCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.iconContainer}>
              <Icon name="brain" size={32} color="#fff" />
            </View>
            <Text style={styles.cardTitle}>Complete New Assessment</Text>
          </View>
          
          <View style={styles.cardContent}>
            <Text style={styles.cardDescription}>
              Take a fresh aptitude test followed by interview
            </Text>
            
            {/* Features Grid */}
            <View style={styles.featuresGrid}>
               <View style={styles.featureItem}>
                <Icon name="check-circle-outline" size={16} color="#111827" />
                <Text style={styles.featureText}>New aptitude test</Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="check-circle-outline" size={16} color="#111827" />
                <Text style={styles.featureText}>Fresh interview questions</Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="check-circle-outline" size={16} color="#111827" />
                <Text style={styles.featureText}>Complete evaluation</Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="check-circle-outline" size={16} color="#111827" />
                <Text style={styles.featureText}>Results saved to profile</Text>
              </View>
            </View>

            {/* Action Button */}
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleStartNew}
              activeOpacity={0.8}
            >
              <Text style={styles.actionButtonText}>Start New Assessment</Text>
              <Icon name="arrow-right" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Information Bottom Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Icon name="information-outline" size={24} color="#111827" />
            <Text style={styles.infoTitle}>Assessment Information</Text>
          </View>
          
          <View style={styles.infoList}>
            <View style={styles.infoItem}>
              <Text style={styles.infoBullet}>•</Text>
              <Text style={styles.infoText}>
                Official assessments are saved to your profile and count towards your performance history
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoBullet}>•</Text>
              <Text style={styles.infoText}>
                Results are analyzed by our AI system to provide detailed feedback
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoBullet}>•</Text>
              <Text style={styles.infoText}>
                You can retake assessments anytime to improve your scores
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoBullet}>•</Text>
              <Text style={styles.infoText}>
                Using previous aptitude scores allows you to focus on interview preparation
              </Text>
            </View>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 92,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  headerCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#9ca3af',
    lineHeight: 24,
  },
  optionCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 0.05,
    // shadowRadius: 10,
    // elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  iconContainer: {
    width: 60,
    height: 60,
    backgroundColor: '#000',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    gap: 12,
  },
  cardTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  cardDescription: {
    fontSize: 15,
    color: '#6b7280',
    lineHeight: 22,
    marginBottom: 8,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%', // Roughly 2 columns
    gap: 8,
    marginBottom: 4,
  },
  featureText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  actionButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  actionButtonDisabled: {
    backgroundColor: '#e5e7eb',
  },
  actionButtonTextDisabled: {
    color: '#9ca3af',
  },
  optionCardDisabled: {
    opacity: 0.6,
    borderColor: '#d1d5db',
  },
  iconContainerDisabled: {
    backgroundColor: '#9ca3af',
  },
  cardTitleDisabled: {
    color: '#9ca3af',
  },
  cardDescriptionDisabled: {
    color: '#9ca3af',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#000',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  infoList: {
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    gap: 12,
  },
  infoBullet: {
    fontSize: 20,
    color: '#111827',
    fontWeight: 'bold',
    lineHeight: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
  },
  bottomSpacing: {
    height: 160,
  },
});

export default AssessmentScreen;
