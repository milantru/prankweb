import numpy as np
import torch
import pandas as pd
from model import BindingPredictor
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, matthews_corrcoef
import pickle
import os
from model import BindingPredictor
import warnings
warnings.filterwarnings("ignore", category=DeprecationWarning) 

def evaluate(model, file_name, embeddings_dir):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    total_loss, correct, total = 0, 0, 0
    all_preds = []
    all_labels = []
    p2rank_labels = []
    cp2rank_labels = []

    with open(file_name, "rb") as file:
        ligysis = pickle.load(file)[["rep_chain","resnum","LIGYSIS", "P2Rank+Cons", "P2Rank"]]

    ligysis["residue"] = ligysis["resnum"].astype(str).str.extract('(\d+)').astype(float).astype('Int64')
    ligysis = ligysis.sort_values(by=["rep_chain","residue"])
    bindings = ligysis.groupby("rep_chain").agg(list)

    for chain in bindings.index:
        # read embeddings
        npy_file = os.path.join(embeddings_dir, f"{chain}.npy")
        if os.path.exists(npy_file):
            embeddings = torch.tensor(np.load(npy_file, mmap_mode='r'), dtype=torch.float32)

            chain_info = bindings.loc[chain]
            labels =  torch.tensor(chain_info["LIGYSIS"], dtype=torch.float32)
            if len(labels) == embeddings.shape[0]:
                embeddings, labels = embeddings.to(device, non_blocking=True), labels.to(device, non_blocking=True)
                outputs = model(embeddings).squeeze()

                predictions = (torch.sigmoid(outputs) > model.pred_threshold).float()

                correct += (predictions == labels).sum().item()
                all_preds.extend(predictions.cpu().numpy())
                all_labels.extend(labels.cpu().numpy())
                p2rank_labels.extend(np.array(chain_info["P2Rank"], dtype=np.float32))
                cp2rank_labels.extend(np.array(chain_info["P2Rank+Cons"], dtype=np.float32))

            else:
                print(f"⚠️ Mismatch: {chain} (Residues: {len(labels)}, Embeddings: {embeddings.shape[0]})")


    for pred, model in zip([all_preds, p2rank_labels, cp2rank_labels], ["", "P2Rank:", "P2Rank+Cons:"]):
        test_accuracy = accuracy_score(all_labels, pred)
        test_precision = precision_score(all_labels, pred, zero_division=0)
        test_recall = recall_score(all_labels, pred, zero_division=0)
        test_f1 = f1_score(all_labels, pred, zero_division=0)
        test_mcc = matthews_corrcoef(all_labels, pred)

        print(f"{model} Accuracy: {test_accuracy:.4f} | Precision: {test_precision:.4f} | Recall: {test_recall:.4f} | F1: {test_f1:.4f} | MCC: {test_mcc:.4f}")

model_path = "models/model_e10.pth"
test_path = "data/LIGYSIS_predictions.pkl"
test_embeddings = "data/esm_vectors_ligysis/"

model = BindingPredictor()
model.load_model(model_path)
model.eval()
evaluate(model, test_path, test_embeddings)