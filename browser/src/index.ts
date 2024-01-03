type Options = {
  url?: string;
};

const DEFAULT_OPTIONS: Options = {
  url: 'https://hub.vemetric.com',
};

class Vemetric {
  private options: Options = DEFAULT_OPTIONS;
  private identifier?: string;

  init(options?: Options) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  private sendRequest(path: string, payload?: object) {
    const req = new XMLHttpRequest();
    req.open('POST', `${this.options.url}${path}`, true);
    req.withCredentials = true;
    req.setRequestHeader('Content-Type', 'application/json');
    req.send(payload ? JSON.stringify(payload) : undefined);
  }

  track() {
    // TODO: check if init has been called

    const payload = {
      o: window.location.href,
    };

    this.sendRequest('/e', payload);
  }

  resetUser() {
    // TODO: check if init has been called
    this.identifier = undefined;

    this.sendRequest('/r');
  }

  identify(identifier: string) {
    // TODO: check if init has been called

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
