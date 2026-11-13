import { expect, test } from '@playwright/test';

test('asks mobile browsers to resize the page around the keyboard', async ({ page }) => {
  await page.goto('/');
  const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
  expect(viewport).toContain('interactive-widget=resizes-content');
});

test('starts a run, focuses the native input and advances on a correct letter', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '拼音追逃' })).toBeVisible();
  await page.getByRole('button', { name: '简单' }).click();
  await page.getByRole('button', { name: '开始逃跑' }).click();

  const input = page.getByTestId('native-input');
  await expect(input).toBeFocused();
  await expect(page.getByTestId('prompt')).toContainText(/[\u4e00-\u9fff]/);

  const pinyin = await page.getByTestId('prompt').getAttribute('data-pinyin');
  const firstLetter = (pinyin ?? '').toLowerCase().match(/[a-z]/)?.[0];
  expect(firstLetter).toBeTruthy();
  await page.keyboard.press(firstLetter!);
  await expect(page.getByTestId('progress')).toHaveAttribute('data-progress', '1');
});

test('wrong input stalls progress and shows a visible error state', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '开始逃跑' }).click();
  const pinyin = await page.getByTestId('prompt').getAttribute('data-pinyin');
  const expected = (pinyin ?? '').toLowerCase().replace(/[^a-z]/g, '')[0];
  const wrong = expected === 'z' ? 'x' : 'z';
  await page.keyboard.press(wrong);
  await expect(page.getByTestId('progress')).toHaveAttribute('data-progress', '0');

  const wrongCount = page.getByTestId('wrong-count');
  await expect(wrongCount).toBeVisible();
  await expect(wrongCount).toContainText('错误');
  await expect(wrongCount).toHaveAttribute('data-count', '1');
});

test('renders a non-empty canvas maze', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '开始逃跑' }).click();
  await page.waitForTimeout(200);
  const hasPixels = await page.getByTestId('game-canvas').evaluate((canvas) => {
    const element = canvas as HTMLCanvasElement;
    const context = element.getContext('2d');
    if (!context) return false;
    const data = context.getImageData(0, 0, element.width, element.height).data;
    for (let i = 3; i < data.length; i += 400) if (data[i] !== 0) return true;
    return false;
  });
  expect(hasPixels).toBe(true);
});

test('reads persisted best level on the menu', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('pinyin-chase:progress', JSON.stringify({
      bestLevel: 9,
      bestDistance: 200,
      lastDifficulty: 'normal',
      muted: false,
    }));
  });
  await page.goto('/');
  await expect(page.getByText('本机最高：第 9 关')).toBeVisible();
});

test('hard mode without input reaches game over', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '困难' }).click();
  await page.getByRole('button', { name: '开始逃跑' }).click();
  await expect(page.getByTestId('game-over')).toBeVisible({ timeout: 6000 });
  await expect(page.getByRole('button', { name: '再来一次' })).toBeVisible();
});

test('escalates danger feedback when the enemy enters the final letters', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '困难' }).click();
  await page.getByRole('button', { name: '开始逃跑' }).click();

  const danger = page.getByTestId('danger-vignette');
  await expect(danger).toBeAttached();
  await expect.poll(async () => Number(await danger.getAttribute('data-level')), { timeout: 5000 }).toBeGreaterThan(0);
});

test('loads a personal best ghost from local progress', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('pinyin-chase:progress', JSON.stringify({
      bestLevel: 3,
      bestDistance: 40,
      lastDifficulty: 'easy',
      muted: false,
      stats: {
        easy: { bestCpm: 80, totalLetters: 20, correctLetters: 19 },
        normal: { bestCpm: 0, totalLetters: 0, correctLetters: 0 },
        hard: { bestCpm: 0, totalLetters: 0, correctLetters: 0 },
        extreme: { bestCpm: 0, totalLetters: 0, correctLetters: 0 },
      },
      ghosts: {
        easy: { totalLetters: 20, levels: [{ level: 1, timesMs: [0, 200, 400, 600] }] },
        normal: null,
        hard: null,
        extreme: null,
      },
    }));
  });
  await page.goto('/');
  await page.getByRole('button', { name: '开始逃跑' }).click();

  await expect(page.getByTestId('ghost-metric')).toBeVisible();
  await expect(page.getByTestId('ghost-progress')).not.toHaveText('—');
});

