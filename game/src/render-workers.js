// CPU scene preparation for the hosted and single-file editions.
(function (root) {
  'use strict';
  function buildingPlanner(points) {
    // Two equivalent nearest-neighbour searches. Learn their local cost per
    // device and radius from elapsed samples; occasionally remeasure both.
    const profiles = new Map();
    return function plan({x, z, radius, cap, exclude}) {
      const visible = new Uint8Array(points.length / 2);
      const profileKey = radius + '/' + cap;
      const profile = profiles.get(profileKey) || {samples: 0, costs: [0, 0]};
      const sample = profile.samples++;
      const method = sample % 32 < 2 ? sample % 32 : Number(profile.costs[1] < profile.costs[0]);
      const start = performance.now();
      const nearest = [];
      for (let i = 0; i < visible.length; i++) {
        const distance = (points[i*2] - x)**2 + (points[i*2+1] - z)**2;
        visible[i] = Number(distance <= 1900**2);
        if (!cap || distance >= radius**2) continue;
        const item = {i, distance};
        if (method === 0) nearest.push(item);
        else {
          if (nearest.length === cap && nearest[cap-1].distance <= distance) continue;
          let j = nearest.length;
          while (j && nearest[j-1].distance > distance) j--;
          nearest.splice(j, 0, item);
          if (nearest.length > cap) nearest.pop();
        }
      }
      if (method === 0) nearest.sort((a,b) => a.distance-b.distance);
      const near = nearest.slice(0,cap).filter(p => p.i !== exclude);
      const elapsed = performance.now() - start;
      profile.costs[method] = sample < 2 ? elapsed : .8*profile.costs[method] + .2*elapsed;
      profiles.set(profileKey,profile);
      return {near, visible, strategy: method ? 'bounded' : 'sort'};
    };
  }

  function foliagePlanner(config, biome) {
    const stream = biome.create(config);
    return function plan(q) {
      const result = stream.update(q.x, q.z, q);
      return {trees:result.changed || q.force ? result.trees : [], stats:result.stats, changed:result.changed};
    };
  }

  function channel(name, factory, config, apply, biomeFactory) {
    let worker, url, busy = false, latest = null, active = null, sync, completed = 0;
    function release() {
      if (worker) worker.terminate();
      worker = null;
      if (url) URL.revokeObjectURL(url);
      url = null;
    }
    function fallback() {
      release();
      sync = factory(config, biomeFactory && biomeFactory());
      const request = latest || active;
      latest = active = null;
      busy = false;
      if (request) deliver(sync(request), request);
    }
    function deliver(result, request) {
      completed++;
      apply(result, request);
    }
    function submit(request) {
      if (sync) return deliver(sync(request), request);
      if (busy) { latest = request; return; }
      busy = true;
      active = request;
      try { worker.postMessage({request}); } catch { fallback(); }
    }
    try {
      const biome = biomeFactory ? '(' + biomeFactory.toString() + ')()' : 'null';
      const code = 'const factory=' + factory.toString() + ';let plan;onmessage=({data})=>{' +
        'if ("config" in data){plan=factory(data.config,' + biome + ');return;}' +
        'const r=plan(data.request);postMessage(r,r.visible?[r.visible.buffer]:[]);}';
      url = URL.createObjectURL(new Blob([code], {type:'text/javascript'}));
      worker = new Worker(url, {name});
      worker.onmessage = ({data}) => {
        const request = active;
        busy = false;
        active = null;
        if (latest) {
          const next = latest; latest = null;
          // A skipped foliage result may contain the last changed snapshot.
          next.force = true;
          submit(next);
        } else deliver(data, request);
      };
      worker.onerror = event => {event.preventDefault(); fallback();};
      worker.onmessageerror = fallback;
      worker.postMessage({config});
    } catch { fallback(); }
    return {submit, snapshot: () => ({mode:sync?'inline':'worker',completed})};
  }
  const api = {buildingPlanner, foliagePlanner, channel};
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ValleyRenderWorkers = api;
})(globalThis);
