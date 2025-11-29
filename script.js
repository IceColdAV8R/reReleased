let extractedText = '';
var textContent ='';
let selectedFile = null; // Track user-selected PDF
const fltRls = {};

document.addEventListener('DOMContentLoaded', () => {
  setScreenSpaceDimensions();
});
function setScreenSpaceDimensions() {
  const topBox = document.getElementById('topBox');
  const navBar = document.getElementById('navBar');
  var h1 = window.getComputedStyle(topBox).height;
  var h2 = window.getComputedStyle(navBar).height;
  document.getElementById('sceneSpace').style.top = h1;
  document.getElementById('sceneSpace').style.bottom = h2+5;
}
document.addEventListener("DOMContentLoaded", function() {
    
});
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
        if (selectedFile) {
            const arrayBuffer = await selectedFile.arrayBuffer();
            const typedArray = new Uint8Array(arrayBuffer);
            const pdfDoc = await pdfjsLib.getDocument(typedArray).promise;
            extractedText = await extractTextFromPDF(pdfDoc);
            localStorage.setItem('extractedText', extractedText); // Save for offline
        } else {
            const cachedText = localStorage.getItem('extractedText');
            if (cachedText) {
                extractedText = cachedText; // Use cached text offline
            } else {
                const response = await fetch('/reReleased/sampleRelease.pdf');
                if (!response.ok) throw new Error('Failed to fetch cached PDF');
                const data = await response.arrayBuffer();
                const typedArray = new Uint8Array(data);
                const pdfDoc = await pdfjsLib.getDocument(typedArray).promise;
                extractedText = await extractTextFromPDF(pdfDoc);
                localStorage.setItem('extractedText', extractedText); // Save for offline
            }
        }
    } catch (error) {
        console.error('Error loading PDF:', error);
        alert('Failed to load PDF. Check console for details.');
    }
    loadRelease()
}

