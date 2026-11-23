# Full 3D characters and animals — detail layers

**Module:** `game/src/creatures.js` → `window.ValleyCreatures`

## Actor status

| Actor | Full 3D | Layers |
|-------|---------|--------|
| River Explorer | Yes (production GLB) | 27-joint skin, LOD0/1/2, PBR weave/bump, foot plant, grips |
| Scout | Yes (ValleyCreatures) | Body, chest, head, ears, eyes, collar/tag, legs, tail, far LOD |
| Deer | Yes | Torso, chest, neck, head, antlers, eyes, legs, tail |
| Turkey | Yes | Body, breast, head, beak, wattle, tail fan, legs |
| Rabbit | Yes | Body, chest, head, ears, eyes, legs, cotton tail |
| Family cast | Existing wardrobe / refs | Not changed in this pass |

## Layers implemented
1. Primary volumes
2. Secondary forms
3. Detail (eyes, nose, collar)
4. Materials (MeshStandardMaterial)
5. Animation drivers (`userData.animate`)
6. Scout far LOD

## Wire-in
```html
<script src="src/creatures.js"></script>
```
```js
dog = ValleyCreatures.create('scout', THREE);
scene.add(dog);
dog.userData.animate(dt, { phase, moving, action, lookYaw });

const desc = ValleyWildlife.spawnAround(x, z, { timeOfDay: time });
const layer = ValleyCreatures.attachWildlife(THREE, scene, desc, { scale: 1 });
layer.animate(dt, stamp);
```

Place on terrain by sampling ground Y under each instance.
