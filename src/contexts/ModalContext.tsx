/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';

// Modal context state - Modal visibility and editing state
export interface ModalContextState {
  // Modal visibility
  showAddModal: boolean;
  showSettingsModal: boolean;
  showCommandPalette: boolean;
  showCategoryModal: boolean;
  showSettlementModal: boolean;
  showWelcomeModal: boolean;
  showFolderSelectionModal: boolean;

  // Settings modal tab
  settingsInitialTab: 'settings' | 'shortcuts';

  // Edit states
  editingId: number | null;
  editingCategory: string | null;
  inlineEditId: number | null;

  // Delete confirmation states
  deleteConfirm: {
    id: number;
    description: string;
    type: 'expense' | 'recurring';
  } | null;

  showDeleteCategoryConfirm: {
    categoryName: string;
    transactionCount: number;
    reassignTo: string;
  } | null;
}

// Context value interface
interface ModalContextValue extends ModalContextState {
  // Modal visibility setters
  setShowAddModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowSettingsModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowCommandPalette: React.Dispatch<React.SetStateAction<boolean>>;
  setShowCategoryModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowSettlementModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowWelcomeModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowFolderSelectionModal: React.Dispatch<React.SetStateAction<boolean>>;

  // Settings modal tab setter
  setSettingsInitialTab: React.Dispatch<React.SetStateAction<'settings' | 'shortcuts'>>;

  // Edit states setters
  setEditingId: React.Dispatch<React.SetStateAction<number | null>>;
  setEditingCategory: React.Dispatch<React.SetStateAction<string | null>>;
  setInlineEditId: React.Dispatch<React.SetStateAction<number | null>>;

  // Delete confirmation setters
  setDeleteConfirm: React.Dispatch<React.SetStateAction<ModalContextState['deleteConfirm']>>;
  setShowDeleteCategoryConfirm: React.Dispatch<React.SetStateAction<ModalContextState['showDeleteCategoryConfirm']>>;

  // Helper actions
  openSettingsModal: (tab?: 'settings' | 'shortcuts') => void;
  closeAllModals: () => void;
}

// Create context
export const ModalContext = createContext<ModalContextValue | null>(null);

// Provider component
export function ModalProvider({ children }: { children: ReactNode }) {
  // Modal visibility
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showFolderSelectionModal, setShowFolderSelectionModal] = useState(false);

  // Settings modal tab
  const [settingsInitialTab, setSettingsInitialTab] = useState<'settings' | 'shortcuts'>('settings');

  // Edit states
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [inlineEditId, setInlineEditId] = useState<number | null>(null);

  // Delete confirmation states
  const [deleteConfirm, setDeleteConfirm] = useState<ModalContextState['deleteConfirm']>(null);
  const [showDeleteCategoryConfirm, setShowDeleteCategoryConfirm] = useState<ModalContextState['showDeleteCategoryConfirm']>(null);

  // Helper to open settings modal with specific tab
  const openSettingsModal = (tab: 'settings' | 'shortcuts' = 'settings') => {
    setSettingsInitialTab(tab);
    setShowSettingsModal(true);
  };

  // Helper to close all modals
  const closeAllModals = () => {
    setShowAddModal(false);
    setShowSettingsModal(false);
    setShowCommandPalette(false);
    setShowCategoryModal(false);
    setShowSettlementModal(false);
    setShowWelcomeModal(false);
    setShowFolderSelectionModal(false);
    setEditingId(null);
    setEditingCategory(null);
    setInlineEditId(null);
    setDeleteConfirm(null);
    setShowDeleteCategoryConfirm(null);
  };

  // Memoize context value to prevent unnecessary re-renders
  const value: ModalContextValue = useMemo(() => ({
    // State
    showAddModal,
    showSettingsModal,
    showCommandPalette,
    showCategoryModal,
    showSettlementModal,
    showWelcomeModal,
    showFolderSelectionModal,
    settingsInitialTab,
    editingId,
    editingCategory,
    inlineEditId,
    deleteConfirm,
    showDeleteCategoryConfirm,

    // Setters
    setShowAddModal,
    setShowSettingsModal,
    setShowCommandPalette,
    setShowCategoryModal,
    setShowSettlementModal,
    setShowWelcomeModal,
    setShowFolderSelectionModal,
    setSettingsInitialTab,
    setEditingId,
    setEditingCategory,
    setInlineEditId,
    setDeleteConfirm,
    setShowDeleteCategoryConfirm,

    // Helpers
    openSettingsModal,
    closeAllModals,
  }), [
    showAddModal,
    showSettingsModal,
    showCommandPalette,
    showCategoryModal,
    showSettlementModal,
    showWelcomeModal,
    showFolderSelectionModal,
    settingsInitialTab,
    editingId,
    editingCategory,
    inlineEditId,
    deleteConfirm,
    showDeleteCategoryConfirm,
    openSettingsModal,
    closeAllModals,
  ]);

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  );
}

// Custom hook to use the context
export function useModalContext() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModalContext must be used within ModalProvider');
  }
  return context;
}
