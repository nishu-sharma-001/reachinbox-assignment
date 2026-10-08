import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import emailRoutes from "./routes/emailRoutes";
import senderRoutes from "./routes/senderRoutes";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/emails", emailRoutes);
app.use("/api/senders", senderRoutes);

app.get("/", (_req, res) => {
  res.json({
    message: "ReachInbox Backend is running 🚀",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});