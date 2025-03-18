from dataclasses import dataclass
from typing import List, Optional

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
    similar_sequence_alignment_data: SimilarSequenceAlignmentData

@dataclass
class ProteinData:
    id: str
    query_sequence: str
    query_pdb_id: Optional[str] = None
    chain: str
    pdb_url: str
    binding_sites: List[BindingSite]
    similar_proteins: Optional[List[SimilarProtein]] = None
    data_source: str
    """Name of the data source"""

class ProteinDataFactory:
    @staticmethod
    def create_binding_site(id: str, confidence: float, residues: List[int]) -> BindingSite:
        return BindingSite(id=id, confidence=confidence, residues=residues)

    @staticmethod
    def create_similar_sequence_alignment_data(query_start, query_end, query_part, similar_seq, similar_start, similar_end, similar_part):
        return SimilarSequenceAlignmentData(
            query_seq_aligned_part_start_idx=query_start,
            query_seq_aligned_part_end_idx=query_end,
            query_seq_aligned_part=query_part,
            similar_sequence=similar_seq,
            similar_seq_aligned_part_start_idx=similar_start,
            similar_seq_aligned_part_end_idx=similar_end,
            similar_seq_aligned_part=similar_part
        )

    @staticmethod
    def create_similar_protein(pdb_id, sequence, chain, binding_site, alignment_data):
        return SimilarProtein(
            pdb_id=pdb_id, sequence=sequence, chain=chain,
            binding_sites=binding_site, similar_sequence_alignment_data=alignment_data
        )

    @staticmethod
    def create_protein_data(id, query_sequence, query_pdb_id, chain, pdb_url, binding_sites, data_source, similar_proteins=None):
        return ProteinData(
            id=id, query_sequence=query_sequence, query_pdb_id=query_pdb_id,
            chain=chain, pdb_url=pdb_url, binding_sites=binding_sites,
            similar_proteins=similar_proteins, data_source=data_source
        )
