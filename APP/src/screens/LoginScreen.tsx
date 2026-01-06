/**
 * 로그인 화면
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Button, Input, Container } from '../components/common';
import { useAuth } from '../contexts';
import { useLanguage } from '../contexts';
import { colors, spacing } from '../constants';
import type { StackScreenProps } from '@react-navigation/stack';
import type { AuthStackParamList } from '../navigation/types';

type LoginScreenProps = StackScreenProps<AuthStackParamList, 'Login'>;

const LoginScreen: React.FC<LoginScreenProps> = () => {
  const { login } = useAuth();
  const { t } = useLanguage();
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setError(null);

    // 유효성 검사
    if (!id.trim()) {
      setError(t('login.idRequired') || 'ID를 입력해주세요.');
      return;
    }

    if (!password.trim()) {
      setError(t('login.passwordRequired') || '비밀번호를 입력해주세요.');
      return;
    }

    try {
      setIsLoading(true);
      await login(id.trim(), password);
      // 로그인 성공 시 navigation은 RootNavigator에서 자동 처리됨
    } catch (err: any) {
      setError(err.message || (t('login.failed') || '로그인에 실패했습니다.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container safeArea padding={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            {/* Logo/Title */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Text style={styles.logoIcon}>🔐</Text>
              </View>
              <Text style={styles.title}>{t('login.title') || '관리자 로그인'}</Text>
              <Text style={styles.subtitle}>
                {t('login.subtitle') || '시스템에 로그인하세요'}
              </Text>
            </View>

            {/* Login Form */}
            <View style={styles.formContainer}>
              {/* Error Message */}
              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorIcon}>⚠️</Text>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* ID Input */}
              <Input
                label={t('login.id') || 'ID'}
                value={id}
                onChangeText={setId}
                placeholder={t('login.idPlaceholder') || '관리자 ID를 입력하세요'}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                containerStyle={styles.inputContainer}
              />

              {/* Password Input */}
              <Input
                label={t('login.password') || '비밀번호'}
                value={password}
                onChangeText={setPassword}
                placeholder={t('login.passwordPlaceholder') || '비밀번호를 입력하세요'}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                containerStyle={styles.inputContainer}
                onSubmitEditing={handleSubmit}
              />

              {/* Forgot Password Link */}
              <TouchableOpacity
                style={styles.forgotPasswordContainer}
                onPress={() => {
                  Alert.alert('알림', '비밀번호 찾기 기능은 준비 중입니다.');
                }}
                disabled={isLoading}
              >
                <Text style={styles.forgotPasswordText}>
                  {t('login.forgotPassword') || '비밀번호를 잊으셨나요?'}
                </Text>
              </TouchableOpacity>

              {/* Login Button */}
              <Button
                title={isLoading ? (t('login.loggingIn') || '로그인 중...') : (t('login.login') || '로그인')}
                onPress={handleSubmit}
                variant="primary"
                size="lg"
                disabled={isLoading}
                loading={isLoading}
                style={styles.loginButton}
              />
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                © 2025-2026 WK 관리 시스템. All rights reserved.
              </Text>
              <Text style={styles.footerText}>Development By INVENTIO</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Container>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logoIcon: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.gray900,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: colors.gray600,
  },
  formContainer: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#991b1b',
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: spacing.md,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: colors.primary,
  },
  loginButton: {
    marginTop: spacing.sm,
  },
  footer: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: colors.gray500,
    marginBottom: spacing.xs,
  },
});

export default LoginScreen;
