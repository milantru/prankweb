from enum import Enum
from flask import Flask, request, jsonify
import redis
from time import time

app = Flask(__name__)

class InputMethods(Enum):
    PDB = '0'
    CUSTOM_STR = '1'
    UNIPROT = '2'
    SEQUENCE = '3'

# Connect to Redis
redis_client = redis.StrictRedis(host='id-database', port=6379, db=0)

def check(key):
    return redis_client.get(key)


@app.route('/generate', methods=['POST'])
def get_or_generate():

    input_method = request.json.get('input_method')
    input_protein = request.json.get('input_protein')
    print(input_method)
    print(input_protein)

    if input_method is None or (input_protein is None and input_method != InputMethods.CUSTOM_STR.value):
        return jsonify({"error": "input type or input string is missing"}), 400

    key = (
        f'{input_method}:{input_protein}'
        if input_method != InputMethods.CUSTOM_STR.value
        else f'{input_method}:{str(time()[-6])}'
    )
        
    existing_id = check(key)

    if existing_id:
        print(f"Already existed: {key}")
        return jsonify({"id": existing_id.decode('utf-8'), "stored_value": key, "existed" : True}) 

    generated_id = (
        f'{InputMethods(input_method).name.lower()}_{input_protein}'
        if input_method in (InputMethods.PDB.value, InputMethods.UNIPROT.value)
        else f'{InputMethods(input_method).name.lower()}_{hex(redis_client.incr("id_counter"))[2:]}'
    )

    if input_method != InputMethods.CUSTOM_STR.value:
        redis_client.set(key, generated_id)

    print(f"Generated ID: {generated_id} for {key}")
    return jsonify({"id": generated_id, "stored_value": key, "existed" : False})


@app.route('/get_id', methods=['GET'])
def get_id():
    input_method = request.args.get('input_method')
    input_protein = request.args.get('protein')

    if input_method not in (
        InputMethods.PDB.name, InputMethods.PDB.name.lower(),
        InputMethods.UNIPROT.name, InputMethods.UNIPROT.name.lower(),
        InputMethods.SEQUENCE.name, InputMethods.SEQUENCE.name.lower()
    ):
        return jsonify({'error': f'Input method {input_method} not supported'}), 400
    
    if not input_protein:
        return jsonify({'error': 'Input protein not specified'}), 400
    
    id = check(f'{InputMethods[input_method.upper()].value}:{input_protein}')
    
    return jsonify({'id': id.decode() if id else None})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)