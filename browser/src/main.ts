import { vemetric, type Options } from './index';

const scriptElement = document.currentScript as HTMLScriptElement;
const options: Options = { token: '' };
if (scriptElement) {
  const token = scriptElement.getAttribute('data-token');
  if (token) {
    options.token = token;
  }

  const host = scriptElement.getAttribute('data-host');
  if (host) {
    options.host = host;
  }

  const allowCookies = scriptElement.getAttribute('data-allow-cookies');
  if (allowCookies) {
    options.allowCookies = allowCookies === 'true';
  }
}

vemetric.init(options);
// @ts-expect-error - Expose the vemetric function to the window object
window.Vemetric = vemetric;
