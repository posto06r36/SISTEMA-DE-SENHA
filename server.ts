import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs/promises";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(process.cwd(), "data.json");

// Simple JSON Database helper
async function getDb() {
  try {
    const content = await fs.readFile(DB_PATH, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    const initialDb = { 
      tickets: [], 
      settings: { lastNumber: "0", lastDate: "" } 
    };
    await fs.writeFile(DB_PATH, JSON.stringify(initialDb, null, 2));
    return initialDb;
  }
}

async function saveDb(data: any) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Helper to get all tickets
  app.get("/api/tickets", async (req, res) => {
    try {
      const db = await getDb();
      const today = new Date().toLocaleDateString();
      
      // Filter tickets for today and sort by creation date
      const tickets = db.tickets
        .filter((t: any) => new Date(t.createdAt).toLocaleDateString() === today)
        .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .reverse()
        .slice(0, 50);

      res.json(tickets);
    } catch (error: any) {
      console.error("Fetch Error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Create Ticket
  app.post("/api/tickets", async (req, res) => {
    try {
      const { type, number, status, citizenName } = req.body;
      const db = await getDb();
      
      const todayString = new Date().toLocaleDateString();
      
      // Auto-clear logic: Keep only today's tickets to prevent the file from growing indefinitely
      // and to fulfill the request of "zerar o atendimento" at the turn of the day.
      const initialCount = db.tickets.length;
      db.tickets = db.tickets.filter((t: any) => 
        new Date(t.createdAt).toLocaleDateString() === todayString
      );
      
      if (db.tickets.length !== initialCount) {
        console.log(`Cleared ${initialCount - db.tickets.length} old tickets from database.`);
      }

      const newTicket = {
        id: Date.now().toString(),
        number,
        type,
        status,
        citizenName: citizenName || "",
        counter: "",
        createdAt: new Date().toISOString(),
        calledAt: null,
        finishedAt: null
      };

      db.tickets.push(newTicket);
      await saveDb(db);

      res.json(newTicket);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update Ticket
  app.patch("/api/tickets/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const db = await getDb();

      const ticketIndex = db.tickets.findIndex((t: any) => t.id === id);
      if (ticketIndex === -1) return res.status(404).json({ error: "Ticket not found" });

      const ticket = db.tickets[ticketIndex];
      
      if (updates.status) ticket.status = updates.status;
      if (updates.counter) ticket.counter = updates.counter;
      if (updates.citizenName !== undefined) ticket.citizenName = updates.citizenName;
      if (updates.calledAt) ticket.calledAt = new Date().toISOString();
      if (updates.finishedAt) ticket.finishedAt = new Date().toISOString();

      await saveDb(db);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Settings
  app.get("/api/settings", async (req, res) => {
    try {
      const db = await getDb();
      res.json(db.settings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const { lastNumber, lastDate } = req.body;
      const db = await getDb();
      
      db.settings = {
        lastNumber: lastNumber.toString(),
        lastDate
      };
      
      await saveDb(db);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
