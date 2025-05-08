# POST request testing scenarios

## Experimental structure

### Input Mapping: Front-End to Back-End (POST Request)

| Field           | Front-End (FE) Interaction                                         | Back-End (BE) Payload                                      |
|-----------------|--------------------------------------------------------------------|------------------------------------------------------------|
| **Input Method**| Select from *Experimental structure* combobox                      | `inputMethod: '0'`                                         |
| **PDB ID**      | Type into *PDB code* textbox                                       | `pdbCode: "<user input>"`                                  |
|                 |                                                                    | - Valid                                                    |
|                 |                                                                    | - Invalid                                                  |
|                 |                                                                    | - Missing (not provided)                                   |
| **Chains**      | *Use original structure* checkbox:                                 | `chains: "<user input>"`                                   |
|                 | - **Checked**: hide chain input                                    | - `""` (empty string)                                      |
|                 | - **Unchecked**: show chain input field                            | - `"<comma-separated chain IDs>"`, or Missing              |
|                 |                                                                    | - Missing (not provided)                                    |
| **Conservation**| Check / Uncheck *Use conservation* checkbox                        | `useConservation: true` / `false` / (Missing)              |


## Custom structure

- inputMethod: '1'
- Valid/Invalid Structure file:
  - FE: select file
  - BE: userFile in POST, missing
- valid/invalid chains:
  - FE: chain IDs separated by commas
  - BE: empty string, chain IDs separated by commas, missing
- input model:
  - FE: comboboxes
  - BE: '0', '1', '2', '3', missing

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
| **Input Method**| Select from *AlphaFold structure* combobox       | `inputMethod: '3'`                              |
| **Sequence**    | Type into sequence textbox                       | `sequence: "<user input>"`                      |
|                 |                                                  | - Valid                                         |
|                 |                                                  | - Invalid: too short / too long / invalid chars |
|                 |                                                  | - Missing (not provided)                        |
| **Conservation**| Check / Uncheck *Use conservation* checkbox      | `useConservation: true` / `false` / (Missing)   |


## Invalid/No input method (BE only, cannot happend on FE)

# Get ID testing scenarios

- curl get_id