import os
import time
from enum import Enum
from io import StringIO
from subprocess import Popen
from typing import TypeAlias

import requests
from Bio import SeqIO, PDB
from celery import Celery
from flask import Flask, request, jsonify, Response
from humps import decamelize
from werkzeug.datastructures import FileStorage

from tasks_logger import create_logger

########################### Flask and Celery setup #############################

app = Flask(__name__)
celery = Celery(
    os.getenv('CELERY_NAME'),
    broker=os.getenv('CELERY_BROKER_URL')
)
celery.conf.update({
    'task_routes': {
        'metatask_SEQ': 'metatask',
        'metatask_STR': 'metatask'
    }
})

logger = create_logger('http-server')

################################## Constants ###################################

ErrorStr: TypeAlias = str
ProteinID: TypeAlias = str
ValidationResult: TypeAlias = tuple[ErrorStr | None, ProteinID | None]

class InputMethods(Enum):
    PDB = '0'
    CUSTOM_STR = '1'
    UNIPROT = '2'
    SEQUENCE = '3'

class InputModels(Enum):
    DEFAULT = '0'
    DEFAULT_CONSERVATION_HMM = '1'
    ALPHAFOLD = '2'
    ALPHAFOLD_CONSERVATION_HMM = '3'

PDB_FORM_FIELDS = [ 'pdbCode', 'chains', 'useConservation' ]
CUSTOM_STR_FORM_FIELDS = [ 'chains', 'userInputModel' ]
UNIPROT_FORM_FIELDS = [ 'uniprotCode', 'useConservation' ]
SEQUENCE_FORM_FIELDS = [ 'sequence', 'useConservation' ]  


ID_PROVIDER_URL = os.getenv('ID_PROVIDER_URL')
APACHE_URL = os.getenv('APACHE_URL')

PDB_ID_URL = 'https://www.ebi.ac.uk/pdbe/api/pdb/entry/molecules/{}'
PDB_FILE_URL = 'https://files.rcsb.org/download/{}.pdb'

UNIPROT_ID_URL = 'https://rest.uniprot.org/uniprotkb/{}'
UNIPROT_FILE_URL = 'https://alphafold.ebi.ac.uk/files/AF-{}-F1-model_v4.pdb'

############################## Private functions ###############################

def _check_form_fields(input_data: dict, form_fields: list) -> ErrorStr | None:
    for field in form_fields:
        if field not in input_data:
            return f'{field} not found'
        
    return None


def _file_exists_at_url(url: str) -> bool:
    try:
        response = requests.head(url, allow_redirects=True, timeout=(3,5))
        return response.status_code == 200
    except requests.RequestException as e:
        print(f'Error checking URL: {e}')
        return False


def _text_is_fasta_format(text: str) -> bool:
    try:
        records = list(SeqIO.parse(StringIO(text), 'fasta'))
        return len(records) > 0  # At least one valid record
    except Exception:
        return False


def _try_parse_pdb(pdb_file: str, user_chains: list) -> ErrorStr | None:
    
    structure = None
    
    try:
        parser = PDB.PDBParser(PERMISSIVE=False)
        structure = parser.get_structure('Custom structure', pdb_file)  

        file_chains = set()  # To avoid duplicates
        for model in structure:
            for chain in model:
                file_chains.add(chain.get_id())

        if not (user_chains <= file_chains):
            return 'Wrong chains selected'
    
    except Exception as e:
        return 'Wrong file format'
    
    return None


def _validate_pdb(input_data: dict) -> ValidationResult: 

    err = _check_form_fields(input_data, PDB_FORM_FIELDS)    
    if err:
        return err, None
        
    try:
        pdb_id = input_data['pdbCode'].lower()
        
        url = PDB_ID_URL.format(pdb_id)
        response = requests.get(url, allow_redirects=True, timeout=(3,5))
        if response.status_code != 200:
            return f'PDB ID {pdb_id} not found in database', None

        response_data = response.json()[pdb_id][0]

        # check chains, empty string means no chain restriction
        chains_str = input_data['chains']
        selected_chains = set((chains_str.split(',') if chains_str else []))
        pdb_chains = set(response_data['in_chains'])
        if not (selected_chains <= pdb_chains):
            return 'Wrong chains selected', None

        # check whether pdb file exists
        url = PDB_FILE_URL.format(pdb_id)
        if not _file_exists_at_url(url):
            return 'PDB ID found, but corresponding .pdb file not found', None

        # append sequence to the dict
        input_data['inputUrl'] = url
        
        # input model setup for p2rank
        input_data['inputModel'] = 'default'

    except Exception as e:
        print(e)
        return 'Unknown exception occured', None

    return None, pdb_id


