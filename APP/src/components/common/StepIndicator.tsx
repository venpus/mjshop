/**
 * StepIndicator 컴포넌트
 * 단계별 진행 표시기
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../../constants';

export interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
}

export function StepIndicator({
  currentStep,
  totalSteps,
  labels = [],
}: StepIndicatorProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: totalSteps }, (_, index) => {
        const step = index + 1;
        const isActive = step === currentStep;
        const isCompleted = step < currentStep;
        const label = labels[index] || `Step ${step}`;

        return (
          <View key={step} style={styles.stepContainer}>
            <View style={styles.stepContent}>
              <View
                style={[
                  styles.stepCircle,
                  isActive && styles.stepCircleActive,
                  isCompleted && styles.stepCircleCompleted,
                ]}
              >
                {isCompleted ? (
                  <Text style={styles.stepCheck}>✓</Text>
                ) : (
                  <Text
                    style={[
                      styles.stepNumber,
                      isActive && styles.stepNumberActive,
                    ]}
                  >
                    {step}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  isActive && styles.stepLabelActive,
                  isCompleted && styles.stepLabelCompleted,
                ]}
              >
                {label}
              </Text>
            </View>
            {step < totalSteps && (
              <View
                style={[
                  styles.connector,
                  isCompleted && styles.connectorCompleted,
                ]}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stepContent: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  stepCircleActive: {
    backgroundColor: colors.primary,
  },
  stepCircleCompleted: {
    backgroundColor: colors.success,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray600,
  },
  stepNumberActive: {
    color: colors.white,
  },
  stepCheck: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
  stepLabel: {
    fontSize: 12,
    color: colors.gray600,
    textAlign: 'center',
  },
  stepLabelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  stepLabelCompleted: {
    color: colors.success,
  },
  connector: {
    flex: 1,
    height: 2,
    backgroundColor: colors.gray200,
    marginHorizontal: spacing.xs,
    marginBottom: spacing.xs + 16,
  },
  connectorCompleted: {
    backgroundColor: colors.success,
  },
});

