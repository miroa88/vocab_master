// Flashcard Mode Module

const FlashcardMode = {
  currentIndex: 0,
  currentWords: [],
  isFlipped: false,
  filters: {
    search: '',
    status: 'all',
    difficulty: 'all'
  },
  touchStartX: 0,
  touchEndX: 0,

  // Initialize flashcard mode
  init() {
    this.loadWords();
    this.setupEventListeners();
    this.renderCard();
    this.updateProgress();
  },

  // Load words based on filters
  loadWords() {
    this.currentWords = DataService.getFiltered(this.filters);

    if (this.currentWords.length === 0) {
      this.currentWords = DataService.getAll();
      Utils.showToast('No words match your filters. Showing all words.', 'info');
    }

    // Reset index if out of bounds
    if (this.currentIndex >= this.currentWords.length) {
      this.currentIndex = 0;
    }
  },

  // Setup event listeners
  setupEventListeners() {
    const flashcard = document.getElementById('flashcard');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const markLearnedBtn = document.getElementById('mark-learned-btn');
    const speakBtn = document.getElementById('speak-btn');
    const shuffleBtn = document.getElementById('shuffle-btn');
    const filterBtn = document.getElementById('filter-btn');
    const searchInput = document.getElementById('search-input');

    // Flashcard click to flip
    flashcard.addEventListener('click', (e) => {
      // Prevent default behavior and scrolling
      e.preventDefault();
      e.stopPropagation();

      // Don't flip if clicking speak button
      if (!e.target.closest('.speak-btn')) {
        this.flipCard();
      }
    });

    // Navigation buttons
    prevBtn.addEventListener('click', () => this.previousCard());
    nextBtn.addEventListener('click', () => this.nextCard());

    // Mark as learned
    markLearnedBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleLearned();
    });

    // Speak button
    speakBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.speakWord();
    });

    // Shuffle button
    shuffleBtn.addEventListener('click', () => this.shuffleWords());

    // Filter button
    filterBtn.addEventListener('click', () => this.toggleFilterPanel());

    // Search input
    const debouncedSearch = Utils.debounce((value) => {
      this.filters.search = value;
      this.loadWords();
      this.renderCard();
      this.updateCardCounter();
    }, 300);

    searchInput.addEventListener('input', (e) => {
      debouncedSearch(e.target.value);
    });

    // Filter options
    this.setupFilterListeners();

    // Touch gestures for swipe
    this.setupTouchGestures(flashcard);

    // Keyboard shortcuts
    this.setupKeyboardShortcuts();
  },

  // Setup filter listeners
  setupFilterListeners() {
    const filterPanel = document.getElementById('filter-panel');

    // Status filters
    const statusFilters = filterPanel.querySelectorAll('[data-filter]');
    statusFilters.forEach(btn => {
      btn.addEventListener('click', (e) => {
        statusFilters.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.filters.status = e.target.dataset.filter;
        this.loadWords();
        this.renderCard();
        this.updateCardCounter();
      });
    });

    // Difficulty filters
    const difficultyFilters = filterPanel.querySelectorAll('[data-difficulty]');
    difficultyFilters.forEach(btn => {
      btn.addEventListener('click', (e) => {
        difficultyFilters.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.filters.difficulty = e.target.dataset.difficulty;
        this.loadWords();
        this.renderCard();
        this.updateCardCounter();
      });
    });
  },

  // Setup touch gestures
  setupTouchGestures(element) {
    element.addEventListener('touchstart', (e) => {
      this.touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    element.addEventListener('touchend', (e) => {
      this.touchEndX = e.changedTouches[0].screenX;
      this.handleSwipe();
    }, { passive: true });
  },

  // Handle swipe gesture
  handleSwipe() {
    const swipeThreshold = 50;
    const diff = this.touchStartX - this.touchEndX;

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        // Swipe left - next card
        this.nextCard();
      } else {
        // Swipe right - previous card
        this.previousCard();
      }
    }
  },

  // Setup keyboard shortcuts
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Only handle if flashcard view is active
      const flashcardView = document.getElementById('flashcard-view');
      if (!flashcardView.classList.contains('active')) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          this.previousCard();
          break;
        case 'ArrowRight':
          e.preventDefault();
          this.nextCard();
          break;
        case ' ':
          e.preventDefault();
          this.flipCard();
          break;
        case 'Enter':
          e.preventDefault();
          this.toggleLearned();
          break;
        case 's':
          e.preventDefault();
          this.speakWord();
          break;
      }
    });
  },

  // Render current card
  renderCard() {
    if (this.currentWords.length === 0) {
      this.showEmptyState();
      return;
    }

    const word = this.currentWords[this.currentIndex];
    if (!word) return;

    const flashcard = document.getElementById('flashcard');
    const wordFront = document.getElementById('word-front');
    const wordBack = document.getElementById('word-back');
    const partOfSpeech = document.getElementById('part-of-speech');
    const definitionText = document.getElementById('definition-text');
    const translationsContainer = document.getElementById('translations-container');
    const synonymsContainer = document.getElementById('synonyms-container');
    const examplesContainer = document.getElementById('examples-container');

    // Reset flip state
    flashcard.classList.remove('flipped');
    this.isFlipped = false;

    // Check if reverse mode is enabled
    const reverseMode = StorageService.getPreference('reverseMode') || false;

    // Set difficulty indicator
    const frontElement = flashcard.querySelector('.flashcard-front');
    frontElement.setAttribute('data-difficulty', word.difficulty);

    if (reverseMode) {
      // Reverse mode: show definition on front, word on back
      wordFront.textContent = word.definition;
      wordBack.textContent = word.word;
      partOfSpeech.textContent = ''; // Hide part of speech on front in reverse mode

      // Update tap hint
      const tapHint = flashcard.querySelector('.tap-hint');
      if (tapHint) tapHint.textContent = 'Tap to reveal word';
    } else {
      // Normal mode: show word on front
      wordFront.textContent = word.word;
      wordBack.textContent = word.word;
      partOfSpeech.textContent = word.partOfSpeech || 'word';

      // Update tap hint
      const tapHint = flashcard.querySelector('.tap-hint');
      if (tapHint) tapHint.textContent = 'Tap to flip';
    }

    // Set definition (for back side)
    definitionText.textContent = word.definition;

    // Set translations
    translationsContainer.innerHTML = '';
    const translations = [];

    // Get user's language preferences
    const enabledLanguages = StorageService.getPreference('translationLanguages') || ['Hy'];

    // Map of language codes to full names
    const languageNames = {
      'Fa': 'Persian',
      'Hy': 'Armenian',
      'En': 'English'
    };

    // Check for Persian translation
    if (word.translationFa && enabledLanguages.includes('Fa')) {
      translations.push({ lang: 'Fa', name: languageNames['Fa'], text: word.translationFa });
    }

    // Check for Armenian translation
    if (word.translationHy && enabledLanguages.includes('Hy')) {
      translations.push({ lang: 'Hy', name: languageNames['Hy'], text: word.translationHy });
    }

    // Check for English translation
    if (word.translationEn && enabledLanguages.includes('En')) {
      translations.push({ lang: 'En', name: languageNames['En'], text: word.translationEn });
    }

    // Render translations
    translations.forEach(translation => {
      const item = document.createElement('div');
      item.className = 'translation-item';

      const langLabel = document.createElement('span');
      langLabel.className = 'translation-lang';
      langLabel.textContent = translation.lang;
      langLabel.title = translation.name;

      const text = document.createElement('span');
      text.className = 'translation-text';
      text.textContent = translation.text;

      item.appendChild(langLabel);
      item.appendChild(text);
      translationsContainer.appendChild(item);
    });

    // Set synonyms
    synonymsContainer.innerHTML = '';
    word.synonyms.forEach(synonym => {
      const badge = document.createElement('span');
      badge.className = 'synonym-badge';
      badge.textContent = synonym;
      synonymsContainer.appendChild(badge);
    });

    // Set examples
    examplesContainer.innerHTML = '';
    word.examples.forEach(example => {
      const card = document.createElement('div');
      card.className = 'example-card';
      const p = document.createElement('p');
      p.textContent = example;
      card.appendChild(p);
      examplesContainer.appendChild(card);
    });

    // Update learned status
    this.updateLearnedButton();

    // Update learned indicator
    const isLearned = StorageService.isLearned(word.id);
    if (isLearned) {
      flashcard.classList.add('learned');
    } else {
      flashcard.classList.remove('learned');
    }

    // Update counter
    this.updateCardCounter();
  },

  // Flip card
  flipCard() {
    const flashcard = document.getElementById('flashcard');

    flashcard.classList.toggle('flipped');
    this.isFlipped = !this.isFlipped;

    // Reset scroll position of flashcard back to top when flipping to back
    if (this.isFlipped) {
      const flashcardBack = flashcard.querySelector('.flashcard-back');
      if (flashcardBack) {
        flashcardBack.scrollTop = 0;
      }
    }

    // Auto-play pronunciation if enabled and flipping to back
    if (this.isFlipped && StorageService.getPreference('autoPlay')) {
      setTimeout(() => this.speakWord(), 300);
    }
  },

  // Previous card
  previousCard() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.renderCard();
    } else {
      Utils.showToast('This is the first card', 'info');
    }
  },

  // Next card
  nextCard() {
    if (this.currentIndex < this.currentWords.length - 1) {
      this.currentIndex++;
      this.renderCard();
    } else {
      Utils.showToast('This is the last card', 'info');
    }
  },

  // Toggle learned status
  toggleLearned() {
    const word = this.currentWords[this.currentIndex];
    if (!word) return;

    const isLearned = StorageService.isLearned(word.id);

    if (isLearned) {
      StorageService.unmarkLearned(word.id);
      Utils.showToast(`"${word.word}" marked as unlearned`, 'info');
    } else {
      StorageService.markLearned(word.id);
      Utils.showToast(`"${word.word}" marked as learned!`, 'success');
    }

    this.updateLearnedButton();
    this.updateProgress();

    // Update learned indicator
    const flashcard = document.getElementById('flashcard');
    if (StorageService.isLearned(word.id)) {
      flashcard.classList.add('learned');
    } else {
      flashcard.classList.remove('learned');
    }
  },

  // Update learned button
  updateLearnedButton() {
    const word = this.currentWords[this.currentIndex];
    if (!word) return;

    const btn = document.getElementById('mark-learned-btn');
    const text = document.getElementById('learned-text');
    const isLearned = StorageService.isLearned(word.id);

    if (isLearned) {
      btn.classList.add('learned');
      text.textContent = 'Learned ✓';
    } else {
      btn.classList.remove('learned');
      text.textContent = 'Mark as Learned';
    }
  },

  // Speak current word
  speakWord() {
    const word = this.currentWords[this.currentIndex];
    if (!word) return;

    const speakBtn = document.getElementById('speak-btn');
    speakBtn.classList.add('speaking');

    SpeechService.speak(word.word, {
      onEnd: () => {
        speakBtn.classList.remove('speaking');
      },
      onError: () => {
        speakBtn.classList.remove('speaking');
        Utils.showToast('Speech not available', 'error');
      }
    });
  },

  // Shuffle words
  shuffleWords() {
    this.currentWords = Utils.shuffle(this.currentWords);
    this.currentIndex = 0;
    this.renderCard();
    Utils.showToast('Cards shuffled!', 'success');
  },

  // Toggle filter panel
  toggleFilterPanel() {
    const filterPanel = document.getElementById('filter-panel');
    filterPanel.classList.toggle('hidden');
  },

  // Update card counter
  updateCardCounter() {
    const counter = document.getElementById('card-number');
    const current = this.currentWords.length > 0 ? this.currentIndex + 1 : 0;
    const total = this.currentWords.length;
    counter.textContent = `Card ${current}/${total}`;

    // Update card progress bar
    const cardProgressFill = document.getElementById('card-progress-fill');
    if (cardProgressFill && total > 0) {
      const percentage = (current / total) * 100;
      cardProgressFill.style.width = `${percentage}%`;
    }
  },

  // Update progress indicator in header
  updateProgress() {
    const stats = DataService.getStatistics();
    const progressText = document.getElementById('progress-text');
    const progressFill = document.getElementById('progress-fill');

    progressText.textContent = `${stats.learned}/${stats.total} learned`;
    progressFill.style.width = `${stats.percentage}%`;
  },

  // Show empty state
  showEmptyState() {
    const flashcard = document.getElementById('flashcard');
    flashcard.innerHTML = `
      <div style="text-align: center; padding: 2rem;">
        <p style="color: var(--text-tertiary); font-size: 1.125rem;">
          No words found matching your filters.
        </p>
      </div>
    `;
  },

  // Reset to first card
  reset() {
    this.currentIndex = 0;
    this.loadWords();
    this.renderCard();
  }
};
