/**
 * Point Township / Mount Vernon character roster
 * Stylized game avatars — not photo-exact identity models.
 */
(function (global) {
  'use strict';
  const ROSTER = {
    'river-explorer': {
      id: 'river-explorer', displayName: 'River Explorer', role: 'hero',
      tags: ['playable', 'p0-micro', 'skull-gaiter', 'gold-chain'],
      visualNotes: 'Curly fade, skull gaiter, glasses, fingerless gloves, backpack',
      spawnHint: 'Ohio River promenade / Water Street overlook'
    },
    'bill-tucker': {
      id: 'bill-tucker', displayName: 'Bill Tucker', nickname: 'Big Buck Master',
      role: 'family', tags: ['playable', 'father', 'camo-hoodie', 'hunt-mentor'],
      visualNotes: 'Camo hoodie, jeans, optional cap — LOD0 T-pose sheet',
      spawnHint: 'Hasting Lane bottoms / family cottage', miniGame: 'mg-hunt'
    },
    'trinity-tucker': {
      id: 'trinity-tucker', displayName: 'Trinity Tucker', role: 'family',
      tags: ['playable', 'camo-hoodie'], spawnHint: 'Riverfront trail'
    },
    'daughter': {
      id: 'daughter', displayName: 'Daughter', role: 'family',
      tags: ['playable', 'pink-set'], spawnHint: 'Courthouse lawn'
    },
    'larry-goldman': {
      id: 'larry-goldman', displayName: 'Larry Goldman', role: 'npc',
      tags: ['hunt-mentor', 'camo'], miniGame: 'mg-hunt', spawnHint: 'Hovey Lake bottoms'
    },
    'pete-yeida': {
      id: 'pete-yeida', displayName: 'Pete Yeida', role: 'npc',
      tags: ['orange-beanie'], miniGame: 'mg-farm', spawnHint: 'Farm market'
    },
    'roy-tenney': {
      id: 'roy-tenney', displayName: 'Roy Tenney', role: 'npc',
      tags: ['rmr-beanie'], miniGame: 'mg-fish', spawnHint: 'Boat ramp'
    },
    'marcus-stevens': {
      id: 'marcus-stevens', displayName: 'Marcus Stevens', role: 'npc',
      tags: ['full-camo'], miniGame: 'mg-artifact', spawnHint: 'Artifact dig sites'
    },
    'scout': {
      id: 'scout', displayName: 'Scout', role: 'companion',
      tags: ['dog', 'bond'], miniGame: 'mg-scout', spawnHint: 'Near active hero'
    }
  };
  function listPlayable() {
    return Object.values(ROSTER).filter((c) => (c.tags || []).includes('playable') || c.role === 'hero');
  }
  function listForMiniGame(id) {
    return Object.values(ROSTER).filter((c) => c.miniGame === id);
  }
  global.RVCharacterRoster = { ROSTER, listPlayable, listForMiniGame };
})(typeof window !== 'undefined' ? window : globalThis);
