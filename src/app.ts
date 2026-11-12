import { createLevel } from './core/level';
import { GameSession } from './core/game';
import { GameLoop } from './core/loop';
import { NativeKeyboard } from './input/keyboardInput';
import { promptCacheKey, updatePrompt } from './ui/promptView';
import { renderMenu } from './ui/menuView';
import { bindGameOverButtons, renderGameShell } from './ui/gameView';
import { preventFocusTransfer } from './ui/focus';
import { isPromptError, wrongIndicator } from './ui/errorState';
import { stopCurrentRun, type RunResources } from './core/runLifecycle';
import { CanvasRenderer } from './render/canvasRenderer';
import { loadProgress, saveProgress, type PersistedProgress } from './core/storage';
import { FeedbackController } from './audio/feedback';
import { DIFFICULTIES } from './core/difficulty';
import { TypingMetrics } from './core/typingMetrics';
import {
  activeTensionForPhase,
  createBestDistanceTracker,
  createLevelClearTimer,
  focusLossAction,
  nextLevelNumber,
  visibilityAction,
} from './core/runFlow';
import { REDUCED_MOTION_QUERY } from './render/motion';
import type { Difficulty, GameSnapshot } from './types';

type GameElements = {
  level: HTMLElement;
  gap: HTMLElement;
  difficulty: HTMLElement;
  cpm: HTMLElement;
  accuracy: HTMLElement;
  reachedLevel: HTMLElement;
  progress: HTMLElement;
  prompt: HTMLElement;
  gameOver: HTMLElement;
  wrong: HTMLElement;
  promptCard: HTMLElement;
};

function setText(element: HTMLElement, value: string): void {
  if (element.textContent !== value) element.textContent = value;
}

function setHidden(element: HTMLElement, hidden: boolean): void {
  if (element.hidden !== hidden) element.hidden = hidden;
}

