/**
 * River Valley shared render / input / OS adaptation
 * Used by open_world + mini-games for consistent performance & controls.
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'rv-render-settings-v1';

  const TIERS = {
    battery: {
      maxPixelRatio: 1, shadows: false, shadowMapSize: 512, antialias: false,
      toneMappingExposure: 1.0, maxTrees: 80, maxBuildings: 40, fogDensity: 0.022, targetFps: 30,
    },
    balanced: {
      maxPixelRatio: 1.5, shadows: true, shadowMapSize: 1024, antialias: true,
      toneMappingExposure: 1.05, maxTrees: 160, maxBuildings: 70, fogDensity: 0.018, targetFps: 45,
    },
    showcase: {
      maxPixelRatio: 2, shadows: true, shadowMapSize: 2048, antialias: true,
      toneMappingExposure: 1.1, maxTrees: 220, maxBuildings: 100, fogDensity: 0.015, targetFps: 60,
    },
  };

  function detectPlatform() {
    const ua = (navigator.userAgent || '').toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /android/.test(ua);
    const isMobile = isIOS || isAndroid || /mobile/.test(ua);
    const isMac = /mac os x/.test(ua) && !isIOS;
    const isWin = /windows/.test(ua);
    const coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
    const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = window.devicePixelRatio || 1;
    const cores = (navigator.hardwareConcurrency || 4);
    const mem = navigator.deviceMemory || 4;
    return { isIOS, isAndroid, isMobile, isMac, isWin, coarse, reduceMotion, dpr, cores, mem };
  }

  function suggestTier(platform) {
    if (platform.reduceMotion) return 'battery';
    if (platform.isMobile && (platform.dpr >= 3 || platform.mem <= 3 || platform.cores <= 4)) return 'battery';
    if (platform.isMobile) return 'balanced';
    if (platform.cores >= 8 && platform.dpr <= 2 && platform.mem >= 8) return 'showcase';
    return 'balanced';
  }

  function loadSettings() {
    const platform = detectPlatform();
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch (_) {}
    const tier = saved.tier || suggestTier(platform);
    const t = TIERS[tier] || TIERS.balanced;
    return {
      tier, platform,
      maxPixelRatio: saved.maxPixelRatio != null ? Number(saved.maxPixelRatio) : t.maxPixelRatio,
      shadows: saved.shadows != null ? !!saved.shadows : t.shadows,
      antialias: t.antialias,
      shadowMapSize: t.shadowMapSize,
      toneMappingExposure: t.toneMappingExposure,
      maxTrees: t.maxTrees,
      maxBuildings: t.maxBuildings,
      fogDensity: t.fogDensity,
      targetFps: t.targetFps,
      showFps: !!saved.showFps,
    };
  }

  function saveSettings(partial) {
    let cur = {};
    try { cur = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch (_) {}
    const next = { ...cur, ...partial };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return loadSettings();
  }

  function applyToRenderer(renderer, settings, scene) {
    if (!renderer) return settings;
    const pr = Math.min(window.devicePixelRatio || 1, settings.maxPixelRatio || 1.5);
    renderer.setPixelRatio(pr);
    if ('outputColorSpace' in renderer) renderer.outputColorSpace = 'srgb';
    if ('toneMappingExposure' in renderer) renderer.toneMappingExposure = settings.toneMappingExposure || 1.05;
    if (renderer.shadowMap) renderer.shadowMap.enabled = !!settings.shadows;
    if (scene && scene.fog && settings.fogDensity != null && scene.fog.density != null) {
      scene.fog.density = settings.fogDensity;
    }
    return settings;
  }

  function createAdaptiveController(onTierChange) {
    let frames = 0, acc = 0, last = performance.now(), lowStreak = 0;
    let current = loadSettings();
    return {
      get settings() { return current; },
      tick(now) {
        const dt = now - last;
        last = now;
        if (dt <= 0 || dt > 500) return current;
        frames++; acc += dt;
        if (acc >= 1000) {
          const fps = (frames * 1000) / acc;
          frames = 0; acc = 0;
          if (fps < current.targetFps * 0.72) {
            lowStreak++;
            if (lowStreak >= 3 && current.tier !== 'battery') {
              const next = current.tier === 'showcase' ? 'balanced' : 'battery';
              current = saveSettings({ tier: next });
              lowStreak = 0;
              if (typeof onTierChange === 'function') onTierChange(current);
            }
          } else lowStreak = 0;
          current._lastFps = Math.round(fps);
        }
        return current;
      },
      setTier(tier) {
        current = saveSettings({ tier });
        if (typeof onTierChange === 'function') onTierChange(current);
        return current;
      },
    };
  }

  function injectSafeAreaStyles() {
    if (document.getElementById('rv-safe-area')) return;
    const s = document.createElement('style');
    s.id = 'rv-safe-area';
    s.textContent = `:root{--rv-safe-top:env(safe-area-inset-top,0px);--rv-safe-right:env(safe-area-inset-right,0px);--rv-safe-bottom:env(safe-area-inset-bottom,0px);--rv-safe-left:env(safe-area-inset-left,0px);}#hud{padding-top:max(12px,var(--rv-safe-top))!important;padding-left:max(12px,var(--rv-safe-left))!important;padding-right:max(12px,var(--rv-safe-right))!important;}#toolbar{bottom:max(16px,calc(var(--rv-safe-bottom)+12px))!important;}#hint{bottom:max(64px,calc(var(--rv-safe-bottom)+56px))!important;}#settings-panel{bottom:max(72px,calc(var(--rv-safe-bottom)+64px))!important;}#rv-fps{position:fixed;top:max(8px,var(--rv-safe-top));left:max(8px,var(--rv-safe-left));z-index:50;font:11px/1.2 ui-monospace,monospace;color:#94a3b8;background:rgba(2,6,23,.55);padding:4px 8px;border-radius:6px;pointer-events:none;}#rv-stick{position:fixed;left:max(16px,var(--rv-safe-left));bottom:max(24px,calc(var(--rv-safe-bottom)+16px));width:110px;height:110px;z-index:12;touch-action:none;display:none;border-radius:50%;background:rgba(15,23,42,.45);border:1px solid rgba(56,189,248,.35);}#rv-stick.visible{display:block;}#rv-stick-knob{position:absolute;left:50%;top:50%;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:rgba(56,189,248,.55);border:1px solid rgba(251,191,36,.4);}@media(pointer:fine){#rv-stick{display:none!important;}}`;
    document.head.appendChild(s);
  }

  function createVirtualStick(parent) {
    injectSafeAreaStyles();
    let el = document.getElementById('rv-stick');
    if (!el) {
      el = document.createElement('div');
      el.id = 'rv-stick';
      el.innerHTML = '<div id="rv-stick-knob"></div>';
      (parent || document.body).appendChild(el);
    }
    const knob = el.querySelector('#rv-stick-knob');
    const state = { x: 0, y: 0, active: false };
    const platform = detectPlatform();
    if (platform.coarse || platform.isMobile) el.classList.add('visible');
    function setKnob(dx, dy) {
      const r = 32; const m = Math.hypot(dx, dy) || 1; const c = Math.min(m, r);
      const nx = (dx / m) * c, ny = (dy / m) * c;
      knob.style.transform = `translate(${nx}px,${ny}px)`;
      state.x = nx / r; state.y = ny / r;
    }
    function reset() { state.x = 0; state.y = 0; state.active = false; knob.style.transform = 'translate(0,0)'; }
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault(); el.setPointerCapture(e.pointerId); state.active = true;
      const rect = el.getBoundingClientRect();
      setKnob(e.clientX - (rect.left + rect.width / 2), e.clientY - (rect.top + rect.height / 2));
    });
    el.addEventListener('pointermove', (e) => {
      if (!state.active) return;
      const rect = el.getBoundingClientRect();
      setKnob(e.clientX - (rect.left + rect.width / 2), e.clientY - (rect.top + rect.height / 2));
    });
    el.addEventListener('pointerup', reset);
    el.addEventListener('pointercancel', reset);
    return state;
  }

  function resizeRendererToDisplay(renderer, camera, host) {
    const el = host || renderer.domElement.parentElement || document.body;
    const width = el.clientWidth || window.innerWidth;
    const height = el.clientHeight || window.innerHeight;
    const pr = renderer.getPixelRatio();
    const need = renderer.domElement.width !== Math.floor(width * pr) ||
      renderer.domElement.height !== Math.floor(height * pr);
    if (need) {
      renderer.setSize(width, height, false);
      if (camera) { camera.aspect = width / Math.max(1, height); camera.updateProjectionMatrix(); }
    }
    return { width, height };
  }

  function bindOrientationResize(renderer, camera, host) {
    const fn = () => resizeRendererToDisplay(renderer, camera, host);
    window.addEventListener('resize', fn, { passive: true });
    window.addEventListener('orientationchange', () => setTimeout(fn, 120), { passive: true });
    if (window.visualViewport) visualViewport.addEventListener('resize', fn, { passive: true });
    fn();
    return fn;
  }

  global.RVRenderSettings = {
    TIERS, STORAGE_KEY, detectPlatform, suggestTier, loadSettings, saveSettings,
    applyToRenderer, createAdaptiveController, injectSafeAreaStyles, createVirtualStick,
    resizeRendererToDisplay, bindOrientationResize,
  };
})(typeof window !== 'undefined' ? window : globalThis);
