// coolLogger.ts

interface LogOptions {
  timestamp?: boolean;
  prefix?: string;
  showStack?: boolean;
}

// ANSI escape codes for colors and styles
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  gray: '\x1b[90m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

export class Logger {
  private static defaultOptions: LogOptions = {
    timestamp: true,
    showStack: false
  };

  private static loadingTimer: NodeJS.Timer | null = null;

  private static getTimestamp(): string {
    return `${colors.gray}[${new Date().toISOString()}]${colors.reset}`;
  }

  private static colorize(text: string, color: keyof typeof colors, bold: boolean = false): string {
    return `${colors[color]}${bold ? colors.bold : ''}${text}${colors.reset}`;
  }

  private static formatMessage(message: string, options: LogOptions = {}): string {
    const opts = { ...this.defaultOptions, ...options };
    const parts: string[] = [];

    if (opts.timestamp) {
      parts.push(this.getTimestamp());
    }

    if (opts.prefix) {
      parts.push(this.colorize(`[${opts.prefix}]`, 'cyan'));
    }

    parts.push(message);

    if (opts.showStack) {
      const stack = new Error().stack?.split('\n').slice(3).join('\n');
      parts.push('\n' + this.colorize(stack || '', 'gray'));
    }

    return parts.join(' ');
  }

  static array(title: string, items: string[], options: LogOptions = {}): void {
    this.clearLoading();
    
    // Print title
    console.log(this.formatMessage(`${this.colorize('⊙', 'blue')} ${this.colorize(title, 'blue')}:`, options));
    
    // Print items with bullets and indentation
    items.forEach(item => {
      console.log(this.formatMessage(
        `   ${this.colorize('•', 'gray')} ${this.colorize(item, 'white')}`,
        { ...options, timestamp: false }
      ));
    });
  }

  static success(message: string, options?: LogOptions): void {
    this.clearLoading();
    console.log(this.formatMessage(`${this.colorize('✔', 'green')} ${this.colorize(message, 'green', true)}`, options));
  }

  static info(message: string, options?: LogOptions): void {
    this.clearLoading();
    console.log(this.formatMessage(`${this.colorize('ℹ', 'blue')} ${this.colorize(message, 'blue')}`, options));
  }

  static result(message: string, result: string, options?: LogOptions): void {
    this.clearLoading();
    console.log(this.formatMessage(
      `${this.colorize('ℹ', 'blue')} ${this.colorize(message, 'blue')}: ${this.colorize(result, 'white', true)}`,
      options
    ));
  }

  static warn(message: string, options?: LogOptions): void {
    this.clearLoading();
    console.log(this.formatMessage(`${this.colorize('⚠', 'yellow')} ${this.colorize(message, 'yellow')}`, options));
  }

  static error(message: string | Error, options?: LogOptions): void {
    this.clearLoading();
    if (message instanceof Error) {
      console.error(this.formatMessage(
        `${this.colorize('✖', 'red')} ${this.colorize(message.message, 'red', true)}`,
        { ...options, showStack: true }
      ));
    } else {
      console.error(this.formatMessage(`${this.colorize('✖', 'red')} ${this.colorize(message, 'red', true)}`, options));
    }
  }

  static fatal(message: string | Error, options?: LogOptions): void {
    this.error(message, options);
    process.exit(1);
  }

  static debug(message: string, options?: LogOptions): void {
    this.clearLoading();
    console.log(this.formatMessage(`${this.colorize('🔍', 'magenta')} ${this.colorize(message, 'magenta')}`, options));
  }

  static trace(message: string, options?: LogOptions): void {
    this.clearLoading();
    console.log(this.formatMessage(`${this.colorize('↪', 'cyan')} ${this.colorize(message, 'cyan')}`, {
      ...options,
      showStack: true
    }));
  }

  static rainbow(message: string, options?: LogOptions): void {
    const rainbowColors: (keyof typeof colors)[] = ['red', 'yellow', 'green', 'cyan', 'blue', 'magenta'];
    
    const rainbowText = message
      .split('')
      .map((char, i) => this.colorize(char, rainbowColors[i % rainbowColors.length]))
      .join('');

    console.log(this.formatMessage(`🌈 ${rainbowText}`, options));
  }

  private static clearLoading() {
    if (this.loadingTimer) {
      clearInterval(this.loadingTimer);
      this.loadingTimer = null;
      // Clear the loading line
      process.stdout.write('\r' + ' '.repeat(100) + '\r');
    }
  }

  static loading(message: string, options: LogOptions = {}): void {
    // Clear any existing loading state
    this.clearLoading();

    const spinners = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let i = 0;
    
    this.loadingTimer = setInterval(() => {
      process.stdout.write('\r' + this.formatMessage(
        `${this.colorize(spinners[i], 'cyan')} ${this.colorize(message, 'cyan')}`,
        options
      ) + ' '.repeat(20));
      i = (i + 1) % spinners.length;
    }, 80);
  }
}