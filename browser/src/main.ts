import { vemetric, type Options } from './index';

const scriptElement = document.currentScript as HTMLScriptElement;
const options: Options = {};
if (scriptElement) {
  const url = scriptElement.getAttribute('data-url');
  if (url) {
    options.url = url;
  }
}

vemetric.init(options);
// @ts-expect-error - Expose the vemetric function to the window object
window.Vemetric = vemetric;
