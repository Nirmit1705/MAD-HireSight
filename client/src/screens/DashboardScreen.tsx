import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Animated,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import BottomNavBar from '../components/BottomNavBar';
import PerformanceChart from '../components/PerformanceChart';
import ProfileScreen from './ProfileScreen';
import { AuthService } from '../services/authService';

const { width } = Dimensions.get('window');

interface DashboardScreenProps {
  onLogout?: () => void;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const headerAnimation = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(headerAnimation, {
      toValue: showHeader ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [showHeader]);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    // Refresh user data when returning from profile screen
    if (activeTab === 'Dashboard') {
      loadUserData();
    }
  }, [activeTab]);

  const loadUserData = async () => {
    const userData = await AuthService.getUser();
    if (userData) {
      setUser(userData);
    }
  };

  const handleScroll = (event: any) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    if (currentScrollY > lastScrollY && currentScrollY > 50) {
      setShowHeader(false);
    } else if (currentScrollY < lastScrollY) {
      setShowHeader(true);
    }
    setLastScrollY(currentScrollY);
  };

  // Render Profile Screen if active
  if (activeTab === 'Profile') {
    return (
      <ProfileScreen 
        onBack={() => setActiveTab('Dashboard')} 
        onLogout={() => onLogout && onLogout()} 
      />
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Header */}
      <Animated.View style={[
        styles.header,
        {
          opacity: headerAnimation,
          transform: [{
            translateY: headerAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [-100, 0],
            })
          }]
        }
      ]}>
        <View style={styles.headerLeft}>
          <Image source={require('../assets/logo.png')} style={styles.logoImage} />
          <Text style={styles.headerTitle}>HireSight</Text>
        </View>
        <TouchableOpacity style={styles.profileButton} onPress={() => setActiveTab('Profile')}>
          <Icon name="account-circle" size={50} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView 
        style={[styles.scrollView, !showHeader && styles.scrollViewNoHeader]} 
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Welcome Section with Gradient Card */}
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeContent}>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.name || 'User'}!</Text>
            <Text style={styles.subtitle}>Track your progress and improve your interview skills</Text>
          </View>
        </View>

        {/* Stats Cards Grid - Modern Design */}
        <View style={styles.statsGrid}>
          {/* Aptitude Score Card */}
          <View style={[styles.statCard]}>
            <View style={styles.statIconCircle}>
              <Icon name="brain" size={28} color="#fff" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>50%</Text>
              <Text style={styles.statLabel}>Aptitude</Text>
            </View>
          </View>

          {/* Interview Score Card */}
          <View style={[styles.statCard]}>
            <View style={styles.statIconCircle}>
              <Icon name="video" size={28} color="#fff" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>87%</Text>
              <Text style={styles.statLabel}>Interview</Text>
            </View>
          </View>

          {/* Overall Performance Card */}
          <View style={[styles.statCard]}>
            <View style={styles.statIconCircle}>
              <Icon name="chart-line" size={28} color="#fff" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>73%</Text>
              <Text style={styles.statLabel}>Overall</Text>
            </View>
          </View>

          {/* Completed Sessions Card */}
          <View style={[styles.statCard]}>
            <View style={styles.statIconCircle}>
              <Icon name="trophy" size={28} color="#fff" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>20</Text>
              <Text style={styles.statLabel}>Sessions</Text>
            </View>
          </View>
        </View>

        {/* Performance Trend Section - Modern Card */}
        <View style={styles.modernCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={styles.iconBadge}>
                <Icon name="chart-line-variant" size={20} color="#fff" />
              </View>
              <Text style={styles.cardTitle}>Performance Trend</Text>
            </View>
          </View>
          <Text style={styles.cardSubtitle}>Overall Score (Aptitude + Interview)</Text>
          
          <PerformanceChart />

          {/* Performance Stats - Modern Pills */}
          <View style={styles.performanceStatsRow}>
            <View style={styles.performancePill}>
              <Text style={styles.pillValue}>87%</Text>
              <Text style={styles.pillLabel}>Latest</Text>
            </View>
            <View style={styles.performancePill}>
              <Text style={styles.pillValue}>90%</Text>
              <Text style={styles.pillLabel}>Peak</Text>
            </View>
            <View style={[styles.performancePill, styles.performancePillGreen]}>
              <Text style={[styles.pillValue, styles.pillValueGreen]}>+3%</Text>
              <Text style={styles.pillLabel}>Growth</Text>
            </View>
          </View>
        </View>

        {/* AI Evaluation Summary - Modern Design */}
        <View style={styles.modernCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.iconBadge, styles.iconBadgeGreen]}>
                <Icon name="robot" size={20} color="#fff" />
              </View>
              <Text style={styles.cardTitle}>AI Insights</Text>
            </View>
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreBadgeText}>87/100</Text>
            </View>
          </View>
          
          <Text style={styles.cardSubtitle}>Strengths</Text>

          <View style={styles.strengthsSection}>
            <View style={styles.strengthRow}>
              <View style={styles.strengthItem}>
                <Icon name="check-circle" size={18} color="#16a34a" />
                <Text style={styles.strengthText}>Grammar</Text>
              </View>
              <View style={styles.strengthItem}>
                <Icon name="check-circle" size={18} color="#16a34a" />
                <Text style={styles.strengthText}>Vocabulary</Text>
              </View>
            </View>
            <View style={styles.strengthRow}>
              <View style={styles.strengthItem}>
                <Icon name="check-circle" size={18} color="#16a34a" />
                <Text style={styles.strengthText}>Confidence</Text>
              </View>
            </View>
          </View>

          <Text style={[styles.cardSubtitle, { marginTop: 16 }]}>Areas to Improve</Text>
          
          <View style={styles.improvementSection}>
            <View style={styles.improvementRow}>
              <View style={styles.improvementItem}>
                <Icon name="alert-circle" size={18} color="#ea580c" />
                <Text style={styles.improvementText}>Technical Depth</Text>
              </View>
            </View>
            <View style={styles.improvementRow}>
              <View style={styles.improvementItem}>
                <Icon name="alert-circle" size={18} color="#ea580c" />
                <Text style={styles.improvementText}>Response Structure</Text>
              </View>
            </View>
          </View>

          <View style={styles.aiFeedbackCard}>
            <Icon name="lightbulb-on" size={20} color="#fbbf24" style={{ marginRight: 8 }} />
            <Text style={styles.aiFeedbackText}>
              Great job! Keep practicing technical concepts to reach 90%+
            </Text>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNavBar activeTab={activeTab} onTabChange={setActiveTab} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#000',
    paddingHorizontal: 20,
    paddingVertical: 10,
    paddingTop: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImage: {
    width: 50,
    height: 50,
    resizeMode: 'contain',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 0,
  },
  profileButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 92,
  },
  scrollViewNoHeader: {
    paddingTop: 0,
  },
  welcomeCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 1,
    marginBottom: 20,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  welcomeContent: {
    alignItems: 'flex-start',
  },
  welcomeText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 4,
  },
  userName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#9ca3af',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: (width - 44) / 2,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    alignItems: 'flex-end',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4b5563',
  },
  modernCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconBadgeGreen: {
    backgroundColor: '#000000',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  scoreBadge: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  scoreBadgeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#16a34a',
  },
  performanceStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  performancePill: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  performancePillGreen: {
    backgroundColor: '#d1fae5',
  },
  pillValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  pillValueGreen: {
    color: '#16a34a',
  },
  pillLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  strengthsSection: {
    gap: 10,
  },
  strengthRow: {
    flexDirection: 'row',
    gap: 12,
  },
  strengthItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  strengthText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065f46',
  },
  improvementSection: {
    gap: 10,
  },
  improvementRow: {
    flexDirection: 'row',
    gap: 12,
  },
  improvementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  improvementText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9a3412',
  },
  aiFeedbackCard: {
    backgroundColor: '#fffbeb',
    padding: 16,
    borderRadius: 16,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#fbbf24',
  },
  aiFeedbackText: {
    fontSize: 14,
    color: '#78350f',
    fontWeight: '500',
    flex: 1,
    lineHeight: 20,
  },
  bottomSpacing: {
    height: 100,
  },
});

export default DashboardScreen;
