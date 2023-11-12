type Options = {
  apiUrl?: string;
};

const DEFAULT_OPTIONS: Options = {
  apiUrl: 'https://api.vemetric.com',
};

class Vemetric {
  private options: Options = DEFAULT_OPTIONS;

  init(options?: Options) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  track() {
    console.log('track');
  }
}

export const vemetric = new Vemetric();
