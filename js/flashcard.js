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
  translationCache: new Map(),
  translationStates: new Map(),
  currentTargetLanguage: null,

  // Initialize flashcard mode
  async init() {
    await this.loadWords();
    const swipePref = await StorageService.getPreference('enableSwipe');
    this.enableSwipe = swipePref !== false;

    await this.loadTranslationLanguage();

    this.setupEventListeners();
    await this.renderCard();
    await this.updateProgress();
  },

  // Load translation language preference
  async loadTranslationLanguage() {
    const enabledLanguages = await StorageService.getPreference('translationLanguages') || ['Hy'];
    this.currentTargetLanguage = enabledLanguages[0];
    console.log('Translation target language:', this.currentTargetLanguage);
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
    const generateExamplesBtn = document.getElementById('generate-examples-btn');
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

    // Generate examples button
    generateExamplesBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.generateNewExamples();
    });

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
    // Clear translation states when changing cards
    this.translationStates.clear();

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

    // Set definition (for back side) with speak and translate buttons
    definitionText.innerHTML = `
      <span class="translatable-text" data-element-id="definition">${word.definition}</span>
      <button class="speak-btn inline-speak-btn" data-text="${this.escapeHtml(word.definition)}" title="Speak definition">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
        </svg>
      </button>
      <button class="translate-btn inline-translate-btn" data-element-id="definition" data-original-text="${this.escapeHtml(word.definition)}" title="Translate definition">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/>
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

    // Set synonyms with translate button
    synonymsContainer.innerHTML = '';

    if (word.synonyms && word.synonyms.length > 0) {
      const synonymsWrapper = document.createElement('div');
      synonymsWrapper.className = 'synonyms-wrapper';

      const synonymsTextContainer = document.createElement('div');
      synonymsTextContainer.className = 'synonyms-badges-container';

      word.synonyms.forEach(synonym => {
        const badge = document.createElement('span');
        badge.className = 'synonym-badge';
        badge.textContent = synonym;
        synonymsTextContainer.appendChild(badge);
      });

      const synonymsText = word.synonyms.join(', ');
      const translateBtn = document.createElement('button');
      translateBtn.className = 'translate-btn inline-translate-btn';
      translateBtn.setAttribute('data-element-id', 'synonyms');
      translateBtn.setAttribute('data-original-text', this.escapeHtml(synonymsText));
      translateBtn.setAttribute('title', 'Translate all synonyms');
      translateBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/>
        </svg>
      `;

      synonymsWrapper.appendChild(synonymsTextContainer);
      synonymsWrapper.appendChild(translateBtn);
      synonymsContainer.appendChild(synonymsWrapper);
    }

    // Set examples with speak and translate buttons
    examplesContainer.innerHTML = '';
    word.examples.forEach((example, index) => {
      const card = document.createElement('div');
      card.className = 'example-card';

      const elementId = `example-${index}`;

      const p = document.createElement('p');
      p.innerHTML = `
        <span class="translatable-text" data-element-id="${elementId}">${example}</span>
        <button class="speak-btn inline-speak-btn" data-text="${this.escapeHtml(example)}" title="Speak example">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
          </svg>
        </button>
        <button class="translate-btn inline-translate-btn" data-element-id="${elementId}" data-original-text="${this.escapeHtml(example)}" title="Translate example">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/>
          </svg>
        </button>
      `;

      card.appendChild(p);
      examplesContainer.appendChild(card);
    });

    // Setup speak button listeners for definition and examples
    this.setupInlineSpeakButtons();

    // Setup translate button listeners
    this.setupInlineTranslateButtons();

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

  // Generate new examples using AI
  async generateNewExamples() {
    const word = this.currentWords[this.currentIndex];
    if (!word) return;

    const btn = document.getElementById('generate-examples-btn');
    const examplesContainer = document.getElementById('examples-container');

    // Show loading state
    btn.classList.add('loading');
    btn.disabled = true;
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span><span>Generating...</span>';

    try {
      // Call backend API
      const response = await ApiClient.generateExamples(word.id);

      if (!response.success || !response.examples || response.examples.length !== 2) {
        throw new Error('Invalid response format from server');
      }

      // Clear current examples
      examplesContainer.innerHTML = '';

      // Add new examples with animation
      response.examples.forEach((example, index) => {
        const card = document.createElement('div');
        card.className = 'example-card';
        card.style.animation = `fadeIn 0.3s ease-in-out ${index * 100}ms`;

        const p = document.createElement('p');
        p.innerHTML = `
          ${this.escapeHtml(example)}
          <button class="speak-btn inline-speak-btn" data-text="${this.escapeHtml(example)}"
                  title="Speak example">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
          </button>
        `;

        card.appendChild(p);
        examplesContainer.appendChild(card);
      });

      // Re-attach speak listeners
      this.setupInlineSpeakButtons();

      Utils.showToast('Examples generated successfully!', 'success');
    } catch (error) {
      console.error('Failed to generate examples:', error);
      const errorMessage = error.details?.message || error.message || 'Failed to generate examples';
      Utils.showToast(errorMessage, 'error');
    } finally {
      // Restore button state
      btn.classList.remove('loading');
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  },

  // Toggle filter panel
  toggleFilterPanel() {
    const filterPanel = document.getElementById('filter-panel');
    const isHidden = filterPanel.classList.contains('hidden');

    filterPanel.classList.toggle('hidden');

    // When opening the filter panel, set Unlearned as default if currently on "All"
    if (isHidden && this.filters.status === 'all') {
      const statusFilters = filterPanel.querySelectorAll('[data-filter]');
      statusFilters.forEach(btn => btn.classList.remove('active'));

      const unlearnedBtn = filterPanel.querySelector('[data-filter="unlearned"]');
      if (unlearnedBtn) {
        unlearnedBtn.classList.add('active');
        this.filters.status = 'unlearned';
        this.loadWords().then(() => {
          this.renderCard();
          this.updateCardCounter();
        });
      }
    }
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

  // Setup inline translate button listeners
  setupInlineTranslateButtons() {
    const inlineTranslateBtns = document.querySelectorAll('.inline-translate-btn');
    inlineTranslateBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent card flip
        this.handleTranslateClick(btn);
      });
    });
  },

  // Handle translate button click
  async handleTranslateClick(btn) {
    const elementId = btn.getAttribute('data-element-id');
    const originalText = btn.getAttribute('data-original-text');

    if (!elementId || !originalText) return;

    let textElement;
    if (elementId === 'definition') {
      textElement = document.querySelector('.definition-text .translatable-text');
    } else if (elementId === 'synonyms') {
      textElement = document.querySelector('.synonyms-badges-container');
    } else {
      textElement = document.querySelector(`.translatable-text[data-element-id="${elementId}"]`);
    }

    if (!textElement) return;

    const currentState = this.translationStates.get(elementId);

    if (currentState === 'translated') {
      // Toggle back to English
      if (elementId === 'synonyms') {
        const synonyms = originalText.split(', ');
        textElement.innerHTML = '';
        synonyms.forEach(synonym => {
          const badge = document.createElement('span');
          badge.className = 'synonym-badge';
          badge.textContent = synonym;
          textElement.appendChild(badge);
        });
      } else {
        textElement.textContent = originalText;
        textElement.classList.remove('translated');
      }
      this.translationStates.set(elementId, 'original');
      btn.classList.remove('active');
      return;
    }

    const cacheKey = `${originalText}_${this.currentTargetLanguage}`;
    const cachedTranslation = this.translationCache.get(cacheKey);

    if (cachedTranslation) {
      if (elementId === 'synonyms') {
        const translatedSynonyms = cachedTranslation.split(', ');
        textElement.innerHTML = '';
        translatedSynonyms.forEach(synonym => {
          const badge = document.createElement('span');
          badge.className = 'synonym-badge translated';
          badge.textContent = synonym;
          textElement.appendChild(badge);
        });
      } else {
        textElement.textContent = cachedTranslation;
        textElement.classList.add('translated');
      }
      this.translationStates.set(elementId, 'translated');
      btn.classList.add('active');
      return;
    }

    btn.classList.add('loading');
    btn.disabled = true;
    const originalBtnHtml = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span>';

    try {
      await this.loadTranslationLanguage();

      const response = await ApiClient.translateText(originalText, this.currentTargetLanguage);

      if (!response.success || !response.translation) {
        throw new Error('Invalid translation response');
      }

      const translation = response.translation;
      this.translationCache.set(cacheKey, translation);

      if (elementId === 'synonyms') {
        const translatedSynonyms = translation.split(',').map(s => s.trim());
        textElement.innerHTML = '';
        translatedSynonyms.forEach(synonym => {
          const badge = document.createElement('span');
          badge.className = 'synonym-badge translated';
          badge.textContent = synonym;
          textElement.appendChild(badge);
        });
      } else {
        textElement.textContent = translation;
        textElement.classList.add('translated');
      }

      this.translationStates.set(elementId, 'translated');
      btn.classList.add('active');

    } catch (error) {
      console.error('Translation failed:', error);
      const errorMessage = error.details?.message || error.message || 'Failed to translate';
      Utils.showToast(errorMessage, 'error');
    } finally {
      btn.classList.remove('loading');
      btn.disabled = false;
      btn.innerHTML = originalBtnHtml;
    }
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
