import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Sun, Moon } from 'lucide-react';

interface TimePickerModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (time: string) => void;
  initialTime?: string;
}

const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

const TimePickerModal = ({ open, onClose, onConfirm, initialTime }: TimePickerModalProps) => {
  const parseInitial = () => {
    if (!initialTime) return { hour: 12, minute: 0, period: 'AM' as const };
    const [h, m] = initialTime.split(':').map(Number);
    return {
      hour: h === 0 ? 12 : h > 12 ? h - 12 : h,
      minute: m,
      period: (h >= 12 ? 'PM' : 'AM') as 'AM' | 'PM',
    };
  };

  const init = parseInitial();
  const [selectedHour, setSelectedHour] = useState(init.hour);
  const [selectedMinute, setSelectedMinute] = useState(init.minute);
  const [period, setPeriod] = useState<'AM' | 'PM'>(init.period);
  const [mode, setMode] = useState<'hour' | 'minute'>('hour');
  const clockRef = useRef<HTMLDivElement>(null);

  const handleConfirm = () => {
    let h24 = selectedHour;
    if (period === 'AM' && h24 === 12) h24 = 0;
    if (period === 'PM' && h24 !== 12) h24 += 12;
    const time = `${String(h24).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`;
    onConfirm(time);
    onClose();
  };

  const items = mode === 'hour' ? HOURS_12 : MINUTES;
  const selectedValue = mode === 'hour' ? selectedHour : selectedMinute;

  const getPosition = (index: number, total: number, radius: number) => {
    const angle = (index * 360) / total - 90;
    const rad = (angle * Math.PI) / 180;
    return {
      x: 120 + radius * Math.cos(rad),
      y: 120 + radius * Math.sin(rad),
    };
  };

  const handleClockInteraction = useCallback((clientX: number, clientY: number) => {
    if (!clockRef.current) return;
    const rect = clockRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let angle = Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;

    if (mode === 'hour') {
      const hourIndex = Math.round(angle / 30) % 12;
      setSelectedHour(HOURS_12[hourIndex]);
    } else {
      const minIndex = Math.round(angle / 30) % 12;
      setSelectedMinute(MINUTES[minIndex]);
    }
  }, [mode]);

  const handlePointerDown = (e: React.PointerEvent) => {
    handleClockInteraction(e.clientX, e.clientY);
    const onMove = (ev: PointerEvent) => handleClockInteraction(ev.clientX, ev.clientY);
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (mode === 'hour') setMode('minute');
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const selectedIndex = mode === 'hour'
    ? HOURS_12.indexOf(selectedHour)
    : MINUTES.indexOf(selectedMinute);
  const handAngle = selectedIndex >= 0 ? (selectedIndex * 360) / items.length - 90 : 0;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="glass-panel-accent bevel p-6 w-[300px] flex flex-col items-center gap-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header: Time Display */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMode('hour')}
            className="text-4xl font-display transition-all"
            style={{
              background: mode === 'hour'
                ? 'linear-gradient(135deg, hsl(30, 100%, 55%), hsl(5, 85%, 48%))'
                : 'none',
              WebkitBackgroundClip: mode === 'hour' ? 'text' : undefined,
              WebkitTextFillColor: mode === 'hour' ? 'transparent' : 'hsl(25, 10%, 45%)',
              filter: mode === 'hour' ? 'drop-shadow(0 0 8px hsla(20, 100%, 50%, 0.4))' : undefined,
            }}
          >
            {String(selectedHour).padStart(2, '0')}
          </button>
          <span className="text-4xl font-display text-muted-foreground">:</span>
          <button
            onClick={() => setMode('minute')}
            className="text-4xl font-display transition-all"
            style={{
              background: mode === 'minute'
                ? 'linear-gradient(135deg, hsl(30, 100%, 55%), hsl(5, 85%, 48%))'
                : 'none',
              WebkitBackgroundClip: mode === 'minute' ? 'text' : undefined,
              WebkitTextFillColor: mode === 'minute' ? 'transparent' : 'hsl(25, 10%, 45%)',
              filter: mode === 'minute' ? 'drop-shadow(0 0 8px hsla(20, 100%, 50%, 0.4))' : undefined,
            }}
          >
            {String(selectedMinute).padStart(2, '0')}
          </button>
        </div>

        {/* AM/PM */}
        <div className="flex gap-2">
          {(['AM', 'PM'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className="text-xs font-bold px-2 py-0.5 rounded-lg transition-all"
              style={period === p ? {
                background: 'linear-gradient(135deg, hsl(30, 100%, 55%), hsl(5, 85%, 48%))',
                color: 'white',
                boxShadow: '0 0 10px hsla(20, 100%, 50%, 0.3)',
              } : {
                background: 'hsl(15, 10%, 12%)',
                border: '1px solid hsl(15, 20%, 18%)',
                color: 'hsl(25, 10%, 45%)',
              }}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Clock Face */}
        <div ref={clockRef} className="relative touch-none" onPointerDown={handlePointerDown}>
          <svg width="240" height="240" viewBox="0 0 240 240">
            {/* Background circle */}
            <circle cx="120" cy="120" r="110" fill="hsl(15, 10%, 8%)" stroke="hsl(15, 20%, 16%)" strokeWidth="1" />

            {/* Clock hand */}
            {selectedIndex >= 0 && (() => {
              const pos = getPosition(selectedIndex, items.length, 82);
              return (
                <>
                  <line x1="120" y1="120" x2={pos.x} y2={pos.y} stroke="hsl(20, 90%, 52%)" strokeWidth="2" />
                  <circle cx={pos.x} cy={pos.y} r="16" fill="hsl(20, 90%, 52%)" opacity="0.9" />
                </>
              );
            })()}

            {/* Number labels */}
            {items.map((val, i) => {
              const pos = getPosition(i, items.length, 82);
              const isSelected = val === selectedValue;
              return (
                <text
                  key={val}
                  x={pos.x} y={pos.y}
                  textAnchor="middle" dominantBaseline="central"
                  fill={isSelected ? 'white' : 'hsl(25, 10%, 50%)'}
                  fontSize="14" fontWeight={isSelected ? 'bold' : 'normal'}
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  {mode === 'minute' ? String(val).padStart(2, '0') : val}
                </text>
              );
            })}
          </svg>
        </div>

        {/* Actions */}
        <div className="flex gap-3 w-full">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" style={{ background: 'hsl(15, 10%, 10%)', border: '1px solid hsl(15, 15%, 16%)' }}>
            Cancel
          </button>
          <button onClick={handleConfirm} className="flex-1 btn-premium text-primary-foreground py-2.5 text-sm flex items-center justify-center gap-2">
            <Check className="w-4 h-4" /> Set Reminder
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default TimePickerModal;
