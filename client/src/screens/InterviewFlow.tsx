import React, { useState, useEffect } from 'react';
import { InterviewLoadingScreen } from '../components/InterviewLoadingScreen';
import InterviewScreen from './InterviewScreen';

interface InterviewFlowProps {
  navigation?: any;
  resumeAnalysis?: any;
  selectedPosition?: string;
  selectedDomain?: string;
  isAiMode?: boolean;
  onBack?: () => void;
  onComplete?: (feedback: any) => void;
}

export const InterviewFlow: React.FC<InterviewFlowProps> = (props) => {
  const [showLoading, setShowLoading] = useState(true);
  const [minimumLoadingComplete, setMinimumLoadingComplete] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  useEffect(() => {
    // Minimum loading time of 3 seconds for better UX
    const timer = setTimeout(() => {
      setMinimumLoadingComplete(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Once minimum loading is complete AND permissions are granted, transition to interview
  useEffect(() => {
    if (minimumLoadingComplete && permissionsGranted) {
      // Small delay to ensure smooth transition
      const transitionTimer = setTimeout(() => {
        setShowLoading(false);
      }, 500);

      return () => clearTimeout(transitionTimer);
    }
  }, [minimumLoadingComplete, permissionsGranted]);

  const handlePermissionsGranted = () => {
    console.log('✅ Permissions granted in loading screen');
    setPermissionsGranted(true);
  };

  const handlePermissionsDenied = () => {
    console.log('❌ Permissions denied in loading screen');
    setPermissionsGranted(false);
    // Keep showing the loading screen with retry options
  };

  if (showLoading) {
    return (
      <InterviewLoadingScreen 
        onPermissionsGranted={handlePermissionsGranted}
        onPermissionsDenied={handlePermissionsDenied}
      />
    );
  }

  return <InterviewScreen {...props} skipPermissionCheck={true} />;
};

export default InterviewFlow;
