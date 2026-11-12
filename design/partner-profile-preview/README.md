# Partner profile preview (Stage A)

Static prototype for «Партнёры → профиль контрагента». No backend, no build.

## Open locally

```bash
cd design/partner-profile-preview
python3 -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/` (or open `index.html` directly — clipboard may require localhost).

## Smoke flow

1. Toggle **Список / Карточки** and open any partner row.
2. Check **pw-summary** header, facts, chips, **ID партнёра** copy.
3. Switch **Как видит партнёр** → зеркальный просмотр.
4. **← Назад** or **Escape** returns focus to the list card.
5. **Тёмная тема** on 375px viewport.
