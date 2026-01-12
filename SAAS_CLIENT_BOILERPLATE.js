/**
 * ============================================================================
 * SAAS HUB CLIENT SDK (BOILERPLATE)
 * ============================================================================
 * 
 * Copy this file into your micro-SaaS project to easily integrate with the
 * Membership Hub.
 * 
 * Usage:
 * const hub = new MembershipHub({
 *   hubUrl: process.env.MEMBERSHIP_HUB_URL,
 *   serviceId: process.env.MEMBERSHIP_SERVICE_ID,
 *   apiKey: process.env.MEMBERSHIP_API_KEY,
 *   webhookSecret: process.env.MEMBERSHIP_WEBHOOK_SECRET
 * });
 */

const crypto = require('crypto');

class MembershipHub {
  constructor(config) {
    this.hubUrl = config.hubUrl.replace(/\/$/, '');
    this.serviceId = config.serviceId;
    this.apiKey = config.apiKey;
    this.webhookSecret = config.webhookSecret;
  }

  /**
   * Generates the URL to redirect users for login
   * @param {string} returnTo - The URL to redirect back to after login
   */
  getLoginUrl(returnTo) {
    const url = new URL(`${this.hubUrl}/saas/login`);
    url.searchParams.append('service_id', this.serviceId);
    url.searchParams.append('return_to', returnTo);
    return url.toString();
  }

  /**
   * Generates the URL to redirect users for checkout
   * @param {string} packageSlug - The slug of the package to buy
   * @param {string} returnTo - The URL to redirect back to after payment
   * @param {string} userId - (Optional) The ID of the user if already known
   */
  getCheckoutUrl(packageSlug, returnTo, userId = null) {
    const url = new URL(`${this.hubUrl}/saas/checkout/${this.serviceId}/${packageSlug}`);
    url.searchParams.append('return_to', returnTo);
    if (userId) url.searchParams.append('user_id', userId);
    return url.toString();
  }

  /**
   * Validates a token received from the hub after login
   * @param {string} token - The JWT token from query params
   */
  async validateToken(token) {
    try {
      const response = await fetch(`${this.hubUrl}/api/saas/validate-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
      });

      const data = await response.json();
      return data; // Returns { valid: true, user: {...}, subscriptions: [...] }
    } catch (error) {
      console.error('MembershipHub: Token validation failed', error);
      return { valid: false, error: 'Connection failed' };
    }
  }

  /**
   * Gets specific user limits for your service
   * @param {string|number} userId - The user ID from the hub
   */
  async getUserLimits(userId) {
    try {
      const response = await fetch(
        `${this.hubUrl}/api/saas/user/${userId}/limits?service_id=${this.serviceId}`,
        {
          headers: { 'Authorization': `Bearer ${this.apiKey}` }
        }
      );

      return await response.json();
    } catch (error) {
      console.error('MembershipHub: Failed to fetch user limits', error);
      return null;
    }
  }

  /**
   * Lists available packages for your service
   */
  async getPackages() {
    try {
      const response = await fetch(
        `${this.hubUrl}/api/saas/services/${this.serviceId}/packages`,
        {
          headers: { 'Authorization': `Bearer ${this.apiKey}` }
        }
      );

      return await response.json();
    } catch (error) {
      console.error('MembershipHub: Failed to fetch packages', error);
      return { success: false, packages: [] };
    }
  }

  /**
   * Verifies if a webhook request is legitimately from the hub
   * @param {Object} body - The raw request body
   * @param {string} signature - The X-Webhook-Signature header
   */
  verifyWebhook(body, signature) {
    if (!this.webhookSecret || !signature) return false;

    const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(bodyString)
      .digest('hex');

    return signature === expectedSignature;
  }
}

module.exports = MembershipHub;
