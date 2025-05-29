let extractedText = '';
let selectedFile = null; // Track user-selected PDF
const fltRls = {};
displayClock();
// Wait for DOM to load and check pdfjsLib
document.addEventListener("DOMContentLoaded", function () {
  //console.log('pdfjsLib:', typeof pdfjsLib);
  if (typeof pdfjsLib === 'undefined') {
    console.error('pdfjsLib is not defined. Ensure pdf.min.js is loaded in index.html.');
    alert('Error: PDF.js library not loaded. Check console for details.');
  } else {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs/pdf.worker.min.js';
  }
  // Set up file input listener
  const pdfInput = document.getElementById('pdfInput');
  if (pdfInput) {
    pdfInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file && file.type === 'application/pdf') {
        try {
          selectedFile = file;
          const arrayBuffer = await file.arrayBuffer();
          const typedArray = new Uint8Array(arrayBuffer);
          const pdfDoc = await pdfjsLib.getDocument(typedArray).promise;
          extractedText = await extractTextFromPDF(pdfDoc);
          //alert('PDF loaded successfully. Click "Process PDF" to display flight data.');
        } catch (error) {
          console.error('Error processing selected PDF:', error);
          alert('Failed to process PDF. Check console for details.');
        }
      } else {
        alert('Please select a valid PDF file.');
      }
    });
  }

});

// Service worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js')
      .then(registration => {
        //console.log('Service Worker registered with scope:', registration.scope);
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  });
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


// Load a cached PDF (sampleRelease.pdf) unless a file is selected
async function loadCachedPDF() {
  try {
    if (typeof pdfjsLib === 'undefined') {
      throw new Error('pdfjsLib is not defined. Ensure pdf.min.js is loaded.');
    }
    if (selectedFile) {
      // User has selected a file, use it instead
      const arrayBuffer = await selectedFile.arrayBuffer();
      const typedArray = new Uint8Array(arrayBuffer);
      const pdfDoc = await pdfjsLib.getDocument(typedArray).promise;
      extractedText = await extractTextFromPDF(pdfDoc);
      console.log('Extracted Text from Selected PDF:', extractedText);
    } else {
      // Load cached sampleRelease.pdf
      const response = await fetch('sampleRelease.pdf');
      if (!response.ok) throw new Error('Failed to fetch cached PDF');
      const data = await response.arrayBuffer();
      const typedArray = new Uint8Array(data);
      const pdfDoc = await pdfjsLib.getDocument(typedArray).promise;
      extractedText = await extractTextFromPDF(pdfDoc);
    }
    //alert('PDF loaded successfully. Click "Process PDF" to display flight data.');
  } catch (error) {
    console.error('Error loading PDF:', error);
    alert('Failed to load PDF. Check console for details.');
  }
}

