import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, startOfWeek, endOfWeek, isToday } from 'date-fns';
import { playClick, playOpen, playClose, playTab } from '@/lib/sounds';

interface CalendarWidgetProps {
  open: boolean;
  onClose: () => void;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  taskCountByDate?: Record<string, number>;
}

const CalendarWidget = ({ open, onClose, selectedDate, onSelectDate, taskCountByDate = {} }: CalendarWidgetProps) => {
  const [viewMonth, setViewMonth] = useState(new Date());

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleSelect = (day: Date) => {
    onSelectDate(day);
    playTab();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-sm mx-4 rounded-2xl overflow-hidden shadow-2xl"
            style={{
              background: 'linear-gradient(145deg, hsl(20, 15%, 10%), hsl(15, 10%, 6%))',
              border: '2px solid hsl(20, 80%, 45%)',
              borderTop: '2px solid hsl(30, 100%, 55%)',
              borderBottom: '2px solid hsl(15, 5%, 4%)',
              boxShadow: '0 10px 40px hsl(20, 90%, 40% / 0.3), inset 0 1px 0 hsl(30, 100%, 60% / 0.3), inset 0 -1px 0 hsl(0, 0%, 0% / 0.5)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'hsl(20, 40%, 18%)' }}>
              <button
                onClick={() => { setViewMonth(subMonths(viewMonth, 1)); playClick(); }}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                style={{ background: 'hsl(20, 20%, 15%)' }}
              >
                <ChevronLeft className="w-4 h-4 text-foreground" />
              </button>
              <h3 className="font-display text-sm text-gradient-fire">{format(viewMonth, 'MMMM yyyy')}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setViewMonth(addMonths(viewMonth, 1)); playClick(); }}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                  style={{ background: 'hsl(20, 20%, 15%)' }}
                >
                  <ChevronRight className="w-4 h-4 text-foreground" />
                </button>
                <button
                  onClick={() => { onClose(); playClose(); }}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                  style={{ background: 'hsl(0, 60%, 40%)' }}
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* Today button */}
            {!isToday(selectedDate) && (
              <div className="px-4 pt-3">
                <button
                  onClick={() => { onSelectDate(new Date()); setViewMonth(new Date()); playOpen(); onClose(); }}
                  className="w-full py-1.5 rounded-lg text-xs font-medium text-primary-foreground transition-transform hover:scale-[1.02]"
                  style={{
                    background: 'linear-gradient(135deg, hsl(30, 100%, 55%), hsl(15, 90%, 45%))',
                    boxShadow: '0 2px 8px hsl(25, 100%, 50% / 0.3)',
                  }}
                >
                  ← Back to Today
                </button>
              </div>
            )}

            {/* Weekday headers */}
            <div className="grid grid-cols-7 px-4 pt-3 pb-1">
              {weekDays.map(d => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 px-4 pb-4 gap-y-1">
              {days.map(day => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const taskCount = taskCountByDate[dateKey] || 0;
                const isSelected = isSameDay(day, selectedDate);
                const isCurrentMonth = isSameMonth(day, viewMonth);
                const isTodayDate = isToday(day);

                return (
                  <button
                    key={dateKey}
                    onClick={() => handleSelect(day)}
                    className={`relative w-full aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-all hover:scale-105 ${
                      !isCurrentMonth ? 'opacity-30' : ''
                    }`}
                    style={
                      isSelected
                        ? {
                            background: 'linear-gradient(135deg, hsl(30, 100%, 55%), hsl(15, 90%, 45%))',
                            boxShadow: '0 0 12px hsl(25, 100%, 50% / 0.4)',
                            color: 'white',
                            fontWeight: 700,
                          }
                        : isTodayDate
                        ? {
                            background: 'hsl(20, 30%, 16%)',
                            border: '1px solid hsl(20, 80%, 45%)',
                            color: 'hsl(30, 100%, 65%)',
                            fontWeight: 600,
                          }
                        : { color: isCurrentMonth ? 'hsl(30, 20%, 85%)' : undefined }
                    }
                  >
                    <span>{format(day, 'd')}</span>
                    {taskCount > 0 && (
                      <span
                        className="absolute bottom-0.5 w-1.5 h-1.5 rounded-full"
                        style={{
                          background: isSelected ? 'white' : 'hsl(30, 100%, 55%)',
                          boxShadow: isSelected ? 'none' : '0 0 4px hsl(30, 100%, 55% / 0.6)',
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CalendarWidget;
