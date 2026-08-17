import React, { useState, useEffect } from "react";
import { FiX, FiPrinter, FiBook } from "react-icons/fi";
import { BsFilePdf, BsFileWord } from "react-icons/bs";
import axios from "axios";
import BASE_URL from "../api";

const BookletModal = ({ program, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [bookletData, setBookletData] = useState(null);

  useEffect(() => {
    if (program?.id) {
      fetchBookletData();
    }
  }, [program]);

  const fetchBookletData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BASE_URL}/api/mass-programs/${program.id}/booklet-data`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBookletData(res.data);
    } catch (err) {
      console.error("Failed to load booklet:", err);
    } finally {
      setLoading(false);
    }
  };

  // Format individual lyric line with HTML
  const formatLyricLine = (line) => {
    if (!line || line.trim() === '') {
      return '<div class="spacer-line">&nbsp;</div>';
    }

    let trimmedLine = line.trim();
    
    if (trimmedLine.includes('**{') && trimmedLine.includes('}**')) {
      const match = trimmedLine.match(/\*\*\{([^}]+)\}\*\*/);
      if (match) {
        const chorusText = match[1];
        const repeatMatch = chorusText.match(/(.+?)\s*[xX×]\s*(\d+)/);
        if (repeatMatch) {
          return `<div class="chorus-line">${repeatMatch[1].trim()} ×${repeatMatch[2]}</div>`;
        }
        return `<div class="chorus-line">${chorusText}</div>`;
      }
    }
    
    if (trimmedLine.includes('**') && !trimmedLine.includes('\\*\\*')) {
      let processedLine = trimmedLine;
      const boldMatches = trimmedLine.match(/\*\*([^*]+)\*\*/g);
      if (boldMatches) {
        boldMatches.forEach(match => {
          const text = match.replace(/\*\*/g, '');
          processedLine = processedLine.replace(match, `<strong>${text}</strong>`);
        });
      }
      return `<div class="lyric-line">${processedLine}</div>`;
    }
    
    if (trimmedLine.match(/^(\d+)\./)) {
      return `<div class="verse-number">${trimmedLine}</div>`;
    }
    
    const repeatMatch = trimmedLine.match(/\{([^}]+)\}\s*[xX×]\s*(\d+)/);
    if (repeatMatch) {
      return `<div class="repeat-line">${repeatMatch[1].trim()} ×${repeatMatch[2]}</div>`;
    }
    
    const voiceMatch = trimmedLine.match(/\*\*(Sop|Alto|Tenor|Bass)\*\*/i);
    if (voiceMatch) {
      const voice = voiceMatch[1];
      const restOfLine = trimmedLine
        .replace(/\*\*Sop\*\*/i, '')
        .replace(/\*\*Alto\*\*/i, '')
        .replace(/\*\*Tenor\*\*/i, '')
        .replace(/\*\*Bass\*\*/i, '')
        .trim();
      return `<div class="voice-part ${voice.toLowerCase()}">${voice}: ${restOfLine}</div>`;
    }
    
    const columnSplit = trimmedLine.split(/\s{3,}/);
    if (columnSplit.length >= 2) {
      return `
        <div class="two-columns">
          <div class="col-left">${columnSplit[0].trim()}</div>
          <div class="col-right">${columnSplit.slice(1).join('   ').trim()}</div>
        </div>
      `;
    }
    
    if (trimmedLine.includes('*2') || trimmedLine.includes('x2') || trimmedLine.includes('×2')) {
      const repeatLine = trimmedLine
        .replace(/\*2/g, '×2')
        .replace(/x2/g, '×2')
        .replace(/X2/g, '×2');
      return `<div class="repeat-line">${repeatLine}</div>`;
    }
    
    if (trimmedLine === trimmedLine.toUpperCase() && trimmedLine.length > 3 && !trimmedLine.includes('*')) {
      return `<div class="section-title-line">${trimmedLine}</div>`;
    }
    
    return `<div class="lyric-line">${trimmedLine}</div>`;
  };

  // Break everything into individual lines with proper grouping
  const breakIntoLines = (sections) => {
    const allLines = [];
    
    sections.forEach((section) => {
      // Section header
      allLines.push({
        type: 'section-header',
        content: section.label || '',
        html: `<div class="section-header">${section.label || ''}</div>`,
        lines: 1,
        group: 'header'
      });
      
      if (section.songs) {
        section.songs.forEach((song) => {
          // Song title
          allLines.push({
            type: 'song-title',
            content: song.title || '',
            html: `<div class="song-title">${song.title || ''}</div>`,
            lines: 1,
            group: `song-${song.title || Math.random()}`
          });
          
          // Lyrics
          if (song.lyrics && song.lyrics !== "[Pending - Add lyrics]") {
            const lyricLines = song.lyrics.split('\n');
            lyricLines.forEach((line) => {
              if (line && line.trim() !== '') {
                const formattedHtml = formatLyricLine(line);
                allLines.push({
                  type: 'lyric',
                  content: line,
                  html: `<div class="song-lyrics">${formattedHtml}</div>`,
                  lines: 1,
                  group: `song-${song.title || Math.random()}`
                });
              } else {
                allLines.push({
                  type: 'spacer',
                  content: '',
                  html: '<div class="song-lyrics"><div class="spacer-line">&nbsp;</div></div>',
                  lines: 0.5,
                  group: `song-${song.title || Math.random()}`
                });
              }
            });
          } else {
            allLines.push({
              type: 'lyric',
              content: 'Lyrics not available yet',
              html: '<div class="song-lyrics"><div class="lyric-line">Lyrics not available yet</div></div>',
              lines: 1,
              group: `song-${song.title || Math.random()}`
            });
          }
        });
      }
    });
    
    return allLines;
  };

  // Flow lines with group awareness
  const flowLinesIntoPages = (allLines) => {
    const MAX_LINES_PER_COLUMN = 30;
    const pages = [];
    let currentPage = { left: [], right: [] };
    let currentColumn = 'left';
    let lineCount = 0;
    let currentGroup = '';
    let groupLineCount = 0;
    
    for (let i = 0; i < allLines.length; i++) {
      const line = allLines[i];
      
      if (line.group !== currentGroup) {
        currentGroup = line.group;
        groupLineCount = 0;
      }
      
      let totalGroupLines = 0;
      let j = i;
      while (j < allLines.length && allLines[j].group === currentGroup) {
        totalGroupLines += allLines[j].lines;
        j++;
      }
      
      if (line.type === 'section-header') {
        let nextLines = 0;
        let k = i + 1;
        while (k < allLines.length && allLines[k].group === 'header') {
          nextLines += allLines[k].lines;
          k++;
        }
        while (k < allLines.length && allLines[k].type !== 'song-title') {
          k++;
        }
        if (k < allLines.length) {
          nextLines += allLines[k].lines;
        }
        
        if (lineCount + nextLines > MAX_LINES_PER_COLUMN) {
          if (currentColumn === 'left') {
            currentColumn = 'right';
            lineCount = 0;
          } else {
            pages.push(currentPage);
            currentPage = { left: [], right: [] };
            currentColumn = 'left';
            lineCount = 0;
          }
        }
      }
      
      if (line.type === 'song-title' || line.type === 'lyric' || line.type === 'spacer') {
        const groupTotal = totalGroupLines;
        
        if (lineCount + groupTotal <= MAX_LINES_PER_COLUMN) {
          while (i < allLines.length && allLines[i].group === currentGroup) {
            const currentLine = allLines[i];
            if (currentColumn === 'left') {
              currentPage.left.push(currentLine);
            } else {
              currentPage.right.push(currentLine);
            }
            lineCount += currentLine.lines;
            i++;
          }
          i--;
          continue;
        } else {
          let linesToAdd = [];
          let tempLineCount = 0;
          let tempI = i;
          
          if (allLines[tempI] && allLines[tempI].type === 'song-title') {
            linesToAdd.push(allLines[tempI]);
            tempLineCount += allLines[tempI].lines;
            tempI++;
          }
          
          while (tempI < allLines.length && 
                 allLines[tempI].group === currentGroup && 
                 tempLineCount + allLines[tempI].lines <= MAX_LINES_PER_COLUMN - lineCount) {
            linesToAdd.push(allLines[tempI]);
            tempLineCount += allLines[tempI].lines;
            tempI++;
          }
          
          if (linesToAdd.length >= 2) {
            linesToAdd.forEach(lineToAdd => {
              if (currentColumn === 'left') {
                currentPage.left.push(lineToAdd);
              } else {
                currentPage.right.push(lineToAdd);
              }
            });
            lineCount += tempLineCount;
            
            if (lineCount >= MAX_LINES_PER_COLUMN) {
              if (currentColumn === 'left') {
                currentColumn = 'right';
                lineCount = 0;
              } else {
                pages.push(currentPage);
                currentPage = { left: [], right: [] };
                currentColumn = 'left';
                lineCount = 0;
              }
            }
            
            i = tempI - 1;
            continue;
          } else {
            if (currentColumn === 'left') {
              currentColumn = 'right';
              lineCount = 0;
            } else {
              pages.push(currentPage);
              currentPage = { left: [], right: [] };
              currentColumn = 'left';
              lineCount = 0;
            }
            i--;
            continue;
          }
        }
      }
      
      if (lineCount + line.lines > MAX_LINES_PER_COLUMN) {
        if (currentColumn === 'left') {
          currentColumn = 'right';
          lineCount = 0;
        } else {
          pages.push(currentPage);
          currentPage = { left: [], right: [] };
          currentColumn = 'left';
          lineCount = 0;
        }
      }
      
      if (currentColumn === 'left') {
        currentPage.left.push(line);
      } else {
        currentPage.right.push(line);
      }
      lineCount += line.lines;
    }
    
    if (currentPage.left.length > 0 || currentPage.right.length > 0) {
      pages.push(currentPage);
    }
    
    return pages;
  };

  const generatePDF = () => {
    if (!bookletData) return;
    
    const allLines = breakIntoLines(bookletData.sections);
    const pages = flowLinesIntoPages(allLines);
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups for this site');
      return;
    }
    
    const styles = `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { 
        font-family: 'Times New Roman', Times, serif; 
        background: white; 
        margin: 0; 
        padding: 0; 
      }
      .page {
        max-width: 1100px;
        margin: 0 auto;
        background: white;
        page-break-after: always;
        break-after: page;
        min-height: 100vh;
      }
      .page:last-child {
        page-break-after: auto;
        break-after: auto;
      }
      .page-content {
        padding: 40px 35px 25px 35px;
        display: flex;
        gap: 40px;
        align-items: flex-start;
      }
      .cover-page {
        text-align: center;
        padding: 60px 40px;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        color: white;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
      }
      .cover-logo {
        max-width: 180px;
        height: auto;
        margin-bottom: 30px;
      }
      .cover-page h1 {
        font-size: 52px;
        margin-bottom: 15px;
        letter-spacing: 6px;
        font-weight: bold;
      }
      .cover-subtitle {
        font-size: 20px;
        opacity: 0.9;
        margin-bottom: 30px;
        letter-spacing: 4px;
      }
      .cover-divider {
        width: 120px;
        height: 2px;
        background: rgba(255,255,255,0.3);
        margin: 30px auto;
      }
      .cover-date, .cover-venue {
        font-size: 18px;
        margin: 8px 0;
        opacity: 0.9;
      }
      .column {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 0;
      }
      .section-header {
        font-size: 15px;
        font-weight: bold;
        color: #c0392b;
        border-left: 4px solid #c0392b;
        padding-left: 12px;
        margin: 6px 0 8px 0;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      .song-title {
        font-size: 12px;
        font-weight: bold;
        color: #2c3e50;
        margin: 5px 0 3px 0;
        padding-bottom: 2px;
        border-bottom: 2px solid #e0e0e0;
      }
      .song-lyrics {
        font-size: 10px;
        line-height: 1.6;
        color: #333;
        margin-left: 10px;
        display: block;
      }
      .song-lyrics .lyric-line {
        margin: 1px 0;
        padding: 0 3px;
        display: block;
        line-height: 1.5;
        font-size: 9.5px;
      }
      .song-lyrics .chorus-line {
        font-style: italic;
        color: #8b4513;
        margin: 3px 0 3px 6px;
        padding: 1px 8px;
        border-left: 3px solid #8b4513;
        background: rgba(139, 69, 19, 0.05);
        border-radius: 0 3px 3px 0;
        display: block;
        line-height: 1.5;
        font-size: 9.5px;
      }
      .song-lyrics .verse-number {
        font-weight: bold;
        color: #2980b9;
        margin: 5px 0 1px 0;
        font-size: 10px;
        display: block;
      }
      .song-lyrics .section-title-line {
        font-weight: bold;
        color: #2c3e50;
        margin: 6px 0 3px 0;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        border-bottom: 1px dashed #ccc;
        padding-bottom: 2px;
        display: block;
      }
      .song-lyrics .repeat-line {
        color: #666;
        font-style: italic;
        margin: 2px 0;
        font-size: 9px;
        padding: 1px 6px;
        background: #f9f9f9;
        border-radius: 3px;
        display: inline-block;
      }
      .song-lyrics .voice-part {
        margin: 2px 0;
        padding: 1px 6px;
        font-weight: 500;
        font-size: 9px;
        border-radius: 3px;
        display: block;
      }
      .song-lyrics .voice-part.sop { color: #e74c3c; background: rgba(231, 76, 60, 0.08); }
      .song-lyrics .voice-part.alto { color: #27ae60; background: rgba(39, 174, 96, 0.08); }
      .song-lyrics .voice-part.tenor { color: #2980b9; background: rgba(41, 128, 185, 0.08); }
      .song-lyrics .voice-part.bass { color: #8e44ad; background: rgba(142, 68, 173, 0.08); }
      .song-lyrics .two-columns {
        display: flex;
        justify-content: space-between;
        gap: 15px;
        margin: 2px 0;
        padding: 2px 6px;
        background: #f8f8f8;
        border-radius: 3px;
      }
      .song-lyrics .col-left, .song-lyrics .col-right { flex: 1; }
      .song-lyrics .spacer-line { height: 6px; min-height: 6px; display: block; }
      .page-number {
        text-align: center;
        font-size: 9px;
        color: #999;
        margin-top: 20px;
        padding-top: 12px;
        border-top: 1px solid #eee;
        width: 100%;
      }
      @media print {
        body { background: white; padding: 0; margin: 0; }
        .page { 
          box-shadow: none; 
          margin: 0; 
          page-break-after: always; 
          break-after: page;
          min-height: 100vh;
        }
        .cover-page {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Mass Program Booklet - ${bookletData.program?.formattedDate || 'Mass'}</title>
        <style>${styles}</style>
      </head>
      <body>
    `);
    
    // Cover page with ZUCA logo (no filter)
    printWindow.document.write(`
      <div class="page">
        <div class="cover-page">
          <img src="/zuca-logo.png" alt="ZUCA Logo" class="cover-logo" />
          <h1>MASS PROGRAM</h1>
          <div class="cover-subtitle">Z U C A</div>
          <div class="cover-divider"></div>
          <div class="cover-date">${bookletData.program?.formattedDate || ''}</div>
          <div class="cover-venue">${bookletData.program?.venue || 'St. Camillus Mass'}</div>
        </div>
      </div>
    `);
    
    // Content pages
    pages.forEach((page, pageIndex) => {
      printWindow.document.write(`
        <div class="page">
          <div class="page-content">
            <div class="column">
              ${page.left.map(line => line.html).join('')}
            </div>
            <div class="column">
              ${page.right.map(line => line.html).join('')}
            </div>
          </div>
          <div class="page-number">Page ${pageIndex + 1}</div>
        </div>
      `);
    });
    
    printWindow.document.write(`
      </body>
      </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const downloadWord = () => {
    if (!bookletData) return;
    
    const allLines = breakIntoLines(bookletData.sections);
    const pages = flowLinesIntoPages(allLines);
    
    const styles = `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Times New Roman', Times, serif; background: white; margin: 0; padding: 20px; }
      .page { max-width: 1100px; margin: 0 auto 30px auto; background: white; page-break-after: always; break-after: page; min-height: 100vh; }
      .page:last-child { page-break-after: auto; break-after: auto; }
      .page-content { padding: 40px 35px 25px 35px; display: flex; gap: 40px; align-items: flex-start; }
      .cover-page { text-align: center; padding: 60px 40px; background: #1a1a2e; color: white; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; }
      .cover-logo { max-width: 180px; height: auto; margin-bottom: 30px; }
      .cover-page h1 { font-size: 52px; margin-bottom: 15px; letter-spacing: 6px; }
      .cover-subtitle { font-size: 20px; opacity: 0.9; margin-bottom: 30px; letter-spacing: 4px; }
      .cover-divider { width: 120px; height: 1px; background: rgba(255,255,255,0.3); margin: 30px auto; }
      .cover-date, .cover-venue { font-size: 18px; margin: 8px 0; }
      .column { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0; }
      .section-header { font-size: 15px; font-weight: bold; color: #c0392b; border-left: 4px solid #c0392b; padding-left: 12px; margin: 6px 0 8px 0; text-transform: uppercase; letter-spacing: 1px; }
      .song-title { font-size: 12px; font-weight: bold; color: #2c3e50; margin: 5px 0 3px 0; padding-bottom: 2px; border-bottom: 2px solid #e0e0e0; }
      .song-lyrics { font-size: 10px; line-height: 1.6; color: #333; margin-left: 10px; display: block; }
      .song-lyrics .lyric-line { margin: 1px 0; padding: 0 3px; display: block; line-height: 1.5; font-size: 9.5px; }
      .song-lyrics .chorus-line { font-style: italic; color: #8b4513; margin: 3px 0 3px 6px; padding: 1px 8px; border-left: 3px solid #8b4513; background: rgba(139, 69, 19, 0.05); border-radius: 0 3px 3px 0; display: block; line-height: 1.5; font-size: 9.5px; }
      .song-lyrics .verse-number { font-weight: bold; color: #2980b9; margin: 5px 0 1px 0; font-size: 10px; display: block; }
      .song-lyrics .section-title-line { font-weight: bold; color: #2c3e50; margin: 6px 0 3px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px dashed #ccc; padding-bottom: 2px; display: block; }
      .song-lyrics .repeat-line { color: #666; font-style: italic; margin: 2px 0; font-size: 9px; padding: 1px 6px; background: #f9f9f9; border-radius: 3px; display: inline-block; }
      .song-lyrics .voice-part { margin: 2px 0; padding: 1px 6px; font-weight: 500; font-size: 9px; border-radius: 3px; display: block; }
      .song-lyrics .voice-part.sop { color: #e74c3c; background: rgba(231, 76, 60, 0.08); }
      .song-lyrics .voice-part.alto { color: #27ae60; background: rgba(39, 174, 96, 0.08); }
      .song-lyrics .voice-part.tenor { color: #2980b9; background: rgba(41, 128, 185, 0.08); }
      .song-lyrics .voice-part.bass { color: #8e44ad; background: rgba(142, 68, 173, 0.08); }
      .song-lyrics .two-columns { display: flex; justify-content: space-between; gap: 15px; margin: 2px 0; padding: 2px 6px; background: #f8f8f8; border-radius: 3px; }
      .song-lyrics .col-left, .song-lyrics .col-right { flex: 1; }
      .song-lyrics .spacer-line { height: 6px; min-height: 6px; display: block; }
      .page-number { text-align: center; font-size: 9px; color: #999; margin-top: 20px; padding-top: 12px; border-top: 1px solid #eee; width: 100%; }
    `;
    
    let content = `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Mass Program Booklet - ${bookletData.program?.formattedDate || 'Mass'}</title>
      <style>${styles}</style>
    </head>
    <body>
    `;
    
    // Cover page with ZUCA logo (no filter)
    content += `
      <div class="page">
        <div class="cover-page">
          <img src="/zuca-logo.png" alt="ZUCA Logo" class="cover-logo" />
          <h1>MASS PROGRAM</h1>
          <div class="cover-subtitle">Z U C A</div>
          <div class="cover-divider"></div>
          <div class="cover-date">${bookletData.program?.formattedDate || ''}</div>
          <div class="cover-venue">${bookletData.program?.venue || 'St. Camillus Mass'}</div>
        </div>
      </div>
    `;
    
    // Content pages
    pages.forEach((page, pageIndex) => {
      content += `
        <div class="page">
          <div class="page-content">
            <div class="column">
              ${page.left.map(line => line.html).join('')}
            </div>
            <div class="column">
              ${page.right.map(line => line.html).join('')}
            </div>
          </div>
          <div class="page-number">Page ${pageIndex + 1}</div>
        </div>
      `;
    });
    
    content += `</body></html>`;
    
    const blob = new Blob([content], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Mass_Booklet_${bookletData.program?.date || 'mass'}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="booklet-overlay">
        <div className="booklet-modal loading">
          <div className="spinner"></div>
          <p>Loading booklet...</p>
        </div>
      </div>
    );
  }

  if (!bookletData) return null;

  const allLines = breakIntoLines(bookletData.sections);
  const pages = flowLinesIntoPages(allLines);

  return (
    <div className="booklet-overlay" onClick={onClose}>
      <div className="booklet-modal" onClick={(e) => e.stopPropagation()}>
        <div className="booklet-header">
          <h2><FiBook /> Booklet</h2>
          <div className="booklet-actions">
            <button onClick={downloadWord} className="btn-word"><BsFileWord /> <span>Word</span></button>
            <button onClick={generatePDF} className="btn-pdf"><BsFilePdf /> <span>PDF</span></button>
            <button onClick={() => window.print()} className="btn-print"><FiPrinter /> <span>Print</span></button>
            <button onClick={onClose} className="btn-close"><FiX /></button>
          </div>
        </div>
        
        <div className="booklet-preview">
          <div className="preview-pages">
            {/* Cover Page Preview with ZUCA logo (no filter) */}
            <div className="preview-page cover-preview">
              <div className="preview-cover">
                <img src="/zuca-logo.png" alt="ZUCA Logo" className="preview-logo" />
                <h1>MASS PROGRAM</h1>
                <div className="preview-subtitle">Z U C A</div>
                <div className="preview-divider"></div>
                <div className="preview-date">{bookletData.program?.formattedDate || ''}</div>
                <div className="preview-venue">{bookletData.program?.venue || 'St. Camillus Mass'}</div>
              </div>
              <div className="page-label">Cover Page</div>
            </div>
            
            {/* Content Pages Preview */}
            {pages.map((page, pageIndex) => (
              <div key={pageIndex} className="preview-page">
                <div className="page-header">Page {pageIndex + 1}</div>
                <div className="two-column-preview">
                  <div className="preview-column">
                    {page.left.map((line, idx) => (
                      <div key={idx} dangerouslySetInnerHTML={{ __html: line.html }} />
                    ))}
                  </div>
                  <div className="preview-column">
                    {page.right.map((line, idx) => (
                      <div key={idx} dangerouslySetInnerHTML={{ __html: line.html }} />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .booklet-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.85);
          z-index: 999999 !important;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .booklet-modal {
          width: 95%;
          max-width: 1200px;
          height: 90vh;
          background: #f5f5f0;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
          z-index: 999999 !important;
        }
        
        .booklet-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 20px;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          color: white;
          flex-shrink: 0;
        }
        
        .booklet-header h2 {
          margin: 0;
          font-size: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .booklet-actions {
          display: flex;
          gap: 8px;
        }
        
        .booklet-actions button {
          padding: 6px 12px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 5px;
          transition: all 0.2s;
        }
        
        .btn-word { background: #2b5797; color: white; }
        .btn-word:hover { background: #1e3a6f; }
        .btn-pdf { background: #dc2626; color: white; }
        .btn-pdf:hover { background: #b91c1c; }
        .btn-print { background: #4b5563; color: white; }
        .btn-print:hover { background: #374151; }
        .btn-close { background: #374151; color: white; }
        .btn-close:hover { background: #1f2937; }
        
        .booklet-preview {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          background: #e8e8e0;
        }
        
        .preview-pages {
          max-width: 1000px;
          margin: 0 auto;
        }
        
        .preview-page {
          background: white;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 30px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .preview-page:last-child {
          margin-bottom: 0;
        }
        
        .page-header {
          font-size: 11px;
          color: #999;
          text-align: center;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 1px solid #eee;
        }
        
        .page-label {
          font-size: 10px;
          color: #999;
          text-align: center;
          margin-top: 15px;
          padding-top: 10px;
          border-top: 1px solid #eee;
        }
        
        .cover-preview {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          color: white;
        }
        
        .preview-cover {
          text-align: center;
          padding: 40px 20px;
          min-height: 400px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }
        
        .preview-logo {
          max-width: 120px;
          height: auto;
          margin-bottom: 20px;
          background: white;
          padding: 10px;
          border-radius: 8px;
        }
        
        .preview-cover h1 {
          font-size: 28px;
          margin: 10px 0;
          letter-spacing: 2px;
        }
        
        .preview-subtitle {
          font-size: 14px;
          opacity: 0.8;
          margin-bottom: 20px;
        }
        
        .preview-divider {
          width: 50px;
          height: 1px;
          background: rgba(255,255,255,0.3);
          margin: 20px auto;
        }
        
        .preview-date, .preview-venue {
          font-size: 13px;
          margin: 5px 0;
        }
        
        .two-column-preview {
          display: flex;
          gap: 30px;
          align-items: flex-start;
        }
        
        .preview-column {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        
        .preview-column .section-header {
          font-size: 14px;
          font-weight: bold;
          color: #c0392b;
          border-left: 3px solid #c0392b;
          padding-left: 10px;
          margin: 6px 0 6px 0;
        }
        
        .preview-column .song-title {
          font-size: 12px;
          font-weight: bold;
          color: #2c3e50;
          margin: 5px 0 3px 0;
          padding-bottom: 2px;
          border-bottom: 1px solid #e8e8e8;
        }
        
        .preview-column .song-lyrics {
          font-size: 9.5px;
          line-height: 1.6;
          color: #333;
          margin-left: 10px;
          display: block;
        }
        
        .preview-column .song-lyrics .lyric-line {
          margin: 1px 0;
          padding: 0 3px;
          display: block;
          line-height: 1.5;
        }
        .preview-column .song-lyrics .chorus-line {
          font-style: italic;
          color: #8b4513;
          margin: 3px 0 3px 6px;
          padding: 1px 8px;
          border-left: 3px solid #8b4513;
          background: rgba(139, 69, 19, 0.05);
          display: block;
          line-height: 1.5;
        }
        .preview-column .song-lyrics .verse-number {
          font-weight: bold;
          color: #2980b9;
          margin: 5px 0 1px 0;
          font-size: 10px;
          display: block;
        }
        .preview-column .song-lyrics .section-title-line {
          font-weight: bold;
          color: #2c3e50;
          margin: 6px 0 3px 0;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px dashed #ddd;
          padding-bottom: 2px;
          display: block;
        }
        .preview-column .song-lyrics .repeat-line {
          color: #666;
          font-style: italic;
          margin: 2px 0;
          font-size: 9px;
          padding: 1px 6px;
          background: #f9f9f9;
          border-radius: 3px;
          display: inline-block;
        }
        .preview-column .song-lyrics .voice-part {
          margin: 2px 0;
          padding: 1px 6px;
          font-weight: 500;
          font-size: 9px;
          border-radius: 3px;
          display: block;
        }
        .preview-column .song-lyrics .voice-part.sop { color: #e74c3c; background: rgba(231, 76, 60, 0.08); }
        .preview-column .song-lyrics .voice-part.alto { color: #27ae60; background: rgba(39, 174, 96, 0.08); }
        .preview-column .song-lyrics .voice-part.tenor { color: #2980b9; background: rgba(41, 128, 185, 0.08); }
        .preview-column .song-lyrics .voice-part.bass { color: #8e44ad; background: rgba(142, 68, 173, 0.08); }
        .preview-column .song-lyrics .two-columns {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          margin: 2px 0;
          padding: 2px 6px;
          background: #f8f8f8;
          border-radius: 3px;
        }
        .preview-column .song-lyrics .col-left, .preview-column .song-lyrics .col-right { flex: 1; }
        .preview-column .song-lyrics .spacer-line { height: 5px; min-height: 5px; display: block; }
        
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e2e8f0;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 20px auto;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        @media print {
          .booklet-overlay {
            position: relative;
            background: white;
          }
          .booklet-header {
            display: none;
          }
          .booklet-preview {
            padding: 0;
            background: white;
          }
          .preview-page {
            box-shadow: none;
            margin: 0;
            padding: 0;
            page-break-after: always;
            break-after: page;
          }
          .preview-cover {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
        
        @media (max-width: 768px) {
          .booklet-modal {
            max-width: 95%;
          }
          .two-column-preview {
            flex-direction: column;
            gap: 0;
          }
          .booklet-actions button span {
            display: none;
          }
          .booklet-actions button {
            padding: 8px;
          }
          .preview-column .song-lyrics .two-columns {
            flex-direction: column;
            gap: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default BookletModal;