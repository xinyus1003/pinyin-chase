import { expect, test } from '@playwright/test';

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

test('wrong input stalls progress and records an error', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '开始逃跑' }).click();
  const pinyin = await page.getByTestId('prompt').getAttribute('data-pinyin');
  const expected = (pinyin ?? '').toLowerCase().replace(/[^a-z]/g, '')[0];
  const wrong = expected === 'z' ? 'x' : 'z';
  await page.keyboard.press(wrong);
  await expect(page.getByTestId('progress')).toHaveAttribute('data-progress', '0');
  await expect(page.getByTestId('wrong-count')).toHaveAttribute('data-count', '1');
});
