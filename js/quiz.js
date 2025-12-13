// Quiz Mode Module

const QuizMode = {
  currentMode: null, // 'multiple-choice' or 'self-assessment'
  quizWords: [],
  currentQuestionIndex: 0,
  score: 0,
  answers: [],
  sessionStartTime: null,

  // Initialize quiz mode
  init() {
    this.setupEventListeners();
  },

  // Setup event listeners
  setupEventListeners() {
    // Mode selection
    document.getElementById('multiple-choice-mode').querySelector('button')
      .addEventListener('click', () => this.startQuiz('multiple-choice'));

    document.getElementById('self-assessment-mode').querySelector('button')
      .addEventListener('click', () => this.startQuiz('self-assessment'));

    // Quiz navigation
    const quizNextBtn = document.getElementById('quiz-next-btn');
    if (quizNextBtn) {
      quizNextBtn.addEventListener('click', () => this.nextQuestion());
    }

    // Self-assessment buttons
    const showAnswerBtn = document.getElementById('show-answer-btn');
    if (showAnswerBtn) {
      showAnswerBtn.addEventListener('click', () => this.showAnswer());
    }

    // Results buttons
    const restartBtn = document.getElementById('restart-quiz-btn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => this.reset());
    }

    const reviewBtn = document.getElementById('review-mistakes-btn');
    if (reviewBtn) {
      reviewBtn.addEventListener('click', () => this.reviewMistakes());
    }
  },

  // Start quiz
  startQuiz(mode) {
    this.currentMode = mode;
    this.currentQuestionIndex = 0;
    this.score = 0;
    this.answers = [];
    this.sessionStartTime = Date.now();

    // Get quiz words (10 random words)
    this.quizWords = DataService.getQuizWords(10);

    if (this.quizWords.length === 0) {
      Utils.showToast('No words available for quiz', 'error');
      return;
    }

    // Hide mode selection, show quiz content
    document.getElementById('quiz-mode-selection').classList.add('hidden');
    document.getElementById('quiz-content').classList.remove('hidden');
    document.getElementById('quiz-progress').classList.remove('hidden');
    document.getElementById('quiz-title').textContent = mode === 'multiple-choice' ? 'Multiple Choice Quiz' : 'Self Assessment Quiz';

    // Show correct quiz type
    if (mode === 'multiple-choice') {
      document.getElementById('multiple-choice-quiz').classList.remove('hidden');
      document.getElementById('self-assessment-quiz').classList.add('hidden');
    } else {
      document.getElementById('self-assessment-quiz').classList.remove('hidden');
      document.getElementById('multiple-choice-quiz').classList.add('hidden');
    }

    // Render first question
    this.renderQuestion();
  },

  // Render current question
  renderQuestion() {
    this.updateProgress();

    if (this.currentMode === 'multiple-choice') {
      this.renderMultipleChoice();
    } else {
      this.renderSelfAssessment();
    }
  },

  // Render multiple choice question
  renderMultipleChoice() {
    const word = this.quizWords[this.currentQuestionIndex];
    const mcDefinition = document.getElementById('mc-definition');
    const mcOptions = document.getElementById('mc-options');

    // Set question
    mcDefinition.textContent = word.definition;

    // Generate options (correct word + 3 random wrong words)
    const wrongWords = DataService.getAll()
      .filter(w => w.id !== word.id)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);

    const options = Utils.shuffle([word, ...wrongWords]);

    // Render options
    mcOptions.innerHTML = '';
    options.forEach(option => {
      const button = document.createElement('button');
      button.className = 'quiz-option';
      button.textContent = option.word;
      button.addEventListener('click', () => this.selectAnswer(option.id === word.id, button));
      mcOptions.appendChild(button);
    });

    // Hide next button initially
    document.getElementById('quiz-next-btn').classList.add('hidden');
  },

  // Handle answer selection in multiple choice
  selectAnswer(isCorrect, selectedButton) {
    const word = this.quizWords[this.currentQuestionIndex];

    // Disable all options
    const allOptions = document.querySelectorAll('.quiz-option');
    allOptions.forEach(btn => btn.disabled = true);

    // Mark selected answer
    if (isCorrect) {
      selectedButton.classList.add('correct');
      this.score++;
      Utils.showToast('Correct!', 'success');
    } else {
      selectedButton.classList.add('incorrect');
      // Highlight correct answer
      allOptions.forEach(btn => {
        if (btn.textContent === word.word) {
          btn.classList.add('correct');
        }
      });
      Utils.showToast(`Incorrect. The answer was "${word.word}"`, 'error');
    }

    // Record answer
    this.answers.push({
      word: word,
      correct: isCorrect
    });

    // Update quiz score in storage
    StorageService.updateQuizScore(word.id, isCorrect);

    // Show next button
    document.getElementById('quiz-next-btn').classList.remove('hidden');
  },

  // Render self-assessment question
  renderSelfAssessment() {
    const word = this.quizWords[this.currentQuestionIndex];
    const saWord = document.getElementById('sa-word');
    const saAnswer = document.getElementById('sa-answer');
    const saDefinition = document.getElementById('sa-definition');
    const showAnswerBtn = document.getElementById('show-answer-btn');

    saWord.textContent = word.word;
    saDefinition.textContent = word.definition;

    // Reset answer section
    saAnswer.classList.add('hidden');
    showAnswerBtn.classList.remove('hidden');
    document.getElementById('quiz-next-btn').classList.add('hidden');

    // Setup rating buttons
    const ratingButtons = document.querySelectorAll('.rating-btn');
    ratingButtons.forEach(btn => {
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      newBtn.addEventListener('click', (e) => this.rateConfidence(e.target.dataset.rating));
    });
  },

  // Show answer in self-assessment
  showAnswer() {
    const saAnswer = document.getElementById('sa-answer');
    const showAnswerBtn = document.getElementById('show-answer-btn');

    saAnswer.classList.remove('hidden');
    showAnswerBtn.classList.add('hidden');
  },

  // Rate confidence in self-assessment
  rateConfidence(rating) {
    const word = this.quizWords[this.currentQuestionIndex];
    const ratingNum = parseInt(rating);

    // Rating: 1 = Don't Know, 2 = Hard, 3 = Medium, 4 = Easy
    // Consider 3 and 4 as "correct"
    const isCorrect = ratingNum >= 3;

    if (isCorrect) {
      this.score++;
    }

    // Record answer
    this.answers.push({
      word: word,
      correct: isCorrect,
      confidence: ratingNum
    });

    // Update quiz score
    StorageService.updateQuizScore(word.id, isCorrect);

    // Show feedback
    const messages = {
      1: 'Keep studying this word!',
      2: 'You\'ll get it next time!',
      3: 'Good job!',
      4: 'Excellent!'
    };
    Utils.showToast(messages[ratingNum], isCorrect ? 'success' : 'info');

    // Show next button
    document.getElementById('quiz-next-btn').classList.remove('hidden');
  },

  // Next question
  nextQuestion() {
    this.currentQuestionIndex++;

    if (this.currentQuestionIndex < this.quizWords.length) {
      // Render next question
      this.renderQuestion();
    } else {
      // Quiz complete
      this.showResults();
    }
  },

  // Update progress
  updateProgress() {
    const counter = document.getElementById('quiz-counter');
    const progressFill = document.getElementById('quiz-progress-fill');

    counter.textContent = `Question ${this.currentQuestionIndex + 1}/${this.quizWords.length}`;

    const percentage = ((this.currentQuestionIndex + 1) / this.quizWords.length) * 100;
    progressFill.style.width = `${percentage}%`;
  },

  // Show results
  showResults() {
    const duration = Math.floor((Date.now() - this.sessionStartTime) / 1000);
    const percentage = Utils.calculatePercentage(this.score, this.quizWords.length);

    // Hide quiz content
    document.getElementById('quiz-content').classList.add('hidden');

    // Show results
    const resultsSection = document.getElementById('quiz-results');
    resultsSection.classList.remove('hidden');

    const scorePercentage = document.getElementById('score-percentage');
    const scoreText = document.getElementById('score-text');

    scorePercentage.textContent = `${percentage}%`;
    scoreText.textContent = `You got ${this.score} out of ${this.quizWords.length} correct`;

    // Save session
    const wrongAnswers = this.answers.filter(a => !a.correct);
    StorageService.addSession({
      duration: duration,
      wordsStudied: this.quizWords.length,
      wordsLearned: 0,
      quizzesTaken: 1,
      quizScore: percentage
    });

    // Update streak
    StorageService.updateStreak();

    // Show/hide review button based on mistakes
    const reviewBtn = document.getElementById('review-mistakes-btn');
    if (wrongAnswers.length > 0) {
      reviewBtn.classList.remove('hidden');
    } else {
      reviewBtn.classList.add('hidden');
      Utils.showToast('Perfect score! 🎉', 'success');
    }
  },

  // Review mistakes
  reviewMistakes() {
    const wrongAnswers = this.answers.filter(a => !a.correct);

    if (wrongAnswers.length === 0) {
      Utils.showToast('No mistakes to review!', 'success');
      return;
    }

    // Start new quiz with only wrong answers
    this.quizWords = wrongAnswers.map(a => a.word);
    this.currentQuestionIndex = 0;
    this.score = 0;
    this.answers = [];

    // Hide results, show quiz content
    document.getElementById('quiz-results').classList.add('hidden');
    document.getElementById('quiz-content').classList.remove('hidden');

    this.renderQuestion();
    Utils.showToast(`Reviewing ${this.quizWords.length} words`, 'info');
  },

  // Reset quiz
  reset() {
    this.currentMode = null;
    this.quizWords = [];
    this.currentQuestionIndex = 0;
    this.score = 0;
    this.answers = [];

    // Show mode selection
    document.getElementById('quiz-mode-selection').classList.remove('hidden');
    document.getElementById('quiz-content').classList.add('hidden');
    document.getElementById('quiz-results').classList.add('hidden');
    document.getElementById('quiz-progress').classList.add('hidden');
    document.getElementById('quiz-title').textContent = 'Choose Quiz Mode';
  }
};
