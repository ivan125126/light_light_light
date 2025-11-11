import React, { createContext, useContext, useReducer, useCallback } from 'react';

const EffectContext = createContext();

// 初始狀態
const initialState = {
  // 光效數據：每個 LUX 一個軌道，每個軌道包含多個光效片段
  tracks: Array(5).fill(null).map(() => []),
  // 當前選中的片段
  selectedClips: [],
  // 音樂文件
  musicFile: null,
  // 當前播放時間
  currentTime: 0,
  // 總時長
  totalDuration: 0,
  // 執行模式
  execMode: 0, // 0: auto, 1: manual
  // 歷史記錄（用於撤銷/重做）
  history: [],
  historyIndex: -1,
  // 剪貼板
  clipboard: null,
};

// Action types
const ActionTypes = {
  ADD_CLIP: 'ADD_CLIP',
  REMOVE_CLIP: 'REMOVE_CLIP',
  UPDATE_CLIP: 'UPDATE_CLIP',
  SELECT_CLIP: 'SELECT_CLIP',
  MOVE_CLIP: 'MOVE_CLIP',
  RESIZE_CLIP: 'RESIZE_CLIP',
  SET_MUSIC: 'SET_MUSIC',
  SET_TIME: 'SET_TIME',
  SET_DURATION: 'SET_DURATION',
  UNDO: 'UNDO',
  REDO: 'REDO',
  COPY_CLIP: 'COPY_CLIP',
  CUT_CLIP: 'CUT_CLIP',
  PASTE_CLIP: 'PASTE_CLIP',
  SAVE_HISTORY: 'SAVE_HISTORY',
};

