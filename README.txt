v4 — режим порядка вопросов
- В `config.json` добавлен `defaultOrder`: "shuffle" или "sequential".
- В UI (кнопка «Колода») появился переключатель «Порядок вопросов».
- При смене режима порядок перестраивается с начала.

Пример:
{
  "version": 4,
  "defaultOrder": "sequential",
  "categories": [...],
  "cards": [...]
}
