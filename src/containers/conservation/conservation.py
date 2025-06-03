import os
import subprocess
import random
import typing
import requests
import shutil
from requests.exceptions import HTTPError
import json
from enum import Enum

from tasks_logger import create_logger
from status_manager import update_status, StatusType

PHMMER_DIR = "./hmmer-3.4/src/"
ESL_DIR = "./hmmer-3.4/easel/miniapps/"
DATABASE = "./uniprot_sprot.fasta" # TODO: DOWNLOAD uniref50.fasta AND USE IT
TEMP = "./tmp_conservation_{id}"
RESULT_FOLDER = "./results/{id}/"
MAX_SEQS = 100
INPUTS_URL = os.getenv('INPUTS_URL')


logger = create_logger('conservation')



def compute_conservation(id):
    logger.info(f'{id} conservation started')
    result_folder = RESULT_FOLDER.format(id=id)
    os.makedirs(result_folder, exist_ok=True)
    logger.info(f'{id} Result folder prepared: {result_folder}')
    status_file_path = os.path.join(result_folder, "status.json")
    update_status(status_file_path, id, StatusType.STARTED, infoMessage="Conservation computation started")

    try:
        json_url = os.path.join(INPUTS_URL, f"{id}/chains.json")
        logger.info(f'{id} Downloading chains file from: {json_url}')
        response = requests.get(json_url, timeout=(10,20))
        response.raise_for_status()
        logger.info(f'{id} Chains file downloaded successfully')
        files_metadata = response.json()

        os.makedirs(id, exist_ok=True)
        logger.info(f'{id} Input folder prepared: {id}')
        
        temp_folder = TEMP.format(id=id)
        os.makedirs(temp_folder, exist_ok=True)
        logger.info(f'{id} Temporary folder prepared: {temp_folder}')

        for file, chains in files_metadata["fasta"].items():
            file_url = os.path.join(INPUTS_URL, f"{id}/{file}")
            logger.info(f'{id} Downloading FASTA file from: {file_url}')
            response = requests.get(file_url, stream=True, timeout=(10,20))
            response.raise_for_status()
            logger.info(f'{id} FASTA file downloaded successfully')

            hom_file_name = file.split('.')[0]
            result_file = os.path.join(result_folder, hom_file_name)
            input_file_path = f"./{id}/{file}"

            with open(input_file_path, "wb") as seq_file:
                for chunk in response.iter_content(chunk_size=8192):
                    seq_file.write(chunk)
            logger.info(f'{id} Downloaded file saved to: {input_file_path}')

            logger.info(f'{id} Computing conservation...')
            compute_conservation_for_chain(input_file_path, result_file, temp_folder)
            logger.info(f'{id} Conservation computed')

            for chain in chains:
                result_file_name = os.path.join(result_folder, f'input{chain}')
                os.symlink(hom_file_name + ".hom", result_file_name + ".hom")
                logger.info(f'{id} Symlink created: {hom_file_name + ".hom"} -> {result_file_name + ".hom"}')
                os.symlink(hom_file_name + ".json", result_file_name + ".json")
                logger.info(f'{id} Symlink created: {hom_file_name + ".json"} -> {result_file_name + ".json"}')

            # cleanup
            os.remove(input_file_path)
            logger.info(f'{id} Input file {input_file_path} removed (it was no longer needed)')

        shutil.rmtree(temp_folder)
        logger.info(f'{id} Temporary folder removed: {temp_folder}')

        update_status(status_file_path, id, StatusType.COMPLETED, infoMessage="Conservation computation completed successfully")

    except HTTPError as e:
        update_status(status_file_path, id, StatusType.FAILED, errorMessage=str(e))
        logger.error(f'{id} HTTP error occurred: {str(e)}')
    except Exception as e:
        update_status(status_file_path, id, StatusType.FAILED, errorMessage=str(e))
        logger.error(f'{id} Error computing conservation: {str(e)}')
 
    logger.info(f'{id} conservation finished')


def _default_execute_command(command: str):
    # We do not check return code here.
    subprocess.run(command, shell=True, env=os.environ.copy())


