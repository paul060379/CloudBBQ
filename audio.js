/* Original procedural sound effects, generated locally with Web Audio. */
window.PicnicAudio = (() => {
  let ctx, master, enabled = false, sizzle, noiseBuffer, musicWanted = false;
  let activation = 0;
  const status = () => ({enabled, running:enabled && ctx?.state === 'running', supported:!!(window.AudioContext || window.webkitAudioContext)});
  function notify() { window.dispatchEvent(new Event('picnic-audio-state')); }
  function session(type) { try { if (navigator.audioSession) navigator.audioSession.type = type; } catch {} }
  function syncMusic() {
    const music = typeof document === 'undefined' ? null : document.querySelector('#bg-music');
    if (!music) return;
    music.volume = .22;
    if (enabled && musicWanted) { if (music.paused) music.play().catch(() => {}); }
    else if (!music.paused) music.pause();
  }
  function init() {
    if (!ctx || ctx.state === 'closed') {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      ctx.onstatechange = () => { notify(); syncMusic(); };
      master = ctx.createGain(); master.gain.value = .5; master.connect(ctx.destination);
      noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const samples = noiseBuffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    }
  }
  async function unlock() {
    if (!enabled) return false;
    const ticket = activation;
    try {
      session('playback'); init(); syncMusic();
      // Call resume directly during the user's tap, before awaiting anything.
      await ctx.resume();
      if (ticket !== activation || !enabled) { if (!enabled) ctx.suspend().catch(() => {}); return false; }
      syncMusic(); notify(); return ctx.state === 'running';
    } catch { notify(); return false; }
  }
  function tone(freq, at, duration = .15, type = 'sine', volume = .3, end = freq) {
    if (!ctx || !enabled) return;
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + at;
    o.type = type; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(end, t + duration);
    g.gain.setValueAtTime(.001, t); g.gain.linearRampToValueAtTime(volume, t + .008); g.gain.exponentialRampToValueAtTime(.001, t + duration);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + duration + .01);
    o.onended = () => { o.disconnect(); g.disconnect(); };
  }
  function noise(duration, frequency, volume = .25) {
    if (!ctx || !enabled) return;
    const n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    n.buffer = noiseBuffer; f.type = 'bandpass'; f.frequency.value = frequency; f.Q.value = .7;
    const t = ctx.currentTime;
    g.gain.setValueAtTime(.001, t); g.gain.linearRampToValueAtTime(volume, t + .04); g.gain.exponentialRampToValueAtTime(.001, t + duration);
    n.connect(f); f.connect(g); g.connect(master); n.start(); n.stop(t + duration);
    n.onended = () => { n.disconnect(); f.disconnect(); g.disconnect(); };
  }
  function play(name) {
    if (!enabled || ctx?.state !== 'running') return;
    switch (name) {
      case 'pick': tone(440, 0, .09, 'sine', .22, 780); break;
      case 'place': tone(180, 0, .12, 'sine', .45, 85); noise(.4, 4200, .16); break;
      case 'flip': noise(.13, 1600, .25); tone(340, 0, .16, 'triangle', .3, 920); tone(1200, .1, .09, 'sine', .13); break;
      case 'ready': tone(880, 0, .13, 'sine', .12); tone(1175, .13, .2, 'sine', .12); break;
      case 'serve': [523, 659, 784, 1047].forEach((n, i) => tone(n, i * .09, .24, 'triangle', .24)); break;
      case 'happy': [660, 990, 880].forEach((n, i) => tone(n, i * .09, .14, 'sine', .25, n * 1.15)); break;
      case 'burn': tone(280, 0, .35, 'triangle', .18, 100); break;
      case 'wait': tone(350, 0, .13, 'sine', .16, 310); break;
      case 'magic': [1047, 1319, 1568, 2093].forEach((n, i) => tone(n, i * .075, .3, 'sine', .14)); break;
      case 'fan': noise(.65, 650, .38); tone(160, 0, .4, 'sine', .1, 300); break;
      case 'start': [392, 523, 659, 784, 1047].forEach((n, i) => tone(n, i * .12, .3, 'triangle', .22)); break;
      case 'perfect': [784, 1047, 1319, 1568].forEach((n, i) => tone(n, i * .055, .22, 'triangle', .2)); tone(2093, .2, .26, 'sine', .09); break;
      case 'rare': [1568, 1319, 1760].forEach((n, i) => tone(n, i * .11, .3, 'sine', .08)); break;
      case 'tick': tone(880, 0, .09, 'sine', .11, 660); break;
      case 'finish': [523, 659, 784, 1047, 784, 1047].forEach((n, i) => tone(n, i * .15, .35, 'triangle', .24)); break;
    }
  }
  function cooking(count) {
    if (!ctx || !enabled) return;
    if (count && !sizzle) {
      const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
      source.buffer = noiseBuffer; source.loop = true; filter.type = 'highpass'; filter.frequency.value = 3500; gain.gain.value = 0;
      source.connect(filter); filter.connect(gain); gain.connect(master); source.start();
      sizzle = {source, filter, gain};
    }
    if (sizzle) sizzle.gain.gain.setTargetAtTime(count ? Math.min(count, 4) * .016 : 0, ctx.currentTime, .2);
  }
  function music(value) { musicWanted = value; syncMusic(); }
  function setEnabled(value) {
    enabled = value; activation++;
    if (enabled) { const result = unlock(); notify(); return result; }
    if (sizzle) { sizzle.source.stop(); sizzle.source.disconnect(); sizzle.filter.disconnect(); sizzle.gain.disconnect(); sizzle = null; }
    syncMusic(); if (ctx) ctx.suspend().catch(() => {});
    session('auto'); notify(); return Promise.resolve(false);
  }
  return {play, cooking, music, setEnabled, unlock, status};
})();