def _validate_custom_str(input_data: dict, input_file: FileStorage | None) -> ValidationResult:

    err = _check_form_fields(input_data, CUSTOM_STR_FORM_FIELDS)    
    if err:
        return err, None
        
    if not input_file:
        return 'userFile not found', None

    # just check whether input model is fine
    model = input_data['userInputModel']
    if not any(model == m.value for m in InputModels):
        return 'Selected input model not supported', None
    
    del input_data['userInputModel']
    
    # extract input model and conservation
    input_data['useConservation'] = (
        'true' if 'CONSERVATION' in InputModels(model).name else 'false'
    )

    # save file to tmp folder
    tmp_file = f'/tmp/{str(time.time())[-5:]}_{input_file.filename}'
    input_file.save(tmp_file)

    # try to parse pdb and check selected chains
    chains_str = input_data['chains']
    selected_chains = set((chains_str.split(',') if chains_str else []))
    err = _try_parse_pdb(tmp_file, selected_chains)
    
    # tmp_folder is mounted to volume tmp which is shared with apache
    input_data['inputUrl'] = os.path.join(APACHE_URL, tmp_file[1:]) # without /

    # input model setup for p2rank
    input_data['inputModel'] = InputModels(model).name.split('_')[0].lower()     # result is default / alphafold

    # Delete tmp file after 15 minutes
    Popen(f'sleep 900 && rm -f {tmp_file}', shell=True)
    
    return err, None


def _validate_uniprot(input_data: dict) -> ValidationResult:
    
    err = _check_form_fields(input_data, UNIPROT_FORM_FIELDS)    
    if err:
        return err, None
        
    try:
        uniprot_id = input_data['uniprotCode']
        
        url = UNIPROT_ID_URL.format(uniprot_id)
        response = requests.get(url, allow_redirects=True, timeout=(3,5))
        if response.status_code != 200:
            return f'Given Uniprot ID({uniprot_id}) not found in database', None
        
        # check whether alphafold file exists
        url = UNIPROT_FILE_URL.format(uniprot_id)
        if not _file_exists_at_url(url):
            return 'Uniprot ID found, but corresponding .pdb file not', None

        # append sequence to the dict
        input_data['inputUrl'] = url

        # input model setup for p2rank
        input_data['inputModel'] = 'alphafold'

    except Exception:
        return 'Unknown exception occured', None

    return None, uniprot_id


def _validate_seq(input_data: dict) -> ValidationResult:
    
    err = _check_form_fields(input_data, SEQUENCE_FORM_FIELDS)    
    if err:
        return err, None
        
    # check sequence
    sequence = input_data['sequence']

    if len(sequence) > 400:
        return 'Too long sequence (more than 400 characters)', None
    
    # if len(sequence) < 16:
    #     return 'Too short sequence (less than 16 characters)', None 

    if not sequence.startswith('>'): sequence = '>PLANKWEB_SEQ\n' + sequence
    if not _text_is_fasta_format(sequence):
        return 'Sequence not in FASTA format', None
    del input_data['sequence']
    
    # save sequence to tmp folder
    tmp_file = f'/tmp/{str(time.time())[-5:]}_seq'
    with open(tmp_file, 'w') as f: f.write(sequence)

    # tmp_folder is mounted to volume tmp which is shared with apache
    input_data['inputUrl'] = os.path.join(APACHE_URL, tmp_file[1:]) # without /

    # input model setup for p2rank
    input_data['inputModel'] = 'alphafold'

    # Delete tmp file after 15 minutes
    Popen(f'sleep 900 && rm -f {tmp_file}', shell=True)
    
    return None, sequence


def _is_input_valid(input_method: str, input_data: dict, input_file: FileStorage | None) -> ValidationResult:
    match input_method:
        case InputMethods.PDB.value: return _validate_pdb(input_data)
        case InputMethods.CUSTOM_STR.value: return _validate_custom_str(input_data, input_file)
        case InputMethods.UNIPROT.value: return _validate_uniprot(input_data)
        case InputMethods.SEQUENCE.value: return _validate_seq(input_data)
        case _: raise  Exception('Unexpected input method')

############################## Public functions ################################

@app.route('/upload-data', methods=['POST'])
def upload_data() -> Response:

    input_method = request.form.get('inputMethod')
    if input_method is None:
        print('inputMethod field not found in form')
        return jsonify({'error': 'inputMethod field not found in form'}), 400
    
    input_data = request.form.to_dict()
    input_file = request.files.get('userFile') # returns None when not found

    print('INPUT TYPE:', input_method) # TODO: replace by log

    err, protein = _is_input_valid(input_method, input_data, input_file)
    if err:
        print(err)
        return jsonify({'error': err}), 400

    # convert useConservation to Python friendly format
    use_conservation = input_data['useConservation'].lower() == 'true'
    input_data['useConservation'] = use_conservation

    id_payload = {
        'input_method': input_method,
        'input_protein': protein
    }

    print('ID PROVIDER REQUEST')
    response = requests.post(ID_PROVIDER_URL, json=id_payload)

    if response.status_code != 200:
        return jsonify({'error': 'Failed to fetch data from id-provider'}), 500
    
    print('ID PROVIDER RESPONDED POSITIVELY')

    # change input method to 'STR' or 'SEQ'
    input_data['inputMethod'] = (
        'SEQ' if input_method == InputMethods.SEQUENCE.value else 'STR'
    )

    response_data = response.json()

    # convert keys to snake_case
    metatask_payload = { decamelize(k):v for k,v in input_data.items() }
    metatask_payload['id'] = response_data['id']
    metatask_payload['id_existed'] = response_data['existed']

    celery.send_task(
        f'metatask_{metatask_payload["input_method"]}',
        args=[metatask_payload]
    )
    
    return jsonify(response_data['id'])


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000)
