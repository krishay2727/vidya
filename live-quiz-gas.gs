/**
 * STEM Live Exams - Google Apps Script Backend & Logging Service
 * 
 * Instructions:
 * 1. Open Google Sheets.
 * 2. Click Extensions > Apps Script.
 * 3. Delete any default code and paste this script.
 * 4. (Optional) Replace SPREADSHEET_ID with your Sheet ID if you want to hardcode it, 
 *    otherwise it defaults to the active spreadsheet containing the script.
 * 5. Click "Deploy" > "New deployment".
 * 6. Select type: "Web app".
 * 7. Set "Execute as": "Me" (your account).
 * 8. Set "Who has access": "Anyone" (essential for student access without login).
 * 9. Copy the generated Web App URL and paste it as GAS_WEB_APP_URL in live-quiz.js.
 */

const SPREADSHEET_ID = ""; // Leave blank to auto-use the sheet where this script is attached

// Helper: Get spreadsheet reference
function getSpreadsheet() {
  if (SPREADSHEET_ID && SPREADSHEET_ID.trim() !== "") {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

// Helper: Get or create sheet by name
function getOrCreateSheet(sheetName, headers) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (headers && headers.length > 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

// Format Grade values nicely for the spreadsheet
function formatGrade(gradeVal) {
  if (!gradeVal) return "";
  if (gradeVal.startsWith("grade")) {
    return "Grade " + gradeVal.substring(5);
  }
  if (gradeVal === "teachers_baseline") return "Teachers Baseline 1";
  if (gradeVal === "teachers_baseline_2") return "Teachers Baseline 2";
  return gradeVal;
}

// Format Unit values nicely
function formatUnit(unitVal) {
  if (!unitVal) return "";
  if (unitVal === "baseline") return "Baseline";
  if (unitVal.startsWith("unit")) return "Unit " + unitVal.substring(4);
  return unitVal;
}

// GET Requests
function doGet(e) {
  const action = e.parameter.action;
  const roomCode = e.parameter.roomCode;
  
  if (action === 'getRoom') {
    const room = getRoomData(roomCode);
    return ContentService.createTextOutput(JSON.stringify(room))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ error: "Invalid Action" }))
    .setMimeType(ContentService.MimeType.JSON);
}

// POST Requests
function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    const roomCode = postData.roomCode;
    
    let result = { success: true };
    
    if (action === 'createRoom') {
      saveRoomData(roomCode, postData.data);
    } else if (action === 'updateRoom') {
      updateRoomData(roomCode, postData.data);
    } else if (action === 'joinPlayer') {
      joinPlayer(roomCode, postData.playerName, postData.playerData);
    } else if (action === 'updatePlayerScore') {
      updatePlayerScore(roomCode, postData.playerName, postData.data);
    } else if (action === 'submitAnswer') {
      submitAnswer(roomCode, postData.playerName, postData.questionIndex, postData.answerData);
    } else if (action === 'logExamResult') {
      logExamResultToSheet(postData);
    } else if (action === 'logAllExamResults') {
      logAllExamResultsToSheet(postData);
    } else {
      result = { error: "Unknown action: " + action };
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.message || error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// --- Live Room Database Logic (if BACKEND_MODE is 'gas') ---

function getRoomData(roomCode) {
  const sheet = getOrCreateSheet("Rooms", ["RoomCode", "Data"]);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString() === roomCode.toString()) {
      try {
        return JSON.parse(data[i][1]);
      } catch (e) {
        return { error: "Failed to parse room data JSON: " + e.toString() };
      }
    }
  }
  return { error: "Room not found" };
}

function saveRoomData(roomCode, roomObj) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); // 30 sec lock timeout to prevent concurrency bugs
    
    const sheet = getOrCreateSheet("Rooms", ["RoomCode", "Data"]);
    const data = sheet.getDataRange().getValues();
    let foundRow = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0].toString() === roomCode.toString()) {
        foundRow = i + 1;
        break;
      }
    }
    
    const jsonStr = JSON.stringify(roomObj);
    if (foundRow !== -1) {
      sheet.getRange(foundRow, 2).setValue(jsonStr);
    } else {
      sheet.appendRow([roomCode, jsonStr]);
    }
  } finally {
    lock.releaseLock();
  }
}