// Reducer
function effectReducer(state, action) {
  switch (action.type) {
    case ActionTypes.ADD_CLIP: {
      const { trackIndex, clip } = action.payload;
      const newTracks = [...state.tracks];
      newTracks[trackIndex] = [...newTracks[trackIndex], clip];
      return { ...state, tracks: newTracks };
    }

    case ActionTypes.REMOVE_CLIP: {
      const { trackIndex, clipId } = action.payload;
      const newTracks = [...state.tracks];
      newTracks[trackIndex] = newTracks[trackIndex].filter(c => c.id !== clipId);
      return { ...state, tracks: newTracks };
    }

    case ActionTypes.UPDATE_CLIP: {
      const { trackIndex, clipId, updates } = action.payload;
      const newTracks = [...state.tracks];
      newTracks[trackIndex] = newTracks[trackIndex].map(clip =>
        clip.id === clipId ? { ...clip, ...updates } : clip
      );
      return { ...state, tracks: newTracks };
    }

    case ActionTypes.SELECT_CLIP: {
      return { ...state, selectedClips: action.payload };
    }

    case ActionTypes.MOVE_CLIP: {
      const { trackIndex, clipId, newStartTime } = action.payload;
      const newTracks = [...state.tracks];
      newTracks[trackIndex] = newTracks[trackIndex].map(clip =>
        clip.id === clipId ? { ...clip, startTime: newStartTime } : clip
      );
      return { ...state, tracks: newTracks };
    }

    case ActionTypes.RESIZE_CLIP: {
      const { trackIndex, clipId, newDuration } = action.payload;
      const newTracks = [...state.tracks];
      newTracks[trackIndex] = newTracks[trackIndex].map(clip =>
        clip.id === clipId ? { ...clip, duration: newDuration } : clip
      );
      return { ...state, tracks: newTracks };
    }

    case ActionTypes.SET_MUSIC: {
      return { ...state, musicFile: action.payload };
    }

    case ActionTypes.SET_TIME: {
      return { ...state, currentTime: action.payload };
    }

    case ActionTypes.SET_DURATION: {
      return { ...state, totalDuration: action.payload };
    }

    case ActionTypes.SAVE_HISTORY: {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push({ tracks: JSON.parse(JSON.stringify(state.tracks)) });
      return {
        ...state,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    }

    case ActionTypes.UNDO: {
      if (state.historyIndex > 0) {
        const prevState = state.history[state.historyIndex - 1];
        return {
          ...state,
          tracks: JSON.parse(JSON.stringify(prevState.tracks)),
          historyIndex: state.historyIndex - 1,
        };
      }
      return state;
    }

    case ActionTypes.REDO: {
      if (state.historyIndex < state.history.length - 1) {
        const nextState = state.history[state.historyIndex + 1];
        return {
          ...state,
          tracks: JSON.parse(JSON.stringify(nextState.tracks)),
          historyIndex: state.historyIndex + 1,
        };
      }
      return state;
    }

    case ActionTypes.COPY_CLIP: {
      return { ...state, clipboard: action.payload };
    }

    case ActionTypes.CUT_CLIP: {
      const { trackIndex, clipId } = action.payload;
      const clip = state.tracks[trackIndex].find(c => c.id === clipId);
      const newTracks = [...state.tracks];
      newTracks[trackIndex] = newTracks[trackIndex].filter(c => c.id !== clipId);
      return {
        ...state,
        tracks: newTracks,
        clipboard: clip,
      };
    }

    case ActionTypes.PASTE_CLIP: {
      if (!state.clipboard) return state;
      const { trackIndex, startTime } = action.payload;
      const newClip = {
        ...state.clipboard,
        id: Date.now(),
        startTime,
      };
      const newTracks = [...state.tracks];
      newTracks[trackIndex] = [...newTracks[trackIndex], newClip];
      return { ...state, tracks: newTracks };
    }

    default:
      return state;
  }
}

// Provider Component
export function EffectProvider({ children }) {
  const [state, dispatch] = useReducer(effectReducer, initialState);

  const addClip = useCallback((trackIndex, clip) => {
    dispatch({ type: ActionTypes.ADD_CLIP, payload: { trackIndex, clip } });
  }, []);

  const removeClip = useCallback((trackIndex, clipId) => {
    dispatch({ type: ActionTypes.REMOVE_CLIP, payload: { trackIndex, clipId } });
  }, []);

  const updateClip = useCallback((trackIndex, clipId, updates) => {
    dispatch({ type: ActionTypes.UPDATE_CLIP, payload: { trackIndex, clipId, updates } });
  }, []);

  const selectClip = useCallback((clips) => {
    dispatch({ type: ActionTypes.SELECT_CLIP, payload: clips });
  }, []);

  const moveClip = useCallback((trackIndex, clipId, newStartTime) => {
    dispatch({ type: ActionTypes.MOVE_CLIP, payload: { trackIndex, clipId, newStartTime } });
  }, []);

  const resizeClip = useCallback((trackIndex, clipId, newDuration) => {
    dispatch({ type: ActionTypes.RESIZE_CLIP, payload: { trackIndex, clipId, newDuration } });
  }, []);

  const setMusic = useCallback((file) => {
    dispatch({ type: ActionTypes.SET_MUSIC, payload: file });
  }, []);

  const setTime = useCallback((time) => {
    dispatch({ type: ActionTypes.SET_TIME, payload: time });
  }, []);

  const setDuration = useCallback((duration) => {
    dispatch({ type: ActionTypes.SET_DURATION, payload: duration });
  }, []);

  const saveHistory = useCallback(() => {
    dispatch({ type: ActionTypes.SAVE_HISTORY });
  }, []);

  const undo = useCallback(() => {
    dispatch({ type: ActionTypes.UNDO });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: ActionTypes.REDO });
  }, []);

  const copyClip = useCallback((clip) => {
    dispatch({ type: ActionTypes.COPY_CLIP, payload: clip });
  }, []);

  const cutClip = useCallback((trackIndex, clipId) => {
    dispatch({ type: ActionTypes.CUT_CLIP, payload: { trackIndex, clipId } });
  }, []);

  const pasteClip = useCallback((trackIndex, startTime) => {
    dispatch({ type: ActionTypes.PASTE_CLIP, payload: { trackIndex, startTime } });
  }, []);

  const value = {
    ...state,
    addClip,
    removeClip,
    updateClip,
    selectClip,
    moveClip,
    resizeClip,
    setMusic,
    setTime,
    setDuration,
    saveHistory,
    undo,
    redo,
    copyClip,
    cutClip,
    pasteClip,
  };

  return <EffectContext.Provider value={value}>{children}</EffectContext.Provider>;
}

// Hook
export function useEffects() {
  const context = useContext(EffectContext);
  if (!context) {
    throw new Error('useEffects must be used within EffectProvider');
  }
  return context;
}

