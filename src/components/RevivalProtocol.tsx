import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, ExternalLink, ChevronRight, Plus, X, Play, ShieldCheck, Link, Type } from 'lucide-react';
import type { RevivalVideo, RevivalStep } from '@/lib/store';
import ConfirmDialog from './ConfirmDialog';
import { playOpen, playClose, playClick, playComplete, playDelete, playAddTask, playSurvived } from '@/lib/sounds';

interface RevivalProtocolProps {
  revivalVideos: RevivalVideo[];
  revivalSteps: RevivalStep[];
  onAddVideo: (video: Omit<RevivalVideo, 'id'>) => void;
  onRemoveVideo: (id: string) => void;
  onAddStep: (text: string) => void;
  onRemoveStep: (id: string) => void;
}

const RevivalProtocol = ({ revivalVideos, revivalSteps, onAddVideo, onRemoveVideo, onAddStep, onRemoveStep }: RevivalProtocolProps) => {
  const [active, setActive] = useState(false);
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [showAddStep, setShowAddStep] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoChannel, setVideoChannel] = useState('');
  const [stepText, setStepText] = useState('');
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [confirmRemove, setConfirmRemove] = useState<{ type: 'video' | 'step'; id: string } | null>(null);

  const stepPercent = revivalSteps.length > 0
    ? Math.round((completedSteps.size / revivalSteps.length) * 100)
    : 0;
  const survived = stepPercent === 100 && revivalSteps.length > 0;

  const toggleStep = (id: string) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } 
      else { next.add(id); playComplete(); }
      return next;
    });
  };

  const prevSurvivedRef = useRef(false);
  useEffect(() => {
    if (survived && !prevSurvivedRef.current) playSurvived();
    prevSurvivedRef.current = survived;
  }, [survived]);

  const handleAddVideo = () => {
    if (videoTitle.trim() && videoUrl.trim()) {
      onAddVideo({ title: videoTitle.trim(), url: videoUrl.trim(), channel: videoChannel.trim() || 'Custom' });
      setVideoTitle(''); setVideoUrl(''); setVideoChannel('');
      setShowAddVideo(false);
      playAddTask();
    }
  };

  const handleAddStep = () => {
    if (stepText.trim()) {
      onAddStep(stepText.trim());
      setStepText('');
      setShowAddStep(false);
      playAddTask();
    }
  };

  const handleConfirmRemove = () => {
    if (!confirmRemove) return;
    if (confirmRemove.type === 'video') onRemoveVideo(confirmRemove.id);
    else onRemoveStep(confirmRemove.id);
    setConfirmRemove(null);
  };

  if (!active) {
    return (
      <button
      onClick={() => { setActive(true); playOpen(); }}
        className="w-full glass-panel bevel p-5 flex items-center gap-4 group transition-all"
      >
        <ShieldAlert className="w-6 h-6 icon-glow text-primary" />
        <div className="text-left">
          <h3 className="font-display text-sm text-gradient-fire">Revival Protocol</h3>
          <p className="text-xs text-muted-foreground">Feeling stuck? Activate emergency recovery.</p>
        </div>
      </button>
    );
  }

  return (
    <div className="glass-panel-accent bevel p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm text-gradient-fire flex items-center gap-2"><ShieldAlert className="w-5 h-5 icon-glow" /> Revival Protocol</h3>
        <button onClick={() => { setActive(false); setCompletedSteps(new Set()); playClose(); }} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="relative w-20 h-20">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(15, 10%, 12%)" strokeWidth="6" />
            <motion.circle cx="50" cy="50" r="42" fill="none" stroke={survived ? 'hsl(45, 100%, 55%)' : 'hsl(20, 90%, 52%)'} strokeWidth="6" strokeLinecap="round" strokeDasharray={264} animate={{ strokeDashoffset: 264 - (264 * stepPercent) / 100 }} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            {survived ? (
              <ShieldCheck className="w-6 h-6 text-yellow-400" />
            ) : (
              <span className="text-sm font-bold text-gradient-fire">{stepPercent}%</span>
            )}
          </div>
        </div>
        <span className="text-xs text-muted-foreground">
          {survived ? '🏆 I SURVIVED!' : `${completedSteps.size}/${revivalSteps.length} steps done`}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Emergency Steps</span>
          <button onClick={() => setShowAddStep(!showAddStep)} className="w-7 h-7 solid-circle hover:scale-110 transition-transform"><Plus className="w-3.5 h-3.5" /></button>
        </div>

        {showAddStep && (
          <div className="flex gap-2">
            <input value={stepText} onChange={e => setStepText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddStep()} placeholder="e.g. Do 10 jumping jacks..." className="flex-1 bg-muted border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary" />
            <button onClick={handleAddStep} className="btn-premium text-primary-foreground px-3 py-1 text-xs">Add</button>
          </div>
        )}

        {revivalSteps.length === 0 && !showAddStep && (
          <p className="text-xs text-muted-foreground italic text-center py-2">No steps yet. Add emergency recovery steps.</p>
        )}

        {revivalSteps.map((s) => {
          const done = completedSteps.has(s.id);
          return (
            <button key={s.id} onClick={() => toggleStep(s.id)} className={`w-full flex items-center gap-3 p-3 rounded-xl text-left text-sm transition-all group ${done ? 'opacity-60' : ''}`} style={{ background: done ? 'hsl(120, 20%, 10%)' : 'hsl(15, 10%, 10%)', border: `1px solid ${done ? 'hsl(120, 30%, 20%)' : 'hsl(15, 15%, 16%)'}` }}>
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: done ? 'hsl(120, 50%, 35%)' : 'linear-gradient(135deg, hsl(30, 100%, 55%), hsl(5, 85%, 48%))' }}>
                {done ? '✓' : s.step}
              </span>
              <span className={`flex-1 ${done ? 'line-through' : ''}`}>{s.text}</span>
              <button onClick={e => { e.stopPropagation(); setConfirmRemove({ type: 'step', id: s.id }); }} className="opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" /></button>
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Motivation Fuel</span>
          <button onClick={() => setShowAddVideo(!showAddVideo)} className="w-7 h-7 solid-circle hover:scale-110 transition-transform"><Plus className="w-3.5 h-3.5" /></button>
        </div>

        {showAddVideo && (
          <div className="space-y-2 p-3 rounded-xl" style={{ background: 'hsl(15, 10%, 10%)', border: '1px solid hsl(15, 15%, 16%)' }}>
            <div className="flex items-center gap-2">
              <Type className="w-4 h-4 text-muted-foreground shrink-0" />
              <input value={videoTitle} onChange={e => setVideoTitle(e.target.value)} placeholder="Video title" className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none" />
            </div>
            <div className="flex items-center gap-2">
              <Link className="w-4 h-4 text-muted-foreground shrink-0" />
              <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="YouTube URL" className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none" />
            </div>
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4 text-muted-foreground shrink-0" />
              <input value={videoChannel} onChange={e => setVideoChannel(e.target.value)} placeholder="Channel name (optional)" className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none" />
            </div>
            <button onClick={handleAddVideo} className="btn-premium text-primary-foreground w-full py-2 text-xs">Add Video</button>
          </div>
        )}

        {revivalVideos.length === 0 && !showAddVideo && (
          <p className="text-xs text-muted-foreground italic text-center py-2">No videos yet. Add motivation videos.</p>
        )}

        <div className="grid gap-2">
          {revivalVideos.map((v) => (
            <a key={v.id} href={v.url} target="_blank" rel="noopener noreferrer" className="relative group flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-[1.02]" style={{ background: 'hsl(15, 10%, 10%)', border: '1px solid hsl(15, 15%, 16%)' }}>
              <Play className="w-4 h-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{v.title}</p>
                <p className="text-xs text-muted-foreground">{v.channel}</p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <button
                onClick={e => { e.preventDefault(); e.stopPropagation(); setConfirmRemove({ type: 'video', id: v.id }); }}
                className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 w-5 h-5 rounded-full flex items-center justify-center transition-opacity"
                style={{ background: 'hsl(0, 60%, 40%)' }}
              >
                <X className="w-3 h-3" />
              </button>
            </a>
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmRemove}
        onConfirm={handleConfirmRemove}
        onCancel={() => setConfirmRemove(null)}
        title={confirmRemove?.type === 'video' ? 'Remove Video?' : 'Remove Step?'}
        description="Are you sure you want to remove this?"
      />
    </div>
  );
};

export default RevivalProtocol;
