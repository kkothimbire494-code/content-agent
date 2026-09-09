const fs = require("fs");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function main() {
  const data = JSON.parse(fs.readFileSync("dashboard/data.json", "utf8"));

  const totalViews = data.videos.reduce((a, v) => a + v.views, 0);
  const avgViews = data.videos.length
    ? Math.round(totalViews / data.videos.length)
    : 0;

  const topVideo = [...data.videos].sort((a, b) => b.views - a.views)[0];

  const message = `
📊 *Daily Report — ${data.channel.name}*

👥 Subscribers: ${data.channel.subscribers}
👁️ Total Views: ${data.channel.totalViews}
🎬 Total Videos: ${data.channel.totalVideos}

📈 Avg views (last ${data.videos.length} videos): ${avgViews}
🏆 Top video: "${topVideo.title}" — ${topVideo.views} views

Updated: ${new Date(data.fetchedAt).toLocaleString()}
`.trim();

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: message,
      parse_mode: "Markdown",
    }),
  });

  const result = await res.json();
  if (!result.ok) {
    console.error("Telegram error:", result);
    process.exit(1);
  }
  console.log("Report sent to Telegram!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
