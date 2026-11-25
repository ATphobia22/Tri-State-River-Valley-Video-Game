/**
 * WebMCP tool registration for River Valley open world / Mount Vernon twin viewer.
 * Spec: https://github.com/ATphobia22/webmcp (document.modelContext.registerTool)
 *
 * Safe no-op when WebMCP is unavailable (most browsers today).
 * Polyfill: @w3c/webmcp-polyfill when testing agent flows.
 */
(function (global) {
  'use strict';

  const TOOLS = [];

  function hasWebMCP() {
    return !!(global.document && document.modelContext && typeof document.modelContext.registerTool === 'function');
  }

  async function register(tool, signal) {
    if (!hasWebMCP()) {
      TOOLS.push({ name: tool.name, registered: false, reason: 'no-modelContext' });
      return false;
    }
    try {
      await document.modelContext.registerTool(tool, signal ? { signal } : undefined);
      TOOLS.push({ name: tool.name, registered: true });
      return true;
    } catch (e) {
      TOOLS.push({ name: tool.name, registered: false, reason: String(e && e.message || e) });
      return false;
    }
  }

  async function registerRiverValleyTools(api) {
    const ctrl = new AbortController();

    await register({
      name: 'set-camera-preset',
      description: 'Switch the open-world camera to a named preset: hero, cinematic, topdown, river, or free.',
      inputSchema: {
        type: 'object',
        properties: {
          preset: {
            type: 'string',
            enum: ['hero', 'cinematic', 'topdown', 'river', 'free'],
            description: 'Camera preset name'
          }
        },
        required: ['preset']
      },
      async execute({ preset }) {
        if (api && typeof api.setCameraPreset === 'function') {
          api.setCameraPreset(preset);
        }
        return { content: [{ type: 'text', text: `Camera preset: ${preset}` }] };
      }
    }, ctrl.signal);

    await register({
      name: 'get-river-status',
      description: 'Fetch live USGS river/gage status for Mount Vernon area (GAGE_DATUM / stage).',
      inputSchema: { type: 'object', properties: {} },
      async execute() {
        try {
          const mod = await import('./usgs_river_status.js');
          const st = await mod.riverStatusForMountVernon();
          const ok = (st.stations || []).filter((s) => s.ok).length;
          const total = (st.stations || []).length;
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({ ok, total, stations: st.stations }, null, 2)
            }]
          };
        } catch (e) {
          return { content: [{ type: 'text', text: `River status unavailable: ${e.message}` }] };
        }
      }
    }, ctrl.signal);

    await register({
      name: 'toggle-photo-mode',
      description: 'Enter or exit photo mode in the open-world viewer.',
      inputSchema: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean', description: 'true to enter photo mode' }
        }
      },
      async execute({ enabled }) {
        if (api && typeof api.photoMode === 'function') {
          api.photoMode(!!enabled);
        }
        return { content: [{ type: 'text', text: `Photo mode: ${!!enabled}` }] };
      }
    }, ctrl.signal);

    await register({
      name: 'open-minigame',
      description: 'Open a family mini-game: hunt, fish, farm, artifact, or historic.',
      inputSchema: {
        type: 'object',
        properties: {
          game: {
            type: 'string',
            enum: ['hunt', 'fish', 'farm', 'artifact', 'historic'],
            description: 'Mini-game id'
          }
        },
        required: ['game']
      },
      async execute({ game }) {
        const href = `../minigames/mg-${game}/index.html`;
        if (typeof window !== 'undefined') {
          window.open(href, '_blank', 'noopener');
        }
        return { content: [{ type: 'text', text: `Opened mini-game: ${game}` }] };
      }
    }, ctrl.signal);

    return {
      abort: () => ctrl.abort(),
      list: () => TOOLS.slice(),
      webmcpAvailable: hasWebMCP()
    };
  }

  global.RiverValleyWebMCP = { registerRiverValleyTools, hasWebMCP };
})(typeof window !== 'undefined' ? window : globalThis);
