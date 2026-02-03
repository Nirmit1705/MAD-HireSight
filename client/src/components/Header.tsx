import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface HeaderProps {
  showHeader: boolean;
  onProfilePress: () => void;
}

const Header: React.FC<HeaderProps> = ({ showHeader, onProfilePress }) => {
  const headerAnimation = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(headerAnimation, {
      toValue: showHeader ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [showHeader]);

  return (
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
      <TouchableOpacity style={styles.profileButton} onPress={onProfilePress}>
        <Icon name="account-circle" size={50} color="#fff" />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
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
    padding: 0,
  },
});

export default Header;
