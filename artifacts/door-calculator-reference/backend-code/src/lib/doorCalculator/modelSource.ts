import type { DoorCatalogModel, DoorModelSource } from './types';

/** Прод: каталог 1С пока пуст — режим «Из каталога» скрыт */
export const emptyDoorModelSource: DoorModelSource = {
  listModels() {
    return [];
  },
};

/** Фикстуры прототипа — только для тестов */
export const DEMO_DOOR_MODELS: DoorCatalogModel[] = [
  {
    id: 'm1',
    name: 'Скандинавия 01',
    maker: 'Фабрика «Север»',
    color: '#e9e4da',
    price: 9800,
    blades: [
      { w: 600, from: 720, to: 790 },
      { w: 700, from: 791, to: 850 },
      { w: 800, from: 851, to: 940 },
      { w: 900, from: 941, to: 1040 },
    ],
  },
  {
    id: 'm2',
    name: 'Лофт 2',
    maker: 'Вега',
    color: '#8d8a86',
    price: 11400,
    blades: [
      { w: 600, from: 700, to: 770 },
      { w: 700, from: 771, to: 840 },
      { w: 800, from: 841, to: 930 },
      { w: 900, from: 931, to: 1020 },
    ],
  },
  {
    id: 'm3',
    name: 'Классика Н',
    maker: 'Вега',
    color: '#c9a77c',
    price: 8600,
    blades: null,
    dobors: [100, 150],
  },
  {
    id: 'm4',
    name: 'Модерн 5 стекло',
    maker: 'Фабрика «Север»',
    color: '#f1f1ef',
    price: 12900,
    blades: [
      { w: 700, from: 791, to: 850 },
      { w: 800, from: 851, to: 940 },
    ],
  },
  {
    id: 'm5',
    name: 'Эко 10',
    maker: 'Дом дверей',
    color: '#b9b3a8',
    price: 6900,
    blades: null,
  },
  {
    id: 'm6',
    name: 'Тоскана',
    maker: 'Дом дверей',
    color: '#6b5b4b',
    price: 14200,
    blades: [
      { w: 600, from: 705, to: 775 },
      { w: 700, from: 776, to: 845 },
      { w: 800, from: 846, to: 935 },
    ],
  },
];