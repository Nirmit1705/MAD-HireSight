import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AptitudeService } from '../services/aptitudeService';
import RadarChart from '../components/RadarChart';

const { width } = Dimensions.get('window');

interface FeedbackScreenProps {
  position: string;
  domain: string;
  testScore: number;
  interviewScore: number;
  feedbackData: any;
  onNavigate: (screen: string) => void;
}

const FeedbackScreen: React.FC<FeedbackScreenProps> = ({
  position,
  domain,
  testScore,
  interviewScore,
  feedbackData,
  onNavigate,
}) => {
  const [latestAptitude, setLatestAptitude] = useState<any>(null);

  useEffect(() => {
    const fetchLatestAptitude = async () => {
      try {
        const history = await AptitudeService.getTestHistory();
        if (history && history.length > 0) {
          setLatestAptitude(history[0]);
        }
      } catch (error) {
        console.error('Error fetching latest aptitude:', error);
      }
    };
    fetchLatestAptitude();
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#16a34a';
    if (score >= 60) return '#ca8a04';
    return '#dc2626';
  };

  const actualInterviewScore = feedbackData?.interviewOverallScore || interviewScore || 0;
  const actualTestScore = latestAptitude?.overallScore || feedbackData?.aptitudeOverallScore || testScore || 0;
  const overallScore = Math.round((actualTestScore + actualInterviewScore) / (actualTestScore > 0 ? 2 : 1));

  const radarData = [
    { label: 'Fluency', value: feedbackData?.fluencyScore || 0 },
    { label: 'Grammar', value: feedbackData?.grammarScore || 0 },
    { label: 'Confidence', value: feedbackData?.confidenceScore || 0 },
    { label: 'Technical', value: feedbackData?.technicalKnowledgeScore || 0 },
    { label: 'Vocabulary', value: feedbackData?.vocabularyScore || 0 },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.successIcon}>
          <Icon name="check-circle" size={40} color="#16a34a" />
        </View>
        <Text style={styles.headerTitle}>Interview Complete!</Text>
        <Text style={styles.headerSubtitle}>Here is your detailed AI feedback for {position}</Text>
      </View>

      {/* Overall Score Card */}
      <View style={styles.scoreCard}>
        <View style={styles.scoreHeader}>
          <Text style={styles.scoreLabel}>Overall Performance</Text>
          <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(overallScore) + '20' }]}>
            <Text style={[styles.scoreValue, { color: getScoreColor(overallScore) }]}>{overallScore}/100</Text>
          </View>
        </View>
        <View style={styles.scoreBreakdown}>
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownText}>Aptitude</Text>
            <Text style={[styles.breakdownNum, { color: getScoreColor(actualTestScore) }]}>{actualTestScore}%</Text>
          </View>
          <View style={styles.breakdownDivider} />
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownText}>Interview</Text>
            <Text style={[styles.breakdownNum, { color: getScoreColor(actualInterviewScore) }]}>{actualInterviewScore}%</Text>
          </View>
        </View>
      </View>

      {/* Strengths */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Strengths</Text>
        <View style={styles.strengthsList}>
          {feedbackData?.strengths?.map((s: string, i: number) => (
            <View key={i} style={styles.strengthCard}>
              <View style={styles.strengthHeader}>
                <Icon name="medal-outline" size={20} color="#16a34a" />
                <Text style={styles.strengthLabel}>{s.split(':')[0]}</Text>
              </View>
              <Text style={styles.strengthText}>{s.split(':')[1] || s}</Text>
            </View>
          )) || (
             <View style={styles.aiFeedbackCard}>
               <Icon name="lightbulb-on" size={20} color="#fbbf24" style={{ marginRight: 8 }} />
               <Text style={styles.aiFeedbackText}>AI is generating your strengths. Please check history later.</Text>
             </View>
          )}
        </View>
      </View>

      {/* Improvements */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Improvement Areas</Text>
        <View style={styles.improvementsList}>
          {feedbackData?.improvements?.map((imp: any, i: number) => (
            <View key={i} style={styles.improvementCard}>
              <View style={styles.improvementHeader}>
                <Icon name="trending-up" size={20} color={imp.priority === 'High' ? '#dc2626' : '#ca8a04'} />
                <Text style={styles.improvementLabel}>{imp.area}</Text>
                <View style={[styles.priorityBadge, { backgroundColor: imp.priority === 'High' ? '#fee2e2' : '#fef9c3' }]}>
                  <Text style={[styles.priorityText, { color: imp.priority === 'High' ? '#dc2626' : '#ca8a04' }]}>{imp.priority}</Text>
                </View>
              </View>
              <Text style={styles.improvementText}>{imp.description}</Text>
            </View>
          )) || (
            <View style={styles.aiFeedbackCard}>
              <Icon name="lightbulb-on" size={20} color="#fbbf24" style={{ marginRight: 8 }} />
              <Text style={styles.aiFeedbackText}>AI is analyzing areas to improve. Stay tuned!</Text>
            </View>
          )}
        </View>
      </View>

      {/* Analytics Radar */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Communication & Skills</Text>
        <View style={styles.radarCard}>
          <RadarChart data={radarData} size={240} />
          <View style={styles.radarLegend}>
            {radarData.map((d, i) => (
              <View key={i} style={styles.legendItem}>
                <Text style={styles.legendLabel}>{d.label}</Text>
                <Text style={[styles.legendValue, { color: getScoreColor(d.value) }]}>{d.value}%</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => onNavigate('Dashboard')}>
          <Text style={styles.primaryBtnText}>Back to Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => onNavigate('History')}>
          <Text style={styles.secondaryBtnText}>View History</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  scoreCard: {
    marginHorizontal: 24,
    backgroundColor: '#000',
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  scoreLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9ca3af',
  },
  scoreBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  scoreBreakdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
  },
  breakdownItem: {
    flex: 1,
    alignItems: 'center',
  },
  breakdownText: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 4,
  },
  breakdownNum: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  breakdownDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#374151',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  strengthsList: {
    gap: 12,
  },
  strengthCard: {
    backgroundColor: '#f0fdf4',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  strengthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  strengthLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#16a34a',
  },
  strengthText: {
    fontSize: 14,
    color: '#15803d',
    lineHeight: 20,
  },
  improvementsList: {
    gap: 12,
  },
  improvementCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  improvementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  improvementLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
  },
  improvementText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  radarCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 24,
    alignItems: 'center',
  },
  radarLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginTop: 24,
  },
  legendItem: {
    alignItems: 'center',
    width: (width - 120) / 3,
  },
  legendLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 2,
  },
  legendValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  actions: {
    paddingHorizontal: 24,
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: '#000',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryBtn: {
    backgroundColor: '#fff',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  secondaryBtnText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
  },
  aiFeedbackCard: {
    backgroundColor: '#fffbeb',
    padding: 16,
    borderRadius: 16,
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
  },
  bottomSpacing: {
    height: 60,
  },
});

export default FeedbackScreen;
