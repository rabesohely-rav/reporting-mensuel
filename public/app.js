async function save() {
  const payload = {
    nom_fs: document.getElementById('nomFs').value,
    periode: document.getElementById('periode').value,
    nombre_accompagnements: Number(document.getElementById('nombre').value),
    data: {}
  };

  await fetch('/api/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  alert("Sauvegardé");
}

function printReport() {
  window.print();
}
