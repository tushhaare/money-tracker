# Money Tracker

A simple personal money tracker using:

- GitHub Pages for the frontend
- Google Apps Script for the backend
- Google Sheets as the database

## Fresh setup

### 1. Google Apps Script

Create a new Apps Script project.

Paste the complete contents of `Code.gs`.

Run:

`setup()`

Authorize it.

Open Executions/Logs to get the created spreadsheet URL.

### 2. Deploy backend

Deploy -> New deployment -> Web app.

Use:

- Execute as: Me
- Who has access: Anyone

Copy the `/exec` URL.

### 3. Connect GitHub frontend

Open `index.html`.

Find:

`PASTE_YOUR_APPS_SCRIPT_EXEC_URL_HERE`

Replace it with your `/exec` URL.

Example:

`https://script.google.com/macros/s/XXXXXXXX/exec`

### 4. GitHub Pages

Upload:

- index.html
- style.css
- app.js
- manifest.webmanifest

to the root of the GitHub repository.

GitHub -> Settings -> Pages -> Deploy from branch -> main -> root.

## Starting month

The app starts from September 2026.

August 2026 is intentionally ignored.

## Google Sheets tabs

The setup creates:

- Transactions
- Budgets
- Settings
- Monthly Reports

## Main features

- Daily expense entry
- Income entry
- Automatic date/time
- Category dropdown
- Edit/delete transaction
- Opening bank balance
- Automatic closing balance
- Monthly allocations
- Recurring daily allocation calculation
- Monthly history
- Category spending
- Daily spending chart
- Monthly report
- Previous-month directory
