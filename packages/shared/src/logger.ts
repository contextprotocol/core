// coolLogger.ts
import chalk from 'chalk';

interface LogOptions {
  timestamp?: boolean;
  prefix?: string;
  showStack?: boolean;
}

export class Logger {
  private static defaultOptions: LogOptions = {
    timestamp: true,
    showStack: false
  };

  private static loadingTimer: NodeJS.Timer | null = null;

  private static getTimestamp(): string {
    return chalk.gray(`[${new Date().toISOString()}]`);
  }

  private static formatMessage(message: string, options: LogOptions = {}): string {
    const opts: any = { ...this.defaultOptions, ...options };
    const parts: any = [];

    if (opts.timestamp) {
      parts.push(this.getTimestamp());
    }

    if (opts.prefix) {
      parts.push(chalk.cyan(`[${opts.prefix}]`));
    }

    parts.push(message);

    if (opts.showStack) {
      const stack = new Error().stack?.split('\n').slice(3).join('\n');
      parts.push('\n' + chalk.gray(stack));
    }

    return parts.join(' ');
  }

  static array(title: string, items: string[], options: LogOptions = {}): void {
    this.clearLoading();
    
    // Print title
    console.log(this.formatMessage(`${chalk.blue('⊙')} ${chalk.blue(title)}:`, options));
    
    // Print items with bullets and indentation
    items.forEach((item, index) => {
      console.log(this.formatMessage(
        `   ${chalk.gray('•')} ${chalk.white(item)}`,
        { ...options, timestamp: false }
      ));
    });
  }

  static success(message: string, options?: LogOptions): void {
    this.clearLoading();
    console.log(this.formatMessage(`${chalk.green('✔')} ${chalk.green.bold(message)}`, options));
  }

  static info(message: string, options?: LogOptions): void {
    this.clearLoading();
    console.log(this.formatMessage(`${chalk.blue('ℹ')} ${chalk.blue(message)}`, options));
  }

  static result(message: string, result: string, options?: LogOptions): void {
    this.clearLoading();
    console.log(this.formatMessage(`${chalk.blue('ℹ')} ${chalk.blue(message)}: ${chalk.white.bold(result)}`, options));
  }

  static warn(message: string, options?: LogOptions): void {
    this.clearLoading();
    console.log(this.formatMessage(`${chalk.yellow('⚠')} ${chalk.yellow(message)}`, options));
  }

  static error(message: string | Error, options?: LogOptions): void {
    this.clearLoading();
    if (message instanceof Error) {
      console.error(this.formatMessage(`${chalk.red('✖')} ${chalk.red.bold(message.message)}`, {
        ...options,
        showStack: true
      }));
    } else {
      console.error(this.formatMessage(`${chalk.red('✖')} ${chalk.red.bold(message)}`, options));
    }
  }

  static fatal(message: string | Error, options?: LogOptions): void {
    this.error(message, options);
    process.exit(1);
  }

  static debug(message: string, options?: LogOptions): void {
    this.clearLoading();
    console.log(this.formatMessage(`${chalk.magenta('🔍')} ${chalk.magenta(message)}`, options));
  }

  static trace(message: string, options?: LogOptions): void {
    this.clearLoading();
    console.log(this.formatMessage(`${chalk.cyan('↪')} ${chalk.cyan(message)}`, {
      ...options,
      showStack: true
    }));
  }

  static rainbow(message: string, options?: LogOptions): void {
    const colors = [
      chalk.red,
      chalk.yellow,
      chalk.green,
      chalk.cyan,
      chalk.blue,
      chalk.magenta
    ];
    
    const rainbowText = message
      .split('')
      .map((char, i) => colors[i % colors.length](char))
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
        `${chalk.cyan(spinners[i])} ${chalk.cyan(message)}`,
        options
      ) + ' '.repeat(20));
      i = (i + 1) % spinners.length;
    }, 80);
  }
}