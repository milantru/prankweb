from enum import Enum
from flask import Flask, request, jsonify
import redis

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

    input_method = int(request.json.get('input_method'))
    input_protein = request.json.get('input_protein')
    print(input_method)
    print(input_protein)

    if input_method is None or (input_protein is None and input_method != InputMethods.CUSTOM_STR.value):
        return jsonify({"error": "input type or input string is missing"}), 400

    if input_method == InputMethods.CUSTOM_STR.value:
        key = "custom" + str(redis_client.get('id_counter').decode('utf-8'))
    else:
        key = str(input_method) + ':' + input_protein
        
    existing_id = check(key)

    if existing_id:
        print(f"Already existed: {key}")
        return jsonify({"id": existing_id.decode('utf-8'), "stored_value": key, "existed" : True}) 


    generated_id = f'{InputMethods(input_method).name.lower()}_'

    if input_method == InputMethods.PDB.value or input_method == InputMethods.UNIPROT.value:
        generated_id += input_protein
    
    else:
        # Increment the ID in Redis. The key is 'id_counter'.
        # If 'id_counter' doesn't exist, Redis initializes it to 0.
        new_id = redis_client.incr('id_counter')

        # Convert the ID to hexadecimal (without the '0x' prefix)
        new_id = hex(new_id)[2:]

        if input_method != InputMethods.CUSTOM_STR.value:
            redis_client.set(key, new_id)

        generated_id += new_id

    print(f"Generated ID: {generated_id} for {key}")
    return jsonify({"id": generated_id, "stored_value": key, "existed" : False})

# @app('/get', methods=['POST'])
# def get():
#     return check()


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)