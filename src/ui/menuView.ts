import type { Difficulty, DifficultyStats } from '../types';
import { DIFFICULTIES } from '../core/difficulty';
import { accuracyPercent } from '../core/typingMetrics';

function accuracyLabel(stats: DifficultyStats): string {
  return stats.totalLetters === 0 ? '—' : `${accuracyPercent(stats.correctLetters, stats.totalLetters).toFixed(1)}%`;
}

export function renderMenu(
  root: HTMLElement,
  bestLevel: number,
  statsByDifficulty: Record<Difficulty, DifficultyStats>,
  selected: Difficulty,
  onSelect: (difficulty: Difficulty) => void,
  onStart: () => void,
): void {
  root.innerHTML = `
    <main class="screen menu-screen">
      <p class="eyebrow">输入越快，逃得越远</p>
      <h1>拼音追逃</h1>
      <p class="lede">照着拼音敲字母。答对前进，答错就会被身后的怪物追上。</p>
      <div class="difficulty-list" role="group" aria-label="选择难度">
        ${(Object.keys(DIFFICULTIES) as Difficulty[]).map((key) => {
          const stats = statsByDifficulty[key];
          return `
            <button type="button" class="difficulty difficulty-${key} ${key === selected ? 'selected' : ''}"
              data-difficulty="${key}" aria-pressed="${key === selected}">
              <strong>${DIFFICULTIES[key].label}</strong>
              <span>${DIFFICULTIES[key].description}</span>
              <span class="difficulty-stats">
                <span>最高 ${Math.round(stats.bestCpm)} CPM</span>
                <span>累计 ${stats.totalLetters.toLocaleString('zh-CN')} 字母</span>
                <span>正确率 ${accuracyLabel(stats)}</span>
              </span>
            </button>
          `;
        }).join('')}
      </div>
      <p class="best">本机最高：第 ${Math.max(1, bestLevel)} 关</p>
      <button class="primary" data-action="start">开始逃跑</button>
    </main>
  `;
  root.querySelectorAll<HTMLButtonElement>('[data-difficulty]').forEach((button) => {
    button.addEventListener('click', () => onSelect(button.dataset.difficulty as Difficulty));
  });
  root.querySelector<HTMLButtonElement>('[data-action="start"]')?.addEventListener('click', onStart);
  root.querySelector<HTMLButtonElement>(`[data-difficulty="${selected}"]`)?.focus({ preventScroll: true });
}
