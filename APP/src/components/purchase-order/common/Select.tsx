import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  TouchableWithoutFeedback,
} from 'react-native';
import { colors, spacing } from '../../../constants';

export interface SelectOption {
  label: string;
  value: string | number;
}

export interface SelectProps {
  label?: string;
  value?: string | number;
  options: SelectOption[];
  onValueChange: (value: string | number) => void;
  placeholder?: string;
  disabled?: boolean;
  containerStyle?: any;
}

export function Select({
  label,
  value,
  options,
  onValueChange,
  placeholder = '선택하세요',
  disabled = false,
  containerStyle,
}: SelectProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = (option: SelectOption) => {
    onValueChange(option.value);
    setModalVisible(false);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      
      <TouchableOpacity
        style={[styles.selectButton, disabled && styles.selectButtonDisabled]}
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.selectButtonText,
          !selectedOption && styles.selectButtonTextPlaceholder,
        ]}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Text style={styles.selectButtonIcon}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{label || '선택'}</Text>
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    style={styles.modalCloseButton}
                  >
                    <Text style={styles.modalCloseButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
                
                <FlatList
                  data={options}
                  keyExtractor={(item) => String(item.value)}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.optionItem,
                        value === item.value && styles.optionItemSelected,
                      ]}
                      onPress={() => handleSelect(item)}
                    >
                      <Text style={[
                        styles.optionItemText,
                        value === item.value && styles.optionItemTextSelected,
                      ]}>
                        {item.label}
                      </Text>
                      {value === item.value ? (
                        <Text style={styles.optionItemCheck}>✓</Text>
                      ) : null}
                    </TouchableOpacity>
                  )}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    minHeight: 44,
  },
  selectButtonDisabled: {
    opacity: 0.5,
  },
  selectButtonText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  selectButtonTextPlaceholder: {
    color: colors.textSecondary,
  },
  selectButtonIcon: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '80%',
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseButtonText: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionItemSelected: {
    backgroundColor: colors.primary50,
  },
  optionItemText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  optionItemTextSelected: {
    fontWeight: '600',
    color: colors.primary,
  },
  optionItemCheck: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: 'bold',
  },
});

