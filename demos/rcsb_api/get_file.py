import requests

def extract_pdb_id(file_name):
    return file_name[:4]

def download_pdb_file(pdb_id, output_file):
    url = f"https://files.rcsb.org/download/{pdb_id}.pdb"
    response = requests.get(url)
    if response.status_code == 200:
        with open(output_file, 'w') as file:
            file.write(response.text)
        print(f"File downloaded as text: {output_file}")
    else:
        print(f"Download failed. HTTP status: {response.status_code}")

foldseek_name = "4k11-assembly1.cif.gz_A"
pdb_id = extract_pdb_id(foldseek_name)
output_file = f"{pdb_id}.pdb"
download_pdb_file(pdb_id, output_file)