function updateRoomData(roomCode, updates) {
  const room = getRoomData(roomCode);
  if (room.error) return;
  
  const updatedRoom = { ...room, ...updates };
  saveRoomData(roomCode, updatedRoom);
}

function joinPlayer(roomCode, playerName, playerData) {
  const room = getRoomData(roomCode);
  if (room.error) return;
  
  if (!room.players) room.players = {};
  room.players[playerName] = playerData;
  saveRoomData(roomCode, room);
}

function updatePlayerScore(roomCode, playerName, scoreData) {
  const room = getRoomData(roomCode);
  if (room.error) return;
  
  if (room.players && room.players[playerName]) {
    room.players[playerName].score = scoreData.score;
    room.players[playerName].categoryScores = scoreData.categoryScores;
    saveRoomData(roomCode, room);
  }
}

function submitAnswer(roomCode, playerName, questionIndex, answerData) {
  const room = getRoomData(roomCode);
  if (room.error) return;
  
  if (!room.responses) room.responses = {};
  if (!room.responses[questionIndex]) room.responses[questionIndex] = {};
  room.responses[questionIndex][playerName] = answerData;
  
  if (room.players && room.players[playerName]) {
    if (!room.players[playerName].answers) room.players[playerName].answers = {};
    room.players[playerName].answers[questionIndex] = answerData;
  }
  
  saveRoomData(roomCode, room);
}

// --- Excel Sheet Logging Logic ---

// Log single student exam result
function logExamResultToSheet(payload) {
  const headers = [
    "Timestamp", 
    "Room Code", 
    "School Name", 
    "Grade", 
    "Unit", 
    "Teacher Name", 
    "Student Name", 
    "Overall Score", 
    "Critical Thinking", 
    "Problem Solving", 
    "Safety", 
    "Ethics"
  ];
  
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); // 30 sec lock timeout
    
    const sheet = getOrCreateSheet("ExamResults", headers);
    const categoryScores = payload.categoryScores || {};
    
    sheet.appendRow([
      payload.timestamp || new Date().toLocaleString(),
      payload.roomCode || "",
      payload.school || "",
      formatGrade(payload.grade),
      formatUnit(payload.unit),
      payload.teacher || "",
      payload.studentName || "",
      payload.score || 0,
      categoryScores.critical_thinking || 0,
      categoryScores.problem_solving || 0,
      categoryScores.safety || 0,
      categoryScores.ethics || 0
    ]);
  } finally {
    lock.releaseLock();
  }
}

// Log/Sync all student results in a batch (Teacher Host Dashboard manual sync)
function logAllExamResultsToSheet(payload) {
  const headers = [
    "Timestamp", 
    "Room Code", 
    "School Name", 
    "Grade", 
    "Unit", 
    "Teacher Name", 
    "Student Name", 
    "Overall Score", 
    "Critical Thinking", 
    "Problem Solving", 
    "Safety", 
    "Ethics"
  ];
  
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); // 30 sec lock timeout
    
    const sheet = getOrCreateSheet("ExamResults", headers);
    const players = payload.players || {};
    const timestamp = payload.timestamp || new Date().toLocaleString();
    const formattedGrade = formatGrade(payload.grade);
    const formattedUnit = formatUnit(payload.unit);
    
    for (const pName in players) {
      const player = players[pName];
      const categoryScores = player.categoryScores || {};
      sheet.appendRow([
        timestamp,
        payload.roomCode || "",
        payload.school || "",
        formattedGrade,
        formattedUnit,
        payload.teacher || "",
        player.name || pName,
        player.score || 0,
        categoryScores.critical_thinking || 0,
        categoryScores.problem_solving || 0,
        categoryScores.safety || 0,
        categoryScores.ethics || 0
      ]);
    }
  } finally {
    lock.releaseLock();
  }
}
