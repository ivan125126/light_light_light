import React from 'react';
import { useEffects } from '../context/EffectContext';
import './Toolbar.css';

function Toolbar() {
  const { undo, redo, historyIndex, history, copyClip, cutClip, pasteClip, clipboard, selectedClips } = useEffects();

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  const canCopyCut = selectedClips.length > 0;
  const canPaste = clipboard !== null;

  const handleCopy = () => {
    if (selectedClips.length > 0) {
      copyClip(selectedClips[0]);
    }
  };

  const handleCut = () => {
    if (selectedClips.length > 0) {
      const clip = selectedClips[0];
      cutClip(clip.trackIndex, clip.id);
    }
  };

  const handlePaste = () => {
    if (clipboard) {
      // 貼到當前時間位置（需要從 TimelineEditor 傳入當前時間）
      pasteClip(0, 0);
    }
  };

  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <button className="toolbar-btn" onClick={undo} disabled={!canUndo} title="撤銷 (Ctrl+Z)">
          ↶ 撤銷
        </button>
        <button className="toolbar-btn" onClick={redo} disabled={!canRedo} title="重做 (Ctrl+Y)">
          ↷ 重做
        </button>
      </div>
      <div className="toolbar-section">
        <button className="toolbar-btn" onClick={handleCopy} disabled={!canCopyCut} title="複製 (Ctrl+C)">
          📋 複製
        </button>
        <button className="toolbar-btn" onClick={handleCut} disabled={!canCopyCut} title="剪下 (Ctrl+X)">
          ✂️ 剪下
        </button>
        <button className="toolbar-btn" onClick={handlePaste} disabled={!canPaste} title="貼上 (Ctrl+V)">
          📄 貼上
        </button>
      </div>
      <div className="toolbar-section">
        <button className="toolbar-btn" title="播放">
          ▶️ 播放
        </button>
        <button className="toolbar-btn" title="暫停">
          ⏸️ 暫停
        </button>
        <button className="toolbar-btn" title="停止">
          ⏹️ 停止
        </button>
      </div>
      <div className="toolbar-section toolbar-title">
        <h2>光效編輯系統</h2>
      </div>
    </div>
  );
}

export default Toolbar;

