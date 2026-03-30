import { motion } from 'framer-motion';
import { Flame, Calendar, Trophy, ArrowRight } from 'lucide-react';
import type { Task, Section } from '@/lib/store';
import fireOrbGif from '@/assets/fire-orb.gif';

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
  const today = new Date();
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const nextHue = nextTaskSection?.color?.split(' ')[0] || '45';
  const nextSat = nextTaskSection?.color?.split(' ')[1] || '90%';

  return (
    <div className="space-y-3">
      {/* Day count hero with fire GIF */}
      <div className="glass-panel-accent bevel px-4 py-4 flex items-center gap-4">
        {/* Fire GIF orb */}
        <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
          <img src={fireOrbGif} alt="Fire" className="w-20 h-20 object-contain" />
          {/* Progress ring around fire */}
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(15, 10%, 12%)" strokeWidth="4" opacity="0.3" />
            <motion.circle
              cx="50" cy="50" r="45" fill="none"
              stroke={isGolden ? 'url(#goldGradOrb)' : 'url(#fireGradOrb)'}
              strokeWidth="4" strokeLinecap="round"
              strokeDasharray={283}
              initial={{ strokeDashoffset: 283 }}
              animate={{ strokeDashoffset: 283 - (283 * percent) / 100 }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
            <defs>
              <linearGradient id="fireGradOrb" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(45, 100%, 60%)" />
                <stop offset="100%" stopColor="hsl(25, 90%, 50%)" />
              </linearGradient>
              <linearGradient id="goldGradOrb" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(45, 100%, 65%)" />
                <stop offset="100%" stopColor="hsl(35, 100%, 45%)" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Day info */}
        <div className="flex-1 min-w-0">
          {/* Big day count */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-1"
          >
            <span className="text-4xl font-display font-black"
              style={{
                background: 'linear-gradient(135deg, hsl(50, 100%, 65%), hsl(40, 100%, 55%), hsl(25, 100%, 50%), hsl(15, 90%, 48%))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 12px hsl(35 100% 50% / 0.5))',
              }}
            >
              Day {streak || 1}
            </span>
          </motion.div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Calendar className="w-3 h-3" />
            <span>{dayName}</span>
            <span className="text-foreground font-medium">{dateStr}</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-muted-foreground">{percent}%</span>
            <span><span className="text-gradient-fire font-bold">{completedCount}</span> <span className="text-muted-foreground">Done</span></span>
            <span><span className="text-foreground font-bold">{totalCount}</span> <span className="text-muted-foreground">Total</span></span>
            {isGolden && <Trophy className="w-3.5 h-3.5 text-yellow-400" />}
          </div>
        </div>
      </div>

      {/* Hero Next Task */}
      {nextTask && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: `linear-gradient(145deg, hsl(${nextHue} ${nextSat} 55%), hsl(${nextHue} ${nextSat} 42%), hsl(${nextHue} ${nextSat} 30%))`,
            border: `1px solid hsl(${nextHue} ${nextSat} 65%)`,
            borderTop: `1px solid hsl(${nextHue} ${nextSat} 70%)`,
            borderBottom: `1px solid hsl(${nextHue} ${nextSat} 25%)`,
            boxShadow: `
              0 0 40px hsl(${nextHue} ${nextSat} 50% / 0.4),
              0 0 80px hsl(${nextHue} ${nextSat} 50% / 0.15),
              0 8px 32px hsl(0 0% 0% / 0.3),
              inset 0 2px 4px hsl(${nextHue} ${nextSat} 75% / 0.3),
              inset 0 -2px 4px hsl(${nextHue} ${nextSat} 15% / 0.4)
            `,
          }}
        >
          <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{
            background: `radial-gradient(ellipse at 30% 20%, hsl(${nextHue} ${nextSat} 65% / 0.25), transparent 60%)`,
          }} />

          <div className="relative px-5 py-5">
            <div className="flex items-center gap-1.5 mb-2">
              <ArrowRight className="w-3.5 h-3.5 text-white/70" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-white/60">Next Up</span>
            </div>
            <div className="flex items-center gap-3">
              {(nextTask.iconUrls || []).map((url, i) => (
                <img key={i} src={url} alt="" className="w-7 h-7 object-contain shrink-0" />
              ))}
              <h3 className="text-xl font-display font-bold text-white leading-tight">
                {nextTask.title}
              </h3>
            </div>
            {nextTaskSection && (
              <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full text-white/80 font-medium" style={{ background: 'hsla(0,0%,100%,0.15)' }}>
                {nextTaskSection.name}
              </span>
            )}
          </div>
        </motion.div>
      )}

      {/* All done state */}
      {!nextTask && totalCount > 0 && isGolden && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative rounded-2xl overflow-hidden text-center py-6 px-5"
          style={{
            background: 'linear-gradient(145deg, hsl(45, 100%, 45%), hsl(35, 90%, 35%), hsl(25, 80%, 25%))',
            border: '1px solid hsl(45, 100%, 55%)',
            boxShadow: '0 0 50px hsl(45 100% 50% / 0.3), 0 0 100px hsl(45 100% 50% / 0.1), inset 0 2px 4px hsl(45 100% 70% / 0.3), inset 0 -2px 4px hsl(25 80% 15% / 0.4)',
          }}
        >
          <Trophy className="w-8 h-8 text-yellow-300 mx-auto mb-2" />
          <h3 className="text-lg font-display font-bold text-white">All Done! 🔥</h3>
          <p className="text-sm text-white/70 mt-1">Every task completed. You're unstoppable.</p>
        </motion.div>
      )}
    </div>
  );
};

export default StreakOrb;
