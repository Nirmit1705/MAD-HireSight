import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AptitudeService } from '../services/aptitudeService';
import { aiInterviewAPI } from '../services/aiInterviewAPI';
import Header from '../components/Header';

const { width } = Dimensions.get('window');

interface HistoryItem {
  id: string;
  type: 'aptitude' | 'interview';
  title: string;
  score: number;
  date: string;
  duration?: string;
  domain?: string;
  position?: string;
}

interface HistoryScreenProps {
  onNavigate: (screen: string, id?: string) => void;
  onProfilePress?: () => void;
}

const HistoryScreen: React.FC<HistoryScreenProps> = ({ onNavigate, onProfilePress }) => {
  const [activeTab, setActiveTab] = useState<'interview' | 'aptitude'>('interview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const [aptitudeData, interviewData] = await Promise.all([
        AptitudeService.getTestHistory().catch(() => []),
        aiInterviewAPI.getInterviewHistory().catch(() => []),
      ]);

      const mappedAptitude: HistoryItem[] = aptitudeData.map((item: any) => ({
        id: item.id,
        type: 'aptitude',
        title: 'Aptitude Test',
        score: item.overallScore,
        date: formatDate(item.completedAt, 'short'),
        duration: formatDuration(item.timeTaken, 'seconds'),
      }));

      const mappedInterview: HistoryItem[] = interviewData.map((item: any) => ({
        id: item.id,
        type: 'interview',
        title: `${item.position || 'General'} Interview`,
        score: item.overallScore,
        date: formatDate(item.completedAt, 'short'),
        duration: formatDuration(item.duration, 'minutes'),
        domain: item.domain,
        position: item.position,
      }));

      setHistory([...mappedAptitude, ...mappedInterview]);
    } catch (err) {
      console.error('Error loading history:', err);
      setError('Failed to load history. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleScroll = (event: any) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    if (currentScrollY > lastScrollY && currentScrollY > 50) {
      setShowHeader(false);
    } else if (currentScrollY < lastScrollY) {
      setShowHeader(true);
    }
    setLastScrollY(currentScrollY);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadHistory();
  };

  const formatDate = (dateString: string, format: 'short' | 'long') => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    if (format === 'short') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const formatDuration = (value: number, unit: 'seconds' | 'minutes') => {
    if (unit === 'seconds') {
      const mins = Math.floor(value / 60);
      const secs = value % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    } else {
      const mins = Math.floor(value);
      const secs = Math.floor((value - mins) * 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#16a34a'; // Green
    if (score >= 60) return '#ca8a04'; // Yellow
    return '#dc2626'; // Red
  };

  const filteredHistory = history
    .filter((item) => item.type === activeTab)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const stats = {
    best: filteredHistory.length > 0 ? Math.max(...filteredHistory.map((h) => h.score)) : 0,
    average: filteredHistory.length > 0 
      ? Math.round(filteredHistory.reduce((acc, curr) => acc + curr.score, 0) / filteredHistory.length) 
      : 0,
    total: filteredHistory.length,
  };

  const renderStats = () => (
    <View style={styles.statsRow}>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>Best Score</Text>
        <Text style={[styles.statValue, { color: getScoreColor(stats.best) }]}>{stats.best}%</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>Average</Text>
        <Text style={styles.statValue}>{stats.average}%</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>Attempts</Text>
        <Text style={styles.statValue}>{stats.total}</Text>
      </View>
    </View>
  );

  const renderItem = (item: HistoryItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.historyCard}
      onPress={() => onNavigate('historyDetail', item.id)}
    >
      <View style={styles.cardLeft}>
        <View style={[styles.iconContainer, { backgroundColor: item.type === 'interview' ? '#f3f4f6' : '#eff6ff' }]}>
          <Icon 
            name={item.type === 'interview' ? 'video' : 'brain'} 
            size={24} 
            color={item.type === 'interview' ? '#111827' : '#2563eb'} 
          />
        </View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
          <View style={styles.itemMeta}>
            <Text style={styles.metaText}>{item.date}</Text>
            <View style={styles.dot} />
            <Text style={styles.metaText}>{item.duration}</Text>
            {item.domain && (
              <>
                <View style={styles.dot} />
                <Text style={styles.metaText} numberOfLines={1}>{item.domain}</Text>
              </>
            )}
          </View>
        </View>
      </View>
      <View style={styles.cardRight}>
        <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(item.score) + '20' }]}>
          <Text style={[styles.scoreText, { color: getScoreColor(item.score) }]}>{item.score}%</Text>
        </View>
        <Icon name="chevron-right" size={20} color="#9ca3af" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Header */}
      <Header showHeader={showHeader} onProfilePress={onProfilePress ?? (() => {})} />

      <ScrollView
        style={[styles.scrollView, !showHeader && styles.scrollViewNoHeader]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Title Section with Gradient Card style */}
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeContent}>
            <Text style={styles.userName}>History</Text>
            <Text style={styles.subtitle}>View and track your past performances</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'interview' && styles.activeTab]}
            onPress={() => setActiveTab('interview')}
          >
            <Text style={[styles.tabText, activeTab === 'interview' && styles.activeTabText]}>Interviews</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'aptitude' && styles.activeTab]}
            onPress={() => setActiveTab('aptitude')}
          >
            <Text style={[styles.tabText, activeTab === 'aptitude' && styles.activeTabText]}>Aptitude</Text>
          </TouchableOpacity>
        </View>
        {renderStats()}

        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#000" />
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Icon name="alert-circle-outline" size={48} color="#dc2626" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadHistory}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : filteredHistory.length === 0 ? (
          <View style={styles.centerContainer}>
            <View style={styles.emptyIconCircle}>
              <Icon name="history" size={40} color="#9ca3af" />
            </View>
            <Text style={styles.emptyTitle}>No history yet</Text>
            <Text style={styles.emptyText}>Complete a session to see your progress here.</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filteredHistory.map(renderItem)}
          </View>
        )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  profileBtn: {
    padding: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 20,
    gap: 12,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  activeTab: {
    backgroundColor: '#000',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
  },
  activeTabText: {
    color: '#fff',
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
  listContainer: {
    paddingHorizontal: 24,
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  historyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 20,
    padding: 16,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#6b7280',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#d1d5db',
    marginHorizontal: 6,
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  errorText: {
    fontSize: 16,
    color: '#4b5563',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: '#000',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  bottomSpacing: {
    height: 120,
  },
});

export default HistoryScreen;
