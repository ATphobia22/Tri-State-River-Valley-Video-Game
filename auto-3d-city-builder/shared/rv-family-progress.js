/**
 * Shared save bridge — rv-family-progress-v1
 */
(function (global) {
  'use strict';
  const STORAGE_KEY = 'rv-family-progress-v1';
  const DEFAULT = {
    version: 1,
    inventory: { venison: 0, hides: 0, fish: 0, fishFillet: 0, crops: 0, corn: 0, soy: 0, pumpkin: 0, tomato: 0, meals: 0, coins: 0 },
    artifacts: [], lore: [],
    scout: { bond: 0, trackingLevel: 1, relicSense: 1, commands: { sit: 0, stay: 0, fetch: 0, track: 0 } },
    stats: { deerTagged: 0, fishCaught: 0, dishesCooked: 0, harvests: 0, artifactsFound: 0, scoutSessions: 0, photos: 0 },
    party: { activeHero: 'river-explorer', unlocked: ['river-explorer', 'bill-tucker', 'scout'] },
    lastMiniGame: null, lastUpdated: null
  };
  function deepMerge(base, patch) {
    const out = Array.isArray(base) ? base.slice() : { ...base };
    if (!patch || typeof patch !== 'object') return out;
    for (const k of Object.keys(patch)) {
      if (patch[k] && typeof patch[k] === 'object' && !Array.isArray(patch[k])) out[k] = deepMerge(base[k] || {}, patch[k]);
      else out[k] = patch[k];
    }
    return out;
  }
  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return deepMerge(DEFAULT, {});
      return deepMerge(DEFAULT, JSON.parse(raw));
    } catch { return deepMerge(DEFAULT, {}); }
  }
  function saveProgress(state) {
    state.lastUpdated = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return state;
  }
  function saveMiniGameReward(updaterFn) {
    const state = loadProgress();
    updaterFn(state);
    return saveProgress(state);
  }
  global.RVFamilyProgress = { STORAGE_KEY, DEFAULT, loadProgress, saveProgress, saveMiniGameReward };
})(typeof window !== 'undefined' ? window : globalThis);
