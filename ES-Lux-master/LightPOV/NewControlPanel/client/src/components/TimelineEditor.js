import React, { useState, useRef, useEffect } from 'react';
import { useEffects } from '../context/EffectContext';
import TimelineClip from './TimelineClip';
import './TimelineEditor.css';

const PIXELS_PER_SECOND = 50; // 時間軸縮放比例
const TRACK_HEIGHT = 60;

function TimelineEditor() {
  const { tracks, selectedClips, selectClip, moveClip, resizeClip } = useEffects();
  const [timelineScroll, setTimelineScroll] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const timelineRef = useRef(null);
  const scrollAreaRef = useRef(null);

  // 計算總時長
  const totalDuration = Math.max(
    ...tracks.map(track => {
      if (track.length === 0) return 0;
      return Math.max(...track.map(clip => (clip.startTime + clip.duration) / 1000), 0);
    }),
    60 // 至少 60 秒
  );

  const handleClipSelect = (e, clip, trackIndex) => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      // 多選
      const newSelection = selectedClips.find(c => c.id === clip.id)
        ? selectedClips.filter(c => c.id !== clip.id)
        : [...selectedClips, { ...clip, trackIndex }];
      selectClip(newSelection);
    } else {
      // 單選
      selectClip([{ ...clip, trackIndex }]);
    }
  };

  const handleClipMove = (clipId, trackIndex, newStartTime) => {
    moveClip(trackIndex, clipId, newStartTime);
  };

  const handleClipResize = (clipId, trackIndex, newDuration) => {
    resizeClip(trackIndex, clipId, newDuration);
  };

  const handleTimelineClick = (e) => {
    if (e.target === timelineRef.current || e.target.classList.contains('timeline-ruler')) {
      selectClip([]);
    }
  };

  return (
    <div className="timeline-editor">
      <div className="timeline-header">
        <div className="timeline-track-label header">時間軸</div>
        <div className="timeline-ruler" style={{ width: `${totalDuration * PIXELS_PER_SECOND}px` }}>
          {Array.from({ length: Math.ceil(totalDuration / 10) + 1 }, (_, i) => (
            <div
              key={i}
              className="ruler-mark"
              style={{ left: `${i * 10 * PIXELS_PER_SECOND}px` }}
            >
              <span className="ruler-label">{i * 10}s</span>
            </div>
          ))}
        </div>
      </div>
      <div className="timeline-content" ref={scrollAreaRef}>
        <div className="timeline-tracks" ref={timelineRef} onClick={handleTimelineClick}>
          {tracks.map((track, trackIndex) => (
            <div key={trackIndex} className="timeline-track">
              <div className="timeline-track-label">
                LUX {trackIndex + 1}
              </div>
              <div className="timeline-track-content">
                {track.map((clip) => (
                  <TimelineClip
                    key={clip.id}
                    clip={clip}
                    trackIndex={trackIndex}
                    pixelsPerSecond={PIXELS_PER_SECOND}
                    isSelected={selectedClips.some(c => c.id === clip.id)}
                    onSelect={handleClipSelect}
                    onMove={handleClipMove}
                    onResize={handleClipResize}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TimelineEditor;

