/**
 * 드로어 메뉴 컨텍스트
 * 모든 화면에서 드로어 메뉴를 열고 닫을 수 있도록 함
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface MenuDrawerContextType {
  isOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
}

const MenuDrawerContext = createContext<MenuDrawerContextType | undefined>(undefined);

interface MenuDrawerProviderProps {
  children: ReactNode;
}

export function MenuDrawerProvider({ children }: MenuDrawerProviderProps) {
  const [isOpen, setIsOpen] = useState(false);

  const openDrawer = () => setIsOpen(true);
  const closeDrawer = () => setIsOpen(false);
  const toggleDrawer = () => setIsOpen((prev) => !prev);

  return (
    <MenuDrawerContext.Provider value={{ isOpen, openDrawer, closeDrawer, toggleDrawer }}>
      {children}
    </MenuDrawerContext.Provider>
  );
}

export function useMenuDrawer() {
  const context = useContext(MenuDrawerContext);
  if (context === undefined) {
    throw new Error('useMenuDrawer must be used within a MenuDrawerProvider');
  }
  return context;
}

