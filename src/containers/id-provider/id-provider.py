#!/usr/bin/env python3

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
    """
    Handles POST requests to generate or retrieve an ID based on protein input.

    This endpoint expects a JSON payload containing `input_method` and `input_protein`.
    If the payload fields are valid and a corresponding ID already exists in the database, 
    the ID is returned. If the ID does not exist, a new one is generated and stored.

    ID Generation:
        - For PDB and UniProt inputs: ID is formatted as "{input_method}_{input_protein}".
        - For custom structure or sequence input: ID is formatted as "{input_method}_{<hex-increment>}" to ensure uniqueness.

    Returns:
        Success response (200): A JSON object containing:
            - `id` (str): The retrieved or newly generated ID.
            - `stored_value` (str): The key used for database lookup or storage.
            - `existed` (bool): Indicates whether the ID already existed.

        Error response (400): A JSON object containing:
            - `error` (str): A description of the issue with the request.
    """


    input_method = request.json.get('input_method')
    input_protein = request.json.get('input_protein')
    logger.info(f'generate POST request received: {{input_method: {input_method}, input_protein: {input_protein}}}')

    if input_method is None or (input_protein is None and input_method != InputMethods.CUSTOM_STR.value):
        logger.info('Wrong input from a user, status code 400')
        return jsonify({"error": "input type or input string is missing"}), 400

    key = (
        f'{input_method}:{input_protein}'
        if input_method != InputMethods.CUSTOM_STR.value
        else f'{input_method}:{str(time())[-6]}'
    )
    logger.info(f'Key created: {key}')
        
    existing_id = _check(key)

    if existing_id:
        logger.info(f'{key} Key already existed, returning ID: {existing_id.decode()}')
        return jsonify({"id": existing_id.decode(), "stored_value": key, "existed" : True}) 

    generated_id = (
        f'{InputMethods(input_method).name.lower()}_{input_protein}'
        if input_method in (InputMethods.PDB.value, InputMethods.UNIPROT.value)
        else f'{InputMethods(input_method).name.lower()}_{hex(redis_client.incr("id_counter"))[2:]}'
    )
    logger.info(f'{key} New ID generated: {generated_id}')

    if input_method != InputMethods.CUSTOM_STR.value:
        redis_client.set(key, generated_id)
        logger.info(f'{key} New (Key, ID) pair ({key}, {generated_id}) stored in redis database')

    logger.info(f'{key} Key and ID created, returning ID: {generated_id}')
    return jsonify({"id": generated_id, "stored_value": key, "existed" : False})


@app.route('/get-id', methods=['GET'])
def get_id():
    """
    Handles GET requests to retrieve a stored ID based on protein input.

    This endpoint expects query parameters `input_method` and `input_protein`.
    If both parameters are valid and the corresponding key exists in the database,
    the associated ID is returned. If the key does not exist, the response indicates 
    the ID was not found.

    Key Generation:
        - The key is constructed as "{input_method}:{input_protein}", where:
            - `input_method` is the enum value of the input method (case-insensitive).
            - `input_protein` is converted to lowercase.
        - Only supported methods are: PDB, UniProt, and SEQUENCE.

    Returns:
        Success response (200): A JSON object containing:
            - `id` (str | None): The ID associated with the input, or None if not found.
            - `error` (str | None): None if successful, otherwise a message describing the error.

        Error response (400): A JSON object containing:
            - `id` (None): Always None for invalid input.
            - `error` (str): A description of the missing or unsupported parameter.
    """

    input_method = request.args.get('input_method')
    input_protein = request.args.get('input_protein')
    logger.info(f'get-id GET request received: {{input_method: {input_method}, input_protein: {input_protein}}}')

    if not input_method:
        logger.info('input_method not specified, status code 400')
        return jsonify({'id': None, 'error': 'input_method not specified'}), 400
    
    if not input_protein:
        logger.info('Input protein not specified, status code 400')
        return jsonify({'id': None, 'error': 'input_protein not specified'}), 400

    if input_method not in (
        InputMethods.PDB.name, InputMethods.PDB.name.lower(),
        InputMethods.UNIPROT.name, InputMethods.UNIPROT.name.lower(),
        InputMethods.SEQUENCE.name, InputMethods.SEQUENCE.name.lower()
    ):
        logger.info(f'Unsupported input method ({input_method}), status code 400')
        return jsonify({'id': None, 'error': f'Input method {input_method} not supported'}), 400
    
    key = f'{InputMethods[input_method.upper()].value}:{input_protein.lower()}'
    logger.info(f'Key for database search created from input: {key}')

    id = _check(key)

    if not id:
        logger.info(f'{key} ID not found, returning None')
        return jsonify({'id': None, 'error': None})

    logger.info(f'{key} ID found, returning {id.decode()}')
    return jsonify({'id': id.decode(), 'error': None})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)