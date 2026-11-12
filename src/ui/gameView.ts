export type GameViewCallbacks = {
  onRestart(): void;
  onChangeDifficulty(): void;
};

export function renderGameShell(root: HTMLElement): void {
  root.innerHTML = `
    <main class="screen game-screen" data-testid="game-screen">
      <header class="hud">
        <span>第 <strong data-testid="level">1</strong> 关</span>
        <span data-testid="difficulty-label">简单</span>
        <span>距离 <strong data-testid="gap">0</strong></span>
        <button type="button" data-testid="mute">静音</button>
      </header>
      <canvas data-testid="game-canvas"></canvas>
      <section class="prompt-card">
        <div data-testid="prompt" class="prompt"></div>
        <div class="input-row">
          <input data-testid="native-input" type="text" inputmode="text" autocomplete="off"
            autocapitalize="none" autocorrect="off" spellcheck="false" aria-label="输入拼音" />
          <span data-testid="progress" data-progress="0">0 字母</span>
          <span data-testid="wrong-count" data-count="0" hidden></span>
        </div>
      </section>
      <div class="game-over" data-testid="game-over" hidden>
        <h2>被追上了</h2>
        <p>你到达了第 <strong data-testid="reached-level">1</strong> 关</p>
        <button data-action="restart">再来一次</button>
        <button data-action="change-difficulty">更换难度</button>
      </div>
    </main>
  `;
}

export function bindGameOverButtons(root: HTMLElement, callbacks: GameViewCallbacks): void {
  root.querySelector<HTMLButtonElement>('[data-action="restart"]')?.addEventListener('click', callbacks.onRestart);
  root.querySelector<HTMLButtonElement>('[data-action="change-difficulty"]')?.addEventListener('click', callbacks.onChangeDifficulty);
}
