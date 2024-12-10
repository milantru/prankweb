import requests

uniprot_id = "P12931"
uniprot_url = f"https://www.uniprot.org/uniprot/{uniprot_id}.xml"

response = requests.get(uniprot_url)
if response.status_code == 200:
    from xml.etree import ElementTree as ET

    root = ET.fromstring(response.content)
    # Find PDB cross-references in the XML
    pdb_ids = [
        ref.attrib['id'] for ref in root.findall(".//{http://uniprot.org/uniprot}dbReference")
        if ref.attrib['type'] == "PDB"
    ]
    print(f"Found PDB IDs: {pdb_ids}")

    for pdb_id in pdb_ids:
        pdb_url = f"https://files.rcsb.org/download/{pdb_id}.pdb"
        pdb_response = requests.get(pdb_url)
        if pdb_response.status_code == 200:
            with open(f"{pdb_id}.pdb", "w") as f:
                f.write(pdb_response.text)
            print(f"Downloaded {pdb_id}.pdb")
        else:
            print(f"Failed to download PDB file for {pdb_id}")
else:
    print("Failed to retrieve data from UniProt.")