function loadRelease() {
  var matchBox;
  var match;
  var loopHelp = true;
  textContent = extractedText;
  var pageNumsRgx =
    /REPUBLIC AIRWAYS BRIEF PAGE \d\d? OF \d\d\s+PAGE \d\d? OF \d\d/g;
  textContent = textContent.replaceAll(pageNumsRgx, '');

  var flightInformationRgx =
    /FLIGHT\s(\d{4})\/\/([A-Z]{4})-([A-Z]{4})\/\/ETE\s(\d{2}:\d{2})/; //works
  //1:Flight ID, 2:DEP, 3:ARR, 4:ETE
  match = textContent.match(flightInformationRgx);
  fltRls.ID = match[1];
  fltRls.DEP = match[2];
  fltRls.ARR = match[3];
  fltRls.ETE = match[4];
  
  var crewRgx =
    /(?:CA:|FO:|FA:|JS:)\s*\d{6}\s*?(?:[a-zA-Z,\-,\.]*\s?){1,5}(?=\s*(?:CA:|FO:|FA:|JS:|FLIGHT|$))/gm; //works
  fltRls.Crew = [];
  while (loopHelp) {
    matchBox = crewRgx.exec(textContent);
    if (matchBox != null) {
      fltRls.Crew.push(matchBox);
    } else {
      loopHelp = false;
    }
  }
  
  	fltRls.Alt1=null
	fltRls.Alt2=null
	fltRls.AltTo=null
  var airportsRgx = /(?<=SPEEDS).*?(?=-)/;
  var airportsBlock = textContent.match(airportsRgx)[0].trim();
  var altsRgx = /^(?:\s{4}|(\w{4}))(?:\s{2})?(?:\s{4}|(\w{4}))?(?:\s{2})?(?:\s{4}|(\w{4}))?/
  if (airportsBlock.length > 10){
	var alts = airportsBlock.slice(10,airportsBlock.length).trim();
	var altsMatch = alts.match(altsRgx)
	fltRls.Alt1=altsMatch[1]
	fltRls.Alt2=altsMatch[2]
	fltRls.AltTo=altsMatch[3]
  }
	var EtaRgx = /(?<=ETA\s\w{4}).*?(\w{7})\s(\w{5})/
	fltRls.ETA = textContent.match(EtaRgx)
  var rlsNum = /RELEASE\sNO.\s\d{1,2}/gm; //works
  fltRls.rlsNum = rlsNum.exec(textContent);
  var aircraft = /(N\w{5})\s(E170-\d{3}\w{2})(.*?)(?=\s{5})/g; //1:Tail, 2:Type, 3:Tags
  fltRls.aircraft = aircraft.exec(textContent);
  var authDep = /(?<=AUTHORIZED DATE\/TIME:\s*)(\d{2}\w{3}\d{2})\s(\d{4}Z)/gm; //1:Date, 2:Time //works
  matchBox = authDep.exec(textContent);
  fltRls.AuthDep = [];
  fltRls.AuthDep.push(matchBox[1]);
  fltRls.AuthDep.push(matchBox[2]);
  var skedDep = /(?<=SKED DEP DATE\/TIME:\s*)(\d{2}\w{3}\d{2})\s(\d{4}Z)/gm; //1:Date, 2:Time //works
  matchBox = skedDep.exec(textContent);
  fltRls.SkedDep = [];
  fltRls.SkedDep.push(matchBox[1]);
  fltRls.SkedDep.push(matchBox[2]);
  var skedArr = /(?<=SKED ARR DATE\/TIME:\s*)(\d{2}\w{3}\d{2})\s(\d{4}Z)/gm; //1:Date, 2:Time //works
  matchBox = skedArr.exec(textContent);
  fltRls.SkedArr = [];
  fltRls.SkedArr.push(matchBox[1]);
  fltRls.SkedArr.push(matchBox[2]);
  var payload = /PAYLOAD:\s*(\d{1,5})\s*PAYLOAD:\s*(\d{1,5})/gm; //1:Planned, 2:Est Max //works
  matchBox = payload.exec(textContent);
  fltRls.Payload = [];
  fltRls.Payload.push(matchBox[1]);
  fltRls.Payload.push(matchBox[2]);
  var pax = /PAX:\s*(\d{1,2})\s*PAX:\s*(\d{1,2})/gm; //1:Planned, 2:Est Max //works
  matchBox = pax.exec(textContent);
  fltRls.Pax = [];
  fltRls.Pax.push(matchBox[1]);
  fltRls.Pax.push(matchBox[2]);
  var bags = /BAGS:\s*(\d{1,3})\s*BAGS:\s*(\d{1,3})/gm; //1:Planned, 2:Est Max //works
  matchBox = bags.exec(textContent);
  fltRls.Bags = [];
  fltRls.Bags.push(matchBox[1]);
  fltRls.Bags.push(matchBox[2]);
  var burn = /(BURN)\s*(\d{4,5})\s*(\d:\d{2})/gm; //1:Quantity, 2:Time //works
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

  var MELNEFs =
    /((?:\d{2}-\d{2}-\d{2}(?:\d|(?:-[A-Z])|(?:-\d{1,2})?))|[A-Z]{3,4}-99)\s*(\d{2}\w{3}\d{2}|-{7})([\s\S]{17})([\s\S]*?)(?:(?=CDL)|(?=REMARKS)|(?=(?:\d{2}-\d{2}-\d{2}(?:\d|(?:-[A-Z])|(?:-\d{1,2})?))|[A-Z]{3,4}-99))/gm; // Try multiple matches //works

  loopHelp = true;
  fltRls.MELs = [];
  while (loopHelp) {
    matchBox = MELNEFs.exec(textContent);
    if (matchBox != null) {
      fltRls.MELs.push(matchBox);
    } else {
      loopHelp = false;
    }
  }
  
  var route = /(\d{2,4}NM)\s*((?:\w{2,6}\s)*)(?=_)/gm; //1: Distance, 2: Route
  var navLog =
    /(?<WPT>[A-Z0-9]{3,6})\s*(?<FL>\w{3})\s*(?<WDIR>\d{3})\s*(?<OAT>\w{3})\s*(?<HDG>\d{3})\s*(?<IAS>\w{3})\s*(?<LEGD>\d{3,4})\s*(?<LEGT>\d:\d{2})\s*(?<LEGF>\d{4,5})\s*(?<MRQD>\d{4,5})\s*(?<AWAY>\w{2,6})\s*(?<WSPD>\d{3})\s*(?<ISA>\w{3})\s*(?<CRS>\d{3})\s*(?<MACH>\w{3})\s*(?<TOTD>\d{3})\s*(?<TOTT>\d:\d{2})\s*(?<TOTF>\d{3,6})\s*_{6}\s_{6}\s*(?<MORA>\d{4,5})\s*(?<EDR>\d.\d{2})?\s*(?<TAS>\d{3})\s*(?<REMD>\d{3,4})\s*(?<REMT>\d:\d{2})\s*(?<REMF>\d{1,5})/gm;
  loopHelp = true;
  fltRls.NavLog = [];



  while (loopHelp) {
    matchBox = navLog.exec(textContent);
    if (matchBox != null) {
      fltRls.NavLog.push(matchBox);
    } else {
      loopHelp = false;
    }
  }
  fltRls.depDate = parseDateTime(fltRls.AuthDep[0],fltRls.AuthDep[1])
  fltRls.arrDate = parseDateTime(fltRls.ETA[1],fltRls.ETA[2])
  var rmksRegex = /REMARKS:.*?DESK\s\d{1,3}/
  var remarks = textContent.match(rmksRegex)[0]
  fltRls.remarks = remarks.replaceAll(/\s+/g," ")
    createFuelLog();
  loadTakeoffData();
  loadNOTAMS();
  loadWeather();
  //setActiveWeather();

  displayRelease();
}
function loadTakeoffData() {
  var RWYstarts = [];
  var RWYs = /(?:\s\d{2})(?:\S|\s){20}\d{4}\s{2}\d{4}/g; //WIP
  RWYstarts = [...textContent.matchAll(RWYs)].map(match => match.index);
  var toRWYs = [];
  for (index in RWYstarts) {
    var indexNum = parseInt(index);
    const RWY = {};
    RWY.startIdx = RWYstarts[index];

    if (indexNum < RWYstarts.length - 1) {
      index2 = indexNum + 1;
      RWY.endIdx = RWYstarts[index2] - 1;
    } else {
      RWY.endIdx = textContent.search(/-{12}\sSPECIAL|\/{3}\sLANDING/) - 1;
    }
    toRWYs.push(RWY);
  }

  for (i in toRWYs) {
    var rwy = toRWYs[i];
    rwy.whole = textContent.slice(rwy.startIdx, rwy.endIdx + 1);
    rwy.id = rwy.whole.slice(0, 13).trim();
    rwy.acars = rwy.whole.slice(13, 21).trim();
    rwy.length = rwy.whole.slice(21, 27).trim();
    rwy.pmtow = rwy.whole.slice(28, 33).trim();
    rwy.engOut = rwy.whole.slice(33, 41).trim();
    rwy.notesText = rwy.whole.slice(41).trim().replace(/\s+/g, ' ');

    var notamIdx = rwy.notesText.search(/NOTAMS/g);
    if (notamIdx === 0) {
      rwy.notes = '';
    } else if (notamIdx === -1) {
      rwy.notes = rwy.notesText;
    } else {
      rwy.notes = rwy.notesText.slice(0, notamIdx);
    }

    var notamsRgx = /(?<=NOTAMS)[\s\S]*/g;
    var notamsTxt = notamsRgx.exec(rwy.notesText);

    var notamRgx = /\S+/g;
    loopHelp = true;
    rwy.notams = [];

    if (!notamsTxt) {
      loopHelp = false;
    }
    while (loopHelp) {
      matchBox = notamRgx.exec(notamsTxt);
      if (matchBox) {
        rwy.notams.push(matchBox);
      } else {
        loopHelp = false;
      }
    }
    toRWYs[i] = rwy;
  }
  fltRls.runwaysTO = toRWYs;
}

