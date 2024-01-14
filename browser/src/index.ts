type Options = {
  url?: string;
};

const DEFAULT_OPTIONS: Options = {
  url: 'https://hub.vemetric.com',
};

function getBasicEventData() {
  return {
    url: window.location.href,
  };
}

function getBasicEventHeaders() {
  let referrer = document.referrer || undefined;
  if (referrer === window.location.href) {
    referrer = undefined;
  }

  return {
    'v-referrer': referrer || undefined,
  };
}

class Vemetric {
  private options: Options = DEFAULT_OPTIONS;
  private isInitialized = false;
  private identifier?: string;

  init(options?: Options) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.isInitialized = true;
  }

  private checkInitialized() {
    if (!this.isInitialized) {
      throw new Error('Vemetric is not initialized yet.');
    }
  }

  private sendRequest(path: string, payload?: Record<string, unknown>, headers?: Record<string, string | undefined>) {
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
    req.send(payload ? JSON.stringify(payload) : undefined);
  }

  trackPageView() {
    this.checkInitialized();

    const payload = {
      ...getBasicEventData(),
    };

    const headers = getBasicEventHeaders();

    this.sendRequest('/p', payload, headers);
  }

  trackEvent(name: string, customData?: Record<string, unknown>) {
    this.checkInitialized();

    const payload = {
      ...getBasicEventData(),
      name,
      customData,
    };

    const headers = getBasicEventHeaders();

    this.sendRequest('/e', payload, headers);
  }

  resetUser() {
    this.checkInitialized();
    this.identifier = undefined;

    // TODO: implement on backend side
    this.sendRequest('/r');
  }

  identify(identifier: string) {
    this.checkInitialized();

    if (this.identifier === identifier) {
      return;
    }

    this.identifier = identifier;
    const payload = {
      id: identifier,
    };

    this.sendRequest('/i', payload);
    // TODO: error handling, reset identifier
  }
}

export const vemetric = new Vemetric();
