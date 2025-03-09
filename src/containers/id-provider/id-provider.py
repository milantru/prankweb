from flask import Flask, request, jsonify
import redis

app = Flask(__name__)

# Connect to Redis
redis_client = redis.StrictRedis(host='id-database', port=6379, db=0)

def check(key):
    return redis_client.get(key)

@app.route('/generate', methods=['POST'])
def get_or_generate():

    input_type = request.json.get('input_type')
    input_string = request.json.get('input_string')

    if not input_type or not input_string:
        return jsonify({"error": "input type or input string in missing"}), 400

    key = input_type + ':' + input_string
    existing_id = check(key)

    if existing_id:
        return jsonify({"id": existing_id.decode('utf-8'), "stored_value": key, "existed" : True}) 

    # Increment the ID in Redis. The key is 'id_counter'.
    # If 'id_counter' doesn't exist, Redis initializes it to 0.
    generated_id = redis_client.incr('id_counter')

    # Convert the ID to hexadecimal (without the '0x' prefix)
    existing_id = hex(generated_id)[2:]

    redis_client.set(key, existing_id)

    return jsonify({"id": existing_id, "stored_value": key, "existed" : False})

# @app('/get', methods=['POST'])
# def get():
#     return check()


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)