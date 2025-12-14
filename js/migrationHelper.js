/**
 * Migration Helper
 * Helps migrate data from localStorage to MongoDB
 */

const MigrationHelper = {
  /**
   * Export all localStorage data
   */
  exportLocalStorageData() {
    try {
      const users = JSON.parse(localStorage.getItem('vocabUsers') || '[]');
      const currentUser = localStorage.getItem('vocabCurrentUser');
      const progressData = {};

      // Export progress for each user
      users.forEach(user => {
        const key = `vocabProgress_${user.id}`;
        const progress = localStorage.getItem(key);
        if (progress) {
          try {
            progressData[user.id] = JSON.parse(progress);
          } catch (error) {
            console.error(`Failed to parse progress for user ${user.id}:`, error);
          }
        }
      });

      console.log('Exported localStorage data:', {
        userCount: users.length,
        currentUser,
        progressKeys: Object.keys(progressData)
      });

      return {
        users,
        currentUser,
        progressData
      };
    } catch (error) {
      console.error('Error exporting localStorage data:', error);
      throw error;
    }
  },

  /**
   * Upload localStorage data to MongoDB
   */
  async uploadToMongoDB(data) {
    try {
      console.log('Uploading data to MongoDB...');
      const result = await ApiClient.importLocalStorageData(data);
      console.log('Upload successful:', result);
      return result;
    } catch (error) {
      console.error('Error uploading to MongoDB:', error);
      throw error;
    }
  },

  /**
   * Perform full migration
   */
  async migrate() {
    try {
      // Step 1: Export localStorage data
      console.log('Step 1: Exporting localStorage data...');
      const data = this.exportLocalStorageData();

      if (data.users.length === 0) {
        throw new Error('No users found in localStorage');
      }

      // Step 2: Upload to MongoDB
      console.log('Step 2: Uploading to MongoDB...');
      const result = await this.uploadToMongoDB(data);

      // Step 3: Verify migration
      console.log('Step 3: Verifying migration...');
      const imported = result.details?.imported || [];
      const failed = result.details?.errors || [];

      console.log(`Migration complete: ${imported.length} users imported, ${failed.length} failed`);

      if (failed.length > 0) {
        console.warn('Some users failed to migrate:', failed);
      }

      return {
        success: true,
        imported: imported.length,
        failed: failed.length,
        details: result.details
      };

    } catch (error) {
      console.error('Migration failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Check if migration is needed
   */
  needsMigration() {
    const users = JSON.parse(localStorage.getItem('vocabUsers') || '[]');
    return users.length > 0;
  },

  /**
   * Download localStorage data as JSON file (backup)
   */
  downloadBackup() {
    try {
      const data = this.exportLocalStorageData();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `vocab-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('Backup downloaded successfully');
    } catch (error) {
      console.error('Error downloading backup:', error);
      throw error;
    }
  },

  /**
   * Show migration UI
   */
  showMigrationPrompt() {
    if (!this.needsMigration()) {
      console.log('No migration needed');
      return false;
    }

    const users = JSON.parse(localStorage.getItem('vocabUsers') || '[]');
    const message = `
You have ${users.length} user${users.length !== 1 ? 's' : ''} in localStorage.

Would you like to migrate your data to the cloud (MongoDB)?

This will:
✓ Save all your progress to the cloud
✓ Enable access from multiple devices
✓ Protect your data from browser cache clearing

Your localStorage data will be preserved as a backup.
    `;

    return confirm(message.trim());
  }
};

// Make globally available
if (typeof window !== 'undefined') {
  window.MigrationHelper = MigrationHelper;
}
