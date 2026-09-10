const API_KEY = process.env.YOUTUBE_API_KEY;
const HANDLE = "blockmindyt1";
const fs = require("fs");

async function main() {
  const channelRes = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&forHandle=${HANDLE}&key=${API_KEY}`
  );
  const channelData = await channelRes.json();
  const channel = channelData.items[0];
  const uploadsPlaylistId = channel.contentDetails.relatedPlaylists.uploads;

  const playlistRes = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=15&playlistId=${uploadsPlaylistId}&key=${API_KEY}`
  );
  const playlistData = await playlistRes.json();
  const videoIds = playlistData.items.map(
    (item) => item.snippet.resourceId.videoId
  );

  const videosRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds.join(",")}&key=${API_KEY}`
  );
  const videosData = await videosRes.json();

  const videos = videosData.items.map((v) => ({
    id: v.id,
    title: v.snippet.title,
    publishedAt: v.snippet.publishedAt,
    views: Number(v.statistics.viewCount || 0),
    likes: Number(v.statistics.likeCount || 0),
    comments: Number(v.statistics.commentCount || 0),
  }));

  const topThree = [...videos].sort((a, b) => b.views - a.views).slice(0, 3);
  const recentComments = [];

  for (const v of topThree) {
    try {
      const cRes = await fetch(
        `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${v.id}&maxResults=5&order=time&key=${API_KEY}`
      );
      const cData = await cRes.json();
      if (cData.items) {
        cData.items.forEach((item) => {
          const c = item.snippet.topLevelComment.snippet;
          recentComments.push({
            videoTitle: v.title,
            author: c.authorDisplayName,
            text: c.textDisplay.replace(/<[^>]*>/g, ""),
          });
        });
      }
    } catch (e) {
      console.log("Could not fetch comments for", v.id);
    }
  }

  const output = {
    fetchedAt: new Date().toISOString(),
    channel: {
      name: channel.snippet.title,
      handle: HANDLE,
      subscribers: Number(channel.statistics.subscriberCount || 0),
      totalViews: Number(channel.statistics.viewCount || 0),
      totalVideos: Number(channel.statistics.videoCount || 0),
    },
    videos,
    recentComments,
  };

  fs.mkdirSync("dashboard", { recursive: true });
  fs.writeFileSync("dashboard/data.json", JSON.stringify(output, null, 2));
  console.log("Saved dashboard/data.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
