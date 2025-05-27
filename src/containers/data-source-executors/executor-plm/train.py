import numpy as np
import torch
import time
from torch.utils.data import Dataset
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, matthews_corrcoef
import pyarrow.parquet as pq
from model import BindingPredictor

batch_size = 1024
pred_threshold = 0.5
epochs = 10
model_filename = f"models/model_e{epochs}_bs{batch_size}.pth"

class BindingDataset(Dataset):
    def __init__(self, df):
        self.embeddings = np.stack(df["embedding"].values)
        self.labels = df["binding"].values.astype(np.float32)

    def __len__(self):
        return len(self.labels)

    def __getitem__(self, idx):
        return torch.tensor(self.embeddings[idx], dtype=torch.float32), torch.tensor(self.labels[idx], dtype=torch.float32)

def train_model(model, parquet_file, epochs=200):
    best_loss = float('inf')

    for epoch in range(epochs):
        start_time = time.time()
        model.train()
        total_loss, correct, total = 0, 0, 0
        all_preds = []
        all_labels = []

        for batch in parquet_file.iter_batches(batch_size=batch_size):
            df = batch.to_pandas()
            embeddings = torch.tensor(np.stack(df["embedding"].apply(lambda x: np.array(x, dtype=np.float32))))
            labels =  torch.tensor(df["binding"].values.astype(np.float32))

            embeddings, labels = embeddings.to(device, non_blocking=True), labels.to(device, non_blocking=True)

            optimizer.zero_grad()
            with torch.amp.autocast("cuda"):
                outputs = model(embeddings).squeeze()
                loss = loss_fn(outputs, labels)

            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()

            total_loss += loss.item()
            predictions = (torch.sigmoid(outputs) > model.pred_threshold).float()
            correct += (predictions == labels).sum().item()
            total += labels.size(0)
            all_preds.extend(predictions.cpu().numpy())
            all_labels.extend(labels.cpu().numpy())

        train_accuracy = accuracy_score(all_labels, all_preds)
        train_precision = precision_score(all_labels, all_preds, zero_division=0)
        train_recall = recall_score(all_labels, all_preds, zero_division=0)
        train_f1 = f1_score(all_labels, all_preds, zero_division=0)
        train_mcc = matthews_corrcoef(all_labels, all_preds)
        epoch_time = time.time() - start_time

        print(f"Epoch {epoch+1}/{epochs} | Loss: {total_loss:.4f} | Accuracy: {train_accuracy:.4f} | Precision: {train_precision:.4f} | Recall: {train_recall:.4f} | F1: {train_f1:.4f} | MCC: {train_mcc:.4f} | Time: {epoch_time:.2f}s")

        if total_loss < best_loss:
            best_loss = total_loss
            torch.save(model.state_dict(), model_filename)
            print(" Model improved, saving checkpoint.")

    print(" Training Complete!")


train_parquet = "data/protein_residue_embeddings_all.parquet"
parquet_file = pq.ParquetFile(train_parquet)

# Get weights (precomputed)
num_non_binding = torch.tensor(2557415, dtype=torch.long)
num_binding = torch.tensor(300467, dtype=torch.long)

if num_non_binding == num_binding and num_binding == 0:
    for batch in parquet_file.iter_batches():
        batch_df = batch.to_pandas()
        binding_counts = batch_df["binding"].value_counts()
        num_non_binding += binding_counts[0]
        num_binding += binding_counts[1]

pos_weight = torch.tensor([num_non_binding / num_binding], dtype=torch.float32)
print(f"Class Weights: Non-Binding={num_non_binding}, Binding={num_binding}, Pos Weight={pos_weight.item():.4f}")

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using device: {device}")

model = BindingPredictor().to(device)

loss_fn = torch.nn.BCEWithLogitsLoss(pos_weight=pos_weight).to(device)
optimizer = torch.optim.AdamW(model.parameters(), lr=1e-4, weight_decay=1e-5)
scaler = torch.cuda.amp.GradScaler()

train_model(model, parquet_file, epochs=epochs)
model.eval()