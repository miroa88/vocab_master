// Main Application Controller

const App = {
  currentView: 'flashcard-view',
  sessionStartTime: null,
  sessionTimer: null,

  // Initialize application
  async init() {
    this.showLoading();

    try {
      // Initialize user system
      this.setupUserManagement();

      // Check if user is selected
      const currentUserId = StorageService.initUserSystem();
      if (!currentUserId) {
        this.hideLoading();
        this.showUserModal();
        return;
      }

      // Update user display
      this.updateUserDisplay();

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

      const user = StorageService.getCurrentUser();
      Utils.showToast(`Welcome back, ${user.name}!`, 'success');

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
    const reverseModeToggle = document.getElementById('reverse-mode');
    const exportBtn = document.getElementById('export-btn');
    const resetBtn = document.getElementById('reset-btn');

    // Language checkboxes
    const langHy = document.getElementById('lang-hy');
    const langFa = document.getElementById('lang-fa');
    const langEn = document.getElementById('lang-en');

    // Load saved language preferences
    const savedLanguages = StorageService.getPreference('translationLanguages') || ['Hy'];
    langHy.checked = savedLanguages.includes('Hy');
    langFa.checked = savedLanguages.includes('Fa');
    langEn.checked = savedLanguages.includes('En');

    // Language preference change handlers
    const updateLanguagePreferences = () => {
      const enabledLanguages = [];
      if (langHy.checked) enabledLanguages.push('Hy');
      if (langFa.checked) enabledLanguages.push('Fa');
      if (langEn.checked) enabledLanguages.push('En');

      StorageService.updatePreference('translationLanguages', enabledLanguages);

      // Refresh flashcard display
      if (typeof FlashcardMode !== 'undefined' && FlashcardMode.renderCard) {
        FlashcardMode.renderCard();
      }
    };

    langFa.addEventListener('change', updateLanguagePreferences);
    langEn.addEventListener('change', updateLanguagePreferences);

    // Reverse mode toggle
    reverseModeToggle.addEventListener('change', (e) => {
      StorageService.updatePreference('reverseMode', e.target.checked);
      // Refresh flashcard display
      if (typeof FlashcardMode !== 'undefined' && FlashcardMode.renderCard) {
        FlashcardMode.renderCard();
      }
    });

    // Load saved reverse mode preference
    const savedReverseMode = StorageService.getPreference('reverseMode');
    reverseModeToggle.checked = savedReverseMode;

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
  },

  // Setup user management
  setupUserManagement() {
    const userSwitcher = document.getElementById('user-switcher');
    const addUserBtn = document.getElementById('add-user-btn');
    const newUserInput = document.getElementById('new-user-name');

    // User switcher button
    userSwitcher.addEventListener('click', () => {
      this.showUserModal();
    });

    // Add user button
    addUserBtn.addEventListener('click', () => {
      this.createNewUser();
    });

    // Enter key to create user
    newUserInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.createNewUser();
      }
    });
  },

  // Show user modal
  showUserModal() {
    const modal = document.getElementById('user-modal');
    const userList = document.getElementById('user-list');

    // Get all users
    const users = StorageService.getAllUsers();
    const currentUserId = StorageService.currentUserId;

    // Clear and populate user list
    userList.innerHTML = '';

    if (users.length === 0) {
      userList.innerHTML = '<p class="empty-state">No users yet. Create one below!</p>';
    } else {
      users.forEach(user => {
        // Get user stats
        const oldUserId = StorageService.currentUserId;
        StorageService.currentUserId = user.id;
        const learnedCount = StorageService.getLearnedCount();
        StorageService.currentUserId = oldUserId;

        const userItem = document.createElement('div');
        userItem.className = 'user-item' + (user.id === currentUserId ? ' active' : '');
        userItem.innerHTML = `
          <div class="user-info">
            <div class="user-name">${this.escapeHtml(user.name)}</div>
            <div class="user-stats">${learnedCount} words learned</div>
          </div>
          <button class="user-delete" data-user-id="${user.id}" title="Delete user">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
          </button>
        `;

        // Select user
        userItem.addEventListener('click', (e) => {
          if (!e.target.closest('.user-delete')) {
            this.selectUser(user.id);
          }
        });

        // Delete user
        const deleteBtn = userItem.querySelector('.user-delete');
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.deleteUser(user.id);
        });

        userList.appendChild(userItem);
      });
    }

    modal.classList.add('show');
  },

  // Hide user modal
  hideUserModal() {
    const modal = document.getElementById('user-modal');
    modal.classList.remove('show');
  },

  // Create new user
  createNewUser() {
    const input = document.getElementById('new-user-name');
    const name = input.value.trim();

    if (!name) {
      Utils.showToast('Please enter a name', 'error');
      return;
    }

    const userId = StorageService.addUser(name);
    this.selectUser(userId);
    input.value = '';
  },

  // Select user
  selectUser(userId) {
    StorageService.setCurrentUser(userId);
    this.hideUserModal();

    // Reload the app with new user
    window.location.reload();
  },

  // Delete user
  deleteUser(userId) {
    const users = StorageService.getAllUsers();
    const user = users.find(u => u.id === userId);

    if (!user) return;

    if (confirm(`Are you sure you want to delete ${user.name}'s profile? This cannot be undone.`)) {
      StorageService.deleteUser(userId);

      // If we deleted the current user, show modal to select another
      if (StorageService.currentUserId === null) {
        this.showUserModal();
      } else {
        // Just refresh the modal
        this.showUserModal();
      }
    }
  },

  // Update user display
  updateUserDisplay() {
    const user = StorageService.getCurrentUser();
    if (user) {
      document.getElementById('current-user-name').textContent = user.name;
    }
  },

  // Escape HTML to prevent XSS
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