function loadRelease() {
  console.log(extractedText);
  if (!extractedText) {
    alert('No PDF loaded. Please select a PDF or load the cached PDF.');
    return;
  }

   //document.getElementById('inputText').style.display = 'none';
  //document.getElementById('submitButton').style.display = 'none';
  var matchBox;
  var loopHelp = true;
  //const textarea = document.getElementById('inputText');
  //textarea.value = textContent = textarea.value; // Store text in variable

  var flightInformationRgx =
    /FLIGHT\s(\d{4})\/\/([A-Z]{4})-([A-Z]{4})\/\/ETE\s(\d{2}:\d{2})/gm; //works
  //1:Flight ID, 2:DEP, 3:ARR, 4:ETE
  matchBox = flightInformationRgx.exec(extractedText);
  fltRls.ID = matchBox[1];
  fltRls.DEP = matchBox[2];
  fltRls.ARR = matchBox[3];
  fltRls.ETE = matchBox[4];

  var crewRgx = /(?:CA:|FO:|FA:)\s*\d{6}\s*(?:\w*\s?)*(?=\s*(?:CA:|FO:|FA:|FLIGHT|$))/gm; //works
  fltRls.Crew = [];
  while (loopHelp) {
    matchBox = crewRgx.exec(extractedText);
    if (matchBox != null) {
      fltRls.Crew.push(matchBox);
    } else {
      loopHelp = false;
    }
  }

  var rlsNum = /RELEASE\sNO.\s\d{1,2}/gm; //works
  fltRls.rlsNum = rlsNum.exec(extractedText);
  var aircraft = /(N\w{5})\s(E170-\d{3}\w{2}(?:\/[A-Z]*)*)/gm; //1:Tail, 2:Type //works
  fltRls.aircraft = aircraft.exec(extractedText);
  var authDep = /(?<=AUTHORIZED DATE\/TIME:\s*)(\d{2}\w{3}\d{2})\s(\d{4}Z)/m; //1:Date, 2:Time //works
  matchBox = authDep.exec(extractedText);
  fltRls.AuthDep = [];
  fltRls.AuthDep.push(matchBox[1]);
  fltRls.AuthDep.push(matchBox[2]);
  var skedDep = /(?<=SKED DEP DATE\/TIME:\s*)(\d{2}\w{3}\d{2})\s(\d{4}Z)/m; //1:Date, 2:Time //works
  matchBox = skedDep.exec(extractedText);
  fltRls.SkedDep = [];
  fltRls.SkedDep.push(matchBox[1]);
  fltRls.SkedDep.push(matchBox[2]);
  var skedArr = /(?<=SKED ARR DATE\/TIME:\s*)(\d{2}\w{3}\d{2})\s(\d{4}Z)/gm; //1:Date, 2:Time //works
  matchBox = skedArr.exec(extractedText);
  fltRls.SkedArr = [];
  fltRls.SkedArr.push(matchBox[1]);
  fltRls.SkedArr.push(matchBox[2]);
  var payload = /PAYLOAD:\s*(\d{1,5})\s*PAYLOAD:\s*(\d{1,5})/gm; //1:Planned, 2:Est Max
  var pax = /PAX:\s*(\d{1,2})\s*PAX:\s*(\d{1,2})/gm; //1:Planned, 2:Est Max
  var bags = /BAGS:\s*(\d{1,3})\s*BAGS:\s*(\d{1,3})/gm; //1:Planned, 2:Est Max
  var burn = /(BURN)\s*(\d{4,5})\s*(\d:\d{2})/gm; //1:Quantity, 2:Time
  var resrv = /(RESERVE)\s*(\d{4,5})\s*(\d:\d{2})/gm;
  var hold = /(HOLD)\s*(\d{3,5})\s*(\d:\d{2})/gm;
  var altF = /(ALT)\s*(\d{1,5})\s*(\d:\d{2})/gm;
  var ballast = /(BALLAST)\s*(\d{1,5})/gm;
  var melF = /(MEL)\s*(\d{1,5})\s*(\d:\d{2})/gm;
  var minF = /(MIN)\s*(\d{1,5})\s*(\d:\d{2})/gm;
  var taxi = /(TAXI)\s*(\d{1,5})\s*(\d:\d{2})/gm;
  var extra = /(EXTRA)\s*(\d{1,5})\s*(\d:\d{2})/gm;
  var ramp = /(RAMP)\s*(\d{1,5})\s*(\d:\d{2})/gm;
  fltRls.fuel = [];
  fltRls.fuel.push(burn.exec(extractedText));
  fltRls.fuel.push(resrv.exec(extractedText));
  fltRls.fuel.push(hold.exec(extractedText));
  fltRls.fuel.push(altF.exec(extractedText));
  fltRls.fuel.push(ballast.exec(extractedText));
  fltRls.fuel.push(melF.exec(extractedText));
  fltRls.fuel.push(minF.exec(extractedText));
  fltRls.fuel.push(taxi.exec(extractedText));
  fltRls.fuel.push(extra.exec(extractedText));
  fltRls.fuel.push(ramp.exec(extractedText));

  var MELNEFs = /(\d{2}-\d{2}-\d{2,3}(?:-\d{1,2})?)\s*(\d{2}\w{3}\d{2})\s*((?:\w+\s?)*)\s*((?:[A-Z,-]+\s{0,2})*)/gm; // Try multiple matches
  var CDLs = 
  var pages =
    /(?:REPUBLIC AIRWAYS BRIEF PAGE \d{1,2} OF \d{2})|(?:PAGE \d{1,2} OF \d{2})/g;

  displayRelease();
}

function displayRelease() {
  document.getElementById('div1').style.display = 'block';
  //Fill Fuel Table
  document.getElementById('burnQ').innerHTML = fltRls.fuel[0][2];
  document.getElementById('burnT').innerHTML = fltRls.fuel[0][3];
  document.getElementById('reserveQ').innerHTML = fltRls.fuel[1][2];
  document.getElementById('reserveT').innerHTML = fltRls.fuel[1][3];
  document.getElementById('holdQ').innerHTML = fltRls.fuel[2][2];
  document.getElementById('holdT').innerHTML = fltRls.fuel[2][3];
  document.getElementById('altQ').innerHTML = fltRls.fuel[3][2];
  document.getElementById('altT').innerHTML = fltRls.fuel[3][3];
  document.getElementById('ballastQ').innerHTML = fltRls.fuel[4][2];
  document.getElementById('ballastT').innerHTML = 'N/A';
  document.getElementById('melQ').innerHTML = fltRls.fuel[5][2];
  document.getElementById('melT').innerHTML = fltRls.fuel[5][3];
  document.getElementById('minQ').innerHTML = fltRls.fuel[6][2];
  document.getElementById('minT').innerHTML = fltRls.fuel[6][3];
  document.getElementById('taxiQ').innerHTML = fltRls.fuel[7][2];
  document.getElementById('taxiT').innerHTML = fltRls.fuel[7][3];
  document.getElementById('extraQ').innerHTML = fltRls.fuel[8][2];
  document.getElementById('extraT').innerHTML = fltRls.fuel[8][3];
  document.getElementById('rampQ').innerHTML = fltRls.fuel[9][2];
  document.getElementById('rampT').innerHTML = fltRls.fuel[9][3];

  for (const x of fltRls.Crew) {
    var row = document.createElement('tr');
    row.innerHTML = '<td>' + x + '</td>';
    document.getElementById('crew').appendChild(row);
  }
}

function displayClock() {
  const now = new Date();
  const hours = String(now.getUTCHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const hoursL = String(now.getHours()).padStart(2, '0');
  document.getElementById('clock').innerHTML =
    hours + minutes + 'Z   /   ' + hoursL + minutes + 'L';
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
