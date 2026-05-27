import VideoPlayer from "./VideoPlayer";

export default function VideoCard({
  video
}) {

  return (
    <div className="border rounded-xl p-4">

      <h2 className="font-bold">
        {video.fileName}
      </h2>

      <p className="text-sm">
        Status: {video.status}
      </p>

      {video.thumbnailUrl && (
        <img
          src={video.thumbnailUrl}
          alt="thumbnail"
          className="mt-4 rounded-lg"
        />
      )}

      {video.hlsMasterUrl && (
        <div className="mt-4">
          <VideoPlayer
            src={video.hlsMasterUrl}
          />
        </div>
      )}
    </div>
  );
}