import type { Difficulty } from '../types';
import { DIFFICULTIES } from '../core/difficulty';

export function renderMenu(
  root: HTMLElement,
  bestLevel: number,
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
        ${(Object.keys(DIFFICULTIES) as Difficulty[]).map((key) => `
          <button class="difficulty ${key === selected ? 'selected' : ''}" data-difficulty="${key}">
            <strong>${DIFFICULTIES[key].label}</strong>
            <span>${key === 'easy' ? '适合第一次逃跑' : key === 'normal' ? '速度与弯道升级' : '生僻词和追兵都更快'}</span>
          </button>
        `).join('')}
      </div>
      <p class="best">本机最高：第 ${Math.max(1, bestLevel)} 关</p>
      <button class="primary" data-action="start">开始逃跑</button>
    </main>
  `;
  root.querySelectorAll<HTMLButtonElement>('[data-difficulty]').forEach((button) => {
    button.addEventListener('click', () => onSelect(button.dataset.difficulty as Difficulty));
  });
  root.querySelector<HTMLButtonElement>('[data-action="start"]')?.addEventListener('click', onStart);
}
