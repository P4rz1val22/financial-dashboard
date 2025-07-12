// utils/rateLimiting.ts

export interface RateLimitResult {
  allowed: boolean;
  reason?: "basic_cooldown" | "burst_protection" | "hourly_limit";
  waitTime?: number;
}

export class RateLimiter {
  private static readonly STORAGE_KEY = "financial-dashboard-refresh-history";
  private static readonly BASIC_COOLDOWN = 30000;
  private static readonly BURST_LIMIT = 3;
  private static readonly BURST_WINDOW = 2 * 60 * 1000;
  private static readonly HOURLY_LIMIT = 20;
  private static readonly HOURLY_WINDOW = 60 * 60 * 1000;

  static getRefreshHistory(): Date[] {
    try {
      const stored = sessionStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];

      const parsed = JSON.parse(stored);
      return parsed.map((timestamp: string) => new Date(timestamp));
    } catch {
      return [];
    }
  }

  static addToRefreshHistory(timestamp: Date): void {
    try {
      const history = this.getRefreshHistory();
      const newHistory = [...history, timestamp].slice(-10);
      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(newHistory));
    } catch {}
  }

  static isRefreshAllowed(lastManualRefresh: Date | null): RateLimitResult {
    const now = new Date();
    const history = this.getRefreshHistory();

    // Rule 1: Basic cooldown (30 seconds)
    if (lastManualRefresh) {
      const timeSinceLastRefresh = now.getTime() - lastManualRefresh.getTime();
      if (timeSinceLastRefresh < this.BASIC_COOLDOWN) {
        return {
          allowed: false,
          reason: "basic_cooldown",
          waitTime: Math.ceil(
            (this.BASIC_COOLDOWN - timeSinceLastRefresh) / 1000
          ),
        };
      }
    }

    // Rule 2: Burst protection (max 3 refreshes in 2 minutes)
    const burstWindowStart = new Date(now.getTime() - this.BURST_WINDOW);
    const recentRefreshes = history.filter(
      (timestamp) => timestamp > burstWindowStart
    );

    if (recentRefreshes.length >= this.BURST_LIMIT) {
      const oldestRecent = recentRefreshes[0];
      const waitTime = Math.ceil(
        (this.BURST_WINDOW - (now.getTime() - oldestRecent.getTime())) / 1000
      );
      return {
        allowed: false,
        reason: "burst_protection",
        waitTime: waitTime,
      };
    }

    // Rule 3: Hourly limit (max 20 refreshes per hour)
    const hourlyWindowStart = new Date(now.getTime() - this.HOURLY_WINDOW);
    const hourlyRefreshes = history.filter(
      (timestamp) => timestamp > hourlyWindowStart
    );

    if (hourlyRefreshes.length >= this.HOURLY_LIMIT) {
      const oldestHourly = hourlyRefreshes[0];
      const waitTime = Math.ceil(
        (this.HOURLY_WINDOW - (now.getTime() - oldestHourly.getTime())) / 1000
      );
      return {
        allowed: false,
        reason: "hourly_limit",
        waitTime: waitTime,
      };
    }

    return { allowed: true };
  }

  static getErrorMessage(rateLimit: RateLimitResult): string {
    if (rateLimit.allowed) return "";

    switch (rateLimit.reason) {
      case "burst_protection":
        return `Too many refreshes! Wait ${rateLimit.waitTime}s (max ${this.BURST_LIMIT} per 2 minutes)`;
      case "hourly_limit":
        return `Hourly limit reached! Wait ${Math.ceil(
          rateLimit.waitTime! / 60
        )} minutes`;
      default:
        return `Please wait ${rateLimit.waitTime} seconds before refreshing again`;
    }
  }

  static getButtonText(rateLimit: RateLimitResult, isLoading: boolean): string {
    if (isLoading) return "Refreshing...";

    if (!rateLimit.allowed) {
      switch (rateLimit.reason) {
        case "burst_protection":
          return `Wait ${rateLimit.waitTime}s (burst limit)`;
        case "hourly_limit":
          return `Wait ${Math.ceil(rateLimit.waitTime! / 60)}m (hourly limit)`;
        default:
          return `Refresh in ${rateLimit.waitTime}s`;
      }
    }

    return "Refresh All";
  }
}
