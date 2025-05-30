export function getBitrate(resolution) {
  // Bitrate recommendations for different resolutions
  switch (resolution) {
    case "720p":
      return 2500000; // 2.5 Mbps
    case "1080p":
      return 5000000; // 5 Mbps
    case "4k":
      return 20000000; // 20 Mbps
    default:
      return 5000000;
  }
}
