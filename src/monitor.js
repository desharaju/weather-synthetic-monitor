const EventEmitter = require('events');

class Monitor extends EventEmitter {
  constructor({ name, url, method = 'GET', headers = {}, validators = [], timeout = 10000 }) {
    super();
    this.name = name;
    this.url = url;
    this.method = method;
    this.headers = headers;
    this.validators = validators;
    this.timeout = timeout;
    this.status = 'idle'; // idle | healthy | degraded | down
    this.lastResult = null;
  }

  async runCheck() {
    const startTime = Date.now();
    const result = {
      monitor: this.name,
      url: this.url,
      timestamp: new Date().toISOString(),
      responseTime: null,
      statusCode: null,
      success: false,
      errors: [],
    };

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(this.url, {
        method: this.method,
        headers: this.headers,
        signal: controller.signal,
      });

      clearTimeout(timer);

      result.responseTime = Date.now() - startTime;
      result.statusCode = response.status;

      if (!response.ok) {
        result.errors.push(`HTTP ${response.status} ${response.statusText}`);
      }

      let body = null;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          body = await response.json();
        } catch (e) {
          result.errors.push('Invalid JSON response body');
        }
      }

      // Run validators
      for (const validator of this.validators) {
        try {
          const validationResult = validator(body, response);
          if (validationResult !== true) {
            result.errors.push(validationResult || 'Validation failed');
          }
        } catch (e) {
          result.errors.push(`Validator error: ${e.message}`);
        }
      }

      result.success = result.errors.length === 0;
    } catch (err) {
      result.responseTime = Date.now() - startTime;
      if (err.name === 'AbortError') {
        result.errors.push(`Request timed out after ${this.timeout}ms`);
      } else {
        result.errors.push(`Network error: ${err.message}`);
      }
    }

    // Update status
    const prevStatus = this.status;
    if (result.success) {
      this.status = 'healthy';
    } else if (result.statusCode && result.statusCode >= 200 && result.statusCode < 500) {
      this.status = 'degraded';
    } else {
      this.status = 'down';
    }

    this.lastResult = result;

    // Emit events
    if (result.success) {
      this.emit('check:pass', result);
    } else {
      this.emit('check:fail', result);
    }

    if (prevStatus !== this.status) {
      this.emit('status:change', { from: prevStatus, to: this.status, result });
    }

    return result;
  }
}

module.exports = Monitor;
