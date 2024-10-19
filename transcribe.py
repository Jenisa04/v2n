import torch
import sys
import os
import time
import json  # Import JSON module
from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline
import warnings

# Suppress FutureWarnings
warnings.filterwarnings("ignore", category=FutureWarning)

def transcribe_audio(audio_file_path):
    """
    Transcribes an audio file using Hugging Face's Whisper small model.
    """
    device = "cuda:0" if torch.cuda.is_available() else "cpu"
    torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32

    model_id = "openai/whisper-small"  # Use the smaller Whisper model

    # Load model and processor
    model = AutoModelForSpeechSeq2Seq.from_pretrained(
        model_id, 
        torch_dtype=torch_dtype, 
        low_cpu_mem_usage=True
    )

    model.generation_config.language = "en"  # define your language of choice here
    model.to(device)
    processor = AutoProcessor.from_pretrained(model_id)

    # Set up the pipeline for ASR (Automatic Speech Recognition)
    pipe = pipeline(
        "automatic-speech-recognition",
        model=model,
        tokenizer=processor.tokenizer,
        feature_extractor=processor.feature_extractor,
        torch_dtype=torch_dtype,
        device=device
    )

    # Transcribe audio file
    result = pipe(audio_file_path)
    
    return result["text"]

def chunk_text(text, max_token_length=1024):
    """
    Splits text into chunks that fit within the model's maximum token length.
    """
    sentences = text.split('. ')
    chunks = []
    current_chunk = []

    for sentence in sentences:
        # If the current chunk and sentence are below the token limit, add it to the chunk
        if len(' '.join(current_chunk + [sentence])) <= max_token_length:
            current_chunk.append(sentence)
        else:
            # If adding the sentence exceeds the limit, finalize the current chunk
            chunks.append(' '.join(current_chunk))
            current_chunk = [sentence]
    
    # Add the last chunk if it exists
    if current_chunk:
        chunks.append(' '.join(current_chunk))
    
    return chunks

def generate_notes(text):
    """
    Generates notes from the given transcription using DistilBART with chunking for long text.
    """
    # Initialize DistilBART summarization model
    summarizer = pipeline("summarization", model="sshleifer/distilbart-cnn-12-6")

    # Split the text into smaller chunks
    chunks = chunk_text(text)

    # Summarize each chunk
    notes = []
    for chunk in chunks:
        if chunk.strip():  # Check if the chunk is not empty
            summary = summarizer(chunk, max_length=150, min_length=50, do_sample=False)
            if summary:  # Ensure there's a summary result
                notes.append(summary[0]['summary_text'])
            else:
                notes.append("Summary not available")  # Fallback if no summary
        else:
            notes.append("Empty chunk; no summary generated")  # Handle empty chunks

    # Combine the notes from each chunk into a final output
    return "\n".join(notes)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python transcribe.py <path_to_audio_file>")
        sys.exit(1)

    audio_file_path = sys.argv[1]

    if not os.path.exists(audio_file_path):
        print(f"Error: Audio file '{audio_file_path}' does not exist.")
        sys.exit(1)
    
    start_time = time.time()
    
    # Transcribe audio to text
    transcription = transcribe_audio(audio_file_path)
    
    # Generate notes from the transcription
    summary = generate_notes(transcription)
    
    end_time = time.time()
    duration = end_time - start_time

    # Prepare the output in JSON format
    output = {
        "transcription": transcription,
        "summary": summary,
        "time_taken": f"{duration:.2f} seconds"
    }

    # Print the JSON output
    print(json.dumps(output))
