import { motion } from 'framer-motion';
import { Flame, Calendar, Trophy } from 'lucide-react';

interface StreakOrbProps {
  percent: number;
  isGolden: boolean;
  streak: number;
  completedCount: number;
  totalCount: number;
}

const StreakOrb = ({ percent, isGolden, streak, completedCount, totalCount }: StreakOrbProps) => {
  const today = new Date();
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="glass-panel-accent bevel p-6 flex flex-col items-center gap-4">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Calendar className="w-4 h-4" />
        <span>{dayName}</span>
        <span className="text-foreground font-medium">{dateStr}</span>
      </div>

      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(15, 10%, 12%)" strokeWidth="8" />
          <motion.circle
            cx="50" cy="50" r="42" fill="none"
            stroke={isGolden ? 'url(#goldGrad)' : 'url(#fireGrad)'}
            strokeWidth="8" strokeLinecap="round"
            strokeDasharray={264}
            initial={{ strokeDashoffset: 264 }}
            animate={{ strokeDashoffset: 264 - (264 * percent) / 100 }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
          <defs>
            <linearGradient id="fireGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(30, 100%, 55%)" />
              <stop offset="100%" stopColor="hsl(5, 85%, 48%)" />
            </linearGradient>
            <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(45, 100%, 65%)" />
              <stop offset="100%" stopColor="hsl(35, 100%, 45%)" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Flame className="w-3 h-3 icon-glow" />
            <span>{streak} Day{streak !== 1 ? 's' : ''}</span>
          </div>
          <span className={`text-3xl font-display font-bold ${isGolden ? 'text-gradient-gold' : 'text-gradient-fire'}`}>
            {percent}%
          </span>
          {isGolden && (
            <Trophy className="w-4 h-4 text-yellow-400 mt-1" />
          )}
        </div>
      </div>

      <div className="flex items-center gap-6 text-sm">
        <span className="text-muted-foreground">Progress</span>
        <div className="flex items-center gap-1">
          <span className="text-gradient-fire font-bold">{completedCount}</span>
          <span className="text-muted-foreground">Done</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-foreground font-bold">{totalCount}</span>
          <span className="text-muted-foreground">Total</span>
        </div>
      </div>
    </div>
  );
};

export default StreakOrb;
