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
    this.baseURL =
      window.AppConfig.API_BASE_URL || window.AppConfig.API_BASE_URL;
    console.log("API Client initialized with base URL:", this.baseURL);
  },

  /**
   * Get JWT token from localStorage
   */
  getToken() {
    try {
      return localStorage.getItem("authToken");
    } catch (error) {
      console.warn("Could not retrieve token:", error);
      return null;
    }
  },

  /**
   * Set JWT token in localStorage
   */
  setToken(token) {
    try {
      if (token) {
        localStorage.setItem("authToken", token);
      } else {
        localStorage.removeItem("authToken");
      }
    } catch (error) {
      console.error("Could not store token:", error);
    }
  },

  /**
   * Make HTTP request
   */
  async request(method, endpoint, data = null, options = {}) {
    const url = this.baseURL + endpoint;

    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    // Add JWT token for authenticated requests
    if (options.requiresAuth !== false) {
      const token = this.getToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    const config = {
      method,
      headers,
      ...(data && { body: JSON.stringify(data) }),
    };

    try {
      const response = await fetch(url, config);

      // Handle non-JSON responses (like audio)
      if (options.responseType === "blob") {
        if (!response.ok) {
          const text = await response.text();
          const error = new Error(`API Error (${response.status}): ${text}`);
          error.status = response.status;
          error.details = text;
          throw error;
        }
        return await response.blob();
      }

      // Parse JSON response
      const responseData = await response.json();

      if (!response.ok) {
        const error = new Error(
          responseData.message ||
            responseData.error ||
            `API Error (${response.status})`
        );
        error.status = response.status;
        error.details = responseData;
        throw error;
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
    return this.request("GET", endpoint, null, options);
  },

  post(endpoint, data, options = {}) {
    return this.request("POST", endpoint, data, options);
  },

  put(endpoint, data, options = {}) {
    return this.request("PUT", endpoint, data, options);
  },

  patch(endpoint, data, options = {}) {
    return this.request("PATCH", endpoint, data, options);
  },

  delete(endpoint, options = {}) {
    return this.request("DELETE", endpoint, null, options);
  },

  /**
   * User Management APIs
   */
  async registerUser(username, password) {
    const response = await this.post(
      "/api/vocab/auth/register",
      { username, password },
      { requiresAuth: false }
    );
    if (response.token) {
      this.setToken(response.token);
    }
    return response;
  },

  async loginUser(username, password) {
    const response = await this.post(
      "/api/vocab/auth/login",
      { username, password },
      { requiresAuth: false }
    );
    if (response.token) {
      this.setToken(response.token);
    }
    return response;
  },

  async setupPassword(username, password) {
    const response = await this.post(
      "/api/vocab/auth/setup-password",
      { username, password },
      { requiresAuth: false }
    );
    if (response.token) {
      this.setToken(response.token);
    }
    return response;
  },

  logout() {
    this.setToken(null);
  },

  async getAllUsers() {
    return this.get("/api/vocab/users", { requiresAuth: false });
  },

  async getUser(userId) {
    return this.get(`/api/vocab/users/${userId}`);
  },

  async updateUser(userId, username) {
    return this.put(`/api/vocab/users/${userId}`, { username });
  },

  async deleteUser(userId) {
    return this.delete(`/api/vocab/users/${userId}`);
  },

  /**
   * Progress APIs
   */
  async getProgress(userId) {
    return this.get(`/api/vocab/users/${userId}/progress`);
  },

  async updateProgress(userId, progressData) {
    return this.put(`/api/vocab/users/${userId}/progress`, progressData);
  },

  async markLearned(userId, wordId, learned = true) {
    return this.patch(`/api/vocab/users/${userId}/learned`, { wordId, learned });
  },

  async getStats(userId) {
    return this.get(`/api/vocab/users/${userId}/stats`);
  },

  async updateStreak(userId, streakData) {
    return this.patch(`/api/vocab/users/${userId}/streak`, streakData);
  },

  /**
   * Quiz & Session APIs
   */
  async submitQuiz(userId, wordId, correct) {
    return this.post(`/api/vocab/users/${userId}/quiz`, { wordId, correct });
  },

  async addSession(userId, sessionData) {
    return this.post(`/api/vocab/users/${userId}/sessions`, sessionData);
  },

  async getSessions(userId, limit = 30) {
    return this.get(`/api/vocab/users/${userId}/sessions?limit=${limit}`);
  },

  /**
   * Preferences APIs
   */
  async getPreferences(userId) {
    return this.get(`/api/vocab/users/${userId}/preferences`);
  },

  async updatePreference(userId, key, value) {
    return this.patch(`/api/vocab/users/${userId}/preferences/${key}`, { value });
  },

  /**
   * Vocabulary APIs
   */
  async getAllVocabs() {
    return this.get("/api/vocab/vocabs", { requiresAuth: false });
  },

  async getVocab(id) {
    return this.get(`/api/vocab/vocabs/${id}`, { requiresAuth: false });
  },

  async searchVocabs(query) {
    return this.get(`/api/vocab/vocabs/search?q=${encodeURIComponent(query)}`, {
      requiresAuth: false,
    });
  },

  async getVocabMetadata() {
    return this.get("/api/vocab/vocabs/metadata", { requiresAuth: false });
  },

  /**
   * Migration APIs
   */
  async importLocalStorageData(data) {
    return this.post("/api/vocab/migration/import", data, { requiresAuth: false });
  },

  async exportUserData(userId) {
    return this.get(`/api/vocab/users/${userId}/export`);
  },

  /**
   * Certification Key APIs
   */
  async validateCertificationKey(certificationKey) {
    return this.post("/api/vocab/certification/validate", { certificationKey }, { requiresAuth: false });
  },

  async activateCertificationKey(userId, certificationKey) {
    return this.post(`/api/vocab/users/${userId}/certification`, { certificationKey });
  },

  async getCertificationStatus(userId) {
    return this.get(`/api/vocab/users/${userId}/certification`);
  },

  async revokeCertificationKey(userId) {
    return this.delete(`/api/vocab/users/${userId}/certification`);
  },

  /**
   * Generate AI examples for a vocabulary word
   */
  async generateExamples(wordId) {
    return this.post(`/api/vocab/examples/generate`, { wordId });
  },

  /**
   * Translate text to target language
   */
  async translateText(text, targetLanguage, sourceLanguage = 'en') {
    return this.post('/api/vocab/translate', {
      text,
      targetLanguage,
      sourceLanguage
    });
  },
};

// Initialize on load
if (typeof window !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => ApiClient.init());
  } else {
    ApiClient.init();
  }
}
