import { useEffect, useState } from "react";

type Email = {
  id: number;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt?: string | null;
  status: string;
};

type Stats = {
  scheduled: number;
  sent: number;
  failed: number;
  total: number;
  successRate: number;
};

function App() {
  const [activeTab, setActiveTab] = useState("scheduled");
  const [delaySeconds, setDelaySeconds] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(100);
  const [showCompose, setShowCompose] = useState(false);

  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvCount, setCsvCount] = useState(0);
  const [csvRecipients, setCsvRecipients] = useState<string[]>([]);

  const [emails, setEmails] = useState<Email[]>([]);

  const [stats, setStats] = useState<Stats>({
    scheduled: 0,
    sent: 0,
    failed: 0,
    total: 0,
    successRate: 0,
  });

  const [loading, setLoading] = useState(false);

  // FETCH EMAILS AND STATS
  const fetchData = async () => {
    try {
      const status =
        activeTab === "sent" ? "SENT" : "SCHEDULED";

      const emailsResponse = await fetch(
        "http://localhost:5000/api/emails?status=" + status
      );

      const statsResponse = await fetch(
        "http://localhost:5000/api/emails/stats"
      );

      if (!emailsResponse.ok) {
        throw new Error("Failed to fetch emails");
      }

      if (!statsResponse.ok) {
        throw new Error("Failed to fetch stats");
      }

      const emailsData = await emailsResponse.json();
      const statsData = await statsResponse.json();

      setEmails(emailsData);
      setStats(statsData);
    } catch (error) {
      console.error("Failed to load dashboard:", error);
    }
  };

  useEffect(() => {
  fetchData();

  const interval = setInterval(() => {
    fetchData();
  }, 3000);

  return () => {
    clearInterval(interval);
  };
}, [activeTab]);

  // CSV UPLOAD
  const handleCsvUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setCsvFile(file);

    const reader = new FileReader();

    reader.onload = (event) => {
      const text = String(event.target?.result || "");

      const recipients = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => {
          return line.length > 0 && line.includes("@");
        });

      setCsvRecipients(recipients);
      setCsvCount(recipients.length);
    };

    reader.readAsText(file);
  };

  // SCHEDULE EMAILS
  const handleSchedule = async () => {
    if (!subject.trim()) {
      alert("Please enter a subject");
      return;
    }

    if (!body.trim()) {
      alert("Please enter email body");
      return;
    }

    if (!scheduledAt) {
      alert("Please select schedule time");
      return;
    }

    const recipients =
      csvRecipients.length > 0
        ? csvRecipients
        : recipient.trim()
          ? [recipient.trim()]
          : [];

    if (recipients.length === 0) {
      alert("Please enter a recipient or upload a CSV");
      return;
    }

    try {
      setLoading(true);

      for (const emailRecipient of recipients) {
        const response = await fetch(
          "http://localhost:5000/api/emails/schedule",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
            recipient: emailRecipient,
            subject: subject,
            body: body,
            scheduledAt: scheduledAt,
            senderId: 1,
            delaySeconds: delaySeconds,
            hourlyLimit: hourlyLimit,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to schedule email"
          );
        }
      }

      alert(
        recipients.length +
          " email" +
          (recipients.length === 1 ? "" : "s") +
          " scheduled successfully!"
      );

      setShowCompose(false);

      setRecipient("");
      setSubject("");
      setBody("");
      setScheduledAt("");

      setCsvFile(null);
      setCsvCount(0);
      setCsvRecipients([]);

      await fetchData();
    } catch (error) {
      console.error("Schedule error:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Backend connection failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* HEADER */}
      <header className="border-b border-slate-800 bg-slate-950">
        <div className="flex h-16 items-center justify-between px-8">

          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 font-bold">
              R
            </div>

            <div>
              <h1 className="text-lg font-semibold">
                ReachInbox
              </h1>

              <p className="text-xs text-slate-400">
                Email Scheduler
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">

            <div className="text-right">
              <p className="text-sm font-medium">
                Nistha Sharma
              </p>

              <p className="text-xs text-slate-400">
                nistha@example.com
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500 font-semibold">
              NS
            </div>

            <button
              onClick={() => setShowCompose(true)}
              className="rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold hover:bg-indigo-500"
            >
              + Compose Email
            </button>

          </div>
        </div>
      </header>


      {/* COMPOSE MODAL */}
      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">

          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">

            <div className="mb-6 flex items-center justify-between">

              <div>
                <h2 className="text-xl font-bold">
                  Compose Email
                </h2>

                <p className="text-sm text-slate-400">
                  Schedule a new email campaign
                </p>
              </div>

              <button
                onClick={() => setShowCompose(false)}
                className="text-xl text-slate-400 hover:text-white"
              >
                ✕
              </button>

            </div>


            <div className="space-y-4">

              {/* RECIPIENT */}
              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Recipient
                </label>

                <input
                  type="email"
                  placeholder="recipient@example.com"
                  value={recipient}
                  onChange={(e) =>
                    setRecipient(e.target.value)
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>


              {/* SUBJECT */}
              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Subject
                </label>

                <input
                  type="text"
                  placeholder="Email subject"
                  value={subject}
                  onChange={(e) =>
                    setSubject(e.target.value)
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>


              {/* BODY */}
              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Body
                </label>

                <textarea
                  rows={5}
                  placeholder="Write your email..."
                  value={body}
                  onChange={(e) =>
                    setBody(e.target.value)
                  }
                  className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>


              {/* CSV */}
              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Upload CSV
                </label>

                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-300"
                />

                <p className="mt-1 text-xs text-slate-500">
                  Upload a CSV containing recipient email
                  addresses.
                </p>

                {csvFile && (
                  <p className="mt-2 text-sm text-green-400">
                    {csvCount} recipient
                    {csvCount !== 1 ? "s" : ""} found
                  </p>
                )}
              </div>


              {/* SCHEDULE TIME + DELAY */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Schedule Time
                  </label>

                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) =>
                      setScheduledAt(e.target.value)
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500"
                  />
                </div>


                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Delay Between Emails
                  </label>

                  <input
                    type="number"
                    value={delaySeconds}
                    onChange={(e) => setDelaySeconds(Number(e.target.value))}
                    min={0}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
                  />

                  <p className="mt-1 text-xs text-slate-500">
                    Seconds
                  </p>
                </div>

              </div>


              {/* HOURLY LIMIT */}
              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Hourly Sending Limit
                </label>

                <input
                  type="number"
                  defaultValue={100}
                  min={1}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>


              {/* BUTTONS */}
              <div className="flex justify-end gap-3 pt-3">

                <button
                  onClick={() => setShowCompose(false)}
                  disabled={loading}
                  className="rounded-lg border border-slate-700 px-5 py-3 text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  onClick={handleSchedule}
                  disabled={loading}
                  className="rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading
                    ? "Scheduling..."
                    : "Schedule Email"}
                </button>

              </div>

            </div>
          </div>
        </div>
      )}


      {/* MAIN */}
      <main className="mx-auto max-w-7xl px-8 py-8">

        {/* PAGE HEADER */}
        <div className="mb-8 flex items-center justify-between">

          <div>
            <h2 className="text-2xl font-bold">
              Email Campaigns
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Schedule and track your emails
            </p>
          </div>

          <button
            onClick={() => setShowCompose(true)}
            className="rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold hover:bg-indigo-500"
          >
            + Compose Email
          </button>

        </div>


        {/* STATS */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Scheduled
            </p>

            <p className="mt-2 text-3xl font-bold">
              {stats.scheduled}
            </p>
          </div>


          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Sent
            </p>

            <p className="mt-2 text-3xl font-bold">
              {stats.sent}
            </p>
          </div>


          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Success Rate
            </p>

            <p className="mt-2 text-3xl font-bold">
              {stats.total > 0
                ? stats.successRate + "%"
                : "—"}
            </p>
          </div>

        </div>


        {/* TABS + TABLE */}
        <div className="rounded-xl border border-slate-800 bg-slate-900">

          {/* TABS */}
          <div className="flex border-b border-slate-800">

            <button
              onClick={() => setActiveTab("scheduled")}
              className={
                "px-6 py-4 text-sm font-medium " +
                (activeTab === "scheduled"
                  ? "border-b-2 border-indigo-500 text-white"
                  : "text-slate-400")
              }
            >
              Scheduled
            </button>


            <button
              onClick={() => setActiveTab("sent")}
              className={
                "px-6 py-4 text-sm font-medium " +
                (activeTab === "sent"
                  ? "border-b-2 border-indigo-500 text-white"
                  : "text-slate-400")
              }
            >
              Sent
            </button>

          </div>


          {/* TABLE */}
          <div className="overflow-x-auto">

            {emails.length === 0 ? (

              <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">

                <div className="mb-4 text-5xl">
                  ✉️
                </div>

                <h3 className="text-lg font-semibold">
                  No {activeTab} emails
                </h3>

                <p className="mt-2 max-w-md text-sm text-slate-400">
                  {activeTab === "scheduled"
                    ? "Your scheduled emails will appear here."
                    : "Emails that have been sent will appear here."}
                </p>

              </div>

            ) : (

              <table className="w-full text-left text-sm">

                <thead className="border-b border-slate-800 text-slate-400">

                  <tr>
                    <th className="px-6 py-4">
                      Recipient
                    </th>

                    <th className="px-6 py-4">
                      Subject
                    </th>

                    <th className="px-6 py-4">
                      Scheduled At
                    </th>

                    <th className="px-6 py-4">
                      Status
                    </th>
                  </tr>

                </thead>


                <tbody>

                  {emails.map((email) => (

                    <tr
                      key={email.id}
                      className="border-b border-slate-800 last:border-0"
                    >

                      <td className="px-6 py-4">
                        {email.recipient}
                      </td>

                      <td className="px-6 py-4">
                        {email.subject}
                      </td>

                      <td className="px-6 py-4 text-slate-400">
                        {new Date(
                          email.scheduledAt
                        ).toLocaleString()}
                      </td>

                      <td className="px-6 py-4">

                        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs">
                          {email.status}
                        </span>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            )}

          </div>

        </div>

      </main>

    </div>
  );
}

export default App;