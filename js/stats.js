// Statistics Module

const StatsMode = {
  // Initialize stats mode
  init() {
    this.render();
  },

  // Render statistics
  render() {
    this.renderOverallProgress();
    this.renderStreak();
    this.renderWeeklyWords();
    this.renderStudyTime();
    this.renderQuizAverage();
    this.renderRecentSessions();
  },

  // Render overall progress
  renderOverallProgress() {
    const stats = DataService.getStatistics();
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
  renderStreak() {
    const streak = StorageService.getStreak();
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
  renderWeeklyWords() {
    const weekWords = StorageService.getWordsLearnedThisWeek();
    const weekWordsEl = document.getElementById('week-words');

    weekWordsEl.textContent = `${weekWords} ${weekWords === 1 ? 'word' : 'words'}`;
  },

  // Render total study time
  renderStudyTime() {
    const stats = StorageService.getStats();
    const totalTimeEl = document.getElementById('total-time');

    totalTimeEl.textContent = Utils.formatTime(stats.totalTimeSpent);
  },

  // Render average quiz score
  renderQuizAverage() {
    const average = StorageService.getAverageQuizScore();
    const quizAvgEl = document.getElementById('quiz-average');

    quizAvgEl.textContent = `${average}%`;

    // Color code based on performance
    const card = quizAvgEl.closest('.stat-card');
    if (average >= 80) {
      quizAvgEl.style.color = 'var(--success)';
    } else if (average >= 60) {
      quizAvgEl.style.color = 'var(--warning)';
    } else {
      quizAvgEl.style.color = 'var(--error)';
    }
  },

  // Render recent sessions
  renderRecentSessions() {
    const sessions = StorageService.getRecentSessions(5);
    const sessionsList = document.getElementById('sessions-list');

    if (sessions.length === 0) {
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
  refresh() {
    this.render();
  }
};
