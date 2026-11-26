import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DoorCalculatorWizard } from './DoorCalculatorWizard';

async function goToStep3(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /Далее: размеры/i }));
  const w = screen.getByPlaceholderText('900');
  await user.clear(w);
  await user.type(w, '900');
  const d = screen.getByPlaceholderText('250');
  await user.clear(d);
  await user.type(d, '250');
  await user.click(screen.getByRole('button', { name: /Далее:/i }));
  await user.clear(screen.getByPlaceholderText('900'));
  await user.type(screen.getByPlaceholderText('900'), '800');
  await user.clear(screen.getByPlaceholderText('250'));
  await user.type(screen.getByPlaceholderText('250'), '120');
  await user.click(screen.getByRole('button', { name: /Далее: модель/i }));
}

async function pickManualWithPrices(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
  blade: string,
  box: string
) {
  await user.click(screen.getByText('Вне каталога'));
  await user.type(screen.getByPlaceholderText(/Престиж/i), name);
  const priceSection = screen.getByText('Цены за штуку').closest('details');
  expect(priceSection).toBeTruthy();
  if (priceSection?.getAttribute('open') == null) {
    await user.click(within(priceSection as HTMLElement).getByText('Цены за штуку'));
  }
  const inputs = (priceSection as HTMLElement).querySelectorAll<HTMLInputElement>(
    'input[type=number]'
  );
  expect(inputs.length).toBeGreaterThanOrEqual(2);
  await user.clear(inputs[0]);
  await user.type(inputs[0], blade);
  await user.clear(inputs[1]);
  await user.type(inputs[1], box);
}

describe('DoorCalculatorWizard — сравнение «вне каталога»', () => {
  it('сохраняет название и цены второй ручной модели', async () => {
    const user = userEvent.setup();
    render(<DoorCalculatorWizard context="lk" catalog={[]} />);

    await user.click(screen.getByRole('button', { name: '2' }));
    await goToStep3(user);
    await pickManualWithPrices(user, 'Тест', '5000', '2000');
    await user.click(screen.getByRole('button', { name: /Рассчитать/i }));

    const disc = document.querySelector<HTMLInputElement>('input[data-disc]');
    expect(disc).toBeTruthy();
    await user.clear(disc!);
    await user.type(disc!, '10');

    await user.click(screen.getByRole('button', { name: /Добавить модель для сравнения/i }));
    await pickManualWithPrices(user, 'Тест 2', '6000', '2500');
    await user.click(screen.getByRole('button', { name: /Добавить к сравнению/i }));

    expect(screen.getByText('Сравнение моделей')).toBeInTheDocument();
    const names = Array.from(document.querySelectorAll('.vcard__t b')).map((n) => n.textContent);
    expect(names).toContain('Тест');
    expect(names).toContain('Тест 2');

    const sums = Array.from(document.querySelectorAll('.vcard__sum')).map((n) => n.textContent);
    expect(sums[0]).not.toBe(sums[1]);
  });
});