const express = require("express");
const multer = require("multer");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

const app = express();
const upload = multer({ dest: "uploads/" });

app.post("/upload", upload.single("file"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    const originalFileName = req.file.originalname; // Get original filename
    const fileExtension = path.extname(originalFileName).toLowerCase();

    if (fileExtension !== ".pdb") {
        return res.status(400).json({ error: "Only .pdb files are allowed" });
    }

    const newFilePath = path.join(__dirname, "uploads", originalFileName);

    fs.rename(req.file.path, newFilePath, (err) => {
        if (err) {
            return res.status(500).json({ error: "File rename failed" });
        }
        res.json({ message: "File uploaded", path: newFilePath });
    });
});

// Endpoint to search for similar proteins
app.get("/search", (req, res) => {
    const pdbId = req.query.pdbid
    console.log(pdbId)
    const queryFile = path.join(__dirname, "uploads", pdbId + ".pdb");
    const resultFilePath = path.join(__dirname, "results", `aln_res_${pdbId}`);

    if (!fs.existsSync(queryFile)) {
        return res.status(400).json({ error: "File not found" });
    }

    exec(`foldseek easy-search ${queryFile} foldseek_db/pdb results/aln_res_${pdbId} tmp --max-seqs 5 --format-output query,target,alnlen,qseq,qstart,qend,qaln,alntmscore,tseq,tstart,tend,taln`, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ error: stderr });
        }
        fs.readFile(resultFilePath, "utf8", (err, data) => {
            if (err) {
                return res.status(500).json({ error: "Failed to read result file" });
            }

            // Split the file content into lines and extract PDB IDs from the second column
            const lines = data.split("\n");
            const pdbIds = lines.map(line => {
                const columns = line.split("\t");
                if (columns.length > 1) {
                    return columns[1].slice(0, 4); // Extract first 4 characters of second column
                }
                return null;
            }).filter(id => id !== null);  // Filter out any null values

            // Send the PDB IDs as a response
            res.json({ matches: pdbIds });
        });
    });
});

app.listen(8000, () => console.log("API running on port 8000"));