function loadNOTAMS() {
	
  var rawNotams = [];
  var notamsRgx =
    /([A-Z]\d{4}\/\d{2}|\d{2}\/\d{3}|\d\/\d{4})\s+(\d{2}[A-Z]{3}\d{2})\s+(\d{4})\s+(?:(\d{2}[A-Z]{3}\d{2})\s+(\d{4})|(UFN))(.*?)(?=(?:[A-Z]\d{4}\/\d{2}|\d{2}\/\d{3}|\d\/\d{4})\s+(?:\d{2}[A-Z]{3}\d{2})\s+(?:\d{4})\s+(?:(?:\d{2}[A-Z]{3}\d{2})\s+(?:\d{4})|(?:UFN)))/g;
  var matches = textContent.matchAll(notamsRgx);
  for (const match of matches) {
    rawNotams.push(match);
  }

  //Get list of all airport names in NOTAMS
  var airportNamesRgx = /(?<=Description:\s+)(.{1,60})\((\w{4})\/\w{3}\)/g;
  var firNamesRgx = /(?<=Description:\s+)(.{1,40}FIR)\s\((\w{4})\)/g;
  var airportNames = [];
  var firNames = [];
	fltRls.notams = [];
  matches = textContent.matchAll(airportNamesRgx);
  var nameHolder = '';
  for (const match of matches) {
    if (nameHolder !== match[1]) {
      airportNames.push(match);
      nameHolder = match[1];
    }
  }

  matches = textContent.matchAll(firNamesRgx);
 
  for (const match of matches) {
    if (nameHolder !== match[1]) {
      firNames.push(match);
      nameHolder = match[1];
    }
  }
  
  var airportFirNames = [];
  airportFirNames = airportNames.concat(firNames);

  for (let i = 0; i < airportFirNames.length; i++) {
    var sectionStart;
    sectionStartRgx = new RegExp(
      '(?<!\\(.{4}\\/.{3}\\).{1,40})' + escapeRegExp(airportFirNames[i][0]),
      'g'
    );
    sectionStart = textContent.search(sectionStartRgx);
    airportFirNames[i][3] = sectionStart;
  }

  for (let i = 0; i < airportFirNames.length; i++) {
    if (i === airportFirNames.length - 1) {
      airportFirNames[i][4] = textContent.length - 1;
    } else {
      airportFirNames[i][4] = airportFirNames[i + 1][3] - 1;
    }
  }

  // Loop through each airport/FIR
  for (let i = 0; i < airportFirNames.length; i++) {
    var notamCat = '';
    var notams = [];
    var notamSection = textContent.slice(
      airportFirNames[i][3],
      airportFirNames[i][4]
    );
    var notamRgx =
      /([A-Z]\d{4}\/\d{2}|\d{2}\/\d{3}|\d\/\d{4})\s+(\d{2}[A-Z]{3}\d{2})\s+(\d{4})\s+(?:(\d{2}[A-Z]{3}\d{2})\s+(\d{4})|(UFN))(.*?)(?=\s(?:[A-Z]\d{4}\/\d{2}|\d{2}\/\d{3}|\d\/\d{4})\s+(?:\d{2}[A-Z]{3}\d{2})\s+(?:\d{4})\s+(?:(?:\d{2}[A-Z]{3}\d{2})\s+(?:\d{4})|(?:UFN))|$)/g;

    function generateRegex(categories) {
      // Remove duplicates from the categories list
      const uniqueCategories = [...new Set(categories)];
      
      // Process each category: escape special characters and replace spaces with \s
      const processedCategories = uniqueCategories.map(cat => {
          // Escape special regex characters
          const escaped = cat.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          // Replace spaces with \s to match any whitespace
          const withWhitespace = escaped.replace(/ /g, '\\s');
          return withWhitespace;
      });
      
      // Join the processed categories with | to form alternatives
      const categoriesPattern = processedCategories.join('|');
      
      // Define the lookahead for NOTAM identifier or end of string
      const lookahead = '(?=.{1,5}(?:[A-Z]\\d{4}/\\d{2}|\\d{2}/\\d{3}|\\d/\\d{4})|\\s*$)';
      
      // Combine into the full regex pattern
      const regexPattern = `(?:${categoriesPattern})${lookahead}`;
      
      return regexPattern;
  }

  // Example list of categories
  const categories = [
      "AERODROME",
      "DAYLIGHT MARKINGS",
      "RUNWAY",
      "APRON",
      "TAXIWAY(S)",
      "APPROACH LIGHT SYSTEM",
      "AERODROME BEACON",
      "PRECISION APPROACH PATH INDICATOR",
      "TAXIWAY CENTRELINE LIGHTS",
      "ILS",
      "TACAN",
      "VOR",
      "GLIDE PATH (ILS)",
      "INNER MARKER (ILS)",
      "OBSTACLE",
      "OBSTACLE LIGHTS ON . . .",
      "STANDARD INSTRUMENT ARRIVAL (STAR)",
      "STANDARD INSTRUMENT DEPARTURE (SID)",
      "INSTRUMENT APPROACH PROCEDURE",
      "ATS ROUTE",
      "OBSTACLE CLEARANCE LIMIT",
      "RESTRICTED AREA",
      "APPROACH CONTROL SERVICE (APP)",
      "UNCATEGORISED",
      "TEMPORARY RESTRICTED AREA",
      "GLIDER FLYING",
      "PARACHUTE JUMPING EXERCISE",
      "METEOROLOGICAL SERVICE",
      "SEQUENCED FLASHING LIGHTS",
      "RUNWAY TOUCHDOWN ZONE LIGHTS",
      "DME ASSOCIATED WITH ILS",
      "ILS CATEGORY II",
      "RUNWAY END IDENTIFIER LIGHTS",
      "RUNWAY ALIGNMENT INDICATOR LIGHTS",
      "LASER EMISSION",
      "CONTROL AREA (CTA)",
      "DANGER AREA",
      "RUNWAY CENTRELINE LIGHTS",
      "AIRSPACE RESERVATION",
      "SURFACE MOVEMENT RADAR",
      "TRANSMISSOMETER",
      "TEMPORARY RESTRICTED AREA",
      "AIR/GROUND FACILITY"
  ];

  // Generate and use the regex pattern
  const ntmCatPtrn = generateRegex(categories);
  const NotamCatRgx = new RegExp(ntmCatPtrn, 'g');

  pageBreakRgx = new RegExp(
      fltRls.DEP + '\\s\\(.+?\\)\\s-.*?Description:',
      'g'
  );
  notamSection = notamSection.replaceAll(pageBreakRgx, '');
  notamCat = NotamCatRgx.exec(notamSection);
  matches = notamSection.matchAll(notamRgx);
  // Loop through each NOTAM
  for (const match of matches) {
    const notam = {};
    notam.parentName = airportFirNames[i][1];
    notam.parentICAO = airportFirNames[i][2];
    notam.category = notamCat;
    notam.ID = match[1];
    notam.effDate = toDateObject(match[2], match[3]);
    if (match[4]) {
      notam.expDate = toDateObject(match[4], match[5]);
    } else {
      notam.expDate = null;
    }
    var fieldAndFirRgx =  new RegExp(escapeRegExp(airportFirNames[i][0])+",.{1,50}\\(\\w{4}\\)");
    if (NotamCatRgx.test(match[7])) {
      //GET NOTAM CATEGORY, THEN DELETE IT
      notam.category = notamCat;
      notamCat = match[7].match(NotamCatRgx)[0];
      notam.body = match[7].replace(NotamCatRgx, '');
      notam.body = notam.body.replace(fieldAndFirRgx,"")
    } else {
      notam.body = match[7];
      notam.category = notamCat
      notam.body = notam.body.replace(fieldAndFirRgx,"")
    }
    notam.selected = false; // Initialize selected property
    fltRls.notams.push(notam);
  }
}
}

