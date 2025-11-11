import React, { useEffect, useRef, useState } from 'react';
import { useEffects } from '../context/EffectContext';
import './WaveformDisplay.css';

function WaveformDisplay() {
  const { musicFile, currentTime, setTime } = useEffects();
  const canvasRef = useRef(null);
  const [waveformData, setWaveformData] = useState(null);
  const [audioContext, setAudioContext] = useState(null);
  const [audioElement, setAudioElement] = useState(null);

  useEffect(() => {
    if (!musicFile) return;

    // 創建音頻元素和分析器
    const audio = new Audio();
    audio.src = musicFile;
    audio.preload = 'auto';

    const initAudio = async () => {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const source = ctx.createMediaElementSource(audio);
        const analyser = ctx.createAnalyser();
        
        analyser.fftSize = 2048;
        source.connect(analyser);
        analyser.connect(ctx.destination);

        setAudioContext(ctx);
        setAudioElement(audio);

        // 生成簡單的波形數據
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteTimeDomainData(dataArray);
        
        setWaveformData(dataArray);
      } catch (err) {
        console.error('Error initializing audio:', err);
      }
    };

    audio.addEventListener('loadeddata', initAudio);
    audio.addEventListener('timeupdate', () => {
      setTime(audio.currentTime * 1000);
    });

    return () => {
      audio.removeEventListener('loadeddata', initAudio);
      audio.removeEventListener('timeupdate', () => {});
    };
  }, [musicFile, setTime]);

  useEffect(() => {
    if (!canvasRef.current || !waveformData) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    // 繪製波形
    ctx.strokeStyle = '#4a9eff';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const sliceWidth = width / waveformData.length;
    let x = 0;

    for (let i = 0; i < waveformData.length; i++) {
      const v = waveformData[i] / 128.0;
      const y = (v * height) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.stroke();

    // 繪製當前時間線
    if (audioElement) {
      const progress = audioElement.currentTime / audioElement.duration;
      const lineX = progress * width;
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lineX, 0);
      ctx.lineTo(lineX, height);
      ctx.stroke();
    }
  }, [waveformData, audioElement, currentTime]);

  const handleCanvasClick = (e) => {
    if (!audioElement) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = x / canvas.width;
    
    audioElement.currentTime = progress * audioElement.duration;
  };

  return (
    <div className="waveform-display">
      <div className="waveform-header">
        <h3>音樂波形</h3>
        {musicFile && (
          <span className="music-name">{musicFile.split('/').pop()}</span>
        )}
      </div>
      <div className="waveform-content">
        {musicFile ? (
          <canvas
            ref={canvasRef}
            width={800}
            height={120}
            onClick={handleCanvasClick}
            className="waveform-canvas"
          />
        ) : (
          <div className="waveform-empty">
            <p>請選擇音樂檔案</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default WaveformDisplay;

