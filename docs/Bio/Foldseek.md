# Foldseek

Keďže zarovnavanie (alignment) na úrovni aminokyselín nemusí byť veľmi spoľahlivé, využijeme Foldseek - nástroj pre rýchle vyhľadávanie homologických sekvencií proteínov.

## Ako to funguje - v skratke

Štruktúra je zakódovaná do tkz. 3Di sekvencie.

Chceme zakódovať reziduum (aminokyselina v proteíne) do 3Di abecedy -> nájdeme "meaningful" nearest neighbor (cez virtual centers) -> získame 10 descriptors (vzdialenosti medzi bodmi NN a reziduom, uhol ...) -> pošleme do vqvae -> encoding do 3Di sekvencie, decoding naspäť do štruktúry

Takto zarovnávame sekvencie v 3Di forme s ostatnými a získame podobné proteínové štruktúry.
Zarovnávanie proteínových sekvenci v 3Di forme je spoľahlivejšie (narozdiel od klasickej sekvencie popísanej len pomocou značiek aminokyselín), pretože ako bolo spomenuté, kóduje v sebe aj "informáciu o okolí".

## Fázy Foldseeku

1. Pre-filter - Filtrovanie štruktúr cez K-mers (?) - cez filter prejdú štruktúry s aspoň nejako rozumným skóre.

2. Alignment - Zarovnanie pomocou 3Di reprezentácie


## Použitie

Vstup:  
- .pdb file - Obsahuje štruktúru
- FASTA file - Obsahuje sekvenciu (Foldseek spraví structure prediction)

Databázy:  
Foldseeku je potrebné poskytnúť dáta aby vedel vyhľadávať podobné proteíny voči vstupu (AHOJ-DB, a ďalšie...). 

Foldseek WebServer:  
Výsledky už obsahujú superpozicované dvojice... využitie pre frontend ???

Foldseek CLI:
install foldseek (linux, macos) / conda, umožnuje vytvorenie/napojenie db, vygeneruje HTML pre výsledky
TODO...
https://youtu.be/k5Rbi22TtOA?si=lU3EXfIAC8jzCV9S