function loadWeather() {
  const weather = {};
  weather.dep = getWeather(fltRls.DEP);
  weather.arr = getWeather(fltRls.ARR);
  if (fltRls.Alt1){
    weather.alt1 = getWeather(fltRls.Alt1)
  }
  if (fltRls.Alt2){
    weather.alt2 = getWeather(fltRls.Alt2)
  }
  if (fltRls.AltTo){
    weather.altTo = getWeather(fltRls.AltTo)
  }
  fltRls.weather = weather;
}

function getWeather(icao) {
  var metarRgx = new RegExp(
    '(?:SPECI|METAR)\\s*?' + icao + '.*?(\\d{6}).*?(?=SPECI|METAR|TAF)'
  );
  var tafRgx = new RegExp('(?:TAF)(?:\\sAMD)?\\s{2}' + icao + '.*?(?=TAF)');
  var tafSubRgx =
    /(?:(BECMG|PROB\d{2}|TEMPO)\s(\d{4})\/(\d{4})|FM(\d{6}))(.*?)(?=FM|BECMG|PROB|TEMPO|TAF|$)/g;
  var tafMainRgx = /TAF.*?(\d{6})Z\s(\d{4})\/(\d{4}).*?(?=FM|BECMG|TEMPO|PROB|TAF|$)/;
  var metarText = textContent.match(metarRgx);
  var tafText = textContent.match(tafRgx);
  var tafBody = tafText[0].match(tafMainRgx);
  var tafSubs = [];
  var matches = tafText[0].matchAll(tafSubRgx);
  for (const match of matches) {
    const tafSub = {};
    tafSub.text = match[0];
    if (match[2]) {
      tafSub.begin = parseDDHH(match[2]);
      tafSub.end = parseDDHH(match[3]);
    } else {
      tafSub.begin = parseDDHH(match[4]);
      tafSub.end = null;
    }
    tafSub.selected = false;
    tafSubs.push(tafSub);
  }
  var metar = {};
  metar.issued = parseDDHHMM(metarText[1]);
  metar.text = metarText[0];
  metar.selected = false;
  var taf = {};
  taf.issued = parseDDHH(tafBody[1]);
  taf.begin = parseDDHH(tafBody[2]);
  taf.end = parseDDHH(tafBody[3]);
  taf.text = tafBody[0];
  taf.subs = tafSubs;
  taf.selected = false;
 
  var wx = {};
  wx.metar = metar;
  wx.taf = taf;
  wx.name = icao;
  return wx;
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()/|[\]\\]/g, '\\$&');
}
function toDateObject(dateStr, timeStr) {
  // Validate input formats
  if (!/^\d{2}[A-Z]{3}\d{2}$/.test(dateStr)) {
    throw new Error('Invalid date format. Expected DDMMMYY (e.g., 25JAN23)');
  }
  if (!/^\d{4}$/.test(timeStr)) {
    throw new Error('Invalid time format. Expected HHMM (e.g., 1430)');
  }

  // Extract date components
  const day = dateStr.slice(0, 2);
  const monthStr = dateStr.slice(2, 5);
  const year = '20' + dateStr.slice(5, 7); // Assuming 20XX years

  // Map month abbreviations to numbers (0-based for JavaScript Date)
  const monthMap = {
    JAN: 0,
    FEB: 1,
    MAR: 2,
    APR: 3,
    MAY: 4,
    JUN: 5,
    JUL: 6,
    AUG: 7,
    SEP: 8,
    OCT: 9,
    NOV: 10,
    DEC: 11,
  };
  const month = monthMap[monthStr.toUpperCase()];
  if (month === undefined) {
    throw new Error('Invalid month abbreviation. Expected JAN-DEC');
  }

  // Extract time components
  const hours = timeStr.slice(0, 2);
  const minutes = timeStr.slice(2, 4);

  // Validate numeric ranges
  const dayNum = parseInt(day, 10);
  const hoursNum = parseInt(hours, 10);
  const minutesNum = parseInt(minutes, 10);
  if (dayNum < 1 || dayNum > 31) {
    throw new Error('Invalid day. Expected 01-31');
  }
  if (hoursNum > 23) {
    throw new Error('Invalid hours. Expected 00-23');
  }
  if (minutesNum > 59) {
    throw new Error('Invalid minutes. Expected 00-59');
  }

  // Create Date object (UTC)
  const date = new Date(
    Date.UTC(parseInt(year, 10), month, dayNum, hoursNum, minutesNum)
  );

  // Check if the date is valid
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date or time');
  }

  return date;
}
function parseDDHH(ddhhString) {
  // Validate input
  if (typeof ddhhString !== 'string' || !/^\d{4}(\d{2})?$/.test(ddhhString)) {
    throw new Error(
      'Input must be a 4-digit (DDHH) or 6-digit (DDHHHH) string'
    );
  }

  // Extract day, hour, and minutes
  const isDDHHHH = ddhhString.length === 6;
  const day = parseInt(ddhhString.slice(0, 2), 10);
  const hour = parseInt(ddhhString.slice(2, 4), 10);
  const minutes = isDDHHHH ? parseInt(ddhhString.slice(4, 6), 10) : 0;

  // Create Date object (current year and month, UTC)
  const now = new Date();
  const date = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day, hour, minutes, 0)
  );

  return date;
}
function parseDDHHMM(ddhhmmString) {
  // Validate input
  if (typeof ddhhmmString !== 'string' || !/^\d{6}$/.test(ddhhmmString)) {
    throw new Error('Input must be a 6-digit string in DDHHMM format');
  }

  // Extract day, hour, and minutes
  const day = parseInt(ddhhmmString.slice(0, 2), 10);
  const hour = parseInt(ddhhmmString.slice(2, 4), 10);
  const minutes = parseInt(ddhhmmString.slice(4, 6), 10);

  // Create Date object (current year and month, UTC)
  const now = new Date();
  const date = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day, hour, minutes, 0)
  );

  return date;
}
function displayRelease() {
  document.getElementById('debugDiv').style.display = 'none';
  document.getElementById('fltNum').style.display = 'block';
  document.getElementById('fltNum').innerHTML = fltRls.ID;

  document.getElementById('DepArr').innerHTML = fltRls.DEP + ' - ' + fltRls.ARR;
  document.getElementById('aircraft').innerHTML = fltRls.aircraft[1]+ " "+fltRls.aircraft[2];
  document.getElementById('acftComments').innerHTML = fltRls.aircraft[3];
  document.getElementById('rlsNum').innerHTML = fltRls.rlsNum;
  document.getElementById('authOut').innerHTML = "Authorized Out: " + fltRls.AuthDep[1];
  document.getElementById('ETE').innerHTML = "Estimated Enroute: "+fltRls.ETE;
  document.getElementById('rampFuel').innerHTML = "Ramp Fuel: " +fltRls.fuel[9][2];
  document.getElementById('remarks').innerHTML = fltRls.remarks;
  displayWeather()
  displayNOTAMS()
  createNavLogTable()
  for (const x of fltRls.Crew) {
    var row = document.createElement('tr');
    row.innerHTML = '<td>' + x + '</td>';
    document.getElementById('crew').appendChild(row);
  }
  populateMELsTable();
  console.log(fltRls);

  setScreenSpaceDimensions();
  showScreen(1);
}

