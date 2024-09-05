#
# Modified mmseqs example https://github.com/soedinglab/MMseqs2-App/blob/master/docs/api_example.py
#

from requests import get, post
from time import sleep

# Open the FASTA file for reading
with open('2src.pdb', 'r') as fasta_file:
    # Use the 'files' parameter to upload the file
    files = {'q': fasta_file}

    # Submit a new job to the Foldseek server
    response = post('https://search.foldseek.com/api/ticket', files=files, data={
        'database[]': "pdb100",
        'mode': '3diaa',
        'max-seqs': '10'
    })

# Ensure the response is successful
if response.status_code == 200:
    ticket = response.json()
else:
    print(f"Failed to submit job. Status code: {response.status_code}, Response: {response.text}")
    exit()


print("Ticket ID:", ticket.get('id'))


# Poll until the job is complete or failed
repeat = True
while repeat:
    try:
        # Check the job status
        status = get('https://search.foldseek.com/api/ticket/' + ticket['id']).json()
        print("Status: ", status)
        if status['status'] == "ERROR":
            print("Error occurred during processing.")
            sleep(20)
        elif status['status'] == "COMPLETE":
            print("Job completed successfully.")
            repeat = False  # Exit the loop
        else:
            print(f"Job status: {status['status']}")
            sleep(20)  # Wait before polling again
    except Exception as e:
        print(f"An error occurred: {e}")
        sleep(20)

# Get all hits for the first query (0) if the job is complete
if status['status'] == "COMPLETE":
    result = get('https://search.foldseek.com/api/result/' + ticket['id'] + '/0').json()
    # Print pairwise alignment of the first hit of the first database
    print("Query Alignment:", result['results'][0]['alignments'][0][0]['qAln'])  # ['results'][0]['alignments'][0]['qAln']
    print("Database Alignment:", result['results'][0]['alignments'][0][0]['dbAln']) # ['results'][0]['alignments'][0]['dbAln']

    # Download BLAST-compatible result archive
    download = get('https://search.foldseek.com/api/result/download/' + ticket['id'], stream=True)
    with open('result.tar.gz', 'wb') as fd:
        for chunk in download.iter_content(chunk_size=128):
            fd.write(chunk)
    print("Result archive downloaded as 'result.tar.gz'.")
else:
    print("Job did not complete successfully.")
