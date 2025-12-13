// Data Management Module

const DataService = {
  vocabulary: [],
  metadata: {},
  loaded: false,

  // Load vocabulary from JSON file
  async load() {
    try {
      const response = await fetch('vocab.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      this.vocabulary = data.words || [];
      this.metadata = data.metadata || {};
      this.loaded = true;
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
  getUnlearnedWords() {
    const learnedIds = StorageService.getLearnedIds();
    return this.vocabulary.filter(word => !learnedIds.includes(word.id));
  },

  // Get learned words
  getLearnedWords() {
    const learnedIds = StorageService.getLearnedIds();
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
  getFiltered(filters) {
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
      const learnedIds = StorageService.getLearnedIds();
      words = Utils.filterByStatus(words, filters.status, learnedIds);
    }

    return words;
  },

  // Get words for quiz
  getQuizWords(count = 10, onlyUnlearned = false) {
    let words;
    if (onlyUnlearned) {
      words = this.getUnlearnedWords();
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

  // Get words that need review (based on quiz performance)
  getWordsNeedingReview(count = 10) {
    const wordsWithScores = this.vocabulary.map(word => {
      const score = StorageService.getQuizScore(word.id);
      const successRate = score.attempts > 0 ? score.correct / score.attempts : 1;
      return { word, successRate, attempts: score.attempts };
    });

    // Sort by success rate (ascending) and filter out words with no attempts or high success
    const needReview = wordsWithScores
      .filter(item => item.attempts > 0 && item.successRate < 0.7)
      .sort((a, b) => a.successRate - b.successRate);

    return needReview.slice(0, count).map(item => item.word);
  },

  // Get challenging words
  getChallengingWords(count = 5) {
    return this.getWordsNeedingReview(count);
  },

  // Get statistics
  getStatistics() {
    const total = this.vocabulary.length;
    const learned = StorageService.getLearnedCount();
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
