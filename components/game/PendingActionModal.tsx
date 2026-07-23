"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { useT } from '@/components/i18n/locale-provider';

export interface PendingActionModalProps {
  isVisible: boolean;
  actionTitle: string; // Derived from actionFamily or description
  warningText: string;
  difficultyPreview: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PendingActionModal({ 
  isVisible, 
  actionTitle, 
  warningText, 
  difficultyPreview, 
  onConfirm, 
  onCancel
}: PendingActionModalProps) {
  const t = useT();

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="relative w-full max-w-lg p-8 rounded-xl bg-[url('/assets/parchment-bg.jpg')] bg-cover shadow-[0_0_50px_rgba(0,0,0,0.8)] border-4 border-[#3a2e1d]"
            // Note: Replace background with actual parchment asset or solid color if missing
            style={{ backgroundColor: '#f4e4bc' }} // Fallback
          >
            <div className="absolute inset-0 border border-[#8b6b4a] m-1 pointer-events-none opacity-50" />
            
            <h2 className="text-3xl font-serif text-[#3a2e1d] text-center mb-6 uppercase tracking-widest border-b-2 border-[#8b6b4a]/30 pb-4">
              {actionTitle}
            </h2>

            <div className="space-y-4 mb-8">
              <p className="text-lg text-[#5a462b] italic text-center">
                {warningText}
              </p>
              
              <div className="bg-[#e4d1a5] p-4 rounded text-center shadow-inner border border-[#c1aa82]">
                <span className="text-[#8b6b4a] uppercase text-sm font-bold tracking-wider block mb-1">
                  {t.outcome.pendingAction.requiredScoreLabel}
                </span>
                <span className="text-4xl font-serif text-[#3a2e1d] font-bold">
                  {difficultyPreview}
                </span>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <button 
                onClick={onCancel}
                className="px-6 py-3 font-serif uppercase tracking-wider border-2 border-[#8b6b4a] text-[#5a462b] hover:bg-[#8b6b4a] hover:text-[#f4e4bc] transition-colors"
              >
                {t.outcome.pendingAction.retreat}
              </button>
              <button
                onClick={onConfirm}
                className="px-8 py-3 font-serif uppercase tracking-wider bg-[#8b0000] border-2 border-[#5a0000] text-[#f4e4bc] hover:bg-[#aa0000] transition-colors shadow-lg"
              >
                {t.outcome.pendingAction.rollDice}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
