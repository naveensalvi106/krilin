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
          background: 'rgba(255, 255, 255, 0.15)',
          color: 'white',
          border: '1px solid rgba(255,255,255,0.25)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
        } : {
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.5)',
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
              background: 'rgba(255, 255, 255, 0.15)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.25)',
            } : {
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.5)',
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
