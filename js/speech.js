const SpeechService = {
  synth: window.speechSynthesis,
  audioContext: null,
  audioElement: null,
  voices: [],
  currentUtterance: null,
  settings: {
    rate: 0.9,
    pitch: 1,
    volume: 1,
    voice: null,
  },

  async init() {
    if (this.isSupported()) {
      this.loadVoices();
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => this.loadVoices();
      }
    }

    const savedRate = await StorageService.getPreference("speechRate");
    if (savedRate) {
      this.settings.rate = savedRate;
    }

    this.setupAudioContextUnlock();
    this.setupAudioElement();

    return true;
  },

  setupAudioElement() {
    if (!this.audioElement) {
      this.audioElement = new Audio();
      this.audioElement.preload = 'auto';
      this.audioElement.volume = 1.0;
      this.audioElement.setAttribute('playsinline', '');
      this.audioElement.setAttribute('webkit-playsinline', '');
    }
  },

  setupAudioContextUnlock() {
    const unlockAudio = () => {
      try {
        if (!this.audioContext) {
          this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.audioContext.state === 'suspended') {
          this.audioContext.resume();
        }
      } catch (error) {
        console.warn('Failed to unlock AudioContext:', error);
      }
    };

    document.addEventListener('touchstart', unlockAudio, { once: false, passive: true, capture: true });
    document.addEventListener('click', unlockAudio, { once: false, capture: true });
  },

  isSupported() {
    return "speechSynthesis" in window;
  },

  loadVoices() {
    this.voices = this.synth.getVoices();
    const englishVoices = this.voices.filter((voice) =>
      voice.lang.startsWith("en")
    );
    const usVoice =
      englishVoices.find(
        (voice) => voice.lang === "en-US" && voice.name.includes("Google")
      ) ||
      englishVoices.find((voice) => voice.lang === "en-US") ||
      englishVoices[0];
    if (usVoice) {
      this.settings.voice = usVoice;
    }
  },

  async speak(text, options = {}) {
    const certificate = await StorageService.getPreference("certificationKey");

    if (!certificate) {
      Utils.showToast(
        "Add your certificate in Settings to enable cloud TTS. Using browser voice.",
        "info"
      );
      return this.speakWithBrowser(text, options);
    }

    try {
      await this.speakWithBackend(text, certificate, options);
      return true;
    } catch (error) {
      console.error("Backend TTS failed, falling back to browser speech", error);
      Utils.showToast("Cloud TTS failed, using browser voice", "error");
      return this.speakWithBrowser(text, options);
    }
  },

  async speakWithBackend(text, certificate, options = {}) {
    const baseUrl =
      (window.AppConfig && window.AppConfig.API_BASE_URL) ||
      "https://vocab-master-backend.onrender.com";
    const url = `${baseUrl.replace(/\/$/, "")}/synthesize`;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Cert-Key": certificate,
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || response.statusText;
      throw new Error(errorMessage);
    }

    const arrayBuffer = await response.arrayBuffer();

    if (isIOS && this.audioElement) {
      return this.playWithAudioElement(arrayBuffer, options);
    }

    return this.playWithWebAudio(arrayBuffer, options);
  },

  async playWithAudioElement(arrayBuffer, options = {}) {
    try {
      const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
      const blobUrl = URL.createObjectURL(blob);

      this.audioElement.src = blobUrl;
      this.audioElement.volume = 1.0;

      this.audioElement.onended = () => {
        URL.revokeObjectURL(blobUrl);
        if (options.onEnd) options.onEnd();
      };

      this.audioElement.onerror = (error) => {
        console.error('HTML5 Audio error:', error);
        URL.revokeObjectURL(blobUrl);
        if (options.onError) options.onError(error);
      };

      if (options.onStart) options.onStart();

      const playPromise = this.audioElement.play();
      if (playPromise !== undefined) {
        await playPromise;
      }

      return true;
    } catch (error) {
      console.error('HTML5 Audio playback failed:', error);
      return this.playWithWebAudio(arrayBuffer, options);
    }
  },

  async playWithWebAudio(arrayBuffer, options = {}) {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (error) {
        console.warn('Failed to resume AudioContext:', error);
      }
    }

    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    if (options.onStart) options.onStart();
    source.onended = () => {
      if (options.onEnd) options.onEnd();
    };

    source.start(0);
    return true;
  },

  speakWithBrowser(text, options = {}) {
    if (!this.isSupported()) {
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
      console.error("Speech synthesis error:", event);
      this.currentUtterance = null;
      if (options.onError) options.onError(event);
    };

    try {
      this.synth.speak(utterance);
      return true;
    } catch (error) {
      console.error("Error speaking:", error);
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

  async setRate(rate) {
    this.settings.rate = Math.max(0.5, Math.min(1.5, rate));
    await StorageService.updatePreference("speechRate", this.settings.rate);
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
  },
};
