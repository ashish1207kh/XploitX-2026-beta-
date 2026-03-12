# Requirements — Matrix App
### D.F.I.R. CASE - Matrix Mission Web App

---

## System Requirements

- **Node.js** v16 or higher — [Download](https://nodejs.org/)
- **npm** v8 or higher *(comes with Node.js)*

---

## Dependencies

These are installed automatically when you run `npm install`.

| Package | Version | Purpose |
|---------|---------|---------|
| `cors` | ^2.8.5 | Enable Cross-Origin Resource Sharing |
| `dotenv` | ^16.3.1 | Load environment variables from `.env` file |
| `express` | ^4.18.2 | Web server framework |

## Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `nodemon` | ^3.0.1 | Auto-restart server on file changes (development only) |

---

## Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Karthiii06/Matrix.git
   cd Matrix/matrix-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create a `.env` file** in the `matrix-app` folder and add your environment variables
   ```env
   PORT=3000
   ```

4. **Run the app**

   - Production:
     ```bash
     npm start
     ```
   - Development (auto-reload):
     ```bash
     npm run dev
     ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

---

## Project Structure

```
matrix-app/
├── models/
│   └── Submission.js      # Data model
├── public/
│   ├── index.html         # Home page
│   ├── quiz.html          # Quiz page
│   └── dashboard.html     # Dashboard page
├── routes/
│   └── api.js             # API routes
├── .gitignore
├── package.json
└── server.js              # Entry point
```
