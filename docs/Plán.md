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
- [ ] ESMFold - spojazdniť predikciu
- [ ] ESM - spojazdniť predikciu
  - [ ] NN - napojenie na ESM fold embeddingy
    - [ ] dataset - nájsť vhodné datasety na trénovanie
    - [ ] parametre - hyperparameter tuning
    - [ ] trénovanie
    - [ ] testovanie 
- [ ] ...
