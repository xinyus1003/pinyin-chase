export type GameViewCallbacks = {
  onPause(): void;
  onRestart(): void;
  onRestartFromPause(): void;
  onChangeDifficulty(): void;
  onResume(): void;
};

export function renderGameShell(root: HTMLElement): void {
  root.innerHTML = `
    <main class="screen game-screen" data-testid="game-screen">
      <canvas data-testid="game-canvas"></canvas>
      <div class="danger-vignette" data-testid="danger-vignette" data-level="0" aria-hidden="true">
        <span class="danger-warning">危险逼近</span>
      </div>
      <header class="hud-wrap">
        <div class="hud">
          <div class="hud-status">
            <span class="hud-level">第 <strong data-testid="level">1</strong> 关</span>
            <span class="hud-chip" data-testid="difficulty-label">简单</span>
            <span class="hud-gap">距离 <strong data-testid="gap">0</strong></span>
          </div>
          <div class="hud-actions">
            <button type="button" class="icon-button" data-testid="mute" aria-pressed="false">静音</button>
            <button type="button" class="icon-button" data-testid="pause" aria-label="暂停游戏">暂停</button>
          </div>
        </div>
        <div class="hud-metrics">
          <span>速度 <strong data-testid="cpm">0</strong> CPM</span>
          <span>正确率 <strong data-testid="accuracy">—</strong></span>
          <span class="ghost-metric" data-testid="ghost-metric" hidden>
            最佳幽灵 <strong data-testid="ghost-progress">—</strong>
          </span>
        </div>
      </header>
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
        <div class="overlay-card">
          <p class="overlay-eyebrow">本局结束</p>
          <h2 id="game-over-title">被追上了</h2>
          <p>你到达了第 <strong data-testid="reached-level">1</strong> 关</p>
          <button type="button" class="primary-action" data-action="restart">再来一次</button>
          <button type="button" class="secondary-action" data-action="change-difficulty">更换难度</button>
        </div>
      </div>
      <div class="pause-overlay" data-testid="pause-overlay" role="dialog" aria-modal="true"
        aria-labelledby="pause-title" hidden>
        <div class="overlay-card">
          <p class="overlay-eyebrow">暂停</p>
          <h2 id="pause-title">喘口气</h2>
          <p>键盘已收起，准备好后继续逃跑。</p>
          <button type="button" class="primary-action" data-action="resume">继续游戏</button>
          <button type="button" class="secondary-action" data-action="pause-restart">重新开始</button>
          <button type="button" class="ghost-action" data-action="pause-exit">退出本局</button>
        </div>
      </div>
    </main>
  `;
}

export function bindGameOverButtons(root: HTMLElement, callbacks: GameViewCallbacks): void {
  root.querySelector<HTMLButtonElement>('[data-testid="pause"]')?.addEventListener('click', callbacks.onPause);
  root.querySelector<HTMLButtonElement>('[data-action="restart"]')?.addEventListener('click', callbacks.onRestart);
  root.querySelector<HTMLButtonElement>('[data-action="pause-restart"]')?.addEventListener('click', callbacks.onRestartFromPause);
  root.querySelector<HTMLButtonElement>('[data-action="change-difficulty"]')?.addEventListener('click', callbacks.onChangeDifficulty);
  root.querySelector<HTMLButtonElement>('[data-action="pause-exit"]')?.addEventListener('click', callbacks.onChangeDifficulty);
  root.querySelector<HTMLButtonElement>('[data-action="resume"]')?.addEventListener('click', callbacks.onResume);
}
