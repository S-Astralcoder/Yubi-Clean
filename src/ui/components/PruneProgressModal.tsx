import React from 'react';
import { PruneProgress } from '../../content/pruner';
import { 
  AlertTriangle, 
  Trash2, 
  Pause, 
  Play, 
  Square, 
  CheckCircle2, 
  X, 
  ShieldAlert,
  Download,
  AlertCircle
} from 'lucide-react';

interface PruneProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onAbort: () => void;
  onExportCsv: () => void;
  progress: PruneProgress;
  selectedCount: number;
  requiredPoints: number;
  pointsRemaining: number;
  isDark?: boolean;
}

export const PruneProgressModal: React.FC<PruneProgressModalProps> = ({
  isOpen,
  onClose,
  onConfirmStart,
  onPause,
  onResume,
  onAbort,
  onExportCsv,
  progress,
  selectedCount,
  requiredPoints,
  pointsRemaining,
  isDark = true,
}) => {
  if (!isOpen) return null;

  const isIdle = progress.status === 'idle';
  const isRunning = progress.status === 'running';
  const isPaused = progress.status === 'paused';
  const isFinished = progress.status === 'finished';
  const isAborted = progress.status === 'aborted';
  const isError = progress.status === 'error';

  const percent = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

  const themeClasses = isDark ? {
    modalBg: 'bg-[#141416]/98 border-white/15 text-[#F1F1F1] shadow-2xl',
    hudBg: 'bg-[#141416]/95 border-white/20 text-[#F1F1F1] shadow-2xl',
    card: 'bg-[#1E1E22] border-white/10',
    muted: 'text-[#AAAAAA]',
    btnCancel: 'bg-[#272727] hover:bg-[#383838] text-white border-white/10',
    progressTrack: 'bg-white/10',
  } : {
    modalBg: 'bg-white/98 border-black/15 text-[#0F0F0F] shadow-2xl',
    hudBg: 'bg-white/95 border-black/20 text-[#0F0F0F] shadow-2xl',
    card: 'bg-[#F4F4F6] border-black/10',
    muted: 'text-[#606060]',
    btnCancel: 'bg-[#EAEAEA] hover:bg-[#DFDFDF] text-black border-black/10',
    progressTrack: 'bg-black/10',
  };

  /* ─────────────────────────────────────────────────────────────
     1. ACTIVE PRUNING HUD (Non-Blocking Top-Right Floating Pill)
     Eliminates full-screen occlusion so YouTube DOM is 100% visible
     ───────────────────────────────────────────────────────────── */
  if (isRunning || isPaused) {
    return (
      <div className={`fixed top-6 right-6 z-[2147483647] w-[400px] p-5 rounded-3xl border backdrop-blur-md space-y-4 animate-in slide-in-from-top-4 duration-200 ${themeClasses.hudBg}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-2xl border ${
              isPaused ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-red-500/10 border-red-500/30 text-red-500'
            }`}>
              <Trash2 size={20} className={isRunning ? 'animate-pulse' : ''} />
            </div>
            <div>
              <h2 className="text-sm font-bold">
                {isPaused ? 'Deletion Paused' : 'Pruning YouTube Playlist...'}
              </h2>
              <p className={`text-[11px] ${themeClasses.muted}`}>
                Live DOM execution (600ms throttle)
              </p>
            </div>
          </div>

          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
            isPaused ? 'bg-amber-500/15 text-amber-400' : 'bg-red-500/15 text-red-400'
          }`}>
            {percent}%
          </span>
        </div>

        {/* Progress Meter */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className={themeClasses.muted}>
              Removed: <strong className="text-white">{progress.completed}</strong> of {progress.total} videos
            </span>
            {progress.failed > 0 && (
              <span className="text-amber-400 font-medium">({progress.failed} skipped)</span>
            )}
          </div>
          <div className={`w-full h-2.5 rounded-full overflow-hidden ${themeClasses.progressTrack}`}>
            <div
              className="bg-[#FF0000] h-full rounded-full transition-all duration-300 shadow-sm"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Currently Processing Video Preview */}
        <div className={`p-3 rounded-2xl border space-y-0.5 ${themeClasses.card}`}>
          <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">
            Target Item:
          </div>
          <p className="text-xs font-medium text-neutral-200 truncate" title={progress.currentTitle}>
            {progress.currentTitle || 'Locating target video...'}
          </p>
        </div>

        {/* HUD Controls */}
        <div className="flex items-center space-x-2 pt-1">
          {isPaused ? (
            <button
              onClick={onResume}
              className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-all shadow"
            >
              <Play size={13} className="fill-current" />
              <span>Resume</span>
            </button>
          ) : (
            <button
              onClick={onPause}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all ${themeClasses.btnCancel}`}
            >
              <Pause size={13} />
              <span>Pause</span>
            </button>
          )}

          <button
            onClick={onAbort}
            className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition-all"
          >
            <Square size={12} className="fill-current" />
            <span>Stop</span>
          </button>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────────
     2. CENTERED MODALS (Pre-Flight Confirmation & Completion)
     ───────────────────────────────────────────────────────────── */
  return (
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Card */}
      <div className={`relative w-full max-w-lg rounded-3xl border p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200 ${themeClasses.modalBg}`}>
        
        {/* ── PRE-FLIGHT CONFIRMATION STATE ── */}
        {isIdle && (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Confirm Deletion</h2>
                  <p className={`text-xs ${themeClasses.muted}`}>Review removal and credit cost</p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Warning Card */}
            <div className={`p-4 rounded-2xl border space-y-2 ${themeClasses.card}`}>
              <div className="flex items-center space-x-2 text-xs font-semibold text-amber-400">
                <AlertTriangle size={16} />
                <span>Permanent YouTube Removal</span>
              </div>
              <p className={`text-xs leading-relaxed ${themeClasses.muted}`}>
                You are about to remove <strong>{selectedCount} videos</strong> from your playlist.
                The cleaner will collapse into a compact widget so you can observe the deletion live.
              </p>
              
              <button
                onClick={onExportCsv}
                className="flex items-center space-x-1.5 text-xs text-emerald-400 hover:underline pt-1 font-medium"
              >
                <Download size={13} />
                <span>Download full CSV backup first (Recommended)</span>
              </button>
            </div>

            {/* Cost Summary Box */}
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className={`p-3 rounded-2xl border ${themeClasses.card}`}>
                <div className="text-xl font-bold text-red-500">{selectedCount}</div>
                <div className={`text-[11px] uppercase tracking-wider mt-0.5 ${themeClasses.muted}`}>Videos to Clean</div>
              </div>

              <div className={`p-3 rounded-2xl border ${themeClasses.card}`}>
                <div className="text-xl font-bold text-[#FF0000]">{requiredPoints} pts</div>
                <div className={`text-[11px] uppercase tracking-wider mt-0.5 ${themeClasses.muted}`}>
                  {pointsRemaining - requiredPoints >= 0 
                    ? `${pointsRemaining - requiredPoints} pts remaining`
                    : 'Requires upgrade'}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={onClose}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-semibold border transition-all ${themeClasses.btnCancel}`}
              >
                Cancel
              </button>

              <button
                onClick={onConfirmStart}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white bg-[#FF0000] hover:bg-[#CC0000] shadow-md transition-all active:scale-[0.98]"
              >
                Confirm & Clean Now
              </button>
            </div>
          </div>
        )}

        {/* ── FINISHED / ABORTED / ERROR STATE ── */}
        {(isFinished || isAborted || isError) && (
          <div className="space-y-4 text-center py-2">
            <div className="inline-flex p-3 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mx-auto">
              {isFinished && progress.completed > 0 ? (
                <CheckCircle2 size={36} />
              ) : (
                <ShieldAlert size={36} className="text-amber-400" />
              )}
            </div>

            <div>
              <h2 className="text-lg font-bold">
                {isFinished && progress.completed > 0
                  ? 'Playlist Clean Complete!' 
                  : isAborted 
                  ? 'Cleanup Aborted' 
                  : 'Cleanup Incomplete'}
              </h2>
              <p className={`text-xs mt-1 leading-relaxed ${themeClasses.muted}`}>
                {isFinished && progress.completed > 0
                  ? `Successfully removed ${progress.completed} of ${progress.total} selected videos from your YouTube playlist.`
                  : isAborted
                  ? `Stopped early. Removed ${progress.completed} of ${progress.total} selected videos.`
                  : progress.errorMessage || 'No videos were removed. Check playlist permissions or try with fewer items.'}
              </p>
            </div>

            {/* Stats Breakdown */}
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className={`p-3 rounded-2xl border ${themeClasses.card}`}>
                <div className="text-xs text-neutral-400">Removed</div>
                <div className="text-xl font-bold text-emerald-400">{progress.completed} Videos</div>
              </div>

              <div className={`p-3 rounded-2xl border ${themeClasses.card}`}>
                <div className="text-xs text-neutral-400">Failed / Skipped</div>
                <div className={`text-xl font-bold ${progress.failed > 0 ? 'text-amber-400' : 'text-neutral-400'}`}>
                  {progress.failed} Videos
                </div>
              </div>
            </div>

            {progress.failed > 0 && (
              <div className="flex items-center space-x-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs text-left">
                <AlertCircle size={16} className="shrink-0" />
                <span>Some videos could not be deleted because YouTube did not open the action menu for them. Try rescanning and deleting in smaller batches.</span>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-[#FF0000] hover:bg-[#CC0000] shadow-md transition-all active:scale-[0.98]"
            >
              Done
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
