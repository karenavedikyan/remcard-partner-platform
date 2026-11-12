# RemCard: общий прототип (партнёрская часть)

Дословная копия `prototype/current/` из комплекта «RemCard-prototype-2026-11-11»: корневой `index.html`,
`preview-memory.js`, `serve.json` и весь каталог `partner/`. Каталоги `client/` и `admin/` в репозиторий
не добавлены (они подставляются при сборке предпросмотра), поэтому ссылки на них локально дают 404.

Запуск: `npx serve design/general-prototype -l 8080` или `python3 -m http.server 8080 --directory design/general-prototype`,
затем `http://127.0.0.1:8080/partner/index.html` → «Сценарии прототипа» → роль → «Кабинет».

Это макет: только демонстрационные данные, никаких API и браузерных хранилищ
(`localStorage`/`sessionStorage`/`indexedDB` запрещены, см. `preview-memory.js`).
