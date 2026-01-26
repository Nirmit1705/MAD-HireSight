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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import BottomNavBar from '../components/BottomNavBar';

const { width } = Dimensions.get('window');

interface DashboardScreenProps {
  onLogout?: () => void;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const headerAnimation = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(headerAnimation, {
      toValue: showHeader ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [showHeader]);

  const handleScroll = (event: any) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    if (currentScrollY > lastScrollY && currentScrollY > 50) {
      setShowHeader(false);
    } else if (currentScrollY < lastScrollY) {
      setShowHeader(true);
    }
    setLastScrollY(currentScrollY);
  };

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
          <Icon name="target" size={40} color="#fff" />
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
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>23IT087 PATEL NIRMIT AMIT!</Text>
          <Text style={styles.subtitle}>Track your progress and improve your interview skills</Text>
        </View>

        {/* Stats Cards Grid */}
        <View style={styles.statsGrid}>
          {/* Aptitude Score Card */}
          <View style={styles.statCard}>
            <Icon name="brain" size={32} color="#ef4444" style={styles.statIcon} />
            <Text style={styles.statValue}>50%</Text>
            <Text style={styles.statLabel}>Aptitude Score</Text>
            <Text style={styles.statSubLabel}>Latest test result</Text>
          </View>

          {/* Interview Score Card */}
          <View style={styles.statCard}>
            <Icon name="video" size={32} color="#16a34a" style={styles.statIcon} />
            <Text style={[styles.statValue, { color: '#16a34a' }]}>87%</Text>
            <Text style={styles.statLabel}>Interview Score</Text>
            <Text style={styles.statSubLabel}>Latest interview result</Text>
          </View>

          {/* Overall Performance Card */}
          <View style={styles.statCard}>
            <Icon name="chart-line" size={32} color="#ea580c" style={styles.statIcon} />
            <Text style={[styles.statValue, { color: '#ea580c' }]}>73%</Text>
            <Text style={styles.statLabel}>Overall Performance</Text>
            <Text style={styles.statSubLabel}>Average across all tests</Text>
          </View>

          {/* Completed Sessions Card */}
          <View style={styles.statCard}>
            <Icon name="trophy" size={32} color="#000" style={styles.statIcon} />
            <Text style={styles.statValue}>20</Text>
            <Text style={styles.statLabel}>Completed Sessions</Text>
            <Text style={styles.statSubLabel}>Interviews & aptitude tests</Text>
          </View>
        </View>

        {/* Performance Trend Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Icon name="chart-line-variant" size={24} color="#1a1a1a" />
            <Text style={styles.sectionTitle}>Performance Trend</Text>
          </View>
          <Text style={styles.sectionSubtitle}>Overall Score (Aptitude + Interview)</Text>
          
          {/* Graph Placeholder with Visual Data */}
          <View style={styles.graphContainer}>
            <View style={styles.graphYAxis}>
              <Text style={styles.yAxisLabel}>100</Text>
              <Text style={styles.yAxisLabel}>75</Text>
              <Text style={styles.yAxisLabel}>50</Text>
              <Text style={styles.yAxisLabel}>25</Text>
              <Text style={styles.yAxisLabel}>0</Text>
            </View>
            <View style={styles.graphContent}>
              {/* Simulated line chart */}
              <View style={styles.graphLine} />
              <View style={[styles.dataPoint, { bottom: '15%', left: '10%' }]}>
                <View style={styles.dot} />
              </View>
              <View style={[styles.dataPoint, { bottom: '50%', left: '40%' }]}>
                <View style={styles.dot} />
              </View>
              <View style={[styles.dataPoint, { bottom: '75%', left: '90%' }]}>
                <View style={styles.dotLarge} />
              </View>
              
              <View style={styles.xAxisLabels}>
                <Text style={styles.xAxisLabel}>Aug 25</Text>
                <Text style={styles.xAxisLabel}>Sep 25</Text>
                <Text style={styles.xAxisLabel}>Nov 25</Text>
              </View>
            </View>
          </View>

          {/* Performance Stats */}
          <View style={styles.performanceStats}>
            <View style={styles.performanceStat}>
              <Text style={styles.performanceValue}>87%</Text>
              <Text style={styles.performanceLabel}>Last Recorded</Text>
            </View>
            <View style={styles.performanceStat}>
              <Text style={styles.performanceValue}>90%</Text>
              <Text style={styles.performanceLabel}>Highest Score</Text>
            </View>
            <View style={styles.performanceStat}>
              <Text style={[styles.performanceValue, styles.improvementText]}>+3%</Text>
              <Text style={styles.performanceLabel}>Improvement</Text>
            </View>
          </View>
        </View>

