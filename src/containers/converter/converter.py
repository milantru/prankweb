import requests
from Bio.PDB import PDBParser, Polypeptide
from celery import Celery
import tempfile

# Celery configuration
celery = Celery(
    'tasks',
    broker='amqp://guest:guest@message-broker:5672//',
    backend='rpc://'
)

ESMFOLD_URL = "https://api.esmatlas.com/foldSequence/v1/pdb/"
INPUTS_URL = "http://apache:80/inputs/"

@celery.task(name='converter_str_to_seq')
def structure_to_sequence(id):

    pdb_url = INPUTS_URL + str(id) + "/structure.pdb"
    query_structure_file = ""

    response = requests.get(pdb_url, stream=True)
    response.raise_for_status()

    with tempfile.NamedTemporaryFile(mode="wb", suffix=".pdb", delete=False) as struct_file:
        for chunk in response.iter_content(chunk_size=8192):
            struct_file.write(chunk)
        query_structure_file = struct_file.name

    with open(query_structure_file, "r") as file:
        pdb = PDBParser().get_structure(id, file) 

    seq = ""

    for model in pdb:
        for chain in model:
            for residue in chain:
                if residue.id[0] == " " or residue.id[0] == "": 
                    seq += Polypeptide.index_to_one(Polypeptide.three_to_index(residue.resname))
            # TODO: multiple chains
            # TODO: ideally in FASTA format: ">Chain A\n{sequence of chain A}\n>Chain B\n{sequence of chain B}\n..."
            # TODO: https://stackoverflow.com/questions/59826385/biopython-is-there-a-one-liner-to-extract-the-amino-acid-sequence-of-a-specific?fbclid=IwZXh0bgNhZW0CMTEAAR28auhwFBLisOFAOxlSHhi2UuS5HrjSsATiLGT0J-kNy-jMZljBh3z7qM8_aem_bi0WlddDuXt2Fs-gqLSFIA
            # seq = seq + ":" + chain.id + " " 
    
    return seq

@celery.task(name='converter_seq_to_str')
def sequence_to_structure(id):

    # get input
    fasta_url = INPUTS_URL + str(id) + "/sequence.fasta"

    response = requests.get(fasta_url)
    sequence = response.text[1:] # first character is '>' TODO: parsing for multiple chains
    print(f"SEQUENCE: {sequence}")

    response = requests.post(ESMFOLD_URL, data=sequence)
    print(response.status_code)
    if response.status_code == 200:
        return response.text
    