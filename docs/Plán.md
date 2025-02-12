# UI
- [ ] Úvodná stránka
  - [ ] Skopírovať z Prankweb repo stránku
  - [ ] Analyzovať submit formu, čo sa posiela, aký formát
  - [ ] Pridať novú vstupnú metódu
- [ ] Analytická stránka
  - [ ] Sequence dislay
    - [ ] Loading, vyskúšať loading v seq.d. , polling
    - [ ] Zarovnanie sekvencií
  - [ ] Structure display
    - [ ] ***Mol**** - ako zapnúť, ako zobraziť proteín, ako zobraziť ligand ...
    - [ ] Loading, polling
    - [ ] Vytvoriť komponenty (Mol*, ligand window, ...)
    - [ ] Zobrazovanie štruktúr, superpozícia ?
    - [ ] Zobrazovanie ligandov
    - [ ] Mód zvýr. vaz. m.
  - [ ] Prepojiť displays, eventy, highlighting
- [ ] ...

# Infrastructure
- [ ] RabbitMQ, Celery, Metatask
  - [ ] Demo - script na enqueue tasku so simulovaným vstupom (2SRC pdb ID) - RabbitMQ rozpošle task zdrojom
- [ ] Cache pre opakované inputy
  - [ ] Generovanie ID pre inputy
- [ ] Prepojenie modulov...
- [ ] ...

# Data
- [ ] Jednotný formát, typing jednotný formát
- [ ] DS - P2Rank
  - [ ] Upraviť výsledný formát
  - [ ] Prepojenie s RabbitMQ, Celery
  - [ ] HTTP API pre polling...
  - [ ] Logging
- [ ] DS - Foldseek
  - [ ] Prepojenie s RabbitMQ, Celery
  - [ ] Návrh folder structure
  - [ ] HTTP API pre polling
  - [ ] Logging
- [ ] DS - AhojDB ?
- [ ] ...

# pLM
- [ ] DS - pLM
  - [ ] Prepojenie s RabbitMQ, Celery
  - [ ] HTTP API pre polling
  - [ ] Logging
  - [ ] ...