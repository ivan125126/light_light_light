import React, { useState, useEffect } from 'react';
import { useEffects } from '../context/EffectContext';
import './AssetLibrary.css';

// 預設光效片段
const DEFAULT_EFFECTS = [
  { id: 1, name: '清除', mode: 'MODES_CLEAR', color: '#ff6b6b' },
  { id: 2, name: '純色', mode: 'MODES_PLAIN', color: '#4ecdc4' },
  { id: 3, name: '方形', mode: 'MODES_SQUARE', color: '#45b7d1' },
  { id: 4, name: '鐮刀', mode: 'MODES_SICKLE', color: '#96ceb4' },
  { id: 5, name: '扇形', mode: 'MODES_FAN', color: '#ffeaa7' },
  { id: 6, name: '方塊', mode: 'MODES_BOXES', color: '#fab1a0' },
  { id: 7, name: '鐮刀進階', mode: 'MODES_SICKLE_ADV', color: '#e17055' },
  { id: 8, name: '扇形進階', mode: 'MODES_FAN_ADV', color: '#81ecec' },
  { id: 9, name: 'DNA', mode: 'MODES_CMAP_DNA', color: '#fd79a8' },
  { id: 10, name: '火焰', mode: 'MODES_CMAP_FIRE', color: '#fdcb6e' },
];

function AssetLibrary() {
  const { addClip, tracks } = useEffects();
  const [customEffects, setCustomEffects] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('default');

  const handleEffectClick = (effect) => {
    // 找到第一個空的軌道或最後一個軌道
    let targetTrack = 0;
    if (tracks[0].length > 0) {
      // 找到最長軌道的最後一個片段
      const lastClip = tracks[0][tracks[0].length - 1];
      const endTime = lastClip.startTime + lastClip.duration;
      
      // 添加新片段到第一個軌道
      const newClip = {
        id: Date.now(),
        name: effect.name,
        mode: effect.mode,
        startTime: endTime,
        duration: 3000, // 預設 3 秒
        color: effect.color,
      };
      addClip(0, newClip);
    } else {
      // 軌道為空，從開始添加
      const newClip = {
        id: Date.now(),
        name: effect.name,
        mode: effect.mode,
        startTime: 0,
        duration: 3000,
        color: effect.color,
      };
      addClip(0, newClip);
    }
  };

  return (
    <div className="asset-library">
      <div className="asset-library-header">
        <h3>素材庫</h3>
      </div>
      <div className="asset-library-tabs">
        <button
          className={`tab-btn ${selectedCategory === 'default' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('default')}
        >
          預設效果
        </button>
        <button
          className={`tab-btn ${selectedCategory === 'custom' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('custom')}
        >
          自定義
        </button>
      </div>
      <div className="asset-library-content">
        {selectedCategory === 'default' && (
          <div className="effect-grid">
            {DEFAULT_EFFECTS.map((effect) => (
              <div
                key={effect.id}
                className="effect-item"
                onClick={() => handleEffectClick(effect)}
                style={{ '--effect-color': effect.color }}
              >
                <div className="effect-icon" style={{ backgroundColor: effect.color }}>
                  {effect.name.charAt(0)}
                </div>
                <div className="effect-name">{effect.name}</div>
              </div>
            ))}
          </div>
        )}
        {selectedCategory === 'custom' && (
          <div className="custom-effects">
            {customEffects.length === 0 ? (
              <div className="empty-state">
                <p>尚未有自定義效果</p>
                <button className="create-btn">創建新效果</button>
              </div>
            ) : (
              <div className="effect-grid">
                {customEffects.map((effect) => (
                  <div
                    key={effect.id}
                    className="effect-item"
                    onClick={() => handleEffectClick(effect)}
                  >
                    <div className="effect-icon">{effect.name.charAt(0)}</div>
                    <div className="effect-name">{effect.name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AssetLibrary;

