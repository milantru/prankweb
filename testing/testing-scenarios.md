# POST request testing scenarios

## Experimental structure

### Input Mapping: Front-End to Back-End (POST Request)

| Field           | Front-End (FE) Interaction                    | Back-End (BE) Payload                          |
|-----------------|-----------------------------------------------|------------------------------------------------|
| **Input Method**| Select from *Experimental structure* combobox | `inputMethod: '0'`                             |
| **PDB ID**      | Type into *PDB code* textbox                  | `pdbCode: "<user input>"`                      |
|                 |                                               | - Valid                                        |
|                 |                                               | - Invalid                                      |
|                 |                                               | - Missing (not provided)                       |
| **Chains**      | *Use original structure* checkbox:            | `chains: "<user input> or <empty_string>"`     |
|                 | - **Checked**: hide chain input               | - `""` (empty string)                          |
|                 | - **Unchecked**: show chain input field       | - `"<comma-separated valid/invalid chain IDs>"`|
|                 |                                               | - Missing (not provided)                       |
| **Conservation**| Check / Uncheck *Use conservation* checkbox   | `useConservation: true` / `false` / (Missing)  |


## Custom structure

- valid/invalid chains:
  - FE: chain IDs separated by commas
  - BE: empty string, chain IDs separated by commas, missing
- input model:
  - FE: comboboxes
  - BE: '0', '1', '2', '3', missing

| Field              | Front-End (FE) Interaction                    | Back-End (BE) Payload                           |
|--------------------|-----------------------------------------------|-------------------------------------------------|
| **Input Method**   | Select from *Custom structure* combobox       | `inputMethod: '1'`                              |
| **Structure file** | Select file from file system                  | `userFile: "<user file>"`                       |
|                    |                                               | - Valid                                         |
|                    |                                               | - Invalid                                       |
|                    |                                               | - Missing (not provided)                        |
| **Chains**         | Type chains into *Restrict to chains* textbox | `chains: "<user input> or <empty_string>"`      |
|                    |                                               | - `""` (empty string)                           |
|                    |                                               | - `"<comma-separated valid/invalid chain IDs>"` |
|                    |                                               | - Missing (not provided)                        |
| **InputModel**     | Select from *Input model* combobox            | `userInputModel: "<user input>"`                |
|                    |                                               | - Valid: `'0'` / `'1'` / `'2'` / `'3'`          |
|                    |                                               | - Invalid                                       |
|                    |                                               | - Missing (not provided)                        |

## AlphaFold structure

### Input Mapping: Front-End to Back-End (POST Request)

| Field           | Front-End (FE) Interaction                       | Back-End (BE) Payload                             |
|-----------------|--------------------------------------------------|---------------------------------------------------|
| **Input Method**| Select from *AlphaFold structure* combobox       | `inputMethod: '2'`                                |
| **Uniprot ID**  | Type into *Uniprot ID* textbox                   | `uniprotCode: '<user input>'`                     |
|                 |                                                  | - Valid                                           |
|                 |                                                  | - Invalid                                         |
|                 |                                                  | - Missing (not provided)                          |
| **Conservation**| Check / Uncheck *Use conservation* checkbox      | `useConservation: 'true'` / `'false'` / (Missing) |


## Sequence

### Input Mapping: Front-End to Back-End (POST Request)

| Field           | Front-End (FE) Interaction                       | Back-End (BE) Payload                           |
|-----------------|--------------------------------------------------|-------------------------------------------------|
| **Input Method**| Select from *Sequence* combobox                  | `inputMethod: '3'`                              |
| **Sequence**    | Type into *Sequence* textbox                     | `sequence: "<user input>"`                      |
|                 |                                                  | - Valid                                         |
|                 |                                                  | - Invalid: too short / too long / invalid chars |
|                 |                                                  | - Missing (not provided)                        |
| **Conservation**| Check / Uncheck *Use conservation* checkbox      | `useConservation: true` / `false` / (Missing)   |


## Invalid/No input method (BE only, cannot happend on FE)

# Get ID testing scenarios

- get-id
- input_method: Valid / Invalid / Missing
- input_protein: In database / Not in database / Missing