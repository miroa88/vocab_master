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
  enableSwipe: true,
  touchStartX: 0,
  touchEndX: 0,

  // Initialize flashcard mode
  async init() {
    await this.loadWords();
    const swipePref = await StorageService.getPreference('enableSwipe');
    this.enableSwipe = swipePref !== false;
    this.setupEventListeners();
    await this.renderCard();
    await this.updateProgress();
  },

  // Load words based on filters
  async loadWords() {
    const words = await DataService.getFiltered(this.filters);
    this.currentWords = Array.isArray(words) ? words : [];

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
    const debouncedSearch = Utils.debounce(async (value) => {
      this.filters.search = value;
      await this.loadWords();
      await this.renderCard();
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
        this.loadWords().then(() => {
          this.renderCard();
          this.updateCardCounter();
        });
      });
    });

    // Difficulty filters
    const difficultyFilters = filterPanel.querySelectorAll('[data-difficulty]');
    difficultyFilters.forEach(btn => {
      btn.addEventListener('click', (e) => {
        difficultyFilters.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.filters.difficulty = e.target.dataset.difficulty;
        this.loadWords().then(() => {
          this.renderCard();
          this.updateCardCounter();
        });
      });
    });
  },

  // Setup touch gestures
  setupTouchGestures(element) {
    if (!this.enableSwipe) return;

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

      // Ignore shortcuts while typing in inputs/textareas or editable elements
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) {
        return;
      }

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
  async renderCard() {
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
    const frontTranslation = document.getElementById('front-translation');
    const translationsContainer = document.getElementById('translations-container');
    const synonymsContainer = document.getElementById('synonyms-container');
    const examplesContainer = document.getElementById('examples-container');

    // Reset flip state
    flashcard.classList.remove('flipped');
    this.isFlipped = false;

    // Check if reverse mode is enabled
    const reverseMode = await StorageService.getPreference('reverseMode') || false;
    const showFrontTranslation = reverseMode && (await StorageService.getPreference('showFrontTranslation') !== false);

    // Toggle reverse-mode class for styling adjustments
    flashcard.classList.toggle('reverse-mode', reverseMode);

    // Set difficulty indicator
    const frontElement = flashcard.querySelector('.flashcard-front');
    frontElement.setAttribute('data-difficulty', word.difficulty);

    // Get user's language preferences
    const enabledLanguages = await StorageService.getPreference('translationLanguages') || ['Hy'];
    const translations = this.getTranslationsForWord(word, enabledLanguages);

    if (reverseMode) {
      // Reverse mode: show definition on front, word on back
      wordFront.textContent = word.definition;
      wordBack.textContent = word.word;
      partOfSpeech.textContent = ''; // Hide part of speech on front in reverse mode

      if (frontTranslation) {
        if (showFrontTranslation && translations.length > 0) {
          frontTranslation.innerHTML = translations.map(t => `<span class="translation-lang">${t.lang}</span> ${this.escapeHtml(t.text)}`).join(' • ');
          frontTranslation.classList.remove('hidden');
        } else {
          frontTranslation.textContent = '';
          frontTranslation.classList.add('hidden');
        }
      }

      // Update tap hint
      const tapHint = flashcard.querySelector('.tap-hint');
      if (tapHint) tapHint.textContent = 'Tap to reveal word';
    } else {
      // Normal mode: show word on front
      wordFront.textContent = word.word;
      wordBack.textContent = word.word;
      partOfSpeech.textContent = word.partOfSpeech || 'word';
      if (frontTranslation) {
        frontTranslation.textContent = '';
        frontTranslation.classList.add('hidden');
      }

      // Update tap hint
      const tapHint = flashcard.querySelector('.tap-hint');
      if (tapHint) tapHint.textContent = 'Tap to flip';
    }

    // Set definition (for back side) with speak button
    definitionText.innerHTML = `
      ${word.definition}
      <button class="speak-btn inline-speak-btn" data-text="${this.escapeHtml(word.definition)}" title="Speak definition">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
        </svg>
      </button>
    `;

    // Set translations
    translationsContainer.innerHTML = '';
    // Render translations (back side)
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

    // Set examples with speak buttons
    examplesContainer.innerHTML = '';
    word.examples.forEach(example => {
      const card = document.createElement('div');
      card.className = 'example-card';

      const p = document.createElement('p');
      p.innerHTML = `
        ${example}
        <button class="speak-btn inline-speak-btn" data-text="${this.escapeHtml(example)}" title="Speak example">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
          </svg>
        </button>
      `;

      card.appendChild(p);
      examplesContainer.appendChild(card);
    });

    // Setup speak button listeners for definition and examples
    this.setupInlineSpeakButtons();

    // Update learned status
    await this.updateLearnedButton();

    // Update learned indicator
    const isLearned = await StorageService.isLearned(word.id);
    if (isLearned) {
      flashcard.classList.add('learned');
    } else {
      flashcard.classList.remove('learned');
    }

    // Update counter
    this.updateCardCounter();

    // Ensure back/content scroll is at top for new card
    const flashcardBack = flashcard.querySelector('.flashcard-back');
    const cardContent = flashcard.querySelector('.card-content');
    if (flashcardBack) flashcardBack.scrollTop = 0;
    if (cardContent) cardContent.scrollTop = 0;
  },

  // Flip card
  async flipCard() {
    const flashcard = document.getElementById('flashcard');

    flashcard.classList.toggle('flipped');
    this.isFlipped = !this.isFlipped;

    // Reset scroll position of flashcard content to top on every flip
    const flashcardBack = flashcard.querySelector('.flashcard-back');
    const cardContent = flashcard.querySelector('.card-content');
    if (flashcardBack) flashcardBack.scrollTop = 0;
    if (cardContent) cardContent.scrollTop = 0;

    // Auto-play pronunciation if enabled and flipping to back
    const autoPlay = await StorageService.getPreference('autoPlay');
    if (this.isFlipped && autoPlay) {
      setTimeout(() => this.speakWord(), 300);
    }
  },

  // Previous card
  async previousCard() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      await this.renderCard();
      // Ensure scroll is reset after DOM update
      this.resetScrollPosition();
    } else {
      Utils.showToast('This is the first card', 'info');
    }
  },

  // Next card
  async nextCard() {
    if (this.currentIndex < this.currentWords.length - 1) {
      this.currentIndex++;
      await this.renderCard();
      // Ensure scroll is reset after DOM update
      this.resetScrollPosition();
    } else {
      Utils.showToast('This is the last card', 'info');
    }
  },

  // Toggle learned status
  async toggleLearned() {
    const word = this.currentWords[this.currentIndex];
    if (!word) return;

    const isLearned = await StorageService.isLearned(word.id);

    if (isLearned) {
      await StorageService.unmarkLearned(word.id);
      Utils.showToast(`"${word.word}" marked as unlearned`, 'info');
    } else {
      await StorageService.markLearned(word.id);
      Utils.showToast(`"${word.word}" marked as learned!`, 'success');
    }

    await this.updateLearnedButton();
    await this.updateProgress();

    // Update learned indicator
    const flashcard = document.getElementById('flashcard');
    const learnedNow = await StorageService.isLearned(word.id);
    if (learnedNow) {
      flashcard.classList.add('learned');
    } else {
      flashcard.classList.remove('learned');
    }
  },

  // Update learned button
  async updateLearnedButton() {
    const word = this.currentWords[this.currentIndex];
    if (!word) return;

    const btn = document.getElementById('mark-learned-btn');
    const text = document.getElementById('learned-text');
    const isLearned = await StorageService.isLearned(word.id);

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

    // CRITICAL: Resume AudioContext SYNCHRONOUSLY in the gesture handler (iOS requirement)
    // DO NOT use await here - it breaks the user gesture chain on iOS Safari
    if (window.SpeechService?.audioContext) {
      if (window.SpeechService.audioContext.state === 'suspended') {
        // Call resume() synchronously without await to maintain gesture context
        window.SpeechService.audioContext.resume()
          .then(() => console.log('AudioContext resumed in click handler'))
          .catch(e => console.warn('Failed to resume AudioContext:', e));
      }
    }

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
  async updateProgress() {
    const stats = await DataService.getStatistics();
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
  async reset() {
    this.currentIndex = 0;
    await this.loadWords();
    await this.renderCard();
  },

  // Setup inline speak button listeners
  setupInlineSpeakButtons() {
    const inlineSpeakBtns = document.querySelectorAll('.inline-speak-btn');
    inlineSpeakBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent card flip
        const textToSpeak = btn.getAttribute('data-text');
        if (textToSpeak) {
          SpeechService.speak(textToSpeak);
        }
      });
    });
  },

  // Escape HTML to prevent XSS
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  // Reset scroll position to top
  resetScrollPosition() {
    const flashcard = document.getElementById('flashcard');
    const flashcardBack = flashcard?.querySelector('.flashcard-back');
    const cardContent = flashcard?.querySelector('.card-content');
    if (flashcardBack) flashcardBack.scrollTop = 0;
    if (cardContent) cardContent.scrollTop = 0;
  },

  getTranslationsForWord(word, enabledLanguages) {
    const translations = [];

    const languageNames = {
      'Fa': 'Persian',
      'Hy': 'Armenian',
      'En': 'English'
    };

    if (word.translationFa && enabledLanguages.includes('Fa')) {
      translations.push({ lang: 'Fa', name: languageNames['Fa'], text: word.translationFa });
    }

    if (word.translationHy && enabledLanguages.includes('Hy')) {
      translations.push({ lang: 'Hy', name: languageNames['Hy'], text: word.translationHy });
    }

    if (word.translationEn && enabledLanguages.includes('En')) {
      translations.push({ lang: 'En', name: languageNames['En'], text: word.translationEn });
    }

    return translations;
  }
};
