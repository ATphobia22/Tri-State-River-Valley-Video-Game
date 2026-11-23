/**
 * Upgraded offline activity / mini-game loops for River Valley.
 * Builds on ValleyCore farm/hunt/fish/cook with richer timing, feedback,
 * and Scout-aware hints. Pure deterministic; no network.
 * Family-friendly fiction — not real hunting/fishing regulation.
 */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ValleyActivities = api;
})(typeof globalThis === 'object' ? globalThis : this, function (root) {
  'use strict';
  const C = root.ValleyCore;
  const Companion = root.ValleyCompanion;
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

  const FISH_KINDS = Object.freeze(['bluegill', 'channelCatfish', 'bass']);
  const HUNT_KINDS = Object.freeze(['deer', 'turkey', 'rabbit']);
  const FISH_WINDOW = Object.freeze({ bluegill: 1100, channelCatfish: 1400, bass: 900 });
  const HUNT_WINDOW = Object.freeze({ deer: 1600, turkey: 1200, rabbit: 900 });

  function createFishRound(now, seed) {
    const t = Number.isFinite(now) ? now : Date.now();
    const s = (seed >>> 0) || (t & 0xffff);
    const kind = FISH_KINDS[s % FISH_KINDS.length];
    const wait = 1800 + (s % 7) * 420;
    const windowMs = FISH_WINDOW[kind] || 1100;
    return {
      kind,
      castAt: t,
      biteAt: t + wait,
      expiresAt: t + wait + windowMs,
      windowMs,
      status: 'waiting',
    };
  }

  function stepFish(round, now) {
    if (!round) return { status: 'idle' };
    const t = Number.isFinite(now) ? now : Date.now();
    if (t < round.biteAt) return { status: 'waiting', progress: clamp((t - round.castAt) / (round.biteAt - round.castAt), 0, 1) };
    if (t <= round.expiresAt) return { status: 'biting', progress: clamp((t - round.biteAt) / round.windowMs, 0, 1) };
    return { status: 'missed', progress: 1 };
  }

  function reelFish(save, round, now) {
    if (!C || !round) return { save, result: 'invalid' };
    const t = Number.isFinite(now) ? now : Date.now();
    const phase = stepFish(round, t);
    if (phase.status !== 'biting') return { save: C.validateSave(save), result: phase.status === 'waiting' ? 'early' : 'late' };
    return C.fishReel(save, round.biteAt, t, round.kind);
  }

  function createHuntRound(now, seed) {
    const t = Number.isFinite(now) ? now : Date.now();
    const s = (seed >>> 0) || (t & 0xffff);
    const kind = HUNT_KINDS[s % HUNT_KINDS.length];
    const target = 0.28 + ((s >>> 3) % 45) / 100;
    const windowMs = HUNT_WINDOW[kind] || 1200;
    return {
      kind,
      target: clamp(target, 0.15, 0.85),
      startedAt: t,
      expiresAt: t + windowMs + 800,
      windowMs,
      status: 'tracking',
    };
  }

  function stepHunt(round, aim, now) {
    if (!round) return { status: 'idle' };
    const t = Number.isFinite(now) ? now : Date.now();
    if (t > round.expiresAt) return { status: 'escaped', delta: 1 };
    const a = clamp(Number.isFinite(aim) ? aim : 0.5, 0, 1);
    const delta = Math.abs(a - round.target);
    const hint =
      Companion && Companion.hint
        ? Companion.hint(a, round.target)
        : delta < 0.07
          ? 'close'
          : a < round.target
            ? 'right'
            : 'left';
    return { status: 'tracking', delta, hint, progress: clamp((t - round.startedAt) / (round.expiresAt - round.startedAt), 0, 1) };
  }

  function fireHunt(save, round, aim, now) {
    if (!C || !round) return { save, result: 'invalid' };
    const t = Number.isFinite(now) ? now : Date.now();
    return C.huntShot(save, aim, round.target, t, round.expiresAt);
  }

  function farmPlotStates(save, now) {
    const s = C ? C.validateSave(save) : save;
    const t = Number.isFinite(now) ? now : Date.now();
    return (s.farmPlots || []).map((readyAt, index) => {
      if (!readyAt) return { index, state: 'empty', remaining: 0 };
      if (readyAt > t) return { index, state: 'growing', remaining: readyAt - t };
      return { index, state: 'ready', remaining: 0 };
    });
  }

  function plantOrHarvest(save, index, now) {
    if (!C) return { save, result: 'invalid' };
    return C.farmAction(save, index, now);
  }

  function waterPlots(save, now) {
    if (!C) return { save, result: 'invalid' };
    return C.waterFarm(save, now);
  }

  function listCookable(save) {
    if (!C || !C.RECIPES) return [];
    const s = C.validateSave(save);
    return Object.entries(C.RECIPES).map(([id, recipe]) => ({
      id,
      title: recipe.title,
      ingredients: recipe.ingredients,
      coins: recipe.coins,
      xp: recipe.xp,
      canCook: Object.entries(recipe.ingredients).every(([k, n]) => (s.inventory[k] || 0) >= n),
    }));
  }

  function cook(save, id) {
    if (!C) return { save, result: 'invalid' };
    return C.cookRecipe(save, id);
  }

  return Object.freeze({
    FISH_KINDS,
    HUNT_KINDS,
    createFishRound,
    stepFish,
    reelFish,
    createHuntRound,
    stepHunt,
    fireHunt,
    farmPlotStates,
    plantOrHarvest,
    waterPlots,
    listCookable,
    cook,
  });
});
