export type GameViewCallbacks = {
  onRestart(): void;
  onChangeDifficulty(): void;
  onResume(): void;
};

export function renderGameShell(root: HTMLElement): void {
  root.innerHTML = `
    <main class="screen game-screen" data-testid="game-screen">
      <header class="hud-wrap">
        <div class="hud">
          <span>第 <strong data-testid="level">1</strong> 关</span>
          <span data-testid="difficulty-label">简单</span>
          <span>距离 <strong data-testid="gap">0</strong></span>
          <button type="button" data-testid="mute">静音</button>
        </div>
        <div class="hud-metrics">
          <span>实时速度 <strong data-testid="cpm">0</strong> CPM</span>
          <span>当前正确率 <strong data-testid="accuracy">—</strong></span>
        </div>
      </header>
      <canvas data-testid="game-canvas"></canvas>
      <section class="prompt-card">
        <div data-testid="prompt" class="prompt"></div>
        <div class="input-row">
          <input data-testid="native-input" type="text" inputmode="text" autocomplete="off"
            autocapitalize="none" autocorrect="off" spellcheck="false" aria-label="输入拼音" />
          <span data-testid="progress" data-progress="0">0 字母</span>
          <span data-testid="wrong-count" data-count="0" role="status" aria-live="polite"
            aria-atomic="true" hidden></span>
        </div>
      </section>
      <div class="game-over" data-testid="game-over" role="dialog" aria-modal="true"
        aria-labelledby="game-over-title" hidden>
        <h2 id="game-over-title">被追上了</h2>
        <p>你到达了第 <strong data-testid="reached-level">1</strong> 关</p>
        <button type="button" data-action="restart">再来一次</button>
        <button type="button" data-action="change-difficulty">更换难度</button>
      </div>
      <div class="pause-overlay" data-testid="pause-overlay" role="dialog" aria-modal="true"
        aria-labelledby="pause-title" hidden>
        <h2 id="pause-title">游戏暂停</h2>
        <p>键盘已收起。点击继续，回到逃跑。</p>
        <button type="button" data-action="resume">继续游戏</button>
      </div>
    </main>
  `;
}

export function bindGameOverButtons(root: HTMLElement, callbacks: GameViewCallbacks): void {
  root.querySelector<HTMLButtonElement>('[data-action="restart"]')?.addEventListener('click', callbacks.onRestart);
  root.querySelector<HTMLButtonElement>('[data-action="change-difficulty"]')?.addEventListener('click', callbacks.onChangeDifficulty);
  root.querySelector<HTMLButtonElement>('[data-action="resume"]')?.addEventListener('click', callbacks.onResume);
}
