from flask import Flask, request, jsonify
import requests

app = Flask(__name__)

@app.route('/upload-data', methods=['POST'])
def upload_data():
    input_method = request.json.get('input_type')
    input_data = request.json.get('input_string')

    # TODO VALIDATION

    id_provider_url = "http://id-provider:5000/generate"
    payload = {
        "input_type": input_method,
        "input_string": input_data
    }

    response = requests.post(id_provider_url, json=payload)

    if response.status_code == 200:
        return jsonify(response.json())
    else:
        return jsonify({"error": "Failed to fetch data from id-provider"}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=3000)
