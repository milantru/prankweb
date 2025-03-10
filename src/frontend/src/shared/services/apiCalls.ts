import axios from "axios";
import { FormState } from "../../pages/home/components/QueryProteinForm";
import { apiBaseUrl } from "../constants";
import { getErrorMessages } from "../helperFunctions/errorHandling";
import { Result } from "../../pages/analytical-page/AnalyticalPage";
import camelcaseKeys from "camelcase-keys";


const statusTmp = `
{
	"status": 1,
	"errorMessages": [],
	"lastUpdated": null
}`;
const resultTmp =  `
[
    {
        "id": 1,
        "query_sequence": "TTFVALYDYESRTETDLSFKKGERLQIVNNTEGDWWLAHSLSTGQTGYIPSNYVAPSDSIQAEEWYFGKITRRESERLLLNAENPRGTFLVRESETTKGAYCLSVSDFDNAKGLNVKHYKIRKLDSGGFYITSRTQFNSLQQLVAYYSKHADGLCHRLTTVCPTSKPQTQGLAKDAWEIPRESLRLEVKLGQGCFGEVWMGTWNGTTRVAIKTLKPGTMSPEAFLQEAQVMKKLRHEKLVQLYAVVSEEPIYIVTEYMSKGSLLDFLKGETGKYLRLPQLVDMAAQIASGMAYVERMNYVHRDLRAANILVGENLVCKVADFGLARLIEDNEYTARQGAKFPIKWTAPEAALYGRFTIKSDVWSFGILLTELTTKGRVPYPGMVNREVLDQVERGYRMPCPPECPESLHDLMCQCWRKEPEERPTFEYLQAFLEDYFTSTEPQYQPGENL",
        "binding_sites": [
            {
                "id": "H_PTR",
                "confidence": 1.0,
                "residues": [
                    {
                        "residue": "ARG",
                        "seq_index": 72
                    },
                    {
                        "residue": "ARG",
                        "seq_index": 92
                    },
                    {
                        "residue": "GLU",
                        "seq_index": 93
                    },
                    {
                        "residue": "SER",
                        "seq_index": 94
                    },
                    {
                        "residue": "GLU",
                        "seq_index": 95
                    },
                    {
                        "residue": "THR",
                        "seq_index": 96
                    },
                    {
                        "residue": "CYS",
                        "seq_index": 102
                    },
                    {
                        "residue": "HIS",
                        "seq_index": 118
                    },
                    {
                        "residue": "TYR",
                        "seq_index": 119
                    },
                    {
                        "residue": "LYS",
                        "seq_index": 120
                    },
                    {
                        "residue": "GLU",
                        "seq_index": 441
                    },
                    {
                        "residue": "PRO",
                        "seq_index": 442
                    },
                    {
                        "residue": "GLN",
                        "seq_index": 443
                    },
                    {
                        "residue": "GLN",
                        "seq_index": 444
                    },
                    {
                        "residue": "PRO",
                        "seq_index": 445
                    }
                ]
            },
            {
                "id": "H_ANP",
                "confidence": 1.0,
                "residues": [
                    {
                        "residue": "LEU",
                        "seq_index": 190
                    },
                    {
                        "residue": "GLY",
                        "seq_index": 191
                    },
                    {
                        "residue": "GLN",
                        "seq_index": 192
                    },
                    {
                        "residue": "GLY",
                        "seq_index": 193
                    },
                    {
                        "residue": "CYS",
                        "seq_index": 194
                    },
                    {
                        "residue": "PHE",
                        "seq_index": 195
                    },
                    {
                        "residue": "GLY",
                        "seq_index": 196
                    },
                    {
                        "residue": "VAL",
                        "seq_index": 198
                    },
                    {
                        "residue": "ALA",
                        "seq_index": 210
                    },
                    {
                        "residue": "LYS",
                        "seq_index": 212
                    },
                    {
                        "residue": "VAL",
                        "seq_index": 240
                    },
                    {
                        "residue": "THR",
                        "seq_index": 255
                    },
                    {
                        "residue": "GLU",
                        "seq_index": 256
                    },
                    {
                        "residue": "TYR",
                        "seq_index": 257
                    },
                    {
                        "residue": "MET",
                        "seq_index": 258
                    },
                    {
                        "residue": "SER",
                        "seq_index": 259
                    },
                    {
                        "residue": "GLY",
                        "seq_index": 261
                    },
                    {
                        "residue": "SER",
                        "seq_index": 262
                    },
                    {
                        "residue": "ASP",
                        "seq_index": 265
                    },
                    {
                        "residue": "ASP",
                        "seq_index": 303
                    },
                    {
                        "residue": "ARG",
                        "seq_index": 305
                    },
                    {
                        "residue": "ALA",
                        "seq_index": 307
                    },
                    {
                        "residue": "ASN",
                        "seq_index": 308
                    },
                    {
                        "residue": "LEU",
                        "seq_index": 310
                    },
                    {
                        "residue": "ASP",
                        "seq_index": 321
                    }
                ]
            }
        ],
        "similar_sequence_alignment_data": {
            "pdb_id": "4k11",
            "query_seq_aligned_part_start_idx": 0,
            "query_seq_aligned_part_end_idx": 447,
            "query_seq_aligned_part": "TTFVALYDYESRTETDLSFKKGERLQIVNNTEGDWWLAHSLSTGQTGYIPSNYVAPSDSIQAEEWYFGKITRRESERLLLNAENPRGTFLVRESETTKGAYCLSVSDFDNAKGLNVKHYKIRKLDSGGFYITSRTQFNSLQQLVAYYSKHADGLCHRLTTVCPTSKPQTQGLAKDAWEIPRESLRLEVKLGQGCFGEVWMGTWNGTTRVAIKTLKPGTMSPEAFLQEAQVMKKLRHEKLVQLYAVVSEEPIYIVTEYMSKGSLLDFLKGETGKYLRLPQLVDMAAQIASGMAYVERMNYVHRDLRAANILVGENLVCKVADFGLARLIEDNEYTARQGAKFPIKWTAPEAALYGRFTIKSDVWSFGILLTELTTKGRVPYPGMVNREVLDQVERGYRMPCPPECPESLHDLMCQCWRKEPEERPTFEYLQAFLEDYFTSTEPQYQPGE",
            "similar_sequence": "TTFVALYDYESRTETDLSFKKGERLQIVNNTEGDWWLAHSLSTGQTGYIPSNYVAPSDSIQAEEWYFGKITRRESERLLLNAENPRGTFLVRESETTKGAYCLSVSDFDNAKGLNVKHYKIRKLDSGGFYITSRTQFNSLQQLVAYYSKHADGLCHRLTTVCPTSKPQTQGLAKDAWEIPRESLRLEVKLGQGCFGEVWMGTWNGTTRVAIKTLKPGTMSPEAFLQEAQVMKKLRHEKLVQLYAVVSEEPIYIVGEYMSKGSLLDFLKGETGKYLRLPQLVDMAAQIASGMAYVERMNYVHRDLRAANILVGENLVCKVADFGLARLIEDNEYTARQGAKFPIKWTAPEAALYGRFTIKSDVWSFGILLTELTTKGRVPYPGMVNREVLDQVERGYRMPCPPECPESLHDLMCQCWRKEPEERPTFEYLQAFLEDYFTSTEPQYQPGE",
            "similar_seq_aligned_part_start_idx": 0,
            "similar_seq_aligned_part_end_idx": 447,
            "similar_seq_aligned_part": "TTFVALYDYESRTETDLSFKKGERLQIVNNTEGDWWLAHSLSTGQTGYIPSNYVAPSDSIQAEEWYFGKITRRESERLLLNAENPRGTFLVRESETTKGAYCLSVSDFDNAKGLNVKHYKIRKLDSGGFYITSRTQFNSLQQLVAYYSKHADGLCHRLTTVCPTSKPQTQGLAKDAWEIPRESLRLEVKLGQGCFGEVWMGTWNGTTRVAIKTLKPGTMSPEAFLQEAQVMKKLRHEKLVQLYAVVSEEPIYIVGEYMSKGSLLDFLKGETGKYLRLPQLVDMAAQIASGMAYVERMNYVHRDLRAANILVGENLVCKVADFGLARLIEDNEYTARQGAKFPIKWTAPEAALYGRFTIKSDVWSFGILLTELTTKGRVPYPGMVNREVLDQVERGYRMPCPPECPESLHDLMCQCWRKEPEERPTFEYLQAFLEDYFTSTEPQYQPGE"
        }
    },
    {
        "id": 1,
        "query_sequence": "TTFVALYDYESRTETDLSFKKGERLQIVNNTEGDWWLAHSLSTGQTGYIPSNYVAPSDSIQAEEWYFGKITRRESERLLLNAENPRGTFLVRESETTKGAYCLSVSDFDNAKGLNVKHYKIRKLDSGGFYITSRTQFNSLQQLVAYYSKHADGLCHRLTTVCPTSKPQTQGLAKDAWEIPRESLRLEVKLGQGCFGEVWMGTWNGTTRVAIKTLKPGTMSPEAFLQEAQVMKKLRHEKLVQLYAVVSEEPIYIVTEYMSKGSLLDFLKGETGKYLRLPQLVDMAAQIASGMAYVERMNYVHRDLRAANILVGENLVCKVADFGLARLIEDNEYTARQGAKFPIKWTAPEAALYGRFTIKSDVWSFGILLTELTTKGRVPYPGMVNREVLDQVERGYRMPCPPECPESLHDLMCQCWRKEPEERPTFEYLQAFLEDYFTSTEPQYQPGENL",
        "binding_sites": [
            {
                "id": "H_PTR",
                "confidence": 1.0,
                "residues": [
                    {
                        "residue": "ARG",
                        "seq_index": 72
                    },
                    {
                        "residue": "ARG",
                        "seq_index": 92
                    },
                    {
                        "residue": "GLU",
                        "seq_index": 93
                    },
                    {
                        "residue": "SER",
                        "seq_index": 94
                    },
                    {
                        "residue": "GLU",
                        "seq_index": 95
                    },
                    {
                        "residue": "THR",
                        "seq_index": 96
                    },
                    {
                        "residue": "CYS",
                        "seq_index": 102
                    },
                    {
                        "residue": "HIS",
                        "seq_index": 118
                    },
                    {
                        "residue": "TYR",
                        "seq_index": 119
                    },
                    {
                        "residue": "LYS",
                        "seq_index": 120
                    },
                    {
                        "residue": "GLU",
                        "seq_index": 441
                    },
                    {
                        "residue": "PRO",
                        "seq_index": 442
                    },
                    {
                        "residue": "GLN",
                        "seq_index": 443
                    },
                    {
                        "residue": "GLN",
                        "seq_index": 444
                    },
                    {
                        "residue": "PRO",
                        "seq_index": 445
                    }
                ]
            },
            {
                "id": "H_ANP",
                "confidence": 1.0,
                "residues": [
                    {
                        "residue": "LEU",
                        "seq_index": 190
                    },
                    {
                        "residue": "GLY",
                        "seq_index": 191
                    },
                    {
                        "residue": "GLN",
                        "seq_index": 192
                    },
                    {
                        "residue": "GLY",
                        "seq_index": 193
                    },
                    {
                        "residue": "CYS",
                        "seq_index": 194
                    },
                    {
                        "residue": "PHE",
                        "seq_index": 195
                    },
                    {
                        "residue": "GLY",
                        "seq_index": 196
                    },
                    {
                        "residue": "VAL",
                        "seq_index": 198
                    },
                    {
                        "residue": "ALA",
                        "seq_index": 210
                    },
                    {
                        "residue": "LYS",
                        "seq_index": 212
                    },
                    {
                        "residue": "VAL",
                        "seq_index": 240
                    },
                    {
                        "residue": "THR",
                        "seq_index": 255
                    },
                    {
                        "residue": "GLU",
                        "seq_index": 256
                    },
                    {
                        "residue": "TYR",
                        "seq_index": 257
                    },
                    {
                        "residue": "MET",
                        "seq_index": 258
                    },
                    {
                        "residue": "SER",
                        "seq_index": 259
                    },
                    {
                        "residue": "GLY",
                        "seq_index": 261
                    },
                    {
                        "residue": "SER",
                        "seq_index": 262
                    },
                    {
                        "residue": "ASP",
                        "seq_index": 265
                    },
                    {
                        "residue": "ASP",
                        "seq_index": 303
                    },
                    {
                        "residue": "ARG",
                        "seq_index": 305
                    },
                    {
                        "residue": "ALA",
                        "seq_index": 307
                    },
                    {
                        "residue": "ASN",
                        "seq_index": 308
                    },
                    {
                        "residue": "LEU",
                        "seq_index": 310
                    },
                    {
                        "residue": "ASP",
                        "seq_index": 321
                    }
                ]
            }
        ],
        "similar_sequence_alignment_data": {
            "pdb_id": "2h8h",
            "query_seq_aligned_part_start_idx": 2,
            "query_seq_aligned_part_end_idx": 445,
            "query_seq_aligned_part": "FVALYDYESRTETDLSFKKGERLQIVNNTEGDWWLAHSLSTGQTGYIPSNYVAPSDSIQAEEWYFGKITRRESERLLLNAENPRGTFLVRESETTKGAYCLSVSDFDNAKGLNVKHYKIRKLDSGGFYITSRTQFNSLQQLVAYYSKHADGLCHRLTTVCPTSKPQTQGLAKDAWEIPRESLRLEVKLGQGCFGEVWMGTWNGTTRVAIKTLKPGTMSPEAFLQEAQVMKKLRHEKLVQLYAVVSEEPIYIVTEYMSKGSLLDFLKGETGKYLRLPQLVDMAAQIASGMAYVERMNYVHRDLRAANILVGENLVCKVADFGLARLIEDNEYTARQGAKFPIKWTAPEAALYGRFTIKSDVWSFGILLTELTTKGRVPYPGMVNREVLDQVERGYRMPCPPECPESLHDLMCQCWRKEPEERPTFEYLQAFLEDYFTSTEPQYQP",
            "similar_sequence": "TFVALYDYESRTETDLSFKKGERLQIVNNTEGDWWLAHSLSTGQTGYIPSNYVAPSDSIQAEEWYFGKITRRESERLLLNAENPRGTFLVRESETTKGAYCLSVSDFDNAKGLNVKHYKIRKLDSGGFYITSRTQFNSLQQLVAYYSKHADGLCHRLTTVCPTSKPQTQGLAKDAWEIPRESLRLEVKLGQGCFGEVWMGTWNGTTRVAIKTLKPGTMSPEAFLQEAQVMKKLRHEKLVQLYAVVSEEPIYIVTEYMSKGSLLDFLKGETGKYLRLPQLVDMAAQIASGMAYVERMNYVHRDLRAANILVGENLVCKVADFGLARLIEDNEYTARQGAKFPIKWTAPEAALYGRFTIKSDVWSFGILLTELTTKGRVPYPGMVNREVLDQVERGYRMPCPPECPESLHDLMCQCWRKEPEERPTFEYLQAFLEDYFTSTEPQYQP",
            "similar_seq_aligned_part_start_idx": 1,
            "similar_seq_aligned_part_end_idx": 444,
            "similar_seq_aligned_part": "FVALYDYESRTETDLSFKKGERLQIVNNTEGDWWLAHSLSTGQTGYIPSNYVAPSDSIQAEEWYFGKITRRESERLLLNAENPRGTFLVRESETTKGAYCLSVSDFDNAKGLNVKHYKIRKLDSGGFYITSRTQFNSLQQLVAYYSKHADGLCHRLTTVCPTSKPQTQGLAKDAWEIPRESLRLEVKLGQGCFGEVWMGTWNGTTRVAIKTLKPGTMSPEAFLQEAQVMKKLRHEKLVQLYAVVSEEPIYIVTEYMSKGSLLDFLKGETGKYLRLPQLVDMAAQIASGMAYVERMNYVHRDLRAANILVGENLVCKVADFGLARLIEDNEYTARQGAKFPIKWTAPEAALYGRFTIKSDVWSFGILLTELTTKGRVPYPGMVNREVLDQVERGYRMPCPPECPESLHDLMCQCWRKEPEERPTFEYLQAFLEDYFTSTEPQYQP"
        }
    },
    {
        "id": 1,
        "query_sequence": "TTFVALYDYESRTETDLSFKKGERLQIVNNTEGDWWLAHSLSTGQTGYIPSNYVAPSDSIQAEEWYFGKITRRESERLLLNAENPRGTFLVRESETTKGAYCLSVSDFDNAKGLNVKHYKIRKLDSGGFYITSRTQFNSLQQLVAYYSKHADGLCHRLTTVCPTSKPQTQGLAKDAWEIPRESLRLEVKLGQGCFGEVWMGTWNGTTRVAIKTLKPGTMSPEAFLQEAQVMKKLRHEKLVQLYAVVSEEPIYIVTEYMSKGSLLDFLKGETGKYLRLPQLVDMAAQIASGMAYVERMNYVHRDLRAANILVGENLVCKVADFGLARLIEDNEYTARQGAKFPIKWTAPEAALYGRFTIKSDVWSFGILLTELTTKGRVPYPGMVNREVLDQVERGYRMPCPPECPESLHDLMCQCWRKEPEERPTFEYLQAFLEDYFTSTEPQYQPGENL",
        "binding_sites": [
            {
                "id": "H_PTR",
                "confidence": 1.0,
                "residues": [
                    {
                        "residue": "ARG",
                        "seq_index": 72
                    },
                    {
                        "residue": "ARG",
                        "seq_index": 92
                    },
                    {
                        "residue": "GLU",
                        "seq_index": 93
                    },
                    {
                        "residue": "SER",
                        "seq_index": 94
                    },
                    {
                        "residue": "GLU",
                        "seq_index": 95
                    },
                    {
                        "residue": "THR",
                        "seq_index": 96
                    },
                    {
                        "residue": "CYS",
                        "seq_index": 102
                    },
                    {
                        "residue": "HIS",
                        "seq_index": 118
                    },
                    {
                        "residue": "TYR",
                        "seq_index": 119
                    },
                    {
                        "residue": "LYS",
                        "seq_index": 120
                    },
                    {
                        "residue": "GLU",
                        "seq_index": 441
                    },
                    {
                        "residue": "PRO",
                        "seq_index": 442
                    },
                    {
                        "residue": "GLN",
                        "seq_index": 443
                    },
                    {
                        "residue": "GLN",
                        "seq_index": 444
                    },
                    {
                        "residue": "PRO",
                        "seq_index": 445
                    }
                ]
            },
            {
                "id": "H_ANP",
                "confidence": 1.0,
                "residues": [
                    {
                        "residue": "LEU",
                        "seq_index": 190
                    },
                    {
                        "residue": "GLY",
                        "seq_index": 191
                    },
                    {
                        "residue": "GLN",
                        "seq_index": 192
                    },
                    {
                        "residue": "GLY",
                        "seq_index": 193
                    },
                    {
                        "residue": "CYS",
                        "seq_index": 194
                    },
                    {
                        "residue": "PHE",
                        "seq_index": 195
                    },
                    {
                        "residue": "GLY",
                        "seq_index": 196
                    },
                    {
                        "residue": "VAL",
                        "seq_index": 198
                    },
                    {
                        "residue": "ALA",
                        "seq_index": 210
                    },
                    {
                        "residue": "LYS",
                        "seq_index": 212
                    },
                    {
                        "residue": "VAL",
                        "seq_index": 240
                    },
                    {
                        "residue": "THR",
                        "seq_index": 255
                    },
                    {
                        "residue": "GLU",
                        "seq_index": 256
                    },
                    {
                        "residue": "TYR",
                        "seq_index": 257
                    },
                    {
                        "residue": "MET",
                        "seq_index": 258
                    },
                    {
                        "residue": "SER",
                        "seq_index": 259
                    },
                    {
                        "residue": "GLY",
                        "seq_index": 261
                    },
                    {
                        "residue": "SER",
                        "seq_index": 262
                    },
                    {
                        "residue": "ASP",
                        "seq_index": 265
                    },
                    {
                        "residue": "ASP",
                        "seq_index": 303
                    },
                    {
                        "residue": "ARG",
                        "seq_index": 305
                    },
                    {
                        "residue": "ALA",
                        "seq_index": 307
                    },
                    {
                        "residue": "ASN",
                        "seq_index": 308
                    },
                    {
                        "residue": "LEU",
                        "seq_index": 310
                    },
                    {
                        "residue": "ASP",
                        "seq_index": 321
                    }
                ]
            }
        ],
        "similar_sequence_alignment_data": {
            "pdb_id": "6f3f",
            "query_seq_aligned_part_start_idx": 0,
            "query_seq_aligned_part_end_idx": 445,
            "query_seq_aligned_part": "TTFVALYDYESRTETDLSFKKGERLQIVNNTEGDWWLAHSLSTGQTGYIPSNYVAPSDSIQAEEWYFGKITRRESERLLLNAENPRGTFLVRESETTKGAYCLSVSDFDNAKGLNVKHYKIRKLDSGGFYITSRTQFNSLQQLVAYYSKHADGLCHRLTTVCPTSKPQTQGLAKDAWEIPRESLRLEVKLGQGCFGEVWMGTWNGTTRVAIKTLKPGTMSPEAFLQEAQVMKKLRHEKLVQLYAVVSEEPIYIVTEYMSKGSLLDFLKGETGKYLRLPQLVDMAAQIASGMAYVERMNYVHRDLRAANILVGENLVCKVADFGLARLIEDNEYTARQGAKFPIKWTAPEAALYGRFTIKSDVWSFGILLTELTTKGRVPYPGMVNREVLDQVERGYRMPCPPECPESLHDLMCQCWRKEPEERPTFEYLQAFLEDYFTSTEPQYQP",
            "similar_sequence": "RMVTTFVALYDYESRTETDLSFKKGERLQIVNNTEGDWWLAHSLSTGQTGYIPSNYVAPSDSIQAEEWYFGKITRRESERLLLNAENPRGTFLVRESETTKGAYCLSVSDFDNAKGLNVKHYKIRKLDSGGFYITSRTQFNSLQQLVAYYSKHADGLCHRLTTVCPTSKPQTQGLAKDAWEIPRESLRLEVKLGQGCFGEVWMGTWNGTTRVAIKTLKPGTMSPEAFLQEAQVMKKLRHEKLVQLYAVVSEEPIYIVTEYMNKGSLLDFLKGETGKYLRLPQLVDMSAQIASGMAYVERMNYVHRDLRAANILVGENLVCKVADFGLARLIEDNEYTARQGAKFPIKWTAPEAALYGRFTIKSDVWSFGILLTELTTKGRVPYPGMVNREVLDQVERGYRMPCPPECPESLHDLMCQCWRKEPEERPTFEYLQAFLEDYFTSTEPQYQP",
            "similar_seq_aligned_part_start_idx": 3,
            "similar_seq_aligned_part_end_idx": 448,
            "similar_seq_aligned_part": "TTFVALYDYESRTETDLSFKKGERLQIVNNTEGDWWLAHSLSTGQTGYIPSNYVAPSDSIQAEEWYFGKITRRESERLLLNAENPRGTFLVRESETTKGAYCLSVSDFDNAKGLNVKHYKIRKLDSGGFYITSRTQFNSLQQLVAYYSKHADGLCHRLTTVCPTSKPQTQGLAKDAWEIPRESLRLEVKLGQGCFGEVWMGTWNGTTRVAIKTLKPGTMSPEAFLQEAQVMKKLRHEKLVQLYAVVSEEPIYIVTEYMNKGSLLDFLKGETGKYLRLPQLVDMSAQIASGMAYVERMNYVHRDLRAANILVGENLVCKVADFGLARLIEDNEYTARQGAKFPIKWTAPEAALYGRFTIKSDVWSFGILLTELTTKGRVPYPGMVNREVLDQVERGYRMPCPPECPESLHDLMCQCWRKEPEERPTFEYLQAFLEDYFTSTEPQYQP"
        }
    },
    {
        "id": 1,
        "query_sequence": "TTFVALYDYESRTETDLSFKKGERLQIVNNTEGDWWLAHSLSTGQTGYIPSNYVAPSDSIQAEEWYFGKITRRESERLLLNAENPRGTFLVRESETTKGAYCLSVSDFDNAKGLNVKHYKIRKLDSGGFYITSRTQFNSLQQLVAYYSKHADGLCHRLTTVCPTSKPQTQGLAKDAWEIPRESLRLEVKLGQGCFGEVWMGTWNGTTRVAIKTLKPGTMSPEAFLQEAQVMKKLRHEKLVQLYAVVSEEPIYIVTEYMSKGSLLDFLKGETGKYLRLPQLVDMAAQIASGMAYVERMNYVHRDLRAANILVGENLVCKVADFGLARLIEDNEYTARQGAKFPIKWTAPEAALYGRFTIKSDVWSFGILLTELTTKGRVPYPGMVNREVLDQVERGYRMPCPPECPESLHDLMCQCWRKEPEERPTFEYLQAFLEDYFTSTEPQYQPGENL",
        "binding_sites": [
            {
                "id": "H_PTR",
                "confidence": 1.0,
                "residues": [
                    {
                        "residue": "ARG",
                        "seq_index": 72
                    },
                    {
                        "residue": "ARG",
                        "seq_index": 92
                    },
                    {
                        "residue": "GLU",
                        "seq_index": 93
                    },
                    {
                        "residue": "SER",
                        "seq_index": 94
                    },
                    {
                        "residue": "GLU",
                        "seq_index": 95
                    },
                    {
                        "residue": "THR",
                        "seq_index": 96
                    },
                    {
                        "residue": "CYS",
                        "seq_index": 102
                    },
                    {
                        "residue": "HIS",
                        "seq_index": 118
                    },
                    {
                        "residue": "TYR",
                        "seq_index": 119
                    },
                    {
                        "residue": "LYS",
                        "seq_index": 120
                    },
                    {
                        "residue": "GLU",
                        "seq_index": 441
                    },
                    {
                        "residue": "PRO",
                        "seq_index": 442
                    },
                    {
                        "residue": "GLN",
                        "seq_index": 443
                    },
                    {
                        "residue": "GLN",
                        "seq_index": 444
                    },
                    {
                        "residue": "PRO",
                        "seq_index": 445
                    }
                ]
            },
            {
                "id": "H_ANP",
                "confidence": 1.0,
                "residues": [
                    {
                        "residue": "LEU",
                        "seq_index": 190
                    },
                    {
                        "residue": "GLY",
                        "seq_index": 191
                    },
                    {
                        "residue": "GLN",
                        "seq_index": 192
                    },
                    {
                        "residue": "GLY",
                        "seq_index": 193
                    },
                    {
                        "residue": "CYS",
                        "seq_index": 194
                    },
                    {
                        "residue": "PHE",
                        "seq_index": 195
                    },
                    {
                        "residue": "GLY",
                        "seq_index": 196
                    },
                    {
                        "residue": "VAL",
                        "seq_index": 198
                    },
                    {
                        "residue": "ALA",
                        "seq_index": 210
                    },
                    {
                        "residue": "LYS",
                        "seq_index": 212
                    },
                    {
                        "residue": "VAL",
                        "seq_index": 240
                    },
                    {
                        "residue": "THR",
                        "seq_index": 255
                    },
                    {
                        "residue": "GLU",
                        "seq_index": 256
                    },
                    {
                        "residue": "TYR",
                        "seq_index": 257
                    },
                    {
                        "residue": "MET",
                        "seq_index": 258
                    },
                    {
                        "residue": "SER",
                        "seq_index": 259
                    },
                    {
                        "residue": "GLY",
                        "seq_index": 261
                    },
                    {
                        "residue": "SER",
                        "seq_index": 262
                    },
                    {
                        "residue": "ASP",
                        "seq_index": 265
                    },
                    {
                        "residue": "ASP",
                        "seq_index": 303
                    },
                    {
                        "residue": "ARG",
                        "seq_index": 305
                    },
                    {
                        "residue": "ALA",
                        "seq_index": 307
                    },
                    {
                        "residue": "ASN",
                        "seq_index": 308
                    },
                    {
                        "residue": "LEU",
                        "seq_index": 310
                    },
                    {
                        "residue": "ASP",
                        "seq_index": 321
                    }
                ]
            }
        ],
        "similar_sequence_alignment_data": {
            "pdb_id": "7uy0",
            "query_seq_aligned_part_start_idx": 0,
            "query_seq_aligned_part_end_idx": 446,
            "query_seq_aligned_part": "TTFVALYDYESRTETDLSFKKGERLQIVNNTEGDWWLAHSLSTGQTGYIPSNYVAPSDSIQAEEWYFGKITRRESERLLLNAENPRGTFLVRESETTKGAYCLSVSDFDNAKGLNVKHYKIRKLDSGGFYITSRTQFNSLQQLVAYYSKHADGLCHRLTTVCPTSKPQTQGLAKDAWEIPRESLRLEVKLGQGCFGEVWMGTWNGTTRVAIKTLKPGTMSPEAFLQEAQVMKKLRHEKLVQLYAVVSEEPIYIVTEYMSKGSLLDFLKGETGKYLRLPQLVDMAAQIASGMAYVERMNYVHRDLRAANILVGENLVCKVADFGLARLIEDNEYTARQGAKFPIKWTAPEAALYGRFTIKSDVWSFGILLTELTTKGRVPYPGMVNREVLDQVERGYRMPCPPECPESLHDLMCQCWRKEPEERPTFEYLQAFLEDYFTSTEPQYQPG",
            "similar_sequence": "TLFIALYDYEARTEDDLTFTKGEKFHILNNTEGDWWEARSLSSGKTGCIPSNYVAPVDSIQAEEWYFGKIGRKDAERQLLSPGNPQGAFLIRESETTKGAYSLSIRDWDQTRGDHVKHYKIRKLDMGGYYITTRVQFNSVQELVQHYMEVNDGLCNLLIAPCTIMKPQTLGLAKDAWEISRSSITLERRLGTGCFGDVWLGTWNGSTKVAVKTLKPGTMSPKAFLEEAQVMKLLRHDKLVQLYAVVSEEPIYIVTEFMCHGSLLDFLKNPEGQDLRLPQLVDMAAQVAEGMAYMERMNYIHRDLRAANILVGERLACKIADFGLARLIKDDEYNPCQGSKFPIKWTAPEAALFGRFTIKSDVWSFGILLTELITKGRIPYPGMNKREVLEQVEQGYHMPCPPGCPASLYEAMEQTWRLDPEERPTFEYLQSFLEDYFTSAEPQYEEIP",
            "similar_seq_aligned_part_start_idx": 0,
            "similar_seq_aligned_part_end_idx": 446,
            "similar_seq_aligned_part": "TLFIALYDYEARTEDDLTFTKGEKFHILNNTEGDWWEARSLSSGKTGCIPSNYVAPVDSIQAEEWYFGKIGRKDAERQLLSPGNPQGAFLIRESETTKGAYSLSIRDWDQTRGDHVKHYKIRKLDMGGYYITTRVQFNSVQELVQHYMEVNDGLCNLLIAPCTIMKPQTLGLAKDAWEISRSSITLERRLGTGCFGDVWLGTWNGSTKVAVKTLKPGTMSPKAFLEEAQVMKLLRHDKLVQLYAVVSEEPIYIVTEFMCHGSLLDFLKNPEGQDLRLPQLVDMAAQVAEGMAYMERMNYIHRDLRAANILVGERLACKIADFGLARLIKDDEYNPCQGSKFPIKWTAPEAALFGRFTIKSDVWSFGILLTELITKGRIPYPGMNKREVLEQVEQGYHMPCPPGCPASLYEAMEQTWRLDPEERPTFEYLQSFLEDYFTSAEPQYEEI"
        }
    },
    {
        "id": 1,
        "query_sequence": "TTFVALYDYESRTETDLSFKKGERLQIVNNTEGDWWLAHSLSTGQTGYIPSNYVAPSDSIQAEEWYFGKITRRESERLLLNAENPRGTFLVRESETTKGAYCLSVSDFDNAKGLNVKHYKIRKLDSGGFYITSRTQFNSLQQLVAYYSKHADGLCHRLTTVCPTSKPQTQGLAKDAWEIPRESLRLEVKLGQGCFGEVWMGTWNGTTRVAIKTLKPGTMSPEAFLQEAQVMKKLRHEKLVQLYAVVSEEPIYIVTEYMSKGSLLDFLKGETGKYLRLPQLVDMAAQIASGMAYVERMNYVHRDLRAANILVGENLVCKVADFGLARLIEDNEYTARQGAKFPIKWTAPEAALYGRFTIKSDVWSFGILLTELTTKGRVPYPGMVNREVLDQVERGYRMPCPPECPESLHDLMCQCWRKEPEERPTFEYLQAFLEDYFTSTEPQYQPGENL",
        "binding_sites": [
            {
                "id": "H_PTR",
                "confidence": 1.0,
                "residues": [
                    {
                        "residue": "ARG",
                        "seq_index": 72
                    },
                    {
                        "residue": "ARG",
                        "seq_index": 92
                    },
                    {
                        "residue": "GLU",
                        "seq_index": 93
                    },
                    {
                        "residue": "SER",
                        "seq_index": 94
                    },
                    {
                        "residue": "GLU",
                        "seq_index": 95
                    },
                    {
                        "residue": "THR",
                        "seq_index": 96
                    },
                    {
                        "residue": "CYS",
                        "seq_index": 102
                    },
                    {
                        "residue": "HIS",
                        "seq_index": 118
                    },
                    {
                        "residue": "TYR",
                        "seq_index": 119
                    },
                    {
                        "residue": "LYS",
                        "seq_index": 120
                    },
                    {
                        "residue": "GLU",
                        "seq_index": 441
                    },
                    {
                        "residue": "PRO",
                        "seq_index": 442
                    },
                    {
                        "residue": "GLN",
                        "seq_index": 443
                    },
                    {
                        "residue": "GLN",
                        "seq_index": 444
                    },
                    {
                        "residue": "PRO",
                        "seq_index": 445
                    }
                ]
            },
            {
                "id": "H_ANP",
                "confidence": 1.0,
                "residues": [
                    {
                        "residue": "LEU",
                        "seq_index": 190
                    },
                    {
                        "residue": "GLY",
                        "seq_index": 191
                    },
                    {
                        "residue": "GLN",
                        "seq_index": 192
                    },
                    {
                        "residue": "GLY",
                        "seq_index": 193
                    },
                    {
                        "residue": "CYS",
                        "seq_index": 194
                    },
                    {
                        "residue": "PHE",
                        "seq_index": 195
                    },
                    {
                        "residue": "GLY",
                        "seq_index": 196
                    },
                    {
                        "residue": "VAL",
                        "seq_index": 198
                    },
                    {
                        "residue": "ALA",
                        "seq_index": 210
                    },
                    {
                        "residue": "LYS",
                        "seq_index": 212
                    },
                    {
                        "residue": "VAL",
                        "seq_index": 240
                    },
                    {
                        "residue": "THR",
                        "seq_index": 255
                    },
                    {
                        "residue": "GLU",
                        "seq_index": 256
                    },
                    {
                        "residue": "TYR",
                        "seq_index": 257
                    },
                    {
                        "residue": "MET",
                        "seq_index": 258
                    },
                    {
                        "residue": "SER",
                        "seq_index": 259
                    },
                    {
                        "residue": "GLY",
                        "seq_index": 261
                    },
                    {
                        "residue": "SER",
                        "seq_index": 262
                    },
                    {
                        "residue": "ASP",
                        "seq_index": 265
                    },
                    {
                        "residue": "ASP",
                        "seq_index": 303
                    },
                    {
                        "residue": "ARG",
                        "seq_index": 305
                    },
                    {
                        "residue": "ALA",
                        "seq_index": 307
                    },
                    {
                        "residue": "ASN",
                        "seq_index": 308
                    },
                    {
                        "residue": "LEU",
                        "seq_index": 310
                    },
                    {
                        "residue": "ASP",
                        "seq_index": 321
                    }
                ]
            }
        ],
        "similar_sequence_alignment_data": {
            "pdb_id": "5h09",
            "query_seq_aligned_part_start_idx": 1,
            "query_seq_aligned_part_end_idx": 446,
            "query_seq_aligned_part": "TFVALYDYESRTETDLSFKKGERLQIVNNTEGDWWLAHSLSTGQTGYIPSNYVAPSDSIQAEEWYFGKITRRESERLLLNAENPRGTFLVRESETTKGAYCLSVSDFDNAKGLNVKHYKIRKLDSGGFYITSRTQFNSLQQLVAYYSKHADGLCHRLTTVCPTSKPQTQGLAKDAWEIPRESLRLEVKLGQGCFGEVWMGTWNGTTRVAIKTLKPGTMSPEAFLQEAQVMKKLRHEKLVQLYAVVSEEPIYIVTEYMSKGSLLDFLKGETGKYLRLPQLVDMAAQIASGMAYVERMNYVHRDLRAANILVGENLVCKVADFGLARLIEDNEYTARQGAKFPIKWTAPEAALYGRFTIKSDVWSFGILLTELTTKGRVPYPGMVNREVLDQVERGYRMPCPPECPESLHDLMCQCWRKEPEERPTFEYLQAFLEDYFTSTEPQYQPG",
            "similar_sequence": "RIIVVALYDYEAIHHEDLSFQKGDQMVVLEESGEWWKARSLATRKEGYIPSNYVARVDSLETEEWFFKGISRKDAERQLLAPGNMLGSFMIRDSETTKGSYSLSVRDYDPRQGDTVKHYKIRTLDNGGFYISPRSTFSTLQELVDHYKKGNDGLCQKLSVPCMSSKPQKPWEKDAWEIPRESLKLEKKLGAGQFGEVWMATYNKHTKVAVKTMKPGSMSVEAFLAEANVMKTLQHDKLVKLHAVVTKEPIYIITEFMAKGSLLDFLKSDEGSKQPLPKLIDFSAQIAEGMAFIEQRNYIHRDLRAANILVSASLVCKIADFGLARVIEDNEYTAREGAKFPIKWTAPEAINFGSFTIKSDVWSFGILLMEIVTYGRIPYPGMSNPEVIRALERGYRMPRPENCPEELYNIMMRCWKNRPEERPTFEYIQSVLDDFYTATESQYEEIP",
            "similar_seq_aligned_part_start_idx": 2,
            "similar_seq_aligned_part_end_idx": 445,
            "similar_seq_aligned_part": "IVVALYDYEAIHHEDLSFQKGDQMVVLEE-SGEWWKARSLATRKEGYIPSNYVARVDSLETEEWFFKGISRKDAERQLLAPGNMLGSFMIRDSETTKGSYSLSVRDYDPRQGDTVKHYKIRTLDNGGFYISPRSTFSTLQELVDHYKKGNDGLCQKLSVPCMSSKPQKPW-EKDAWEIPRESLKLEKKLGAGQFGEVWMATYNKHTKVAVKTMKPGSMSVEAFLAEANVMKTLQHDKLVKLHAVVTKEPIYIITEFMAKGSLLDFLKSDEGSKQPLPKLIDFSAQIAEGMAFIEQRNYIHRDLRAANILVSASLVCKIADFGLARVIEDNEYTAREGAKFPIKWTAPEAINFGSFTIKSDVWSFGILLMEIVTYGRIPYPGMSNPEVIRALERGYRMPRPENCPEELYNIMMRCWKNRPEERPTFEYIQSVLDDFYTATESQYEEI"
        }
    }
]
`;



