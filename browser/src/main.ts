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

  const trackPageViews = scriptElement.getAttribute('data-track-page-views');
  if (trackPageViews) {
    options.trackPageViews = trackPageViews !== 'false';
  }
  const trackOutboundLinks = scriptElement.getAttribute('data-track-outbound-links');
  if (trackOutboundLinks) {
    options.trackOutboundLinks = trackOutboundLinks !== 'false';
  }
  const trackDataAttributes = scriptElement.getAttribute('data-track-data-attributes');
  if (trackDataAttributes) {
    options.trackDataAttributes = trackDataAttributes !== 'false';
  }

  const maskPaths = scriptElement.getAttribute('data-mask-paths');
  if (maskPaths) {
    try {
      options.maskPaths = JSON.parse(maskPaths);
    } catch (e) {
      console.warn('Failed to parse mask paths:', e);
    }
  }
}

vemetric.init(options);
// @ts-expect-error - Expose the vemetric function to the window object
window.Vemetric = vemetric;
