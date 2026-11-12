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
import { loadProgress, saveProgress, type PersistedProgress } from './core/storage';
import { DIFFICULTIES } from './core/difficulty';
import type { Difficulty, GameSnapshot } from './types';

const LEVEL_CLEAR_DELAY_MS = 900;
const SAVE_EVERY_LETTERS = 10;

export function bootstrap(root: HTMLElement): void {
  let progress: PersistedProgress = loadProgress();
  let selected: Difficulty = progress.lastDifficulty;
  let levelNumber = 1;
  let wrongCount = 0;
  let starting = false;
  let renderer: CanvasRenderer | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let viewportListener: (() => void) | null = null;
  let previousPhase: GameSnapshot['phase'] = 'playing';
  let levelClearTimer: number | null = null;
  let unsavedLetters = 0;
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

  function clearLevelTransition(): void {
    if (levelClearTimer !== null) {
      window.clearTimeout(levelClearTimer);
      levelClearTimer = null;
    }
  }

  function scheduleNextLevel(): void {
    if (levelClearTimer !== null) return;
    levelClearTimer = window.setTimeout(() => {
      levelClearTimer = null;
      advanceLevel();
    }, LEVEL_CLEAR_DELAY_MS);
  }

  function startSession(): GameSession {
    const session = new GameSession(createLevel(selected, levelNumber, Date.now()));
    run.session = session;
    wrongCount = 0;
    previousPhase = 'playing';
    progress = { ...progress, bestLevel: Math.max(progress.bestLevel, levelNumber) };
    saveProgress(progress);
    return session;
  }

  function syncView(): void {
    if (!run.session) return;
    const snapshot = run.session.getSnapshot();
    root.querySelector<HTMLElement>('[data-testid="level"]')!.textContent = String(snapshot.level.number);
    root.querySelector<HTMLElement>('[data-testid="gap"]')!.textContent = Math.max(0, snapshot.gap).toFixed(1);
    root.querySelector<HTMLElement>('[data-testid="difficulty-label"]')!.textContent = DIFFICULTIES[snapshot.level.difficulty].label;
    root.querySelector<HTMLElement>('[data-testid="reached-level"]')!.textContent = String(snapshot.level.number);
    const progressBar = root.querySelector<HTMLElement>('[data-testid="progress"]')!;
    progressBar.dataset.progress = String(snapshot.heroLetters);
    progressBar.textContent = `${snapshot.heroLetters} 字母`;
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
      if (snapshot.phase === 'levelClear') {
        renderer?.emitLevelClear();
        saveProgress(progress);
        unsavedLetters = 0;
        scheduleNextLevel();
      } else if (snapshot.phase === 'gameOver') {
        renderer?.emitCaught();
        saveProgress(progress);
        unsavedLetters = 0;
      }
      previousPhase = snapshot.phase;
    }
  }

  function advanceLevel(): void {
    if (!run.session) return;
    if (run.session.getSnapshot().phase !== 'levelClear') return;
    levelNumber += 1;
    const session = startSession();
    if (document.hidden) {
      session.pause();
      showPauseOverlay();
    }
    syncAndTrigger();
    renderer?.render(session.getSnapshot(), performance.now());
    run.keyboard?.focus();
  }

  function showPauseOverlay(): void {
    const overlay = root.querySelector<HTMLElement>('[data-testid="pause-overlay"]');
    if (overlay) overlay.hidden = false;
  }

  function hidePauseOverlay(): void {
    const overlay = root.querySelector<HTMLElement>('[data-testid="pause-overlay"]');
    if (overlay) overlay.hidden = true;
  }

  function resumeFromPause(): void {
    if (!run.session) return;
    if (run.session.getSnapshot().phase !== 'paused') return;
    run.session.resume();
    hidePauseOverlay();
    run.keyboard?.focus();
  }

  function onVisibilityChange(): void {
    if (!run.session) return;
    if (document.hidden) {
      if (run.session.getSnapshot().phase === 'playing') {
        run.session.pause();
        syncView();
      }
    } else if (run.session.getSnapshot().phase === 'paused') {
      showPauseOverlay();
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
      clearLevelTransition();
      renderGameShell(root);
      levelNumber = 1;
      unsavedLetters = 0;
      const session = startSession();

      const input = root.querySelector<HTMLInputElement>('[data-testid="native-input"]')!;
      run.keyboard = new NativeKeyboard(input, {
        onLetters: (letters) => {
          for (const letter of letters) {
            if (!run.session) return;
            const outcome = run.session.typeLetter(letter);
            if (outcome.kind === 'correct') {
              renderer?.emitCorrect();
              const runLetters = run.session.getSnapshot().runLetters;
              if (runLetters > progress.bestDistance) {
                progress = { ...progress, bestDistance: runLetters };
                unsavedLetters += 1;
                if (unsavedLetters >= SAVE_EVERY_LETTERS) {
                  saveProgress(progress);
                  unsavedLetters = 0;
                }
              }
            } else if (outcome.kind === 'wrong') {
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
        onResume: resumeFromPause,
      });

      const canvas = root.querySelector<HTMLCanvasElement>('[data-testid="game-canvas"]')!;
      canvas.addEventListener('click', resumeFromPause);
      input.addEventListener('click', resumeFromPause);
      renderer = new CanvasRenderer(canvas);
      resizeObserver = new ResizeObserver(() => renderer?.resize());
      resizeObserver.observe(canvas);
      viewportListener = () => renderer?.resize();
      window.visualViewport?.addEventListener('resize', viewportListener);

      hidePauseOverlay();
      run.keyboard.focus();
      syncAndTrigger();
      renderer?.render(session.getSnapshot(), performance.now());
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
    clearLevelTransition();
    renderMenu(root, progress.bestLevel, selected, (difficulty) => {
      selected = difficulty;
      progress = { ...progress, lastDifficulty: difficulty };
      saveProgress(progress);
      showMenu();
    }, startFromMenu);
  }

  document.addEventListener('visibilitychange', onVisibilityChange);
  showMenu();
}
