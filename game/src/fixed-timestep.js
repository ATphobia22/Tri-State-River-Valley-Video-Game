/**
 * Fixed-timestep accumulator for deterministic character / vehicle simulation.
 * Wraps any step(dt) controller (ValleyMotion, foot-plant, suspension).
 * Prevents spiral-of-death under long frames; caps catch-up steps.
 *
 * Offline-safe, zero dependencies, pure.
 * Usage:
 *   const clock = ValleyFixedTimestep.create({ fixedDt: 1/60, maxSubSteps: 5 });
 *   function frame(realDt) {
 *     clock.tick(realDt, (dt) => motion.step({ dt, ... }));
 *   }
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ValleyFixedTimestep = api;
})(typeof globalThis === "object" ? globalThis : this, function () {
  "use strict";

  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  /**
   * @param {{ fixedDt?: number, maxSubSteps?: number, maxFrameDt?: number }} [opts]
   */
  function create({ fixedDt = 1 / 60, maxSubSteps = 5, maxFrameDt = 0.1 } = {}) {
    if (!(fixedDt > 0) || !(maxSubSteps >= 1) || !(maxFrameDt > fixedDt)) {
      throw new RangeError("Invalid fixed-timestep parameters");
    }

    let accumulator = 0;
    let alpha = 0; // for optional render interpolation (0..1)

    /**
     * Advance simulation with a real frame delta.
     * @param {number} realDt seconds since last frame
     * @param {(dt: number) => void} stepFn called 0..maxSubSteps times with fixedDt
     * @returns {{ steps: number, alpha: number, clampedDt: number }}
     */
    function tick(realDt, stepFn) {
      if (typeof stepFn !== "function") {
        throw new TypeError("stepFn required");
      }
      const dt = clamp(Number.isFinite(realDt) ? realDt : fixedDt, 0, maxFrameDt);
      accumulator += dt;
      let steps = 0;
      while (accumulator >= fixedDt && steps < maxSubSteps) {
        stepFn(fixedDt);
        accumulator -= fixedDt;
        steps += 1;
      }
      // Drop excess to avoid spiral if machine was stalled
      if (accumulator > fixedDt * maxSubSteps) {
        accumulator = 0;
      }
      alpha = accumulator / fixedDt;
      return { steps, alpha, clampedDt: dt };
    }

    function reset() {
      accumulator = 0;
      alpha = 0;
    }

    function snapshot() {
      return { accumulator, alpha, fixedDt, maxSubSteps };
    }

    return Object.freeze({ tick, reset, snapshot, fixedDt });
  }

  return Object.freeze({ create });
});
