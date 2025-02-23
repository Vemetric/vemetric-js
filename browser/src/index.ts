import { retry } from './retry';

declare global {
  interface Window {
    _vmCtx: string | null;
  }
}

export type Options = {
  token: string;
  host?: string;
  trackPageViews?: boolean;
  trackOutboundLinks?: boolean;
  allowCookies?: boolean;
};

const DEFAULT_OPTIONS: Options = {
  token: '',
  host: 'https://hub.vemetric.com',
  trackPageViews: true,
  trackOutboundLinks: true,
  allowCookies: false,
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
  return sessionStorage.getItem(KEY_IDENTIFIER) || undefined;
}

function getUserDisplayName() {
  return sessionStorage.getItem(KEY_DISPLAY_NAME) || undefined;
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

function getBaseHeaders(options: Options) {
  let hostHeader: string | undefined = undefined;
  if (options.host && options.host !== DEFAULT_OPTIONS.host) {
    hostHeader = options.host;

    if (hostHeader?.startsWith('/')) {
      hostHeader = window.location.host;
    } else {
      hostHeader = new URL(options.host).host;
      if (hostHeader.startsWith('www.')) {
        hostHeader = hostHeader.slice(4);
      }
    }
  }

  return {
    Token: options.token,
    'Allow-Cookies': String(Boolean(options.allowCookies)),
    'V-Host': hostHeader,
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
  allowCookies?: boolean;
};

type EventProps = {
  eventData?: Record<string, unknown>;
  userData?: UserDataProps;
  beacon?: boolean;
};

class Vemetric {
  private options: Options = DEFAULT_OPTIONS;
  private isInitialized = false;
  private isIdentifying = false;
  private lastViewedPage?: string;

  init(options: Options) {
    if (this.isInitialized) {
      return;
    }

    if (!options.token || options.token.length < 3) {
      throw new Error('Please provide your Public Token.');
    }

    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.isInitialized = true;

    window.addEventListener('beforeunload', () => {
      this.trackPageLeave();
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
    _headers?: Record<string, string | undefined>,
  ) {
    return new Promise((resolve, reject) => {
      const req = new XMLHttpRequest();
      req.open('POST', `${this.options.host}${path}`, true);
      req.withCredentials = true;
      req.setRequestHeader('Content-Type', 'application/json');

      const baseHeaders = getBaseHeaders(this.options);
      const headers = { ...baseHeaders, ..._headers };
      Object.entries(headers).forEach(([key, value]) => {
        if (!value) {
          return;
        }

        req.setRequestHeader(key, value);
      });

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

  trackPageLeave() {
    this.checkInitialized();

    const payload = {
      ...getBasicEventData(),
    };

    const headers = {
      type: 'application/json',
    };
    const blob = new Blob([JSON.stringify({ ...payload, ...getBaseHeaders(this.options) })], headers);
    navigator.sendBeacon(`${this.options.host}/l`, blob);
  }

  async trackEvent(eventName: string, props: EventProps = {}) {
    const { eventData, userData, beacon = false } = props;
    this.checkInitialized();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = {
      ...getBasicEventData(),
      name: eventName,
    };
    if (eventData) {
      payload.customData = eventData;
    }
    if (userData) {
      payload.userData = userData;
    }

    if (beacon) {
      const headers = {
        type: 'application/json',
      };
      const blob = new Blob([JSON.stringify({ ...payload, ...getBaseHeaders(this.options) })], headers);
      navigator.sendBeacon(`${this.options.host}/e`, blob);
    } else {
      const headers = getBasicEventHeaders();
      await this.sendRequest('/e', payload, headers);
    }
  }

  async identify({ identifier, displayName, data, allowCookies: _allowCookies }: IdentifyProps) {
    this.checkInitialized();
    if (this.isIdentifying) {
      return;
    }
    this.isIdentifying = true;

    sessionStorage.setItem(KEY_IDENTIFIER, identifier);
    if (displayName) {
      sessionStorage.setItem(KEY_DISPLAY_NAME, displayName);
    } else {
      sessionStorage.removeItem(KEY_DISPLAY_NAME);
    }

    const payload = {
      identifier,
      displayName,
      data,
    };

    try {
      await this.sendRequest('/i', payload, {
        'Allow-Cookies': String(this.options.allowCookies || _allowCookies || false),
      });
    } catch {
      sessionStorage.removeItem(KEY_IDENTIFIER);
      sessionStorage.removeItem(KEY_DISPLAY_NAME);
    } finally {
      this.isIdentifying = false;
    }
  }

  updateUser(data: UserDataProps) {
    this.checkInitialized();

    retry({
      interval: 1000,
      maxRetries: 5,
      shouldRetry: () => this.isIdentifying,
      callback: () => this.sendRequest('/u', { data }),
    });
  }

  async resetUser() {
    this.checkInitialized();
    sessionStorage.removeItem(KEY_IDENTIFIER);
    sessionStorage.removeItem(KEY_DISPLAY_NAME);
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
        this.trackEvent('$$outboundLink', { eventData: { href }, beacon: true });
      }
    });
  }
}

export const vemetric = new Vemetric();
