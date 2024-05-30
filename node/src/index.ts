export type Options = {
  apiKey: string;
  url?: string;
};

const DEFAULT_OPTIONS: Options = {
  apiKey: '',
  url: 'https://hub.vemetric.com',
};

function getBasicEventHeaders() {
  return {};
}

export class VemetricClient {
  private options: Options = DEFAULT_OPTIONS;

  constructor(options: Options) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
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

  async trackEvent(name: string, customData?: Record<string, unknown>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = {
      name,
    };
    if (customData) {
      payload.customData = customData;
    }

    const headers = getBasicEventHeaders();
    await this.sendRequest('/e', payload, headers);
  }
}
