declare global {
  interface Window {
    _vmCtx: string | null;
  }
}

type Options = {
  url?: string;
  trackPageViews?: boolean;
  trackOutboundLinks?: boolean;
};

const DEFAULT_OPTIONS: Options = {
  url: 'https://hub.vemetric.com',
  trackPageViews: true,
  trackOutboundLinks: true,
};

const CONTEXT_KEY = '_vmCtx';
function getContextId() {
  if (!sessionStorage.getItem(CONTEXT_KEY)) {
    sessionStorage.setItem(CONTEXT_KEY, (Math.random() + '').replace('0.', ''));
  }

  return sessionStorage.getItem(CONTEXT_KEY);
}

function getCurrentUrl() {
  return window.location.href;
}

function getBasicEventData() {
  return {
    url: getCurrentUrl(),
    contextId: getContextId(),
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

class Vemetric {
  private options: Options = DEFAULT_OPTIONS;
  private isInitialized = false;
  private identifier?: string;
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

  async resetUser() {
    this.checkInitialized();
    this.identifier = undefined;
    await this.sendRequest('/r');
  }

  async identify(identifier: string, userData?: UserDataProps) {
    this.checkInitialized();

    if (this.identifier === identifier) {
      return;
    }

    this.identifier = identifier;
    const payload = {
      id: identifier,
      userData,
    };

    try {
      await this.sendRequest('/i', payload);
    } catch {
      this.identifier = undefined;
    }
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