/**
 * Uploads data to the server and returns a unique identifier for the input.
 *
 * Each unique input receives a corresponding unique ID. If the same input is uploaded multiple times, 
 * it will receive the same ID. However, in case of the "custom structure input method," each upload 
 * is treated as a new input, and a new ID is provided regardless of the input content.
 *
 * @param {FormState} formState - The state containing input data and the selected input method.
 * @returns {Promise<{ id: number, errorMessages: string[] }>} 
 *          - `id`: A unique identifier assigned to the input by the server.
 *          - `errorMessages`: An array of error messages if the upload fails; otherwise, an empty array.
 *
 * @throws This function does not throw errors directly; instead, errors are captured and returned in `errorMessages`.
 */
export async function uploadDataAPI(formState: FormState): Promise<{ id: number, errorMessages: string[] }> {
	const formData = new FormData();
	formData.append("input_type", formState.inputMethod.toString());
	formData.append("input_string", JSON.stringify(formState.inputBlockData));

	try {
		const response = await axios.post<number>(apiBaseUrl + "/upload-data", formData, {
			headers: {
				"Content-Type": "multipart/form-data"
			}
		});

		const id = response.data as number;
		return { id: id, errorMessages: [] };
	}
	catch (error) {
		return { id: 0, errorMessages: getErrorMessages(error) };
	}
}

