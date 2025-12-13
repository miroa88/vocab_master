// Utility Functions

const Utils = {
  // Fisher-Yates shuffle algorithm
  shuffle(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  },

  // Debounce function for search input
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Format time in seconds to readable format
  formatTime(seconds) {
    if (seconds < 60) {
      return `${seconds} sec`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      return `${minutes} min`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  },

  // Format date to readable string
  formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      const options = { month: 'short', day: 'numeric' };
      return date.toLocaleDateString('en-US', options);
    }
  },

  // Get random items from array
  getRandomItems(array, count) {
    const shuffled = this.shuffle(array);
    return shuffled.slice(0, count);
  },

  // Calculate percentage
  calculatePercentage(part, total) {
    if (total === 0) return 0;
    return Math.round((part / total) * 100);
  },

  // Get streak days
  calculateStreak(lastStudyDate) {
    if (!lastStudyDate) return 0;

    const last = new Date(lastStudyDate);
    const today = new Date();

    // Reset time to midnight for accurate day comparison
    last.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const diffTime = today - last;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // If last study was today, continue streak
    if (diffDays === 0) return true;
    // If last study was yesterday, continue streak
    if (diffDays === 1) return true;
    // Otherwise, streak is broken
    return false;
  },

  // Get current date string (YYYY-MM-DD)
  getCurrentDate() {
    const today = new Date();
    return today.toISOString().split('T')[0];
  },

  // Search filter function
  searchWords(words, query) {
    if (!query || query.trim() === '') return words;

    const lowerQuery = query.toLowerCase().trim();
    return words.filter(word => {
      return (
        word.word.toLowerCase().includes(lowerQuery) ||
        word.definition.toLowerCase().includes(lowerQuery) ||
        word.synonyms.some(syn => syn.toLowerCase().includes(lowerQuery))
      );
    });
  },

  // Apply difficulty filter
  filterByDifficulty(words, difficulty) {
    if (difficulty === 'all') return words;
    return words.filter(word => word.difficulty === difficulty);
  },

  // Apply status filter
  filterByStatus(words, status, learnedIds) {
    if (status === 'all') return words;
    if (status === 'learned') {
      return words.filter(word => learnedIds.includes(word.id));
    }
    if (status === 'unlearned') {
      return words.filter(word => !learnedIds.includes(word.id));
    }
    return words;
  },

  // Sanitize HTML to prevent XSS
  sanitizeHTML(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
  },

  // Show toast notification
  showToast(message, type = 'info') {
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: calc(var(--bottom-nav-height) + 20px);
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 24px;
      background-color: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--error)' : 'var(--primary)'};
      color: white;
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      z-index: var(--z-tooltip);
      animation: slideUp 0.3s ease;
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideDown 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  // Local storage helpers with error handling
  storage: {
    get(key, defaultValue = null) {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      } catch (error) {
        console.error('Error reading from localStorage:', error);
        return defaultValue;
      }
    },

    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.error('Error writing to localStorage:', error);
        return false;
      }
    },

    remove(key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (error) {
        console.error('Error removing from localStorage:', error);
        return false;
      }
    }
  }
};

// Add slide animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideUp {
    from {
      transform: translateX(-50%) translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
  }
  @keyframes slideDown {
    from {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
    to {
      transform: translateX(-50%) translateY(20px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
