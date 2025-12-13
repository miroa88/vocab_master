// Main Application Controller

const App = {
  currentView: 'flashcard-view',
  sessionStartTime: null,
  sessionTimer: null,

  // Initialize application
  async init() {
    this.showLoading();

    try {
      // Load vocabulary data
      const loaded = await DataService.load();

      if (!loaded) {
        throw new Error('Failed to load vocabulary data');
      }

      // Initialize modules
      FlashcardMode.init();
      QuizMode.init();
      StatsMode.init();

      // Setup navigation
      this.setupNavigation();

      // Setup settings
      this.setupSettings();

      // Apply saved theme
      this.applyTheme();

      // Start session tracking
      this.startSession();

      // Update initial stats
      StatsMode.refresh();

      this.hideLoading();

      Utils.showToast('Welcome to Vocab Master!', 'success');

    } catch (error) {
      console.error('Error initializing app:', error);
      this.hideLoading();
      Utils.showToast('Failed to initialize app', 'error');
    }
  },

  // Show loading indicator
  showLoading() {
    document.getElementById('loading').classList.remove('hidden');
  },

  // Hide loading indicator
  hideLoading() {
    document.getElementById('loading').classList.add('hidden');
  },

  // Setup navigation
  setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');

    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const viewId = btn.dataset.view;
        this.switchView(viewId);

        // Update active button
        navButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  },

  // Switch between views
  switchView(viewId) {
    // Hide all views
    const allViews = document.querySelectorAll('.view');
    allViews.forEach(view => view.classList.remove('active'));

    // Show selected view
    const targetView = document.getElementById(viewId);
    if (targetView) {
      targetView.classList.add('active');
      this.currentView = viewId;

      // Refresh view-specific content
      if (viewId === 'stats-view') {
        StatsMode.refresh();
      } else if (viewId === 'quiz-view') {
        QuizMode.reset();
      }
    }
  },

  // Setup settings
  setupSettings() {
    const themeToggle = document.getElementById('theme-toggle');
    const speechRateSlider = document.getElementById('speech-rate');
    const speechRateValue = document.getElementById('speech-rate-value');
    const autoPlayToggle = document.getElementById('auto-play');
    const exportBtn = document.getElementById('export-btn');
    const resetBtn = document.getElementById('reset-btn');

    // Theme toggle
    themeToggle.addEventListener('change', (e) => {
      const theme = e.target.checked ? 'dark' : 'light';
      this.setTheme(theme);
    });

    // Speech rate
    speechRateSlider.addEventListener('input', (e) => {
      const rate = parseFloat(e.target.value);
      speechRateValue.textContent = `${rate}x`;
      SpeechService.setRate(rate);
    });

    // Load saved speech rate
    const savedRate = SpeechService.getRate();
    speechRateSlider.value = savedRate;
    speechRateValue.textContent = `${savedRate}x`;

    // Auto-play toggle
    autoPlayToggle.addEventListener('change', (e) => {
      StorageService.updatePreference('autoPlay', e.target.checked);
    });

    // Load saved auto-play preference
    const savedAutoPlay = StorageService.getPreference('autoPlay');
    autoPlayToggle.checked = savedAutoPlay;

    // Export button
    exportBtn.addEventListener('click', () => {
      StorageService.exportData();
      Utils.showToast('Progress exported!', 'success');
    });

    // Reset button
    resetBtn.addEventListener('click', () => {
      const confirmed = StorageService.reset();
      if (confirmed) {
        // Reload page to reset everything
        window.location.reload();
      }
    });
  },

  // Set theme
  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    StorageService.updatePreference('theme', theme);

    // Update toggle
    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.checked = theme === 'dark';
  },

  // Apply saved theme
  applyTheme() {
    const savedTheme = StorageService.getPreference('theme') || 'light';
    this.setTheme(savedTheme);
  },

  // Start session tracking
  startSession() {
    this.sessionStartTime = Date.now();

    // Update session every 30 seconds
    this.sessionTimer = setInterval(() => {
      this.updateSession();
    }, 30000);

    // Save session on page unload
    window.addEventListener('beforeunload', () => {
      this.endSession();
    });

    // Handle visibility change (when tab becomes inactive)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.updateSession();
      }
    });
  },

  // Update current session
  updateSession() {
    if (!this.sessionStartTime) return;

    const duration = Math.floor((Date.now() - this.sessionStartTime) / 1000);

    // Only save if session is meaningful (at least 10 seconds)
    if (duration >= 10) {
      const stats = DataService.getStatistics();

      StorageService.addSession({
        duration: duration,
        wordsStudied: stats.total,
        wordsLearned: 0, // Updated when words are marked
        quizzesTaken: 0,
        quizScore: 0
      });

      // Update streak
      StorageService.updateStreak();

      // Reset session start time
      this.sessionStartTime = Date.now();
    }
  },

  // End session
  endSession() {
    if (this.sessionTimer) {
      clearInterval(this.sessionTimer);
    }

    this.updateSession();
  }
};

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    App.init();
  });
} else {
  App.init();
}

// Handle errors globally
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  Utils.showToast('An error occurred', 'error');
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  Utils.showToast('An error occurred', 'error');
});
