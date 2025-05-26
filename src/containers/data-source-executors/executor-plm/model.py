import torch

class BindingPredictor(torch.nn.Module):
    def __init__(self, input_dim=1280, threshold=0.5):
        super(BindingPredictor, self).__init__()
        self.device = torch.device("cpu")
        self.model = torch.nn.Sequential(
            torch.nn.Linear(input_dim, 512),
            torch.nn.ReLU(),
            torch.nn.LayerNorm(512),
            torch.nn.Linear(512, 256),
            torch.nn.ReLU(),
            torch.nn.Linear(256, 1),
        ).to(self.device)
        self.pred_threshold = threshold

    def load_model(self, file_name):
        self.load_state_dict(torch.load(file_name, map_location=self.device))
        self.eval()

    def forward(self, x):
        return self.model(x)

    def predict_proba(self, x):
        x = x.to(self.device)
        with torch.no_grad():
            outputs = self.model(x)
        return torch.sigmoid(outputs).squeeze()

    def predict(self, x):
        probabilities = self.predict_proba(x)
        predictions = (probabilities > self.pred_threshold).float() * probabilities
        return predictions
