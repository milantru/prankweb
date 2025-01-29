>### To Run - (API_TESTING)...
>`pip install -r requirements.txt`

# Foldseek basic commands (CLI)


## Installation

```
wget https://mmseqs.com/foldseek/foldseek-linux-avx2.tar.gz; tar xvzf foldseek-linux-avx2.tar.gz; export PATH=$(pwd)/foldseek/bin/:$PATH
--OR--
wget https://mmseqs.com/foldseek/foldseek-linux-sse2.tar.gz; tar xvzf foldseek-linux-sse2.tar.gz; export PATH=$(pwd)/foldseek/bin/:$PATH
```

## Database

### List of supported databases

`foldseek databases`

### Download database

We use `PDB` database. (Create `database` folder and `cd` there...)

`foldseek databases PDB pdb pdb_tmp`

`pdb` - name of local db
`pdb_tmp` - is just for some temp files

Create index for database.

`foldseek createindex pdb pdb_tmp`

## Search

Search is done via CLI

### Foldseek easy-search

`foldseek easy-search [pdb_file] [database] [res_file] [tmp_folder] [PARAMS]`  

`foldseek easy-search 2src.pdb database/pdb aln_res tmp --max-seqs 20 --format-output query,target,alnlen,qseq,qstart,qend,qaln,alntmscore,tseq,tstart,tend,taln`


Params:
- `--max-seqs` - maximum number of returned matches
- `--format-output` - columns in result file [MORE](https://github.com/soedinglab/MMseqs2/wiki#custom-alignment-format-with-convertalis)
  - `query` - Query sequence identifier
  - `target` - Target sequence identifier
  - `alnlen` - Alignment length
  - `qseq` - Query sequence - FULL
  - `qstart` - 1-indexed alignment start position in query sequence
  - `qend` - 1-indexed alignment end position in query sequence
  - `qaln` - Aligned query sequence with gaps - Only aligned part
  - `alntmscore` - Template modeling score
  - `tseq` - Target sequence - FULL
  - `tstart` - 1-indexed alignment start position in target sequence
  - `tend` - 1-indexed alignment end position in target sequence
  - `taln` - Aligned target sequence with gaps - Only aligned part

### TM-score

- Template modeling score
- Podobnosť dvoch proteínových štruktúr
- Nezávislé na ich dĺžkach
- Interval skóre (0,1]
- Skóre 1 znamená dokonalá zhoda medzi štruktúrami
- Obecne skóre pod 0,2 znamená *random* štruktúry
- Skóre nad 0,5 -> [same fold](https://pmc.ncbi.nlm.nih.gov/articles/PMC2913670/)

## Output

SINGLE-FULL
```
2src	2h8h-assembly1.cif.gz_A	444	TTFVALYDYESRTETDLSFKKGERLQIVNNTEGDWWLAHSLSTGQTGYIPSNYVAPSDSIQAEEWYFGKITRRESERLLLNAENPRGTFLVRESETTKGAYCLSVSDFDNAKGLNVKHYKIRKLDSGGFYITSRTQFNSLQQLVAYYSKHADGLCHRLTTVCPTSKPQTQGLAKDAWEIPRESLRLEVKLGQGCFGEVWMGTWNGTTRVAIKTLKPGTMSPEAFLQEAQVMKKLRHEKLVQLYAVVSEEPIYIVTEYMSKGSLLDFLKGETGKYLRLPQLVDMAAQIASGMAYVERMNYVHRDLRAANILVGENLVCKVADFGLARLIEDNEYTARQGAKFPIKWTAPEAALYGRFTIKSDVWSFGILLTELTTKGRVPYPGMVNREVLDQVERGYRMPCPPECPESLHDLMCQCWRKEPEERPTFEYLQAFLEDYFTSTEPQYQPGENL	3	446	FVALYDYESRTETDLSFKKGERLQIVNNTEGDWWLAHSLSTGQTGYIPSNYVAPSDSIQAEEWYFGKITRRESERLLLNAENPRGTFLVRESETTKGAYCLSVSDFDNAKGLNVKHYKIRKLDSGGFYITSRTQFNSLQQLVAYYSKHADGLCHRLTTVCPTSKPQTQGLAKDAWEIPRESLRLEVKLGQGCFGEVWMGTWNGTTRVAIKTLKPGTMSPEAFLQEAQVMKKLRHEKLVQLYAVVSEEPIYIVTEYMSKGSLLDFLKGETGKYLRLPQLVDMAAQIASGMAYVERMNYVHRDLRAANILVGENLVCKVADFGLARLIEDNEYTARQGAKFPIKWTAPEAALYGRFTIKSDVWSFGILLTELTTKGRVPYPGMVNREVLDQVERGYRMPCPPECPESLHDLMCQCWRKEPEERPTFEYLQAFLEDYFTSTEPQYQP	9.963E-01	TFVALYDYESRTETDLSFKKGERLQIVNNTEGDWWLAHSLSTGQTGYIPSNYVAPSDSIQAEEWYFGKITRRESERLLLNAENPRGTFLVRESETTKGAYCLSVSDFDNAKGLNVKHYKIRKLDSGGFYITSRTQFNSLQQLVAYYSKHADGLCHRLTTVCPTSKPQTQGLAKDAWEIPRESLRLEVKLGQGCFGEVWMGTWNGTTRVAIKTLKPGTMSPEAFLQEAQVMKKLRHEKLVQLYAVVSEEPIYIVTEYMSKGSLLDFLKGETGKYLRLPQLVDMAAQIASGMAYVERMNYVHRDLRAANILVGENLVCKVADFGLARLIEDNEYTARQGAKFPIKWTAPEAALYGRFTIKSDVWSFGILLTELTTKGRVPYPGMVNREVLDQVERGYRMPCPPECPESLHDLMCQCWRKEPEERPTFEYLQAFLEDYFTSTEPQYQP	2	445	FVALYDYESRTETDLSFKKGERLQIVNNTEGDWWLAHSLSTGQTGYIPSNYVAPSDSIQAEEWYFGKITRRESERLLLNAENPRGTFLVRESETTKGAYCLSVSDFDNAKGLNVKHYKIRKLDSGGFYITSRTQFNSLQQLVAYYSKHADGLCHRLTTVCPTSKPQTQGLAKDAWEIPRESLRLEVKLGQGCFGEVWMGTWNGTTRVAIKTLKPGTMSPEAFLQEAQVMKKLRHEKLVQLYAVVSEEPIYIVTEYMSKGSLLDFLKGETGKYLRLPQLVDMAAQIASGMAYVERMNYVHRDLRAANILVGENLVCKVADFGLARLIEDNEYTARQGAKFPIKWTAPEAALYGRFTIKSDVWSFGILLTELTTKGRVPYPGMVNREVLDQVERGYRMPCPPECPESLHDLMCQCWRKEPEERPTFEYLQAFLEDYFTSTEPQYQP
```

SINGLE-SHORT

```
2src	2h8h-assembly1.cif.gz_A	444	TTFVALYDY...TEPQYQPGENL	3	446	FVALY...QYQP	9.963E-01	TFVAL...PQYQP	2	445	FVA...YQP
```

TOP-15-FULL

[result.tsv](result.tsv)