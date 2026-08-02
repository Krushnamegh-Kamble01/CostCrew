# CostCrew 💸

> **Smart group expense splitting with AI-powered receipt scanning.**

[![Project](https://img.shields.io/badge/Project-CostCrew-indigo?style=for-the-badge)](https://github.com)
[![Status](https://img.shields.io/badge/Status-Active-emerald?style=for-the-badge)](https://github.com)
[![Next.js](https://img.shields.io/badge/Next.js_15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini_AI-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)](https://ai.google.dev/)

---

## 📌 About CostCrew

**CostCrew** is a modern, full-stack group expense-splitting web application designed for friends, roommates, and trip groups. It allows crews to easily log shared costs, split bills evenly or unevenly, calculate simplified debt settlements to minimize required payments, and scan physical paper receipts using Google Gemini AI to auto-extract expenses instantly.

---

## ✨ Key Features

- 🔑 **Google Authentication** — Seamless sign-in via Supabase OAuth with secure session management.
- 👥 **Group Management** — Create new groups or join existing ones effortlessly via shareable invite codes or links.
- 👤 **Custom User Profiles** — Personalize your profile with custom usernames and avatars.
- ⚖️ **Flexible Expense Splitting** — Support for splitting expenses equally among all members, selecting specific participants, or assigning custom uneven share amounts.
- 🧾 **AI-Powered Receipt Scanning** — Upload or capture paper receipts to automatically extract total amounts, merchant notes, and categories using Google Gemini Vision AI.
- 📊 **Real-Time Balance Tracking** — Live net balance calculation for every member in the group.
- ⚡ **Simplified Settlement Algorithm** — Intelligently computes the absolute minimal number of peer-to-peer transfers required to resolve all group debts.
- 🤝 **Settlement History & Confirmations** — Mark debts as settled with transparent historical transaction logs.
- 📱 **Responsive Dark Mode UI** — Designed with a modern, glassmorphic dark theme tailored for mobile and desktop screens.

---

## 🛠️ Tech Stack

### **Frontend**
- **Framework:** [Next.js 15 (App Router)](https://nextjs.org/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) (Vanilla CSS tokens & Glassmorphic UI)
- **Icons:** [Lucide React](https://lucide.dev/)

### **Backend & Database**
- **Authentication & Database:** [Supabase](https://supabase.com/) (PostgreSQL + Auth + Row Level Security policies)
- **API Routes:** Next.js Server-Side API Handlers

### **Artificial Intelligence**
- **Receipt Vision Parsing:** [Google Gemini API (`@google/genai`)](https://ai.google.dev/)

---

## 🚀 Getting Started

### **Prerequisites**
- [Node.js](https://nodejs.org/) (v18.x or higher)
- `npm` or `yarn`

### **1. Clone the Repository**
```bash
git clone https://github.com/your-username/CostCrew.git
cd CostCrew
```

### **2. Install Dependencies**
```bash
npm install
```

### **3. Configure Environment Variables**
Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Google Gemini AI Key (Server-Side Only)
GEMINI_API_KEY=your_gemini_api_key_here
```

> ⚠️ **Important Security Note:** The `GEMINI_API_KEY` is strictly used server-side in API routes for receipt processing. Never expose or prefix secret API keys with `NEXT_PUBLIC_` or commit them to public version control repositories.

### **4. Run the Development Server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
