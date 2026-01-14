import crypto from "crypto";

class MembershipHub {
  constructor(config) {
    this.hubUrl = config.hubUrl ? config.hubUrl.replace(/\/$/, "") : "";
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
    url.searchParams.append("service_id", this.serviceId);
    url.searchParams.append("return_to", returnTo);
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
    url.searchParams.append("return_to", returnTo);
    if (userId) url.searchParams.append("user_id", userId);
    return url.toString();
  }

  /**
   * Validates a token received from the hub after login
   * @param {string} token - The JWT token from query params
   */
  async validateToken(token) {
    try {
      console.log("[MembershipHub] Validating token with hub:", this.hubUrl);
      
      const response = await fetch(`${this.hubUrl}/api/saas/validate-token`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();
      console.log("[MembershipHub] Hub response status:", response.status);
      console.log("[MembershipHub] Hub response data:", data);
      
      // Handle CSRF error specifically
      if (data.code === "CSRF_ERROR" || data.message?.includes("CSRF")) {
        console.error("[MembershipHub] CSRF error detected - hub endpoint needs CSRF exemption");
        return { 
          valid: false, 
          error: "CSRF protection blocking API request. Hub needs to exempt /api/saas/validate-token from CSRF middleware.",
          csrfError: true,
          originalResponse: data
        };
      }
      
      // Handle both { success: true } and { valid: true } response formats
      const isValid = data.valid === true || data.success === true;
      
      if (isValid) {
        return {
          valid: true,
          user: data.user,
          subscription: data.subscription,
          subscriptions: data.subscriptions
        };
      }
      
      // Return error response
      return {
        valid: false,
        error: data.message || data.error || "Token validation failed",
        originalResponse: data
      };
      
    } catch (error) {
      console.error("[MembershipHub] Token validation request failed:", error);
      return { valid: false, error: `Connection failed: ${error.message}` };
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
          headers: { Authorization: `Bearer ${this.apiKey}` },
        }
      );

      return await response.json();
    } catch (error) {
      console.error("MembershipHub: Failed to fetch user limits", error);
      return null;
    }
  }

  /**
   * Lists available packages for your service
   */
  async getPackages() {
    try {
      const response = await fetch(
        `${this.hubUrl}/saas/api/packages/${this.serviceId}`,
        {
          headers: { Authorization: `Bearer ${this.apiKey}` },
        }
      );

      return await response.json();
    } catch (error) {
      console.error("MembershipHub: Failed to fetch packages", error);
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

    const bodyString = typeof body === "string" ? body : JSON.stringify(body);
    const expectedSignature = crypto
      .createHmac("sha256", this.webhookSecret)
      .update(bodyString)
      .digest("hex");

    return signature === expectedSignature;
  }
}

export default MembershipHub;
