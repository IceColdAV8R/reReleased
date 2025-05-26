let extractedText = ''; // Renamed to avoid conflict with DOM textContent
const fltRls = {};

// Wait for DOM to load and check pdfjsLib
document.addEventListener("DOMContentLoaded", function () {
  console.log('pdfjsLib:', typeof pdfjsLib); // Debug: Check if pdfjsLib is defined
  if (typeof pdfjsLib === 'undefined') {
    console.error('pdfjsLib is not defined. Ensure pdf.min.js is loaded in index.html.');
    alert('Error: PDF.js library not loaded. Check console for details.');
  }
  // Load cached PDF after DOM is ready
  loadCachedPDF();
});

// Configure PDF.js worker
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs/pdf.worker.min.js';
} else {
  console.error('Cannot configure PDF.js worker: pdfjsLib is not defined.');
}

// Service worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js')
      .then(registration => {
        console.log('Service Worker registered with scope:', registration.scope);
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  });
}

// Function to ensure pdfjsLib is loaded
async function loadPDFjs() {
  if (typeof pdfjsLib === 'undefined') {
    console.error('pdfjsLib is not defined. Ensure pdf.min.js is loaded.');
    try {
      await new Promise((resolve, reject) => {
        const script = document.querySelector('script[src="pdfjs/pdf.min.js"]');
        if (script) {
          script.onload = resolve;
          script.onerror = () => reject(new Error('Failed to load pdf.min.js'));
        } else {
          reject(new Error('pdf.min.js script tag not found in HTML'));
        }
      });
    } catch (error) {
      console.error(error.message);
      alert('Error: PDF.js library failed to load. Check console for details.');
      throw error;
    }
  }
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs/pdf.worker.min.js';
}

// Function to extract text from a PDF
async function extractTextFromPDF(pdfDoc) {
  let fullText = '';
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += pageText + ' ';
  }
  return fullText.trim();
}

// Load a cached PDF (e.g., sampleRelease.pdf)
async function loadCachedPDF() {
  try {
    await loadPDFjs();
    const response = await fetch('sampleRelease.pdf');
    if (!response.ok) throw new Error('Failed to fetch cached PDF');
    const data = await response.arrayBuffer();
    const typedArray = new Uint8Array(data);
    const pdfDoc = await pdfjsLib.getDocument(typedArray).promise;
    extractedText = await extractTextFromPDF(pdfDoc);
    console.log('Extracted Text from Cached PDF:', extractedText);
    loadRelease();
  } catch (error) {
    console.error('Error loading cached PDF:', error);
    alert('Failed to load cached PDF. Check console for details.');
  }
}

