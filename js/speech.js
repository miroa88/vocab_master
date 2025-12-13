// Text-to-Speech Service using Web Speech API

const SpeechService = {
  synth: window.speechSynthesis,
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
    if (!this.isSupported()) {
      console.warn('Speech synthesis not supported in this browser');
      return false;
    }

    // Load voices
    this.loadVoices();

    // Chrome loads voices asynchronously
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => {
        this.loadVoices();
      };
    }

    // Load saved settings
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

    // Filter for English voices
    const englishVoices = this.voices.filter(voice =>
      voice.lang.startsWith('en')
    );

    // Prefer US English voice
    const usVoice = englishVoices.find(voice =>
      voice.lang === 'en-US' && voice.name.includes('Google')
    ) || englishVoices.find(voice =>
      voice.lang === 'en-US'
    ) || englishVoices[0];

    if (usVoice) {
      this.settings.voice = usVoice;
    }
  },

  // Speak text
  speak(text, options = {}) {
    if (!this.isSupported()) {
      console.warn('Speech synthesis not available');
      return false;
    }

    // Cancel any ongoing speech
    this.cancel();

    // Create utterance
    const utterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance = utterance;

    // Apply settings
    utterance.rate = options.rate || this.settings.rate;
    utterance.pitch = options.pitch || this.settings.pitch;
    utterance.volume = options.volume || this.settings.volume;

    if (this.settings.voice) {
      utterance.voice = this.settings.voice;
    }

    // Event handlers
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

    // Speak
    try {
      this.synth.speak(utterance);
      return true;
    } catch (error) {
      console.error('Error speaking:', error);
      return false;
    }
  },

  // Speak word with definition
  speakWord(word) {
    return this.speak(word);
  },

  // Pause speech
  pause() {
    if (this.synth.speaking && !this.synth.paused) {
      this.synth.pause();
    }
  },

  // Resume speech
  resume() {
    if (this.synth.paused) {
      this.synth.resume();
    }
  },

  // Cancel speech
  cancel() {
    if (this.synth.speaking || this.synth.pending) {
      this.synth.cancel();
      this.currentUtterance = null;
    }
  },

  // Check if currently speaking
  isSpeaking() {
    return this.synth.speaking;
  },

  // Update speech rate
  setRate(rate) {
    this.settings.rate = Math.max(0.5, Math.min(1.5, rate));
    StorageService.updatePreference('speechRate', this.settings.rate);
  },

  // Get current rate
  getRate() {
    return this.settings.rate;
  },

  // Update pitch
  setPitch(pitch) {
    this.settings.pitch = Math.max(0.5, Math.min(2, pitch));
  },

  // Update volume
  setVolume(volume) {
    this.settings.volume = Math.max(0, Math.min(1, volume));
  },

  // Get available voices
  getVoices() {
    return this.voices.filter(voice => voice.lang.startsWith('en'));
  },

  // Set voice by name
  setVoice(voiceName) {
    const voice = this.voices.find(v => v.name === voiceName);
    if (voice) {
      this.settings.voice = voice;
      return true;
    }
    return false;
  },

  // Get current voice
  getCurrentVoice() {
    return this.settings.voice;
  }
};

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    SpeechService.init();
  });
} else {
  SpeechService.init();
}
