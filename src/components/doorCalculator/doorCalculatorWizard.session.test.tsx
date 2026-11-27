import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DOOR_WIZARD_SESSION_KEY } from '@/lib/doorCalculator/wizardSession';
import { DoorCalculatorWizard } from './DoorCalculatorWizard';

describe('DoorCalculatorWizard — sessionStorage', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('восстанавливает расчёт после размонтирования', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<DoorCalculatorWizard context="lk" catalog={[]} />);

    await user.click(screen.getByRole('button', { name: '2' }));
    await user.click(screen.getByRole('button', { name: /Далее: размеры/i }));
    await user.type(screen.getByPlaceholderText('900'), '900');
    await user.type(screen.getByPlaceholderText('250'), '250');

    unmount();

    render(<DoorCalculatorWizard context="lk" catalog={[]} />);
    expect(screen.getByPlaceholderText('900')).toHaveValue(900);
    const raw = sessionStorage.getItem(DOOR_WIZARD_SESSION_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!).openings).toHaveLength(2);
  });

  it('очищает sessionStorage при закрытии', async () => {
    const user = userEvent.setup();
    render(<DoorCalculatorWizard context="lk" catalog={[]} />);
    await user.click(screen.getByRole('button', { name: '2' }));
    expect(sessionStorage.getItem(DOOR_WIZARD_SESSION_KEY)).toBeTruthy();
    await user.click(screen.getByRole('link', { name: /Закрыть калькулятор/i }));
    expect(sessionStorage.getItem(DOOR_WIZARD_SESSION_KEY)).toBeNull();
  });
});