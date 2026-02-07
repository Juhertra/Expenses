import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import QuickAddScreen from './src/screens/QuickAddScreen';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <QuickAddScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});
