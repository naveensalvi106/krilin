import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Flame, Calendar, Trophy, ArrowRight } from 'lucide-react';
import type { Task, Section } from '@/lib/store';
import { playGolden } from '@/lib/sounds';

interface StreakOrbProps {
  percent: number;
  isGolden: boolean;
  streak: number;
  completedCount: number;
  totalCount: number;
  nextTask?: Task;
  nextTaskSection?: Section;
}

const StreakOrb = ({ percent, isGolden, streak, completedCount, totalCount, nextTask, nextTaskSection }: StreakOrbProps) => {
  const wasGolden = useRef(false);
  useEffect(() => {
    if (isGolden && !wasGolden.current) playGolden();
    wasGolden.current = isGolden;
  }, [isGolden]);

  const today = new Date();
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="space-y-3">
      {/* Compact stats row */}
      <div className="glass-panel-accent bevel px-4 py-3 flex items-center gap-3">
        {/* Mini orb */}
        <div className="relative w-14 h-14 shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
            <motion.circle
              cx="50" cy="50" r="42" fill="none"
              stroke={isGolden ? 'url(#goldGradCompact)' : 'url(#glassGradCompact)'}
              strokeWidth="8" strokeLinecap="round"
              strokeDasharray={264}
              initial={{ strokeDashoffset: 264 }}
              animate={{ strokeDashoffset: 264 - (264 * percent) / 100 }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
            <defs>
              <linearGradient id="glassGradCompact" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(150,220,255,0.9)" />
                <stop offset="100%" stopColor="rgba(100,160,255,0.9)" />
              </linearGradient>
              <linearGradient id="goldGradCompact" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(45, 100%, 65%)" />
                <stop offset="100%" stopColor="hsl(35, 100%, 45%)" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-sm font-display font-bold ${isGolden ? 'text-gradient-gold' : 'text-gradient-fire'}`}>
              {percent}%
            </span>
            {isGolden && <Trophy className="w-3 h-3 text-yellow-400" />}
          </div>
        </div>

        {/* Stats with big day count */}
        <div className="flex-1 min-w-0">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <span className="text-3xl font-display font-black text-gradient-fire"
              style={{ filter: 'drop-shadow(0 0 12px rgba(100,180,255,0.4))' }}
            >
              Day {streak || 1}
            </span>
          </motion.div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>{dayName}</span>
            <span className="text-foreground font-medium">{dateStr}</span>
            <span className="ml-auto flex items-center gap-1">
              <Flame className="w-3 h-3 icon-glow" />
              <span className="text-gradient-fire font-bold">{completedCount}</span>/{totalCount}
            </span>
          </div>
        </div>
      </div>

      {/* Hero Next Task */}
      {nextTask && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-2xl overflow-hidden glass-panel"
          style={{
            boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.15)',
          }}
        >
          <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{
            background: 'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.08), transparent 60%)',
          }} />

          <div className="relative px-5 py-5 flex items-center">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-2">
                <ArrowRight className="w-3.5 h-3.5 text-white/70" />
                <span className="text-[10px] font-medium uppercase tracking-wider text-white/60">Next Up</span>
              </div>
              <h3 className="text-xl font-display font-bold text-white leading-tight">
                {nextTask.title}
              </h3>
              {nextTaskSection && (
                <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full text-white/80 font-medium" style={{ background: 'rgba(255,255,255,0.12)' }}>
                  {nextTaskSection.name}
                </span>
              )}
            </div>
            {(nextTask.iconUrls || []).length > 0 && (
              <img src={nextTask.iconUrls![0]} alt="" className="w-20 h-20 object-contain shrink-0 opacity-90 drop-shadow-lg" />
            )}
          </div>
        </motion.div>
      )}

      {/* All done state */}
      {!nextTask && totalCount > 0 && isGolden && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative rounded-2xl overflow-hidden text-center py-6 px-5 glass-panel-accent"
        >
          <Trophy className="w-8 h-8 text-yellow-300 mx-auto mb-2" />
          <h3 className="text-lg font-display font-bold text-white">All Done! ✨</h3>
          <p className="text-sm text-white/70 mt-1">Every task completed. You're unstoppable.</p>
        </motion.div>
      )}
    </div>
  );
};

export default StreakOrb;
