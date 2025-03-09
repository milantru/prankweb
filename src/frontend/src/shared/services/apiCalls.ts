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
        "id": "4k11",
        "binding_sites": [
            {
                "id": "H_PTR",
                "confidence": 1.0,
                "residues": [
                    {
                        "id": "ARG",
                        "index": 72
                    },
                    {
                        "id": "ARG",
                        "index": 92
                    },
                    {
                        "id": "GLU",
                        "index": 93
                    },
                    {
                        "id": "SER",
                        "index": 94
                    },
                    {
                        "id": "GLU",
                        "index": 95
                    },
                    {
                        "id": "THR",
                        "index": 96
                    },
                    {
                        "id": "THR",
                        "index": 97
                    },
                    {
                        "id": "CYS",
                        "index": 102
                    },
                    {
                        "id": "HIS",
                        "index": 118
                    },
                    {
                        "id": "TYR",
                        "index": 119
                    },
                    {
                        "id": "LYS",
                        "index": 120
                    },
                    {
                        "id": "PRO",
                        "index": 442
                    },
                    {
                        "id": "GLN",
                        "index": 443
                    },
                    {
                        "id": "GLN",
                        "index": 444
                    },
                    {
                        "id": "PRO",
                        "index": 445
                    }
                ]
            },
            {
                "id": "H_0J9",
                "confidence": 1.0,
                "residues": [
                    {
                        "id": "LEU",
                        "index": 190
                    },
                    {
                        "id": "GLY",
                        "index": 191
                    },
                    {
                        "id": "VAL",
                        "index": 198
                    },
                    {
                        "id": "ALA",
                        "index": 210
                    },
                    {
                        "id": "ILE",
                        "index": 211
                    },
                    {
                        "id": "LYS",
                        "index": 212
                    },
                    {
                        "id": "VAL",
                        "index": 240
                    },
                    {
                        "id": "ILE",
                        "index": 253
                    },
                    {
                        "id": "VAL",
                        "index": 254
                    },
                    {
                        "id": "GLY",
                        "index": 255
                    },
                    {
                        "id": "GLU",
                        "index": 256
                    },
                    {
                        "id": "TYR",
                        "index": 257
                    },
                    {
                        "id": "MET",
                        "index": 258
                    },
                    {
                        "id": "SER",
                        "index": 259
                    },
                    {
                        "id": "GLY",
                        "index": 261
                    },
                    {
                        "id": "SER",
                        "index": 262
                    },
                    {
                        "id": "LEU",
                        "index": 310
                    },
                    {
                        "id": "ALA",
                        "index": 320
                    },
                    {
                        "id": "ASP",
                        "index": 321
                    }
                ]
            }
        ],
        "alignment_data": {
            "query_sequence_id": "tmp1or06uio",
            "target_sequence_id": "4k11-assembly1.cif.gz_A",
            "alignment_length": 448,
            "query_sequence": "TTFVALYDYESRTETDLSFKKGERLQIVNNTEGDWWLAHSLSTGQTGYIPSNYVAPSDSIQAEEWYFGKITRRESERLLLNAENPRGTFLVRESETTKGAYCLSVSDFDNAKGLNVKHYKIRKLDSGGFYITSRTQFNSLQQLVAYYSKHADGLCHRLTTVCPTSKPQTQGLAKDAWEIPRESLRLEVKLGQGCFGEVWMGTWNGTTRVAIKTLKPGTMSPEAFLQEAQVMKKLRHEKLVQLYAVVSEEPIYIVGEYMSKGSLLDFLKGETGKYLRLPQLVDMAAQIASGMAYVERMNYVHRDLRAANILVGENLVCKVADFGLARLIEDNEYTARQGAKFPIKWTAPEAALYGRFTIKSDVWSFGILLTELTTKGRVPYPGMVNREVLDQVERGYRMPCPPECPESLHDLMCQCWRKEPEERPTFEYLQAFLEDYFTSTEPQYQPGE",
            "query_sequence_alignment_part_start_idx": 1,
            "query_sequence_alignment_part_end_idx": 448,
            "query_sequence_alignment_part": "TTFVALYDYESRTETDLSFKKGERLQIVNNTEGDWWLAHSLSTGQTGYIPSNYVAPSDSIQAEEWYFGKITRRESERLLLNAENPRGTFLVRESETTKGAYCLSVSDFDNAKGLNVKHYKIRKLDSGGFYITSRTQFNSLQQLVAYYSKHADGLCHRLTTVCPTSKPQTQGLAKDAWEIPRESLRLEVKLGQGCFGEVWMGTWNGTTRVAIKTLKPGTMSPEAFLQEAQVMKKLRHEKLVQLYAVVSEEPIYIVGEYMSKGSLLDFLKGETGKYLRLPQLVDMAAQIASGMAYVERMNYVHRDLRAANILVGENLVCKVADFGLARLIEDNEYTARQGAKFPIKWTAPEAALYGRFTIKSDVWSFGILLTELTTKGRVPYPGMVNREVLDQVERGYRMPCPPECPESLHDLMCQCWRKEPEERPTFEYLQAFLEDYFTSTEPQYQPGE",
            "template_modeling_score": 1.002,
            "target_sequence": "TTFVALYDYESRTETDLSFKKGERLQIVNNTEGDWWLAHSLSTGQTGYIPSNYVAPSDSIQAEEWYFGKITRRESERLLLNAENPRGTFLVRESETTKGAYCLSVSDFDNAKGLNVKHYKIRKLDSGGFYITSRTQFNSLQQLVAYYSKHADGLCHRLTTVCPTSKPQTQGLAKDAWEIPRESLRLEVKLGQGCFGEVWMGTWNGTTRVAIKTLKPGTMSPEAFLQEAQVMKKLRHEKLVQLYAVVSEEPIYIVGEYMSKGSLLDFLKGETGKYLRLPQLVDMAAQIASGMAYVERMNYVHRDLRAANILVGENLVCKVADFGLARLIEDNEYTARQGAKFPIKWTAPEAALYGRFTIKSDVWSFGILLTELTTKGRVPYPGMVNREVLDQVERGYRMPCPPECPESLHDLMCQCWRKEPEERPTFEYLQAFLEDYFTSTEPQYQPGE",
            "target_sequence_alignment_part_start_idx": 1,
            "target_sequence_alignment_part_end_idx": 448,
            "target_sequence_alignment_part": "TTFVALYDYESRTETDLSFKKGERLQIVNNTEGDWWLAHSLSTGQTGYIPSNYVAPSDSIQAEEWYFGKITRRESERLLLNAENPRGTFLVRESETTKGAYCLSVSDFDNAKGLNVKHYKIRKLDSGGFYITSRTQFNSLQQLVAYYSKHADGLCHRLTTVCPTSKPQTQGLAKDAWEIPRESLRLEVKLGQGCFGEVWMGTWNGTTRVAIKTLKPGTMSPEAFLQEAQVMKKLRHEKLVQLYAVVSEEPIYIVGEYMSKGSLLDFLKGETGKYLRLPQLVDMAAQIASGMAYVERMNYVHRDLRAANILVGENLVCKVADFGLARLIEDNEYTARQGAKFPIKWTAPEAALYGRFTIKSDVWSFGILLTELTTKGRVPYPGMVNREVLDQVERGYRMPCPPECPESLHDLMCQCWRKEPEERPTFEYLQAFLEDYFTSTEPQYQPGE"
        }
    },
    {
        "id": "2h8h",
        "binding_sites": [
            {
                "id": "H_PTR",
                "confidence": 1.0,
                "residues": [
                    {
                        "id": "ARG",
                        "index": 71
                    },
                    {
                        "id": "ARG",
                        "index": 91
                    },
                    {
                        "id": "GLU",
                        "index": 92
                    },
                    {
                        "id": "SER",
                        "index": 93
                    },
                    {
                        "id": "GLU",
                        "index": 94
                    },
                    {
                        "id": "THR",
                        "index": 95
                    },
                    {
                        "id": "THR",
                        "index": 96
                    },
                    {
                        "id": "CYS",
                        "index": 101
                    },
                    {
                        "id": "HIS",
                        "index": 117
                    },
                    {
                        "id": "TYR",
                        "index": 118
                    },
                    {
                        "id": "LYS",
                        "index": 119
                    },
                    {
                        "id": "PRO",
                        "index": 441
                    },
                    {
                        "id": "GLN",
                        "index": 442
                    },
                    {
                        "id": "GLN",
                        "index": 443
                    },
                    {
                        "id": "PRO",
                        "index": 444
                    }
                ]
            },
            {
                "id": "H_H8H",
                "confidence": 1.0,
                "residues": [
                    {
                        "id": "LEU",
                        "index": 189
                    },
                    {
                        "id": "GLY",
                        "index": 190
                    },
                    {
                        "id": "VAL",
                        "index": 197
                    },
                    {
                        "id": "ALA",
                        "index": 209
                    },
                    {
                        "id": "ILE",
                        "index": 210
                    },
                    {
                        "id": "LYS",
                        "index": 211
                    },
                    {
                        "id": "ILE",
                        "index": 252
                    },
                    {
                        "id": "THR",
                        "index": 254
                    },
                    {
                        "id": "GLU",
                        "index": 255
                    },
                    {
                        "id": "TYR",
                        "index": 256
                    },
                    {
                        "id": "MET",
                        "index": 257
                    },
                    {
                        "id": "SER",
                        "index": 258
                    },
                    {
                        "id": "LYS",
                        "index": 259
                    },
                    {
                        "id": "GLY",
                        "index": 260
                    },
                    {
                        "id": "SER",
                        "index": 261
                    },
                    {
                        "id": "ALA",
                        "index": 306
                    },
                    {
                        "id": "ASN",
                        "index": 307
                    },
                    {
                        "id": "LEU",
                        "index": 309
                    },
                    {
                        "id": "ALA",
                        "index": 319
                    },
                    {
                        "id": "ASP",
                        "index": 320
                    }
                ]
            }
        ],
        "alignment_data": {
            "query_sequence_id": "tmp1or06uio",
            "target_sequence_id": "2h8h-assembly1.cif.gz_A",
            "alignment_length": 444,
            "query_sequence": "TTFVALYDYESRTETDLSFKKGERLQIVNNTEGDWWLAHSLSTGQTGYIPSNYVAPSDSIQAEEWYFGKITRRESERLLLNAENPRGTFLVRESETTKGAYCLSVSDFDNAKGLNVKHYKIRKLDSGGFYITSRTQFNSLQQLVAYYSKHADGLCHRLTTVCPTSKPQTQGLAKDAWEIPRESLRLEVKLGQGCFGEVWMGTWNGTTRVAIKTLKPGTMSPEAFLQEAQVMKKLRHEKLVQLYAVVSEEPIYIVGEYMSKGSLLDFLKGETGKYLRLPQLVDMAAQIASGMAYVERMNYVHRDLRAANILVGENLVCKVADFGLARLIEDNEYTARQGAKFPIKWTAPEAALYGRFTIKSDVWSFGILLTELTTKGRVPYPGMVNREVLDQVERGYRMPCPPECPESLHDLMCQCWRKEPEERPTFEYLQAFLEDYFTSTEPQYQPGE",
            "query_sequence_alignment_part_start_idx": 3,
            "query_sequence_alignment_part_end_idx": 446,
            "query_sequence_alignment_part": "FVALYDYESRTETDLSFKKGERLQIVNNTEGDWWLAHSLSTGQTGYIPSNYVAPSDSIQAEEWYFGKITRRESERLLLNAENPRGTFLVRESETTKGAYCLSVSDFDNAKGLNVKHYKIRKLDSGGFYITSRTQFNSLQQLVAYYSKHADGLCHRLTTVCPTSKPQTQGLAKDAWEIPRESLRLEVKLGQGCFGEVWMGTWNGTTRVAIKTLKPGTMSPEAFLQEAQVMKKLRHEKLVQLYAVVSEEPIYIVGEYMSKGSLLDFLKGETGKYLRLPQLVDMAAQIASGMAYVERMNYVHRDLRAANILVGENLVCKVADFGLARLIEDNEYTARQGAKFPIKWTAPEAALYGRFTIKSDVWSFGILLTELTTKGRVPYPGMVNREVLDQVERGYRMPCPPECPESLHDLMCQCWRKEPEERPTFEYLQAFLEDYFTSTEPQYQP",
            "template_modeling_score": 0.9994,
            "target_sequence": "TFVALYDYESRTETDLSFKKGERLQIVNNTEGDWWLAHSLSTGQTGYIPSNYVAPSDSIQAEEWYFGKITRRESERLLLNAENPRGTFLVRESETTKGAYCLSVSDFDNAKGLNVKHYKIRKLDSGGFYITSRTQFNSLQQLVAYYSKHADGLCHRLTTVCPTSKPQTQGLAKDAWEIPRESLRLEVKLGQGCFGEVWMGTWNGTTRVAIKTLKPGTMSPEAFLQEAQVMKKLRHEKLVQLYAVVSEEPIYIVTEYMSKGSLLDFLKGETGKYLRLPQLVDMAAQIASGMAYVERMNYVHRDLRAANILVGENLVCKVADFGLARLIEDNEYTARQGAKFPIKWTAPEAALYGRFTIKSDVWSFGILLTELTTKGRVPYPGMVNREVLDQVERGYRMPCPPECPESLHDLMCQCWRKEPEERPTFEYLQAFLEDYFTSTEPQYQP",
            "target_sequence_alignment_part_start_idx": 2,
            "target_sequence_alignment_part_end_idx": 445,
            "target_sequence_alignment_part": "FVALYDYESRTETDLSFKKGERLQIVNNTEGDWWLAHSLSTGQTGYIPSNYVAPSDSIQAEEWYFGKITRRESERLLLNAENPRGTFLVRESETTKGAYCLSVSDFDNAKGLNVKHYKIRKLDSGGFYITSRTQFNSLQQLVAYYSKHADGLCHRLTTVCPTSKPQTQGLAKDAWEIPRESLRLEVKLGQGCFGEVWMGTWNGTTRVAIKTLKPGTMSPEAFLQEAQVMKKLRHEKLVQLYAVVSEEPIYIVTEYMSKGSLLDFLKGETGKYLRLPQLVDMAAQIASGMAYVERMNYVHRDLRAANILVGENLVCKVADFGLARLIEDNEYTARQGAKFPIKWTAPEAALYGRFTIKSDVWSFGILLTELTTKGRVPYPGMVNREVLDQVERGYRMPCPPECPESLHDLMCQCWRKEPEERPTFEYLQAFLEDYFTSTEPQYQP"
        }
    },
    {
        "id": "6f3f",
        "binding_sites": [
            {
                "id": "H_PTR",
                "confidence": 1.0,
                "residues": [
                    {
                        "id": "ARG",
                        "index": 75
                    },
                    {
                        "id": "ARG",
                        "index": 95
                    },
                    {
                        "id": "GLU",
                        "index": 96
                    },
                    {
                        "id": "SER",
                        "index": 97
                    },
                    {
                        "id": "GLU",
                        "index": 98
                    },
                    {
                        "id": "THR",
                        "index": 99
                    },
                    {
                        "id": "CYS",
                        "index": 105
                    },
                    {
                        "id": "HIS",
                        "index": 121
                    },
                    {
                        "id": "TYR",
                        "index": 122
                    },
                    {
                        "id": "LYS",
                        "index": 123
                    },
                    {
                        "id": "GLU",
                        "index": 444
                    },
                    {
                        "id": "PRO",
                        "index": 445
                    },
                    {
                        "id": "GLN",
                        "index": 446
                    },
                    {
                        "id": "GLN",
                        "index": 447
                    },
                    {
                        "id": "PRO",
                        "index": 448
                    }
                ]
            },
            {
                "id": "H_ADP",
                "confidence": 1.0,
                "residues": [
                    {
                        "id": "LEU",
                        "index": 193
                    },
                    {
                        "id": "GLY",
                        "index": 194
                    },
                    {
                        "id": "GLN",
                        "index": 195
                    },
                    {
                        "id": "GLY",
                        "index": 196
                    },
                    {
                        "id": "CYS",
                        "index": 197
                    },
                    {
                        "id": "GLY",
                        "index": 199
                    },
                    {
                        "id": "GLU",
                        "index": 200
                    },
                    {
                        "id": "VAL",
                        "index": 201
                    },
                    {
                        "id": "ALA",
                        "index": 213
                    },
                    {
                        "id": "LYS",
                        "index": 215
                    },
                    {
                        "id": "VAL",
                        "index": 243
                    },
                    {
                        "id": "THR",
                        "index": 258
                    },
                    {
                        "id": "GLU",
                        "index": 259
                    },
                    {
                        "id": "TYR",
                        "index": 260
                    },
                    {
                        "id": "MET",
                        "index": 261
                    },
                    {
                        "id": "ASN",
                        "index": 262
                    },
                    {
                        "id": "GLY",
                        "index": 264
                    },
                    {
                        "id": "SER",
                        "index": 265
                    },
                    {
                        "id": "ASP",
                        "index": 268
                    },
                    {
                        "id": "ARG",
                        "index": 308
                    },
                    {
                        "id": "ALA",
                        "index": 310
                    },
                    {
                        "id": "ASN",
                        "index": 311
                    },
                    {
                        "id": "LEU",
                        "index": 313
                    },
                    {
                        "id": "ALA",
                        "index": 323
                    },
                    {
                        "id": "ASP",
                        "index": 324
                    }
                ]
            },
            {
                "id": "H_MG",
                "confidence": 1.0,
                "residues": [
                    {
                        "id": "LYS",
                        "index": 215
                    },
                    {
                        "id": "ASP",
                        "index": 306
                    },
                    {
                        "id": "ARG",
                        "index": 308
                    },
                    {
                        "id": "ASN",
                        "index": 311
                    },
                    {
                        "id": "ASP",
                        "index": 324
                    },
                    {
                        "id": "LEU",
                        "index": 327
                    }
                ]
            }
        ],
        "alignment_data": {
            "query_sequence_id": "tmp1or06uio",
            "target_sequence_id": "6f3f-assembly1.cif.gz_A",
            "alignment_length": 446,
            "query_sequence": "TTFVALYDYESRTETDLSFKKGERLQIVNNTEGDWWLAHSLSTGQTGYIPSNYVAPSDSIQAEEWYFGKITRRESERLLLNAENPRGTFLVRESETTKGAYCLSVSDFDNAKGLNVKHYKIRKLDSGGFYITSRTQFNSLQQLVAYYSKHADGLCHRLTTVCPTSKPQTQGLAKDAWEIPRESLRLEVKLGQGCFGEVWMGTWNGTTRVAIKTLKPGTMSPEAFLQEAQVMKKLRHEKLVQLYAVVSEEPIYIVGEYMSKGSLLDFLKGETGKYLRLPQLVDMAAQIASGMAYVERMNYVHRDLRAANILVGENLVCKVADFGLARLIEDNEYTARQGAKFPIKWTAPEAALYGRFTIKSDVWSFGILLTELTTKGRVPYPGMVNREVLDQVERGYRMPCPPECPESLHDLMCQCWRKEPEERPTFEYLQAFLEDYFTSTEPQYQPGE",
            "query_sequence_alignment_part_start_idx": 1,
            "query_sequence_alignment_part_end_idx": 446,
            "query_sequence_alignment_part": "TTFVALYDYESRTETDLSFKKGERLQIVNNTEGDWWLAHSLSTGQTGYIPSNYVAPSDSIQAEEWYFGKITRRESERLLLNAENPRGTFLVRESETTKGAYCLSVSDFDNAKGLNVKHYKIRKLDSGGFYITSRTQFNSLQQLVAYYSKHADGLCHRLTTVCPTSKPQTQGLAKDAWEIPRESLRLEVKLGQGCFGEVWMGTWNGTTRVAIKTLKPGTMSPEAFLQEAQVMKKLRHEKLVQLYAVVSEEPIYIVGEYMSKGSLLDFLKGETGKYLRLPQLVDMAAQIASGMAYVERMNYVHRDLRAANILVGENLVCKVADFGLARLIEDNEYTARQGAKFPIKWTAPEAALYGRFTIKSDVWSFGILLTELTTKGRVPYPGMVNREVLDQVERGYRMPCPPECPESLHDLMCQCWRKEPEERPTFEYLQAFLEDYFTSTEPQYQP",
            "template_modeling_score": 0.9709,
            "target_sequence": "RMVTTFVALYDYESRTETDLSFKKGERLQIVNNTEGDWWLAHSLSTGQTGYIPSNYVAPSDSIQAEEWYFGKITRRESERLLLNAENPRGTFLVRESETTKGAYCLSVSDFDNAKGLNVKHYKIRKLDSGGFYITSRTQFNSLQQLVAYYSKHADGLCHRLTTVCPTSKPQTQGLAKDAWEIPRESLRLEVKLGQGCFGEVWMGTWNGTTRVAIKTLKPGTMSPEAFLQEAQVMKKLRHEKLVQLYAVVSEEPIYIVTEYMNKGSLLDFLKGETGKYLRLPQLVDMSAQIASGMAYVERMNYVHRDLRAANILVGENLVCKVADFGLARLIEDNEYTARQGAKFPIKWTAPEAALYGRFTIKSDVWSFGILLTELTTKGRVPYPGMVNREVLDQVERGYRMPCPPECPESLHDLMCQCWRKEPEERPTFEYLQAFLEDYFTSTEPQYQP",
            "target_sequence_alignment_part_start_idx": 4,
            "target_sequence_alignment_part_end_idx": 449,
            "target_sequence_alignment_part": "TTFVALYDYESRTETDLSFKKGERLQIVNNTEGDWWLAHSLSTGQTGYIPSNYVAPSDSIQAEEWYFGKITRRESERLLLNAENPRGTFLVRESETTKGAYCLSVSDFDNAKGLNVKHYKIRKLDSGGFYITSRTQFNSLQQLVAYYSKHADGLCHRLTTVCPTSKPQTQGLAKDAWEIPRESLRLEVKLGQGCFGEVWMGTWNGTTRVAIKTLKPGTMSPEAFLQEAQVMKKLRHEKLVQLYAVVSEEPIYIVTEYMNKGSLLDFLKGETGKYLRLPQLVDMSAQIASGMAYVERMNYVHRDLRAANILVGENLVCKVADFGLARLIEDNEYTARQGAKFPIKWTAPEAALYGRFTIKSDVWSFGILLTELTTKGRVPYPGMVNREVLDQVERGYRMPCPPECPESLHDLMCQCWRKEPEERPTFEYLQAFLEDYFTSTEPQYQP"
        }
    },
    {
        "id": "7uy0",
        "binding_sites": [
            {
                "id": "H_PTR",
                "confidence": 1.0,
                "residues": [
                    {
                        "id": "ARG",
                        "index": 519
                    },
                    {
                        "id": "ARG",
                        "index": 519
                    },
                    {
                        "id": "ARG",
                        "index": 539
                    },
                    {
                        "id": "ARG",
                        "index": 539
                    },
                    {
                        "id": "GLU",
                        "index": 540
                    },
                    {
                        "id": "GLU",
                        "index": 540
                    },
                    {
                        "id": "SER",
                        "index": 541
                    },
                    {
                        "id": "SER",
                        "index": 541
                    },
                    {
                        "id": "GLU",
                        "index": 542
                    },
                    {
                        "id": "GLU",
                        "index": 542
                    },
                    {
                        "id": "THR",
                        "index": 543
                    },
                    {
                        "id": "THR",
                        "index": 543
                    },
                    {
                        "id": "SER",
                        "index": 549
                    },
                    {
                        "id": "SER",
                        "index": 549
                    },
                    {
                        "id": "HIS",
                        "index": 565
                    },
                    {
                        "id": "HIS",
                        "index": 565
                    },
                    {
                        "id": "TYR",
                        "index": 566
                    },
                    {
                        "id": "TYR",
                        "index": 566
                    },
                    {
                        "id": "LYS",
                        "index": 567
                    },
                    {
                        "id": "LYS",
                        "index": 567
                    },
                    {
                        "id": "PRO",
                        "index": 888
                    },
                    {
                        "id": "PRO",
                        "index": 888
                    },
                    {
                        "id": "GLN",
                        "index": 889
                    },
                    {
                        "id": "GLN",
                        "index": 889
                    },
                    {
                        "id": "GLU",
                        "index": 890
                    },
                    {
                        "id": "GLU",
                        "index": 890
                    },
                    {
                        "id": "GLU",
                        "index": 891
                    },
                    {
                        "id": "GLU",
                        "index": 891
                    }
                ]
            },
            {
                "id": "H_GOL",
                "confidence": 1.0,
                "residues": [
                    {
                        "id": "PHE",
                        "index": 642
                    },
                    {
                        "id": "LYS",
                        "index": 659
                    },
                    {
                        "id": "LEU",
                        "index": 661
                    },
                    {
                        "id": "ASP",
                        "index": 749
                    },
                    {
                        "id": "ARG",
                        "index": 751
                    },
                    {
                        "id": "ASN",
                        "index": 754
                    },
                    {
                        "id": "ASP",
                        "index": 767
                    },
                    {
                        "id": "LEU",
                        "index": 770
                    },
                    {
                        "id": "ILE",
                        "index": 774
                    },
                    {
                        "id": "TYR",
                        "index": 779
                    },
                    {
                        "id": "TYR",
                        "index": 826
                    },
                    {
                        "id": "PRO",
                        "index": 827
                    },
                    {
                        "id": "GLY",
                        "index": 828
                    },
                    {
                        "id": "MET",
                        "index": 829
                    },
                    {
                        "id": "TYR",
                        "index": 842
                    },
                    {
                        "id": "MET",
                        "index": 844
                    },
                    {
                        "id": "PRO",
                        "index": 845
                    }
                ]
            },
            {
                "id": "H_GOL",
                "confidence": 1.0,
                "residues": [
                    {
                        "id": "LEU",
                        "index": 681
                    },
                    {
                        "id": "ARG",
                        "index": 682
                    },
                    {
                        "id": "HIS",
                        "index": 683
                    },
                    {
                        "id": "ASP",
                        "index": 684
                    },
                    {
                        "id": "LYS",
                        "index": 685
                    },
                    {
                        "id": "LEU",
                        "index": 686
                    },
                    {
                        "id": "VAL",
                        "index": 687
                    },
                    {
                        "id": "GLN",
                        "index": 688
                    },
                    {
                        "id": "LEU",
                        "index": 689
                    },
                    {
                        "id": "GLU",
                        "index": 703
                    },
                    {
                        "id": "LYS",
                        "index": 764
                    },
                    {
                        "id": "PHE",
                        "index": 768
                    }
                ]
            },
            {
                "id": "H_VSE",
                "confidence": 1.0,
                "residues": [
                    {
                        "id": "LEU",
                        "index": 637
                    },
                    {
                        "id": "GLY",
                        "index": 638
                    },
                    {
                        "id": "VAL",
                        "index": 645
                    },
                    {
                        "id": "ALA",
                        "index": 657
                    },
                    {
                        "id": "LYS",
                        "index": 659
                    },
                    {
                        "id": "MET",
                        "index": 678
                    },
                    {
                        "id": "VAL",
                        "index": 687
                    },
                    {
                        "id": "LEU",
                        "index": 689
                    },
                    {
                        "id": "ILE",
                        "index": 700
                    },
                    {
                        "id": "THR",
                        "index": 702
                    },
                    {
                        "id": "GLU",
                        "index": 703
                    },
                    {
                        "id": "PHE",
                        "index": 704
                    },
                    {
                        "id": "MET",
                        "index": 705
                    },
                    {
                        "id": "GLY",
                        "index": 707
                    },
                    {
                        "id": "SER",
                        "index": 708
                    },
                    {
                        "id": "ASP",
                        "index": 711
                    },
                    {
                        "id": "LEU",
                        "index": 756
                    },
                    {
                        "id": "ILE",
                        "index": 765
                    },
                    {
                        "id": "ALA",
                        "index": 766
                    },
                    {
                        "id": "ASP",
                        "index": 767
                    },
                    {
                        "id": "PHE",
                        "index": 768
                    },
                    {
                        "id": "LEU",
                        "index": 770
                    }
                ]
            },
            {
                "id": "H_CL",
                "confidence": 1.0,
                "residues": [
                    {
                        "id": "ARG",
                        "index": 459
                    },
                    {
                        "id": "SER",
                        "index": 541
                    },
                    {
                        "id": "GLU",
                        "index": 542
                    },
                    {
                        "id": "THR",
                        "index": 543
                    },
                    {
                        "id": "THR",
                        "index": 544
                    },
                    {
                        "id": "LYS",
                        "index": 545
                    },
                    {
                        "id": "GLN",
                        "index": 615
                    },
                    {
                        "id": "THR",
                        "index": 616
                    },
                    {
                        "id": "THR",
                        "index": 654
                    },
                    {
                        "id": "TYR",
                        "index": 690
                    }
                ]
            },
            {
                "id": "H_CME",
                "confidence": 1.0,
                "residues": [
                    {
                        "id": "PHE",
                        "index": 704
                    },
                    {
                        "id": "MET",
                        "index": 705
                    },
                    {
                        "id": "CYS",
                        "index": 259
                    },
                    {
                        "id": "HIS",
                        "index": 706
                    },
                    {
                        "id": "GLY",
                        "index": 707
                    },
                    {
                        "id": "VAL",
                        "index": 757
                    },
                    {
                        "id": "GLY",
                        "index": 758
                    },
                    {
                        "id": "GLU",
                        "index": 759
                    },
                    {
                        "id": "ARG",
                        "index": 760
                    }
                ]
            },
            {
                "id": "H_VSE",
                "confidence": 1.0,
                "residues": [
                    {
                        "id": "LEU",
                        "index": 637
                    },
                    {
                        "id": "GLY",
                        "index": 638
                    },
                    {
                        "id": "VAL",
                        "index": 645
                    },
                    {
                        "id": "ALA",
                        "index": 657
                    },
                    {
                        "id": "LYS",
                        "index": 659
                    },
                    {
                        "id": "MET",
                        "index": 678
                    },
                    {
                        "id": "VAL",
                        "index": 687
                    },
                    {
                        "id": "LEU",
                        "index": 689
                    },
                    {
                        "id": "ILE",
                        "index": 700
                    },
                    {
                        "id": "THR",
                        "index": 702
                    },
                    {
                        "id": "GLU",
                        "index": 703
                    },
                    {
                        "id": "PHE",
                        "index": 704
                    },
                    {
                        "id": "MET",
                        "index": 705
                    },
                    {
                        "id": "GLY",
                        "index": 707
                    },
                    {
                        "id": "SER",
                        "index": 708
                    },
                    {
                        "id": "ASP",
                        "index": 711
                    },
                    {
                        "id": "LEU",
                        "index": 756
                    },
                    {
                        "id": "ILE",
                        "index": 765
                    },
                    {
                        "id": "ALA",
                        "index": 766
                    },
                    {
                        "id": "ASP",
                        "index": 767
                    },
                    {
                        "id": "PHE",
                        "index": 768
                    },
                    {
                        "id": "LEU",
                        "index": 770
                    }
                ]
            },
            {
                "id": "H_CL",
                "confidence": 1.0,
                "residues": [
                    {
                        "id": "PHE",
                        "index": 787
                    },
                    {
                        "id": "PRO",
                        "index": 788
                    },
                    {
                        "id": "ILE",
                        "index": 789
                    },
                    {
                        "id": "LYS",
                        "index": 790
                    },
                    {
                        "id": "TRP",
                        "index": 791
                    },
                    {
                        "id": "LYS",
                        "index": 831
                    }
                ]
            },
            {
                "id": "H_CL",
                "confidence": 1.0,
                "residues": [
                    {
                        "id": "ARG",
                        "index": 459
                    },
                    {
                        "id": "GLN",
                        "index": 615
                    },
                    {
                        "id": "THR",
                        "index": 616
                    },
                    {
                        "id": "TYR",
                        "index": 690
                    }
                ]
            },
            {
                "id": "H_PO4",
                "confidence": 1.0,
                "residues": [
                    {
                        "id": "GLY",
                        "index": 515
                    },
                    {
                        "id": "LYS",
                        "index": 516
                    },
                    {
                        "id": "ILE",
                        "index": 517
                    },
                    {
                        "id": "GLY",
                        "index": 518
                    },
                    {
                        "id": "GLU",
                        "index": 540
                    },
                    {
                        "id": "SER",
                        "index": 541
                    },
                    {
                        "id": "GLU",
                        "index": 542
                    }
                ]
            },
            {
                "id": "H_PO4",
                "confidence": 1.0,
                "residues": [
                    {
                        "id": "ILE",
                        "index": 507
                    },
                    {
                        "id": "TYR",
                        "index": 548
                    },
                    {
                        "id": "TYR",
                        "index": 576
                    },
                    {
                        "id": "ASN",
                        "index": 585
                    },
                    {
                        "id": "SER",
                        "index": 586
                    },
                    {
                        "id": "VAL",
                        "index": 587
                    },
                    {
                        "id": "GLN",
                        "index": 588
                    }
                ]
            }
        ],
        "alignment_data": {
            "query_sequence_id": "tmp1or06uio",
            "target_sequence_id": "7uy0-assembly2.cif.gz_B",
            "alignment_length": 445,
            "query_sequence": "TTFVALYDYESRTETDLSFKKGERLQIVNNTEGDWWLAHSLSTGQTGYIPSNYVAPSDSIQAEEWYFGKITRRESERLLLNAENPRGTFLVRESETTKGAYCLSVSDFDNAKGLNVKHYKIRKLDSGGFYITSRTQFNSLQQLVAYYSKHADGLCHRLTTVCPTSKPQTQGLAKDAWEIPRESLRLEVKLGQGCFGEVWMGTWNGTTRVAIKTLKPGTMSPEAFLQEAQVMKKLRHEKLVQLYAVVSEEPIYIVGEYMSKGSLLDFLKGETGKYLRLPQLVDMAAQIASGMAYVERMNYVHRDLRAANILVGENLVCKVADFGLARLIEDNEYTARQGAKFPIKWTAPEAALYGRFTIKSDVWSFGILLTELTTKGRVPYPGMVNREVLDQVERGYRMPCPPECPESLHDLMCQCWRKEPEERPTFEYLQAFLEDYFTSTEPQYQPGE",
            "query_sequence_alignment_part_start_idx": 1,
            "query_sequence_alignment_part_end_idx": 445,
            "query_sequence_alignment_part": "TTFVALYDYESRTETDLSFKKGERLQIVNNTEGDWWLAHSLSTGQTGYIPSNYVAPSDSIQAEEWYFGKITRRESERLLLNAENPRGTFLVRESETTKGAYCLSVSDFDNAKGLNVKHYKIRKLDSGGFYITSRTQFNSLQQLVAYYSKHADGLCHRLTTVCPTSKPQTQGLAKDAWEIPRESLRLEVKLGQGCFGEVWMGTWNGTTRVAIKTLKPGTMSPEAFLQEAQVMKKLRHEKLVQLYAVVSEEPIYIVGEYMSKGSLLDFLKGETGKYLRLPQLVDMAAQIASGMAYVERMNYVHRDLRAANILVGENLVCKVADFGLARLIEDNEYTARQGAKFPIKWTAPEAALYGRFTIKSDVWSFGILLTELTTKGRVPYPGMVNREVLDQVERGYRMPCPPECPESLHDLMCQCWRKEPEERPTFEYLQAFLEDYFTSTEPQYQ",
            "template_modeling_score": 0.9747,
            "target_sequence": "TLFIALYDYEARTEDDLTFTKGEKFHILNNTEGDWWEARSLSSGKTGCIPSNYVAPVDSIQAEEWYFGKIGRKDAERQLLSPGNPQGAFLIRESETTKGAYSLSIRDWDQTRGDHVKHYKIRKLDMGGYYITTRVQFNSVQELVQHYMEVNDGLCNLLIAPCTIMKPQTLGLAKDAWEISRSSITLERRLGTGCFGDVWLGTWNGSTKVAVKTLKPGTMSPKAFLEEAQVMKLLRHDKLVQLYAVVSEEPIYIVTEFMCHGSLLDFLKNPEGQDLRLPQLVDMAAQVAEGMAYMERMNYIHRDLRAANILVGERLACKIADFGLARLIKDDEYNPCQGSKFPIKWTAPEAALFGRFTIKSDVWSFGILLTELITKGRIPYPGMNKREVLEQVEQGYHMPCPPGCPASLYEAMEQTWRLDPEERPTFEYLQSFLEDYFTSAEPQYEEIP",
            "target_sequence_alignment_part_start_idx": 1,
            "target_sequence_alignment_part_end_idx": 445,
            "target_sequence_alignment_part": "TLFIALYDYEARTEDDLTFTKGEKFHILNNTEGDWWEARSLSSGKTGCIPSNYVAPVDSIQAEEWYFGKIGRKDAERQLLSPGNPQGAFLIRESETTKGAYSLSIRDWDQTRGDHVKHYKIRKLDMGGYYITTRVQFNSVQELVQHYMEVNDGLCNLLIAPCTIMKPQTLGLAKDAWEISRSSITLERRLGTGCFGDVWLGTWNGSTKVAVKTLKPGTMSPKAFLEEAQVMKLLRHDKLVQLYAVVSEEPIYIVTEFMCHGSLLDFLKNPEGQDLRLPQLVDMAAQVAEGMAYMERMNYIHRDLRAANILVGERLACKIADFGLARLIKDDEYNPCQGSKFPIKWTAPEAALFGRFTIKSDVWSFGILLTELITKGRIPYPGMNKREVLEQVEQGYHMPCPPGCPASLYEAMEQTWRLDPEERPTFEYLQSFLEDYFTSAEPQYE"
        }
    },
    {
        "id": "5h09",
        "binding_sites": [
            {
                "id": "H_PTR",
                "confidence": 1.0,
                "residues": [
                    {
                        "id": "ARG",
                        "index": 72
                    },
                    {
                        "id": "ARG",
                        "index": 92
                    },
                    {
                        "id": "ASP",
                        "index": 93
                    },
                    {
                        "id": "SER",
                        "index": 94
                    },
                    {
                        "id": "GLU",
                        "index": 95
                    },
                    {
                        "id": "THR",
                        "index": 96
                    },
                    {
                        "id": "SER",
                        "index": 102
                    },
                    {
                        "id": "HIS",
                        "index": 118
                    },
                    {
                        "id": "TYR",
                        "index": 119
                    },
                    {
                        "id": "LYS",
                        "index": 120
                    },
                    {
                        "id": "SER",
                        "index": 441
                    },
                    {
                        "id": "GLN",
                        "index": 442
                    },
                    {
                        "id": "GLU",
                        "index": 443
                    },
                    {
                        "id": "GLU",
                        "index": 444
                    }
                ]
            },
            {
                "id": "H_OOO",
                "confidence": 1.0,
                "residues": [
                    {
                        "id": "LEU",
                        "index": 189
                    },
                    {
                        "id": "GLY",
                        "index": 190
                    },
                    {
                        "id": "ALA",
                        "index": 191
                    },
                    {
                        "id": "GLY",
                        "index": 192
                    },
                    {
                        "id": "VAL",
                        "index": 197
                    },
                    {
                        "id": "ALA",
                        "index": 209
                    },
                    {
                        "id": "LYS",
                        "index": 211
                    },
                    {
                        "id": "MET",
                        "index": 230
                    },
                    {
                        "id": "VAL",
                        "index": 239
                    },
                    {
                        "id": "LEU",
                        "index": 241
                    },
                    {
                        "id": "ILE",
                        "index": 252
                    },
                    {
                        "id": "THR",
                        "index": 254
                    },
                    {
                        "id": "GLU",
                        "index": 255
                    },
                    {
                        "id": "PHE",
                        "index": 256
                    },
                    {
                        "id": "MET",
                        "index": 257
                    },
                    {
                        "id": "GLY",
                        "index": 260
                    },
                    {
                        "id": "SER",
                        "index": 261
                    },
                    {
                        "id": "ASP",
                        "index": 264
                    },
                    {
                        "id": "ALA",
                        "index": 306
                    },
                    {
                        "id": "LEU",
                        "index": 309
                    },
                    {
                        "id": "ALA",
                        "index": 319
                    },
                    {
                        "id": "ASP",
                        "index": 320
                    },
                    {
                        "id": "PHE",
                        "index": 321
                    },
                    {
                        "id": "LEU",
                        "index": 323
                    }
                ]
            }
        ],
        "alignment_data": {
            "query_sequence_id": "tmp1or06uio",
            "target_sequence_id": "5h09-assembly1.cif.gz_A",
            "alignment_length": 444,
            "query_sequence": "TTFVALYDYESRTETDLSFKKGERLQIVNNTEGDWWLAHSLSTGQTGYIPSNYVAPSDSIQAEEWYFGKITRRESERLLLNAENPRGTFLVRESETTKGAYCLSVSDFDNAKGLNVKHYKIRKLDSGGFYITSRTQFNSLQQLVAYYSKHADGLCHRLTTVCPTSKPQTQGLAKDAWEIPRESLRLEVKLGQGCFGEVWMGTWNGTTRVAIKTLKPGTMSPEAFLQEAQVMKKLRHEKLVQLYAVVSEEPIYIVGEYMSKGSLLDFLKGETGKYLRLPQLVDMAAQIASGMAYVERMNYVHRDLRAANILVGENLVCKVADFGLARLIEDNEYTARQGAKFPIKWTAPEAALYGRFTIKSDVWSFGILLTELTTKGRVPYPGMVNREVLDQVERGYRMPCPPECPESLHDLMCQCWRKEPEERPTFEYLQAFLEDYFTSTEPQYQPGE",
            "query_sequence_alignment_part_start_idx": 2,
            "query_sequence_alignment_part_end_idx": 445,
            "query_sequence_alignment_part": "TFVALYDYESRTETDLSFKKGERLQIVNNTEGDWWLAHSLSTGQTGYIPSNYVAPSDSIQAEEWYFGKITRRESERLLLNAENPRGTFLVRESETTKGAYCLSVSDFDNAKGLNVKHYKIRKLDSGGFYITSRTQFNSLQQLVAYYSKHADGLCHRLTTVCPTSKPQTQGLAKDAWEIPRESLRLEVKLGQGCFGEVWMGTWNGTTRVAIKTLKPGTMSPEAFLQEAQVMKKLRHEKLVQLYAVVSEEPIYIVGEYMSKGSLLDFLKGETGKYLRLPQLVDMAAQIASGMAYVERMNYVHRDLRAANILVGENLVCKVADFGLARLIEDNEYTARQGAKFPIKWTAPEAALYGRFTIKSDVWSFGILLTELTTKGRVPYPGMVNREVLDQVERGYRMPCPPECPESLHDLMCQCWRKEPEERPTFEYLQAFLEDYFTSTEPQYQ",
            "template_modeling_score": 0.9447,
            "target_sequence": "RIIVVALYDYEAIHHEDLSFQKGDQMVVLEESGEWWKARSLATRKEGYIPSNYVARVDSLETEEWFFKGISRKDAERQLLAPGNMLGSFMIRDSETTKGSYSLSVRDYDPRQGDTVKHYKIRTLDNGGFYISPRSTFSTLQELVDHYKKGNDGLCQKLSVPCMSSKPQKPWEKDAWEIPRESLKLEKKLGAGQFGEVWMATYNKHTKVAVKTMKPGSMSVEAFLAEANVMKTLQHDKLVKLHAVVTKEPIYIITEFMAKGSLLDFLKSDEGSKQPLPKLIDFSAQIAEGMAFIEQRNYIHRDLRAANILVSASLVCKIADFGLARVIEDNEYTAREGAKFPIKWTAPEAINFGSFTIKSDVWSFGILLMEIVTYGRIPYPGMSNPEVIRALERGYRMPRPENCPEELYNIMMRCWKNRPEERPTFEYIQSVLDDFYTATESQYEEIP",
            "target_sequence_alignment_part_start_idx": 3,
            "target_sequence_alignment_part_end_idx": 444,
            "target_sequence_alignment_part": "IVVALYDYEAIHHEDLSFQKGDQMVVLE-ESGEWWKARSLATRKEGYIPSNYVARVDSLETEEWFFKGISRKDAERQLLAPGNMLGSFMIRDSETTKGSYSLSVRDYDPRQGDTVKHYKIRTLDNGGFYISPRSTFSTLQELVDHYKKGNDGLCQKLSVPCMSSKPQKPW-EKDAWEIPRESLKLEKKLGAGQFGEVWMATYNKHTKVAVKTMKPGSMSVEAFLAEANVMKTLQHDKLVKLHAVVTKEPIYIITEFMAKGSLLDFLKSDEGSKQPLPKLIDFSAQIAEGMAFIEQRNYIHRDLRAANILVSASLVCKIADFGLARVIEDNEYTAREGAKFPIKWTAPEAINFGSFTIKSDVWSFGILLMEIVTYGRIPYPGMSNPEVIRALERGYRMPRPENCPEELYNIMMRCWKNRPEERPTFEYIQSVLDDFYTATESQYE"
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
