import { createLevel } from './core/level';
import { GameSession } from './core/game';
import { GameLoop } from './core/loop';
import { NativeKeyboard } from './input/keyboardInput';
import { updatePrompt } from './ui/promptView';
import { renderMenu } from './ui/menuView';
import { bindGameOverButtons, renderGameShell } from './ui/gameView';
import type { Difficulty } from './types';

export function bootstrap(root: HTMLElement): void {
  let selected: Difficulty = 'easy';
  let session: GameSession | null = null;
  let levelNumber = 1;
  let wrongCount = 0;
  let loop: GameLoop | null = null;
  let keyboard: NativeKeyboard | null = null;

  const showMenu = () => {
    loop?.stop();
    keyboard?.destroy();
    keyboard = null;
    session = null;
    renderMenu(root, 1, selected, (difficulty) => {
      selected = difficulty;
      showMenu();
    }, startRun);
  };

  const syncView = () => {
    if (!session) return;
    const snapshot = session.getSnapshot();
    root.querySelector<HTMLElement>('[data-testid="level"]')!.textContent = String(snapshot.level.number);
    root.querySelector<HTMLElement>('[data-testid="gap"]')!.textContent = Math.max(0, snapshot.gap).toFixed(1);
    root.querySelector<HTMLElement>('[data-testid="progress"]')!.dataset.progress = String(snapshot.heroLetters);
    root.querySelector<HTMLElement>('[data-testid="progress"]')!.textContent = `${snapshot.heroLetters} 字母`;
    const phrase = snapshot.level.phrases[snapshot.phraseIndex] ?? snapshot.level.phrases.at(-1)!;
    const prompt = root.querySelector<HTMLElement>('[data-testid="prompt"]')!;
    updatePrompt(prompt, phrase, snapshot.letterIndex);
    const over = root.querySelector<HTMLElement>('[data-testid="game-over"]')!;
    over.hidden = snapshot.phase !== 'gameOver';
    const wrong = root.querySelector<HTMLElement>('[data-testid="wrong-count"]')!;
    wrong.dataset.count = String(wrongCount);
  };

  const startRun = () => {
    renderGameShell(root);
    levelNumber = 1;
    wrongCount = 0;
    session = new GameSession(createLevel(selected, levelNumber, Date.now()));
    const input = root.querySelector<HTMLInputElement>('[data-testid="native-input"]')!;
    keyboard = new NativeKeyboard(input, {
      onLetters: (letters) => {
        for (const letter of letters) {
          if (!session) return;
          const outcome = session.typeLetter(letter);
          if (outcome.kind === 'wrong') wrongCount += 1;
          syncView();
        }
      },
    });
    bindGameOverButtons(root, {
      onRestart: startRun,
      onChangeDifficulty: showMenu,
    });
    keyboard.focus();
    syncView();
    loop = new GameLoop(
      (dt) => { session?.tick(dt); syncView(); },
      () => {},
    );
    loop.start();
  };

  showMenu();
}
