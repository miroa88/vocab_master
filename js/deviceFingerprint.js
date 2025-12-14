// Lightweight device fingerprint helper
// Captures non-PII signals to bind certification keys to a device

window.DeviceFingerprint = {
  getCanvasHash() {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = "14px 'Arial'";
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('device-fingerprint', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('device-fingerprint', 4, 17);
      const data = canvas.toDataURL();
      let hash = 0;
      for (let i = 0; i < data.length; i++) {
        hash = ((hash << 5) - hash) + data.charCodeAt(i);
        hash |= 0;
      }
      return hash.toString(16);
    } catch (e) {
      return '';
    }
  },

  getDeviceInfo() {
    const screenResolution = `${window.screen.width}x${window.screen.height}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    return {
      userAgent: navigator.userAgent || '',
      language: navigator.language || '',
      platform: navigator.platform || '',
      screenResolution,
      timezone,
      canvas: this.getCanvasHash()
    };
  }
};
