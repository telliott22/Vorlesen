import { TextChunk } from '@/types/tts';

/**
 * Chunks text into segments suitable for TTS API processing.
 * Splits on sentence boundaries to maintain natural speech flow.
 *
 * @param text - The full text to chunk
 * @param maxChars - Maximum characters per chunk (default 4000)
 * @returns Array of TextChunk objects with order, text, and indices
 */
export function chunkText(text: string, maxChars: number = 4000): TextChunk[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const chunks: TextChunk[] = [];
  let currentIndex = 0;
  let chunkOrder = 0;

  // Regex to split on sentence boundaries: . ! ? followed by whitespace
  // Handles abbreviations like Dr., Mr., etc. by requiring space after punctuation
  const sentenceRegex = /([.!?]+)\s+/g;

  // Split text into sentences
  const sentences: string[] = [];
  let lastIndex = 0;
  let match;

  while ((match = sentenceRegex.exec(text)) !== null) {
    const sentence = text.substring(lastIndex, match.index + match[0].length);
    sentences.push(sentence);
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text if any
  if (lastIndex < text.length) {
    sentences.push(text.substring(lastIndex));
  }

  // Group sentences into chunks
  let currentChunk = '';
  let chunkStartIndex = 0;

  for (const sentence of sentences) {
    // If adding this sentence exceeds maxChars, save current chunk
    if (currentChunk.length + sentence.length > maxChars && currentChunk.length > 0) {
      chunks.push({
        order: chunkOrder++,
        text: currentChunk.trim(),
        startIndex: chunkStartIndex,
        endIndex: chunkStartIndex + currentChunk.length,
      });

      currentChunk = sentence;
      chunkStartIndex = currentIndex;
      currentIndex += currentChunk.length;
    } else {
      currentChunk += sentence;
      currentIndex += sentence.length;
    }
  }

  // Add final chunk
  if (currentChunk.length > 0) {
    chunks.push({
      order: chunkOrder,
      text: currentChunk.trim(),
      startIndex: chunkStartIndex,
      endIndex: chunkStartIndex + currentChunk.length,
    });
  }

  return chunks;
}

/**
 * Estimates the number of chunks that will be created for given text
 *
 * @param text - The text to estimate
 * @param maxChars - Maximum characters per chunk
 * @returns Estimated number of chunks
 */
export function estimateChunkCount(text: string, maxChars: number = 4000): number {
  if (!text) return 0;
  return Math.ceil(text.length / maxChars);
}
