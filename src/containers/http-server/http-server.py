#!/usr/bin/env python3

import json
import os
import tempfile
from dataclasses import dataclass
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
FilePath: TypeAlias = str

@dataclass
class ValidationResult:
    err_msg: ErrorStr | None = None
    protein_id: ProteinID | None = None
    tmp_file: FilePath | None = None

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

TMP_FOLDER = 'tmp/'

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


logger = create_logger('http-server')

############################## Private functions ###############################

def _check_form_fields(input_data: dict, form_fields: list) -> ErrorStr | None:
    for field in form_fields:
        if field not in input_data:
            return f'{field} not found'
        
    return None


# def _file_exists_at_url(url: str) -> bool:
#     try:
#         response = requests.head(url, timeout=(15,30))
#         return response.status_code == 200
#     except requests.RequestException as e:
#         logger.error(f'Error checking URL: {e}')
#         return False


def _download_file_from_url(url: str, filename: str) -> bool:
    logger.info(f'Downloading file from: {url}')
    try:
        response = requests.get(url, timeout=(15,30))
        response.raise_for_status()
    except requests.RequestException as e:
        logger.error(f'File download failed {str(e)}')
        return False
    
    logger.info(f'File downloaded successfully')
    with open(filename, 'w') as file:
        file.write(response.text)
    logger.info(f'File saved to: {filename}')
    return True


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
            return 'Wrong chains selected for parsing user file'
    
    except Exception:
        return 'Wrong user file format'
    
    return None


def _validate_pdb(input_data: dict) -> ValidationResult: 

    err = _check_form_fields(input_data, PDB_FORM_FIELDS)    
    if err:
        return ValidationResult(err_msg=err)
        
    pdb_id = input_data['pdbCode'].lower()
    
    try:
        url = PDB_ID_URL.format(pdb_id)
        logger.info(f'Downloading protein metadata from: {url}')
        response = requests.get(url, timeout=(15,30))
        response.raise_for_status()
        response_data = response.json()[pdb_id][0]
        logger.info('Protein metadata downloaded successfully')

        # check chains, empty string means no chain restriction
        chains_str = input_data['chains']
        selected_chains = set((chains_str.split(',') if chains_str else []))
        pdb_chains = set(response_data['in_chains'])
        if not (selected_chains <= pdb_chains):
            return ValidationResult(err_msg='Wrong chains selected')

        # try to download download pdb file
        url = PDB_FILE_URL.format(pdb_id)

        with tempfile.NamedTemporaryFile(
            mode='w',
            dir=TMP_FOLDER,
            prefix=f'{pdb_id}_',
            suffix='.pdb',
            delete=False
        ) as f:
            tmp_file = os.path.relpath(f.name, os.getcwd())

        if not _download_file_from_url(url, tmp_file):
            return ValidationResult(
                err_msg='PDB ID found, but cannot find or download corresponding .pdb file'
            )
        
        # input model setup for p2rank
        input_data['inputModel'] = 'default'

        return ValidationResult(protein_id=pdb_id, tmp_file=tmp_file)
    
    except requests.RequestException as e:
        return ValidationResult(err_msg=f'PDB ID {pdb_id} not found in database due to an error: {str(e)}')
    except Exception as e:
        return ValidationResult(err_msg=f'Unknown exception occured: {str(e)}')


def _validate_custom_str(input_data: dict, input_file: FileStorage | None) -> ValidationResult:

    err = _check_form_fields(input_data, CUSTOM_STR_FORM_FIELDS)    
    if err:
        ValidationResult(err_msg=err)
        
    if not input_file:
        return ValidationResult(err_msg='userFile not found')

    # just check whether input model is fine
    model = input_data['userInputModel']
    if not any(model == m.value for m in InputModels):
        return ValidationResult(err_msg=f'Selected input model ({model}) not supported')
    
    del input_data['userInputModel']
    
    # extract input model and conservation
    input_data['useConservation'] = (
        'true' if 'CONSERVATION' in InputModels(model).name else 'false'
    )

    # save file to tmp folder
    with tempfile.NamedTemporaryFile(
        mode='wb',
        dir=TMP_FOLDER,
        prefix='str_',
        suffix='.pdb',
        delete=False
    ) as f:
        tmp_file = os.path.relpath(f.name, os.getcwd())
        input_file.save(f)

    # try to parse pdb and check selected chains
    chains_str = input_data['chains']
    selected_chains = set((chains_str.split(',') if chains_str else []))
    err = _try_parse_pdb(tmp_file, selected_chains)

    # input model setup for p2rank
    input_data['inputModel'] = InputModels(model).name.split('_')[0].lower()     # result is default / alphafold
    
    return ValidationResult(err_msg=err, tmp_file=tmp_file)


def _validate_uniprot(input_data: dict) -> ValidationResult:
    
    err = _check_form_fields(input_data, UNIPROT_FORM_FIELDS)    
    if err:
        return ValidationResult(err_msg=err)
        
    uniprot_id = input_data['uniprotCode']
    
    try:
        # check whether given Uniprot ID exists
        url = UNIPROT_ID_URL.format(uniprot_id)
        logger.info(f'Downloading protein metadata from: {url}')
        response = requests.get(url, timeout=(15,30))
        response.raise_for_status()
        logger.info('Protein metadata downloaded successfully')
        
        # download pdb file from alphafold database
        url = UNIPROT_FILE_URL.format(uniprot_id)
        
        with tempfile.NamedTemporaryFile(
            mode='w',
            dir=TMP_FOLDER,
            prefix=f'{uniprot_id}_',
            suffix='.pdb',
            delete=False
        ) as f:
            tmp_file = os.path.relpath(f.name, os.getcwd())

        if not _download_file_from_url(url, tmp_file):
            return ValidationResult(
                err_msg='Uniprot ID found, but cannot find or download corresponding .pdb file'
            )

        # input model setup for p2rank
        input_data['inputModel'] = 'alphafold'

        return ValidationResult(protein_id=uniprot_id, tmp_file=tmp_file)

    except requests.RequestException as e:
        return ValidationResult(err_msg=f'Uniprot ID {uniprot_id} not found in database due to an error: {str(e)}')
    except Exception as e:
        return ValidationResult(err_msg=f'Unknown exception occured: {str(e)}')