        {/* AI Evaluation Summary */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Icon name="robot" size={24} color="#1a1a1a" />
            <Text style={styles.sectionTitle}>AI Evaluation Summary</Text>
          </View>
          
          <View style={styles.aiScoreContainer}>
            <Text style={styles.aiScore}>87/100</Text>
            <Text style={styles.aiScoreLabel}>Overall ML Score</Text>
          </View>

          <View style={styles.feedbackContainer}>
            <View style={styles.feedbackRow}>
              <View style={styles.strengthsColumn}>
                <View style={styles.feedbackHeader}>
                  <Icon name="check-circle" size={18} color="#16a34a" />
                  <Text style={styles.feedbackTitle}>Strengths</Text>
                </View>
                <View style={styles.tagContainer}>
                  <View style={styles.tagGreen}>
                    <Text style={styles.tagTextGreen}>Grammar</Text>
                  </View>
                  <View style={styles.tagGreen}>
                    <Text style={styles.tagTextGreen}>Vocabulary</Text>
                  </View>
                  <View style={styles.tagGreen}>
                    <Text style={styles.tagTextGreen}>Confidence</Text>
                  </View>
                </View>
              </View>

              <View style={styles.areasColumn}>
                <View style={styles.feedbackHeader}>
                  <Icon name="alert-circle" size={18} color="#ea580c" />
                  <Text style={styles.feedbackTitle}>Areas to Improve</Text>
                </View>
                <View style={styles.tagContainer}>
                  <View style={styles.tagOrange}>
                    <Text style={styles.tagTextOrange}>Technical Depth</Text>
                  </View>
                  <View style={styles.tagOrange}>
                    <Text style={styles.tagTextOrange}>Response Structure</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.aiFeedbackBox}>
              <Text style={styles.aiFeedbackLabel}>AI Feedback</Text>
              <Text style={styles.aiFeedbackText}>
                "Achieved 87% overall - excellent performance"
              </Text>
            </View>
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
    paddingTop: 20,
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
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 12,
  },
  profileButton: {
    padding: 4,
  },
  topNav: {
    backgroundColor: '#000',
    flexDirection: 'row',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  tabLabelActive: {
    color: '#fff',
    fontWeight: '600',
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 92,
  },
  scrollViewNoHeader: {
    paddingTop: 0,
  },
  welcomeSection: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  welcomeText: {
    fontSize: 15,
    color: '#6b7280',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 2,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#9ca3af',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 16,
    backgroundColor: '#fff',
  },
  statCard: {
    width: (width - 48) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statIcon: {
    marginBottom: 12,
  },
  statValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  statSubLabel: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
  },
  sectionCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 8,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 16,
  },
  graphContainer: {
    flexDirection: 'row',
    height: 180,
    marginBottom: 20,
  },
  graphYAxis: {
    width: 35,
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  yAxisLabel: {
    fontSize: 10,
    color: '#9ca3af',
  },
  graphContent: {
    flex: 1,
    position: 'relative',
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
    marginLeft: 6,
  },
  graphLine: {
    position: 'absolute',
    bottom: '15%',
    left: '10%',
    right: 0,
    height: 2,
    backgroundColor: '#111827',
    transform: [{ rotate: '20deg' }],
  },
  dataPoint: {
    position: 'absolute',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#111827',
    borderWidth: 2,
    borderColor: '#fff',
  },
  dotLarge: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#111827',
    borderWidth: 2,
    borderColor: '#fff',
  },
  xAxisLabels: {
    position: 'absolute',
    bottom: -22,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  xAxisLabel: {
    fontSize: 10,
    color: '#9ca3af',
  },
  performanceStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  performanceStat: {
    alignItems: 'center',
  },
  performanceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  performanceLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  improvementText: {
    color: '#16a34a',
  },
  aiScoreContainer: {
    alignItems: 'center',
    marginVertical: 16,
    paddingVertical: 16,
  },
  aiScore: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#16a34a',
  },
  aiScoreLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  feedbackContainer: {
    marginTop: 8,
  },
  feedbackRow: {
    gap: 20,
  },
  strengthsColumn: {
    marginBottom: 20,
  },
  areasColumn: {
    marginBottom: 16,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  feedbackTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 6,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagGreen: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#d1fae5',
  },
  tagOrange: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#fed7aa',
  },
  tagTextGreen: {
    fontSize: 12,
    fontWeight: '500',
    color: '#065f46',
  },
  tagTextOrange: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9a3412',
  },
  aiFeedbackBox: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#e5e7eb',
  },
  aiFeedbackLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  aiFeedbackText: {
    fontSize: 13,
    color: '#111827',
    fontStyle: 'italic',
  },
  recommendationCard: {
    backgroundColor: '#fafafa',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  recommendationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  recommendationDesc: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
    marginBottom: 12,
  },
  actionButton: {
    backgroundColor: '#000',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  actionButtonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#000',
  },
  actionButtonTextSecondary: {
    color: '#000',
    fontSize: 13,
    fontWeight: '600',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 3,
  },
  activityDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  activityScore: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  activityScoreText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#16a34a',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  viewAllText: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
  },
  bottomSpacing: {
    height: 100,
  },
});

export default DashboardScreen;