function loadRelease() {
  const textarea = document.getElementById('inputText');
  if (textarea) {
    textarea.style.display = 'none';
    textarea.value = extractedText; // Store text in textarea if present
  }
  const submitButton = document.getElementById('submitButton');
  if (submitButton) {
    submitButton.style.display = 'none';
  }

  // Parse flight information
  const flightInformationRgx = /FLIGHT\s(\d{4})\/\/([A-Z]{4})-([A-Z]{4})\/\/ETE\s(\d{2}:\d{2})/gm;
  let match = flightInformationRgx.exec(extractedText);
  if (match) {
    fltRls.ID = match[1];
    fltRls.DEP = match[2];
    fltRls.ARR = match[3];
    fltRls.ETE = match[4];
  }

  // Parse crew
  const crewRgx = /(?<=\n)[A-Z]{2}:\s\d{6}\s(?:\w*\s?)*(?=\n)/gm;
  fltRls.Crew = [];
  let crewMatch;
  while ((crewMatch = crewRgx.exec(extractedText)) !== null) {
    fltRls.Crew.push(crewMatch[0]);
  }

  // Parse other fields
  const rlsNum = /RELEASE\sNO.\s\d{1,2}/gm;
  fltRls.rlsNum = rlsNum.exec(extractedText)?.[0] || 'N/A';
  const aircraft = /(N\w{5})\s(E170.*)/gm;
  fltRls.aircraft = aircraft.exec(extractedText) || ['N/A', 'N/A'];
  const authDep = /(?<=AUTHORIZED DATE\/TIME:\s)(\d{2}\w{3}\d{2})\s(\d{4}Z)/gm;
  match = authDep.exec(extractedText);
  fltRls.SchedDate = match ? match[1] : 'N/A';
  fltRls.SchedTime = match ? match[2] : 'N/A';

  // Fuel data
  const fuelRegexes = [
    { name: 'BURN', rgx: /(BURN)\s(\d{4,5})\s(\d:\d{2})/gm },
    { name: 'RESERVE', rgx: /(RESERVE)\s(\d{4,5})\s(\d:\d{2})/gm },
    { name: 'HOLD', rgx: /(HOLD)\s(\d{3,5})\s(\d:\d{2})/gm },
    { name: 'ALT', rgx: /(ALT)\s(\d{1,5})\s(\d:\d{2})/gm },
    { name: 'BALLAST', rgx: /(BALLAST)\s(\d{1,5})/gm },
    { name: 'MEL', rgx: /(MEL)\s(\d{1,5})\s(\d:\d{2})/gm },
    { name: 'MIN', rgx: /(MIN)\s(\d{1,5})\s(\d:\d{2})/gm },
    { name: 'TAXI', rgx: /(TAXI)\s(\d{1,5})\s(\d:\d{2})/gm },
    { name: 'EXTRA', rgx: /(EXTRA)\s(\d{1,5})\s(\d:\d{2})/gm },
    { name: 'RAMP', rgx: /(RAMP)\s(\d{1,5})\s(\d:\d{2})/gm }
  ];
  fltRls.fuel = fuelRegexes.map(({ name, rgx }) => {
    const match = rgx.exec(extractedText);
    return match ? [name, match[2], match[3] || 'N/A'] : [name, 'N/A', 'N/A'];
  });

  displayRelease();
}

function displayRelease() {
  console.log('Flight Release Data:', fltRls);
  createChild('titleDiv', 'h1', `RPA ${fltRls.ID || 'N/A'}`);
  createChild('div1', 'h1', fltRls.rlsNum || 'N/A');
  createChild('div1', 'h1', `${fltRls.aircraft[1]} - - - ${fltRls.aircraft[2]}`);
  createChild('div1', 'h1', `${fltRls.DEP || 'N/A'} - ${fltRls.ARR || 'N/A'}`);
  createChild('div1', 'h1', `SKED DEP ${fltRls.SchedTime || 'N/A'}`);

  const div1 = document.getElementById('div1');
  if (div1) div1.style.display = 'block';

  const fuelDiv = document.getElementById('fuel');
  if (fuelDiv) {
    fuelDiv.style.display = 'block';
    const fuelTable = document.createElement('table');
    fltRls.fuel.forEach(([name, quantity, time]) => {
      const row = document.createElement('tr');
      row.innerHTML = `<td>${name}</td><td>${quantity}</td><td>${time}</td>`;
      fuelTable.appendChild(row);
    });
    fuelDiv.appendChild(fuelTable);
  }
}

function displayClock() {
  const now = new Date();
  const hours = String(now.getUTCHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const hoursL = String(now.getHours()).padStart(2, '0');
  const clock = document.getElementById('clock');
  if (clock) {
    clock.innerHTML = `${hours}${minutes}Z / ${hoursL}${minutes}L`;
  }
}
setInterval(displayClock, 1000);

function createChild(parentId, childTag, innerHtml) {
  const parent = document.getElementById(parentId);
  if (!parent) {
    console.error(`Parent element with ID "${parentId}" not found.`);
    return null;
  }
  const child = document.createElement(childTag);
  child.innerHTML = innerHtml;
  parent.appendChild(child);
}