def _validate_seq(input_data: dict) -> ValidationResult: 
    
    err = _check_form_fields(input_data, SEQUENCE_FORM_FIELDS)    
    if err:
        return ValidationResult(err_msg=err)
        
    # check sequence
    sequence = input_data['sequence']
    
    if not 1 <= len(sequence) <= 400:
        return ValidationResult(
            err_msg=f'Invalid sequence length: {len(sequence)}, should be in interval [1, 400]'
        )

    if not sequence.startswith('>'): sequence = '>PLANKWEB_SEQ\n' + sequence
    if not _text_is_fasta_format(sequence):
        return ValidationResult(err_msg='Sequence not in FASTA format')
    del input_data['sequence']
    
    # save sequence to tmp folder
    with tempfile.NamedTemporaryFile(
        mode='w',
        dir=TMP_FOLDER,
        prefix='seq_',
        suffix='.fasta',
        delete=False
    ) as f:
        tmp_file = os.path.relpath(f.name, os.getcwd())
        f.write(sequence)

    # input model setup for p2rank
    input_data['inputModel'] = 'alphafold'
    
    return ValidationResult(protein_id=sequence, tmp_file=tmp_file)


def _is_input_valid(input_method: str, input_data: dict, input_file: FileStorage | None) -> ValidationResult:
    match input_method:
        case InputMethods.PDB.value: return _validate_pdb(input_data)
        case InputMethods.CUSTOM_STR.value: return _validate_custom_str(input_data, input_file)
        case InputMethods.UNIPROT.value: return _validate_uniprot(input_data)
        case InputMethods.SEQUENCE.value: return _validate_seq(input_data)
        case _: return ValidationResult(err_msg='Unexpected input method')

############################## Public functions ################################

@app.route('/upload-data', methods=['POST'])
def upload_data() -> Response:
    logger.info(f'upload-data POST request received')

    input_method = request.form.get('inputMethod')
    if input_method is None:
        logger.info('inputMethod field not found in a form')
        return jsonify({'error': 'inputMethod field not found in a form'}), 400
    
    input_data = request.form.to_dict()
    logger.info(f'Input data:\n{json.dumps(input_data, indent=2)}')

    input_file = request.files.get('userFile') # returns None when not found
    logger.info(f'userFile exists: {True if input_file else False}')

    logger.info('Starting user input validation...')
    validation_result = _is_input_valid(input_method, input_data, input_file)

    if validation_result.err_msg:
        logger.info(validation_result.err_msg)
        return jsonify({'error': validation_result.err_msg}), 400
    
    logger.info('User input validation passed')

    # convert useConservation to Python friendly format
    use_conservation = input_data['useConservation'].lower() == 'true'
    input_data['useConservation'] = use_conservation

    id_payload = {
        'input_method': input_method,
        'input_protein': validation_result.protein_id
    }

    logger.info(f'Sending POST request to id-provider: {ID_PROVIDER_URL}, payload:\n {json.dumps(id_payload, indent=2)}')
    try:
        response = requests.post(ID_PROVIDER_URL, json=id_payload, timeout=(10,20))
        response.raise_for_status()
    except:
        # should not happen
        logger.error('Failed to get ID from id-provider')
        return jsonify({'error': 'Failed to get ID from id-provider'}), 500
    
    response_data = response.json()

    logger.info(f'id-provider responded positively, response:\n{json.dumps(response_data, indent=2)}')

    # change input method to 'STR' or 'SEQ'
    new_input_method = (
        'SEQ' if input_method == InputMethods.SEQUENCE.value else 'STR'
    )
    
    input_data['inputMethod'] = new_input_method
    logger.info(f'inputMethod changed from {input_method} to {new_input_method}')

    # tmp_folder is mounted to volume tmp which is shared with apache
    input_data['inputUrl'] = os.path.join(APACHE_URL, validation_result.tmp_file)

    # convert keys to snake_case
    logger.info('Preparing metatask payload...')
    metatask_payload = { decamelize(k):v for k,v in input_data.items() }
    metatask_payload['id'] = response_data['id']
    metatask_payload['id_existed'] = response_data['existed']
    logger.info(f'Metatask payload prepared:\n{json.dumps(metatask_payload, indent=2)}')

    metatask_task_name = f'metatask_{metatask_payload["input_method"]}'
    logger.info(f'Sending {metatask_task_name}')
    celery.send_task(
        metatask_task_name,
        args=[metatask_payload]
    )

    # Delete validation_result.tmp_file file after 15 minutes
    delete_cmd = f'sleep 900 && rm -f {validation_result.tmp_file}'
    logger.info(f'Starting a process which deletes tmp file after 15 minutes: {delete_cmd}')
    Popen(delete_cmd, shell=True)
    
    logger.info(f'http-server finished, returning ID: {response_data["id"]}')

    return jsonify(response_data['id'])


if __name__ == '__main__':
    os.makedirs(TMP_FOLDER, exist_ok=True)
    logger.info(f'Temporary folder prepared: {TMP_FOLDER}')
    app.run(host='0.0.0.0', port=3000)
