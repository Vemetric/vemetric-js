import https from 'https';

export type Options = {
  apiKey: string;
  url?: string;
};

const DEFAULT_OPTIONS: Options = {
  apiKey: '',
  url: 'https://hub.vemetric.com',
};

function getBasicEventHeaders(apiKey: string) {
  return {
    'Api-Key': apiKey,
  };
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
      const data = payload ? JSON.stringify(payload) : undefined;

      const req = https.request(
        `${this.options.url}${path}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': data ? Buffer.byteLength(data) : undefined,
            ...headers,
          },
        },
        (res) => {
          if (typeof res.statusCode === 'number' && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res);
          } else {
            reject({
              status: res.statusCode,
              statusText: res.statusMessage,
            });
          }
        },
      );

      req.on('error', (e) => {
        console.error('Error sending request', e);
        reject({
          statusText: 'Unknown error',
        });
      });

      req.write(data);
      req.end();
    });
  }

  async trackEvent(name: string, userIdentifier: string, customData?: Record<string, unknown>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = {
      name,
      userIdentifier,
    };
    if (customData) {
      payload.customData = customData;
    }

    const headers = getBasicEventHeaders(this.options.apiKey);
    await this.sendRequest('/e', payload, headers);
  }
}
