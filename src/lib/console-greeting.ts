let greeted = false;

export function greetConsole() {
  if (greeted || typeof console === 'undefined') return;
  greeted = true;
  const art = [
    '   ░▒▓█  t=1000  █▓▒░',
    '   ░▒▓ ▒░ ▓ ░▒ █░▓▒░',
    '   ▒░  A s h i s h  ░▒',
    '   ░   t=0000       ░',
  ].join('\n');
  console.log(
    `%c${art}\n\n%cHello, fellow engineer.%c\nThis page samples itself from Gaussian noise with a WebGL2 DDIM-style sampler.\nPress \` (backtick) for a shell, ⌘K for commands.\nSource: https://github.com/AshishKumar4/personal-website`,
    'color:#ff5a1f;font-family:monospace;font-size:12px',
    'color:#ede9e2;font-family:Georgia,serif;font-size:20px;font-style:italic',
    'color:#8f8c85;font-family:monospace;font-size:11px;line-height:1.6',
  );
}
