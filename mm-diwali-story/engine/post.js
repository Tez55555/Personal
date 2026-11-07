/* ==========================================================================
   MM Diwali Story: cinematic finishing pass (WebGL2)
   - temporal supersampling (motion blur): N sub-frames averaged in linear light
   - bloom (dual-filter pyramid) + film halation (warm red-orange spill around highlights)
   - highlight shoulder, lift/gamma/gain grade, split-tone, saturation, contrast
   - edge chromatic aberration, vignette, animated film grain, dithering (no banding)
   Scenes can steer it per frame: MM.postParams = (T) => ({ bloom: .9, exposure: 1.1, ... })
   ========================================================================== */
(function () {
  'use strict';
  const DEFAULTS = {
    samples: 4,        // motion-blur sub-frames per frame (1 = off)
    shutter: .5,       // fraction of a frame the shutter is open (0.5 = 180 degrees)
    exposure: 1.0,
    bloom: .9,         // bloom intensity
    bloomThreshold: .95, bloomKnee: .04, bloomRadius: 1.0,  // only true light blooms: any channel ≥ ~247/255. Type white #F4F2EE never blooms.
    halation: .22,     // warm spill
    ca: .003,          // chromatic aberration strength at the frame edge
    vignette: .38,
    grain: .05,
    lift: [0.022, 0.014, 0.034], gamma: [1.0, 1.0, 1.0], gain: [1.0, 1.0, 1.0],  // lifted blacks: less banding after recompression
    shadowTint: [0.30, 0.22, 0.55], highlightTint: [1.0, 0.82, 0.55], splitTone: .08,
    saturation: 1.06, contrast: 1.04,
  };

  const VS = `#version 300 es
  in vec2 p; out vec2 uv; void main(){ uv = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`;
  const FS = {
    accum: `#version 300 es
    precision highp float; in vec2 uv; out vec4 o; uniform sampler2D src; uniform float w;
    void main(){ vec3 c = texture(src, uv).rgb; o = vec4(pow(c, vec3(2.2)) * w, w); }`,
    bright: `#version 300 es
    precision highp float; in vec2 uv; out vec4 o; uniform sampler2D src; uniform vec2 texel; uniform float thr, knee;
    void main(){
      vec3 c = vec3(0.);
      c += texture(src, uv + texel * vec2(-1., -1.)).rgb; c += texture(src, uv + texel * vec2(1., -1.)).rgb;
      c += texture(src, uv + texel * vec2(-1., 1.)).rgb;  c += texture(src, uv + texel * vec2(1., 1.)).rgb; c *= .25;
      float l = max(c.r, max(c.g, c.b));
      float s = clamp(l - thr + knee, 0., 2. * knee); s = s * s / (4. * knee + 1e-4);
      float k = max(s, l - thr) / max(l, 1e-4);
      o = vec4(c * k, 1.); }`,
    down: `#version 300 es
    precision highp float; in vec2 uv; out vec4 o; uniform sampler2D src; uniform vec2 texel;
    void main(){
      vec3 c = texture(src, uv).rgb * 4.;
      c += texture(src, uv + texel * vec2(-1., -1.)).rgb; c += texture(src, uv + texel * vec2(1., -1.)).rgb;
      c += texture(src, uv + texel * vec2(-1., 1.)).rgb;  c += texture(src, uv + texel * vec2(1., 1.)).rgb;
      o = vec4(c / 8., 1.); }`,
    up: `#version 300 es
    precision highp float; in vec2 uv; out vec4 o; uniform sampler2D src; uniform sampler2D base; uniform vec2 texel; uniform float r;
    void main(){
      vec2 t = texel * r; vec3 c = vec3(0.);
      c += texture(src, uv + vec2(-2.*t.x, 0.)).rgb; c += texture(src, uv + vec2(2.*t.x, 0.)).rgb;
      c += texture(src, uv + vec2(0., -2.*t.y)).rgb; c += texture(src, uv + vec2(0., 2.*t.y)).rgb;
      c += texture(src, uv + vec2(-t.x, t.y)).rgb * 2.; c += texture(src, uv + vec2(t.x, t.y)).rgb * 2.;
      c += texture(src, uv + vec2(-t.x, -t.y)).rgb * 2.; c += texture(src, uv + vec2(t.x, -t.y)).rgb * 2.;
      o = vec4(c / 12. + texture(base, uv).rgb, 1.); }`,
    final: `#version 300 es
    precision highp float; in vec2 uv; out vec4 o;
    uniform sampler2D acc, bloom, halo; uniform vec2 res; uniform float time;
    uniform float exposure, bloomI, halI, ca, vig, grain, split, sat, con;
    uniform vec3 lift, gam, gain, shTint, hiTint;
    float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    vec3 shoulder(vec3 c){ vec3 k = vec3(.82); vec3 over = max(c - k, 0.); return min(c, k) + (1. - k) * (1. - exp(-over / (1. - k))); }
    void main(){
      vec2 d = uv - .5; float r2 = dot(d * vec2(.5625, 1.), d * vec2(.5625, 1.)) * 4.;
      vec2 off = d * ca * r2;
      vec3 c = vec3(texture(acc, uv - off).r, texture(acc, uv).g, texture(acc, uv + off).b);
      vec3 b = texture(bloom, uv).rgb; vec3 h = texture(halo, uv).rgb;
      c += b * bloomI + h * vec3(1., .38, .16) * halI;
      c = shoulder(c * exposure);
      c = pow(max(c, 0.), vec3(1. / 2.2));
      c = gain * (c + lift * (1. - c)); c = pow(max(c, 0.), 1. / gam);
      float l = dot(c, vec3(.2126, .7152, .0722));
      c = mix(c, c * mix(shTint * 1.6, hiTint * 1.2, smoothstep(.15, .75, l)), split);
      c = mix(vec3(l), c, sat);
      c = (c - .5) * con + .5;
      float v = smoothstep(1.05, .2, length(d * vec2(1.05, .92)) * 1.25); c *= mix(1., v, vig);
      float n = hash(floor(uv * res / 2.6) + fract(floor(time * 15.) / 15. * 7.13) * 917.) - .5;  // ~2.6px grain refreshed on twos: survives WhatsApp recompression, costs fewer bits
      c += n * grain * (1. - .55 * l);
      c += (hash(uv * res * 1.37 + 31.7) - .5) / 255.;
      o = vec4(clamp(c, 0., 1.), 1.); }`,
  };

  function Post(src2d) {
    const cv = document.createElement('canvas'); cv.width = src2d.width; cv.height = src2d.height;
    const gl = cv.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false, premultipliedAlpha: false, alpha: false });
    if (!gl) throw new Error('WebGL2 unavailable');
    if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) throw new Error('no float render targets');
    gl.getExtension('OES_texture_float_linear');
    const progs = {};
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    for (const [k, fs] of Object.entries(FS)) {
      const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
      gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); progs[k] = p;
    }
    const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const tex = (w, h, float) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, float ? gl.RGBA16F : gl.RGBA8, w, h, 0, gl.RGBA, float ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; };
    const target = (w, h, ldr) => { const t = tex(w, h, !ldr); const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); return { t, f, w, h }; };
    const W = cv.width, H = cv.height;
    const srcTex = tex(W, H, false);
    const acc = target(W, H);
    const levels = []; let lw = W >> 1, lh = H >> 1;
    for (let i = 0; i < 6 && lw > 8 && lh > 8; i++) { levels.push({ down: target(lw, lh, true), up: target(lw, lh, true) }); lw >>= 1; lh >>= 1; }
    const use = (name, tgt) => { const p = progs[name]; gl.useProgram(p); gl.bindFramebuffer(gl.FRAMEBUFFER, tgt ? tgt.f : null); gl.viewport(0, 0, tgt ? tgt.w : W, tgt ? tgt.h : H); return p; };
    const bindTex = (p, name, t, unit) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(gl.getUniformLocation(p, name), unit); };
    const u1 = (p, n, v) => gl.uniform1f(gl.getUniformLocation(p, n), v);
    const u2 = (p, n, a, b) => gl.uniform2f(gl.getUniformLocation(p, n), a, b);
    const u3 = (p, n, v) => gl.uniform3f(gl.getUniformLocation(p, n), v[0], v[1], v[2]);
    const draw = () => gl.drawArrays(gl.TRIANGLES, 0, 3);

    return {
      canvas: cv,
      clear() { gl.bindFramebuffer(gl.FRAMEBUFFER, acc.f); gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); },
      add(weight) { // accumulate the current 2D canvas
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, srcTex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, src2d);
        const p = use('accum', acc); bindTex(p, 'src', srcTex, 0); u1(p, 'w', weight);
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); draw(); gl.disable(gl.BLEND);
      },
      finish(P, time) {
        // bright pass + downsample pyramid
        let p = use('bright', levels[0].down); bindTex(p, 'src', acc.t, 0); u2(p, 'texel', 1 / W, 1 / H); u1(p, 'thr', P.bloomThreshold); u1(p, 'knee', P.bloomKnee); draw();
        for (let i = 1; i < levels.length; i++) { const s = levels[i - 1].down; p = use('down', levels[i].down); bindTex(p, 'src', s.t, 0); u2(p, 'texel', 1 / s.w, 1 / s.h); draw(); }
        // upsample with accumulation
        let prev = levels[levels.length - 1].down;
        for (let i = levels.length - 2; i >= 0; i--) { p = use('up', levels[i].up); bindTex(p, 'src', prev.t, 0); bindTex(p, 'base', levels[i].down.t, 1); u2(p, 'texel', 1 / prev.w, 1 / prev.h); u1(p, 'r', P.bloomRadius); draw(); prev = levels[i].up; }
        const haloLevel = levels[Math.min(2, levels.length - 1)].up;
        p = use('final', null);
        bindTex(p, 'acc', acc.t, 0); bindTex(p, 'bloom', levels[0].up.t, 1); bindTex(p, 'halo', haloLevel.t, 2);
        u2(p, 'res', W, H); u1(p, 'time', time);
        u1(p, 'exposure', P.exposure); u1(p, 'bloomI', P.bloom); u1(p, 'halI', P.halation); u1(p, 'ca', P.ca); u1(p, 'vig', P.vignette); u1(p, 'grain', P.grain);
        u1(p, 'split', P.splitTone); u1(p, 'sat', P.saturation); u1(p, 'con', P.contrast);
        u3(p, 'lift', P.lift); u3(p, 'gam', P.gamma); u3(p, 'gain', P.gain); u3(p, 'shTint', P.shadowTint); u3(p, 'hiTint', P.highlightTint);
        draw();
      },
    };
  }

  window.MMPost = { DEFAULTS, create: Post };
})();
