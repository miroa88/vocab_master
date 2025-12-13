// Text-to-Speech Service using Web Speech API and Gemini API

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
    const geminiApiKey = StorageService.getPreference('geminiApiKey');

    if (geminiApiKey) {
      try {
        await this.speakWithGemini(text, geminiApiKey, options);
        return true;
      } catch (error) {
        console.error('Gemini TTS failed, falling back to browser speech', error);
        Utils.showToast('Gemini TTS failed, using browser voice', 'error');
        return this.speakWithBrowser(text, options);
      }
    } else {
      return this.speakWithBrowser(text, options);
    }
  },

  // Speak with Gemini API
  async speakWithGemini(text, apiKey, options) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [{
            text: `Speak the following: ${text}`
          }]
        }],
        generationConfig: {
          response_modalities: ["AUDIO"],
          speech_config: {
            voice_config: {
              prebuilt_voice_config: {
                voice_name: "puck"
              }
            }
          }
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Gemini API request failed: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();

    // Extract audio content from response
    const audioContent = data.candidates?.[0]?.content?.parts?.[0]?.inline_data?.data;

    if (!audioContent) {
      throw new Error('No audio content in response');
    }

    // Decode base64 audio and play it
    const audioBuffer = await this.audioContext.decodeAudioData(this.base64ToArrayBuffer(audioContent));

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    if (options.onStart) options.onStart();
    source.onended = () => {
      if (options.onEnd) options.onEnd();
    };
    source.start(0);
  },

  base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
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
    return this.voices.filter(voice => voice.lang.startsWith('en'));
  },

  setVoice(voiceName) {
    const voice = this.voices.find(v => v.name === voiceName);
    if (voice) {
      this.settings.voice = voice;
      return true;
    }
    return false;
  },

  getCurrentVoice() {
    return this.settings.voice;
  }
};