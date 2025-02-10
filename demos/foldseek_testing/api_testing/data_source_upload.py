import requests

url = "http://localhost:8000/upload"

file_path = "../../4k11.pdb"

with open(file_path, "rb") as file:
    files = {"file": file}  # The key must match the `multer` field name
    response = requests.post(url, files=files)

print("Status Code:", response.status_code)
print("Response JSON:", response.json())
