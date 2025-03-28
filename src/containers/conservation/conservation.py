import os
import subprocess
import random
import typing
import requests
import tempfile

PHMMER_DIR = "./hmmer-3.4/src/"
ESL_DIR = "./hmmer-3.4/easel/miniapps/"
DATABASE = "./uniprot_sprot.fasta" # TODO: DOWNLOAD uniref50.fasta AND USE IT
TEMP = "./tmp_conservation_{id}"
RESULT_FOLDER = "./results/{id}/"
MAX_SEQS = 100
INPUTS_URL = "http://apache:80/inputs/"


def compute_conservation(id):
    
    json_url = INPUTS_URL + f"{id}/chains.json"
    response = requests.get(json_url)
    files_metadata = response.json()

    for file, chains in files_metadata.items():  # TODO: Fetch files
        
        file_url = INPUTS_URL + f"{id}/{file}.fasta"
        response = requests.get(file_url, stream=True)
        response.raise_for_status()

        result_folder = RESULT_FOLDER.format(id=id)

        os.makedirs(result_folder, exist_ok=True)
        result_file = os.path.join(result_folder, file)

        os.makedirs(id, exist_ok=True)

        input_file_path = f"./{id}/{file}.fasta"
        
        with open(input_file_path, "wb") as seq_file:
            for chunk in response.iter_content(chunk_size=8192):
                seq_file.write(chunk)

        temp_folder = TEMP.format(id=id)

        os.makedirs(temp_folder, exist_ok=True)

        compute_conservation_for_chain(input_file_path, result_file, temp_folder)

        for chain in chains:
            os.symlink(file, f"{result_folder}/input{chain}.hom")


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
        _write_tsv(result_file, fasta_file_sequence, information_content)
        _write_tsv(result_file + ".freqgap", fasta_file_sequence, freqgap)
    else:  # `information_content` is `None` if no MSA was generated
        filler_values = ["-1000.0" for _ in fasta_file_sequence]
        _write_tsv(result_file, fasta_file_sequence, filler_values)
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