export enum DataStatus {
	Processing,
	Completed,
	Failed
}

type DataStatusResponse = {
	status: number;
	errorMessages: string[];
	lastUpdated: Date;
};

export async function getDataSourceExecutorResultStatusAPI(dataSourceName: string, id: string)
	: Promise<{ status: DataStatus | null, errorMessages: string[] }> {
	try {
		// const response = await axios.get<string>(apiBaseUrl + `/${dataSourceName}/${id}/status.json}`, {
		// 	headers: {
		// 		"Content-Type": "application/json"
		// 	}
		// });
		// const rawObject = JSON.parse(response.data);
		const dataStatusResponse: DataStatusResponse = JSON.parse(statusTmp);

		if (dataStatusResponse.errorMessages.length > 0) {
			return { status: null, errorMessages: dataStatusResponse.errorMessages };
		}

		const status = dataStatusResponse.status as DataStatus;
		return { status: status, errorMessages: [] };
	}
	catch (error) {
		return { status: null, errorMessages: getErrorMessages(error) };
	}
}

export async function getDataSourceExecutorResultAPI(dataSourceName: string, id: string)
	: Promise<{ results: Result[], errorMessages: string[] }> {
	try {
		// const response = await axios.get<DataSourceExecutorResult>(apiBaseUrl + `/${dataSourceName}/${id}`, {
		// 	headers: {
		// 		"Content-Type": "application/json"
		// 	}
		// });

		// return { data: response.data, errorMessages: [] };
		const rawObject = JSON.parse(resultTmp);
		const results: Result[] = camelcaseKeys(rawObject, { deep: true });
		return { results, errorMessages: [] };
	}
	catch (error) {
		return { results: [], errorMessages: getErrorMessages(error) };
	}
}
