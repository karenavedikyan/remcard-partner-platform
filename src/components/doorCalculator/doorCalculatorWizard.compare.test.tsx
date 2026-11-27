import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDoorWizard } from './useDoorWizard';
import { DEMO_DOOR_MODELS } from '@/lib/doorCalculator/modelSource';
import { MAX_COMPARE_VARIANTS } from '@/lib/doorCalculator';

describe('useDoorWizard — сравнение моделей', () => {
  it('сбрасывает варианты при изменении числа проёмов', () => {
    const { result } = renderHook(() => useDoorWizard(DEMO_DOOR_MODELS));
    act(() => {
      result.current.pickModel('m1');
      result.current.setVariants([result.current.snap()]);
      result.current.setOpeningCount(2);
    });
    expect(result.current.variants).toHaveLength(0);
    expect(result.current.openings).toHaveLength(2);
  });

  it('общая скидка применяется ко всем вариантам сравнения', () => {
    const { result } = renderHook(() => useDoorWizard(DEMO_DOOR_MODELS));
    act(() => {
      result.current.pickModel('m1');
      result.current.updateOpening(result.current.openings[0].id, {
        w: '900',
        depth: '250',
      });
      result.current.setDisc('10');
      const v1 = result.current.snap();
      result.current.pickModel('m3');
      const v2 = result.current.snap();
      result.current.setVariants([v1, v2]);
      result.current.setVi(0);
      result.current.load(v1);
    });
    expect(result.current.compareRows.length).toBe(2);
    expect(result.current.compareRows[0].t.dp).toBe(10);
    expect(result.current.compareRows[1].t.dp).toBe(10);
  });

  it('не более MAX_COMPARE_VARIANTS вариантов', () => {
    const { result } = renderHook(() => useDoorWizard(DEMO_DOOR_MODELS));
    const snaps = DEMO_DOOR_MODELS.slice(0, MAX_COMPARE_VARIANTS).map((m) => {
      let snap = null as ReturnType<typeof result.current.snap>;
      act(() => {
        result.current.pickModel(m.id);
        snap = result.current.snap();
      });
      return snap!;
    });
    act(() => {
      result.current.setVariants(snaps);
    });
    expect(result.current.variants.length).toBe(MAX_COMPARE_VARIANTS);
    expect(result.current.maxVariants).toBe(4);
  });

  it('удаление варианта из сравнения', () => {
    const { result } = renderHook(() => useDoorWizard(DEMO_DOOR_MODELS));
    act(() => {
      result.current.pickModel('m1');
      const v1 = result.current.snap();
      result.current.pickModel('m3');
      const v2 = result.current.snap();
      result.current.setVariants([v1, v2]);
      result.current.setVariants([v1]);
      result.current.setVi(0);
      result.current.load(v1);
    });
    expect(result.current.variants.length).toBe(1);
    expect(result.current.compareRows.length).toBe(0);
  });
});