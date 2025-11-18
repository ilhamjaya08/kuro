import pc from 'picocolors';

export const LOGO = `${pc.cyan(`     /$$   /$$ /$$   /$$ /$$$$$$$   /$$$$$$
    | $$  /$$/| $$  | $$| $$__  $$ /$$__  $$
    | $$ /$$/ | $$  | $$| $$  \\ $$| $$  \\ $$
    | $$$$$/  | $$  | $$| $$$$$$$/| $$  | $$
    | $$  $$  | $$  | $$| $$__  $$| $$  | $$
    | $$\\  $$ | $$  | $$| $$  \\ $$| $$  | $$
    | $$ \\  $$|  $$$$$$/| $$  | $$|  $$$$$$/
    |__/  \\__/ \\______/ |__/  |__/ \\______/`)}

   ${pc.dim('Background HTTP Cron Scheduler')}
   ${pc.dim('v1.0.0 | MIT License')}
`;

export const showLogo = () => {
  console.clear();
  console.log('\n' + LOGO + '\n');
};

export const showHeader = (title: string) => {
  console.log('\n' + pc.bold(pc.cyan(`◆  ${title}`)) + '\n');
};

export const showSuccess = (message: string) => {
  console.log(pc.green(`✔ ${message}`));
};

export const showError = (message: string) => {
  console.log(pc.red(`✖ ${message}`));
};

export const showWarning = (message: string) => {
  console.log(pc.yellow(`⚠ ${message}`));
};

export const showInfo = (message: string) => {
  console.log(pc.blue(`ℹ ${message}`));
};
