import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DoorCalculatorWizard } from '@/components/doorCalculator/DoorCalculatorWizard';
import { DoorOfferPage } from '@/components/doorCalculator/DoorOfferPage';
import { buildOfferPayload, encodeOfferPayload } from '@/lib/doorCalculator/offer';
import { newOpening } from '@/lib/doorCalculator/calc';

const view = new URLSearchParams(location.search).get('view') ?? 'wizard';

function WizardHarness() {
  return (
    <div style={{ minHeight: '100vh' }}>
      <DoorCalculatorWizard context="lk" />
    </div>
  );
}

function OfferHarness() {
  const model = {
    id: 'demo',
    manual: false,
    name: 'Скандинавия 01',
    maker: 'Фабрика «Север»',
    price: 9800,
    blades: [{ w: 800, from: 851, to: 940 }],
    color: '#e9e4da',
  };
  const payload = buildOfferPayload(
    [
      { ...newOpening(1), room: 'Кухня', w: '870', h: '2050', depth: '300' },
      { ...newOpening(2), room: 'Спальня', w: '770', h: '2070', depth: '100' },
    ],
    model,
    { blade: 9800, box: 1570, d100: 1180, d150: 1670, nal: 590, hinge: 440, handle: 1180, lock: 780 },
    5,
    true,
    {
      client: 'Иванова Мария',
      phone: '+7 900 000-00-00',
      address: 'г. Краснодар, ул. Примерная, 10',
    }
  );
  const hash = encodeOfferPayload(payload);
  window.location.hash = hash;

  return (
    <DoorOfferPage
      context="lk"
      initialPartner={{
        company: '«Оптовик» · демо',
        manager: 'Менеджер по дверям',
        phone: '+7 861 000-00-00',
        messenger: 'Telegram',
        email: 'sales@demo.example',
        site: 'demo.example',
        address: 'г. Краснодар',
        note: 'Демо-данные для скриншота.',
        logo: '',
      }}
    />
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>{view === 'offer' ? <OfferHarness /> : <WizardHarness />}</StrictMode>
);