from celery import Celery
from flask import Flask, request, jsonify
import requests
import json
import humps

from Bio import SeqIO, PDB
from io import StringIO, BytesIO
from enum import Enum

########################### Flask and Celery setup #############################

app = Flask(__name__)
celery = Celery(
    'tasks',
    broker='amqp://guest:guest@message-broker:5672//',
    backend='rpc://'
)
celery.conf.update({
    "task_routes": {
        "metatask": "metatask",
    }
})

################################## Constants ###################################

class InputMethods(Enum):
    PDB = 0
    CUSTOM_STR = 1
    UNIPROT = 2
    SEQUENCE = 3

class UserInputModels(Enum):
    DEFAULT = "0"
    CONSERVATION_HMM = "1",
    ALPHAFOLD = "2"
    ALPHAFOLD_CONSERVATION_HMM = "3",

PDB_FORM_FIELDS = { "pdbCode", "chains", "useConservation" }
CUSTOM_STR_FORM_FIELDS = { "userFileChains", "userInputModel" }
UNIPROT_FORM_FIELDS = { "uniprotCode", "useConservation" }
SEQUENCE_FORM_FIELDS = { "sequence", "useConservation" }


ID_PROVIDER_URL = "http://id-provider:5000/generate"

PDB_ID_URL = "https://www.ebi.ac.uk/pdbe/api/pdb/entry/molecules/{}"
PDB_FILE_URL = "https://files.rcsb.org/download/{}.pdb"

UNIPROT_ID_URL = "https://rest.uniprot.org/uniprotkb/{}"
UNIPROT_FILE_URL = "https://alphafold.ebi.ac.uk/files/AF-{}-F1-model_v4.pdb"

############################### Helper methods #################################

def _file_exists_at_url(url):
    try:
        response = requests.head(url, allow_redirects=True, timeout=(3,5))
        return response.status_code == 200
    except requests.RequestException as e:
        print(f"Error checking URL: {e}")
        return False
    
def _text_is_fasta_format(text):
    try:
        records = list(SeqIO.parse(StringIO(text), "fasta"))
        return len(records) > 0  # At least one valid record
    except Exception:
        return False
    
def _try_parse_pdb(pdb_file, user_chains):
    
    structure = None
    
    try:
        parser = PDB.PDBParser(PERMISSIVE=False)
        pdb_data = pdb_file.read()  # Get the file's raw byte content
        pdb_fh = BytesIO(pdb_data)  # Convert bytes to a file-like object
        structure = parser.get_structure("Custom structure", pdb_fh)  

        file_chains = set()  # To avoid duplicates
        for model in structure:
            for chain in model:
                file_chains.add(chain.get_id())

        if not user_chains <= file_chains:
            return "Wrong chains selected"
    
    except:
        return "Wrong file format"
    
    return None

def validate_pdb(input_data): 

    for field in PDB_FORM_FIELDS:
        if field not in input_data:
            return f"{field} not found", None
        
    try:
        pdb_id = input_data['pdbCode'] 
        
        url = PDB_ID_URL.format(pdb_id)
        response = requests.get(url, allow_redirects=True, timeout=(3,5))
        if response.status_code != 200:
            return f"Given PDB ID({pdb_id}) not found in database", None
        
        response_data = response.json()[pdb_id][0]
        
        # check chains, empty list means no chain restriction
        selected_chains = set(json.loads(input_data['chains']))
        pdb_chains = set(response_data['in_chains'])
        if not (selected_chains <= pdb_chains):
            return "Wrong chains selected", None

        # check whether pdb file exists
        url = PDB_FILE_URL.format(pdb_id)
        if not _file_exists_at_url(url):
            return "PDB ID found, but corresponding .pdb file not found", None

        # append sequence to the dict
        input_data['sequence'] = response_data['sequence']

    except Exception:
        return "Unknown exception occured", None

    return None, pdb_id

def validate_custom_str(input_data, input_file):

    for field in CUSTOM_STR_FORM_FIELDS:
        if field not in input_data:
            return f"{field} not found", None
        
    if not input_file:
        return "userFile not found", None

    # just check whether input model is fine
    user_input_model = input_data['userInputModel']
    if not any(model.value == user_input_model for model in UserInputModels):
        return "Selected input model not supported", None

    # try to parse pdb and check selected chains
    user_chains = set(json.loads(input_data['userFileChains']))
    err = _try_parse_pdb(input_file, user_chains)
    return err, None

def validate_uniprot(input_data):
    
    for field in SEQUENCE_FORM_FIELDS:
        if field not in input_data:
            return f"{field} not found", None
        
    try:
        uniprot_id = input_data['uniprotCode'] 
        
        url = UNIPROT_ID_URL.format(uniprot_id)
        response = requests.get(url, allow_redirects=True, timeout=(3,5))
        if response.status_code != 200:
            return f"Given Uniprot ID({uniprot_id}) not found in database", None
        
        response_data = response.json()

        # check whether alphafold file exists
        url = UNIPROT_FILE_URL.format(uniprot_id)
        if not _file_exists_at_url(url):
            return "Uniprot ID found, but corresponding .pdb file not", None

        # append sequence to the dict
        input_data['sequence'] = response_data['sequence']['value']

    except Exception:
        return "Unknown exception occured", None

    return None, uniprot_id

def validate_seq(input_data):
    
    for field in SEQUENCE_FORM_FIELDS:
        if field not in input_data:
            return f"{field} is missing", None
        
    # check sequence
    sequence = input_data['sequence']
    if not _text_is_fasta_format(sequence):
        return "Sequence not in FASTA format", None
    
    return None, sequence

def is_input_valid(input_method, input_data, input_file):
    match input_method:
        case InputMethods.PDB.value: return validate_pdb(input_data)
        case InputMethods.CUSTOM_STR.value: return validate_custom_str(input_data, input_file)
        case InputMethods.UNIPROT.value: return validate_uniprot(input_data)
        case InputMethods.SEQUENCE.value: return validate_seq(input_data)
        case _: raise  Exception("Unexpected input method")

############################### "Main" method ##################################

@app.route('/upload-data', methods=['POST'])
def upload_data():

    input_method = request.form.get('inputMethod')
    if input_method is None:
        print("inputMethod field not found in form")
        return jsonify({"error": "inputMethod field not found in form"}), 400
    
    input_data = request.form.to_dict()
    input_file = request.files.get('userFile') # returns None when not found

    print("INPUT TYPE:", input_method) # TODO: replace by log

    err, protein = is_input_valid(input_method, input_data, input_file)
    if err:
        print(err)
        return jsonify({"error": err}), 400

    # convert keys to snake_case
    metatask_payload = { humps.decamelize(k): v for k,v in input_data.items() }

    id_payload = {
        "input_type": input_method,
        "input_protein": protein
    }

    response = requests.post(ID_PROVIDER_URL, json=id_payload)

    if response.status_code != 200:
        return jsonify({"error": "Failed to fetch data from id-provider"}), 500
    
    response_data = response.json()
    metatask_payload["id"] = response_data["id"]
    metatask_payload["id_existed"] = response_data["existed"]

    try:
        # send task
        result = celery.send_task(
            f'metatask_{InputMethods(input_method).name}',
            args=[metatask_payload],
            queue="metatask"
        )

        # TODO: replace by logs
        print(f"Metatask submitted successfully. Task ID: {result.id}")
        print(f"Status: {result.status}")

    except Exception as e:
        # TODO: replace by logs
        print(f"Error submitting task: {e}")
    
    return jsonify(response_data["id"])

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=3000)
