function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Sheet1") || ss.insertSheet("Sheet1");
    
    // Set headers if new sheet
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Timestamp", "LINE User ID", "LINE Name", "Client", "Project", 
        "Background", "Requirement", "Objective", "Target", "Details", 
        "Activity", "Platforms", "Platform Other", "Member", "Promotion", 
        "Timing", "Contact Name", "Contact Phone", "Contact Email", "Contact Line"
      ]);
    }

    const userId = data.userId;
    const values = [
      new Date(), userId, data.userName, data.project, data.brand,
      data.background, data.requirement, data.objective, data.target, data.details,
      data.activity, data.platforms.join(", "), data.platformOther, data.member, data.promotion,
      data.timing, data.contactName, data.contactPhone, data.contactEmail, data.contactLine
    ];

    // Check if user already exists
    const userRange = sheet.getRange(2, 2, sheet.getLastRow(), 1);
    const userIds = userRange.getValues().flat();
    const userIndex = userIds.indexOf(userId);

    if (userIndex !== -1) {
      // Update existing row
      sheet.getRange(userIndex + 2, 1, 1, values.length).setValues([values]);
    } else {
      // Append new row
      sheet.appendRow(values);
    }

    // Handle File Uploads (Folder per User)
    if (data.files && data.files.length > 0) {
      const parentFolder = DriveApp.getFolderById("YOUR_DRIVE_FOLDER_ID"); // User needs to set this
      let userFolder;
      const folders = parentFolder.getFoldersByName(userId);
      if (folders.hasNext()) {
        userFolder = folders.next();
      } else {
        userFolder = parentFolder.createFolder(userId + " - " + data.userName);
      }

      data.files.forEach(file => {
        const decoded = Utilities.base64Decode(file.base64);
        const blob = Utilities.newBlob(decoded, file.mimeType, file.name);
        userFolder.createFile(blob);
      });
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const userId = e.parameter.userId;
    if (!userId) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "No userId provided" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Sheet1");
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ status: "success", data: null }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const dataRows = sheet.getDataRange().getValues();
    const headers = dataRows[0];
    const userRow = dataRows.find(row => row[1] === userId);

    if (userRow) {
      const result = {};
      headers.forEach((header, index) => {
        // Map headers to key names used in script.js
        let key = header.toLowerCase().replace(/ /g, "");
        if (header === "LINE User ID") key = "userId";
        if (header === "Client") key = "project";
        if (header === "Project") key = "brand";
        if (header === "Platform Other") key = "platformOther";
        if (header === "Contact Name") key = "contactName";
        if (header === "Contact Phone") key = "contactPhone";
        if (header === "Contact Email") key = "contactEmail";
        if (header === "Contact Line") key = "contactLine";
        
        result[key] = userRow[index];
      });
      return ContentService.createTextOutput(JSON.stringify({ status: "success", data: result }))
        .setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService.createTextOutput(JSON.stringify({ status: "success", data: null }))
        .setMimeType(ContentService.MimeType.JSON);
    }

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
