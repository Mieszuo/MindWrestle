"use client";

import React, { useEffect, useRef, useState } from 'react';
import DiceBox from '@3d-dice/dice-box';
import { motion, AnimatePresence } from 'framer-motion';

import { useT } from '@/components/i18n/locale-provider';

export interface DiceRollerOverlayProps {
  isVisible: boolean;
  targetRoll: number;
  difficulty: number;
  outcome?: 'success' | 'failure' | 'critical_failure';
  onAnimationComplete: () => void;
}

export function DiceRollerOverlay({ isVisible, targetRoll, difficulty, outcome, onAnimationComplete }: DiceRollerOverlayProps) {
  const t = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const diceBoxRef = useRef<any>(null);
  const [showResult, setShowResult] = useState(false);
  const [resultType, setResultType] = useState<'success' | 'failure' | 'critical_failure'>('failure');

  useEffect(() => {
    if (isVisible && containerRef.current && !diceBoxRef.current) {
      const diceBox = new DiceBox(containerRef.current, {
        assetPath: '/assets/dice-box/',
        theme: 'default',
        themeColor: '#7a7a7a',
        scale: 6,
        mass: 3,
        gravity: 2,
        friction: 0.8,
        restition: 0.5,
      });

      diceBox.init().then(() => {
        diceBoxRef.current = diceBox;
        rollDice();
      }).catch((e: any) => console.error("DiceBox init error:", e));
    } else if (isVisible && diceBoxRef.current) {
      rollDice();
    }

    return () => {
      if (diceBoxRef.current) {
        diceBoxRef.current.clear?.();
        diceBoxRef.current = null;
      }
    };
  }, [isVisible]);

  const resolveOutcome = () => {
    if (outcome) return outcome;
    return targetRoll >= difficulty ? 'success' : 'failure';
  };

  const rollDice = () => {
    setShowResult(false);
    diceBoxRef.current.roll([
      { sides: 20, themeColor: '#d4af37', qty: 1, value: targetRoll }
    ]).then(() => {
      setResultType(resolveOutcome());
      setShowResult(true);

      setTimeout(() => {
        onAnimationComplete();
        setShowResult(false);
        diceBoxRef.current?.clear();
      }, 3000);
    });
  };

  const resultConfig = {
    success: { text: t.outcome.dice.success, className: 'text-green-500' },
    failure: { text: t.outcome.dice.failure, className: 'text-red-500' },
    critical_failure: { text: t.outcome.dice.criticalFailure, className: 'text-red-600 animate-pulse' },
  } as const;

  const cfg = resultConfig[resultType];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none"
        >
          <motion.div 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute top-24 text-4xl font-serif text-[#d4af37] tracking-widest drop-shadow-[0_0_10px_rgba(212,175,55,0.8)]"
          >
            {t.outcome.dice.targetLabel(difficulty)}
          </motion.div>

          <div ref={containerRef} className="absolute inset-0 pointer-events-none" />

          <AnimatePresence>
            {showResult && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className={`absolute bottom-32 text-6xl font-bold uppercase tracking-widest drop-shadow-[0_0_20px_rgba(0,0,0,0.8)] ${cfg.className}`}
              >
                {cfg.text}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
