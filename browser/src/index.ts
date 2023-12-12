type Options = {
  url?: string;
};

const DEFAULT_OPTIONS: Options = {
  url: 'https://hub.vemetric.com',
};

class Vemetric {
  private options: Options = DEFAULT_OPTIONS;

  init(options?: Options) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  track() {
    const payload = {
      o: window.location.href,
    };

    const req = new XMLHttpRequest();
    req.open('POST', `${this.options.url}/e`, true);
    req.setRequestHeader('Content-Type', 'application/json');
    req.send(JSON.stringify(payload));
  }
}

export const vemetric = new Vemetric();
