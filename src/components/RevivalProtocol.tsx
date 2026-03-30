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
        className="w-full rounded-xl p-5 flex items-center gap-4 group transition-all hover:scale-[1.01]"
        style={{
          background: 'linear-gradient(145deg, hsl(30, 100%, 55%), hsl(15, 90%, 45%), hsl(5, 85%, 40%))',
          border: '1px solid hsl(40, 100%, 65%)',
          borderTop: '1px solid hsl(45, 100%, 72%)',
          borderBottom: '1px solid hsl(5, 70%, 30%)',
          boxShadow: '0 4px 16px hsl(20, 90%, 50% / 0.3), 0 1px 3px hsl(0 0% 0% / 0.2), inset 0 1px 0 hsl(45, 100%, 75%), inset 0 -1px 0 hsl(5, 80%, 25%)',
        }}
      >
        <ShieldAlert className="w-6 h-6 text-white drop-shadow-lg" />
        <div className="text-left">
          <h3 className="font-display text-sm text-white font-bold drop-shadow-sm">Revival Protocol</h3>
          <p className="text-xs text-white/80">Feeling stuck? Activate emergency recovery.</p>
        </div>
      </button>
    );
  }

  return (
    <div
      className="rounded-xl p-5 space-y-5"
      style={{
        background: 'linear-gradient(145deg, hsl(35, 95%, 52%), hsl(20, 90%, 42%), hsl(10, 80%, 35%))',
        border: '1px solid hsl(40, 100%, 65%)',
        borderTop: '1px solid hsl(45, 100%, 72%)',
        borderBottom: '1px solid hsl(5, 70%, 28%)',
        boxShadow: '0 6px 24px hsl(20, 90%, 50% / 0.35), 0 2px 6px hsl(0 0% 0% / 0.2), inset 0 1px 0 hsl(45, 100%, 75%), inset 0 -1px 0 hsl(5, 80%, 22%)',
      }}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm text-white font-bold flex items-center gap-2 drop-shadow-sm"><ShieldAlert className="w-5 h-5 drop-shadow-lg" /> Revival Protocol</h3>
        <button onClick={() => { setActive(false); setCompletedSteps(new Set()); playClose(); }} className="text-xs text-white/70 hover:text-white transition-colors">Close</button>
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="relative w-20 h-20">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="hsla(0,0%,100%,0.2)" strokeWidth="6" />
            <motion.circle cx="50" cy="50" r="42" fill="none" stroke={survived ? 'hsl(45, 100%, 85%)' : 'hsl(0, 0%, 100%)'} strokeWidth="6" strokeLinecap="round" strokeDasharray={264} animate={{ strokeDashoffset: 264 - (264 * stepPercent) / 100 }} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            {survived ? (
              <ShieldCheck className="w-6 h-6 text-yellow-200 drop-shadow-lg" />
            ) : (
              <span className="text-sm font-bold text-white drop-shadow-sm">{stepPercent}%</span>
            )}
          </div>
        </div>
        <span className="text-xs text-white/80">
          {survived ? '🏆 I SURVIVED!' : `${completedSteps.size}/${revivalSteps.length} steps done`}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-white/80">Emergency Steps</span>
          <button onClick={() => setShowAddStep(!showAddStep)} className="w-7 h-7 solid-circle hover:scale-110 transition-transform"><Plus className="w-3.5 h-3.5" /></button>
        </div>

        {showAddStep && (
          <div className="flex gap-2">
            <input value={stepText} onChange={e => setStepText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddStep()} placeholder="e.g. Do 10 jumping jacks..." className="flex-1 bg-white/15 border border-white/25 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/50 focus:outline-none focus:border-white/50" />
            <button onClick={handleAddStep} className="px-3 py-1 text-xs font-bold rounded-xl text-white" style={{ background: 'linear-gradient(135deg, hsl(45, 100%, 55%), hsl(30, 100%, 50%))', boxShadow: '0 2px 8px hsl(40, 100%, 50% / 0.3), inset 0 1px 0 hsl(50, 100%, 70%)' }}>Add</button>
          </div>
        )}

        {revivalSteps.length === 0 && !showAddStep && (
          <p className="text-xs text-white/60 italic text-center py-2">No steps yet. Add emergency recovery steps.</p>
        )}

        {revivalSteps.map((s) => {
          const done = completedSteps.has(s.id);
          return (
            <button key={s.id} onClick={() => toggleStep(s.id)} className={`w-full flex items-center gap-3 p-3 rounded-xl text-left text-sm transition-all group ${done ? 'opacity-70' : ''}`}
              style={{
                background: done ? 'hsla(120, 40%, 35%, 0.4)' : 'hsla(0, 0%, 100%, 0.12)',
                border: `1px solid ${done ? 'hsla(120, 50%, 50%, 0.4)' : 'hsla(0, 0%, 100%, 0.2)'}`,
                boxShadow: 'inset 0 1px 0 hsla(0,0%,100%,0.1)',
              }}
            >
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: done ? 'hsl(120, 50%, 40%)' : 'linear-gradient(135deg, hsl(45, 100%, 60%), hsl(30, 100%, 50%))', boxShadow: '0 2px 6px hsla(0,0%,0%,0.3), inset 0 1px 0 hsla(0,0%,100%,0.3)' }}>
                {done ? '✓' : s.step}
              </span>
              <span className={`flex-1 text-white ${done ? 'line-through text-white/60' : ''}`}>{s.text}</span>
              <button onClick={e => { e.stopPropagation(); setConfirmRemove({ type: 'step', id: s.id }); }} className="opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3.5 h-3.5 text-white/60 hover:text-white" /></button>
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-white/80">Motivation Fuel</span>
          <button onClick={() => setShowAddVideo(!showAddVideo)} className="w-7 h-7 solid-circle hover:scale-110 transition-transform"><Plus className="w-3.5 h-3.5" /></button>
        </div>

        {showAddVideo && (
          <div className="space-y-2 p-3 rounded-xl" style={{ background: 'hsla(0, 0%, 100%, 0.12)', border: '1px solid hsla(0, 0%, 100%, 0.2)', boxShadow: 'inset 0 1px 0 hsla(0,0%,100%,0.1)' }}>
            <div className="flex items-center gap-2">
              <Type className="w-4 h-4 text-white/60 shrink-0" />
              <input value={videoTitle} onChange={e => setVideoTitle(e.target.value)} placeholder="Video title" className="flex-1 bg-transparent text-sm text-white placeholder:text-white/50 focus:outline-none" />
            </div>
            <div className="flex items-center gap-2">
              <Link className="w-4 h-4 text-white/60 shrink-0" />
              <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="YouTube URL" className="flex-1 bg-transparent text-sm text-white placeholder:text-white/50 focus:outline-none" />
            </div>
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4 text-white/60 shrink-0" />
              <input value={videoChannel} onChange={e => setVideoChannel(e.target.value)} placeholder="Channel name (optional)" className="flex-1 bg-transparent text-sm text-white placeholder:text-white/50 focus:outline-none" />
            </div>
            <button onClick={handleAddVideo} className="w-full py-2 text-xs font-bold rounded-xl text-white" style={{ background: 'linear-gradient(135deg, hsl(45, 100%, 55%), hsl(30, 100%, 50%))', boxShadow: '0 2px 8px hsl(40, 100%, 50% / 0.3), inset 0 1px 0 hsl(50, 100%, 70%)' }}>Add Video</button>
          </div>
        )}

        {revivalVideos.length === 0 && !showAddVideo && (
          <p className="text-xs text-white/60 italic text-center py-2">No videos yet. Add motivation videos.</p>
        )}

        <div className="grid gap-2">
          {revivalVideos.map((v) => (
            <a key={v.id} href={v.url} target="_blank" rel="noopener noreferrer" className="relative group flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-[1.02]"
              style={{
                background: 'hsla(0, 0%, 100%, 0.12)',
                border: '1px solid hsla(0, 0%, 100%, 0.2)',
                boxShadow: 'inset 0 1px 0 hsla(0,0%,100%,0.1)',
              }}
            >
              <Play className="w-4 h-4 text-white shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{v.title}</p>
                <p className="text-xs text-white/60">{v.channel}</p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-white/60 shrink-0" />
              <button
                onClick={e => { e.preventDefault(); e.stopPropagation(); setConfirmRemove({ type: 'video', id: v.id }); }}
                className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 w-5 h-5 rounded-full flex items-center justify-center transition-opacity"
                style={{ background: 'hsl(0, 60%, 45%)', boxShadow: '0 2px 4px hsla(0,0%,0%,0.3)' }}
              >
                <X className="w-3 h-3 text-white" />
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
