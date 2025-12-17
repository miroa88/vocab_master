// Text-to-Speech Service using secure certification keys + backend TTS

const SpeechService = {
  synth: window.speechSynthesis,
  audioContext: null, // Lazy initialization for Safari/iOS
  audioElement: null, // HTML5 audio element for iOS silent mode bypass
  voices: [],
  currentUtterance: null,
  settings: {
    rate: 0.9,
    pitch: 1,
    volume: 1,
    voice: null,
  },

  // Initialize speech service
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

    // Setup AudioContext unlock on first user gesture (Safari/iOS fix)
    this.setupAudioContextUnlock();

    // Create HTML5 audio element for iOS silent mode bypass
    this.setupAudioElement();

    return true;
  },

  // Setup HTML5 audio element for iOS silent mode bypass
  setupAudioElement() {
    if (!this.audioElement) {
      this.audioElement = new Audio();
      // Set properties to maximize chance of bypassing silent mode
      this.audioElement.preload = 'auto';
      this.audioElement.volume = 1.0;
      // On iOS, setting these attributes can help
      this.audioElement.setAttribute('playsinline', '');
      this.audioElement.setAttribute('webkit-playsinline', '');
      console.log('[SpeechService] HTML5 Audio element created for iOS silent mode bypass');
    }
  },

  // Setup AudioContext unlock on first user gesture (Safari/iOS compatibility)
  setupAudioContextUnlock() {
    const unlockAudio = () => {
      try {
        // CRITICAL for iOS: Create AudioContext SYNCHRONOUSLY in user gesture handler
        if (!this.audioContext) {
          this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
          console.log('AudioContext created on user gesture, state:', this.audioContext.state);
        }
        // Resume if suspended - call synchronously without await
        if (this.audioContext.state === 'suspended') {
          this.audioContext.resume()
            .then(() => console.log('AudioContext resumed on user gesture, state:', this.audioContext.state))
            .catch(error => console.warn('Failed to resume AudioContext:', error));
        }
      } catch (error) {
        console.warn('Failed to unlock AudioContext:', error);
      }
    };

    // Listen for both touch and click events (mobile and desktop)
    // Use capture phase to ensure we catch events before any stopPropagation
    document.addEventListener('touchstart', unlockAudio, { once: false, passive: true, capture: true });
    document.addEventListener('click', unlockAudio, { once: false, capture: true });
  },

  // Check if browser supports speech synthesis
  isSupported() {
    return "speechSynthesis" in window;
  },

  // Load available voices
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

  // Speak text
  async speak(text, options = {}) {
    console.log('[SpeechService] Attempting to speak:', text);
    const certificate = await StorageService.getPreference("certificationKey");
    console.log('[SpeechService] Certificate retrieved:', certificate ? 'Present (length: ' + certificate.length + ')' : 'NULL/Empty');

    if (!certificate) {
      console.warn('[SpeechService] No certification key found - falling back to browser voice');
      Utils.showToast(
        "Add your certificate in Settings to enable cloud TTS. Using browser voice.",
        "info"
      );
      return this.speakWithBrowser(text, options);
    }

    try {
      console.log('[SpeechService] Using backend TTS with certificate');
      await this.speakWithBackend(text, certificate, options);
      return true;
    } catch (error) {
      console.error(
        "[SpeechService] Backend TTS failed, falling back to browser speech",
        error
      );
      Utils.showToast("Cloud TTS failed, using browser voice", "error");
      return this.speakWithBrowser(text, options);
    }
  },

  // Speak with certificate-protected backend TTS
  async speakWithBackend(text, certificate, options = {}) {
    const baseUrl =
      (window.AppConfig && window.AppConfig.API_BASE_URL) ||
      "https://vocab-master-backend.onrender.com";
    const url = `${baseUrl.replace(/\/$/, "")}/synthesize`;

    // iOS Detection
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    console.log('[SpeechService] iOS detected:', isIOS);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Cert-Key": certificate,
      },
      body: JSON.stringify({
        text,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || response.statusText;
      throw new Error(errorMessage);
    }

    // Read raw audio data
    const arrayBuffer = await response.arrayBuffer();
    console.log('[SpeechService] Audio buffer received, size:', arrayBuffer.byteLength);

    // iOS Silent Mode Bypass: Use HTML5 Audio element with Blob URL
    if (isIOS && this.audioElement) {
      return this.playWithAudioElement(arrayBuffer, options);
    }

    // Fallback to Web Audio API for non-iOS or if audio element not available
    return this.playWithWebAudio(arrayBuffer, options);
  },

  // Play audio using HTML5 Audio element (better for iOS silent mode bypass)
  async playWithAudioElement(arrayBuffer, options = {}) {
    try {
      // Create a Blob from the array buffer
      const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
      const blobUrl = URL.createObjectURL(blob);

      // Set the audio source
      this.audioElement.src = blobUrl;
      this.audioElement.volume = 1.0;

      // Setup event handlers
      this.audioElement.onended = () => {
        console.log('[SpeechService] HTML5 Audio playback ended');
        URL.revokeObjectURL(blobUrl); // Clean up
        if (options.onEnd) options.onEnd();
      };

      this.audioElement.onerror = (error) => {
        console.error('[SpeechService] HTML5 Audio error:', error);
        URL.revokeObjectURL(blobUrl);
        if (options.onError) options.onError(error);
      };

      if (options.onStart) options.onStart();

      // Play the audio
      console.log('[SpeechService] Starting HTML5 Audio playback (iOS silent mode bypass)');
      const playPromise = this.audioElement.play();

      if (playPromise !== undefined) {
        await playPromise;
        console.log('[SpeechService] HTML5 Audio playback started successfully');
      }

      return true;
    } catch (error) {
      console.error('[SpeechService] HTML5 Audio playback failed:', error);
      // Fallback to Web Audio API
      return this.playWithWebAudio(arrayBuffer, options);
    }
  },

  // Play audio using Web Audio API (original method)
  async playWithWebAudio(arrayBuffer, options = {}) {
    // Ensure AudioContext exists
    if (!this.audioContext) {
      console.warn('[SpeechService] AudioContext not initialized, creating now');
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    console.log('[SpeechService] AudioContext state before playback:', this.audioContext.state);

    // Resume AudioContext if suspended
    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        console.log('[SpeechService] AudioContext resumed, state:', this.audioContext.state);
      } catch (error) {
        console.warn('[SpeechService] Failed to resume AudioContext:', error);
      }
    }

    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    console.log('[SpeechService] Audio decoded, duration:', audioBuffer.duration, 'seconds');

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    if (options.onStart) options.onStart();
    source.onended = () => {
      console.log('[SpeechService] Web Audio playback ended');
      if (options.onEnd) options.onEnd();
    };

    console.log('[SpeechService] Starting Web Audio playback, AudioContext state:', this.audioContext.state);
    source.start(0);
    return true;
  },

  // Speak with browser's Web Speech API
  speakWithBrowser(text, options = {}) {
    if (!this.isSupported()) {
      console.warn("Speech synthesis not available");
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
