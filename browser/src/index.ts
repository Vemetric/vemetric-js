declare global {
  interface Window {
    _vmCtx: string | null;
  }
}

export type Options = {
  url?: string;
  trackPageViews?: boolean;
  trackOutboundLinks?: boolean;
};

const DEFAULT_OPTIONS: Options = {
  url: 'https://hub.vemetric.com',
  trackPageViews: true,
  trackOutboundLinks: true,
};

const KEY_IDENTIFIER = '_vmId';
const KEY_DISPLAY_NAME = '_vmDn';
const KEY_CONTEXT_ID = '_vmCtx';

function getContextId() {
  if (!sessionStorage.getItem(KEY_CONTEXT_ID)) {
    sessionStorage.setItem(KEY_CONTEXT_ID, (Math.random() + '').replace('0.', ''));
  }

  return sessionStorage.getItem(KEY_CONTEXT_ID);
}

function getUserIdentifier() {
  return localStorage.getItem(KEY_IDENTIFIER) || undefined;
}

function getUserDisplayName() {
  return localStorage.getItem(KEY_DISPLAY_NAME) || undefined;
}

function getCurrentUrl() {
  return window.location.href;
}

function getBasicEventData() {
  return {
    url: getCurrentUrl(),
    contextId: getContextId(),
    identifier: getUserIdentifier(),
    displayName: getUserDisplayName(),
  };
}

function getBasicEventHeaders() {
  let referrer = document.referrer || undefined;
  if (referrer === getCurrentUrl()) {
    referrer = undefined;
  }

  return {
    'v-referrer': referrer || undefined,
  };
}

type UserDataProps = {
  set?: object;
  setOnce?: object;
  unset?: Array<string>;
};

type IdentifyProps = {
  identifier: string;
  displayName?: string;
  data?: UserDataProps;
};

class Vemetric {
  private options: Options = DEFAULT_OPTIONS;
  private isInitialized = false;
  private isIdentifying = false;
  private lastViewedPage?: string;

  init(options?: Options) {
    if (this.isInitialized) {
      return;
    }

    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.isInitialized = true;

    window.addEventListener('beforeunload', () => {
      this.trackEvent('$$pageLeave', undefined, true);
    });

    if (this.options.trackPageViews) {
      this.trackPageView();
      this.enableTrackPageViews();
    }
    if (this.options.trackOutboundLinks) {
      this.enableTrackOutboundLinks();
    }
  }

  private checkInitialized() {
    if (!this.isInitialized) {
      throw new Error('Vemetric is not initialized yet.');
    }
  }

  private async sendRequest(
    path: string,
    payload?: Record<string, unknown>,
    headers?: Record<string, string | undefined>,
  ) {
    return new Promise((resolve, reject) => {
      const req = new XMLHttpRequest();
      req.open('POST', `${this.options.url}${path}`, true);
      req.withCredentials = true;
      req.setRequestHeader('Content-Type', 'application/json');
      if (headers) {
        Object.entries(headers).forEach(([key, value]) => {
          if (!value) {
            return;
          }

          req.setRequestHeader(key, value);
        });
      }

      req.onload = function () {
        if (req.status >= 200 && req.status < 300) {
          resolve(req.response);
        } else {
          reject({
            status: req.status,
            statusText: req.statusText,
          });
        }
      };
      req.onerror = function () {
        reject({
          status: req.status,
          statusText: req.statusText,
        });
      };

      req.send(payload ? JSON.stringify(payload) : undefined);
    });
  }

  trackPageView() {
    this.checkInitialized();

    const currentUrl = getCurrentUrl();
    if (this.lastViewedPage === currentUrl) {
      return;
    }
    this.lastViewedPage = currentUrl;

    this.trackEvent('$$pageView');
  }

  async trackEvent(name: string, customData?: Record<string, unknown>, beacon?: boolean) {
    this.checkInitialized();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = {
      ...getBasicEventData(),
      name,
    };
    if (customData) {
      payload.customData = customData;
    }

    if (beacon) {
      const headers = {
        type: 'application/json',
      };
      const blob = new Blob([JSON.stringify(payload)], headers);
      navigator.sendBeacon(`${this.options.url}/e`, blob);
    } else {
      const headers = getBasicEventHeaders();
      await this.sendRequest('/e', payload, headers);
    }
  }

  async identify({ identifier, displayName, data }: IdentifyProps) {
    this.checkInitialized();
    if (this.isIdentifying) {
      return;
    }
    this.isIdentifying = true;

    localStorage.setItem(KEY_IDENTIFIER, identifier);
    if (displayName) {
      localStorage.setItem(KEY_DISPLAY_NAME, displayName);
    } else {
      localStorage.removeItem(KEY_DISPLAY_NAME);
    }

    const payload = {
      identifier,
      displayName,
      data,
    };

    try {
      await this.sendRequest('/i', payload);
    } catch {
      localStorage.removeItem(KEY_IDENTIFIER);
      localStorage.removeItem(KEY_DISPLAY_NAME);
    } finally {
      this.isIdentifying = false;
    }
  }

  async resetUser() {
    this.checkInitialized();
    localStorage.removeItem(KEY_IDENTIFIER);
    localStorage.removeItem(KEY_DISPLAY_NAME);
    await this.sendRequest('/r');
  }

  enableTrackPageViews() {
    const pageView = () => this.trackPageView();

    const originalPushState = window.history.pushState;
    if (originalPushState) {
      window.history.pushState = function (...args) {
        originalPushState.apply(this, args);
        pageView();
      };
      window.addEventListener('popstate', pageView);
    }

    window.addEventListener('hashchange', pageView);
  }

  enableTrackOutboundLinks() {
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target.tagName !== 'A') {
        return;
      }

      const href = target.getAttribute('href');
      if (!href) {
        return;
      }

      const url = new URL(href, getCurrentUrl());
      if (url.origin !== window.location.origin) {
        this.trackEvent('$$outboundLink', { href }, true);
      }
    });
  }
}

export const vemetric = new Vemetric();
