/**
 * 패킹리스트 화면 (임시)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Container, Header } from '../components/common';
import { useMenuDrawer } from '../contexts/MenuDrawerContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function PackingListScreen() {
  const { openDrawer } = useMenuDrawer();
  const { t } = useLanguage();

  return (
    <Container safeArea padding={false}>
      <Header
        title={t('menu.packingList') || '패킹리스트'}
        showMenuButton={true}
        onMenuPress={openDrawer}
      />
      <View style={styles.container}>
        <Text style={styles.text}>패킹리스트 화면</Text>
        <Text style={styles.subtext}>이 화면은 추후 구현 예정입니다.</Text>
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtext: {
    fontSize: 16,
    color: '#666',
  },
});

