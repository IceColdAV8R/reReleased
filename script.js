let textContent = '';
const fltRls = {};
loadCachedPDF();

document.addEventListener("DOMContentLoaded", function () {
    console.log(pdfjsLib); // Check if it is defined
});

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs/pdf.worker.min.js';

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

async function loadPDFjs() {
  if (typeof pdfjsLib === 'undefined') {
    console.error('pdfjsLib is not defined. Ensure pdf.min.js is loaded.');
    try {
      // Wait for the pdf.js script to load
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

// Load a cached PDF (e.g., sample.pdf)
async function loadCachedPDF() {
  try {
    await loadPDFjs();
    const response = await fetch('sampleRelease.pdf');
    if (!response.ok) throw new Error('Failed to fetch cached PDF');
    const data = await response.arrayBuffer();
    const typedArray = new Uint8Array(data);
    const pdfDoc = await pdfjsLib.getDocument(typedArray).promise;
    const text = await extractTextFromPDF(pdfDoc);
    console.log('Extracted Text from Cached PDF:', text);
    alert('Text extracted from cached PDF! Check the console for the full text.');
  } catch (error) {
    console.error('Error loading cached PDF:', error);
    alert('Failed to load cached PDF. Check console for details.');
  }
}

var crewRgx = /(?<=\n)[A-Z]{2}:\s\d{6}\s(?:\w*\s?)*(?=\n)/gm;
displayClock();
setInterval(displayClock, 1000);

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

function loadRelease() {
  document.getElementById('inputText').style.display = 'none';
  document.getElementById('submitButton').style.display = 'none';
  var matchBox;
  var loopHelp = true;
  const textarea = document.getElementById('inputText');
  textarea.value = textContent = textarea.value; // Store text in variable

  var flightInformationRgx =
    /FLIGHT\s(\d{4})\/\/([A-Z]{4})-([A-Z]{4})\/\/ETE\s(\d{2}:\d{2})/gm;
  //1:Flight ID, 2:DEP, 3:ARR, 4:ETE
  matchBox = flightInformationRgx.exec(textContent);
  fltRls.ID = matchBox[1];
  fltRls.DEP = matchBox[2];
  fltRls.ARR = matchBox[3];
  fltRls.ETE = matchBox[4];

  var crewRgx = /(?<=\n)[A-Z]{2}:\s\d{6}\s(?:\w*\s?)*(?=\n)/gm;
  fltRls.Crew = [];
  while (loopHelp) {
    matchBox = crewRgx.exec(textContent);
    if (matchBox != null) {
      fltRls.Crew.push(matchBox);
    } else {
      loopHelp = false;
    }
  }

  var rlsNum = /RELEASE\sNO.\s\d{1,2}/gm;
  fltRls.rlsNum = rlsNum.exec(textContent);
  var aircraft = /(N\w{5})\s(E170.*)/gm; //1:Tail, 2:Type
  fltRls.aircraft = aircraft.exec(textContent);
  var authDep = /(?<=AUTHORIZED DATE\/TIME:\s)(\d{2}\w{3}\d{2})\s(\d{4}Z)/gm; //1:Date, 2:Time
  matchBox = authDep.exec(textContent);
  fltRls.SchedDate = matchBox[1];
  fltRls.SchedTime = matchBox[2];
  var skedDep = /(?<=SKED DEP DATE\/TIME:\s)(\d{2}\w{3}\d{2})\s(\d{4}Z)/gm; //1:Date, 2:Time
  var skedArr = /(?<=SKED ARR DATE\/TIME:\s)(\d{2}\w{3}\d{2})\s(\d{4}Z)/gm; //1:Date, 2:Time
  var payload = /PAYLOAD:\s(\d{1,5})\sPAYLOAD:\s(\d{1,5})/gm; //1:Planned, 2:Est Max
  var pax = /PAX:\s(\d{1,2})\sPAX:\s(\d{1,2})/gm; //1:Planned, 2:Est Max
  var bags = /BAGS:\s(\d{1,3})\sBAGS:\s(\d{1,3})/gm; //1:Planned, 2:Est Max
  var burn = /(BURN)\s(\d{4,5})\s(\d:\d{2})/gm //1:Quantity, 2:Time 
  var resrv = /(RESERVE)\s(\d{4,5})\s(\d:\d{2})/gm
  var hold = /(HOLD)\s(\d{3,5})\s(\d:\d{2})/gm
  var altF = /(ALT)\s(\d{1,5})\s(\d:\d{2})/gm
  var ballast = /(BALLAST)\s(\d{1,5})/gm
  var melF = /(MEL)\s(\d{1,5})\s(\d:\d{2})/gm
  var minF = /(MIN)\s(\d{1,5})\s(\d:\d{2})/gm
  var taxi = /(TAXI)\s(\d{1,5})\s(\d:\d{2})/gm
  var extra = /(EXTRA)\s(\d{1,5})\s(\d:\d{2})/gm
  var ramp = /(RAMP)\s(\d{1,5})\s(\d:\d{2})/gm
  fltRls.fuel = [];
  fltRls.fuel.push(burn.exec(textContent));
  fltRls.fuel.push(resrv.exec(textContent));
  fltRls.fuel.push(hold.exec(textContent));
  fltRls.fuel.push(altF.exec(textContent));
  fltRls.fuel.push(ballast.exec(textContent));
  fltRls.fuel.push(melF.exec(textContent));
  fltRls.fuel.push(minF.exec(textContent));
  fltRls.fuel.push(taxi.exec(textContent));
  fltRls.fuel.push(extra.exec(textContent));
  fltRls.fuel.push(ramp.exec(textContent));
  
  var MELs = /\w{2}-\w{2}-\w{2}-\w{1,2}\s.*/gm; // Try multiple matches
  var CDLs = /\w{2}-\w{2}-\w{2}\s.*/gm; // Try multiple matches
  var NEFs = /\w{2}-\w{2}-\w{3}.\s*/gm; // Try multiple matches
  var pages =
    /(?:REPUBLIC AIRWAYS BRIEF PAGE \d{1,2} OF \d{2})|(?:PAGE \d{1,2} OF \d{2})/g;

  displayRelease();
}

function displayRelease() {
  console.log(fltRls);
  createChild('titleDiv', 'h1', "RPA "+fltRls.ID);
  createChild('div1', 'h1',fltRls.rlsNum);
  createChild('div1', 'h1', fltRls.aircraft[1] +" - - - "+ fltRls.aircraft[2]);
  createChild('div1', 'h1', fltRls.DEP + ' - ' + fltRls.ARR);
  createChild('div1', 'h1', "SKED DEP " + fltRls.SchedTime);
  document.getElementById('div1').style.display = 'block';
  document.getElementById('fuel').style.display = 'block';
  const fuelTable = document.createElement('table');
  for (fuelLine in fltRls.fuel){
    var row = document.createElement("tr");
    
  }

}

function displayClock() {
  const now = new Date();
  const hours = String(now.getUTCHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const hoursL = String(now.getHours()).padStart(2, '0');
  document.getElementById('clock').innerHTML = hours + minutes + 'Z   /   '+hoursL + minutes + "L";
  
}

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
//Newest JS
