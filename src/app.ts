import { createLevel } from './core/level';
import { GameSession } from './core/game';
import { GameLoop } from './core/loop';
import { NativeKeyboard } from './input/keyboardInput';
import { updatePrompt } from './ui/promptView';
import { renderMenu } from './ui/menuView';
import { bindGameOverButtons, renderGameShell } from './ui/gameView';
import { isPromptError, wrongIndicator } from './ui/errorState';
import { stopCurrentRun, type RunResources } from './core/runLifecycle';
import { CanvasRenderer } from './render/canvasRenderer';
import type { Difficulty, GameSnapshot } from './types';

export function bootstrap(root: HTMLElement): void {
  let selected: Difficulty = 'easy';
  let levelNumber = 1;
  let wrongCount = 0;
  let starting = false;
  let renderer: CanvasRenderer | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let viewportListener: (() => void) | null = null;
  let previousPhase: GameSnapshot['phase'] = 'playing';
  const run: RunResources<GameSession, GameLoop, NativeKeyboard> = { loop: null, keyboard: null, session: null };

  function disposeRenderer(): void {
    resizeObserver?.disconnect();
    resizeObserver = null;
    if (viewportListener && window.visualViewport) {
      window.visualViewport.removeEventListener('resize', viewportListener);
    }
    viewportListener = null;
    renderer = null;
  }

  function syncView(): void {
    if (!run.session) return;
    const snapshot = run.session.getSnapshot();
    root.querySelector<HTMLElement>('[data-testid="level"]')!.textContent = String(snapshot.level.number);
    root.querySelector<HTMLElement>('[data-testid="gap"]')!.textContent = Math.max(0, snapshot.gap).toFixed(1);
    const progress = root.querySelector<HTMLElement>('[data-testid="progress"]')!;
    progress.dataset.progress = String(snapshot.heroLetters);
    progress.textContent = `${snapshot.heroLetters} 字母`;
    const phrase = snapshot.level.phrases[snapshot.phraseIndex] ?? snapshot.level.phrases.at(-1)!;
    const prompt = root.querySelector<HTMLElement>('[data-testid="prompt"]')!;
    updatePrompt(prompt, phrase, snapshot.letterIndex);
    const over = root.querySelector<HTMLElement>('[data-testid="game-over"]')!;
    over.hidden = snapshot.phase !== 'gameOver';
    const wrong = root.querySelector<HTMLElement>('[data-testid="wrong-count"]')!;
    const indicator = wrongIndicator(wrongCount);
    wrong.hidden = !indicator.visible;
    wrong.textContent = indicator.label;
    wrong.dataset.count = String(wrongCount);
    root
      .querySelector<HTMLElement>('.prompt-card')
      ?.classList.toggle('has-error', isPromptError(snapshot.stunRemaining));
  }

  function syncAndTrigger(): void {
    if (!run.session) return;
    syncView();
    const snapshot = run.session.getSnapshot();
    if (snapshot.phase !== previousPhase) {
      if (snapshot.phase === 'levelClear') renderer?.emitLevelClear();
      else if (snapshot.phase === 'gameOver') renderer?.emitCaught();
      previousPhase = snapshot.phase;
    }
  }

  function startRun(): void {
    if (starting) return;
    starting = true;
    try {
      // Unconditional, idempotent cleanup: a restart must never leave the
      // previous rAF loop ticking the freshly replaced session, nor keep the
      // previous keyboard listeners alive.
      stopCurrentRun(run);
      disposeRenderer();
      renderGameShell(root);
      levelNumber = 1;
      wrongCount = 0;
      previousPhase = 'playing';
      run.session = new GameSession(createLevel(selected, levelNumber, Date.now()));
      const input = root.querySelector<HTMLInputElement>('[data-testid="native-input"]')!;
      run.keyboard = new NativeKeyboard(input, {
        onLetters: (letters) => {
          for (const letter of letters) {
            if (!run.session) return;
            const outcome = run.session.typeLetter(letter);
            if (outcome.kind === 'correct') renderer?.emitCorrect();
            else if (outcome.kind === 'wrong') {
              wrongCount += 1;
              renderer?.emitWrong();
            }
            syncAndTrigger();
          }
        },
      });
      bindGameOverButtons(root, {
        onRestart: restartRun,
        onChangeDifficulty: showMenu,
      });

      const canvas = root.querySelector<HTMLCanvasElement>('[data-testid="game-canvas"]')!;
      renderer = new CanvasRenderer(canvas);
      resizeObserver = new ResizeObserver(() => renderer?.resize());
      resizeObserver.observe(canvas);
      viewportListener = () => renderer?.resize();
      window.visualViewport?.addEventListener('resize', viewportListener);

      run.keyboard.focus();
      syncAndTrigger();
      renderer?.render(run.session.getSnapshot(), performance.now());
      run.loop = new GameLoop(
        (dt) => {
          run.session?.tick(dt);
          syncAndTrigger();
        },
        (time) => {
          if (!run.session) return;
          renderer?.render(run.session.getSnapshot(), time);
        },
      );
      run.loop.start();
    } finally {
      starting = false;
    }
  }

  // Guard the menu start button: once a loop is live, queued duplicate clicks
  // on the (now detached) button are ignored instead of spawning another run.
  function startFromMenu(): void {
    if (run.loop) return;
    startRun();
  }

  // Guard restart: only act while the game-over overlay is actually showing,
  // so duplicate clicks on the detached button cannot restart twice.
  function restartRun(): void {
    const over = root.querySelector<HTMLElement>('[data-testid="game-over"]');
    if (!over || over.hidden) return;
    startRun();
  }

  function showMenu(): void {
    stopCurrentRun(run);
    disposeRenderer();
    renderMenu(root, 1, selected, (difficulty) => {
      selected = difficulty;
      showMenu();
    }, startFromMenu);
  }

  showMenu();
}
