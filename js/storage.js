// LocalStorage Wrapper for Progress Tracking

const StorageService = {
  STORAGE_KEY_PREFIX: 'vocabProgress_',
  USERS_KEY: 'vocabUsers',
  CURRENT_USER_KEY: 'vocabCurrentUser',
  currentUserId: null,

  // Initialize user system
  initUserSystem() {
    const currentUser = localStorage.getItem(this.CURRENT_USER_KEY);
    if (currentUser) {
      this.currentUserId = currentUser;
    }
    return this.currentUserId;
  },

  // Get all users
  getAllUsers() {
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

  // Add new user
  addUser(userName) {
    const users = this.getAllUsers();
    const userId = 'user_' + Date.now();
    users.push({
      id: userId,
      name: userName,
      createdAt: new Date().toISOString()
    });
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
    return userId;
  },

  // Set current user
  setCurrentUser(userId) {
    this.currentUserId = userId;
    localStorage.setItem(this.CURRENT_USER_KEY, userId);
  },

  // Get current user
  getCurrentUser() {
    const users = this.getAllUsers();
    return users.find(u => u.id === this.currentUserId);
  },

  // Delete user
  deleteUser(userId) {
    // Remove user from users list
    const users = this.getAllUsers();
    const filteredUsers = users.filter(u => u.id !== userId);
    localStorage.setItem(this.USERS_KEY, JSON.stringify(filteredUsers));

    // Remove user's data
    localStorage.removeItem(this.STORAGE_KEY_PREFIX + userId);

    // If deleting current user, clear current user
    if (this.currentUserId === userId) {
      this.currentUserId = null;
      localStorage.removeItem(this.CURRENT_USER_KEY);
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
        translationLanguages: ['Hy'], // Default: Armenian only
        reverseMode: false // Default: show word first
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
  get() {
    try {
      const data = localStorage.getItem(this.getUserStorageKey());
      if (!data) {
        return this.getDefault();
      }
      const parsed = JSON.parse(data);
      // Merge with default to ensure all properties exist
      return { ...this.getDefault(), ...parsed };
    } catch (error) {
      console.error('Error reading storage:', error);
      return this.getDefault();
    }
  },

  // Save all data
  save(data) {
    try {
      localStorage.setItem(this.getUserStorageKey(), JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Error saving storage:', error);
      return false;
    }
  },

  // Mark word as learned
  markLearned(wordId) {
    const data = this.get();
    if (!data.learned.includes(wordId)) {
      data.learned.push(wordId);
      data.stats.totalWordsLearned = data.learned.length;
      this.save(data);
      return true;
    }
    return false;
  },

  // Unmark word as learned
  unmarkLearned(wordId) {
    const data = this.get();
    const index = data.learned.indexOf(wordId);
    if (index > -1) {
      data.learned.splice(index, 1);
      data.stats.totalWordsLearned = data.learned.length;
      this.save(data);
      return true;
    }
    return false;
  },

  // Check if word is learned
  isLearned(wordId) {
    const data = this.get();
    return data.learned.includes(wordId);
  },

  // Get learned word IDs
  getLearnedIds() {
    const data = this.get();
    return data.learned;
  },

  // Get learned count
  getLearnedCount() {
    const data = this.get();
    return data.learned.length;
  },

  // Update quiz score for a word
  updateQuizScore(wordId, correct) {
    const data = this.get();
    if (!data.quizScores[wordId]) {
      data.quizScores[wordId] = { correct: 0, attempts: 0 };
    }
    data.quizScores[wordId].attempts++;
    if (correct) {
      data.quizScores[wordId].correct++;
    }
    this.save(data);
  },

  // Get quiz score for a word
  getQuizScore(wordId) {
    const data = this.get();
    return data.quizScores[wordId] || { correct: 0, attempts: 0 };
  },

  // Add session
  addSession(sessionData) {
    const data = this.get();
    const session = {
      date: Utils.getCurrentDate(),
      duration: sessionData.duration || 0,
      wordsStudied: sessionData.wordsStudied || 0,
      wordsLearned: sessionData.wordsLearned || 0,
      quizzesTaken: sessionData.quizzesTaken || 0,
      quizScore: sessionData.quizScore || 0
    };
    data.sessions.unshift(session);

    // Keep only last 30 sessions
    if (data.sessions.length > 30) {
      data.sessions = data.sessions.slice(0, 30);
    }

    // Update stats
    data.stats.totalTimeSpent += session.duration;
    if (sessionData.quizzesTaken) {
      data.stats.totalQuizzesTaken += sessionData.quizzesTaken;
    }

    this.save(data);
  },

  // Get recent sessions
  getRecentSessions(count = 5) {
    const data = this.get();
    return data.sessions.slice(0, count);
  },

  // Update streak
  updateStreak() {
    const data = this.get();
    const today = Utils.getCurrentDate();

    if (data.stats.lastStudyDate === today) {
      // Already studied today, don't update
      return data.stats.currentStreak;
    }

    const canContinueStreak = Utils.calculateStreak(data.stats.lastStudyDate);

    if (canContinueStreak) {
      // Continue or start streak
      data.stats.currentStreak++;
    } else {
      // Reset streak
      data.stats.currentStreak = 1;
    }

    // Update longest streak
    if (data.stats.currentStreak > data.stats.longestStreak) {
      data.stats.longestStreak = data.stats.currentStreak;
    }

    data.stats.lastStudyDate = today;
    this.save(data);

    return data.stats.currentStreak;
  },

  // Get current streak
  getStreak() {
    const data = this.get();

    // Check if streak is still valid
    const today = Utils.getCurrentDate();
    if (data.stats.lastStudyDate === today) {
      return data.stats.currentStreak;
    }

    const canContinueStreak = Utils.calculateStreak(data.stats.lastStudyDate);
    if (!canContinueStreak && data.stats.currentStreak > 0) {
      // Streak is broken, reset it
      data.stats.currentStreak = 0;
      this.save(data);
    }

    return data.stats.currentStreak;
  },

  // Get stats
  getStats() {
    const data = this.get();
    return data.stats;
  },

  // Update preference
  updatePreference(key, value) {
    const data = this.get();
    data.preferences[key] = value;
    this.save(data);
  },

  // Get preference
  getPreference(key) {
    const data = this.get();
    return data.preferences[key];
  },

  // Get all preferences
  getPreferences() {
    const data = this.get();
    return data.preferences;
  },

  // Get words learned this week
  getWordsLearnedThisWeek() {
    const data = this.get();
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
  getAverageQuizScore() {
    const data = this.get();
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
  exportData() {
    const data = this.get();
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
  reset() {
    if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
      localStorage.removeItem(this.STORAGE_KEY);
      return true;
    }
    return false;
  },

  // Clear old sessions (keep last 30 days)
  clearOldSessions() {
    const data = this.get();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    data.sessions = data.sessions.filter(session => {
      const sessionDate = new Date(session.date);
      return sessionDate >= thirtyDaysAgo;
    });

    this.save(data);
  }
};
