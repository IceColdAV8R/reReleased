function createNavLogTable() {
  const screen5 = document.getElementById('screen5');
  if (!screen5) {
    console.error('screen5 div not found');
    return;
  }
  const table = document.createElement('table');
  const headerRow = table.insertRow();
  const headers = ['WPT', '-', 'DIST', 'TIME', 'FUEL'];
  headers.forEach(headerText => {
    const th = document.createElement('th');
    th.textContent = headerText;
    headerRow.appendChild(th);
  });
  fltRls.NavLog.forEach(waypoint => {
    const row1 = table.insertRow();
    const nameCell = row1.insertCell();
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.style.marginRight = '5px';
    nameCell.appendChild(checkbox);
    nameCell.appendChild(document.createTextNode(waypoint[1]));
    nameCell.rowSpan = 3;
    const legLabelCell = row1.insertCell();
    legLabelCell.textContent = 'LEG';
    const legDistCell = row1.insertCell();
    legDistCell.textContent = waypoint[7];
    const legTimeCell = row1.insertCell();
    legTimeCell.textContent = waypoint[8];
    const legFuelCell = row1.insertCell();
    legFuelCell.textContent = waypoint[9];
    const row2 = table.insertRow();
    const totLabelCell = row2.insertCell();
    totLabelCell.textContent = 'TOT';
    const totDistCell = row2.insertCell();
    totDistCell.textContent = waypoint[16];
    const totTimeCell = row2.insertCell();
    totTimeCell.textContent = waypoint[17];
    const totFuelCell = row2.insertCell();
    totFuelCell.textContent = waypoint[18];
    const row3 = table.insertRow();
    const remLabelCell = row3.insertCell();
    remLabelCell.textContent = 'REM';
    const remDistCell = row3.insertCell();
    remDistCell.textContent = waypoint[22];
    const remTimeCell = row3.insertCell();
    remTimeCell.textContent = waypoint[23];
    const remFuelCell = row3.insertCell();
    remFuelCell.textContent = waypoint[24];
  });
  screen5.appendChild(table);
}
