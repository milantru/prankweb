import os
import FastaValidator

# Define the size limit in bytes (5 kB = 5 * 1024 bytes)
SIZE_LIMIT = 5 * 1024  # 5 kB

# Create a FastaValidator instance

# List of FASTA files to validate
fasta_files = [
    'invalid_2src_too_long.fasta',
    'invalid_2src_empty.fasta',
    'invalid_2src_no_header.fasta',
    'invalid_2src.fasta'
]

# Validate each file
for file_path in fasta_files:
    # Check if the file exists
    if os.path.exists(file_path):
        # Check the file size
        file_size = os.path.getsize(file_path)
        
        if file_size > SIZE_LIMIT:
            print(f"The file {file_path} exceeds the size limit of 5 kB. Size: {file_size} bytes.")
        else:
            # Validate the FASTA file
            is_valid = FastaValidator.fasta_validator(file_path)
            if is_valid == 0:
                print(f"The file {file_path} is valid.")
            elif is_valid == 1: # NOTE No headers
                print(f"The file {file_path} is invalid. No headers")
            elif is_valid == 4: # NOTE invalid symbols in sequence
                print(f"The file {file_path} is invalid. Invalid symbols")
    else:
        print(f"The file {file_path} does not exist.")
