# Zámer tímového projektu 
 
**Študijný program:** Softwarové a datové inženýrství  
**Typ projektu:** Softwarový projekt (NPRG069)  
**Študenti:** Katarína Bucková, Richard Fedák, Samuel Karaš, Milan Truchan   
**Vedúci:** doc. RNDr. David Hoksza, Ph.D.  
**Konzultanti:** Mgr. Marian Novotný, Ph.D., Bc. Lukáš Polák, Mgr. Petr Škoda, Ph.D.  
**Názov a téma projektu:** Plankweb (rozšírenie projektu Prankweb)

## Prehľad

Cieľom práce je rozšírenie existujúceho projektu [Prankweb](https://prankweb.cz/), ktorého hlavnou funkcionalitou je predikovanie a vizualizácia potenciálnych väzobných miest ligandov na základe štruktúr proteínov. Pôjde o rozšírenie v dvoch oblastiach - rozšírenie predikcie a analýzy.

### Rozšírenie predikcie

V súčasnosti Prankweb dokáže predikovať väzobné miesta v proteínovej štruktúre pomocou metódy [P2Rank](https://github.com/cusbg/p2rank-framework), pričom vstupom je vždy 3D štruktúra proteínu. Cieľom rozšírenia je pridať možnosť predikcie na základe sekvencie a jej prevod do 3D štruktúry.
  
Na predikciu väzobných miest zo sekvencie sa využije existujúci Protein Language Model (pLM), ktorý vygeneruje tzv. embeddings – vektory opisujúce vlastnosti jednotlivých aminokyselín v závislosti na ich sekvenčnom kontexte. Každý embedding bude vstupom pre klasifikačnú neurónovú sieť, ktorá rozhodne, či daná aminokyselina je súčasťou nejakého väzobného miesta. 

Zadaním sekvencie proteínu bude na vizualizáciu štruktúry, a takisto na predikovanie väzobných miest (pomocou P2Ranku), potrebný jej prevod na 3D štruktúru. Na prevod bude využitá už existujúca predikčná metóda (napr. AlphaFold alebo ESMFold).

### Rozšírenie analýzy

P2Rank a pLM sa dajú chápať ako zdroje dát, ktoré pre vstupný proteín poskytujú informácie o väzobných miestach. V súčasnosti existujú rôzne ďalšie zdroje dát. Buď také, ktoré pre vstupný proteín vrátia už predpočítané väzobné miesta s konkrétnymi ligandmi. Alebo také, ktoré dokážu nájsť proteíny, ktoré sú vstupnému proteínu podobné 3D štruktúrou a obsahujú informácie o väzobných miestach a ligandoch.  
Rozšírenie analýzy zahŕňa návrh systému pre prácu s rôznymi zdojmi dát a vytvorenie nového užívateľského rozhrania, ktoré umožní vizualizáciu dát získaných z dátových zdrojov.

#### Systém pre prácu s dátovými zdrojmi

Systém sa postará o celý priebeh od spracovania vstupu od užívateľa, získania dát z rôznych dátových zdrojov až po poskytnutie dát užívateľskému rozhraniu. Súčasťou vytvorenia systému bude:
- Vytvorenie modulu, ktorý pre vstup vytvorí identifikátor reprezentujúci vstupný proteín.
- Návrh rozhrania, ktoré bude popisovať základné funkcionality pre prácu s dátovými zdrojmi.
- Vytvorenie modulov pre prácu s dátovými zdrojmi.
- Návrh jednotného formátu pre dáta získané z dátových zdrojov a poskytnúť tieto dáta užívateľskému rozhraniu


#### Užívateľské rozhranie
Úlohou užívateľského rozhrania v kontexte rozšírenia analýzy je prezentácia dát poskytnutých užívateľom a dátovými zdrojmi.

**Sekvenčný displej** má za úlohu vykresliť sekvenciu zadanú užívateľom (spolu s informáciami o nej) a taktiež aj dáta poskytnuté dátovými zdrojmi. Ak niektorý z dátových zdrojov bude poskytovať aj proteínovú štruktúru, tak rozhranie umožní užívateľovi zvoliť si daný proteín (resp. proteíny). Výber týchto proteínov bude mať vplyv na vizualizáciu v štruktúrnom displeji.

**Štruktúrny displej** bude slúžiť na vizualizáciu vybraných štruktúr proteínu zo sekvenčného displeja, jeho väzobných miest a ligandov. Užívateľ si bude môcť vizualizovať štruktúry a ligandy podľa potreby. Pri výbere viacerých proteínov budú štruktúry vo vizualizácii superpozicované.

## Štruktúra projektu

Projekt je rozdelený na štyri časti: Frontend, Backend, Dátová časť, AI.

### Frontend

Úlohou bude zabezpečiť možnosť zadania proteínovej sekvencie a vytvorenie Sekvenčného a Štruktúrneho displeja. Frontend zodpovedá za vizualizáciu proteínov prostredníctvom týchto displejov.

### Backend

Hlavnou úlohou backendu je poskytnúť funkčné prostredie na chod systému pre prácu s dátovými zdrojmi. Architektúra bude pozostávať z viacerých navzájom komunikujúcich Docker kontajnerov. Súčasťou je aj vytvorenie API, ktoré bude slúžiť na obdržanie dát získaných z jednotlivých dátových zdrojov.

### Dátová časť

Vytvorenie systému, ktorý spracuje vstup od užívateľa a zabezpečí komunikáciu s rôznymi zdrojmi dát. Súčasťou je analýza jednotlivých dátových zdrojov. Na základe tejto analýzy je potrebné navrhnúť rozhranie pre interakciu týmito dátovými zdrojmi a definovať jednotný formát dát, ktoré budú poskytnuté užívateľskému rozhraniu.

### AI

Cieľom je rozšírenie predikcie, a to natrénovať klasifikačnú neurónovú sieť, ktorá z proteínových sekvencií predikuje väzobné aminokyseliny proteínu a využiť existujúcu metódu na predikciu 3D štruktúry zo vstupnej sekvencie. Do klasifikačnej neurónovej siete budú vstupovať embeddingy získané zakódovaním proteínových sekvencií pomocou existujúceho pLM. 

## Približný priebeh

Odhadovaná dĺžka projektu je štandardných 9 mesiacov. Časti projektu sú nasledujúce:
1.	Oboznámenie sa s doménou a štruktúrou projektu
2.	Definícia funkčných požiadaviek
3.	Tvorba špecifikácie projektu
4.	Implementácia rozšírenia
5.	Testovanie
6.	Tvorba dokumentácie
