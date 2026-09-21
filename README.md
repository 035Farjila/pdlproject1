# NourishFlow AI 🍲
**Intelligent Food Rescue & Donation Coordination Platform**

Matches surplus food donations to NGOs and community shelters based on urgency priority tiers (Critical, High, Medium, Expired).

---

## 🚀 How to Run Locally in VS Code (3 Simple Steps)

### Step 1: Open Terminal & Install Dependencies
Open your project folder in VS Code and open the integrated terminal (`Ctrl + ~` or `Cmd + ~`):
```bash
npm install
```

### Step 2: Start the Application
Run the single start command:
```bash
npm start
```
*(You can also use `npm run dev`)*

### Step 3: Open in Browser
Visit the application in your browser:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🌟 Zero-Setup Database Fallback
- **MongoDB (Optional)**: If you have MongoDB installed or set `MONGODB_URI` in `.env`, the app automatically connects via **Mongoose**.
- **Resilient Zero-Setup**: If MongoDB is not installed, the app automatically and seamlessly falls back to a local JSON file store (`data/donations.json`). **No database installation is required for your demo review!**
- **Auto-Seeding**: On first run, 3 sample donations (Critical, High, and Medium urgency) are automatically created so the demo is ready out of the box.

---

## 👥 Roles & Pages
1. **`login.html` (Role Picker)**: Select between Donor, Receiver NGO, Volunteer Courier, or Platform Admin. The active role is stored in session state.
2. **`donor.html` (Food Donor)**: Post surplus meals with donor name, food description, quantity (servings), and shelf-life expiry window (hours).
3. **`receiver.html` (Receiver NGO)**: Review pending donations dynamically ranked by urgency priority (**Critical** &rarr; **High** &rarr; **Medium** &rarr; **Expired**) with one-click "Accept" action. Automatically polls every 15 seconds.
4. **`volunteer.html` (Volunteer Courier)**: Review NGO-accepted donations ready for pickup transit with a one-click "Mark Delivered" action.
5. **`admin.html` (Platform Admin)**: Live statistics cards (Critical, High, Medium, Delivered, Total Servings) and a full sortable audit table with "Remove" capabilities.

---

## ⚡ Backend Urgency Priority Logic
Computed on the Node.js / Express backend using remaining time until `deadline`:
- **Hours Left &le; 0**: `Expired` (Dark Charcoal badge)
- **Hours Left &lt; 1**: `Critical` (Coral badge `#d9634f`)
- **Hours Left &lt; 4**: `High` (Amber badge `#e6a339`)
- **Hours Left &ge; 4**: `Medium` (Grey badge `#8c827a`)

**Sorting Rule**: Critical &rarr; High &rarr; Medium &rarr; Expired. Within the same tier, soonest deadline first; tiebreaker is larger quantity first.

---

## 📡 API Endpoints
- `POST /api/donations` — Create a donation with automatic tier calculation
- `GET /api/donations` — List all donations, priority-sorted with computed `tier`
- `PATCH /api/donations/:id` — Update status (`accepted` or `delivered`)
- `DELETE /api/donations/:id` — Remove a donation
- `GET /api/stats` — Metrics per tier, status counts, and total servings for Admin

---

## 🎨 Theme Colors
- **Background**: `#26211d` (Dark Charcoal)
- **Panels & Cards**: `#342c26`
- **Amber Accent**: `#e6a339`
- **Coral Accent**: `#d9634f`
- **Cream Text**: `#f3ece1`
