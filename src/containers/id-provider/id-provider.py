import os
from enum import Enum
from flask import Flask, request, jsonify
import redis
from time import time

from tasks_logger import create_logger

############################ Flask and redis setup #############################

app = Flask(__name__)

# Connect to Redis
redis_client = redis.StrictRedis(
    host='id-database',
    port=6379,
    password=os.getenv('REDIS_PASS'),
    db=0
)

################################## Constants ###################################

class InputMethods(Enum):
    PDB = '0'
    CUSTOM_STR = '1'
    UNIPROT = '2'
    SEQUENCE = '3'

logger = create_logger('id-provider')

############################## Private functions ###############################

def _check(key):
    return redis_client.get(key)

############################### Public functions ###############################

@app.route('/generate', methods=['POST'])
def get_or_generate():

    input_method = request.json.get('input_method')
    input_protein = request.json.get('input_protein')
    logger.info(f'generate HTTP POST received: input_method -> {input_method}, input_protein -> {input_protein}')

    if input_method is None or (input_protein is None and input_method != InputMethods.CUSTOM_STR.value):
        logger.info('Wrong input from user, returning 400 as status code with an error message')
        return jsonify({"error": "input type or input string is missing"}), 400

    key = (
        f'{input_method}:{input_protein}'
        if input_method != InputMethods.CUSTOM_STR.value
        else f'{input_method}:{str(time())[-6]}'
    )
    logger.info(f'Key created: {key}')
        
    existing_id = _check(key)

    if existing_id:
        logger.info(f'{key} Key already existed, returning ID: {existing_id}, status code 200')
        return jsonify({"id": existing_id.decode('utf-8'), "stored_value": key, "existed" : True}) 

    generated_id = (
        f'{InputMethods(input_method).name.lower()}_{input_protein}'
        if input_method in (InputMethods.PDB.value, InputMethods.UNIPROT.value)
        else f'{InputMethods(input_method).name.lower()}_{hex(redis_client.incr("id_counter"))[2:]}'
    )
    logger.info(f'{key} New ID generated: {generated_id}')

    if input_method != InputMethods.CUSTOM_STR.value:
        redis_client.set(key, generated_id)
        logger.info(f'{key} New Key-ID pair stored in redis database')

    logger.info(f'{key} Key and ID created, returning ID: {generated_id}, status code 200')
    return jsonify({"id": generated_id, "stored_value": key, "existed" : False})


@app.route('/get_id', methods=['GET'])
def get_id():
    input_method = request.args.get('input_method')
    input_protein = request.args.get('input_protein')
    logger.info(f'get_id HTTP GET received: input_method -> {input_method}, input_protein -> {input_protein}')

    key = f'{InputMethods[input_method.upper()].value}:{input_protein}'

    if input_method not in (
        InputMethods.PDB.name, InputMethods.PDB.name.lower(),
        InputMethods.UNIPROT.name, InputMethods.UNIPROT.name.lower(),
        InputMethods.SEQUENCE.name, InputMethods.SEQUENCE.name.lower()
    ):
        logger.info(f'{key} Given input method ({input_method}) is not supported, returning status code 400')
        return jsonify({'error': f'Input method {input_method} not supported'}), 400
    
    if not input_protein:
        logger.info(f'{key} Input protein not specified, returning status code 400')
        return jsonify({'error': 'Input protein not specified'}), 400
    
    id = _check(key)

    if id:
        logger.info(f'{key} ID found, returning {id}, status code 200')
        return jsonify({'id': id.decode()})
    else:
        logger.info(f'{key} ID not found, returning None, status code 200')
        return jsonify({'id': None})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)