# Plankweb testing scenarios

## Experimental structure

|              | FE                                     | BE (POST request fields)                |
| ------------ | -------------------------------------- | --------------------------------------- |
| Input method | Select Experimental structure combobox | inputMethod: '0'                        |
| PDB ID       | Write PDB code to textbox              | pdbCode: valid / invalid / missing      |
| Chains       | Check / uncheck Use original structure:<br><ul><li>If **unchecked**, chains should show up</li></ul> | chains: empty string / string of chain IDs separated by commas / missing |
| Conservation | Check / Uncheck Use conservation   | useConservation: true / false / missing |

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

|              | FE                                  | BE (POST request fields)                |
| ------------ | ----------------------------------- | --------------------------------------- |
| Input method | Select AlphaFold structure combobox | inputMethod: '2'                        |
| Uniprot ID   | Write Uniprot ID to textbox         | uniprotCode: valid / invalid/ missing   |
| Conservation | Check / Uncheck Use conservation    | useConservation: true / false / missing |

## Sequence

- inputMethod: '3'

## Invalid/No input method (BE only, cannot happend on FE)