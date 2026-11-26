import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DoorCalculatorWizard } from './DoorCalculatorWizard';

describe('DoorCalculatorWizard', () => {
  it('shows step 1 opening count', () => {
    render(<DoorCalculatorWizard />);
    expect(screen.getByRole('heading', { name: /Сколько проёмов/i })).toBeInTheDocument();
    expect(document.querySelector('.count__n b')?.textContent).toBe('1');
  });

  it('navigates to step 2 and shows scene', async () => {
    const user = userEvent.setup();
    render(<DoorCalculatorWizard />);
    await user.click(screen.getByRole('button', { name: /Далее: размеры/i }));
    expect(screen.getByPlaceholderText('900')).toBeInTheDocument();
    expect(screen.getByTestId('door-scene')).toBeInTheDocument();
  });

  it('lk breadcrumbs point to cabinet home', () => {
    render(<DoorCalculatorWizard context="lk" />);
    expect(screen.getByText('Калькулятор дверей')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Кабинет' })).toHaveAttribute('href', '/');
  });

  it('step 3 requires manual model when catalog empty', async () => {
    const user = userEvent.setup();
    render(<DoorCalculatorWizard />);
    await user.click(screen.getByRole('button', { name: /Далее: размеры/i }));
    await user.click(screen.getByRole('button', { name: /Далее:/i }));
    expect(screen.getByRole('heading', { name: /Какая модель/i })).toBeInTheDocument();
    expect(screen.getByText(/Каталог пока пуст/i)).toBeInTheDocument();
    const calcBtn = screen.getByRole('button', { name: /Рассчитать/i });
    expect(calcBtn).toBeDisabled();
    await user.click(screen.getByText('Вне каталога'));
    expect(calcBtn).not.toBeDisabled();
  });
});