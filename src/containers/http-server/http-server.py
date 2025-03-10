from celery import Celery
from flask import Flask, request, jsonify
import requests

from Bio import SeqIO, PDB
from io import StringIO, BytesIO

app = Flask(__name__)
celery = Celery('tasks', broker='amqp://guest:guest@message-broker:5672//', backend='rpc://')
celery.conf.update({
    "task_routes": {
        "metatask": "metatask",
    }
})

def file_exists_at_url(url):
    try:
        response = requests.head(url, allow_redirects=True, timeout=(3,5))
        return response.status_code == 200
    except requests.RequestException as e:
        print(f"Error checking URL: {e}")
        return False
    
def text_is_fasta_format(text):
    try:
        records = list(SeqIO.parse(StringIO(text), "fasta"))
        return len(records) > 0  # At least one valid record
    except Exception:
        return False
    
def try_parse_pdb(pdb_file):
    try:
        parser = PDB.PDBParser(PERMISSIVE=False)
        pdb_data = pdb_file.read()  # Get the file's raw byte content
        pdb_fh = BytesIO(pdb_data)  # Convert bytes to a file-like object
        structure = parser.get_structure("Custom structure", pdb_fh)  
        return True
    
    except:
        return False
    

def is_input_valid(input_method, input_data):
    match input_method:
        case 0: return file_exists_at_url(f"https://files.rcsb.org/download/{input_data}.pdb")
        case 1: return try_parse_pdb(input_data)
        case 2: return file_exists_at_url(f"https://alphafold.ebi.ac.uk/files/AF-{input_data}-F1-model_v4.pdb")
        case 3: return text_is_fasta_format(input_data)
        case _: raise  Exception("Unexpected input method")
    

@app.route('/upload-data', methods=['POST'])
def upload_data():
    input_method = request.json.get('input_type')
    input_data = request.json.get('input_string')

    if not is_input_valid(input_method, input_data):
        return jsonify({"error" : "Invalid input"})

    id_provider_url = "http://id-provider:5000/generate"
    payload = {
        "input_type": input_method,
        "input_string": input_data
    }

    response = requests.post(id_provider_url, json=payload)

    if response.status_code == 200:
        try:
            response_data = response.json()
            result = celery.send_task('metatask', args=[input_method, input_data, response_data["id"], response_data["existed"]], queue="metatask")
            print(f"Metatask submitted successfully. Task ID: {result.id}")
            print(f"Status: {result.status}")

        except Exception as e:
            print(f"Error submitting task: {e}")
        
        return jsonify(response.json())
    else:
        return jsonify({"error": "Failed to fetch data from id-provider"}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=3000)
