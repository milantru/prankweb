from flask import Flask, request, jsonify
import os
import subprocess
import threading

app = Flask(__name__)
UPLOAD_FOLDER = "uploads"
RESULTS_FOLDER = "results"
STATUS_FOLDER = "status"
FOLDSEEK_DB = "foldseek_db/pdb"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULTS_FOLDER, exist_ok=True)
os.makedirs(STATUS_FOLDER, exist_ok=True)

def run_foldseek(query_file, result_file, pdb_id, status_file_path):
    command = [
        "foldseek", "easy-search", query_file, FOLDSEEK_DB,
        result_file, "tmp", "--max-seqs", "5",
        "--format-output", "query,target,alnlen,qseq,qstart,qend,qaln,alntmscore,tseq,tstart,tend,taln"
    ]
    try:
        subprocess.run(command, check=True)  # RUN FOLDSEEK SEARCH
        with open(status_file_path, "w") as f:
            f.write("completed\n")
    except subprocess.CalledProcessError as e:
        with open(status_file_path, "w") as f:
            f.write(f"crashed\n{e.stderr}")

@app.route("/upload", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    if not file.filename.lower().endswith(".pdb"):
        return jsonify({"error": "Only .pdb files are allowed"}), 400

    pdb_id = file.filename[:-4]  # Extract PDB ID without extension
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)

    status_file_path = os.path.join(STATUS_FOLDER, f"{pdb_id}.status")
    with open(status_file_path, "w") as f:
        f.write("started\n")  # Initial status

    query_file = file_path
    result_file = os.path.join(RESULTS_FOLDER, f"aln_res_{pdb_id}")
    thread = threading.Thread(target=run_foldseek, args=(query_file, result_file, pdb_id, status_file_path))
    thread.start()

    return jsonify({"message": "File uploaded and processing", "pdbid": pdb_id}), 202

@app.route("/search", methods=["GET"])
def search_protein():
    pdb_id = request.args.get("pdbid")
    if not pdb_id:
        return jsonify({"error": "Missing pdbid parameter"}), 400

    status_file_path = os.path.join(STATUS_FOLDER, f"{pdb_id}.status")
    result_file = os.path.join(RESULTS_FOLDER, f"aln_res_{pdb_id}")

    if not os.path.exists(status_file_path):
        return jsonify({"error": "Status file not found"}), 404

    with open(status_file_path, "r") as f:
        status = f.readline().strip()

    if status == "started":
        return jsonify({"status": "processing"}), 202
    elif status == "completed":
        with open(result_file, "r") as f:
            lines = f.readlines()
        pdb_ids = [line.split("\t")[1][:4] for line in lines if len(line.split("\t")) > 1]
        return jsonify({"matches": pdb_ids})
    elif status.startswith("crashed"):
        error_message = status[len("crashed"):].strip()
        return jsonify({"error": f"Foldseek crashed: {error_message}"}), 500
    else:
        return jsonify({"error": "Unknown status"}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)