function displayClock() {
  const now = new Date();
  const hours = String(now.getUTCHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const hoursL = String(now.getHours()).padStart(2, '0');
  document.getElementById('clock').innerHTML = hours + minutes + 'Z   /   ' + hoursL + minutes + 'L';
}
document.addEventListener('DOMContentLoaded', () => {
  displayClock();
  setInterval(displayClock, 1000);
});

function showScreen(screenNumber) {
  document.querySelectorAll('.screen').forEach(screen => {
    screen.style.display = 'none';
  });

  document.getElementById(`screen${screenNumber}`).style.display = 'block';
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

async function forcePWAUpdate() {
  try {
    // Check if Service Worker is supported
    if ('serviceWorker' in navigator) {
      // Unregister all Service Workers
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
      console.log('Service Workers unregistered');
      
      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
        console.log('Caches cleared');
      }
      
      // Reload the page to fetch the latest content
      window.location.reload(true);
    } else {
      console.log('Service Worker not supported in this browser');
      // Fallback: reload the page
      window.location.reload(true);
    }
  } catch (error) {
    console.error('Error forcing PWA update:', error);
  }
}
function populateMELsTable() {
  const table = document.getElementById('MELs');
  if (!table) {
    console.error('Table with ID "MELs" not found');
    return;
  }

  if (!fltRls || !fltRls.MELs || fltRls.MELs.length === 0) {
    // Add a single row with one full-width "None" cell
    const row = table.insertRow();
    const cell = row.insertCell();
    cell.textContent = 'None';
    cell.setAttribute('colspan', '3');
  } else {
    // Add two rows for each MEL: 3 cells (indices 1-3), then 1 cell (index 4) spanning all columns
    fltRls.MELs.forEach(mel => {
      // First row with indices 1, 2, 3
      const row1 = table.insertRow();
      for (let i = 1; i <= 3; i++) {
        const cell = row1.insertCell();
        cell.textContent = mel[i] || ''; // Use empty string if index is undefined
      }
      // Second row with index 4, spanning 3 columns
      const row2 = table.insertRow();
      const cell = row2.insertCell();
      cell.textContent = mel[4] || '';
      cell.setAttribute('colspan', '3');
    });
  }
}
function displayWeather() {
  const weatherDiv = document.getElementById('weather');
  // Clear any existing content
  weatherDiv.innerHTML = '';

  const airfieldTypes = ['dep', 'arr', 'alt1', 'alt2', 'altTo'];
  const typeNames = {
    dep: 'Departure',
    arr: 'Arrival',
    alt1: '1st Alternate',
    alt2: '2nd Alternate',
    altTo: 'Takeoff Alternate'
  };

  for (const type of airfieldTypes) {
    if (fltRls.weather[type]) {
      const airfield = fltRls.weather[type];
      const displayName = typeNames[type];
      const icao = airfield.name;

      // Create a div for each airfield
      const airfieldDiv = document.createElement('div');
      airfieldDiv.className = 'airfield-weather';

      // Add heading with ICAO and nature, include departure time for 'dep'
      const h3 = document.createElement('h3');
      if (type === 'dep' && fltRls.AuthDep && fltRls.AuthDep[1]) {
        h3.textContent = `${icao} - ${displayName} ${fltRls.AuthDep[1]}`;
      } 
      else if (type === 'arr' && fltRls.ETA && fltRls.ETA[2]) {
        h3.textContent = `${icao} - ${displayName} ${fltRls.ETA[2]}`;
      } else {
        h3.textContent = `${icao} - ${displayName}`;
      }
      airfieldDiv.appendChild(h3);

      // Add METAR information
      if (airfield.metar && airfield.metar.text) {
        const metarP = document.createElement('p');
        const metarCode = document.createElement('code');
        metarCode.textContent = airfield.metar.text;
        metarP.appendChild(metarCode);
        airfieldDiv.appendChild(metarP);
        metarP.classList.toggle('selected', airfield.metar.selected);
        metarP.addEventListener('click', () => {
          airfield.metar.selected = !airfield.metar.selected;
          metarP.classList.toggle('selected');
        });
      }

      // Add TAF information
      if (airfield.taf && airfield.taf.text) {
        const tafP = document.createElement('p');
        const tafCode = document.createElement('code');
        tafCode.textContent = airfield.taf.text;
        tafP.appendChild(tafCode);
        if (airfield.taf.active) {
          tafP.classList.add('active-forecast');
        }
        tafP.classList.toggle('selected', airfield.taf.selected);
        tafP.addEventListener('click', () => {
          airfield.taf.selected = !airfield.taf.selected;
          tafP.classList.toggle('selected');
        });
        airfieldDiv.appendChild(tafP);

        // Add TAF sub forecasts if they exist
        if (airfield.taf.subs && airfield.taf.subs.length > 0) {
          const subsDiv = document.createElement('div');
          subsDiv.className = 'taf-subs';
          airfield.taf.subs.forEach((sub) => {
            const subP = document.createElement('p');
            const subCode = document.createElement('code');
            subCode.textContent = sub.text;
            subP.appendChild(subCode);
            if (sub.active) {
              subP.classList.add('active-forecast');
            }
            subP.classList.toggle('selected', sub.selected);
            subP.addEventListener('click', () => {
              sub.selected = !sub.selected;
              subP.classList.toggle('selected');
            });
            subsDiv.appendChild(subP);
          });
          airfieldDiv.appendChild(subsDiv);
        }
      }

      // Append the airfield div to the weather div
      weatherDiv.appendChild(airfieldDiv);
    }
  }
}

const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function formatDate(date) {
  if (!date) return 'UFN';
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = months[date.getUTCMonth()];
  const year = String(date.getUTCFullYear()).slice(-2);
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${day}${month}${year} ${hours}${minutes}Z`;
}

function trimLines(text) {
  return text.split('\n').map(line => line.trim()).join('\n');
}

function displayNOTAMS() {
  const container = document.getElementById('notamsDisplay');
  if (!container) {
    console.error('Container element "notamsDisplay" not found.');
    return;
  }

  // Track open state of details elements before clearing
  const openDetails = new Set();
  document.querySelectorAll('#notamsDisplay details[open]').forEach(details => {
    const summary = details.querySelector('summary');
    if (summary) {
      openDetails.add(summary.textContent);
    }
  });

  container.innerHTML = '';

  const notamsByICAO = {};
  fltRls.notams.forEach(notam => {
    const icao = notam.parentICAO;
    const originalCategory = notam.category || 'UNCATEGORISED';
    
    // Add to original category
    if (!notamsByICAO[icao]) {
      notamsByICAO[icao] = {};
    }
    if (!notamsByICAO[icao][originalCategory]) {
      notamsByICAO[icao][originalCategory] = [];
    }
    notamsByICAO[icao][originalCategory].push(notam);

    // If selected, also add to SELECTED category
    if (notam.selected) {
      if (!notamsByICAO[icao]['SELECTED']) {
        notamsByICAO[icao]['SELECTED'] = [];
      }
      notamsByICAO[icao]['SELECTED'].push(notam);
    }
  });

  for (const icao in notamsByICAO) {
    const icaoGroup = document.createElement('div');
    icaoGroup.className = 'icao-group';

    const heading = document.createElement('h3');
    const parentName = fltRls.notams.find(n => n.parentICAO === icao).parentName.trim();
    heading.textContent = `${icao} - ${parentName}`;
    icaoGroup.appendChild(heading);

    // Define category order, with SELECTED at the top
    const categoryOrder = ['SELECTED', ...Object.keys(notamsByICAO[icao]).filter(cat => cat !== 'SELECTED')];

    for (const category of categoryOrder) {
      if (!notamsByICAO[icao][category]) continue; // Skip if category doesn't exist
      const details = document.createElement('details');
      if (category === 'SELECTED') {
        details.className = 'selected-category';
        details.style.display = notamsByICAO[icao][category].length > 0 ? 'block' : 'none';
      }

      const summary = document.createElement('summary');
      summary.textContent = category;
      details.appendChild(summary);

      const categoryContainer = document.createElement('div');
      categoryContainer.className = 'notam-category';
      notamsByICAO[icao][category].forEach((notam, index) => {
        const notamDiv = document.createElement('div');
        notamDiv.className = 'notam-item';
        if (notam.selected) {
          notamDiv.classList.add('selected');
        }
        
        const pBody = document.createElement('p');
        pBody.innerHTML = `<strong>${notam.ID}</strong> - ${trimLines(notam.body)}`;
        
        const pEffective = document.createElement('p');
        pEffective.textContent = `Effective: ${formatDate(notam.effDate)}`;
        
        const pExpires = document.createElement('p');
        pExpires.textContent = `Expires: ${formatDate(notam.expDate)}`;
        
        notamDiv.appendChild(pBody);
        notamDiv.appendChild(pEffective);
        notamDiv.appendChild(pExpires);

        // Add click event listener to toggle selection
        notamDiv.addEventListener('click', () => {
          notam.selected = !notam.selected; // Toggle selected state
          notamDiv.classList.toggle('selected', notam.selected); // Update visual highlight

        });

        categoryContainer.appendChild(notamDiv);
      });
      details.appendChild(categoryContainer);
      icaoGroup.appendChild(details);
    }
    container.appendChild(icaoGroup);
  }
}
function showHideWx() {
    const weatherDiv = document.getElementById("weather");
    weatherDiv.style.display = weatherDiv.style.display === "none" ? "block" : "none";
}

async function waitForTextContent() {
    return new Promise((resolve) => {
        const checkText = () => {
            if (extractedText !== '') {
                resolve();
            } else {
                setTimeout(checkText, 100); // Check every 100ms
            }
        };
        checkText();
    });
}

async function loadReleaseWithWait() {
    await waitForTextContent();
    if (textContent === '') {
        textContent = extractedText;
    }
    if (textContent === '') {
        console.error('textContent is still empty after waiting.');
        alert('No text available to process.');
        return;
    }
    // Proceed with the rest of loadRelease() logic
    var matchBox;
    var match;
    var loopHelp = true;
    var pageNumsRgx = /REPUBLIC AIRWAYS BRIEF PAGE \d\d? OF \d\d\s+PAGE \d\d? OF \d\d/g;
    textContent = textContent.replaceAll(pageNumsRgx, '');
    // ... rest of the loadRelease() code ...
}

async function refreshPageOfflineSafe() {
  try {
    // Reset app state (clear UI and variables)
    resetAppState();

    // Reload the page without forcing a network fetch
    window.location.reload(false); // Soft reload uses cached resources
  } catch (error) {
    console.error('Error during offline-safe page refresh:', error);
    alert('Failed to refresh page. Please try again.');
  }
}

function createNavLogTable() {
  const screen5 = document.getElementById('screen5');
  if (!screen5) {
    console.error('screen5 div not found');
    return;
  }
  fltRls.NavLog.forEach(waypoint => {
    const div = document.createElement('div');
    div.className = 'defaultBox';
    const h1 = document.createElement('h1');
    h1.textContent = waypoint[1];
    div.appendChild(h1);
	const p = document.createElement('p');
	p.textContent = waypoint[3] + "/" + waypoint[12] + "kts";
	div.appendChild(p);
    const table = document.createElement('table');
    const row1 = table.insertRow();
    const legLabelCell = row1.insertCell();
    legLabelCell.textContent = 'LEG';
    const legDistCell = row1.insertCell();
    legDistCell.textContent = waypoint[7].concat("nm");
    const legTimeCell = row1.insertCell();
    legTimeCell.textContent = waypoint[8];
    const legFuelCell = row1.insertCell();
    legFuelCell.textContent = waypoint[9].concat("lbs");
    const row2 = table.insertRow();
    const totLabelCell = row2.insertCell();
    totLabelCell.textContent = 'TOTAL';
    const totDistCell = row2.insertCell();
    totDistCell.textContent = waypoint[16].concat("nm");
    const totTimeCell = row2.insertCell();
    totTimeCell.textContent = waypoint[17];
    const totFuelCell = row2.insertCell();
    totFuelCell.textContent = waypoint[18].concat("lbs");
    const row3 = table.insertRow();
    const remLabelCell = row3.insertCell();
    remLabelCell.textContent = 'REMAIN';
    const remDistCell = row3.insertCell();
    remDistCell.textContent = waypoint[22].concat("nm");
    const remTimeCell = row3.insertCell();
    remTimeCell.textContent = waypoint[23];
    const remFuelCell = row3.insertCell();
    remFuelCell.textContent = waypoint[24].concat("lbs");
    div.appendChild(table);
    screen5.appendChild(div);
	
	    // Add Fuel Log button
    const fuelLogButton = document.createElement('button');
    fuelLogButton.textContent = 'Fuel Log';
    fuelLogButton.className = 'navButton';
	fuelLogButton.id = waypoint[1];
    div.appendChild(fuelLogButton);
	
	//Add fuel log Table
	const table2 = document.createElement('table');
	table2.id = waypoint[1]+"fuelTable";
	//row 1
	const t2r1 = table2.insertRow();
	const r1c1 = t2r1.insertCell();
	r1c1.textContent = "-"
	const r1c2 = t2r1.insertCell();
	r1c2.textContent = "Expected";
	const r1c3 = t2r1.insertCell();
	r1c3.textContent = "Actual";
	const r1c4 = t2r1.insertCell();
	r1c4.textContent = "-"
	const r1c5 = t2r1.insertCell();
	r1c5.textContent = "-"
	const r1c6 = t2r1.insertCell();
	r1c6.textContent = "Δ";
	//row 2
	const t2r2 = table2.insertRow();
	const r2c1 = t2r2.insertCell();
	r2c1.textContent = "Time";
	const r2c2 = t2r2.insertCell();
	r2c2.textContent = "-";
	r2c2.id = waypoint[1] + "expTime";
	const r2c3 = t2r2.insertCell();
	r2c3.textContent = "-";
	r2c3.id = waypoint[1] + "actTime";
	//timeUp button
	const r2c4 = t2r2.insertCell();
	const timeUpBtn = document.createElement("button");
	timeUpBtn.className = "navButton";
	timeUpBtn.textContent = "+";
	timeUpBtn.id = waypoint[1]+"timeUp";
	r2c4.appendChild(timeUpBtn);
	//timeDown button
	const r2c5 = t2r2.insertCell();
	const timeDwnBtn = document.createElement("button");
	timeDwnBtn.className = "navButton";
	timeDwnBtn.textContent = "-";
	timeDwnBtn.id = waypoint[1]+"timeDwn";
	r2c5.appendChild(timeDwnBtn);
	const r2c6 = t2r2.insertCell();
	r2c6.id = waypoint[1]+"dTime";
	div.appendChild(table2);
	//row3
	const t2r3 = table2.insertRow();
	const r3c1 = t2r3.insertCell();
	r3c1.textContent = "Fuel";
	const r3c2 = t2r3.insertCell();
	r3c2.textContent = "-";
	r3c2.id = waypoint[1] + "expFuel";
	const r3c3 = t2r3.insertCell();
	r3c3.textContent = "-";
	r3c3.id = waypoint[1] + "actFuel";
	//fuelUp button
	const r3c4 = t2r3.insertCell();
	const fuelUpBtn = document.createElement("button");
	fuelUpBtn.className = "navButton";
	fuelUpBtn.textContent = "+";
	fuelUpBtn.id = waypoint[1]+"fuelUp";
	r3c4.appendChild(fuelUpBtn);
	//fuelDown button
	const r3c5 = t2r3.insertCell();
	const fuelDwnBtn = document.createElement("button");
	fuelDwnBtn.className = "navButton";
	fuelDwnBtn.textContent = "-";
	fuelDwnBtn.id = waypoint[1]+"fuelDwn";
	r3c5.appendChild(fuelDwnBtn);
	const r3c6 = t2r3.insertCell();
	r3c6.id = waypoint[1]+"dFuel";
	div.appendChild(table2);
  });
  updateFuelLogValues()
  
document.getElementById('screen5').addEventListener('click', function(event) {
  const target = event.target;
  
  if (target.tagName === 'BUTTON') {
    const buttonId = target.id;

    // Handle odfUp and odfDwn buttons for actTOFuel
    if (buttonId === 'odfUp') {
      fltRls.fuelLog.actTOFuel += 100;
    } else if (buttonId === 'odfDwn') {
      fltRls.fuelLog.actTOFuel -= 100;
    } else {
      // Handle waypoint-specific buttons
      const waypoint = buttonId.replace(/timeUp|timeDwn|fuelUp|fuelDwn$/, '');
      const wpt = fltRls.fuelLog.wpts.find(w => w.name === waypoint);
      if (!wpt) return;

      if (buttonId.endsWith('timeUp')) {
        wpt.actTime += 1;
      } else if (buttonId.endsWith('timeDwn')) {
        wpt.actTime -= 1;
      } else if (buttonId.endsWith('fuelUp')) {
        wpt.actFuel += 10;
      } else if (buttonId.endsWith('fuelDwn')) {
        wpt.actFuel -= 10;
      }
    }
    updateFuelLogValues();
  } else if (target.tagName === 'TD' && target.id.endsWith('actFuel')) {
    const waypoint = target.id.replace('actFuel', '');
    const wpt = fltRls.fuelLog.wpts.find(w => w.name === waypoint);
    if (!wpt) return;

    const newFuel = prompt("Enter actual fuel:");
    if (newFuel !== null && !isNaN(parseInt(newFuel))) {
      wpt.actFuel = parseInt(newFuel);
      updateFuelLogValues();
    }
  }
});
}

function parseDateTime(dateStr, timeStr) {
  // Ensure inputs are strings and have correct lengths
  if (typeof dateStr !== 'string' || typeof timeStr !== 'string') {
    throw new Error('Inputs must be strings');
  }
  if (dateStr.length !== 7 || timeStr.length !== 5) {
    throw new Error('Invalid format: Date must be DDMMMYY, Time must be HHMMZ');
  }

  // Extract date components
  const day = dateStr.slice(0, 2);
  const monthStr = dateStr.slice(2, 5);
  const year = '20' + dateStr.slice(5, 7); // Assuming 20XX years

  // Map month abbreviations to numbers
  const monthMap = {
    'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04', 'MAY': '05', 'JUN': '06',
    'JUL': '07', 'AUG': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
  };
  const month = monthMap[monthStr.toUpperCase()];
  if (!month) {
    throw new Error('Invalid month abbreviation');
  }

  // Extract time components
  const hours = timeStr.slice(0, 2);
  const minutes = timeStr.slice(2, 4);
  const timezone = timeStr.slice(4, 5);

  // Validate timezone (assuming Z for UTC)
  if (timezone !== 'Z') {
    throw new Error('Only UTC (Z) timezone is supported');
  }

  // Validate numeric components
  if (!/^\d{2}$/.test(day) || !/^\d{2}$/.test(hours) || !/^\d{2}$/.test(minutes)) {
    throw new Error('Day, hours, or minutes must be two digits');
  }

  // Create ISO string and parse to Date object
  const isoString = `${year}-${month}-${day}T${hours}:${minutes}:00Z`;
  const dateObj = new Date(isoString);

  // Check if the date is valid
  if (isNaN(dateObj.getTime())) {
    throw new Error('Invalid date or time');
  }

  return dateObj;
}

function setActiveWeather() {
    const arrDate = fltRls.arrDate;
    const taf = fltRls.weather.arr.taf;

    // Check if arrDate is within TAF's main time range
    const isTafActive = arrDate >= taf.begin && (!taf.end || arrDate <= taf.end);

    // Initialize active as false
    taf.active = false;

    // Check subs array if it exists
    if (taf.subs && taf.subs.length > 0) {
        let activeSubFound = false;

        // Iterate through subs to find the most specific active forecast
        for (const sub of taf.subs) {
            // Initialize active property for sub
            sub.active = false;

            // Check if arrDate falls within sub's time range
            const isSubActive = arrDate >= sub.begin && (!sub.end || arrDate <= sub.end);

            if (isSubActive) {
                sub.active = true;
                activeSubFound = true;
            }
        }

        // If no active sub is found, set TAF active if within its range
        if (!activeSubFound && isTafActive) {
            taf.active = true;
        }
    } else {
        // No subs, set TAF active if within its range
        taf.active = isTafActive;
    }

    return taf;
}


function createFuelLog(){
  fltRls.fuelLog = {};
  fltRls.fuelLog.plndTOFuel = parseInt(fltRls.fuel[9][2])-parseInt(fltRls.fuel[7][2]);
  fltRls.fuelLog.actTOFuel = fltRls.fuelLog.plndTOFuel;
  fltRls.fuelLog.wpts = [];
  for (const wpt of fltRls.NavLog) {

}
for (let i = 0; i < fltRls.NavLog.length; i++) {
	const fwpt = {};
	fwpt.name = fltRls.NavLog[i][1];
	
	fwpt.plndTime = timeToMinutes(fltRls.NavLog[i][17]);
	fwpt.plndBurn = parseInt(fltRls.NavLog[i][18]);
	
	fwpt.actTime = fwpt.plndTime;
	fwpt.actBurn = fwpt.plndBurn;
	fwpt.plndFuel = fltRls.fuelLog.actTOFuel - fwpt.plndBurn;
	fwpt.actFuel = fwpt.plndFuel;
	fwpt.dataEntry = false;
	fltRls.fuelLog.wpts.push(fwpt);
}
document.getElementById("ODFuel").innerHTML = fltRls.fuelLog.actTOFuel;
}

function timeToMinutes(timeStr) {
  // Split the time string into hours and minutes
  const [hours, minutes] = timeStr.split(':').map(str => parseInt(str));
  
  // Validate input
  if (isNaN(hours) || isNaN(minutes)) {
    throw new Error("Invalid time format. Expected 'H:MM'");
  }
  
  // Convert to total minutes
  return hours * 60 + minutes;
}

function minutesToTime(minutes) {
  // Validate input
  if (typeof minutes !== 'number' || isNaN(minutes) || minutes < 0) {
    throw new Error("Invalid input. Expected a non-negative number of minutes.");
  }
  
  // Calculate hours and remaining minutes
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.floor(minutes % 60);
  
  // Format as H:MM (pad minutes with leading zero if needed)
  return `${hours}:${remainingMinutes.toString().padStart(2, '0')}`;
}

function updateFuelLogValues(){
	document.getElementById("ODFuel").innerHTML = fltRls.fuelLog.actTOFuel;
	for (let i = 0; i < fltRls.fuelLog.wpts.length; i++) {
		wpt = fltRls.fuelLog.wpts[i];
		wpt.plndFuel = fltRls.fuelLog.actTOFuel - wpt.plndBurn;
		document.getElementById(wpt.name +"expTime").textContent = minutesToTime(wpt.plndTime); //Convert to H:MM
		document.getElementById(wpt.name+"actTime").textContent = minutesToTime(wpt.actTime); //Convert to H:MM
		document.getElementById(wpt.name+"expFuel").textContent = wpt.plndFuel;
		document.getElementById(wpt.name+"actFuel").textContent = wpt.actFuel; 
		document.getElementById(wpt.name+"dTime").textContent = wpt.actTime - wpt.plndTime; 
		document.getElementById(wpt.name+"dFuel").textContent = wpt.actFuel - wpt.plndFuel; 
	}
}

