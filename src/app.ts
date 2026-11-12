import { createLevel } from './core/level';
import { GameSession } from './core/game';
import { GameLoop } from './core/loop';
import { NativeKeyboard } from './input/keyboardInput';
import { updatePrompt } from './ui/promptView';
import { renderMenu } from './ui/menuView';
import { bindGameOverButtons, renderGameShell } from './ui/gameView';
import { isPromptError, wrongIndicator } from './ui/errorState';
import { stopCurrentRun, type RunResources } from './core/runLifecycle';
import type { Difficulty } from './types';

export function bootstrap(root: HTMLElement): void {
  let selected: Difficulty = 'easy';
  let levelNumber = 1;
  let wrongCount = 0;
  let starting = false;
  const run: RunResources<GameSession, GameLoop, NativeKeyboard> = { loop: null, keyboard: null, session: null };

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

  function startRun(): void {
    if (starting) return;
    starting = true;
    try {
      // Unconditional, idempotent cleanup: a restart must never leave the
      // previous rAF loop ticking the freshly replaced session, nor keep the
      // previous keyboard listeners alive.
      stopCurrentRun(run);
      renderGameShell(root);
      levelNumber = 1;
      wrongCount = 0;
      run.session = new GameSession(createLevel(selected, levelNumber, Date.now()));
      const input = root.querySelector<HTMLInputElement>('[data-testid="native-input"]')!;
      run.keyboard = new NativeKeyboard(input, {
        onLetters: (letters) => {
          for (const letter of letters) {
            if (!run.session) return;
            const outcome = run.session.typeLetter(letter);
            if (outcome.kind === 'wrong') wrongCount += 1;
            syncView();
          }
        },
      });
      bindGameOverButtons(root, {
        onRestart: restartRun,
        onChangeDifficulty: showMenu,
      });
      run.keyboard.focus();
      syncView();
      run.loop = new GameLoop(
        (dt) => {
          run.session?.tick(dt);
          syncView();
        },
        () => {},
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
    renderMenu(root, 1, selected, (difficulty) => {
      selected = difficulty;
      showMenu();
    }, startFromMenu);
  }

  showMenu();
}
