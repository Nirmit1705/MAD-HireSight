import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Animated,
  Dimensions,
  ActivityIndicator,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AptitudeService, Question } from '../services/aptitudeService';

const { width } = Dimensions.get('window');

interface PracticeTestScreenProps {
  onExit?: () => void;
}

const PracticeTestScreen: React.FC<PracticeTestScreenProps> = ({ onExit }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{[key: number]: number}>({}); // question index -> selected option index
  const [isFinished, setIsFinished] = useState(false);
  const [timer, setTimer] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    fetchQuestions();
    
    const interval = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchQuestions = async () => {
    try {
      setIsLoading(true);
      const data = await AptitudeService.getPracticeQuestions('FRONTEND_DEVELOPER');
      setQuestions(data);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load questions');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerSelect = (index: number) => {
    if (isFinished) return;
    
    setUserAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: index
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      animateTransition(() => setCurrentQuestionIndex(prev => prev + 1));
    } else {
      handleFinish();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      animateTransition(() => setCurrentQuestionIndex(prev => prev - 1));
    }
  };

  const handleQuestionOverviewPress = (index: number) => {
    animateTransition(() => setCurrentQuestionIndex(index));
  };

  const animateTransition = (callback: () => void) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    callback();
  };

  const handleFinish = () => {
    Alert.alert(
      "Finish Practice",
      "Are you sure you want to finish the practice session?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Finish", 
          onPress: () => setIsFinished(true) 
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>Loading questions...</Text>
      </View>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const selectedAnswer = userAnswers[currentQuestionIndex];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onExit} style={styles.exitButton}>
            <Icon name="close" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Practice - Aptitude Test</Text>
          <View style={styles.timerContainer}>
            <Icon name="clock-outline" size={18} color="#111827" />
            <Text style={styles.timerText}>{formatTime(timer)}</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Icon name="information-outline" size={20} color="#111827" />
          <Text style={styles.infoBannerText}>
             {isFinished 
               ? "Review your answers. Green indicates correct, Red indicates incorrect."
               : "Practice Mode: Take your time. Results are shown after you finish."}
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.questionCounter}>
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </Text>
        </View>

        {/* Question Card */}
        <Animated.View style={[styles.questionCard, { opacity: fadeAnim }]}>
          <View style={styles.questionHeader}>
            <View style={styles.questionNumberBadge}>
              <Text style={styles.questionNumberText}>Q{currentQuestionIndex + 1}</Text>
            </View>
          </View>

          <Text style={styles.questionText}>{currentQuestion?.questionText}</Text>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {currentQuestion?.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrect = index === currentQuestion.correctOption;
              
              let optionStyle = styles.optionButton;
              let textStyle = styles.optionText;
              let radioStyle = styles.radioButton;

              if (isFinished) {
                if (isCorrect) {
                  optionStyle = {...optionStyle, ...styles.optionButtonCorrect};
                  radioStyle = {...radioStyle, ...styles.radioButtonCorrect};
                } else if (isSelected && !isCorrect) {
                  optionStyle = {...optionStyle, ...styles.optionButtonWrong};
                  radioStyle = {...radioStyle, ...styles.radioButtonWrong};
                } else if (isSelected) {
                   // Should not happen if logic above covers it but for safety
                   optionStyle = {...optionStyle, ...styles.optionButtonSelected};
                }
              } else {
                if (isSelected) {
                   optionStyle = {...optionStyle, ...styles.optionButtonSelected};
                   radioStyle = {...radioStyle, ...styles.radioButtonSelected};
                   textStyle = {...textStyle, ...styles.optionTextSelected};
                }
              }

              return (
                <TouchableOpacity
                  key={index}
                  style={[optionStyle]}
                  onPress={() => handleAnswerSelect(index)}
                  activeOpacity={0.7}
                  disabled={isFinished}
                >
                  <View style={[radioStyle]}>
                    {isSelected && <View style={styles.radioButtonInner} />}
                  </View>
                  <Text style={[textStyle]}>
                    {option}
                  </Text>
                  
                  {isFinished && isCorrect && (
                    <Icon name="check-circle" size={20} color="#059669" style={styles.resultIcon} />
                  )}
                  {isFinished && isSelected && !isCorrect && (
                    <Icon name="close-circle" size={20} color="#dc2626" style={styles.resultIcon} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          
          {isFinished && currentQuestion.explanation && (
             <View style={styles.explanationContainer}>
                <Text style={styles.explanationTitle}>Explanation:</Text>
                <Text style={styles.explanationText}>{currentQuestion.explanation}</Text>
             </View>
          )}
        </Animated.View>

        {/* Navigation Buttons */}
        <View style={styles.navigationContainer}>
          <TouchableOpacity
            style={[
              styles.navButton,
              styles.prevButton,
              currentQuestionIndex === 0 && styles.navButtonDisabled,
            ]}
            onPress={handlePrevious}
            disabled={currentQuestionIndex === 0}
            activeOpacity={0.7}
          >
            <Icon 
              name="chevron-left" 
              size={20} 
              color={currentQuestionIndex === 0 ? '#9ca3af' : '#374151'} 
            />
            <Text style={[
              styles.navButtonText,
              currentQuestionIndex === 0 && styles.navButtonTextDisabled,
            ]}>
              Previous
            </Text>
          </TouchableOpacity>

          {!isFinished && (
            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNext}
              activeOpacity={0.85}
            >
              <Text style={styles.nextButtonText}>
                {currentQuestionIndex === totalQuestions - 1 ? 'Finish' : 'Next'}
              </Text>
              <Icon name="chevron-right" size={20} color="#fff" />
            </TouchableOpacity>
          )}
          
          {isFinished && (
             <TouchableOpacity
              style={styles.nextButton}
              onPress={onExit}
              activeOpacity={0.85}
            >
              <Text style={styles.nextButtonText}>Exit</Text>
              <Icon name="logout" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Question Overview */}
        <View style={styles.overviewCard}>
          <Text style={styles.overviewTitle}>Question Overview</Text>
          
          <View style={styles.questionsGrid}>
            {questions.map((q, index) => {
              const isCurrent = index === currentQuestionIndex;
              const isAnswered = userAnswers[index] !== undefined;
              const isCorrect = isFinished && userAnswers[index] === q.correctOption;
              const isWrong = isFinished && userAnswers[index] !== undefined && userAnswers[index] !== q.correctOption;
              
              let circleStyle = styles.questionCircle;
              let textStyle = styles.questionCircleText;
              
              if (isCurrent) {
                  circleStyle = {...circleStyle, ...styles.questionCircleCurrent};
                  textStyle = {...textStyle, ...styles.questionCircleTextCurrent};
              } else if (isFinished) {
                  if (isCorrect) {
                      circleStyle = {...circleStyle, backgroundColor: '#d1fae5', borderColor: '#059669'};
                      textStyle = {...textStyle, color: '#059669'};
                  } else if (isWrong) {
                      circleStyle = {...circleStyle, backgroundColor: '#fee2e2', borderColor: '#dc2626'};
                      textStyle = {...textStyle, color: '#dc2626'};
                  } else {
                       // Unanswered
                       circleStyle = {...circleStyle, ...styles.questionCircleUnanswered};
                  }
              } else if (isAnswered) {
                  circleStyle = {...circleStyle, ...styles.questionCircleAnswered};
                  textStyle = {...textStyle, ...styles.questionCircleTextAnswered};
              }

              return (
                <TouchableOpacity
                  key={index}
                  style={[circleStyle]}
                  onPress={() => handleQuestionOverviewPress(index)}
                  activeOpacity={0.7}
                >
                  <Text style={[textStyle]}>
                    {index + 1}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Legend */}
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendIndicator, styles.legendCurrent]} />
              <Text style={styles.legendText}>Current</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendIndicator, isFinished ? {backgroundColor: '#d1fae5', borderColor: '#059669', borderWidth: 1} : styles.legendAnswered]} />
              <Text style={styles.legendText}>{isFinished ? 'Correct' : 'Answered'}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendIndicator, isFinished ? {backgroundColor: '#fee2e2', borderColor: '#dc2626', borderWidth: 1} : styles.legendUnanswered]} />
              <Text style={styles.legendText}>{isFinished ? 'Incorrect' : 'Unanswered'}</Text>
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
    backgroundColor: '#f9fafb',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingTop: StatusBar.currentHeight || 40,
    paddingBottom: 12,
    paddingHorizontal: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exitButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginLeft: 12,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  infoBanner: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#111827',
    borderRadius: 3,
  },
  questionCounter: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  questionHeader: {
    marginBottom: 16,
  },
  questionNumberBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  questionNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 28,
    marginBottom: 24,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    gap: 12,
  },
  optionButtonSelected: {
    borderColor: '#111827',
    backgroundColor: '#f9fafb',
  },
  optionButtonCorrect: {
    backgroundColor: '#d1fae5',
    borderColor: '#059669',
  },
  optionButtonWrong: {
     backgroundColor: '#fee2e2',
     borderColor: '#dc2626',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: '#111827',
  },
  radioButtonCorrect: {
    borderColor: '#059669',
  },
  radioButtonWrong: {
    borderColor: '#dc2626',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#111827',
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  optionTextSelected: {
    color: '#111827',
    fontWeight: '500',
  },
  resultIcon: {
    marginLeft: 'auto',
  },
  explanationContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#000',
  },
  explanationTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#000',
  },
  explanationText: {
    color: '#334155',
    lineHeight: 20,
  },
  navigationContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    gap: 6,
  },
  prevButton: {},
  navButtonDisabled: {
    opacity: 0.4,
  },
  navButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  navButtonTextDisabled: {
    color: '#9ca3af',
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#111827',
    gap: 6,
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  overviewCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  overviewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  questionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  questionCircle: {
    width: (width - 92) / 5,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  questionCircleCurrent: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  questionCircleAnswered: {
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
  },
  questionCircleUnanswered: {
    backgroundColor: '#fff',
    borderColor: '#e5e7eb',
  },
  questionCircleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },
  questionCircleTextCurrent: {
    color: '#fff',
  },
  questionCircleTextAnswered: {
    color: '#374151',
  },
  legendContainer: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendCurrent: {
    backgroundColor: '#111827',
  },
  legendAnswered: {
    backgroundColor: '#d1d5db',
  },
  legendUnanswered: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  legendText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  bottomSpacing: {
    height: 40,
  },
});

export default PracticeTestScreen;
