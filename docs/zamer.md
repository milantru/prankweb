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

Doteraz systém fungoval tak, že na vstupe dostal proteínovú štruktúru a z nej vypredikoval potenciálne väzobné miesta. No naše rozšírenie umožní užívateľom zadať sekvenciu namiesto štruktúry. Tá sa následne predá existujúcemu **pLM (protein Language Model)**, ktorý vygeneruje embeddings – feature vektory aminokyselín. Každý embedding bude vstupom pre klasifikačnú neurónovú sieť, ktorá rozhodne, či daná aminokyselina patrí alebo nepatrí do väzobného miesta. 

Okrem toho je cieľom pridať prevod sekvencie na 3D štruktúru. Tento prevod systému umožní jednak vizualizovať štruktúru query proteínu, ale takisto aj v prípade potreby využívať starý spôsob predikovania väzobných miest zo štruktúry (pomocou P2Ranku) aj napriek tomu, že užívateľ zadá na vstupe sekvenciu.

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

# TODO - zjednotiť so špecifikáciou

Využitie existujúceho pLM a natrénovanie klasifikačnej neurónovej siete pre predikciu väzobných miest.

## Približný priebeh

Odhadovaná dĺžka projektu je štandardných 9 mesiacov. Časti projektu sú nasledujúce:
1.	Oboznámenie sa s doménou a štruktúrou projektu
2.	Definícia funkčných požiadaviek
3.	Tvorba špecifikácie projektu
4.	Implementácia rozšírenia
5.	Návrh a vývoj prípadných dodatočných funkcionalít
6.	Testovanie
7.	Tvorba dokumentácie
