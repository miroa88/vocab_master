// Main Application Controller with JWT auth flow

const App = {
  currentView: 'flashcard-view',
  sessionStartTime: null,
  sessionTimer: null,
  hasBootstrapped: false,

  // Initialize application
  async init() {
    this.showLoading();

    try {
      this.setupAuthUI();
      this.setupAccountSection();

      const authed = await this.ensureAuthenticated();
      if (!authed) {
        this.hideLoading();
        return;
      }

      await this.bootstrap();
    } catch (error) {
      console.error('Error initializing app:', error);
      this.hideLoading();
      Utils.showToast('Failed to initialize app', 'error');
    }
  },

  // Boot the learning experience after auth
  async bootstrap() {
    if (this.hasBootstrapped) return;
    this.hasBootstrapped = true;

    try {
      // Load vocabulary data
      const loaded = await DataService.load();
      if (!loaded) {
        throw new Error('Failed to load vocabulary data');
      }

      // Initialize modules
      await FlashcardMode.init();
      QuizMode.init();
      await StatsMode.init();

      // Setup navigation and settings
      this.setupNavigation();
      await this.setupSettings();
      await this.applyTheme();

      // Start session tracking
      this.startSession();

      // Update initial stats and user display
      await StatsMode.refresh();
      await this.updateUserDisplay();

      this.hideLoading();

      const user = await StorageService.getCurrentUser();
      if (user) {
        Utils.showToast(`Welcome, ${user.name}!`, 'success');
      }
    } catch (error) {
      console.error('Error during bootstrap:', error);
      this.hideLoading();
      Utils.showToast('Failed to start app', 'error');

      // If auth failed (expired token), force logout
      if (error.status === 401) {
        this.logout(false);
      }
    }
  },

  // --- Auth UI & Flow ---
  setupAuthUI() {
    const loginTab = document.getElementById('login-tab');
    const registerTab = document.getElementById('register-tab');
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const setupBtn = document.getElementById('setup-password-btn');

    loginTab?.addEventListener('click', () => this.toggleAuthTab('login'));
    registerTab?.addEventListener('click', () => this.toggleAuthTab('register'));
    loginBtn?.addEventListener('click', () => this.handleLogin());
    registerBtn?.addEventListener('click', () => this.handleRegister());
    setupBtn?.addEventListener('click', () => this.handlePasswordSetup());
  },

  toggleAuthTab(tab) {
    const loginTab = document.getElementById('login-tab');
    const registerTab = document.getElementById('register-tab');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const setupForm = document.getElementById('password-setup-form');
    const title = document.getElementById('auth-title');
    const subtitle = document.getElementById('auth-subtitle');

    this.clearAuthErrors();

    if (tab === 'login') {
      loginTab?.classList.add('active');
      registerTab?.classList.remove('active');
      loginForm.style.display = 'flex';
      registerForm.style.display = 'none';
      setupForm.style.display = 'none';
      title.textContent = 'Welcome to Vocab Master';
      subtitle.textContent = 'Login or create an account to start learning';
    } else if (tab === 'register') {
      registerTab?.classList.add('active');
      loginTab?.classList.remove('active');
      loginForm.style.display = 'none';
      registerForm.style.display = 'flex';
      setupForm.style.display = 'none';
      title.textContent = 'Create your account';
      subtitle.textContent = 'Set a password to save your progress';
    } else if (tab === 'setup') {
      loginTab?.classList.remove('active');
      registerTab?.classList.remove('active');
      loginForm.style.display = 'none';
      registerForm.style.display = 'none';
      setupForm.style.display = 'flex';
      title.textContent = 'Set a password';
      subtitle.textContent = 'This account needs a password to continue';
    }
  },

  showAuthModal(tab = 'login') {
    this.toggleAuthTab(tab);
    const modal = document.getElementById('auth-modal');
    modal?.classList.add('show');
  },

  closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    modal?.classList.remove('show');
    this.clearAuthErrors();
  },

  clearAuthErrors() {
    ['login-error', 'register-error', 'setup-error'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '';
    });
  },

  async ensureAuthenticated() {
    const token = ApiClient.getToken();
    const currentUserId = localStorage.getItem(StorageService.CURRENT_USER_KEY);
    const currentUsername = localStorage.getItem(StorageService.CURRENT_USERNAME_KEY);

    if (token && currentUserId) {
      StorageService.currentUserId = currentUserId;
      if (currentUsername) {
        StorageService.currentUsername = currentUsername;
      }
      return true;
    }

    this.showAuthModal('login');
    return false;
  },

  async handleLogin() {
    const username = document.getElementById('login-username')?.value.trim();
    const password = document.getElementById('login-password')?.value;
    const errorEl = document.getElementById('login-error');

    this.clearAuthErrors();

    if (!username || !password) {
      errorEl.textContent = 'Please enter your username and password';
      return;
    }

    try {
      const result = await ApiClient.loginUser(username, password);
      this.onAuthSuccess(result.user);
    } catch (error) {
      if (error.status === 428) {
        // Legacy user needs to set a password
        document.getElementById('setup-username').value = username;
        this.toggleAuthTab('setup');
        return;
      }
      errorEl.textContent = error.message || 'Login failed';
    }
  },

  async handleRegister() {
    const username = document.getElementById('register-username')?.value.trim();
    const password = document.getElementById('register-password')?.value;
    const confirm = document.getElementById('register-password-confirm')?.value;
    const errorEl = document.getElementById('register-error');

    this.clearAuthErrors();

    if (!username || !password || !confirm) {
      errorEl.textContent = 'Please fill in all fields';
      return;
    }

    if (password !== confirm) {
      errorEl.textContent = 'Passwords do not match';
      return;
    }

    if (password.length < 6) {
      errorEl.textContent = 'Password must be at least 6 characters';
      return;
    }

    try {
      const result = await ApiClient.registerUser(username, password);
      this.onAuthSuccess(result.user);
    } catch (error) {
      errorEl.textContent = error.message || 'Registration failed';
    }
  },

  async handlePasswordSetup() {
    const username = document.getElementById('setup-username')?.value.trim();
    const password = document.getElementById('setup-password')?.value;
    const confirm = document.getElementById('setup-password-confirm')?.value;
    const errorEl = document.getElementById('setup-error');

    this.clearAuthErrors();

    if (!username || !password || !confirm) {
      errorEl.textContent = 'Please fill in all fields';
      return;
    }

    if (password !== confirm) {
      errorEl.textContent = 'Passwords do not match';
      return;
    }

    if (password.length < 6) {
      errorEl.textContent = 'Password must be at least 6 characters';
      return;
    }

    try {
      const result = await ApiClient.setupPassword(username, password);
      this.onAuthSuccess(result.user);
    } catch (error) {
      errorEl.textContent = error.message || 'Could not set password';
    }
  },

  onAuthSuccess(user) {
    StorageService.setCurrentUser(user.userId, user.username);
    this.updateUserDisplay();
      this.closeAuthModal();

    if (this.hasBootstrapped) {
      Utils.showToast('Signed in', 'success');
      return;
    }

    this.bootstrap();
  },

  logout(reload = true) {
    ApiClient.logout();
    StorageService.setCurrentUser(null);
    StorageService.clearCache();
    this.endSession();
    this.hasBootstrapped = false;
    this.showAuthModal('login');

    if (reload) {
      window.location.reload();
    }
  },

  // --- Account menu ---
  setupAccountSection() {
    const switchAccountBtn = document.getElementById('switch-account-btn');
    const logoutBtn = document.getElementById('logout-btn');

    switchAccountBtn?.addEventListener('click', () => this.logout());
    logoutBtn?.addEventListener('click', () => this.logout());
  },

  // --- Navigation ---
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

  // --- Settings ---
  async setupSettings() {
    const themeToggle = document.getElementById('theme-toggle');
    const speechRateSlider = document.getElementById('speech-rate');
    const speechRateValue = document.getElementById('speech-rate-value');
    const autoPlayToggle = document.getElementById('auto-play');
    const reverseModeToggle = document.getElementById('reverse-mode');
    const frontTranslationToggle = document.getElementById('front-translation-toggle');
    const exportBtn = document.getElementById('export-btn');
    const resetBtn = document.getElementById('reset-btn');
    const certificationKeyInput = document.getElementById('certification-key');
    const saveCertKeyBtn = document.getElementById('save-cert-key');

    // Language checkboxes
    const langHy = document.getElementById('lang-hy');
    const langFa = document.getElementById('lang-fa');
    const langEn = document.getElementById('lang-en');

    // Load saved language preferences
    const savedLanguages = await StorageService.getPreference('translationLanguages') || ['Hy'];
    langHy.checked = savedLanguages.includes('Hy');
    langFa.checked = savedLanguages.includes('Fa');
    langEn.checked = savedLanguages.includes('En');

    // Language preference change handlers
    const updateLanguagePreferences = async () => {
      const enabledLanguages = [];
      if (langHy.checked) enabledLanguages.push('Hy');
      if (langFa.checked) enabledLanguages.push('Fa');
      if (langEn.checked) enabledLanguages.push('En');

      await StorageService.updatePreference('translationLanguages', enabledLanguages);

      // Refresh flashcard display
      if (typeof FlashcardMode !== 'undefined' && FlashcardMode.renderCard) {
        FlashcardMode.renderCard();
      }
    };

    langFa.addEventListener('change', updateLanguagePreferences);
    langEn.addEventListener('change', updateLanguagePreferences);

    // Reverse mode toggle
    reverseModeToggle.addEventListener('change', async (e) => {
      await StorageService.updatePreference('reverseMode', e.target.checked);
      // Enable/disable translation toggle based on reverse mode
      if (frontTranslationToggle) {
        frontTranslationToggle.disabled = !e.target.checked;
      }
      if (typeof FlashcardMode !== 'undefined' && FlashcardMode.renderCard) {
        FlashcardMode.renderCard();
      }
    });

    // Load saved reverse mode preference
    const savedReverseMode = await StorageService.getPreference('reverseMode');
    reverseModeToggle.checked = savedReverseMode;
    if (frontTranslationToggle) {
      frontTranslationToggle.disabled = !savedReverseMode;
    }

    // Front translation toggle
    if (frontTranslationToggle) {
      const savedFrontTranslation = await StorageService.getPreference('showFrontTranslation');
      frontTranslationToggle.checked = savedFrontTranslation !== false; // default true

      frontTranslationToggle.addEventListener('change', async (e) => {
        await StorageService.updatePreference('showFrontTranslation', e.target.checked);
        if (typeof FlashcardMode !== 'undefined' && FlashcardMode.renderCard) {
          FlashcardMode.renderCard();
        }
      });
    }

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
    autoPlayToggle.addEventListener('change', async (e) => {
      await StorageService.updatePreference('autoPlay', e.target.checked);
    });

    // Load saved auto-play preference
    const savedAutoPlay = await StorageService.getPreference('autoPlay');
    autoPlayToggle.checked = savedAutoPlay;

    // Certification Key
    const savedCertKey = await StorageService.getPreference('certificationKey');
    if (savedCertKey) {
      certificationKeyInput.value = savedCertKey;
    }

    saveCertKeyBtn.addEventListener('click', async () => {
      const certKey = certificationKeyInput.value.trim();
      if (!certKey) {
        Utils.showToast('Please enter a certification key', 'error');
        return;
      }
      await StorageService.updatePreference('certificationKey', certKey);
      Utils.showToast('Certification Key saved! The app is now authorized.', 'success');
    });

    // Export button
    exportBtn.addEventListener('click', async () => {
      await StorageService.exportData();
      Utils.showToast('Progress exported!', 'success');
    });

    // Reset button
    resetBtn.addEventListener('click', async () => {
      const confirmed = await StorageService.reset();
      if (confirmed) {
        window.location.reload();
      }
    });
  },

  // --- Theme ---
  async setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    await StorageService.updatePreference('theme', theme);

    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.checked = theme === 'dark';
  },

  async applyTheme() {
    const savedTheme = await StorageService.getPreference('theme') || 'light';
    await this.setTheme(savedTheme);
  },

  // --- Sessions ---
  startSession() {
    this.sessionStartTime = Date.now();

    // Update session every 30 seconds
    this.sessionTimer = setInterval(() => {
      this.updateSession();
    }, 30000);

    window.addEventListener('beforeunload', () => {
      this.endSession();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.updateSession();
      }
    });
  },

  async updateSession() {
    if (!this.sessionStartTime) return;

    const duration = Math.floor((Date.now() - this.sessionStartTime) / 1000);

    if (duration >= 10) {
      const stats = await DataService.getStatistics();

      await StorageService.addSession({
        duration: duration,
        wordsStudied: stats.total,
        wordsLearned: 0,
        quizzesTaken: 0,
        quizScore: 0
      });

      await StorageService.updateStreak();

      this.sessionStartTime = Date.now();
    }
  },

  endSession() {
    if (this.sessionTimer) {
      clearInterval(this.sessionTimer);
    }

    this.updateSession();
  },

  // --- User display ---
  async updateUserDisplay() {
    const user = await StorageService.getCurrentUser();
    const settingsName = document.getElementById('settings-user-name');

    if (user) {
      if (settingsName) {
        settingsName.textContent = user.name;
      }
    } else if (settingsName) {
      settingsName.textContent = 'Not signed in';
    }
  },

  // --- Loading helpers ---
  showLoading() {
    document.getElementById('loading').classList.remove('hidden');
  },

  hideLoading() {
    document.getElementById('loading').classList.add('hidden');
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