export function bootstrap(root: HTMLElement): void {
  let progress: PersistedProgress = loadProgress();
  let selected: Difficulty = progress.lastDifficulty;
  let levelNumber = 1;
  let wrongCount = 0;
  let starting = false;
  let renderer: CanvasRenderer | null = null;
  let gameElements: GameElements | null = null;
  let lastPromptKey = '';
  let resizeObserver: ResizeObserver | null = null;
  let previousPhase: GameSnapshot['phase'] = 'playing';
  let statsDirty = false;
  let lastStatsSaveAt = 0;
  const typingMetrics = new TypingMetrics();
  const feedback = new FeedbackController();
  feedback.setMuted(progress.muted);
  const levelTimer = createLevelClearTimer();
  const distanceTracker = createBestDistanceTracker(progress.bestDistance);
  const run: RunResources<GameSession, GameLoop, NativeKeyboard> = { loop: null, keyboard: null, session: null };

  function disposeRenderer(): void {
    resizeObserver?.disconnect();
    resizeObserver = null;
    renderer = null;
    gameElements = null;
  }

  function syncMuteButton(mute: HTMLButtonElement): void {
    mute.setAttribute('aria-pressed', String(progress.muted));
    mute.textContent = progress.muted ? '取消静音' : '静音';
  }

  function syncAppHeight(): void {
    const height = window.visualViewport?.height ?? window.innerHeight;
    document.documentElement.style.setProperty('--app-height', `${height}px`);
  }

  function onViewportChange(): void {
    syncAppHeight();
    renderer?.resize();
  }

  function startSession(): GameSession {
    const session = new GameSession(createLevel(selected, levelNumber, Date.now()));
    run.session = session;
    wrongCount = 0;
    lastPromptKey = '';
    previousPhase = 'playing';
    progress = { ...progress, bestLevel: Math.max(progress.bestLevel, levelNumber) };
    saveProgress(progress);
    return session;
  }

  function recordStoredAttempt(kind: 'correct' | 'wrong'): void {
    const current = progress.stats[selected];
    progress = {
      ...progress,
      stats: {
        ...progress.stats,
        [selected]: {
          ...current,
          totalLetters: current.totalLetters + 1,
          correctLetters: current.correctLetters + (kind === 'correct' ? 1 : 0),
        },
      },
    };
    statsDirty = true;
  }

  function saveStatsIfNeeded(now: number, force = false): void {
    if (!statsDirty) return;
    if (!force && now - lastStatsSaveAt < 1000) return;
    saveProgress(progress);
    statsDirty = false;
    lastStatsSaveAt = now;
  }

  function syncView(): void {
    if (!run.session || !gameElements) return;
    const snapshot = run.session.getSnapshot();
    const now = performance.now();
    const typing = typingMetrics.snapshot(now);
    setText(gameElements.cpm, String(typing.cpm));
    setText(gameElements.accuracy, typing.totalAttempts === 0 ? '—' : `${typing.accuracy.toFixed(1)}%`);
    const currentStats = progress.stats[selected];
    if (typingMetrics.canRecordBest(now) && typing.cpm > currentStats.bestCpm) {
      progress = {
        ...progress,
        stats: {
          ...progress.stats,
          [selected]: { ...currentStats, bestCpm: typing.cpm },
        },
      };
      statsDirty = true;
    }
    saveStatsIfNeeded(now);
    setText(gameElements.level, String(snapshot.level.number));
    setText(gameElements.gap, Math.max(0, snapshot.gap).toFixed(1));
    setText(gameElements.difficulty, DIFFICULTIES[snapshot.level.difficulty].label);
    setText(gameElements.reachedLevel, String(snapshot.level.number));
    const progressValue = String(snapshot.heroLetters);
    if (gameElements.progress.dataset.progress !== progressValue) {
      gameElements.progress.dataset.progress = progressValue;
    }
    setText(gameElements.progress, `${snapshot.heroLetters} 字母`);
    const phrase = snapshot.level.phrases[snapshot.phraseIndex] ?? snapshot.level.phrases.at(-1)!;
    const nextPromptKey = promptCacheKey(phrase, snapshot.letterIndex);
    if (nextPromptKey !== lastPromptKey) {
      updatePrompt(gameElements.prompt, phrase, snapshot.letterIndex);
      lastPromptKey = nextPromptKey;
    }
    setHidden(gameElements.gameOver, snapshot.phase !== 'gameOver');
    const indicator = wrongIndicator(wrongCount);
    setHidden(gameElements.wrong, !indicator.visible);
    setText(gameElements.wrong, indicator.label);
    gameElements.wrong.dataset.count = String(wrongCount);
    gameElements.promptCard.classList.toggle('has-error', isPromptError(snapshot.stunRemaining));
  }

  function syncAndTrigger(): void {
    if (!run.session) return;
    syncView();
    const snapshot = run.session.getSnapshot();
    const phase = snapshot.phase;
    // Only an active chase pulses tension; paused/terminal phases are silent.
    feedback.setTension(activeTensionForPhase(phase, snapshot.gap, snapshot.level.initialGap));
    if (phase !== previousPhase) {
      if (phase === 'levelClear') {
        feedback.levelClear();
        renderer?.emitLevelClear();
        saveProgress(progress);
        statsDirty = false;
        distanceTracker.flush();
        levelTimer.schedule(advanceLevel);
      } else if (phase === 'gameOver') {
        feedback.caught();
        renderer?.emitCaught();
        saveProgress(progress);
        statsDirty = false;
        distanceTracker.flush();
        run.keyboard?.blur();
        root.querySelector<HTMLButtonElement>('[data-action="restart"]')?.focus({ preventScroll: true });
      }
      previousPhase = phase;
    }
  }

  function advanceLevel(): void {
    if (!run.session) return;
    const nextLevel = nextLevelNumber(run.session.getSnapshot().phase, levelNumber);
    if (nextLevel === null) return;
    levelNumber = nextLevel;
    const session = startSession();
    renderer?.resetLevel(session.getSnapshot());
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
    if (!overlay) return;
    overlay.hidden = false;
    overlay.querySelector<HTMLButtonElement>('[data-action="resume"]')?.focus({ preventScroll: true });
  }

  function hidePauseOverlay(): void {
    const overlay = root.querySelector<HTMLElement>('[data-testid="pause-overlay"]');
    if (overlay) overlay.hidden = true;
  }

  function activateGameSurface(): void {
    feedback.unlock();
    if (run.session?.getSnapshot().phase === 'paused') {
      run.session.resume();
      hidePauseOverlay();
      syncAndTrigger();
    }
    run.keyboard?.focus();
  }

  function pauseGame(): void {
    if (!run.session || run.session.getSnapshot().phase !== 'playing') return;
    run.session.pause();
    typingMetrics.pause(performance.now());
    feedback.setTension(0);
    showPauseOverlay();
    syncAndTrigger();
    run.keyboard?.blur();
  }

  function restartFromPause(): void {
    if (!run.session || run.session.getSnapshot().phase !== 'paused') return;
    feedback.destroy();
    feedback.unlock();
    startRun();
  }

  function onFocusLost(): void {
    if (!run.session || focusLossAction(run.session.getSnapshot().phase) !== 'pause') return;
    run.session.pause();
    typingMetrics.pause(performance.now());
    feedback.setTension(0);
    showPauseOverlay();
    syncAndTrigger();
  }

  function onVisibilityChange(): void {
    if (!run.session) return;
    const action = visibilityAction(document.hidden, run.session.getSnapshot().phase);
    if (action === 'pause') {
      run.session.pause();
      typingMetrics.pause(performance.now());
      // Background timers (the heartbeat) keep firing while rAF is throttled,
      // so explicitly silence feedback the moment the game is paused.
      feedback.setTension(0);
      syncAndTrigger();
    } else if (action === 'show-resume') {
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
      levelTimer.clear();
      typingMetrics.reset();
      statsDirty = false;
      lastStatsSaveAt = 0;
      renderGameShell(root);
      gameElements = {
        level: root.querySelector<HTMLElement>('[data-testid="level"]')!,
        gap: root.querySelector<HTMLElement>('[data-testid="gap"]')!,
        difficulty: root.querySelector<HTMLElement>('[data-testid="difficulty-label"]')!,
        cpm: root.querySelector<HTMLElement>('[data-testid="cpm"]')!,
        accuracy: root.querySelector<HTMLElement>('[data-testid="accuracy"]')!,
        reachedLevel: root.querySelector<HTMLElement>('[data-testid="reached-level"]')!,
        progress: root.querySelector<HTMLElement>('[data-testid="progress"]')!,
        prompt: root.querySelector<HTMLElement>('[data-testid="prompt"]')!,
        gameOver: root.querySelector<HTMLElement>('[data-testid="game-over"]')!,
        wrong: root.querySelector<HTMLElement>('[data-testid="wrong-count"]')!,
        promptCard: root.querySelector<HTMLElement>('.prompt-card')!,
      };
      levelNumber = 1;
      const session = startSession();

      const input = root.querySelector<HTMLInputElement>('[data-testid="native-input"]')!;
      run.keyboard = new NativeKeyboard(input, {
        onLetters: (letters) => {
          for (const letter of letters) {
            if (!run.session) return;
            const outcome = run.session.typeLetter(letter);
            const now = performance.now();
            if (outcome.kind === 'correct') {
              typingMetrics.recordCorrect(now);
              recordStoredAttempt('correct');
              feedback.correct();
              renderer?.emitCorrect();
              const distance = distanceTracker.record(run.session.getSnapshot().runLetters);
              if (distance.recorded > 0) {
                progress = { ...progress, bestDistance: distance.bestDistance };
              }
              if (distance.shouldSave) saveProgress(progress);
            } else if (outcome.kind === 'wrong') {
              typingMetrics.recordWrong(now);
              recordStoredAttempt('wrong');
              wrongCount += 1;
              feedback.wrong();
              renderer?.emitWrong();
            }
            syncAndTrigger();
          }
        },
        onFocusLost,
      });
      bindGameOverButtons(root, {
        onPause: pauseGame,
        onRestart: restartRun,
        onRestartFromPause: restartFromPause,
        onChangeDifficulty: showMenu,
        onResume: activateGameSurface,
      });

      const pause = root.querySelector<HTMLButtonElement>('[data-testid="pause"]');
      pause?.addEventListener('pointerdown', preventFocusTransfer);
      pause?.addEventListener('mousedown', preventFocusTransfer);

      const mute = root.querySelector<HTMLButtonElement>('[data-testid="mute"]');
      if (mute) {
        syncMuteButton(mute);
        mute.addEventListener('pointerdown', preventFocusTransfer);
        mute.addEventListener('mousedown', preventFocusTransfer);
        mute.addEventListener('click', () => {
          const muted = feedback.toggleMuted();
          progress = { ...progress, muted };
          saveProgress(progress);
          syncMuteButton(mute);
        });
      }

      const canvas = root.querySelector<HTMLCanvasElement>('[data-testid="game-canvas"]')!;
      const promptCard = root.querySelector<HTMLElement>('.prompt-card')!;
      canvas.addEventListener('click', activateGameSurface);
      promptCard.addEventListener('click', activateGameSurface);
      input.addEventListener('click', activateGameSurface);
      const reducedMotion = typeof window.matchMedia === 'function'
        && window.matchMedia(REDUCED_MOTION_QUERY).matches;
      renderer = new CanvasRenderer(canvas, reducedMotion);
      resizeObserver = new ResizeObserver(() => renderer?.resize());
      resizeObserver.observe(canvas);

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
    feedback.unlock();
    startRun();
  }

  // Guard restart: only act while the game-over overlay is actually showing,
  // so duplicate clicks on the detached button cannot restart twice.
  function restartRun(): void {
    const over = root.querySelector<HTMLElement>('[data-testid="game-over"]');
    if (!over || over.hidden) return;
    feedback.destroy();
    feedback.unlock();
    startRun();
  }

  function showMenu(): void {
    stopCurrentRun(run);
    disposeRenderer();
    levelTimer.clear();
    saveStatsIfNeeded(performance.now(), true);
    feedback.destroy();
    renderMenu(root, progress.bestLevel, progress.stats, selected, (difficulty) => {
      selected = difficulty;
      progress = { ...progress, lastDifficulty: difficulty };
      saveProgress(progress);
      showMenu();
    }, startFromMenu);
  }

  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('resize', onViewportChange);
  window.addEventListener('orientationchange', onViewportChange);
  window.visualViewport?.addEventListener('resize', onViewportChange);
  syncAppHeight();
  showMenu();
}
