// Text-to-Speech Service using secure certification keys + backend TTS

const SpeechService = {
  synth: window.speechSynthesis,
  audioContext: new (window.AudioContext || window.webkitAudioContext)(),
  voices: [],
  currentUtterance: null,
  settings: {
    rate: 0.9,
    pitch: 1,
    volume: 1,
    voice: null
  },

  // Initialize speech service
  init() {
    if (this.isSupported()) {
      this.loadVoices();
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => this.loadVoices();
      }
    }

    const savedRate = StorageService.getPreference('speechRate');
    if (savedRate) {
      this.settings.rate = savedRate;
    }

    return true;
  },

  // Check if browser supports speech synthesis
  isSupported() {
    return 'speechSynthesis' in window;
  },

  // Load available voices
  loadVoices() {
    this.voices = this.synth.getVoices();
    const englishVoices = this.voices.filter(voice => voice.lang.startsWith('en'));
    const usVoice = englishVoices.find(voice => voice.lang === 'en-US' && voice.name.includes('Google')) || englishVoices.find(voice => voice.lang === 'en-US') || englishVoices[0];
    if (usVoice) {
      this.settings.voice = usVoice;
    }
  },

  // Speak text
  async speak(text, options = {}) {
    const certKey = StorageService.getPreference('certificationKey');
    if (!certKey) {
      Utils.showToast('Add your certification key in Settings to enable cloud TTS. Using browser voice.', 'info');
      return this.speakWithBrowser(text, options);
    }

    try {
      await this.speakWithBackend(text, certKey, options);
      return true;
    } catch (error) {
      console.error('Backend TTS failed, falling back to browser speech', error);
      Utils.showToast('Cloud TTS failed, using browser voice', 'error');
      return this.speakWithBrowser(text, options);
    }
  },

  // Speak with secured backend TTS
  async speakWithBackend(text, certKey, options = {}) {
    const baseUrl = window.TTS_BASE_URL || 'http://localhost:3000';
    const url = `${baseUrl.replace(/\/$/, '')}/synthesize`;
    const deviceInfo = (window.DeviceFingerprint && window.DeviceFingerprint.getDeviceInfo()) || {};

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Cert-Key': certKey
      },
      body: JSON.stringify({
        text,
        deviceInfo
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || response.statusText;
      throw new Error(errorMessage);
    }

    // Read raw audio and play
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    if (options.onStart) options.onStart();
    source.onended = () => {
      if (options.onEnd) options.onEnd();
    };
    source.start(0);
  },

  // Speak with browser's Web Speech API
  speakWithBrowser(text, options = {}) {
    if (!this.isSupported()) {
      console.warn('Speech synthesis not available');
      return false;
    }

    this.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance = utterance;

    utterance.rate = options.rate || this.settings.rate;
    utterance.pitch = options.pitch || this.settings.pitch;
    utterance.volume = options.volume || this.settings.volume;

    if (this.settings.voice) {
      utterance.voice = this.settings.voice;
    }

    utterance.onstart = () => {
      if (options.onStart) options.onStart();
    };

    utterance.onend = () => {
      this.currentUtterance = null;
      if (options.onEnd) options.onEnd();
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      this.currentUtterance = null;
      if (options.onError) options.onError(event);
    };

    try {
      this.synth.speak(utterance);
      return true;
    } catch (error) {
      console.error('Error speaking:', error);
      return false;
    }
  },

  speakWord(word) {
    return this.speak(word);
  },

  pause() {
    if (this.synth.speaking && !this.synth.paused) {
      this.synth.pause();
    }
  },

  resume() {
    if (this.synth.paused) {
      this.synth.resume();
    }
  },

  cancel() {
    if (this.synth.speaking || this.synth.pending) {
      this.synth.cancel();
      this.currentUtterance = null;
    }
  },

  isSpeaking() {
    return this.synth.speaking;
  },

  setRate(rate) {
    this.settings.rate = Math.max(0.5, Math.min(1.5, rate));
    StorageService.updatePreference('speechRate', this.settings.rate);
  },

  getRate() {
    return this.settings.rate;
  },

  setPitch(pitch) {
    this.settings.pitch = Math.max(0.5, Math.min(2, pitch));
  },

  setVolume(volume) {
    this.settings.volume = Math.max(0, Math.min(1, volume));
  },

  getVoices() {
    return this.voices;
  }
};
