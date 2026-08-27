# Money Tracker GitHub Frontend

Frontend for the Money Tracker project. GitHub Pages hosts the UI; Google Apps Script + Google Sheets remain the backend/database.

## Files
- index.html
- style.css
- app.js
- apps-script-api-adapter.gs

## Important
The existing Apps Script currently uses `google.script.run`, which only works when the HTML is served by Apps Script. Before switching the frontend to GitHub Pages, add `apps-script-api-adapter.gs` to the existing Code.gs and redeploy the Apps Script web app. Do not delete the existing spreadsheet functions.

## GitHub Pages
Push index.html, style.css and app.js to the repo root on `main`. Then GitHub → Settings → Pages → Deploy from branch → main → root.
