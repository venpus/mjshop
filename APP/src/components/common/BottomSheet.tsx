/**
 * 바텀시트 컴포넌트
 * 모바일 앱에서 하단에서 올라오는 시트
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
} from 'react-native';
import { colors, spacing } from '../../constants';

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  height?: number; // 시트 높이 (0.0-1.0: 화면 비율, 1.0 이상: 픽셀 값, 기본값: 0.7)
}

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  height,
}: BottomSheetProps) {
  const screenHeight = Dimensions.get('window').height;
  const defaultHeight = screenHeight * 0.7;
  // height가 1.0 이하면 비율로, 1.0 초과면 픽셀 값으로 처리
  const sheetHeight = height 
    ? (height <= 1.0 ? screenHeight * height : height)
    : defaultHeight;

  const slideAnim = React.useRef(new Animated.Value(sheetHeight)).current;

  useEffect(() => {
    if (visible) {
      // 모달이 열릴 때: 화면 밖에서 시작하여 화면 안으로 이동
      slideAnim.setValue(sheetHeight);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      // 모달이 닫힐 때: 화면 안에서 화면 밖으로 이동
      Animated.timing(slideAnim, {
        toValue: sheetHeight,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, sheetHeight, slideAnim]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <Animated.View
              style={[
                styles.sheet,
                {
                  height: sheetHeight,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              {/* 핸들 바 */}
              <View style={styles.handleContainer}>
                <View style={styles.handle} />
              </View>

              {/* 헤더 */}
              {title && (
                <View style={styles.header}>
                  <Text style={styles.title}>{title}</Text>
                  <TouchableOpacity
                    onPress={onClose}
                    style={styles.closeButton}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* 내용 */}
              <View style={styles.content}>
                {children}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  handleContainer: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.gray300,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray900,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: colors.gray600,
  },
  content: {
    flex: 1,
  },
});

