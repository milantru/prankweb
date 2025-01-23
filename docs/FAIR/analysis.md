# FAIR principles

## 1. Findability

- **Jedinečné identifikátory**:
    - Priradiť jedinečné ID ku každému vstupu.

- **Metadata**:
    - Poskytnúť metadata pre každý výsledok z dátového zdroja:
        - Executor (názov, verzia).
        - ID vstupu
        - Timestamp.
        - Licencia a prístupové práva. ???
    - Príklad:
        ```json
        "metadata": {
            "input_id": "ABC123",
            "executor_name": "Foldseek",
            "executor_version": "4.2",
            "timestamp": "2025-01-23T12:00:00Z",
            "license": ""
        }
        ```

- **Endpoint**:
    - Vytvoriť endpoint (pre každý executor) na dotazovanie.

## 2. Accessibility

- **HTTP API**:
    - Endpointy na prístup k dátam:
        - `GET /api/{executor}/{ID}/result`: Získať JSON dáta pre dané ID z daného executora.
        - `GET /api/{executor}/{ID}/{file}`: Získať súbory (napr. `.pdb`, `.fasta`) pre dané ID ???

- **Získavanie dát**:
    - Použiť URL alebo ID v JSON formáte na odkazovanie na stiahnuteľné súbory.
        - Príklad:
            ```json
            "structure_data": {
                "format": "PDB",
                "structure_url": "https://prankweb.cz/api/executor1/ABC123/2src.pdb"
            }
            ```
- **Spracovanie chýb**:
    - Zabezpečiť chybové správy:
        - `404 Not Found`: Neexistujúce ID.
        - `400 Bad Request`: Zlý endpoint.
        - `202 Accepted`: Výsledok sa ešte počíta.
        - ...

## 3. Interoperability

- **Štandardizované formáty**:
    - Pre sekvenčné dáta: Použiť formát **FASTA**.
    - Pre štruktúrne dáta: Použiť formát **PDB** alebo **CIF**.
    - Pre metadata a API odpovede: Použiť **JSON**.

- **Štandardné slovníky**: TODO...
    - Odkazovať na uznávané identifikátory a ontológie:
        - Proteíny: Použiť UniProt alebo PDB ID.
        - Ligandy: Použiť ChEBI alebo PubChem identifikátory.
        - Väzobné miesta: Použiť štandardné označenie rezíduí (napr. `ARG45`).

- **API dokumentácia**:
    - Poskytnúť API dokumentáciu (napr. Swagger).

## 4. Reusability

- **Metadata**:
    - Zahrnúť podrobné informácie o pôvode dát (napr. zdroj dát).
        - Príklad:
            ```json
            "metadata": {
                "executor_name": "Foldseek",
                "parameters": {
                    "e_value": 0.001,
                    "database": "PDB"
                }
            }
            ```

- **Modulárne dáta**:
    - Použiť ľahké JSON payloady s URL odkazmi na dátové súbory.

- **Licencovanie dát**: TODO...
    - Zabezpečiť jasné licencovanie datasetov na znovupoužitie (napr. `CC-BY-4.0`).

- **Verzovanie**: TODO...
    - Sledovať a zverejňovať informácie o verziách:
        - Datasetov (napr. verzia PDB databázy).
        - Exekútorov/algoritmov.

# [SHARED DATA FORMAT](./dataSourceFormat.txt)