from dataclasses import dataclass
from typing import List, Optional, overload
from datetime import datetime

@dataclass
class BindingSite:
    id: str
    confidence: float
    """Interval [0,1]; confidence is 1 for experimentally determined binding sites"""
    residues: List[int]
    """Indices of amino acids in the sequence; ***0-indexed***"""

@dataclass
class SimilarSequenceAlignmentData:
    query_seq_aligned_part_start_idx: int
    """Index of amino acid in the sequence of query protein; ***0-indexed***"""
    query_seq_aligned_part_end_idx: int
    """Index of amino acid in the sequence of query protein; ***0-indexed***"""
    query_seq_aligned_part: str
    similar_sequence: str
    similar_seq_aligned_part_start_idx: int
    """Index of amino acid in the sequence of similar protein; ***0-indexed***"""
    similar_seq_aligned_part_end_idx: int
    """Index of amino acid in the sequence of similar protein; ***0-indexed***"""
    similar_seq_aligned_part: str

@dataclass
class SimilarProtein:
    pdb_id: str
    chain: str
    sequence: str
    binding_sites: BindingSite
    alignment_data: SimilarSequenceAlignmentData

@dataclass
class Metadata:
    data_source: str
    timestamp: str  # ISO 8601 format

@dataclass
class ProteinData:
    id: str
    chain: str
    sequence: str
    pdb_url: str
    binding_sites: List[BindingSite]
    metadata: Metadata
    similar_proteins: Optional[List[SimilarProtein]] = None

class ProteinBuilderBase:
    def __init__(self, sequence: str, chain: str):
        self._sequence = sequence
        self._chain = chain
        self._binding_sites = []

    @overload
    def add_binding_site(self, binding_site: BindingSite):
        self._binding_sites.append(binding_site)
        return self
    
    @overload
    def add_binding_site(self, id: str, confidence: float, residues: List[int]):
        self._binding_sites.append(BindingSite(id, confidence, residues))
        return self

    def add_binding_site(self, *args):
        if isinstance(args[0], BindingSite):
            self._binding_sites.append(args[0])
        elif len(args) == 3 and isinstance(args[0], str) and isinstance(args[1], float) and isinstance(args[2], list):
            self._binding_sites.append(BindingSite(args[0], args[1], args[2]))
        else:
            raise TypeError("Invalid arguments for add_binding_site")

        return self

class SimilarProteinBuilder(ProteinBuilderBase):
    def __init__(self, pdb_id: str, sequence: str, chain: str):
        super().__init__(sequence, chain)
        self._pdb_id = pdb_id
        self._alignment_data = None

    @overload
    def set_alignment_data(self, query_start: int, query_end: int, query_part: str, 
                           similar_seq: str, similar_start: int, similar_end: int, similar_part: str):
        self._alignment_data = SimilarSequenceAlignmentData(
            query_seq_aligned_part_start_idx=query_start,
            query_seq_aligned_part_end_idx=query_end,
            query_seq_aligned_part=query_part,
            similar_sequence=similar_seq,
            similar_seq_aligned_part_start_idx=similar_start,
            similar_seq_aligned_part_end_idx=similar_end,
            similar_seq_aligned_part=similar_part
        )
        return self

    @overload
    def set_alignment_data(self, similar_sequence_alignment_data: SimilarSequenceAlignmentData):
        self._alignment_data = similar_sequence_alignment_data
        return self

    def set_alignment_data(self, *args) -> "SimilarProteinBuilder":
        if len(args) == 7:
            query_start, query_end, query_part, similar_seq, similar_start, similar_end, similar_part = args
            self._alignment_data = SimilarSequenceAlignmentData(
                query_seq_aligned_part_start_idx=query_start,
                query_seq_aligned_part_end_idx=query_end,
                query_seq_aligned_part=query_part,
                similar_sequence=similar_seq,
                similar_seq_aligned_part_start_idx=similar_start,
                similar_seq_aligned_part_end_idx=similar_end,
                similar_seq_aligned_part=similar_part
            )
        elif len(args) == 1 and isinstance(args[0], SimilarSequenceAlignmentData):
            self._alignment_data = args[0]
        else:
            raise TypeError("Invalid arguments for set_alignment_data")

        return self

    def build(self) -> SimilarProtein:
        if not self._alignment_data:
            raise ValueError("Alignment data must be set before building SimilarProtein")
        
        return SimilarProtein(
            pdb_id=self._pdb_id,
            chain=self._chain,
            sequence=self._sequence,
            binding_sites=self._binding_sites,
            alignment_data=self._alignment_data
        )

class ProteinDataBuilder(ProteinBuilderBase):
    def __init__(self, id: str, chain: str, sequence: str, pdb_url: str):
        super().__init__(sequence, chain)
        self._id = id
        self._pdb_url = pdb_url
        self._similar_proteins = []
        self._metadata = None

    def add_similar_protein(self, similar_protein: SimilarProtein):
        self._similar_proteins.append(similar_protein)
        return self

    def add_metadata(self, data_source: str, timestamp: Optional[str] = None):
        if timestamp is None:
            timestamp = datetime.now().isoformat()
        self._metadata = Metadata(data_source, timestamp)
        return self

    def build(self) -> ProteinData:
        if not self._metadata:
            raise ValueError("Metadata must be set before building ProteinData")
        
        return ProteinData(
            id=self._id,
            sequence=self._sequence,
            chain=self._chain,
            pdb_url=self._pdb_url,
            binding_sites=self._binding_sites,
            metadata=self._metadata,
            similar_proteins=self._similar_proteins if self._similar_proteins else None,
        )
