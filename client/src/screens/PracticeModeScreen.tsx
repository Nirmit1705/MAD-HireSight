import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../components/Header';

interface PracticeModeScreenProps {
  onStartPractice?: () => void;
  showHeader: boolean;
  onProfilePress: () => void;
  onScroll: (event: any) => void;
}

const PracticeModeScreen: React.FC<PracticeModeScreenProps> = ({ 
  onStartPractice,
  showHeader,
  onProfilePress,
  onScroll,
}) => {
  const handleStartPractice = () => {
    // Navigate to practice aptitude test
    if (onStartPractice) {
      onStartPractice();
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
            <Icon name="book-open-variant" size={32} color="#000" />
            <Text style={styles.headerTitle}>Practice Mode</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            Improve your skills without affecting your official scores
          </Text>
        </View>

        {/* Aptitude Practice Card */}
        <View style={styles.practiceCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.practiceIconContainer}>
              <Icon name="brain" size={36} color="#fff" />
            </View>
            <Text style={styles.practiceTitle}>Aptitude Practice</Text>
          </View>
          
          <View style={styles.practiceContent}>
            <Text style={styles.practiceDescription}>
              Practice aptitude questions without affecting your scores
            </Text>
            
            {/* Features List */}
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <View style={styles.bulletPoint} />
                <Text style={styles.featureText}>No time limit</Text>
              </View>
              
              <View style={styles.featureItem}>
                <View style={styles.bulletPoint} />
                <Text style={styles.featureText}>Immediate feedback</Text>
              </View>
              
              <View style={styles.featureItem}>
                <View style={styles.bulletPoint} />
                <Text style={styles.featureText}>Results not saved</Text>
              </View>
              
              <View style={styles.featureItem}>
                <View style={styles.bulletPoint} />
                <Text style={styles.featureText}>Unlimited attempts</Text>
              </View>
            </View>

            {/* Start Practice Button */}
            <TouchableOpacity 
              style={styles.startButton}
              onPress={handleStartPractice}
              activeOpacity={0.8}
            >
              <Text style={styles.startButtonText}>Start Practice</Text>
              <Icon name="arrow-right" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Practice Mode Benefits Card */}
        <View style={styles.benefitsCard}>
          <View style={styles.benefitsHeader}>
            <Icon name="book-open-variant" size={24} color="#111827" />
            <Text style={styles.benefitsTitle}>Practice Mode Benefits</Text>
          </View>
          
          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitBullet}>•</Text>
              <Text style={styles.benefitText}>
                Practice as many times as you want without time pressure
              </Text>
            </View>
            
            <View style={styles.benefitItem}>
              <Text style={styles.benefitBullet}>•</Text>
              <Text style={styles.benefitText}>
                Get instant feedback on your answers
              </Text>
            </View>
            
            <View style={styles.benefitItem}>
              <Text style={styles.benefitBullet}>•</Text>
              <Text style={styles.benefitText}>
                Your practice scores won't affect your official assessment results
              </Text>
            </View>
            
            <View style={styles.benefitItem}>
              <Text style={styles.benefitBullet}>•</Text>
              <Text style={styles.benefitText}>
                Perfect for learning and skill improvement
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
    // paddingBottom: 10,
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
    gap: 12,
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
  practiceCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  practiceIconContainer: {
    width: 60,
    height: 60,
    backgroundColor: '#000',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    // marginBottom: 20, // Removed to match Assessment layout
  },
  practiceContent: {
    gap: 16,
  },
  practiceTitle: {
    flex: 1,
    fontSize: 26,
    fontWeight: 'bold',
    color: '#111827',
  },
  practiceDescription: {
    fontSize: 15,
    color: '#6b7280',
    lineHeight: 22,
  },
  featuresList: {
    gap: 12,
    marginTop: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#111827',
  },
  featureText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '400',
  },
  startButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  benefitsCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#000',
  },
  benefitsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  benefitsList: {
    gap: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    gap: 12,
  },
  benefitBullet: {
    fontSize: 20,
    color: '#111827',
    fontWeight: 'bold',
    lineHeight: 24,
  },
  benefitText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
  },
  bottomSpacing: {
    height: 160,
  },
});

export default PracticeModeScreen;
