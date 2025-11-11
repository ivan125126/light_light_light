import React, { useState, useRef, useEffect } from 'react';
import Draggable from 'react-draggable';
import './TimelineClip.css';

const MIN_CLIP_WIDTH = 30; // 最小片段寬度（像素）

function TimelineClip({ clip, trackIndex, pixelsPerSecond, isSelected, onSelect, onMove, onResize }) {
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState(null);
  const clipRef = useRef(null);

  const width = (clip.duration / 1000) * pixelsPerSecond; // duration 是毫秒
  const left = (clip.startTime / 1000) * pixelsPerSecond;

  const handleDragStop = (e, data) => {
    const newStartTime = (data.x / pixelsPerSecond) * 1000;
    onMove(clip.id, trackIndex, Math.max(0, newStartTime));
  };

  const handleResizeStart = (e) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({ x: e.clientX, initialWidth: width });
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleResizeMove = (e) => {
      const deltaX = e.clientX - resizeStart.x;
      const newWidth = Math.max(MIN_CLIP_WIDTH, resizeStart.initialWidth + deltaX);
      const newDuration = (newWidth / pixelsPerSecond) * 1000;
      onResize(clip.id, trackIndex, newDuration);
    };

    const handleResizeEnd = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);

    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isResizing, resizeStart, pixelsPerSecond, clip.id, trackIndex, onResize]);

  return (
    <Draggable
      axis="x"
      position={{ x: left, y: 0 }}
      onStop={handleDragStop}
      bounds="parent"
      handle=".clip-content"
    >
      <div
        ref={clipRef}
        className={`timeline-clip ${isSelected ? 'selected' : ''}`}
        style={{ width: `${width}px` }}
        onClick={(e) => onSelect(e, clip, trackIndex)}
      >
        <div className="clip-content">
          <div className="clip-label">{clip.name || clip.mode}</div>
        </div>
        <div className="clip-resize-handle" onMouseDown={handleResizeStart} />
      </div>
    </Draggable>
  );
}

export default TimelineClip;
