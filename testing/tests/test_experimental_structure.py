import requests

BASE_URL = 'http://localhost:80'
INPUT_METHOD = '0'

def test_health_check():
    response = requests.get(f"{BASE_URL}/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_users_endpoint():
    response = requests.get(f"{BASE_URL}/api/users")
    assert response.status_code == 200
    assert isinstance(response.json(), list)