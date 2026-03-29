import { Heart, Laptop, BookOpen, MessageCircle, Dumbbell, LayoutGrid } from 'lucide-react';

const iconMap: Record<string, React.ComponentType<any>> = {
  Heart, Laptop, BookOpen, MessageCircle, Dumbbell,
};

interface SectionNavProps {
  sections: { id: string; name: string; icon: string; color: string }[];
  activeSection: string | null;
  onSelect: (id: string | null) => void;
  taskCounts: Record<string, { total: number; completed: number }>;
}

const SectionNav = ({ sections, activeSection, onSelect, taskCounts }: SectionNavProps) => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
      <button
        onClick={() => onSelect(null)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all shrink-0"
        style={activeSection === null ? {
          background: 'linear-gradient(135deg, hsl(30, 100%, 55%), hsl(5, 85%, 48%))',
          color: 'white',
          boxShadow: '0 0 14px hsla(20, 90%, 52%, 0.35), inset 0 1px 0 hsla(35, 100%, 70%, 0.2)',
        } : {
          background: 'linear-gradient(135deg, hsl(15, 15%, 10%), hsl(10, 10%, 8%))',
          border: '1px solid hsl(15, 20%, 16%)',
          color: 'hsl(25, 10%, 50%)',
        }}
      >
        <LayoutGrid className="w-4 h-4" />
        All
      </button>

      {sections.map(s => {
        const Icon = iconMap[s.icon] || Heart;
        const counts = taskCounts[s.id] || { total: 0, completed: 0 };
        const isActive = activeSection === s.id;
        return (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all shrink-0"
            style={isActive ? {
              background: `linear-gradient(135deg, hsl(${s.color}), hsl(${s.color.split(' ')[0]} 60% 35%))`,
              color: 'white',
              boxShadow: `0 0 14px hsla(${s.color}, 0.35), inset 0 1px 0 hsla(${s.color.split(' ')[0]}, 100%, 70%, 0.2)`,
            } : {
              background: 'linear-gradient(135deg, hsl(15, 15%, 10%), hsl(10, 10%, 8%))',
              border: '1px solid hsl(15, 20%, 16%)',
              color: 'hsl(25, 10%, 50%)',
            }}
          >
            <Icon className="w-4 h-4" />
            {s.name}
            {counts.total > 0 && (
              <span className="text-xs opacity-70">{counts.completed}/{counts.total}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default SectionNav;
