import requests
import time

url_upload = "http://localhost:8000/upload"
url_search = "http://localhost:8000/search"
pdb_id = "4k11"
file_path = "../../4k11.pdb"


try:
    with open(file_path, "rb") as file:
        files = {"file": file}
        response = requests.post(url_upload, files=files)
        response.raise_for_status()
        print("Upload Status Code:", response.status_code)
        print("Upload Response JSON:", response.json())

    while True:
        params = {"pdbid": pdb_id}
        response = requests.get(url_search, params=params)
        response.raise_for_status()
        response_json = response.json()
        print("Search Status Code:", response.status_code)
        print("Search Response JSON:", response_json)

        if response.status_code != 202:
            break  # Exit the loop if the status is not 202

        time.sleep(1)

except requests.exceptions.RequestException as e:
    print(f"An error occurred: {e}")
except KeyError as e:
    print(f"Unexpected response format: Missing key {e}")
except Exception as e:
    print(f"An unexpected error occurred: {e}")