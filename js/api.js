/**
 * API Client for Vocab Master Backend
 * Handles all HTTP communication with the MongoDB backend
 */

const ApiClient = {
  baseURL: null,

  /**
   * Initialize API client
   */
  init() {
    this.baseURL = window.AppConfig.API_BASE_URL || window.AppConfig.TTS_BASE_URL;
    console.log('API Client initialized with base URL:', this.baseURL);
  },

  /**
   * Get certificate from storage
   */
  getCertificate() {
    try {
      // Try to get from current user's preferences
      const currentUserId = localStorage.getItem('vocabCurrentUser');
      if (currentUserId) {
        const progressKey = `vocabProgress_${currentUserId}`;
        const progress = JSON.parse(localStorage.getItem(progressKey) || '{}');
        if (progress.preferences && progress.preferences.certificationKey) {
          return progress.preferences.certificationKey;
        }
      }

      // Fallback: try to get from any user
      const users = JSON.parse(localStorage.getItem('vocabUsers') || '[]');
      for (const user of users) {
        const progressKey = `vocabProgress_${user.id}`;
        const progress = JSON.parse(localStorage.getItem(progressKey) || '{}');
        if (progress.preferences && progress.preferences.certificationKey) {
          return progress.preferences.certificationKey;
        }
      }

      return null;
    } catch (error) {
      console.warn('Could not retrieve certificate:', error);
      return null;
    }
  },

  /**
   * Make HTTP request
   */
  async request(method, endpoint, data = null, options = {}) {
    const url = this.baseURL + endpoint;

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    // Add certificate for authenticated requests
    if (options.requiresCert !== false) {
      const cert = this.getCertificate();
      if (cert) {
        headers['x-cert-key'] = cert;
      }
    }

    const config = {
      method,
      headers,
      ...(data && { body: JSON.stringify(data) })
    };

    try {
      const response = await fetch(url, config);

      // Handle non-JSON responses (like audio)
      if (options.responseType === 'blob') {
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`API Error (${response.status}): ${text}`);
        }
        return await response.blob();
      }

      // Parse JSON response
      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || responseData.error || `API Error (${response.status})`);
      }

      return responseData;

    } catch (error) {
      console.error(`API Request failed [${method} ${endpoint}]:`, error);
      throw error;
    }
  },

  /**
   * HTTP Methods
   */
  get(endpoint, options = {}) {
    return this.request('GET', endpoint, null, options);
  },

  post(endpoint, data, options = {}) {
    return this.request('POST', endpoint, data, options);
  },

  put(endpoint, data, options = {}) {
    return this.request('PUT', endpoint, data, options);
  },

  patch(endpoint, data, options = {}) {
    return this.request('PATCH', endpoint, data, options);
  },

  delete(endpoint, options = {}) {
    return this.request('DELETE', endpoint, null, options);
  },

  /**
   * User Management APIs
   */
  async registerUser(username) {
    return this.post('/api/auth/register', { username }, { requiresCert: false });
  },

  async loginUser(username) {
    return this.post('/api/auth/login', { username }, { requiresCert: false });
  },

  async getAllUsers() {
    return this.get('/api/users', { requiresCert: false });
  },

  async getUser(userId) {
    return this.get(`/api/users/${userId}`);
  },

  async updateUser(userId, username) {
    return this.put(`/api/users/${userId}`, { username });
  },

  async deleteUser(userId) {
    return this.delete(`/api/users/${userId}`);
  },

  /**
   * Progress APIs
   */
  async getProgress(userId) {
    return this.get(`/api/users/${userId}/progress`);
  },

  async updateProgress(userId, progressData) {
    return this.put(`/api/users/${userId}/progress`, progressData);
  },

  async markLearned(userId, wordId, learned = true) {
    return this.patch(`/api/users/${userId}/learned`, { wordId, learned });
  },

  async getStats(userId) {
    return this.get(`/api/users/${userId}/stats`);
  },

  async updateStreak(userId, streakData) {
    return this.patch(`/api/users/${userId}/streak`, streakData);
  },

  /**
   * Quiz & Session APIs
   */
  async submitQuiz(userId, wordId, correct) {
    return this.post(`/api/users/${userId}/quiz`, { wordId, correct });
  },

  async addSession(userId, sessionData) {
    return this.post(`/api/users/${userId}/sessions`, sessionData);
  },

  async getSessions(userId, limit = 30) {
    return this.get(`/api/users/${userId}/sessions?limit=${limit}`);
  },

  /**
   * Preferences APIs
   */
  async getPreferences(userId) {
    return this.get(`/api/users/${userId}/preferences`);
  },

  async updatePreference(userId, key, value) {
    return this.patch(`/api/users/${userId}/preferences/${key}`, { value });
  },

  /**
   * Vocabulary APIs
   */
  async getAllVocabs() {
    return this.get('/api/vocabs', { requiresCert: false });
  },

  async getVocab(id) {
    return this.get(`/api/vocabs/${id}`, { requiresCert: false });
  },

  async searchVocabs(query) {
    return this.get(`/api/vocabs/search?q=${encodeURIComponent(query)}`, { requiresCert: false });
  },

  async getVocabMetadata() {
    return this.get('/api/vocabs/metadata', { requiresCert: false });
  },

  /**
   * Migration APIs
   */
  async importLocalStorageData(data) {
    return this.post('/api/migration/import', data, { requiresCert: false });
  },

  async exportUserData(userId) {
    return this.get(`/api/users/${userId}/export`);
  }
};

// Initialize on load
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ApiClient.init());
  } else {
    ApiClient.init();
  }
}
