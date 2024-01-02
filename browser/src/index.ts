import { customAlphabet } from 'nanoid';

const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const customId = customAlphabet(alphabet, 21);

type Options = {
  url?: string;
};

const generateUserId = () => {
  return customId();
};

const COOKIE_NAME = '_vuid';

const DEFAULT_OPTIONS: Options = {
  url: 'https://hub.vemetric.com',
};

class Vemetric {
  private options: Options = DEFAULT_OPTIONS;

  init(options?: Options) {
    this.options = { ...DEFAULT_OPTIONS, ...options };

    const cookieNames = document.cookie.split(/; */).map(function (cookie) {
      const keyValue = cookie.split('=');
      return keyValue[0];
    });

    const hasUserIdCookie = cookieNames.some((cookieName) => cookieName === COOKIE_NAME);
    if (!hasUserIdCookie) {
      const userId = generateUserId();
      const domain = window.location.hostname.split('.').slice(-2).join('.');
      const expiresAt = new Date();
      expiresAt.setTime(expiresAt.getTime() + 63072e6);
      document.cookie = `${COOKIE_NAME}=${userId};path=/;SameSite=Lax;expires=${expiresAt.toUTCString()};domain=${domain}`;
    }
  }

  track() {
    const payload = {
      o: window.location.href,
    };

    const req = new XMLHttpRequest();
    req.open('POST', `${this.options.url}/e`, true);
    req.withCredentials = true;
    req.setRequestHeader('Content-Type', 'application/json');
    req.send(JSON.stringify(payload));
  }
}

export const vemetric = new Vemetric();
