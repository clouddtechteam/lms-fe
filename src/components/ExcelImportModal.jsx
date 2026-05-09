import { useState, useEffect } from 'react';
import * as xlsx from 'xlsx';

const ExcelImportModal = ({ file, onConfirm, onCancel }) => {
  const [sheets, setSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState(0);
  const [sheetData, setSheetData] = useState([]);

  useEffect(() => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      // We parse with raw strings to keep it editable in inputs natively
      const workbook = xlsx.read(data, { type: 'array', cellDates: true });
      setSheets(workbook.SheetNames);
      loadSheetData(workbook, workbook.SheetNames[0]);
    };
    reader.readAsArrayBuffer(file);
  }, [file]);

  const loadSheetData = (workbook, sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    // Keep raw JSON with placeholders for missing cells so tabular forms align
    const json = xlsx.utils.sheet_to_json(worksheet, { defval: '' });
    
    // Convert Date objects to readable strings for inputs
    const formattedJson = json.map(row => {
      const newRow = {};
      Object.keys(row).forEach(k => {
        if (row[k] instanceof Date) {
          const d = row[k];
          // simple format: if time, keep time; else short date format
          if (d.getHours() || d.getMinutes()) {
            newRow[k] = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
          } else {
             newRow[k] = row[k].toISOString().split('T')[0];
          }
        } else {
          newRow[k] = row[k];
        }
      });
      return newRow;
    });

    setSheetData(formattedJson);
  };

  const handleSheetChange = (e) => {
    const idx = Number(e.target.value);
    setSelectedSheet(idx);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target.result);
      const workbook = xlsx.read(data, { type: 'array', cellDates: true });
      loadSheetData(workbook, workbook.SheetNames[idx]);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleCellChange = (rowIndex, colKey, val) => {
    const newData = [...sheetData];
    newData[rowIndex][colKey] = val;
    setSheetData(newData);
  };

  const columns = sheetData.length > 0 ? Object.keys(sheetData[0]) : [];

  return (
    <div className="lms-modal-overlay" style={{ zIndex: 9999 }}>
      <div className="lms-modal" style={{ width: '90%', maxWidth: '1000px', padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b' }}>Preview Import Data</h3>
          
          {sheets.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label style={{ fontWeight: 600, color: '#64748b', fontSize: '0.9rem' }}>Select Sheet:</label>
              <select value={selectedSheet} onChange={handleSheetChange} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}>
                {sheets.map((s, i) => <option key={i} value={i}>{s}</option>)}
              </select>
            </div>
          )}
        </div>

        {sheetData.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No data found in this sheet.</div>
        ) : (
          <div style={{ maxHeight: '500px', overflowY: 'auto', overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: 'inset 0 2px 4px 0 rgba(0,0,0,0.02)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
                <tr>
                  <th style={{ padding: '14px', borderBottom: '1px solid #e2e8f0', width: '40px', color: '#94a3b8', fontSize: '0.8rem' }}>#</th>
                  {columns.map(c => <th key={c} style={{ padding: '14px', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase' }}>{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {sheetData.map((row, rIdx) => (
                  <tr key={rIdx} style={{ ':hover': { background: '#fbfcfe' } }}>
                    <td style={{ padding: '8px 14px', borderBottom: '1px solid #f1f5f9', color: '#94a3b8', fontSize: '0.85rem' }}>{rIdx + 1}</td>
                    {columns.map(c => (
                      <td key={c} style={{ padding: '8px 14px', borderBottom: '1px solid #f1f5f9' }}>
                        <input 
                          type="text"
                          value={row[c] || ''} 
                          onChange={(e) => handleCellChange(rIdx, c, e.target.value)}
                          style={{ 
                            width: '100%', padding: '8px 10px', 
                            border: '1px solid transparent', borderRadius: '4px', boxSizing: 'border-box',
                            background: '#f8fafc', transition: 'all 0.2s', fontSize: '0.9rem', color: '#334155'
                           }}
                          onFocus={(e) => { e.target.style.background = '#fff'; e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 2px rgba(59,130,246,0.1)'; }}
                          onBlur={(e) => { e.target.style.background = '#f8fafc'; e.target.style.borderColor = 'transparent'; e.target.style.boxShadow = 'none'; }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '30px' }}>
            <button className="lms-btn lms-btn-outline" onClick={onCancel} style={{ padding: '10px 24px', cursor: 'pointer' }}>Cancel</button>
            <button className="lms-btn lms-btn-primary" onClick={() => onConfirm(sheetData)} style={{ padding: '10px 24px', cursor: 'pointer' }} disabled={sheetData.length === 0}>
               Confirm Import ({sheetData.length} records)
            </button>
        </div>
      </div>
    </div>
  );
};

export default ExcelImportModal;
