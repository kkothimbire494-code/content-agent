const fs = require("fs");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const STOPWORDS = new Set([
  "the","a","an","is","are","was","were","to","of","in","on","for","and","or",
  "my","your","you","i","it","this","that","how","why","what","when","did",
  "will","can","cost","story","life","gets","better","phone","controlled",
]);

function analyze(videos) {
  const sorted = [...videos].sort((a, b) => b.views - a.views);
  const topVideo = sorted[0];

  const byDate = [...videos].sort(
    (a, b) => new Date(a.publishedAt) - new Date(b.publishedAt)
  );
  const half = Math.floor(byDate.length / 2) || 1;
  const olderAvg =
    byDate.slice(0, half).reduce((a, v) => a + v.views, 0) / half;
  const newerAvg =
    byDate.slice(half).reduce((a, v) => a + v.views, 0) /
    (byDate.length - half || 1);

  let trend = "steady";
  if (newerAvg > olderAvg * 1.15) trend = "growing 📈";
  else if (newerAvg < olderAvg * 0.85) trend = "slowing 📉";

  const advice =
    trend === "growing 📈"
      ? `Momentum is building — keep making videos like "${topVideo.title}".`
      : trend === "slowing 📉"
      ? `Views are cooling off — try a new hook style or revisit what worked in "${topVideo.title}".`
      : `Performance is steady — "${topVideo.title}" is your strongest format, lean into it.`;

  return { topVideo, trend, advice };
}

function generateIdeas(videos) {
  const sorted = [...videos].sort((a, b) => b.views - a.views);
  const topThree = sorted.slice(0, 3);

  const wordCounts = {};
  topThree.forEach((v) => {
    v.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .forEach((word) => {
        if (word.length > 2 && !STOPWORDS.has(word)) {
          wordCounts[word] = (wordCounts[word] || 0) + 1;
        }
      });
  });

  const topWords = Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([w]) => w);

  if (topWords.length === 0) {
    return ["Try a personal story format — your audience responds well to relatable struggles."];
  }

  return topWords.map(
    (word) => `A video exploring "${word}" from a new angle — your audience engages with this theme.`
  );
}

async function main() {
  const data = JSON.parse(fs.readFileSync("dashboard/data.json", "utf8"));

  const totalViews = data.videos.reduce((a, v) => a + v.views, 0);
  const avgViews = data.videos.length
    ? Math.round(totalViews / data.videos.length)
    : 0;

  const { topVideo, trend, advice } = analyze(data.videos);
  const ideas = generateIdeas(data.videos);

  const message = `
📊 *Daily Report — ${data.channel.name}*

👥 Subscribers: ${data.channel.subscribers}
👁️ Total Views: ${data.channel.totalViews}
🎬 Total Videos: ${data.channel.totalVideos}

📈 Avg views (last ${data.videos.length} videos): ${avgViews}
🏆 Top video: "${topVideo.title}" — ${topVideo.views} views
📊 Trend: ${trend}

🤖 *Analyst says:* ${advice}

🔍 *Ideator suggests:*
${ideas.map((i) => `• ${i}`).join("\n")}

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
