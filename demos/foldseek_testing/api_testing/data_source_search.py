import requests

url = "http://localhost:8000/search"

params = {"pdbid": "4k11"}

response = requests.get(url, params=params)

print("Status Code:", response.status_code)
print("Response JSON:", response.json())