def compute_conservation_for_chain(
        fasta_file: str,
        result_file: str,
        temp_folder: str,
):
    
    execute_command = _default_execute_command

    unweighted_msa_file = _generate_msa(
        fasta_file, DATABASE, temp_folder, execute_command)

    sample_file = _select_sequences(unweighted_msa_file, MAX_SEQS)
    if sample_file:
        # We have more sequences than we need, so we got file with selected
        # ones, but only names, so we need to prepare the file.
        unweighted_msa_file = _generate_msa_sample(
            unweighted_msa_file, sample_file, execute_command)

    # No matter what we calculate the weights.
    weighted_msa_file = _calculate_sequence_weights(
        unweighted_msa_file, execute_command)

    ic_file, r_file = _calculate_information_content(
        weighted_msa_file, execute_command)
    fasta_file_sequence = _read_fasta_file(fasta_file)
    information_content, freqgap = _read_information_content(ic_file, r_file)

    if information_content:
        assert len(fasta_file_sequence) == \
               len(information_content) == \
               len(freqgap)
        _write_tsv(result_file + ".hom", fasta_file_sequence, information_content)
        _write_json(result_file + ".json", fasta_file_sequence, information_content)
        _write_tsv(result_file + ".freqgap", fasta_file_sequence, freqgap)
    else:  # `information_content` is `None` if no MSA was generated
        filler_values = ["-1000.0" for _ in fasta_file_sequence]
        _write_tsv(result_file+ ".hom", fasta_file_sequence, filler_values)
        _write_json(result_file + ".json", fasta_file_sequence, filler_values)
        _write_tsv(result_file + ".freqgap", fasta_file_sequence, filler_values)

    return weighted_msa_file


def _generate_msa(
        fasta_file: str, database_file: str, working_directory: str,
        execute_command: typing.Callable[[str], None]
):
    unweighted_msa_file = os.path.join(
        working_directory, os.path.basename(fasta_file)) + ".sto"
    cmd = "{}phmmer -o /dev/null -A {} {} {}".format(
        PHMMER_DIR, unweighted_msa_file, fasta_file, database_file)
    execute_command(cmd)
    return unweighted_msa_file


def _select_sequences(unweighted_msa_file: str, max_seqs: int):
    """Return path to file with sequences, may select only some sequences."""
    sequence_names = []
    with open(unweighted_msa_file) as stream:
        for line in stream:
            if line.startswith("#=GS"):
                sequence_names.append(line.split()[1])
    if len(sequence_names) <= max_seqs:
        return None
    selected_sequences_file = unweighted_msa_file + ".ss"
    with open(selected_sequences_file, mode="w") as stream:
        random.seed(420)
        for index in random.sample(sequence_names, k=max_seqs):
            stream.write(index + "\n")
    return selected_sequences_file


def _generate_msa_sample(
        unweighted_msa_file: str, ss_file: str,
        execute_command: typing.Callable[[str], None]
):
    unweighted_msa_sample_file = unweighted_msa_file + ".sample"
    cmd = "{}esl-alimanip -o {} --seq-k {} {}".format(
        ESL_DIR, unweighted_msa_sample_file, ss_file,
        unweighted_msa_file)
    execute_command(cmd)
    return unweighted_msa_sample_file


def _calculate_sequence_weights(
        unweighted_msa_file: str,
        execute_command: typing.Callable[..., None]
) -> str:
    weighted_msa_file = unweighted_msa_file + ".w"
    cmd = f"{ESL_DIR}esl-weight {unweighted_msa_file} > {weighted_msa_file}"
    # This may return 25 return code, and it is actually fine
    execute_command(cmd)
    return weighted_msa_file


def _calculate_information_content(
        weighted_msa_file: str,
        execute_command: typing.Callable[[str], None]
):
    ic_file = weighted_msa_file + ".ic"
    r_file = weighted_msa_file + ".r"
    cmd = "{}esl-alistat --icinfo {} --rinfo {} --weight {}".format(
        ESL_DIR, ic_file, r_file, weighted_msa_file)
    execute_command(cmd)
    return ic_file, r_file


def _read_fasta_file(fasta_file: str):
    fasta_file_sequence = ""
    with open(fasta_file) as stream:
        _ = next(stream).rstrip() # skip header
        for line in stream:
            fasta_file_sequence += line.rstrip()
    return fasta_file_sequence


def _read_information_content(ic_file: str, r_file: str):
    try:
        with open(ic_file) as stream:
            information_content = [
                line.strip().split()[3]
                for line in stream
                if _should_read_line(line)
            ]
        with open(r_file) as stream:
            freqgap = [
                line.strip().split()[5]
                for line in stream
                if _should_read_line(line)
            ]
        return information_content, freqgap
    except FileNotFoundError:
        return None, None


def _should_read_line(line: str) -> bool:
    return line[0] != "#" and line[0] != "/" and line.lstrip()[0] != "-"


def _write_tsv(target_file: str, fasta_file_sequence: str, feature):
    with open(target_file, mode="w", newline="") as stream:
        for (i, j), value in zip(enumerate(fasta_file_sequence), feature):
            stream.write("\t".join((str(i), value, j)) + "\n")


def _write_json(target_file: str, fasta_file_sequence: str, feature):
    with open(target_file, mode="w", newline="") as stream:
        result = []
        for (i, j), value in zip(enumerate(fasta_file_sequence), feature):
            result.append({
                "index": i,
                "value": float(value)
            })
        json.dump(result, stream, indent=4)