test('saves a new personal ghost after a run ends', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '困难' }).click();
  await page.getByRole('button', { name: '开始逃跑' }).click();
  const pinyin = await page.getByTestId('prompt').getAttribute('data-pinyin');
  const firstLetter = (pinyin ?? '').toLowerCase().match(/[a-z]/)?.[0];
  expect(firstLetter).toBeTruthy();
  await page.keyboard.press(firstLetter!);

  await expect(page.getByTestId('game-over')).toBeVisible({ timeout: 6000 });
  const ghost = await page.evaluate(() => {
    const raw = localStorage.getItem('pinyin-chase:progress');
    return raw ? JSON.parse(raw).ghosts?.hard : null;
  });
  expect(ghost?.totalLetters).toBeGreaterThan(0);
  expect(ghost?.levels?.[0]?.timesMs?.length).toBeGreaterThan(0);
});

test('supports a phone viewport and a mute toggle', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: '开始逃跑' }).click();
  await expect(page.getByTestId('native-input')).toBeFocused();
  const mute = page.getByTestId('mute');
  await expect(mute).toBeVisible();
  await mute.click();
  await expect(mute).toHaveAttribute('aria-pressed', 'true');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});

test('keeps the chase visible when the mobile keyboard shrinks the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: '开始逃跑' }).click();

  // Simulate the remaining visual viewport on a phone after the native
  // keyboard opens. The prompt previously consumed almost all of this space.
  await page.setViewportSize({ width: 390, height: 300 });
  await page.waitForFunction(() => (
    getComputedStyle(document.documentElement).getPropertyValue('--app-height').trim() === '300px'
  ));

  const layout = await page.evaluate(() => {
    const rect = (selector: string) => {
      const bounds = document.querySelector(selector)?.getBoundingClientRect();
      return bounds ? { top: bounds.top, height: bounds.height, bottom: bounds.bottom } : null;
    };
    const hud = rect('.hud-wrap');
    const prompt = rect('.prompt-card');
    const input = rect('[data-testid="native-input"]');
    return { hud, prompt, input, viewportHeight: window.visualViewport?.height ?? window.innerHeight };
  });

  expect(layout.hud).not.toBeNull();
  expect(layout.prompt).not.toBeNull();
  expect(layout.input).not.toBeNull();
  expect(layout.prompt!.height).toBeLessThanOrEqual(120);
  expect(layout.prompt!.top - layout.hud!.bottom).toBeGreaterThanOrEqual(100);
  expect(layout.input!.bottom).toBeLessThanOrEqual(layout.viewportHeight);
});

test('keeps the current pinyin letter visible in the compact prompt', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: '极限' }).click();
  await page.getByRole('button', { name: '开始逃跑' }).click();
  await page.setViewportSize({ width: 390, height: 300 });
  await page.waitForFunction(() => (
    getComputedStyle(document.documentElement).getPropertyValue('--app-height').trim() === '300px'
  ));

  const prompt = page.getByTestId('prompt');
  const pinyin = (await prompt.getAttribute('data-pinyin'))?.toLowerCase().replace(/[^a-z]/g, '') ?? '';
  expect(pinyin.length).toBeGreaterThan(80);

  const overflowBeforeTyping = await page.locator('.pinyin').evaluate((element) => (
    element.scrollHeight > element.clientHeight
  ));
  expect(overflowBeforeTyping).toBe(true);

  const typeCount = pinyin.length - 1;
  await page.keyboard.type(pinyin.slice(0, typeCount));
  const currentIsVisible = await page.locator('.pinyin').evaluate((element) => {
    const current = element.querySelector<HTMLElement>('.pinyin-letter.current');
    if (!current) return false;
    const promptBounds = element.getBoundingClientRect();
    const currentBounds = current.getBoundingClientRect();
    return currentBounds.top >= promptBounds.top && currentBounds.bottom <= promptBounds.bottom;
  });

  expect(currentIsVisible).toBe(true);
  await expect(page.getByTestId('progress')).toHaveAttribute('data-progress', String(typeCount));
});
