import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/contexts/AuthContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import { RootNavigator } from './src/navigation';

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <RootNavigator />
        <StatusBar style="auto" />
      </LanguageProvider>
    </AuthProvider>
  );
}
