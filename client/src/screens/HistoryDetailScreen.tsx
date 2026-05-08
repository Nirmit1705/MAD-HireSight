import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AptitudeService } from '../services/aptitudeService';
import { aiInterviewAPI } from '../services/aiInterviewAPI';
import RadarChart from '../components/RadarChart';

const { width } = Dimensions.get('window');

interface HistoryDetailScreenProps {
  historyId: string;
  onBack: () => void;
  onNavigate: (screen: string) => void;
}

const HistoryDetailScreen: React.FC<HistoryDetailScreenProps> = ({ historyId, onBack, onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [historyItem, setHistoryItem] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try aptitude first
      try {
        const aptitudeHistory = await AptitudeService.getTestHistory();
        const foundAptitude = aptitudeHistory.find((t: any) => t.id === historyId);
        
        if (foundAptitude) {
          const results = await AptitudeService.getTestResults(historyId);
          setHistoryItem({
            type: 'aptitude',
            ...foundAptitude,
            ...results,
          });
          setLoading(false);
          return;
        }
      } catch (e) {
        console.log('Aptitude check failed, trying interview...');
      }

      // Try interview
      try {
        const interview = await aiInterviewAPI.getInterview(historyId);
        if (interview) {
          let linkedAptitude = null;
          let fallbackAptitudeScore: number | null = null;
          if (interview.aptitudeTestId) {
            try {
              linkedAptitude = await AptitudeService.getTestResults(interview.aptitudeTestId);
            } catch (e) {
              console.log('Linked aptitude fetch failed');
            }
          } else if (interview.aptitudeOverallScore == null && interview.feedback?.aptitudeOverallScore == null) {
            try {
              const aptitudeHistory = await AptitudeService.getTestHistory();
              if (aptitudeHistory.length > 0) {
                const interviewDate = interview.completedAt ? new Date(interview.completedAt).getTime() : Date.now();

                const sortedHistory = aptitudeHistory
                  .filter((t: any) => t.completedAt)
                  .sort((a: any, b: any) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

                const nearestPrevious = sortedHistory.find(
                  (t: any) => new Date(t.completedAt).getTime() <= interviewDate
                );

                fallbackAptitudeScore = nearestPrevious?.overallScore ?? sortedHistory[0]?.overallScore ?? null;
              }
            } catch (e) {
              console.log('Fallback aptitude history fetch failed');
            }
          }

          setHistoryItem({
            type: 'interview',
            ...interview,
            linkedAptitude,
            fallbackAptitudeScore,
          });
          setLoading(false);
          return;
        }
      } catch (e) {
        console.log('Interview check failed');
      }

      setError('History item not found.');
    } catch (err) {
      console.error('Error loading detail:', err);
      setError('Failed to load details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [historyId]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#16a34a';
    if (score >= 60) return '#ca8a04';
    return '#dc2626';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (error || !historyItem) {
    return (
      <View style={styles.centerContainer}>
        <Icon name="alert-circle-outline" size={48} color="#dc2626" />
        <Text style={styles.errorText}>{error || 'Not found'}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderAptitudeDetail = () => {
    const { test, answers } = historyItem;
    const correctCount = answers.filter((a: any) => a.isCorrect).length;
    const totalQuestions = answers.length;

    const radarData = [
      { label: 'Technical', value: test.scores?.domainKnowledge || 0 },
      { label: 'Quantitative', value: test.scores?.quantitative || 0 },
      { label: 'Verbal', value: test.scores?.verbalAbility || 0 },
      { label: 'Logical', value: test.scores?.logicalReasoning || 0 },
    ];

    return (
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.iconBtn}>
            <Icon name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <View>
            <Text style={styles.detailTitle}>Aptitude Results</Text>
            <Text style={styles.detailSubtitle}>{formatDate(test.completedAt)}</Text>
          </View>
        </View>

        {/* Overall Score Card */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreCircle}>
            <Text style={[styles.overallScore, { color: getScoreColor(test.overallScore) }]}>{test.overallScore}%</Text>
            <Text style={styles.overallLabel}>Overall</Text>
          </View>
          <View style={styles.scoreStats}>
            <View style={styles.statRow}>
              <Icon name="clock-outline" size={18} color="#6b7280" />
              <Text style={styles.statText}>{Math.floor(test.timeTaken / 60)}m {test.timeTaken % 60}s</Text>
            </View>
            <View style={styles.statRow}>
              <Icon name="check-circle-outline" size={18} color="#16a34a" />
              <Text style={styles.statText}>{correctCount} Correct</Text>
            </View>
            <View style={styles.statRow}>
              <Icon name="close-circle-outline" size={18} color="#dc2626" />
              <Text style={styles.statText}>{totalQuestions - correctCount} Incorrect</Text>
            </View>
          </View>
        </View>

        {/* Radar Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Analysis</Text>
          <View style={styles.radarContainer}>
            <RadarChart data={radarData} size={220} />
          </View>
          <View style={styles.dimensionList}>
            {radarData.map((d, i) => (
              <View key={i} style={styles.dimensionRow}>
                <Text style={styles.dimensionLabel}>{d.label}</Text>
                <View style={styles.progressContainer}>
                  <View style={[styles.progressBar, { width: `${d.value}%`, backgroundColor: getScoreColor(d.value) }]} />
                </View>
                <Text style={styles.dimensionValue}>{d.value}%</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Questions Review */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Question Review</Text>
          {answers.map((q: any, i: number) => (
            <View key={i} style={styles.questionCard}>
              <View style={styles.questionHeader}>
                <Text style={styles.questionNum}>Question {i + 1}</Text>
                <View style={[styles.statusBadge, { backgroundColor: q.isCorrect ? '#f0fdf4' : '#fef2f2' }]}>
                  <Text style={[styles.statusText, { color: q.isCorrect ? '#16a34a' : '#dc2626' }]}>
                    {q.isCorrect ? 'Correct' : 'Incorrect'}
                  </Text>
                </View>
              </View>
              <Text style={styles.questionText}>{q.questionText}</Text>
              <View style={styles.optionsList}>
                {q.options.map((opt: string, optIdx: number) => {
                  const isSelected = q.selectedOption === optIdx;
                  const isCorrect = q.correctOption === optIdx;
                  let optStyle: any = styles.option;
                  let optTextStyle: any = styles.optionText;
                  
                  if (isCorrect) {
                    optStyle = [styles.option, styles.correctOption];
                    optTextStyle = [styles.optionText, styles.correctOptionText];
                  } else if (isSelected && !isCorrect) {
                    optStyle = [styles.option, styles.wrongOption];
                    optTextStyle = [styles.optionText, styles.wrongOptionText];
                  }

                  return (
                    <View key={optIdx} style={optStyle}>
                      <Text style={optTextStyle}>{opt}</Text>
                      {isCorrect && <Icon name="check" size={16} color="#16a34a" />}
                      {isSelected && !isCorrect && <Icon name="close" size={16} color="#dc2626" />}
                    </View>
                  );
                })}
              </View>
              {!q.isCorrect && (
                <View style={styles.explanationBox}>
                  <Text style={styles.explanationTitle}>Explanation</Text>
                  <Text style={styles.explanationText}>The correct answer is "{q.options[q.correctOption]}".</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryAction} onPress={() => onNavigate('Assessment')}>
            <Text style={styles.primaryActionText}>Retake Test</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.bottomSpacing} />
      </ScrollView>
    );
  };

  const renderInterviewDetail = () => {
    const interview = historyItem;
    const testScore =
      interview.linkedAptitude?.test?.overallScore ??
      interview.aptitudeOverallScore ??
      interview.feedback?.aptitudeOverallScore ??
      interview.fallbackAptitudeScore ??
      0;
    const overallScore = Math.round((testScore + interview.overallScore) / (testScore > 0 ? 2 : 1));

    const radarData = [
      { label: 'Fluency', value: interview.fluencyScore || 0 },
      { label: 'Grammar', value: interview.grammarScore || 0 },
      { label: 'Confidence', value: interview.confidenceScore || 0 },
      { label: 'Technical', value: interview.technicalKnowledgeScore || 0 },
      { label: 'Vocabulary', value: interview.vocabularyScore || 0 },
    ];

    return (
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.iconBtn}>
            <Icon name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <View>
            <Text style={styles.detailTitle}>Interview Feedback</Text>
            <Text style={styles.detailSubtitle}>{interview.position} • {formatDate(interview.completedAt)}</Text>
          </View>
        </View>

        {/* Overall Score Card */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreCircle}>
            <Text style={[styles.overallScore, { color: getScoreColor(overallScore) }]}>{overallScore}%</Text>
            <Text style={styles.overallLabel}>Combined</Text>
          </View>
          <View style={styles.scoreBreakdown}>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Aptitude</Text>
              <Text style={[styles.breakdownValue, { color: getScoreColor(testScore) }]}>{testScore}%</Text>
            </View>
            <View style={styles.breakdownDivider} />
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Interview</Text>
              <Text style={[styles.breakdownValue, { color: getScoreColor(interview.overallScore) }]}>{interview.overallScore}%</Text>
            </View>
          </View>
        </View>

        {/* Strengths */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Strengths</Text>
          {interview.feedback?.strengths?.map((s: string, i: number) => (
            <View key={i} style={styles.feedbackItem}>
              <View style={styles.feedbackHeader}>
                <Icon name="check-decagram" size={20} color="#16a34a" />
                <Text style={styles.feedbackLabel}>{s.split(':')[0]}</Text>
              </View>
              <Text style={styles.feedbackText}>{s.split(':')[1] || s}</Text>
            </View>
          )) || (
            <Text style={styles.emptyText}>No specific strengths recorded.</Text>
          )}
        </View>

        {/* Improvements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Areas for Improvement</Text>
          {interview.feedback?.improvements?.map((imp: any, i: number) => (
            <View key={i} style={styles.feedbackItem}>
              <View style={styles.feedbackHeader}>
                <Icon name="alert-decagram" size={20} color={imp.priority === 'High' ? '#dc2626' : '#ca8a04'} />
                <Text style={styles.feedbackLabel}>{imp.area}</Text>
                <View style={[styles.priorityBadge, { backgroundColor: imp.priority === 'High' ? '#fee2e2' : '#fef9c3' }]}>
                  <Text style={[styles.priorityText, { color: imp.priority === 'High' ? '#dc2626' : '#ca8a04' }]}>{imp.priority}</Text>
                </View>
              </View>
              <Text style={styles.feedbackText}>{imp.description}</Text>
            </View>
          )) || (
            <Text style={styles.emptyText}>No specific improvements suggested.</Text>
          )}
        </View>

        {/* Radar Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interview Analytics</Text>
          <View style={styles.radarContainer}>
            <RadarChart data={radarData} size={220} />
          </View>
          <View style={styles.dimensionList}>
            {radarData.map((d, i) => (
              <View key={i} style={styles.dimensionRow}>
                <Text style={styles.dimensionLabel}>{d.label}</Text>
                <View style={styles.progressContainer}>
                  <View style={[styles.progressBar, { width: `${d.value}%`, backgroundColor: getScoreColor(d.value) }]} />
                </View>
                <Text style={styles.dimensionValue}>{d.value}%</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryAction} onPress={() => onNavigate('Assessment')}>
            <Text style={styles.primaryActionText}>Practice Again</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.bottomSpacing} />
      </ScrollView>
    );
  };

  return historyItem.type === 'aptitude' ? renderAptitudeDetail() : renderInterviewDetail();
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    gap: 16,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  detailSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  scoreCard: {
    marginHorizontal: 24,
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 8,
    borderColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overallScore: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  overallLabel: {
    fontSize: 10,
    color: '#9ca3af',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  scoreStats: {
    flex: 1,
    marginLeft: 24,
    gap: 12,
  },
  scoreBreakdown: {
    flex: 1,
    marginLeft: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  breakdownItem: {
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  breakdownValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  breakdownDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e5e7eb',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    fontSize: 14,
    color: '#4b5563',
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 20,
  },
  radarContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  dimensionList: {
    gap: 16,
  },
  dimensionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dimensionLabel: {
    width: 80,
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  progressContainer: {
    flex: 1,
    height: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  dimensionValue: {
    width: 35,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'right',
  },
  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 20,
    marginBottom: 16,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  questionNum: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 24,
    marginBottom: 20,
  },
  optionsList: {
    gap: 10,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  optionText: {
    fontSize: 14,
    color: '#4b5563',
    flex: 1,
  },
  correctOption: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bcf0da',
  },
  correctOptionText: {
    color: '#065f46',
    fontWeight: '600',
  },
  wrongOption: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  wrongOptionText: {
    color: '#991b1b',
    fontWeight: '600',
  },
  explanationBox: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
  },
  explanationTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2563eb',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  explanationText: {
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
  feedbackItem: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 12,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  feedbackLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
  },
  feedbackText: {
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
  actions: {
    paddingHorizontal: 24,
    marginTop: 12,
  },
  primaryAction: {
    backgroundColor: '#000',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 16,
    color: '#4b5563',
    marginVertical: 16,
  },
  backBtn: {
    backgroundColor: '#000',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  bottomSpacing: {
    height: 40,
  },
});

export default HistoryDetailScreen;
