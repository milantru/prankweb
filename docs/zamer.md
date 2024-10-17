# Zámer tímového projektu 
 
**Študijný program:** Softwarové a datové inženýrství  
**Typ projektu:** Softwarový projekt (NPRG069)  
**Študenti:** Katarína Bucková, Richard Fedák, Samuel Karaš, Milan Truchan   
**Vedúci:** doc. RNDr. David Hoksza, Ph.D.  
**Konzultanti:** Mgr. Marian Novotný, Ph.D., Bc. Lukáš Polák, Mgr. Petr Škoda, Ph.D.  
**Názov a téma projektu:** Plankweb (rozšírenie projektu Prankweb)

## Prehľad

Cieľom práce je rozšírenie existujúceho projektu [Prankweb](https://prankweb.cz/), ktorého hlavnou funkcionalitou je predikovanie a vizualizácia potenciálnych väzobných miest ligandov na základe štruktúr proteínov. V podstate pôjde o rozšírenie v 2 oblastiach - rozšírenie predikcie a analýzy.

### Rozšírenie predikcie

V súčasnosti Prankweb dokáže predikovať väzobné miesta v proteínovej štruktúre pomocou metódy P2Rank, pričom vstupom je vždy zadaná alebo predikovaná štruktúra. Cieľom rozšírenia je pridať možnosť predikcie na základe sekvencie a jej prevod do 3D štruktúry.
  
Na predikciu väzobných miest zo sekvencie využijeme existujúci pLM, ktorý vygeneruje tzv. embeddings – vektory aminokyselín opisujúce vlastnosti jednotlivých aminokyselín v závislosti na ich sekvenčnom kontexte. Každý embedding bude vstupom pre klasifikačnú neurónovú sieť, ktorá rozhodne, či daná aminokyselina je súčasťou nejakého väzobného miesta. 

V prípade, že užívateľ zadá na vstupe sekvenciu proteínu bude na vizualizáciu štruktúry query proteínu, a takisto na predikovania väzobných miest zo štruktúry (pomocou P2Ranku), potrebný jej prevod na 3D štruktúru. Na prevod bude využitá už existujúca predikčná metóda, ako je napr. AlphaFold alebo ESMFold.

### Rozšírenie analýzy

P2Rank a pLM slúžia k predikcií väzobných miest pre vstupný proteín. Dajú sa však chápať aj ako zdroje dát. Cieľom rozšírenia analýzy je vytvoriť dátový modul, ktorý bude schopný pracovať s danými (alebo novými) zdrojmi dát. Modul bude schopný vytvoriť agregované dáta. Tie by poskytol rozšírenému užívateľskému rozhraniu, ktoré umožní ich vizualizáciu pomocou zarovnaných sekvencií a superpozicovaných 3D štruktúr.

#### Dátový modul
Cieľom je implementovať jednoducho modifikovateľný modul. Modul by mal byť schopný interagovať s rôznymi zdrojmi dát. Mal by umožňovať jednoduché pridanie nového alebo odobranie využívaného zdroju. Dáta, ktoré nám zdroje poskytnú, bude schopný spracovať a agregovať do jedného výstupného formátu, ktorý bude obsahovať informácie o väzobných miestach k vstupnému proteínu alebo k podobným proteínovým štruktúram. 

#### Užívateľské rozhranie
Úlohou užívateľského rozhrania v kontexte rozšírenia analýzy je prezentácia dát poskytnutých užívateľom a dátovým modulom.

**Sekvenčny displej** bude mať za úlohu vykresliť sekvenciu zadanú užívateľom, spolu s predikovanými väzobnými miestmi. Dáta poskytnuté dátovým modulom môžu obsahovať aj proteíny podobné vstupnému proteínu. Ich sekvencie budú zobrazené v grafe a budú zarovnané voči vstupnému proteínu. Užívateľ bude mať možnosť vybrať jednotlivé sekvencie, ktoré sa následne zobrazia v Štruktúrnom displeji.

**Štruktúrny displej** bude slúžiť na vizualizáciu vybraných štruktúr (a väzobných miest) proteínu zo sekvenčného displeja, užívateľ si ich vizualizáciu môže svojvoľne zapínať a vypínať. Pri výbere viacerých proteínov budú štruktúry vo vizualizácii superpozicované.

## Štruktúra projektu

Projekt je rozdelený na štyri časti: Frontend, Backend, Dátová časť, AI.

### Frontend

Keďže naše rozšírenie zahŕňa pridanie predikovania na základe sekvencie proteínu, musí frontend zaistiť možnosť zadania sekvencie. 

Ďalej má frontend na starosti vizualizácie proteínov, konkrétne ide o 2 displeje:
- *Sekvenčný displej:* Jeho úlohou bude najmä vizualizovať sekvenciu vstupného proteínu, potenciálne väzobné miesta, ale aj iné informácie vrátane tých, ktoré poskytnú dátové zdroje z dátového modulu. Okrem toho bude mať displej umožniť užívateľovi výber proteínov (ak dátový modul poskytol ich štruktúry). 
- *Štruktúrny displej:* Tento displej má za úlohu vizualizovať vstupnú štruktúru a ak si užívateľ v sekvenčnom displeji vybral nejaké štruktúry, tak aj tie.

### Backend

# TODO - zjednotiť so špecifikáciou
Rozšírenie API pre funkcionality potrebné na fungovanie frontendu, pridanie dockerových kontajnerov a ich prepojenie s existujúcou architektúrou.

### Dátová časť

# TODO - zjednotiť so špecifikáciou
Práca s externými dátovými zdrojmi AHoJ-DB a Foldseek, vytvorenie šablón dotazov.

### AI
Cieľom je rozšírenie predikcie, a to natrénovať klasifikačnú neurónovú sieť, ktorá z proteínových sekvencií predikuje väzobné aminokyseliny proteínu a využiť existujúcu metódu na predikciu 3D štruktúry zo vstupnej sekvencie. Do klasifikačnej neurónovej siete budú vstupovať embeddingy získané zakódovaním proteínových sekvencií pomocou existujúceho pLM. 

## Približný priebeh

Odhadovaná dĺžka projektu je štandardných 9 mesiacov. Časti projektu sú nasledujúce:
1.	Oboznámenie sa s doménou a štruktúrou projektu
2.	Definícia funkčných požiadaviek
3.	Tvorba špecifikácie projektu
4.	Implementácia rozšírenia
5.	Návrh a vývoj prípadných dodatočných funkcionalít
6.	Testovanie
7.	Tvorba dokumentácie
