# To Run - (API_TESTING)...
`pip install -r requirements.txt`

# Foldseek basic commands

## Database

### List of supported databases

`foldseek databases`

### Download database

We use `PDB` database. Name of local db will be `pdb`  
`pdb_tmp` is just for some temp files

`foldseek databases PDB pdb pdb_tmp`

## Search

## Foldseek easy-search

`foldseek easy-search 2src.pdb ../pdb aln_res tmp --max-seqs 20 --format-output query,target,alnlen,qseq,qstart,qend,qaln,alntmscore,tseq,tstart,tend,taln`

foldseek easy-search [pdb_file] [database] [res_file] [PARAMS]  

Params:
- `--max-seqs` - maximum number of returned matches
- `--format-output` - columns in result file [MORE](https://github.com/soedinglab/MMseqs2/wiki#custom-alignment-format-with-convertalis)

### TM-score

- Template modeling score
- Podobnosť dvoch proteínových štruktúr
- Nezávislé na ich dĺžkach
- Interval skóre (0,1]
- Skóre 1 znamená dokonalá zhoda medzi štruktúrami
- Obecne skóre pod 0,2 znamená *random* štruktúry
- Skóre nad 0,5 -> [same fold](https://pmc.ncbi.nlm.nih.gov/articles/PMC2913670/)
