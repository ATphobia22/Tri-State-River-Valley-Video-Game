/* Original, dependency-free river shader: mobile-scaled ripple normals, Fresnel
 * sky reflection, directional sun glint, wind-driven secondary waves and soft
 * shore foam. No reflection render target, network assets or external models.
 * Cinematic art — not a hydrodynamic or surveyed water surface.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ValleyRiverWater = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const VS = `\n varying vec3 vWorld;\n void main(){\n   vec4 world=modelMatrix*vec4(position,1.0);\n   vWorld=world.xyz;\n   gl_Position=projectionMatrix*viewMatrix*world;\n }`;
  const FS = `\n precision highp float;\n varying vec3 vWorld;\n uniform float uTime;\n uniform float uDetail;\n uniform float uSunHeight;\n uniform float uStorm;\n uniform float uWind;\n uniform float uShoreZ;\n uniform vec3 uSunDirection;\n uniform vec3 uShallow;\n uniform vec3 uDeep;\n uniform vec3 uSky;\n float wave(vec2 p,float speed,float a,float b){\n   return sin(dot(p,vec2(a,b))+uTime*speed);\n }\n void main(){\n   vec2 p=vWorld.xz;\n   float wind = clamp(uWind, 0.0, 1.5);\n   float a=wave(p*.12, .72+wind*.18,1.10,.76);\n   float b=wave(p*.16,-.53-wind*.12,-.75,1.17);\n   float c=wave(p*.43, 1.23+wind*.25,.53,-1.24);\n   float d=wave(p*(.055+wind*.02), .31+wind*.08, .92, -.41)*uDetail;\n   vec3 n=normalize(vec3(\n     (a*.16+b*.13+c*.045*uDetail+d*.09),\n     1.0,\n     (b*.16-a*.12+c*.043*uDetail+d*.07)\n   ));\n   vec3 viewDir=normalize(cameraPosition-vWorld);\n   float facing=clamp(abs(dot(viewDir,n)),0.0,1.0);\n   float fresnel=pow(1.0-facing,3.7);\n   vec3 r=reflect(-viewDir,n);\n   float glint=pow(max(dot(r,normalize(uSunDirection)),0.0),96.0);\n   float smallGlint=pow(max(dot(r,normalize(uSunDirection)),0.0),280.0);\n   float ripples=.5+.5*(a*.40+b*.30+c*.18*uDetail+d*.12);\n   vec3 base=mix(uDeep,uShallow,clamp(.2+.45*ripples,0.0,1.0));\n   vec3 reflected=mix(uSky,vec3(0.91,0.81,0.62),clamp(uSunHeight*.2,0.0,.2));\n   vec3 col=mix(base,reflected,clamp(.10+fresnel*.70,0.0,.87));\n   col+=vec3(1.0,.78,.45)*glint*(1.6-uStorm*.72)*max(.1,uSunHeight);\n   col+=vec3(.82,.92,1.0)*smallGlint*.16*uDetail;\n   float shore = clamp(1.0 - abs(vWorld.z - uShoreZ) / 42.0, 0.0, 1.0);\n   float foamWave = .5 + .5 * sin(p.x * .28 + uTime * 1.4);\n   float foam = shore * shore * (.35 + .45 * foamWave) * (1.0 - uStorm * .35) * uDetail;\n   col = mix(col, vec3(0.92, 0.96, 0.98), foam * .55);\n   col=mix(col,vec3(.16,.22,.25),uStorm*.25);\n   gl_FragColor=vec4(col,.89);\n   #include <tonemapping_fragment>\n   #include <colorspace_fragment>\n }`;
  function qualityDetail(quality) {
    return quality === 'lite' || quality === 'low' ? 0 : quality === 'medium' ? 0.55 : 1;
  }
  function parameters(weather, time, quality) {
    const hour = Number.isFinite(time) ? time : 15;
    const daylight = Math.max(0, Math.sin((hour - 6) * Math.PI / 12));
    return {
      storm: weather === 'rain' ? 1 : weather === 'mist' ? 0.45 : 0,
      daylight,
      detail: qualityDetail(quality),
      wind: weather === 'rain' ? 1.15 : weather === 'mist' ? 0.45 : 0.65,
    };
  }
  function create(THREE, geometry, options) {
    options = options || {};
    if (!THREE || typeof THREE.ShaderMaterial !== 'function')
      throw new TypeError('THREE.ShaderMaterial required');
    const material = new THREE.ShaderMaterial({
      name: 'RiverValley/ProceduralRiverV2',
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: true,
      uniforms: {
        uTime: { value: 0 },
        uDetail: { value: qualityDetail(options.quality) },
        uStorm: { value: 0 },
        uSunHeight: { value: 0.7 },
        uWind: { value: 0.65 },
        uShoreZ: { value: options.shoreZ != null ? options.shoreZ : 1180 },
        uSunDirection: { value: new THREE.Vector3(-0.45, 0.7, -0.2).normalize() },
        uShallow: { value: new THREE.Color('#378b98') },
        uDeep: { value: new THREE.Color('#144b60') },
        uSky: { value: new THREE.Color('#8cafbe') },
      },
      vertexShader: VS,
      fragmentShader: FS,
    });
    return { mesh: new THREE.Mesh(geometry, material), material };
  }
  function update(material, stamp, weather, time, quality, extras) {
    if (!material || !material.uniforms) return;
    const p = parameters(weather, time, quality);
    material.uniforms.uTime.value = Math.max(0, Number.isFinite(stamp) ? stamp : 0) * 0.001;
    material.uniforms.uDetail.value = p.detail;
    material.uniforms.uStorm.value = p.storm;
    material.uniforms.uSunHeight.value = p.daylight;
    material.uniforms.uWind.value =
      extras && Number.isFinite(extras.wind) ? extras.wind : p.wind;
    if (extras && Number.isFinite(extras.shoreZ)) material.uniforms.uShoreZ.value = extras.shoreZ;
    const angle = (time - 6) * Math.PI / 12;
    material.uniforms.uSunDirection.value
      .set(Math.cos(angle), Math.max(0.08, Math.sin(angle)), -0.16)
      .normalize();
  }
  return Object.freeze({
    create,
    update,
    parameters,
    qualityDetail,
    vertexShader: VS,
    fragmentShader: FS,
  });
});
