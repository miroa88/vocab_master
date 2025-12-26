// Statistics Module

const StatsMode = {
  // Initialize stats mode
  async init() {
    await this.render();
  },

  // Render statistics
  async render() {
    await this.renderOverallProgress();
    await this.renderStreak();
    await this.renderLongestStreak();
    await this.renderWeeklyWords();
    await this.renderStudyTime();
    await this.renderQuizAverage();
    await this.renderTotalQuizzes();
    await this.renderDetailedStats();
    await this.renderQuizBreakdown();
    await this.renderRecentSessions();
  },

  // Render overall progress
  async renderOverallProgress() {
    const stats = await DataService.getStatistics();
    const percentage = document.getElementById('overall-percentage');
    const wordsCount = document.getElementById('words-learned-count');
    const progressCircle = document.getElementById('progress-circle');

    percentage.textContent = `${stats.percentage}%`;
    wordsCount.textContent = `${stats.learned}/${stats.total} words`;

    // Animate progress circle
    const circumference = 2 * Math.PI * 54; // radius = 54
    const offset = circumference - (stats.percentage / 100) * circumference;

    progressCircle.style.strokeDasharray = circumference;
    progressCircle.style.strokeDashoffset = circumference;

    // Trigger animation
    setTimeout(() => {
      progressCircle.style.transition = 'stroke-dashoffset 1s ease-in-out';
      progressCircle.style.strokeDashoffset = offset;
    }, 100);
  },

  // Render study streak
  async renderStreak() {
    const streak = await StorageService.getStreak();
    const streakCount = document.getElementById('streak-count');

    streakCount.textContent = `${streak} ${streak === 1 ? 'day' : 'days'}`;

    // Add motivational message
    const streakCard = streakCount.closest('.stat-card');
    const label = streakCard.querySelector('.stat-label');

    if (streak === 0) {
      label.textContent = 'Start your streak!';
    } else if (streak < 7) {
      label.textContent = 'Keep it up!';
    } else if (streak < 30) {
      label.textContent = 'Great progress!';
    } else {
      label.textContent = 'Amazing dedication!';
    }
  },

  // Render words learned this week
  async renderWeeklyWords() {
    const weekWords = await StorageService.getWordsLearnedThisWeek();
    const weekWordsEl = document.getElementById('week-words');

    weekWordsEl.textContent = `${weekWords} ${weekWords === 1 ? 'word' : 'words'}`;
  },

  // Render total study time
  async renderStudyTime() {
    const stats = await StorageService.getStats();
    const totalTimeEl = document.getElementById('total-time');

    totalTimeEl.textContent = Utils.formatTime(stats.totalTimeSpent);
  },

  // Render average quiz score
  async renderQuizAverage() {
    const average = await StorageService.getAverageQuizScore();
    const quizAvgEl = document.getElementById('quiz-average');

    quizAvgEl.textContent = `${average}%`;

    // Color code based on performance
    if (average >= 80) {
      quizAvgEl.style.color = 'var(--success)';
    } else if (average >= 60) {
      quizAvgEl.style.color = 'var(--warning)';
    } else if (average > 0) {
      quizAvgEl.style.color = 'var(--error)';
    }
  },

  // Render longest streak
  async renderLongestStreak() {
    const stats = await StorageService.getStats();
    const longestStreakEl = document.getElementById('longest-streak');
    const longestStreak = stats.longestStreak || 0;

    longestStreakEl.textContent = `${longestStreak} ${longestStreak === 1 ? 'day' : 'days'}`;
  },

  // Render total quizzes taken
  async renderTotalQuizzes() {
    const stats = await StorageService.getStats();
    const totalQuizzesEl = document.getElementById('total-quizzes');

    totalQuizzesEl.textContent = stats.totalQuizzesTaken || 0;
  },

  // Render detailed statistics
  async renderDetailedStats() {
    const stats = await StorageService.getStats();
    const data = await StorageService.get();

    // Total sessions
    const totalSessionsEl = document.getElementById('total-sessions');
    totalSessionsEl.textContent = data.sessions.length;

    // Average session duration
    const avgDurationEl = document.getElementById('avg-session-duration');
    if (data.sessions.length > 0) {
      const totalDuration = data.sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
      const avgDuration = Math.round(totalDuration / data.sessions.length);
      avgDurationEl.textContent = Utils.formatTime(avgDuration);
    } else {
      avgDurationEl.textContent = '0 min';
    }

    // Words learned today
    const wordsTodayEl = document.getElementById('words-today');
    const today = Utils.getCurrentDate();
    const todaySession = data.sessions.find(s => s.date === today);
    wordsTodayEl.textContent = todaySession?.wordsLearned || 0;

    // Last study date
    const lastStudyEl = document.getElementById('last-study-date');
    if (stats.lastStudyDate) {
      lastStudyEl.textContent = Utils.formatDate(stats.lastStudyDate);
    } else {
      lastStudyEl.textContent = 'Never';
    }
  },

  // Render quiz performance breakdown
  async renderQuizBreakdown() {
    const data = await StorageService.get();
    const quizBreakdownEl = document.getElementById('quiz-breakdown');

    const quizScores = data.quizScores || {};
    const entries = Object.entries(quizScores);

    if (entries.length === 0) {
      quizBreakdownEl.innerHTML = '<p class="empty-state">No quiz data yet. Take a quiz to see your performance!</p>';
      return;
    }

    // Calculate success rate for each word and sort by difficulty (lowest rate first)
    const wordPerformance = entries.map(([wordId, score]) => {
      const successRate = score.attempts > 0 ? Math.round((score.correct / score.attempts) * 100) : 0;
      return {
        wordId,
        correct: score.correct,
        attempts: score.attempts,
        successRate
      };
    });

    // Sort by success rate (lowest first - most challenging)
    wordPerformance.sort((a, b) => a.successRate - b.successRate);

    // Show top 10 most challenging words
    const topChallenging = wordPerformance.slice(0, 10);

    quizBreakdownEl.innerHTML = '';

    for (const perf of topChallenging) {
      // Get word details
      const word = await DataService.getWordById(parseInt(perf.wordId));
      if (!word) continue;

      const item = document.createElement('div');
      item.className = 'quiz-word-item';

      // Add difficulty class based on success rate
      if (perf.successRate < 50) {
        item.classList.add('challenging');
      } else if (perf.successRate < 75) {
        item.classList.add('moderate');
      } else {
        item.classList.add('good');
      }

      const wordInfo = document.createElement('div');
      wordInfo.className = 'quiz-word-info';

      const wordName = document.createElement('div');
      wordName.className = 'quiz-word-name';
      wordName.textContent = word.word;

      const wordStats = document.createElement('div');
      wordStats.className = 'quiz-word-stats';
      wordStats.textContent = `${perf.correct}/${perf.attempts} correct`;

      wordInfo.appendChild(wordName);
      wordInfo.appendChild(wordStats);

      const scoreDiv = document.createElement('div');
      scoreDiv.className = 'quiz-word-score';
      scoreDiv.textContent = `${perf.successRate}%`;

      // Color code the score
      if (perf.successRate < 50) {
        scoreDiv.classList.add('low');
      } else if (perf.successRate < 75) {
        scoreDiv.classList.add('medium');
      } else {
        scoreDiv.classList.add('high');
      }

      item.appendChild(wordInfo);
      item.appendChild(scoreDiv);
      quizBreakdownEl.appendChild(item);
    }
  },

  // Render recent sessions
  async renderRecentSessions() {
    const sessions = await StorageService.getRecentSessions(5);
    const sessionsList = document.getElementById('sessions-list');

    // Ensure sessions is an array
    if (!Array.isArray(sessions) || sessions.length === 0) {
      sessionsList.innerHTML = '<p class="empty-state">No study sessions yet. Start learning to see your history!</p>';
      return;
    }

    sessionsList.innerHTML = '';

    sessions.forEach(session => {
      const sessionItem = document.createElement('div');
      sessionItem.className = 'session-item';

      const dateSpan = document.createElement('span');
      dateSpan.className = 'session-date';
      dateSpan.textContent = Utils.formatDate(session.date);

      const statsDiv = document.createElement('div');
      statsDiv.className = 'session-stats';

      const stats = [];

      if (session.wordsStudied > 0) {
        stats.push(`${session.wordsStudied} studied`);
      }

      if (session.wordsLearned > 0) {
        stats.push(`${session.wordsLearned} learned`);
      }

      if (session.quizzesTaken > 0) {
        stats.push(`${session.quizScore}% quiz`);
      }

      if (session.duration > 0) {
        stats.push(Utils.formatTime(session.duration));
      }

      statsDiv.textContent = stats.join(' • ');

      sessionItem.appendChild(dateSpan);
      sessionItem.appendChild(statsDiv);
      sessionsList.appendChild(sessionItem);
    });
  },

  // Refresh stats (called when view becomes active)
  async refresh() {
    await this.render();
  }
};
