import esm
import numpy as np
import torch
from model import BindingPredictor

chunk_size = 5
repr_layer = 33
threshold = 1024
embed_size = 1280

def embed_sequences(sequences):
    # ESM2 model setup
    model, alphabet = esm.pretrained.esm2_t33_650M_UR50D()
    device = torch.device("cpu")
    model.to(device)
    model.eval()

    # Prepare correct format for the model
    data = [(f"seq_{i}", seq) for i, seq in enumerate(sequences)]
    max_len = max([len(s) for s in sequences])
    embedded = []

    # Process sequences in chunks
    for i in range(0, len(data), chunk_size):
        chunk_end = min(i + chunk_size, len(data))
        embed_chunk = process_chunk(data[i:chunk_end], model, alphabet, max_len, device)
        embedded.append(embed_chunk)

    # Merge outputs into one tensor 
    return torch.concat(embedded, dim=0)

def process_chunk(data, model, alphabet, max_len, device):
    # Tokenize the sequences
    batch_converter = alphabet.get_batch_converter()
    batch_labels, batch_strs, batch_tokens = batch_converter(data)
    batch_tokens = batch_tokens.to(device)
    batch_lens = (batch_tokens != alphabet.padding_idx).sum(1)

    # Prepare output
    embed = torch.zeros(len(data), max_len+2, embed_size)

    # Process in rounds for longer sequences
    rounds = batch_lens // threshold + 1
    for i in range(max(rounds)):
        start = i * threshold
        end = min((i + 1) * threshold, batch_lens.max())
        remaining_index = (rounds > i).cpu()
        cropped_tokens = batch_tokens[remaining_index,start:end]
        
        # Extract per-residue representations
        with torch.no_grad():
            results = model(cropped_tokens, repr_layers=[repr_layer], return_contacts=False)
        token_representations = results["representations"][repr_layer]

        embed[remaining_index, start:end] = token_representations.detach().cpu()

    # Crop starting and ending tokens
    return embed[:, 1:-1, :]

def predict_bindings(embeddings, lengths, model_path = "models/model_e10.pth"):
    # Predictor model setup
    model = BindingPredictor()
    model.load_model(model_path)

    # Predict bindings
    predictions = model.predict(embeddings).detach().cpu()
    lengths = np.array(lengths)
    cropped = torch.nn.utils.rnn.unpad_sequence(predictions.permute(1,0), lengths)
    return cropped