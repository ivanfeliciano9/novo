// Lista de arquivos selecionados
let selectedFiles = [];

document.getElementById("fileInput").addEventListener("change", function (event) {
  const fileList = document.getElementById("fileList");
  fileList.innerHTML = ""; // Limpa a lista existente

  // Atualiza a lista de arquivos
  selectedFiles = Array.from(event.target.files);

  selectedFiles.forEach((file, index) => {
    const listItem = document.createElement("li");
    listItem.className = "list-group-item d-flex justify-content-between align-items-center";
    listItem.textContent = file.name;

    const removeButton = document.createElement("button");
    removeButton.className = "btn btn-sm btn-danger";
    removeButton.textContent = "Remover";
    removeButton.onclick = function () {
      removeFile(index);
    };

    listItem.appendChild(removeButton);
    fileList.appendChild(listItem);
  });
});

// Remove um arquivo da lista
function removeFile(index) {
  selectedFiles.splice(index, 1); // Remove o arquivo da lista
  updateFileList();
}

// Atualiza a lista de arquivos exibidos
function updateFileList() {
  const fileList = document.getElementById("fileList");
  fileList.innerHTML = "";

  selectedFiles.forEach((file, index) => {
    const listItem = document.createElement("li");
    listItem.className = "list-group-item d-flex justify-content-between align-items-center";
    listItem.textContent = file.name;

    const removeButton = document.createElement("button");
    removeButton.className = "btn btn-sm btn-danger";
    removeButton.textContent = "Remover";
    removeButton.onclick = function () {
      removeFile(index);
    };

    listItem.appendChild(removeButton);
    fileList.appendChild(listItem);
  });

  // Reseta o campo de entrada
  document.getElementById("fileInput").value = "";
}

// Submete os arquivos selecionados
document.getElementById("uploadForm").addEventListener("submit", async function (event) {
  event.preventDefault();
  const status = document.getElementById("status");
  const resultsContainer = document.getElementById("results");
  const downloadButton = document.getElementById("downloadXLS");

  if (selectedFiles.length === 0) {
    status.innerText = "Por favor, selecione pelo menos um arquivo.";
    return;
  }

  status.innerText = "Processando... Aguarde.";
  resultsContainer.innerHTML = "";

  const formData = new FormData();
  selectedFiles.forEach((file) => {
    formData.append("files", file);
  });

  try {
    const response = await fetch("/upload-pdf", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (response.ok) {
      status.innerText = "Processamento concluído! Veja os resultados abaixo.";
      displayResults(data.results);

      // Exibe o botão para download do Excel
      downloadButton.classList.remove("d-none");
    } else {
      status.innerText = "Erro no processamento: " + data.message;
    }
  } catch (error) {
    console.error("Erro ao conectar com o servidor:", error);
    status.innerText = "Erro ao conectar com o servidor.";
  }
});

// Exibe os resultados no frontend
document.getElementById("downloadExcel").addEventListener("click", () => {
  window.open("/download-xls", "_blank");
});

function displayResults(results) {
  const resultsContainer = document.getElementById("results");

  results.forEach((result) => {
    const card = document.createElement("div");
    card.className = "card mb-3";

    const cardBody = document.createElement("div");
    cardBody.className = "card-body";

    cardBody.innerHTML = `
      <p><strong>Agência:</strong> ${result.agencia}</p>
      <p><strong>Conta:</strong> ${result.conta}</p>
      <p><strong>Saldo:</strong> ${result.saldo}</p>
      <p><strong>Banco:</strong> ${result.banco}</p>
    `;

    card.appendChild(cardBody);
    resultsContainer.appendChild(card);
  });
}
