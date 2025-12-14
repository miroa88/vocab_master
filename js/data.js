// Data Management Module

const DataService = {
  vocabulary: [],
  metadata: {},
  loaded: false,
  useMongoDB: false,

  // Initialize data service
  init() {
    this.useMongoDB = window.AppConfig?.USE_MONGODB ?? false;
    console.log(`DataService initialized: ${this.useMongoDB ? 'MongoDB' : 'local JSON'} mode`);
  },

  // Load vocabulary from MongoDB API or JSON file
  async load() {
    if (this.useMongoDB) {
      try {
        console.log('Loading vocabulary from MongoDB API...');

        // Load vocabulary and metadata in parallel
        const [vocabs, metadata] = await Promise.all([
          ApiClient.getAllVocabs(),
          ApiClient.getVocabMetadata()
        ]);

        this.vocabulary = vocabs || [];
        this.metadata = metadata || {};
        this.loaded = true;

        console.log(`Loaded ${this.vocabulary.length} words from MongoDB`);
        return true;

      } catch (error) {
        console.warn('MongoDB API failed, falling back to local JSON:', error);
        return this._loadFromJSON();
      }
    }

    return this._loadFromJSON();
  },

  // Fallback: Load from local JSON file
  async _loadFromJSON() {
    try {
      console.log('Loading vocabulary from local vocab.json...');
      const response = await fetch('vocab.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      this.vocabulary = data.words || [];
      this.metadata = data.metadata || {};
      this.loaded = true;

      console.log(`Loaded ${this.vocabulary.length} words from local JSON`);
      return true;
    } catch (error) {
      console.error('Error loading vocabulary:', error);
      Utils.showToast('Failed to load vocabulary data', 'error');
      return false;
    }
  },

  // Get all words
  getAll() {
    return this.vocabulary;
  },

  // Get word by ID
  getById(id) {
    return this.vocabulary.find(word => word.id === id);
  },

  // Get word by index
  getByIndex(index) {
    return this.vocabulary[index];
  },

  // Get total word count
  getCount() {
    return this.vocabulary.length;
  },

  // Get metadata
  getMetadata() {
    return this.metadata;
  },

  // Get random words
  getRandomWords(count) {
    return Utils.getRandomItems(this.vocabulary, count);
  },

  // Get unlearned words
  async getUnlearnedWords() {
    const learnedIds = await StorageService.getLearnedIds();
    return this.vocabulary.filter(word => !learnedIds.includes(word.id));
  },

  // Get learned words
  async getLearnedWords() {
    const learnedIds = await StorageService.getLearnedIds();
    return this.vocabulary.filter(word => learnedIds.includes(word.id));
  },

  // Get words by difficulty
  getByDifficulty(difficulty) {
    return this.vocabulary.filter(word => word.difficulty === difficulty);
  },

  // Get words by category
  getByCategory(category) {
    return this.vocabulary.filter(word => word.category === category);
  },

  // Search words
  search(query) {
    return Utils.searchWords(this.vocabulary, query);
  },

  // Get filtered words
  async getFiltered(filters) {
    let words = [...this.vocabulary];

    // Apply search filter
    if (filters.search) {
      words = Utils.searchWords(words, filters.search);
    }

    // Apply difficulty filter
    if (filters.difficulty && filters.difficulty !== 'all') {
      words = Utils.filterByDifficulty(words, filters.difficulty);
    }

    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      const learnedIds = await StorageService.getLearnedIds();
      words = Utils.filterByStatus(words, filters.status, learnedIds);
    }

    return words;
  },

  // Get words for quiz
  async getQuizWords(count = 10, onlyUnlearned = false) {
    let words;
    if (onlyUnlearned) {
      words = await this.getUnlearnedWords();
    } else {
      words = this.vocabulary;
    }

    if (words.length === 0) {
      return [];
    }

    // Get random words
    const quizWords = Utils.getRandomItems(words, Math.min(count, words.length));
    return quizWords;
  },

  // Get academically relevant distractors for a multiple-choice question
  getSimilarDistractors(word, count = 3) {
    const samePos = this.vocabulary.filter(
      w => w.id !== word.id && w.partOfSpeech === word.partOfSpeech
    );

    const sameDifficulty = this.vocabulary.filter(
      w => w.id !== word.id && w.difficulty === word.difficulty
    );

    const pool = Utils.shuffle([
      ...samePos,
      ...sameDifficulty
    ].filter((value, index, self) => self.indexOf(value) === index));

    const needed = Math.min(count, pool.length);
    const picked = pool.slice(0, needed);

    if (picked.length < count) {
      const extras = this.vocabulary
        .filter(w => w.id !== word.id && !picked.includes(w))
        .sort(() => 0.5 - Math.random())
        .slice(0, count - picked.length);
      return [...picked, ...extras];
    }

    return picked;
  },

  // Get words that need review (based on quiz performance)
  async getWordsNeedingReview(count = 10) {
    const wordsWithScores = await Promise.all(this.vocabulary.map(async word => {
      const score = await StorageService.getQuizScore(word.id);
      const successRate = score.attempts > 0 ? score.correct / score.attempts : 1;
      return { word, successRate, attempts: score.attempts };
    }));

    // Sort by success rate (ascending) and filter out words with no attempts or high success
    const needReview = wordsWithScores
      .filter(item => item.attempts > 0 && item.successRate < 0.7)
      .sort((a, b) => a.successRate - b.successRate);

    return needReview.slice(0, count).map(item => item.word);
  },

  // Get challenging words
  async getChallengingWords(count = 5) {
    return this.getWordsNeedingReview(count);
  },

  // Get statistics
  async getStatistics() {
    const total = this.vocabulary.length;
    const learned = await StorageService.getLearnedCount();
    const unlearned = total - learned;

    const byDifficulty = {
      basic: this.getByDifficulty('basic').length,
      intermediate: this.getByDifficulty('intermediate').length,
      advanced: this.getByDifficulty('advanced').length
    };

    return {
      total,
      learned,
      unlearned,
      percentage: Utils.calculatePercentage(learned, total),
      byDifficulty
    };
  },

  // Check if data is loaded
  isLoaded() {
    return this.loaded;
  }
};

// Initialize on load
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => DataService.init());
  } else {
    DataService.init();
  }
}
