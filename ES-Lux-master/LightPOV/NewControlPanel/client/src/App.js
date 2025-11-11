import React from 'react';
import './App.css';
import TimelineEditor from './components/TimelineEditor';
import AssetLibrary from './components/AssetLibrary';
import WaveformDisplay from './components/WaveformDisplay';
import Toolbar from './components/Toolbar';
import { EffectProvider } from './context/EffectContext';

function App() {
  return (
    <EffectProvider>
      <div className="app">
        <Toolbar />
        <div className="app-content">
          <div className="app-left-panel">
            <AssetLibrary />
          </div>
          <div className="app-center-panel">
            <WaveformDisplay />
            <TimelineEditor />
          </div>
          <div className="app-right-panel">
            {/* 即時預覽區域 - 預留位置 */}
            <div className="preview-panel">
              <h3>即時預覽</h3>
              <p>預覽功能即將推出</p>
            </div>
          </div>
        </div>
      </div>
    </EffectProvider>
  );
}

export default App;

