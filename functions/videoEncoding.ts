import { base44 } from "@base44/sdk";

export async function encodeVideo(request) {
  const { videoId, fileUrl, title } = request.body;

  try {
    // Appeler le LLM pour générer les métadonnées vidéo
    const metadata = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this video file and extract: duration (in seconds), dimensions (width x height), file size (in MB), detected language. Video URL: ${fileUrl}`,
      response_json_schema: {
        type: "object",
        properties: {
          duration: { type: "number" },
          width: { type: "number" },
          height: { type: "number" },
          fileSize: { type: "number" },
          language: { type: "string" }
        }
      }
    });

    // Générer les URL d'encodage pour différentes qualités
    const qualities = {
      "360p": `${fileUrl}?quality=360`,
      "480p": `${fileUrl}?quality=480`,
      "720p": `${fileUrl}?quality=720`,
      "1080p": `${fileUrl}?quality=1080`
    };

    // Générer une miniature
    const thumbnail = await base44.integrations.Core.GenerateImage({
      prompt: `Create a professional video thumbnail for a video titled "${title}". Make it eye-catching and suitable for a social media platform.`,
      existing_image_urls: [fileUrl]
    });

    // Mettre à jour la vidéo avec les données d'encodage
    await base44.asServiceRole.entities.Video.update(videoId, {
      duration: metadata.duration,
      video_quality_360: qualities["360p"],
      video_quality_480: qualities["480p"],
      video_quality_720: qualities["720p"],
      video_quality_1080: qualities["1080p"],
      thumbnail_url: thumbnail.url,
      encoding_status: "completed",
      file_size: metadata.fileSize
    });

    return {
      success: true,
      message: "Vidéo encodée avec succès",
      videoId,
      metadata,
      thumbnail: thumbnail.url
    };
  } catch (error) {
    // Marquer comme erreur
    await base44.asServiceRole.entities.Video.update(videoId, {
      encoding_status: "failed",
      encoding_error: error.message
    });

    return {
      success: false,
      error: error.message
    };
  }
}

export async function generateThumbnail(request) {
  const { videoId, videoUrl, title } = request.body;

  try {
    const thumbnail = await base44.integrations.Core.GenerateImage({
      prompt: `Create a professional video thumbnail for: "${title}". Make it visually appealing, high contrast, and suitable for social media.`,
      existing_image_urls: [videoUrl]
    });

    await base44.asServiceRole.entities.Video.update(videoId, {
      thumbnail_url: thumbnail.url
    });

    return {
      success: true,
      thumbnailUrl: thumbnail.url
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

export async function extractSubtitles(request) {
  const { videoId, videoUrl, language = "fr" } = request.body;

  try {
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Extract speech transcription from this video and generate subtitles in ${language}. Format as SRT with timestamps (MM:SS,mmm format). Video URL: ${videoUrl}`,
      response_json_schema: {
        type: "object",
        properties: {
          subtitles: {
            type: "array",
            items: {
              type: "object",
              properties: {
                index: { type: "number" },
                startTime: { type: "string" },
                endTime: { type: "string" },
                text: { type: "string" }
              }
            }
          },
          srtContent: { type: "string" },
          transcription: { type: "string" }
        }
      }
    });

    // Sauvegarder les sous-titres
    await base44.asServiceRole.entities.Video.update(videoId, {
      subtitles: result.srtContent,
      subtitle_language: language,
      transcription: result.transcription
    });

    return {
      success: true,
      subtitles: result.subtitles,
      srtContent: result.srtContent
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}