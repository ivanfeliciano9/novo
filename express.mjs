import express from "express";
import multer from "multer";
import axios from "axios";
import sqlite3 from "sqlite3";
import fs from "fs";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import ExcelJS from "exceljs";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import tesseract from "tesseract.js"; // OCR Library
import pdfPoppler from "pdf-poppler";
import { createCanvas, loadImage } from "canvas";

const __filename = fileURLToPath(import.meta.url); // Define o caminho absoluto do arquivo atual
const __dirname = path.dirname(__filename);       // Define o diretório do arquivo atual

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(cors());

// Configuração do banco de dados
let db = new sqlite3.Database("results.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agencia TEXT,
      conta TEXT,
      saldo TEXT,
      data_processamento TEXT DEFAULT CURRENT_DATE
    )
  `);
});

// Configurações da API externa
const API_KEY = "nzEjnEt1VkKhq7pKvAc4lA";
const ENDPOINT_URL =
  "https://sai-library.saiapplications.com/api/templates/67461b265c5b3c5f96198e57/execute";

// Função para extrair texto de um PDF
async function extractTextFromPDF(pdfPath) {
  try {
    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfData = new Uint8Array(pdfBuffer); // Converte para Uint8Array

    const pdfDocument = await pdfjsLib.getDocument({ data: pdfData }).promise;
    let fullText = ""; // Variável para armazenar o texto extraído

    for (let pageIndex = 1; pageIndex <= pdfDocument.numPages; pageIndex++) {
      const page = await pdfDocument.getPage(pageIndex);
      const textContent = await page.getTextContent();

      const pageText = textContent.items.map((item) => item.str).join(" ");
      fullText += pageText + "\n";
    }

    return fullText.trim(); // Retorna o texto completo, sem espaços extras
  } catch (error) {
    console.error("Erro ao extrair texto com PDF.js:", error);
    return null; // Retorna null caso a extração falhe
  }
}

// Função para verificar se o texto extraído é significativo
function isTextMeaningful(text) {
  return text && text.replace(/[\s\n]+/g, "").length > 0; // Remove espaços e quebras de linha e verifica o tamanho
}

async function applyZoom(imagePath, zoomFactor = 4) {
  try {
    const image = await loadImage(imagePath);

    // Cria um canvas com dimensões ampliadas
    const canvas = createCanvas(image.width * zoomFactor, image.height * zoomFactor);
    const context = canvas.getContext("2d");

    // Desenha a imagem ampliada no canvas
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    // Salva a imagem ampliada (opcional, para inspeção)
    const zoomedImagePath = `${imagePath}_zoomed.png`;
    const buffer = canvas.toBuffer("image/png");
    fs.writeFileSync(zoomedImagePath, buffer);

    return zoomedImagePath; // Retorna o caminho da imagem ampliada
  } catch (error) {
    console.error("Erro ao aplicar zoom na imagem:", error);
    throw error;
  }
}

// Função para realizar OCR em uma imagem
async function performOCR(imagePath) {
  try {
    // Preprocessa a imagem antes de realizar OCR
    const processedImagePath = await applyZoom(imagePath);

    // Realiza OCR na imagem preprocessada
    const { data: { text } } = await tesseract.recognize(processedImagePath, "eng");

    return text;
  } catch (error) {
    console.error("Erro no OCR:", error);
    return ""; // Retorna string vazia se o OCR falhar
  }
}

// Gera imagens das páginas de um PDF
async function pdfToImages(pdfPath, outputDir) {
  const options = {
    format: "png",
    out_dir: outputDir,
    out_prefix: path.basename(pdfPath, ".pdf"),
    page: null,
  };

  try {

    await pdfPoppler.convert(pdfPath, options);

    const images = fs
      .readdirSync(outputDir)
      .filter((file) => file.startsWith(options.out_prefix) && file.endsWith(".png"))
      .map((file) => path.join(outputDir, file));

    return images;
  } catch (error) {
    console.error("Erro ao converter PDF para imagens:", error);
    throw error;
  }
}

// Salva os resultados no banco de dados
function saveToDatabase({ agencia, conta, saldo }) {
  const currentDate = new Date().toISOString().split("T")[0];
  db.run(
    `INSERT INTO results (agencia, conta, saldo, data_processamento) VALUES (?, ?, ?, ?)`,
    [agencia, conta, saldo, currentDate],
    (err) => {
      if (err) {
        console.error("Erro ao salvar no banco de dados:", err);
      }
    }
  );
}

// Gera o arquivo Excel com saldo do dia atual
async function generateExcelFile() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Resultados");

  worksheet.columns = [
    { header: "Agência", key: "agencia", width: 15 },
    { header: "Conta", key: "conta", width: 20 },
    { header: "Saldo", key: "saldo", width: 20 },
    { header: "Data de Processamento", key: "data_processamento", width: 20 },
  ];

  const filePath = path.join(__dirname, "uploads", "resultados.xlsx");

  return new Promise((resolve, reject) => {
    const currentDate = new Date().toISOString().split("T")[0];
    db.all(
      "SELECT agencia, conta, saldo, data_processamento FROM results WHERE data_processamento = ?",
      [currentDate],
      (err, rows) => {
        if (err) {
          console.error("Erro ao consultar banco de dados:", err);
          reject(err);
        } else {
          rows.forEach((row) => worksheet.addRow(row));
          workbook.xlsx
            .writeFile(filePath)
            .then(() => resolve(filePath))
            .catch((error) => reject(error));
        }
      }
    );
  });
}

function cleanUploadsFolder() {
  const uploadsDir = path.join(__dirname, "uploads");
  try {
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      for (const file of files) {
        const filePath = path.join(uploadsDir, file);
        fs.unlinkSync(filePath); // Remove cada arquivo
      }
      console.log("Pasta 'uploads' limpa.");
    } else {
      fs.mkdirSync(uploadsDir); // Cria a pasta se não existir
      console.log("Pasta 'uploads' criada.");
    }
  } catch (error) {
    console.error("Erro ao limpar a pasta 'uploads':", error);
  }
}

// Endpoint para download do Excel
app.get("/download-xls", async (req, res) => {
  try {
    const filePath = await generateExcelFile();
    res.download(filePath, "resultados.xlsx", (err) => {
      if (err) {
        console.error("Erro ao enviar o arquivo Excel:", err);
        res.status(500).send("Erro ao baixar o arquivo.");
      }
    });
  } catch (error) {
    console.error("Erro ao gerar o arquivo Excel:", error);
    res.status(500).send("Erro ao gerar o arquivo Excel.");
  }
});

// Endpoint para upload de PDF
app.post("/upload-pdf", upload.array("files"), async (req, res) => {
  try {
    const results = [];
    const outputDir = path.join(__dirname, "uploads");

    for (const file of req.files) {
      // Primeiro, tente extrair texto diretamente do PDF
      let extractedText = await extractTextFromPDF(file.path);

      // Verifique se o texto extraído é significativo; caso contrário, use OCR
      if (!isTextMeaningful(extractedText)) {
        const imagePaths = await pdfToImages(file.path, outputDir);
        const ocrTexts = [];

        for (const imagePath of imagePaths) {
          const ocrText = await performOCR(imagePath);
          ocrTexts.push(ocrText);
          fs.unlinkSync(imagePath); // Remova a imagem temporária
        }

        extractedText = ocrTexts.join("\n");
      }

      // Crie o payload para a API
      const payload = {
        inputs: {
          imagem_0: extractedText,
          data_hoje: new Date().toISOString().split("T")[0],
        },
      };

      // Faça a chamada à API externa
      const apiResponse = await axios.post(ENDPOINT_URL, payload, {
        headers: {
          "X-Api-Key": API_KEY,
          "Content-Type": "application/json",
        },
      });

      // Formate os resultados com base na resposta da API
      const result = {
        agencia: apiResponse.data.agencia || "",
        conta: apiResponse.data.conta || "",
        saldo: apiResponse.data.saldo || "",
        banco: apiResponse.data.banco || "",
      };

      // Salve os resultados no banco de dados
      saveToDatabase(result);
      results.push(result);

      // Remova o arquivo PDF temporário
      fs.unlinkSync(file.path);
      cleanUploadsFolder();
    }

    res.json({
      message: "Processamento concluído!",
      results,
    });
  } catch (error) {
    console.error("Erro ao processar arquivos:", error);
    res.status(500).json({ message: "Erro ao processar os arquivos." });
  }
});

// Servir arquivos estáticos
app.use(express.static("public"));

// Inicia o servidor
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
