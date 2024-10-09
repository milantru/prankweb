# Zápisnica z meetingu 04.10.2024

## Účastníci
- p. Škoda
- celý tím

## Prebrané témy
- Sekvenčný postup programu (teda čo sa v ňom má diať, keď užívateľ zadá a potvrdí vstup): 

**Začiatok postupu...**
1. Užívateľ zadá sekvenciu -> Frontend (klient) pošle POST na webserver
    - Nie GET, lebo proteínová sekvencia je príliš dlhá
2. Webserver získa mapovanie seq_map
    - seq_map vytvorí verejne prístupná komponenta
    - Mapovanie seq -> seq_map sa môže diať napr. pomocou kľúč-hodnota databázy, kde kľúčom je seq a hodnota je generovaná (stačilo by asi aj 00000001, 00000002...)
3. Webserver vytvorí metatask, pripraví folder s menom seq_map a pošle seq_map klientovi
4. Klient polluje webserver so seq_map či je metatask hotový, *alebo alternatívne* môže klient pollovať jednotlivé tasky (vypustené metataskom) cez ich vlastné API (ak ho budú mať)

---

**Metatask bol spustený...**

5. Metatask vytvorí tasky, ktoré potrebujú sekvenciu
    - Identifikátor bude seq_map + typ tasku
6. Získa vypredikovanú štruktúru (http call, CLI?, ďalší task,...)
    - Štruktúra bude indentifikovaná seq_mapom
7. Vytvorí tasky, ktoré potrebujú štruktúru
    - Identifikátor bude seq_map + typ tasku

---

**Tasky dobehnú...**

Ak má každý task http API, tak metatask nemusí nič vedieť.  
*ALEBO*  
Ak task skončí, dá metatasku vedieť.

---

**Iné**

Dátový formát pre anotácie (resp. výstup taskov)

## TODO

- Pracovať ďalej na špecifikácii
- Navrhnúť UI vzhľadom k spomínaným funkcionalitám (z predošlého meetingu)
- Rozmyslieť si formát pre výstup taskov (?)
- Pracovať na analýze (komentáre p. Škodu na MM), t.j.
    1. Identifikovať užívateľa
    2. "User scenarios"
    3. Vytvoriť wireframy pre jednotlivé obrazovky (hlavne ako doplnok k 2.)
