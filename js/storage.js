// Storage Service with MongoDB API integration
// Maintains backward compatibility with localStorage as fallback

const StorageService = {
  STORAGE_KEY_PREFIX: 'vocabProgress_',
  USERS_KEY: 'vocabUsers',
  CURRENT_USER_KEY: 'vocabCurrentUser',
  CURRENT_USERNAME_KEY: 'vocabCurrentUsername',
  currentUserId: null,
  currentUsername: null,
  progressCache: null,
  useMongoDB: false,
  mongoDisabled: false,
  isPrivateMode: false,

  // Initialize storage service
  init() {
    this.useMongoDB = window.AppConfig?.USE_MONGODB ?? false;
    this.mongoDisabled = false;
    this.detectPrivateMode();
    console.log(`Storage initialized: ${this.useMongoDB ? 'MongoDB' : 'localStorage'} mode${this.isPrivateMode ? ' (Private browsing detected)' : ''}`);
  },

  // Detect private browsing mode (Safari, Firefox, etc.)
  detectPrivateMode() {
    try {
      // Try to use localStorage
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      this.isPrivateMode = false;
    } catch (e) {
      // localStorage is not available (private mode or disabled)
      this.isPrivateMode = true;
      console.warn('Private browsing mode detected - localStorage is restricted');
    }
  },

  // Disable MongoDB mode for current session after repeated failures
  disableMongoFallback(reason, error) {
    if (this.mongoDisabled) return;
    this.mongoDisabled = true;
    this.useMongoDB = false;
    console.warn(`MongoDB disabled for this session: ${reason}`, error);
  },

  // Initialize user system
  async initUserSystem() {
    // In private mode, skip localStorage reads
    if (this.isPrivateMode) {
      return this.currentUserId;
    }

    try {
      const currentUser = localStorage.getItem(this.CURRENT_USER_KEY);
      const storedUsername = localStorage.getItem(this.CURRENT_USERNAME_KEY);
      if (currentUser) {
        this.currentUserId = currentUser;
      }
      if (storedUsername) {
        this.currentUsername = storedUsername;
      }
    } catch (error) {
      console.warn('Failed to read user from localStorage:', error);
      this.isPrivateMode = true;
    }
    return this.currentUserId;
  },

  // Get all users
  async getAllUsers() {
    if (this.useMongoDB) {
      try {
        const users = await ApiClient.getAllUsers();
        // Convert to local format
        return users.map(u => ({
          id: u.userId,
          name: u.username,
          createdAt: u.createdAt
        }));
      } catch (error) {
        console.warn('MongoDB API failed:', error);
        // In MongoDB-only mode, return empty array on error
        // Don't fall back to localStorage - force MongoDB users only
        return [];
      }
    }
    return this._getAllUsersLocal();
  },

  _getAllUsersLocal() {
    try {
      const usersData = localStorage.getItem(this.USERS_KEY);
      if (!usersData) {
        return [];
      }
      return JSON.parse(usersData);
    } catch (error) {
      console.error('Error reading users:', error);
      return [];
    }
  },

  // Add new user (register with password)
  async addUser(userName, password) {
    if (!password) {
      throw new Error('Password is required to create an account');
    }

    if (this.useMongoDB) {
      try {
        const result = await ApiClient.registerUser(userName, password);
        const userId = result.user.userId;

        // Save userId to localStorage
        this.setCurrentUser(userId);

        return userId;
      } catch (error) {
        throw new Error(`Failed to register: ${error.message}`);
      }
    }
    throw new Error('MongoDB mode required for user registration');
  },

  _addUserLocal(userName, userId = null) {
    const users = this._getAllUsersLocal();
    const id = userId || 'user_' + Date.now();
    users.push({
      id: id,
      name: userName,
      createdAt: new Date().toISOString()
    });
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
    return id;
  },

  // Set current user
  setCurrentUser(userId, username = null) {
    if (!userId) {
      this.currentUserId = null;
      this.currentUsername = null;
      this.progressCache = null;

      // Only update localStorage if not in private mode
      if (!this.isPrivateMode) {
        try {
          localStorage.removeItem(this.CURRENT_USER_KEY);
          localStorage.removeItem(this.CURRENT_USERNAME_KEY);
        } catch (error) {
          console.warn('Failed to clear user from localStorage:', error);
        }
      }
      return;
    }

    this.currentUserId = userId;
    if (username) {
      this.currentUsername = username;
    }
    this.progressCache = null; // Clear cache when switching users

    // Only update localStorage if not in private mode
    if (!this.isPrivateMode) {
      try {
        localStorage.setItem(this.CURRENT_USER_KEY, userId);
        if (username) {
          localStorage.setItem(this.CURRENT_USERNAME_KEY, username);
        }
      } catch (error) {
        console.warn('Failed to save user to localStorage:', error);
        this.isPrivateMode = true;
      }
    }
  },

  // Get current user
  async getCurrentUser() {
    if (this.currentUserId && this.currentUsername) {
      return { id: this.currentUserId, name: this.currentUsername };
    }

    const users = await this.getAllUsers();
    const match = users.find(u => u.id === this.currentUserId);
    if (match) {
      this.currentUsername = match.name;
      localStorage.setItem(this.CURRENT_USERNAME_KEY, match.name);
    }
    return match;
  },

  // Delete user
  async deleteUser(userId) {
    if (this.useMongoDB) {
      try {
        await ApiClient.deleteUser(userId);
        // Also remove from localStorage
        this._deleteUserLocal(userId);
      } catch (error) {
        console.warn('MongoDB API failed, falling back to localStorage:', error);
        this._deleteUserLocal(userId);
      }
    } else {
      this._deleteUserLocal(userId);
    }
  },

  _deleteUserLocal(userId) {
    const users = this._getAllUsersLocal();
    const filteredUsers = users.filter(u => u.id !== userId);
    localStorage.setItem(this.USERS_KEY, JSON.stringify(filteredUsers));
    localStorage.removeItem(this.STORAGE_KEY_PREFIX + userId);

    if (this.currentUserId === userId) {
      this.currentUserId = null;
      localStorage.removeItem(this.CURRENT_USER_KEY);
      localStorage.removeItem(this.CURRENT_USERNAME_KEY);
    }
  },

  // Get storage key for current user
  getUserStorageKey() {
    if (!this.currentUserId) {
      throw new Error('No user selected');
    }
    return this.STORAGE_KEY_PREFIX + this.currentUserId;
  },

  // Get default structure
  getDefault() {
    return {
      learned: [],
      inProgress: [],
      quizScores: {},
      sessions: [],
      preferences: {
      speechRate: 0.9,
      theme: 'light',
      autoPlay: false,
      showProgress: true,
      translationLanguages: ['Hy'],
      reverseMode: false,
      showFrontTranslation: true,
      enableSwipe: true,
      certificationKey: null
    },
      stats: {
        totalTimeSpent: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastStudyDate: null,
        totalWordsLearned: 0,
        totalQuizzesTaken: 0
      }
    };
  },

  // Get all data
  async get() {
    console.log('[StorageService.get] Called');

    // Return cache if available
    if (this.progressCache) {
      console.log('[StorageService.get] Returning from cache');
      return this.progressCache;
    }

    console.log('[StorageService.get] Cache empty, fetching data...');
    console.log('[StorageService.get] MongoDB mode:', this.useMongoDB);

    if (this.useMongoDB) {
      try {
        console.log('[StorageService.get] Fetching from MongoDB API...');
        const progress = await ApiClient.getProgress(this.currentUserId);

        console.log('[StorageService.get] MongoDB response received');
        console.log('[StorageService.get] Progress data keys:', Object.keys(progress || {}));
        console.log('[StorageService.get] Preferences keys:', Object.keys(progress?.preferences || {}));

        // Debug log for certification key tracking
        if (progress?.preferences?.certificationKey) {
          console.log('[StorageService.get] ✓ Certification key loaded from MongoDB (length:', progress.preferences.certificationKey.length + ')');
        } else {
          console.log('[StorageService.get] ✗ No certification key in MongoDB response');
        }

        // Deep merge to preserve nested preferences
        this.progressCache = this._deepMerge(this.getDefault(), progress);

        console.log('[StorageService.get] After merge, certificationKey:', this.progressCache?.preferences?.certificationKey ? 'Present' : 'NULL');

        // Also save to localStorage as backup (skip in private mode)
        this._saveLocal(this.progressCache);

        return this.progressCache;
      } catch (error) {
        this.disableMongoFallback('Progress fetch failed', error);
        // If user not found in MongoDB, return defaults (new user)
        if (error.message && error.message.includes('User not found')) {
          console.log('User not found in MongoDB - returning defaults for new user');
          this.progressCache = this.getDefault();
          return this.progressCache;
        }

        // For other errors (network issues), fall back to localStorage
        console.warn('MongoDB API failed, falling back to localStorage:', error);
        return this._getLocal();
      }
    }
    return this._getLocal();
  },

  _getLocal() {
    // In private mode, localStorage won't work - return defaults
    if (this.isPrivateMode) {
      console.log('Private mode: localStorage unavailable, returning defaults');
      return this.getDefault();
    }

    try {
      const data = localStorage.getItem(this.getUserStorageKey());
      if (!data) {
        return this.getDefault();
      }
      const parsed = JSON.parse(data);
      // Deep merge to preserve nested preferences
      this.progressCache = this._deepMerge(this.getDefault(), parsed);
      return this.progressCache;
    } catch (error) {
      console.error('Error reading storage:', error);
      // If reading fails, might be in private mode
      this.isPrivateMode = true;
      return this.getDefault();
    }
  },

  // Deep merge helper to properly merge nested objects like preferences
  _deepMerge(target, source) {
    const result = { ...target };
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this._deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  },

  // Save all data
  async save(data) {
    this.progressCache = data;

    if (this.useMongoDB) {
      try {
        await ApiClient.updateProgress(this.currentUserId, data);
        // Also save to localStorage as backup
        this._saveLocal(data);
        return true;
      } catch (error) {
        console.warn('MongoDB API failed, falling back to localStorage:', error);
        this.disableMongoFallback('Saving progress failed', error);
        return this._saveLocal(data);
      }
    }
    return this._saveLocal(data);
  },

  _saveLocal(data) {
    // In private mode, skip localStorage saves (they will fail anyway)
    if (this.isPrivateMode) {
      console.log('Private mode: skipping localStorage save, relying on cache');
      return true; // Return true since cache is already updated
    }

    try {
      localStorage.setItem(this.getUserStorageKey(), JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      // If this fails, we might be in private mode
      this.isPrivateMode = true;
      return false;
    }
  },

  // Mark word as learned
  async markLearned(wordId) {
    const data = await this.get();
    if (!data.learned.includes(wordId)) {
      if (this.useMongoDB) {
        try {
          await ApiClient.markLearned(this.currentUserId, wordId, true);
          // Update cache
          data.learned.push(wordId);
          data.stats.totalWordsLearned = data.learned.length;
          this.progressCache = data;
          this._saveLocal(data);
          return true;
        } catch (error) {
          console.warn('MongoDB API failed:', error);
          this.disableMongoFallback('Mark learned failed', error);
        }
      }

      // Fallback or non-MongoDB mode
      data.learned.push(wordId);
      data.stats.totalWordsLearned = data.learned.length;
      await this.save(data);
      return true;
    }
    return false;
  },

  // Unmark word as learned
  async unmarkLearned(wordId) {
    const data = await this.get();
    const index = data.learned.indexOf(wordId);
    if (index > -1) {
      if (this.useMongoDB) {
        try {
          await ApiClient.markLearned(this.currentUserId, wordId, false);
          // Update cache
          data.learned.splice(index, 1);
          data.stats.totalWordsLearned = data.learned.length;
          this.progressCache = data;
          this._saveLocal(data);
          return true;
        } catch (error) {
          console.warn('MongoDB API failed:', error);
          this.disableMongoFallback('Unmark learned failed', error);
        }
      }

      // Fallback or non-MongoDB mode
      data.learned.splice(index, 1);
      data.stats.totalWordsLearned = data.learned.length;
      await this.save(data);
      return true;
    }
    return false;
  },

  // Check if word is learned
  async isLearned(wordId) {
    const data = await this.get();
    return data.learned.includes(wordId);
  },

  // Get learned word IDs
  async getLearnedIds() {
    const data = await this.get();
    return data.learned;
  },

  // Get learned count
  async getLearnedCount() {
    const data = await this.get();
    return data.learned.length;
  },

  // Update quiz score for a word
  async updateQuizScore(wordId, correct) {
    if (this.useMongoDB) {
      try {
        await ApiClient.submitQuiz(this.currentUserId, wordId, correct);
        // Update cache
        const data = await this.get();
        if (!data.quizScores[wordId]) {
          data.quizScores[wordId] = { correct: 0, attempts: 0 };
        }
        data.quizScores[wordId].attempts++;
        if (correct) {
          data.quizScores[wordId].correct++;
        }
        this.progressCache = data;
        this._saveLocal(data);
        return;
      } catch (error) {
        console.warn('MongoDB API failed:', error);
        this.disableMongoFallback('Submit quiz failed', error);
      }
    }

    // Fallback or non-MongoDB mode
    const data = await this.get();
    if (!data.quizScores[wordId]) {
      data.quizScores[wordId] = { correct: 0, attempts: 0 };
    }
    data.quizScores[wordId].attempts++;
    if (correct) {
      data.quizScores[wordId].correct++;
    }
    await this.save(data);
  },

  // Get quiz score for a word
  async getQuizScore(wordId) {
    const data = await this.get();
    return data.quizScores[wordId] || { correct: 0, attempts: 0 };
  },

  // Add session
  async addSession(sessionData) {
    const session = {
      date: Utils.getCurrentDate(),
      duration: sessionData.duration || 0,
      wordsStudied: sessionData.wordsStudied || 0,
      wordsLearned: sessionData.wordsLearned || 0,
      quizzesTaken: sessionData.quizzesTaken || 0,
      quizScore: sessionData.quizScore || 0
    };

    if (this.useMongoDB) {
      try {
        await ApiClient.addSession(this.currentUserId, session);
        // Update cache
        const data = await this.get();
        data.sessions.unshift(session);
        if (data.sessions.length > 30) {
          data.sessions = data.sessions.slice(0, 30);
        }
        data.stats.totalTimeSpent += session.duration;
        if (sessionData.quizzesTaken) {
          data.stats.totalQuizzesTaken += sessionData.quizzesTaken;
        }
        this.progressCache = data;
        this._saveLocal(data);
        return;
      } catch (error) {
        console.warn('MongoDB API failed:', error);
        this.disableMongoFallback('Add session failed', error);
      }
    }

    // Fallback or non-MongoDB mode
    const data = await this.get();
    data.sessions.unshift(session);
    if (data.sessions.length > 30) {
      data.sessions = data.sessions.slice(0, 30);
    }
    data.stats.totalTimeSpent += session.duration;
    if (sessionData.quizzesTaken) {
      data.stats.totalQuizzesTaken += sessionData.quizzesTaken;
    }
    await this.save(data);
  },

  // Get recent sessions
  async getRecentSessions(count = 5) {
    const data = await this.get();
    return data.sessions.slice(0, count);
  },

  // Update streak
  async updateStreak() {
    const data = await this.get();
    const today = Utils.getCurrentDate();

    if (data.stats.lastStudyDate === today) {
      return data.stats.currentStreak;
    }

    const canContinueStreak = Utils.calculateStreak(data.stats.lastStudyDate);

    if (canContinueStreak) {
      data.stats.currentStreak++;
    } else {
      data.stats.currentStreak = 1;
    }

    if (data.stats.currentStreak > data.stats.longestStreak) {
      data.stats.longestStreak = data.stats.currentStreak;
    }

    data.stats.lastStudyDate = today;

    if (this.useMongoDB) {
      try {
        await ApiClient.updateStreak(this.currentUserId, {
          currentStreak: data.stats.currentStreak,
          longestStreak: data.stats.longestStreak,
          lastStudyDate: today
        });
        this.progressCache = data;
        this._saveLocal(data);
        return data.stats.currentStreak;
      } catch (error) {
        console.warn('MongoDB API failed:', error);
        this.disableMongoFallback('Update streak failed', error);
      }
    }

    await this.save(data);
    return data.stats.currentStreak;
  },

  // Get current streak
  async getStreak() {
    const data = await this.get();
    const today = Utils.getCurrentDate();

    if (data.stats.lastStudyDate === today) {
      return data.stats.currentStreak;
    }

    const canContinueStreak = Utils.calculateStreak(data.stats.lastStudyDate);
    if (!canContinueStreak && data.stats.currentStreak > 0) {
      data.stats.currentStreak = 0;
      await this.save(data);
    }

    return data.stats.currentStreak;
  },

  // Get stats
  async getStats() {
    const data = await this.get();
    return data.stats;
  },

  // Update preference
  async updatePreference(key, value) {
    const data = await this.get();
    data.preferences[key] = value;

    // Debug log for certification key saves
    if (key === 'certificationKey') {
      console.log('Saving certification key:', value ? 'Present' : 'Null');
    }

    if (this.useMongoDB) {
      try {
        await ApiClient.updatePreference(this.currentUserId, key, value);
        this.progressCache = data;
        this._saveLocal(data);
        console.log(`Preference '${key}' saved to MongoDB successfully`);
        return;
      } catch (error) {
        console.warn('MongoDB API failed:', error);
        this.disableMongoFallback('Update preference failed', error);
      }
    }

    await this.save(data);
  },

  // Get preference
  async getPreference(key) {
    console.log(`[StorageService] Getting preference: ${key}`);
    console.log(`[StorageService] Cache exists: ${!!this.progressCache}`);
    console.log(`[StorageService] MongoDB mode: ${this.useMongoDB}, Private mode: ${this.isPrivateMode}`);

    const data = await this.get();
    const value = data.preferences[key];

    console.log(`[StorageService] Preference '${key}' from cache:`, value ? (key === 'certificationKey' ? 'Present (length: ' + value.length + ')' : value) : 'NULL/Empty');

    // Special handling for certificationKey - check localStorage as fallback
    // This ensures the key is never lost even if MongoDB sync has issues
    // Skip in private mode since localStorage is not available
    if (key === 'certificationKey' && !value && this.useMongoDB && !this.isPrivateMode) {
      console.log('[StorageService] Certification key not in cache, checking localStorage backup...');
      try {
        const localData = localStorage.getItem(this.getUserStorageKey());
        if (localData) {
          const parsed = JSON.parse(localData);
          const localCertKey = parsed?.preferences?.certificationKey;
          if (localCertKey) {
            console.log('[StorageService] Certification key recovered from localStorage backup');
            // Update cache with recovered key
            data.preferences.certificationKey = localCertKey;
            this.progressCache = data;
            return localCertKey;
          } else {
            console.log('[StorageService] No certification key in localStorage backup either');
          }
        } else {
          console.log('[StorageService] No localStorage data found');
        }
      } catch (error) {
        console.warn('[StorageService] Failed to check localStorage for certification key:', error);
      }
    }

    return value;
  },

  // Get all preferences
  async getPreferences() {
    const data = await this.get();
    return data.preferences;
  },

  // Activate certification key
  async activateCertificationKey(certificationKey) {
    if (!certificationKey || !certificationKey.trim()) {
      throw new Error('Certification key cannot be empty');
    }

    // In localStorage mode, just save the key without validation
    if (!this.useMongoDB) {
      const data = await this.get();
      data.preferences.certificationKey = certificationKey.trim();
      data.preferences.certificationActivatedAt = new Date().toISOString();
      await this.save(data);
      return { success: true, message: 'Certification key saved locally' };
    }

    // In MongoDB mode, validate with backend
    try {
      // Call API to validate and activate the key
      const result = await ApiClient.activateCertificationKey(this.currentUserId, certificationKey.trim());

      // Update local cache with the certification key
      const data = await this.get();
      data.preferences.certificationKey = certificationKey.trim();
      data.preferences.certificationActivatedAt = new Date().toISOString();
      this.progressCache = data;
      this._saveLocal(data);

      return result;
    } catch (error) {
      if (error.status === 409) {
        throw new Error('This certification key is already in use by another user');
      } else if (error.status === 400) {
        throw new Error('Invalid certification key');
      } else if (error.status === 404) {
        throw new Error('Certification key not found');
      }
      throw new Error(`Failed to activate certification key: ${error.message}`);
    }
  },

  // Get certification status (MongoDB only)
  async getCertificationStatus() {
    if (!this.useMongoDB) {
      // In local mode, just check if key exists in preferences
      const data = await this.get();
      return {
        isActivated: !!data.preferences.certificationKey,
        certificationKey: data.preferences.certificationKey || null,
        activatedAt: data.preferences.certificationActivatedAt || null
      };
    }

    try {
      const status = await ApiClient.getCertificationStatus(this.currentUserId);
      return status;
    } catch (error) {
      console.warn('Failed to get certification status:', error);
      return {
        isActivated: false,
        certificationKey: null,
        activatedAt: null
      };
    }
  },

  // Revoke certification key (MongoDB only)
  async revokeCertificationKey() {
    if (!this.useMongoDB) {
      // In local mode, just remove from preferences
      const data = await this.get();
      data.preferences.certificationKey = null;
      data.preferences.certificationActivatedAt = null;
      await this.save(data);
      return true;
    }

    try {
      await ApiClient.revokeCertificationKey(this.currentUserId);

      // Update local cache
      const data = await this.get();
      data.preferences.certificationKey = null;
      data.preferences.certificationActivatedAt = null;
      this.progressCache = data;
      this._saveLocal(data);

      return true;
    } catch (error) {
      throw new Error(`Failed to revoke certification key: ${error.message}`);
    }
  },

  // Get words learned this week
  async getWordsLearnedThisWeek() {
    const data = await this.get();
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    let count = 0;
    data.sessions.forEach(session => {
      const sessionDate = new Date(session.date);
      if (sessionDate >= weekAgo) {
        count += session.wordsLearned || 0;
      }
    });

    return count;
  },

  // Get average quiz score
  async getAverageQuizScore() {
    const data = await this.get();
    const scores = Object.values(data.quizScores);

    if (scores.length === 0) return 0;

    let totalCorrect = 0;
    let totalAttempts = 0;

    scores.forEach(score => {
      totalCorrect += score.correct;
      totalAttempts += score.attempts;
    });

    if (totalAttempts === 0) return 0;
    return Math.round((totalCorrect / totalAttempts) * 100);
  },

  // Export data as JSON
  async exportData() {
    if (this.useMongoDB) {
      try {
        const exportData = await ApiClient.exportUserData(this.currentUserId);
        const json = JSON.stringify(exportData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vocab-progress-${Utils.getCurrentDate()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      } catch (error) {
        console.warn('MongoDB API failed, exporting local data:', error);
        this.disableMongoFallback('Export data failed', error);
      }
    }

    // Fallback or non-MongoDB mode
    const data = await this.get();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vocab-progress-${Utils.getCurrentDate()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // Reset all data
  async reset() {
    if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
      this.progressCache = null;
      localStorage.removeItem(this.getUserStorageKey());

      if (this.useMongoDB) {
        try {
          // Reset progress in MongoDB
          await ApiClient.updateProgress(this.currentUserId, this.getDefault());
        } catch (error) {
          console.warn('MongoDB API failed:', error);
        }
      }

      return true;
    }
    return false;
  },

  // Clear old sessions (keep last 30 days)
  async clearOldSessions() {
    const data = await this.get();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    data.sessions = data.sessions.filter(session => {
      const sessionDate = new Date(session.date);
      return sessionDate >= thirtyDaysAgo;
    });

    await this.save(data);
  },

  // Clear cache (useful after migration)
  clearCache() {
    this.progressCache = null;
  }
};

// Initialize on load
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => StorageService.init());
  } else {
    StorageService.init();
  }
}
