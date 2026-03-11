# Financy

## Overview

**Financy** is a full-stack personal finance management application designed to help users organize and track their financial activity in a structured and intuitive way.

Many people struggle to keep track of where their money goes each month. Expenses often become scattered across bank apps, notes, or spreadsheets, making it difficult to understand spending habits or maintain financial discipline.

Financy solves this problem by providing a centralized platform where users can categorize and manage their financial transactions. Users can create custom categories and then register **expenses or income** associated with those categories, allowing them to better understand their financial behavior over time.

The application also includes a **complete authentication system**, featuring:

* User registration
* Secure login with **JWT authentication**
* Password recovery flow
* Email sending for account-related actions

This project was built to demonstrate a **modern full-stack architecture** using technologies commonly used in production environments.

---

# Tech Stack

## Frontend

* React
* TypeScript
* Vite
* TailwindCSS
* Apollo Client (GraphQL)
* React Hook Form
* Yup
* Zustand
* Radix UI
* Lucide Icons

## Backend

* Node.js
* TypeScript
* Express
* GraphQL
* Apollo Server
* Prisma ORM
* PostgreSQL
* JWT Authentication
* Bcrypt
* Resend (Email service)
* TypeGraphQL
* Dependency Injection with TSyringe

---

# Features

* User authentication with **JWT**
* Secure password hashing with **bcrypt**
* **Password recovery via email**
* Create and manage **financial categories**
* Register **expenses and income**
* Associate transactions with categories
* GraphQL API
* Modern UI with reusable components

---

# Prerequisites

To run this project locally, you must install the following tools.

## 1. Install Git

Git is used to clone the repository.

Download:
[https://git-scm.com/downloads](https://git-scm.com/downloads)

After installation, verify:

```bash
git --version
```

---

## 2. Install Node.js

Download Node.js (LTS version recommended):

[https://nodejs.org/](https://nodejs.org/)

Recommended version:

```
Node.js >= 18
```

After installation, verify:

```bash
node -v
npm -v
```

---

## 3. Install PostgreSQL

This project uses **PostgreSQL** as the database.

Download:

[https://www.postgresql.org/download/](https://www.postgresql.org/download/)

Recommended version:

```
PostgreSQL >= 14
```

During installation remember the following:

* Username
* Password
* Port (default: `5432`)

You will need these to configure the backend.

---

# Clone the Repository

Open your terminal and run:

```bash
git clone https://github.com/YOUR_USERNAME/financy.git
```

Then navigate to the project folder:

```bash
cd financy
```

---

# Backend Setup

Navigate to the backend folder:

```bash
cd backend
```

---

## Install Dependencies

```bash
npm install
```

---

## Configure Environment Variables

Create a `.env` file inside the **backend** folder.

Example:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/financy"

JWT_SECRET="your_secret_key"

RESEND_API_KEY="your_resend_api_key"
```

Explanation:

* **DATABASE_URL** → connection string for PostgreSQL
* **JWT_SECRET** → secret used to sign authentication tokens
* **RESEND_API_KEY** → API key used to send emails

You can get a free API key from:

[https://resend.com](https://resend.com)

---

## Run Database Migrations

Prisma will create the database structure automatically.

```bash
npm run migrate
```

---

## Generate Prisma Client

```bash
npm run generate
```

---

## Start the Backend

```bash
npm run dev
```

The backend server will start and the GraphQL API will be available.

---

# Frontend Setup

Open a new terminal and navigate to the frontend folder:

```bash
cd financy/frontend
```

---

## Install Dependencies

```bash
npm install
```

---

## Start the Frontend

```bash
npm run dev
```

After running the command, Vite will display a local development URL such as:

```
http://localhost:5173
```

Open this address in your browser.

---

# Available Scripts

## Frontend

Start development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

Lint project:

```bash
npm run lint
```

---

## Backend

Start development server:

```bash
npm run dev
```

Run Prisma migrations:

```bash
npm run migrate
```

Generate Prisma client:

```bash
npm run generate
```

Seed database:

```bash
npm run seed
```

---

# Author

Developed by **Thiago Morato**

Frontend Engineer specialized in **React and TypeScript**, focused on building scalable and maintainable applications.
